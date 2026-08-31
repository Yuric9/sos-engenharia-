import { useState } from 'react';
import { Plus, Power, Trash2 } from 'lucide-react';
import { AppUser, UserRole } from '../lib/auth';
export default function Usuarios({users,onChange}:{users:AppUser[];onChange:(u:AppUser[])=>void}){
 const [editing,setEditing]=useState<AppUser|null>(null);
 const add=()=>{const name=prompt('Nome do usuário');if(!name)return;const login=prompt('Login');if(!login)return;const password=prompt('Senha inicial');if(!password)return;const role=((prompt('Perfil: ADMIN ou OPERADOR','OPERADOR')||'OPERADOR').toUpperCase()==='ADMIN'?'ADMIN':'OPERADOR') as UserRole;onChange([...users,{id:Date.now(),name,login,password,role,active:true}])};
 const edit=(u:AppUser)=>{const name=prompt('Nome',u.name)||u.name;const login=prompt('Login',u.login)||u.login;const password=prompt('Nova senha (deixe vazio para manter)','')||u.password;const role=((prompt('Perfil: ADMIN ou OPERADOR',u.role)||u.role).toUpperCase()==='ADMIN'?'ADMIN':'OPERADOR') as UserRole;onChange(users.map(x=>x.id===u.id?{...x,name,login,password,role}:x));setEditing(null)};
 const toggle=(u:AppUser)=>onChange(users.map(x=>x.id===u.id?{...x,active:!x.active}:x));
 const remove=(u:AppUser)=>{if(users.filter(x=>x.role==='ADMIN'&&x.active).length<=1&&u.role==='ADMIN'&&u.active)return alert('Não é possível excluir o último Admin ativo.');if(confirm(`Excluir usuário ${u.name}?`))onChange(users.filter(x=>x.id!==u.id))};
 return <><header className="topbar"><div><h1>Usuários</h1><p>Administração de acesso ao S.O.S.</p></div><button className="primary" onClick={add}><Plus size={18}/>Novo usuário</button></header><section className="table-card"><table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><b>{u.name}</b></td><td>{u.login}</td><td>{u.role}</td><td>{u.active?'Ativo':'Inativo'}</td><td><div className="actions"><button onClick={()=>edit(u)}>Editar</button><button onClick={()=>toggle(u)}><Power size={14}/>{u.active?'Inativar':'Ativar'}</button><button className="danger" onClick={()=>remove(u)}><Trash2 size={14}/>Excluir</button></div></td></tr>)}</tbody></table></section></>
}
