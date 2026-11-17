#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:8080}"
USUARIO="smoke$RANDOM"

for i in $(seq 1 30); do
  if curl -sf "$BASE/health" > /dev/null; then break; fi
  if [ "$i" -eq 30 ]; then echo "frontend nao respondeu"; exit 1; fi
  sleep 2
done

ID=$(curl -sf -X POST "$BASE/api/missoes" \
  -H 'Content-Type: application/json' \
  -d "{\"usuario\":\"$USUARIO\",\"titulo\":\"teste\",\"dificuldade\":\"media\"}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

curl -sf -X PUT "$BASE/api/missoes/$ID/concluir" > /dev/null

XP=$(curl -sf "$BASE/api/pontuacao/$USUARIO" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['xp'])")
if [ "$XP" != "25" ]; then
  echo "xp esperado 25, recebido $XP"
  exit 1
fi

CONQUISTADAS=$(curl -sf "$BASE/api/conquistas/$USUARIO" \
  | python3 -c "import json,sys; print(sum(1 for c in json.load(sys.stdin) if c['conquistada']))")
if [ "$CONQUISTADAS" != "1" ]; then
  echo "conquistas esperadas 1, recebidas $CONQUISTADAS"
  exit 1
fi

echo "ok"
