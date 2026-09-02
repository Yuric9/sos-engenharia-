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

for(const file of walk(srcRoot).filter(f=>f.endsWith('.tsx'))){
  let source=fs.readFileSync(file,'utf8');
  // WorkOrderDetail keeps legacy visual tabs hidden by brand-fix.css until a real tab state exists.
  source=source.replace(/<div className="tabs">[\s\S]*?<\/div>/g,'');
  const buttonRe=/<button\b([^>]*)>/g;
  let match;
  while((match=buttonRe.exec(source))){
    checkedButtons++;
    const attrs=match[1];
    const hasClick=/\bonClick\s*=/.test(attrs);
    const isSubmit=/\btype\s*=\s*["']submit["']/.test(attrs);
    if(!hasClick&&!isSubmit){
      failures.push(`${path.relative(root,file)}: botão sem onClick e sem type="submit" próximo ao caractere ${match.index}`);
    }
  }
}

const auth=fs.readFileSync(path.join(root,'src/lib/auth.ts'),'utf8');
if(!auth.includes("PBKDF2")||!auth.includes('210000'))failures.push('auth.ts: derivação PBKDF2/210000 não encontrada');
if(/password\s*:\s*["'][^"']+["']/.test(auth))failures.push('auth.ts: possível senha fixa em texto puro encontrada');
if(!auth.includes('failedAttempts')||!auth.includes('lockedUntil'))failures.push('auth.ts: bloqueio por tentativas não encontrado');

const db=fs.readFileSync(path.join(root,'src-tauri/src/database.rs'),'utf8');
for(const token of ['safe_stored_path','MAX_ATTACHMENT_BYTES','mime_allowed','extension_allowed','backup_daily','audit_logs']){
  if(!db.includes(token))failures.push(`database.rs: proteção esperada ausente: ${token}`);
}
if(!db.includes('Component::Normal'))failures.push('database.rs: proteção contra path traversal não encontrada');
if(!db.includes('10 * 1024 * 1024'))warnings.push('database.rs: confirmar limite esperado de 10 MB por anexo');

const main=fs.readFileSync(path.join(root,'src-tauri/src/main.rs'),'utf8');
if(!main.includes('windows_subsystem = "windows"'))failures.push('main.rs: configuração para ocultar console no Windows ausente');

const tauri=JSON.parse(fs.readFileSync(path.join(root,'src-tauri/tauri.conf.json'),'utf8'));
if(!Array.isArray(tauri.bundle?.icon)||tauri.bundle.icon.length===0)failures.push('tauri.conf.json: ícone do bundle não configurado');

const form=fs.readFileSync(path.join(root,'src/pages/WorkOrderForm.tsx'),'utf8');
for(const label of ['Número da O.S.','Data da O.S.','Secretaria','Tipo de serviço','Equipe','Prazo','Prioridade','Tempo previsto']){
  if(!form.includes(`missing.push('${label}')`))failures.push(`WorkOrderForm: validação obrigatória ausente para ${label}`);
}
if(form.includes("missing.push('Unidade"))failures.push('WorkOrderForm: Unidade voltou a ser obrigatória indevidamente');

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
