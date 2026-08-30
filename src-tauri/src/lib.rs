mod database;
mod portable;
#[tauri::command]
fn app_mode() -> String { if portable::is_portable(){"portable".into()}else{"installed".into()} }
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(){
 let _ = database::initialize();
 tauri::Builder::default().invoke_handler(tauri::generate_handler![app_mode]).run(tauri::generate_context!()).expect("erro ao iniciar S.O.S");
}
