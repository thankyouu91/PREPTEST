/**
 * What 2000 learners cost to serve.
 *
 * Every rate below is either read out of this repository or labelled as an
 * assumption. Nothing is invented quietly:
 *
 *   server/ai-marking.js   Haiku 4.5 at $1 in / $5 out per million tokens;
 *                          "marking one VPET paper costs roughly $0.08";
 *                          gpt-transcribe at $0.0045/minute;
 *                          "a paper is at most eight minutes of audio"
 *   server/ai-budget.js    a full paper = 16 marking calls + 21 transcriptions
 *   server/data/plans.js   Starter 10 papers, Plus and Pro UNCAPPED
 *   docs/VAN-HANH.md §7    the box today is one t3.micro in ap-southeast-1
 *
 * AWS unit prices are ap-southeast-1 on-demand from memory and are the numbers
 * to re-check against the live price pages before anybody quotes them.
 *
 * Run: node scripts/cost-model.mjs
 */

const USD_VND = 26100;          // assumption — check the rate on the day

/* ---------- what the repo says one marked paper costs ---------- */
const PAPER = {
  markingUsd: 0.08,             // ai-marking.js, 16 Haiku calls
  audioMinutes: 8,              // ai-marking.js, "at most eight minutes"
  sttPerMinute: 0.0045,         // ai-marking.js, gpt-transcribe
  /* Prompt audio the candidate DOWNLOADS: parts E, F, G and the ten Part H
     prompts, about thirty files. 150 KB each is an assumption. */
  egressMb: 30 * 0.15,
  /* Spoken answers KEPT: 21 recordings. Upload is free; storage is not. */
  storedMb: 21 * 0.06
};
PAPER.sttUsd = PAPER.audioMinutes * PAPER.sttPerMinute;
PAPER.aiUsd = PAPER.markingUsd + PAPER.sttUsd;

/* ---------- infrastructure, per month ---------- */
const AWS = {
  /* t3.micro is what runs today and is not a 2000-learner box. t3.medium
     (2 vCPU / 4 GB) is the smallest thing I would put 2000 accounts on. */
  ec2OnDemand: 0.0528 * 730,            // t3.medium, ap-southeast-1
  ec2Reserved: 0.0330 * 730,            // ~1yr no-upfront, assumption
  ebsPerGbMonth: 0.096,
  ebsGb: 50,
  s3PerGbMonth: 0.025,
  cloudfrontPerGb: 0.120,               // Asia-Pacific tier
  route53: 0.50,
  /* The alternative in docs/VAN-HANH.md §7: RDS db.t4g.micro + App Runner.
     The runbook's own estimate, not mine. */
  managedLow: 25,
  managedHigh: 60
};

/* ---------- usage: the lever everything else hangs off ---------- */
const SCENARIOS = [
  { name: 'Thấp',      papersPerYear: 3,  writtenDrills: 10, spokenDrills: 4 },
  { name: 'Trung bình', papersPerYear: 8,  writtenDrills: 30, spokenDrills: 12 },
  { name: 'Cao',       papersPerYear: 20, writtenDrills: 80, spokenDrills: 30 }
];

/* A written drill is one essay: one marking call, no audio.
   A spoken drill is three items: three transcriptions and three markings.
   Marking cost per call is the paper figure divided by its 16 calls. */
const PER_MARK = PAPER.markingUsd / 16;
const DRILL_AUDIO_MIN = 0.5;    // assumption: ~30s per spoken drill item

function yearFor(s, learners) {
  const papers = s.papersPerYear * learners;
  const paperAi = papers * PAPER.aiUsd;
  const writtenAi = s.writtenDrills * learners * PER_MARK;
  const spokenAi = s.spokenDrills * learners * 3 * (PER_MARK + DRILL_AUDIO_MIN * PAPER.sttPerMinute);
  const ai = paperAi + writtenAi + spokenAi;

  const egressGb = papers * PAPER.egressMb / 1024;
  const cdn = egressGb * AWS.cloudfrontPerGb;

  /* Audio kept, growing through the year — charged on the average, so half. */
  const storedGb = papers * PAPER.storedMb / 1024;
  const s3 = (storedGb / 2) * AWS.s3PerGbMonth * 12;

  const computeOnDemand = (AWS.ec2OnDemand + AWS.ebsPerGbMonth * AWS.ebsGb + AWS.route53) * 12;
  const computeReserved = (AWS.ec2Reserved + AWS.ebsPerGbMonth * AWS.ebsGb + AWS.route53) * 12;

  return {
    name: s.name, papers,
    ai, paperAi, writtenAi, spokenAi,
    cdn, s3, egressGb, storedGb,
    computeOnDemand, computeReserved,
    totalOnDemand: ai + cdn + s3 + computeOnDemand,
    totalReserved: ai + cdn + s3 + computeReserved
  };
}

const LEARNERS = 2000;
const money = n => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const vnd = n => (n * USD_VND).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + '₫';

console.log('\nMỘT BÀI THI ĐẦY ĐỦ, CHẤM TRỌN VẸN');
console.log('  16 lần gọi mô hình chấm (Haiku 4.5) : $' + PAPER.markingUsd.toFixed(3));
console.log('  21 lần gỡ băng, ' + PAPER.audioMinutes + ' phút @ $' + PAPER.sttPerMinute
  + '      : $' + PAPER.sttUsd.toFixed(3));
console.log('  ────────────────────────────────────────');
console.log('  Tổng AI mỗi bài                     : $' + PAPER.aiUsd.toFixed(3)
  + '  (' + vnd(PAPER.aiUsd) + ')');

console.log('\n2000 HỌC VIÊN — CHI PHÍ MỘT NĂM');
const header = ['Kịch bản', 'Bài/HV', 'Tổng bài', 'AI', 'CDN', 'S3', 'Máy chủ', 'TỔNG/năm'];
console.log('  ' + header.map((h, i) => h.padEnd([12, 8, 10, 10, 8, 8, 10, 12][i])).join(''));
const rows = SCENARIOS.map(s => yearFor(s, LEARNERS));
for (const r of rows) {
  const s = SCENARIOS.find(x => x.name === r.name);
  console.log('  '
    + r.name.padEnd(12)
    + String(s.papersPerYear).padEnd(8)
    + r.papers.toLocaleString('en-US').padEnd(10)
    + money(r.ai).padEnd(10)
    + money(r.cdn).padEnd(8)
    + money(r.s3).padEnd(8)
    + money(r.computeReserved).padEnd(10)
    + money(r.totalReserved).padEnd(12));
}

console.log('\nCHIA THEO KỲ (dùng cột TỔNG ở trên, máy chủ trả trước 1 năm)');
console.log('  ' + 'Kịch bản'.padEnd(12) + 'Tháng'.padEnd(12) + 'Quý'.padEnd(12) + 'Năm'.padEnd(12) + 'VNĐ/năm');
for (const r of rows) {
  console.log('  '
    + r.name.padEnd(12)
    + money(r.totalReserved / 12).padEnd(12)
    + money(r.totalReserved / 4).padEnd(12)
    + money(r.totalReserved).padEnd(12)
    + vnd(r.totalReserved));
}

console.log('\nMỖI HỌC VIÊN MỖI NĂM');
for (const r of rows) {
  console.log('  ' + r.name.padEnd(12) + money(r.totalReserved / LEARNERS)
    + '  (' + vnd(r.totalReserved / LEARNERS) + ')');
}

/* ---------- the ceiling the current caps actually permit ---------- */
const CAP_PER_ACCOUNT = 240;            // AI_CALLS_PER_ACCOUNT_PER_DAY
const CAP_PLATFORM = 6000;              // AI_CALLS_PER_DAY
const CALLS_PER_PAPER = 16 + 21;
console.log('\nTRẦN HIỆN TẠI CHO PHÉP TỚI ĐÂU');
console.log('  Một tài khoản: ' + CAP_PER_ACCOUNT + ' lần gọi/ngày = '
  + (CAP_PER_ACCOUNT / CALLS_PER_PAPER).toFixed(1) + ' bài/ngày = $'
  + (CAP_PER_ACCOUNT / CALLS_PER_PAPER * PAPER.aiUsd * 30).toFixed(2) + '/tháng cho MỘT người');
console.log('  Cả nền tảng : ' + CAP_PLATFORM + ' lần gọi/ngày = '
  + (CAP_PLATFORM / CALLS_PER_PAPER).toFixed(0) + ' bài/ngày = $'
  + (CAP_PLATFORM / CALLS_PER_PAPER * PAPER.aiUsd * 30).toFixed(0) + '/tháng nếu chạm trần mỗi ngày');

/* ---------- revenue against cost, per plan ---------- */
const PLANS = [
  { id: 'Starter', months: 1, papers: 10, vnd: 499000 },
  { id: 'Plus', months: 3, papers: null, vnd: 799000 },
  { id: 'Pro', months: 6, papers: null, vnd: 1299000 }
];
console.log('\nDOANH THU vs CHI PHÍ AI, MỖI GÓI');
console.log('  ' + 'Gói'.padEnd(10) + 'Tháng'.padEnd(8) + 'Trần bài'.padEnd(12)
  + 'Giá'.padEnd(14) + 'AI nếu dùng hết'.padEnd(18) + 'Còn lại');
for (const p of PLANS) {
  const usd = p.vnd / USD_VND;
  /* Uncapped plans are bounded only by the per-account daily cap. */
  const maxPapers = p.papers !== null ? p.papers
    : Math.round(CAP_PER_ACCOUNT / CALLS_PER_PAPER * 30 * p.months);
  const aiWorst = maxPapers * PAPER.aiUsd;
  console.log('  '
    + p.id.padEnd(10)
    + String(p.months).padEnd(8)
    + (p.papers !== null ? String(p.papers) : 'KHÔNG').padEnd(12)
    + ('$' + usd.toFixed(0) + ' / ' + (p.vnd / 1000) + 'k₫').padEnd(14)
    + (maxPapers + ' bài = $' + aiWorst.toFixed(0)).padEnd(18)
    + (aiWorst > usd ? 'LỖ $' + (aiWorst - usd).toFixed(0) : '$' + (usd - aiWorst).toFixed(0)));
}
console.log('');
