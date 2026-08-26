/**
 * Checkout, and the two ways a gateway tells us what happened.
 *
 * The signing lives in server/payments.js; this file is the order lifecycle
 * around it and the rules that decide when a code is issued.
 *
 * ## Three routes, and only one of them settles anything
 *
 *   POST /api/checkout          the buyer asks to pay; an order is created
 *                               pending and the buyer is sent to the gateway
 *   GET  /payments/:p/return    the buyer's BROWSER comes back
 *   .../ipn                     the gateway's SERVER tells us the outcome
 *
 * The return URL is a claim made by whoever is holding the browser: the
 * parameters are visible in the address bar and can be typed by hand. It
 * decides what the buyer is shown and nothing else. **Only the IPN settles an
 * order**, and only once its HMAC verifies. Treating the redirect as proof of
 * payment is the classic way to give a product away.
 *
 * ## Why these two write routes have no CSRF token
 *
 * A gateway cannot hold a session or a cookie, so `csrfGuard` is impossible on
 * an IPN. What stands in its place is `gatewaySigned`, which recomputes the
 * HMAC over the fields with the shared secret and refuses anything that does
 * not match — a guard a forged browser request cannot pass, which is more than
 * a CSRF token proves. It is a named middleware precisely so that
 * `scripts/security-map.mjs` reads it out of the Express stack and prints it in
 * the table in docs/SECURITY.md, rather than the route appearing to be naked.
 *
 * Nothing in an IPN is trusted beyond that signature: the order must exist, its
 * amount must match to the dong, and settling twice issues one code. A gateway
 * retries until it is acknowledged, so a duplicate is ordinary traffic.
 */
'use strict';

const express = require('express');
const { asyncRoutes } = require('./async-route');
const { q, tx, nowISO, makeCode } = require('./db');
const A = require('./auth');
const payments = require('./payments');
const analytics = require('./analytics');
const PLANS = require('./data/plans');

const router = asyncRoutes(express.Router());

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 200) : '');
const bad = (res, msg) => res.status(400).json({ error: msg });

/* A buyer who cannot pay tries again; a script creating pending orders in a
   loop is something else. Generous enough that nobody real meets it. */
const CHECKOUT_PER_HOUR = Math.max(1, parseInt(process.env.CHECKOUT_PER_HOUR, 10) || 20);
/* The VNPay IPN is a GET, by their specification, so it sits outside the global
   write limit — which only covers unsafe methods. This puts one back. */
const IPN_PER_MIN = Math.max(1, parseInt(process.env.IPN_PER_MIN, 10) || 120);

/* ------------------------------------------------------------------ *
 * Checkout
 * ------------------------------------------------------------------ */

/** Which gateways a buyer can be sent to. Empty is a valid answer. */
router.get('/api/checkout/providers', (req, res) => {
  res.set('Cache-Control', 'no-store')
    .json({ enabled: payments.enabled(), providers: payments.available() });
});

/* express.json() per route rather than router-wide: the VNPay IPN is a GET and
   the MoMo IPN brings its own parser below, so a blanket one would be parsing
   for routes that never carry a body. It has to be here, though — without it
   `req.body` is undefined, every plan id reads as empty, and checkout answers
   "choose one of the plans on offer" to a request that named one. Which is
   exactly what it did until the buy screen was built and asked it properly:
   the API test only ever exercised the signed-out path, and a 401 is decided
   before a body is read. */
router.post('/api/checkout', express.json({ limit: '16kb' }), A.requireUser, A.csrfGuard, async (req, res) => {
  const b = req.body || {};
  const plan = PLANS.byId(str(b.planId, 40));
  if (!plan) return bad(res, 'Choose one of the plans on offer.');

  const driver = payments.driver(str(b.provider, 20));
  if (!driver) {
    /* Fully built and switched off, like every other keyed feature here. The
       buy screen keeps telling people to ask their centre for a code. */
    return res.status(503).json({
      error: 'Online payment is not switched on yet. Ask your centre for an activation code.',
      providers: payments.available()
    });
  }

  const wait = await A.rateLimit('checkout:u' + req.user.id, CHECKOUT_PER_HOUR, 3600 * 1000);
  if (wait) {
    return res.status(429).json({ error: 'Too many payment attempts. Try again in ' + Math.ceil(wait / 60) + ' minutes.' });
  }

  const at = nowISO();
  await q.run(
    `INSERT INTO orders (user_id, package_id, name, amount, status, provider, created_at)
     VALUES (?,?,?,?,'pending',?,?)`,
    req.user.id, plan.id, plan.name, plan.price, driver.id, at);
  const orderId = await q.val('SELECT id FROM orders ORDER BY id DESC LIMIT 1');
  /* The reference is minted after the row exists so it can carry the order id,
     and stored before the buyer leaves, so a notification arriving while they
     are still on the gateway's page finds something to match. */
  const ref = payments.newRef(orderId);
  await q.run('UPDATE orders SET ref=? WHERE id=?', ref, orderId);

  let payUrl;
  try {
    const started = await driver.start({
      ref,
      amount: plan.price,
      description: `VPET Prep ${plan.name}`,
      ip: req.ip
    });
    payUrl = started.payUrl;
  } catch (e) {
    await q.run("UPDATE orders SET status='failed' WHERE id=?", orderId);
    /* The gateway's own words, which are safe: a refusal names a bad amount or
       an unknown partner code, never the secret, which is only an HMAC key. */
    return res.status(502).json({ error: 'The payment gateway refused the request. ' + (e.message || '') });
  }

  analytics.track(req, 'checkout_start', { plan_id: plan.id, provider: driver.id });
  res.status(201).json({ orderId, ref, provider: driver.id, amount: plan.price, payUrl });
});

/* ------------------------------------------------------------------ *
 * What the gateway says
 * ------------------------------------------------------------------ */

/**
 * Verify the HMAC and hang the result on the request.
 *
 * Named, and not an arrow, because `scripts/security-map.mjs` reads guard names
 * out of the Express stack: an anonymous function here would make the IPN look
 * like an unguarded write in docs/SECURITY.md.
 */
function gatewaySigned(req, res, next) {
  const driver = payments.driver(req.params.provider);
  if (!driver) return res.status(404).json({ error: 'Unknown payment provider' });
  const params = req.method === 'GET' ? req.query : (req.body || {});
  const read = driver.read(params);
  if (!read.valid) {
    /* Said the same way for every kind of bad signature: which field was wrong
       is exactly what somebody forging one would like to be told. */
    const reply = driver.ipnReply('97', 'Invalid signature');
    return res.status(reply.status).json(reply.body || { error: 'Invalid signature' });
  }
  req.gateway = { driver, read };
  next();
}

/**
 * Apply a verified notification to the order it names.
 * Returns the code to answer with, in VNPay's vocabulary; MoMo ignores it.
 */
async function applyNotification(read, driverId) {
  const order = await q.get('SELECT * FROM orders WHERE ref=?', read.ref);
  if (!order) return { code: '01', message: 'Order not found' };
  if (order.provider && order.provider !== driverId) return { code: '01', message: 'Order not found' };
  /* To the dong. A gateway reporting a payment of ten thousand against a
     four-hundred-thousand order has not paid for the order. */
  if (Number(order.amount) !== Number(read.amount)) return { code: '04', message: 'Invalid amount' };
  /* Idempotent on purpose: a gateway retries until it is acknowledged, and the
     second delivery must not mint a second code. */
  if (order.status === 'paid') return { code: '02', message: 'Order already confirmed' };

  if (!read.settled) {
    await q.run("UPDATE orders SET status='failed', gateway_ref=? WHERE id=?", read.gatewayRef || null, order.id);
    return { code: '00', message: 'Confirm Success' };
  }

  const plan = PLANS.byId(order.package_id);
  if (!plan) return { code: '99', message: 'Order has no plan' };

  const at = nowISO();
  await tx(async () => {
    let code = makeCode();
    while (await q.val('SELECT 1 FROM codes WHERE code=?', code)) code = makeCode();
    /* Issued unused and unassigned: buying is not activating. The buyer
       redeems it like any other code, which is what starts their term — and
       which means a code bought as a gift still works.
     *
       It does carry a deadline to start, though. Until now this went in with
       expires_at NULL — a code good forever — while the published policy is
       that a bought code lapses if it is not activated within
       PLANS.ACTIVATION_DAYS. A promise on a page that the INSERT does not keep
       is the sort of gap that only shows up in an argument with a customer, so
       the date is stamped here rather than left to be enforced by hand. */
    const lapses = new Date(Date.parse(at) + PLANS.ACTIVATION_DAYS * 86400e3).toISOString();
    await q.run(
      `INSERT INTO codes (code, batch_id, unlock_type, unlock_ref, plan_id, status,
                          expires_at, user_id, redeemed_at, note, created_at)
       VALUES (?, NULL, 'family', 'vpet', ?, 'unused', ?, NULL, NULL, ?, ?)`,
      code, plan.id, lapses, `Bought online, order ${order.id}`, at);
    const codeId = await q.val('SELECT id FROM codes WHERE code=?', code);
    await q.run("UPDATE orders SET status='paid', paid_at=?, gateway_ref=?, code_id=? WHERE id=?",
      at, read.gatewayRef || null, codeId, order.id);
  });
  return { code: '00', message: 'Confirm Success' };
}

/* The IPN is where money becomes a code, so it is logged either way — a
   payment nobody can account for later is worse than a noisy log. Never the
   signature and never the raw body. */
function logNotification(driverId, read, outcome) {
  console.log(`[payments] ${driverId} ipn ref=${read.ref || '-'} settled=${read.settled} `
    + `amount=${read.amount} → ${outcome.code} ${outcome.message}`);
}

/** VNPay sends its IPN as a GET, so this route mutates on a safe method. */
router.get('/payments/:provider/ipn', async (req, res, next) => {
  const wait = await A.rateLimit('ipn:' + (req.ip || 'unknown'), IPN_PER_MIN, 60 * 1000);
  if (wait) return res.status(429).json({ RspCode: '99', Message: 'Slow down' });
  next();
}, gatewaySigned, async (req, res) => {
  const { driver, read } = req.gateway;
  const outcome = await applyNotification(read, driver.id);
  logNotification(driver.id, read, outcome);
  const reply = driver.ipnReply(outcome.code, outcome.message);
  if (reply.body === null) return res.status(reply.status).end();
  res.status(reply.status).json(reply.body);
});

/** MoMo posts JSON. */
router.post('/payments/:provider/ipn', express.json({ limit: '64kb' }), gatewaySigned, async (req, res) => {
  const { driver, read } = req.gateway;
  const outcome = await applyNotification(read, driver.id);
  logNotification(driver.id, read, outcome);
  const reply = driver.ipnReply(outcome.code, outcome.message);
  if (reply.body === null) return res.status(reply.status).end();
  res.status(reply.status).json(reply.body);
});

/**
 * The buyer's browser, coming back.
 *
 * Deliberately does not settle anything and deliberately does not trust the
 * result it was handed: it reads the order out of the database and shows the
 * buyer where that has got to. If the IPN has not landed yet the honest answer
 * is "we are confirming this", which is also true.
 */
router.get('/payments/:provider/return', async (req, res) => {
  const driver = payments.driver(req.params.provider);
  if (!driver) return res.redirect(302, '/prep/mua-code/');
  const read = driver.read(req.query || {});
  const order = read.ref ? await q.get('SELECT * FROM orders WHERE ref=?', read.ref) : null;
  /* The signature still decides whether we believe the reference at all — an
     unsigned return is somebody typing in the address bar. */
  const status = !read.valid ? 'unknown' : (order ? order.status : 'unknown');
  res.redirect(302, '/prep/code-cua-toi/?order=' + encodeURIComponent(read.ref || '')
    + '&status=' + encodeURIComponent(status));
});

module.exports = router;
module.exports.applyNotification = applyNotification;
