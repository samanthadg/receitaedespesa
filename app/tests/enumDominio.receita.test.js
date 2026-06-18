
const { TipoLancamento } = require('../src/domain/constants');
test('tipoLancamento_receita_existeNoEnum', () => {
  expect(TipoLancamento.RECEITA).toBe('RECEITA');
});
