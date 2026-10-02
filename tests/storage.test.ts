import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextOrderNumber, recalcOverdue } from '../src/lib/storage';
import type { WorkOrder } from '../src/types';

const order = (extra: Partial<WorkOrder> = {}) =>
  ({
    id: 1,
    number: 1,
    status: 'ABERTA',
    attended: false,
    deadline: '2026-03-10',
    overdueDays: 0,
    ...extra,
  }) as WorkOrder;

describe('recalcOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T10:00:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('conta os dias de atraso depois do prazo', () => {
    expect(recalcOverdue(order()).overdueDays).toBe(5);
  });

  it('não conta atraso no próprio dia do prazo', () => {
    expect(recalcOverdue(order({ deadline: '2026-03-15' })).overdueDays).toBe(0);
  });

  it.each(['ATENDIDA', 'CONCLUIDA', 'CANCELADA'] as const)('zera o atraso quando %s', (status) => {
    expect(recalcOverdue(order({ status, overdueDays: 9 })).overdueDays).toBe(0);
  });

  it('zera o atraso quando a O.S. foi marcada como atendida', () => {
    expect(recalcOverdue(order({ attended: true })).overdueDays).toBe(0);
  });

  it('ignora prazo inválido', () => {
    expect(recalcOverdue(order({ deadline: '' })).overdueDays).toBe(0);
  });
});

describe('nextOrderNumber', () => {
  it('retorna o maior número + 1', () => {
    expect(nextOrderNumber([order({ number: 3 }), order({ number: 10 })])).toBe(11);
  });

  it('começa em 1 quando não há O.S.', () => {
    expect(nextOrderNumber([])).toBe(1);
  });
});
