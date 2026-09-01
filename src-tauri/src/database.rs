use rusqlite::{params, Connection, OptionalExtension, Result, Transaction};
use serde_json::Value;
use std::fs;
use crate::portable;

fn db_path() -> std::path::PathBuf { portable::data_root().join("data").join("sos.db") }
fn open()->Result<Connection>{ let conn=Connection::open(db_path())?; conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")?; Ok(conn) }

fn validate_order(raw:&str)->std::result::Result<(i64,i64),String>{
    let v:Value=serde_json::from_str(raw).map_err(|_|"JSON de O.S. inválido".to_string())?;
    let id=v.get("id").and_then(Value::as_i64).ok_or("O.S. sem id válido")?;
    let number=v.get("number").and_then(Value::as_i64).ok_or("O.S. sem número válido")?;
    if id<=0 || number<=0{return Err("Id e número da O.S. devem ser positivos".into())}
    let progress=v.get("progress").and_then(Value::as_i64).unwrap_or(-1);
    if !(0..=100).contains(&progress){return Err("Progresso da O.S. fora do intervalo 0-100".into())}
    let status=v.get("status").and_then(Value::as_str).unwrap_or("");
    const VALID:&[&str]=&["ABERTA","EM_ANDAMENTO","PARALISADA","AGUARDANDO_MATERIAL","ATENDIDA","CONCLUIDA","CANCELADA"];
    if !VALID.contains(&status){return Err("Status de O.S. inválido".into())}
    Ok((id,number))
}

fn audit(tx:&Transaction<'_>,user_id:Option<i64>,action:&str,entity_id:Option<i64>,before:Option<&str>,after:Option<&str>)->Result<()>{
    tx.execute("INSERT INTO audit_logs(user_id,action,entity_type,entity_id,before_json,after_json,machine) VALUES(?1,?2,'WORK_ORDER',?3,?4,?5,?6)",params![user_id,action,entity_id,before,after,std::env::var("COMPUTERNAME").unwrap_or_default()])?;
    Ok(())
}

fn migrate_legacy_orders(conn:&mut Connection)->Result<()> {
    let count:i64=conn.query_row("SELECT COUNT(*) FROM work_order_records",[],|r|r.get(0))?;
    if count>0{return Ok(())}
    let legacy:Option<String>=conn.query_row("SELECT value_json FROM app_snapshots WHERE key='orders'",[],|r|r.get(0)).optional()?;
    let Some(raw)=legacy else{return Ok(())};
    let Ok(items)=serde_json::from_str::<Vec<Value>>(&raw) else{return Ok(())};
    let tx=conn.transaction()?;
    for item in items{
        let json=item.to_string();
        if let Ok((id,number))=validate_order(&json){tx.execute("INSERT OR REPLACE INTO work_order_records(id,number,order_json,updated_at) VALUES(?1,?2,?3,CURRENT_TIMESTAMP)",params![id,number,json])?;}
    }
    tx.commit()?;
    Ok(())
}

pub fn initialize()->Result<()> {
    let root=portable::data_root();
    fs::create_dir_all(root.join("data")).ok(); fs::create_dir_all(root.join("anexos")).ok(); fs::create_dir_all(root.join("backups")).ok(); fs::create_dir_all(root.join("logs")).ok();
    let mut conn=open()?;
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
    conn.execute_batch(include_str!("../migrations/002_operational_hardening.sql"))?;
    migrate_legacy_orders(&mut conn)?;
    drop(conn);
    let _=backup_daily();
    Ok(())
}

pub fn load_snapshot(key:&str)->Result<Option<String>> { let conn=open()?; conn.query_row("SELECT value_json FROM app_snapshots WHERE key=?1",params![key],|row|row.get(0)).optional() }
pub fn save_snapshot(key:&str,value_json:&str)->Result<()> { let conn=open()?; conn.execute("INSERT INTO app_snapshots(key,value_json,updated_at) VALUES(?1,?2,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP",params![key,value_json])?; Ok(()) }

pub fn load_orders()->Result<Vec<String>>{
    let conn=open()?; let mut stmt=conn.prepare("SELECT order_json FROM work_order_records ORDER BY id DESC")?;
    let rows=stmt.query_map([],|r|r.get::<_,String>(0))?; let mut out=Vec::new(); for row in rows{out.push(row?)} Ok(out)
}

pub fn save_order(order_json:&str,user_id:Option<i64>)->std::result::Result<(),String>{
    let (id,number)=validate_order(order_json)?; let mut conn=open().map_err(|e|e.to_string())?; let tx=conn.transaction().map_err(|e|e.to_string())?;
    let before:Option<String>=tx.query_row("SELECT order_json FROM work_order_records WHERE id=?1",params![id],|r|r.get(0)).optional().map_err(|e|e.to_string())?;
    tx.execute("INSERT INTO work_order_records(id,number,order_json,updated_at) VALUES(?1,?2,?3,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET number=excluded.number,order_json=excluded.order_json,updated_at=CURRENT_TIMESTAMP",params![id,number,order_json]).map_err(|e|e.to_string())?;
    audit(&tx,user_id,if before.is_some(){"UPDATE"}else{"CREATE"},Some(id),before.as_deref(),Some(order_json)).map_err(|e|e.to_string())?;
    tx.commit().map_err(|e|e.to_string())?; Ok(())
}

pub fn delete_order(id:i64,user_id:Option<i64>)->Result<()> {
    let mut conn=open()?; let tx=conn.transaction()?;
    let before:Option<String>=tx.query_row("SELECT order_json FROM work_order_records WHERE id=?1",params![id],|r|r.get(0)).optional()?;
    tx.execute("DELETE FROM work_order_records WHERE id=?1",params![id])?;
    audit(&tx,user_id,"DELETE",Some(id),before.as_deref(),None)?; tx.commit()?; Ok(())
}

pub fn replace_orders(order_jsons:&[String],user_id:Option<i64>)->std::result::Result<(),String>{
    let mut validated=Vec::with_capacity(order_jsons.len()); for raw in order_jsons{let (id,number)=validate_order(raw)?;validated.push((id,number,raw));}
    let mut conn=open().map_err(|e|e.to_string())?; let tx=conn.transaction().map_err(|e|e.to_string())?;
    tx.execute("DELETE FROM work_order_records",[]).map_err(|e|e.to_string())?;
    for (id,number,raw) in validated{tx.execute("INSERT INTO work_order_records(id,number,order_json,updated_at) VALUES(?1,?2,?3,CURRENT_TIMESTAMP)",params![id,number,raw]).map_err(|e|e.to_string())?;}
    audit(&tx,user_id,"IMPORT",None,None,None).map_err(|e|e.to_string())?; tx.commit().map_err(|e|e.to_string())?; Ok(())
}

pub fn database_location()->String { db_path().to_string_lossy().to_string() }

fn create_backup(label:&str)->std::io::Result<String>{
    let root=portable::data_root(); let source=db_path(); let backup_dir=root.join("backups"); fs::create_dir_all(&backup_dir)?;
    let stamp=chrono::Local::now().format("%Y%m%d-%H%M%S").to_string(); let target=backup_dir.join(format!("sos-{}-{}.db",label,stamp));
    fs::copy(source,&target)?; Ok(target.to_string_lossy().to_string())
}
pub fn backup_now()->std::io::Result<String>{create_backup("backup")}
fn backup_daily()->std::io::Result<Option<String>>{
    let today=chrono::Local::now().format("%Y-%m-%d").to_string();
    let conn=open().map_err(|e|std::io::Error::other(e.to_string()))?;
    let last:Option<String>=conn.query_row("SELECT value FROM settings WHERE key='last_auto_backup'",[],|r|r.get(0)).optional().map_err(|e|std::io::Error::other(e.to_string()))?;
    if last.as_deref()==Some(&today){return Ok(None)} drop(conn);
    let path=create_backup("auto")?; let conn=open().map_err(|e|std::io::Error::other(e.to_string()))?;
    conn.execute("INSERT INTO settings(key,value,updated_at) VALUES('last_auto_backup',?1,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",params![today]).map_err(|e|std::io::Error::other(e.to_string()))?;
    Ok(Some(path))
}
