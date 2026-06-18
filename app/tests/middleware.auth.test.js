const { requireAuth, SESSION_USER } = require('../src/middleware/auth');

test('requireAuth allows access to login, css, js paths without session', () => {
  const req = { path: '/login' };
  const res = { redirect: jest.fn() };
  const next = jest.fn();

  requireAuth(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(res.redirect).not.toHaveBeenCalled();

  const reqCss = { path: '/css/style.css' };
  const nextCss = jest.fn();
  requireAuth(reqCss, res, nextCss);
  expect(nextCss).toHaveBeenCalled();
});

test('requireAuth redirects to /login if no session exists', () => {
  const req = { path: '/dashboard', session: {} };
  const res = { redirect: jest.fn() };
  const next = jest.fn();

  requireAuth(req, res, next);
  expect(res.redirect).toHaveBeenCalledWith('/login');
  expect(next).not.toHaveBeenCalled();
});

test('requireAuth allows access if user is authenticated in session', () => {
  const req = {
    path: '/dashboard',
    session: {
      [SESSION_USER]: { login: 'admin' }
    }
  };
  const res = { redirect: jest.fn() };
  const next = jest.fn();

  requireAuth(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(res.redirect).not.toHaveBeenCalled();
});
