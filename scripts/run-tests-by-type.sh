#!/usr/bin/env bash
set -euo pipefail

TYPE="${1:-}"
if [[ -z "${TYPE}" ]]; then
  echo "Uso: ./scripts/run-tests-by-type.sh <tipo>"
  echo "Tipos: enum | validation | business | mock | db | auth | pdf"
  exit 2
fi

TESTS=""
CLASSES=""
case "${TYPE}" in
  enum)
    TESTS="br.com.lancamento.testes.EnumDominioTest"
    CLASSES="${TESTS}"
    ;;
  validation)
    TESTS="br.com.lancamento.testes.ValidationTest"
    CLASSES="${TESTS}"
    ;;
  business)
    TESTS="br.com.lancamento.testes.BusinessRulesTest"
    CLASSES="${TESTS}"
    ;;
  mock)
    TESTS="br.com.lancamento.testes.LancamentoEmailServiceTest,br.com.lancamento.testes.LancamentoRepositoryStubTest"
    CLASSES="${TESTS}"
    ;;
  db)
    TESTS="br.com.lancamento.testes.LancamentoRepositoryJpaTest"
    CLASSES="${TESTS}"
    ;;
  auth)
    TESTS="br.com.lancamento.testes.AuthControllerTest"
    CLASSES="${TESTS}"
    ;;
  pdf)
    TESTS="br.com.lancamento.testes.LancamentoPdfExporterTest"
    CLASSES="${TESTS}"
    ;;
  *)
    echo "Tipo inválido: ${TYPE}"
    echo "Tipos: enum | validation | business | mock | db | auth | pdf"
    exit 2
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

MVN_LOG="$(mktemp)"
trap 'rm -f "${MVN_LOG}"' EXIT

set +e
./app/mvnw -f app/pom.xml --batch-mode -q test -Dtest="${TESTS}" >"${MVN_LOG}" 2>&1
MVN_EC=$?
set -e

export PYTHONUTF8=1
python3 "${ROOT_DIR}/scripts/print-test-summary.py" --classes "${CLASSES}"
exit "${MVN_EC}"
