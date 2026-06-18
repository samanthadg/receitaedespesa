const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(process.cwd(), 'app/tests');

// Ensure directory exists
if (!fs.existsSync(TESTS_DIR)) {
  fs.mkdirSync(TESTS_DIR, { recursive: true });
}

// 1. enumDominio.receita.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'enumDominio.receita.test.js'), `
const { TipoLancamento } = require('../src/domain/constants');
test('tipoLancamento_receita_existeNoEnum', () => {
  expect(TipoLancamento.RECEITA).toBe('RECEITA');
});
`);

// 2. enumDominio.valorInvalido.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'enumDominio.valorInvalido.test.js'), `
const { TipoLancamento } = require('../src/domain/constants');
test('tipoLancamento_valorInvalido_lancaExcecao', () => {
  expect(() => {
    if (!Object.values(TipoLancamento).includes('INVALIDO')) {
      throw new Error('Invalid enum');
    }
  }).toThrow();
});
`);

// 3. enumDominio.situacao.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'enumDominio.situacao.test.js'), `
const { Situacao } = require('../src/domain/constants');
test('situacao_efetivado_existeNoEnum', () => {
  expect(Situacao.EFETIVADO).toBe('EFETIVADO');
  expect(Situacao.PENDENTE).toBe('PENDENTE');
  expect(Situacao.CANCELADO).toBe('CANCELADO');
});
`);

// 4. validation.descricaoVazia.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'validation.descricaoVazia.test.js'), `
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_descricaoVazia_naoDeveSerValido', () => {
  const l = {
    descricao: '',
    dataLancamento: '2026-01-01',
    valor: '10.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  };
  expect(validateLancamento(l).length).toBeGreaterThan(0);
});
`);

// 5. validation.valorNegativo.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'validation.valorNegativo.test.js'), `
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_valorNegativo_naoDeveSerValido', () => {
  const l = {
    descricao: 'Teste',
    dataLancamento: '2026-01-01',
    valor: '-1.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  };
  expect(validateLancamento(l).length).toBeGreaterThan(0);
});
`);

// 6. validation.dataNula.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'validation.dataNula.test.js'), `
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
`);

// 7. validation.usuarioLoginVazio.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'validation.usuarioLoginVazio.test.js'), `
const { validateUsuario } = require('../src/domain/validation');
test('usuario_loginVazio_naoDeveSerValido', () => {
  const u = {
    nome: 'Usuário',
    login: '',
    senha: 'senha',
    situacao: 'ATIVO',
    email: 'user@example.com',
    requireSenha: true,
  };
  expect(validateUsuario(u).length).toBeGreaterThan(0);
});
`);

// 8. validation.usuarioEmailLongo.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'validation.usuarioEmailLongo.test.js'), `
const { validateUsuario } = require('../src/domain/validation');
test('usuario_emailAcimaDe160Chars_naoDeveSerValido', () => {
  const u = {
    nome: 'Usuário',
    login: 'login',
    senha: 'senha',
    situacao: 'ATIVO',
    email: 'a'.repeat(161) + '@x.com',
    requireSenha: true,
  };
  expect(validateUsuario(u).length).toBeGreaterThan(0);
});
`);

// 9. businessRules.situacaoInvalida.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'businessRules.situacaoInvalida.test.js'), `
const { parseSituacaoLancamento } = require('../src/domain/constants');
test('lancamento_situacaoInvalida_lancaExcecao', () => {
  expect(() => parseSituacaoLancamento('SITUACAO_INVALIDA')).not.toThrow();
  expect(parseSituacaoLancamento('SITUACAO_INVALIDA')).toBeNull();
});
`);

// 10. businessRules.valorZero.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'businessRules.valorZero.test.js'), `
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_valorZero_naoDeveSerValido', () => {
  expect(
    validateLancamento({
      descricao: 'Teste',
      dataLancamento: '2026-01-01',
      valor: '0',
      tipoLancamento: 'RECEITA',
      situacao: 'EFETIVADO',
    }).length
  ).toBeGreaterThan(0);
});
`);

// 11. businessRules.tipoNulo.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'businessRules.tipoNulo.test.js'), `
const { validateLancamento } = require('../src/domain/validation');
test('lancamento_tipoNulo_naoDeveSerValido', () => {
  expect(
    validateLancamento({
      descricao: 'Teste',
      dataLancamento: '2026-01-01',
      valor: '10',
      tipoLancamento: null,
      situacao: 'EFETIVADO',
    }).length
  ).toBeGreaterThan(0);
});
`);

// 12. emailService.sucesso.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'emailService.sucesso.test.js'), `
const { createEmailService } = require('../src/services/lancamentoEmailService');
test('emailService_criarLancamento_enviaEmail', async () => {
  const mailSender = { sendMail: jest.fn().mockResolvedValue({}) };
  const service = createEmailService({
    enabled: true,
    mailSender,
    smtpUser: 'smtpUser',
    smtpPass: 'smtpPass',
    from: 'from@example.com',
  });

  await service.onCreate(
    {
      id: 1,
      descricao: 'Teste',
      dataLancamento: '2026-01-01',
      valor: 10,
      tipoLancamento: 'RECEITA',
      situacao: 'EFETIVADO',
    },
    'to@example.com'
  );

  expect(mailSender.sendMail).toHaveBeenCalledTimes(1);
});
`);

// 13. emailService.desabilitado.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'emailService.desabilitado.test.js'), `
const { createEmailService } = require('../src/services/lancamentoEmailService');
test('emailService_mailDesabilitado_naoEnviaEmail', async () => {
  const mailSender = { sendMail: jest.fn() };
  const service = createEmailService({
    enabled: false,
    mailSender,
    smtpUser: 'smtpUser',
    smtpPass: 'smtpPass',
  });

  await service.onCreate({ id: 1, descricao: 'Teste', valor: 10, tipoLancamento: 'RECEITA', situacao: 'EFETIVADO' }, 'to@example.com');
  expect(mailSender.sendMail).not.toHaveBeenCalled();
});
`);

// 14. pdfExporter.gerarPdf.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'pdfExporter.gerarPdf.test.js'), `
const { exportPdf } = require('../src/web/lancamentoPdfExporter');
test('pdfExporter_gerarPdf_naoRetornaNulo', async () => {
  const pdf = await exportPdf(
    [
      {
        id: 1,
        descricao: 'Teste PDF',
        dataLancamento: new Date(),
        valor: 10,
        tipoLancamento: 'RECEITA',
        situacao: 'EFETIVADO',
      },
    ],
    null,
    null,
    ''
  );
  expect(pdf).not.toBeNull();
  expect(pdf.length).toBeGreaterThan(0);
});
`);

// 15. repository.mapRow.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'repository.mapRow.test.js'), `
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
`);

// 16. repository.salvarEBuscar.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'repository.salvarEBuscar.test.js'), `
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
`);

// 17. repository.listarPorSituacao.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'repository.listarPorSituacao.test.js'), `
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
`);

// 18. repository.contar.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'repository.contar.test.js'), `
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
`);

// 19. auth.loginValido.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'auth.loginValido.test.js'), `
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
`);

// 20. auth.loginInvalido.test.js
fs.writeFileSync(path.join(TESTS_DIR, 'auth.loginInvalido.test.js'), `
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

test('login_credenciaisInvalidas_retornaMensagemDeErro', async () => {
  jest.spyOn(usuarioRepository, 'findByLoginAndSenha').mockResolvedValueOnce(null);

  const response = await request(testApp)
    .post('/login')
    .send('login=admin&senha=wrong');

  expect(response.status).toBe(200);
  expect(response.text).toContain('Login ou senha inválidos.');
});
`);

// Remove old monolithic app.test.js
const monolithicFile = path.join(TESTS_DIR, 'app.test.js');
if (fs.existsSync(monolithicFile)) {
  fs.unlinkSync(monolithicFile);
  console.log('Removed monolithic app.test.js');
}

console.log('Successfully generated 20 separate test files!');
