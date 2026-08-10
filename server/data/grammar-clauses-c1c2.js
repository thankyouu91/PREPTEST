/**
 * Ngữ pháp — nhóm MỆNH ĐỀ QUAN HỆ và MỆNH ĐỀ PHỤ, phần bậc C1 và C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối grammar-clauses.js (A2–B1) và grammar-clauses-b2.js (B2). Hạn mức
 * của nhóm là 29 điểm; hai tệp kia đã dùng 17 điểm, tệp này dùng nốt 12 điểm:
 * C1 ×7, C2 ×5. Vậy là nhóm đủ 29/29.
 *
 * Bậc dưới lo dựng mệnh đề rồi nén mệnh đề. Bậc này lo chuyện khác: BỎ HẲN
 * ĐỘNG TỪ CHIA ĐI mà câu vẫn chặt. Mệnh đề phân từ, cấu trúc tuyệt đối, lược
 * bỏ trong mệnh đề phụ, "for + tân ngữ + to-V" — tất cả đều là mệnh đề không
 * còn động từ chia. Đổi lại, người viết phải tự canh chủ ngữ, và đây chính là
 * chỗ sinh ra lỗi kinh điển của bậc C1: PHÂN TỪ TREO ("Walking down the
 * street, the building came into view" — toà nhà không biết đi bộ).
 *
 * Ghi chú tránh trùng: câu chẻ (cleft) và đảo ngữ nhấn mạnh thuộc nhóm riêng
 * "Đảo ngữ, nhấn mạnh, cleft" trong docs/LEARNING.md, tệp này không đụng tới.
 * Ở đây chỉ có các mẫu nhượng bộ trang trọng cố định ("Much as…", "Try as…"),
 * vốn là mệnh đề phụ chứ không phải phép nhấn mạnh. Mệnh đề so sánh thuộc
 * nhóm tính từ - trạng từ; danh từ tường thuật + that thuộc nhóm bị động -
 * tường thuật.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== C1 ==================== */

  {
    slug: 'participle-clause-adverbial',
    en: 'Participle clauses as adverbials',
    vi: 'Mệnh đề phân từ làm trạng ngữ — và lỗi phân từ treo',
    level: 'C1',
    summary: 'Bỏ liên từ và chủ ngữ, để lại mỗi phân từ. Câu gọn hẳn, nhưng phải nhớ: chủ ngữ của phân từ BẮT BUỘC là chủ ngữ của mệnh đề chính.',
    formula: {
      rows: [
        ['Cùng lúc, chủ động', 'V-ing: WALKING down the street, I saw an old friend.'],
        ['Xảy ra trước', 'Having + V3: HAVING FINISHED the report, she went home.'],
        ['Nghĩa bị động', 'V3: WRITTEN in 1990, the book still sells well.'],
        ['Luật sống còn', 'Chủ ngữ của phân từ = chủ ngữ của mệnh đề chính. Khác nhau là câu hỏng.']
      ],
      note: 'Lỗi phân từ treo là lỗi C1 kinh điển: "Walking down the street, the building came into view" — theo ngữ pháp thì chính toà nhà đang đi bộ. Cách chữa có hai: đổi chủ ngữ mệnh đề chính thành người đi ("… I saw the building"), hoặc trả liên từ và chủ ngữ về ("As I walked down the street, the building came into view").'
    },
    signals: ['V-ing mở đầu câu', 'Having + V3', 'V3 mở đầu câu', 'dấu phẩy ngăn với mệnh đề chính'],
    useWhen: [
      'Bài Viết: gộp hai câu ngắn thành một câu có tầng, ăn điểm độ đa dạng ngữ pháp.',
      'Nêu nguyên nhân hoặc bối cảnh mà không cần tới "because", "when".',
      'Văn kể: dựng chuỗi hành động liền mạch.'
    ],
    useNot: [
      { what: 'Không để phân từ treo — chủ ngữ hai bên phải là một.', why: '"Walking down the street, the building came into view" biến toà nhà thành người đi bộ. Sửa: "Walking down the street, I saw the building."' },
      { what: 'Không dùng khi hai vế có chủ ngữ khác nhau.', why: 'Chủ ngữ khác nhau thì phải giữ liên từ và chủ ngữ, hoặc chuyển sang cấu trúc tuyệt đối có chủ ngữ riêng.' }
    ],
    confuse: [
      {
        with: '"V-ing" khác "Having + V3"',
        tell: 'Hai việc cùng lúc thì V-ing. Việc trước xong rồi mới tới việc sau thì "Having + V3".',
        pair: [
          { en: 'Walking home, I listened to music.', vi: 'Vừa đi bộ về vừa nghe nhạc (hai việc cùng lúc).' },
          { en: 'Having walked home, I made dinner.', vi: 'Đi bộ về tới nơi rồi, tôi nấu bữa tối (việc trước, việc sau).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Walking down the street, the building came into view.', right: 'Walking down the street, I saw the building.', why: 'Phân từ treo: toà nhà không đi bộ được.' },
      { wrong: 'Having finished the report, the printer broke down.', right: 'Having finished the report, she found that the printer had broken down.', why: 'Cái máy in không viết báo cáo; chủ ngữ hai vế phải là một.' }
    ],
    examples: [
      ['Walking down the street, I saw an old friend.', 'Đang đi bộ trên phố thì tôi gặp một người bạn cũ.', 1, 'Cùng một chủ ngữ "I" ở cả hai vế nên hợp lệ.'],
      ['Having finished the report, she went home.', 'Viết xong báo cáo, cô ấy về nhà.', 1, '"Having + V3" đánh dấu việc xảy ra trước.'],
      ['Written in 1990, the book still sells well.', 'Được viết từ năm 1990, cuốn sách tới nay vẫn bán chạy.', 1, 'Phân từ ba mang nghĩa bị động.'],
      ['Not knowing the way, we stopped to ask.', 'Vì không biết đường, chúng tôi dừng lại hỏi.', 1, 'Phủ định thì đặt "not" ngay trước phân từ.'],
      ['Walking down the street, the building came into view.', 'Đang đi bộ trên phố thì toà nhà hiện ra.', 0, 'Sai: phân từ treo, sửa thành "Walking down the street, I saw the building."'],
      ['Having finished the report, the printer broke down.', 'Viết xong báo cáo thì máy in hỏng.', 0, 'Sai: sửa thành "Having finished the report, she found that the printer had broken down."']
    ],
    practice: [
      ['___ (Walking / Walked) down the street, I saw an old friend.', 'Walking', 'Đang đi bộ trên phố thì tôi gặp một người bạn cũ.'],
      ['___ (Having finished / Finishing) the report, she went home and slept.', 'Having finished', 'Viết xong báo cáo, cô ấy về nhà ngủ.'],
      ['___ (Written / Writing) in 1990, the book still sells well.', 'Written', 'Được viết từ năm 1990, cuốn sách vẫn bán chạy.'],
      ['The subject of the participle must match the subject of the ___ (main clause / relative clause).', 'main clause', 'Chủ ngữ của phân từ phải trùng với chủ ngữ của mệnh đề chính.'],
      ['___ (Not knowing / Knowing not) the way, we stopped to ask.', 'Not knowing', 'Vì không biết đường, chúng tôi dừng lại hỏi.'],
      ['Correct the dangling participle: "Walking down the street, ___ (I saw the building / the building came into view)".', 'I saw the building', 'Sửa lỗi phân từ treo bằng cách đổi chủ ngữ mệnh đề chính.'],
      ['___ (Feeling / Felt) tired, he went to bed early.', 'Feeling', 'Thấy mệt, anh ấy đi ngủ sớm.'],
      ['___ (Built / Building) in 1902, the bridge needs urgent repair.', 'Built', 'Xây từ năm 1902, cây cầu cần sửa gấp.'],
      ['___ (Having been / Being) warned twice, he still ignored the rule.', 'Having been', 'Dù đã bị nhắc hai lần, anh ta vẫn phớt lờ quy định.'],
      ['___ (Opening / Opened) the letter, she realised it was not for her.', 'Opening', 'Mở lá thư ra, cô ấy nhận ra nó không phải gửi cho mình.']
    ]
  },

  {
    slug: 'result-clause',
    en: 'Result clauses: so…that, such…that',
    vi: 'Mệnh đề chỉ kết quả — so…that, such…that',
    level: 'C1',
    summary: 'Nêu hệ quả thật sự đã xảy ra. Khác mệnh đề mục đích: mục đích là điều mình nhắm tới, kết quả là điều đã thành.',
    formula: {
      rows: [
        ['so + TÍNH TỪ hoặc TRẠNG TỪ + that', 'It was SO cold THAT we stayed inside.'],
        ['such + (a/an) + TÍNH TỪ + DANH TỪ + that', 'It was SUCH a cold day THAT we stayed inside.'],
        ['so much / many / little / few + danh từ + that', 'There was SO MUCH noise THAT I could not think.'],
        ['Khác mục đích', 'so that + can/could = mục đích; so…that = kết quả.']
      ],
      note: 'Chọn "so" hay "such" chỉ cần nhìn ngay sau chỗ trống: có danh từ theo sau thì "such", chỉ có tính từ hay trạng từ thì "so". "so cold day" sai vì có danh từ "day"; "such cold" sai vì thiếu danh từ.'
    },
    signals: ['so … that', 'such … that', 'so much … that', 'kết quả đã xảy ra'],
    useWhen: [
      'Nhấn mạnh mức độ rồi nêu luôn hệ quả của mức độ ấy.',
      'Bài Viết: câu có tầng, thay cho hai câu rời "It was very cold. We stayed inside."',
      'Văn nói cũng dùng nhiều, chỉ khác là hay lược chữ "that".'
    ],
    useNot: [
      { what: 'Không dùng "so" khi có danh từ theo sau.', why: '"It was so cold day" sai. Có danh từ thì dùng "such": "It was such a cold day".' },
      { what: 'Không lẫn "so…that" với "so that".', why: '"so that" nêu MỤC ĐÍCH và thường đi với can/could. "so…that" nêu KẾT QUẢ đã xảy ra thật.' }
    ],
    confuse: [
      {
        with: 'kết quả khác mục đích',
        tell: 'Điều nói sau đã xảy ra thật thì là kết quả. Điều nói sau mới chỉ là dự tính thì là mục đích.',
        pair: [
          { en: 'He spoke so quietly that nobody heard him.', vi: 'Anh ấy nói khẽ đến mức không ai nghe thấy (kết quả có thật).' },
          { en: 'He spoke quietly so that nobody would hear him.', vi: 'Anh ấy nói khẽ để không ai nghe thấy (mục đích nhắm tới).' }
        ]
      }
    ],
    errors: [
      { wrong: 'It was so cold day that we stayed inside.', right: 'It was such a cold day that we stayed inside.', why: 'Có danh từ "day" theo sau nên phải dùng "such a".' },
      { wrong: 'There was such much noise that I could not think.', right: 'There was so much noise that I could not think.', why: 'Đi với "much" và "many" thì luôn là "so", không phải "such".' }
    ],
    examples: [
      ['It was so cold that we stayed inside all day.', 'Trời lạnh đến mức chúng tôi ở trong nhà cả ngày.', 1, '"so" đi với tính từ trần.'],
      ['It was such a cold day that we stayed inside.', 'Hôm đó lạnh đến mức chúng tôi ở lì trong nhà.', 1, '"such" đi khi có danh từ theo sau.'],
      ['There was so much noise that I could not think.', 'Ồn đến mức tôi không nghĩ được gì.', 1, '"so much" và "so many" luôn dùng "so".'],
      ['He spoke so quietly that nobody heard him.', 'Anh ấy nói khẽ đến mức không ai nghe thấy.', 1, 'Kết quả đã xảy ra thật, khác hẳn câu mục đích.'],
      ['It was so cold day that we stayed inside.', 'Hôm đó lạnh đến mức chúng tôi ở trong nhà.', 0, 'Sai: sửa thành "It was such a cold day that we stayed inside."'],
      ['There was such much noise that I could not think.', 'Ồn đến mức tôi không nghĩ được gì.', 0, 'Sai: sửa thành "There was so much noise that I could not think."']
    ],
    practice: [
      ['It was ___ (so / such) cold that we stayed inside.', 'so', 'Trời lạnh đến mức chúng tôi ở trong nhà.'],
      ['It was ___ (such / so) a cold day that we stayed inside.', 'such', 'Hôm đó lạnh đến mức chúng tôi ở lì trong nhà.'],
      ['There was ___ (so / such) much noise that I could not think.', 'so', 'Ồn đến mức tôi không nghĩ được gì.'],
      ['She is ___ (such / so) a good teacher that everyone wants her class.', 'such', 'Cô ấy dạy giỏi đến mức ai cũng muốn vào lớp cô.'],
      ['He spoke ___ (so / such) quietly that nobody heard him.', 'so', 'Anh ấy nói khẽ đến mức không ai nghe thấy.'],
      ['Use ___ (such / so) when a noun follows.', 'such', 'Dùng "such" khi có danh từ theo sau.'],
      ['They had ___ (so / such) many problems that they gave up.', 'so', 'Họ gặp nhiều vấn đề đến mức phải bỏ cuộc.'],
      ['"So that" introduces a ___ (purpose / result).', 'purpose', 'Cụm "so that" mở ra mục đích chứ không phải kết quả.'],
      ['It was ___ (such / so) an interesting book that I read it twice.', 'such', 'Cuốn sách hay đến mức tôi đọc hai lần.'],
      ['The bag was ___ (so / such) heavy that I could not lift it.', 'so', 'Cái túi nặng đến mức tôi không nhấc nổi.']
    ]
  },

  {
    slug: 'extraposition-it',
    en: 'Extraposition with dummy it',
    vi: 'Chủ ngữ giả "it" — đẩy mệnh đề nặng ra sau',
    level: 'C1',
    summary: 'Tiếng Anh không thích chủ ngữ dài lê thê. Đặt "it" giữ chỗ ở đầu, đẩy cả mệnh đề xuống cuối câu.',
    formula: {
      rows: [
        ['Chủ ngữ nặng', 'That the experiment failed was not surprising. (đúng mà nặng)'],
        ['Đẩy ra sau', 'IT was not surprising THAT the experiment failed. (tự nhiên hơn)'],
        ['Với nguyên thể', 'To learn a language takes time → IT takes time TO LEARN a language.'],
        ['Mẫu hay gặp', 'It is important / clear / likely / true that… · It seems / appears that…']
      ],
      note: '"It" ở đây không trỏ vào cái gì cả, chỉ giữ chỗ chủ ngữ cho đúng cấu trúc. Bản chưa đẩy ("That the experiment failed was not surprising") vẫn đúng ngữ pháp, chỉ là nặng đầu nên ít dùng — trừ khi muốn cố ý nhấn vào mệnh đề đó.'
    },
    signals: ['It is + tính từ + that', 'It seems that', 'It takes … to', 'chủ ngữ giả'],
    useWhen: [
      'Chủ ngữ là cả một mệnh đề hoặc một cụm nguyên thể dài.',
      'Bài Viết học thuật: "It has been shown that…", "It is worth noting that…".',
      'Muốn đưa thông tin mới xuống cuối câu, chỗ người đọc chú ý nhất.'
    ],
    useNot: [
      { what: 'Không bỏ "it" ở đầu câu.', why: '"Is important that you come" sai. Tiếng Anh bắt buộc phải có chủ ngữ, dù chỉ là chủ ngữ giả.' },
      { what: 'Không nhắc lại chủ ngữ hai lần.', why: '"It is important that the meeting it starts on time" thừa. Mệnh đề sau đã có chủ ngữ riêng rồi.' }
    ],
    confuse: [
      {
        with: '"it" giữ chỗ khác "it" trỏ vật',
        tell: 'Thay "it" bằng một danh từ cụ thể mà câu vẫn xuôi thì đó là "it" trỏ vật. Không thay được thì là "it" giữ chỗ.',
        pair: [
          { en: 'It is clear that he was lying.', vi: 'Rõ ràng là anh ta đã nói dối ("it" chỉ giữ chỗ).' },
          { en: 'It is a good book.', vi: 'Đó là một cuốn sách hay ("it" trỏ vào cuốn sách).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Is important that you arrive on time.', right: 'It is important that you arrive on time.', why: 'Thiếu chủ ngữ giả "it" ở đầu câu.' },
      { wrong: 'It takes time to learning a language.', right: 'It takes time to learn a language.', why: 'Sau "to" là động từ nguyên thể trần.' }
    ],
    examples: [
      ['It was not surprising that the experiment failed.', 'Không có gì lạ khi thí nghiệm thất bại.', 1, 'Đẩy mệnh đề nặng xuống cuối, "it" giữ chỗ chủ ngữ.'],
      ['It takes time to learn a language.', 'Học một ngôn ngữ thì mất thời gian.', 1, 'Cụm nguyên thể cũng đẩy ra sau được.'],
      ['It has been shown that the method works.', 'Người ta đã chứng minh phương pháp này hiệu quả.', 1, 'Mẫu chuẩn của văn học thuật.'],
      ['That the experiment failed was not surprising.', 'Việc thí nghiệm thất bại không có gì lạ.', 1, 'Bản chưa đẩy: vẫn đúng, chỉ nặng đầu, dùng khi cố ý nhấn.'],
      ['Is important that you arrive on time.', 'Bạn đến đúng giờ là điều quan trọng.', 0, 'Sai: sửa thành "It is important that you arrive on time."'],
      ['It takes time to learning a language.', 'Học một ngôn ngữ thì mất thời gian.', 0, 'Sai: sửa thành "It takes time to learn a language."']
    ],
    practice: [
      ['___ (It / There) is important that you arrive on time.', 'It', 'Bạn đến đúng giờ là điều quan trọng.'],
      ['It takes time ___ (to learn / to learning) a language.', 'to learn', 'Học một ngôn ngữ thì mất thời gian.'],
      ['___ (It / What) seems that nobody told him.', 'It', 'Có vẻ như không ai báo cho anh ấy.'],
      ['The word "it" here is a ___ (dummy subject / real subject).', 'dummy subject', 'Chữ "it" ở đây chỉ là chủ ngữ giả giữ chỗ.'],
      ['___ (It / He) is clear that he was lying.', 'It', 'Rõ ràng là anh ta đã nói dối.'],
      ['It has been shown ___ (that / what) the method works.', 'that', 'Người ta đã chứng minh phương pháp này hiệu quả.'],
      ['___ (It / That) is worth noting that the sample was small.', 'It', 'Cần lưu ý rằng mẫu khảo sát nhỏ.'],
      ['It is unlikely ___ (that / if) they will agree.', 'that', 'Khó mà họ đồng ý.'],
      ['English requires a subject, even a ___ (dummy / plural) one.', 'dummy', 'Tiếng Anh bắt buộc có chủ ngữ, dù chỉ là chủ ngữ giả.'],
      ['___ (It / They) appears that the file was deleted.', 'It', 'Có vẻ như tệp đã bị xoá.']
    ]
  },

  {
    slug: 'for-to-clause',
    en: 'for + object + to-infinitive',
    vi: 'Mệnh đề nguyên thể có chủ ngữ riêng — for + tân ngữ + to-V',
    level: 'C1',
    summary: 'Khi cụm nguyên thể cần chủ ngữ riêng khác với chủ ngữ câu chính, "for" đứng ra làm chỗ gắn chủ ngữ ấy.',
    formula: {
      rows: [
        ['Sau tính từ', 'It is important FOR STUDENTS TO arrive on time.'],
        ['Làm bổ ngữ', 'The plan is FOR US TO meet at six.'],
        ['Sau động từ', 'I am waiting FOR HIM TO call.'],
        ['Với too và enough', 'It is too heavy FOR ME TO lift. / clear enough FOR EVERYONE TO see.']
      ],
      note: 'Sau "for" là tân ngữ nên dùng me, him, her, us, them — không dùng sở hữu. "for his to come" sai, phải là "for him to come". Nhớ: "for" ở đây không mang nghĩa "cho" hay "vì" mà chỉ làm chỗ đỡ cho chủ ngữ của động từ nguyên thể.'
    },
    signals: ['for + đại từ tân ngữ + to-V', 'It is … for … to', 'too … for … to', 'wait for … to'],
    useWhen: [
      'Cụm nguyên thể có người thực hiện khác với chủ ngữ câu chính.',
      'Nêu quy định và lời khuyên chung: "It is essential for candidates to bring ID."',
      'Đi với "too" và "enough" khi cần nói rõ ai làm được hay không làm được.'
    ],
    useNot: [
      { what: 'Không bỏ "to" trước động từ.', why: '"It is important for students arrive on time" sai. Bắt buộc đủ "for + tân ngữ + TO + V".' },
      { what: 'Không dùng dạng sở hữu sau "for".', why: '"for his to come" sai. Sau "for" là đại từ tân ngữ: "for him to come".' }
    ],
    confuse: [
      {
        with: '"for + to-V" khác "to-V" trơ',
        tell: 'Người làm việc đó chính là chủ ngữ câu thì dùng "to-V" trơ. Người khác làm thì phải thêm "for + tân ngữ".',
        pair: [
          { en: 'It is important to arrive on time.', vi: 'Đến đúng giờ là điều quan trọng (nói chung, không chỉ đích ai).' },
          { en: 'It is important for students to arrive on time.', vi: 'Sinh viên đến đúng giờ là điều quan trọng (chỉ rõ ai).' }
        ]
      }
    ],
    errors: [
      { wrong: 'It is important for students arrive on time.', right: 'It is important for students to arrive on time.', why: 'Thiếu "to" trước động từ nguyên thể.' },
      { wrong: 'I am waiting for he to call.', right: 'I am waiting for him to call.', why: 'Sau "for" phải là đại từ tân ngữ "him".' }
    ],
    examples: [
      ['It is important for students to arrive on time.', 'Sinh viên đến đúng giờ là điều quan trọng.', 1, '"for students" là chủ ngữ riêng của "to arrive".'],
      ['The plan is for us to meet at six.', 'Kế hoạch là chúng ta gặp nhau lúc sáu giờ.', 1, 'Cụm "for + tân ngữ + to-V" làm bổ ngữ cho "is".'],
      ['I am waiting for him to call.', 'Tôi đang đợi anh ấy gọi.', 1, 'Người gọi là "him", khác với chủ ngữ "I".'],
      ['The box is too heavy for me to lift.', 'Cái hộp nặng quá tôi không nhấc nổi.', 1, 'Đi với "too" thì mẫu này rất hay gặp.'],
      ['It is important for students arrive on time.', 'Sinh viên đến đúng giờ là điều quan trọng.', 0, 'Sai: sửa thành "It is important for students to arrive on time."'],
      ['I am waiting for he to call.', 'Tôi đang đợi anh ấy gọi.', 0, 'Sai: sửa thành "I am waiting for him to call."']
    ],
    practice: [
      ['It is important for students ___ (to arrive / arrive) on time.', 'to arrive', 'Sinh viên đến đúng giờ là điều quan trọng.'],
      ['I am waiting for ___ (him / he) to call.', 'him', 'Tôi đang đợi anh ấy gọi.'],
      ['The plan is ___ (for us / for our) to meet at six.', 'for us', 'Kế hoạch là chúng ta gặp nhau lúc sáu giờ.'],
      ['The box is too heavy ___ (for me / to me) to lift.', 'for me', 'Cái hộp nặng quá tôi không nhấc nổi.'],
      ['After "for" you use an ___ (object / possessive) pronoun.', 'object', 'Sau "for" thì dùng đại từ tân ngữ.'],
      ['It is essential for candidates ___ (to bring / bringing) identification.', 'to bring', 'Thí sinh mang theo giấy tờ tuỳ thân là bắt buộc.'],
      ['She arranged ___ (for them / for their) to stay another night.', 'for them', 'Cô ấy thu xếp cho họ ở thêm một đêm.'],
      ['The print is clear enough ___ (for everyone / to everyone) to read.', 'for everyone', 'Chữ in đủ rõ để ai cũng đọc được.'],
      ['It would be better ___ (for you / for your) to leave early.', 'for you', 'Bạn đi sớm thì hơn.'],
      ['They are waiting for the rain ___ (to stop / stopping).', 'to stop', 'Họ đang đợi mưa tạnh.']
    ]
  },

  {
    slug: 'ellipsis-subordinate',
    en: 'Ellipsis in subordinate clauses',
    vi: 'Lược bỏ trong mệnh đề phụ — When ready, If necessary',
    level: 'C1',
    summary: 'Bỏ luôn chủ ngữ và động từ "be" sau liên từ, chỉ giữ lại phần mang nghĩa. Chỉ làm được khi chủ ngữ hai vế trùng nhau.',
    formula: {
      rows: [
        ['when / while', 'WHEN (you are) READY, press start.'],
        ['if / unless', 'IF (it is) NECESSARY, call me.'],
        ['although / though', 'ALTHOUGH (he was) TIRED, he kept working.'],
        ['Điều kiện lược bỏ', 'Chủ ngữ mệnh đề phụ trùng chủ ngữ mệnh đề chính (hoặc là "it"), và động từ là dạng của "be".']
      ],
      note: 'Cùng một cái bẫy với mệnh đề phân từ: lược bỏ khi hai chủ ngữ khác nhau là câu treo. "While walking home, my phone rang" — cái điện thoại không đi bộ về nhà. Trả chủ ngữ về là xong: "While I was walking home, my phone rang."'
    },
    signals: ['when ready', 'if necessary', 'if possible', 'while waiting', 'although tired'],
    useWhen: [
      'Hướng dẫn sử dụng và biển báo: câu càng ngắn càng dễ đọc.',
      'Bài Viết: bỏ bớt chữ thừa mà nghĩa không suy suyển.',
      'Các cụm đã thành nếp: "if any", "if possible", "where necessary", "when in doubt".'
    ],
    useNot: [
      { what: 'Không lược bỏ khi hai chủ ngữ khác nhau.', why: '"While walking home, my phone rang" thành câu treo. Sửa: "While I was walking home, my phone rang."' },
      { what: 'Không lược bỏ khi động từ không phải "be".', why: '"When you finish, call me" không rút thành "When finish, call me" được. Chỉ dạng của "be" mới bỏ được.' }
    ],
    confuse: [
      {
        with: 'lược bỏ hợp lệ khác câu treo',
        tell: 'Thử trả chủ ngữ về xem có xuôi không. Xuôi thì lược bỏ hợp lệ; ra câu vô lý thì là câu treo.',
        pair: [
          { en: 'While waiting for the bus, I read the news.', vi: 'Trong lúc đợi xe buýt, tôi đọc tin tức (tôi đợi, tôi đọc — hợp lệ).' },
          { en: 'While waiting for the bus, my phone rang.', vi: 'Câu treo: cái điện thoại không đợi xe buýt.' }
        ]
      }
    ],
    errors: [
      { wrong: 'While walking home, my phone rang.', right: 'While I was walking home, my phone rang.', why: 'Chủ ngữ hai vế khác nhau nên không lược bỏ được.' },
      { wrong: 'When finish the test, hand in your paper.', right: 'When you finish the test, hand in your paper.', why: 'Động từ không phải "be" nên phải giữ đủ chủ ngữ và động từ.' }
    ],
    examples: [
      ['When ready, press the green button.', 'Khi đã sẵn sàng, bấm nút xanh.', 1, 'Lược "you are"; chủ ngữ ngầm trùng với chủ ngữ câu mệnh lệnh.'],
      ['If necessary, call the emergency number.', 'Nếu cần, gọi số khẩn cấp.', 1, 'Lược "it is" — mẫu rất quen trong hướng dẫn sử dụng.'],
      ['Although tired, he kept working until midnight.', 'Dù mệt, anh ấy vẫn làm tới nửa đêm.', 1, 'Lược "he was", chủ ngữ trùng nhau nên hợp lệ.'],
      ['While waiting for the bus, I read the news.', 'Trong lúc đợi xe buýt, tôi đọc tin tức.', 1, 'Tôi đợi và tôi đọc — cùng một chủ ngữ.'],
      ['While walking home, my phone rang.', 'Trong lúc đi bộ về, điện thoại tôi reo.', 0, 'Sai: câu treo, sửa thành "While I was walking home, my phone rang."'],
      ['When finish the test, hand in your paper.', 'Khi làm xong bài, nộp giấy thi.', 0, 'Sai: sửa thành "When you finish the test, hand in your paper."']
    ],
    practice: [
      ['When ___ (ready / you ready), press the green button.', 'ready', 'Khi đã sẵn sàng, bấm nút xanh.'],
      ['If ___ (necessary / it necessary), call the emergency number.', 'necessary', 'Nếu cần, gọi số khẩn cấp.'],
      ['Although ___ (tired / he tired), he kept working.', 'tired', 'Dù mệt, anh ấy vẫn tiếp tục làm.'],
      ['You can only omit the subject when the verb is a form of ___ (be / have).', 'be', 'Chỉ lược bỏ được khi động từ là một dạng của "be".'],
      ['Fix the dangling clause: "While ___ (I was walking / walking) home, my phone rang".', 'I was walking', 'Sửa câu treo bằng cách trả lại chủ ngữ và động từ.'],
      ['While ___ (waiting / I waiting) for the bus, I read the news.', 'waiting', 'Trong lúc đợi xe buýt, tôi đọc tin tức.'],
      ['Correct these errors where ___ (necessary / it necessary).', 'necessary', 'Sửa các lỗi này ở những chỗ cần thiết.'],
      ['When ___ (in doubt / you in doubt), ask your supervisor.', 'in doubt', 'Khi còn phân vân, hỏi người phụ trách.'],
      ['Unless ___ (stated / it stated) otherwise, the rules apply to everyone.', 'stated', 'Trừ khi có quy định khác, các quy tắc áp dụng cho tất cả.'],
      ['When ___ (you finish / finish) the test, hand in your paper.', 'you finish', 'Khi làm xong bài, nộp giấy thi.']
    ]
  },

  {
    slug: 'clause-in-case',
    en: 'in case, provided that, as long as',
    vi: 'Mệnh đề đề phòng và điều kiện hạn định — in case, provided that, as long as',
    level: 'C1',
    summary: '"in case" là đề phòng, làm trước để lỡ có chuyện; "if" là chỉ làm khi chuyện xảy ra. Hai nghĩa khác hẳn nhau, người học hay lẫn.',
    formula: {
      rows: [
        ['in case = phòng khi', 'Take an umbrella IN CASE it rains. (mang sẵn, dù có thể không mưa)'],
        ['if = nếu', 'Take an umbrella IF it rains. (mưa thì mới mang)'],
        ['provided that / as long as', 'You can borrow it AS LONG AS you return it. (điều kiện bắt buộc)'],
        ['Luật thì', 'Sau "in case" không dùng "will": in case it rains, không phải "in case it will rain".']
      ],
      note: 'Phép thử phân biệt: hành động xảy ra TRƯỚC hay SAU điều kiện? Mang ô trước rồi mới biết có mưa hay không thì đó là "in case". Thấy mưa rồi mới mang ô thì đó là "if". "provided that" và "as long as" thì trang trọng hơn "if", nhấn vào chỗ đây là điều kiện bắt buộc phải giữ.'
    },
    signals: ['in case', 'provided that', 'providing', 'as long as', 'so long as'],
    useWhen: [
      '"in case" khi chuẩn bị sẵn cho một khả năng chưa chắc xảy ra.',
      '"provided that" và "as long as" trong hợp đồng, nội quy, thư công việc.',
      'Bài Viết: nêu điều kiện kèm theo cho một đề xuất.'
    ],
    useNot: [
      { what: 'Không dùng "will" sau "in case".', why: '"in case it will rain" sai. Giống các liên từ chỉ thời gian, chỗ này chia hiện tại đơn.' },
      { what: 'Không dùng "in case" khi ý là "nếu".', why: '"In case you finish early, you can go home" nghĩa lệch. Ý "nếu" thì dùng "if".' }
    ],
    confuse: [
      {
        with: '"in case" khác "if"',
        tell: 'Làm sẵn để phòng thì "in case". Chờ chuyện xảy ra rồi mới làm thì "if".',
        pair: [
          { en: 'Take an umbrella in case it rains.', vi: 'Mang ô đi phòng khi trời mưa (mang sẵn từ bây giờ).' },
          { en: 'Take an umbrella if it rains.', vi: 'Nếu trời mưa thì hãy mang ô (mưa mới mang).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Take an umbrella in case it will rain.', right: 'Take an umbrella in case it rains.', why: 'Sau "in case" chia hiện tại đơn, không dùng "will".' },
      { wrong: 'You can borrow the car as long as you will return it tonight.', right: 'You can borrow the car as long as you return it tonight.', why: 'Mệnh đề điều kiện chia hiện tại đơn.' }
    ],
    examples: [
      ['Take an umbrella in case it rains.', 'Mang ô đi phòng khi trời mưa.', 1, 'Đề phòng: mang sẵn từ bây giờ, chưa biết có mưa hay không.'],
      ['Take an umbrella if it rains.', 'Nếu trời mưa thì hãy mang ô.', 1, 'So sánh cho rõ: chỗ này mưa rồi mới mang.'],
      ['You can borrow the car as long as you return it tonight.', 'Cậu mượn xe được, miễn là tối nay trả.', 1, 'Điều kiện bắt buộc phải giữ.'],
      ['The trip will go ahead provided that enough people sign up.', 'Chuyến đi sẽ diễn ra với điều kiện đủ người đăng ký.', 1, '"provided that" trang trọng, hợp văn bản thông báo.'],
      ['Take an umbrella in case it will rain.', 'Mang ô đi phòng khi trời mưa.', 0, 'Sai: sửa thành "Take an umbrella in case it rains."'],
      ['In case you finish early, you can go home.', 'Nếu bạn xong sớm thì có thể về.', 0, 'Sai nghĩa: ý ở đây là "nếu", sửa thành "If you finish early, you can go home."']
    ],
    practice: [
      ['Take an umbrella ___ (in case / if) it rains, so you have it with you.', 'in case', 'Mang sẵn ô đi phòng khi trời mưa.'],
      ['Take an umbrella ___ (if / in case) it rains, but leave it at home otherwise.', 'if', 'Nếu trời mưa thì mang ô, không thì để nhà.'],
      ['Take an umbrella in case it ___ (rains / will rain).', 'rains', 'Mang ô đi phòng khi trời mưa.'],
      ['You can borrow the car ___ (as long as / in case) you return it tonight.', 'as long as', 'Cậu mượn xe được, miễn là tối nay trả.'],
      ['The trip will go ahead ___ (provided / providing that will) enough people sign up.', 'provided', 'Chuyến đi sẽ diễn ra với điều kiện đủ người đăng ký.'],
      ['"In case" means you act ___ (in advance / afterwards).', 'in advance', 'Cụm "in case" nghĩa là làm trước để phòng.'],
      ['I saved the file twice ___ (in case / if) the computer crashed.', 'in case', 'Tôi lưu tệp hai lần phòng khi máy treo.'],
      ['We will refund you ___ (provided that / in case that) you keep the receipt.', 'provided that', 'Chúng tôi hoàn tiền với điều kiện bạn giữ hoá đơn.'],
      ['He wrote the number down ___ (in case / unless) he forgot it.', 'in case', 'Anh ấy ghi số lại phòng khi quên.'],
      ['You may stay ___ (so long as / in case) you pay the deposit.', 'so long as', 'Bạn ở lại được, miễn là đóng tiền cọc.']
    ]
  },

  {
    slug: 'as-clause-academic',
    en: 'Sentential as-clauses',
    vi: 'Mệnh đề với "as" trong văn học thuật — as is well known, as shown in Figure 1',
    level: 'C1',
    summary: 'Giống "which" trỏ vào cả mệnh đề, nhưng "as" đứng được ở đầu câu. Đây là bộ công cụ dẫn nguồn và dẫn hình của bài viết học thuật.',
    formula: {
      rows: [
        ['Đứng đầu câu', 'AS IS WELL KNOWN, the climate is changing.'],
        ['Dẫn hình, dẫn bảng', 'AS SHOWN in Figure 1, sales rose sharply.'],
        ['Dẫn nguồn', 'AS Smith NOTES, the data are limited.'],
        ['Không có chủ ngữ giả', 'AS IS SHOWN in Figure 1 — không viết "As it is shown".']
      ],
      note: 'Khác "which" ở chỗ vị trí: "which" phải có mệnh đề đứng trước để trỏ vào, nên luôn nằm giữa hoặc cuối câu. Còn "as" đứng ngay đầu câu được, trỏ tới điều sắp nói. Cũng vì thế mà "as" rất tiện để mở đoạn.'
    },
    signals: ['as is well known', 'as shown in', 'as can be seen', 'as noted above', 'as expected'],
    useWhen: [
      'Bài Viết học thuật: dẫn vào hình, bảng, biểu đồ.',
      'Nhắc lại điều đã nói ở trên mà không phải viết lại: "as noted above".',
      'Dẫn quan điểm của nguồn: "As Tran (2021) argues, …".'
    ],
    useNot: [
      { what: 'Không thêm "that" sau "as".', why: '"As is well known that the climate is changing" sai. Bỏ "that" đi, mệnh đề chính đi thẳng sau dấu phẩy.' },
      { what: 'Không thêm "it" vào giữa.', why: '"As it is shown in Figure 1" không chuẩn. Dạng chuẩn là "As is shown in Figure 1" hoặc "As Figure 1 shows".' }
    ],
    confuse: [
      {
        with: '"as" khác "which"',
        tell: '"as" đứng đầu câu được và trỏ tới điều sắp nói. "which" phải có mệnh đề đứng trước để trỏ ngược lại.',
        pair: [
          { en: 'As is well known, the climate is changing.', vi: 'Như ai cũng biết, khí hậu đang thay đổi (đứng đầu câu).' },
          { en: 'The climate is changing, which is well known.', vi: 'Khí hậu đang thay đổi, điều mà ai cũng biết (trỏ ngược lại).' }
        ]
      }
    ],
    errors: [
      { wrong: 'As is well known that the climate is changing.', right: 'As is well known, the climate is changing.', why: 'Sau mệnh đề "as" là dấu phẩy rồi tới mệnh đề chính, không có "that".' },
      { wrong: 'As it is shown in Figure 1, sales rose sharply.', right: 'As is shown in Figure 1, sales rose sharply.', why: 'Mẫu này không có chủ ngữ giả "it".' }
    ],
    examples: [
      ['As is well known, the climate is changing.', 'Như ai cũng biết, khí hậu đang thay đổi.', 1, 'Đứng ngay đầu câu — chỗ "which" không làm được.'],
      ['As shown in Figure 1, sales rose sharply in June.', 'Như thể hiện ở Hình 1, doanh số tăng mạnh trong tháng Sáu.', 1, 'Mẫu chuẩn để dẫn hình và bảng.'],
      ['As Tran (2021) argues, the sample was too small.', 'Như Trần (2021) lập luận, mẫu khảo sát quá nhỏ.', 1, 'Dẫn nguồn gọn gàng, không phải viết cả câu tường thuật.'],
      ['The climate is changing, which is well known.', 'Khí hậu đang thay đổi, điều mà ai cũng biết.', 1, 'Bản dùng "which": phải có mệnh đề đứng trước.'],
      ['As is well known that the climate is changing.', 'Như ai cũng biết, khí hậu đang thay đổi.', 0, 'Sai: sửa thành "As is well known, the climate is changing."'],
      ['As it is shown in Figure 1, sales rose sharply.', 'Như thể hiện ở Hình 1, doanh số tăng mạnh.', 0, 'Sai: sửa thành "As is shown in Figure 1, sales rose sharply."']
    ],
    practice: [
      ['___ (As / As that) is well known, the climate is changing.', 'As', 'Như ai cũng biết, khí hậu đang thay đổi.'],
      ['As ___ (shown / it shown) in Figure 1, sales rose sharply.', 'shown', 'Như thể hiện ở Hình 1, doanh số tăng mạnh.'],
      ['As Tran (2021) ___ (argues / argues that), the sample was too small.', 'argues', 'Như Trần (2021) lập luận, mẫu khảo sát quá nhỏ.'],
      ['This pattern can stand at the ___ (beginning / end) of the sentence, unlike "which".', 'beginning', 'Mẫu này đứng đầu câu được, khác với "which".'],
      ['As ___ (can be seen / it can be seen) from the table, the trend is clear.', 'can be seen', 'Như có thể thấy từ bảng, xu hướng đã rõ.'],
      ['The climate is changing, ___ (which / as) is well known.', 'which', 'Khí hậu đang thay đổi, điều mà ai cũng biết.'],
      ['As ___ (noted / noted that) above, the results were mixed.', 'noted', 'Như đã nêu ở trên, kết quả không đồng nhất.'],
      ['As ___ (expected / it expected), the older group scored higher.', 'expected', 'Đúng như dự đoán, nhóm lớn tuổi đạt điểm cao hơn.'],
      ['After "as" in this pattern you do not add ___ (that / a comma).', 'that', 'Trong mẫu này thì sau "as" không thêm "that".'],
      ['As ___ (Figure 2 shows / shows Figure 2), rainfall peaked in August.', 'Figure 2 shows', 'Như Hình 2 cho thấy, lượng mưa đạt đỉnh vào tháng Tám.']
    ]
  },

  /* ==================== C2 ==================== */

  {
    slug: 'absolute-construction',
    en: 'Absolute constructions',
    vi: 'Cấu trúc tuyệt đối — The weather being fine, we went out',
    level: 'C2',
    summary: 'Mệnh đề rút gọn nhưng CÓ CHỦ NGỮ RIÊNG. Nhờ có chủ ngữ riêng nên không bao giờ mắc lỗi treo như mệnh đề phân từ.',
    formula: {
      rows: [
        ['Chủ ngữ riêng + phân từ', 'THE WEATHER BEING FINE, we went out.'],
        ['Phân từ ba', 'HIS WORK FINISHED, he went home.'],
        ['Cụm đã thành nếp', 'All things considered · Weather permitting · That said · This done'],
        ['with + danh từ + phân từ', 'WITH the door LOCKED, we could not get in.']
      ],
      note: 'Chỗ này chính là lời giải cho lỗi phân từ treo: khi chủ ngữ hai vế khác nhau thì đừng rút thành phân từ trơ, mà giữ luôn chủ ngữ lại thành cấu trúc tuyệt đối. Văn phong khá trang trọng, hợp bài luận và văn kể, không hợp email thân mật.'
    },
    signals: ['danh từ + being', 'danh từ + phân từ, rồi dấu phẩy', 'all things considered', 'weather permitting'],
    useWhen: [
      'Nêu bối cảnh hoặc điều kiện kèm theo mà chủ ngữ khác với câu chính.',
      'Bài Viết trang trọng và văn kể: dựng câu nhiều tầng mà vẫn gọn.',
      'Các cụm đã thành nếp: "All things considered, it was a success."'
    ],
    useNot: [
      { what: 'Không viết thành hai câu nối bằng dấu phẩy.', why: '"The weather was fine, we went out" là lỗi nối câu. Muốn giữ "was" thì phải có liên từ, hoặc bỏ "was" đi thành "The weather being fine".' },
      { what: 'Không dùng trong email hay tin nhắn thân mật.', why: 'Văn phong này khá trang trọng; nói chuyện thường ngày dùng "Since the weather was fine…" tự nhiên hơn.' }
    ],
    confuse: [
      {
        with: 'cấu trúc tuyệt đối khác mệnh đề phân từ',
        tell: 'Có chủ ngữ riêng trước phân từ thì là cấu trúc tuyệt đối. Không có chủ ngữ thì là mệnh đề phân từ, và khi đó chủ ngữ phải trùng câu chính.',
        pair: [
          { en: 'The weather being fine, we went out.', vi: 'Thời tiết đẹp nên chúng tôi ra ngoài (có chủ ngữ riêng "the weather").' },
          { en: 'Feeling tired, we went home.', vi: 'Thấy mệt nên chúng tôi về nhà (không chủ ngữ riêng, phải trùng "we").' }
        ]
      }
    ],
    errors: [
      { wrong: 'The weather was fine, we went out.', right: 'The weather being fine, we went out.', why: 'Hai mệnh đề đủ không nối được bằng mỗi dấu phẩy; bỏ "was" thành cấu trúc tuyệt đối.' },
      { wrong: 'All thing considered, it was a success.', right: 'All things considered, it was a success.', why: 'Cụm cố định là "all things considered", danh từ số nhiều.' }
    ],
    examples: [
      ['The weather being fine, we went out for a walk.', 'Thời tiết đẹp nên chúng tôi ra ngoài dạo.', 1, 'Chủ ngữ riêng "the weather" nên không lo lỗi treo.'],
      ['His work finished, he went home early.', 'Xong việc, anh ấy về sớm.', 1, 'Phân từ ba mang nghĩa hoàn thành.'],
      ['All things considered, the project was a success.', 'Xét mọi mặt thì dự án đã thành công.', 1, 'Cụm đã thành nếp, dùng nguyên khối.'],
      ['With the door locked, we could not get in.', 'Cửa khoá rồi nên chúng tôi không vào được.', 1, 'Dạng có "with" đứng đầu, thân mật hơn một chút.'],
      ['The weather was fine, we went out.', 'Thời tiết đẹp nên chúng tôi ra ngoài.', 0, 'Sai: lỗi nối câu bằng dấu phẩy, sửa thành "The weather being fine, we went out."'],
      ['All thing considered, it was a success.', 'Xét mọi mặt thì đã thành công.', 0, 'Sai: sửa thành "All things considered, it was a success."']
    ],
    practice: [
      ['The weather ___ (being / was) fine, we went out.', 'being', 'Thời tiết đẹp nên chúng tôi ra ngoài.'],
      ['___ (All things considered / All thing considered), it was a success.', 'All things considered', 'Xét mọi mặt thì đã thành công.'],
      ['His work ___ (finished / finishing), he went home early.', 'finished', 'Xong việc, anh ấy về sớm.'],
      ['___ (With / By) the door locked, we could not get in.', 'With', 'Cửa khoá rồi nên chúng tôi không vào được.'],
      ['An absolute construction has ___ (its own subject / no subject).', 'its own subject', 'Cấu trúc tuyệt đối có chủ ngữ riêng của nó.'],
      ['___ (Weather permitting / Weather permitted), the match will go ahead.', 'Weather permitting', 'Nếu thời tiết cho phép, trận đấu sẽ diễn ra.'],
      ['The meeting ___ (over / was over), everyone went back to work.', 'over', 'Họp xong, ai nấy quay lại làm việc.'],
      ['This structure never has a ___ (dangling / passive) subject problem.', 'dangling', 'Cấu trúc này không bao giờ mắc lỗi chủ ngữ treo.'],
      ['___ (That said / That saying), the report still has weaknesses.', 'That said', 'Dù vậy, bản báo cáo vẫn còn điểm yếu.'],
      ['The tickets ___ (sold / selling) out, they went home disappointed.', 'sold', 'Vé bán hết rồi, họ thất vọng ra về.']
    ]
  },

  {
    slug: 'relative-whereby',
    en: 'whereby, wherein, whereupon',
    vi: 'Trạng từ quan hệ trang trọng — whereby, wherein, whereupon',
    level: 'C2',
    summary: 'Bộ ba của văn bản pháp lý và học thuật. Mỗi từ thay cho một cụm giới từ + which riêng, không dùng lẫn được.',
    formula: {
      rows: [
        ['whereby = by which', 'a system WHEREBY students can apply online (bằng cách nào)'],
        ['wherein = in which', 'the clause WHEREIN the terms are defined (ở trong đó)'],
        ['whereupon = after which', 'He resigned, WHEREUPON the board met. (rồi sau đó)'],
        ['Văn phong', 'Trang trọng, hợp hợp đồng và bài học thuật; văn thường thì dùng bản dài.']
      ],
      note: '"whereby" là từ hay bị dùng sai nhất trong ba từ: nó KHÔNG có nghĩa "ở đâu". Trước "whereby" phải là một danh từ chỉ cách thức, cơ chế, hệ thống — chỗ trả lời câu hỏi "bằng cách nào". Viết "the town whereby I grew up" là sai; chỗ đó phải là "where".'
    },
    signals: ['whereby', 'wherein', 'whereupon', 'văn bản pháp lý và học thuật'],
    useWhen: [
      'Mô tả cơ chế và quy trình trong văn bản trang trọng: "an arrangement whereby…".',
      'Hợp đồng và điều khoản: "the section wherein liability is limited".',
      'Văn kể trang trọng, nối hai sự việc nối đuôi nhau: "whereupon".'
    ],
    useNot: [
      { what: 'Không dùng "whereby" với nghĩa "ở đâu".', why: '"the town whereby I grew up" sai. "whereby" là "bằng cách đó"; nơi chốn thì dùng "where".' },
      { what: 'Không dùng bộ ba này trong văn nói hằng ngày.', why: 'Nghe rất kiểu cách. Nói chuyện thì "a system where you can apply online" tự nhiên hơn nhiều.' }
    ],
    confuse: [
      {
        with: '"whereby" khác "where"',
        tell: 'Danh từ đứng trước chỉ cách thức, cơ chế thì "whereby". Chỉ nơi chốn thì "where".',
        pair: [
          { en: 'They set up a system whereby students can apply online.', vi: 'Họ lập ra một cơ chế để sinh viên nộp hồ sơ trực tuyến (bằng cách đó).' },
          { en: 'This is the office where students apply.', vi: 'Đây là văn phòng nơi sinh viên nộp hồ sơ (nơi chốn).' }
        ]
      }
    ],
    errors: [
      { wrong: 'This is the town whereby I grew up.', right: 'This is the town where I grew up.', why: '"whereby" chỉ cách thức, không chỉ nơi chốn.' },
      { wrong: 'He resigned, whereby the board met the next day.', right: 'He resigned, whereupon the board met the next day.', why: 'Ý là "rồi sau đó" nên phải dùng "whereupon".' }
    ],
    examples: [
      ['They introduced a system whereby students can apply online.', 'Họ đưa vào một cơ chế để sinh viên nộp hồ sơ trực tuyến.', 1, '"whereby" bằng "by which" — trả lời câu hỏi bằng cách nào.'],
      ['Please read the clause wherein the terms are defined.', 'Xin đọc điều khoản trong đó có định nghĩa các thuật ngữ.', 1, '"wherein" bằng "in which", rất hay gặp trong hợp đồng.'],
      ['He resigned, whereupon the board met to choose a successor.', 'Ông ấy từ chức, ngay sau đó hội đồng họp để chọn người kế nhiệm.', 1, '"whereupon" nối hai việc nối đuôi nhau.'],
      ['This is the office where students apply.', 'Đây là văn phòng nơi sinh viên nộp hồ sơ.', 1, 'Đối chiếu cho rõ: nơi chốn thì dùng "where".'],
      ['This is the town whereby I grew up.', 'Đây là thị trấn tôi lớn lên.', 0, 'Sai: sửa thành "This is the town where I grew up."'],
      ['He resigned, whereby the board met the next day.', 'Ông ấy từ chức, ngay sau đó hội đồng họp.', 0, 'Sai: sửa thành "He resigned, whereupon the board met the next day."']
    ],
    practice: [
      ['They introduced a system ___ (whereby / where) students can apply online.', 'whereby', 'Họ đưa vào một cơ chế để sinh viên nộp hồ sơ trực tuyến.'],
      ['This is the town ___ (where / whereby) I grew up.', 'where', 'Đây là thị trấn tôi lớn lên.'],
      ['He resigned, ___ (whereupon / whereby) the board met.', 'whereupon', 'Ông ấy từ chức, ngay sau đó hội đồng họp.'],
      ['Please read the clause ___ (wherein / whereby) the terms are defined.', 'wherein', 'Xin đọc điều khoản trong đó có định nghĩa các thuật ngữ.'],
      ['"Whereby" means the same as ___ (by which / in which).', 'by which', 'Từ "whereby" mang nghĩa "bằng cách đó".'],
      ['They reached an arrangement ___ (whereby / wherein) each side paid half.', 'whereby', 'Họ đạt thoả thuận theo đó mỗi bên trả một nửa.'],
      ['"Wherein" means the same as ___ (in which / after which).', 'in which', 'Từ "wherein" mang nghĩa "ở trong đó".'],
      ['These words belong to ___ (formal / informal) writing.', 'formal', 'Nhóm từ này thuộc văn phong trang trọng.'],
      ['She signed the form, ___ (whereupon / whereby) the clerk stamped it.', 'whereupon', 'Cô ấy ký vào mẫu đơn, ngay sau đó nhân viên đóng dấu.'],
      ['A method ___ (whereby / where) costs can be reduced was proposed.', 'whereby', 'Một cách để giảm chi phí đã được đề xuất.']
    ]
  },

  {
    slug: 'relative-postponed',
    en: 'Postponed relative clauses',
    vi: 'Mệnh đề quan hệ tách khỏi danh từ nó bổ nghĩa',
    level: 'C2',
    summary: 'Bình thường mệnh đề quan hệ bám sát danh từ. Khi chủ ngữ ngắn mà mệnh đề dài, tiếng Anh cho phép đẩy mệnh đề xuống cuối câu cho đỡ nặng đầu.',
    formula: {
      rows: [
        ['Bình thường, bám sát', 'A man WHO I had never seen before came in.'],
        ['Đẩy xuống cuối', 'A man came in WHO I had never seen before.'],
        ['Khi nào đẩy được', 'Chủ ngữ ngắn, mệnh đề dài, và phần còn lại của câu rất ngắn.'],
        ['Điều kiện an toàn', 'Giữa danh từ và mệnh đề không được có danh từ nào khác cùng loại.']
      ],
      note: 'Đây là quyền chọn về nhịp câu chứ không phải luật. Chỉ đẩy khi câu nặng đầu và không sinh ra chỗ hiểu hai nghĩa. "A man came in with a dog who I had never seen before" là hỏng: người đọc không biết "who" trỏ vào người đàn ông hay con chó.'
    },
    signals: ['mệnh đề quan hệ đứng sau động từ chính', 'chủ ngữ ngắn, mệnh đề dài'],
    useWhen: [
      'Chủ ngữ ngắn mà mệnh đề quan hệ dài, để nguyên thì câu nặng đầu khó đọc.',
      'Văn kể: giữ nhịp cho hành động chính xuất hiện sớm.',
      'Khi phần còn lại của mệnh đề chính rất ngắn, chỉ một hai chữ.'
    ],
    useNot: [
      { what: 'Không đẩy khi giữa đường có danh từ khác chen vào.', why: '"A man came in with a dog who I had never seen before" hiểu hai nghĩa: "who" trỏ người hay trỏ chó?' },
      { what: 'Không đẩy khi mệnh đề chính còn dài.', why: 'Mệnh đề chính càng dài thì khoảng cách càng xa, người đọc quên mất mệnh đề quan hệ đang nói về danh từ nào.' }
    ],
    confuse: [
      {
        with: 'đẩy hợp lý khác đẩy gây hiểu nhầm',
        tell: 'Đếm xem giữa danh từ và mệnh đề quan hệ có danh từ nào khác không. Có thì đừng đẩy.',
        pair: [
          { en: 'A man came in who I had never seen before.', vi: 'Một người đàn ông tôi chưa gặp bao giờ bước vào (rõ ràng).' },
          { en: 'A man came in with a dog who I had never seen before.', vi: 'Hiểu hai nghĩa: chưa gặp người đàn ông hay chưa gặp con chó?' }
        ]
      }
    ],
    errors: [
      { wrong: 'A man came in with a dog who I had never seen before.', right: 'A man who I had never seen before came in with a dog.', why: 'Có danh từ "a dog" chen vào giữa nên câu hiểu hai nghĩa; trả mệnh đề về sát danh từ.' },
      { wrong: 'A book was published last year in Ha Noi by a small press which changed the field.', right: 'A book which changed the field was published last year in Ha Noi by a small press.', why: 'Mệnh đề chính quá dài, đẩy đi thì mất dấu danh từ được bổ nghĩa.' }
    ],
    examples: [
      ['A man came in who I had never seen before.', 'Một người đàn ông tôi chưa gặp bao giờ bước vào.', 1, 'Chủ ngữ ngắn, mệnh đề dài, phần còn lại chỉ hai chữ — đẩy được.'],
      ['A book was published which changed the field.', 'Một cuốn sách làm thay đổi cả ngành đã được xuất bản.', 1, 'Tránh chủ ngữ nặng đầu.'],
      ['A man who I had never seen before came in.', 'Một người đàn ông tôi chưa gặp bao giờ bước vào.', 1, 'Bản bám sát: luôn đúng, chỉ hơi nặng đầu.'],
      ['The time has come when we must decide.', 'Đã tới lúc chúng ta phải quyết định.', 1, 'Lối đẩy này đã thành nếp với "the time has come".'],
      ['A man came in with a dog who I had never seen before.', 'Một người đàn ông dắt chó bước vào.', 0, 'Sai: hiểu hai nghĩa, sửa thành "A man who I had never seen before came in with a dog."'],
      ['A book was published last year in Ha Noi by a small press which changed the field.', 'Một cuốn sách làm thay đổi cả ngành đã ra mắt năm ngoái ở Hà Nội.', 0, 'Sai: mệnh đề chính quá dài, sửa thành "A book which changed the field was published last year in Ha Noi by a small press."']
    ],
    practice: [
      ['A man came in ___ (who / which) I had never seen before.', 'who', 'Một người đàn ông tôi chưa gặp bao giờ bước vào.'],
      ['You should postpone the clause only when the subject is ___ (short / long).', 'short', 'Chỉ nên đẩy mệnh đề khi chủ ngữ ngắn.'],
      ['A book was published ___ (which / what) changed the field.', 'which', 'Một cuốn sách làm thay đổi cả ngành đã được xuất bản.'],
      ['The time has come ___ (when / where) we must decide.', 'when', 'Đã tới lúc chúng ta phải quyết định.'],
      ['Avoid postponing when another ___ (noun / verb) comes in between.', 'noun', 'Đừng đẩy khi có một danh từ khác chen vào giữa.'],
      ['Clearer version: "A man ___ (who I had never seen before came in / came in who I had never seen before) with a dog".', 'who I had never seen before came in', 'Bản rõ nghĩa hơn là trả mệnh đề về sát danh từ.'],
      ['Postponing is a matter of ___ (rhythm / grammar rules).', 'rhythm', 'Việc đẩy mệnh đề là chuyện nhịp câu chứ không phải luật ngữ pháp.'],
      ['A letter arrived ___ (which / who) nobody had expected.', 'which', 'Một lá thư không ai ngờ tới đã tới nơi.'],
      ['The day will come ___ (when / which) they regret it.', 'when', 'Rồi sẽ tới ngày họ hối hận.'],
      ['A student spoke up ___ (who / whose) nobody knew.', 'who', 'Một sinh viên không ai quen đã lên tiếng.']
    ]
  },

  {
    slug: 'concessive-formal',
    en: 'Formal concessive clauses',
    vi: 'Nhượng bộ trang trọng — Much as, Try as, Be that as it may',
    level: 'C2',
    summary: 'Ba mẫu cố định để nói "dù… vẫn…" theo lối trang trọng. Học nguyên khối, đừng cố suy ra từ ngữ pháp thường.',
    formula: {
      rows: [
        ['Much as + S + V', 'MUCH AS I admire her, I cannot agree. (dù rất khâm phục)'],
        ['Try as + S + might', 'TRY AS he might, he could not open it. (dù cố hết sức)'],
        ['Be that as it may', 'BE THAT AS IT MAY, we must decide today. (dù sao đi nữa)'],
        ['Vẫn cấm ghép đôi', 'Much as I admire her, BUT I cannot agree. → bỏ "but".']
      ],
      note: 'Ba mẫu này đều là mệnh đề phụ nhượng bộ, không phải phép nhấn mạnh — phần đảo ngữ để nhấn mạnh nằm ở nhóm riêng. Lưu ý "Try as he might" giữ nguyên chữ "might", không đổi sang "may" hay "could". Và lỗi "Although… but…" của bậc B1 vẫn theo lên tới đây: có "Much as" rồi thì không được thêm "but".'
    },
    signals: ['Much as', 'Try as … might', 'Be that as it may', 'văn phong trang trọng'],
    useWhen: [
      'Bài Viết: nhượng bộ một ý trước khi phản bác, giọng chững chạc.',
      'Nêu mình có thiện cảm nhưng vẫn không đồng tình: "Much as I like the idea, …".',
      '"Be that as it may" để gạt sang bên mọi điều vừa bàn rồi chốt lại.'
    ],
    useNot: [
      { what: 'Không thêm "but" vào vế sau.', why: '"Much as I admire her, but I cannot agree" sai — vẫn là lỗi ghép đôi liên từ, chỉ đổi sang bậc cao hơn.' },
      { what: 'Không đổi "might" trong "Try as he might".', why: 'Đây là cụm cố định. "Try as he could" hay "Try as he may" đều không phải dạng chuẩn.' }
    ],
    confuse: [
      {
        with: '"Much as" khác "As much as"',
        tell: '"Much as" đứng đầu câu là nhượng bộ, nghĩa "dù rất". "As much as" là so sánh về lượng.',
        pair: [
          { en: 'Much as I admire her, I cannot agree.', vi: 'Dù rất khâm phục cô ấy, tôi vẫn không đồng tình (nhượng bộ).' },
          { en: 'He earns as much as I do.', vi: 'Anh ấy kiếm được bằng tôi (so sánh về lượng).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Much as I admire her, but I cannot agree.', right: 'Much as I admire her, I cannot agree.', why: 'Lỗi ghép đôi liên từ: bỏ "but" đi.' },
      { wrong: 'Try as he could, he could not open it.', right: 'Try as he might, he could not open it.', why: 'Cụm cố định giữ nguyên "might".' }
    ],
    examples: [
      ['Much as I admire her work, I cannot agree with this conclusion.', 'Dù rất khâm phục công trình của cô ấy, tôi vẫn không đồng tình với kết luận này.', 1, 'Nhượng bộ trước rồi phản bác — giọng chững chạc của bài luận.'],
      ['Try as he might, he could not open the door.', 'Dù cố hết sức, anh ấy vẫn không mở được cửa.', 1, 'Cụm cố định, giữ nguyên "might".'],
      ['Be that as it may, we must decide today.', 'Dù sao đi nữa, hôm nay chúng ta phải quyết.', 1, 'Gạt sang bên mọi điều vừa bàn rồi chốt lại.'],
      ['Much as I like the idea, it is too expensive.', 'Dù rất thích ý tưởng này, nó vẫn quá đắt.', 1, 'Mẫu "Much as" hợp cả văn nói trang trọng.'],
      ['Much as I admire her, but I cannot agree.', 'Dù rất khâm phục cô ấy, tôi vẫn không đồng tình.', 0, 'Sai: sửa thành "Much as I admire her, I cannot agree."'],
      ['Try as he could, he could not open the door.', 'Dù cố hết sức, anh ấy vẫn không mở được cửa.', 0, 'Sai: sửa thành "Try as he might, he could not open the door."']
    ],
    practice: [
      ['___ (Much as / Much although) I admire her, I cannot agree.', 'Much as', 'Dù rất khâm phục cô ấy, tôi vẫn không đồng tình.'],
      ['Try as he ___ (might / could), he could not open the door.', 'might', 'Dù cố hết sức, anh ấy vẫn không mở được cửa.'],
      ['___ (Be that as it may / Be that as may), we must decide today.', 'Be that as it may', 'Dù sao đi nữa, hôm nay chúng ta phải quyết.'],
      ['Much as I admire her, ___ (I cannot agree / but I cannot agree).', 'I cannot agree', 'Dù rất khâm phục cô ấy, tôi vẫn không đồng tình.'],
      ['These patterns belong to ___ (formal / casual) style.', 'formal', 'Các mẫu này thuộc văn phong trang trọng.'],
      ['___ (Much as / As much as) I like the idea, it is too expensive.', 'Much as', 'Dù rất thích ý tưởng này, nó vẫn quá đắt.'],
      ['He earns ___ (as much as / much as) I do.', 'as much as', 'Anh ấy kiếm được bằng tôi.'],
      ['"Try as he might" is a ___ (fixed phrase / free structure).', 'fixed phrase', 'Cụm "try as he might" là cụm cố định.'],
      ['Try as they ___ (might / must), they never found the file.', 'might', 'Dù cố đến đâu, họ vẫn không tìm ra tệp đó.'],
      ['Much as she wanted to help, she ___ (had no time / but had no time).', 'had no time', 'Dù rất muốn giúp, cô ấy vẫn không có thời gian.']
    ]
  },

  {
    slug: 'clause-attachment',
    en: 'Clause attachment and ambiguity',
    vi: 'Mệnh đề gắn nhầm chỗ — chữa câu hiểu hai nghĩa',
    level: 'C2',
    summary: 'Mệnh đề bổ nghĩa bám vào danh từ gần nó nhất. Đặt sai chỗ là câu mang hai nghĩa mà người viết không hay biết.',
    formula: {
      rows: [
        ['Luật gần nhất', 'Mệnh đề bổ nghĩa bám vào danh từ ĐỨNG NGAY TRƯỚC nó.'],
        ['Câu hai nghĩa', 'the report on the shelf that I wrote — tôi viết báo cáo hay viết cái giá?'],
        ['Chữa bằng đổi chỗ', 'the report that I wrote on the shelf → hoặc: the report I wrote, which is on the shelf'],
        ['Trạng ngữ lấp lửng', 'She said on Monday she would call. — nói hôm thứ Hai, hay gọi hôm thứ Hai?']
      ],
      note: 'Chỗ này không phải lỗi ngữ pháp mà là lỗi diễn đạt: câu vẫn đúng luật, chỉ là mang hai nghĩa. Giám khảo chấm bài Viết coi đây là điểm trừ về sự rõ ràng. Ba cách chữa: đưa mệnh đề về sát danh từ nó bổ nghĩa, tách thành hai câu, hoặc thêm dấu phẩy để tách bạch tầng bổ nghĩa.'
    },
    signals: ['hai danh từ liền nhau rồi tới mệnh đề', 'trạng ngữ nằm giữa hai động từ', 'câu đọc được hai cách'],
    useWhen: [
      'Rà lại bài Viết trước khi nộp: chỗ nào có hai danh từ liền nhau thì soi kỹ.',
      'Văn bản hướng dẫn và hợp đồng: một câu hai nghĩa có thể gây tranh chấp thật.',
      'Bài Đọc: nhận ra chỗ tác giả cố ý hay vô tình để lấp lửng.'
    ],
    useNot: [
      { what: 'Không để mệnh đề cách xa danh từ nó bổ nghĩa.', why: 'Càng xa thì người đọc càng dễ gắn nhầm vào danh từ gần hơn.' },
      { what: 'Không để trạng ngữ đứng giữa hai động từ mà nó có thể bổ nghĩa cho cả hai.', why: '"She said on Monday she would call" đọc được hai cách. Đổi thành "On Monday she said she would call" là hết lấp lửng.' }
    ],
    confuse: [
      {
        with: 'câu rõ nghĩa khác câu hai nghĩa',
        tell: 'Thử đọc câu theo cách thứ hai xem có xuôi không. Xuôi cả hai cách thì câu đang lấp lửng, phải sửa.',
        pair: [
          { en: 'The report that I wrote is on the shelf.', vi: 'Bản báo cáo tôi viết đang ở trên giá (rõ một nghĩa).' },
          { en: 'The report on the shelf that I wrote is long.', vi: 'Lấp lửng: tôi viết bản báo cáo, hay tôi đóng cái giá?' }
        ]
      }
    ],
    errors: [
      { wrong: 'She said on Monday she would call.', right: 'On Monday she said she would call.', why: 'Trạng ngữ đứng giữa nên bổ nghĩa được cho cả "said" lẫn "would call".' },
      { wrong: 'He gave the book to the boy that was torn.', right: 'He gave the torn book to the boy.', why: 'Mệnh đề đứng sau "the boy" nên nghe như cậu bé bị rách; đưa nghĩa về sát danh từ đúng.' }
    ],
    examples: [
      ['The report that I wrote is on the shelf.', 'Bản báo cáo tôi viết đang ở trên giá.', 1, 'Mệnh đề bám ngay sau danh từ nó bổ nghĩa — rõ một nghĩa.'],
      ['On Monday she said she would call.', 'Hôm thứ Hai cô ấy nói sẽ gọi.', 1, 'Đưa trạng ngữ lên đầu là hết lấp lửng.'],
      ['He gave the torn book to the boy.', 'Anh ấy đưa cuốn sách bị rách cho cậu bé.', 1, 'Chuyển mệnh đề thành tính từ đứng trước danh từ — cách chữa gọn nhất.'],
      ['The report I wrote, which is on the shelf, is long.', 'Bản báo cáo tôi viết, hiện để trên giá, khá dài.', 1, 'Thêm dấu phẩy để tách bạch hai tầng bổ nghĩa.'],
      ['She said on Monday she would call.', 'Cô ấy nói hôm thứ Hai sẽ gọi.', 0, 'Sai: câu hai nghĩa, sửa thành "On Monday she said she would call."'],
      ['He gave the book to the boy that was torn.', 'Anh ấy đưa cuốn sách bị rách cho cậu bé.', 0, 'Sai: sửa thành "He gave the torn book to the boy."']
    ],
    practice: [
      ['A modifying clause attaches to the ___ (nearest / first) noun before it.', 'nearest', 'Mệnh đề bổ nghĩa bám vào danh từ gần nó nhất.'],
      ['Clearer: ___ (On Monday she said she would call / She said on Monday she would call).', 'On Monday she said she would call', 'Bản rõ nghĩa là đưa trạng ngữ lên đầu câu.'],
      ['Clearer: ___ (He gave the torn book to the boy / He gave the book to the boy that was torn).', 'He gave the torn book to the boy', 'Bản rõ nghĩa là đưa nghĩa "rách" về sát cuốn sách.'],
      ['A sentence with two possible readings is ___ (ambiguous / ungrammatical).', 'ambiguous', 'Câu đọc được hai cách là câu lấp lửng, không phải câu sai ngữ pháp.'],
      ['Clearer: ___ (The report I wrote is on the shelf / The report on the shelf that I wrote).', 'The report I wrote is on the shelf', 'Bản rõ nghĩa đặt mệnh đề ngay sau danh từ nó bổ nghĩa.'],
      ['One fix is to move the clause ___ (closer to / further from) its noun.', 'closer to', 'Một cách chữa là đưa mệnh đề lại gần danh từ của nó.'],
      ['Another fix is to add a ___ (comma / question mark) to separate the layers.', 'comma', 'Cách chữa khác là thêm dấu phẩy để tách bạch các tầng bổ nghĩa.'],
      ['Clearer: ___ (Wearing a red hat, the girl waved / The girl waved wearing a red hat).', 'Wearing a red hat, the girl waved', 'Bản rõ nghĩa đặt cụm phân từ ngay cạnh người đội mũ.'],
      ['This problem is a matter of ___ (clarity / spelling).', 'clarity', 'Đây là chuyện diễn đạt rõ ràng chứ không phải chính tả.'],
      ['Examiners treat an ambiguous sentence as a ___ (weakness / strength).', 'weakness', 'Giám khảo coi câu lấp lửng là điểm trừ.']
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
