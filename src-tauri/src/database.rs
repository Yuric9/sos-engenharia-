use rusqlite::{params, Connection, OptionalExtension, Result};
use std::fs;
use crate::portable;

fn db_path() -> std::path::PathBuf {
    portable::data_root().join("data").join("sos.db")
}

pub fn initialize()->Result<()> {
    let root=portable::data_root();
    fs::create_dir_all(root.join("data")).ok();
    fs::create_dir_all(root.join("anexos")).ok();
    fs::create_dir_all(root.join("backups")).ok();
    fs::create_dir_all(root.join("logs")).ok();
    let conn=Connection::open(db_path())?;
    conn.execute_batch(include_str!("../migrations/001_initial.sql"))?;
    Ok(())
}

pub fn load_snapshot(key:&str)->Result<Option<String>> {
    let conn=Connection::open(db_path())?;
    conn.query_row(
        "SELECT value_json FROM app_snapshots WHERE key=?1",
        params![key],
        |row| row.get(0)
    ).optional()
}

pub fn save_snapshot(key:&str,value_json:&str)->Result<()> {
    let conn=Connection::open(db_path())?;
    conn.execute(
        "INSERT INTO app_snapshots(key,value_json,updated_at) VALUES(?1,?2,CURRENT_TIMESTAMP)\n         ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=CURRENT_TIMESTAMP",
        params![key,value_json]
    )?;
    Ok(())
}

pub fn database_location()->String {
    db_path().to_string_lossy().to_string()
}

pub fn backup_now()->std::io::Result<String> {
    let root=portable::data_root();
    let source=db_path();
    let backup_dir=root.join("backups");
    fs::create_dir_all(&backup_dir)?;
    let stamp=chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    let target=backup_dir.join(format!("sos-backup-{}.db",stamp));
    fs::copy(source,&target)?;
    Ok(target.to_string_lossy().to_string())
}
