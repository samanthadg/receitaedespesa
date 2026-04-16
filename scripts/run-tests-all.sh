#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

MVN_LOG="$(mktemp)"
trap 'rm -f "${MVN_LOG}"' EXIT

set +e
./app/mvnw -f app/pom.xml --batch-mode -q test >"${MVN_LOG}" 2>&1
MVN_EC=$?
set -e

export PYTHONUTF8=1
python3 "${ROOT_DIR}/scripts/print-test-summary.py"
exit "${MVN_EC}"
