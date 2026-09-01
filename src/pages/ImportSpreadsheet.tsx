import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Priority, StatusOS, WorkOrder } from '../types';

type Parsed={order:WorkOrder;sheet:string;row:number;warnings:string[];duplicate:boolean};
type Props={orders:WorkOrder[];onImport:(items:WorkOrder[])=>Promise<boolean>};

const norm=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const text=(v:unknown)=>String(v??'').trim();
const yearOf=(v:string)=>/^\d{4}-/.test(v)?Number(v.slice(0,4)):0;

function pick(row:Record<string,unknown>,names:string[]){
 const entries=Object.entries(row);const wanted=names.map(norm);
 for(const [k,v] of entries){const nk=norm(k);if(wanted.includes(nk))return v;}
 for(const [k,v] of entries){const nk=norm(k);if(wanted.some(w=>nk.includes(w)))return v;}
 return '';
}
function parseNumber(v:unknown){const m=text(v).match(/\d+/);return m?Number(m[0]):0}
function parseDate(v:unknown){
 if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.toISOString().slice(0,10);
 const s=text(v);if(!s)return '';
 let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
 m=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);if(m)return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
 const d=new Date(s);return Number.isNaN(d.getTime())?'':d.toISOString().slice(0,10);
}
function parseStatus(v:unknown):StatusOS{
 const s=norm(v);
 if(s.includes('cancel'))return 'CANCELADA';if(s.includes('conclu'))return 'CONCLUIDA';if(s.includes('atendid'))return 'ATENDIDA';
 if(s.includes('aguard')&&s.includes('material'))return 'AGUARDANDO_MATERIAL';if(s.includes('paralis'))return 'PARALISADA';if(s.includes('andamento')||s.includes('execu'))return 'EM_ANDAMENTO';return 'ABERTA';
}
function parsePriority(v:unknown):Priority{const s=norm(v);if(s.includes('urgent'))return 'URGENTE';if(s.includes('alta'))return 'ALTA';if(s.includes('baixa'))return 'BAIXA';return 'MEDIA'}
function parseUnit(v:unknown):'HORAS'|'DIARIAS'{return norm(v).includes('hora')?'HORAS':'DIARIAS'}

function rowToOrder(row:Record<string,unknown>,origin:string,id:number,currentYear:number):{order:WorkOrder;warnings:string[]}|null{
 const rawNumber=pick(row,['numero da os','numero os','n os','os','ordem de servico','ordem servico']);
 const number=parseNumber(rawNumber);if(!number)return null;
 let openedAt=parseDate(pick(row,['data','data da os','data os','data de abertura','abertura']));
 const embeddedYear=text(rawNumber).match(/(?:\/|-)(20\d{2})/);const warnings:string[]=[];
 if(!openedAt&&embeddedYear){openedAt=`${embeddedYear[1]}-01-01`;warnings.push('Data não encontrada; usado 01/01 do ano indicado no número da O.S.');}
 if(!openedAt){warnings.push('Data não encontrada');return null;}
 const secretaria=text(pick(row,['secretaria','secretaria solicitante']))||origin;
 const unidade=text(pick(row,['unidade','orgao','unidade orgao','local da unidade']))||'Não informado';
 const local=text(pick(row,['local','setor','endereco','local setor']));
 const serviceType=text(pick(row,['tipo de servico','tipo servico','categoria','servico']))||'Não informado';
 const description=text(pick(row,['descricao','descricao do servico','solicitacao','objeto','observacao do servico']))||serviceType;
 const team=text(pick(row,['equipe','empresa','prestador','contratada']))||'Não informado';
 const workforceOrigin=text(pick(row,['origem da mao de obra','origem mao de obra']))||(team==='Não informado'?'Não informado':'Empresa / equipe informada na planilha');
 const deadline=parseDate(pick(row,['prazo','data limite','previsao','previsao conclusao']))||openedAt;
 const status=parseStatus(pick(row,['status','situacao','andamento']));
 const attended=status==='ATENDIDA'||status==='CONCLUIDA';
 const progress=status==='CONCLUIDA'?100:status==='ATENDIDA'?100:status==='EM_ANDAMENTO'?30:status==='CANCELADA'?0:10;
 const year=yearOf(openedAt);
 return {warnings,order:{id,number,openedAt,secretaria,unidade,local,serviceType,description,team,workforceOrigin,priority:parsePriority(pick(row,['prioridade'])),deadline,estimatedAmount:Number(String(pick(row,['tempo previsto','quantidade de diarias','diarias','horas'])).replace(',','.'))||1,estimatedUnit:parseUnit(pick(row,['unidade de tempo','unidade tempo'])),status,progress,attended,archived:year<currentYear,materialsSummary:text(pick(row,['materiais','material','materiais previstos utilizados','lista de materiais'])),notesCount:0,attachmentsCount:0,officeDocument:text(pick(row,['oficio','documento','oficio documento'])),overdueDays:0,observations:text(pick(row,['observacoes','observacao','obs'])),attachments:[],importOrigin:origin,importedAt:new Date().toISOString()}};
}

export default function ImportSpreadsheet({orders,onImport}:Props){
 const fileRef=useRef<HTMLInputElement>(null);const [origin,setOrigin]=useState('Executivo');const [customOrigin,setCustomOrigin]=useState('');
 const [fileName,setFileName]=useState('');const [parsed,setParsed]=useState<Parsed[]>([]);const [invalid,setInvalid]=useState(0);const [includeDuplicates,setIncludeDuplicates]=useState(false);const [busy,setBusy]=useState(false);
 const currentYear=new Date().getFullYear();const effectiveOrigin=origin==='Outro'?customOrigin.trim():origin;
 const key=(o:WorkOrder)=>`${o.number}|${yearOf(o.openedAt)}|${norm(o.importOrigin||o.secretaria)}`;
 const existingKeys=useMemo(()=>new Set(orders.map(key)),[orders]);
 const ready=parsed.filter(x=>includeDuplicates||!x.duplicate);
 const past=parsed.filter(x=>x.order.archived).length;const duplicates=parsed.filter(x=>x.duplicate).length;

 const load=async(file:File)=>{
  if(!effectiveOrigin){alert('Informe a origem da planilha antes de carregar.');return}
  setBusy(true);try{
   const data=await file.arrayBuffer();const book=XLSX.read(data,{type:'array',cellDates:true});const out:Parsed[]=[];let bad=0;let seq=Date.now();const batch=`${effectiveOrigin}-${new Date().toISOString()}`;const seen=new Set<string>();
   for(const sheet of book.SheetNames){const ws=book.Sheets[sheet];const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:'',raw:false});
    rows.forEach((row,index)=>{const result=rowToOrder(row,effectiveOrigin,seq++,currentYear);if(!result){bad++;return}result.order.importBatch=batch;const k=key(result.order);const duplicate=existingKeys.has(k)||seen.has(k);seen.add(k);out.push({order:result.order,sheet,row:index+2,warnings:result.warnings,duplicate});});
   }
   setFileName(file.name);setParsed(out);setInvalid(bad);
  }catch(err){console.error(err);alert('Não foi possível ler a planilha. Use um arquivo .xlsx, .xls ou .csv válido.')}finally{setBusy(false);if(fileRef.current)fileRef.current.value=''}
 };
 const confirmImport=async()=>{
  if(!ready.length)return alert('Não há registros prontos para importar.');
  if(!confirm(`Importar ${ready.length} O.S.?\n\n${past} registro(s) de anos anteriores serão arquivados automaticamente.\n${duplicates&&!includeDuplicates?`${duplicates} possível(is) duplicidade(s) serão ignoradas.`:''}`))return;
  setBusy(true);const ok=await onImport(ready.map(x=>x.order));setBusy(false);if(ok){alert(`${ready.length} O.S. importadas com sucesso.`);setParsed([]);setFileName('');setInvalid(0)}
 };
 return <><header className="topbar"><div><h1>Administrativo — Importar Planilha</h1><p>Importe históricos de manutenção sem misturar Executivo, Saúde, Educação ou outras origens.</p></div></header>
 <section className="panel"><h3>1. Identifique a origem</h3><div style={{display:'grid',gridTemplateColumns:'240px 1fr',gap:12,maxWidth:650}}><select value={origin} onChange={e=>{setOrigin(e.target.value);setParsed([])}}><option>Executivo</option><option>Saúde</option><option>Educação</option><option>Outro</option></select>{origin==='Outro'&&<input value={customOrigin} onChange={e=>setCustomOrigin(e.target.value)} placeholder="Nome da origem da planilha"/>}</div><p className="hint">A identificação da O.S. importada considera número + ano + origem. O mesmo número pode existir em origens diferentes.</p>
 <h3 style={{marginTop:22}}>2. Carregue a planilha</h3><button className="primary" onClick={()=>fileRef.current?.click()} disabled={busy||!effectiveOrigin}><Upload size={17}/>{busy?'Processando...':'Selecionar planilha'}</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)load(f)}}/>{fileName&&<p><FileSpreadsheet size={16} style={{verticalAlign:'middle'}}/> {fileName}</p>}</section>
 {parsed.length>0&&<><section className="cards" style={{marginTop:14}}><article className="metric"><div><span>Registros reconhecidos</span><strong>{parsed.length}</strong></div><CheckCircle2 size={22}/></article><article className="metric"><div><span>Ano atual ({currentYear})</span><strong>{parsed.length-past}</strong></div><CheckCircle2 size={22}/></article><article className="metric"><div><span>Arquivados automaticamente</span><strong>{past}</strong></div><FileSpreadsheet size={22}/></article><article className="metric"><div><span>Possíveis duplicidades</span><strong>{duplicates}</strong></div><AlertTriangle size={22}/></article><article className="metric"><div><span>Linhas ignoradas</span><strong>{invalid}</strong></div><AlertTriangle size={22}/></article></section>
 <section className="table-card"><div className="table-toolbar"><div><h2>Prévia antes da importação</h2><p>Registros anteriores a {currentYear} entrarão em Arquivadas e não participarão das métricas operacionais.</p></div></div><div className="filters"><label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={includeDuplicates} onChange={e=>setIncludeDuplicates(e.target.checked)}/> Incluir também as possíveis duplicidades</label></div><div className="table-scroll"><table><thead><tr><th>O.S.</th><th>Ano</th><th>Origem</th><th>Unidade</th><th>Serviço</th><th>Destino</th><th>Análise</th></tr></thead><tbody>{parsed.slice(0,300).map((x,i)=><tr key={`${x.sheet}-${x.row}-${i}`}><td><b>#{x.order.number}</b></td><td>{yearOf(x.order.openedAt)}</td><td>{x.order.importOrigin}</td><td>{x.order.unidade}</td><td>{x.order.serviceType}</td><td>{x.order.archived?'Arquivadas':'Operacional'}</td><td>{x.duplicate?<span className="overdue">Possível duplicidade</span>:x.warnings.length?x.warnings.join('; '):'OK'}</td></tr>)}</tbody></table></div>{parsed.length>300&&<p className="hint" style={{padding:'0 20px 15px'}}>Prévia limitada às primeiras 300 linhas. Todos os {parsed.length} registros reconhecidos serão considerados na importação.</p>}</section>
 <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><button className="primary" disabled={busy||ready.length===0} onClick={confirmImport}><Upload size={17}/>Importar {ready.length} O.S.</button></div></>}
 </>;
}
