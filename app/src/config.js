function parseDbUrl(raw) {
  if (!raw) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'lancamento_db',
      user: process.env.DB_USER || 'lancamento_user',
      password: process.env.DB_PASSWORD || 'lancamento_pass',
    };
  }

  if (raw.startsWith('jdbc:postgresql://')) {
    const withoutJdbc = raw.replace('jdbc:postgresql://', '');
    const [hostPort, database] = withoutJdbc.split('/');
    const [host, portStr] = hostPort.split(':');
    return {
      host,
      port: parseInt(portStr || '5432', 10),
      database,
      user: process.env.DB_USER || 'lancamento_user',
      password: process.env.DB_PASSWORD || 'lancamento_pass',
    };
  }

  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: parseInt(url.port || '5432', 10),
      database: url.pathname.replace(/^\//, ''),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  } catch {
    return parseDbUrl(null);
  }
}

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  appEnv: process.env.APP_ENV || 'Produção',
  sessionSecret: process.env.SESSION_SECRET || 'lancamento-dev-secret',
  db: parseDbUrl(process.env.DATABASE_URL || process.env.DB_URL),
  mail: {
    enabled: String(process.env.APP_MAIL_ENABLED || 'false').toLowerCase() === 'true',
    to: (process.env.APP_MAIL_TO || '').trim(),
    from: (process.env.APP_MAIL_FROM || process.env.SMTP_USER || '').trim(),
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '').trim(),
  },
  publicBaseUrl: normalizeBaseUrl(process.env.APP_PUBLIC_BASE_URL || ''),
};

function normalizeBaseUrl(url) {
  if (!url) return '';
  let v = url.trim();
  while (v.endsWith('/')) v = v.slice(0, -1);
  return v;
}

module.exports = { config, normalizeBaseUrl };
