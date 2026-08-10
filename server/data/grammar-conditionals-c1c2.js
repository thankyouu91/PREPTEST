/**
 * Ngữ pháp — nhóm CÂU ĐIỀU KIỆN VÀ GIẢ ĐỊNH, phần bậc C1 và C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-conditionals.js (bậc A2–B2). Hạn mức của nhóm là
 * 20 điểm; tệp kia đã dùng 11 điểm, tệp này dùng nốt 9 điểm: C1 ×5, C2 ×4.
 *
 * Bậc A2–B2 lo bốn loại điều kiện cơ bản. Bậc này chuyển sang chỗ khác hẳn:
 * điều kiện KHÔNG CÒN CẦN CHỮ "IF". Đảo ngữ, "but for", thức giả định trong
 * mệnh đề that, điều kiện ngầm, hay chỉ một chữ "otherwise" — tất cả đều diễn
 * đạt điều kiện mà không có mệnh đề if nào. Người học quen nhận diện bằng chữ
 * "if" nên đọc lướt qua mà không thấy, còn khi viết thì không dùng tới, khiến
 * bài Viết bị đánh giá là đơn điệu về cấu trúc.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== C1 ==================== */

  {
    slug: 'conditional-inversion',
    en: 'Inverted conditionals',
    vi: 'Đảo ngữ điều kiện — bỏ "if", đảo trợ động từ lên trước',
    level: 'C1',
    summary: 'Bỏ "if" rồi đưa trợ động từ lên trước chủ ngữ. Chỉ ba trợ động từ làm được: had, were, should.',
    formula: {
      rows: [
        ['Loại 3', 'If I had known → Had I known'],
        ['Loại 2 với be', 'If it were not for → Were it not for'],
        ['Loại 1 dè dặt', 'If you should need → Should you need'],
        ['Phủ định', 'KHÔNG rút gọn: "Had he not left", không viết "Hadn\'t he left"']
      ],
      note: 'Bỏ "if" là bắt buộc — viết "Had I known if…" là thừa. Dạng đảo trang trọng hơn hẳn, hay gặp trong văn viết, thư từ công việc và bài Viết học thuật.'
    },
    signals: ['Had I', 'Were I', 'Were it not for', 'Should you', 'Had it not been for'],
    useWhen: [
      'Văn viết trang trọng, thư từ công việc, bài luận học thuật.',
      'Muốn tránh lặp lại chữ "if" quá nhiều lần trong một đoạn.',
      '"Should you…" khi mời chào hoặc dặn dò lịch sự trong thư.',
      'Nhấn mạnh giả thiết bằng cách đặt nó lên đầu câu.'
    ],
    useNot: [
      { what: 'Không giữ lại "if" khi đã đảo.', why: '"If had I known" và "Had I known if…" đều sai. Đảo ngữ THAY THẾ chữ if.' },
      { what: 'Không rút gọn phủ định trong dạng đảo.', why: '"Hadn\'t I known" không dùng ở đây; viết đủ "Had I not known".' },
      { what: 'Không đảo với trợ động từ khác.', why: 'Chỉ had, were, should đảo được. "Did I know" không phải đảo ngữ điều kiện.' }
    ],
    confuse: [
      {
        with: 'câu điều kiện thường',
        tell: 'Cùng nghĩa, chỉ khác độ trang trọng. Dạng đảo nghe trang trọng hơn và không dùng trong hội thoại thân mật.',
        pair: [
          { en: 'If I had known, I would have called.', vi: 'Giá mà tôi biết thì đã gọi. (trung tính)' },
          { en: 'Had I known, I would have called.', vi: 'Giá mà tôi biết thì đã gọi. (trang trọng, văn viết)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If had I known, I would have told you.', right: 'Had I known, I would have told you.', why: 'Đã đảo thì bỏ hẳn chữ "if".' },
      { wrong: "Hadn't he warned us, we would have been in danger.", right: 'Had he not warned us, we would have been in danger.', why: 'Dạng đảo không rút gọn phủ định.' }
    ],
    examples: [
      ['Had I known about the delay, I would have left earlier.', 'Giá mà tôi biết vụ chậm trễ thì đã đi sớm hơn.', 1, 'Đảo ngữ của loại 3.'],
      ['Were it not for your help, we would still be stuck.', 'Không có bạn giúp thì giờ chúng tôi vẫn còn kẹt.', 1, 'Đảo ngữ với "were".'],
      ['Should you need any assistance, please contact reception.', 'Nếu quý khách cần hỗ trợ, xin liên hệ lễ tân.', 1, 'Đảo ngữ lịch sự trong thư từ.'],
      ['Had it not been for the rain, the match would have finished.', 'Nếu không vì trời mưa thì trận đấu đã xong.', 1, 'Dạng đầy đủ của loại 3 đảo ngữ.'],
      ['If had I known, I would have told you.', 'Giá mà tôi biết thì đã nói với bạn.', 0, 'Sai: bỏ "if". Sửa thành "Had I known, I would have told you."'],
      ["Hadn't he warned us, we would have been in danger.", 'Anh ấy không cảnh báo thì chúng tôi đã gặp nguy.', 0, 'Sai: sửa thành "Had he not warned us".']
    ],
    practice: [
      ['___ (Had / If had) I known, I would have helped.', 'Had', 'Biết thì tôi đã giúp.'],
      ['___ (Were / Was) it not for her advice, I would have quit.', 'Were', 'Không có lời khuyên của cô ấy thì tôi đã bỏ cuộc.'],
      ['___ (Should / Would) you require further details, please write to us.', 'Should', 'Nếu quý vị cần thêm thông tin, xin viết thư cho chúng tôi.'],
      ['Had he ___ (not left / left not) so early, he would have met her.', 'not left', 'Anh ấy mà không về sớm thế thì đã gặp cô ta.'],
      ['___ (Had it not been / If it had not) for the traffic, we would be there now.', 'Had it not been', 'Không vì tắc đường thì giờ chúng ta đã tới nơi.'],
      ['___ (Were / Should) I in your position, I would accept the offer.', 'Were', 'Ở vị trí của bạn thì tôi sẽ nhận lời.'],
      ['Had they ___ (booked / book) earlier, they would have got a discount.', 'booked', 'Đặt sớm hơn thì họ đã được giảm giá.'],
      ['___ (Should / Had) anything go wrong, call this number.', 'Should', 'Nếu có gì trục trặc, gọi số này.'],
      ['Were the company ___ (to expand / expanding), it would need new premises.', 'to expand', 'Nếu công ty mở rộng thì sẽ cần mặt bằng mới.'],
      ['___ (Had / Have) I been there, I would have said something.', 'Had', 'Nếu tôi có mặt ở đó thì đã lên tiếng.']
    ]
  },

  {
    slug: 'but-for-if-not-for',
    en: 'but for / if it were not for',
    vi: 'but for · if it were not for — nếu không nhờ, nếu không vì',
    level: 'C1',
    summary: 'Nêu một yếu tố duy nhất đã ngăn hoặc đã cứu tình thế. Sau "but for" là danh từ, không phải mệnh đề.',
    formula: {
      rows: [
        ['but for + danh từ', 'trang trọng: "But for your help, I would have failed."'],
        ['Hiện tại', 'if it were not for + danh từ'],
        ['Quá khứ', 'if it had not been for + danh từ'],
        ['Đảo ngữ', 'Were it not for … · Had it not been for …']
      ],
      note: 'Ba cách đều cùng nghĩa, chỉ khác độ trang trọng: "but for" trang trọng nhất và ngắn nhất, "if it were not for" trung tính, dạng đảo ngữ dùng trong văn viết.'
    },
    signals: ['but for', 'if it were not for', 'if it had not been for', 'without'],
    useWhen: [
      'Chỉ ra một yếu tố duy nhất làm đổi hẳn kết quả.',
      'Cảm ơn ai đó một cách trang trọng: "But for your support…".',
      'Giải thích nguyên nhân duy nhất của một thất bại hoặc thành công.'
    ],
    useNot: [
      { what: 'Không đặt mệnh đề sau "but for".', why: '"But for you helped me" sai; phải là danh từ hoặc cụm danh từ: "But for your help".' },
      { what: 'Không nhầm với "but" thường.', why: '"but for" là một cụm giới từ trọn vẹn, không phải liên từ "but" cộng giới từ "for".' }
    ],
    confuse: [
      {
        with: 'without',
        tell: '"without" thân mật hơn và dùng được ở mọi văn cảnh; "but for" trang trọng và gần như chỉ gặp trong văn viết.',
        pair: [
          { en: 'Without your help, I would have failed.', vi: 'Không có bạn giúp thì tôi đã trượt. (trung tính)' },
          { en: 'But for your help, I would have failed.', vi: 'Nếu không nhờ bạn giúp thì tôi đã trượt. (trang trọng)' }
        ]
      }
    ],
    errors: [
      { wrong: 'But for you helped me, I would have failed.', right: 'But for your help, I would have failed.', why: 'Sau "but for" phải là danh từ.' },
      { wrong: 'If it was not for the rain, we would have gone out.', right: 'If it had not been for the rain, we would have gone out.', why: 'Vế kết quả ở quá khứ nên điều kiện cũng phải lùi hai bậc.' }
    ],
    examples: [
      ['But for your advice, I would have made a serious mistake.', 'Nếu không nhờ lời khuyên của bạn thì tôi đã mắc sai lầm lớn.', 1, 'Trang trọng, sau "but for" là danh từ.'],
      ['If it were not for the noise, this flat would be perfect.', 'Nếu không vì tiếng ồn thì căn hộ này tuyệt vời.', 1, 'Hiện tại.'],
      ['If it had not been for the strike, we would have arrived on time.', 'Nếu không vì cuộc đình công thì chúng tôi đã tới đúng giờ.', 1, 'Quá khứ.'],
      ['Were it not for the scholarship, she could not study abroad.', 'Không có học bổng thì cô ấy không du học được.', 1, 'Dạng đảo ngữ.'],
      ['But for you helped me, I would have failed.', 'Nếu không nhờ bạn giúp thì tôi đã trượt.', 0, 'Sai: sửa thành "But for your help, I would have failed."'],
      ['If it was not for the rain, we would have gone out.', 'Nếu không vì trời mưa thì chúng tôi đã ra ngoài.', 0, 'Sai: sửa thành "If it had not been for the rain".']
    ],
    practice: [
      ['But for ___ (his support / he supported), the project would have failed.', 'his support', 'Nếu không nhờ anh ấy ủng hộ thì dự án đã đổ.'],
      ['If it ___ (were not / was not) for the traffic, we would be there already.', 'were not', 'Không vì tắc đường thì giờ chúng ta đã tới.'],
      ['___ (Had it not been / If it were not) for the doctor, he would have died.', 'Had it not been', 'Không nhờ bác sĩ thì anh ấy đã chết.'],
      ['But for ___ (the weather / it was raining), the trip would have been perfect.', 'the weather', 'Nếu không vì thời tiết thì chuyến đi đã hoàn hảo.'],
      ['If it had not been for her, we ___ (would have lost / would lose) the contract.', 'would have lost', 'Không nhờ cô ấy thì chúng tôi đã mất hợp đồng.'],
      ['___ (Were / Was) it not for the deadline, I would take a break.', 'Were', 'Không vì hạn chót thì tôi đã nghỉ một lát.'],
      ['But for ___ (a lucky break / luckily), the team would have lost.', 'a lucky break', 'Nếu không nhờ một pha may mắn thì đội đã thua.'],
      ['If it were not for ___ (the cost / it costs), I would buy it.', 'the cost', 'Nếu không vì giá cả thì tôi đã mua.'],
      ['___ (Without / But) your help, this would have taken weeks.', 'Without', 'Không có bạn giúp thì việc này mất hàng tuần.'],
      ['Had it not been for the delay, they ___ (would have caught / would catch) the flight.', 'would have caught', 'Không vì chậm trễ thì họ đã kịp chuyến bay.']
    ]
  },

  {
    slug: 'mandative-subjunctive',
    en: 'The mandative subjunctive',
    vi: 'Thức giả định trong mệnh đề "that"',
    level: 'C1',
    summary: 'Sau các động từ đề nghị và yêu cầu, mệnh đề "that" dùng động từ NGUYÊN THỂ TRẦN cho mọi ngôi — kể cả ngôi thứ ba.',
    formula: {
      rows: [
        ['Động từ dẫn', 'suggest, recommend, insist, demand, request, propose, require'],
        ['Công thức', 'V + that + S + V(nguyên thể trần) — không thêm -s'],
        ['Tính từ dẫn', 'It is essential / vital / important / necessary that + S + V(trần)'],
        ['Phủ định', 'that + S + not + V(trần): "…that he not attend"']
      ],
      note: 'Lối Anh - Anh hay chèn "should": "I suggest that he should go". Lối Anh - Mỹ và văn học thuật quốc tế chuộng dạng trần: "I suggest that he go". Cả hai đều đúng, nhưng dạng trần trang trọng và gọn hơn.'
    },
    signals: ['suggest that', 'recommend that', 'insist that', 'It is essential that', 'demand that'],
    useWhen: [
      'Văn bản trang trọng: kiến nghị, biên bản họp, bài học thuật.',
      'Nêu yêu cầu bắt buộc trong quy định.',
      'Sau tính từ chỉ mức cần thiết: essential, vital, crucial, imperative.'
    ],
    useNot: [
      { what: 'Không chia động từ theo ngôi trong mệnh đề that.', why: '"I suggest that he goes" là lối nói thường ngày; dạng giả định chuẩn là "that he go".' },
      { what: 'Không dùng "to + V" sau suggest.', why: '"I suggest you to go" luôn sai; phải là "I suggest that you go" hoặc "I suggest going".' },
      { what: 'Không dùng "do not" để phủ định.', why: 'Phủ định của thức giả định là "that he not go", không phải "that he does not go".' }
    ],
    confuse: [
      {
        with: 'insist mang nghĩa khẳng định',
        tell: 'insist + thức giả định là ĐÒI HỎI; insist + thì thường là KHẲNG ĐỊNH một sự thật.',
        pair: [
          { en: 'She insisted that he leave immediately.', vi: 'Cô ấy đòi anh ta đi ngay. (yêu cầu)' },
          { en: 'She insisted that he was innocent.', vi: 'Cô ấy khăng khăng rằng anh ta vô tội. (khẳng định)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I suggest you to speak to the manager.', right: 'I suggest that you speak to the manager.', why: '"suggest" không đi với "to + V" sau tân ngữ.' },
      { wrong: 'It is essential that every student submits the form.', right: 'It is essential that every student submit the form.', why: 'Thức giả định dùng động từ nguyên thể trần, không thêm -s.' }
    ],
    examples: [
      ['The committee recommends that the policy be reviewed.', 'Uỷ ban kiến nghị chính sách này được rà soát lại.', 1, 'Dạng bị động của thức giả định.'],
      ['I suggest that he apply for the scholarship.', 'Tôi đề nghị anh ấy nộp đơn xin học bổng.', 1, 'Ngôi thứ ba vẫn dùng "apply", không thêm -s.'],
      ['It is essential that every applicant provide two references.', 'Mỗi ứng viên bắt buộc phải cung cấp hai người giới thiệu.', 1, 'Sau tính từ chỉ mức cần thiết.'],
      ['The judge demanded that the witness not leave the country.', 'Thẩm phán yêu cầu nhân chứng không được rời khỏi nước.', 1, 'Phủ định đặt "not" trước động từ trần.'],
      ['I suggest you to speak to the manager.', 'Tôi đề nghị bạn nói chuyện với quản lý.', 0, 'Sai: sửa thành "I suggest that you speak to the manager."'],
      ['It is essential that every student submits the form.', 'Mỗi sinh viên bắt buộc phải nộp đơn.', 0, 'Sai: sửa thành "that every student submit the form".']
    ],
    practice: [
      ['I recommend that she ___ (take / takes) the earlier train.', 'take', 'Tôi khuyên cô ấy đi chuyến tàu sớm hơn.'],
      ['It is vital that he ___ (be / is) informed immediately.', 'be', 'Nhất thiết phải báo cho anh ấy ngay.'],
      ['The board insisted that the report ___ (be / was) rewritten.', 'be', 'Hội đồng yêu cầu viết lại báo cáo.'],
      ['I suggest ___ (that you check / you to check) the figures again.', 'that you check', 'Tôi đề nghị bạn kiểm tra lại số liệu.'],
      ['They demanded that she ___ (not sign / does not sign) the contract.', 'not sign', 'Họ yêu cầu cô ấy đừng ký hợp đồng.'],
      ['It is important that everyone ___ (arrive / arrives) on time.', 'arrive', 'Điều quan trọng là mọi người phải tới đúng giờ.'],
      ['She insisted that he ___ (was / be) telling the truth.', 'was', 'Cô ấy khăng khăng rằng anh ta đang nói thật.'],
      ['The professor proposed that the deadline ___ (be / is) extended.', 'be', 'Giáo sư đề xuất gia hạn thời hạn nộp bài.'],
      ['It is imperative that the data ___ (remain / remains) confidential.', 'remain', 'Nhất thiết phải giữ bí mật dữ liệu.'],
      ['We request that all guests ___ (register / registers) at the desk.', 'register', 'Chúng tôi đề nghị mọi khách đăng ký tại quầy.']
    ]
  },

  {
    slug: 'implied-conditionals',
    en: 'Implied conditionals',
    vi: 'Điều kiện ngầm — không có mệnh đề "if" nào cả',
    level: 'C1',
    summary: 'Điều kiện nằm trong một cụm giới từ, một trạng ngữ, hay thậm chí chỉ trong ngữ cảnh câu trước. Chữ "would" ở vế sau là dấu hiệu nhận ra.',
    formula: {
      rows: [
        ['Cụm giới từ', 'With more time, I would finish it. · Without you, I would be lost.'],
        ['Trạng ngữ nối', 'In that case / Otherwise / Then'],
        ['Cụm phân từ', 'Given more resources, we could expand.'],
        ['Ngữ cảnh câu trước', '"I lost my phone." — "I would have called the police."']
      ],
      note: 'Cách nhận ra: thấy "would", "could", "might" ở vế chính mà không có mệnh đề if nào, thì điều kiện đang nằm ngầm ở chỗ khác. Đây là điều khiến văn bản học thuật khó đọc với người mới.'
    },
    signals: ['with', 'without', 'given', 'in that case', 'otherwise', 'then'],
    useWhen: [
      'Rút gọn câu cho khỏi nặng nề khi điều kiện đã rõ.',
      'Văn viết học thuật, nơi lặp "if" nhiều lần nghe vụng.',
      'Trả lời trong hội thoại, khi điều kiện là điều người kia vừa nói.'
    ],
    useNot: [
      { what: 'Không dùng nếu điều kiện chưa rõ với người đọc.', why: 'Điều kiện ngầm chỉ hiểu được khi ngữ cảnh đủ rõ; không rõ thì phải viết mệnh đề if đầy đủ.' },
      { what: 'Không dùng "would" ở vế điều kiện ngầm.', why: '"With more time would I finish" sai; "would" chỉ nằm ở vế kết quả.' }
    ],
    confuse: [
      {
        with: 'mệnh đề if đầy đủ',
        tell: 'Cùng nghĩa; dạng ngầm gọn hơn và trang trọng hơn, nhưng cần ngữ cảnh rõ.',
        pair: [
          { en: 'If we had more time, we could do more tests.', vi: 'Có thêm thời gian thì làm được nhiều thí nghiệm hơn. (đầy đủ)' },
          { en: 'With more time, we could do more tests.', vi: 'Thêm thời gian là làm được nhiều thí nghiệm hơn. (ngầm)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Without your help, I will not have finished.', right: 'Without your help, I would not have finished.', why: 'Đây là điều kiện phản thực nên vế kết quả dùng "would have", không dùng "will have".' },
      { wrong: 'Given more money, we will hire two more staff.', right: 'Given more money, we would hire two more staff.', why: 'Cụm "given" mở một giả thiết nên vế sau dùng "would".' }
    ],
    examples: [
      ['With a little more practice, you would pass easily.', 'Luyện thêm chút nữa là bạn đỗ dễ dàng.', 1, 'Điều kiện nằm trong cụm "with".'],
      ['Without the subsidy, many farms would close.', 'Không có trợ cấp thì nhiều nông trại sẽ đóng cửa.', 1, 'Cụm "without".'],
      ['Given enough data, the model could be far more accurate.', 'Có đủ dữ liệu thì mô hình chính xác hơn nhiều.', 1, 'Cụm phân từ "given".'],
      ['"They refused the offer." — "I would have accepted it."', '"Họ từ chối lời đề nghị." — "Tôi thì tôi đã nhận."', 1, 'Điều kiện nằm ở câu trước.'],
      ['Without your help, I will not have finished.', 'Không có bạn giúp thì tôi đã không xong.', 0, 'Sai: sửa thành "I would not have finished".'],
      ['Given more money, we will hire two more staff.', 'Có thêm tiền thì chúng tôi thuê thêm hai người.', 0, 'Sai: sửa thành "we would hire two more staff".']
    ],
    practice: [
      ['With more staff, we ___ (would finish / will finish) much sooner.', 'would finish', 'Có thêm người thì chúng tôi xong nhanh hơn nhiều.'],
      ['Without the internet, modern research ___ (would be / will be) impossible.', 'would be', 'Không có internet thì nghiên cứu hiện đại là bất khả.'],
      ['___ (Given / Giving) more funding, the team could expand.', 'Given', 'Có thêm kinh phí thì đội có thể mở rộng.'],
      ['I did not know she was ill. ___ (Otherwise / However) I would have visited.', 'Otherwise', 'Tôi không biết cô ấy ốm, chứ không thì tôi đã tới thăm.'],
      ['With better planning, this ___ (could have been / can have been) avoided.', 'could have been', 'Lên kế hoạch tốt hơn thì đã tránh được chuyện này.'],
      ['Without her testimony, the case ___ (would have collapsed / will collapse).', 'would have collapsed', 'Không có lời khai của cô ấy thì vụ án đã đổ.'],
      ['In that case, I ___ (would resign / will resign) immediately.', 'would resign', 'Nếu vậy thì tôi từ chức ngay.'],
      ['___ (With / By) a bigger budget, they would have hired a specialist.', 'With', 'Ngân sách lớn hơn thì họ đã thuê chuyên gia.'],
      ['Given the circumstances, anyone ___ (would have done / will do) the same.', 'would have done', 'Trong hoàn cảnh đó thì ai cũng làm vậy thôi.'],
      ['Without proper training, mistakes ___ (would be / are being) inevitable.', 'would be', 'Không được đào tạo tử tế thì sai sót là khó tránh.']
    ]
  },

  {
    slug: 'otherwise-argument',
    en: 'otherwise in academic argument',
    vi: 'otherwise trong lập luận học thuật',
    level: 'C1',
    summary: 'Nói ngược lại điều vừa nêu để chứng minh nó đúng. Một chữ thay cả một mệnh đề điều kiện phủ định.',
    formula: {
      rows: [
        ['Cấu trúc', 'mệnh đề 1; otherwise + would / could / might + …'],
        ['Tương đương', 'otherwise = if this were not so / if that had not happened'],
        ['Vị trí', 'đầu mệnh đề sau dấu chấm phẩy hoặc dấu chấm'],
        ['Cùng chức năng', 'or else (thân mật hơn) · if not (gọn hơn)']
      ],
      note: 'Trong lập luận học thuật, "otherwise" thường dùng để chứng minh ngược: nêu điều sẽ xảy ra nếu giả thuyết SAI, rồi chỉ ra điều đó mâu thuẫn với thực tế quan sát được.'
    },
    signals: ['otherwise', 'or else', 'if not', 'were this not the case'],
    useWhen: [
      'Chứng minh ngược trong lập luận: nếu không thế thì đã có hậu quả khác.',
      'Cảnh báo hệ quả nếu không làm theo khuyến nghị.',
      'Nối hai câu mà không phải viết lại cả mệnh đề điều kiện phủ định.'
    ],
    useNot: [
      { what: 'Không dùng "otherwise" ngay sau "if".', why: 'Hai cái thay nhau; dùng cùng lúc là thừa.' },
      { what: 'Không dùng thì hiện tại ở vế sau khi nói chuyện phản thực.', why: '"otherwise he is angry" sai nếu ý là "chứ không thì anh ta đã giận"; phải là "otherwise he would be angry".' }
    ],
    confuse: [
      {
        with: 'otherwise chỉ cách khác',
        tell: '"otherwise" còn nghĩa là "theo cách khác" hoặc "về mặt khác". Ngữ cảnh quyết định nghĩa nào.',
        pair: [
          { en: 'Book now; otherwise you will lose the seat.', vi: 'Đặt ngay đi, không thì mất chỗ. (điều kiện phủ định)' },
          { en: 'The room was small but otherwise comfortable.', vi: 'Phòng nhỏ nhưng nhìn chung thì thoải mái. (về mặt khác)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The theory must be wrong; otherwise the results are different.', right: 'The theory must be wrong; otherwise the results would be different.', why: 'Lập luận phản thực nên vế sau dùng "would".' },
      { wrong: 'If you do not book now, otherwise you will lose the seat.', right: 'Book now; otherwise you will lose the seat.', why: '"if not" và "otherwise" thay nhau chứ không đi cùng.' }
    ],
    examples: [
      ['The sample must have been contaminated; otherwise the readings would match.', 'Chắc mẫu đã bị nhiễm bẩn, chứ không thì các số đo phải khớp.', 1, 'Chứng minh ngược trong lập luận.'],
      ['Submit the form today; otherwise your application will be void.', 'Hôm nay nộp đơn đi, không thì hồ sơ mất hiệu lực.', 1, 'Cảnh báo hệ quả.'],
      ['He must have left early; otherwise we would have seen him.', 'Chắc anh ấy về sớm, chứ không thì chúng ta đã thấy.', 1, 'Suy luận về quá khứ.'],
      ['The flight was delayed but otherwise the trip went smoothly.', 'Chuyến bay bị hoãn, còn lại thì chuyến đi suôn sẻ.', 1, '"otherwise" theo nghĩa "về mặt khác".'],
      ['The theory must be wrong; otherwise the results are different.', 'Lý thuyết chắc sai, chứ không thì kết quả đã khác.', 0, 'Sai: sửa thành "the results would be different".'],
      ['If you do not book now, otherwise you will lose the seat.', 'Không đặt ngay thì bạn mất chỗ.', 0, 'Sai: thừa. Sửa thành "Book now; otherwise you will lose the seat."']
    ],
    practice: [
      ['She must have known; ___ (otherwise / however) she would have asked.', 'otherwise', 'Chắc cô ấy biết rồi, chứ không thì đã hỏi.'],
      ['Pay the deposit today; otherwise the booking ___ (will be / would be) cancelled.', 'will be', 'Hôm nay đặt cọc đi, không thì mất chỗ đặt.'],
      ['The data must be incomplete; otherwise the totals ___ (would match / match).', 'would match', 'Dữ liệu chắc còn thiếu, chứ không thì các tổng phải khớp.'],
      ['The room was noisy but ___ (otherwise / instead) perfectly adequate.', 'otherwise', 'Phòng ồn nhưng nhìn chung thì cũng ổn.'],
      ['He cannot have read it; ___ (otherwise / therefore) he would know the answer.', 'otherwise', 'Chắc anh ta chưa đọc, chứ không thì đã biết đáp án.'],
      ['Save the file now, ___ (or else / provided that) you will lose your work.', 'or else', 'Lưu tệp ngay không là mất hết công.'],
      ['The measurement must be wrong; otherwise it ___ (would contradict / contradicts) the theory.', 'would contradict', 'Phép đo chắc sai, chứ không thì nó mâu thuẫn với lý thuyết.'],
      ['Leave now; otherwise you ___ (will hit / would hit) the rush hour.', 'will hit', 'Đi ngay đi không là gặp giờ cao điểm.'],
      ['They must have been warned; otherwise they ___ (would not have gone / did not go).', 'would not have gone', 'Chắc họ được cảnh báo rồi, chứ không thì đã đi.'],
      ['The service was slow but ___ (otherwise / rather) the meal was excellent.', 'otherwise', 'Phục vụ chậm nhưng bữa ăn thì tuyệt.']
    ]
  },

  /* ==================== C2 ==================== */

  {
    slug: 'lest-formal',
    en: 'lest / for fear that',
    vi: 'lest · for fear that — kẻo, e rằng',
    level: 'C2',
    summary: 'Nêu điều muốn tránh. "lest" đi với thức giả định và thuộc lối văn trang trọng, gần như chỉ còn trong văn viết.',
    formula: {
      rows: [
        ['lest + S + V(trần)', 'He spoke softly lest he wake the baby.'],
        ['lest + S + should + V', 'biến thể Anh - Anh, mềm hơn'],
        ['for fear that + mệnh đề', 'thường ngày hơn lest'],
        ['in case + hiện tại đơn', 'trung tính nhất trong nhóm']
      ],
      note: '"lest" đã mang sẵn nghĩa phủ định: "lest he wake" nghĩa là "kẻo anh ta THỨC DẬY", không phải "kẻo anh ta không thức". Thêm "not" vào là đảo ngược ý.'
    },
    signals: ['lest', 'for fear that', 'for fear of', 'in case', 'so as not to'],
    useWhen: [
      'Văn viết trang trọng, văn học, diễn văn.',
      'Nêu điều xấu mà hành động nhằm ngăn chặn.',
      '"for fear of + V-ing" khi muốn gọn hơn: "He whispered for fear of waking her."'
    ],
    useNot: [
      { what: 'Không thêm "not" sau lest.', why: '"lest he not wake" đảo ngược ý; "lest" đã phủ định sẵn.' },
      { what: 'Không dùng lest trong hội thoại thường ngày.', why: 'Nghe rất cổ. Nói chuyện bình thường thì dùng "in case" hoặc "so that … not".' }
    ],
    confuse: [
      {
        with: 'in case',
        tell: '"lest" nêu điều muốn TRÁNH; "in case" nêu điều CHUẨN BỊ cho khả năng xảy ra. Sắc thái khác nhau.',
        pair: [
          { en: 'He whispered lest the guard hear him.', vi: 'Anh ta thì thầm kẻo lính gác nghe thấy. (muốn tránh)' },
          { en: 'Take a torch in case the power fails.', vi: 'Mang đèn pin phòng khi mất điện. (chuẩn bị trước)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She left early lest she would miss the train.', right: 'She left early lest she miss the train.', why: 'Sau "lest" là động từ nguyên thể trần hoặc "should", không dùng "would".' },
      { wrong: 'He spoke quietly lest he did not wake the baby.', right: 'He spoke quietly lest he wake the baby.', why: '"lest" đã mang nghĩa phủ định, thêm "not" là đảo ý.' }
    ],
    examples: [
      ['He spoke softly lest he wake the sleeping child.', 'Anh ấy nói khẽ kẻo đánh thức đứa bé đang ngủ.', 1, 'Thức giả định sau "lest".'],
      ['She checked the figures twice lest there be an error.', 'Cô ấy kiểm tra số liệu hai lần e rằng có sai sót.', 1, 'Dạng "be" của thức giả định.'],
      ['They said nothing for fear that the deal might collapse.', 'Họ không nói gì vì sợ thương vụ đổ bể.', 1, '"for fear that" thường ngày hơn.'],
      ['He whispered for fear of waking her.', 'Anh ấy thì thầm vì sợ làm cô ấy thức giấc.', 1, '"for fear of" + V-ing, gọn hơn.'],
      ['She left early lest she would miss the train.', 'Cô ấy đi sớm kẻo lỡ tàu.', 0, 'Sai: sửa thành "lest she miss the train".'],
      ['He spoke quietly lest he did not wake the baby.', 'Anh ấy nói khẽ kẻo đánh thức em bé.', 0, 'Sai: sửa thành "lest he wake the baby".']
    ],
    practice: [
      ['He locked the door lest anyone ___ (enter / entered).', 'enter', 'Anh ấy khoá cửa kẻo có người vào.'],
      ['She wrote it down lest she ___ (forget / would forget).', 'forget', 'Cô ấy ghi lại kẻo quên.'],
      ['They kept quiet ___ (for fear that / in order that) they would be overheard.', 'for fear that', 'Họ im lặng vì sợ bị nghe lỏm.'],
      ['He hid the letter lest it ___ (be / was) discovered.', 'be', 'Anh ta giấu lá thư kẻo bị phát hiện.'],
      ['Take a spare key ___ (in case / lest) you lock yourself out.', 'in case', 'Mang chìa khoá dự phòng phòng khi bị khoá ngoài.'],
      ['She spoke carefully ___ (for fear of / for fear that) offending anyone.', 'for fear of', 'Cô ấy nói năng cẩn thận vì sợ làm mất lòng ai.'],
      ['The guard stayed awake lest the prisoner ___ (escape / escapes).', 'escape', 'Lính gác thức canh kẻo tù nhân trốn mất.'],
      ['He said nothing lest he ___ (make / made) matters worse.', 'make', 'Anh ấy không nói gì kẻo làm mọi việc tệ thêm.'],
      ['Bring an umbrella ___ (in case / lest) it rains.', 'in case', 'Mang ô phòng khi trời mưa.'],
      ['They moved quietly lest they ___ (be / were) heard.', 'be', 'Họ đi khẽ kẻo bị nghe thấy.']
    ]
  },

  {
    slug: 'conditional-hedging-academic',
    en: 'Conditionals as hedging in academic writing',
    vi: 'Dùng câu điều kiện để rào đón trong bài học thuật',
    level: 'C2',
    summary: 'Đặt một khẳng định mạnh vào khung điều kiện là cách hạ mức cam kết mà vẫn giữ được lập luận. Công cụ chuẩn của văn học thuật.',
    formula: {
      rows: [
        ['Giả thiết chưa chắc', 'If this interpretation is correct, then …'],
        ['Giả thiết xa hơn', 'Were this hypothesis to hold, it would follow that …'],
        ['Dè dặt hơn nữa', 'Should further evidence emerge, the conclusion may need revising.'],
        ['Nhượng bộ có điều kiện', 'Even if X were true, Y would still not follow.']
      ],
      note: '"Were X to + V" là dạng giả định trang trọng nhất, dùng khi giả thiết còn xa thực tế. "Even if" là công cụ phản biện mạnh: chấp nhận giả thiết của đối phương rồi vẫn chỉ ra kết luận không theo.'
    },
    signals: ['If this is correct', 'Were this to', 'Should it prove', 'Even if', 'assuming that'],
    useWhen: [
      'Diễn giải kết quả khi bằng chứng chưa đủ mạnh.',
      'Nêu hệ quả của một giả thuyết chưa được kiểm chứng.',
      'Phản biện: chấp nhận tạm giả thiết của người khác rồi chỉ ra chỗ hỏng.',
      'Nêu giới hạn của nghiên cứu ở phần kết luận.'
    ],
    useNot: [
      { what: 'Không rào đón điều đã chứng minh chắc chắn.', why: 'Số liệu rõ ràng mà viết "if the data are correct" thì người đọc nghi ngờ chính tác giả.' },
      { what: 'Không chồng nhiều lớp rào đón.', why: '"If it might possibly be the case that…" làm câu rỗng nghĩa.' }
    ],
    confuse: [
      {
        with: 'if và even if',
        tell: '"if" nêu điều kiện cần; "even if" nhượng bộ rồi bác bỏ — chấp nhận giả thiết mà kết luận vẫn không theo.',
        pair: [
          { en: 'If the sample were larger, the result would be significant.', vi: 'Nếu mẫu lớn hơn thì kết quả sẽ có ý nghĩa. (điều kiện cần)' },
          { en: 'Even if the sample were larger, the result would not be significant.', vi: 'Dù mẫu có lớn hơn thì kết quả vẫn không có ý nghĩa. (nhượng bộ rồi bác)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If the data in Table 1 are correct, sales doubled.', right: 'The data in Table 1 show that sales doubled.', why: 'Số liệu chính mình trình bày thì không rào đón; rào đón chỗ đó là tự làm yếu bài viết.' },
      { wrong: 'Were this hypothesis holds, it would explain the anomaly.', right: 'Were this hypothesis to hold, it would explain the anomaly.', why: 'Cấu trúc là "Were + S + to + V".' }
    ],
    examples: [
      ['If this interpretation is correct, earlier studies may need revisiting.', 'Nếu cách diễn giải này đúng thì có lẽ phải xem lại các nghiên cứu trước.', 1, 'Rào đón một khẳng định mạnh.'],
      ['Were this pattern to hold across other regions, the implications would be considerable.', 'Nếu khuôn mẫu này đúng ở các vùng khác thì hệ quả sẽ rất lớn.', 1, 'Dạng "Were … to" trang trọng nhất.'],
      ['Should further data become available, these findings will be re-examined.', 'Nếu có thêm dữ liệu, các kết quả này sẽ được xem xét lại.', 1, 'Đảo ngữ với "Should".'],
      ['Even if the correlation were stronger, causation would not follow.', 'Dù tương quan có mạnh hơn thì cũng không suy ra được quan hệ nhân quả.', 1, 'Nhượng bộ rồi bác bỏ.'],
      ['If the data in Table 1 are correct, sales doubled.', 'Nếu số liệu ở Bảng 1 đúng thì doanh số đã tăng gấp đôi.', 0, 'Sai sắc thái: sửa thành "The data in Table 1 show that sales doubled."'],
      ['Were this hypothesis holds, it would explain the anomaly.', 'Nếu giả thuyết này đúng thì giải thích được điểm dị thường.', 0, 'Sai: sửa thành "Were this hypothesis to hold".']
    ],
    practice: [
      ['___ (Were / Was) this trend to continue, the effects would be severe.', 'Were', 'Nếu xu hướng này tiếp diễn thì hậu quả sẽ nặng nề.'],
      ['___ (Even if / If) the theory were correct, it would not explain this case.', 'Even if', 'Dù lý thuyết có đúng thì cũng không giải thích được ca này.'],
      ['___ (Should / Would) new evidence emerge, we will revise the model.', 'Should', 'Nếu có bằng chứng mới, chúng tôi sẽ chỉnh lại mô hình.'],
      ['Figure 2 ___ (shows / may show) a clear downward trend.', 'shows', 'Hình 2 cho thấy xu hướng giảm rõ rệt.'],
      ['Were the sample ___ (to be / being) larger, the findings would carry more weight.', 'to be', 'Nếu mẫu lớn hơn thì kết quả sẽ có sức nặng hơn.'],
      ['Assuming ___ (that / if) these conditions hold, the model predicts growth.', 'that', 'Giả sử các điều kiện này đúng thì mô hình dự báo tăng trưởng.'],
      ['If this reading ___ (is / were) accepted, much of the earlier work stands.', 'is', 'Nếu chấp nhận cách hiểu này thì phần lớn công trình trước vẫn đứng vững.'],
      ['Even if funding ___ (were / is) doubled, the timeline would remain tight.', 'were', 'Dù kinh phí có tăng gấp đôi thì tiến độ vẫn căng.'],
      ['___ (Should / Were) the results prove replicable, the field would shift.', 'Should', 'Nếu kết quả lặp lại được thì cả ngành sẽ thay đổi.'],
      ['Were we ___ (to adopt / adopting) this method, costs would rise sharply.', 'to adopt', 'Nếu áp dụng phương pháp này thì chi phí sẽ tăng vọt.']
    ]
  },

  {
    slug: 'counterfactual-nuance',
    en: 'Shades of regret and reproach',
    vi: 'Sắc thái tiếc nuối và trách móc',
    level: 'C2',
    summary: 'Cùng nói chuyện đã rồi mà không như ý, nhưng mỗi cấu trúc mang một thái độ khác: tiếc, trách, mỉa, hay chỉ nhận xét.',
    formula: {
      rows: [
        ['Tiếc, hướng vào mình', 'I wish I had … · If only I had …'],
        ['Trách, hướng vào người khác', 'You could have … · You might have … · You should have …'],
        ['Mỉa mai', 'A fine time you chose! · You might have told me.'],
        ['Nhận xét trung tính', 'It would have been better to …']
      ],
      note: 'Chọn sai cấu trúc là đổi hẳn quan hệ với người nghe. "You could have told me" là trách nhẹ; "You should have told me" là trách nặng hơn vì hàm ý đó là bổn phận; "I wish you had told me" mềm nhất vì hướng vào cảm xúc của chính người nói.'
    },
    signals: ['I wish', 'If only', 'You could have', 'You might have', 'It would have been better'],
    useWhen: [
      'Bày tỏ tiếc nuối về lựa chọn của chính mình.',
      'Trách người khác ở các mức nặng nhẹ khác nhau.',
      'Góp ý sau sự việc mà không muốn nghe gay gắt.'
    ],
    useNot: [
      { what: 'Không dùng "should have" khi muốn nói nhẹ.', why: 'Nó hàm ý bổn phận nên nghe nặng; muốn nhẹ thì dùng "could have" hoặc "I wish you had".' },
      { what: 'Không dùng "might have" theo nghĩa trách với người lạ.', why: '"You might have warned me" mang giọng dỗi; với người không thân dễ bị hiểu là gây sự.' }
    ],
    confuse: [
      {
        with: 'could have và should have khi trách',
        tell: 'could have nói khả năng đã có; should have nói bổn phận đã có. Cái sau nặng hơn hẳn.',
        pair: [
          { en: 'You could have called me.', vi: 'Bạn gọi cho tôi được mà. (trách nhẹ, chỉ nêu khả năng)' },
          { en: 'You should have called me.', vi: 'Lẽ ra bạn phải gọi cho tôi. (trách nặng, hàm ý bổn phận)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I wish you would have told me earlier.', right: 'I wish you had told me earlier.', why: 'Ước về quá khứ dùng "had + V3"; "would have" sau wish là lỗi phổ biến.' },
      { wrong: 'If only I would know then what I know now.', right: 'If only I had known then what I know now.', why: 'Tiếc chuyện quá khứ nên lùi hai bậc.' }
    ],
    examples: [
      ['I wish I had taken that opportunity.', 'Giá mà hồi đó tôi nắm lấy cơ hội ấy.', 1, 'Tiếc, hướng vào mình.'],
      ['You could have mentioned it before we booked.', 'Bạn nói trước khi chúng tôi đặt thì có phải hơn không.', 1, 'Trách nhẹ.'],
      ['You should have checked the terms before signing.', 'Lẽ ra bạn phải đọc kỹ điều khoản trước khi ký.', 1, 'Trách nặng hơn, hàm ý bổn phận.'],
      ['It would have been better to wait a week.', 'Đợi thêm một tuần thì hơn.', 1, 'Nhận xét trung tính, không nhắm vào ai.'],
      ['I wish you would have told me earlier.', 'Giá mà bạn nói với tôi sớm hơn.', 0, 'Sai: sửa thành "I wish you had told me earlier."'],
      ['If only I would know then what I know now.', 'Giá mà hồi đó tôi biết những gì bây giờ tôi biết.', 0, 'Sai: sửa thành "If only I had known then".']
    ],
    practice: [
      ['I wish I ___ (had listened / would have listened) to her.', 'had listened', 'Giá mà tôi nghe lời cô ấy.'],
      ['You ___ (could have / can have) warned us about the roadworks.', 'could have', 'Bạn báo trước vụ sửa đường thì có phải hơn không.'],
      ['If only we ___ (had left / left) ten minutes earlier.', 'had left', 'Giá mà chúng ta đi sớm hơn mười phút.'],
      ['It ___ (would have been / will have been) wiser to keep the receipt.', 'would have been', 'Giữ lại hoá đơn thì khôn hơn.'],
      ['You ___ (should have / could have) read the contract — it was your responsibility.', 'should have', 'Lẽ ra bạn phải đọc hợp đồng, đó là trách nhiệm của bạn.'],
      ['I wish they ___ (had asked / would ask) me first.', 'had asked', 'Giá mà họ hỏi tôi trước.'],
      ['She ___ (might have / may have) let us know she was leaving.', 'might have', 'Cô ấy báo một tiếng là sắp đi thì có phải hơn không.'],
      ['If only he ___ (had been / were) more careful that day.', 'had been', 'Giá mà hôm đó anh ấy cẩn thận hơn.'],
      ['I wish I ___ (were / had been) able to help you yesterday.', 'had been', 'Giá mà hôm qua tôi giúp được bạn.'],
      ['It ___ (would have been / would be) better if we had discussed it first.', 'would have been', 'Bàn trước với nhau thì đã hơn.']
    ]
  },

  {
    slug: 'conditional-ellipsis',
    en: 'Ellipsis in conditional clauses',
    vi: 'Lược bỏ trong câu điều kiện',
    level: 'C2',
    summary: 'Rút mệnh đề điều kiện xuống còn hai chữ. Rất thông dụng trong văn viết gọn và hội thoại, nhưng người học ít dùng nên văn nghe dài dòng.',
    formula: {
      rows: [
        ['Thay cả mệnh đề', 'If so = nếu vậy · If not = nếu không'],
        ['Rút với danh từ', 'if any · if anything · if at all · if necessary'],
        ['Rút với tính từ', 'if possible · if true · if correct'],
        ['Rút với phân từ', 'if asked · if given the chance · if left untreated']
      ],
      note: '"if anything" có nghĩa riêng là "nếu có gì thì cũng chỉ là", dùng để chỉnh lại nhận định vừa nêu: "It is not colder today; if anything, it is warmer."'
    },
    signals: ['if so', 'if not', 'if any', 'if anything', 'if at all', 'if necessary', 'if possible'],
    useWhen: [
      'Trả lời hoặc nối tiếp mà không muốn lặp lại cả mệnh đề.',
      'Văn viết học thuật cần gọn: "The effect, if any, was small."',
      '"if anything" khi muốn chỉnh nhẹ lại điều vừa nói.',
      'Cụm phân từ rút gọn trong hướng dẫn: "If left untreated, the condition worsens."'
    ],
    useNot: [
      { what: 'Không rút gọn khi chủ ngữ hai vế khác nhau.', why: '"If asked, the manager will decide" ổn vì chủ ngữ trùng; chủ ngữ khác nhau thì phải viết đủ.' },
      { what: 'Không nhầm "if any" với "if anything".', why: '"if any" là "nếu có" đi kèm danh từ; "if anything" là "nếu có gì thì ngược lại".' }
    ],
    confuse: [
      {
        with: 'if any và if anything',
        tell: '"if any" bổ nghĩa cho một danh từ; "if anything" đứng riêng và dùng để đảo nhẹ nhận định.',
        pair: [
          { en: 'There were few objections, if any.', vi: 'Gần như không có ý kiến phản đối nào.' },
          { en: 'It is not worse; if anything, it is better.', vi: 'Không tệ hơn đâu, mà nếu có thì còn tốt hơn.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Are you coming? If it is so, tell me now.', right: 'Are you coming? If so, tell me now.', why: 'Dạng rút gọn cố định là "If so", không chèn thêm "it is".' },
      { wrong: 'The damage, if anything, was minimal.', right: 'The damage, if any, was minimal.', why: 'Bổ nghĩa cho danh từ "damage" nên dùng "if any".' }
    ],
    examples: [
      ['Will you be joining us? If so, let me know by Friday.', 'Bạn có tham gia không? Nếu có thì báo tôi trước thứ Sáu.', 1, '"If so" thay cả mệnh đề.'],
      ['The side effects, if any, are usually mild.', 'Tác dụng phụ, nếu có, thường nhẹ.', 1, '"if any" bổ nghĩa cho danh từ.'],
      ['It is not colder today; if anything, it is warmer.', 'Hôm nay không lạnh hơn, mà nếu có thì còn ấm hơn.', 1, '"if anything" chỉnh lại nhận định.'],
      ['If left untreated, the infection can spread rapidly.', 'Nếu không điều trị, nhiễm trùng có thể lan nhanh.', 1, 'Rút gọn bằng phân từ.'],
      ['Are you coming? If it is so, tell me now.', 'Bạn có tới không? Nếu có thì nói ngay.', 0, 'Sai: sửa thành "If so, tell me now."'],
      ['The damage, if anything, was minimal.', 'Thiệt hại, nếu có, cũng không đáng kể.', 0, 'Sai: sửa thành "The damage, if any, was minimal."']
    ],
    practice: [
      ['Do you need a receipt? ___ (If so / If it so), I will print one.', 'If so', 'Bạn cần hoá đơn không? Nếu có thì tôi in.'],
      ['There was little evidence, ___ (if any / if anything), of tampering.', 'if any', 'Gần như không có bằng chứng nào cho thấy bị can thiệp.'],
      ['He is not lazy; ___ (if anything / if any), he works too hard.', 'if anything', 'Anh ấy không lười, mà nếu có thì làm việc quá sức.'],
      ['___ (If necessary / If necessarily), we can extend the deadline.', 'If necessary', 'Nếu cần, chúng tôi có thể gia hạn.'],
      ['Come at seven; ___ (if not / if no), let me know.', 'if not', 'Bảy giờ tới nhé, không thì báo tôi.'],
      ['___ (If left / If leaving) unattended, luggage will be removed.', 'If left', 'Hành lý để không người trông sẽ bị dọn đi.'],
      ['She rarely complains, ___ (if ever / if any).', 'if ever', 'Cô ấy hầu như không bao giờ phàn nàn.'],
      ['Please reply ___ (if possible / if possibly) before noon.', 'if possible', 'Nếu được thì trả lời trước trưa giúp tôi.'],
      ['___ (If asked / If asking), he would deny everything.', 'If asked', 'Nếu bị hỏi thì anh ta sẽ chối hết.'],
      ['The delay was short, ___ (if at all / if anything) noticeable.', 'if at all', 'Độ trễ ngắn lắm, gần như không nhận ra.']
    ]
  }
];

/** Điểm ngữ pháp — nhóm câu điều kiện và giả định bậc C1–C2. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'conditional',
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
