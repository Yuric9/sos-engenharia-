import { useMemo, useState } from 'react';
import { Search, ChevronRight, Paperclip } from 'lucide-react';
import { WorkOrder } from '../types';

const priorityLabels:Record<WorkOrder['priority'],string>={BAIXA:'BAIXA',MEDIA:'MÉDIA',ALTA:'ALTA',URGENTE:'URGENTE'};

export default function WorkOrders({orders,onOpen}:{orders:WorkOrder[];onOpen:(id:number)=>void}){
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('TODAS');
  const [priority,setPriority]=useState('TODAS');

  const visible=useMemo(()=>orders.filter(os=>{
    if(os.archived)return false;
    const text=`${os.number} ${os.secretaria} ${os.unidade} ${os.serviceType} ${os.team} ${os.priority}`.toLowerCase();
    const matchesSearch=text.includes(q.toLowerCase());
    const matchesStatus=status==='TODAS'||(status==='PARALISADAS'?(os.status==='PARALISADA'||os.status==='AGUARDANDO_MATERIAL'):os.status===status);
    const matchesPriority=priority==='TODAS'||os.priority===priority;
    return matchesSearch&&matchesStatus&&matchesPriority;
  }),[orders,q,status,priority]);

  return <>
    <header className="topbar"><div><h1>Ordens de Serviço</h1><p>Consulta geral das O.S. ativas e em acompanhamento.</p></div></header>
    <section className="table-card">
      <div className="table-toolbar"><div><h2>{visible.length} O.S.</h2><p>Clique em uma O.S. para abrir a ficha completa.</p></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, secretaria, unidade, serviço, prioridade..."/></div></div>
      <div className="filters">
        {[['TODAS','Todas'],['ABERTA','Abertas'],['EM_ANDAMENTO','Em andamento'],['PARALISADAS','Paralisadas'],['ATENDIDA','Atendidas'],['CONCLUIDA','Concluídas']].map(([v,l])=><button key={v} className={status===v?'selected':''} onClick={()=>setStatus(v)}>{l}</button>)}
      </div>
      <div className="filters">
        {[['TODAS','Todas prioridades'],['BAIXA','Baixa'],['MEDIA','Média'],['ALTA','Alta'],['URGENTE','Urgente']].map(([v,l])=><button key={v} className={priority===v?'selected':''} onClick={()=>setPriority(v)}>{l}</button>)}
      </div>
      <div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Data</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Equipe</th><th>Prioridade</th><th>Prazo / Tempo</th><th>Situação</th><th></th></tr></thead><tbody>{visible.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)}><td><b>#{os.number}</b>{os.officeDocument&&<span className="sub"><Paperclip size={12}/>{os.officeDocument}</span>}</td><td>{new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td>{os.team}</td><td><span className={`status priority-${os.priority.toLowerCase()}`}>{priorityLabels[os.priority]}</span></td><td><b>{new Date(os.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</b><span className="sub">{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</span></td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span>{os.overdueDays>0&&<span className="overdue">{os.overdueDays} dias atrasada</span>}</td><td><ChevronRight size={18}/></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
