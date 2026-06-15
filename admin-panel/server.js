const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8080;
const WORK_DIR = '/opt/lancamento';
const CHANGE_LOG_PATH = path.join(WORK_DIR, 'change_log.json');

const sessions = new Map();

app.use(express.json());

// Parse cookies
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie || '';
  req.cookies = {};
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) req.cookies[k] = v;
  });
  next();
});

// Login endpoint - validates against production database
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios.' });
  }

  // Query prod-db to validate user credentials
  const query = `SELECT login, nome FROM usuario WHERE login='${username.replace(/'/g, "''")}' AND senha='${password.replace(/'/g, "''")}' AND situacao='ATIVO' LIMIT 1`;
  const cmd = `docker exec prod-db psql -U lancamento_user -d lancamento_db -t -A -c "${query}"`;

  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Erro ao conectar com o banco de produção.' });
    }

    const result = stdout.trim();
    if (result) {
      const [login, nome] = result.split('|');
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { user: login, nome: nome || login, created: Date.now() });
      res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Strict`);
      return res.json({ success: true, user: nome || login });
    }

    res.status(401).json({ success: false, error: 'Usuário ou senha inválidos.' });
  });
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  const token = req.cookies.session;
  if (token) sessions.delete(token);
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0');
  res.json({ success: true });
});

// Serve login page
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Root redirect
app.get('/', (req, res) => {
  const token = req.cookies.session;
  if (token && sessions.has(token)) {
    return res.redirect('/dashboard.html');
  }
  res.redirect('/login.html');
});

// Auth middleware for everything except login
function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (token && sessions.has(token)) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  res.redirect('/login.html');
}

// Protect dashboard and API
app.use('/dashboard.html', requireAuth, express.static(path.join(__dirname, 'public')));
app.get('/dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});
app.use('/api', requireAuth);

// Serve static files (login.html accessible without auth)
app.use(express.static(path.join(__dirname, 'public')));

// Helper to check if file exists
function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch (e) {
    return false;
  }
}

// Endpoint status dos containers
app.get('/api/status', (req, res) => {
  exec('docker ps --format "{{.Names}}:{{.Status}}"', { cwd: WORK_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: err.message, stderr });
    }

    const lines = stdout.split('\n').filter(Boolean);
    const statuses = {
      admin: 'stopped',
      homologDb: 'stopped',
      homologApp: 'stopped',
      prodDb: 'stopped',
      prodApp: 'stopped'
    };

    lines.forEach(line => {
      const [name, status] = line.split(':');
      const isRunning = status.toLowerCase().includes('up');
      if (name.includes('lancamento-admin')) statuses.admin = isRunning ? 'running' : 'stopped';
      if (name.includes('homolog-db')) statuses.homologDb = isRunning ? 'running' : 'stopped';
      if (name.includes('homolog-app')) statuses.homologApp = isRunning ? 'running' : 'stopped';
      if (name.includes('prod-db')) statuses.prodDb = isRunning ? 'running' : 'stopped';
      if (name.includes('prod-app')) statuses.prodApp = isRunning ? 'running' : 'stopped';
    });

    res.json(statuses);
  });
});

// Endpoint registrar mudança (Fase A)
app.post('/api/change-log', (req, res) => {
  const { description, author } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Descrição é obrigatória' });
  }

  let logs = [];
  if (fileExists(CHANGE_LOG_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(CHANGE_LOG_PATH, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }

  const newLog = {
    id: logs.length + 1,
    timestamp: new Date().toISOString(),
    author: author || 'desenvolvedor',
    description
  };

  logs.push(newLog);
  fs.writeFileSync(CHANGE_LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');

  res.json({ success: true, log: newLog });
});

// Endpoint obter mudanças registradas
app.get('/api/change-log', (req, res) => {
  let logs = [];
  if (fileExists(CHANGE_LOG_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(CHANGE_LOG_PATH, 'utf8'));
    } catch (e) {
      logs = [];
    }
  }
  res.json(logs);
});

// Endpoint para comandos simples de controle
app.post('/api/control', (req, res) => {
  const { action } = req.body; // 'start-all', 'stop-all', 'start-homolog', 'stop-homolog', 'start-prod', 'stop-prod'
  let cmd = '';

  if (action === 'start-all') {
    cmd = 'docker compose up -d';
  } else if (action === 'stop-all') {
    cmd = 'docker compose stop homolog-db homolog-app prod-db prod-app';
  } else if (action === 'start-homolog') {
    cmd = 'docker compose start homolog-db homolog-app';
  } else if (action === 'stop-homolog') {
    cmd = 'docker compose stop homolog-db homolog-app';
  } else if (action === 'start-prod') {
    cmd = 'docker compose start prod-db prod-app';
  } else if (action === 'stop-prod') {
    cmd = 'docker compose stop prod-db prod-app';
  } else {
    return res.status(400).json({ error: 'Ação inválida' });
  }

  exec(cmd, { cwd: WORK_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: err.message, stderr });
    }
    res.json({ success: true, stdout, stderr });
  });
});

// Endpoint SSE para streaming do pipeline de CI/CD e testes
app.get('/api/pipeline', (req, res) => {
  const { action } = req.query; // 'ci' (build + test + pmd), 'deploy-homolog', 'deploy-prod'
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendLog = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  let child;
  
  if (action === 'ci') {
    sendLog('info', '🔄 Iniciando pipeline de CI (Instalação, Testes e Cobertura)...');
    
    const command = 'docker';
    const args = [
      'run', '--rm',
      '-v', '/opt/lancamento/app:/workspace',
      '-w', '/workspace',
      'node:20-alpine',
      'sh', '-c', 'npm ci && npm test'
    ];
    
    sendLog('info', `Executando: ${command} ${args.join(' ')}`);
    child = spawn(command, args, { cwd: WORK_DIR });
    
  } else if (action === 'deploy-homolog') {
    sendLog('info', '🚀 Iniciando deploy no ambiente de Homologação...');
    const command = 'docker';
    const args = ['compose', 'up', '-d', '--build', 'homolog-app'];
    
    sendLog('info', `Executando: ${command} ${args.join(' ')}`);
    child = spawn(command, args, { cwd: WORK_DIR });
    
  } else if (action === 'deploy-prod') {
    sendLog('info', '🚀 Iniciando deploy no ambiente de Produção...');
    const command = 'docker';
    const args = ['compose', 'up', '-d', '--build', 'prod-app'];
    
    sendLog('info', `Executando: ${command} ${args.join(' ')}`);
    child = spawn(command, args, { cwd: WORK_DIR });
    
  } else {
    sendLog('error', 'Ação de pipeline inválida.');
    return res.end();
  }

  child.stdout.on('data', (data) => {
    sendLog('log', data.toString());
  });

  child.stderr.on('data', (data) => {
    sendLog('log', data.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      sendLog('success', `✅ Pipeline finalizado com sucesso (Código ${code}).`);
      
      // Se for CI, extrai as estatísticas dos testes e cobertura
      if (action === 'ci') {
        const stats = extractStats();
        sendLog('stats', stats);
      }
    } else {
      sendLog('error', `❌ Falha no pipeline (Código ${code}).`);
      if (action === 'ci') {
        const stats = extractStats();
        sendLog('stats', stats);
      }
    }
    res.end();
  });
});

// Helper para extrair estatísticas dos relatórios de teste (Jest)
function extractStats() {
  const stats = {
    testsRun: 0,
    failures: 0,
    errors: 0,
    skipped: 0,
    coverage: 'N/A',
    pmdViolations: 0,
    testDetails: [],
    status: 'success'
  };

  const coverageSummary = path.join(WORK_DIR, 'app/coverage/coverage-summary.json');

  // Tenta ler saída Jest do último run via coverage summary
  if (fileExists(coverageSummary)) {
    try {
      const summary = JSON.parse(fs.readFileSync(coverageSummary, 'utf8'));
      const total = summary.total;
      if (total && total.lines) {
        stats.coverage = total.lines.pct + '%';
      }
    } catch (e) {
      // ignore
    }
  }

  // Lê resultados do Jest JSON se existir
  const jestResults = path.join(WORK_DIR, 'app/coverage/jest-results.json');
  if (fileExists(jestResults)) {
    try {
      const results = JSON.parse(fs.readFileSync(jestResults, 'utf8'));
      stats.testsRun = results.numTotalTests || 0;
      stats.failures = results.numFailedTests || 0;
      stats.errors = 0;
      stats.skipped = results.numPendingTests || 0;

      if (results.testResults) {
        results.testResults.forEach(suite => {
          (suite.assertionResults || []).forEach(test => {
            let testStatus = '✅ PASSOU';
            if (test.status === 'failed') testStatus = '❌ FALHOU';
            else if (test.status === 'pending') testStatus = '⏭️ PULADO';
            stats.testDetails.push({
              name: test.title,
              class: suite.name.split('/').pop().replace('.test.js', ''),
              time: ((test.duration || 0) / 1000).toFixed(3) + 's',
              status: testStatus,
              message: (test.failureMessages || []).join(' ')
            });
          });
        });
      }
    } catch (e) {
      // ignore
    }
  }

  if (stats.failures > 0 || stats.errors > 0) {
    stats.status = 'fail';
  }

  return stats;
}

// Endpoint para obter último resultado dos testes (sem rodar novamente)
app.get('/api/test-results', (req, res) => {
  const stats = extractStats();
  res.json(stats);
});

// Endpoint para git log
app.get('/api/git-log', (req, res) => {
  exec('git log --oneline -20', { cwd: WORK_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ log: stdout.split('\n').filter(Boolean) });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
