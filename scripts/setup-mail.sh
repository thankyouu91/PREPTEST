#!/usr/bin/env bash
# Put the mail settings into /etc/vpet-prep.env without breaking what is there.
#
# The file is sourced by a shell (`set -a; . /etc/vpet-prep.env`), so an
# unquoted `<` in MAIL_FROM is a syntax error — and a syntax error stops the
# source dead, leaving every variable BELOW the bad line unset. Measured, not
# assumed: a file whose second line is `MAIL_FROM=VPET Prep <a@gmail.com>`
# yields line 1 and nothing after it. If TOKEN_ENCRYPTION_KEY sits under the
# break the server boots without it, and the database backups deliberately do
# not carry that key. That is the whole reason this script exists rather than a
# paragraph telling somebody to be careful with a text editor: it edits a copy,
# proves the copy still yields every value the original did, and only then
# writes it back — with the previous file kept beside it.
#
# The App Password is never a command-line argument (arguments are world
# readable in `ps`), never echoed, and never written to the shell history: it
# is typed at a silent prompt, or piped in with --password-stdin.
#
# Messages are Vietnamese because this is typed on the server by the operator;
# comments are English like the rest of the repository.
#
#   sudo bash scripts/setup-mail.sh --check
#   sudo bash scripts/setup-mail.sh --user vpetprep@gmail.com --base-url https://d1tjeiogootdxv.cloudfront.net
#   sudo bash scripts/setup-mail.sh --restart
#   sudo bash scripts/setup-mail.sh --test ban@example.com
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ENV_FILE=/etc/vpet-prep.env
APP_USER=ubuntu
APP_NAME=preptest
SMTP_HOST_IN=smtp.gmail.com
SMTP_PORT_IN=587
SMTP_USER_IN=''
MAIL_FROM_IN=''
BASE_URL_IN=''
PASSWORD_STDIN=0
ANY_PASSWORD=0
MODE=write
DO_RESTART=0
TEST_TO=''
ASSUME_YES=0

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; BLD=$'\033[1m'; OFF=$'\033[0m'
[ -t 1 ] || { RED=''; GRN=''; YEL=''; BLD=''; OFF=''; }

die()  { printf '%s✗ %s%s\n' "$RED" "$1" "$OFF" >&2; exit "${2:-1}"; }
warn() { printf '%s! %s%s\n' "$YEL" "$1" "$OFF" >&2; }
ok()   { printf '%s✓ %s%s\n' "$GRN" "$1" "$OFF"; }
note() { printf '   %s\n' "$1"; }

usage() {
  # The header comment above is the manual: print it until the code starts.
  awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file)   ENV_FILE="${2:-}"; shift 2 ;;
    --user)       SMTP_USER_IN="${2:-}"; shift 2 ;;
    --from)       MAIL_FROM_IN="${2:-}"; shift 2 ;;
    --host)       SMTP_HOST_IN="${2:-}"; shift 2 ;;
    --port)       SMTP_PORT_IN="${2:-}"; shift 2 ;;
    --base-url)   BASE_URL_IN="${2:-}"; shift 2 ;;
    --app-user)   APP_USER="${2:-}"; shift 2 ;;
    --app-name)   APP_NAME="${2:-}"; shift 2 ;;
    --password-stdin) PASSWORD_STDIN=1; shift ;;
    --any-password)   ANY_PASSWORD=1; shift ;;
    --check)      MODE=check; shift ;;
    --restart)    DO_RESTART=1; shift ;;
    --test)       TEST_TO="${2:-}"; MODE=test; shift 2 ;;
    --yes|-y)     ASSUME_YES=1; shift ;;
    -h|--help)    usage 0 ;;
    # Refused on purpose, not unsupported: a password in an argument is visible
    # to every user on the machine for as long as the process lives.
    --password|--password=*|--pass|--pass=*)
      die "Không nhận mật khẩu trên dòng lệnh — ai cũng đọc được bằng \`ps\`. Dùng lời nhắc, hoặc --password-stdin." ;;
    *) printf 'Không hiểu tham số: %s\n\n' "$1" >&2; usage 2 ;;
  esac
done

# ---------------------------------------------------------------- helpers ---

# Single-quote a value the way the shell will read it back unchanged. This is
# the one line that stands between `MAIL_FROM=VPET Prep <a@b>` and a file that
# no longer parses.
shq() { local s=${1//\'/\'\\\'\'}; printf "'%s'" "$s"; }

sha() { printf %s "${1-}" | sha256sum | cut -c1-16; }

# Every name the file assigns, `export FOO=` and indentation included.
env_keys() {
  [ -f "$1" ] || return 0
  grep -Eo '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' "$1" 2>/dev/null \
    | sed -E 's/^[[:space:]]*(export[[:space:]]+)?//; s/[[:space:]]*=$//' | sort -u
}

# Read one value out of the file. Runs in a clean interpreter so nothing in the
# caller's environment can stand in for a value the file failed to set.
read_value() {
  RV_FILE="$1" RV_KEY="$2" env -i PATH="$PATH" RV_FILE="$1" RV_KEY="$2" bash -c \
    'set -a; . "$RV_FILE" >/dev/null 2>&1; set +a; printf "%s" "${!RV_KEY-}"' 2>/dev/null
}

value_len() {
  RV_FILE="$1" RV_KEY="$2" env -i PATH="$PATH" RV_FILE="$1" RV_KEY="$2" bash -c \
    'set -a; . "$RV_FILE" >/dev/null 2>&1; set +a; printf "%s" "${!RV_KEY-}" | wc -c' 2>/dev/null
}

# `KEY hash` for each name given, computed inside the sourcing shell so a secret
# can be compared between two files without ever being printed.
fingerprint() {
  local file="$1"; shift
  FP_FILE="$file" FP_KEYS="$*" env -i PATH="$PATH" FP_FILE="$file" FP_KEYS="$*" bash -c '
    set -a; . "$FP_FILE" >/dev/null 2>&1; set +a
    for k in $FP_KEYS; do printf "%s %s\n" "$k" "$(printf %s "${!k-}" | sha256sum | cut -c1-16)"; done
  ' 2>/dev/null
}

# Replace the first assignment of KEY, drop any later duplicates (in a sourced
# file the last one wins, so leaving one behind would make this edit a no-op),
# append when the key is absent. The value travels through the environment
# rather than an argument or a sed pattern: no quoting to get wrong, and no
# `ps` exposure.
set_kv() {
  local file="$1" key="$2" value="$3" tmp rc
  tmp="$(mktemp "${file}.tmp.XXXXXX")" || return 1
  chmod 600 "$tmp"
  SETUP_LINE="$key=$(shq "$value")" awk -v key="$key" '
    BEGIN { pat = "^[[:space:]]*(export[[:space:]]+)?" key "[[:space:]]*=" ; n = 0 }
    $0 ~ pat { n++; if (n == 1) print ENVIRON["SETUP_LINE"]; next }
    { print }
    END { if (n == 0) print ENVIRON["SETUP_LINE"] }
  ' "$file" > "$tmp"
  rc=$?
  if [ $rc -ne 0 ]; then rm -f "$tmp"; return 1; fi
  cat "$tmp" > "$file" && rm -f "$tmp"
}

# PM2 lives in the app user's PATH more often than in root's.
PM2_BIN=''
find_pm2() {
  [ -n "$PM2_BIN" ] && return 0
  if command -v pm2 >/dev/null 2>&1; then PM2_BIN="$(command -v pm2)"; return 0; fi
  if [ "$(id -u)" = 0 ] && id "$APP_USER" >/dev/null 2>&1; then
    PM2_BIN="$(sudo -u "$APP_USER" bash -lc 'command -v pm2' 2>/dev/null)"
    [ -n "$PM2_BIN" ] && return 0
  fi
  return 1
}

run_pm2() {
  if [ "$(id -u)" = 0 ] && id "$APP_USER" >/dev/null 2>&1 && [ "$(id -un)" != "$APP_USER" ]; then
    sudo -E -u "$APP_USER" "$PM2_BIN" "$@"
  else
    "$PM2_BIN" "$@"
  fi
}

# One value out of the running process, empty when it is not set. Non-secret
# keys only — this prints what it finds.
pm2_value() {
  find_pm2 || return 1
  run_pm2 jlist 2>/dev/null | APP_NAME="$APP_NAME" PM_KEY="$1" node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      let j; try { j = JSON.parse(s.slice(s.indexOf("["))); } catch { return; }
      const app = j.find(a => a.name === process.env.APP_NAME);
      if (!app) return;
      const v = (app.pm2_env || {})[process.env.PM_KEY];
      if (v !== undefined) process.stdout.write(String(v));
    });' 2>/dev/null
}

# What the RUNNING process believes, which is the only thing that sends mail.
# `pm2 restart --update-env` merges the environment it is handed; a variable
# added to the file and never sourced is simply not there, and nothing says so.
pm2_report() {
  find_pm2 || { note "không tìm thấy pm2 — bỏ qua phần kiểm tiến trình đang chạy"; return 0; }
  local jl
  jl="$(run_pm2 jlist 2>/dev/null)" || { note "pm2 jlist không chạy được"; return 0; }
  printf '%s' "$jl" | APP_NAME="$APP_NAME" node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      let j; try { j = JSON.parse(s.slice(s.indexOf("["))); } catch { console.log("   (không đọc được pm2 jlist)"); return; }
      const app = j.find(a => a.name === process.env.APP_NAME);
      if (!app) { console.log("   (pm2 không có tiến trình tên " + process.env.APP_NAME + ")"); return; }
      const e = app.pm2_env || {};
      const show = k => e[k] === undefined ? "(chưa đặt)" : String(e[k]);
      const len  = k => e[k] === undefined ? "(chưa đặt)" : String(String(e[k]).length) + " ký tự";
      console.log("   tiến trình đang chạy:");
      console.log("     MAIL_DRIVER     = " + show("MAIL_DRIVER"));
      console.log("     SMTP_HOST       = " + show("SMTP_HOST"));
      console.log("     SMTP_USER       = " + show("SMTP_USER"));
      console.log("     SMTP_PASS       = " + len("SMTP_PASS"));
      console.log("     MAIL_FROM       = " + show("MAIL_FROM"));
      console.log("     PUBLIC_BASE_URL = " + show("PUBLIC_BASE_URL"));
    });
  ' 2>/dev/null || note "(không đọc được pm2 jlist)"
}

# The address inside `Name <a@b>`; Gmail refuses to send as anybody else.
address_of() { printf '%s' "$1" | sed -E 's/.*<([^>]*)>[[:space:]]*$/\1/' | sed -E 's/^[[:space:]]+|[[:space:]]+$//g'; }

# ------------------------------------------------------------------ check ---

report_file() {
  printf '%s%s%s\n' "$BLD" "$ENV_FILE" "$OFF"
  if [ ! -e "$ENV_FILE" ]; then warn "tệp chưa tồn tại"; return 0; fi
  note "quyền: $(stat -c '%a %U:%G' "$ENV_FILE" 2>/dev/null)"
  [ "$(stat -c '%a' "$ENV_FILE" 2>/dev/null)" = 600 ] || warn "nên là 600 — hiện $(stat -c '%a' "$ENV_FILE")"
  if bash -n "$ENV_FILE" 2>/dev/null; then
    ok "cú pháp hợp lệ (bash -n)"
  else
    printf '%s✗ cú pháp SAI — mọi biến nằm SAU dòng lỗi đều không được đặt:%s\n' "$RED" "$OFF"
    bash -n "$ENV_FILE" 2>&1 | sed 's/^/     /'
  fi
  local k
  for k in MAIL_DRIVER SMTP_HOST SMTP_PORT SMTP_USER MAIL_FROM PUBLIC_BASE_URL; do
    printf '     %-21s= %s\n' "$k" "$(read_value "$ENV_FILE" "$k" || true)"
  done
  # Length only. A secret that gets printed to check on it has been read by
  # everyone who can see the screen, the scrollback, and the terminal log.
  for k in SMTP_PASS TOKEN_ENCRYPTION_KEY; do
    printf '     %-21s= %s ký tự\n' "$k" "$(value_len "$ENV_FILE" "$k" || echo 0)"
  done

  local from user
  from="$(read_value "$ENV_FILE" MAIL_FROM)"; user="$(read_value "$ENV_FILE" SMTP_USER)"
  if [ -n "$from" ] && [ -n "$user" ] && [ "$(address_of "$from")" != "$user" ]; then
    warn "MAIL_FROM gửi từ $(address_of "$from") nhưng đăng nhập bằng $user — Gmail sẽ từ chối hoặc ghi đè"
  fi
  [ -n "$(read_value "$ENV_FILE" PUBLIC_BASE_URL)" ] || \
    warn "PUBLIC_BASE_URL chưa đặt — link trong thư sẽ trỏ về địa chỉ máy gốc qua HTTP trần"
  [ "$(value_len "$ENV_FILE" TOKEN_ENCRYPTION_KEY)" = 44 ] || \
    warn "TOKEN_ENCRYPTION_KEY không phải 44 ký tự — kiểm lại trước khi làm gì khác"
  pm2_report
}

if [ "$MODE" = check ]; then report_file; exit 0; fi

# ------------------------------------------------------------------- test ---

if [ "$MODE" = test ]; then
  [ -n "$TEST_TO" ] || die "--test cần một địa chỉ nhận"
  [ -r "$ENV_FILE" ] || die "không đọc được $ENV_FILE (chạy bằng sudo?)"
  bash -n "$ENV_FILE" 2>/dev/null || die "$ENV_FILE sai cú pháp — sửa trước đã, xem --check"
  # Sourced inside a subshell so the password does not survive this command.
  ( set -a; . "$ENV_FILE"; set +a
    SETUP_TO="$TEST_TO" SETUP_ROOT="$ROOT" node -e '
      const mail = require(process.env.SETUP_ROOT + "/server/mail.js");
      const s = mail.settings();
      if (s.driver !== "smtp") { console.error("MAIL_DRIVER=" + s.driver + " — chưa bật smtp, sẽ không gửi thật"); process.exit(3); }
      mail.send({ to: process.env.SETUP_TO, subject: "VPET Prep — thư thử",
                  text: "Nếu bạn đọc được thư này thì SMTP đã chạy." })
        .then(r => { console.log(JSON.stringify(r)); process.exit(r.sent ? 0 : 1); });
    ' )
  rc=$?
  [ $rc -eq 0 ] && ok "gửi được tới $TEST_TO — kiểm hòm thư (cả thư mục spam)"
  [ $rc -ne 0 ] && warn "chưa gửi được — mã lỗi ở dòng JSON trên; 535 là sai App Password, EAUTH/ETIMEDOUT là chặn cổng 587"
  exit $rc
fi

# ------------------------------------------------------------------ write ---

DIR="$(dirname "$ENV_FILE")"
[ -d "$DIR" ] || die "không có thư mục $DIR"
[ -w "$DIR" ] || die "không ghi được vào $DIR — chạy lại bằng: sudo bash scripts/setup-mail.sh …"
[ ! -e "$ENV_FILE" ] || [ -w "$ENV_FILE" ] || die "không ghi được $ENV_FILE — chạy lại bằng sudo"

# An empty env file left behind by a refusal would be worse than no file: the
# next run would find it, believe it, and stop warning that the secrets are gone.
WORK=''
CREATED=0
cleanup() {
  [ -n "$WORK" ] && rm -f "$WORK"
  [ "$CREATED" = 1 ] && [ ! -s "$ENV_FILE" ] && rm -f "$ENV_FILE"
  return 0
}
trap cleanup EXIT

NEW_FILE=0
if [ ! -e "$ENV_FILE" ]; then
  NEW_FILE=1
  warn "$ENV_FILE chưa có — sẽ tạo mới. Trên máy chủ đang chạy thì đây là điều BẤT THƯỜNG:"
  warn "tệp thật chứa TOKEN_ENCRYPTION_KEY, và bản sao lưu cơ sở dữ liệu cố tình không chứa khoá đó."
  if [ "$ASSUME_YES" != 1 ]; then
    [ -t 0 ] || die "không có bàn phím để hỏi — thêm --yes nếu thật sự muốn tạo mới"
    read -r -p "   Tạo mới $ENV_FILE? [y/N] " a
    [ "$a" = y ] || [ "$a" = Y ] || die "dừng lại, chưa thay đổi gì"
  fi
  install -m 600 /dev/null "$ENV_FILE" || die "không tạo được $ENV_FILE"
  CREATED=1
fi

ORIG_OK=1
if ! bash -n "$ENV_FILE" 2>/dev/null; then
  ORIG_OK=0
  warn "$ENV_FILE ĐANG sai cú pháp. Mọi biến nằm sau dòng lỗi hiện không được đặt:"
  bash -n "$ENV_FILE" 2>&1 | sed 's/^/     /' >&2
  warn "sẽ vẫn sửa, nhưng tệp mới phải hợp lệ thì mới được ghi đè."
fi

# Defaults come from the file when it already has them: re-running this must not
# quietly change an address somebody set on purpose.
[ -n "$SMTP_USER_IN" ] || SMTP_USER_IN="$(read_value "$ENV_FILE" SMTP_USER)"
if [ -z "$SMTP_USER_IN" ]; then
  [ -t 0 ] || die "chưa có SMTP_USER — thêm --user vpetprep@gmail.com"
  read -r -p "   Địa chỉ Gmail dùng để gửi: " SMTP_USER_IN
fi
case "$SMTP_USER_IN" in *@*.*) : ;; *) die "SMTP_USER không giống địa chỉ email: $SMTP_USER_IN" ;; esac

[ -n "$MAIL_FROM_IN" ] || MAIL_FROM_IN="$(read_value "$ENV_FILE" MAIL_FROM)"
[ -n "$MAIL_FROM_IN" ] || MAIL_FROM_IN="VPET Prep <$SMTP_USER_IN>"
if [ "$(address_of "$MAIL_FROM_IN")" != "$SMTP_USER_IN" ]; then
  warn "MAIL_FROM gửi từ $(address_of "$MAIL_FROM_IN") nhưng đăng nhập bằng $SMTP_USER_IN."
  warn "Gmail chỉ cho gửi từ chính tài khoản đã đăng nhập (hoặc alias đã xác minh trong \"Send mail as\")."
fi

[ -n "$BASE_URL_IN" ] || BASE_URL_IN="$(read_value "$ENV_FILE" PUBLIC_BASE_URL)"
if [ -z "$BASE_URL_IN" ]; then
  warn "PUBLIC_BASE_URL chưa đặt. Không có nó, link đặt lại mật khẩu trong thư dựng từ header Host"
  warn "mà máy gốc nhận được sau CloudFront — tức là http://<địa chỉ máy gốc>/… qua HTTP trần."
  if [ -t 0 ] && [ "$ASSUME_YES" != 1 ]; then
    read -r -p "   Địa chỉ công khai [https://d1tjeiogootdxv.cloudfront.net]: " BASE_URL_IN
    [ -n "$BASE_URL_IN" ] || BASE_URL_IN=https://d1tjeiogootdxv.cloudfront.net
  else
    die "thêm --base-url https://d1tjeiogootdxv.cloudfront.net (hoặc tên miền thật khi đã có)"
  fi
fi
case "$BASE_URL_IN" in https://*) : ;; http://*) warn "PUBLIC_BASE_URL đang là HTTP trần — token đặt lại mật khẩu sẽ đi qua kênh không mã hoá" ;; *) die "PUBLIC_BASE_URL phải bắt đầu bằng http:// hoặc https://" ;; esac
BASE_URL_IN="${BASE_URL_IN%/}"

# --- the password -----------------------------------------------------------
if [ "$PASSWORD_STDIN" = 1 ]; then
  IFS= read -r PASSWORD || die "không đọc được mật khẩu từ stdin"
else
  [ -t 0 ] || die "không có bàn phím — dùng --password-stdin"
  printf '   App Password 16 ký tự (gõ vào không hiện ra): '
  IFS= read -rs PASSWORD; printf '\n'
fi
# Google shows it as `abcd efgh ijkl mnop`; the spaces are presentation.
PASSWORD="${PASSWORD//[[:space:]]/}"
[ -n "$PASSWORD" ] || die "mật khẩu rỗng"
if [ "$ANY_PASSWORD" != 1 ] && ! printf '%s' "$PASSWORD" | grep -Eq '^[A-Za-z0-9]{16}$'; then
  die "App Password của Google là đúng 16 chữ cái/chữ số — vừa nhận ${#PASSWORD} ký tự.
   Mật khẩu đăng nhập tài khoản KHÔNG dùng được cho SMTP (Google bỏ từ 2022, trả 535-5.7.8).
   Tạo tại myaccount.google.com/apppasswords, sau khi đã bật Xác minh 2 bước.
   Nhà cung cấp khác dùng chuỗi khác thì thêm --any-password."
fi

# --- edit a copy, prove it, then write --------------------------------------
WORK="$(mktemp "${ENV_FILE}.new.XXXXXX")" || die "không tạo được tệp tạm"
chmod 600 "$WORK"
cat "$ENV_FILE" > "$WORK" || die "không đọc được $ENV_FILE"

CHANGED=(MAIL_DRIVER SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS MAIL_FROM PUBLIC_BASE_URL)
set_kv "$WORK" MAIL_DRIVER     smtp             || die "không sửa được MAIL_DRIVER"
set_kv "$WORK" SMTP_HOST       "$SMTP_HOST_IN"  || die "không sửa được SMTP_HOST"
set_kv "$WORK" SMTP_PORT       "$SMTP_PORT_IN"  || die "không sửa được SMTP_PORT"
set_kv "$WORK" SMTP_USER       "$SMTP_USER_IN"  || die "không sửa được SMTP_USER"
set_kv "$WORK" SMTP_PASS       "$PASSWORD"      || die "không sửa được SMTP_PASS"
set_kv "$WORK" MAIL_FROM       "$MAIL_FROM_IN"  || die "không sửa được MAIL_FROM"
set_kv "$WORK" PUBLIC_BASE_URL "$BASE_URL_IN"   || die "không sửa được PUBLIC_BASE_URL"

bash -n "$WORK" 2>/dev/null || {
  printf '%s✗ tệp mới sai cú pháp — KHÔNG ghi gì cả:%s\n' "$RED" "$OFF" >&2
  bash -n "$WORK" 2>&1 | sed 's/^/     /' >&2
  exit 1
}

# Nothing else may have moved. Compared by hash inside the sourcing shell, so a
# secret is checked without being printed.
KEYS="$( { env_keys "$ENV_FILE"; env_keys "$WORK"; } | sort -u | tr '\n' ' ')"
DRIFT=''
while read -r k h; do
  [ -n "$k" ] || continue
  case " ${CHANGED[*]} " in *" $k "*) continue ;; esac
  new_h="$(fingerprint "$WORK" "$k" | awk '{print $2}')"
  [ "$h" = "$new_h" ] || DRIFT="$DRIFT $k"
done < <(fingerprint "$ENV_FILE" $KEYS)

if [ -n "$DRIFT" ]; then
  if [ "$ORIG_OK" = 1 ]; then
    die "KHÔNG ghi: những biến này lẽ ra không đổi mà lại đổi:$DRIFT"
  fi
  # The original did not parse, so values under the break read as empty. Coming
  # back is the point of the exercise, not drift.
  ok "sửa xong cú pháp — các biến sống lại:$DRIFT"
fi

for k in "${CHANGED[@]}"; do
  case "$k" in
    MAIL_DRIVER)     want=smtp ;;
    SMTP_HOST)       want="$SMTP_HOST_IN" ;;
    SMTP_PORT)       want="$SMTP_PORT_IN" ;;
    SMTP_USER)       want="$SMTP_USER_IN" ;;
    SMTP_PASS)       want="$PASSWORD" ;;
    MAIL_FROM)       want="$MAIL_FROM_IN" ;;
    PUBLIC_BASE_URL) want="$BASE_URL_IN" ;;
  esac
  got="$(fingerprint "$WORK" "$k" | awk '{print $2}')"
  [ "$got" = "$(sha "$want")" ] || die "KHÔNG ghi: $k đọc lại không ra giá trị vừa đặt"
done

BACKUP=''
if [ "$NEW_FILE" != 1 ]; then
  BACKUP="$ENV_FILE.bak-$(date +%Y%m%d%H%M%S)"
  cp -p "$ENV_FILE" "$BACKUP" || die "không sao lưu được — dừng"
  chmod 600 "$BACKUP"
fi

cat "$WORK" > "$ENV_FILE" || die "không ghi được $ENV_FILE (bản cũ còn ở $BACKUP)"
chmod 600 "$ENV_FILE"
[ "$(id -u)" = 0 ] && chown root:root "$ENV_FILE" 2>/dev/null
CREATED=0
rm -f "$WORK"; WORK=''; trap - EXIT

ok "đã ghi $ENV_FILE"
[ -n "$BACKUP" ] && note "bản cũ: $BACKUP"
note "SMTP_PASS = ${#PASSWORD} ký tự (không in ra ở đâu cả)"
note "TOKEN_ENCRYPTION_KEY = $(value_len "$ENV_FILE" TOKEN_ENCRYPTION_KEY) ký tự — phải là 44"
unset PASSWORD

# ---------------------------------------------------------------- restart ---

manual_restart() {
  printf '\n     sudo bash -c '\''set -a; . %s; set +a; sudo -E -u %s pm2 restart %s --update-env && sudo -E -u %s pm2 save'\''\n\n' \
    "$ENV_FILE" "$APP_USER" "$APP_NAME" "$APP_USER"
}

if [ "$DO_RESTART" != 1 ]; then
  printf '\n%sCòn một bước, và thiếu nó thì không có lỗi nào cả:%s\n' "$BLD" "$OFF"
  note "pm2 restart --update-env GỘP môi trường, nó KHÔNG đọc lại tệp."
  note "Chạy lại lệnh này kèm --restart, hoặc tự gõ:"
  manual_restart
  exit 0
fi

if ! find_pm2; then
  warn "đã ghi tệp nhưng không tìm thấy pm2 — nạp lại bằng tay:"
  manual_restart
  exit 1
fi
( set -a; . "$ENV_FILE"; set +a
  run_pm2 restart "$APP_NAME" --update-env && run_pm2 save ) || die "pm2 restart không thành công"
ok "đã nạp lại $APP_NAME"

# The file is not the thing that sends mail; the process is. Asking it back is
# the only way to catch a restart that merged an old environment.
running="$(pm2_value MAIL_DRIVER)"
if [ "$running" = smtp ]; then
  ok "tiến trình đang chạy đã thấy MAIL_DRIVER=smtp"
else
  warn "tiến trình đang chạy vẫn MAIL_DRIVER=${running:-chưa đặt} — tệp đúng nhưng restart chưa nạp được nó."
  warn "Thử lại bằng tay, chú ý phần \`set -a; . tệp; set +a\` phải chạy TRƯỚC pm2:"
  manual_restart
fi
pm2_report
printf '\n'
note "Kiểm tiếp: pm2 logs $APP_NAME --lines 50 | grep '\\[config\\]'  → dòng no-mail-service phải biến mất"
note "Rồi gửi thử:  sudo bash scripts/setup-mail.sh --test ban@example.com"
