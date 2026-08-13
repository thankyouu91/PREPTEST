/**
 * Kiểm thử khối soạn đề và các điều kiện để chạy được trên Cloud Run:
 * ký hiệu ngắt nghỉ, lưu khoá API, route dựng audio, health check, cờ Secure
 * trên cookie, và driver lưu trữ GCS.
 *
 * Phần ký hiệu và phần khoá chạy thuần trong tiến trình — không cần mạng,
 * không tốn ký tự nào của ElevenLabs. Phần route cần server đang bật ở PORT.
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

/* Mọi kịch bản mở đầu bằng 1 giây im lặng (chủ dự án, 2026-08-12), nên số
   chỗ ngắt dưới đây đều đã cộng thêm một. `noLead` dùng cho những phép kiểm
   chỉ quan tâm tới dấu câu. */
const noLead = (t, o) => parseScript(t, Object.assign({ leadIn: 0 }, o || {}));

{
  const r = parseScript('Hello, how are you?');
  ok(r.text.startsWith('<break time="1.0s" />'), 'Kịch bản mở đầu bằng 1 giây im lặng');
  ok(r.segments[0].leadIn === true, 'Khoảng lặng mở đầu được đánh dấu riêng trong segments');
  ok(/<break time="0\.3s" \/>/.test(r.text), 'Dấu phẩy sinh ngắt ngắn 0,3 giây');
  ok(/<break time="0\.8s" \/>/.test(r.text), 'Dấu chấm hỏi sinh ngắt dài 0,8 giây');
  ok(r.plain === 'Hello, how are you?', 'Bản chữ sạch giữ nguyên dấu câu, không có thẻ');
  ok(r.stats.breaks === 3, 'Đếm đúng 3 chỗ ngắt (1 mở đầu + 2 dấu câu)');

  /* Thời lượng ước tính phải cộng cả giây mở đầu — tác giả nhìn "18 giây"
     là đang nhìn độ dài tệp họ sẽ thật sự nhận được. */
  ok(r.stats.estimatedMs - noLead('Hello, how are you?').stats.estimatedMs === 1000,
    'Ước tính thời lượng có cộng giây mở đầu');

  /* Kịch bản rỗng không được sinh request: một thẻ ngắt đứng một mình vẫn bị
     tính tiền và trả về đúng một giây im lặng. */
  ok(parseScript('   ').stats.breaks === 0, 'Kịch bản rỗng không sinh khoảng lặng mở đầu');
  ok(parseScript('   ').stats.billedChars === 0, 'Kịch bản rỗng không tốn ký tự nào');
}

{
  const r = parseScript('First sentence. _ Second sentence.');
  ok(/<break time="1\.5s" \/>/.test(r.text), 'Gạch dưới sinh khoảng cách 1,5 giây');
  ok(!r.plain.includes('_'), 'Gạch dưới bị gỡ khỏi bản chữ sạch');
  ok(r.plain === 'First sentence. Second sentence.', 'Hai câu vẫn cách nhau đúng một dấu cách');
  /* Dấu chấm đứng ngay trước "_" không được sinh thêm một ngắt nhỏ rồi mới tới
     khoảng cách lớn — khoảng lớn thắng. */
  ok(r.stats.breaks === 3, 'Chấm rồi gạch dưới chỉ tính một khoảng nghỉ, không cộng dồn');
}

{
  const r = noLead('a __ b');
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
  const dec = noLead('It costs 3.5 dollars');
  ok(dec.stats.breaks === 0, 'Số thập phân 3.5 không bị cắt làm hai câu');

  const abbr = noLead('Mr. Nguyen arrived');
  ok(abbr.stats.breaks === 0, 'Viết tắt "Mr." không sinh ngắt dài');

  const initial = noLead('J. K. Rowling wrote it');
  ok(initial.stats.breaks === 0, 'Chữ cái đầu tên không sinh ngắt dài');
}

{
  /* Dấu nháy đơn nằm trong từ rút gọn — nếu coi nó là ký hiệu ngắt thì mọi
     "don't" trong ngân hàng đề đều vỡ làm đôi. */
  const r = noLead("I don't think it's ready");
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

{
  /* Tốc độ đọc (chủ dự án: "nhanh tầm 1.25"). ElevenLabs chỉ nhận 0,7–1,2 và
     từ chối ngoài dải đó, nên 1.25 bị kẹp xuống 1.2 — chặn ở đây thì render
     vẫn chạy, không chặn thì cả lần dựng hỏng vì một con số. */
  const eleven = require('../server/providers/elevenlabs.js');
  ok(eleven.DEFAULT_SPEED === 1.2, 'Tốc độ mặc định là 1,2 — nhanh nhất API cho phép');
  ok(eleven.clampSpeed(1.25) === 1.2, '1.25 bị kẹp xuống 1.2 thay vì làm hỏng lần dựng');
  ok(eleven.clampSpeed(3) === 1.2, 'Tốc độ quá cao bị kẹp về trần');
  ok(eleven.clampSpeed(0.1) === 0.7, 'Tốc độ quá thấp bị kẹp về sàn');
  ok(eleven.clampSpeed(undefined) === 1.2, 'Không truyền gì thì dùng mặc định');
  ok(eleven.clampSpeed('nhanh') === 1.2, 'Giá trị không phải số thì dùng mặc định');
  ok(eleven.clampSpeed(1.0) === 1.0, 'Tốc độ hợp lệ được giữ nguyên');

  /* Lời nói co lại theo tốc độ, khoảng lặng thì không: thẻ break xin bao nhiêu
     giây thì được bấy nhiêu, bất kể giọng đang đọc nhanh hay chậm. */
  const t = 'The library will be closed on Monday, and will reopen on Tuesday.';
  const cham = parseScript(t, { speed: 1.0 });
  const nhanh = parseScript(t, { speed: 1.2 });
  ok(nhanh.stats.estimatedMs < cham.stats.estimatedMs, 'Đọc nhanh hơn thì ước tính ngắn hơn');
  ok(nhanh.stats.billedChars === cham.stats.billedChars, 'Đổi tốc độ không đổi số ký tự bị tính tiền');

  const pauseMs = cham.segments.filter(x => x.kind === 'pause').reduce((n, x) => n + x.ms, 0);
  const speechCham = cham.stats.estimatedMs - pauseMs;
  const speechNhanh = nhanh.stats.estimatedMs - pauseMs;
  ok(Math.abs(speechCham / speechNhanh - 1.2) < 0.02,
    'Chỉ phần lời nói bị chia cho tốc độ, khoảng lặng giữ nguyên');
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
    /* 1 mở đầu + phẩy + chấm + gạch dưới. Dấu chấm đứng ngay trước "_" gộp
       vào khoảng lớn, nên là 4 chứ không phải 5. */
    ok(b.stats && b.stats.breaks === 4, 'Xem trước đếm đúng số khoảng nghỉ',
      b.stats && String(b.stats.breaks));
    ok(b.speed === 1.2, 'Xem trước dùng đúng tốc độ sẽ dựng thật');
    ok(b.speedRange && b.speedRange.max === 1.2, 'Xem trước nói rõ trần tốc độ của nhà cung cấp');
    ok(b.defaults && b.defaults.leadIn === 1000, 'Xem trước trả về cả khoảng lặng mở đầu');
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

/* ================= 4. Nội dung kịch bản VPET =================
   Kịch bản là nội dung, mà nội dung thì sửa tay. Bộ này chốt các bất biến để
   một lần sửa không âm thầm làm hỏng cả đề: đủ số câu theo blueprint, đáp án
   nằm trong phương án, và ký hiệu ngắt nghỉ vẫn phân tích được. */

console.log('\n\x1b[1m== Kịch bản audio VPET ==\x1b[0m');

{
  const { allItems } = require('../server/data/vpet-scripts.js');
  const items = allItems();

  /* Các part thật sự phát audio: E8 F8 G6 H10 J3 = 35 câu mỗi level.
     Part I nằm ngoài danh sách này dù cũng là phần nói — blueprint đánh
     `needsAudio: false` cho nó, thí sinh đọc tình huống trên màn hình rồi nói.
     Viết kịch bản cho part I là hiện nút Dựng MP3 ở chỗ không phát gì và trả
     tiền ElevenLabs cho một tệp không ai nghe; bể part I do
     server/data/vpet-items.js giữ, dạng đề bài chữ. */
  const MONG_DOI = { E: 8, F: 8, G: 6, H: 10, J: 3 };
  const dem = {};
  items.forEach(i => { dem[i.part + i.level] = (dem[i.part + i.level] || 0) + 1; });

  let duSo = true;
  for (const [part, n] of Object.entries(MONG_DOI)) {
    for (const level of [1, 2]) if (dem[part + level] !== n) duSo = false;
  }
  ok(duSo, 'Đủ số câu theo blueprint cho cả hai level (E8 F8 G6 H10 J3)');
  ok(items.length === 70, 'Tổng 70 kịch bản — 35 câu × 2 level', 'thấy ' + items.length);
  ok(items.every(i => i.part !== 'I'), 'Không kịch bản nào thuộc part I — part đó không phát audio');

  ok(items.every(i => i.script && i.script.trim()), 'Không kịch bản nào rỗng');
  ok(new Set(items.map(i => i.ref)).size === items.length, 'Mã tham chiếu không trùng nhau');

  const mcq = items.filter(i => i.type === 'mcq');
  ok(mcq.every(i => i.options.length >= 2), 'Mọi câu trắc nghiệm có ít nhất 2 phương án');
  ok(mcq.every(i => i.options.includes(i.answer)), 'Đáp án luôn nằm trong các phương án của chính nó');
  ok(mcq.every(i => new Set(i.options).size === i.options.length), 'Không có phương án trùng nhau trong cùng một câu');

  const gap = items.filter(i => i.type === 'gap');
  ok(gap.every(i => i.answer && i.answer.trim()), 'Mọi câu điền từ đều có đáp án');

  /* Part H chấm bằng so khớp từ với chính câu đã đọc, nên đáp án phải bám
     kịch bản chứ không được chép tay thành một bản lệch. */
  const h = items.filter(i => i.part === 'H');
  ok(h.every(i => i.answer === i.script), 'Đáp án part H lấy thẳng từ kịch bản, không chép tay');

  /* Part J chấm coverage theo key points; thiếu key points là không chấm được
     nội dung, chỉ còn chấm được ngôn ngữ. */
  const j = items.filter(i => i.part === 'J');
  ok(j.every(i => i.keyPoints.length >= 4), 'Mỗi bài kể chuyện có ít nhất 4 ý chính để chấm coverage');

  /* Ký hiệu ngắt nghỉ phải phân tích được và không vượt ngưỡng thẻ break —
     vượt ngưỡng thì hệ thống bỏ thẻ, tức là kịch bản mất nhịp tác giả muốn. */
  const capped = items.filter(i => parseScript(i.script).stats.capped);
  ok(capped.length === 0, 'Không kịch bản nào vượt ngưỡng số thẻ ngắt',
    capped.map(i => i.ref).join(', '));

  const tongKyTu = items.reduce((n, i) => n + parseScript(i.script).stats.billedChars, 0);
  ok(tongKyTu > 15000 && tongKyTu < 30000,
    'Tổng ký tự tính tiền nằm trong khoảng đã dự toán (' + tongKyTu.toLocaleString('en-US') + ')');

  /* Level 1 đo tới B1, level 2 từ B2 lên — gắn sai bậc là bỏ câu vào kho mà
     đề của level đó không được phép bốc. */
  ok(items.filter(i => i.level === 1).every(i => i.cefr === 'B1'), 'Level 1 gắn bậc B1');
  ok(items.filter(i => i.level === 2).every(i => i.cefr === 'B2'), 'Level 2 gắn bậc B2');
}

/* Part A-D và I: bể câu không cần audio giờ do server/data/vpet-items.js
   giữ, được seedVpetItems() nạp lúc khởi động và được scripts/test-items.mjs
   kiểm (38 mục). Phần kiểm cũ ở đây đã bỏ: nó đòi mỗi part đúng số câu
   blueprint cho từng level, mà bể thì cố ý hoặc nông hơn hoặc gấp đôi —
   đúng bằng số blueprint là trường hợp tệ nhất, vì lượt thi lại sẽ lặp lại
   nguyên si. Giữ lại sẽ là hai bộ kiểm nói ngược nhau về cùng một bể. */

/* ================= 5. Khung đo và bộ mô tả năng lực ================= */

console.log('\n\x1b[1m== Khung đo · mô tả năng lực ==\x1b[0m');

{
  const D = require('../server/data/descriptors.js');

  ok(Object.keys(D.BY_SKILL).length === 4, 'Đủ bốn kỹ năng');
  ok(Object.values(D.BY_SKILL).every(l => l.length === 35), 'Mỗi kỹ năng 35 mô tả');

  /* Mô tả phải xếp tăng dần theo GSE: nextTargets() cắt mảng theo thứ tự chứ
     không sắp lại, nên một mục đặt sai chỗ sẽ lặng lẽ cho ra mục tiêu sai. */
  const tangDan = Object.values(D.BY_SKILL).every(list =>
    list.every((d, i) => i === 0 || d.gse > list[i - 1].gse));
  ok(tangDan, 'Mô tả trong mỗi kỹ năng xếp tăng dần theo điểm GSE');

  ok(Object.values(D.BY_SKILL).flat().every(d => d.gse >= 10 && d.gse <= 90),
    'Mọi mốc GSE nằm trong thang 10–90');
  ok(Object.values(D.BY_SKILL).flat().every(d => d.text && !/ and .* and /.test(d.text)),
    'Không mô tả nào ghép ba việc bằng "and" — một mô tả một năng lực');

  /* Ranh giới bậc phải liền mạch, không hở không chồng: hở một điểm là có
     điểm số không tra ra bậc nào. */
  const lienMach = D.BANDS.every((b, i) => i === 0 || b.min === D.BANDS[i - 1].max + 1);
  ok(lienMach, 'Dải bậc liền mạch, không hở và không chồng lấn');
  ok(D.bandFor(43) === 'B1' && D.bandFor(50) === 'B1' && D.bandFor(59) === 'B2',
    'Tra bậc đúng ở hai đầu dải B1 và đầu dải B2');

  ok(D.pointsToNextBand(55) === 4, 'Từ 55 còn đúng 4 điểm tới B2');
  ok(D.pointsToNextBand(88) === null, 'Ở bậc cao nhất thì không còn bậc kế tiếp');

  const p = D.profile('speaking', 55);
  ok(p.band === 'B1+', 'Hồ sơ trả đúng bậc');
  ok(p.achieved.length > 0 && p.achieved.every(d => d.gse <= 55), 'Phần "làm được rồi" chỉ lấy mốc từ điểm trở xuống');
  ok(p.next.length > 0 && p.next.every(d => d.gse > 55), 'Phần "mục tiêu kế tiếp" chỉ lấy mốc trên điểm');
  ok(p.next[0].gap <= p.next[p.next.length - 1].gap, 'Mục tiêu xếp theo khoảng cách gần trước');
  ok(p.positionInBand > 0 && p.positionInBand < 1, 'Tính được vị trí trong bậc');

  /* Đầu và cuối thang là hai chỗ dễ vỡ nhất khi cắt mảng. */
  ok(D.profile('reading', 10).achieved.length === 0, 'Điểm sàn thì chưa làm được mô tả nào');
  ok(D.profile('reading', 90).next.length === 0, 'Điểm trần thì không còn mục tiêu nào ở trên');
}

if (cookie && csrf) {
  const call = p => fetch(BASE + '/api' + p, { headers: { cookie, 'x-csrf-token': csrf } });

  const r = await call('/admin/framework/profile?skill=speaking&gse=55');
  const b = await r.json();
  ok(r.status === 200 && b.band === 'B1+', 'GET /admin/framework/profile trả đúng hồ sơ');
  ok(b.pointsToNextBand === 4, 'Hồ sơ qua API nói đúng còn mấy điểm tới bậc sau');

  const xau = await call('/admin/framework/profile?skill=speaking&gse=200');
  ok(xau.status === 400, 'Điểm ngoài thang 10–90 bị từ chối');

  const laKyNang = await call('/admin/framework/profile?skill=dancing&gse=55');
  ok(laKyNang.status === 400, 'Kỹ năng không có thật bị từ chối');

  const bands = await (await call('/admin/framework/bands')).json();
  ok(Array.isArray(bands.bands) && bands.bands.length === 10, 'GET /admin/framework/bands trả đủ 10 dải');
}

/* ================= 6. Rubric và ôn tập cá nhân hoá ================= */

console.log('\n\x1b[1m== Rubric · ôn tập cá nhân hoá ==\x1b[0m');

{
  const R = require('../server/data/rubrics.js');

  ok(Object.values(R.PART_RUBRICS).every(r =>
    Object.values(r.criteria).reduce((a, b) => a + b, 0) === 100),
    'Trọng số mọi part tròn 100');

  ok(Object.values(R.CRITERIA).every(c => c.bands.length === 7), 'Mọi tiêu chí đủ 7 bậc');
  ok(Object.values(R.CRITERIA).every(c => c.bands.every(b => b.evidence)),
    'Mọi bậc có dấu hiệu quan sát được, không chỉ lời mô tả');

  /* Part H cố ý không chấm từ vựng và ngữ pháp — từ ngữ do đề cho sẵn. */
  ok(!('vocabulary' in R.PART_RUBRICS.H.criteria) && !('grammar' in R.PART_RUBRICS.H.criteria),
    'Part H không chấm từ vựng và ngữ pháp');
  ok('accuracy' in R.PART_RUBRICS.H.criteria && !('accuracy' in R.PART_RUBRICS.I.criteria),
    'Chỉ part H có tiêu chí khớp từ — hai part kia không có văn bản gốc để so');

  ok(R.tierFor(1) === 'struggling' && R.tierFor(4) === 'developing' && R.tierFor(6) === 'refining',
    'Chia đúng ba mức ôn tập theo bậc');

  /* Điểm part rút gọn theo trọng số thực có: chấm thiếu một tiêu chí không
     được âm thầm kéo điểm xuống. */
  ok(Math.abs(R.partScore('H', { accuracy: 6, pronunciation: 6, fluency: 6 }) - 6) < 1e-9,
    'Chấm tối đa mọi tiêu chí cho đúng 6');
  ok(Math.abs(R.partScore('H', { accuracy: 4 }) - 4) < 1e-9,
    'Thiếu tiêu chí thì rút gọn theo trọng số có thật, không kéo điểm xuống');

  /* Xếp hạng theo điểm lấy lại được, KHÔNG theo điểm thấp nhất. */
  const xep = R.rankByOpportunity('J',
    { content: 3, fluency: 4, coherence: 3, pronunciation: 2, vocabulary: 4, grammar: 4 });
  ok(xep[0].criterion === 'content',
    'Ưu tiên tiêu chí lấy lại được nhiều điểm nhất, không phải tiêu chí điểm thấp nhất',
    'thấy ' + xep[0].criterion);
  ok(xep.every((r, i) => i === 0 || r.headroom <= xep[i - 1].headroom), 'Xếp giảm dần theo headroom');
  ok(xep.every(r => r.advice && r.advice.actions.length >= 2), 'Mỗi mục xếp hạng đều kèm việc làm được');

  const loiKhuyen = R.adviceFor('fluency', 2);
  ok(loiKhuyen.tier === 'struggling' && loiKhuyen.study.length > 0,
    'Lời khuyên kèm trang tự học để bấm sang');
}

/* ---- Ý chính có tới được tay máy chấm không ----
   Ba chặng, và đứt chặng nào cũng ra cùng một triệu chứng: bài vẫn được chấm,
   tiêu chí nặng nhất của part vẫn ra một con số, chỉ là con số ấy không đối
   chiếu với gì cả. Không chặng nào tự báo lỗi, nên phải kiểm cả ba. */
{
  const G = require('../server/marking-guide.js');
  const R = require('../server/data/rubrics.js');
  const rows = require('../server/data/vpet-items.js').rows();

  /* Chặng 1 — tệp nội dung có ý chính, đủ số mà thang điểm cần. */
  const b = rows.filter(i => i.part === 'B');
  const dI = rows.filter(i => ['D', 'I'].includes(i.part));
  ok(b.every(i => i.keyPoints.length === 6),
    'Mỗi bài part B có đúng 6 ý chính — số nhỏ nhất mà cả 7 bậc content đều với tới',
    b.map(i => i.keyPoints.length).join(','));
  ok(dI.every(i => i.keyPoints.length >= 4),
    'Mỗi bài part D và I liệt kê đủ thành phần đề bài yêu cầu, kể cả văn phong',
    dI.map(i => i.keyPoints.length).join(','));

  /* Sáu ý là mốc tính được chứ không phải chọn cho tròn: với 5 ý, bao phủ 1 ý
     đã là 20% nên bậc 1 ("dưới 20%") không ai với tới. Kiểm lại phép tính ấy ở
     đây, để nếu ai sửa thang điểm content thì con số 6 sẽ đỏ chứ không lặng lẽ
     sai. */
  const bacTheoPhanTram = p => (p === 0 ? 0 : p < 20 ? 1 : p <= 35 ? 2 : p <= 55 ? 3 : p <= 75 ? 4 : p <= 90 ? 5 : 6);
  const phuKin = n => new Set(Array.from({ length: n + 1 }, (_, k) => bacTheoPhanTram(k / n * 100))).size === 7;
  ok(phuKin(6) && !phuKin(5), '6 là số ý nhỏ nhất phủ kín cả bảy bậc content');

  /* Chặng 2 — CSDL có giữ lại không. seedVpetItems() từng bỏ rơi cột này, và
     mất ở đây thì tệp nội dung vẫn đúng, chỉ kho là rỗng. */
  {
    const { q } = require('../server/db.js');
    const thieu = q.all(
      `SELECT ext_key, key_points_json FROM questions
        WHERE family_id='vpet' AND part IN ('B','D','I') AND ext_key IS NOT NULL`)
      .filter(r => JSON.parse(r.key_points_json || '[]').length < 4);
    ok(thieu.length === 0, 'Ý chính theo câu vào tới kho, không rụng ở bước nạp',
      thieu.map(r => r.ext_key).join(', '));
  }

  /* Chặng 3 — máy chấm có được xem không. Một trường không ai đọc thì cũng như
     không có, mà lại trông như đã xong. */
  const bai = b[0];
  const nhacB = G.userPrompt('B', bai, 'the library fixes things');
  ok(bai.keyPoints.every(k => nhacB.includes(k)),
    'Lời nhắc part B mang theo đủ ý chính của chính câu ấy');
  ok(!nhacB.includes('90') && !/GSE|band \d/i.test(nhacB),
    'Lời nhắc không lộ thang điểm — máy chấm trả bậc, nền tảng mới quy ra điểm');

  const nhacD = G.userPrompt('D', rows.find(i => i.part === 'D'), 'Dear Sir');
  ok(/elements this task requires/.test(nhacD) && /key points of the source/.test(nhacB),
    'Hai part gọi tên danh sách theo đúng tiêu chí của mình: content so nội dung, task đếm thành phần');

  /* Part H không có ý chính và không cần: bản đối chiếu của nó là câu đã đọc. */
  const h = require('../server/data/vpet-scripts.js').allItems().find(i => i.part === 'H');
  const nhacH = G.userPrompt('H', h, 'nghe được gì đó');
  ok(nhacH.includes(h.script) && !/key points|elements this task/.test(nhacH),
    'Part H được xem câu gốc thay cho ý chính');

  /* Thang content viết bằng phần trăm, nên bắt máy chấm trả luôn số ý nó đếm
     được: bậc 5 kèm "2/6" là mâu thuẫn máy dò ra được, còn bậc 5 trơ trọi thì
     không. Part chấm bằng `task` không tính phần trăm nên không hỏi. */
  ok(G.responseSchema('B').required.includes('keyPointsCovered')
    && !G.responseSchema('D').required.includes('keyPointsCovered'),
    'Part chấm content phải trả về số ý đã bao phủ; part chấm task thì không');
  ok(Object.keys(R.PART_RUBRICS).every(p => G.responseSchema(p).additionalProperties === false),
    'Lược đồ trả lời vẫn khoá, không cho máy chấm thêm trường điểm số');
}

if (cookie && csrf) {
  const post = (p, body) => fetch(BASE + '/api' + p, {
    method: 'POST',
    headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  const r = await fetch(BASE + '/api/admin/framework/rubrics?part=J', { headers: { cookie, 'x-csrf-token': csrf } });
  const b = await r.json();
  ok(r.status === 200 && b.parts.J, 'GET /admin/framework/rubrics?part=J trả rubric');
  ok(Object.keys(b.criteria).length === Object.keys(b.parts.J.criteria).length,
    'Chỉ trả về tiêu chí mà part đó thật sự dùng');

  const a = await post('/admin/framework/advice', { part: 'J', scores: { content: 3, fluency: 4 } });
  const ab = await a.json();
  ok(a.status === 200 && Array.isArray(ab.ranked) && ab.ranked.length === 2,
    'POST /admin/framework/advice xếp hạng đúng số tiêu chí được chấm');

  const xau = await post('/admin/framework/advice', { part: 'J', scores: { content: 99 } });
  ok(xau.status === 400, 'Bậc ngoài thang 0–6 bị từ chối');

  const laPart = await post('/admin/framework/advice', { part: 'Z', scores: { content: 3 } });
  ok(laPart.status === 400, 'Part không có rubric bị từ chối');
}

/* ================= 5a. Đường dựng audio Kokoro ================= */

console.log('\n\x1b[1m== Đường dựng audio Kokoro ==\x1b[0m');

{
  const fs2 = require('node:fs');

  /* Kokoro không hiểu SSML — đưa thẻ break vào là nó ĐỌC TO cái thẻ. Nên bộ
     dựng phải gửi `segments` chứ tuyệt đối không gửi `parsed.text`. Đây là thứ
     nếu hỏng thì mỗi câu nghe trong kho có một giọng đọc "break time one point
     zero s" ở giữa, và không có kiểm thử nào khác bắt được. */
  /* Bỏ chú thích trước khi soi: phần đầu file GIẢI THÍCH cái bẫy này bằng
     đúng chữ `parsed.text`, và một phép kiểm bắt nhầm lời giải thích của
     chính nó là phép kiểm sẽ bị ai đó tắt đi. */
  const raw = fs2.readFileSync('scripts/dung-audio-kokoro.mjs', 'utf8');
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(/segments/.test(src), 'Bộ dựng gửi segments sang Python');
  ok(!/parsed\.text/.test(src), 'Bộ dựng KHÔNG gửi parsed.text (chứa thẻ break)');
  ok(/segments: p?\w*\.?segments|segments\b/.test(src), 'Payload gửi đi mang trường segments');

  const py = fs2.readFileSync('tools/kokoro/render.py', 'utf8');
  ok(/np\.zeros/.test(py), 'Python tự chèn im lặng cho mỗi khoảng nghỉ');
  ok(/seg\["kind"\] == "pause"/.test(py), 'Python phân biệt đoạn nói và đoạn nghỉ');
  ok(/np\.clip/.test(py), 'Có kẹp biên độ trước khi chuyển int16 — tránh tiếng tách');

  /* Trạng thái sau khi dựng phải là ready, không phải approved: người vẫn phải
     nghe. Nếu chỗ này thành approved thì cổng phát hành mất tác dụng và một
     giọng đọc sai tên riêng đi thẳng ra phòng thi. */
  ok(/audio_status='ready'/.test(src), 'Dựng xong để trạng thái ready');
  ok(!/audio_status='approved'/.test(src), 'Bộ dựng không tự duyệt audio');

  /* Băm phải gồm cả giọng và tốc độ: đổi giọng mà băm không đổi thì lần dựng
     sau bỏ qua và câu giữ nguyên giọng cũ. */
  ok(/voice, speed/.test(src) && /kokoro-v1\.0/.test(src),
    'Băm nội dung gồm cả giọng, tốc độ và phiên bản model');
}

{
  /* Đường dựng đọc segments từ chính parseScript, nên hai thứ phải khớp hình
     dạng. Nếu parseScript đổi tên trường thì bộ dựng hỏng lặng lẽ. */
  const p2 = parseScript('One. _ Two.');
  ok(p2.segments.every(s2 => s2.kind === 'speech' || s2.kind === 'pause'),
    'Mọi segment chỉ có hai loại: speech hoặc pause');
  ok(p2.segments.filter(s2 => s2.kind === 'pause').every(s2 => Number.isFinite(s2.ms)),
    'Mọi đoạn nghỉ mang số mili-giây dùng được');
  ok(p2.segments.filter(s2 => s2.kind === 'speech').every(s2 => typeof s2.text === 'string'),
    'Mọi đoạn nói mang chuỗi chữ');
  ok(p2.segments[0].kind === 'pause' && p2.segments[0].leadIn === true,
    'Đoạn đầu tiên luôn là khoảng lặng dẫn vào');
}

/* ================= 5b. Hướng dẫn chấm cho AI ================= */

console.log('\n\x1b[1m== Hướng dẫn chấm cho AI ==\x1b[0m');

const MG = require('../server/marking-guide.js');

{
  const D2 = require('../server/data/descriptors.js');

  /* Mốc bậc là số nguyên (B1+ 51–58, B2 bắt đầu 59), nên điểm lẻ rơi vào chín
     khe giữa các bậc. Bản cũ trả 'C2' cho mọi giá trị không khớp — tức là một
     kết quả 58,2 (B1+) in ra C2 trên báo cáo và trên chứng chỉ. */
  const khe = [21.5, 29.5, 35.5, 42.5, 50.5, 58.2, 66.5, 75.5, 84.5];
  const mong = ['below A1', 'A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1'];
  khe.forEach((g, i) => ok(D2.bandFor(g) === mong[i],
    `Điểm lẻ ${g} xếp bậc ${mong[i]}, không rơi lên C2`, D2.bandFor(g)));
  ok(khe.every(g => D2.positionInBand(g) > 0),
    'Điểm lẻ vẫn có vị trí trong bậc, không tụt về 0');

  ok(D2.bandFor(58) === 'B1+' && D2.bandFor(59) === 'B2', 'Biên nguyên vẫn xếp đúng');
  ok(D2.bandFor(5) === 'below A1', 'Dưới sàn thang xếp bậc thấp nhất, không phải C2');
  ok(D2.bandFor(95) === 'C2' && D2.bandFor('x') === null, 'Trên trần là C2; giá trị không phải số trả null');
}

{
  /* Quy đổi bậc → thang phải nội suy, không làm tròn: làm tròn là vứt đi đúng
     phần khoảng cách mà thang liên tục sinh ra để có. */
  ok(MG.bandToGse(3) === 47 && MG.bandToGse(4) === 63, 'Bậc nguyên rơi đúng mốc đã công bố');
  const giua = MG.bandToGse(3.5);
  ok(giua > 47 && giua < 63, 'Bậc lẻ nội suy giữa hai mốc', String(giua));
  ok(MG.bandToGse(0) === null, 'Bậc 0 không có vị trí trên thang — "không làm bài" khác "làm ở đáy thang"');
  ok(MG.bandToGse(0.5) > MG.SCALE_MIN && MG.bandToGse(0.5) < 26,
    'Dưới bậc 1 vẫn nội suy xuống sàn thang chứ không dồn cục');
  ok(MG.bandToGse(6) <= MG.SCALE_MAX, 'Bậc cao nhất không vượt trần thang');
  ok(MG.bandToGse(9) === MG.bandToGse(6), 'Bậc ngoài thang bị kẹp, không ngoại suy');
}

{
  const r = MG.partResult('J', { content: 4, fluency: 4, coherence: 3, pronunciation: 3, vocabulary: 4, grammar: 4 });
  ok(r && r.bandScore > 3 && r.bandScore < 4, 'Điểm part là trung bình có trọng số của các bậc');
  ok(r.gse > 47 && r.gse < 63, 'Điểm part quy ra thang nằm giữa hai mốc tương ứng');
  ok(r.cefr === 'B1+', 'Bậc CEFR khớp điểm thang', r.cefr);

  /* Cộng trọng số trên thang BẬC, không trên số đã quy đổi: quy đổi không
     tuyến tính (bậc 3→4 cách 16 điểm, bậc 5→6 cách 7), nên trung bình số đã
     quy đổi sẽ lặng lẽ đánh nặng phần giữa thang. */
  const full = MG.skillResult('speaking', {
    H: { accuracy: 4, pronunciation: 3, fluency: 4 },
    I: { task: 4, fluency: 4, pronunciation: 3, vocabulary: 4, grammar: 3, coherence: 4 },
    J: { content: 4, fluency: 4, coherence: 3, pronunciation: 3, vocabulary: 4, grammar: 4 }
  });
  ok(full.weightCovered === 100, 'Đủ ba part Nói thì phủ trọn 100% trọng số');
  ok(full.cefr === 'B1+', 'Kết quả kỹ năng ra đúng bậc', full.cefr);

  const partial = MG.skillResult('speaking', { H: { accuracy: 4, pronunciation: 3, fluency: 4 } });
  ok(partial.weightCovered === 25,
    'Thiếu part thì báo rõ phủ bao nhiêu trọng số, không giả vờ là kết quả đầy đủ');
  ok(partial.parts.length === 1, 'Chỉ tính những part thật sự có điểm');

  let nem = false;
  try { MG.skillResult('reading', {}); } catch (e) { nem = true; }
  ok(nem, 'Kỹ năng không chấm rubric thì ném lỗi chứ không bịa trọng số');
}

{
  /* Ranh giới quan trọng nhất của cả file: model chấm bậc, nền tảng quy ra số.
     Schema phải không có chỗ nào để model nhét một con số tự nghĩ vào. */
  const sch = MG.responseSchema('J');
  const props = sch.properties.criteria.properties;
  ok(Object.keys(props).length === 6, 'Schema part J có đủ sáu tiêu chí');
  ok(sch.additionalProperties === false && sch.properties.criteria.additionalProperties === false,
    'Schema đóng — model thêm trường lạ thì hỏng validate, không bị bỏ qua im lặng');
  ok(Object.values(props).every(p => p.properties.band.maximum === 6 && p.properties.band.minimum === 0),
    'Mỗi tiêu chí chỉ nhận bậc 0–6');
  ok(Object.values(props).every(p => p.required.includes('evidence')),
    'Bằng chứng là bắt buộc — bậc không có trích dẫn thì không kiểm lại được');
  const json = JSON.stringify(sch);
  ok(!/\bgse\b/i.test(json) && !/\bcefr\b/i.test(json) && !/"score"/.test(json),
    'Schema không có trường nào để model xuất điểm thang hay bậc CEFR');

  const p = MG.systemPrompt('J');
  ok(/band from 0 to 6/i.test(p), 'Lời nhắc nói rõ chỉ trả bậc 0–6');
  ok(/do not return a score out of 100|percentage|CEFR/i.test(p), 'Lời nhắc cấm xuất thang khác');
  ok(!/\bGSE\b/.test(p), 'Lời nhắc không hề nhắc tới thang GSE');
  ok(/quotation/i.test(p), 'Lời nhắc đòi trích dẫn từ chính bài làm');
  /* Mọi bậc của mọi tiêu chí phải nằm trong lời nhắc: giám khảo được bảo "áp
     dụng bậc 4" mà không có mô tả sẽ áp dụng ý niệm bậc 4 của riêng nó. */
  const rub = require('../server/data/rubrics.js').PART_RUBRICS.J;
  const duBac = Object.keys(rub.criteria).every(nm =>
    require('../server/data/rubrics.js').CRITERIA[nm].bands.every(b => p.includes(b.descriptor)));
  ok(duBac, 'Lời nhắc trải đủ mô tả của mọi bậc, mọi tiêu chí');
  ok(MG.REFUSALS.every(x => p.includes(x.code)), 'Lời nhắc liệt kê đủ điều kiện từ chối chấm');
  ok(MG.NEVER.every(x => p.includes(x)), 'Lời nhắc liệt kê đủ thứ không được ảnh hưởng tới điểm');

  let nem = false;
  try { MG.systemPrompt('Z'); } catch (e) { nem = true; }
  ok(nem, 'Part không có rubric thì không dựng được lời nhắc');
}

{
  ok(MG.REFUSALS.some(r => r.code === 'unintelligible-recording'),
    'Có điều kiện từ chối cho bản ghi âm hỏng — lỗi thiết bị không phải lỗi thí sinh');
  ok(MG.NEVER.some(n => /accent/i.test(n)), 'Giọng vùng miền nằm trong danh sách không được tính');
  ok(MG.NEVER.some(n => /Recording quality/i.test(n)), 'Chất lượng thu âm nằm trong danh sách không được tính');
  ok(MG.MARKED_PARTS.length === 5, 'Đúng năm part được AI chấm', MG.MARKED_PARTS.join(','));
}

/* ================= 6a. Ôn tập cá nhân hoá ================= */

console.log('\n\x1b[1m== Kế hoạch ôn tập cá nhân hoá ==\x1b[0m');

const PRON = require('../server/data/pronunciation.js');
const VOCAB = require('../server/data/vocabulary.js');
const PLAN = require('../server/study-plan.js');

{
  /* Nguyên tắc xếp hạng: cái làm mất nghĩa nhiều nhất đứng trước, không phải
     cái nghe "Tây" nhất. "th" là thứ người học hỏi đầu tiên và đáng làm cuối. */
  const moi = PRON.targetsFor({ band: 1, gse: 30, limit: 5 });
  ok(moi.every(t => t.cost === 'high'), 'Người ở bậc thấp chỉ nhận mục tiêu mức thiệt hại cao');
  ok(!moi.some(t => t.id === 'th'), '"th" không được xếp trước phụ âm cuối cho người mới');

  const gioi = PRON.targetsFor({ band: 6, gse: 82, limit: 5 });
  ok(gioi.some(t => t.cost !== 'high'), 'Người đã vững thì chuyển sang mục tiêu tinh hơn');
}

{
  /* Điểm mấu chốt của cả file: yếu ngữ pháp cộng yếu phát âm có thể là MỘT
     vấn đề. Khi ngữ pháp yếu, mục tiêu phát âm phá ngữ pháp phải lên trước. */
  const khong = PRON.targetsFor({ band: 3, gse: 45, weak: [], limit: 2 }).map(t => t.id);
  const co = PRON.targetsFor({ band: 3, gse: 45, weak: ['grammar'], limit: 2 }).map(t => t.id);
  ok(co.includes('final-s-z') && co.includes('final-ed'),
    'Yếu ngữ pháp thì đuôi -s và -ed được đẩy lên đầu', co.join(', '));
  ok(JSON.stringify(khong) !== JSON.stringify(co),
    'Tiêu chí yếu thật sự làm đổi thứ tự, không phải trang trí');

  const t = PRON.targetsFor({ band: 3, gse: 45, weak: ['grammar'], limit: 1 })[0];
  ok(t.alsoHelps.includes('grammar'), 'Mục tiêu nói rõ nó còn gỡ điểm cho tiêu chí nào');
  ok(!!t.misdiagnosis, 'Mục tiêu bị chấm nhầm tên có ghi chú cảnh báo');
}

{
  ok(PRON.hidesAs('grammar').length === 2, 'Đúng hai lỗi phát âm bị chấm thành lỗi ngữ pháp');
  ok(PRON.hidesAs('fluency').length === 0, 'Không gán bừa nguyên nhân ẩn cho tiêu chí khác');
  ok(PRON.targetsFor({ gse: 30, limit: 99 }).length < PRON.TARGETS.length,
    'Mục tiêu ngoài tầm điểm bị loại, không đổ hết cho người học');
}

{
  const I = VOCAB.setsFor({ gse: 45, parts: ['I'], limit: 3 });
  ok(I.every(s => s.parts.includes('I')), 'Bộ từ vựng bám đúng part người học làm kém');
  const J = VOCAB.setsFor({ gse: 60, parts: ['J'], limit: 1 })[0];
  ok(J.parts.includes('J'), 'Part J nhận bộ kể chuyện', J.id);
  ok(VOCAB.setsFor({ gse: 45, limit: 3 }).every(s => s.kind === 'function'),
    'Không có tín hiệu part thì ưu tiên bộ theo chức năng');
  ok(VOCAB.ALL_WORDS.length === VOCAB.SETS.reduce((a, s) => a + s.items.length, 0),
    'Danh sách từ phẳng khớp tổng các bộ');
}

{
  const p = PLAN.build({
    skill: 'speaking', gse: 48,
    parts: {
      H: { accuracy: 2, pronunciation: 2, fluency: 3 },
      J: { content: 3, fluency: 3, coherence: 3, pronunciation: 2, vocabulary: 2, grammar: 2 }
    }
  });

  ok(p.band === 'B1', 'Kế hoạch gắn đúng bậc CEFR cho điểm GSE', p.band);
  ok(p.priorities.length === 3, 'Trả về đúng số việc ưu tiên đã yêu cầu');

  /* Tiêu chí xuất hiện ở nhiều part phải gộp làm một. Bảo người học ba lần
     rằng độ trôi chảy còn yếu là bảo họ không gì cả, ba lần. */
  const trung = p.priorities.map(x => x.criterion);
  ok(new Set(trung).size === trung.length, 'Tiêu chí lặp ở nhiều part được gộp làm một');
  const fl = p.priorities.find(x => x.criterion === 'fluency');
  ok(!fl || fl.parts.length === 2, 'Việc gộp giữ lại danh sách part đã cộng dồn');

  /* Xếp theo điểm gỡ được, không theo điểm thấp nhất. */
  const hs = p.priorities.map(x => x.recoverable);
  ok(hs.every((v, i) => i === 0 || v <= hs[i - 1]), 'Xếp giảm dần theo số điểm gỡ được');

  ok(p.thisWeek.length === 3, 'Danh sách việc tuần này bị chặn ở 3');
  const loai = new Set(p.thisWeek.map(x => x.kind));
  ok(loai.size >= 2, 'Việc tuần này trộn nhiều loại, không phải ba lần cùng một kiểu', [...loai].join(','));
  ok(p.thisWeek[0].kind === 'sound',
    'Bài luyện gỡ được hai tiêu chí cùng lúc được đưa lên đầu', p.thisWeek[0].kind);

  ok(p.hiddenCauses.length === 2, 'Nêu nguyên nhân ẩn cho cả grammar lẫn accuracy');
  ok(/may not be an accuracy problem/.test(p.hiddenCauses.find(h => h.criterion === 'accuracy').note),
    'Câu ghi chú dùng đúng mạo từ trước nguyên âm');
}

{
  /* partScore trả về bậc 0–6, không phải phần trăm. So với 60 thì part nào
     cũng thành "yếu" và phần chọn từ vựng mất tín hiệu mạnh nhất của nó. */
  const p = PLAN.build({
    skill: 'speaking', gse: 70,
    parts: { J: { content: 6, fluency: 6, coherence: 6, pronunciation: 6, vocabulary: 6, grammar: 6 } }
  });
  ok(p.partScores.J === 6, 'Điểm part nằm trên thang 0–6 của rubric', String(p.partScores.J));
  ok(p.hiddenCauses.length === 0, 'Không yếu chỗ nào thì không nêu nguyên nhân ẩn');
  ok(p.thisWeek.length > 0, 'Người giỏi vẫn nhận được việc để làm, không nhận trang trống');
}

{
  let loi = '';
  try { PLAN.build({ skill: 'nau-an', gse: 50 }); } catch (e) { loi = e.message; }
  ok(/Unknown skill/.test(loi), 'Kỹ năng không có thật bị từ chối');

  loi = '';
  try { PLAN.build({ skill: 'speaking', gse: 200 }); } catch (e) { loi = e.message; }
  ok(/10 to 90/.test(loi), 'Điểm ngoài thang bị từ chối');

  loi = '';
  try { PLAN.build({ skill: 'speaking', gse: 50, parts: { Z: { content: 3 } } }); } catch (e) { loi = e.message; }
  ok(/No rubric for part Z/.test(loi), 'Part không có rubric bị từ chối');
}

if (cookie && csrf) {
  const post = (p, body) => fetch(BASE + '/api' + p, {
    method: 'POST',
    headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  const r = await post('/admin/framework/plan', {
    skill: 'speaking', gse: 48,
    parts: { J: { content: 3, fluency: 3, coherence: 3, pronunciation: 2, vocabulary: 2, grammar: 2 } }
  });
  const b = await r.json();
  ok(r.status === 200 && b.thisWeek && b.priorities, 'POST /admin/framework/plan trả kế hoạch đầy đủ');
  ok(b.sounds.length > 0 && b.vocabulary.length > 0, 'Kế hoạch có cả phần phát âm lẫn từ vựng');

  const laBac = await post('/admin/framework/plan', {
    skill: 'speaking', gse: 48, parts: { J: { content: 9 } }
  });
  ok(laBac.status === 400, 'Bậc ngoài 0–6 bị từ chối ở tầng API');

  const laTieuChi = await post('/admin/framework/plan', {
    skill: 'speaking', gse: 48, parts: { J: { mechanics: 3 } }
  });
  ok(laTieuChi.status === 400, 'Tiêu chí không thuộc part đó bị từ chối');

  const pron = await fetch(BASE + '/api/admin/framework/pronunciation?gse=40',
    { headers: { cookie, 'x-csrf-token': csrf } });
  const pb = await pron.json();
  ok(pron.status === 200 && pb.targets.length === PRON.TARGETS.length && pb.suggested.length === 3,
    'GET /admin/framework/pronunciation trả cả danh sách lẫn gợi ý theo điểm');

  const voc = await fetch(BASE + '/api/admin/framework/vocabulary?set=narrating',
    { headers: { cookie, 'x-csrf-token': csrf } });
  const vb = await voc.json();
  ok(voc.status === 200 && vb.sets.length === 1 && vb.sets[0].id === 'narrating',
    'GET /admin/framework/vocabulary lọc được theo bộ');

  const laBo = await fetch(BASE + '/api/admin/framework/vocabulary?set=khong-co',
    { headers: { cookie, 'x-csrf-token': csrf } });
  ok(laBo.status === 400, 'Bộ từ vựng không tồn tại bị từ chối');
}

/* ================= 6b. Phân tích câu hỏi =================
   Kiểm bằng ví dụ tính tay. Một module thống kê chỉ có thể tin được khi có
   người tính tay ra cùng con số — so với chính nó thì mãi mãi đúng. */

console.log('\n\x1b[1m== Phân tích câu hỏi (ACADEMIC §9) ==\x1b[0m');

const IA = require('../server/item-analysis.js');
const gan = (a, b, eps = 1e-9) => a != null && Math.abs(a - b) < eps;

{
  const f = IA.facility([1, 1, 1, 0, 0]);
  ok(gan(f.p, 0.6), 'Độ khó: 3/5 đúng cho p = 0,60', String(f.p));
  ok(f.reliable === false, `Dưới ${IA.MIN_N.facility} lượt thì cờ reliable phải tắt`);
  ok(IA.facility(Array(120).fill(1).map((_, i) => (i < 60 ? 1 : 0))).reliable === true,
    'Đủ lượt thì cờ reliable bật');

  ok(IA.facility(Array(100).fill(1)).verdict.startsWith('too easy'),
    'Ai cũng đúng: "quá dễ — không phân biệt được ai"');
  ok(IA.facility(Array(100).fill(0)).verdict.startsWith('too hard'),
    'Không ai đúng: "quá khó — không phân biệt được ai"');
  ok(IA.facility([], 1).p === null, 'Không có dữ liệu thì trả null chứ không trả 0');
}

{
  /* Câu chấm rubric 0–6: độ khó là điểm trung bình trên điểm tối đa, không
     phải tỉ lệ vượt một mốc nào đó. Cắt ở 4 thì nhóm trung bình 4,5 hoá ra
     "quá khó" — sai, và sẽ loại một câu hoàn toàn tốt. */
  const f = IA.facility([3, 4, 5, 6], 6);
  ok(gan(f.p, 0.75), 'Câu rubric: trung bình 4,5/6 cho p = 0,75', String(f.p));
  ok(gan(f.meanScore, 4.5) && f.max === 6, 'Giữ lại cả điểm trung bình lẫn điểm tối đa');
  ok(IA.facility([3, 3, 3, 3], 6).verdict === 'well targeted',
    'Trung bình 3/6 là "đúng tầm", không phải "quá khó"');
  let nem = false;
  try { IA.facility([1], 0); } catch (e) { nem = true; }
  ok(nem, 'Điểm tối đa bằng 0 thì ném lỗi chứ không chia cho 0');
}

{
  /* Ví dụ tính tay, 6 thí sinh:
       câu này    1 1 1 0 0 0
       tổng       4 3 3 2 1 1
       phần còn lại (tổng − câu này) = 3 2 2 2 1 1
       trung bình nhóm đúng 7/3, nhóm sai 4/3, độ lệch chuẩn 0,687184…
       r = (1/0,687184…) × √(0,5×0,5) = 0,7276068751… */
  const d = IA.discrimination([1, 1, 1, 0, 0, 0], [4, 3, 3, 2, 1, 1]);
  ok(gan(d.r, 0.7276068751089989, 1e-12), 'Độ phân biệt khớp ví dụ tính tay 0,72760688', String(d.r));
  ok(d.verdict === 'excellent' && d.action === 'keep', 'r > 0,40 xếp loại tốt và giữ lại');
}

{
  /* Hệ số Pearson trên câu 0–1 phải ra đúng con số của point-biserial. Đây là
     điều kiện để dùng một công thức cho cả hai loại câu — nếu lệch thì việc
     gộp là sai, và phải tách lại. */
  const item = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0];
  const total = [7, 3, 6, 8, 2, 5, 4, 3, 9, 1];
  const rest = total.map((t, i) => t - item[i]);
  const dung = rest.filter((_, i) => item[i] === 1), sai = rest.filter((_, i) => item[i] === 0);
  const tb = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  const m = tb(rest);
  const dlc = Math.sqrt(rest.reduce((a, x) => a + (x - m) ** 2, 0) / rest.length);
  const p = dung.length / item.length;
  const pbis = ((tb(dung) - tb(sai)) / dlc) * Math.sqrt(p * (1 - p));
  ok(gan(IA.discrimination(item, total).r, pbis, 1e-12),
    'Pearson và point-biserial cho cùng một số trên câu đúng/sai');
}

{
  const d = IA.discrimination([0, 0, 1, 1, 0, 1], [5, 4, 1, 2, 3, 1]);
  ok(d.r < 0, 'Người giỏi làm sai nhiều hơn thì r âm', String(d.r));
  ok(d.action === 'fix-key', 'r âm ra hành động "kiểm tra lại khoá", không phải "câu khó"');
}

{
  ok(IA.discrimination(Array(200).fill(1), Array(200).fill(5)).verdict === 'no variance',
    'Cả nhóm trả lời như nhau: "không có biến thiên", không phải r = 0');
  ok(IA.discrimination([1, 0, 1], [1, 0, 1]).verdict === 'no variance in total',
    'Phần còn lại không phân biệt được ai thì nói rõ, và không đổ lỗi cho câu');
  let nem = false;
  try { IA.discrimination([1, 0], [1, 0, 1]); } catch (e) { nem = true; }
  ok(nem, 'Hai mảng lệch độ dài thì ném lỗi ngay');
}

{
  /* Ví dụ tính tay: 4 thí sinh, 3 câu, ma trận bậc thang.
       phương sai từng câu 0,1875 + 0,25 + 0,1875 = 0,625
       phương sai tổng 1,25
       alpha = (3/2)(1 − 0,625/1,25) = 0,75 chẵn */
  const a = IA.cronbachAlpha([[1, 1, 1], [1, 1, 0], [1, 0, 0], [0, 0, 0]]);
  ok(gan(a.alpha, 0.75), 'Alpha khớp ví dụ tính tay 0,75', String(a.alpha));
  ok(a.k === 3 && a.n === 4, 'Đếm đúng số câu và số lượt');
  ok(a.reliable === false, `Dưới ${IA.MIN_N.alpha} lượt thì alpha chưa dùng được`);

  const sem = IA.standardError(a.alpha, a.totalSd);
  ok(gan(sem, Math.sqrt(1.25) * 0.5), 'Sai số đo = độ lệch chuẩn × √(1−alpha)', String(sem));

  const kt = IA.confidenceInterval(55, sem);
  ok(gan(kt.low, 55 - sem) && gan(kt.high, 55 + sem), 'Khoảng tin cậy 68% rộng đúng một sai số đo');
  ok(gan(IA.confidenceInterval(55, sem, 95).high, 55 + 1.96 * sem), 'Mức 95% dùng 1,96 sai số đo');
  ok(IA.confidenceInterval(55, null) === null, 'Không có sai số đo thì không bịa ra khoảng tin cậy');
}

{
  ok(IA.cronbachAlpha([[1, 1], [1, 1], [1, 1]]).verdict === 'no variance in totals',
    'Mọi người cùng điểm tổng: nói rõ thay vì chia cho 0');
  ok(IA.cronbachAlpha([[1], [0], [1]]).alpha === null, 'Một câu thì không có alpha');
  let nem = false;
  try { IA.cronbachAlpha([[1, 1], [1]]); } catch (e) { nem = true; }
  ok(nem, 'Ma trận thiếu ô thì ném lỗi chứ không lặng lẽ tính sai');
  ok(IA.standardError(1, 5) === null, 'Alpha = 1 (không thể có thật) thì không trả sai số đo');
}

{
  /* Bốn phương án: B là đáp án, A hút người giỏi (dấu hiệu khoá sai hoặc
     phương án cũng đúng), D không ai chọn. */
  const chon = ['A', 'A', 'B', 'B', 'B', 'C', 'C', 'B', 'A', 'B'];
  const tong = [9, 8, 5, 4, 6, 2, 1, 5, 9, 3];
  const da = IA.distractorAnalysis(chon, ['A', 'B', 'C', 'D'], 'B', tong);
  const lay = o => da.options.find(x => x.option === o);

  ok(lay('B').isKey && gan(lay('B').share, 0.5), 'Đáp án B được 50% chọn');
  ok(lay('D').verdict.startsWith('dead'), 'Phương án không ai chọn bị gọi là phương án chết');
  ok(lay('A').verdict.startsWith('attracts stronger'),
    'Phương án hút người điểm cao hơn đáp án bị nêu đích danh', lay('A').verdict);
  ok(lay('C').verdict === 'working', 'Phương án nhiễu hút người điểm thấp là đang làm đúng việc');
  ok(gan(lay('A').meanTotal, (9 + 8 + 9) / 3), 'Điểm trung bình của người chọn A tính đúng');
}

{
  const N = IA.MIN_N.discrimination;
  const item = Array.from({ length: N }, (_, i) => (i % 2 ? 1 : 0));
  const total = Array.from({ length: N }, (_, i) => (i % 2 ? 8 : 3));

  const du = IA.analyseItem({ id: 1, part: 'C', itemScores: item, totalScores: total });
  ok(du.recommend === 'keep', 'Câu hoạt động bình thường thì giữ', du.why);

  const thieu = IA.analyseItem({ id: 2, part: 'C', itemScores: item.slice(0, 20), totalScores: total.slice(0, 20) });
  ok(thieu.recommend === 'wait', 'Chưa đủ lượt thì "chờ", không phải "giữ"');
  ok(thieu.why.includes(String(N)), 'Lời giải thích nói rõ cần bao nhiêu lượt nữa');

  /* Cả 500 người cùng làm đúng là đã quá đủ dữ liệu để kết luận — không được
     báo "chờ thêm dữ liệu" chỉ vì độ phân biệt không tính được. */
  const chet = IA.analyseItem({
    id: 3, part: 'C', itemScores: Array(500).fill(1), totalScores: Array(500).fill(9)
  });
  ok(chet.recommend === 'retire', 'Ai cũng đúng ở 500 lượt là "bỏ", không phải "chờ"', chet.why);

  /* Câu khó nhưng phân biệt tốt thì không được loại: nó đang tách nhóm giỏi
     nhất ra khỏi nhóm giỏi. Việc cần làm là xem lại nó thuộc level nào. */
  const kho = Array.from({ length: 300 }, (_, i) => (i < 20 ? 1 : 0));
  const tongKho = Array.from({ length: 300 }, (_, i) => (i < 20 ? 9 : 2));
  const r = IA.analyseItem({ id: 4, part: 'H', itemScores: kho, totalScores: tongKho });
  ok(r.recommend === 'review' && /right level/.test(r.why),
    'Câu khó mà phân biệt tốt thì "xem lại level", không phải "bỏ"', r.why);

  /* 297/300 làm đúng, và ba người làm sai nằm đúng giữa thang năng lực — nên
     độ phân biệt gần 0. Đây là câu vô hại nhưng vô dụng: chiếm chỗ và chiếm
     thời gian của thí sinh mà không nói thêm được gì về ai. */
  const deIdx = i => i === 103 || i === 114 || i === 124;
  const deItem = Array.from({ length: 300 }, (_, i) => (deIdx(i) ? 0 : 1));
  const de = IA.analyseItem({
    id: 5, part: 'C',
    itemScores: deItem,
    /* Tổng phải bao gồm chính câu này — đó là điều kiện để phép trừ trong
       công thức có nghĩa. Dựng tổng không chứa câu rồi vẫn trừ đi là trừ hai
       lần, và sẽ ra tương quan âm giả. */
    totalScores: deItem.map((v, i) => (i % 10) + v)
  });
  ok(de.recommend === 'retire' && Math.abs(de.discrimination.r) < 0.3,
    'Câu ai cũng làm được và không phân biệt được thì bỏ', de.why);
}

{
  const IS = require('../server/item-stats.js');
  /* Alpha gom theo kỹ năng, vì kỹ năng là con số thật sự báo cho thí sinh
     (attempt_scores.skill). Gom nhỏ hơn là tính độ tin cậy cho một tổng mà
     không ai từng được nhận. */
  ok(IS.sectionKey('listening') === 'listening', 'Khoá phần là kỹ năng');
  ok(IS.sectionKey(null) === 'unknown', 'Câu chưa gắn kỹ năng vẫn gom được, và lộ ra là chưa gắn');
  ok(IS.vpetLevel({ tags_json: '["ref:E1-L2","part-E","level-2"]' }) === 2, 'Đọc được level từ tag');
  ok(IS.vpetLevel({ tags_json: '["part-E"]' }) === null, 'Không có tag level thì trả null, không đoán bừa');

  /* Phân tích đọc thẳng bảng của phần thi, không giữ bản sao riêng. Hai bản
     ghi cho cùng một sự kiện thì sớm muộn sẽ lệch nhau, và lúc đó thống kê
     câu hỏi lẫn bảng điểm đều có lý mà một trong hai sai. */
  const src = require('node:fs').readFileSync('server/item-stats.js', 'utf8');
  ok(/FROM attempt_answers/.test(src), 'Đọc từ attempt_answers của phần thi');
  ok(!/item_responses/.test(src), 'Không còn bảng bài làm riêng nào');
  ok(/a\.status = 'submitted'/.test(src), 'Chỉ tính lượt đã nộp');
  ok(/marked_at IS NOT NULL/.test(src), 'Chỉ tính câu đã chấm — chưa chấm không phải là sai');

  const cov = IS.coverage();
  ok(typeof cov.unmarked === 'number', 'Độ phủ báo riêng số câu còn chờ chấm');
}

if (cookie && csrf) {
  const r = await fetch(BASE + '/api/admin/analysis', { headers: { cookie, 'x-csrf-token': csrf } });
  const b = await r.json();
  ok(r.status === 200 && b.coverage && b.thresholds, 'GET /admin/analysis trả độ phủ dữ liệu và ngưỡng');
  ok(b.thresholds.discrimination === IA.MIN_N.discrimination,
    'Ngưỡng trả về đúng bằng ngưỡng module dùng để tính');
  ok(Array.isArray(b.items) && Array.isArray(b.sections), 'Trả về danh sách câu và danh sách phần');

  const xau = await fetch(BASE + '/api/admin/analysis?recommend=xoa-het', { headers: { cookie, 'x-csrf-token': csrf } });
  ok(xau.status === 400, 'Giá trị recommend lạ bị từ chối');

  const chay = await fetch(BASE + '/api/admin/analysis/run', {
    method: 'POST',
    headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
    body: JSON.stringify({ dryRun: true })
  });
  const cb = await chay.json();
  ok(chay.status === 200 && cb.summary, 'POST /admin/analysis/run --thu trả tóm tắt');
  ok(cb.summary.ready === (cb.summary.sectionsReliable > 0),
    'Cờ "được phép hiện khoảng tin cậy" chỉ bật khi có phần đủ tin cậy');

  const ngay = await fetch(BASE + '/api/admin/analysis/run', {
    method: 'POST',
    headers: { cookie, 'x-csrf-token': csrf, 'content-type': 'application/json' },
    body: JSON.stringify({ since: 'hôm qua' })
  });
  ok(ngay.status === 400, 'Ngày không đúng định dạng ISO bị từ chối');

  const khongCsrf = await fetch(BASE + '/api/admin/analysis/run', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}'
  });
  ok(khongCsrf.status === 403, 'Chạy phân tích mà thiếu token CSRF bị chặn');
}

/* ================= 7. Sẵn sàng triển khai ================= */

console.log('\n\x1b[1m== Sẵn sàng chạy trên Cloud Run ==\x1b[0m');

{
  /* Health check phải trả lời được khi CHƯA đăng nhập: Cloud Run gọi nó bằng
     một client không có cookie nào. Health check đòi đăng nhập là health check
     luôn báo hỏng. */
  try {
    const r = await fetch(BASE + '/healthz');
    const body = await r.text();
    ok(r.status === 200 && body.trim() === 'ok', 'GET /healthz trả 200 "ok" mà không cần đăng nhập');
  } catch (e) {
    ok(false, 'GET /healthz trả lời được', e.message);
  }
}

{
  /* Cookie phiên phải có cờ Secure ở production mà không cần ai nhớ đặt biến
     môi trường — cookie phiên đi được qua HTTP thuần là loại lỗi không ai thấy
     cho tới lúc nó thành chuyện lớn. */
  const A = require('../server/auth.js');
  const cookieOf = () => {
    const headers = {};
    const res = {
      getHeader: k => headers[k],
      setHeader: (k, v) => { headers[k] = v; }
    };
    A.setCookie(res, 'x', 'y', {});
    return [].concat(headers['Set-Cookie'] || []).join('|');
  };

  const before = process.env.NODE_ENV;
  delete process.env.FORCE_SECURE_COOKIE;

  process.env.NODE_ENV = 'production';
  ok(/Secure/.test(cookieOf()), 'Production tự bật cờ Secure trên cookie phiên');

  process.env.NODE_ENV = 'development';
  ok(!/Secure/.test(cookieOf()), 'Chạy thử không bật Secure (localhost không có HTTPS)');

  process.env.FORCE_SECURE_COOKIE = '1';
  ok(/Secure/.test(cookieOf()), 'FORCE_SECURE_COOKIE=1 bật được ngoài production');

  process.env.FORCE_SECURE_COOKIE = '0';
  process.env.NODE_ENV = 'production';
  ok(!/Secure/.test(cookieOf()), 'FORCE_SECURE_COOKIE=0 tắt được trong production');

  delete process.env.FORCE_SECURE_COOKIE;
  if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before;
}

{
  /* Driver GCS thiếu tên bucket phải hỏng ngay lúc gọi, kèm câu nói rõ thiếu
     gì — chứ không phải một lỗi 502 mơ hồ khi ai đó bấm Dựng audio. */
  const before = { d: process.env.AUDIO_STORAGE, b: process.env.GCS_AUDIO_BUCKET };
  process.env.AUDIO_STORAGE = 'gcs';
  delete process.env.GCS_AUDIO_BUCKET;

  /* storage.js đọc biến môi trường lúc nạp module, nên phải nạp lại bản mới. */
  const fresh = createRequire(import.meta.url);
  delete fresh.cache[fresh.resolve('../server/storage.js')];
  const st = fresh('../server/storage.js');

  let msg = '';
  try { await st.put(Buffer.from([0xff, 0xfb, 0x90, 0x00]), 'audio/mpeg'); }
  catch (e) { msg = e.message; }
  ok(/GCS_AUDIO_BUCKET/.test(msg), 'AUDIO_STORAGE=gcs thiếu bucket thì báo đúng biến còn thiếu');

  if (before.d === undefined) delete process.env.AUDIO_STORAGE; else process.env.AUDIO_STORAGE = before.d;
  if (before.b !== undefined) process.env.GCS_AUDIO_BUCKET = before.b;
}

/* ================= Kết quả ================= */
console.log(`\n${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
