/**
 * Who is allowed to see what.
 *
 * Lives on its own rather than inside the account API because two very
 * different callers need the same answer: the JSON API that tells the browser
 * what to render, and the page routes that must refuse a locked screen before
 * any of it reaches the network. Both have to agree, or the interface says one
 * thing and the server does another.
 */
'use strict';

const { q, nowISO } = require('./db');
const PLANS = require('./data/plans');

/**
 * What this account is actually allowed to do, right now.
 *
 * An account can hold more than one code — someone upgrades, or buys a second
 * term before the first runs out. The rules, in order:
 *
 *   · Only codes that are redeemed, carry a plan, and have not passed their
 *     access date count at all.
 *   · The strongest plan wins for features. Holding Starter and Plus together
 *     must not leave the self-study area locked.
 *   · Access runs to the furthest date any live code reaches.
 *   · Attempts add up across codes, and any uncapped code makes the whole
 *     entitlement uncapped.
 *
 * Returns null when nothing is active, which the interface reads as "locked,
 * offer the plans".
 */
async function entitlementOf(userId) {
  const now = nowISO();
  const live = (await q.all(
    `SELECT * FROM codes
      WHERE user_id=? AND status='redeemed' AND plan_id IS NOT NULL
        AND (access_expires_at IS NULL OR access_expires_at > ?)`, userId, now))
    .map(c => ({ row: c, plan: PLANS.byId(c.plan_id) }))
    .filter(x => x.plan);

  if (!live.length) return null;

  const best = live.reduce((a, b) => (PLANS.rank(b.plan.id) > PLANS.rank(a.plan.id) ? b : a));
  const expiresAt = live
    .map(x => x.row.access_expires_at)
    .filter(Boolean)
    .sort()
    .pop() || null;

  const unlimited = live.some(x => x.plan.attempts === PLANS.UNLIMITED);
  const attemptsLimit = unlimited ? null : live.reduce((n, x) => n + x.plan.attempts, 0);
  const attemptsUsed = live.reduce((n, x) => n + (x.row.attempts_used || 0), 0);

  return {
    planId: best.plan.id,
    planName: best.plan.name,
    expiresAt,
    attemptsLimit,                                   // null means uncapped
    attemptsUsed,
    attemptsLeft: attemptsLimit === null ? null : Math.max(0, attemptsLimit - attemptsUsed),
    features: {
      /* Merged across codes rather than taken from the best plan alone, so a
         weaker plan can never take away what a stronger one granted. */
      selfStudy: live.some(x => x.plan.features.selfStudy),
      detailedReport: live.some(x => x.plan.features.detailedReport)
    }
  };
}


module.exports = { entitlementOf };
