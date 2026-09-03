import { useMemo, useState } from 'react';
import { Search, ChevronRight, Paperclip, ListChecks } from 'lucide-react';
import { StatusOS, WorkOrder } from '../types';

const priorityLabels:Record<WorkOrder['priority'],string>={BAIXA:'BAIXA',MEDIA:'MÉDIA',ALTA:'ALTA',URGENTE:'URGENTE'};
const bulkStatuses:{value:StatusOS;label:string}[]=[
  {value:'ABERTA',label:'Aberta'},
  {value:'EM_ANDAMENTO',label:'Em andamento'},
  {value:'PARALISADA',label:'Paralisada'},
  {value:'AGUARDANDO_MATERIAL',label:'Aguardando material'},
  {value:'ATENDIDA',label:'Atendida'},
  {value:'CONCLUIDA',label:'Concluída'},
  {value:'CANCELADA',label:'Cancelada'},
];
const yearOf=(os:WorkOrder)=>/^\d{4}-/.test(os.openedAt)?Number(os.openedAt.slice(0,4)):0;

export default function WorkOrders({orders,onOpen,onBulkStatus}:{orders:WorkOrder[];onOpen:(id:number)=>void;onBulkStatus:(ids:number[],status:StatusOS)=>Promise<boolean>}){
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('TODAS');
  const [priority,setPriority]=useState('TODAS');
  const [bulkInput,setBulkInput]=useState('');
  const [bulkStatus,setBulkStatus]=useState<StatusOS>('CONCLUIDA');
  const [savingBulk,setSavingBulk]=useState(false);

  const visible=useMemo(()=>orders.filter(os=>{
    if(os.archived)return false;
    const text=`${os.number} ${os.secretaria} ${os.unidade} ${os.serviceType} ${os.team} ${os.priority}`.toLowerCase();
    const matchesSearch=text.includes(q.toLowerCase());
    const matchesStatus=status==='TODAS'||(status==='PARALISADAS'?(os.status==='PARALISADA'||os.status==='AGUARDANDO_MATERIAL'):os.status===status);
    const matchesPriority=priority==='TODAS'||os.priority===priority;
    return matchesSearch&&matchesStatus&&matchesPriority;
  }),[orders,q,status,priority]);

  const bulkPreview=useMemo(()=>{
    const raw=bulkInput.split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean);
    const resolved:WorkOrder[]=[];const archived:string[]=[];const missing:string[]=[];const ambiguous:string[]=[];const invalid:string[]=[];
    const seen=new Set<number>();
    for(const original of raw){
      const token=original.replace(/^#+/,'');const match=token.match(/^(\d+)(?:\/(\d{4}))?$/);
      if(!match){invalid.push(original);continue}
      const number=Number(match[1]);const year=match[2]?Number(match[2]):null;
      const sameNumber=orders.filter(o=>o.number===number&&(year===null||yearOf(o)===year));
      const active=sameNumber.filter(o=>!o.archived);
      if(active.length===1){if(!seen.has(active[0].id)){seen.add(active[0].id);resolved.push(active[0])}continue}
      if(active.length>1){ambiguous.push(original);continue}
      if(sameNumber.some(o=>o.archived)){archived.push(original);continue}
      missing.push(original);
    }
    return {resolved,archived,missing,ambiguous,invalid};
  },[bulkInput,orders]);

  const applyBulk=async()=>{
    if(!bulkPreview.resolved.length)return alert('Nenhuma O.S. ativa válida foi encontrada para alterar.');
    const label=bulkStatuses.find(x=>x.value===bulkStatus)?.label||bulkStatus;
    if(!confirm(`Alterar ${bulkPreview.resolved.length} O.S. ativa(s) para \"${label}\"?\n\nO.S. arquivadas serão ignoradas e não sofrerão alteração.`))return;
    setSavingBulk(true);
    try{const ok=await onBulkStatus(bulkPreview.resolved.map(o=>o.id),bulkStatus);if(ok){alert(`${bulkPreview.resolved.length} O.S. atualizada(s) com sucesso.`);setBulkInput('')}}finally{setSavingBulk(false)}
  };

  return <>
    <header className="topbar"><div><h1>Ordens de Serviço</h1><p>Consulta geral das O.S. ativas e em acompanhamento.</p></div></header>
    <section className="table-card" style={{marginBottom:16}}>
      <div className="table-toolbar"><div><h2 style={{display:'flex',alignItems:'center',gap:8}}><ListChecks size={20}/>Atualização em lote</h2><p>Informe várias O.S. e altere o status de uma vez. O.S. arquivadas nunca são alteradas.</p></div></div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(260px,1fr) 240px auto',gap:12,alignItems:'end',padding:'0 18px 14px'}}>
        <label style={{display:'grid',gap:6,fontWeight:700,fontSize:12}}>O.S. a alterar
          <textarea value={bulkInput} onChange={e=>setBulkInput(e.target.value)} rows={3} placeholder="#01, #04, #05 ou 132/2026" style={{resize:'vertical',padding:10,border:'1px solid #d7e0dc',borderRadius:8,font:'inherit'}}/>
        </label>
        <label style={{display:'grid',gap:6,fontWeight:700,fontSize:12}}>Novo status
          <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as StatusOS)} style={{height:42,padding:'0 10px',border:'1px solid #d7e0dc',borderRadius:8,background:'#fff'}}>{bulkStatuses.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </label>
        <button className="primary" disabled={savingBulk||!bulkPreview.resolved.length} onClick={applyBulk}>{savingBulk?'Aplicando...':'Aplicar alteração'}</button>
      </div>
      {bulkInput.trim()&&<div style={{padding:'0 18px 16px',display:'flex',flexWrap:'wrap',gap:8,fontSize:12}}>
        <span><b>{bulkPreview.resolved.length}</b> ativa(s) pronta(s)</span>
        {bulkPreview.archived.length>0&&<span style={{color:'#92400e'}}><b>{bulkPreview.archived.length}</b> arquivada(s) ignorada(s): {bulkPreview.archived.join(', ')}</span>}
        {bulkPreview.ambiguous.length>0&&<span style={{color:'#92400e'}}>Número repetido — informe o ano: {bulkPreview.ambiguous.join(', ')}</span>}
        {bulkPreview.missing.length>0&&<span style={{color:'#991b1b'}}>Não encontrada(s): {bulkPreview.missing.join(', ')}</span>}
        {bulkPreview.invalid.length>0&&<span style={{color:'#991b1b'}}>Formato inválido: {bulkPreview.invalid.join(', ')}</span>}
      </div>}
    </section>
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
