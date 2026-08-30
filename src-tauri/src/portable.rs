use std::path::PathBuf;
pub fn is_portable()->bool{ std::env::current_exe().ok().and_then(|p|p.parent().map(|d|d.join("portable.flag").exists())).unwrap_or(false) }
pub fn data_root()->PathBuf{
 if is_portable(){ let exe=std::env::current_exe().unwrap(); exe.parent().unwrap().join("sos-data") }
 else { let base=std::env::var("LOCALAPPDATA").unwrap_or_else(|_|".".into()); PathBuf::from(base).join("SOS-Manutencao") }
}
