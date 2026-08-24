/**
 * Read the Express stack directly to build the table: endpoint → guards → write limit.
 *
 * Why read the stack rather than the source: only the stack knows what ACTUALLY
 * runs. `router.use('/admin', requireAdmin, csrfGuard)` wraps every route
 * registered AFTER it and none of the three registered before — reading the file
 * makes it very easy to conclude the opposite; the stack order cannot lie.
 *
 * This table feeds `scripts/test-security.mjs` and docs/SECURITY.md.
 */
import { createRequire } from 'node:module';

const SAFE = ['get', 'head', 'options'];

/* Write to a throwaway database: loading the routers loads server/db.js too, and
   a test must not touch data/. The caller may set PREP_DB beforehand. */
export function loadRouters(require_) {
  return [
    { mount: '', file: 'server/google-auth.js', router: require_('../server/google-auth.js').router },
    { mount: '', file: 'server/payment-api.js', router: require_('../server/payment-api.js') },
    { mount: '/api', file: 'server/user-api.js', router: require_('../server/user-api.js') },
    { mount: '/api', file: 'server/exam-api.js', router: require_('../server/exam-api.js') },
    { mount: '/api', file: 'server/api.js', router: require_('../server/api.js') }
  ];
}

/* Express turns a router.use() path prefix into a regexp. Recover the original
   string to match against route paths, because the table has to be readable. */
function prefixOf(layer) {
  const src = String(layer.regexp);
  if (src === '/^\\/?(?=\\/|$)/i') return '/';
  const m = src.match(/^\/\^((?:\\\/[A-Za-z0-9_.-]+)+)/);
  return m ? m[1].replace(/\\\//g, '/') : null;
}

const GUARDS = new Set(['requireAdmin', 'requireUser', 'requireOwner', 'requireCap', 'csrfGuard', 'gatewaySigned']);

/* A capability guard is rendered with the capability it demands, not merely as
   `requireCap`. Every one of them is the same function name by design — see the
   note in server/roles.js — so a table that printed only the name would say
   "guarded" fifty-five times and answer nobody's actual question, which is
   WHICH level may call this. The capability rides on `.cap`. */
const guardName = h => (h.name === 'requireCap' && h.cap) ? `requireCap(${h.cap})` : h.name;

/** Every route of every router, with the guards that really run before it. */
export function routeTable(require_ = createRequire(import.meta.url)) {
  const rows = [];

  for (const { mount, file, router } of loadRouters(require_)) {
    /* Guards attached by router.use() accumulate in registration order, so walk
       the stack once from the top, carrying what has been wrapped so far. */
    const inherited = [];

    for (const layer of router.stack) {
      if (!layer.route) {
        const name = layer.handle && layer.handle.name;
        if (GUARDS.has(name)) {
          const prefix = prefixOf(layer);
          if (prefix) inherited.push({ prefix, name });
        }
        continue;
      }

      const path = layer.route.path;
      const full = (mount + path) || '/';
      const own = layer.route.stack
        .map(s => s.handle)
        .filter(h => h && GUARDS.has(h.name))
        .map(guardName);
      const from = inherited
        .filter(g => g.prefix === '/' || path === g.prefix || path.startsWith(g.prefix + '/'))
        .map(g => g.name);
      const guards = [...new Set([...from, ...own])];

      for (const method of Object.keys(layer.route.methods)) {
        rows.push({
          method: method.toUpperCase(),
          path: full,
          file,
          guards,
          /* The global write limit lives in server.js, before every router, so it
             covers exactly the unsafe methods — not something readable out of a
             router's stack, but a consequence of where it is mounted. */
          writeLimited: !SAFE.includes(method),
          mutating: !SAFE.includes(method)
        });
      }
    }
  }

  rows.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return rows;
}

/* Routes authenticated by a shared-secret HMAC rather than by a session.
 *
 * A payment gateway cannot hold a cookie, so neither an auth guard nor
 * csrfGuard is possible on an IPN. `gatewaySigned` stands in for both: it
 * recomputes the HMAC over the fields with the secret the gateway and this
 * server share, and refuses anything that does not match. A browser cannot
 * forge one, which is more than a CSRF token proves.
 *
 * Declared here rather than exempted quietly, and checked in both directions —
 * a route that loses `gatewaySigned` fails, and an entry left behind after a
 * route is deleted fails too. */
export const SIGNED_WEBHOOKS = {
  'GET /payments/:provider/ipn': 'gatewaySigned; HMAC-SHA512 over the sorted query with the VNPay hash secret, then the order is matched on its reference and its amount',
  'POST /payments/:provider/ipn': 'gatewaySigned; HMAC-SHA256 over the documented field order with the MoMo secret key, then the order is matched on its reference and its amount'
};

/* GET routes that really do change state.
 *
 * The sweep treats GET, HEAD and OPTIONS as safe, which is what lets it say
 * "every mutating route is guarded" — so a GET that writes is invisible to it
 * and outside the global write limit, which only covers unsafe methods. There
 * is exactly one, it is not a choice, and it carries a rate limit of its own. */
export const MUTATING_GETS = {
  'GET /payments/:provider/ipn': 'VNPay specifies its IPN as a GET; guarded by gatewaySigned and rate limited by IPN_PER_MIN inside the handler, since the global write limit does not see it'
};

/* Eight write endpoints that cannot have an auth guard: they exist for people who
   are NOT signed in. Each must name what stands in for one, or this list is just
   somewhere to hide a mistake. Since 2026-08-12 all eight do have csrfGuard: the
   prep_csrf cookie is minted the moment an HTML page is served, so a guest holds a
   token too — no auth guard no longer implies no CSRF check either. */
export const PUBLIC_WRITES = {
  'POST /api/auth/register': 'csrfGuard; per-IP lockout, REGISTER_PER_HOUR, only a successful registration is charged',
  'POST /api/auth/login': 'csrfGuard; 15-minute lockout after 5 failures, per IP × username',
  'POST /api/admin/login': 'csrfGuard; 15-minute lockout after 5 failures, per IP × username',
  'POST /api/auth/forgot': 'csrfGuard; FORGOT_PER_HOUR per IP, and the same answer whether or not the email exists',
  'POST /api/auth/reset': 'csrfGuard; single-use token, hashed in the database, expires after 2 hours',
  'POST /api/auth/verify': 'csrfGuard; single-use token, hashed in the database, expires after 48 hours',
  'POST /api/auth/logout': 'csrfGuard; signing out when not signed in is harmless',
  'POST /api/admin/logout': 'csrfGuard; signing out when not signed in is harmless'
};

/** The markdown table for docs/SECURITY.md — generated, never hand-typed. */
export function markdownTable(rows) {
  const cell = s => String(s).replace(/\|/g, '\\|');
  const out = ['| Method | Endpoint | Guards | Write limit |', '|---|---|---|---|'];
  for (const r of rows) {
    out.push('| ' + [
      cell(r.method),
      '`' + cell(r.path) + '`',
      r.guards.length ? r.guards.map(g => '`' + g + '`').join(' + ') : '—',
      r.writeLimited ? 'yes' : 'n/a (read)'
    ].join(' | ') + ' |');
  }
  return out.join('\n');
}
