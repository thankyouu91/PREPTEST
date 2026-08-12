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

/* ================= 4. Nội dung kịch bản VPET =================
   Kịch bản là nội dung, mà nội dung thì sửa tay. Bộ này chốt các bất biến để
   một lần sửa không âm thầm làm hỏng cả đề: đủ số câu theo blueprint, đáp án
   nằm trong phương án, và ký hiệu ngắt nghỉ vẫn phân tích được. */

console.log('\n\x1b[1m== Kịch bản audio VPET ==\x1b[0m');

{
  const { allItems } = require('../server/data/vpet-scripts.js');
  const items = allItems();

  /* Blueprint cố định 55 câu, trong đó các part có audio là E8 F8 G6 H10 I2 J3
     = 37 câu mỗi level (docs/VOICE.md mục 1.1). */
  const MONG_DOI = { E: 8, F: 8, G: 6, H: 10, I: 2, J: 3 };
  const dem = {};
  items.forEach(i => { dem[i.part + i.level] = (dem[i.part + i.level] || 0) + 1; });

  let duSo = true;
  for (const [part, n] of Object.entries(MONG_DOI)) {
    for (const level of [1, 2]) if (dem[part + level] !== n) duSo = false;
  }
  ok(duSo, 'Đủ số câu theo blueprint cho cả hai level (E8 F8 G6 H10 I2 J3)');
  ok(items.length === 74, 'Tổng 74 kịch bản — 37 câu × 2 level', 'thấy ' + items.length);

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

/* Part A–D: bốn part không cần audio, hoàn thiện nốt blueprint 55 câu. */
{
  const { allItems } = require('../server/data/vpet-items.js');
  const items = allItems();

  const MONG_DOI = { A: 10, B: 3, C: 3, D: 2 };
  const dem = {};
  items.forEach(i => { dem[i.part + i.level] = (dem[i.part + i.level] || 0) + 1; });
  const duSo = Object.entries(MONG_DOI).every(([p, n]) => dem[p + 1] === n && dem[p + 2] === n);
  ok(duSo, 'Part A–D đủ số câu cho cả hai level (A10 B3 C3 D2)');

  /* Cộng với 37 câu có audio là tròn 55 — đúng blueprint, không thừa không thiếu. */
  const coAudio = require('../server/data/vpet-scripts.js').allItems();
  [1, 2].forEach(lv => {
    const n = items.filter(i => i.level === lv).length + coAudio.filter(i => i.level === lv).length;
    ok(n === 55, 'Level ' + lv + ' tròn 55 câu theo blueprint', 'thấy ' + n);
  });

  /* Part A–D không được mang kịch bản đọc: có kịch bản là hiện nút Dựng MP3 ở
     chỗ không cần audio, và tốn tiền cho thứ không ai nghe. */
  ok(items.every(i => !i.script), 'Part A–D không câu nào mang kịch bản audio');
  ok(items.every(i => i.prompt.trim()), 'Part A–D câu nào cũng có đề bài hiển thị');

  /* Part B và C đọc từ một đoạn văn; A và D thì không. */
  ok(items.filter(i => ['B', 'C'].includes(i.part)).every(i => i.passage.trim()),
    'Part B và C đều có đoạn văn kèm theo');
  ok(items.filter(i => ['A', 'D'].includes(i.part)).every(i => !i.passage),
    'Part A và D không kèm đoạn văn');

  /* Bài tự luận chấm theo rubric, phần nội dung dựa vào ý chính — thiếu là chỉ
     chấm được tiếng Anh, mất một nửa nhiệm vụ. */
  ok(items.filter(i => i.type === 'essay').every(i => i.keyPoints.length >= 4),
    'Mọi bài tự luận (B và D) có ít nhất 4 ý chính để chấm nội dung');

  const a = items.filter(i => i.part === 'A');
  ok(a.every(i => i.answer.trim()), 'Mọi câu part A đều có đáp án');
  ok(a.every(i => i.prompt.includes('______')), 'Mọi câu part A đều có chỗ trống nhìn thấy được');
  /* Đáp án nhiều biến thể ngăn bằng "|" — mỗi biến thể phải là một từ, vì đề
     bài chỉ chừa đúng một chỗ trống. */
  ok(a.every(i => i.answer.split('|').every(v => v.trim() && !/\s{2,}/.test(v.trim()))),
    'Biến thể đáp án part A đều hợp lệ');

  const c = items.filter(i => i.part === 'C');
  ok(c.every(i => i.options.includes(i.answer)), 'Part C: đáp án luôn nằm trong phương án');
  ok(c.every(i => i.options.length === 4), 'Part C: đúng 4 phương án mỗi câu');

  ok(new Set(items.map(i => i.ref)).size === items.length, 'Mã tham chiếu part A–D không trùng');
}

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
