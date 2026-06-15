const PDFDocument = require('pdfkit');
const { SITUACOES_LANCAMENTO, parseSituacaoLancamento } = require('../domain/constants');

const LOCALE_PT_BR = 'pt-BR';

function formatDate(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(LOCALE_PT_BR, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(valor) {
  if (valor == null) return '';
  return new Intl.NumberFormat(LOCALE_PT_BR, { style: 'currency', currency: 'BRL' }).format(Number(valor));
}

function filtrosText(dataDe, dataAte, situacao) {
  const geradoEm = formatDate(new Date());
  const temDe = !!dataDe;
  const temAte = !!dataAte;
  const temSit = situacao && String(situacao).trim();

  if (!temDe && !temAte && !temSit) return `Gerado em ${geradoEm}`;

  const parts = ['Filtros:'];
  if (temDe && !temAte) parts.push(`Data(s) a partir de ${formatDate(dataDe)}`);
  else if (!temDe && temAte) parts.push(`Data(s) até ${formatDate(dataAte)}`);
  else if (temDe && temAte) parts.push(`Data(s) entre ${formatDate(dataDe)} e ${formatDate(dataAte)}`);
  if (temSit) parts.push(`Situação: ${String(situacao).trim()}`);
  parts.push(`Gerado em ${geradoEm}`);
  return parts.join(' | ');
}

function exportPdf(lancamentos, dataDe, dataAte, situacao) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text('Relatório de Lançamentos');
    doc.fontSize(10).font('Helvetica').text(filtrosText(dataDe, dataAte, situacao));
    doc.moveDown(0.5);

    const headers = ['ID', 'Descrição', 'Data', 'Valor', 'Tipo', 'Situação'];
    const colWidths = [40, 220, 70, 80, 80, 80];
    const startX = doc.x;
    let y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9);
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], 18).fillAndStroke('#f7faff', '#dfe7ef');
      doc.fillColor('#2f4860').text(h, x + 4, y + 5, { width: colWidths[i] - 8, align: i === 1 ? 'left' : 'center' });
      x += colWidths[i];
    });
    y += 18;

    doc.font('Helvetica').fontSize(9).fillColor('#000');
    for (const l of lancamentos) {
      if (y > doc.page.height - 120) {
        doc.addPage({ layout: 'landscape', margin: 36 });
        y = doc.y;
      }
      const row = [
        l.id == null ? '' : String(l.id),
        l.descricao || '',
        formatDate(l.dataLancamento),
        formatMoney(l.valor),
        l.tipoLancamento || '',
        l.situacao || '',
      ];
      x = startX;
      row.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], 16).stroke('#edf1f5');
        doc.text(cell, x + 4, y + 4, { width: colWidths[i] - 8, align: i === 1 ? 'left' : 'center', lineBreak: false });
        x += colWidths[i];
      });
      y += 16;
    }

    doc.moveDown(2);
    addTotaisPorSituacao(doc, lancamentos, situacao);

    doc.end();
  });
}

function addTotaisPorSituacao(doc, lancamentos, situacaoFiltro) {
  const filtro = parseSituacaoLancamento(situacaoFiltro);
  const receitas = {};
  const despesas = {};
  for (const s of SITUACOES_LANCAMENTO) {
    receitas[s] = 0;
    despesas[s] = 0;
  }

  for (const l of lancamentos) {
    const sit = l.situacao;
    if (!SITUACOES_LANCAMENTO.includes(sit)) continue;
    const valor = Math.abs(Number(l.valor) || 0);
    if (l.tipoLancamento === 'RECEITA') receitas[sit] += valor;
    else if (l.tipoLancamento === 'DESPESA') despesas[sit] += valor;
  }

  const moeda = (v) => formatMoney(v);

  doc.font('Helvetica-Bold').fontSize(12).text('Totais por situação');
  doc.moveDown(0.3);

  if (!filtro) {
    for (const sit of SITUACOES_LANCAMENTO) {
      const rec = receitas[sit];
      const des = despesas[sit];
      doc.font('Helvetica-Bold').fontSize(10).text(`Situação: ${sit}`);
      doc.font('Helvetica').fontSize(9);
      doc.text(`Total de receitas: ${moeda(rec)}`);
      doc.text(`Total de despesas: ${moeda(des)}`);
      doc.text(`Saldo: ${moeda(rec - des)}`);
      doc.moveDown(0.5);
    }

    const comboRec = receitas.EFETIVADO + receitas.PENDENTE;
    const comboDes = despesas.EFETIVADO + despesas.PENDENTE;
    doc.font('Helvetica-Bold').fontSize(10).text('Total (EFETIVADO + PENDENTE)', { align: 'center' });
    doc.font('Helvetica').fontSize(9);
    doc.text(`Total de receitas: ${moeda(comboRec)}`, { align: 'center' });
    doc.text(`Total de despesas: ${moeda(comboDes)}`, { align: 'center' });
    doc.text(`Saldo: ${moeda(comboRec - comboDes)}`, { align: 'center' });
  } else {
    const rec = receitas[filtro];
    const des = despesas[filtro];
    doc.font('Helvetica-Bold').fontSize(10).text(`Situação: ${filtro}`, { align: 'center' });
    doc.font('Helvetica').fontSize(9);
    doc.text(`Total de receitas: ${moeda(rec)}`, { align: 'center' });
    doc.text(`Total de despesas: ${moeda(des)}`, { align: 'center' });
    doc.text(`Saldo: ${moeda(rec - des)}`, { align: 'center' });
  }
}

module.exports = { exportPdf, formatDate, formatMoney, filtrosText };
