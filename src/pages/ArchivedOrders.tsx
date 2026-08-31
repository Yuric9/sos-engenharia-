import { useMemo, useState } from 'react';
import { Archive, Search, ChevronRight } from 'lucide-react';
import { WorkOrder } from '../types';

export default function ArchivedOrders({orders,onOpen}:{orders:WorkOrder[];onOpen:(id:number)=>void}){
 const [q,setQ]=useState('');
 const archived=useMemo(()=>orders.filter(o=>o.archived).filter(o=>{
  const text=`${o.number} ${o.secretaria} ${o.unidade} ${o.serviceType} ${o.description} ${o.team}`.toLowerCase();
  return text.includes(q.toLowerCase());
 }),[orders,q]);
 return <><header className="topbar"><div><h1>Arquivadas</h1><p>Ordens de Serviço retiradas da operação, mantidas para consulta e histórico.</p></div></header>
 <section className="cards"><article className="metric"><div><span>Total arquivado</span><strong>{orders.filter(o=>o.archived).length}</strong></div><Archive size={22}/></article></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>Ordens de Serviço arquivadas</h2><p>Abra uma O.S. para consultar a ficha ou restaurá-la.</p></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, secretaria, unidade, serviço..."/></div></div>
 <div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Data</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Equipe</th><th>Situação</th><th></th></tr></thead><tbody>{archived.length===0?<tr><td colSpan={7} style={{textAlign:'center',padding:28}}>Nenhuma O.S. arquivada encontrada.</td></tr>:archived.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)}><td><b>#{os.number}</b></td><td>{os.openedAt?new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td>{os.team}</td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span><span className="sub">Arquivada</span></td><td><ChevronRight size={18}/></td></tr>)}</tbody></table></div></section></>
}
