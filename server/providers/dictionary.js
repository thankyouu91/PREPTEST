/**
 * Free Dictionary API — definitions, pronunciation and Vietnamese glosses.
 *
 *   https://freedictionaryapi.com/api/v1/entries/{language}/{word}
 *
 * Wiktionary data under CC BY-SA 4.0. No key, no account.
 *
 * ---------------------------------------------------------------------------
 * A BUILD-TIME TOOL, NOT A REQUEST-TIME ONE
 *
 * Nothing on a candidate's path may call this, and the marking layer must never
 * touch it. Four reasons, and the last is the one that settles it:
 *
 *   1. A 150-word essay would be 150 lookups. Marking a sitting would be
 *      thousands of round trips against a free service.
 *   2. Marking would then fail whenever the service is slow or down — or worse,
 *      quietly find no spelling errors and report a clean paper.
 *   3. Candidate answers would leave the platform, one word at a time, to a
 *      third party who never agreed to hold them.
 *   4. **A mark must be reproducible.** docs/MARKING.md rests on being able to
 *      recompute every mark ever given when the band anchors move. A mark that
 *      depended on what a remote dictionary said last Tuesday cannot be
 *      recomputed, only re-guessed.
 *
 * So spell checking and CEFR banding stay on the local lexicon in
 * `server/data/lexicon.js`: offline, deterministic, versioned in git. This
 * provider fills the self-study vocabulary, which is authored once, cached in
 * `vocab_entries`, and where richness is worth a network call.
 *
 * ---------------------------------------------------------------------------
 * ATTRIBUTION IS NOT OPTIONAL
 *
 * CC BY-SA requires the source and licence to travel with the text. Every entry
 * the API returns carries `source.url` and `source.license`, and the importer
 * writes both into `vocab_entries.source` / `.licence` and onto each example.
 * An entry that arrives without them is skipped rather than stored bare —
 * unattributed CC BY-SA text in a commercial product is a licence breach, and
 * it is cheaper to drop a word than to find that out later.
 *
 * ---------------------------------------------------------------------------
 * A DICTIONARY, THEN AN OPINION
 *
 * Two layers, kept apart deliberately:
 *
 *   normalise()  reshapes what the API said into what the tables hold, and is
 *                faithful to the source. It drops senses no learner is reading
 *                today and orders what remains most-useful-first, but it never
 *                decides that a word is unsuitable.
 *   teachable()  is the syllabus opinion, and an opt-in one. The automated
 *                importer applies it; an administrator adding a word by hand
 *                does not, and neither does anything on a marking path.
 *
 * Everything either function does was forced by a real word. `festival` and
 * `trunk` for the missing Vietnamese glosses, `reasonable` for the archaic
 * lead, `accommodation` and `ironic` for over-read parentheticals, `sink` for
 * the slang lead, `theatre` for the region labels, `fag` for the slurs. Each is
 * named at the rule it produced, so the next person to change one can see what
 * it was protecting.
 */
'use strict';

const BASE = 'https://freedictionaryapi.com/api/v1';

/* Wiktionary parts of speech → the short codes vocab_entries uses. Anything
   unmapped is kept as-is rather than forced into a bucket it does not belong
   in; the column is a label, not an enum. */
const POS = {
  noun: 'noun', verb: 'verb', adjective: 'adj', adverb: 'adv',
  preposition: 'prep', conjunction: 'conj', determiner: 'det', article: 'det',
  pronoun: 'pron', interjection: 'phrase', numeral: 'noun',
  'proper noun': 'noun', phrase: 'phrase', 'prepositional phrase': 'phrase'
};

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Senses a learner should never be shown, and senses that should not lead.
 *
 * Wiktionary is a historical dictionary. It orders senses by how the meaning
 * developed, so "reasonable" opens on "(now rare) having the faculty of reason"
 * and "trunk" opens on "(heading, biology) Part of a body." — a section header
 * whose actual sub-senses this API does not return. Stored as-is, a B2 word
 * list would teach the wrong meaning of a word it says is worth learning.
 *
 * Two rules, and they do different things on purpose:
 *
 *   DROP    a sense nobody is learning today — obsolete, archaic, dated, rare —
 *           and the heading stubs, which carry no definition at all.
 *   DEMOTE  a sense that is real but confined to a subject field: keep it, put
 *           it after the general ones. "negligence" is genuinely a legal term,
 *           so dropping (law) would empty the entry, but a learner meeting the
 *           word wants "the state of being negligent" first.
 *
 * The restriction is read off the leading parenthetical — but by naming the
 * fields and places, not by taking every parenthetical for a restriction. That
 * first attempt failed badly, because Wiktionary puts far more than labels in
 * there: "(of a situation)" on `ironic`, "(physical)" and "(personal)" on
 * `accommodation`, "(relational)" on `facial`. Reading those as subject fields
 * marked every sense of those words restricted, and the importer then threw the
 * words away as too specialised to teach — three ordinary B2 words lost to a
 * punctuation habit.
 *
 * So the lists below are allow-lists, and anything not on them counts as
 * general. They are not exhaustive and are not meant to be: a field label this
 * file has not heard of leaves the sense where Wiktionary put it, which is the
 * harmless direction. Over-reading a parenthetical is the direction that costs
 * real words.
 */
const SKIP_TAGS = new Set([
  'obsolete', 'archaic', 'dated', 'rare',
  /* An inflection pointer, not a meaning: "simple past and past participle of
     ashame", "plural of datum". The base word is already an entry and the forms
     belong in `vocab_forms`; as a card of its own it teaches nothing. */
  'form of',
  /* And a misspelling is worse than nothing. "Misspelling of bloc." had landed
     in the B1 list as a sense of "block" — a card teaching a learner to write
     the wrong word. */
  'misspelling'
]);

/**
 * Dropped — and if a whole etymology consists of them, the word is marked.
 *
 * Dropping the sense alone is not enough. Wiktionary files the slur senses of
 * "fag" under their own etymology, so removing them leaves a tidy entry about
 * cigarettes and Victorian schoolboys, and the word lands in a B2 list looking
 * harmless. It is not harmless: the sense a learner will actually meet is the
 * one just removed.
 *
 * But "any offensive sense anywhere disqualifies the word" is far too wide. A
 * long Wiktionary entry usually has one somewhere, and that rule threw out
 * "wet", "cheese", "cancer" and "curry" — four ordinary B1 words — to catch one
 * slur. So the mark is set only when an entire part of speech is emptied by
 * these drops. A whole etymology that is nothing but slurs is a fact about the
 * word; a single coarse sense in the tail of a long entry is not.
 *
 * `teachable()` reads the mark; `normalise()` only records it, because an
 * administrator adding such a word deliberately is their call to make.
 *
 * Deliberately NOT including "derogatory". Wiktionary hangs that label on a
 * derogatory *sense* of many ordinary words — "wet" for a feeble person,
 * "square" for a conventional one, "cancer" for a harmful influence — and
 * treating it as disqualifying threw out "cheese", "toilet", "attorney" and a
 * dozen more. Those senses are demoted instead, by NON_STANDARD below.
 */
const OFFENSIVE_TAGS = new Set(['vulgar', 'offensive', 'slur', 'ethnic slur']);

/**
 * The part the labels cannot reach, kept by hand and named as such.
 *
 * Wiktionary orders "cock" from "a male bird" and "queer" from "odd", so their
 * everyday sense in a classroom is not the one that leads. No rule reading
 * those labels will place them, and inventing a cleverer rule to try cost four
 * ordinary words the last time. A short list a person maintains is the honest
 * instrument here: it is visible, it is arguable, and it does not pretend to be
 * derived from anything.
 *
 * Only for the automated importer. It has no bearing on what an administrator
 * may add by hand, and none at all on marking — a candidate who writes any of
 * these is not penalised for it.
 */
const NOT_FOR_SCHOOL = new Set([
  'cock', 'queer', 'slag', 'fag', 'faggot', 'dyke', 'tranny', 'spastic',
  'bitch', 'bastard', 'wank', 'shag', 'bugger', 'prick', 'knob', 'tit',
  'arse', 'ass', 'crap', 'piss', 'turd', 'twat', 'douche', 'hoe'
]);

/** Subject fields. A sense marked with one is real but specialised. */
const FIELDS = new Set([
  'anatomy', 'medicine', 'medical', 'surgery', 'dentistry', 'psychiatry', 'psychology',
  'physiology', 'pharmacology', 'immunology', 'genetics', 'veterinary', 'obstetrics',
  'biology', 'botany', 'zoology', 'ecology', 'entomology', 'ornithology', 'microbiology',
  'chemistry', 'biochemistry', 'physics', 'astronomy', 'geology', 'meteorology',
  'mathematics', 'maths', 'math', 'geometry', 'algebra', 'statistics', 'logic',
  'computing', 'programming', 'software engineering', 'internet', 'electronics',
  'engineering', 'electrical', 'telecommunications', 'rail transport', 'automotive',
  'aviation', 'nautical', 'military', 'law', 'legal', 'economics', 'finance',
  'accounting', 'business', 'marketing', 'insurance', 'politics', 'government',
  'religion', 'biblical', 'theology', 'mythology', 'philosophy', 'linguistics',
  'grammar', 'rhetoric', 'literature', 'poetry', 'music', 'art', 'architecture',
  'film', 'theatre', 'photography', 'printing', 'typography', 'journalism',
  'sports', 'football', 'cricket', 'baseball', 'basketball', 'golf', 'tennis',
  'chess', 'cards', 'gaming', 'video games', 'agriculture', 'cooking', 'cuisine',
  'mining', 'metallurgy', 'textiles', 'fashion', 'heraldry', 'archaeology',
  'education', 'sciences', 'social media', 'pornography', 'sex'
]);

/**
 * Places — split, because "British" and "Jamaica" mean different things here.
 *
 * A mainstream national variety is not a dialect. The platform itself writes
 * British English, and Wiktionary labels "marvellous" (British) simply because
 * the American spelling drops an l. Treating that as a regionalism threw the
 * word out of a C1 list, which is absurd — as it would for "colour",
 * "organise" and every other word on that fault line.
 *
 * A narrower variety is a different matter. A word that exists only in Singlish
 * or only in Jamaica is worth recognising, not worth teaching to a Vietnamese
 * candidate sitting a general English exam.
 */
const VARIETIES = new Set([
  'british', 'uk', 'england', 'american', 'us', 'usa', 'canada', 'canadian',
  'australia', 'australian', 'new zealand', 'ireland', 'irish', 'south africa'
]);

const LOCAL = new Set([
  'scotland', 'scottish', 'scots', 'wales', 'welsh', 'india', 'indian english',
  'pakistan', 'caribbean', 'jamaica', 'singapore', 'singlish', 'manglish',
  'malaysia', 'philippines', 'hong kong', 'nigeria', 'hawaii', 'dialectal',
  'dialect', 'regional', 'cockney', 'aave', 'appalachia', 'new england', 'midlands'
]);

const leading = en => {
  const m = /^\(([^)]{1,120})\)/.exec(en);
  return m ? m[1].toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
};

/**
 * Does this label name a variety narrower than a national standard? Matched by
 * word, not whole string, because the labels arrive qualified: "chiefly
 * Scotland", "Southwestern US", "historical US politics".
 */
const namesLocal = label =>
  LOCAL.has(label) || label.split(/\s+/).some(t => LOCAL.has(t));

const namesVariety = label =>
  VARIETIES.has(label) || label.split(/\s+/).some(t => VARIETIES.has(t));

/** A stub header rather than a definition — Wiktionary's own word for it. */
const isHeading = (en, tags) =>
  leading(en).includes('heading') || tags.includes('heading');

/**
 * Confined to a subject field, so it should not lead the entry.
 *
 * Field only, not place. Demoting regional senses looked right until
 * "accommodation": Wiktionary labels the lodging sense "(British, Australia)"
 * because American English says "accommodations", so demoting it put "(physical)
 * Adaptation or adjustment" at the top of the card — a sense almost no learner
 * will ever need, above the one they came for.
 */
const isRestricted = en => leading(en).some(l => FIELDS.has(l));

/**
 * Tied to a local variety — a dialect sense rather than a general one.
 *
 * A label naming a national standard cancels it, however many narrow varieties
 * sit beside it. Wiktionary marks `theatre` "(chiefly Australia, Canada, New
 * Zealand, UK, Hong Kong…)", and reading the tail of that list as a dialect
 * marker dropped the standard British spelling of a common word.
 */
const isRegional = en => {
  const ls = leading(en);
  if (!ls.some(namesLocal)) return false;
  /* A label that is itself a narrow variety cannot be the one doing the
     cancelling — "New England" contains "England" and is not a national
     standard. So only labels outside LOCAL are read for a variety. */
  return !ls.some(l => !LOCAL.has(l) && namesVariety(l));
};

/**
 * Look one word up.
 *
 * Returns null when the word is not in the dictionary — a normal outcome for a
 * frequency list, which contains names, fragments and slang. Throws only on a
 * transport or server failure, so a caller can tell "no such word" apart from
 * "the service is down" and retry only the second.
 */
async function lookup(word, opts = {}) {
  const lang = opts.language || 'en';
  const url = `${BASE}/entries/${encodeURIComponent(lang)}/${encodeURIComponent(word)}`
    + '?translations=true';

  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: opts.signal
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const e = new Error(`dictionary lookup failed: ${res.status}`);
    e.status = res.status;
    /* 429 and 5xx are worth retrying; 4xx below that is not. The caller decides,
       but it needs the status to decide with. */
    e.retryable = res.status === 429 || res.status >= 500;
    throw e;
  }

  const body = await res.json();
  if (!body || !Array.isArray(body.entries) || !body.entries.length) return null;
  return normalise(word, body);
}

/**
 * The API's shape, reduced to what `vocab_entries` and its children hold.
 *
 * One returned object per part of speech, because the table's natural key is
 * (headword, pos) — "book" the noun and "book" the verb are two entries, and
 * flattening them would make one overwrite the other.
 */
function normalise(word, body) {
  const src = body.source || {};
  const sourceUrl = str(src.url, 300);
  const licence = str((src.license || {}).name, 100);
  /* No attribution, no entry. See the header. */
  if (!sourceUrl || !licence) return null;

  const out = [];

  /* A fact about the word, not about one part of speech. Wiktionary files the
     slur senses of "fag" under their own etymology, so every sense of that
     entry is dropped, the entry never reaches `out`, and a flag living inside
     the loop would vanish with it — leaving the word looking like an innocent
     word for a cigarette. */
  let offensive = false;

  for (const e of body.entries) {
    if (!e || (e.language && e.language.code && e.language.code !== 'en')) continue;

    let coarse = 0;   // senses of THIS part of speech dropped as slurs

    const usable = (e.senses || [])
      .map(s => {
        const en = str(s.definition, 400);
        if (!en) return null;
        /* Wiktionary's Vietnamese glosses are patchy: "tradition" has one,
           "festival" and "trunk" do not. Dropping a sense for that reason threw
           away two thirds of an ordinary B2 batch — ordinary, teachable words
           lost to a gap in one wiki's translation coverage, which is the
           opposite of what this importer is for.

           So the English definition is what makes a sense; `vi` is empty when
           Wiktionary has no gloss. Empty is not a translation and must never be
           shown as one — the API marks such senses `viPending`, and the
           importer counts them so the backlog is a number someone can work
           through, not a silent hole. `vocab_examples.vi` already works this
           way for the same reason. */
        const vi = str(((s.translations || [])
          .find(t => t.language && t.language.code === 'vi') || {}).word, 200);
        const tags = (s.tags || []).map(t => String(t).toLowerCase());

        if (tags.some(t => OFFENSIVE_TAGS.has(t))) { coarse++; return null; }
        if (tags.some(t => SKIP_TAGS.has(t))) return null;   // not learnt today
        if (isHeading(en, tags)) return null;                // a header, not a meaning

        return {
          en,
          vi,
          restricted: isRestricted(en),
          regional: isRegional(en),
          note: str((s.tags || []).join(', '), 300),
          examples: (s.examples || []).map(x => str(x, 300)).filter(Boolean).slice(0, 3)
        };
      })
      .filter(Boolean);

    /* General senses first, Wiktionary's own order kept inside each group, then
       take four. Partitioning rather than sorting, because Array#sort would let
       a comparator quietly reorder senses that tie.

       "General" means all three at once: not confined to a subject field, not
       confined to a local variety, not register-marked. `sink` is the case that
       forced the third — Wiktionary opens its verb entry on "(transitive,
       slang) To drink", so the card for one of the commonest words in English
       led on a slang sense.

       `restricted` and `regional` stay on the sense rather than being dropped
       here: `teachable()` needs them to tell a word worth teaching from one
       that lives only inside a field or a dialect. */
    const demoted = s => s.restricted || s.regional || NON_STANDARD.test(labels(s));
    const senses = [...usable.filter(s => !demoted(s)), ...usable.filter(demoted)]
      .slice(0, 4);

    /* This whole part of speech was nothing but slurs. Two, not one: "cancer"
       carries a single vulgar adjective sense from internet usage beside the
       disease, and that one sense is a footnote to the word, not what the word
       is. Three senses forming an entire etymology, as in "fag", are. */
    if (!usable.length && coarse >= 2) offensive = true;
    if (!senses.length) continue;

    /* IPA, split by the variety tag where the API gives one. Most entries tag
       US only; an untagged pronunciation is used for both rather than guessed at. */
    const ipa = (e.pronunciations || []).filter(p => p.type === 'ipa' && p.text);
    const tagged = t => str((ipa.find(p => (p.tags || []).includes(t)) || {}).text, 60);
    const any = str((ipa[0] || {}).text, 60);

    out.push({
      headword: String(word).toLowerCase(),
      pos: POS[String(e.partOfSpeech || '').toLowerCase()] || str(e.partOfSpeech, 20) || 'phrase',
      ipaUk: tagged('UK') || any,
      ipaUs: tagged('US') || any,
      senses,
      source: sourceUrl,
      licence
    });
  }

  if (!out.length) return null;
  out.forEach(e => { e.offensive = offensive; });
  return out;
}

/**
 * Is this word worth putting in front of a learner?
 *
 * A curriculum judgement, not a dictionary one — which is why `normalise()`
 * does not apply it. That function mirrors the source faithfully; this one is
 * an opinion a caller opts into. `scripts/nhap-tu-vung.mjs` does; an admin
 * adding a word by hand does not, and should not have to.
 *
 * The need is real. The frequency list behind the candidate selection comes
 * from film subtitles, so "randy" and "nah" sit in the same rank band as
 * "negligence" and "voyage". Nothing before the lookup can tell them apart: all
 * are real words, correctly spelt, in range. Only the senses reveal which is
 * which.
 *
 * Four rules. The first is a hand-kept list; the rest are narrow on purpose:
 *
 *   0a. The word is on NOT_FOR_SCHOOL. A person put it there.
 *   0b. A whole part of speech of the word is nothing but slurs — see
 *       OFFENSIVE_TAGS above.
 *   1. Every part of speech leads on a slang, vulgar or offensive sense. Then
 *      that is what a learner opening the card reads, whatever else it means.
 *      Every part of speech, not the first one the API happened to return —
 *      Wiktionary puts the verb of "sink" before the noun and opens it on
 *      "(transitive, slang) To drink", and judging by that alone threw out a
 *      word every A2 learner needs.
 *   2. Every sense, across every part of speech, is either register-marked
 *      (informal, slang, colloquial) or tied to one local variety. Then the
 *      word is something to recognise in a film, not something to be taught.
 *
 *   randy   (British, informal), then (chiefly Scotland)           → no
 *   nerd    every sense (slang) or (informal, derogatory)          → no
 *   sink    verb leads on slang, but the noun leads on "a basin"   → yes
 *   exam    (informal) clipping — but also a plain (sciences) verb → yes
 *   pelvis  every sense is (anatomy) — a field, not a register     → yes
 *
 * What is deliberately NOT a reason to reject: a subject field. An earlier
 * version treated (anatomy), (chemistry) and (law) as disqualifying, and threw
 * away "pelvis", "silicon", "urine" and "accommodation" — exactly the C1–C2
 * vocabulary this importer exists to add.
 *
 * Judged per word rather than per part of speech, because the parts inform each
 * other: "exam" is informal as a noun and plain as a verb, and dropping the
 * noun would leave the entry holding the wrong half of the word.
 */
const SLANG = /\b(slang|vulgar|offensive)\b/i;
const NON_STANDARD =
  /\b(slang|vulgar|offensive|derogatory|informal|colloquial|humorous)\b/i;

/**
 * Where a sense states its register — both places, because the API uses both.
 *
 * "(uncountable, slang) Cocaine." arrives with tags ["slang","uncountable"] AND
 * the same label inside the definition, but not every sense carries the tag.
 * Reading only `tags` let a slang sense through whenever the label existed only
 * in the printed parenthetical, which is the half a human would have seen.
 */
const labels = s => (s.note || '') + ' ' + leading(s.en || '').join(', ');

/** Ordinary standard English, belonging to no particular place. */
const plain = s => !s.regional && !NON_STANDARD.test(labels(s));

function teachable(entries) {
  const all = [].concat(entries || []).filter(Boolean).filter(e => (e.senses || []).length);
  if (!all.length) return false;
  if (NOT_FOR_SCHOOL.has(String(all[0].headword || '').toLowerCase())) return false;
  if (all.some(e => e.offensive)) return false;
  if (all.every(e => SLANG.test(labels(e.senses[0])))) return false;
  return all.flatMap(e => e.senses).some(plain);
}

module.exports = { lookup, normalise, teachable, BASE, POS };
