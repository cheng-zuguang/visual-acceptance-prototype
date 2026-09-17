#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROMETHEUS_IMAGE="${PROMETHEUS_IMAGE:-prom/prometheus:v3.14.0}"

cd "${REPOSITORY_ROOT}/monitoring"

run_promtool() {
  if [[ -n "${PROMTOOL_BIN:-}" ]]; then
    "${PROMTOOL_BIN}" "$@"
    return
  fi

  if command -v promtool >/dev/null 2>&1; then
    promtool "$@"
    return
  fi

  if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    docker run --rm \
      --entrypoint /bin/promtool \
      --volume "${REPOSITORY_ROOT}/monitoring:/work:ro" \
      --workdir /work \
      "${PROMETHEUS_IMAGE}" \
      "$@"
    return
  fi

  echo "promtool is required. Install Prometheus, set PROMTOOL_BIN, or start Docker." >&2
  return 127
}

run_promtool check rules prometheus-ai-advice-alerts.yml
run_promtool test rules prometheus-ai-advice-alerts.test.yml
