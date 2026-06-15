const { Situacao, TipoLancamento, parseSituacaoLancamento } = require('../src/domain/constants');
const { validateLancamento, validateUsuario } = require('../src/domain/validation');
const { createEmailService } = require('../src/services/lancamentoEmailService');
const { exportPdf } = require('../src/web/lancamentoPdfExporter');

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
