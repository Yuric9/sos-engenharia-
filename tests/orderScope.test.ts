import { describe, expect, it } from 'vitest';
import { orderScope, compactScopeValue, plainScopeValue } from '../src/lib/orderScope';
import type { WorkOrder } from '../src/types';

const order = (extra: Partial<WorkOrder> = {}) => ({
  id: 1,
  number: 1,
  openedAt: '2026-01-01T00:00:00.000Z',
  status: 'ABERTA',
  secretaria: 'Executivo',
  ...extra,
} as WorkOrder);

describe('orderScope', () => {
  it('normalizes accents and classifies Saúde', () => {
    expect(orderScope(order({ secretaria: 'SAÚDE' }))).toBe('SAUDE');
  });

  it('classifies Educação', () => {
    expect(orderScope(order({ secretaria: 'Secretaria de Educação' }))).toBe('EDUCACAO');
  });

  it('classifies Gabinete', () => {
    expect(orderScope(order({ secretaria: 'Gabinete do Prefeito' }))).toBe('GABINETE');
  });

  it('uses importOrigin when it is available', () => {
    expect(orderScope(order({ secretaria: 'Saúde', importOrigin: 'Executivo' }))).toBe('EXECUTIVO');
  });

  it('falls back to Executivo for unknown scopes', () => {
    expect(orderScope(order({ secretaria: 'Obras' }))).toBe('EXECUTIVO');
  });
});

describe('scope normalization helpers', () => {
  it('collapses whitespace and lowercases values', () => {
    expect(compactScopeValue('  Secretaria   de   SAÚDE  ')).toBe('secretaria de saúde');
  });

  it('removes accents for matching', () => {
    expect(plainScopeValue('Educação')).toBe('educacao');
  });
});
