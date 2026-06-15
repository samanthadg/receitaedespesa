const express = require('express');
const usuarioRepository = require('../repos/usuarioRepository');
const { SESSION_USER } = require('../middleware/auth');
const { normalizeEmail } = require('../utils/format');

const router = express.Router();

router.get('/', async (req, res) => {
  const campo = req.query.campo || 'nome';
  const direcao = req.query.direcao || 'asc';
  const usuarios = await usuarioRepository.findAll({ campo, direcao });
  res.render('usuarios/lista', { usuarios, campo, direcao });
});

router.post('/', async (req, res) => {
  const loginNorm = String(req.body.login || '').trim();
  const existing = await usuarioRepository.findByLogin(loginNorm);
  if (existing) {
    req.flash('erro', 'Já existe um usuário com esse login.');
    return res.redirect('/usuarios');
  }

  const emailNorm = normalizeEmail(req.body.email);
  if (!emailNorm) {
    req.flash('erro', 'O e-mail é obrigatório.');
    return res.redirect('/usuarios');
  }

  try {
    await usuarioRepository.save({
      nome: String(req.body.nome || '').trim(),
      login: loginNorm,
      email: emailNorm,
      senha: req.body.senha,
      situacao: String(req.body.situacao || '').trim(),
    });
    req.flash('msg', 'Usuário criado com sucesso.');
  } catch {
    req.flash('erro', 'Não foi possível criar o usuário.');
  }
  res.redirect('/usuarios');
});

router.get('/:id/editar', async (req, res) => {
  const usuario = await usuarioRepository.findById(req.params.id);
  if (!usuario) {
    req.flash('erro', 'Usuário não encontrado.');
    return res.redirect('/usuarios');
  }
  res.render('usuarios/editar', { usuario });
});

router.post('/:id', async (req, res) => {
  const usuario = await usuarioRepository.findById(req.params.id);
  if (!usuario) {
    req.flash('erro', 'Usuário não encontrado.');
    return res.redirect('/usuarios');
  }

  const loginNorm = String(req.body.login || '').trim();
  const outro = await usuarioRepository.findByLogin(loginNorm);
  if (outro && outro.id !== usuario.id) {
    req.flash('erro', 'Já existe um usuário com esse login.');
    return res.redirect(`/usuarios/${req.params.id}/editar`);
  }

  const emailNorm = normalizeEmail(req.body.email);
  if (!emailNorm) {
    req.flash('erro', 'O e-mail é obrigatório.');
    return res.redirect(`/usuarios/${req.params.id}/editar`);
  }

  try {
    usuario.nome = String(req.body.nome || '').trim();
    usuario.login = loginNorm;
    usuario.email = emailNorm;
    if (req.body.senha && String(req.body.senha).trim()) {
      usuario.senha = req.body.senha;
    }
    usuario.situacao = String(req.body.situacao || '').trim();
    await usuarioRepository.save(usuario);
    req.flash('msg', 'Usuário atualizado.');
    return res.redirect('/usuarios');
  } catch {
    req.flash('erro', 'Não foi possível atualizar o usuário.');
    return res.redirect(`/usuarios/${req.params.id}/editar`);
  }
});

router.post('/:id/excluir', async (req, res) => {
  const usuario = await usuarioRepository.findById(req.params.id);
  if (!usuario) {
    req.flash('erro', 'Usuário não encontrado.');
    return res.redirect('/usuarios');
  }

  const sessionLogin = req.session?.[SESSION_USER];
  if (sessionLogin && String(sessionLogin).toLowerCase() === String(usuario.login).toLowerCase()) {
    req.flash('erro', 'Você não pode excluir o usuário que está logado.');
    return res.redirect('/usuarios');
  }

  try {
    await usuarioRepository.deleteById(req.params.id);
    req.flash('msg', 'Usuário excluído.');
  } catch {
    req.flash('erro', 'Não foi possível excluir o usuário.');
  }
  res.redirect('/usuarios');
});

module.exports = router;
