/**
 * Kiểm thử API quản trị: đăng nhập, CSRF, phân quyền, CRUD đề, ngân hàng câu hỏi,
 * sinh đề tự động, cấp code, xuất CSV, nhật ký.
 *
 * Chạy: node scripts/test-admin.mjs   (cần server đang chạy)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const USER = process.env.ADMIN_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || 'Admin@123456';

const results = [];
const check = (name, ok, extra) => results.push({ name, ok: !!ok, extra });

/* Client giữ cookie giữa các request (không có trình duyệt) */
const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
function absorb(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const k = pair.slice(0, i).trim();
    const v = pair.slice(i + 1).trim();
    if (v === '') jar.delete(k); else jar.set(k, v);
  }
}

async function call(method, path, body, opts) {
  opts = opts || {};
  const headers = { 'Accept': 'application/json' };
  if (jar.size) headers.Cookie = cookieHeader();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && !opts.noCsrf) {
    const t = jar.get('prep_csrf');
    if (t) headers['X-CSRF-Token'] = opts.badCsrf ? 'sai-token' : decodeURIComponent(t);
  }
  const res = await fetch(BASE + path, {
    method, headers, redirect: 'manual',
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  absorb(res);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { status: res.status, data, headers: res.headers };
}

const run = async () => {
  /* 1. Chưa đăng nhập thì API và trang quản trị đều bị chặn */
  let r = await call('GET', '/api/admin/reports');
  check('Chặn API báo cáo khi chưa đăng nhập', r.status === 401, 'status ' + r.status);

  r = await call('GET', '/admin/');
  check('Trang /admin/ chuyển hướng về đăng nhập khi chưa có phiên',
    r.status === 302 && String(r.headers.get('location')).includes('/admin/dang-nhap/'),
    'status ' + r.status);

  /* 2. Sai mật khẩu bị từ chối */
  r = await call('POST', '/api/admin/login', { username: USER, password: 'sai-mat-khau' });
  check('Từ chối mật khẩu sai', r.status === 401, 'status ' + r.status);

  /* 3. Đăng nhập đúng */
  r = await call('POST', '/api/admin/login', { username: USER, password: PASS });
  check('Đăng nhập quản trị thành công', r.status === 200 && r.data && r.data.ok, JSON.stringify(r.data));
  check('Có cookie phiên HttpOnly và cookie CSRF', jar.has('prep_admin') && jar.has('prep_csrf'));

  /* 4. CSRF: thiếu hoặc sai token thì bị chặn */
  r = await call('POST', '/api/admin/questions', { familyId: 'ielts' }, { noCsrf: true });
  check('Chặn request thiếu token CSRF', r.status === 403, 'status ' + r.status);
  r = await call('POST', '/api/admin/questions', { familyId: 'ielts' }, { badCsrf: true });
  check('Chặn request sai token CSRF', r.status === 403, 'status ' + r.status);

  /* 5. Báo cáo trả đủ khối dữ liệu */
  r = await call('GET', '/api/admin/reports');
  const rep = r.data;
  check('Báo cáo trả đủ nhóm số liệu',
    rep && rep.users && rep.codes && rep.content && rep.revenue &&
    Array.isArray(rep.series) && rep.series.length === 14 && Array.isArray(rep.byFamily));
  check('Báo cáo đếm được học viên', rep.users.total > 0, 'total ' + (rep.users && rep.users.total));

  /* 6. Ngân hàng câu hỏi: tạo, sửa, lọc, kiểm tra dữ liệu vào */
  r = await call('POST', '/api/admin/questions', {
    familyId: 'ielts', skill: 'reading', level: 'B2', type: 'mcq',
    prompt: 'Câu kiểm thử tự động: chọn từ đồng nghĩa với "rapid".',
    options: ['quick', 'slow', 'heavy', 'quiet'], answer: 'quick'
  });
  const qid = r.data && r.data.id;
  check('Tạo câu hỏi mới', r.status === 201 && qid > 0, JSON.stringify(r.data));

  r = await call('POST', '/api/admin/questions', {
    familyId: 'ielts', skill: 'reading', level: 'B2', type: 'mcq',
    prompt: 'Câu sai: đáp án không nằm trong phương án.',
    options: ['a', 'b'], answer: 'z'
  });
  check('Từ chối câu trắc nghiệm có đáp án ngoài phương án', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'khong-ton-tai', skill: 'reading', level: 'B2', type: 'mcq',
    prompt: 'Câu thuộc kỳ thi không tồn tại', options: ['a', 'b'], answer: 'a'
  });
  check('Từ chối câu thuộc kỳ thi không tồn tại', r.status === 400, 'status ' + r.status);

  r = await call('PUT', '/api/admin/questions/' + qid, {
    familyId: 'ielts', skill: 'reading', level: 'C1', type: 'mcq',
    prompt: 'Câu kiểm thử đã sửa: chọn từ đồng nghĩa với "rapid".',
    options: ['quick', 'slow'], answer: 'quick'
  });
  check('Sửa câu hỏi', r.status === 200);

  r = await call('GET', '/api/admin/questions?family=ielts&skill=reading&level=C1&q=' + encodeURIComponent('đã sửa'));
  check('Lọc câu hỏi theo kỳ thi, kỹ năng, độ khó, từ khoá',
    r.data && r.data.items.some(i => i.id === qid), 'total ' + (r.data && r.data.total));

  r = await call('POST', '/api/admin/questions/' + qid + '/status', { status: 'retired' });
  check('Ngưng dùng câu hỏi', r.status === 200);

  /* 7. Nhập hàng loạt: dòng hợp lệ vào, dòng lỗi bị báo */
  r = await call('POST', '/api/admin/questions/bulk', {
    items: [
      { familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', prompt: 'Đề viết kiểm thử số một, mô tả biểu đồ.' },
      { familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', prompt: 'Đề viết kiểm thử số hai, nêu quan điểm.' },
      { familyId: 'vpet', skill: 'writing', level: 'ZZ', type: 'essay', prompt: 'Dòng lỗi độ khó không hợp lệ.' }
    ]
  });
  check('Nhập hàng loạt: nhận dòng đúng, báo dòng lỗi',
    r.status === 201 && r.data.inserted === 2 && r.data.failed === 1, JSON.stringify(r.data));


  /* 7b. Tệp CSV mẫu để nhập hàng loạt */
  r = await call('GET', '/api/admin/questions/template.csv');
  const csvLines = String(r.data).replace(/^\ufeff/, '').split('\r\n');
  check('Tải được CSV mẫu có tiêu đề đúng',
    r.status === 200 && csvLines[0].startsWith('ky_thi,ky_nang,do_kho,dang_cau,noi_dung'),
    csvLines[0] && csvLines[0].slice(0, 50));
  check('CSV mẫu có dòng ví dụ', csvLines.length >= 4, 'dòng ' + csvLines.length);

  /* 8. Đề thi: tạo thủ công → thêm phần → gắn câu → phát hành */
  r = await call('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Đề kiểm thử tự động', level: 'B1', durationMin: 60
  });
  const testId = r.data && r.data.id;
  check('Tạo đề thủ công', r.status === 201 && !!testId, JSON.stringify(r.data && r.data.id));

  r = await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  check('Không cho phát hành đề chưa có phần nào', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Reading', skill: 'reading', type: 'Trắc nghiệm', minutes: 30
  });
  const secId = r.data && r.data.id;
  check('Thêm phần thi', r.status === 201 && secId > 0);

  r = await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  check('Không cho phát hành khi phần chưa có câu hỏi', r.status === 400, 'status ' + r.status);

  const bank = (await call('GET', '/api/admin/questions?family=vpet&skill=reading&status=active&limit=5')).data;
  r = await call('POST', '/api/admin/sections/' + secId + '/items', {
    questionIds: bank.items.map(i => i.id)
  });
  check('Gắn câu hỏi vào phần', r.status === 200 && r.data.added === bank.items.length, JSON.stringify(r.data));

  // Câu sai kỹ năng phải bị bỏ qua, không gắn nhầm vào phần
  const wrongSkill = (await call('GET', '/api/admin/questions?family=vpet&skill=speaking&status=active&limit=2')).data;
  r = await call('POST', '/api/admin/sections/' + secId + '/items', {
    questionIds: wrongSkill.items.map(i => i.id)
  });
  check('Bỏ qua câu không cùng kỹ năng với phần thi',
    r.status === 200 && r.data.added === 0 && r.data.skipped === wrongSkill.items.length, JSON.stringify(r.data));

  r = await call('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  check('Phát hành được khi mọi phần đã có câu hỏi', r.status === 200, JSON.stringify(r.data));

  r = await call('GET', '/api/catalog');
  check('Đề đã phát hành xuất hiện trong catalog công khai',
    r.data.tests.some(t => t.id === testId));

  /* 9. Sinh đề tự động */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'toeic', level: 'B1',
    title: 'TOEIC sinh tự động (kiểm thử)',
    blueprint: [
      { name: 'Listening', skill: 'listening', type: 'Trắc nghiệm', items: 10, minutes: 20 },
      { name: 'Reading', skill: 'reading', type: 'Trắc nghiệm', items: 10, minutes: 25 }
    ]
  });
  const autoTest = r.data;
  check('Sinh đề tự động từ ngân hàng',
    r.status === 201 && autoTest.sections.length === 2 && autoTest.totalItems === 20,
    'items ' + (autoTest && autoTest.totalItems));
  check('Đề sinh tự động ở trạng thái nháp', autoTest && autoTest.status === 'draft');

  const dup = new Set(autoTest.sections.flatMap(s => s.items.map(i => i.questionId)));
  check('Không bốc trùng câu trong cùng một đề', dup.size === autoTest.totalItems);

  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'toeic', level: 'B1',
    blueprint: [{ name: 'Listening', skill: 'listening', type: 'Trắc nghiệm', items: 9999, minutes: 20 }]
  });
  check('Báo thiếu câu khi ngân hàng không đủ',
    r.status === 409 && Array.isArray(r.data.shortages) && r.data.shortages.length === 1,
    'status ' + r.status);

  const firstIds = autoTest.sections[0].items.map(i => i.questionId).join(',');
  r = await call('POST', '/api/admin/sections/' + autoTest.sections[0].id + '/reshuffle');
  check('Bốc lại câu cho một phần', r.status === 200 && r.data.count === 10);
  const after = await call('GET', '/api/admin/tests/' + autoTest.id);
  check('Bốc lại giữ nguyên số câu', after.data.sections[0].items.length === 10);

  /* 10. Cấp code theo lô + thu hồi + xuất CSV */
  r = await call('POST', '/api/admin/codes', {
    unlockType: 'family', unlockRef: 'toeic', qty: 5,
    expiresAt: '2027-06-30', batchName: 'Lô kiểm thử tự động'
  });
  check('Cấp lô 5 mã', r.status === 201 && r.data.created.length === 5 && r.data.batchId > 0);
  const batchId = r.data.batchId;
  check('Mã sinh đúng định dạng XXXX-XXXX-XXXX',
    r.data.created.every(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)), r.data.created[0]);
  check('Các mã trong lô không trùng nhau', new Set(r.data.created).size === 5);

  r = await call('POST', '/api/admin/codes', { unlockType: 'family', unlockRef: 'khong-co', qty: 2 });
  check('Từ chối cấp code cho kỳ thi không tồn tại', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/codes', { unlockType: 'bundle', unlockRef: 'ielts', qty: 1 });
  check('Từ chối combo chỉ có một kỳ thi', r.status === 400, 'status ' + r.status);

  r = await call('GET', '/api/admin/codes?batch=' + batchId);
  check('Liệt kê mã theo lô', r.data.total === 5, 'total ' + r.data.total);
  const codeId = r.data.items[0].id;

  r = await call('POST', '/api/admin/codes/' + codeId + '/revoke');
  check('Thu hồi mã', r.status === 200);
  r = await call('POST', '/api/admin/codes/' + codeId + '/revoke');
  check('Không thu hồi hai lần một mã', r.status === 400, 'status ' + r.status);

  r = await call('GET', '/api/admin/codes/export?batch=' + batchId);
  check('Xuất CSV danh sách mã',
    typeof r.data === 'string' && r.data.split('\r\n').length === 6, 'dòng ' + String(r.data).split('\r\n').length);

  /* 11. Cấp thẳng cho học viên */
  const users = (await call('GET', '/api/admin/users?limit=1')).data;
  const uid = users.items[0].id;
  r = await call('POST', '/api/admin/codes', { unlockType: 'family', unlockRef: 'pte', qty: 1, userId: uid });
  check('Cấp code trực tiếp cho học viên', r.status === 201 && r.data.created.length === 1);
  const detail = (await call('GET', '/api/admin/users/' + uid)).data;
  check('Code vừa cấp hiện trong hồ sơ học viên',
    detail.codes.some(c => c.code === r.data.created[0]));

  /* 12. Quản lý học viên */
  r = await call('POST', '/api/admin/users/' + uid + '/status', { status: 'locked' });
  check('Khoá tài khoản học viên', r.status === 200);
  r = await call('POST', '/api/admin/users/' + uid + '/status', { status: 'active' });
  check('Mở khoá tài khoản học viên', r.status === 200);
  r = await call('POST', '/api/admin/users/' + uid + '/status', { status: 'xoa-het' });
  check('Từ chối trạng thái học viên không hợp lệ', r.status === 400, 'status ' + r.status);

  /* 13. Cài đặt + gói bán */
  r = await call('PUT', '/api/admin/settings', { settings: { 'platform.notice': 'Kiểm thử tự động' } });
  check('Lưu cấu hình nền tảng', r.status === 200);
  r = await call('GET', '/api/admin/settings');
  check('Cấu hình được lưu lại đúng', r.data.settings['platform.notice'] === 'Kiểm thử tự động');
  r = await call('PUT', '/api/admin/settings', { settings: { 'brand.name': 'X', 'hack.key': 'y' } });
  const after2 = (await call('GET', '/api/admin/settings')).data;
  check('Bỏ qua khoá cấu hình ngoài danh sách cho phép', !('hack.key' in after2.settings));
  await call('PUT', '/api/admin/settings', { settings: { 'brand.name': 'VPET Prep', 'platform.notice': '' } });

  r = await call('PUT', '/api/admin/packages/pk-single', { price: 59000, active: true });
  check('Sửa giá gói bán', r.status === 200);
  const pkg = (await call('GET', '/api/admin/settings')).data.packages.find(p => p.id === 'pk-single');
  check('Giá gói được lưu', pkg.price === 59000, 'giá ' + pkg.price);
  await call('PUT', '/api/admin/packages/pk-single', { price: 49000, active: true });

  /* 14. Đổi mật khẩu: chặn mật khẩu yếu, chặn mật khẩu hiện tại sai */
  r = await call('POST', '/api/admin/password', { current: PASS, next: 'ngan' });
  check('Từ chối mật khẩu mới quá ngắn', r.status === 400, 'status ' + r.status);
  r = await call('POST', '/api/admin/password', { current: 'sai-roi', next: 'MatKhauMoi123' });
  check('Từ chối khi mật khẩu hiện tại sai', r.status === 403, 'status ' + r.status);

  /* 15. Nhật ký ghi nhận thao tác */
  r = await call('GET', '/api/admin/audit?limit=50');
  const actions = r.data.items.map(a => a.action);
  check('Nhật ký ghi nhận tạo đề, sinh đề và cấp code',
    ['test.create', 'test.generate', 'code.issue', 'code.revoke'].every(a => actions.includes(a)),
    actions.slice(0, 6).join(', '));

  /* 16. Dọn dữ liệu kiểm thử */
  await call('DELETE', '/api/admin/tests/' + testId);
  await call('DELETE', '/api/admin/tests/' + autoTest.id);
  const gone = await call('GET', '/api/admin/tests/' + testId);
  check('Xoá được đề kiểm thử', gone.status === 404, 'status ' + gone.status);

  /* 17. Đăng xuất huỷ phiên */
  r = await call('POST', '/api/admin/logout');
  check('Đăng xuất', r.status === 200);
  r = await call('GET', '/api/admin/reports');
  check('Phiên hết hiệu lực sau khi đăng xuất', r.status === 401, 'status ' + r.status);

  /* Kết quả */
  let failed = 0;
  for (const x of results) {
    console.log((x.ok ? '✓ ' : '✗ ') + x.name + (x.ok || !x.extra ? '' : '  → ' + x.extra));
    if (!x.ok) failed++;
  }
  console.log(failed ? `\n${failed}/${results.length} kiểm thử THẤT BẠI` : `\n${results.length}/${results.length} kiểm thử đạt`);
  process.exitCode = failed ? 1 : 0;
};

run().catch(e => { console.error(e); process.exit(1); });
