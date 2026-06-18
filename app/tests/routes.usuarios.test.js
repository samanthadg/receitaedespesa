const express = require('express');
const request = require('supertest');
const usuariosRouter = require('../src/routes/usuarios');
const usuarioRepository = require('../src/repos/usuarioRepository');

jest.mock('../src/repos/usuarioRepository');

let testApp;
beforeAll(() => {
  testApp = express();
  testApp.use(express.urlencoded({ extended: true }));
  testApp.use(express.json());
  testApp.use((req, res, next) => {
    req.session = { AUTH_USER: 'admin' };
    req.flash = jest.fn();
    next();
  });
  testApp.use((req, res, next) => {
    res.render = (view, data) => res.status(200).send({ view, data });
    next();
  });
  testApp.use('/usuarios', usuariosRouter);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('GET /usuarios lists users', async () => {
  usuarioRepository.findAll.mockResolvedValueOnce([{ id: 1, nome: 'User A' }]);
  const res = await request(testApp).get('/usuarios');
  expect(res.status).toBe(200);
  expect(res.body.view).toBe('usuarios/lista');
  expect(res.body.data.usuarios).toHaveLength(1);
});

test('POST /usuarios creates user successfully', async () => {
  usuarioRepository.findByLogin.mockResolvedValueOnce(null);
  usuarioRepository.save.mockResolvedValueOnce({ id: 1 });
  const res = await request(testApp)
    .post('/usuarios')
    .send('nome=New&login=newuser&email=new@example.com&senha=pw&situacao=ATIVO');
  expect(res.status).toBe(302);
  expect(usuarioRepository.save).toHaveBeenCalled();
});

test('POST /usuarios fails if login exists', async () => {
  usuarioRepository.findByLogin.mockResolvedValueOnce({ id: 1 });
  const res = await request(testApp)
    .post('/usuarios')
    .send('login=newuser&email=new@example.com');
  expect(res.status).toBe(302);
  expect(usuarioRepository.save).not.toHaveBeenCalled();
});

test('GET /usuarios/:id/editar edits user', async () => {
  usuarioRepository.findById.mockResolvedValueOnce({ id: 2, nome: 'User B' });
  const res = await request(testApp).get('/usuarios/2/editar');
  expect(res.status).toBe(200);
  expect(res.body.view).toBe('usuarios/editar');
});

test('POST /usuarios/:id updates user successfully', async () => {
  usuarioRepository.findById.mockResolvedValueOnce({ id: 3, login: 'old' });
  usuarioRepository.findByLogin.mockResolvedValueOnce(null);
  const res = await request(testApp)
    .post('/usuarios/3')
    .send('nome=Updated&login=newlogin&email=up@example.com&senha=pw&situacao=ATIVO');
  expect(res.status).toBe(302);
  expect(usuarioRepository.save).toHaveBeenCalled();
});

test('POST /usuarios/:id/excluir deletes user', async () => {
  usuarioRepository.findById.mockResolvedValueOnce({ id: 4, login: 'other' });
  const res = await request(testApp).post('/usuarios/4/excluir');
  expect(res.status).toBe(302);
  expect(usuarioRepository.deleteById).toHaveBeenCalledWith('4');
});
