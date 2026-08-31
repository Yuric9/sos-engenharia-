import { Archive, Database, HardDrive, ShieldCheck, Users, Wrench } from 'lucide-react';
import { WorkOrder } from '../types';
import { AppUser } from '../lib/auth';
import { Catalogs } from '../lib/catalogs';

export default function Administration({orders,users,catalogs}:{orders:WorkOrder[];users:AppUser[];catalogs:Catalogs}){
 const archived=orders.filter(o=>o.archived).length;
 const active=orders.length-archived;
 const catalogTotal=catalogs.secretarias.length+catalogs.unidades.length+catalogs.tipos.length+catalogs.equipes.length;
 const storageLabel=(()=>{try{const total=Object.keys(localStorage).reduce((sum,key)=>sum+(localStorage.getItem(key)?.length||0),0);return `${(total/1024).toFixed(1)} KB usados neste navegador`;}catch{return 'Armazenamento local indisponível';}})();
 return <>
  <header className="topbar"><div><h1>Administração</h1><p>Visão administrativa e configurações gerais do S.O.S.</p></div></header>
  <section className="cards">
   <article className="metric"><div><span>Total de O.S.</span><strong>{orders.length}</strong></div><Wrench size={22}/></article>
   <article className="metric"><div><span>O.S. operacionais</span><strong>{active}</strong></div><Database size={22}/></article>
   <article className="metric"><div><span>Arquivadas</span><strong>{archived}</strong></div><Archive size={22}/></article>
   <article className="metric"><div><span>Usuários</span><strong>{users.length}</strong></div><Users size={22}/></article>
  </section>
  <section className="content-grid">
   <article className="panel"><div className="panel-title"><h3>Sistema</h3><ShieldCheck size={19}/></div><dl><dt>Nome</dt><dd>S.O.S — Sistema de Ordens de Manutenção</dd><dt>Departamento</dt><dd>Departamento de Engenharia</dd><dt>Ambiente atual</dt><dd>Aplicação web em fase de testes</dd></dl></article>
   <article className="panel"><div className="panel-title"><h3>Cadastros</h3><Database size={19}/></div><dl><dt>Secretarias</dt><dd>{catalogs.secretarias.length}</dd><dt>Unidades / Órgãos</dt><dd>{catalogs.unidades.length}</dd><dt>Tipos de serviço</dt><dd>{catalogs.tipos.length}</dd><dt>Equipes / Empresas</dt><dd>{catalogs.equipes.length}</dd><dt>Total de itens</dt><dd>{catalogTotal}</dd></dl></article>
   <article className="panel wide"><div className="panel-title"><h3>Armazenamento dos dados</h3><HardDrive size={19}/></div><p><b>{storageLabel}</b></p><p className="hint">Nesta fase, os dados ficam gravados no armazenamento local deste navegador. Alterações feitas no sistema são salvas automaticamente neste dispositivo. Para uso definitivo em vários computadores, será necessário conectar o S.O.S. a um banco de dados central.</p></article>
  </section>
 </>;
}
