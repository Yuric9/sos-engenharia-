import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { Button, FilterPill, SearchInput, StatusBadge } from '../components/ui';
import { isDesktopMode, listDesktopAudit } from '../lib/nativeDb';
import {
  actionInfo,
  AuditEntity,
  AuditEntry,
  ENTITY_LABELS,
  entityLabel,
  fieldChanges,
  formatAuditDate,
} from '../lib/auditView';

const PAGE_SIZE = 100;
const FILTERS: [AuditEntity | 'TODOS', string][] = [
  ['TODOS', 'Todos'],
  ...(Object.entries(ENTITY_LABELS) as [AuditEntity, string][]),
];

export default function Auditoria() {
  const desktop = isDesktopMode();
  const [entity, setEntity] = useState<AuditEntity | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const load = async (offset: number) => {
    setLoading(true);
    setError('');
    try {
      const page = await listDesktopAudit<AuditEntry>(
        entity === 'TODOS' ? null : entity,
        search,
        PAGE_SIZE,
        offset
      );
      setEntries((current) => (offset === 0 ? page : [...current, ...page]));
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  // Recarrega ao trocar o filtro; a busca espera o usuário parar de digitar.
  useEffect(() => {
    if (!desktop) return;
    const timer = setTimeout(() => load(0), search ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, search]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Auditoria</h1>
          <p>Quem criou, alterou ou excluiu O.S., usuários e cadastros, e os acessos ao sistema.</p>
        </div>
      </header>
      {!desktop ? (
        <section className="panel">
          <p>
            O registro de auditoria fica no banco do programa desktop. Abra o S.O.S pelo executável
            para consultá-lo.
          </p>
        </section>
      ) : (
        <section className="table-card">
          <div className="table-toolbar">
            <div>
              <h2>
                {entries.length}
                {hasMore ? '+' : ''} registro(s)
              </h2>
              <p>Clique em um registro para ver o que mudou.</p>
            </div>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Usuário, número da O.S., nome do cadastro..."
            />
          </div>
          <div className="filters">
            {FILTERS.map(([value, label]) => (
              <FilterPill key={value} active={entity === value} onClick={() => setEntity(value)}>
                {label}
              </FilterPill>
            ))}
          </div>
          {error && (
            <p className="login-error" style={{ padding: '0 18px' }}>
              {error}
            </p>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Data</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Tipo</th>
                  <th>Registro</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const action = actionInfo(entry.action);
                  const expanded = open === entry.id;
                  const changes = expanded ? fieldChanges(entry.before, entry.after) : [];
                  return (
                    <Fragment key={entry.id}>
                      <tr onClick={() => setOpen(expanded ? null : entry.id)}>
                        <td>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                        <td>{formatAuditDate(entry.at)}</td>
                        <td>
                          {entry.userName || (entry.userId ? `Usuário #${entry.userId}` : '—')}
                        </td>
                        <td>
                          <StatusBadge tone={action.tone}>{action.label}</StatusBadge>
                        </td>
                        <td>{entityLabel(entry.entity)}</td>
                        <td>{entry.label || '—'}</td>
                      </tr>
                      {expanded && (
                        <tr className="audit-detail">
                          <td></td>
                          <td colSpan={5}>
                            {changes.length ? (
                              <table className="audit-changes">
                                <thead>
                                  <tr>
                                    <th>Campo</th>
                                    <th>Antes</th>
                                    <th>Depois</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {changes.map((c) => (
                                    <tr key={c.field}>
                                      <td>{c.field}</td>
                                      <td>{c.before}</td>
                                      <td>{c.after}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="hint">Sem detalhes de campos para este registro.</p>
                            )}
                            {entry.machine && <p className="hint">Computador: {entry.machine}</p>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!loading && !entries.length && !error && (
              <div className="attachment-empty" style={{ margin: 18 }}>
                <ShieldCheck size={28} />
                <strong>Nenhum registro encontrado</strong>
              </div>
            )}
          </div>
          {hasMore && (
            <div style={{ padding: 18 }}>
              <Button onClick={() => load(entries.length)} disabled={loading}>
                {loading ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </section>
      )}
    </>
  );
}
