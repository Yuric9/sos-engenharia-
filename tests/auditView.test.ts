import { describe, expect, it } from 'vitest';
import { actionInfo, entityLabel, fieldChanges, formatAuditDate } from '../src/lib/auditView';

describe('auditView', () => {
  it('traduz ações e tipos', () => {
    expect(actionInfo('UPDATE')).toEqual({ label: 'Alteração', tone: 'info' });
    expect(actionInfo('LOGIN_BLOCKED').label).toBe('Bloqueado');
    expect(actionInfo('OUTRA').label).toBe('OUTRA');
    expect(entityLabel('CATALOG')).toBe('Cadastro');
  });

  it('lista só os campos que mudaram, com nomes legíveis', () => {
    const before = {
      status: 'ABERTA',
      progress: 10,
      archived: false,
      overdueDays: 3,
      unidade: 'UBS',
    };
    const after = {
      status: 'EM_ANDAMENTO',
      progress: 100,
      archived: false,
      overdueDays: 0,
      unidade: 'UBS',
    };
    expect(fieldChanges(before, after)).toEqual([
      { field: 'Situação', before: 'ABERTA', after: 'EM ANDAMENTO' },
      { field: 'Progresso', before: '10', after: '100' },
    ]);
  });

  it('mostra criação e exclusão contra um lado vazio', () => {
    expect(fieldChanges(null, { name: 'Cimento', active: true })).toEqual([
      { field: 'Nome', before: '—', after: 'Cimento' },
      { field: 'Ativo', before: '—', after: 'Sim' },
    ]);
    expect(fieldChanges({ login: 'joao' }, null)).toEqual([
      { field: 'Login', before: 'joao', after: '—' },
    ]);
  });

  it('nunca mostra senha, só que foi alterada', () => {
    expect(fieldChanges({ name: 'A' }, { name: 'A', senhaAlterada: true })).toEqual([
      { field: 'Senha', before: '—', after: 'Alterada' },
    ]);
  });

  it('converte a data UTC do banco para o horário local', () => {
    const shown = formatAuditDate('2026-10-02 15:00:00');
    expect(shown).toBe(
      new Date('2026-10-02T15:00:00Z').toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    );
    expect(formatAuditDate('inválida')).toBe('inválida');
  });
});
