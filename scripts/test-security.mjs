/**
 * Kiểm thử rà soát bảo mật: header, giới hạn ghi, và bảng guard từng endpoint.
 *
 * Chạy khi server đã bật: node scripts/test-security.mjs
 *
 * Ba nửa, và nửa thứ ba mới là thứ đáng giá về lâu dài:
 *
 * - Header: đọc thật qua HTTP, trên trang HTML, trên response API và trên tệp
 *   tĩnh, vì ba loại này đi qua ba nhánh khác nhau của server.
 * - Giới hạn ghi: gọi thẳng middleware với req/res giả. Bắn 300 request thật
 *   chỉ để thấy con số 429 thì tốn thời gian mà chứng minh được ít hơn.
 * - Bảng guard: đọc stack Express, khẳng định MỌI route ghi đều có guard đăng
 *   nhập và csrfGuard, trừ đúng tám endpoint đã khai trong PUBLIC_WRITES. Rồi
 *   sinh lại bảng trong docs/SECURITY.md và so — lệch một dòng là đỏ. Thêm
 *   endpoint mà quên guard thì hỏng ở đây, không đợi lần rà soát sau.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

let tmp = '';
try {
  head('Header trên mọi response');

  const html = await fetch(BASE + '/prep/landing/');
  const api = await fetch(BASE + '/api/catalog');
  const asset = await fetch(BASE + '/prep/learn/_tts.js');

  /* Header nền phải có mặt trên cả ba nhánh. Trước lượt rà soát này chỉ trang
     HTML mới được đặt header, còn API và tệp tĩnh thì trống trơn. */
  for (const [label, r] of [['trang HTML', html], ['response API', api], ['tệp tĩnh', asset]]) {
    ok(r.status === 200, 'Đọc được ' + label, 'status ' + r.status);
    ok(r.headers.get('x-content-type-options') === 'nosniff',
      'nosniff trên ' + label, String(r.headers.get('x-content-type-options')));
    ok(r.headers.get('referrer-policy') === 'strict-origin-when-cross-origin',
      'Referrer-Policy trên ' + label, String(r.headers.get('referrer-policy')));
    ok(r.headers.get('x-frame-options') === 'SAMEORIGIN',
      'X-Frame-Options trên ' + label, String(r.headers.get('x-frame-options')));
    ok(r.headers.get('cross-origin-opener-policy') === 'same-origin',
      'COOP trên ' + label);
    ok(r.headers.get('cross-origin-resource-policy') === 'same-origin',
      'CORP trên ' + label);
    ok((r.headers.get('permissions-policy') || '').includes('camera=()'),
      'Permissions-Policy trên ' + label);
  }

  /* Micro là thứ duy nhất nền tảng thật sự dùng — phần Nói ghi âm qua
     MediaRecorder. Tắt nhầm nó thì bài thi Nói hỏng mà không ai biết vì sao. */
  const pp = html.headers.get('permissions-policy') || '';
  ok(pp.includes('microphone=(self)'),
    'Permissions-Policy vẫn cho phép micro — phần Nói cần MediaRecorder', pp.slice(0, 120));
  ok(pp.includes('camera=()') && pp.includes('geolocation=()'),
    'Camera và định vị bị tắt');

  ok(!html.headers.get('strict-transport-security'),
    'Không gửi HSTS qua HTTP — gửi lúc chạy dev sẽ ghim localhost sang HTTPS',
    String(html.headers.get('strict-transport-security')));

  const csp = html.headers.get('content-security-policy') || '';
  ok(/script-src 'self' 'nonce-/.test(csp), 'Trang HTML vẫn giữ CSP có nonce theo request');
  ok(csp.includes("default-src 'self'"), 'CSP trang HTML vẫn là default-src self');

  const apiCsp = api.headers.get('content-security-policy') || '';
  ok(apiCsp.includes("default-src 'none'") && apiCsp.includes("frame-ancestors 'none'"),
    'Response API mang CSP khoá chặt, không phải CSP của tài liệu', apiCsp);
  ok((api.headers.get('x-robots-tag') || '').includes('noindex'),
    'Response API không cho lập chỉ mục');
  ok(!(asset.headers.get('content-security-policy') || '').includes("default-src 'none'"),
    'Tệp tĩnh không bị dính CSP dành cho API');

  head('Giới hạn ghi');

  tmp = mkdtempSync(join(tmpdir(), 'prep-sec-'));
  process.env.PREP_DB = join(tmp, 'probe.sqlite');
  const require_ = createRequire(import.meta.url);
  const security = require_('../server/security.js');

  const fakeRes = () => {
    const r = { headers: {}, code: 0, body: null };
    r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
    r.status = c => { r.code = c; return r; };
    r.json = b => { r.body = b; return r; };
    return r;
  };
  const fakeReq = (method, cookie, ip) => ({
    method, ip: ip || '203.0.113.7', path: '/api/admin/tests',
    headers: cookie ? { cookie } : {}
  });

  /* Đọc thì không bao giờ bị đếm: một danh sách được tải lại nhiều lần là
     chuyện bình thường, và tính nó vào cùng một xô với ghi sẽ khoá nhầm. */
  let called = 0;
  security.writeLimit(fakeReq('GET'), fakeRes(), () => called++);
  security.writeLimit(fakeReq('HEAD'), fakeRes(), () => called++);
  ok(called === 2, 'GET và HEAD đi thẳng, không tiêu lượt ghi', String(called));

  /* Hai phiên khác nhau phải có xô riêng, nếu không một người dùng nhiều sẽ
     khoá người khác — và cùng một phiên thì phải dùng chung xô dù đổi IP hay
     không, vì đó là đơn vị mà một phiên ăn cắp được tiêu. */
  const keyA = security.writeKey(fakeReq('POST', 'prep_user=aaaa'));
  const keyB = security.writeKey(fakeReq('POST', 'prep_user=bbbb'));
  const keyA2 = security.writeKey(fakeReq('POST', 'prep_user=aaaa'));
  ok(keyA !== keyB, 'Hai phiên khác nhau đếm riêng');
  ok(keyA === keyA2, 'Cùng một phiên thì cùng một xô');
  ok(!keyA.includes('aaaa'), 'Token phiên được băm, không nằm thẳng trong khoá', keyA);
  ok(security.writeKey(fakeReq('POST', '', '198.51.100.1')) !==
     security.writeKey(fakeReq('POST', '', '198.51.100.2')),
    'Chưa đăng nhập thì đếm theo địa chỉ IP');

  /* Chạm trần phải là 429 kèm Retry-After, không phải 500 hay im lặng. */
  const cookie = 'prep_user=' + 'z'.repeat(20);
  let last = null, passed = 0;
  for (let i = 0; i < security.WRITE_PER_MIN + 2; i++) {
    const res = fakeRes();
    security.writeLimit(fakeReq('POST', cookie, '198.51.100.9'), res, () => passed++);
    last = res;
  }
  ok(passed === security.WRITE_PER_MIN,
    'Đúng ' + security.WRITE_PER_MIN + ' lượt ghi được đi qua rồi mới chặn', String(passed));
  ok(last.code === 429, 'Chạm trần trả về 429', String(last.code));
  ok(Number(last.headers['retry-after']) > 0, 'Kèm Retry-After tính bằng giây',
    String(last.headers['retry-after']));

  head('Bảng guard từng endpoint');

  const map = await import('./security-map.mjs');
  const rows = map.routeTable(require_);
  ok(rows.length >= 70, 'Đọc được bảng route từ stack Express', String(rows.length));

  const mutating = rows.filter(r => r.mutating);
  ok(mutating.length >= 40, 'Có đủ route ghi để bảng nói lên điều gì', String(mutating.length));

  /* Điểm chính của cả lượt rà soát: mọi route ghi phải có guard đăng nhập và
     csrfGuard, trừ đúng những endpoint đã khai. "Đúng" theo cả hai chiều. */
  const declared = new Set(Object.keys(map.PUBLIC_WRITES));
  const naked = mutating.filter(r =>
    !r.guards.includes('requireAdmin') && !r.guards.includes('requireUser'));
  const undeclared = naked.filter(r => !declared.has(r.method + ' ' + r.path));
  ok(undeclared.length === 0,
    'Không route ghi nào thiếu guard đăng nhập mà chưa được khai trong PUBLIC_WRITES',
    undeclared.map(r => r.method + ' ' + r.path).join(', '));

  const stale = [...declared].filter(k =>
    !naked.some(r => (r.method + ' ' + r.path) === k));
  ok(stale.length === 0,
    'PUBLIC_WRITES không còn dòng thừa — endpoint đã có guard thì phải bỏ khỏi danh sách',
    stale.join(', '));
  ok(Object.values(map.PUBLIC_WRITES).every(v => v && v.length > 15),
    'Mỗi ngoại lệ đều nêu được cái gì thay thế guard');

  const guardedMut = mutating.filter(r =>
    r.guards.includes('requireAdmin') || r.guards.includes('requireUser'));
  ok(guardedMut.every(r => r.guards.includes('csrfGuard')),
    'Route ghi có guard đăng nhập thì luôn có cả csrfGuard',
    guardedMut.filter(r => !r.guards.includes('csrfGuard')).map(r => r.method + ' ' + r.path).join(', '));

  ok(mutating.every(r => r.writeLimited),
    'Mọi route ghi nằm dưới giới hạn ghi toàn cục');

  /* Ba route quản trị đăng ký TRƯỚC router.use('/admin', …) nên không được nó
     bọc. Đây là chủ ý — không thể đòi đăng nhập ở chính chỗ để đăng nhập —
     nhưng phải kiểm, vì thêm route thứ tư vào đúng chỗ đó thì nó lọt guard mà
     nhìn mã nguồn vẫn thấy "nằm trong khu /admin". */
  const adminUnguarded = rows.filter(r =>
    r.path.startsWith('/api/admin/') && !r.guards.includes('requireAdmin'));
  ok(adminUnguarded.length === 3 &&
     adminUnguarded.every(r => ['/api/admin/login', '/api/admin/logout', '/api/admin/me'].includes(r.path)),
    'Chỉ đúng ba route /admin nằm ngoài requireAdmin, và đúng ba route đó',
    adminUnguarded.map(r => r.method + ' ' + r.path).join(', '));

  head('docs/SECURITY.md còn khớp');

  const doc = readFileSync(new URL('../docs/SECURITY.md', import.meta.url), 'utf8');
  const marker = doc.indexOf('| Method | Endpoint | Guards | Write limit |');
  ok(marker > 0, 'Tệp có bảng sinh tự động');
  ok(doc.slice(marker).trim() === map.markdownTable(rows).trim(),
    'Bảng trong docs/SECURITY.md khớp với stack hiện tại — chạy lại script để cập nhật');
} catch (e) {
  fail++;
  console.log('✗ Lỗi khi chạy: ' + (e && e.stack ? e.stack : e));
} finally {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' kiểm thử đạt\x1b[0m');
process.exit(fail ? 1 : 0);
