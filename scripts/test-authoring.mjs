/**
 * Kiểm thử khối soạn đề: ký hiệu ngắt nghỉ, lưu khoá API, và các route dựng audio.
 *
 * Phần ký hiệu chạy thuần trong tiến trình (không cần mạng, không tốn ký tự của
 * ElevenLabs). Phần route cần server đang bật ở PORT.
 *
 * Chạy: node scripts/test-authoring.mjs
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const ADMIN = { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'Goodmorning01' };

let pass = 0, fail = 0;
const ok = (c, name, extra) => {
  if (c) { pass++; console.log('✓ ' + name); }
  else { fail++; console.log('✗ ' + name + (extra ? '  → ' + extra : '')); }
};

/* ================= 1. Ký hiệu ngắt nghỉ (thuần, không cần server) ================= */

const { parseScript, splitTurns } = require('../server/script-markup.js');

console.log('\n\x1b[1m== Ký hiệu ngắt nghỉ trong kịch bản ==\x1b[0m');

{
  const r = parseScript('Hello, how are you?');
  ok(/<break time="0\.3s" \/>/.test(r.text), 'Dấu phẩy sinh ngắt ngắn 0,3 giây');
  ok(/<break time="0\.6s" \/>/.test(r.text), 'Dấu chấm hỏi sinh ngắt dài 0,6 giây');
  ok(r.plain === 'Hello, how are you?', 'Bản chữ sạch giữ nguyên dấu câu, không có thẻ');
  ok(r.stats.breaks === 2, 'Đếm đúng 2 chỗ ngắt');
}

{
  const r = parseScript('First sentence. _ Second sentence.');
  ok(/<break time="1\.5s" \/>/.test(r.text), 'Gạch dưới sinh khoảng cách 1,5 giây');
  ok(!r.plain.includes('_'), 'Gạch dưới bị gỡ khỏi bản chữ sạch');
  ok(r.plain === 'First sentence. Second sentence.', 'Hai câu vẫn cách nhau đúng một dấu cách');
  /* Dấu chấm đứng ngay trước "_" không được sinh thêm một ngắt nhỏ rồi mới tới
     khoảng cách lớn — khoảng lớn thắng. */
  ok(r.stats.breaks === 2, 'Chấm rồi gạch dưới chỉ tính một khoảng nghỉ, không cộng dồn');
}

{
  const r = parseScript('a __ b');
  ok(r.stats.breaks === 1, 'Chuỗi nhiều gạch dưới vẫn chỉ là một khoảng nghỉ');
}

{
  const r = parseScript('Wait _2s then go. Wait _800ms then stop.');
  ok(/<break time="2\.0s" \/>/.test(r.text), 'Chỉ định _2s cho đúng 2 giây');
  ok(/<break time="0\.8s" \/>/.test(r.text), 'Chỉ định _800ms cho đúng 0,8 giây');
}

{
  const r = parseScript('Wait _9s now.');
  ok(/<break time="3\.0s" \/>/.test(r.text), 'Khoảng nghỉ quá dài bị chặn ở 3 giây (giới hạn nhà cung cấp)');
}

{
  /* Ba cái bẫy của dấu chấm: số thập phân, viết tắt, và chữ cái đầu tên. */
  const dec = parseScript('It costs 3.5 dollars');
  ok(dec.stats.breaks === 0, 'Số thập phân 3.5 không bị cắt làm hai câu');

  const abbr = parseScript('Mr. Nguyen arrived');
  ok(abbr.stats.breaks === 0, 'Viết tắt "Mr." không sinh ngắt dài');

  const initial = parseScript('J. K. Rowling wrote it');
  ok(initial.stats.breaks === 0, 'Chữ cái đầu tên không sinh ngắt dài');
}

{
  /* Dấu nháy đơn nằm trong từ rút gọn — nếu coi nó là ký hiệu ngắt thì mọi
     "don't" trong ngân hàng đề đều vỡ làm đôi. */
  const r = parseScript("I don't think it's ready");
  ok(r.stats.breaks === 0, 'Nháy đơn trong từ rút gọn không sinh ngắt nào');
  ok(r.plain === "I don't think it's ready", 'Từ rút gọn giữ nguyên');
}

{
  const r = parseScript('She said "yes" then left.');
  ok(r.stats.breaks >= 1, 'Nháy kép sinh ngắt ngắn');
}

{
  const r = parseScript('One. Two. Three.');
  ok(r.stats.billedChars > r.stats.chars, 'Ký tự bị tính tiền lớn hơn ký tự chữ (đã cộng thẻ break)');
  ok(r.stats.estimatedMs > 0, 'Có ước lượng thời lượng');
}

{
  /* Quá nhiều thẻ break làm model trôi giọng; khi vượt ngưỡng thì giữ dấu câu
     và bỏ thẻ, và phải nói rõ là đã bỏ chứ không lặng lẽ đổi ý tác giả. */
  const many = Array.from({ length: 80 }, (_, i) => `Sentence ${i}.`).join(' ');
  const r = parseScript(many);
  ok(r.stats.capped === true, 'Vượt ngưỡng số thẻ break thì bật cờ capped');
  ok(!r.text.includes('<break'), 'Khi capped thì không gửi thẻ break nào');
  ok(r.text.includes('Sentence 0.'), 'Khi capped vẫn giữ nguyên dấu câu trong chữ');
}

{
  const turns = splitTurns('[S1] Is this seat taken?\n[S2] No, go ahead.');
  ok(turns.length === 2, 'Tách đúng 2 lượt thoại');
  ok(turns[0].speaker === 'S1' && turns[1].speaker === 'S2', 'Đọc đúng nhãn người nói');
  ok(!turns[0].script.includes('[S1]'), 'Nhãn người nói bị gỡ khỏi lời thoại');

  const one = splitTurns('Just one voice.');
  ok(one.length === 1 && one[0].speaker === null, 'Kịch bản không có nhãn trả về một lượt không tên');
}

/* ================= 2. Khoá API: mã hoá, che, thứ tự ưu tiên ================= */

console.log('\n\x1b[1m== Lưu khoá API nhà cung cấp ==\x1b[0m');

const secrets = require('../server/secrets.js');

{
  const KEY = 'sk-test-0123456789abcdefghij';
  secrets.set('openai', KEY);
  ok(secrets.get('openai') === KEY, 'Lưu rồi đọc lại ra đúng khoá');

  const { q } = require('../server/db.js');
  const row = q.get("SELECT value FROM settings WHERE key='secret.openai.api_key'");
  ok(row && !row.value.includes(KEY), 'Khoá KHÔNG nằm dạng chữ thường trong CSDL');
  ok(row && row.value.startsWith('v1.'), 'Bản mã có tiền tố phiên bản để sau này đổi thuật toán');

  const st = secrets.status().find(p => p.name === 'openai');
  ok(st.configured === true, 'Trạng thái báo đã cấu hình');
  ok(!st.masked.includes('0123456789'), 'Chuỗi che không lộ phần đầu khoá');
  ok(st.masked.endsWith('ghij'), 'Chuỗi che giữ 4 ký tự cuối để phân biệt hai khoá');

  ok(secrets.set('openai', 'short').ok === false, 'Từ chối khoá quá ngắn');
  ok(secrets.set('openai', 'has space in it 0123456789').ok === false, 'Từ chối khoá có khoảng trắng (dán hỏng)');

  /* Biến môi trường phải thắng giá trị trong CSDL: production lấy khoá từ
     Secret Manager mà không cần ai vào dashboard sửa. */
  process.env.OPENAI_API_KEY = 'sk-from-environment-9876543210';
  ok(secrets.get('openai') === 'sk-from-environment-9876543210', 'Biến môi trường thắng giá trị trong CSDL');
  ok(secrets.status().find(p => p.name === 'openai').source === 'env', 'Trạng thái nói rõ khoá đến từ môi trường');
  delete process.env.OPENAI_API_KEY;

  secrets.clear('openai');
  ok(secrets.get('openai') === '', 'Xoá khoá thì đọc ra rỗng');
}

/* ================= 3. Route (cần server đang chạy) ================= */

console.log('\n\x1b[1m== Route soạn đề ==\x1b[0m');

let cookie = '', csrf = '';
try {
  const res = await fetch(BASE + '/api/admin/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ADMIN)
  });
  await res.json();
  const jar = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map(c => c.split(';')[0]);
  cookie = jar.join('; ');
  /* Token CSRF nằm ở cookie prep_csrf (đọc được từ JS), không nằm trong thân
     phản hồi — client gửi lại nó ở header, đúng mẫu double-submit. */
  csrf = (jar.find(c => c.startsWith('prep_csrf=')) || '').split('=')[1] || '';
  if (!cookie || !csrf) console.log('  (bỏ qua phần route: đăng nhập quản trị không thành công)');
} catch (e) {
  console.log('  (bỏ qua phần route: không kết nối được server — ' + e.message + ')');
}

if (cookie && csrf) {
  const call = (path, opts = {}) => fetch(BASE + '/api' + path, Object.assign({
    headers: Object.assign({ cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' }, opts.headers || {})
  }, opts));

  {
    const r = await call('/admin/integrations');
    const b = await r.json();
    ok(r.status === 200, 'GET /admin/integrations trả 200');
    ok(Array.isArray(b.providers) && b.providers.length === 2, 'Có đúng 2 nhà cung cấp: ElevenLabs và OpenAI');
    ok(b.providers.every(p => !('key' in p)), 'Phản hồi KHÔNG chứa trường khoá thật');
  }

  {
    const r = await call('/admin/script/preview', {
      method: 'POST', body: JSON.stringify({ script: 'Hello, world. _ Goodbye.' })
    });
    const b = await r.json();
    ok(r.status === 200, 'POST /admin/script/preview trả 200');
    ok(b.stats && b.stats.breaks === 3, 'Xem trước đếm đúng số khoảng nghỉ');
    ok(Array.isArray(b.segments) && b.segments.some(s => s.kind === 'pause'), 'Trả về từng đoạn để dựng giao diện');
  }

  {
    const r = await call('/admin/authoring/parts');
    const b = await r.json();
    ok(r.status === 200 && b.parts.length === 10, 'Trả đủ 10 part A–J của VPET');
    const g = b.parts.find(p => p.part === 'G');
    ok(g && g.needsAudio === true && g.skill === 'listening', 'Part G khai đúng: cần audio, kỹ năng nghe');
  }

  {
    /* Không có khoá thì phải báo lỗi rõ ràng chứ không đổ 500. */
    const had = secrets.get('elevenlabs');
    if (!had) {
      const r = await call('/admin/tts/voices');
      const b = await r.json();
      ok(r.status === 400 && /key/i.test(b.error), 'Chưa có khoá ElevenLabs thì báo 400 kèm lý do, không phải 500');
    } else {
      ok(true, '(bỏ qua: máy này đã cấu hình khoá ElevenLabs)');
    }
  }

  {
    /* Sửa kịch bản của một câu đã duyệt phải huỷ trạng thái duyệt: tệp trên
       kho không còn khớp với chữ mà câu hỏi khai là nó đọc. */
    const { q } = require('../server/db.js');
    const row = q.get("SELECT id FROM questions WHERE skill='listening' LIMIT 1");
    if (row) {
      q.run("UPDATE questions SET audio_key='fake-key', audio_status='approved' WHERE id=?", row.id);
      const r = await call('/admin/questions/' + row.id + '/script', {
        method: 'PUT', body: JSON.stringify({ script: 'New script.', voiceId: 'v1' })
      });
      const b = await r.json();
      ok(r.status === 200 && b.invalidated === true, 'Sửa kịch bản huỷ trạng thái đã duyệt');
      const after = q.get('SELECT audio_status FROM questions WHERE id=?', row.id);
      ok(after.audio_status === 'none', 'Câu hỏi quay về trạng thái chưa có audio hợp lệ');
      q.run("UPDATE questions SET audio_key=NULL, audio_status='none', audio_script=NULL WHERE id=?", row.id);
    } else {
      ok(true, '(bỏ qua: ngân hàng chưa có câu Nghe nào)');
    }
  }

  {
    const r = await call('/admin/integrations/nonsense', {
      method: 'PUT', body: JSON.stringify({ key: 'x'.repeat(40) })
    });
    ok(r.status === 400, 'Nhà cung cấp lạ bị từ chối');
  }
}

/* ================= Kết quả ================= */
console.log(`\n${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
