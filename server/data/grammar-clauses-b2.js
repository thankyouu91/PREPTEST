/**
 * Ngữ pháp — nhóm MỆNH ĐỀ QUAN HỆ và MỆNH ĐỀ PHỤ, phần bậc B2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-clauses.js (bậc A2–B1). Hạn mức của nhóm là
 * 29 điểm; tệp kia đã dùng 9 điểm, tệp này dùng 8 điểm bậc B2. Còn 12 điểm
 * bậc C1–C2 tách thành mục riêng trong hàng đợi.
 *
 * Bậc A2–B1 lo phần dựng mệnh đề cho đúng: chọn đại từ, đặt dấu phẩy, bỏ được
 * đại từ ở đâu. Bậc B2 chuyển sang NÉN VÀ NỐI: rút gọn mệnh đề cho câu bớt
 * nặng, đưa giới từ lên trước cho trang trọng, dùng một chữ "which" thay cho
 * cả mệnh đề vừa nói, và gộp thông tin bằng "some of which", "most of whom".
 * Đây đúng là những cấu trúc giám khảo tìm khi chấm phần "độ đa dạng ngữ pháp"
 * của bài Viết.
 *
 * Bốn lỗi bậc này hay mắc, mỗi lỗi có một điểm riêng lo:
 *   · rút gọn nhầm mệnh đề tân ngữ ("The book read" thay vì "The book I read")
 *   · dùng "what" thay cho "which" khi nói về cả mệnh đề trước
 *   · sai trật tự sau "however" ("However he tried hard")
 *   · dùng "if" sau giới từ ("It depends on if…")
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'relative-reduced',
    en: 'Reduced relative clauses',
    vi: 'Rút gọn mệnh đề quan hệ — V-ing, V3, to-V',
    level: 'B2',
    summary: 'Bỏ đại từ quan hệ và động từ "be" đi cho câu nhẹ bớt. Chỉ rút gọn được khi đại từ quan hệ làm CHỦ NGỮ.',
    formula: {
      rows: [
        ['Chủ động → V-ing', 'The man who is standing there → The man STANDING there'],
        ['Bị động → V3', 'The book which was written in 1990 → The book WRITTEN in 1990'],
        ['Sau first, last, only, next → to-V', 'the first person who arrived → the first person TO ARRIVE'],
        ['Điều kiện', 'Chỉ rút gọn khi đại từ làm chủ ngữ. Làm tân ngữ thì không rút được.']
      ],
      note: 'Phép thử trước khi rút: ngay sau đại từ quan hệ có chủ ngữ mới chưa? Chưa có thì đại từ đang làm chủ ngữ, rút gọn được. Có rồi thì nó làm tân ngữ, rút gọn là hỏng nghĩa: "The book that I read" mà rút thành "The book read" là biến sang bị động, thành "cuốn sách được đọc".'
    },
    signals: ['danh từ + V-ing', 'danh từ + V3', 'the first / only / last + to-V'],
    useWhen: [
      'Bài Viết: gộp câu cho gọn, tránh lặp "who is", "which was" nhiều lần.',
      'Biển báo và thông báo: "Passengers travelling to Hue must change at Da Nang."',
      'Sau first, last, only, next, và sau so sánh nhất: "the only one to notice".'
    ],
    useNot: [
      { what: 'Không rút gọn khi đại từ quan hệ làm tân ngữ.', why: '"The book that I read" rút thành "The book read" là đổi hẳn nghĩa sang bị động. Giữ nguyên hoặc chỉ bỏ mỗi "that": "The book I read".' },
      { what: 'Không rút gọn mệnh đề không xác định thành V-ing khi câu dễ hiểu nhầm.', why: 'Câu càng dài thì cụm V-ing càng dễ bị hiểu là bổ nghĩa cho danh từ đứng gần nhất chứ không phải danh từ mình định nói.' }
    ],
    confuse: [
      {
        with: 'V-ing khác V3 khi rút gọn',
        tell: 'Danh từ tự làm việc đó thì V-ing; danh từ bị làm gì đó thì V3.',
        pair: [
          { en: 'The man standing at the door is my teacher.', vi: 'Người đàn ông đang đứng ở cửa là thầy tôi (ông ấy tự đứng).' },
          { en: 'The letters sent last week have not arrived.', vi: 'Những lá thư gửi đi tuần trước vẫn chưa tới (thư bị gửi).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The book read last week was excellent.', right: 'The book I read last week was excellent.', why: 'Đại từ làm tân ngữ nên không rút gọn được; rút rồi thì câu thành "cuốn sách được đọc".' },
      { wrong: 'The man stands at the door is my teacher.', right: 'The man standing at the door is my teacher.', why: 'Rút gọn thì dùng V-ing, không dùng động từ đã chia.' }
    ],
    examples: [
      ['The man standing at the door is my teacher.', 'Người đàn ông đang đứng ở cửa là thầy tôi.', 1, 'Rút từ "the man who is standing"; đại từ làm chủ ngữ nên rút được.'],
      ['The book written in 1990 is still popular.', 'Cuốn sách viết năm 1990 tới giờ vẫn được ưa chuộng.', 1, 'Rút từ "the book which was written"; nghĩa bị động nên dùng V3.'],
      ['She was the first person to arrive at the office.', 'Cô ấy là người đầu tiên tới văn phòng.', 1, 'Sau "the first person" thì rút thành "to + V".'],
      ['Passengers travelling to Hue must change at Da Nang.', 'Hành khách đi Huế phải đổi tàu ở Đà Nẵng.', 1, 'Văn thông báo rất chuộng lối rút gọn này cho ngắn.'],
      ['The book read last week was excellent.', 'Cuốn sách tôi đọc tuần trước rất hay.', 0, 'Sai: sửa thành "The book I read last week was excellent."'],
      ['The man stands at the door is my teacher.', 'Người đàn ông đang đứng ở cửa là thầy tôi.', 0, 'Sai: sửa thành "The man standing at the door is my teacher."']
    ],
    practice: [
      ['The man ___ (standing / stands) at the door is my teacher.', 'standing', 'Người đàn ông đang đứng ở cửa là thầy tôi.'],
      ['The book ___ (written / wrote) in 1990 is still popular.', 'written', 'Cuốn sách viết năm 1990 vẫn được ưa chuộng.'],
      ['She was the first person ___ (to arrive / arriving) at the office.', 'to arrive', 'Cô ấy là người đầu tiên tới văn phòng.'],
      ['Anyone ___ (wanting / wants) a ticket should queue here.', 'wanting', 'Ai muốn mua vé thì xếp hàng ở đây.'],
      ['The letters ___ (sent / sending) last week have not arrived.', 'sent', 'Những lá thư gửi đi tuần trước vẫn chưa tới.'],
      ['You can reduce a relative clause only when the pronoun is the ___ (subject / object).', 'subject', 'Chỉ rút gọn được khi đại từ quan hệ làm chủ ngữ.'],
      ['The boy ___ (playing / played) football is my cousin.', 'playing', 'Cậu bé đang đá bóng là em họ tôi.'],
      ['He was the only one ___ (to notice / noticing) the mistake.', 'to notice', 'Anh ấy là người duy nhất nhận ra lỗi đó.'],
      ['The money ___ (stolen / stealing) from the safe was never found.', 'stolen', 'Số tiền bị lấy khỏi két không bao giờ tìm lại được.'],
      ['Passengers ___ (travelling / travelled) to Hue must change at Da Nang.', 'travelling', 'Hành khách đi Huế phải đổi tàu ở Đà Nẵng.']
    ]
  },

  {
    slug: 'relative-preposition',
    en: 'Prepositions with which and whom',
    vi: 'Giới từ đứng trước đại từ quan hệ — in which, to whom',
    level: 'B2',
    summary: 'Hai cách viết cùng một ý: đưa giới từ lên trước cho trang trọng, hoặc để nó ở cuối cho tự nhiên. Đưa lên trước thì bắt buộc dùng "which" hoặc "whom".',
    formula: {
      rows: [
        ['Trang trọng', 'the man TO WHOM I spoke / the house IN WHICH I live'],
        ['Đời thường', 'the man I spoke TO / the house I live IN'],
        ['Sau giới từ chỉ dùng', 'which cho vật, whom cho người — không dùng "that", không dùng "who".'],
        ['Không lặp giới từ', 'Đưa lên trước rồi thì bỏ ở cuối: KHÔNG viết "in which I live in".']
      ],
      note: 'Đây là cặp đôi văn phong chứ không phải đúng sai: bài luận và thư công việc dùng bản trang trọng, còn nói chuyện thì bản để giới từ ở cuối tự nhiên hơn nhiều. Nhớ một điều: hễ giới từ đã lên trước thì "that" và "who" đều không dùng được nữa.'
    },
    signals: ['in which', 'to whom', 'for which', 'with whom', 'about which'],
    useWhen: [
      'Bài Viết học thuật và thư từ công việc: bản có giới từ đứng trước nghe chỉn chu hơn.',
      'Khi câu dài, đưa giới từ lên trước giúp người đọc bám mạch dễ hơn.',
      'Văn nói và email thân mật: cứ để giới từ ở cuối cho tự nhiên.'
    ],
    useNot: [
      { what: 'Không dùng "that" ngay sau giới từ.', why: '"the house in that I live" sai. Sau giới từ chỉ có "which" cho vật và "whom" cho người.' },
      { what: 'Không dùng "who" ngay sau giới từ.', why: '"the man to who I spoke" sai. Ở vị trí này bắt buộc là "whom".' }
    ],
    confuse: [
      {
        with: 'bản trang trọng khác bản đời thường',
        tell: 'Giới từ đứng trước thì phải có "whom" hoặc "which". Giới từ ở cuối thì bỏ hẳn đại từ cũng được.',
        pair: [
          { en: 'This is the colleague with whom I share an office.', vi: 'Đây là đồng nghiệp tôi dùng chung phòng làm việc (trang trọng).' },
          { en: 'This is the colleague I share an office with.', vi: 'Đây là đồng nghiệp tôi dùng chung phòng làm việc (đời thường).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The house in that I grew up has been sold.', right: 'The house in which I grew up has been sold.', why: 'Sau giới từ không dùng "that".' },
      { wrong: 'This is the man to who I spoke yesterday.', right: 'This is the man to whom I spoke yesterday.', why: 'Sau giới từ dùng "whom", không dùng "who".' }
    ],
    examples: [
      ['This is the man to whom I spoke yesterday.', 'Đây là người tôi đã nói chuyện hôm qua.', 1, 'Bản trang trọng: giới từ lên trước thì đi với "whom".'],
      ['This is the man I spoke to yesterday.', 'Đây là người tôi đã nói chuyện hôm qua.', 1, 'Bản đời thường: giới từ ở cuối, bỏ luôn đại từ.'],
      ['The house in which I grew up has been sold.', 'Ngôi nhà tôi lớn lên đã bị bán.', 1, '"in which" cho vật, hay gặp trong văn viết.'],
      ['The company for which she works is in Da Nang.', 'Công ty cô ấy làm việc nằm ở Đà Nẵng.', 1, 'Bản đời thường là "the company she works for".'],
      ['The house in that I grew up has been sold.', 'Ngôi nhà tôi lớn lên đã bị bán.', 0, 'Sai: sửa thành "The house in which I grew up has been sold."'],
      ['This is the man to who I spoke yesterday.', 'Đây là người tôi đã nói chuyện hôm qua.', 0, 'Sai: sửa thành "This is the man to whom I spoke yesterday."']
    ],
    practice: [
      ['This is the man ___ (to whom / to who) I spoke yesterday.', 'to whom', 'Đây là người tôi đã nói chuyện hôm qua.'],
      ['The house ___ (in which / in that) I grew up has been sold.', 'in which', 'Ngôi nhà tôi lớn lên đã bị bán.'],
      ['That is the colleague ___ (with whom / with who) I share an office.', 'with whom', 'Kia là đồng nghiệp tôi dùng chung phòng làm việc.'],
      ['After a preposition you must use ___ (whom / who) for people.', 'whom', 'Sau giới từ thì dùng "whom" cho người.'],
      ['The company ___ (for which / for that) she works is in Da Nang.', 'for which', 'Công ty cô ấy làm việc nằm ở Đà Nẵng.'],
      ['The person ___ (I spoke to / I spoke to whom) was very helpful.', 'I spoke to', 'Người tôi nói chuyện cùng rất nhiệt tình.'],
      ['This is the tool ___ (with which / with that) the lock was opened.', 'with which', 'Đây là dụng cụ dùng để cạy ổ khoá.'],
      ['The topic ___ (about which / about that) he wrote is complex.', 'about which', 'Chủ đề anh ấy viết khá phức tạp.'],
      ['The informal version is "the man ___ (I spoke to / to whom I spoke)".', 'I spoke to', 'Bản đời thường là "the man I spoke to".'],
      ['The friend ___ (on whom / on who) I depend lives abroad.', 'on whom', 'Người bạn tôi trông cậy đang sống ở nước ngoài.']
    ]
  },

  {
    slug: 'relative-quantifier',
    en: 'Quantifiers with which and whom',
    vi: 'Lượng từ trong mệnh đề quan hệ — some of which, most of whom',
    level: 'B2',
    summary: 'Gộp một câu nói về "một phần trong số đó" vào câu chính. Mẫu cố định: lượng từ + of + which / whom, và luôn có dấu phẩy.',
    formula: {
      rows: [
        ['Người', 'all / most / some / none / half OF WHOM: three sisters, all of WHOM are doctors'],
        ['Vật', 'all / most / some / none / each OF WHICH: ten books, most of WHICH were bestsellers'],
        ['Luôn không xác định', 'Mẫu này chỉ dùng trong mệnh đề không xác định, luôn có dấu phẩy.'],
        ['Cả số đếm', 'four offices, TWO OF WHICH are abroad']
      ],
      note: 'Không được thay bằng "them" hay "us": "He has three sisters, all of them are doctors" là lỗi nối hai câu bằng dấu phẩy. Muốn giữ "them" thì phải tách hẳn thành hai câu hoặc dùng dấu chấm phẩy. Đây là cấu trúc nén thông tin rất được điểm trong bài Viết.'
    },
    signals: ['all of whom', 'most of which', 'some of whom', 'none of which', 'two of which'],
    useWhen: [
      'Bài Viết: gộp số liệu và tỉ lệ vào một câu thay vì viết hai câu rời.',
      'Mô tả một nhóm rồi nói ngay về một phần của nhóm ấy.',
      'Văn học thuật khi trình bày mẫu khảo sát: "30 applicants, none of whom was suitable".'
    ],
    useNot: [
      { what: 'Không dùng "who" hay "that" sau "of".', why: '"all of who" và "most of that" đều sai. Chỉ có "of whom" cho người và "of which" cho vật.' },
      { what: 'Không dùng "them" thay cho "whom".', why: '"He has three sisters, all of them are doctors" là nối hai câu bằng dấu phẩy. Sửa thành "all of whom are doctors".' }
    ],
    confuse: [
      {
        with: '"of whom" khác "of which"',
        tell: 'Nhóm được nhắc tới là người thì "of whom"; là vật thì "of which".',
        pair: [
          { en: 'He has three sisters, all of whom are doctors.', vi: 'Anh ấy có ba chị em gái, cả ba đều là bác sĩ.' },
          { en: 'She wrote ten books, most of which were bestsellers.', vi: 'Bà viết mười cuốn sách, phần lớn đều bán chạy.' }
        ]
      }
    ],
    errors: [
      { wrong: 'He has three sisters, all of who are doctors.', right: 'He has three sisters, all of whom are doctors.', why: 'Sau "of" dùng "whom", không dùng "who".' },
      { wrong: 'She wrote ten books, most of them were bestsellers.', right: 'She wrote ten books, most of which were bestsellers.', why: 'Dùng "them" là nối hai câu bằng dấu phẩy; phải là "most of which".' }
    ],
    examples: [
      ['He has three sisters, all of whom are doctors.', 'Anh ấy có ba chị em gái, cả ba đều là bác sĩ.', 1, 'Nhóm là người nên dùng "of whom".'],
      ['She wrote ten books, most of which were bestsellers.', 'Bà viết mười cuốn sách, phần lớn đều bán chạy.', 1, 'Nhóm là vật nên dùng "of which".'],
      ['There were thirty applicants, none of whom was suitable.', 'Có ba mươi người nộp đơn, không ai phù hợp.', 1, 'Nén cả một câu thống kê vào mệnh đề quan hệ.'],
      ['The company has four offices, two of which are abroad.', 'Công ty có bốn văn phòng, hai trong số đó ở nước ngoài.', 1, 'Số đếm cũng dùng được mẫu này.'],
      ['He has three sisters, all of who are doctors.', 'Anh ấy có ba chị em gái, cả ba đều là bác sĩ.', 0, 'Sai: sửa thành "He has three sisters, all of whom are doctors."'],
      ['She wrote ten books, most of them were bestsellers.', 'Bà viết mười cuốn sách, phần lớn đều bán chạy.', 0, 'Sai: sửa thành "She wrote ten books, most of which were bestsellers."']
    ],
    practice: [
      ['He has three sisters, all of ___ (whom / who) are doctors.', 'whom', 'Anh ấy có ba chị em gái, cả ba đều là bác sĩ.'],
      ['She wrote ten books, most of ___ (which / that) were bestsellers.', 'which', 'Bà viết mười cuốn sách, phần lớn đều bán chạy.'],
      ['There were thirty applicants, none of ___ (whom / them) was suitable.', 'whom', 'Có ba mươi người nộp đơn, không ai phù hợp.'],
      ['The company has four offices, two of ___ (which / that) are abroad.', 'which', 'Công ty có bốn văn phòng, hai trong số đó ở nước ngoài.'],
      ['I met several teachers, some of ___ (whom / who) I already knew.', 'whom', 'Tôi gặp mấy thầy cô, trong đó có vài người tôi đã quen.'],
      ['He made three points, the last of ___ (which / what) was the strongest.', 'which', 'Ông ấy nêu ba luận điểm, luận điểm cuối là mạnh nhất.'],
      ['This pattern is always used in a ___ (non-defining / defining) clause.', 'non-defining', 'Mẫu này chỉ dùng trong mệnh đề không xác định.'],
      ['They had two problems, both of ___ (which / whom) were serious.', 'which', 'Họ gặp hai vấn đề, cả hai đều nghiêm trọng.'],
      ['We interviewed ten candidates, half of ___ (whom / which) had no experience.', 'whom', 'Chúng tôi phỏng vấn mười ứng viên, một nửa chưa có kinh nghiệm.'],
      ['The report had five sections, each of ___ (which / that) took a week.', 'which', 'Báo cáo có năm phần, mỗi phần mất một tuần.']
    ]
  },

  {
    slug: 'relative-which-clause',
    en: 'which referring to a whole clause',
    vi: '"which" thay cho cả mệnh đề đứng trước',
    level: 'B2',
    summary: 'Không bổ nghĩa cho một danh từ nào mà cho TOÀN BỘ điều vừa nói. Luôn có dấu phẩy đứng trước, và tuyệt đối không thay bằng "what".',
    formula: {
      rows: [
        ['Mẫu chuẩn', 'MỆNH ĐỀ + , which + nhận xét: He failed the exam, WHICH surprised everyone.'],
        ['"which" trỏ vào cả việc', 'Không phải "the exam" ngạc nhiên mà "việc anh ấy trượt" mới ngạc nhiên.'],
        ['Bắt buộc có phẩy', 'Không phẩy thì "which" quay sang bổ nghĩa cho danh từ gần nhất, sai nghĩa.'],
        ['Cấm dùng "what"', 'He failed the exam, WHAT surprised everyone. → sai.']
      ],
      note: 'Vì sao không dùng "what": "what" đã mang sẵn nghĩa "điều mà", tự nó là một cụm danh từ đứng độc lập, nên không nối vào câu trước được. Còn "which" là đại từ quan hệ, phải có cái gì đó ở trước để trỏ vào — ở đây nó trỏ vào cả mệnh đề.'
    },
    signals: ['dấu phẩy rồi tới which', 'which + động từ nhận xét', 'which means', 'which made'],
    useWhen: [
      'Thêm một lời bình vào việc vừa kể mà không phải mở câu mới.',
      'Bài Viết: nối hai ý thành câu nhiều vế, ăn điểm độ đa dạng ngữ pháp.',
      'Nêu hệ quả: "The train was late, which meant we missed the meeting."'
    ],
    useNot: [
      { what: 'Không dùng "what" ở vị trí này.', why: '"He failed the exam, what surprised everyone" sai. "what" không nối vào mệnh đề trước được; phải là "which".' },
      { what: 'Không bỏ dấu phẩy.', why: 'Bỏ phẩy thì "which" quay sang bổ nghĩa cho danh từ gần nhất: "He failed the exam which surprised everyone" thành "bài thi làm mọi người ngạc nhiên".' }
    ],
    confuse: [
      {
        with: 'có phẩy khác không phẩy',
        tell: 'Có phẩy thì "which" trỏ vào cả việc vừa kể. Không phẩy thì nó chỉ trỏ vào danh từ ngay trước.',
        pair: [
          { en: 'He failed the exam, which surprised everyone.', vi: 'Anh ấy trượt kỳ thi, chuyện đó làm mọi người ngạc nhiên (cả việc trượt).' },
          { en: 'He failed the exam which surprised everyone.', vi: 'Anh ấy trượt cái kỳ thi từng làm mọi người ngạc nhiên (bổ nghĩa cho kỳ thi).' }
        ]
      }
    ],
    errors: [
      { wrong: 'He failed the exam, what surprised everyone.', right: 'He failed the exam, which surprised everyone.', why: 'Trỏ vào cả mệnh đề thì dùng "which", không dùng "what".' },
      { wrong: 'She arrived on time which was unusual for her.', right: 'She arrived on time, which was unusual for her.', why: 'Thiếu dấu phẩy nên "which" hiểu nhầm thành bổ nghĩa cho "time".' }
    ],
    examples: [
      ['He failed the exam, which surprised everyone.', 'Anh ấy trượt kỳ thi, chuyện đó làm mọi người ngạc nhiên.', 1, '"which" trỏ vào cả việc anh ấy trượt, không phải vào "the exam".'],
      ['The train was late, which meant we missed the meeting.', 'Tàu tới muộn, nghĩa là chúng tôi lỡ cuộc họp.', 1, 'Nêu hệ quả của cả sự việc vừa kể.'],
      ['She arrived on time, which was unusual for her.', 'Cô ấy tới đúng giờ, chuyện hiếm thấy ở cô ấy.', 1, 'Dấu phẩy là bắt buộc, không có thì sai nghĩa.'],
      ['He never apologised, which made things worse.', 'Anh ta không hề xin lỗi, điều đó làm mọi chuyện tệ hơn.', 1, 'Lối nối này giúp câu có nhiều vế mà vẫn mạch lạc.'],
      ['He failed the exam, what surprised everyone.', 'Anh ấy trượt kỳ thi, chuyện đó làm mọi người ngạc nhiên.', 0, 'Sai: sửa thành "He failed the exam, which surprised everyone."'],
      ['She arrived on time which was unusual for her.', 'Cô ấy tới đúng giờ, chuyện hiếm thấy ở cô ấy.', 0, 'Sai: thiếu dấu phẩy, sửa thành "She arrived on time, which was unusual for her."']
    ],
    practice: [
      ['He failed the exam, ___ (which / what) surprised everyone.', 'which', 'Anh ấy trượt kỳ thi, chuyện đó làm mọi người ngạc nhiên.'],
      ['She arrived on time, ___ (which / that) was unusual for her.', 'which', 'Cô ấy tới đúng giờ, chuyện hiếm thấy ở cô ấy.'],
      ['They cancelled the trip, ___ (which / what) upset the children.', 'which', 'Họ huỷ chuyến đi, làm bọn trẻ buồn.'],
      ['This use of "which" always needs a ___ (comma / question mark) before it.', 'comma', 'Cách dùng "which" này luôn cần một dấu phẩy đứng trước.'],
      ['He never apologised, ___ (which / who) made things worse.', 'which', 'Anh ta không hề xin lỗi, điều đó làm mọi chuyện tệ hơn.'],
      ['The train was late, ___ (which / what) meant we missed the meeting.', 'which', 'Tàu tới muộn, nghĩa là chúng tôi lỡ cuộc họp.'],
      ['Here "which" refers to ___ (the whole clause / one noun).', 'the whole clause', 'Ở đây "which" trỏ vào cả mệnh đề chứ không phải một danh từ.'],
      ['She spoke Vietnamese fluently, ___ (which / that) impressed us all.', 'which', 'Cô ấy nói tiếng Việt trôi chảy, khiến ai cũng nể.'],
      ['They raised the price, ___ (which / what) I thought was unfair.', 'which', 'Họ tăng giá, tôi thấy như vậy là không công bằng.'],
      ['He forgot her birthday, ___ (which / who) she never forgave.', 'which', 'Anh ta quên sinh nhật cô ấy, chuyện cô ấy không bao giờ tha thứ.']
    ]
  },

  {
    slug: 'adverbial-contrast',
    en: 'Contrast clauses: whereas, while',
    vi: 'Mệnh đề đối chiếu — whereas, while',
    level: 'B2',
    summary: 'Đặt hai sự việc cạnh nhau để so. Khác "although" ở chỗ: đối chiếu chỉ nêu hai bên khác nhau, còn nhượng bộ là chuyện trái với dự đoán.',
    formula: {
      rows: [
        ['Đối chiếu hai bên', 'whereas: Tom is tall, WHEREAS his brother is short.'],
        ['"while" cũng đối chiếu được', 'WHILE some students prefer group work, others work better alone.'],
        ['Nhượng bộ thì khác', 'although: ALTHOUGH it was raining, we went out. (trái với dự đoán)'],
        ['Vị trí', 'Đứng đầu câu thì có dấu phẩy ngăn hai vế; đứng giữa thì thường cũng có phẩy.']
      ],
      note: 'Phép thử phân biệt: hai vế có mâu thuẫn với nhau không? Không mâu thuẫn, chỉ khác nhau thì dùng "whereas" — cao với thấp, tăng với giảm. Vế sau đi ngược lại điều người đọc chờ đợi thì dùng "although". Riêng "while" mang cả hai nghĩa thời gian lẫn đối chiếu, phải nhìn ngữ cảnh mới biết.'
    },
    signals: ['whereas', 'while', 'in contrast', 'so sánh hai bên'],
    useWhen: [
      'Bài Viết dạng so sánh hai quan điểm, hai nhóm số liệu, hai vùng miền.',
      'Mô tả biểu đồ: "Sales rose in Ha Noi, whereas they fell in Hue."',
      'Văn học thuật: "whereas" trang trọng hơn "but" nhiều.'
    ],
    useNot: [
      { what: 'Không dùng "whereas" khi ý là trái với dự đoán.', why: '"Whereas it was raining, we went out" nghe lạ. Chuyện trái khoáy thì dùng "although".' },
      { what: 'Không dùng "whereas" nối hai vế không cùng loại thông tin.', why: 'Đối chiếu chỉ có nghĩa khi hai vế so được với nhau: cùng nói về chiều cao, cùng nói về doanh số. So cọc cạch thì câu vô nghĩa.' }
    ],
    confuse: [
      {
        with: '"whereas" khác "although"',
        tell: '"whereas" là hai bên khác nhau, cân nhau. "although" là vế sau đi ngược điều người ta chờ đợi.',
        pair: [
          { en: 'Tom is tall, whereas his brother is short.', vi: 'Tom cao, còn em trai cậu ấy thì thấp (chỉ là khác nhau).' },
          { en: 'Although it was raining, we went out.', vi: 'Dù trời mưa, chúng tôi vẫn ra ngoài (trái với dự đoán).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Whereas it was raining, we went out.', right: 'Although it was raining, we went out.', why: 'Ý ở đây là trái với dự đoán nên phải dùng "although".' },
      { wrong: 'Tom is tall, although his brother is short.', right: 'Tom is tall, whereas his brother is short.', why: 'Hai vế chỉ khác nhau chứ không mâu thuẫn, nên dùng "whereas".' }
    ],
    examples: [
      ['Tom is tall, whereas his brother is short.', 'Tom cao, còn em trai cậu ấy thì thấp.', 1, 'Đối chiếu thuần tuý: hai bên khác nhau, không bên nào bất ngờ.'],
      ['Sales rose in Ha Noi, whereas they fell in Hue.', 'Doanh số tăng ở Hà Nội, còn ở Huế thì giảm.', 1, 'Mẫu câu chuẩn khi mô tả biểu đồ trong bài Viết.'],
      ['While some students prefer group work, others work better alone.', 'Trong khi một số sinh viên thích làm nhóm, số khác làm một mình lại tốt hơn.', 1, '"while" ở đây là đối chiếu chứ không phải thời gian.'],
      ['Although it was raining, we went out.', 'Dù trời mưa, chúng tôi vẫn ra ngoài.', 1, 'Đối chiếu lại cho rõ: chỗ này là nhượng bộ nên phải dùng "although".'],
      ['Whereas it was raining, we went out.', 'Dù trời mưa, chúng tôi vẫn ra ngoài.', 0, 'Sai: sửa thành "Although it was raining, we went out."'],
      ['Tom is tall, although his brother is short.', 'Tom cao, còn em trai cậu ấy thì thấp.', 0, 'Sai: hai vế chỉ khác nhau, sửa thành "Tom is tall, whereas his brother is short."']
    ],
    practice: [
      ['Tom is tall, ___ (whereas / although) his brother is short.', 'whereas', 'Tom cao, còn em trai cậu ấy thì thấp.'],
      ['___ (Although / Whereas) it was raining, we went out.', 'Although', 'Dù trời mưa, chúng tôi vẫn ra ngoài.'],
      ['Sales rose in Ha Noi, ___ (whereas / because) they fell in Hue.', 'whereas', 'Doanh số tăng ở Hà Nội, còn ở Huế thì giảm.'],
      ['"Whereas" shows a ___ (contrast / reason) between two facts.', 'contrast', 'Từ "whereas" nêu sự đối chiếu giữa hai sự việc.'],
      ['She prefers tea, ___ (while / until) her husband prefers coffee.', 'while', 'Cô ấy thích trà, còn chồng thì thích cà phê.'],
      ['The first group finished early, ___ (whereas / so) the second needed more time.', 'whereas', 'Nhóm đầu xong sớm, còn nhóm hai cần thêm thời gian.'],
      ['Use ___ (although / whereas) when the result is unexpected.', 'although', 'Dùng "although" khi kết quả đi ngược điều người ta chờ đợi.'],
      ['Northern winters are cold, ___ (whereas / therefore) southern ones are mild.', 'whereas', 'Mùa đông miền Bắc lạnh, còn miền Nam thì dịu.'],
      ['He earns very little, ___ (whereas / despite) his brother earns a fortune.', 'whereas', 'Anh ấy kiếm được rất ít, còn anh trai thì kiếm bộn.'],
      ['___ (While / Until) some students prefer group work, others work better alone.', 'While', 'Trong khi một số sinh viên thích làm nhóm, số khác làm một mình lại tốt hơn.']
    ]
  },

  {
    slug: 'adverbial-manner',
    en: 'Manner clauses: as if, as though',
    vi: 'Mệnh đề chỉ cách thức — as if, as though',
    level: 'B2',
    summary: 'Nói "cứ như là". Điểm tinh: chuyện có thể có thật thì chia thì bình thường, chuyện không có thật thì lùi thì như câu điều kiện loại 2.',
    formula: {
      rows: [
        ['Có thể có thật', 'as if + thì thường: It looks AS IF it is going to rain.'],
        ['Không có thật', 'as if + lùi thì: He talks AS IF he KNEW everything. (thật ra không biết)'],
        ['Với "be" thì dùng "were"', 'She behaves as if she WERE the manager.'],
        ['Chuyện trước đó', 'as though + quá khứ hoàn thành: She acted AS THOUGH nothing HAD HAPPENED.'],
        ['"like" là bản thân mật', 'He talks like he knows everything. — nói được, viết trang trọng thì không.']
      ],
      note: '"as if" và "as though" giống hệt nhau về nghĩa, chỉ khác chút ở chỗ "as though" nghe hơi trang trọng hơn. Cơ chế lùi thì ở đây đúng bằng cơ chế của câu điều kiện loại 2: lùi một thì để đánh dấu "chuyện này không thật".'
    },
    signals: ['as if', 'as though', 'looks as if', 'sounds as though', 'cứ như là'],
    useWhen: [
      'Tả vẻ ngoài, dáng điệu, cảm giác: "You look as if you have seen a ghost."',
      'Nhận xét về thái độ của người khác, thường mang ý mỉa: "as if he owned the place".',
      'Dự đoán từ dấu hiệu quan sát được: "It looks as though it will rain."'
    ],
    useNot: [
      { what: 'Không dùng "like" làm liên từ trong văn viết trang trọng.', why: '"He talks like he knows everything" nghe được khi nói chuyện nhưng bài Viết thì dùng "as if".' },
      { what: 'Không dùng "as" một mình thay cho "as if".', why: '"He talks as he knows everything" đổi hẳn nghĩa thành "anh ấy nói trong lúc anh ấy biết". Phải đủ "as if".' }
    ],
    confuse: [
      {
        with: 'chuyện có thật khác chuyện không có thật',
        tell: 'Chia thì bình thường là mình để ngỏ khả năng có thật. Lùi một thì là mình khẳng định không thật.',
        pair: [
          { en: 'It looks as if it is going to rain.', vi: 'Trông như sắp mưa (rất có thể mưa thật).' },
          { en: 'He talks as if he knew everything.', vi: 'Anh ta nói cứ như biết tuốt (thật ra không biết).' }
        ]
      }
    ],
    errors: [
      { wrong: 'He walked in as if he owns the place.', right: 'He walked in as if he owned the place.', why: 'Anh ta không sở hữu chỗ đó nên phải lùi thì để đánh dấu chuyện không thật.' },
      { wrong: 'He talks as he knows everything.', right: 'He talks as if he knows everything.', why: 'Thiếu "if" thì câu đổi nghĩa hẳn.' }
    ],
    examples: [
      ['It looks as if it is going to rain.', 'Trông như sắp mưa.', 1, 'Chuyện có thể có thật nên chia thì bình thường.'],
      ['He talks as if he knew everything.', 'Anh ta nói cứ như biết tuốt.', 1, 'Lùi thì để đánh dấu chuyện không thật — cùng cơ chế với điều kiện loại 2.'],
      ['She behaves as if she were the manager.', 'Cô ta cư xử cứ như mình là quản lý.', 1, 'Với "be" thì dạng chuẩn của lối nói không thật là "were".'],
      ['She acted as though nothing had happened.', 'Cô ấy làm như chưa có chuyện gì xảy ra.', 1, 'Chuyện xảy ra trước đó thì dùng quá khứ hoàn thành.'],
      ['He walked in as if he owns the place.', 'Anh ta bước vào cứ như chủ ở đây.', 0, 'Sai: sửa thành "He walked in as if he owned the place."'],
      ['He talks as he knows everything.', 'Anh ta nói cứ như biết tuốt.', 0, 'Sai: thiếu "if", sửa thành "He talks as if he knows everything."']
    ],
    practice: [
      ['He talks ___ (as if / as) he knows everything.', 'as if', 'Anh ta nói cứ như biết tuốt.'],
      ['She behaves as if she ___ (were / is) the manager, but she is not.', 'were', 'Cô ta cư xử cứ như mình là quản lý, mà thật ra không phải.'],
      ['It looks ___ (as though / as) it is going to rain.', 'as though', 'Trông như sắp mưa.'],
      ['He spoke to me as if I ___ (were / am) a child.', 'were', 'Anh ta nói với tôi cứ như tôi là trẻ con.'],
      ['In formal writing, avoid ___ (like / as if) as a conjunction.', 'like', 'Trong văn viết trang trọng thì tránh dùng "like" làm liên từ.'],
      ['You look ___ (as if / like as) you have seen a ghost.', 'as if', 'Trông cậu như vừa thấy ma vậy.'],
      ['She acted as though nothing ___ (had happened / has happened).', 'had happened', 'Cô ấy làm như chưa có chuyện gì xảy ra.'],
      ['The house looks ___ (as if / as) nobody has lived here for years.', 'as if', 'Ngôi nhà trông như đã nhiều năm không ai ở.'],
      ['Use the past form after "as if" when the situation is ___ (unreal / certain).', 'unreal', 'Dùng thì quá khứ sau "as if" khi tình huống là không có thật.'],
      ['He walked in as if he ___ (owned / owns) the place.', 'owned', 'Anh ta bước vào cứ như chủ ở đây.']
    ]
  },

  {
    slug: 'adverbial-ever',
    en: 'whenever, wherever, whoever, however',
    vi: 'Nhóm "-ever" — whenever, wherever, whoever, however',
    level: 'B2',
    summary: 'Nghĩa là "dù… thế nào đi nữa". Chỗ dễ sai nhất là trật tự sau "however": tính từ hoặc trạng từ phải bám ngay sau nó.',
    formula: {
      rows: [
        ['whenever = no matter when', 'WHENEVER you come, you are welcome.'],
        ['wherever = no matter where', 'WHEREVER you go, take a map.'],
        ['whoever = no matter who', 'WHOEVER wrote this did a good job.'],
        ['whichever = no matter which', 'WHICHEVER route you take, the journey is long.'],
        ['however + TÍNH TỪ ngay sau', 'HOWEVER HARD he tried, he could not open it.']
      ],
      note: 'Trật tự của "however" là bẫy: tính từ hoặc trạng từ dán liền ngay sau nó, rồi mới tới chủ ngữ và động từ. "However hard he tried" đúng, "However he tried hard" sai. Muốn tránh thì viết "No matter how hard he tried" — nghĩa y hệt mà dễ xếp hơn.'
    },
    signals: ['whenever', 'wherever', 'whoever', 'whichever', 'however + tính từ'],
    useWhen: [
      'Nêu một điều đúng trong mọi trường hợp, không phụ thuộc hoàn cảnh.',
      'Bài Viết: thay cho câu dài dòng "it does not matter when / where / who".',
      'Lời mời và lời hứa: "Call me whenever you need help."'
    ],
    useNot: [
      { what: 'Không tách tính từ khỏi "however".', why: '"However he tried hard" sai. Tính từ hoặc trạng từ phải bám ngay sau: "However hard he tried".' },
      { what: 'Không lẫn "however" liên từ với "however" từ nối.', why: 'Từ nối "however" nghĩa là "tuy nhiên" và đứng riêng sau dấu chấm phẩy hoặc dấu chấm. Còn "however" trong nhóm này luôn kéo theo một tính từ hoặc trạng từ.' }
    ],
    confuse: [
      {
        with: '"however" liên từ khác "however" từ nối',
        tell: 'Có tính từ dán ngay sau thì là liên từ, nghĩa "dù… đến đâu". Đứng một mình giữa hai dấu phẩy thì là từ nối, nghĩa "tuy nhiên".',
        pair: [
          { en: 'However hard he tried, he could not open it.', vi: 'Dù cố đến đâu, anh ấy cũng không mở được (liên từ).' },
          { en: 'He tried hard. However, he could not open it.', vi: 'Anh ấy đã rất cố. Tuy nhiên, anh ấy vẫn không mở được (từ nối).' }
        ]
      }
    ],
    errors: [
      { wrong: 'However he tried hard, he could not open it.', right: 'However hard he tried, he could not open it.', why: 'Tính từ hoặc trạng từ phải đứng ngay sau "however".' },
      { wrong: 'Whoever route you take, the journey is long.', right: 'Whichever route you take, the journey is long.', why: '"whoever" dùng cho người; đứng trước danh từ để chọn lựa thì là "whichever".' }
    ],
    examples: [
      ['Whenever you come, you are welcome.', 'Bạn tới lúc nào cũng được hoan nghênh.', 1, '"whenever" bằng với "no matter when".'],
      ['However hard he tried, he could not open it.', 'Dù cố đến đâu, anh ấy cũng không mở được.', 1, 'Trạng từ "hard" bám ngay sau "however" — đúng trật tự.'],
      ['Whoever wrote this report did a good job.', 'Ai viết báo cáo này thì cũng làm tốt lắm.', 1, '"whoever" vừa là chủ ngữ của mệnh đề, vừa nối vào câu chính.'],
      ['Whichever route you take, the journey is long.', 'Đi đường nào thì chặng đường cũng dài.', 1, 'Đứng trước danh từ để chọn lựa thì dùng "whichever".'],
      ['However he tried hard, he could not open it.', 'Dù cố đến đâu, anh ấy cũng không mở được.', 0, 'Sai: sửa thành "However hard he tried, he could not open it."'],
      ['Whoever route you take, the journey is long.', 'Đi đường nào thì chặng đường cũng dài.', 0, 'Sai: sửa thành "Whichever route you take, the journey is long."']
    ],
    practice: [
      ['___ (Whenever / Whatever) you come, you are welcome.', 'Whenever', 'Bạn tới lúc nào cũng được hoan nghênh.'],
      ['___ (Whoever / Whichever) wrote this report did a good job.', 'Whoever', 'Ai viết báo cáo này thì cũng làm tốt lắm.'],
      ['___ (However / Whatever) hard he tried, he could not open it.', 'However', 'Dù cố đến đâu, anh ấy cũng không mở được.'],
      ['Sit ___ (wherever / whenever) you like.', 'wherever', 'Cậu thích ngồi đâu thì ngồi.'],
      ['The correct order is "however ___ (hard he tried / he tried hard)".', 'hard he tried', 'Trật tự đúng là "however hard he tried".'],
      ['___ (Whatever / Whoever) you decide, I will support you.', 'Whatever', 'Bạn quyết thế nào tôi cũng ủng hộ.'],
      ['"However" here means the same as ___ (no matter how / in what way).', 'no matter how', 'Ở đây "however" mang nghĩa "dù… đến đâu".'],
      ['___ (Wherever / Whichever) you go, take a map.', 'Wherever', 'Đi đâu thì cũng mang theo bản đồ.'],
      ['___ (Whichever / Whoever) route you take, the journey is long.', 'Whichever', 'Đi đường nào thì chặng đường cũng dài.'],
      ['___ (However / Whenever) tired you are, finish the work first.', 'However', 'Dù mệt đến đâu cũng làm xong việc đã.']
    ]
  },

  {
    slug: 'noun-clause-what-whether',
    en: 'Noun clauses with what and whether',
    vi: 'Mệnh đề danh ngữ — what và whether',
    level: 'B2',
    summary: 'Cả một mệnh đề đứng làm chủ ngữ hoặc tân ngữ. Hai chỗ hay sai: lẫn "what" với "that", và dùng "if" ở chỗ bắt buộc phải là "whether".',
    formula: {
      rows: [
        ['what = điều mà', 'WHAT he said surprised everyone. (tự nó là một cụm danh từ)'],
        ['that = việc là', 'THAT he is always late is a real problem. (mở ra một mệnh đề đủ)'],
        ['whether = liệu có', 'I do not know WHETHER he will come.'],
        ['Bắt buộc "whether"', 'Sau giới từ: depends on WHETHER · Trước "or not": WHETHER OR NOT · Trước to-V: WHETHER to go']
      ],
      note: 'Phân biệt "what" với "that": bỏ nó ra rồi xem phần còn lại. "What he said" bỏ "what" thì "he said" cụt mất tân ngữ — vậy "what" đang gánh luôn vai tân ngữ, nghĩa là "điều mà". Còn "that he is late" bỏ "that" thì "he is late" vẫn là câu đủ — "that" chỉ làm nhiệm vụ nối.'
    },
    signals: ['what + mệnh đề làm chủ ngữ', 'whether', 'depends on whether', 'whether or not'],
    useWhen: [
      'Đưa cả một ý lên làm chủ ngữ cho câu chủ đề đắt: "What matters most is honesty."',
      'Tường thuật câu hỏi có hoặc không: "I asked whether he was coming."',
      'Sau giới từ và trước nguyên thể thì bắt buộc là "whether", không thay được.'
    ],
    useNot: [
      { what: 'Không dùng "if" sau giới từ.', why: '"It depends on if the weather improves" sai. Sau giới từ bắt buộc là "whether".' },
      { what: 'Không dùng "what" thay cho "that".', why: '"What he is late is a problem" sai. Mệnh đề sau đã đủ chủ ngữ và động từ nên phải dùng "that".' }
    ],
    confuse: [
      {
        with: '"what" khác "that"',
        tell: 'Bỏ từ nối ra: phần còn lại thiếu một thành phần thì dùng "what"; vẫn là câu đủ thì dùng "that".',
        pair: [
          { en: 'What he said surprised everyone.', vi: 'Điều anh ấy nói làm mọi người ngạc nhiên ("what" gánh vai tân ngữ của "said").' },
          { en: 'That he is always late is a real problem.', vi: 'Việc anh ấy lúc nào cũng muộn là một vấn đề thật sự ("that" chỉ nối).' }
        ]
      }
    ],
    errors: [
      { wrong: 'It depends on if the weather improves.', right: 'It depends on whether the weather improves.', why: 'Sau giới từ phải dùng "whether".' },
      { wrong: 'What he is always late is a real problem.', right: 'That he is always late is a real problem.', why: 'Mệnh đề sau đã đủ chủ ngữ và động từ nên dùng "that".' }
    ],
    examples: [
      ['What he said surprised everyone.', 'Điều anh ấy nói làm mọi người ngạc nhiên.', 1, '"what" gánh luôn vai tân ngữ của "said", cả cụm làm chủ ngữ.'],
      ['That he is always late is a real problem.', 'Việc anh ấy lúc nào cũng muộn là một vấn đề thật sự.', 1, 'Mệnh đề sau đã đủ nên dùng "that", không dùng "what".'],
      ['It depends on whether the weather improves.', 'Chuyện đó còn tuỳ thời tiết có khá lên không.', 1, 'Sau giới từ bắt buộc là "whether".'],
      ['I am not sure whether to accept the offer.', 'Tôi chưa chắc có nên nhận lời không.', 1, 'Trước nguyên thể cũng bắt buộc là "whether".'],
      ['It depends on if the weather improves.', 'Chuyện đó còn tuỳ thời tiết có khá lên không.', 0, 'Sai: sửa thành "It depends on whether the weather improves."'],
      ['What he is always late is a real problem.', 'Việc anh ấy lúc nào cũng muộn là một vấn đề thật sự.', 0, 'Sai: sửa thành "That he is always late is a real problem."']
    ],
    practice: [
      ['___ (What / That) he said surprised everyone.', 'What', 'Điều anh ấy nói làm mọi người ngạc nhiên.'],
      ['___ (That / What) he is always late is a real problem.', 'That', 'Việc anh ấy lúc nào cũng muộn là một vấn đề thật sự.'],
      ['I do not know ___ (whether / if or not) he will come.', 'whether', 'Tôi không biết liệu anh ấy có tới không.'],
      ['It depends on ___ (whether / if) the weather improves.', 'whether', 'Chuyện đó còn tuỳ thời tiết có khá lên không.'],
      ['I am not sure ___ (whether / if) to accept the offer.', 'whether', 'Tôi chưa chắc có nên nhận lời không.'],
      ['___ (What / Which) I need is a good night of sleep.', 'What', 'Thứ tôi cần là một giấc ngủ ngon.'],
      ['The question is ___ (whether / if) we can afford it.', 'whether', 'Vấn đề là liệu chúng ta có kham nổi không.'],
      ['Tell me ___ (whether or not / if or not) you agree.', 'whether or not', 'Nói tôi biết bạn có đồng ý hay không.'],
      ['After a preposition you must use ___ (whether / if).', 'whether', 'Sau giới từ thì bắt buộc dùng "whether".'],
      ['___ (What / That) matters most is honesty.', 'What', 'Điều quan trọng nhất là sự trung thực.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'clause',
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
