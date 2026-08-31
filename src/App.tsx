import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardPlus, FileText, Database, BarChart3, Settings, Archive, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrderForm from './pages/WorkOrderForm';
import { WorkOrder } from './types';
import { loadOrders, normalizeOrders, nextOrderNumber, saveOrders } from './lib/storage';
type View='dashboard'|'new'|'edit';
export default function App(){
 const [orders,setOrders]=useState<WorkOrder[]>(()=>normalizeOrders(loadOrders()));
 const [selected,setSelected]=useState<number|null>(null); const [view,setView]=useState<View>('dashboard');
 useEffect(()=>saveOrders(orders),[orders]);
 const current=orders.find(x=>x.id===selected);
 const goDashboard=()=>{setSelected(null);setView('dashboard')};
 const save=(os:WorkOrder)=>{setOrders(prev=>prev.some(x=>x.id===os.id)?prev.map(x=>x.id===os.id?os:x):[os,...prev]);setSelected(os.id);setView('dashboard')};
 const remove=(id:number)=>{setOrders(x=>x.filter(o=>o.id!==id));goDashboard()};
 return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">SOS</div><div><strong>S.O.S</strong><span>Ordens de Manutenção</span></div></div><nav>
 <button className={view==='dashboard'&&!selected?'active':''} onClick={goDashboard}><LayoutDashboard size={18}/>Dashboard</button>
 <button className={view==='new'?'active':''} onClick={()=>{setSelected(null);setView('new')}}><ClipboardPlus size={18}/>Nova O.S.</button>
 {[[FileText,'Ordens de Serviço'],[Database,'Cadastros'],[BarChart3,'Relatórios'],[Archive,'Arquivadas'],[Settings,'Administração']].map(([Icon,label]:any)=><button key={label} onClick={goDashboard}><Icon size={18}/>{label}</button>)}
 </nav><button className="logout"><LogOut size={18}/>Sair</button></aside><main className="main">{view==='new'?<WorkOrderForm number={nextOrderNumber(orders)} onCancel={goDashboard} onSave={save}/>:view==='edit'&&current?<WorkOrderForm initial={current} number={current.number} onCancel={()=>setView('dashboard')} onSave={save}/>:current?<WorkOrderDetail os={current} onBack={goDashboard} onEdit={()=>setView('edit')} onChange={save} onDelete={()=>remove(current.id)}/>:<Dashboard orders={orders} onOpen={id=>{setSelected(id);setView('dashboard')}} onNew={()=>setView('new')}/>}</main></div>
}
