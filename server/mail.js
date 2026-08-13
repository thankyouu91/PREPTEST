/**
 * Outgoing mail, with two interchangeable drivers.
 *
 * Why this exists at all: the platform issues verification and password-reset
 * links, and until now `deliverLink()` wrote them to stdout and stopped there.
 * That meant two things at once. Nobody could verify an email or reset a
 * password once online, which is a functional blocker rather than a security
 * one; and the full link — token and all — went into the log in every
 * environment including production, so anyone who could read the logs could
 * take over any account. A token in a log is a password in a log.
 *
 *   MAIL_DRIVER=console   (default) nothing is sent; the link is returned to
 *                         the caller outside production so the flow can be
 *                         exercised, and the log records only that a link was
 *                         issued, to whom, and of what kind — never the token
 *   MAIL_DRIVER=smtp      a real message over SMTP
 *
 * The SMTP driver is provider-agnostic on purpose. No mail account exists for
 * this project yet, and picking a provider's REST API now would be guessing;
 * every provider worth using — SES, SendGrid, Postmark, Gmail with an app
 * password — speaks SMTP, so this works with whichever one the owner chooses.
 * It is written against `node:net` and `node:tls`, so it adds no dependency.
 *
 * Security notes, because this speaks to a machine outside the platform:
 *   · Credentials are never sent over an unencrypted connection. If the server
 *     offers no STARTTLS and the port is not already TLS, AUTH is refused
 *     rather than downgraded — set SMTP_ALLOW_PLAINTEXT_AUTH=1 only against a
 *     relay you own on a private network.
 *   · The recipient address is checked before it reaches the protocol. A CR or
 *     LF smuggled into an address or a subject is how a header injection turns
 *     one message into two, so anything with a line break in it is rejected.
 *   · The body is base64, which cannot produce a line beginning with '.', so
 *     the dot-stuffing rule that trips hand-rolled SMTP clients cannot bite.
 */
'use strict';

const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const os = require('node:os');

/* Read at call time, never captured into constants at import: server/secrets.js
   merges Secrets Manager values into the environment during boot, which happens
   after this module has been required. SMTP_PASS captured at import would be
   the empty string it was before the secret arrived, and the symptom is mail
   that authenticates as nobody and quietly does not arrive. */
function settings() {
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  return {
    driver: (process.env.MAIL_DRIVER || 'console').toLowerCase(),
    host: process.env.SMTP_HOST || '',
    port,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    /* Implicit TLS on 465, STARTTLS everywhere else — see the note above. */
    secure: process.env.SMTP_SECURE === '1' || port === 465,
    allowPlaintextAuth: process.env.SMTP_ALLOW_PLAINTEXT_AUTH === '1',
    from: process.env.MAIL_FROM || '',
    timeoutMs: parseInt(process.env.SMTP_TIMEOUT_MS, 10) || 20000
  };
}

/* Absolute links, because a relative path in an email is not clickable. Falls
   back to the request's own origin, which is trustworthy now that TRUST_PROXY
   decides how much of X-Forwarded-* to believe (see server/security.js). */
function baseUrl(req) {
  const configured = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  if (req && req.headers && req.headers.host) {
    return (req.secure ? 'https' : 'http') + '://' + req.headers.host;
  }
  return 'http://localhost:' + (process.env.PORT || 3000);
}

/* ------------------------------ composing ------------------------------ */

/* A CR or LF anywhere a header value goes is header injection: one newline and
   the attacker is writing their own Bcc. Addresses and subjects both come from
   user-controlled data, so both are checked rather than trusted. */
const HAS_BREAK = /[\r\n]/;

function assertHeaderSafe(label, value) {
  if (typeof value !== 'string' || HAS_BREAK.test(value)) {
    const e = new Error(`${label} contains a line break, which would inject a header`);
    e.code = 'MAIL_HEADER_INJECTION';
    throw e;
  }
}

/* RFC 2047: a header value outside ASCII travels as an encoded word. Vietnamese
   subjects are the normal case here, not the exception. */
function encodeHeader(value) {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return '=?UTF-8?B?' + Buffer.from(value, 'utf8').toString('base64') + '?=';
}

function wrap76(b64) {
  return (b64.match(/.{1,76}/g) || ['']).join('\r\n');
}

/**
 * Build one RFC 5322 message. Exported so the shape can be tested without a
 * socket: the protocol conversation and the message body fail in different
 * ways and are worth checking apart.
 */
function compose({ from, to, subject, text, date, messageId }) {
  assertHeaderSafe('From', from);
  assertHeaderSafe('To', to);
  assertHeaderSafe('Subject', subject);
  const id = messageId || '<' + crypto.randomUUID() + '@' + (from.split('@')[1] || 'localhost') + '>';
  const headers = [
    'From: ' + encodeHeader(from),
    'To: ' + encodeHeader(to),
    'Subject: ' + encodeHeader(subject),
    'Date: ' + (date || new Date()).toUTCString(),
    'Message-ID: ' + id,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    'Auto-Submitted: auto-generated'
  ];
  return headers.join('\r\n') + '\r\n\r\n' + wrap76(Buffer.from(text, 'utf8').toString('base64'));
}

/* ------------------------------ the wire ------------------------------ */

/** A reply is finished when a line reads "NNN " — a hyphen means more follows. */
function replyIsComplete(buf) {
  const lines = buf.split('\r\n').filter(Boolean);
  const last = lines[lines.length - 1];
  return !!last && /^\d{3} /.test(last);
}

/** Wrap a socket in a line-oriented request/response conversation. */
function conversation(socket) {
  let buffer = '';
  let waiting = null;
  let failure = null;

  const settleFailure = err => {
    failure = failure || err;
    if (waiting) { const w = waiting; waiting = null; w.reject(failure); }
  };

  socket.setEncoding('utf8');
  socket.on('data', chunk => {
    buffer += chunk;
    if (waiting && replyIsComplete(buffer)) {
      const w = waiting; waiting = null;
      const reply = buffer; buffer = '';
      w.resolve(reply);
    }
  });
  socket.on('error', settleFailure);
  socket.on('close', () => settleFailure(new Error('SMTP connection closed early')));

  return {
    read() {
      if (failure) return Promise.reject(failure);
      if (replyIsComplete(buffer)) {
        const reply = buffer; buffer = '';
        return Promise.resolve(reply);
      }
      return new Promise((resolve, reject) => { waiting = { resolve, reject }; });
    },
    write(line) { socket.write(line + '\r\n'); },
    /** Send a command and insist on an expected reply code. */
    async command(line, expect, redactInLog) {
      if (line !== null) this.write(line);
      const reply = await this.read();
      const code = parseInt(reply.slice(0, 3), 10);
      if (!expect.includes(code)) {
        const shown = redactInLog ? '<redacted>' : line;
        const e = new Error(`SMTP refused ${shown === null ? 'the greeting' : shown}: ${reply.trim()}`);
        e.code = 'SMTP_REJECTED';
        throw e;
      }
      return reply;
    },
    detach() { socket.removeAllListeners('data'); socket.removeAllListeners('close'); }
  };
}

function connect(opts) {
  return new Promise((resolve, reject) => {
    const socket = (opts.tls ? tls : net).connect(opts, () => resolve(socket));
    socket.setTimeout(settings().timeoutMs, () => socket.destroy(new Error('SMTP timed out')));
    socket.once('error', reject);
  });
}

function upgrade(socket, host) {
  return new Promise((resolve, reject) => {
    const secure = tls.connect({ socket, servername: host }, () => resolve(secure));
    secure.setTimeout(settings().timeoutMs, () => secure.destroy(new Error('SMTP timed out')));
    secure.once('error', reject);
  });
}

/**
 * Deliver one message over SMTP.
 *
 * Exported with its host and port as arguments rather than reading the module
 * constants, so the suite can point it at a fake server on localhost and check
 * the whole conversation without credentials or a network.
 */
async function smtpSend(message, envelope, cfg) {
  const host = cfg.host, port = cfg.port;
  let socket = await connect({ host, port, tls: !!cfg.secure });
  let chat = conversation(socket);
  const ehloName = cfg.clientName || os.hostname() || 'localhost';

  try {
    await chat.command(null, [220]);                       // the greeting
    let reply = await chat.command('EHLO ' + ehloName, [250]);

    let encrypted = !!cfg.secure;
    if (!encrypted && /\bSTARTTLS\b/i.test(reply)) {
      await chat.command('STARTTLS', [220]);
      chat.detach();
      socket = await upgrade(socket, host);
      chat = conversation(socket);
      reply = await chat.command('EHLO ' + ehloName, [250]);
      encrypted = true;
    }

    if (cfg.user) {
      /* A password on an unencrypted socket is a password given away. Refuse
         rather than downgrade — an operator who really does have a private
         relay can say so, deliberately, with one environment variable. */
      if (!encrypted && !cfg.allowPlaintextAuth) {
        const e = new Error(
          'Refusing to send SMTP credentials over an unencrypted connection. ' +
          'Use port 465, a server offering STARTTLS, or set SMTP_ALLOW_PLAINTEXT_AUTH=1 ' +
          'if the relay is on a private network you control.');
        e.code = 'SMTP_INSECURE_AUTH';
        throw e;
      }
      if (/AUTH[ -][^\r\n]*\bPLAIN\b/i.test(reply)) {
        const token = Buffer.from('\0' + cfg.user + '\0' + cfg.pass, 'utf8').toString('base64');
        await chat.command('AUTH PLAIN ' + token, [235], true);
      } else {
        await chat.command('AUTH LOGIN', [334]);
        await chat.command(Buffer.from(cfg.user, 'utf8').toString('base64'), [334], true);
        await chat.command(Buffer.from(cfg.pass, 'utf8').toString('base64'), [235], true);
      }
    }

    await chat.command('MAIL FROM:<' + envelope.from + '>', [250]);
    await chat.command('RCPT TO:<' + envelope.to + '>', [250, 251]);
    await chat.command('DATA', [354]);
    socket.write(message + '\r\n.\r\n');
    await chat.command(null, [250]);
    try { await chat.command('QUIT', [221]); } catch { /* a rude goodbye is not a failed send */ }
  } finally {
    socket.destroy();
  }
}

/* ------------------------------- drivers ------------------------------- */

/**
 * What the log is allowed to say. A verification link is a bearer credential
 * for one account, so the log gets the fact and the owner, never the secret.
 */
function logIssued(verb, subject, to) {
  console.log(`[mail] ${verb} "${subject}" to ${to} (link not logged: it is a credential)`);
}

function smtpConfig() {
  const s = settings();
  if (!s.host) throw new Error('MAIL_DRIVER=smtp needs SMTP_HOST');
  if (!s.from) throw new Error('MAIL_DRIVER=smtp needs MAIL_FROM');
  return {
    host: s.host, port: s.port, secure: s.secure,
    user: s.user, pass: s.pass,
    allowPlaintextAuth: s.allowPlaintextAuth
  };
}

/**
 * Send one message.
 *
 * Returns { sent, driver }. Never throws into a request handler: a mail server
 * having a bad afternoon must not turn "your account was created" into a 500,
 * so a failure is logged and reported, and the caller decides what to tell the
 * person. The account exists either way, and the link can be asked for again.
 */
async function send({ to, subject, text }) {
  const { driver, from } = settings();
  if (driver !== 'smtp') { logIssued('would send', subject, to); return { sent: false, driver: 'console' }; }
  try {
    const cfg = smtpConfig();
    const message = compose({ from, to, subject, text });
    await smtpSend(message, { from, to }, cfg);
    logIssued('sent', subject, to);
    return { sent: true, driver: 'smtp' };
  } catch (e) {
    console.error('[mail] could not send to ' + to + ': ' + (e && e.message));
    return { sent: false, driver: 'smtp', error: e && e.code || 'SMTP_FAILED' };
  }
}

/** Is a real transport configured? Decides whether a dev link may be returned. */
const enabled = () => settings().driver === 'smtp';

module.exports = {
  send, enabled, baseUrl,
  compose, smtpSend, encodeHeader, assertHeaderSafe, replyIsComplete,
  /* `settings` replaces the old `DRIVER` export, which was a value read once at
     import and so could not answer the question after boot. Nothing consumed it. */
  settings
};
