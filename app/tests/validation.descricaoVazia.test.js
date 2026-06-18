
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_descricaoVazia_naoDeveSerValido', () => {
  const l = {
    descricao: '',
    dataLancamento: '2026-01-01',
    valor: '10.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  };
  expect(validateLancamento(l).length).toBeGreaterThan(0);
});
