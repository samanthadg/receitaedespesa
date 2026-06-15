const { pool } = require('../db/pool');
const {
  CAMPO_SQL_LANCAMENTO,
  CAMPOS_ORDENACAO_LANCAMENTO,
} = require('../domain/constants');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    descricao: row.descricao,
    dataLancamento: row.data_lancamento,
    valor: row.valor,
    tipoLancamento: row.tipo_lancamento,
    situacao: row.situacao,
  };
}

async function findAll({ campo = 'dataLancamento', direcao = 'desc', dataDe, dataAte, situacao } = {}) {
  const campoOrdenacao = CAMPOS_ORDENACAO_LANCAMENTO.has(campo) ? campo : 'dataLancamento';
  const col = CAMPO_SQL_LANCAMENTO[campoOrdenacao];
  const dir = direcao === 'asc' ? 'ASC' : 'DESC';

  const conditions = [];
  const params = [];
  let idx = 1;

  if (dataDe) {
    conditions.push(`data_lancamento >= $${idx++}`);
    params.push(dataDe);
  }
  if (dataAte) {
    conditions.push(`data_lancamento <= $${idx++}`);
    params.push(dataAte);
  }
  if (situacao) {
    conditions.push(`situacao = $${idx++}`);
    params.push(situacao);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT id, descricao, data_lancamento, valor, tipo_lancamento, situacao
    FROM lancamento
    ${where}
    ORDER BY ${col} ${dir}, id ASC
  `;

  const { rows } = await pool.query(sql, params);
  return rows.map(mapRow);
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, descricao, data_lancamento, valor, tipo_lancamento, situacao FROM lancamento WHERE id = $1',
    [id]
  );
  return mapRow(rows[0]);
}

async function save(lancamento) {
  if (lancamento.id) {
    const { rows } = await pool.query(
      `UPDATE lancamento SET descricao = $1, data_lancamento = $2, valor = $3,
       tipo_lancamento = $4, situacao = $5 WHERE id = $6
       RETURNING id, descricao, data_lancamento, valor, tipo_lancamento, situacao`,
      [
        lancamento.descricao,
        lancamento.dataLancamento,
        lancamento.valor,
        lancamento.tipoLancamento,
        lancamento.situacao,
        lancamento.id,
      ]
    );
    return mapRow(rows[0]);
  }

  const { rows } = await pool.query(
    `INSERT INTO lancamento (descricao, data_lancamento, valor, tipo_lancamento, situacao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, descricao, data_lancamento, valor, tipo_lancamento, situacao`,
    [
      lancamento.descricao,
      lancamento.dataLancamento,
      lancamento.valor,
      lancamento.tipoLancamento,
      lancamento.situacao,
    ]
  );
  return mapRow(rows[0]);
}

async function deleteById(id) {
  await pool.query('DELETE FROM lancamento WHERE id = $1', [id]);
}

async function findBySituacao(situacao) {
  const { rows } = await pool.query(
    'SELECT id, descricao, data_lancamento, valor, tipo_lancamento, situacao FROM lancamento WHERE situacao = $1',
    [situacao]
  );
  return rows.map(mapRow);
}

module.exports = { findAll, findById, save, deleteById, findBySituacao, mapRow };
