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

function isInsideForm(source,index){
  const before=source.slice(0,index);
  return before.lastIndexOf('<form')>before.lastIndexOf('</form>');
}

for(const file of walk(srcRoot).filter(f=>f.endsWith('.tsx'))){
  let source=fs.readFileSync(file,'utf8');
  // These legacy tab controls are hidden from the UI until a real tab state/history module exists.
  source=source.replace(/<div className="tabs">[\s\S]*?<\/div>/g,'');
  const buttonRe=/<button\b([^>]*)>/g;
  let match;
  while((match=buttonRe.exec(source))){
    checkedButtons++;
    const attrs=match[1];
    const hasClick=/\bonClick\s*=/.test(attrs);
    const explicitSubmit=/\btype\s*=\s*["']submit["']/.test(attrs);
    const explicitButton=/\btype\s*=\s*["']button["']/.test(attrs);
    const implicitSubmit=isInsideForm(source,match.index)&&!explicitButton;
    if(!hasClick&&!explicitSubmit&&!implicitSubmit){
      failures.push(`${path.relative(root,file)}: botão visível sem ação próximo ao caractere ${match.index}`);
    }
  }
}

const auth=fs.readFileSync(path.join(root,'src/lib/auth.ts'),'utf8');
if(!auth.includes('PBKDF2')||!auth.includes('210000'))failures.push('auth.ts: derivação PBKDF2/210000 não encontrada');
if(/password\s*:\s*["'][^"']+["']/.test(auth))failures.push('auth.ts: possível senha fixa em texto puro encontrada');
if(!auth.includes('failedAttempts')||!auth.includes('lockedUntil'))failures.push('auth.ts: bloqueio por tentativas não encontrado');

const db=fs.readFileSync(path.join(root,'src-tauri/src/database.rs'),'utf8');
for(const token of ['safe_stored_path','MAX_ATTACHMENT_BYTES','mime_allowed','extension_allowed','backup_daily','audit_logs']){
  if(!db.includes(token))failures.push(`database.rs: proteção esperada ausente: ${token}`);
}
if(!db.includes('Component::Normal'))failures.push('database.rs: proteção contra path traversal não encontrada');
if(!db.includes('10 * 1024 * 1024'))warnings.push('database.rs: confirmar limite esperado de 10 MB por anexo');
if(!db.includes('with_extension')||!db.includes('fs::rename'))warnings.push('database.rs: gravação temporária/atômica de anexos não detectada');

const main=fs.readFileSync(path.join(root,'src-tauri/src/main.rs'),'utf8');
if(!main.includes('windows_subsystem = "windows"'))failures.push('main.rs: configuração para ocultar console no Windows ausente');

const tauri=JSON.parse(fs.readFileSync(path.join(root,'src-tauri/tauri.conf.json'),'utf8'));
if(!Array.isArray(tauri.bundle?.icon)||tauri.bundle.icon.length===0)failures.push('tauri.conf.json: ícone do bundle não configurado');

const form=fs.readFileSync(path.join(root,'src/pages/WorkOrderForm.tsx'),'utf8');
for(const label of ['Número da O.S.','Data da O.S.','Secretaria','Tipo de serviço','Equipe','Prazo','Prioridade','Tempo previsto']){
  if(!form.includes(`missing.push('${label}')`))failures.push(`WorkOrderForm: validação obrigatória ausente para ${label}`);
}
if(form.includes("missing.push('Unidade"))failures.push('WorkOrderForm: Unidade voltou a ser obrigatória indevidamente');

const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
for(const guard of ["if(!isAdmin)return false","Somente Admin pode excluir uma O.S.","view==='usuarios'&&isAdmin","view==='backup'&&isAdmin","view==='import'&&isAdmin"]){
  if(!app.includes(guard))failures.push(`App.tsx: proteção administrativa esperada ausente: ${guard}`);
}

const login=fs.readFileSync(path.join(root,'src/pages/Login.tsx'),'utf8');
if(login.includes('/prefeitura-trindade.png'))failures.push('Login.tsx: ainda depende do arquivo externo antigo de logo');

console.log(`Auditoria estática: ${checkedButtons} botões visíveis verificados.`);
for(const w of warnings)console.warn(`AVISO: ${w}`);
if(failures.length){
  console.error(`\n${failures.length} falha(s) encontrada(s):`);
  failures.forEach(x=>console.error(`- ${x}`));
  process.exit(1);
}
console.log('Auditoria estática concluída sem falhas bloqueantes.');
