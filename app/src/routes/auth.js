const express = require('express');
const usuarioRepository = require('../repos/usuarioRepository');
const { SESSION_USER } = require('../middleware/auth');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { login, senha } = req.body;
  try {
    const user = await usuarioRepository.findByLoginAndSenha(login, senha);
    if (!user) {
      return res.render('auth/login', { error: 'Login ou senha inválidos.' });
    }
    if (String(user.situacao).toUpperCase() !== 'ATIVO') {
      return res.render('auth/login', { error: 'Usuário inativo.' });
    }
    req.session[SESSION_USER] = user.login;
    return res.redirect('/lancamentos');
  } catch {
    return res.render('auth/login', { error: 'Erro ao autenticar.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
