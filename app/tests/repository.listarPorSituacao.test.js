
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

test('repositorio_listarPorSituacao_retornaApenasEfetivados', async () => {
  const mockRows = [
    {
      id: 1,
      descricao: 'A',
      data_lancamento: '2026-01-01',
      valor: '10.00',
      tipo_lancamento: 'RECEITA',
      situacao: 'EFETIVADO',
    },
  ];
  pool.query.mockResolvedValueOnce({ rows: mockRows });

  const results = await lancamentoRepository.findBySituacao('EFETIVADO');

  expect(results).toHaveLength(1);
  expect(results[0].situacao).toBe('EFETIVADO');
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('WHERE situacao = $1'),
    ['EFETIVADO']
  );
});
