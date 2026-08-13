/**
 * The demo student's credentials, for the scripts that sign in as them.
 *
 * Read from the environment, never written down here. It used to be one fixed
 * string repeated across a dozen files, printed on the sign-in page with a
 * button to fill it in, and listed in two READMEs — which in a repository
 * anybody can read is not a demo account, it is a login handed to every reader
 * of the source.
 *
 * `scripts/verify.sh` generates a fresh one per run and resets the account to
 * it, so the suite never depends on a fixed password existing anywhere. To run
 * one of these scripts by hand, set the variable yourself:
 *
 *   DEMO_STUDENT_PASSWORD=… node scripts/audit.mjs
 *
 * or give the account a password once with
 * `node scripts/accounts.js reset-student <password>` and export the same value.
 */

export const DEMO_USER = 'student';
export const DEMO_EMAIL = 'student@vpetprep.vn';

/**
 * Exits rather than returning something unusable: a script that carries on with
 * an empty password produces a wall of authentication failures whose cause is
 * three screens further up.
 */
function required() {
  const pw = process.env.DEMO_STUDENT_PASSWORD || '';
  if (pw.length >= 10) return pw;
  console.error(
    '\n✗ DEMO_STUDENT_PASSWORD is not set (or is under 10 characters).\n'
    + '  This script signs in as the demo student, and the password is no longer\n'
    + '  written into the repository. Either run the whole suite —\n'
    + '      npm run verify\n'
    + '  which generates one for the run — or set the account up yourself:\n'
    + '      node scripts/accounts.js reset-student <password>\n'
    + '      DEMO_STUDENT_PASSWORD=<password> node scripts/<this-script>\n');
  process.exit(1);
}

export const DEMO_PASSWORD = required();

/** The shape most of these scripts already pass around. */
export const DEMO = { id: DEMO_USER, pw: DEMO_PASSWORD };


/* ---------------------------------------------------------------- *
 * The administrator, for the scripts that sign in to /admin/
 * ---------------------------------------------------------------- */

/**
 * Same rule, same reason: `Admin@123456` used to be the fallback in four of
 * these scripts and the seed default in `server/auth.js`, which made it the
 * administrator password of every install whose operator never changed it.
 *
 * `scripts/verify.sh` keeps an ADMIN_PASSWORD you already have and generates
 * one only when you have none — so running the suite does not quietly change
 * the password you chose.
 */
function requiredAdmin() {
  const pw = process.env.ADMIN_PASSWORD || '';
  if (pw.length >= 10) return pw;
  console.error(
    '\n✗ ADMIN_PASSWORD is not set (or is under 10 characters).\n'
    + '  This script signs in to the administration area, and there is no longer a\n'
    + '  default password in the repository. Run the whole suite —\n'
    + '      npm run verify\n'
    + '  or set the account up yourself:\n'
    + '      node scripts/accounts.js reset-admin <password>\n'
    + '      ADMIN_PASSWORD=<password> node scripts/<this-script>\n');
  process.exit(1);
}

export const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
export const ADMIN_PASSWORD = requiredAdmin();
