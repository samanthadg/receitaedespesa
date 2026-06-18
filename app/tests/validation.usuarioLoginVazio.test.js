
const { validateUsuario } = require('../src/domain/validation');
test('usuario_loginVazio_naoDeveSerValido', () => {
  const u = {
    nome: 'Usuário',
    login: '',
    senha: 'senha',
    situacao: 'ATIVO',
    email: 'user@example.com',
    requireSenha: true,
  };
  expect(validateUsuario(u).length).toBeGreaterThan(0);
});
