
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

test('repositorio_contarLancamentos_retornaTotalCorreto', async () => {
  pool.query.mockResolvedValueOnce({ rows: [{ count: '4' }] });
  
  const countVal = await lancamentoRepository.count();
  
  expect(countVal).toBe(4);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'));
});
