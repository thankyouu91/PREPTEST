/**
 * Ngữ pháp — nhóm ĐỘNG TỪ KHUYẾT THIẾU, phần bậc B2 đến C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-modals.js (bậc A1–B1). Hạn mức của nhóm là 29
 * điểm; tệp kia đã dùng 14 điểm của A1–B1, tệp này dùng nốt 15 điểm còn lại:
 * B2 ×6, C1 ×5, C2 ×4.
 *
 * Bậc A1–B1 lo chuyện khuyết thiếu nói về HIỆN TẠI. Bậc này chuyển sang hai
 * việc khó hơn hẳn:
 *   1. Nói về QUÁ KHỨ bằng "khuyết thiếu + have + V3" — suy đoán chuyện đã rồi,
 *      tiếc nuối việc không làm, trách việc đã làm. Tiếng Việt diễn đạt bằng
 *      trạng ngữ ("lẽ ra", "chắc là", "đáng lẽ") nên người học hay bỏ mất
 *      "have" hoặc chia sai phân từ.
 *   2. Dùng khuyết thiếu để ĐIỀU CHỈNH KHOẢNG CÁCH: hedging trong bài viết học
 *      thuật, và dạng quá khứ để nói cho lịch sự. Đây là chỗ ăn điểm ở phần
 *      Viết và Nói mà học thuộc công thức không giải quyết được.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== B2 ==================== */

  {
    slug: 'deduction-past',
    en: 'must have / can\'t have / might have',
    vi: "must have · can't have · might have — suy đoán về quá khứ",
    level: 'B2',
    summary: 'Đoán chuyện đã xảy ra rồi. Công thức chung là khuyết thiếu + have + V3, không đổi theo ngôi.',
    formula: {
      rows: [
        ['Gần như chắc đã xảy ra', 'must have + V3: "She must have left early."'],
        ['Có thể đã xảy ra', 'may / might / could have + V3'],
        ['Gần như chắc KHÔNG xảy ra', "can't have / couldn't have + V3"],
        ['Đang diễn ra lúc đó', 'must have been + V-ing']
      ],
      note: 'Phủ định của suy đoán chắc chắn là "can\'t have", KHÔNG phải "mustn\'t have". Trong lối nói nhanh, "have" đọc nhẹ thành /əv/ nên người học hay viết nhầm thành "must of" — dạng đó luôn sai chính tả.'
    },
    signals: ['must have', "can't have", 'might have', 'could have', 'must have been'],
    useWhen: [
      'Suy ra một kết luận về chuyện đã xảy ra, dựa vào bằng chứng còn thấy được.',
      'Bác bỏ một giả thuyết về quá khứ khi có bằng chứng trái ngược.',
      'Đoán việc đang diễn ra tại một thời điểm quá khứ: "He must have been sleeping."'
    ],
    useNot: [
      { what: 'Không dùng "mustn\'t have" để suy đoán phủ định.', why: 'Đúng là "can\'t have" hoặc "couldn\'t have". "mustn\'t" chỉ mang nghĩa cấm.' },
      { what: 'Không viết "must of", "should of".', why: 'Đó là lỗi chính tả do nghe âm rút gọn; luôn viết "must have", "should have".' },
      { what: 'Không dùng V2 sau have.', why: '"must have went" sai; phải là phân từ ba: "must have gone".' }
    ],
    confuse: [
      {
        with: 'suy đoán hiện tại',
        tell: 'Không có "have" là đoán chuyện bây giờ; có "have + V3" là đoán chuyện đã rồi.',
        pair: [
          { en: 'She must be tired.', vi: 'Chắc cô ấy đang mệt. (bây giờ)' },
          { en: 'She must have been tired.', vi: 'Chắc lúc đó cô ấy mệt. (đã rồi)' }
        ]
      }
    ],
    errors: [
      { wrong: "He mustn't have seen us.", right: "He can't have seen us.", why: 'Suy đoán phủ định về quá khứ dùng "can\'t have".' },
      { wrong: 'You must of left it at home.', right: 'You must have left it at home.', why: '"must of" là lỗi chính tả do nghe âm rút gọn /əv/.' }
    ],
    examples: [
      ['The ground is wet — it must have rained overnight.', 'Đất ướt, chắc đêm qua trời mưa.', 1, 'Suy ra từ bằng chứng còn lại.'],
      ["She can't have finished already — she only started an hour ago.", 'Cô ấy không thể xong rồi được, mới bắt đầu một tiếng trước mà.', 1, 'Bác bỏ, dùng "can\'t have".'],
      ['He might have missed the train.', 'Có thể anh ấy lỡ chuyến tàu.', 1, 'Khả năng, không chắc.'],
      ['They must have been waiting for hours.', 'Chắc họ đã đợi mấy tiếng liền.', 1, 'Việc kéo dài tại một mốc quá khứ.'],
      ["He mustn't have seen us in the crowd.", 'Chắc anh ấy không thấy chúng ta trong đám đông.', 0, 'Sai: sửa thành "He can\'t have seen us in the crowd."'],
      ['You must of left your keys at home.', 'Chắc bạn để quên chìa khoá ở nhà.', 0, 'Sai chính tả: sửa thành "You must have left your keys at home."']
    ],
    practice: [
      ['The door is open — someone ___ (must have / must of) come in.', 'must have', 'Cửa mở, chắc có ai vào rồi.'],
      ["She ___ (can't have / mustn't have) known about the change.", "can't have", 'Chắc chắn cô ấy không biết về thay đổi đó.'],
      ['He looks exhausted — he ___ (might have / might) worked all night.', 'might have', 'Trông anh ấy kiệt sức, có thể đã làm cả đêm.'],
      ['They must have ___ (gone / went) home already.', 'gone', 'Chắc họ về nhà rồi.'],
      ['I ___ (must have / must) left my umbrella on the bus.', 'must have', 'Chắc tôi bỏ quên ô trên xe buýt.'],
      ["It ___ (can't have / couldn't) been Lan — she is in Hue.", "can't have", 'Không thể là Lan được, cô ấy đang ở Huế.'],
      ['The lights were on, so they ___ (must have been / must be) at home.', 'must have been', 'Đèn sáng nên chắc lúc đó họ ở nhà.'],
      ['She ___ (may have / may) forgotten the meeting.', 'may have', 'Có thể cô ấy quên buổi họp.'],
      ['He ___ (should have / must of) told us earlier.', 'should have', 'Lẽ ra anh ấy nên báo sớm hơn.'],
      ['You ___ (could have / could of) been hurt!', 'could have', 'Bạn có thể đã bị thương đấy!']
    ]
  },

  {
    slug: 'should-have',
    en: "should have / shouldn't have",
    vi: "should have · shouldn't have — tiếc nuối và trách móc",
    level: 'B2',
    summary: 'Nói việc lẽ ra nên làm mà đã không làm, hoặc việc đã làm mà lẽ ra không nên. Luôn hàm ý sự việc đã diễn ra ngược lại.',
    formula: {
      rows: [
        ['Lẽ ra nên làm', 'should have + V3 — nhưng đã KHÔNG làm'],
        ['Lẽ ra không nên', "shouldn't have + V3 — nhưng đã LÀM rồi"],
        ['Trang trọng hơn', 'ought to have + V3'],
        ['Kỳ vọng không thành', '"The parcel should have arrived by now."']
      ],
      note: 'Cấu trúc này luôn ngầm nói điều ngược lại đã xảy ra. "I should have studied" nghĩa là tôi đã KHÔNG học. Đây cũng là cách nhận lỗi và trách nhẹ mà không cần nói thẳng.'
    },
    signals: ['should have', "shouldn't have", 'ought to have', 'I wish I had'],
    useWhen: [
      'Tự trách hoặc tiếc về việc mình đã không làm.',
      'Trách nhẹ người khác về việc họ đã làm hoặc không làm.',
      'Nói điều lẽ ra đã phải xảy ra theo lịch mà chưa thấy.',
      'Cảm ơn khách sáo khi nhận quà: "You shouldn\'t have!"'
    ],
    useNot: [
      { what: 'Không dùng khi việc đó vẫn còn kịp làm.', why: 'Còn kịp thì dùng "should" thường: "You should call her" (gọi đi), khác "You should have called her" (lẽ ra đã phải gọi rồi).' },
      { what: 'Không viết "should of".', why: 'Luôn là "should have", rút gọn thành "should\'ve".' }
    ],
    confuse: [
      {
        with: "must have và should have",
        tell: '"must have" là đoán việc đã xảy ra; "should have" là việc lẽ ra phải xảy ra nhưng đã không.',
        pair: [
          { en: 'He must have told her.', vi: 'Chắc anh ấy đã nói với cô ta rồi. (tôi đoán là có)' },
          { en: 'He should have told her.', vi: 'Lẽ ra anh ấy phải nói với cô ta. (nhưng đã không nói)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I should have study harder for the exam.', right: 'I should have studied harder for the exam.', why: 'Sau "have" là phân từ ba, không phải nguyên thể.' },
      { wrong: 'You should have call me yesterday.', right: 'You should have called me yesterday.', why: 'Cùng lỗi: phải chia phân từ ba.' }
    ],
    examples: [
      ['I should have booked the tickets earlier.', 'Lẽ ra tôi nên đặt vé sớm hơn.', 1, 'Tiếc: đã không đặt sớm.'],
      ["You shouldn't have told him the truth.", 'Lẽ ra bạn không nên nói thật với anh ta.', 1, 'Trách: đã nói rồi.'],
      ['We ought to have checked the address first.', 'Lẽ ra chúng ta nên kiểm tra địa chỉ trước.', 1, 'Dạng trang trọng hơn.'],
      ['The parcel should have arrived by now.', 'Đáng lẽ giờ này kiện hàng phải tới rồi.', 1, 'Kỳ vọng chưa thành hiện thực.'],
      ['I should have study harder last term.', 'Lẽ ra học kỳ trước tôi nên học chăm hơn.', 0, 'Sai: sửa thành "I should have studied harder last term."'],
      ['You should have call me yesterday.', 'Lẽ ra hôm qua bạn nên gọi cho tôi.', 0, 'Sai: sửa thành "You should have called me yesterday."']
    ],
    practice: [
      ['I ___ (should have / should) taken an umbrella — now I am soaked.', 'should have', 'Lẽ ra tôi nên mang ô, giờ ướt hết rồi.'],
      ['You should have ___ (told / tell) me sooner.', 'told', 'Lẽ ra bạn nên nói với tôi sớm hơn.'],
      ["She ___ (shouldn't have / shouldn't) shouted at him like that.", "shouldn't have", 'Lẽ ra cô ấy không nên quát anh ta như thế.'],
      ['We ___ (ought to have / ought have) left earlier.', 'ought to have', 'Lẽ ra chúng ta nên đi sớm hơn.'],
      ['The train ___ (should have / must have) arrived twenty minutes ago.', 'should have', 'Đáng lẽ tàu phải tới từ hai mươi phút trước.'],
      ['He ___ (should have / should of) checked the figures.', 'should have', 'Lẽ ra anh ấy nên kiểm tra lại số liệu.'],
      ['They should have ___ (been / be) more careful.', 'been', 'Lẽ ra họ nên cẩn thận hơn.'],
      ['Oh, flowers! You ___ (shouldn\'t have / mustn\'t have)!', "shouldn't have", 'Ôi hoa! Bạn bày vẽ quá!'],
      ['I ___ (should have / must have) listened to your advice.', 'should have', 'Lẽ ra tôi nên nghe lời khuyên của bạn.'],
      ['She ___ (shouldn\'t have / couldn\'t have) spent so much money.', "shouldn't have", 'Lẽ ra cô ấy không nên tiêu nhiều tiền thế.']
    ]
  },

  {
    slug: 'neednt-have',
    en: "needn't have done vs didn't need to do",
    vi: "needn't have done khác didn't need to do",
    level: 'B2',
    summary: 'Hai câu nhìn gần giống nhau nhưng nói hai chuyện khác hẳn: một bên đã làm mà hoá ra thừa, một bên vốn không cần nên thường là không làm.',
    formula: {
      rows: [
        ["needn't have + V3", 'ĐÃ LÀM rồi mới biết là thừa'],
        ["didn't need to + V", 'vốn không cần, và thường là đã không làm'],
        ['Cùng nghĩa với vế hai', "didn't have to + V"],
        ['Hiện tại', "needn't + V = don't need to + V"]
      ],
      note: 'Lối nói Anh - Mỹ ít dùng "needn\'t have" và hay thay bằng "didn\'t need to" cho cả hai nghĩa, nên khi đọc bài Mỹ phải dựa vào ngữ cảnh. Trong bài thi theo chuẩn Anh - Anh thì phân biệt này vẫn được chấm.'
    },
    signals: ["needn't have", "didn't need to", "didn't have to", 'as it turned out'],
    useWhen: [
      "needn't have: khi kể lại việc mình đã mất công làm mà hoá ra không cần.",
      "didn't need to: khi nói việc đó vốn không bắt buộc.",
      "needn't: nói không cần ở hiện tại, nhẹ hơn \"don't have to\" một chút."
    ],
    useNot: [
      { what: 'Không lẫn hai cấu trúc khi kể chuyện.', why: 'Người nghe suy ra bạn có làm hay không từ chính cấu trúc đó, nên chọn sai là kể sai sự việc.' },
      { what: 'Không dùng "to" sau needn\'t.', why: '"You needn\'t to worry" sai; đúng là "You needn\'t worry".' }
    ],
    confuse: [
      {
        with: "didn't need to",
        tell: 'Hỏi: việc đó cuối cùng CÓ LÀM không? Có làm mà thừa thì "needn\'t have"; không làm vì không cần thì "didn\'t need to".',
        pair: [
          { en: "I needn't have cooked — they had already eaten.", vi: 'Tôi nấu nướng phí công, hoá ra họ ăn rồi. (tôi ĐÃ nấu)' },
          { en: "I didn't need to cook — they had already eaten.", vi: 'Tôi khỏi phải nấu vì họ ăn rồi. (tôi KHÔNG nấu)' }
        ]
      }
    ],
    errors: [
      { wrong: "I didn't need to buy milk, but I bought two litres anyway and now it will go off.", right: "I needn't have bought milk — now it will go off.", why: 'Đã mua rồi mới biết thừa thì dùng "needn\'t have bought".' },
      { wrong: "You needn't to worry about it.", right: "You needn't worry about it.", why: 'Sau "needn\'t" là động từ nguyên thể trần.' }
    ],
    examples: [
      ["I needn't have hurried — the train was delayed.", 'Tôi vội hụt hơi mà không cần, tàu bị hoãn.', 1, 'Đã vội rồi mới biết thừa.'],
      ["We didn't need to book — the restaurant was half empty.", 'Chúng tôi không cần đặt bàn, nhà hàng vắng nửa.', 1, 'Vốn không cần, và đã không đặt.'],
      ["You needn't worry — everything is under control.", 'Bạn không cần lo, mọi thứ trong tầm kiểm soát.', 1, 'Dạng hiện tại.'],
      ["She needn't have apologised; nobody was upset.", 'Cô ấy xin lỗi làm gì, có ai giận đâu.', 1, 'Đã xin lỗi rồi mới thấy thừa.'],
      ["I needn't have taken my passport, so I left it at home.", 'Tôi không cần mang hộ chiếu nên để ở nhà.', 0, 'Sai logic: đã không mang thì phải là "I didn\'t need to take my passport".'],
      ["You needn't to bring anything.", 'Bạn không cần mang gì cả.', 0, 'Sai: bỏ "to". Sửa thành "You needn\'t bring anything."']
    ],
    practice: [
      ["I ___ (needn't have / didn't need to) cooked — everyone had eaten.", "needn't have", 'Tôi nấu phí công, ai cũng ăn rồi.'],
      ["We ___ (didn't need to / needn't have) pay, so we kept our money.", "didn't need to", 'Chúng tôi không phải trả tiền nên giữ nguyên tiền.'],
      ["You ___ (needn't / needn't to) apologise.", "needn't", 'Bạn không cần xin lỗi đâu.'],
      ["She ___ (needn't have / didn't need to) worried — the results were fine.", "needn't have", 'Cô ấy lo hão, kết quả tốt mà.'],
      ["He ___ (didn't need to / needn't have) come in, so he stayed home.", "didn't need to", 'Anh ấy không phải tới nên ở nhà.'],
      ["They ___ (needn't have / didn't need to) bought so much food — half of it was wasted.", "needn't have", 'Họ mua nhiều đồ ăn quá, bỏ phí mất nửa.'],
      ["You ___ (needn't / don't need) bring your laptop tomorrow.", "needn't", 'Mai bạn không cần mang máy tính.'],
      ["I ___ (needn't have / didn't need to) rushed; the meeting started late.", "needn't have", 'Tôi vội hụt hơi, cuộc họp bắt đầu muộn mà.'],
      ["We ___ (didn't have to / needn't have) queue because we had tickets.", "didn't have to", 'Chúng tôi khỏi xếp hàng vì đã có vé.'],
      ["She ___ (needn't have / didn't need to) explained twice — I understood the first time.", "needn't have", 'Cô ấy giải thích hai lần làm gì, tôi hiểu ngay từ đầu rồi.']
    ]
  },

  {
    slug: 'could-have',
    en: 'could have + past participle',
    vi: 'could have — điều đã có thể xảy ra mà không xảy ra',
    level: 'B2',
    summary: 'Nói khả năng đã có nhưng không thành hiện thực, hoặc trách nhẹ vì người ta có điều kiện mà không làm.',
    formula: {
      rows: [
        ['Đã có thể nhưng không', 'could have + V3: "We could have won."'],
        ['Trách nhẹ', '"You could have told me!"'],
        ['Suy đoán về quá khứ', '"She could have left already." (= có thể đã đi)'],
        ['Phủ định', "couldn't have + V3 = chắc chắn không thể"]
      ],
      note: '"could have + V3" mang hai nghĩa tuỳ ngữ cảnh: điều không thành hiện thực ("We could have won but we lost") hoặc suy đoán ("She could have left" = biết đâu đã đi). Ngữ điệu và vế sau quyết định nghĩa nào.'
    },
    signals: ['could have', "couldn't have", 'could easily have', 'but'],
    useWhen: [
      'Nói một khả năng trong quá khứ đã không xảy ra.',
      'Trách nhẹ ai đó vì đã không làm điều họ hoàn toàn làm được.',
      'Nói suýt gặp nguy: "You could have been killed!"',
      'Bác bỏ tuyệt đối: "He couldn\'t have done it — he was with me."'
    ],
    useNot: [
      { what: 'Không dùng "could" trần cho việc đã không xảy ra.', why: '"We could win yesterday" sai; phải là "We could have won yesterday".' },
      { what: 'Không viết "could of".', why: 'Luôn là "could have", rút gọn "could\'ve".' }
    ],
    confuse: [
      {
        with: 'should have',
        tell: '"could have" nói khả năng đã có; "should have" nói bổn phận lẽ ra phải làm. Trách bằng "could have" nhẹ hơn.',
        pair: [
          { en: 'You could have helped me.', vi: 'Bạn giúp tôi được mà. (bạn có điều kiện)' },
          { en: 'You should have helped me.', vi: 'Lẽ ra bạn phải giúp tôi. (đó là bổn phận)' }
        ]
      }
    ],
    errors: [
      { wrong: 'We could win the match, but we played badly.', right: 'We could have won the match, but we played badly.', why: 'Việc đã không xảy ra nên cần "have + V3".' },
      { wrong: 'You could of warned me.', right: 'You could have warned me.', why: '"could of" là lỗi chính tả do nghe âm rút gọn.' }
    ],
    examples: [
      ['We could have won if we had scored that penalty.', 'Chúng tôi đã có thể thắng nếu ghi được quả phạt đền đó.', 1, 'Khả năng không thành hiện thực.'],
      ['You could have told me you were coming!', 'Bạn báo trước là sẽ tới thì có phải hơn không!', 1, 'Trách nhẹ.'],
      ['That was dangerous — you could have been hurt.', 'Nguy hiểm thật đấy, bạn có thể đã bị thương.', 1, 'Suýt gặp nguy.'],
      ["He couldn't have taken it — he was with me all day.", 'Anh ấy không thể lấy được, cả ngày ở với tôi mà.', 1, 'Bác bỏ tuyệt đối.'],
      ['We could win the match, but we played badly.', 'Chúng tôi đã có thể thắng nhưng chơi dở quá.', 0, 'Sai: sửa thành "We could have won the match".'],
      ['You could of warned me about the traffic.', 'Bạn báo tôi về vụ tắc đường thì có phải hơn không.', 0, 'Sai chính tả: sửa thành "You could have warned me".']
    ],
    practice: [
      ['She ___ (could have / could) passed if she had revised.', 'could have', 'Cô ấy đã có thể đỗ nếu chịu ôn bài.'],
      ['You ___ (could have / could of) asked for help.', 'could have', 'Bạn nhờ giúp thì có phải hơn không.'],
      ["He ___ (couldn't have / shouldn't have) known — nobody told him.", "couldn't have", 'Anh ấy không thể biết được, có ai nói đâu.'],
      ['They ___ (could have / can have) arrived by now.', 'could have', 'Giờ này chắc họ tới rồi cũng nên.'],
      ['I ___ (could have / must have) gone to the concert but I was too tired.', 'could have', 'Tôi đi xem hoà nhạc được nhưng mệt quá.'],
      ['That fall ___ (could have / could) been serious.', 'could have', 'Cú ngã đó có thể đã nghiêm trọng.'],
      ['We ___ (could have / should have) saved money by booking early.', 'could have', 'Đặt sớm là chúng ta tiết kiệm được tiền rồi.'],
      ['You ___ (could have / could) hurt yourself climbing that wall.', 'could have', 'Trèo bức tường đó là bạn có thể bị thương đấy.'],
      ["She ___ (couldn't have / mustn't have) finished so quickly.", "couldn't have", 'Cô ấy không thể xong nhanh thế được.'],
      ['They ___ (could have / would have) helped, but nobody asked them.', 'could have', 'Họ giúp được đấy nhưng chẳng ai nhờ.']
    ]
  },

  {
    slug: 'would-uses',
    en: 'would: offers, refusals, past habits, preferences',
    vi: 'would — mời, từ chối, thói quen xưa, ưa thích hơn',
    level: 'B2',
    summary: 'Một chữ "would" gánh nhiều việc khác hẳn nhau. Nhận ra đúng chức năng mới dịch đúng.',
    formula: {
      rows: [
        ['Mời và nhờ lịch sự', 'Would you like…? · Would you mind + V-ing?'],
        ['Thói quen quá khứ', 'would + V — chỉ HÀNH ĐỘNG, không dùng cho trạng thái'],
        ['Từ chối trong quá khứ', "wouldn't + V: \"The car wouldn't start.\""],
        ['Ưa thích hơn', 'would rather + V(trần) · would prefer to + V']
      ],
      note: '"would rather" theo sau là động từ nguyên thể trần: "I would rather stay". Nhưng khi nói về NGƯỜI KHÁC thì dùng dạng quá khứ: "I would rather you stayed" — đây là thức giả định, không phải thì quá khứ.'
    },
    signals: ['would you like', 'would rather', 'would prefer', "wouldn't", 'would always'],
    useWhen: [
      'Mời hoặc nhờ một cách lịch sự.',
      'Kể thói quen xưa trong văn kể chuyện.',
      "wouldn't: nói máy móc hoặc người nào đó nhất định không chịu.",
      'would rather / would prefer: nói lựa chọn mình thích hơn.'
    ],
    useNot: [
      { what: 'Không dùng would cho trạng thái quá khứ.', why: '"I would have a bike when I was ten" sai; trạng thái dùng "used to have".' },
      { what: 'Không thêm "to" sau would rather.', why: '"I would rather to go" sai; đúng là "I would rather go".' },
      { what: 'Không dùng nguyên thể khi would rather nói về người khác.', why: '"I would rather you stay" ít chuẩn; dạng chuẩn là "I would rather you stayed".' }
    ],
    confuse: [
      {
        with: 'would rather và would prefer',
        tell: 'would rather đi với động từ trần; would prefer đi với "to + V" hoặc danh từ.',
        pair: [
          { en: 'I would rather walk than take a taxi.', vi: 'Tôi thà đi bộ còn hơn bắt taxi.' },
          { en: 'I would prefer to walk.', vi: 'Tôi thích đi bộ hơn.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I would rather to stay at home tonight.', right: 'I would rather stay at home tonight.', why: 'Sau "would rather" là động từ nguyên thể trần.' },
      { wrong: 'When I was a child I would live in Hue.', right: 'When I was a child I used to live in Hue.', why: '"live" ở đây là trạng thái nên phải dùng "used to".' }
    ],
    examples: [
      ['Would you mind closing the window?', 'Bạn đóng giúp cửa sổ được không?', 1, 'Nhờ lịch sự, theo sau là V-ing.'],
      ['Every summer we would visit our grandparents.', 'Hè nào chúng tôi cũng về thăm ông bà.', 1, 'Thói quen hành động trong quá khứ.'],
      ["The engine wouldn't start that morning.", 'Sáng hôm đó máy không chịu nổ.', 1, 'Máy móc nhất định không chạy.'],
      ['I would rather stay in tonight.', 'Tối nay tôi thà ở nhà.', 1, 'would rather + động từ trần.'],
      ['I would rather to stay at home tonight.', 'Tối nay tôi thà ở nhà.', 0, 'Sai: bỏ "to". Sửa thành "I would rather stay at home tonight."'],
      ['When I was a child I would live in Hue.', 'Hồi nhỏ tôi sống ở Huế.', 0, 'Sai: trạng thái dùng "used to live".']
    ],
    practice: [
      ['I would rather ___ (stay / to stay) here.', 'stay', 'Tôi thà ở lại đây.'],
      ['Would you mind ___ (waiting / to wait) a moment?', 'waiting', 'Bạn đợi một lát được không?'],
      ['I would prefer ___ (to leave / leave) early.', 'to leave', 'Tôi thích đi sớm hơn.'],
      ['When we were young we ___ (would / used to) play football every evening.', 'would', 'Hồi nhỏ chiều nào chúng tôi cũng đá bóng.'],
      ['She ___ (used to / would) be very shy.', 'used to', 'Ngày trước cô ấy rất nhút nhát.'],
      ["The door ___ (wouldn't / couldn't) open no matter what I tried.", "wouldn't", 'Cái cửa nhất định không mở dù tôi làm cách nào.'],
      ['I would rather you ___ (came / come) tomorrow.', 'came', 'Tôi muốn bạn tới vào ngày mai hơn.'],
      ['___ (Would / Will) you like another cup?', 'Would', 'Bạn dùng thêm một tách nữa nhé?'],
      ['He would rather ___ (work / to work) from home.', 'work', 'Anh ấy thích làm việc ở nhà hơn.'],
      ['We would prefer ___ (to meet / meet) on Friday.', 'to meet', 'Chúng tôi muốn gặp vào thứ Sáu hơn.']
    ]
  },

  {
    slug: 'modal-passive',
    en: 'Modals in the passive',
    vi: 'Khuyết thiếu ở thể bị động',
    level: 'B2',
    summary: 'Ghép khuyết thiếu với bị động để nói quy định và quy trình mà không cần nêu ai làm. Rất hay gặp trong văn bản hướng dẫn và bài viết học thuật.',
    formula: {
      rows: [
        ['Hiện tại và tương lai', 'khuyết thiếu + be + V3: "Forms must be signed."'],
        ['Quá khứ', 'khuyết thiếu + have been + V3: "It should have been reported."'],
        ['Tiếp diễn bị động', 'khuyết thiếu + be being + V3 (hiếm)'],
        ['Phủ định', 'must not be + V3 · cannot be + V3']
      ],
      note: 'Bị động hợp khi người thực hiện không quan trọng hoặc cố ý không nêu. Trong văn bản quy định, "must be" nghe khách quan hơn "you must" nhiều.'
    },
    signals: ['must be', 'should be', 'can be', 'may be', 'must have been', 'should have been'],
    useWhen: [
      'Viết quy định, hướng dẫn sử dụng, quy trình.',
      'Bài viết học thuật khi muốn nhấn vào việc chứ không vào người làm.',
      'Nói về việc lẽ ra đã phải được làm: "The error should have been corrected."'
    ],
    useNot: [
      { what: 'Không quên "be".', why: '"The form must signed" sai; phải là "The form must be signed".' },
      { what: 'Không dùng bị động khi người thực hiện là thông tin quan trọng.', why: 'Nếu cần biết ai làm thì chủ động rõ hơn: "The manager must approve it."' }
    ],
    confuse: [
      {
        with: 'bị động hiện tại và bị động quá khứ',
        tell: 'Thêm "have" là chuyển sang chuyện lẽ ra đã phải xong.',
        pair: [
          { en: 'The report must be submitted by Friday.', vi: 'Báo cáo phải nộp trước thứ Sáu. (từ giờ tới đó)' },
          { en: 'The report should have been submitted last week.', vi: 'Lẽ ra báo cáo phải nộp từ tuần trước. (đã trễ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'All applications must submitted online.', right: 'All applications must be submitted online.', why: 'Thiếu "be" trong cấu trúc bị động.' },
      { wrong: 'The mistake should have be corrected.', right: 'The mistake should have been corrected.', why: 'Sau "have" là "been", không phải "be".' }
    ],
    examples: [
      ['All bags must be checked at the entrance.', 'Mọi túi xách phải được kiểm tra ở lối vào.', 1, 'Quy định, không cần nêu ai kiểm.'],
      ['This form can be downloaded from the website.', 'Mẫu đơn này tải được trên trang web.', 1, 'Bị động với can.'],
      ['The results should have been announced yesterday.', 'Lẽ ra kết quả phải được công bố từ hôm qua.', 1, 'Bị động ở quá khứ, hàm ý đã trễ.'],
      ['Photographs may not be taken inside the museum.', 'Không được chụp ảnh bên trong bảo tàng.', 1, 'Phủ định bị động, văn phong biển báo.'],
      ['All applications must submitted online.', 'Mọi hồ sơ phải nộp trực tuyến.', 0, 'Sai: thiếu "be". Sửa thành "must be submitted".'],
      ['The mistake should have be corrected earlier.', 'Lẽ ra lỗi đó phải được sửa sớm hơn.', 0, 'Sai: sửa thành "should have been corrected".']
    ],
    practice: [
      ['The door must ___ (be / – ) locked at night.', 'be', 'Ban đêm cửa phải được khoá.'],
      ['These files can ___ (be / been) shared with the team.', 'be', 'Mấy tệp này chia sẻ được với cả nhóm.'],
      ['The form should have ___ (been / be) signed by both parties.', 'been', 'Lẽ ra đơn phải được cả hai bên ký.'],
      ['Mobile phones must ___ (be / being) switched off.', 'be', 'Điện thoại phải được tắt.'],
      ['The data may ___ (be / been) used for research.', 'be', 'Dữ liệu có thể được dùng cho nghiên cứu.'],
      ['This problem could ___ (have been / have) avoided.', 'have been', 'Vấn đề này lẽ ra tránh được.'],
      ['Tickets cannot ___ (be / been) refunded.', 'be', 'Vé không được hoàn tiền.'],
      ['The room should ___ (be / been) cleaned before the guests arrive.', 'be', 'Phòng phải được dọn trước khi khách tới.'],
      ['Payment must ___ (be / been) made in advance.', 'be', 'Phải thanh toán trước.'],
      ['The results must have ___ (been / be) delayed by the storm.', 'been', 'Chắc kết quả bị chậm vì bão.']
    ]
  },

  /* ==================== C1 ==================== */

  {
    slug: 'certainty-scale',
    en: 'The full scale of certainty',
    vi: 'Thang chắc chắn đầy đủ',
    level: 'C1',
    summary: 'Bảy mức từ chắc chắn tới bác bỏ, ở cả hiện tại lẫn quá khứ. Chọn đúng mức là chọn đúng mức cam kết của mình với điều đang nói.',
    formula: {
      rows: [
        ['Chắc chắn', 'will · must — "That will be the postman."'],
        ['Rất có khả năng', 'should · ought to — "They should be there by now."'],
        ['Có thể', 'may · might · could'],
        ['Bác bỏ', "can't · couldn't — \"That can't be right.\""]
      ],
      note: 'Chuyển sang quá khứ bằng cách thêm "have + V3" cho cả thang: will have been, must have been, should have been, might have been, can\'t have been. Riêng "will" ở đây không nói tương lai mà nói suy đoán chắc chắn về hiện tại.'
    },
    signals: ['will be', 'must be', 'should be', 'may be', 'might be', "can't be"],
    useWhen: [
      'Nêu mức tin chắc của mình thay vì khẳng định trần.',
      'Bình luận số liệu trong bài viết học thuật, nơi khẳng định tuyệt đối là rủi ro.',
      'Suy đoán lịch sự về người khác mà không áp đặt.'
    ],
    useNot: [
      { what: 'Không dùng "must" khi thực ra chỉ đoán mò.', why: 'must hàm ý có bằng chứng dẫn tới kết luận. Không có bằng chứng thì dùng may hoặc might.' },
      { what: 'Không dùng "mustn\'t" ở đầu bên kia của thang.', why: 'Đối cực của "must be" là "can\'t be", không phải "mustn\'t be".' }
    ],
    confuse: [
      {
        with: 'will chỉ tương lai và will chỉ suy đoán',
        tell: 'Có ngữ cảnh thời gian tương lai thì là dự đoán; không có mà đang nói chuyện đang xảy ra thì là suy đoán chắc chắn.',
        pair: [
          { en: 'The train will arrive at six.', vi: 'Tàu sẽ tới lúc sáu giờ. (tương lai)' },
          { en: "Don't answer — it will be that salesman again.", vi: 'Đừng nghe máy, lại tay bán hàng đó thôi. (suy đoán về hiện tại)' }
        ]
      }
    ],
    errors: [
      { wrong: "The office is dark, so nobody mustn't be there.", right: "The office is dark, so nobody can be there.", why: 'Bác bỏ dùng "can\'t" hoặc câu phủ định với "can", không dùng "mustn\'t".' },
      { wrong: 'She must be tired yesterday.', right: 'She must have been tired yesterday.', why: 'Suy đoán về quá khứ cần "have + V3".' }
    ],
    examples: [
      ["That'll be Lan at the door — she said she would come.", 'Chắc Lan tới đấy, cô ấy bảo sẽ qua mà.', 1, '"will" mang nghĩa suy đoán chắc chắn.'],
      ['They should be home by now.', 'Giờ này chắc họ về tới nhà rồi.', 1, 'Mức rất có khả năng.'],
      ['She might have missed the announcement.', 'Có thể cô ấy không nghe thấy thông báo.', 1, 'Mức có thể, ở quá khứ.'],
      ["That can't be the right answer.", 'Đó không thể là đáp án đúng.', 1, 'Bác bỏ.'],
      ["The office is dark, so nobody mustn't be there.", 'Văn phòng tối om nên chắc chẳng có ai.', 0, 'Sai: sửa thành "so nobody can be there" hoặc "there can\'t be anybody there".'],
      ['She must be very tired yesterday.', 'Chắc hôm qua cô ấy mệt lắm.', 0, 'Sai: quá khứ cần "have". Sửa thành "She must have been very tired yesterday."']
    ],
    practice: [
      ['He is never late, so he ___ (must have / can have) been held up.', 'must have', 'Anh ấy không bao giờ muộn nên chắc bị kẹt việc gì.'],
      ["That ___ (can't / mustn't) be true.", "can't", 'Điều đó không thể đúng được.'],
      ['They ___ (should / must) have landed by now — the flight was short.', 'should', 'Giờ này chắc họ hạ cánh rồi, chuyến bay ngắn mà.'],
      ["I'm not sure, but she ___ (might / must) know the answer.", 'might', 'Tôi không chắc nhưng có thể cô ấy biết câu trả lời.'],
      ['The phone is ringing — that ___ (will / would) be my mother.', 'will', 'Điện thoại reo kìa, chắc mẹ tôi đấy.'],
      ['He ___ (must have / should have) forgotten — he never forgets normally.', 'must have', 'Chắc anh ấy quên, bình thường có bao giờ quên đâu.'],
      ["It ___ (couldn't / shouldn't) have been him — he was abroad.", "couldn't", 'Không thể là anh ta được, anh ta đang ở nước ngoài.'],
      ['The parcel ___ (should / must) arrive tomorrow according to the tracking.', 'should', 'Theo mã vận đơn thì mai kiện hàng tới.'],
      ['She ___ (may / must) be in a meeting — I am not certain.', 'may', 'Có thể cô ấy đang họp, tôi không chắc.'],
      ['Nobody answered, so they ___ (must have / can have) gone out.', 'must have', 'Không ai nghe máy nên chắc họ ra ngoài rồi.']
    ]
  },

  {
    slug: 'hedging-academic',
    en: 'Hedging with modals in academic writing',
    vi: 'Dùng khuyết thiếu để nói giảm trong bài viết học thuật',
    level: 'C1',
    summary: 'Bài học thuật hiếm khi khẳng định tuyệt đối. Khuyết thiếu là công cụ chính để hạ mức cam kết xuống đúng với bằng chứng đang có.',
    formula: {
      rows: [
        ['Khẳng định trần', 'X causes Y. (cam kết cao nhất, rủi ro nhất)'],
        ['Giảm một bậc', 'X may / might / could cause Y.'],
        ['Giảm kèm động từ tường thuật', 'X would appear to cause Y. · X would seem to…'],
        ['Kết hợp trạng ngữ', 'This may possibly indicate that…']
      ],
      note: 'Đừng chồng quá nhiều lớp giảm nhẹ: "It could possibly perhaps be argued that it might…" nghe như người viết không dám nói gì. Một lớp là đủ, hai lớp là tối đa.'
    },
    signals: ['may', 'might', 'could', 'would appear to', 'would seem to', 'tend to'],
    useWhen: [
      'Diễn giải kết quả mà bằng chứng chưa đủ mạnh để khẳng định.',
      'Nêu giới hạn của nghiên cứu.',
      'Đề xuất cách giải thích khác cho cùng một dữ liệu.',
      'Nói giảm khi phản bác công trình của người khác.'
    ],
    useNot: [
      { what: 'Không giảm nhẹ những gì dữ liệu đã chứng minh rõ.', why: 'Số liệu chắc chắn mà viết "may show" thì người đọc nghĩ chính tác giả cũng không tin.' },
      { what: 'Không chồng ba bốn lớp giảm nhẹ.', why: 'Câu mất trọng lượng và bị chấm là thiếu chính kiến.' },
      { what: 'Không dùng "can" thay cho "may" khi nói khả năng ở một trường hợp cụ thể.', why: '"can" nói khả năng chung chung theo lẽ thường; khả năng của một trường hợp cụ thể dùng "may" hoặc "might".' }
    ],
    confuse: [
      {
        with: 'can và may khi nói khả năng',
        tell: '"can" nói điều đôi khi vẫn xảy ra nói chung; "may" nói khả năng của chính trường hợp đang bàn.',
        pair: [
          { en: 'Heavy rainfall can cause flooding.', vi: 'Mưa lớn có thể gây lụt. (quy luật chung)' },
          { en: 'Heavy rainfall may have caused the flooding in this case.', vi: 'Trong trường hợp này, mưa lớn có thể là nguyên nhân gây lụt. (ca cụ thể)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The data might possibly perhaps suggest that there could be a weak link.', right: 'The data suggest a weak link.', why: 'Bốn lớp giảm nhẹ chồng lên nhau làm câu rỗng nghĩa; giữ một lớp là đủ.' },
      { wrong: 'This graph may show that sales doubled.', right: 'This graph shows that sales doubled.', why: 'Số liệu trên đồ thị là sự thật hiển nhiên, không cần giảm nhẹ.' }
    ],
    examples: [
      ['These findings may indicate a link between sleep and memory.', 'Những phát hiện này có thể cho thấy mối liên hệ giữa giấc ngủ và trí nhớ.', 1, 'Giảm một bậc, hợp với mức bằng chứng.'],
      ['The difference could be explained by sample size.', 'Chênh lệch này có thể do cỡ mẫu.', 1, 'Nêu một cách giải thích khả dĩ.'],
      ['The results would appear to contradict earlier studies.', 'Kết quả có vẻ mâu thuẫn với các nghiên cứu trước.', 1, 'Phản bác một cách nhã nhặn.'],
      ['Heavy rainfall can cause landslides in this region.', 'Mưa lớn có thể gây sạt lở ở vùng này.', 1, '"can" cho quy luật chung.'],
      ['The data might possibly perhaps suggest that there could be a link.', 'Dữ liệu có lẽ có thể cho thấy biết đâu có mối liên hệ.', 0, 'Sai: chồng quá nhiều lớp giảm nhẹ. Sửa thành "The data suggest a link."'],
      ['Table 2 may show that the figure doubled.', 'Bảng 2 có thể cho thấy con số đã tăng gấp đôi.', 0, 'Sai sắc thái: bảng số liệu là sự thật. Sửa thành "Table 2 shows that the figure doubled."']
    ],
    practice: [
      ['The findings ___ (suggest / may suggest) a possible link, though more data are needed.', 'may suggest', 'Kết quả có thể cho thấy một mối liên hệ, dù cần thêm dữ liệu.'],
      ['Figure 1 ___ (shows / may show) a sharp decline.', 'shows', 'Hình 1 cho thấy sự sụt giảm mạnh.'],
      ['Smoking ___ (can / may) cause lung disease.', 'can', 'Hút thuốc có thể gây bệnh phổi. (quy luật chung)'],
      ['The delay ___ (may / can) have been caused by a software fault.', 'may', 'Sự cố chậm trễ có thể do lỗi phần mềm.'],
      ['This ___ (would appear / would appears) to support the hypothesis.', 'would appear', 'Điều này có vẻ ủng hộ giả thuyết.'],
      ['The sample ___ (might / must) not be representative of the whole population.', 'might', 'Mẫu có thể không đại diện cho cả tổng thể.'],
      ['Such an approach ___ (could / can) prove costly in this particular case.', 'could', 'Cách làm đó có thể tốn kém trong trường hợp cụ thể này.'],
      ['The results ___ (are / may be) statistically significant at p < 0.01.', 'are', 'Kết quả có ý nghĩa thống kê ở mức p nhỏ hơn 0,01.'],
      ['Further research ___ (may / must) clarify this relationship.', 'may', 'Nghiên cứu thêm có thể làm rõ mối quan hệ này.'],
      ['These factors ___ (seem / would seem) to interact in complex ways.', 'would seem', 'Các yếu tố này dường như tương tác theo những cách phức tạp.']
    ]
  },

  {
    slug: 'may-well-might-as-well',
    en: 'may well / might as well',
    vi: 'may well · might as well',
    level: 'C1',
    summary: 'Hai cụm nhìn giống nhau mà nghĩa khác hẳn: một cái nâng độ chắc chắn lên, một cái nói làm cũng được vì chẳng có lựa chọn nào hơn.',
    formula: {
      rows: [
        ['may well + V', 'rất có khả năng: "She may well be right."'],
        ['might well + V', 'như trên, hơi dè dặt hơn'],
        ['might as well + V', 'làm cũng được, vì không có cách nào hay hơn'],
        ['may as well + V', 'như might as well, hơi thân mật hơn']
      ],
      note: 'Nhớ bằng chữ "as": có "as" là nói lựa chọn ngang nhau, thôi thì làm; không có "as" là nói xác suất cao.'
    },
    signals: ['may well', 'might well', 'might as well', 'may as well', 'we might as well'],
    useWhen: [
      'may well: khi muốn nói điều gì đó khá chắc sẽ đúng hoặc sẽ xảy ra.',
      'might as well: khi đề xuất làm gì đó vì chẳng còn lựa chọn nào tốt hơn.',
      'might as well cũng dùng để nói mỉa: "We might as well have stayed at home."'
    ],
    useNot: [
      { what: 'Không lẫn hai cụm.', why: '"She might as well be right" nghĩa hoàn toàn khác "She may well be right".' },
      { what: 'Không thêm "to".', why: '"We might as well to go" sai; sau cụm là động từ nguyên thể trần.' }
    ],
    confuse: [
      {
        with: 'may well và might as well',
        tell: 'Chữ "as" là chìa khoá: có "as" là đề xuất cho xong chuyện, không có "as" là đánh giá xác suất.',
        pair: [
          { en: 'He may well refuse the offer.', vi: 'Rất có thể anh ta sẽ từ chối lời đề nghị. (xác suất cao)' },
          { en: 'The shop is closed, so we might as well go home.', vi: 'Cửa hàng đóng rồi, thôi về nhà vậy. (không còn lựa chọn nào hơn)' }
        ]
      }
    ],
    errors: [
      { wrong: 'It is raining, so we may well stay in.', right: 'It is raining, so we might as well stay in.', why: 'Ý là thôi ở nhà vậy, nên phải dùng "might as well".' },
      { wrong: 'We might as well to leave now.', right: 'We might as well leave now.', why: 'Sau cụm là động từ nguyên thể trần.' }
    ],
    examples: [
      ['She may well become the next director.', 'Rất có thể cô ấy sẽ là giám đốc kế tiếp.', 1, 'Xác suất cao.'],
      ['The last bus has gone, so we might as well walk.', 'Chuyến buýt cuối đi rồi, thôi đi bộ vậy.', 1, 'Không còn lựa chọn nào hơn.'],
      ['That may well be the best explanation we have.', 'Rất có thể đó là cách giải thích tốt nhất chúng ta có.', 1, 'Đánh giá xác suất trong văn viết.'],
      ['Nobody came, so we might as well have cancelled the event.', 'Chẳng ai tới, thà huỷ sự kiện cho xong.', 1, 'Nói mỉa về việc đã rồi.'],
      ['It is raining, so we may well stay in.', 'Trời mưa, thôi ở nhà vậy.', 0, 'Sai: sửa thành "we might as well stay in".'],
      ['We might as well to leave now.', 'Thôi đi bây giờ vậy.', 0, 'Sai: bỏ "to". Sửa thành "We might as well leave now."']
    ],
    practice: [
      ['The queue is huge — we ___ (might as well / may well) come back later.', 'might as well', 'Hàng dài quá, thôi lát nữa quay lại vậy.'],
      ['He ___ (may well / might as well) be the strongest candidate.', 'may well', 'Rất có thể anh ấy là ứng viên mạnh nhất.'],
      ['Since you are here, you ___ (might as well / may well) stay for dinner.', 'might as well', 'Bạn đã tới rồi thì ở lại ăn tối luôn.'],
      ['That ___ (may well / might as well) explain the discrepancy.', 'may well', 'Điều đó rất có thể giải thích được chỗ chênh lệch.'],
      ['We might as well ___ (start / to start) without them.', 'start', 'Thôi bắt đầu không cần chờ họ.'],
      ['Prices ___ (may well / might as well) rise again next year.', 'may well', 'Rất có thể sang năm giá lại tăng.'],
      ['The film was terrible — we ___ (might as well / may well) have stayed home.', 'might as well', 'Phim dở tệ, thà ở nhà còn hơn.'],
      ['She ___ (may well / might as well) have already left.', 'may well', 'Rất có thể cô ấy đi rồi.'],
      ['If nobody objects, we ___ (may as well / may well) proceed.', 'may as well', 'Nếu không ai phản đối thì ta tiến hành luôn.'],
      ['This ___ (may well / might as well) be the most important finding.', 'may well', 'Rất có thể đây là phát hiện quan trọng nhất.']
    ]
  },

  {
    slug: 'semi-modals',
    en: 'be to / be bound to / be about to / be due to',
    vi: 'Nhóm bán khuyết thiếu với "be"',
    level: 'C1',
    summary: 'Bốn cụm với "be" đảm nhận những sắc thái mà khuyết thiếu thật không nói được: sắp xếp chính thức, chắc chắn sẽ xảy ra, sắp sửa, theo lịch.',
    formula: {
      rows: [
        ['be to + V', 'sắp xếp chính thức hoặc mệnh lệnh: "You are to report at nine."'],
        ['be bound to + V', 'chắc chắn sẽ xảy ra: "It is bound to rain."'],
        ['be about to + V', 'sắp sửa, ngay lập tức: "I am about to leave."'],
        ['be due to + V', 'theo lịch: "The flight is due to land at six."']
      ],
      note: '"be to" trong bản tin và văn bản chính thức mang nghĩa đã được sắp đặt: "The President is to visit Hanoi". Đừng nhầm với "be due to + danh từ" nghĩa là "do bởi": "The delay was due to fog".'
    },
    signals: ['is to', 'are bound to', 'is about to', 'is due to', 'was to have'],
    useWhen: [
      'be to: bản tin, chỉ thị, kế hoạch chính thức.',
      'be bound to: dự đoán gần như chắc chắn dựa vào lẽ thường.',
      'be about to: việc sẽ xảy ra trong vài giây hoặc vài phút tới.',
      'be due to: lịch trình đã ấn định.'
    ],
    useNot: [
      { what: 'Không nhầm "be due to + V" với "be due to + danh từ".', why: '"The train is due to arrive" là theo lịch; "The delay is due to snow" là do tuyết. Cùng chữ nhưng hai cấu trúc khác nhau.' },
      { what: 'Không dùng "be about to" cho việc còn xa.', why: 'Nó chỉ dùng cho việc sắp xảy ra ngay; xa hơn thì dùng "be going to".' }
    ],
    confuse: [
      {
        with: 'be due to + V và be due to + danh từ',
        tell: 'Nhìn cái đứng sau: động từ thì nghĩa là theo lịch, danh từ thì nghĩa là nguyên nhân.',
        pair: [
          { en: 'The meeting is due to start at ten.', vi: 'Cuộc họp theo lịch bắt đầu lúc mười giờ.' },
          { en: 'The cancellation was due to bad weather.', vi: 'Việc huỷ là do thời tiết xấu.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The delay was due to arrive late.', right: 'The delay was due to bad weather.', why: 'Sau "due to" chỉ nguyên nhân phải là danh từ, không phải "to + V".' },
      { wrong: 'I am about to finish next month.', right: 'I am going to finish next month.', why: '"be about to" chỉ dùng cho việc sắp xảy ra ngay lập tức.' }
    ],
    examples: [
      ['All staff are to attend the briefing at nine.', 'Toàn thể nhân viên phải dự buổi họp giao ban lúc chín giờ.', 1, '"be to" mang nghĩa chỉ thị.'],
      ['If you drive like that, you are bound to have an accident.', 'Lái kiểu đó thì kiểu gì cũng gặp tai nạn.', 1, 'Gần như chắc chắn.'],
      ['Hurry — the train is about to leave.', 'Nhanh lên, tàu sắp chạy rồi.', 1, 'Sắp xảy ra ngay.'],
      ['The report is due to be published next week.', 'Theo lịch báo cáo sẽ được công bố tuần sau.', 1, '"be due to" + động từ, chỉ lịch.'],
      ['The delay was due to arrive late.', 'Sự chậm trễ là do tới muộn.', 0, 'Sai cấu trúc: sửa thành "The delay was due to bad weather" hoặc "The train was due to arrive at six."'],
      ['I am about to graduate next year.', 'Sang năm tôi sắp tốt nghiệp.', 0, 'Sai sắc thái: việc còn xa. Sửa thành "I am going to graduate next year."']
    ],
    practice: [
      ['The minister ___ (is to / is about to) visit the province next month.', 'is to', 'Tháng sau bộ trưởng sẽ tới thăm tỉnh.'],
      ['With that attitude he ___ (is bound to / is due to) fail.', 'is bound to', 'Với thái độ đó thì kiểu gì anh ta cũng trượt.'],
      ['Be quiet — the film ___ (is about to / is to) start.', 'is about to', 'Im lặng nào, phim sắp chiếu rồi.'],
      ['The flight ___ (is due to / is bound to) land at 14:30.', 'is due to', 'Theo lịch chuyến bay hạ cánh lúc 14:30.'],
      ['The closure was due to ___ (funding cuts / cut funding).', 'funding cuts', 'Việc đóng cửa là do cắt giảm kinh phí.'],
      ['Prices ___ (are bound to / are due to) go up after the holiday.', 'are bound to', 'Sau kỳ nghỉ thế nào giá cũng tăng.'],
      ['Candidates ___ (are to / are about to) submit their forms by Friday.', 'are to', 'Thí sinh phải nộp hồ sơ trước thứ Sáu.'],
      ['I was ___ (about to / due to) call you when you rang.', 'about to', 'Tôi vừa định gọi cho bạn thì bạn gọi tới.'],
      ['The results ___ (are due to / are bound to) be announced on Monday.', 'are due to', 'Theo lịch kết quả sẽ công bố vào thứ Hai.'],
      ['Such a plan ___ (is bound to / is about to) meet resistance.', 'is bound to', 'Kế hoạch kiểu đó chắc chắn gặp phản đối.']
    ]
  },

  {
    slug: 'shall-formal',
    en: 'shall: offers, suggestions and legal texts',
    vi: 'shall — đề nghị, gợi ý và văn bản quy phạm',
    level: 'C1',
    summary: 'Trong đời thường shall chỉ còn sống ở câu hỏi ngôi thứ nhất; trong văn bản pháp lý nó lại mang nghĩa bắt buộc rất nặng.',
    formula: {
      rows: [
        ['Ngỏ ý giúp', 'Shall I …? — "Shall I carry that for you?"'],
        ['Rủ cùng làm', 'Shall we …? — "Shall we begin?"'],
        ['Hỏi ý kiến', 'What shall I do?'],
        ['Văn bản quy phạm', 'The tenant shall pay… = bắt buộc theo hợp đồng']
      ],
      note: 'Ngoài ba dạng câu hỏi ngôi thứ nhất, shall gần như đã biến mất khỏi tiếng Anh nói hằng ngày, nhất là ở Mỹ. Gặp "shall" trong hợp đồng thì hiểu là "phải", không phải "sẽ".'
    },
    signals: ['Shall I', 'Shall we', 'What shall', 'shall be deemed', 'shall not'],
    useWhen: [
      'Ngỏ ý làm giúp ai đó.',
      'Rủ người khác cùng làm gì.',
      'Xin ý kiến khi mình đang phân vân.',
      'Đọc và viết văn bản hợp đồng, quy chế.'
    ],
    useNot: [
      { what: 'Không dùng shall cho ngôi thứ hai và thứ ba trong tiếng Anh đời thường.', why: '"He shall come tomorrow" nghe cổ hoặc mang giọng ra lệnh; nói "He will come tomorrow".' },
      { what: 'Không hiểu "shall" trong hợp đồng là tương lai.', why: '"The tenant shall pay the rent monthly" nghĩa là bên thuê PHẢI trả hằng tháng.' }
    ],
    confuse: [
      {
        with: 'Shall I và Will I',
        tell: '"Shall I…?" là ngỏ ý giúp hoặc xin ý kiến. "Will I…?" hỏi về tương lai của chính mình và nghe rất lạ trong tình huống ngỏ ý.',
        pair: [
          { en: 'Shall I open the window?', vi: 'Tôi mở cửa sổ nhé? (ngỏ ý làm giúp)' },
          { en: 'Will I need a visa?', vi: 'Tôi có cần thị thực không? (hỏi về tương lai)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Will I help you with those bags?', right: 'Shall I help you with those bags?', why: 'Ngỏ ý giúp thì dùng "Shall I…?"' },
      { wrong: 'The contractor will complete the works by 30 June, and this is a binding obligation.', right: 'The contractor shall complete the works by 30 June.', why: 'Trong văn bản hợp đồng, nghĩa vụ ràng buộc diễn đạt bằng "shall".' }
    ],
    examples: [
      ['Shall I call you a taxi?', 'Tôi gọi taxi cho bạn nhé?', 1, 'Ngỏ ý giúp.'],
      ['Shall we meet at seven?', 'Bảy giờ mình gặp nhau nhé?', 1, 'Rủ cùng làm.'],
      ['What shall I tell them?', 'Tôi nên nói gì với họ đây?', 1, 'Xin ý kiến.'],
      ['Each party shall bear its own costs.', 'Mỗi bên tự chịu chi phí của mình.', 1, 'Nghĩa vụ trong văn bản pháp lý.'],
      ['Will I help you with those bags?', 'Tôi xách giúp mấy cái túi nhé?', 0, 'Sai: ngỏ ý giúp dùng "Shall I help you with those bags?"'],
      ['He shall arrive tomorrow morning.', 'Sáng mai anh ấy sẽ tới.', 0, 'Sai sắc thái: đời thường dùng "He will arrive tomorrow morning."']
    ],
    practice: [
      ['___ (Shall / Will) I get you a chair?', 'Shall', 'Tôi lấy ghế cho bạn nhé?'],
      ['___ (Shall / Will) we start the meeting?', 'Shall', 'Chúng ta bắt đầu họp nhé?'],
      ['What time ___ (shall / will) the train arrive?', 'will', 'Mấy giờ tàu tới?'],
      ['The tenant ___ (shall / will) keep the property in good repair.', 'shall', 'Bên thuê phải giữ tài sản trong tình trạng tốt.'],
      ['___ (Shall / Will) I wait outside?', 'Shall', 'Tôi đợi bên ngoài nhé?'],
      ['She ___ (will / shall) be twenty next month.', 'will', 'Tháng sau cô ấy tròn hai mươi tuổi.'],
      ['Where ___ (shall / will) we put the boxes?', 'shall', 'Chúng ta để mấy cái thùng ở đâu?'],
      ['Neither party ___ (shall / would) disclose confidential information.', 'shall', 'Không bên nào được tiết lộ thông tin mật.'],
      ['___ (Shall / Will) I close the door for you?', 'Shall', 'Tôi đóng cửa giúp bạn nhé?'],
      ['They ___ (will / shall) probably arrive late.', 'will', 'Chắc họ sẽ tới muộn.']
    ]
  },

  /* ==================== C2 ==================== */

  {
    slug: 'remoteness-politeness',
    en: 'Past forms for politeness and distance',
    vi: 'Dùng dạng quá khứ để nói cho lịch sự',
    level: 'C2',
    summary: 'Lùi động từ về quá khứ không phải để nói chuyện đã qua mà để tạo khoảng cách, khiến lời nói nhẹ đi. Đây là cơ chế lịch sự cốt lõi của tiếng Anh.',
    formula: {
      rows: [
        ['Lùi khuyết thiếu', 'can → could · will → would · may → might'],
        ['Lùi cả thì', 'I wonder → I wondered → I was wondering'],
        ['Càng lùi càng nhẹ', 'Can you → Could you → I was wondering if you could'],
        ['Giả định cho nhã', 'I would suggest… · Might I suggest…']
      ],
      note: 'Cơ chế chung: đẩy lời nói ra xa hiện tại thì người nghe thấy dễ từ chối hơn, nên câu bớt áp lực. Đây là lý do "I was wondering if you could…" lịch sự hơn "Can you…?" dù nghĩa như nhau.'
    },
    signals: ['I was wondering', 'Would you mind', 'Might I', 'I would suggest', 'Could you possibly'],
    useWhen: [
      'Nhờ việc lớn hoặc nhờ người không thân.',
      'Phản bác hoặc góp ý trong môi trường công việc.',
      'Đề xuất trong cuộc họp mà không muốn nghe áp đặt.',
      'Từ chối khéo: "I would rather not, if you don\'t mind."'
    ],
    useNot: [
      { what: 'Không lùi thì với bạn bè thân trong việc nhỏ.', why: 'Nói "I was wondering if you could pass the salt" với người nhà nghe kiểu cách và xa cách.' },
      { what: 'Không hiểu dạng lùi là nói về quá khứ.', why: '"I was hoping you could help" là đang hy vọng ngay bây giờ, không phải hồi xưa.' }
    ],
    confuse: [
      {
        with: 'lùi thì để lịch sự và lùi thì để kể quá khứ',
        tell: 'Nhìn ngữ cảnh: có mốc thời gian quá khứ thì là kể chuyện; không có mà đang nói với người đối diện thì là lịch sự.',
        pair: [
          { en: 'I was wondering if you could help me.', vi: 'Không biết bạn giúp tôi được không. (đang nhờ, lịch sự)' },
          { en: 'I was wondering about that all last week.', vi: 'Suốt tuần trước tôi cứ băn khoăn chuyện đó. (kể chuyện đã qua)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I want you to review this report.', right: 'I was hoping you could review this report.', why: 'Với đồng nghiệp hoặc cấp trên, "I want you to" nghe như ra lệnh; dạng lùi thì nhã hơn nhiều.' },
      { wrong: 'I was wondering if you can help me.', right: 'I was wondering if you could help me.', why: 'Đã lùi mệnh đề chính thì mệnh đề sau cũng lùi theo cho nhất quán.' }
    ],
    examples: [
      ['I was wondering if you could look at this draft.', 'Không biết anh xem giúp bản nháp này được không.', 1, 'Nhờ việc lớn, rất nhã.'],
      ['Might I suggest a different approach?', 'Tôi xin mạn phép đề xuất một hướng khác được không ạ?', 1, 'Góp ý trong họp, hạ giọng.'],
      ['I would rather not comment on that.', 'Tôi xin phép không bình luận về việc đó.', 1, 'Từ chối khéo.'],
      ['I was hoping we could reschedule.', 'Tôi đang mong là mình dời lịch được.', 1, 'Đang mong bây giờ, không phải hồi xưa.'],
      ['I want you to review this report by tonight.', 'Tôi muốn anh xem lại báo cáo này trước tối nay.', 0, 'Sai sắc thái với cấp trên: sửa thành "I was hoping you could review this report by tonight."'],
      ['I was wondering if you can join us.', 'Không biết bạn tham gia cùng được không.', 0, 'Sai: lùi thì phải nhất quán. Sửa thành "I was wondering if you could join us."']
    ],
    practice: [
      ['I ___ (was wondering / am wondering) if you could spare a few minutes.', 'was wondering', 'Không biết anh dành cho tôi vài phút được không.'],
      ['___ (Might / May) I suggest we postpone the decision?', 'Might', 'Tôi mạn phép đề xuất hoãn quyết định được không ạ?'],
      ['I was hoping you ___ (could / can) give me some feedback.', 'could', 'Tôi mong anh cho tôi vài nhận xét.'],
      ['___ (Would / Will) you mind if I opened the window?', 'Would', 'Tôi mở cửa sổ có phiền anh không?'],
      ['I ___ (would rather not / do not want to) discuss it now.', 'would rather not', 'Tôi xin phép chưa bàn chuyện đó lúc này.'],
      ['___ (Could / Can) you possibly send it by tomorrow?', 'Could', 'Anh gửi giúp trước ngày mai được không ạ?'],
      ['I ___ (wondered / wonder) whether you had considered another option.', 'wondered', 'Tôi không biết anh đã cân nhắc phương án khác chưa.'],
      ['We ___ (would suggest / suggest) reviewing the figures first.', 'would suggest', 'Chúng tôi xin đề xuất rà lại số liệu trước.'],
      ['___ (Would / Do) you happen to know his number?', 'Would', 'Anh có tình cờ biết số của anh ấy không ạ?'],
      ['I ___ (was hoping / hope) you might reconsider.', 'was hoping', 'Tôi đang mong anh xem xét lại.']
    ]
  },

  {
    slug: 'modal-idioms',
    en: 'Idiomatic modal expressions',
    vi: 'Cụm cố định với động từ khuyết thiếu',
    level: 'C2',
    summary: 'Một nhóm cụm không suy ra được từ nghĩa từng chữ. Dùng đúng thì câu văn lên hẳn, dùng sai thì lộ ngay.',
    formula: {
      rows: [
        ['cannot help + V-ing', 'không nhịn được: "I cannot help laughing."'],
        ['cannot but + V(trần)', 'không thể không, rất trang trọng'],
        ['would sooner + V(trần)', 'thà… còn hơn, như would rather'],
        ['had best + V(trần)', 'tốt nhất là, thân mật hơn had better']
      ],
      note: 'Thêm vài cụm hay gặp: "cannot be bothered to + V" (ngại làm), "may/might just" (biết đâu lại), "would not dream of + V-ing" (không đời nào). Cụm nào cũng có dạng cố định, không tự đổi giới từ hay thêm "to".'
    },
    signals: ['cannot help', 'cannot but', 'would sooner', 'had best', "wouldn't dream of"],
    useWhen: [
      'Văn viết trang trọng hoặc văn học: cannot but, would sooner.',
      'Lối nói thân mật: had best, cannot be bothered.',
      'Nhấn mạnh sự bác bỏ dứt khoát: would not dream of.'
    ],
    useNot: [
      { what: 'Không trộn hai cấu trúc "cannot help".', why: '"cannot help to laugh" sai; đúng là "cannot help laughing" hoặc "cannot help but laugh".' },
      { what: 'Không thêm "to" sau would sooner và had best.', why: 'Cả hai đi với động từ nguyên thể trần.' }
    ],
    confuse: [
      {
        with: 'cannot help + V-ing và cannot help but + V',
        tell: 'Hai dạng đều đúng và cùng nghĩa, nhưng dạng nào phải đi với dạng động từ nấy. Trộn lẫn là sai.',
        pair: [
          { en: 'I cannot help thinking he is right.', vi: 'Tôi cứ thấy là anh ấy đúng.' },
          { en: 'I cannot help but think he is right.', vi: 'Tôi không thể không nghĩ rằng anh ấy đúng.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I cannot help to worry about it.', right: 'I cannot help worrying about it.', why: 'Sau "cannot help" là V-ing; nếu muốn dùng nguyên thể thì phải có "but".' },
      { wrong: 'You had best to tell her the truth.', right: 'You had best tell her the truth.', why: 'Sau "had best" là động từ nguyên thể trần.' }
    ],
    examples: [
      ['I cannot help feeling that we have missed something.', 'Tôi cứ có cảm giác là chúng ta bỏ sót điều gì đó.', 1, '"cannot help" + V-ing.'],
      ['One cannot but admire her persistence.', 'Không thể không khâm phục sự kiên trì của cô ấy.', 1, 'Dạng rất trang trọng.'],
      ['I would sooner walk than wait for that bus.', 'Tôi thà đi bộ còn hơn đợi chuyến xe đó.', 1, '"would sooner" + động từ trần.'],
      ["You had best leave before the rain starts.", 'Tốt nhất bạn đi trước khi trời mưa.', 1, 'Thân mật, tương đương had better.'],
      ['I cannot help to worry about the results.', 'Tôi cứ lo về kết quả.', 0, 'Sai: sửa thành "I cannot help worrying about the results."'],
      ['You had best to tell her the truth.', 'Tốt nhất bạn nói thật với cô ấy.', 0, 'Sai: bỏ "to". Sửa thành "You had best tell her the truth."']
    ],
    practice: [
      ['I cannot help ___ (wondering / to wonder) why he left.', 'wondering', 'Tôi cứ băn khoăn không hiểu sao anh ấy đi.'],
      ['I cannot help but ___ (agree / agreeing) with you.', 'agree', 'Tôi không thể không đồng ý với bạn.'],
      ['She would sooner ___ (resign / to resign) than apologise.', 'resign', 'Cô ấy thà từ chức còn hơn xin lỗi.'],
      ['You had best ___ (check / to check) the details again.', 'check', 'Tốt nhất bạn kiểm tra lại chi tiết.'],
      ['I ___ (would not dream of / would not dream to) asking him for money.', 'would not dream of', 'Tôi không đời nào hỏi vay tiền anh ta.'],
      ['One cannot but ___ (conclude / concluding) that the policy failed.', 'conclude', 'Không thể không kết luận rằng chính sách đã thất bại.'],
      ['He cannot be bothered ___ (to cook / cooking) tonight.', 'to cook', 'Tối nay anh ấy ngại nấu ăn.'],
      ['We ___ (had best / had best to) set off early.', 'had best', 'Tốt nhất chúng ta khởi hành sớm.'],
      ['I cannot help ___ (laughing / to laugh) when he says that.', 'laughing', 'Cứ nghe anh ấy nói câu đó là tôi không nhịn được cười.'],
      ['They would sooner ___ (lose / losing) money than lose face.', 'lose', 'Họ thà mất tiền chứ không chịu mất mặt.']
    ]
  },

  {
    slug: 'unfulfilled-past',
    en: 'was to have done / would have been doing',
    vi: 'Việc đã dự định mà không thành',
    level: 'C2',
    summary: 'Hai cấu trúc nói về kế hoạch quá khứ đã đổ bể, hoặc về điều đang lẽ ra diễn ra ở một mốc nào đó. Sắc thái rất tinh và hay gặp trong văn kể.',
    formula: {
      rows: [
        ['was/were to have + V3', 'đã được sắp xếp nhưng KHÔNG xảy ra'],
        ['was/were to + V', 'đã được sắp xếp và thường là có xảy ra'],
        ['would have been + V-ing', 'lẽ ra đang làm gì đó tại mốc đó'],
        ['was going to + V', 'đã định làm nhưng đổi ý hoặc bị cản']
      ],
      note: 'So sánh cho rõ: "The concert was to take place on Friday" (theo kế hoạch là thứ Sáu, và có thể đã diễn ra) khác "The concert was to have taken place on Friday" (lẽ ra thứ Sáu, nhưng đã không diễn ra).'
    },
    signals: ['was to have', 'were to have', 'would have been', 'was going to', 'as it turned out'],
    useWhen: [
      'Kể lại một kế hoạch đã đổ bể.',
      'Nói điều lẽ ra đang diễn ra tại một thời điểm nếu mọi việc suôn sẻ.',
      'Văn kể chuyện và báo chí khi tường thuật sự cố.'
    ],
    useNot: [
      { what: 'Không dùng "was to have" khi việc đã diễn ra bình thường.', why: 'Cấu trúc này hàm ý thất bại; việc diễn ra suôn sẻ thì dùng "was to" hoặc quá khứ đơn.' },
      { what: 'Không rút gọn thành "was to had".', why: 'Luôn là "was to have + V3".' }
    ],
    confuse: [
      {
        with: 'was to và was to have',
        tell: 'Thêm "have" là báo hiệu việc đã KHÔNG xảy ra. Bỏ "have" thì trung tính.',
        pair: [
          { en: 'She was to start the job in May.', vi: 'Theo sắp xếp thì tháng Năm cô ấy nhận việc. (có thể đã nhận)' },
          { en: 'She was to have started the job in May.', vi: 'Lẽ ra tháng Năm cô ấy nhận việc. (nhưng đã không)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The match was to have played on Sunday.', right: 'The match was to have been played on Sunday.', why: 'Nghĩa bị động nên cần "been": trận đấu được đá, không tự đá.' },
      { wrong: 'We were to had left at dawn.', right: 'We were to have left at dawn.', why: 'Cấu trúc cố định là "were to have + V3".' }
    ],
    examples: [
      ['The ceremony was to have taken place last month.', 'Lẽ ra buổi lễ diễn ra từ tháng trước.', 1, 'Kế hoạch đã đổ bể.'],
      ['She was to start work in June, and she did.', 'Theo sắp xếp thì tháng Sáu cô ấy đi làm, và đúng là thế.', 1, 'Không có "have" nên trung tính.'],
      ['At that hour I would have been sitting on a plane.', 'Giờ đó lẽ ra tôi đang ngồi trên máy bay.', 1, 'Điều lẽ ra đang diễn ra.'],
      ['We were going to drive, but the car broke down.', 'Chúng tôi định lái xe đi nhưng xe hỏng.', 1, 'Định làm mà bị cản.'],
      ['The match was to have played on Sunday.', 'Lẽ ra trận đấu diễn ra vào Chủ nhật.', 0, 'Sai: cần bị động. Sửa thành "The match was to have been played on Sunday."'],
      ['We were to had left at dawn.', 'Lẽ ra chúng tôi đi từ tờ mờ sáng.', 0, 'Sai: sửa thành "We were to have left at dawn."']
    ],
    practice: [
      ['The exhibition ___ (was to have opened / was to opened) in March but was postponed.', 'was to have opened', 'Lẽ ra triển lãm khai mạc tháng Ba nhưng bị hoãn.'],
      ['He ___ (was to / was to have) chair the meeting, and he did so.', 'was to', 'Theo phân công anh ấy chủ trì cuộc họp, và anh ấy đã làm.'],
      ['At six I ___ (would have been / would be) teaching.', 'would have been', 'Sáu giờ lẽ ra tôi đang dạy học.'],
      ['They ___ (were going to / were to have) move house, but they changed their minds.', 'were going to', 'Họ định chuyển nhà nhưng lại đổi ý.'],
      ['The report ___ (was to have been / was to have) submitted last Friday.', 'was to have been', 'Lẽ ra báo cáo phải nộp thứ Sáu tuần trước.'],
      ['We ___ (were to have / were to had) met at noon.', 'were to have', 'Lẽ ra chúng tôi gặp nhau lúc trưa.'],
      ['She ___ (was to have flown / was to flown) to Paris but the flight was cancelled.', 'was to have flown', 'Lẽ ra cô ấy bay sang Paris nhưng chuyến bay bị huỷ.'],
      ['By then he ___ (would have been / would be) working there for a decade.', 'would have been', 'Đến lúc đó anh ấy sẽ làm ở đó được mười năm.'],
      ['The talks ___ (were to have resumed / were to resumed) in April.', 'were to have resumed', 'Lẽ ra cuộc đàm phán nối lại vào tháng Tư.'],
      ['I ___ (was going to / was to have) call you, but I lost your number.', 'was going to', 'Tôi định gọi cho bạn nhưng mất số mất rồi.']
    ]
  },

  {
    slug: 'modal-ellipsis',
    en: 'Ellipsis and substitution after modals',
    vi: 'Lược bỏ sau động từ khuyết thiếu',
    level: 'C2',
    summary: 'Bỏ bớt phần đã rõ để câu gọn và tự nhiên. Người học hay lặp lại nguyên cụm nên văn nói nghe cứng và thừa.',
    formula: {
      rows: [
        ['Bỏ hẳn động từ', '"Can you come?" — "I can."'],
        ['Giữ lại "to"', "\"Will you join us?\" — \"I'd like to.\""],
        ['Giữ "have" ở dạng hoàn thành', '"Has she left?" — "She might have."'],
        ['Giữ "be" ở bị động', '"Was it signed?" — "It should have been."']
      ],
      note: 'Quy tắc: giữ lại đúng phần chức năng gần nhất (to, have, been) rồi cắt phần còn lại. Cắt sai chỗ thì câu cụt nghĩa: "She might" nghe lửng khi câu hỏi ở thì hoàn thành.'
    },
    signals: ['I can', "I'd like to", 'might have', 'should have been', 'I hope so'],
    useWhen: [
      'Trả lời ngắn trong hội thoại để tránh lặp.',
      'Nối hai vế có cùng động từ: "She can swim but I can\'t."',
      'Văn viết gọn khi động từ đã nêu ở vế trước.'
    ],
    useNot: [
      { what: 'Không bỏ luôn "to" sau các động từ cần nó.', why: '"I would like" cụt nghĩa; phải giữ "to": "I would like to".' },
      { what: 'Không bỏ "have" khi câu ở dạng hoàn thành.', why: '"She might" không trả lời được câu hỏi "Has she left?"; phải là "She might have".' },
      { what: 'Không lặp lại nguyên cụm.', why: '"Can you come?" — "Yes, I can come to your house tonight" nghe thừa; "Yes, I can" là đủ.' }
    ],
    confuse: [
      {
        with: 'giữ "to" và bỏ hẳn',
        tell: 'Động từ khuyết thiếu thật thì bỏ hẳn; cụm cần "to" (want to, would like to, be going to) thì phải giữ "to".',
        pair: [
          { en: '"Will you help?" — "I will."', vi: '"Bạn giúp nhé?" — "Ừ." (khuyết thiếu thật, bỏ hẳn)' },
          { en: '"Will you help?" — "I want to."', vi: '"Bạn giúp nhé?" — "Tôi muốn lắm." (giữ "to")' }
        ]
      }
    ],
    errors: [
      { wrong: '"Have you finished?" — "I might."', right: '"Have you finished?" — "I might have."', why: 'Câu hỏi ở dạng hoàn thành nên phải giữ "have".' },
      { wrong: '"Are you coming?" — "I would like."', right: '"Are you coming?" — "I would like to."', why: '"would like" bắt buộc giữ "to" khi lược bỏ.' }
    ],
    examples: [
      ['"Can you drive?" — "Yes, I can."', '"Bạn lái xe được không?" — "Được."', 1, 'Khuyết thiếu thật nên bỏ hẳn động từ.'],
      ['"Will you come?" — "I would like to, but I am busy."', '"Bạn tới nhé?" — "Tôi muốn lắm nhưng bận mất rồi."', 1, 'Giữ lại "to".'],
      ['"Has he replied?" — "He should have by now."', '"Anh ấy trả lời chưa?" — "Đáng lẽ giờ này rồi."', 1, 'Giữ "have" ở dạng hoàn thành.'],
      ['She can speak Korean but her brother cannot.', 'Cô ấy nói được tiếng Hàn còn em trai thì không.', 1, 'Lược bỏ ở vế sau.'],
      ['"Have you finished the report?" — "I might."', '"Bạn xong báo cáo chưa?" — "Có thể rồi."', 0, 'Sai: sửa thành "I might have."'],
      ['"Are you joining us?" — "I would like."', '"Bạn tham gia cùng chứ?" — "Tôi muốn lắm."', 0, 'Sai: phải giữ "to". Sửa thành "I would like to."']
    ],
    practice: [
      ['"Can you help?" — "Yes, I ___ (can / can help)."', 'can', '"Bạn giúp được không?" — "Được."'],
      ['"Will you come?" — "I would love ___ (to / – )."', 'to', '"Bạn tới nhé?" — "Tôi rất muốn."'],
      ['"Has she left?" — "She may ___ (have / – )."', 'have', '"Cô ấy đi chưa?" — "Có thể rồi."'],
      ['"Was the form signed?" — "It should have ___ (been / – )."', 'been', '"Đơn ký chưa?" — "Đáng lẽ phải ký rồi."'],
      ['He can play the piano but I ___ (cannot / cannot play).', 'cannot', 'Anh ấy chơi piano được còn tôi thì không.'],
      ['"Did you finish it?" — "I meant ___ (to / – ), but I ran out of time."', 'to', '"Bạn làm xong chưa?" — "Tôi định làm nhưng hết giờ."'],
      ['"Are they coming?" — "They said they might ___ (– / have)."', '–', '"Họ có tới không?" — "Họ bảo có thể."'],
      ['"Have they been informed?" — "They must have ___ (been / – )."', 'been', '"Họ được báo chưa?" — "Chắc rồi."'],
      ['She will pass and so ___ (will / will pass) he.', 'will', 'Cô ấy sẽ đỗ và anh ấy cũng vậy.'],
      ['"Would you like to stay?" — "I would ___ (– / like), thank you."', 'like', '"Bạn ở lại nhé?" — "Vâng ạ, cảm ơn."']
    ]
  }
];

/** Điểm ngữ pháp — nhóm động từ khuyết thiếu bậc B2–C2. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'modal',
    level: p.level,
    summary: p.summary,
    formula_json: JSON.stringify(p.formula),
    signals_json: JSON.stringify(p.signals),
    use_when_json: JSON.stringify(p.useWhen),
    use_not_json: JSON.stringify(p.useNot),
    confuse_json: JSON.stringify(p.confuse),
    errors_json: JSON.stringify(p.errors),
    sort: i
  }));
}

/** Câu ví dụ và câu luyện tập, phẳng hoá, giữ slug để nối với điểm ngữ pháp. */
function examples() {
  const out = [];
  POINTS.forEach(p => {
    p.examples.forEach(([en, vi, ok, note], i) => {
      out.push({ slug: p.slug, kind: 'example', en, vi, ok, answer: null, note, sort: i });
    });
    p.practice.forEach(([en, answer, vi], i) => {
      out.push({ slug: p.slug, kind: 'practice', en, vi, ok: null, answer, note: null, sort: i });
    });
  });
  return out;
}

module.exports = { points, examples };
