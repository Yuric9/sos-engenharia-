mod database;
mod portable;

#[tauri::command]
fn app_mode() -> String {
    if portable::is_portable(){"portable".into()}else{"installed".into()}
}

#[tauri::command]
fn database_location() -> String {
    database::database_location()
}

#[tauri::command]
fn load_snapshot(key:String) -> Result<Option<String>,String> {
    database::load_snapshot(&key).map_err(|e|e.to_string())
}

#[tauri::command]
fn save_snapshot(key:String,value_json:String) -> Result<(),String> {
    database::save_snapshot(&key,&value_json).map_err(|e|e.to_string())
}

#[tauri::command]
fn backup_now() -> Result<String,String> {
    database::backup_now().map_err(|e|e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
    let _ = database::initialize();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_mode,
            database_location,
            load_snapshot,
            save_snapshot,
            backup_now
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar S.O.S");
}
