@echo off
rem ===================================================================
rem  VPET Prep - cuu ho tai khoan khi khong dang nhap duoc
rem
rem  Nhay doi vao tep nay khi:
rem    - Quen mat khau quan tri
rem    - Dang nhap admin hoac student deu bao sai mat khau
rem    - Tai khoan hoc vien bi khoa
rem
rem  Script chi doi mat khau trong CSDL o may nay, khong dung toi du lieu khac.
rem ===================================================================

chcp 65001 >nul
setlocal

cd /d "%~dp0.."
if exist "%~dp0cau-hinh.bat" call "%~dp0cau-hinh.bat"

echo.
echo ==========================================
echo    VPET Prep - cuu ho tai khoan
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Tai tai https://nodejs.org
  goto :ketthuc
)

rem Server dang chay se giu file CSDL, nen tat truoc cho chac
echo Dang dung server neu con chay...
call "%~dp0dung-server.bat" >nul 2>nul

echo.
echo Tinh trang tai khoan hien tai:
echo.
node scripts/accounts.js list
echo.
echo ------------------------------------------
echo   1. Dat lai mat khau QUAN TRI ve mac dinh
echo   2. Dat lai mat khau HOC VIEN demo
echo   3. Mo khoa cac tai khoan hoc vien
echo   4. Thoat, khong doi gi
echo ------------------------------------------
echo.
set "CHON="
set /p CHON=Chon 1, 2, 3 hoac 4 roi bam Enter:

if "%CHON%"=="1" (
  echo.
  node scripts/accounts.js reset-admin
) else if "%CHON%"=="2" (
  echo.
  node scripts/accounts.js reset-student
) else if "%CHON%"=="3" (
  echo.
  node scripts/accounts.js unlock
) else (
  echo.
  echo Khong doi gi ca.
)

echo.
echo Xong. Chay chay-server.bat de bat lai server.

:ketthuc
echo.
pause
exit /b 0
