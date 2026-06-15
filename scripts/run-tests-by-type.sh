#!/usr/bin/env bash
set -euo pipefail

TYPE="${1:-}"
if [[ -z "${TYPE}" ]]; then
  echo "Uso: ./scripts/run-tests-by-type.sh <tipo>"
  echo "Tipos: enum | validation | business | mock | pdf"
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}/app"

case "${TYPE}" in
  enum) npm run test:enum ;;
  validation) npm run test:validation ;;
  business) npm run test:business ;;
  mock) npm run test:mock ;;
  pdf) npm run test:pdf ;;
  *)
    echo "Tipo inválido: ${TYPE}"
    echo "Tipos: enum | validation | business | mock | pdf"
    exit 2
    ;;
esac
