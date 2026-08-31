import { useMemo, useState } from 'react';
import { BarChart3, Search, Printer } from 'lucide-react';
import { WorkOrder } from '../types';

const monthLabels=['Todos','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function Reports({orders,onOpen}:{orders:WorkOrder[];onOpen:(id:number)=>void}){
  const years=useMemo(()=>{
    const values=orders.flatMap(o=>{
      if(!o.openedAt)return [];
      const d=new Date(o.openedAt+'T12:00:00');
      return Number.isFinite(d.getTime())?[d.getFullYear()]:[];
    });
    const unique=[...new Set(values)].sort((a,b)=>b-a);
    return unique.length?unique:[new Date().getFullYear()];
  },[orders]);

  const [year,setYear]=useState<number>(()=>years.includes(new Date().getFullYear())?new Date().getFullYear():years[0]);
  const [month,setMonth]=useState(0);
  const [status,setStatus]=useState('TODOS');
  const [q,setQ]=useState('');

  const filtered=useMemo(()=>orders.filter(o=>{
    if(!o.openedAt)return false;
    const d=new Date(o.openedAt+'T12:00:00');
    if(!Number.isFinite(d.getTime())||d.getFullYear()!==year)return false;
    if(month>0&&d.getMonth()!==month-1)return false;
    if(status==='ARQUIVADAS'&&!o.archived)return false;
    if(status!=='TODOS'&&status!=='ARQUIVADAS'&&o.status!==status)return false;
    const text=`${o.number} ${o.secretaria} ${o.unidade} ${o.serviceType} ${o.description} ${o.team}`.toLowerCase();
    return text.includes(q.trim().toLowerCase());
  }),[orders,year,month,status,q]);

  const active=filtered.filter(o=>!o.archived);
  const attended=filtered.filter(o=>o.status==='ATENDIDA'||o.status==='CONCLUIDA').length;
  const pending=active.filter(o=>['ABERTA','EM_ANDAMENTO','PARALISADA','AGUARDANDO_MATERIAL'].includes(o.status)).length;
  const late=active.filter(o=>o.overdueDays>0).length;

  return <>
    <header className="topbar"><div><h1>Relatórios</h1><p>Consulta e consolidação das Ordens de Serviço</p></div><button onClick={()=>window.print()}><Printer size={17}/>Imprimir</button></header>

    <section className="table-card">
      <div className="table-toolbar"><div><h2>Filtros do relatório</h2><p>Selecione o período e a situação das O.S.</p></div></div>
      <div className="filters" style={{alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <select value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))}>{monthLabels.map((m,i)=><option key={m} value={i}>{m}</option>)}</select>
        <select value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="TODOS">Todas as situações</option>
          <option value="ABERTA">Abertas</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="PARALISADA">Paralisadas</option>
          <option value="AGUARDANDO_MATERIAL">Aguardando material</option>
          <option value="ATENDIDA">Atendidas</option>
          <option value="CONCLUIDA">Concluídas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="ARQUIVADAS">Arquivadas</option>
        </select>
        <div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, secretaria, unidade, serviço..."/></div>
      </div>
    </section>

    <section className="cards">
      <article className="metric"><div><span>Total no período</span><strong>{filtered.length}</strong></div><BarChart3 size={22}/></article>
      <article className="metric"><div><span>Atendidas / concluídas</span><strong>{attended}</strong></div><BarChart3 size={22}/></article>
      <article className="metric"><div><span>Pendentes</span><strong>{pending}</strong></div><BarChart3 size={22}/></article>
      <article className="metric"><div><span>Atrasadas</span><strong>{late}</strong></div><BarChart3 size={22}/></article>
    </section>

    <section className="table-card">
      <div className="table-toolbar"><div><h2>O.S. encontradas</h2><p>{filtered.length} registro(s) no filtro selecionado.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Data</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Equipe</th><th>Status</th></tr></thead><tbody>
        {filtered.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)} style={{cursor:'pointer'}}><td><b>#{os.number}</b></td><td>{new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR')}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td>{os.team}</td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span>{os.archived&&<span className="sub">Arquivada</span>}</td></tr>)}
        {filtered.length===0&&<tr><td colSpan={6} style={{textAlign:'center',padding:28}}>Nenhuma O.S. encontrada para este filtro.</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
