
const { validateUsuario } = require('../src/domain/validation');
test('usuario_emailAcimaDe160Chars_naoDeveSerValido', () => {
  const u = {
    nome: 'Usuário',
    login: 'login',
    senha: 'senha',
    situacao: 'ATIVO',
    email: 'a'.repeat(161) + '@x.com',
    requireSenha: true,
  };
  expect(validateUsuario(u).length).toBeGreaterThan(0);
});
