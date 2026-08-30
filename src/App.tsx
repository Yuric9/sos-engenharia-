import { useState } from 'react';
import { LayoutDashboard, ClipboardPlus, FileText, Database, BarChart3, Settings, Archive, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import WorkOrderDetail from './pages/WorkOrderDetail';
import { workOrders } from './lib/mock';
export default function App(){
 const [selected,setSelected]=useState<number|null>(null);
 const current=workOrders.find(x=>x.id===selected);
 return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">SOS</div><div><strong>S.O.S</strong><span>Ordens de Manutenção</span></div></div><nav>
 {[[LayoutDashboard,'Dashboard'],[ClipboardPlus,'Nova O.S.'],[FileText,'Ordens de Serviço'],[Database,'Cadastros'],[BarChart3,'Relatórios'],[Archive,'Arquivadas'],[Settings,'Administração']].map(([Icon,label]:any)=><button key={label} className={label==='Dashboard'&&!selected?'active':''} onClick={()=>setSelected(null)}><Icon size={18}/>{label}</button>)}
 </nav><button className="logout"><LogOut size={18}/>Sair</button></aside><main className="main">{current?<WorkOrderDetail os={current} onBack={()=>setSelected(null)}/>:<Dashboard orders={workOrders} onOpen={setSelected}/>}</main></div>
}
