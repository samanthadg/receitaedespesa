
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_valorNegativo_naoDeveSerValido', () => {
  const l = {
    descricao: 'Teste',
    dataLancamento: '2026-01-01',
    valor: '-1.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  };
  expect(validateLancamento(l).length).toBeGreaterThan(0);
});
