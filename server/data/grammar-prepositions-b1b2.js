/**
 * Ngữ pháp — nhóm GIỚI TỪ và CỤM GIỚI TỪ, phần bậc B1–B2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-prepositions.js (bậc A1–A2). Hạn mức của nhóm
 * là 35 điểm: tệp kia đã dùng 13 điểm A1–A2, tệp này dùng 13 điểm (B1 7,
 * B2 6), còn 9 điểm C1–C2 ở tệp thứ ba.
 *
 * Bậc A1–A2 lo chọn đúng giới từ trong một cặp. Bậc này lo hai việc khó hơn:
 *
 *   · GIỚI TỪ ĐỔI THÌ NGHĨA ĐỔI. Cùng một động từ, đổi giới từ là đổi hẳn
 *     nghĩa — look at, look for, look after, look into là bốn việc khác nhau.
 *     Ở bậc dưới chọn sai thì câu nghe lạ; ở bậc này chọn sai thì câu nói một
 *     điều khác hẳn điều mình định nói, mà vẫn đúng ngữ pháp nên không ai sửa.
 *   · CỤM GIỚI TỪ CỐ ĐỊNH của văn viết trang trọng — in accordance with,
 *     with regard to, on behalf of. Đây là thứ nâng điểm tiêu chí "mức trang
 *     trọng" trong bài Viết email, và là thứ người học tự đoán ra thì gần như
 *     luôn sai vì chúng không theo logic nào cả.
 *
 * Ghi chú tránh trùng — đã đối chiếu với ngân hàng hiện có:
 *   · although / even though / despite thuộc `adverbial-concession` (nhóm mệnh
 *     đề, B1). Không nhắc lại ở đây.
 *   · because / because of / so thuộc `adverbial-reason-basic` (nhóm mệnh đề,
 *     A2). Không nhắc lại ở đây.
 *   · giới từ đi với which và whom thuộc `relative-preposition` (nhóm mệnh đề,
 *     B2). Ở đây không bàn mệnh đề quan hệ.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'prep-of-vs-possessive',
    en: "of versus 's",
    vi: "of và 's — sở hữu của người khác sở hữu của vật",
    level: 'B1',
    summary: "Tiếng Anh có hai cách nói sở hữu. Người và động vật thường dùng 's; vật vô tri thường dùng of. Chọn sai không sai ngữ pháp nhưng nghe rất lạ tai.",
    formula: {
      rows: [
        ["Người, động vật → 's", "my brother's car · the dog's tail"],
        ['Vật vô tri → of', 'the roof of the house · the end of the film'],
        ["Tổ chức dùng được cả hai", "the company's policy = the policy of the company"],
        ["Thời gian dùng 's", "today's news · a week's holiday · ten minutes' walk"],
        ['Hai of liền nhau thì đổi', 'KHÔNG: the door of the room of the hotel → the hotel room door']
      ],
      note: "Vì sao vật vô tri không dùng 's: hình thái này gốc là cách đánh dấu người sở hữu, nên gán cho một cái bàn nghe như coi cái bàn là người. Nhưng ranh giới không cứng — tổ chức, thành phố và thời gian đều dùng được 's vì người nói vẫn hình dung chúng có ý chí hoặc có ranh giới rõ."
    },
    signals: ['chủ sở hữu là người hay là vật', 'chuỗi hai ba of nối nhau', 'cụm chỉ thời gian có nghĩa sở hữu'],
    useWhen: [
      'Viết email công việc: "the company\'s new policy".',
      'Tả một bức ảnh: "the colour of the walls".',
      'Nói quãng đường, quãng thời gian: "a ten minutes\' walk from here".'
    ],
    useNot: [
      { what: "Không dùng 's cho vật vô tri thông thường.", why: '"the table\'s leg" nghe lạ. Đúng và tự nhiên là "the leg of the table".' },
      { what: 'Không nối ba bốn of liền nhau.', why: '"the colour of the door of the car" rất nặng nề. Ghép danh từ lại: "the car door colour".' }
    ],
    confuse: [
      {
        with: "the company's policy khác the policy of the company",
        tell: 'Với tổ chức thì cả hai đều đúng. Chọn theo NHỊP: dạng ngắn cho câu nói, dạng of cho văn viết trang trọng hoặc khi cụm danh từ dài.',
        pair: [
          { en: "The company's policy changed last year.", vi: 'Chính sách của công ty đổi hồi năm ngoái (ngắn gọn).' },
          { en: 'The policy of the company that bought us has not changed.', vi: 'Chính sách của công ty đã mua lại chúng tôi thì chưa đổi (cụm dài nên dùng of).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I broke the table\'s leg.', right: 'I broke the leg of the table.', why: "Vật vô tri thông thường dùng of chứ không dùng 's." },
      { wrong: 'It is a five minutes walk.', right: "It is a five minutes' walk.", why: "Cụm thời gian mang nghĩa sở hữu nên cần dấu ' sau s." }
    ],
    examples: [
      ["My sister's flat is near the river.", 'Căn hộ của chị tôi gần sông.', 1, "Người dùng 's."],
      ['The end of the film was very sad.', 'Đoạn cuối phim rất buồn.', 1, 'Vật vô tri dùng of.'],
      ["The government's decision surprised everyone.", 'Quyết định của chính phủ khiến mọi người bất ngờ.', 1, "Tổ chức dùng được 's."],
      ["It is only ten minutes' walk from here.", 'Từ đây đi bộ chỉ mười phút.', 1, "Cụm thời gian dùng 's."],
      ["I broke the table's leg.", 'Tôi làm gãy chân bàn.', 0, 'Sai: sửa thành "the leg of the table".'],
      ['It is a five minutes walk.', 'Đi bộ năm phút thôi.', 0, "Sai: sửa thành \"a five minutes' walk\"."]
    ],
    practice: [
      ["This is ___ (my friend's / the friend of my) house.", "my friend's", 'Đây là nhà bạn tôi.'],
      ['Please close ___ (the door of the room / the room\'s door).', 'the door of the room', 'Đóng cửa phòng lại nhé.'],
      ["Have you seen ___ (today's / the today) newspaper?", "today's", 'Bạn xem báo hôm nay chưa?'],
      ['The colour ___ (of the sky / the sky\'s) changed quickly.', 'of the sky', 'Màu trời đổi rất nhanh.'],
      ["___ (The company's / The company) results were good.", "The company's", 'Kết quả của công ty rất tốt.'],
      ['I could not remember the name ___ (of the street / the street\'s).', 'of the street', 'Tôi không nhớ nổi tên phố.'],
      ["We had ___ (a week's / a week) holiday in Da Lat.", "a week's", 'Chúng tôi nghỉ một tuần ở Đà Lạt.'],
      ['The legs ___ (of the chair / the chair\'s) are loose.', 'of the chair', 'Chân ghế bị lỏng.'],
      ["That is ___ (Nam's / the Nam) bicycle.", "Nam's", 'Đó là xe đạp của Nam.'],
      ['The beginning ___ (of the book / the book\'s) is slow.', 'of the book', 'Phần đầu cuốn sách chậm.']
    ]
  },

  {
    slug: 'prep-about-on-of',
    en: 'about, on, of',
    vi: 'about, on, of — nói về cái gì, ở ba mức trang trọng',
    level: 'B1',
    summary: 'Cả ba đều dịch là "về", nhưng about là thông thường, on là học thuật hoặc chuyên môn, còn of chỉ dùng với một số ít động từ cố định.',
    formula: {
      rows: [
        ['about — thông thường', 'talk about the weather · a film about war'],
        ['on — chuyên môn, học thuật', 'a lecture on economics · a report on safety'],
        ['of — chỉ với vài động từ', 'think of · hear of · remind of · approve of'],
        ['think about khác think of', 'think ABOUT = cân nhắc lâu · think OF = nghĩ ra, nhớ ra'],
        ['Trong email công việc', 'a report ON the issue (trang trọng hơn "about the issue")']
      ],
      note: 'about và on hoán đổi được trong nhiều câu, nhưng khác mức trang trọng: "a book about birds" là sách phổ thông cho người thích chim, "a book on birds" nghe như sách chuyên khảo. Còn of thì KHÔNG hoán đổi tự do — nó gắn chặt với một số động từ và học theo cụm.'
    },
    signals: ['chủ đề của một bài nói, bài viết', 'mức trang trọng của văn bản', 'động từ cố định đi với of'],
    useWhen: [
      'Viết email công việc: "Please see my report on the delay."',
      'Nói chuyện thường ngày: "We talked about the trip."',
      'Nhớ ra, nghĩ ra: "I cannot think of his name."'
    ],
    useNot: [
      { what: 'Không dùng of thay about sau talk, speak, write.', why: '"talk of the weather" nghe cổ và lạ. Đúng là "talk about the weather".' },
      { what: 'Không lẫn think about với think of.', why: '"I am thinking of the problem" nghĩa là vừa nhớ ra nó; nếu muốn nói đang cân nhắc thì phải là "thinking about".' }
    ],
    confuse: [
      {
        with: 'think about khác think of',
        tell: 'think about là CÂN NHẮC, kéo dài, có suy xét. think of là NGHĨ RA hoặc NHỚ RA, xảy ra trong một khoảnh khắc.',
        pair: [
          { en: 'I am thinking about changing jobs.', vi: 'Tôi đang cân nhắc đổi việc (suy nghĩ kéo dài).' },
          { en: 'I cannot think of her name.', vi: 'Tôi không nhớ ra tên cô ấy (khoảnh khắc).' }
        ]
      }
    ],
    errors: [
      { wrong: 'We talked of the new project for an hour.', right: 'We talked about the new project for an hour.', why: 'talk đi với about trong tiếng Anh hiện đại.' },
      { wrong: 'She wrote a report about the safety rules for the board.', right: 'She wrote a report on the safety rules for the board.', why: 'Văn bản chuyên môn gửi cấp trên dùng on cho trang trọng.' }
    ],
    examples: [
      ['We talked about the holiday all evening.', 'Chúng tôi nói chuyện về kỳ nghỉ cả buổi tối.', 1, 'about cho hội thoại thường ngày.'],
      ['He gave a lecture on Vietnamese history.', 'Ông ấy giảng một bài về lịch sử Việt Nam.', 1, 'on cho nội dung học thuật.'],
      ['I cannot think of the right word.', 'Tôi không nghĩ ra từ nào cho đúng.', 1, 'think of = nghĩ ra.'],
      ['This song reminds me of my school days.', 'Bài hát này làm tôi nhớ hồi đi học.', 1, 'remind luôn đi với of.'],
      ['We talked of the new project for an hour.', 'Chúng tôi bàn về dự án mới một tiếng.', 0, 'Sai: sửa thành "talked about".'],
      ['She wrote a report about the safety rules for the board.', 'Cô ấy viết báo cáo về quy định an toàn gửi ban lãnh đạo.', 0, 'Sai: dùng "a report on the safety rules" cho trang trọng.']
    ],
    practice: [
      ['Let us talk ___ (about / of) your plans.', 'about', 'Mình nói về kế hoạch của bạn nhé.'],
      ['He published a paper ___ (on / about) climate policy.', 'on', 'Ông ấy công bố một bài về chính sách khí hậu.'],
      ['I am thinking ___ (about / of) buying a new laptop.', 'about', 'Tôi đang cân nhắc mua laptop mới.'],
      ['Can you think ___ (of / about) a better title?', 'of', 'Bạn nghĩ ra tiêu đề nào hay hơn không?'],
      ['This photo reminds me ___ (of / about) my grandmother.', 'of', 'Tấm ảnh này làm tôi nhớ bà.'],
      ['Have you heard ___ (of / about) a writer called Nam Cao?', 'of', 'Bạn nghe tên nhà văn Nam Cao chưa?'],
      ['She wrote an email ___ (about / of) the delay.', 'about', 'Cô ấy viết email về việc chậm trễ.'],
      ['My parents do not approve ___ (of / about) my decision.', 'of', 'Bố mẹ tôi không tán thành quyết định của tôi.'],
      ['The board asked for a report ___ (on / of) staff safety.', 'on', 'Ban lãnh đạo yêu cầu báo cáo về an toàn nhân viên.'],
      ['We often talk ___ (about / on) football at lunch.', 'about', 'Bữa trưa chúng tôi hay nói chuyện bóng đá.']
    ]
  },

  {
    slug: 'prep-noun-prep',
    en: 'noun + preposition: reason for, solution to, increase in',
    vi: 'danh từ + giới từ — reason for, solution to, increase in',
    level: 'B1',
    summary: 'Cũng như động từ và tính từ, nhiều danh từ kéo theo một giới từ cố định. Nhóm này quan trọng vì nó đúng là những danh từ dùng nhiều nhất khi viết báo cáo và email công việc.',
    formula: {
      rows: [
        ['+ for', 'the reason for · the need for · a request for · a demand for'],
        ['+ to', 'the solution to · the answer to · the key to · damage to'],
        ['+ in', 'an increase in · a fall in · a change in · interest in'],
        ['+ of', 'the cause of · the cost of · an example of · the effect of'],
        ['+ with', 'a problem with · a relationship with · a connection with']
      ],
      note: 'Hai cặp gài bẫy nặng nhất. "the reason FOR the delay" chứ không phải "reason of" — dù tiếng Việt nói "lý do CỦA việc chậm trễ". Và "an increase IN sales" chứ không phải "increase of" — of ở đây chỉ dùng khi nói ĐỘ LỚN: "an increase of 10 per cent in sales" là đúng, và câu đó có cả hai giới từ.'
    },
    signals: ['danh từ trừu tượng chỉ nguyên nhân, cách giải quyết, mức thay đổi', 'văn bản báo cáo', 'sau danh từ là một giới từ cố định'],
    useWhen: [
      'Viết email giải thích: "The reason for the delay is a supplier problem."',
      'Đề xuất trong báo cáo: "The solution to this is simple."',
      'Mô tả số liệu: "There was a sharp fall in orders."'
    ],
    useNot: [
      { what: 'Không dùng of sau reason.', why: '"the reason of the delay" sai dù tiếng Việt nói "lý do của". Đúng là "the reason for the delay".' },
      { what: 'Không dùng of sau solution hay answer.', why: '"the solution of the problem" sai. Đúng là "the solution to the problem".' }
    ],
    confuse: [
      {
        with: 'increase IN khác increase OF',
        tell: 'in dẫn tới THỨ tăng lên. of dẫn tới CON SỐ tăng bao nhiêu. Một câu đầy đủ có thể mang cả hai.',
        pair: [
          { en: 'There was an increase in sales.', vi: 'Doanh số có tăng (tăng ở cái gì).' },
          { en: 'There was an increase of 12 per cent.', vi: 'Mức tăng là 12 phần trăm (tăng bao nhiêu).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The reason of the problem is unclear.', right: 'The reason for the problem is unclear.', why: 'reason luôn đi với for.' },
      { wrong: 'We found a solution of the issue.', right: 'We found a solution to the issue.', why: 'solution luôn đi với to.' }
    ],
    examples: [
      ['The reason for the delay was heavy rain.', 'Lý do chậm trễ là mưa lớn.', 1, 'reason + for.'],
      ['We need a solution to this problem.', 'Chúng ta cần một cách giải quyết cho vấn đề này.', 1, 'solution + to.'],
      ['There has been an increase in complaints.', 'Số lượt phàn nàn đã tăng lên.', 1, 'increase + in.'],
      ['What is the cause of the noise?', 'Nguyên nhân của tiếng ồn là gì?', 1, 'cause + of.'],
      ['The reason of the problem is unclear.', 'Nguyên nhân của vấn đề chưa rõ.', 0, 'Sai: sửa thành "the reason for the problem".'],
      ['We found a solution of the issue.', 'Chúng tôi tìm ra cách giải quyết cho vấn đề.', 0, 'Sai: sửa thành "a solution to the issue".']
    ],
    practice: [
      ['There is no simple answer ___ (to / of) that question.', 'to', 'Không có câu trả lời đơn giản cho câu hỏi đó.'],
      ['What was the reason ___ (for / of) the change?', 'for', 'Lý do của việc thay đổi là gì?'],
      ['We noticed a fall ___ (in / of) attendance.', 'in', 'Chúng tôi thấy số người tham dự giảm.'],
      ['There is a problem ___ (with / of) the printer.', 'with', 'Máy in có vấn đề.'],
      ['The cost ___ (of / for) the repair was high.', 'of', 'Chi phí sửa chữa khá cao.'],
      ['This is a good example ___ (of / for) the style.', 'of', 'Đây là một ví dụ điển hình cho phong cách đó.'],
      ['There is a growing need ___ (for / of) trained staff.', 'for', 'Nhu cầu nhân viên có tay nghề đang tăng.'],
      ['The storm caused serious damage ___ (to / of) the roof.', 'to', 'Cơn bão gây hư hại nặng cho mái nhà.'],
      ['Sales rose by an increase ___ (of / in) eight per cent.', 'of', 'Doanh số tăng tám phần trăm.'],
      ['She has a good relationship ___ (with / to) her team.', 'with', 'Cô ấy có quan hệ tốt với nhóm của mình.']
    ]
  },

  {
    slug: 'prep-in-within-after',
    en: 'in, within and after for future time',
    vi: 'in, within, after — ba cách nói "sau bao lâu nữa"',
    level: 'B1',
    summary: 'Ba cách nói về một khoảng thời gian tính từ bây giờ, nhưng khác nhau ở chỗ việc xảy ra LÚC NÀO trong khoảng đó — và trong email công việc thì khác nhau đó là khác nhau về cam kết.',
    formula: {
      rows: [
        ['in two weeks = ĐÚNG lúc hết hai tuần', 'I will finish it in two weeks. — cuối tuần thứ hai.'],
        ['within two weeks = BẤT KỲ lúc nào trong hai tuần', 'I will finish it within two weeks. — có thể xong ngày mai.'],
        ['after two weeks = SAU KHI hai tuần trôi qua', 'After two weeks, he gave up. — thường kể chuyện quá khứ.'],
        ['Trong email công việc', 'within là cam kết chặt hơn: hạn tối đa, không phải hạn chính xác.'],
        ['in + khoảng, nhìn từ hiện tại', 'in an hour · in three days · in a year']
      ],
      note: 'Chỗ đáng nhớ nhất: "in two weeks" và "within two weeks" nghe gần giống nhau nhưng hứa hai điều khác nhau. Nói với khách hàng "we will reply in two weeks" là hẹn họ đợi trọn hai tuần; "within two weeks" là hứa chậm nhất hai tuần. Chọn nhầm là mất lòng hoặc tự trói mình.'
    },
    signals: ['một khoảng tính từ bây giờ', 'lời hứa về thời hạn trong email', 'kể lại một việc đã xảy ra sau bao lâu'],
    useWhen: [
      'Hứa hẹn thời hạn với khách: "We will respond within 24 hours."',
      'Nói lịch trình cá nhân: "I am going to Hue in two days."',
      'Kể lại chuyện quá khứ: "After six months, she moved back."'
    ],
    useNot: [
      { what: 'Không dùng after cho một khoảng tính từ hiện tại tới tương lai.', why: '"I will call you after ten minutes" nghe sai. Đúng là "in ten minutes".' },
      { what: 'Không dùng within khi muốn nói đúng thời điểm đó.', why: '"The train leaves within an hour" mơ hồ. Nếu là đúng một tiếng nữa thì "in an hour".' }
    ],
    confuse: [
      {
        with: 'in two weeks khác within two weeks',
        tell: 'in trỏ vào ĐIỂM cuối khoảng. within trỏ vào cả KHOẢNG, tức là bất kỳ lúc nào từ giờ tới đó.',
        pair: [
          { en: 'The results come out in two weeks.', vi: 'Hai tuần nữa mới có kết quả (đúng thời điểm đó).' },
          { en: 'We will reply within two weeks.', vi: 'Chậm nhất hai tuần chúng tôi trả lời (có thể sớm hơn).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I will call you back after five minutes.', right: 'I will call you back in five minutes.', why: 'Khoảng tính từ bây giờ tới tương lai dùng in.' },
      { wrong: 'Please pay in seven days at the latest.', right: 'Please pay within seven days at the latest.', why: '"at the latest" là hạn tối đa nên dùng within.' }
    ],
    examples: [
      ['The train leaves in ten minutes.', 'Mười phút nữa tàu chạy.', 1, 'in = đúng lúc hết khoảng đó.'],
      ['We will send the goods within three days.', 'Chậm nhất ba ngày chúng tôi gửi hàng.', 1, 'within = bất kỳ lúc nào trong khoảng.'],
      ['After two hours of waiting, we left.', 'Đợi hai tiếng xong chúng tôi về.', 1, 'after kể lại chuyện đã qua.'],
      ['Please confirm within 24 hours.', 'Vui lòng xác nhận trong vòng 24 giờ.', 1, 'Cam kết hạn tối đa.'],
      ['I will call you back after five minutes.', 'Năm phút nữa tôi gọi lại.', 0, 'Sai: sửa thành "in five minutes".'],
      ['Please pay in seven days at the latest.', 'Chậm nhất bảy ngày xin thanh toán.', 0, 'Sai: sửa thành "within seven days".']
    ],
    practice: [
      ['The meeting starts ___ (in / after) fifteen minutes.', 'in', 'Mười lăm phút nữa họp.'],
      ['We guarantee delivery ___ (within / in) five working days.', 'within', 'Chúng tôi bảo đảm giao hàng trong vòng năm ngày làm việc.'],
      ['___ (After / In) three months, he finally replied.', 'After', 'Ba tháng sau anh ấy mới trả lời.'],
      ['She will be back ___ (in / after) an hour.', 'in', 'Một tiếng nữa cô ấy về.'],
      ['Please reply ___ (within / in) 48 hours at the latest.', 'within', 'Chậm nhất 48 giờ xin trả lời.'],
      ['The exam results come out ___ (in / within) two weeks exactly.', 'in', 'Đúng hai tuần nữa có kết quả thi.'],
      ['___ (After / Within) a year in Japan, she spoke fluently.', 'After', 'Sau một năm ở Nhật, cô ấy nói trôi chảy.'],
      ['I can finish this ___ (within / after) the hour if you need it.', 'within', 'Nếu bạn cần, trong tiếng này tôi làm xong.'],
      ['The shop closes ___ (in / after) twenty minutes.', 'in', 'Hai mươi phút nữa cửa hàng đóng.'],
      ['We must decide ___ (within / in) this week at the latest.', 'within', 'Chậm nhất tuần này phải quyết.']
    ]
  },

  {
    slug: 'prep-above-over-under-below',
    en: 'above, over, below, under',
    vi: 'above, over, below, under — cao hơn, phủ lên, thấp hơn, nằm dưới',
    level: 'B1',
    summary: 'Hai cặp đối nhau. above và below chỉ nói CAO HƠN hay THẤP HƠN trên một thang. over và under thì thêm ý CHE PHỦ hoặc CHẠM TỚI, và over còn có nghĩa "hơn" về số lượng.',
    formula: {
      rows: [
        ['above / below = vị trí trên thang', 'above sea level · below zero · see below'],
        ['over = phủ lên, vượt qua', 'a blanket over the bed · jump over the wall'],
        ['under = nằm dưới, bị che', 'under the table · under a blanket'],
        ['over = hơn (số lượng)', 'over 200 people · over an hour'],
        ['under = kém (số lượng)', 'under 18 · under 500 words']
      ],
      note: 'above và over chồng nghĩa khi chỉ nói vị trí cao hơn: "the lamp above/over the table" đều được. Chúng tách nhau ở hai chỗ: chỉ over mới có nghĩa che phủ hoặc chuyển động vượt qua, và chỉ over mới dùng cho số lượng. Nói "above 200 people" là sai.'
    },
    signals: ['vị trí cao thấp trên một thang đo', 'một vật phủ lên vật khác', 'nhiều hơn hoặc ít hơn một con số'],
    useWhen: [
      'Mô tả biểu đồ hoặc số liệu: "Sales were above target."',
      'Tả một bức ảnh trong bài Nói: "There is a clock over the door."',
      'Nêu giới hạn: "The essay must be under 300 words."'
    ],
    useNot: [
      { what: 'Không dùng above cho số lượng.', why: '"above 100 people" sai. Số lượng dùng over: "over 100 people".' },
      { what: 'Không dùng below cho vật bị che.', why: '"below the blanket" sai. Bị che thì dùng under: "under the blanket".' }
    ],
    confuse: [
      {
        with: 'above khác over',
        tell: 'Chỉ nói cao hơn thì cả hai đều được. Nhưng nếu có ý CHE PHỦ, VƯỢT QUA hoặc NHIỀU HƠN một con số thì chỉ over dùng được.',
        pair: [
          { en: 'The temperature is above zero.', vi: 'Nhiệt độ trên không độ (vị trí trên thang).' },
          { en: 'She put a coat over the child.', vi: 'Cô ấy phủ áo khoác lên đứa bé (che phủ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'There were above fifty guests.', right: 'There were over fifty guests.', why: 'Số lượng dùng over.' },
      { wrong: 'The cat is sleeping below the table.', right: 'The cat is sleeping under the table.', why: 'Nằm dưới và bị che thì dùng under.' }
    ],
    examples: [
      ['The village is 800 metres above sea level.', 'Ngôi làng cao 800 mét so với mực nước biển.', 1, 'above cho vị trí trên thang.'],
      ['He jumped over the fence.', 'Anh ấy nhảy qua hàng rào.', 1, 'over cho chuyển động vượt qua.'],
      ['Temperatures fell below zero last night.', 'Đêm qua nhiệt độ xuống dưới không độ.', 1, 'below cho vị trí dưới thang.'],
      ['Children under six travel free.', 'Trẻ dưới sáu tuổi được miễn phí.', 1, 'under cho số lượng thấp hơn.'],
      ['There were above fifty guests.', 'Có hơn năm mươi khách.', 0, 'Sai: sửa thành "over fifty guests".'],
      ['The cat is sleeping below the table.', 'Con mèo đang ngủ dưới gầm bàn.', 0, 'Sai: sửa thành "under the table".']
    ],
    practice: [
      ['The essay must be ___ (under / below) 400 words.', 'under', 'Bài luận phải dưới 400 từ.'],
      ['There is a picture ___ (above / over) my desk on the wall.', 'above', 'Có một bức tranh phía trên bàn tôi.'],
      ['More than ___ (over / above) 300 people attended.', 'over', 'Hơn 300 người đã tham dự.'],
      ['Put a cloth ___ (over / above) the food.', 'over', 'Đậy khăn lên đồ ăn.'],
      ['Her marks were ___ (above / over) the class average.', 'above', 'Điểm của cô ấy trên mức trung bình lớp.'],
      ['I found my shoes ___ (under / below) the bed.', 'under', 'Tôi tìm thấy giày dưới gầm giường.'],
      ['See the note ___ (below / under) for details.', 'below', 'Xem ghi chú bên dưới để biết chi tiết.'],
      ['The plane flew ___ (over / above) the mountains and landed.', 'over', 'Máy bay bay qua dãy núi rồi hạ cánh.'],
      ['Anyone ___ (under / below) eighteen needs permission.', 'under', 'Ai dưới mười tám tuổi cần xin phép.'],
      ['The shelf is ___ (above / over) the sink, fixed to the wall.', 'above', 'Cái kệ ở phía trên bồn rửa, gắn vào tường.']
    ]
  },

  {
    slug: 'prep-across-through-along',
    en: 'across, through and along',
    vi: 'across, through, along — qua bề mặt, xuyên bên trong, dọc theo',
    level: 'B1',
    summary: 'Ba giới từ chuyển động, phân biệt bằng hình dạng của chỗ đi qua: across đi qua một BỀ MẶT, through đi XUYÊN một khối có bên trong, along đi DỌC theo một đường dài.',
    formula: {
      rows: [
        ['across = qua bề mặt phẳng', 'walk across the road · swim across the river'],
        ['through = xuyên qua bên trong', 'walk through the forest · drive through a tunnel'],
        ['along = dọc theo đường dài', 'walk along the river · drive along the street'],
        ['Cùng một chỗ, hai cách nhìn', 'across the park (băng qua) · through the park (len giữa cây cối)'],
        ['past = đi ngang qua rồi bỏ lại', 'walk past the shop — không vào, không xuyên.']
      ],
      note: 'Cách nhanh nhất để chọn đúng: hỏi xem cái mình đi qua có gì ở TRÊN hay có gì ở TRONG. Cánh đồng trống thì đi across, khu rừng có cây bao quanh thì đi through. Cùng một công viên, nếu chỉ băng ngang thì across, nếu len giữa hàng cây thì through.'
    },
    signals: ['băng ngang một khoảng trống', 'chui vào giữa một khối rồi ra', 'đi men theo một con đường hay bờ sông'],
    useWhen: [
      'Chỉ đường: "Go across the bridge and turn left."',
      'Kể một chuyến đi: "We drove through the mountains."',
      'Tả một bức ảnh: "People are walking along the beach."'
    ],
    useNot: [
      { what: 'Không dùng across khi có gì bao quanh mình.', why: '"across the forest" nghe sai vì rừng có cây bao quanh: "through the forest".' },
      { what: 'Không dùng through cho một mặt phẳng trống.', why: '"through the road" sai. Mặt đường là bề mặt: "across the road".' }
    ],
    confuse: [
      {
        with: 'across khác through',
        tell: 'across là đi trên MẶT của cái gì đó. through là đi trong LÒNG của nó, có thứ gì đó ở hai bên hoặc bên trên.',
        pair: [
          { en: 'We walked across the field.', vi: 'Chúng tôi băng qua cánh đồng (đi trên mặt đất trống).' },
          { en: 'We walked through the forest.', vi: 'Chúng tôi đi xuyên rừng (cây cối ở quanh mình).' }
        ]
      }
    ],
    errors: [
      { wrong: 'They walked across the tunnel.', right: 'They walked through the tunnel.', why: 'Đường hầm có bên trong nên dùng through.' },
      { wrong: 'We drove through the bridge.', right: 'We drove across the bridge.', why: 'Cầu là một bề mặt để đi trên nên dùng across.' }
    ],
    examples: [
      ['Be careful when you walk across the road.', 'Cẩn thận khi băng qua đường.', 1, 'Mặt đường là bề mặt.'],
      ['The train goes through a long tunnel.', 'Tàu chạy xuyên một đường hầm dài.', 1, 'Đường hầm có bên trong.'],
      ['We cycled along the river for an hour.', 'Chúng tôi đạp xe dọc bờ sông một tiếng.', 1, 'along đi theo đường dài.'],
      ['She swam across the lake.', 'Cô ấy bơi qua hồ.', 1, 'Mặt hồ là một bề mặt để băng qua.'],
      ['They walked across the tunnel.', 'Họ đi qua đường hầm.', 0, 'Sai: sửa thành "through the tunnel".'],
      ['We drove through the bridge.', 'Chúng tôi lái xe qua cầu.', 0, 'Sai: sửa thành "across the bridge".']
    ],
    practice: [
      ['Walk ___ (across / through) the square and you will see it.', 'across', 'Băng qua quảng trường là thấy ngay.'],
      ['The path goes ___ (through / across) the woods.', 'through', 'Con đường mòn xuyên qua rừng.'],
      ['We walked ___ (along / across) the beach at sunset.', 'along', 'Chúng tôi đi dọc bờ biển lúc hoàng hôn.'],
      ['He drove ___ (through / across) the city centre.', 'through', 'Anh ấy lái xe xuyên trung tâm thành phố.'],
      ['There is a bridge ___ (across / through) the river.', 'across', 'Có một cây cầu bắc qua sông.'],
      ['Go ___ (along / across) this street until the lights.', 'along', 'Đi dọc phố này tới chỗ đèn giao thông.'],
      ['The dog ran ___ (across / through) the garden to the gate.', 'across', 'Con chó chạy băng qua vườn ra cổng.'],
      ['We pushed ___ (through / along) the crowd.', 'through', 'Chúng tôi chen qua đám đông.'],
      ['She swam ___ (across / along) to the other side.', 'across', 'Cô ấy bơi sang bờ bên kia.'],
      ['They cycled ___ (along / across) the canal every morning.', 'along', 'Sáng nào họ cũng đạp xe dọc kênh.']
    ]
  },

  {
    slug: 'prep-agree-with-to-on',
    en: 'agree with, agree to, agree on',
    vi: 'agree with / to / on — một động từ, ba giới từ, ba nghĩa',
    level: 'B1',
    summary: 'Đây là ví dụ rõ nhất của nguyên tắc lớn ở bậc này: giới từ không phải trang trí, nó ĐỔI NGHĨA. Cùng chữ agree, ba giới từ cho ba việc khác nhau.',
    formula: {
      rows: [
        ['agree WITH + người hoặc ý kiến', 'I agree with you. — cùng quan điểm.'],
        ['agree TO + đề nghị, kế hoạch', 'They agreed to the plan. — chấp thuận.'],
        ['agree ON + thứ cùng nhau quyết', 'We agreed on a date. — bàn rồi chốt.'],
        ['agree + to V', 'She agreed to help. — nhận lời làm gì.'],
        ['Không có giới từ', 'We agreed that it was late. — trước mệnh đề thì bỏ giới từ.']
      ],
      note: 'Khác biệt đáng để ý nhất là with và to. "I agree with the proposal" nghĩa là tôi thấy nó đúng. "I agree to the proposal" nghĩa là tôi đồng ý làm theo nó. Trong email công việc, hai câu đó cam kết hai mức khác nhau — câu sau là một lời hứa.'
    },
    signals: ['cùng quan điểm với ai', 'chấp thuận một đề nghị', 'cùng nhau chốt một điều gì'],
    useWhen: [
      'Nêu quan điểm trong phần Nói: "I agree with that idea."',
      'Trả lời một đề nghị trong email: "We agree to your terms."',
      'Chốt lịch: "Shall we agree on Thursday?"'
    ],
    useNot: [
      { what: 'Không dùng agree with cho một đề nghị mình chấp thuận.', why: '"I agree with your request" chỉ nói mình thấy nó hợp lý. Nếu chấp thuận thì "I agree to your request".' },
      { what: 'Không thêm giới từ trước một mệnh đề that.', why: '"We agreed on that it was too late" sai. Đúng là "We agreed that it was too late."' }
    ],
    confuse: [
      {
        with: 'agree with khác agree to',
        tell: 'with là CÙNG NGHĨ như vậy. to là ĐỒNG Ý LÀM theo. Câu sau là một cam kết, câu trước thì không.',
        pair: [
          { en: 'I agree with your analysis.', vi: 'Tôi đồng tình với phân tích của bạn (cùng quan điểm).' },
          { en: 'I agree to your conditions.', vi: 'Tôi chấp thuận các điều kiện của bạn (cam kết).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The manager agreed with my request for leave.', right: 'The manager agreed to my request for leave.', why: 'Chấp thuận một đề nghị thì dùng to.' },
      { wrong: 'We finally agreed on that we should wait.', right: 'We finally agreed that we should wait.', why: 'Trước mệnh đề that thì không có giới từ.' }
    ],
    examples: [
      ['I completely agree with you.', 'Tôi hoàn toàn đồng ý với bạn.', 1, 'with + người.'],
      ['The company agreed to our proposal.', 'Công ty chấp thuận đề xuất của chúng tôi.', 1, 'to + đề nghị.'],
      ['We agreed on a price of two million.', 'Chúng tôi chốt giá hai triệu.', 1, 'on + thứ cùng quyết.'],
      ['She agreed to look after the children.', 'Cô ấy nhận trông bọn trẻ.', 1, 'agree + to V.'],
      ['The manager agreed with my request for leave.', 'Quản lý duyệt đơn nghỉ của tôi.', 0, 'Sai: sửa thành "agreed to my request".'],
      ['We finally agreed on that we should wait.', 'Cuối cùng chúng tôi thống nhất là nên đợi.', 0, 'Sai: bỏ "on" — "agreed that we should wait".']
    ],
    practice: [
      ['I agree ___ (with / to) everything she said.', 'with', 'Tôi đồng ý với mọi điều cô ấy nói.'],
      ['They agreed ___ (to / with) the new contract.', 'to', 'Họ chấp thuận hợp đồng mới.'],
      ['Can we agree ___ (on / with) a meeting time?', 'on', 'Mình chốt giờ họp được không?'],
      ['He agreed ___ (to / on) drive us to the airport.', 'to', 'Anh ấy nhận chở chúng tôi ra sân bay.'],
      ['Do you agree ___ (with / to) me about this?', 'with', 'Bạn có đồng ý với tôi về việc này không?'],
      ['The two sides agreed ___ (on / to) the main points.', 'on', 'Hai bên thống nhất các điểm chính.'],
      ['We agreed ___ (that / on that) the price was fair.', 'that', 'Chúng tôi thống nhất là giá đó hợp lý.'],
      ['She would not agree ___ (to / with) our request.', 'to', 'Cô ấy không chấp thuận đề nghị của chúng tôi.'],
      ['I do not agree ___ (with / on) that opinion.', 'with', 'Tôi không đồng tình với ý kiến đó.'],
      ['Let us agree ___ (on / to) a deadline first.', 'on', 'Mình chốt hạn chót trước đã.']
    ]
  },

  {
    slug: 'prep-except-besides-apart',
    en: 'except for, besides, apart from',
    vi: 'except for, besides, apart from — trừ ra, và thêm nữa',
    level: 'B2',
    summary: 'Ba cụm trông giống nhau nhưng hai cụm LOẠI RA và một cụm THÊM VÀO. Chọn nhầm là câu nói ngược hẳn ý mình.',
    formula: {
      rows: [
        ['except (for) = LOẠI RA', 'Everyone came except Nam. — Nam không tới.'],
        ['besides = THÊM VÀO', 'Besides Nam, three others came. — Nam tới, và ba người nữa.'],
        ['apart from = cả hai nghĩa', 'Nghĩa nào là do văn cảnh quyết, thường là loại ra.'],
        ['except khác except for', 'Sau all, every, no thì dùng except: "all except Nam". Đầu câu thì except for.'],
        ['Sau ba cụm này dùng V-ing', 'Apart from being expensive, it is slow.']
      ],
      note: 'besides là chỗ sai nhiều nhất, vì trông rất giống beside (cạnh bên) và vì người học hay nghĩ nó nghĩa "ngoài ra không tính". Thực ra nó nghĩa "tính cả cái đó, và còn thêm". "Besides English, she speaks French" nghĩa là cô ấy nói ĐƯỢC tiếng Anh, và thêm tiếng Pháp.'
    },
    signals: ['một danh sách có ngoại lệ', 'thêm một thứ vào danh sách đã có', 'câu mở đầu bằng một cụm loại trừ'],
    useWhen: [
      'Viết báo cáo: "Everything went well except for the delay."',
      'Kể điểm mạnh trong phần Nói: "Besides Vietnamese, I speak English and some Japanese."',
      'Nêu ngoại lệ trong email: "Apart from Monday, I am free all week."'
    ],
    useNot: [
      { what: 'Không dùng besides khi ý là loại trừ.', why: '"Besides Nam, nobody came" nghĩa là Nam CÓ tới. Nếu Nam không tới thì "Except for Nam, nobody came."' },
      { what: 'Không viết beside khi ý là "ngoài ra".', why: 'beside nghĩa là "cạnh bên". "Beside English" sai; đúng là "Besides English".' }
    ],
    confuse: [
      {
        with: 'except for khác besides',
        tell: 'Hỏi xem thứ được nêu tên có nằm TRONG nhóm hay không. Không nằm trong → except for. Nằm trong và còn thêm nữa → besides.',
        pair: [
          { en: 'Everyone passed except for Lan.', vi: 'Ai cũng đỗ trừ Lan (Lan trượt).' },
          { en: 'Besides Lan, two others passed.', vi: 'Ngoài Lan ra còn hai người nữa đỗ (Lan cũng đỗ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Besides the rain, the trip was perfect.', right: 'Except for the rain, the trip was perfect.', why: 'Mưa là điều KHÔNG hoàn hảo nên phải loại ra, dùng except for.' },
      { wrong: 'Beside maths, he teaches physics.', right: 'Besides maths, he teaches physics.', why: 'beside là "cạnh bên"; "ngoài ra" là besides.' }
    ],
    examples: [
      ['The office is open every day except Sunday.', 'Văn phòng mở cả tuần trừ Chủ nhật.', 1, 'Loại một ngày ra khỏi danh sách.'],
      ['Besides working full time, she studies at night.', 'Ngoài đi làm toàn thời gian, cô ấy còn học buổi tối.', 1, 'Thêm việc thứ hai vào.'],
      ['Apart from a small scratch, the car is fine.', 'Ngoài một vết xước nhỏ, xe vẫn ổn.', 1, 'apart from mang nghĩa loại ra.'],
      ['Everything was ready except for the projector.', 'Mọi thứ đã sẵn sàng, chỉ thiếu máy chiếu.', 1, 'except for đứng đầu mệnh đề.'],
      ['Besides the rain, the trip was perfect.', 'Ngoài chuyện mưa ra thì chuyến đi rất tuyệt.', 0, 'Sai: sửa thành "Except for the rain".'],
      ['Beside maths, he teaches physics.', 'Ngoài toán, thầy còn dạy lý.', 0, 'Sai: sửa thành "Besides maths".']
    ],
    practice: [
      ['Everyone agreed ___ (except / besides) my manager.', 'except', 'Ai cũng đồng ý trừ quản lý của tôi.'],
      ['___ (Besides / Except for) English, she speaks Korean.', 'Besides', 'Ngoài tiếng Anh, cô ấy còn nói tiếng Hàn.'],
      ['___ (Except for / Besides) one mistake, the report was good.', 'Except for', 'Ngoài một lỗi ra, báo cáo rất tốt.'],
      ['Nobody was late ___ (except / besides) me.', 'except', 'Không ai muộn ngoài tôi.'],
      ['___ (Apart from / Besides) the price, I like the flat.', 'Apart from', 'Ngoài chuyện giá cả, tôi thích căn hộ này.'],
      ['He plays guitar ___ (besides / except) the piano.', 'besides', 'Ngoài piano anh ấy còn chơi guitar.'],
      ['The shop opens daily ___ (except / besides) public holidays.', 'except', 'Cửa hàng mở hằng ngày trừ ngày lễ.'],
      ['She sat ___ (beside / besides) her sister at dinner.', 'beside', 'Cô ấy ngồi cạnh chị mình trong bữa tối.'],
      ['___ (Besides / Except) being cheap, it is easy to use.', 'Besides', 'Ngoài rẻ ra, nó còn dễ dùng.'],
      ['All the rooms were clean ___ (except for / besides) the kitchen.', 'except for', 'Mọi phòng đều sạch trừ bếp.']
    ]
  },

  {
    slug: 'prep-formal-email-phrases',
    en: 'in accordance with, with regard to, on behalf of',
    vi: 'Cụm giới từ trang trọng trong email công việc',
    level: 'B2',
    summary: 'Một nhóm cụm giới từ cố định làm nên giọng văn trang trọng của thư tín công việc. Chúng không suy ra được từ logic — sai một chữ là câu tụt hẳn xuống giọng nói chuyện.',
    formula: {
      rows: [
        ['with regard to / regarding', 'With regard to your email of 3 May, … — mở đầu nêu chủ đề.'],
        ['on behalf of', 'On behalf of the team, thank you. — nhân danh ai đó.'],
        ['in accordance with', 'in accordance with company policy — theo đúng quy định.'],
        ['in response to', 'In response to your request, … — trả lời một yêu cầu.'],
        ['due to / owing to', 'The delay was due to a supplier issue. — nêu nguyên nhân.']
      ],
      note: 'Chỗ sai kinh điển là số nhiều và mạo từ: "with regards to" (thừa chữ s) và "in regard of" đều sai — đúng là "with regard to" hoặc "regarding". Chữ "regards" chỉ dùng ở lời chào cuối thư ("Best regards"). Hai chỗ đó cách nhau vài dòng trong cùng một email nên rất dễ lẫn.'
    },
    signals: ['câu mở đầu một email công việc', 'nhân danh một tập thể', 'viện dẫn quy định hay hợp đồng'],
    useWhen: [
      'Mở đầu email trả lời: "With regard to your enquiry, …"',
      'Viết thay cả nhóm: "On behalf of my colleagues, I would like to apologise."',
      'Nêu căn cứ: "In accordance with your contract, we will …"'
    ],
    useNot: [
      { what: 'Không viết "with regards to".', why: 'Thừa chữ s. Đúng là "with regard to" hoặc gọn hơn là "regarding".' },
      { what: 'Không dùng "on behalf of" khi chỉ nói thay chính mình.', why: '"On behalf of me" sai. Cụm này chỉ dùng khi đại diện cho người khác hoặc một tập thể.' }
    ],
    confuse: [
      {
        with: 'with regard to khác best regards',
        tell: 'Số ít, ở đầu thư, nêu chủ đề: "with regard to". Số nhiều, ở cuối thư, là lời chào: "Best regards". Hai chỗ khác nhau và không đổi chỗ được.',
        pair: [
          { en: 'With regard to your invoice, we have paid it.', vi: 'Về hoá đơn của quý vị, chúng tôi đã thanh toán (đầu thư).' },
          { en: 'Best regards, Minh', vi: 'Trân trọng, Minh (cuối thư).' }
        ]
      }
    ],
    errors: [
      { wrong: 'With regards to your last email, I agree.', right: 'With regard to your last email, I agree.', why: 'Cụm này dùng số ít: regard.' },
      { wrong: 'In accordance to the rules, we cannot refund.', right: 'In accordance with the rules, we cannot refund.', why: 'accordance luôn đi với with.' }
    ],
    examples: [
      ['With regard to your order, it will ship on Friday.', 'Về đơn hàng của quý vị, hàng sẽ gửi vào thứ Sáu.', 1, 'Mở đầu nêu chủ đề, số ít.'],
      ['On behalf of the whole team, thank you.', 'Thay mặt cả nhóm, xin cảm ơn.', 1, 'Nhân danh một tập thể.'],
      ['We acted in accordance with the contract.', 'Chúng tôi làm đúng theo hợp đồng.', 1, 'accordance + with.'],
      ['In response to your complaint, we have opened a review.', 'Đáp lại khiếu nại của quý vị, chúng tôi đã mở rà soát.', 1, 'in response to + yêu cầu.'],
      ['With regards to your last email, I agree.', 'Về email vừa rồi của bạn, tôi đồng ý.', 0, 'Sai: sửa thành "With regard to".'],
      ['In accordance to the rules, we cannot refund.', 'Theo quy định, chúng tôi không hoàn tiền được.', 0, 'Sai: sửa thành "in accordance with".']
    ],
    practice: [
      ['___ (With regard to / With regards to) your request, we agree.', 'With regard to', 'Về đề nghị của quý vị, chúng tôi đồng ý.'],
      ['I am writing ___ (on behalf of / on behalf) the department.', 'on behalf of', 'Tôi viết thư thay mặt phòng ban.'],
      ['We processed it in accordance ___ (with / to) the policy.', 'with', 'Chúng tôi xử lý đúng theo chính sách.'],
      ['___ (In response to / In response of) your email, please see below.', 'In response to', 'Đáp lại email của quý vị, xin xem bên dưới.'],
      ['The cancellation was due ___ (to / of) bad weather.', 'to', 'Việc huỷ là do thời tiết xấu.'],
      ['___ (Regarding / Regards) the invoice, we have no record of it.', 'Regarding', 'Về hoá đơn đó, chúng tôi không có hồ sơ nào.'],
      ['He signed the letter ___ (on behalf of / in behalf) the director.', 'on behalf of', 'Ông ấy ký thư thay mặt giám đốc.'],
      ['Please act ___ (in accordance with / in accordance to) these rules.', 'in accordance with', 'Xin thực hiện đúng theo các quy định này.'],
      ['Best ___ (regards / regard), Minh', 'regards', 'Trân trọng, Minh.'],
      ['___ (Owing to / Owing of) the strike, deliveries are late.', 'Owing to', 'Do đình công, việc giao hàng bị chậm.']
    ]
  },

  {
    slug: 'prep-verb-prep-meaning-change',
    en: 'look at, look for, look after, look into',
    vi: 'Một động từ, nhiều giới từ, nhiều nghĩa hẳn nhau',
    level: 'B2',
    summary: 'Ở bậc này giới từ không còn là chi tiết ngữ pháp mà là thứ quyết định nghĩa. Chọn nhầm thì câu vẫn đúng ngữ pháp và vẫn trôi chảy — nhưng nói một điều khác hẳn, nên không ai sửa cho.',
    formula: {
      rows: [
        ['look at = nhìn vào', 'Look at this photo.'],
        ['look for = tìm', 'I am looking for my keys.'],
        ['look after = trông nom', 'She looks after her grandmother.'],
        ['look into = điều tra, xem xét', 'We will look into the complaint.'],
        ['Cùng cơ chế với take, get, run', 'take after (giống ai) · take on (nhận việc) · take to (đâm ra thích)']
      ],
      note: 'Vì sao nhóm này nguy hiểm hơn nhóm ở bậc A2: ở đó chọn sai giới từ thì câu nghe lạ và người nghe đoán ra ý mình. Ở đây chọn sai thì câu hoàn toàn tự nhiên nhưng mang nghĩa khác — "I will look for it" (tôi sẽ đi tìm) và "I will look into it" (tôi sẽ xem xét việc đó) là hai lời hứa khác nhau trong một email công việc.'
    },
    signals: ['một động từ quen thuộc nhưng nghĩa lạ trong câu', 'giới từ đi ngay sau động từ', 'email hứa hẹn xử lý việc gì'],
    useWhen: [
      'Trả lời khiếu nại: "I will look into this and reply by Friday."',
      'Nói về gia đình trong phần Nói: "I look after my younger brother."',
      'Kể chuyện: "I looked for my phone everywhere."'
    ],
    useNot: [
      { what: 'Không dùng look for khi ý là điều tra một sự việc.', why: '"I will look for your complaint" nghĩa là đi tìm tờ khiếu nại. Xem xét nội dung thì "look into".' },
      { what: 'Không dùng look after khi ý là nhìn theo.', why: '"She looked after the train" nghĩa là chăm sóc đoàn tàu. Nhìn theo là "looked at the train" hoặc "watched".' }
    ],
    confuse: [
      {
        with: 'look for khác look into',
        tell: 'for là đi tìm một VẬT đang thất lạc. into là xem xét một SỰ VIỆC để hiểu ra nguyên nhân.',
        pair: [
          { en: 'I am looking for the file.', vi: 'Tôi đang tìm tệp đó (vật thất lạc).' },
          { en: 'I am looking into the problem.', vi: 'Tôi đang xem xét vấn đề đó (điều tra).' }
        ]
      }
    ],
    errors: [
      { wrong: 'We will look for your complaint and reply next week.', right: 'We will look into your complaint and reply next week.', why: 'Xem xét một sự việc thì dùng look into.' },
      { wrong: 'He takes to his father — same eyes, same voice.', right: 'He takes after his father — same eyes, same voice.', why: 'Giống ai đó là take after; take to là đâm ra thích.' }
    ],
    examples: [
      ['Please look at page twelve.', 'Xin xem trang mười hai.', 1, 'look at = nhìn vào.'],
      ['I have been looking for my glasses all morning.', 'Cả buổi sáng tôi đi tìm cái kính.', 1, 'look for = tìm.'],
      ['Who looks after the children when you work?', 'Ai trông bọn trẻ lúc bạn đi làm?', 1, 'look after = trông nom.'],
      ['The manager promised to look into the issue.', 'Quản lý hứa sẽ xem xét vấn đề này.', 1, 'look into = điều tra.'],
      ['We will look for your complaint and reply next week.', 'Chúng tôi sẽ xem xét khiếu nại và trả lời tuần sau.', 0, 'Sai: sửa thành "look into your complaint".'],
      ['He takes to his father — same eyes, same voice.', 'Anh ấy giống bố — cùng đôi mắt, cùng giọng nói.', 0, 'Sai: sửa thành "takes after his father".']
    ],
    practice: [
      ['Could you ___ (look into / look for) the delay and tell me why?', 'look into', 'Bạn xem xét việc chậm trễ rồi cho tôi biết lý do nhé.'],
      ['I cannot find my wallet — help me ___ (look for / look at) it.', 'look for', 'Tôi không thấy ví đâu, giúp tôi tìm với.'],
      ['She ___ (looks after / looks into) her mother every weekend.', 'looks after', 'Cuối tuần nào cô ấy cũng chăm mẹ.'],
      ['___ (Look at / Look for) this chart before you decide.', 'Look at', 'Xem biểu đồ này trước khi quyết định.'],
      ['He ___ (takes after / takes on) his mother in character.', 'takes after', 'Tính anh ấy giống mẹ.'],
      ['The company ___ (took on / took after) fifty new staff.', 'took on', 'Công ty tuyển thêm năm mươi nhân viên.'],
      ['We ran ___ (into / after) an old friend at the airport.', 'into', 'Chúng tôi tình cờ gặp một người bạn cũ ở sân bay.'],
      ['I will ___ (look into / look at) the complaint personally.', 'look into', 'Tôi sẽ đích thân xem xét khiếu nại.'],
      ['She has really ___ (taken to / taken after) her new job.', 'taken to', 'Cô ấy rất hợp với công việc mới.'],
      ['Please ___ (look after / look for) my bag for a minute.', 'look after', 'Trông túi giúp tôi một lát nhé.']
    ]
  },

  {
    slug: 'prep-participle-preps',
    en: 'following, regarding, concerning, including, given',
    vi: 'Giới từ có gốc phân từ — following, regarding, including, given',
    level: 'B2',
    summary: 'Một nhóm từ trông như động từ đuôi -ing nhưng thực ra hoạt động như giới từ: sau chúng là danh từ, và chúng KHÔNG cần chủ ngữ. Đây là chỗ dựng câu gọn của văn viết trang trọng.',
    formula: {
      rows: [
        ['following = sau, tiếp theo', 'Following the meeting, we agreed to wait.'],
        ['regarding / concerning = về', 'Regarding your invoice, we have paid it.'],
        ['including = kể cả', 'Six people came, including two managers.'],
        ['excluding = không kể', 'The price is 500,000, excluding VAT.'],
        ['given = xét tới', 'Given the cost, we decided against it.']
      ],
      note: 'Vì sao dễ nhầm: chúng giống hệt một mệnh đề phân từ, mà mệnh đề phân từ thì PHẢI có cùng chủ ngữ với mệnh đề chính. Những từ này thì không — đã thành giới từ thật sự nên "Following the meeting, we agreed" hoàn toàn đúng dù "we" không phải chủ thể của "following". Đó là lý do chúng an toàn hơn phân từ lơ lửng.'
    },
    signals: ['từ đuôi -ing đứng đầu câu rồi tới danh từ', 'văn bản trang trọng, thông báo, hợp đồng', 'không có chủ ngữ riêng cho cụm đó'],
    useWhen: [
      'Viết thông báo: "Following the storm, the office will stay closed."',
      'Mở đầu một email trả lời: "Regarding your enquiry, …"',
      'Liệt kê có ngoại lệ: "All staff, excluding part-timers, are invited."'
    ],
    useNot: [
      { what: 'Không đặt mệnh đề có chủ ngữ sau chúng.', why: '"Following we finished the meeting" sai. Sau chúng là danh từ: "Following the meeting".' },
      { what: 'Không lẫn following với the following.', why: '"Following are the results" và "The following are the results" khác nhau; dạng có mạo từ là danh từ, không phải giới từ.' }
    ],
    confuse: [
      {
        with: 'following (giới từ) khác following (phân từ của động từ follow)',
        tell: 'Là giới từ thì nó nghĩa "sau khi" và đứng đầu câu. Là phân từ thật thì nó nghĩa "đi theo" và có chủ thể rõ.',
        pair: [
          { en: 'Following the announcement, prices rose.', vi: 'Sau thông báo, giá tăng (giới từ).' },
          { en: 'The dog came in, following its owner.', vi: 'Con chó đi vào, theo sau chủ (phân từ thật).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Following we discussed the budget, we agreed.', right: 'Following our discussion of the budget, we agreed.', why: 'Sau following phải là danh từ, không phải mệnh đề.' },
      { wrong: 'The fee is 200,000 including of tax.', right: 'The fee is 200,000 including tax.', why: 'including đi thẳng với danh từ, không có of.' }
    ],
    examples: [
      ['Following the review, three changes were made.', 'Sau đợt rà soát, ba thay đổi đã được thực hiện.', 1, 'following + danh từ.'],
      ['Regarding your question, I will reply tomorrow.', 'Về câu hỏi của bạn, mai tôi trả lời.', 1, 'regarding mở đầu nêu chủ đề.'],
      ['Twelve people attended, including the director.', 'Mười hai người dự, kể cả giám đốc.', 1, 'including + danh từ.'],
      ['Given the short notice, the turnout was good.', 'Xét việc báo gấp thì lượng người tới là tốt.', 1, 'given = xét tới.'],
      ['Following we discussed the budget, we agreed.', 'Sau khi bàn ngân sách, chúng tôi thống nhất.', 0, 'Sai: sửa thành "Following our discussion of the budget".'],
      ['The fee is 200,000 including of tax.', 'Phí là 200.000 đã gồm thuế.', 0, 'Sai: bỏ "of" — "including tax".']
    ],
    practice: [
      ['___ (Following / Follow) the accident, the road was closed.', 'Following', 'Sau vụ tai nạn, con đường bị đóng.'],
      ['___ (Regarding / Regard) your application, we need two references.', 'Regarding', 'Về hồ sơ của bạn, chúng tôi cần hai thư giới thiệu.'],
      ['Everyone came, ___ (including / included) the new staff.', 'including', 'Ai cũng tới, kể cả nhân viên mới.'],
      ['The rent is 4 million, ___ (excluding / excluded) electricity.', 'excluding', 'Tiền thuê là 4 triệu, chưa gồm điện.'],
      ['___ (Given / Giving) the traffic, we should leave early.', 'Given', 'Xét tình hình giao thông, mình nên đi sớm.'],
      ['I am writing ___ (concerning / concern) the missing order.', 'concerning', 'Tôi viết thư về đơn hàng bị thất lạc.'],
      ['___ (Following / After that) the storm, many trees fell.', 'Following', 'Sau cơn bão, nhiều cây đổ.'],
      ['Ten items were damaged, ___ (including / include) two laptops.', 'including', 'Mười món bị hỏng, trong đó có hai laptop.'],
      ['___ (Given / Given that) his experience, he is the right choice.', 'Given', 'Xét kinh nghiệm của anh ấy thì đó là lựa chọn đúng.'],
      ['___ (Regarding / With regard) the deadline, can we extend it?', 'Regarding', 'Về hạn chót, mình gia hạn được không?']
    ]
  },

  {
    slug: 'prep-abstract-fixed',
    en: 'in charge of, on duty, at risk, under pressure',
    vi: 'Cụm giới từ trừu tượng cố định — in charge of, on duty, at risk',
    level: 'B2',
    summary: 'Một nhóm cụm mà giới từ không còn nghĩa không gian gì nữa. Không suy ra được, phải học nguyên cụm — nhưng bù lại chúng cực kỳ hay dùng khi nói về công việc.',
    formula: {
      rows: [
        ['in + …', 'in charge of · in danger · in doubt · in touch with · in favour of'],
        ['on + …', 'on duty · on purpose · on time · on holiday · on average'],
        ['at + …', 'at risk · at war · at fault · at first · at least'],
        ['under + …', 'under pressure · under control · under discussion · under repair'],
        ['out of + …', 'out of order · out of date · out of work · out of stock']
      ],
      note: 'Ba cặp gài bẫy đáng nhớ: "on time" (đúng giờ) khác "in time" (kịp lúc); "at first" (lúc đầu) khác "first" (thứ nhất); "in the end" (rốt cuộc) khác "at the end" (ở phần cuối của cái gì). Cả ba cặp đều hay xuất hiện trong bài Nói kể chuyện.'
    },
    signals: ['giới từ không mang nghĩa nơi chốn', 'cụm nói về vai trò, trạng thái hay rủi ro', 'ngữ cảnh công việc'],
    useWhen: [
      'Giới thiệu công việc trong phần Nói: "I am in charge of the sales team."',
      'Kể một tình huống khó: "We were under a lot of pressure."',
      'Báo hỏng hóc: "The lift is out of order."'
    ],
    useNot: [
      { what: 'Không lẫn on time với in time.', why: '"The train arrived in time" nghĩa là kịp lúc trước khi muộn; đúng giờ theo lịch thì là "on time".' },
      { what: 'Không thêm mạo từ vào các cụm này.', why: '"in the charge of the team" đổi nghĩa hẳn. Cụm cố định là "in charge of the team".' }
    ],
    confuse: [
      {
        with: 'in the end khác at the end',
        tell: 'in the end nghĩa là "rốt cuộc", nói về kết cục. at the end nghĩa là "ở phần cuối của" và luôn có "of" theo sau.',
        pair: [
          { en: 'In the end, we decided to stay.', vi: 'Rốt cuộc chúng tôi quyết định ở lại.' },
          { en: 'At the end of the film, everyone cried.', vi: 'Ở đoạn cuối phim, ai cũng khóc.' }
        ]
      }
    ],
    errors: [
      { wrong: 'She is in charge for the project.', right: 'She is in charge of the project.', why: 'Cụm cố định là in charge of.' },
      { wrong: 'At the end, we chose the cheaper one.', right: 'In the end, we chose the cheaper one.', why: '"Rốt cuộc" là in the end; at the end cần "of" và nói về phần cuối của cái gì.' }
    ],
    examples: [
      ['She is in charge of the whole department.', 'Cô ấy phụ trách cả phòng.', 1, 'in charge of + việc phụ trách.'],
      ['Two nurses are on duty tonight.', 'Đêm nay có hai y tá trực.', 1, 'on duty = đang trực.'],
      ['The lift is out of order again.', 'Thang máy lại hỏng rồi.', 1, 'out of order = hỏng.'],
      ['The whole team is under pressure this week.', 'Cả nhóm chịu áp lực trong tuần này.', 1, 'under pressure = chịu áp lực.'],
      ['She is in charge for the project.', 'Cô ấy phụ trách dự án.', 0, 'Sai: sửa thành "in charge of the project".'],
      ['At the end, we chose the cheaper one.', 'Rốt cuộc chúng tôi chọn cái rẻ hơn.', 0, 'Sai: sửa thành "In the end".']
    ],
    practice: [
      ['Who is ___ (in charge of / in charge for) the budget?', 'in charge of', 'Ai phụ trách ngân sách?'],
      ['The train arrived exactly ___ (on / in) time.', 'on', 'Tàu tới đúng giờ.'],
      ['We got to the station just ___ (in / on) time to catch it.', 'in', 'Chúng tôi tới ga vừa kịp bắt chuyến đó.'],
      ['The photocopier is ___ (out of / out) order.', 'out of', 'Máy photocopy bị hỏng.'],
      ['___ (In the end / At the end), nobody complained.', 'In the end', 'Rốt cuộc chẳng ai phàn nàn.'],
      ['The situation is now ___ (under / in) control.', 'under', 'Tình hình giờ đã trong tầm kiểm soát.'],
      ['My passport is ___ (out of / off) date.', 'out of', 'Hộ chiếu của tôi hết hạn rồi.'],
      ['He broke it ___ (on / in) purpose.', 'on', 'Anh ta cố tình làm hỏng nó.'],
      ['Please keep ___ (in / on) touch with the supplier.', 'in', 'Xin giữ liên lạc với nhà cung cấp.'],
      ['___ (At first / In first) I did not like it, but now I do.', 'At first', 'Lúc đầu tôi không thích, giờ thì có.']
    ]
  },

  {
    slug: 'prep-formal-time',
    en: 'prior to, as of, ahead of, by the time',
    vi: 'Cụm thời gian trang trọng — prior to, as of, ahead of',
    level: 'B2',
    summary: 'Bản trang trọng của before, from và earlier than. Chúng làm nên giọng văn hợp đồng và thông báo, và chỗ sai duy nhất là quên rằng ba cụm đầu là GIỚI TỪ còn by the time là LIÊN TỪ.',
    formula: {
      rows: [
        ['prior to + danh từ = trước', 'Prior to the meeting, please read the notes.'],
        ['as of + mốc = kể từ', 'As of 1 June, the new rates apply.'],
        ['ahead of + danh từ = sớm hơn', 'We finished ahead of schedule.'],
        ['by the time + MỆNH ĐỀ', 'By the time we arrived, it had closed.'],
        ['Thì đi với by the time', 'Mệnh đề chính thường ở quá khứ hoàn thành hoặc tương lai hoàn thành.']
      ],
      note: 'by the time là chỗ duy nhất trong nhóm này không phải giới từ, và nó kéo theo một hệ quả về thì: vì nó đánh dấu một mốc, việc kia phải XONG TRƯỚC mốc đó, nên mệnh đề chính dùng hoàn thành. "By the time we arrived, the shop closed" nghe hụt; đúng là "had closed".'
    },
    signals: ['văn bản hợp đồng, thông báo chính thức', 'một mốc bắt đầu hiệu lực', 'hai việc, một việc xong trước việc kia'],
    useWhen: [
      'Viết thông báo thay đổi: "As of next Monday, the office opens at eight."',
      'Nêu điều kiện trước: "Prior to signing, please read clause 4."',
      'Kể chuyện trong phần Nói: "By the time I got there, everyone had left."'
    ],
    useNot: [
      { what: 'Không đặt mệnh đề sau prior to.', why: '"prior to we started" sai. Sau nó là danh từ hoặc V-ing: "prior to starting".' },
      { what: 'Không đặt danh từ trần sau by the time.', why: '"by the time the meeting" sai. Nó cần một mệnh đề: "by the time the meeting ended".' }
    ],
    confuse: [
      {
        with: 'prior to khác by the time',
        tell: 'prior to là giới từ nên sau nó là danh từ hoặc V-ing. by the time là liên từ nên sau nó là một mệnh đề đầy đủ.',
        pair: [
          { en: 'Prior to the interview, read the job description.', vi: 'Trước buổi phỏng vấn, hãy đọc mô tả công việc (danh từ).' },
          { en: 'By the time the interview started, I was calm.', vi: 'Tới lúc buổi phỏng vấn bắt đầu, tôi đã bình tĩnh (mệnh đề).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Prior to we sign, please check the terms.', right: 'Prior to signing, please check the terms.', why: 'Sau prior to dùng danh từ hoặc V-ing.' },
      { wrong: 'By the time we arrived, the shop closed.', right: 'By the time we arrived, the shop had closed.', why: 'Việc kia xong trước mốc nên dùng quá khứ hoàn thành.' }
    ],
    examples: [
      ['Prior to the launch, we ran three tests.', 'Trước khi ra mắt, chúng tôi chạy ba đợt thử.', 1, 'prior to + danh từ.'],
      ['As of today, the old password no longer works.', 'Kể từ hôm nay, mật khẩu cũ không dùng được nữa.', 1, 'as of + mốc.'],
      ['The team delivered ahead of schedule.', 'Nhóm hoàn thành sớm hơn kế hoạch.', 1, 'ahead of = sớm hơn.'],
      ['By the time she called, I had already left.', 'Lúc cô ấy gọi thì tôi đã đi rồi.', 1, 'by the time + mệnh đề, chính ở hoàn thành.'],
      ['Prior to we sign, please check the terms.', 'Trước khi ký, xin kiểm tra điều khoản.', 0, 'Sai: sửa thành "Prior to signing".'],
      ['By the time we arrived, the shop closed.', 'Lúc chúng tôi tới thì cửa hàng đóng cửa.', 0, 'Sai: sửa thành "had closed".']
    ],
    practice: [
      ['___ (Prior to / By the time) the meeting, please send your notes.', 'Prior to', 'Trước cuộc họp, xin gửi ghi chú của bạn.'],
      ['___ (As of / As from of) 1 July, prices will change.', 'As of', 'Kể từ mùng 1 tháng Bảy, giá sẽ thay đổi.'],
      ['We finished two days ___ (ahead of / ahead) schedule.', 'ahead of', 'Chúng tôi xong sớm hơn kế hoạch hai ngày.'],
      ['___ (By the time / Prior to) I got home, it had stopped raining.', 'By the time', 'Lúc tôi về tới nhà thì trời đã tạnh.'],
      ['Prior to ___ (joining / join) the company, she taught English.', 'joining', 'Trước khi vào công ty, cô ấy dạy tiếng Anh.'],
      ['By the time the film ended, most people ___ (had left / left).', 'had left', 'Tới lúc phim hết thì phần lớn đã về.'],
      ['All staff must register ___ (prior to / by the time) Friday.', 'prior to', 'Toàn thể nhân viên phải đăng ký trước thứ Sáu.'],
      ['___ (As of / At of) next week, we work from home.', 'As of', 'Kể từ tuần sau, chúng tôi làm ở nhà.'],
      ['They arrived well ___ (ahead of / ahead to) the others.', 'ahead of', 'Họ tới sớm hơn hẳn những người khác.'],
      ['___ (By the time / Prior to) you read this, I will have gone.', 'By the time', 'Lúc bạn đọc được cái này thì tôi đã đi rồi.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'preposition',
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
