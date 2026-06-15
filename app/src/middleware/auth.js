const SESSION_USER = 'AUTH_USER';

function requireAuth(req, res, next) {
  const path = req.path;
  if (path.startsWith('/login') || path.startsWith('/css') || path.startsWith('/js')) {
    return next();
  }

  if (req.session && req.session[SESSION_USER]) {
    return next();
  }

  return res.redirect('/login');
}

module.exports = { SESSION_USER, requireAuth };
