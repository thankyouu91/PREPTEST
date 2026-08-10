@echo off
rem ===================================================================
rem  VPET Prep - chay server tren may Windows
rem
rem  Cach dung: nhay doi vao tep nay. Script tu lam ca bon viec:
rem    1. Kiem tra Node.js (can ban 22.5 tro len vi dung node:sqlite)
rem    2. Cai dependency neu thieu
rem    3. Build CSS neu chua co
rem    4. Bat server va mo trinh duyet
rem
rem  Tham so tuy chon:
rem    chay-server.bat build   -> build lai CSS du da co san
rem
rem  Muon doi cong hoac mat khau quan tri: chep cau-hinh.mau.bat thanh
rem  cau-hinh.bat roi sua trong do (tep nay khong bi commit len git).
rem ===================================================================

chcp 65001 >nul
setlocal enabledelayedexpansion

rem Chuyen ve thu muc goc cua du an (tep nay nam trong cai-dat\)
cd /d "%~dp0.."

set "PORT=3000"
if exist "%~dp0cau-hinh.bat" (
  echo [cau hinh] Doc cai dat rieng tu cai-dat\cau-hinh.bat
  call "%~dp0cau-hinh.bat"
)

echo.
echo ==========================================
echo    VPET Prep - Luyen thi thu chung chi
echo ==========================================
echo.

rem ---------- 1. Kiem tra Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js tren may nay.
  echo.
  echo   Tai ban LTS moi nhat tai: https://nodejs.org
  echo   Can Node.js phien ban 22.5 tro len.
  echo   Cai xong thi dong cua so nay va chay lai tep .bat.
  goto :ketthuc_loi
)

for /f "tokens=1 delims=v" %%a in ('node --version') do set "NODE_VER=%%a"
for /f "tokens=1,2 delims=." %%a in ("!NODE_VER!") do (
  set "NODE_MAJOR=%%a"
  set "NODE_MINOR=%%b"
)

set "NODE_CU=0"
if !NODE_MAJOR! LSS 22 set "NODE_CU=1"
if !NODE_MAJOR! EQU 22 if !NODE_MINOR! LSS 5 set "NODE_CU=1"

if "!NODE_CU!"=="1" (
  echo [LOI] Node.js !NODE_VER! qua cu.
  echo.
  echo   Du an dung module node:sqlite, co tu Node.js 22.5 tro len.
  echo   Nang cap tai: https://nodejs.org
  goto :ketthuc_loi
)
echo [1/4] Node.js !NODE_VER! - dat yeu cau.

rem ---------- 2. Cai dependency ----------
if not exist "node_modules\express\package.json" (
  echo [2/4] Chua co thu vien, dang cai... viec nay mat vai phut o lan dau.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo [LOI] Cai dependency that bai. Kiem tra ket noi mang roi thu lai.
    goto :ketthuc_loi
  )
) else (
  echo [2/4] Thu vien da san sang.
)

rem ---------- 3. Build CSS ----------
set "CAN_BUILD=0"
if not exist "public\tailwind-built.css" set "CAN_BUILD=1"
if /i "%~1"=="build" set "CAN_BUILD=1"

if "!CAN_BUILD!"=="1" (
  echo [3/4] Dang build CSS...
  call npm run build
  if errorlevel 1 (
    echo.
    echo [LOI] Build CSS that bai.
    goto :ketthuc_loi
  )
) else (
  echo [3/4] CSS da co san. Muon build lai thi chay: chay-server.bat build
)

rem ---------- 4. Chay server ----------
echo [4/4] Dang bat server o cong %PORT%...
echo.
echo   Hoc vien:  http://localhost:%PORT%/prep/landing/
echo   Quan tri:  http://localhost:%PORT%/admin/
echo.
echo   Trinh duyet se tu mo sau vai giay.
echo   Muon dung server: bam Ctrl+C trong cua so nay, hoac chay dung-server.bat
echo.

rem Mo trinh duyet o tien trinh phu, doi den khi server thuc su len
start "" /b "%~dp0_mo-trinh-duyet.bat" %PORT%

rem Chay o tien trinh chinh de con thay log va bam Ctrl+C duoc
node server.js

echo.
echo Server da dung.
goto :ketthuc

:ketthuc_loi
echo.
pause
exit /b 1

:ketthuc
echo.
pause
exit /b 0
