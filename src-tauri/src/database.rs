use rusqlite::{Connection,Result};
use std::fs;
use crate::portable;
pub fn initialize()->Result<()> {
 let root=portable::data_root();
 fs::create_dir_all(root.join("data")).ok(); fs::create_dir_all(root.join("anexos")).ok(); fs::create_dir_all(root.join("backups")).ok(); fs::create_dir_all(root.join("logs")).ok();
 let conn=Connection::open(root.join("data").join("sos.db"))?;
 conn.execute_batch(include_str!("../migrations/001_initial.sql"))?; Ok(())
}
