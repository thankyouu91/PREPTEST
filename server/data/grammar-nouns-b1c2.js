/**
 * Ngữ pháp — nhóm DANH TỪ · MẠO TỪ · LƯỢNG TỪ, phần bậc B1 đến C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-nouns.js (bậc A1–A2). Bảng phân bậc trong
 * docs/LEARNING.md mục 2 cấp cho nhóm này 28 điểm; tệp kia đã dùng 14 điểm của
 * A1 và A2, tệp này dùng nốt 14 điểm còn lại: B1 ×5, B2 ×4, C1 ×3, C2 ×2.
 *
 * Khác với phần A1–A2 vốn xoay quanh hình thái (thêm -s, chọn a hay an), phần
 * này xoay quanh SẮC THÁI và HOÀ HỢP: bỏ một chữ "a" là đảo nghĩa cả câu, đặt
 * "the" sai chỗ là hỏng lối nói khái quát, chọn nhầm "a number of" với "the
 * number of" là sai hoà hợp chủ ngữ. Đây đúng là những chỗ bài Viết bị trừ.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== B1 ==================== */

  {
    slug: 'few-little',
    en: 'few / little (without "a")',
    vi: 'few / little không có "a"',
    level: 'B1',
    summary: 'Bỏ chữ "a" đi thì nghĩa đảo ngược: từ "có một ít" thành "ít đến mức gần như không có". Khác biệt nằm ở sắc thái chứ không ở con số.',
    formula: {
      rows: [
        ['few + đếm được', 'ít đến mức gần như không: "He has few friends."'],
        ['a few + đếm được', 'có một vài, thế là ổn: "He has a few friends."'],
        ['little + không đếm được', 'gần như không có: "There is little hope."'],
        ['a little + không đếm được', 'có một chút: "There is a little hope."']
      ],
      note: 'Bẫy ngược nghĩa: "quite a few" nghĩa là KHÁ NHIỀU chứ không phải ít. Trong lối nói thường ngày, "few" và "little" trần nghe khá trang trọng; người bản ngữ hay nói "not many" và "not much".'
    },
    signals: ['few', 'a few', 'little', 'a little', 'quite a few', 'very few', 'only a few'],
    useWhen: [
      'few và little khi muốn nhấn số lượng ít, mang sắc thái tiếc nuối hoặc phê phán.',
      'a few và a little khi muốn nói có một ít và như thế là đủ.',
      '"quite a few" khi muốn nói khá nhiều — nhớ kỹ vì nhìn dễ hiểu ngược.',
      'few và little hợp với văn viết trang trọng và bài học thuật.'
    ],
    useNot: [
      { what: 'Không dùng few hay little trần trong câu mang ý tích cực.', why: 'Sắc thái tiêu cực sẽ chỏi với vế sau: "She has little money, so she is happy" nghe vô lý.' },
      { what: 'Không đổi chỗ hai loại danh từ.', why: '"few water" và "little books" đều sai: few đi với đếm được, little đi với không đếm được.' }
    ],
    confuse: [
      {
        with: 'a few và few',
        tell: 'Có "a" là nhìn theo hướng tích cực; bỏ "a" là nhìn theo hướng thiếu hụt. Cùng một số lượng vẫn nói được cả hai cách tuỳ thái độ người nói.',
        pair: [
          { en: 'A few students came, so we started.', vi: 'Có vài sinh viên tới nên chúng tôi bắt đầu.' },
          { en: 'Few students came, so we cancelled.', vi: 'Ít sinh viên tới quá nên chúng tôi huỷ.' }
        ]
      },
      {
        with: 'quite a few',
        tell: 'Có chữ "few" nhưng nghĩa ngược hẳn: khá nhiều. Đây là chỗ hay đọc nhầm trong bài đọc hiểu.',
        pair: [
          { en: 'Quite a few people attended.', vi: 'Khá nhiều người tham dự.' },
          { en: 'Few people attended.', vi: 'Rất ít người tham dự.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I have a little friends in Hanoi.', right: 'I have a few friends in Hanoi.', why: 'friends đếm được nên đi với a few.' },
      { wrong: 'We have few time, so let us hurry.', right: 'We have little time, so let us hurry.', why: 'time không đếm được nên đi với little.' }
    ],
    examples: [
      ['Few people understand this topic.', 'Rất ít người hiểu chủ đề này.', 1, 'Sắc thái tiêu cực: ít đến mức đáng nói.'],
      ['A few people stayed until the end.', 'Có vài người ở lại tới cuối.', 1, 'Sắc thái trung tính: có một số.'],
      ['There is little time left before the deadline.', 'Gần như không còn thời gian trước hạn chót.', 1, 'Không đếm được, sắc thái thiếu hụt.'],
      ['Quite a few students signed up for the course.', 'Khá nhiều sinh viên đăng ký khoá học.', 1, '"quite a few" nghĩa là nhiều.'],
      ['I have a little friends in Hanoi.', 'Tôi có vài người bạn ở Hà Nội.', 0, 'Sai: friends đếm được. Sửa thành "a few friends".'],
      ['She has little money, so she is very happy.', 'Cô ấy có ít tiền nên rất vui.', 0, 'Sai sắc thái: "little" mang ý thiếu thốn, chỏi với "happy". Sửa thành "a little money".']
    ],
    practice: [
      ['___ (Few / A few) people came, so the talk was cancelled.', 'Few', 'Rất ít người tới nên buổi nói chuyện bị huỷ.'],
      ['I have ___ (a few / a little) money left — let us get a coffee.', 'a little', 'Tôi còn một ít tiền, đi uống cà phê đi.'],
      ['She made ___ (few / little) mistakes; the essay was excellent.', 'few', 'Cô ấy mắc rất ít lỗi, bài luận rất tốt.'],
      ['There is ___ (few / little) hope of finding it now.', 'little', 'Giờ gần như không còn hy vọng tìm thấy nó.'],
      ['___ (Quite a few / Few) students enrolled, so we need a bigger room.', 'Quite a few', 'Khá nhiều sinh viên ghi danh nên cần phòng to hơn.'],
      ['He speaks ___ (a few / a little) Chinese.', 'a little', 'Anh ấy nói được một chút tiếng Trung.'],
      ['Very ___ (few / little) countries have signed the treaty.', 'few', 'Rất ít quốc gia đã ký hiệp ước.'],
      ['We still have ___ (a few / a little) days before the deadline.', 'a few', 'Chúng ta còn vài ngày trước hạn chót.'],
      ['There was ___ (few / little) evidence to support the claim.', 'little', 'Có rất ít bằng chứng ủng hộ khẳng định đó.'],
      ['Only ___ (a few / a little) of them replied to the email.', 'a few', 'Chỉ vài người trong số họ trả lời email.']
    ]
  },

  {
    slug: 'all-both-whole',
    en: 'all / both / whole',
    vi: 'all · both · whole',
    level: 'B1',
    summary: 'all cho ba trở lên, both cho đúng hai, whole cho một vật trọn vẹn. Vị trí trong câu cũng có quy tắc riêng.',
    formula: {
      rows: [
        ['all', 'all (of) the students · all my friends · all day'],
        ['both', 'both books · both (of) my parents — đúng HAI'],
        ['whole', 'the whole day · the whole book — danh từ SỐ ÍT'],
        ['Vị trí', 'sau động từ to be, trước động từ thường: "They are all ready." · "They all agree."']
      ],
      note: 'Bỏ được "of" khi liền sau là the, my, this. Nhưng trước đại từ thì bắt buộc: "all of us", "both of them". Cụm thời gian nói "all day", không nói "all the day".'
    },
    signals: ['all', 'both', 'whole', 'all of', 'both of', 'all day', 'the whole'],
    useWhen: [
      'all: toàn bộ một nhóm từ ba trở lên, hoặc toàn bộ một lượng không đếm được.',
      'both: đúng hai đối tượng.',
      'whole: trọn vẹn một vật hoặc một khoảng, đi với danh từ số ít.',
      'all và both đứng sau "to be" nhưng trước động từ thường.'
    ],
    useNot: [
      { what: 'Không dùng both cho ba đối tượng trở lên.', why: 'Dùng all: "all three books", không phải "both three books".' },
      { what: 'Không bỏ "of" khi theo sau là đại từ.', why: '"all us", "both them" đều sai; phải là "all of us", "both of them".' },
      { what: 'Không dùng whole với danh từ số nhiều.', why: '"the whole students" sai; nói "all the students".' }
    ],
    confuse: [
      {
        with: 'all và whole',
        tell: 'all đi với số nhiều và danh từ không đếm được; whole đi với số ít và nhấn tính trọn vẹn. Thứ tự cũng khác: all the, nhưng the whole.',
        pair: [
          { en: 'All the students passed.', vi: 'Tất cả sinh viên đều đỗ.' },
          { en: 'The whole class passed.', vi: 'Cả lớp đều đỗ. (nguyên một lớp, không sót ai)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Both of my three sisters live abroad.', right: 'All three of my sisters live abroad.', why: 'both chỉ dùng cho đúng hai đối tượng.' },
      { wrong: 'I waited all the day at the station.', right: 'I waited all day at the station.', why: 'Cụm cố định là "all day". Muốn có mạo từ thì nói "the whole day".' }
    ],
    examples: [
      ['All the students passed the exam.', 'Tất cả sinh viên đều đỗ kỳ thi.', 1, 'all + the + danh từ số nhiều.'],
      ['Both my parents are teachers.', 'Bố mẹ tôi đều là giáo viên.', 1, 'Đúng hai người; ở đây "of" có hay không đều đúng.'],
      ['She read the whole book in one night.', 'Cô ấy đọc hết cả cuốn sách trong một đêm.', 1, 'whole đi với danh từ số ít.'],
      ['They are all ready to leave.', 'Họ đều đã sẵn sàng đi.', 1, 'all đứng sau động từ "are".'],
      ['Both of my three sisters live abroad.', 'Cả ba chị em tôi đều sống ở nước ngoài.', 0, 'Sai: both chỉ cho hai. Sửa thành "All three of my sisters".'],
      ['I waited all the day at the station.', 'Tôi đợi cả ngày ở nhà ga.', 0, 'Sai: cụm cố định là "all day", hoặc "the whole day".']
    ],
    practice: [
      ['___ (All / Both) five of us agreed with the plan.', 'All', 'Cả năm chúng tôi đều đồng ý với kế hoạch.'],
      ['___ (Both / All) my parents were born in Hue.', 'Both', 'Bố mẹ tôi đều sinh ở Huế.'],
      ['She spent the ___ (all / whole) morning cleaning.', 'whole', 'Cô ấy dành cả buổi sáng dọn dẹp.'],
      ['They have ___ (all / whole) finished their homework.', 'all', 'Cả bọn đã làm xong bài tập.'],
      ['I have read ___ (all / whole) of these books.', 'all', 'Tôi đã đọc hết chỗ sách này.'],
      ['___ (Both / All) candidates were excellent — I could not choose between the two.', 'Both', 'Cả hai ứng viên đều xuất sắc, tôi không chọn nổi.'],
      ['We waited ___ (all day / all the day) for the results.', 'all day', 'Chúng tôi đợi kết quả cả ngày.'],
      ['___ (All / Whole) the furniture was damaged in the flood.', 'All', 'Toàn bộ đồ đạc hỏng hết trong trận lụt.'],
      ['He ate the ___ (all / whole) cake by himself.', 'whole', 'Anh ta ăn hết cả cái bánh một mình.'],
      ['Give a copy to ___ (all of / all) them.', 'all of', 'Đưa cho tất cả bọn họ mỗi người một bản.']
    ]
  },

  {
    slug: 'each-every',
    en: 'each / every',
    vi: 'each · every',
    level: 'B1',
    summary: 'each nhìn từng cá thể một, every gộp cả nhóm. Cả hai đều đi với danh từ số ít và động từ số ít.',
    formula: {
      rows: [
        ['each', 'each student · each of the students'],
        ['every', 'every student — KHÔNG có "every of"'],
        ['Động từ', 'luôn số ít: "Each student has a book."'],
        ['Vị trí riêng của each', 'đứng được sau chủ ngữ: "They each received a prize."']
      ],
      note: 'Nhóm chỉ có hai thì dùng each, không dùng every: "a ring on each hand". every cần từ ba trở lên và hay đi với tần suất: "every two weeks".'
    },
    signals: ['each', 'every', 'each of', 'every single', 'every two weeks'],
    useWhen: [
      'each: xét riêng từng cái một, dùng được cho nhóm chỉ có hai.',
      'every: xét cả nhóm như một tổng thể, cần từ ba đối tượng trở lên.',
      'every khi nói tần suất đều đặn: every Monday, every three days.',
      'each đứng sau chủ ngữ hoặc sau tân ngữ để nhấn từng người: "We each paid separately."'
    ],
    useNot: [
      { what: 'Không có cấu trúc "every of".', why: '"every of the students" sai; nói "each of the students" hoặc "every student".' },
      { what: 'Không dùng động từ số nhiều.', why: '"Every student have a book" sai; phải là "has".' },
      { what: 'Không dùng every cho nhóm chỉ có hai.', why: 'Hai tay, hai mắt thì dùng each: "a ring on each hand".' }
    ],
    confuse: [
      {
        with: 'each và every',
        tell: 'Nhiều câu dùng cái nào cũng được nhưng sắc thái khác: each tách riêng từng người, every gộp cả nhóm thành một quy định chung.',
        pair: [
          { en: 'Each student received a different task.', vi: 'Mỗi sinh viên nhận một nhiệm vụ khác nhau. (xét riêng từng người)' },
          { en: 'Every student must wear a uniform.', vi: 'Mọi sinh viên đều phải mặc đồng phục. (quy định cho cả nhóm)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Every of the students has a laptop.', right: 'Each of the students has a laptop.', why: 'Không có cấu trúc "every of".' },
      { wrong: 'Every students have to register online.', right: 'Every student has to register online.', why: 'every đi với danh từ số ít và động từ số ít.' }
    ],
    examples: [
      ['Each student has a different topic.', 'Mỗi sinh viên có một đề tài khác nhau.', 1, 'Xét riêng từng người, động từ số ít.'],
      ['Every room in the hotel has a balcony.', 'Mọi phòng trong khách sạn đều có ban công.', 1, 'Xét cả nhóm.'],
      ['She wore a ring on each hand.', 'Cô ấy đeo nhẫn ở mỗi bàn tay.', 1, 'Chỉ có hai tay nên dùng each.'],
      ['The bus leaves every twenty minutes.', 'Cứ hai mươi phút lại có một chuyến xe buýt.', 1, 'every đi với tần suất.'],
      ['Every of the students has a laptop.', 'Mỗi sinh viên đều có máy tính.', 0, 'Sai: không có "every of". Sửa thành "Each of the students".'],
      ['Every students have to register online.', 'Mọi sinh viên đều phải đăng ký trực tuyến.', 0, 'Sai: phải là "Every student has to register online."']
    ],
    practice: [
      ['___ (Each / Every) of the three teams won a prize.', 'Each', 'Mỗi đội trong ba đội đều giành một giải.'],
      ['___ (Each / Every) single seat was taken.', 'Every', 'Không còn một chỗ trống nào.'],
      ['She has a scar on ___ (each / every) knee.', 'each', 'Cô ấy có sẹo ở mỗi đầu gối.'],
      ['The train runs ___ (each / every) two hours.', 'every', 'Cứ hai tiếng lại có một chuyến tàu.'],
      ['Every student ___ (have / has) an ID card.', 'has', 'Mọi sinh viên đều có thẻ sinh viên.'],
      ['They ___ (each / every) received a certificate.', 'each', 'Mỗi người đều nhận được một chứng chỉ.'],
      ['___ (Each / Every) of us has a role to play.', 'Each', 'Mỗi người trong chúng ta đều có vai trò riêng.'],
      ['I visit my grandparents ___ (each / every) Sunday.', 'every', 'Chủ nhật nào tôi cũng về thăm ông bà.'],
      ['Each of the answers ___ (was / were) correct.', 'was', 'Từng câu trả lời đều đúng.'],
      ['___ (Each / Every) player must sign the form before the match.', 'Every', 'Mọi cầu thủ đều phải ký vào đơn trước trận.']
    ]
  },

  {
    slug: 'collective-nouns',
    en: 'Collective nouns and agreement',
    vi: 'Danh từ tập hợp và hoà hợp chủ ngữ',
    level: 'B1',
    summary: 'team, family, government… chia số ít hay số nhiều tuỳ cách nhìn. Riêng police và people thì luôn số nhiều.',
    formula: {
      rows: [
        ['Danh từ tập hợp', 'team, family, government, staff, committee, class, audience, crew'],
        ['Coi là một khối', 'động từ SỐ ÍT: "The team is playing well."'],
        ['Nhấn từng cá nhân', 'động từ SỐ NHIỀU: "The team are arguing among themselves."'],
        ['Luôn số nhiều', 'police, people, cattle: "The police are investigating."']
      ],
      note: 'Lối số ít phổ biến ở Anh - Mỹ, lối số nhiều phổ biến ở Anh - Anh. Bài thi chấp nhận cả hai, nhưng đổi qua đổi lại trong cùng một đoạn thì bị trừ điểm mạch lạc — chọn một lối rồi giữ.'
    },
    signals: ['team', 'family', 'government', 'staff', 'committee', 'police', 'audience', 'crew'],
    useWhen: [
      'Động từ số ít khi tập thể hành động thống nhất như một khối.',
      'Động từ số nhiều khi nhấn vào các cá nhân bên trong, thường có dấu hiệu như "among themselves", "each other", "their".',
      'police, people, cattle luôn đi với động từ số nhiều dù không có đuôi -s.'
    ],
    useNot: [
      { what: 'Không thêm -s vào police theo nghĩa số nhiều.', why: 'police đã là số nhiều; muốn đếm thì nói "police officers", không nói "polices".' },
      { what: 'Không đổi lối giữa chừng.', why: '"The committee has met and they have decided" — nửa số ít nửa số nhiều trong một câu là thiếu nhất quán.' }
    ],
    confuse: [
      {
        with: 'staff và staffs',
        tell: 'staff là tập hợp nhân viên của một nơi. Dạng "staffs" chỉ dùng khi nói nhiều ĐỘI NGŨ của nhiều tổ chức khác nhau.',
        pair: [
          { en: 'The staff are very helpful.', vi: 'Nhân viên ở đây rất nhiệt tình.' },
          { en: 'The two hospitals merged their staffs.', vi: 'Hai bệnh viện nhập chung đội ngũ nhân sự.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The police is looking for him.', right: 'The police are looking for him.', why: 'police luôn đi với động từ số nhiều.' },
      { wrong: 'The staffs was very friendly.', right: 'The staff were very friendly.', why: 'staff theo nghĩa này không thêm -s, và động từ phải hợp với cách nhìn đã chọn.' }
    ],
    examples: [
      ['The team is playing well this season.', 'Mùa này đội chơi hay.', 1, 'Coi cả đội là một khối, động từ số ít.'],
      ['The team are arguing among themselves.', 'Các thành viên trong đội đang cãi nhau.', 1, '"among themselves" cho thấy đang nhấn từng cá nhân.'],
      ['The police are investigating the case.', 'Cảnh sát đang điều tra vụ này.', 1, 'police luôn số nhiều.'],
      ['My family is the most important thing in my life.', 'Gia đình là điều quan trọng nhất đời tôi.', 1, 'Coi gia đình là một khối.'],
      ['The police is looking for him.', 'Cảnh sát đang tìm anh ta.', 0, 'Sai: sửa thành "The police are looking for him."'],
      ['The staffs was very friendly.', 'Nhân viên rất thân thiện.', 0, 'Sai: sửa thành "The staff were very friendly."']
    ],
    practice: [
      ['The police ___ (has / have) arrested two suspects.', 'have', 'Cảnh sát đã bắt hai nghi phạm.'],
      ['Many people ___ (was / were) waiting outside.', 'were', 'Nhiều người đang đợi bên ngoài.'],
      ['The committee ___ (disagree / disagrees) among themselves about the budget.', 'disagree', 'Các thành viên uỷ ban bất đồng với nhau về ngân sách.'],
      ['My family ___ (is / are) the most important thing to me.', 'is', 'Gia đình là điều quan trọng nhất với tôi.'],
      ['The staff ___ (is / are) all wearing name badges.', 'are', 'Nhân viên đều đeo bảng tên.'],
      ['The team ___ (has / have) won three matches in a row.', 'has', 'Đội đã thắng ba trận liên tiếp.'],
      ['Cattle ___ (is / are) grazing in the field.', 'are', 'Đàn bò đang gặm cỏ ngoài đồng.'],
      ['We need more ___ (police / polices) on the streets.', 'police', 'Cần thêm cảnh sát trên đường phố.'],
      ['The class ___ (was / were) dismissed early yesterday.', 'was', 'Hôm qua lớp được cho về sớm.'],
      ['The crew ___ (is / are) taking their seats.', 'are', 'Tổ bay đang vào chỗ ngồi của mình.']
    ]
  },

  {
    slug: 'article-proper-nouns',
    en: 'Articles with proper nouns',
    vi: 'Mạo từ với tên riêng và địa danh',
    level: 'B1',
    summary: 'Tên riêng đứng một mình thì trơ, không mạo từ. Tên chỉ một tập hợp hoặc có từ chỉ thể chế thì có "the".',
    formula: {
      rows: [
        ['Không có the', 'người, thành phố, nước số ít, hồ, một đỉnh núi, đường phố: Hanoi · Viet Nam · Lake Ba Be · Mount Fansipan'],
        ['Có the', 'sông, biển, đại dương, dãy núi, quần đảo, sa mạc: the Mekong · the Pacific · the Alps · the Philippines'],
        ['Có the', 'tên nước dạng số nhiều hoặc có từ chỉ thể chế: the United States · the UK · the Netherlands'],
        ['Có the', 'toà nhà, bảo tàng, khách sạn, tờ báo: the Louvre · the Metropole · the Guardian']
      ],
      note: 'Mẹo nhớ: một cá thể đơn lẻ thì trơ, một tập hợp thì có "the". So sánh Mount Everest (một đỉnh) với the Himalayas (cả dãy).'
    },
    signals: ['the Mekong', 'the Alps', 'the UK', 'the Pacific', 'Viet Nam', 'Hanoi', 'Mount Fansipan'],
    useWhen: [
      'Bỏ mạo từ với tên người, thành phố, nước số ít, hồ, một ngọn núi, tên đường.',
      'Dùng "the" với sông, biển, đại dương, dãy núi, quần đảo, sa mạc.',
      'Dùng "the" với tên nước dạng số nhiều hoặc có từ chỉ thể chế.',
      'Dùng "the" với tên toà nhà, bảo tàng, khách sạn, rạp và tờ báo.'
    ],
    useNot: [
      { what: 'Không dùng "the" trước tên nước số ít.', why: '"the Viet Nam", "the France" đều sai.' },
      { what: 'Không dùng "the" trước tên trường dạng "X University".', why: '"Hanoi University" không có the; nhưng dạng có "of" thì có: "the University of Hanoi".' }
    ],
    confuse: [
      {
        with: 'X University và the University of X',
        tell: 'Dạng có "of" thì có "the"; dạng không có "of" thì bỏ mạo từ. Quy tắc này áp cho cả bảo tàng và thư viện.',
        pair: [
          { en: 'She studies at Hue University.', vi: 'Cô ấy học ở Đại học Huế.' },
          { en: 'She studies at the University of Hue.', vi: 'Cô ấy học ở Đại học Huế. (dạng có "of")' }
        ]
      }
    ],
    errors: [
      { wrong: 'I want to visit the Viet Nam next year.', right: 'I want to visit Viet Nam next year.', why: 'Tên nước số ít không đi với "the".' },
      { wrong: 'We sailed down Mekong.', right: 'We sailed down the Mekong.', why: 'Tên sông luôn có "the".' }
    ],
    examples: [
      ['She grew up in Hanoi.', 'Cô ấy lớn lên ở Hà Nội.', 1, 'Tên thành phố không có mạo từ.'],
      ['We crossed the Mekong by ferry.', 'Chúng tôi qua sông Mê Kông bằng phà.', 1, 'Tên sông có "the".'],
      ['He climbed Mount Fansipan last year.', 'Năm ngoái anh ấy leo đỉnh Fansipan.', 1, 'Một đỉnh núi đơn lẻ thì trơ.'],
      ['They travelled across the Netherlands.', 'Họ đi khắp Hà Lan.', 1, 'Tên nước dạng số nhiều có "the".'],
      ['I want to visit the Viet Nam next year.', 'Sang năm tôi muốn thăm Việt Nam.', 0, 'Sai: bỏ "the". Sửa thành "visit Viet Nam".'],
      ['We sailed down Mekong.', 'Chúng tôi xuôi dòng Mê Kông.', 0, 'Sai: thiếu "the". Sửa thành "down the Mekong".']
    ],
    practice: [
      ['She works in ___ (–/the) Japan.', '–', 'Cô ấy làm việc ở Nhật.'],
      ['We swam in ___ (–/the) Pacific Ocean.', 'the', 'Chúng tôi bơi ở Thái Bình Dương.'],
      ['He is from ___ (–/the) Philippines.', 'the', 'Anh ấy đến từ Philippines.'],
      ['They hiked in ___ (–/the) Alps last summer.', 'the', 'Mùa hè trước họ đi bộ đường dài ở dãy Alps.'],
      ['I live on ___ (–/the) Nguyen Hue Street.', '–', 'Tôi sống ở đường Nguyễn Huệ.'],
      ['She studies at ___ (–/the) University of Da Nang.', 'the', 'Cô ấy học ở Đại học Đà Nẵng.'],
      ['We stayed at ___ (–/the) Metropole last week.', 'the', 'Tuần trước chúng tôi ở khách sạn Metropole.'],
      ['___ (–/The) Lake Ba Be is in Bac Kan province.', '–', 'Hồ Ba Bể ở tỉnh Bắc Kạn.'],
      ['He reads ___ (–/the) Guardian every morning.', 'the', 'Sáng nào anh ấy cũng đọc báo Guardian.'],
      ['They flew to ___ (–/the) United States in May.', 'the', 'Tháng Năm họ bay sang Mỹ.']
    ]
  },

  /* ==================== B2 ==================== */

  {
    slug: 'noun-dual-countability',
    en: 'Nouns that change meaning with countability',
    vi: 'Danh từ đổi nghĩa khi đếm được hoặc không',
    level: 'B2',
    summary: 'Cùng một từ, thêm mạo từ vào là đổi nghĩa. Nhóm này ra đề rất nhiều vì nhìn quen mà dễ hiểu sai.',
    formula: {
      rows: [
        ['paper', 'không đếm: giấy · đếm được: a paper = bài báo khoa học hoặc tờ báo'],
        ['experience', 'không đếm: kinh nghiệm · đếm được: an experience = một trải nghiệm'],
        ['time', 'không đếm: thời gian · đếm được: a time = một lần, một thời kỳ'],
        ['work / room / glass', 'work: công việc ≠ a work: một tác phẩm · room: chỗ trống ≠ a room: căn phòng · glass: thuỷ tinh ≠ a glass: cái cốc']
      ],
      note: 'Thêm vài cặp hay gặp: business (kinh doanh ≠ a business: một doanh nghiệp), light (ánh sáng ≠ a light: cái đèn), chicken (thịt gà ≠ a chicken: con gà).'
    },
    signals: ['a paper', 'an experience', 'a work', 'a room', 'a glass', 'a business', 'a light'],
    useWhen: [
      'Dạng không đếm được khi nói tới chất liệu hoặc khái niệm chung.',
      'Dạng đếm được khi nói tới một đơn vị, một vật thể hoặc một lần cụ thể.',
      'Trong bài viết học thuật: "research" luôn không đếm được, nhưng "a study" và "a paper" thì đếm được.'
    ],
    useNot: [
      { what: 'Không thêm mạo từ khi ý nói khái niệm chung.', why: '"I have a experience in teaching" sai nghĩa; nói "I have experience in teaching".' },
      { what: 'Không dùng "researches" hay "a research".', why: 'research luôn không đếm được; muốn đếm thì nói "two studies" hoặc "two research projects".' }
    ],
    confuse: [
      {
        with: 'experience và an experience',
        tell: 'Không mạo từ là vốn kinh nghiệm tích luỹ; có mạo từ là một lần trải nghiệm cụ thể.',
        pair: [
          { en: 'She has ten years of experience.', vi: 'Cô ấy có mười năm kinh nghiệm.' },
          { en: 'Living abroad was an unforgettable experience.', vi: 'Sống ở nước ngoài là một trải nghiệm khó quên.' }
        ]
      },
      {
        with: 'room và a room',
        tell: 'Không mạo từ là chỗ trống; có mạo từ là căn phòng.',
        pair: [
          { en: 'Is there room for one more?', vi: 'Còn chỗ cho một người nữa không?' },
          { en: 'Is there a room available tonight?', vi: 'Tối nay còn phòng trống không?' }
        ]
      }
    ],
    errors: [
      { wrong: 'I have a good experience in marketing.', right: 'I have good experience in marketing.', why: 'Nói vốn kinh nghiệm thì bỏ mạo từ. Có "a" thì hoá ra một lần trải nghiệm.' },
      { wrong: 'He published three researches last year.', right: 'He published three papers last year.', why: 'research không đếm được nên không có "researches".' }
    ],
    examples: [
      ['I need some paper to write on.', 'Tôi cần ít giấy để viết.', 1, 'Không đếm được: chất liệu giấy.'],
      ['She published a paper in a major journal.', 'Cô ấy đăng một bài báo trên một tạp chí lớn.', 1, 'Đếm được: một bài báo khoa học.'],
      ['Do you have any experience with this software?', 'Bạn có kinh nghiệm dùng phần mềm này không?', 1, 'Không đếm được: vốn kinh nghiệm.'],
      ['The trip was a wonderful experience.', 'Chuyến đi là một trải nghiệm tuyệt vời.', 1, 'Đếm được: một lần trải nghiệm.'],
      ['I have a good experience in marketing.', 'Tôi có kinh nghiệm tốt về marketing.', 0, 'Sai: bỏ "a". Sửa thành "I have good experience in marketing."'],
      ['He published three researches last year.', 'Năm ngoái anh ấy công bố ba nghiên cứu.', 0, 'Sai: research không đếm được. Sửa thành "three papers" hoặc "three studies".']
    ],
    practice: [
      ['Could you pass me ___ (a / –) glass of water?', 'a', 'Đưa tôi một ly nước được không?'],
      ['This window is made of ___ (a / –) glass.', '–', 'Cửa sổ này làm bằng thuỷ tinh.'],
      ['She has five years of ___ (an / –) experience.', '–', 'Cô ấy có năm năm kinh nghiệm.'],
      ['Is there ___ (a / –) room for my suitcase?', '–', 'Còn chỗ cho cái vali của tôi không?'],
      ['We booked ___ (a / –) room with a sea view.', 'a', 'Chúng tôi đặt một phòng nhìn ra biển.'],
      ['His latest ___ (work / works) is displayed in the museum.', 'work', 'Tác phẩm mới nhất của ông được trưng bày trong bảo tàng.'],
      ['I read about it in ___ (a / –) paper this morning.', 'a', 'Sáng nay tôi đọc được chuyện đó trên báo.'],
      ['Recent ___ (research / researches) supports this theory.', 'research', 'Nghiên cứu gần đây ủng hộ lý thuyết này.'],
      ['She runs ___ (a / –) small business in Hoi An.', 'a', 'Cô ấy có một doanh nghiệp nhỏ ở Hội An.'],
      ['Please turn off ___ (a / the) light before you leave.', 'the', 'Nhớ tắt đèn trước khi về.']
    ]
  },

  {
    slug: 'quantifiers-of',
    en: 'Quantifiers with "of"',
    vi: 'Lượng từ đi với "of"',
    level: 'B2',
    summary: 'Nói chung cả loại thì bỏ "of"; nói về một nhóm xác định thì phải có "of" và một từ hạn định phía sau.',
    formula: {
      rows: [
        ['Nói chung', 'most students · some people · many books — KHÔNG có "of"'],
        ['Nhóm xác định', 'most of the students · some of my friends · many of these books'],
        ['Trước đại từ', 'most of them · some of us — bắt buộc có "of"'],
        ['all và both', 'bỏ được "of" trước the/my: "all (of) the students"']
      ],
      note: 'Quy tắc gọn: sau lượng từ mà có the, my, this, these hoặc đại từ thì phải chèn "of". Không có mấy từ đó thì bỏ "of".'
    },
    signals: ['most of the', 'some of my', 'many of these', 'none of them', 'all of us'],
    useWhen: [
      'Bỏ "of" khi nói chung về cả loại, không giới hạn nhóm nào.',
      'Thêm "of" khi ngay sau là the, my, his, this, these hoặc đại từ.',
      'all, both, half bỏ được "of" trước the và tính từ sở hữu, nhưng không bỏ được trước đại từ.'
    ],
    useNot: [
      { what: 'Không dùng "of" khi không có từ hạn định phía sau.', why: '"most of students" sai; nói "most students" hoặc "most of the students".' },
      { what: 'Không bỏ "of" trước đại từ.', why: '"most them", "some us" đều sai.' }
    ],
    confuse: [
      {
        with: 'most students và most of the students',
        tell: 'Không "of" là nói về sinh viên nói chung trên đời; có "of the" là nói về nhóm sinh viên cụ thể đã xác định.',
        pair: [
          { en: 'Most students prefer online classes.', vi: 'Phần lớn sinh viên nói chung thích học trực tuyến.' },
          { en: 'Most of the students in my class prefer online classes.', vi: 'Phần lớn sinh viên trong lớp tôi thích học trực tuyến.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Most of students prefer online classes.', right: 'Most students prefer online classes.', why: 'Nói chung thì bỏ "of". Muốn giữ "of" thì phải có "the": "most of the students".' },
      { wrong: 'Some of people disagree with this view.', right: 'Some people disagree with this view.', why: 'Tương tự: "of" chỉ đi với nhóm xác định.' }
    ],
    examples: [
      ['Most people enjoy travelling.', 'Phần lớn mọi người thích đi du lịch.', 1, 'Nói chung nên bỏ "of".'],
      ['Most of the people in this room are teachers.', 'Phần lớn những người trong phòng này là giáo viên.', 1, 'Nhóm xác định nên có "of the".'],
      ['Some of my friends live abroad.', 'Vài người bạn tôi sống ở nước ngoài.', 1, 'Có tính từ sở hữu nên phải có "of".'],
      ['None of them replied to the email.', 'Không ai trong số họ trả lời email.', 1, 'Trước đại từ luôn có "of".'],
      ['Most of students prefer online classes.', 'Phần lớn sinh viên thích học trực tuyến.', 0, 'Sai: sửa thành "Most students" hoặc "Most of the students".'],
      ['Many of books in the library are old.', 'Nhiều sách trong thư viện đã cũ.', 0, 'Sai: thiếu "the". Sửa thành "Many of the books".']
    ],
    practice: [
      ['___ (Most / Most of) children like sweets.', 'Most', 'Phần lớn trẻ con thích đồ ngọt.'],
      ['___ (Some / Some of) the questions were very hard.', 'Some of', 'Vài câu hỏi rất khó.'],
      ['___ (Many / Many of) us have never been abroad.', 'Many of', 'Nhiều người trong chúng tôi chưa từng ra nước ngoài.'],
      ['___ (Few / Few of) people know this street.', 'Few', 'Ít người biết con phố này.'],
      ['I have read ___ (most / most of) his novels.', 'most of', 'Tôi đã đọc phần lớn tiểu thuyết của ông ấy.'],
      ['___ (All / All of) students must attend the orientation.', 'All', 'Mọi sinh viên đều phải dự buổi định hướng.'],
      ['___ (None / None of) the answers was correct.', 'None of', 'Không câu trả lời nào đúng.'],
      ['___ (Half / Half of) my salary goes on rent.', 'Half of', 'Một nửa lương của tôi đi vào tiền thuê nhà.'],
      ['___ (Some / Some of) teachers disagree with the new policy.', 'Some', 'Một số giáo viên không đồng tình với chính sách mới.'],
      ['___ (Both / Both of) them arrived late.', 'Both of', 'Cả hai người họ đều tới muộn.']
    ]
  },

  {
    slug: 'no-none-neither',
    en: 'no / none / neither / either',
    vi: 'no · none · neither · either',
    level: 'B2',
    summary: 'Bốn cách nói "không có cái nào", khác nhau ở chỗ đứng trước danh từ hay đứng một mình, và ở chỗ nói về hai hay nhiều hơn hai.',
    formula: {
      rows: [
        ['no + danh từ', 'There is no milk left. (mạnh hơn "not any")'],
        ['none đứng một mình', '"How many are left?" — "None."'],
        ['none of + nhóm', 'None of the students came. (từ ba trở lên)'],
        ['neither / either của HAI', 'Neither answer is correct. · You can take either one.']
      ],
      note: '"none of" theo văn phạm chuẩn đi với động từ số ít, nhưng lối nói đời thường dùng số nhiều rất phổ biến và được chấp nhận. neither và either luôn nói về đúng hai đối tượng.'
    },
    signals: ['no', 'none', 'none of', 'neither', 'either', 'neither … nor', 'either … or'],
    useWhen: [
      'no + danh từ khi muốn phủ định dứt khoát, nghe mạnh hơn "not any".',
      'none khi đứng một mình hoặc đi với "of + nhóm xác định".',
      'neither khi phủ định cả hai; either khi nói cái nào trong hai cũng được.',
      'Cặp "neither … nor" và "either … or" để nối hai lựa chọn.'
    ],
    useNot: [
      { what: 'Không phủ định hai lần.', why: '"I do not have no money" sai; nói "I have no money" hoặc "I do not have any money".' },
      { what: 'Không dùng "none" trực tiếp trước danh từ.', why: '"none students" sai; nói "no students" hoặc "none of the students".' },
      { what: 'Không dùng neither cho ba đối tượng trở lên.', why: 'Từ ba trở lên dùng "none of": "none of the three answers".' }
    ],
    confuse: [
      {
        with: 'no và none',
        tell: 'no luôn có danh từ đi kèm ngay sau; none đứng một mình hoặc đi với "of".',
        pair: [
          { en: 'There are no tickets left.', vi: 'Không còn vé nào.' },
          { en: 'There are none left.', vi: 'Không còn cái nào cả.' }
        ]
      },
      {
        with: 'neither và either',
        tell: 'neither đã mang nghĩa phủ định sẵn; either là trung tính, cần từ phủ định khác nếu muốn phủ định.',
        pair: [
          { en: 'Neither option is acceptable.', vi: 'Không phương án nào chấp nhận được.' },
          { en: 'Either option is acceptable.', vi: 'Phương án nào cũng chấp nhận được.' }
        ]
      }
    ],
    errors: [
      { wrong: 'None students attended the lecture.', right: 'No students attended the lecture.', why: 'none không đứng trực tiếp trước danh từ.' },
      { wrong: 'Neither of the three answers is correct.', right: 'None of the three answers is correct.', why: 'neither chỉ dùng cho đúng hai.' }
    ],
    examples: [
      ['There is no milk in the fridge.', 'Trong tủ lạnh không còn sữa.', 1, 'no + danh từ.'],
      ['None of the students handed in the assignment.', 'Không sinh viên nào nộp bài.', 1, 'none of + nhóm xác định.'],
      ['Neither answer is correct.', 'Cả hai câu trả lời đều sai.', 1, 'neither nói về đúng hai.'],
      ['You can take either bus; both go to the centre.', 'Bạn bắt xe nào cũng được, cả hai đều vào trung tâm.', 1, 'either là trung tính, không phủ định.'],
      ['None students attended the lecture.', 'Không sinh viên nào dự buổi giảng.', 0, 'Sai: sửa thành "No students attended the lecture."'],
      ['Neither of the three answers is correct.', 'Không câu nào trong ba câu đúng.', 0, 'Sai: neither chỉ cho hai. Sửa thành "None of the three answers".']
    ],
    practice: [
      ['There are ___ (no / none) seats left.', 'no', 'Không còn chỗ nào.'],
      ['"How many are left?" — "___ (No / None)."', 'None', '"Còn mấy cái?" — "Không còn cái nào."'],
      ['___ (Neither / None) of the two candidates was suitable.', 'Neither', 'Cả hai ứng viên đều không phù hợp.'],
      ['___ (Neither / None) of my five colleagues could help.', 'None', 'Không ai trong năm đồng nghiệp của tôi giúp được.'],
      ['I have ___ (no / not) idea what he means.', 'no', 'Tôi chẳng hiểu anh ta nói gì.'],
      ['You can sit on ___ (either / neither) side of the table.', 'either', 'Bạn ngồi bên nào của bàn cũng được.'],
      ['___ (Neither / Either) he nor his brother came.', 'Neither', 'Cả anh ta lẫn em trai đều không tới.'],
      ['She had ___ (no / none) money and nowhere to go.', 'no', 'Cô ấy không có tiền và không có chỗ nào để đi.'],
      ['___ (None / No) of the information was useful.', 'None', 'Không thông tin nào hữu ích.'],
      ['We can meet on ___ (either / neither) Monday or Tuesday.', 'either', 'Chúng ta gặp nhau thứ Hai hoặc thứ Ba đều được.']
    ]
  },

  {
    slug: 'article-generic',
    en: 'Articles for generic reference',
    vi: 'Mạo từ trong lối nói khái quát',
    level: 'B2',
    summary: 'Ba cách nói về cả một loại, khác nhau ở độ trang trọng. Thêm lối "the + tính từ" để chỉ cả một nhóm người.',
    formula: {
      rows: [
        ['Số nhiều, không mạo từ', 'Computers have changed education. (thông dụng nhất)'],
        ['a/an + số ít', 'A computer is a useful tool. (lấy một cá thể làm đại diện)'],
        ['the + số ít', 'The computer has changed education. (trang trọng, thiên về loại hình)'],
        ['the + tính từ', 'the poor · the elderly · the unemployed — chỉ cả nhóm người']
      ],
      note: '"the + tính từ" luôn đi với động từ số nhiều: "The rich get richer." Không thêm -s: "the poors" sai.'
    },
    signals: ['the poor', 'the elderly', 'the rich', 'the unemployed', 'the young'],
    useWhen: [
      'Danh từ số nhiều không mạo từ: lối khái quát tự nhiên nhất, hợp mọi văn cảnh.',
      'a/an + số ít: khi lấy một cá thể bất kỳ làm đại diện cho cả loại, hay gặp trong định nghĩa.',
      'the + số ít: văn phong trang trọng, thường nói về phát minh, loài, nhạc cụ: "the telephone", "the tiger", "the piano".',
      'the + tính từ: gọi tên cả một nhóm người theo đặc điểm chung.'
    ],
    useNot: [
      { what: 'Không dùng "the" với danh từ số nhiều khi nói khái quát.', why: '"The computers have changed education" hoá ra nói về mấy cái máy tính cụ thể nào đó.' },
      { what: 'Không thêm -s vào "the + tính từ".', why: '"the poors", "the elderlies" đều sai; dạng này đã mang nghĩa số nhiều.' },
      { what: 'Không dùng động từ số ít sau "the + tính từ".', why: '"The rich gets richer" sai; phải là "get".' }
    ],
    confuse: [
      {
        with: 'số nhiều không mạo từ và the + số nhiều',
        tell: 'Bỏ mạo từ là nói cả loại; thêm "the" là chỉ vào một nhóm cụ thể đã xác định.',
        pair: [
          { en: 'Nurses work long hours.', vi: 'Y tá nói chung làm việc nhiều giờ.' },
          { en: 'The nurses at this hospital work long hours.', vi: 'Các y tá ở bệnh viện này làm việc nhiều giờ.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The smartphones have changed how we communicate.', right: 'Smartphones have changed how we communicate.', why: 'Nói khái quát về cả loại thì bỏ "the".' },
      { wrong: 'The poors need more support.', right: 'The poor need more support.', why: '"the + tính từ" đã là số nhiều, không thêm -s, và động từ chia số nhiều.' }
    ],
    examples: [
      ['Smartphones have changed how we communicate.', 'Điện thoại thông minh đã thay đổi cách chúng ta giao tiếp.', 1, 'Số nhiều không mạo từ, lối khái quát thông dụng nhất.'],
      ['A doctor must keep patient records confidential.', 'Bác sĩ phải giữ bí mật hồ sơ bệnh nhân.', 1, 'Lấy một cá thể làm đại diện cho cả nghề.'],
      ['The telephone changed the nineteenth century.', 'Điện thoại đã làm thay đổi thế kỷ mười chín.', 1, 'the + số ít, trang trọng, nói về phát minh.'],
      ['The elderly are often overlooked in policy debates.', 'Người cao tuổi thường bị bỏ quên trong các cuộc tranh luận chính sách.', 1, 'the + tính từ, động từ số nhiều.'],
      ['The smartphones have changed how we communicate.', 'Điện thoại thông minh đã thay đổi cách giao tiếp.', 0, 'Sai: khái quát thì bỏ "the". Sửa thành "Smartphones have changed…".'],
      ['The poors need more support from the government.', 'Người nghèo cần được nhà nước hỗ trợ nhiều hơn.', 0, 'Sai: sửa thành "The poor need more support…".']
    ],
    practice: [
      ['___ (–/The) children learn languages faster than adults.', '–', 'Trẻ em học ngôn ngữ nhanh hơn người lớn.'],
      ['___ (–/The) unemployed ___ (need / needs) better training schemes.', 'The … need', 'Người thất nghiệp cần chương trình đào tạo tốt hơn.'],
      ['___ (A / The) tiger is an endangered species.', 'The', 'Hổ là loài đang bị đe doạ.'],
      ['___ (–/The) books in this box belong to my sister.', 'The', 'Chỗ sách trong thùng này là của chị tôi.'],
      ['___ (A / The) nurse needs both patience and stamina.', 'A', 'Y tá cần cả sự kiên nhẫn lẫn sức bền.'],
      ['___ (–/The) rich ___ (get / gets) richer every year.', 'The … get', 'Người giàu mỗi năm một giàu thêm.'],
      ['___ (–/The) pollution is a serious problem in big cities.', '–', 'Ô nhiễm là vấn đề nghiêm trọng ở các thành phố lớn.'],
      ['She plays ___ (–/the) piano beautifully.', 'the', 'Cô ấy chơi piano rất hay.'],
      ['___ (–/The) young today face different pressures.', 'The', 'Người trẻ ngày nay đối mặt với những áp lực khác.'],
      ['___ (–/The) electric cars are becoming cheaper.', '–', 'Ô tô điện đang rẻ dần.']
    ]
  },

  /* ==================== C1 ==================== */

  {
    slug: 'article-academic-zero',
    en: 'Zero article in academic writing',
    vi: 'Bỏ mạo từ trong văn học thuật',
    level: 'C1',
    summary: 'Khái niệm trừu tượng và tên ngành trong bài học thuật thì bỏ mạo từ — nhưng hễ bị giới hạn bằng một cụm bổ nghĩa là phải thêm "the" ngay.',
    formula: {
      rows: [
        ['Khái niệm trừu tượng', 'Research suggests… · Evidence shows… · Poverty remains…'],
        ['Tên ngành', 'in economics · in linguistics · in applied physics'],
        ['Tiêu đề, chú thích', 'Figure 1 shows… · Table 2 presents… · Section 3 discusses…'],
        ['Cụm cố định', 'in conclusion · in practice · in theory · by definition · in general']
      ],
      note: 'Quy tắc quan trọng nhất của mục này: đã giới hạn bằng cụm bổ nghĩa thì phải có "the". "Research suggests…" nhưng "The research conducted in 2020 suggests…". Bỏ sót "the" ở vế sau là lỗi hay bị bắt nhất trong bài Viết học thuật.'
    },
    signals: ['Research suggests', 'Evidence shows', 'Figure 1', 'in conclusion', 'in theory', 'by definition'],
    useWhen: [
      'Nói về một khái niệm trừu tượng ở dạng chung nhất.',
      'Nhắc tên một ngành hoặc lĩnh vực.',
      'Đánh số hình, bảng, mục trong bài viết.',
      'Dùng các cụm cố định mở đoạn hoặc chuyển ý.'
    ],
    useNot: [
      { what: 'Không bỏ mạo từ khi danh từ đã bị giới hạn.', why: 'Có mệnh đề quan hệ, cụm giới từ hay phân từ bổ nghĩa phía sau thì phải có "the": "the evidence presented in Chapter 2".' },
      { what: 'Không dùng "the" trước tên ngành.', why: '"the economics" sai khi nói về ngành kinh tế học; chỉ đúng khi có bổ nghĩa: "the economics of climate change".' }
    ],
    confuse: [
      {
        with: 'research và the research',
        tell: 'Đứng trơ thì bỏ mạo từ; hễ có bổ nghĩa xác định là phải có "the".',
        pair: [
          { en: 'Research suggests a strong link.', vi: 'Các nghiên cứu cho thấy có mối liên hệ chặt chẽ. (nói chung)' },
          { en: 'The research conducted in 2020 suggests a strong link.', vi: 'Nghiên cứu tiến hành năm 2020 cho thấy mối liên hệ chặt chẽ. (đã giới hạn)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The research shows that sleep affects memory.', right: 'Research shows that sleep affects memory.', why: 'Nói chung về các nghiên cứu thì bỏ "the". Có "the" là ám chỉ một nghiên cứu cụ thể mà người đọc đã biết.' },
      { wrong: 'Evidence presented in Chapter 2 contradicts this.', right: 'The evidence presented in Chapter 2 contradicts this.', why: 'Đã giới hạn bằng "presented in Chapter 2" nên bắt buộc có "the".' }
    ],
    examples: [
      ['Research suggests that bilingualism delays cognitive decline.', 'Các nghiên cứu cho thấy song ngữ làm chậm suy giảm nhận thức.', 1, 'Khái niệm chung, bỏ mạo từ.'],
      ['The research discussed above has several limitations.', 'Nghiên cứu bàn ở trên có vài hạn chế.', 1, 'Đã giới hạn bằng "discussed above" nên có "the".'],
      ['Figure 3 shows the distribution of scores.', 'Hình 3 cho thấy phân bố điểm số.', 1, 'Tiêu đề hình không có mạo từ.'],
      ['In conclusion, further study is required.', 'Tóm lại, cần nghiên cứu thêm.', 1, 'Cụm cố định mở đoạn.'],
      ['The research shows that sleep affects memory.', 'Nghiên cứu cho thấy giấc ngủ ảnh hưởng tới trí nhớ.', 0, 'Sai: nói chung thì bỏ "the". Sửa thành "Research shows…".'],
      ['Evidence presented in Chapter 2 contradicts this claim.', 'Bằng chứng nêu ở Chương 2 mâu thuẫn với khẳng định này.', 0, 'Sai: đã giới hạn nên phải có "the". Sửa thành "The evidence presented…".']
    ],
    practice: [
      ['___ (–/The) evidence suggests a clear correlation.', '–', 'Bằng chứng cho thấy có tương quan rõ ràng.'],
      ['___ (–/The) evidence collected in this study is limited.', 'The', 'Bằng chứng thu thập trong nghiên cứu này còn hạn chế.'],
      ['She specialises in ___ (–/the) applied linguistics.', '–', 'Cô ấy chuyên về ngôn ngữ học ứng dụng.'],
      ['___ (–/The) economics of renewable energy has changed.', 'The', 'Bài toán kinh tế của năng lượng tái tạo đã thay đổi.'],
      ['___ (–/The) Table 4 summarises the findings.', '–', 'Bảng 4 tóm tắt các phát hiện.'],
      ['In ___ (–/the) theory, the model should hold.', '–', 'Về lý thuyết, mô hình lẽ ra phải đúng.'],
      ['___ (–/The) data presented in Figure 2 support this.', 'The', 'Dữ liệu trình bày ở Hình 2 ủng hộ điều này.'],
      ['___ (–/The) poverty remains a global concern.', '–', 'Nghèo đói vẫn là mối lo toàn cầu.'],
      ['___ (–/The) findings of the 2019 survey were surprising.', 'The', 'Kết quả khảo sát năm 2019 gây bất ngờ.'],
      ['By ___ (–/the) definition, a prime number has two divisors.', '–', 'Theo định nghĩa, số nguyên tố có hai ước.']
    ]
  },

  {
    slug: 'formal-quantifiers',
    en: 'Formal quantifiers',
    vi: 'Lượng từ trang trọng',
    level: 'C1',
    summary: 'Thay "a lot of" bằng lượng từ trang trọng là cách nâng điểm từ vựng dễ nhất trong bài Viết — miễn là chọn đúng loại danh từ.',
    formula: {
      rows: [
        ['Đếm được', 'a large number of · a considerable number of · numerous · a minority of'],
        ['Không đếm được', 'a great deal of · a considerable amount of · much'],
        ['Cả hai', 'a significant proportion of · plenty of'],
        ['Nên tránh khi viết', 'a lot of · lots of · loads of · tons of']
      ],
      note: 'Lỗi hay gặp là ghép sai loại: "a great deal of students" sai vì students đếm được; phải là "a large number of students". Ngược lại "a large number of information" cũng sai.'
    },
    signals: ['a great deal of', 'a large number of', 'a considerable amount of', 'numerous', 'a significant proportion of'],
    useWhen: [
      'Bài Viết học thuật và thư từ trang trọng.',
      '"a large number of" và "numerous" cho danh từ đếm được.',
      '"a great deal of" và "a considerable amount of" cho danh từ không đếm được.',
      '"a significant proportion of" khi muốn nói tỷ lệ mà không có số liệu chính xác.'
    ],
    useNot: [
      { what: 'Không ghép "a great deal of" với danh từ đếm được.', why: '"a great deal of students" sai; dùng "a large number of students".' },
      { what: 'Không nhồi quá tay.', why: 'Cả đoạn toàn "a considerable number of" nghe sáo rỗng và bị trừ điểm mạch lạc; xen kẽ với "many", "most" cho tự nhiên.' },
      { what: 'Không dùng "lots of" hay "loads of" trong bài viết.', why: 'Hai cụm này thuộc lối nói thân mật, làm tụt độ trang trọng của cả bài.' }
    ],
    confuse: [
      {
        with: 'a number of và the number of',
        tell: 'Hai cụm này nghĩa khác hẳn nhau và kéo theo hoà hợp chủ ngữ khác nhau — xem kỹ ở mục hoà hợp chủ ngữ.',
        pair: [
          { en: 'A number of students were absent.', vi: 'Một số sinh viên vắng mặt.' },
          { en: 'The number of students has risen.', vi: 'Số lượng sinh viên đã tăng.' }
        ]
      }
    ],
    errors: [
      { wrong: 'A great deal of students attended the seminar.', right: 'A large number of students attended the seminar.', why: 'students đếm được nên không dùng "a great deal of".' },
      { wrong: 'The report contains a large number of information.', right: 'The report contains a great deal of information.', why: 'information không đếm được nên không dùng "a large number of".' }
    ],
    examples: [
      ['A large number of participants withdrew from the study.', 'Một lượng lớn người tham gia rút khỏi nghiên cứu.', 1, 'participants đếm được.'],
      ['The project required a great deal of effort.', 'Dự án đòi hỏi rất nhiều công sức.', 1, 'effort không đếm được.'],
      ['Numerous studies have reached the same conclusion.', 'Nhiều nghiên cứu đã đi tới cùng một kết luận.', 1, 'numerous thay cho "a lot of" trong văn học thuật.'],
      ['A significant proportion of respondents disagreed.', 'Một tỷ lệ đáng kể người trả lời không đồng tình.', 1, 'Nói tỷ lệ khi không có số liệu chính xác.'],
      ['A great deal of students attended the seminar.', 'Rất nhiều sinh viên dự hội thảo.', 0, 'Sai: sửa thành "A large number of students".'],
      ['The report contains a large number of information.', 'Báo cáo chứa rất nhiều thông tin.', 0, 'Sai: sửa thành "a great deal of information".']
    ],
    practice: [
      ['___ (A great deal of / A large number of) evidence supports this view.', 'A great deal of', 'Rất nhiều bằng chứng ủng hộ quan điểm này.'],
      ['___ (A great deal of / A large number of) companies have adopted the policy.', 'A large number of', 'Nhiều công ty đã áp dụng chính sách này.'],
      ['___ (Numerous / Much) attempts have been made to solve it.', 'Numerous', 'Đã có nhiều nỗ lực giải quyết vấn đề này.'],
      ['The task required a considerable ___ (amount / number) of time.', 'amount', 'Công việc đòi hỏi khá nhiều thời gian.'],
      ['A considerable ___ (amount / number) of applicants were rejected.', 'number', 'Khá nhiều ứng viên bị loại.'],
      ['___ (A minority of / A great deal of) respondents opposed the plan.', 'A minority of', 'Một thiểu số người trả lời phản đối kế hoạch.'],
      ['This finding has attracted ___ (much / many) attention.', 'much', 'Phát hiện này đã thu hút nhiều sự chú ý.'],
      ['___ (Numerous / A great deal of) factors contribute to the problem.', 'Numerous', 'Nhiều yếu tố góp phần gây ra vấn đề.'],
      ['A significant ___ (proportion / number) of the budget was unspent.', 'proportion', 'Một phần đáng kể ngân sách chưa được tiêu.'],
      ['The museum houses ___ (a great deal of / numerous) rare manuscripts.', 'numerous', 'Bảo tàng lưu giữ nhiều bản thảo quý hiếm.']
    ]
  },

  {
    slug: 'quantifier-agreement',
    en: 'Subject–verb agreement with quantifiers',
    vi: 'Hoà hợp chủ ngữ với cụm lượng từ',
    level: 'C1',
    summary: '"a number of" đi với động từ số nhiều còn "the number of" đi với số ít. Đây là lỗi hoà hợp bị bắt nhiều nhất trong bài viết học thuật.',
    formula: {
      rows: [
        ['a number of + số nhiều', 'động từ SỐ NHIỀU: "A number of students are absent."'],
        ['the number of + số nhiều', 'động từ SỐ ÍT: "The number of students is rising."'],
        ['most / some / half / all of', 'chia theo danh từ SAU "of": "Most of the water is gone." · "Most of the books are new."'],
        ['one of + số nhiều', 'động từ SỐ ÍT: "One of my friends lives here."']
      ],
      note: 'Cách nhớ: "a number of" nghĩa là "một số", chủ ngữ thật là danh từ số nhiều phía sau. "the number of" nghĩa là "con số", chủ ngữ thật là chữ "number" nên số ít.'
    },
    signals: ['a number of', 'the number of', 'one of', 'most of', 'each of', 'neither of'],
    useWhen: [
      '"a number of" khi muốn nói "một số" — động từ chia số nhiều.',
      '"the number of" khi nói về con số hoặc số lượng đang tăng giảm — động từ số ít.',
      'Với most, some, half, all, none: nhìn danh từ ngay sau "of" để chia động từ.',
      'Với "one of", "each of", "neither of": động từ luôn số ít.'
    ],
    useNot: [
      { what: 'Không chia số ít sau "a number of".', why: '"A number of students is absent" sai; chủ ngữ thật là "students".' },
      { what: 'Không chia số nhiều sau "one of".', why: '"One of my friends live here" sai; chủ ngữ thật là "one".' },
      { what: 'Không nhìn danh từ đứng xa để chia động từ.', why: 'Với "most of", danh từ quyết định là cái ngay sau "of", không phải cái ở cuối câu.' }
    ],
    confuse: [
      {
        with: 'a number of và the number of',
        tell: 'Đổi một chữ mạo từ là đổi cả chủ ngữ thật lẫn động từ. Đây là cặp ra đề rất nhiều.',
        pair: [
          { en: 'A number of problems remain unsolved.', vi: 'Một số vấn đề vẫn chưa được giải quyết.' },
          { en: 'The number of problems has decreased.', vi: 'Số lượng vấn đề đã giảm.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The number of students have increased sharply.', right: 'The number of students has increased sharply.', why: 'Chủ ngữ thật là "number" nên động từ số ít.' },
      { wrong: 'One of my colleagues have resigned.', right: 'One of my colleagues has resigned.', why: 'Chủ ngữ thật là "one" nên động từ số ít.' }
    ],
    examples: [
      ['A number of factors influence the outcome.', 'Một số yếu tố ảnh hưởng tới kết quả.', 1, '"a number of" kéo động từ số nhiều.'],
      ['The number of applicants has doubled.', 'Số lượng ứng viên đã tăng gấp đôi.', 1, '"the number of" kéo động từ số ít.'],
      ['Most of the water was contaminated.', 'Phần lớn nước đã bị nhiễm bẩn.', 1, 'Danh từ sau "of" không đếm được nên động từ số ít.'],
      ['One of the answers is clearly wrong.', 'Một trong các câu trả lời rõ ràng là sai.', 1, '"one of" luôn kéo động từ số ít.'],
      ['The number of students have increased sharply.', 'Số lượng sinh viên đã tăng mạnh.', 0, 'Sai: sửa thành "The number of students has increased sharply."'],
      ['One of my colleagues have resigned.', 'Một đồng nghiệp của tôi đã nghỉ việc.', 0, 'Sai: sửa thành "One of my colleagues has resigned."']
    ],
    practice: [
      ['A number of questions ___ (remain / remains) unanswered.', 'remain', 'Một số câu hỏi vẫn chưa có lời giải.'],
      ['The number of accidents ___ (have / has) fallen this year.', 'has', 'Số vụ tai nạn năm nay đã giảm.'],
      ['One of the machines ___ (is / are) broken.', 'is', 'Một trong các máy bị hỏng.'],
      ['Most of the furniture ___ (was / were) damaged.', 'was', 'Phần lớn đồ đạc bị hỏng.'],
      ['Most of the chairs ___ (was / were) damaged.', 'were', 'Phần lớn ghế bị hỏng.'],
      ['Neither of the proposals ___ (was / were) accepted.', 'was', 'Không đề xuất nào được chấp nhận.'],
      ['Half of the students ___ (has / have) already left.', 'have', 'Một nửa số sinh viên đã về.'],
      ['Half of the milk ___ (has / have) gone off.', 'has', 'Một nửa chỗ sữa đã hỏng.'],
      ['A number of witnesses ___ (was / were) called.', 'were', 'Một số nhân chứng đã được triệu tập.'],
      ['Each of the reports ___ (contain / contains) an error.', 'contains', 'Mỗi bản báo cáo đều chứa một lỗi.']
    ]
  },

  /* ==================== C2 ==================== */

  {
    slug: 'article-idioms',
    en: 'Articles in fixed expressions',
    vi: 'Mạo từ trong thành ngữ và cụm cố định',
    level: 'C2',
    summary: 'Nhóm này không suy ra được bằng quy tắc, phải nhớ nguyên cụm. Bù lại chúng xuất hiện dày trong đề đọc và là điểm cộng rõ ở bài viết.',
    formula: {
      rows: [
        ['Không mạo từ', 'at first sight · in fact · on foot · by heart · out of order · in charge of · at risk'],
        ['Có the', 'in the long run · on the whole · in the meantime · by the way · to the point'],
        ['Có a/an', 'as a rule · in a hurry · at a loss · as a matter of fact · at a glance'],
        ['Đổi mạo từ là đổi nghĩa', 'take place (diễn ra) ≠ take the place of (thay thế) · in place (đúng chỗ) ≠ in the place of']
      ],
      note: 'Vài cặp bẫy nữa: "in future" (Anh - Anh, từ nay trở đi) khác "in the future" (trong tương lai); "go to sea" (đi biển làm nghề) khác "go to the sea" (ra biển chơi).'
    },
    signals: ['in fact', 'in the long run', 'as a rule', 'by heart', 'on the whole', 'take place'],
    useWhen: [
      'Dùng nguyên cụm, không tự thêm bớt mạo từ.',
      'Cụm chuyển ý trong bài viết: "on the whole", "in the long run", "as a matter of fact".',
      'Cụm chỉ cách thức: "on foot", "by heart", "at a glance".'
    ],
    useNot: [
      { what: 'Không suy diễn mạo từ theo quy tắc chung.', why: '"in the fact" và "on the foot" đều sai dù nghe có vẻ hợp lý.' },
      { what: 'Không đổi "the" trong cụm cố định.', why: '"in a long run" sai; chỉ có "in the long run".' }
    ],
    confuse: [
      {
        with: 'take place và take the place of',
        tell: 'Không mạo từ nghĩa là diễn ra; có "the … of" nghĩa là thay thế cho ai đó.',
        pair: [
          { en: 'The ceremony will take place on Friday.', vi: 'Buổi lễ sẽ diễn ra vào thứ Sáu.' },
          { en: 'She took the place of the previous director.', vi: 'Cô ấy thay chỗ giám đốc trước.' }
        ]
      },
      {
        with: 'in future và in the future',
        tell: '"in future" (Anh - Anh) nghĩa là từ nay trở đi, thường mang ý nhắc nhở; "in the future" nghĩa là trong tương lai nói chung.',
        pair: [
          { en: 'Please be more careful in future.', vi: 'Từ giờ nhớ cẩn thận hơn nhé.' },
          { en: 'In the future, cars may fly.', vi: 'Trong tương lai, ô tô có thể biết bay.' }
        ]
      }
    ],
    errors: [
      { wrong: 'In the fact, the results were disappointing.', right: 'In fact, the results were disappointing.', why: 'Cụm cố định là "in fact", không có mạo từ.' },
      { wrong: 'This policy will help in a long run.', right: 'This policy will help in the long run.', why: 'Cụm cố định là "in the long run".' }
    ],
    examples: [
      ['In fact, the opposite is true.', 'Thực ra thì điều ngược lại mới đúng.', 1, 'Cụm không mạo từ.'],
      ['On the whole, the project was a success.', 'Nhìn chung, dự án đã thành công.', 1, 'Cụm có "the".'],
      ['As a rule, we do not accept late submissions.', 'Theo lệ, chúng tôi không nhận bài nộp muộn.', 1, 'Cụm có "a".'],
      ['The meeting will take place in Room 5.', 'Cuộc họp sẽ diễn ra ở phòng 5.', 1, '"take place" không có mạo từ.'],
      ['In the fact, the results were disappointing.', 'Thực ra kết quả khá đáng thất vọng.', 0, 'Sai: sửa thành "In fact, the results were disappointing."'],
      ['This policy will help in a long run.', 'Chính sách này sẽ có ích về lâu dài.', 0, 'Sai: sửa thành "in the long run".']
    ],
    practice: [
      ['She learnt the whole poem by ___ (–/the) heart.', '–', 'Cô ấy học thuộc lòng cả bài thơ.'],
      ['___ (In / In the) fact, nobody noticed the change.', 'In', 'Thực ra chẳng ai để ý tới thay đổi đó.'],
      ['We walked there on ___ (–/the) foot.', '–', 'Chúng tôi đi bộ tới đó.'],
      ['In ___ (a / the) long run, this will save money.', 'the', 'Về lâu dài, cách này sẽ tiết kiệm tiền.'],
      ['As ___ (a / the) rule, the office closes at five.', 'a', 'Theo lệ, văn phòng đóng cửa lúc năm giờ.'],
      ['The lift is out of ___ (–/the) order again.', '–', 'Thang máy lại hỏng rồi.'],
      ['She was at ___ (a / the) loss for words.', 'a', 'Cô ấy không biết nói gì.'],
      ['The conference took ___ (–/the) place in Da Nang.', '–', 'Hội nghị diễn ra ở Đà Nẵng.'],
      ['Who is in ___ (–/the) charge of this department?', '–', 'Ai phụ trách bộ phận này?'],
      ['On ___ (a / the) whole, I agree with you.', 'the', 'Nhìn chung tôi đồng ý với bạn.']
    ]
  },

  {
    slug: 'nominalisation',
    en: 'Nominalisation',
    vi: 'Danh từ hoá trong văn phong học thuật',
    level: 'C2',
    summary: 'Biến động từ và tính từ thành danh từ để câu cô đọng, khách quan. Dùng đúng liều thì lên điểm, quá tay thì câu nặng và mất mạch lạc.',
    formula: {
      rows: [
        ['Động từ thành danh từ', 'decide → decision · analyse → analysis · fail → failure · grow → growth'],
        ['Tính từ thành danh từ', 'difficult → difficulty · able → ability · important → importance'],
        ['Nén cả mệnh đề', '"They decided quickly" → "their rapid decision"'],
        ['Đóng gói ý vừa nói', '"Sales fell sharply. This decline suggests…"']
      ],
      note: 'Đuôi thường gặp: -tion, -sion, -ment, -ness, -ity, -ance, -ence, -al, -ure. Danh từ hoá thường kéo theo mạo từ và giới từ mới, nên phải soát lại cả cụm chứ không chỉ đổi một từ.'
    },
    signals: ['-tion', '-ment', '-ness', '-ity', '-ance', 'This increase', 'This finding', 'Such a decline'],
    useWhen: [
      'Bài viết học thuật, báo cáo, tóm tắt — cần khách quan và cô đọng.',
      'Nén một mệnh đề dài thành cụm danh từ để câu gọn hơn.',
      'Mở câu sau bằng danh từ đóng gói ý câu trước, tạo liên kết mạch lạc.',
      'Tránh nêu chủ thể hành động khi không cần thiết.'
    ],
    useNot: [
      { what: 'Không danh từ hoá cả đoạn.', why: 'Đoạn văn toàn danh từ trừu tượng thì khó đọc và bị trừ điểm mạch lạc; xen câu có động từ thật cho dễ thở.' },
      { what: 'Không quên chỉnh mạo từ và giới từ đi kèm.', why: '"analyse the data" thành danh từ phải là "the analysis OF the data", không phải "the analysis the data".' },
      { what: 'Không dùng trong văn nói hoặc thư thân mật.', why: 'Nghe khoa trương và xa cách; lúc đó dùng động từ tự nhiên hơn.' }
    ],
    confuse: [
      {
        with: 'câu dùng động từ và câu danh từ hoá',
        tell: 'Cùng một ý, dạng động từ tự nhiên và dễ đọc, dạng danh từ hoá cô đọng và trang trọng hơn. Chọn theo văn cảnh chứ không phải lúc nào cũng chọn dạng sau.',
        pair: [
          { en: 'The government decided to raise taxes, which angered many people.', vi: 'Chính phủ quyết định tăng thuế, làm nhiều người tức giận.' },
          { en: 'The decision to raise taxes caused widespread anger.', vi: 'Quyết định tăng thuế gây phẫn nộ trên diện rộng.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The analysis the data revealed three patterns.', right: 'The analysis of the data revealed three patterns.', why: 'Danh từ hoá kéo theo giới từ "of"; không giữ nguyên tân ngữ trực tiếp như khi còn là động từ.' },
      { wrong: 'The implementation of the reduction of the number of the staff was difficult.', right: 'Reducing staff numbers proved difficult.', why: 'Chồng bốn tầng danh từ hoá làm câu tắc nghẽn. Trả một tầng về dạng động từ là đọc được ngay.' }
    ],
    examples: [
      ['The decision was made after long discussion.', 'Quyết định được đưa ra sau một hồi thảo luận dài.', 1, 'decide và discuss đều đã danh từ hoá.'],
      ['The analysis of the data revealed three patterns.', 'Việc phân tích dữ liệu cho thấy ba khuôn mẫu.', 1, 'Danh từ hoá kèm giới từ "of".'],
      ['Sales fell sharply. This decline worried investors.', 'Doanh số giảm mạnh. Sự sụt giảm này làm giới đầu tư lo ngại.', 1, 'Danh từ đóng gói ý câu trước, tạo liên kết.'],
      ['Their rapid response prevented further damage.', 'Phản ứng nhanh của họ đã ngăn thiệt hại lan rộng.', 1, 'Nén "they responded rapidly" thành một cụm danh từ.'],
      ['The analysis the data revealed three patterns.', 'Việc phân tích dữ liệu cho thấy ba khuôn mẫu.', 0, 'Sai: thiếu "of". Sửa thành "The analysis of the data".'],
      ['The implementation of the reduction of the number of the staff was difficult.', 'Việc thực hiện cắt giảm số lượng nhân sự gặp khó khăn.', 0, 'Sai vì lạm dụng: bốn tầng danh từ hoá liền nhau. Sửa thành "Reducing staff numbers proved difficult."']
    ],
    practice: [
      ['They decided quickly. → Their quick ___ (decide) saved the project.', 'decision', 'Quyết định nhanh của họ đã cứu dự án.'],
      ['The company grew fast. → The rapid ___ (grow) surprised analysts.', 'growth', 'Tăng trưởng nhanh khiến giới phân tích bất ngờ.'],
      ['He failed to reply. → His ___ (fail) to reply caused delays.', 'failure', 'Việc anh ấy không trả lời gây chậm trễ.'],
      ['The task was difficult. → We underestimated the ___ (difficult) of the task.', 'difficulty', 'Chúng tôi đã đánh giá thấp độ khó của công việc.'],
      ['She can lead well. → Her ___ (able) to lead is well known.', 'ability', 'Khả năng lãnh đạo của cô ấy ai cũng biết.'],
      ['They analysed the results. → The ___ (analyse) took two weeks.', 'analysis', 'Việc phân tích mất hai tuần.'],
      ['The policy was implemented. → The ___ (implement) began in June.', 'implementation', 'Việc triển khai bắt đầu từ tháng Sáu.'],
      ['It is important. → We stressed the ___ (important) of early testing.', 'importance', 'Chúng tôi nhấn mạnh tầm quan trọng của việc xét nghiệm sớm.'],
      ['Prices increased. → The ___ (increase) in prices affected demand.', 'increase', 'Việc giá tăng ảnh hưởng tới nhu cầu.'],
      ['The analysis ___ (of / –) the sample took a week.', 'of', 'Việc phân tích mẫu mất một tuần.']
    ]
  }
];

/** Điểm ngữ pháp — nhóm danh từ, mạo từ, lượng từ bậc B1–C2. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'noun',
    level: p.level,
    summary: p.summary,
    formula_json: JSON.stringify(p.formula),
    signals_json: JSON.stringify(p.signals),
    use_when_json: JSON.stringify(p.useWhen),
    use_not_json: JSON.stringify(p.useNot),
    confuse_json: JSON.stringify(p.confuse),
    errors_json: JSON.stringify(p.errors),
    // Số thứ tự cuối cùng do seedGrammar đánh lại theo thứ tự tệp, để phần
    // A1–A2 luôn đứng trước phần B1–C2 trong cùng một nhóm.
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
