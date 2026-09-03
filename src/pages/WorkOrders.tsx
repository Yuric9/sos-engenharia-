import { useMemo, useState } from 'react';
import { Search, ChevronRight, Paperclip, ListChecks, MessageSquareText, Copy, X } from 'lucide-react';
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
const fmt=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR');
const canCharge=(os:WorkOrder)=>!os.archived&&os.overdueDays>0&&!['ATENDIDA','CONCLUIDA','CANCELADA'].includes(os.status);

export default function WorkOrders({orders,onOpen,onBulkStatus,onBulkCharge}:{orders:WorkOrder[];onOpen:(id:number)=>void;onBulkStatus:(ids:number[],status:StatusOS)=>Promise<boolean>;onBulkCharge:(ids:number[],context:string)=>Promise<boolean>}){
  const [q,setQ]=useState('');
  const [status,setStatus]=useState('TODAS');
  const [priority,setPriority]=useState('TODAS');
  const [selectedIds,setSelectedIds]=useState<number[]>([]);
  const [bulkStatus,setBulkStatus]=useState<StatusOS>('CONCLUIDA');
  const [savingBulk,setSavingBulk]=useState(false);
  const [chargeOpen,setChargeOpen]=useState(false);
  const [chargeDraft,setChargeDraft]=useState('');

  const visible=useMemo(()=>orders.filter(os=>{
    if(os.archived)return false;
    const text=`${os.number} ${os.secretaria} ${os.unidade} ${os.serviceType} ${os.team} ${os.priority}`.toLowerCase();
    const matchesSearch=text.includes(q.toLowerCase());
    const matchesStatus=status==='TODAS'||(status==='PARALISADAS'?(os.status==='PARALISADA'||os.status==='AGUARDANDO_MATERIAL'):os.status===status);
    const matchesPriority=priority==='TODAS'||os.priority===priority;
    return matchesSearch&&matchesStatus&&matchesPriority;
  }),[orders,q,status,priority]);

  const selectedOrders=useMemo(()=>orders.filter(o=>selectedIds.includes(o.id)&&!o.archived),[orders,selectedIds]);
  const chargeEligible=useMemo(()=>selectedOrders.filter(canCharge).sort((a,b)=>b.overdueDays-a.overdueDays||b.number-a.number),[selectedOrders]);
  const chargeIneligible=selectedOrders.filter(o=>!canCharge(o));
  const visibleIds=visible.map(o=>o.id);
  const allVisibleSelected=visibleIds.length>0&&visibleIds.every(id=>selectedIds.includes(id));

  const toggleOne=(id:number)=>setSelectedIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const toggleVisible=()=>setSelectedIds(current=>{
    if(allVisibleSelected)return current.filter(id=>!visibleIds.includes(id));
    return [...new Set([...current,...visibleIds])];
  });
  const clearSelection=()=>{setSelectedIds([]);setChargeOpen(false)};

  const applyBulk=async()=>{
    if(!selectedOrders.length)return alert('Selecione pelo menos uma O.S. ativa.');
    const label=bulkStatuses.find(x=>x.value===bulkStatus)?.label||bulkStatus;
    if(!confirm(`Alterar ${selectedOrders.length} O.S. selecionada(s) para \"${label}\"?`))return;
    setSavingBulk(true);
    try{const ok=await onBulkStatus(selectedOrders.map(o=>o.id),bulkStatus);if(ok){alert(`${selectedOrders.length} O.S. atualizada(s) com sucesso.`);clearSelection()}}finally{setSavingBulk(false)}
  };

  const buildCharge=()=>{
    const lines=chargeEligible.map(o=>`• O.S. ${o.number}/${yearOf(o)} — ${o.serviceType} — ${o.unidade||o.secretaria} — prazo ${fmt(o.deadline)} — ${o.overdueDays} ${o.overdueDays===1?'dia':'dias'} em atraso`);
    return `COBRANÇA DE ORDENS DE SERVIÇO EM ATRASO\n\nPrezados, solicitamos atualização e justificativa referente às Ordens de Serviço abaixo:\n\n${lines.join('\n')}\n\nFavor informar a situação atual de cada serviço, eventual impedimento e a previsão para conclusão.\n\nDepartamento de Engenharia`;
  };
  const openCharge=()=>{
    if(!selectedOrders.length)return alert('Selecione as O.S. que deseja cobrar.');
    if(!chargeEligible.length)return alert('Nenhuma das O.S. selecionadas está elegível para cobrança de atraso.');
    setChargeDraft(buildCharge());setChargeOpen(true);
  };
  const copyCharge=async()=>{
    try{
      await navigator.clipboard.writeText(chargeDraft);
      const context=`Seleção manual • ${chargeEligible.length} O.S.`;
      const saved=await onBulkCharge(chargeEligible.map(o=>o.id),context);
      if(saved){alert(`Cobrança copiada e registrada em ${chargeEligible.length} O.S.`);clearSelection()}
      else alert('A mensagem foi copiada, mas o histórico não pôde ser salvo.');
    }catch{alert('Não foi possível copiar a cobrança para a área de transferência.')}
  };

  return <>
    <header className="topbar"><div><h1>Ordens de Serviço</h1><p>Selecione as O.S. que deseja atualizar ou cobrar.</p></div></header>
    <section className="table-card">
      <div className="table-toolbar"><div><h2>{visible.length} O.S.</h2><p>Use as caixas de seleção para ações em lote ou clique na linha para abrir a ficha.</p></div><div className="search"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Número, secretaria, unidade, serviço, prioridade..."/></div></div>
      <div className="filters">
        {[['TODAS','Todas'],['ABERTA','Abertas'],['EM_ANDAMENTO','Em andamento'],['PARALISADAS','Paralisadas'],['ATENDIDA','Atendidas'],['CONCLUIDA','Concluídas']].map(([v,l])=><button key={v} className={status===v?'selected':''} onClick={()=>setStatus(v)}>{l}</button>)}
      </div>
      <div className="filters">
        {[['TODAS','Todas prioridades'],['BAIXA','Baixa'],['MEDIA','Média'],['ALTA','Alta'],['URGENTE','Urgente']].map(([v,l])=><button key={v} className={priority===v?'selected':''} onClick={()=>setPriority(v)}>{l}</button>)}
      </div>

      {selectedOrders.length>0&&<div style={{margin:'4px 16px 14px',padding:'12px 14px',border:'1px solid #cfe0d6',borderRadius:12,background:'#f5faf7',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginRight:'auto'}}><ListChecks size={19}/><div><b>{selectedOrders.length} O.S. selecionada(s)</b><span className="sub">{chargeEligible.length} elegível(is) para cobrança de atraso</span></div></div>
        <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value as StatusOS)} style={{height:38,padding:'0 10px',border:'1px solid #cfdcd3',borderRadius:8,background:'#fff'}}>{bulkStatuses.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
        <button onClick={applyBulk} disabled={savingBulk}><ListChecks size={16}/>{savingBulk?'Aplicando...':'Alterar status'}</button>
        <button className="primary" onClick={openCharge} disabled={!chargeEligible.length}><MessageSquareText size={16}/>Gerar cobrança ({chargeEligible.length})</button>
        <button onClick={clearSelection}><X size={16}/>Limpar seleção</button>
      </div>}

      <div className="table-scroll"><table><thead><tr><th style={{width:42,textAlign:'center'}}><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} title="Selecionar O.S. visíveis"/></th><th>O.S.</th><th>Data</th><th>Secretaria / Unidade</th><th>Serviço</th><th>Equipe</th><th>Prioridade</th><th>Prazo / Tempo</th><th>Situação</th><th></th></tr></thead><tbody>{visible.map(os=><tr key={os.id} onClick={()=>onOpen(os.id)} style={{cursor:'pointer',background:selectedIds.includes(os.id)?'#f4faf6':undefined}}><td style={{textAlign:'center'}} onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.includes(os.id)} onChange={()=>toggleOne(os.id)} aria-label={`Selecionar O.S. ${os.number}`}/></td><td><b>#{os.number}/{yearOf(os)}</b>{os.officeDocument&&<span className="sub"><Paperclip size={12}/>{os.officeDocument}</span>}</td><td>{fmt(os.openedAt)}</td><td><b>{os.secretaria}</b><span className="sub">{os.unidade}</span></td><td><b>{os.serviceType}</b><span className="sub clamp">{os.description}</span></td><td>{os.team}</td><td><span className={`status priority-${os.priority.toLowerCase()}`}>{priorityLabels[os.priority]}</span></td><td><b>{fmt(os.deadline)}</b><span className="sub">{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</span></td><td><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span>{os.overdueDays>0&&<span className="overdue">{os.overdueDays} dias atrasada</span>}</td><td><ChevronRight size={18}/></td></tr>)}</tbody></table></div>
    </section>

    {chargeOpen&&<div className="modal-backdrop" onClick={()=>setChargeOpen(false)}><section className="modal" onClick={e=>e.stopPropagation()} style={{width:'min(780px,92vw)',maxHeight:'88vh',overflow:'auto'}}><div className="panel-title"><div><h3>Cobrança das O.S. selecionadas</h3><span className="sub">Somente O.S. ativas e realmente atrasadas entram na mensagem.</span></div><button onClick={()=>setChargeOpen(false)}><X size={17}/>Fechar</button></div><div style={{padding:'8px 0 12px'}}><b>{chargeEligible.length} O.S. entrarão na cobrança.</b>{chargeIneligible.length>0&&<p className="hint">{chargeIneligible.length} selecionada(s) não entram porque não estão em atraso ou já foram atendidas/concluídas/canceladas.</p>}</div><textarea value={chargeDraft} onChange={e=>setChargeDraft(e.target.value)} rows={Math.min(18,8+chargeEligible.length)} style={{width:'100%',resize:'vertical',minHeight:220,padding:12,border:'1px solid #cfdcd3',borderRadius:8,fontFamily:'inherit'}}/><div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:12}}><button onClick={()=>setChargeOpen(false)}>Cancelar</button><button className="primary" onClick={copyCharge}><Copy size={16}/>Copiar e registrar</button></div></section></div>}
  </>;
}
