import { useRef, useState } from 'react';
import { ArrowLeft, FileText, Paperclip, Save } from 'lucide-react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Attachment, WorkOrder } from '../types';
import { Catalogs } from '../lib/catalogs';
import { isDesktopMode } from '../lib/nativeDb';

GlobalWorkerOptions.workerSrc=pdfWorker;
const DESKTOP_MAX_BYTES=10*1024*1024;
const WEB_MAX_BYTES=900000;

function fileToDataUrl(file:File):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file)})}
function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim()}
function monthNumber(name:string){const m:Record<string,string>={JANEIRO:'01',FEVEREIRO:'02',MARCO:'03',ABRIL:'04',MAIO:'05',JUNHO:'06',JULHO:'07',AGOSTO:'08',SETEMBRO:'09',OUTUBRO:'10',NOVEMBRO:'11',DEZEMBRO:'12'};return m[normalize(name)]}
async function readPdfText(file:File){const data=await file.arrayBuffer();const pdf=await getDocument({data}).promise;const pages:string[]=[];for(let p=1;p<=pdf.numPages;p++){const content=await (await pdf.getPage(p)).getTextContent();pages.push(content.items.map((item:any)=>item.str||'').join(' '))}return pages.join('\n')}
function cleanExtracted(value?:string){return (value||'').replace(/\s+/g,' ').replace(/^[\s:;.-]+|[\s;.-]+$/g,'').trim()}
function extractDescription(text:string){
 const patterns=[
  /SERVI(?:C|Ç)OS?\s+A\s+SER\s+REALIZAD[OA]S?\s*[:\-]?\s*(.+?)(?=\s+(?:LOCALIZA(?:C|Ç)(?:A|Ã)O|LOCAL|MATERIAIS?|LISTA\s+DE\s+MATERIAL|ATENCIOSAMENTE|OBSERVA(?:C|Ç)(?:A|Ã)O)\s*[:\-]|$)/i,
  /DESCRI(?:C|Ç)(?:A|Ã)O(?:\s+DO\s+SERVI(?:C|Ç)O)?\s*[:\-]?\s*(.+?)(?=\s+(?:LOCALIZA(?:C|Ç)(?:A|Ã)O|LOCAL|MATERIAIS?|LISTA\s+DE\s+MATERIAL|ATENCIOSAMENTE|OBSERVA(?:C|Ç)(?:A|Ã)O)\s*[:\-]|$)/i,
  /OBJETO\s*[:\-]?\s*(.+?)(?=\s+(?:LOCALIZA(?:C|Ç)(?:A|Ã)O|LOCAL|MATERIAIS?|ATENCIOSAMENTE)\s*[:\-]|$)/i,
  /SERVI(?:C|Ç)O\s*[:\-]\s*(.+?)(?=\s+(?:LOCALIZA(?:C|Ç)(?:A|Ã)O|LOCAL|MATERIAIS?|ATENCIOSAMENTE)\s*[:\-]|$)/i
 ];
 for(const pattern of patterns){const match=text.match(pattern);const value=cleanExtracted(match?.[1]);if(value.length>=3)return value}
 return '';
}
function toIsoDate(day:string,month:string,year:string){const dd=String(Number(day)).padStart(2,'0');const mm=/^\d+$/.test(month)?String(Number(month)).padStart(2,'0'):monthNumber(month);if(!mm)return '';return `${year}-${mm}-${dd}`}
function extractOsDate(text:string){
 const labeled=[
  /(?:DATA\s+(?:DA\s+)?O\.?S\.?|DATA\s+DA\s+ORDEM\s+DE\s+SERVI(?:C|Ç)O|EMISS(?:A|Ã)O)\s*[:\-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/i,
  /(?:DATA\s+(?:DA\s+)?O\.?S\.?|DATA\s+DA\s+ORDEM\s+DE\s+SERVI(?:C|Ç)O|EMISS(?:A|Ã)O)\s*[:\-]?\s*(\d{1,2})\s+de\s+([A-Za-zÀ-ÿçÇ]+)\s+de\s+(\d{4})/i
 ];
 for(const pattern of labeled){const m=text.match(pattern);if(m){const iso=toIsoDate(m[1],m[2],m[3]);if(iso)return iso}}
 const trindade=text.match(/TRINDADE\s*[,\-]?\s*(?:GO\s*[,\-]?\s*)?(\d{1,2})\s+de\s+([A-Za-zÀ-ÿçÇ]+)\s+de\s+(\d{4})/i);if(trindade){const iso=toIsoDate(trindade[1],trindade[2],trindade[3]);if(iso)return iso}
 const dateLong=text.match(/(\d{1,2})\s+de\s+([A-Za-zÀ-ÿçÇ]+)\s+de\s+(\d{4})/i);if(dateLong){const iso=toIsoDate(dateLong[1],dateLong[2],dateLong[3]);if(iso)return iso}
 const dateShort=text.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/);if(dateShort)return toIsoDate(dateShort[1],dateShort[2],dateShort[3]);
 return '';
}

export default function WorkOrderForm({initial,number,onCancel,onSave,catalogs}:{initial?:WorkOrder;number:number;onCancel:()=>void;onSave:(os:WorkOrder)=>void;catalogs:Catalogs}){
 const [f,setF]=useState<WorkOrder>(initial??{id:Date.now(),number,openedAt:new Date().toISOString().slice(0,10),secretaria:'',unidade:'',local:'',serviceType:'',description:'',team:'Equipe Própria',workforceOrigin:'Mão de obra própria',priority:'MEDIA',deadline:new Date().toISOString().slice(0,10),estimatedAmount:1,estimatedUnit:'DIARIAS',status:'ABERTA',progress:10,attended:false,archived:false,materialsSummary:'',notesCount:0,attachmentsCount:0,officeDocument:'',overdueDays:0,observations:'',attachments:[]});
 const [readingPdf,setReadingPdf]=useState(false);const osPdfRef=useRef<HTMLInputElement>(null);const materialPdfRef=useRef<HTMLInputElement>(null);
 const set=(k:keyof WorkOrder,v:any)=>setF(x=>({...x,[k]:v}));
 const units=catalogs.unidades.filter(x=>x.active&&(!f.secretaria||x.parent===f.secretaria));
 const active=(key:keyof Catalogs)=>catalogs[key].filter(x=>x.active);
 const inputStyle={width:'100%',padding:'10px',border:'1px solid #d0d5dd',borderRadius:8,font:'inherit'};
 const addPdfAttachment=async(file:File,category:'OFICIO'|'MATERIAL')=>{
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){alert('Selecione um arquivo PDF.');return false}
  const max=isDesktopMode()?DESKTOP_MAX_BYTES:WEB_MAX_BYTES;if(file.size>max){alert(`O PDF excede o limite de ${isDesktopMode()?'10 MB':'900 KB'}.`);return false}
  const attachment:Attachment={id:crypto.randomUUID(),name:file.name,type:'application/pdf',category,dataUrl:await fileToDataUrl(file),sizeBytes:file.size,createdAt:new Date().toISOString()};
  setF(x=>{const attachments=[...(x.attachments||[]),attachment];return {...x,attachments,attachmentsCount:attachments.length}});return true;
 };
 const importOsPdf=async(file:File|null)=>{
  if(!file)return;setReadingPdf(true);
  try{
   const text=await readPdfText(file);const upper=normalize(text);const patch:Partial<WorkOrder>={};
   const osMatch=text.match(/(?:OS|O\.S\.|ORDEM\s+DE\s+SERVI(?:C|Ç)OS?)\s*(?:N[º°o.]*)?\s*[:#-]?\s*(\d+)\s*\/\s*(\d{4})/i);if(osMatch)patch.number=Number(osMatch[1]);
   const osDate=extractOsDate(text);if(osDate)patch.openedAt=osDate;
   const loc=text.match(/(?:LOCALIZA(?:C|Ç)(?:A|Ã)O|LOCAL)\s*[:\-]\s*(.+?)(?=\s+(?:ATENCIOSAMENTE|LISTA\s+DE\s+MATERIAL|MATERIAIS?|QUALQUER\s+D[ÚU]VIDA|OBSERVA(?:C|Ç)(?:A|Ã)O|$))/i);if(loc)patch.local=cleanExtracted(loc[1]);
   const description=extractDescription(text);if(description)patch.description=description;
   const svc=[['HIDRÁULICA',['ENCANADOR','HIDRAUL']],['ELÉTRICA',['ELETRIC','LAMPADA','LÂMPADA']],['PINTURA',['PINTOR','PINTURA']],['ALVENARIA',['PEDREIRO','ALVENARIA']],['CARPINTARIA',['CARPINTEIRO','MADEIRA']]].find(([,keys])=>(keys as string[]).some(k=>upper.includes(normalize(k))));if(svc)patch.serviceType=svc[0] as string;
   const secretaria=catalogs.secretarias.find(x=>x.active&&upper.includes(normalize(x.name)));if(secretaria)patch.secretaria=secretaria.name;
   const unidade=catalogs.unidades.find(x=>x.active&&upper.includes(normalize(x.name)));if(unidade){patch.unidade=unidade.name;if(!patch.local&&unidade.address)patch.local=unidade.address;if(!patch.secretaria&&unidade.parent)patch.secretaria=unidade.parent}
   const equipe=catalogs.equipes.find(x=>x.active&&upper.includes(normalize(x.name)));if(equipe){patch.team=equipe.name;patch.workforceOrigin=equipe.detail||f.workforceOrigin}
   await addPdfAttachment(file,'OFICIO');setF(x=>({...x,...patch}));
   const missingAfterRead=['openedAt','secretaria','unidade','serviceType','description'].filter(key=>key==='openedAt'?!patch.openedAt:!String((patch as any)[key]??(f as any)[key]??'').trim());
   const labels:Record<string,string>={openedAt:'Data da O.S.',secretaria:'Secretaria',unidade:'Unidade / Órgão',serviceType:'Tipo de serviço',description:'Descrição do serviço'};
   alert(missingAfterRead.length?`PDF lido. Alguns campos não foram identificados automaticamente: ${missingAfterRead.map(k=>labels[k]).join(', ')}. Confira e complete somente esses campos antes de salvar.`:`PDF lido. Data da O.S.: ${new Date(`${patch.openedAt}T12:00:00`).toLocaleDateString('pt-BR')}. Confira os demais dados antes de salvar.`);
  }catch(err){alert(`Não foi possível ler automaticamente este PDF. O arquivo não foi usado para preencher os campos. ${err instanceof Error?err.message:''}`)}finally{setReadingPdf(false);if(osPdfRef.current)osPdfRef.current.value=''}
 };
 const attachMaterialPdf=async(file:File|null)=>{if(!file)return;try{if(await addPdfAttachment(file,'MATERIAL'))alert('Lista de materiais anexada à O.S.')}catch{alert('Não foi possível anexar a lista de materiais.')}finally{if(materialPdfRef.current)materialPdfRef.current.value=''}};
 const submit=(e:any)=>{
  e.preventDefault();
  if(!Number.isInteger(f.number)||f.number<=0){alert('Informe o número da O.S.');return;}
  const missing:string[]=[];
  if(!f.openedAt.trim())missing.push('Data da O.S.');
  if(!f.secretaria.trim())missing.push('Secretaria');
  if(!f.unidade.trim())missing.push('Unidade / Órgão');
  if(!f.serviceType.trim())missing.push('Tipo de serviço');
  if(!f.description.trim())missing.push('Descrição do serviço');
  if(missing.length){alert(`Ainda falta preencher: ${missing.join(', ')}.`);return;}
  onSave(f)
 };
 const materialPdfs=(f.attachments||[]).filter(a=>a.category==='MATERIAL');const osPdfs=(f.attachments||[]).filter(a=>a.category==='OFICIO');const lastOsPdf=osPdfs.length?osPdfs[osPdfs.length-1]:undefined;
 return <><header className="topbar"><div className="title-row"><button className="icon-btn" onClick={onCancel}><ArrowLeft size={20}/></button><div><h1>{initial?'Editar':'Nova'} O.S. #{f.number||'—'}</h1><p>Cadastro completo da Ordem de Serviço</p></div></div></header><form onSubmit={submit} className="panel" style={{maxWidth:1100}}><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
 <label><span>Número da O.S.</span><input style={inputStyle} type="number" min="1" step="1" value={f.number||''} onChange={e=>set('number',Number(e.target.value))} placeholder="Informe o número da O.S."/><button type="button" style={{marginTop:8}} onClick={()=>osPdfRef.current?.click()}><FileText size={15}/>{readingPdf?' Lendo PDF...':' Carregar PDF da O.S.'}</button><input ref={osPdfRef} type="file" hidden accept="application/pdf,.pdf" onChange={e=>importOsPdf(e.target.files?.[0]||null)}/>{lastOsPdf&&<small style={{display:'block',marginTop:6}}>PDF original: {lastOsPdf.name}</small>}</label>
 <label><span>Data</span><input style={inputStyle} type="date" value={f.openedAt} onChange={e=>set('openedAt',e.target.value)}/></label>
 <label><span>Secretaria</span><select style={inputStyle} value={f.secretaria} onChange={e=>{setF(x=>({...x,secretaria:e.target.value,unidade:'',local:''}))}}><option value="">Selecione</option>{active('secretarias').map(x=><option key={x.id}>{x.name}</option>)}</select></label>
 <label><span>Unidade / Órgão</span><select style={inputStyle} value={f.unidade} onChange={e=>{const unit=catalogs.unidades.find(x=>x.name===e.target.value&&(!f.secretaria||x.parent===f.secretaria));setF(x=>({...x,unidade:e.target.value,local:unit?.address||''}))}}><option value="">Selecione</option>{units.map(x=><option key={x.id}>{x.name}</option>)}</select></label>
 <label><span>Local / Setor</span><input style={inputStyle} value={f.local||''} onChange={e=>set('local',e.target.value)} placeholder="Endereço da unidade; complemente com sala/setor se necessário"/></label>
 <label><span>Tipo de serviço</span><input style={inputStyle} value={f.serviceType} onChange={e=>set('serviceType',e.target.value)} placeholder="Elétrica, Hidráulica, Pintura..."/></label>
 <label><span>Equipe</span><select style={inputStyle} value={f.team} onChange={e=>{const team=catalogs.equipes.find(x=>x.name===e.target.value);setF(x=>({...x,team:e.target.value,workforceOrigin:team?.detail||x.workforceOrigin}))}}>{active('equipes').map(x=><option key={x.id}>{x.name}</option>)}</select></label>
 <label><span>Origem da mão de obra</span><input style={inputStyle} value={f.workforceOrigin} onChange={e=>set('workforceOrigin',e.target.value)}/></label>
 <label><span>Prazo</span><input style={inputStyle} type="date" value={f.deadline} onChange={e=>set('deadline',e.target.value)}/></label>
 <label><span>Ofício / Documento</span><input style={inputStyle} value={f.officeDocument||''} onChange={e=>set('officeDocument',e.target.value)}/></label>
 <label><span>Prioridade</span><select style={inputStyle} value={f.priority} onChange={e=>set('priority',e.target.value)}><option>BAIXA</option><option>MEDIA</option><option>ALTA</option><option>URGENTE</option></select></label>
 <label><span>Tempo previsto</span><input style={inputStyle} type="number" min="0" step="0.5" value={f.estimatedAmount} onChange={e=>set('estimatedAmount',Number(e.target.value))}/></label>
 <label><span>Unidade de tempo</span><select style={inputStyle} value={f.estimatedUnit} onChange={e=>set('estimatedUnit',e.target.value)}><option value="HORAS">Horas</option><option value="DIARIAS">Diárias</option></select></label></div>
 <label style={{display:'block',marginTop:14}}><span>Descrição do serviço</span><textarea style={{...inputStyle,minHeight:110}} value={f.description} onChange={e=>set('description',e.target.value)}/></label>
 <label style={{display:'block',marginTop:14}}><span>Materiais previstos/utilizados</span><textarea style={{...inputStyle,minHeight:80}} value={f.materialsSummary} onChange={e=>set('materialsSummary',e.target.value)} placeholder="Campo livre para observações ou materiais informados manualmente."/><button type="button" style={{marginTop:8}} onClick={()=>materialPdfRef.current?.click()}><Paperclip size={15}/> Anexar PDF da lista de materiais</button><input ref={materialPdfRef} type="file" hidden accept="application/pdf,.pdf" onChange={e=>attachMaterialPdf(e.target.files?.[0]||null)}/>{materialPdfs.map(a=><small key={a.id} style={{display:'block',marginTop:6}}>Lista anexada: {a.name}</small>)}</label>
 <label style={{display:'block',marginTop:14}}><span>Observações</span><textarea style={{...inputStyle,minHeight:80}} value={f.observations||''} onChange={e=>set('observations',e.target.value)}/></label>
 {initial&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}><label><span>Status</span><select style={inputStyle} value={f.status} onChange={e=>set('status',e.target.value)}>{['ABERTA','EM_ANDAMENTO','PARALISADA','AGUARDANDO_MATERIAL','ATENDIDA','CONCLUIDA','CANCELADA'].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Progresso (%)</span><input style={inputStyle} type="number" min="0" max="100" value={f.progress} onChange={e=>set('progress',Number(e.target.value))}/></label></div>}
 <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:20}}><button type="button" className="icon-btn" onClick={onCancel}>Cancelar</button><button className="primary" type="submit"><Save size={18}/>Salvar O.S.</button></div></form></>}
