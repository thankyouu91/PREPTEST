/**
 * Ngữ pháp — nhóm MỆNH ĐỀ QUAN HỆ và MỆNH ĐỀ PHỤ, phần bậc A2 và B1.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 29 điểm
 * (A2 ×3, B1 ×6, B2 ×8, C1 ×7, C2 ×5). Tệp này soạn 9 điểm của A2 và B1;
 * 8 điểm bậc B2 và 12 điểm bậc C1–C2 tách thành mục riêng trong hàng đợi.
 *
 * Nhóm này gộp hai loại mệnh đề phụ vì cùng một việc: GẮN THÊM MỘT MỆNH ĐỀ
 * vào câu chính. Mệnh đề quan hệ gắn vào một danh từ để nói rõ danh từ nào;
 * mệnh đề trạng ngữ gắn vào cả câu để nói khi nào, vì sao, để làm gì, dù gì.
 *
 * Vì sao khó với người Việt: tiếng Việt không có đại từ quan hệ. Chỗ tiếng Anh
 * dùng "who / which" thì tiếng Việt chỉ đặt cạnh nhau hoặc thêm "mà", nên người
 * học hoặc bỏ hẳn đại từ, hoặc lặp lại danh từ một lần nữa ("The man who he
 * lives next door"). Nặng hơn nữa là hai cặp liên từ: tiếng Việt nói
 * "Vì… nên…" và "Tuy… nhưng…" với ĐỦ CẢ HAI vế, còn tiếng Anh chỉ được dùng
 * MỘT. Hai lỗi "Because… so…" và "Although… but…" là dấu vân tay của người
 * Việt viết tiếng Anh, nên tệp này dựng hẳn hai điểm riêng để trị.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A2 ==================== */

  {
    slug: 'relative-who-which-that',
    en: 'Relative pronouns: who, which, that',
    vi: 'Đại từ quan hệ cơ bản — who, which, that',
    level: 'A2',
    summary: 'Nối hai câu về cùng một người hoặc một vật thành một câu. Đại từ quan hệ THAY CHO danh từ, nên không được nhắc lại danh từ đó nữa.',
    formula: {
      rows: [
        ['Người', 'who: The woman WHO lives next door is a doctor.'],
        ['Vật, con vật', 'which: This is the book WHICH changed my life.'],
        ['Dùng được cả hai', 'that: The bus THAT goes to the airport leaves at six.'],
        ['Ghép hai câu', 'I know a man. + He speaks five languages. → I know a man WHO speaks five languages.']
      ],
      note: 'Động từ trong mệnh đề quan hệ chia theo DANH TỪ ĐỨNG TRƯỚC, không chia theo "who". Danh từ số nhiều thì động từ số nhiều: "the people who LIVE here", còn số ít thì "the man who LIVES here".'
    },
    signals: ['who', 'which', 'that', 'nối hai câu cùng nói về một người hoặc một vật'],
    useWhen: [
      'Muốn nói rõ đang nhắc tới người nào, vật nào trong nhiều người, nhiều vật.',
      'Ghép hai câu ngắn lặp danh từ thành một câu gọn hơn.',
      'Định nghĩa hoặc mô tả: "A dentist is a doctor who looks after your teeth."'
    ],
    useNot: [
      { what: 'Không nhắc lại danh từ hay đại từ sau đại từ quan hệ.', why: '"The man who he lives next door" sai vì "who" đã thay cho "the man" rồi. Tiếng Việt nói "người đàn ông mà ông ấy sống cạnh nhà" nghe được, tiếng Anh thì không.' },
      { what: 'Không dùng "who" cho vật hay "which" cho người.', why: '"The book who I read" và "the woman which called" đều sai. Người là "who", vật là "which", còn "that" thì dùng được cả hai.' }
    ],
    confuse: [
      {
        with: '"who" khác "which"',
        tell: 'Hỏi: danh từ đứng trước là người hay vật? Người thì "who", vật thì "which". Bí thì "that" thay được cả hai trong mệnh đề xác định.',
        pair: [
          { en: 'The woman who called you is my boss.', vi: 'Người phụ nữ gọi cho bạn là sếp của tôi.' },
          { en: 'The phone which rang was mine.', vi: 'Cái điện thoại vừa reo là của tôi.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The man who he lives next door is a doctor.', right: 'The man who lives next door is a doctor.', why: '"who" đã thay cho "the man" nên bỏ "he" đi.' },
      { wrong: 'I have a friend who speak five languages.', right: 'I have a friend who speaks five languages.', why: 'Động từ chia theo "a friend" số ít nên phải là "speaks".' }
    ],
    examples: [
      ['The woman who lives next door is a doctor.', 'Người phụ nữ sống cạnh nhà là bác sĩ.', 1, '"who" cho người, thay luôn cho "the woman".'],
      ['This is the book which changed my life.', 'Đây là cuốn sách đã thay đổi đời tôi.', 1, '"which" cho vật.'],
      ['The bus that goes to the airport leaves at six.', 'Chuyến xe buýt đi sân bay khởi hành lúc sáu giờ.', 1, '"that" dùng được cho cả người lẫn vật.'],
      ['The people who work here are very friendly.', 'Những người làm việc ở đây rất thân thiện.', 1, 'Danh từ số nhiều nên động từ là "work", không phải "works".'],
      ['The man who he lives next door is a doctor.', 'Người đàn ông sống cạnh nhà là bác sĩ.', 0, 'Sai: sửa thành "The man who lives next door is a doctor."'],
      ['The book who I read was excellent.', 'Cuốn sách tôi đọc rất hay.', 0, 'Sai: sửa thành "The book which I read was excellent."']
    ],
    practice: [
      ['The woman ___ (who / which) lives next door is a doctor.', 'who', 'Người phụ nữ sống cạnh nhà là bác sĩ.'],
      ['This is the book ___ (which / who) changed my life.', 'which', 'Đây là cuốn sách đã thay đổi đời tôi.'],
      ['The people ___ (who / which) work here are very friendly.', 'who', 'Những người làm việc ở đây rất thân thiện.'],
      ['I have a friend ___ (who / whose) speaks five languages.', 'who', 'Tôi có một người bạn nói được năm thứ tiếng.'],
      ['The bus ___ (that / who) goes to the airport leaves at six.', 'that', 'Chuyến xe buýt đi sân bay khởi hành lúc sáu giờ.'],
      ['The man ___ (who / who he) called you is my boss.', 'who', 'Người đàn ông gọi cho bạn là sếp của tôi.'],
      ['Do you know the girl ___ (who / which) won the prize?', 'who', 'Bạn có biết cô gái đã giành giải không?'],
      ['The film ___ (that / that it) won the award was Vietnamese.', 'that', 'Bộ phim đoạt giải là phim Việt Nam.'],
      ['Students ___ (who / which) arrive late must sign the register.', 'who', 'Sinh viên đến muộn phải ký vào sổ.'],
      ['The phone ___ (which / who) I bought last year still works.', 'which', 'Cái điện thoại tôi mua năm ngoái vẫn chạy tốt.']
    ]
  },

  {
    slug: 'adverbial-time-basic',
    en: 'Time clauses: when, before, after, while, until',
    vi: 'Mệnh đề chỉ thời gian — when, before, after, while, until',
    level: 'A2',
    summary: 'Nói việc gì xảy ra lúc nào so với việc khác. Luật xương sống: SAU LIÊN TỪ CHỈ THỜI GIAN KHÔNG DÙNG "WILL", dù nghĩa là chuyện tương lai.',
    formula: {
      rows: [
        ['Cùng lúc', 'when / while: While I was cooking, he was cleaning.'],
        ['Trước, sau', 'before / after: Before you leave, turn off the lights.'],
        ['Cho tới khi', 'until: We will wait here until the rain stops.'],
        ['Ngay khi', 'as soon as: As soon as the film ends, we can go home.'],
        ['Luật thì', 'Chuyện tương lai: mệnh đề chính dùng "will", mệnh đề thời gian dùng HIỆN TẠI ĐƠN.']
      ],
      note: 'Vì sao không có "will": bản thân liên từ đã đánh dấu thời gian rồi nên tiếng Anh không đánh dấu thêm lần nữa. "I will call you when I arrive" — "when" đã lo phần tương lai, "arrive" chia hiện tại. Dấu phẩy chỉ đặt khi mệnh đề thời gian đứng TRƯỚC.'
    },
    signals: ['when', 'while', 'before', 'after', 'until', 'as soon as'],
    useWhen: [
      'Kể chuỗi việc theo thứ tự thời gian.',
      'Hẹn hò, dặn dò: "Call me when you get there."',
      'Tả hai việc diễn ra song song: "while" đi với thì tiếp diễn rất hợp.'
    ],
    useNot: [
      { what: 'Không dùng "will" sau when, before, after, until, as soon as.', why: '"I will call you when I will arrive" sai. Mệnh đề thời gian chia hiện tại đơn: "when I arrive".' },
      { what: 'Không đặt dấu phẩy khi mệnh đề thời gian đứng sau.', why: '"I will call you, when I arrive" thừa dấu phẩy. Chỉ có dấu phẩy khi đảo lên trước: "When I arrive, I will call you."' }
    ],
    confuse: [
      {
        with: '"while" khác "when"',
        tell: '"while" là trong suốt khoảng thời gian đó, hay đi với thì tiếp diễn. "when" là tại thời điểm đó, hay đi với thì đơn.',
        pair: [
          { en: 'While I was cooking, the phone rang.', vi: 'Trong lúc tôi đang nấu ăn thì điện thoại reo.' },
          { en: 'When the phone rang, I answered it.', vi: 'Khi điện thoại reo, tôi bắt máy.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I will call you when I will arrive.', right: 'I will call you when I arrive.', why: 'Sau liên từ chỉ thời gian không dùng "will".' },
      { wrong: 'We will wait until the rain will stop.', right: 'We will wait until the rain stops.', why: 'Mệnh đề sau "until" chia hiện tại đơn.' }
    ],
    examples: [
      ['I will call you when I arrive.', 'Tôi sẽ gọi cho bạn khi tôi tới nơi.', 1, 'Mệnh đề chính có "will", mệnh đề thời gian chia hiện tại đơn.'],
      ['Before you leave, please turn off the lights.', 'Trước khi đi, làm ơn tắt đèn.', 1, 'Mệnh đề thời gian đứng trước nên có dấu phẩy.'],
      ['While I was cooking, the phone rang.', 'Trong lúc tôi đang nấu ăn thì điện thoại reo.', 1, '"while" hợp với thì tiếp diễn: một việc kéo dài, một việc chen vào.'],
      ['We will wait here until the rain stops.', 'Chúng ta sẽ đợi ở đây cho tới khi tạnh mưa.', 1, 'Sau "until" cũng chia hiện tại đơn.'],
      ['I will call you when I will arrive.', 'Tôi sẽ gọi cho bạn khi tôi tới nơi.', 0, 'Sai: sửa thành "I will call you when I arrive."'],
      ['We will wait until the rain will stop.', 'Chúng ta sẽ đợi cho tới khi tạnh mưa.', 0, 'Sai: sửa thành "We will wait until the rain stops."']
    ],
    practice: [
      ['I will call you when I ___ (arrive / will arrive).', 'arrive', 'Tôi sẽ gọi cho bạn khi tôi tới nơi.'],
      ['___ (Before / After) you leave, please turn off the lights.', 'Before', 'Trước khi đi, làm ơn tắt đèn.'],
      ['She was cooking ___ (while / until) I was cleaning the house.', 'while', 'Cô ấy nấu ăn trong lúc tôi dọn nhà.'],
      ['We will wait here ___ (until / while) the rain stops.', 'until', 'Chúng ta sẽ đợi ở đây cho tới khi tạnh mưa.'],
      ['As soon as the film ___ (ends / will end), we can go home.', 'ends', 'Ngay khi phim hết, chúng ta có thể về.'],
      ['___ (After / Until) I finished my homework, I watched TV.', 'After', 'Sau khi làm xong bài tập, tôi xem tivi.'],
      ['Call me when you ___ (get / will get) there.', 'get', 'Gọi cho tôi khi bạn tới nơi nhé.'],
      ['He fell asleep ___ (while / before) he was watching the match.', 'while', 'Anh ấy ngủ gật trong lúc đang xem trận đấu.'],
      ['I will stay here ___ (until / when) you come back.', 'until', 'Tôi sẽ ở đây cho tới khi bạn quay lại.'],
      ['When the bell ___ (rings / will ring), everyone must leave.', 'rings', 'Khi chuông reo, mọi người phải rời khỏi phòng.']
    ]
  },

  {
    slug: 'adverbial-reason-basic',
    en: 'Reason and result: because, because of, so',
    vi: 'Mệnh đề chỉ nguyên nhân và kết quả — because, because of, so',
    level: 'A2',
    summary: 'Nói vì sao. Đây là chỗ người Việt sai nhiều nhất cả khu ngữ pháp: tiếng Việt nói "Vì… nên…" đủ hai vế, tiếng Anh chỉ được dùng MỘT.',
    formula: {
      rows: [
        ['because + MỆNH ĐỀ', 'We stayed at home because it was raining.'],
        ['because of + DANH TỪ', 'The match was cancelled because of the rain.'],
        ['so + KẾT QUẢ', 'It was late, so we took a taxi.'],
        ['CẤM ghép đôi', 'Because it was raining, SO we stayed home. → bỏ "so" đi.']
      ],
      note: 'Nhớ cho chắc: "because" mở ra NGUYÊN NHÂN, "so" mở ra KẾT QUẢ. Một câu chỉ cần một trong hai. Tiếng Việt "Vì trời mưa nên chúng tôi ở nhà" có cả "vì" lẫn "nên", còn tiếng Anh phải chọn: "Because it was raining, we stayed home" HOẶC "It was raining, so we stayed home".'
    },
    signals: ['because', 'because of', 'so', 'vì sao', 'kết quả'],
    useWhen: [
      'Giải thích lý do trong văn nói và văn viết hằng ngày.',
      'Nối nguyên nhân với kết quả trong một câu thay vì viết hai câu rời.',
      'Trả lời câu hỏi "Why…?" — câu trả lời thường mở đầu bằng "Because…".'
    ],
    useNot: [
      { what: 'Không dùng "because" và "so" trong cùng một câu.', why: 'Đây là lỗi bê nguyên "Vì… nên…" của tiếng Việt. "Because it rained, so we stayed home" sai; bỏ một trong hai.' },
      { what: 'Không dùng "because of" trước một mệnh đề.', why: '"because of it was raining" sai. "because of" đi với DANH TỪ ("because of the rain"), còn mệnh đề thì dùng "because".' }
    ],
    confuse: [
      {
        with: '"because" khác "because of"',
        tell: 'Nhìn ngay sau nó: có chủ ngữ và động từ thì dùng "because"; chỉ có danh từ thì dùng "because of".',
        pair: [
          { en: 'We stayed at home because it was raining.', vi: 'Chúng tôi ở nhà vì trời đang mưa (theo sau là mệnh đề).' },
          { en: 'We stayed at home because of the rain.', vi: 'Chúng tôi ở nhà vì mưa (theo sau là danh từ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Because it was raining, so we stayed at home.', right: 'Because it was raining, we stayed at home.', why: 'Tiếng Anh chỉ dùng một liên từ; bỏ "so" đi.' },
      { wrong: 'The match was cancelled because of it was raining.', right: 'The match was cancelled because it was raining.', why: 'Theo sau là mệnh đề nên dùng "because", không dùng "because of".' }
    ],
    examples: [
      ['We stayed at home because it was raining.', 'Chúng tôi ở nhà vì trời đang mưa.', 1, '"because" + mệnh đề đủ chủ ngữ và động từ.'],
      ['The match was cancelled because of the rain.', 'Trận đấu bị huỷ vì mưa.', 1, '"because of" + danh từ.'],
      ['It was late, so we took a taxi.', 'Trời muộn rồi nên chúng tôi bắt taxi.', 1, '"so" mở ra kết quả, đứng sau dấu phẩy.'],
      ['She studied hard, so she passed the exam.', 'Cô ấy học chăm nên đã đỗ kỳ thi.', 1, 'Một liên từ là đủ, không thêm "because" ở đầu câu.'],
      ['Because it was raining, so we stayed at home.', 'Vì trời mưa nên chúng tôi ở nhà.', 0, 'Sai: sửa thành "Because it was raining, we stayed at home."'],
      ['He was late because of the traffic was bad.', 'Anh ấy tới muộn vì đường tắc.', 0, 'Sai: sửa thành "He was late because the traffic was bad."']
    ],
    practice: [
      ['We stayed at home ___ (because / because of) it was raining.', 'because', 'Chúng tôi ở nhà vì trời đang mưa.'],
      ['The match was cancelled ___ (because of / because) the rain.', 'because of', 'Trận đấu bị huỷ vì mưa.'],
      ['It was late, ___ (so / because) we took a taxi.', 'so', 'Trời muộn rồi nên chúng tôi bắt taxi.'],
      ['___ (Because / Because so) she was tired, she went to bed early.', 'Because', 'Vì mệt nên cô ấy đi ngủ sớm.'],
      ['He was late ___ (because of / because) the heavy traffic.', 'because of', 'Anh ấy tới muộn vì đường tắc nặng.'],
      ['I could not sleep ___ (because / so) the noise was terrible.', 'because', 'Tôi không ngủ được vì tiếng ồn kinh khủng.'],
      ['She studied hard, ___ (so / because) she passed the exam.', 'so', 'Cô ấy học chăm nên đã đỗ kỳ thi.'],
      ['Because it was cold, ___ (we stayed inside / so we stayed inside).', 'we stayed inside', 'Vì trời lạnh nên chúng tôi ở trong nhà.'],
      ['The shop closed ___ (because of / because) low sales.', 'because of', 'Cửa hàng đóng cửa vì doanh thu thấp.'],
      ['We missed the train, ___ (so / because) we waited an hour.', 'so', 'Chúng tôi lỡ tàu nên phải đợi một tiếng.']
    ]
  },

  /* ==================== B1 ==================== */

  {
    slug: 'relative-defining-nondefining',
    en: 'Defining and non-defining relative clauses',
    vi: 'Mệnh đề quan hệ xác định và không xác định — hai dấu phẩy đổi cả nghĩa',
    level: 'B1',
    summary: 'Có dấu phẩy hay không không phải chuyện trình bày mà là chuyện NGHĨA. Mệnh đề xác định cho biết đang nói người nào; mệnh đề không xác định chỉ kể thêm.',
    formula: {
      rows: [
        ['Xác định, KHÔNG phẩy', 'My sister who lives in Hue is a nurse. (tôi có nhiều chị em)'],
        ['Không xác định, CÓ phẩy', 'My sister, who lives in Hue, is a nurse. (tôi chỉ có một)'],
        ['"that" chỉ dùng cho xác định', 'Ha Noi, WHICH is the capital,… — không được viết "that".'],
        ['Không xác định: cấm lược bỏ', 'The book, which I borrowed, was long. — không bỏ "which" được.']
      ],
      note: 'Mẹo đọc: thử bỏ hẳn mệnh đề đi. Bỏ mà vẫn biết đang nói ai thì đó là mệnh đề không xác định, phải có phẩy. Bỏ mà không biết đang nói ai nữa thì là xác định, không phẩy. Tên riêng (Ha Noi, Shakespeare) vốn đã xác định rồi nên luôn đi với phẩy.'
    },
    signals: ['dấu phẩy quanh mệnh đề', 'tên riêng đứng trước', 'that không dùng được'],
    useWhen: [
      'Xác định: khi người nghe chưa biết đang nói tới ai, cái nào trong nhiều thứ.',
      'Không xác định: khi đã rõ đối tượng rồi, chỉ kể thêm một thông tin phụ.',
      'Văn viết trang trọng và bài Đọc: dấu phẩy là manh mối để hiểu đúng ý tác giả.'
    ],
    useNot: [
      { what: 'Không dùng "that" trong mệnh đề không xác định.', why: '"Ha Noi, that is the capital, …" sai. Sau dấu phẩy chỉ dùng "who" hoặc "which".' },
      { what: 'Không lược bỏ đại từ quan hệ trong mệnh đề không xác định.', why: '"My father, I love very much, is 70" sai. Chỉ mệnh đề xác định mới được bỏ đại từ.' }
    ],
    confuse: [
      {
        with: 'có phẩy khác không phẩy',
        tell: 'Hai câu chữ giống hệt nhau mà nghĩa khác hẳn. Đếm thử: có phẩy là chỉ có một, không phẩy là có nhiều.',
        pair: [
          { en: 'My sister who lives in Hue is a nurse.', vi: 'Người chị sống ở Huế của tôi là y tá (tôi có nhiều chị em, đây là người ở Huế).' },
          { en: 'My sister, who lives in Hue, is a nurse.', vi: 'Chị tôi, người sống ở Huế, là y tá (tôi chỉ có một người chị).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Ha Noi, that is the capital, has millions of people.', right: 'Ha Noi, which is the capital, has millions of people.', why: 'Mệnh đề không xác định không dùng "that".' },
      { wrong: 'My father who is seventy still works every day.', right: 'My father, who is seventy, still works every day.', why: 'Ai cũng chỉ có một bố nên đây là thông tin kể thêm, phải có hai dấu phẩy.' }
    ],
    examples: [
      ['My sister who lives in Hue is a nurse.', 'Người chị sống ở Huế của tôi là y tá.', 1, 'Không phẩy: tôi có nhiều chị em, mệnh đề này để chỉ ra người nào.'],
      ['My sister, who lives in Hue, is a nurse.', 'Chị tôi, người sống ở Huế, là y tá.', 1, 'Có phẩy: tôi chỉ có một người chị, chỗ này chỉ kể thêm.'],
      ['Ha Noi, which is the capital, has millions of people.', 'Hà Nội, thủ đô của cả nước, có hàng triệu dân.', 1, 'Tên riêng vốn đã xác định nên luôn đi với dấu phẩy.'],
      ['The book that I borrowed from you was excellent.', 'Cuốn sách tôi mượn của bạn rất hay.', 1, 'Xác định: cần mệnh đề này mới biết là cuốn nào.'],
      ['Ha Noi, that is the capital, has millions of people.', 'Hà Nội, thủ đô của cả nước, có hàng triệu dân.', 0, 'Sai: sửa thành "Ha Noi, which is the capital, has millions of people."'],
      ['My father who is seventy still works every day.', 'Bố tôi, năm nay bảy mươi, vẫn đi làm hằng ngày.', 0, 'Sai: ai cũng chỉ có một bố, sửa thành "My father, who is seventy, still works every day."']
    ],
    practice: [
      ['My brother, ___ (who / that) lives in Hue, is a teacher.', 'who', 'Anh tôi, người sống ở Huế, là giáo viên.'],
      ['Ha Noi, ___ (which / that) is the capital, has millions of people.', 'which', 'Hà Nội, thủ đô của cả nước, có hàng triệu dân.'],
      ['"My sister who lives in Hue is a nurse" means I have ___ (more than one sister / only one sister).', 'more than one sister', 'Câu không có dấu phẩy nghĩa là tôi có nhiều chị em.'],
      ['"My sister, who lives in Hue, is a nurse" means I have ___ (only one sister / more than one sister).', 'only one sister', 'Câu có dấu phẩy nghĩa là tôi chỉ có một người chị.'],
      ['Da Nang, ___ (which / that) I visited last year, is beautiful.', 'which', 'Đà Nẵng, nơi tôi tới thăm năm ngoái, rất đẹp.'],
      ['In a non-defining clause you ___ (cannot / can) use "that".', 'cannot', 'Trong mệnh đề không xác định thì không dùng được "that".'],
      ['In a non-defining clause the pronoun ___ (cannot be omitted / can be omitted).', 'cannot be omitted', 'Trong mệnh đề không xác định thì không được lược bỏ đại từ quan hệ.'],
      ['My father, ___ (who / that) is seventy, still works every day.', 'who', 'Bố tôi, năm nay bảy mươi, vẫn đi làm hằng ngày.'],
      ['The house ___ (that / who) we bought needs a lot of repairs.', 'that', 'Căn nhà chúng tôi mua cần sửa nhiều.'],
      ['Shakespeare, ___ (who / that) wrote Hamlet, died in 1616.', 'who', 'Shakespeare, tác giả của Hamlet, mất năm 1616.']
    ]
  },

  {
    slug: 'relative-whose',
    en: 'whose: the possessive relative',
    vi: 'Đại từ quan hệ sở hữu — whose',
    level: 'B1',
    summary: 'Thay cho "của người ấy", "của cái ấy". Dùng được cho CẢ người lẫn vật, và luôn có một danh từ đi ngay sau.',
    formula: {
      rows: [
        ['Người', 'That is the man WHOSE car was stolen.'],
        ['Vật', 'We stayed in a house WHOSE roof was made of straw.'],
        ['Luôn có danh từ theo sau', 'whose + DANH TỪ, không bao giờ đứng một mình.'],
        ['Ghép hai câu', 'I met a woman. + Her son is a pilot. → I met a woman WHOSE son is a pilot.']
      ],
      note: 'Đừng lẫn "whose" với "who\'s". "whose" là sở hữu (của ai), còn "who\'s" là viết tắt của "who is" hoặc "who has". Đọc giống hệt nhau nên chỉ phân biệt được khi viết: sau "whose" là danh từ, sau "who\'s" là động từ hoặc tính từ.'
    },
    signals: ['whose + danh từ', 'của người ấy', 'của cái ấy'],
    useWhen: [
      'Nói về cái gì đó thuộc về người hoặc vật vừa nhắc tới.',
      'Ghép hai câu mà câu sau mở đầu bằng "his", "her", "its", "their".',
      'Văn viết trang trọng: "the company whose products we tested".'
    ],
    useNot: [
      { what: 'Không dùng "who" rồi thêm "his" hay "her".', why: '"The man who his car was stolen" sai. "whose" đã gánh cả phần sở hữu: "The man whose car was stolen".' },
      { what: 'Không viết "who\'s" thay cho "whose".', why: '"The man who\'s car was stolen" sai chính tả. Sau "whose" là danh từ, sau "who\'s" là động từ.' }
    ],
    confuse: [
      {
        with: '"whose" khác "who"',
        tell: 'Sau "whose" luôn có ngay một danh từ. Sau "who" là động từ.',
        pair: [
          { en: 'The student who won the prize is my friend.', vi: 'Bạn sinh viên giành giải là bạn tôi (chính người ấy giành giải).' },
          { en: 'The student whose essay won the prize is my friend.', vi: 'Bạn sinh viên có bài luận giành giải là bạn tôi (bài luận của người ấy giành giải).' }
        ]
      }
    ],
    errors: [
      { wrong: 'That is the man who his car was stolen.', right: 'That is the man whose car was stolen.', why: '"whose" đã bao gồm nghĩa sở hữu nên bỏ "his" đi.' },
      { wrong: 'I know a boy who\'s sister is a pilot.', right: 'I know a boy whose sister is a pilot.', why: '"who\'s" là "who is"; sở hữu phải viết "whose".' }
    ],
    examples: [
      ['That is the man whose car was stolen.', 'Kia là người đàn ông bị mất trộm xe.', 1, '"whose" thay cho "his", đi kèm danh từ "car".'],
      ['I met a woman whose son plays for the national team.', 'Tôi gặp một người phụ nữ có con trai chơi cho đội tuyển quốc gia.', 1, 'Ghép hai câu: câu sau vốn mở đầu bằng "her son".'],
      ['We stayed in a house whose roof was made of straw.', 'Chúng tôi ở trong một ngôi nhà mái lợp rơm.', 1, '"whose" dùng được cho cả vật, không riêng gì người.'],
      ['The student whose phone rang had to leave the room.', 'Bạn sinh viên có điện thoại reo phải ra khỏi phòng.', 1, 'Không phải bạn ấy reo mà cái điện thoại của bạn ấy reo.'],
      ['That is the man who his car was stolen.', 'Kia là người đàn ông bị mất trộm xe.', 0, 'Sai: sửa thành "That is the man whose car was stolen."'],
      ['I know a boy who\'s sister is a pilot.', 'Tôi biết một cậu bé có chị làm phi công.', 0, 'Sai: sửa thành "I know a boy whose sister is a pilot."']
    ],
    practice: [
      ['That is the man ___ (whose / who) car was stolen.', 'whose', 'Kia là người đàn ông bị mất trộm xe.'],
      ['I met a woman ___ (whose / who) son plays for the national team.', 'whose', 'Tôi gặp một người phụ nữ có con trai chơi cho đội tuyển quốc gia.'],
      ['We stayed in a house ___ (whose / which) roof was made of straw.', 'whose', 'Chúng tôi ở trong một ngôi nhà mái lợp rơm.'],
      ['The student ___ (whose / who) phone rang had to leave.', 'whose', 'Bạn sinh viên có điện thoại reo phải ra ngoài.'],
      ['She has a friend ___ (whose / who) parents own a restaurant.', 'whose', 'Cô ấy có người bạn mà bố mẹ mở nhà hàng.'],
      ['The word ___ (whose / who) is used for people and things alike.', 'whose', 'Từ "whose" dùng được cho cả người lẫn vật.'],
      ['The company ___ (whose / which) products we tested has closed.', 'whose', 'Công ty mà chúng tôi thử sản phẩm đã đóng cửa.'],
      ['He is the author ___ (whose / who) book won the prize.', 'whose', 'Ông ấy là tác giả có cuốn sách đoạt giải.'],
      ['I know a boy ___ (whose / who) sister is a pilot.', 'whose', 'Tôi biết một cậu bé có chị làm phi công.'],
      ['The village ___ (whose / where) name I forgot was very small.', 'whose', 'Ngôi làng mà tôi quên mất tên rất nhỏ.']
    ]
  },

  {
    slug: 'relative-where-when-why',
    en: 'Relative adverbs: where, when, why',
    vi: 'Trạng từ quan hệ — where, when, why',
    level: 'B1',
    summary: 'Khi danh từ đứng trước là nơi chốn, thời gian hay lý do thì dùng thẳng where, when, why cho gọn, khỏi phải viết giới từ + which.',
    formula: {
      rows: [
        ['Nơi chốn', 'where = in / at which: the town WHERE I grew up'],
        ['Thời gian', 'when = on / in which: the day WHEN we met'],
        ['Lý do', 'why = for which: the reason WHY he left'],
        ['Bản trang trọng', 'the town IN WHICH I grew up — cùng nghĩa, trang trọng hơn.']
      ],
      note: 'Vì "where" đã gánh sẵn giới từ nên KHÔNG thêm giới từ lần nữa ở cuối. Viết "the town where I grew up in" là thừa. Chọn một trong hai: "the town where I grew up" hoặc "the town which I grew up in".'
    },
    signals: ['where', 'when', 'why', 'danh từ chỉ nơi chốn hoặc thời gian đứng trước'],
    useWhen: [
      'Danh từ đứng trước chỉ nơi chốn: town, house, office, country, place.',
      'Danh từ đứng trước chỉ thời gian: day, year, moment, season, time.',
      'Sau "the reason" thì dùng "why" — hoặc bỏ luôn cũng được: "the reason he left".'
    ],
    useNot: [
      { what: 'Không thêm giới từ ở cuối khi đã dùng "where".', why: '"the town where I grew up in" thừa chữ "in", vì "where" đã có sẵn nghĩa "in which".' },
      { what: 'Không dùng "where" khi danh từ đứng trước không phải nơi chốn.', why: '"the book where I read" sai. Chỉ dùng "where" khi trước nó thật sự là một địa điểm.' }
    ],
    confuse: [
      {
        with: '"where" khác "which"',
        tell: 'Hỏi: mệnh đề sau có thiếu tân ngữ không? Thiếu thì dùng "which"; đủ rồi mà chỉ thiếu thông tin nơi chốn thì dùng "where".',
        pair: [
          { en: 'The hotel where we stayed was cheap.', vi: 'Khách sạn chúng tôi ở khá rẻ (ở TẠI khách sạn đó).' },
          { en: 'The hotel which we booked was cheap.', vi: 'Khách sạn chúng tôi đặt khá rẻ (đặt CHÍNH khách sạn đó).' }
        ]
      }
    ],
    errors: [
      { wrong: 'This is the town where I grew up in.', right: 'This is the town where I grew up.', why: '"where" đã mang nghĩa "in which" nên bỏ "in" ở cuối.' },
      { wrong: 'I remember the day where we first met.', right: 'I remember the day when we first met.', why: '"day" là thời gian nên dùng "when", không dùng "where".' }
    ],
    examples: [
      ['This is the town where I grew up.', 'Đây là thị trấn tôi lớn lên.', 1, '"where" thay cho "in which", không thêm giới từ nữa.'],
      ['I remember the day when we first met.', 'Tôi nhớ cái ngày chúng ta gặp nhau lần đầu.', 1, 'Danh từ chỉ thời gian thì dùng "when".'],
      ['That is the reason why he left the company.', 'Đó là lý do anh ấy rời công ty.', 1, 'Sau "the reason" dùng "why"; bỏ hẳn "why" cũng được.'],
      ['The town in which I grew up has changed a lot.', 'Thị trấn tôi lớn lên đã thay đổi nhiều.', 1, 'Bản trang trọng của "where", hay gặp trong văn viết.'],
      ['This is the town where I grew up in.', 'Đây là thị trấn tôi lớn lên.', 0, 'Sai: sửa thành "This is the town where I grew up."'],
      ['I remember the day where we first met.', 'Tôi nhớ cái ngày chúng ta gặp nhau lần đầu.', 0, 'Sai: sửa thành "I remember the day when we first met."']
    ],
    practice: [
      ['This is the town ___ (where / which) I grew up.', 'where', 'Đây là thị trấn tôi lớn lên.'],
      ['I remember the day ___ (when / where) we first met.', 'when', 'Tôi nhớ cái ngày chúng ta gặp nhau lần đầu.'],
      ['That is the reason ___ (why / where) he left.', 'why', 'Đó là lý do anh ấy rời đi.'],
      ['The hotel ___ (where / which) we stayed was cheap.', 'where', 'Khách sạn chúng tôi ở khá rẻ.'],
      ['1975 was the year ___ (when / where) the war ended.', 'when', 'Năm 1975 là năm chiến tranh kết thúc.'],
      ['The office ___ (where / which) she works is near the river.', 'where', 'Văn phòng cô ấy làm việc ở gần sông.'],
      ['Do you know a shop ___ (where / when) I can buy stamps?', 'where', 'Bạn có biết cửa hàng nào bán tem không?'],
      ['Summer is the season ___ (when / where) most people travel.', 'when', 'Mùa hè là mùa nhiều người đi du lịch nhất.'],
      ['This is the house ___ (where / which) I was born.', 'where', 'Đây là ngôi nhà tôi sinh ra.'],
      ['The correct form is "the town ___ (where I grew up / where I grew up in)".', 'where I grew up', 'Cách viết đúng là "the town where I grew up", không thêm "in" ở cuối.']
    ]
  },

  {
    slug: 'relative-omit-object',
    en: 'Omitting the relative pronoun',
    vi: 'Lược bỏ đại từ quan hệ — bỏ được khi nào',
    level: 'B1',
    summary: 'Bỏ được khi đại từ quan hệ làm TÂN NGỮ, không bỏ được khi nó làm CHỦ NGỮ. Bỏ nhầm chỗ là câu mất luôn chủ ngữ.',
    formula: {
      rows: [
        ['Làm tân ngữ, BỎ ĐƯỢC', 'The book (that) I read was good. — sau "that" đã có chủ ngữ "I".'],
        ['Làm chủ ngữ, KHÔNG BỎ', 'The man WHO lives next door. — bỏ "who" thì câu mất chủ ngữ.'],
        ['Phép thử', 'Ngay sau đại từ có chủ ngữ mới chưa? Có thì bỏ được, không thì phải giữ.'],
        ['Không xác định: cấm bỏ', 'My father, who is seventy, still works. — có phẩy thì luôn giữ.']
      ],
      note: 'Người Việt hay bỏ nhầm ở vị trí chủ ngữ vì tiếng Việt không cần đại từ ở đó: "Người sống cạnh nhà là chú tôi" nghe rất tự nhiên. Nhưng "The man lives next door is my uncle" thì thành hai động từ chọi nhau, không có câu chính.'
    },
    signals: ['ngay sau danh từ là một chủ ngữ mới', 'the book I read', 'the film we saw'],
    useWhen: [
      'Văn nói và văn viết đời thường: bỏ đi cho câu gọn và tự nhiên hơn.',
      'Khi đại từ quan hệ làm tân ngữ của động từ trong mệnh đề quan hệ.',
      'Khi đại từ quan hệ làm tân ngữ của một giới từ: "the man (that) I spoke to".'
    ],
    useNot: [
      { what: 'Không bỏ khi đại từ quan hệ làm chủ ngữ.', why: '"The man lives next door is my uncle" sai vì câu không còn động từ chính. Phải giữ "who": "The man who lives next door is my uncle."' },
      { what: 'Không bỏ trong mệnh đề không xác định.', why: 'Có dấu phẩy thì luôn giữ đại từ: "My father, who is seventy, still works."' }
    ],
    confuse: [
      {
        with: 'đại từ làm chủ ngữ khác làm tân ngữ',
        tell: 'Nhìn ngay sau đại từ quan hệ: nếu là một chủ ngữ mới thì nó đang làm tân ngữ, bỏ được. Nếu là động từ thì nó đang làm chủ ngữ, phải giữ.',
        pair: [
          { en: 'The woman who called you left a message.', vi: 'Người phụ nữ gọi cho bạn có để lại lời nhắn (who làm chủ ngữ, phải giữ).' },
          { en: 'The woman you called left a message.', vi: 'Người phụ nữ bạn gọi có để lại lời nhắn (đại từ làm tân ngữ, bỏ được).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The man lives next door is my uncle.', right: 'The man who lives next door is my uncle.', why: 'Đại từ làm chủ ngữ nên không bỏ được; bỏ rồi thì câu không còn động từ chính.' },
      { wrong: 'The keys I lost them were in my bag.', right: 'The keys I lost were in my bag.', why: 'Đã lược đại từ quan hệ rồi thì không nhắc lại tân ngữ "them" nữa.' }
    ],
    examples: [
      ['The book I read last week was excellent.', 'Cuốn sách tôi đọc tuần trước rất hay.', 1, 'Đại từ làm tân ngữ của "read" nên bỏ được.'],
      ['The man who lives next door is my uncle.', 'Người đàn ông sống cạnh nhà là chú tôi.', 1, 'Đại từ làm chủ ngữ nên bắt buộc giữ.'],
      ['The woman you called left a message.', 'Người phụ nữ bạn gọi có để lại lời nhắn.', 1, 'Ngay sau danh từ là chủ ngữ mới "you" — dấu hiệu đã lược đại từ.'],
      ['My father, who is seventy, still works every day.', 'Bố tôi, năm nay bảy mươi, vẫn đi làm hằng ngày.', 1, 'Mệnh đề không xác định thì luôn giữ đại từ, không bỏ.'],
      ['The man lives next door is my uncle.', 'Người đàn ông sống cạnh nhà là chú tôi.', 0, 'Sai: sửa thành "The man who lives next door is my uncle."'],
      ['The keys I lost them were in my bag.', 'Chùm chìa khoá tôi làm mất nằm trong túi.', 0, 'Sai: sửa thành "The keys I lost were in my bag."']
    ],
    practice: [
      ['The book ___ (I read / who I read) last week was excellent.', 'I read', 'Cuốn sách tôi đọc tuần trước rất hay.'],
      ['The man ___ (who lives / lives) next door is my uncle.', 'who lives', 'Người đàn ông sống cạnh nhà là chú tôi.'],
      ['You can omit the pronoun when it is the ___ (object / subject) of the clause.', 'object', 'Chỉ lược bỏ được đại từ khi nó làm tân ngữ của mệnh đề.'],
      ['The film we saw last night ___ (was / it was) very long.', 'was', 'Bộ phim chúng tôi xem tối qua rất dài.'],
      ['The woman ___ (who called / called) you left a message.', 'who called', 'Người phụ nữ gọi cho bạn có để lại lời nhắn.'],
      ['Everything ___ (she said / who she said) was true.', 'she said', 'Mọi điều cô ấy nói đều đúng.'],
      ['The keys ___ (I lost / I lost them) were in my bag.', 'I lost', 'Chùm chìa khoá tôi làm mất nằm trong túi.'],
      ['In a non-defining clause the pronoun ___ (cannot / can) be dropped.', 'cannot', 'Trong mệnh đề không xác định thì không được lược bỏ đại từ.'],
      ['The people ___ (who work / work) here start at eight.', 'who work', 'Những người làm ở đây bắt đầu lúc tám giờ.'],
      ['The shirt ___ (he bought / who he bought) does not fit him.', 'he bought', 'Cái áo anh ấy mua không vừa.']
    ]
  },

  {
    slug: 'adverbial-purpose',
    en: 'Purpose clauses: to, in order to, so that',
    vi: 'Mệnh đề chỉ mục đích — to, in order to, so that',
    level: 'B1',
    summary: 'Trả lời câu hỏi "để làm gì". Cùng một chủ ngữ thì dùng "to + V"; khác chủ ngữ hoặc cần khuyết thiếu thì dùng "so that".',
    formula: {
      rows: [
        ['Cùng chủ ngữ', 'to + V: I came here TO study English.'],
        ['Trang trọng hơn', 'in order to / so as to + V: He works two jobs IN ORDER TO support his family.'],
        ['Khác chủ ngữ', 'so that + MỆNH ĐỀ: He spoke slowly SO THAT everyone could understand.'],
        ['Công dụng của một vật', 'for + V-ing: a knife FOR cutting bread.']
      ],
      note: 'Phân biệt cho kỹ: mục đích của một HÀNH ĐỘNG thì dùng "to + V"; công dụng của một ĐỒ VẬT thì dùng "for + V-ing". "I came here to study" đúng, "I came here for studying" sai; nhưng "a device for measuring temperature" lại đúng.'
    },
    signals: ['to + V', 'in order to', 'so as to', 'so that', 'để làm gì'],
    useWhen: [
      'Nêu lý do làm một việc, trả lời câu hỏi "Why did you…?" bằng mục đích chứ không phải nguyên nhân.',
      '"so that" khi hai vế khác chủ ngữ, hoặc cần "can / could / would".',
      '"in order to" và "so as to" khi viết trang trọng, bài luận, thư công việc.'
    ],
    useNot: [
      { what: 'Không dùng "for + V-ing" cho mục đích của một hành động.', why: '"I came here for studying English" sai. Mục đích của việc mình làm thì dùng "to study". "for + V-ing" chỉ dùng cho công dụng của đồ vật.' },
      { what: 'Không dùng "so that" mà thiếu mệnh đề đủ.', why: '"He spoke slowly so that to understand" sai. Sau "so that" phải có chủ ngữ và động từ: "so that everyone could understand".' }
    ],
    confuse: [
      {
        with: '"to + V" khác "so that"',
        tell: 'Hai vế cùng một người làm thì "to + V". Vế sau là người khác thì phải "so that".',
        pair: [
          { en: 'I left early to catch the train.', vi: 'Tôi đi sớm để bắt kịp chuyến tàu (cùng một người).' },
          { en: 'I left early so that my sister could use the car.', vi: 'Tôi đi sớm để em gái tôi dùng được xe (hai người khác nhau).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I came here for study English.', right: 'I came here to study English.', why: 'Mục đích của hành động dùng "to + V".' },
      { wrong: 'She saved money for buy a house.', right: 'She saved money to buy a house.', why: 'Sau "for" không dùng động từ nguyên thể trần; ở đây phải là "to buy".' }
    ],
    examples: [
      ['I came here to study English.', 'Tôi tới đây để học tiếng Anh.', 1, 'Cùng một chủ ngữ nên dùng "to + V".'],
      ['He spoke slowly so that everyone could understand.', 'Anh ấy nói chậm để mọi người đều hiểu được.', 1, 'Hai vế khác chủ ngữ nên phải dùng "so that".'],
      ['She works two jobs in order to support her family.', 'Cô ấy làm hai việc để nuôi gia đình.', 1, '"in order to" trang trọng hơn "to", hợp với văn viết.'],
      ['This is a knife for cutting bread.', 'Đây là con dao để cắt bánh mì.', 1, 'Công dụng của một đồ vật thì dùng "for + V-ing".'],
      ['I came here for study English.', 'Tôi tới đây để học tiếng Anh.', 0, 'Sai: sửa thành "I came here to study English."'],
      ['He spoke slowly so that to understand.', 'Anh ấy nói chậm để hiểu được.', 0, 'Sai: sửa thành "He spoke slowly so that everyone could understand."']
    ],
    practice: [
      ['I came here ___ (to study / for study) English.', 'to study', 'Tôi tới đây để học tiếng Anh.'],
      ['She left early ___ (so that / for) she could catch the train.', 'so that', 'Cô ấy đi sớm để bắt kịp chuyến tàu.'],
      ['He works two jobs ___ (in order to / in order for) support his family.', 'in order to', 'Anh ấy làm hai việc để nuôi gia đình.'],
      ['This is a knife ___ (for cutting / to cutting) bread.', 'for cutting', 'Đây là con dao để cắt bánh mì.'],
      ['We left early ___ (to avoid / for avoid) the traffic.', 'to avoid', 'Chúng tôi đi sớm để tránh tắc đường.'],
      ['I bought a dictionary ___ (to look / for look) up new words.', 'to look', 'Tôi mua một cuốn từ điển để tra từ mới.'],
      ['He spoke slowly ___ (so that / so) everyone could understand.', 'so that', 'Anh ấy nói chậm để mọi người đều hiểu được.'],
      ['A thermometer is a device ___ (for measuring / to measuring) temperature.', 'for measuring', 'Nhiệt kế là dụng cụ để đo nhiệt độ.'],
      ['She saved money ___ (to buy / for buy) a house.', 'to buy', 'Cô ấy tiết kiệm tiền để mua nhà.'],
      ['They moved to Da Nang ___ (so that / because) their children could go to a better school.', 'so that', 'Họ chuyển vào Đà Nẵng để các con được học trường tốt hơn.']
    ]
  },

  {
    slug: 'adverbial-concession',
    en: 'Concession: although, even though, despite',
    vi: 'Mệnh đề nhượng bộ — although, even though, despite',
    level: 'B1',
    summary: 'Nói "dù… vẫn…". Cặp lỗi anh em với "Because… so…": tiếng Việt nói "Tuy… nhưng…" đủ hai vế, tiếng Anh chỉ được dùng MỘT.',
    formula: {
      rows: [
        ['although / though / even though + MỆNH ĐỀ', 'Although it was expensive, I bought it.'],
        ['despite / in spite of + DANH TỪ hoặc V-ing', 'Despite the rain, we went out.'],
        ['despite the fact THAT + mệnh đề', 'Despite the fact that he was late, they let him in.'],
        ['CẤM ghép đôi', 'Although it rained, BUT we went out. → bỏ "but" đi.']
      ],
      note: '"even though" mạnh hơn "although", nhấn vào chỗ trái khoáy. Còn "though" thì thân mật hơn và có thể đứng cuối câu: "It was expensive. I bought it, though." Riêng "despite" và "in spite of" thì tuyệt đối không đi với mệnh đề trần — phải là danh từ, V-ing, hoặc "the fact that".'
    },
    signals: ['although', 'though', 'even though', 'despite', 'in spite of', 'dù… vẫn…'],
    useWhen: [
      'Nêu một điều trái với dự đoán: đáng lẽ thế này mà lại thế kia.',
      'Bài Viết: dựng câu nhiều vế cho lập luận đỡ một chiều.',
      '"despite" và "in spite of" khi muốn viết gọn, không cần cả một mệnh đề.'
    ],
    useNot: [
      { what: 'Không dùng "although" và "but" trong cùng một câu.', why: 'Đây là lỗi bê nguyên "Tuy… nhưng…" của tiếng Việt. "Although it rained, but we went out" sai; bỏ một trong hai.' },
      { what: 'Không dùng "despite" trước một mệnh đề.', why: '"Despite it was raining" sai. Sau "despite" là danh từ hoặc V-ing: "Despite the rain" hay "Despite being tired". Muốn dùng mệnh đề thì viết "despite the fact that".' }
    ],
    confuse: [
      {
        with: '"although" khác "despite"',
        tell: 'Nhìn ngay sau nó: có chủ ngữ và động từ thì dùng "although"; chỉ có danh từ hay V-ing thì dùng "despite".',
        pair: [
          { en: 'Although it was raining, we went out.', vi: 'Dù trời mưa, chúng tôi vẫn ra ngoài (theo sau là mệnh đề).' },
          { en: 'Despite the rain, we went out.', vi: 'Dù có mưa, chúng tôi vẫn ra ngoài (theo sau là danh từ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Although it rained, but we went out.', right: 'Although it rained, we went out.', why: 'Tiếng Anh chỉ dùng một liên từ; bỏ "but" đi.' },
      { wrong: 'Despite it was raining, we went out.', right: 'Despite the rain, we went out.', why: 'Sau "despite" là danh từ hoặc V-ing, không phải mệnh đề.' }
    ],
    examples: [
      ['Although it was expensive, I bought it.', 'Dù đắt, tôi vẫn mua.', 1, '"although" + mệnh đề đủ chủ ngữ và động từ.'],
      ['Despite the rain, we went out.', 'Dù có mưa, chúng tôi vẫn ra ngoài.', 1, '"despite" + danh từ.'],
      ['He passed the exam even though he did not study.', 'Anh ấy đỗ kỳ thi dù không hề học bài.', 1, '"even though" nhấn mạnh chỗ trái khoáy hơn "although".'],
      ['It was expensive. I bought it, though.', 'Đắt thật. Nhưng tôi vẫn mua.', 1, '"though" đứng cuối câu, giọng thân mật — chỗ này "although" không thay được.'],
      ['Although it rained, but we went out.', 'Tuy trời mưa nhưng chúng tôi vẫn ra ngoài.', 0, 'Sai: sửa thành "Although it rained, we went out."'],
      ['Despite it was raining, we went out.', 'Dù trời mưa, chúng tôi vẫn ra ngoài.', 0, 'Sai: sửa thành "Despite the rain, we went out" hoặc "Although it was raining, we went out."']
    ],
    practice: [
      ['___ (Although / Although but) it was expensive, I bought it.', 'Although', 'Dù đắt, tôi vẫn mua.'],
      ['Although it rained, ___ (we went out / but we went out).', 'we went out', 'Dù trời mưa, chúng tôi vẫn ra ngoài.'],
      ['___ (Despite / Although) the rain, we went out.', 'Despite', 'Dù có mưa, chúng tôi vẫn ra ngoài.'],
      ['___ (Although / Despite) it was raining, we went out.', 'Although', 'Dù trời đang mưa, chúng tôi vẫn ra ngoài.'],
      ['He passed the exam ___ (even though / even) he did not study.', 'even though', 'Anh ấy đỗ kỳ thi dù không hề học bài.'],
      ['___ (In spite of / In spite) the noise, she slept well.', 'In spite of', 'Dù ồn, cô ấy vẫn ngủ ngon.'],
      ['Despite ___ (being / he was) tired, he finished the work.', 'being', 'Dù mệt, anh ấy vẫn làm xong việc.'],
      ['She kept working ___ (although / despite) she was ill.', 'although', 'Cô ấy vẫn làm việc dù đang ốm.'],
      ['It was cold. We went swimming, ___ (though / although).', 'though', 'Trời lạnh. Nhưng chúng tôi vẫn đi bơi.'],
      ['Despite the fact ___ (that / of) he was late, they let him in.', 'that', 'Dù anh ấy tới muộn, họ vẫn cho vào.']
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
