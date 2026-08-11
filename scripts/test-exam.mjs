/**
 * Kiểm thử engine làm bài: vòng đời một lượt thi.
 *
 * Chạy khi server đã bật: node scripts/test-exam.mjs
 * Không dùng trình duyệt — fetch thuần, tự giữ cookie.
 *
 * Trọng tâm là những thứ KHÔNG được tin vào trình duyệt: đồng hồ từng phần,
 * số lần nghe lại, hạn mức lượt thi, và việc đáp án không bao giờ đi ra ngoài.
 */
import { chromium } from 'playwright-core';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/** Một "trình duyệt" nhỏ: nhớ cookie, tự gắn CSRF */
function client() {
  const jar = new Map();
  const readSetCookie = r => {
    const all = typeof r.headers.getSetCookie === 'function' ? r.headers.getSetCookie() : [];
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
    async req(method, path, body, extra) {
      const headers = Object.assign({ Accept: 'application/json' }, extra || {});
      if (jar.size) headers.Cookie = [...jar].map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
      if (method !== 'GET') {
        const t = jar.get('prep_csrf') || jar.get('admin_csrf');
        if (t) headers['X-CSRF-Token'] = t;
      }
      let payload;
      if (body instanceof Uint8Array) { payload = body; }
      else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
      const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
      readSetCookie(r);
      const ct = r.headers.get('content-type') || '';
      let data = null;
      if (ct.includes('json')) data = await r.json().catch(() => null);
      else data = Buffer.from(await r.arrayBuffer());
      return { status: r.status, data, headers: r.headers };
    }
  };
}

/* Một MP3 hợp lệ tối thiểu: tag ID3 rồi một frame header. Đủ để qua vòng sniff
   của storage mà không phải kèm tệp nhị phân vào repo. */
function fakeMp3() {
  const buf = Buffer.alloc(2048);
  buf.write('ID3', 0, 'latin1');
  buf[3] = 3;
  buf[10] = 0xFF; buf[11] = 0xFB;
  return new Uint8Array(buf);
}
/* WebM: bốn byte EBML mở đầu — đúng thứ MediaRecorder của trình duyệt sinh ra */
function fakeWebm() {
  const buf = Buffer.alloc(1024);
  buf[0] = 0x1A; buf[1] = 0x45; buf[2] = 0xDF; buf[3] = 0xA3;
  return new Uint8Array(buf);
}

const admin = client();
const student = client();

try {
  /* ---------- Dựng một đề có thật để thi ---------- */
  head('Chuẩn bị đề kiểm thử');
  await admin.req('GET', '/api/me');
  let r = await admin.req('POST', '/api/admin/login', { username: 'admin', password: process.env.ADMIN_PASSWORD || 'Admin@123456' });
  ok(r.status === 200, 'Đăng nhập quản trị', 'status ' + r.status);

  /* Hai câu Nghe có audio + một câu Viết, đủ để thử đồng hồ, nghe lại và ghi âm */
  const made = [];
  for (let i = 0; i < 2; i++) {
    r = await admin.req('POST', '/api/admin/questions', {
      familyId: 'vpet', skill: 'listening', level: 'B1', type: 'mcq', part: 'F',
      prompt: 'Engine test listening item ' + i + ' — pick the natural reply.',
      options: ['Yes, of course.', 'It is blue.', 'At six.', 'By bus.'],
      answer: 'Yes, of course.'
    });
    ok(r.status === 201, 'Tạo câu nghe ' + (i + 1), 'status ' + r.status);
    made.push(r.data.id);
    const up = await admin.req('POST', '/api/admin/questions/' + r.data.id + '/audio', fakeMp3(),
      { 'Content-Type': 'audio/mpeg' });
    ok(up.status === 201 || up.status === 200, 'Gắn MP3 cho câu nghe ' + (i + 1), 'status ' + up.status);
  }
  r = await admin.req('POST', '/api/admin/questions', {
    familyId: 'vpet', skill: 'speaking', level: 'B1', type: 'speaking', part: 'I',
    prompt: 'Engine test speaking item — respond to the situation.'
  });
  ok(r.status === 201, 'Tạo câu nói', 'status ' + r.status);
  const speakQ = r.data.id;

  r = await admin.req('POST', '/api/admin/tests', {
    familyId: 'vpet', title: 'Đề kiểm thử engine', level: 'B1', durationMin: 10
  });
  const testId = r.data.id;
  ok(!!testId, 'Tạo đề kiểm thử', String(testId));

  /* Phần Nghe có đồng hồ 1 phút; phần Nói để 0 phút = không giới hạn giờ */
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Part F - Response Selection', skill: 'listening', type: 'Trắc nghiệm', minutes: 1, part: 'F'
  });
  const secListen = r.data.id;
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/sections', {
    name: 'Part I - Speaking Situations', skill: 'speaking', type: 'Ghi âm', minutes: 0, part: 'I'
  });
  const secSpeak = r.data.id;
  await admin.req('POST', '/api/admin/sections/' + secListen + '/items', { questionIds: made });
  await admin.req('POST', '/api/admin/sections/' + secSpeak + '/items', { questionIds: [speakQ] });
  r = await admin.req('POST', '/api/admin/tests/' + testId + '/status', { status: 'published' });
  ok(r.status === 200, 'Phát hành đề kiểm thử', JSON.stringify(r.data));

  /* ---------- Bắt đầu một lượt thi ---------- */
  head('Bắt đầu lượt thi');
  await student.req('GET', '/api/me');
  r = await student.req('POST', '/api/auth/login', { username: 'student', password: 'Goodmorning01' });
  ok(r.status === 200, 'Đăng nhập học viên', 'status ' + r.status);

  /* CSDL không dựng lại giữa các lần chạy: một lượt bỏ dở của lần trước sẽ chặn
     lần này. Dọn trước rồi mới thi, để bài test đo engine chứ không đo rác. */
  const leftover = await student.req('GET', '/api/attempts/current');
  if (leftover.data && leftover.data.attempt) {
    await student.req('POST', '/api/attempts/' + leftover.data.attempt.id + '/submit');
  }

  r = await student.req('POST', '/api/attempts', { testId });
  ok(r.status === 201 && r.data.attempt, 'Mở được lượt thi mới', JSON.stringify(r.data).slice(0, 120));
  const att = r.data.attempt;
  const attemptId = att.id;

  ok(att.parts.length === 2, 'Lượt thi có đủ hai phần', 'thấy ' + att.parts.length);
  const pF = att.parts.find(p => p.part === 'F');
  const pI = att.parts.find(p => p.part === 'I');
  ok(!!pF && !!pI, 'Hai phần mang đúng chữ cái của chúng');
  ok(pF.items.length === 2, 'Phần F có đủ 2 câu', String(pF.items.length));

  /* Đáp án không bao giờ được đi ra ngoài — đây là điều dễ để lọt nhất và cũng
     là điều hỏng nặng nhất nếu lọt. */
  const raw = JSON.stringify(att);
  ok(!/"answer":"Yes, of course\."/.test(raw), 'Đáp án đúng KHÔNG có trong dữ liệu gửi về trình duyệt');
  ok(!/explanation/.test(raw), 'Giải thích cũng không gửi kèm');
  ok(pF.items.every(i => Array.isArray(i.options) && i.options.length === 4),
    'Phương án vẫn gửi về (cần để hiện lên màn hình)');

  /* Mở bài khác khi còn bài dở phải bị chặn, nếu không bài đang làm biến mất */
  r = await student.req('POST', '/api/attempts', { testId: 'vpet-b1-01' });
  ok(r.status === 409, 'Không cho mở bài khác khi còn bài chưa nộp', 'status ' + r.status);

  r = await student.req('POST', '/api/attempts', { testId });
  ok(r.status === 200 && r.data.resumed === true, 'Mở lại đúng bài đang dở thì nối tiếp, không tạo lượt mới');

  /* ---------- Đồng hồ từng phần ---------- */
  head('Đồng hồ từng phần');
  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[0], answer: 'Yes, of course.' }] });
  ok(r.data.rejected.length === 1 && r.data.rejected[0].reason === 'part-closed',
    'Chưa vào phần thì chưa lưu được đáp án', JSON.stringify(r.data));

  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/start');
  ok(r.status === 200 && r.data.secondsLeft > 0 && r.data.secondsLeft <= 60,
    'Vào phần F thì đồng hồ chạy đúng số phút đã khai', JSON.stringify(r.data));
  const firstEnds = r.data.endsAt;

  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/start');
  ok(r.data.endsAt === firstEnds, 'Vào lại phần đang mở KHÔNG được cấp đồng hồ mới', r.data.endsAt);

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[0], answer: 'Yes, of course.' }] });
  ok(r.data.saved.length === 1 && !r.data.rejected.length, 'Phần đang mở thì lưu được đáp án',
    JSON.stringify(r.data));

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: speakQ, answer: 'thử ghi vào phần chưa mở' }] });
  ok(r.data.rejected.length === 1, 'Không ghi được vào phần chưa vào', JSON.stringify(r.data));

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: 999999, answer: 'câu không thuộc lượt này' }] });
  ok(r.data.rejected.length === 1 && r.data.rejected[0].reason === 'not-in-attempt',
    'Không ghi được cho câu không thuộc lượt thi', JSON.stringify(r.data));

  /* ---------- Nghe lại: đếm ở máy chủ ---------- */
  head('Số lần nghe lại');
  const listenOnce = () => student.req('GET', '/api/attempts/' + attemptId + '/items/' + made[0] + '/audio');
  r = await listenOnce();
  ok(r.status === 200 && r.data.length > 0, 'Nghe lần 1 lấy được tệp', 'status ' + r.status);
  ok(r.headers.get('x-replays-left') === '1', 'Còn 1 lần nghe sau lần đầu', r.headers.get('x-replays-left'));
  ok((r.headers.get('cache-control') || '').includes('no-store'),
    'Tệp đề thi không được cache', r.headers.get('cache-control'));

  r = await listenOnce();
  ok(r.status === 200 && r.headers.get('x-replays-left') === '0', 'Nghe lần 2 là lần cuối',
    r.headers.get('x-replays-left'));

  r = await listenOnce();
  ok(r.status === 429, 'Hết lượt nghe thì máy chủ từ chối, không phụ thuộc trình duyệt', 'status ' + r.status);

  r = await student.req('GET', '/api/attempts/' + attemptId);
  const itemAfter = r.data.attempt.parts.find(p => p.part === 'F').items.find(i => i.questionId === made[0]);
  ok(itemAfter.replaysLeft === 0, 'Trạng thái trả về đúng số lượt nghe còn lại', String(itemAfter.replaysLeft));

  /* Kết thúc phần sớm: cùng một hàm partOpen() gác cả trường hợp hết giờ, nên
     đây là đường đóng phần được kiểm trực tiếp mà không phải chờ hết một phút
     thật trong mọi lần chạy CI. */
  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/close');
  ok(r.status === 200 && r.data.closedAt, 'Kết thúc phần F sớm', JSON.stringify(r.data));
  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[1], answer: 'ghi sau khi phần đã đóng' }] });
  ok(r.data.rejected.length === 1 && r.data.rejected[0].reason === 'part-closed',
    'Phần đã đóng thì không ghi thêm đáp án được', JSON.stringify(r.data));
  r = await student.req('GET', '/api/attempts/' + attemptId + '/items/' + made[1] + '/audio');
  ok(r.status === 403, 'Phần đã đóng thì không nghe được nữa', 'status ' + r.status);
  r = await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secListen + '/start');
  ok(r.status === 400, 'Không mở lại được phần đã kết thúc', 'status ' + r.status);

  /* ---------- Ghi âm câu trả lời ---------- */
  head('Ghi âm câu trả lời');
  r = await student.req('POST', '/api/attempts/' + attemptId + '/items/' + speakQ + '/recording',
    fakeWebm(), { 'Content-Type': 'audio/webm' });
  ok(r.status === 403, 'Chưa vào phần Nói thì chưa ghi âm được', 'status ' + r.status);

  await student.req('POST', '/api/attempts/' + attemptId + '/parts/' + secSpeak + '/start');
  r = await student.req('POST', '/api/attempts/' + attemptId + '/items/' + speakQ + '/recording',
    fakeWebm(), { 'Content-Type': 'audio/webm' });
  ok(r.status === 201, 'Ghi âm WebM của trình duyệt lưu được', JSON.stringify(r.data));

  r = await student.req('POST', '/api/attempts/' + attemptId + '/items/' + speakQ + '/recording',
    new Uint8Array(Buffer.from('MZ\x90\x00 not audio at all')), { 'Content-Type': 'audio/webm' });
  ok(r.status === 400, 'Tệp giả danh audio bị từ chối theo nội dung, không theo lời khai', 'status ' + r.status);

  r = await student.req('GET', '/api/attempts/' + attemptId);
  const spoken = r.data.attempt.parts.find(p => p.part === 'I').items[0];
  ok(spoken.hasRecording === true, 'Trạng thái ghi nhận đã có bản ghi âm');

  /* ---------- Nộp bài ---------- */
  head('Nộp bài');
  r = await student.req('POST', '/api/attempts/' + attemptId + '/submit');
  ok(r.status === 200 && r.data.ok, 'Nộp bài thành công', JSON.stringify(r.data));
  ok(r.data.total === 3, 'Đếm đúng tổng số câu của đề', String(r.data.total));
  ok(r.data.answered === 2, 'Đếm đúng số câu đã trả lời', String(r.data.answered));

  r = await student.req('PATCH', '/api/attempts/' + attemptId + '/answers',
    { answers: [{ questionId: made[1], answer: 'sửa sau khi đã nộp' }] });
  ok(r.status === 400, 'Nộp rồi thì không sửa đáp án được nữa', 'status ' + r.status);

  r = await student.req('POST', '/api/attempts/' + attemptId + '/submit');
  ok(r.status === 200 && r.data.alreadySubmitted, 'Nộp hai lần không tạo ra lượt hỏng', JSON.stringify(r.data));

  r = await student.req('GET', '/api/attempts/current');
  ok(r.data.attempt === null, 'Nộp xong thì không còn bài đang làm dở');

  /* ---------- Lượt thi của người khác ---------- */
  head('Phân quyền lượt thi');
  const other = client();
  await other.req('GET', '/api/me');
  const email = 'engine.' + Date.now() + '@thu-nghiem.vn';
  await other.req('POST', '/api/auth/register',
    { name: 'Người Thử Engine', email, password: 'Matkhau12345', interests: [] });
  r = await other.req('GET', '/api/attempts/' + attemptId);
  ok(r.status === 404, 'Không xem được lượt thi của người khác (404, không phải 403)', 'status ' + r.status);

  r = await other.req('POST', '/api/attempts', { testId });
  ok(r.status === 403 && r.data.need === 'plan',
    'Chưa có gói thì không mở được lượt thi', JSON.stringify(r.data));

  /* ---------- Chấm điểm ---------- */
  head('Chấm điểm');
  r = await student.req('GET', '/api/attempts/' + attemptId + '/result');
  ok(r.status === 200, 'Nộp xong là có kết quả ngay', 'status ' + r.status);
  const result = r.data;

  /* Tài khoản demo cầm gói Plus nên được xem bảng chi tiết. */
  ok(result.detailed === true, 'Gói Plus xem được báo cáo chi tiết', JSON.stringify(result.detailed));
  ok(/tham chiếu/.test(result.disclaimer || ''),
    'Kết quả ghi rõ đây là điểm luyện tập, không phải điểm thi thật', result.disclaimer);

  const listen = (result.skills || []).find(x => x.skill === 'listening');
  /* Đề kiểm thử: 2 câu Nghe trắc nghiệm, đã trả lời đúng 1 câu ở phần trên. */
  ok(listen && listen.rawMax === 2, 'Đếm đúng tổng số câu Nghe', JSON.stringify(listen));
  ok(listen && listen.rawEarned === 1, 'Chấm đúng 1/2 câu Nghe', JSON.stringify(listen));
  ok(listen && listen.score === 5, 'Quy đổi tuyến tính 1/2 → 5,0 trên thang 10', String(listen && listen.score));

  const speak = (result.skills || []).find(x => x.skill === 'speaking');
  ok(speak && speak.pending === true, 'Kỹ năng Nói để trạng thái chờ chấm, không phải 0 điểm',
    JSON.stringify(speak));
  ok(result.pending === true && result.overall === null,
    'Chưa chấm đủ bốn kỹ năng thì chưa có điểm tổng', JSON.stringify({ pending: result.pending, overall: result.overall }));

  /* Câu bỏ trống vẫn phải vào mẫu số: bỏ trống nhiều mà điểm cao là lỗi nặng. */
  const fPart = (result.parts || []).find(x => x.part === 'F');
  ok(fPart && fPart.max === 2, 'Câu bỏ trống vẫn tính vào mẫu số', JSON.stringify(fPart && { earned: fPart.earned, max: fPart.max }));

  /* Đáp án đúng vẫn không được lộ, kể cả ở màn kết quả — đề còn dùng lại. */
  ok(!/"answer"/.test(JSON.stringify(result)), 'Báo cáo không kèm đáp án đúng');
  ok((fPart.items || []).every(i => typeof i.given === 'string'),
    'Báo cáo có câu trả lời của chính học viên để đối chiếu');

  /* Chấm lại không được nhân đôi điểm hay tạo dòng mới. */
  r = await student.req('GET', '/api/attempts/' + attemptId + '/result');
  const again = (r.data.skills || []).find(x => x.skill === 'listening');
  ok(again && again.rawEarned === 1 && again.rawMax === 2,
    'Đọc lại kết quả cho cùng một con số', JSON.stringify(again));

  r = await student.req('GET', '/api/attempts/999999/result');
  ok(r.status === 404, 'Không xem được kết quả của lượt không tồn tại', 'status ' + r.status);

  /* ---------- Hạn mức lượt thi của gói Starter ---------- */
  head('Hạn mức lượt thi');
  /* Gói Plus của tài khoản demo là không giới hạn, nên phải dựng riêng một tài
     khoản cầm gói Starter mới thử được cái hạn mức 10 lượt. */
  const capped = client();
  await capped.req('GET', '/api/me');
  const cappedEmail = 'han-muc.' + Date.now() + '@thu-nghiem.vn';
  await capped.req('POST', '/api/auth/register',
    { name: 'Người Thử Hạn Mức', email: cappedEmail, password: 'Matkhau12345', interests: [] });
  r = await admin.req('GET', '/api/admin/users?q=' + encodeURIComponent(cappedEmail));
  const cappedId = r.data.items[0] && r.data.items[0].id;
  ok(!!cappedId, 'Tìm được tài khoản vừa đăng ký', String(cappedId));

  r = await admin.req('POST', '/api/admin/codes', {
    planId: 'starter-3m', unlockType: 'family', unlockRef: 'vpet', qty: 1, userId: cappedId
  });
  ok(r.status === 201, 'Cấp mã Starter thẳng cho tài khoản đó', 'status ' + r.status);

  r = await capped.req('GET', '/api/me');
  ok(r.data.entitlement && r.data.entitlement.attemptsLeft === 10,
    'Gói Starter bắt đầu với đủ 10 lượt', JSON.stringify(r.data.entitlement));

  let used = 0;
  for (let i = 0; i < 10; i++) {
    const s1 = await capped.req('POST', '/api/attempts', { testId });
    if (s1.status !== 201) break;
    used++;
    await capped.req('POST', '/api/attempts/' + s1.data.attempt.id + '/submit');
  }
  ok(used === 10, 'Làm được đúng 10 lượt', 'thấy ' + used);

  r = await capped.req('GET', '/api/me');
  ok(r.data.entitlement.attemptsUsed === 10 && r.data.entitlement.attemptsLeft === 0,
    'Đếm lượt đã dùng khớp số lần thực sự mở bài', JSON.stringify(r.data.entitlement));

  r = await capped.req('POST', '/api/attempts', { testId });
  ok(r.status === 403 && r.data.need === 'attempts',
    'Hết lượt thì máy chủ từ chối mở bài thứ 11', JSON.stringify(r.data));

  /* Gói Starter mua "report bình thường thang điểm": có điểm và bậc, không có
     bảng bóc tách. Ranh giới đó phải nằm ở máy chủ, không phải ở giao diện. */
  r = await capped.req('GET', '/api/attempts');
  const cappedAttempt = r.data.items[0];
  r = await capped.req('GET', '/api/attempts/' + cappedAttempt.id + '/result');
  ok(r.status === 200 && r.data.detailed === false,
    'Gói Starter chỉ nhận báo cáo rút gọn', JSON.stringify(r.data.detailed));
  ok(r.data.skills === undefined && r.data.parts === undefined,
    'Dữ liệu bóc tách không rời khỏi máy chủ với gói Starter',
    JSON.stringify(Object.keys(r.data)));
  ok(typeof r.data.upgradeHint === 'string', 'Nói rõ vì sao báo cáo ngắn', r.data.upgradeHint);

  /* Gói không giới hạn thì không có gì để trừ — mở lại bài không được làm hao
     hụt cái gì cả. */
  const beforeUnlimited = (await student.req('GET', '/api/me')).data.entitlement.attemptsUsed;
  r = await student.req('POST', '/api/attempts', { testId });
  const unlimitedAttempt = r.data.attempt && r.data.attempt.id;
  const afterUnlimited = (await student.req('GET', '/api/me')).data.entitlement.attemptsUsed;
  ok(afterUnlimited === beforeUnlimited,
    'Gói không giới hạn: mở bài không trừ lượt nào', beforeUnlimited + ' → ' + afterUnlimited);
  if (unlimitedAttempt) await student.req('POST', '/api/attempts/' + unlimitedAttempt + '/submit');

  /* ---------- Màn làm bài lái được engine ---------- */
  head('Màn làm bài');
  /* Backend đã kiểm kỹ ở trên; phần này chỉ hỏi một câu: cái màn hình có thật
     sự lái được engine đó không, hay chỉ vẽ ra trông giống. */
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox']
  });
  try {
    const ctx = await browser.newContext();
    const uiErrors = [];
    ctx.on('weberror', e => uiErrors.push(String(e.error())));
    const page = await ctx.newPage();
    await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
    await page.fill('#email', 'student');
    await page.fill('#password', 'Goodmorning01');
    await page.click('#submit');
    await page.waitForTimeout(1200);

    await page.goto(BASE + '/prep/lam-bai/?test=' + encodeURIComponent(testId), { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    ok(await page.locator('#runner').isVisible(), 'Mở màn làm bài từ nút Bắt đầu');
    ok((await page.locator('#ex-parts button').count()) === 2,
      'Hiện đủ hai phần', String(await page.locator('#ex-parts button').count()));

    /* Chưa vào phần thì chưa có câu nào — đúng như máy chủ quy định */
    ok((await page.locator('[data-item]').count()) === 0, 'Chưa vào phần thì chưa hiện câu hỏi');
    await page.click('#ex-enter');
    await page.waitForTimeout(900);
    ok((await page.locator('[data-item]').count()) === 2, 'Vào phần F thì hiện đủ 2 câu',
      String(await page.locator('[data-item]').count()));
    const clock = (await page.locator('#ex-clock-text').textContent()).trim();
    ok(/^\d+:\d\d$/.test(clock), 'Đồng hồ chạy trên màn hình', clock);

    /* Trả lời một câu rồi đợi autosave — không có nút Lưu, nên nếu chỗ này im
       lặng thì người làm bài không biết bài mình có được giữ hay không. */
    await page.locator('[data-answer]').first().check();
    await page.waitForTimeout(1900);
    ok((await page.locator('#ex-saved').textContent()).trim() === 'Đã lưu',
      'Tự lưu và báo đã lưu', (await page.locator('#ex-saved').textContent()).trim());

    /* Nghe: bấm một lần thì số lượt còn lại phải giảm theo máy chủ */
    const playBtn = page.locator('[data-play]').first();
    const before = (await page.locator('[data-plays]').first().textContent()).trim();
    await playBtn.click();
    await page.waitForTimeout(1200);
    const after = (await page.locator('[data-plays]').first().textContent()).trim();
    ok(before !== after, 'Bấm Nghe thì số lượt còn lại đổi theo máy chủ', before + ' → ' + after);

    /* Tải lại trang: bài đang làm phải quay lại nguyên trạng, không mất */
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    ok(await page.locator('#runner').isVisible(), 'Tải lại trang thì vào tiếp bài đang làm');
    ok(await page.locator('[data-answer]').first().isChecked(), 'Đáp án đã lưu vẫn còn sau khi tải lại');

    /* Nộp bài qua giao diện */
    await page.click('#ex-submit');
    await page.waitForTimeout(400);
    ok(await page.locator('#submit-modal.show').count() === 1, 'Hỏi lại trước khi nộp');
    await page.click('#sm-go');
    await page.waitForTimeout(1200);
    ok(await page.locator('#done').isVisible(), 'Nộp xong hiện màn đã nộp');

    ok(uiErrors.length === 0, 'Không có lỗi JavaScript trên màn làm bài', uiErrors.join(' | '));
    await ctx.close();
  } finally {
    await browser.close();
  }

  /* ---------- Dọn dẹp ---------- */
  await admin.req('DELETE', '/api/admin/tests/' + testId);
  for (const id of made.concat([speakQ])) {
    await admin.req('POST', '/api/admin/questions/' + id + '/status', { status: 'retired' });
  }
} catch (e) {
  fail++;
  console.log('✗ Lỗi không mong đợi: ' + (e && e.stack ? e.stack : e));
}

console.log('\n' + (pass + fail ? pass + '/' + (pass + fail) + ' kiểm thử đạt' : 'không có kiểm thử nào'));
if (fail) process.exit(1);
