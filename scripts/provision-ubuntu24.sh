#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/lancamento"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Rode como root: sudo $0"
  exit 1
fi

echo "[1/6] Atualizando sistema e instalando dependências base..."
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release unzip git ufw

echo "[2/6] Instalando Docker e Docker Compose..."
if ! command -v docker &>/dev/null; then
  apt-get install -y docker.io docker-compose-v2
else
  echo "Docker já está instalado."
fi
systemctl enable --now docker

echo "[3/6] Parando e desativando serviços nativos no host (se existirem)..."
systemctl stop lancamento || true
systemctl disable lancamento || true
systemctl stop postgresql || true
systemctl disable postgresql || true

echo "[4/6] Desinstalando Java, Maven e PostgreSQL nativos do host..."
apt-get purge -y openjdk* jre* jdk* maven* postgresql* || true
apt-get autoremove -y
apt-get clean

echo "[5/6] Configurando diretório da aplicação..."
mkdir -p "${APP_DIR}"

echo "[6/6] Configurando Firewall (UFW) para as portas do Docker (8080, 8081, 8082)..."
ufw allow 8080/tcp || true
ufw allow 8081/tcp || true
ufw allow 8082/tcp || true
ufw --force enable || true

echo "Provisionamento concluído com sucesso!"
