use base64::{engine::general_purpose::STANDARD, Engine as _};
use rusqlite::{params, Connection, OptionalExtension, Result, Transaction};
use serde_json::Value;
use std::{fs, path::{Component, Path, PathBuf}};
use crate::portable;

const MAX_ATTACHMENT_BYTES: usize = 10 * 1024 * 1024;

fn db_path() -> PathBuf { portable::data_root().join("data").join("sos.db") }
fn attachments_root() -> PathBuf { portable::data_root().join("anexos") }
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

fn extension_allowed(ext:&str)->bool{matches!(ext,"jpg"|"jpeg"|"png"|"webp"|"gif"|"pdf"|"doc"|"docx")}
fn mime_allowed(mime:&str)->bool{matches!(mime,"image/jpeg"|"image/png"|"image/webp"|"image/gif"|"application/pdf"|"application/msword"|"application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
fn safe_attachment_id(id:&str)->bool{!id.is_empty()&&id.len()<=80&&id.chars().all(|c|c.is_ascii_alphanumeric()||c=='-'||c=='_')}
fn extension_from_name(name:&str)->std::result::Result<String,String>{
    let ext=Path::new(name).extension().and_then(|x|x.to_str()).unwrap_or("").to_ascii_lowercase();
    if !extension_allowed(&ext){return Err("Tipo de arquivo não permitido".into())} Ok(ext)
}
fn safe_stored_path(stored:&str)->std::result::Result<PathBuf,String>{
    let rel=Path::new(stored);
    if rel.is_absolute()||rel.components().any(|c|!matches!(c,Component::Normal(_))){return Err("Caminho de anexo inválido".into())}
    Ok(attachments_root().join(rel))
}

pub fn save_attachment(os_id:i64,attachment_id:&str,file_name:&str,mime_type:&str,data_base64:&str)->std::result::Result<String,String>{
    if os_id<=0{return Err("O.S. inválida para anexo".into())}
    if !safe_attachment_id(attachment_id){return Err("Identificador de anexo inválido".into())}
    if !mime_allowed(mime_type){return Err("Tipo MIME não permitido".into())}
    let ext=extension_from_name(file_name)?;
    let bytes=STANDARD.decode(data_base64).map_err(|_|"Conteúdo do anexo inválido".to_string())?;
    if bytes.is_empty(){return Err("Anexo vazio".into())}
    if bytes.len()>MAX_ATTACHMENT_BYTES{return Err("Anexo excede o limite de 10 MB".into())}
    let rel=PathBuf::from(format!("os-{}",os_id)).join(format!("{}.{}",attachment_id,ext));
    let target=attachments_root().join(&rel);
    if let Some(parent)=target.parent(){fs::create_dir_all(parent).map_err(|e|e.to_string())?;}
    let temp=target.with_extension(format!("{}.tmp",ext));
    fs::write(&temp,&bytes).map_err(|e|e.to_string())?;
    if target.exists(){fs::remove_file(&target).map_err(|e|e.to_string())?;}
    fs::rename(&temp,&target).map_err(|e|e.to_string())?;
    Ok(rel.to_string_lossy().replace('\\',"/"))
}

pub fn read_attachment(stored_path:&str,mime_type:&str)->std::result::Result<String,String>{
    if !mime_allowed(mime_type){return Err("Tipo MIME não permitido".into())}
    let path=safe_stored_path(stored_path)?;
    let bytes=fs::read(path).map_err(|e|e.to_string())?;
    if bytes.len()>MAX_ATTACHMENT_BYTES{return Err("Anexo excede o limite permitido".into())}
    Ok(format!("data:{};base64,{}",mime_type,STANDARD.encode(bytes)))
}

pub fn delete_attachment(stored_path:&str)->std::result::Result<(),String>{
    let path=safe_stored_path(stored_path)?;
    if path.exists(){fs::remove_file(path).map_err(|e|e.to_string())?;} Ok(())
}

fn migrate_legacy_attachment_files(order:&mut Value)->std::result::Result<bool,String>{
    let os_id=order.get("id").and_then(Value::as_i64).ok_or("O.S. histórica sem id")?;
    let Some(items)=order.get_mut("attachments").and_then(Value::as_array_mut) else{return Ok(false)};
    let mut changed=false;
    for item in items.iter_mut(){
        if item.get("storedPath").and_then(Value::as_str).is_some(){continue}
        let Some(data_url)=item.get("dataUrl").and_then(Value::as_str).map(str::to_string) else{continue};
        let Some((head,data))=data_url.split_once(',') else{continue};
        if !head.ends_with(";base64"){continue}
        let mime=head.strip_prefix("data:").and_then(|x|x.strip_suffix(";base64")).unwrap_or("");
        let id=item.get("id").and_then(Value::as_str).unwrap_or("").to_string();
        let name=item.get("name").and_then(Value::as_str).unwrap_or("").to_string();
        if let Ok(path)=save_attachment(os_id,&id,&name,mime,data){
            if let Some(obj)=item.as_object_mut(){obj.insert("storedPath".into(),Value::String(path));obj.remove("dataUrl");}
            changed=true;
        }
    }
    Ok(changed)
}

fn migrate_legacy_orders(conn:&mut Connection)->Result<()> {
    let count:i64=conn.query_row("SELECT COUNT(*) FROM work_order_records",[],|r|r.get(0))?;
    if count==0{
        let legacy:Option<String>=conn.query_row("SELECT value_json FROM app_snapshots WHERE key='orders'",[],|r|r.get(0)).optional()?;
        if let Some(raw)=legacy{
            if let Ok(items)=serde_json::from_str::<Vec<Value>>(&raw){
                let tx=conn.transaction()?;
                for item in items{
                    let json=item.to_string();
                    if let Ok((id,number))=validate_order(&json){tx.execute("INSERT OR REPLACE INTO work_order_records(id,number,order_json,updated_at) VALUES(?1,?2,?3,CURRENT_TIMESTAMP)",params![id,number,json])?;}
                }
                tx.commit()?;
            }
        }
    }
    let mut stmt=conn.prepare("SELECT id,order_json FROM work_order_records")?;
    let rows=stmt.query_map([],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,String>(1)?)))?;
    let mut pending=Vec::new();
    for row in rows{let (id,raw)=row?;if let Ok(mut value)=serde_json::from_str::<Value>(&raw){if migrate_legacy_attachment_files(&mut value).unwrap_or(false){pending.push((id,value.to_string()));}}}
    drop(stmt);
    for (id,json) in pending{conn.execute("UPDATE work_order_records SET order_json=?1,updated_at=CURRENT_TIMESTAMP WHERE id=?2",params![json,id])?;}
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
    audit(&tx,user_id,"DELETE",Some(id),before.as_deref(),None)?; tx.commit()?;
    let dir=attachments_root().join(format!("os-{}",id)); if dir.exists(){let _=fs::remove_dir_all(dir);} Ok(())
}

pub fn replace_orders(order_jsons:&[String],user_id:Option<i64>)->std::result::Result<(),String>{
    let mut validated=Vec::with_capacity(order_jsons.len()); for raw in order_jsons{let (id,number)=validate_order(raw)?;validated.push((id,number,raw));}
    let mut conn=open().map_err(|e|e.to_string())?; let tx=conn.transaction().map_err(|e|e.to_string())?;
    tx.execute("DELETE FROM work_order_records",[]).map_err(|e|e.to_string())?;
    for (id,number,raw) in validated{tx.execute("INSERT INTO work_order_records(id,number,order_json,updated_at) VALUES(?1,?2,?3,CURRENT_TIMESTAMP)",params![id,number,raw]).map_err(|e|e.to_string())?;}
    audit(&tx,user_id,"IMPORT",None,None,None).map_err(|e|e.to_string())?; tx.commit().map_err(|e|e.to_string())?; Ok(())
}

pub fn database_location()->String { db_path().to_string_lossy().to_string() }

fn copy_dir_recursive(source:&Path,target:&Path)->std::io::Result<()>{
    if !source.exists(){return Ok(())}
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)?{
        let entry=entry?; let src=entry.path(); let dst=target.join(entry.file_name());
        if entry.file_type()?.is_dir(){copy_dir_recursive(&src,&dst)?}else{fs::copy(&src,&dst)?;}
    }
    Ok(())
}

fn create_backup(label:&str)->std::io::Result<String>{
    let root=portable::data_root(); let backup_dir=root.join("backups"); fs::create_dir_all(&backup_dir)?;
    let stamp=chrono::Local::now().format("%Y%m%d-%H%M%S").to_string(); let target=backup_dir.join(format!("sos-{}-{}",label,stamp));
    fs::create_dir_all(&target)?;
    fs::copy(db_path(),target.join("sos.db"))?;
    copy_dir_recursive(&attachments_root(),&target.join("anexos"))?;
    fs::write(target.join("LEIA-ME.txt"),"Backup completo do S.O.S. Contém o banco sos.db e a pasta anexos. Mantenha os dois juntos durante uma restauração.")?;
    Ok(target.to_string_lossy().to_string())
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
