
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_tipoNulo_naoDeveSerValido', () => {
  expect(
    validateLancamento({
      descricao: 'Teste',
      dataLancamento: '2026-01-01',
      valor: '10',
      tipoLancamento: null,
      situacao: 'EFETIVADO',
    }).length
  ).toBeGreaterThan(0);
});
