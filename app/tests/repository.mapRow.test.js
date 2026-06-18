
test('mapRow_converteCamposDoBanco', () => {
  const { mapRow } = require('../src/repos/lancamentoRepository');
  const row = mapRow({
    id: 1,
    descricao: 'Teste',
    data_lancamento: '2026-01-01',
    valor: '10.00',
    tipo_lancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  });
  expect(row.tipoLancamento).toBe('RECEITA');
  expect(row.dataLancamento).toBe('2026-01-01');
});
