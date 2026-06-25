#!/usr/bin/env bash

echo "[Docker] Docker daemon:"
docker --version

echo "[Docker] Containers ativos:"
docker ps --format "  - {{.Names}}: {{.Status}}"

echo "[Node] Versao:"
docker exec homolog-app node --version

echo "[Node] npm versao:"
docker exec homolog-app npm --version

echo "[PostgreSQL] Homolog:"
docker exec homolog-db psql --version

echo "[PostgreSQL] Producao:"
docker exec prod-db psql --version

echo "[Volume] package.json:"
docker exec homolog-app ls /app/package.json && echo "  encontrado" || echo "  NAO encontrado"

echo "[Rede] homolog-app -> homolog-db:"
docker exec homolog-app sh -c "nc -z homolog-db 5432 && echo '  conectado' || echo '  FALHOU'"

echo "[Rede] prod-app -> prod-db:"
docker exec prod-app sh -c "nc -z prod-db 5432 && echo '  conectado' || echo '  FALHOU'"
