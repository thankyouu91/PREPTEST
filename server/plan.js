/**
 * The weekly plan, and the tips that go with it.
 *
 * Block 6, and the piece that makes the other five feel like a course rather
 * than five tools on a shelf. Everything before this produced evidence; this
 * turns the evidence into three things to do, each of which is a link to a
 * feature that already exists.
 *
 * ## Three, and why not ten
 *
 * `ability.roadmap()` already defaults to three for parts. The same reasoning
 * applies harder here, because this list mixes parts, grammar topics and whole
 * skills: a ten-item plan is a list people close. Three fits on a phone without
 * scrolling, and finishing it is possible in an evening — which is the only
 * property that makes somebody come back for the next one.
 *
 * ## It never invents work
 *
 * Every item points at a route that exists and has material behind it. A plan
 * that says "practise Part H" when the bank holds no Part H items is worse than
 * a shorter plan: the learner presses it, nothing happens, and they stop
 * believing the next one. So candidates are filtered by what is actually there
 * before they are ranked, not after.
 *
 * ## Where the numbers come from
 *
 * Nowhere new. `server/ability.js` is the only thing on this platform with an
 * opinion about how good somebody is, and this file ranks what that opinion
 * says. If the plan and the progress panel ever disagree, it is a bug here and
 * not a second model.
 *
 * ## The tips
 *
 * Data, not prose in a template, so an administrator can change one without a
 * deploy — and shown AFTER a mistake of that kind rather than before. A tip
 * offered before the work is a tip people scroll past; the same words offered
 * ten seconds after getting it wrong are the ones that stick.
 */
'use strict';

const { q } = require('./db');
const ability = require('./ability');
const drills = require('./drills');
const revision = require('./revision');
const levelAdvice = require('./level-advice');

/** How many items a plan holds. Three is a deliberate ceiling, not a page size. */
const PLAN_SIZE = 3;

/** What "good enough" means when measuring the gap. 8/10 is a comfortable B2. */
const TARGET = 0.8;

/**
 * Tips, keyed by what they are about.
 *
 * Held here rather than in the database for now because they are content the
 * platform ships with, like the grammar points; the admin surface for editing
 * them is a later item and the shape below is what it will write into.
 *
 * Each is one specific, checkable move. "Read carefully" is not a tip — it is
 * what somebody already thought they were doing. What earns a place is
 * something a learner can DO differently on the next question.
 */
const TIPS = {
  'part:A': [{
    en: 'Read the whole sentence before the gap, not just the words touching it. Part A gaps are usually decided by something several words away — a time phrase, a plural subject — and the two words either side often fit either way.',
    vi: 'Đọc hết cả câu trước khi điền, đừng chỉ nhìn hai từ sát chỗ trống. Chỗ trống Part A thường bị quyết định bởi thứ cách đó vài từ — một trạng ngữ thời gian, một chủ ngữ số nhiều — còn hai từ sát bên thì thường điền kiểu nào cũng xuôi.'
  }, {
    en: 'Decide the WORD CLASS first, then the meaning. An article before the gap wants a noun, an auxiliary wants a participle, a preposition wants -ing. That one step usually cuts four options to one or two.',
    vi: 'Xác định TỪ LOẠI trước, nghĩa tính sau. Mạo từ trước chỗ trống thì cần danh từ, trợ động từ thì cần phân từ, giới từ thì cần V-ing. Riêng bước đó thường cắt bốn lựa chọn xuống còn một hoặc hai.'
  }],
  'part:B': [{
    en: 'You are marked on how much MEANING survives, not on the original wording. Getting three ideas across in your own plain English beats reproducing one sentence exactly and losing the rest.',
    vi: 'Bạn được chấm theo lượng Ý giữ lại được, không phải theo việc chép đúng chữ. Nói được ba ý bằng tiếng Anh mộc mạc của mình hơn hẳn việc chép đúng một câu rồi mất hết phần còn lại.'
  }],
  'part:D': [{
    en: 'Count the tasks in the prompt before you start writing, and tick them off. Most marks lost here are not grammar — they are a point the situation asked for and the e-mail never mentioned.',
    vi: 'Đếm xem đề yêu cầu mấy việc trước khi viết, rồi gạch đi từng cái. Điểm mất ở phần này phần lớn không phải vì ngữ pháp — mà vì một ý đề bắt nói mà email không hề nhắc tới.'
  }],
  'part:G': [{
    en: 'A short phrase is a full answer. The guide asks for "a short phrase or a very short sentence", so a correct three-word answer scores full marks — padding it out only creates something else to get wrong.',
    vi: 'Một cụm ngắn là câu trả lời đầy đủ. Hướng dẫn yêu cầu "một cụm ngắn hoặc một câu rất ngắn", nên trả lời đúng bằng ba từ là điểm tối đa — nói dài ra chỉ tạo thêm chỗ để sai.'
  }],
  'part:H': [{
    en: 'Hold the whole sentence before you start speaking. Beginning immediately and trailing off loses more than a short pause does — you are marked on how much of the sentence survives, not on how fast you begin.',
    vi: 'Giữ trọn câu trong đầu rồi hãy nói. Bật ra ngay rồi đuối ở giữa mất nhiều điểm hơn là dừng một nhịp — bạn được chấm theo lượng câu giữ được, không phải theo tốc độ bắt đầu.'
  }],
  'part:J': [{
    en: 'Events in the right order first, detail second. A retelling with all five events and no colour scores above a vivid one that loses two of them.',
    vi: 'Sự việc đúng thứ tự trước, chi tiết sau. Kể lại đủ năm sự việc mà khô khan vẫn hơn kể sinh động mà rơi mất hai.'
  }],
  'skill:writing': [{
    en: 'Write the closing line first, then the body. Knowing what you want the reader to DO stops the middle wandering, and it is the sentence markers look for.',
    vi: 'Viết câu kết trước, rồi mới viết thân bài. Biết trước mình muốn người đọc LÀM gì thì phần giữa không lan man, và đó cũng là câu người chấm tìm.'
  }],
  'skill:speaking': [{
    en: 'Use the thinking time to choose ONE example, not to plan a structure. A concrete example carries the answer; a plan you cannot remember while speaking does not.',
    vi: 'Dùng thời gian nghĩ để chọn MỘT ví dụ, đừng dùng để dựng dàn ý. Một ví dụ cụ thể sẽ đỡ cả câu trả lời; một dàn ý không nhớ nổi lúc đang nói thì không.'
  }],
  'grammar': [{
    en: 'When you get a form wrong, write the whole sentence out correctly once before moving on. Reading the right answer feels like learning and mostly is not; producing it is the thing being practised.',
    vi: 'Sai một dạng thì chép lại nguyên câu đúng một lần rồi hãy đi tiếp. Đọc đáp án đúng có cảm giác như đang học nhưng phần lớn là không; tự viết ra mới là thứ đang được luyện.'
  }]
};

function tipsFor(key) {
  if (TIPS[key]) return TIPS[key];
  /* A merged key like `skill:writing+speaking` has no entry of its own; take
     the tips of each skill it covers so a combined item is not left silent. */
  if (key.startsWith('skill:')) {
    return key.slice(6).split('+').flatMap(s => TIPS['skill:' + s] || []);
  }
  return [];
}

/* ------------------------------- Building it ------------------------------- */

const label = {
  notMeasured: ['Not measured yet', 'Chưa đo được'],
  /* Distinct from notMeasured on purpose: this one has a score beside it, and
     "Not measured yet - 6.5/10" is a sentence that argues with itself. */
  provisional: ['Still an estimate', 'Vẫn là ước lượng'],
  weakest: ['Your weakest area', 'Chỗ bạn yếu nhất'],
  belowTarget: ['Below where you are aiming', 'Còn dưới mục tiêu']
};

/**
 * Three things to do next, each with somewhere to press.
 *
 * Candidates come from three places and are ranked together rather than one of
 * each: a learner whose three worst problems are all grammar should be told
 * that, not given a tidy one-from-each-column plan that sends them somewhere
 * they do not need to be.
 */
async function weekly(userId, partWeights) {
  const ab = await ability.abilityOf(userId);
  const cand = [];

  /* 1. Exam parts — from drills.suggest() rather than from roadmap() directly.
        That function already does the two things this needs and got them wrong
        once each: it filters to parts with material behind them, and it fills
        the shortfall for a learner who has no data at all, whose roadmap is
        empty. Re-deriving either here would be a second copy to keep in step,
        and the copy that goes stale is always the one nobody is looking at. */
  /* Asked once and handed down, so the plan cannot recommend Level 2 on one
     line and hand out Level 1 drills on the next. */
  const nextPaper = await levelAdvice.recommendLevel(userId);
  const parts = await drills.suggest(userId, partWeights, 6, nextPaper.level);
  parts.forEach((r, i) => {
    if (!r.available) return;                     // nothing to press
    cand.push({
      kind: 'drill',
      key: 'part:' + r.part,
      part: r.part, level: r.level,
      titleEn: 'Practise Part ' + r.part,
      titleVi: 'Luyện Part ' + r.part,
      score: r.score, confident: r.confident, reason: r.reason,
      href: '/prep/luyen/',
      /* suggest() hands them back already ranked, so position IS the priority.
         Scaled to sit just under an unmeasured whole skill and around a weak
         grammar topic — the ordering between the three kinds is the only thing
         this file decides. */
      priority: 1.0 - i * 0.05
    });
  });

  /* 2. The weakest grammar topic. One, not three: grammar is a supporting skill
        and a plan that is all grammar sends nobody to the exam parts they are
        actually marked on. */
  const level = revision.levelFor(ab);
  const topics = await revision.weakestTopics(userId, level, 1);
  for (const t of topics) {
    cand.push({
      kind: 'revision',
      key: 'grammar',
      topic: t.slug, level,
      titleEn: 'Revise ' + t.nameEn,
      titleVi: 'Ôn ' + t.nameVi,
      score: t.score,
      confident: t.confident,
      reason: t.score === null ? 'notMeasured'
        : (!t.confident ? 'provisional' : (t.score < 5 ? 'weakest' : 'belowTarget')),
      href: '/prep/on-tap/',
      /* Ranked as if it were a part of average weight. Grammar competes on the
         same scale rather than being bolted on at the end, but it cannot
         outrank a genuinely weak exam part. */
      priority: (TARGET - (t.score === null ? 0.4 : t.score / 10)) * 1.0
    });
  }

  /* 3. A whole skill the model has never seen. After a placement that is
        Writing and Speaking every time, which is correct and is the point: the
        first thing to do about an unknown is go and measure it. */
  /* ONE item, however many skills are missing. Both of these are answered by
     the same action — sit a paper — so listing them separately spends two of
     three slots pointing at one button. The first version did exactly that and
     the plan read as though there were two things to do. */
  const missing = ['writing', 'speaking'].filter(sk => {
    const est = (ab.skills || {})[sk];
    return !est || !est.n;
  });
  if (missing.length) {
    const en = missing.map(s => s[0].toUpperCase() + s.slice(1)).join(' and ');
    const vi = missing.map(s => (s === 'writing' ? 'Viết' : 'Nói')).join(' và ');
    cand.push({
      kind: 'sitting',
      key: 'skill:' + missing.join('+'),
      skills: missing,
      titleEn: 'Sit a full paper — ' + en + ' ' + (missing.length > 1 ? 'have' : 'has') + ' not been measured',
      titleVi: 'Làm một bài đầy đủ — phần ' + vi + ' chưa được đo',
      score: null, confident: false, reason: 'notMeasured',
      href: '/prep/thu-vien/',
      /* Above any part: an unmeasured skill is a hole in the report the whole
         plan is built from, and it stays a hole until a paper is sat. The
         placement deliberately does not sample these — see server/placement.js
         for why, and note that this item is the direct consequence of that
         decision rather than an oversight. */
      priority: 1.2
    });
  }

  cand.sort((a, b) => b.priority - a.priority);

  /* One per key, so a plan cannot be three flavours of the same instruction. */
  const out = [];
  const used = new Set();
  for (const c of cand) {
    if (out.length >= PLAN_SIZE) break;
    if (used.has(c.key)) continue;
    used.add(c.key);
    out.push({
      ...c,
      whyEn: label[c.reason][0], whyVi: label[c.reason][1],
      tips: tipsFor(c.key)
    });
  }
  return {
    plan: out,
    level,
    overall: ab.overall,
    /* Which of the two VPET papers to sit next, and on what evidence.
     *
     * Separate from the three things to do, because it is a different KIND of
     * advice: those say what to practise, this says which instrument will
     * actually measure the result. Getting it wrong wastes an hour and returns
     * a number that means less than it looks — a perfect Level 1 paper reports
     * the paper's ceiling, not the candidate's. server/level-advice.js carries
     * the reasoning. */
    nextPaper,
    /* So a screen can say "this is why the list looks like that" instead of
       presenting three items as an oracle. */
    target: TARGET,
    measured: ab.events
  };
}

module.exports = { weekly, tipsFor, TIPS, PLAN_SIZE, TARGET };
