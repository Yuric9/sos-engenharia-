import { useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, PauseCircle, CheckCircle2, Clock3, Archive, Paperclip, ChevronRight } from 'lucide-react';
import { WorkOrder } from '../types';

type DashboardFilter='TODAS'|'ABERTA'|'EM_ANDAMENTO'|'PARALISADAS'|'ATENDIDA'|'ATRASADAS'|'ARQUIVADAS';

export default function Dashboard({orders,onOpen,onNew}:{orders:WorkOrder[];onOpen:(id:number)=>void;onNew:()=>void}){
 const [q,setQ]=useState('');
 const [filter,setFilter]=useState<DashboardFilter>('TODAS');
 const [monthFilter,setMonthFilter]=useState<number|null>(null);
 const now=new Date();
 const currentYear=now.getFullYear();
 const monthLabels=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
 const yearOf=(o:WorkOrder)=>o.openedAt?new Date(o.openedAt+'T12:00:00').getFullYear():0;
 const monthOf=(o:WorkOrder)=>{const d=new Date(o.openedAt+'T12:00:00');return Number.isFinite(d.getTime())?d.getMonth():-1};
 const currentYearOrders=orders.filter(o=>yearOf(o)===currentYear);
 const operational=currentYearOrders.filter(o=>!o.archived);
 const monthScopedOrders=monthFilter===null?currentYearOrders:currentYearOrders.filter(o=>monthOf(o)===monthFilter);
 const monthScopedOperational=monthScopedOrders.filter(o=>!o.archived);
 const cards:[string,number,any,DashboardFilter][]=[
  ['Abertas',monthScopedOperational.filter(x=>x.status==='ABERTA').length,Clock3,'ABERTA'],
  ['Em andamento',monthScopedOperational.filter(x=>x.status==='EM_ANDAMENTO').length,Clock3,'EM_ANDAMENTO'],
  ['Paralisadas',monthScopedOperational.filter(x=>x.status==='PARALISADA'||x.status==='AGUARDANDO_MATERIAL').length,PauseCircle,'PARALISADAS'],
  ['Atendidas',monthScopedOperational.filter(x=>x.status==='ATENDIDA').length,CheckCircle2,'ATENDIDA'],
  ['Atrasadas',monthScopedOperational.filter(x=>x.overdueDays>0).length,AlertTriangle,'ATRASADAS'],
  ['Arquivadas',monthScopedOrders.filter(x=>x.archived).length,Archive,'ARQUIVADAS']
 ];
 const visible=useMemo(()=>currentYearOrders.filter(o=>{
  const text=`${o.number} ${o.secretaria} ${o.unidade} ${o.serviceType} ${o.team} ${o.priority} ${o.importOrigin||''}`.toLowerCase();
  const search=text.includes(q.toLowerCase());
  const f=filter==='TODAS'?!o.archived:filter==='ATRASADAS'?!o.archived&&o.overdueDays>0:filter==='PARALISADAS'?!o.archived&&(o.status==='PARALISADA'||o.status==='AGUARDANDO_MATERIAL'):filter==='ARQUIVADAS'?o.archived:!o.archived&&o.status===filter;
  const month=monthFilter===null||monthOf(o)===monthFilter;
  return search&&f&&month;
 }).sort((a,b)=>b.number-a.number||b.openedAt.localeCompare(a.openedAt)||b.id-a.id),[currentYearOrders,q,filter,monthFilter]);
 const months=Array.from({length:12},(_,i)=>operational.filter(o=>monthOf(o)===i).length);
 const max=Math.max(1,...months);
 const priorityStyle=(priority:WorkOrder['priority'])=>({display:'inline-block',padding:'4px 8px',borderRadius:999,fontSize:11,fontWeight:700 as const,background:priority==='URGENTE'?'#fee2e2':priority==='ALTA'?'#ffedd5':priority==='MEDIA'?'#fef3c7':'#e0f2fe',color:priority==='URGENTE'?'#991b1b':priority==='ALTA'?'#9a3412':priority==='MEDIA'?'#92400e':'#075985'});
 const selectMonth=(index:number,count:number)=>{if(count<=0)return;setMonthFilter(current=>current===index?null:index);};
 const selectCard=(cardFilter:DashboardFilter)=>setFilter(current=>current===cardFilter?'TODAS':cardFilter);
 const periodLabel=monthFilter===null?`${currentYear}`:`${monthLabels[monthFilter]} ${currentYear}`;
 return <>
 <header className="topbar"><div><h1>Dashboard</h1><p>Visão operacional de {currentYear}. Anos anteriores permanecem no histórico arquivado.</p></div><button className="primary" onClick={onNew}><Plus size={18}/>Nova O.S.</button></header>
 <section className="cards">{cards.map(([label,value,Icon,cardFilter])=><button type="button" className={`metric dashboard-metric${filter===cardFilter?' selected':''}`} key={label} onClick={()=>selectCard(cardFilter)} title={`Mostrar ${label.toLowerCase()} de ${periodLabel}`} style={{textAlign:'left',cursor:'pointer'}}><div><span>{label}</span><strong>{value}</strong><small>{monthFilter===null?'Ano inteiro':periodLabel}</small></div><Icon size={22}/></button>)}</section>
 <section className="chart-card"><div><h2>O.S. por mês</h2><p>{monthFilter===null?`Somente O.S. operacionais de ${currentYear} • arquivadas não entram no gráfico`:`Filtro ativo: ${periodLabel} • os cards e a tabela refletem este mês`}</p></div><div className="bars">{months.map((v,i)=><button type="button" className={`bar-wrap${monthFilter===i?' selected':''}`} key={i} onClick={()=>selectMonth(i,v)} title={v>0?`Mostrar ${v} O.S. de ${monthLabels[i]} de ${currentYear}`:`Sem O.S. em ${monthLabels[i]} de ${currentYear}`} style={{background:'transparent',border:0,cursor:v>0?'pointer':'default',padding:0}}>{v>0&&<strong style={{fontSize:12}}>{v}</strong>}<div className="bar" style={{height:v>0?`${Math.max(8,(v/max)*100)}%`:'0%'}}/><small>{monthLabels[i]}</small></button>)}</div></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>{`Ordens de Serviço — ${periodLabel}`}</h2><p>{monthFilter===null?'Sem mês selecionado: cards e filtros consideram o ano inteiro.':'Mês selecionado: cards e filtros consideram somente este mês.'}</p></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, origem, secretaria, unidade..."/></div></div>
 <div className="filters">{([['TODAS','Todas ativas'],['ABERTA','Abertas'],['EM_ANDAMENTO','Em andamento'],['PARALISADAS','Paralisadas'],['ATENDIDA','Atendidas'],['ATRASADAS','Atrasadas'],['ARQUIVADAS','Arquivadas']] as [DashboardFilter,string][]).map(([v,l])=><button key={v} className={filter===v?'selected':''} onClick={()=>setFilter(v)}>{l}</button>)}{monthFilter!==null&&<button className="selected" onClick={()=>setMonthFilter(null)}>Limpar mês: {monthLabels[monthFilter]}</button>}</div>
 <div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Data</th><th>Origem</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Prioridade</th><th>Equipe</th><th>Prazo / Tempo</th><th>Situação</th><th></th></tr></thead><tbody>{visible.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)}><td><b>#{os.number}/{yearOf(os)}</b>{os.officeDocument&&<span className="sub"><Paperclip size={12}/>{os.officeDocument}</span>}</td><td>{new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td>{os.importOrigin||'Cadastro manual'}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td><span style={priorityStyle(os.priority)}>{os.priority}</span></td><td>{os.team}</td><td><b>{new Date(os.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</b><span className="sub">{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</span></td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span>{os.archived&&<span className="sub">Arquivada</span>}{!os.archived&&os.overdueDays>0&&<span className="overdue">{os.overdueDays} dias atrasada</span>}</td><td><ChevronRight size={18}/></td></tr>)}{visible.length===0&&<tr><td colSpan={10} style={{textAlign:'center',padding:28}}>Nenhuma O.S. encontrada para os filtros selecionados.</td></tr>}</tbody></table></div></section></>
}
