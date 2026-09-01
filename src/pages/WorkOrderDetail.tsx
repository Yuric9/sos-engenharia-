import { useRef } from 'react';
import { ArrowLeft, Pencil, Archive, Trash2, Printer, Share2, Plus, Camera, FileText, Clock3, Package, Users, MessageSquareText } from 'lucide-react';
import { Attachment, WorkOrder } from '../types';

export default function WorkOrderDetail({os,onBack,onEdit,onChange,onDelete}:{os:WorkOrder;onBack:()=>void;onEdit:()=>void;onChange:(os:WorkOrder)=>void;onDelete:()=>void}){
 const fileRef=useRef<HTMLInputElement>(null);
 const summary=`O.S. ${os.number} — ${os.secretaria} / ${os.unidade}\nServiço: ${os.description}\nEquipe: ${os.team}\nStatus: ${os.status.replaceAll('_',' ')}\nProgresso: ${os.progress}%\nPrazo: ${new Date(os.deadline+'T12:00:00').toLocaleDateString('pt-BR')}\nMateriais: ${os.materialsSummary||'Não informado'}`;
 const share=async()=>{try{await navigator.clipboard.writeText(summary);alert('Resumo copiado. Você pode colar no WhatsApp.')}catch{prompt('Copie o resumo:',summary)}};

 const readAttachment=(file:File)=>new Promise<Attachment>((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve({id:crypto.randomUUID(),name:file.name,type:file.type,category:file.type.startsWith('image/')?'DURANTE':'OUTRO',dataUrl:String(reader.result),createdAt:new Date().toISOString()});
  reader.onerror=()=>reject(reader.error);
  reader.readAsDataURL(file);
 });

 const addFiles=async(files:FileList|null)=>{
  if(!files)return;
  const selected=Array.from(files);
  const valid=selected.filter(file=>{
   if(file.size>900000){alert(`${file.name}: para esta base provisória, use arquivos de até 900 KB.`);return false;}
   return true;
  });
  if(valid.length===0)return;
  try{
   const added=await Promise.all(valid.map(readAttachment));
   const attachments=[...(os.attachments||[]),...added];
   onChange({...os,attachments,attachmentsCount:attachments.length});
  }catch{
   alert('Não foi possível ler um ou mais arquivos selecionados. Tente novamente.');
  }finally{
   if(fileRef.current)fileRef.current.value='';
  }
 };

 const delAttachment=(id:string)=>{if(!confirm('Excluir este anexo da O.S.?'))return;const attachments=(os.attachments||[]).filter(a=>a.id!==id);onChange({...os,attachments,attachmentsCount:attachments.length})};
 const archive=()=>onChange({...os,archived:!os.archived});
 const remove=()=>{if(confirm(`Excluir definitivamente a O.S. ${os.number}?`))onDelete()};
 return <><header className="topbar"><div className="title-row"><button className="icon-btn" onClick={onBack}><ArrowLeft size={20}/></button><div><h1>O.S. {os.number}</h1><p>{os.secretaria} • {os.unidade}{os.local?` • ${os.local}`:''}</p></div></div><div className="actions"><button onClick={onEdit}><Pencil size={16}/>Editar</button><button onClick={archive}><Archive size={16}/>{os.archived?'Restaurar':'Arquivar'}</button><button onClick={()=>window.print()}><Printer size={16}/>Imprimir</button><button onClick={share}><Share2 size={16}/>Gerar resumo</button><button className="danger" onClick={remove}><Trash2 size={16}/>Excluir</button></div></header>
 <section className="detail-hero"><div><span className={`status s-${os.status.toLowerCase()}`}>{os.status.replaceAll('_',' ')}</span><h2>{os.serviceType}</h2><p>{os.description}</p></div><div className="progress-box"><div><span>Progresso</span><strong>{os.progress}%</strong></div><div className="progress-track"><i style={{width:`${os.progress}%`}}/></div><small>{os.overdueDays>0?`Atrasada há ${os.overdueDays} dias`:'Dentro do prazo'}</small></div></section>
 <section className="detail-grid"><article><span>Data de abertura</span><strong>{new Date(os.openedAt+'T12:00:00').toLocaleDateString('pt-BR')}</strong></article><article><span>Prazo</span><strong>{new Date(os.deadline+'T12:00:00').toLocaleDateString('pt-BR')}</strong></article><article><span>Tempo previsto</span><strong>{os.estimatedAmount} {os.estimatedUnit.toLowerCase()}</strong></article><article><span>Equipe</span><strong>{os.team}</strong><small>{os.workforceOrigin}</small></article></section>
 <div className="tabs"><button className="active">Resumo</button><button>Andamentos</button><button>Fotos e arquivos</button><button>Materiais</button><button>Mão de obra</button><button>Histórico</button><button>Encerramento</button></div>
 <section className="content-grid"><article className="panel"><div className="panel-title"><h3>Informações da O.S.</h3><button onClick={onEdit}><Pencil size={15}/>Editar</button></div><dl><dt>Secretaria</dt><dd>{os.secretaria}</dd><dt>Unidade</dt><dd>{os.unidade}</dd><dt>Local</dt><dd>{os.local||'—'}</dd><dt>Ofício</dt><dd>{os.officeDocument||'Sem ofício vinculado'}</dd><dt>Prioridade</dt><dd>{os.priority}</dd><dt>Atendida</dt><dd>{os.attended?'Sim':'Não'}</dd><dt>Observações</dt><dd>{os.observations||'—'}</dd></dl></article>
 <article className="panel"><div className="panel-title"><h3>Materiais</h3><button onClick={onEdit}><Plus size={15}/>Editar</button></div><p>{os.materialsSummary||'Nenhum material informado.'}</p><div className="mini-row"><Package size={17}/><span>Registro de materiais vinculado à O.S.</span></div></article>
 <article className="panel wide"><div className="panel-title"><h3>Fotos e documentos</h3><button onClick={()=>fileRef.current?.click()}><Plus size={15}/>Anexar</button><input ref={fileRef} type="file" multiple hidden accept="image/*,.pdf,.doc,.docx" onChange={e=>addFiles(e.target.files)}/></div>
 <div className="attachment-summary">{(os.attachments||[]).length===0?<div><Camera/><strong>Nenhum anexo</strong><span>Adicione fotos, ofícios, prints ou comprovantes.</span></div>:(os.attachments||[]).map(a=><div key={a.id}>{a.type.startsWith('image/')?<img src={a.dataUrl} alt={a.name} style={{width:'100%',height:90,objectFit:'cover',borderRadius:8}}/>:<FileText/>}<strong>{a.name}</strong><span>{a.category}</span><button onClick={()=>delAttachment(a.id)} style={{marginTop:8}}>Excluir</button></div>)}</div><p className="hint">Nesta fase de teste, anexos pequenos ficam salvos no navegador. Na produção eles irão para o armazenamento do servidor.</p></article>
 <article className="panel"><div className="panel-title"><h3>Andamento</h3><button onClick={onEdit}><Plus size={15}/>Atualizar</button></div><div className="timeline"><div><Clock3/><p><b>Status atual</b><br/>{os.status.replaceAll('_',' ')} — {os.progress}% concluído.</p></div><div><MessageSquareText/><p><b>Observação</b><br/>{os.observations||'Nenhuma observação registrada.'}</p></div></div></article>
 <article className="panel"><div className="panel-title"><h3>Mão de obra</h3><button onClick={onEdit}><Plus size={15}/>Editar</button></div><div className="mini-row"><Users size={18}/><div><b>{os.team}</b><span>{os.estimatedAmount} {os.estimatedUnit.toLowerCase()} previstas • {os.workforceOrigin}</span></div></div></article></section></>
}
