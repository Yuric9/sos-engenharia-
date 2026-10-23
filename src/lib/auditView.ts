import type { StatusTone } from '../components/ui';

export type AuditEntity = 'WORK_ORDER' | 'USER' | 'CATALOG' | 'AUTH';

export interface AuditEntry {
  id: number;
  at: string;
  userId: number | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: number | null;
  label: string;
  machine: string | null;
  before: unknown;
  after: unknown;
}

export const ENTITY_LABELS: Record<AuditEntity, string> = {
  WORK_ORDER: 'O.S.',
  USER: 'Usuário',
  CATALOG: 'Cadastro',
  AUTH: 'Login',
};

const ACTIONS: Record<string, [string, StatusTone]> = {
  CREATE: ['Criação', 'success'],
  UPDATE: ['Alteração', 'info'],
  DELETE: ['Exclusão', 'danger'],
  IMPORT: ['Importação', 'warning'],
  LOGIN_SUCCESS: ['Entrada', 'neutral'],
  LOGIN_FAIL: ['Senha incorreta', 'warning'],
  LOGIN_BLOCKED: ['Bloqueado', 'danger'],
};

export function actionInfo(action: string): { label: string; tone: StatusTone } {
  const [label, tone] = ACTIONS[action] || [action, 'neutral'];
  return { label, tone };
}

export function entityLabel(entity: string) {
  return ENTITY_LABELS[entity as AuditEntity] || entity;
}

/** O SQLite grava `AAAA-MM-DD HH:MM:SS` em UTC; mostra no horário local. */
export function formatAuditDate(at: string) {
  const date = new Date(`${at.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Nomes legíveis dos campos mais comuns; os demais aparecem com o nome técnico.
const FIELD_LABELS: Record<string, string> = {
  number: 'Número',
  openedAt: 'Data',
  secretaria: 'Secretaria',
  unidade: 'Unidade',
  local: 'Local',
  serviceType: 'Tipo de serviço',
  description: 'Descrição',
  team: 'Equipe',
  workforceOrigin: 'Origem da mão de obra',
  priority: 'Prioridade',
  deadline: 'Prazo',
  estimatedAmount: 'Tempo previsto',
  estimatedUnit: 'Unidade de tempo',
  status: 'Situação',
  progress: 'Progresso',
  attended: 'Atendida',
  archived: 'Arquivada',
  materialsSummary: 'Materiais',
  observations: 'Observações',
  officeDocument: 'Ofício',
  attachments: 'Anexos',
  name: 'Nome',
  login: 'Login',
  role: 'Perfil',
  scope: 'Área',
  active: 'Ativo',
  senhaAlterada: 'Senha',
  parent: 'Vinculado a',
  detail: 'Detalhe',
  address: 'Endereço',
  tipo: 'Tipo de cadastro',
};

// Campos recalculados automaticamente que só poluiriam a comparação.
const IGNORED = new Set(['overdueDays', 'history', 'attachmentsCount', 'notesCount', 'id']);

function show(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return `${value.length} item(ns)`;
  if (typeof value === 'object') return JSON.stringify(value);
  // Códigos como EM_ANDAMENTO aparecem como no resto do sistema: "EM ANDAMENTO".
  return typeof value === 'string' && /^[A-Z_]+$/.test(value)
    ? value.replaceAll('_', ' ')
    : String(value);
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

/** Lista os campos que mudaram entre o antes e o depois de um registro. */
export function fieldChanges(before: unknown, after: unknown): FieldChange[] {
  const asObject = (v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const a = asObject(before);
  const b = asObject(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !IGNORED.has(k));
  return keys
    .filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((k) => ({
      field: FIELD_LABELS[k] || k,
      before: k === 'senhaAlterada' ? '—' : show(a[k]),
      after: k === 'senhaAlterada' ? 'Alterada' : show(b[k]),
    }));
}
