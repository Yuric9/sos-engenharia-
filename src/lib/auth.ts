export type UserRole='ADMIN'|'OPERADOR';
export interface AppUser {
  id:number;
  name:string;
  login:string;
  role:UserRole;
  active:boolean;
  passwordHash?:string;
  passwordSalt?:string;
  failedAttempts?:number;
  lockedUntil?:string|null;
}

const USERS='sos-web-users-v2';
const SESSION='sos-web-session-v2';
const ACCESS_LOG='sos-web-access-log-v1';

function bytesToHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('')}
function hexToBytes(hex:string){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}

async function derivePassword(password:string,saltHex:string):Promise<string>{
  const enc=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:hexToBytes(saltHex),iterations:210000},key,256);
  return bytesToHex(new Uint8Array(bits));
}

export async function applyPassword(user:AppUser,password:string):Promise<AppUser>{
  if(password.length<8)throw new Error('A senha deve ter pelo menos 8 caracteres.');
  const salt=new Uint8Array(16);crypto.getRandomValues(salt);
  const passwordSalt=bytesToHex(salt);
  const passwordHash=await derivePassword(password,passwordSalt);
  return {...user,passwordHash,passwordSalt,failedAttempts:0,lockedUntil:null};
}

export function loadUsers():AppUser[]{
  try{const r=localStorage.getItem(USERS);if(r){const parsed=JSON.parse(r);return Array.isArray(parsed)?parsed:[]}}catch{}
  return [];
}

export function saveUsers(v:AppUser[]):boolean{
  try{
    const clean=v.map(({id,name,login,role,active,passwordHash,passwordSalt,failedAttempts,lockedUntil})=>({id,name,login,role,active,passwordHash,passwordSalt,failedAttempts:failedAttempts||0,lockedUntil:lockedUntil||null}));
    localStorage.setItem(USERS,JSON.stringify(clean));
    return true;
  }catch(error){console.error('Não foi possível salvar os usuários.',error);return false}
}

function accessLog(userId:number|null,action:string,detail?:string){
  try{const current=JSON.parse(localStorage.getItem(ACCESS_LOG)||'[]');current.push({userId,action,detail:detail||'',at:new Date().toISOString()});localStorage.setItem(ACCESS_LOG,JSON.stringify(current.slice(-1000)))}catch{}
}

export async function login(loginName:string,password:string):Promise<{user:AppUser|null;reason?:'LOCKED'|'INVALID'}>{
  const users=loadUsers();
  const index=users.findIndex(x=>x.active&&x.login.toLowerCase()===loginName.trim().toLowerCase());
  if(index<0){accessLog(null,'LOGIN_FAIL','login inexistente');return {user:null,reason:'INVALID'}}
  const u=users[index];
  if(u.lockedUntil&&new Date(u.lockedUntil).getTime()>Date.now()){accessLog(u.id,'LOGIN_BLOCKED');return {user:null,reason:'LOCKED'}}
  if(!u.passwordHash||!u.passwordSalt){accessLog(u.id,'LOGIN_FAIL','credencial sem hash');return {user:null,reason:'INVALID'}}
  const candidate=await derivePassword(password,u.passwordSalt);
  if(candidate!==u.passwordHash){
    const failed=(u.failedAttempts||0)+1;
    const lockedUntil=failed>=5?new Date(Date.now()+15*60*1000).toISOString():null;
    users[index]={...u,failedAttempts:failed>=5?0:failed,lockedUntil};
    saveUsers(users);accessLog(u.id,'LOGIN_FAIL',lockedUntil?'bloqueado por 15 minutos':`tentativa ${failed}`);
    return {user:null,reason:lockedUntil?'LOCKED':'INVALID'};
  }
  users[index]={...u,failedAttempts:0,lockedUntil:null};saveUsers(users);
  localStorage.setItem(SESSION,JSON.stringify({id:u.id}));accessLog(u.id,'LOGIN_SUCCESS');
  return {user:users[index]};
}

export function currentUser(){try{const s=JSON.parse(localStorage.getItem(SESSION)||'null');return loadUsers().find(x=>x.id===s?.id&&x.active)||null}catch{return null}}
export function logout(){const u=currentUser();if(u)accessLog(u.id,'LOGOUT');localStorage.removeItem(SESSION)}
