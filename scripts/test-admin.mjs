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
    Array.isArray(rep.series) && Array.isArray(rep.byFamily));
  check('Báo cáo đếm được học viên', rep.users.total > 0, 'total ' + (rep.users && rep.users.total));

  /* 5b. Dashboard quản lý tổng: cửa sổ thời gian, so sánh kỳ, phễu, việc cần làm */
  check('Mặc định là kỳ 30 ngày',
    rep.period && rep.period.days === 30 && rep.series.length === 30,
    'days ' + (rep.period && rep.period.days) + ', series ' + rep.series.length);

  for (const d of [7, 30, 90]) {
    r = await call('GET', '/api/admin/reports?days=' + d);
    check('Kỳ ' + d + ' ngày trả đúng ' + d + ' điểm dữ liệu',
      r.data.period.days === d && r.data.series.length === d,
      'series ' + r.data.series.length);
  }

  /* Chỉ nhận 7, 30, 90 — tham số lạ phải rơi về mặc định chứ không dựng
     chuỗi 100000 ngày làm nghẽn truy vấn */
  r = await call('GET', '/api/admin/reports?days=100000');
  check('Cửa sổ thời gian lạ rơi về mặc định 30 ngày',
    r.data.period.days === 30 && r.data.series.length === 30, 'days ' + r.data.period.days);
  r = await call('GET', '/api/admin/reports?days=abc');
  check('Cửa sổ thời gian không phải số cũng rơi về mặc định', r.data.period.days === 30);

  const rep30 = (await call('GET', '/api/admin/reports?days=30')).data;

  const kpiKeys = ['users', 'redeems', 'revenue', 'orders'];
  check('Mỗi chỉ số có giá trị kỳ này, kỳ trước và mức thay đổi',
    kpiKeys.every(k => rep30.kpi[k] && typeof rep30.kpi[k].value === 'number' &&
      typeof rep30.kpi[k].prev === 'number' &&
      (rep30.kpi[k].delta === null || typeof rep30.kpi[k].delta === 'number')),
    JSON.stringify(rep30.kpi));
  check('Kỳ trước bằng 0 thì không bịa ra phần trăm tăng',
    kpiKeys.every(k => rep30.kpi[k].prev !== 0 || rep30.kpi[k].delta === null));

  /* Phễu chỉ có nghĩa khi mỗi bước là tập con của bước trước. Bước nào phình
     to hơn bước trên là định nghĩa sai, không phải dữ liệu lạ. */
  check('Phễu có đủ 4 bước và mỗi bước đều có nhãn tiếng Việt',
    Array.isArray(rep30.funnel) && rep30.funnel.length === 4 &&
    rep30.funnel.every(s => s.label && typeof s.value === 'number' && typeof s.rate === 'number'));
  check('Phễu thu hẹp dần, không có bước nào phình ra',
    rep30.funnel.every((s, i) => i === 0 || s.value <= rep30.funnel[i - 1].value),
    rep30.funnel.map(s => s.label + '=' + s.value).join(' > '));
  check('Tỷ lệ phễu tính trên bước đầu tiên',
    rep30.funnel[0].rate === 100 || rep30.funnel[0].value === 0);

  check('Việc cần làm là mảng, mỗi mục đủ mức khẩn, tiêu đề và đường dẫn',
    Array.isArray(rep30.todo) &&
    rep30.todo.every(t => ['cao', 'vua', 'thap'].includes(t.sev) && t.title && t.detail &&
      String(t.href).startsWith('/admin/') && t.cta),
    JSON.stringify(rep30.todo.map(t => t.sev)));
  check('Việc cần làm xếp khẩn trước',
    (() => {
      const bac = { cao: 0, vua: 1, thap: 2 };
      return rep30.todo.every((t, i) => i === 0 || bac[t.sev] >= bac[rep30.todo[i - 1].sev]);
    })(),
    rep30.todo.map(t => t.sev).join(','));

  check('Bảng theo kỳ thi tách riêng đề đã phát hành',
    rep30.byFamily.every(f => typeof f.published === 'number' && f.published <= f.tests),
    rep30.byFamily.map(f => f.id + ' ' + f.published + '/' + f.tests).join(', '));

  check('Doanh thu theo gói trả về mảng có tên và số tiền',
    Array.isArray(rep30.revenueByPackage) &&
    rep30.revenueByPackage.every(g => g.name && typeof g.amount === 'number' && g.orders > 0));

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
    r.status === 200 && csvLines[0].startsWith('ky_thi,ky_nang,do_kho,dang_cau,phan_thi,noi_dung'),
    csvLines[0] && csvLines[0].slice(0, 60));
  check('CSV mẫu có dòng ví dụ', csvLines.length >= 4, 'dòng ' + csvLines.length);
  /* Mẫu phải cho thấy cách điền cột phần thi, nếu không người dùng chỉ biết là
     có cột đó mà không biết viết gì vào. */
  check('CSV mẫu có ví dụ VPET đã gắn phần',
    csvLines.some(l => /^vpet,/.test(l) && /,[A-J],/.test(l)),
    csvLines.find(l => /^vpet,/.test(l)) || 'không có dòng vpet');

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
    planId: 'plus-6m', unlockType: 'family', unlockRef: 'toeic', qty: 5,
    expiresAt: '2027-06-30', batchName: 'Lô kiểm thử tự động'
  });
  check('Cấp lô 5 mã', r.status === 201 && r.data.created.length === 5 && r.data.batchId > 0);
  check('Mã cấp ra mang đúng gói đã chọn', r.data.plan && r.data.plan.id === 'plus-6m',
    JSON.stringify(r.data.plan));
  const batchId = r.data.batchId;
  check('Mã sinh đúng định dạng XXXX-XXXX-XXXX',
    r.data.created.every(c => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(c)), r.data.created[0]);
  check('Các mã trong lô không trùng nhau', new Set(r.data.created).size === 5);

  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'family', unlockRef: 'khong-co', qty: 2 });
  check('Từ chối cấp code cho kỳ thi không tồn tại', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/codes', { planId: 'plus-6m', unlockType: 'bundle', unlockRef: 'ielts', qty: 1 });
  check('Từ chối combo chỉ có một kỳ thi', r.status === 400, 'status ' + r.status);

  /* Mã không gắn gói thì kích hoạt xong vẫn không mở được gì, nên phải chặn
     ngay lúc cấp — nếu lọt, lỗi chỉ lộ ra khi học viên đã cầm mã. */
  r = await call('POST', '/api/admin/codes', { unlockType: 'family', unlockRef: 'vpet', qty: 1 });
  check('Từ chối cấp mã không chọn gói', r.status === 400, 'status ' + r.status);
  r = await call('POST', '/api/admin/codes', { planId: 'khong-co-goi-nay', unlockType: 'family', unlockRef: 'vpet', qty: 1 });
  check('Từ chối gói không có thật', r.status === 400, 'status ' + r.status);

  /* ---- Gắn nhãn phần thi VPET (A-J) ---- */
  console.log('\n\x1b[1m== Nhãn phần thi VPET ==\x1b[0m');

  /* Kỹ năng không tách nổi các phần: B và D đều là Viết/tự luận, F và G đều là
     Nghe/trắc nghiệm, H và J đều là Nói. Không có chữ cái thì hai phần khác
     nhau dùng chung một pool. */
  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'gap', part: 'A',
    prompt: 'Kiểm thử phần A: She has lived here ____ 2019.', answer: 'since'
  });
  check('Tạo câu VPET có gắn phần A', r.status === 201, 'status ' + r.status);
  const partAId = r.data.id;

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', part: 'D',
    prompt: 'Kiểm thử phần D: viết thư trả lời lời mời họp.'
  });
  check('Tạo câu VPET phần D (cùng kỹ năng Viết, khác phần)', r.status === 201, 'status ' + r.status);
  const partDId = r.data.id;

  r = await call('GET', '/api/admin/questions?family=vpet&part=A');
  check('Lọc theo phần chỉ trả câu của đúng phần đó',
    r.data.items.length > 0 && r.data.items.every(x => x.part === 'A'),
    JSON.stringify(r.data.items.map(x => x.part)));
  check('Câu phần D không lọt vào danh sách phần A',
    !r.data.items.some(x => x.id === partDId));

  r = await call('GET', '/api/admin/questions?family=vpet&part=none');
  check('Lọc "chưa gắn phần" tìm được câu còn thiếu nhãn',
    r.data.items.every(x => x.part === null),
    JSON.stringify(r.data.items.slice(0, 3).map(x => x.part)));

  /* Chữ cái phải có thật, phải khớp kỹ năng và dạng câu của phần đó — sai thì
     câu nằm nhầm pool và chỉ lộ ra khi thí sinh gặp nó giữa bài thi. */
  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'gap', part: 'Z',
    prompt: 'Kiểm thử phần không có thật.'
  });
  check('Từ chối chữ cái phần không có trong blueprint', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'speaking', level: 'B1', type: 'speaking', part: 'C',
    prompt: 'Kiểm thử phần C nhưng khai kỹ năng Nói.'
  });
  check('Từ chối phần lệch kỹ năng (C là Đọc)', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'writing', level: 'B1', type: 'essay', part: 'A',
    prompt: 'Kiểm thử phần A nhưng khai dạng tự luận.'
  });
  check('Từ chối phần lệch dạng câu (A chỉ nhận điền từ)', r.status === 400, 'status ' + r.status);

  r = await call('POST', '/api/admin/questions', {
    familyId: 'ielts', skill: 'reading', level: 'B1', type: 'mcq', part: 'A',
    options: ['a', 'b'], answer: 'a',
    prompt: 'Kiểm thử gắn phần cho kỳ thi không có bảng phần.'
  });
  check('Từ chối gắn phần cho kỳ thi chưa có bảng phần', r.status === 400, 'status ' + r.status);

  /* Báo cáo độ phủ phải tách theo từng phần: tổng theo kỹ năng che mất việc
     phần này thừa còn phần kia trắng. */
  r = await call('GET', '/api/admin/questions/availability?family=vpet&level=B1');
  const parts = r.data.parts || [];
  check('Báo cáo khả dụng tách theo 10 phần VPET', parts.length === 10, 'thấy ' + parts.length);
  const pa = parts.find(x => x.part === 'A');
  check('Phần A đếm đúng số câu cần và số câu đang có',
    pa && pa.need === 10 && pa.total >= 1, JSON.stringify(pa));
  check('Báo cáo đếm riêng số câu chưa gắn phần', typeof r.data.untagged === 'number',
    String(r.data.untagged));

  /* Format readiness cũng phải đi qua pool theo phần, nếu không nó hứa đủ câu
     trong khi trình sinh đề bốc không ra. */
  r = await call('GET', '/api/admin/exam-formats?familyId=vpet');
  const vf = r.data.formats.find(f => f.familyId === 'vpet');
  const secA = vf.sections.find(x => x.part === 'A');
  const secB = vf.sections.find(x => x.part === 'B');
  check('Mỗi phần trong báo cáo format mang chữ cái của nó',
    vf.sections.filter(x => x.part).length === 10, String(vf.sections.filter(x => x.part).length));
  check('Phần A đếm theo pool riêng của phần A', secA && secA.bank.total >= 1, JSON.stringify(secA && secA.bank));

  /* A và B cùng kỹ năng Viết nhưng khác pool. Trước đây phép thử này dựa vào
     việc phần B trống — một cách chứng minh gián tiếp, và nó hỏng ngay khi ngân
     hàng có câu phần B thật. Đếm thẳng số câu mang nhãn B rồi so với con số báo
     cáo format đưa ra: nếu B mượn câu của A thì hai số này lệch nhau. */
  const bTagged = (await call('GET', '/api/admin/questions?family=vpet&part=B')).data.total;
  const aTagged = (await call('GET', '/api/admin/questions?family=vpet&part=A')).data.total;
  check('Pool phần B đúng bằng số câu mang nhãn B',
    secB && secB.bank.total === bTagged, JSON.stringify({ pool: secB && secB.bank.total, tagged: bTagged }));
  check('Phần B không mượn câu của phần A dù cùng kỹ năng Viết',
    secB && secB.bank.total !== bTagged + aTagged && aTagged > 0,
    JSON.stringify({ b: bTagged, a: aTagged, pool: secB && secB.bank.total }));

  /* Sinh đề theo phần B chỉ được bốc câu mang nhãn B */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    blueprint: [{ name: 'Part B - Passage Reconstruction', part: 'B', skill: 'writing', type: 'Viết lại', items: 3, minutes: 9, types: ['essay'] }]
  });
  const genB = (r.data.sections || [])[0];
  check('Sinh đề phần B chỉ bốc câu của phần B',
    r.status === 201 && genB && genB.items.length === 3 && genB.items.every(i => i.part === 'B'),
    JSON.stringify({ status: r.status, parts: genB && genB.items.map(i => i.part) }));

  /* Báo thiếu vẫn phải theo phần chứ không theo kỹ năng. Phần E là chỗ kiểm
     đúng nhất: nó cần audio nên ngân hàng chưa có câu nào, trong khi phần A
     cùng dạng điền từ thì đầy. */
  r = await call('POST', '/api/admin/tests/generate', {
    familyId: 'vpet', level: 'B1',
    blueprint: [{ name: 'Part E - Dictation', part: 'E', skill: 'listening', type: 'Chép chính tả', items: 8, minutes: 6, types: ['gap'] }]
  });
  check('Sinh đề báo thiếu đúng phần E, không lấy câu phần khác',
    r.status === 409 && r.data.shortages[0].part === 'E', JSON.stringify(r.data.shortages || r.data));

  /* Section nhớ chữ cái của nó, nếu không lần bốc lại sau sẽ bốc trong cả kỹ
     năng và kéo câu của phần khác vào. */
  r = await call('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Đề kiểm thử nhãn phần', level: 'B1', durationMin: 30
  });
  const partTestId = r.data.id;
  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Part A - Sentence Completion', skill: 'writing', type: 'Điền từ', minutes: 10, part: 'A'
  });
  check('Thêm phần thi có gắn chữ cái', r.status === 201, 'status ' + r.status);
  r = await call('GET', '/api/admin/tests/' + partTestId);
  check('Đề trả về chữ cái của phần', r.data.sections[0].part === 'A', String(r.data.sections[0].part));

  r = await call('POST', '/api/admin/tests/' + partTestId + '/sections', {
    name: 'Phần sai', skill: 'writing', type: 'Điền từ', minutes: 10, part: 'Z'
  });
  check('Từ chối chữ cái phần không có thật khi thêm phần', r.status === 400, 'status ' + r.status);
  await call('DELETE', '/api/admin/tests/' + partTestId);

  await call('POST', '/api/admin/questions/' + partAId + '/status', { status: 'retired' });
  await call('POST', '/api/admin/questions/' + partDId + '/status', { status: 'retired' });

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
  /* Tệp này đem đi phát cho lớp: nói sai gói là nói sai với người mua. */
  check('CSV có cột gói và ghi đúng tên gói',
    /(^|,)goi(,|$)/.test(String(r.data).split('\r\n')[0].replace(/^\uFEFF/, '')) &&
    String(r.data).split('\r\n')[1].includes('Plus'),
    String(r.data).split('\r\n')[1]);

  /* 11. Cấp thẳng cho học viên */
  const users = (await call('GET', '/api/admin/users?limit=1')).data;
  const uid = users.items[0].id;
  r = await call('POST', '/api/admin/codes', { planId: 'starter-3m', unlockType: 'family', unlockRef: 'pte', qty: 1, userId: uid });
  check('Cấp code trực tiếp cho học viên', r.status === 201 && r.data.created.length === 1);
  const grantedCode = r.data.created[0];
  const detail = (await call('GET', '/api/admin/users/' + uid)).data;
  check('Code vừa cấp hiện trong hồ sơ học viên',
    detail.codes.some(c => c.code === grantedCode));

  /* Cấp thẳng là kích hoạt luôn, nên thời hạn truy cập phải bắt đầu đếm từ bây
     giờ. Bỏ trống thì quyền không bao giờ hết hạn — cho không một gói vĩnh viễn. */
  r = await call('GET', '/api/admin/codes?q=' + encodeURIComponent(grantedCode));
  const granted = r.data.items.find(c => c.code === grantedCode);
  check('Mã cấp thẳng có hạn truy cập tính từ lúc cấp',
    !!(granted && granted.accessExpiresAt) && new Date(granted.accessExpiresAt) > new Date(),
    granted && granted.accessExpiresAt);
  check('Bảng quản trị hiện tên gói của mã', granted && /Starter/.test(granted.label),
    granted && granted.label);

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

  /* 16b. Audio cho câu hỏi (VPET phần E, F, G, H, J)
     Gửi thẳng byte thô chứ không multipart — server đọc nguyên body. */
  async function sendAudio(id, buf, o) {
    o = o || {};
    const headers = { 'Accept': 'application/json', 'Content-Type': o.type || 'audio/mpeg' };
    if (jar.size) headers.Cookie = cookieHeader();
    if (!o.noCsrf) {
      const t = jar.get('prep_csrf');
      if (t) headers['X-CSRF-Token'] = decodeURIComponent(t);
    }
    const res = await fetch(BASE + '/api/admin/questions/' + id + '/audio', { method: 'POST', headers, body: buf });
    absorb(res);
    const ct = res.headers.get('content-type') || '';
    return { status: res.status, data: ct.includes('json') ? await res.json().catch(() => null) : null };
  }

  /* Đủ để qua phép kiểm định dạng: tệp MP3 thật mở đầu bằng "ID3" hoặc bằng
     frame sync 11 bit. Phép kiểm nhìn đúng chỗ đó chứ không tin content-type. */
  const mp3 = Buffer.concat([Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00', 'binary'), Buffer.alloc(2048, 7)]);
  const notAudio = Buffer.from('MZ\x90\x00 this is an executable, not a song', 'binary');

  r = await call('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'listening', level: 'B1', type: 'mcq',
    prompt: 'Audio fixture question', options: ['a', 'b', 'c', 'd'], answer: 'a'
  });
  const audioQid = r.data && r.data.id;
  check('Tạo được câu hỏi để gắn audio', !!audioQid, 'status ' + r.status);

  r = await sendAudio(audioQid, mp3);
  check('Tải lên được MP3 hợp lệ', r.status === 201 && r.data && r.data.bytes === mp3.length,
    'status ' + r.status + ' ' + JSON.stringify(r.data));

  r = await sendAudio(audioQid, notAudio);
  check('Từ chối tệp giả danh audio/mpeg', r.status === 400, 'status ' + r.status);

  r = await sendAudio(audioQid, mp3, { noCsrf: true });
  check('Tải lên không có CSRF bị chặn', r.status === 403, 'status ' + r.status);

  r = await sendAudio(audioQid, mp3, { type: 'application/pdf' });
  check('Từ chối content-type không phải audio', r.status === 400 || r.status === 415, 'status ' + r.status);

  {
    const res = await fetch(BASE + '/api/admin/questions/' + audioQid + '/audio', { headers: { Cookie: cookieHeader() } });
    const buf = Buffer.from(await res.arrayBuffer());
    check('Tải về đúng nguyên byte đã lưu',
      res.status === 200 && res.headers.get('content-type') === 'audio/mpeg' && buf.equals(mp3),
      'status ' + res.status + ' len ' + buf.length);
    check('Audio đề thi không được cache chung', /no-store/.test(res.headers.get('cache-control') || ''),
      res.headers.get('cache-control'));
  }

  r = await call('GET', '/api/admin/questions?family=vpet&skill=listening&limit=200');
  check('Danh sách câu hỏi báo có audio nhưng không lộ khoá lưu trữ',
    (r.data.items || []).some(x => x.id === audioQid && x.hasAudio && x.audioBytes === mp3.length) &&
    !JSON.stringify(r.data).includes('audio_key'),
    'không thấy cờ hasAudio');

  r = await call('GET', '/api/admin/exam-formats?familyId=vpet');
  {
    const list = Array.isArray(r.data) ? r.data : (r.data.items || r.data.formats || []);
    const vpet = list.find(f => f.id === 'vpet-full');
    check('Format VPET đúng 55 câu, 10 phần', !!vpet && vpet.totalItems === 55 && vpet.sections.length === 10,
      vpet ? vpet.totalItems + ' câu / ' + vpet.sections.length + ' phần' : 'không thấy format');
    const audioParts = vpet ? vpet.sections.filter(s => s.needsAudio) : [];
    check('Năm phần cần audio được đánh dấu', audioParts.length === 5, audioParts.length + ' phần');
    check('Báo thiếu audio khi ngân hàng chưa đủ tệp',
      !!vpet && vpet.audioShortBy > 0 && vpet.ready === false, vpet ? String(vpet.audioShortBy) : '-');
  }

  r = await call('DELETE', '/api/admin/questions/' + audioQid + '/audio');
  check('Gỡ được audio', r.status === 200, 'status ' + r.status);
  {
    const res = await fetch(BASE + '/api/admin/questions/' + audioQid + '/audio', { headers: { Cookie: cookieHeader() } });
    check('Gỡ xong thì không tải về được nữa', res.status === 404, 'status ' + res.status);
  }

  /* 16c. Kỳ thi chưa sẵn sàng thì API từ chối phát hành đề của nó */
  r = await call('GET', '/api/admin/exam-formats');
  {
    const list = Array.isArray(r.data) ? r.data : (r.data.items || r.data.formats || []);
    const parked = list.find(f => f.familyStatus === 'coming_soon');
    check('Màn format báo được kỳ thi nào đang chưa sẵn sàng', !!parked,
      list.map(f => f.familyId + ':' + f.familyStatus).join(', '));
  }

  r = await call('GET', '/api/admin/tests?status=draft&limit=50');
  {
    const rows = (r.data && (r.data.items || r.data)) || [];
    const parkedTest = rows.find(t => ['ielts', 'toeic', 'pte', 'ote', 'vept'].includes(t.familyId));
    check('Đề của kỳ thi chưa sẵn sàng nằm ở trạng thái nháp', !!parkedTest,
      rows.map(t => t.id + ':' + t.status).slice(0, 6).join(', '));

    if (parkedTest) {
      r = await call('POST', '/api/admin/tests/' + parkedTest.id + '/status', { status: 'published' });
      check('Không phát hành được đề của kỳ thi chưa sẵn sàng',
        r.status === 400 && /is not ready yet/.test(String(r.data && r.data.error)),
        'status ' + r.status + ' ' + JSON.stringify(r.data));

      const after = await call('GET', '/api/admin/tests/' + parkedTest.id);
      check('Đề đó vẫn ở nguyên trạng thái nháp sau khi bị từ chối',
        after.data && after.data.status === 'draft', after.data && after.data.status);
    }
  }

  r = await fetch(BASE + '/api/catalog').then(x => x.json());
  {
    const readyIds = new Set(r.families.filter(f => f.status !== 'coming_soon').map(f => f.id));
    check('Danh mục học viên chỉ còn đề của kỳ thi đang mở',
      r.tests.every(t => readyIds.has(t.familyId)),
      r.tests.filter(t => !readyIds.has(t.familyId)).map(t => t.id).join(', '));
    check('Danh mục vẫn liệt kê đủ 6 kỳ thi, kèm trạng thái',
      r.families.length === 6 && r.families.every(f => f.status),
      r.families.map(f => f.id + ':' + f.status).join(', '));
  }

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
