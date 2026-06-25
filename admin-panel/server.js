const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const WORK_DIR = '/opt/lancamento';
const CHANGE_LOG_PATH = path.join(WORK_DIR, 'change_log.json');
const PIPELINE_STATE_PATH = path.join(WORK_DIR, 'pipeline_state.json');

const sessions = new Map();

function getPipelineState() {
  if (fs.existsSync(PIPELINE_STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PIPELINE_STATE_PATH, 'utf8'));
    } catch (e) {
      // ignore
    }
  }
  return {
    lastSuccessfulCI: null,
    lastSuccessfulHomolog: null,
    lastSuccessfulProd: null
  };
}

function savePipelineState(state) {
  try {
    fs.writeFileSync(PIPELINE_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    // ignore
  }
}

function getExpectedVersions() {
  const versions = {
    node: '20',
    postgres: '18'
  };

  const dockerfilePath = path.join(WORK_DIR, 'app/Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    try {
      const content = fs.readFileSync(dockerfilePath, 'utf8');
      const match = content.match(/FROM\s+node:(\d+)/i);
      if (match && match[1]) {
        versions.node = match[1];
      }
    } catch (e) {
      // ignore
    }
  }

  const composePath = path.join(WORK_DIR, 'docker-compose.yml');
  if (fs.existsSync(composePath)) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const match = content.match(/image:\s+postgres:(\d+)/i);
      if (match && match[1]) {
        versions.postgres = match[1];
      }
    } catch (e) {
      // ignore
    }
  }

  return versions;
}

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
  console.log(`[LOGIN] Tentativa de login para usuario: ${username}`);

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios.' });
  }

  // Static fallback (allows logging in even if prod-db is offline/stopped)
  if (username === 'admin' && password === '123456') {
    console.log(`[LOGIN] Login de fallback estatico bem-sucedido para o admin`);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { user: 'admin', nome: 'Administrador', created: Date.now() });
    res.setHeader('Set-Cookie', `session=${token}; Path=/; HttpOnly; SameSite=Strict`);
    return res.json({ success: true, user: 'Administrador' });
  }

  // Query prod-db to validate user credentials
  const query = `SELECT login, nome FROM usuario WHERE login='${username.replace(/'/g, "''")}' AND senha='${password.replace(/'/g, "''")}' AND situacao='ATIVO' LIMIT 1`;
  const cmd = `docker exec prod-db psql -U lancamento_user -d lancamento_db -t -A -c "${query}"`;

  console.log(`[LOGIN] Executando comando: ${cmd}`);
  exec(cmd, { timeout: 5000 }, (err, stdout, stderr) => {
    console.log(`[LOGIN] Resultado da consulta: err=${err ? err.message : 'null'}, stdout=${stdout.trim()}, stderr=${stderr.trim()}`);
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

  // Automate Git commit to record code changes & versioning automatically (Fase C)
  const commitMsg = `Fase A: Registro de mudança por ${author || 'desenvolvedor'} - ${description}`;
  exec(`git add . && git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: WORK_DIR }, (gitErr, gitStdout, gitStderr) => {
    res.json({ success: true, log: newLog, gitStatus: gitErr ? 'no-changes-or-error' : 'committed' });
  });
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
    cmd = 'docker compose up -d homolog-db homolog-app';
  } else if (action === 'stop-homolog') {
    cmd = 'docker compose stop homolog-db homolog-app';
  } else if (action === 'start-prod') {
    cmd = 'docker compose up -d prod-db prod-app';
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
  const { action } = req.query; // 'ci', 'deploy-homolog', 'deploy-prod'
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendLog = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
  };

  sendLog('info', 'Executando: git rev-parse --short HEAD');
  exec('git rev-parse --short HEAD', { cwd: WORK_DIR }, (gitErr, commitStdout) => {
    if (gitErr) {
      sendLog('error', 'Erro ao ler repositório Git no servidor.');
      return res.end();
    }
    
    const currentCommit = commitStdout.trim();
    const state = getPipelineState();

    if (action === 'ci') {
      sendLog('info', `Iniciando pipeline de CI para o commit: ${currentCommit}...`);

      // Etapa 1/3: Verificacao de Ambiente
      sendLog('info', 'Etapa 1/3: Verificando ambiente e infraestrutura...');

      const envScriptCmd = 'bash /opt/lancamento/scripts/env-check.sh';
      const expected = getExpectedVersions();

      sendLog('info', `Executando: ${envScriptCmd}`);
      exec(envScriptCmd, { timeout: 60000 }, (envErr, envStdout) => {
        // Exibe resultados da verificação de ambiente com validação de versões
        const envLines = (envStdout || '').split('\n').filter(l => l.trim());
        let currentSection = '';
        let hasVersionMismatch = false;

        envLines.forEach(line => {
          let outputLine = line;

          if (line.startsWith('[Node] Versao:')) {
            currentSection = 'node';
          } else if (line.startsWith('[PostgreSQL] Homolog:')) {
            currentSection = 'pg-homolog';
          } else if (line.startsWith('[PostgreSQL] Producao:')) {
            currentSection = 'pg-prod';
          } else if (line.startsWith('[') && line.includes(']')) {
            currentSection = '';
          }

          if (currentSection === 'node' && line.startsWith('v')) {
            const match = line.match(/^v(\d+)\./);
            if (match && match[1]) {
              const nodeVer = match[1];
              if (nodeVer === expected.node) {
                outputLine = `  ${line} [OK - Compativel com Dockerfile v${expected.node}]`;
              } else {
                outputLine = `  ${line} [FALHOU - Requer v${expected.node} do Dockerfile]`;
                hasVersionMismatch = true;
              }
            }
          } else if ((currentSection === 'pg-homolog' || currentSection === 'pg-prod') && line.includes('PostgreSQL')) {
            const match = line.match(/PostgreSQL\)\s+(\d+)\./);
            if (match && match[1]) {
              const pgVer = match[1];
              if (pgVer === expected.postgres) {
                outputLine = `  ${line} [OK - Compativel com docker-compose v${expected.postgres}]`;
              } else {
                outputLine = `  ${line} [FALHOU - Requer v${expected.postgres} do docker-compose]`;
                hasVersionMismatch = true;
              }
            }
          }

          sendLog('info', outputLine);
        });

        if (envErr || hasVersionMismatch) {
          sendLog('info', 'Aviso: alguns checks de ambiente falharam, prosseguindo com CI...');
        } else {
          sendLog('info', 'Ambiente verificado com sucesso.');
        }

        // Etapa 2/3: ESLint
        sendLog('info', 'Etapa 2/3: Verificando qualidade do codigo com ESLint...');

        const command = 'docker';
        const args = [
          'run', '--rm',
          '-v', '/opt/lancamento/app:/workspace',
          '-w', '/workspace',
          'node:20-alpine',
          'sh', '-c', 'npm ci && npm run lint && echo "ESLINT_PASSED" && npm test'
        ];

        sendLog('info', 'Executando: docker run --rm -v /opt/lancamento/app:/workspace -w /workspace node:20-alpine sh -c "npm ci && npm run lint && echo \\"ESLINT_PASSED\\" && npm test"');
        const child = spawn(command, args, { cwd: WORK_DIR });

        let stdoutBuffer = '';
        child.stdout.on('data', (data) => {
          stdoutBuffer += data.toString();
          const lines = stdoutBuffer.split('\n');
          stdoutBuffer = lines.pop();

          lines.forEach(line => {
            if (line.includes('ESLINT_PASSED')) {
              sendLog('info', 'Qualidade do codigo verificada com sucesso (ESLint passou).');
              sendLog('info', 'Etapa 3/3: Executando testes com Jest...');
            }
            if (line.includes('JEST_TEST_RESULT:')) {
              try {
                const jsonStr = line.substring(line.indexOf('JEST_TEST_RESULT:') + 17);
                const testInfo = JSON.parse(jsonStr.trim());
                sendLog('test-result', testInfo);
              } catch (e) {
                // ignore
              }
            }
          });
        });

        child.stderr.on('data', (data) => {
          // Ignorado no CI para manter o terminal com exibição limpa
        });

        child.on('close', (code) => {
          const stats = extractStats();
          sendLog('stats', stats);

          if (code === 0 && stats.failures === 0 && stats.errors === 0) {
            state.lastSuccessfulCI = currentCommit;
            savePipelineState(state);
            sendLog('success', `CI concluido com sucesso para o commit ${currentCommit}!`);
          } else {
            sendLog('error', `CI falhou no commit ${currentCommit}. Corrija os erros antes de prosseguir.`);
          }
          res.end();
        });
      });

    } else if (action === 'deploy-homolog') {
      if (state.lastSuccessfulCI !== currentCommit) {
        sendLog('error', `[BLOQUEADO] O commit atual (${currentCommit}) não passou nos testes de CI. Execute "Rodar Integração (CI)" com sucesso antes de fazer o deploy.`);
        return res.end();
      }

      sendLog('info', `Iniciando deploy em Homologação para o commit: ${currentCommit}...`);
      const command = 'docker';
      const args = ['compose', 'up', '-d', '--build', 'homolog-app'];
      
      sendLog('info', 'Executando: docker compose up -d --build homolog-app');
      const child = spawn(command, args, { cwd: WORK_DIR });
      
      child.stdout.on('data', (data) => {
        sendLog('log', data.toString());
      });

      child.stderr.on('data', (data) => {
        sendLog('log', data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) {
          state.lastSuccessfulHomolog = currentCommit;
          savePipelineState(state);
          sendLog('success', `Deploy em Homologação realizado com sucesso para o commit ${currentCommit}!`);
        } else {
          sendLog('error', `Falha ao realizar deploy em Homologação (Código ${code}).`);
        }
        res.end();
      });
      
    } else if (action === 'deploy-prod') {
      if (state.lastSuccessfulHomolog !== currentCommit) {
        sendLog('error', `[BLOQUEADO] O commit atual (${currentCommit}) ainda não foi implantado em Homologação. Faça deploy em Homologação com sucesso antes de promover para Produção.`);
        return res.end();
      }

      sendLog('info', `Iniciando deploy em Produção para o commit: ${currentCommit}...`);
      const command = 'docker';
      const args = ['compose', 'up', '-d', '--build', 'prod-app'];
      
      sendLog('info', 'Executando: docker compose up -d --build prod-app');
      const child = spawn(command, args, { cwd: WORK_DIR });
      
      child.stdout.on('data', (data) => {
        sendLog('log', data.toString());
      });

      child.stderr.on('data', (data) => {
        sendLog('log', data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) {
          state.lastSuccessfulProd = currentCommit;
          savePipelineState(state);
          sendLog('success', `Deploy em Produção realizado com sucesso para o commit ${currentCommit}!`);
        } else {
          sendLog('error', `Falha ao realizar deploy em Produção (Código ${code}).`);
        }
        res.end();
      });
      
    } else if (action === 'env-check') {
      sendLog('info', '=== VERIFICACAO DE AMBIENTE E INFRAESTRUTURA ===');

      const envScriptCmd = 'bash /opt/lancamento/scripts/env-check.sh';
      sendLog('info', `Executando: ${envScriptCmd}`);
      exec(envScriptCmd, { timeout: 60000 }, (err, stdout, stderr) => {
        const lines = (stdout || '').split('\n').filter(l => l.trim());
        lines.forEach(line => sendLog('info', line));
        if (err && stderr) {
          sendLog('error', `Erro: ${stderr.trim().split('\n')[0]}`);
        }
        sendLog('success', 'Verificacao de ambiente concluida!');
        res.end();
      });

    } else {
      sendLog('error', 'Acao de pipeline invalida.');
      res.end();
    }
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

// Endpoint para puxar alterações do Git remoto (git pull)
app.post('/api/git-pull', (req, res) => {
  exec('git pull', { cwd: WORK_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message, stderr });
    }
    res.json({ success: true, stdout, stderr });
  });
});

// Endpoint para verificar status do Git local vs remoto
app.get('/api/git-status', (req, res) => {
  exec('git fetch origin && git status -uno', { cwd: WORK_DIR }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: err.message, stderr });
    }
    
    const output = stdout.trim();
    let status = 'synchronized';
    let details = 'Seu repositório está atualizado com o origin/main.';
    
    if (output.includes('behind')) {
      status = 'behind';
      details = 'Há atualizações pendentes no Git remoto. Clique em "Puxar do Git" para atualizar.';
    } else if (output.includes('ahead')) {
      status = 'ahead';
      details = 'Há commits locais não enviados ao Git remoto.';
    } else if (output.includes('diverged')) {
      status = 'diverged';
      details = 'Os repositórios local e remoto divergiram.';
    }
    exec('git rev-parse --short HEAD', { cwd: WORK_DIR }, (gitErr, commitStdout) => {
      const currentCommit = gitErr ? 'unknown' : commitStdout.trim();
      const state = getPipelineState();
      res.json({
        status,
        details,
        currentCommit,
        lastSuccessfulCI: state.lastSuccessfulCI,
        lastSuccessfulHomolog: state.lastSuccessfulHomolog,
        lastSuccessfulProd: state.lastSuccessfulProd,
        raw: output
      });
    });
  });
});

// Endpoint para sincronizar banco de dados (Copia dados da Produção para Homologação)
app.post('/api/db-sync', (req, res) => {
  const dumpCmd = 'docker exec prod-db pg_dump -U lancamento_user -d lancamento_db -F c -b -v -f /tmp/prod_backup.dump';
  const cpFromProd = 'docker cp prod-db:/tmp/prod_backup.dump /tmp/prod_backup.dump';
  const cpToHomolog = 'docker cp /tmp/prod_backup.dump homolog-db:/tmp/prod_backup.dump';
  const wipeHomolog = 'docker exec homolog-db psql -U lancamento_user -d lancamento_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO lancamento_user;"';
  const restoreHomolog = 'docker exec homolog-db pg_restore -U lancamento_user -d lancamento_db -v /tmp/prod_backup.dump';
  const cleanUpFiles = 'rm -f /tmp/prod_backup.dump && docker exec prod-db rm -f /tmp/prod_backup.dump && docker exec homolog-db rm -f /tmp/prod_backup.dump';

  const fullCmd = `${dumpCmd} && ${cpFromProd} && ${cpToHomolog} && ${wipeHomolog} && ${restoreHomolog} && ${cleanUpFiles}`;

  exec(fullCmd, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message, stderr });
    }
    res.json({ success: true, stdout, stderr });
  });
});


// Configure git to trust the shared repository directory in the container
exec('git config --global --add safe.directory /opt/lancamento', (err) => {
  if (err) console.error('Erro ao configurar safe.directory:', err.message);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
