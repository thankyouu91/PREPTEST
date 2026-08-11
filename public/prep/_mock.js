/* ============================================================
   VPET Prep — DỮ LIỆU + TRẠNG THÁI PHÍA HỌC VIÊN
   ------------------------------------------------------------
   Danh mục (kỳ thi / bài thi / gói code) nay đọc thật từ
   `GET /api/catalog`. Các mảng PREP_* bên dưới chỉ còn là
   DỮ LIỆU DỰ PHÒNG: dùng khi chưa gọi API xong hoặc khi máy chủ
   không trả lời, để trang không bao giờ trắng.

   Tài khoản học viên cũng đã có backend thật: `PrepAuth` gọi
   `/api/auth/…`, `PrepState` lấy hồ sơ và quyền mở khoá từ `/api/me`.

   Trang bắt đầu bằng `PREP.boot({ auth: true })` — nạp danh mục và phiên
   song song, rồi mới render. `PrepState.load()` sau đó đọc đồng bộ.

   // TODO(backend): kích hoạt code còn ở client cho tới khi có POST /api/redeem
   ============================================================ */

/* ---------------- Danh mục 6 nhóm kỳ thi (dự phòng) ---------------- */
// Màu badge của từng kỳ nằm trong CSS (--exam-*), cố định, không đổi theo tenant.
// status: 'ready' = blueprint is live and tests can be published;
//         'coming_soon' = listed only, nothing to buy or open yet.
const PREP_FAMILIES = [
  { id: 'vpet',  name: 'VPET',  sub: 'Vietnam Proficiency English Test',          format: 'Parts A-J, 55 items, AI scored speaking', status: 'ready' },
  { id: 'vept',  name: 'VEPT',  sub: 'Vietnam English Proficiency Test',          format: '4 skills, CEFR aligned', status: 'coming_soon' },
  { id: 'ote',   name: 'OTE',   sub: 'Oxford Test of English',                    format: 'Adaptive, 4 modules, CEFR A2-B2', status: 'coming_soon' },
  { id: 'toeic', name: 'TOEIC', sub: 'Test of English for International Communication', format: 'L&R / S&W, 990 point scale', status: 'coming_soon' },
  { id: 'ielts', name: 'IELTS', sub: 'International English Language Testing System',   format: '4 skills, band 0-9', status: 'coming_soon' },
  { id: 'pte',   name: 'PTE',   sub: 'Pearson Test of English',                   format: 'Computer based, AI scored, 10-90 scale', status: 'coming_soon' }
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

  /* 'fallback' khi còn dùng mảng tĩnh, 'api' khi đã đọc được /api/catalog */
  catalogSource: 'fallback',
  _catalogPromise: null,

  /* Đọc danh mục thật từ server. Gọi nhiều lần cũng chỉ fetch một lần.
     Luôn resolve { ok, error } — lỗi mạng không làm vỡ trang, chỉ giữ dữ liệu dự phòng. */
  loadCatalog() {
    if (this._catalogPromise) return this._catalogPromise;
    this._catalogPromise = fetch('/api/catalog', {
      credentials: 'same-origin', headers: { Accept: 'application/json' }
    })
      .then(r => {
        if (!r.ok) throw new Error('Máy chủ trả về ' + r.status);
        return r.json();
      })
      .then(d => {
        if (!d || !Array.isArray(d.families) || !Array.isArray(d.tests)) {
          throw new Error('Dữ liệu danh mục không đúng định dạng');
        }
        if (d.families.length) this.families = d.families;
        this.tests = d.tests;                                   // rỗng là hợp lệ: chưa phát hành đề nào
        if (Array.isArray(d.packages) && d.packages.length) this.packages = d.packages;
        this.catalogSource = 'api';
        return { ok: true };
      })
      .catch(err => ({ ok: false, error: err && err.message ? err.message : 'Không tải được danh mục' }));
    return this._catalogPromise;
  },

  /* Dải cảnh báo khi không đọc được danh mục (trang vẫn render dữ liệu dự phòng).
     Gọi ngay sau loadCatalog(); không làm gì nếu tải thành công. */
  catalogWarning(res) {
    if (!res || res.ok || document.getElementById('catalog-warning')) return;
    const host = document.getElementById('main') || document.body;
    const box = document.createElement('div');
    box.id = 'catalog-warning';
    box.className = 'max-w-shell mx-auto px-4 sm:px-6 lg:px-10 mt-5';
    box.innerHTML =
      '<div class="banner banner-warn show" role="alert">' +
        this.icon('alert', 'w-5 h-5 shrink-0 mt-0.5') +
        '<span>Chưa đọc được danh mục mới nhất từ máy chủ, đang hiển thị bản lưu sẵn. ' +
          '<button type="button" class="underline font-bold" data-catalog-retry>Tải lại trang</button>' +
        '</span>' +
      '</div>';
    host.prepend(box);
    box.querySelector('[data-catalog-retry]').addEventListener('click', () => location.reload());
  },

  family(id) { return this.families.find(f => f.id === id); },
  test(id) { return this.tests.find(t => t.id === id); },
  testsOf(familyId) { return this.tests.filter(t => t.familyId === familyId); },

  /* Tổng số câu của một bài; 0 nghĩa là admin chưa nhập câu hỏi */
  itemCount(t) { return (t.sections || []).reduce((s, x) => s + (x.items || 0), 0); },

  _bootPromise: null,

  /* Khởi động một trang: nạp danh mục + phiên học viên song song.
     Truyền { auth: true } cho trang bắt buộc đăng nhập — nếu không có phiên thì
     chuyển sang màn đăng nhập và KHÔNG resolve, để trang không render dở dang.
     (Guard chính nằm ở server; đây là lớp đỡ thứ hai cho HTML đã nằm trong cache.) */
  boot(opts) {
    opts = opts || {};
    if (!this._bootPromise) {
      this._bootPromise = Promise.all([this.loadCatalog(), PrepState.fetch()])
        .then(([cat]) => { this.catalogWarning(cat); return cat; });
    }
    return this._bootPromise.then(cat => {
      if (opts.auth && !PrepState.user()) {
        const next = encodeURIComponent(location.pathname + location.search);
        location.replace('/prep/dang-nhap/?next=' + next);
        return new Promise(() => {});
      }
      return cat;
    });
  },

  vnd(n) { return n.toLocaleString('vi-VN') + 'đ'; },

  /* Số ngày còn lại tới mốc ISO (âm = đã qua) */
  daysUntil(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return Math.ceil((d - new Date()) / 86400000);
  },
  /* "hôm nay" / "3 ngày trước" / "12/08/2026" */
  timeAgo(iso) {
    const diff = -this.daysUntil(iso);
    if (diff === null) return '';
    if (diff <= 0) return 'hôm nay';
    if (diff === 1) return 'hôm qua';
    if (diff < 30) return diff + ' ngày trước';
    return this.fmtDate(iso);
  },
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
   PrepApi — gọi API tài khoản học viên (/api/auth/…, /api/me)
   Tự gắn token CSRF từ cookie prep_csrf cho mọi request thay đổi dữ liệu.
   Luôn resolve { ok, status, data } — lỗi mạng không ném ra ngoài.
   ============================================================ */
const PrepApi = {
  csrf() {
    const m = document.cookie.match(/(?:^|;\s*)prep_csrf=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  },

  req(method, path, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') {
      const t = this.csrf();
      if (t) headers['X-CSRF-Token'] = t;
    }
    return fetch(path, {
      method, headers, credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body)
    })
      .then(r => r.json().catch(() => ({})).then(data => ({ ok: r.ok, status: r.status, data })))
      .catch(() => ({ ok: false, status: 0, data: { error: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' } }));
  },

  get(p) { return this.req('GET', p); },
  post(p, b) { return this.req('POST', p, b === undefined ? {} : b); },
  patch(p, b) { return this.req('PATCH', p, b); },

  /* Lấy câu lỗi để hiện cho người dùng, có câu dự phòng khi server không nói gì */
  err(res, fallback) {
    return (res && res.data && res.data.error) || fallback || 'Có lỗi xảy ra, thử lại giúp mình nhé.';
  }
};

/* ============================================================
   PrepState — trạng thái học viên
   ------------------------------------------------------------
   Danh tính, quyền mở khoá, code và đơn hàng lấy từ GET /api/me.
   Phần CHƯA có API còn nằm ở localStorage theo từng tài khoản:
     · seenTestIds  — đã xem cấu trúc bài nào (checklist ở trang chủ)
     · notif        — tuỳ chọn nhận thông báo
     · lớp phủ code — mã kích hoạt / mua thử phía client
   // TODO(backend): lớp phủ code biến mất khi có POST /api/redeem
   // TODO(backend): seenTestIds và notif chuyển sang API user-state

   fetch() gọi mạng (một lần mỗi trang); load() đọc bản đã gộp, đồng bộ.
   ============================================================ */
const PrepState = {
  KEY: 'prep.local.v1',
  _server: null,
  _merged: null,
  _promise: null,

  /* ---------- Lớp phủ cục bộ, tách theo tài khoản ---------- */
  _allLocal() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch (e) { return {}; }
  },
  _local(account) {
    const box = this._allLocal()[account];
    return Object.assign({
      seenTestIds: [], generatedCodes: {}, extraCodes: [],
      extraTestIds: [], extraFamilyIds: [], extraOrders: [],
      notif: { newTests: true, reminder: true, promo: false }
    }, box || {});
  },
  _saveLocal(account, patch) {
    const all = this._allLocal();
    all[account] = Object.assign(this._local(account), patch);
    try { localStorage.setItem(this.KEY, JSON.stringify(all)); } catch (e) {}
  },

  /* ---------- Nạp từ server rồi gộp với lớp phủ ---------- */
  fetch() {
    if (this._promise) return this._promise;
    this._promise = PrepApi.get('/api/me').then(res => {
      // 200 kèm user: null nghĩa là chưa đăng nhập — không phải lỗi
      this._server = res.ok ? res.data : null;
      this._rebuild();
      return this._merged;
    });
    return this._promise;
  },

  _rebuild() {
    /* Bảng giá về cả khi chưa đăng nhập — màn bán hàng cần nó trước khi có
       tài khoản, nên giữ riêng chứ không nằm trong bản gộp của học viên. */
    this._plans = (this._server && this._server.plans) || [];
    if (!this._server || !this._server.user) { this._merged = null; return; }
    const s = this._server;
    const account = s.user.username;
    const L = this._local(account);
    const uniq = a => [...new Set(a)];
    this._merged = {
      account,
      user: {
        name: s.user.name, email: s.user.email,
        verified: !!s.user.verified, interests: s.user.interests || []
      },
      /* Quyền do máy chủ quyết, không gộp với lớp phủ cục bộ: sửa được ở
         trình duyệt thì phân quyền không còn nghĩa gì. */
      entitlement: s.entitlement || null,
      unlockedTestIds: uniq((s.unlockedTestIds || []).concat(L.extraTestIds)),
      unlockedFamilyIds: uniq((s.unlockedFamilyIds || []).concat(L.extraFamilyIds)),
      myCodes: (s.myCodes || []).concat(L.extraCodes),
      orders: (s.orders || []).concat(L.extraOrders),
      seenTestIds: L.seenTestIds,
      generatedCodes: L.generatedCodes,
      notif: L.notif
    };
  },

  /** Bản đã gộp; null khi chưa đăng nhập. Gọi sau PREP.boot(). */
  load() { return this._merged; },
  user() { return this._merged && this._merged.user; },

  /* ---------- Phân quyền theo gói ----------
     Ba câu hỏi mà mọi màn đều phải hỏi trước khi vẽ: đang dùng gói nào, có
     được vào phần này không, còn bao nhiêu lượt thi. Câu trả lời chỉ đến từ
     máy chủ; ở đây chỉ đọc lại cho gọn. Giao diện làm mờ dựa trên các hàm này,
     nhưng máy chủ vẫn chặn độc lập — làm mờ chỉ là phép lịch sự, không phải
     hàng rào. */

  /** Quyền đang có, hoặc null khi chưa có gói nào còn hiệu lực. */
  entitlement() { return (this._merged && this._merged.entitlement) || null; },

  /** Bảng giá do máy chủ công bố (có cả khi chưa đăng nhập). */
  plans() { return this._plans || []; },

  /** Có được vào một phần tính phí không: can('selfStudy'), can('detailedReport'). */
  can(feature) {
    const e = this.entitlement();
    return !!(e && e.features && e.features[feature]);
  },

  /** Còn bao nhiêu lượt thi; null nghĩa là không giới hạn. */
  attemptsLeft() {
    const e = this.entitlement();
    return e ? e.attemptsLeft : 0;
  },

  /** Ghi các phần còn ở cục bộ. Phần thuộc server phải đi qua API riêng. */
  save(s) {
    if (!s || !s.account) return;
    this._saveLocal(s.account, {
      seenTestIds: s.seenTestIds || [],
      generatedCodes: s.generatedCodes || {},
      notif: s.notif || undefined
    });
    this._merged = s;
  },

  /** Quên dữ liệu trong bộ nhớ (dùng khi đăng xuất) */
  reset() { this._server = null; this._merged = null; this._promise = null; },

  /* --- Mở khoá --- */
  isUnlocked(test) {
    const s = this._merged;
    if (!s) return false;
    return (s.unlockedTestIds || []).includes(test.id) ||
           (s.unlockedFamilyIds || []).includes(test.familyId);
  },
  unlockedTests() {
    return PREP.tests.filter(t => this.isUnlocked(t));
  },

  /* --- Kích hoạt code ---
     Gọi thẳng máy chủ. Trước đây việc này làm ở trình duyệt, nhưng luật "một
     mã chỉ dùng cho một tài khoản" không thể ép ở đây được: dữ liệu nằm trong
     localStorage thì sửa được, và hai máy khác nhau không nhìn thấy nhau. */
  async redeem(codeRaw) {
    const code = String(codeRaw || '').trim().toUpperCase();
    if (!code) return { ok: false, error: 'Nhập mã kích hoạt của bạn.' };
    try {
      /* Đi qua PrepApi thay vì tự gọi fetch: token CSRF và việc nuốt lỗi mạng
         đã có sẵn ở đó. Bản trước tự gọi fetch và lấy token bằng PREP.csrf() —
         hàm ấy nằm ở PrepApi chứ không phải PREP, nên MỌI lần kích hoạt đều
         ném TypeError và rơi vào nhánh "mất kết nối" bên dưới, kể cả khi mạng
         hoàn toàn bình thường. */
      const res = await PrepApi.post('/api/redeem', { code });
      const data = res.data || {};
      if (!res.ok) return { ok: false, error: data.error || 'Không kích hoạt được mã. Thử lại sau nhé.' };
      /* Quyền vừa đổi nên phải nạp lại hồ sơ: fetch() nhớ kết quả cũ trong
         _promise, xoá đi thì lần gọi sau mới thực sự hỏi lại máy chủ. */
      this._promise = null;
      await this.fetch();
      return { ok: true, already: !!data.already, plan: data.plan, entitlement: data.entitlement };
    } catch (e) {
      return { ok: false, error: 'Mất kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.' };
    }
  },

  /* Mô tả một mã thành chữ. Mã bây giờ mang một GÓI theo thời hạn, nên tên gói
     là câu trả lời đúng; phần unlocks chỉ dùng cho mã cũ cấp trước khi đổi mô
     hình, và cho dữ liệu chưa gắn gói. */
  codeLabel(c) {
    if (c && c.plan) return 'Gói ' + c.plan.name + ' · ' + c.plan.months + ' tháng';
    return this.unlockLabel((c && c.unlocks) || {});
  },

  /* Mô tả một quyền mở khoá thành chữ (mô hình cũ theo bài / theo kỳ thi) */
  unlockLabel(unlocks) {
    if (!unlocks) return 'Gói bài thi';
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

  /* demoPurchase() đã bỏ. Nó sinh mã ngay trong trình duyệt và cất vào
     localStorage; từ khi kích hoạt mã do máy chủ xử lý, những mã đó không tồn
     tại ở đâu cả nên nhập vào chỉ nhận về "mã không tồn tại". Một nút tạo ra
     thứ chắc chắn hỏng thì tệ hơn là không có nút.
     // TODO(backend/payment): đơn thật + cổng VNPay/MoMo, code sinh phía server */
};

/* ============================================================
   PrepAuth — tài khoản học viên qua API thật (/api/auth/…)
   Mọi hàm đều bất đồng bộ và trả { ok, error, … }.
   Mật khẩu chỉ đi một chiều lên server, client không bao giờ giữ.
   ============================================================ */
const PrepAuth = {
  /** POST /api/auth/register — trả { ok, error, verifyLink } */
  register({ name, email, password, interests }) {
    return PrepApi.post('/api/auth/register', { name, email, password, interests })
      .then(res => {
        if (!res.ok) return { ok: false, error: PrepApi.err(res, 'Không tạo được tài khoản.') };
        PrepState.reset();
        return { ok: true, verifyLink: res.data.verifyLink };
      });
  },

  /** POST /api/auth/login — nhận tên đăng nhập hoặc email */
  login(identifier, password) {
    return PrepApi.post('/api/auth/login', { username: identifier, password })
      .then(res => {
        if (!res.ok) return { ok: false, error: PrepApi.err(res, 'Đăng nhập không thành công.') };
        PrepState.reset();
        return { ok: true };
      });
  },

  /** POST /api/me/password — đổi mật khẩu, các thiết bị khác bị đăng xuất */
  changePassword(currentPw, newPw) {
    return PrepApi.post('/api/me/password', { current: currentPw, next: newPw })
      .then(res => res.ok ? { ok: true } : { ok: false, error: PrepApi.err(res, 'Không đổi được mật khẩu.') });
  },

  /** POST /api/auth/verify — đổi token trong liên kết email lấy trạng thái đã xác thực */
  verify(token) {
    return PrepApi.post('/api/auth/verify', { token })
      .then(res => res.ok ? { ok: true } : { ok: false, error: PrepApi.err(res, 'Liên kết không hợp lệ.') });
  },

  /** POST /api/auth/verify/send — gửi lại liên kết xác thực */
  resendVerify() {
    return PrepApi.post('/api/auth/verify/send')
      .then(res => res.ok ? { ok: true, verifyLink: res.data.verifyLink }
                          : { ok: false, error: PrepApi.err(res, 'Chưa gửi lại được.') });
  },

  /** POST /api/auth/forgot — luôn trả ok để không lộ email nào có trong hệ thống */
  forgot(email) {
    return PrepApi.post('/api/auth/forgot', { email })
      .then(res => res.ok ? { ok: true, resetLink: res.data.resetLink }
                          : { ok: false, error: PrepApi.err(res, 'Không gửi được yêu cầu.') });
  },

  /** POST /api/auth/reset — đặt lại mật khẩu bằng token trong email */
  reset(token, password) {
    return PrepApi.post('/api/auth/reset', { token, password })
      .then(res => res.ok ? { ok: true } : { ok: false, error: PrepApi.err(res, 'Không đặt lại được mật khẩu.') });
  },

  logout() {
    return PrepApi.post('/api/auth/logout').then(() => {
      PrepState.reset();
      location.href = '/prep/landing/';
    });
  }
};

/* ---------------- Service worker ----------------
   Registered from here rather than from _chrome.js because this file is the
   one script every student page loads, including the public landing page.
   _chrome.js only ships on pages behind the auth guard, and an app that can
   only be installed after signing in is not installable in any useful sense.

   Failure is swallowed on purpose: the worker adds installability and an
   offline screen, so a browser that refuses it must still get a working app.
   Admin screens load neither file and stay online-only. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  });
}
