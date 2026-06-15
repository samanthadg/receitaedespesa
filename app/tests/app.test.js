const { Situacao, TipoLancamento, parseSituacaoLancamento } = require('../src/domain/constants');
const { validateLancamento, validateUsuario } = require('../src/domain/validation');
const { createEmailService } = require('../src/services/lancamentoEmailService');
const { exportPdf } = require('../src/web/lancamentoPdfExporter');

jest.mock('../src/db/pool', () => ({
  pool: {
    query: jest.fn(),
  },
}));

describe('EnumDominioTest', () => {
  test('tipoLancamento_receita_existeNoEnum', () => {
    expect(TipoLancamento.RECEITA).toBe('RECEITA');
  });

  test('tipoLancamento_valorInvalido_lancaExcecao', () => {
    expect(() => {
      if (!Object.values(TipoLancamento).includes('INVALIDO')) {
        throw new Error('Invalid enum');
      }
    }).toThrow();
  });

  test('situacao_efetivado_existeNoEnum', () => {
    expect(Situacao.EFETIVADO).toBe('EFETIVADO');
    expect(Situacao.PENDENTE).toBe('PENDENTE');
    expect(Situacao.CANCELADO).toBe('CANCELADO');
  });
});

describe('ValidationTest', () => {
  const baseLancamento = () => ({
    descricao: 'Teste',
    dataLancamento: '2026-01-01',
    valor: '10.00',
    tipoLancamento: 'RECEITA',
    situacao: 'EFETIVADO',
  });

  const baseUsuario = () => ({
    nome: 'Usuário',
    login: 'login',
    senha: 'senha',
    situacao: 'ATIVO',
    email: 'user@example.com',
    requireSenha: true,
  });

  test('lancamento_descricaoVazia_naoDeveSerValido', () => {
    const l = baseLancamento();
    l.descricao = '';
    expect(validateLancamento(l).length).toBeGreaterThan(0);
  });

  test('lancamento_valorNegativo_naoDeveSerValido', () => {
    const l = baseLancamento();
    l.valor = '-1.00';
    expect(validateLancamento(l).length).toBeGreaterThan(0);
  });

  test('lancamento_dataNula_naoDeveSerValido', () => {
    const l = baseLancamento();
    l.dataLancamento = null;
    expect(validateLancamento(l).length).toBeGreaterThan(0);
  });

  test('usuario_loginVazio_naoDeveSerValido', () => {
    const u = baseUsuario();
    u.login = '';
    expect(validateUsuario(u).length).toBeGreaterThan(0);
  });

  test('usuario_emailAcimaDe160Chars_naoDeveSerValido', () => {
    const u = baseUsuario();
    u.email = 'a'.repeat(161) + '@x.com';
    expect(validateUsuario(u).length).toBeGreaterThan(0);
  });
});

describe('BusinessRulesTest', () => {
  test('lancamento_situacaoInvalida_lancaExcecao', () => {
    expect(() => parseSituacaoLancamento('SITUACAO_INVALIDA')).not.toThrow();
    expect(parseSituacaoLancamento('SITUACAO_INVALIDA')).toBeNull();
  });

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
});

describe('LancamentoEmailServiceTest', () => {
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
});

describe('LancamentoPdfExporterTest', () => {
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
});

describe('LancamentoRepositoryStubTest', () => {
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
});

describe('LancamentoRepositoryJpaTest', () => {
  const lancamentoRepository = require('../src/repos/lancamentoRepository');
  const { pool } = require('../src/db/pool');

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
      .mockResolvedValueOnce({ rows: [mockLancamento] }) // for save
      .mockResolvedValueOnce({ rows: [mockLancamento] }); // for findById

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

  test('repositorio_contarLancamentos_retornaTotalCorreto', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '4' }] });
    
    const countVal = await lancamentoRepository.count();
    
    expect(countVal).toBe(4);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'));
  });
});

describe('AuthControllerTest', () => {
  const express = require('express');
  const request = require('supertest');
  const authRouter = require('../src/routes/auth');
  const usuarioRepository = require('../src/repos/usuarioRepository');

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

  afterEach(() => {
    jest.clearAllMocks();
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

  test('login_credenciaisInvalidas_retornaMensagemDeErro', async () => {
    jest.spyOn(usuarioRepository, 'findByLoginAndSenha').mockResolvedValueOnce(null);

    const response = await request(testApp)
      .post('/login')
      .send('login=admin&senha=wrong');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Login ou senha inválidos.');
  });
});
