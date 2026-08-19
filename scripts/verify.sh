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

step "Kiểm thử cứu hộ tài khoản"
node scripts/test-taikhoan.js || fail=1

step "Khởi động server"
pkill -f 'node server\.js' 2>/dev/null || true
sleep 0.5
# Cả suite lẫn bước chụp ảnh đều đăng ký tài khoản từ 127.0.0.1, nên ngưỡng 5
# tài khoản/giờ của production sẽ khiến bước chạy sau bị bước trước chặn — đỏ vì
# thứ tự chứ không vì lỗi thật. Chỉ nới ở đây, không nới trong mã nguồn.
REGISTER_PER_HOUR=200 node server.js > /tmp/prep-verify-server.log 2>&1 &
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

step "Kiểm thử danh mục học viên (/api/catalog)"
node scripts/test-catalog.mjs || fail=1

step "Kiểm thử API tài khoản học viên"
node scripts/test-user-api.mjs || fail=1

step "Kiểm thử engine làm bài (lượt thi, đồng hồ, nghe lại, hạn mức)"
node scripts/test-exam.mjs || fail=1

step "Kiểm thử soạn đề (rubric, máy chấm, ý chính, level, audio)"
node scripts/test-authoring.mjs || fail=1

step "Kiểm thử ngân hàng đề VPET (khớp blueprint, chất lượng từng câu)"
node scripts/test-items.mjs || fail=1

# Kiểm từng câu một, theo docs/BLUEPRINT.md. Chạy tách khỏi test-items.mjs vì
# nó không cần server: đây là cổng chặn khi nhân rộng bộ đề, và cổng chặn phải
# chạy được ở chỗ người viết đề ngồi chứ không chỉ trong bộ kiểm thử đầy đủ.
step "Kiểm nội dung từng câu theo blueprint"
node scripts/kiem-noi-dung.mjs || fail=1

step "Kiểm thử từ vựng (lược đồ, trình nhập, tra theo dạng biến đổi)"
node scripts/test-vocab.mjs || fail=1

step "Kiểm thử khu tự học (động từ bất quy tắc, từ nối)"
node scripts/test-learn.mjs || fail=1

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
