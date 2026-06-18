
const { Situacao } = require('../src/domain/constants');
test('situacao_efetivado_existeNoEnum', () => {
  expect(Situacao.EFETIVADO).toBe('EFETIVADO');
  expect(Situacao.PENDENTE).toBe('PENDENTE');
  expect(Situacao.CANCELADO).toBe('CANCELADO');
});
