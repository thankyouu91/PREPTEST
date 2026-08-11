/**
 * Công cụ cứu hộ tài khoản — chạy trực tiếp trên CSDL, không cần đăng nhập.
 *
 * Vì sao cần: hàm khởi tạo chỉ tạo tài khoản quản trị khi CSDL CHƯA có admin
 * nào. Từ lần chạy thứ hai trở đi nó im lặng, không in gì. Nếu mật khẩu trong
 * CSDL đã khác với mật khẩu ghi trong README — do đổi tay, do một lần chạy cũ,
 * hay do quên — thì trước đây không có đường nào vào lại.
 *
 * Cách dùng (chạy ở thư mục gốc dự án, khi server ĐANG TẮT):
 *
 *   node scripts/tai-khoan.js xem
 *       Liệt kê tài khoản quản trị và trạng thái tài khoản học viên demo.
 *       Không in mật khẩu vì CSDL chỉ lưu bản băm, không lấy lại được.
 *
 *   node scripts/tai-khoan.js dat-lai-admin [mật-khẩu-mới]
 *       Đặt lại mật khẩu quản trị. Bỏ trống thì dùng lại mật khẩu mặc định
 *       trong README. Kèm --user=<tên> nếu có nhiều tài khoản quản trị.
 *
 *   node scripts/tai-khoan.js dat-lai-student
 *       Đưa mật khẩu tài khoản học viên demo về đúng giá trị ghi trong README.
 *
 *   node scripts/tai-khoan.js mo-khoa
 *       Bỏ trạng thái khoá của mọi tài khoản học viên.
 *
 * Lưu ý: cơ chế chống dò mật khẩu (sai 5 lần thì khoá 15 phút) nằm trong bộ
 * nhớ tiến trình, nên chỉ cần tắt rồi bật lại server là hết khoá.
 */
'use strict';

const A = require('../server/auth');
const { q, nowISO, DB_FILE } = require('../server/db');

const MAT_KHAU_ADMIN_MAC_DINH = 'Goodmorning01';
const MAT_KHAU_STUDENT_DEMO = 'Goodmorning01';

const args = process.argv.slice(2);
const lenh = args[0] || 'xem';
const thamSo = args.slice(1).filter(a => !a.startsWith('--'));
const co = ten => {
  const m = args.find(a => a.startsWith('--' + ten + '='));
  return m ? m.slice(ten.length + 3) : '';
};

console.log('CSDL: ' + DB_FILE + '\n');

function xem() {
  const admins = q.all('SELECT username, name, role, active, created_at, last_login_at FROM admins ORDER BY id');
  if (!admins.length) {
    console.log('Chưa có tài khoản quản trị nào. Chạy server một lần là nó tự tạo.');
  } else {
    console.log('Tài khoản quản trị (' + admins.length + '):');
    admins.forEach(a => console.log(
      '  · ' + a.username + '  —  ' + a.name +
      '  [' + a.role + (a.active ? '' : ', ĐANG TẮT') + ']' +
      (a.last_login_at ? '  đăng nhập gần nhất ' + a.last_login_at.slice(0, 16).replace('T', ' ') : '  chưa đăng nhập lần nào')
    ));
  }

  const s = q.get("SELECT username, email, verified, status, pass_hash FROM users WHERE username='student'");
  console.log('\nTài khoản học viên demo:');
  if (!s) {
    console.log('  · Không có tài khoản "student" trong CSDL.');
  } else {
    console.log('  · ' + s.username + ' (' + s.email + ')' +
      '  ' + (s.verified ? 'đã xác thực' : 'CHƯA xác thực') +
      ', trạng thái ' + s.status +
      ', ' + (s.pass_hash ? 'có mật khẩu' : 'CHƯA đặt mật khẩu'));
  }

  const khoa = q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  console.log('\nHọc viên đang bị khoá: ' + khoa);
  console.log('\nCSDL chỉ lưu bản băm nên không đọc lại được mật khẩu.');
  console.log('Vào không được thì chạy:  node scripts/tai-khoan.js dat-lai-admin');
}

function datLaiAdmin() {
  const matKhau = thamSo[0] || MAT_KHAU_ADMIN_MAC_DINH;
  if (matKhau.length < 10) {
    console.error('Mật khẩu phải dài ít nhất 10 ký tự.');
    process.exit(1);
  }

  const ten = co('user');
  const admins = q.all('SELECT id, username FROM admins ORDER BY id');
  if (!admins.length) {
    console.error('CSDL chưa có tài khoản quản trị nào. Bật server một lần để nó tự tạo rồi chạy lại.');
    process.exit(1);
  }
  let chon = ten ? admins.find(a => a.username === ten) : admins[0];
  if (!chon) {
    console.error('Không có tài khoản quản trị tên "' + ten + '". Đang có: ' +
      admins.map(a => a.username).join(', '));
    process.exit(1);
  }
  if (!ten && admins.length > 1) {
    console.log('Có ' + admins.length + ' tài khoản quản trị, đang chọn cái đầu tiên.');
    console.log('Muốn đổi cái khác thì thêm --user=<tên đăng nhập>.\n');
  }

  q.run('UPDATE admins SET pass_hash=?, active=1 WHERE id=?', A.hashPassword(matKhau), chon.id);
  A.dropSessions ? A.dropSessions(chon.id) : q.run('DELETE FROM sessions WHERE admin_id=?', chon.id);
  q.run('INSERT INTO audit (admin_id,admin_name,action,target,meta_json,ip,at) VALUES (?,?,?,?,?,?,?)',
    null, 'cli', 'admin.password.reset', 'admins/' + chon.username, '{"source":"scripts/tai-khoan.js"}', null, nowISO());

  console.log('Đã đặt lại mật khẩu quản trị.');
  console.log('  Tên đăng nhập : ' + chon.username);
  console.log('  Mật khẩu      : ' + matKhau);
  console.log('\nMọi phiên đăng nhập cũ của tài khoản này đã bị thu hồi.');
  console.log('Bật lại server rồi vào /admin/ và đổi mật khẩu trong mục Quản trị.');
}

function datLaiStudent() {
  const u = q.get("SELECT id FROM users WHERE username='student'");
  if (!u) {
    console.error('Không tìm thấy tài khoản "student". CSDL này có thể chưa được seed.');
    process.exit(1);
  }
  q.run("UPDATE users SET pass_hash=?, verified=1, status='active' WHERE id=?",
    A.hashPassword(MAT_KHAU_STUDENT_DEMO), u.id);
  q.run('DELETE FROM user_sessions WHERE user_id=?', u.id);
  console.log('Đã đưa tài khoản học viên demo về đúng mật khẩu ghi trong README.');
  console.log('  Tên đăng nhập : student  (hoặc student@vpetprep.vn)');
  console.log('  Mật khẩu      : ' + MAT_KHAU_STUDENT_DEMO);
}

function moKhoa() {
  const n = q.val("SELECT COUNT(*) c FROM users WHERE status='locked'");
  q.run("UPDATE users SET status='active' WHERE status='locked'");
  console.log('Đã mở khoá ' + n + ' tài khoản học viên.');
  console.log('Nếu bị chặn vì nhập sai nhiều lần thì chỉ cần tắt rồi bật lại server:');
  console.log('bộ đếm đó nằm trong bộ nhớ tiến trình, không lưu vào CSDL.');
}

const LENH = {
  'xem': xem,
  'dat-lai-admin': datLaiAdmin,
  'dat-lai-student': datLaiStudent,
  'mo-khoa': moKhoa
};

if (!LENH[lenh]) {
  console.error('Lệnh không hợp lệ: ' + lenh);
  console.error('Dùng một trong: ' + Object.keys(LENH).join(', '));
  process.exit(1);
}
LENH[lenh]();
