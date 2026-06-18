
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_dataNula_naoDeveSerValido', () => {
  const l = {
    descricao: 'Teste',
    dataLancamento: null,
    valor: '10.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  };
  expect(validateLancamento(l).length).toBeGreaterThan(0);
});
