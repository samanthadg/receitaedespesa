#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/lancamento"
DB_NAME="lancamento_db"
DB_USER="lancamento_user"
DB_PASS="lancamento_pass"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Rode como root: sudo $0"
  exit 1
fi

echo "[1/8] Atualizando sistema e instalando dependências base..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release unzip git ufw

echo "[2/8] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v || true
npm -v || true

echo "[3/8] Instalando PostgreSQL 18 (PGDG)..."
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg
echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-18 postgresql-client-18

echo "[4/8] Criando banco e usuário..."
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb "${DB_NAME}"
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "[4.1/8] Ajustando permissões no schema public (para criar tabelas)..."
sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<SQL
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
GRANT USAGE, CREATE ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

echo "[5/8] Preparando diretório da aplicação..."
mkdir -p "${APP_DIR}"
chown -R root:root "${APP_DIR}" || true

echo "[6/8] Criando serviço systemd (opcional)..."
cat >/etc/lancamento.env <<EOF
DB_URL=jdbc:postgresql://localhost:5432/${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
PORT=8080

# SMTP (Gmail) + e-mail da aplicação (preencha antes de subir em produção)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

APP_MAIL_ENABLED=false
APP_MAIL_FROM=
APP_MAIL_TO=

# Opcional: link usado em botões do e-mail
APP_PUBLIC_BASE_URL=
EOF

# Para execuções non-interactive
cat >/etc/profile.d/lancamento-node.sh <<'EOF'
export PATH=/usr/bin:$PATH
EOF

cat >/etc/systemd/system/lancamento.service <<'EOF'
[Unit]
Description=Aplicação Lancamento (Node.js)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/lancamento/app
EnvironmentFile=/etc/lancamento.env
ExecStart=/usr/bin/node /opt/lancamento/app/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo "[7/8] Abrindo porta 8080 no firewall (ufw)..."
ufw allow 8080/tcp || true
ufw --force enable || true

echo "[8/8] Concluído."

