/* ============================================================
   Khu quản trị — tiện ích dùng chung: API client, chrome, format, icon.
   Tự chứa, không phụ thuộc mã phía học viên.
   ============================================================ */

const AD = {
  /* ---------- API client: tự gắn CSRF, tự xử lý 401 ---------- */
  csrf() {
    const m = document.cookie.match(/(?:^|;\s*)prep_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  },
  async api(path, opts) {
    opts = opts || {};
    const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }
    if ((opts.method || 'GET') !== 'GET') headers['X-CSRF-Token'] = this.csrf();
    const res = await fetch('/api' + path, Object.assign({ credentials: 'same-origin' }, opts, { headers }));
    if (res.status === 401 && !path.endsWith('/login')) {
      location.href = '/admin/dang-nhap/?next=' + encodeURIComponent(location.pathname);
      throw new Error('unauthorized');
    }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    if (!res.ok) {
      const err = new Error((data && data.error) || ('Lỗi ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },
  get(p) { return this.api(p); },
  post(p, body) { return this.api(p, { method: 'POST', body: body || {} }); },
  put(p, body) { return this.api(p, { method: 'PUT', body: body || {} }); },
  del(p) { return this.api(p, { method: 'DELETE' }); },

  /* Send one file as the raw request body. Not multipart on purpose: the
     server reads the bytes directly, so neither side needs a parser and the
     platform keeps its no-new-dependency rule. */
  async upload(path, file) {
    const res = await fetch('/api' + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': this.csrf(), 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : await res.text();
    if (!res.ok) {
      const err = new Error((data && data.error) || ('Lỗi ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;
  },

  /* ---------- Format ---------- */
  vnd(n) { return (n || 0).toLocaleString('vi-VN') + 'đ'; },
  num(n) { return (n || 0).toLocaleString('vi-VN'); },
  date(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  },
  dateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return this.date(iso) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },
  ago(iso) {
    if (!iso) return '—';
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + ' phút trước';
    if (s < 86400) return Math.floor(s / 3600) + ' giờ trước';
    if (s < 30 * 86400) return Math.floor(s / 86400) + ' ngày trước';
    return this.date(iso);
  },
  daysUntil(iso) { return iso ? Math.ceil((new Date(iso) - Date.now()) / 86400000) : null; },
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  qs(sel, root) { return (root || document).querySelector(sel); },
  qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

  SKILL_VI: { listening: 'Nghe', reading: 'Đọc', writing: 'Viết', speaking: 'Nói' },
  TYPE_VI: { mcq: 'Trắc nghiệm', gap: 'Điền từ', essay: 'Tự luận', speaking: 'Ghi âm' },
  STATUS_VI: { draft: 'Bản nháp', published: 'Đang phát hành', archived: 'Lưu trữ' },

  /* ---------- Icon (Lucide, stroke 1.9, currentColor) ---------- */
  icon(name, cls) {
    const p = {
      gauge: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M13.4 10.6 19 5"/><path d="M20.7 17a9 9 0 1 0-17.4 0"/>',
      fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 13H8"/><path d="M16 17H8"/>',
      database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
      users: '<path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
      ticket: '<path d="M2 9.5a2.5 2.5 0 0 1 0 5V17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2.5a2.5 2.5 0 0 1 0-5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2.5"/><path d="M13 10.75v2.5"/><path d="M13 16.5V19"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1.5Z"/>',
      plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
      check: '<path d="M20 6 9 17l-5-5"/>',
      x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
      search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
      trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5Z"/>',
      shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
      wand: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
      upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
      download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
      lock: '<rect width="18" height="11" x="3" y="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
      unlock: '<rect width="18" height="11" x="3" y="11" rx="2.5"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
      logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
      arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
      chevronLeft: '<path d="m15 18-6-6 6-6"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
      trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
      wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M18 12h.01"/>',
      layers: '<path d="m12.8 3.2 8 3.7a1 1 0 0 1 0 1.8l-8 3.7a2 2 0 0 1-1.6 0l-8-3.7a1 1 0 0 1 0-1.8l8-3.7a2 2 0 0 1 1.6 0Z"/><path d="m21.5 12.5-8.7 4a2 2 0 0 1-1.6 0l-8.7-4"/><path d="m21.5 17-8.7 4a2 2 0 0 1-1.6 0l-8.7-4"/>',
      book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
      history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
      sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>',
      moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
      copy: '<rect width="13" height="13" x="9" y="9" rx="2.5"/><path d="M5 15c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/>',
      loader: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
      cap: '<path d="M21.4 10.9a1 1 0 0 0 0-1.8L12.8 5.2a2 2 0 0 0-1.6 0L2.6 9.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0Z"/><path d="M22 10.5V16"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
      eye: '<path d="M2.5 12s3.2-7 9.5-7 9.5 7 9.5 7-3.2 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/>',
      external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
    };
    return '<svg class="' + (cls || 'w-5 h-5') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (p[name] || '') + '</svg>';
  },

  /* ---------- Chrome: sidebar + topbar ---------- */
  NAV: [
    { key: 'reports', label: 'Báo cáo', icon: 'gauge', href: '/admin/' },
    { key: 'tests', label: 'Đề thi', icon: 'fileText', href: '/admin/de-thi/' },
    { key: 'formats', label: 'Format đề', icon: 'layers', href: '/admin/format/' },
    { key: 'bank', label: 'Ngân hàng câu hỏi', icon: 'database', href: '/admin/ngan-hang/' },
    { key: 'users', label: 'Học viên', icon: 'users', href: '/admin/hoc-vien/' },
    { key: 'codes', label: 'Code', icon: 'ticket', href: '/admin/code/' },
    { key: 'settings', label: 'Quản trị', icon: 'settings', href: '/admin/quan-tri/' }
  ],

  async mount(opts) {
    opts = opts || {};
    const app = this.qs('#app'), main = this.qs('#main');
    const active = app.getAttribute('data-active');

    let admin = { name: '—', username: '', role: '' };
    try { admin = (await this.get('/admin/me')).admin; } catch (e) { return; }

    const initials = (admin.name || 'QT').trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
    const nav = this.NAV.map(n =>
      '<a href="' + n.href + '" class="nav-item" ' + (n.key === active ? 'aria-current="page"' : '') + '>' +
      this.icon(n.icon, 'w-5 h-5 shrink-0') + '<span>' + n.label + '</span></a>').join('');

    app.insertAdjacentHTML('afterbegin',
      '<aside class="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[264px] z-40 border-r border-line bg-card px-5 py-6" aria-label="Điều hướng quản trị">' +
        '<a href="/admin/" class="flex items-center gap-3 px-1.5 mb-8">' +
          '<span class="inline-flex items-center justify-center rounded-xl text-white panel-brand w-11 h-11">' + this.icon('cap', 'w-6 h-6') + '</span>' +
          '<span class="leading-tight"><span class="block font-extrabold tracking-tight text-[17px]">VPET Prep</span>' +
          '<span class="block text-xs text-muted font-medium">Khu quản trị</span></span>' +
        '</a>' +
        '<nav class="grid gap-1.5">' + nav + '</nav>' +
        '<a href="/prep/landing/" class="nav-item mt-6">' + this.icon('external', 'w-5 h-5 shrink-0') + '<span>Xem trang học viên</span></a>' +
        '<div class="mt-auto pt-6 grid gap-4">' +
          '<button type="button" data-dark class="btn btn-ghost btn-sm" aria-label="Bật tắt chế độ tối"><span data-dark-icon></span><span data-dark-label>Chế độ tối</span></button>' +
          '<div class="flex items-center gap-3 border-t border-line pt-4 px-1">' +
            '<span class="w-10 h-10 rounded-full bg-brand-soft text-brand-strong font-bold text-sm inline-flex items-center justify-center">' + this.esc(initials) + '</span>' +
            '<span class="min-w-0 flex-1 leading-tight">' +
              '<span class="block text-sm font-bold truncate">' + this.esc(admin.name) + '</span>' +
              '<span class="block text-xs text-muted truncate">' + this.esc(admin.role === 'owner' ? 'Chủ tài khoản' : 'Biên tập') + '</span>' +
            '</span>' +
            '<button type="button" data-logout class="p-2 rounded-full text-muted hover:text-danger transition" aria-label="Đăng xuất">' + this.icon('logout', 'w-5 h-5') + '</button>' +
          '</div>' +
        '</div>' +
      '</aside>');

    main.insertAdjacentHTML('afterbegin',
      '<header class="sticky top-0 z-30 border-b border-line bg-[color:var(--color-surface)]/85 backdrop-blur-md">' +
        '<div class="flex items-center gap-3 h-16 px-4 sm:px-6 lg:px-8">' +
          '<span class="lg:hidden inline-flex items-center justify-center rounded-xl text-white panel-brand w-9 h-9 shrink-0">' + this.icon('cap', 'w-5 h-5') + '</span>' +
          '<div class="min-w-0">' +
            '<h1 class="text-[17px] sm:text-lg font-extrabold tracking-tight truncate">' + this.esc(opts.title || '') + '</h1>' +
            (opts.subtitle ? '<p class="text-[12.5px] text-muted font-medium truncate">' + this.esc(opts.subtitle) + '</p>' : '') +
          '</div>' +
          '<div class="ms-auto flex items-center gap-2" id="page-actions"></div>' +
          '<button type="button" data-dark class="p-2.5 rounded-full text-muted hover:text-ink transition lg:hidden" aria-label="Bật tắt chế độ tối"><span data-dark-icon></span></button>' +
        '</div>' +
      '</header>' +
      '<nav class="lg:hidden flex gap-1.5 overflow-x-auto no-scrollbar border-b border-line bg-card px-4 py-2.5" aria-label="Điều hướng">' +
        this.NAV.map(n => '<a href="' + n.href + '" class="chip shrink-0" ' +
          (n.key === active ? 'aria-pressed="true"' : '') + '>' + n.label + '</a>').join('') +
      '</nav>');

    main.classList.add('lg:pl-[264px]', 'min-h-[100dvh]', 'pb-16');

    this.syncDark();
    this.qsa('[data-dark]').forEach(b => b.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      try { localStorage.setItem('prep.theme', dark ? 'dark' : 'light'); } catch (e) {}
      this.syncDark();
    }));
    this.qsa('[data-logout]').forEach(b => b.addEventListener('click', async () => {
      try { await this.post('/admin/logout'); } catch (e) {}
      location.href = '/admin/dang-nhap/';
    }));
    return admin;
  },

  syncDark() {
    const dark = document.documentElement.classList.contains('dark');
    this.qsa('[data-dark-icon]').forEach(el => { el.innerHTML = this.icon(dark ? 'sun' : 'moon', 'w-5 h-5'); });
    this.qsa('[data-dark-label]').forEach(el => { el.textContent = dark ? 'Chế độ sáng' : 'Chế độ tối'; });
  },

  /* ---------- Toast ---------- */
  toast(msg, type) {
    let holder = this.qs('#toast-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'toast-holder';
      holder.className = 'fixed bottom-8 inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none';
      document.body.appendChild(holder);
    }
    const t = document.createElement('div');
    t.className = 'card px-4 py-2.5 text-sm font-semibold shadow-soft-lg flex items-start gap-2 max-w-md rise';
    t.setAttribute('role', 'status');
    t.innerHTML = (type === 'error'
      ? '<span class="text-danger shrink-0 mt-0.5">' + this.icon('alert', 'w-[18px] h-[18px]') + '</span>'
      : '<span class="text-accent-strong shrink-0 mt-0.5">' + this.icon('check', 'w-[18px] h-[18px]') + '</span>') +
      '<span>' + this.esc(msg) + '</span>';
    holder.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, type === 'error' ? 4200 : 2600);
    setTimeout(() => t.remove(), type === 'error' ? 4700 : 3100);
  },

  /* ---------- Modal đơn giản ---------- */
  modal(html, opts) {
    opts = opts || {};
    const back = document.createElement('div');
    back.className = 'modal-backdrop show';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.innerHTML = '<div class="modal-panel ' + (opts.wide ? 'sm:!max-w-2xl' : '') + '">' + html + '</div>';
    document.body.appendChild(back);
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', e => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    this.qsa('[data-close]', back).forEach(b => b.addEventListener('click', close));
    const input = back.querySelector('input, select, textarea, button');
    if (input) input.focus();
    return { el: back, close };
  },

  confirm(title, message, confirmLabel) {
    return new Promise(resolve => {
      const m = this.modal(
        '<h3 class="text-lg font-extrabold tracking-tight">' + this.esc(title) + '</h3>' +
        '<p class="text-muted text-[15px] leading-relaxed mt-2">' + this.esc(message) + '</p>' +
        '<div class="flex gap-2.5 mt-6"><button type="button" data-yes class="btn btn-primary btn-md flex-1">' +
        this.esc(confirmLabel || 'Xác nhận') + '</button>' +
        '<button type="button" data-close class="btn btn-ghost btn-md flex-1">Huỷ</button></div>');
      m.el.querySelector('[data-yes]').addEventListener('click', () => { m.close(); resolve(true); });
      m.el.addEventListener('click', e => { if (e.target === m.el) resolve(false); });
      this.qsa('[data-close]', m.el).forEach(b => b.addEventListener('click', () => resolve(false)));
    });
  },

  /* ---------- Khối rỗng / lỗi dùng chung ---------- */
  emptyBox(icon, title, desc, actionHtml) {
    return '<div class="card p-10 text-center">' +
      '<span class="w-14 h-14 rounded-full bg-brand-soft text-brand-strong inline-flex items-center justify-center mx-auto">' +
        this.icon(icon, 'w-7 h-7') + '</span>' +
      '<h3 class="font-extrabold text-lg tracking-tight mt-4">' + this.esc(title) + '</h3>' +
      '<p class="text-muted text-[15px] mt-1.5 max-w-[52ch] mx-auto leading-relaxed">' + this.esc(desc) + '</p>' +
      (actionHtml ? '<div class="mt-6 flex flex-wrap justify-center gap-2.5">' + actionHtml + '</div>' : '') +
      '</div>';
  },

  errorBox(msg, retryId) {
    return '<div class="card p-8 text-center border-[color:var(--color-danger)]">' +
      '<span class="w-12 h-12 rounded-full inline-flex items-center justify-center mx-auto text-danger bg-[color:var(--color-card)] border border-line">' +
        this.icon('alert', 'w-6 h-6') + '</span>' +
      '<h3 class="font-extrabold tracking-tight mt-3.5">Không tải được dữ liệu</h3>' +
      '<p class="text-muted text-[14.5px] mt-1.5">' + this.esc(msg) + '</p>' +
      (retryId ? '<button type="button" id="' + retryId + '" class="btn btn-ghost btn-md mt-5">Thử lại</button>' : '') +
      '</div>';
  },

  skeletonRows(n, cls) {
    return '<div class="card p-5 grid gap-3.5">' +
      Array.from({ length: n || 5 }, (_, i) =>
        '<div class="skeleton h-6 ' + (cls || (i % 3 === 0 ? 'w-11/12' : i % 3 === 1 ? 'w-full' : 'w-4/5')) + '"></div>').join('') +
      '</div>';
  }
};

/* Boot dark mode sớm cho mọi trang admin */
(function () {
  try {
    const t = localStorage.getItem('prep.theme');
    if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
