/**
 * Ngữ pháp — nhóm THÌ, phần PHỐI HỢP THÌ.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-tenses.js. Hạn mức nhóm "Thì" là 21 điểm
 * (docs/LEARNING.md mục 2: A1 4 · A2 4 · B1 4 · B2 4 · C1 3 · C2 2). Tệp kia
 * đã dùng 12 điểm cho 12 thì, phân bố A1 3 · A2 3 · B1 3 · B2 2 · C1 1 · C2 0.
 * Tệp này dùng nốt 9 điểm còn lại, đúng chỗ còn hụt:
 * A1 1 · A2 1 · B1 1 · B2 2 · C1 2 · C2 2. Vậy là nhóm đủ 21/21.
 *
 * Khác biệt về nội dung: tệp kia dạy TỪNG THÌ MỘT. Tệp này dạy việc CHỌN VÀ
 * PHỐI HỢP nhiều thì trong một câu, một đoạn, một bài — chỗ người Việt sai
 * nhiều nhất mà sách ngữ pháp lại ít bàn tới, vì tiếng Việt không chia thì:
 * một chữ "đã" đứng đầu câu là phủ nghĩa quá khứ lên toàn bộ phần còn lại,
 * nên khi sang tiếng Anh người học chia vế đầu rồi bỏ quên vế sau.
 *
 * Ghi chú tránh trùng lặp với các nhóm khác:
 *   · Lùi thì trong câu tường thuật (say → said, will → would khi thuật lại
 *     lời người khác) thuộc nhóm "Bị động, tường thuật" — ở đây chỉ bàn việc
 *     phối hợp thì quanh một MỐC QUY CHIẾU, không dạy lại cách tường thuật.
 *   · Cấu trúc mệnh đề thời gian (when, before, after) thuộc nhóm "Mệnh đề" —
 *     ở đây chỉ bàn CHỌN THÌ nào cho hai vế.
 *   · "was to have + V3" thuộc nhóm khuyết thiếu, không nhắc lại.
 *   · Lùi thì để nói giảm, nói lịch sự thuộc nhóm "Sắc thái, trang trọng".
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A1 ==================== */
  {
    slug: 'tense-agreement-and',
    en: 'Keeping the same tense across "and" and "but"',
    vi: 'Hai vế nối bằng "and" hoặc "but" — phải chia thì cả hai vế',
    level: 'A1',
    summary: 'Tiếng Việt chỉ cần một dấu hiệu thời gian cho cả câu; tiếng Anh bắt mỗi động từ tự mang thì, nên vế sau cũng phải chia chứ không ăn theo vế trước.',
    formula: {
      rows: [
        ['Hai việc cùng mốc thời gian', 'S + V1(đã chia) + and + V2(CHIA GIỐNG V1): I GOT up and HAD breakfast.'],
        ['Cùng chủ ngữ thì lược chủ ngữ', 'She OPENED the door and WENT in. — không nhắc lại "she", nhưng động từ vẫn phải chia.'],
        ['Ngôi thứ ba số ít', 'He GETS up early and GOES to work. — cả hai động từ đều thêm -s.'],
        ['Khác mốc thời gian thì được khác thì', 'I LIVE in Hue now, but I WORKED in Hanoi last year.']
      ],
      note: 'Mẹo tự kiểm tra: che vế trước đi, đọc riêng vế sau thành một câu đầy đủ. "…and had breakfast" tách ra là "I had breakfast" — đọc thấy đúng thì câu ghép cũng đúng.'
    },
    signals: ['and', 'but', 'then', 'so', 'hai vế cùng một chủ ngữ'],
    useWhen: [
      'Hai việc xảy ra ở cùng một mốc thời gian trong một câu.',
      'Kể một chuỗi việc liền nhau: dậy, ăn sáng, đi làm.',
      'Nêu hai đặc điểm cùng đúng ở hiện tại.'
    ],
    useNot: [
      { what: 'Không bắt hai vế cùng thì khi chúng nói về hai mốc thời gian khác nhau.', why: '"I lived in Hue when I was a child, but now I live in Da Nang" — hai mốc khác nhau nên hai thì khác nhau mới đúng.' },
      { what: 'Không để động từ vế sau ở dạng nguyên thể chỉ vì "vế trước đã có thì rồi".', why: 'Tiếng Anh không cho một thì phủ lên cả câu. "She cooked dinner and wash the dishes" sai, phải là "washed".' }
    ],
    confuse: [
      {
        with: 'Câu có hai mốc thời gian khác nhau',
        tell: 'Cùng mốc thì cùng thì; khác mốc thì mỗi vế một thì. Nhìn trạng ngữ thời gian để biết có mấy mốc.',
        pair: [
          { en: 'He finished work and went home.', vi: 'Anh ấy làm xong rồi về nhà. (cùng một buổi tối — cùng quá khứ đơn)' },
          { en: 'He works in Hanoi now, but he studied in Hue.', vi: 'Giờ anh ấy làm ở Hà Nội, nhưng anh ấy từng học ở Huế. (hai mốc — hai thì)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I went to the market and buy some fish.', right: 'I went to the market and bought some fish.', why: 'Hai việc cùng xảy ra hôm qua nên vế sau cũng phải ở quá khứ đơn. Tiếng Việt chỉ cần một chữ "đã" cho cả câu nên người học hay bỏ quên vế sau.' },
      { wrong: 'She gets up early and go to school.', right: 'She gets up early and goes to school.', why: 'Chủ ngữ "she" chi phối cả hai động từ, nên động từ thứ hai cũng phải thêm -es.' }
    ],
    examples: [
      ['I got up at six and had breakfast with my family.', 'Tôi dậy lúc sáu giờ và ăn sáng cùng gia đình.', 1, 'Hai việc cùng buổi sáng hôm đó — cùng quá khứ đơn.'],
      ['She opens the shop at seven and closes it at nine.', 'Cô ấy mở cửa hàng lúc bảy giờ và đóng lúc chín giờ.', 1, 'Cùng một thói quen hiện tại — cả hai động từ đều thêm -s.'],
      ['We were tired but we finished the work.', 'Chúng tôi mệt nhưng vẫn làm xong việc.', 1, '"but" theo đúng luật như "and".'],
      ['He lives in Da Nang now, but he grew up in Hue.', 'Giờ anh ấy sống ở Đà Nẵng, nhưng anh ấy lớn lên ở Huế.', 1, 'Hai mốc thời gian khác nhau nên hai thì khác nhau.'],
      ['I went to the market and buy some fish.', 'Tôi ra chợ và mua ít cá.', 0, 'Sai: vế sau chưa chia thì. Sửa thành "I went to the market and bought some fish."'],
      ['She gets up early and go to school.', 'Cô ấy dậy sớm và đi học.', 0, 'Sai: thiếu -es ở "go". Sửa thành "She gets up early and goes to school."']
    ],
    practice: [
      ['Yesterday I cooked dinner and ___ (wash) the dishes.', 'washed', 'Hôm qua tôi nấu cơm rồi rửa bát.'],
      ['He wakes up at five and ___ (run) in the park.', 'runs', 'Anh ấy dậy lúc năm giờ và chạy bộ trong công viên.'],
      ['We watched a film and ___ (eat) popcorn.', 'ate', 'Chúng tôi xem phim và ăn bỏng ngô.'],
      ['She opened the box and ___ (find) a letter inside.', 'found', 'Cô ấy mở hộp ra và thấy một lá thư bên trong.'],
      ['My father reads the news and ___ (drink) coffee every morning.', 'drinks', 'Sáng nào bố tôi cũng đọc tin tức và uống cà phê.'],
      ['They were hungry but they ___ (not stop) for lunch.', 'did not stop', 'Họ đói nhưng không dừng lại ăn trưa.'],
      ['I live in Hanoi now, but I ___ (live) in Hue last year.', 'lived', 'Giờ tôi sống ở Hà Nội, nhưng năm ngoái tôi sống ở Huế.'],
      ['The bus stopped and everyone ___ (get) off.', 'got', 'Xe buýt dừng lại và mọi người xuống xe.'],
      ['She speaks English and ___ (teach) it at a primary school.', 'teaches', 'Cô ấy nói tiếng Anh và dạy tiếng Anh ở một trường tiểu học.'],
      ['We arrived late and ___ (miss) the first song.', 'missed', 'Chúng tôi đến muộn và lỡ mất bài hát đầu tiên.']
    ]
  },

  /* ==================== A2 ==================== */
  {
    slug: 'sequence-before-after',
    en: 'Tense after "before" and "after"',
    vi: 'Sau "before" và "after" — hai vế quá khứ đơn là đủ',
    level: 'A2',
    summary: 'Bản thân chữ "before" và "after" đã nói rõ việc nào trước việc nào, nên không cần thêm quá khứ hoàn thành để đánh dấu thứ tự một lần nữa.',
    formula: {
      rows: [
        ['Sau khi', 'AFTER + S + V(quá khứ đơn), S + V(quá khứ đơn): AFTER I FINISHED my homework, I WATCHED TV.'],
        ['Trước khi', 'BEFORE + S + V(quá khứ đơn), S + V(quá khứ đơn): BEFORE she LEFT, she LOCKED the door.'],
        ['Đảo thứ tự hai mệnh đề', 'I watched TV AFTER I finished my homework. — mệnh đề phụ đứng sau thì bỏ dấu phẩy.'],
        ['Quá khứ hoàn thành: có cũng được', 'After I HAD FINISHED my homework, I watched TV. — nghĩa không đổi, chỉ trang trọng hơn.']
      ],
      note: 'Vì sao được phép dùng quá khứ đơn cả hai vế: liên từ đã chỉ ra thứ tự rồi, không cần thì hoàn thành làm việc đó lần thứ hai. Khi câu KHÔNG có liên từ chỉ thứ tự thì mới cần đến quá khứ hoàn thành — xem điểm "Bộ ba thì kể chuyện quá khứ".'
    },
    signals: ['after', 'before', 'as soon as', 'then', 'first … then'],
    useWhen: [
      'Kể hai việc nối tiếp trong quá khứ, có "before" hoặc "after" nói rõ thứ tự.',
      'Viết tiểu sử, kể lại một ngày, thuật lại một sự kiện theo trình tự.',
      'Nói thứ tự các thao tác đã làm trong một hướng dẫn.'
    ],
    useNot: [
      { what: 'Không dùng "will" sau "before" và "after" khi nói về tương lai.', why: '"I will call you after I arrive", không phải "after I will arrive". Mệnh đề thời gian dùng hiện tại đơn, ý tương lai đã nằm ở mệnh đề chính.' },
      { what: 'Không đặt quá khứ hoàn thành ở CẢ HAI vế.', why: '"After I had finished, I had watched TV" sai. Chỉ vế xảy ra trước mới có thể dùng quá khứ hoàn thành; vế sau luôn là quá khứ đơn.' }
    ],
    confuse: [
      {
        with: 'Câu không có liên từ chỉ thứ tự',
        tell: 'Có "before"/"after" thì quá khứ đơn là đủ; không có liên từ thì phải nhờ quá khứ hoàn thành đánh dấu việc nào xảy ra trước.',
        pair: [
          { en: 'After the guests left, she cleaned the room.', vi: 'Sau khi khách về, cô ấy dọn phòng. (chữ "after" đã nói thứ tự)' },
          { en: 'When she got home, the guests had left.', vi: 'Khi cô ấy về đến nhà thì khách đã về rồi. (không có "after" nên cần quá khứ hoàn thành)' }
        ]
      }
    ],
    errors: [
      { wrong: 'After I will finish work, I will call you.', right: 'After I finish work, I will call you.', why: 'Mệnh đề thời gian không dùng "will"; ý tương lai đã do mệnh đề chính gánh.' },
      { wrong: 'Before she had left, she had locked the door.', right: 'Before she left, she locked the door.', why: 'Không đặt quá khứ hoàn thành ở cả hai vế. Đã có "before" thì quá khứ đơn là đủ.' }
    ],
    examples: [
      ['After I finished my homework, I watched a film.', 'Làm xong bài tập, tôi xem một bộ phim.', 1, '"after" đã nói rõ thứ tự nên hai vế đều quá khứ đơn.'],
      ['Before she left the house, she locked all the doors.', 'Trước khi ra khỏi nhà, cô ấy khoá hết cửa.', 1, 'Mệnh đề phụ đứng trước thì có dấu phẩy ngăn cách.'],
      ['We had dinner after the film ended.', 'Chúng tôi ăn tối sau khi phim kết thúc.', 1, 'Mệnh đề phụ đứng sau thì không cần dấu phẩy.'],
      ['After the guests had gone, she cleaned the room.', 'Sau khi khách về hết, cô ấy dọn phòng.', 1, 'Quá khứ hoàn thành ở vế trước cũng đúng — trang trọng hơn, nghĩa không đổi.'],
      ['After I will finish work, I will call you.', 'Xong việc tôi sẽ gọi cho bạn.', 0, 'Sai: mệnh đề thời gian không dùng "will". Sửa thành "After I finish work, I will call you."'],
      ['Before she had left, she had locked the door.', 'Trước khi đi, cô ấy đã khoá cửa.', 0, 'Sai: không dùng quá khứ hoàn thành ở cả hai vế. Sửa thành "Before she left, she locked the door."']
    ],
    practice: [
      ['After the rain ___ (stop), we went out.', 'stopped', 'Sau khi tạnh mưa, chúng tôi đi ra ngoài.'],
      ['Before the meeting ___ (start), he checked his notes.', 'started', 'Trước khi cuộc họp bắt đầu, anh ấy xem lại ghi chú.'],
      ['She washed her hands after she ___ (feed) the dog.', 'fed', 'Cô ấy rửa tay sau khi cho chó ăn.'],
      ['I will text you after I ___ (get) home.', 'get', 'Về đến nhà tôi sẽ nhắn cho bạn.'],
      ['After we ___ (pay) the bill, we left the restaurant.', 'paid', 'Sau khi thanh toán, chúng tôi rời nhà hàng.'],
      ['Before he ___ (buy) the phone, he read many reviews.', 'bought', 'Trước khi mua điện thoại, anh ấy đọc rất nhiều bài đánh giá.'],
      ['They cleaned the kitchen after the guests ___ (leave).', 'left', 'Họ dọn bếp sau khi khách về.'],
      ['We will not start before everyone ___ (arrive).', 'arrives', 'Chúng tôi sẽ không bắt đầu trước khi mọi người đến đủ.'],
      ['After she opened the letter, she ___ (call) her sister.', 'called', 'Sau khi mở thư, cô ấy gọi cho chị gái.'],
      ['He turned off the light before he ___ (go) to bed.', 'went', 'Anh ấy tắt đèn trước khi đi ngủ.']
    ]
  },

  /* ==================== B1 ==================== */
  {
    slug: 'narrative-past-frame',
    en: 'The three past tenses in a story',
    vi: 'Bộ ba thì kể chuyện quá khứ — nền, chuỗi việc, việc xảy ra trước',
    level: 'B1',
    summary: 'Một câu chuyện quá khứ cần ba lớp thì: quá khứ tiếp diễn dựng nền, quá khứ đơn kể chuỗi việc chính, quá khứ hoàn thành lùi về việc đã xảy ra trước đó.',
    formula: {
      rows: [
        ['Lớp nền', 'Quá khứ tiếp diễn: It WAS RAINING and people WERE HURRYING home.'],
        ['Lớp chuỗi việc chính', 'Quá khứ đơn, kể theo đúng thứ tự: She OPENED the door, LOOKED around and SAT down.'],
        ['Lớp lùi về trước', 'Quá khứ hoàn thành: The room was empty — everyone HAD LEFT.'],
        ['Ba lớp trong một câu', 'While I WAS WALKING home, I MET a friend I HAD NOT SEEN for years.']
      ],
      note: 'Quá khứ hoàn thành chỉ dùng khi cần nói rõ việc nào xảy ra trước. Nếu kể đúng theo thứ tự thời gian thì quá khứ đơn suốt là đủ, và tự nhiên hơn.'
    },
    signals: ['while', 'when', 'suddenly', 'by then', 'already', 'earlier that day', 'first … then … finally'],
    useWhen: [
      'Kể lại một sự việc trong bài Nói Part 2 hoặc bài Viết kể chuyện.',
      'Dựng bối cảnh trước rồi mới đưa sự việc chính vào.',
      'Giải thích một tình huống bằng nguyên nhân đã xảy ra trước đó.'
    ],
    useNot: [
      { what: 'Không dùng quá khứ hoàn thành cho cả chuỗi việc chính.', why: 'Kể "He had woken up, had eaten and had gone out" là sai nhịp: chuỗi việc theo đúng thứ tự chỉ cần quá khứ đơn.' },
      { what: 'Không dùng quá khứ tiếp diễn cho việc ngắn, xong ngay.', why: '"Suddenly the phone was ringing" nghe lạ; việc cắt ngang dùng quá khứ đơn: "Suddenly the phone rang".' }
    ],
    confuse: [
      {
        with: 'Quá khứ đơn kể chuỗi việc',
        tell: 'Quá khứ hoàn thành đánh dấu việc nằm NGOÀI trình tự đang kể; quá khứ đơn giữ đúng trình tự.',
        pair: [
          { en: 'She arrived at the station and bought a ticket.', vi: 'Cô ấy đến ga rồi mua vé. (đúng thứ tự — quá khứ đơn)' },
          { en: 'She arrived at the station, but the train had already gone.', vi: 'Cô ấy đến ga, nhưng tàu đã chạy mất rồi. (việc xảy ra trước — quá khứ hoàn thành)' }
        ]
      }
    ],
    errors: [
      { wrong: 'When I arrived, the film already started.', right: 'When I arrived, the film had already started.', why: 'Phim bắt đầu TRƯỚC lúc tôi đến, nên phải lùi một bậc về quá khứ hoàn thành.' },
      { wrong: 'While I walked home, it started to rain.', right: 'While I was walking home, it started to rain.', why: 'Việc dài làm nền cho việc ngắn cắt ngang thì dùng quá khứ tiếp diễn.' }
    ],
    examples: [
      ['It was getting dark when we finally reached the village.', 'Trời đang tối dần thì chúng tôi tới được ngôi làng.', 1, 'Nền tiếp diễn + việc chính quá khứ đơn.'],
      ['She opened the letter, read it twice and put it in her pocket.', 'Cô ấy mở thư, đọc hai lần rồi cho vào túi.', 1, 'Chuỗi việc đúng thứ tự — quá khứ đơn suốt.'],
      ['By the time the police arrived, the thief had disappeared.', 'Đến lúc cảnh sát tới thì tên trộm đã biến mất.', 1, 'Việc xảy ra trước mốc quá khứ — quá khứ hoàn thành.'],
      ['While I was waiting for the bus, I met an old classmate I had not seen for ten years.', 'Trong lúc đợi xe buýt, tôi gặp một người bạn học cũ mười năm rồi không gặp.', 1, 'Đủ cả ba lớp trong một câu.'],
      ['When I arrived, the film already started.', 'Lúc tôi đến thì phim đã chiếu rồi.', 0, 'Sai: thiếu quá khứ hoàn thành. Sửa thành "the film had already started".'],
      ['He had woken up, had eaten breakfast and had gone to work.', 'Anh ấy dậy, ăn sáng rồi đi làm.', 0, 'Sai nhịp: chuỗi việc đúng thứ tự chỉ cần quá khứ đơn — "He woke up, ate breakfast and went to work."']
    ],
    practice: [
      ['When we got to the beach, the sun ___ (already set).', 'had already set', 'Lúc chúng tôi ra tới biển thì mặt trời đã lặn.'],
      ['While she ___ (cook), the doorbell rang.', 'was cooking', 'Trong lúc cô ấy nấu ăn thì có tiếng chuông cửa.'],
      ['He ___ (open) the door, turned on the light and sat down.', 'opened', 'Anh ấy mở cửa, bật đèn rồi ngồi xuống.'],
      ['By the time I found my keys, the bus ___ (leave).', 'had left', 'Đến lúc tôi tìm thấy chìa khoá thì xe buýt đã đi.'],
      ['It ___ (rain) hard when we left the house.', 'was raining', 'Trời đang mưa to lúc chúng tôi ra khỏi nhà.'],
      ['She could not get in because she ___ (forget) her card.', 'had forgotten', 'Cô ấy không vào được vì quên thẻ.'],
      ['They were watching TV when the lights suddenly ___ (go) out.', 'went', 'Họ đang xem tivi thì đèn bỗng tắt phụt.'],
      ['I did not recognise him because he ___ (grow) a beard.', 'had grown', 'Tôi không nhận ra anh ấy vì anh ấy để râu.'],
      ['After the concert ___ (end), we walked to the station.', 'ended', 'Sau khi buổi hoà nhạc kết thúc, chúng tôi đi bộ ra ga.'],
      ['The children ___ (play) in the garden while their mother cooked.', 'were playing', 'Lũ trẻ chơi ngoài vườn trong lúc mẹ chúng nấu ăn.']
    ]
  },

  /* ==================== B2 ==================== */
  {
    slug: 'tense-consistency-paragraph',
    en: 'Keeping a consistent time frame in a paragraph',
    vi: 'Giữ mốc thì nhất quán trong cả đoạn — và lỗi trôi thì',
    level: 'B2',
    summary: 'Trong một đoạn văn, thì không đổi tuỳ hứng: chọn một mốc thời gian làm gốc, mọi câu bám theo mốc đó, chỉ đổi khi có lý do và có tín hiệu báo trước.',
    formula: {
      rows: [
        ['Chọn mốc gốc', 'Cả đoạn kể chuyện quá khứ thì quá khứ đơn làm xương sống.'],
        ['Lùi khỏi mốc gốc', 'Quá khứ hoàn thành cho việc xảy ra trước mốc gốc.'],
        ['Vươn khỏi mốc gốc', '"would + V" cho việc xảy ra sau mốc gốc: He did not know that he WOULD return.'],
        ['Đổi mốc phải có tín hiệu', 'today, now, these days, since then… báo cho người đọc biết mốc đã đổi.'],
        ['Bình luận ngoài mạch kể', 'Hiện tại đơn cho nhận xét vẫn còn đúng: The town was small then; today it IS a city.']
      ],
      note: 'Trôi thì (tense drift) bị trừ điểm nặng ở bài Viết: câu đầu quá khứ, câu sau tự nhiên nhảy sang hiện tại mà không có tín hiệu nào. Người đọc dùng thì để định vị thời gian, đổi thì không báo là làm họ mất phương hướng.'
    },
    signals: ['at that time', 'by then', 'since then', 'nowadays', 'today', 'these days'],
    useWhen: [
      'Viết đoạn kể hoặc đoạn mô tả dài hơn ba câu.',
      'Viết Task 1 mô tả xu hướng quá khứ rồi so sánh với hiện tại.',
      'Kể trải nghiệm ở Speaking Part 2 rồi rút nhận xét chung ở Part 3.'
    ],
    useNot: [
      { what: 'Không đổi thì chỉ vì câu nghe xuôi tai hơn.', why: 'Thì là tín hiệu thời gian; đổi thì mà không có mốc mới thì người đọc tưởng đã sang chuyện khác.' },
      { what: 'Không giữ nguyên quá khứ khi nhận xét vẫn còn đúng đến hôm nay.', why: '"Ho Chi Minh City was the largest city in Vietnam" nghe như thành phố đó không còn giữ vị trí ấy nữa; điều còn đúng thì dùng hiện tại đơn.' }
    ],
    confuse: [
      {
        with: 'Trôi thì do bất cẩn',
        tell: 'Đổi thì có chủ đích luôn kèm một cụm chỉ thời gian; trôi thì thì không có gì báo hiệu cả.',
        pair: [
          { en: 'We lived in a small flat then. Today we live in a house.', vi: 'Hồi đó chúng tôi ở căn hộ nhỏ. Bây giờ chúng tôi ở nhà riêng. (có "then" và "today" — đổi thì hợp lệ)' },
          { en: 'We lived in a small flat. We have a garden and the neighbours are friendly.', vi: 'Chúng tôi ở một căn hộ nhỏ. Chúng tôi có vườn và hàng xóm thân thiện. (không có mốc mới — trôi thì)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Last summer I visited Da Lat. The weather is cool and the food is cheap.', right: 'Last summer I visited Da Lat. The weather was cool and the food was cheap.', why: 'Cả đoạn đang kể chuyến đi năm ngoái; nhảy sang hiện tại mà không có tín hiệu là trôi thì.' },
      { wrong: 'He said he will come back the next day.', right: 'He said he would come back the next day.', why: 'Mốc gốc là lúc anh ấy nói, tức là quá khứ; việc xảy ra sau mốc đó dùng "would", không dùng "will".' }
    ],
    examples: [
      ['The village was quiet in those days. Most families farmed rice and few people owned a motorbike.', 'Hồi đó làng rất yên tĩnh. Phần lớn các gia đình làm ruộng và ít nhà có xe máy.', 1, 'Cả đoạn bám một mốc quá khứ.'],
      ['The village was quiet in those days. Today it is full of small factories.', 'Hồi đó làng rất yên tĩnh. Ngày nay làng đầy nhà xưởng nhỏ.', 1, 'Đổi thì hợp lệ vì có "today" báo mốc mới.'],
      ['She moved to Hue in 2015. She had studied there as a student, so she knew the city well.', 'Cô ấy chuyển về Huế năm 2015. Cô từng học ở đó nên rất thuộc thành phố.', 1, 'Lùi khỏi mốc gốc bằng quá khứ hoàn thành.'],
      ['He left the company in 2019. He did not know then that he would return as its director.', 'Anh ấy rời công ty năm 2019. Lúc đó anh không biết rồi mình sẽ quay lại làm giám đốc.', 1, 'Vươn khỏi mốc gốc bằng "would".'],
      ['Last summer I visited Da Lat. The weather is cool and the food is cheap.', 'Hè năm ngoái tôi đi Đà Lạt. Thời tiết mát mẻ và đồ ăn rẻ.', 0, 'Trôi thì: đang kể quá khứ thì nhảy sang hiện tại. Sửa thành "The weather was cool and the food was cheap."'],
      ['He said he will come back the next day.', 'Anh ấy nói hôm sau sẽ quay lại.', 0, 'Sai: mốc gốc ở quá khứ nên dùng "would". Sửa thành "He said he would come back the next day."']
    ],
    practice: [
      ['In 1990 the town ___ (have) only one school.', 'had', 'Năm 1990 thị trấn chỉ có một trường học.'],
      ['She grew up in Hue but she ___ (live) in Da Nang now.', 'lives', 'Cô ấy lớn lên ở Huế nhưng bây giờ sống ở Đà Nẵng.'],
      ['We visited the museum. It ___ (be) crowded that day.', 'was', 'Chúng tôi đi bảo tàng. Hôm đó rất đông.'],
      ['He promised that he ___ (help) us the following week.', 'would help', 'Anh ấy hứa tuần sau sẽ giúp chúng tôi.'],
      ['By 2010 the company ___ (open) three more offices.', 'had opened', 'Đến năm 2010 công ty đã mở thêm ba văn phòng.'],
      ['The report was written in 2018; since then the situation ___ (change) a lot.', 'has changed', 'Báo cáo viết năm 2018; từ đó đến nay tình hình đã thay đổi nhiều.'],
      ['They were poor then, but today they ___ (own) two shops.', 'own', 'Hồi đó họ nghèo, nhưng giờ họ có hai cửa hàng.'],
      ['I did not realise that the train ___ (leave) an hour earlier.', 'had left', 'Tôi không biết tàu đã đi trước đó một tiếng.'],
      ['She said the meeting ___ (start) at nine the next morning.', 'would start', 'Cô ấy nói cuộc họp sẽ bắt đầu lúc chín giờ sáng hôm sau.'],
      ['Water ___ (boil) at 100 degrees, as the teacher explained yesterday.', 'boils', 'Nước sôi ở 100 độ, như cô giáo giảng hôm qua.']
    ]
  },

  {
    slug: 'future-in-the-past',
    en: 'Future in the past',
    vi: 'Tương lai nhìn từ quá khứ — would, was going to, was about to, was to',
    level: 'B2',
    summary: 'Khi mốc gốc đã lùi về quá khứ thì cái "sẽ" cũng phải lùi theo: "will" thành "would", "am going to" thành "was going to".',
    formula: {
      rows: [
        ['Dự định, lời hứa', 'S + WOULD + V: He said he WOULD call me.'],
        ['Kế hoạch đã định sẵn', 'S + WAS/WERE GOING TO + V: We WERE GOING TO leave at six.'],
        ['Sắp xảy ra ngay tại mốc đó', 'S + WAS/WERE ABOUT TO + V: She WAS ABOUT TO speak when the bell rang.'],
        ['Sắp xếp chính thức, giọng kể', 'S + WAS/WERE TO + V: He WAS TO become the youngest director in the company.']
      ],
      note: '"would" ở đây nhìn từ một mốc quá khứ CÓ THẬT ra phía trước, không liên quan gì tới điều kiện — đừng lẫn với "would" của câu điều kiện loại 2. "was going to" là lối nói thường ngày, "was to" mang giọng kể chuyện và văn viết.'
    },
    signals: ['said', 'thought', 'knew', 'promised', 'the next day', 'a week later', 'soon afterwards'],
    useWhen: [
      'Kể chuyện: báo trước việc sẽ xảy ra sau mốc đang kể.',
      'Thuật lại dự định hoặc lời hứa của người khác.',
      'Nói về kế hoạch cũ rốt cuộc đã không thành.'
    ],
    useNot: [
      { what: 'Không dùng "will" khi mốc gốc đã ở quá khứ.', why: '"He said he will come" lẫn hai mốc thời gian; phải là "He said he would come".' },
      { what: 'Không dùng "would" cho việc đã thật sự xảy ra và ta đang kể thẳng.', why: 'Nếu việc đã xảy ra và không nhìn từ mốc trước đó thì dùng quá khứ đơn: "He came back a week later".' }
    ],
    confuse: [
      {
        with: '"would" trong câu điều kiện loại 2',
        tell: '"would" tương lai-trong-quá-khứ nhìn về phía trước từ một mốc quá khứ có thật; "would" điều kiện nói chuyện không có thật.',
        pair: [
          { en: 'She knew she would regret it later.', vi: 'Cô ấy biết rồi mình sẽ hối hận. (mốc quá khứ có thật, nhìn về sau)' },
          { en: 'She would regret it if she sold the house.', vi: 'Cô ấy sẽ hối hận nếu bán căn nhà. (giả định, chưa xảy ra)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I thought the train will arrive at eight.', right: 'I thought the train would arrive at eight.', why: '"thought" đặt mốc ở quá khứ nên "will" phải lùi thành "would".' },
      { wrong: 'They were going to cancelled the trip.', right: 'They were going to cancel the trip.', why: 'Sau "going to" là động từ nguyên thể, không chia.' }
    ],
    examples: [
      ['He said he would send the documents the next morning.', 'Anh ấy nói sáng hôm sau sẽ gửi tài liệu.', 1, 'Lời hứa nhìn từ mốc quá khứ.'],
      ['We were going to take the early bus, but we overslept.', 'Chúng tôi định đi chuyến xe sớm nhưng ngủ quên.', 1, 'Kế hoạch cũ không thành.'],
      ['She was about to leave when the phone rang.', 'Cô ấy vừa định đi thì chuông điện thoại reo.', 1, 'Việc sắp xảy ra ngay tại mốc đó.'],
      ['Nobody knew then that the small shop was to become a national chain.', 'Hồi đó chẳng ai ngờ cửa hàng nhỏ ấy rồi sẽ thành chuỗi cửa hàng toàn quốc.', 1, '"was to" mang giọng kể chuyện.'],
      ['I thought the train will arrive at eight.', 'Tôi tưởng tàu sẽ đến lúc tám giờ.', 0, 'Sai: sau "thought" phải lùi "will" thành "would". Sửa thành "I thought the train would arrive at eight."'],
      ['They were going to cancelled the trip.', 'Họ định huỷ chuyến đi.', 0, 'Sai: sau "going to" là nguyên thể. Sửa thành "They were going to cancel the trip."']
    ],
    practice: [
      ['She said she ___ (call) me back after lunch.', 'would call', 'Cô ấy nói sẽ gọi lại cho tôi sau bữa trưa.'],
      ['We ___ (be) going to leave at six, but the meeting ran late.', 'were', 'Chúng tôi định đi lúc sáu giờ nhưng cuộc họp kéo dài.'],
      ['He ___ (be) about to sign the contract when his phone rang.', 'was', 'Anh ấy vừa định ký hợp đồng thì điện thoại reo.'],
      ['I knew that I ___ (regret) that decision.', 'would regret', 'Tôi biết mình sẽ hối hận vì quyết định đó.'],
      ['They thought the results ___ (come) out on Friday.', 'would come', 'Họ tưởng kết quả sẽ có vào thứ Sáu.'],
      ['The young teacher ___ (be) to become the school principal ten years later.', 'was', 'Cô giáo trẻ ấy mười năm sau sẽ trở thành hiệu trưởng.'],
      ['We were going to ___ (book) a hotel, but our friends invited us to stay.', 'book', 'Chúng tôi định đặt khách sạn nhưng bạn bè mời ở lại.'],
      ['He promised he ___ (not tell) anyone.', 'would not tell', 'Anh ấy hứa sẽ không nói với ai.'],
      ['Nobody imagined that the film ___ (win) three awards.', 'would win', 'Không ai ngờ bộ phim sẽ đoạt ba giải.'],
      ['She ___ (be) going to apply for the job but she changed her mind.', 'was', 'Cô ấy định nộp đơn xin việc nhưng đổi ý.']
    ]
  },

  /* ==================== C1 ==================== */
  {
    slug: 'reference-point-perfect',
    en: 'Perfect tenses around a reference point',
    vi: 'Ba thì hoàn thành quanh một mốc quy chiếu — by the time, by then, by 2030',
    level: 'C1',
    summary: 'Thì hoàn thành không trả lời "việc xảy ra lúc nào" mà trả lời "việc đã xong trước mốc nào". Đổi mốc quy chiếu là đổi cả ba thì hoàn thành.',
    formula: {
      rows: [
        ['Mốc là hiện tại', 'Hiện tại hoàn thành: By now she HAS WRITTEN three books.'],
        ['Mốc là một điểm trong quá khứ', 'Quá khứ hoàn thành: By 2010 she HAD WRITTEN three books.'],
        ['Mốc là một điểm trong tương lai', 'Tương lai hoàn thành: By next June she WILL HAVE WRITTEN three books.'],
        ['Nhấn vào độ dài tính đến mốc', 'Thêm thể tiếp diễn: By June she WILL HAVE BEEN WRITING for ten years.'],
        ['Mốc do một mệnh đề đặt ra', 'BY THE TIME + hiện tại đơn (mốc tương lai) hoặc + quá khứ đơn (mốc quá khứ).']
      ],
      note: 'Sau "by the time" không bao giờ dùng "will": mệnh đề này chỉ đặt mốc chứ không nói tương lai — "By the time we ARRIVE, the show will have started."'
    },
    signals: ['by then', 'by the time', 'by 2030', 'by the end of', 'so far', 'until then'],
    useWhen: [
      'Nói việc gì đã hoàn tất trước một mốc, không quan tâm chính xác lúc nào.',
      'Viết Task 1 mô tả số liệu tính đến một mốc thời gian.',
      'Viết báo cáo tiến độ: đến hạn X thì đã xong Y.'
    ],
    useNot: [
      { what: 'Không dùng "will" trong mệnh đề "by the time".', why: 'Đây là mệnh đề thời gian, dùng hiện tại đơn cho mốc tương lai.' },
      { what: 'Không dùng thì hoàn thành khi đã nêu mốc chính xác của việc.', why: 'Có "at six yesterday" thì dùng quá khứ đơn; thì hoàn thành chỉ dùng khi quan tâm quan hệ trước–sau với một mốc.' }
    ],
    confuse: [
      {
        with: 'Quá khứ đơn kèm mốc thời gian',
        tell: 'Quá khứ đơn trả lời "xảy ra lúc nào"; quá khứ hoàn thành trả lời "đến mốc đó đã xong chưa".',
        pair: [
          { en: 'The show started at seven.', vi: 'Buổi diễn bắt đầu lúc bảy giờ. (nói giờ xảy ra)' },
          { en: 'By the time we arrived, the show had started.', vi: 'Đến lúc chúng tôi tới thì buổi diễn đã bắt đầu. (quan hệ trước–sau với mốc)' }
        ]
      }
    ],
    errors: [
      { wrong: 'By the time you will read this, I will have left.', right: 'By the time you read this, I will have left.', why: 'Mệnh đề "by the time" đặt mốc nên dùng hiện tại đơn; ý tương lai đã nằm ở mệnh đề chính.' },
      { wrong: 'By 2015 the company has opened ten branches.', right: 'By 2015 the company had opened ten branches.', why: 'Mốc quy chiếu nằm trong quá khứ nên thì hoàn thành cũng phải lùi về quá khứ hoàn thành.' }
    ],
    examples: [
      ['By the end of this year, the team will have finished the first phase.', 'Đến cuối năm nay đội sẽ hoàn thành xong giai đoạn một.', 1, 'Mốc tương lai — tương lai hoàn thành.'],
      ['By the time the inspectors arrived, the files had already been destroyed.', 'Đến lúc đoàn thanh tra tới thì hồ sơ đã bị tiêu huỷ.', 1, 'Mốc quá khứ — quá khứ hoàn thành, ở dạng bị động.'],
      ['So far the project has cost twice the original estimate.', 'Đến giờ dự án đã tốn gấp đôi dự toán ban đầu.', 1, 'Mốc là hiện tại.'],
      ['By next spring she will have been teaching here for twenty years.', 'Đến mùa xuân năm sau là cô ấy dạy ở đây được hai mươi năm.', 1, 'Nhấn vào độ dài tính đến mốc.'],
      ['By the time you will read this, I will have left.', 'Lúc bạn đọc được cái này thì tôi đã đi rồi.', 0, 'Sai: sau "by the time" không dùng "will". Sửa thành "By the time you read this, I will have left."'],
      ['By 2015 the company has opened ten branches.', 'Đến năm 2015 công ty đã mở mười chi nhánh.', 0, 'Sai: mốc ở quá khứ nên phải dùng "had opened".']
    ],
    practice: [
      ['By the time we reach the airport, the plane ___ (take) off.', 'will have taken', 'Đến lúc chúng ta tới sân bay thì máy bay đã cất cánh.'],
      ['By 2020 the population ___ (double).', 'had doubled', 'Đến năm 2020 dân số đã tăng gấp đôi.'],
      ['By the end of next month she ___ (work) here for a year.', 'will have worked', 'Đến cuối tháng sau là cô ấy làm ở đây được một năm.'],
      ['By the time the guests ___ (arrive), everything was ready.', 'arrived', 'Đến lúc khách tới thì mọi thứ đã sẵn sàng.'],
      ['So far the committee ___ (meet) only twice.', 'has met', 'Đến giờ uỷ ban mới họp có hai lần.'],
      ['By the time you finish reading, the deadline ___ (pass).', 'will have passed', 'Đến lúc bạn đọc xong thì hạn nộp đã qua.'],
      ['By last December they ___ (sell) most of the land.', 'had sold', 'Đến tháng Mười hai năm ngoái họ đã bán gần hết đất.'],
      ['By June I ___ (study) Japanese for five years.', 'will have been studying', 'Đến tháng Sáu là tôi học tiếng Nhật được năm năm.'],
      ['By the time the law ___ (come) into force, most firms had already adapted.', 'came', 'Đến lúc luật có hiệu lực thì phần lớn doanh nghiệp đã thích ứng xong.'],
      ['Until now the government ___ (not respond) to the report.', 'has not responded', 'Đến giờ chính phủ vẫn chưa phản hồi báo cáo.']
    ]
  },

  {
    slug: 'tense-academic-writing',
    en: 'Tense choice in academic writing',
    vi: 'Phối hợp thì trong bài viết học thuật — tổng quan, phương pháp, kết quả, bàn luận',
    level: 'C1',
    summary: 'Mỗi phần của một bài học thuật có thì mặc định riêng. Chọn sai thì là báo sai mức độ cam kết với điều mình nói.',
    formula: {
      rows: [
        ['Tổng quan — cả mảng nghiên cứu', 'Hiện tại hoàn thành: Several studies HAVE EXAMINED this issue.'],
        ['Tổng quan — một nghiên cứu cụ thể', 'Quá khứ đơn: Nguyen (2019) FOUND that…'],
        ['Phương pháp và kết quả của mình', 'Quá khứ đơn: Data WERE COLLECTED over six months.'],
        ['Bàn luận, kết luận, điều còn đúng chung', 'Hiện tại đơn: These findings SUGGEST that motivation MATTERS.'],
        ['Mô tả nội dung một văn bản, biểu bảng', 'Hiện tại đơn: Table 2 SHOWS the results; the author ARGUES that…']
      ],
      note: 'Quy tắc ngầm phía sau: quá khứ đơn gắn phát hiện vào một nghiên cứu cụ thể nên khiêm tốn hơn; hiện tại đơn nâng nó lên thành điều đang đúng nói chung nên mạnh hơn. Chọn thì chính là chọn mức cam kết.'
    },
    signals: ['research has shown', 'the study found', 'the results indicate', 'Figure 1 shows', 'it can be concluded'],
    useWhen: [
      'Viết phần tổng quan tài liệu cho bài luận hoặc báo cáo.',
      'Mô tả biểu đồ, bảng số liệu trong IELTS Writing Task 1.',
      'Rút kết luận từ dữ liệu vừa trình bày.'
    ],
    useNot: [
      { what: 'Không dùng hiện tại đơn cho phương pháp và số liệu đã thu thập xong.', why: '"Data are collected over six months" nghe như việc đang diễn ra; phần phương pháp thuật lại việc đã làm nên dùng quá khứ đơn.' },
      { what: 'Không dùng quá khứ đơn cho điều vẫn còn đúng đến bây giờ.', why: '"The study showed that exercise improved health" hạ kết luận xuống thành chuyện riêng của nghiên cứu đó; nếu coi là điều đúng chung thì viết "…that exercise improves health".' }
    ],
    confuse: [
      {
        with: 'Hiện tại hoàn thành và quá khứ đơn khi dẫn nguồn',
        tell: 'Hiện tại hoàn thành nói về cả mảng nghiên cứu, không nêu tên ai; quá khứ đơn nêu đích danh một nghiên cứu và năm.',
        pair: [
          { en: 'Research has shown that sleep affects memory.', vi: 'Nhiều nghiên cứu đã cho thấy giấc ngủ ảnh hưởng tới trí nhớ. (cả mảng, không nêu tên)' },
          { en: 'Tran (2020) showed that sleep affects memory.', vi: 'Trần (2020) đã chỉ ra giấc ngủ ảnh hưởng tới trí nhớ. (một nghiên cứu cụ thể)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Figure 2 showed that exports rose sharply.', right: 'Figure 2 shows that exports rose sharply.', why: 'Biểu đồ đang nằm trước mắt người đọc nên mô tả nó bằng hiện tại đơn; số liệu bên trong vẫn kể bằng quá khứ đơn.' },
      { wrong: 'Smith (2018) has found that the method failed.', right: 'Smith (2018) found that the method failed.', why: 'Đã nêu đích danh tác giả và năm thì dùng quá khứ đơn; hiện tại hoàn thành để dành cho khi nói chung cả mảng nghiên cứu.' }
    ],
    examples: [
      ['Recent studies have highlighted the role of feedback in language learning.', 'Các nghiên cứu gần đây đã nhấn mạnh vai trò của phản hồi trong việc học ngôn ngữ.', 1, 'Cả mảng nghiên cứu — hiện tại hoàn thành.'],
      ['Pham (2021) surveyed 300 students in three provinces.', 'Phạm (2021) khảo sát 300 học sinh ở ba tỉnh.', 1, 'Một nghiên cứu cụ thể — quá khứ đơn.'],
      ['The questionnaires were distributed in April and analysed in May.', 'Bảng hỏi được phát vào tháng Tư và phân tích vào tháng Năm.', 1, 'Phương pháp đã làm xong — quá khứ đơn, dạng bị động.'],
      ['These results suggest that motivation is a stronger predictor than aptitude.', 'Kết quả này cho thấy động lực dự báo tốt hơn năng khiếu.', 1, 'Bàn luận, vẫn còn đúng — hiện tại đơn.'],
      ['Figure 2 showed that exports rose sharply after 2015.', 'Hình 2 cho thấy xuất khẩu tăng mạnh sau năm 2015.', 0, 'Sai: mô tả biểu đồ dùng hiện tại đơn. Sửa thành "Figure 2 shows that exports rose sharply after 2015."'],
      ['The data were collected over six months and are analysed with SPSS.', 'Dữ liệu được thu thập trong sáu tháng và được phân tích bằng SPSS.', 0, 'Sai: hai vế cùng thuật lại việc đã làm nên cùng quá khứ đơn — "were collected… and were analysed…"']
    ],
    practice: [
      ['Several researchers ___ (investigate) this question over the last decade.', 'have investigated', 'Nhiều nhà nghiên cứu đã tìm hiểu câu hỏi này suốt mười năm qua.'],
      ['Le (2018) ___ (report) similar findings in a rural sample.', 'reported', 'Lê (2018) báo cáo kết quả tương tự ở mẫu nông thôn.'],
      ['The interviews ___ (conduct) in Vietnamese and later translated.', 'were conducted', 'Các cuộc phỏng vấn được thực hiện bằng tiếng Việt rồi dịch lại.'],
      ['Table 3 ___ (show) the distribution of scores.', 'shows', 'Bảng 3 cho thấy phân bố điểm số.'],
      ['These findings ___ (indicate) that early exposure matters.', 'indicate', 'Những phát hiện này cho thấy việc tiếp xúc sớm là quan trọng.'],
      ['Little attention ___ (pay) to this group until recently.', 'has been paid', 'Cho tới gần đây nhóm này ít được chú ý.'],
      ['The author ___ (argue) that the policy was poorly designed.', 'argues', 'Tác giả lập luận rằng chính sách được thiết kế kém.'],
      ['Participants ___ (complete) the test in forty minutes.', 'completed', 'Người tham gia hoàn thành bài kiểm tra trong bốn mươi phút.'],
      ['The sample ___ (consist) of 120 first-year students.', 'consisted', 'Mẫu gồm 120 sinh viên năm nhất.'],
      ['Water ___ (freeze) at zero degrees, a fact the experiment confirmed.', 'freezes', 'Nước đóng băng ở 0 độ, điều mà thí nghiệm đã xác nhận.']
    ]
  },

  /* ==================== C2 ==================== */
  {
    slug: 'historic-present',
    en: 'The historic present',
    vi: 'Hiện tại lịch sử — kể chuyện quá khứ bằng thì hiện tại',
    level: 'C2',
    summary: 'Chuyển sang thì hiện tại giữa một mạch kể quá khứ để kéo người nghe vào ngay tại hiện trường. Đây là thủ pháp có chủ đích, không phải lỗi.',
    formula: {
      rows: [
        ['Chuyển vào đoạn cao trào', 'Đang quá khứ → chuyển sang hiện tại: So I WAS standing there, and suddenly this man WALKS UP and SAYS…'],
        ['Tóm tắt cốt truyện', 'Hiện tại đơn suốt: In the novel, the narrator LEAVES home and never RETURNS.'],
        ['Trình bày lịch sử cho sống động', 'Hiện tại đơn: In 1911, the young man BOARDS a ship in Saigon.'],
        ['Tiêu đề báo', 'Hiện tại đơn cho việc vừa xảy ra: Typhoon HITS central provinces.'],
        ['Dẫn lời tác giả', 'Hiện tại đơn: Nam Cao WRITES that poverty STRIPS people of their dignity.']
      ],
      note: 'Điều kiện để dùng được: người nghe phải đã biết chắc chuyện xảy ra trong quá khứ. Nếu mốc thời gian chưa rõ, chuyển sang hiện tại sẽ bị hiểu thành chuyện đang xảy ra thật.'
    },
    signals: ['so there I am', 'and then he says', 'in the film', 'in the novel', 'tiêu đề báo'],
    useWhen: [
      'Kể giai thoại trong bài Nói để tăng kịch tính.',
      'Tóm tắt cốt truyện phim, tiểu thuyết, vở kịch.',
      'Dẫn ý một tác giả trong bài luận, kể cả tác giả đã mất từ lâu.'
    ],
    useNot: [
      { what: 'Không dùng khi thuật lại phương pháp nghiên cứu trong bài học thuật.', why: 'Phần phương pháp cần quá khứ đơn; hiện tại lịch sử ở đó chỉ gây rối cho người đọc.' },
      { what: 'Không nhảy qua nhảy lại giữa hai thì trong cùng một đoạn.', why: 'Chuyển một lần vào cao trào rồi ở lại; đổi liên tục thì người đọc không còn biết mốc nào là mốc nào — đó là trôi thì chứ không phải thủ pháp.' }
    ],
    confuse: [
      {
        with: 'Trôi thì do bất cẩn',
        tell: 'Hiện tại lịch sử chuyển cả một đoạn, có chủ đích và có hiệu quả kịch tính; trôi thì là đổi lẻ tẻ từng câu, không vì lý do gì.',
        pair: [
          { en: 'So I am sitting there, and this stranger sits down and starts talking.', vi: 'Thế là tôi đang ngồi đó, rồi một người lạ ngồi xuống và bắt chuyện. (chuyển hẳn cả đoạn — có chủ đích)' },
          { en: 'Last year I visited Hue. It is very hot and I stayed for three days.', vi: 'Năm ngoái tôi đi Huế. Trời rất nóng và tôi ở lại ba ngày. (đổi lẻ một câu — trôi thì)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Last year I visited Hue and the weather is very hot.', right: 'Last year I visited Hue and the weather was very hot.', why: 'Đây không phải hiện tại lịch sử mà là trôi thì: chỉ một mệnh đề đổi thì, không tạo ra hiệu quả kịch tính nào.' },
      { wrong: 'In the study, the researcher interviews 200 workers in 2019.', right: 'In the study, the researcher interviewed 200 workers in 2019.', why: 'Văn học thuật thuật lại phương pháp bằng quá khứ đơn; hiện tại lịch sử không dùng ở chỗ này.' }
    ],
    examples: [
      ['So I am waiting at the bus stop, and this dog just walks up and sits next to me.', 'Thế là tôi đang đứng đợi xe buýt, tự dưng có con chó đi tới ngồi cạnh.', 1, 'Kể giai thoại — chuyển hẳn sang hiện tại cho sống động.'],
      ['In the novel, the narrator leaves his village and never goes back.', 'Trong tiểu thuyết, người kể chuyện rời làng và không bao giờ quay lại.', 1, 'Tóm tắt cốt truyện luôn dùng hiện tại đơn.'],
      ['In 1911, the young man boards a ship in Saigon and sails to France.', 'Năm 1911, chàng thanh niên lên tàu ở Sài Gòn và sang Pháp.', 1, 'Hiện tại lịch sử trong bài thuyết trình.'],
      ['Nam Cao writes that poverty strips people of their dignity.', 'Nam Cao viết rằng cái nghèo lấy đi phẩm giá của con người.', 1, 'Dẫn lời tác giả — hiện tại đơn là chuẩn mực.'],
      ['Last year I visited Hue and the weather is very hot.', 'Năm ngoái tôi đi Huế, trời rất nóng.', 0, 'Không phải hiện tại lịch sử mà là trôi thì. Sửa thành "the weather was very hot".'],
      ['In the study, the researcher interviews 200 workers in 2019.', 'Trong nghiên cứu, tác giả phỏng vấn 200 công nhân vào năm 2019.', 0, 'Sai văn phong: phần phương pháp dùng quá khứ đơn — "interviewed".']
    ],
    practice: [
      ['In the film, the hero ___ (discover) that his friend has betrayed him.', 'discovers', 'Trong phim, nhân vật chính phát hiện ra bạn mình đã phản bội.'],
      ['So there I am, and the manager suddenly ___ (ask) me to present.', 'asks', 'Thế là tôi đang ở đó, tự dưng sếp bảo tôi lên thuyết trình.'],
      ['Shakespeare ___ (write) that all the world is a stage.', 'writes', 'Shakespeare viết rằng cả thế gian là một sân khấu.'],
      ['In 1945, the country ___ (declare) its independence.', 'declares', 'Năm 1945, đất nước tuyên bố độc lập.'],
      ['Yesterday I met an old friend and we ___ (talk) for hours.', 'talked', 'Hôm qua tôi gặp một người bạn cũ và chúng tôi nói chuyện hàng giờ.'],
      ['The report ___ (state) that emissions fell by twelve per cent.', 'states', 'Báo cáo nêu rằng khí thải giảm mười hai phần trăm.'],
      ['In chapter two, the two sisters ___ (move) to the city.', 'move', 'Ở chương hai, hai chị em chuyển lên thành phố.'],
      ['The researchers ___ (collect) the samples in 2018.', 'collected', 'Các nhà nghiên cứu thu thập mẫu vào năm 2018.'],
      ['Headline: Storm ___ (cut) power to thousands of homes.', 'cuts', 'Tiêu đề: Bão làm mất điện hàng nghìn hộ dân.'],
      ['I was walking home when a car ___ (stop) beside me.', 'stopped', 'Tôi đang đi bộ về nhà thì một chiếc ô tô dừng lại bên cạnh.']
    ]
  },

  {
    slug: 'flashback-tense-management',
    en: 'Managing a flashback',
    vi: 'Điều khiển đoạn hồi tưởng — vào bằng quá khứ hoàn thành, ở lại bằng quá khứ đơn',
    level: 'C2',
    summary: 'Một đoạn hồi tưởng dài không giữ "had + V3" từ đầu đến cuối: dùng nó một hai câu để mở cửa, rồi hạ xuống quá khứ đơn, và đóng lại bằng một tín hiệu thời gian.',
    formula: {
      rows: [
        ['Mở hồi tưởng', 'Một hoặc hai câu quá khứ hoàn thành: She HAD MET him twenty years earlier.'],
        ['Ở lại trong hồi tưởng', 'Hạ xuống quá khứ đơn: It WAS raining that evening. He WORE a grey coat and SPOKE very little.'],
        ['Đóng hồi tưởng, về mạch chính', 'Tín hiệu thời gian hoặc nơi chốn: Now, twenty years later, she… / Back in the office, she…'],
        ['Hồi tưởng chỉ một câu', 'Giữ nguyên quá khứ hoàn thành: He remembered that he HAD LOCKED the door.']
      ],
      note: 'Vì sao phải hạ xuống: năm câu liền "had + V3" làm văn nặng và làm người đọc mất cảm giác đang ở trong cảnh. Một khi mốc hồi tưởng đã được thiết lập, quá khứ đơn tự hiểu là đang ở mốc đó.'
    },
    signals: ['years earlier', 'back then', 'at the time', 'now, back in', 'she remembered'],
    useWhen: [
      'Viết truyện hoặc bài Viết kể chuyện có đoạn quay ngược thời gian.',
      'Viết tiểu sử: chèn một đoạn quá khứ xa hơn vào giữa mạch kể.',
      'Trả lời Speaking Part 2 có phần giải thích vì sao chuyện đó đáng nhớ.'
    ],
    useNot: [
      { what: 'Không giữ quá khứ hoàn thành suốt cả đoạn hồi tưởng dài.', why: 'Chỉ cần một hai câu đầu để đánh dấu mốc; giữ mãi thì câu văn nặng nề và rối.' },
      { what: 'Không quay về mạch chính mà không báo hiệu.', why: 'Người đọc vẫn tưởng đang ở trong hồi tưởng; cần một cụm chỉ thời gian hoặc nơi chốn để đóng đoạn lại.' }
    ],
    confuse: [
      {
        with: 'Quá khứ hoàn thành đứng lẻ một câu',
        tell: 'Hồi tưởng một câu thì giữ nguyên "had + V3"; hồi tưởng dài thì hạ xuống quá khứ đơn ngay sau câu mở.',
        pair: [
          { en: 'He realised that he had left his passport at home.', vi: 'Anh nhận ra mình để quên hộ chiếu ở nhà. (một câu — giữ nguyên)' },
          { en: 'He had left home at eighteen. The train was crowded, and he sat by the window for nine hours.', vi: 'Anh rời nhà năm mười tám tuổi. Tàu chật cứng, anh ngồi cạnh cửa sổ suốt chín tiếng. (đoạn dài — hạ xuống quá khứ đơn)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She had arrived in 1998. She had rented a room, had found a job and had studied English at night.', right: 'She had arrived in 1998. She rented a room, found a job and studied English at night.', why: 'Câu đầu đã mở hồi tưởng rồi; ba việc sau nằm trong mốc đó nên hạ xuống quá khứ đơn.' },
      { wrong: 'He remembered the day he leaves his village.', right: 'He remembered the day he left his village.', why: 'Mạch kể đang ở quá khứ, hồi tưởng phải lùi về ít nhất quá khứ đơn chứ không nhảy sang hiện tại.' }
    ],
    examples: [
      ['She had met him twenty years earlier, in a bookshop in Hanoi.', 'Cô đã gặp anh hai mươi năm trước, trong một hiệu sách ở Hà Nội.', 1, 'Câu mở hồi tưởng — quá khứ hoàn thành.'],
      ['It was raining that afternoon. He wore a grey coat and said very little.', 'Chiều hôm ấy trời mưa. Anh mặc áo khoác xám và nói rất ít.', 1, 'Đã vào trong hồi tưởng — hạ xuống quá khứ đơn.'],
      ['Now, twenty years later, she was standing in the same street.', 'Giờ đây, hai mươi năm sau, cô đứng lại chính con phố ấy.', 1, 'Tín hiệu thời gian đóng hồi tưởng, trở về mạch chính.'],
      ['He suddenly remembered that he had not locked the door.', 'Anh chợt nhớ ra mình chưa khoá cửa.', 1, 'Hồi tưởng một câu thì giữ nguyên quá khứ hoàn thành.'],
      ['She had arrived in 1998. She had rented a room, had found a job and had studied English at night.', 'Cô đến năm 1998. Cô thuê một căn phòng, tìm được việc và học tiếng Anh buổi tối.', 0, 'Sai nhịp: sau câu mở phải hạ xuống quá khứ đơn — "She rented a room, found a job and studied English at night."'],
      ['He remembered the day he leaves his village.', 'Anh nhớ lại cái ngày rời làng.', 0, 'Sai: mạch kể ở quá khứ nên không nhảy sang hiện tại. Sửa thành "the day he left his village".']
    ],
    practice: [
      ['She ___ (move) to the city ten years before, when she was still a student.', 'had moved', 'Cô chuyển lên thành phố mười năm trước, khi còn là sinh viên.'],
      ['That winter ___ (be) unusually cold, and the family stayed indoors for weeks.', 'was', 'Mùa đông năm ấy lạnh khác thường, cả nhà ở lì trong nhà hàng tuần.'],
      ['He had left school at sixteen. He ___ (work) in a garage for two years after that.', 'worked', 'Anh bỏ học năm mười sáu tuổi. Sau đó anh làm ở một gara suốt hai năm.'],
      ['Back in the present, she ___ (close) the album and stood up.', 'closed', 'Trở lại hiện tại, cô gấp cuốn album lại và đứng dậy.'],
      ['She realised that she ___ (leave) her phone on the table.', 'had left', 'Cô nhận ra mình để quên điện thoại trên bàn.'],
      ['They had bought the house in 2005. The roof ___ (leak) and the garden was full of weeds.', 'leaked', 'Họ mua căn nhà năm 2005. Mái nhà dột và vườn đầy cỏ dại.'],
      ['He remembered the summer when he first ___ (see) the sea.', 'saw', 'Anh nhớ mùa hè lần đầu tiên nhìn thấy biển.'],
      ['The letter ___ (arrive) three days earlier, but nobody had opened it.', 'had arrived', 'Lá thư đến từ ba hôm trước nhưng chưa ai mở.'],
      ['At the time, nobody ___ (know) what the message meant.', 'knew', 'Hồi ấy chẳng ai hiểu lời nhắn đó nghĩa là gì.'],
      ['Now, back at his desk, he ___ (begin) to write.', 'began', 'Giờ đây, trở lại bàn làm việc, anh bắt đầu viết.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'tense',
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
