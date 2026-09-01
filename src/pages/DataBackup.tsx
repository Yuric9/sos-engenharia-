import { ChangeEvent, useRef } from 'react';
import { DatabaseBackup, Download, HardDrive, Upload } from 'lucide-react';
import { WorkOrder } from '../types';
import { Catalogs } from '../lib/catalogs';
import { AppUser } from '../lib/auth';

export interface SosBackupFile{
  format:'SOS_BACKUP';
  version:1;
  exportedAt:string;
  orders:WorkOrder[];
  catalogs:Catalogs;
  users:AppUser[];
}

export default function DataBackup({orders,catalogs,users,desktop,databaseLocation,onImport,onNativeBackup}:{
  orders:WorkOrder[];
  catalogs:Catalogs;
  users:AppUser[];
  desktop:boolean;
  databaseLocation:string|null;
  onImport:(backup:SosBackupFile)=>Promise<boolean>;
  onNativeBackup:()=>Promise<string|null>;
}){
  const inputRef=useRef<HTMLInputElement>(null);

  const exportData=()=>{
    const payload:SosBackupFile={format:'SOS_BACKUP',version:1,exportedAt:new Date().toISOString(),orders,catalogs,users};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`SOS-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];
    e.target.value='';
    if(!file)return;
    try{
      const parsed=JSON.parse(await file.text()) as SosBackupFile;
      if(parsed.format!=='SOS_BACKUP'||parsed.version!==1||!Array.isArray(parsed.orders)||!parsed.catalogs||!Array.isArray(parsed.users)){
        alert('Este arquivo não é um backup válido do S.O.S.');
        return;
      }
      if(!confirm(`Importar ${parsed.orders.length} O.S. deste backup? Os dados atuais serão substituídos.`))return;
      if(await onImport(parsed))alert('Backup importado com sucesso.');
    }catch{
      alert('Não foi possível ler o arquivo de backup.');
    }
  };

  const nativeBackup=async()=>{
    const path=await onNativeBackup();
    if(path)alert(`Backup SQLite criado com sucesso em:\n${path}`);
    else alert('Não foi possível criar o backup SQLite.');
  };

  return <>
    <header className="topbar"><div><h1>Backup / Migração</h1><p>Transferência segura dos dados entre a versão web e o S.O.S no HD externo.</p></div></header>
    <section className="content-grid">
      <article className="panel">
        <div className="panel-title"><h3>Exportar dados</h3><Download size={19}/></div>
        <p>Gera um arquivo com O.S., cadastros e usuários atuais. Use este arquivo para levar os dados da versão web para o HD externo.</p>
        <button className="primary" onClick={exportData}><Download size={17}/>Exportar backup JSON</button>
      </article>
      <article className="panel">
        <div className="panel-title"><h3>Importar dados</h3><Upload size={19}/></div>
        <p>Restaura um backup do S.O.S. A importação substitui a base atual após confirmação.</p>
        <button onClick={()=>inputRef.current?.click()}><Upload size={17}/>Selecionar backup</button>
        <input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={importFile}/>
      </article>
      <article className="panel wide">
        <div className="panel-title"><h3>{desktop?'Banco do HD externo':'Armazenamento atual'}</h3><HardDrive size={19}/></div>
        <p><b>{desktop?(databaseLocation||'SQLite portátil detectado'):'Versão web — armazenamento do navegador'}</b></p>
        {desktop?<><p className="hint">O banco principal desta versão é o arquivo sos.db no HD. Não desconecte o HD enquanto o programa estiver aberto.</p><button onClick={nativeBackup}><DatabaseBackup size={17}/>Criar backup do SQLite agora</button></>:<p className="hint">Exporte o backup antes de começar a usar a versão portátil no HD externo.</p>}
      </article>
    </section>
  </>;
}
