import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Priority, StatusOS, WorkOrder } from '../types';

type Parsed={order:WorkOrder;sheet:string;row:number;warnings:string[];duplicate:boolean};
type Props={orders:WorkOrder[];onImport:(items:WorkOrder[])=>Promise<boolean>};

const norm=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const text=(v:unknown)=>String(v??'').trim();
const yearOf=(v:string)=>/^\d{4}-/.test(v)?Number(v.slice(0,4)):0;

const aliases={
 number:['numero da os','numero os','n os','n o s','os','o s','ordem de servico','ordem servico','numero da ordem de servico','n ordem','os numero'],
 date:['data','data da os','data os','data de abertura','abertura','data da ordem de servico','data solicitacao','data da solicitacao','emissao','data emissao'],
 secretaria:['secretaria','secretaria solicitante','sec','orgao solicitante'],
 unidade:['unidade','orgao','unidade orgao','local da unidade','predio','localidade'],
 local:['local','setor','endereco','local setor','local do servico','local servico'],
 service:['tipo de servico','tipo servico','categoria','servico','especialidade','profissional','mao de obra'],
 description:['descricao','descricao do servico','solicitacao','objeto','observacao do servico','servico solicitado','demanda','descricao solicitacao'],
 team:['equipe','empresa','prestador','contratada','responsavel','executor'],
 deadline:['prazo','data limite','previsao','previsao conclusao','data prevista','termino previsto'],
 status:['status','situacao','andamento','situacao os'],
 priority:['prioridade'],
 time:['tempo previsto','quantidade de diarias','diarias','horas','tempo estimado'],
 timeUnit:['unidade de tempo','unidade tempo'],
 materials:['materiais','material','materiais previstos utilizados','lista de materiais'],
 office:['oficio','documento','oficio documento','memorando'],
 notes:['observacoes','observacao','obs']
};

const allHeaderTerms=Object.values(aliases).flat().map(norm);
function headerScore(row:unknown[]){
 const cells=row.map(norm).filter(Boolean);let score=0;
 for(const c of cells){if(allHeaderTerms.some(a=>c===a||c.includes(a)||a.includes(c)))score++}
 const hasNumber=cells.some(c=>aliases.number.map(norm).some(a=>c===a||c.includes(a)||a.includes(c)));
 const hasDate=cells.some(c=>aliases.date.map(norm).some(a=>c===a||c.includes(a)||a.includes(c)));
 return score+(hasNumber?3:0)+(hasDate?3:0);
}
function rowsFromSheet(ws:XLSX.WorkSheet){
 const matrix=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:'',raw:false});
 if(!matrix.length)return {rows:[] as Record<string,unknown>[],headerRow:0};
 let best=0,bestScore=-1;
 for(let i=0;i<Math.min(matrix.length,40);i++){const s=headerScore(matrix[i]||[]);if(s>bestScore){bestScore=s;best=i}}
 if(bestScore<3)best=0;
 const headers=(matrix[best]||[]).map((v,i)=>text(v)||`coluna_${i+1}`);
 const rows:Record<string,unknown>[]=[];
 for(let r=best+1;r<matrix.length;r++){
  const values=matrix[r]||[];if(!values.some(v=>text(v)))continue;
  const obj:Record<string,unknown>={};headers.forEach((h,i)=>obj[h]=values[i]??'');rows.push(obj);
 }
 return {rows,headerRow:best+1};
}
function pick(row:Record<string,unknown>,names:string[]){
 const entries=Object.entries(row),wanted=names.map(norm);
 for(const [k,v] of entries){const nk=norm(k);if(wanted.includes(nk))return v}
 for(const [k,v] of entries){const nk=norm(k);if(wanted.some(w=>nk.includes(w)||w.includes(nk)))return v}
 return '';
}
function parseNumber(v:unknown){const s=text(v);const m=s.match(/(?:^|\D)(\d{1,6})(?:\s*[\/.-]\s*20\d{2})?(?:\D|$)/);return m?Number(m[1]):0}
function parseDate(v:unknown){
 if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
 const s=text(v);if(!s)return '';
 let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);if(m){const y=m[3].length===2?`20${m[3]}`:m[3];return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`}
 m=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
 const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}
function parseStatus(v:unknown):StatusOS{const s=norm(v);if(s.includes('cancel'))return'CANCELADA';if(s.includes('conclu')||s.includes('finaliz'))return'CONCLUIDA';if(s.includes('atendid'))return'ATENDIDA';if(s.includes('aguard')&&s.includes('material'))return'AGUARDANDO_MATERIAL';if(s.includes('paralis'))return'PARALISADA';if(s.includes('andamento')||s.includes('execu'))return'EM_ANDAMENTO';return'ABERTA'}
function parsePriority(v:unknown):Priority{const s=norm(v);if(s.includes('urgent'))return'URGENTE';if(s.includes('alta'))return'ALTA';if(s.includes('baixa'))return'BAIXA';return'MEDIA'}
function parseUnit(v:unknown):'HORAS'|'DIARIAS'{return norm(v).includes('hora')?'HORAS':'DIARIAS'}

function rowToOrder(row:Record<string,unknown>,origin:string,id:number,currentYear:number):{order:WorkOrder;warnings:string[]}|null{
 const rawNumber=pick(row,aliases.number);const number=parseNumber(rawNumber);if(!number)return null;
 let openedAt=parseDate(pick(row,aliases.date));const embeddedYear=text(rawNumber).match(/(?:\/|-)(20\d{2})/);const warnings:string[]=[];
 if(!openedAt&&embeddedYear){openedAt=`${embeddedYear[1]}-01-01`;warnings.push('Data não encontrada; usado 01/01 do ano indicado na O.S.')}
 if(!openedAt)return null;
 const secretaria=text(pick(row,aliases.secretaria))||origin;
 const unidade=text(pick(row,aliases.unidade));
 const local=text(pick(row,aliases.local));
 const serviceType=text(pick(row,aliases.service))||'Não informado';
 const description=text(pick(row,aliases.description))||serviceType;
 const team=text(pick(row,aliases.team))||'Não informado';
 const deadline=parseDate(pick(row,aliases.deadline))||openedAt;
 const status=parseStatus(pick(row,aliases.status));
 const attended=status==='ATENDIDA'||status==='CONCLUIDA';
 const progress=status==='CONCLUIDA'||status==='ATENDIDA'?100:status==='EM_ANDAMENTO'?30:status==='CANCELADA'?0:10;
 const year=yearOf(openedAt);
 return {warnings,order:{id,number,openedAt,secretaria,unidade,local,serviceType,description,team,workforceOrigin:team==='Não informado'?'Não informado':'Empresa / equipe informada na planilha',priority:parsePriority(pick(row,aliases.priority)),deadline,estimatedAmount:Number(String(pick(row,aliases.time)).replace(',','.'))||1,estimatedUnit:parseUnit(pick(row,aliases.timeUnit)),status,progress,attended,archived:year<currentYear,materialsSummary:text(pick(row,aliases.materials)),notesCount:0,attachmentsCount:0,officeDocument:text(pick(row,aliases.office)),overdueDays:0,observations:text(pick(row,aliases.notes)),attachments:[],importOrigin:origin,importedAt:new Date().toISOString()}};
}

export default function ImportSpreadsheet({orders,onImport}:Props){
 const fileRef=useRef<HTMLInputElement>(null);
 const [origin,setOrigin]=useState('Executivo');const [customOrigin,setCustomOrigin]=useState('');
 const [fileName,setFileName]=useState('');const [parsed,setParsed]=useState<Parsed[]>([]);const [invalid,setInvalid]=useState(0);const [fileLoaded,setFileLoaded]=useState(false);const [includeDuplicates,setIncludeDuplicates]=useState(false);const [busy,setBusy]=useState(false);const [headerInfo,setHeaderInfo]=useState('');
 const currentYear=new Date().getFullYear();const effectiveOrigin=origin==='Outro'?customOrigin.trim():origin;
 const key=(o:WorkOrder)=>`${o.number}|${yearOf(o.openedAt)}|${norm(o.importOrigin||o.secretaria)}`;
 const existingKeys=useMemo(()=>new Set(orders.map(key)),[orders]);
 const ready=parsed.filter(x=>includeDuplicates||!x.duplicate);
 const past=parsed.filter(x=>x.order.archived).length;const duplicates=parsed.filter(x=>x.duplicate).length;

 const load=async(file:File)=>{
  if(!effectiveOrigin)return alert('Informe a origem da planilha antes de carregar.');
  setBusy(true);setFileLoaded(false);
  try{
   const data=await file.arrayBuffer();const book=XLSX.read(data,{type:'array',cellDates:true});const out:Parsed[]=[];let bad=0;let seq=Date.now();const batch=`${effectiveOrigin}-${new Date().toISOString()}`;const seen=new Set<string>();const headers:string[]=[];
   for(const sheet of book.SheetNames){
    const {rows,headerRow}=rowsFromSheet(book.Sheets[sheet]);headers.push(`${sheet}: linha ${headerRow}`);
    rows.forEach((row,index)=>{const result=rowToOrder(row,effectiveOrigin,seq++,currentYear);if(!result){bad++;return}result.order.importBatch=batch;const k=key(result.order);const duplicate=existingKeys.has(k)||seen.has(k);seen.add(k);out.push({order:result.order,sheet,row:headerRow+index+1,warnings:result.warnings,duplicate})});
   }
   setFileName(file.name);setParsed(out);setInvalid(bad);setHeaderInfo(headers.join(' • '));setFileLoaded(true);
   if(!out.length)alert(`A planilha foi aberta, mas nenhuma O.S. foi reconhecida. O sistema procurou automaticamente a linha de cabeçalho. ${bad} linha(s) foram ignoradas. Nenhum dado foi salvo.`);
  }catch(err){console.error(err);setFileLoaded(false);alert('Não foi possível ler a planilha. Use um arquivo .xlsx, .xls ou .csv válido.')}finally{setBusy(false);if(fileRef.current)fileRef.current.value=''}
 };
 const confirmImport=async()=>{
  if(!ready.length)return alert('Não há registros prontos para importar.');
  if(!confirm(`Importar e salvar ${ready.length} O.S. no sistema?\n\n${past} registro(s) de anos anteriores serão arquivados automaticamente.\n${duplicates&&!includeDuplicates?`${duplicates} possível(is) duplicidade(s) serão ignoradas.`:''}`))return;
  setBusy(true);const ok=await onImport(ready.map(x=>x.order));setBusy(false);
  if(ok){alert(`${ready.length} O.S. importadas e salvas com sucesso.`);setParsed([]);setFileName('');setInvalid(0);setFileLoaded(false);setHeaderInfo('')}
 };
 return <><header className="topbar"><div><h1>Administrativo — Importar Planilha</h1><p>Importe históricos de manutenção sem misturar Executivo, Saúde, Educação ou outras origens.</p></div></header>
 <section className="panel"><h3>1. Identifique a origem</h3><div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:12,maxWidth:650}}><select value={origin} onChange={e=>{setOrigin(e.target.value);setParsed([]);setFileLoaded(false);setFileName('');setHeaderInfo('')}}><option>Executivo</option><option>Saúde</option><option>Educação</option><option>Outro</option></select>{origin==='Outro'&&<input value={customOrigin} onChange={e=>setCustomOrigin(e.target.value)} placeholder="Nome da origem da planilha"/>}</div><p className="hint">A identificação da O.S. importada considera número + ano + origem. O mesmo número pode existir em origens diferentes.</p>
 <h3 style={{marginTop:22}}>2. Selecione e analise a planilha</h3><button className="primary" onClick={()=>fileRef.current?.click()} disabled={busy||!effectiveOrigin}><Upload size={17}/>{busy?'Processando...':'Selecionar planilha'}</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)load(f)}}/>{fileName&&<p><FileSpreadsheet size={16} style={{verticalAlign:'middle'}}/> {fileName}</p>}{headerInfo&&<p className="hint">Cabeçalho detectado automaticamente: {headerInfo}</p>}</section>
 {fileLoaded&&parsed.length===0&&<section className="table-card" style={{marginTop:14,padding:22}}><div style={{display:'flex',gap:12,alignItems:'flex-start'}}><AlertTriangle size={24}/><div><h3 style={{margin:'0 0 6px'}}>Nenhuma O.S. reconhecida</h3><p style={{margin:'0 0 6px'}}>A planilha foi lida e o cabeçalho foi procurado automaticamente, mas ainda não foi possível identificar número e data das O.S. Nenhum dado foi salvo.</p><p className="hint" style={{margin:0}}>Linhas ignoradas: {invalid}. {headerInfo}</p></div></div></section>}
 {parsed.length>0&&<><section className="cards" style={{marginTop:14}}><article className="metric"><div><span>Registros reconhecidos</span><strong>{parsed.length}</strong></div><CheckCircle2 size={22}/></article><article className="metric"><div><span>Ano atual ({currentYear})</span><strong>{parsed.length-past}</strong></div><CheckCircle2 size={22}/></article><article className="metric"><div><span>Arquivados automaticamente</span><strong>{past}</strong></div><FileSpreadsheet size={22}/></article><article className="metric"><div><span>Possíveis duplicidades</span><strong>{duplicates}</strong></div><AlertTriangle size={22}/></article><article className="metric"><div><span>Linhas ignoradas</span><strong>{invalid}</strong></div><AlertTriangle size={22}/></article></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>3. Confira antes de importar</h2><p>Nada foi salvo ainda. Registros anteriores a {currentYear} entrarão em Arquivadas e não participarão das métricas operacionais.</p></div></div><div className="filters"><label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={includeDuplicates} onChange={e=>setIncludeDuplicates(e.target.checked)}/> Incluir também as possíveis duplicidades</label></div><div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Ano</th><th>Origem</th><th>Unidade</th><th>Serviço</th><th>Destino</th><th>Análise</th></tr></thead><tbody>{parsed.slice(0,300).map((x,i)=><tr key={`${x.sheet}-${x.row}-${i}`}><td><b>#{x.order.number}</b></td><td>{yearOf(x.order.openedAt)}</td><td>{x.order.importOrigin}</td><td>{x.order.unidade||'—'}</td><td>{x.order.serviceType}</td><td>{x.order.archived?'Arquivadas':'Operacional'}</td><td>{x.duplicate?<span className="overdue">Possível duplicidade</span>:x.warnings.length?x.warnings.join('; '):'OK'}</td></tr>)}</tbody></table></div>{parsed.length>300&&<p className="hint" style={{padding:'0 20px 15px'}}>Prévia limitada às primeiras 300 linhas. Todos os {parsed.length} registros reconhecidos serão considerados na importação.</p>}</section>
 <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><button className="primary" disabled={busy||ready.length===0} onClick={confirmImport}><Upload size={17}/>Importar e salvar {ready.length} O.S.</button></div></>}
 </>;
}
