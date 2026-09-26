#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ ! -x "$ROOT/backend/.venv/bin/uvicorn" || ! -d "$ROOT/frontend/node_modules" ]]; then
  echo 'Install frontend and backend dependencies first; see README.md.'
  exit 1
fi
(cd "$ROOT/backend" && .venv/bin/alembic upgrade head)
(cd "$ROOT/backend" && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!
(cd "$ROOT/frontend" && npm run dev -- --hostname 127.0.0.1) &
FRONTEND_PID=$!
trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' EXIT INT TERM
wait
