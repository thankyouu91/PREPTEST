/**
 * Ngữ pháp — nhóm THÌ (12 thì tiếng Anh).
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép từ Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Mỗi thì có đủ bốn lát cắt mà docs/LEARNING.md mục 2 yêu cầu:
 *   1. công thức (khẳng định / phủ định / nghi vấn)
 *   2. dùng khi nào
 *   3. KHÔNG dùng khi nào  ← phần sách giáo khoa hay bỏ qua, lại là chỗ mất điểm
 *   4. phân biệt với thì dễ nhầm
 * kèm lỗi người Việt hay mắc, 8 câu ví dụ và 12 câu luyện tập.
 *
 * Một lưu ý học thuật: xét về hình thái, tiếng Anh chỉ có hai thì thật là hiện
 * tại và quá khứ; "tương lai" được diễn đạt bằng trợ động từ tình thái "will"
 * chứ không phải bằng đuôi chia động từ. Cách gọi "12 thì" là quy ước dạy học
 * quen thuộc ở Việt Nam nên tài liệu này giữ nguyên, và ghi chú lại điều trên
 * ở bốn thì tương lai để người học không hiểu sai bản chất.
 *
 * Bậc: 12 thì này nằm trong hạn mức 21 điểm của nhóm "Thì" trong bảng phân bậc
 * (docs/LEARNING.md mục 2). 9 điểm còn lại dành cho phối hợp thì và lùi thì,
 * sẽ soạn ở lượt sau.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== 1. HIỆN TẠI ĐƠN ==================== */
  {
    slug: 'present-simple',
    en: 'Present Simple',
    vi: 'Hiện tại đơn',
    level: 'A1',
    summary: 'Việc lặp đi lặp lại, sự thật hiển nhiên và lịch trình cố định — không phải việc đang xảy ra lúc nói.',
    formula: {
      pos: 'S + V (thêm -s/-es với he/she/it)',
      neg: 'S + do/does + not + V(nguyên thể)',
      que: 'Do/Does + S + V(nguyên thể)?',
      note: 'Với động từ "to be": I am / he-she-it is / you-we-they are.'
    },
    signals: ['every day', 'always', 'usually', 'often', 'sometimes', 'rarely', 'never',
      'on Mondays', 'twice a week', 'in general'],
    useWhen: [
      'Thói quen, việc lặp lại đều đặn.',
      'Sự thật hiển nhiên, quy luật tự nhiên.',
      'Lịch trình cố định do bên ngoài định sẵn: tàu xe, giờ học, giờ chiếu phim.',
      'Trạng thái lâu dài: nơi ở, nghề nghiệp, sở thích.',
      'Hướng dẫn từng bước, công thức nấu ăn, tường thuật trực tiếp thể thao.'
    ],
    useNot: [
      { what: 'Việc đang diễn ra ngay lúc nói.', why: 'Dùng hiện tại tiếp diễn: "She is cooking now", không phải "She cooks now".' },
      { what: 'Kế hoạch cá nhân đã sắp xếp cho tương lai gần.', why: 'Dùng hiện tại tiếp diễn: "I am meeting her tomorrow". Hiện tại đơn chỉ dành cho lịch trình do bên ngoài ấn định.' }
    ],
    confuse: [
      {
        with: 'Hiện tại tiếp diễn',
        tell: 'Hiện tại đơn nói việc thường xuyên; hiện tại tiếp diễn nói việc đang xảy ra hoặc chỉ tạm thời.',
        pair: [
          { en: 'She works in a bank.', vi: 'Cô ấy làm ngân hàng. (nghề nghiệp lâu dài)' },
          { en: 'She is working from home this week.', vi: 'Tuần này cô ấy làm việc ở nhà. (tạm thời)' }
        ]
      }
    ],
    errors: [
      { wrong: 'He go to school by bus.', right: 'He goes to school by bus.', why: 'Ngôi thứ ba số ít phải thêm -s/-es. Tiếng Việt không chia động từ nên người học rất hay quên.' },
      { wrong: "She doesn't likes coffee.", right: "She doesn't like coffee.", why: 'Đã có "does" mang dấu hiệu ngôi thứ ba thì động từ chính về nguyên thể.' }
    ],
    examples: [
      ['She works at a bank in Hanoi.', 'Cô ấy làm việc ở một ngân hàng tại Hà Nội.', 1, 'Trạng thái nghề nghiệp lâu dài.'],
      ['Water boils at 100 degrees Celsius.', 'Nước sôi ở 100 độ C.', 1, 'Sự thật hiển nhiên.'],
      ['The train leaves at 6.30 every morning.', 'Tàu khởi hành lúc 6 giờ 30 mỗi sáng.', 1, 'Lịch trình cố định.'],
      ['I usually get up at six.', 'Tôi thường dậy lúc sáu giờ.', 1, 'Thói quen, có trạng từ tần suất.'],
      ["My brother doesn't live with us any more.", 'Anh trai tôi không còn sống với chúng tôi nữa.', 1, 'Phủ định với "does not".'],
      ['Do you speak English?', 'Bạn có nói được tiếng Anh không?', 1, 'Nghi vấn với "do".'],
      ['He go to school by bus.', 'Anh ấy đi học bằng xe buýt.', 0, 'Sai: thiếu -es. Sửa thành "He goes to school by bus."'],
      ['I am working here every day.', 'Ngày nào tôi cũng làm ở đây.', 0, 'Sai: "every day" là thói quen nên dùng hiện tại đơn. Sửa thành "I work here every day."']
    ],
    practice: [
      ['My father ___ (work) in a hospital.', 'works', 'Bố tôi làm việc trong bệnh viện.'],
      ['They ___ (not / live) in Da Nang.', "don't live", 'Họ không sống ở Đà Nẵng.'],
      ['___ your sister ___ (like) durian?', 'Does … like', 'Chị bạn có thích sầu riêng không?'],
      ['The sun ___ (rise) in the east.', 'rises', 'Mặt trời mọc ở hướng đông.'],
      ['We usually ___ (have) lunch at noon.', 'have', 'Chúng tôi thường ăn trưa lúc 12 giờ.'],
      ['He ___ (study) English three times a week.', 'studies', 'Anh ấy học tiếng Anh ba buổi một tuần.'],
      ['The shop ___ (open) at 8 a.m. on Sundays.', 'opens', 'Cửa hàng mở cửa lúc 8 giờ sáng Chủ nhật.'],
      ['I ___ (not / understand) this question.', "don't understand", 'Tôi không hiểu câu hỏi này.'],
      ['___ it often ___ (rain) here in June?', 'Does … rain', 'Ở đây tháng Sáu có hay mưa không?'],
      ['My laptop ___ (not / work) properly.', "doesn't work", 'Máy tính của tôi chạy không ổn.'],
      ['Lan ___ (catch) the bus at seven every morning.', 'catches', 'Lan bắt xe buýt lúc bảy giờ mỗi sáng.'],
      ['Where ___ your parents ___ (live)?', 'do … live', 'Bố mẹ bạn sống ở đâu?']
    ]
  },

  /* ==================== 2. HIỆN TẠI TIẾP DIỄN ==================== */
  {
    slug: 'present-continuous',
    en: 'Present Continuous',
    vi: 'Hiện tại tiếp diễn',
    level: 'A1',
    summary: 'Việc đang xảy ra lúc nói, tình trạng tạm thời, hoặc kế hoạch đã hẹn chắc cho tương lai gần.',
    formula: {
      pos: 'S + am/is/are + V-ing',
      neg: 'S + am/is/are + not + V-ing',
      que: 'Am/Is/Are + S + V-ing?',
      note: 'Quy tắc thêm -ing: bỏ -e câm (make → making), gấp đôi phụ âm cuối khi âm tiết được nhấn kết thúc bằng nguyên âm + phụ âm (sit → sitting), -ie → -y (lie → lying).'
    },
    signals: ['now', 'right now', 'at the moment', 'at present', 'today', 'this week', 'Look!', 'Listen!'],
    useWhen: [
      'Hành động đang diễn ra ngay lúc nói.',
      'Tình trạng tạm thời quanh thời điểm hiện tại, không phải mãi mãi.',
      'Kế hoạch đã hẹn chắc chắn cho tương lai gần.',
      'Xu hướng đang thay đổi dần.',
      'Phàn nàn về thói quen khó chịu, đi với "always", "constantly", "forever".'
    ],
    useNot: [
      { what: 'Động từ chỉ trạng thái.', why: 'know, believe, understand, like, love, hate, want, need, belong, seem, own, contain — những từ này gần như không dùng dạng -ing.' },
      { what: 'Thói quen lặp lại đều đặn.', why: 'Dùng hiện tại đơn: "I go to the gym twice a week".' }
    ],
    confuse: [
      {
        with: 'Hiện tại đơn',
        tell: 'Hỏi "việc này thường xuyên hay chỉ lúc này?". Thường xuyên → hiện tại đơn; lúc này hoặc tạm thời → tiếp diễn.',
        pair: [
          { en: 'He teaches maths.', vi: 'Anh ấy dạy toán. (nghề)' },
          { en: 'He is teaching maths this semester.', vi: 'Học kỳ này anh ấy dạy toán. (tạm thời)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I am knowing the answer.', right: 'I know the answer.', why: '"know" là động từ trạng thái, không dùng dạng tiếp diễn.' },
      { wrong: 'She going to school now.', right: 'She is going to school now.', why: 'Thiếu trợ động từ "be". Tiếng Việt không có trợ động từ nên người học hay bỏ mất.' }
    ],
    examples: [
      ['She is talking on the phone right now.', 'Cô ấy đang nói chuyện điện thoại ngay lúc này.', 1, 'Đang xảy ra lúc nói.'],
      ['We are living in a rented flat this year.', 'Năm nay chúng tôi đang ở nhà thuê.', 1, 'Tình trạng tạm thời.'],
      ['I am meeting my supervisor at three tomorrow.', 'Ba giờ chiều mai tôi gặp giáo viên hướng dẫn.', 1, 'Kế hoạch đã hẹn chắc.'],
      ['Look! The bus is coming.', 'Nhìn kìa! Xe buýt đang tới.', 1, 'Sau "Look!" hoặc "Listen!" gần như luôn là tiếp diễn.'],
      ['More and more people are working from home.', 'Ngày càng nhiều người làm việc tại nhà.', 1, 'Xu hướng đang thay đổi.'],
      ['He is always losing his keys.', 'Anh ta suốt ngày làm mất chìa khoá.', 1, 'Phàn nàn — "always" ở đây mang sắc thái bực mình, không phải tần suất.'],
      ['I am knowing the answer.', 'Tôi biết câu trả lời.', 0, 'Sai: "know" là động từ trạng thái. Sửa thành "I know the answer."'],
      ['She going to school now.', 'Cô ấy đang tới trường.', 0, 'Sai: thiếu "is". Sửa thành "She is going to school now."']
    ],
    practice: [
      ['Be quiet! The baby ___ (sleep).', 'is sleeping', 'Im lặng nào! Em bé đang ngủ.'],
      ["I ___ (not / work) today; it's a holiday.", 'am not working', 'Hôm nay tôi không làm việc, hôm nay là ngày nghỉ.'],
      ['___ you ___ (wait) for someone?', 'Are … waiting', 'Bạn đang đợi ai à?'],
      ['They ___ (build) a new bridge across the river.', 'are building', 'Họ đang xây một cây cầu mới bắc qua sông.'],
      ['My phone ___ (not / charge) properly.', "isn't charging", 'Điện thoại của tôi sạc không vào.'],
      ['Listen! Someone ___ (knock) at the door.', 'is knocking', 'Nghe kìa! Có ai đang gõ cửa.'],
      ['We ___ (stay) with my aunt until Friday.', 'are staying', 'Chúng tôi ở nhà dì đến thứ Sáu.'],
      ['What ___ she ___ (do) at the moment?', 'is … doing', 'Lúc này cô ấy đang làm gì?'],
      ['Prices ___ (rise) very fast this year.', 'are rising', 'Năm nay giá cả tăng rất nhanh.'],
      ['He ___ (always / interrupt) me.', 'is always interrupting', 'Anh ta cứ ngắt lời tôi suốt.'],
      ['I ___ (meet) the dean tomorrow morning.', 'am meeting', 'Sáng mai tôi gặp trưởng khoa.'],
      ["The children ___ (not / play) outside because it's raining.", "aren't playing", 'Bọn trẻ không chơi ngoài sân vì trời đang mưa.']
    ]
  },

  /* ==================== 3. HIỆN TẠI HOÀN THÀNH ==================== */
  {
    slug: 'present-perfect',
    en: 'Present Perfect',
    vi: 'Hiện tại hoàn thành',
    level: 'A2',
    summary: 'Việc đã xảy ra nhưng còn dính tới hiện tại — kết quả còn đó, hoặc quãng thời gian chưa khép lại.',
    formula: {
      pos: 'S + have/has + V3 (quá khứ phân từ)',
      neg: 'S + have/has + not + V3',
      que: 'Have/Has + S + V3?',
      note: 'has dùng cho he/she/it, have cho các ngôi còn lại. V3 của động từ có quy tắc là V-ed; động từ bất quy tắc tra bảng V1–V2–V3.'
    },
    signals: ['already', 'yet', 'just', 'ever', 'never', 'so far', 'up to now', 'recently',
      'lately', 'for + khoảng thời gian', 'since + mốc thời gian', 'this week/month/year'],
    useWhen: [
      'Việc đã xong nhưng kết quả còn giá trị ở hiện tại.',
      'Trải nghiệm trong đời, không nói rõ lúc nào.',
      'Việc bắt đầu trong quá khứ và kéo dài tới hiện tại, đi với "for" hoặc "since".',
      'Việc vừa mới xảy ra, đi với "just".',
      'Việc xảy ra trong quãng thời gian chưa kết thúc: this week, today, this year.'
    ],
    useNot: [
      { what: 'Khi câu đã có mốc thời gian quá khứ xác định.', why: 'yesterday, last week, in 2019, two days ago, when I was a child → bắt buộc dùng quá khứ đơn.' },
      { what: 'Khi hỏi "When…?".', why: 'Câu hỏi "When" luôn nhắm tới một mốc quá khứ cụ thể nên đi với quá khứ đơn: "When did you finish?", không phải "When have you finished?".' }
    ],
    confuse: [
      {
        with: 'Quá khứ đơn',
        tell: 'Đây là lỗi kinh điển của người Việt vì tiếng Việt không chia thì. Quy tắc gọn: có mốc quá khứ xác định → quá khứ đơn; không có mốc, hoặc quãng thời gian còn mở → hiện tại hoàn thành.',
        pair: [
          { en: 'I have lost my wallet.', vi: 'Tôi làm mất ví rồi. — kết quả còn tới hiện tại, giờ vẫn chưa tìm thấy' },
          { en: 'I lost my wallet yesterday.', vi: 'Hôm qua tôi làm mất ví. — có mốc "yesterday" nên chỉ kể việc đã xong' }
        ]
      },
      {
        with: 'have been to / have gone to',
        tell: '"has been to" là đã đi và đã về; "has gone to" là đang trên đường hoặc còn ở đó.',
        pair: [
          { en: 'She has been to Japan twice.', vi: 'Cô ấy từng đi Nhật hai lần. (giờ đã về)' },
          { en: 'She has gone to Japan.', vi: 'Cô ấy đi Nhật rồi. (giờ đang ở Nhật)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I have seen that film last night.', right: 'I saw that film last night.', why: 'Đã có mốc quá khứ "last night" thì phải dùng quá khứ đơn.' },
      { wrong: 'She has worked here since five years.', right: 'She has worked here for five years.', why: '"since" đi với mốc thời gian (since 2020, since Monday); "for" đi với khoảng thời gian (for five years).' }
    ],
    examples: [
      ['I have finished my homework.', 'Tôi đã làm xong bài tập.', 1, 'Kết quả còn tới hiện tại: bài đã xong, giờ rảnh.'],
      ['She has lived in Hue since 2018.', 'Cô ấy sống ở Huế từ năm 2018.', 1, 'Bắt đầu trong quá khứ, còn kéo dài tới nay.'],
      ['Have you ever eaten bún bò Huế?', 'Bạn đã bao giờ ăn bún bò Huế chưa?', 1, 'Hỏi trải nghiệm, không cần biết lúc nào.'],
      ['He has just left the office.', 'Anh ấy vừa rời văn phòng.', 1, 'Vừa mới xảy ra.'],
      ["We haven't received your email yet.", 'Chúng tôi vẫn chưa nhận được email của bạn.', 1, '"yet" trong câu phủ định nghĩa là "vẫn chưa".'],
      ['I have read three books this month.', 'Tháng này tôi đọc được ba cuốn sách.', 1, 'Tháng chưa hết nên quãng thời gian còn mở.'],
      ['I have seen that film last night.', 'Tối qua tôi xem phim đó rồi.', 0, 'Sai: có "last night". Sửa thành "I saw that film last night."'],
      ['She has worked here since five years.', 'Cô ấy làm ở đây năm năm rồi.', 0, 'Sai: "since" phải đi với mốc. Sửa thành "for five years" hoặc "since 2020".']
    ],
    practice: [
      ['I ___ (never / be) to Japan.', 'have never been', 'Tôi chưa bao giờ đến Nhật.'],
      ['___ you ___ (finish) the report yet?', 'Have … finished', 'Bạn làm xong báo cáo chưa?'],
      ['She ___ (work) for this company for ten years.', 'has worked', 'Cô ấy làm cho công ty này mười năm rồi.'],
      ['We ___ (not / see) each other since graduation.', "haven't seen", 'Chúng tôi không gặp nhau từ hồi tốt nghiệp.'],
      ['He ___ (just / send) the file.', 'has just sent', 'Anh ấy vừa gửi tệp xong.'],
      ['They ___ (live) in that house since 2015.', 'have lived', 'Họ sống trong căn nhà đó từ năm 2015.'],
      ["My laptop ___ (break) — I can't open the file.", 'has broken', 'Máy tính của tôi hỏng rồi, tôi không mở được tệp.'],
      ['How many books ___ you ___ (read) this month?', 'have … read', 'Tháng này bạn đọc được mấy cuốn sách?'],
      ['The price of rice ___ (rise) sharply this year.', 'has risen', 'Năm nay giá gạo tăng mạnh.'],
      ['I ___ (already / tell) him three times.', 'have already told', 'Tôi đã nói với anh ta ba lần rồi.'],
      ['___ she ever ___ (take) an IELTS test?', 'Has … taken', 'Cô ấy đã bao giờ thi IELTS chưa?'],
      ['We ___ (not / decide) where to go yet.', "haven't decided", 'Chúng tôi vẫn chưa quyết định đi đâu.']
    ]
  },

  /* ============ 4. HIỆN TẠI HOÀN THÀNH TIẾP DIỄN ============ */
  {
    slug: 'present-perfect-continuous',
    en: 'Present Perfect Continuous',
    vi: 'Hiện tại hoàn thành tiếp diễn',
    level: 'B1',
    summary: 'Nhấn vào quá trình kéo dài từ quá khứ tới hiện tại, hoặc giải thích một dấu vết còn thấy được ngay lúc này.',
    formula: {
      pos: 'S + have/has + been + V-ing',
      neg: 'S + have/has + not + been + V-ing',
      que: 'Have/Has + S + been + V-ing?',
      note: 'Luôn có "been" ở giữa — thiếu "been" là lỗi hay gặp nhất ở thì này.'
    },
    signals: ['for', 'since', 'all day', 'all morning', 'lately', 'recently', 'How long…?'],
    useWhen: [
      'Nhấn mạnh việc kéo dài liên tục từ quá khứ đến hiện tại và thường còn tiếp.',
      'Giải thích nguyên nhân của một dấu vết đang thấy: thở dốc, mắt đỏ, tay bẩn.',
      'Hỏi hoặc trả lời "How long…?" với hành động có tính quá trình.'
    ],
    useNot: [
      { what: 'Động từ chỉ trạng thái.', why: 'know, believe, own, belong… luôn dùng hiện tại hoàn thành thường: "I have known her for years".' },
      { what: 'Khi nói rõ số lượng đã hoàn tất.', why: 'Nói bao nhiêu cái đã xong thì dùng hiện tại hoàn thành: "I have read three books", không phải "I have been reading three books".' }
    ],
    confuse: [
      {
        with: 'Hiện tại hoàn thành',
        tell: 'Hoàn thành nhấn KẾT QUẢ đã xong; hoàn thành tiếp diễn nhấn QUÁ TRÌNH và độ dài.',
        pair: [
          { en: 'I have painted the kitchen.', vi: 'Tôi sơn xong bếp rồi. — nhấn kết quả, bếp đã sơn xong' },
          { en: 'I have been painting the kitchen.', vi: 'Tôi sơn bếp nãy giờ. — nhấn quá trình, có thể chưa xong, người còn dính sơn' }
        ]
      }
    ],
    errors: [
      { wrong: 'I have been knowing her for years.', right: 'I have known her for years.', why: '"know" là động từ trạng thái nên không có dạng tiếp diễn.' },
      { wrong: 'I have been reading three books this month.', right: 'I have read three books this month.', why: 'Có con số cụ thể đã hoàn tất thì dùng hiện tại hoàn thành.' }
    ],
    examples: [
      ['I have been studying English for six years.', 'Tôi học tiếng Anh được sáu năm rồi.', 1, 'Nhấn độ dài của quá trình.'],
      ['She has been waiting since eight a.m.', 'Cô ấy đợi từ tám giờ sáng.', 1, '"since" cho mốc bắt đầu.'],
      ['It has been raining all morning.', 'Trời mưa suốt cả buổi sáng.', 1, 'Kéo dài liên tục và còn đang mưa.'],
      ['Your eyes are red. Have you been crying?', 'Mắt bạn đỏ kìa. Bạn vừa khóc à?', 1, 'Suy ra nguyên nhân từ dấu vết còn thấy.'],
      ['They have been building that bridge for two years.', 'Họ xây cây cầu đó hai năm nay rồi.', 1, 'Quá trình chưa kết thúc.'],
      ['How long have you been working here?', 'Bạn làm ở đây bao lâu rồi?', 1, 'Câu hỏi "How long" điển hình.'],
      ['I have been knowing her for years.', 'Tôi biết cô ấy nhiều năm rồi.', 0, 'Sai: động từ trạng thái. Sửa thành "I have known her for years."'],
      ['She has waiting for an hour.', 'Cô ấy đợi một tiếng rồi.', 0, 'Sai: thiếu "been". Sửa thành "She has been waiting for an hour."']
    ],
    practice: [
      ['He ___ (work) in the garden since lunchtime.', 'has been working', 'Anh ấy làm vườn từ trưa tới giờ.'],
      ['How long ___ you ___ (learn) Japanese?', 'have … been learning', 'Bạn học tiếng Nhật bao lâu rồi?'],
      ['They ___ (argue) all evening.', 'have been arguing', 'Họ cãi nhau suốt cả buổi tối.'],
      ["I'm tired because I ___ (run).", 'have been running', 'Tôi mệt vì vừa chạy bộ.'],
      ['She ___ (not / feel) well lately.', "hasn't been feeling", 'Dạo này cô ấy thấy trong người không khoẻ.'],
      ['It ___ (snow) since midnight.', 'has been snowing', 'Tuyết rơi từ nửa đêm tới giờ.'],
      ['We ___ (wait) for the bus for half an hour.', 'have been waiting', 'Chúng tôi đợi xe buýt nửa tiếng rồi.'],
      ['My sister ___ (study) for her exam all week.', 'has been studying', 'Chị tôi ôn thi suốt cả tuần.'],
      ['___ you ___ (use) my laptop? The battery is flat.', 'Have … been using', 'Bạn dùng máy tính của tôi à? Hết pin rồi.'],
      ["The children ___ (play) outside since three o'clock.", 'have been playing', 'Bọn trẻ chơi ngoài sân từ ba giờ.'],
      ['He ___ (try) to call you all day.', 'has been trying', 'Anh ấy gọi cho bạn cả ngày nay.'],
      ['Prices ___ (go) up steadily since January.', 'have been going', 'Giá cả tăng đều từ tháng Giêng tới giờ.']
    ]
  },

  /* ==================== 5. QUÁ KHỨ ĐƠN ==================== */
  {
    slug: 'past-simple',
    en: 'Past Simple',
    vi: 'Quá khứ đơn',
    level: 'A1',
    summary: 'Việc đã xong hẳn tại một mốc quá khứ xác định — kể chuyện đã qua.',
    formula: {
      pos: 'S + V2 (động từ có quy tắc thêm -ed)',
      neg: 'S + did + not + V(nguyên thể)',
      que: 'Did + S + V(nguyên thể)?',
      note: 'Với "to be": I/he/she/it was, you/we/they were. Sau "did" động từ luôn về nguyên thể.'
    },
    signals: ['yesterday', 'last night', 'last week', 'two days ago', 'in 2010',
      'when I was young', 'then', 'at that time'],
    useWhen: [
      'Việc đã xảy ra và kết thúc tại một mốc quá khứ xác định.',
      'Chuỗi hành động nối tiếp nhau trong quá khứ.',
      'Thói quen hoặc trạng thái trong quá khứ nay không còn.',
      'Kể chuyện, thuật lại diễn biến.'
    ],
    useNot: [
      { what: 'Khi việc còn liên hệ tới hiện tại và không có mốc quá khứ.', why: 'Dùng hiện tại hoàn thành: "I have lost my keys" (giờ vẫn chưa tìm thấy).' },
      { what: 'Cho hành động nền đang diễn ra thì bị cắt ngang.', why: 'Nền dùng quá khứ tiếp diễn: "I was cooking when he arrived".' }
    ],
    confuse: [
      {
        with: 'Hiện tại hoàn thành',
        tell: 'Nhìn có mốc thời gian quá khứ hay không. Có mốc → quá khứ đơn.',
        pair: [
          { en: 'He arrived at 9 a.m.', vi: 'Anh ấy đến lúc 9 giờ sáng. (có mốc)' },
          { en: 'He has arrived.', vi: 'Anh ấy đến rồi. (giờ đang ở đây)' }
        ]
      },
      {
        with: 'Quá khứ tiếp diễn',
        tell: 'Quá khứ đơn cho việc ngắn đã xong; quá khứ tiếp diễn cho việc đang diễn ra làm nền.',
        pair: [
          { en: 'When she called, I cooked dinner.', vi: 'Khi cô ấy gọi, tôi (mới bắt đầu) nấu bữa tối.' },
          { en: 'When she called, I was cooking dinner.', vi: 'Khi cô ấy gọi, tôi đang nấu bữa tối.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Did you went to the party?', right: 'Did you go to the party?', why: 'Đã có "did" mang dấu hiệu quá khứ thì động từ chính về nguyên thể.' },
      { wrong: 'Yesterday I go to the library.', right: 'Yesterday I went to the library.', why: 'Tiếng Việt không chia thì nên người học hay để nguyên động từ dù đã có "yesterday".' }
    ],
    examples: [
      ['I visited my grandparents last weekend.', 'Cuối tuần trước tôi về thăm ông bà.', 1, 'Mốc quá khứ rõ ràng.'],
      ['She graduated from university in 2020.', 'Cô ấy tốt nghiệp đại học năm 2020.', 1, 'Việc đã xong hẳn.'],
      ["We didn't go out because it was raining.", 'Chúng tôi không ra ngoài vì trời mưa.', 1, 'Phủ định với "did not".'],
      ['Did you finish the assignment on time?', 'Bạn có nộp bài đúng hạn không?', 1, 'Nghi vấn với "did".'],
      ['He opened the door, took his bag and left.', 'Anh ấy mở cửa, cầm túi rồi đi.', 1, 'Chuỗi hành động nối tiếp.'],
      ['When I was a child, I lived in the countryside.', 'Hồi nhỏ tôi sống ở quê.', 1, 'Trạng thái quá khứ nay không còn.'],
      ['Did you went to the party?', 'Bạn có đi bữa tiệc không?', 0, 'Sai: sau "did" phải là nguyên thể. Sửa thành "Did you go to the party?"'],
      ['Yesterday I go to the library.', 'Hôm qua tôi tới thư viện.', 0, 'Sai: có "yesterday" thì phải chia quá khứ. Sửa thành "Yesterday I went to the library."']
    ],
    practice: [
      ['She ___ (buy) a new bike last month.', 'bought', 'Tháng trước cô ấy mua một chiếc xe đạp mới.'],
      ['We ___ (not / have) enough time to finish.', "didn't have", 'Chúng tôi không có đủ thời gian để làm xong.'],
      ['___ they ___ (arrive) on time?', 'Did … arrive', 'Họ có đến đúng giờ không?'],
      ['He ___ (write) three emails yesterday morning.', 'wrote', 'Sáng qua anh ấy viết ba cái email.'],
      ['I ___ (not / know) the answer at that time.', "didn't know", 'Lúc đó tôi không biết câu trả lời.'],
      ['The film ___ (begin) at eight and ___ (end) at ten.', 'began … ended', 'Phim bắt đầu lúc tám giờ và kết thúc lúc mười giờ.'],
      ['What time ___ you ___ (leave) home?', 'did … leave', 'Bạn rời nhà lúc mấy giờ?'],
      ['My parents ___ (meet) in 1995.', 'met', 'Bố mẹ tôi gặp nhau năm 1995.'],
      ['She ___ (not / say) anything about it.', "didn't say", 'Cô ấy không nói gì về chuyện đó.'],
      ['They ___ (build) this school ten years ago.', 'built', 'Họ xây ngôi trường này mười năm trước.'],
      ['___ he ___ (pass) the entrance exam?', 'Did … pass', 'Anh ấy có đỗ kỳ thi đầu vào không?'],
      ['I ___ (see) her at the market yesterday.', 'saw', 'Hôm qua tôi thấy cô ấy ngoài chợ.']
    ]
  },

  /* ==================== 6. QUÁ KHỨ TIẾP DIỄN ==================== */
  {
    slug: 'past-continuous',
    en: 'Past Continuous',
    vi: 'Quá khứ tiếp diễn',
    level: 'A2',
    summary: 'Việc đang diễn ra tại một thời điểm trong quá khứ, thường làm nền cho một việc khác chen vào.',
    formula: {
      pos: 'S + was/were + V-ing',
      neg: 'S + was/were + not + V-ing',
      que: 'Was/Were + S + V-ing?',
      note: 'was cho I/he/she/it, were cho you/we/they.'
    },
    signals: ['at 8 p.m. yesterday', 'while', 'when', 'at that moment', 'all evening', 'this time last week'],
    useWhen: [
      'Việc đang diễn ra tại một thời điểm cụ thể trong quá khứ.',
      'Việc dài làm nền bị một việc ngắn cắt ngang: nền dùng tiếp diễn, việc chen vào dùng quá khứ đơn.',
      'Hai việc diễn ra song song, thường nối bằng "while".',
      'Tả bối cảnh mở đầu một câu chuyện.'
    ],
    useNot: [
      { what: 'Động từ chỉ trạng thái.', why: '"I was knowing" luôn sai; dùng "I knew".' },
      { what: 'Chuỗi hành động ngắn nối tiếp nhau.', why: 'Dùng quá khứ đơn: "He stood up, opened the door and went out".' }
    ],
    confuse: [
      {
        with: 'Quá khứ đơn',
        tell: 'Trong cặp "while / when": mệnh đề có "while" thường là nền (tiếp diễn), mệnh đề có "when" thường là việc chen vào (quá khứ đơn).',
        pair: [
          { en: 'While I was cooking, the phone rang.', vi: 'Trong lúc tôi đang nấu ăn thì điện thoại reo.' },
          { en: 'When the phone rang, I answered it.', vi: 'Khi điện thoại reo, tôi nghe máy. (hai việc ngắn nối tiếp)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I was know the answer.', right: 'I knew the answer.', why: 'Động từ trạng thái không dùng dạng tiếp diễn, và sau "was" phải là V-ing.' },
      { wrong: 'While she cooked, the phone rang.', right: 'While she was cooking, the phone rang.', why: 'Hành động nền kéo dài phải dùng quá khứ tiếp diễn.' }
    ],
    examples: [
      ['At nine last night I was watching a film.', 'Chín giờ tối qua tôi đang xem phim.', 1, 'Đang diễn ra tại một thời điểm quá khứ.'],
      ['She was cooking when the power went out.', 'Cô ấy đang nấu ăn thì mất điện.', 1, 'Nền tiếp diễn, việc chen vào dùng quá khứ đơn.'],
      ['While I was waiting, I read the news.', 'Trong lúc đợi, tôi đọc tin tức.', 1, '"while" dẫn mệnh đề nền.'],
      ['They were arguing all evening.', 'Họ cãi nhau suốt cả buổi tối.', 1, 'Kéo dài trong một khoảng quá khứ.'],
      ['The sun was shining and the birds were singing.', 'Nắng chiếu và chim hót.', 1, 'Tả bối cảnh mở truyện.'],
      ['What were you doing at that moment?', 'Lúc đó bạn đang làm gì?', 1, 'Câu hỏi về hoạt động đang diễn ra.'],
      ['I was know the answer.', 'Tôi biết câu trả lời.', 0, 'Sai hai lỗi: động từ trạng thái, và sau "was" phải là V-ing. Sửa thành "I knew the answer."'],
      ['While she cooked, the phone rang.', 'Trong lúc cô ấy nấu ăn thì điện thoại reo.', 0, 'Sai: nền phải là tiếp diễn. Sửa thành "While she was cooking, the phone rang."']
    ],
    practice: [
      ['I ___ (study) when you called.', 'was studying', 'Tôi đang học thì bạn gọi.'],
      ['They ___ (not / listen) to the teacher.', "weren't listening", 'Họ không nghe cô giáo giảng.'],
      ['What ___ you ___ (do) at seven last night?', 'were … doing', 'Bảy giờ tối qua bạn đang làm gì?'],
      ['While we ___ (walk) home, it started to rain.', 'were walking', 'Trong lúc chúng tôi đi bộ về nhà thì trời bắt đầu mưa.'],
      ['She ___ (drive) to work when she saw the accident.', 'was driving', 'Cô ấy đang lái xe đi làm thì thấy vụ tai nạn.'],
      ['The children ___ (play) in the yard all afternoon.', 'were playing', 'Bọn trẻ chơi ngoài sân suốt cả buổi chiều.'],
      ['He ___ (not / work) when I visited him.', "wasn't working", 'Anh ấy không làm việc lúc tôi tới thăm.'],
      ['___ it ___ (rain) when you left?', 'Was … raining', 'Lúc bạn về trời có đang mưa không?'],
      ['My brother ___ (sleep) while I ___ (cook) dinner.', 'was sleeping … was cooking', 'Em trai tôi đang ngủ trong lúc tôi nấu bữa tối.'],
      ['We ___ (wait) for the bus when the storm began.', 'were waiting', 'Chúng tôi đang đợi xe buýt thì bão nổi lên.'],
      ['She ___ (write) an email at that moment.', 'was writing', 'Lúc đó cô ấy đang viết email.'],
      ['They ___ (not / pay) attention, so they missed the announcement.', "weren't paying", 'Họ không để ý nên bỏ lỡ thông báo.']
    ]
  },

  /* ==================== 7. QUÁ KHỨ HOÀN THÀNH ==================== */
  {
    slug: 'past-perfect',
    en: 'Past Perfect',
    vi: 'Quá khứ hoàn thành',
    level: 'B1',
    summary: 'Việc xảy ra TRƯỚC một mốc quá khứ khác — cần có hai mốc thì thì này mới có nghĩa.',
    formula: {
      pos: 'S + had + V3',
      neg: 'S + had + not + V3',
      que: 'Had + S + V3?',
      note: '"had" dùng chung cho mọi ngôi.'
    },
    signals: ['before', 'after', 'by the time', 'already', 'when', 'until then', 'no sooner… than'],
    useWhen: [
      'Việc xảy ra trước một việc hoặc một mốc quá khứ khác.',
      'Lùi thì trong câu tường thuật: hiện tại hoàn thành và quá khứ đơn đều lùi thành quá khứ hoàn thành.',
      'Câu điều kiện loại 3 và câu ước về quá khứ: "If I had known…", "I wish I had studied…".'
    ],
    useNot: [
      { what: 'Khi chỉ có một hành động quá khứ duy nhất.', why: 'Không có mốc thứ hai làm chuẩn thì dùng quá khứ đơn: "I went to school yesterday".' },
      { what: 'Khi "before" hoặc "after" đã nói rõ trật tự.', why: 'Trật tự đã rõ nên quá khứ đơn cho cả hai vế cũng chấp nhận được: "After he finished, he left".' }
    ],
    confuse: [
      {
        with: 'Quá khứ đơn',
        tell: 'Hỏi "việc nào xảy ra trước?". Việc xảy ra trước dùng quá khứ hoàn thành, việc sau dùng quá khứ đơn.',
        pair: [
          { en: 'When we arrived, the film started.', vi: 'Khi chúng tôi tới thì phim bắt đầu. (tới trước, phim chiếu sau)' },
          { en: 'When we arrived, the film had started.', vi: 'Khi chúng tôi tới thì phim đã bắt đầu rồi. (phim chiếu trước)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I had gone to school yesterday.', right: 'I went to school yesterday.', why: 'Chỉ có một hành động quá khứ, không có mốc thứ hai nên không cần quá khứ hoàn thành.' },
      { wrong: 'When I arrived, he already left.', right: 'When I arrived, he had already left.', why: 'Việc xảy ra trước phải dùng quá khứ hoàn thành.' }
    ],
    examples: [
      ['When we arrived, the film had already started.', 'Khi chúng tôi tới thì phim đã bắt đầu rồi.', 1, 'Phim bắt đầu trước lúc tới.'],
      ['She had never flown before that trip.', 'Trước chuyến đi đó cô ấy chưa từng đi máy bay.', 1, 'Trải nghiệm tính đến một mốc quá khứ.'],
      ['By the time he called, I had finished the report.', 'Đến lúc anh ấy gọi thì tôi đã xong báo cáo.', 1, '"By the time" là dấu hiệu rất điển hình.'],
      ["They couldn't get in because they had lost the key.", 'Họ không vào được vì đã làm mất chìa khoá.', 1, 'Nguyên nhân xảy ra trước kết quả.'],
      ['He told me he had seen the film.', 'Anh ấy bảo đã xem phim đó rồi.', 1, 'Lùi thì trong câu tường thuật.'],
      ['After she had submitted the form, she went home.', 'Sau khi nộp đơn xong, cô ấy về nhà.', 1, 'Nhấn mạnh trật tự trước sau.'],
      ['I had gone to school yesterday.', 'Hôm qua tôi đi học.', 0, 'Sai: chỉ một hành động quá khứ. Sửa thành "I went to school yesterday."'],
      ['When I arrived, he already left.', 'Khi tôi tới thì anh ấy đã đi rồi.', 0, 'Sai: thiếu "had". Sửa thành "he had already left".']
    ],
    practice: [
      ['When I got home, my family ___ (already / eat).', 'had already eaten', 'Khi tôi về tới nhà thì cả nhà đã ăn xong.'],
      ['She ___ (not / finish) the test when the bell rang.', "hadn't finished", 'Cô ấy chưa làm xong bài thì chuông reo.'],
      ['By 2020 he ___ (work) there for five years.', 'had worked', 'Đến năm 2020, anh ấy đã làm ở đó được năm năm.'],
      ['They were late because they ___ (miss) the train.', 'had missed', 'Họ tới muộn vì đã lỡ chuyến tàu.'],
      ['___ you ___ (meet) him before the party?', 'Had … met', 'Bạn đã gặp anh ấy trước bữa tiệc chưa?'],
      ['After the guests ___ (leave), we cleaned the house.', 'had left', 'Sau khi khách về, chúng tôi dọn nhà.'],
      ["I couldn't pay because I ___ (forget) my wallet.", 'had forgotten', 'Tôi không trả được vì đã quên ví.'],
      ['The road was wet; it ___ (rain) during the night.', 'had rained', 'Đường ướt, đêm qua trời đã mưa.'],
      ['She said she ___ (never / visit) Hanoi.', 'had never visited', 'Cô ấy nói chưa bao giờ đến Hà Nội.'],
      ['By the time we arrived, the shop ___ (close).', 'had closed', 'Đến lúc chúng tôi tới thì cửa hàng đã đóng.'],
      ['He ___ (not / study) English before he moved to Australia.', "hadn't studied", 'Anh ấy chưa học tiếng Anh trước khi sang Úc.'],
      ['We ___ (finish) dinner by the time the film started.', 'had finished', 'Chúng tôi đã ăn tối xong trước lúc phim bắt đầu.']
    ]
  },

  /* ============ 8. QUÁ KHỨ HOÀN THÀNH TIẾP DIỄN ============ */
  {
    slug: 'past-perfect-continuous',
    en: 'Past Perfect Continuous',
    vi: 'Quá khứ hoàn thành tiếp diễn',
    level: 'B2',
    summary: 'Nhấn vào độ dài của một quá trình tính đến một mốc trong quá khứ.',
    formula: {
      pos: 'S + had + been + V-ing',
      neg: 'S + had + not + been + V-ing',
      que: 'Had + S + been + V-ing?',
      note: 'Đừng nhầm "had been + V-ing" (hoàn thành tiếp diễn) với "had been + V3" (bị động hoàn thành): "had been working" khác hẳn "had been finished".'
    },
    signals: ['for', 'since', 'before', 'all day', 'How long…?'],
    useWhen: [
      'Nhấn mạnh một quá trình kéo dài liên tục cho tới một mốc quá khứ.',
      'Giải thích nguyên nhân của một trạng thái đã thấy trong quá khứ: mệt, ướt, bẩn.'
    ],
    useNot: [
      { what: 'Động từ chỉ trạng thái.', why: 'Dùng quá khứ hoàn thành thường: "She had known him for years".' },
      { what: 'Khi chỉ cần nói việc đã xong.', why: 'Dùng quá khứ hoàn thành: "He had finished his homework before dinner".' }
    ],
    confuse: [
      {
        with: 'Quá khứ hoàn thành',
        tell: 'Hoàn thành nói việc đã xong; hoàn thành tiếp diễn nói việc đã kéo dài bao lâu.',
        pair: [
          { en: 'He had written three reports.', vi: 'Anh ấy đã viết xong ba báo cáo. — nhấn số lượng đã hoàn tất' },
          { en: 'He had been writing reports all night.', vi: 'Anh ấy viết báo cáo suốt đêm. — nhấn độ dài quá trình' }
        ]
      }
    ],
    errors: [
      { wrong: 'She had been knowing him for years.', right: 'She had known him for years.', why: '"know" là động từ trạng thái.' },
      { wrong: 'They had been waiting the bus for an hour.', right: 'They had been waiting for the bus for an hour.', why: '"wait" luôn đi với giới từ "for" khi có tân ngữ.' }
    ],
    examples: [
      ['He had been driving for six hours before he stopped.', 'Anh ấy lái xe sáu tiếng liền rồi mới dừng.', 1, 'Độ dài quá trình tính tới mốc "before he stopped".'],
      ['She was tired because she had been working all night.', 'Cô ấy mệt vì đã làm việc suốt đêm.', 1, 'Giải thích nguyên nhân của trạng thái quá khứ.'],
      ['They had been waiting for an hour when the train finally came.', 'Họ đợi một tiếng thì tàu mới tới.', 1, 'Kéo dài cho tới lúc việc khác xảy ra.'],
      ['The ground was wet because it had been raining.', 'Mặt đất ướt vì trời đã mưa.', 1, 'Dấu vết còn lại trong quá khứ.'],
      ['I had been studying French for two years before I moved to Paris.', 'Tôi học tiếng Pháp hai năm rồi mới chuyển sang Paris.', 1, 'Có cả "for" và mốc quá khứ.'],
      ['How long had you been living there before you sold the house?', 'Bạn ở đó bao lâu rồi mới bán nhà?', 1, 'Câu hỏi "How long" ở quá khứ.'],
      ['She had been knowing him for years.', 'Cô ấy biết anh ta nhiều năm rồi.', 0, 'Sai: động từ trạng thái. Sửa thành "She had known him for years."'],
      ['They had been waiting the bus for an hour.', 'Họ đợi xe buýt một tiếng rồi.', 0, 'Sai: thiếu giới từ. Sửa thành "waiting for the bus".']
    ],
    practice: [
      ['She ___ (work) at the hospital for ten years before she retired.', 'had been working', 'Cô ấy làm ở bệnh viện mười năm rồi mới nghỉ hưu.'],
      ['They ___ (wait) for hours when the flight was finally announced.', 'had been waiting', 'Họ đợi mấy tiếng thì chuyến bay mới được thông báo.'],
      ['He was out of breath because he ___ (run).', 'had been running', 'Anh ấy thở dốc vì vừa chạy.'],
      ['I ___ (not / sleep) well before the exam.', "hadn't been sleeping", 'Trước kỳ thi tôi ngủ không ngon.'],
      ['How long ___ you ___ (study) there before you graduated?', 'had … been studying', 'Bạn học ở đó bao lâu rồi mới tốt nghiệp?'],
      ['The children were dirty because they ___ (play) in the mud.', 'had been playing', 'Bọn trẻ bẩn hết vì đã nghịch bùn.'],
      ['We ___ (drive) for three hours when the car broke down.', 'had been driving', 'Chúng tôi lái xe được ba tiếng thì xe hỏng.'],
      ['She ___ (live) in Hue for years before moving to Saigon.', 'had been living', 'Cô ấy sống ở Huế nhiều năm rồi mới vào Sài Gòn.'],
      ['My eyes hurt because I ___ (stare) at the screen all day.', 'had been staring', 'Mắt tôi đau vì nhìn màn hình cả ngày.'],
      ['They ___ (not / talk) long when the manager came in.', "hadn't been talking", 'Họ nói chuyện chưa được bao lâu thì quản lý bước vào.'],
      ['He ___ (try) to fix it for an hour before he gave up.', 'had been trying', 'Anh ấy loay hoay sửa một tiếng rồi mới bỏ cuộc.'],
      ['It ___ (rain) all night, so the river was high.', 'had been raining', 'Trời mưa suốt đêm nên nước sông dâng cao.']
    ]
  },

  /* ==================== 9. TƯƠNG LAI ĐƠN ==================== */
  {
    slug: 'future-simple',
    en: 'Future Simple (will)',
    vi: 'Tương lai đơn',
    level: 'A2',
    summary: 'Quyết định ngay lúc nói, dự đoán theo cảm nhận, lời hứa và đề nghị.',
    formula: {
      pos: 'S + will + V(nguyên thể)',
      neg: 'S + will not (won’t) + V',
      que: 'Will + S + V?',
      note: 'Xét về hình thái, "will" là trợ động từ tình thái chứ không phải đuôi chia thì; cách gọi "thì tương lai" chỉ là quy ước dạy học.'
    },
    signals: ['tomorrow', 'next week', 'in 2030', 'soon', 'I think', 'probably', 'perhaps', "I'm sure"],
    useWhen: [
      'Quyết định bật ra ngay lúc nói, không chuẩn bị trước.',
      'Dự đoán dựa trên ý kiến hoặc cảm nhận cá nhân, hay đi với "I think", "probably".',
      'Lời hứa, lời đề nghị giúp đỡ, lời yêu cầu lịch sự.',
      'Sự thật tương lai không đổi được: tuổi tác, mùa, lịch tự nhiên.'
    ],
    useNot: [
      { what: 'Kế hoạch đã sắp xếp từ trước.', why: 'Dùng hiện tại tiếp diễn: "I am meeting the doctor at nine tomorrow".' },
      { what: 'Dự đoán có bằng chứng ngay trước mắt.', why: 'Dùng "be going to": trời đã đen kịt thì nói "It is going to rain", không phải "It will rain".' },
      { what: 'Trong mệnh đề bắt đầu bằng if, when, before, after, as soon as, until.', why: 'Mệnh đề chỉ thời gian và điều kiện dùng hiện tại đơn: "I will call you when I arrive".' }
    ],
    confuse: [
      {
        with: 'be going to',
        tell: '"will" cho quyết định tức thì và dự đoán theo cảm nhận; "be going to" cho dự định đã có sẵn trong đầu và dự đoán có bằng chứng.',
        pair: [
          { en: "The phone is ringing. I'll get it.", vi: 'Điện thoại reo kìa. Để tôi nghe. (quyết định tức thì)' },
          { en: "I'm going to study medicine.", vi: 'Tôi định học ngành y. (dự định đã có từ trước)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If it will rain, we will stay home.', right: 'If it rains, we will stay home.', why: 'Mệnh đề "if" chỉ điều kiện dùng hiện tại đơn, không dùng "will".' },
      { wrong: 'I will meet my doctor at nine tomorrow — I booked it last week.', right: 'I am meeting my doctor at nine tomorrow.', why: 'Đã đặt lịch từ tuần trước nên là kế hoạch sắp xếp sẵn, dùng hiện tại tiếp diễn.' }
    ],
    examples: [
      ['I think it will rain tomorrow.', 'Tôi nghĩ mai trời sẽ mưa.', 1, 'Dự đoán theo cảm nhận, có "I think".'],
      ["That bag looks heavy — I'll help you.", 'Cái túi trông nặng đấy, để tôi giúp.', 1, 'Quyết định bật ra ngay lúc nói.'],
      ["I promise I won't tell anyone.", 'Tôi hứa sẽ không nói với ai.', 1, 'Lời hứa.'],
      ['Will you open the window, please?', 'Bạn mở giúp cửa sổ được không?', 1, 'Yêu cầu lịch sự.'],
      ['She will be twenty next month.', 'Tháng sau cô ấy tròn hai mươi tuổi.', 1, 'Sự thật tương lai không đổi được.'],
      ["Don't worry, I'll call you as soon as I arrive.", 'Đừng lo, tôi sẽ gọi ngay khi tới nơi.', 1, 'Mệnh đề "as soon as" dùng hiện tại đơn.'],
      ['If it will rain, we will stay home.', 'Nếu trời mưa thì chúng ta ở nhà.', 0, 'Sai: sau "if" dùng hiện tại đơn. Sửa thành "If it rains, we will stay home."'],
      ['It will rain — look at those black clouds.', 'Trời sắp mưa, nhìn mây đen kìa.', 0, 'Sai sắc thái: đã có bằng chứng trước mắt thì dùng "It is going to rain".']
    ],
    practice: [
      ['I think she ___ (pass) the exam.', 'will pass', 'Tôi nghĩ cô ấy sẽ đỗ kỳ thi.'],
      ['___ you ___ (help) me with this box?', 'Will … help', 'Bạn khiêng giúp tôi cái thùng này được không?'],
      ['We ___ (not / be) late, I promise.', "won't be", 'Chúng tôi sẽ không tới muộn, tôi hứa đấy.'],
      ['If you study hard, you ___ (get) a good score.', 'will get', 'Nếu bạn học chăm, bạn sẽ được điểm cao.'],
      ['Perhaps it ___ (be) cold tomorrow.', 'will be', 'Có lẽ mai trời sẽ lạnh.'],
      ["I'm thirsty. I ___ (buy) a bottle of water.", 'will buy', 'Tôi khát. Tôi sẽ mua một chai nước.'],
      ['He ___ (not / agree) with that idea.', "won't agree", 'Anh ấy sẽ không đồng ý với ý đó đâu.'],
      ['When ___ they ___ (announce) the results?', 'will … announce', 'Khi nào họ công bố kết quả?'],
      ["I'm sure everything ___ (be) fine.", 'will be', 'Tôi chắc là mọi chuyện sẽ ổn thôi.'],
      ['She ___ (probably / arrive) around noon.', 'will probably arrive', 'Chắc tầm trưa cô ấy sẽ tới.'],
      ['___ he ___ (come) to the meeting?', 'Will … come', 'Anh ấy có tới họp không?'],
      ['We ___ (not / know) the answer until Friday.', "won't know", 'Đến thứ Sáu chúng tôi mới biết kết quả.']
    ]
  },

  /* ==================== 10. TƯƠNG LAI TIẾP DIỄN ==================== */
  {
    slug: 'future-continuous',
    en: 'Future Continuous',
    vi: 'Tương lai tiếp diễn',
    level: 'B1',
    summary: 'Việc sẽ đang diễn ra tại một thời điểm trong tương lai.',
    formula: {
      pos: 'S + will be + V-ing',
      neg: 'S + will not be + V-ing',
      que: 'Will + S + be + V-ing?',
      note: 'Luôn có "be" giữa "will" và V-ing.'
    },
    signals: ['at this time tomorrow', 'at eight tomorrow', 'this time next week', 'all day tomorrow'],
    useWhen: [
      'Việc sẽ đang diễn ra tại một thời điểm cụ thể trong tương lai.',
      'Việc chắc chắn sẽ xảy ra theo lẽ thường, không cần bàn thêm.',
      'Hỏi lịch trình của người khác một cách lịch sự, không có ý nhờ vả.'
    ],
    useNot: [
      { what: 'Động từ chỉ trạng thái.', why: 'Dùng tương lai đơn: "I will know the result tomorrow".' }
    ],
    confuse: [
      {
        with: 'Tương lai đơn',
        tell: '"Will you…?" nghe như một lời nhờ; "Will you be …-ing?" chỉ là hỏi thăm lịch trình, lịch sự hơn.',
        pair: [
          { en: 'Will you use the car tonight?', vi: 'Tối nay anh dùng xe nhé? (nghe như đang nhờ hoặc gợi ý)' },
          { en: 'Will you be using the car tonight?', vi: 'Tối nay anh có dùng xe không? (chỉ hỏi cho biết)' }
        ]
      }
    ],
    errors: [
      { wrong: 'At eight tomorrow I will studying.', right: 'At eight tomorrow I will be studying.', why: 'Thiếu "be".' },
      { wrong: 'This time next year I will be knowing the result.', right: 'This time next year I will know the result.', why: '"know" là động từ trạng thái.' }
    ],
    examples: [
      ['At nine tomorrow I will be taking the exam.', 'Chín giờ mai tôi sẽ đang thi.', 1, 'Đang diễn ra tại một mốc tương lai.'],
      ['This time next week we will be flying to Korea.', 'Giờ này tuần sau chúng tôi sẽ đang bay sang Hàn Quốc.', 1, '"this time next week" là dấu hiệu điển hình.'],
      ["Don't call at seven — I'll be having dinner.", 'Đừng gọi lúc bảy giờ, lúc đó tôi đang ăn tối.', 1, 'Giải thích vì sao không tiện.'],
      ['Will you be using the car tonight?', 'Tối nay bạn có dùng xe không?', 1, 'Hỏi lịch trình một cách lịch sự.'],
      ["He'll be working late all week.", 'Cả tuần này anh ấy sẽ làm muộn.', 1, 'Kéo dài trong một khoảng tương lai.'],
      ['They will not be waiting for us at the airport.', 'Họ sẽ không đợi chúng ta ở sân bay.', 1, 'Phủ định.'],
      ['At eight tomorrow I will studying.', 'Tám giờ mai tôi sẽ đang học.', 0, 'Sai: thiếu "be". Sửa thành "I will be studying."'],
      ['This time next year I will be knowing the result.', 'Giờ này năm sau tôi sẽ biết kết quả.', 0, 'Sai: động từ trạng thái. Sửa thành "I will know the result."']
    ],
    practice: [
      ['At ten tomorrow we ___ (drive) to Sapa.', 'will be driving', 'Mười giờ mai chúng tôi sẽ đang trên đường lên Sa Pa.'],
      ['___ you ___ (work) this weekend?', 'Will … be working', 'Cuối tuần này bạn có làm việc không?'],
      ['This time next month she ___ (study) in Australia.', 'will be studying', 'Giờ này tháng sau cô ấy sẽ đang học ở Úc.'],
      ["Don't come at six — I ___ (cook) dinner.", 'will be cooking', 'Đừng tới lúc sáu giờ, lúc đó tôi đang nấu bữa tối.'],
      ['They ___ (not / wait) for us.', "won't be waiting", 'Họ sẽ không đợi chúng ta đâu.'],
      ['At midnight the whole family ___ (sleep).', 'will be sleeping', 'Nửa đêm thì cả nhà đang ngủ.'],
      ['What ___ you ___ (do) at this time tomorrow?', 'will … be doing', 'Giờ này ngày mai bạn sẽ đang làm gì?'],
      ['He ___ (fly) to Tokyo at three p.m.', 'will be flying', 'Ba giờ chiều anh ấy sẽ đang bay sang Tokyo.'],
      ['We ___ (not / use) the meeting room tomorrow.', "won't be using", 'Ngày mai chúng tôi không dùng phòng họp.'],
      ['The team ___ (train) all morning.', 'will be training', 'Cả buổi sáng đội sẽ tập luyện.'],
      ['___ she ___ (attend) the workshop next week?', 'Will … be attending', 'Tuần sau cô ấy có dự buổi tập huấn không?'],
      ['I ___ (wait) for you outside the gate.', 'will be waiting', 'Tôi sẽ đợi bạn ở ngoài cổng.']
    ]
  },

  /* ==================== 11. TƯƠNG LAI HOÀN THÀNH ==================== */
  {
    slug: 'future-perfect',
    en: 'Future Perfect',
    vi: 'Tương lai hoàn thành',
    level: 'B2',
    summary: 'Việc sẽ hoàn tất TRƯỚC một mốc trong tương lai — gần như luôn đi với "by".',
    formula: {
      pos: 'S + will have + V3',
      neg: 'S + will not have + V3',
      que: 'Will + S + have + V3?',
      note: 'Không có mốc tương lai làm chuẩn thì thì này vô nghĩa; hãy tìm "by …" trong câu.'
    },
    signals: ['by 2030', 'by then', 'by the time…', 'before', "in two years' time"],
    useWhen: [
      'Việc sẽ hoàn tất trước một mốc cụ thể trong tương lai.',
      'Tính tổng kết đến một mốc: đến lúc đó đã được bao lâu, bao nhiêu lần.'
    ],
    useNot: [
      { what: 'Khi không có mốc tương lai nào làm chuẩn.', why: 'Dùng tương lai đơn: "I will finish the report" (không nói trước lúc nào).' },
      { what: 'Trong mệnh đề bắt đầu bằng "by the time", "when", "before".', why: 'Mệnh đề thời gian dùng hiện tại đơn: "By the time you arrive, I will have finished".' }
    ],
    confuse: [
      {
        with: 'Tương lai đơn',
        tell: 'Tương lai đơn chỉ nói việc sẽ xảy ra; tương lai hoàn thành nói việc sẽ xong TRƯỚC một mốc.',
        pair: [
          { en: 'I will finish the report on Friday.', vi: 'Thứ Sáu tôi sẽ làm xong báo cáo. (xong đúng vào thứ Sáu)' },
          { en: 'I will have finished the report by Friday.', vi: 'Đến thứ Sáu là tôi đã xong báo cáo. (xong trước hoặc chậm nhất là thứ Sáu)' }
        ]
      }
    ],
    errors: [
      { wrong: 'By the time you will arrive, I will have finished.', right: 'By the time you arrive, I will have finished.', why: 'Mệnh đề thời gian dùng hiện tại đơn, không dùng "will".' },
      { wrong: 'By next year she will graduated.', right: 'By next year she will have graduated.', why: 'Thiếu "have".' }
    ],
    examples: [
      ['By 2030 they will have finished the metro line.', 'Đến năm 2030 họ sẽ xây xong tuyến tàu điện.', 1, 'Mốc tương lai rõ ràng với "by".'],
      ['By the time you arrive, I will have cooked dinner.', 'Đến lúc bạn tới thì tôi đã nấu xong bữa tối.', 1, 'Mệnh đề "by the time" dùng hiện tại đơn.'],
      ['She will have graduated by next June.', 'Đến tháng Sáu năm sau cô ấy sẽ tốt nghiệp xong.', 1, 'Hoàn tất trước mốc.'],
      ['We will not have finished the project by Friday.', 'Đến thứ Sáu chúng tôi vẫn chưa xong dự án.', 1, 'Phủ định: đến mốc đó vẫn chưa xong.'],
      ['Will you have completed the form by then?', 'Đến lúc đó bạn điền xong đơn chưa?', 1, 'Nghi vấn.'],
      ["In two years' time he will have saved enough money.", 'Hai năm nữa anh ấy sẽ để dành đủ tiền.', 1, 'Mốc tính từ hiện tại.'],
      ['By the time you will arrive, I will have finished.', 'Đến lúc bạn tới thì tôi đã xong.', 0, 'Sai: bỏ "will" trong mệnh đề thời gian. Sửa thành "By the time you arrive".'],
      ['By next year she will graduated.', 'Đến năm sau cô ấy sẽ tốt nghiệp xong.', 0, 'Sai: thiếu "have". Sửa thành "she will have graduated".']
    ],
    practice: [
      ['By next month I ___ (finish) my thesis.', 'will have finished', 'Đến tháng sau tôi sẽ xong luận văn.'],
      ['___ they ___ (complete) the bridge by 2028?', 'Will … have completed', 'Đến năm 2028 họ có xây xong cây cầu không?'],
      ['By the time we get there, the show ___ (start).', 'will have started', 'Đến lúc chúng ta tới thì buổi diễn đã bắt đầu.'],
      ['She ___ (not / save) enough by December.', "won't have saved", 'Đến tháng Mười hai cô ấy vẫn chưa để dành đủ.'],
      ['In ten years this town ___ (change) completely.', 'will have changed', 'Mười năm nữa thị trấn này sẽ thay đổi hoàn toàn.'],
      ['By Friday he ___ (work) here for exactly one year.', 'will have worked', 'Đến thứ Sáu là anh ấy làm ở đây tròn một năm.'],
      ['We ___ (not / receive) the results by Monday.', "won't have received", 'Đến thứ Hai chúng tôi vẫn chưa nhận được kết quả.'],
      ['By the time you read this, I ___ (leave).', 'will have left', 'Đến lúc bạn đọc được cái này thì tôi đã đi rồi.'],
      ['___ you ___ (eat) before the meeting?', 'Will … have eaten', 'Bạn ăn xong trước buổi họp chứ?'],
      ['By 2035 most cars ___ (become) electric.', 'will have become', 'Đến năm 2035 phần lớn ô tô sẽ chạy điện.'],
      ['They ___ (build) 500 houses by the end of the year.', 'will have built', 'Đến cuối năm họ sẽ xây xong 500 căn nhà.'],
      ['By next week she ___ (take) three exams.', 'will have taken', 'Đến tuần sau cô ấy sẽ thi xong ba môn.']
    ]
  },

  /* ========= 12. TƯƠNG LAI HOÀN THÀNH TIẾP DIỄN ========= */
  {
    slug: 'future-perfect-continuous',
    en: 'Future Perfect Continuous',
    vi: 'Tương lai hoàn thành tiếp diễn',
    level: 'C1',
    summary: 'Đến một mốc tương lai thì việc đó đã kéo dài được bao lâu. Thì hiếm gặp nhất trong mười hai thì.',
    formula: {
      pos: 'S + will have been + V-ing',
      neg: 'S + will not have been + V-ing',
      que: 'Will + S + have been + V-ing?',
      note: 'Gần như luôn đi kèm cả mốc ("by …") lẫn khoảng thời gian ("for …"). Thiếu một trong hai thì câu nghe gượng.'
    },
    signals: ['by + mốc', 'for + khoảng thời gian', 'by then'],
    useWhen: [
      'Nhấn mạnh độ dài của một quá trình tính đến một mốc trong tương lai.'
    ],
    useNot: [
      { what: 'Động từ chỉ trạng thái.', why: 'Dùng tương lai hoàn thành: "I will have owned this shop for five years".' },
      { what: 'Khi chỉ cần nói việc sẽ xong.', why: 'Dùng tương lai hoàn thành: "I will have finished by then".' }
    ],
    confuse: [
      {
        with: 'Tương lai hoàn thành',
        tell: 'Hoàn thành nói việc đã xong tính đến mốc; hoàn thành tiếp diễn nói việc đã kéo dài bao lâu tính đến mốc.',
        pair: [
          { en: 'By June I will have written the book.', vi: 'Đến tháng Sáu tôi sẽ viết xong cuốn sách. — nhấn kết quả' },
          { en: 'By June I will have been writing the book for two years.', vi: 'Đến tháng Sáu là tôi viết cuốn sách đó được hai năm. — nhấn độ dài' }
        ]
      }
    ],
    errors: [
      { wrong: 'By June I will have working here for two years.', right: 'By June I will have been working here for two years.', why: 'Thiếu "been".' },
      { wrong: 'By next year I will have been owning this shop for five years.', right: 'By next year I will have owned this shop for five years.', why: '"own" là động từ trạng thái.' }
    ],
    examples: [
      ['By next May, I will have been studying here for four years.', 'Đến tháng Năm năm sau, tôi sẽ học ở đây được bốn năm.', 1, 'Có đủ mốc "by" và khoảng "for".'],
      ['By six p.m. they will have been travelling for twelve hours.', 'Đến sáu giờ chiều, họ sẽ đi đường được mười hai tiếng.', 1, 'Nhấn độ dài chuyến đi.'],
      ['Next month she will have been working at the bank for a decade.', 'Tháng sau là cô ấy làm ở ngân hàng tròn mười năm.', 1, 'Mốc tương lai gần.'],
      ['By the time the match ends, we will have been standing in the rain for two hours.', 'Đến lúc trận đấu kết thúc, chúng tôi sẽ đứng dưới mưa được hai tiếng.', 1, 'Mệnh đề "by the time" dùng hiện tại đơn.'],
      ['He will have been driving for eight hours by the time he reaches Hanoi.', 'Đến khi tới Hà Nội, anh ấy sẽ lái xe được tám tiếng.', 1, 'Mốc đặt ở cuối câu.'],
      ['Will you have been waiting long by then?', 'Đến lúc đó bạn đợi lâu chưa?', 1, 'Nghi vấn.'],
      ['By June I will have working here for two years.', 'Đến tháng Sáu là tôi làm ở đây được hai năm.', 0, 'Sai: thiếu "been". Sửa thành "will have been working".'],
      ['By next year I will have been owning this shop for five years.', 'Đến năm sau là tôi sở hữu cửa hàng này được năm năm.', 0, 'Sai: "own" là động từ trạng thái. Sửa thành "will have owned".']
    ],
    practice: [
      ['By next week they ___ (live) here for twenty years.', 'will have been living', 'Đến tuần sau là họ sống ở đây được hai mươi năm.'],
      ['By five p.m. she ___ (teach) for six hours.', 'will have been teaching', 'Đến năm giờ chiều là cô ấy dạy được sáu tiếng.'],
      ['___ you ___ (wait) long by the time we arrive?', 'Will … have been waiting', 'Đến lúc chúng tôi tới thì bạn đợi lâu chưa?'],
      ['By December he ___ (work) on this project for a year.', 'will have been working', 'Đến tháng Mười hai là anh ấy làm dự án này được một năm.'],
      ['By midnight we ___ (drive) for ten hours.', 'will have been driving', 'Đến nửa đêm là chúng tôi lái xe được mười tiếng.'],
      ['Next month I ___ (learn) Korean for three years.', 'will have been learning', 'Tháng sau là tôi học tiếng Hàn được ba năm.'],
      ['By the time the film ends, we ___ (sit) here for three hours.', 'will have been sitting', 'Đến lúc phim hết là chúng ta ngồi đây được ba tiếng.'],
      ['She ___ (run) for two hours by the time she finishes.', 'will have been running', 'Đến lúc về đích là cô ấy chạy được hai tiếng.'],
      ['By 2027 the company ___ (operate) for half a century.', 'will have been operating', 'Đến năm 2027 là công ty hoạt động được nửa thế kỷ.'],
      ['By tomorrow morning it ___ (rain) for three days.', 'will have been raining', 'Đến sáng mai là trời mưa được ba ngày.'],
      ['By the end of the term, they ___ (study) grammar for four months.', 'will have been studying', 'Đến cuối kỳ là họ học ngữ pháp được bốn tháng.'],
      ['By then I ___ (save) for a new laptop for six months.', 'will have been saving', 'Đến lúc đó là tôi để dành mua máy tính mới được sáu tháng.']
    ]
  }
];

/** Điểm ngữ pháp — mỗi dòng một thì. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'tense',
    level: p.level,
    summary: p.summary,
    // Đưa về dạng chung {rows:[[nhãn, nội dung]], note} để khối hiển thị dùng
    // được cho mọi nhóm ngữ pháp, kể cả nhóm không có khẳng định/phủ định/nghi vấn.
    formula_json: JSON.stringify({
      rows: [
        ['Khẳng định', p.formula.pos],
        ['Phủ định', p.formula.neg],
        ['Nghi vấn', p.formula.que]
      ],
      note: p.formula.note
    }),
    signals_json: JSON.stringify(p.signals),
    use_when_json: JSON.stringify(p.useWhen),
    use_not_json: JSON.stringify(p.useNot),
    confuse_json: JSON.stringify(p.confuse),
    errors_json: JSON.stringify(p.errors),
    sort: i
  }));
}

/** Câu ví dụ và câu luyện tập — phẳng hoá, giữ slug để nối với điểm ngữ pháp. */
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
