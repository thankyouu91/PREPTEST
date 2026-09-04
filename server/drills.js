/**
 * Drills: a short paper for one part, drawn to fit the learner.
 *
 * Block 4. A full VPET paper is 58 items and an hour, which is the right thing
 * to sit occasionally and the wrong thing to do on a Tuesday evening. A drill is
 * six to ten items from ONE part, ten minutes, and it exists so that "Part C is
 * your weakest" can be followed by a button rather than by advice.
 *
 * ## It is chosen FROM the ability report, and it feeds back INTO it
 *
 * This is the connection the owner asked for, and it runs in both directions:
 *
 *   `suggest()` reads `server/ability.js` — the same estimate the progress panel
 *   shows — and offers the parts the roadmap already ranks worst first, at the
 *   level that estimate implies. Nothing here keeps its own opinion of how good
 *   somebody is; there is one ability model in this platform.
 *
 *   Every marked answer goes back through `ability.record()` as a `skill_event`,
 *   so ten minutes of drilling moves the progress panel, the roadmap and the next
 *   drill's level. A learner can watch the thing they were told to fix change.
 *
 * ## Three rules that make a drill worth sitting
 *
 * **Nothing you have just seen.** An item answered in the last 30 days — in a
 * drill OR in a real paper — is not offered again. Practising recall of an
 * answer you remember is practising nothing, and it inflates the estimate at the
 * same time, which is worse than wasting the time.
 *
 * **At the level you are, not the level of the paper.** The level comes from the
 * per-part estimate, so somebody at B2 on Part A and B1 on Part C gets different
 * material for each. Falls back the same way the placement does when the bank is
 * thin at a level, and says which levels it actually used.
 *
 * **Weighted below a real paper.** A drill is untimed by section, retryable and
 * sat at the learner's convenience; a sitting is not. Recording both at weight 1
 * would let somebody drill their way to a band they could not hold under exam
 * conditions — the estimate would be true about drills and false about the exam,
 * which is the only thing it is for.
 */
'use strict';

const { q, nowISO } = require('./db');
const ability = require('./ability');
const marking = require('./marking');
const placement = require('./placement');
const formats = require('./data/exam-formats');
const ai = require('./ai-marking');
const rubric = require('./rubric');
const storage = require('./storage');
const repeat = require('./repeat');

/** How many items a drill holds. Ten minutes' worth, and the ceiling a request may ask for. */
const DEFAULT_SIZE = 6;
const MAX_SIZE = 10;

/** How long an item stays "just seen". */
const COOLDOWN_DAYS = 30;

/**
 * What a drill answer is worth against a real sitting.
 *
 * Not a guess dressed as one: 0.6 says a drill is worth rather more than half a
 * paper item and rather less than one. The exact number matters less than that
 * it is BELOW 1 and written down in one place — see the module note.
 */
const DRILL_WEIGHT = 0.6;

/** Marked against an answer key, so a drill of these gives feedback on the spot. */
const INSTANT_TYPES = ['mcq', 'gap'];

/**
 * How a part gets marked, and therefore what a drill of it looks like.
 *
 * A drill used to mean six machine-marked items and nothing else, which shut
 * six of the ten parts out of the practise screen entirely. Two of those six
 * are e-mails and one is spoken, and all three have material in the bank: they
 * were excluded by the marking path, not by a lack of content.
 *
 *   instant  mcq / gap. An answer key. Marked on submit, feedback immediately.
 *   written  essay. Goes to the AI marker with the rubric, like a real paper.
 *   spoken   speaking. Recorded, transcribed, then marked the same way.
 *
 * Read from the blueprint's own type list rather than a table of letters here,
 * so a change to the paper carries through on its own.
 */
function modeOf(part) {
  const sec = formats.sectionOfPart('vpet', part);
  const types = (sec && sec.types) || [];
  if (types.some(t => INSTANT_TYPES.includes(t))) return 'instant';
  if (types.includes('speaking')) return 'spoken';
  if (types.includes('essay')) return 'written';
  return null;
}

/** The question types a drill of this part may draw. */
function typesFor(part) {
  const m = modeOf(part);
  if (m === 'instant') return INSTANT_TYPES.slice();
  if (m === 'spoken') return ['speaking'];
  if (m === 'written') return ['essay'];
  return [];
}

/** How many items a drill of this part holds. An e-mail is not six of anything. */
const SIZE_BY_MODE = { instant: DEFAULT_SIZE, written: 1, spoken: 3 };

const jparse = (s, f) => { try { const v = JSON.parse(s); return v == null ? f : v; } catch { return f; } };
const clampInt = (v, lo, hi, dflt) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/**
 * Why this part is on the list, in one word the interface can label.
 *
 * Four cases, not three. "Not measured" used to cover both "there is no data"
 * and "there is data but not enough to be sure", which put the words
 * `Not measured yet - 6.5/10` on one line: a claim and its own contradiction,
 * side by side. Anybody reading that stops trusting both halves.
 */
function reasonFor(est) {
  if (!est || !est.n) return 'notMeasured';     // nothing at all
  if (!est.confident) return 'provisional';     // something, but not enough
  return est.score < 5 ? 'weakest' : 'belowTarget';
}

/** How many items each part has that a drill of that part could actually use. */
async function availableByPart() {
  /* Counted per part AND per type, because what makes a part practisable is
     having items of ITS OWN type. Counting only mcq and gap is what shut parts
     B, D and I out of the practise screen while their material sat in the bank
     unused: they were excluded by the marking path, not by a lack of content.

     One function, called from both suggest() and overview(). They had the same
     query written out twice, which is how a patch meant for one of them landed
     on the other and neither read as wrong. */
  const counts = await q.all(
    `SELECT part, type, COUNT(*) c FROM questions
      WHERE status = 'active' AND part IS NOT NULL AND type IN ('mcq','gap','essay','speaking')
      GROUP BY part, type`);

  /* A part the blueprint marks needsAudio is only practisable when its items
     really carry a recording. Without that check this function reported all ten
     parts as ready and the screen offered a Dictation drill whose prompt reads
     "Listen, then type the sentence exactly as you hear it" with nothing to
     hear: the dead button this whole screen was rebuilt to stop showing.
     Counted separately rather than folded into the query above, because the
     rule belongs to the blueprint and the blueprint is not in the database. */
  const withAudio = new Map(
    (await q.all(
      `SELECT part, COUNT(*) c FROM questions
        WHERE status = 'active' AND part IS NOT NULL AND audio_key IS NOT NULL
        GROUP BY part`)).map(r => [r.part, r.c]));

  const have = new Map();
  for (const r of counts) {
    if (!typesFor(r.part).includes(r.type)) continue;
    const sec = formats.sectionOfPart('vpet', r.part);
    let usable = sec && sec.needsAudio ? Math.min(r.c, withAudio.get(r.part) || 0) : r.c;
    /* A part whose questions share a recording counts in whole groups, and only
       the groups that are whole. Counting the recordings alone said Part G had
       12 practisable items when it has 36 in 12 groups — the number was the
       count of passages, not of questions — and counting every row said 36 when
       a half-broken group can drill none of them. */
    if (sec && sec.sharesAudio && (sec.group || 1) > 1) {
      usable = await wholeGroupItems(r.part, sec.group);
    }
    if (usable > 0) have.set(r.part, (have.get(r.part) || 0) + usable);
  }
  return have;
}

/**
 * Questions in COMPLETE groups of this part: every member still in use, and
 * exactly one of them carrying the recording they share.
 *
 * A group missing a question, or holding two recordings, cannot be drilled
 * honestly — the learner would be asked about a passage that never played, or
 * hear a second one halfway through — so it is not counted and not drawn.
 */
async function wholeGroupItems(part, size) {
  return await q.val(
    `SELECT COALESCE(SUM(n), 0) FROM (
       SELECT COUNT(*) n FROM questions
        WHERE status = 'active' AND part = ? AND group_key IS NOT NULL
        GROUP BY group_key
       HAVING COUNT(*) = ?
          AND SUM(CASE WHEN audio_key IS NOT NULL THEN 1 ELSE 0 END) = 1) t`, part, size) || 0;
}

/* ------------------------------ Choosing what ------------------------------ */

/**
 * The level to drill this part at, from the ability model.
 *
 * A part with no data does NOT default to the middle. It defaults to whatever
 * the learner's overall placement said, because that is the best evidence there
 * is — and starting somebody at B1 on a part when everything else about them
 * says B2 wastes the first drill proving something already known.
 */
function levelFor(abilityData, part, fallback, targetPaper) {
  const est = (abilityData.parts || {})[part];
  const overall = abilityData.overall || {};
  const confident = est && est.confident ? est : (overall.confident ? overall : null);
  const score = confident ? confident.score : null;

  /* Which shelf to take material from, not which certificate to award — so
     three coarse steps, and the score alone does not decide them.
     `materialLevel` is the average difficulty of the work the estimate was
     built from (server/ability.js), and without it an 8.5 earned entirely on
     B1 drills would send a learner straight to C1 material they cannot do.
     Eight and a half out of ten says "you have this shelf", and the useful
     next drill is the shelf ABOVE it. */
  let level;
  if (score == null) {
    level = fallback || placement.START_LEVEL;
  } else {
    const at = confident.materialLevel;
    const STEPS = ['A2', 'B1', 'B2', 'C1'];
    if (at == null) {
      /* No idea what they have been doing. The old behaviour, kept as the
         fallback rather than removed: better a coarse guess than no drill. */
      level = score >= 8.5 ? 'C1' : score >= 5.5 ? 'B2' : score >= 3.5 ? 'B1' : 'A2';
    } else {
      /* Round the material they have been on to a shelf, then move up one if
         they are comfortably on top of it and down one if they are not. */
      const here = Math.max(0, Math.min(STEPS.length - 1, Math.round(at) - 2));
      const move = score >= 8 ? 1 : (score < 4 ? -1 : 0);
      level = STEPS[Math.max(0, Math.min(STEPS.length - 1, here + move))];
    }
  }

  /* And capped by the paper they are working toward, because practice above
     the ceiling of their own paper is practice for a test they are not
     sitting. Level 1 tops out at B1+, so B2 material is already a stretch
     beyond it and C1 is simply the wrong exam; Level 2 starts at B1+, so
     anything below B2 is under the floor of what it will ask them. */
  if (targetPaper === 1 && level === 'C1') return 'B2';
  if (targetPaper === 2 && (level === 'A2' || level === 'B1')) return 'B2';
  return level;
}

/** Question ids this learner has met recently, whatever they met them in. */
async function recentlySeen(userId, days) {
  const since = new Date(Date.now() - (days || COOLDOWN_DAYS) * 86400e3).toISOString();
  /* From skill_events rather than from a drills-only table, deliberately: an
     item sat in a real paper last week is just as remembered as one drilled last
     week, and a cooldown that only knows about drills would serve it straight
     back. item_key is 'q<id>' by convention across every source. */
  const rows = await q.all(
    "SELECT DISTINCT item_key FROM skill_events WHERE user_id = ? AND at > ?", userId, since);
  const out = new Set();
  for (const r of rows) {
    const m = /^q(\d+)$/.exec(r.item_key || '');
    if (m) out.add(Number(m[1]));
  }
  return out;
}

/**
 * `size` items from one part, at `level`, avoiding `skip`.
 *
 * Widens to neighbouring levels when the bank is thin, exactly as the placement
 * does, and for the same reason — the alternative is a button that does nothing
 * for whoever is furthest ahead. If it still cannot fill after widening it
 * relaxes the cooldown as a LAST resort, because a repeated item is worse than
 * no drill only until there is no drill at all.
 */
async function drawItems(part, level, size, skip) {
  const picked = [];
  /* The part's OWN types, not mcq and gap for everybody. An e-mail part draws
     essays and a spoken part draws speaking prompts; drawing only the
     machine-marked types is what made six of the ten parts undrawable. */
  const kinds = typesFor(part);
  if (!kinds.length) return { items: [], repeated: false };
  const holes = kinds.map(() => '?').join(',');
  /* And a part whose blueprint says it needs audio may only draw items that
     have some, so a drill can never open on a prompt with nothing to hear. */
  const sec = formats.sectionOfPart('vpet', part);
  const audioClause = sec && sec.needsAudio ? ' AND audio_key IS NOT NULL' : '';
  /* Part G is one passage and three questions about it. Drawing rows one at a
     time drew only the row carrying the passage — 12 of the part's 36 questions
     were reachable at all, and the one that was drawn arrived without the two it
     belongs with, so "listen, then answer three questions" became "listen, then
     answer one". Whole groups, or none. */
  const groupSize = sec && sec.sharesAudio ? (sec.group || 1) : 1;

  const COLS = `id, part, type, prompt, options_json, level, explanation,
                audio_key, question_audio_key, group_key`;

  const take = async (lv, ignoreSkip) => {
    if (picked.length >= size) return;
    if (groupSize > 1) return takeGroups(lv, ignoreSkip);
    const rows = await q.all(
      `SELECT ${COLS}
         FROM questions
        WHERE status = 'active' AND part = ? AND level = ? AND type IN (${holes})${audioClause}
        ORDER BY RANDOM() LIMIT 60`, part, lv, ...kinds);
    for (const r of rows) {
      if (picked.length >= size) break;
      if (picked.some(p => p.id === r.id)) continue;
      if (!ignoreSkip && skip.has(r.id)) continue;
      picked.push(r);
    }
  };

  /** The grouped form of `take`: whole passages, in the order they were written. */
  const takeGroups = async (lv, ignoreSkip) => {
    const rows = await q.all(
      `SELECT ${COLS}
         FROM questions
        WHERE status = 'active' AND part = ? AND level = ? AND type IN (${holes})
          AND group_key IS NOT NULL
        ORDER BY group_key, id`, part, lv, ...kinds);
    const byGroup = new Map();
    for (const r of rows) {
      if (!byGroup.has(r.group_key)) byGroup.set(r.group_key, []);
      byGroup.get(r.group_key).push(r);
    }
    /* Only whole groups with exactly one recording between them — the same test
       availableByPart() counts on, so the number on the button is the number
       this can actually draw. */
    const usable = [...byGroup.values()].filter(g =>
      g.length === groupSize && g.filter(x => x.audio_key).length === 1);
    for (const g of usable.sort(() => Math.random() - 0.5)) {
      if (picked.length >= size) break;
      if (picked.some(p => p.group_key === g[0].group_key)) continue;
      if (!ignoreSkip && g.some(x => skip.has(x.id))) continue;
      /* A group that will not fit in what is left is skipped, not truncated —
         drawFromPool()'s rule in server/api.js, for the same reason. */
      if (picked.length + g.length > size) continue;
      /* The recording first: the passage is played once, at the top of the
         group, and everything after it is a question about what was heard. */
      const head = g.filter(x => x.audio_key).concat(g.filter(x => !x.audio_key));
      picked.push(...head);
    }
  };

  await take(level, false);

  if (picked.length < size) {
    const L = placement.LADDER;
    const i = Math.max(0, L.indexOf(level));
    for (let d = 1; d < L.length && picked.length < size; d++) {
      if (L[i - d]) await take(L[i - d], false);
      if (L[i + d]) await take(L[i + d], false);
    }
  }
  /* Only now, and it is recorded on the drill so the screen can be honest about
     it rather than quietly handing back last week's questions. */
  let repeated = false;
  if (!picked.length) {
    await take(level, true);
    repeated = picked.length > 0;
  }
  return { items: picked, repeated };
}

/**
 * What to drill next, worst first, ready to be turned into buttons.
 *
 * Straight from `ability.roadmap()` — the same ranking the progress panel and
 * the placement result screen show. Three lists that disagree about what is
 * weakest would be three lists nobody trusts.
 */
async function suggest(userId, weights, limit, targetPaper) {
  const cap = limit === undefined ? 3 : limit;
  const ab = await ability.abilityOf(userId);

  const have = await availableByPart();

  /* Which VPET paper this practice is for. Passed in by the caller that already
     knows (server/plan.js asks server/level-advice.js once and hands it down)
     rather than worked out again here, so a learner cannot be told to sit
     Level 2 on one line and given Level 1 drills on the next. */
  const row = (part, est) => ({
    part,
    level: levelFor(ab, part, undefined, targetPaper),
    score: est ? est.score : null,
    confident: est ? est.confident : false,
    needed: est ? est.needed : null,
    /* Why this one, in the words the learner will read. A ranked list with no
       reason beside it is a list people ignore. */
    reason: reasonFor(est),
    /* Said out loud rather than discovered by pressing a button that fails. */
    available: have.get(part) || 0
  });

  const out = ability.roadmap(ab, weights, 0.8, cap)
    .map(r => row(r.part, (ab.parts || {})[r.part]));

  /* Parts the model has never seen do not appear in `roadmap()` at all — it
     iterates over what it HAS data for. For a learner who has only just been
     placed that is most of the paper, and on the day they most need pointing
     somewhere the list came back empty. That was the whole feature failing at
     the one moment it mattered.
     So the shortfall is filled with the unmeasured parts, heaviest in the real
     paper first. It is the same principle the roadmap already runs on — the
     first thing to do about an unknown is go and measure it — applied to the
     parts that are not merely uncertain but absent. */
  if (out.length < cap) {
    const already = new Set(out.map(r => r.part));
    const unmeasured = [...have.keys()]
      .filter(p => !already.has(p) && !(ab.parts || {})[p])
      .sort((a, b) => ((weights && weights[b]) || 1) - ((weights && weights[a]) || 1));
    for (const p of unmeasured) {
      if (out.length >= cap) break;
      out.push(row(p, null));
    }
  }
  return out;
}

/**
 * All ten parts of the paper, whether or not any of them can be drilled.
 *
 * `suggest()` answers "what next" and caps at three. This answers a different
 * question: "what IS the exam, and where am I on each of it." The practise
 * screen showed three cards and hid the other seven parts behind a disclosure
 * triangle, which made a ten-part exam look like a three-item to-do list. A
 * candidate has to hold A to J in their head on the day; the screen should be
 * the same shape as the thing they are sitting.
 *
 * ## Honest about the six that cannot be drilled
 *
 * Only `INSTANT_TYPES` can be marked on the spot, which today is Parts A, C, E
 * and F. B and D are e-mails and G, H, I and J are spoken: they need the
 * writing and speaking markers, which need a full sitting. Rather than hide
 * them, or worse offer a button that fails, each is returned with
 * `drillable: false` and the reason, so the screen can say what it actually
 * takes to get a score there. A part the learner cannot see is a part they will
 * not prepare for.
 *
 * The blueprint is read from `server/data/exam-formats.js` rather than typed
 * out again here, so a change to the paper reaches this screen on its own.
 */
async function overview(userId, weights, targetPaper) {
  const ab = await ability.abilityOf(userId);

  /* The paper being worked toward caps the drill level, exactly as suggest()
     is told it by server/plan.js. This screen's per-part level was computed
     without it, so the practise page could offer C1 material to a learner the
     plan beside it had just told to sit Level 1. Asked here when the caller
     did not say, so both screens read one answer. */
  const target = targetPaper !== undefined ? targetPaper
    : (await require('./level-advice').recommendLevel(userId)).level;

  const have = await availableByPart();

  /* Position in the recommendation, so the screen can promote two or three
     without inventing a second ranking. Same call the plan and the progress
     panel make, so all three agree about what is worst. */
  const ranked = ability.roadmap(ab, weights, 0.8, 3).map(r => r.part);

  const letters = formats.partsOf('vpet');
  return letters.map(part => {
    const sec = formats.sectionOfPart('vpet', part) || {};
    const est = (ab.parts || {})[part];
    const available = have.get(part) || 0;
    /* How this part is marked, which decides what a drill of it looks like. */
    const mode = modeOf(part);
    const needs = mode === 'spoken' ? 'speaking' : mode === 'written' ? 'writing' : null;
    /* Why it cannot be practised, when it cannot. "Marked in a full paper" was
       the old catch-all and it is not true of E, F, G, H and J: a full paper
       cannot test them either, because their items are prompts waiting on a
       recording that has never been made. Saying which of the two it is turns
       "this platform is missing a feature" into "this part is waiting on
       content", which is the truth and is actionable by whoever makes it. */
    const blocked = available > 0 ? null
      : (sec.needsAudio ? 'needsAudio' : 'noItems');
    return {
      part,
      /* The blueprint stores "Part A - Sentence Completion"; the letter is
         already the card's headline, so it would read twice. */
      name: String(sec.name || '').replace(/^Part\s+\w+\s*-\s*/, ''),
      asks: sec.type || null,
      skill: sec.skill || null,
      items: sec.items || null,
      minutes: sec.minutes || null,
      drillable: available > 0,
      available,
      mode,
      needs,
      blocked,
      /* How many items a drill of this part holds, so the card can say
         "1 e-mail" rather than implying six of them. */
      drillSize: SIZE_BY_MODE[mode] || DEFAULT_SIZE,
      level: levelFor(ab, part, undefined, target),
      score: est ? est.score : null,
      confident: est ? est.confident : false,
      n: est ? est.n : 0,
      reason: reasonFor(est),
      /* 1-based so the screen can print it, null when not recommended. */
      rank: ranked.indexOf(part) >= 0 ? ranked.indexOf(part) + 1 : null
    };
  });
}

/* -------------------------------- Sitting one -------------------------------- */

function forClient(row) {
  const sec = formats.sectionOfPart('vpet', row.part) || {};
  return {
    questionId: row.id, part: row.part, type: row.type,
    prompt: row.prompt, options: jparse(row.options_json, null),
    /* Part D is capped below 100 words by server/rubric.js. A candidate who
       cannot see how far off they are learns about the cap from their mark,
       which is the wrong moment. */
    minWords: sec.minWords || null,
    hasAudio: !!row.audio_key,
    /* Part G asks its questions out loud, and the passage belongs to the group
       rather than to any one question. The screen needs both flags to play the
       passage on the item that carries it and each question on its own item —
       and `groupKey` to say "question 2 of 3 about this recording" instead of
       showing three unrelated-looking cards. */
    hasQuestionAudio: !!row.question_audio_key,
    groupKey: row.group_key || null
  };
}

async function start(userId, opts) {
  const o = opts || {};
  const part = String(o.part || '').trim().toUpperCase();
  if (!/^[A-J]$/.test(part)) return { error: 'bad-part' };
  const mode = modeOf(part);
  if (!mode) return { error: 'bad-part' };
  /* The natural size of THIS part. One e-mail, not six: a request asking for
     six e-mails would be forty minutes of writing sold as a ten-minute drill.
     A caller may still ask for fewer or more within the ceiling. */
  const natural = SIZE_BY_MODE[mode] || DEFAULT_SIZE;
  let size = clampInt(o.size, 1, mode === 'instant' ? MAX_SIZE : natural, natural);
  /* Rounded up to whole passages on a part that groups. Asking for five on a
     part that comes in threes draws three and reports a short drill — the size
     is a preference, and the group is not divisible. */
  {
    const gs = formats.sectionOfPart('vpet', part);
    const g = gs && gs.sharesAudio ? (gs.group || 1) : 1;
    if (g > 1 && size % g) size += g - (size % g);
  }

  const ab = await ability.abilityOf(userId);
  const level = /^(A2|B1|B2|C1)$/.test(String(o.level || '')) ? o.level : levelFor(ab, part);

  const skip = await recentlySeen(userId);
  const { items, repeated } = await drawItems(part, level, size, skip);
  if (!items.length) return { error: 'no-items', part, level };

  const res = await q.run(
    `INSERT INTO drills (user_id, part, level, size, item_ids_json, status, started_at, mode)
     VALUES (?,?,?,?,?, 'open', ?, ?)`,
    userId, part, level, items.length, JSON.stringify(items.map(i => i.id)), nowISO(), mode);

  return {
    drillId: Number(res.lastInsertRowid),
    part, level, repeated, mode,
    usedLevels: [...new Set(items.map(i => i.level))],
    items: items.map(forClient)
  };
}

/**
 * Mark a finished drill and write it into the ability model.
 *
 * The whole drill is marked in one call rather than item by item. That is not
 * only fewer round trips: a drill is a unit of practice, and showing the answer
 * to item three before item four is answered turns it into a quiz where the
 * later items are informed by the earlier ones.
 */
/**
 * The recording behind one drill item.
 *
 * Deliberately unlike the exam's version in one respect: there is no replay
 * limit. A paper caps replays because hearing a passage twice is part of what
 * it measures; a drill exists so somebody can listen to the same sentence six
 * times until they catch it. Carrying the exam's cap over would make the
 * practice worse than useless at exactly the thing it is for.
 */
async function itemAudio(userId, drillId, questionId, slot) {
  const d = await q.get('SELECT * FROM drills WHERE id = ? AND user_id = ?', drillId, userId);
  if (!d) return { error: 'not-found' };
  const ids = jparse(d.item_ids_json, []);
  if (!ids.includes(Number(questionId))) return { error: 'not-in-drill' };
  const row = await q.get(
    'SELECT audio_key, question_audio_key, group_key FROM questions WHERE id = ?', questionId);
  if (!row) return { error: 'no-audio' };

  /* Two slots, the same two the exam has. `question-audio` is the item's own
     question read aloud; `audio` is the stimulus — and on a grouped part the
     stimulus belongs to the GROUP, so an item that carries none falls back to
     the recording its group shares. Without that fallback the second and third
     questions of a Part G drill had nothing to play at all, which is why they
     were never drawn in the first place. */
  let key = slot === 'question-audio' ? row.question_audio_key : row.audio_key;
  if (!key && slot !== 'question-audio' && row.group_key) {
    key = await q.val(
      `SELECT audio_key FROM questions
        WHERE group_key = ? AND audio_key IS NOT NULL ORDER BY id LIMIT 1`, row.group_key);
  }
  if (!key) return { error: 'no-audio' };
  try {
    const file = await storage.get(key);
    return { body: file.body };
  } catch (e) {
    console.error('[drill] audio read failed', e);
    return { error: 'read-failed' };
  }
}

/**
 * Store one spoken answer's recording against a drill item.
 *
 * Mirrors the exam runner's route (server/exam-api.js): the same validation in
 * server/storage.js, and the same courtesy of deleting the previous file when
 * somebody re-records rather than leaving the store to fill with orphans.
 */
async function saveRecording(userId, drillId, questionId, bytes, mime) {
  const d = await q.get('SELECT * FROM drills WHERE id = ? AND user_id = ?', drillId, userId);
  if (!d) return { error: 'not-found' };
  if (d.status === 'done') return { error: 'already-done' };
  const ids = jparse(d.item_ids_json, []);
  if (!ids.includes(Number(questionId))) return { error: 'not-in-drill' };
  if (!bytes || !bytes.length) return { error: 'no-audio' };

  let stored;
  try {
    stored = await storage.putRecording(bytes, mime);
  } catch (e) {
    if (e && e.code === 'INVALID_AUDIO') return { error: 'bad-audio', message: e.message };
    console.error('[drill] recording save failed', e);
    return { error: 'store-failed' };
  }

  const prev = await q.get(
    'SELECT audio_key FROM drill_answers WHERE drill_id=? AND question_id=?', drillId, questionId);
  await q.run(
    `INSERT INTO drill_answers (drill_id, question_id, audio_key)
     VALUES (?,?,?)
     ON CONFLICT(drill_id, question_id) DO UPDATE SET audio_key=excluded.audio_key`,
    drillId, questionId, stored.key);
  if (prev && prev.audio_key) await storage.remove(prev.audio_key).catch(() => {});

  return { ok: true, bytes: bytes.length, savedAt: nowISO() };
}

/**
 * Hand in a drill of a part that has no answer key: parts B and D (e-mails)
 * and G, H, I and J (spoken).
 *
 * The same road a real paper takes, deliberately. `ai.markOne()` returns the
 * criteria, `rubric.combine()` turns them into a mark and applies the caps, and
 * the result is recorded as a `skill_event` at the drill weight like any other
 * practice. Marking a drill with a second, gentler rule would produce a number
 * that flatters the learner and disagrees with their paper.
 *
 * ## It never invents a score
 *
 * The marker is optional configuration. When it is absent, or refuses, or a
 * recording cannot be transcribed, the drill is left at `marking` and says so.
 * A zero would be a lie about the answer and a fabricated number would be
 * worse; both would also reach the ability model, which is the one thing on
 * this platform that must not be fed guesses.
 */
async function submitMarked(userId, d, answers) {
  const drillId = d.id;
  const ids = jparse(d.item_ids_json, []);
  const given = new Map();
  for (const a of Array.isArray(answers) ? answers : []) {
    const id = Number(a && a.questionId);
    /* Only the items this drill served, same guard as the answer-key path. */
    if (ids.includes(id)) given.set(id, String((a && a.answer) || ''));
  }

  const rows = ids.length
    ? await q.all(
        /* ext_key comes along so a Part H drill can be marked by comparison
           against the sentence the candidate heard, the same way a real paper's
           Part H is. See the note at the markOne call below. */
        `SELECT id, part, type, level, prompt, ext_key, script, model_answer
           FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`,
        ...ids)
    : [];

  const at = nowISO();
  const events = [];
  const detail = [];
  let earned = 0, max = 0, pending = 0;
  /* Set when a failure is about the CONFIGURATION rather than this item — a
     spending ceiling, a key the provider will not accept. The remaining items
     would meet the identical refusal, and a spoken one would pay for its
     transcription first, so the loop stops and leaves them honestly pending. */
  let stopped = null;

  for (const row of rows) {
    /* A spoken answer is a recording, uploaded before submitting; a written one
       arrives in this request. */
    const stored = await q.get(
      'SELECT answer, audio_key FROM drill_answers WHERE drill_id=? AND question_id=?', drillId, row.id);
    const text = d.mode === 'written'
      ? (given.has(row.id) ? given.get(row.id) : String((stored && stored.answer) || ''))
      : '';
    const audioKey = d.mode === 'spoken' ? (stored && stored.audio_key) || null : null;

    const save = async (note, mark) => {
      await q.run(
        `INSERT INTO drill_answers (drill_id, question_id, answer, audio_key, earned, max_score, note)
         VALUES (?,?,?,?,?,?,?)
         ON CONFLICT(drill_id, question_id) DO UPDATE SET
           answer=excluded.answer, audio_key=excluded.audio_key,
           earned=excluded.earned, max_score=excluded.max_score, note=excluded.note`,
        drillId, row.id, text, audioKey,
        mark ? mark.earned : null, mark ? mark.max : null, note);
    };

    /* Something already told us the next call will be refused the same way.
       Record the rest honestly instead of buying the same answer per item. */
    if (stopped) {
      pending++; await save(stopped, null);
      detail.push({ questionId: row.id, prompt: row.prompt, given: text, pending: true, note: stopped });
      continue;
    }

    /* Nothing handed in. Marked zero rather than left pending: a blank answer is
       a complete and correct thing to know about somebody. */
    if (d.mode === 'written' ? !text.trim() : !audioKey) {
      await save('Left blank', { earned: 0, max: 1 });
      earned += 0; max += 1;
      events.push({
        user_id: userId, source: 'drill', ref_id: 'drill:' + drillId, item_key: 'q' + row.id,
        skill: placement.skillOfPart(row.part), part: row.part, level: row.level,
        earned: 0, max_score: 1, weight: DRILL_WEIGHT, at
      });
      detail.push({ questionId: row.id, prompt: row.prompt, given: text, right: false,
        pending: false, note: 'Left blank' });
      continue;
    }

    /* Speech first has to become words. */
    let heard = null;
    if (d.mode === 'spoken') {
      if (!(await ai.canTranscribe())) {
        pending++; await save('Waiting to be marked: no transcription service is configured.', null);
        detail.push({ questionId: row.id, prompt: row.prompt, given: '', pending: true,
          note: 'Waiting to be marked: no transcription service is configured.' });
        continue;
      }
      try {
        const file = await storage.get(audioKey);
        /* `userId` is not decoration. server/ai-budget.js keys the per-account
           ceiling on it, so a call made without one is counted against the
           platform total and against nobody in particular: the 240-a-day limit
           silently never applies, and the ledger row that is supposed to say
           who spent the money says NULL. A practice drill is the cheapest way
           to make these calls and was the one path that skipped the meter. */
        /* The type comes from the bytes, as it does on a real paper. storage
           hands back `{ body }` and nothing else, so `file.mime` was always
           undefined, the multipart went out as `answer.mp3`, and a service
           that decides by extension refused every WebM a browser records. */
        const bytes = file.body || file;
        heard = await ai.transcribe(bytes, storage.sniffMime(bytes), { userId });
      } catch (e) {
        console.warn('[drill] transcription failed: ' + ai.scrub(e && e.message));
        if (e && e.budget) stopped = e.budget.en;
        else if (e && e.retryable === false) stopped = 'Waiting to be marked: the transcription '
          + 'service would not accept the key. An administrator has to look at the settings.';
        heard = null;
      }
      if (!heard) {
        const note = stopped || 'Waiting to be marked: the recording could not be turned into words.';
        pending++; await save(note, null);
        detail.push({ questionId: row.id, prompt: row.prompt, given: '', pending: true, note });
        continue;
      }
    }

    let verdict = null;

    /* Part H is measured rather than judged, here as on a real paper: the
       candidate heard a sentence and had to say it back, the sentence is on the
       bank item, and comparing two strings answers the question a model was
       being paid to have an opinion about. Same scorer, same two criteria, so a
       drill mark and a paper mark mean the same thing — which is the point of
       drills going down the real road at all. */
    const sentence = row.part === 'H' ? repeat.sentenceFor(row) : null;
    if (sentence && heard) {
      verdict = repeat.score(sentence, heard);
    } else {
      try {
        verdict = await ai.markOne({
          part: row.part, level: row.level, prompt: row.prompt,
          /* A drill has no paper, so the level the drill was BUILT at is the
             range to mark against — the same role tests.level plays on a real
             sitting. Passing it separately from the item's own level matters
             here for the same reason it does there: the item's difficulty must
             not move the scale. */
          paperLevel: d.level, family: 'vpet',
          answer: text, heard, source: d.mode === 'spoken' ? 'transcript' : 'text',
          userId                                  // the meter: see the note above
        });
      } catch (e) {
        console.warn('[drill] item ' + row.id + ' could not be marked: ' + ai.scrub(e && e.message));
        if (e && e.budget) stopped = e.budget.en;
        else if (e && e.retryable === false) stopped = 'Waiting to be marked: the marking service '
          + 'refused the request. An administrator has to look at the settings.';
      }
    }
    if (!verdict) {
      const note = stopped || 'Waiting to be marked: the marker could not be reached.';
      pending++; await save(note, null);
      detail.push({ questionId: row.id, prompt: row.prompt, given: heard || text, pending: true, note });
      continue;
    }

    /* The criteria decide the mark, not the model's headline number, and the
       caps in server/rubric.js apply here exactly as they do to a paper. */
    const graded = rubric.combine(row.part, verdict.criteria, {
      answer: heard || text, stimulus: row.prompt, fallbackScore: verdict.score
    }) || { score: verdict.score, criteria: [], caps: [] };

    /* One item is worth one, and the rubric works out of ten, so it is stored
       as a fraction of one. Two scales in one column is a reader's problem. */
    const mark = { earned: Math.max(0, Math.min(1, graded.score / 10)), max: 1 };
    earned += mark.earned; max += mark.max;
    await save(verdict.note || null, mark);
    events.push({
      user_id: userId, source: 'drill', ref_id: 'drill:' + drillId, item_key: 'q' + row.id,
      skill: placement.skillOfPart(row.part), part: row.part, level: row.level,
      earned: mark.earned, max_score: mark.max, weight: DRILL_WEIGHT, at
    });
    detail.push({
      questionId: row.id, prompt: row.prompt, given: heard || text, pending: false,
      score: Math.round(graded.score * 10) / 10,
      right: graded.score >= 5,
      note: verdict.note || null,
      criteria: graded.criteria || [],
      caps: graded.caps || [],
      /* A candidate reading a speaking mark is entitled to know that the mark
         was made from a transcript and nobody listened to their voice. */
      heard: d.mode === 'spoken' ? heard : null
    });
  }

  const wrote = await ability.record(events);
  const done = pending === 0;
  await q.run(
    'UPDATE drills SET status=?, done_at=?, earned=?, max_score=? WHERE id=?',
    done ? 'done' : 'marking', done ? at : null, earned, max, drillId);

  return {
    drillId, part: d.part, level: d.level, mode: d.mode,
    earned: Math.round(earned * 10) / 10, max,
    pending, recorded: wrote, detail
  };
}

async function submit(userId, drillId, answers) {
  const d = await q.get('SELECT * FROM drills WHERE id = ? AND user_id = ?', drillId, userId);
  if (!d) return { error: 'not-found' };
  if (d.status === 'done') return { error: 'already-done' };
  /* An e-mail or a spoken answer does not have an answer key, so it takes a
     different road: to the marker and the rubric, exactly the one a real paper
     takes. Everything after this line is the answer-key path. */
  if (d.mode === 'written' || d.mode === 'spoken') return submitMarked(userId, d, answers);

  const ids = jparse(d.item_ids_json, []);
  const given = new Map();
  for (const a of Array.isArray(answers) ? answers : []) {
    const id = Number(a && a.questionId);
    /* Only the items this drill actually served. Without the check, a client can
       post answers to anything in the bank and farm skill_events for items it
       chose itself. */
    if (ids.includes(id)) given.set(id, String((a && a.answer) || ''));
  }

  const rows = ids.length
    ? await q.all(
        `SELECT id, part, type, level, answer, prompt, explanation
           FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];

  const at = nowISO();
  const events = [];
  const detail = [];
  let earned = 0, max = 0;

  for (const row of rows) {
    const mine = given.has(row.id) ? given.get(row.id) : '';
    const mark = marking.markItem({ type: row.type, answer: row.answer }, mine);
    if (!mark) continue;
    earned += mark.earned; max += mark.max;
    await q.run(
      `INSERT INTO drill_answers (drill_id, question_id, answer, earned, max_score, note)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(drill_id, question_id) DO UPDATE SET
         answer=excluded.answer, earned=excluded.earned,
         max_score=excluded.max_score, note=excluded.note`,
      drillId, row.id, mine, mark.earned, mark.max, mark.note);
    events.push({
      user_id: userId, source: 'drill', ref_id: 'drill:' + drillId, item_key: 'q' + row.id,
      skill: placement.skillOfPart(row.part), part: row.part, level: row.level,
      earned: mark.earned, max_score: mark.max, weight: DRILL_WEIGHT, at
    });
    detail.push({
      questionId: row.id, prompt: row.prompt, given: mine,
      right: mark.earned > 0,
      /* The answer key IS returned here, and only here. Before submitting it
         would be cheating; afterwards, withholding it is the difference between
         practice and a score. The item is on cooldown for 30 days anyway. */
      answer: row.answer,
      explanation: row.explanation || null
    });
  }

  const wrote = await ability.record(events);

  await q.run(
    "UPDATE drills SET status='done', done_at=?, earned=?, max_score=? WHERE id=?",
    at, earned, max, drillId);

  return {
    drillId, part: d.part, level: d.level,
    earned, max,
    score: max ? Math.round((earned / max) * 10 * 2) / 2 : null,
    /* Returned so a caller — and the test — can see that the ability model
       really took them, rather than trusting that it did. */
    recorded: wrote,
    detail
  };
}

/** One drill, for a screen that reloads. */
async function get(userId, drillId) {
  const d = await q.get('SELECT * FROM drills WHERE id = ? AND user_id = ?', drillId, userId);
  if (!d) return null;
  const ids = jparse(d.item_ids_json, []);
  const rows = ids.length
    ? await q.all(`SELECT id, part, type, prompt, options_json FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];
  return {
    drillId: d.id, part: d.part, level: d.level, status: d.status,
    earned: d.earned, max: d.max_score,
    items: d.status === 'done' ? [] : rows.map(forClient)
  };
}

/** The last few, for a screen that wants to show progress rather than a number. */
function history(userId, limit) {
  return q.all(
    `SELECT id drillId, part, level, earned, max_score max, done_at doneAt
       FROM drills WHERE user_id = ? AND status = 'done'
      ORDER BY done_at DESC LIMIT ?`, userId, clampInt(limit, 1, 50, 10));
}

module.exports = {
  suggest, overview, modeOf, typesFor, submitMarked, saveRecording, itemAudio, availableByPart, start, submit, get, history,
  levelFor, recentlySeen, drawItems,
  DEFAULT_SIZE, MAX_SIZE, COOLDOWN_DAYS, DRILL_WEIGHT, INSTANT_TYPES
};
