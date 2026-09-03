import './brand-fix.css';
import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardPlus, FileText, Database, BarChart3, Archive, LogOut, Users, Building2, HardDrive, FileSpreadsheet, HardHat } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrderForm from './pages/WorkOrderForm';
import WorkOrders from './pages/WorkOrders';
import Login from './pages/Login';
import Cadastros from './pages/Cadastros';
import Usuarios from './pages/Usuarios';
import Reports from './pages/Reports';
import ArchivedOrders from './pages/ArchivedOrders';
import ImportSpreadsheet from './pages/ImportSpreadsheet';
import Works from './pages/Works';
import DataBackup, { SosBackupFile } from './pages/DataBackup';
import { AuditEvent, AuditKind, StatusOS, WorkOrder } from './types';
import { loadOrders, normalizeOrders, recalcOverdue, saveOrders } from './lib/storage';
import { AppUser, UserScope, currentUser, loadUsers, logout, saveUsers } from './lib/auth';
import { Catalogs, loadCatalogs, saveCatalogs } from './lib/catalogs';
import { createDesktopBackup, deleteDesktopOrder, getDesktopDatabaseLocation, isDesktopMode, loadDesktopOrders, loadDesktopSnapshot, replaceDesktopOrders, saveDesktopOrder, saveDesktopSnapshot, SNAPSHOT_CATALOGS, SNAPSHOT_USERS } from './lib/nativeDb';

type View='dashboard'|'orders'|'new'|'edit'|'cadastros'|'usuarios'|'reports'|'archived'|'backup'|'import'|'works';
export const OWN_TEAM='Mão de obra própria — Departamento de Engenharia';
export const RP_NAME='RP CONSTRUÇÕES LOCAÇÕES E CONSULTORIA EIRELI';
export const INOVART_NAME='INOVART COMÉRCIO DE EQUIPAMENTOS EIRELI EPP';
const SCOPE_LABELS:Record<UserScope,string>={EXECUTIVO:'Executivo',SAUDE:'Saúde',EDUCACAO:'Educação',GABINETE:'Gabinete do Prefeito'};
function yearOf(date:string){return /^\d{4}-/.test(date)?date.slice(0,4):''}
function compact(v?:string){return (v||'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ')}
function plain(v?:string){return compact(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function orderScope(o:WorkOrder):UserScope{const source=plain(o.importOrigin||o.secretaria);if(source.includes('saude'))return 'SAUDE';if(source.includes('educa'))return 'EDUCACAO';if(source.includes('gabinete'))return 'GABINETE';return 'EXECUTIVO'}
function prepareHistoricalOrders(items:WorkOrder[]){const currentYear=new Date().getFullYear();return items.map(o=>{const y=Number(yearOf(o.openedAt));return y>0&&y<currentYear&&!o.archived?{...o,archived:true}:o})}
function audit(kind:AuditKind,label:string,actor:string,detail?:string,messageKind?:string):AuditEvent{return {id:crypto.randomUUID(),at:new Date().toISOString(),kind,label,detail,actor,messageKind}}
function comparable(o:WorkOrder){const {history,...rest}=o;return rest}
function withAutoAudit(before:WorkOrder|undefined,next:WorkOrder,actor:string):WorkOrder{
  const history=[...(next.history||before?.history||[])];
  if(!before)return {...next,history:[audit('CRIACAO','O.S. criada',actor,`O.S. ${next.number}/${yearOf(next.openedAt)}`),...history]};
  let added=false;
  if(before.status!==next.status){history.unshift(audit('STATUS','Status alterado',actor,`${before.status.replaceAll('_',' ')} → ${next.status.replaceAll('_',' ')}`));added=true}
  if(before.archived!==next.archived){history.unshift(audit(next.archived?'ARQUIVO':'RESTAURACAO',next.archived?'O.S. arquivada':'O.S. restaurada',actor));added=true}
  const beforeIds=new Set((before.attachments||[]).map(a=>a.id));const nextIds=new Set((next.attachments||[]).map(a=>a.id));
  const addedFiles=(next.attachments||[]).filter(a=>!beforeIds.has(a.id));const removedFiles=(before.attachments||[]).filter(a=>!nextIds.has(a.id));
  if(addedFiles.length||removedFiles.length){const detail=[addedFiles.length?`${addedFiles.length} anexado(s)`:null,removedFiles.length?`${removedFiles.length} removido(s)`:null].filter(Boolean).join(' • ');history.unshift(audit('ANEXO','Anexos atualizados',actor,detail));added=true}
  if(!added&&JSON.stringify(comparable(before))!==JSON.stringify(comparable(next)))history.unshift(audit('EDICAO','O.S. editada',actor));
  return {...next,history};
}

function ensureWorkforceOptions(c:Catalogs):Catalogs{
  const obsolete=new Set(['Equipe da Secretaria','Empresa Terceirizada']);
  const equipes=c.equipes.filter(x=>!obsolete.has(x.name)).map(x=>x.name==='Equipe Própria'?{...x,name:OWN_TEAM,detail:'Mão de obra própria do Departamento de Engenharia'}:x);
  const defaults=[{id:91000,name:OWN_TEAM,active:true,detail:'Mão de obra própria do Departamento de Engenharia'},{id:91001,name:RP_NAME,active:true,detail:'Empresa terceirizada • Manutenções dos órgãos do Executivo'},{id:91002,name:INOVART_NAME,active:true,detail:'Empresa terceirizada • Manutenções da Saúde'}];
  defaults.forEach(item=>{if(!equipes.some(x=>x.name===item.name))equipes.push(item)});return {...c,equipes};
}

export default function App(){
  const desktop=isDesktopMode();
  const [session,setSession]=useState<AppUser|null>(()=>currentUser());
  const [orders,setOrders]=useState<WorkOrder[]>(()=>prepareHistoricalOrders(normalizeOrders(loadOrders())));
  const [catalogs,setCatalogs]=useState<Catalogs>(()=>ensureWorkforceOptions(loadCatalogs()));
  const [users,setUsers]=useState<AppUser[]>(()=>loadUsers());
  const [selected,setSelected]=useState<number|null>(null);const [view,setView]=useState<View>('dashboard');
  const [hydrating,setHydrating]=useState(desktop);const [databaseLocation,setDatabaseLocation]=useState<string|null>(null);

  useEffect(()=>{
    if(!desktop){setHydrating(false);return;}let cancelled=false;
    (async()=>{
      const [savedOrders,savedCatalogs,savedUsers,location]=await Promise.all([loadDesktopOrders<WorkOrder>(),loadDesktopSnapshot<Catalogs>(SNAPSHOT_CATALOGS),loadDesktopSnapshot<AppUser[]>(SNAPSHOT_USERS),getDesktopDatabaseLocation()]);
      if(cancelled)return;
      if(savedOrders){const raw=normalizeOrders(savedOrders);const normalized=prepareHistoricalOrders(raw);saveOrders(normalized);setOrders(normalized);if(raw.some((o,i)=>o.archived!==normalized[i]?.archived))await replaceDesktopOrders(normalized,currentUser()?.id);}
      if(savedCatalogs){const prepared=ensureWorkforceOptions(savedCatalogs);saveCatalogs(prepared);setCatalogs(prepared)}else await saveDesktopSnapshot(SNAPSHOT_CATALOGS,catalogs);
      if(savedUsers){saveUsers(savedUsers);setUsers(savedUsers)}else await saveDesktopSnapshot(SNAPSHOT_USERS,users);
      setDatabaseLocation(location);setSession(currentUser());setHydrating(false);
    })();return()=>{cancelled=true};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  if(hydrating)return <div style={{padding:32,fontFamily:'system-ui'}}><h2>S.O.S</h2><p>Carregando banco de dados do HD externo...</p></div>;
  if(!session)return <Login onLogin={setSession}/>;
  const isAdmin=session.role==='ADMIN';
  const sessionScope:UserScope=session.scope||'EXECUTIVO';
  const canSeeAll=isAdmin||sessionScope==='GABINETE';
  const accessibleOrders=canSeeAll?orders:orders.filter(o=>orderScope(o)===sessionScope);
  const current=accessibleOrders.find(x=>x.id===selected);
  const goDashboard=()=>{setSelected(null);setView('dashboard')};

  const persistOrderChange=async(producer:(previous:WorkOrder[])=>WorkOrder[])=>{
    const next=prepareHistoricalOrders(producer(orders)).map(recalcOverdue);
    if(desktop){
      const oldById=new Map(orders.map(o=>[o.id,o]));const nextById=new Map(next.map(o=>[o.id,o]));
      for(const item of next){const before=oldById.get(item.id);if(!before||JSON.stringify(before)!==JSON.stringify(item)){if(!await saveDesktopOrder(item,session.id)){alert('Não foi possível salvar a O.S. no banco SQLite do HD externo. Confira se o HD continua conectado.');return false}}}
      for(const item of orders){if(!nextById.has(item.id)){if(!await deleteDesktopOrder(item.id,session.id)){alert('Não foi possível excluir a O.S. do banco SQLite.');return false}}}
      saveOrders(next);
    }else if(!saveOrders(next)){alert('Não foi possível salvar a alteração. O armazenamento deste navegador pode estar cheio.');return false}
    setOrders(next);return true;
  };

  const persistCatalogs=async(next:Catalogs)=>{if(desktop){if(!await saveDesktopSnapshot(SNAPSHOT_CATALOGS,next)){alert('Não foi possível salvar o cadastro no banco SQLite do HD externo.');return}saveCatalogs(next)}else if(!saveCatalogs(next)){alert('Não foi possível salvar o cadastro.');return}setCatalogs(next)};
  const persistUsers=async(next:AppUser[])=>{if(desktop){if(!await saveDesktopSnapshot(SNAPSHOT_USERS,next)){alert('Não foi possível salvar o usuário no banco SQLite do HD externo.');return}saveUsers(next)}else if(!saveUsers(next)){alert('Não foi possível salvar a alteração de usuário.');return}setUsers(next);const refreshed=next.find(x=>x.id===session.id&&x.active);if(refreshed)setSession(refreshed)};

  const importBackup=async(backup:SosBackupFile)=>{
    const nextOrders=prepareHistoricalOrders(normalizeOrders(backup.orders));const nextCatalogs=ensureWorkforceOptions(backup.catalogs);
    if(desktop){if(!await replaceDesktopOrders(nextOrders,session.id)||!await saveDesktopSnapshot(SNAPSHOT_CATALOGS,nextCatalogs)){alert('A importação não foi concluída no banco do HD externo.');return false}}
    if(!saveOrders(nextOrders)||!saveCatalogs(nextCatalogs)){alert('Não foi possível atualizar o armazenamento local de apoio.');return false}
    setOrders(nextOrders);setCatalogs(nextCatalogs);setSelected(null);setView('dashboard');return true;
  };
  const importSpreadsheetOrders=async(items:WorkOrder[])=>{
    if(!isAdmin)return false;
    const used=new Set(orders.map(o=>o.id));let nextId=Date.now();
    const safe=items.map(item=>{let id=item.id;while(used.has(id)){id=++nextId}used.add(id);return {...item,id,history:[audit('IMPORTACAO','O.S. importada de planilha',session.name,item.importBatch||item.importOrigin),...(item.history||[])]}});
    const merged=prepareHistoricalOrders(normalizeOrders([...safe,...orders])).map(recalcOverdue);
    if(desktop){if(!await replaceDesktopOrders(merged,session.id)){alert('A planilha não pôde ser gravada no banco do HD externo.');return false}}
    if(!saveOrders(merged)){alert('Não foi possível atualizar o armazenamento local de apoio.');return false}
    setOrders(merged);setSelected(null);return true;
  };

  const updateOrder=async(os:WorkOrder)=>{
    if(!canSeeAll&&orderScope(os)!==sessionScope){alert('Você não tem acesso a esta O.S.');return}
    if(!Number.isInteger(os.number)||os.number<=0){alert('Informe um número de O.S. válido.');return}
    const before=orders.find(x=>x.id===os.id);
    const secured=!isAdmin&&sessionScope!=='GABINETE'?{...os,importOrigin:SCOPE_LABELS[sessionScope]}:os;
    const updated=recalcOverdue(withAutoAudit(before,secured,session.name));const saved=await persistOrderChange(previous=>previous.map(x=>x.id===updated.id?updated:x));if(saved)setSelected(updated.id)
  };
  const bulkStatusChange=async(ids:number[],status:StatusOS)=>{
    const requested=new Set(ids);
    const allowed=new Set(accessibleOrders.filter(o=>!o.archived).map(o=>o.id));
    const targets=orders.filter(o=>requested.has(o.id)&&allowed.has(o.id)&&!o.archived);
    if(!targets.length){alert('Nenhuma O.S. ativa válida foi encontrada para atualização.');return false}
    return persistOrderChange(previous=>previous.map(o=>{
      if(!requested.has(o.id)||!allowed.has(o.id)||o.archived)return o;
      const next:WorkOrder={...o,status,attended:status==='ATENDIDA'||status==='CONCLUIDA',progress:status==='CONCLUIDA'?100:o.progress};
      return recalcOverdue(withAutoAudit(o,next,session.name));
    }));
  };
  const bulkCharge=async(ids:number[],context:string)=>{
    const requested=new Set(ids);
    const allowed=new Set(accessibleOrders.filter(o=>!o.archived&&o.overdueDays>0&&!['ATENDIDA','CONCLUIDA','CANCELADA'].includes(o.status)).map(o=>o.id));
    const targets=orders.filter(o=>requested.has(o.id)&&allowed.has(o.id));
    if(!targets.length){alert('Nenhuma O.S. ativa em atraso foi encontrada para registrar a cobrança.');return false}
    return persistOrderChange(previous=>previous.map(o=>{
      if(!requested.has(o.id)||!allowed.has(o.id))return o;
      const previousCharges=(o.history||[]).filter(h=>h.kind==='MENSAGEM'&&h.messageKind==='ATRASO').length;
      const event=audit('MENSAGEM','Cobrança em lote — atraso',session.name,`Cobrança nº ${previousCharges+1} • ${context}`,'ATRASO');
      return {...o,history:[event,...(o.history||[])]};
    }));
  };
  const saveForm=async(os:WorkOrder)=>{
    if(!Number.isInteger(os.number)||os.number<=0){alert('Informe um número de O.S. válido.');return}
    const secured=!isAdmin&&sessionScope!=='GABINETE'?{...os,importOrigin:SCOPE_LABELS[sessionScope]}:(!os.importOrigin?{...os,importOrigin:SCOPE_LABELS[orderScope(os)]}:os);
    const exists=orders.some(x=>x.id===secured.id);const candidates=orders.filter(x=>x.id!==secured.id);const source=compact(secured.importOrigin||secured.secretaria);
    const sameNumberYear=candidates.find(x=>x.number===secured.number&&yearOf(x.openedAt)===yearOf(secured.openedAt)&&compact(x.importOrigin||x.secretaria)===source);
    const sameNumberOtherYear=!sameNumberYear&&candidates.find(x=>x.number===secured.number&&compact(x.importOrigin||x.secretaria)===source);
    const verySimilar=!sameNumberYear&&candidates.find(x=>compact(x.importOrigin||x.secretaria)===source&&x.openedAt===secured.openedAt&&compact(x.unidade)===compact(secured.unidade)&&compact(x.serviceType)===compact(secured.serviceType)&&compact(x.description)===compact(secured.description));
    const duplicate=sameNumberYear||sameNumberOtherYear||verySimilar;
    if(duplicate){const duplicateYear=yearOf(duplicate.openedAt);const currentYear=yearOf(secured.openedAt);const reason=sameNumberYear?`Já existe a O.S. ${secured.number}/${currentYear} nesta mesma origem.`:sameNumberOtherYear?`O número ${secured.number} já aparece em ${duplicateYear} nesta mesma origem.`:'Já existe uma O.S. muito parecida nesta mesma origem.';if(!confirm(`Atenção: possível O.S. duplicada.\n\n${reason}\n\nDeseja salvar mesmo assim?`))return;}
    const before=orders.find(x=>x.id===secured.id);const updated=recalcOverdue(withAutoAudit(before,secured,session.name));const saved=await persistOrderChange(previous=>exists?previous.map(x=>x.id===updated.id?updated:x):[updated,...previous]);if(saved){setSelected(updated.id);setView('dashboard')}
  };
  const remove=async(id:number)=>{if(!isAdmin)return alert('Somente Admin pode excluir uma O.S.');const saved=await persistOrderChange(previous=>previous.filter(o=>o.id!==id));if(saved)goDashboard()};
  const signout=()=>{logout();setSession(null)};
  const openOrder=(id:number)=>{const allowed=accessibleOrders.some(o=>o.id===id);if(!allowed){alert('Você não tem acesso a esta O.S.');return}setSelected(id);setView('dashboard')};

  return <div className="institution-shell"><header className="municipal-header"><div className="department-title"><Building2 size={18}/><div><b>Departamento de Engenharia</b><span>S.O.S — Sistema de Ordens de Manutenção</span></div></div><div className="user-chip"><strong>{session.name}</strong><span>{isAdmin?'ADMIN • Todas as áreas':`OPERADOR • ${SCOPE_LABELS[sessionScope]}`}</span></div></header><div className="app-shell"><aside className="sidebar"><div className="side-heading"><strong>S.O.S</strong><span>Gestão de obras e manutenções</span></div><nav>
  <button className={view==='dashboard'&&!selected?'active':''} onClick={goDashboard}><LayoutDashboard size={18}/>Dashboard</button><button className={view==='new'?'active':''} onClick={()=>{setSelected(null);setView('new')}}><ClipboardPlus size={18}/>Nova O.S.</button><button className={view==='orders'?'active':''} onClick={()=>{setSelected(null);setView('orders')}}><FileText size={18}/>Ordens de Serviço</button><button className={view==='reports'?'active':''} onClick={()=>{setSelected(null);setView('reports')}}><BarChart3 size={18}/>Relatórios</button><button className={view==='archived'?'active':''} onClick={()=>{setSelected(null);setView('archived')}}><Archive size={18}/>Arquivadas</button><button className={view==='works'?'active':''} onClick={()=>{setSelected(null);setView('works')}}><HardHat size={18}/>Obras</button>{isAdmin&&<div style={{fontSize:10,fontWeight:800,letterSpacing:'.12em',color:'#b8d8ca',padding:'16px 12px 5px'}}>ADMINISTRATIVO</div>}{isAdmin&&<button className={view==='cadastros'?'active':''} onClick={()=>{setSelected(null);setView('cadastros')}}><Database size={18}/>Cadastros</button>}{isAdmin&&<button className={view==='import'?'active':''} onClick={()=>{setSelected(null);setView('import')}}><FileSpreadsheet size={18}/>Importar Planilha</button>}{isAdmin&&<button className={view==='usuarios'?'active':''} onClick={()=>{setSelected(null);setView('usuarios')}}><Users size={18}/>Usuários</button>}{isAdmin&&<button className={view==='backup'?'active':''} onClick={()=>{setSelected(null);setView('backup')}}><HardDrive size={18}/>Backup / Migração</button>}
 </nav><button className="logout" onClick={signout}><LogOut size={18}/>Sair</button></aside><main className="main">
 {view==='works'?<Works isAdmin={isAdmin}/>:view==='import'&&isAdmin?<ImportSpreadsheet orders={orders} onImport={importSpreadsheetOrders}/>:view==='backup'&&isAdmin?<DataBackup orders={orders} catalogs={catalogs} desktop={desktop} databaseLocation={databaseLocation} onImport={importBackup} onNativeBackup={createDesktopBackup}/>:view==='cadastros'&&isAdmin?<Cadastros catalogs={catalogs} onChange={persistCatalogs} isAdmin={isAdmin}/>:view==='usuarios'&&isAdmin?<Usuarios users={users} onChange={persistUsers}/>:view==='reports'?<Reports orders={accessibleOrders} onOpen={openOrder}/>:view==='archived'?<ArchivedOrders orders={accessibleOrders} onOpen={openOrder}/>:view==='orders'?<WorkOrders orders={accessibleOrders} onOpen={openOrder} onBulkStatus={bulkStatusChange} onBulkCharge={bulkCharge}/>:view==='new'?<WorkOrderForm catalogs={catalogs} number={0} onCancel={goDashboard} onSave={saveForm}/>:view==='edit'&&current?<WorkOrderForm catalogs={catalogs} initial={current} number={current.number} onCancel={()=>setView('dashboard')} onSave={saveForm}/>:current?<WorkOrderDetail os={current} actor={session.name} onBack={goDashboard} onEdit={()=>setView('edit')} onChange={updateOrder} onDelete={()=>remove(current.id)} canDelete={isAdmin}/>:<Dashboard orders={accessibleOrders} onOpen={openOrder} onNew={()=>setView('new')}/>} 
 </main></div><footer className="municipal-footer"><span>Prefeitura Municipal de Trindade • Departamento de Engenharia</span><span>{desktop?`Banco SQLite externo${databaseLocation?` • ${databaseLocation}`:''}`:'S.O.S — Sistema interno de Ordens de Manutenção'}</span></footer></div>
}