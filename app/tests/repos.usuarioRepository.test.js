const usuarioRepository = require('../src/repos/usuarioRepository');
const { pool } = require('../src/db/pool');

jest.mock('../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

afterEach(() => {
  jest.clearAllMocks();
});

test('mapRow returns mapped user or null', () => {
  expect(usuarioRepository.mapRow(null)).toBeNull();
  const row = {
    id: 1,
    nome: 'Nome',
    login: 'login',
    email: 'email@example.com',
    senha: 'hash',
    situacao: 'ATIVO'
  };
  expect(usuarioRepository.mapRow(row)).toEqual(row);
});

test('findAll returns users sorted', async () => {
  const mockRows = [
    { id: 1, nome: 'User A', login: 'a', email: 'a@a.com', senha: 'pw', situacao: 'ATIVO' }
  ];
  pool.query.mockResolvedValueOnce({ rows: mockRows });

  const result = await usuarioRepository.findAll({ campo: 'nome', direcao: 'desc' });
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(1);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('ORDER BY nome DESC')
  );
});

test('findById returns single user', async () => {
  const mockUser = { id: 2, nome: 'User B', login: 'b', email: 'b@b.com', senha: 'pw', situacao: 'ATIVO' };
  pool.query.mockResolvedValueOnce({ rows: [mockUser] });

  const result = await usuarioRepository.findById(2);
  expect(result.nome).toBe('User B');
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('WHERE id = $1'),
    [2]
  );
});

test('findByLogin returns user by login', async () => {
  const mockUser = { id: 3, nome: 'User C', login: 'c', email: 'c@c.com', senha: 'pw', situacao: 'ATIVO' };
  pool.query.mockResolvedValueOnce({ rows: [mockUser] });

  const result = await usuarioRepository.findByLogin('c');
  expect(result.nome).toBe('User C');
});

test('findByLoginAndSenha returns user', async () => {
  const mockUser = { id: 4, nome: 'User D', login: 'd', email: 'd@d.com', senha: 'pw', situacao: 'ATIVO' };
  pool.query.mockResolvedValueOnce({ rows: [mockUser] });

  const result = await usuarioRepository.findByLoginAndSenha('d', 'pw');
  expect(result.nome).toBe('User D');
});

test('save inserts new user if no id', async () => {
  const mockUser = { id: 5, nome: 'New User', login: 'new', email: 'n@n.com', senha: 'pw', situacao: 'ATIVO' };
  pool.query.mockResolvedValueOnce({ rows: [mockUser] });

  const result = await usuarioRepository.save({
    nome: 'New User',
    login: 'new',
    email: 'n@n.com',
    senha: 'pw',
    situacao: 'ATIVO'
  });
  expect(result.id).toBe(5);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO usuario'),
    ['New User', 'new', 'n@n.com', 'pw', 'ATIVO']
  );
});

test('save updates user if id exists', async () => {
  const mockUser = { id: 6, nome: 'Updated User', login: 'up', email: 'u@u.com', senha: 'pw', situacao: 'ATIVO' };
  pool.query.mockResolvedValueOnce({ rows: [mockUser] });

  const result = await usuarioRepository.save({
    id: 6,
    nome: 'Updated User',
    login: 'up',
    email: 'u@u.com',
    senha: 'pw',
    situacao: 'ATIVO'
  });
  expect(result.id).toBe(6);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('UPDATE usuario SET'),
    ['Updated User', 'up', 'u@u.com', 'pw', 'ATIVO', 6]
  );
});

test('deleteById deletes user', async () => {
  pool.query.mockResolvedValueOnce({});
  await usuarioRepository.deleteById(7);
  expect(pool.query).toHaveBeenCalledWith(
    expect.stringContaining('DELETE FROM usuario WHERE id = $1'),
    [7]
  );
});
