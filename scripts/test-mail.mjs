/**
 * Outgoing mail: message composition, the SMTP conversation, and the one rule
 * that made this item urgent — a token must never reach a log.
 *
 * Run standalone, no server needed: node scripts/test-mail.mjs
 *
 * The SMTP half talks to a fake server started here on a loopback port. That is
 * the only honest way to check a hand-written protocol client without a mail
 * account: it proves the actual conversation — EHLO, AUTH, MAIL FROM, RCPT TO,
 * DATA, the terminating dot — rather than proving that the code compiles. What
 * it deliberately does not prove is TLS negotiation against a real provider;
 * that needs a real provider, and is the one thing left to check by hand on the
 * first deploy.
 */
import { createRequire } from 'node:module';
import net from 'node:net';

const require_ = createRequire(import.meta.url);
const mail = require_('../server/mail.js');

let pass = 0, fail = 0;
const ok = (c, name, detail) => {
  if (c) { pass++; console.log('✓ ' + name); return; }
  fail++;
  console.log('✗ ' + name + (detail === undefined ? '' : '  → ' + detail));
};
const head = t => console.log('\n\x1b[1m== ' + t + ' ==\x1b[0m');

/**
 * A fake SMTP server. Speaks just enough to be believable, records everything
 * it was told, and can be pointed at any behaviour a real one might have.
 */
function fakeSmtp({ offerStartTls = false, authMechanism = 'PLAIN' } = {}) {
  const seen = { commands: [], message: '', authArgs: [] };
  const server = net.createServer(socket => {
    let inData = false;
    socket.setEncoding('utf8');
    socket.write('220 fake.smtp ESMTP ready\r\n');
    let buf = '';
    socket.on('data', chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (inData) {
          if (line === '.') { inData = false; socket.write('250 2.0.0 Queued\r\n'); }
          else seen.message += line + '\r\n';
          continue;
        }
        seen.commands.push(line);
        const verb = line.split(' ')[0].toUpperCase();
        if (verb === 'EHLO') {
          const caps = ['250-fake.smtp'];
          if (offerStartTls) caps.push('250-STARTTLS');
          caps.push('250-AUTH ' + authMechanism, '250 SIZE 10485760');
          socket.write(caps.join('\r\n') + '\r\n');
        } else if (verb === 'AUTH') {
          const arg = line.slice(5).trim();
          if (/^PLAIN\s+\S/i.test(arg)) { seen.authArgs.push(arg.split(/\s+/)[1]); socket.write('235 2.7.0 OK\r\n'); }
          else if (/^LOGIN$/i.test(arg)) socket.write('334 VXNlcm5hbWU6\r\n');
          else socket.write('504 unrecognised\r\n');
        } else if (verb === 'MAIL' || verb === 'RCPT') {
          socket.write('250 2.1.0 OK\r\n');
        } else if (verb === 'DATA') {
          inData = true; socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (verb === 'QUIT') {
          socket.write('221 2.0.0 Bye\r\n'); socket.end();
        } else if (/^[A-Za-z0-9+/=]+$/.test(line)) {
          /* A bare base64 line is the second and third leg of AUTH LOGIN. */
          seen.authArgs.push(line);
          socket.write(seen.authArgs.length >= 2 ? '235 2.7.0 OK\r\n' : '334 UGFzc3dvcmQ6\r\n');
        } else {
          socket.write('250 2.0.0 OK\r\n');
        }
      }
    });
    socket.on('error', () => {});
  });
  return {
    seen,
    listen: () => new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port))),
    close: () => new Promise(r => server.close(r))
  };
}

try {
  head('Composing a message');

  const msg = mail.compose({
    from: 'no-reply@vpetprep.vn',
    to: 'hocvien@example.com',
    subject: 'Đặt lại mật khẩu — VPET Prep',
    text: 'Chào bạn,\n\nBấm vào liên kết: https://vpetprep.vn/prep/dat-lai-mat-khau/?token=abc\n',
    date: new Date('2026-08-12T09:00:00Z'),
    messageId: '<fixed@vpetprep.vn>'
  });

  ok(msg.includes('\r\n\r\n'), 'Headers and body are separated by a blank line');
  ok(/^From: no-reply@vpetprep\.vn\r\n/.test(msg), 'From is first');
  ok(msg.includes('Message-ID: <fixed@vpetprep.vn>'), 'Message-ID is carried');
  ok(msg.includes('Auto-Submitted: auto-generated'),
    'Marked auto-generated, so a vacation responder does not answer it');

  /* A Vietnamese subject is the normal case here. Sent raw it arrives as mojibake
     in some clients and is rejected outright by strict ones. */
  ok(msg.includes('Subject: =?UTF-8?B?'), 'A non-ASCII subject travels as an RFC 2047 encoded word');
  const encoded = msg.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
  ok(Buffer.from(encoded, 'base64').toString('utf8') === 'Đặt lại mật khẩu — VPET Prep',
    'And decodes back to exactly the subject that went in');
  ok(!/Subject:.*Đặt/.test(msg), 'The raw Vietnamese is not left in the header as well');

  /* An ASCII subject should not be needlessly encoded — it costs readability in
     every log and every mail client that shows raw headers. */
  ok(mail.encodeHeader('Plain ASCII subject') === 'Plain ASCII subject',
    'An ASCII header is left alone');

  const body = msg.split('\r\n\r\n')[1];
  ok(/^[A-Za-z0-9+/=\r\n]+$/.test(body), 'The body is base64 and nothing else');
  ok(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8').includes('Bấm vào liên kết'),
    'And decodes back to the Vietnamese body');
  ok(body.split('\r\n').every(l => l.length <= 76), 'Wrapped at 76 characters, as SMTP requires');
  /* Base64 has no '.' in its alphabet, so no body line can begin with one. That
     is what makes dot-stuffing — the classic hand-rolled-SMTP bug — impossible
     here rather than merely unlikely. */
  ok(body.split('\r\n').every(l => !l.startsWith('.')), 'No body line can start with a dot');

  head('Header injection');

  /* Both of these come from user input: the address is typed at registration,
     and the subject is chosen here but travels the same path. One newline and
     the sender is writing their own Bcc. */
  for (const [label, bad] of [
    ['a recipient', { to: 'x@y.com\r\nBcc: victim@elsewhere.com' }],
    ['a subject', { subject: 'Hello\r\nBcc: victim@elsewhere.com' }],
    ['a bare newline', { to: 'x@y.com\nBcc: victim@elsewhere.com' }]
  ]) {
    let threw = null;
    try {
      mail.compose(Object.assign({
        from: 'a@b.com', to: 'x@y.com', subject: 'Subject', text: 'hi'
      }, bad));
    } catch (e) { threw = e; }
    ok(threw && threw.code === 'MAIL_HEADER_INJECTION',
      'A line break in ' + label + ' is refused', threw ? threw.code : 'no error thrown');
  }

  head('A From with a display name, which is the form the README shows');

  /* MAIL_FROM is allowed to read "VPET Prep <no-reply@x>". Two places took the
     whole string as an address: the envelope, where the server sees
     `MAIL FROM:<VPET Prep <no-reply@x>>` and answers 5xx, and the Message-ID
     domain, which came out with a stray `>` inside it. Both fail at send time,
     after everything on screen says the mail is configured — and the README's
     own example is exactly the shape that triggers them. */
  ok(mail.addressOf('VPET Prep <no-reply@vpetprep.vn>') === 'no-reply@vpetprep.vn',
    'The address is taken out of a "Name <addr>" value', mail.addressOf('VPET Prep <no-reply@vpetprep.vn>'));
  ok(mail.addressOf('no-reply@vpetprep.vn') === 'no-reply@vpetprep.vn',
    'and a bare address is left exactly as it is');
  ok(mail.addressOf('  Tên Có Dấu <a@b.co>  ') === 'a@b.co',
    'including with a display name that is not ASCII', mail.addressOf('  Tên Có Dấu <a@b.co>  '));

  const namedMsg = mail.compose({
    from: 'VPET Prep <no-reply@vpetprep.vn>', to: 'hocvien@example.com',
    subject: 'Test', text: 'x'
  });
  ok(/^From: .*<no-reply@vpetprep\.vn>/m.test(namedMsg),
    'The From header keeps the display name — that is what it is for');
  const idLine = (namedMsg.match(/^Message-ID: (.*)$/m) || [])[1] || '';
  ok(/^<[^<>]+@[^<>]+>$/.test(idLine),
    'and the Message-ID holds one address, with no stray angle bracket', idLine);

  /* Through send() rather than smtpSend(), because send() is where the defect
     was: it passed MAIL_FROM to the envelope untouched. A check that extracts
     the address itself before handing it over proves nothing — it tests the
     test. This one sets the environment the way an operator would and lets the
     module do the whole job. */
  {
    const srv2 = fakeSmtp({ authMechanism: 'PLAIN' });
    const port2 = await srv2.listen();
    const before = {};
    const env = {
      MAIL_DRIVER: 'smtp', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(port2),
      SMTP_SECURE: '0', SMTP_USER: 'u', SMTP_PASS: 'p',
      SMTP_ALLOW_PLAINTEXT_AUTH: '1',
      MAIL_FROM: 'VPET Prep <no-reply@vpetprep.vn>'
    };
    for (const k of Object.keys(env)) { before[k] = process.env[k]; process.env[k] = env[k]; }
    const sent = await mail.send({
      to: 'hocvien@example.com', subject: 'Đặt lại mật khẩu', text: 'https://x/y?token=T\n'
    });
    for (const k of Object.keys(env)) {
      if (before[k] === undefined) delete process.env[k]; else process.env[k] = before[k];
    }
    ok(sent && sent.sent === true, 'send() reports the message as sent', JSON.stringify(sent));
    const mf = srv2.seen.commands.find(c => c.startsWith('MAIL FROM'));
    ok(mf === 'MAIL FROM:<no-reply@vpetprep.vn>',
      'and the envelope carries the address alone — a display name here is a 5xx from Gmail', mf);
  }

  head('Reading a multi-line SMTP reply');

  ok(mail.replyIsComplete('250 OK\r\n'), 'A single line ending in "250 " is complete');
  ok(!mail.replyIsComplete('250-fake.smtp\r\n'), 'A "250-" continuation is not');
  ok(!mail.replyIsComplete('250-fake.smtp\r\n250-AUTH PLAIN\r\n'), 'Nor two of them');
  ok(mail.replyIsComplete('250-fake.smtp\r\n250-AUTH PLAIN\r\n250 SIZE 10485760\r\n'),
    'Complete once the final line drops the hyphen');
  ok(!mail.replyIsComplete('25'), 'A half-arrived reply is not complete');

  head('The SMTP conversation, against a fake server');

  const srv = fakeSmtp({ authMechanism: 'PLAIN' });
  const port = await srv.listen();
  const message = mail.compose({
    from: 'no-reply@vpetprep.vn', to: 'hocvien@example.com',
    subject: 'Xác thực địa chỉ email — VPET Prep', text: 'Liên kết: https://x/y?token=SECRET-TOKEN-123\n'
  });
  await mail.smtpSend(message, { from: 'no-reply@vpetprep.vn', to: 'hocvien@example.com' }, {
    host: '127.0.0.1', port, secure: false,
    user: 'apikey', pass: 'hunter2', allowPlaintextAuth: true, clientName: 'test.local'
  });

  const cmds = srv.seen.commands;
  ok(/^EHLO /.test(cmds[0]), 'Opens with EHLO', cmds[0]);
  ok(cmds.some(c => c.startsWith('MAIL FROM:<no-reply@vpetprep.vn>')), 'Sends MAIL FROM with the envelope sender');
  ok(cmds.some(c => c.startsWith('RCPT TO:<hocvien@example.com>')), 'Sends RCPT TO with the recipient');
  ok(cmds.includes('DATA'), 'Then DATA');
  ok(cmds.includes('QUIT'), 'And says QUIT rather than dropping the socket');
  ok(cmds.indexOf('DATA') > cmds.findIndex(c => c.startsWith('RCPT TO')), 'In that order');

  /* The whole point of the exercise: what the server received has to be the
     message that was composed, byte for byte, terminating dot removed. */
  ok(srv.seen.message.trim() === message.trim(),
    'The server received exactly the composed message',
    srv.seen.message.length + ' bytes vs ' + message.length);
  ok(srv.seen.message.includes('U0VDUkVU') || Buffer.from(
      srv.seen.message.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64'
    ).toString('utf8').includes('SECRET-TOKEN-123'),
    'The body really carried the link through');

  const authArg = srv.seen.authArgs[0];
  ok(!!authArg, 'It authenticated');
  ok(Buffer.from(authArg, 'base64').toString('utf8') === '\0apikey\0hunter2',
    'AUTH PLAIN carries the RFC 4616 NUL-separated triple');
  await srv.close();

  head('Credentials are never sent in the clear');

  /* A relay that offers no STARTTLS on a plaintext port is either misconfigured
     or not the relay you think you are talking to. Downgrading silently is how
     a password ends up on the wire. */
  const bare = fakeSmtp({ offerStartTls: false });
  const barePort = await bare.listen();
  let refused = null;
  try {
    await mail.smtpSend('x', { from: 'a@b.com', to: 'c@d.com' }, {
      host: '127.0.0.1', port: barePort, secure: false,
      user: 'apikey', pass: 'hunter2', allowPlaintextAuth: false, clientName: 'test.local'
    });
  } catch (e) { refused = e; }
  ok(refused && refused.code === 'SMTP_INSECURE_AUTH',
    'AUTH over an unencrypted connection is refused, not downgraded',
    refused ? refused.code : 'the password went out in the clear');
  ok(!bare.seen.commands.some(c => /^AUTH/i.test(c)),
    'And no AUTH command reached the wire at all');

  /* No credentials, no problem: an open relay on a private network is a real
     deployment, and refusing it would be refusing something safe. */
  const anon = fakeSmtp({ offerStartTls: false });
  const anonPort = await anon.listen();
  await mail.smtpSend(
    mail.compose({ from: 'a@b.com', to: 'c@d.com', subject: 'Hi', text: 'hi' }),
    { from: 'a@b.com', to: 'c@d.com' },
    { host: '127.0.0.1', port: anonPort, secure: false, user: '', pass: '', clientName: 'test.local' });
  ok(anon.seen.commands.includes('DATA'), 'With no credentials to protect, a plaintext relay still works');
  await anon.close();
  await bare.close();

  head('A rejected command is an error, not a silent success');

  const rude = net.createServer(socket => {
    socket.setEncoding('utf8');
    socket.write('220 fake ESMTP\r\n');
    socket.on('data', () => socket.write('550 5.7.1 Not today\r\n'));
    socket.on('error', () => {});
  });
  const rudePort = await new Promise(r => rude.listen(0, '127.0.0.1', () => r(rude.address().port)));
  let rejected = null;
  try {
    await mail.smtpSend('x', { from: 'a@b.com', to: 'c@d.com' },
      { host: '127.0.0.1', port: rudePort, secure: false, clientName: 'test.local' });
  } catch (e) { rejected = e; }
  ok(rejected && rejected.code === 'SMTP_REJECTED', 'A 550 becomes a thrown SMTP_REJECTED',
    rejected ? rejected.code : 'no error');
  await new Promise(r => rude.close(r));

  head('The token never reaches a log');

  /* This is the check the whole item exists for. deliverLink used to print the
     complete reset link, in every environment, so anyone with log access owned
     every account. Capture stdout and stderr around a real send and assert the
     secret is not in either. */
  const captured = [];
  const realLog = console.log, realErr = console.error;
  console.log = (...a) => captured.push(a.join(' '));
  console.error = (...a) => captured.push(a.join(' '));
  const SECRET = 'TOKEN-THAT-MUST-NOT-BE-LOGGED-9f2b1c';
  try {
    await mail.send({
      to: 'hocvien@example.com',
      subject: 'Đặt lại mật khẩu — VPET Prep',
      text: 'https://vpetprep.vn/prep/dat-lai-mat-khau/?token=' + SECRET
    });
  } finally {
    console.log = realLog; console.error = realErr;
  }
  const logged = captured.join('\n');
  ok(captured.length > 0, 'Something was logged — silence would hide the send entirely');
  ok(!logged.includes(SECRET), 'The token is NOT in the log', logged.slice(0, 200));
  ok(!/token=/.test(logged), 'Nor is any token query parameter', logged.slice(0, 200));
  ok(logged.includes('hocvien@example.com'),
    'The recipient IS logged, so a delivery can still be traced to an account');

  head('Absolute links');

  /* A relative path in an email body is not clickable. */
  const prev = process.env.PUBLIC_BASE_URL;
  process.env.PUBLIC_BASE_URL = 'https://vpetprep.vn/';
  ok(mail.baseUrl() === 'https://vpetprep.vn', 'PUBLIC_BASE_URL wins, with any trailing slash trimmed');
  delete process.env.PUBLIC_BASE_URL;
  ok(mail.baseUrl({ headers: { host: 'prep.example.com' }, secure: true }) === 'https://prep.example.com',
    'Otherwise the request origin is used');
  ok(mail.baseUrl({ headers: { host: 'localhost:3000' }, secure: false }) === 'http://localhost:3000',
    'Including over plain HTTP in development');
  ok(/^http:\/\/localhost:/.test(mail.baseUrl()), 'And with no request at all there is still a usable fallback');
  if (prev === undefined) delete process.env.PUBLIC_BASE_URL; else process.env.PUBLIC_BASE_URL = prev;
} catch (e) {
  fail++;
  console.log('✗ Failed while running: ' + (e && e.stack ? e.stack : e));
}

console.log('\n' + (fail ? '\x1b[31m' : '\x1b[32m') + pass + '/' + (pass + fail) + ' checks passed\x1b[0m');
process.exit(fail ? 1 : 0);
