/**
 * Ngữ pháp — nhóm DANH TỪ · MẠO TỪ · LƯỢNG TỪ, phần bậc A1 và A2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 28 điểm
 * (A1 ×8, A2 ×6, B1 ×5, B2 ×4, C1 ×3, C2 ×2). Tệp này soạn trọn 14 điểm của
 * A1 và A2; 14 điểm bậc B1–C2 tách thành mục riêng trong hàng đợi để mỗi lượt
 * còn đủ chỗ soi kỹ từng câu.
 *
 * Vì sao nhóm này nặng với người Việt: tiếng Việt không có mạo từ và không đổi
 * hình thái danh từ theo số. Hai chỗ đó chiếm phần lớn lỗi, nên mỗi điểm đều
 * có mục "KHÔNG dùng khi nào" và phản ví dụ kèm cách sửa.
 *
 * Mỗi điểm: 6 câu ví dụ (trong đó ít nhất 2 phản ví dụ) + 10 câu luyện tập,
 * đúng khung "5–10 ví dụ, 10+ câu luyện" của docs/LEARNING.md.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A1 ==================== */

  {
    slug: 'noun-plural',
    en: 'Regular plural nouns',
    vi: 'Danh từ số nhiều có quy tắc',
    level: 'A1',
    summary: 'Thêm -s vào danh từ đếm được khi có từ hai trở lên. Tiếng Việt không đổi danh từ nên đây là lỗi bị trừ điểm nhiều nhất.',
    formula: {
      rows: [
        ['Thường', 'danh từ + -s: book → books, pen → pens'],
        ['-s -x -z -ch -sh', '+ -es: box → boxes, watch → watches'],
        ['phụ âm + y', 'y → ies: city → cities, story → stories'],
        ['-f, -fe', 'thường → -ves: leaf → leaves, knife → knives']
      ],
      note: 'Nguyên âm + y giữ nguyên: boy → boys, day → days. Một số từ tận cùng -o thêm -es (potato → potatoes, tomato → tomatoes) nhưng photo → photos, piano → pianos.'
    },
    signals: ['-s', '-es', '-ies', '-ves', 'two', 'many', 'several', 'both'],
    useWhen: [
      'Danh từ đếm được, số lượng từ hai trở lên.',
      'Sau số đếm lớn hơn một, sau many, several, a few, both.',
      'Khi nói chung về cả loại: "Dogs are loyal animals."'
    ],
    useNot: [
      { what: 'Danh từ không đếm được.', why: 'water, rice, money, information, advice, furniture, news không có dạng số nhiều — "informations" luôn sai.' },
      { what: 'Danh từ nằm trong cụm bổ nghĩa có gạch nối.', why: 'Giữ số ít: "a five-year-old boy", "a two-hour meeting", không phải "a two-hours meeting".' }
    ],
    confuse: [
      {
        with: 'danh từ không đếm được',
        tell: 'Đếm được thì có số nhiều và đi được với a/an; không đếm được thì không có cả hai.',
        pair: [
          { en: 'I bought three books.', vi: 'Tôi mua ba cuốn sách.' },
          { en: 'I need some information.', vi: 'Tôi cần một ít thông tin. (không có "informations")' }
        ]
      }
    ],
    errors: [
      { wrong: 'I have two book.', right: 'I have two books.', why: 'Có số đếm lớn hơn một thì danh từ phải ở dạng số nhiều. Tiếng Việt không đổi danh từ nên rất dễ quên.' },
      { wrong: 'She gave me many advices.', right: 'She gave me a lot of advice.', why: 'advice là danh từ không đếm được, không có dạng "advices".' }
    ],
    examples: [
      ['She has three brothers and two sisters.', 'Cô ấy có ba anh trai và hai chị gái.', 1, 'Số đếm lớn hơn một nên danh từ ở số nhiều.'],
      ['There are five boxes on the table.', 'Có năm cái hộp trên bàn.', 1, 'Tận cùng -x nên thêm -es.'],
      ['We visited three cities last summer.', 'Mùa hè trước chúng tôi thăm ba thành phố.', 1, 'Phụ âm + y đổi thành -ies.'],
      ['He bought two knives for the kitchen.', 'Anh ấy mua hai con dao cho bếp.', 1, '-fe đổi thành -ves.'],
      ['I have two book.', 'Tôi có hai quyển sách.', 0, 'Sai: thiếu -s. Sửa thành "I have two books."'],
      ['She gave me many advices.', 'Cô ấy cho tôi nhiều lời khuyên.', 0, 'Sai: advice không đếm được. Sửa thành "a lot of advice".']
    ],
    practice: [
      ['I need two ___ (box) for these books.', 'boxes', 'Tôi cần hai cái hộp để đựng chỗ sách này.'],
      ['There are many ___ (city) in Viet Nam.', 'cities', 'Việt Nam có nhiều thành phố.'],
      ['She cut the bread with two ___ (knife).', 'knives', 'Cô ấy cắt bánh mì bằng hai con dao.'],
      ['My brother has three ___ (watch).', 'watches', 'Anh trai tôi có ba cái đồng hồ.'],
      ['We took a lot of ___ (photo) yesterday.', 'photos', 'Hôm qua chúng tôi chụp rất nhiều ảnh.'],
      ['The farmer grows ___ (potato) and ___ (tomato).', 'potatoes … tomatoes', 'Bác nông dân trồng khoai tây và cà chua.'],
      ['There are seven ___ (day) in a week.', 'days', 'Một tuần có bảy ngày.'],
      ['I met two ___ (boy) at the bus stop.', 'boys', 'Tôi gặp hai cậu bé ở bến xe buýt.'],
      ['She told me three ___ (story).', 'stories', 'Cô ấy kể cho tôi ba câu chuyện.'],
      ['The autumn ___ (leaf) are falling.', 'leaves', 'Lá mùa thu đang rụng.']
    ]
  },

  {
    slug: 'noun-plural-irregular',
    en: 'Irregular plural nouns',
    vi: 'Danh từ số nhiều bất quy tắc',
    level: 'A1',
    summary: 'Một nhóm nhỏ danh từ đổi hẳn hình thái hoặc giữ nguyên khi sang số nhiều. Phải nhớ, không suy ra được.',
    formula: {
      rows: [
        ['Đổi nguyên âm', 'man → men, woman → women, foot → feet, tooth → teeth'],
        ['Thêm -en', 'child → children, ox → oxen'],
        ['Giữ nguyên', 'sheep, fish, deer, series, species, aircraft'],
        ['Gốc Latin, Hy Lạp', 'analysis → analyses, crisis → crises, phenomenon → phenomena, criterion → criteria']
      ],
      note: 'person → people là dạng thường dùng; "persons" gần như chỉ gặp trong văn bản pháp lý. "fishes" chỉ dùng khi nói nhiều LOÀI cá khác nhau.'
    },
    signals: ['men', 'women', 'children', 'feet', 'teeth', 'people', 'criteria', 'analyses'],
    useWhen: [
      'Dùng đúng dạng bất quy tắc thay vì thêm -s.',
      'Trong bài viết học thuật, chú ý nhóm gốc Latin: analysis → analyses, hypothesis → hypotheses, basis → bases.'
    ],
    useNot: [
      { what: 'Không thêm -s vào dạng vốn đã là số nhiều.', why: '"childrens", "mens", "peoples" (với nghĩa nhiều người) đều sai.' },
      { what: 'Không dùng động từ số ít sau danh từ số nhiều bất quy tắc.', why: '"The children is playing" sai; phải là "The children are playing".' }
    ],
    confuse: [
      {
        with: 'people / peoples',
        tell: 'people là số nhiều của person. Dạng "peoples" chỉ dùng khi nói nhiều DÂN TỘC.',
        pair: [
          { en: 'Ten people are waiting outside.', vi: 'Mười người đang đợi bên ngoài.' },
          { en: 'The peoples of Southeast Asia share many customs.', vi: 'Các dân tộc Đông Nam Á có nhiều phong tục chung.' }
        ]
      },
      {
        with: 'data số ít hay số nhiều',
        tell: 'Văn học thuật chuẩn coi data là số nhiều của datum; văn phong đời thường nay chấp nhận data như danh từ không đếm được đi với động từ số ít.',
        pair: [
          { en: 'These data show a clear trend.', vi: 'Những dữ liệu này cho thấy một xu hướng rõ rệt. (học thuật)' },
          { en: 'The data is still being collected.', vi: 'Dữ liệu vẫn đang được thu thập. (đời thường, được chấp nhận rộng rãi)' }
        ]
      }
    ],
    errors: [
      { wrong: 'There are many childrens in the park.', right: 'There are many children in the park.', why: 'children đã là số nhiều rồi, không thêm -s nữa.' },
      { wrong: 'My foots hurt after the long walk.', right: 'My feet hurt after the long walk.', why: 'foot đổi thành feet, không có dạng "foots".' }
    ],
    examples: [
      ['Three men were waiting at the gate.', 'Ba người đàn ông đang đợi ở cổng.', 1, 'man đổi thành men.'],
      ['The children are playing outside.', 'Bọn trẻ đang chơi ngoài sân.', 1, 'child → children, động từ theo số nhiều là "are".'],
      ['I brush my teeth twice a day.', 'Tôi đánh răng hai lần một ngày.', 1, 'tooth đổi thành teeth.'],
      ['The farmer keeps twenty sheep.', 'Bác nông dân nuôi hai mươi con cừu.', 1, 'sheep giữ nguyên ở số nhiều.'],
      ['There are many childrens in the park.', 'Có nhiều trẻ em trong công viên.', 0, 'Sai: children đã là số nhiều. Sửa thành "many children".'],
      ['My foots hurt after the long walk.', 'Chân tôi đau sau chặng đi bộ dài.', 0, 'Sai: foot → feet. Sửa thành "My feet hurt".']
    ],
    practice: [
      ['Two ___ (woman) are talking at the door.', 'women', 'Hai người phụ nữ đang nói chuyện ở cửa.'],
      ['The dentist checked my ___ (tooth).', 'teeth', 'Nha sĩ kiểm tra răng cho tôi.'],
      ['How many ___ (person) came to the party?', 'people', 'Có bao nhiêu người tới bữa tiệc?'],
      ['We caught three ___ (fish) this morning.', 'fish', 'Sáng nay chúng tôi câu được ba con cá.'],
      ['The ___ (child) need more sleep.', 'children', 'Bọn trẻ cần ngủ nhiều hơn.'],
      ['My ___ (foot) are cold.', 'feet', 'Chân tôi lạnh.'],
      ['The study met all three ___ (criterion).', 'criteria', 'Nghiên cứu đạt cả ba tiêu chí.'],
      ['Several ___ (analysis) support this view.', 'analyses', 'Nhiều phân tích ủng hộ quan điểm này.'],
      ['There are fifty ___ (sheep) on the hill.', 'sheep', 'Có năm mươi con cừu trên đồi.'],
      ['Two ___ (man) helped us move the sofa.', 'men', 'Hai người đàn ông giúp chúng tôi khiêng ghế sofa.']
    ]
  },

  {
    slug: 'noun-countability',
    en: 'Countable and uncountable nouns',
    vi: 'Danh từ đếm được và không đếm được',
    level: 'A1',
    summary: 'Đếm được thì có số nhiều và đi với a/an; không đếm được thì không. Nhóm danh từ tiếng Anh coi là không đếm được nhưng tiếng Việt đếm bình thường mới là chỗ bẫy.',
    formula: {
      rows: [
        ['Đếm được', 'a book / two books · a lot of books · many books · How many…?'],
        ['Không đếm được', 'water · a lot of water · much water · How much…?'],
        ['Đo lượng', 'a piece of advice, a glass of water, two kilos of rice']
      ],
      note: 'Danh sách cần thuộc vì tiếng Việt đếm được nhưng tiếng Anh thì không: information, advice, news, furniture, luggage, equipment, homework, work, research, money, bread, rice, water, music, knowledge, traffic, progress.'
    },
    signals: ['a / an', 'many', 'few', 'How many', 'much', 'little', 'How much', 'a piece of'],
    useWhen: [
      'Danh từ đếm được: dùng a/an ở số ít, thêm -s ở số nhiều.',
      'Danh từ không đếm được: luôn ở dạng số ít, đi với động từ số ít.',
      'Muốn đếm danh từ không đếm được thì mượn đơn vị: a piece of, a glass of, a bottle of.'
    ],
    useNot: [
      { what: 'Không dùng a/an trước danh từ không đếm được.', why: '"an advice", "a furniture", "an information" đều sai; nói "a piece of advice", "a piece of furniture".' },
      { what: 'Không dùng many với danh từ không đếm được.', why: 'Dùng much hoặc a lot of: "much money", "a lot of money", không phải "many money".' }
    ],
    confuse: [
      {
        with: 'news trông như số nhiều',
        tell: 'news tận cùng bằng -s nhưng là danh từ không đếm được, đi với động từ số ít.',
        pair: [
          { en: 'The news is good today.', vi: 'Tin hôm nay tốt lành.' },
          { en: 'That is a piece of good news.', vi: 'Đó là một tin tốt. (muốn đếm thì mượn "a piece of")' }
        ]
      }
    ],
    errors: [
      { wrong: 'I need an information about the course.', right: 'I need some information about the course.', why: 'information không đếm được nên không đi với "an".' },
      { wrong: 'We bought many furnitures.', right: 'We bought a lot of furniture.', why: 'furniture không đếm được: không thêm -s, không dùng many.' }
    ],
    examples: [
      ['I drink two cups of coffee every morning.', 'Sáng nào tôi cũng uống hai tách cà phê.', 1, 'coffee không đếm được nên mượn đơn vị "cup".'],
      ['She gave me a useful piece of advice.', 'Cô ấy cho tôi một lời khuyên hữu ích.', 1, 'Đếm advice bằng "a piece of".'],
      ['How much money do you need?', 'Bạn cần bao nhiêu tiền?', 1, 'money không đếm được nên hỏi bằng "How much".'],
      ['How many students are there in your class?', 'Lớp bạn có bao nhiêu học sinh?', 1, 'student đếm được nên hỏi bằng "How many".'],
      ['I need an information about the course.', 'Tôi cần một thông tin về khoá học.', 0, 'Sai: information không đếm được. Sửa thành "some information".'],
      ['We bought many furnitures for the new flat.', 'Chúng tôi mua nhiều đồ đạc cho căn hộ mới.', 0, 'Sai: furniture không đếm được. Sửa thành "a lot of furniture".']
    ],
    practice: [
      ['How ___ (much / many) sugar do you take?', 'much', 'Bạn dùng bao nhiêu đường?'],
      ['How ___ (much / many) chairs do we need?', 'many', 'Chúng ta cần bao nhiêu cái ghế?'],
      ['She gave me two ___ (piece) of advice.', 'pieces', 'Cô ấy cho tôi hai lời khuyên.'],
      ['There is too ___ (much / many) traffic today.', 'much', 'Hôm nay xe cộ đông quá.'],
      ['I bought a ___ (bottle) of water.', 'bottle', 'Tôi mua một chai nước.'],
      ['The news ___ (be) very surprising.', 'is', 'Tin đó rất bất ngờ.'],
      ['We have a lot of ___ (homework) tonight.', 'homework', 'Tối nay chúng tôi có nhiều bài tập.'],
      ['He does not have ___ (much / many) free time.', 'much', 'Anh ấy không có nhiều thời gian rảnh.'],
      ['Can I have a ___ (slice) of bread?', 'slice', 'Cho tôi xin một lát bánh mì được không?'],
      ['There ___ (be) some rice in the pot.', 'is', 'Trong nồi còn ít cơm.']
    ]
  },

  {
    slug: 'article-a-an',
    en: 'Indefinite article: a / an',
    vi: 'Mạo từ a / an',
    level: 'A1',
    summary: 'Đặt trước danh từ đếm được số ít khi nhắc tới lần đầu hoặc không xác định. Chọn a hay an dựa vào ÂM đầu, không phải chữ cái.',
    formula: {
      rows: [
        ['a + âm phụ âm', 'a book, a car, a university, a European country'],
        ['an + âm nguyên âm', 'an apple, an hour, an honest man, an MBA'],
        ['Nghề nghiệp', 'She is a doctor. He is an engineer.']
      ],
      note: 'Quyết định theo ÂM chứ không theo chữ: "university" đọc /juː-/ nên dùng "a"; "hour" câm chữ h, đọc /aʊə/ nên dùng "an". Chữ viết tắt đọc theo tên chữ cái cũng vậy: "an MBA" vì đọc là /em-biː-eɪ/.'
    },
    signals: ['a', 'an', 'lần đầu nhắc tới', 'một trong nhiều', 'nghề nghiệp'],
    useWhen: [
      'Nhắc tới một vật đếm được số ít lần đầu tiên, người nghe chưa biết là cái nào.',
      'Nói về nghề nghiệp: "She is a nurse."',
      'Nghĩa "một" khi đếm: "I waited an hour."',
      'Nói chung về cả loại theo lối lấy một cá thể làm đại diện: "A dog needs exercise."'
    ],
    useNot: [
      { what: 'Trước danh từ số nhiều hoặc không đếm được.', why: '"a books", "a water" đều sai. Số nhiều dùng some hoặc không mạo từ.' },
      { what: 'Khi cả người nói và người nghe đều biết rõ vật nào.', why: 'Lúc đó dùng "the": "Close the door" (cái cửa ngay đây).' }
    ],
    confuse: [
      {
        with: 'the',
        tell: 'Lần đầu nhắc tới dùng a/an; từ lần thứ hai trở đi, khi người nghe đã biết, dùng the.',
        pair: [
          { en: 'I saw a cat in the garden.', vi: 'Tôi thấy một con mèo trong vườn. (lần đầu nhắc)' },
          { en: 'The cat was sleeping.', vi: 'Con mèo đó đang ngủ. (đã nhắc rồi, người nghe biết con nào)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She is teacher.', right: 'She is a teacher.', why: 'Tiếng Việt nói "Cô ấy là giáo viên" không cần mạo từ, nhưng tiếng Anh bắt buộc có a/an trước nghề nghiệp số ít.' },
      { wrong: 'I waited for a hour.', right: 'I waited for an hour.', why: '"hour" câm chữ h, mở đầu bằng âm nguyên âm nên dùng "an".' }
    ],
    examples: [
      ['I bought a new phone yesterday.', 'Hôm qua tôi mua một chiếc điện thoại mới.', 1, 'Lần đầu nhắc tới, người nghe chưa biết cái nào.'],
      ['My sister is an architect.', 'Chị tôi là kiến trúc sư.', 1, 'Nghề nghiệp số ít bắt buộc có mạo từ.'],
      ['He studies at a university in Hue.', 'Anh ấy học ở một trường đại học tại Huế.', 1, '"university" đọc là /juː-/ nên dùng "a".'],
      ['We waited for an hour at the airport.', 'Chúng tôi đợi một tiếng ở sân bay.', 1, '"hour" câm h nên dùng "an".'],
      ['She is teacher at my school.', 'Cô ấy là giáo viên ở trường tôi.', 0, 'Sai: thiếu mạo từ. Sửa thành "She is a teacher".'],
      ['I need a advice from you.', 'Tôi cần một lời khuyên từ bạn.', 0, 'Sai hai lỗi: advice không đếm được, và trước âm nguyên âm phải dùng "an". Sửa thành "I need some advice".']
    ],
    practice: [
      ['She works as ___ (a / an) engineer.', 'an', 'Cô ấy làm kỹ sư.'],
      ['I read ___ (a / an) interesting book last week.', 'an', 'Tuần trước tôi đọc một cuốn sách thú vị.'],
      ['He is ___ (a / an) honest person.', 'an', 'Anh ấy là người trung thực.'],
      ['They live in ___ (a / an) old house.', 'an', 'Họ sống trong một ngôi nhà cũ.'],
      ['My father is ___ (a / an) doctor.', 'a', 'Bố tôi là bác sĩ.'],
      ['We waited ___ (a / an) hour for the bus.', 'an', 'Chúng tôi đợi xe buýt một tiếng.'],
      ['She has ___ (a / an) MA in linguistics.', 'an', 'Cô ấy có bằng thạc sĩ ngôn ngữ học.'],
      ['That is ___ (a / an) useful idea.', 'a', 'Đó là một ý hay.'],
      ['I want to be ___ (a / an) nurse.', 'a', 'Tôi muốn làm y tá.'],
      ['There is ___ (a / an) university near my house.', 'a', 'Gần nhà tôi có một trường đại học.']
    ]
  },

  {
    slug: 'article-the',
    en: 'Definite article: the',
    vi: 'Mạo từ the',
    level: 'A1',
    summary: 'Dùng khi cả người nói và người nghe đều biết đang nói tới cái nào. Tiếng Việt không có mạo từ nên đây là điểm mất nhiều điểm nhất ở phần Viết.',
    formula: {
      rows: [
        ['Đã nhắc rồi', 'I bought a book. The book is very good.'],
        ['Duy nhất', 'the sun, the moon, the Earth, the internet'],
        ['Ngữ cảnh rõ', 'Close the door. (cái cửa ngay đây)'],
        ['So sánh nhất, số thứ tự', 'the best, the first, the same']
      ],
      note: 'the đọc là /ðə/ trước âm phụ âm và /ði/ trước âm nguyên âm: the book /ðə/, the apple /ði/.'
    },
    signals: ['the', 'đã nhắc rồi', 'duy nhất', 'the best', 'the first', 'the only'],
    useWhen: [
      'Danh từ đã được nhắc tới trước đó.',
      'Vật duy nhất trong bối cảnh hoặc trên đời: the sun, the manager, the kitchen (của nhà này).',
      'Trước so sánh nhất và số thứ tự: the tallest, the second.',
      'Trước tên sông, biển, dãy núi, quần đảo và tên nước số nhiều: the Mekong, the Philippines.'
    ],
    useNot: [
      { what: 'Trước danh từ số nhiều hoặc không đếm được khi nói chung.', why: '"I like the music" nghĩa là thứ nhạc cụ thể nào đó; nói chung phải là "I like music".' },
      { what: 'Trước hầu hết tên riêng, tên nước số ít, tên thành phố.', why: '"the Viet Nam", "the Hanoi" đều sai. Ngoại lệ có tổ hợp: the United States, the UK.' },
      { what: 'Trước bữa ăn, môn thể thao, môn học.', why: '"have breakfast", "play football", "study physics" — không có "the".' }
    ],
    confuse: [
      {
        with: 'không mạo từ khi nói chung',
        tell: 'Có "the" là nói tới cái cụ thể; bỏ "the" là nói cả loại nói chung.',
        pair: [
          { en: 'Children need attention.', vi: 'Trẻ em nói chung cần được quan tâm.' },
          { en: 'The children need attention.', vi: 'Mấy đứa trẻ này cần được quan tâm. (nhóm cụ thể)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I like the coffee very much.', right: 'I like coffee very much.', why: 'Nói chung về cà phê thì không dùng the. Câu có "the" nghĩa là ly cà phê cụ thể nào đó.' },
      { wrong: 'She lives in the Viet Nam.', right: 'She lives in Viet Nam.', why: 'Tên nước số ít không đi với "the".' }
    ],
    examples: [
      ['I bought a shirt. The shirt was on sale.', 'Tôi mua một cái áo. Cái áo đó đang giảm giá.', 1, 'Lần hai nhắc lại nên dùng the.'],
      ['The sun rises in the east.', 'Mặt trời mọc ở hướng đông.', 1, 'Vật duy nhất.'],
      ['This is the best coffee in town.', 'Đây là cà phê ngon nhất thành phố.', 1, 'Trước so sánh nhất luôn có the.'],
      ['We sailed down the Mekong.', 'Chúng tôi xuôi dòng sông Mê Kông.', 1, 'Tên sông đi với the.'],
      ['I like the coffee very much.', 'Tôi rất thích cà phê.', 0, 'Sai sắc thái: nói chung thì bỏ the. Sửa thành "I like coffee very much."'],
      ['She lives in the Viet Nam.', 'Cô ấy sống ở Việt Nam.', 0, 'Sai: tên nước số ít không có the. Sửa thành "She lives in Viet Nam."']
    ],
    practice: [
      ['Please close ___ window; it is cold.', 'the', 'Đóng giúp cửa sổ với, lạnh quá.'],
      ['She is ___ tallest student in the class.', 'the', 'Cô ấy là học sinh cao nhất lớp.'],
      ['I saw a dog. ___ dog was very friendly.', 'The', 'Tôi thấy một con chó. Con chó đó rất thân thiện.'],
      ['We watched ___ moon from the balcony.', 'the', 'Chúng tôi ngắm trăng từ ban công.'],
      ['They travelled across ___ United States.', 'the', 'Họ đi khắp nước Mỹ.'],
      ['My brother works in ___ kitchen of a hotel.', 'the', 'Anh tôi làm ở bếp của một khách sạn.'],
      ['He was ___ first person to arrive.', 'the', 'Anh ấy là người đầu tiên tới nơi.'],
      ['Do you know ___ answer to this question?', 'the', 'Bạn có biết đáp án câu này không?'],
      ['___ Philippines is made up of many islands.', 'The', 'Philippines gồm rất nhiều hòn đảo.'],
      ['I left my keys on ___ table in the hall.', 'the', 'Tôi để chìa khoá trên bàn ngoài sảnh.']
    ]
  },

  {
    slug: 'article-zero',
    en: 'Zero article',
    vi: 'Không dùng mạo từ',
    level: 'A1',
    summary: 'Nói chung về cả loại thì bỏ mạo từ. Đây là mặt kia của lỗi lạm dụng "the" — nhiều người học thêm "the" vào chỗ đáng lẽ để trống.',
    formula: {
      rows: [
        ['Số nhiều nói chung', 'Cats are independent. Books are expensive.'],
        ['Không đếm được nói chung', 'Water is essential. Music helps me relax.'],
        ['Bữa ăn, môn học, thể thao', 'have breakfast · study maths · play tennis'],
        ['Tên riêng số ít', 'Viet Nam · Hanoi · Mount Fansipan']
      ],
      note: 'Cụm chỉ nơi chốn theo CHỨC NĂNG bỏ mạo từ, theo TOÀ NHÀ thì có: "go to school" là đi học, "go to the school" là tới toà nhà trường. Tương tự hospital, church, prison, bed.'
    },
    signals: ['danh từ số nhiều nói chung', 'danh từ không đếm được', 'go to school', 'at home', 'by bus'],
    useWhen: [
      'Danh từ số nhiều hoặc không đếm được, nói chung về cả loại.',
      'Bữa ăn, môn học, môn thể thao, ngôn ngữ, màu sắc.',
      'Tên người, tên thành phố, tên nước số ít, tên đường.',
      'Cụm cố định: at home, at work, by bus, on foot, in bed, at night.'
    ],
    useNot: [
      { what: 'Khi nói tới một nhóm hoặc một vật cụ thể.', why: 'Lúc đó phải có the: "The books on my desk are expensive."' },
      { what: 'Trước danh từ đếm được số ít.', why: 'Danh từ đếm được số ít luôn cần a/an hoặc the: "I saw cat" sai, phải là "I saw a cat".' }
    ],
    confuse: [
      {
        with: 'go to school / go to the school',
        tell: 'Bỏ mạo từ là nói tới chức năng của nơi đó; có "the" là nói tới toà nhà.',
        pair: [
          { en: 'My son goes to school every day.', vi: 'Con trai tôi đi học mỗi ngày. (đi học, với tư cách học sinh)' },
          { en: 'I went to the school to meet his teacher.', vi: 'Tôi tới trường gặp cô giáo của cháu. (tới toà nhà)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The life is short.', right: 'Life is short.', why: 'Danh từ trừu tượng nói chung thì bỏ mạo từ.' },
      { wrong: 'I go to the bed at eleven.', right: 'I go to bed at eleven.', why: '"go to bed" là cụm cố định chỉ việc đi ngủ, không có mạo từ.' }
    ],
    examples: [
      ['Dogs are loyal animals.', 'Chó là loài vật trung thành.', 1, 'Số nhiều nói chung nên bỏ mạo từ.'],
      ['Water boils at 100 degrees.', 'Nước sôi ở 100 độ.', 1, 'Không đếm được, nói chung.'],
      ['We have breakfast at seven.', 'Chúng tôi ăn sáng lúc bảy giờ.', 1, 'Bữa ăn không có mạo từ.'],
      ['She goes to work by bus.', 'Cô ấy đi làm bằng xe buýt.', 1, '"to work" và "by bus" đều là cụm cố định.'],
      ['The life is short.', 'Đời người ngắn ngủi.', 0, 'Sai: danh từ trừu tượng nói chung thì bỏ the. Sửa thành "Life is short."'],
      ['I go to the bed at eleven.', 'Tôi đi ngủ lúc mười một giờ.', 0, 'Sai: "go to bed" không có mạo từ.']
    ],
    practice: [
      ['___ (–/The) honesty is the best policy.', '–', 'Trung thực là thượng sách.'],
      ['She studies ___ (–/the) medicine at university.', '–', 'Cô ấy học ngành y ở đại học.'],
      ['My brother plays ___ (–/the) football every Sunday.', '–', 'Anh tôi chơi bóng đá mỗi Chủ nhật.'],
      ['We usually stay at ___ (–/the) home on rainy days.', '–', 'Ngày mưa chúng tôi thường ở nhà.'],
      ['___ (–/The) children in this class are very active.', 'The', 'Bọn trẻ ở lớp này rất năng động.'],
      ['He went to ___ (–/the) hospital to visit his uncle.', 'the', 'Anh ấy tới bệnh viện thăm chú.'],
      ['___ (–/The) coffee keeps me awake.', '–', 'Cà phê làm tôi tỉnh ngủ.'],
      ['They travel to ___ (–/the) Japan every year.', '–', 'Năm nào họ cũng đi Nhật.'],
      ['I read ___ (–/the) books before bed.', '–', 'Tôi đọc sách trước khi ngủ.'],
      ['Please put it on ___ (–/the) table over there.', 'the', 'Để nó lên cái bàn đằng kia giúp tôi.']
    ]
  },

  {
    slug: 'demonstratives',
    en: 'Demonstratives: this / that / these / those',
    vi: 'this / that / these / those',
    level: 'A1',
    summary: 'Chỉ vật theo khoảng cách gần hay xa, và phải hợp số ít hay số nhiều.',
    formula: {
      rows: [
        ['Gần', 'this + danh từ số ít · these + danh từ số nhiều'],
        ['Xa', 'that + danh từ số ít · those + danh từ số nhiều'],
        ['Đứng một mình', 'This is my bag. Those are expensive.']
      ],
      note: 'Khoảng cách có thể là không gian (gần hay xa chỗ đứng) hoặc thời gian: "this week" là tuần đang diễn ra, "that week" là tuần đã nhắc tới trước đó.'
    },
    signals: ['this', 'that', 'these', 'those', 'here', 'there'],
    useWhen: [
      'Chỉ vật ở gần: this, these. Chỉ vật ở xa: that, those.',
      'Trên điện thoại: "This is Lan" để tự giới thiệu, "Is that Nam?" để hỏi đầu dây bên kia.',
      'Nhắc lại điều vừa nói: "That is a good idea."'
    ],
    useNot: [
      { what: 'Không dùng this/that với danh từ số nhiều.', why: '"this books" sai; phải là "these books".' },
      { what: 'Không dùng these/those với danh từ số ít.', why: '"these book" sai; phải là "this book".' }
    ],
    confuse: [
      {
        with: 'this và that theo thời gian',
        tell: 'this gắn với hiện tại đang diễn ra, that gắn với chuyện đã nhắc hoặc đã qua.',
        pair: [
          { en: 'I am busy this week.', vi: 'Tuần này tôi bận. (tuần đang diễn ra)' },
          { en: 'It rained all that week.', vi: 'Suốt tuần đó trời mưa. (tuần đã nhắc tới)' }
        ]
      }
    ],
    errors: [
      { wrong: 'This shoes are too small.', right: 'These shoes are too small.', why: 'shoes là số nhiều nên phải dùng these.' },
      { wrong: 'Those book is mine.', right: 'That book is mine.', why: 'book là số ít nên dùng that, và động từ là "is".' }
    ],
    examples: [
      ['This is my new laptop.', 'Đây là máy tính mới của tôi.', 1, 'Vật ở gần, số ít.'],
      ['These flowers smell wonderful.', 'Mấy bông hoa này thơm quá.', 1, 'Vật ở gần, số nhiều.'],
      ['That building over there is a museum.', 'Toà nhà đằng kia là bảo tàng.', 1, 'Vật ở xa, số ít.'],
      ['Those mountains look beautiful.', 'Những ngọn núi kia trông thật đẹp.', 1, 'Vật ở xa, số nhiều.'],
      ['This shoes are too small for me.', 'Đôi giày này chật quá.', 0, 'Sai: shoes số nhiều. Sửa thành "These shoes".'],
      ['Those book is mine.', 'Quyển sách kia là của tôi.', 0, 'Sai: book số ít. Sửa thành "That book is mine."']
    ],
    practice: [
      ['___ (This / These) apples are fresh.', 'These', 'Mấy quả táo này tươi.'],
      ['___ (That / Those) is my father over there.', 'That', 'Người đằng kia là bố tôi.'],
      ['Do you like ___ (this / these) song?', 'this', 'Bạn có thích bài hát này không?'],
      ['___ (That / Those) children are waiting outside.', 'Those', 'Mấy đứa trẻ kia đang đợi bên ngoài.'],
      ['I bought ___ (this / these) bag yesterday.', 'this', 'Hôm qua tôi mua cái túi này.'],
      ['___ (This / These) is Lan speaking.', 'This', 'Lan nghe đây. (nói trên điện thoại)'],
      ['Are ___ (that / those) your glasses on the desk?', 'those', 'Cái kính trên bàn kia là của bạn à?'],
      ['I am very busy ___ (this / that) week.', 'this', 'Tuần này tôi rất bận.'],
      ['___ (This / These) exercises are difficult.', 'These', 'Mấy bài tập này khó.'],
      ['Who is ___ (that / those) man in the blue shirt?', 'that', 'Người đàn ông áo xanh kia là ai?']
    ]
  },

  {
    slug: 'some-any',
    en: 'some / any',
    vi: 'some / any',
    level: 'A1',
    summary: 'some cho câu khẳng định, any cho phủ định và nghi vấn — trừ hai trường hợp ngoại lệ đáng nhớ.',
    formula: {
      rows: [
        ['Khẳng định', 'some + danh từ số nhiều hoặc không đếm được'],
        ['Phủ định', 'not … any (= no + danh từ)'],
        ['Nghi vấn', 'any, nhưng dùng some khi mời hoặc xin']
      ],
      note: 'any trong câu khẳng định mang nghĩa "bất kỳ cái nào cũng được": "Take any seat you like."'
    },
    signals: ['some', 'any', 'no', 'not any', 'Would you like some…?'],
    useWhen: [
      'some: câu khẳng định, chỉ một lượng không xác định.',
      'any: câu phủ định và câu hỏi thông thường.',
      'some trong câu hỏi khi MỜI hoặc XIN, vì người nói mong câu trả lời "có": "Would you like some tea?"',
      'any trong câu khẳng định với nghĩa "bất kỳ": "Any student can join."'
    ],
    useNot: [
      { what: 'Không dùng some/any trước danh từ đếm được số ít.', why: 'Dùng a/an: "I need a pen", không phải "some pen".' },
      { what: 'Không dùng "not … no".', why: 'Tiếng Anh chuẩn không phủ định hai lần: "I do not have any money" hoặc "I have no money", không nói "I do not have no money".' }
    ],
    confuse: [
      {
        with: 'any trong câu hỏi và any trong câu khẳng định',
        tell: 'Trong câu hỏi, any nghĩa là "có chút nào không"; trong câu khẳng định, any nghĩa là "cái nào cũng được".',
        pair: [
          { en: 'Do you have any questions?', vi: 'Bạn có câu hỏi nào không?' },
          { en: 'Ask me any question you like.', vi: 'Bạn cứ hỏi tôi bất kỳ câu nào cũng được.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I do not have some money.', right: 'I do not have any money.', why: 'Câu phủ định dùng any, không dùng some.' },
      { wrong: 'I do not have no time.', right: 'I do not have any time.', why: 'Không phủ định hai lần. Có thể nói gọn là "I have no time."' }
    ],
    examples: [
      ['There are some eggs in the fridge.', 'Trong tủ lạnh có mấy quả trứng.', 1, 'Câu khẳng định dùng some.'],
      ['We do not have any milk left.', 'Chúng ta không còn chút sữa nào.', 1, 'Câu phủ định dùng any.'],
      ['Would you like some coffee?', 'Bạn dùng chút cà phê nhé?', 1, 'Câu hỏi mang tính mời nên dùng some.'],
      ['You can choose any colour you like.', 'Bạn chọn màu nào cũng được.', 1, 'any trong câu khẳng định nghĩa là "bất kỳ".'],
      ['I do not have some money with me.', 'Tôi không mang theo tiền.', 0, 'Sai: phủ định phải dùng any. Sửa thành "any money".'],
      ['I do not have no time today.', 'Hôm nay tôi không có thời gian.', 0, 'Sai: phủ định hai lần. Sửa thành "I do not have any time" hoặc "I have no time".']
    ],
    practice: [
      ['There is ___ (some / any) rice in the kitchen.', 'some', 'Trong bếp còn ít cơm.'],
      ['Do you have ___ (some / any) brothers or sisters?', 'any', 'Bạn có anh chị em nào không?'],
      ['We do not need ___ (some / any) help, thanks.', 'any', 'Chúng tôi không cần giúp gì đâu, cảm ơn.'],
      ['Would you like ___ (some / any) more tea?', 'some', 'Bạn dùng thêm chút trà nhé?'],
      ['She bought ___ (some / any) new shoes.', 'some', 'Cô ấy mua mấy đôi giày mới.'],
      ['Is there ___ (some / any) sugar left?', 'any', 'Còn chút đường nào không?'],
      ['Take ___ (some / any) seat you like.', 'any', 'Bạn cứ ngồi chỗ nào cũng được.'],
      ['I did not see ___ (some / any) buses this morning.', 'any', 'Sáng nay tôi không thấy chiếc xe buýt nào.'],
      ['Could I have ___ (some / any) water, please?', 'some', 'Cho tôi xin chút nước được không?'],
      ['There are not ___ (some / any) tickets left.', 'any', 'Không còn vé nào cả.']
    ]
  },

  /* ==================== A2 ==================== */

  {
    slug: 'possessive-forms',
    en: "Possessive: 's and of",
    vi: "Sở hữu cách 's và of",
    level: 'A2',
    summary: "Người và động vật dùng 's; vật vô tri thường dùng of. Dấu nháy đặt đúng chỗ mới phân biệt được một chủ hay nhiều chủ.",
    formula: {
      rows: [
        ['Số ít', "+ 's : my sister's bag, the dog's tail"],
        ['Số nhiều có -s', "chỉ thêm dấu nháy: my parents' house, the students' results"],
        ['Số nhiều bất quy tắc', "+ 's : the children's toys, the men's room"],
        ['Vật vô tri', 'of: the roof of the house, the end of the film']
      ],
      note: "Sở hữu cách của thời gian và tổ chức vẫn dùng 's: today's news, the company's policy, a week's holiday."
    },
    signals: ["'s", "s'", 'of', 'whose'],
    useWhen: [
      "Người, động vật, tổ chức: dùng 's.",
      'Vật vô tri, khái niệm trừu tượng: thường dùng of.',
      "Chỉ thời gian: today's paper, last year's results.",
      "Nói tắt nơi chốn quen thuộc: at the doctor's, at my aunt's."
    ],
    useNot: [
      { what: "Không dùng dấu nháy cho danh từ số nhiều thường.", why: "\"three book's\" sai — số nhiều là \"three books\", không có dấu nháy." },
      { what: "Không nhầm its với it's.", why: "its là sở hữu (\"the cat licked its paw\"); it's là viết tắt của \"it is\" hoặc \"it has\"." }
    ],
    confuse: [
      {
        with: "một chủ hay nhiều chủ",
        tell: "Dấu nháy trước -s là một người; sau -s là nhiều người.",
        pair: [
          { en: "my friend's house", vi: 'nhà của một người bạn' },
          { en: "my friends' house", vi: 'nhà của mấy người bạn' }
        ]
      }
    ],
    errors: [
      { wrong: 'The bag of my sister is new.', right: "My sister's bag is new.", why: "Chỉ người thì dùng 's tự nhiên hơn nhiều so với of." },
      { wrong: "The cat licked it's paw.", right: 'The cat licked its paw.', why: "its là sở hữu, không có dấu nháy; it's nghĩa là \"it is\"." }
    ],
    examples: [
      ["This is my brother's motorbike.", 'Đây là xe máy của anh trai tôi.', 1, "Người số ít, dùng 's."],
      ["The students' results were excellent.", 'Kết quả của các sinh viên rất tốt.', 1, 'Số nhiều đã có -s nên chỉ thêm dấu nháy.'],
      ["The children's books are on that shelf.", 'Sách của bọn trẻ ở trên giá kia.', 1, "children là số nhiều bất quy tắc nên vẫn thêm 's."],
      ['The title of the book is very long.', 'Tựa cuốn sách rất dài.', 1, 'Vật vô tri nên dùng of.'],
      ['The bag of my sister is new.', 'Cái túi của chị tôi mới.', 0, "Sai sắc thái: chỉ người thì dùng 's. Sửa thành \"My sister's bag is new.\""],
      ["The cat licked it's paw.", 'Con mèo liếm chân.', 0, 'Sai: sở hữu là "its", không có dấu nháy.']
    ],
    practice: [
      ["This is ___ (Lan) notebook.", "Lan's", 'Đây là cuốn vở của Lan.'],
      ["The ___ (teachers) room is on the second floor.", "teachers'", 'Phòng giáo viên ở tầng hai.'],
      ['I forgot the name ___ the street.', 'of', 'Tôi quên tên con phố đó.'],
      ["Have you read ___ (today) newspaper?", "today's", 'Bạn đọc báo hôm nay chưa?'],
      ["The ___ (children) playground is next to the school.", "children's", 'Sân chơi của trẻ em nằm cạnh trường.'],
      ['The dog wagged ___ (its / it is) tail.', 'its', 'Con chó vẫy đuôi.'],
      ["We stayed at my ___ (aunt) last weekend.", "aunt's", 'Cuối tuần trước chúng tôi ở nhà dì.'],
      ['The end ___ the film was sad.', 'of', 'Đoạn kết bộ phim buồn.'],
      ["My ___ (parents) house is in Da Lat.", "parents'", 'Nhà bố mẹ tôi ở Đà Lạt.'],
      ["That is the ___ (company) new policy.", "company's", 'Đó là chính sách mới của công ty.']
    ]
  },

  {
    slug: 'much-many-a-lot-of',
    en: 'much / many / a lot of',
    vi: 'much / many / a lot of',
    level: 'A2',
    summary: 'many đi với đếm được, much đi với không đếm được, a lot of đi với cả hai. Ngoài ra much và many nghe cứng ở câu khẳng định.',
    formula: {
      rows: [
        ['Đếm được', 'many books · a lot of books · How many books?'],
        ['Không đếm được', 'much water · a lot of water · How much water?'],
        ['Khẳng định thường ngày', 'a lot of / lots of hợp hơn much và many']
      ],
      note: 'much và many tự nhiên nhất trong câu phủ định và câu hỏi. Câu khẳng định thường ngày thì "a lot of" nghe xuôi hơn; riêng văn phong trang trọng vẫn dùng "many" thoải mái.'
    },
    signals: ['many', 'much', 'a lot of', 'lots of', 'How many', 'How much', 'too much', 'so many'],
    useWhen: [
      'many + danh từ đếm được số nhiều.',
      'much + danh từ không đếm được, chủ yếu trong câu phủ định và câu hỏi.',
      'a lot of và lots of cho cả hai loại, hợp với mọi kiểu câu.',
      'too much, too many khi muốn nói "quá nhiều".'
    ],
    useNot: [
      { what: 'Không dùng many với danh từ không đếm được.', why: '"many money", "many information" đều sai; dùng much hoặc a lot of.' },
      { what: 'Tránh "much" đứng một mình trong câu khẳng định thường ngày.', why: '"I have much money" nghe rất cứng; nói "I have a lot of money".' }
    ],
    confuse: [
      {
        with: 'a lot of và lots of',
        tell: 'Nghĩa như nhau; "lots of" thân mật hơn, ít dùng trong bài viết học thuật.',
        pair: [
          { en: 'A lot of research supports this idea.', vi: 'Nhiều nghiên cứu ủng hộ ý này. (trung tính, dùng được khi viết)' },
          { en: 'We had lots of fun.', vi: 'Bọn mình vui lắm. (thân mật, nói chuyện)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She does not have many money.', right: 'She does not have much money.', why: 'money không đếm được nên đi với much.' },
      { wrong: 'How much books do you have?', right: 'How many books do you have?', why: 'book đếm được nên hỏi bằng How many.' }
    ],
    examples: [
      ['There are many students in the library.', 'Có nhiều sinh viên trong thư viện.', 1, 'student đếm được nên dùng many.'],
      ['We do not have much time left.', 'Chúng ta không còn nhiều thời gian.', 1, 'time không đếm được, câu phủ định nên much rất tự nhiên.'],
      ['She drinks a lot of water every day.', 'Cô ấy uống rất nhiều nước mỗi ngày.', 1, 'Câu khẳng định nên a lot of xuôi hơn much.'],
      ['How many people came to the meeting?', 'Có bao nhiêu người tới cuộc họp?', 1, 'people đếm được nên hỏi bằng How many.'],
      ['She does not have many money.', 'Cô ấy không có nhiều tiền.', 0, 'Sai: money không đếm được. Sửa thành "much money".'],
      ['How much books do you have?', 'Bạn có bao nhiêu cuốn sách?', 0, 'Sai: book đếm được. Sửa thành "How many books".']
    ],
    practice: [
      ['How ___ (much / many) eggs do we need?', 'many', 'Chúng ta cần bao nhiêu quả trứng?'],
      ['There is not ___ (much / many) salt in the soup.', 'much', 'Canh không mặn lắm.'],
      ['He has ___ (a lot of / much) friends in Hue.', 'a lot of', 'Anh ấy có nhiều bạn ở Huế.'],
      ['How ___ (much / many) does this cost?', 'much', 'Cái này giá bao nhiêu?'],
      ['We did not take ___ (much / many) photos.', 'many', 'Chúng tôi không chụp nhiều ảnh.'],
      ['She spends too ___ (much / many) time on her phone.', 'much', 'Cô ấy dành quá nhiều thời gian cho điện thoại.'],
      ['There were so ___ (much / many) cars on the road.', 'many', 'Trên đường có rất nhiều ô tô.'],
      ['I do not have ___ (much / many) experience in teaching.', 'much', 'Tôi chưa có nhiều kinh nghiệm dạy học.'],
      ['They gave us ___ (a lot of / many) information.', 'a lot of', 'Họ cho chúng tôi rất nhiều thông tin.'],
      ['How ___ (much / many) sugar do you want?', 'much', 'Bạn muốn cho bao nhiêu đường?']
    ]
  },

  {
    slug: 'a-few-a-little',
    en: 'a few / a little',
    vi: 'a few / a little',
    level: 'A2',
    summary: 'a few đi với đếm được, a little đi với không đếm được. Cả hai mang sắc thái tích cực: "có một ít, đủ dùng".',
    formula: {
      rows: [
        ['Đếm được số nhiều', 'a few books, a few minutes'],
        ['Không đếm được', 'a little water, a little time'],
        ['Sắc thái', 'có một ít và như thế là ổn']
      ],
      note: 'Bỏ "a" đi thì nghĩa đảo ngược thành gần như không có: "few friends" là ít bạn quá, "a few friends" là có vài người bạn. Phần này học kỹ ở bậc B1.'
    },
    signals: ['a few', 'a little', 'a couple of', 'a bit of'],
    useWhen: [
      'a few + danh từ đếm được số nhiều, nghĩa "một vài".',
      'a little + danh từ không đếm được, nghĩa "một chút".',
      'a bit of thay cho a little trong lối nói thân mật.'
    ],
    useNot: [
      { what: 'Không dùng a few với danh từ không đếm được.', why: '"a few water" sai; phải là "a little water".' },
      { what: 'Không dùng a little với danh từ đếm được.', why: '"a little books" sai; phải là "a few books".' }
    ],
    confuse: [
      {
        with: 'a little và little',
        tell: 'Có "a" là tích cực (có một ít); bỏ "a" là tiêu cực (ít đến mức gần như không).',
        pair: [
          { en: 'I have a little money — let us get coffee.', vi: 'Tôi có một ít tiền, đi uống cà phê đi.' },
          { en: 'I have little money — I cannot join you.', vi: 'Tôi gần như không có tiền, không đi cùng được.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Can I have a few water?', right: 'Can I have a little water?', why: 'water không đếm được nên đi với a little.' },
      { wrong: 'She has a little friends here.', right: 'She has a few friends here.', why: 'friends đếm được nên đi với a few.' }
    ],
    examples: [
      ['I need a few minutes to finish this.', 'Tôi cần vài phút để làm xong cái này.', 1, 'minute đếm được nên dùng a few.'],
      ['Add a little salt to the soup.', 'Cho một chút muối vào canh.', 1, 'salt không đếm được nên dùng a little.'],
      ['We invited a few friends over.', 'Chúng tôi mời vài người bạn tới chơi.', 1, 'Sắc thái tích cực: có vài người.'],
      ['There is still a little milk in the fridge.', 'Trong tủ lạnh vẫn còn chút sữa.', 1, 'Còn một ít và như thế là đủ.'],
      ['Can I have a few water, please?', 'Cho tôi xin chút nước được không?', 0, 'Sai: water không đếm được. Sửa thành "a little water".'],
      ['She has a little friends in this city.', 'Cô ấy có vài người bạn ở thành phố này.', 0, 'Sai: friends đếm được. Sửa thành "a few friends".']
    ],
    practice: [
      ['I have ___ (a few / a little) questions for you.', 'a few', 'Tôi có vài câu hỏi cho bạn.'],
      ['Could you give me ___ (a few / a little) advice?', 'a little', 'Bạn cho tôi xin chút lời khuyên được không?'],
      ['There are ___ (a few / a little) apples left.', 'a few', 'Còn lại vài quả táo.'],
      ['We have ___ (a few / a little) time before the bus leaves.', 'a little', 'Chúng ta còn một chút thời gian trước khi xe chạy.'],
      ['She speaks ___ (a few / a little) Japanese.', 'a little', 'Cô ấy biết một chút tiếng Nhật.'],
      ['He made ___ (a few / a little) mistakes in the test.', 'a few', 'Anh ấy sai vài lỗi trong bài kiểm tra.'],
      ['Add ___ (a few / a little) sugar to the tea.', 'a little', 'Cho một chút đường vào trà.'],
      ['I bought ___ (a few / a little) books at the fair.', 'a few', 'Tôi mua vài cuốn sách ở hội chợ.'],
      ['There is ___ (a few / a little) rice left in the pot.', 'a little', 'Trong nồi còn chút cơm.'],
      ['Only ___ (a few / a little) students passed the exam.', 'a few', 'Chỉ vài sinh viên qua được kỳ thi.']
    ]
  },

  {
    slug: 'compound-nouns',
    en: 'Compound nouns',
    vi: 'Danh từ ghép',
    level: 'A2',
    summary: 'Hai danh từ ghép lại: từ đứng trước bổ nghĩa và luôn giữ số ít, từ đứng sau mới chia số nhiều.',
    formula: {
      rows: [
        ['Cấu tạo', 'danh từ bổ nghĩa + danh từ chính: a bus stop, a phone number'],
        ['Số nhiều', 'chỉ đổi từ chính: two bus stops, three phone numbers'],
        ['Trọng âm', 'thường rơi vào từ ĐẦU: a BLACKboard, a BUS stop']
      ],
      note: 'Một số cụm viết liền (bedroom, toothbrush), một số viết rời (bus stop, credit card), một số có gạch nối (mother-in-law → mothers-in-law). Không có quy tắc tuyệt đối, phải tra từ điển.'
    },
    signals: ['bus stop', 'phone number', 'toothbrush', 'credit card', 'railway station'],
    useWhen: [
      'Gộp hai danh từ để chỉ một khái niệm quen thuộc.',
      'Chỉ chia số nhiều ở danh từ chính đứng sau.',
      'Với cụm có gạch nối kiểu quan hệ họ hàng, số nhiều rơi vào từ chính: mothers-in-law, passers-by.'
    ],
    useNot: [
      { what: 'Không thêm -s vào danh từ bổ nghĩa đứng trước.', why: '"a shoes shop" sai; phải là "a shoe shop".' },
      { what: 'Không dùng sở hữu cách khi ý chỉ loại.', why: '"a childrens\' book" sai; nói "a children\'s book" nếu là sách của trẻ, hoặc dùng danh từ ghép khác.' }
    ],
    confuse: [
      {
        with: 'danh từ ghép và cụm sở hữu',
        tell: 'Danh từ ghép chỉ LOẠI; sở hữu cách chỉ ai SỞ HỮU.',
        pair: [
          { en: 'a teacher training course', vi: 'một khoá đào tạo giáo viên (loại khoá học)' },
          { en: "the teacher's course", vi: 'khoá học của thầy đó (thuộc về một người cụ thể)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I waited at the buses stop.', right: 'I waited at the bus stop.', why: 'Danh từ bổ nghĩa đứng trước luôn ở số ít.' },
      { wrong: 'She has two sisters-in-laws.', right: 'She has two sisters-in-law.', why: 'Số nhiều rơi vào danh từ chính "sister", không phải "law".' }
    ],
    examples: [
      ['I lost my credit card yesterday.', 'Hôm qua tôi làm mất thẻ tín dụng.', 1, 'Danh từ ghép viết rời.'],
      ['There are three bus stops on this street.', 'Phố này có ba bến xe buýt.', 1, 'Chỉ danh từ chính "stop" chia số nhiều.'],
      ['He bought two toothbrushes.', 'Anh ấy mua hai cái bàn chải.', 1, 'Danh từ ghép viết liền.'],
      ['Both of her sisters-in-law live in Hue.', 'Cả hai người chị dâu của cô ấy đều sống ở Huế.', 1, 'Số nhiều rơi vào "sister".'],
      ['I waited at the buses stop for ten minutes.', 'Tôi đợi ở bến xe buýt mười phút.', 0, 'Sai: từ bổ nghĩa giữ số ít. Sửa thành "the bus stop".'],
      ['She has two sisters-in-laws.', 'Cô ấy có hai người chị dâu.', 0, 'Sai: phải là "sisters-in-law".']
    ],
    practice: [
      ['I need a new ___ (tooth + brush).', 'toothbrush', 'Tôi cần một cái bàn chải mới.'],
      ['There are two ___ (bus + stop) near my house.', 'bus stops', 'Gần nhà tôi có hai bến xe buýt.'],
      ['Can I have your ___ (phone + number)?', 'phone number', 'Cho tôi xin số điện thoại của bạn được không?'],
      ['She works at a ___ (shoe + shop) downtown.', 'shoe shop', 'Cô ấy làm ở một cửa hàng giày trong trung tâm.'],
      ['We met at the ___ (railway + station).', 'railway station', 'Chúng tôi gặp nhau ở ga tàu.'],
      ['My flat has three ___ (bed + room).', 'bedrooms', 'Căn hộ của tôi có ba phòng ngủ.'],
      ['He is a ___ (police + officer).', 'police officer', 'Anh ấy là cảnh sát.'],
      ['Both ___ (mother-in-law) came to the wedding.', 'mothers-in-law', 'Cả hai bà mẹ chồng đều tới đám cưới.'],
      ['I bought two ___ (credit + card) holders.', 'credit card', 'Tôi mua hai cái ví đựng thẻ tín dụng.'],
      ['The ___ (swimming + pool) opens at six.', 'swimming pool', 'Bể bơi mở cửa lúc sáu giờ.']
    ]
  },

  {
    slug: 'there-is-there-are',
    en: 'There is / There are',
    vi: 'There is / There are',
    level: 'A2',
    summary: 'Cấu trúc giới thiệu sự tồn tại. Động từ chia theo danh từ đứng NGAY SAU nó, không theo cả danh sách.',
    formula: {
      rows: [
        ['Số ít, không đếm được', 'There is a book. There is some milk.'],
        ['Số nhiều', 'There are two books.'],
        ['Phủ định', "There is not / There are not (there isn't, there aren't)"],
        ['Nghi vấn', 'Is there…? Are there…?']
      ],
      note: 'Khi liệt kê nhiều thứ, động từ theo danh từ đầu tiên: "There is a pen and two books on the desk."'
    },
    signals: ['There is', 'There are', "There isn't", "There aren't", 'Is there', 'Are there'],
    useWhen: [
      'Giới thiệu điều gì đó tồn tại hoặc có mặt ở đâu.',
      'Nói về số lượng: "There are twenty students in my class."',
      'Ở thì quá khứ: There was / There were.'
    ],
    useNot: [
      { what: 'Không dùng "have" theo lối tiếng Việt.', why: 'Tiếng Việt nói "trong phòng có hai cái ghế", nhưng tiếng Anh nói "There are two chairs in the room", không phải "The room has two chairs" khi chỉ muốn nói tồn tại.' },
      { what: 'Không dùng "there is" với danh từ số nhiều.', why: '"There is many people" sai; phải là "There are many people".' }
    ],
    confuse: [
      {
        with: 'It is',
        tell: '"There is" giới thiệu cái gì đó tồn tại; "It is" nói về một vật đã xác định.',
        pair: [
          { en: 'There is a book on the table.', vi: 'Trên bàn có một cuốn sách. (giới thiệu)' },
          { en: 'It is a very good book.', vi: 'Đó là một cuốn sách rất hay. (nói về cuốn đã biết)' }
        ]
      }
    ],
    errors: [
      { wrong: 'There is many people in the hall.', right: 'There are many people in the hall.', why: 'people là số nhiều nên dùng "are".' },
      { wrong: 'In my room have two windows.', right: 'There are two windows in my room.', why: 'Dịch thẳng từ tiếng Việt "trong phòng có" thành "have" là sai; tiếng Anh dùng "There are".' }
    ],
    examples: [
      ['There is a post office near here.', 'Gần đây có một bưu điện.', 1, 'Số ít nên dùng "is".'],
      ['There are thirty students in my class.', 'Lớp tôi có ba mươi học sinh.', 1, 'Số nhiều nên dùng "are".'],
      ['Is there any milk in the fridge?', 'Trong tủ lạnh còn sữa không?', 1, 'Câu hỏi với danh từ không đếm được.'],
      ['There were many people at the concert.', 'Buổi hoà nhạc có rất nhiều người.', 1, 'Dạng quá khứ số nhiều.'],
      ['There is many people in the hall.', 'Trong sảnh có nhiều người.', 0, 'Sai: people số nhiều. Sửa thành "There are many people".'],
      ['In my room have two windows.', 'Phòng tôi có hai cửa sổ.', 0, 'Sai: dịch thẳng từ tiếng Việt. Sửa thành "There are two windows in my room."']
    ],
    practice: [
      ['___ (There is / There are) a cat under the table.', 'There is', 'Có một con mèo dưới gầm bàn.'],
      ['___ (There is / There are) five people waiting.', 'There are', 'Có năm người đang đợi.'],
      ['___ (Is there / Are there) any sugar left?', 'Is there', 'Còn chút đường nào không?'],
      ['___ (There was / There were) a storm last night.', 'There was', 'Đêm qua có bão.'],
      ['___ (There is / There are) some water in the bottle.', 'There is', 'Trong chai còn ít nước.'],
      ['___ (Is there / Are there) any questions?', 'Are there', 'Có câu hỏi nào không?'],
      ['___ (There is not / There are not) any tickets left.', 'There are not', 'Không còn vé nào cả.'],
      ['___ (There were / There was) twenty guests at the party.', 'There were', 'Bữa tiệc có hai mươi khách.'],
      ['___ (There is / There are) a pen and two books on the desk.', 'There is', 'Trên bàn có một cái bút và hai cuốn sách.'],
      ['___ (There is / There are) a lot of traffic today.', 'There is', 'Hôm nay xe cộ đông lắm.']
    ]
  },

  {
    slug: 'partitives',
    en: 'Partitives: a piece of, a glass of',
    vi: 'Đơn vị đi với danh từ không đếm được',
    level: 'A2',
    summary: 'Muốn đếm danh từ không đếm được thì mượn một đơn vị. Mỗi loại danh từ đi với đơn vị riêng, dùng sai nghe rất lạ tai.',
    formula: {
      rows: [
        ['Cấu trúc', 'a + đơn vị + of + danh từ không đếm được'],
        ['Số nhiều', 'chia ở ĐƠN VỊ: two pieces of advice, three glasses of water'],
        ['Đơn vị chung', 'a piece of · a bit of · an item of']
      ],
      note: 'Đơn vị quen thuộc: a piece of advice / information / news / furniture · a glass of water · a cup of tea · a bottle of milk · a slice of bread · a loaf of bread · a bar of chocolate · a sheet of paper · a kilo of rice.'
    },
    signals: ['a piece of', 'a glass of', 'a cup of', 'a slice of', 'a bottle of', 'a sheet of'],
    useWhen: [
      'Cần nói số lượng cụ thể của một danh từ không đếm được.',
      'Muốn dùng a/an với danh từ không đếm được thì bắt buộc mượn đơn vị.',
      'Chia số nhiều ở đơn vị, danh từ phía sau giữ nguyên.'
    ],
    useNot: [
      { what: 'Không thêm -s vào danh từ không đếm được đứng sau of.', why: '"two pieces of advices" sai; đúng là "two pieces of advice".' },
      { what: 'Không dùng đơn vị lệch loại.', why: '"a piece of water" nghe sai; nước dùng "a glass of" hoặc "a bottle of".' }
    ],
    confuse: [
      {
        with: 'a glass of water và a glass',
        tell: 'Có "of + danh từ" là nói lượng bên trong; không có thì nói chính cái vật chứa.',
        pair: [
          { en: 'I drank a glass of water.', vi: 'Tôi uống một ly nước. (uống nước)' },
          { en: 'I broke a glass.', vi: 'Tôi làm vỡ một cái ly. (vỡ cái ly)' }
        ]
      }
    ],
    errors: [
      { wrong: 'He gave me two pieces of advices.', right: 'He gave me two pieces of advice.', why: 'Chia số nhiều ở đơn vị "piece"; advice giữ nguyên.' },
      { wrong: 'Can I have a piece of water?', right: 'Can I have a glass of water?', why: 'Nước không đi với "piece"; dùng glass, bottle hoặc cup.' }
    ],
    examples: [
      ['She gave me a piece of useful advice.', 'Cô ấy cho tôi một lời khuyên hữu ích.', 1, 'advice mượn đơn vị "piece".'],
      ['I drink two glasses of water every morning.', 'Sáng nào tôi cũng uống hai ly nước.', 1, 'Số nhiều chia ở "glass".'],
      ['Could you buy a loaf of bread?', 'Bạn mua giúp một ổ bánh mì nhé?', 1, 'bread đi với "loaf" hoặc "slice".'],
      ['He handed me a sheet of paper.', 'Anh ấy đưa tôi một tờ giấy.', 1, 'paper đi với "sheet".'],
      ['He gave me two pieces of advices.', 'Anh ấy cho tôi hai lời khuyên.', 0, 'Sai: advice không thêm -s. Sửa thành "two pieces of advice".'],
      ['Can I have a piece of water?', 'Cho tôi xin một ly nước được không?', 0, 'Sai đơn vị. Sửa thành "a glass of water".']
    ],
    practice: [
      ['Can I have a ___ (glass / piece) of water?', 'glass', 'Cho tôi xin một ly nước được không?'],
      ['She gave me three ___ (piece) of advice.', 'pieces', 'Cô ấy cho tôi ba lời khuyên.'],
      ['I ate two ___ (slice) of bread for breakfast.', 'slices', 'Tôi ăn hai lát bánh mì cho bữa sáng.'],
      ['He bought a ___ (bar / sheet) of chocolate.', 'bar', 'Anh ấy mua một thanh sô cô la.'],
      ['We need five ___ (sheet) of paper.', 'sheets', 'Chúng ta cần năm tờ giấy.'],
      ['Would you like a ___ (cup / piece) of tea?', 'cup', 'Bạn dùng một tách trà nhé?'],
      ['They delivered ten ___ (item) of furniture.', 'items', 'Họ giao mười món đồ nội thất.'],
      ['I bought two ___ (kilo) of rice.', 'kilos', 'Tôi mua hai cân gạo.'],
      ['That is an interesting ___ (piece / glass) of news.', 'piece', 'Đó là một tin thú vị.'],
      ['She drank a ___ (bottle) of milk.', 'bottle', 'Cô ấy uống một chai sữa.']
    ]
  }
];

/** Điểm ngữ pháp — nhóm danh từ, mạo từ, lượng từ. */
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
