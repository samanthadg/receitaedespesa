const { pool } = require('../db/pool');
const { CAMPOS_ORDENACAO_USUARIO } = require('../domain/constants');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    login: row.login,
    email: row.email,
    senha: row.senha,
    situacao: row.situacao,
  };
}

const CAMPO_SQL = {
  id: 'id',
  nome: 'nome',
  login: 'login',
  email: 'email',
  situacao: 'situacao',
};

async function findAll({ campo = 'nome', direcao = 'asc' } = {}) {
  const campoOrdenacao = CAMPOS_ORDENACAO_USUARIO.has(campo) ? campo : 'nome';
  const col = CAMPO_SQL[campoOrdenacao];
  const dir = direcao === 'desc' ? 'DESC' : 'ASC';

  const { rows } = await pool.query(
    `SELECT id, nome, login, email, senha, situacao FROM usuario ORDER BY ${col} ${dir}, id ASC`
  );
  return rows.map(mapRow);
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, email, senha, situacao FROM usuario WHERE id = $1',
    [id]
  );
  return mapRow(rows[0]);
}

async function findByLogin(login) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, email, senha, situacao FROM usuario WHERE login = $1',
    [login]
  );
  return mapRow(rows[0]);
}

async function findByLoginAndSenha(login, senha) {
  const { rows } = await pool.query(
    'SELECT id, nome, login, email, senha, situacao FROM usuario WHERE login = $1 AND senha = $2',
    [login, senha]
  );
  return mapRow(rows[0]);
}

async function save(usuario) {
  if (usuario.id) {
    const { rows } = await pool.query(
      `UPDATE usuario SET nome = $1, login = $2, email = $3, senha = $4, situacao = $5
       WHERE id = $6 RETURNING id, nome, login, email, senha, situacao`,
      [usuario.nome, usuario.login, usuario.email, usuario.senha, usuario.situacao, usuario.id]
    );
    return mapRow(rows[0]);
  }

  const { rows } = await pool.query(
    `INSERT INTO usuario (nome, login, email, senha, situacao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, login, email, senha, situacao`,
    [usuario.nome, usuario.login, usuario.email, usuario.senha, usuario.situacao]
  );
  return mapRow(rows[0]);
}

async function deleteById(id) {
  await pool.query('DELETE FROM usuario WHERE id = $1', [id]);
}

module.exports = {
  findAll,
  findById,
  findByLogin,
  findByLoginAndSenha,
  save,
  deleteById,
  mapRow,
};
