//! Usuários e cadastros gravados um registro por linha (`user_accounts` e `catalog_items`).
//!
//! O frontend continua trocando a lista inteira em JSON, no mesmo formato de antes. Aqui a
//! lista é convertida em linhas e cada inclusão, alteração ou exclusão gera um registro de
//! auditoria. Campos sem coluna própria vão para `extra_json`, então nada se perde.

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{Map, Value};
use std::collections::HashMap;

pub const MIGRATED_FLAG: &str = "registry_migrated";
/// Tipos de cadastro que a tela sempre espera encontrar, mesmo vazios.
const CATALOG_KINDS: &[&str] = &["secretarias", "unidades", "equipes", "tecnicos", "materiais"];

type Res<T> = Result<T, String>;

fn sql<T>(r: rusqlite::Result<T>) -> Res<T> {
    r.map_err(|e| e.to_string())
}

/// As tabelas só passam a ser a fonte dos dados depois que a migração terminou sem erro.
pub fn is_active(conn: &Connection) -> Res<bool> {
    let flag: Option<String> = sql(conn
        .query_row("SELECT value FROM settings WHERE key=?1", params![MIGRATED_FLAG], |r| r.get(0))
        .optional())?;
    Ok(flag.as_deref() == Some("1"))
}

/// Copia os snapshots JSON existentes para as tabelas, uma única vez. O snapshot antigo é
/// mantido no banco como cópia de segurança. Se algo falhar, nada é gravado e o sistema
/// continua usando o snapshot.
pub fn migrate_from_snapshots(conn: &mut Connection) -> Res<()> {
    if is_active(conn)? {
        return Ok(());
    }
    let snapshot = |key: &str| -> Res<Option<String>> {
        sql(conn
            .query_row("SELECT value_json FROM app_snapshots WHERE key=?1", params![key], |r| r.get(0))
            .optional())
    };
    let users = snapshot("users")?;
    let catalogs = snapshot("catalogs")?;
    let tx = sql(conn.transaction())?;
    if let Some(raw) = users {
        write_users(&tx, &raw, None, false)?;
    }
    if let Some(raw) = catalogs {
        write_catalogs(&tx, &raw, None, false)?;
    }
    sql(tx.execute(
        "INSERT INTO settings(key,value,updated_at) VALUES(?1,'1',CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP",
        params![MIGRATED_FLAG],
    ))?;
    sql(tx.commit())
}

// ---------- campos ----------

fn take_str(obj: &mut Map<String, Value>, key: &str) -> Option<String> {
    match obj.remove(key) {
        Some(Value::String(s)) => Some(s),
        Some(Value::Null) | None => None,
        Some(other) => Some(other.to_string()),
    }
}
fn take_id(obj: &mut Map<String, Value>, what: &str) -> Res<i64> {
    obj.remove("id")
        .and_then(|v| v.as_i64())
        .ok_or_else(|| format!("{what} sem id numérico"))
}
fn take_bool(obj: &mut Map<String, Value>, key: &str) -> bool {
    obj.remove(key).and_then(|v| v.as_bool()).unwrap_or(true)
}
fn extra(obj: Map<String, Value>) -> Option<String> {
    (!obj.is_empty()).then(|| Value::Object(obj).to_string())
}
fn put_opt(obj: &mut Map<String, Value>, key: &str, value: Option<String>) {
    if let Some(v) = value {
        obj.insert(key.into(), Value::String(v));
    }
}
fn merge_extra(obj: &mut Map<String, Value>, extra_json: Option<String>) {
    if let Some(Value::Object(extra)) = extra_json.and_then(|raw| serde_json::from_str(&raw).ok()) {
        for (k, v) in extra {
            obj.entry(k).or_insert(v);
        }
    }
}
fn parse_list(raw: &str, what: &str) -> Res<Vec<Map<String, Value>>> {
    let items: Vec<Value> = serde_json::from_str(raw).map_err(|_| format!("Lista de {what} inválida"))?;
    items
        .into_iter()
        .map(|v| match v {
            Value::Object(obj) => Ok(obj),
            _ => Err(format!("Item de {what} inválido")),
        })
        .collect()
}

// ---------- auditoria ----------

fn audit(tx: &Transaction<'_>, actor: Option<i64>, action: &str, entity: &str, id: i64, before: Option<&Value>, after: Option<&Value>) -> Res<()> {
    sql(tx.execute(
        "INSERT INTO audit_logs(user_id,action,entity_type,entity_id,before_json,after_json,machine) VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![
            actor,
            action,
            entity,
            id,
            before.map(Value::to_string),
            after.map(Value::to_string),
            std::env::var("COMPUTERNAME").unwrap_or_default()
        ],
    ))?;
    Ok(())
}

/// Compara as listas antes/depois pelo id e registra o que mudou.
fn audit_changes(tx: &Transaction<'_>, actor: Option<i64>, entity: &str, before: &[Value], after: &[Value]) -> Res<()> {
    let by_id = |list: &[Value]| -> HashMap<i64, Value> {
        let mut map = HashMap::new();
        for item in list {
            if let Some(id) = item.get("id").and_then(Value::as_i64) {
                map.entry(id).or_insert_with(|| item.clone());
            }
        }
        map
    };
    let (old, new) = (by_id(before), by_id(after));
    for (id, item) in &new {
        match old.get(id) {
            None => audit(tx, actor, "CREATE", entity, *id, None, Some(item))?,
            Some(prev) if prev != item => audit(tx, actor, "UPDATE", entity, *id, Some(prev), Some(item))?,
            _ => {}
        }
    }
    for (id, item) in &old {
        if !new.contains_key(id) {
            audit(tx, actor, "DELETE", entity, *id, Some(item), None)?;
        }
    }
    Ok(())
}

/// Hash e salt nunca vão para o log de auditoria; só se registra que a senha mudou.
fn user_for_audit(user: &Value, previous: Option<&Value>) -> Value {
    let mut copy = user.clone();
    if let Some(obj) = copy.as_object_mut() {
        let hash = obj.remove("passwordHash");
        obj.remove("passwordSalt");
        if let Some(prev) = previous {
            if prev.get("passwordHash") != hash.as_ref() {
                obj.insert("senhaAlterada".into(), Value::Bool(true));
            }
        }
    }
    copy
}

// ---------- usuários ----------

pub fn read_users(conn: &Connection) -> Res<Vec<Value>> {
    let mut stmt = sql(conn.prepare(
        "SELECT id,name,login,role,scope,active,password_hash,password_salt,failed_attempts,locked_until,extra_json FROM user_accounts ORDER BY position",
    ))?;
    let rows = sql(stmt.query_map([], |r| {
        let mut obj = Map::new();
        obj.insert("id".into(), Value::from(r.get::<_, i64>(0)?));
        obj.insert("name".into(), Value::from(r.get::<_, String>(1)?));
        obj.insert("login".into(), Value::from(r.get::<_, String>(2)?));
        obj.insert("role".into(), Value::from(r.get::<_, String>(3)?));
        put_opt(&mut obj, "scope", r.get(4)?);
        obj.insert("active".into(), Value::Bool(r.get::<_, i64>(5)? != 0));
        put_opt(&mut obj, "passwordHash", r.get(6)?);
        put_opt(&mut obj, "passwordSalt", r.get(7)?);
        obj.insert("failedAttempts".into(), Value::from(r.get::<_, i64>(8)?));
        obj.insert(
            "lockedUntil".into(),
            r.get::<_, Option<String>>(9)?.map(Value::String).unwrap_or(Value::Null),
        );
        merge_extra(&mut obj, r.get(10)?);
        Ok(Value::Object(obj))
    }))?;
    rows.map(sql).collect()
}

/// Substitui a lista de usuários. `audit_changes` desligado na migração e nas
/// atualizações de tentativas de login (estas têm auditoria própria de autenticação).
pub fn write_users(tx: &Transaction<'_>, raw: &str, actor: Option<i64>, with_audit: bool) -> Res<()> {
    let items = parse_list(raw, "usuários")?;
    let before = if with_audit { read_users(tx)? } else { Vec::new() };
    sql(tx.execute("DELETE FROM user_accounts", []))?;
    for (position, mut obj) in items.iter().cloned().enumerate() {
        let id = take_id(&mut obj, "Usuário")?;
        let name = take_str(&mut obj, "name").unwrap_or_default();
        let login = take_str(&mut obj, "login").unwrap_or_default();
        let role = take_str(&mut obj, "role").unwrap_or_else(|| "OPERADOR".into());
        let scope = take_str(&mut obj, "scope");
        let active = take_bool(&mut obj, "active");
        let hash = take_str(&mut obj, "passwordHash");
        let salt = take_str(&mut obj, "passwordSalt");
        let failed = obj.remove("failedAttempts").and_then(|v| v.as_i64()).unwrap_or(0);
        let locked = take_str(&mut obj, "lockedUntil");
        sql(tx.execute(
            "INSERT INTO user_accounts(position,id,name,login,role,scope,active,password_hash,password_salt,failed_attempts,locked_until,extra_json) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![position as i64, id, name, login, role, scope, active as i64, hash, salt, failed, locked, extra(obj)],
        ))?;
    }
    if with_audit {
        let after = read_users(tx)?;
        let old: HashMap<i64, &Value> =
            before.iter().filter_map(|u| u.get("id").and_then(Value::as_i64).map(|id| (id, u))).collect();
        let clean = |list: &[Value], prev: &HashMap<i64, &Value>| -> Vec<Value> {
            list.iter()
                .map(|u| user_for_audit(u, u.get("id").and_then(Value::as_i64).and_then(|id| prev.get(&id).copied())))
                .collect()
        };
        audit_changes(tx, actor, "USER", &clean(&before, &HashMap::new()), &clean(&after, &old))?;
    }
    Ok(())
}

// ---------- cadastros ----------

pub fn read_catalogs(conn: &Connection) -> Res<Value> {
    let mut out = Map::new();
    for kind in CATALOG_KINDS {
        out.insert((*kind).into(), Value::Array(Vec::new()));
    }
    let mut stmt = sql(conn.prepare(
        "SELECT kind,id,name,active,parent,detail,address,extra_json FROM catalog_items ORDER BY kind,position",
    ))?;
    let rows = sql(stmt.query_map([], |r| {
        let mut obj = Map::new();
        obj.insert("id".into(), Value::from(r.get::<_, i64>(1)?));
        obj.insert("name".into(), Value::from(r.get::<_, String>(2)?));
        obj.insert("active".into(), Value::Bool(r.get::<_, i64>(3)? != 0));
        put_opt(&mut obj, "parent", r.get(4)?);
        put_opt(&mut obj, "detail", r.get(5)?);
        put_opt(&mut obj, "address", r.get(6)?);
        merge_extra(&mut obj, r.get(7)?);
        Ok((r.get::<_, String>(0)?, Value::Object(obj)))
    }))?;
    for row in rows {
        let (kind, item) = sql(row)?;
        if let Value::Array(list) = out.entry(kind).or_insert_with(|| Value::Array(Vec::new())) {
            list.push(item);
        }
    }
    Ok(Value::Object(out))
}

pub fn write_catalogs(tx: &Transaction<'_>, raw: &str, actor: Option<i64>, with_audit: bool) -> Res<()> {
    let parsed: Map<String, Value> = match serde_json::from_str(raw) {
        Ok(Value::Object(obj)) => obj,
        _ => return Err("Cadastros inválidos".into()),
    };
    let before = if with_audit { read_catalogs(tx)? } else { Value::Null };
    sql(tx.execute("DELETE FROM catalog_items", []))?;
    for (kind, list) in &parsed {
        let Value::Array(items) = list else { return Err(format!("Cadastro {kind} inválido")) };
        for (position, item) in items.iter().enumerate() {
            let Value::Object(obj) = item else { return Err(format!("Item de {kind} inválido")) };
            let mut obj = obj.clone();
            let id = take_id(&mut obj, "Cadastro")?;
            let name = take_str(&mut obj, "name").unwrap_or_default();
            let active = take_bool(&mut obj, "active");
            let parent = take_str(&mut obj, "parent");
            let detail = take_str(&mut obj, "detail");
            let address = take_str(&mut obj, "address");
            sql(tx.execute(
                "INSERT INTO catalog_items(kind,position,id,name,active,parent,detail,address,extra_json) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)",
                params![kind, position as i64, id, name, active as i64, parent, detail, address, extra(obj)],
            ))?;
        }
    }
    if with_audit {
        let after = read_catalogs(tx)?;
        let kinds: Vec<&String> = after.as_object().map(|o| o.keys().collect()).unwrap_or_default();
        for kind in kinds {
            let list = |v: &Value| -> Vec<Value> {
                v.get(kind.as_str())
                    .and_then(Value::as_array)
                    .map(|items| {
                        items
                            .iter()
                            .map(|item| {
                                let mut item = item.clone();
                                item["tipo"] = Value::String(kind.clone());
                                item
                            })
                            .collect()
                    })
                    .unwrap_or_default()
            };
            audit_changes(tx, actor, "CATALOG", &list(&before), &list(&after))?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(include_str!("../migrations/001_initial.sql")).unwrap();
        conn.execute_batch(include_str!("../migrations/002_operational_hardening.sql")).unwrap();
        conn.execute_batch(include_str!("../migrations/003_registry_tables.sql")).unwrap();
        conn
    }
    fn audits(conn: &Connection, entity: &str) -> Vec<(String, i64, Option<String>)> {
        let mut stmt = conn
            .prepare("SELECT action,entity_id,after_json FROM audit_logs WHERE entity_type=?1 ORDER BY id")
            .unwrap();
        stmt.query_map(params![entity], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))
            .unwrap()
            .map(Result::unwrap)
            .collect()
    }

    fn sample_users() -> Value {
        json!([
            {"id": 1700000000001i64, "name": "Admin", "login": "admin", "role": "ADMIN", "active": true,
             "passwordHash": "aa", "passwordSalt": "bb", "failedAttempts": 0, "lockedUntil": null},
            {"id": 2, "name": "Saúde", "login": "saude", "role": "OPERADOR", "scope": "SAUDE", "active": false,
             "passwordHash": "cc", "passwordSalt": "dd", "failedAttempts": 3,
             "lockedUntil": "2026-10-02T15:00:00.000Z", "campoFuturo": {"a": 1}}
        ])
    }

    #[test]
    fn migra_snapshot_sem_perder_campos() {
        let mut conn = db();
        let catalogs = json!({
            "secretarias": [{"id": 1000, "name": "Gabinete", "active": true, "detail": "Órgão Municipal"}],
            "unidades": [{"id": 2000, "name": "UBS Centro", "parent": "Saúde", "active": true, "address": "Av. 1"},
                         {"id": 2000, "name": "Id repetido", "active": false}],
            "equipes": [], "tecnicos": [], "materiais": [{"id": 1, "name": "Cimento", "detail": "saco", "active": true}]
        });
        conn.execute("INSERT INTO app_snapshots(key,value_json) VALUES('users',?1),('catalogs',?2)",
            params![sample_users().to_string(), catalogs.to_string()]).unwrap();
        migrate_from_snapshots(&mut conn).unwrap();
        assert!(is_active(&conn).unwrap());
        assert_eq!(Value::Array(read_users(&conn).unwrap()), sample_users());
        assert_eq!(read_catalogs(&conn).unwrap(), catalogs);
        // o snapshot antigo continua lá como cópia de segurança
        let kept: i64 = conn.query_row("SELECT COUNT(*) FROM app_snapshots", [], |r| r.get(0)).unwrap();
        assert_eq!(kept, 2);
        // migração não gera auditoria
        assert!(audits(&conn, "USER").is_empty());
    }

    #[test]
    fn instalacao_nova_ativa_tabelas_vazias() {
        let mut conn = db();
        migrate_from_snapshots(&mut conn).unwrap();
        assert!(is_active(&conn).unwrap());
        assert!(read_users(&conn).unwrap().is_empty());
        let catalogs = read_catalogs(&conn).unwrap();
        for kind in CATALOG_KINDS {
            assert_eq!(catalogs[*kind], json!([]));
        }
    }

    #[test]
    fn snapshot_invalido_nao_ativa_tabelas() {
        let mut conn = db();
        conn.execute("INSERT INTO app_snapshots(key,value_json) VALUES('users','{quebrado')", []).unwrap();
        assert!(migrate_from_snapshots(&mut conn).is_err());
        assert!(!is_active(&conn).unwrap());
    }

    #[test]
    fn auditoria_de_usuarios_sem_senha() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        write_users(&tx, &sample_users().to_string(), Some(1), true).unwrap();
        let mut changed = sample_users();
        changed[0]["passwordHash"] = json!("nova");
        changed[0]["name"] = json!("Administrador");
        changed.as_array_mut().unwrap().remove(1);
        write_users(&tx, &changed.to_string(), Some(1), true).unwrap();
        tx.commit().unwrap();
        let log = audits(&conn, "USER");
        let actions: Vec<&str> = log.iter().map(|(a, _, _)| a.as_str()).collect();
        assert_eq!(actions.iter().filter(|a| **a == "CREATE").count(), 2);
        assert!(actions.contains(&"UPDATE") && actions.contains(&"DELETE"));
        let update = log.iter().find(|(a, _, _)| a == "UPDATE").unwrap().2.clone().unwrap();
        assert!(update.contains("senhaAlterada") && !update.contains("nova"));
        assert!(log.iter().all(|(_, _, after)| after.as_deref().map_or(true, |j| !j.contains("passwordHash"))));
    }

    #[test]
    fn auditoria_de_cadastros_por_tipo() {
        let mut conn = db();
        let tx = conn.transaction().unwrap();
        let first = json!({"secretarias": [{"id": 1, "name": "A", "active": true}], "equipes": [{"id": 1, "name": "E", "active": true}]});
        write_catalogs(&tx, &first.to_string(), Some(9), true).unwrap();
        let second = json!({"secretarias": [{"id": 1, "name": "A", "active": false}], "equipes": [{"id": 1, "name": "E", "active": true}]});
        write_catalogs(&tx, &second.to_string(), Some(9), true).unwrap();
        tx.commit().unwrap();
        let log = audits(&conn, "CATALOG");
        assert_eq!(log.len(), 3, "2 inclusões + 1 alteração: {log:?}");
        let update = log.iter().find(|(a, _, _)| a == "UPDATE").unwrap().2.clone().unwrap();
        assert!(update.contains("\"tipo\":\"secretarias\""));
    }
}
