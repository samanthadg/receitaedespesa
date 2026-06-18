
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_valorZero_naoDeveSerValido', () => {
  expect(
    validateLancamento({
      descricao: 'Teste',
      dataLancamento: '2026-01-01',
      valor: '0',
      tipoLancamento: 'RECEITA',
      situacao: 'EFETIVADO',
    }).length
  ).toBeGreaterThan(0);
});
