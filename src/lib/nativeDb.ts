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
  try{const raw=await invoke<string|null>('load_snapshot',{key});return raw?JSON.parse(raw) as T:null}catch(error){console.error(`Falha ao carregar snapshot ${key} do SQLite.`,error);return null}
}

export async function saveDesktopSnapshot<T>(key:string,value:T):Promise<boolean>{
  if(!isDesktopMode())return true;
  try{await invoke<void>('save_snapshot',{key,valueJson:JSON.stringify(value)});return true}catch(error){console.error(`Falha ao salvar snapshot ${key} no SQLite.`,error);return false}
}

export async function loadDesktopOrders<T>():Promise<T[]|null>{
  if(!isDesktopMode())return null;
  try{return (await invoke<string[]>('load_orders')).map(raw=>JSON.parse(raw) as T)}catch(error){console.error('Falha ao carregar O.S. do SQLite.',error);return null}
}

export async function saveDesktopOrder<T>(order:T,userId?:number):Promise<boolean>{
  if(!isDesktopMode())return true;
  try{await invoke<void>('save_order',{orderJson:JSON.stringify(order),userId:userId??null});return true}catch(error){console.error('Falha ao salvar O.S. no SQLite.',error);return false}
}

export async function deleteDesktopOrder(id:number,userId?:number):Promise<boolean>{
  if(!isDesktopMode())return true;
  try{await invoke<void>('delete_order',{id,userId:userId??null});return true}catch(error){console.error('Falha ao excluir O.S. no SQLite.',error);return false}
}

export async function replaceDesktopOrders<T>(orders:T[],userId?:number):Promise<boolean>{
  if(!isDesktopMode())return true;
  try{await invoke<void>('replace_orders',{orderJsons:orders.map(x=>JSON.stringify(x)),userId:userId??null});return true}catch(error){console.error('Falha ao importar O.S. no SQLite.',error);return false}
}

export async function saveDesktopAttachment(osId:number,attachmentId:string,fileName:string,mimeType:string,dataBase64:string):Promise<string|null>{
  if(!isDesktopMode())return null;
  try{return await invoke<string>('save_attachment',{osId,attachmentId,fileName,mimeType,dataBase64})}catch(error){console.error('Falha ao salvar anexo no HD externo.',error);return null}
}

export async function readDesktopAttachment(storedPath:string,mimeType:string):Promise<string|null>{
  if(!isDesktopMode())return null;
  try{return await invoke<string>('read_attachment',{storedPath,mimeType})}catch(error){console.error('Falha ao ler anexo do HD externo.',error);return null}
}

export async function deleteDesktopAttachment(storedPath:string):Promise<boolean>{
  if(!isDesktopMode())return true;
  try{await invoke<void>('delete_attachment',{storedPath});return true}catch(error){console.error('Falha ao excluir anexo do HD externo.',error);return false}
}

export async function getDesktopDatabaseLocation():Promise<string|null>{if(!isDesktopMode())return null;try{return await invoke<string>('database_location')}catch{return null}}
export async function createDesktopBackup():Promise<string|null>{if(!isDesktopMode())return null;try{return await invoke<string>('backup_now')}catch(error){console.error('Falha ao criar backup do SQLite.',error);return null}}
