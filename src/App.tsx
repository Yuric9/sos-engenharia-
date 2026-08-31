import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardPlus, FileText, Database, BarChart3, Settings, Archive, LogOut, Users, Building2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrderForm from './pages/WorkOrderForm';
import Login from './pages/Login';
import Cadastros from './pages/Cadastros';
import Usuarios from './pages/Usuarios';
import { WorkOrder } from './types';
import { loadOrders, normalizeOrders, nextOrderNumber, saveOrders } from './lib/storage';
import { AppUser, currentUser, loadUsers, logout, saveUsers } from './lib/auth';
import { Catalogs, loadCatalogs, saveCatalogs } from './lib/catalogs';
type View='dashboard'|'new'|'edit'|'cadastros'|'usuarios';
const PREF_LOGO='https://assets.infra.grancursosonline.com.br/projeto/prefeitura-municipal-de-trindade-go.png';
export default function App(){
 const [session,setSession]=useState<AppUser|null>(()=>currentUser());
 const [orders,setOrders]=useState<WorkOrder[]>(()=>normalizeOrders(loadOrders()));
 const [catalogs,setCatalogs]=useState<Catalogs>(()=>loadCatalogs());
 const [users,setUsers]=useState<AppUser[]>(()=>loadUsers());
 const [selected,setSelected]=useState<number|null>(null); const [view,setView]=useState<View>('dashboard');
 useEffect(()=>saveOrders(orders),[orders]); useEffect(()=>saveCatalogs(catalogs),[catalogs]); useEffect(()=>saveUsers(users),[users]);
 if(!session)return <Login onLogin={setSession}/>;
 const current=orders.find(x=>x.id===selected); const isAdmin=session.role==='ADMIN';
 const goDashboard=()=>{setSelected(null);setView('dashboard')};
 const save=(os:WorkOrder)=>{setOrders(prev=>prev.some(x=>x.id===os.id)?prev.map(x=>x.id===os.id?os:x):[os,...prev]);setSelected(os.id);setView('dashboard')};
 const remove=(id:number)=>{if(!isAdmin)return alert('Somente Admin pode excluir uma O.S.');setOrders(x=>x.filter(o=>o.id!==id));goDashboard()};
 const signout=()=>{logout();setSession(null)};
 return <div className="institution-shell">
   <header className="municipal-header"><div className="municipal-brand"><img src={PREF_LOGO} alt="Prefeitura Municipal de Trindade"/><div><b>Prefeitura de Trindade</b><span>Onde o Futuro acontece Hoje.</span></div></div><div className="department-title"><Building2 size={20}/><div><b>Departamento de Engenharia</b><span>S.O.S — Sistema de Ordens de Manutenção</span></div></div><div className="user-chip"><strong>{session.name}</strong><span>{session.role}</span></div></header>
   <div className="municipal-stripe"><i/><b/></div>
   <div className="app-shell"><aside className="sidebar"><div className="side-heading"><strong>S.O.S</strong><span>Gestão de manutenção predial</span></div><nav>
 <button className={view==='dashboard'&&!selected?'active':''} onClick={goDashboard}><LayoutDashboard size={18}/>Dashboard</button>
 <button className={view==='new'?'active':''} onClick={()=>{setSelected(null);setView('new')}}><ClipboardPlus size={18}/>Nova O.S.</button>
 <button onClick={goDashboard}><FileText size={18}/>Ordens de Serviço</button>
 <button className={view==='cadastros'?'active':''} onClick={()=>{setSelected(null);setView('cadastros')}}><Database size={18}/>Cadastros</button>
 <button onClick={goDashboard}><BarChart3 size={18}/>Relatórios</button>
 <button onClick={goDashboard}><Archive size={18}/>Arquivadas</button>
 {isAdmin&&<button className={view==='usuarios'?'active':''} onClick={()=>{setSelected(null);setView('usuarios')}}><Users size={18}/>Usuários</button>}
 <button onClick={goDashboard}><Settings size={18}/>Administração</button>
 </nav><button className="logout" onClick={signout}><LogOut size={18}/>Sair</button></aside><main className="main">{view==='cadastros'?<Cadastros catalogs={catalogs} onChange={setCatalogs} isAdmin={isAdmin}/>:view==='usuarios'&&isAdmin?<Usuarios users={users} onChange={setUsers}/>:view==='new'?<WorkOrderForm catalogs={catalogs} number={nextOrderNumber(orders)} onCancel={goDashboard} onSave={save}/>:view==='edit'&&current?<WorkOrderForm catalogs={catalogs} initial={current} number={current.number} onCancel={()=>setView('dashboard')} onSave={save}/>:current?<WorkOrderDetail os={current} onBack={goDashboard} onEdit={()=>setView('edit')} onChange={save} onDelete={()=>remove(current.id)}/>:<Dashboard orders={orders} onOpen={id=>{setSelected(id);setView('dashboard')}} onNew={()=>setView('new')}/>}</main></div>
   <footer className="municipal-footer"><span>Prefeitura Municipal de Trindade • Departamento de Engenharia</span><span>S.O.S — Sistema interno de Ordens de Manutenção</span></footer>
 </div>
}
