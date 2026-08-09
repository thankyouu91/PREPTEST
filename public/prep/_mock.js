/* ============================================================
   VPET Prep — MOCK DATA + STATE (giai đoạn 1: chỉ giao diện)
   ------------------------------------------------------------
   Đây là "seam" cho backend: mọi màn hình render từ các cấu trúc
   dưới đây. Khi có API thật, thay từng nhóm hàm bằng fetch cùng
   shape dữ liệu — KHÔNG cần sửa markup.

   // TODO(backend): thay PREP_DATA tĩnh bằng API catalog
   // TODO(backend/auth): thay PrepAuth (localStorage) bằng phiên thật
   // TODO(backend): thay PrepState (localStorage) bằng API user-state
   ============================================================ */

/* ---------------- Danh mục 6 nhóm kỳ thi ---------------- */
// Màu badge của từng kỳ nằm trong CSS (--exam-*), cố định, không đổi theo tenant.
const PREP_FAMILIES = [
  { id: 'vept',  name: 'VEPT',  sub: 'Chứng chỉ VEPT 4 kỹ năng',                 format: '4 kỹ năng theo chuẩn CEFR' },
  { id: 'vpet',  name: 'VPET',  sub: 'Chứng chỉ VPET 4 kỹ năng',                 format: '4 kỹ năng theo chuẩn CEFR' },
  { id: 'ote',   name: 'OTE',   sub: 'Oxford Test of English',                    format: 'Adaptive 4 module, CEFR A2-B2' },
  { id: 'toeic', name: 'TOEIC', sub: 'Test of English for International Communication', format: 'L&R / S&W, thang điểm 990' },
  { id: 'ielts', name: 'IELTS', sub: 'International English Language Testing System',   format: '4 kỹ năng, band 0-9' },
  { id: 'pte',   name: 'PTE',   sub: 'Pearson Test of English',                   format: 'Thi trên máy, chấm AI, thang 10-90' }
];

/* ---------------- Bài thi thử (CHƯA có nội dung đề) ----------------
   comingSoon = true: admin chưa nhập đề — chỉ có "format descriptor"
   để render màn pre-start. Engine làm bài nối ở giai đoạn sau.        */
const PREP_TESTS = [
  {
    id: 'vpet-b1-01', familyId: 'vpet', title: 'VPET 4 kỹ năng B1', level: 'B1',
    durationMin: 112, comingSoon: true,
    skills: ['listening', 'reading', 'writing', 'speaking'],
    sections: [
      { name: 'Listening', type: 'Trắc nghiệm', items: 20, minutes: 25 },
      { name: 'Reading',   type: 'Trắc nghiệm', items: 25, minutes: 35 },
      { name: 'Writing',   type: 'Tự luận',     items: 2,  minutes: 40 },
      { name: 'Speaking',  type: 'Ghi âm',      items: 3,  minutes: 12 }
    ],
    scoring: 'Theo thang CEFR A1-C2, quy đổi từng kỹ năng',
    guide: [
      'Chuẩn bị tai nghe và micro trước khi vào phần Nghe / Nói.',
      'Mỗi phần có đồng hồ riêng, hết giờ hệ thống tự chuyển phần.',
      'Bài Viết và Nói được chấm tự động, trả kết quả kèm nhận xét.'
    ]
  },
  {
    id: 'ielts-ac-01', familyId: 'ielts', title: 'IELTS Academic Mock 01', level: 'B2',
    durationMin: 164, comingSoon: true,
    skills: ['listening', 'reading', 'writing', 'speaking'],
    sections: [
      { name: 'Listening', type: 'Trắc nghiệm + điền từ', items: 40, minutes: 30 },
      { name: 'Reading',   type: 'Đọc hiểu học thuật',    items: 40, minutes: 60 },
      { name: 'Writing',   type: 'Task 1 + Task 2',       items: 2,  minutes: 60 },
      { name: 'Speaking',  type: '3 part, ghi âm',        items: 3,  minutes: 14 }
    ],
    scoring: 'Band 0-9, làm tròn 0.5',
    guide: [
      'Phần Nghe chỉ phát 1 lần, hãy đọc trước câu hỏi.',
      'Writing Task 2 chiếm 2/3 điểm phần Viết.',
      'Speaking mô phỏng phỏng vấn 3 part, trả lời theo đồng hồ.'
    ]
  },
  {
    id: 'ielts-ac-02', familyId: 'ielts', title: 'IELTS Academic Mock 02', level: 'C1',
    durationMin: 164, comingSoon: true,
    skills: ['listening', 'reading', 'writing', 'speaking'],
    sections: [
      { name: 'Listening', type: 'Trắc nghiệm + điền từ', items: 40, minutes: 30 },
      { name: 'Reading',   type: 'Đọc hiểu học thuật',    items: 40, minutes: 60 },
      { name: 'Writing',   type: 'Task 1 + Task 2',       items: 2,  minutes: 60 },
      { name: 'Speaking',  type: '3 part, ghi âm',        items: 3,  minutes: 14 }
    ],
    scoring: 'Band 0-9, làm tròn 0.5',
    guide: [
      'Đề nâng cao: từ vựng học thuật dày hơn Mock 01.',
      'Phân bổ 20 phút cho mỗi passage phần Đọc.',
      'Speaking part 3 hỏi sâu quan điểm, luyện trả lời có cấu trúc.'
    ]
  },
  {
    id: 'toeic-lr-01', familyId: 'toeic', title: 'TOEIC Listening & Reading 01', level: 'B1',
    durationMin: 120, comingSoon: true,
    skills: ['listening', 'reading'],
    sections: [
      { name: 'Listening', type: 'Part 1-4, trắc nghiệm', items: 100, minutes: 45 },
      { name: 'Reading',   type: 'Part 5-7, trắc nghiệm', items: 100, minutes: 75 }
    ],
    scoring: 'Thang 10-990 (mỗi phần 5-495)',
    guide: [
      'Không có điểm trừ, đừng bỏ trống câu nào.',
      'Part 7 chiếm nhiều thời gian nhất, làm Part 5-6 thật nhanh.',
      'Đồng hồ chung cho cả phần Đọc, tự phân bổ thời gian.'
    ]
  },
  {
    id: 'toeic-lr-02', familyId: 'toeic', title: 'TOEIC Listening & Reading 02', level: 'B2',
    durationMin: 120, comingSoon: true,
    skills: ['listening', 'reading'],
    sections: [
      { name: 'Listening', type: 'Part 1-4, trắc nghiệm', items: 100, minutes: 45 },
      { name: 'Reading',   type: 'Part 5-7, trắc nghiệm', items: 100, minutes: 75 }
    ],
    scoring: 'Thang 10-990 (mỗi phần 5-495)',
    guide: [
      'Đề mô phỏng độ khó kỳ thi thật từ 2024 trở lại đây.',
      'Luyện kỹ dạng đoạn đôi / đoạn ba ở Part 7.',
      'Nghe bằng tai nghe để đúng điều kiện phòng thi.'
    ]
  },
  {
    id: 'pte-ac-01', familyId: 'pte', title: 'PTE Academic Mock 01', level: 'B2',
    durationMin: 127, comingSoon: true,
    skills: ['speaking', 'writing', 'reading', 'listening'],
    sections: [
      { name: 'Speaking & Writing', type: '7 dạng câu, ghi âm + gõ', items: 28, minutes: 62 },
      { name: 'Reading',            type: '5 dạng câu',              items: 15, minutes: 30 },
      { name: 'Listening',          type: '8 dạng câu',              items: 17, minutes: 35 }
    ],
    scoring: 'Thang 10-90, chấm máy toàn phần',
    guide: [
      'Nói to, rõ, đều nhịp: máy chấm ưu tiên fluency.',
      'Read Aloud và Repeat Sentence chiếm trọng số lớn.',
      'Không quay lại câu đã nộp, cân nhắc trước khi bấm Next.'
    ]
  }
  // VEPT và OTE: chưa có bài — thư viện sẽ hiện empty state "đang biên soạn".
];

/* ---------------- Gói code (màn Mua code) ----------------
   Giá là GIÁ MINH HOẠ cho demo giao diện.
   // TODO(backend/payment): nối VNPay/MoMo, tạo đơn + sinh code thật */
const PREP_PACKAGES = [
  {
    id: 'pk-single', name: '1 bài thi thử', price: 49000, familyId: null,
    desc: 'Mở khoá 1 bài thi thử bất kỳ đang có trong thư viện.',
    perks: ['Chọn bài khi kích hoạt code', 'Hạn dùng 6 tháng', 'Làm lại không giới hạn trong hạn']
  },
  {
    id: 'pk-vpet', name: 'Gói VPET', price: 129000, familyId: 'vpet',
    desc: 'Mọi bài VPET hiện có + bài mới khi admin phát hành.',
    perks: ['Toàn bộ bài VPET', 'Cập nhật đề mới miễn phí', 'Hạn dùng 12 tháng']
  },
  {
    id: 'pk-toeic', name: 'Gói TOEIC', price: 179000, familyId: 'toeic',
    desc: 'Trọn bộ TOEIC Listening & Reading, kèm đề mới.',
    perks: ['Toàn bộ bài TOEIC', 'Cập nhật đề mới miễn phí', 'Hạn dùng 12 tháng']
  },
  {
    id: 'pk-ielts', name: 'Gói IELTS', price: 199000, familyId: 'ielts',
    desc: 'Trọn bộ IELTS Academic, kèm đề mới khi phát hành.',
    perks: ['Toàn bộ bài IELTS', 'Cập nhật đề mới miễn phí', 'Hạn dùng 12 tháng']
  },
  {
    id: 'pk-combo', name: 'Combo 2 kỳ thi', price: 329000, familyId: null, featured: true,
    desc: 'Chọn 2 kỳ thi bất kỳ, mở khoá toàn bộ bài của cả hai.',
    perks: ['2 kỳ thi tuỳ chọn', 'Tiết kiệm 49.000đ so với mua lẻ gói', 'Hạn dùng 12 tháng']
  }
];

/* ---------------- Code demo để thử luồng redeem ----------------
   // TODO(backend): kiểm tra code phía server (chống dò mã / abuse)  */
const PREP_DEMO_CODES = {
  'VPET-B1MK-24TR': { unlocks: { testId: 'vpet-b1-01' },  expiresAt: '2026-12-31', status: 'valid' },
  'IELT-AC12-96HD': { unlocks: { familyId: 'ielts' },     expiresAt: '2026-10-15', status: 'valid' },
  'TOEC-LR20-26CB': { unlocks: { familyId: 'toeic' },     expiresAt: '2027-02-28', status: 'valid' },
  'PREP-HHAN-2025': { unlocks: { familyId: 'pte' },       expiresAt: '2025-12-31', status: 'valid' },   // đã quá hạn → lỗi "hết hạn"
  'PREP-DUNG-ROI1': { unlocks: { testId: 'ielts-ac-01' }, expiresAt: '2026-12-31', status: 'used' }     // → lỗi "đã dùng"
};

/* ---------------- Tài khoản seed (demo) ----------------
   ⚠ Mật khẩu để trần trong file JS công khai: CHỈ hợp lệ ở bản demo giao diện
   không có dữ liệu thật. Không dùng lại mật khẩu này ở bất kỳ hệ thống nào khác.
   // TODO(backend/auth): xoá seed này khi nối API đăng nhập thật
   // (bcrypt phía server + phiên cookie, không bao giờ gửi mật khẩu xuống client) */
const PREP_SEED_ACCOUNTS = [
  {
    username: 'student',
    password: 'Goodmorning01',
    name: 'Học viên Demo',
    email: 'student@vpetprep.vn',
    verified: true,
    interests: ['vpet', 'ielts'],
    // Có sẵn 1 bài đã mở khoá để xem được cả thẻ mở lẫn thẻ khoá trong thư viện
    unlockedTestIds: ['vpet-b1-01'],
    unlockedFamilyIds: [],
    myCodes: [{
      code: 'VPET-B1MK-24TR', unlocks: { testId: 'vpet-b1-01' },
      redeemedAt: '2026-08-01T09:30:00Z', expiresAt: '2026-12-31', status: 'active'
    }],
    orders: [],
    notif: { newTests: true, reminder: true, promo: false }
  }
];

/* ---------------- Tenant (white-label demo) ---------------- */
const PREP_TENANTS = [
  { id: 'default',   name: 'VPET Prep',        short: 'VP' },
  { id: 'evergreen', name: 'Evergreen English', short: 'EG' },
  { id: 'sunrise',   name: 'Sunrise Academy',   short: 'SR' }
];

/* ============================================================
   PREP — tiện ích chung
   ============================================================ */
const PREP = {
  families: PREP_FAMILIES,
  tests: PREP_TESTS,
  packages: PREP_PACKAGES,
  tenants: PREP_TENANTS,

  family(id) { return PREP_FAMILIES.find(f => f.id === id); },
  test(id) { return PREP_TESTS.find(t => t.id === id); },
  testsOf(familyId) { return PREP_TESTS.filter(t => t.familyId === familyId); },

  vnd(n) { return n.toLocaleString('vi-VN') + 'đ'; },
  fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  },
  maskCode(code) {
    const p = code.split('-');
    return p.length === 3 ? p[0] + '-••••-' + p[2] : code.slice(0, 4) + '••••';
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  qs(sel, root) { return (root || document).querySelector(sel); },
  qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },
  validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim()); },

  /* Chấm độ mạnh mật khẩu 0-4 (client-side, chỉ để gợi ý UI) */
  passStrength(p) {
    let n = 0;
    if (p.length >= 8) n++;
    if (p.length >= 12) n++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) n++;
    return n; // 0-1 yếu · 2 trung bình · 3 khá · 4 mạnh
  },

  /* Icon inline SVG (Lucide, stroke 1.9, currentColor) — một bộ duy nhất */
  icon(name, cls) {
    const paths = {
      home: '<path d="M3 9.5 12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5H15V14a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v7.5H4.5A1.5 1.5 0 0 1 3 20Z"/>',
      library: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
      ticket: '<path d="M2 9.5a2.5 2.5 0 0 1 0 5V17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2.5a2.5 2.5 0 0 1 0-5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2.5"/><path d="M13 10.75v2.5"/><path d="M13 16.5V19"/>',
      chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-4"/>',
      user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      lock: '<rect width="18" height="11" x="3" y="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      unlock: '<rect width="18" height="11" x="3" y="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      layers: '<path d="m12.8 3.2 8 3.7a1 1 0 0 1 0 1.8l-8 3.7a2 2 0 0 1-1.6 0l-8-3.7a1 1 0 0 1 0-1.8l8-3.7a2 2 0 0 1 1.6 0Z"/><path d="m21.5 12.5-8.7 4a2 2 0 0 1-1.6 0l-8.7-4"/><path d="m21.5 17-8.7 4a2 2 0 0 1-1.6 0l-8.7-4"/>',
      list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
      play: '<path d="m6.5 4 13 8-13 8Z"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      checkCircle: '<path d="M21.8 10.1A10 10 0 1 1 14 2.2"/><path d="m9 11 3 3L22 4"/>',
      x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      copy: '<rect width="13" height="13" x="9" y="9" rx="2.5"/><path d="M5 15c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/>',
      eye: '<path d="M2.5 12s3.2-7 9.5-7 9.5 7 9.5 7-3.2 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/>',
      eyeOff: '<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2"/><path d="M10.7 5.1c.4-.06.9-.1 1.3-.1 6.3 0 9.5 7 9.5 7a17 17 0 0 1-1.7 2.7"/><path d="M6.6 6.6C4 8.3 2.5 12 2.5 12s3.2 7 9.5 7c1.9 0 3.6-.6 5-1.5"/><path d="m3 3 18 18"/>',
      headphones: '<path d="M3 14v-3a9 9 0 0 1 18 0v3"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3Z"/>',
      book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
      pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5Z"/>',
      mic: '<rect width="6" height="12" x="9" y="2" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
      moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
      sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
      arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
      alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
      mail: '<rect width="20" height="16" x="2" y="4" rx="2.5"/><path d="m22 7-9 5.6a2 2 0 0 1-2 0L2 7"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      palette: '<path d="M12 2a10 10 0 1 0 0 20c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.6h2c3 0 5.6-2.5 5.6-5.5C22 6 17.5 2 12 2Z"/><path d="M13.5 6.5h.01"/><path d="M17.5 10.5h.01"/><path d="M8.5 7.5h.01"/><path d="M6.5 12.5h.01"/>',
      cap: '<path d="M21.4 10.9a1 1 0 0 0 0-1.8L12.8 5.2a2 2 0 0 0-1.6 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0Z"/><path d="M22 10.5V16"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
      shield: '<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/>',
      bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
      receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
      zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>',
      target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
      globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
      award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/>',
      fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/>',
      chevronDown: '<path d="m6 9 6 6 6-6"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      loader: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>'
    };
    return '<svg class="' + (cls || 'w-5 h-5') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  },

  /* Confetti nhẹ khi redeem thành công (tôn trọng prefers-reduced-motion) */
  confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const css = getComputedStyle(document.documentElement);
    const colors = [
      css.getPropertyValue('--color-primary'), css.getPropertyValue('--color-accent'),
      css.getPropertyValue('--color-hl'), css.getPropertyValue('--exam-ielts'),
      css.getPropertyValue('--exam-pte'), css.getPropertyValue('--exam-vept')
    ];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('span');
      p.className = 'confetti-piece';
      p.style.setProperty('--cx', (Math.random() * 100) + 'vw');
      p.style.setProperty('--cc', colors[i % colors.length].trim());
      p.style.setProperty('--cd', (1.9 + Math.random() * 1.6) + 's');
      p.style.setProperty('--cr', (Math.random() > .5 ? '' : '-') + (420 + Math.random() * 520) + 'deg');
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
};

/* ============================================================
   PrepTheme — dark mode + tenant (white-label)
   ============================================================ */
const PrepTheme = {
  toggleDark() {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('prep.theme', dark ? 'dark' : 'light'); } catch (e) {}
    return dark;
  },
  isDark() { return document.documentElement.classList.contains('dark'); },
  tenant() {
    return document.documentElement.getAttribute('data-tenant') || 'default';
  },
  setTenant(id) {
    if (id === 'default') document.documentElement.removeAttribute('data-tenant');
    else document.documentElement.setAttribute('data-tenant', id);
    try { localStorage.setItem('prep.tenant', id); } catch (e) {}
    document.dispatchEvent(new CustomEvent('prep:tenant', { detail: id }));
  }
};

/* ============================================================
   PrepAccounts — "cơ sở dữ liệu" tài khoản giả lập (localStorage)
   Gộp tài khoản seed (PREP_SEED_ACCOUNTS) với tài khoản người dùng tự đăng ký.
   // TODO(backend/auth): thay bằng bảng users phía server; client KHÔNG giữ mật khẩu
   ============================================================ */
const PrepAccounts = {
  KEY: 'prep.accounts.v1',

  _local() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch (e) { return []; }
  },
  _saveLocal(list) {
    try { localStorage.setItem(this.KEY, JSON.stringify(list)); } catch (e) {}
  },

  /* Bản ghi trong localStorage (nếu có) đè lên bản seed cùng username */
  all() {
    const local = this._local();
    const taken = local.map(a => a.username.toLowerCase());
    const seeds = PREP_SEED_ACCOUNTS
      .filter(s => !taken.includes(s.username.toLowerCase()))
      .map(s => JSON.parse(JSON.stringify(s)));
    return local.concat(seeds);
  },

  /* Tìm theo tên đăng nhập HOẶC email */
  find(identifier) {
    const k = String(identifier || '').trim().toLowerCase();
    if (!k) return null;
    return this.all().find(a =>
      a.username.toLowerCase() === k || (a.email || '').toLowerCase() === k) || null;
  },

  exists(identifier) { return !!this.find(identifier); },

  upsert(acc) {
    const list = this._local();
    const i = list.findIndex(a => a.username.toLowerCase() === acc.username.toLowerCase());
    if (i >= 0) list[i] = acc; else list.push(acc);
    this._saveLocal(list);
  },

  setPassword(username, password) {
    const acc = this.find(username);
    if (!acc) return false;
    acc.password = password;
    this.upsert(acc);
    return true;
  },

  /* Đồng bộ tiến độ của phiên hiện tại về bản ghi tài khoản
     để đăng xuất rồi đăng nhập lại vẫn còn bài đã mở khoá */
  syncFromSession(s) {
    if (!s || !s.account) return;
    const acc = this.find(s.account);
    if (!acc) return;
    acc.name = s.user.name;
    acc.email = s.user.email;
    acc.verified = s.user.verified;
    acc.interests = s.user.interests || [];
    acc.unlockedTestIds = s.unlockedTestIds || [];
    acc.unlockedFamilyIds = s.unlockedFamilyIds || [];
    acc.myCodes = s.myCodes || [];
    acc.orders = s.orders || [];
    acc.generatedCodes = s.generatedCodes || {};
    acc.notif = s.notif || acc.notif;
    this.upsert(acc);
  },

  /* Bản ghi tài khoản → phiên đăng nhập */
  toSession(acc) {
    return {
      account: acc.username,
      user: {
        name: acc.name, email: acc.email,
        verified: !!acc.verified, interests: acc.interests || []
      },
      unlockedTestIds: (acc.unlockedTestIds || []).slice(),
      unlockedFamilyIds: (acc.unlockedFamilyIds || []).slice(),
      myCodes: (acc.myCodes || []).slice(),
      orders: (acc.orders || []).slice(),
      generatedCodes: Object.assign({}, acc.generatedCodes),
      notif: Object.assign({ newTests: true, reminder: true, promo: false }, acc.notif)
    };
  }
};

/* ============================================================
   PrepState — trạng thái người dùng mock (localStorage)
   // TODO(backend): thay toàn bộ bằng API + phiên đăng nhập thật
   ============================================================ */
const PrepState = {
  KEY: 'prep.session.v1',
  _cache: null,

  load() {
    if (this._cache) return this._cache;
    try { this._cache = JSON.parse(localStorage.getItem(this.KEY)) || null; }
    catch (e) { this._cache = null; }
    return this._cache;
  },
  save(s) {
    this._cache = s;
    try { localStorage.setItem(this.KEY, JSON.stringify(s)); } catch (e) {}
    PrepAccounts.syncFromSession(s);   // giữ tiến độ theo tài khoản, không theo phiên
  },
  reset() {
    this._cache = null;
    try { localStorage.removeItem(this.KEY); } catch (e) {}
  },

  user() { const s = this.load(); return s && s.user; },

  /* --- Mở khoá --- */
  isUnlocked(test) {
    const s = this.load();
    if (!s) return false;
    return (s.unlockedTestIds || []).includes(test.id) ||
           (s.unlockedFamilyIds || []).includes(test.familyId);
  },
  unlockedTests() {
    return PREP_TESTS.filter(t => this.isUnlocked(t));
  },

  /* --- Redeem code (mock) ---
     Trả về { ok, error, unlocks } — backend sẽ thay bằng POST /api/codes/redeem */
  redeem(codeRaw) {
    const code = codeRaw.trim().toUpperCase();
    const s = this.load();
    if (!s) return { ok: false, error: 'auth' };
    const mine = (s.myCodes || []).find(c => c.code === code);
    if (mine) return { ok: false, error: 'Mã này đã được kích hoạt trên tài khoản của bạn.' };
    // Mã demo tĩnh + mã sinh ra từ màn "Mua code" (demo)
    const def = PREP_DEMO_CODES[code] || (s.generatedCodes || {})[code];
    if (!def) return { ok: false, error: 'Mã không tồn tại. Kiểm tra lại từng ký tự nhé.' };
    if (def.status === 'used') return { ok: false, error: 'Mã đã được sử dụng ở tài khoản khác.' };
    if (new Date(def.expiresAt) < new Date()) return { ok: false, error: 'Mã đã hết hạn kích hoạt (' + PREP.fmtDate(def.expiresAt) + ').' };

    s.myCodes = s.myCodes || [];
    s.myCodes.push({ code, unlocks: def.unlocks, redeemedAt: new Date().toISOString(), expiresAt: def.expiresAt, status: 'active' });
    if (def.unlocks.testId) {
      s.unlockedTestIds = s.unlockedTestIds || [];
      if (!s.unlockedTestIds.includes(def.unlocks.testId)) s.unlockedTestIds.push(def.unlocks.testId);
    }
    const fams = def.unlocks.bundle || (def.unlocks.familyId ? [def.unlocks.familyId] : []);
    if (fams.length) {
      s.unlockedFamilyIds = s.unlockedFamilyIds || [];
      fams.forEach(fid => { if (!s.unlockedFamilyIds.includes(fid)) s.unlockedFamilyIds.push(fid); });
    }
    this.save(s);
    return { ok: true, unlocks: def.unlocks };
  },

  /* Mô tả một quyền mở khoá thành chữ */
  unlockLabel(unlocks) {
    if (unlocks.testId) {
      const t = PREP.test(unlocks.testId);
      return t ? t.title : unlocks.testId;
    }
    if (unlocks.familyId) {
      const f = PREP.family(unlocks.familyId);
      return 'Trọn bộ ' + (f ? f.name : unlocks.familyId);
    }
    if (unlocks.bundle) {
      return 'Combo ' + unlocks.bundle.map(id => (PREP.family(id) || { name: id }).name).join(' + ');
    }
    return 'Gói bài thi';
  },

  /* --- Đơn demo từ màn Mua code: tạo đơn + sinh code demo có thể redeem ---
     // TODO(backend/payment): thay bằng đơn thật + cổng VNPay/MoMo, code sinh phía server */
  demoPurchase(pkg, unlocks) {
    const s = this.load();
    if (!s) return null;
    const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const chunk = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
    const code = chunk() + '-' + chunk() + '-' + chunk();
    const expires = new Date();
    expires.setMonth(expires.getMonth() + (pkg.id === 'pk-single' ? 6 : 12));
    const expiresAt = expires.toISOString().slice(0, 10);

    const order = {
      id: 'DH' + String(Date.now()).slice(-8),
      packageId: pkg.id, name: pkg.name, amount: pkg.price, code,
      at: new Date().toISOString(), status: 'demo'
    };
    s.orders = s.orders || [];
    s.orders.unshift(order);
    s.generatedCodes = s.generatedCodes || {};
    s.generatedCodes[code] = { unlocks, expiresAt, status: 'valid' };
    this.save(s);
    return { order, code, expiresAt };
  }
};

/* ============================================================
   PrepAuth — đăng nhập mock để demo luồng UI
   // TODO(backend/auth): thay bằng session cookie + API thật
   ============================================================ */
const PrepAuth = {
  /* Đăng ký: tạo bản ghi tài khoản (username = email) rồi mở phiên.
     Trả { ok, error } — TODO(backend/auth): POST /api/auth/register */
  register({ name, email, password, interests }) {
    if (PrepAccounts.exists(email)) {
      return { ok: false, error: 'Email này đã được đăng ký. Thử đăng nhập hoặc dùng email khác.' };
    }
    const acc = {
      username: email, password, name, email,
      verified: false, interests: interests || [],
      unlockedTestIds: [], unlockedFamilyIds: [], myCodes: [], orders: [],
      notif: { newTests: true, reminder: true, promo: false }
    };
    PrepAccounts.upsert(acc);
    PrepState.save(PrepAccounts.toSession(acc));
    return { ok: true };
  },

  /* Đăng nhập bằng tên đăng nhập HOẶC email + mật khẩu.
     Trả { ok, error } — TODO(backend/auth): POST /api/auth/login, so khớp bcrypt phía server */
  login(identifier, password) {
    const acc = PrepAccounts.find(identifier);
    // Thông báo chung cho cả hai trường hợp: không tiết lộ tài khoản nào tồn tại
    if (!acc || acc.password !== password) {
      return { ok: false, error: 'Tài khoản hoặc mật khẩu không đúng. Kiểm tra lại giúp mình nhé.' };
    }
    PrepState.save(PrepAccounts.toSession(acc));
    return { ok: true };
  },

  /* Đổi mật khẩu (màn Bảo mật) — TODO(backend/auth): POST /api/me/password */
  changePassword(currentPw, newPw) {
    const s = PrepState.load();
    if (!s || !s.account) return { ok: false, error: 'Phiên đăng nhập đã hết hạn.' };
    const acc = PrepAccounts.find(s.account);
    if (!acc || acc.password !== currentPw) {
      return { ok: false, error: 'Mật khẩu hiện tại không đúng.' };
    }
    PrepAccounts.setPassword(acc.username, newPw);
    return { ok: true };
  },
  markVerified() {
    const s = PrepState.load();
    if (s && s.user) { s.user.verified = true; PrepState.save(s); }
  },
  logout() {
    PrepState.reset();
    location.href = '/prep/landing/';
  },
  /* Guard client cho trang cần đăng nhập (mock).
     // TODO(backend/auth): guard thật nằm ở server/middleware */
  require() {
    if (!PrepState.user()) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('/prep/dang-nhap/?next=' + next);
      return false;
    }
    return true;
  }
};
