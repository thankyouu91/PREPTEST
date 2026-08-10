@echo off
rem ===================================================================
rem  MAU cau hinh rieng cho may cua ban.
rem
rem  Cach dung: chep tep nay thanh  cau-hinh.bat  trong cung thu muc,
rem  roi bo dau rem o dong nao muon dung.
rem
rem  cau-hinh.bat da duoc them vao .gitignore nen mat khau ban dat o day
rem  KHONG bi commit len git. Dung viet mat khau thang vao tep .mau nay.
rem ===================================================================

rem --- Cong chay server. Doi khi cong 3000 da bi ung dung khac chiem ---
rem set "PORT=3000"

rem --- Tai khoan quan tri khoi tao ---
rem  Chi co tac dung o LAN CHAY DAU khi CSDL con trong. Da tao roi thi
rem  doi mat khau trong man Quan tri, khong doi bang bien moi truong nua.
rem set "ADMIN_USERNAME=admin"
rem set "ADMIN_PASSWORD=DatMatKhauManhVaoDay"
rem set "ADMIN_NAME=Quan tri vien"

rem --- Duong dan tep CSDL. Mac dinh la data\prep.sqlite o goc du an ---
rem set "PREP_DB=D:\du-lieu-vpet\prep.sqlite"

rem --- Dat thanh production khi chay that tren may chu ---
rem  Che do nay tat tai khoan demo va bat buoc phai co ADMIN_PASSWORD.
rem set "NODE_ENV=production"
