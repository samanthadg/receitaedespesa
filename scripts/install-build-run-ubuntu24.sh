#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   1) Copie o projeto para a VM em /opt/lancamento
#   2) Rode: sudo bash scripts/install-build-run-ubuntu24.sh
#
# Resultado:
#   - Instala Java 21 + Maven + PostgreSQL 18
#   - Cria DB/usuário
#   - Compila o jar
#   - Sobe como serviço systemd na porta 8080
#
# Antes de rodar em produção:
#   - Edite /etc/lancamento.env e preencha SMTP_USER/SMTP_PASS (App Password) e APP_MAIL_ENABLED=true

APP_DIR="/opt/lancamento"
APP_SUBDIR="${APP_DIR}/app"
DB_NAME="lancamento_db"
DB_USER="lancamento_user"
DB_PASS="lancamento_pass"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Rode como root: sudo $0"
  exit 1
fi

if [[ ! -f "${APP_SUBDIR}/pom.xml" ]]; then
  echo "Não encontrei ${APP_SUBDIR}/pom.xml"
  echo "Copie o projeto para ${APP_DIR} antes de rodar este script."
  exit 1
fi

echo "[1/4] Provisionando VM (Java/Maven/Postgres18 + DB + service)..."
bash "${APP_DIR}/scripts/provision-ubuntu24.sh"

echo "[2/4] Compilando a aplicação..."
bash -lc "source /etc/profile.d/lancamento-java.sh 2>/dev/null || true; cd '${APP_SUBDIR}' && mvn -DskipTests package"

echo "[3/4] Subindo serviço systemd..."
systemctl daemon-reload
systemctl enable --now lancamento

echo "[4/4] Status do serviço:"
systemctl status lancamento --no-pager || true

