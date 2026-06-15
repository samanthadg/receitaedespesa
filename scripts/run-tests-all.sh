#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}/app"

VERBOSE="${LANCAMENTO_TESTS_VERBOSE:-0}"
if [[ "${VERBOSE}" == "1" ]]; then
  set +e
  npm test
  NPM_EC=$?
  set -e
else
  set +e
  npm test >/dev/null 2>&1
  NPM_EC=$?
  set -e
fi

if [[ "${NPM_EC}" -ne 0 ]]; then
  if [[ "${VERBOSE}" == "1" ]]; then
    echo "Testes falharam (código ${NPM_EC})." >&2
  else
    echo "Testes falharam (código ${NPM_EC}). Rode com LANCAMENTO_TESTS_VERBOSE=1." >&2
    npm test >&2 || true
  fi
fi

exit "${NPM_EC}"
