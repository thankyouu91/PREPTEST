/**
 * Subscription plans — the commercial model of the platform.
 *
 * One code unlocks one plan for one account, for a fixed number of months.
 * There is no per-exam or per-test purchase any more: the catalogue is VPET
 * only, so what a buyer picks is how long they practise and how much of the
 * platform they get.
 *
 *   starter-3m    499,000 VND    3 months    10 attempts, exam only
 *   plus-6m       799,000 VND    6 months    unlimited attempts, everything
 *   pro-12m     1,399,000 VND   12 months    unlimited attempts, everything
 *
 * Two things separate starter from the rest, and both are enforced server
 * side rather than merely hidden in the interface:
 *
 *   attempts     starter is capped at ten sittings for the whole term;
 *                the other two are uncapped ("luyện liên tục")
 *   selfStudy    the vocabulary / grammar / pronunciation area opens from
 *                799k up
 *   detailedReport  starter gets the score and band only; the others get the
 *                per-part breakdown with written feedback
 *
 * Money is stored in whole dong — never a float. Duration is stored in months
 * and turned into a date when a code is redeemed, so a code bought today and
 * redeemed in March starts counting in March.
 */
'use strict';

/** Uncapped attempts. Kept as a named constant so the meaning survives being
    written to the database and read back somewhere far away. */
const UNLIMITED = 0;

const PLANS = [
  {
    id: 'starter-3m',
    name: 'Starter',
    price: 499000,
    months: 3,
    attempts: 10,
    features: { selfStudy: false, detailedReport: false },
    tagline: 'Ten full sittings to see where you stand.',
    perks: [
      '10 full VPET sittings over 3 months',
      'Score and CEFR band after every sitting',
      'Every part of the test, exactly as the real thing'
    ],
    /* Said plainly rather than buried, because someone comparing plans needs
       to know what they are giving up. */
    limits: [
      'Practice stops after the tenth sitting',
      'Vocabulary and grammar area stays locked',
      'Score only - no per-part breakdown or written feedback'
    ]
  },
  {
    id: 'plus-6m',
    name: 'Plus',
    price: 799000,
    months: 6,
    attempts: UNLIMITED,
    features: { selfStudy: true, detailedReport: true },
    tagline: 'Practise without counting, and study between sittings.',
    perks: [
      'Unlimited VPET sittings for 6 months',
      'Full self-study area: vocabulary, grammar, linking words, pronunciation',
      'Detailed report: every part scored, with written feedback',
      'New practice sets as they are published'
    ],
    limits: []
  },
  {
    id: 'pro-12m',
    name: 'Pro',
    price: 1399000,
    months: 12,
    attempts: UNLIMITED,
    features: { selfStudy: true, detailedReport: true },
    tagline: 'A full year, for a target date that is further out.',
    perks: [
      'Unlimited VPET sittings for 12 months',
      'Full self-study area: vocabulary, grammar, linking words, pronunciation',
      'Detailed report: every part scored, with written feedback',
      'New practice sets as they are published',
      'Best value per month'
    ],
    limits: []
  }
];

const byId = id => PLANS.find(p => p.id === id) || null;

/** Rank plans so the strongest entitlement wins when an account holds more
    than one code. Ordered by what the plan grants, not by price. */
function rank(planId) {
  const i = PLANS.findIndex(p => p.id === planId);
  return i < 0 ? -1 : i;
}

module.exports = { PLANS, byId, rank, UNLIMITED };
