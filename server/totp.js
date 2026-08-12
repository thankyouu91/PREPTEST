/**
 * Time-based one-time passwords (RFC 6238) for the administrator sign-in.
 *
 * Why this and not an IP allowlist: the admin area holds every account, every
 * test and every activation code, and it was reachable from anywhere behind a
 * single password. An allowlist is cheaper but blunt — it locks the owner out
 * the first time their mobile network hands them a different address, and it
 * protects nothing once somebody is on the same network. A second factor is the
 * answer that keeps working.
 *
 * No dependency: HMAC-SHA1 is in `node:crypto`, and the rest is arithmetic.
 * Correctness is not taken on trust — `scripts/test-totp.mjs` runs the six
 * published RFC 6238 test vectors, which is the difference between "the code
 * looks right" and "the code agrees with the standard every authenticator app
 * implements".
 *
 * Three properties beyond generating the right digits:
 *
 *   · Comparison is timing-safe. A code is only six digits; a comparison that
 *     returns early on the first wrong digit hands out a measurable hint.
 *   · A used counter is burned. A code stays valid for its whole step, so
 *     somebody who sees one over a shoulder, or in a screenshot, could replay it
 *     seconds later. The last accepted counter is stored and never accepted
 *     twice.
 *   · The window is one step either side and no more. Wider is friendlier to a
 *     wrong clock and proportionally friendlier to guessing.
 */
'use strict';

const crypto = require('node:crypto');

const PERIOD = 30;          // seconds per step, the value every authenticator assumes
const DIGITS = 6;
const WINDOW = 1;           // steps of clock skew tolerated either side

/* ----------------------------- base32 -----------------------------
   RFC 4648, which is what otpauth:// URIs carry and what an authenticator
   expects when a secret is typed in by hand. Padding is omitted: every app
   accepts it missing, and several reject it present. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf) {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[=\s-]/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) { const e = new Error('Not a base32 secret'); e.code = 'BAD_SECRET'; throw e; }
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/* ------------------------------- HOTP -------------------------------
   RFC 4226 §5.3: HMAC the counter, take the low nibble of the last byte as an
   offset, read four bytes from there, drop the sign bit, and keep the last
   `digits` decimal places. */
function hotp(secretBytes, counter, digits = DIGITS) {
  const buf = Buffer.alloc(8);
  /* A counter is a 64-bit value and JavaScript numbers are not, so write it as
     two 32-bit halves rather than losing the top bits above 2^32. */
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const mac = crypto.createHmac('sha1', secretBytes).update(buf).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) |
               (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 10 ** digits).padStart(digits, '0');
}

/** Which step a moment in time falls in. */
const counterAt = (seconds, period = PERIOD) => Math.floor(seconds / period);

/** The code an authenticator would be showing right now. */
function totp(base32Secret, atSeconds = Date.now() / 1000, digits = DIGITS) {
  return hotp(base32Decode(base32Secret), counterAt(atSeconds), digits);
}

/** Constant-time string compare — never leaks how much of a code was right. */
function sameCode(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

/**
 * Check a submitted code.
 *
 * Returns the counter it matched, or null. The caller stores that counter and
 * passes it back as `lastCounter` next time, which is what makes a code
 * single-use: a valid code from a step already spent is refused.
 */
function verify(base32Secret, submitted, opts = {}) {
  const code = String(submitted || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return null;

  const secret = base32Decode(base32Secret);
  const now = opts.atSeconds === undefined ? Date.now() / 1000 : opts.atSeconds;
  const centre = counterAt(now);
  const window = opts.window === undefined ? WINDOW : opts.window;
  const last = opts.lastCounter === undefined || opts.lastCounter === null ? -1 : opts.lastCounter;

  for (let c = centre - window; c <= centre + window; c++) {
    if (c <= last) continue;                 // already spent: a code is used once
    if (sameCode(hotp(secret, c), code)) return c;
  }
  return null;
}

/** A fresh 20-byte secret — the size RFC 4226 §4 R6 recommends. */
const newSecret = () => base32Encode(crypto.randomBytes(20));

/**
 * The otpauth:// URI an authenticator reads.
 *
 * Shown as text rather than as a QR code: drawing one needs either a dependency
 * or a Reed-Solomon encoder, and every authenticator worth using accepts a
 * secret typed in by hand. A QR would be a convenience, not a capability.
 */
function otpauthUri(secret, account, issuer = 'VPET Prep') {
  const label = encodeURIComponent(issuer) + ':' + encodeURIComponent(account);
  const params = new URLSearchParams({
    secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(PERIOD)
  });
  return `otpauth://totp/${label}?${params}`;
}

module.exports = {
  base32Encode, base32Decode, hotp, totp, verify, sameCode,
  counterAt, newSecret, otpauthUri,
  PERIOD, DIGITS, WINDOW
};
