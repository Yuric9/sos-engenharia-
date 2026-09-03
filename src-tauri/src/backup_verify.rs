use rusqlite::Connection;
use std::{fs,path::{Path,PathBuf}};
use crate::{database,portable};

fn count_files(path:&Path)->std::io::Result<usize>{
    if !path.exists(){return Ok(0)}
    let mut total=0;
    for entry in fs::read_dir(path)?{
        let entry=entry?;
        if entry.file_type()?.is_dir(){total+=count_files(&entry.path())?}else{total+=1}
    }
    Ok(total)
}

fn copy_dir(source:&Path,target:&Path)->std::io::Result<()>{
    if !source.exists(){fs::create_dir_all(target)?;return Ok(())}
    fs::create_dir_all(target)?;
    for entry in fs::read_dir(source)?{
        let entry=entry?;let src=entry.path();let dst=target.join(entry.file_name());
        if entry.file_type()?.is_dir(){copy_dir(&src,&dst)?}else{fs::copy(&src,&dst)?;}
    }
    Ok(())
}

fn order_count(path:&Path)->Result<i64,String>{
    let conn=Connection::open(path).map_err(|e|e.to_string())?;
    conn.query_row("SELECT COUNT(*) FROM work_order_records",[],|r|r.get(0)).map_err(|e|e.to_string())
}

pub fn run()->Result<String,String>{
    let root=portable::data_root();
    let live_db=PathBuf::from(database::database_location());
    let live_attachments=root.join("anexos");
    let backup_path=PathBuf::from(database::backup_now().map_err(|e|e.to_string())?);
    let backup_db=backup_path.join("sos.db");
    let backup_attachments=backup_path.join("anexos");
    if !backup_db.is_file(){return Err("Teste falhou: o backup não contém sos.db".into())}
    let live_orders=order_count(&live_db)?;
    let backup_orders=order_count(&backup_db)?;
    let live_files=count_files(&live_attachments).map_err(|e|e.to_string())?;
    let backup_files=count_files(&backup_attachments).map_err(|e|e.to_string())?;
    if live_orders!=backup_orders{return Err(format!("Teste falhou: base ativa tem {} O.S. e o backup tem {}.",live_orders,backup_orders))}
    if live_files!=backup_files{return Err(format!("Teste falhou: base ativa tem {} anexo(s) e o backup tem {}.",live_files,backup_files))}

    let restore=root.join("backups").join(".restore-self-test");
    if restore.exists(){fs::remove_dir_all(&restore).map_err(|e|e.to_string())?}
    fs::create_dir_all(&restore).map_err(|e|e.to_string())?;
    fs::copy(&backup_db,restore.join("sos.db")).map_err(|e|e.to_string())?;
    copy_dir(&backup_attachments,&restore.join("anexos")).map_err(|e|e.to_string())?;
    let restored_orders=order_count(&restore.join("sos.db"))?;
    let restored_files=count_files(&restore.join("anexos")).map_err(|e|e.to_string())?;
    let _=fs::remove_dir_all(&restore);
    if restored_orders!=live_orders||restored_files!=live_files{return Err("Teste falhou na restauração temporária dos dados.".into())}
    Ok(format!("Backup e restauração de teste validados: {} O.S. e {} arquivo(s)/anexo(s). Backup de teste: {}",live_orders,live_files,backup_path.to_string_lossy()))
}
