/**
 * Three levels of administrator, and exactly what each one may do.
 *
 * ## Why a capability table and not `if (role === 'owner')`
 *
 * There were two levels before this file: the owner, and everybody else. The
 * check was `role !== 'owner'` written out at each of the seven routes that
 * needed it, and everything else was open to any signed-in administrator. That
 * scales to two levels and stops scaling at three, for one reason worth being
 * blunt about:
 *
 *   **A role check scattered across fifty routes fails silently in the
 *   dangerous direction.** Add a route and forget the check, and it is not
 *   broken — it works, for everyone, and nothing tells you. The failure is
 *   invisible precisely because the feature appears to function.
 *
 * So capabilities live here, in one table, and a route declares which one it
 * needs. Whether a teacher may issue an activation code is then a question with
 * one place to look and one place to change. `scripts/test-roles.mjs` reads the
 * live Express stack and fails if ANY `/api/admin` route declares no capability
 * at all — so the forgotten check is a red build rather than a quiet grant.
 *
 * ## The three levels
 *
 *   owner    Quản trị — everything, and the only level that can create
 *            administrators, hold the model key, or restore a backup.
 *   manager  Quản lý  — runs the school day to day: learners, activation codes,
 *            papers, the question bank, the audit log. No settings, no secrets,
 *            no power to make another administrator.
 *   teacher  Giáo viên — teaches: reads reports, writes questions, re-marks a
 *            paper. Cannot touch money, cannot change a learner's account, and
 *            cannot publish their own questions.
 *
 * ## Two boundaries worth explaining, because both were arguable
 *
 * **A teacher may WRITE questions but not PUBLISH them.** Writing questions is
 * the job; deciding that a question is fit for a real candidate's exam is a
 * different judgement, and separating them gives a school a review step it
 * would otherwise have to run on trust. `bank.write` and `bank.publish` are
 * therefore two capabilities and not one.
 *
 * **A manager may not read secrets or change settings.** Not because a manager
 * is not trusted — they can issue codes, which is money — but because the model
 * key and the backup credentials are the two things whose leak cannot be undone
 * by revoking anything. The blast radius decides the level, not seniority.
 */
'use strict';

/**
 * Every capability the admin area recognises.
 *
 * Named after what they let somebody DO rather than after the screen they sit
 * on, because screens get rearranged and permissions must not move when they
 * do. `codes.write` is still `codes.write` after the codes page is merged into
 * the learners page.
 */
const CAPS = [
  'reports.read',    // the dashboard, the platform-wide report
  'users.read',      // learner accounts: list and open
  'users.write',     // create, edit, verify, suspend, grant access
  'codes.read',      // activation codes: list and export
  'codes.write',     // issue and revoke — this one is money
  'tests.read',      // papers and their sections
  'tests.write',     // build, edit, publish and delete papers
  'bank.read',       // the question bank
  'bank.write',      // add and edit questions, and their audio
  'bank.publish',    // move a question to 'ready', i.e. into a real exam
  'marking.run',     // ask for a paper to be marked again
  'audit.read',      // who did what
  'settings.write',  // platform settings and the plans on sale
  'admins.manage',   // create administrators and set their level
  'secrets.manage'   // the model key, backups, the Classroom link
];

/**
 * Role → capabilities. The whole permission model, in one object.
 *
 * Written out per role rather than as "manager = teacher + extras", and that is
 * deliberate: an inheritance chain reads beautifully and hides exactly the
 * question somebody asks in an audit — *can a teacher issue a code?* — behind
 * two levels of indirection. Here it is answered by looking.
 */
const ROLES = {
  owner: {
    label: { en: 'Administrator', vi: 'Quản trị' },
    rank: 3,
    blurb: {
      en: 'Full control, including making other administrators, the model key and backups.',
      vi: 'Toàn quyền, kể cả tạo tài khoản quản trị, khoá mô hình và bản sao lưu.'
    },
    caps: CAPS.slice()          // everything, by construction rather than by list
  },
  manager: {
    label: { en: 'Manager', vi: 'Quản lý' },
    rank: 2,
    blurb: {
      en: 'Runs the school: learners, activation codes, papers, the question bank.',
      vi: 'Vận hành: học viên, mã kích hoạt, đề thi, ngân hàng câu hỏi.'
    },
    caps: [
      'reports.read',
      'users.read', 'users.write',
      'codes.read', 'codes.write',
      'tests.read', 'tests.write',
      'bank.read', 'bank.write', 'bank.publish',
      'marking.run',
      'audit.read'
    ]
  },
  teacher: {
    label: { en: 'Teacher', vi: 'Giáo viên' },
    rank: 1,
    blurb: {
      en: 'Teaching: reads reports, writes questions, re-marks papers. No money, no accounts.',
      vi: 'Giảng dạy: xem báo cáo, soạn câu hỏi, chấm lại bài. Không đụng tiền, không sửa tài khoản.'
    },
    caps: [
      'reports.read',
      'users.read',
      'tests.read',
      'bank.read', 'bank.write',
      'marking.run'
    ]
  }
};

const ROLE_NAMES = Object.keys(ROLES);

/* Any role this file does not know is treated as the LOWEST level, not as an
   error and never as the highest. A row whose role was mistyped, or written by
   a future version and then rolled back, must lose power rather than gain it. */
const FALLBACK = 'teacher';

/** The role record for a stored value, never null. */
function roleOf(name) {
  return ROLES[name] || ROLES[FALLBACK];
}

/** Is `name` a role this platform will actually store? */
function isRole(name) {
  return Object.prototype.hasOwnProperty.call(ROLES, name);
}

/** Can an admin with this role do this? */
function can(role, capability) {
  return roleOf(role).caps.includes(capability);
}

/** Everything this role can do, for the interface to gate on. */
function capsOf(role) {
  return roleOf(role).caps.slice();
}

/** The roles, highest first, for a picker. */
function list() {
  return ROLE_NAMES
    .map(name => ({ name, ...ROLES[name], caps: ROLES[name].caps.slice() }))
    .sort((a, b) => b.rank - a.rank);
}

/**
 * Express guard: this route needs this capability.
 *
 * Every guard is *named* `requireCap` on purpose. `scripts/security-map.mjs`
 * identifies guards by function name when it reads the Express stack, and an
 * anonymous closure from a factory would be invisible to it — the route would
 * appear unguarded in docs/SECURITY.md while being perfectly guarded in
 * reality, which is the worst of both: a document nobody can trust. The
 * capability itself rides along on `.cap` so the generated table can name it.
 */
function requireCap(capability) {
  if (!CAPS.includes(capability)) {
    /* Thrown at require() time, not at request time. A typo in a capability
       name would otherwise produce a guard that no role satisfies, which reads
       in production as "this feature is broken for everybody" rather than as
       what it is. Better to refuse to boot. */
    throw new Error('Unknown capability: ' + capability);
  }
  function requireCap(req, res, next) {
    if (!req.admin) return res.status(401).json({ error: 'Not signed in, or the session has expired.' });
    if (!can(req.admin.role, capability)) {
      return res.status(403).json({
        error: 'Your account level does not allow that.',
        need: capability,
        role: req.admin.role
      });
    }
    next();
  }
  requireCap.cap = capability;
  return requireCap;
}

module.exports = { CAPS, ROLES, ROLE_NAMES, FALLBACK, roleOf, isRole, can, capsOf, list, requireCap };
