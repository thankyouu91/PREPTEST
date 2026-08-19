/* ============================================================
   VPET Prep — shared chrome for the signed-in pages
   (sidebar desktop · topbar · bottom-nav mobile · dark mode ·
    tenant switcher white-label · toast)

   A page using the shell declares:
     <div id="app" data-active="home|library|learn|codes|progress|account">
       <main id="main"> ...content... </main>
     </div>
   then calls PrepChrome.mount({ title: 'Page title' }).
   ============================================================ */

const PrepChrome = {
  /* `feature` marks an entry that only opens from a given plan upwards. Without
     the entitlement the entry still shows — so people know the platform has it —
     but dimmed, padlocked and pointed at the price list rather than into a page
     the server will bounce them out of. */
  NAV: [
    { key: 'home',     label: 'Home',        icon: 'home',    href: '/prep/' },
    { key: 'library',  label: 'Library',     icon: 'library', href: '/prep/thu-vien/' },
    { key: 'learn',    label: 'Self-study',  icon: 'book',    href: '/prep/hoc/dong-tu-bat-quy-tac/',
      feature: 'selfStudy', lockedHref: '/prep/mua-code/?locked=self-study',
      lockedHint: 'Self-study opens from the Plus plan' },
    { key: 'codes',    label: 'My codes',    icon: 'ticket', href: '/prep/code-cua-toi/' },
    { key: 'progress', label: 'Progress',    icon: 'chart',   href: '/prep/#tien-do' },
    { key: 'account',  label: 'Profile',     icon: 'user',    href: '/prep/tai-khoan/' }
  ],

  /** Navigation entries with their locked state already resolved. */
  navItems() {
    return this.NAV.map(n => {
      const locked = !!n.feature && !PrepState.can(n.feature);
      return Object.assign({}, n, { locked, url: locked ? n.lockedHref : n.href });
    });
  },

  brandHTML(sizeCls) {
    return '<span class="inline-flex items-center justify-center rounded-xl text-white panel-brand shrink-0 ' + (sizeCls || 'w-10 h-10') + '">' +
      PREP.icon('cap', 'w-[58%] h-[58%]') + '</span>';
  },

  tenantName() {
    const t = PREP.tenants.find(x => x.id === PrepTheme.tenant());
    return t ? t.name : PREP.tenants[0].name;
  },

  mount(opts) {
    opts = opts || {};
    const app = PREP.qs('#app');
    const main = PREP.qs('#main');
    if (!app || !main) return;
    const active = app.getAttribute('data-active') || 'home';
    const user = PrepState.user() || { name: 'Student', email: '' };
    const initials = user.name.trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase() || 'HV';

    /* ---------- Sidebar (desktop) ---------- */
    const items = this.navItems();
    const nav = items.map(n =>
      '<a href="' + n.url + '" class="nav-item' + (n.locked ? ' is-locked' : '') + '" ' +
      (n.key === active ? 'aria-current="page" ' : '') +
      (n.locked ? 'aria-describedby="nav-lock-' + n.key + '" title="' + PREP.esc(n.lockedHint) + '"' : '') + '>' +
      PREP.icon(n.icon, 'w-5 h-5 shrink-0') + '<span>' + n.label + '</span>' +
      (n.locked
        ? '<span id="nav-lock-' + n.key + '" class="ms-auto shrink-0 text-muted">' +
            PREP.icon('lock', 'w-4 h-4') +
            '<span class="sr-only">' + PREP.esc(n.lockedHint) + '</span></span>'
        : '') +
      '</a>'
    ).join('');

    const aside =
      '<aside class="hidden lg:flex flex-col fixed inset-y-0 left-0 w-[268px] z-40 border-r border-line bg-card px-5 py-6" aria-label="Main navigation">' +
        '<a href="/prep/" class="flex items-center gap-3 px-1.5 mb-8">' +
          this.brandHTML('w-11 h-11') +
          '<span class="leading-tight"><span data-brand-name class="block font-extrabold tracking-tight text-[17px]">' + PREP.esc(this.tenantName()) + '</span>' +
          '<span class="block text-xs text-muted font-medium">Certificate mock tests</span></span>' +
        '</a>' +
        '<nav class="grid gap-1.5" aria-label="Menu">' + nav + '</nav>' +
        '<a href="/prep/nhap-code/" class="btn btn-soft btn-md mt-6 justify-start gap-3">' + PREP.icon('plus', 'w-5 h-5') + 'Enter an unlock code</a>' +
        '<div class="mt-auto pt-6 grid gap-4">' +
          /* Chuyển ngôn ngữ: /i18n.js tự bắt mọi nút [data-lang], kể cả nút
             được dựng bằng JS như ở đây, nên không cần nối sự kiện thêm. */
          '<span class="lang-switch w-full" role="group" aria-label="Language">' +
            '<button type="button" data-lang="vi" class="lang-opt flex-1">VI</button>' +
            '<button type="button" data-lang="en" class="lang-opt flex-1">EN</button>' +
          '</span>' +
          '<div class="flex items-center gap-2">' +
            '<button type="button" data-dark-toggle class="btn btn-ghost btn-sm flex-1" aria-label="Toggle dark mode"><span data-dark-icon></span><span data-dark-label>Dark mode</span></button>' +
            '<div class="relative">' +
              '<button type="button" data-tenant-btn class="btn btn-ghost btn-sm" aria-label="Switch tenant branding" aria-haspopup="true" aria-expanded="false">' + PREP.icon('palette', 'w-4 h-4') + '</button>' +
              '<div data-tenant-menu hidden class="absolute bottom-11 right-0 w-52 card p-2 z-50"></div>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center gap-3 border-t border-line pt-4 px-1">' +
            '<span class="w-10 h-10 rounded-full bg-brand-soft text-brand-strong font-bold text-sm inline-flex items-center justify-center">' + PREP.esc(initials) + '</span>' +
            '<span class="min-w-0 flex-1 leading-tight">' +
              '<span class="block text-sm font-bold truncate">' + PREP.esc(user.name) + '</span>' +
              '<span class="block text-xs text-muted truncate">' + PREP.esc(user.email) + '</span>' +
            '</span>' +
            '<button type="button" data-logout class="p-2 rounded-full text-muted hover:text-danger transition" aria-label="Sign out">' + PREP.icon('logout', 'w-5 h-5') + '</button>' +
          '</div>' +
        '</div>' +
      '</aside>';

    /* ---------- Topbar ---------- */
    const topbar =
      '<header class="sticky top-0 z-30 border-b border-line bg-[color:var(--color-surface)]/85 backdrop-blur-md">' +
        '<div class="flex items-center gap-3 h-16 px-4 sm:px-6 lg:px-10">' +
          '<a href="/prep/" class="lg:hidden flex items-center gap-2.5 mr-1">' + this.brandHTML('w-9 h-9') + '</a>' +
          '<h1 class="text-[17px] sm:text-lg font-extrabold tracking-tight truncate">' + PREP.esc(opts.title || '') + '</h1>' +
          '<div class="ml-auto flex items-center gap-2">' +
            '<a href="/prep/nhap-code/" class="btn btn-soft btn-sm hidden sm:inline-flex">' + PREP.icon('ticket', 'w-4 h-4') + 'Enter code</a>' +
            '<button type="button" data-dark-toggle class="p-2.5 rounded-full text-muted hover:text-ink transition" aria-label="Toggle dark mode"><span data-dark-icon></span></button>' +
            '<a href="/prep/tai-khoan/" class="w-9 h-9 rounded-full bg-brand-soft text-brand-strong font-bold text-[13px] inline-flex items-center justify-center" aria-label="Account">' + PREP.esc(initials) + '</a>' +
          '</div>' +
        '</div>' +
      '</header>';

    /* ---------- Bottom nav (mobile) ---------- */
    const bottom =
      '<nav class="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]" aria-label="Bottom navigation">' +
        '<div class="flex">' +
        items.map(n =>
          '<a href="' + n.url + '" class="bottom-item' + (n.locked ? ' is-locked' : '') + '" ' +
          (n.key === active ? 'aria-current="page" ' : '') +
          (n.locked ? 'title="' + PREP.esc(n.lockedHint) + '"' : '') + '>' +
          '<span class="relative">' + PREP.icon(n.icon, 'w-[22px] h-[22px]') +
            (n.locked
              ? '<span class="lock-dot">' + PREP.icon('lock', 'w-2.5 h-2.5') +
                '<span class="sr-only">' + PREP.esc(n.lockedHint) + '</span></span>'
              : '') +
          '</span><span>' + n.label + '</span></a>'
        ).join('') +
        '</div>' +
      '</nav>';

    app.insertAdjacentHTML('afterbegin', aside);
    app.insertAdjacentHTML('beforeend', bottom);
    main.insertAdjacentHTML('afterbegin', topbar);
    main.classList.add('lg:pl-[268px]', 'pb-24', 'lg:pb-12', 'min-h-[100dvh]');

    /* ---------- Behaviour ---------- */
    this.syncDarkUI();
    PREP.qsa('[data-dark-toggle]').forEach(b => b.addEventListener('click', () => {
      PrepTheme.toggleDark();
      this.syncDarkUI();
    }));
    PREP.qsa('[data-logout]').forEach(b => b.addEventListener('click', () => PrepAuth.logout()));

    /* Tenant switcher (white-label demo) */
    const tBtn = PREP.qs('[data-tenant-btn]');
    const tMenu = PREP.qs('[data-tenant-menu]');
    if (tBtn && tMenu) {
      const render = () => {
        tMenu.innerHTML = '<p class="px-2.5 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Branding (demo)</p>' +
          PREP.tenants.map(t =>
            '<button type="button" data-tenant-opt="' + t.id + '" class="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-brand-soft transition text-left">' +
              '<span class="w-2.5 h-2.5 rounded-full ' + (PrepTheme.tenant() === t.id ? 'bg-accent' : 'bg-line') + '"></span>' + PREP.esc(t.name) +
            '</button>').join('');
        PREP.qsa('[data-tenant-opt]', tMenu).forEach(o => o.addEventListener('click', () => {
          PrepTheme.setTenant(o.getAttribute('data-tenant-opt'));
          render();
        }));
      };
      render();
      tBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = tMenu.hasAttribute('hidden');
        if (open) tMenu.removeAttribute('hidden'); else tMenu.setAttribute('hidden', '');
        tBtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', e => {
        if (!tMenu.contains(e.target) && e.target !== tBtn) { tMenu.setAttribute('hidden', ''); tBtn.setAttribute('aria-expanded', 'false'); }
      });
      document.addEventListener('prep:tenant', () => {
        PREP.qsa('[data-brand-name]').forEach(el => { el.textContent = this.tenantName(); });
      });
    }
  },

  syncDarkUI() {
    const dark = PrepTheme.isDark();
    PREP.qsa('[data-dark-icon]').forEach(el => { el.innerHTML = PREP.icon(dark ? 'sun' : 'moon', 'w-5 h-5'); });
    PREP.qsa('[data-dark-label]').forEach(el => { el.textContent = dark ? 'Light mode' : 'Dark mode'; });
  },

  /* Small shared toast */
  toast(msg, type) {
    let holder = PREP.qs('#toast-holder');
    if (!holder) {
      holder = document.createElement('div');
      holder.id = 'toast-holder';
      holder.className = 'fixed bottom-24 lg:bottom-8 inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none';
      document.body.appendChild(holder);
    }
    const t = document.createElement('div');
    t.className = 'card px-4 py-2.5 text-sm font-semibold shadow-soft-lg flex items-center gap-2 rise';
    t.innerHTML = (type === 'error'
      ? '<span class="text-danger">' + PREP.icon('alert', 'w-5 h-5') + '</span>'
      : '<span class="text-accent-strong">' + PREP.icon('check', 'w-5 h-5') + '</span>') + PREP.esc(msg);
    holder.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2400);
    setTimeout(() => t.remove(), 2900);
  }
};
