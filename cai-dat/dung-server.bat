@echo off
rem ===================================================================
rem  VPET Prep - dung server dang chay
rem
rem  Dung khi lo dong cua so server ma tien trinh node van con song,
rem  hoac khi chay lai bao "cong 3000 dang duoc dung".
rem
rem  Script chi tat tien trinh node.exe dang nghe o cong cua du an;
rem  tien trinh khac (vi du mot server khac cua ban) se duoc bo qua.
rem ===================================================================

chcp 65001 >nul
setlocal enabledelayedexpansion

set "PORT=3000"
if exist "%~dp0cau-hinh.bat" call "%~dp0cau-hinh.bat"

echo.
echo Dang tim tien trinh nghe o cong %PORT%...
echo.

set "TIMTHAY=0"
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /r /c:"LISTENING" ^| findstr /r /c:":%PORT% "') do (
  set "TIMTHAY=1"
  call :xu_ly_pid %%p
)

if "!TIMTHAY!"=="0" (
  echo   Khong co tien trinh nao nghe o cong %PORT%. Khong can lam gi.
)

echo.
pause
exit /b 0

:xu_ly_pid
set "PID=%~1"
tasklist /fi "pid eq %PID%" /nh 2>nul | findstr /i /c:"node.exe" >nul
if errorlevel 1 (
  echo   - Bo qua PID %PID%: khong phai node.exe, de nguyen cho an toan.
  exit /b 0
)
taskkill /f /pid %PID% >nul 2>nul
if errorlevel 1 (
  echo   - Khong tat duoc PID %PID%. Thu chay lai tep nay bang quyen Administrator.
) else (
  echo   - Da dung node.exe PID %PID%.
)
exit /b 0
