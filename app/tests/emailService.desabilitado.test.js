
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
