mod backup_verify;
mod database;
mod portable;
mod registry;
mod session;

use std::path::{Component,Path};

#[tauri::command]
fn app_mode() -> String { if portable::is_portable(){"portable".into()}else{"installed".into()} }
#[tauri::command]
fn database_location() -> String { database::database_location() }
#[tauri::command]
fn load_snapshot(key:String) -> Result<Option<String>,String> { database::load_snapshot(&key) }
#[tauri::command]
fn save_snapshot(key:String,value_json:String) -> Result<(),String> { database::save_snapshot_checked(&key,&value_json) }
#[tauri::command]
fn load_orders() -> Result<Vec<String>,String> { database::load_orders().map_err(|e|e.to_string()) }
#[tauri::command]
fn save_order(order_json:String) -> Result<(),String> { database::save_order(&order_json,&session::require_login()?) }
#[tauri::command]
fn delete_order(id:i64) -> Result<(),String> { let s=session::require_admin()?; database::delete_order(id,Some(s.user_id)).map_err(|e|e.to_string()) }
#[tauri::command]
fn replace_orders(order_jsons:Vec<String>) -> Result<(),String> { let s=session::require_admin()?; database::replace_orders(&order_jsons,Some(s.user_id)) }
#[tauri::command]
fn save_attachment(os_id:i64,attachment_id:String,file_name:String,mime_type:String,data_base64:String)->Result<String,String>{session::require_login()?;database::save_attachment(os_id,&attachment_id,&file_name,&mime_type,&data_base64)}
#[tauri::command]
fn read_attachment(stored_path:String,mime_type:String)->Result<String,String>{database::read_attachment(&stored_path,&mime_type)}
#[tauri::command]
fn delete_attachment(stored_path:String)->Result<(),String>{session::require_login()?;database::delete_attachment(&stored_path)}
#[tauri::command]
fn open_attachment(stored_path:String)->Result<(),String>{
    let rel=Path::new(&stored_path);
    if rel.is_absolute()||rel.components().any(|c|!matches!(c,Component::Normal(_))){return Err("Caminho de anexo inválido".into())}
    let path=portable::data_root().join("anexos").join(rel);
    if !path.is_file(){return Err("Arquivo não encontrado no HD externo".into())}
    #[cfg(target_os="windows")]
    {
        std::process::Command::new("cmd").arg("/C").arg("start").arg("").arg(&path).spawn().map_err(|e|e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os="windows"))]
    { Err("Abertura externa disponível na versão Windows.".into()) }
}
#[tauri::command]
fn backup_now() -> Result<String,String> { session::require_admin()?; database::backup_now().map_err(|e|e.to_string()) }
#[tauri::command]
fn backup_self_test() -> Result<String,String> { session::require_admin()?; backup_verify::run() }
#[tauri::command]
fn auth_login(login:String,password:String) -> Result<session::LoginResult,String> { session::login(&login,&password) }
#[tauri::command]
fn auth_logout() { session::logout() }
#[tauri::command]
fn auth_session() -> Option<i64> { session::current().map(|s|s.user_id) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
    database::initialize().expect("não foi possível inicializar o banco S.O.S");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_mode,database_location,load_snapshot,save_snapshot,load_orders,save_order,delete_order,replace_orders,save_attachment,read_attachment,delete_attachment,open_attachment,backup_now,backup_self_test,auth_login,auth_logout,auth_session])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar S.O.S");
}
