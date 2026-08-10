@echo off
rem ===================================================================
rem  Tep phu - khong chay truc tiep.
rem  chay-server.bat goi tep nay o tien trinh phu: doi den khi server
rem  tra loi duoc roi moi mo trinh duyet, tranh canh mo ra trang loi
rem  vi server chua kip len.
rem ===================================================================

setlocal
set "PORT=%~1"
if "%PORT%"=="" set "PORT=3000"
set "URL=http://localhost:%PORT%/prep/landing/"

rem Windows 10 tro len co san curl.exe. Khong co thi doi 5 giay roi mo dai.
where curl >nul 2>nul
if errorlevel 1 (
  ping -n 6 127.0.0.1 >nul
  start "" "%URL%"
  exit /b 0
)

rem Thu toi da 40 lan, moi lan cach 1 giay
for /l %%i in (1,1,40) do (
  curl -s -o nul --max-time 1 "%URL%" && (
    start "" "%URL%"
    exit /b 0
  )
  ping -n 2 127.0.0.1 >nul
)

echo [canh bao] Doi 40 giay ma server van chua len. Mo thu cong: %URL%
exit /b 1
