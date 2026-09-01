import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardPlus, FileText, Database, BarChart3, Archive, LogOut, Users, Building2, HardDrive } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import WorkOrderDetail from './pages/WorkOrderDetail';
import WorkOrderForm from './pages/WorkOrderForm';
import WorkOrders from './pages/WorkOrders';
import Login from './pages/Login';
import Cadastros from './pages/Cadastros';
import Usuarios from './pages/Usuarios';
import Reports from './pages/Reports';
import ArchivedOrders from './pages/ArchivedOrders';
import DataBackup, { SosBackupFile } from './pages/DataBackup';
import { WorkOrder } from './types';
import { loadOrders, normalizeOrders, recalcOverdue, saveOrders } from './lib/storage';
import { AppUser, currentUser, loadUsers, logout, saveUsers } from './lib/auth';
import { Catalogs, loadCatalogs, saveCatalogs } from './lib/catalogs';
import {
  createDesktopBackup,
  getDesktopDatabaseLocation,
  isDesktopMode,
  loadDesktopSnapshot,
  saveDesktopSnapshot,
  SNAPSHOT_CATALOGS,
  SNAPSHOT_ORDERS,
  SNAPSHOT_USERS
} from './lib/nativeDb';

type View='dashboard'|'orders'|'new'|'edit'|'cadastros'|'usuarios'|'reports'|'archived'|'backup';

export const OWN_TEAM='Mão de obra própria — Departamento de Engenharia';
export const RP_NAME='RP CONSTRUÇÕES LOCAÇÕES E CONSULTORIA EIRELI';
export const INOVART_NAME='INOVART COMÉRCIO DE EQUIPAMENTOS EIRELI EPP';

function ensureWorkforceOptions(c:Catalogs):Catalogs{
  const obsolete=new Set(['Equipe da Secretaria','Empresa Terceirizada']);
  const equipes=c.equipes
    .filter(x=>!obsolete.has(x.name))
    .map(x=>x.name==='Equipe Própria'?{...x,name:OWN_TEAM,detail:'Mão de obra própria do Departamento de Engenharia'}:x);
  const defaults=[
    {id:91000,name:OWN_TEAM,active:true,detail:'Mão de obra própria do Departamento de Engenharia'},
    {id:91001,name:RP_NAME,active:true,detail:'Empresa terceirizada • Manutenções dos órgãos do Executivo'},
    {id:91002,name:INOVART_NAME,active:true,detail:'Empresa terceirizada • Manutenções da Saúde'}
  ];
  defaults.forEach(item=>{if(!equipes.some(x=>x.name===item.name))equipes.push(item)});
  return {...c,equipes};
}

export default function App(){
  const desktop=isDesktopMode();
  const [session,setSession]=useState<AppUser|null>(()=>currentUser());
  const [orders,setOrders]=useState<WorkOrder[]>(()=>normalizeOrders(loadOrders()));
  const [catalogs,setCatalogs]=useState<Catalogs>(()=>ensureWorkforceOptions(loadCatalogs()));
  const [users,setUsers]=useState<AppUser[]>(()=>loadUsers());
  const [selected,setSelected]=useState<number|null>(null);
  const [view,setView]=useState<View>('dashboard');
  const [hydrating,setHydrating]=useState(desktop);
  const [databaseLocation,setDatabaseLocation]=useState<string|null>(null);

  useEffect(()=>{
    if(!desktop){setHydrating(false);return;}
    let cancelled=false;
    (async()=>{
      const [savedOrders,savedCatalogs,savedUsers,location]=await Promise.all([
        loadDesktopSnapshot<WorkOrder[]>(SNAPSHOT_ORDERS),
        loadDesktopSnapshot<Catalogs>(SNAPSHOT_CATALOGS),
        loadDesktopSnapshot<AppUser[]>(SNAPSHOT_USERS),
        getDesktopDatabaseLocation()
      ]);
      if(cancelled)return;

      if(savedOrders){
        const normalized=normalizeOrders(savedOrders);
        saveOrders(normalized);
        setOrders(normalized);
      }else{
        await saveDesktopSnapshot(SNAPSHOT_ORDERS,orders);
      }

      if(savedCatalogs){
        const prepared=ensureWorkforceOptions(savedCatalogs);
        saveCatalogs(prepared);
        setCatalogs(prepared);
      }else{
        await saveDesktopSnapshot(SNAPSHOT_CATALOGS,catalogs);
      }

      if(savedUsers){
        saveUsers(savedUsers);
        setUsers(savedUsers);
      }else{
        await saveDesktopSnapshot(SNAPSHOT_USERS,users);
      }

      setDatabaseLocation(location);
      setSession(currentUser());
      setHydrating(false);
    })();
    return()=>{cancelled=true};
  // Carga única do SQLite portátil na inicialização.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  if(hydrating)return <div style={{padding:32,fontFamily:'system-ui'}}><h2>S.O.S</h2><p>Carregando banco de dados do HD externo...</p></div>;
  if(!session)return <Login onLogin={setSession}/>;

  const current=orders.find(x=>x.id===selected);
  const isAdmin=session.role==='ADMIN';

  const goDashboard=()=>{setSelected(null);setView('dashboard')};

  const persistOrderChange=async(producer:(previous:WorkOrder[])=>WorkOrder[])=>{
    const next=producer(orders).map(recalcOverdue);
    if(desktop){
      if(!await saveDesktopSnapshot(SNAPSHOT_ORDERS,next)){
        alert('Não foi possível salvar a O.S. no banco SQLite do HD externo. Confira se o HD continua conectado e tente novamente.');
        return false;
      }
      saveOrders(next);
    }else if(!saveOrders(next)){
      alert('Não foi possível salvar a alteração. O armazenamento deste navegador pode estar cheio. Remova anexos grandes ou faça um backup antes de continuar.');
      return false;
    }
    setOrders(next);
    return true;
  };

  const persistCatalogs=async(next:Catalogs)=>{
    if(desktop){
      if(!await saveDesktopSnapshot(SNAPSHOT_CATALOGS,next)){
        alert('Não foi possível salvar o cadastro no banco SQLite do HD externo. Confira a conexão do HD.');
        return;
      }
      saveCatalogs(next);
    }else if(!saveCatalogs(next)){
      alert('Não foi possível salvar o cadastro. O armazenamento deste navegador pode estar cheio.');
      return;
    }
    setCatalogs(next);
  };

  const persistUsers=async(next:AppUser[])=>{
    if(desktop){
      if(!await saveDesktopSnapshot(SNAPSHOT_USERS,next)){
        alert('Não foi possível salvar o usuário no banco SQLite do HD externo. Confira a conexão do HD.');
        return;
      }
      saveUsers(next);
    }else if(!saveUsers(next)){
      alert('Não foi possível salvar a alteração de usuário. O armazenamento deste navegador pode estar cheio.');
      return;
    }
    setUsers(next);
    const refreshed=next.find(x=>x.id===session.id&&x.active);
    if(refreshed)setSession(refreshed);
  };

  const importBackup=async(backup:SosBackupFile)=>{
    const nextOrders=normalizeOrders(backup.orders);
    const nextCatalogs=ensureWorkforceOptions(backup.catalogs);
    const nextUsers=backup.users;

    if(desktop){
      const saved=await Promise.all([
        saveDesktopSnapshot(SNAPSHOT_ORDERS,nextOrders),
        saveDesktopSnapshot(SNAPSHOT_CATALOGS,nextCatalogs),
        saveDesktopSnapshot(SNAPSHOT_USERS,nextUsers)
      ]);
      if(saved.some(x=>!x)){
        alert('A importação não foi concluída no banco do HD externo. Nenhuma mudança será aplicada à tela.');
        return false;
      }
    }

    if(!saveOrders(nextOrders)||!saveCatalogs(nextCatalogs)||!saveUsers(nextUsers)){
      alert('Não foi possível atualizar o armazenamento local de apoio.');
      return false;
    }

    setOrders(nextOrders);
    setCatalogs(nextCatalogs);
    setUsers(nextUsers);
    setSelected(null);
    setView('dashboard');
    const refreshed=nextUsers.find(x=>x.id===session.id&&x.active);
    setSession(refreshed||null);
    return true;
  };

  const updateOrder=async(os:WorkOrder)=>{
    if(!Number.isInteger(os.number)||os.number<=0){alert('Informe um número de O.S. válido.');return;}
    const updated=recalcOverdue(os);
    const saved=await persistOrderChange(previous=>previous.map(x=>x.id===updated.id?updated:x));
    if(saved)setSelected(updated.id);
  };

  const saveForm=async(os:WorkOrder)=>{
    if(!Number.isInteger(os.number)||os.number<=0){alert('Informe um número de O.S. válido.');return;}
    const exists=orders.some(x=>x.id===os.id);
    if(!exists&&orders.some(x=>x.number===os.number)){
      alert(`A O.S. #${os.number} já existe. Informe outro número.`);
      return;
    }
    const updated=recalcOverdue(os);
    const saved=await persistOrderChange(previous=>exists
      ?previous.map(x=>x.id===updated.id?updated:x)
      :[updated,...previous]
    );
    if(saved){setSelected(updated.id);setView('dashboard');}
  };

  const remove=async(id:number)=>{
    if(!isAdmin)return alert('Somente Admin pode excluir uma O.S.');
    const saved=await persistOrderChange(previous=>previous.filter(o=>o.id!==id));
    if(saved)goDashboard();
  };

  const signout=()=>{logout();setSession(null)};
  const openOrder=(id:number)=>{setSelected(id);setView('dashboard')};

  return <div className="institution-shell">
    <header className="municipal-header">
      <div className="department-title"><Building2 size={18}/><div><b>Departamento de Engenharia</b><span>S.O.S — Sistema de Ordens de Manutenção</span></div></div>
      <div className="user-chip"><strong>{session.name}</strong><span>{session.role}</span></div>
    </header>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-heading"><strong>S.O.S</strong><span>Gestão de obras e manutenções</span></div>
        <nav>
          <button className={view==='dashboard'&&!selected?'active':''} onClick={goDashboard}><LayoutDashboard size={18}/>Dashboard</button>
          <button className={view==='new'?'active':''} onClick={()=>{setSelected(null);setView('new')}}><ClipboardPlus size={18}/>Nova O.S.</button>
          <button className={view==='orders'?'active':''} onClick={()=>{setSelected(null);setView('orders')}}><FileText size={18}/>Ordens de Serviço</button>
          <button className={view==='cadastros'?'active':''} onClick={()=>{setSelected(null);setView('cadastros')}}><Database size={18}/>Cadastros</button>
          <button className={view==='reports'?'active':''} onClick={()=>{setSelected(null);setView('reports')}}><BarChart3 size={18}/>Relatórios</button>
          <button className={view==='archived'?'active':''} onClick={()=>{setSelected(null);setView('archived')}}><Archive size={18}/>Arquivadas</button>
          {isAdmin&&<button className={view==='usuarios'?'active':''} onClick={()=>{setSelected(null);setView('usuarios')}}><Users size={18}/>Usuários</button>}
          {isAdmin&&<button className={view==='backup'?'active':''} onClick={()=>{setSelected(null);setView('backup')}}><HardDrive size={18}/>Backup / Migração</button>}
        </nav>
        <button className="logout" onClick={signout}><LogOut size={18}/>Sair</button>
      </aside>
      <main className="main">
        {view==='backup'&&isAdmin?<DataBackup orders={orders} catalogs={catalogs} users={users} desktop={desktop} databaseLocation={databaseLocation} onImport={importBackup} onNativeBackup={createDesktopBackup}/>
        :view==='cadastros'?<Cadastros catalogs={catalogs} onChange={persistCatalogs} isAdmin={isAdmin}/>
        :view==='usuarios'&&isAdmin?<Usuarios users={users} onChange={persistUsers}/>
        :view==='reports'?<Reports orders={orders} onOpen={openOrder}/>
        :view==='archived'?<ArchivedOrders orders={orders} onOpen={openOrder}/>
        :view==='orders'?<WorkOrders orders={orders} onOpen={openOrder}/>
        :view==='new'?<WorkOrderForm catalogs={catalogs} number={0} onCancel={goDashboard} onSave={saveForm}/>
        :view==='edit'&&current?<WorkOrderForm catalogs={catalogs} initial={current} number={current.number} onCancel={()=>setView('dashboard')} onSave={saveForm}/>
        :current?<WorkOrderDetail os={current} onBack={goDashboard} onEdit={()=>setView('edit')} onChange={updateOrder} onDelete={()=>remove(current.id)}/>
        :<Dashboard orders={orders} onOpen={openOrder} onNew={()=>setView('new')}/>} 
      </main>
    </div>
    <footer className="municipal-footer"><span>Prefeitura Municipal de Trindade • Departamento de Engenharia</span><span>{desktop?`Banco SQLite externo${databaseLocation?` • ${databaseLocation}`:''}`:'S.O.S — Sistema interno de Ordens de Manutenção'}</span></footer>
  </div>
}
