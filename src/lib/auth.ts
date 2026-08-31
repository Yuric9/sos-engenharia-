export type UserRole='ADMIN'|'OPERADOR';
export interface AppUser { id:number; name:string; login:string; password:string; role:UserRole; active:boolean }
const USERS='sos-web-users-v1'; const SESSION='sos-web-session-v1';
const seed:AppUser[]=[{id:1,name:'Administrador S.O.S',login:'admin',password:'admin123',role:'ADMIN',active:true},{id:2,name:'Operador S.O.S',login:'operador',password:'operador123',role:'OPERADOR',active:true}];
export function loadUsers():AppUser[]{try{const r=localStorage.getItem(USERS);if(r)return JSON.parse(r)}catch{}localStorage.setItem(USERS,JSON.stringify(seed));return seed}
export function saveUsers(v:AppUser[]){localStorage.setItem(USERS,JSON.stringify(v))}
export function login(login:string,password:string){const u=loadUsers().find(x=>x.active&&x.login===login&&x.password===password);if(u)localStorage.setItem(SESSION,JSON.stringify({id:u.id}));return u||null}
export function currentUser(){try{const s=JSON.parse(localStorage.getItem(SESSION)||'null');return loadUsers().find(x=>x.id===s?.id&&x.active)||null}catch{return null}}
export function logout(){localStorage.removeItem(SESSION)}
