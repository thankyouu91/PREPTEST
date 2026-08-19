/**
 * Service worker — installability and a usable offline screen.
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

const CACHE = 'vpet-shell-v1';
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

  /* Static assets: serve from cache at once, refresh in the background. The
     page paints instantly offline and picks up the new file next load. */
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await network) ||
      new Response('', { status: 504, statusText: 'Offline' });
  })());
});
