export const SNAPSHOT_ORDERS='orders';
export const SNAPSHOT_CATALOGS='catalogs';
export const SNAPSHOT_USERS='users';

export function isDesktopMode():boolean{
  return typeof window!=='undefined' && '__TAURI_INTERNALS__' in window;
}

async function invoke<T>(command:string,args?:Record<string,unknown>):Promise<T>{
  const api=await import('@tauri-apps/api/core');
  return api.invoke<T>(command,args);
}

export async function loadDesktopSnapshot<T>(key:string):Promise<T|null>{
  if(!isDesktopMode())return null;
  try{
    const raw=await invoke<string|null>('load_snapshot',{key});
    return raw?JSON.parse(raw) as T:null;
  }catch(error){
    console.error(`Falha ao carregar snapshot ${key} do SQLite.`,error);
    return null;
  }
}

export async function saveDesktopSnapshot<T>(key:string,value:T):Promise<boolean>{
  if(!isDesktopMode())return true;
  try{
    await invoke<void>('save_snapshot',{key,valueJson:JSON.stringify(value)});
    return true;
  }catch(error){
    console.error(`Falha ao salvar snapshot ${key} no SQLite.`,error);
    return false;
  }
}

export async function getDesktopDatabaseLocation():Promise<string|null>{
  if(!isDesktopMode())return null;
  try{return await invoke<string>('database_location');}catch{return null;}
}

export async function createDesktopBackup():Promise<string|null>{
  if(!isDesktopMode())return null;
  try{return await invoke<string>('backup_now');}catch(error){console.error('Falha ao criar backup do SQLite.',error);return null;}
}
