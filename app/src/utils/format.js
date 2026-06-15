function formatDatePt(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateIso(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

function formatDecimal(valor) {
  if (valor == null) return '0,00';
  return Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDateOrNull(value) {
  if (!value || !String(value).trim()) return null;
  try {
    const d = new Date(String(value).trim());
    return Number.isNaN(d.getTime()) ? null : formatDateIso(d);
  } catch {
    return null;
  }
}

function shallowCopyLancamento(src) {
  return {
    id: src.id,
    descricao: src.descricao,
    dataLancamento: src.dataLancamento,
    valor: src.valor,
    tipoLancamento: src.tipoLancamento,
    situacao: src.situacao,
  };
}

function normalizeEmail(email) {
  if (email == null) return null;
  const v = String(email).trim();
  return v || null;
}

module.exports = {
  formatDatePt,
  formatDateIso,
  formatDecimal,
  parseDateOrNull,
  shallowCopyLancamento,
  normalizeEmail,
};
