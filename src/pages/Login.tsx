import { useState } from 'react';
import { LockKeyhole, LogIn, Building2, ShieldCheck } from 'lucide-react';
import { login, AppUser, applyPassword, loadUsers, saveUsers } from '../lib/auth';
const PREF_LOGO='/prefeitura-trindade.png';

export default function Login({onLogin}:{onLogin:(u:AppUser)=>void}){
 const [firstAccess,setFirstAccess]=useState(()=>loadUsers().length===0);
 const [name,setName]=useState('');
 const [user,setUser]=useState('');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);

 const submit=async(e:any)=>{
  e.preventDefault();setError('');setBusy(true);
  try{
   if(firstAccess){
    if(!name.trim()||!user.trim())throw new Error('Informe nome e usuário do administrador.');
    if(password!==confirmPassword)throw new Error('As senhas não conferem.');
    const admin=await applyPassword({id:Date.now(),name:name.trim(),login:user.trim(),role:'ADMIN',active:true},password);
    if(!saveUsers([admin]))throw new Error('Não foi possível criar o administrador.');
    setFirstAccess(false);setPassword('');setConfirmPassword('');
    setError('Administrador criado. Agora entre com as credenciais cadastradas.');
    return;
   }
   const result=await login(user,password);
   if(!result.user){setError(result.reason==='LOCKED'?'Acesso temporariamente bloqueado após várias tentativas. Tente novamente em 15 minutos.':'Usuário ou senha inválidos.');return}
   onLogin(result.user);
  }catch(err){setError(err instanceof Error?err.message:'Não foi possível concluir o acesso.')}finally{setBusy(false)}
 };

 return <div className="login-page"><div className="login-institution"><img src={PREF_LOGO} alt="Prefeitura de Trindade"/><div><span className="eyebrow">PREFEITURA DE TRINDADE</span><h1>Departamento de Engenharia</h1><p>Gestão institucional das ordens de manutenção predial do município.</p><div className="login-system"><Building2 size={18}/><b>S.O.S — Sistema de Ordens de Manutenção</b></div></div></div><form onSubmit={submit} className="login-card"><div className="login-lock">{firstAccess?<ShieldCheck size={21}/>:<LockKeyhole size={21}/>}</div><div><span className="eyebrow">{firstAccess?'CONFIGURAÇÃO INICIAL':'ACESSO RESTRITO'}</span><h2>{firstAccess?'Criar administrador':'Entrar no S.O.S'}</h2><p>{firstAccess?'Este equipamento ainda não possui usuário. Cadastre o primeiro administrador.':'Utilize suas credenciais para acessar o ambiente interno.'}</p></div>{firstAccess&&<label><span>Nome do administrador</span><input value={name} autoComplete="name" onChange={e=>setName(e.target.value)}/></label>}<label><span>Usuário</span><input value={user} autoComplete="username" onChange={e=>setUser(e.target.value)}/></label><label><span>Senha</span><input type="password" value={password} autoComplete={firstAccess?'new-password':'current-password'} onChange={e=>setPassword(e.target.value)}/></label>{firstAccess&&<label><span>Confirmar senha</span><input type="password" value={confirmPassword} autoComplete="new-password" onChange={e=>setConfirmPassword(e.target.value)}/></label>}{error&&<p className="login-error">{error}</p>}<button disabled={busy} className="primary login-submit"><LogIn size={18}/>{busy?'Processando...':firstAccess?'Criar administrador':'Entrar'}</button>{!firstAccess&&<p className="hint">Após 5 tentativas incorretas, o acesso fica bloqueado por 15 minutos.</p>}</form></div>
}
