/* ============================================================
   VPET Prep — STUDENT-SIDE DATA + STATE
   ------------------------------------------------------------
   The catalogue (families / tests / code plans) is now read for real from
   `GET /api/catalog`. The PREP_* arrays below are only FALLBACK DATA:
   used while the API call is in flight, or when the server does not
   answer, so a page is never blank.

   Student accounts have a real backend too: `PrepAuth` calls
   `/api/auth/…`, and `PrepState` takes the profile and entitlements from `/api/me`.

   A page starts with `PREP.boot({ auth: true })` — catalogue and session load in
   parallel, then it renders. `PrepState.load()` reads synchronously after that.

   ============================================================ */

/* ---------------- Exam families (fallback) ---------------- */
// Each family's badge colour lives in CSS (--exam-*), fixed, not per tenant.
//
// One entry, not six. The platform is VPET-only while VPET is being finished
// (owner, 2026-08-13), and GET /api/catalog no longer sends the five parked
// families to a student. This list is what a student sees when that call
// FAILS, so it has to agree with it: a fallback that shows five exams the live
// catalogue hides would make a network blip look like a product announcement.
// The five still exist in server/db.js (FAMILIES) and an administrator still
// sees them; put one back here when it is opened again.
const PREP_FAMILIES = [
  { id: 'vpet',  name: 'VPET',  sub: 'Vietnam Proficiency English Test',          format: 'Parts A-J, 55 items, AI scored speaking', status: 'ready' }
];

/* ---------------- Mock tests (NO paper content yet) ----------------
   comingSoon = true: nothing entered yet — only a "format descriptor"
   for rendering the pre-start screen.                                 */
const PREP_TESTS = [
  {
    id: 'vpet-b1-01', familyId: 'vpet', title: 'VPET four skills B1', level: 'B1',
    durationMin: 112, comingSoon: true,
    skills: ['listening', 'reading', 'writing', 'speaking'],
    sections: [
      { name: 'Listening', type: 'Multiple choice', items: 20, minutes: 25 },
      { name: 'Reading',   type: 'Multiple choice', items: 25, minutes: 35 },
      { name: 'Writing',   type: 'Essay',           items: 2,  minutes: 40 },
      { name: 'Speaking',  type: 'Recorded',        items: 3,  minutes: 12 }
    ],
    scoring: 'On the CEFR A1-C2 scale, converted per skill',
    guide: [
      'Have headphones and a microphone ready before the Listening / Speaking parts.',
      'Each part has its own clock; when it runs out the system moves on.',
      'Writing and Speaking are marked automatically and come back with comments.'
    ]
  }
  // Only VPET has papers. The five parked families show the library's
  // "being written" empty state; their demo tests were removed (owner, 2026-08-19).
];

/* ---------------- Code bundles (the buy screen) ----------------
   These prices are ILLUSTRATIVE, for the interface demo.
   // TODO(backend/payment): wire up VNPay/MoMo, create orders + real codes */
const PREP_PACKAGES = [
  {
    id: 'pk-single', name: 'One mock test', price: 49000, familyId: null,
    desc: 'Unlocks any one mock test currently in the library.',
    perks: ['Pick the test when you activate the code', 'Valid for 6 months', 'Unlimited retakes within the term']
  },
  {
    id: 'pk-vpet', name: 'VPET bundle', price: 129000, familyId: 'vpet',
    desc: 'Every VPET test there is, plus new ones as they are published.',
    perks: ['Every VPET test', 'New papers at no extra cost', 'Valid for 12 months']
  },
  {
    id: 'pk-combo', name: 'Two-exam combo', price: 329000, familyId: null, featured: true,
    desc: 'Pick any two exams and unlock every test in both.',
    perks: ['Any two exams', 'Saves 49.000đ against two separate bundles', 'Valid for 12 months']
  }
];

/* ---------------- Demo codes for trying the redeem flow ---------------- */
const PREP_DEMO_CODES = {
  'VPET-B1MK-24TR': { unlocks: { testId: 'vpet-b1-01' }, expiresAt: '2026-12-31', status: 'valid' },
  'VPET-FULL-2026': { unlocks: { familyId: 'vpet' },     expiresAt: '2027-02-28', status: 'valid' },
  'VPET-EXPD-2025': { unlocks: { testId: 'vpet-b1-01' }, expiresAt: '2025-12-31', status: 'valid' },  // past its date → the "expired" error
  'VPET-USED-0001': { unlocks: { testId: 'vpet-b1-01' }, expiresAt: '2026-12-31', status: 'used' }    // → the "already used" error
};

/* ---------------- Tenant (white-label demo) ---------------- */
const PREP_TENANTS = [
  { id: 'default',   name: 'VPET Prep',        short: 'VP' },
  { id: 'evergreen', name: 'Evergreen English', short: 'EG' },
  { id: 'sunrise',   name: 'Sunrise Academy',   short: 'SR' }
];

/* ============================================================
   PREP — shared helpers
   ============================================================ */
const PREP = {
  families: PREP_FAMILIES,
  /* Filtered rather than deleted: the parked families' papers are still useful
     fixtures for the code screens below, but a student must not meet one in
     the library just because the catalogue call failed. */
  tests: PREP_TESTS.filter(t => PREP_FAMILIES.some(f => f.id === t.familyId)),
  packages: PREP_PACKAGES,
  tenants: PREP_TENANTS,

  /* 'fallback' while the static arrays are in use, 'api' once /api/catalog has been read */
  catalogSource: 'fallback',
  _catalogPromise: null,

  /* Read the real catalogue from the server. Calling it repeatedly still fetches once.
     Always resolves { ok, error } — a network failure keeps the fallback data rather than breaking the page. */
  loadCatalog() {
    if (this._catalogPromise) return this._catalogPromise;
    this._catalogPromise = fetch('/api/catalog', {
      credentials: 'same-origin', headers: { Accept: 'application/json' }
    })
      .then(r => {
        if (!r.ok) throw new Error('The server returned ' + r.status);
        return r.json();
      })
      .then(d => {
        if (!d || !Array.isArray(d.families) || !Array.isArray(d.tests)) {
          throw new Error('The catalogue data is not in the expected shape');
        }
        if (d.families.length) this.families = d.families;
        this.tests = d.tests;                                   // empty is valid: nothing published yet
        if (Array.isArray(d.packages) && d.packages.length) this.packages = d.packages;
        this.catalogSource = 'api';
        return { ok: true };
      })
      .catch(err => ({ ok: false, error: err && err.message ? err.message : 'Could not load the catalogue' }));
    return this._catalogPromise;
  },

  /* A warning strip for when the catalogue could not be read (the page still renders
     the fallback). Call straight after loadCatalog(); a no-op when the load succeeded. */
  catalogWarning(res) {
    if (!res || res.ok || document.getElementById('catalog-warning')) return;
    const host = document.getElementById('main') || document.body;
    const box = document.createElement('div');
    box.id = 'catalog-warning';
    box.className = 'max-w-shell mx-auto px-4 sm:px-6 lg:px-10 mt-5';
    box.innerHTML =
      '<div class="banner banner-warn show" role="alert">' +
        this.icon('alert', 'w-5 h-5 shrink-0 mt-0.5') +
        '<span>The latest catalogue could not be read from the server, so a saved copy is being shown. ' +
          '<button type="button" class="underline font-bold" data-catalog-retry>Reload the page</button>' +
        '</span>' +
      '</div>';
    host.prepend(box);
    box.querySelector('[data-catalog-retry]').addEventListener('click', () => location.reload());
  },

  family(id) { return this.families.find(f => f.id === id); },
  test(id) { return this.tests.find(t => t.id === id); },
  testsOf(familyId) { return this.tests.filter(t => t.familyId === familyId); },

  /* Total items in a test; 0 means no questions have been entered */
  itemCount(t) { return (t.sections || []).reduce((s, x) => s + (x.items || 0), 0); },

  _bootPromise: null,

  /* Boot a page: load the catalogue and the student session in parallel.
     Pass { auth: true } on a page that requires signing in — with no session it
     redirects to sign-in and does NOT resolve, so the page never half-renders.
     (The real guard is on the server; this is the second layer, for cached HTML.) */
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

  /** Skill labels. The same four values the server uses, in one place so one edit changes them everywhere. */
  SKILL_LABEL: { listening: 'Listening', reading: 'Reading', writing: 'Writing', speaking: 'Speaking' },

  /** A mark out of 10 in steps of 0.5. */
  score(n) {
    if (n == null) return '–';
    return (Math.round(n * 2) / 2).toFixed(1);
  },

  /* Days remaining until an ISO date (negative = already past) */
  daysUntil(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return Math.ceil((d - new Date()) / 86400000);
  },
  /* "today" / "3 days ago" / "12/08/2026" */
  timeAgo(iso) {
    const diff = -this.daysUntil(iso);
    if (diff === null) return '';
    if (diff <= 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 30) return diff + ' days ago';
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

  /* Password strength 0-4 (client-side, only a hint for the interface) */
  passStrength(p) {
    let n = 0;
    if (p.length >= 8) n++;
    if (p.length >= 12) n++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) n++;
    return n; // 0-1 weak · 2 fair · 3 good · 4 strong
  },

  /* Inline SVG icons (Lucide, stroke 1.9, currentColor) — one set only */
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

  /* A little confetti on a successful redeem (respects prefers-reduced-motion) */
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
   PrepApi — calls the student account API (/api/auth/…, /api/me)
   Attaches the CSRF token from the prep_csrf cookie to every state-changing request.
   Always resolves { ok, status, data } — a network failure never throws out.
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
      .catch(() => ({ ok: false, status: 0, data: { error: 'Could not reach the server. Check your connection and try again.' } }));
  },

  get(p) { return this.req('GET', p); },
  post(p, b) { return this.req('POST', p, b === undefined ? {} : b); },
  patch(p, b) { return this.req('PATCH', p, b); },

  /* The error message to show, with a fallback for when the server said nothing */
  err(res, fallback) {
    return (res && res.data && res.data.error) || fallback || 'Something went wrong. Please try again.';
  }
};

/* ============================================================
   PrepState — student state
   ------------------------------------------------------------
   Identity, entitlements, codes and orders come from GET /api/me.
   What has NO API yet still sits in localStorage, per account:
     · seenTestIds — which test structures have been looked at (the home checklist)
     · notif       — notification preferences
   // TODO(backend): move seenTestIds and notif to a user-state API

   fetch() goes to the network (once per page); load() reads the merged copy, synchronously.
   ============================================================ */
const PrepState = {
  KEY: 'prep.local.v1',
  _server: null,
  _merged: null,
  _promise: null,

  /* ---------- The local overlay, kept per account ---------- */
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

  /* ---------- Load from the server, then merge the overlay on top ---------- */
  fetch() {
    if (this._promise) return this._promise;
    this._promise = PrepApi.get('/api/me').then(res => {
      // a 200 with user: null means not signed in — not an error
      this._server = res.ok ? res.data : null;
      this._rebuild();
      return this._merged;
    });
    return this._promise;
  },

  _rebuild() {
    /* The price list comes back even when signed out — the sales screens need it
    before there is an account, so it is kept separate from the merged profile. */
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
      /* Entitlements are decided by the server and never merged with the local
      overlay: if the browser can edit them, they mean nothing. */
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

  /** The merged copy; null when signed out. Call after PREP.boot(). */
  load() { return this._merged; },
  user() { return this._merged && this._merged.user; },

  /* ---------- Entitlements by plan ----------
     The three questions every screen asks before it draws: which plan is in
     force, is this area allowed, how many sittings are left. The answers come
     from the server only; these are just tidy readers. The interface dims things
     using them, but the server refuses independently — dimming is a courtesy,
     not a fence. */

  /** The entitlement in force, or null when no plan is live. */
  entitlement() { return (this._merged && this._merged.entitlement) || null; },

  /** The price list as published by the server (available signed out too). */
  plans() { return this._plans || []; },

  /** Whether a paid area is allowed: can('selfStudy'), can('detailedReport'). */
  can(feature) {
    const e = this.entitlement();
    return !!(e && e.features && e.features[feature]);
  },

  /** Sittings remaining; null means uncapped. */
  attemptsLeft() {
    const e = this.entitlement();
    return e ? e.attemptsLeft : 0;
  },

  /** Write the parts still held locally. Server-owned parts go through their own API. */
  save(s) {
    if (!s || !s.account) return;
    this._saveLocal(s.account, {
      seenTestIds: s.seenTestIds || [],
      generatedCodes: s.generatedCodes || {},
      notif: s.notif || undefined
    });
    this._merged = s;
  },

  /** Forget what is held in memory (used on sign-out) */
  reset() { this._server = null; this._merged = null; this._promise = null; },

  /* --- Unlocking --- */
  isUnlocked(test) {
    const s = this._merged;
    if (!s) return false;
    return (s.unlockedTestIds || []).includes(test.id) ||
           (s.unlockedFamilyIds || []).includes(test.familyId);
  },
  unlockedTests() {
    return PREP.tests.filter(t => this.isUnlocked(t));
  },

  /* --- Activating a code ---
  Straight to the server. This used to happen in the browser, but the rule
  "one code, one account" cannot be enforced here: localStorage is editable,
  and two machines cannot see each other. */
  async redeem(codeRaw) {
    const code = String(codeRaw || '').trim().toUpperCase();
    if (!code) return { ok: false, error: 'Enter your activation code.' };
    try {
      /* Go through PrepApi rather than calling fetch directly: the CSRF token and
         the swallowing of network errors already live there. An earlier version
         called fetch itself and took the token with PREP.csrf() — that function
         is on PrepApi, not PREP, so EVERY activation threw a TypeError and fell
         into the "connection lost" branch below, even on a perfect connection. */
      const res = await PrepApi.post('/api/redeem', { code });
      const data = res.data || {};
      if (!res.ok) return { ok: false, error: data.error || 'That code could not be activated. Please try again.' };
      /* Entitlements just changed, so the profile must be reloaded: fetch() keeps
      the old result in _promise, and clearing it is what makes the next
      call actually ask the server again. */
      this._promise = null;
      await this.fetch();
      return { ok: true, already: !!data.already, plan: data.plan, entitlement: data.entitlement };
    } catch (e) {
      return { ok: false, error: 'Lost contact with the server. Check your connection and try again.' };
    }
  },

  /* Describe a code in words. A code now carries a time-limited PLAN, so the plan
  name is the right answer; `unlocks` is only for codes issued before the model
  changed, and for data with no plan attached. */
  codeLabel(c) {
    if (c && c.plan) return c.plan.name + ' plan · ' + c.plan.months + ' months';
    return this.unlockLabel((c && c.unlocks) || {});
  },

  /* Describe an unlock in words (the older per-test / per-family model) */
  unlockLabel(unlocks) {
    if (!unlocks) return 'Test bundle';
    if (unlocks.testId) {
      const t = PREP.test(unlocks.testId);
      return t ? t.title : unlocks.testId;
    }
    if (unlocks.familyId) {
      const f = PREP.family(unlocks.familyId);
      return 'All of ' + (f ? f.name : unlocks.familyId);
    }
    if (unlocks.bundle) {
      return 'Combo ' + unlocks.bundle.map(id => (PREP.family(id) || { name: id }).name).join(' + ');
    }
    return 'Test bundle';
  },

  /* demoPurchase() is gone. It minted codes in the browser and kept them in
     localStorage; now that the server handles redemption those codes exist
     nowhere, so entering one only ever returned "no such code". A button that
     produces something guaranteed to fail is worse than no button.
     // TODO(backend/payment): real orders + VNPay/MoMo, codes minted server-side */
};

/* ============================================================
   PrepAuth — student accounts over the real API (/api/auth/…)
   Every function is async and returns { ok, error, … }.
   Passwords only travel up to the server; the client never keeps one.
   ============================================================ */
const PrepAuth = {
  /** POST /api/auth/register — returns { ok, error, verifyLink } */
  register({ name, email, phone, password, interests }) {
    return PrepApi.post('/api/auth/register', { name, email, phone, password, interests })
      .then(res => {
        if (!res.ok) return { ok: false, error: PrepApi.err(res, 'The account could not be created.') };
        PrepState.reset();
        return { ok: true, verifyLink: res.data.verifyLink };
      });
  },

  /** POST /api/auth/login — accepts a username or an email */
  login(identifier, password) {
    return PrepApi.post('/api/auth/login', { username: identifier, password })
      .then(res => {
        if (!res.ok) return { ok: false, error: PrepApi.err(res, 'Sign-in failed.') };
        PrepState.reset();
        return { ok: true };
      });
  },

  /** POST /api/me/password — change the password; other devices are signed out */
  changePassword(currentPw, newPw) {
    return PrepApi.post('/api/me/password', { current: currentPw, next: newPw })
      .then(res => res.ok ? { ok: true } : { ok: false, error: PrepApi.err(res, 'The password could not be changed.') });
  },

  /** POST /api/auth/verify — exchange the token from the email link for verified status */
  verify(token) {
    return PrepApi.post('/api/auth/verify', { token })
      .then(res => res.ok ? { ok: true } : { ok: false, error: PrepApi.err(res, 'That link is not valid.') });
  },

  /** POST /api/auth/verify/send — send the verification link again */
  resendVerify() {
    return PrepApi.post('/api/auth/verify/send')
      .then(res => res.ok ? { ok: true, verifyLink: res.data.verifyLink }
                          : { ok: false, error: PrepApi.err(res, 'It could not be sent again.') });
  },

  /** POST /api/auth/forgot — always returns ok, so it never reveals which emails exist */
  forgot(email) {
    return PrepApi.post('/api/auth/forgot', { email })
      .then(res => res.ok ? { ok: true, resetLink: res.data.resetLink }
                          : { ok: false, error: PrepApi.err(res, 'The request could not be sent.') });
  },

  /** POST /api/auth/reset — reset the password using the token from the email */
  reset(token, password) {
    return PrepApi.post('/api/auth/reset', { token, password })
      .then(res => res.ok ? { ok: true } : { ok: false, error: PrepApi.err(res, 'The password could not be reset.') });
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
