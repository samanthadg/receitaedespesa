#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

MVN_LOG=""
cleanup() {
  if [[ -n "${MVN_LOG}" && -f "${MVN_LOG}" ]]; then
    rm -f "${MVN_LOG}"
  fi
}
trap cleanup EXIT

VERBOSE="${LANCAMENTO_TESTS_VERBOSE:-0}"
if [[ "${VERBOSE}" == "1" ]]; then
  MVN_LOG="$(mktemp)"
  set +e
  ./app/mvnw -f app/pom.xml --batch-mode -q test >"${MVN_LOG}" 2>&1
  MVN_EC=$?
  set -e
else
  set +e
  ./app/mvnw -f app/pom.xml --batch-mode -q test >/dev/null 2>&1
  MVN_EC=$?
  set -e
fi

set +e
./app/mvnw -f app/pom.xml --batch-mode -q -DskipTests test-compile exec:java \
  -Dexec.mainClass=br.com.lancamento.testes.TestSummaryPrinter \
  -Dexec.classpathScope=test \
  -Dexec.cleanupDaemonThreads=false \
  "-Dexec.args=app/target/surefire-reports" || true
set -e

if [[ "${MVN_EC}" -ne 0 ]]; then
  if [[ "${VERBOSE}" == "1" && -n "${MVN_LOG}" && -f "${MVN_LOG}" ]]; then
    echo "Maven falhou (código ${MVN_EC}). Últimas linhas do log:" >&2
    tail -n 80 "${MVN_LOG}" >&2
  else
    echo "Maven falhou (código ${MVN_EC}). Rode com LANCAMENTO_TESTS_VERBOSE=1 para gravar log." >&2
  fi
fi

exit "${MVN_EC}"
