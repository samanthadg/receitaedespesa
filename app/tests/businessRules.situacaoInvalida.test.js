
const { parseSituacaoLancamento } = require('../src/domain/constants');
test('lancamento_situacaoInvalida_lancaExcecao', () => {
  expect(() => parseSituacaoLancamento('SITUACAO_INVALIDA')).not.toThrow();
  expect(parseSituacaoLancamento('SITUACAO_INVALIDA')).toBeNull();
});
