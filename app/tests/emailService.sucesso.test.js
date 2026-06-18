
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
