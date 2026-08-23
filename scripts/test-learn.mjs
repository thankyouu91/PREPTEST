/**
 * Self-study tests: the two lookup APIs (irregular verbs, linking words), the
 * grammar API across all nine groups, and the eleven pages that use them.
 *
 * The focus is data quality, not just HTTP status codes: an example sentence
 * has to actually contain the item it illustrates, every entry needs its
 * Vietnamese gloss, and a filter has to filter rather than quietly return all.
 *
 * Run with the server up: node scripts/test-learn.mjs
 */
import { launchChromium } from './_browser.mjs';
import { DEMO_PASSWORD } from './_demo.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';

let pass = 0, fail = 0;
const ok = (c, name) => { c ? (pass++, console.log('✓ ' + name)) : (fail++, console.log('✗ ' + name)); };

const get = async (p) => (await fetch(BASE + p)).json();

async function login(ctx) {
  const page = await ctx.newPage();
  await page.goto(BASE + '/prep/dang-nhap/', { waitUntil: 'networkidle' });
  await page.fill('#email', 'student');
  await page.fill('#password', DEMO_PASSWORD);
  await page.click('#submit');
  await page.waitForURL(u => !u.pathname.includes('dang-nhap'), { timeout: 10000 });
  return page;
}

const browser = await launchChromium({ args: ['--no-sandbox'] });

try {
  /* ============ 1. Irregular verbs ============ */
  console.log('\n\x1b[1m== Irregular-verb API ==\x1b[0m');

  const irr = await get('/api/learn/irregular-verbs');
  ok(irr.total >= 190, 'The table holds at least 190 verbs (' + irr.total + ')');
  ok(irr.count === irr.verbs.length, 'count matches the number of items returned');

  const vAll = irr.verbs;
  ok(vAll.every(v => v.v1 && v.v2 && v.v3 && v.ving), 'Every verb has all of V1-V2-V3-Ving');
  ok(vAll.every(v => v.vi && v.vi.trim()), 'Every verb has a Vietnamese gloss');
  ok(vAll.every(v => v.ipaUk && v.ipaUs), 'Every verb has UK and US phonetics');
  ok(vAll.every(v => ['aaa', 'aba', 'abb', 'abc'].includes(v.group)), 'The group is always one of aaa/aba/abb/abc');
  ok(new Set(vAll.map(v => v.v1)).size === vAll.length, 'No two entries share a V1');

  /* The group has to match the real shape, or the grouping is decoration */
  const wrongGrp = vAll.filter(v => {
    const [a, b, c] = [v.v1.toLowerCase(), v.v2.toLowerCase(), v.v3.toLowerCase()];
    const shape = a === b && b === c ? 'aaa' : a === c && a !== b ? 'aba'
      : b === c && a !== b ? 'abb' : 'abc';
    return shape !== v.group;
  });
  ok(wrongGrp.length === 0, 'The group matches each verb\'s real shape' +
    (wrongGrp.length ? ' (wrong: ' + wrongGrp.slice(0, 5).map(v => v.v1).join(', ') + ')' : ''));

  /* The example has to contain at least one form of the verb itself.
     A few cells hold two variants split by '/' (be -> "was/were", learn ->
     "learnt/learned"), so split them apart before comparing. */
  const forms = v => [v.v1, v.v2, v.v3, v.ving]
    .flatMap(f => f.split('/')).map(f => f.trim().toLowerCase()).filter(Boolean);
  const exBad = vAll.filter(v => {
    if (!v.exEn) return false;
    const s = v.exEn.toLowerCase();
    return !forms(v).some(f => s.includes(f));
  });
  ok(exBad.length === 0, 'The example contains the verb it illustrates' +
    (exBad.length ? ' (wrong: ' + exBad.slice(0, 5).map(v => v.v1).join(', ') + ')' : ''));

  const irrA1 = await get('/api/learn/irregular-verbs?level=A1');
  ok(irrA1.verbs.length > 0 && irrA1.verbs.every(v => v.level === 'A1'), 'Filtering by level A1 returns only that level');
  ok(irrA1.verbs.length < irr.count, 'Filtering by level narrows the result');

  const irrAbc = await get('/api/learn/irregular-verbs?group=abc');
  ok(irrAbc.verbs.length > 0 && irrAbc.verbs.every(v => v.group === 'abc'), 'Filtering by group abc returns only that group');

  const irrKw = await get('/api/learn/irregular-verbs?q=go');
  ok(irrKw.verbs.some(v => v.v1 === 'go'), 'Searching "go" finds the verb go');

  const irrJunk = await get('/api/learn/irregular-verbs?level=Z9&group=xxx');
  ok(irrJunk.count === irr.count, 'A junk filter value is ignored rather than breaking the query');

  /* read: V2/V3 are spelled like V1 but said differently — it needs a pronunciation note */
  const read = vAll.find(v => v.v1 === 'read');
  ok(read && read.note && /red/i.test(read.note), 'The verb "read" carries the /red/ pronunciation-trap note');

  /* ============ 2. Linking words ============ */
  console.log('\n\x1b[1m== Linking-word API ==\x1b[0m');

  const lw = await get('/api/learn/linking-words');
  ok(lw.total >= 120, 'The table holds at least 120 linking words (' + lw.total + ')');
  ok(lw.count === lw.words.length, 'count matches the number of items returned');
  ok(Array.isArray(lw.functions) && lw.functions.length === 13, 'All 13 functions come back');
  ok(Array.isArray(lw.registers) && lw.registers.length === 3, 'All 3 registers come back');
  ok(lw.functions.every(f => f.id && f.label), 'Every function has an id and a Vietnamese label');

  const wAll = lw.words;
  const fnIds = new Set(lw.functions.map(f => f.id));
  const regIds = new Set(lw.registers.map(r => r.id));
  ok(wAll.every(w => fnIds.has(w.fn)), 'Every linking word belongs to a declared function');
  ok(wAll.every(w => regIds.has(w.register)), 'Every linking word has a valid register');
  ok(wAll.every(w => w.vi && w.vi.trim()), 'Every linking word has a Vietnamese gloss');
  ok(wAll.every(w => w.punct && w.punct.trim()), 'Every linking word has a punctuation rule');
  ok(wAll.every(w => w.exEn && w.exVi), 'Every linking word has a bilingual English-Vietnamese example');

  /* The example has to really use that linking word — catches data joined to the wrong row */
  const lwBad = wAll.filter(w => !w.exEn.toLowerCase().includes(w.word.toLowerCase().split(' ')[0]));
  ok(lwBad.length === 0, 'The example really contains the linking word it illustrates' +
    (lwBad.length ? ' (wrong: ' + lwBad.slice(0, 5).map(w => w.word).join(', ') + ')' : ''));

  /* One word can carry several functions, but the same pair must not repeat */
  const pairs = wAll.map(w => w.word + '|' + w.fn);
  ok(new Set(pairs).size === pairs.length, 'No duplicate (word, function) pair');

  /* Every function needs at least a few words, or that group is a gap on the page */
  const thin = lw.functions.filter(f => wAll.filter(w => w.fn === f.id).length < 5);
  ok(thin.length === 0, 'Every function has at least 5 words' +
    (thin.length ? ' (thin: ' + thin.map(f => f.id).join(', ') + ')' : ''));

  const lwFn = await get('/api/learn/linking-words?fn=contrast');
  ok(lwFn.words.length > 0 && lwFn.words.every(w => w.fn === 'contrast'), 'Filtering by function returns only that function');
  ok(lwFn.words.length < lw.count, 'Filtering by function narrows the result');

  const lwReg = await get('/api/learn/linking-words?register=academic');
  ok(lwReg.words.length > 0 && lwReg.words.every(w => w.register === 'academic'), 'Filtering by register returns only that register');

  const lwLvl = await get('/api/learn/linking-words?level=b1');
  ok(lwLvl.words.length > 0 && lwLvl.words.every(w => w.level === 'B1'), 'Filtering by level accepts lower case');

  const lwKw = await get('/api/learn/linking-words?q=however');
  ok(lwKw.words.some(w => w.word === 'however'), 'Searching "however" finds the right word');

  const lwJunk = await get('/api/learn/linking-words?fn=no-such-function&register=xyz');
  ok(lwJunk.count === lw.count, 'A junk filter value is ignored rather than breaking the query');

  /* The classic learner error: using "however" as a conjunction joining two clauses */
  const however = wAll.find(w => w.word === 'however');
  ok(however && however.warn && /chấm|;/.test(however.warn),
    '"however" warns that it needs a full stop or a semicolon');
  ok(wAll.filter(w => w.warn && w.warn.trim()).length >= 40, 'At least 40 entries carry a misuse warning');

  /* ============ 3. Grammar: the 12 tenses + tense sequencing ============ */
  console.log('\n\x1b[1m== Grammar API (tenses and tense sequencing) ==\x1b[0m');

  const gr = await get('/api/learn/grammar?grp=tense');
  ok(gr.count === 21, 'All 21 points are there: 12 tenses + 9 sequencing points (' + gr.count + ')');
  ok(gr.points.every(p => p.grp === 'tense'), 'Filtering by group returns only that group');
  ok(gr.points.every(p => p.nameVi && p.nameEn && p.summary), 'Every point has a Vietnamese name, an English name and a summary');
  ok(gr.points.every(p => ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(p.level)), 'The level is always valid');
  ok(new Set(gr.points.map(p => p.slug)).size === 21, 'No two points share a slug');

  /* The quota for the "Tenses" group in docs/LEARNING.md §2. This is the backstop
     for the "never inflate the count to look generous" rule. */
  const tByLevel = gr.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const T_QUOTA = { A1: 4, A2: 4, B1: 4, B2: 4, C1: 3, C2: 2 };
  const tenseOff = Object.keys(T_QUOTA).filter(l => tByLevel[l] !== T_QUOTA[l]);
  ok(tenseOff.length === 0, 'Exactly the quota A1 4, A2 4, B1 4, B2 4, C1 3, C2 2' +
    (tenseOff.length ? ' (off: ' + tenseOff.map(l => l + ' ' + (tByLevel[l] || 0) + '/' + T_QUOTA[l]).join(', ') + ')' : ''));

  /* Two halves written to two different standards: the 12 tenses carry a three-row
     formula and 8+12 sentences; the 9 sequencing points use a free-form formula table
     and 6+10, like every group written later. Checked apart, not levelled down. */
  const TWELVE_TENSES = ['present-simple', 'present-continuous', 'present-perfect',
    'present-perfect-continuous', 'past-simple', 'past-continuous', 'past-perfect',
    'past-perfect-continuous', 'future-simple', 'future-continuous', 'future-perfect',
    'future-perfect-continuous'];
  const tenses = gr.points.filter(p => TWELVE_TENSES.includes(p.slug));
  const sequencingPoints = gr.points.filter(p => !TWELVE_TENSES.includes(p.slug));
  ok(tenses.length === 12 && sequencingPoints.length === 9,
    'All 12 tenses and all 9 sequencing points (' + tenses.length + ' + ' + sequencingPoints.length + ')');

  /* The formula needs all three forms, or the lesson is only half written */
  const formRows = p => (p.formula && p.formula.rows || []).filter(r => r && r[1]);
  const noForm = tenses.filter(p => formRows(p).length !== 3);
  ok(noForm.length === 0, 'Every tense has an affirmative, a negative and a question formula' +
    (noForm.length ? ' (missing: ' + noForm.map(p => p.slug).join(', ') + ')' : ''));
  ok(sequencingPoints.every(p => formRows(p).length >= 2), 'Every sequencing point has at least two formula rows');
  ok(gr.points.every(p => p.signals && p.signals.length), 'Every point has its signal words');
  ok(tenses.every(p => p.counts.example === 8), 'Every tense has exactly 8 examples');
  ok(tenses.every(p => p.counts.practice === 12), 'Every tense has exactly 12 practice sentences');
  ok(sequencingPoints.every(p => p.counts.example === 6), 'Every sequencing point has exactly 6 examples');
  ok(sequencingPoints.every(p => p.counts.practice === 10), 'Every sequencing point has exactly 10 practice sentences');

  const grLvl = await get('/api/learn/grammar?grp=tense&level=a1');
  ok(grLvl.count > 0 && grLvl.points.every(p => p.level === 'A1'), 'Filtering by level accepts lower case');
  ok(grLvl.count < 21, 'Filtering by level narrows the result');

  const gr404 = await fetch(BASE + '/api/learn/grammar/no-such-point');
  ok(gr404.status === 404, 'An unknown slug returns 404');

  /* Every point in detail: this is where a content slip usually gets through */
  let exTotal = 0, prTotal = 0;
  const flaws = [];
  for (const p of gr.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    exTotal += d.examples.length;
    prTotal += d.practice.length;

    if (!d.point.useWhen.length) flaws.push(p.slug + ': no "when to use it"');
    if (!d.point.useNot.length) flaws.push(p.slug + ': no "when NOT to use it"');
    if (!d.point.confuse.length) flaws.push(p.slug + ': no telling-apart section');
    if (!d.point.errors.length) flaws.push(p.slug + ': no common mistakes');
    if (d.point.useNot.some(u => !u.what || !u.why)) flaws.push(p.slug + ': a "do not use" entry gives no reason');
    if (d.point.errors.some(e => !e.wrong || !e.right || !e.why)) flaws.push(p.slug + ': a mistake has no fix or no reason');
    if (d.point.confuse.some(c => !c.with || !c.tell || !c.pair || c.pair.length !== 2)) {
      flaws.push(p.slug + ': a telling-apart pair does not have two sentences');
    }
    if (d.examples.some(x => !x.en || !x.vi)) flaws.push(p.slug + ': an example is not bilingual');
    if (d.practice.some(x => !x.en || !x.vi || !x.answer)) flaws.push(p.slug + ': a practice sentence has no gloss or no answer');

    /* A counter-example needs a note, or the learner sees a wrong sentence and no way to fix it */
    if (d.examples.some(x => !x.ok && !x.note)) flaws.push(p.slug + ': a counter-example has no fix');
    if (!d.examples.some(x => !x.ok)) flaws.push(p.slug + ': no counter-example at all');

    /* The number of gaps has to match the number of answer parts — catches a typo in the data */
    const gapMismatch = d.practice.filter(x =>
      (x.en.match(/___/g) || []).length !== x.answer.split('…').length);
    if (gapMismatch.length) flaws.push(p.slug + ': ' + gapMismatch.length + ' practice sentences with gaps and answers out of step');
  }
  ok(exTotal === 150, 'All 150 examples: 12 tenses x 8 + 9 points x 6 (' + exTotal + ')');
  ok(prTotal === 234, 'All 234 practice sentences: 12 tenses x 12 + 9 points x 10 (' + prTotal + ')');
  ok(flaws.length === 0, 'Every point has all four sections and clean data' +
    (flaws.length ? ' — ' + flaws.slice(0, 6).join('; ') : ''));

  /* Check the academic content where it is easiest to get wrong */
  const pp = await get('/api/learn/grammar/present-perfect');
  ok(pp.point.confuse.some(c => /quá khứ đơn/i.test(c.with)),
    'The present perfect is set against the past simple — the classic Vietnamese-learner error');
  ok(pp.point.useNot.some(u => /yesterday|mốc/i.test(u.what + u.why)),
    'The present perfect warns against a fixed past time marker');

  const pc = await get('/api/learn/grammar/present-continuous');
  ok(pc.point.useNot.some(u => /trạng thái/i.test(u.what + u.why)),
    'The present continuous warns about stative verbs');

  const fs = await get('/api/learn/grammar/future-simple');
  ok(fs.point.useNot.some(u => /if|when|điều kiện|thời gian/i.test(u.what + u.why)),
    'The future simple warns against "will" in an if/when clause');

  /* Tense sequencing: look at the places easiest to write wrong */
  const seq = await get('/api/learn/grammar/sequence-before-after');
  ok(seq.point.useNot.some(u => /will/i.test(u.what + u.why)),
    '"before/after" warns against "will" in a time clause');
  ok(seq.point.confuse.some(c => /quá khứ hoàn thành/i.test(c.tell)),
    '"before/after" is set against the case that forces the past perfect');

  const fip = await get('/api/learn/grammar/future-in-the-past');
  ok(fip.point.confuse.some(c => /điều kiện/i.test(c.with)),
    'The future in the past is kept apart from the conditional "would"');

  const hp = await get('/api/learn/grammar/historic-present');
  ok(hp.point.confuse.some(c => /trôi thì/i.test(c.with)),
    'The historic present is distinguished from accidental tense drift');

  const aw = await get('/api/learn/grammar/tense-academic-writing');
  ok(aw.point.confuse.some(c => /hiện tại hoàn thành/i.test(c.with)),
    'Tense in academic writing sets the present perfect against the past simple when citing');

  /* ============ 4. Grammar: nouns, articles, quantifiers ============ */
  console.log('\n\x1b[1m== Grammar API (nouns, articles, quantifiers) ==\x1b[0m');

  const nn = await get('/api/learn/grammar?grp=noun');
  ok(nn.count === 28, 'All 28 points A1-C2 (' + nn.count + ')');
  ok(nn.points.every(p => p.grp === 'noun'), 'Filtering by group returns only that group');

  /* Holds to the quota A1 8 · A2 6 · B1 5 · B2 4 · C1 3 · C2 2 in docs/LEARNING.md.
     The backstop for the "never inflate the count to look generous" rule. */
  const byLevel = nn.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const QUOTA = { A1: 8, A2: 6, B1: 5, B2: 4, C1: 3, C2: 2 };
  const nounOff = Object.keys(QUOTA).filter(l => byLevel[l] !== QUOTA[l]);
  ok(nounOff.length === 0, 'Exactly the per-level quota from the band table' +
    (nounOff.length ? ' (off: ' + nounOff.map(l => l + ' ' + (byLevel[l] || 0) + '/' + QUOTA[l]).join(', ') + ')' : ''));

  /* The display order has to run from the lowest level up, not interleaved */
  const LEVEL_RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  const sortedByLevel = nn.points.every((p, i) => i === 0 || LEVEL_RANK[p.level] >= LEVEL_RANK[nn.points[i - 1].level]);
  ok(sortedByLevel, 'The list is sorted from the lowest level up');

  ok(nn.points.every(p => formRows(p).length >= 2), 'Every point has at least two formula rows');
  ok(nn.points.every(p => p.counts.example === 6), 'Every point has exactly 6 examples');
  ok(nn.points.every(p => p.counts.practice === 10), 'Every point has exactly 10 practice sentences');

  /* The groups have to stay apart, with nothing bleeding across */
  const allGrammar = await get('/api/learn/grammar');
  ok(allGrammar.count === 219, 'The nine groups come to 219 points (' + allGrammar.count + ')');
  ok(allGrammar.groups.some(g => g.id === 'tense' && g.count === 21) &&
     allGrammar.groups.some(g => g.id === 'noun' && g.count === 28) &&
     allGrammar.groups.some(g => g.id === 'adjadv' && g.count === 16) &&
     allGrammar.groups.some(g => g.id === 'modal' && g.count === 29) &&
     allGrammar.groups.some(g => g.id === 'conditional' && g.count === 20) &&
     allGrammar.groups.some(g => g.id === 'passive' && g.count === 22) &&
     allGrammar.groups.some(g => g.id === 'clause' && g.count === 29) &&
     allGrammar.groups.some(g => g.id === 'emphasis' && g.count === 21) &&
     allGrammar.groups.some(g => g.id === 'register' && g.count === 33),
    'The per-group counts are right: tense 21, noun 28, adjadv 16, modal 29, conditional 20, passive 22, clause 29, emphasis 21, register 33');
  ok(new Set(allGrammar.points.map(p => p.slug)).size === allGrammar.count,
    'No two points share a slug across groups');

  let nExTotal = 0, nPrTotal = 0;
  const nFlaws = [];
  for (const p of nn.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    nExTotal += d.examples.length;
    nPrTotal += d.practice.length;

    if (!d.point.useWhen.length) nFlaws.push(p.slug + ': no "when to use it"');
    if (!d.point.useNot.length) nFlaws.push(p.slug + ': no "when NOT to use it"');
    if (!d.point.confuse.length) nFlaws.push(p.slug + ': no telling-apart section');
    if (!d.point.errors.length) nFlaws.push(p.slug + ': no common mistakes');
    if (d.point.useNot.some(u => !u.what || !u.why)) nFlaws.push(p.slug + ': a "do not use" entry gives no reason');
    if (d.point.errors.some(e => !e.wrong || !e.right || !e.why)) nFlaws.push(p.slug + ': a mistake has no fix or no reason');
    if (d.point.confuse.some(c => !c.with || !c.tell || !c.pair || c.pair.length !== 2)) {
      nFlaws.push(p.slug + ': a telling-apart pair does not have two sentences');
    }
    if (d.examples.some(x => !x.en || !x.vi)) nFlaws.push(p.slug + ': an example is not bilingual');
    if (d.practice.some(x => !x.en || !x.vi || !x.answer)) nFlaws.push(p.slug + ': a practice sentence has no gloss or no answer');
    if (d.examples.some(x => !x.ok && !x.note)) nFlaws.push(p.slug + ': a counter-example has no fix');
    if (d.examples.filter(x => !x.ok).length < 2) nFlaws.push(p.slug + ': fewer than two counter-examples');

    const gapMismatch = d.practice.filter(x =>
      (x.en.match(/___/g) || []).length !== x.answer.split('…').length);
    if (gapMismatch.length) nFlaws.push(p.slug + ': ' + gapMismatch.length + ' practice sentences with gaps and answers out of step');
  }
  ok(nExTotal === 168, 'All 168 examples (' + nExTotal + ')');
  ok(nPrTotal === 280, 'All 280 practice sentences (' + nPrTotal + ')');
  ok(nFlaws.length === 0, 'Every point has its sections and clean data' +
    (nFlaws.length ? ' — ' + nFlaws.slice(0, 6).join('; ') : ''));

  /* Check exactly where Vietnamese learners go wrong most often */
  const aAn = await get('/api/learn/grammar/article-a-an');
  ok(aAn.point.formula.note && /âm/i.test(aAn.point.formula.note),
    'The a/an point stresses that the choice follows the SOUND, not the letter');
  ok(aAn.examples.some(x => /an hour/i.test(x.en)) && aAn.examples.some(x => /a university/i.test(x.en)),
    'The a/an point carries both traps: "an hour" and "a university"');

  const zero = await get('/api/learn/grammar/article-zero');
  ok(zero.point.confuse.some(c => /school/i.test(c.tell + JSON.stringify(c.pair))),
    'The zero-article point separates "go to school" from "go to the school"');

  const count = await get('/api/learn/grammar/noun-countability');
  ok(count.point.formula.note && /information|advice/i.test(count.point.formula.note),
    'The countability point lists nouns countable in Vietnamese but not in English');

  const there = await get('/api/learn/grammar/there-is-there-are');
  ok(there.point.errors.some(e => /have/i.test(e.wrong)),
    'The There is/are point warns against rendering "in the room there is" as "have"');

  /* Higher levels: check the points that exist only to teach C1-C2 */
  const fewLittle = await get('/api/learn/grammar/few-little');
  ok(fewLittle.point.formula.note && /quite a few/i.test(fewLittle.point.formula.note),
    'The few/little point warns about the reversed sense of "quite a few"');
  ok(fewLittle.point.confuse.length >= 2, 'The few/little point has at least two telling-apart pairs');

  const agree = await get('/api/learn/grammar/quantifier-agreement');
  const agreeText = JSON.stringify(agree.point);
  ok(/a number of/i.test(agreeText) && /the number of/i.test(agreeText),
    'The agreement point sets "a number of" against "the number of"');
  ok(agree.practice.some(x => /the number of/i.test(x.en) && /^has$/i.test(x.answer)),
    'A practice sentence pins "the number of" to a singular verb');

  const acaZero = await get('/api/learn/grammar/article-academic-zero');
  ok(acaZero.point.formula.note && /bổ nghĩa/i.test(acaZero.point.formula.note),
    'The academic zero-article point states the "with a modifier it takes the" rule');

  const nomin = await get('/api/learn/grammar/nominalisation');
  ok(nomin.point.useNot.some(u => /lạm dụng|cả đoạn/i.test(u.what + u.why)),
    'The nominalisation point warns against overuse, not just how to use it');

  /* ============ 4b. Grammar: adjectives, adverbs, comparison ============ */
  console.log('\n\x1b[1m== Grammar API (adjectives, adverbs, comparison) ==\x1b[0m');

  const tt = await get('/api/learn/grammar?grp=adjadv');
  ok(tt.count === 16, 'All 16 points at A1-B1 (' + tt.count + ')');
  ok(tt.points.every(p => p.grp === 'adjadv'), 'Filtering by group returns only that group');

  /* The whole group's quota is A1 5 · A2 6 · B1 5 · B2 5 · C1 4 · C2 3 = 28. This pass
     covers A1-B1 only, so B2-C2 have to be zero: the backstop for writing exactly the
     part taken on, without reaching into the next pass's share. */
  const ttLevel = tt.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const TT_QUOTA = { A1: 5, A2: 6, B1: 5, B2: 0, C1: 0, C2: 0 };
  const adjOff = Object.keys(TT_QUOTA).filter(l => (ttLevel[l] || 0) !== TT_QUOTA[l]);
  ok(adjOff.length === 0, 'Exactly the quota A1 5, A2 6, B1 5, with nothing yet at B2-C2' +
    (adjOff.length ? ' (off: ' + adjOff.map(l => l + ' ' + (ttLevel[l] || 0) + '/' + TT_QUOTA[l]).join(', ') + ')' : ''));

  const adjSorted = tt.points.every((p, i) => i === 0 || LEVEL_RANK[p.level] >= LEVEL_RANK[tt.points[i - 1].level]);
  ok(adjSorted, 'The list is sorted from the lowest level up');
  ok(tt.points.every(p => formRows(p).length >= 2), 'Every point has at least two formula rows');
  ok(tt.points.every(p => p.counts.example === 6), 'Every point has exactly 6 examples');
  ok(tt.points.every(p => p.counts.practice === 10), 'Every point has exactly 10 practice sentences');

  let ttEx = 0, ttPr = 0;
  const ttFlaws = [];
  for (const p of tt.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    ttEx += d.examples.length;
    ttPr += d.practice.length;

    if (!d.point.useWhen.length) ttFlaws.push(p.slug + ': no "when to use it"');
    if (!d.point.useNot.length) ttFlaws.push(p.slug + ': no "when NOT to use it"');
    if (!d.point.confuse.length) ttFlaws.push(p.slug + ': no telling-apart section');
    if (!d.point.errors.length) ttFlaws.push(p.slug + ': no common mistakes');
    if (d.point.useNot.some(u => !u.what || !u.why)) ttFlaws.push(p.slug + ': a "do not use" entry gives no reason');
    if (d.point.errors.some(e => !e.wrong || !e.right || !e.why)) ttFlaws.push(p.slug + ': a mistake has no fix or no reason');
    if (d.point.confuse.some(c => !c.with || !c.tell || !c.pair || c.pair.length !== 2)) {
      ttFlaws.push(p.slug + ': a telling-apart pair does not have two sentences');
    }
    if (d.examples.some(x => !x.en || !x.vi)) ttFlaws.push(p.slug + ': an example is not bilingual');
    if (d.practice.some(x => !x.en || !x.vi || !x.answer)) ttFlaws.push(p.slug + ': a practice sentence has no gloss or no answer');
    if (d.examples.some(x => !x.ok && !x.note)) ttFlaws.push(p.slug + ': a counter-example has no fix');
    if (d.examples.filter(x => !x.ok).length < 2) ttFlaws.push(p.slug + ': fewer than two counter-examples');

    const gapOff = d.practice.filter(x =>
      (x.en.match(/___/g) || []).length !== x.answer.split('…').length);
    if (gapOff.length) ttFlaws.push(p.slug + ': ' + gapOff.length + ' practice sentences with gaps and answers out of step');
  }
  ok(ttEx === 96, 'All 96 examples (' + ttEx + ')');
  ok(ttPr === 160, 'All 160 practice sentences (' + ttPr + ')');
  ok(ttFlaws.length === 0, 'Every point has its sections and clean data' +
    (ttFlaws.length ? ' — ' + ttFlaws.slice(0, 6).join('; ') : ''));

  /* Look at the four places Vietnamese learners get this group wrong most */
  const adjPosition = await get('/api/learn/grammar/adj-position');
  ok(adjPosition.point.formula.note && /tiếng Việt/i.test(adjPosition.point.formula.note),
    'The adjective-position point says outright that Vietnamese orders these the other way round');
  ok(adjPosition.point.useNot.some(u => /-s|số nhiều/i.test(u.what + u.why)),
    'The adjective-position point warns that an adjective takes no -s');

  const canBe = await get('/api/learn/grammar/adj-need-be');
  ok(canBe.point.errors.some(e => /I hungry/i.test(e.wrong)),
    'The "needs be" point takes the classic error "I hungry"');

  const edIng = await get('/api/learn/grammar/adj-ed-ing');
  ok(edIng.point.formula.note && /boring/i.test(edIng.point.formula.note),
    'The -ed/-ing point warns that "I am boring" calls yourself dull');
  ok(edIng.point.confuse.some(c => c.pair.some(x => /is bored/i.test(x.en)) && c.pair.some(x => /is boring/i.test(x.en))),
    'The -ed/-ing point puts "He is bored" beside "He is boring"');

  const advMannerLy = await get('/api/learn/grammar/adv-manner-ly');
  ok(advMannerLy.point.confuse.some(c => /hardly/i.test(c.with)),
    'The manner-adverb point traps "hard" against "hardly"');

  const compoundAdjective = await get('/api/learn/grammar/compound-adjective');
  ok(compoundAdjective.point.errors.some(e => /five-years-old/i.test(e.wrong)),
    'The compound-adjective point catches "a five-years-old boy"');

  /* ============ 5. Grammar: modal verbs ============ */
  console.log('\n\x1b[1m== Grammar API (modal verbs) ==\x1b[0m');

  const md = await get('/api/learn/grammar?grp=modal');
  ok(md.count === 29, 'The modal group has all 29 points A1-C2 (' + md.count + ')');
  ok(md.points.every(p => p.grp === 'modal'), 'Filtering by group returns only that group');

  /* This group's quota is A1 x3, A2 x5, B1 x6 */
  const mdLevel = md.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const MD_QUOTA = { A1: 3, A2: 5, B1: 6, B2: 6, C1: 5, C2: 4 };
  const modalOff = Object.keys(MD_QUOTA).filter(l => mdLevel[l] !== MD_QUOTA[l]);
  ok(modalOff.length === 0, 'Exactly the quota A1 3, A2 5, B1 6, B2 6, C1 5, C2 4' +
    (modalOff.length ? ' (off: ' + modalOff.map(l => l + ' ' + (mdLevel[l] || 0)).join(', ') + ')' : ''));
  const MODAL_RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(md.points.every((p, i) => i === 0 || MODAL_RANK[p.level] >= MODAL_RANK[md.points[i - 1].level]),
    'The modal group is sorted from the lowest level up');
  ok(md.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Every point has its 6 examples and 10 practice sentences');

  let mdFlaws = [];
  for (const p of md.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    if (!d.point.useNot.length) mdFlaws.push(p.slug + ': no "when NOT to use it"');
    if (!d.point.confuse.length) mdFlaws.push(p.slug + ': no telling-apart section');
    if (!d.point.errors.length) mdFlaws.push(p.slug + ': no common mistakes');
    if (d.examples.filter(x => !x.ok).length < 2) mdFlaws.push(p.slug + ': fewer than two counter-examples');
    if (d.examples.some(x => !x.ok && !x.note)) mdFlaws.push(p.slug + ': a counter-example has no fix');
  }
  ok(mdFlaws.length === 0, 'Every point has its sections' +
    (mdFlaws.length ? ' — ' + mdFlaws.slice(0, 6).join('; ') : ''));

  /* The most-confused pair in the group has to be taught properly */
  const mustHave = await get('/api/learn/grammar/must-vs-have-to');
  const mhText = JSON.stringify(mustHave.point);
  ok(/CẤM/.test(mhText) && /KHÔNG CẦN/.test(mhText),
    'The must-vs-have-to point says outright that mustn\'t is a ban and don\'t have to is no obligation');

  const deduce = await get('/api/learn/grammar/deduction-present');
  ok(deduce.point.useNot.some(u => /can't|cant/i.test(u.what + u.why)),
    'The deduction point warns that the negative is "can\'t", not "mustn\'t"');

  const ableTo = await get('/api/learn/grammar/ability-across-tenses');
  ok(/will can/i.test(JSON.stringify(ableTo.point)),
    'The be-able-to point warns against stacking two modals as "will can"');

  const usedTo = await get('/api/learn/grammar/used-to-would');
  ok(usedTo.point.confuse.some(c => /be used to/i.test(c.with + c.tell)),
    'The used-to point is kept apart from "be used to"');

  /* ============ 5b. Grammar: conditionals ============ */
  console.log('\n\x1b[1m== Grammar API (conditionals) ==\x1b[0m');

  const cd = await get('/api/learn/grammar?grp=conditional');
  ok(cd.count === 20, 'The conditional group has all 20 points A2-C2 (' + cd.count + ')');
  const cdLevel = cd.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const CD_QUOTA = { A2: 2, B1: 4, B2: 5, C1: 5, C2: 4 };
  const conditionalOff = Object.keys(CD_QUOTA).filter(l => cdLevel[l] !== CD_QUOTA[l]);
  ok(conditionalOff.length === 0, 'Exactly the quota A2 2, B1 4, B2 5, C1 5, C2 4' +
    (conditionalOff.length ? ' (off: ' + conditionalOff.map(l => l + ' ' + (cdLevel[l] || 0)).join(', ') + ')' : ''));
  const CONDITIONAL_RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(cd.points.every((p, i) => i === 0 || CONDITIONAL_RANK[p.level] >= CONDITIONAL_RANK[cd.points[i - 1].level]),
    'The conditional group is sorted from the lowest level up');
  ok(cd.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Every point has its 6 examples and 10 practice sentences');

  /* The two classic errors of this group have to be warned about properly */
  const conditionalFirst = await get('/api/learn/grammar/conditional-first');
  ok(conditionalFirst.point.errors.some(e => /will/i.test(e.wrong)),
    'The first conditional warns against putting "will" in the if clause');
  const conditionalThird = await get('/api/learn/grammar/conditional-third');
  ok(conditionalThird.point.errors.some(e => /would have known|would/i.test(e.wrong)),
    'The third conditional warns against putting "would" in the if clause');

  const unless = await get('/api/learn/grammar/unless-and-conjunctions');
  ok(unless.point.errors.some(e => /do not|not/i.test(e.wrong)),
    'The unless point warns about the double negative');
  ok(unless.point.confuse.some(c => /in case/i.test(c.with)),
    'The unless point separates "in case" from "if"');

  const mixedConditionals = await get('/api/learn/grammar/mixed-conditionals');
  ok(/now|today/i.test(JSON.stringify(mixedConditionals.point)),
    'The mixed-conditional point names the "now" time marker as the signal');

  /* Higher levels: a conditional with no "if" left in it — where learners skim past */
  const conditionalInversion = await get('/api/learn/grammar/conditional-inversion');
  ok(conditionalInversion.point.useNot.some(u => /if/i.test(u.what + u.why)),
    'The inversion point warns that "if" has to go entirely');
  const mandativeSubjunctive = await get('/api/learn/grammar/mandative-subjunctive');
  ok(/suggest/i.test(JSON.stringify(mandativeSubjunctive.point)),
    'The mandative-subjunctive point names the triggering verbs such as "suggest"');
  const impliedConditionals = await get('/api/learn/grammar/implied-conditionals');
  ok(/would/i.test(JSON.stringify(impliedConditionals.point.formula)),
    'The implied-conditional point points to "would" as the signal');

  /* ============ 5c. Grammar: passive and reported speech ============ */
  console.log('\n\x1b[1m== Grammar API (passive, reported speech) ==\x1b[0m');

  const bd = await get('/api/learn/grammar?grp=passive');
  ok(bd.count === 22, 'All 22 points A2-C2, per the quota (' + bd.count + ')');
  const bdLevel = bd.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const BD_QUOTA = { A2: 2, B1: 5, B2: 6, C1: 5, C2: 4 };
  const passiveOff = Object.keys(BD_QUOTA).filter(l => bdLevel[l] !== BD_QUOTA[l]);
  ok(passiveOff.length === 0, 'Exactly the quota A2 2, B1 5, B2 6, C1 5, C2 4' +
    (passiveOff.length ? ' (off: ' + passiveOff.map(l => l + ' ' + (bdLevel[l] || 0) + '/' + BD_QUOTA[l]).join(', ') + ')' : ''));
  ok(bd.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Every point has its 6 examples and 10 practice sentences');

  /* Two data files joined together have to run level by level, not interleaved */
  const PASSIVE_RANK = { A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(bd.points.every((p, i) => i === 0 || PASSIVE_RANK[p.level] >= PASSIVE_RANK[bd.points[i - 1].level]),
    'The A2-B2 and C1-C2 files join seamlessly, sorted from the lowest level up');

  /* The three classic errors of this group have to be warned about */
  const passiveBasic = await get('/api/learn/grammar/passive-basic');
  ok(passiveBasic.point.useNot.some(u => /nội động từ/i.test(u.what + u.why)),
    'The basic passive warns that an intransitive verb has no passive');
  const reportedQuestions = await get('/api/learn/grammar/reported-questions');
  ok(reportedQuestions.point.useNot.some(u => /đảo ngữ/i.test(u.what + u.why)),
    'Reported questions warn against keeping the inversion');
  const reportedStatements = await get('/api/learn/grammar/reported-statements');
  ok(/said me|say/i.test(JSON.stringify(reportedStatements.point.errors)),
    'The reported-statement point warns about the "say me" error');
  const haveGetDone = await get('/api/learn/grammar/have-get-done');
  ok(haveGetDone.point.confuse.some(c => /tự làm/i.test(c.with + c.tell)),
    'The have/get done point separates doing it yourself from having it done');

  /* C1-C2: the core lessons — lose one and the point has no point */
  const passivePerceptionCausative = await get('/api/learn/grammar/passive-perception-causative');
  ok(/was made to sign|made to sign/i.test(JSON.stringify(passivePerceptionCausative.point.errors)),
    'Perception and causative verbs warn about dropping "to" in the passive');

  const thereSaid = await get('/api/learn/grammar/there-said-to-be');
  ok(thereSaid.point.useNot.some(u => /There is said that/i.test(u.what + u.why)),
    'The "there is said to be" point warns against writing "There is said that…"');
  ok(/There are believed/i.test(JSON.stringify(thereSaid.point.errors)),
    'The "there is said to be" point catches the plural-agreement error');

  const reportingVerbStance = await get('/api/learn/grammar/reporting-verb-stance');
  ok(reportingVerbStance.point.confuse.some(c => /point out/i.test(c.with + c.tell) && /claim/i.test(c.with + c.tell)),
    'Reporting verbs separate the agreeing "point out" from the doubting "claim"');

  const freeIndirectSpeech = await get('/api/learn/grammar/free-indirect-speech');
  ok(freeIndirectSpeech.point.level === 'C2' && /ngôi thứ ba/i.test(JSON.stringify(freeIndirectSpeech.point)),
    'Free indirect speech is C2 and states that it uses the third person');

  const reportedLegal = await get('/api/learn/grammar/reported-legal');
  ok(reportedLegal.point.useNot.some(u => /shall/i.test(u.what + u.why) && /tương lai/i.test(u.what + u.why)),
    'The legal point warns that "shall" is an obligation, not the future tense');

  const passiveAgentDeletion = await get('/api/learn/grammar/passive-agent-deletion');
  ok(/by/i.test(passiveAgentDeletion.point.formula.note) && /chính đáng|né/i.test(JSON.stringify(passiveAgentDeletion.point)),
    'The agent-deletion point has the "by…" test that separates a legitimate passive from evasion');

  const reportingNouns = await get('/api/learn/grammar/reporting-nouns');
  ok(reportingNouns.point.useNot.some(u => /which/i.test(u.what + u.why)),
    'Reporting nouns warn against replacing "that" with "which"');

  /* ============ 5d. Grammar: relative and subordinate clauses ============ */
  console.log('\n\x1b[1m== Grammar API (relative and subordinate clauses) ==\x1b[0m');

  const mq = await get('/api/learn/grammar?grp=clause');
  ok(mq.count === 29, 'All 29 points A2-C2, per the quota (' + mq.count + ')');
  const mqLevel = mq.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const MQ_QUOTA = { A2: 3, B1: 6, B2: 8, C1: 7, C2: 5 };
  const clauseOff = Object.keys(MQ_QUOTA).filter(l => mqLevel[l] !== MQ_QUOTA[l]);
  ok(clauseOff.length === 0, 'Exactly the quota A2 3, B1 6, B2 8, C1 7, C2 5' +
    (clauseOff.length ? ' (off: ' + clauseOff.map(l => l + ' ' + (mqLevel[l] || 0) + '/' + MQ_QUOTA[l]).join(', ') + ')' : ''));
  ok(mq.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Every point has its 6 examples and 10 practice sentences');
  const CLAUSE_RANK = { A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(mq.points.every((p, i) => i === 0 || CLAUSE_RANK[p.level] >= CLAUSE_RANK[mq.points[i - 1].level]),
    'The A2-B1, B2 and C1-C2 files join seamlessly, sorted from the lowest level up');

  /* Two paired-conjunction habits are a signature Vietnamese error, so both need a warning.
     That is the main reason these two points are kept separate; lose one and the point loses its focus. */
  const adverbialReasonBasic = await get('/api/learn/grammar/adverbial-reason-basic');
  ok(adverbialReasonBasic.point.useNot.some(u => /because/i.test(u.what + u.why) && /\bso\b/i.test(u.what + u.why)),
    'The reason clause warns about the paired "Because… so…"');
  ok(adverbialReasonBasic.point.confuse.some(c => /because of/i.test(c.with + c.tell)),
    'The reason clause separates "because" from "because of"');

  const adverbialConcession = await get('/api/learn/grammar/adverbial-concession');
  ok(adverbialConcession.point.useNot.some(u => /although/i.test(u.what + u.why) && /\bbut\b/i.test(u.what + u.why)),
    'The concession clause warns about the paired "Although… but…"');
  ok(adverbialConcession.point.useNot.some(u => /despite/i.test(u.what + u.why)),
    'The concession clause warns that "despite" does not take a clause');

  const relativeWhoWhichThat = await get('/api/learn/grammar/relative-who-which-that');
  ok(/who he lives|he lives next door/i.test(JSON.stringify(relativeWhoWhichThat.point.errors)),
    'Relative pronouns warn about repeating the pronoun after "who"');

  const adverbialTimeBasic = await get('/api/learn/grammar/adverbial-time-basic');
  ok(adverbialTimeBasic.point.useNot.some(u => /will/i.test(u.what + u.why)),
    'The time clause warns against "will" after when / until');

  const relativeDefiningNondefining = await get('/api/learn/grammar/relative-defining-nondefining');
  ok(relativeDefiningNondefining.point.useNot.some(u => /that/i.test(u.what + u.why)),
    'The non-defining clause warns against "that"');
  ok(relativeDefiningNondefining.point.confuse.some(c => c.pair.some(s => /^My sister who/.test(s.en)) &&
                                     c.pair.some(s => /^My sister, who/.test(s.en))),
    'The telling-apart pair shows a comma changing the meaning of the whole sentence');

  const relativeOmitObject = await get('/api/learn/grammar/relative-omit-object');
  ok(relativeOmitObject.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'The omitted-pronoun point warns against dropping it when it is the subject');

  const adverbialPurpose = await get('/api/learn/grammar/adverbial-purpose');
  ok(adverbialPurpose.point.useNot.some(u => /for/i.test(u.what + u.why) && /ing/i.test(u.what + u.why)),
    'The purpose clause separates "to + V" from "for + V-ing"');

  /* B2: four signature errors, one point owning each — lose a warning and that point loses its focus */
  const relativeReduced = await get('/api/learn/grammar/relative-reduced');
  ok(relativeReduced.point.useNot.some(u => /tân ngữ/i.test(u.what + u.why)),
    'The reduced relative clause warns against reducing when the pronoun is the object');

  const relativePreposition = await get('/api/learn/grammar/relative-preposition');
  ok(relativePreposition.point.useNot.some(u => /that/i.test(u.what + u.why)) &&
     relativePreposition.point.useNot.some(u => /whom/i.test(u.what + u.why)),
    'Preposition + relative pronoun bars both "that" and "who" after a preposition');

  const relativeQuantifier = await get('/api/learn/grammar/relative-quantifier');
  ok(relativeQuantifier.point.useNot.some(u => /them/i.test(u.what + u.why)),
    'The quantifier point warns about using "them" instead of "whom"');

  const relativeWhichClause = await get('/api/learn/grammar/relative-which-clause');
  ok(relativeWhichClause.point.useNot.some(u => /what/i.test(u.what + u.why)),
    'The "which for a whole clause" point warns against "what"');
  ok(relativeWhichClause.point.confuse.some(c => /phẩy/i.test(c.with + c.tell)),
    'The "which for a whole clause" point shows a missing comma changing the meaning');

  const adverbialContrast = await get('/api/learn/grammar/adverbial-contrast');
  ok(adverbialContrast.point.confuse.some(c => /whereas/i.test(c.with + c.tell) && /although/i.test(c.with + c.tell)),
    'The contrast clause separates "whereas" from "although"');

  const adverbialManner = await get('/api/learn/grammar/adverbial-manner');
  ok(adverbialManner.point.useNot.some(u => /like/i.test(u.what + u.why)),
    'The manner clause warns that "like" is not a conjunction in formal writing');

  const adverbialEver = await get('/api/learn/grammar/adverbial-ever');
  ok(adverbialEver.point.useNot.some(u => /however/i.test(u.what + u.why)),
    'The "-ever" group warns about the wrong order after "however"');
  ok(/However hard he tried/.test(JSON.stringify(adverbialEver.point.errors)),
    'The "-ever" group gives the right fix, "However hard he tried"');

  const nounClauseWhatWhether = await get('/api/learn/grammar/noun-clause-what-whether');
  ok(nounClauseWhatWhether.point.useNot.some(u => /giới từ/i.test(u.what + u.why) && /whether/i.test(u.what + u.why)),
    'The noun clause warns that a preposition takes "whether"');
  ok(nounClauseWhatWhether.point.confuse.some(c => /what/i.test(c.with + c.tell) && /that/i.test(c.with + c.tell)),
    'The noun clause separates "what" from "that"');

  /* C1-C2: the dangling participle is the spine, and has to show up in all three related points */
  const participleClauseAdverbial = await get('/api/learn/grammar/participle-clause-adverbial');
  ok(participleClauseAdverbial.point.useNot.some(u => /treo/i.test(u.what + u.why)),
    'The participle clause warns about the dangling participle');
  ok(/building came into view/i.test(JSON.stringify(participleClauseAdverbial.point.errors)),
    'The participle clause gives the classic dangling example');

  const ellipsisSubordinate = await get('/api/learn/grammar/ellipsis-subordinate');
  ok(ellipsisSubordinate.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'Ellipsis in a subordinate clause warns that the two subjects have to be the same');

  const absoluteConstruction = await get('/api/learn/grammar/absolute-construction');
  ok(absoluteConstruction.point.confuse.some(c => /chủ ngữ riêng/i.test(c.with + c.tell)),
    'The absolute construction is separated from the participle clause by its own subject');

  const resultClause = await get('/api/learn/grammar/result-clause');
  ok(resultClause.point.confuse.some(c => /kết quả/i.test(c.with + c.tell) && /mục đích/i.test(c.with + c.tell)),
    'The result clause separates "so…that" from the purpose "so that"');

  const extrapositionIt = await get('/api/learn/grammar/extraposition-it');
  ok(extrapositionIt.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'The dummy subject "it" warns that "it" cannot be dropped from the front');

  const forTo = await get('/api/learn/grammar/for-to-clause');
  ok(forTo.point.useNot.some(u => /sở hữu/i.test(u.what + u.why)),
    'The "for + to-V" clause warns to use an object pronoun, not a possessive');

  const clauseInCase = await get('/api/learn/grammar/clause-in-case');
  ok(clauseInCase.point.confuse.some(c => /in case/i.test(c.with + c.tell) && /\bif\b/i.test(c.with + c.tell)),
    'The "in case" point separates precaution from the "if" condition');
  ok(clauseInCase.point.useNot.some(u => /will/i.test(u.what + u.why)),
    'The "in case" point warns against "will" after it');

  const asClauseAcademic = await get('/api/learn/grammar/as-clause-academic');
  ok(asClauseAcademic.point.useNot.some(u => /\bit\b/i.test(u.what + u.why)),
    'The academic "as" clause warns against slipping "it" in between');

  const relativeWhereby = await get('/api/learn/grammar/relative-whereby');
  ok(relativeWhereby.point.useNot.some(u => /whereby/i.test(u.what + u.why)),
    'The "whereby" point warns that it does not mean a place');

  const relativePostponed = await get('/api/learn/grammar/relative-postponed');
  ok(relativePostponed.point.useNot.some(u => /danh từ/i.test(u.what + u.why)),
    'The postponed clause warns that another noun in between causes a misreading');

  const concessiveFormal = await get('/api/learn/grammar/concessive-formal');
  ok(concessiveFormal.point.useNot.some(u => /\bbut\b/i.test(u.what + u.why)),
    'Formal concession still bars pairing with "but"');
  ok(/Try as he might/.test(JSON.stringify(concessiveFormal.point.errors)),
    'Formal concession keeps the fixed phrase "Try as he might" intact');

  const clauseAttachment = await get('/api/learn/grammar/clause-attachment');
  ok(clauseAttachment.point.confuse.some(c => /hai nghĩa/i.test(c.with + c.tell)),
    'The attachment point states outright that the problem is a two-way reading');

  /* ============ 5e. Grammar: inversion, emphasis, cleft sentences ============ */
  console.log('\n\x1b[1m== Grammar API (inversion, emphasis, cleft sentences) ==\x1b[0m');

  const nm = await get('/api/learn/grammar?grp=emphasis');
  ok(nm.count === 21, 'All 21 points B1-C2, per the quota (' + nm.count + ')');
  const nmLevel = nm.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const NM_QUOTA = { B1: 2, B2: 5, C1: 7, C2: 7 };
  const emphasisOff = Object.keys(NM_QUOTA).filter(l => nmLevel[l] !== NM_QUOTA[l]);
  ok(emphasisOff.length === 0, 'Exactly the quota B1 2, B2 5, C1 7, C2 7' +
    (emphasisOff.length ? ' (off: ' + emphasisOff.map(l => l + ' ' + (nmLevel[l] || 0) + '/' + NM_QUOTA[l]).join(', ') + ')' : ''));
  ok(nm.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Every point has its 6 examples and 10 practice sentences');
  const EMPHASIS_RANK = { B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(nm.points.every((p, i) => i === 0 || EMPHASIS_RANK[p.level] >= EMPHASIS_RANK[nm.points[i - 1].level]),
    'The B1-C1 and C2 files join seamlessly, sorted from the lowest level up');

  /* The spine of the group: invert or do not. The two points have to be comparable,
     or the learner has nowhere to see the two opposite rules side by side. */
  const negativeInversionBasic = await get('/api/learn/grammar/negative-inversion-basic');
  ok(/Never have I/.test(JSON.stringify(negativeInversionBasic.point.errors)),
    'Negative inversion gives the right fix, "Never have I…"');
  const frontingNoInversion = await get('/api/learn/grammar/fronting-no-inversion');
  ok(frontingNoInversion.point.confuse.some(c => /tân ngữ/i.test(c.with + c.tell) && /phủ định/i.test(c.with + c.tell)),
    'The fronting-without-inversion point is set directly against negative inversion');
  ok(frontingNoInversion.point.useNot.some(u => /không đảo/i.test(u.what + u.why)),
    'The fronting point warns against inverting when an object is brought forward');

  /* The paired words of advanced inversion are the classic C1 trap */
  const negativeInversionAdvanced = await get('/api/learn/grammar/negative-inversion-advanced');
  ok(negativeInversionAdvanced.point.useNot.some(u => /than/i.test(u.what + u.why) && /when/i.test(u.what + u.why)),
    'Advanced inversion warns that "No sooner… than" differs from "Hardly… when"');

  const onlyInversion = await get('/api/learn/grammar/only-inversion');
  ok(onlyInversion.point.useNot.some(u => /chủ ngữ/i.test(u.what + u.why)),
    'The "Only" inversion names the exception where only modifies the subject');

  const itCleft = await get('/api/learn/grammar/it-cleft');
  ok(itCleft.point.useNot.some(u => /that/i.test(u.what + u.why) && /who/i.test(u.what + u.why)),
    'The "It" cleft warns that "that" or "who" cannot be dropped');
  const whCleft = await get('/api/learn/grammar/wh-cleft');
  ok(whCleft.point.confuse.some(c => /cuối/i.test(c.with + c.tell) || /đầu/i.test(c.with + c.tell)),
    'The "What" cleft is set against the "It" cleft on where the stress falls');

  const doEmphasis = await get('/api/learn/grammar/do-emphasis');
  ok(/did call/.test(JSON.stringify(doEmphasis.point.errors)),
    'Emphatic "do" catches conjugating the main verb after "did"');

  const emphasisAdverbs = await get('/api/learn/grammar/emphasis-adverbs');
  ok(emphasisAdverbs.point.useNot.some(u => /whatsoever/i.test(u.what + u.why)),
    'Emphatic adverbs warn that "whatsoever" belongs only in a negative sentence');

  const cleftVariants = await get('/api/learn/grammar/cleft-variants');
  ok(/All what/.test(JSON.stringify(cleftVariants.point.errors)),
    'Cleft variants catch "All what I want"');

  /* C2: the spine is telling the two kinds of inversion apart, plus the inversion and cleft pair that mean the same */
  const inversionFullVsAuxiliary = await get('/api/learn/grammar/inversion-full-vs-auxiliary');
  ok(inversionFullVsAuxiliary.point.confuse.some(c => /toàn phần/i.test(c.with + c.tell) && /trợ động từ/i.test(c.with + c.tell)),
    'The two-kinds point separates full inversion from auxiliary inversion');
  ok(inversionFullVsAuxiliary.point.useNot.some(u => /đại từ/i.test(u.what + u.why)),
    'The two-kinds point warns that full inversion does not take a pronoun');

  const frontingParticipleAdjective = await get('/api/learn/grammar/fronting-participle-adjective');
  ok(frontingParticipleAdjective.point.useNot.some(u => /hợp/i.test(u.what + u.why) || /chia động từ/i.test(u.what + u.why)),
    'The fronted-participle point warns about agreement with the subject at the end');
  ok(/Gone are the days/.test(JSON.stringify(frontingParticipleAdjective.point.errors)),
    'The fronted-participle point gives the right fix, "Gone are the days"');

  const inversionComparative = await get('/api/learn/grammar/inversion-comparative');
  ok(inversionComparative.point.confuse.some(c => /tuỳ chọn/i.test(c.with + c.tell) && /bắt buộc/i.test(c.with + c.tell)),
    'Comparative inversion states that this inversion is optional, unlike the obligatory kind');

  /* These two points have to cross-reference each other: one idea, two ways of saying it */
  const cleftNotUntil = await get('/api/learn/grammar/cleft-not-until');
  ok(cleftNotUntil.point.useNot.some(u => /when/i.test(u.what + u.why) && /that/i.test(u.what + u.why)),
    'The negative cleft warns against "when" in place of "that"');
  ok(cleftNotUntil.point.confuse.some(c => /đảo ngữ/i.test(c.with + c.tell)),
    'The negative cleft is set against the inversion that means the same');
  const inversionNotPhrases = await get('/api/learn/grammar/inversion-not-phrases');
  ok(/Not once did she complain/.test(JSON.stringify(inversionNotPhrases.point.errors)),
    'The "Not" phrase inversion gives the right fix, "Not once did she complain"');

  const frontingCohesion = await get('/api/learn/grammar/fronting-cohesion');
  ok(frontingCohesion.point.useNot.some(u => /chưa biết/i.test(u.what + u.why) || /thông tin mới/i.test(u.what + u.why)),
    'The cohesion point warns against fronting new information');

  const emphasisFarFrom = await get('/api/learn/grammar/emphasis-far-from');
  ok(emphasisFarFrom.point.useNot.some(u => /anything but/i.test(u.what + u.why)),
    'The indirect-negation point warns against reading "anything but" literally');
  ok(emphasisFarFrom.point.confuse.some(c => /nothing but/i.test(c.with + c.tell)),
    'The indirect-negation point separates "anything but" from "nothing but"');

  /* ============ 5f. Grammar: nuance, register, hedging ============ */
  console.log('\n\x1b[1m== Grammar API (nuance, register, hedging) ==\x1b[0m');

  const st = await get('/api/learn/grammar?grp=register');
  ok(st.count === 33, 'All 33 points A1-C2, per the quota (' + st.count + ')');
  const stLevel = st.points.reduce((a, p) => (a[p.level] = (a[p.level] || 0) + 1, a), {});
  const ST_QUOTA = { A1: 1, A2: 2, B1: 4, B2: 7, C1: 9, C2: 10 };
  const registerOff = Object.keys(ST_QUOTA).filter(l => stLevel[l] !== ST_QUOTA[l]);
  ok(registerOff.length === 0, 'Exactly the quota A1 1, A2 2, B1 4, B2 7, C1 9, C2 10' +
    (registerOff.length ? ' (off: ' + registerOff.map(l => l + ' ' + (stLevel[l] || 0) + '/' + ST_QUOTA[l]).join(', ') + ')' : ''));
  ok(st.points.every(p => p.counts.example === 6 && p.counts.practice === 10),
    'Every point has its 6 examples and 10 practice sentences');
  const REGISTER_RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  ok(st.points.every((p, i) => i === 0 || REGISTER_RANK[p.level] >= REGISTER_RANK[st.points[i - 1].level]),
    'The A1-B2, C1 and C2 files join seamlessly, sorted from the lowest level up');

  /* This group is about nuance, so a counter-example is often a GRAMMATICAL sentence
     in the WRONG TONE. The note still has to give the fix, or the learner sees a mark
     against it and no idea how to rewrite it.
     Note: the API returns 'ok' as a boolean (ok: r.ok === 1), so a counter-example is ok === false. */
  const registerMissing = [];
  for (const p of st.points) {
    const d = await get('/api/learn/grammar/' + p.slug);
    const counterExamples = d.examples.filter(x => x.ok === false);
    if (counterExamples.length < 2) registerMissing.push(p.slug + ': only ' + counterExamples.length + ' counter-examples');
    else if (counterExamples.some(x => !x.note || !x.note.trim())) registerMissing.push(p.slug + ': a counter-example has no explanation');
  }
  ok(registerMissing.length === 0, 'Every point has 2 counter-examples with an explanation' +
    (registerMissing.length ? ' (missing: ' + registerMissing.join('; ') + ')' : ''));

  const politenessBasics = await get('/api/learn/grammar/politeness-basics');
  ok(politenessBasics.point.confuse.some(c => /excuse me/i.test(c.with + c.tell) && /sorry/i.test(c.with + c.tell)),
    'The politeness point separates "excuse me" from "sorry"');

  const indirectQuestions = await get('/api/learn/grammar/indirect-questions');
  ok(indirectQuestions.point.useNot.some(u => /đảo/i.test(u.what + u.why)),
    'The indirect question warns against keeping the inverted order inside');
  ok(/where the station is/.test(JSON.stringify(indirectQuestions.point.errors)),
    'The indirect question gives the right fix, "where the station is"');

  const questionTags = await get('/api/learn/grammar/question-tags');
  ok(questionTags.point.useNot.some(u => /amn/i.test(u.what + u.why)),
    'Question tags warn that there is no "amn\'t I"');

  const quiteRatherFairly = await get('/api/learn/grammar/quite-rather-fairly');
  ok(quiteRatherFairly.point.confuse.some(c => /tuyệt đối/i.test(c.with + c.tell)),
    'The degree point traps "quite" with an absolute adjective');

  const vagueLanguage = await get('/api/learn/grammar/vague-language');
  ok(vagueLanguage.point.useNot.some(u => /học thuật/i.test(u.what + u.why)),
    'The vague-language point warns against using it in academic writing');

  const hedgingVerbs = await get('/api/learn/grammar/hedging-verbs');
  ok(hedgingVerbs.point.useNot.some(u => /tiếp diễn/i.test(u.what + u.why)),
    'Hedging verbs warn that "seem" takes no continuous form');

  const hedgingAdverbs = await get('/api/learn/grammar/hedging-adverbs');
  ok(hedgingAdverbs.point.confuse.some(c => /apparently/i.test(c.with + c.tell) && /clearly/i.test(c.with + c.tell)),
    'Hedging adverbs separate "apparently" from "clearly"');

  const boosters = await get('/api/learn/grammar/boosters');
  ok(boosters.point.useNot.some(u => /obviously/i.test(u.what + u.why)),
    'The booster point warns about the trap in "obviously"');

  const impersonalDistance = await get('/api/learn/grammar/impersonal-distance');
  ok(impersonalDistance.point.useNot.some(u => /one/i.test(u.what + u.why) && /you/i.test(u.what + u.why)),
    'The impersonal point warns against mixing "one" with "you"');

  /* C1: the spine is calibrating the dose of hedging, plus the pair set against the B2 impersonal style */
  const hedgingScopeQuantity = await get('/api/learn/grammar/hedging-scope-quantity');
  ok(/All Vietnamese people/.test(JSON.stringify(hedgingScopeQuantity.point.errors)),
    'Scope hedging catches the overclaim "All Vietnamese people…"');
  ok(hedgingScopeQuantity.point.useNot.some(u => /sự thật/i.test(u.what + u.why)),
    'Scope hedging notes not to hedge an established fact');

  const hedgingConditionsLimits = await get('/api/learn/grammar/hedging-conditions-limits');
  ok(hedgingConditionsLimits.point.useNot.some(u => /principal/i.test(u.what + u.why)),
    'The limits point warns about the spelling error "in principal"');

  const hedgingCalibration = await get('/api/learn/grammar/hedging-calibration');
  ok(hedgingCalibration.point.useNot.some(u => /prove/i.test(u.what + u.why)),
    'The calibration point warns against "prove" for correlational data');
  ok(hedgingCalibration.point.confuse.some(c => /quá tay/i.test(c.with + c.tell)),
    'The calibration point sets a right-sized hedge against an overdone one');

  const writtenRequestFormulae = await get('/api/learn/grammar/written-request-formulae');
  ok(writtenRequestFormulae.point.useNot.some(u => /appreciate/i.test(u.what + u.why) && /\bit\b/i.test(u.what + u.why)),
    'The written-request point warns against dropping "it" from "I would appreciate it if"');

  const softeningCriticism = await get('/api/learn/grammar/softening-criticism');
  ok(softeningCriticism.point.useNot.some(u => /an toàn/i.test(u.what + u.why)),
    'Softening criticism names the exception: on safety you say it straight');

  const understatementLitotes = await get('/api/learn/grammar/understatement-litotes');
  ok(understatementLitotes.point.useNot.some(u => /not bad/i.test(u.what + u.why)),
    'The understatement point warns that "not bad" is praise, not criticism');
  ok(understatementLitotes.point.confuse.some(c => {
    const pairText = c.pair.map(x => x.en).join(' ');
    return /not bad/i.test(pairText) && /not very good/i.test(pairText);
  }), 'The understatement point sets "not bad" against "not very good"');

  const euphemismPoint = await get('/api/learn/grammar/euphemism');
  ok(euphemismPoint.point.confuse.some(c => /né tránh/i.test(c.with + c.tell)),
    'The euphemism point separates the kind sort from the evasive sort');

  const spokenVsWrittenGrammar = await get('/api/learn/grammar/spoken-vs-written-grammar');
  ok(spokenVsWrittenGrammar.point.useNot.some(u => /sai/i.test(u.what + u.why)),
    'The spoken-grammar point stresses that these habits are not bad English');

  const stanceMarkers = await get('/api/learn/grammar/stance-markers');
  ok(/According to me/.test(JSON.stringify(stanceMarkers.point.errors)),
    'The stance-marker point catches "According to me"');
  ok(stanceMarkers.point.confuse.some(c => /phi ngôi/i.test(c.with + c.tell)),
    'The stance-marker point is set against the B2 impersonal style');

  /* C2: the spine is reading what is not said out loud.
     The three points — implicature, presupposition, irony — have to stay distinguishable. */
  const ironyAndSarcasm = await get('/api/learn/grammar/irony-and-sarcasm');
  ok(ironyAndSarcasm.point.useNot.some(u => /email/i.test(u.what + u.why)),
    'The irony point warns against using it in a work email');

  const implicaturePoint = await get('/api/learn/grammar/implicature');
  ok(implicaturePoint.point.confuse.some(c => /tiền giả định/i.test(c.with + c.tell)),
    'The implicature point is separated from presupposition');
  const presuppositionPoint = await get('/api/learn/grammar/presupposition');
  ok(presuppositionPoint.point.formula.note && /phủ định/i.test(presuppositionPoint.point.formula.note),
    'The presupposition point names the negation test');
  ok(presuppositionPoint.point.useNot.some(u => /khảo sát/i.test(u.what + u.why)),
    'The presupposition point warns that a loaded survey question skews the numbers');

  const academicCritique = await get('/api/learn/grammar/academic-critique');
  ok(academicCritique.point.confuse.some(c => /cá nhân/i.test(c.with + c.tell)),
    'Academic critique separates criticising the work from attacking the person');

  const institutionalFormulae = await get('/api/learn/grammar/institutional-formulae');
  ok(institutionalFormulae.point.confuse.some(c => /faithfully/i.test(JSON.stringify(c))),
    'Institutional formulae separate "Yours sincerely" from "Yours faithfully"');

  const evaluativeLexis = await get('/api/learn/grammar/evaluative-lexis');
  ok(/regime/i.test(JSON.stringify(evaluativeLexis.point.errors)),
    'The evaluative-lexis point catches "regime" in a neutral report');

  const scareQuotesDistancing = await get('/api/learn/grammar/scare-quotes-distancing');
  ok(scareQuotesDistancing.point.useNot.some(u => /nhấn mạnh/i.test(u.what + u.why)),
    'The scare-quotes point warns against using quotation marks for emphasis');

  const discourseSofteners = await get('/api/learn/grammar/discourse-softeners');
  ok(discourseSofteners.point.useNot.some(u => /chồng/i.test(u.what + u.why)),
    'The discourse-softener point warns against stacking too many layers');

  const apologyScale = await get('/api/learn/grammar/apology-scale');
  ok(apologyScale.point.confuse.some(c => /apologise/i.test(JSON.stringify(c))),
    'The apology scale separates "I am sorry" from "I apologise"');

  const registerShiftForEffect = await get('/api/learn/grammar/register-shift-for-effect');
  ok(registerShiftForEffect.point.useNot.some(u => /vô ý/i.test(u.what + u.why) || /chủ ý/i.test(u.what + u.why)),
    'The register-shift point separates a deliberate shift from an accidental mix');

  /* ============ 6. Practice-sentence quality across ALL of grammar ============
     Brackets in a practice sentence come in two kinds, told apart before checking:

       multiple choice  "___ (much / many) sugar"     → the answer MUST be one of the options
       conjugation cue  "___ (not / live) in Da Nang" → the answer is the conjugated form ("don't live")

     The second kind always opens with a cue word (not, already, just…), so it is
     skipped. Only multiple choice is checked: there, an answer outside the list means
     the learner is wrong whatever they pick. A sentence with several gaps is checked
     gap by gap, paired in order with the answer parts split by '…'. */
  console.log('\n\x1b[1m== Practice-sentence quality across all of grammar ==\x1b[0m');

  const CUE = ['not', 'already', 'just', 'never', 'always', 'probably', 'ever', 'still'];
  const allPoints = (await get('/api/learn/grammar')).points;
  let answerOutsideOptions = [], multipleChoiceCount = 0, practiceTotal = 0;

  for (const p of allPoints) {
    const d = await get('/api/learn/grammar/' + p.slug);
    practiceTotal += d.practice.length;
    for (const x of d.practice) {
      const brackets = [...x.en.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
      const parts = x.answer.split('…').map(s => s.trim());
      if (brackets.length !== parts.length) continue;   // the gap/answer mismatch has its own check

      brackets.forEach((b, i) => {
        if (!b.includes('/')) return;                    // one word in brackets: a conjugation cue, not a choice
        const opts = b.split('/').map(s => s.trim());
        if (CUE.includes(opts[0].toLowerCase())) return; // a conjugation cue carrying an adverb
        multipleChoiceCount++;
        if (!opts.includes(parts[i])) {
          answerOutsideOptions.push(p.slug + ': ' + x.en + ' → ' + parts[i] + ' (options: ' + opts.join(' | ') + ')');
        }
      });
    }
  }

  ok(multipleChoiceCount > 200, 'Enough multiple-choice sentences for this check to mean anything (' + multipleChoiceCount + ')');

  /* An English sentence may hold only Latin letters, digits and familiar punctuation.
     A character from another script, slipped in by a keyboard-layout mistake, is nearly
     invisible among a thousand sentences — but shows on the page at once, and TTS says it. */
  const LATIN_ONLY = /^[\x20-\x7E‘’“”–—…→]*$/;
  const foreignChars = s => [...s].filter(c => !LATIN_ONLY.test(c)).join('');
  let foreign = [];
  for (const p of allPoints) {
    const d = await get('/api/learn/grammar/' + p.slug);
    const englishSentences = [
      ...d.examples.map(x => x.en),
      ...d.practice.map(x => x.en),
      ...d.point.confuse.flatMap(c => (c.pair || []).map(s => s.en)),
      ...d.point.errors.flatMap(e => [e.wrong, e.right])
    ];
    for (const s of englishSentences) {
      /* A Vietnamese proper name in an example is deliberate, so strip Vietnamese diacritics */
      const stray = foreignChars(s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd'));
      if (stray) foreign.push(p.slug + ': ' + JSON.stringify(stray) + ' in "' + s + '"');
    }
  }
  ok(foreign.length === 0, 'No English sentence carries a character from another script' +
    (foreign.length ? ' (' + foreign.length + ' places, e.g. ' + foreign[0] + ')' : ''));
  ok(answerOutsideOptions.length === 0, 'The answer is always among the options of a multiple-choice sentence' +
    (answerOutsideOptions.length ? ' (' + answerOutsideOptions.length + ' wrong, e.g. ' + answerOutsideOptions[0] + ')' : ''));
  ok(practiceTotal === 12 * 12 + 9 * 10 + 28 * 10 + 16 * 10 + 29 * 10 + 20 * 10 + 22 * 10 + 29 * 10 + 21 * 10 + 33 * 10,
    'All of grammar comes to ' + (12 * 12 + 9 * 10 + 28 * 10 + 16 * 10 + 29 * 10 + 20 * 10 + 22 * 10 + 29 * 10 + 21 * 10 + 33 * 10) + ' practice sentences (' + practiceTotal + ')');

  /* ============ 7. The self-study pages ============ */
  console.log('\n\x1b[1m== Self-study pages ==\x1b[0m');

  const ctx = await browser.newContext();
  const errs = [];
  ctx.on('weberror', e => errs.push(String(e.error())));

  const page = await login(ctx);

  /* The verb table: the table build for wide screens and the card build for narrow ones
     share one dataset, and both have to be filled. */
  await page.goto(BASE + '/prep/hoc/dong-tu-bat-quy-tac/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#tbody tr', { timeout: 10000 });
  const rowCount = await page.locator('#tbody tr').count();
  ok(rowCount === irr.count, 'The verb page shows all ' + irr.count + ' rows (saw ' + rowCount + ')');
  ok(await page.locator('#cards article').count() === irr.count, 'The narrow-screen card build has as many rows');
  ok(await page.locator('#empty[hidden]').count() === 1, 'The verb page shows no empty state when there is data');

  await page.goto(BASE + '/prep/hoc/tu-noi/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#grid article', { timeout: 10000 });
  const cardCount = await page.locator('#grid article').count();
  ok(cardCount === lw.count, 'The linking-word page shows all ' + lw.count + ' cards (saw ' + cardCount + ')');
  ok(await page.locator('#empty[hidden]').count() === 1, 'No empty state when there is data');
  ok(await page.locator('#skeleton.hidden').count() === 1, 'The skeleton has given way to the content');

  /* Filtering by function in the interface has to match the API's numbers */
  await page.click('[data-fn="contrast"]');
  await page.waitForTimeout(350);
  const afterFilter = await page.locator('#grid article').count();
  ok(afterFilter === lwFn.words.length,
    'The "contrast" chip filters down to ' + lwFn.words.length + ' cards (saw ' + afterFilter + ')');

  /* Search for a string that certainly is not there → the empty state, not a blank page */
  await page.click('[data-fn=""]');
  await page.fill('#q', 'zzzznosuchword');
  await page.waitForTimeout(400);
  ok(await page.locator('#empty:not([hidden])').count() === 1, 'A search with no hits shows the empty state');
  ok(await page.locator('#grid[hidden]').count() === 1, 'The grid hides when there are no results');

  /* The clear-filters button has to bring the whole list back */
  await page.click('#clear');
  await page.waitForTimeout(350);
  ok(await page.locator('#grid article').count() === lw.count, 'The "Clear filters" button brings the whole list back');

  /* --- The tense page: open and close, load the detail, reveal the answers --- */
  await page.goto(BASE + '/prep/hoc/thi/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 21, 'The tense page shows all 21 items');

  /* The detail loads only when opened — 384 sentences are not preloaded into the page */
  ok(await page.locator('#list [data-answer]').count() === 0, 'Nothing is loaded before an item is opened');

  await page.click('[data-toggle="present-perfect"]');
  // state 'attached': the answer is deliberately hidden until revealed, so waiting for 'visible' would hang
  await page.waitForSelector('#list article[data-slug="present-perfect"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const card = page.locator('article[data-slug="present-perfect"]');
  ok(await card.locator('[data-answer]').count() === 12, 'Opening it shows all 12 practice sentences');
  ok(await card.locator('[data-answer]:not([hidden])').count() === 0, 'The answers stay hidden until revealed');

  const body = await card.innerText();
  ok(/When NOT to use it/.test(body), 'The detail has the "when NOT to use it" section');
  ok(/Telling it apart from similar tenses/.test(body), 'The detail has the telling-apart section');
  ok(/Mistakes Vietnamese learners make/.test(body), 'The detail has the common-mistakes section');

  await card.locator('[data-reveal]').click();
  await page.waitForTimeout(250);
  ok(await card.locator('[data-answer]:not([hidden])').count() === 12, 'Pressing "Reveal all answers" shows all 12');

  await page.click('[data-toggle="present-perfect"]');
  await page.waitForTimeout(250);
  ok(await page.locator('#list [data-answer]').count() === 0, 'Pressing again collapses it');

  /* Filtering by level */
  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  const a1Count = (await get('/api/learn/grammar?grp=tense&level=A1')).count;
  ok(await page.locator('#list article').count() === a1Count,
    'Filtering by A1 leaves ' + a1Count + ' items');

  /* At C2 this group holds only sequencing points, no tenses */
  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  const c2Count = (await get('/api/learn/grammar?grp=tense&level=C2')).count;
  ok(await page.locator('#list article').count() === c2Count && c2Count === 2,
    'Filtering by C2 leaves exactly 2 sequencing points');

  /* --- The noun page shares the PrepGrammar block with the 12-tense page --- */
  await page.goto(BASE + '/prep/hoc/danh-tu/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 28, 'The noun page shows all 28 items');

  await page.click('[data-toggle="article-a-an"]');
  await page.waitForSelector('#list article[data-slug="article-a-an"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const nCard = page.locator('article[data-slug="article-a-an"]');
  ok(await nCard.locator('[data-answer]').count() === 10, 'Opening it shows all 10 practice sentences');
  const nBody = await nCard.innerText();
  ok(/Quick reminders/.test(nBody), 'The chip-block label changes per group to "Quick reminders"');
  ok(/Telling it apart from similar items/.test(nBody), 'The telling-apart label changes per group');
  ok(/When NOT to use it/.test(nBody), 'The "when NOT to use it" section is still there');

  await nCard.locator('[data-reveal]').click();
  await page.waitForTimeout(250);
  ok(await nCard.locator('[data-answer]:not([hidden])').count() === 10, 'The reveal button works on the noun page too');

  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 8, 'Filtering by A1 leaves 8 items');

  /* --- The adjective, adverb and comparison page --- */
  await page.goto(BASE + '/prep/hoc/tinh-tu/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 16, 'The adjective page shows all 16 items');

  await page.click('[data-toggle="adj-ed-ing"]');
  await page.waitForSelector('#list article[data-slug="adj-ed-ing"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const ttCard = page.locator('article[data-slug="adj-ed-ing"]');
  ok(await ttCard.locator('[data-answer]').count() === 10, 'Opening it shows all 10 practice sentences');
  ok(/bored/i.test(await ttCard.innerText()), 'The detail shows the -ed/-ing content');

  /* This group has nothing at C2 yet, so the empty state has to appear */
  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#empty:not([hidden])').count() === 1,
    'A level with nothing written yet shows the empty state');
  await page.click('#clear');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 16, 'The "Clear filters" button brings all 16 items back');

  /* --- The modal verb page --- */
  await page.goto(BASE + '/prep/hoc/khuyet-thieu/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 29, 'The modal page shows all 29 items');

  await page.click('[data-toggle="must-vs-have-to"]');
  await page.waitForSelector('#list article[data-slug="must-vs-have-to"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  const mCard = page.locator('article[data-slug="must-vs-have-to"]');
  ok(await mCard.locator('[data-answer]').count() === 10, 'Opening it shows all 10 practice sentences');
  ok(/CẤM/.test(await mCard.innerText()), 'The detail says outright that mustn\'t is a ban');

  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 3, 'Filtering by A1 leaves 3 items');

  /* --- The conditional page --- */
  await page.goto(BASE + '/prep/hoc/dieu-kien/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 20, 'The conditional page shows all 20 items');

  await page.click('[data-toggle="conditional-third"]');
  await page.waitForSelector('#list article[data-slug="conditional-third"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="conditional-third"] [data-answer]').count() === 10,
    'Opening it shows all 10 practice sentences');

  await page.selectOption('#f-level', 'A2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 2, 'Filtering by A2 leaves 2 items');

  /* --- The passive and reported-speech page --- */
  await page.goto(BASE + '/prep/hoc/bi-dong/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 22, 'The passive page shows all 22 items');

  await page.click('[data-toggle="passive-basic"]');
  await page.waitForSelector('#list article[data-slug="passive-basic"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="passive-basic"] [data-answer]').count() === 10,
    'Opening it shows all 10 practice sentences');

  /* A C2 item sits at the end of a long list, and has to open like the first one */
  await page.click('[data-toggle="free-indirect-speech"]');
  await page.waitForSelector('#list article[data-slug="free-indirect-speech"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="free-indirect-speech"] [data-answer]').count() === 10,
    'The C2 item at the end of the list opens with all 10 practice sentences too');

  await page.selectOption('#f-level', 'A2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 2, 'Filtering by A2 leaves 2 items');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 4, 'Filtering by C2 leaves 4 items');

  /* --- The relative and subordinate clause page --- */
  await page.goto(BASE + '/prep/hoc/menh-de/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 29, 'The clause page shows all 29 items');

  await page.click('[data-toggle="adverbial-reason-basic"]');
  await page.waitForSelector('#list article[data-slug="adverbial-reason-basic"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="adverbial-reason-basic"] [data-answer]').count() === 10,
    'Opening it shows all 10 practice sentences');

  /* A B2 item sits at the end of a long list, and has to open like the first one */
  await page.click('[data-toggle="noun-clause-what-whether"]');
  await page.waitForSelector('#list article[data-slug="noun-clause-what-whether"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="noun-clause-what-whether"] [data-answer]').count() === 10,
    'The B2 item at the end of the list opens with all 10 practice sentences too');

  await page.selectOption('#f-level', 'A2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 3, 'Filtering by A2 leaves 3 items');

  await page.selectOption('#f-level', 'B1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 6, 'Filtering by B1 leaves 6 items');

  await page.selectOption('#f-level', 'B2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 8, 'Filtering by B2 leaves 8 items');

  await page.selectOption('#f-level', 'C1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Filtering by C1 leaves 7 items');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 5, 'Filtering by C2 leaves 5 items');

  /* The C2 item at the end of a 29-item list has to open like the first one */
  await page.click('[data-toggle="clause-attachment"]');
  await page.waitForSelector('#list article[data-slug="clause-attachment"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="clause-attachment"] [data-answer]').count() === 10,
    'The C2 item at the end of the list opens with all 10 practice sentences too');

  /* --- The inversion, emphasis and cleft page --- */
  await page.goto(BASE + '/prep/hoc/nhan-manh/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 21, 'The inversion page shows all 21 items');

  await page.click('[data-toggle="negative-inversion-basic"]');
  await page.waitForSelector('#list article[data-slug="negative-inversion-basic"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="negative-inversion-basic"] [data-answer]').count() === 10,
    'Opening it shows all 10 practice sentences');

  await page.selectOption('#f-level', 'B1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 2, 'Filtering by B1 leaves 2 items');

  await page.selectOption('#f-level', 'C1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Filtering by C1 leaves 7 items');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Filtering by C2 leaves 7 items');

  /* The C2 item at the end of a 21-item list has to open like the first one */
  await page.click('[data-toggle="emphasis-far-from"]');
  await page.waitForSelector('#list article[data-slug="emphasis-far-from"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="emphasis-far-from"] [data-answer]').count() === 10,
    'The C2 item at the end of the list opens with all 10 practice sentences too');

  /* --- The nuance, register and hedging page --- */
  await page.goto(BASE + '/prep/hoc/sac-thai/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#list article', { timeout: 10000 });
  ok(await page.locator('#list article').count() === 33, 'The register page shows all 33 items');

  await page.click('[data-toggle="indirect-questions"]');
  await page.waitForSelector('#list article[data-slug="indirect-questions"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="indirect-questions"] [data-answer]').count() === 10,
    'Opening it shows all 10 practice sentences');

  await page.selectOption('#f-level', 'A1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 1, 'Filtering by A1 leaves 1 item');

  await page.selectOption('#f-level', 'B2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 7, 'Filtering by B2 leaves 7 items');

  await page.selectOption('#f-level', 'C1');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 9, 'Filtering by C1 leaves 9 items');

  await page.selectOption('#f-level', 'C2');
  await page.waitForTimeout(300);
  ok(await page.locator('#list article').count() === 10, 'Filtering by C2 leaves 10 items');

  /* The C2 item at the end of a 33-item list — the last item of the whole grammar area */
  await page.selectOption('#f-level', '');
  await page.waitForTimeout(300);
  await page.click('[data-toggle="register-shift-for-effect"]');
  await page.waitForSelector('#list article[data-slug="register-shift-for-effect"] [data-answer]',
    { state: 'attached', timeout: 10000 });
  ok(await page.locator('article[data-slug="register-shift-for-effect"] [data-answer]').count() === 10,
    'The very last item of the grammar area opens with all 10 practice sentences too');

  /* --- The scroller on the navigation chip row ---
     The chip row is longer than the screen, so the last items get cut off. Narrow the
     viewport to force the overflow, then check all three things: the wrapper is right, the
     current item scrolls into view, and the arrow button really scrolls.

     Loaded in VIETNAMESE on purpose, and every selector below hangs off
     data-rail rather than the aria-label. Both of those are the same lesson:
     this block used to select nav[data-rail="self-study"], the label
     i18n.js rewrites, so the suite and the code agreed on a selector that
     matched nothing in the default language. Every check here passed while the
     feature was dead for every real user. A test that shares the bug with the
     code it is testing is worse than no test, because it certifies it. */
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(BASE + '/prep/hoc/sac-thai/?lang=vi', { waitUntil: 'networkidle' });
  await page.waitForSelector('nav[data-rail="self-study"]', { timeout: 10000 });

  ok(await page.locator('nav[data-rail="self-study"]').getAttribute('aria-label') !== 'Self-study topics',
    'The page really is in Vietnamese, which is the state the scroller used to break in',
    await page.locator('nav[data-rail="self-study"]').getAttribute('aria-label'));

  ok(await page.locator('.navscroll nav[data-rail="self-study"]').count() === 1,
    'The chip row is wrapped in a container with a scroller');
  ok(await page.locator('nav[data-rail="self-study"].navscroll-track').count() === 1,
    'The chip row switches to a visible scrollbar');

  const chipScrollLeft = () => page.evaluate(
    () => document.querySelector('nav[data-rail="self-study"]').scrollLeft);
  const overflowPx = await page.evaluate(() => {
    const n = document.querySelector('nav[data-rail="self-study"]');
    return n.scrollWidth - n.clientWidth;
  });
  ok(overflowPx > 0, 'In a narrow viewport the chip row really does overflow (' + overflowPx + 'px)');

  /* The register page is the last chip in the row: opening it has to bring the chip into view */
  ok(await chipScrollLeft() > 0, 'Opening the page scrolls the current chip into view');

  /* Checked properly: the chip has to sit WHOLLY inside the visible strip of the row.
     isVisible() is no good — it only asks whether an element has a size, not where the
     scroll sits — and the page carries a second [aria-current] in the main navigation,
     which collapses in a narrow viewport and answers the wrong question entirely. */
  const chipFullyVisible = await page.evaluate(() => {
    const nav = document.querySelector('nav[data-rail="self-study"]');
    const chip = nav.querySelector('[aria-current="page"]');
    if (!chip) return false;
    const n = nav.getBoundingClientRect(), c = chip.getBoundingClientRect();
    return c.left >= n.left - 1 && c.right <= n.right + 1;
  });
  ok(chipFullyVisible, 'The chip for the current page sits wholly inside the visible strip');

  /* Scrolled right, the back button has to show and the forward one hide, being out of road */
  ok(await page.locator('.navscroll-prev').isVisible(), 'The back button shows while items are hidden to the left');
  const beforeScrollBack = await chipScrollLeft();
  await page.click('.navscroll-prev');
  await page.waitForTimeout(600);
  ok(await chipScrollLeft() < beforeScrollBack, 'Pressing back really scrolls the chip row left');

  /* Back at the start, the back button hides itself and the forward button appears */
  await page.evaluate(() => { document.querySelector('nav[data-rail="self-study"]').scrollLeft = 0; });
  await page.waitForTimeout(300);
  ok(await page.locator('.navscroll-prev').isHidden(), 'Back at the start the back button hides itself');
  ok(await page.locator('.navscroll-next').isVisible(), 'The forward button shows while items are hidden to the right');
  await page.setViewportSize({ width: 1280, height: 900 });

  ok(errs.length === 0, 'No JavaScript error on any of the eleven self-study pages' +
    (errs.length ? ': ' + errs[0] : ''));

  await ctx.close();
} finally {
  await browser.close();
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
