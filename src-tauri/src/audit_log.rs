//! Consulta do registro de auditoria (`audit_logs`) para a tela de Auditoria do Admin.

use rusqlite::{params, Connection};
use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub id: i64,
    /// Data/hora em UTC, no formato do SQLite (`AAAA-MM-DD HH:MM:SS`).
    pub at: String,
    pub user_id: Option<i64>,
    pub user_name: Option<String>,
    pub action: String,
    pub entity: String,
    pub entity_id: Option<i64>,
    /// Resumo legível do registro afetado (ex.: "O.S. 42 • Secretaria de Saúde").
    pub label: String,
    pub machine: Option<String>,
    pub before: Option<Value>,
    pub after: Option<Value>,
}

/// Entidades aceitas no filtro da tela.
const ENTITIES: &[&str] = &["WORK_ORDER", "USER", "CATALOG", "AUTH"];
pub const MAX_LIMIT: i64 = 200;

fn text<'a>(value: Option<&'a Value>, key: &str) -> &'a str {
    value.and_then(|v| v.get(key)).and_then(Value::as_str).unwrap_or("").trim()
}

fn label_for(entity: &str, entity_id: Option<i64>, before: Option<&Value>, after: Option<&Value>) -> String {
    let source = after.or(before);
    match entity {
        "WORK_ORDER" => {
            let number = source.and_then(|v| v.get("number")).and_then(Value::as_i64);
            let secretaria = text(source, "secretaria");
            match (number, secretaria.is_empty()) {
                (Some(n), false) => format!("O.S. {n} • {secretaria}"),
                (Some(n), true) => format!("O.S. {n}"),
                (None, _) if entity_id.is_none() => "Todas as O.S.".into(),
                _ => format!("O.S. #{}", entity_id.unwrap_or_default()),
            }
        }
        "USER" => {
            let (name, login) = (text(source, "name"), text(source, "login"));
            if login.is_empty() { name.to_string() } else { format!("{name} ({login})") }
        }
        "CATALOG" => format!("{}: {}", text(source, "tipo"), text(source, "name")),
        "AUTH" => text(source, "login").to_string(),
        _ => String::new(),
    }
}

/// Lista os registros mais recentes primeiro. `search` procura no nome do usuário e no
/// conteúdo antes/depois; `entity` filtra pelo tipo (O.S., usuário, cadastro ou login).
pub fn query(
    conn: &Connection,
    entity: Option<&str>,
    search: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<AuditEntry>, String> {
    let entity = entity.filter(|e| ENTITIES.contains(e));
    let pattern = search.map(str::trim).filter(|s| !s.is_empty()).map(|s| format!("%{s}%"));
    let mut stmt = conn
        .prepare(
            "SELECT a.id,a.created_at,a.user_id,u.name,a.action,a.entity_type,a.entity_id,a.machine,a.before_json,a.after_json
             FROM audit_logs a
             LEFT JOIN (SELECT id, MIN(name) AS name FROM user_accounts GROUP BY id) u ON u.id=a.user_id
             WHERE (?1 IS NULL OR a.entity_type=?1)
               AND (?2 IS NULL OR u.name LIKE ?2 OR a.before_json LIKE ?2 OR a.after_json LIKE ?2)
             ORDER BY a.id DESC LIMIT ?3 OFFSET ?4",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![entity, pattern, limit.clamp(1, MAX_LIMIT), offset.max(0)], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<i64>>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, String>(4)?,
                r.get::<_, String>(5)?,
                r.get::<_, Option<i64>>(6)?,
                r.get::<_, Option<String>>(7)?,
                r.get::<_, Option<String>>(8)?,
                r.get::<_, Option<String>>(9)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    let parse = |raw: Option<String>| raw.and_then(|s| serde_json::from_str::<Value>(&s).ok());
    let mut out = Vec::new();
    for row in rows {
        let (id, at, user_id, user_name, action, entity, entity_id, machine, before, after) =
            row.map_err(|e| e.to_string())?;
        let (before, after) = (parse(before), parse(after));
        let label = label_for(&entity, entity_id, before.as_ref(), after.as_ref());
        let machine = machine.filter(|m| !m.is_empty());
        out.push(AuditEntry { id, at, user_id, user_name, action, entity, entity_id, label, machine, before, after });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        for sql in [
            include_str!("../migrations/001_initial.sql"),
            include_str!("../migrations/002_operational_hardening.sql"),
            include_str!("../migrations/003_registry_tables.sql"),
        ] {
            conn.execute_batch(sql).unwrap();
        }
        conn.execute("INSERT INTO user_accounts(position,id,name,login,role) VALUES(0,7,'Maria','maria','ADMIN')", [])
            .unwrap();
        let add = |user: Option<i64>, action: &str, entity: &str, id: Option<i64>, after: Value| {
            conn.execute(
                "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,after_json) VALUES(?1,?2,?3,?4,?5)",
                params![user, action, entity, id, after.to_string()],
            )
            .unwrap();
        };
        add(Some(7), "CREATE", "WORK_ORDER", Some(1), json!({"number": 42, "secretaria": "Saúde"}));
        add(None, "LOGIN_FAIL", "AUTH", None, json!({"login": "joao"}));
        add(Some(7), "UPDATE", "CATALOG", Some(3), json!({"tipo": "materiais", "name": "Cimento"}));
        add(Some(7), "IMPORT", "WORK_ORDER", None, Value::Null);
        conn
    }

    #[test]
    fn lista_mais_recentes_primeiro_com_nome_e_resumo() {
        let conn = db();
        let all = query(&conn, None, None, 50, 0).unwrap();
        assert_eq!(all.len(), 4);
        assert_eq!(all[0].label, "Todas as O.S.");
        assert_eq!(all[1].label, "materiais: Cimento");
        assert_eq!(all[2].label, "joao");
        assert_eq!(all[3].label, "O.S. 42 • Saúde");
        assert_eq!(all[3].user_name.as_deref(), Some("Maria"));
        assert_eq!(all[2].user_name, None);
    }

    #[test]
    fn filtra_por_tipo_e_busca() {
        let conn = db();
        assert_eq!(query(&conn, Some("AUTH"), None, 50, 0).unwrap().len(), 1);
        assert_eq!(query(&conn, None, Some("cimento"), 50, 0).unwrap().len(), 1);
        assert_eq!(query(&conn, None, Some("Maria"), 50, 0).unwrap().len(), 3);
        // tipo desconhecido é ignorado em vez de virar SQL arbitrário
        assert_eq!(query(&conn, Some("x' OR 1=1"), None, 50, 0).unwrap().len(), 4);
    }

    #[test]
    fn paginacao() {
        let conn = db();
        let page = query(&conn, None, None, 2, 2).unwrap();
        assert_eq!(page.iter().map(|e| e.id).collect::<Vec<_>>(), vec![2, 1]);
    }
}
