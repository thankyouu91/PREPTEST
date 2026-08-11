/**
 * Ngữ pháp — nhóm SẮC THÁI, ĐỘ TRANG TRỌNG và RÀO ĐÓN, phần bậc C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối grammar-register.js (A1–B2) và grammar-register-c1.js (C1). Hạn
 * mức của nhóm là 33 điểm; hai tệp kia đã dùng 23 điểm, tệp này dùng nốt 10
 * điểm bậc C2. Vậy là nhóm đủ 33/33 — và cả khu ngữ pháp đóng lại ở đây.
 *
 * Bậc dưới lo NÓI CHO ĐÚNG MỰC. Bậc C2 lo chuyện khác hẳn: ĐỌC RA ĐIỀU KHÔNG
 * ĐƯỢC NÓI RA. Mỉa mai nói ngược hẳn ý thật; hàm ý để người nghe tự suy ra
 * phần còn lại; tiền giả định gài sẵn một khẳng định mà người nghe chưa kịp
 * đồng ý; một chữ "regime" thay cho "government" đã cài xong thái độ; hai dấu
 * ngoặc kép quanh chữ "chuyên gia" là đủ để phủ nhận nó.
 *
 * Đây là phần ăn điểm của bài Đọc và bài Nghe ở mức cao: câu hỏi "thái độ của
 * tác giả là gì", "tác giả ngụ ý điều gì" chính là hỏi mấy thứ trong tệp này.
 * Ở chiều ngược lại, người viết bậc C2 phải kiểm soát được chúng để khỏi vô
 * tình cài thái độ vào một bản báo cáo lẽ ra phải trung tính.
 *
 * Ghi chú tránh trùng: động từ tường thuật mang sắc thái đánh giá (claim,
 * concede) thuộc nhóm bị động - tường thuật; nói giảm và uyển ngữ đã dựng ở
 * bậc C1 trong chính nhóm này; đảo ngữ điều kiện trong "Should you require…"
 * thuộc nhóm câu điều kiện.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'irony-and-sarcasm',
    en: 'Irony and sarcasm',
    vi: 'Mỉa mai và châm biếm — nói ngược hẳn ý thật',
    level: 'C2',
    summary: 'Người nói dùng đúng từ khen nhưng ý là chê. Hiểu theo nghĩa đen là hiểu ngược hoàn toàn.',
    formula: {
      rows: [
        ['Khen sau chuyện hỏng', '"The train is cancelled." — "OH, THAT IS JUST GREAT."'],
        ['Tổng kết ngược', 'After the argument: "WELL, THAT WENT WELL."'],
        ['Dấu hiệu khi nói', 'Nhấn giọng kéo dài, hạ giọng cuối, ngừng một nhịp trước khi nói.'],
        ['Dấu hiệu khi viết', 'Chỉ có ngữ cảnh — nên rất dễ bị hiểu nhầm trong email.']
      ],
      note: 'Phân biệt hai chữ: mỉa mai (irony) là nói ngược nói chung, còn châm biếm (sarcasm) là mỉa mai nhắm vào một người, thường có ý gai góc. Trong email và tin nhắn công việc thì tránh hẳn: không có ngữ điệu đỡ lời, người đọc rất dễ hiểu theo nghĩa đen rồi giận thật.'
    },
    signals: ['just great', 'that went well', 'brilliant sau tin xấu', 'ngữ cảnh trái ngược'],
    useWhen: [
      'Bài Đọc và bài Nghe: nhận ra thái độ thật của người nói.',
      'Hội thoại thân mật giữa những người đã hiểu nhau.',
      'Văn châm biếm, bình luận xã hội, tiểu phẩm.'
    ],
    useNot: [
      { what: 'Không dùng mỉa mai trong email công việc.', why: 'Chữ viết không có ngữ điệu. "Thanks for the very prompt reply" gửi cho người trả lời chậm sẽ bị đọc thành lời cảm ơn thật, hoặc bị coi là xỏ xiên.' },
      { what: 'Không hiểu câu mỉa theo nghĩa đen.', why: '"Oh, that is just great" ngay sau tin tàu bị huỷ là lời than, không phải lời khen.' }
    ],
    confuse: [
      {
        with: 'khen thật khác khen mỉa',
        tell: 'Nhìn chuyện vừa xảy ra: chuyện tốt thì là khen thật, chuyện hỏng thì là mỉa.',
        pair: [
          { en: 'We got the contract. That is just great.', vi: 'Chúng ta ký được hợp đồng rồi. Tuyệt quá (khen thật).' },
          { en: 'The train is cancelled. That is just great.', vi: 'Tàu bị huỷ. Hay ho thật đấy (mỉa mai).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The train is cancelled. That is just great, I am so pleased.', right: 'The train is cancelled. That is just great, said nobody waiting on the platform.', why: 'Hiểu câu mỉa thành lời khen thật nên vế sau mâu thuẫn.' },
      { wrong: 'Dear Mr Long, thank you for your very prompt reply after three weeks.', right: 'Dear Mr Long, I am following up on my email of three weeks ago.', why: 'Mỉa mai trong thư công việc rất dễ thành xúc phạm.' }
    ],
    examples: [
      ['The train is cancelled. Oh, that is just great.', 'Tàu bị huỷ. Ôi, hay ho thật đấy.', 1, 'Khen sau chuyện hỏng — dấu hiệu rõ của mỉa mai.'],
      ['They lost every match. Well, that went well.', 'Họ thua sạch mọi trận. Ừ thì, suôn sẻ ghê.', 1, 'Tổng kết ngược sau một chuỗi thất bại.'],
      ['We got the contract. That is just great.', 'Chúng ta ký được hợp đồng rồi. Tuyệt quá.', 1, 'Đối chiếu: cùng câu chữ nhưng chuyện tốt nên là khen thật.'],
      ['I am following up on my email of three weeks ago.', 'Tôi xin nhắc lại email tôi gửi cách đây ba tuần.', 1, 'Thay vì mỉa trong thư công việc thì nói thẳng và lịch sự.'],
      ['The train is cancelled. That is just great, I am so pleased.', 'Tàu bị huỷ. Hay quá, tôi mừng ghê.', 0, 'Hiểu ngược: câu trước là mỉa, sửa vế sau cho khớp, ví dụ "…said nobody waiting on the platform."'],
      ['Dear Mr Long, thank you for your very prompt reply after three weeks.', 'Kính gửi ông Long, cảm ơn ông đã hồi âm rất nhanh sau ba tuần.', 0, 'Xỏ xiên: sửa thành "Dear Mr Long, I am following up on my email of three weeks ago."']
    ],
    practice: [
      ['The train is cancelled. That is just ___ (great / awful) — said with irony.', 'great', 'Tàu bị huỷ. Hay ho thật đấy — nói giọng mỉa.'],
      ['They lost every match. Well, that ___ (went well / was a disaster) — ironic.', 'went well', 'Họ thua sạch. Ừ thì, suôn sẻ ghê — nói mỉa.'],
      ['Irony aimed at a person is called ___ (sarcasm / euphemism).', 'sarcasm', 'Mỉa mai nhắm vào một người gọi là châm biếm.'],
      ['In writing, irony is risky because there is no ___ (intonation / grammar).', 'intonation', 'Trong văn viết, mỉa mai rất rủi ro vì không có ngữ điệu.'],
      ['In a work email, ___ (say it directly / use irony).', 'say it directly', 'Trong email công việc thì nói thẳng.'],
      ['"We got the contract. That is just great." Here the speaker is ___ (sincere / ironic).', 'sincere', 'Ở đây người nói khen thật.'],
      ['To read irony, look at the ___ (context / vocabulary).', 'context', 'Muốn nhận ra mỉa mai thì nhìn ngữ cảnh.'],
      ['I am ___ (following up on / thanking you for) my email of three weeks ago.', 'following up on', 'Tôi xin nhắc lại email gửi ba tuần trước.'],
      ['Taking irony literally reverses the ___ (meaning / grammar).', 'meaning', 'Hiểu mỉa mai theo nghĩa đen là hiểu ngược nghĩa.'],
      ['"Brilliant." right after bad news is probably ___ (ironic / sincere).', 'ironic', 'Nói "Brilliant" ngay sau tin xấu thì gần như chắc là mỉa.']
    ]
  },

  {
    slug: 'implicature',
    en: 'Conversational implicature',
    vi: 'Hàm ý hội thoại — nói A để người nghe hiểu B',
    level: 'C2',
    summary: 'Điều người nói ngụ ý thường nhiều hơn điều họ nói ra. Nghe đúng nghĩa đen mà bỏ mất hàm ý là hiểu thiếu một nửa.',
    formula: {
      rows: [
        ['Nói ít hơn mức có thể', '"SOME students passed." → ngụ ý không phải tất cả.'],
        ['Nêu tình trạng để nhờ vả', '"IT IS COLD IN HERE." → làm ơn đóng cửa sổ.'],
        ['Khen chệch chỗ', '"He has a NICE PERSONALITY." (khi được hỏi về ngoại hình)'],
        ['Trả lời lệch câu hỏi', '"Did you like it?" — "THE MUSIC WAS GOOD." → phần còn lại thì không.']
      ],
      note: 'Cơ chế chung: người nghe mặc định người nói đã nói đủ mức cần thiết. Vậy nên nói "some" là ngụ ý "không phải all"; khen mỗi một điểm là ngụ ý những điểm khác không đáng khen. Hàm ý khác tiền giả định ở chỗ nó RÚT LẠI ĐƯỢC: "Some students passed — in fact, all of them did" nghe vẫn xuôi.'
    },
    signals: ['some (ngụ ý không phải tất cả)', 'trả lời lệch câu hỏi', 'khen chệch chỗ'],
    useWhen: [
      'Bài Đọc và bài Nghe: câu hỏi "tác giả ngụ ý điều gì" chính là hỏi hàm ý.',
      'Nhờ vả gián tiếp mà không phải nói thẳng.',
      'Chê khéo: nêu điểm tốt duy nhất, phần còn lại người nghe tự hiểu.'
    ],
    useNot: [
      { what: 'Không trả lời chỉ đúng nghĩa đen khi câu hỏi có hàm ý.', why: '"Do you know what time it is?" mà đáp "Yes" rồi im là đùa dai. Người ta đang hỏi giờ.' },
      { what: 'Không dựa vào hàm ý trong văn bản pháp lý hay hướng dẫn kỹ thuật.', why: 'Chỗ cần chính xác thì phải nói hết ra; hàm ý rút lại được nên không ràng buộc ai.' }
    ],
    confuse: [
      {
        with: 'hàm ý khác tiền giả định',
        tell: 'Hàm ý rút lại được mà câu vẫn xuôi. Tiền giả định thì không rút lại được.',
        pair: [
          { en: 'Some students passed — in fact, all of them did.', vi: 'Một số sinh viên đỗ — thật ra là đỗ hết (rút lại hàm ý, câu vẫn xuôi).' },
          { en: 'He stopped smoking — in fact, he never smoked.', vi: 'Anh ta bỏ thuốc — thật ra chưa hút bao giờ (mâu thuẫn: tiền giả định không rút được).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Do you know what time it is? — Yes, I do.', right: 'Do you know what time it is? — Yes, it is half past four.', why: 'Bỏ mất hàm ý: người ta đang hỏi giờ chứ không hỏi mình có biết hay không.' },
      { wrong: 'The manual says some parts are included, so all of them are.', right: 'The manual says some parts are included, so others must be bought separately.', why: '"some" ngụ ý không phải tất cả.' }
    ],
    examples: [
      ['Some students passed the exam.', 'Một số sinh viên đã đỗ kỳ thi.', 1, 'Ngụ ý không phải tất cả, dù câu chữ không nói thế.'],
      ['It is a bit cold in here, is it not?', 'Trong này hơi lạnh nhỉ?', 1, 'Nêu tình trạng để nhờ đóng cửa sổ — hàm ý cầu khiến.'],
      ['Did you enjoy the play? — The music was good.', 'Bạn thấy vở kịch thế nào? — Phần nhạc thì hay.', 1, 'Khen mỗi một điểm, phần còn lại người nghe tự hiểu.'],
      ['Some students passed — in fact, all of them did.', 'Một số sinh viên đỗ — thật ra là đỗ hết.', 1, 'Rút lại hàm ý mà câu vẫn xuôi, khác hẳn tiền giả định.'],
      ['Do you know what time it is? — Yes, I do.', 'Bạn có biết mấy giờ rồi không? — Có, tôi biết.', 0, 'Bỏ mất hàm ý: sửa thành "Yes, it is half past four."'],
      ['The manual says some parts are included, so all of them are.', 'Sách hướng dẫn nói có kèm một số bộ phận, vậy là kèm hết.', 0, 'Suy sai: sửa thành "…so others must be bought separately."']
    ],
    practice: [
      ['"Some students passed" implies ___ (not all passed / all passed).', 'not all passed', 'Câu đó ngụ ý không phải tất cả đều đỗ.'],
      ['"It is cold in here" is often a request to ___ (close the window / describe the weather).', 'close the window', 'Câu đó thường là lời nhờ đóng cửa sổ.'],
      ['Do you know what time it is? — Yes, ___ (it is half past four / I do).', 'it is half past four', 'Có, bốn giờ rưỡi rồi.'],
      ['Implicature can be ___ (cancelled / never cancelled) without contradiction.', 'cancelled', 'Hàm ý rút lại được mà không mâu thuẫn.'],
      ['Asked about looks, "He has a nice personality" implies he is ___ (not handsome / handsome).', 'not handsome', 'Câu đó ngụ ý anh ta không đẹp trai.'],
      ['The manual says some parts are included, so others must be ___ (bought separately / included too).', 'bought separately', 'Vậy các bộ phận khác phải mua riêng.'],
      ['Reading questions about what the author ___ (implies / states) test implicature.', 'implies', 'Câu hỏi về điều tác giả ngụ ý chính là hỏi hàm ý.'],
      ['Legal documents should not rely on ___ (implicature / definitions).', 'implicature', 'Văn bản pháp lý không nên dựa vào hàm ý.'],
      ['Answering only the literal question can sound ___ (unhelpful / precise).', 'unhelpful', 'Chỉ trả lời đúng nghĩa đen nghe như không muốn giúp.'],
      ['Saying less than you could implies the rest is ___ (not true / obvious).', 'not true', 'Nói ít hơn mức có thể là ngụ ý phần còn lại không đúng.']
    ]
  },

  {
    slug: 'presupposition',
    en: 'Presupposition and loaded questions',
    vi: 'Tiền giả định — câu gài sẵn một khẳng định',
    level: 'C2',
    summary: 'Có những câu ngầm khẳng định một điều mà người nghe chưa hề đồng ý. Trả lời thẳng là vô tình nhận luôn điều đó.',
    formula: {
      rows: [
        ['stop, again, still', '"Have you STOPPED smoking?" → gài sẵn: bạn từng hút.'],
        ['Câu hỏi có từ để hỏi', '"WHEN did you realise your mistake?" → gài sẵn: có một lỗi.'],
        ['even', '"EVEN Nam passed." → gài sẵn: Nam khó mà đỗ.'],
        ['Phép thử phủ định', 'Phủ định câu đi mà điều đó vẫn còn thì đó là tiền giả định.']
      ],
      note: 'Phép thử phủ định là công cụ chính: "I have not stopped smoking" vẫn ngầm nói tôi từng hút — tiền giả định sống sót qua phủ định, còn hàm ý thì không. Với câu gài, cách gỡ là bác thẳng phần gài trước khi trả lời: "I never smoked, so the question does not apply."'
    },
    signals: ['stop', 'again', 'still', 'even', 'câu hỏi có từ để hỏi'],
    useWhen: [
      'Bài Đọc: nhận ra điều tác giả coi là đã đúng mà chưa hề chứng minh.',
      'Phỏng vấn và tranh luận: gỡ câu gài thay vì trả lời thẳng.',
      'Viết câu hỏi khảo sát: tránh gài, nếu không số liệu thu về bị lệch.'
    ],
    useNot: [
      { what: 'Không trả lời thẳng một câu gài.', why: '"Have you stopped cheating?" — trả lời "yes" hay "no" đều là nhận mình từng gian lận. Bác phần gài trước.' },
      { what: 'Không viết câu khảo sát mang tiền giả định.', why: '"How long have you been dissatisfied with the service?" đã gài sẵn là người trả lời không hài lòng, làm số liệu lệch hẳn.' }
    ],
    confuse: [
      {
        with: 'tiền giả định khác hàm ý',
        tell: 'Phủ định câu đi: điều đó còn nguyên thì là tiền giả định, mất đi thì là hàm ý.',
        pair: [
          { en: 'He has not stopped smoking.', vi: 'Anh ta chưa bỏ thuốc (vẫn ngầm nói anh ta từng hút — tiền giả định).' },
          { en: 'Not all of the students passed.', vi: 'Không phải tất cả sinh viên đều đỗ (hàm ý đã bị phủ định gỡ mất).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Have you stopped cheating in exams? — No, I have not.', right: 'Have you stopped cheating in exams? — I have never cheated, so the question does not apply.', why: 'Trả lời thẳng là nhận luôn phần gài.' },
      { wrong: 'Survey question: How long have you been dissatisfied with the service?', right: 'Survey question: How satisfied are you with the service?', why: 'Câu hỏi khảo sát mang tiền giả định làm lệch số liệu.' }
    ],
    examples: [
      ['Have you stopped smoking?', 'Bạn bỏ thuốc chưa?', 1, 'Gài sẵn rằng người nghe từng hút thuốc.'],
      ['He has not stopped smoking.', 'Anh ta chưa bỏ thuốc.', 1, 'Phép thử phủ định: điều gài vẫn còn nguyên.'],
      ['I have never cheated, so the question does not apply.', 'Tôi chưa từng gian lận, nên câu hỏi đó không áp dụng.', 1, 'Cách gỡ đúng: bác phần gài trước khi trả lời.'],
      ['How satisfied are you with the service?', 'Bạn hài lòng tới đâu với dịch vụ này?', 1, 'Câu khảo sát trung tính, không gài.'],
      ['Have you stopped cheating in exams? — No, I have not.', 'Bạn thôi gian lận thi cử chưa? — Chưa.', 0, 'Nhận luôn phần gài: sửa thành "I have never cheated, so the question does not apply."'],
      ['How long have you been dissatisfied with the service?', 'Bạn không hài lòng với dịch vụ này bao lâu rồi?', 0, 'Câu khảo sát gài: sửa thành "How satisfied are you with the service?"']
    ],
    practice: [
      ['"Have you stopped smoking?" presupposes that you ___ (smoked / never smoked).', 'smoked', 'Câu đó gài sẵn rằng bạn từng hút thuốc.'],
      ['A presupposition survives ___ (negation / translation).', 'negation', 'Tiền giả định sống sót qua phép phủ định.'],
      ['"When did you realise your mistake?" presupposes there was a ___ (mistake / question).', 'mistake', 'Câu đó gài sẵn rằng có một lỗi.'],
      ['To defuse a loaded question, ___ (challenge the presupposition / answer yes or no).', 'challenge the presupposition', 'Muốn gỡ câu gài thì bác phần gài trước.'],
      ['"Even Nam passed" suggests Nam was ___ (unlikely to pass / certain to pass).', 'unlikely to pass', 'Câu đó ngụ ý Nam khó mà đỗ.'],
      ['A neutral survey item is "How ___ (satisfied are you / long have you been dissatisfied)".', 'satisfied are you', 'Câu khảo sát trung tính là "How satisfied are you…".'],
      ['Implicature, unlike presupposition, ___ (disappears / survives) under negation.', 'disappears', 'Khác tiền giả định, hàm ý biến mất khi phủ định.'],
      ['The word ___ (again / often) presupposes a previous occurrence.', 'again', 'Từ "again" gài sẵn rằng chuyện đó từng xảy ra.'],
      ['Answering a loaded question directly ___ (accepts / rejects) its presupposition.', 'accepts', 'Trả lời thẳng câu gài là chấp nhận phần gài.'],
      ['Loaded survey questions ___ (bias / improve) the data.', 'bias', 'Câu khảo sát gài làm lệch số liệu.']
    ]
  },

  {
    slug: 'academic-critique',
    en: 'Critiquing sources in academic writing',
    vi: 'Phê bình nguồn trong bài học thuật cho chừng mực',
    level: 'C2',
    summary: 'Bác một công trình mà vẫn giữ giọng học thuật. Phê bình vào lập luận và dữ liệu, tuyệt đối không vào con người.',
    formula: {
      rows: [
        ['Nhượng bộ rồi bác', 'X\'s account, WHILE VALUABLE, OVERLOOKS the role of Y.'],
        ['Bác nhẹ', 'This interpretation is NOT ENTIRELY CONVINCING.'],
        ['Chỉ chỗ trống', 'LITTLE ATTENTION HAS BEEN PAID to the second variable.'],
        ['Nêu giới hạn', 'The study IS LIMITED BY its small sample.'],
        ['CẤM', 'Smith is wrong and careless. ✗']
      ],
      note: 'Hai quy ước bất di bất dịch. Một là phê bình CÔNG TRÌNH chứ không phê bình NGƯỜI: viết "Smith\'s model does not account for X", không viết "Smith failed to understand X". Hai là nhượng bộ trước khi bác: thừa nhận phần đúng rồi mới nêu chỗ hụt, người đọc mới thấy mình đã đọc kỹ chứ không phải bác cho có.'
    },
    signals: ['while valuable', 'not entirely convincing', 'little attention has been paid', 'is limited by'],
    useWhen: [
      'Phần tổng quan tài liệu của bài luận và luận văn.',
      'Bài Viết dạng bàn luận: nêu quan điểm đối lập rồi phản bác.',
      'Nhận xét phản biện cho bài của đồng nghiệp.'
    ],
    useNot: [
      { what: 'Không phê bình con người thay vì công trình.', why: '"Smith is careless" là công kích cá nhân. Viết "Smith\'s method does not control for age".' },
      { what: 'Không bác sạch trơn mà không nhượng bộ gì.', why: 'Bác toàn phần nghe như chưa đọc kỹ. Thừa nhận phần đúng trước rồi mới nêu chỗ hụt.' }
    ],
    confuse: [
      {
        with: 'phê bình công trình khác công kích cá nhân',
        tell: 'Chủ ngữ của lời chê là gì? Là công trình, mô hình, dữ liệu thì được. Là con người thì hỏng.',
        pair: [
          { en: "Smith's model does not account for regional variation.", vi: 'Mô hình của Smith không tính tới khác biệt vùng miền (phê bình công trình).' },
          { en: 'Smith failed to understand regional variation.', vi: 'Smith đã không hiểu được khác biệt vùng miền (công kích cá nhân).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Smith is wrong and careless about the data.', right: "Smith's analysis does not appear to control for age differences.", why: 'Phê bình phải nhắm vào công trình, không nhắm vào người.' },
      { wrong: 'This paper is completely useless.', right: 'While the paper offers a useful overview, its conclusions rest on a very small sample.', why: 'Bác sạch trơn không nhượng bộ thì nghe như chưa đọc kỹ.' }
    ],
    examples: [
      ["Tran's account, while valuable, overlooks the role of income.", 'Công trình của Trần tuy có giá trị nhưng bỏ qua vai trò của thu nhập.', 1, 'Nhượng bộ trước, bác sau — đúng quy ước học thuật.'],
      ['This interpretation is not entirely convincing.', 'Cách diễn giải này chưa thật sự thuyết phục.', 1, 'Bác nhẹ, chừa chỗ cho người đọc tự đánh giá.'],
      ['Little attention has been paid to the second variable.', 'Biến số thứ hai ít được chú ý tới.', 1, 'Chỉ ra chỗ trống mà không chê ai.'],
      ['The study is limited by its small sample.', 'Nghiên cứu bị hạn chế bởi mẫu khảo sát nhỏ.', 1, 'Nêu giới hạn một cách khách quan.'],
      ['Smith is wrong and careless about the data.', 'Smith sai và cẩu thả với dữ liệu.', 0, 'Công kích cá nhân: sửa thành "Smith\'s analysis does not appear to control for age differences."'],
      ['This paper is completely useless.', 'Bài này hoàn toàn vô dụng.', 0, 'Bác sạch trơn: sửa thành "While the paper offers a useful overview, its conclusions rest on a very small sample."']
    ],
    practice: [
      ["Tran's account, ___ (while valuable / although useless), overlooks the role of income.", 'while valuable', 'Công trình của Trần tuy có giá trị nhưng bỏ qua vai trò thu nhập.'],
      ['This interpretation is ___ (not entirely convincing / completely stupid).', 'not entirely convincing', 'Cách diễn giải này chưa thật sự thuyết phục.'],
      ['Critique the ___ (work / person).', 'work', 'Hãy phê bình công trình, không phê bình con người.'],
      ['___ (Little attention has been paid / Nobody bothered to look) to the second variable.', 'Little attention has been paid', 'Biến số thứ hai ít được chú ý tới.'],
      ['The study ___ (is limited by / is ruined by) its small sample.', 'is limited by', 'Nghiên cứu bị hạn chế bởi mẫu khảo sát nhỏ.'],
      ['Write "Smith\'s model ___ (does not account for / failed to understand)" regional variation.', 'does not account for', 'Viết "mô hình của Smith không tính tới" khác biệt vùng miền.'],
      ['Conceding a strength first makes the critique look ___ (well read / weak).', 'well read', 'Nhượng bộ trước cho thấy mình đã đọc kỹ.'],
      ['The findings ___ (should be treated with caution / are rubbish).', 'should be treated with caution', 'Nên xem xét các kết quả này một cách thận trọng.'],
      ['There is ___ (little evidence / no point) to support this claim.', 'little evidence', 'Có rất ít bằng chứng ủng hộ khẳng định này.'],
      ['Academic critique avoids ___ (personal attack / hedging).', 'personal attack', 'Phê bình học thuật tránh công kích cá nhân.']
    ]
  },

  {
    slug: 'institutional-formulae',
    en: 'Institutional and official formulae',
    vi: 'Công thức văn bản chính thức — We regret to inform you',
    level: 'C2',
    summary: 'Thư của cơ quan và doanh nghiệp có bộ khuôn đóng cứng. Học nguyên khối, và quan trọng hơn là biết chúng thật sự nói gì.',
    formula: {
      rows: [
        ['Báo tin xấu', 'WE REGRET TO INFORM YOU THAT your application has been unsuccessful.'],
        ['Thông báo', 'PLEASE BE ADVISED THAT the office will be closed on Monday.'],
        ['Nhắc nhở nhã', 'KINDLY NOTE THAT payment is due within 14 days.'],
        ['Mời liên hệ tiếp', 'SHOULD YOU REQUIRE further information, please do not hesitate to contact us.'],
        ['Kết thư', 'YOURS SINCERELY (biết tên) · YOURS FAITHFULLY (không biết tên)']
      ],
      note: 'Hai điều cần nhớ. Một là ghép đúng: "We regret to inform you" chỉ đi với tin xấu, ghép với tin vui thành ra buồn cười. Hai là dịch ngược khi đọc: "your application has been unsuccessful" nghĩa là trượt, "we are unable to proceed" nghĩa là từ chối — khuôn càng trang trọng thì càng dễ đọc lướt mà không thấy mình vừa bị từ chối.'
    },
    signals: ['We regret to inform you', 'Please be advised', 'Kindly note', 'Should you require', 'Yours faithfully'],
    useWhen: [
      'Thư từ chối, thư thông báo, thư nhắc nợ của cơ quan và doanh nghiệp.',
      'Bài Đọc: hiểu đúng thư chính thức, nhất là phần từ chối được gói kỹ.',
      'Viết thư trang trọng gửi cơ quan chưa quen.'
    ],
    useNot: [
      { what: 'Không ghép "We regret to inform you" với tin vui.', why: '"We regret to inform you that you have been accepted" là mâu thuẫn. Tin vui thì "We are pleased to inform you".' },
      { what: 'Không trộn từ đời thường vào các khuôn này.', why: '"Kindly note that the office will be shut" lệch giọng. Dùng "closed" cho khớp với "kindly note".' }
    ],
    confuse: [
      {
        with: '"Yours sincerely" khác "Yours faithfully"',
        tell: 'Có tên người nhận ở đầu thư thì "Yours sincerely". Chỉ có "Dear Sir or Madam" thì "Yours faithfully".',
        pair: [
          { en: 'Dear Mr Long, … Yours sincerely, Mai Anh', vi: 'Kính gửi ông Long, … Trân trọng (biết tên nên dùng "sincerely").' },
          { en: 'Dear Sir or Madam, … Yours faithfully, Mai Anh', vi: 'Kính gửi quý ông hoặc quý bà, … Trân trọng (không biết tên nên dùng "faithfully").' }
        ]
      }
    ],
    errors: [
      { wrong: 'We regret to inform you that you have been accepted onto the course.', right: 'We are pleased to inform you that you have been accepted onto the course.', why: '"regret to inform" chỉ dùng cho tin xấu.' },
      { wrong: 'Dear Sir or Madam, … Yours sincerely, Mai Anh', right: 'Dear Sir or Madam, … Yours faithfully, Mai Anh', why: 'Không biết tên người nhận thì kết thư bằng "Yours faithfully".' }
    ],
    examples: [
      ['We regret to inform you that your application has been unsuccessful.', 'Chúng tôi rất tiếc phải thông báo hồ sơ của bạn không được chấp thuận.', 1, 'Khuôn báo tin xấu chuẩn; đọc ra là bị từ chối.'],
      ['Please be advised that the office will be closed on Monday.', 'Xin lưu ý văn phòng sẽ đóng cửa vào thứ Hai.', 1, 'Khuôn thông báo của cơ quan.'],
      ['Should you require further information, please do not hesitate to contact us.', 'Nếu quý vị cần thêm thông tin, xin đừng ngần ngại liên hệ với chúng tôi.', 1, 'Khuôn mời liên hệ, dùng đảo ngữ điều kiện.'],
      ['We are pleased to inform you that you have been accepted.', 'Chúng tôi vui mừng thông báo bạn đã được nhận.', 1, 'Tin vui thì ghép với "pleased", không ghép với "regret".'],
      ['We regret to inform you that you have been accepted onto the course.', 'Chúng tôi rất tiếc phải thông báo bạn đã được nhận vào khoá học.', 0, 'Ghép sai: sửa thành "We are pleased to inform you that you have been accepted onto the course."'],
      ['Dear Sir or Madam, … Yours sincerely, Mai Anh', 'Kính gửi quý ông hoặc quý bà, … Trân trọng, Mai Anh', 0, 'Sai quy ước: sửa thành "Yours faithfully, Mai Anh".']
    ],
    practice: [
      ['We ___ (regret / are pleased) to inform you that your application has been unsuccessful.', 'regret', 'Chúng tôi rất tiếc phải báo hồ sơ của bạn không được chấp thuận.'],
      ['We ___ (are pleased / regret) to inform you that you have been accepted.', 'are pleased', 'Chúng tôi vui mừng thông báo bạn đã được nhận.'],
      ['___ (Please be advised / Please be advertised) that the office will be closed.', 'Please be advised', 'Xin lưu ý văn phòng sẽ đóng cửa.'],
      ['___ (Kindly note / Kind note) that payment is due within 14 days.', 'Kindly note', 'Xin lưu ý thanh toán trong vòng 14 ngày.'],
      ['After "Dear Sir or Madam" write ___ (Yours faithfully / Yours sincerely).', 'Yours faithfully', 'Sau "Dear Sir or Madam" thì kết bằng "Yours faithfully".'],
      ['After "Dear Mr Long" write ___ (Yours sincerely / Yours faithfully).', 'Yours sincerely', 'Sau "Dear Mr Long" thì kết bằng "Yours sincerely".'],
      ['"Your application has been unsuccessful" means you were ___ (rejected / accepted).', 'rejected', 'Câu đó nghĩa là bạn bị từ chối.'],
      ['___ (Should you require / Should you requiring) further information, contact us.', 'Should you require', 'Nếu quý vị cần thêm thông tin, xin liên hệ.'],
      ['Match "Kindly note" with ___ (closed / shut) for consistent register.', 'closed', 'Ghép "Kindly note" với "closed" cho khớp giọng.'],
      ['"We are unable to proceed" is a polite ___ (refusal / acceptance).', 'refusal', 'Câu đó là một lời từ chối lịch sự.']
    ]
  },

  {
    slug: 'evaluative-lexis',
    en: 'Words that carry a judgement',
    vi: 'Từ ngữ mang đánh giá ngầm — regime khác government',
    level: 'C2',
    summary: 'Hai từ cùng chỉ một thứ nhưng cài sẵn hai thái độ. Chọn từ là chọn lập trường, dù người viết có định thế hay không.',
    formula: {
      rows: [
        ['Chính trị', 'GOVERNMENT (trung tính) — REGIME (tiêu cực)'],
        ['Tính cách', 'DETERMINED (khen) — STUBBORN (chê)'],
        ['Giá cả', 'INEXPENSIVE (trung tính) — CHEAP (gợi ý kém chất lượng)'],
        ['Xung đột', 'FIGHTER — TERRORIST — hai bên gọi cùng một người bằng hai từ.'],
        ['Kích thước', 'SLIM (khen) — SKINNY (chê) — THIN (trung tính)']
      ],
      note: 'Trong bài Đọc, đây là chỗ lộ thái độ tác giả rõ nhất — rõ hơn cả câu kết luận. Ở chiều ngược lại, viết báo cáo mà chọn nhầm từ đánh giá thì bản báo cáo mất tính trung lập dù nội dung vẫn đúng. Cách kiểm: thử thay bằng từ trung tính, nếu câu đổi giọng hẳn thì từ vừa rồi có mang đánh giá.'
    },
    signals: ['regime', 'stubborn', 'cheap', 'so-called', 'cặp từ cùng nghĩa khác thái độ'],
    useWhen: [
      'Bài Đọc: xác định thái độ tác giả qua lựa chọn từ.',
      'Viết bài nghị luận: chọn từ có đánh giá để củng cố lập trường của mình.',
      'Rà soát báo cáo cần trung lập: thay từ mang đánh giá bằng từ trung tính.'
    ],
    useNot: [
      { what: 'Không dùng từ mang đánh giá trong văn bản cần trung lập.', why: 'Báo cáo khoa học viết "the regime" thay vì "the government" là đã cài thái độ, người đọc sẽ nghi ngờ cả phần số liệu.' },
      { what: 'Không coi cặp từ cùng nghĩa là thay được cho nhau.', why: '"She is determined" là khen, "She is stubborn" là chê, dù cùng mô tả một tính cách.' }
    ],
    confuse: [
      {
        with: 'từ trung tính khác từ mang đánh giá',
        tell: 'Thay bằng từ trung tính rồi đọc lại. Câu đổi giọng hẳn thì từ vừa rồi có cài thái độ.',
        pair: [
          { en: 'The government introduced the policy in 2019.', vi: 'Chính phủ ban hành chính sách này năm 2019 (trung tính).' },
          { en: 'The regime introduced the policy in 2019.', vi: 'Chế độ đó ban hành chính sách này năm 2019 (đã cài thái độ tiêu cực).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The research report describes the regime as spending 8% of GDP on health.', right: 'The research report describes the government as spending 8% of GDP on health.', why: 'Báo cáo cần trung lập thì không dùng từ mang đánh giá.' },
      { wrong: 'Her stubborn pursuit of the goal won her the prize and everyone admired it.', right: 'Her determined pursuit of the goal won her the prize and everyone admired it.', why: '"stubborn" là chê, không khớp với vế được mọi người khâm phục.' }
    ],
    examples: [
      ['The government introduced the policy in 2019.', 'Chính phủ ban hành chính sách này năm 2019.', 1, 'Từ trung tính, hợp báo cáo.'],
      ['The regime tightened control over the press.', 'Chế độ đó siết chặt kiểm soát báo chí.', 1, '"regime" cài sẵn thái độ tiêu cực — dùng có chủ ý trong bài nghị luận.'],
      ['Her determined pursuit of the goal won her the prize.', 'Sự kiên định theo đuổi mục tiêu đã mang lại giải thưởng cho cô.', 1, '"determined" là khen.'],
      ['The rooms are inexpensive but clean and well kept.', 'Phòng giá rẻ nhưng sạch sẽ và được chăm chút.', 1, '"inexpensive" trung tính, khác "cheap" vốn gợi ý kém chất lượng.'],
      ['The research report describes the regime as spending 8% of GDP on health.', 'Báo cáo nghiên cứu cho biết chế độ đó chi 8% GDP cho y tế.', 0, 'Mất trung lập: sửa thành "…describes the government as spending 8% of GDP on health."'],
      ['Her stubborn pursuit of the goal won her the prize and everyone admired it.', 'Sự cố chấp theo đuổi mục tiêu mang lại giải thưởng và ai cũng khâm phục.', 0, 'Lệch sắc thái: sửa thành "Her determined pursuit of the goal…"']
    ],
    practice: [
      ['For a neutral report, write ___ (the government / the regime).', 'the government', 'Trong báo cáo trung lập thì viết "the government".'],
      ['___ (Determined / Stubborn) is the positive word for the same trait.', 'Determined', 'Từ mang nghĩa khen cho tính cách đó là "determined".'],
      ['___ (Inexpensive / Cheap) avoids suggesting poor quality.', 'Inexpensive', 'Từ "inexpensive" tránh gợi ý chất lượng kém.'],
      ['The word ___ (regime / government) carries a negative judgement.', 'regime', 'Từ "regime" mang đánh giá tiêu cực.'],
      ['To test a word, replace it with a ___ (neutral / longer) one.', 'neutral', 'Muốn kiểm thì thay bằng một từ trung tính.'],
      ['Her ___ (determined / stubborn) pursuit won everyone\'s admiration.', 'determined', 'Sự kiên định của cô khiến ai cũng khâm phục.'],
      ['___ (Slim / Skinny) is the complimentary term.', 'Slim', 'Từ mang nghĩa khen là "slim".'],
      ['Word choice reveals the writer\'s ___ (stance / vocabulary size).', 'stance', 'Lựa chọn từ để lộ lập trường của người viết.'],
      ['In reading tests, evaluative words signal ___ (attitude / topic).', 'attitude', 'Trong bài Đọc, từ mang đánh giá để lộ thái độ.'],
      ['A scientific report should sound ___ (neutral / persuasive).', 'neutral', 'Báo cáo khoa học nên giữ giọng trung lập.']
    ]
  },

  {
    slug: 'scare-quotes-distancing',
    en: 'Scare quotes and so-called',
    vi: 'Ngoặc kép giữ khoảng cách — so-called, "chuyên gia"',
    level: 'C2',
    summary: 'Đặt một từ vào ngoặc kép để nói rằng mình không nhận cái tên đó. Hai dấu nháy làm được việc của cả một câu phản bác.',
    formula: {
      rows: [
        ['Ngoặc kép hoài nghi', 'his "expertise" in the field → người viết không tin đó là chuyên môn thật.'],
        ['so-called', 'the SO-CALLED reform → không coi đó là cải cách thật.'],
        ['Dẫn lại cách gọi của người khác', 'WHAT THE COMPANY CALLS a "temporary" measure'],
        ['Khác hẳn ngoặc kép trích dẫn', 'She said, "I will not resign." → đây là trích lời, không hoài nghi.']
      ],
      note: 'Đừng dùng ngoặc kép để nhấn mạnh — đó là lỗi rất hay gặp và cho ra nghĩa ngược. Biển hàng ghi cá "tươi" khiến người đọc hiểu là cá không tươi, vì ngoặc kép ở đó bị đọc thành hoài nghi. Muốn nhấn thì in đậm hoặc in nghiêng.'
    },
    signals: ['ngoặc kép quanh một từ', 'so-called', 'what he calls', 'supposed'],
    useWhen: [
      'Bài nghị luận: bác một cách gọi mà không phải dừng lại giải thích dài dòng.',
      'Bài Đọc: nhận ra tác giả đang không nhận một thuật ngữ.',
      'Dẫn lại cách gọi của bên khác mà vẫn giữ khoảng cách với nó.'
    ],
    useNot: [
      { what: 'Không dùng ngoặc kép để nhấn mạnh.', why: 'Biển ghi cá "tươi" bị đọc thành cá không tươi. Muốn nhấn thì in đậm hoặc in nghiêng.' },
      { what: 'Không rắc ngoặc kép hoài nghi khắp bài.', why: 'Dùng nhiều thì giọng văn thành cay cú. Một hai chỗ đắt là đủ.' }
    ],
    confuse: [
      {
        with: 'ngoặc kép hoài nghi khác ngoặc kép trích dẫn',
        tell: 'Trong ngoặc là lời ai đó nói thật thì là trích dẫn. Chỉ một từ lẻ mà người viết không nhận thì là hoài nghi.',
        pair: [
          { en: 'She said, "I will not resign."', vi: 'Cô ấy nói: "Tôi sẽ không từ chức." (trích dẫn).' },
          { en: 'His "expertise" turned out to be a weekend course.', vi: 'Cái "chuyên môn" của ông ta hoá ra là một khoá học cuối tuần (hoài nghi).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Sign in a shop: We sell only "fresh" fish.', right: 'Sign in a shop: We sell only fresh fish.', why: 'Ngoặc kép ở đây bị đọc thành hoài nghi, tức cá không tươi.' },
      { wrong: 'The so-called reform, which everyone agrees was a genuine improvement.', right: 'The reform, which everyone agrees was a genuine improvement.', why: '"so-called" hàm ý không nhận, mâu thuẫn với vế khen sau đó.' }
    ],
    examples: [
      ['His "expertise" turned out to be a weekend course.', 'Cái "chuyên môn" của ông ta hoá ra là một khoá học cuối tuần.', 1, 'Hai dấu nháy làm xong việc phản bác.'],
      ['The so-called reform left the worst problems untouched.', 'Cái gọi là cải cách ấy không đụng tới những vấn đề tệ nhất.', 1, '"so-called" báo trước rằng người viết không nhận cách gọi đó.'],
      ['She said, "I will not resign."', 'Cô ấy nói: "Tôi sẽ không từ chức."', 1, 'Đối chiếu: đây là ngoặc kép trích dẫn, không hoài nghi.'],
      ['What the company calls a "temporary" measure is now in its fifth year.', 'Cái mà công ty gọi là biện pháp "tạm thời" nay đã sang năm thứ năm.', 1, 'Dẫn lại cách gọi của bên khác mà vẫn giữ khoảng cách.'],
      ['Sign in a shop: We sell only "fresh" fish.', 'Biển hiệu: Chúng tôi chỉ bán cá "tươi".', 0, 'Nghĩa ngược: sửa thành "We sell only fresh fish."'],
      ['The so-called reform, which everyone agrees was a genuine improvement.', 'Cái gọi là cải cách ấy, thứ mà ai cũng công nhận là tiến bộ thật sự.', 0, 'Mâu thuẫn: sửa thành "The reform, which everyone agrees was a genuine improvement."']
    ],
    practice: [
      ['His ___ ("expertise" / expertise) turned out to be a weekend course.', '"expertise"', 'Cái "chuyên môn" của ông ta hoá ra là khoá học cuối tuần.'],
      ['The ___ (so-called / genuine) reform left the worst problems untouched.', 'so-called', 'Cái gọi là cải cách ấy không đụng tới vấn đề tệ nhất.'],
      ['On a shop sign, write ___ (fresh fish / "fresh" fish).', 'fresh fish', 'Trên biển hiệu thì viết "fresh fish" không có ngoặc kép.'],
      ['Scare quotes signal ___ (doubt / emphasis).', 'doubt', 'Ngoặc kép hoài nghi báo hiệu sự nghi ngờ.'],
      ['For emphasis use ___ (italics / quotation marks).', 'italics', 'Muốn nhấn mạnh thì dùng chữ nghiêng.'],
      ['She said, ___ ("I will not resign." / "I will not resign" with doubt).', '"I will not resign."', 'Cô ấy nói: "Tôi sẽ không từ chức."'],
      ['"So-called" means the writer ___ (rejects / accepts) the label.', 'rejects', 'Cụm "so-called" nghĩa là người viết không nhận cách gọi đó.'],
      ['Using scare quotes too often sounds ___ (bitter / precise).', 'bitter', 'Dùng ngoặc kép hoài nghi quá nhiều nghe cay cú.'],
      ['What the company ___ (calls / says) a "temporary" measure is in its fifth year.', 'calls', 'Cái mà công ty gọi là biện pháp "tạm thời" đã sang năm thứ năm.'],
      ['Quotation marks around a full sentence usually mark a ___ (quotation / doubt).', 'quotation', 'Ngoặc kép quanh cả một câu thường là trích dẫn.']
    ]
  },

  {
    slug: 'discourse-softeners',
    en: 'Softening what comes next',
    vi: 'Câu rào đón trước khi nói điều khó nghe',
    level: 'C2',
    summary: 'Một câu ngắn báo trước rằng sắp có điều khó nghe. Người nghe kịp chuẩn bị nên tiếp nhận dễ hơn hẳn.',
    formula: {
      rows: [
        ['Xin phép nói', 'IF I MAY, I would like to raise one point.'],
        ['Báo trước sẽ ngắt lời', 'I DO NOT MEAN TO INTERRUPT, BUT we are running short of time.'],
        ['Chừa đường mình sai', 'CORRECT ME IF I AM WRONG, BUT the figures were revised.'],
        ['Báo trước sẽ làm phiền', 'SORRY TO BE A PAIN, BUT could we move the meeting?'],
        ['Nhượng bộ trước khi bác', 'I SEE YOUR POINT, BUT there is another side to this.']
      ],
      note: 'Đây là những câu gần như không mang thông tin gì — chức năng của chúng là dọn đường. Bỏ hẳn đi thì câu vẫn đủ nghĩa nhưng nghe đường đột. Trong họp hành bằng tiếng Anh, người không dùng lớp rào đón này thường bị đánh giá là cộc, dù nội dung góp ý hoàn toàn hợp lý.'
    },
    signals: ['If I may', 'I do not mean to interrupt, but', 'Correct me if I am wrong, but', 'I see your point, but'],
    useWhen: [
      'Họp hành: xin lời, ngắt lời, hoặc phản bác một ý.',
      'Góp ý cho người trên hoặc người mình chưa thân.',
      'Phần Nói của kỳ thi: cho thấy mình điều khiển được nhịp hội thoại.'
    ],
    useNot: [
      { what: 'Không lao thẳng vào phản bác trong cuộc họp trang trọng.', why: '"You are wrong about the figures" không có lớp dọn đường nghe rất cộc. Thêm "Correct me if I am wrong, but…" là đủ.' },
      { what: 'Không chồng quá nhiều lớp rào đón.', why: '"Sorry, if I may, I do not mean to interrupt, but…" thì tới lúc vào việc người nghe đã hết kiên nhẫn. Một lớp là đủ.' }
    ],
    confuse: [
      {
        with: 'rào đón dọn đường khác vòng vo',
        tell: 'Rào đón là một câu ngắn rồi vào việc ngay. Vòng vo là nói mãi không tới ý chính.',
        pair: [
          { en: 'Correct me if I am wrong, but the figures were revised in May.', vi: 'Có gì anh sửa giúp, nhưng tôi nhớ số liệu đã được chỉnh lại hồi tháng Năm (rào một câu rồi vào việc).' },
          { en: 'You are wrong about the figures.', vi: 'Anh nhầm về số liệu rồi (không rào, nghe cộc).' }
        ]
      }
    ],
    errors: [
      { wrong: 'You are wrong about the figures.', right: 'Correct me if I am wrong, but I think the figures were revised in May.', why: 'Phản bác thẳng trong họp trang trọng nghe cộc.' },
      { wrong: 'Sorry, if I may, I do not mean to interrupt, but could I possibly say something?', right: 'If I may, could I add one point?', why: 'Chồng bốn lớp rào đón; một lớp là đủ.' }
    ],
    examples: [
      ['If I may, I would like to raise one point.', 'Nếu được phép, tôi xin nêu một ý.', 1, 'Xin lời một cách nhã nhặn.'],
      ['Correct me if I am wrong, but the figures were revised in May.', 'Có gì anh sửa giúp, nhưng tôi nhớ số liệu đã chỉnh lại hồi tháng Năm.', 1, 'Chừa đường cho mình sai, người nghe đỡ thấy bị bác.'],
      ['I see your point, but there is another side to this.', 'Tôi hiểu ý anh, nhưng chuyện này còn một mặt khác.', 1, 'Nhượng bộ trước rồi mới bác.'],
      ['I do not mean to interrupt, but we are running short of time.', 'Tôi không định ngắt lời, nhưng chúng ta sắp hết giờ.', 1, 'Báo trước rồi mới ngắt.'],
      ['You are wrong about the figures.', 'Anh nhầm về số liệu rồi.', 0, 'Cộc: sửa thành "Correct me if I am wrong, but I think the figures were revised in May."'],
      ['Sorry, if I may, I do not mean to interrupt, but could I possibly say something?', 'Xin lỗi, nếu được phép, tôi không định ngắt lời, nhưng liệu tôi có thể nói một câu không ạ?', 0, 'Chồng quá nhiều lớp: sửa thành "If I may, could I add one point?"']
    ],
    practice: [
      ['___ (If I may / If I can may), I would like to raise one point.', 'If I may', 'Nếu được phép, tôi xin nêu một ý.'],
      ['___ (Correct me if I am wrong / You are wrong), but the figures were revised.', 'Correct me if I am wrong', 'Có gì anh sửa giúp, nhưng số liệu đã được chỉnh lại.'],
      ['I ___ (see your point / reject your point), but there is another side.', 'see your point', 'Tôi hiểu ý anh, nhưng còn một mặt khác.'],
      ['I do not mean to ___ (interrupt / interrupting), but we are short of time.', 'interrupt', 'Tôi không định ngắt lời, nhưng chúng ta sắp hết giờ.'],
      ['These phrases carry little ___ (information / risk) but prepare the listener.', 'information', 'Các câu này gần như không mang thông tin, chỉ để dọn đường.'],
      ['Use ___ (one / four) softener before making your point.', 'one', 'Chỉ cần một lớp rào đón trước khi vào ý chính.'],
      ['___ (Sorry to be a pain / Sorry for being pain), but could we move the meeting?', 'Sorry to be a pain', 'Ngại quá, nhưng ta dời cuộc họp được không?'],
      ['Without softeners, a valid point can sound ___ (blunt / clever).', 'blunt', 'Không có lớp rào đón, một góp ý hợp lý vẫn nghe cộc.'],
      ['___ (With respect / With respectful), I think the data say otherwise.', 'With respect', 'Xin phép nói, tôi cho rằng số liệu nói khác.'],
      ['A softener should be followed quickly by the ___ (point / apology).', 'point', 'Sau lớp rào đón thì vào ý chính ngay.']
    ]
  },

  {
    slug: 'apology-scale',
    en: 'Matching the apology to the offence',
    vi: 'Thang xin lỗi — cân mức lời xin lỗi với mức lỗi',
    level: 'C2',
    summary: 'Xin lỗi cũng có thang bậc. Lỗi nhỏ mà xin lỗi long trọng thì kỳ, lỗi lớn mà chỉ "sorry" thì bị coi là vô tâm.',
    formula: {
      rows: [
        ['Va nhẹ, chuyện vặt', 'SORRY. / SORRY ABOUT THAT.'],
        ['Có gây phiền', 'I AM SO SORRY. / I DO APOLOGISE.'],
        ['Công việc, có thiệt hại', 'I SINCERELY APOLOGISE FOR THE INCONVENIENCE CAUSED.'],
        ['Cơ quan, chính thức', 'PLEASE ACCEPT OUR SINCERE APOLOGIES FOR the delay.'],
        ['Độ trang trọng', 'I apologise (trang trọng) > I am sorry (thường)']
      ],
      note: 'Người học hay mắc ở hai đầu thang. Một là dùng khuôn long trọng cho chuyện vặt — giẫm phải chân ai mà nói "I sincerely apologise for the inconvenience caused" nghe như đang đọc thông cáo. Hai là dùng mỗi "sorry" cho lỗi nghiêm trọng trong công việc, người nhận sẽ thấy mình không được coi trọng.'
    },
    signals: ['Sorry', 'I do apologise', 'I sincerely apologise', 'Please accept our apologies'],
    useWhen: [
      'Thư xin lỗi khách hàng: dùng khuôn trang trọng nhất.',
      'Va chạm nhỏ hằng ngày: một chữ "Sorry" là đủ và đúng.',
      'Bài Viết dạng thư: chọn đúng nấc thang là một tiêu chí chấm điểm.'
    ],
    useNot: [
      { what: 'Không dùng khuôn long trọng cho chuyện vặt.', why: 'Giẫm phải chân ai mà nói "I sincerely apologise for the inconvenience caused" nghe như đọc thông cáo báo chí.' },
      { what: 'Không dùng mỗi "sorry" cho lỗi nghiêm trọng trong công việc.', why: 'Giao hàng hỏng cả lô mà chỉ "Sorry about that" thì khách thấy mình không được coi trọng.' }
    ],
    confuse: [
      {
        with: '"I am sorry" khác "I apologise"',
        tell: '"I am sorry" dùng được cả cảm thông lẫn nhận lỗi. "I apologise" chỉ dùng khi nhận lỗi, và trang trọng hơn.',
        pair: [
          { en: 'I am sorry to hear about your father.', vi: 'Tôi rất tiếc khi nghe chuyện của bố bạn (cảm thông, không phải nhận lỗi).' },
          { en: 'I apologise for missing the deadline.', vi: 'Tôi xin lỗi vì đã trễ hạn (nhận lỗi).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I stepped on your foot. I sincerely apologise for the inconvenience caused.', right: 'I stepped on your foot. Sorry about that.', why: 'Khuôn long trọng dùng cho chuyện vặt nghe kỳ.' },
      { wrong: 'We delivered the entire order damaged. Sorry about that.', right: 'We delivered the entire order damaged. Please accept our sincere apologies.', why: 'Lỗi nghiêm trọng mà xin lỗi quá nhẹ.' }
    ],
    examples: [
      ['I stepped on your foot. Sorry about that.', 'Tôi giẫm phải chân bạn. Xin lỗi nhé.', 1, 'Chuyện vặt thì một câu ngắn là đúng mực.'],
      ['I do apologise for keeping you waiting.', 'Tôi thành thật xin lỗi vì đã để anh phải chờ.', 1, 'Nấc giữa: có gây phiền thật nhưng chưa nghiêm trọng.'],
      ['Please accept our sincere apologies for the delay.', 'Kính mong quý khách nhận lời xin lỗi chân thành của chúng tôi vì sự chậm trễ.', 1, 'Nấc cao nhất, dùng trong thư của cơ quan.'],
      ['I am sorry to hear about your father.', 'Tôi rất tiếc khi nghe chuyện của bố bạn.', 1, '"I am sorry" ở đây là cảm thông, không phải nhận lỗi.'],
      ['I stepped on your foot. I sincerely apologise for the inconvenience caused.', 'Tôi giẫm phải chân bạn. Tôi thành thật xin lỗi vì sự bất tiện đã gây ra.', 0, 'Quá tay: sửa thành "I stepped on your foot. Sorry about that."'],
      ['We delivered the entire order damaged. Sorry about that.', 'Chúng tôi giao hỏng cả lô hàng. Xin lỗi nhé.', 0, 'Quá nhẹ: sửa thành "We delivered the entire order damaged. Please accept our sincere apologies."']
    ],
    practice: [
      ['You step on someone\'s foot: ___ (Sorry about that / I sincerely apologise for the inconvenience caused).', 'Sorry about that', 'Giẫm phải chân ai thì nói "Sorry about that".'],
      ['A whole order arrived damaged: ___ (Please accept our sincere apologies / Sorry about that).', 'Please accept our sincere apologies', 'Cả lô hàng hỏng thì phải xin lỗi trang trọng.'],
      ['___ (I apologise / I am sorry) is the more formal of the two.', 'I apologise', 'Cụm "I apologise" trang trọng hơn.'],
      ['For sympathy, not fault, use ___ (I am sorry / I apologise).', 'I am sorry', 'Khi chia buồn chứ không nhận lỗi thì dùng "I am sorry".'],
      ['I ___ (do apologise / very apologise) for keeping you waiting.', 'do apologise', 'Tôi thành thật xin lỗi vì đã để anh phải chờ.'],
      ['Over-apologising for a small thing sounds ___ (odd / kind).', 'odd', 'Xin lỗi quá long trọng cho chuyện vặt nghe kỳ.'],
      ['Under-apologising for real harm sounds ___ (callous / efficient).', 'callous', 'Xin lỗi quá nhẹ cho thiệt hại thật nghe vô tâm.'],
      ['Please accept our ___ (sincere apologies / sincerely apology) for the delay.', 'sincere apologies', 'Kính mong nhận lời xin lỗi chân thành vì sự chậm trễ.'],
      ['I am sorry ___ (to hear / for hearing) about your father.', 'to hear', 'Tôi rất tiếc khi nghe chuyện của bố bạn.'],
      ['Choosing the right level is judged in ___ (letter writing tasks / listening tasks).', 'letter writing tasks', 'Chọn đúng nấc thang là tiêu chí chấm của bài viết thư.']
    ]
  },

  {
    slug: 'register-shift-for-effect',
    en: 'Deliberate register shift',
    vi: 'Cố ý đổi giọng giữa chừng để tạo hiệu ứng',
    level: 'C2',
    summary: 'Thả một từ trang trọng vào câu chuyện phiếm, hoặc một từ suồng sã vào đoạn nghiêm túc. Làm chủ được thì đó là phong cách; không chủ ý thì là lỗi.',
    formula: {
      rows: [
        ['Trang trọng chen vào đời thường', 'I was, SHALL WE SAY, less than impressed.'],
        ['Đời thường chen vào trang trọng', 'The committee deliberated for months and then, frankly, BOTTLED IT.'],
        ['Báo hiệu là cố ý', 'shall we say · to put it mildly · in the technical sense'],
        ['Điều kiện', 'Phải nắm chắc cả hai giọng thì mới đổi có hiệu quả.']
      ],
      note: 'Ranh giới với lỗi trộn giọng ở bậc B2 là CHỦ Ý và DẤU HIỆU. Người viết có nghề thường cắm một cụm báo hiệu ("shall we say", "to put it mildly") để người đọc biết chỗ chệch là cố tình. Không có dấu hiệu và không có lý do thì người chấm chỉ thấy một bài viết lệch giọng, và họ trừ điểm — họ không đọc được ý định trong đầu người viết.'
    },
    signals: ['shall we say', 'to put it mildly', 'từ trang trọng lạc giữa câu đời thường'],
    useWhen: [
      'Văn châm biếm và bình luận: đổi giọng để tạo tiếng cười hoặc vị chua.',
      'Bài nói trước đám đông: một câu suồng sã giữa bài trang trọng kéo người nghe lại.',
      'Viết truyện: giọng nhân vật lệch khỏi giọng người kể.'
    ],
    useNot: [
      { what: 'Không đổi giọng trong bài luận thi.', why: 'Người chấm không đọc được ý định của mình; họ chỉ thấy một bài viết lệch giọng và trừ điểm. Bài thi thì giữ giọng đều.' },
      { what: 'Không gọi việc trộn giọng vô ý là phong cách.', why: 'Chủ ý phải có dấu hiệu. Không có cụm báo hiệu và không có lý do thì đó là lỗi, không phải phong cách.' }
    ],
    confuse: [
      {
        with: 'đổi giọng có chủ ý khác trộn giọng vô ý',
        tell: 'Tìm cụm báo hiệu và tìm lý do. Có cả hai thì là chủ ý; không có gì thì là lỗi.',
        pair: [
          { en: 'I was, shall we say, less than impressed.', vi: 'Tôi thì, nói giảm đi nhé, không lấy gì làm ấn tượng (có cụm báo hiệu, chủ ý rõ).' },
          { en: 'The data do not support this. It is kind of a big deal.', vi: 'Dữ liệu không ủng hộ điều này. Cũng khá là chuyện lớn đấy (trộn giọng vô ý, không dấu hiệu).' }
        ]
      }
    ],
    errors: [
      { wrong: 'In this essay I will examine the causes of inflation and see what is up with prices.', right: 'In this essay I will examine the causes of inflation and the resulting price movements.', why: 'Bài luận thi thì giữ giọng đều, không chen cụm suồng sã.' },
      { wrong: 'The data do not support this. It is kind of a big deal.', right: 'The data do not support this. The implications are considerable.', why: 'Trộn giọng vô ý, không có dấu hiệu nào cho thấy là cố tình.' }
    ],
    examples: [
      ['I was, shall we say, less than impressed.', 'Tôi thì, nói giảm đi nhé, không lấy gì làm ấn tượng.', 1, 'Cụm "shall we say" báo hiệu chỗ chệch là cố ý.'],
      ['The committee deliberated for months and then, frankly, gave up.', 'Hội đồng cân nhắc suốt mấy tháng rồi, nói thẳng ra, bỏ cuộc.', 1, 'Chen một câu thẳng thừng vào đoạn trang trọng để nhấn.'],
      ['In this essay I will examine the causes of inflation.', 'Trong bài luận này tôi sẽ xem xét các nguyên nhân của lạm phát.', 1, 'Bài thi thì giữ giọng đều từ đầu tới cuối.'],
      ['The data do not support this. The implications are considerable.', 'Dữ liệu không ủng hộ điều này. Hệ quả là đáng kể.', 1, 'Giọng nhất quán, không chỗ nào chệch.'],
      ['In this essay I will examine inflation and see what is up with prices.', 'Trong bài luận này tôi sẽ xem xét lạm phát và xem giá cả có gì hot.', 0, 'Lệch giọng: sửa thành "…and the resulting price movements."'],
      ['The data do not support this. It is kind of a big deal.', 'Dữ liệu không ủng hộ điều này. Cũng khá là chuyện lớn đấy.', 0, 'Trộn giọng vô ý: sửa thành "The implications are considerable."']
    ],
    practice: [
      ['I was, ___ (shall we say / shall we said), less than impressed.', 'shall we say', 'Tôi thì, nói giảm đi nhé, không lấy gì làm ấn tượng.'],
      ['In an exam essay, keep the register ___ (consistent / mixed).', 'consistent', 'Trong bài luận thi thì giữ giọng đều.'],
      ['A deliberate shift usually carries a ___ (signal phrase / spelling error).', 'signal phrase', 'Đổi giọng có chủ ý thường kèm một cụm báo hiệu.'],
      ['The data do not support this. The implications are ___ (considerable / kind of a big deal).', 'considerable', 'Dữ liệu không ủng hộ điều này. Hệ quả là đáng kể.'],
      ['Unsignalled mixing reads as an ___ (error / effect).', 'error', 'Trộn giọng không có dấu hiệu bị đọc thành lỗi.'],
      ['___ (To put it mildly / To put it mild), the results were disappointing.', 'To put it mildly', 'Nói giảm đi thì kết quả khá đáng thất vọng.'],
      ['This device suits ___ (satire / exam essays).', 'satire', 'Thủ pháp này hợp với văn châm biếm.'],
      ['To shift register well you must command ___ (both registers / one register).', 'both registers', 'Muốn đổi giọng khéo thì phải nắm chắc cả hai giọng.'],
      ['In this essay I will examine the causes of inflation and the resulting ___ (price movements / price drama).', 'price movements', 'Trong bài luận này tôi sẽ xem xét nguyên nhân lạm phát và biến động giá kèm theo.'],
      ['Examiners cannot read your ___ (intention / handwriting), only the page.', 'intention', 'Người chấm không đọc được ý định của bạn, chỉ đọc được trang giấy.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'register',
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
