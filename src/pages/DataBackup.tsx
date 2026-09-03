import { ChangeEvent, useRef } from 'react';
import { CheckCircle2, DatabaseBackup, Download, HardDrive, Upload } from 'lucide-react';
import { WorkOrder } from '../types';
import { Catalogs } from '../lib/catalogs';
import { runDesktopBackupSelfTest } from '../lib/nativeDb';

export interface SosBackupFile{
  format:'SOS_BACKUP';
  version:2;
  exportedAt:string;
  orders:WorkOrder[];
  catalogs:Catalogs;
}

export default function DataBackup({orders,catalogs,desktop,databaseLocation,onImport,onNativeBackup}:{
  orders:WorkOrder[];
  catalogs:Catalogs;
  desktop:boolean;
  databaseLocation:string|null;
  onImport:(backup:SosBackupFile)=>Promise<boolean>;
  onNativeBackup:()=>Promise<string|null>;
}){
  const inputRef=useRef<HTMLInputElement>(null);

  const exportData=()=>{
    const payload:SosBackupFile={format:'SOS_BACKUP',version:2,exportedAt:new Date().toISOString(),orders,catalogs};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`SOS-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);
  };

  const importFile=async(e:ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    try{
      const parsed=JSON.parse(await file.text()) as SosBackupFile;
      if(parsed.format!=='SOS_BACKUP'||parsed.version!==2||!Array.isArray(parsed.orders)||!parsed.catalogs){alert('Este arquivo não é um backup válido ou seguro do S.O.S. versão atual.');return}
      if(!confirm(`Importar ${parsed.orders.length} O.S. deste backup? O.S. e cadastros atuais serão substituídos. Usuários e senhas NÃO serão alterados.`))return;
      if(await onImport(parsed))alert('Backup importado com sucesso. Usuários e senhas locais foram preservados.');
    }catch{alert('Não foi possível ler o arquivo de backup.')}
  };

  const nativeBackup=async()=>{const path=await onNativeBackup();if(path)alert(`Backup SQLite criado com sucesso em:\n${path}`);else alert('Não foi possível criar o backup SQLite.')};
  const selfTest=async()=>{const result=await runDesktopBackupSelfTest();if(result)alert(`Teste concluído com sucesso.\n\n${result}`);else alert('O autoteste de backup/restauração falhou. Nenhum dado real foi substituído. Verifique o HD e tente novamente.')};

  return <>
    <header className="topbar"><div><h1>Backup / Migração</h1><p>Transferência segura dos dados e validação da cópia do HD externo.</p></div></header>
    <section className="content-grid">
      <article className="panel"><div className="panel-title"><h3>Exportar dados</h3><Download size={19}/></div><p>Gera um arquivo com O.S. e cadastros. Por segurança, usuários, hashes e senhas não são incluídos.</p><button className="primary" onClick={exportData}><Download size={17}/>Exportar backup JSON</button></article>
      <article className="panel"><div className="panel-title"><h3>Importar dados</h3><Upload size={19}/></div><p>Restaura O.S. e cadastros. As credenciais existentes neste equipamento são preservadas.</p><button onClick={()=>inputRef.current?.click()}><Upload size={17}/>Selecionar backup</button><input ref={inputRef} hidden type="file" accept="application/json,.json" onChange={importFile}/></article>
      <article className="panel wide"><div className="panel-title"><h3>{desktop?'Banco do HD externo':'Armazenamento atual'}</h3><HardDrive size={19}/></div><p><b>{desktop?(databaseLocation||'SQLite portátil detectado'):'Versão web — armazenamento do navegador'}</b></p>{desktop?<><p className="hint">O banco principal é o arquivo sos.db no HD. O backup nativo inclui banco e pasta de anexos. O autoteste cria uma cópia, simula uma restauração temporária e compara quantidade de O.S. e arquivos sem substituir sua base real.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button onClick={nativeBackup}><DatabaseBackup size={17}/>Criar backup do SQLite agora</button><button className="primary" onClick={selfTest}><CheckCircle2 size={17}/>Testar backup e restauração</button></div></>:<p className="hint">Exporte o backup antes de começar a usar a versão portátil no HD externo.</p>}</article>
    </section>
  </>;
}
