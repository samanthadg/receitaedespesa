const nodemailer = require('nodemailer');
const { config } = require('../config');
const { SITUACOES_LANCAMENTO } = require('../domain/constants');

const LOCALE_PT_BR = 'pt-BR';
const DATA_PT = { day: '2-digit', month: '2-digit', year: 'numeric' };

function createEmailService(options = {}) {
  const enabled = options.enabled ?? config.mail.enabled;
  const fallbackTo = (options.fallbackTo ?? config.mail.to).trim();
  const from = (options.from ?? config.mail.from).trim();
  const smtpUser = (options.smtpUser ?? config.mail.user).trim();
  const smtpPass = (options.smtpPass ?? config.mail.pass).replace(/\s+/g, '').trim();
  const publicBaseUrl = normalizeBaseUrl(options.publicBaseUrl ?? config.publicBaseUrl);
  const mailSender = options.mailSender ?? null;

  function resolveTo(toOverride) {
    let to = normalizeEmail(toOverride);
    if (!to) to = normalizeEmail(fallbackTo);
    return to;
  }

  function smtpConfigured() {
    return smtpUser && smtpPass;
  }

  function resolveFromAddress() {
    if (from) return from;
    if (smtpUser) return smtpUser;
    return '';
  }

  async function sendHtml(subject, html, to) {
    const fromAddr = resolveFromAddress();
    if (!fromAddr) return;

    if (mailSender) {
      await mailSender.sendMail({ from: fromAddr, to, subject, html });
      return;
    }

    if (!smtpConfigured()) return;

    const transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    try {
      await transporter.sendMail({ from: fromAddr, to, subject, html });
    } catch (err) {
      console.warn(`Falha ao enviar e-mail (to=${to}, subject=${subject}): ${err.message}`);
    }
  }

  async function onCreate(l, to) {
    if (!enabled || !l || !smtpConfigured() && !mailSender) return;
    const recipient = resolveTo(to);
    if (!recipient) return;

    const moeda = new Intl.NumberFormat(LOCALE_PT_BR, { style: 'currency', currency: 'BRL' });
    const id = l.id == null ? '—' : String(l.id);
    const tipo = l.tipoLancamento || '—';
    const assunto = `Lançamento criado #${id} - ${tipo}`;
    const body =
      title('Novo lançamento registrado') +
      paragraph('Um lançamento foi <strong>criado</strong> no sistema.') +
      detailsTable(l, moeda) +
      optionalCta(publicBaseUrl);

    await sendHtml(assunto, wrapEmailHtml(body), recipient);
  }

  async function onUpdate(before, after, to) {
    if (!enabled || !after || !smtpConfigured() && !mailSender) return;
    const recipient = resolveTo(to);
    if (!recipient) return;

    const moeda = new Intl.NumberFormat(LOCALE_PT_BR, { style: 'currency', currency: 'BRL' });
    const oldSnap = snapshotFrom(before, moeda);
    const newSnap = snapshotFrom(after, moeda);
    const id = after.id == null ? '—' : String(after.id);
    const tipo = after.tipoLancamento || '—';
    const assunto = `Lançamento atualizado #${id} - ${tipo}`;
    const changes = diff(oldSnap, newSnap);
    const changesHtml =
      changes.length === 0
        ? mutedBox('Nenhuma alteração detectada (os valores enviados eram iguais aos já salvos).')
        : changesTable(changes);

    const body =
      title('Lançamento atualizado') +
      paragraph('Um lançamento foi <strong>atualizado</strong>. Abaixo estão as mudanças detectadas.') +
      changesHtml +
      subtitle('Estado atual') +
      detailsTable(after, moeda) +
      optionalCta(publicBaseUrl);

    await sendHtml(assunto, wrapEmailHtml(body), recipient);
  }

  async function onDelete(deleted, to) {
    if (!enabled || !deleted || !smtpConfigured() && !mailSender) return;
    const recipient = resolveTo(to);
    if (!recipient) return;

    const moeda = new Intl.NumberFormat(LOCALE_PT_BR, { style: 'currency', currency: 'BRL' });
    const id = deleted.id == null ? '—' : String(deleted.id);
    const tipo = deleted.tipoLancamento || '—';
    const assunto = `Lançamento excluído #${id} - ${tipo}`;
    const body =
      title('Lançamento excluído') +
      paragraph('Um lançamento foi <strong>excluído</strong> do sistema.') +
      subtitle('Dados do registro excluído') +
      detailsTable(deleted, moeda) +
      optionalCta(publicBaseUrl);

    await sendHtml(assunto, wrapEmailHtml(body), recipient);
  }

  return { onCreate, onUpdate, onDelete, resolveTo, smtpConfigured };
}

const defaultService = createEmailService();

function normalizeBaseUrl(url) {
  if (!url) return '';
  let v = String(url).trim();
  while (v.endsWith('/')) v = v.slice(0, -1);
  return v;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeEmail(email) {
  if (email == null) return null;
  const v = String(email).trim();
  return v ? v : null;
}

function formatDate(d) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('pt-BR', DATA_PT);
}

function snapshotFrom(l, moeda) {
  if (!l) return { id: '—', descricao: '—', data: '—', valor: '—', tipo: '—', situacao: '—' };
  return {
    id: l.id == null ? '—' : String(l.id),
    descricao: (l.descricao || '').trim() || '—',
    data: formatDate(l.dataLancamento),
    valor: l.valor == null ? '—' : moeda.format(Number(l.valor)),
    tipo: l.tipoLancamento || '—',
    situacao: l.situacao || '—',
  };
}

function diff(oldSnap, newSnap) {
  const out = [];
  for (const field of ['descricao', 'data', 'valor', 'tipo', 'situacao']) {
    if (oldSnap[field] !== newSnap[field]) {
      out.push({ field: labelFor(field), before: oldSnap[field], after: newSnap[field] });
    }
  }
  return out;
}

function labelFor(field) {
  const labels = { descricao: 'Descrição', data: 'Data', valor: 'Valor', tipo: 'Tipo', situacao: 'Situação' };
  return labels[field] || field;
}

function wrapEmailHtml(innerBody) {
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8" /></head>
<body style="margin:0;background:#f3f6fb;padding:22px 12px;font-family:Segoe UI,Tahoma,Arial,sans-serif;">
<div style="max-width:720px;margin:0 auto;"><div style="background:#fff;border:1px solid #dde6f0;border-radius:14px;overflow:hidden;">
<div style="padding:16px 18px;background:linear-gradient(135deg,#1b67b1,#155a9b);">
<div style="color:#eaf2ff;font-size:12px;font-weight:700;">LANÇAMENTOS</div>
<div style="color:#fff;font-size:18px;font-weight:800;margin-top:6px;">Notificação do sistema</div></div>
<div style="padding:18px;color:#1f2a37;font-size:15px;line-height:1.55;">${innerBody}
<div style="margin-top:18px;padding-top:14px;border-top:1px solid #edf1f5;color:#5b6977;font-size:12px;">
Este é um e-mail automático. Se você não reconhece esta ação, ignore esta mensagem.</div></div></div></div></body></html>`;
}

function title(text) {
  return `<div style="font-size:18px;font-weight:800;margin:0 0 10px;">${escapeHtml(text)}</div>`;
}

function subtitle(text) {
  return `<div style="font-size:14px;font-weight:800;margin:18px 0 10px;color:#2f4860;">${escapeHtml(text)}</div>`;
}

function paragraph(html) {
  return `<div style="margin:0 0 16px;color:#334e68;">${html}</div>`;
}

function mutedBox(text) {
  return `<div style="margin:0 0 16px;padding:12px;border:1px solid #dde6f0;background:#fbfdff;border-radius:12px;color:#52606d;font-size:14px;">${escapeHtml(text)}</div>`;
}

function row(k, v) {
  return `<tr><td style="padding:10px 12px;width:34%;background:#fbfdff;border-bottom:1px solid #edf1f5;color:#52606d;font-size:13px;font-weight:700;">${escapeHtml(k)}</td>
<td style="padding:10px 12px;border-bottom:1px solid #edf1f5;color:#1f2a37;font-size:14px;">${v}</td></tr>`;
}

function detailsTable(l, moeda) {
  const s = snapshotFrom(l, moeda);
  return `<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border:1px solid #edf1f5;border-radius:12px;">
${row('ID', escapeHtml(s.id))}${row('Descrição', escapeHtml(s.descricao))}${row('Data', escapeHtml(s.data))}
${row('Valor', escapeHtml(s.valor))}${row('Tipo', escapeHtml(s.tipo))}${row('Situação', escapeHtml(s.situacao))}</table>`;
}

function changesTable(changes) {
  let html = `<table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border:1px solid #edf1f5;border-radius:12px;margin:0 0 16px;">
<tr><td style="padding:10px 12px;background:#f7faff;font-weight:800;">Campo</td>
<td style="padding:10px 12px;background:#f7faff;font-weight:800;">Antes</td>
<td style="padding:10px 12px;background:#f7faff;font-weight:800;">Depois</td></tr>`;
  for (const c of changes) {
    html += `<tr><td style="padding:10px 12px;font-weight:700;">${escapeHtml(c.field)}</td>
<td style="padding:10px 12px;">${escapeHtml(c.before)}</td>
<td style="padding:10px 12px;font-weight:700;">${escapeHtml(c.after)}</td></tr>`;
  }
  return html + '</table>';
}

function optionalCta(publicBaseUrl) {
  if (!publicBaseUrl) return '';
  const href = `${publicBaseUrl}/lancamentos`;
  return `<div style="margin:18px 0 0;text-align:center;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#1b67b1;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;">Abrir lançamentos</a></div>`;
}

module.exports = {
  createEmailService,
  onCreate: (...args) => defaultService.onCreate(...args),
  onUpdate: (...args) => defaultService.onUpdate(...args),
  onDelete: (...args) => defaultService.onDelete(...args),
  escapeHtml,
  snapshotFrom,
  diff,
  SITUACOES_LANCAMENTO,
};
