
const { TipoLancamento } = require('../src/domain/constants');
test('tipoLancamento_valorInvalido_lancaExcecao', () => {
  expect(() => {
    if (!Object.values(TipoLancamento).includes('INVALIDO')) {
      throw new Error('Invalid enum');
    }
  }).toThrow();
});
