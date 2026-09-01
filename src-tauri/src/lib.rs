mod database;
mod portable;

#[tauri::command]
fn app_mode() -> String { if portable::is_portable(){"portable".into()}else{"installed".into()} }
#[tauri::command]
fn database_location() -> String { database::database_location() }
#[tauri::command]
fn load_snapshot(key:String) -> Result<Option<String>,String> { database::load_snapshot(&key).map_err(|e|e.to_string()) }
#[tauri::command]
fn save_snapshot(key:String,value_json:String) -> Result<(),String> { database::save_snapshot(&key,&value_json).map_err(|e|e.to_string()) }
#[tauri::command]
fn load_orders() -> Result<Vec<String>,String> { database::load_orders().map_err(|e|e.to_string()) }
#[tauri::command]
fn save_order(order_json:String,user_id:Option<i64>) -> Result<(),String> { database::save_order(&order_json,user_id) }
#[tauri::command]
fn delete_order(id:i64,user_id:Option<i64>) -> Result<(),String> { database::delete_order(id,user_id).map_err(|e|e.to_string()) }
#[tauri::command]
fn replace_orders(order_jsons:Vec<String>,user_id:Option<i64>) -> Result<(),String> { database::replace_orders(&order_jsons,user_id) }
#[tauri::command]
fn save_attachment(os_id:i64,attachment_id:String,file_name:String,mime_type:String,data_base64:String)->Result<String,String>{database::save_attachment(os_id,&attachment_id,&file_name,&mime_type,&data_base64)}
#[tauri::command]
fn read_attachment(stored_path:String,mime_type:String)->Result<String,String>{database::read_attachment(&stored_path,&mime_type)}
#[tauri::command]
fn delete_attachment(stored_path:String)->Result<(),String>{database::delete_attachment(&stored_path)}
#[tauri::command]
fn backup_now() -> Result<String,String> { database::backup_now().map_err(|e|e.to_string()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
    database::initialize().expect("não foi possível inicializar o banco S.O.S");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_mode,database_location,load_snapshot,save_snapshot,load_orders,save_order,delete_order,replace_orders,save_attachment,read_attachment,delete_attachment,backup_now])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar S.O.S");
}
