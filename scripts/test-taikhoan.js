/**
 * Kiểm thử đường cứu hộ tài khoản.
 *
 * Bối cảnh: hàm khởi tạo chỉ tạo admin khi CSDL chưa có admin nào, và trước đây
 * chỉ đặt mật khẩu học viên demo khi ô pass_hash còn trống. Hệ quả là hễ mật
 * khẩu trong CSDL lệch khỏi README một lần là lệch mãi, im lặng, không có đường
 * vào lại. Bộ này chốt hai thứ:
 *   1. Tài khoản demo tự phục hồi về đúng tài liệu ở mỗi lần khởi động.
 *   2. scripts/tai-khoan.js đặt lại được mật khẩu quản trị khi đã mất.
 *
 * Chạy độc lập, không cần server: node scripts/test-taikhoan.js
 */
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); }
  else { fail++; console.log('✗ ' + name + (detail ? ' — ' + detail : '')); }
};

const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'vpet-taikhoan-'));
const DB = path.join(thuMuc, 'thu.sqlite');
const GOC = path.join(__dirname, '..');

/** Chạy một đoạn mã trong tiến trình con với CSDL riêng, trả về stdout */
function chay(ma) {
  return execFileSync(process.execPath, ['-e', ma], {
    cwd: GOC, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function cli(...args) {
  return execFileSync(process.execPath, [path.join('scripts', 'tai-khoan.js'), ...args], {
    cwd: GOC, encoding: 'utf8',
    env: { ...process.env, PREP_DB: DB, NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

try {
  console.log('\n\x1b[1m== Cứu hộ tài khoản ==\x1b[0m');
  console.log('CSDL tạm: ' + DB + '\n');

  /* 1. Khởi tạo CSDL sạch */
  chay("require('./server/auth').ensureSeedAdmin();");
  const soAdmin = chay("const{q}=require('./server/db');console.log(q.val('SELECT COUNT(*) c FROM admins'))").trim();
  ok(soAdmin === '1', 'CSDL mới tự tạo một tài khoản quản trị', 'thấy ' + soAdmin);

  /* 2. Tài khoản demo về đúng tài liệu ở lần khởi động đầu */
  chay("require('./server/auth').ensureDemoStudent();");
  const dungNgay = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword('Goodmorning01', u.pass_hash))").trim();
  ok(dungNgay === 'true', 'Học viên demo đăng nhập được bằng mật khẩu ghi trong README');

  /* 3. Mật khẩu demo bị đổi → khởi động lại phải tự kéo về */
  chay("const A=require('./server/auth'),{q}=require('./server/db');" +
    "q.run('UPDATE users SET pass_hash=? WHERE username=?', A.hashPassword('DaBiDoi123'), 'student');");
  const daLech = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword('Goodmorning01', u.pass_hash))").trim();
  ok(daLech === 'false', 'Dựng được tình huống mật khẩu demo đã lệch khỏi tài liệu');

  const daSua = chay("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(daSua.includes('true'), 'Khởi động lại phát hiện lệch và tự đặt lại');

  const hetLech = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const u=q.get(\"SELECT pass_hash FROM users WHERE username='student'\");" +
    "console.log(A.verifyPassword('Goodmorning01', u.pass_hash))").trim();
  ok(hetLech === 'true', 'Mật khẩu demo đã về đúng tài liệu');

  /* 4. Không sửa gì khi đã đúng — tránh ghi CSDL và in cảnh báo mỗi lần chạy */
  const lanHai = chay("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(lanHai.includes('false'), 'Đã đúng rồi thì không đụng vào nữa');

  /* 5. Tài khoản demo bị khoá hoặc chưa xác thực cũng được kéo về */
  chay("const{q}=require('./server/db');q.run(\"UPDATE users SET status='locked', verified=0 WHERE username='student'\");");
  chay("require('./server/auth').ensureDemoStudent();");
  const trangThai = chay(
    "const{q}=require('./server/db');" +
    "const u=q.get(\"SELECT verified, status FROM users WHERE username='student'\");" +
    "console.log(u.verified + '/' + u.status)").trim();
  ok(trangThai === '1/active', 'Tài khoản demo bị khoá cũng được mở lại', trangThai);

  /* 5b. Tên hiển thị cũng được kéo về. Tên nằm trong bản seed chạy một lần, nên
     một CSDL đã tồn tại giữ mãi giá trị cũ dù seed có ghi gì — mà tên này hiện
     ở lời chào trên mọi màn đã đăng nhập. */
  chay("const{q}=require('./server/db');q.run(\"UPDATE users SET name='Tên Cũ' WHERE username='student'\");");
  const daSuaTen = chay("console.log(require('./server/auth').ensureDemoStudent())").trim();
  ok(daSuaTen.includes('true'), 'Tên hiển thị lệch cũng bị phát hiện');
  const ten = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT name FROM users WHERE username='student'\"))").trim();
  ok(ten === 'Demo Student', 'Tên hiển thị được kéo về đúng tài liệu', ten);

  /* 6. Ở production thì tuyệt đối không đụng vào tài khoản demo */
  const oProd = execFileSync(process.execPath,
    ['-e', "console.log(require('./server/auth').ensureDemoStudent())"],
    { cwd: GOC, encoding: 'utf8', env: { ...process.env, PREP_DB: DB, NODE_ENV: 'production' } }).trim();
  ok(oProd.includes('false'), 'Ở production không tự đặt lại tài khoản demo');

  /* 7. Công cụ dòng lệnh: xem không làm hỏng gì và liệt kê đúng */
  const raXem = cli('xem');
  ok(/Tài khoản quản trị \(1\)/.test(raXem), 'Lệnh "xem" liệt kê tài khoản quản trị');
  ok(!/Goodmorning01|Admin@123456/.test(raXem), 'Lệnh "xem" KHÔNG in mật khẩu ra màn hình');

  /* 8. Mất mật khẩu quản trị → đặt lại được */
  chay("const A=require('./server/auth'),{q}=require('./server/db');" +
    "q.run('UPDATE admins SET pass_hash=? WHERE username=?', A.hashPassword('KhongAiBiet999'), 'admin');");
  cli('dat-lai-admin');
  const adminOk = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const a=q.get(\"SELECT pass_hash FROM admins WHERE username='admin'\");" +
    "console.log(A.verifyPassword('Admin@123456', a.pass_hash))").trim();
  ok(adminOk === 'true', 'Đặt lại được mật khẩu quản trị về mặc định');

  /* 9. Đặt được mật khẩu tuỳ chọn, và từ chối mật khẩu quá ngắn */
  cli('dat-lai-admin', 'MatKhauRatDai123');
  const tuyChon = chay(
    "const A=require('./server/auth'),{q}=require('./server/db');" +
    "const a=q.get(\"SELECT pass_hash FROM admins WHERE username='admin'\");" +
    "console.log(A.verifyPassword('MatKhauRatDai123', a.pass_hash))").trim();
  ok(tuyChon === 'true', 'Đặt được mật khẩu quản trị tuỳ chọn');

  let choiNgan = false;
  try { cli('dat-lai-admin', 'ngan'); } catch (e) { choiNgan = true; }
  ok(choiNgan, 'Từ chối mật khẩu quá ngắn');

  /* 10. Đặt lại mật khẩu quản trị phải thu hồi hết phiên cũ */
  const conPhien = chay(
    "const{q}=require('./server/db');" +
    "q.run('INSERT INTO sessions (token_hash,admin_id,created_at,expires_at) VALUES (?,?,?,?)'," +
    "  'gia-lap', q.val(\"SELECT id FROM admins WHERE username='admin'\"), '2026-01-01T00:00:00Z', '2099-01-01T00:00:00Z');" +
    "console.log(q.val('SELECT COUNT(*) c FROM sessions'))").trim();
  ok(conPhien === '1', 'Dựng được một phiên đăng nhập cũ');
  cli('dat-lai-admin');
  const saoPhien = chay("const{q}=require('./server/db');console.log(q.val('SELECT COUNT(*) c FROM sessions'))").trim();
  ok(saoPhien === '0', 'Đặt lại mật khẩu thu hồi hết phiên cũ');

  /* 11. Mở khoá học viên */
  chay("const{q}=require('./server/db');q.run(\"UPDATE users SET status='locked' WHERE username='student'\");");
  cli('mo-khoa');
  const conKhoa = chay("const{q}=require('./server/db');console.log(q.val(\"SELECT COUNT(*) c FROM users WHERE status='locked'\"))").trim();
  ok(conKhoa === '0', 'Lệnh "mo-khoa" mở hết tài khoản bị khoá');

  /* 12. Lệnh sai thì báo lỗi rõ chứ không im lặng làm bừa */
  let choiLenhLa = false;
  try { cli('xoa-het-du-lieu'); } catch (e) { choiLenhLa = true; }
  ok(choiLenhLa, 'Lệnh không hợp lệ bị từ chối');

  /* 13. Kỳ thi chưa sẵn sàng thì không được có đề đang bán.
     Đây là luật áp lúc khởi động, nên phải thử đúng cách nó xảy ra thật: đẩy
     một đề của kỳ thi đã park lên 'published' bằng SQL, rồi khởi động lại và
     xem nó có bị kéo về nháp không. */
  const kyThiPark = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT f.id FROM families f WHERE f.status='coming_soon' " +
    "AND EXISTS (SELECT 1 FROM tests t WHERE t.family_id=f.id) ORDER BY f.sort LIMIT 1\") || '')"
  ).trim();
  ok(!!kyThiPark, 'Có kỳ thi chưa sẵn sàng nhưng vẫn còn đề trong CSDL', kyThiPark);

  const daDay = chay(
    "const{q}=require('./server/db');" +
    "const id=q.val(\"SELECT id FROM tests WHERE family_id=? LIMIT 1\", '" + kyThiPark + "');" +
    "if(id){q.run(\"UPDATE tests SET status='published' WHERE id=?\", id);console.log(id)}else{console.log('')}"
  ).trim();
  ok(!!daDay, 'Dựng được tình huống đề của kỳ thi chưa sẵn sàng bị phát hành', daDay);

  const conBan = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT COUNT(*) c FROM tests t JOIN families f ON f.id=t.family_id " +
    "WHERE t.status='published' AND f.status='coming_soon'\"))"
  ).trim();
  ok(conBan === '0', 'Khởi động lại kéo đề của kỳ thi chưa sẵn sàng về nháp', conBan + ' đề còn đang bán');

  const vpetConNguyen = chay(
    "const{q}=require('./server/db');" +
    "console.log(q.val(\"SELECT COUNT(*) c FROM tests t JOIN families f ON f.id=t.family_id " +
    "WHERE t.status='published' AND f.status='ready'\"))"
  ).trim();
  ok(Number(vpetConNguyen) > 0, 'Đề của kỳ thi đang mở không bị đụng tới', vpetConNguyen);

} finally {
  fs.rmSync(thuMuc, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
