//! Login e permissões verificados no backend.
//!
//! O frontend continua decidindo o que mostrar na tela, mas toda gravação passa por aqui:
//! o Rust sabe quem está conectado e recusa o que o perfil não pode fazer, mesmo que o
//! comando seja chamado direto (por exemplo, pelo DevTools).

use chrono::{DateTime, Duration, Utc};
use pbkdf2::pbkdf2_hmac;
use serde::Serialize;
use serde_json::Value;
use sha2::Sha256;
use std::sync::Mutex;

pub const PBKDF2_ITERATIONS: u32 = 210_000;
const MAX_FAILED_ATTEMPTS: i64 = 5;
const LOCK_MINUTES: i64 = 15;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Role {
    #[serde(rename = "ADMIN")]
    Admin,
    #[serde(rename = "OPERADOR")]
    Operador,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Scope {
    #[serde(rename = "EXECUTIVO")]
    Executivo,
    #[serde(rename = "SAUDE")]
    Saude,
    #[serde(rename = "EDUCACAO")]
    Educacao,
    #[serde(rename = "GABINETE")]
    Gabinete,
}

impl Scope {
    fn from_user(value: Option<&str>) -> Scope {
        match value {
            Some("SAUDE") => Scope::Saude,
            Some("EDUCACAO") => Scope::Educacao,
            Some("GABINETE") => Scope::Gabinete,
            _ => Scope::Executivo,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Session {
    pub user_id: i64,
    pub role: Role,
    pub scope: Scope,
}

impl Session {
    pub fn is_admin(&self) -> bool {
        self.role == Role::Admin
    }
    /// Admin e Gabinete veem todas as áreas; os demais só a própria.
    pub fn sees_all(&self) -> bool {
        self.is_admin() || self.scope == Scope::Gabinete
    }
}

static CURRENT: Mutex<Option<Session>> = Mutex::new(None);

pub fn current() -> Option<Session> {
    *CURRENT.lock().unwrap_or_else(|e| e.into_inner())
}
fn set_current(value: Option<Session>) {
    *CURRENT.lock().unwrap_or_else(|e| e.into_inner()) = value;
}
pub fn logout() {
    set_current(None);
}

pub fn require_login() -> Result<Session, String> {
    current().ok_or_else(|| "Sessão expirada. Entre novamente no S.O.S.".to_string())
}
pub fn require_admin() -> Result<Session, String> {
    let session = require_login()?;
    if session.is_admin() {
        Ok(session)
    } else {
        Err("Somente o Admin pode realizar esta operação.".into())
    }
}

/// Mesma regra de `src/lib/orderScope.ts`: a origem da importação tem prioridade
/// sobre a secretaria, e a comparação ignora acentos e maiúsculas.
pub fn order_scope(order: &Value) -> Scope {
    let text = |key: &str| order.get(key).and_then(Value::as_str).unwrap_or("").trim();
    let source = if text("importOrigin").is_empty() { text("secretaria") } else { text("importOrigin") };
    let plain = strip_accents(&source.to_lowercase());
    if plain.contains("saude") {
        Scope::Saude
    } else if plain.contains("educa") {
        Scope::Educacao
    } else if plain.contains("gabinete") {
        Scope::Gabinete
    } else {
        Scope::Executivo
    }
}

fn strip_accents(text: &str) -> String {
    text.chars()
        .map(|c| match c {
            'á' | 'à' | 'â' | 'ã' | 'ä' => 'a',
            'é' | 'è' | 'ê' | 'ë' => 'e',
            'í' | 'ì' | 'î' | 'ï' => 'i',
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' => 'o',
            'ú' | 'ù' | 'û' | 'ü' => 'u',
            'ç' => 'c',
            other => other,
        })
        .collect()
}

/// Operador só grava O.S. da própria área (antes e depois da alteração).
pub fn can_write_order(session: &Session, before: Option<&Value>, after: &Value) -> bool {
    if session.sees_all() {
        return true;
    }
    let same_scope = |order: &Value| order_scope(order) == session.scope;
    same_scope(after) && before.map_or(true, same_scope)
}

#[derive(Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    pub user: Option<Value>,
    pub reason: Option<&'static str>,
}

/// Confere login e senha contra a lista de usuários (JSON do snapshot `users`).
/// Devolve o resultado e, quando tentativas/bloqueio mudam, a lista atualizada para gravar.
pub fn evaluate_login(
    users: &mut [Value],
    login: &str,
    password: &str,
    now: DateTime<Utc>,
) -> (LoginResult, Option<Session>, bool) {
    let wanted = login.trim().to_lowercase();
    let found = users.iter_mut().find(|u| {
        u.get("active").and_then(Value::as_bool).unwrap_or(false)
            && u.get("login").and_then(Value::as_str).map(|l| l.to_lowercase()) == Some(wanted.clone())
    });
    let invalid = LoginResult { user: None, reason: Some("INVALID") };
    let Some(user) = found else { return (invalid, None, false) };

    let locked_until = user
        .get("lockedUntil")
        .and_then(Value::as_str)
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|d| d.with_timezone(&Utc));
    if locked_until.is_some_and(|until| until > now) {
        return (LoginResult { user: None, reason: Some("LOCKED") }, None, false);
    }

    let hash = user.get("passwordHash").and_then(Value::as_str).unwrap_or("");
    let salt = user.get("passwordSalt").and_then(Value::as_str).unwrap_or("");
    if hash.is_empty() || salt.is_empty() {
        return (invalid, None, false);
    }

    let password_ok = verify_password(password, salt, hash);
    let obj = user.as_object_mut().expect("usuário deve ser um objeto JSON");
    if !password_ok {
        let failed = obj.get("failedAttempts").and_then(Value::as_i64).unwrap_or(0) + 1;
        let locked = failed >= MAX_FAILED_ATTEMPTS;
        obj.insert("failedAttempts".into(), Value::from(if locked { 0 } else { failed }));
        obj.insert(
            "lockedUntil".into(),
            if locked {
                Value::from((now + Duration::minutes(LOCK_MINUTES)).to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
            } else {
                Value::Null
            },
        );
        let reason = if locked { "LOCKED" } else { "INVALID" };
        return (LoginResult { user: None, reason: Some(reason) }, None, true);
    }

    obj.insert("failedAttempts".into(), Value::from(0));
    obj.insert("lockedUntil".into(), Value::Null);
    let session = Session {
        user_id: obj.get("id").and_then(Value::as_i64).unwrap_or(0),
        role: if obj.get("role").and_then(Value::as_str) == Some("ADMIN") { Role::Admin } else { Role::Operador },
        scope: Scope::from_user(obj.get("scope").and_then(Value::as_str)),
    };
    let mut public = user.clone();
    if let Some(fields) = public.as_object_mut() {
        fields.remove("passwordHash");
        fields.remove("passwordSalt");
    }
    (LoginResult { user: Some(public), reason: None }, Some(session), true)
}

pub fn verify_password(password: &str, salt_hex: &str, hash_hex: &str) -> bool {
    let Some(salt) = decode_hex(salt_hex) else { return false };
    let mut derived = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), &salt, PBKDF2_ITERATIONS, &mut derived);
    let candidate: String = derived.iter().map(|b| format!("{b:02x}")).collect();
    // Comparação em tempo constante para não vazar quantos caracteres conferem.
    candidate.len() == hash_hex.len()
        && candidate.bytes().zip(hash_hex.bytes()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
}

fn decode_hex(hex: &str) -> Option<Vec<u8>> {
    if hex.len() % 2 != 0 {
        return None;
    }
    (0..hex.len()).step_by(2).map(|i| u8::from_str_radix(&hex[i..i + 2], 16).ok()).collect()
}

/// Faz o login usando os usuários gravados no SQLite e abre a sessão do backend.
pub fn login(login: &str, password: &str) -> Result<LoginResult, String> {
    use crate::database::{audit_auth, load_snapshot, save_snapshot, SNAPSHOT_USERS};
    let raw = load_snapshot(SNAPSHOT_USERS)?;
    let mut users: Vec<Value> = raw.and_then(|r| serde_json::from_str(&r).ok()).unwrap_or_default();
    let (result, session, changed) = evaluate_login(&mut users, login, password, Utc::now());
    if changed {
        let json = serde_json::to_string(&users).map_err(|e| e.to_string())?;
        save_snapshot(SNAPSHOT_USERS, &json, None, false)?;
    }
    let user_id = session.map(|s| s.user_id).or_else(|| {
        let wanted = login.trim().to_lowercase();
        users
            .iter()
            .find(|u| u.get("login").and_then(Value::as_str).map(str::to_lowercase) == Some(wanted.clone()))
            .and_then(|u| u.get("id").and_then(Value::as_i64))
    });
    let action = match result.reason {
        None => "LOGIN_SUCCESS",
        Some("LOCKED") => "LOGIN_BLOCKED",
        Some(_) => "LOGIN_FAIL",
    };
    audit_auth(user_id, action, login.trim())?;
    set_current(session);
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // Gerado pelo frontend (src/lib/auth.ts) para a senha "senha-segura".
    const SALT: &str = "000102030405060708090a0b0c0d0e0f";
    const HASH: &str = "c811f85bea81fdc7c1a2b947fc997ba19a94bba370dc993312e68ea4b1c0d5d7";

    fn users() -> Vec<Value> {
        vec![json!({
            "id": 7, "name": "Admin", "login": "admin", "role": "ADMIN", "active": true,
            "passwordHash": HASH, "passwordSalt": SALT, "failedAttempts": 0, "lockedUntil": null
        })]
    }

    #[test]
    fn verifica_senha_gerada_pelo_frontend() {
        assert!(verify_password("senha-segura", SALT, HASH));
        assert!(!verify_password("senha-errada", SALT, HASH));
    }

    #[test]
    fn login_correto_abre_sessao_de_admin() {
        let mut list = users();
        let (result, session, _) = evaluate_login(&mut list, " ADMIN ", "senha-segura", Utc::now());
        let user = result.user.expect("usuário");
        assert!(user.get("passwordHash").is_none() && user.get("passwordSalt").is_none());
        assert_eq!(session, Some(Session { user_id: 7, role: Role::Admin, scope: Scope::Executivo }));
    }

    #[test]
    fn bloqueia_apos_cinco_tentativas() {
        let mut list = users();
        let now = Utc::now();
        for _ in 0..4 {
            assert_eq!(evaluate_login(&mut list, "admin", "x", now).0.reason, Some("INVALID"));
        }
        assert_eq!(evaluate_login(&mut list, "admin", "x", now).0.reason, Some("LOCKED"));
        assert_eq!(evaluate_login(&mut list, "admin", "senha-segura", now).0.reason, Some("LOCKED"));
        let later = now + Duration::minutes(16);
        assert!(evaluate_login(&mut list, "admin", "senha-segura", later).1.is_some());
    }

    #[test]
    fn usuario_inativo_nao_entra() {
        let mut list = users();
        list[0]["active"] = json!(false);
        assert!(evaluate_login(&mut list, "admin", "senha-segura", Utc::now()).1.is_none());
    }

    #[test]
    fn classifica_area_da_os() {
        assert_eq!(order_scope(&json!({"secretaria": "Secretaria de SAÚDE"})), Scope::Saude);
        assert_eq!(order_scope(&json!({"secretaria": "Educação"})), Scope::Educacao);
        assert_eq!(order_scope(&json!({"secretaria": "Saúde", "importOrigin": "Executivo"})), Scope::Executivo);
        assert_eq!(order_scope(&json!({"secretaria": "Gabinete do Prefeito"})), Scope::Gabinete);
    }

    #[test]
    fn operador_so_grava_a_propria_area() {
        let saude = Session { user_id: 2, role: Role::Operador, scope: Scope::Saude };
        let os_saude = json!({"secretaria": "Saúde"});
        let os_educacao = json!({"secretaria": "Educação"});
        assert!(can_write_order(&saude, None, &os_saude));
        assert!(!can_write_order(&saude, None, &os_educacao));
        assert!(!can_write_order(&saude, Some(&os_educacao), &os_saude));
        let gabinete = Session { user_id: 3, role: Role::Operador, scope: Scope::Gabinete };
        assert!(can_write_order(&gabinete, None, &os_educacao));
    }
}
