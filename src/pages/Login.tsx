import { useState } from 'react';
import { LockKeyhole, LogIn, Building2 } from 'lucide-react';
import { login, AppUser } from '../lib/auth';
const PREF_LOGO='https://assets.infra.grancursosonline.com.br/projeto/prefeitura-municipal-de-trindade-go.png';
export default function Login({onLogin}:{onLogin:(u:AppUser)=>void}){
 const [user,setUser]=useState('admin'); const [password,setPassword]=useState('admin123'); const [error,setError]=useState('');
 const submit=(e:any)=>{e.preventDefault();const u=login(user,password);if(!u){setError('Usuário ou senha inválidos.');return}onLogin(u)};
 return <div className="login-page"><div className="login-institution"><img src={PREF_LOGO} alt="Prefeitura Municipal de Trindade"/><div><span className="eyebrow">PREFEITURA MUNICIPAL DE TRINDADE</span><h1>Departamento de Engenharia</h1><p>Gestão institucional das ordens de manutenção predial do município.</p><div className="login-system"><Building2 size={18}/><b>S.O.S — Sistema de Ordens de Manutenção</b></div></div></div><form onSubmit={submit} className="login-card"><div className="login-lock"><LockKeyhole size={21}/></div><div><span className="eyebrow">ACESSO RESTRITO</span><h2>Entrar no S.O.S</h2><p>Utilize suas credenciais para acessar o ambiente interno.</p></div><label><span>Usuário</span><input value={user} onChange={e=>setUser(e.target.value)}/></label><label><span>Senha</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p className="login-error">{error}</p>}<button className="primary login-submit"><LogIn size={18}/>Entrar</button><p className="hint">Ambiente de testes • Admin: admin / admin123 • Operador: operador / operador123</p></form></div>
}
