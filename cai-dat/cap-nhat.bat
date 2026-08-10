@echo off
rem ===================================================================
rem  VPET Prep - keo code moi nhat tu GitHub ve thu muc nay
rem
rem  Cach dung: nhay doi vao tep nay.
rem    1. Kiem tra Git va kiem tra day co phai ban sao git khong
rem    2. DUNG LAI neu ban dang co sua doi chua luu (khong de len)
rem    3. Keo code moi, chi cho phep tua thang (--ff-only)
rem    4. Cai lai thu vien va build lai CSS
rem    5. Liet ke cac commit vua ve
rem
rem  Script nay KHONG BAO GIO xoa hay ghi de thay doi cua ban.
rem ===================================================================

chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0.."
set "NHANH=claude/prep-test-platform-design-fpiuqn"

echo.
echo ==========================================
echo    VPET Prep - cap nhat code moi nhat
echo ==========================================
echo.
echo   Thu muc : %CD%
echo   Nhanh   : %NHANH%
echo.

rem ---------- 1. Kiem tra Git ----------
where git >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Git tren may nay.
  echo.
  echo   Tai tai: https://git-scm.com/download/win
  echo   Cai xong thi dong cua so nay va chay lai tep .bat.
  goto :ketthuc_loi
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [LOI] Thu muc nay khong phai ban sao git.
  echo.
  echo   Neu day la lan dau, hay tai ve bang lenh sau o thu muc CHA:
  echo.
  echo     git clone -b %NHANH% https://github.com/thankyouu91/PREPTEST.git PrepTest
  echo.
  goto :ketthuc_loi
)

rem ---------- 2. Chan de len thay doi chua luu ----------
git diff --quiet
if errorlevel 1 goto :co_thay_doi
git diff --cached --quiet
if errorlevel 1 goto :co_thay_doi
goto :sach

:co_thay_doi
echo [DUNG LAI] Thu muc dang co thay doi chua luu:
echo.
git status --short
echo.
echo   Script khong keo code moi ve, de khong de len phan ban dang sua.
echo   Chon mot trong hai roi chay lai tep nay:
echo.
echo     Giu lai de dung sau :  git stash
echo     Bo han thay doi     :  git checkout -- .
echo.
goto :ketthuc_loi

:sach
for /f %%h in ('git rev-parse HEAD') do set "TRUOC=%%h"

rem ---------- 3. Keo code ----------
echo [1/4] Dang tai ve tu GitHub...
git fetch origin %NHANH%
if errorlevel 1 (
  echo.
  echo [LOI] Khong tai ve duoc. Kiem tra ket noi mang roi thu lai.
  goto :ketthuc_loi
)

echo [2/4] Dang cap nhat ma nguon...
git checkout %NHANH% >nul 2>nul
git pull --ff-only origin %NHANH%
if errorlevel 1 (
  echo.
  echo [LOI] Khong tua thang duoc. Nhanh o may ban da re huong khac
  echo       so voi tren GitHub, vi du ban da commit them o day.
  echo       Xem lai bang:  git log --oneline --graph --all -20
  goto :ketthuc_loi
)

rem ---------- 4. Cai lai thu vien va build ----------
echo [3/4] Dang kiem tra thu vien...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [LOI] Cai thu vien that bai.
  goto :ketthuc_loi
)

echo [4/4] Dang build lai CSS...
call npm run build
if errorlevel 1 (
  echo.
  echo [LOI] Build CSS that bai.
  goto :ketthuc_loi
)

rem ---------- 5. Bao cao ----------
for /f %%h in ('git rev-parse HEAD') do set "SAU=%%h"

echo.
echo ==========================================
if "!TRUOC!"=="!SAU!" (
  echo    Da la ban moi nhat, khong co gi thay doi.
) else (
  echo    Cac thay doi vua ve:
  echo.
  git log --oneline !TRUOC!..!SAU!
)
echo ==========================================
echo.
echo   Xong. Chay chay-server.bat de bat server.
echo.
pause
exit /b 0

:ketthuc_loi
echo.
pause
exit /b 1
