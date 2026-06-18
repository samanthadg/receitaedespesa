
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
