#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_PID=""
SERVER_PID=""
STOPPING=0

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
info() { printf '\n==> %s\n' "$*"; }

cleanup() {
  local exit_code=$?
  (( STOPPING )) && return
  STOPPING=1
  trap - EXIT INT TERM
  for pid in "$CLIENT_PID" "$SERVER_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$CLIENT_PID" "$SERVER_PID"; do
    if [[ -n "$pid" ]]; then
      for _ in {1..5}; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 1
      done
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  if (( exit_code != 0 )); then
    printf '\nStartup stopped; services launched by this script have been shut down.\n' >&2
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

command -v node >/dev/null 2>&1 || fail 'Node.js 20.9 or newer is required. Install Node.js, then rerun scripts/start-dev.sh.'
command -v npm >/dev/null 2>&1 || fail 'npm is required (it is included with Node.js). Install Node.js, then rerun scripts/start-dev.sh.'
command -v python3 >/dev/null 2>&1 || fail 'Python 3.10 or newer is required. Install Python, then rerun scripts/start-dev.sh.'
python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' || fail 'Python 3.10 or newer is required.'
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 20 || (major === 20 && minor >= 9) ? 0 : 1)' || fail 'Node.js 20.9 or newer is required.'

[[ -f "$CLIENT_DIR/.env.local" ]] || { cp "$CLIENT_DIR/.env.example" "$CLIENT_DIR/.env.local"; printf 'Created client/.env.local from its example. Add your Firebase browser settings for sign-in.\n'; }
[[ -f "$SERVER_DIR/.env" ]] || { cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"; printf 'Created server/.env from its example.\n'; }
[[ -f "$CLIENT_DIR/node_modules/.bin/next" ]] || fail 'Client dependencies are missing. Run: cd client && npm ci'
[[ -x "$SERVER_DIR/.venv/bin/python" ]] || fail 'Server virtual environment is missing. Run: cd server && python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt'
"$SERVER_DIR/.venv/bin/python" -c 'import fastapi, uvicorn' >/dev/null 2>&1 || fail 'Server Python dependencies are missing. Run: cd server && .venv/bin/python -m pip install -r requirements.txt'

if ! command -v fuser >/dev/null 2>&1; then
  for port in 3000 8000; do
    if (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
      fail "Port $port is occupied. Install fuser (usually provided by psmisc) to let this script identify and stop its listener, or free the port manually."
    fi
  done
fi

free_port() {
  local port="$1" pids pid answer
  pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
  [[ -n "$pids" ]] || return 0
  printf 'Port %s is in use by PID(s): %s\n' "$port" "$(tr '\n' ' ' <<<"$pids" | xargs)"
  for pid in $pids; do ps -p "$pid" -o pid=,comm=,args= 2>/dev/null || true; done
  read -r -p "Stop these process(es) to free port $port? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || fail "Port $port remains occupied; no services were started."
  kill -TERM $pids 2>/dev/null || true
  for _ in {1..5}; do
    sleep 1
    pids="$(fuser -n tcp "$port" 2>/dev/null || true)"
    [[ -n "$pids" ]] || return 0
  done
  printf 'Processes still hold port %s; sending KILL.\n' "$port"
  kill -KILL $pids 2>/dev/null || true
  sleep 1
  [[ -z "$(fuser -n tcp "$port" 2>/dev/null || true)" ]] || fail "Could not free port $port."
}

free_port 3000
free_port 8000

# Load simple KEY=value settings from server/.env without evaluating shell code.
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*# || ! "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] && continue
  key="${BASH_REMATCH[1]}"
  value="${BASH_REMATCH[2]}"
  value="${value%$'\r'}"
  if [[ ${#value} -ge 2 && ( ( ${value:0:1} == '"' && ${value: -1} == '"' ) || ( ${value:0:1} == "'" && ${value: -1} == "'" ) ) ]]; then value="${value:1:${#value}-2}"; fi
  export "$key=$value"
done < "$SERVER_DIR/.env"
export SERVER_ALLOWED_CLIENT_ORIGINS="${SERVER_ALLOWED_CLIENT_ORIGINS:-http://localhost:3000}"

info 'Starting FastAPI on http://localhost:8000'
(cd "$SERVER_DIR" && exec .venv/bin/python -m uvicorn app.main:application --reload --host 127.0.0.1 --port 8000) &
SERVER_PID=$!
info 'Starting Next.js on http://localhost:3000'
(cd "$CLIENT_DIR" && exec npm run dev -- --hostname 127.0.0.1 --port 3000) &
CLIENT_PID=$!

wait_for_health() {
  local name="$1" url="$2" pid="$3"
  for _ in {1..60}; do
    kill -0 "$pid" 2>/dev/null || fail "$name exited before becoming healthy."
    if python3 -c 'import sys, urllib.request; r=urllib.request.urlopen(sys.argv[1], timeout=1); sys.exit(0 if r.status == 200 else 1)' "$url" >/dev/null 2>&1; then
      printf '%s is ready: %s\n' "$name" "$url"
      return 0
    fi
    sleep 1
  done
  fail "$name did not become healthy at $url within 60 seconds."
}
wait_for_health 'FastAPI' 'http://127.0.0.1:8000/health' "$SERVER_PID"
wait_for_health 'Next.js' 'http://127.0.0.1:3000/health' "$CLIENT_PID"
printf '\nBayes Learning Platform is running. Press Ctrl+C to stop both services.\n'

while true; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then fail 'FastAPI stopped unexpectedly.'; fi
  if ! kill -0 "$CLIENT_PID" 2>/dev/null; then fail 'Next.js stopped unexpectedly.'; fi
  sleep 1
done
