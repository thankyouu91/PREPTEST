#!/usr/bin/env bash
# Kiểm thử toàn bộ trong một lệnh — dùng cho phiên tự động và cho người.
# Tự cài dependency nếu thiếu, tự bật/tắt server, trả mã thoát khác 0 nếu có bước đỏ.
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
fail=0
step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
note() { printf '   %s\n' "$1"; }

step "Dependency"
if [ ! -d node_modules ] || [ ! -d node_modules/express ]; then
  note "node_modules thiếu, đang cài…"
  npm install --no-audit --no-fund || { echo "npm install THẤT BẠI"; exit 1; }
else
  note "đã có node_modules"
fi

step "Build CSS"
npm run build || fail=1

step "Khởi động server"
pkill -f 'node server\.js' 2>/dev/null || true
sleep 0.5
node server.js > /tmp/prep-verify-server.log 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://localhost:$PORT/prep/landing/"; then break; fi
  sleep 0.5
done
if ! curl -fsS -o /dev/null "http://localhost:$PORT/prep/landing/"; then
  echo "Server không lên được. Log:"; tail -20 /tmp/prep-verify-server.log; exit 1
fi
note "server sẵn sàng ở cổng $PORT"

step "Kiểm thử API quản trị"
node scripts/test-admin.mjs || fail=1

step "Kiểm thử luồng học viên"
node scripts/test-auth.mjs || fail=1

step "Audit giao diện (tràn ngang, tương phản, CSP)"
node scripts/audit.mjs || fail=1

if [ "${SKIP_SHOTS:-0}" != "1" ]; then
  step "Chụp ảnh nghiệm thu"
  node scripts/screenshot.mjs || fail=1
  node scripts/shot-admin.mjs || fail=1
fi

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[1;32m✔ Tất cả bước đều xanh.\033[0m\n'
else
  printf '\033[1;31m✗ Có bước thất bại — xem log phía trên.\033[0m\n'
fi
exit "$fail"
