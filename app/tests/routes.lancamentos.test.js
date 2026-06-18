const express = require('express');
const request = require('supertest');
const lancamentosRouter = require('../src/routes/lancamentos');
const lancamentoRepository = require('../src/repos/lancamentoRepository');
const usuarioRepository = require('../src/repos/usuarioRepository');
const emailService = require('../src/services/lancamentoEmailService');
const pdfExporter = require('../src/web/lancamentoPdfExporter');

jest.mock('../src/repos/lancamentoRepository');
jest.mock('../src/repos/usuarioRepository');
jest.mock('../src/services/lancamentoEmailService');
jest.mock('../src/web/lancamentoPdfExporter');

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
  testApp.use('/lancamentos', lancamentosRouter);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('GET /lancamentos lists lancamentos', async () => {
  lancamentoRepository.findAll.mockResolvedValueOnce([{ id: 1, descricao: 'L1' }]);
  const res = await request(testApp).get('/lancamentos');
  expect(res.status).toBe(200);
  expect(res.body.view).toBe('lancamentos/lista');
  expect(res.body.data.lancamentos).toHaveLength(1);
});

test('GET /lancamentos/export/pdf returns pdf file', async () => {
  lancamentoRepository.findAll.mockResolvedValueOnce([]);
  pdfExporter.exportPdf.mockResolvedValueOnce(Buffer.from('PDF_CONTENT'));
  const res = await request(testApp).get('/lancamentos/export/pdf');
  expect(res.status).toBe(200);
  expect(res.header['content-type']).toBe('application/pdf');
});

test('POST /lancamentos creates lancamento', async () => {
  const mockLancamento = { id: 10, descricao: 'L10', valor: '50.00' };
  lancamentoRepository.save.mockResolvedValueOnce(mockLancamento);
  usuarioRepository.findByLogin.mockResolvedValueOnce({ email: 'admin@example.com' });
  emailService.onCreate.mockResolvedValueOnce({});

  const res = await request(testApp)
    .post('/lancamentos')
    .send('descricao=Nova&dataLancamento=2026-06-01&valor=50.00&tipoLancamento=RECEITA&situacao=EFETIVADO');
  expect(res.status).toBe(302);
  expect(lancamentoRepository.save).toHaveBeenCalled();
});

test('POST /lancamentos/:id/excluir deletes lancamento', async () => {
  const mockLancamento = { id: 20, descricao: 'L20', valor: '30.00' };
  lancamentoRepository.findById.mockResolvedValueOnce(mockLancamento);
  lancamentoRepository.deleteById.mockResolvedValueOnce({});
  usuarioRepository.findByLogin.mockResolvedValueOnce({ email: 'admin@example.com' });
  emailService.onDelete.mockResolvedValueOnce({});

  const res = await request(testApp).post('/lancamentos/20/excluir');
  expect(res.status).toBe(302);
  expect(lancamentoRepository.deleteById).toHaveBeenCalledWith('20');
});

test('GET /lancamentos/:id/editar edits lancamento', async () => {
  const mockLancamento = { id: 30, descricao: 'L30', dataLancamento: '2026-06-01' };
  lancamentoRepository.findById.mockResolvedValueOnce(mockLancamento);
  const res = await request(testApp).get('/lancamentos/30/editar');
  expect(res.status).toBe(200);
  expect(res.body.view).toBe('lancamentos/editar');
});

test('POST /lancamentos/:id updates lancamento', async () => {
  const mockLancamento = { id: 40, descricao: 'L40', valor: '10.00' };
  lancamentoRepository.findById.mockResolvedValueOnce(mockLancamento);
  lancamentoRepository.save.mockResolvedValueOnce(mockLancamento);
  usuarioRepository.findByLogin.mockResolvedValueOnce({ email: 'admin@example.com' });
  emailService.onUpdate.mockResolvedValueOnce({});

  const res = await request(testApp)
    .post('/lancamentos/40')
    .send('descricao=Updated&dataLancamento=2026-06-02&valor=15.00&tipoLancamento=RECEITA&situacao=EFETIVADO');
  expect(res.status).toBe(302);
  expect(lancamentoRepository.save).toHaveBeenCalled();
});
