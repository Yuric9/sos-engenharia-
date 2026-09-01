import { useMemo, useState } from 'react';
import { Archive, Search, ChevronRight } from 'lucide-react';
import { WorkOrder } from '../types';

export default function ArchivedOrders({orders,onOpen}:{orders:WorkOrder[];onOpen:(id:number)=>void}){
 const [q,setQ]=useState(''); const [year,setYear]=useState<number|null>(null); const [origin,setOrigin]=useState('TODAS');
 const yearOf=(o:WorkOrder)=>o.openedAt?new Date(o.openedAt+'T12:00:00').getFullYear():0;
 const years=useMemo(()=>Array.from(new Set(orders.filter(o=>o.archived).map(yearOf).filter(Boolean))).sort((a,b)=>b-a),[orders]);
 const origins=useMemo(()=>Array.from(new Set(orders.filter(o=>o.archived).map(o=>o.importOrigin||'Cadastro manual'))).sort(),[orders]);
 const archived=useMemo(()=>orders.filter(o=>o.archived).filter(o=>{
  const text=`${o.number} ${o.secretaria} ${o.unidade} ${o.serviceType} ${o.description} ${o.team} ${o.importOrigin||''}`.toLowerCase();
  return text.includes(q.toLowerCase())&&(year===null||yearOf(o)===year)&&(origin==='TODAS'||(o.importOrigin||'Cadastro manual')===origin);
 }),[orders,q,year,origin]);
 return <><header className="topbar"><div><h1>Arquivadas</h1><p>Histórico de anos anteriores e O.S. retiradas da operação. Estes itens não entram nas métricas do Dashboard.</p></div></header>
 <section className="cards"><article className="metric"><div><span>Total arquivado</span><strong>{orders.filter(o=>o.archived).length}</strong></div><Archive size={22}/></article></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>Histórico arquivado</h2><p>Consulte por ano e origem sem misturar Executivo, Saúde, Educação ou outras bases.</p></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, origem, unidade, serviço..."/></div></div>
 <div className="filters"><button className={year===null?'selected':''} onClick={()=>setYear(null)}>Todos os anos</button>{years.map(y=><button key={y} className={year===y?'selected':''} onClick={()=>setYear(y)}>{y}</button>)}<select value={origin} onChange={e=>setOrigin(e.target.value)} style={{padding:'7px 11px',border:'1px solid #cddbd1',borderRadius:999}}><option value="TODAS">Todas as origens</option>{origins.map(x=><option key={x}>{x}</option>)}</select></div>
 <div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Data</th><th>Origem</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Equipe</th><th>Situação</th><th></th></tr></thead><tbody>{archived.length===0?<tr><td colSpan={8} style={{textAlign:'center',padding:28}}>Nenhuma O.S. arquivada encontrada.</td></tr>:archived.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)}><td><b>#{os.number}/{yearOf(os)}</b></td><td>{os.openedAt?new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td><td>{os.importOrigin||'Cadastro manual'}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td>{os.team}</td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span><span className="sub">Arquivada</span></td><td><ChevronRight size={18}/></td></tr>)}</tbody></table></div></section></>
}
