import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];
const warnings = [];
let checkedButtons = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });
}
function isInsideForm(source, index) {
  const before = source.slice(0, index);
  return before.lastIndexOf('<form') > before.lastIndexOf('</form>');
}

for (const file of walk(srcRoot).filter((f) => f.endsWith('.tsx'))) {
  const source = fs.readFileSync(file, 'utf8');
  const buttonRe = /<button\b([^>]*)>/g;
  let match;
  while ((match = buttonRe.exec(source))) {
    checkedButtons++;
    const attrs = match[1];
    const hasClick = /\bonClick\s*=/.test(attrs);
    const explicitSubmit = /\btype\s*=\s*["']submit["']/.test(attrs);
    const explicitButton = /\btype\s*=\s*["']button["']/.test(attrs);
    const implicitSubmit = isInsideForm(source, match.index) && !explicitButton;
    if (!hasClick && !explicitSubmit && !implicitSubmit)
      failures.push(
        `${path.relative(root, file)}: botão visível sem ação próximo ao caractere ${match.index}`
      );
  }
}

// As verificações abaixo procuram trechos de código; espaços e quebras de linha são
// ignorados para que a formatação automática (Prettier) não gere falsos negativos.
const squash = (text) => text.replace(/\s+/g, '');
class Code extends String {
  includes(token) {
    return super.includes(squash(token));
  }
}
const readCode = (relativePath) =>
  new Code(squash(fs.readFileSync(path.join(root, relativePath), 'utf8')));

const auth = readCode('src/lib/auth.ts');
if (!auth.includes('PBKDF2') || !auth.includes('210000'))
  failures.push('auth.ts: derivação PBKDF2/210000 não encontrada');
if (/password\s*:\s*["'][^"']+["']/.test(auth))
  failures.push('auth.ts: possível senha fixa em texto puro encontrada');
if (!auth.includes('failedAttempts') || !auth.includes('lockedUntil'))
  failures.push('auth.ts: bloqueio por tentativas não encontrado');

const db = readCode('src-tauri/src/database.rs');
for (const token of [
  'safe_stored_path',
  'MAX_ATTACHMENT_BYTES',
  'mime_allowed',
  'extension_allowed',
  'backup_daily',
  'audit_logs',
])
  if (!db.includes(token)) failures.push(`database.rs: proteção esperada ausente: ${token}`);
if (!db.includes('Component::Normal'))
  failures.push('database.rs: proteção contra path traversal não encontrada');
if (!db.includes('10 * 1024 * 1024'))
  warnings.push('database.rs: confirmar limite esperado de 10 MB por anexo');
if (!db.includes('with_extension') || !db.includes('fs::rename'))
  warnings.push('database.rs: gravação temporária/atômica de anexos não detectada');

const tauriLib = readCode('src-tauri/src/lib.rs');
for (const token of ['open_attachment', 'backup_self_test'])
  if (!tauriLib.includes(token)) failures.push(`lib.rs: comando Tauri esperado ausente: ${token}`);
if (!tauriLib.includes('Component::Normal'))
  failures.push('lib.rs: abertura externa sem validação de caminho detectada');
const backupVerify = readCode('src-tauri/src/backup_verify.rs');
for (const token of ['work_order_records', '.restore-self-test', 'backup_now', 'count_files'])
  if (!backupVerify.includes(token))
    failures.push(`backup_verify.rs: autoteste incompleto, ausente: ${token}`);

const main = readCode('src-tauri/src/main.rs');
if (!main.includes('windows_subsystem = "windows"'))
  failures.push('main.rs: configuração para ocultar console no Windows ausente');
const tauri = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
if (!Array.isArray(tauri.bundle?.icon) || tauri.bundle.icon.length === 0)
  failures.push('tauri.conf.json: ícone do bundle não configurado');

const form = readCode('src/pages/WorkOrderForm.tsx');
for (const label of [
  'Número da O.S.',
  'Data da O.S.',
  'Secretaria',
  'Tipo de serviço',
  'Equipe',
  'Prazo',
  'Prioridade',
  'Tempo previsto',
])
  if (!form.includes(`missing.push('${label}')`))
    failures.push(`WorkOrderForm: validação obrigatória ausente para ${label}`);
if (form.includes("missing.push('Unidade"))
  failures.push('WorkOrderForm: Unidade voltou a ser obrigatória indevidamente');

const app = readCode('src/App.tsx');
for (const guard of [
  'if(!isAdmin)return false',
  'Somente Admin pode excluir uma O.S.',
  "view==='usuarios'&&isAdmin",
  "view==='backup'&&isAdmin",
  "view==='import'&&isAdmin",
]) {
  if (!app.includes(guard))
    failures.push(`App.tsx: proteção administrativa esperada ausente: ${guard}`);
}
for (const token of ['withAutoAudit', 'IMPORTACAO', 'O.S. arquivada', 'O.S. restaurada'])
  if (!app.includes(token))
    failures.push(`App.tsx: histórico/auditoria esperado ausente: ${token}`);

const storage = readCode('src/lib/storage.ts');
if (!storage.includes("os.attended||['ATENDIDA','CONCLUIDA','CANCELADA']"))
  failures.push('storage.ts: ATENDIDA/attended não encerra a contagem de atraso');
if (
  !storage.includes('repairHistoricalDates') ||
  !storage.includes("officeDocument?.startsWith('HIST-')")
)
  failures.push('storage.ts: reparo seguro das datas históricas não encontrado');

const detail = readCode('src/pages/WorkOrderDetail.tsx');
for (const token of [
  'Histórico da O.S.',
  'Mensagem copiada —',
  'Cobrança nº',
  'openDesktopAttachment',
  'Atendida — contagem de atraso encerrada',
  "kind:'MENSAGEM'",
])
  if (!detail.includes(token)) failures.push(`WorkOrderDetail: recurso esperado ausente: ${token}`);

const works = readCode('src/pages/Works.tsx');
for (const obsolete of [
  'processNumber',
  'procurementMode',
  'updatedValue',
  'professionalRegistry',
  'paidAt',
])
  if (works.includes(obsolete))
    failures.push(`Works.tsx: campo antigo ainda presente: ${obsolete}`);
if (/\bpaid\s*:/.test(works) || works.includes("'PAGA'"))
  failures.push('Works.tsx: lógica de pagamento de medições ainda presente');
if (!works.includes('openDesktopAttachment'))
  failures.push('Works.tsx: documentos não usam abertura nativa do Windows');

const reports = readCode('src/pages/Reports.tsx');
for (const label of [
  'Taxa de atendimento',
  'Prazo médio planejado',
  'Mensagens registradas',
  'Cobranças de atraso',
  'O.S. por secretaria',
  'O.S. por equipe / empresa',
])
  if (!reports.includes(label))
    failures.push(`Reports.tsx: indicador administrativo ausente: ${label}`);

const backup = readCode('src/pages/DataBackup.tsx');
if (!backup.includes('Testar backup e restauração') || !backup.includes('runDesktopBackupSelfTest'))
  failures.push('DataBackup.tsx: botão/autoteste de restauração ausente');

const css = readCode('src/brand-fix.css');
if (!css.includes('.works-form'))
  failures.push('brand-fix.css: estilo definitivo do formulário de Obras ausente');
if (css.includes('section.detail-grid > article.panel:first-child p:nth-of-type'))
  failures.push('brand-fix.css: hack antigo ainda pode esconder campos válidos de Obras');

const login = readCode('src/pages/Login.tsx');
if (login.includes('/prefeitura-trindade.png'))
  failures.push('Login.tsx: ainda depende do arquivo externo antigo de logo');

console.log(`Auditoria estática: ${checkedButtons} botões visíveis verificados.`);
for (const w of warnings) console.warn(`AVISO: ${w}`);
if (failures.length) {
  console.error(`\n${failures.length} falha(s) encontrada(s):`);
  failures.forEach((x) => console.error(`- ${x}`));
  process.exit(1);
}
console.log('Auditoria estática concluída sem falhas bloqueantes.');
