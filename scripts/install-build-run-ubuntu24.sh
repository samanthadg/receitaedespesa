#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   1) Copie o projeto para a VM em /opt/lancamento
#   2) Rode: sudo bash scripts/install-build-run-ubuntu24.sh
#
# Resultado:
#   - Instala Docker + Docker Compose
#   - Desinstala pacotes e serviços nativos (Java, Maven, Postgres)
#   - Sobe todos os ambientes (Admin, Homolog, Prod) em containers Docker

APP_DIR="/opt/lancamento"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Rode como root: sudo $0"
  exit 1
fi

if [[ ! -f "${APP_DIR}/docker-compose.yml" ]]; then
  echo "Não encontrei ${APP_DIR}/docker-compose.yml"
  echo "Copie o projeto para ${APP_DIR} antes de rodar este script."
  exit 1
fi

echo "[1/3] Provisionando a VM (instalando Docker e limpando host)..."
bash "${APP_DIR}/scripts/provision-ubuntu24.sh"

echo "[2/3] Construindo e iniciando os containers Docker (Admin, Homolog, Prod)..."
cd "${APP_DIR}"
docker compose down || true
docker compose up -d --build

echo "[3/3] Status dos containers rodando:"
docker compose ps

echo "Implantação concluída!"
