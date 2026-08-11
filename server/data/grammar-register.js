/**
 * Ngữ pháp — nhóm SẮC THÁI, ĐỘ TRANG TRỌNG và RÀO ĐÓN, phần bậc A1 đến B2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 33 điểm
 * (A1 ×1, A2 ×2, B1 ×4, B2 ×7, C1 ×9, C2 ×10). Tệp này soạn 14 điểm của A1
 * đến B2; 19 điểm bậc C1–C2 tách thành mục riêng trong hàng đợi.
 *
 * Cả nhóm lo một chuyện mà ngữ pháp sách vở ít nói tới: NÓI ĐÚNG THÌ CHƯA ĐỦ,
 * CÒN PHẢI NÓI VỪA PHẢI. Cùng một nội dung, đổi vài chữ là đổi hẳn quan hệ
 * giữa người nói và người nghe — từ thẳng thừng sang nhã nhặn, từ chắc nịch
 * sang dè dặt, từ chuyện trò sang văn bản.
 *
 * Vì sao người Việt hay lệch chỗ này: tiếng Việt đánh dấu sắc thái bằng hệ
 * đại từ xưng hô và một rừng tiểu từ cuối câu — "ạ", "nhé", "thôi", "cơ mà".
 * Tiếng Anh không có bộ đó, nên phải chuyển sang thứ khác: câu hỏi gián tiếp,
 * câu hỏi đuôi, từ giảm nhẹ, trạng từ rào đón. Dịch thẳng từ tiếng Việt sang
 * thì câu đúng ngữ pháp mà nghe cộc, hoặc ngược lại là khách sáo quá mức.
 *
 * Ghi chú tránh trùng: xin phép và nhờ vả bằng KHUYẾT THIẾU (can, could, may,
 * would like) cùng lối lùi thì để lịch sự đã dựng ở nhóm động từ khuyết thiếu;
 * tệp này chỉ bàn các phương tiện KHÔNG PHẢI khuyết thiếu. Từ nối theo độ
 * trang trọng nằm ở bảng linking_words. Bị động để giấu tác nhân thuộc nhóm
 * bị động.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A1 ==================== */

  {
    slug: 'politeness-basics',
    en: 'please, thank you, sorry, excuse me',
    vi: 'Nghi thức tối thiểu — please, thank you, sorry, excuse me',
    level: 'A1',
    summary: 'Bốn cụm phải thuộc trước tiên. Thiếu chúng thì câu đúng ngữ pháp vẫn nghe cộc lốc với người bản ngữ.',
    formula: {
      rows: [
        ['please cuối câu — thông dụng nhất', 'Can I have a coffee, PLEASE?'],
        ['please đầu câu — khẩn khoản hơn', 'PLEASE sit down.'],
        ['excuse me — trước khi làm phiền', 'EXCUSE ME, is this seat free?'],
        ['sorry — sau khi đã làm phiền', 'SORRY, I did not mean to push you.']
      ],
      note: 'Phân biệt "excuse me" với "sorry" là chỗ người Việt hay lệch: "excuse me" dùng TRƯỚC khi làm phiền ai (hỏi đường, đi ngang qua, bắt chuyện), còn "sorry" dùng SAU khi đã lỡ làm gì đó. Gọi người phục vụ mà nói "Sorry!" thì nghe như mình vừa gây ra chuyện gì.'
    },
    signals: ['please', 'thank you', 'thanks', 'sorry', 'excuse me'],
    useWhen: [
      'Mọi lời nhờ vả, dù nhỏ tới đâu: tiếng Anh dùng "please" dày hơn tiếng Việt dùng "ạ" nhiều.',
      '"Excuse me" khi hỏi đường, gọi phục vụ, hoặc muốn đi qua chỗ đông người.',
      '"Thank you" cả khi nhận lời từ chối — đây là nếp thường thấy trong giao tiếp tiếng Anh.'
    ],
    useNot: [
      { what: 'Không dùng "sorry" khi định gây chú ý.', why: 'Gọi người phục vụ thì nói "Excuse me", không nói "Sorry" — "sorry" là xin lỗi vì việc đã xảy ra.' },
      { what: 'Không bỏ "please" trong lời nhờ.', why: '"Give me a coffee" đúng ngữ pháp nhưng nghe như ra lệnh. Thêm "please" là đủ lịch sự cho hầu hết tình huống.' }
    ],
    confuse: [
      {
        with: '"excuse me" khác "sorry"',
        tell: 'Chưa làm phiền thì "excuse me". Đã lỡ rồi thì "sorry".',
        pair: [
          { en: 'Excuse me, could I get past?', vi: 'Xin lỗi cho tôi đi qua với (chưa làm phiền, đang xin phép).' },
          { en: 'Sorry, I stepped on your foot.', vi: 'Xin lỗi, tôi giẫm phải chân bạn (đã lỡ rồi).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Sorry, is this seat free?', right: 'Excuse me, is this seat free?', why: 'Bắt chuyện thì dùng "excuse me"; "sorry" là xin lỗi vì việc đã xảy ra.' },
      { wrong: 'Give me a glass of water.', right: 'Could I have a glass of water, please?', why: 'Thiếu "please" và thiếu khung lịch sự nên nghe như ra lệnh.' }
    ],
    examples: [
      ['Can I have a coffee, please?', 'Cho tôi một cà phê nhé?', 1, '"please" ở cuối câu — vị trí thông dụng nhất.'],
      ['Excuse me, is this seat free?', 'Xin lỗi, ghế này có ai ngồi chưa ạ?', 1, '"excuse me" mở lời trước khi làm phiền.'],
      ['Sorry, I did not mean to push you.', 'Xin lỗi, tôi không cố ý đẩy bạn.', 1, '"sorry" dùng sau khi đã lỡ làm gì đó.'],
      ['Thank you very much for your help.', 'Cảm ơn bạn rất nhiều vì đã giúp.', 1, 'Lời cảm ơn đầy đủ, dùng được cả trong thư từ.'],
      ['Sorry, is this seat free?', 'Xin lỗi, ghế này có ai ngồi chưa ạ?', 0, 'Sai: sửa thành "Excuse me, is this seat free?"'],
      ['Give me a glass of water.', 'Cho tôi xin cốc nước.', 0, 'Sai văn phong: sửa thành "Could I have a glass of water, please?"']
    ],
    practice: [
      ['Can I have a coffee, ___ (please / thanks)?', 'please', 'Cho tôi một cà phê nhé?'],
      ['___ (Excuse me / Sorry), is this seat free?', 'Excuse me', 'Xin lỗi, ghế này có ai ngồi chưa ạ?'],
      ['___ (Sorry / Excuse me), I stepped on your foot.', 'Sorry', 'Xin lỗi, tôi giẫm phải chân bạn.'],
      ['___ (Thank you / Please) very much for your help.', 'Thank you', 'Cảm ơn bạn rất nhiều vì đã giúp.'],
      ['Use ___ (excuse me / sorry) before you disturb someone.', 'excuse me', 'Dùng "excuse me" trước khi làm phiền ai.'],
      ['___ (Excuse me / Sorry), could you tell me the time?', 'Excuse me', 'Xin lỗi, bạn cho tôi hỏi mấy giờ rồi ạ?'],
      ['Could I have the bill, ___ (please / sorry)?', 'please', 'Cho tôi xin hoá đơn nhé?'],
      ['___ (Please / Sorry) sit down and make yourself comfortable.', 'Please', 'Mời ngồi, cứ tự nhiên nhé.'],
      ['___ (Sorry / Excuse me) I am late — the bus broke down.', 'Sorry', 'Xin lỗi vì tôi tới muộn, xe buýt hỏng giữa đường.'],
      ['The most common place for "please" is at the ___ (end / middle) of a request.', 'end', 'Vị trí thông dụng nhất của "please" là ở cuối lời nhờ.']
    ]
  },

  /* ==================== A2 ==================== */

  {
    slug: 'softener-a-bit',
    en: 'Softening with a bit, a little, not very',
    vi: 'Làm nhẹ lời chê — a bit, a little, not very',
    level: 'A2',
    summary: 'Tiếng Anh ít khi chê thẳng. Thêm "a bit" hoặc đổi sang "not very" là câu mềm hẳn mà nghĩa vẫn nguyên.',
    formula: {
      rows: [
        ['a bit + tính từ chê', 'It is A BIT expensive. (đắt hơn mong đợi một chút)'],
        ['a little — trang trọng hơn', 'The room is A LITTLE cold.'],
        ['not very + tính từ khen', 'The food was NOT VERY good. (thay cho "bad")'],
        ['Chỉ đi với nghĩa chê', 'a bit tired ✓ · a bit wonderful ✗']
      ],
      note: '"a bit" và "a little" chỉ ghép được với tính từ mang nghĩa tiêu cực hoặc trung tính. "It is a bit wonderful" nghe sai hẳn, vì không ai cần làm nhẹ một lời khen. Muốn giảm nhẹ lời khen thì dùng "quite": "It is quite good."'
    },
    signals: ['a bit', 'a little', 'not very', 'slightly'],
    useWhen: [
      'Chê hoặc phàn nàn mà không muốn làm mất lòng.',
      'Nói về khó khăn của mình cho nhẹ đi: "I am a bit tired."',
      'Góp ý trong công việc: "The report is a bit long."'
    ],
    useNot: [
      { what: 'Không dùng "a bit" với tính từ khen.', why: '"a bit wonderful" sai. Lời khen thì không cần làm nhẹ; muốn giảm bớt thì dùng "quite good".' },
      { what: 'Không dùng "a bit of" trước tính từ.', why: '"It is a bit of expensive" sai. "a bit of" đi với danh từ: "a bit of trouble"; trước tính từ chỉ có "a bit".' }
    ],
    confuse: [
      {
        with: '"a bit" khác "a bit of"',
        tell: 'Theo sau là tính từ thì dùng "a bit". Theo sau là danh từ thì dùng "a bit of".',
        pair: [
          { en: 'The room is a bit cold.', vi: 'Phòng hơi lạnh (theo sau là tính từ).' },
          { en: 'We had a bit of trouble finding it.', vi: 'Chúng tôi hơi vất vả mới tìm ra (theo sau là danh từ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The film was a bit wonderful.', right: 'The film was quite good.', why: '"a bit" chỉ đi với nghĩa chê; muốn giảm nhẹ lời khen thì dùng "quite".' },
      { wrong: 'It is a bit of expensive for me.', right: 'It is a bit expensive for me.', why: 'Trước tính từ chỉ dùng "a bit", không có "of".' }
    ],
    examples: [
      ['It is a bit expensive for me.', 'Với tôi thì hơi đắt.', 1, 'Chê nhẹ nhàng, không làm mất lòng người bán.'],
      ['The room is a little cold, is it not?', 'Phòng hơi lạnh nhỉ?', 1, '"a little" trang trọng hơn "a bit" một chút.'],
      ['The food was not very good.', 'Đồ ăn không được ngon lắm.', 1, '"not very good" nhẹ hơn hẳn "bad".'],
      ['We had a bit of trouble finding the office.', 'Chúng tôi hơi vất vả mới tìm ra văn phòng.', 1, '"a bit of" đi với danh từ.'],
      ['The film was a bit wonderful.', 'Bộ phim khá tuyệt.', 0, 'Sai: sửa thành "The film was quite good."'],
      ['It is a bit of expensive for me.', 'Với tôi thì hơi đắt.', 0, 'Sai: sửa thành "It is a bit expensive for me."']
    ],
    practice: [
      ['It is ___ (a bit / a bit of) expensive for me.', 'a bit', 'Với tôi thì hơi đắt.'],
      ['We had ___ (a bit of / a bit) trouble finding the office.', 'a bit of', 'Chúng tôi hơi vất vả mới tìm ra văn phòng.'],
      ['The food was ___ (not very good / a bit good).', 'not very good', 'Đồ ăn không được ngon lắm.'],
      ['The film was ___ (quite / a bit) wonderful.', 'quite', 'Bộ phim khá tuyệt.'],
      ['"A bit" goes with ___ (negative / positive) adjectives.', 'negative', 'Cụm "a bit" đi với tính từ mang nghĩa chê.'],
      ['I am ___ (a bit / a bit of) tired after the trip.', 'a bit', 'Tôi hơi mệt sau chuyến đi.'],
      ['The report is ___ (a little / a little of) long.', 'a little', 'Bản báo cáo hơi dài.'],
      ['Instead of "bad", say ___ (not very good / a bit good).', 'not very good', 'Thay vì nói "bad", hãy nói "not very good".'],
      ['The queue was ___ (a bit / a bit of) slow this morning.', 'a bit', 'Sáng nay hàng người xếp hơi chậm.'],
      ['She was ___ (slightly / a bit of) disappointed with the result.', 'slightly', 'Cô ấy hơi thất vọng với kết quả.']
    ]
  },

  {
    slug: 'im-afraid-unfortunately',
    en: 'Breaking bad news politely',
    vi: 'Báo tin không vui cho nhã — I am afraid, Unfortunately',
    level: 'A2',
    summary: 'Đặt một cụm báo trước lên đầu để người nghe chuẩn bị tinh thần. "I am afraid" ở đây không liên quan gì tới sợ hãi.',
    formula: {
      rows: [
        ['I am afraid + mệnh đề', 'I AM AFRAID we are closed.'],
        ['Unfortunately + mệnh đề', 'UNFORTUNATELY, the train has been cancelled.'],
        ['I am sorry, but…', 'I AM SORRY, BUT there are no seats left.'],
        ['Trả lời ngắn', '"Is there any left?" — "I am afraid not."']
      ],
      note: '"I am afraid" ở đây tuyệt đối không mang nghĩa sợ. Nó chỉ là tín hiệu báo trước rằng câu sau là tin không vui, đúng vai của chữ "e là" trong tiếng Việt. Đây cũng là cụm nhân viên dịch vụ dùng suốt ngày, nên nghe quen thì hiểu ngay là sắp bị từ chối.'
    },
    signals: ['I am afraid', 'Unfortunately', 'I am sorry but', 'I am afraid not', 'I am afraid so'],
    useWhen: [
      'Từ chối một yêu cầu mà vẫn giữ được thiện cảm.',
      'Báo tin xấu trong email công việc: "Unfortunately, we cannot meet the deadline."',
      'Trả lời ngắn khi câu trả lời là không: "I am afraid not."'
    ],
    useNot: [
      { what: 'Không hiểu "I am afraid" theo nghĩa sợ hãi.', why: '"I am afraid we are closed" nghĩa là "e là chúng tôi đóng cửa rồi", không phải người nói đang sợ.' },
      { what: 'Không dùng "Unfortunately" cho tin vui.', why: 'Từ này chỉ mở đường cho tin không mong muốn. Tin vui thì dùng "Luckily" hoặc "Good news:".' }
    ],
    confuse: [
      {
        with: '"I am afraid not" khác "I am afraid so"',
        tell: '"not" khi câu trả lời là không; "so" khi câu trả lời là có, mà cái có đó lại là điều không ai muốn.',
        pair: [
          { en: 'Is there any coffee left? — I am afraid not.', vi: 'Còn cà phê không? — E là hết rồi.' },
          { en: 'Do we have to pay extra? — I am afraid so.', vi: 'Chúng tôi phải trả thêm à? — E là đúng vậy.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Unfortunately, you have won the first prize.', right: 'Good news: you have won the first prize.', why: '"Unfortunately" chỉ mở đường cho tin xấu.' },
      { wrong: 'Is there any left? — I am afraid so.', right: 'Is there any left? — I am afraid not.', why: 'Câu trả lời là không nên phải dùng "not".' }
    ],
    examples: [
      ['I am afraid we are closed for the day.', 'E là hôm nay chúng tôi đóng cửa rồi ạ.', 1, 'Cụm báo trước, không liên quan gì tới sợ hãi.'],
      ['Unfortunately, the train has been cancelled.', 'Rất tiếc, chuyến tàu đã bị huỷ.', 1, 'Đứng đầu câu, có dấu phẩy theo sau.'],
      ['I am sorry, but there are no seats left.', 'Tôi xin lỗi, nhưng hết chỗ mất rồi ạ.', 1, 'Mẫu quen thuộc khi từ chối trực tiếp.'],
      ['Do we have to pay extra? — I am afraid so.', 'Chúng tôi phải trả thêm à? — E là đúng vậy.', 1, '"so" khi câu trả lời là có mà lại là điều không ai muốn.'],
      ['Unfortunately, you have won the first prize.', 'Rất tiếc, bạn đã giành giải nhất.', 0, 'Sai: sửa thành "Good news: you have won the first prize."'],
      ['Is there any coffee left? — I am afraid so.', 'Còn cà phê không? — E là hết rồi.', 0, 'Sai: sửa thành "I am afraid not."']
    ],
    practice: [
      ['I ___ (am afraid / am scared) we are closed for the day.', 'am afraid', 'E là hôm nay chúng tôi đóng cửa rồi ạ.'],
      ['___ (Unfortunately / Luckily), the train has been cancelled.', 'Unfortunately', 'Rất tiếc, chuyến tàu đã bị huỷ.'],
      ['Is there any coffee left? — I am afraid ___ (not / so).', 'not', 'Còn cà phê không? — E là hết rồi.'],
      ['Do we have to pay extra? — I am afraid ___ (so / not).', 'so', 'Chúng tôi phải trả thêm à? — E là đúng vậy.'],
      ['"I am afraid" here has nothing to do with ___ (fear / news).', 'fear', 'Cụm "I am afraid" ở đây không liên quan gì tới nỗi sợ.'],
      ['___ (Unfortunately / Fortunately), we cannot meet the deadline.', 'Unfortunately', 'Rất tiếc, chúng tôi không kịp hạn.'],
      ['I am ___ (sorry / afraid so), but there are no seats left.', 'sorry', 'Tôi xin lỗi, nhưng hết chỗ mất rồi.'],
      ['For good news use ___ (Luckily / Unfortunately).', 'Luckily', 'Tin vui thì dùng "Luckily".'],
      ['I am afraid the manager ___ (is not / is not being) available today.', 'is not', 'E là hôm nay quản lý không có mặt.'],
      ['Will it rain? — I am afraid ___ (so / not), the forecast is bad.', 'so', 'Trời sẽ mưa chứ? — E là có, dự báo xấu lắm.']
    ]
  },

  /* ==================== B1 ==================== */

  {
    slug: 'indirect-questions',
    en: 'Indirect questions',
    vi: 'Câu hỏi gián tiếp — Do you know where the station is?',
    level: 'B1',
    summary: 'Bọc câu hỏi vào một khung mở đầu cho nhã. Điều bắt buộc: phần bên trong TRẢ VỀ TRẬT TỰ CÂU KỂ, không đảo, không "do".',
    formula: {
      rows: [
        ['Khung mở đầu', 'Do you know… / Could you tell me… / I was wondering…'],
        ['Bên trong: trật tự câu kể', 'Do you know WHERE THE STATION IS? — không phải "where is the station".'],
        ['Bỏ do, does, did', 'Could you tell me WHAT TIME IT STARTS? — không phải "what time does it start".'],
        ['Câu hỏi có / không → if hoặc whether', 'Do you know IF he is coming?']
      ],
      note: 'Đây là lỗi bậc B1 phổ biến nhất của cả khu này: người học bê nguyên trật tự câu hỏi vào bên trong. Nhớ một câu: hỏi thẳng thì đảo, hỏi vòng thì không đảo. Cùng cơ chế với câu hỏi tường thuật ở nhóm bị động - tường thuật.'
    },
    signals: ['Do you know…', 'Could you tell me…', 'I was wondering…', 'Would you mind telling me…'],
    useWhen: [
      'Hỏi người lạ: "Excuse me, do you know where the station is?"',
      'Hỏi trong môi trường công việc, hoặc hỏi người trên.',
      'Phần Nói của kỳ thi: câu hỏi vòng nghe chỉn chu hơn hẳn câu hỏi thẳng.'
    ],
    useNot: [
      { what: 'Không giữ trật tự đảo bên trong.', why: '"Do you know where is the station?" sai. Bên trong là trật tự câu kể: "where the station is".' },
      { what: 'Không giữ "do", "does", "did" bên trong.', why: '"Could you tell me what time does it start?" sai. Bỏ "does" đi: "what time it starts".' }
    ],
    confuse: [
      {
        with: 'hỏi thẳng khác hỏi vòng',
        tell: 'Hỏi thẳng thì đảo trợ động từ. Hỏi vòng thì phần bên trong giữ trật tự câu kể.',
        pair: [
          { en: 'Where is the station?', vi: 'Ga ở đâu? (hỏi thẳng, có đảo).' },
          { en: 'Do you know where the station is?', vi: 'Bạn có biết ga ở đâu không? (hỏi vòng, không đảo).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Do you know where is the station?', right: 'Do you know where the station is?', why: 'Phần bên trong câu hỏi gián tiếp giữ trật tự câu kể.' },
      { wrong: 'Could you tell me what time does it start?', right: 'Could you tell me what time it starts?', why: 'Bỏ "does" và chia động từ trực tiếp.' }
    ],
    examples: [
      ['Do you know where the station is?', 'Bạn có biết ga ở đâu không?', 1, 'Bên trong là "the station is", không đảo.'],
      ['Could you tell me what time it starts?', 'Bạn cho tôi hỏi mấy giờ bắt đầu ạ?', 1, 'Bỏ "does", chia thẳng "starts".'],
      ['I was wondering if you could help me.', 'Không biết bạn có giúp tôi được không.', 1, 'Khung mở đầu rất nhã, hợp cả email công việc.'],
      ['Do you know if he is coming tonight?', 'Bạn có biết tối nay anh ấy có tới không?', 1, 'Câu hỏi có hoặc không thì dùng "if".'],
      ['Do you know where is the station?', 'Bạn có biết ga ở đâu không?', 0, 'Sai: sửa thành "Do you know where the station is?"'],
      ['Could you tell me what time does it start?', 'Bạn cho tôi hỏi mấy giờ bắt đầu ạ?', 0, 'Sai: sửa thành "Could you tell me what time it starts?"']
    ],
    practice: [
      ['Do you know where ___ (the station is / is the station)?', 'the station is', 'Bạn có biết ga ở đâu không?'],
      ['Could you tell me what time ___ (it starts / does it start)?', 'it starts', 'Bạn cho tôi hỏi mấy giờ bắt đầu ạ?'],
      ['I was wondering ___ (if / that) you could help me.', 'if', 'Không biết bạn có giúp tôi được không.'],
      ['Do you know ___ (if he is / is he) coming tonight?', 'if he is', 'Bạn có biết tối nay anh ấy có tới không?'],
      ['Inside an indirect question the word order is that of a ___ (statement / question).', 'statement', 'Bên trong câu hỏi gián tiếp là trật tự câu kể.'],
      ['Could you tell me how much ___ (it costs / does it cost)?', 'it costs', 'Bạn cho tôi hỏi cái này giá bao nhiêu?'],
      ['Do you know why ___ (she left / did she leave) so early?', 'she left', 'Bạn có biết sao cô ấy về sớm thế không?'],
      ['I wonder ___ (whether / that) the shop is still open.', 'whether', 'Không biết cửa hàng còn mở không.'],
      ['Would you mind telling me where ___ (you bought / did you buy) it?', 'you bought', 'Bạn cho tôi hỏi mua ở đâu vậy?'],
      ['Do you know how ___ (this works / does this work)?', 'this works', 'Bạn có biết cái này hoạt động thế nào không?']
    ]
  },

  {
    slug: 'question-tags',
    en: 'Question tags',
    vi: 'Câu hỏi đuôi — It is cold, isn\'t it?',
    level: 'B1',
    summary: 'Thêm một mẩu câu hỏi vào cuối để tìm sự đồng tình hoặc làm mềm lời. Hai luật: trợ động từ phải khớp, và cực tính phải đảo.',
    formula: {
      rows: [
        ['Khẳng định → đuôi phủ định', 'It IS cold, ISN\'T IT?'],
        ['Phủ định → đuôi khẳng định', 'You DON\'T smoke, DO YOU?'],
        ['Trợ động từ phải khớp', 'You WENT, DIDN\'T you? · She CAN swim, CAN\'T she?'],
        ['Ngoại lệ', 'I AM late, AREN\'T I? · Let us go, SHALL WE? · Sit down, WILL YOU?']
      ],
      note: 'Ngoài hình thức còn có chức năng: hạ giọng ở đuôi là đang tìm đồng tình, chứ không thật sự hỏi; lên giọng mới là hỏi thật. Câu hỏi đuôi cũng dùng để nhờ vả cho nhẹ: "You could not lend me a pen, could you?" nghe dễ từ chối hơn hẳn lời nhờ thẳng.'
    },
    signals: ['isn\'t it', 'don\'t you', 'didn\'t he', 'aren\'t I', 'shall we'],
    useWhen: [
      'Bắt chuyện và tìm điểm chung: "Lovely day, isn\'t it?"',
      'Kiểm tra lại thông tin mình tưởng là đúng.',
      'Nhờ vả nhẹ nhàng, chừa đường cho người kia từ chối.'
    ],
    useNot: [
      { what: 'Không lặp lại cực tính của mệnh đề chính.', why: '"It is cold, is it?" nghe như đang nghi ngờ hoặc mỉa. Khẳng định thì đuôi phải phủ định.' },
      { what: 'Không dùng "amn\'t I".', why: 'Dạng đó không tồn tại trong tiếng Anh chuẩn. Với "I am" thì đuôi là "aren\'t I?".' }
    ],
    confuse: [
      {
        with: 'đuôi tìm đồng tình khác đuôi hỏi thật',
        tell: 'Nghe ngữ điệu: hạ giọng là tìm đồng tình, lên giọng là hỏi thật vì chưa chắc.',
        pair: [
          { en: 'Lovely day, isn\'t it?', vi: 'Hôm nay đẹp trời nhỉ? (tìm đồng tình, không thật sự hỏi).' },
          { en: 'You locked the door, didn\'t you?', vi: 'Cậu khoá cửa rồi đúng không? (hỏi thật, chưa chắc chắn).' }
        ]
      }
    ],
    errors: [
      { wrong: 'You went to the meeting, didn\'t you went?', right: 'You went to the meeting, didn\'t you?', why: 'Đuôi chỉ có trợ động từ và đại từ, không lặp lại động từ chính.' },
      { wrong: 'I am late, amn\'t I?', right: 'I am late, aren\'t I?', why: 'Tiếng Anh chuẩn không có "amn\'t"; dạng đúng là "aren\'t I".' }
    ],
    examples: [
      ['It is cold today, isn\'t it?', 'Hôm nay lạnh nhỉ?', 1, 'Khẳng định thì đuôi phủ định.'],
      ['You don\'t smoke, do you?', 'Bạn không hút thuốc đúng không?', 1, 'Phủ định thì đuôi khẳng định.'],
      ['She can swim, can\'t she?', 'Cô ấy biết bơi mà nhỉ?', 1, 'Trợ động từ "can" khớp ở cả hai vế.'],
      ['I am late, aren\'t I?', 'Tôi tới muộn rồi phải không?', 1, 'Ngoại lệ cố định của "I am".'],
      ['You went to the meeting, didn\'t you went?', 'Cậu có dự họp đúng không?', 0, 'Sai: sửa thành "You went to the meeting, didn\'t you?"'],
      ['I am late, amn\'t I?', 'Tôi tới muộn rồi phải không?', 0, 'Sai: sửa thành "I am late, aren\'t I?"']
    ],
    practice: [
      ['It is cold today, ___ (isn\'t it / is it)?', 'isn\'t it', 'Hôm nay lạnh nhỉ?'],
      ['You don\'t smoke, ___ (do you / don\'t you)?', 'do you', 'Bạn không hút thuốc đúng không?'],
      ['She can swim, ___ (can\'t she / doesn\'t she)?', 'can\'t she', 'Cô ấy biết bơi mà nhỉ?'],
      ['I am late, ___ (aren\'t I / amn\'t I)?', 'aren\'t I', 'Tôi tới muộn rồi phải không?'],
      ['You went to the meeting, ___ (didn\'t you / didn\'t you go)?', 'didn\'t you', 'Cậu có dự họp đúng không?'],
      ['Let us go home, ___ (shall we / will we)?', 'shall we', 'Về nhà thôi nhỉ?'],
      ['Sit down, ___ (will you / do you)?', 'will you', 'Ngồi xuống đi nào.'],
      ['A positive statement takes a ___ (negative / positive) tag.', 'negative', 'Mệnh đề khẳng định thì đuôi phủ định.'],
      ['They have finished, ___ (haven\'t they / didn\'t they)?', 'haven\'t they', 'Họ xong rồi đúng không?'],
      ['Falling intonation means the speaker wants ___ (agreement / information).', 'agreement', 'Hạ giọng ở đuôi nghĩa là người nói đang tìm sự đồng tình.']
    ]
  },

  {
    slug: 'quite-rather-fairly',
    en: 'quite, rather, fairly, pretty',
    vi: 'Mức độ vừa phải — quite, rather, fairly, pretty',
    level: 'B1',
    summary: 'Bốn từ cùng nghĩa "khá" nhưng sắc thái khác nhau. Riêng "quite" còn đổi nghĩa hẳn tuỳ tính từ đi cùng.',
    formula: {
      rows: [
        ['fairly — nhẹ và trung tính', 'The test was FAIRLY easy.'],
        ['quite — khá, mức vừa', 'The film was QUITE good.'],
        ['quite + tính từ tuyệt đối = hoàn toàn', 'You are QUITE right. / That is QUITE impossible.'],
        ['rather — hơn mức mong đợi', 'It is RATHER expensive. (đắt hơn tôi tưởng)'],
        ['pretty — thân mật', 'It was PRETTY good. — nói được, viết trang trọng thì không.']
      ],
      note: 'Bẫy lớn nhất là "quite": đi với tính từ có thang độ (good, cold, tired) thì nghĩa là "khá", nhưng đi với tính từ tuyệt đối không có thang độ (right, impossible, perfect, sure) thì nghĩa là "hoàn toàn". "Quite right" là hoàn toàn đúng chứ không phải khá đúng.'
    },
    signals: ['fairly', 'quite', 'rather', 'pretty', 'mức độ vừa phải'],
    useWhen: [
      'Đánh giá vừa phải, không cực đoan — rất hợp giọng tiếng Anh đời thường.',
      '"rather" khi muốn ngụ ý điều gì đó vượt mức mong đợi.',
      '"fairly" trong văn viết trung tính; "pretty" chỉ dùng khi nói chuyện.'
    ],
    useNot: [
      { what: 'Không hiểu "quite right" là "khá đúng".', why: 'Đi với tính từ tuyệt đối thì "quite" nghĩa là hoàn toàn: "You are quite right" là bạn hoàn toàn đúng.' },
      { what: 'Không dùng "pretty" trong bài viết trang trọng.', why: 'Từ này thuộc văn nói. Bài luận thì dùng "fairly" hoặc "relatively".' }
    ],
    confuse: [
      {
        with: '"quite" với tính từ thang độ khác tính từ tuyệt đối',
        tell: 'Tính từ có thể thêm "very" được thì "quite" nghĩa là khá. Không thêm "very" được thì "quite" nghĩa là hoàn toàn.',
        pair: [
          { en: 'The film was quite good.', vi: 'Bộ phim khá hay (mức vừa phải).' },
          { en: 'You are quite right.', vi: 'Bạn hoàn toàn đúng (tuyệt đối, không phải khá đúng).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The essay was pretty good, and the argument was pretty convincing.', right: 'The essay was fairly good, and the argument was fairly convincing.', why: '"pretty" thuộc văn nói, không hợp bài viết trang trọng.' },
      { wrong: 'I am quite sure but not completely.', right: 'I am fairly sure but not completely.', why: '"quite sure" nghĩa là hoàn toàn chắc, mâu thuẫn với vế sau.' }
    ],
    examples: [
      ['The test was fairly easy.', 'Bài kiểm tra khá dễ.', 1, '"fairly" nhẹ và trung tính, hợp cả văn viết.'],
      ['The film was quite good.', 'Bộ phim khá hay.', 1, '"quite" với tính từ có thang độ nghĩa là mức vừa phải.'],
      ['You are quite right about that.', 'Bạn hoàn toàn đúng về chuyện đó.', 1, '"quite" với tính từ tuyệt đối nghĩa là hoàn toàn.'],
      ['It is rather expensive for what it is.', 'So với chất lượng thì hơi đắt.', 1, '"rather" ngụ ý vượt mức mong đợi.'],
      ['The essay was pretty good and pretty convincing.', 'Bài luận khá tốt và khá thuyết phục.', 0, 'Sai văn phong: sửa thành "fairly good and fairly convincing".'],
      ['I am quite sure but not completely.', 'Tôi khá chắc nhưng chưa hoàn toàn.', 0, 'Sai: "quite sure" là hoàn toàn chắc, sửa thành "I am fairly sure but not completely."']
    ],
    practice: [
      ['The test was ___ (fairly / quite) easy — nothing surprising.', 'fairly', 'Bài kiểm tra khá dễ, không có gì bất ngờ.'],
      ['You are ___ (quite / fairly) right — completely correct.', 'quite', 'Bạn hoàn toàn đúng.'],
      ['It is ___ (rather / fairly) expensive, more than I expected.', 'rather', 'Hơi đắt, đắt hơn tôi tưởng.'],
      ['In formal writing avoid ___ (pretty / fairly).', 'pretty', 'Trong văn viết trang trọng thì tránh dùng "pretty".'],
      ['"Quite impossible" means ___ (completely impossible / fairly impossible).', 'completely impossible', 'Cụm "quite impossible" nghĩa là hoàn toàn không thể.'],
      ['I am ___ (fairly / quite) sure, but not completely.', 'fairly', 'Tôi khá chắc, nhưng chưa hoàn toàn.'],
      ['The room was ___ (rather / quite) cold, colder than we wanted.', 'rather', 'Phòng hơi lạnh, lạnh hơn mức chúng tôi muốn.'],
      ['With absolute adjectives, "quite" means ___ (completely / fairly).', 'completely', 'Với tính từ tuyệt đối, "quite" nghĩa là hoàn toàn.'],
      ['The results were ___ (fairly / pretty) consistent across both groups.', 'fairly', 'Kết quả khá nhất quán ở cả hai nhóm.'],
      ['That is ___ (quite / fairly) impossible — it cannot be done.', 'quite', 'Chuyện đó hoàn toàn không thể làm được.']
    ]
  },

  {
    slug: 'vague-language',
    en: 'Vague language',
    vi: 'Nói ước chừng — about, or so, kind of, -ish',
    level: 'B1',
    summary: 'Nói con số và mô tả một cách ước chừng cho tự nhiên. Người bản ngữ ít khi nói chính xác tuyệt đối trong chuyện thường ngày.',
    formula: {
      rows: [
        ['Con số ước chừng', 'ABOUT / AROUND / ROUGHLY twenty people'],
        ['or so — chừng đó', 'Twenty OR SO people came.'],
        ['kind of, sort of — làm mềm', 'It was KIND OF strange.'],
        ['-ish — khoảng chừng', 'See you at seven-ISH. / a greenISH colour'],
        ['Kết thúc mở', '…and things like that · …or something']
      ],
      note: 'Toàn bộ nhóm này thuộc văn nói. Trong bài Viết học thuật thì đổi hết sang bản chính xác: "approximately", "an estimated", "somewhat". Viết "about twenty or so participants" trong báo cáo nghiên cứu là hỏng văn phong ngay.'
    },
    signals: ['about', 'around', 'or so', 'kind of', 'sort of', '-ish', 'or something'],
    useWhen: [
      'Nói chuyện đời thường: nói chính xác quá nghe cứng và có vẻ khoe.',
      'Khi mình thật sự không nhớ chính xác con số.',
      'Làm mềm một nhận xét: "It was kind of disappointing."'
    ],
    useNot: [
      { what: 'Không dùng trong bài viết học thuật.', why: '"about twenty or so" trong báo cáo là hỏng văn phong. Viết "approximately twenty" hoặc nêu con số chính xác.' },
      { what: 'Không chồng nhiều từ ước chừng lên nhau.', why: '"about around twenty or so" thừa. Chọn một cách là đủ.' }
    ],
    confuse: [
      {
        with: 'ước chừng đời thường khác ước chừng học thuật',
        tell: 'Nói chuyện thì "about", "or so". Viết báo cáo thì "approximately", "an estimated".',
        pair: [
          { en: 'About twenty or so people turned up.', vi: 'Chừng hai chục người tới (văn nói).' },
          { en: 'Approximately twenty participants attended.', vi: 'Khoảng hai mươi người tham dự (văn học thuật).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The study included about thirty or so participants.', right: 'The study included approximately thirty participants.', why: 'Báo cáo nghiên cứu không dùng lối ước chừng đời thường.' },
      { wrong: 'There were about around twenty people.', right: 'There were about twenty people.', why: 'Chồng hai từ ước chừng lên nhau là thừa.' }
    ],
    examples: [
      ['About twenty people came to the meeting.', 'Chừng hai chục người tới họp.', 1, '"about" là cách ước chừng thông dụng nhất.'],
      ['See you at seven-ish.', 'Hẹn gặp lúc bảy giờ gì đó nhé.', 1, 'Hậu tố "-ish" rất tự nhiên trong văn nói.'],
      ['It was kind of strange, to be honest.', 'Thật ra thì hơi kỳ kỳ.', 1, '"kind of" làm mềm một nhận xét.'],
      ['Approximately thirty participants attended.', 'Khoảng ba mươi người tham dự.', 1, 'Bản học thuật của cùng một ý.'],
      ['The study included about thirty or so participants.', 'Nghiên cứu có chừng ba chục người tham dự.', 0, 'Sai văn phong: sửa thành "The study included approximately thirty participants."'],
      ['There were about around twenty people.', 'Có chừng hai chục người.', 0, 'Sai: sửa thành "There were about twenty people."']
    ],
    practice: [
      ['___ (About / Approximately) twenty people came, I think.', 'About', 'Chừng hai chục người tới, tôi nghĩ vậy.'],
      ['The study included ___ (approximately / about or so) thirty participants.', 'approximately', 'Nghiên cứu có khoảng ba mươi người tham dự.'],
      ['See you at ___ (seven-ish / seven about).', 'seven-ish', 'Hẹn gặp lúc bảy giờ gì đó nhé.'],
      ['It was ___ (kind of / kind) strange, to be honest.', 'kind of', 'Thật ra thì hơi kỳ kỳ.'],
      ['Twenty ___ (or so / or something) people turned up.', 'or so', 'Chừng hai chục người tới.'],
      ['Vague language belongs to ___ (speech / academic writing).', 'speech', 'Lối nói ước chừng thuộc văn nói.'],
      ['There were ___ (about / about around) twenty people.', 'about', 'Có chừng hai chục người.'],
      ['The wall was a ___ (greenish / green-ish of) colour.', 'greenish', 'Bức tường màu xanh xanh.'],
      ['In a report, write ___ (an estimated / like) 200 households.', 'an estimated', 'Trong báo cáo thì viết "an estimated 200 households".'],
      ['We need pens, paper and things like ___ (that / this).', 'that', 'Chúng ta cần bút, giấy và mấy thứ đại loại vậy.']
    ]
  },

  /* ==================== B2 ==================== */

  {
    slug: 'formality-contractions',
    en: 'Contractions and written register',
    vi: 'Viết tắt và độ trang trọng của văn bản',
    level: 'B2',
    summary: 'Viết tắt không sai ngữ pháp, chỉ là dấu hiệu văn phong. Vấn đề thật sự là trộn lẫn hai giọng trong cùng một bài.',
    formula: {
      rows: [
        ['Văn nói và thư thân mật', 'don\'t · it\'s · we\'ll · can\'t'],
        ['Bài luận và báo cáo', 'do not · it is · we will · cannot'],
        ['Kèm theo đó', 'tránh "you" chung chung, tránh cụm động từ quá thân mật'],
        ['Nhất quán là quan trọng nhất', 'Đã chọn giọng nào thì giữ giọng đó suốt bài.']
      ],
      note: 'Đừng nghĩ viết tắt là sai. Trong email công việc thường ngày, viết đầy đủ hết lại nghe xa cách. Điều người chấm để ý là sự NHẤT QUÁN: một bài luận nửa trang trọng nửa buông thả thì mất điểm nhiều hơn hẳn một bài trang trọng đều.'
    },
    signals: ['don\'t khác do not', 'it\'s khác it is', 'giọng văn nhất quán'],
    useWhen: [
      'Bài luận, báo cáo, thư xin việc: viết đầy đủ.',
      'Email trao đổi hằng ngày, tin nhắn công việc: viết tắt là bình thường.',
      'Trích lời nói trực tiếp trong bài viết: giữ nguyên bản viết tắt.'
    ],
    useNot: [
      { what: 'Không trộn hai giọng trong cùng một bài.', why: '"The data do not support this. It\'s clear that…" — nửa nọ nửa kia. Chọn một giọng rồi giữ đều.' },
      { what: 'Không viết đầy đủ hết trong email thân mật.', why: '"I do not think we will be able to" trong tin nhắn cho đồng nghiệp nghe lạnh và xa cách.' }
    ],
    confuse: [
      {
        with: 'viết tắt khác sai ngữ pháp',
        tell: 'Viết tắt luôn đúng ngữ pháp. Chỉ là chọn sai văn cảnh thì lệch giọng.',
        pair: [
          { en: 'The results do not support the hypothesis.', vi: 'Kết quả không ủng hộ giả thuyết (bài luận).' },
          { en: 'I don\'t think we can finish today.', vi: 'Tôi nghĩ hôm nay mình không xong đâu (email thường ngày).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The data do not support this. It\'s clear that more research is needed.', right: 'The data do not support this. It is clear that more research is needed.', why: 'Trộn hai giọng trong hai câu liền nhau.' },
      { wrong: 'Dear Sir, I don\'t think your product is up to scratch.', right: 'Dear Sir, I do not think your product meets the advertised standard.', why: 'Thư khiếu nại trang trọng thì viết đầy đủ và tránh cụm quá thân mật.' }
    ],
    examples: [
      ['The results do not support the hypothesis.', 'Kết quả không ủng hộ giả thuyết.', 1, 'Bài luận thì viết đầy đủ.'],
      ['I don\'t think we can finish today.', 'Tôi nghĩ hôm nay mình không xong đâu.', 1, 'Email thường ngày thì viết tắt là bình thường.'],
      ['He said, "I can\'t come tomorrow."', 'Anh ấy nói: "Mai tôi không tới được."', 1, 'Trích lời nói trực tiếp thì giữ nguyên bản viết tắt.'],
      ['It is clear that more research is needed.', 'Rõ ràng là cần nghiên cứu thêm.', 1, 'Giọng trang trọng, nhất quán với câu trước đó trong bài luận.'],
      ['The data do not support this. It\'s clear that more research is needed.', 'Dữ liệu không ủng hộ điều này. Rõ ràng là cần nghiên cứu thêm.', 0, 'Sai: trộn giọng, sửa "It\'s" thành "It is".'],
      ['Dear Sir, I don\'t think your product is up to scratch.', 'Kính gửi ông, tôi thấy sản phẩm của ông không đạt.', 0, 'Sai văn phong: sửa thành "Dear Sir, I do not think your product meets the advertised standard."']
    ],
    practice: [
      ['In an essay, write ___ (do not / don\'t) support the hypothesis.', 'do not', 'Trong bài luận thì viết "do not".'],
      ['In a quick email to a colleague, ___ (don\'t / do not) is fine.', 'don\'t', 'Trong email nhanh gửi đồng nghiệp thì viết tắt là bình thường.'],
      ['The biggest problem is mixing ___ (registers / tenses) in one text.', 'registers', 'Vấn đề lớn nhất là trộn lẫn hai giọng trong cùng một bài.'],
      ['He said, "I ___ (can\'t / cannot) come tomorrow."', 'can\'t', 'Anh ấy nói: "Mai tôi không tới được."'],
      ['___ (It is / It\'s) clear that more research is needed.', 'It is', 'Rõ ràng là cần nghiên cứu thêm.'],
      ['Contractions are ___ (informal / ungrammatical).', 'informal', 'Viết tắt là dấu hiệu thân mật, không phải sai ngữ pháp.'],
      ['A formal complaint letter uses ___ (do not / don\'t).', 'do not', 'Thư khiếu nại trang trọng thì viết "do not".'],
      ['Formal writing also avoids generic ___ (you / it).', 'you', 'Văn trang trọng cũng tránh dùng "you" chung chung.'],
      ['The report ___ (cannot / can\'t) be finished by Friday.', 'cannot', 'Báo cáo không thể xong trước thứ Sáu.'],
      ['Consistency matters ___ (more / less) than the choice itself.', 'more', 'Sự nhất quán quan trọng hơn việc chọn giọng nào.']
    ]
  },

  {
    slug: 'hedging-verbs',
    en: 'Hedging with seem, appear, tend to',
    vi: 'Rào đón bằng động từ — seem, appear, tend to',
    level: 'B2',
    summary: 'Hạ mức cam kết của một khẳng định mà không dùng tới khuyết thiếu. Đây là bộ công cụ chính của văn viết học thuật cẩn trọng.',
    formula: {
      rows: [
        ['seem + to-V hoặc mệnh đề', 'The results SEEM TO suggest a link. / IT SEEMS THAT the link is weak.'],
        ['appear — trang trọng hơn', 'The two groups APPEAR TO differ.'],
        ['tend to — xu hướng chung', 'Older learners TEND TO read more slowly.'],
        ['Kết hợp được nhiều lớp', 'The data seem to suggest that… (hai lớp rào đón)']
      ],
      note: '"tend to" là chỗ được việc nhất: nó cho phép nêu một quy luật chung mà không phải chịu trách nhiệm cho mọi trường hợp ngoại lệ. Nhưng đừng chồng quá nhiều lớp — "It would appear that the data may possibly seem to suggest" thì rào đón nhiều tới mức không còn nói gì nữa.'
    },
    signals: ['seem to', 'appear to', 'tend to', 'It seems that', 'look like'],
    useWhen: [
      'Bài Viết học thuật: nêu kết quả mà chưa dám khẳng định nhân quả.',
      'Nêu quy luật chung có ngoại lệ: "Students tend to underestimate the time needed."',
      'Nhận xét về người khác cho nhẹ: "He seems a little tired today."'
    ],
    useNot: [
      { what: 'Không chia "seem" ở thì tiếp diễn.', why: '"He is seeming tired" sai. "seem" là động từ trạng thái nên dùng "He seems tired".' },
      { what: 'Không chồng quá nhiều lớp rào đón.', why: '"It would appear that the data may possibly seem to suggest" rào tới mức câu không còn khẳng định gì. Hai lớp là đủ.' }
    ],
    confuse: [
      {
        with: '"seem to" khác "tend to"',
        tell: '"seem" là dựa trên vẻ bề ngoài lần này. "tend to" là quy luật lặp lại nhiều lần.',
        pair: [
          { en: 'The results seem to support the theory.', vi: 'Kết quả có vẻ ủng hộ lý thuyết (nhận định về lần này).' },
          { en: 'Older learners tend to read more slowly.', vi: 'Người học lớn tuổi thường đọc chậm hơn (quy luật chung).' }
        ]
      }
    ],
    errors: [
      { wrong: 'He is seeming rather tired today.', right: 'He seems rather tired today.', why: '"seem" là động từ trạng thái, không chia tiếp diễn.' },
      { wrong: 'The data tends to suggest that the effect is real.', right: 'The data tend to suggest that the effect is real.', why: 'Trong văn học thuật trang trọng, "data" được coi là số nhiều.' }
    ],
    examples: [
      ['The results seem to suggest a link between the two.', 'Kết quả có vẻ cho thấy hai yếu tố có liên hệ.', 1, 'Hai lớp rào đón: "seem" và "suggest".'],
      ['Older learners tend to read more slowly.', 'Người học lớn tuổi thường đọc chậm hơn.', 1, '"tend to" nêu quy luật chung mà chừa chỗ cho ngoại lệ.'],
      ['The two groups appear to differ in one respect only.', 'Hai nhóm có vẻ chỉ khác nhau ở một điểm.', 1, '"appear" trang trọng hơn "seem".'],
      ['It seems that nobody told him about the change.', 'Có vẻ như không ai báo cho anh ấy về thay đổi này.', 1, 'Mẫu "It seems that" đi với cả một mệnh đề.'],
      ['He is seeming rather tired today.', 'Hôm nay trông anh ấy hơi mệt.', 0, 'Sai: sửa thành "He seems rather tired today."'],
      ['The data tends to suggest that the effect is real.', 'Dữ liệu có vẻ cho thấy hiệu ứng là có thật.', 0, 'Sai: trong văn học thuật, sửa thành "The data tend to suggest…".']
    ],
    practice: [
      ['The results ___ (seem to / are seeming to) suggest a link.', 'seem to', 'Kết quả có vẻ cho thấy có liên hệ.'],
      ['Older learners ___ (tend to / seem to) read more slowly, as a general rule.', 'tend to', 'Theo quy luật chung, người học lớn tuổi thường đọc chậm hơn.'],
      ['He ___ (seems / is seeming) rather tired today.', 'seems', 'Hôm nay trông anh ấy hơi mệt.'],
      ['The two groups ___ (appear to / appear) differ in one respect.', 'appear to', 'Hai nhóm có vẻ khác nhau ở một điểm.'],
      ['___ (It seems that / It seems to be that) nobody told him.', 'It seems that', 'Có vẻ như không ai báo cho anh ấy.'],
      ['"Tend to" describes a ___ (general pattern / single event).', 'general pattern', 'Cụm "tend to" mô tả một quy luật chung.'],
      ['In academic style, the data ___ (tend / tends) to support this.', 'tend', 'Trong văn học thuật, "the data tend to support this".'],
      ['Two layers of hedging are ___ (enough / never enough).', 'enough', 'Hai lớp rào đón là đủ.'],
      ['Costs ___ (tend to / seem to) rise every January.', 'tend to', 'Chi phí thường tăng vào mỗi tháng Giêng.'],
      ['"Seem" is a ___ (stative / action) verb.', 'stative', 'Từ "seem" là động từ trạng thái.']
    ]
  },

  {
    slug: 'hedging-adverbs',
    en: 'Hedging adverbs',
    vi: 'Trạng từ rào đón — possibly, apparently, arguably, presumably',
    level: 'B2',
    summary: 'Một trạng từ đủ hạ mức cam kết của cả câu. Mỗi từ hạ theo một kiểu riêng: chưa chắc, nghe nói, có thể lập luận, đoán là.',
    formula: {
      rows: [
        ['possibly, perhaps — chưa chắc', 'The delay was POSSIBLY caused by the weather.'],
        ['apparently — nghe nói, chưa kiểm chứng', 'APPARENTLY the office is closing.'],
        ['arguably — có thể lập luận rằng', 'This is ARGUABLY the best solution.'],
        ['presumably — đoán theo lẽ thường', 'They are PRESUMABLY still waiting.'],
        ['Vị trí', 'Đầu câu, giữa câu trước động từ chính, hoặc sau "be".']
      ],
      note: 'Chú ý "apparently": nó KHÔNG có nghĩa "rõ ràng" mà là "nghe nói, theo như người ta bảo" — người nói đang giữ khoảng cách với thông tin. Còn "arguably" rất được việc trong bài Viết: nó cho phép đưa ra một khẳng định mạnh mà vẫn thừa nhận có thể tranh luận.'
    },
    signals: ['possibly', 'perhaps', 'apparently', 'arguably', 'presumably', 'seemingly'],
    useWhen: [
      'Bài Viết: đưa nhận định mạnh mà vẫn chừa đường lùi — "arguably the most important factor".',
      'Thuật lại tin chưa kiểm chứng: "Apparently they have already signed."',
      'Suy đoán theo lẽ thường: "Presumably the shop is closed by now."'
    ],
    useNot: [
      { what: 'Không hiểu "apparently" là "rõ ràng".', why: '"Apparently the office is closing" nghĩa là nghe nói vậy, chứ không phải chuyện đã rõ ràng. Muốn nói rõ ràng thì dùng "clearly".' },
      { what: 'Không rắc trạng từ rào đón khắp bài.', why: 'Câu nào cũng "possibly", "perhaps" thì bài viết mất hết sức thuyết phục. Rào đón chỗ nào thật sự chưa chắc thôi.' }
    ],
    confuse: [
      {
        with: '"apparently" khác "clearly"',
        tell: '"apparently" là nghe nói, giữ khoảng cách. "clearly" là người viết cam kết đó là sự thật.',
        pair: [
          { en: 'Apparently the office is closing next month.', vi: 'Nghe nói tháng sau văn phòng đóng cửa (chưa kiểm chứng).' },
          { en: 'Clearly the office is closing next month.', vi: 'Rõ ràng tháng sau văn phòng đóng cửa (người viết chắc chắn).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The evidence is overwhelming, so apparently he is guilty.', right: 'The evidence is overwhelming, so clearly he is guilty.', why: 'Bằng chứng đã áp đảo thì không còn là chuyện nghe nói nữa.' },
      { wrong: 'This is arguable the best solution available.', right: 'This is arguably the best solution available.', why: 'Cần trạng từ "arguably", không phải tính từ "arguable".' }
    ],
    examples: [
      ['The delay was possibly caused by the weather.', 'Có thể sự chậm trễ là do thời tiết.', 1, '"possibly" hạ mức cam kết xuống mức chưa chắc.'],
      ['Apparently the office is closing next month.', 'Nghe nói tháng sau văn phòng đóng cửa.', 1, '"apparently" giữ khoảng cách với nguồn tin.'],
      ['This is arguably the best solution available.', 'Đây có thể coi là giải pháp tốt nhất hiện có.', 1, 'Khẳng định mạnh mà vẫn thừa nhận có chỗ tranh luận.'],
      ['They are presumably still waiting for a reply.', 'Chắc là họ vẫn đang đợi hồi âm.', 1, '"presumably" là suy đoán theo lẽ thường.'],
      ['The evidence is overwhelming, so apparently he is guilty.', 'Bằng chứng quá rõ nên rõ ràng anh ta có tội.', 0, 'Sai: sửa thành "so clearly he is guilty."'],
      ['This is arguable the best solution available.', 'Đây có thể coi là giải pháp tốt nhất.', 0, 'Sai: sửa thành "This is arguably the best solution available."']
    ],
    practice: [
      ['The delay was ___ (possibly / clearly) caused by the weather, but we cannot be sure.', 'possibly', 'Có thể là do thời tiết, nhưng chưa chắc.'],
      ['___ (Apparently / Clearly) the office is closing — that is what I heard.', 'Apparently', 'Nghe nói văn phòng sắp đóng cửa.'],
      ['This is ___ (arguably / arguable) the best solution available.', 'arguably', 'Đây có thể coi là giải pháp tốt nhất hiện có.'],
      ['They are ___ (presumably / apparently) still waiting, as nobody has called.', 'presumably', 'Chắc là họ vẫn đang đợi, vì chưa ai gọi.'],
      ['"Apparently" means ___ (so I hear / it is obvious).', 'so I hear', 'Từ "apparently" nghĩa là "nghe nói vậy".'],
      ['The evidence is overwhelming, so ___ (clearly / apparently) he is guilty.', 'clearly', 'Bằng chứng quá rõ nên rõ ràng anh ta có tội.'],
      ['___ (Perhaps / Certainly) the sample was simply too small.', 'Perhaps', 'Có lẽ mẫu khảo sát đơn giản là quá nhỏ.'],
      ['Too many hedges make writing ___ (weak / precise).', 'weak', 'Rào đón quá nhiều làm bài viết mất sức thuyết phục.'],
      ['The policy was ___ (seemingly / seeming) effective at first.', 'seemingly', 'Ban đầu chính sách có vẻ hiệu quả.'],
      ['He is ___ (presumably / arguably) the most experienced person here.', 'arguably', 'Có thể coi ông ấy là người nhiều kinh nghiệm nhất ở đây.']
    ]
  },

  {
    slug: 'boosters',
    en: 'Boosters: clearly, undoubtedly, obviously',
    vi: 'Trạng từ tăng cam kết — clearly, undoubtedly, obviously',
    level: 'B2',
    summary: 'Ngược với rào đón: nâng mức cam kết lên. Nhưng dùng quá tay thì phản tác dụng, nhất là chữ "obviously".',
    formula: {
      rows: [
        ['clearly, evidently — có bằng chứng', 'The data CLEARLY show a downward trend.'],
        ['undoubtedly, certainly — chắc chắn', 'She is UNDOUBTEDLY the strongest candidate.'],
        ['indeed — xác nhận thêm', 'The task was INDEED harder than expected.'],
        ['Cân với rào đón', 'Bài viết tốt trộn cả hai, không nghiêng hẳn về bên nào.']
      ],
      note: 'Bẫy của "obviously": nói "Obviously, X" là ngầm bảo người đọc rằng đáng lẽ họ phải biết điều đó rồi, nghe kẻ cả. Trong bài Viết học thuật, tăng cam kết mà không kèm bằng chứng còn nguy hơn: người chấm sẽ hỏi ngay "rõ ràng ở chỗ nào?".'
    },
    signals: ['clearly', 'evidently', 'undoubtedly', 'certainly', 'obviously', 'without doubt'],
    useWhen: [
      'Sau khi đã đưa bằng chứng, chốt lại bằng một câu mạnh.',
      'Khẳng định điều thật sự không ai cãi được.',
      'Cân lại một đoạn rào đón quá nhiều, cho bài viết có sức nặng.'
    ],
    useNot: [
      { what: 'Không dùng "obviously" với người đọc chưa biết.', why: 'Nghe như chê người đọc chậm hiểu. Chỗ đó dùng "clearly" hoặc bỏ hẳn trạng từ.' },
      { what: 'Không tăng cam kết cho một khẳng định còn tranh cãi.', why: '"It is undoubtedly the best method" mà chưa có bằng chứng thì người chấm coi là khẳng định suông.' }
    ],
    confuse: [
      {
        with: 'tăng cam kết khác rào đón',
        tell: 'Tăng cam kết là nhận trách nhiệm về tính đúng sai. Rào đón là chừa đường lùi.',
        pair: [
          { en: 'The data clearly show a downward trend.', vi: 'Dữ liệu cho thấy rõ xu hướng đi xuống (cam kết cao).' },
          { en: 'The data possibly show a downward trend.', vi: 'Dữ liệu có thể cho thấy xu hướng đi xuống (rào đón).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Obviously, Vietnam has two main river deltas.', right: 'Vietnam has two main river deltas.', why: 'Người đọc chưa chắc đã biết; thêm "obviously" nghe kẻ cả mà không thêm thông tin gì.' },
      { wrong: 'It is undoubtedly the best method, although nobody has tested it.', right: 'It may well be the best method, although nobody has tested it.', why: 'Chưa ai kiểm chứng thì không thể tăng cam kết lên mức "undoubtedly".' }
    ],
    examples: [
      ['The data clearly show a downward trend.', 'Dữ liệu cho thấy rõ xu hướng đi xuống.', 1, 'Tăng cam kết sau khi đã có số liệu làm chứng.'],
      ['She is undoubtedly the strongest candidate.', 'Cô ấy chắc chắn là ứng viên mạnh nhất.', 1, 'Khẳng định dứt khoát, hợp khi đã nêu lý do.'],
      ['The task was indeed harder than expected.', 'Nhiệm vụ quả thật khó hơn dự tính.', 1, '"indeed" xác nhận thêm điều vừa nói.'],
      ['The data possibly show a downward trend.', 'Dữ liệu có thể cho thấy xu hướng đi xuống.', 1, 'Bản rào đón để đối chiếu — cùng câu, cam kết thấp hơn hẳn.'],
      ['Obviously, Vietnam has two main river deltas.', 'Rõ ràng Việt Nam có hai đồng bằng sông lớn.', 0, 'Hỏng sắc thái: bỏ "Obviously" đi, câu vừa gọn vừa không kẻ cả.'],
      ['It is undoubtedly the best method, although nobody has tested it.', 'Chắc chắn đây là phương pháp tốt nhất, dù chưa ai kiểm chứng.', 0, 'Sai: sửa thành "It may well be the best method, although nobody has tested it."']
    ],
    practice: [
      ['The data ___ (clearly / possibly) show a downward trend — the figures are unambiguous.', 'clearly', 'Dữ liệu cho thấy rõ xu hướng đi xuống, con số quá rõ ràng.'],
      ['She is ___ (undoubtedly / apparently) the strongest candidate, as everyone agrees.', 'undoubtedly', 'Cô ấy chắc chắn là ứng viên mạnh nhất, ai cũng đồng ý.'],
      ['Avoid ___ (obviously / clearly) when the reader may not know the fact.', 'obviously', 'Tránh dùng "obviously" khi người đọc có thể chưa biết.'],
      ['It ___ (may well be / is undoubtedly) the best method, although nobody has tested it.', 'may well be', 'Có thể đây là phương pháp tốt nhất, dù chưa ai kiểm chứng.'],
      ['Boosters ___ (raise / lower) the writer\'s commitment.', 'raise', 'Trạng từ tăng cường nâng mức cam kết của người viết.'],
      ['The task was ___ (indeed / arguably) harder than expected.', 'indeed', 'Nhiệm vụ quả thật khó hơn dự tính.'],
      ['Good academic writing ___ (balances / avoids) hedges and boosters.', 'balances', 'Bài viết học thuật tốt cân bằng giữa rào đón và tăng cường.'],
      ['The results are ___ (certainly / seemingly) consistent with earlier work.', 'certainly', 'Kết quả chắc chắn nhất quán với các nghiên cứu trước.'],
      ['Saying "obviously" can sound ___ (condescending / uncertain).', 'condescending', 'Nói "obviously" có thể nghe kẻ cả.'],
      ['Without evidence, a booster reads as an ___ (empty claim / accepted fact).', 'empty claim', 'Không có bằng chứng thì lời tăng cường thành khẳng định suông.']
    ]
  },

  {
    slug: 'formality-verb-pairs',
    en: 'Phrasal verbs versus formal single verbs',
    vi: 'Cụm động từ khác động từ trang trọng — find out / discover',
    level: 'B2',
    summary: 'Cùng một nghĩa, hai từ khác hẳn về giọng. Cụm động từ nghe đời thường; động từ gốc Latin một chữ nghe trang trọng.',
    formula: {
      rows: [
        ['Đời thường → trang trọng', 'find out → discover · put off → postpone'],
        ['', 'look into → investigate · carry out → conduct'],
        ['', 'go up → increase · cut down on → reduce · set up → establish'],
        ['Không phải luật cứng', 'Nhiều cụm động từ trung tính, dùng được cả trong bài viết.']
      ],
      note: 'Đừng đổi máy móc mọi cụm động từ sang từ Latin: bài viết toàn từ dài nghe cứng và giả tạo. Nguyên tắc thực tế là bỏ những cụm THẬT SỰ thân mật ("sort out", "get across", "come up with") khi viết trang trọng, còn những cụm đã trung tính ("point out", "carry out", "result in") thì cứ dùng bình thường.'
    },
    signals: ['find out khác discover', 'put off khác postpone', 'carry out khác conduct'],
    useWhen: [
      'Bài luận và báo cáo: chọn bản trang trọng cho những cụm quá thân mật.',
      'Thư xin việc và thư khiếu nại: giọng cần chỉn chu.',
      'Nói chuyện và email thường ngày: cụm động từ tự nhiên hơn nhiều.'
    ],
    useNot: [
      { what: 'Không đổi hết mọi cụm động từ sang từ Latin.', why: 'Bài viết toàn từ dài nghe cứng. "The study carried out an experiment" hoàn toàn ổn trong văn học thuật.' },
      { what: 'Không dùng cụm quá thân mật trong bài luận.', why: '"The government should sort out this problem" nghe như nói chuyện. Viết "should address this problem".' }
    ],
    confuse: [
      {
        with: 'cụm động từ thân mật khác cụm động từ trung tính',
        tell: 'Thử đọc to trong đầu như đang trình bày trước hội đồng. Nghe cợt nhả thì đổi; nghe bình thường thì giữ.',
        pair: [
          { en: 'The researchers carried out three experiments.', vi: 'Nhóm nghiên cứu đã tiến hành ba thí nghiệm (trung tính, dùng được).' },
          { en: 'The researchers sorted out three experiments.', vi: 'Nghe cợt nhả, không hợp văn học thuật.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The government should sort out this problem urgently.', right: 'The government should address this problem urgently.', why: '"sort out" quá thân mật cho văn nghị luận.' },
      { wrong: 'The company put off the launch, so we need to find out why.', right: 'The company postponed the launch, so we need to establish why.', why: 'Trong báo cáo trang trọng thì chọn bản một chữ.' }
    ],
    examples: [
      ['The company postponed the launch until March.', 'Công ty hoãn buổi ra mắt tới tháng Ba.', 1, 'Bản trang trọng của "put off".'],
      ['They put off the meeting again.', 'Họ lại hoãn cuộc họp.', 1, 'Bản đời thường, hoàn toàn tự nhiên khi nói chuyện.'],
      ['The researchers carried out three experiments.', 'Nhóm nghiên cứu đã tiến hành ba thí nghiệm.', 1, '"carry out" đã trung tính, dùng được cả trong bài học thuật.'],
      ['The committee will investigate the complaint.', 'Hội đồng sẽ điều tra khiếu nại này.', 1, 'Bản trang trọng của "look into".'],
      ['The government should sort out this problem urgently.', 'Chính phủ nên xử lý vấn đề này gấp.', 0, 'Sai văn phong: sửa thành "The government should address this problem urgently."'],
      ['We need to find out why the company put off the launch, as stated in the report.', 'Chúng ta cần tìm hiểu vì sao công ty hoãn buổi ra mắt, như nêu trong báo cáo.', 0, 'Lệch giọng trong văn bản trang trọng: sửa thành "We need to establish why the company postponed the launch, as stated in the report."']
    ],
    practice: [
      ['Formal for "put off": ___ (postpone / put away).', 'postpone', 'Bản trang trọng của "put off" là "postpone".'],
      ['Formal for "find out": ___ (discover / find in).', 'discover', 'Bản trang trọng của "find out" là "discover".'],
      ['Formal for "look into": ___ (investigate / look over).', 'investigate', 'Bản trang trọng của "look into" là "investigate".'],
      ['The government should ___ (address / sort out) this problem urgently.', 'address', 'Chính phủ nên xử lý vấn đề này gấp.'],
      ['"Carry out" is ___ (neutral / too informal) for academic writing.', 'neutral', 'Cụm "carry out" là trung tính, dùng được trong văn học thuật.'],
      ['Formal for "go up": ___ (increase / go over).', 'increase', 'Bản trang trọng của "go up" là "increase".'],
      ['Formal for "set up": ___ (establish / set off).', 'establish', 'Bản trang trọng của "set up" là "establish".'],
      ['Formal for "cut down on": ___ (reduce / cut off).', 'reduce', 'Bản trang trọng của "cut down on" là "reduce".'],
      ['Replacing every phrasal verb makes writing ___ (stiff / clear).', 'stiff', 'Đổi hết mọi cụm động từ làm bài viết cứng nhắc.'],
      ['In a quick email, ___ (put off / postpone) sounds natural.', 'put off', 'Trong email nhanh thì "put off" nghe tự nhiên.']
    ]
  },

  {
    slug: 'softening-negatives',
    en: 'Softening a no',
    vi: 'Từ chối và phủ định cho nhẹ — not really, not exactly',
    level: 'B2',
    summary: 'Nói "No" trống không nghe rất cộc trong tiếng Anh. Có cả một bộ cụm để từ chối mà vẫn giữ được không khí.',
    formula: {
      rows: [
        ['Thay cho "No"', 'NOT REALLY. / NOT EXACTLY. / NOT QUITE.'],
        ['Thay cho "You are wrong"', 'I AM NOT SURE THAT is right.'],
        ['Từ chối lời mời', 'I WOULD RATHER NOT, if you do not mind.'],
        ['Đính chính nhẹ', 'THAT IS NOT QUITE WHAT I meant.']
      ],
      note: 'Cơ chế chung là biến lời phủ định thẳng thành lời phủ định có mức độ: thay vì bác bỏ hoàn toàn thì chỉ nói "chưa hẳn". Người nghe hiểu đúng ý là không, nhưng không thấy bị dội. Trong môi trường công việc nói tiếng Anh, đây gần như là nếp bắt buộc.'
    },
    signals: ['not really', 'not exactly', 'not quite', 'I am not sure', 'I would rather not'],
    useWhen: [
      'Từ chối lời mời hoặc lời đề nghị mà không muốn làm mất lòng.',
      'Nói người khác sai mà vẫn giữ thể diện cho họ.',
      'Trả lời khách hàng hoặc người trên trong công việc.'
    ],
    useNot: [
      { what: 'Không trả lời cộc lốc bằng mỗi "No".', why: 'Trong tiếng Anh, "No." trống không nghe gắt hơn nhiều so với chữ "Không" trong tiếng Việt. Thêm một cụm giảm nhẹ là đủ.' },
      { what: 'Không giảm nhẹ tới mức người nghe không hiểu là bị từ chối.', why: 'Nhã quá thành mập mờ. "Not really" là đủ rõ; đừng vòng vo tới mức người kia tưởng mình đồng ý.' }
    ],
    confuse: [
      {
        with: '"not really" khác "not exactly"',
        tell: '"not really" là phủ định nhẹ đi. "not exactly" là gần đúng nhưng chưa chuẩn, thường kèm lời đính chính.',
        pair: [
          { en: 'Did you enjoy it? — Not really.', vi: 'Cậu có thích không? — Cũng không hẳn.' },
          { en: 'So he resigned? — Not exactly; he was moved to another team.', vi: 'Vậy là anh ta nghỉ việc? — Không hẳn, anh ta bị chuyển sang nhóm khác.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Do you like the design? — No.', right: 'Do you like the design? — Not really, to be honest.', why: 'Câu trả lời trống không nghe cộc; thêm một cụm giảm nhẹ là đủ nhã.' },
      { wrong: 'You are wrong about the deadline.', right: 'I am not sure that is right about the deadline.', why: 'Bác bỏ thẳng làm mất thể diện người nghe.' }
    ],
    examples: [
      ['Did you enjoy the film? — Not really.', 'Cậu có thích phim không? — Cũng không hẳn.', 1, '"Not really" thay cho một chữ "No" trống không.'],
      ['So he resigned? — Not exactly; he moved to another team.', 'Vậy là anh ta nghỉ việc? — Không hẳn, anh ta chuyển sang nhóm khác.', 1, '"Not exactly" mở đường cho lời đính chính.'],
      ['I am not sure that is right — let me check the file.', 'Tôi chưa chắc chỗ đó đúng, để tôi xem lại hồ sơ.', 1, 'Nhẹ hơn hẳn "You are wrong" mà ý vẫn rõ.'],
      ['I would rather not, if you do not mind.', 'Tôi xin phép không, nếu bạn không phiền.', 1, 'Từ chối lời mời mà vẫn giữ được không khí.'],
      ['Do you like the design? — No.', 'Cậu thấy thiết kế thế nào? — Không.', 0, 'Cộc: sửa thành "Not really, to be honest."'],
      ['You are wrong about the deadline.', 'Bạn nhầm về hạn nộp rồi.', 0, 'Cộc: sửa thành "I am not sure that is right about the deadline."']
    ],
    practice: [
      ['Did you enjoy the film? — ___ (Not really / No).', 'Not really', 'Cậu có thích phim không? — Cũng không hẳn.'],
      ['So he resigned? — ___ (Not exactly / Not really); he moved teams.', 'Not exactly', 'Vậy anh ta nghỉ việc? — Không hẳn, anh ta chuyển nhóm.'],
      ['___ (I am not sure that is / You are wrong that is) right — let me check.', 'I am not sure that is', 'Tôi chưa chắc chỗ đó đúng, để tôi xem lại.'],
      ['I would ___ (rather not / rather no), if you do not mind.', 'rather not', 'Tôi xin phép không, nếu bạn không phiền.'],
      ['A bare "No" in English sounds ___ (blunt / polite).', 'blunt', 'Một chữ "No" trống không nghe rất cộc.'],
      ['That is not ___ (quite / really) what I meant.', 'quite', 'Đó không hẳn là ý tôi.'],
      ['Is the room free? — ___ (I am afraid not / No it).', 'I am afraid not', 'Phòng còn trống không? — E là không ạ.'],
      ['Softening should still be ___ (clear / vague) enough to be understood.', 'clear', 'Giảm nhẹ vẫn phải đủ rõ để người nghe hiểu.'],
      ['Was it expensive? — ___ (Not particularly / Not any).', 'Not particularly', 'Có đắt không? — Cũng không đến nỗi.'],
      ['I see your point, but I ___ (am not convinced / am not convince).', 'am not convinced', 'Tôi hiểu ý bạn, nhưng tôi chưa bị thuyết phục.']
    ]
  },

  {
    slug: 'impersonal-distance',
    en: 'Impersonal one, generic you, and it-structures',
    vi: 'Nói phi ngôi để giữ khoảng cách — one, you chung chung, there is a tendency',
    level: 'B2',
    summary: 'Tách nhận định khỏi cá nhân mình. Ba cách: dùng "one" trang trọng, dùng "you" chung chung, hoặc chuyển hẳn thành cấu trúc phi ngôi.',
    formula: {
      rows: [
        ['one — trang trọng', 'ONE should always check the sources.'],
        ['you chung chung — đời thường', 'YOU have to book in advance these days.'],
        ['Cấu trúc phi ngôi — học thuật', 'THERE IS A TENDENCY to overstate the effect.'],
        ['', 'IT IS GENERALLY ACCEPTED THAT the method works.']
      ],
      note: 'Ba bản này khác nhau hẳn về giọng: "one" khá trang trọng và hơi kiểu cách nếu dùng nhiều; "you" chung chung thì tự nhiên khi nói nhưng không hợp bài luận; cấu trúc phi ngôi mới là bản chuẩn của văn học thuật. Điều tối kỵ là trộn: "One should check your sources" là lệch ngôi giữa chừng.'
    },
    signals: ['one should', 'you have to (chung chung)', 'there is a tendency', 'it is generally accepted'],
    useWhen: [
      'Bài Viết học thuật: nêu nhận định chung mà không quy về ý kiến cá nhân.',
      'Nội quy và hướng dẫn: "One must present identification at the desk."',
      'Nói chuyện đời thường thì "you" chung chung là tự nhiên nhất.'
    ],
    useNot: [
      { what: 'Không trộn "one" với "you" trong cùng một câu.', why: '"One should check your sources" lệch ngôi. Chọn một: "One should check one\'s sources" hoặc "You should check your sources".' },
      { what: 'Không dùng "you" chung chung trong bài luận.', why: '"You can see from the graph that…" nghe như nói chuyện. Viết "The graph shows that…".' }
    ],
    confuse: [
      {
        with: '"one" khác "you" chung chung',
        tell: 'Cùng nghĩa "người ta nói chung", chỉ khác giọng: "one" trang trọng, "you" đời thường.',
        pair: [
          { en: 'One should always check the sources.', vi: 'Người ta luôn nên kiểm tra nguồn (trang trọng).' },
          { en: 'You should always check the sources.', vi: 'Lúc nào cũng nên kiểm tra nguồn (đời thường).' }
        ]
      }
    ],
    errors: [
      { wrong: 'One should always check your sources carefully.', right: 'One should always check one\'s sources carefully.', why: 'Lệch ngôi giữa chừng; giữ nhất quán "one" hoặc chuyển hẳn sang "you".' },
      { wrong: 'You can see from the graph that sales fell sharply.', right: 'The graph shows that sales fell sharply.', why: 'Bài viết học thuật tránh "you" chung chung.' }
    ],
    examples: [
      ['One should always check the sources before citing them.', 'Người ta luôn nên kiểm tra nguồn trước khi trích dẫn.', 1, '"one" trang trọng, hợp nội quy và văn bản chính thức.'],
      ['You have to book in advance these days.', 'Dạo này phải đặt trước mới có chỗ.', 1, '"you" chung chung, rất tự nhiên khi nói chuyện.'],
      ['There is a tendency to overstate the effect.', 'Có xu hướng thổi phồng hiệu ứng này.', 1, 'Cấu trúc phi ngôi — bản chuẩn của văn học thuật.'],
      ['It is generally accepted that the method works.', 'Người ta nhìn chung chấp nhận rằng phương pháp này hiệu quả.', 1, 'Nêu quan điểm chung mà không quy cho ai.'],
      ['One should always check your sources carefully.', 'Người ta luôn nên kiểm tra nguồn cẩn thận.', 0, 'Sai: sửa thành "One should always check one\'s sources carefully."'],
      ['You can see from the graph that sales fell sharply.', 'Nhìn biểu đồ là thấy doanh số giảm mạnh.', 0, 'Sai văn phong: sửa thành "The graph shows that sales fell sharply."']
    ],
    practice: [
      ['One should always check ___ (one\'s / your) sources carefully.', 'one\'s', 'Người ta luôn nên kiểm tra nguồn của mình cẩn thận.'],
      ['In an essay, write ___ (The graph shows / You can see from the graph) that sales fell.', 'The graph shows', 'Trong bài luận thì viết "The graph shows that…".'],
      ['___ (There is a tendency / You tend) to overstate the effect.', 'There is a tendency', 'Có xu hướng thổi phồng hiệu ứng này.'],
      ['___ (It is generally accepted / We all know) that the method works.', 'It is generally accepted', 'Người ta nhìn chung chấp nhận rằng phương pháp này hiệu quả.'],
      ['"One" is ___ (formal / casual) in tone.', 'formal', 'Đại từ "one" mang giọng trang trọng.'],
      ['In conversation, generic ___ (you / one) sounds more natural.', 'you', 'Khi nói chuyện thì "you" chung chung tự nhiên hơn.'],
      ['Never mix ___ (one and you / one and we) in the same sentence.', 'one and you', 'Đừng trộn "one" với "you" trong cùng một câu.'],
      ['___ (It has been argued / I think) that the sample was too small.', 'It has been argued', 'Đã có lập luận cho rằng mẫu khảo sát quá nhỏ.'],
      ['One must present identification ___ (at the desk / at your desk).', 'at the desk', 'Phải xuất trình giấy tờ tại quầy.'],
      ['Impersonal structures separate the claim from the ___ (writer / reader).', 'writer', 'Cấu trúc phi ngôi tách nhận định khỏi người viết.']
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
