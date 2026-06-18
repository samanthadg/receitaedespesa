
const express = require('express');
const request = require('supertest');
const authRouter = require('../src/routes/auth');
const usuarioRepository = require('../src/repos/usuarioRepository');

jest.mock('../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

let testApp;

beforeAll(() => {
  testApp = express();
  testApp.use(express.urlencoded({ extended: true }));
  testApp.use(express.json());
  testApp.use((req, res, next) => {
    req.session = {
      destroy: (cb) => {
        if (cb) cb();
      }
    };
    next();
  });
  testApp.use((req, res, next) => {
    res.locals.appEnv = 'Teste';
    res.locals.msg = null;
    res.locals.erro = null;
    next();
  });
  const path = require('path');
  testApp.set('view engine', 'ejs');
  testApp.set('views', path.join(__dirname, '../views'));
  testApp.use('/', authRouter);
});

test('login_credenciaisValidas_redirecionaParaHome', async () => {
  jest.spyOn(usuarioRepository, 'findByLoginAndSenha').mockResolvedValueOnce({
    login: 'admin',
    situacao: 'ATIVO',
  });

  const response = await request(testApp)
    .post('/login')
    .send('login=admin&senha=123');

  expect(response.status).toBe(302);
  expect(response.headers.location).toBe('/lancamentos');
  expect(usuarioRepository.findByLoginAndSenha).toHaveBeenCalledWith('admin', '123');
});
