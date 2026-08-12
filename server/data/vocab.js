/**
 * Self-study vocabulary — the starter set that exercises the schema.
 *
 * This is NOT the word list. docs/LEARNING.md §1.2 asks for 10,000 headwords
 * built up from NGSL, NAWL, TSL and BSL, and those imports are content work on
 * their own queue. What lives here is twelve entries chosen so that every table
 * and every relationship in the schema carries real data: two entries sharing a
 * headword across parts of speech, senses that sit above their headword's level,
 * irregular plurals and verb forms, comparatives, derived forms, uncountable
 * nouns, and collocations across each kind. An importer with nothing to import
 * cannot be tested, and a schema nothing has been written into is a guess.
 *
 * Provenance. These entries are written for this platform. No third-party word
 * list is reproduced: in particular `freqRank` is left null everywhere, because
 * a rank is NGSL's data and inventing one would be worse than leaving it empty.
 * The NGSL import fills it, and sets `levelSource` to `ngsl-rank` as it goes.
 *
 * `levelSource` says where a level came from, so it can be argued with:
 *
 *   authored    a human set it against the band table in docs/LEARNING.md §1.2
 *   ngsl-rank   derived from the NGSL frequency band, §1.4 rule 1
 *   nawl | tsl | bsl   membership of a specialist list, §1.4 rule 2
 *   corpus      a frequency count over an open corpus, §1.4 rule 3
 *   manual      an administrator overrode it in the admin area, §1.4 rule 4
 *
 * `manual` is the one the importer will not overwrite. §1.4 says a hand
 * adjustment always beats the three automatic rules, and a re-import that
 * silently reverted it would make that sentence false.
 */
'use strict';

const SOURCE = 'VPET Prep — starter set written for this platform';
const LICENCE = 'Project content; no third-party list reproduced';

/* Every entry: headword, part of speech, level, IPA, senses (each with its own
   level and at least two bilingual examples, per §1.2), inflected forms, and
   the chunks the word lives in. */
const ENTRIES = [
  {
    headword: 'book', pos: 'noun', level: 'A1', ipaUk: '/bʊk/', ipaUs: '/bʊk/',
    senses: [{
      en: 'A set of printed pages bound together in a cover.',
      vi: 'quyển sách', level: 'A1',
      examples: [
        ['She was reading a book about birds.', 'Cô ấy đang đọc một quyển sách về chim.'],
        ['I left my book on the train.', 'Tôi để quên sách trên tàu.']
      ]
    }],
    forms: [['books', 'plural', null]],
    collocations: [
      ['read a book', 'verb-noun', 'A1', 'He reads a book every week.', 'Anh ấy đọc một quyển sách mỗi tuần.', null],
      ['an address book', 'noun-noun', 'A2', 'Her number is in my address book.', 'Số của cô ấy nằm trong sổ địa chỉ của tôi.', null]
    ]
  },
  {
    /* The same headword as a verb, and a level higher. docs/LEARNING.md §1.2
       uses exactly this pair as its worked example of why one word is two
       items, which is why the key is (headword, pos) and not the headword. */
    headword: 'book', pos: 'verb', level: 'A2', ipaUk: '/bʊk/', ipaUs: '/bʊk/',
    senses: [{
      en: 'To arrange for a seat, room or table to be kept for you.',
      vi: 'đặt chỗ, đặt trước', level: 'A2',
      note: 'British English; American English often prefers "reserve" for a restaurant table.',
      examples: [
        ['We booked a room for two nights.', 'Chúng tôi đã đặt phòng hai đêm.'],
        ['You should book early in the summer.', 'Mùa hè thì nên đặt sớm.']
      ]
    }],
    forms: [
      ['books', 'third', null], ['booked', 'past', null],
      ['booked', 'pastp', null], ['booking', 'ving', null]
    ],
    collocations: [
      ['book a table', 'verb-noun', 'A2', 'Shall I book a table for eight o\'clock?', 'Tôi đặt bàn lúc tám giờ nhé?', null],
      ['fully booked', 'phrase', 'B1', 'The hotel is fully booked until March.', 'Khách sạn kín chỗ đến tháng Ba.',
        'Fixed phrase, always with "fully" rather than "completely".']
    ]
  },
  {
    headword: 'child', pos: 'noun', level: 'A1', ipaUk: '/tʃaɪld/', ipaUs: '/tʃaɪld/',
    senses: [{
      en: 'A young human being, below the age of an adult.',
      vi: 'đứa trẻ, trẻ em', level: 'A1',
      examples: [
        ['Every child in the class has a locker.', 'Mỗi đứa trẻ trong lớp đều có một tủ đồ.'],
        ['She has been afraid of dogs since she was a child.', 'Cô ấy sợ chó từ khi còn nhỏ.']
      ]
    }],
    forms: [['children', 'plural',
      'Irregular, and the vowel changes with it: /tʃaɪld/ has a diphthong, /ˈtʃɪldrən/ a short i.']],
    collocations: [
      ['an only child', 'adj-noun', 'A2', 'He is an only child.', 'Anh ấy là con một.',
        'Not the same as "a lonely child" — this one means no brothers or sisters.']
    ]
  },
  {
    headword: 'go', pos: 'verb', level: 'A1', ipaUk: '/ɡəʊ/', ipaUs: '/ɡoʊ/',
    senses: [{
      en: 'To move or travel from one place to another.',
      vi: 'đi', level: 'A1',
      examples: [
        ['We go to the market on Sundays.', 'Chúng tôi đi chợ vào Chủ nhật.'],
        ['She went home early.', 'Cô ấy về nhà sớm.']
      ]
    }],
    forms: [
      ['goes', 'third', null],
      ['went', 'past', 'Suppletive: "went" comes from a different old verb, which is why it looks unrelated.'],
      ['gone', 'pastp', null], ['going', 'ving', null]
    ],
    collocations: [
      ['go shopping', 'phrase', 'A1', 'They went shopping after lunch.', 'Họ đi mua sắm sau bữa trưa.',
        'go + -ing for leisure activities; "go to shop" is the error this pattern replaces.'],
      ['go on holiday', 'phrase', 'A2', 'We go on holiday in July.', 'Chúng tôi đi nghỉ vào tháng Bảy.',
        'British English; American English says "go on vacation".']
    ]
  },
  {
    headword: 'good', pos: 'adj', level: 'A1', ipaUk: '/ɡʊd/', ipaUs: '/ɡʊd/',
    senses: [{
      en: 'Of a high standard or quality.',
      vi: 'tốt, hay, giỏi', level: 'A1',
      examples: [
        ['That was a good film.', 'Đó là một bộ phim hay.'],
        ['She is a good teacher.', 'Cô ấy là một giáo viên giỏi.']
      ]
    }],
    forms: [
      ['better', 'comparative', 'Irregular: never "gooder".'],
      ['best', 'superlative', 'Irregular: never "goodest".']
    ],
    collocations: [
      ['a good idea', 'adj-noun', 'A1', 'That is a good idea.', 'Đó là một ý hay.', null],
      ['good at', 'adj-prep', 'A2', 'He is good at maths.', 'Cậu ấy giỏi toán.',
        'good at + noun or -ing. "good in" is a first-language transfer error.']
    ]
  },
  {
    headword: 'run', pos: 'verb', level: 'A1', ipaUk: '/rʌn/', ipaUs: '/rʌn/',
    senses: [
      {
        en: 'To move quickly on foot, faster than walking.',
        vi: 'chạy', level: 'A1',
        examples: [
          ['He runs every morning before work.', 'Anh ấy chạy bộ mỗi sáng trước giờ làm.'],
          ['She ran to catch the bus.', 'Cô ấy chạy để kịp chuyến xe buýt.']
        ]
      },
      {
        /* A sense three bands above its headword — the reason a sense carries
           its own level rather than inheriting the entry's. */
        en: 'To manage or be in charge of a business or organisation.',
        vi: 'điều hành, quản lý', level: 'B1',
        examples: [
          ['She runs a small printing business.', 'Cô ấy điều hành một xưởng in nhỏ.'],
          ['Who ran the meeting yesterday?', 'Hôm qua ai chủ trì cuộc họp?']
        ]
      }
    ],
    forms: [
      ['runs', 'third', null], ['ran', 'past', null],
      ['run', 'pastp', 'Identical to the base form, so only the auxiliary shows the tense.'],
      ['running', 'ving', 'The final n doubles after a single short vowel.']
    ],
    collocations: [
      ['run a business', 'verb-noun', 'B1', 'They have run the business for ten years.', 'Họ đã điều hành công ty này mười năm.', null],
      ['run out of', 'phrase', 'B1', 'We have run out of paper.', 'Chúng ta hết giấy rồi.',
        'Three words together; "run out" without "of" needs no object.']
    ]
  },
  {
    headword: 'make', pos: 'verb', level: 'A1', ipaUk: '/meɪk/', ipaUs: '/meɪk/',
    senses: [{
      en: 'To produce or create something.',
      vi: 'làm, tạo ra', level: 'A1',
      examples: [
        ['He made a cake for her birthday.', 'Anh ấy làm bánh cho sinh nhật cô ấy.'],
        ['This table is made of oak.', 'Chiếc bàn này làm bằng gỗ sồi.']
      ]
    }],
    forms: [
      ['makes', 'third', null], ['made', 'past', null], ['made', 'pastp', null],
      ['making', 'ving', 'The silent e is dropped before -ing.']
    ],
    collocations: [
      ['make a decision', 'verb-noun', 'A2', 'We have to make a decision today.', 'Hôm nay chúng ta phải đưa ra quyết định.',
        '"do a decision" is the error; English chooses "make" here.'],
      ['make progress', 'verb-noun', 'B1', 'She has made good progress this term.', 'Kỳ này em ấy tiến bộ nhiều.',
        'Uncountable: "make a progress" is wrong.']
    ]
  },
  {
    headword: 'water', pos: 'noun', level: 'A1', ipaUk: '/ˈwɔːtə/', ipaUs: '/ˈwɔːtər/',
    senses: [{
      en: 'The clear liquid that falls as rain and that people drink.',
      vi: 'nước', level: 'A1',
      note: 'Uncountable. Count it with a container: "a glass of water", not "a water" — except when ordering drinks.',
      examples: [
        ['Could I have a glass of water, please?', 'Cho tôi xin một cốc nước được không?'],
        ['The water here is safe to drink.', 'Nước ở đây uống được.']
      ]
    }],
    forms: [['waters', 'plural',
      'Only for a named body of water ("coastal waters"), not for the substance.']],
    collocations: [
      ['running water', 'adj-noun', 'A2', 'The house has no running water.', 'Ngôi nhà không có nước máy.', null],
      ['a glass of water', 'phrase', 'A1', 'She poured a glass of water.', 'Cô ấy rót một cốc nước.',
        'The frame that lets an uncountable noun be counted.']
    ]
  },
  {
    headword: 'research', pos: 'noun', level: 'B2', ipaUk: '/rɪˈsɜːtʃ/', ipaUs: '/ˈriːsɜːrtʃ/',
    senses: [{
      en: 'Careful and systematic study done to discover new facts.',
      vi: 'nghiên cứu', level: 'B2',
      note: 'Uncountable in academic English: "researches" is a common and visible error. Count with "a piece of research" or "studies".',
      examples: [
        ['Her research focuses on air quality in cities.', 'Nghiên cứu của cô tập trung vào chất lượng không khí ở đô thị.'],
        ['There is little research on this question.', 'Có rất ít nghiên cứu về câu hỏi này.']
      ]
    }],
    forms: [['researcher', 'derived', 'The person; the verb "to research" is a separate entry.']],
    collocations: [
      ['carry out research', 'verb-noun', 'B2', 'The team carried out research over two years.', 'Nhóm đã tiến hành nghiên cứu trong hai năm.',
        '"make research" and "do a research" are both wrong; "conduct research" is the formal alternative.'],
      ['research into', 'noun-prep', 'B2', 'Research into the causes is still going on.', 'Nghiên cứu về nguyên nhân vẫn đang tiếp tục.',
        '"research into" a question, "research on" a topic. "research about" is not used in academic writing.']
    ]
  },
  {
    headword: 'significant', pos: 'adj', level: 'B2', ipaUk: '/sɪɡˈnɪfɪkənt/', ipaUs: '/sɪɡˈnɪfɪkənt/',
    senses: [{
      en: 'Large or important enough to have an effect or be worth noticing.',
      vi: 'đáng kể, quan trọng', level: 'B2',
      examples: [
        ['There has been a significant rise in costs.', 'Chi phí đã tăng đáng kể.'],
        ['The difference between the two groups was not significant.', 'Khác biệt giữa hai nhóm là không đáng kể.']
      ]
    }],
    forms: [
      ['significantly', 'derived', 'The adverb.'],
      ['significance', 'derived', 'The noun.']
    ],
    collocations: [
      ['a significant difference', 'adj-noun', 'B2', 'We found a significant difference in the results.', 'Chúng tôi thấy có khác biệt đáng kể trong kết quả.', null],
      ['statistically significant', 'adv-adj', 'C1', 'The effect was statistically significant.', 'Hiệu ứng có ý nghĩa thống kê.',
        'A technical claim, not a synonym for "large" — worth flagging, because writers reach for it as emphasis.']
    ]
  },
  {
    headword: 'evidence', pos: 'noun', level: 'B2', ipaUk: '/ˈevɪdəns/', ipaUs: '/ˈevədəns/',
    senses: [{
      en: 'Facts or signs that show whether something is true.',
      vi: 'bằng chứng', level: 'B2',
      note: 'Uncountable: "an evidence" and "evidences" are both errors. Count with "a piece of evidence".',
      examples: [
        ['There is no evidence that the drug works.', 'Không có bằng chứng nào cho thấy thuốc này có tác dụng.'],
        ['The evidence points the other way.', 'Bằng chứng lại chỉ về hướng ngược lại.']
      ]
    }],
    forms: [['evident', 'derived', 'The adjective.']],
    collocations: [
      ['strong evidence', 'adj-noun', 'B2', 'There is strong evidence for this claim.', 'Có bằng chứng vững chắc cho khẳng định này.',
        '"big evidence" and "heavy evidence" are not used.'],
      ['evidence of', 'noun-prep', 'B2', 'They found evidence of an earlier building.', 'Họ tìm thấy dấu tích của một công trình cũ hơn.',
        '"evidence of" a thing, "evidence for" a claim or theory.']
    ]
  },
  {
    headword: 'quickly', pos: 'adv', level: 'A1', ipaUk: '/ˈkwɪkli/', ipaUs: '/ˈkwɪkli/',
    senses: [{
      en: 'At a fast speed, or after only a short time.',
      vi: 'một cách nhanh chóng', level: 'A1',
      examples: [
        ['He ate his breakfast quickly.', 'Anh ấy ăn sáng thật nhanh.'],
        ['The news spread quickly.', 'Tin tức lan đi rất nhanh.']
      ]
    }],
    forms: [['quick', 'derived', 'The adjective it is built from.']],
    collocations: [
      ['as quickly as possible', 'phrase', 'B1', 'Please reply as quickly as possible.', 'Xin trả lời sớm nhất có thể.',
        'The "as … as possible" frame; "as quick as possible" is common in speech but not in writing.']
    ]
  }
];

/** Every entry, flattened into the shape the importer inserts. */
function rows() {
  return ENTRIES.map((e, i) => ({
    headword: e.headword,
    pos: e.pos,
    level: e.level,
    /* Authored, not imported: a human set this against the band table. Distinct
       from `manual`, which means an administrator overrode a level in the admin
       area and which the importer must never overwrite. */
    levelSource: 'authored',
    ipaUk: e.ipaUk || null,
    ipaUs: e.ipaUs || null,
    freqRank: null,
    source: SOURCE,
    licence: LICENCE,
    sort: i,
    senses: (e.senses || []).map((s, j) => ({
      en: s.en, vi: s.vi, level: s.level, note: s.note || null, sort: j,
      examples: (s.examples || []).map(([en, vi], k) => ({
        en, vi, source: SOURCE, licence: LICENCE, sort: k
      }))
    })),
    forms: (e.forms || []).map(([form, kind, note], j) => ({ form, kind, note: note || null, sort: j })),
    collocations: (e.collocations || []).map(([chunk, kind, level, exEn, exVi, note], j) =>
      ({ chunk, kind, level, exEn, exVi, note: note || null, sort: j }))
  }));
}

module.exports = { rows, SOURCE, LICENCE };
