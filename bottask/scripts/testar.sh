#!/usr/bin/env bash
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"

for servico in missoes pontuacao conquistas frontend; do
  echo "== $servico"
  (cd "$RAIZ/services/$servico" && python3 -m unittest discover -s tests)
done
