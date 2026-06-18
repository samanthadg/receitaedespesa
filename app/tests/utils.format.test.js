const {
  formatDatePt,
  formatDateIso,
  formatDecimal,
  parseDateOrNull,
  shallowCopyLancamento,
  normalizeEmail,
} = require('../src/utils/format');

test('formatDatePt formats date correctly', () => {
  expect(formatDatePt(null)).toBe('');
  const d = new Date('2026-05-10T12:00:00Z');
  expect(formatDatePt(d)).toContain('10/05/2026');
});

test('formatDateIso formats date correctly', () => {
  expect(formatDateIso(null)).toBe('');
  const d = new Date('2026-05-10T00:00:00.000Z');
  expect(formatDateIso(d)).toBe('2026-05-10');
});

test('formatDecimal formats decimal correctly', () => {
  expect(formatDecimal(null)).toBe('0,00');
  expect(formatDecimal(123.45)).toBe('123,45');
});

test('parseDateOrNull parses date correctly', () => {
  expect(parseDateOrNull(null)).toBeNull();
  expect(parseDateOrNull('   ')).toBeNull();
  expect(parseDateOrNull('invalid-date')).toBeNull();
  expect(parseDateOrNull('2026-05-10')).toBe('2026-05-10');
});

test('shallowCopyLancamento copies lancamento fields', () => {
  const src = {
    id: 1,
    descricao: 'Desc',
    dataLancamento: '2026-01-01',
    valor: 100,
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
    extra: 'extra'
  };
  const copy = shallowCopyLancamento(src);
  expect(copy).toEqual({
    id: 1,
    descricao: 'Desc',
    dataLancamento: '2026-01-01',
    valor: 100,
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  });
  expect(copy.extra).toBeUndefined();
});

test('normalizeEmail normalizes email correctly', () => {
  expect(normalizeEmail(null)).toBeNull();
  expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
  expect(normalizeEmail('   ')).toBeNull();
});
