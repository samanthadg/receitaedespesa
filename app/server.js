const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { config } = require('./src/config');
const { migrate } = require('./src/db/migrate');
const { requireAuth } = require('./src/middleware/auth');
const authRoutes = require('./src/routes/auth');
const lancamentosRoutes = require('./src/routes/lancamentos');
const usuariosRoutes = require('./src/routes/usuarios');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);
app.use(flash());

app.use((req, res, next) => {
  res.locals.appEnv = config.appEnv;
  res.locals.msg = req.flash('msg')[0] || null;
  res.locals.erro = req.flash('erro')[0] || null;
  next();
});

app.get('/', (req, res) => res.redirect('/lancamentos'));

app.use('/', authRoutes);
app.use(requireAuth);
app.use('/lancamentos', lancamentosRoutes);
app.use('/usuarios', usuariosRoutes);

async function start() {
  await migrate();
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Falha ao iniciar:', err);
  process.exit(1);
});

module.exports = app;
