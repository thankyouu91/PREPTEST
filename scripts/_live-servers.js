/**
 * Every `node server.js` on this machine, and which database file each one
 * really has open.
 *
 * Shared by scripts/accounts.js, which uses it to change a password on the
 * database the running server is actually reading, and scripts/backup.mjs,
 * which uses it to refuse to restore over a file a server is still writing to.
 * One copy, because the two questions are the same question: "which file is
 * the live one?" — and the only answer that cannot be argued with is the open
 * file descriptor in /proc, whatever the configuration appears to say.
 *
 * Linux only, by construction. Anywhere else this returns an empty list, and
 * the callers treat that as "nothing known" rather than "nothing running".
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function liveServers() {
  const out = [];
  let pids;
  try { pids = fs.readdirSync('/proc').filter(n => /^\d+$/.test(n)); }
  catch (e) { return out; }                       // not Linux; nothing to read

  for (const pid of pids) {
    let argv = [];
    try { argv = fs.readFileSync('/proc/' + pid + '/cmdline', 'utf8').split('\0').filter(Boolean); }
    catch (e) { continue; }
    /* argv[0] has to BE node. Matching the whole command line instead catches
       the shell that launched it — its -c argument contains "server.js" too —
       and reports a wrapper as a second server. */
    if (!argv.length || !/^node(js)?$/.test(argv[0].split('/').pop())) continue;
    if (!argv.slice(1).some(a => /(^|\/)server\.js$/.test(a))) continue;

    const env = {};
    try {
      for (const pair of fs.readFileSync('/proc/' + pid + '/environ', 'utf8').split('\0')) {
        const i = pair.indexOf('=');
        if (i > 0) env[pair.slice(0, i)] = pair.slice(i + 1);
      }
    } catch (e) { /* another user's process; needs sudo */ }

    let cwd = '';
    try { cwd = fs.readlinkSync('/proc/' + pid + '/cwd'); } catch (e) { /* same */ }

    /* The open file descriptors are the part that cannot be argued with: this
       is the file the process is really writing to, whatever the configuration
       appears to say. */
    const dbFiles = [];
    try {
      for (const fd of fs.readdirSync('/proc/' + pid + '/fd')) {
        let target = '';
        try { target = fs.readlinkSync('/proc/' + pid + '/fd/' + fd); } catch (e) { continue; }
        if (/\.sqlite$/.test(target) && !dbFiles.includes(target)) dbFiles.push(target);
      }
    } catch (e) { /* same */ }

    out.push({ pid, cwd, env, dbFiles });
  }
  return out;
}

/** The servers holding `file` open, by real path, so a symlink cannot hide one. */
function serversHolding(file) {
  const real = p => { try { return fs.realpathSync(p); } catch (e) { return path.resolve(p); } };
  const want = real(file);
  return liveServers().filter(s => s.dbFiles.some(f => real(f) === want));
}

module.exports = { liveServers, serversHolding };
