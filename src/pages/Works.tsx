import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, CirclePause, Clock3, HardHat, Plus, Ruler, Save, WalletCards } from 'lucide-react';
import { isDesktopMode, loadDesktopSnapshot, saveDesktopSnapshot, SNAPSHOT_WORKS } from '../lib/nativeDb';

type WorkStatus='NAO_INICIADA'|'EM_ANDAMENTO'|'PARALISADA'|'ATRASADA'|'CONCLUIDA'|'CANCELADA';
type WorkArea='EXECUTIVO'|'SAUDE'|'EDUCACAO'|'OUTRA';
type MeasurementStatus='RASCUNHO'|'APROVADA'|'PAGA'|'CANCELADA';
interface Measurement{id:number;number:number;date:string;period:string;value:number;status:MeasurementStatus;paid:boolean;paidAt?:string;notes?:string}
interface WorkRecord{
 id:number;name:string;area:WorkArea;secretaria:string;location:string;address:string;object:string;
 company:string;cnpj:string;contractNumber:string;processNumber:string;procurementMode:string;
 originalValue:number;updatedValue:number;startDate:string;expectedEndDate:string;technicalResponsible:string;
 professionalRegistry:string;inspector:string;status:WorkStatus;physicalProgress:number;measurements:Measurement[];
 createdAt:string;updatedAt:string;
}

const STORAGE='sos-works-v1';
const STATUS_LABELS:Record<WorkStatus,string>={NAO_INICIADA:'Não iniciada',EM_ANDAMENTO:'Em andamento',PARALISADA:'Paralisada',ATRASADA:'Atrasada',CONCLUIDA:'Concluída',CANCELADA:'Cancelada'};
const AREA_LABELS:Record<WorkArea,string>={EXECUTIVO:'Executivo',SAUDE:'Saúde',EDUCACAO:'Educação',OUTRA:'Outra'};
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const today=()=>new Date().toISOString().slice(0,10);
function loadLocal():WorkRecord[]{try{const raw=localStorage.getItem(STORAGE);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[]}catch{return []}}
function saveLocal(items:WorkRecord[]){try{localStorage.setItem(STORAGE,JSON.stringify(items));return true}catch{return false}}
function blankWork():WorkRecord{return {id:Date.now(),name:'',area:'EXECUTIVO',secretaria:'',location:'',address:'',object:'',company:'',cnpj:'',contractNumber:'',processNumber:'',procurementMode:'',originalValue:0,updatedValue:0,startDate:today(),expectedEndDate:'',technicalResponsible:'',professionalRegistry:'',inspector:'',status:'NAO_INICIADA',physicalProgress:0,measurements:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}

export default function Works({isAdmin}:{isAdmin:boolean}){
  const desktop=isDesktopMode();
  const [works,setWorks]=useState<WorkRecord[]>(()=>loadLocal());
  const [selected,setSelected]=useState<number|null>(null);
  const [editing,setEditing]=useState<WorkRecord|null>(null);
  const [newMeasurement,setNewMeasurement]=useState(false);

  useEffect(()=>{if(!desktop)return;let cancelled=false;(async()=>{const saved=await loadDesktopSnapshot<WorkRecord[]>(SNAPSHOT_WORKS);if(cancelled)return;if(saved){setWorks(saved);saveLocal(saved)}else if(works.length)await saveDesktopSnapshot(SNAPSHOT_WORKS,works)})();return()=>{cancelled=true}},[]);
  const persist=async(next:WorkRecord[])=>{if(desktop&&!await saveDesktopSnapshot(SNAPSHOT_WORKS,next)){alert('Não foi possível salvar as obras no banco SQLite do HD externo.');return false}if(!saveLocal(next)){alert('Não foi possível atualizar o armazenamento local de apoio.');return false}setWorks(next);return true};

  const metrics=useMemo(()=>[
    ['Obras cadastradas',works.length,Building2],
    ['Em andamento',works.filter(x=>x.status==='EM_ANDAMENTO').length,HardHat],
    ['Paralisadas',works.filter(x=>x.status==='PARALISADA').length,CirclePause],
    ['Atrasadas',works.filter(x=>x.status==='ATRASADA').length,Clock3],
    ['Concluídas',works.filter(x=>x.status==='CONCLUIDA').length,Ruler],
    ['Medições realizadas',works.reduce((s,w)=>s+w.measurements.length,0),WalletCards],
  ] as const,[works]);
  const current=works.find(x=>x.id===selected)||null;

  if(editing)return <WorkForm initial={editing} onCancel={()=>setEditing(null)} onSave={async item=>{const exists=works.some(x=>x.id===item.id);const next=exists?works.map(x=>x.id===item.id?item:x):[item,...works];if(await persist(next)){setEditing(null);setSelected(item.id)}}}/>;
  if(current)return <WorkDetail work={current} isAdmin={isAdmin} onBack={()=>setSelected(null)} onEdit={()=>setEditing({...current})} newMeasurement={newMeasurement} setNewMeasurement={setNewMeasurement} onSave={async item=>{if(await persist(works.map(x=>x.id===item.id?item:x)))setSelected(item.id)}}/>;

  return <>
    <header className="topbar"><div><h1>Obras</h1><p>Acompanhamento de obras de engenharia, contratos, projetos, medições e execução.</p></div>{isAdmin&&<button className="primary" type="button" onClick={()=>setEditing(blankWork())}><Plus size={18}/>Nova obra</button>}</header>
    <section className="cards">{metrics.map(([label,value,Icon])=><article className="metric" key={label}><div><span>{label}</span><strong>{value}</strong></div><Icon size={22}/></article>)}</section>
    <section className="table-card"><div className="table-toolbar"><div><h2>Obras cadastradas</h2><p>Todos os usuários podem consultar. Somente ADMIN pode cadastrar ou alterar dados.</p></div></div>
      {works.length===0?<div style={{padding:32,textAlign:'center'}}><HardHat size={34} style={{marginBottom:10,opacity:.55}}/><h3 style={{margin:'0 0 6px'}}>Nenhuma obra cadastrada</h3><p style={{margin:0}}>Cadastre a primeira obra para iniciar o acompanhamento.</p></div>:
      <table><thead><tr><th>Obra</th><th>Área</th><th>Empresa</th><th>Contrato</th><th>Status</th><th>Avanço físico</th><th>Medições</th></tr></thead><tbody>{works.map(w=><tr key={w.id} style={{cursor:'pointer'}} onClick={()=>setSelected(w.id)}><td><b>{w.name}</b><div style={{fontSize:12,opacity:.7}}>{w.location}</div></td><td>{AREA_LABELS[w.area]}</td><td>{w.company||'—'}</td><td>{w.contractNumber||'—'}</td><td>{STATUS_LABELS[w.status]}</td><td>{w.physicalProgress}%</td><td>{w.measurements.length}</td></tr>)}</tbody></table>}
    </section>
  </>;
}

function WorkForm({initial,onCancel,onSave}:{initial:WorkRecord;onCancel:()=>void;onSave:(w:WorkRecord)=>void}){
 const [f,setF]=useState<WorkRecord>(initial);const set=(k:keyof WorkRecord,v:any)=>setF(x=>({...x,[k]:v}));
 const submit=(e:FormEvent)=>{e.preventDefault();const missing:string[]=[];if(!f.name.trim())missing.push('Nome da obra');if(!f.location.trim())missing.push('Local');if(!f.company.trim())missing.push('Empresa contratada');if(!f.contractNumber.trim())missing.push('Número do contrato');if(!f.object.trim())missing.push('Objeto/descrição');if(missing.length){alert(`Ainda falta preencher: ${missing.join(', ')}.`);return}const updatedValue=f.updatedValue>0?f.updatedValue:f.originalValue;onSave({...f,updatedValue,updatedAt:new Date().toISOString()})};
 return <><header className="topbar"><div className="title-row"><button className="icon-btn" onClick={onCancel}><ArrowLeft size={20}/></button><div><h1>{initial.name?'Editar obra':'Nova obra'}</h1><p>Cadastro de obra de engenharia e contratação.</p></div></div></header><form className="panel" onSubmit={submit}><div className="form-grid">
 <label><span>Nome da obra</span><input value={f.name} onChange={e=>set('name',e.target.value)}/></label><label><span>Área</span><select value={f.area} onChange={e=>set('area',e.target.value as WorkArea)}><option value="EXECUTIVO">Executivo</option><option value="SAUDE">Saúde</option><option value="EDUCACAO">Educação</option><option value="OUTRA">Outra</option></select></label><label><span>Secretaria</span><input value={f.secretaria} onChange={e=>set('secretaria',e.target.value)}/></label>
 <label><span>Local / Unidade</span><input value={f.location} onChange={e=>set('location',e.target.value)}/></label><label><span>Endereço</span><input value={f.address} onChange={e=>set('address',e.target.value)}/></label><label><span>Empresa contratada</span><input value={f.company} onChange={e=>set('company',e.target.value)}/></label>
 <label><span>CNPJ</span><input value={f.cnpj} onChange={e=>set('cnpj',e.target.value)}/></label><label><span>Número do contrato</span><input value={f.contractNumber} onChange={e=>set('contractNumber',e.target.value)}/></label><label><span>Processo / Licitação</span><input value={f.processNumber} onChange={e=>set('processNumber',e.target.value)}/></label>
 <label><span>Modalidade</span><input value={f.procurementMode} onChange={e=>set('procurementMode',e.target.value)}/></label><label><span>Valor original</span><input type="number" min="0" step="0.01" value={f.originalValue} onChange={e=>set('originalValue',Number(e.target.value))}/></label><label><span>Valor contratual atualizado</span><input type="number" min="0" step="0.01" value={f.updatedValue} onChange={e=>set('updatedValue',Number(e.target.value))}/></label>
 <label><span>Início</span><input type="date" value={f.startDate} onChange={e=>set('startDate',e.target.value)}/></label><label><span>Previsão de término</span><input type="date" value={f.expectedEndDate} onChange={e=>set('expectedEndDate',e.target.value)}/></label><label><span>Status</span><select value={f.status} onChange={e=>set('status',e.target.value as WorkStatus)}>{Object.entries(STATUS_LABELS).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
 <label><span>Avanço físico (%)</span><input type="number" min="0" max="100" value={f.physicalProgress} onChange={e=>set('physicalProgress',Math.max(0,Math.min(100,Number(e.target.value))))}/></label><label><span>Responsável técnico</span><input value={f.technicalResponsible} onChange={e=>set('technicalResponsible',e.target.value)}/></label><label><span>CREA / CAU</span><input value={f.professionalRegistry} onChange={e=>set('professionalRegistry',e.target.value)}/></label><label><span>Fiscal da obra</span><input value={f.inspector} onChange={e=>set('inspector',e.target.value)}/></label></div>
 <label style={{display:'block',marginTop:14}}><span>Objeto / descrição da obra</span><textarea value={f.object} onChange={e=>set('object',e.target.value)} style={{minHeight:110}}/></label><div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:18}}><button type="button" onClick={onCancel}>Cancelar</button><button className="primary" type="submit"><Save size={18}/>Salvar obra</button></div></form></>;
}

function WorkDetail({work,isAdmin,onBack,onEdit,newMeasurement,setNewMeasurement,onSave}:{work:WorkRecord;isAdmin:boolean;onBack:()=>void;onEdit:()=>void;newMeasurement:boolean;setNewMeasurement:(v:boolean)=>void;onSave:(w:WorkRecord)=>void}){
 const paid=work.measurements.filter(m=>m.paid&&m.status!=='CANCELADA');const totalPaid=paid.reduce((s,m)=>s+m.value,0);const base=work.updatedValue||work.originalValue;const paidPercent=base>0?Math.min(100,(totalPaid/base)*100):0;
 return <><header className="topbar"><div className="title-row"><button className="icon-btn" onClick={onBack}><ArrowLeft size={20}/></button><div><h1>{work.name}</h1><p>{AREA_LABELS[work.area]} • Contrato {work.contractNumber||'—'}</p></div></div>{isAdmin&&<div style={{display:'flex',gap:8}}><button onClick={onEdit}>Editar obra</button><button className="primary" onClick={()=>setNewMeasurement(true)}><Plus size={18}/>Nova medição</button></div>}</header>
 <section className="cards"><article className="metric"><div><span>Status</span><strong style={{fontSize:20}}>{STATUS_LABELS[work.status]}</strong></div><HardHat size={22}/></article><article className="metric"><div><span>Avanço físico</span><strong>{work.physicalProgress}%</strong></div><Ruler size={22}/></article><article className="metric"><div><span>Medições</span><strong>{work.measurements.length}</strong></div><WalletCards size={22}/></article><article className="metric"><div><span>Medições pagas</span><strong>{paid.length}</strong></div><WalletCards size={22}/></article></section>
 <section className="chart-card"><div><h2>Resumo financeiro da obra</h2><p>Indicadores financeiros exclusivos desta obra.</p></div><div className="cards" style={{marginTop:16}}><article className="metric"><div><span>Valor contratual</span><strong>{money.format(base)}</strong></div></article><article className="metric"><div><span>Total pago</span><strong>{money.format(totalPaid)}</strong></div></article><article className="metric"><div><span>Percentual pago</span><strong>{paidPercent.toFixed(1)}%</strong></div></article><article className="metric"><div><span>Execução física</span><strong>{work.physicalProgress}%</strong></div></article></div></section>
 <section className="detail-grid"><article className="panel"><h3>Dados da obra</h3><p><b>Empresa:</b> {work.company}</p><p><b>CNPJ:</b> {work.cnpj||'—'}</p><p><b>Processo:</b> {work.processNumber||'—'}</p><p><b>Modalidade:</b> {work.procurementMode||'—'}</p><p><b>Local:</b> {work.location}</p><p><b>Endereço:</b> {work.address||'—'}</p><p><b>Responsável técnico:</b> {work.technicalResponsible||'—'} {work.professionalRegistry?`• ${work.professionalRegistry}`:''}</p><p><b>Fiscal:</b> {work.inspector||'—'}</p><p><b>Objeto:</b> {work.object}</p></article><article className="panel"><h3>Prazos</h3><p><b>Início:</b> {work.startDate||'—'}</p><p><b>Previsão de término:</b> {work.expectedEndDate||'—'}</p><p><b>Valor original:</b> {money.format(work.originalValue)}</p><p><b>Valor atualizado:</b> {money.format(base)}</p></article></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>Medições</h2><p>Somente medições marcadas como pagas entram no percentual pago.</p></div></div>{work.measurements.length===0?<div style={{padding:24}}>Nenhuma medição cadastrada.</div>:<table><thead><tr><th>Nº</th><th>Data</th><th>Período</th><th>Valor</th><th>Status</th><th>Pagamento</th></tr></thead><tbody>{work.measurements.map(m=><tr key={m.id}><td>{m.number}</td><td>{m.date}</td><td>{m.period||'—'}</td><td>{money.format(m.value)}</td><td>{m.status}</td><td>{m.paid?`Paga${m.paidAt?` em ${m.paidAt}`:''}`:'Aguardando pagamento'}</td></tr>)}</tbody></table>}</section>
 {newMeasurement&&isAdmin&&<MeasurementForm onCancel={()=>setNewMeasurement(false)} onSave={m=>{onSave({...work,measurements:[...work.measurements,m],updatedAt:new Date().toISOString()});setNewMeasurement(false)}}/>}</>;
}

function MeasurementForm({onCancel,onSave}:{onCancel:()=>void;onSave:(m:Measurement)=>void}){
 const [m,setM]=useState<Measurement>({id:Date.now(),number:1,date:today(),period:'',value:0,status:'RASCUNHO',paid:false,paidAt:'',notes:''});const set=(k:keyof Measurement,v:any)=>setM(x=>({...x,[k]:v}));
 const submit=(e:FormEvent)=>{e.preventDefault();if(m.number<=0||m.value<=0){alert('Informe número e valor válidos para a medição.');return}onSave({...m,status:m.paid?'PAGA':m.status,paidAt:m.paid?(m.paidAt||today()):''})};
 return <section className="panel" style={{marginTop:18}}><div className="panel-title"><h3>Nova medição</h3><button onClick={onCancel}>Cancelar</button></div><form onSubmit={submit} className="form-grid"><label><span>Número</span><input type="number" min="1" value={m.number} onChange={e=>set('number',Number(e.target.value))}/></label><label><span>Data</span><input type="date" value={m.date} onChange={e=>set('date',e.target.value)}/></label><label><span>Período</span><input value={m.period} onChange={e=>set('period',e.target.value)} placeholder="Ex.: agosto/2026"/></label><label><span>Valor da medição</span><input type="number" min="0" step="0.01" value={m.value} onChange={e=>set('value',Number(e.target.value))}/></label><label><span>Status</span><select value={m.status} onChange={e=>set('status',e.target.value as MeasurementStatus)}><option value="RASCUNHO">Rascunho</option><option value="APROVADA">Aprovada</option><option value="PAGA">Paga</option><option value="CANCELADA">Cancelada</option></select></label><label><span>Pagamento</span><select value={m.paid?'SIM':'NAO'} onChange={e=>set('paid',e.target.value==='SIM')}><option value="NAO">Aguardando pagamento</option><option value="SIM">Paga</option></select></label>{m.paid&&<label><span>Data do pagamento</span><input type="date" value={m.paidAt||''} onChange={e=>set('paidAt',e.target.value)}/></label>}<div><button className="primary" type="submit"><Save size={18}/>Salvar medição</button></div></form></section>;
}
