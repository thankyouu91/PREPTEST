/**
 * Payments: the signatures, and the rules that decide when a code is issued.
 *
 * Run with the server up: node scripts/test-payments.mjs
 *
 * The signing halves are checked against raw strings **written out by hand from
 * each gateway's documentation** and HMAC'd with `node:crypto` right here. That
 * is the whole point: calling `payments.vnpaySign()` and comparing it with
 * `payments.vnpaySign()` proves nothing at all, and a signature that is wrong
 * in a way both sides agree on is exactly the bug that only shows up on the day
 * real money is involved.
 *
 * The lifecycle half then plays a gateway: it signs notifications the way VNPay
 * and MoMo do, posts them at the real endpoints, and checks what happens to the
 * order and to the code. Including the ones that must NOT happen — a tampered
 * amount, a replayed notification, a reference that is not ours.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

/* Set before any module that reaches the database is required. The settlement
   section below writes real orders and mints real codes, and a `paid` row in
   the development database would turn up in the admin revenue figure — test
   data quietly becoming a number somebody reads. The HTTP checks still go to
   the running server on its own database; they only read. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pay-test-'));
process.env.PREP_DB = path.join(tmp, 'throwaway.sqlite');

const require_ = createRequire(import.meta.url);
const payments = require_('../server/payments.js');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/* Keys that exist only inside this file. Sandbox-shaped, worth nothing. */
const VNPAY = { tmn: 'VPETTEST', secret: 'VNPAYSANDBOXSECRET0123456789' };
const MOMO = { partner: 'MOMOTEST', access: 'accesskey-test', secret: 'momo-secret-key-test' };

async function withEnv(vars, fn) {
  const before = new Map(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  try { return await fn(); }
  finally {
    for (const [k, v] of before) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}
const KEYS = {
  VNPAY_TMN_CODE: VNPAY.tmn, VNPAY_HASH_SECRET: VNPAY.secret,
  MOMO_PARTNER_CODE: MOMO.partner, MOMO_ACCESS_KEY: MOMO.access, MOMO_SECRET_KEY: MOMO.secret
};
const NO_KEYS = {
  VNPAY_TMN_CODE: undefined, VNPAY_HASH_SECRET: undefined,
  MOMO_PARTNER_CODE: undefined, MOMO_ACCESS_KEY: undefined, MOMO_SECRET_KEY: undefined
};

/** Unique per run, so re-running never collides with an account left behind. */
const stamp = String(process.hrtime.bigint()).slice(-9);

const sha512 = (key, data) => crypto.createHmac('sha512', key).update(data, 'utf8').digest('hex');
const sha256 = (key, data) => crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');

try {
  /* ============ 1. Switched off without keys ============ */
  head('Off until somebody sets the keys');

  await withEnv(NO_KEYS, () => {
    ok(payments.enabled() === false, 'With no keys, no gateway is on');
    ok(payments.available().length === 0, 'and none is offered to a buyer');
    ok(payments.driver('vnpay') === null, 'Asking for one by name gets nothing rather than a broken one');
    ok(payments.driver('momo') === null, 'the same for the other');
  });

  await withEnv(Object.assign({}, NO_KEYS, { VNPAY_TMN_CODE: VNPAY.tmn }), () => {
    ok(payments.driver('vnpay') === null,
      'A merchant code with no hash secret is still off — half a credential signs nothing');
  });

  await withEnv(KEYS, () => {
    ok(payments.available().map(p => p.id).sort().join(',') === 'momo,vnpay',
      'With both sets of keys, both are offered',
      JSON.stringify(payments.available()));
    ok(payments.driver('VNPay') !== null, 'The provider name is read case-insensitively');
    ok(payments.driver('paypal') === null, 'and an unknown one is refused');
  });

  /* ============ 2. VNPay's signature ============ */
  head('The VNPay signature');

  await withEnv(KEYS, () => {
    /* Sorted by key, URL-encoded, joined — written out here by hand so the two
       sides of the comparison were produced by different code. */
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY.tmn,
      vnp_Amount: '49900000',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: 'VPET7T20260812',
      vnp_OrderInfo: 'VPET Prep Starter',
      vnp_Locale: 'vn'
    };
    const byHand = 'vnp_Amount=49900000&vnp_Command=pay&vnp_CurrCode=VND&vnp_Locale=vn'
      + '&vnp_OrderInfo=VPET+Prep+Starter&vnp_TmnCode=VPETTEST&vnp_TxnRef=VPET7T20260812'
      + '&vnp_Version=2.1.0';
    ok(payments.vnpaySignData(params) === byHand,
      'The signed string is every parameter, sorted by name and URL-encoded',
      payments.vnpaySignData(params));
    /* Spaces as +, not %20. VNPay signs what URLSearchParams produces, and
       getting this wrong is a signature that never verifies and no clue why. */
    ok(byHand.includes('VPET+Prep+Starter'), 'with spaces encoded as +, which is what VNPay signs');

    ok(payments.vnpaySign(params, VNPAY.secret) === sha512(VNPAY.secret, byHand),
      'and the signature is HMAC-SHA512 of exactly that string');

    const empty = payments.vnpaySignData(Object.assign({ vnp_BankCode: '' }, params));
    ok(!empty.includes('vnp_BankCode'), 'An empty value is left out of the signature entirely');
    const withHash = payments.vnpaySignData(Object.assign({
      vnp_SecureHash: 'deadbeef', vnp_SecureHashType: 'HMACSHA512'
    }, params));
    ok(withHash === byHand, 'and the hash fields do not sign themselves');

    const signed = Object.assign({}, params, { vnp_SecureHash: payments.vnpaySign(params, VNPAY.secret) });
    ok(payments.vnpayVerify(signed, VNPAY.secret), 'A correctly signed set verifies');
    ok(!payments.vnpayVerify(Object.assign({}, signed, { vnp_Amount: '100' }), VNPAY.secret),
      'Changing the amount breaks it');
    ok(!payments.vnpayVerify(Object.assign({}, signed, { vnp_TxnRef: 'someone-elses' }), VNPAY.secret),
      'so does changing the reference');
    ok(!payments.vnpayVerify(Object.assign({}, signed, { vnp_Extra: 'added' }), VNPAY.secret),
      'and so does slipping an extra parameter in');
    ok(!payments.vnpayVerify(params, VNPAY.secret), 'No signature at all does not verify');
    ok(!payments.vnpayVerify(signed, 'the-wrong-secret'), 'and neither does the wrong secret');

    ok(payments.vnpayStamp(new Date('2026-08-12T03:04:05Z')) === '20260812100405',
      'Timestamps are Vietnam local time, yyyyMMddHHmmss',
      payments.vnpayStamp(new Date('2026-08-12T03:04:05Z')));
  });

  await withEnv(KEYS, async () => {
    const started = await payments.driver('vnpay').start(
      { ref: 'VPET9T1', amount: 499000, description: 'VPET Prep Starter', ip: '203.0.113.9' },
      { now: new Date('2026-08-12T03:00:00Z') });
    const url = new URL(started.payUrl);
    ok(url.searchParams.get('vnp_Amount') === '49900000',
      'The amount is multiplied by 100: VNPay counts in the smallest unit, and sending '
      + 'the plain figure charges a hundredth of it', url.searchParams.get('vnp_Amount'));
    ok(url.searchParams.get('vnp_TxnRef') === 'VPET9T1', 'The reference goes out as ours');
    ok(url.searchParams.get('vnp_ReturnUrl').endsWith('/payments/vnpay/return'), 'with our return URL');
    ok(url.searchParams.get('vnp_ExpireDate') === '20260812101500', 'and a fifteen-minute expiry',
      url.searchParams.get('vnp_ExpireDate'));
    const back = {};
    for (const [k, v] of url.searchParams) back[k] = v;
    ok(payments.vnpayVerify(back, VNPAY.secret), 'The URL we hand the buyer verifies against itself');
    ok(!started.payUrl.includes(VNPAY.secret), 'and the hash secret is not in it');
  });

  /* ============ 3. MoMo's signature ============ */
  head('The MoMo signature');

  await withEnv(KEYS, () => {
    /* MoMo does not sort. The field order is fixed by its documentation, and a
       different order is a different signature — so the raw string is spelled
       out here rather than generated the same way twice. */
    const f = {
      amount: '499000', extraData: '', ipnUrl: 'https://x.test/payments/momo/ipn',
      orderId: 'VPET7T1', orderInfo: 'VPET Prep Starter', partnerCode: MOMO.partner,
      redirectUrl: 'https://x.test/payments/momo/return', requestId: 'VPET7T1',
      requestType: 'captureWallet'
    };
    const byHand = 'accessKey=accesskey-test&amount=499000&extraData='
      + '&ipnUrl=https://x.test/payments/momo/ipn&orderId=VPET7T1&orderInfo=VPET Prep Starter'
      + '&partnerCode=MOMOTEST&redirectUrl=https://x.test/payments/momo/return'
      + '&requestId=VPET7T1&requestType=captureWallet';
    ok(payments.momoCreateSignData(f, MOMO.access) === byHand,
      'The create signature is the documented field order, not sorted and not encoded',
      payments.momoCreateSignData(f, MOMO.access));

    const ipn = {
      amount: '499000', extraData: '', message: 'Successful.', orderId: 'VPET7T1',
      orderInfo: 'VPET Prep Starter', orderType: 'momo_wallet', partnerCode: MOMO.partner,
      payType: 'qr', requestId: 'VPET7T1', responseTime: '1786500000000',
      resultCode: '0', transId: '2468013579'
    };
    const ipnByHand = 'accessKey=accesskey-test&amount=499000&extraData=&message=Successful.'
      + '&orderId=VPET7T1&orderInfo=VPET Prep Starter&orderType=momo_wallet'
      + '&partnerCode=MOMOTEST&payType=qr&requestId=VPET7T1&responseTime=1786500000000'
      + '&resultCode=0&transId=2468013579';
    ok(payments.momoIpnSignData(ipn, MOMO.access) === ipnByHand,
      'and the notification signature is a DIFFERENT documented order, which is why they are two literals',
      payments.momoIpnSignData(ipn, MOMO.access));

    const signed = Object.assign({}, ipn, { signature: sha256(MOMO.secret, ipnByHand) });
    const read = payments.driver('momo').read(signed);
    ok(read.valid, 'A notification signed as MoMo signs it verifies');
    ok(read.settled === true, 'resultCode 0 is a payment');
    ok(read.amount === 499000 && read.ref === 'VPET7T1', 'and the amount and reference come back',
      JSON.stringify({ amount: read.amount, ref: read.ref }));

    ok(!payments.driver('momo').read(Object.assign({}, signed, { amount: '1000' })).valid,
      'Changing the amount breaks it');
    ok(!payments.driver('momo').read(Object.assign({}, signed, { signature: 'x'.repeat(64) })).valid,
      'A signature of the right length but the wrong value fails');
    ok(!payments.driver('momo').read(Object.assign({}, ipn)).valid, 'and no signature fails');

    /* 9000 is "authorised, not captured" — it looks like success in a dashboard
       and is not money in the account. */
    const authorised = Object.assign({}, ipn, { resultCode: '9000' });
    authorised.signature = sha256(MOMO.secret, payments.momoIpnSignData(authorised, MOMO.access));
    const authRead = payments.driver('momo').read(authorised);
    ok(authRead.valid && authRead.settled === false,
      'resultCode 9000 verifies but is NOT settled: authorised is not captured');
  });

  /* ============ 4. The endpoints, playing gateway ============ */
  head('An IPN against the running server');

  /* The server under test was started by verify.sh without payment keys, so
     these routes answer as a disabled gateway. That IS the shipped default and
     it is worth pinning; the settlement rules are checked directly against the
     module below, where the keys can be turned on. */
  {
    const res = await fetch(BASE + '/api/checkout/providers');
    const data = await res.json();
    ok(res.status === 200, 'The provider list is readable without signing in', String(res.status));
    ok(data.enabled === false && data.providers.length === 0,
      'and with no keys it honestly says there is nothing to pay with', JSON.stringify(data));
  }

  {
    const res = await fetch(BASE + '/payments/vnpay/ipn?vnp_TxnRef=nope&vnp_SecureHash=00');
    ok(res.status === 404, 'An IPN for a provider with no keys is not a route that half-works',
      String(res.status));
  }

  {
    const res = await fetch(BASE + '/payments/nosuch/ipn');
    ok(res.status === 404, 'and an unknown provider is a 404', String(res.status));
  }

  {
    /* Checkout is behind requireUser: no session, no order. */
    const res = await fetch(BASE + '/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'starter-3m', provider: 'vnpay' })
    });
    ok(res.status === 401 || res.status === 403,
      'Checkout refuses a caller with no session', String(res.status));
  }

  /* ============ 5. What settles an order, and what must not ============ */
  head('The settlement rules');

  const { q } = require_('../server/db.js');
  const paymentApi = require_('../server/payment-api.js');

  /** An order sitting pending, as checkout would have left it. */
  async function pendingOrder(amount) {
    const ref = payments.newRef(Math.floor(Math.random() * 1e6));
    await q.run(
      `INSERT INTO orders (user_id, package_id, name, amount, status, provider, created_at)
       VALUES (NULL, 'starter-3m', 'Starter', ?, 'pending', 'vnpay', ?)`,
      amount, new Date().toISOString());
    const id = await q.val('SELECT id FROM orders ORDER BY id DESC LIMIT 1');
    await q.run('UPDATE orders SET ref=? WHERE id=?', ref, id);
    return { id, ref };
  }
  const orderRow = id => q.get('SELECT * FROM orders WHERE id=?', id);
  const codesFor = id => q.val('SELECT COUNT(*) c FROM codes WHERE note=?', 'Bought online, order ' + id);

  await withEnv(KEYS, async () => {
    {
      const order = await pendingOrder(499000);
      const first = await paymentApi.applyNotification(
        { valid: true, ref: order.ref, amount: 499000, settled: true, gatewayRef: 'TX1' }, 'vnpay');
      ok(first.code === '00', 'A matching, settled notification confirms the order', JSON.stringify(first));
      const row = await orderRow(order.id);
      ok(row.status === 'paid' && !!row.paid_at, 'The order is paid and stamped', row.status);
      ok(row.gateway_ref === 'TX1', 'and remembers the gateway\'s own reference');
      ok(await codesFor(order.id) === 1, 'exactly one code is issued', String(await codesFor(order.id)));
      const code = await q.get('SELECT * FROM codes WHERE id=?', row.code_id);
      ok(code && code.plan_id === 'starter-3m', 'for the plan that was bought', code && code.plan_id);
      ok(code.status === 'unused' && code.user_id === null,
        'and it is issued unused: buying is not activating, so a code bought as a gift still works');

      /* A gateway retries until it is acknowledged. The second delivery is
         ordinary traffic and must be free. */
      const again = await paymentApi.applyNotification(
        { valid: true, ref: order.ref, amount: 499000, settled: true, gatewayRef: 'TX1' }, 'vnpay');
      ok(again.code === '02', 'A repeat notification is answered "already confirmed"', again.code);
      ok(await codesFor(order.id) === 1, 'and does NOT mint a second code', String(await codesFor(order.id)));
    }

    {
      const order = await pendingOrder(499000);
      const out = await paymentApi.applyNotification(
        { valid: true, ref: order.ref, amount: 10000, settled: true, gatewayRef: 'TX2' }, 'vnpay');
      ok(out.code === '04', 'A payment for the wrong amount is refused', JSON.stringify(out));
      ok((await orderRow(order.id)).status === 'pending', 'the order stays pending');
      ok(await codesFor(order.id) === 0, 'and no code is issued', String(await codesFor(order.id)));
    }

    {
      const out = await paymentApi.applyNotification(
        { valid: true, ref: 'VPET-not-ours', amount: 499000, settled: true }, 'vnpay');
      ok(out.code === '01', 'A reference we never issued is not an order', JSON.stringify(out));
    }

    {
      const order = await pendingOrder(499000);
      const out = await paymentApi.applyNotification(
        { valid: true, ref: order.ref, amount: 499000, settled: true }, 'momo');
      ok(out.code === '01',
        'A notification from the wrong provider does not settle an order placed with the other',
        JSON.stringify(out));
      ok(await codesFor(order.id) === 0, 'and issues nothing');
    }

    {
      const order = await pendingOrder(499000);
      const out = await paymentApi.applyNotification(
        { valid: true, ref: order.ref, amount: 499000, settled: false, gatewayRef: 'TX3' }, 'vnpay');
      ok(out.code === '00', 'A failed payment is acknowledged — the gateway is telling us, not asking');
      ok((await orderRow(order.id)).status === 'failed', 'the order is marked failed', (await orderRow(order.id)).status);
      ok(await codesFor(order.id) === 0, 'and no code is issued', String(await codesFor(order.id)));
    }
  });

  /* ============ 6. References ============ */
  head('Payment references');

  {
    const a = payments.newRef(7);
    const b = payments.newRef(7);
    ok(a !== b, 'Two attempts on the same order get different references — a gateway '
      + 'rejects a repeat of one it has seen', `${a} ${b}`);
    ok(a.includes('7'), 'and the reference carries the order id');
    ok(/^[A-Za-z0-9]+$/.test(a), 'It is plain alphanumeric, which both gateways require', a);
    ok(a.length <= 100, 'and inside VNPay\'s 100-character limit', String(a.length));
  }
  /* ============ 7. The buy screen, in a real browser ============ */
  head('The buy screen');

  {
    /* A second server, on its own port and its own database, with VNPay keys
       set — the gate's server deliberately has none, and the disabled state is
       checked above. VNPAY_PAY_URL points back at this server so pressing the
       button lands somewhere local instead of at Vietnam's sandbox: the
       redirect is the thing being tested, not the gateway. */
    const { spawn } = await import('node:child_process');
    const { launchChromium } = await import('./_browser.mjs');
    const { postWithCsrf } = await import('./_csrf.mjs');

    const PORT = 3411;
    const UI = `http://127.0.0.1:${PORT}`;
    const child = spawn(process.execPath, ['server.js'], {
      cwd: path.dirname(path.dirname(new URL(import.meta.url).pathname)),
      env: Object.assign({}, process.env, {
        PORT: String(PORT),
        PREP_DB: path.join(tmp, 'ui.sqlite'),
        REGISTER_PER_HOUR: '200',
        VNPAY_TMN_CODE: VNPAY.tmn,
        VNPAY_HASH_SECRET: VNPAY.secret,
        /* Not /prep/landing/: the server bounces a signed-in visitor off the
           guest pages to /prep/, so the query string would be lost and the
           navigation would land somewhere the assertion cannot read. */
        VNPAY_PAY_URL: `${UI}/prep/nhap-code/`,
        PUBLIC_BASE_URL: UI
      }),
      stdio: 'ignore'
    });

    let up = false;
    for (let i = 0; i < 40 && !up; i++) {
      try { up = (await fetch(UI + '/prep/landing/')).ok; }
      catch (e) { await new Promise(r => setTimeout(r, 250)); }
    }
    ok(up, 'A server with payment keys starts');

    /* try/finally around the whole section, not just the browser. An earlier
       version killed the child on the last line, so a failed assertion threw
       past it and left a server holding the port — and the NEXT run then talked
       to that stale process, still carrying the code the run was meant to be
       testing. Two green-looking reasons for a red run, neither of them true. */
    try {
    if (up) {
      const browser = await launchChromium({ args: ['--no-sandbox'] });
      try {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const errs = [];
        const page = await ctx.newPage();
        page.on('pageerror', e => errs.push(String(e.message)));

        const reg = await postWithCsrf(ctx, UI, '/api/auth/register', {
          name: 'Buyer', email: `buyer.${stamp}@thu-nghiem.vn`, password: 'Muahang123'
        });
        ok(reg.ok(), 'and a learner can register on it', String(reg.status()));

        await page.goto(UI + '/prep/mua-code/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(900);
        await page.click('[data-buy="starter-3m"]');
        await page.waitForTimeout(400);

        ok(await page.locator('#bm-pay').isVisible(),
          'With a gateway configured, the modal offers to take the payment');
        const buttons = await page.locator('#bm-providers button').count();
        ok(buttons === 1, 'one button per configured provider', String(buttons));
        const label = (await page.locator('#bm-providers button').first().innerText()).trim();
        ok(/VNPay/.test(label) && /499/.test(label),
          'naming the provider and the price', label);
        ok(/centre code works exactly the same way/.test(await page.locator('#bm-centre').innerText()),
          'and the centre route is reworded rather than removed');

        await page.click('#bm-providers button');
        await page.waitForURL('**/prep/nhap-code/**', { timeout: 15000 });
        const paid = new URL(page.url());
        ok(paid.searchParams.get('vnp_Amount') === '49900000',
          'Pressing it hands the browser to the gateway with the right amount',
          paid.searchParams.get('vnp_Amount'));
        ok(payments.vnpayVerify(Object.fromEntries(paid.searchParams), VNPAY.secret),
          'and the URL it went to carries a signature that verifies');

        const ref = paid.searchParams.get('vnp_TxnRef');
        const order = await (await fetch(`${UI}/api/checkout/providers`)).json();
        ok(order.enabled === true && order.providers.length === 1,
          'The provider list on that server reports the gateway', JSON.stringify(order));
        ok(/^VPET/.test(ref || ''), 'and the order reference went out as ours', ref);
        ok(errs.length === 0, 'No page error anywhere in the flow', errs.join(' | '));
      } finally {
        await browser.close();
      }
    }
    } finally {
      child.kill('SIGTERM');
    }
  }
} catch (e) {
  fail++;
  console.log('\n✗ The test itself threw:\n', e);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${fail === 0 ? '\x1b[32m✔' : '\x1b[31m✗'} ${pass} passed, ${fail} failed\x1b[0m`);
process.exit(fail === 0 ? 0 : 1);
