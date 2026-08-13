/**
 * Payment gateways: VNPay and MoMo, sandbox first.
 *
 * Same shape as server/storage.js and server/mail.js — one interface, a driver
 * per provider, each switched on only by its own keys and inert without them.
 * Live keys are the owner's call; nothing here invents one, and with none set
 * the buy screen keeps saying "ask your centre for a code", which is exactly
 * what it says today.
 *
 * ## The only part that really matters
 *
 * Both gateways authenticate with an HMAC over the request fields, and both
 * send the *result* of a payment to two different places:
 *
 *   · a **return URL**, which is the buyer's browser being redirected back, and
 *   · an **IPN**, which is the gateway's own server calling ours.
 *
 * The browser redirect is a claim made by whoever is holding the browser. It
 * decides what the buyer is shown and nothing else. **Only the IPN settles an
 * order**, and only after its signature verifies. Treating the return URL as
 * proof of payment is the classic way to give away a product for free: the
 * parameters are right there in the address bar.
 *
 * Everything arriving from outside is checked on content:
 *
 *   · the HMAC, recomputed here and compared in constant time;
 *   · the order exists, and is one of ours;
 *   · the amount matches what we asked for, to the dong — a gateway that says
 *     "paid" for 10,000 on a 499,000 order has not paid for the order;
 *   · settling twice issues one code, not two. A gateway retries an IPN until
 *     it gets an acknowledgement, so a duplicate is normal traffic, not an
 *     attack, and it must be free.
 */
'use strict';

const crypto = require('node:crypto');

/* Sandbox endpoints. Both providers use a different host for live, so the base
   is an environment variable rather than a constant to be edited under
   pressure on the day the owner switches over. */
const VNPAY_PAY_URL = () => process.env.VNPAY_PAY_URL
  || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const MOMO_CREATE_URL = () => process.env.MOMO_CREATE_URL
  || 'https://test-payment.momo.vn/v2/gateway/api/create';

/** Where the gateway sends the buyer, and where it calls us. */
const publicBase = () => (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const vnpayConfig = () => ({
  tmnCode: process.env.VNPAY_TMN_CODE || '',
  hashSecret: process.env.VNPAY_HASH_SECRET || ''
});
const momoConfig = () => ({
  partnerCode: process.env.MOMO_PARTNER_CODE || '',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || ''
});

const hmac = (algo, key, data) => crypto.createHmac(algo, key).update(Buffer.from(data, 'utf8')).digest('hex');

/** Compare two hex digests without leaking where they first differ. */
function sameDigest(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/* ============================ VNPay ============================ *
 *
 * The signature covers every vnp_ parameter except the signature itself,
 * sorted by key, joined as a query string. Two details decide whether it
 * verifies at all, and both are the sort of thing that costs an afternoon:
 *
 *   · the values are URL-encoded with spaces as `+`, not `%20`, because that is
 *     what `URLSearchParams` produces and what VNPay signs;
 *   · empty values are left out entirely.
 */

/** The exact string VNPay signs: sorted, encoded, joined. */
function vnpaySignData(params) {
  const usp = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    if (key === 'vnp_SecureHash' || key === 'vnp_SecureHashType') continue;
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;
    usp.append(key, String(value));
  }
  return usp.toString();
}

function vnpaySign(params, secret) {
  return hmac('sha512', secret, vnpaySignData(params));
}

/** Verify a set of vnp_ parameters that arrived from outside. */
function vnpayVerify(params, secret) {
  const given = params && (params.vnp_SecureHash || params.vnp_secureHash);
  if (!given) return false;
  return sameDigest(vnpaySign(params, secret), given);
}

/* VNPay wants its timestamps in Vietnam local time, as yyyyMMddHHmmss with no
   separators and no zone marker — so the zone has to be applied by hand. */
function vnpayStamp(date) {
  const t = new Date(date.getTime() + 7 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}${p(t.getUTCMonth() + 1)}${p(t.getUTCDate())}`
    + `${p(t.getUTCHours())}${p(t.getUTCMinutes())}${p(t.getUTCSeconds())}`;
}

const vnpayDriver = {
  id: 'vnpay',
  label: 'VNPay',
  configured() {
    const c = vnpayConfig();
    return !!(c.tmnCode && c.hashSecret);
  },
  /**
   * The URL to send the buyer to. No network call: VNPay's redirect flow is
   * entirely a signed query string.
   */
  async start(order, opts) {
    const c = vnpayConfig();
    const now = (opts && opts.now) || new Date();
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: c.tmnCode,
      /* VNPay counts in the smallest unit, so a dong amount is multiplied by
         100. Sending the plain amount charges the buyer one hundredth. */
      vnp_Amount: String(order.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.ref,
      vnp_OrderInfo: order.description,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: `${publicBase()}/payments/vnpay/return`,
      vnp_IpAddr: order.ip || '127.0.0.1',
      vnp_CreateDate: vnpayStamp(now),
      vnp_ExpireDate: vnpayStamp(new Date(now.getTime() + 15 * 60 * 1000))
    };
    const signed = new URLSearchParams(vnpaySignData(params));
    signed.append('vnp_SecureHash', vnpaySign(params, c.hashSecret));
    return { payUrl: `${VNPAY_PAY_URL()}?${signed.toString()}` };
  },
  /**
   * Read a callback — return or IPN, they carry the same fields.
   * `settled` is true only for the one code that means the money moved.
   */
  read(params) {
    const c = vnpayConfig();
    return {
      valid: vnpayVerify(params, c.hashSecret),
      ref: params.vnp_TxnRef || '',
      /* Back to dong. Compared against the order, so a gateway reporting a
         different amount does not settle it. */
      amount: Math.round(Number(params.vnp_Amount || 0) / 100),
      settled: params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00',
      gatewayRef: params.vnp_TransactionNo || '',
      message: params.vnp_ResponseCode || ''
    };
  },
  /** What VNPay expects to read back from an IPN, verbatim. */
  ipnReply(rspCode, message) {
    return { body: { RspCode: rspCode, Message: message }, status: 200 };
  }
};

/* ============================ MoMo ============================ *
 *
 * MoMo does not sort: it signs a raw string whose field order is FIXED by the
 * documentation, and a different order is a different signature. The order for
 * creating a payment and the order for reading an IPN are not the same, which
 * is why they are two separate literals below rather than one clever helper.
 */

function momoCreateSignData(f, accessKey) {
  return `accessKey=${accessKey}&amount=${f.amount}&extraData=${f.extraData}`
    + `&ipnUrl=${f.ipnUrl}&orderId=${f.orderId}&orderInfo=${f.orderInfo}`
    + `&partnerCode=${f.partnerCode}&redirectUrl=${f.redirectUrl}`
    + `&requestId=${f.requestId}&requestType=${f.requestType}`;
}

function momoIpnSignData(f, accessKey) {
  return `accessKey=${accessKey}&amount=${f.amount}&extraData=${f.extraData}`
    + `&message=${f.message}&orderId=${f.orderId}&orderInfo=${f.orderInfo}`
    + `&orderType=${f.orderType}&partnerCode=${f.partnerCode}&payType=${f.payType}`
    + `&requestId=${f.requestId}&responseTime=${f.responseTime}`
    + `&resultCode=${f.resultCode}&transId=${f.transId}`;
}

const momoDriver = {
  id: 'momo',
  label: 'MoMo',
  configured() {
    const c = momoConfig();
    return !!(c.partnerCode && c.accessKey && c.secretKey);
  },
  /**
   * MoMo's flow needs a call to the gateway first, which answers with the URL
   * to send the buyer to. So this one can fail on the network, and says so.
   */
  async start(order) {
    const c = momoConfig();
    const fields = {
      partnerCode: c.partnerCode,
      requestId: order.ref,
      amount: String(order.amount),
      orderId: order.ref,
      orderInfo: order.description,
      redirectUrl: `${publicBase()}/payments/momo/return`,
      ipnUrl: `${publicBase()}/payments/momo/ipn`,
      requestType: 'captureWallet',
      extraData: ''
    };
    const body = Object.assign({}, fields, {
      lang: 'vi',
      signature: hmac('sha256', c.secretKey, momoCreateSignData(fields, c.accessKey))
    });
    const res = await fetch(MOMO_CREATE_URL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    const text = await res.text();
    let answer = null;
    try { answer = JSON.parse(text); } catch (e) { /* reported below */ }
    /* The status alone is not the answer: MoMo returns 200 with a non-zero
       resultCode for a request it refused. The message is short and safe —
       it never carries the secret, which is only ever an HMAC key. */
    if (!res.ok || !answer || answer.resultCode !== 0 || !answer.payUrl) {
      const why = answer ? `${answer.resultCode} ${answer.message}` : `HTTP ${res.status}`;
      throw new Error(`MoMo refused the payment request: ${why}`.slice(0, 200));
    }
    return { payUrl: answer.payUrl };
  },
  read(params) {
    const c = momoConfig();
    const f = {
      amount: params.amount === undefined ? '' : String(params.amount),
      extraData: params.extraData === undefined ? '' : String(params.extraData),
      message: params.message || '',
      orderId: params.orderId || '',
      orderInfo: params.orderInfo || '',
      orderType: params.orderType || '',
      partnerCode: params.partnerCode || '',
      payType: params.payType || '',
      requestId: params.requestId || '',
      responseTime: params.responseTime === undefined ? '' : String(params.responseTime),
      resultCode: params.resultCode === undefined ? '' : String(params.resultCode),
      transId: params.transId === undefined ? '' : String(params.transId)
    };
    const expected = hmac('sha256', c.secretKey, momoIpnSignData(f, c.accessKey));
    return {
      valid: sameDigest(expected, params.signature),
      ref: f.orderId,
      amount: Math.round(Number(f.amount) || 0),
      /* 0 is the only success. 9000 is "authorised, not captured" and is not
         money in the account, whatever it looks like in a dashboard. */
      settled: String(params.resultCode) === '0',
      gatewayRef: f.transId,
      message: f.message
    };
  },
  ipnReply() {
    /* MoMo wants an empty 204 to stop retrying. */
    return { body: null, status: 204 };
  }
};

const DRIVERS = { vnpay: vnpayDriver, momo: momoDriver };

/** The providers a buyer can actually be sent to right now. */
function available() {
  return Object.values(DRIVERS)
    .filter(d => d.configured())
    .map(d => ({ id: d.id, label: d.label }));
}

/** True when at least one gateway is configured. */
const enabled = () => available().length > 0;

/** A driver by id, or null — never a driver that has no keys. */
function driver(id) {
  const d = DRIVERS[String(id || '').toLowerCase()];
  return d && d.configured() ? d : null;
}

/**
 * A reference for one attempt to pay.
 *
 * VNPay wants it unique per merchant per day and no more than 100 characters;
 * MoMo wants it unique full stop. The order id alone would be neither: a
 * retried payment on the same order needs its own reference, or the gateway
 * rejects the second attempt as a duplicate.
 */
function newRef(orderId, now) {
  const at = ((now || new Date()).toISOString().replace(/[-:TZ.]/g, '')).slice(0, 14);
  return `VPET${orderId}T${at}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

module.exports = {
  available, enabled, driver, newRef,
  /* Exported so the tests can sign the way a gateway would, rather than by
     calling the same function they are checking. */
  vnpaySignData, vnpaySign, vnpayVerify, vnpayStamp,
  momoCreateSignData, momoIpnSignData, sameDigest, hmac,
  VNPAY_PAY_URL, MOMO_CREATE_URL, publicBase
};
