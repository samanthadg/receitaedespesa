const Situacao = Object.freeze({
  ATIVO: 'ATIVO',
  INATIVO: 'INATIVO',
  PENDENTE: 'PENDENTE',
  EFETIVADO: 'EFETIVADO',
  CANCELADO: 'CANCELADO',
});

const TipoLancamento = Object.freeze({
  RECEITA: 'RECEITA',
  DESPESA: 'DESPESA',
});

const SITUACOES_LANCAMENTO = [
  Situacao.EFETIVADO,
  Situacao.PENDENTE,
  Situacao.CANCELADO,
];

const CAMPOS_ORDENACAO_LANCAMENTO = new Set([
  'id',
  'descricao',
  'dataLancamento',
  'valor',
  'tipoLancamento',
  'situacao',
]);

const CAMPOS_ORDENACAO_USUARIO = new Set(['id', 'nome', 'login', 'email', 'situacao']);

const CAMPO_SQL_LANCAMENTO = {
  id: 'id',
  descricao: 'descricao',
  dataLancamento: 'data_lancamento',
  valor: 'valor',
  tipoLancamento: 'tipo_lancamento',
  situacao: 'situacao',
};

function parseSituacao(value) {
  if (!value || !String(value).trim()) return null;
  const v = String(value).trim();
  if (!Object.values(Situacao).includes(v)) return null;
  return v;
}

function parseSituacaoLancamento(value) {
  const s = parseSituacao(value);
  return s && SITUACOES_LANCAMENTO.includes(s) ? s : null;
}

function parseTipoLancamento(value) {
  if (!value || !String(value).trim()) return null;
  const v = String(value).trim();
  return Object.values(TipoLancamento).includes(v) ? v : null;
}

function isSituacaoLancamento(s) {
  return SITUACOES_LANCAMENTO.includes(s);
}

module.exports = {
  Situacao,
  TipoLancamento,
  SITUACOES_LANCAMENTO,
  CAMPOS_ORDENACAO_LANCAMENTO,
  CAMPOS_ORDENACAO_USUARIO,
  CAMPO_SQL_LANCAMENTO,
  parseSituacao,
  parseSituacaoLancamento,
  parseTipoLancamento,
  isSituacaoLancamento,
};
