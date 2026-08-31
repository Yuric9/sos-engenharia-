import { useState } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { login, AppUser } from '../lib/auth';
export default function Login({onLogin}:{onLogin:(u:AppUser)=>void}){
 const [user,setUser]=useState('admin'); const [password,setPassword]=useState('admin123'); const [error,setError]=useState('');
 const submit=(e:any)=>{e.preventDefault();const u=login(user,password);if(!u){setError('Usuário ou senha inválidos.');return}onLogin(u)};
 return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#eef2f6',padding:20}}><form onSubmit={submit} className="panel" style={{width:'100%',maxWidth:420,padding:28}}><div style={{display:'flex',gap:12,alignItems:'center',marginBottom:22}}><div className="brand-mark" style={{background:'#111827',color:'#fff'}}><LockKeyhole/></div><div><h1 style={{margin:0,fontSize:24}}>S.O.S</h1><p style={{margin:'4px 0 0',color:'#667085'}}>Sistema de Ordens de Manutenção</p></div></div><label><span>Usuário</span><input value={user} onChange={e=>setUser(e.target.value)} style={field}/></label><label style={{display:'block',marginTop:14}}><span>Senha</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={field}/></label>{error&&<p style={{color:'#b42318'}}>{error}</p>}<button className="primary" style={{width:'100%',justifyContent:'center',marginTop:20}}><LogIn size={18}/>Entrar</button><p className="hint">Ambiente de teste local. Admin: admin / admin123 • Operador: operador / operador123</p></form></div>
}
const field={width:'100%',padding:'11px',border:'1px solid #d0d5dd',borderRadius:8,font:'inherit',marginTop:6};
