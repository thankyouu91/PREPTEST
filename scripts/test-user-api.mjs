/**
 * Kiểm thử API tài khoản học viên: /api/auth/… và /api/me.
 *
 * Chạy khi server đã bật: node scripts/test-user-api.mjs
 * Không dùng trình duyệt — chỉ fetch thuần, tự giữ cookie theo từng "phiên".
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name) => { c ? (pass++, console.log('✓ ' + name)) : (fail++, console.log('✗ ' + name)); };

/** Một "trình duyệt" nhỏ: nhớ cookie và tự gắn X-CSRF-Token */
function client() {
  const jar = new Map();
  const readSetCookie = r => {
    const all = typeof r.headers.getSetCookie === 'function'
      ? r.headers.getSetCookie()
      : (r.headers.get('set-cookie') ? [r.headers.get('set-cookie')] : []);
    for (const c of all) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i < 0) continue;
      const k = pair.slice(0, i).trim(), v = decodeURIComponent(pair.slice(i + 1).trim());
      if (v === '') jar.delete(k); else jar.set(k, v);
    }
  };
  return {
    jar,
    async req(method, path, body, extraHeaders) {
      const headers = Object.assign({ Accept: 'application/json' }, extraHeaders || {});
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (jar.has('prep_csrf') && !('X-CSRF-Token' in headers)) headers['X-CSRF-Token'] = jar.get('prep_csrf');
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      const r = await fetch(BASE + path, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'
      });
      readSetCookie(r);
      let data = null;
      try { data = await r.json(); } catch (e) { /* không phải JSON */ }
      return { status: r.status, data };
    },
    get(p, h) { return this.req('GET', p, undefined, h); },
    post(p, b, h) { return this.req('POST', p, b === undefined ? {} : b, h); },
    patch(p, b, h) { return this.req('PATCH', p, b, h); }
  };
}

/* Email duy nhất cho mỗi lần chạy để chạy lại không đụng dữ liệu cũ */
const stamp = process.env.TEST_STAMP || String(process.hrtime.bigint()).slice(-9);
const NEW_EMAIL = `hocvien.${stamp}@thu-nghiem.vn`;

console.log('\n\x1b[1m== Đăng ký ==\x1b[0m');
const c = client();

let r = await c.post('/api/auth/register', { name: 'Người Thử', email: 'sai-dinh-dang', password: 'Matkhau123' });
ok(r.status === 400, 'Từ chối email sai định dạng');

r = await c.post('/api/auth/register', { name: 'Người Thử', email: NEW_EMAIL, password: 'ngan1' });
ok(r.status === 400, 'Từ chối mật khẩu dưới 8 ký tự');

r = await c.post('/api/auth/register', { name: 'Người Thử', email: NEW_EMAIL, password: 'khongcosodau' });
ok(r.status === 400, 'Từ chối mật khẩu không có chữ số');

r = await c.post('/api/auth/register', {
  name: 'Người Thử', email: NEW_EMAIL, password: 'Matkhau123',
  interests: ['ielts', 'khong-co-that', 'ielts']
});
ok(r.status === 201, 'Đăng ký thành công');
ok(r.data && r.data.user && r.data.user.email === NEW_EMAIL, 'Trả hồ sơ với đúng email');
ok(r.data && r.data.user && r.data.user.verified === false, 'Tài khoản mới chưa xác thực');
ok(JSON.stringify(r.data.user.interests) === JSON.stringify(['ielts']), 'Lọc bỏ kỳ thi không có thật và mục trùng');
ok(!JSON.stringify(r.data).includes('pass_hash'), 'Response không lộ bản băm mật khẩu');
ok(c.jar.has('prep_user') && c.jar.has('prep_csrf'), 'Đặt cookie phiên và cookie CSRF');
const verifyToken = new URL('http://x' + (r.data.verifyLink || '/?')).searchParams.get('token');
ok(!!verifyToken, 'Có liên kết xác thực (chỉ ngoài production)');

r = await c.post('/api/auth/register', { name: 'Trùng', email: NEW_EMAIL, password: 'Matkhau123' });
ok(r.status === 409, 'Từ chối email đã đăng ký');

console.log('\n\x1b[1m== Hồ sơ và phiên ==\x1b[0m');
r = await c.get('/api/me');
ok(r.status === 200 && r.data.user.email === NEW_EMAIL, 'GET /api/me trả hồ sơ đang đăng nhập');
ok(Array.isArray(r.data.myCodes) && r.data.myCodes.length === 0, 'Tài khoản mới chưa có code nào');

const anon = client();
r = await anon.get('/api/me');
ok(r.status === 401, 'Chưa đăng nhập thì /api/me trả 401');

r = await c.patch('/api/me', { name: 'Tên Đã Sửa', email: NEW_EMAIL, interests: ['toeic'] });
ok(r.status === 200 && r.data.user.name === 'Tên Đã Sửa', 'Sửa được hồ sơ');
ok(JSON.stringify(r.data.user.interests) === JSON.stringify(['toeic']), 'Lưu đúng kỳ thi quan tâm');

/* CSRF: gửi header sai phải bị chặn */
r = await c.patch('/api/me', { name: 'Không được', email: NEW_EMAIL }, { 'X-CSRF-Token': 'sai-token' });
ok(r.status === 403, 'Chặn request sai token CSRF');

console.log('\n\x1b[1m== Xác thực email ==\x1b[0m');
r = await c.post('/api/auth/verify', { token: 'token-bia' });
ok(r.status === 400, 'Từ chối token xác thực không hợp lệ');

r = await anon.post('/api/auth/verify', { token: verifyToken });
ok(r.status === 200 && r.data.user.verified === true, 'Xác thực được từ trình duyệt khác (không cần phiên)');

r = await anon.post('/api/auth/verify', { token: verifyToken });
ok(r.status === 400, 'Token xác thực chỉ dùng được một lần');

console.log('\n\x1b[1m== Đăng nhập ==\x1b[0m');
const c2 = client();
r = await c2.post('/api/auth/login', { username: NEW_EMAIL, password: 'sai-mat-khau' });
ok(r.status === 401, 'Sai mật khẩu bị từ chối');
ok(r.data.error && !/không tồn tại|chưa đăng ký/i.test(r.data.error), 'Lỗi không tiết lộ tài khoản có tồn tại hay không');

r = await c2.post('/api/auth/login', { username: 'khong-ai-ca@vidu.vn', password: 'Matkhau123' });
ok(r.status === 401, 'Tài khoản không tồn tại cũng trả 401 giống hệt');

r = await c2.post('/api/auth/login', { username: NEW_EMAIL, password: 'Matkhau123' });
ok(r.status === 200 && r.data.user.email === NEW_EMAIL, 'Đăng nhập thành công');
ok(r.data.user.verified === true, 'Trạng thái đã xác thực được giữ');

console.log('\n\x1b[1m== Đổi mật khẩu ==\x1b[0m');
r = await c2.post('/api/me/password', { current: 'sai-roi', next: 'Matkhaumoi456' });
ok(r.status === 401, 'Chặn khi mật khẩu hiện tại sai');

r = await c2.post('/api/me/password', { current: 'Matkhau123', next: 'ngan' });
ok(r.status === 400, 'Từ chối mật khẩu mới không đạt yêu cầu');

const oldSessionCookie = c.jar.get('prep_user');
r = await c2.post('/api/me/password', { current: 'Matkhau123', next: 'Matkhaumoi456' });
ok(r.status === 200, 'Đổi mật khẩu thành công');
ok(c2.jar.get('prep_user') !== oldSessionCookie, 'Cấp phiên mới cho thiết bị đang dùng');

r = await c.get('/api/me');
ok(r.status === 401, 'Đổi mật khẩu làm hết hiệu lực phiên trên thiết bị khác');

const c3 = client();
r = await c3.post('/api/auth/login', { username: NEW_EMAIL, password: 'Matkhau123' });
ok(r.status === 401, 'Mật khẩu cũ không đăng nhập được nữa');
r = await c3.post('/api/auth/login', { username: NEW_EMAIL, password: 'Matkhaumoi456' });
ok(r.status === 200, 'Mật khẩu mới đăng nhập được');

console.log('\n\x1b[1m== Quên và đặt lại mật khẩu ==\x1b[0m');
const c4 = client();
r = await c4.post('/api/auth/forgot', { email: 'khong-ton-tai-' + stamp + '@vidu.vn' });
ok(r.status === 200 && !r.data.resetLink, 'Email lạ vẫn trả 200 và không kèm liên kết');

r = await c4.post('/api/auth/forgot', { email: NEW_EMAIL });
ok(r.status === 200, 'Yêu cầu đặt lại trả 200');
const resetToken = new URL('http://x' + (r.data.resetLink || '/?')).searchParams.get('token');
ok(!!resetToken, 'Có liên kết đặt lại cho email có thật');

r = await c4.post('/api/auth/reset', { token: resetToken, password: 'yeu' });
ok(r.status === 400, 'Từ chối mật khẩu đặt lại quá yếu');

r = await c4.post('/api/auth/reset', { token: 'token-bia', password: 'Datlai789' });
ok(r.status === 400, 'Từ chối token đặt lại không hợp lệ');

r = await c4.post('/api/auth/reset', { token: resetToken, password: 'Datlai789' });
ok(r.status === 200, 'Đặt lại mật khẩu thành công');

r = await c3.get('/api/me');
ok(r.status === 401, 'Đặt lại mật khẩu đăng xuất mọi thiết bị');

r = await c4.post('/api/auth/reset', { token: resetToken, password: 'Datlai789' });
ok(r.status === 400, 'Token đặt lại chỉ dùng được một lần');

const c5 = client();
r = await c5.post('/api/auth/login', { username: NEW_EMAIL, password: 'Datlai789' });
ok(r.status === 200, 'Đăng nhập bằng mật khẩu vừa đặt lại');

console.log('\n\x1b[1m== Tài khoản demo và đăng xuất ==\x1b[0m');
const demo = client();
r = await demo.post('/api/auth/login', { username: 'student', password: 'Goodmorning01' });
ok(r.status === 200, 'Tài khoản demo student đăng nhập được bằng tên đăng nhập');
r = await demo.get('/api/me');
ok(r.status === 200 && r.data.unlockedTestIds.includes('vpet-b1-01'), 'Quyền mở khoá suy ra từ code đã kích hoạt');
ok(r.data.myCodes.some(x => x.code === 'VPET-B1MK-24TR'), 'Liệt kê code đã kích hoạt của học viên');

const demo2 = client();
r = await demo2.post('/api/auth/login', { username: 'student@vpetprep.vn', password: 'Goodmorning01' });
ok(r.status === 200, 'Đăng nhập được bằng email');

r = await demo.post('/api/auth/logout');
ok(r.status === 200, 'Đăng xuất trả 200');
r = await demo.get('/api/me');
ok(r.status === 401, 'Phiên hết hiệu lực sau khi đăng xuất');

console.log('\n\x1b[1m== Chống dò mật khẩu ==\x1b[0m');
const brute = client();
const bruteEmail = `dodoan.${stamp}@thu-nghiem.vn`;
await brute.post('/api/auth/register', { name: 'Bị dò', email: bruteEmail, password: 'Matkhau123' });
let lastStatus = 0;
for (let i = 0; i < 6; i++) {
  const rr = await brute.post('/api/auth/login', { username: bruteEmail, password: 'sai-' + i });
  lastStatus = rr.status;
}
ok(lastStatus === 429, 'Khoá tạm sau nhiều lần sai liên tiếp');
r = await brute.post('/api/auth/login', { username: bruteEmail, password: 'Matkhau123' });
ok(r.status === 429, 'Mật khẩu đúng cũng phải chờ hết thời gian khoá');

console.log('\n' + pass + '/' + (pass + fail) + ' kiểm thử đạt');
if (fail) process.exit(1);
