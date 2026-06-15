const express = require('express');
const lancamentoRepository = require('../repos/lancamentoRepository');
const usuarioRepository = require('../repos/usuarioRepository');
const emailService = require('../services/lancamentoEmailService');
const { exportPdf } = require('../web/lancamentoPdfExporter');
const { SESSION_USER } = require('../middleware/auth');
const { SITUACOES_LANCAMENTO, parseSituacaoLancamento } = require('../domain/constants');
const {
  formatDatePt,
  formatDateIso,
  parseDateOrNull,
  shallowCopyLancamento,
} = require('../utils/format');

const router = express.Router();

async function resolveToEmail(req) {
  const login = req.session?.[SESSION_USER];
  if (!login) return null;
  const u = await usuarioRepository.findByLogin(String(login).trim());
  if (!u?.email) return null;
  const email = String(u.email).trim();
  return email || null;
}

router.get('/', async (req, res) => {
  const campo = req.query.campo || 'dataLancamento';
  const direcao = req.query.direcao || 'desc';
  const dataDe = parseDateOrNull(req.query.dataDe) || '';
  const dataAte = parseDateOrNull(req.query.dataAte) || '';
  const situacao = parseSituacaoLancamento(req.query.situacao);
  const sitStr = situacao || '';

  const lancamentos = await lancamentoRepository.findAll({
    campo,
    direcao,
    dataDe: dataDe || null,
    dataAte: dataAte || null,
    situacao,
  });

  res.render('lancamentos/lista', {
    lancamentos,
    campo,
    direcao,
    dataDe,
    dataAte,
    situacao: sitStr,
    situacoes: SITUACOES_LANCAMENTO,
    formatDatePt,
    formatDecimal: (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  });
});

router.get('/export/pdf', async (req, res) => {
  const campo = req.query.campo || 'dataLancamento';
  const direcao = req.query.direcao || 'desc';
  const dataDe = parseDateOrNull(req.query.dataDe);
  const dataAte = parseDateOrNull(req.query.dataAte);
  const situacao = parseSituacaoLancamento(req.query.situacao);

  const lista = await lancamentoRepository.findAll({
    campo,
    direcao,
    dataDe,
    dataAte,
    situacao,
  });

  const pdf = await exportPdf(lista, dataDe, dataAte, situacao || '');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="lancamentos.pdf"');
  res.send(pdf);
});

router.post('/', async (req, res) => {
  try {
    const saved = await lancamentoRepository.save({
      descricao: String(req.body.descricao || '').trim(),
      dataLancamento: req.body.dataLancamento,
      valor: req.body.valor,
      tipoLancamento: req.body.tipoLancamento,
      situacao: req.body.situacao,
    });
    await emailService.onCreate(saved, await resolveToEmail(req));
    req.flash('msg', 'Lançamento adicionado com sucesso.');
  } catch {
    req.flash('erro', 'Não foi possível adicionar o lançamento.');
  }
  res.redirect('/lancamentos');
});

router.post('/:id/excluir', async (req, res) => {
  const lancamento = await lancamentoRepository.findById(req.params.id);
  if (!lancamento) {
    req.flash('erro', 'Lançamento não encontrado.');
    return res.redirect('/lancamentos');
  }
  const copia = shallowCopyLancamento(lancamento);
  await lancamentoRepository.deleteById(req.params.id);
  await emailService.onDelete(copia, await resolveToEmail(req));
  req.flash('msg', 'Lançamento excluído.');
  res.redirect('/lancamentos');
});

router.get('/:id/editar', async (req, res) => {
  const lancamento = await lancamentoRepository.findById(req.params.id);
  if (!lancamento) {
    req.flash('erro', 'Lançamento não encontrado.');
    return res.redirect('/lancamentos');
  }
  res.render('lancamentos/editar', {
    lancamento: {
      ...lancamento,
      dataLancamento: formatDateIso(lancamento.dataLancamento),
    },
  });
});

router.post('/:id', async (req, res) => {
  const lancamento = await lancamentoRepository.findById(req.params.id);
  if (!lancamento) {
    req.flash('erro', 'Lançamento não encontrado.');
    return res.redirect('/lancamentos');
  }

  try {
    const antes = shallowCopyLancamento(lancamento);
    const saved = await lancamentoRepository.save({
      id: lancamento.id,
      descricao: String(req.body.descricao || '').trim(),
      dataLancamento: req.body.dataLancamento,
      valor: req.body.valor,
      tipoLancamento: req.body.tipoLancamento,
      situacao: req.body.situacao,
    });
    await emailService.onUpdate(antes, saved, await resolveToEmail(req));
    req.flash('msg', 'Lançamento atualizado.');
    return res.redirect('/lancamentos');
  } catch {
    req.flash('erro', 'Não foi possível atualizar o lançamento.');
    return res.redirect(`/lancamentos/${req.params.id}/editar`);
  }
});

module.exports = router;
