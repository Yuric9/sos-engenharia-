import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const srcRoot=path.join(root,'src');
const failures=[];
const warnings=[];
let checkedButtons=0;

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const p=path.join(dir,entry.name);
    return entry.isDirectory()?walk(p):[p];
  });
}
function isInsideForm(source,index){const before=source.slice(0,index);return before.lastIndexOf('<form')>before.lastIndexOf('</form>')}

for(const file of walk(srcRoot).filter(f=>f.endsWith('.tsx'))){
  let source=fs.readFileSync(file,'utf8');
  source=source.replace(/<div className="tabs">[\s\S]*?<\/div>/g,'');
  const buttonRe=/<button\b([^>]*)>/g;let match;
  while((match=buttonRe.exec(source))){
    checkedButtons++;const attrs=match[1];const hasClick=/\bonClick\s*=/.test(attrs);const explicitSubmit=/\btype\s*=\s*["']submit["']/.test(attrs);const explicitButton=/\btype\s*=\s*["']button["']/.test(attrs);const implicitSubmit=isInsideForm(source,match.index)&&!explicitButton;
    if(!hasClick&&!explicitSubmit&&!implicitSubmit)failures.push(`${path.relative(root,file)}: botão visível sem ação próximo ao caractere ${match.index}`);
  }
}

const auth=fs.readFileSync(path.join(root,'src/lib/auth.ts'),'utf8');
if(!auth.includes('PBKDF2')||!auth.includes('210000'))failures.push('auth.ts: derivação PBKDF2/210000 não encontrada');
if(/password\s*:\s*["'][^"']+["']/.test(auth))failures.push('auth.ts: possível senha fixa em texto puro encontrada');
if(!auth.includes('failedAttempts')||!auth.includes('lockedUntil'))failures.push('auth.ts: bloqueio por tentativas não encontrado');

const db=fs.readFileSync(path.join(root,'src-tauri/src/database.rs'),'utf8');
for(const token of ['safe_stored_path','MAX_ATTACHMENT_BYTES','mime_allowed','extension_allowed','backup_daily','audit_logs'])if(!db.includes(token))failures.push(`database.rs: proteção esperada ausente: ${token}`);
if(!db.includes('Component::Normal'))failures.push('database.rs: proteção contra path traversal não encontrada');
if(!db.includes('10 * 1024 * 1024'))warnings.push('database.rs: confirmar limite esperado de 10 MB por anexo');
if(!db.includes('with_extension')||!db.includes('fs::rename'))warnings.push('database.rs: gravação temporária/atômica de anexos não detectada');

const tauriLib=fs.readFileSync(path.join(root,'src-tauri/src/lib.rs'),'utf8');
for(const token of ['open_attachment','backup_self_test'])if(!tauriLib.includes(token))failures.push(`lib.rs: comando Tauri esperado ausente: ${token}`);
if(!tauriLib.includes('Component::Normal'))failures.push('lib.rs: abertura externa sem validação de caminho detectada');
const backupVerify=fs.readFileSync(path.join(root,'src-tauri/src/backup_verify.rs'),'utf8');
for(const token of ['work_order_records','.restore-self-test','backup_now','count_files'])if(!backupVerify.includes(token))failures.push(`backup_verify.rs: autoteste incompleto, ausente: ${token}`);

const main=fs.readFileSync(path.join(root,'src-tauri/src/main.rs'),'utf8');
if(!main.includes('windows_subsystem = "windows"'))failures.push('main.rs: configuração para ocultar console no Windows ausente');
const tauri=JSON.parse(fs.readFileSync(path.join(root,'src-tauri/tauri.conf.json'),'utf8'));
if(!Array.isArray(tauri.bundle?.icon)||tauri.bundle.icon.length===0)failures.push('tauri.conf.json: ícone do bundle não configurado');

const form=fs.readFileSync(path.join(root,'src/pages/WorkOrderForm.tsx'),'utf8');
for(const label of ['Número da O.S.','Data da O.S.','Secretaria','Tipo de serviço','Equipe','Prazo','Prioridade','Tempo previsto'])if(!form.includes(`missing.push('${label}')`))failures.push(`WorkOrderForm: validação obrigatória ausente para ${label}`);
if(form.includes("missing.push('Unidade"))failures.push('WorkOrderForm: Unidade voltou a ser obrigatória indevidamente');

const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
for(const guard of ["if(!isAdmin)return false","Somente Admin pode excluir uma O.S.","view==='usuarios'&&isAdmin","view==='backup'&&isAdmin","view==='import'&&isAdmin"]){if(!app.includes(guard))failures.push(`App.tsx: proteção administrativa esperada ausente: ${guard}`)}
for(const token of ['withAutoAudit','IMPORTACAO','O.S. arquivada','O.S. restaurada'])if(!app.includes(token))failures.push(`App.tsx: histórico/auditoria esperado ausente: ${token}`);

const storage=fs.readFileSync(path.join(root,'src/lib/storage.ts'),'utf8');
if(!storage.includes("os.attended||['ATENDIDA','CONCLUIDA','CANCELADA']"))failures.push('storage.ts: ATENDIDA/attended não encerra a contagem de atraso');
if(!storage.includes('repairHistoricalDates')||!storage.includes("officeDocument?.startsWith('HIST-')"))failures.push('storage.ts: reparo seguro das datas históricas não encontrado');

const detail=fs.readFileSync(path.join(root,'src/pages/WorkOrderDetail.tsx'),'utf8');
for(const token of ['Histórico da O.S.','Mensagem copiada —','Cobrança nº','openDesktopAttachment','Atendida — contagem de atraso encerrada',"kind:'MENSAGEM'"])if(!detail.includes(token))failures.push(`WorkOrderDetail: recurso esperado ausente: ${token}`);

const works=fs.readFileSync(path.join(root,'src/pages/Works.tsx'),'utf8');
for(const obsolete of ['processNumber','procurementMode','updatedValue','professionalRegistry','paidAt'])if(works.includes(obsolete))failures.push(`Works.tsx: campo antigo ainda presente: ${obsolete}`);
if(/\bpaid\s*:/.test(works)||works.includes("'PAGA'"))failures.push('Works.tsx: lógica de pagamento de medições ainda presente');
if(!works.includes('openDesktopAttachment'))failures.push('Works.tsx: documentos não usam abertura nativa do Windows');

const reports=fs.readFileSync(path.join(root,'src/pages/Reports.tsx'),'utf8');
for(const label of ['Taxa de atendimento','Prazo médio planejado','Mensagens registradas','Cobranças de atraso','O.S. por secretaria','O.S. por equipe / empresa'])if(!reports.includes(label))failures.push(`Reports.tsx: indicador administrativo ausente: ${label}`);

const backup=fs.readFileSync(path.join(root,'src/pages/DataBackup.tsx'),'utf8');
if(!backup.includes('Testar backup e restauração')||!backup.includes('runDesktopBackupSelfTest'))failures.push('DataBackup.tsx: botão/autoteste de restauração ausente');

const css=fs.readFileSync(path.join(root,'src/brand-fix.css'),'utf8');
if(!css.includes('.works-form'))failures.push('brand-fix.css: estilo definitivo do formulário de Obras ausente');
if(css.includes('section.detail-grid > article.panel:first-child p:nth-of-type'))failures.push('brand-fix.css: hack antigo ainda pode esconder campos válidos de Obras');

const login=fs.readFileSync(path.join(root,'src/pages/Login.tsx'),'utf8');
if(login.includes('/prefeitura-trindade.png'))failures.push('Login.tsx: ainda depende do arquivo externo antigo de logo');

console.log(`Auditoria estática: ${checkedButtons} botões visíveis verificados.`);
for(const w of warnings)console.warn(`AVISO: ${w}`);
if(failures.length){console.error(`\n${failures.length} falha(s) encontrada(s):`);failures.forEach(x=>console.error(`- ${x}`));process.exit(1)}
console.log('Auditoria estática concluída sem falhas bloqueantes.');
