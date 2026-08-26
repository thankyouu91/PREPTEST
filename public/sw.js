/**
 * Service worker - installability and a usable offline screen.
 *
 * What it deliberately does NOT do is as important as what it does, because a
 * cache on a study platform is a place answers can leak from:
 *
 *   · /api/ is never touched. Exam items, correct answers, audio and session
 *     state all live there. A cached answer key on a shared phone would
 *     outlive the session that was allowed to see it.
 *   · HTML is never cached. Pages are behind server-side auth guards and are
 *     served no-store; caching one would hand the next person on the device a
 *     copy of a signed-in screen.
 *   · Only same-origin GETs are considered at all.
 *
 * What is cached is the shell that carries no user data: stylesheet, scripts,
 * fonts, icons, and one offline page to show when a navigation fails.
 *
 * Bumping CACHE retires every older cache on the next activation, so a deploy
 * never leaves a stale stylesheet behind.
 */
'use strict';

/* Bump this and every older cache is deleted on the next activation. It also
   changes this file's bytes, which is the only thing that makes a browser
   install a new worker at all — see the note on the fetch handler. */
const CACHE = 'vpet-shell-v2';
const OFFLINE_URL = '/prep/offline/';

/* Small on purpose. Anything missing is fetched normally and then cached on
   first use, so a typo here degrades to "not preloaded", never to a failed
   install that would leave the app without a worker at all. */
const PRECACHE = [
  OFFLINE_URL,
  '/tailwind-built.css',
  '/i18n.js',
  '/prep/_mock.js',
  '/prep/_chrome.js',
  '/favicon.svg',
  '/icons/icon-192.png'
];

const STATIC_EXTENSIONS = /\.(css|js|woff2?|svg|png|jpg|jpeg|webp|ico)$/i;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    /* Individually, not addAll: addAll rejects the whole install if a single
       entry 404s. */
    await Promise.all(PRECACHE.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;          // never cache, never intercept
  if (url.pathname.startsWith('/auth/')) return;         // OAuth round trip
  if (url.pathname.startsWith('/admin/')) return;        // admin screens stay online-only

  /* Navigations: always go to the network so auth guards and fresh content
     work as normal; fall back to the offline page only when the network is
     genuinely unavailable. */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch (e) {
        const cached = await caches.match(OFFLINE_URL);
        return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  if (!STATIC_EXTENSIONS.test(url.pathname)) return;

  /* ---- Two strategies, split by what the file IS ----
   *
   * This was one strategy for everything: serve the cache, refresh behind it,
   * "picks up the new file next load". That last clause is the bug. A worker is
   * only reinstalled when sw.js ITSELF changes, and deploying a fix to
   * _chrome.js or the stylesheet does not change sw.js — so nothing reprecaches,
   * and the cached copy is handed to the page while the new one is still in
   * flight. Every returning visitor runs the previous version of the CSS and
   * JS, once, on every deploy.
   *
   * It cost a real afternoon: a sidebar layout fix went out, was verified on the
   * server, and the person who reported it still saw the broken layout — because
   * their browser was being handed the _chrome.js from before the fix. There is
   * no way to tell that apart from "the fix did not work".
   *
   * So scripts and stylesheets go NETWORK FIRST, falling back to the cache when
   * the network is genuinely gone. This costs those files nothing in practice:
   * they are served `cache-control: max-age=0`, so a browser with no worker at
   * all would revalidate them on every load anyway. What the cache still buys
   * them is the thing it was added for — the site opens offline.
   *
   * Fonts, icons and images keep the old behaviour. They are big, they are
   * effectively immutable, and one load of a stale icon is not a broken page.
   */
  const mustBeFresh = /\.(css|js)$/i.test(url.pathname);

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNetwork = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (mustBeFresh) {
      return (await fromNetwork) || (await cache.match(req)) ||
        new Response('', { status: 504, statusText: 'Offline' });
    }
    return (await cache.match(req)) || (await fromNetwork) ||
      new Response('', { status: 504, statusText: 'Offline' });
  })());
});
