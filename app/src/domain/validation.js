function validateLancamento(data) {
  const errors = [];
  const descricao = (data.descricao || '').trim();
  if (!descricao) errors.push('descricao');
  if (descricao.length > 200) errors.push('descricao');

  if (!data.dataLancamento) errors.push('dataLancamento');

  const valor = parseFloat(data.valor);
  if (Number.isNaN(valor) || valor < 0) errors.push('valor');

  if (!data.tipoLancamento) errors.push('tipoLancamento');
  if (!data.situacao) errors.push('situacao');

  return errors;
}

function validateUsuario(data) {
  const errors = [];
  if (!(data.nome || '').trim()) errors.push('nome');
  if (!(data.login || '').trim()) errors.push('login');
  if (!(data.senha || '').trim() && data.requireSenha !== false) errors.push('senha');

  const email = (data.email || '').trim();
  if (!email) errors.push('email');
  if (email.length > 160) errors.push('email');

  if (!(data.situacao || '').trim()) errors.push('situacao');
  return errors;
}

module.exports = { validateLancamento, validateUsuario };
