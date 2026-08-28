/**
 * The rubric: criteria, the rules that keep a mark honest, and the free
 * diagnostics that need no marker at all.
 *
 * `docs/SCORING.md` §2.3 lays out three tiers for Writing and Speaking — things
 * a machine can measure, a human with a rubric, and a marking service. This file
 * is tier 1 in full, plus the *shape* tiers 2 and 3 have to fill in, plus the
 * arithmetic that turns criterion scores into one number.
 *
 * ## Strict means accurate, not stingy
 *
 * The owner asked for a rubric that is "thật sát và khắt khe" so learners can
 * recognise their real level. That is not the same as marking low, and the
 * difference matters: a rubric that simply subtracts a band from everyone is
 * just as uninformative as one that flatters, and it is worse, because it also
 * makes people give up. Four rules do the work instead, and each of them is
 * about being *right*:
 *
 *   1. **The weakest criterion caps the whole.** A piece with C1 vocabulary and
 *      A2 grammar is not a B2 piece; in a real workplace the grammar is what
 *      the reader trips on. So the aggregate may sit at most half a band above
 *      the lowest criterion. This is a HOUSE RULE, stated as one — VPET
 *      publishes no such rule and this file must not pretend otherwise.
 *
 *   2. **Length is a gate, not a criterion.** Part D asks for at least 100
 *      words. Something well under that has not attempted the task, whatever
 *      its sentences are like, and the real exam treats it that way. Capped,
 *      and told plainly why.
 *
 *   2b. **So is copying the stimulus back.** Part B hands the candidate a
 *      passage and asks for it again in their own words; an answer that is the
 *      passage word for word is three perfect criterion scores and none of the
 *      task. Measured, not judged — see COPY_PARTS below for why that
 *      distinction is the whole point, and which parts it does NOT apply to.
 *
 *   3. **Every criterion points at evidence, and the evidence is CHECKED.** A
 *      mark a learner cannot trace to their own words teaches nothing. And
 *      because the tier-3 marker is a language model, a quotation it offers is
 *      not taken on trust: `verifyEvidence` looks for it in the candidate's
 *      actual text and drops it when it is not there. A fabricated quotation is
 *      worse than none.
 *
 *   4. **A mark records which rubric produced it.** Criteria will change.
 *      Re-scoring history when they do would erase the learner's own record of
 *      getting better, so every stored score carries RUBRIC_VERSION and old
 *      marks keep the version they were made under.
 *
 * ## What is deliberately NOT here
 *
 * Pronunciation and fluency. The speaking parts are marked from a transcript,
 * so nobody has heard the candidate; criteria about how they sounded would be
 * invented. `server/ai-marking.js` already says this to the model and to the
 * candidate, and this file does not quietly add them back.
 */
'use strict';

/** Bump when a criterion is added, removed, or its meaning changes. Stored with
    every score so old marks stay interpretable. */
/* Bumped when G and H gained criteria of their own and the length cap stopped
   being a cliff. Stored marks carry this, so a report can still say which rules
   produced a number from before the change rather than implying the new ones.

   -3 adds the copied-source cap. Marks made under -2 keep it: a paper sat before
   the rule existed was sat under the rules it was told about, and quietly
   re-scoring it downward months later is the one thing a mark must never do.

   -4 is the big one. Part D moves to Pearson's own Write Email rubric — seven
   criteria, weighted, two of them computed — and every criterion on every part
   gains a level ladder and a mark table derived from server/bands.js, so the
   marker now aims at the same scale the report reads back. A Part D mark made
   under -3 has four criteria with different names and is not comparable
   criterion-by-criterion with one made under -4; the version on the row is how
   a reader can tell.

   -5 completes it. Every criterion of every part now carries band descriptors,
   and the four proficiency dimensions carry a set per paper, so a Level 2
   sitting is marked against Level 2's standard rather than against Level 1's
   with a different label on it. validate() refuses to let that go quiet again. */
const RUBRIC_VERSION = '2026-08-vpet-5';

/**
 * The criteria, per part.
 *
 * Only the parts that genuinely have several dimensions get several. Part H is
 * "say this sentence back": there is one thing to measure, and splitting it into
 * four to look thorough would be theatre. Part G is "is the answer right".
 * Inventing criteria for those would produce four numbers that all move
 * together, which tells a learner nothing they did not already know.
 */
const CRITERIA = {
  B: [
    { key: 'meaning', en: 'Meaning kept', vi: 'Giữ được ý', dim: 'content',
      about: 'How much of the passage\'s meaning survives. Original wording is neither required nor '
        + 'rewarded; missing whole ideas is what costs marks.',
      bands: [
        { at: 10, en: 'Every idea in the passage comes back. Nothing a reader would miss is lost.',
          vi: 'Mọi ý của đoạn văn đều quay lại. Không mất ý nào người đọc sẽ thấy thiếu.' },
        { at: 6, en: 'Most ideas come back. One is missing, or one has blurred into another.',
          vi: 'Phần lớn các ý quay lại. Thiếu một ý, hoặc một ý bị nhòe vào ý khác.' },
        { at: 2, en: 'Only fragments of the passage survive.',
          vi: 'Chỉ còn lại vài mảnh của đoạn văn.' },
        { at: 0, en: 'Nothing of the passage is here.',
          vi: 'Không còn gì của đoạn văn.' }
      ] },
    { key: 'accuracy', en: 'Grammar and spelling', vi: 'Ngữ pháp và chính tả', dim: 'accuracy',
      about: 'Sentence structure, verb forms, articles, spelling.' },
    { key: 'organisation', en: 'Order and flow', vi: 'Sắp xếp và mạch văn', dim: 'organisation',
      about: 'Whether the ideas come in an order a reader can follow.' }
  ],
  /* ## Part D follows Pearson's own published rubric for this task
     
     The owner supplied two references and asked that the marking follow the way
     Pearson actually scores an e-mail, rather than anything inferred here. This
     is PTE Core's **Write Email** rubric — seven criteria over fifteen points —
     which is Pearson's own and is the most specific thing either of us has.
     
     Three things about it change how this file works, and each is a deliberate
     departure from what the other parts do:
     
     1. **The criteria are WEIGHTED.** Content is 3 of the 15 and the other six
        are 2 each. Every other part here averages its criteria evenly, which was
        fine when a part had three or four broad ones; it is not fine against a
        published scheme that says otherwise. combine() now takes `weight`.
     
     2. **The weakest-link rule does NOT apply here.** It is this platform's
        house rule and PTE's scheme is a plain weighted sum. Layering ours over
        theirs would change their answer while still calling it their rubric —
        and with seven criteria it would be brutal in a way nobody intended:
        three typos put spelling at 0, and the weakest-link cap would then hold
        the whole e-mail to 0.5 out of 10.
     
     3. **Two criteria are COMPUTED, not judged.** `form` is a word count and
        `spelling` is an error count, and PTE states both as arithmetic — "under
        50 or over 140 loses heavily", "0–1 errors is full marks, 2 is half,
        3 or more is nothing". A marker asked to judge what is already counted
        answers differently between runs, which is the fault this whole file
        keeps returning to. `form` is computed outright; `spelling` is scored
        from the error count the marker reports rather than from its impression.
     
     ### Where this deliberately differs from PTE Core
     
     **The length band is VPET's, not PTE's.** PTE Core asks for 80–120 words;
     the VPET Official Guide for Test-Takers says Part D must be **at least 100**.
     This is a VPET paper, so 100 is the requirement and PTE's band is not
     imported — importing it would mark a VPET candidate against another exam's
     instruction, which is the kind of quiet substitution docs/SCORING.md exists
     to prevent. The SHAPE of PTE's rule is kept: a floor, a comfortable band,
     and a penalty for running far over.
     
     Every criterion also records the Versant Writing subscore it corresponds to
     (`pearson`), from Pearson's published subscore definitions, so a reader can
     follow this rubric back to the test it is meant to imitate. */
  D: [
    { key: 'content', en: 'Content', vi: 'Nội dung', dim: 'content',
      pearson: 'Content', weight: 3, ptePoints: 3,
      about: 'Whether EVERY point the prompt asks for is answered, fully and accurately. '
        + 'Pearson scores this on the same task by weighting how many expected words and word '
        + 'sequences appear, so what is rewarded is the information being THERE, not the '
        + 'phrasing it arrives in.',
      bands: [
        { at: 10, en: 'Every point the prompt asks for is answered, fully and accurately.',
          vi: 'Trả lời đầy đủ, chính xác tất cả các ý được yêu cầu trong đề.' },
        { at: 6, en: 'Most points are answered. One is missing, or one is not entirely clear.',
          vi: 'Trả lời được hầu hết các ý. Bỏ sót 1 ý, hoặc 1 ý chưa thật rõ ràng.' },
        { at: 2, en: 'Several required points are missing, or the content misleads the reader.',
          vi: 'Bỏ sót nhiều ý bắt buộc, hoặc nội dung khiến người đọc hiểu lầm.' },
        { at: 0, en: 'Off the topic entirely. Nothing the prompt asked for is here.',
          vi: 'Lạc đề hoàn toàn. Không có gì thuộc yêu cầu của đề.' }
      ] },
    { key: 'conventions', en: 'E-mail conventions', vi: 'Quy cách email', dim: 'register',
      pearson: 'Voice and Tone', weight: 2, ptePoints: 2,
      about: 'The e-mail\'s own furniture — an opening greeting, clear body paragraphs, a '
        + 'closing and a sign-off — and whether the level of formality fits who is being '
        + 'written to: formal to a superior or a business contact, informal to a friend.',
      bands: [
        { at: 10, en: 'All of an e-mail\'s parts are there: greeting, clear body paragraphs, '
            + 'closing and sign-off. The formality fits the recipient.',
          vi: 'Đủ cấu trúc một email: lời chào đầu thư, các đoạn nội dung rõ ràng, lời chúc/hẹn '
            + 'gặp ở cuối và ký tên. Mức trang trọng phù hợp với người nhận.' },
        { at: 5, en: 'One part is missing or the formality slips — too formal for a friend, or '
            + 'too casual for a superior.',
          vi: 'Thiếu một phần, hoặc mức trang trọng chưa đúng — quá trang trọng với bạn bè, hoặc '
            + 'quá suồng sã với cấp trên.' },
        { at: 0, en: 'Not recognisable as an e-mail, or addressed to nobody in particular.',
          vi: 'Không nhận ra được là một email, hoặc không xác định được viết cho ai.' }
      ] },
    /* Computed, not judged: the platform has the word count. See computedForm(). */
    { key: 'form', en: 'Length and form', vi: 'Hình thức và độ dài', dim: 'content',
      pearson: 'Form', weight: 2, ptePoints: 2, computed: 'form',
      about: 'Whether the e-mail is the length the task asks for. Counted, not judged.' },
    { key: 'organisation', en: 'Organisation', vi: 'Sắp xếp và mạch lạc', dim: 'organisation',
      pearson: 'Organization', weight: 2, ptePoints: 2, bandsFor: 1,
      about: 'How well ideas are presented in a clear and logical sequence — Pearson\'s own '
        + 'definition — judged on guiding the reader through the text and marking significant '
        + 'points with discourse markers.',
      bands: [
        { at: 10, en: 'Ideas connect and the writing moves from one to the next. Linking words '
            + '(however, in addition, therefore) are used naturally.',
          vi: 'Các ý có tính liên kết, chuyển dòng hoặc chuyển đoạn hợp lý. Dùng từ nối '
            + '(However, In addition, Therefore) một cách tự nhiên.' },
        { at: 5, en: 'A basic order is there. Linking is repetitive, forced, or missing between '
            + 'some ideas.',
          vi: 'Có trình tự cơ bản. Từ nối lặp lại, gượng ép, hoặc thiếu ở một số chỗ.' },
        { at: 0, en: 'Sentences stand apart with nothing joining them.',
          vi: 'Các câu rời rạc, không có gì nối chúng với nhau.' }
      ] },
    { key: 'vocabulary', en: 'Vocabulary', vi: 'Từ vựng', dim: 'range',
      pearson: 'Vocabulary', weight: 2, ptePoints: 2, bandsFor: 1,
      about: 'Whether the words are accurate and are the right words for this topic, purpose '
        + 'and audience — including whether the formal or informal choice the prompt calls for '
        + 'is actually made.',
      bands: [
        { at: 10, en: 'Accurate vocabulary that suits the context, and the formal or informal '
            + 'choice the prompt calls for is made throughout.',
          vi: 'Dùng từ vựng chính xác, phù hợp ngữ cảnh của bức thư, và chọn đúng sắc thái trang '
            + 'trọng hay thân mật theo yêu cầu của đề.' },
        { at: 5, en: 'Adequate but plain, or the wrong word in a place or two.',
          vi: 'Đủ dùng nhưng đơn điệu, hoặc dùng sai từ ở một hai chỗ.' },
        { at: 0, en: 'Thin and repetitive, or wrong often enough to obscure the meaning.',
          vi: 'Nghèo nàn, lặp lại, hoặc sai đủ nhiều để làm mờ nghĩa.' }
      ] },
    { key: 'grammar', en: 'Grammar', vi: 'Ngữ pháp', dim: 'accuracy',
      pearson: 'Grammar', weight: 2, ptePoints: 2, bandsFor: 1,
      about: 'Correct structures, tenses and subject-verb agreement. Pearson\'s scoring rewards '
        + 'ACCURACY over ambition here: a correct simple or compound sentence scores better '
        + 'than a complex one that breaks.',
      bands: [
        { at: 10, en: 'Structures, tenses and agreement are correct throughout.',
          vi: 'Cấu trúc, thì và sự hòa hợp chủ vị đúng suốt bài.' },
        { at: 5, en: 'A few errors, but the reader still follows.',
          vi: 'Có một vài lỗi nhưng người đọc vẫn theo được.' },
        { at: 0, en: 'Enough basic grammar is wrong that the writing is hard to follow.',
          vi: 'Sai nhiều lỗi ngữ pháp cơ bản đến mức bài viết khó hiểu.' }
      ] },
    /* Scored from the error COUNT the marker reports, not from its impression of
       how the spelling felt. PTE states this one as arithmetic and so does this. */
    { key: 'spelling', en: 'Spelling', vi: 'Chính tả', dim: 'accuracy',
      pearson: 'Grammar', weight: 2, ptePoints: 2,
      about: 'Count the misspelt words and score by the count: 0 or 1 errors is full marks, 2 '
        + 'is half, 3 or more is none. American, British, Australian and Canadian spellings are '
        + 'all correct — but ONE of them has to be used throughout; mixing them is what counts '
        + 'as an error here.',
      bands: [
        { at: 10, en: '0 or 1 misspelt words.', vi: '0 – 1 lỗi chính tả.' },
        { at: 5, en: 'Exactly 2 misspelt words.', vi: 'Đúng 2 lỗi chính tả.' },
        { at: 0, en: '3 or more misspelt words.', vi: 'Từ 3 lỗi chính tả trở lên.' }
      ] }
  ],
  I: [
    { key: 'task', en: 'Dealing with the situation', vi: 'Xử lý được tình huống', dim: 'content',
      about: 'Whether every move the situation asks for actually happens.',
      bands: [
        { at: 10, en: 'Every move the situation asks for actually happens — the apology is made, '
            + 'the reason given, the alternative offered.',
          vi: 'Mọi việc tình huống đòi hỏi đều thực sự xảy ra — có xin lỗi, có nêu lý do, có đề '
            + 'xuất phương án.' },
        { at: 6, en: 'Most of them happen. One is missing, or is only implied rather than said.',
          vi: 'Phần lớn có xảy ra. Thiếu một việc, hoặc chỉ ngụ ý chứ không nói ra.' },
        { at: 2, en: 'The situation is barely addressed — a sentence in the right direction and '
            + 'no more.',
          vi: 'Gần như chưa xử lý tình huống — được một câu đúng hướng và không hơn.' },
        { at: 0, en: 'This does not respond to the situation at all.',
          vi: 'Bài này hoàn toàn không đáp lại tình huống.' }
      ] },
    { key: 'range', en: 'Range of language', vi: 'Vốn ngôn ngữ', dim: 'range',
      about: 'Whether the vocabulary and structures stretch beyond the safest possible choices.' },
    { key: 'accuracy', en: 'Accuracy', vi: 'Độ chính xác', dim: 'accuracy',
      about: 'Grammar and word choice, judged from the transcript.' },
    { key: 'register', en: 'Register', vi: 'Mức trang trọng', dim: 'register',
      about: 'Whether the level of formality fits who is being spoken to.' }
  ],
  /* G and H had no criteria at all, and between them they are 16 of the paper's
     58 items — including 10 of the 15 that make up Speaking. combine() fell
     through to `fallbackScore`, so for those items the model's own headline
     number WAS the mark: nothing cross-checked it, nothing was written to
     rubric_scores, and the candidate's report showed a score with no working
     under it. Two thirds of a Speaking mark arrived unexplained.

     Both parts are genuinely narrow — that part was right — so these say what
     each is narrow ABOUT rather than inventing dimensions to fill a table. The
     wording tracks each part's rubric text in server/ai-marking.js; if one
     changes, the other has to. */
  G: [
    { key: 'correct', en: 'Right answer', vi: 'Trả lời đúng', dim: 'content',
      about: 'Whether the answer is right. A correct short phrase is a full mark and is not '
        + 'marked down for being short; grammar matters only where it changes the meaning.',
      bands: [
        { at: 10, en: 'Right. A correct three-word phrase is a full mark and is not marked down '
            + 'for being short, for lacking a verb, or for not being a sentence.',
          vi: 'Đúng. Một cụm ba từ đúng là điểm tối đa, không bị trừ vì ngắn, vì thiếu động từ, '
            + 'hay vì không thành câu.' },
        { at: 5, en: 'The right area, the wrong detail — or right but so vague that it could be '
            + 'an answer to a different question.',
          vi: 'Đúng hướng nhưng sai chi tiết — hoặc đúng nhưng mơ hồ tới mức có thể là câu trả '
            + 'lời cho câu hỏi khác.' },
        { at: 0, en: 'Wrong, or an answer to a question that was not asked. A confident wrong '
            + 'answer scores nothing.',
          vi: 'Sai, hoặc trả lời một câu hỏi không được hỏi. Trả lời sai một cách tự tin vẫn '
            + 'không có điểm.' }
      ] }
  ],
  H: [
    { key: 'content', en: 'How much came back', vi: 'Giữ được bao nhiêu', dim: 'content',
      about: 'How much of the sentence is reproduced.',
      /* Part H is scored by word overlap in server/repeat.js, not by a model.
         These bands are what the NUMBER means on the report — they describe the
         same scale the comparison produces, so a candidate reading "5.0" has
         something to read it against. */
      bands: [
        { at: 10, en: 'The whole sentence comes back.',
          vi: 'Nhắc lại được trọn câu.' },
        { at: 5, en: 'About half of the sentence comes back.',
          vi: 'Nhắc lại được khoảng một nửa câu.' },
        { at: 0, en: 'Almost nothing of the sentence comes back.',
          vi: 'Gần như không nhắc lại được gì.' }
      ] },
    { key: 'structure', en: 'Structure kept', vi: 'Giữ được cấu trúc', dim: 'accuracy',
      about: 'Whether the sentence\'s word order and grammar survive the repetition.',
      bands: [
        { at: 10, en: 'Word order and grammar survive intact.',
          vi: 'Trật tự từ và ngữ pháp còn nguyên.' },
        { at: 5, en: 'The words are mostly there but the order has moved.',
          vi: 'Từ thì phần lớn còn nhưng trật tự đã xê dịch.' },
        { at: 0, en: 'No structure survives — words in no recoverable order.',
          vi: 'Không còn cấu trúc nào — các từ không theo trật tự nào khôi phục được.' }
      ] }
  ],
  J: [
    { key: 'events', en: 'Events kept', vi: 'Giữ được sự việc', dim: 'content',
      about: 'How many of the story\'s events survive the retelling.',
      bands: [
        { at: 10, en: 'Every event in the story comes back.',
          vi: 'Mọi sự việc trong câu chuyện đều được kể lại.' },
        { at: 6, en: 'Most events come back; one or two are lost.',
          vi: 'Phần lớn sự việc được kể lại; mất một hai việc.' },
        { at: 2, en: 'A couple of fragments of the story, and no more.',
          vi: 'Chỉ còn vài mảnh của câu chuyện, không hơn.' },
        { at: 0, en: 'None of the story is here.',
          vi: 'Không còn gì của câu chuyện.' }
      ] },
    { key: 'sequence', en: 'Order of events', vi: 'Trình tự', dim: 'organisation',
      about: 'Whether they come in the right order.',
      bands: [
        { at: 10, en: 'The events come in the order they happened.',
          vi: 'Các sự việc đến đúng theo trình tự đã xảy ra.' },
        { at: 5, en: 'Mostly in order, with one event moved out of place.',
          vi: 'Phần lớn đúng trình tự, có một sự việc bị đặt sai chỗ.' },
        { at: 0, en: 'No order a listener could recover the story from.',
          vi: 'Không có trình tự nào để người nghe dựng lại câu chuyện.' }
      ] },
    { key: 'point', en: 'The point of it', vi: 'Ý chính', dim: 'content',
      about: 'Whether the point of the story comes across, not just its parts.',
      bands: [
        { at: 10, en: 'The point of the story comes across, not just its parts.',
          vi: 'Ý của câu chuyện toát ra được, không chỉ là các mảnh rời của nó.' },
        { at: 5, en: 'The parts are there but the listener has to work the point out for '
            + 'themselves.',
          vi: 'Các mảnh thì có, nhưng người nghe phải tự rút ra ý.' },
        { at: 0, en: 'The point does not come across at all.',
          vi: 'Ý chính hoàn toàn không toát ra được.' }
      ] }
  ]
};

/**
 * Where the owner's Part D table and this file's measured rules overlap.
 *
 * Two of the owner's descriptors name something this file already computes, and
 * both clauses are deliberately absent from the text above. Recording which,
 * and why, because silently editing somebody's standard is not acceptable and
 * silently applying it twice is worse.
 *
 *   · Communicative achievement, band 1, opened "Bài viết **quá ngắn** hoặc quá
 *     rời rạc" — *too short* or too disjointed. Length is Rule 3: measured,
 *     capped, and explained to the candidate in its own words. A marker also
 *     told to judge shortness deducts for it twice on the runs where it
 *     notices, and once on the runs where it does not. "Quá rời rạc" stays,
 *     because disjointedness is a judgement and nothing computes it.
 *
 *   · Language, band 5, read "từ vựng phong phú, **không bị lặp từ từ đề bài**"
 *     — a rich vocabulary, *not reusing the prompt's words*. Reusing the
 *     prompt's words is Rule 4, measured as overlap and capped. The "rich
 *     vocabulary" half stays; the copying half is arithmetic.
 *
 * Neither is dropped from the STANDARD — both rules are stricter and more
 * consistent than a marker's impression of them, and docs/CHAM-DIEM-CHUAN.md
 * §3.1 says so where a candidate reads it. They are dropped only from what the
 * model is asked to judge.
 */
const OWNER_OVERLAP = [
  { criterion: 'communicative', clause: 'quá ngắn', rule: 'under-length' },
  { criterion: 'language', clause: 'không bị lặp từ từ đề bài', rule: 'copied-source' }
];

/**
 * What each CEFR level looks like, on each dimension a criterion can measure.
 *
 * ## Why this had to exist
 *
 * `server/bands.js` turns a 0–10 mark into a CEFR level by placing it inside
 * the paper's published GSE range: on a Level 1 paper 10/10 is GSE 58, which is
 * the top of B1+, and 0/10 is GSE 10. So the mark ALREADY carries a claim about
 * the candidate's level — that is what the number is for.
 *
 * And nothing ever told the marker. It was handed "Candidate level for this
 * paper: B1" and left to decide for itself whether that meant "mark this
 * against B1 expectations" or "mark it against good English". Those produce
 * very different numbers from the same answer, the model had no way to know
 * which was wanted, and bands.js then read the result as though the first had
 * happened. The two halves of the scoring have never agreed except by luck.
 *
 * So the ladder below says what each level looks like, `levelScale()` works out
 * which marks each level is worth ON THIS PAPER from bands.js's own table, and
 * `server/ai-marking.js` puts both in front of the marker. The model's
 * judgement and the band table now agree by construction.
 *
 * ## Dimensions, not criteria
 *
 * Five dimensions, six levels: thirty descriptors, each of which can actually
 * be checked. Per-criterion ladders would be sixteen × six, and ninety-six
 * descriptors is ninety of them nobody would ever read — the same argument that
 * kept BANDS to one shared ladder rather than one per criterion.
 *
 * Every criterion declares its `dim`. The four proficiency dimensions use this
 * ladder. `content` deliberately does NOT: "did they mention the delivery date"
 * is not a question about anybody's English, and a CEFR ladder over it would be
 * a category error. Those criteria use BANDS below, which asks how much of what
 * was asked for is actually there.
 *
 * ## These are descriptions, not the CEFR
 *
 * Written for this rubric and for what a marker can see in a short answer or a
 * transcript. They are informed by the CEFR's own descriptors and by the GSE
 * levels Pearson publishes, but they are not a quotation of either, and nothing
 * here should be cited as though the Council of Europe wrote it.
 */
const LADDER = {
  accuracy: {
    C2: { en: 'Full control, including in long sentences. Slips are so rare they read as typing.',
          vi: 'Kiểm soát hoàn toàn, kể cả câu dài. Sai sót hiếm tới mức đọc như lỗi gõ phím.' },
    C1: { en: 'Consistently accurate. What errors there are are evidently slips, not gaps.',
          vi: 'Chính xác đều. Lỗi có thì cũng rõ ràng là lỡ tay, không phải lỗ hổng.' },
    B2: { en: 'Good control. Errors appear in complex sentences and rarely cause a misreading.',
          vi: 'Kiểm soát tốt. Lỗi xuất hiện ở câu phức và hiếm khi làm hiểu sai.' },
    B1: { en: 'Simple structures are reliable. Longer sentences and less common tenses go wrong, but the meaning survives.',
          vi: 'Cấu trúc đơn giản thì chắc. Câu dài hơn và thì ít gặp thì sai, nhưng nghĩa vẫn còn.' },
    A2: { en: 'Simple sentences are attempted. Endings, articles and plurals go missing often enough that the reader repairs as they go.',
          vi: 'Có thử viết câu đơn. Đuôi từ, mạo từ, số nhiều rơi rụng đủ nhiều để người đọc phải tự vá.' },
    A1: { en: 'Words and memorised phrases. Most attempts at a sentence break down.',
          vi: 'Từ rời và cụm học thuộc. Phần lớn nỗ lực viết thành câu đều đổ.' }
  },
  range: {
    C2: { en: 'Full range, used precisely, including shades of meaning and fixed expressions.',
          vi: 'Vốn đầy đủ, dùng chính xác, kể cả sắc thái và thành ngữ cố định.' },
    C1: { en: 'Broad and precise. The word chosen is the right one rather than the nearest one; collocation is mostly right.',
          vi: 'Rộng và chuẩn. Từ được chọn là từ đúng, không phải từ gần đúng nhất; kết hợp từ phần lớn chuẩn.' },
    B2: { en: 'A clear range. Subordination, some less common words, choices that fit the topic.',
          vi: 'Vốn rõ rệt. Có mệnh đề phụ, có từ ít gặp, lựa chọn hợp chủ đề.' },
    B1: { en: 'Enough for familiar topics, with a way round a missing word. Mostly simple and compound sentences.',
          vi: 'Đủ cho chủ đề quen thuộc, biết đường vòng khi thiếu từ. Chủ yếu câu đơn và câu ghép.' },
    A2: { en: 'Everyday words and the simplest joins — and, but, because.',
          vi: 'Từ đời thường và những cách nối đơn giản nhất — and, but, because.' },
    A1: { en: 'A few memorised words and phrases; nothing built out of them.',
          vi: 'Vài từ và cụm học thuộc; không dựng được gì từ chúng.' }
  },
  organisation: {
    C2: { en: 'Structure is a deliberate choice and the reader never notices it working.',
          vi: 'Bố cục là một lựa chọn có chủ ý và người đọc không hề thấy nó đang làm việc.' },
    C1: { en: 'Structure serves what is being said; cohesion is smooth and largely invisible.',
          vi: 'Bố cục phục vụ điều đang nói; liên kết mượt và gần như vô hình.' },
    B2: { en: 'Clear shape. Each paragraph does one job and the linking helps rather than decorates.',
          vi: 'Hình hài rõ. Mỗi đoạn làm một việc, từ nối để giúp chứ không để trang trí.' },
    B1: { en: 'A recognisable beginning, middle and end. Linking is present and sometimes mechanical.',
          vi: 'Có mở – thân – kết nhận ra được. Có liên kết, đôi khi máy móc.' },
    A2: { en: 'Points strung together with and / then / but. The reader supplies the order.',
          vi: 'Các ý nối bằng and / then / but. Người đọc phải tự sắp thứ tự.' },
    A1: { en: 'No order a reader can follow; nothing links.',
          vi: 'Không có thứ tự nào người đọc theo được; không gì liên kết với gì.' }
  },
  register: {
    C2: { en: 'Register is used deliberately, including shifting inside one text for effect.',
          vi: 'Dùng mức trang trọng có chủ đích, kể cả chuyển giọng trong cùng một bài để đạt hiệu quả.' },
    C1: { en: 'Controlled and sustained, including politeness moves and hedging.',
          vi: 'Kiểm soát và giữ được suốt bài, kể cả cách nói lịch sự và cách nói giảm.' },
    B2: { en: 'Consistent and suited to the reader; the occasional phrase sits oddly.',
          vi: 'Nhất quán và hợp người nhận; thi thoảng có câu đặt hơi lạc.' },
    B1: { en: 'Knows formal from informal and mostly picks the right one; slips into the other under pressure.',
          vi: 'Phân biệt được trang trọng và thân mật, phần lớn chọn đúng; bị áp lực thì trượt sang bên kia.' },
    A2: { en: 'One register, usually informal, whoever is being addressed.',
          vi: 'Một giọng duy nhất, thường là thân mật, nói với ai cũng vậy.' },
    A1: { en: 'No control of formality — whatever phrases are known.',
          vi: 'Không kiểm soát được mức trang trọng — biết cụm nào dùng cụm đó.' }
  }
};

/**
 * The same four dimensions as bands, per paper.
 *
 * LADDER above says what each CEFR level looks like; this says what a MARK is
 * worth on each of the two papers, which is a different question and the one a
 * marker actually has to answer. Defined per dimension rather than per
 * criterion because `accuracy` means the same thing on Part B, Part D and Part
 * I — sixteen criteria × two levels × three bands would be ninety-six
 * descriptors, and ninety of them would never be read again.
 *
 * ## Read the two columns together
 *
 * The papers overlap at B1+, and it shows here on purpose: **Level 2's bottom
 * band is roughly Level 1's top band**. That is not a mistake and it is the
 * clearest way to see what the two papers are for. A candidate who is the best
 * thing a Level 1 paper can measure is the weakest thing a Level 2 paper can,
 * and both papers say so about the same person. Anyone reading a Level 2 report
 * that says "2/10 on grammar" should understand it as "below what this paper is
 * built to see", not as "cannot form a sentence" — which is why
 * server/bands.js reports that band as a ceiling rather than a level.
 *
 * A criterion may still carry `bands` of its own, and those win: Part D's come
 * from Pearson's published Write Email rubric and are more specific than
 * anything here.
 */
const DIM_BANDS = {
  accuracy: {
    1: [
      { at: 10, en: 'Simple structures are reliable and the meaning always survives. What goes '
          + 'wrong goes wrong in the longer or less common sentences.',
        vi: 'Cấu trúc đơn giản dùng chắc, nghĩa luôn còn nguyên. Chỗ sai là ở câu dài hơn hoặc '
          + 'thì ít gặp.' },
      { at: 5, en: 'Simple sentences are attempted, but endings, articles and plurals go missing '
          + 'often enough that the reader repairs as they go.',
        vi: 'Có viết được câu đơn, nhưng đuôi từ, mạo từ và số nhiều rơi rụng đủ nhiều để người '
          + 'đọc phải tự vá.' },
      { at: 0, en: 'Words and memorised phrases. Most attempts at a sentence break down.',
        vi: 'Từ rời và cụm học thuộc. Phần lớn nỗ lực viết thành câu đều đổ.' }
    ],
    2: [
      { at: 10, en: 'Full control, including in long and complex sentences. What slips there are '
          + 'read as typing rather than as gaps.',
        vi: 'Kiểm soát hoàn toàn, kể cả câu dài và câu phức. Sai sót nếu có thì đọc như lỗi gõ '
          + 'phím chứ không phải lỗ hổng.' },
      { at: 5, en: 'Good control. Errors appear in complex sentences and rarely cause a '
          + 'misreading.',
        vi: 'Kiểm soát tốt. Lỗi xuất hiện ở câu phức và hiếm khi làm hiểu sai.' },
      { at: 0, en: 'Simple structures hold and nothing past them does. This is the floor of what '
          + 'this paper can see, not the floor of the language.',
        vi: 'Cấu trúc đơn giản thì chắc, ngoài đó thì không. Đây là sàn của những gì đề này đo '
          + 'được, không phải sàn của trình độ.' }
    ]
  },
  range: {
    1: [
      { at: 10, en: 'Enough vocabulary for familiar topics, with a way round a word that is '
          + 'missing. Simple and compound sentences, used correctly.',
        vi: 'Đủ từ vựng cho chủ đề quen thuộc, biết đường vòng khi thiếu từ. Câu đơn và câu ghép, '
          + 'dùng đúng.' },
      { at: 5, en: 'Everyday words and the simplest joins — and, but, because.',
        vi: 'Từ đời thường và những cách nối đơn giản nhất — and, but, because.' },
      { at: 0, en: 'A few memorised words and phrases; nothing built out of them.',
        vi: 'Vài từ và cụm học thuộc; không dựng được gì từ chúng.' }
    ],
    2: [
      { at: 10, en: 'Full range, used precisely, including shades of meaning and fixed '
          + 'expressions. The word chosen is the right one, not the nearest one.',
        vi: 'Vốn đầy đủ, dùng chính xác, kể cả sắc thái và thành ngữ cố định. Từ được chọn là từ '
          + 'đúng, không phải từ gần đúng nhất.' },
      { at: 5, en: 'A clear range: subordination, some less common words, choices that fit the '
          + 'topic rather than the safest available.',
        vi: 'Vốn rõ rệt: có mệnh đề phụ, có từ ít gặp, lựa chọn hợp chủ đề chứ không phải lựa '
          + 'chọn an toàn nhất.' },
      { at: 0, en: 'Enough for familiar topics and no further — the safest word every time.',
        vi: 'Đủ cho chủ đề quen thuộc và không hơn — lúc nào cũng chọn từ an toàn nhất.' }
    ]
  },
  organisation: {
    1: [
      { at: 10, en: 'A beginning, a middle and an end that a reader can follow, with linking '
          + 'that helps rather than decorates.',
        vi: 'Có mở – thân – kết mà người đọc theo được, với từ nối để giúp chứ không để trang trí.' },
      { at: 5, en: 'Points strung together with and / then / but. The reader supplies the order.',
        vi: 'Các ý nối bằng and / then / but. Người đọc phải tự sắp thứ tự.' },
      { at: 0, en: 'No order a reader can follow; nothing links.',
        vi: 'Không có thứ tự nào người đọc theo được; không gì liên kết với gì.' }
    ],
    2: [
      { at: 10, en: 'The structure serves what is being said and the reader never notices it '
          + 'working.',
        vi: 'Bố cục phục vụ điều đang nói, và người đọc không hề thấy nó đang làm việc.' },
      { at: 5, en: 'Clear shape. Each paragraph does one job and the linking carries the reader.',
        vi: 'Hình hài rõ. Mỗi đoạn làm một việc và từ nối dẫn được người đọc đi.' },
      { at: 0, en: 'A beginning, a middle and an end, and nothing beyond that.',
        vi: 'Có mở – thân – kết, và không hơn.' }
    ]
  },
  register: {
    1: [
      { at: 10, en: 'Formal and informal are told apart and the right one is chosen for this '
          + 'reader and held for most of the answer.',
        vi: 'Phân biệt được trang trọng và thân mật, chọn đúng cho người nhận và giữ được gần '
          + 'hết bài.' },
      { at: 5, en: 'One register throughout, whoever is being addressed.',
        vi: 'Một giọng duy nhất cho cả bài, nói với ai cũng vậy.' },
      { at: 0, en: 'No control of formality — whatever phrases are known.',
        vi: 'Không kiểm soát được mức trang trọng — biết cụm nào dùng cụm đó.' }
    ],
    2: [
      { at: 10, en: 'Register is controlled and sustained, including politeness moves and '
          + 'hedging, and shifts inside the answer are deliberate.',
        vi: 'Mức trang trọng được kiểm soát và giữ suốt bài, kể cả cách nói lịch sự và nói giảm; '
          + 'chuyển giọng trong bài là có chủ ý.' },
      { at: 5, en: 'Consistent and suited to the reader; the occasional phrase sits oddly.',
        vi: 'Nhất quán và hợp người nhận; thi thoảng có câu đặt hơi lạc.' },
      { at: 0, en: 'The right register is chosen but not held under pressure.',
        vi: 'Chọn đúng mức trang trọng nhưng không giữ được khi bí.' }
    ]
  }
};

/** Which dimensions the CEFR ladder answers for. `content` is not one of them. */
const LADDER_DIMS = Object.keys(LADDER);

/** High to low, so a scale reads top-down the way a band table does. */
const LADDER_LEVELS = ['C2', 'C1', 'B2', 'B1', 'A2', 'A1'];

/**
 * What a number on the ten-point scale means for a CONTENT criterion.
 *
 * Every criterion above says what it is about. None of them said what a 7 is,
 * and a scale with no anchors is not a scale — it is a marker's mood. That is
 * measurable in the product: the same pasted passage came back at 10/10 on one
 * run and 1/10 on another, and both runs had been given the same one-sentence
 * description of "Meaning kept" and nothing else to hang a number on.
 *
 * This ladder is for `dim: 'content'` only — how much of what was asked for is
 * actually there. The four proficiency dimensions use LADDER above and the
 * per-paper scale below instead, because "how good is this English" and "did
 * they mention the delivery date" are not the same question and one ladder
 * cannot answer both without one of the two answers being nonsense. Giving a
 * marker two ladders for one number would be the error this file warns about
 * everywhere else; giving two DIFFERENT criteria one ladder each is not.
 *
 * The rungs are written from the READER's side — how much work the person on
 * the other end has to do — because that is the same place the weakest-link
 * rule argues from, and a scale that argues from somewhere else would pull
 * against it.
 *
 * Six rungs, not eleven. Odd numbers and halves are for a marker who wants to
 * sit between two rungs, which is a real thing to want; naming all eleven would
 * only be pretending the gaps had been defined too.
 */
const BANDS = [
  { at: 10, en: 'Fully met. The reader has to do no work at all on this.',
    vi: 'Đạt trọn vẹn. Người đọc/người nghe không phải bù đắp gì.' },
  { at: 8, en: 'Met. A few things are not quite right, but none of them stops the reader.',
    vi: 'Đạt. Có vài chỗ chưa chuẩn nhưng không làm người đọc phải dừng lại.' },
  { at: 6, en: 'Mostly met. The reader gets there, but has to work out a place or two.',
    vi: 'Đạt phần lớn. Người đọc vẫn hiểu, nhưng phải tự đoán một hai chỗ.' },
  { at: 4, en: 'Partly met. The reader has to re-read, or a whole piece of what was asked is missing.',
    vi: 'Đạt một phần. Người đọc phải đọc lại, hoặc thiếu hẳn một phần yêu cầu.' },
  { at: 2, en: 'Barely. There are usable fragments and not much else.',
    vi: 'Gần như chưa đạt. Chỉ có vài mảnh dùng được.' },
  { at: 0, en: 'Nothing here belongs to this criterion.',
    vi: 'Không có gì thuộc tiêu chí này.' }
];

/**
 * Which marks each CEFR level is worth ON THIS PAPER.
 *
 * Derived, never typed. `server/bands.js` already owns two published tables —
 * Pearson's GSE↔CEFR alignment and each VPET paper's GSE span — and it turns a
 * mark into a level by placing the mark linearly inside that span. This runs
 * the same arithmetic backwards, so the marker is told the inverse of exactly
 * the function that will read its answer.
 *
 * That matters more than it saves. A hand-written table of "B1 is 7 to 8.5"
 * would be a second copy of a mapping that already exists, and the first time
 * somebody corrected a GSE boundary the two would disagree — with the marker
 * aiming at one scale and the report reading the other, silently, for as long
 * as it took somebody to notice a band that looked wrong.
 *
 * The consequence is worth stating plainly, because it is the whole design:
 * **a mark is not "how good is this in the abstract", it is "where on THIS
 * paper's range does this sit"**. Ten out of ten on a Level 1 paper is B1+,
 * because B1+ is the top of what a Level 1 paper can see. The same answer on a
 * Level 2 paper scores lower, and should: the two papers ask different
 * questions of it. Only the levels a paper can actually measure are listed —
 * offering a Level 1 marker a C1 rung would invite a mark the report has no way
 * to render.
 *
 * Returns `[{ cefr, min, max }]`, high to low.
 */
function levelScale(paperLevel, family) {
  /* Required lazily: bands.js is a leaf today, and a top-level require here
     would make any future edge from bands.js back to the rubric a cycle rather
     than a warning. */
  const bands = require('./bands');
  if (String(family || 'vpet').toLowerCase() !== 'vpet') return [];
  const lvl = bands.vpetLevelOf(paperLevel);
  const range = bands.VPET_LEVELS[lvl];
  if (!range) return [];
  const [low, high] = range.gse;
  /* The inverse of bands.js's `gse = low + (mark/10) × (high − low)`. */
  const markAt = gse => Math.max(0, Math.min(10, (gse - low) / (high - low) * 10));

  const out = [];
  for (let i = 0; i < bands.GSE_CEFR.length; i++) {
    const row = bands.GSE_CEFR[i];
    /* A band runs from its own floor up to the next one's, and the top band
       runs to the top of the scale. */
    const ceiling = i === 0 ? 90 : bands.GSE_CEFR[i - 1].min;
    if (ceiling <= low || row.min >= high) continue;   // outside what this paper sees
    out.push({
      cefr: row.cefr,
      min: Number(markAt(Math.max(row.min, low)).toFixed(1)),
      max: Number(markAt(Math.min(ceiling, high)).toFixed(1))
    });
  }
  return out;
}

/**
 * The house standard: what counts as an error, and what does not.
 *
 * A criterion says what is being judged and the ladders say how far up. Neither
 * says whether "colour" is a misspelling in an answer that also writes "color",
 * whether "I'll" belongs in a formal e-mail, or whether a word the transcriber
 * plainly mis-heard is the candidate's mistake. Left unsaid, a marker decides
 * each of those afresh every run — which is the same fault as an unanchored
 * scale, one level down, and it lands hardest on `accuracy`, the criterion the
 * weakest-link rule most often caps a whole item from.
 *
 * Every line here is a decision that could have gone the other way, so each one
 * says which way it went. They are rendered into the marker's prompt verbatim
 * and published to candidates in docs/CHAM-DIEM-CHUAN.md: a rule a candidate
 * cannot read is a rule they cannot prepare for.
 *
 * The last group matters most and is the least obvious. Three things are
 * measured elsewhere in this file and MUST NOT be deducted for again here —
 * length, copying, and Part H's overlap. A marker told to judge something that
 * is also computed will deduct twice on the runs where it notices and once on
 * the runs where it does not, and that inconsistency is indistinguishable from
 * bias.
 */
const USAGE = [
  /* Aligned to Pearson, who state this one explicitly for Write Email: all four
     varieties accepted, but ONE of them throughout. The first version of this
     rule said mixing was "never an error on its own", which flatly contradicted
     Part D's spelling criterion two screens further down the same prompt — and
     a marker given two rules picks one at random, which is the fault this file
     keeps coming back to. Pearson is the authority here, so Pearson wins. */
  { en: 'American, British, Australian and Canadian spellings are all correct — "colour" and '
      + '"color" are each right — but ONE variety has to be used throughout. Mixing them is '
      + 'what counts as an error, not the variety chosen.',
    vi: 'Chính tả Mỹ, Anh, Úc và Canada đều đúng — "colour" và "color" đều được chấp nhận — '
      + 'nhưng phải dùng nhất quán MỘT lối trong cả bài. Cái tính là lỗi là việc trộn lẫn, '
      + 'không phải việc chọn lối nào.' },

  { en: 'A slip is not a gap. A word misspelt once that the candidate spells correctly elsewhere '
      + 'is a typo: mention it, do not mark it down. A form that is wrong every time it appears '
      + 'is an error, because it shows what they believe.',
    vi: 'Lỡ tay khác với chưa biết. Một từ sai một lần mà chỗ khác viết đúng là lỗi đánh máy: '
      + 'nhắc thôi, không trừ. Một dạng sai ở mọi lần xuất hiện mới là lỗi, vì nó cho thấy '
      + 'người viết đang hiểu như thế.' },

  { en: 'Contractions are normal in speech and in a friendly message. In a formal e-mail they '
      + 'are an observation about register, never a grammar error.',
    vi: 'Dạng rút gọn là bình thường khi nói và trong thư thân mật. Trong email trang trọng, '
      + 'đó là nhận xét về giọng văn, không bao giờ là lỗi ngữ pháp.' },

  { en: 'Mark a first-language pattern exactly as you would mark any other error of the same '
      + 'size — a dropped article, an unmarked plural, a tense that does not follow. Never be '
      + 'gentler or harsher because of where the candidate is from, and never mention their '
      + 'first language: they asked to be told about their English.',
    vi: 'Lỗi do ảnh hưởng tiếng mẹ đẻ — thiếu mạo từ, thiếu dấu số nhiều, thì không khớp — chấm '
      + 'đúng như mọi lỗi cùng mức độ khác. Không nới tay cũng không khắt khe hơn vì gốc gác của '
      + 'thí sinh, và không nhắc đến tiếng mẹ đẻ của họ: cái họ cần biết là tiếng Anh của mình.' },

  { en: 'An e-mail is a greeting, a body and a sign-off. A missing greeting or sign-off belongs '
      + 'to organisation and register, not to grammar, and paragraphing belongs to organisation.',
    vi: 'Một email gồm lời chào, phần thân và lời kết. Thiếu lời chào hay lời kết thuộc về bố cục '
      + 'và giọng văn, không phải ngữ pháp; cách chia đoạn cũng thuộc bố cục.' },

  { en: 'Any consistent convention for dates, numbers and capitals is accepted. "15/3", '
      + '"15 March" and "March 15" are all correct.',
    vi: 'Mọi quy ước nhất quán về ngày tháng, số và viết hoa đều được chấp nhận. "15/3", '
      + '"15 March" và "March 15" đều đúng.' },

  { en: 'Sentence-final punctuation and capital letters count under accuracy. Comma style does '
      + 'not, unless a missing comma makes the sentence unreadable.',
    vi: 'Dấu kết câu và viết hoa đầu câu tính vào độ chính xác. Cách dùng dấu phẩy thì không, '
      + 'trừ khi thiếu dấu phẩy làm câu không đọc được.' },

  { en: 'A short answer is not a poor one where the task allows one, and an unusual but correct '
      + 'choice is correct. Do not mark down for not writing what you would have written.',
    vi: 'Câu trả lời ngắn không phải là câu trả lời kém, khi đề cho phép ngắn; và một lựa chọn '
      + 'lạ nhưng đúng thì vẫn đúng. Không trừ điểm vì thí sinh không viết giống ý bạn.' },

  { en: 'A spoken answer reaches you as a MACHINE TRANSCRIPT. Nobody heard the recording, so say '
      + 'nothing about pronunciation, accent or fluency — and where the transcriber has plainly '
      + 'mis-heard a word, mark what the candidate evidently said, not what the machine typed.',
    vi: 'Bài nói đến tay bạn dưới dạng BẢN GHI TỰ ĐỘNG. Không ai nghe bản ghi âm, nên không nhận '
      + 'xét gì về phát âm, ngữ điệu hay độ trôi chảy — và chỗ nào máy rõ ràng nghe nhầm thì chấm '
      + 'theo điều thí sinh hiển nhiên đã nói, không theo chữ máy gõ ra.' },

  { en: 'Three things are measured by arithmetic and enforced without you: how long the answer '
      + 'is, how much of it is copied from the text in front of the candidate, and on Part H how '
      + 'much of the sentence came back. Judge the criteria on their own merits and do not deduct '
      + 'for any of the three as well.',
    vi: 'Ba thứ được đo bằng số học và áp dụng độc lập với bạn: độ dài bài làm, tỉ lệ chép lại từ '
      + 'đề bài, và ở Part H là lượng từ nhắc lại được. Hãy chấm các tiêu chí theo đúng bản thân '
      + 'chúng và không trừ thêm vì ba thứ đó.' }
];

/**
 * The published length floor, where the exam publishes one.
 *
 * Part D's 100 words is from the official guide. Part B has no published floor —
 * the passage varies — so the gate there is relative to the passage, handled by
 * the caller, and this table stays honest about what is published.
 */
const MIN_WORDS = { D: 100 };

/** Below this fraction of the floor, the task has not been attempted. */
const UNDER_LENGTH_FRACTION = 0.6;

/** And that is what it is worth, whatever the sentences look like. */
const UNDER_LENGTH_CAP = 4;

/**
 * Between "not an attempt" and the full requirement, the ceiling rises with the
 * length instead of jumping.
 *
 * There was a forty-word hole here, and it let a candidate score full marks on
 * a task they had done three fifths of. The gate fired below 60 words on a
 * 100-word requirement and did nothing at all above it, while the marker was
 * told in the same prompt — two lines apart — both "an email under 100 words
 * has not met the task" AND "length is checked separately and enforced without
 * you, so do not also deduct for shortness". So nothing penalised 60 to 99
 * words: measured, a 60-word e-mail with good sentences came out at 9/10
 * against a requirement of 100.
 *
 * The rule now runs from the hard cap at 0.6 of the floor up to no cap at the
 * floor itself, so the two ends meet and a word either side of a threshold is
 * worth about the same. 60 words caps at 4, 80 at 7, 99 at ~9.9 — which rounds
 * to 10, and should: 99 words against 100 is not a shortfall worth marking.
 */
function lengthCeiling(n, floor) {
  if (!floor || n >= floor) return null;
  const at = UNDER_LENGTH_FRACTION * floor;
  if (n < at) return UNDER_LENGTH_CAP;
  /* Linear from (0.6·floor → 4) to (floor → 10). */
  return UNDER_LENGTH_CAP + (10 - UNDER_LENGTH_CAP) * ((n - at) / (floor - at));
}

/**
 * Copying the stimulus back.
 *
 * Part B is "read this passage, watch it disappear, now write it again in your
 * own words". Measured, a candidate who selected the passage during the reading
 * window and pasted it into the answer box scored **10/10 on all three
 * criteria** — and every one of those tens was correct on its own terms. No
 * meaning was lost. The grammar was the passage's own, so it was perfect. The
 * ideas came in the order a reader can follow, because they came in the
 * passage's order. Three right answers to three wrong questions.
 *
 * The same paste marked a second time came back at 1/10. That is the worse
 * half of the fault: the rule was left to the marker's judgement, and a
 * language model's judgement about the same text twice is two judgements. A
 * candidate cannot be told "your mark depends on which run you got".
 *
 * So it is arithmetic, like the length gate, and for the same reason: it holds
 * whether or not a marker ever ran, and it holds the same way every time.
 *
 * ### This is a rule of THIS PLATFORM, and it is a trade
 *
 * Pearson publishes no copy rule, and the real Versant runs in a locked-down
 * browser where there is nothing to paste from. This one runs in a normal tab,
 * where the passage arrives in the sitting payload and the reading window is
 * thirty seconds of selectable text. The platform therefore cannot tell a paste
 * from a genuinely extraordinary memory, and it does not pretend to: what it
 * measures is the overlap, and the cap is stated to the candidate as being
 * about the overlap. A candidate who really did reproduce a passage from memory
 * has been marked down for something they did honestly — that is the cost, and
 * it is worth paying, because the alternative is that practice on this part
 * teaches copying and the day of the real exam is where they find out.
 */
const COPY_PARTS = new Set(['B', 'D']);

/* Not G: the guide tells candidates to answer "using a short phrase", and the
   right phrase is usually the passage's own words — capping that would punish
   the correct answer. Not H: saying the sentence back verbatim IS the task, and
   repeat.js scores it by exactly the overlap this rule penalises. Not J: the
   story was heard, never shown, so there is nothing on screen to copy, and
   close recall of a story is the skill being measured rather than a way round
   it. Not I for the same reason as G — a good answer to "apologise for missing
   the meeting" reuses the situation's own words, and a false cap on honest work
   is a worse failure than missing a rare cheat. */

/** Word runs this long are compared. Short enough to catch a paste, long enough
    that a shared idiom is not one. */
const COPY_SHINGLE = 5;

/** Below this much verbatim overlap nothing fires: a reconstruction of a
    passage read moments ago legitimately reuses its vocabulary and its phrases. */
const COPY_FREE = 0.35;

/** At and above this, the answer is the stimulus with the serial numbers filed
    off, and the ceiling stops falling. */
const COPY_TOTAL = 0.85;

/** What a copy is worth. Below the 4 a short genuine attempt is capped at, on
    purpose: a short attempt is some of the task, and a copy is none of it. */
const COPY_CAP = 3;

/** Below this many words there is nothing to measure, and the length rule and
    the criteria already have the answer covered. */
const COPY_MIN_WORDS = 12;

/** Both texts are cut to this before the quadratic run-finder sees them. */
const COPY_MAX_WORDS = 1500;

/** The aggregate may sit at most this far above the weakest criterion. */
const WEAKEST_LINK_HEADROOM = 0.5;

/**
 * Parts that follow a published weighted scheme of their own.
 *
 * Part D is marked on PTE Core's Write Email rubric, which is Pearson's and is
 * a plain weighted sum over seven criteria. Two of this file's house rules step
 * aside for it, and the reasons are different:
 *
 *   · **The weakest-link cap.** It is ours, not theirs, and putting it on top
 *     of somebody's published scheme changes their answer while still calling
 *     it their rubric. With seven criteria it would also be savage in a way
 *     nobody intended: three typos put `spelling` at 0, and the cap would then
 *     hold the whole e-mail to 0.5 out of 10.
 *
 *   · **The under-length cap.** Length is one of the seven criteria here
 *     (`form`, computed), so the cap would be the same shortfall counted twice.
 *
 * Everything else still applies — nothing handed in is still zero, and a pasted
 * prompt is still capped.
 */
const WEIGHTED_SCHEME_PARTS = new Set(['D']);

/**
 * The e-mail length band, in words.
 *
 * `min` is VPET's, from the Official Guide for Test-Takers: Part D must be at
 * least 100 words. PTE Core's own band is 80–120 with a heavy penalty under 50
 * or over 140, and it is deliberately NOT imported — this is a VPET paper, and
 * marking a VPET candidate against another exam's stated instruction is exactly
 * the quiet substitution docs/SCORING.md exists to prevent.
 *
 * What IS taken from PTE is the shape: a floor, a band that is comfortably
 * right, and a penalty for running far past it. `over` is set at 1.4 × the
 * floor, the same proportion PTE's 140 bears to its 100-word midpoint.
 */
const FORM_BAND = { min: 100, over: 140 };

/** The shortest quotation that can count as evidence. One word matches anything. */
const MIN_EVIDENCE_WORDS = 3;

const criteriaFor = part => CRITERIA[part] || [];

/**
 * The bands one criterion is actually marked against, on one paper.
 *
 * Three sources in order, and the order is the point:
 *
 *   1. the criterion's OWN bands, where somebody has written them out — Part
 *      D's come from Pearson's published Write Email rubric, and nothing
 *      derived here should override a published one;
 *   2. the per-paper bands for its dimension, which is where a criterion about
 *      how good the English is gets an answer that differs between the papers;
 *   3. BANDS, the completion ladder, for anything else.
 *
 * `vpetLevel` is 1 or 2. Anything else is treated as Level 1, which is the
 * paper the platform actually ships: guessing high would mark a candidate
 * against a ceiling their paper cannot reach.
 */
function bandsFor(part, key, vpetLevel) {
  const def = criteriaFor(part).find(c => c.key === key);
  if (!def) return BANDS;
  const lvl = vpetLevel === 2 ? 2 : 1;
  /* `bandsFor` marks a set as written for ONE paper. PTE Core is a B1–B2 test,
     so its wording for the proficiency criteria answers the Level 1 question
     exactly and the Level 2 question not at all: "structures and agreement are
     correct throughout" is full marks on a paper that stops at B1+, and does
     not separate a B2 from a C2 on one that reaches it. Those fall through to
     the per-paper dimension bands; the ones that measure whether something is
     PRESENT — a greeting, every note answered, how many typos — do not, because
     a greeting is a greeting at any level. */
  if (Array.isArray(def.bands) && def.bands.length && (!def.bandsFor || def.bandsFor === lvl)) {
    return def.bands;
  }
  const byDim = DIM_BANDS[def.dim];
  if (byDim) return byDim[lvl];
  return BANDS;
}

/**
 * Everything the rubric owes an answer to, checked.
 *
 * A criterion with no bands on either paper is not a marking bug that shows up
 * as a wrong number — it is a marker with nothing to aim at, producing a
 * plausible number nobody can argue with, on a real candidate's paper. It would
 * never throw and nothing downstream would look wrong.
 *
 * So it is checked rather than trusted: every criterion of every part must
 * resolve to a complete set of bands at BOTH levels, name its dimension, and
 * carry both languages. Returns a list of problems, empty when there are none.
 * scripts/test-rubric.mjs fails on a non-empty list, and server.js logs it at
 * boot — a rubric that is incomplete in production should say so on the console
 * rather than wait for somebody to notice a strange mark.
 */
function validate() {
  const problems = [];
  for (const [part, defs] of Object.entries(CRITERIA)) {
    if (!defs.length) problems.push(part + ': no criteria at all');
    for (const d of defs) {
      const at = part + '.' + d.key;
      if (!d.key || !d.en || !d.vi) problems.push(at + ': missing a name in one language');
      if (!d.dim) problems.push(at + ': no dimension declared');
      else if (d.dim !== 'content' && !LADDER[d.dim]) problems.push(at + ': unknown dimension ' + d.dim);
      if (!d.about) problems.push(at + ': nothing says what it measures');
      if (d.weight !== undefined && !(d.weight > 0)) problems.push(at + ': weight must be positive');

      for (const lvl of [1, 2]) {
        const bands = bandsFor(part, d.key, lvl);
        const where = at + ' (Level ' + lvl + ')';
        if (!Array.isArray(bands) || bands.length < 2) {
          problems.push(where + ': fewer than two bands to choose between');
          continue;
        }
        if (!bands.some(b => b.at === 10)) problems.push(where + ': no band says what full marks is');
        if (bands.some(b => !(b.at >= 0 && b.at <= 10))) problems.push(where + ': a band is off the scale');
        if (bands.some(b => !b.en || !b.vi)) problems.push(where + ': a band is missing a language');
        for (let i = 1; i < bands.length; i++) {
          if (bands[i].at >= bands[i - 1].at) problems.push(where + ': bands are not in descending order');
        }
      }
    }
  }
  /* A part the marking pass will send to a model but the rubric has no criteria
     for is the fault that left G and H with unexplained numbers for months. */
  for (const part of ['B', 'D', 'G', 'H', 'I', 'J']) {
    if (!criteriaFor(part).length) problems.push(part + ': marked by rubric but has no criteria');
  }
  return problems;
}
const half = n => Math.round(n * 2) / 2;

/* ----------------------------- Tier 1: measuring ----------------------------- */

/** Words, the way a person counts them: runs of letters, digits and apostrophes. */
function words(text) {
  return String(text || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
}

/** Sentences, roughly. Good enough to spot "one 90-word sentence" and "all six
    words long", which is all this is for. */
function sentences(text) {
  return String(text || '').split(/[.!?]+[\s"'”’)\]]*/u).map(s => s.trim()).filter(Boolean);
}

/**
 * What can be measured without a marker, and without an opinion.
 *
 * These are NOT a score and must never be shown as one — `docs/SCORING.md` §2.3
 * is explicit, and so is the result screen. A high type-token ratio can mean a
 * rich vocabulary or a candidate who never repeats a noun they should have; a
 * long mean sentence can mean control or a run-on. They are prompts to look, not
 * verdicts.
 *
 * `linking` is the list to count against — the platform already has 123 of them
 * in `linking_words`, so the caller passes them in rather than this file keeping
 * a second copy that drifts.
 */
function diagnostics(text, opts) {
  const o = opts || {};
  const w = words(text);
  const s = sentences(text);
  const distinct = new Set(w);
  const lens = s.map(x => words(x).length).filter(n => n > 0);

  let linkingHits = 0;
  if (Array.isArray(o.linking) && o.linking.length) {
    const hay = ' ' + w.join(' ') + ' ';
    for (const phrase of o.linking) {
      const p = String(phrase || '').toLowerCase().trim();
      if (!p) continue;
      let from = 0, at;
      while ((at = hay.indexOf(' ' + p + ' ', from)) !== -1) { linkingHits++; from = at + 1; }
    }
  }

  /* Which content word is leaned on hardest. Function words are excluded, or
     this always answers "the". */
  const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at',
    'is', 'are', 'was', 'were', 'be', 'been', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'this', 'that', 'for', 'with', 'as', 'my', 'your', 'have', 'has', 'had', 'do', 'does', 'not']);
  const counts = new Map();
  for (const t of w) if (!STOP.has(t)) counts.set(t, (counts.get(t) || 0) + 1);
  let topWord = null, topCount = 0;
  for (const [t, n] of counts) if (n > topCount) { topWord = t; topCount = n; }

  return {
    words: w.length,
    sentences: s.length,
    distinctWords: distinct.size,
    /* Only meaningful once there is something to measure. Below ~30 words the
       ratio is dominated by length, not by variety, so it is withheld rather
       than reported as a flattering 0.95. */
    typeTokenRatio: w.length >= 30 ? Number((distinct.size / w.length).toFixed(3)) : null,
    meanSentenceWords: lens.length ? Number((w.length / lens.length).toFixed(1)) : 0,
    longestSentenceWords: lens.length ? Math.max(...lens) : 0,
    linkingPer100: w.length ? Number((linkingHits / w.length * 100).toFixed(1)) : 0,
    mostRepeatedWord: topCount >= 3 ? topWord : null,
    mostRepeatedCount: topCount >= 3 ? topCount : 0
  };
}

/* --------------------------- Evidence, actually checked --------------------------- */

/** Case, punctuation and spacing all vary between a quotation and its source. */
const flatten = t => String(t || '').toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/gu, ' ').trim();

/**
 * Does this quotation really occur in what the candidate wrote?
 *
 * A language model asked for evidence will sometimes produce a plausible
 * sentence that is not in the text — and a fabricated quotation is worse than no
 * quotation, because it looks exactly like proof. So nothing is displayed until
 * it has been found in the source.
 *
 * Short quotations are refused outright: "the" occurs in almost everything, and
 * a three-word floor is the point below which a match stops being evidence of
 * anything.
 */
function verifyEvidence(quote, source) {
  const q = flatten(quote);
  if (!q || q.split(' ').length < MIN_EVIDENCE_WORDS) return null;
  const hay = flatten(source);
  if (!hay) return null;
  return hay.includes(q) ? String(quote).trim().slice(0, 400) : null;
}

/* --------------------------- Criteria the platform counts --------------------------- */

/**
 * The `form` criterion: how well the length fits, counted rather than judged.
 *
 * Continuous rather than stepped, for the reason the length gate is: a step
 * makes one word either side of a threshold worth several marks, and the
 * candidate on the wrong side of it is right to call that arbitrary.
 *
 *   at or above the floor, up to `over`  →  10
 *   below the floor                      →  falls to 0 at 60% of it
 *   past `over`                          →  falls to 5 at twice the floor
 *
 * Running long is penalised less hard than running short, and that is
 * deliberate: a candidate who wrote 180 words did the task and then some, while
 * one who wrote 55 did not do it. PTE penalises both ends; this keeps that
 * shape without pretending the two failures are equivalent.
 */
function computedForm(n, band) {
  const b = band || FORM_BAND;
  if (n >= b.min && n <= b.over) return 10;
  if (n < b.min) {
    const floor = b.min * UNDER_LENGTH_FRACTION;
    if (n <= floor) return 0;
    return 10 * (n - floor) / (b.min - floor);
  }
  const far = b.min * 2;
  if (n >= far) return 5;
  return 10 - 5 * (n - b.over) / (far - b.over);
}

/* ------------------------- How much was copied, measured ------------------------- */

/**
 * The longest run of words that appears, in this order, in both texts.
 *
 * This is what gets shown to the candidate — "31 words in a row are the
 * passage's own" is a fact they can check against their own screen, where a
 * percentage is a number they have to take on trust. It is the classic
 * longest-common-substring table, one row at a time so nothing large is held.
 */
function longestSharedRun(a, s) {
  if (!a.length || !s.length) return 0;
  let best = 0;
  let prev = new Uint16Array(s.length + 1);
  let cur = new Uint16Array(s.length + 1);
  for (let i = 0; i < a.length; i++) {
    cur.fill(0);
    for (let j = 0; j < s.length; j++) {
      if (a[i] === s[j]) {
        const n = prev[j] + 1;
        cur[j + 1] = n;
        if (n > best) best = n;
      }
    }
    const t = prev; prev = cur; cur = t;
  }
  return best;
}

/**
 * How much of this answer is lifted word for word from the text it was written
 * against. `null` when there is not enough of either to measure honestly.
 *
 * The fraction counts five-word runs rather than single words on purpose. Word
 * overlap alone would flag every faithful reconstruction, because a
 * reconstruction is *supposed* to reuse the passage's nouns; what separates a
 * retelling from a transcription is whether the words come back in the
 * passage's own order, and a five-word run is the shortest span where that
 * stops happening by accident.
 */
function copiedFrom(answer, source) {
  const a = words(answer).slice(0, COPY_MAX_WORDS);
  const s = words(source).slice(0, COPY_MAX_WORDS);
  if (a.length < COPY_MIN_WORDS || s.length < COPY_SHINGLE || a.length < COPY_SHINGLE) return null;

  const seen = new Set();
  for (let i = 0; i + COPY_SHINGLE <= s.length; i++) seen.add(s.slice(i, i + COPY_SHINGLE).join(' '));

  let hits = 0, total = 0;
  for (let i = 0; i + COPY_SHINGLE <= a.length; i++) {
    total++;
    if (seen.has(a.slice(i, i + COPY_SHINGLE).join(' '))) hits++;
  }
  if (!total) return null;
  return { fraction: hits / total, longestRun: longestSharedRun(a, s), words: a.length };
}

/**
 * The ceiling a given overlap allows, or `null` for no ceiling.
 *
 * Continuous, for the reason the length gate is: a step would make one word
 * either side of a threshold worth six marks, and the candidate on the wrong
 * side of it would be right to say the mark was arbitrary.
 */
function copyCeiling(f) {
  if (!(f > COPY_FREE)) return null;
  if (f >= COPY_TOTAL) return COPY_CAP;
  return COPY_CAP + (10 - COPY_CAP) * (1 - (f - COPY_FREE) / (COPY_TOTAL - COPY_FREE));
}

/* ------------------------------ Putting it together ------------------------------ */

/**
 * One item's criterion scores → one mark, with every cap that fired named.
 *
 * `criteria` is `{ key: { score, evidence?, comment? } }`. Unknown keys are
 * ignored and missing ones are simply absent — a marker that returns three of
 * four criteria produces a mark from three, rather than a zero for the fourth,
 * because "not assessed" and "assessed as nothing" are different claims.
 *
 * Returns `null` when there is nothing usable, which everywhere in this codebase
 * means "not marked" and never means zero.
 */
function combine(part, criteria, opts) {
  const o = opts || {};
  const defs = criteriaFor(part);
  const used = [];

  const n0 = words(o.answer).length;

  for (const def of defs) {
    /* A criterion the platform counts for itself. The marker is never asked for
       it, so nothing it says about it is read — the word count is not a matter
       of opinion, and the answer must not move between two runs on the same
       text. Only computed when there is an answer to count: a blank goes to the
       no-answer floor below, not to a form score of zero dressed up as a mark. */
    if (def.computed === 'form') {
      if (!n0) continue;
      used.push({
        key: def.key, en: def.en, vi: def.vi, weight: def.weight || 1,
        score: half(computedForm(n0, o.formBand)),
        computed: true, evidence: null, evidenceRejected: false,
        comment: n0 + ' words against a required ' + (o.formBand || FORM_BAND).min
      });
      continue;
    }

    const got = criteria && criteria[def.key];
    if (!got) continue;
    /* Not `Number()`: null, '', false and [] all coerce to 0, and 0 is a real
       score. `{"score": null}` is how a model says "I could not assess this",
       and reading it as zero dragged the whole item down through the
       weakest-link rule below — one absent field cost a measured 8 an item. */
    const n = typeof got.score === 'number' || (typeof got.score === 'string' && got.score.trim())
      ? Number(got.score) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 10) continue;
    used.push({
      key: def.key, en: def.en, vi: def.vi, score: half(n),
      /* Pearson weights Content 3 of PTE Core's 15 and the other six 2 each.
         Everything else here is unweighted and defaults to 1, which is the same
         arithmetic it always did. */
      weight: def.weight || 1,
      evidence: verifyEvidence(got.evidence, o.answer),
      /* Said out loud rather than left as a silent absence: "the marker quoted
         something you did not write" is information the learner should have. */
      evidenceRejected: !!(got.evidence && !verifyEvidence(got.evidence, o.answer)),
      comment: String(got.comment || '').trim().slice(0, 300) || null
    });
  }

  /* Parts with no criteria of their own — G and H — carry a single score, and
     the caps below still apply to it.
     Counted on the JUDGED criteria, not on `used`. A computed one is always
     there whatever the marker said, so testing `used.length` meant a model that
     answered in the old two-field shape had its score silently discarded and
     the whole item scored off the word count alone: a 20-word e-mail with a
     headline 8 came out at 0. `computed` is the platform's contribution to a
     mark, never the whole of one. */
  const judged = used.filter(c => !c.computed);
  if (!judged.length) {
    const single = Number(o.fallbackScore);
    if (!Number.isFinite(single) || single < 0 || single > 10) return null;
    /* And the length gate comes back for this item, because `form` is not in
       the average to carry it. */
    return applyCaps(part, half(single), [], Object.assign({}, o, { forceLength: true }));
  }

  const total = used.reduce((s, c) => s + (c.weight || 1), 0);
  const mean = used.reduce((s, c) => s + c.score * (c.weight || 1), 0) / total;
  return applyCaps(part, mean, used, o);
}

/** The two caps, applied in the order that makes the reason legible. */
function applyCaps(part, base, used, o) {
  const caps = [];
  let score = base;

  /* Rule 1: the weakest criterion. Only where there is more than one — a single
     score cannot be more than half a band above itself — and never on a part
     that follows a published weighted scheme; see WEIGHTED_SCHEME_PARTS. */
  if (used.length > 1 && !WEIGHTED_SCHEME_PARTS.has(part)) {
    const weakest = Math.min(...used.map(c => c.score));
    const ceiling = weakest + WEAKEST_LINK_HEADROOM;
    if (score > ceiling) {
      const worst = used.find(c => c.score === weakest);
      caps.push({
        rule: 'weakest-criterion', from: half(score), to: half(ceiling),
        en: 'Held down by "' + worst.en + '" at ' + weakest.toFixed(1)
          + '. A piece is only as usable as its weakest part.',
        vi: 'Bị kéo xuống bởi "' + worst.vi + '" ở mức ' + weakest.toFixed(1)
          + '. Một bài chỉ dùng được ở mức phần yếu nhất của nó.'
      });
      score = ceiling;
    }
  }

  /* Rule 2: nothing was handed in.
     This has to come BEFORE the length rule and it has to be a floor of zero,
     not a cap. Rule 3 below caps a short answer at 4 and its own wording says
     "well under the length is not an attempt at the task" — and then awarded 4
     for it. An empty answer went in and 4 out of 10 came out.

     The two callers that mark real work both happen to short-circuit a blank
     to zero before reaching here, so this was not scoring live papers. That is
     not a defence: combine() is the function that DECIDES a mark, and it will
     hand out 4 for nothing the first time a caller forgets. The rule belongs
     where the decision is.

     Applied to every part, including those with no word floor: no words is no
     words whether or not a minimum was set. */
  if (!words(o.answer).length) {
    if (score > 0) {
      caps.push({
        rule: 'no-answer', from: half(score), to: 0,
        en: 'Nothing was handed in for this item, so there is nothing to mark.',
        vi: 'Không có bài nộp cho câu này nên không có gì để chấm.'
      });
    }
    return {
      score: 0, beforeCaps: half(base), criteria: used, caps,
      version: RUBRIC_VERSION
    };
  }

  /* Rule 3: length. Measured, not judged — so it applies whether or not a
     marker ever ran. A genuine but short attempt, unlike the case above.
     Skipped where length is already one of the part's own criteria: on Part D
     it is `form`, computed from the same word count, and capping as well would
     be the same shortfall counted twice. */
  const floor = (WEIGHTED_SCHEME_PARTS.has(part) && !o.forceLength)
    ? null : (o.minWords || MIN_WORDS[part]);
  if (floor) {
    const n = words(o.answer).length;
    const ceiling = lengthCeiling(n, floor);
    if (ceiling !== null && score > half(ceiling)) {
      const hard = n < floor * UNDER_LENGTH_FRACTION;
      caps.push({
        rule: 'under-length', from: half(score), to: half(ceiling),
        en: 'Only ' + n + ' words against a required ' + floor + '. '
          + (hard
            ? 'Well under the length is not an attempt at the task, whatever the sentences are like.'
            : 'A short answer cannot score as if the whole task were done, however good its sentences are.'),
        vi: 'Chỉ ' + n + ' từ so với yêu cầu ' + floor + '. '
          + (hard
            ? 'Quá ngắn so với yêu cầu thì chưa tính là đã làm bài, dù câu cú có tốt đến đâu.'
            : 'Bài viết ngắn không thể được điểm như đã làm trọn yêu cầu, dù câu cú có tốt đến đâu.')
      });
      score = half(ceiling);
    }
  }

  /* Rule 3b: off the topic entirely.
     PTE Core states this one outright — "nếu tiêu chí Content bị 0 điểm (lạc đề
     hoàn toàn), toàn bộ bài email sẽ bị 0 điểm" — and it is the only zero-
     trigger in their scheme, which is why length is NOT one: an e-mail about
     the wrong thing has not been written, however well it is written, while a
     short one has been written and is merely short.
     A floor rather than a cap, like Rule 2, and for the same reason: what
     follows must not be able to award anything back. */
  const contentZero = used.find(c => c.key === 'content' && c.score === 0);
  if (WEIGHTED_SCHEME_PARTS.has(part) && contentZero) {
    if (score > 0) {
      caps.push({
        rule: 'off-topic', from: half(score), to: 0,
        en: 'This does not answer what the task asked for. An e-mail about something else '
          + 'scores nothing, however well it is written.',
        vi: 'Bài này không trả lời yêu cầu của đề. Email lạc đề thì không được điểm nào, '
          + 'dù viết hay đến đâu.'
      });
    }
    return { score: 0, beforeCaps: half(base), criteria: used, caps, version: RUBRIC_VERSION };
  }

  /* Rule 4: the answer is the question.
     Measured for the same reason Rule 3 is — a marker asked to judge this
     answered 10 one run and 1 the next, and both times it was answering a
     different question from the one the part asks. The overlap does not vary
     between runs. */
  if (COPY_PARTS.has(part) && o.stimulus) {
    const copied = copiedFrom(o.answer, o.stimulus);
    const ceiling = copied === null ? null : copyCeiling(copied.fraction);
    if (ceiling !== null && score > half(ceiling)) {
      const pct = Math.round(copied.fraction * 100);
      const run = copied.longestRun;
      /* The run is the part a candidate can check for themselves; the
         percentage on its own invites "says who?". */
      const runEn = run >= COPY_SHINGLE
        ? ' The longest stretch taken word for word is ' + run + ' words.' : '';
      const runVi = run >= COPY_SHINGLE
        ? ' Đoạn dài nhất chép nguyên văn là ' + run + ' từ.' : '';
      caps.push({
        rule: 'copied-source', from: half(score), to: half(ceiling),
        en: pct + '% of this answer is word for word from the text you were given.'
          + runEn + ' This part asks you to write it again in your own words, so'
          + ' copying it back cannot score as if you had.',
        vi: pct + '% bài làm này trùng nguyên văn với đoạn đã cho.'
          + runVi + ' Phần này yêu cầu viết lại bằng lời của mình, nên chép lại'
          + ' không thể được điểm như đã làm bài.'
      });
      score = half(ceiling);
    }
  }

  return {
    score: half(score),
    beforeCaps: half(base),
    criteria: used,
    caps,
    version: RUBRIC_VERSION
  };
}

module.exports = {
  RUBRIC_VERSION, CRITERIA, BANDS, MIN_WORDS,
  LADDER, LADDER_DIMS, LADDER_LEVELS, levelScale, USAGE, OWNER_OVERLAP,
  WEIGHTED_SCHEME_PARTS, FORM_BAND, computedForm, DIM_BANDS, bandsFor, validate,
  UNDER_LENGTH_FRACTION, UNDER_LENGTH_CAP, WEAKEST_LINK_HEADROOM, MIN_EVIDENCE_WORDS,
  COPY_PARTS, COPY_SHINGLE, COPY_FREE, COPY_TOTAL, COPY_CAP, COPY_MIN_WORDS,
  criteriaFor, combine, applyCaps, diagnostics, verifyEvidence, words, sentences, half,
  copiedFrom, copyCeiling
};
