
const lancamentoRepository = require('../src/repos/lancamentoRepository');
const { pool } = require('../src/db/pool');

jest.mock('../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

test('repositorio_salvarEBuscar_lancamentoEncontrado', async () => {
  const mockLancamento = {
    id: 1,
    descricao: 'Teste Repo',
    data_lancamento: '2026-01-01',
    valor: '100.00',
    tipo_lancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  };

  pool.query
    .mockResolvedValueOnce({ rows: [mockLancamento] })
    .mockResolvedValueOnce({ rows: [mockLancamento] });

  const saved = await lancamentoRepository.save({
    descricao: 'Teste Repo',
    dataLancamento: '2026-01-01',
    valor: '100.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  });

  const found = await lancamentoRepository.findById(saved.id);

  expect(saved.id).toBe(1);
  expect(found.descricao).toBe('Teste Repo');
  expect(pool.query).toHaveBeenCalledTimes(2);
});
