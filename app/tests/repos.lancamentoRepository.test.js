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

test('findAll with conditions (dataDe, dataAte, situacao) works correctly', async () => {
  pool.query.mockResolvedValueOnce({ rows: [] });
  const result = await lancamentoRepository.findAll({
    dataDe: '2026-01-01',
    dataAte: '2026-12-31',
    situacao: 'EFETIVADO'
  });
  expect(result).toEqual([]);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('data_lancamento >= $1 AND data_lancamento <= $2 AND situacao = $3'),
    ['2026-01-01', '2026-12-31', 'EFETIVADO']
  );
});

test('save updates lancamento if id exists', async () => {
  const mockLanc = { id: 10, descricao: 'Updated', data_lancamento: '2026-01-01', valor: '100.00', tipo_lancamento: 'RECEITA', situacao: 'EFETIVADO' };
  pool.query.mockResolvedValueOnce({ rows: [mockLanc] });

  const result = await lancamentoRepository.save({
    id: 10,
    descricao: 'Updated',
    dataLancamento: '2026-01-01',
    valor: '100.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO'
  });
  expect(result.id).toBe(10);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('UPDATE lancamento SET'),
    ['Updated', '2026-01-01', '100.00', 'RECEITA', 'EFETIVADO', 10]
  );
});

test('deleteById executes query', async () => {
  pool.query.mockResolvedValueOnce({});
  await lancamentoRepository.deleteById(15);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('DELETE FROM lancamento WHERE id = $1'),
    [15]
  );
});
