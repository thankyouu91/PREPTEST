#!/usr/bin/env node
/**
 * The backup command line — what cron calls, and what an operator calls at
 * three in the morning.
 *
 * The logic lives in `server/backup.js`; this file is the part a human and a
 * crontab talk to. Two properties matter more than anything clever:
 *
 *   **The exit code means something.** 0 succeeded, 1 failed. Cron mails on
 *   non-zero output and a monitor watches the code, so a backup that silently
 *   half-worked must exit 1 — the way a backup system fails is by quietly
 *   stopping while everyone keeps believing it runs.
 *
 *   **Restoring is not a one-word command.** `restore` refuses to overwrite
 *   without `--yes`, and prints exactly what it would do instead. The check
 *   costs three seconds; not having it costs a database.
 *
 *   node scripts/backup.mjs run                # snapshot → verify → upload → prune
 *   node scripts/backup.mjs list               # what exists, newest first
 *   node scripts/backup.mjs check              # is the situation healthy? (exit 1 if not)
 *   node scripts/backup.mjs verify <name>      # unpack and check, touch nothing
 *   node scripts/backup.mjs restore <name> --yes [--into <path>]
 *   node scripts/backup.mjs restore latest --yes
 *
 * Configure with BACKUP_DRIVER (disk|s3), BACKUP_DIR, BACKUP_BUCKET,
 * BACKUP_PREFIX, BACKUP_KEEP_DAYS, AWS_REGION and an AWS credential.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const B = require('../server/backup.js');

const argv = process.argv.slice(2);
const cmd = argv[0] || 'help';
const flag = n => argv.includes('--' + n);
const opt = n => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : undefined;
};

const mb = n => (n / 1048576).toFixed(1) + ' MB';
const ago = ms => {
  const h = ms / 3.6e6;
  return h < 1 ? Math.round(ms / 6e4) + ' phút trước' : h.toFixed(1) + ' giờ trước';
};

function die(msg) {
  console.error('\x1b[31m✗ ' + msg + '\x1b[0m');
  process.exit(1);
}

try {
  if (cmd === 'run') {
    const r = await B.backup();
    console.log(`✓ ${r.name}`);
    console.log(`  ${r.driver} · ${mb(r.bytes)} nén (từ ${mb(r.raw)})`
      + ` · ${r.tables} bảng · ${r.users} tài khoản · ${r.attempts} lần làm bài`);
    if (r.pruned.length) console.log(`  đã dọn ${r.pruned.length} bản quá hạn`);

  } else if (cmd === 'list') {
    const all = await B.list();
    if (!all.length) { console.log('Chưa có bản sao lưu nào.'); process.exit(0); }
    const now = Date.now();
    for (const b of all) {
      console.log(`  ${b.name}  ${mb(b.bytes).padStart(9)}  ${ago(now - b.at)}`);
    }
    console.log(`\n${all.length} bản · ${B.config().driver}`);

  } else if (cmd === 'check') {
    const h = await B.backupHealth();
    if (h.ok) {
      console.log(`✓ ${h.count} bản, mới nhất ${h.newest} (${ago(h.ageMs)}), ${h.driver}`);
      process.exit(0);
    }
    /* Every problem, not just the first: an operator who fixes one and re-runs
       to find another has been given the list one line at a time. */
    for (const p of h.problems) console.error('✗ ' + p);
    process.exit(1);

  } else if (cmd === 'verify') {
    const name = argv[1] || die('verify cần tên bản sao lưu');
    const r = await B.restore(name, { check: true });
    console.log(`✓ ${name} mở được và toàn vẹn`);
    console.log(`  ${mb(r.bytes)} · ${r.tables} bảng · ${r.users} tài khoản · ${r.attempts} lần làm bài`);

  } else if (cmd === 'restore') {
    let name = argv[1];
    if (!name) die('restore cần tên bản sao lưu, hoặc "latest"');
    if (name === 'latest') {
      const all = await B.list();
      if (!all.length) die('không có bản nào để phục hồi');
      name = all[0].name;
    }
    if (!flag('yes')) {
      /* Say what would happen, having actually checked the archive — a dry run
         that does not open the file cannot tell you the restore would fail. */
      const r = await B.restore(name, { check: true });
      console.log(`Sẽ phục hồi ${name}`);
      console.log(`  ${mb(r.bytes)} · ${r.tables} bảng · ${r.users} tài khoản · ${r.attempts} lần làm bài`);
      console.log(`  vào ${opt('into') || process.env.PREP_DB || 'data/prep.sqlite'}`);
      console.log('\nCSDL hiện tại sẽ được đổi tên giữ lại, không bị xoá.');
      console.log('Chạy lại kèm --yes để làm thật.');
      process.exit(0);
    }
    const r = await B.restore(name, { into: opt('into') });
    console.log(`✓ đã phục hồi ${name} → ${r.into}`);
    console.log(`  ${r.tables} bảng · ${r.users} tài khoản · ${r.attempts} lần làm bài`);
    if (r.movedAside) console.log(`  bản cũ giữ ở ${r.movedAside}`);
    console.log('\nKhởi động lại server để nó mở tệp mới.');

  } else {
    console.log(`Sao lưu và phục hồi CSDL.

  run                       chụp → kiểm → nén → đẩy → dọn bản quá hạn
  list                      liệt kê, mới nhất trước
  check                     tình trạng có ổn không (thoát 1 nếu không)
  verify <tên>              giải nén và kiểm, không đụng gì
  restore <tên|latest>      xem trước; thêm --yes để làm thật
                            --into <đường dẫn> để phục hồi ra chỗ khác

Cấu hình: BACKUP_DRIVER=disk|s3 · BACKUP_DIR · BACKUP_BUCKET · BACKUP_PREFIX
          BACKUP_KEEP_DAYS · AWS_REGION`);
    process.exit(cmd === 'help' ? 0 : 1);
  }
} catch (e) {
  die(e && e.message ? e.message : String(e));
}
