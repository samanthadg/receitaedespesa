#!/usr/bin/env bash
set -euo pipefail

TYPE="${1:-}"
if [[ -z "${TYPE}" ]]; then
  echo "Uso: ./scripts/run-tests-by-type.sh <tipo>"
  echo "Tipos: enum | validation | business | mock | db | auth | pdf"
  exit 2
fi

TESTS=""
case "${TYPE}" in
  enum) TESTS="br.com.lancamento.domain.EnumDominioTest" ;;
  validation) TESTS="br.com.lancamento.domain.ValidationTest" ;;
  business) TESTS="br.com.lancamento.domain.BusinessRulesTest" ;;
  mock)
    TESTS="br.com.lancamento.service.LancamentoEmailServiceTest,br.com.lancamento.repo.LancamentoRepositoryStubTest"
    ;;
  db) TESTS="br.com.lancamento.repo.LancamentoRepositoryJpaTest" ;;
  auth) TESTS="br.com.lancamento.web.AuthControllerTest" ;;
  pdf) TESTS="br.com.lancamento.web.LancamentoPdfExporterTest" ;;
  *)
    echo "Tipo inválido: ${TYPE}"
    echo "Tipos: enum | validation | business | mock | db | auth | pdf"
    exit 2
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"
./app/mvnw -f app/pom.xml test -Dtest="${TESTS}"

