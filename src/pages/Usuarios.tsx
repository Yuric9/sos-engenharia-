import { FormEvent, useState } from 'react';
import { Plus, Power, Trash2, X } from 'lucide-react';
import { AppUser, UserRole, UserScope, applyPassword } from '../lib/auth';

const SCOPE_LABELS:Record<UserScope,string>={EXECUTIVO:'Executivo',SAUDE:'Saúde',EDUCACAO:'Educação',GABINETE:'Gabinete do Prefeito'};

export default function Usuarios({users,onChange}:{users:AppUser[];onChange:(u:AppUser[])=>void}){
 const [editing,setEditing]=useState<AppUser|null>(null);
 const [creating,setCreating]=useState(false);
 const [name,setName]=useState('');
 const [login,setLogin]=useState('');
 const [password,setPassword]=useState('');
 const [role,setRole]=useState<UserRole>('OPERADOR');
 const [scope,setScope]=useState<UserScope>('EXECUTIVO');
 const [error,setError]=useState('');
 const [submitting,setSubmitting]=useState(false);
 const activeAdminCount=users.filter(x=>x.role==='ADMIN'&&x.active).length;
 const totalAdminCount=users.filter(x=>x.role==='ADMIN').length;

 const reset=()=>{setEditing(null);setCreating(false);setName('');setLogin('');setPassword('');setRole('OPERADOR');setScope('EXECUTIVO');setError('')};
 const beginCreate=()=>{reset();setCreating(true)};
 const beginEdit=(u:AppUser)=>{setCreating(false);setEditing(u);setName(u.name);setLogin(u.login);setPassword('');setRole(u.role);setScope(u.scope||'EXECUTIVO');setError('')};

 const submit=async(e:FormEvent)=>{
  e.preventDefault();
  if(submitting)return;
  setError('');setSubmitting(true);
  try{
   const cleanName=name.trim(), cleanLogin=login.trim();
   if(!cleanName||!cleanLogin){setError('Informe nome e login.');return}
   if(users.some(x=>x.login.toLowerCase()===cleanLogin.toLowerCase()&&x.id!==editing?.id)){setError('Este login já está em uso.');return}
   const changingToAdmin=role==='ADMIN'&&editing?.role!=='ADMIN';
   if((!editing&&role==='ADMIN'&&totalAdminCount>=2)||(editing&&changingToAdmin&&totalAdminCount>=2)){setError('O S.O.S. permite no máximo 2 perfis ADMIN.');return}
   if(editing){
    if(editing.active&&editing.role==='ADMIN'&&role!=='ADMIN'&&activeAdminCount<=1){setError('Não é possível remover o perfil do último Admin ativo.');return}
    let next:AppUser={...editing,name:cleanName,login:cleanLogin,role,scope:role==='OPERADOR'?scope:undefined};
    if(password)next=await applyPassword(next,password);
    onChange(users.map(x=>x.id===editing.id?next:x));
   }else{
    if(!password){setError('Informe uma senha inicial.');return}
    let next:AppUser={id:Date.now(),name:cleanName,login:cleanLogin,role,scope:role==='OPERADOR'?scope:undefined,active:true};
    next=await applyPassword(next,password);
    onChange([...users,next]);
   }
   reset();
  }catch(err){setError(err instanceof Error?err.message:'Não foi possível salvar o usuário.')}
  finally{setSubmitting(false)}
 };

 const toggle=(u:AppUser)=>{
  if(u.active&&u.role==='ADMIN'&&activeAdminCount<=1){alert('Não é possível inativar o último Admin ativo.');return}
  onChange(users.map(x=>x.id===u.id?{...x,active:!x.active}:x));
 };
 const remove=(u:AppUser)=>{
  if(activeAdminCount<=1&&u.role==='ADMIN'&&u.active)return alert('Não é possível excluir o último Admin ativo.');
  if(confirm(`Excluir usuário ${u.name}?`))onChange(users.filter(x=>x.id!==u.id));
 };

 return <>
  <header className="topbar"><div><h1>Usuários</h1><p>Administração de acesso ao S.O.S. • Máximo de 2 ADMINs • Operadores sem limite.</p></div><button className="primary" onClick={beginCreate}><Plus size={18}/>Novo usuário</button></header>
  {(creating||editing)&&<section className="panel" style={{marginBottom:18}}><div className="panel-title"><h3>{editing?'Editar usuário':'Novo usuário'}</h3><button onClick={reset}><X size={16}/>Cancelar</button></div><form onSubmit={submit} className="form-grid"><label><span>Nome</span><input value={name} onChange={e=>setName(e.target.value)}/></label><label><span>Login</span><input value={login} autoComplete="off" onChange={e=>setLogin(e.target.value)}/></label><label><span>{editing?'Nova senha (opcional)':'Senha inicial'}</span><input type="password" value={password} autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/></label><label><span>Perfil</span><select value={role} onChange={e=>setRole(e.target.value as UserRole)}><option value="OPERADOR">OPERADOR</option><option value="ADMIN">ADMIN</option></select></label>{role==='OPERADOR'&&<label><span>Área de acesso</span><select value={scope} onChange={e=>setScope(e.target.value as UserScope)}><option value="EXECUTIVO">Executivo</option><option value="SAUDE">Saúde</option><option value="EDUCACAO">Educação</option><option value="GABINETE">Gabinete do Prefeito — visão geral</option></select></label>}{error&&<p className="login-error">{error}</p>}<div><button className="primary" type="submit" disabled={submitting}>{submitting?'Salvando...':'Salvar usuário'}</button></div></form></section>}
  <section className="table-card"><table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Área</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.name}</b></td><td>{u.login}</td><td>{u.role}</td><td>{u.role==='ADMIN'?'Todas':SCOPE_LABELS[u.scope||'EXECUTIVO']}</td><td>{u.active?'Ativo':'Inativo'}</td><td><div className="actions"><button onClick={()=>beginEdit(u)}>Editar</button><button onClick={()=>toggle(u)}><Power size={14}/>{u.active?'Inativar':'Ativar'}</button><button className="danger" onClick={()=>remove(u)}><Trash2 size={14}/>Excluir</button></div></td></tr>)}</tbody></table></section>
 </>;
}
