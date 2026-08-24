/**
 * Make Express 4 safe for async handlers.
 *
 * Express 4 predates promises: it calls a handler and moves on. If that handler
 * is `async` and rejects, nothing calls `next(err)` — the error handler never
 * runs, no response is ever written, and the request hangs until the client
 * gives up. There is no log line, because nobody caught anything. That is the
 * single worst failure mode of moving the data layer to promises, so it is
 * closed here once rather than with a try/catch in each of ~150 handlers.
 *
 * `asyncRoutes(app_or_router)` patches the registration methods so every
 * handler passed through them is wrapped. Two properties of the wrapper are
 * load-bearing:
 *
 *   · The name survives. scripts/security-map.mjs reads the Express stack and
 *     recognises a guard by `layer.handle.name` — an anonymous wrapper would
 *     erase `requireAdmin` from docs/SECURITY.md and from the test that
 *     regenerates it.
 *   · The arity survives, in the only way Express looks at it: a four-argument
 *     handler is an error handler, and wrapping it as three arguments would
 *     silently unregister it.
 *
 * Routers and sub-applications are functions too, and they carry the `.stack`
 * the security map walks. They are passed through untouched.
 */
'use strict';

const METHODS = ['use', 'all', 'get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

const rename = (fn, name) => Object.defineProperty(fn, 'name', { value: name, configurable: true });

function wrapHandler(fn) {
  if (typeof fn !== 'function') return fn;
  if (fn.stack || fn.handle) return fn;            // a router or a sub-app
  if (fn.__asyncWrapped) return fn;

  const wrapped = fn.length >= 4
    ? function (err, req, res, next) { return settle(() => fn.call(this, err, req, res, next), next); }
    : function (req, res, next) { return settle(() => fn.call(this, req, res, next), next); };

  wrapped.__asyncWrapped = true;
  /* And so does anything the handler carried on itself. The name was preserved
     from the start for the security map; `.cap` — which server/roles.js puts on
     a capability guard to say WHICH capability it demands — was invented later
     and was silently dropped here, so docs/SECURITY.md listed fifty-five routes
     as `requireCap` and answered nobody's real question. Copying the own
     properties fixes that one and the next one: a wrapper that keeps the name
     but eats every other annotation is a trap set for whoever adds the next
     annotation. */
  for (const k of Object.keys(fn)) {
    if (k !== '__asyncWrapped') wrapped[k] = fn[k];
  }
  return rename(wrapped, fn.name);
}

/* A handler may also throw synchronously before it ever returns a promise; both
   roads lead to next(err), so neither can leave the request hanging. */
function settle(call, next) {
  let out;
  try { out = call(); } catch (e) { next(e); return; }
  if (out && typeof out.then === 'function') out.then(undefined, next);
  return out;
}

function wrapArg(a) {
  if (Array.isArray(a)) return a.map(wrapHandler);
  return wrapHandler(a);
}

/** Patch an app or router in place; returns it, so it can wrap a constructor call. */
function asyncRoutes(target) {
  for (const method of METHODS) {
    const original = target[method];
    if (typeof original !== 'function') continue;
    target[method] = function (...args) { return original.apply(this, args.map(wrapArg)); };
  }
  return target;
}

module.exports = { asyncRoutes, wrapHandler };
