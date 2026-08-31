import { useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, PauseCircle, CheckCircle2, Clock3, Archive, Paperclip, ChevronRight } from 'lucide-react';
import { WorkOrder } from '../types';
export default function Dashboard({orders,onOpen,onNew}:{orders:WorkOrder[];onOpen:(id:number)=>void;onNew:()=>void}){
 const [q,setQ]=useState(''); const [filter,setFilter]=useState('TODAS'); const [monthFilter,setMonthFilter]=useState<number|null>(null);
 const now=new Date();
 const currentYear=now.getFullYear();
 const monthLabels=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
 const cards=[['Abertas',orders.filter(x=>x.status==='ABERTA'&&!x.archived).length,Clock3],['Em andamento',orders.filter(x=>x.status==='EM_ANDAMENTO'&&!x.archived).length,Clock3],['Paralisadas',orders.filter(x=>(x.status==='PARALISADA'||x.status==='AGUARDANDO_MATERIAL')&&!x.archived).length,PauseCircle],['Atendidas',orders.filter(x=>x.status==='ATENDIDA'&&!x.archived).length,CheckCircle2],['Atrasadas',orders.filter(x=>x.overdueDays>0&&!x.archived).length,AlertTriangle],['Arquivadas',orders.filter(x=>x.archived).length,Archive]];
 const visible=useMemo(()=>orders.filter(o=>{
  const text=`${o.number} ${o.secretaria} ${o.unidade} ${o.serviceType} ${o.team} ${o.priority}`.toLowerCase();
  const search=text.includes(q.toLowerCase());
  const f=filter==='TODAS'||(filter==='ATRASADAS'?o.overdueDays>0:filter==='PARALISADAS'?(o.status==='PARALISADA'||o.status==='AGUARDANDO_MATERIAL'):filter==='ARQUIVADAS'?o.archived:o.status===filter);
  let month=true;
  if(monthFilter!==null){if(!o.openedAt)month=false;else{const d=new Date(o.openedAt+'T12:00:00');month=Number.isFinite(d.getTime())&&d.getFullYear()===currentYear&&d.getMonth()===monthFilter;}}
  return search&&f&&month;
 }),[orders,q,filter,monthFilter,currentYear]);
 const months=Array.from({length:12},(_,i)=>orders.filter(o=>{if(!o.openedAt)return false;const d=new Date(o.openedAt+'T12:00:00');return Number.isFinite(d.getTime())&&d.getFullYear()===currentYear&&d.getMonth()===i}).length);
 const max=Math.max(1,...months);
 const priorityStyle=(priority:WorkOrder['priority'])=>({
  display:'inline-block',padding:'4px 8px',borderRadius:999,fontSize:11,fontWeight:700 as const,
  background:priority==='URGENTE'?'#fee2e2':priority==='ALTA'?'#ffedd5':priority==='MEDIA'?'#fef3c7':'#e0f2fe',
  color:priority==='URGENTE'?'#991b1b':priority==='ALTA'?'#9a3412':priority==='MEDIA'?'#92400e':'#075985'
 });
 return <><header className="topbar"><div><h1>Dashboard</h1><p>Visão operacional das Ordens de Serviço</p></div><button className="primary" onClick={onNew}><Plus size={18}/>Nova O.S.</button></header>
 <section className="cards">{cards.map(([label,value,Icon]:any)=><article className="metric" key={label}><div><span>{label}</span><strong>{value}</strong></div><Icon size={22}/></article>)}</section>
 <section className="chart-card"><div><h2>O.S. por mês</h2><p>Quantidade cadastrada em {currentYear} • clique em um mês com dados para filtrar</p></div><div className="bars">{months.map((v,i)=><button type="button" className={`bar-wrap${monthFilter===i?' selected':''}`} key={i} onClick={()=>{if(v>0)setMonthFilter(monthFilter===i?null:i)}} title={v>0?`Mostrar ${v} O.S. de ${monthLabels[i]} de ${currentYear}`:`Sem O.S. em ${monthLabels[i]} de ${currentYear}`} style={{background:'transparent',border:0,cursor:v>0?'pointer':'default',padding:0}}>{v>0&&<strong style={{fontSize:12}}>{v}</strong>}<div className="bar" style={{height:v>0?`${Math.max(8,(v/max)*100)}%`:'0%'}}/><small>{monthLabels[i]}</small></button>)}</div></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>{monthFilter===null?'Ordens de Serviço':`Ordens de Serviço — ${monthLabels[monthFilter]} ${currentYear}`}</h2><p>{monthFilter===null?'Clique em uma O.S. para abrir a ficha completa.':`Mostrando as O.S. cadastradas em ${monthLabels[monthFilter]} de ${currentYear}. Clique novamente no mês para limpar.`}</p></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, secretaria, unidade, serviço..."/></div></div>
 <div className="filters">{[['TODAS','Todas'],['ABERTA','Abertas'],['EM_ANDAMENTO','Em andamento'],['PARALISADAS','Paralisadas'],['ATENDIDA','Atendidas'],['ATRASADAS','Atrasadas'],['ARQUIVADAS','Arquivadas']].map(([v,l])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{l}</button>)}{monthFilter!==null&&<button className="selected" onClick={()=>setMonthFilter(null)}>Limpar mês: {monthLabels[monthFilter]}</button>}</div>
 <div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Data</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Prioridade</th><th>Equipe</th><th>Prazo / Tempo</th><th>Situação</th><th></th></tr></thead><tbody>{visible.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)}><td><b>#{os.number}</b>{os.officeDocument&&<span className="sub"><Paperclip size={12}/>{os.officeDocument}</span>}</td><td>{new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td><span style={priorityStyle(os.priority)}>{os.priority}</span></td><td>{os.team}</td><td><b>{new Date(os.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</b><span className="sub">{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</span></td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span>{os.archived&&<span className="sub">Arquivada</span>}{os.overdueDays>0&&<span className="overdue">{os.overdueDays} dias atrasada</span>}</td><td><ChevronRight size={18}/></td></tr>)}</tbody></table></div></section></>
}
