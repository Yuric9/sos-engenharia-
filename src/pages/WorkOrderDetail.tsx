import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pencil, Archive, Trash2, Printer, Share2, Plus, Camera, FileText, Clock3, Package, Users, MessageSquareText, ExternalLink } from 'lucide-react';
import { Attachment, WorkOrder } from '../types';
import { deleteDesktopAttachment, isDesktopMode, readDesktopAttachment, saveDesktopAttachment } from '../lib/nativeDb';

const DESKTOP_MAX_BYTES=10*1024*1024;
const WEB_MAX_BYTES=900000;
const ALLOWED_MIME=new Set(['image/jpeg','image/png','image/webp','image/gif','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

function fileToBase64(file:File):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>{
   const value=String(reader.result||'');
   const comma=value.indexOf(',');
   if(comma<0)return reject(new Error('Arquivo inválido'));
   resolve(value.slice(comma+1));
  };
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(file);
 });
}

function fileToDataUrl(file:File):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
 });
}

export default function WorkOrderDetail({os,onBack,onEdit,onChange,onDelete,canDelete}:{os:WorkOrder;onBack:()=>void;onEdit:()=>void;onChange:(os:WorkOrder)=>void;onDelete:()=>void;canDelete:boolean}){
 const fileRef=useRef<HTMLInputElement>(null);
 const desktop=isDesktopMode();
 const [previews,setPreviews]=useState<Record<string,string>>({});
 const summary=`O.S. ${os.number} — ${os.secretaria} / ${os.unidade}\nServiço: ${os.description}\nEquipe: ${os.team}\nStatus: ${os.status.replaceAll('_',' ')}\nProgresso: ${os.progress}%\nPrazo: ${new Date(os.deadline+'T12:00:00').toLocaleDateString('pt-BR')}\nMateriais: ${os.materialsSummary||'Não informado'}`;
 const share=async()=>{try{await navigator.clipboard.writeText(summary);alert('Resumo copiado. Você pode colar no WhatsApp.')}catch{prompt('Copie o resumo:',summary)}};

 useEffect(()=>{
  let cancelled=false;
  (async()=>{
   if(!desktop)return;
   const next:Record<string,string>={};
   for(const a of os.attachments||[]){
    if(a.dataUrl){next[a.id]=a.dataUrl;continue;}
    if(a.storedPath&&a.type.startsWith('image/')){
     const data=await readDesktopAttachment(a.storedPath,a.type);
     if(data)next[a.id]=data;
    }
   }
   if(!cancelled)setPreviews(next);
  })();
  return()=>{cancelled=true};
 },[desktop,os.attachments]);

 const createAttachment=async(file:File):Promise<Attachment|null>=>{
  if(!ALLOWED_MIME.has(file.type)){alert(`${file.name}: tipo de arquivo não permitido.`);return null;}
  const max=desktop?DESKTOP_MAX_BYTES:WEB_MAX_BYTES;
  if(file.size>max){alert(`${file.name}: limite de ${desktop?'10 MB':'900 KB'} por arquivo.`);return null;}
  const id=crypto.randomUUID();
  const category=file.type.startsWith('image/')?'DURANTE':'OUTRO';
  const createdAt=new Date().toISOString();
  if(desktop){
   const dataBase64=await fileToBase64(file);
   const storedPath=await saveDesktopAttachment(os.id,id,file.name,file.type,dataBase64);
   if(!storedPath){alert(`${file.name}: não foi possível salvar o arquivo no HD externo.`);return null;}
   return {id,name:file.name,type:file.type,category,storedPath,sizeBytes:file.size,createdAt};
  }
  return {id,name:file.name,type:file.type,category,dataUrl:await fileToDataUrl(file),sizeBytes:file.size,createdAt};
 };

 const addFiles=async(files:FileList|null)=>{
  if(!files)return;
  try{
   const created=await Promise.all(Array.from(files).map(createAttachment));
   const added=created.filter((x):x is Attachment=>Boolean(x));
   if(!added.length)return;
   const attachments=[...(os.attachments||[]),...added];
   onChange({...os,attachments,attachmentsCount:attachments.length});
  }catch{
   alert('Não foi possível processar um ou mais arquivos selecionados.');
  }finally{if(fileRef.current)fileRef.current.value='';}
 };

 const openAttachment=async(a:Attachment)=>{
  let url=a.dataUrl||null;
  if(!url&&desktop&&a.storedPath)url=await readDesktopAttachment(a.storedPath,a.type);
  if(!url){alert('Não foi possível abrir este arquivo.');return}
  const w=window.open();if(w)w.location.href=url;else alert('O navegador interno bloqueou a nova janela.');
 };
 const delAttachment=async(a:Attachment)=>{
  if(!confirm(`Excluir o arquivo "${a.name}" desta O.S.? Esta ação removerá o arquivo armazenado.`))return;
  if(desktop&&a.storedPath){
   const removed=await deleteDesktopAttachment(a.storedPath);
   if(!removed){alert('Não foi possível excluir o arquivo do HD externo.');return;}
  }
  const attachments=(os.attachments||[]).filter(x=>x.id!==a.id);
  onChange({...os,attachments,attachmentsCount:attachments.length});
 };
 const archive=()=>onChange({...os,archived:!os.archived});
 const remove=()=>{if(confirm(`Excluir definitivamente a O.S. ${os.number}?`))onDelete()};
 const materialPdfs=(os.attachments||[]).filter(a=>a.category==='MATERIAL');
 const attachmentCount=(os.attachments||[]).length;
 const fmt=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR');
 return <>
 <section className="print-os-sheet" aria-hidden="true">
   <div className="print-os-head"><div><strong>S.O.S — Sistema de Ordens de Manutenção</strong><span>Departamento de Engenharia • Prefeitura Municipal de Trindade</span></div><b>O.S. {os.number}</b></div>
   <div className="print-os-status"><span>{os.status.replaceAll('_',' ')}</span><strong>{os.serviceType}</strong><em>{os.progress}% concluído</em></div>
   <div className="print-os-grid">
    <div><label>Data de abertura</label><b>{fmt(os.openedAt)}</b></div><div><label>Prazo</label><b>{fmt(os.deadline)}</b></div><div><label>Prioridade</label><b>{os.priority}</b></div>
    <div><label>Secretaria</label><b>{os.secretaria}</b></div><div><label>Unidade / Órgão</label><b>{os.unidade}</b></div><div><label>Local / Setor</label><b>{os.local||'—'}</b></div>
    <div><label>Equipe</label><b>{os.team}</b></div><div><label>Origem da mão de obra</label><b>{os.workforceOrigin}</b></div><div><label>Tempo previsto</label><b>{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</b></div>
   </div>
   <div className="print-os-block"><label>Descrição do serviço</label><p>{os.description}</p></div>
   <div className="print-os-block"><label>Materiais previstos/utilizados</label><p>{os.materialsSummary||'Nenhum material informado.'}</p></div>
   <div className="print-os-block"><label>Observações</label><p>{os.observations||'Nenhuma observação registrada.'}</p></div>
   <div className="print-os-bottom"><span>Ofício / Documento: <b>{os.officeDocument||'—'}</b></span><span>Anexos: <b>{attachmentCount}</b></span><span>Atendida: <b>{os.attended?'Sim':'Não'}</b></span></div>
   <div className="print-os-sign"><div>Responsável pelo registro</div><div>Responsável pela execução/conferência</div></div>
 </section>
 <header className="topbar"><div className="title-row"><button className="icon-btn" onClick={onBack}><ArrowLeft size={20}/></button><div><h1>O.S. {os.number}</h1><p>{os.secretaria} • {os.unidade}{os.local?` • ${os.local}`:''}</p></div></div><div className="actions"><button onClick={onEdit}><Pencil size={16}/>Editar</button><button onClick={archive}><Archive size={16}/>{os.archived?'Restaurar':'Arquivar'}</button><button onClick={()=>window.print()}><Printer size={16}/>Imprimir</button><button onClick={share}><Share2 size={16}/>Gerar resumo</button>{canDelete&&<button className="danger" onClick={remove}><Trash2 size={16}/>Excluir</button>}</div></header>
 <section className="detail-hero"><div><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span><h2>{os.serviceType}</h2><p>{os.description}</p></div><div className="progress-box"><div><span>Progresso</span><strong>{os.progress}%</strong></div><div className="progress-track"><i style={{width:`${os.progress}%`}}/></div><small>{os.overdueDays>0?`Atrasada há ${os.overdueDays} dias`:'Dentro do prazo'}</small></div></section>
 <section className="detail-grid"><article><span>Data de abertura</span><strong>{fmt(os.openedAt)}</strong></article><article><span>Prazo</span><strong>{fmt(os.deadline)}</strong></article><article><span>Tempo previsto</span><strong>{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</strong></article><article><span>Equipe</span><strong>{os.team}</strong><small>{os.workforceOrigin}</small></article></section>
 <div className="tabs"><button className="active">Resumo</button><button>Andamentos</button><button>Fotos e arquivos</button><button>Materiais</button><button>Mão de obra</button><button>Histórico</button><button>Encerramento</button></div>
 <section className="content-grid"><article className="panel"><div className="panel-title"><h3>Informações da O.S.</h3><button onClick={onEdit}><Pencil size={15}/>Editar</button></div><dl><dt>Secretaria</dt><dd>{os.secretaria}</dd><dt>Unidade</dt><dd>{os.unidade}</dd><dt>Local</dt><dd>{os.local||'—'}</dd><dt>Ofício</dt><dd>{os.officeDocument||'Sem ofício vinculado'}</dd><dt>Prioridade</dt><dd>{os.priority}</dd><dt>Atendida</dt><dd>{os.attended?'Sim':'Não'}</dd><dt>Observações</dt><dd>{os.observations||'—'}</dd></dl></article>
 <article className="panel"><div className="panel-title"><h3>Materiais</h3><button onClick={onEdit}><Plus size={15}/>Editar</button></div><p>{os.materialsSummary||'Nenhum material informado.'}</p>{materialPdfs.map(a=><div className="mini-row" key={a.id}><FileText size={17}/><div><b>{a.name}</b><span>Lista de materiais em PDF</span></div><button onClick={()=>openAttachment(a)}><ExternalLink size={14}/>Abrir</button><button onClick={()=>delAttachment(a)}><Trash2 size={14}/>Excluir</button></div>)}<div className="mini-row"><Package size={17}/><span>Registro de materiais vinculado à O.S.</span></div></article>
 <article className="panel wide"><div className="panel-title"><h3>Fotos e documentos</h3><button onClick={()=>fileRef.current?.click()}><Plus size={15}/>Anexar</button><input ref={fileRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx" onChange={e=>addFiles(e.target.files)}/></div>
 <div className="attachment-summary">{(os.attachments||[]).length===0?<div><Camera/><strong>Nenhum anexo</strong><span>Adicione fotos, ofícios, prints ou comprovantes.</span></div>:(os.attachments||[]).map(a=><div key={a.id}>{a.type.startsWith('image/')&&(a.dataUrl||previews[a.id])?<img src={a.dataUrl||previews[a.id]} alt={a.name} onClick={()=>openAttachment(a)} style={{width:'100%',height:90,objectFit:'cover',borderRadius:8,cursor:'pointer'}}/>:<FileText/>}<strong>{a.name}</strong><span>{a.category}{a.sizeBytes?` • ${(a.sizeBytes/1024).toFixed(0)} KB`:''}</span><div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}><button onClick={()=>openAttachment(a)}><ExternalLink size={14}/>Abrir</button><button onClick={()=>delAttachment(a)}><Trash2 size={14}/>Excluir</button></div></div>)}</div><p className="hint">{desktop?'Os anexos desta versão são gravados fisicamente na pasta sos-data/anexos do HD externo.':'Na versão web, anexos pequenos permanecem no armazenamento local para compatibilidade.'}</p></article>
 <article className="panel"><div className="panel-title"><h3>Andamento</h3><button onClick={onEdit}><Plus size={15}/>Atualizar</button></div><div className="timeline"><div><Clock3/><p><b>Status atual</b><br/>{os.status.replaceAll('_',' ')} — {os.progress}% concluído.</p></div><div><MessageSquareText/><p><b>Observação</b><br/>{os.observations||'Nenhuma observação registrada.'}</p></div></div></article>
 <article className="panel"><div className="panel-title"><h3>Mão de obra</h3><button onClick={onEdit}><Plus size={15}/>Editar</button></div><div className="mini-row"><Users size={18}/><div><b>{os.team}</b><span>{os.estimatedAmount} {os.estimatedUnit.toLowerCase()} previstas • {os.workforceOrigin}</span></div></div></article></section></>
}
