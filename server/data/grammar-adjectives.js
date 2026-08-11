/**
 * Ngữ pháp — nhóm TÍNH TỪ, TRẠNG TỪ và SO SÁNH, phần bậc A1–B1.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Hạn mức nhóm là 28 điểm (docs/LEARNING.md mục 2: A1 5 · A2 6 · B1 5 · B2 5 ·
 * C1 4 · C2 3). Tệp này làm 16 điểm bậc A1–B1; 12 điểm B2–C2 để lượt sau.
 *
 * Vì sao nhóm này khó với người Việt, xếp theo thứ tự hay sai:
 *
 *   · TRẬT TỰ NGƯỢC. Tiếng Việt đặt tính từ sau danh từ ("áo đỏ"), tiếng Anh
 *     đặt trước ("a red shirt"). Dịch từng chữ là ra ngay "a shirt red".
 *   · THIẾU ĐỘNG TỪ. "Tôi đói" không cần từ nối nào; tiếng Anh bắt buộc phải
 *     có "be" — "I am hungry".
 *   · KHÔNG BIẾN ĐỔI THEO SỐ. Tiếng Anh không có "two smalls rooms", nhưng
 *     người học quen thấy danh từ thêm -s nên hay thêm cả vào tính từ.
 *   · -ED KHÁC -ING. "I am boring" là tự nhận mình nhạt nhẽo chứ không phải
 *     đang chán — lỗi gây hiểu nhầm nhiều nhất của cả nhóm.
 *
 * Ghi chú tránh trùng lặp với các nhóm khác:
 *   · Danh từ ghép (a bus stop) thuộc nhóm "Danh từ, mạo từ, lượng từ"; ở đây
 *     là TÍNH TỪ GHÉP (a two-hour meeting), việc khác.
 *   · "quite / rather / fairly" xét theo góc độ sắc thái và độ trang trọng
 *     thuộc nhóm "Sắc thái, trang trọng"; ở đây chỉ bàn mức độ.
 *   · "so … that" và "such … that" chỉ kết quả thuộc nhóm "Mệnh đề".
 *   · Đảo ngữ sau "as" và "than" thuộc nhóm "Đảo ngữ, nhấn mạnh".
 *   · Lượng từ (few, little, less, fewer) thuộc nhóm danh từ.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A1 ==================== */
  {
    slug: 'adj-position',
    en: 'Where an adjective goes',
    vi: 'Vị trí tính từ — trước danh từ, sau "be"',
    level: 'A1',
    summary: 'Tiếng Anh đặt tính từ TRƯỚC danh từ, ngược hẳn tiếng Việt; và tính từ không bao giờ thêm -s dù danh từ số nhiều.',
    formula: {
      rows: [
        ['Trước danh từ', 'a RED shirt · two SMALL rooms — tính từ đứng trước, ngược với tiếng Việt.'],
        ['Sau động từ "be"', 'The shirt IS red. · The rooms ARE small.'],
        ['Sau động từ nối khác', 'look, feel, seem, sound, taste, smell: The soup TASTES salty.'],
        ['Không bao giờ thêm -s', 'two red shirtS — chữ "red" giữ nguyên dù danh từ số nhiều.']
      ],
      note: 'Tiếng Việt nói "áo đỏ", "nhà mới" — tính từ đứng sau. Dịch từng chữ sang tiếng Anh là ra "a shirt red", lỗi hay gặp nhất ở bậc đầu.'
    },
    signals: ['a/an + tính từ + danh từ', 'be + tính từ', 'look / feel / seem + tính từ'],
    useWhen: [
      'Mô tả người, vật, nơi chốn.',
      'Nêu đặc điểm sau động từ "be".',
      'Nói cảm nhận sau look, feel, seem, sound, taste, smell.'
    ],
    useNot: [
      { what: 'Không đặt tính từ sau danh từ.', why: '"a car new" là trật tự tiếng Việt; tiếng Anh phải là "a new car".' },
      { what: 'Không thêm -s vào tính từ khi danh từ số nhiều.', why: 'Tính từ tiếng Anh không biến đổi theo số: "two beautiful girls", không phải "two beautifuls girls".' }
    ],
    confuse: [
      {
        with: 'Trật tự của tiếng Việt',
        tell: 'Đứng trước danh từ thì tính từ đi liền phía trước; đứng sau thì phải có "be" hoặc động từ nối chen vào giữa.',
        pair: [
          { en: 'She has a new bicycle.', vi: 'Cô ấy có một chiếc xe đạp mới. (tính từ đứng trước danh từ)' },
          { en: 'Her bicycle is new.', vi: 'Xe đạp của cô ấy thì mới. (tính từ đứng sau, nhưng phải có "is")' }
        ]
      }
    ],
    errors: [
      { wrong: 'I have a car red.', right: 'I have a red car.', why: 'Tính từ đứng trước danh từ. Tiếng Việt nói "xe màu đỏ" nên người học hay bê nguyên trật tự sang.' },
      { wrong: 'They are two smalls rooms.', right: 'They are two small rooms.', why: 'Tính từ không có dạng số nhiều, chỉ danh từ mới thêm -s.' }
    ],
    examples: [
      ['She lives in a big house near the river.', 'Cô ấy sống trong một ngôi nhà lớn gần sông.', 1, 'Tính từ đứng trước danh từ.'],
      ['My new shoes are very comfortable.', 'Đôi giày mới của tôi rất thoải mái.', 1, 'Một tính từ trước danh từ, một tính từ sau "are".'],
      ['This soup tastes salty.', 'Món canh này mặn.', 1, 'Sau động từ nối "taste" là tính từ, không phải trạng từ.'],
      ['They have three old bicycles.', 'Họ có ba chiếc xe đạp cũ.', 1, 'Danh từ số nhiều nhưng tính từ giữ nguyên.'],
      ['I have a car red.', 'Tôi có một chiếc xe màu đỏ.', 0, 'Sai trật tự. Sửa thành "I have a red car."'],
      ['They are two smalls rooms.', 'Đó là hai phòng nhỏ.', 0, 'Sai: tính từ không thêm -s. Sửa thành "They are two small rooms."']
    ],
    practice: [
      ['She bought a ___ (beautiful) dress yesterday.', 'beautiful', 'Hôm qua cô ấy mua một chiếc váy đẹp.'],
      ['My room is ___ (small) but bright.', 'small', 'Phòng tôi nhỏ nhưng sáng sủa.'],
      ['We saw two ___ (old) temples in Hue.', 'old', 'Chúng tôi thấy hai ngôi chùa cổ ở Huế.'],
      ['This tea tastes ___ (sweet).', 'sweet', 'Trà này ngọt.'],
      ['He is wearing a ___ (white) shirt today.', 'white', 'Hôm nay anh ấy mặc áo sơ mi trắng.'],
      ['The children look ___ (happy).', 'happy', 'Bọn trẻ trông vui vẻ.'],
      ['They live in a ___ (quiet) village.', 'quiet', 'Họ sống ở một ngôi làng yên tĩnh.'],
      ['These books are ___ (expensive).', 'expensive', 'Mấy quyển sách này đắt.'],
      ['I need a ___ (clean) glass, please.', 'clean', 'Cho tôi xin một chiếc cốc sạch.'],
      ['Her hands were ___ (cold) after the walk.', 'cold', 'Tay cô ấy lạnh sau khi đi bộ về.']
    ]
  },

  {
    slug: 'adj-need-be',
    en: 'Adjectives need the verb "be"',
    vi: 'Tính từ phải có động từ "be" — "I am hungry", không phải "I hungry"',
    level: 'A1',
    summary: 'Tiếng Việt nói "Tôi đói" là đủ; tiếng Anh bắt buộc phải có "be" nối chủ ngữ với tính từ, và câu hỏi thì dùng "be" chứ không dùng "do".',
    formula: {
      rows: [
        ['Khẳng định', 'S + AM/IS/ARE + tính từ: I AM hungry. · She IS tired.'],
        ['Phủ định', 'S + am/is/are + NOT + tính từ: They ARE NOT ready.'],
        ['Nghi vấn', 'AM/IS/ARE + S + tính từ? — ARE you cold?'],
        ['Không dùng "do" với tính từ', 'Không nói "Do you tired?" mà "ARE you tired?"']
      ],
      note: 'Tiếng Việt không có từ nào nối chủ ngữ với tính từ nên câu "I hungry" nghe rất tự nhiên với người học — đây là lỗi bậc A1 dai dẳng nhất, kéo dài đến tận B1 nếu không sửa sớm.'
    },
    signals: ['am / is / are + tính từ', 'Are you…?', 'is not / are not'],
    useWhen: [
      'Nói trạng thái của mình: đói, mệt, vui, buồn.',
      'Hỏi thăm người khác: Are you OK? Are you tired?',
      'Mô tả người hay vật bằng một tính từ.'
    ],
    useNot: [
      { what: 'Không bỏ "be" trước tính từ.', why: 'Câu tiếng Anh phải có động từ; nếu vị ngữ là tính từ thì động từ đó chính là "be".' },
      { what: 'Không dùng "do/does" để hỏi hay phủ định câu có tính từ.', why: '"Do you tired?" sai; "do" chỉ dùng với động từ thường. Với tính từ thì đảo chính "be" lên: "Are you tired?"' }
    ],
    confuse: [
      {
        with: 'Câu có động từ thường',
        tell: 'Vị ngữ là tính từ thì dùng "be"; vị ngữ là động từ thường thì hỏi và phủ định bằng "do/does".',
        pair: [
          { en: 'Are you tired?', vi: 'Bạn có mệt không? (tính từ → dùng "be")' },
          { en: 'Do you work here?', vi: 'Bạn làm việc ở đây à? (động từ thường → dùng "do")' }
        ]
      }
    ],
    errors: [
      { wrong: 'I hungry.', right: 'I am hungry.', why: 'Thiếu động từ "be". Tiếng Việt "Tôi đói" không cần từ nối nên người học bỏ quên.' },
      { wrong: 'Do you tired?', right: 'Are you tired?', why: '"tired" là tính từ nên câu hỏi đảo "are" lên đầu, không mượn "do".' }
    ],
    examples: [
      ['I am hungry. Let us have lunch.', 'Tôi đói rồi. Chúng ta ăn trưa đi.', 1, 'Tính từ "hungry" đi với "am".'],
      ['She is not ready yet.', 'Cô ấy chưa sẵn sàng.', 1, 'Phủ định đặt "not" sau "is".'],
      ['Are your parents at home?', 'Bố mẹ bạn có ở nhà không?', 1, 'Nghi vấn đảo "are" lên đầu câu.'],
      ['The children are very quiet today.', 'Hôm nay bọn trẻ rất trầm.', 1, 'Chủ ngữ số nhiều đi với "are".'],
      ['I hungry.', 'Tôi đói.', 0, 'Sai: thiếu động từ. Sửa thành "I am hungry."'],
      ['Do you tired after the trip?', 'Bạn có mệt sau chuyến đi không?', 0, 'Sai: tính từ thì hỏi bằng "be". Sửa thành "Are you tired after the trip?"']
    ],
    practice: [
      ['I ___ (be) very tired this morning.', 'am', 'Sáng nay tôi rất mệt.'],
      ['She ___ (be) not angry with you.', 'is', 'Cô ấy không giận bạn đâu.'],
      ['___ (be) you ready to go?', 'Are', 'Bạn sẵn sàng đi chưa?'],
      ['My brothers ___ (be) tall.', 'are', 'Các anh tôi cao.'],
      ['The weather ___ (be) cold in December.', 'is', 'Tháng Mười hai trời lạnh.'],
      ['___ (Do / Are) you hungry?', 'Are', 'Bạn có đói không?'],
      ['We ___ (be) not late, the bus is early.', 'are', 'Chúng ta không muộn đâu, xe buýt đến sớm đấy.'],
      ['___ (Do / Is) your sister a doctor?', 'Is', 'Chị bạn có phải bác sĩ không?'],
      ['It ___ (be) very hot in here.', 'is', 'Trong này nóng quá.'],
      ['They ___ (be) happy with the result.', 'are', 'Họ hài lòng với kết quả.']
    ]
  },

  {
    slug: 'adv-frequency',
    en: 'Adverbs of frequency and where they go',
    vi: 'Trạng từ tần suất và vị trí trong câu',
    level: 'A1',
    summary: 'always, usually, often, sometimes, never đứng TRƯỚC động từ thường nhưng SAU động từ "be" — và "never" đã mang nghĩa phủ định nên không đi kèm "not".',
    formula: {
      rows: [
        ['Với động từ thường: trước động từ', 'I ALWAYS get up at six.'],
        ['Với "be": sau động từ', 'She IS always late.'],
        ['Với trợ động từ: chen vào giữa', 'I have NEVER been to Hue. · You should ALWAYS check.'],
        ['Thang tần suất', 'always 100% → usually → often → sometimes → rarely → never 0%.']
      ],
      note: '"never" đã là phủ định rồi nên không dùng thêm "not": "I never eat meat", không phải "I do not never eat meat".'
    },
    signals: ['always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'How often…?'],
    useWhen: [
      'Nói thói quen hằng ngày.',
      'Trả lời câu hỏi "How often…?".',
      'Mô tả tính cách qua việc hay làm: He is always late.'
    ],
    useNot: [
      { what: 'Không chen trạng từ tần suất giữa động từ và tân ngữ.', why: '"I drink always coffee" sai; phải là "I always drink coffee".' },
      { what: 'Không dùng "never" cùng với "not".', why: 'Hai phủ định trong một mệnh đề là sai chuẩn tiếng Anh viết.' }
    ],
    confuse: [
      {
        with: '"sometimes" đứng đầu câu',
        tell: 'Phần lớn trạng từ tần suất đứng giữa câu; riêng sometimes, usually, often còn đứng được đầu câu để nhấn.',
        pair: [
          { en: 'I sometimes walk to work.', vi: 'Thỉnh thoảng tôi đi bộ đi làm. (vị trí giữa — trung tính)' },
          { en: 'Sometimes I walk to work.', vi: 'Thỉnh thoảng thì tôi đi bộ đi làm. (đầu câu — nhấn vào tần suất)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I drink always coffee in the morning.', right: 'I always drink coffee in the morning.', why: 'Trạng từ tần suất đứng trước động từ thường, không chen giữa động từ và tân ngữ.' },
      { wrong: 'She always is late.', right: 'She is always late.', why: 'Với động từ "be" thì trạng từ đứng SAU, không đứng trước.' }
    ],
    examples: [
      ['I always brush my teeth before bed.', 'Tôi luôn đánh răng trước khi đi ngủ.', 1, 'Trước động từ thường.'],
      ['He is never late for class.', 'Anh ấy không bao giờ đi học muộn.', 1, 'Sau động từ "be".'],
      ['We usually have dinner at seven.', 'Chúng tôi thường ăn tối lúc bảy giờ.', 1, 'Vị trí giữa câu.'],
      ['Sometimes she takes the bus to work.', 'Thỉnh thoảng cô ấy đi xe buýt đi làm.', 1, '"sometimes" đứng đầu câu để nhấn.'],
      ['I drink always coffee in the morning.', 'Buổi sáng tôi luôn uống cà phê.', 0, 'Sai vị trí. Sửa thành "I always drink coffee in the morning."'],
      ['She always is late.', 'Cô ấy lúc nào cũng muộn.', 0, 'Sai: với "be" thì trạng từ đứng sau. Sửa thành "She is always late."']
    ],
    practice: [
      ['I ___ (always) get up at six.', 'always', 'Tôi luôn dậy lúc sáu giờ.'],
      ['He is ___ (never) angry with the children.', 'never', 'Anh ấy không bao giờ giận bọn trẻ.'],
      ['We ___ (often) go to the cinema at weekends.', 'often', 'Cuối tuần chúng tôi hay đi xem phim.'],
      ['She ___ (rarely) eats meat.', 'rarely', 'Cô ấy hiếm khi ăn thịt.'],
      ['They are ___ (usually) at home in the evening.', 'usually', 'Buổi tối họ thường ở nhà.'],
      ['I have ___ (never) been to Da Lat.', 'never', 'Tôi chưa bao giờ tới Đà Lạt.'],
      ['My father ___ (sometimes) cooks dinner.', 'sometimes', 'Thỉnh thoảng bố tôi nấu bữa tối.'],
      ['You should ___ (always) wear a helmet.', 'always', 'Bạn nên luôn đội mũ bảo hiểm.'],
      ['The shop is ___ (never) open on Sunday.', 'never', 'Cửa hàng không bao giờ mở cửa Chủ nhật.'],
      ['She ___ (usually) walks to school.', 'usually', 'Cô bé thường đi bộ tới trường.']
    ]
  },

  {
    slug: 'comparative-er-than',
    en: 'Comparatives with short adjectives',
    vi: 'So sánh hơn với tính từ ngắn — đuôi -er + than',
    level: 'A1',
    summary: 'Tính từ một âm tiết thêm đuôi -er rồi nối bằng "than"; mỗi câu chỉ chọn một cách, đã có -er thì không dùng thêm "more".',
    formula: {
      rows: [
        ['Một âm tiết', 'adj + ER + than: tall → TALLER than'],
        ['Kết thúc bằng -e', 'chỉ thêm -R: nice → NICER · large → LARGER'],
        ['Phụ âm + -y', 'đổi y thành i rồi thêm -ER: happy → HAPPIER · easy → EASIER'],
        ['Một nguyên âm + một phụ âm cuối', 'gấp đôi phụ âm: big → BIGGER · hot → HOTTER']
      ],
      note: 'Viết "than" chứ không phải "then": "than" là để so sánh, "then" là "sau đó". Hai từ đọc gần giống nhau nên rất hay viết nhầm.'
    },
    signals: ['-er than', 'bigger', 'cheaper', 'better than'],
    useWhen: [
      'So hai người, hai vật, hai nơi với nhau.',
      'Nói lý do chọn cái này thay cái kia.',
      'Mô tả thay đổi: The weather is warmer today.'
    ],
    useNot: [
      { what: 'Không dùng "more" cùng với đuôi -er.', why: '"more taller" là thừa; chỉ chọn một trong hai cách.' },
      { what: 'Không thay "than" bằng "with" hay "to".', why: 'So sánh hơn luôn đi với "than": "cheaper than", không phải "cheaper with".' }
    ],
    confuse: [
      {
        with: 'Tính từ dài dùng "more"',
        tell: 'Một âm tiết thì thêm -er; ba âm tiết trở lên thì dùng "more".',
        pair: [
          { en: 'This bag is cheaper than that one.', vi: 'Cái túi này rẻ hơn cái kia. (một âm tiết → -er)' },
          { en: 'This bag is more expensive than that one.', vi: 'Cái túi này đắt hơn cái kia. (ba âm tiết → more)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She is more tall than me.', right: 'She is taller than me.', why: '"tall" là tính từ một âm tiết nên thêm -er, không dùng "more".' },
      { wrong: 'My house is bigger then yours.', right: 'My house is bigger than yours.', why: 'Viết nhầm "then" thành từ so sánh; đúng phải là "than".' }
    ],
    examples: [
      ['My brother is taller than me.', 'Anh tôi cao hơn tôi.', 1, 'Một âm tiết, thêm -er.'],
      ['Today is hotter than yesterday.', 'Hôm nay nóng hơn hôm qua.', 1, 'Gấp đôi phụ âm cuối: hot → hotter.'],
      ['This road is safer than the old one.', 'Con đường này an toàn hơn đường cũ.', 1, 'Kết thúc bằng -e nên chỉ thêm -r.'],
      ['The test was easier than I expected.', 'Bài kiểm tra dễ hơn tôi tưởng.', 1, 'Phụ âm + y nên đổi thành -ier.'],
      ['She is more tall than me.', 'Cô ấy cao hơn tôi.', 0, 'Sai: tính từ một âm tiết thì thêm -er. Sửa thành "She is taller than me."'],
      ['My house is bigger then yours.', 'Nhà tôi to hơn nhà bạn.', 0, 'Sai chính tả: phải là "than", không phải "then".']
    ],
    practice: [
      ['This box is ___ (heavy) than that one.', 'heavier', 'Cái hộp này nặng hơn cái kia.'],
      ['My phone is ___ (old) than yours.', 'older', 'Điện thoại của tôi cũ hơn của bạn.'],
      ['The red bag is ___ (cheap) than the black one.', 'cheaper', 'Cái túi đỏ rẻ hơn cái túi đen.'],
      ['Summer days are ___ (long) than winter days.', 'longer', 'Ngày mùa hè dài hơn ngày mùa đông.'],
      ['This chair is ___ (nice) than the old one.', 'nicer', 'Cái ghế này đẹp hơn cái cũ.'],
      ['Her room is ___ (big) than mine.', 'bigger', 'Phòng cô ấy to hơn phòng tôi.'],
      ['The second exercise was ___ (easy) than the first.', 'easier', 'Bài tập thứ hai dễ hơn bài đầu.'],
      ['A bicycle is ___ (slow) than a motorbike.', 'slower', 'Xe đạp chậm hơn xe máy.'],
      ['The weather today is ___ (warm) than last week.', 'warmer', 'Thời tiết hôm nay ấm hơn tuần trước.'],
      ['This street is ___ (quiet) than the main road.', 'quieter', 'Con phố này yên tĩnh hơn đường lớn.']
    ]
  },

  {
    slug: 'superlative-est',
    en: 'Superlatives with short adjectives',
    vi: 'So sánh nhất với tính từ ngắn — the + đuôi -est',
    level: 'A1',
    summary: 'Xếp trên cả nhóm thì thêm đuôi -est và luôn có "the" đứng trước; phạm vi so sánh nêu bằng "in" hoặc "of".',
    formula: {
      rows: [
        ['Một âm tiết', 'THE + adj + EST: tall → THE TALLEST'],
        ['Chính tả giống so sánh hơn', 'nice → the nicest · happy → the happiest · big → the biggest'],
        ['Phạm vi là một nơi hay một nhóm', 'THE + est + IN: the tallest IN the class'],
        ['Phạm vi là các thành phần liệt kê', 'THE + est + OF: the best OF the three']
      ],
      note: 'Luôn có "the" trước dạng so sánh nhất. Tiếng Việt không có mạo từ nên bỏ quên "the" là lỗi rất hay gặp: "She is tallest" thiếu mất "the".'
    },
    signals: ['the -est', 'the biggest', 'in the class', 'of the three', 'ever'],
    useWhen: [
      'Xếp một người hay vật lên trên cả nhóm.',
      'Nói kỷ lục, cái nhất trong một phạm vi.',
      'Trả lời câu hỏi "Which is the…?".'
    ],
    useNot: [
      { what: 'Không bỏ "the" trước dạng so sánh nhất.', why: 'Dạng so sánh nhất chỉ đúng một đối tượng trong nhóm nên luôn xác định, phải có "the".' },
      { what: 'Không dùng "than" với so sánh nhất.', why: '"the tallest than the class" sai; phạm vi nêu bằng "in" hoặc "of".' }
    ],
    confuse: [
      {
        with: 'So sánh hơn',
        tell: 'So sánh hơn so hai bên và đi với "than"; so sánh nhất xếp trên cả nhóm và đi với "the" cùng in/of.',
        pair: [
          { en: 'Lan is taller than Mai.', vi: 'Lan cao hơn Mai. (hai người)' },
          { en: 'Lan is the tallest in her class.', vi: 'Lan cao nhất lớp. (cả nhóm)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She is tallest in the class.', right: 'She is the tallest in the class.', why: 'Thiếu "the". Dạng so sánh nhất luôn xác định.' },
      { wrong: 'This is the cheapest than all the shops.', right: 'This is the cheapest of all the shops.', why: 'So sánh nhất không đi với "than"; phạm vi nêu bằng "of" hoặc "in".' }
    ],
    examples: [
      ['Fansipan is the highest mountain in Vietnam.', 'Fansipan là ngọn núi cao nhất Việt Nam.', 1, 'Phạm vi nêu bằng "in".'],
      ['This is the cheapest ticket of the three.', 'Đây là vé rẻ nhất trong ba vé.', 1, 'Phạm vi nêu bằng "of".'],
      ['He is the youngest child in the family.', 'Cậu ấy là con út trong nhà.', 1, 'Có đủ "the" trước dạng so sánh nhất.'],
      ['That was the happiest day of my life.', 'Đó là ngày hạnh phúc nhất đời tôi.', 1, 'Phụ âm + y nên đổi thành -iest.'],
      ['She is tallest in the class.', 'Cô ấy cao nhất lớp.', 0, 'Sai: thiếu "the". Sửa thành "She is the tallest in the class."'],
      ['This is the cheapest than all the shops.', 'Đây là chỗ rẻ nhất trong các cửa hàng.', 0, 'Sai: so sánh nhất không đi với "than". Sửa thành "the cheapest of all the shops".']
    ],
    practice: [
      ['This is ___ (the / a) biggest room in the house.', 'the', 'Đây là phòng lớn nhất trong nhà.'],
      ['He is the ___ (young) player in the team.', 'youngest', 'Cậu ấy là cầu thủ trẻ nhất đội.'],
      ['That was the ___ (hot) day of the year.', 'hottest', 'Đó là ngày nóng nhất trong năm.'],
      ['Which is the ___ (cheap) of these three phones?', 'cheapest', 'Trong ba chiếc điện thoại này cái nào rẻ nhất?'],
      ['She is the ___ (busy) person I know.', 'busiest', 'Cô ấy là người bận rộn nhất tôi từng biết.'],
      ['This is the ___ (nice) beach in the area.', 'nicest', 'Đây là bãi biển đẹp nhất vùng.'],
      ['This is the ___ (large) room in the hotel.', 'largest', 'Đây là căn phòng rộng nhất khách sạn.'],
      ['He sits in the ___ (near) seat to the door.', 'nearest', 'Anh ấy ngồi ở chỗ gần cửa nhất.'],
      ['It was the ___ (long) film I have ever seen.', 'longest', 'Đó là bộ phim dài nhất tôi từng xem.'],
      ['Today is the ___ (cold) day this week.', 'coldest', 'Hôm nay là ngày lạnh nhất tuần.']
    ]
  },

  /* ==================== A2 ==================== */
  {
    slug: 'comparative-more-most',
    en: 'Comparatives and superlatives with long adjectives',
    vi: 'So sánh với tính từ dài — more / the most',
    level: 'A2',
    summary: 'Tính từ từ hai âm tiết trở lên (trừ nhóm kết thúc bằng -y) dùng "more" để so sánh hơn và "the most" để so sánh nhất.',
    formula: {
      rows: [
        ['So sánh hơn', 'MORE + adj + than: MORE expensive than'],
        ['So sánh nhất', 'THE MOST + adj: THE MOST expensive'],
        ['Hai âm tiết kết thúc bằng -y', 'vẫn dùng đuôi: happy → happier, the happiest'],
        ['Kém hơn và kém nhất', 'LESS + adj + than · THE LEAST + adj']
      ],
      note: 'Ranh giới ngắn–dài không tuyệt đối. Một số tính từ hai âm tiết dùng được cả hai cách (quiet → quieter hoặc more quiet; clever → cleverer hoặc more clever). Nhưng từ ba âm tiết trở lên thì luôn dùng "more".'
    },
    signals: ['more … than', 'the most', 'less … than', 'the least'],
    useWhen: [
      'So sánh với tính từ dài: expensive, beautiful, interesting, difficult.',
      'Xếp hạng trong một nhóm bằng "the most".',
      'Nói mức độ kém hơn bằng "less".'
    ],
    useNot: [
      { what: 'Không thêm đuôi -er vào tính từ dài.', why: '"expensiver", "beautifuler" không tồn tại; phải dùng "more expensive", "more beautiful".' },
      { what: 'Không bỏ "the" trước "most" khi so sánh nhất.', why: '"She is most beautiful girl" thiếu "the". Riêng "most" không có "the" lại mang nghĩa "rất": "It was most kind of you".' }
    ],
    confuse: [
      {
        with: '"the most" và "most" không có "the"',
        tell: 'Có "the" là xếp hạng nhất; không có "the" mà đứng trước tính từ thì "most" nghĩa là "rất", giọng trang trọng.',
        pair: [
          { en: 'She is the most careful driver in the family.', vi: 'Cô ấy là người lái xe cẩn thận nhất nhà. (xếp hạng)' },
          { en: 'That was most kind of you.', vi: 'Bạn thật là tử tế. (nghĩa "rất", giọng trang trọng)' }
        ]
      }
    ],
    errors: [
      { wrong: 'This hotel is expensiver than that one.', right: 'This hotel is more expensive than that one.', why: 'Tính từ ba âm tiết không thêm -er.' },
      { wrong: 'It was the more interesting book of the year.', right: 'It was the most interesting book of the year.', why: 'Xếp nhất trong cả nhóm thì dùng "the most", không dùng "the more".' }
    ],
    examples: [
      ['This phone is more expensive than mine.', 'Chiếc điện thoại này đắt hơn của tôi.', 1, 'Tính từ dài dùng "more".'],
      ['She is the most careful person in the office.', 'Cô ấy là người cẩn thận nhất văn phòng.', 1, 'So sánh nhất với "the most".'],
      ['The second lesson was less difficult than the first.', 'Bài thứ hai ít khó hơn bài đầu.', 1, '"less" nói mức độ kém hơn.'],
      ['He is happier now than he was last year.', 'Giờ anh ấy vui hơn hồi năm ngoái.', 1, 'Hai âm tiết kết thúc bằng -y nên vẫn dùng đuôi.'],
      ['This hotel is expensiver than that one.', 'Khách sạn này đắt hơn khách sạn kia.', 0, 'Sai: tính từ dài không thêm -er. Sửa thành "more expensive than".'],
      ['It was the more interesting book of the year.', 'Đó là quyển sách hay nhất trong năm.', 0, 'Sai: xếp nhất thì dùng "the most interesting".']
    ],
    practice: [
      ['This exercise is ___ (difficult) than the last one.', 'more difficult', 'Bài tập này khó hơn bài trước.'],
      ['She is the ___ (intelligent) student in the class.', 'most intelligent', 'Cô ấy là học sinh thông minh nhất lớp.'],
      ['Living in the city is ___ (expensive) than in the countryside.', 'more expensive', 'Sống ở thành phố đắt đỏ hơn ở quê.'],
      ['That is the ___ (beautiful) photo in the album.', 'most beautiful', 'Đó là tấm ảnh đẹp nhất trong album.'],
      ['This film is ___ (interesting) than the book — I nearly fell asleep.', 'less interesting', 'Bộ phim kém hay hơn quyển sách — tôi suýt ngủ gật.'],
      ['He is ___ (careful) than his brother.', 'more careful', 'Anh ấy cẩn thận hơn em trai.'],
      ['It was the ___ (boring) meeting of the week.', 'most boring', 'Đó là cuộc họp chán nhất tuần.'],
      ['Her explanation was ___ (useful) than the book.', 'more useful', 'Lời giải thích của cô ấy hữu ích hơn quyển sách.'],
      ['This is the ___ (comfortable) chair in the shop.', 'most comfortable', 'Đây là chiếc ghế êm nhất cửa hàng.'],
      ['The new system is ___ (complicated) than the old one.', 'more complicated', 'Hệ thống mới phức tạp hơn hệ thống cũ.']
    ]
  },

  {
    slug: 'comparative-irregular',
    en: 'Irregular comparatives',
    vi: 'So sánh bất quy tắc — good, bad, far, many, little',
    level: 'A2',
    summary: 'Năm nhóm từ thông dụng nhất lại không theo quy tắc nào: phải nhớ thuộc lòng vì chúng xuất hiện trong hầu hết mọi bài thi.',
    formula: {
      rows: [
        ['good / well', 'BETTER → THE BEST'],
        ['bad / badly', 'WORSE → THE WORST'],
        ['far', 'FARTHER hoặc FURTHER → THE FARTHEST / THE FURTHEST'],
        ['many, much', 'MORE → THE MOST'],
        ['little', 'LESS → THE LEAST']
      ],
      note: '"farther" thiên về khoảng cách đo được, "further" dùng được cả khoảng cách lẫn nghĩa trừu tượng ("further information", "further discussion"). Trong tiếng Anh hiện đại "further" phổ biến hơn ở cả hai nghĩa.'
    },
    signals: ['better', 'the best', 'worse', 'the worst', 'further', 'more', 'less'],
    useWhen: [
      'So sánh chất lượng: better, worse.',
      'Nói khoảng cách: further, the furthest.',
      'So số lượng: more, less, the most, the least.'
    ],
    useNot: [
      { what: 'Không ghép "more" hay "-er" vào các từ này.', why: '"more good", "badder", "more better" đều sai; dạng bất quy tắc đã tự mang nghĩa so sánh.' },
      { what: 'Không lẫn "worse" với "worst".', why: '"worse" so hai bên, "the worst" xếp nhất: "worse than yesterday" nhưng "the worst day of the year".' }
    ],
    confuse: [
      {
        with: '"good" và "well"',
        tell: 'Cả hai đều thành "better", nhưng "good" là tính từ tả vật, "well" là trạng từ tả cách làm.',
        pair: [
          { en: 'This coffee is better than the other one.', vi: 'Cà phê này ngon hơn cốc kia. (tính từ)' },
          { en: 'She sings better than I do.', vi: 'Cô ấy hát hay hơn tôi. (trạng từ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'This film is more good than that one.', right: 'This film is better than that one.', why: '"good" có dạng so sánh riêng là "better".' },
      { wrong: 'My results are more bad this term.', right: 'My results are worse this term.', why: '"bad" có dạng so sánh riêng là "worse".' }
    ],
    examples: [
      ['Her English is better than mine.', 'Tiếng Anh của cô ấy tốt hơn tôi.', 1, 'good → better.'],
      ['The traffic is worse in the afternoon.', 'Buổi chiều giao thông tệ hơn.', 1, 'bad → worse.'],
      ['That was the best meal of the trip.', 'Đó là bữa ngon nhất chuyến đi.', 1, 'Dạng so sánh nhất của "good".'],
      ['We need further information before deciding.', 'Chúng tôi cần thêm thông tin trước khi quyết định.', 1, '"further" mang nghĩa trừu tượng.'],
      ['This film is more good than that one.', 'Phim này hay hơn phim kia.', 0, 'Sai: dùng dạng bất quy tắc "better".'],
      ['Yesterday was the worse day of the week.', 'Hôm qua là ngày tệ nhất tuần.', 0, 'Sai: xếp nhất thì dùng "the worst", không phải "the worse".']
    ],
    practice: [
      ['My new job is ___ (good) than the old one.', 'better', 'Công việc mới của tôi tốt hơn việc cũ.'],
      ['The weather today is ___ (bad) than yesterday.', 'worse', 'Thời tiết hôm nay tệ hơn hôm qua.'],
      ['That is the ___ (good) film I have seen this year.', 'best', 'Đó là bộ phim hay nhất tôi xem năm nay.'],
      ['We walked ___ (far) than we planned.', 'further', 'Chúng tôi đi bộ xa hơn dự tính.'],
      ['This shop has ___ (many) choices than the other one.', 'more', 'Cửa hàng này nhiều lựa chọn hơn cửa hàng kia.'],
      ['He earns ___ (little) money now but he is happier.', 'less', 'Giờ anh ấy kiếm ít tiền hơn nhưng vui hơn.'],
      ['It was the ___ (bad) storm in ten years.', 'worst', 'Đó là cơn bão dữ nhất trong mười năm.'],
      ['She plays the piano ___ (well) than her sister.', 'better', 'Cô ấy chơi piano hay hơn chị mình.'],
      ['Of all the routes, this one takes the ___ (little) time.', 'least', 'Trong tất cả các tuyến, tuyến này mất ít thời gian nhất.'],
      ['Which city has the ___ (many) visitors?', 'most', 'Thành phố nào đón nhiều khách nhất?']
    ]
  },

  {
    slug: 'as-as',
    en: 'Comparing things that are equal',
    vi: 'So sánh bằng — as … as',
    level: 'A2',
    summary: 'Hai bên ngang nhau thì kẹp tính từ hoặc trạng từ ở dạng NGUYÊN giữa hai chữ "as"; phủ định dùng "not as … as".',
    formula: {
      rows: [
        ['Bằng nhau', 'AS + tính từ nguyên dạng + AS: She is AS tall AS her sister.'],
        ['Không bằng', 'NOT AS/SO + adj + AS: This is NOT AS expensive AS that.'],
        ['Với trạng từ', 'AS + trạng từ + AS: He runs AS fast AS I do.'],
        ['Gấp bao nhiêu lần', 'twice / three times + AS + adj + AS: twice AS big AS…']
      ],
      note: 'Giữa hai chữ "as" là dạng NGUYÊN của tính từ, không phải dạng so sánh hơn: "as tall as", không bao giờ "as taller as". Và không chen "than" vào cấu trúc này.'
    },
    signals: ['as … as', 'not as … as', 'twice as … as', 'the same as'],
    useWhen: [
      'Nói hai bên ngang nhau về một đặc điểm.',
      'Phủ nhận sự hơn kém một cách nhẹ nhàng hơn "less than".',
      'Nói gấp mấy lần: twice as expensive.'
    ],
    useNot: [
      { what: 'Không dùng dạng so sánh hơn giữa hai chữ "as".', why: '"as taller as" sai; cấu trúc này đòi dạng nguyên của tính từ.' },
      { what: 'Không thay chữ "as" thứ hai bằng "than".', why: '"as expensive than" là trộn hai cấu trúc; phải là "as expensive as" hoặc "more expensive than".' }
    ],
    confuse: [
      {
        with: 'So sánh hơn',
        tell: '"as … as" nói ngang bằng; "-er than" hoặc "more … than" nói hơn kém.',
        pair: [
          { en: 'This bag is as expensive as that one.', vi: 'Cái túi này đắt bằng cái kia. (ngang nhau)' },
          { en: 'This bag is more expensive than that one.', vi: 'Cái túi này đắt hơn cái kia. (hơn kém)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She is as taller as her sister.', right: 'She is as tall as her sister.', why: 'Giữa hai chữ "as" phải là dạng nguyên của tính từ.' },
      { wrong: 'It is not so expensive than the other one.', right: 'It is not so expensive as the other one.', why: 'Cấu trúc "not so … as" kết thúc bằng "as", không phải "than".' }
    ],
    examples: [
      ['My room is as big as yours.', 'Phòng tôi to bằng phòng bạn.', 1, 'Hai bên ngang nhau.'],
      ['This restaurant is not as cheap as the one near my house.', 'Nhà hàng này không rẻ bằng chỗ gần nhà tôi.', 1, 'Phủ định với "not as … as".'],
      ['He works as hard as his father did.', 'Anh ấy làm việc chăm chỉ như bố anh ấy ngày trước.', 1, '"as … as" dùng được với trạng từ.'],
      ['The new flat is twice as large as the old one.', 'Căn hộ mới rộng gấp đôi căn cũ.', 1, 'Nói gấp mấy lần.'],
      ['She is as taller as her sister.', 'Cô ấy cao bằng chị mình.', 0, 'Sai: phải dùng dạng nguyên. Sửa thành "as tall as".'],
      ['It is not so expensive than the other one.', 'Cái này không đắt bằng cái kia.', 0, 'Sai: kết thúc bằng "as". Sửa thành "not so expensive as the other one".']
    ],
    practice: [
      ['This book is as ___ (interesting) as the film.', 'interesting', 'Quyển sách này hay ngang bộ phim.'],
      ['My bag is not as ___ (heavy) as yours.', 'heavy', 'Túi tôi không nặng bằng túi bạn.'],
      ['He speaks English as ___ (fluent / fluently) as a native.', 'fluently', 'Anh ấy nói tiếng Anh trôi chảy như người bản xứ.'],
      ['The new phone costs twice as ___ (much) as the old one.', 'much', 'Điện thoại mới đắt gấp đôi cái cũ.'],
      ['Her house is as ___ (large) as a hotel.', 'large', 'Nhà cô ấy rộng như khách sạn.'],
      ['This exercise is not as ___ (easy) as it looks.', 'easy', 'Bài này không dễ như vẻ ngoài đâu.'],
      ['She arrived as ___ (early) as usual.', 'early', 'Cô ấy đến sớm như mọi khi.'],
      ['The second test was as ___ (difficult) as the first.', 'difficult', 'Bài kiểm tra thứ hai khó ngang bài đầu.'],
      ['Nobody sings as ___ (good / well) as she does.', 'well', 'Không ai hát hay bằng cô ấy.'],
      ['My salary is not as ___ (high) as I hoped.', 'high', 'Lương tôi không cao như tôi mong.']
    ]
  },

  {
    slug: 'adv-manner-ly',
    en: 'Adverbs of manner',
    vi: 'Trạng từ chỉ cách thức — đuôi -ly và những ngoại lệ',
    level: 'A2',
    summary: 'Tính từ tả người tả vật, trạng từ tả cách làm; phần lớn thêm -ly, nhưng có nhóm giữ nguyên hình và một cái bẫy tên là "hardly".',
    formula: {
      rows: [
        ['Quy tắc chung', 'tính từ + LY: quick → quickLY · careful → carefulLY'],
        ['Kết thúc bằng phụ âm + -y', 'đổi y thành i: happy → happiLY · easy → easiLY'],
        ['Kết thúc bằng -le', 'bỏ e thêm y: simple → simply · terrible → terribly'],
        ['Giữ nguyên hình', 'fast, hard, late, early — vừa là tính từ vừa là trạng từ.'],
        ['Bất quy tắc', 'good → WELL']
      ],
      note: '"hardly" KHÔNG phải trạng từ của "hard". "He works hard" là làm việc chăm chỉ; "He hardly works" là hầu như không làm gì — hai câu nghĩa ngược nhau hoàn toàn.'
    },
    signals: ['-ly', 'well', 'fast', 'hard', 'How…?'],
    useWhen: [
      'Nói một việc được làm như thế nào.',
      'Trả lời câu hỏi "How…?".',
      'Bổ nghĩa cho tính từ hoặc trạng từ khác: extremely tired.'
    ],
    useNot: [
      { what: 'Không dùng tính từ sau động từ thường.', why: '"He drives careful" sai; động từ thường cần trạng từ: "He drives carefully".' },
      { what: 'Không thêm -ly vào các từ giữ nguyên hình.', why: '"fastly" không tồn tại; "He runs fast" mới đúng.' }
    ],
    confuse: [
      {
        with: '"hard" và "hardly"',
        tell: '"hard" là chăm chỉ, mạnh; "hardly" là hầu như không. Thêm -ly ở đây làm đổi nghĩa chứ không đổi từ loại.',
        pair: [
          { en: 'She works hard.', vi: 'Cô ấy làm việc chăm chỉ.' },
          { en: 'She hardly works.', vi: 'Cô ấy hầu như không làm gì.' }
        ]
      }
    ],
    errors: [
      { wrong: 'She sings very good.', right: 'She sings very well.', why: 'Sau động từ thường phải là trạng từ; trạng từ của "good" là "well".' },
      { wrong: 'He drives careful on wet roads.', right: 'He drives carefully on wet roads.', why: 'Tả cách lái xe thì cần trạng từ, không dùng tính từ.' }
    ],
    examples: [
      ['She speaks English fluently.', 'Cô ấy nói tiếng Anh trôi chảy.', 1, 'Trạng từ tả cách nói.'],
      ['Please drive carefully in the rain.', 'Trời mưa hãy lái xe cẩn thận.', 1, 'Thêm -ly vào "careful".'],
      ['He runs fast for his age.', 'So với tuổi thì ông ấy chạy nhanh.', 1, '"fast" giữ nguyên hình, không có "fastly".'],
      ['The children waited quietly outside.', 'Bọn trẻ đứng đợi lặng lẽ bên ngoài.', 1, 'Quy tắc chung, thêm -ly.'],
      ['She sings very good.', 'Cô ấy hát rất hay.', 0, 'Sai: cần trạng từ. Sửa thành "She sings very well."'],
      ['He hardly works, so he is always tired.', 'Anh ấy làm việc chăm chỉ nên lúc nào cũng mệt.', 0, 'Câu tiếng Anh nói ngược ý người viết: "hardly works" là hầu như không làm gì. Muốn nói chăm chỉ thì viết "He works hard".']
    ],
    practice: [
      ['She answered the question ___ (correct).', 'correctly', 'Cô ấy trả lời câu hỏi đúng.'],
      ['He plays the guitar ___ (beautiful).', 'beautifully', 'Anh ấy chơi ghi ta rất hay.'],
      ['They finished the work ___ (quick).', 'quickly', 'Họ làm xong việc nhanh chóng.'],
      ['You speak English very ___ (good / well).', 'well', 'Bạn nói tiếng Anh rất giỏi.'],
      ['The old man walked ___ (slow) to the gate.', 'slowly', 'Ông cụ đi chậm rãi ra cổng.'],
      ['She sat there ___ (happy) reading a book.', 'happily', 'Cô ấy ngồi đó vui vẻ đọc sách.'],
      ['Our team worked ___ (hard / hardly) all week.', 'hard', 'Cả tuần đội chúng tôi làm việc chăm chỉ.'],
      ['I can ___ (hard / hardly) hear you.', 'hardly', 'Tôi hầu như không nghe thấy bạn nói gì.'],
      ['He explained it very ___ (simple).', 'simply', 'Anh ấy giải thích rất đơn giản.'],
      ['She arrived ___ (late) again.', 'late', 'Cô ấy lại đến muộn.']
    ]
  },

  {
    slug: 'adj-ed-ing',
    en: 'Adjectives ending in -ed and -ing',
    vi: 'Tính từ đuôi -ed và -ing — bored khác boring',
    level: 'A2',
    summary: 'Đuôi -ed nói CẢM GIÁC của người; đuôi -ing nói TÍNH CHẤT của thứ gây ra cảm giác đó. Nhầm hai đuôi này là tự nhận mình nhạt nhẽo.',
    formula: {
      rows: [
        ['-ED: cảm giác của người', 'I am BORED. · She was surprisED.'],
        ['-ING: tính chất của vật hoặc việc', 'The film is BORING. · The news was surprisING.'],
        ['Đi cùng nhau trong một câu', 'I am bored because the lesson is boring.'],
        ['Người vẫn dùng được -ing', 'He is boring. = anh ta là người tẻ nhạt, không phải anh ta đang chán.']
      ],
      note: '"I am boring" nghĩa là "tôi là người nhạt nhẽo" chứ không phải "tôi đang chán". Đây là lỗi kinh điển và gây hiểu nhầm buồn cười nhất trong cả nhóm tính từ.'
    },
    signals: ['bored / boring', 'interested / interesting', 'tired / tiring', 'excited / exciting'],
    useWhen: [
      'Nói cảm xúc của bản thân hoặc người khác: I am interested in music.',
      'Đánh giá một bộ phim, quyển sách, chuyến đi.',
      'Giải thích nguyên nhân cảm xúc: I was tired because the trip was tiring.'
    ],
    useNot: [
      { what: 'Không dùng đuôi -ing để tả cảm giác của chính mình.', why: '"I am boring" là tự nhận mình nhạt; muốn nói đang chán thì "I am bored".' },
      { what: 'Không dùng đuôi -ed cho vật.', why: '"The film was excited" sai vì bộ phim không có cảm xúc; phải là "exciting".' }
    ],
    confuse: [
      {
        with: 'Hai đuôi dùng cho cùng một người',
        tell: 'Cùng nói về một người, -ed là người đó đang cảm thấy, -ing là người đó gây ra cảm giác cho người khác.',
        pair: [
          { en: 'He is bored.', vi: 'Anh ấy đang chán.' },
          { en: 'He is boring.', vi: 'Anh ấy là người nhạt nhẽo.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I am very boring in this class.', right: 'I am very bored in this class.', why: 'Nói cảm giác của mình thì dùng -ed. Câu sai kia nghĩa là "tôi rất nhạt nhẽo trong lớp này".' },
      { wrong: 'The trip was very excited.', right: 'The trip was very exciting.', why: 'Chuyến đi là thứ gây ra cảm xúc nên dùng -ing.' }
    ],
    examples: [
      ['The lesson was interesting, so nobody was bored.', 'Bài học thú vị nên chẳng ai thấy chán.', 1, 'Đủ cả hai đuôi trong một câu.'],
      ['I am interested in Vietnamese history.', 'Tôi thích lịch sử Việt Nam.', 1, 'Cảm giác của người → đuôi -ed.'],
      ['That was a tiring journey.', 'Đó là một hành trình mệt mỏi.', 1, 'Hành trình gây mệt → đuôi -ing.'],
      ['She looked surprised when she saw us.', 'Cô ấy có vẻ ngạc nhiên khi thấy chúng tôi.', 1, 'Cảm xúc hiện trên mặt người → đuôi -ed.'],
      ['I am very boring in this class.', 'Tôi rất chán trong lớp này.', 0, 'Sai nghĩa: câu này là tự nhận mình nhạt nhẽo. Sửa thành "I am very bored in this class."'],
      ['The trip was very excited.', 'Chuyến đi rất thú vị.', 0, 'Sai: vật thì dùng -ing. Sửa thành "The trip was very exciting."']
    ],
    practice: [
      ['I was ___ (bored / boring) during the long speech.', 'bored', 'Tôi thấy chán suốt bài phát biểu dài.'],
      ['The film was really ___ (excited / exciting).', 'exciting', 'Bộ phim thực sự hấp dẫn.'],
      ['She is ___ (interested / interesting) in learning Korean.', 'interested', 'Cô ấy thích học tiếng Hàn.'],
      ['The results were ___ (surprised / surprising).', 'surprising', 'Kết quả thật bất ngờ.'],
      ['After the hike we were all ___ (tired / tiring).', 'tired', 'Sau chuyến leo núi cả bọn đều mệt.'],
      ['His story about the storm was ___ (frightened / frightening).', 'frightening', 'Câu chuyện của anh ấy về cơn bão thật đáng sợ.'],
      ['The children were ___ (excited / exciting) about the trip.', 'excited', 'Bọn trẻ háo hức về chuyến đi.'],
      ['This job is ___ (satisfied / satisfying) even though it is hard.', 'satisfying', 'Công việc này tuy vất vả nhưng thoả mãn.'],
      ['I felt ___ (confused / confusing) by the instructions.', 'confused', 'Tôi thấy khó hiểu với hướng dẫn.'],
      ['It was a ___ (disappointed / disappointing) result for the team.', 'disappointing', 'Đó là kết quả đáng thất vọng với cả đội.']
    ]
  },

  {
    slug: 'too-enough',
    en: 'too and enough',
    vi: '"too" và "enough" — quá mức và đủ mức',
    level: 'A2',
    summary: '"too" là quá mức đến thành vấn đề, luôn mang giọng tiêu cực; "enough" là đủ mức, đứng SAU tính từ nhưng TRƯỚC danh từ.',
    formula: {
      rows: [
        ['too + tính từ', 'quá mức, nghĩa tiêu cực: This coffee is TOO hot — nóng đến mức không uống được.'],
        ['tính từ + enough', 'đủ mức: He is old ENOUGH to drive.'],
        ['enough + danh từ', 'ENOUGH money · ENOUGH time — với danh từ thì "enough" đứng TRƯỚC.'],
        ['Kèm mệnh đề nguyên thể', 'too + adj + TO-V: too tired TO walk · adj + enough + TO-V: strong enough TO lift it.']
      ],
      note: '"too" khác "very": "very hot" chỉ là rất nóng, còn ngon; "too hot" là nóng quá mức chịu được. Người học hay dùng "too" thay cho "very" và vô tình biến lời khen thành lời chê.'
    },
    signals: ['too + tính từ', 'enough to', 'not enough', 'too much / too many'],
    useWhen: [
      'Nói một mức độ vượt quá giới hạn chấp nhận được.',
      'Nói đã đủ điều kiện để làm gì: old enough to vote.',
      'Từ chối lời mời cho lịch sự: I am too busy today.'
    ],
    useNot: [
      { what: 'Không dùng "too" khi chỉ muốn nói "rất".', why: '"Your English is too good" nghe như tiếng Anh giỏi đến mức thành vấn đề; khen thì dùng "very good".' },
      { what: 'Không đặt "enough" trước tính từ.', why: '"enough big" sai; với tính từ thì "enough" luôn đứng sau: "big enough".' }
    ],
    confuse: [
      {
        with: '"very"',
        tell: '"very" chỉ tăng mức độ, giọng trung tính; "too" báo đã vượt quá giới hạn, luôn kèm hàm ý tiêu cực.',
        pair: [
          { en: 'The soup is very hot.', vi: 'Món canh rất nóng. (vẫn ăn được, có khi còn ngon)' },
          { en: 'The soup is too hot to eat.', vi: 'Canh nóng quá không ăn được.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The bag is enough big for my books.', right: 'The bag is big enough for my books.', why: 'Với tính từ thì "enough" đứng sau.' },
      { wrong: 'I am too happy to see you again.', right: 'I am very happy to see you again.', why: '"too happy" nghĩa là hạnh phúc quá mức đến thành vấn đề; lời chào mừng thì dùng "very".' }
    ],
    examples: [
      ['This box is too heavy for me to carry.', 'Cái hộp này nặng quá tôi không bê nổi.', 1, '"too … to" nói quá mức đến mức không làm được.'],
      ['She is old enough to travel alone.', 'Cô bé đã đủ lớn để đi một mình.', 1, '"enough" đứng sau tính từ.'],
      ['We do not have enough chairs for everyone.', 'Chúng ta không đủ ghế cho mọi người.', 1, 'Với danh từ thì "enough" đứng trước.'],
      ['The film was too long, so we left early.', 'Phim dài quá nên chúng tôi về sớm.', 1, '"too" mang giọng tiêu cực.'],
      ['The bag is enough big for my books.', 'Cái túi đủ to để đựng sách của tôi.', 0, 'Sai vị trí. Sửa thành "The bag is big enough for my books."'],
      ['I am too happy to see you again.', 'Tôi rất vui được gặp lại bạn.', 0, 'Sai sắc thái: "too happy" là quá mức thành vấn đề. Sửa thành "I am very happy to see you again."']
    ],
    practice: [
      ['This tea is ___ (too / very) hot to drink right now.', 'too', 'Trà này nóng quá không uống được ngay.'],
      ['He is not tall ___ (enough) to reach the shelf.', 'enough', 'Anh ấy không đủ cao để với tới cái kệ.'],
      ['We do not have ___ (enough) time to finish today.', 'enough', 'Chúng ta không đủ thời gian để làm xong hôm nay.'],
      ['The shoes are ___ (too) small for me.', 'too', 'Đôi giày nhỏ quá với tôi.'],
      ['Is your room warm ___ (enough) in winter?', 'enough', 'Mùa đông phòng bạn có đủ ấm không?'],
      ['She was ___ (too / very) tired to cook, so we ordered food.', 'too', 'Cô ấy mệt quá không nấu nổi nên chúng tôi gọi đồ ăn.'],
      ['I am ___ (too / very) glad you came.', 'very', 'Tôi rất mừng vì bạn đã đến.'],
      ['There were ___ (too / enough) many people at the station.', 'too', 'Ở ga đông người quá.'],
      ['He speaks clearly ___ (enough) for everyone to understand.', 'enough', 'Anh ấy nói đủ rõ để mọi người hiểu.'],
      ['This coat is not warm ___ (enough) for Hanoi in January.', 'enough', 'Chiếc áo này không đủ ấm cho Hà Nội tháng Giêng.']
    ]
  },

  /* ==================== B1 ==================== */
  {
    slug: 'adj-order',
    en: 'The order of several adjectives',
    vi: 'Trật tự nhiều tính từ trước một danh từ',
    level: 'B1',
    summary: 'Khi có từ hai tính từ trở lên, tiếng Anh xếp theo một trật tự cố định mà người bản ngữ tuân theo không cần nghĩ: ý kiến đứng trước sự thật.',
    formula: {
      rows: [
        ['Thứ tự chuẩn', 'ý kiến – kích cỡ – tuổi – hình dáng – màu – nguồn gốc – chất liệu – mục đích + DANH TỪ'],
        ['Ví dụ đủ chuỗi', 'a lovely little old round red Italian wooden salad bowl'],
        ['Ý kiến luôn đứng trước sự thật', 'a beautiful old house — không nói "an old beautiful house".'],
        ['Cùng loại thì ngăn bằng dấu phẩy', 'a cold, wet, windy day — ba tính từ cùng tả thời tiết.'],
        ['Thực tế hiếm khi quá ba tính từ', 'Nhiều hơn thì tách bớt ra thành mệnh đề quan hệ cho câu nhẹ.']
      ],
      note: 'Không cần thuộc lòng cả tám bậc. Chỉ cần nhớ hai điều: tính từ nêu Ý KIẾN đứng trước tính từ nêu SỰ THẬT, và tính từ càng gắn với bản chất của vật thì càng đứng sát danh từ.'
    },
    signals: ['hai tính từ trở lên', 'a nice big…', 'a small round…', 'dấu phẩy giữa các tính từ'],
    useWhen: [
      'Mô tả chi tiết một đồ vật trong bài Nói Part 2.',
      'Viết đoạn tả người, tả cảnh.',
      'Ghi mô tả sản phẩm, quảng cáo.'
    ],
    useNot: [
      { what: 'Không đặt tính từ nêu sự thật trước tính từ nêu ý kiến.', why: '"an old beautiful house" nghe sai tai người bản ngữ; ý kiến ("beautiful") phải đứng trước.' },
      { what: 'Không ngăn bằng dấu phẩy khi các tính từ thuộc loại khác nhau.', why: '"a big, red car" hơi thừa; dấu phẩy chỉ dùng khi các tính từ cùng loại và có thể đảo chỗ cho nhau.' }
    ],
    confuse: [
      {
        with: 'Các tính từ cùng loại ngăn bằng dấu phẩy',
        tell: 'Cùng loại thì có dấu phẩy và đảo chỗ được cho nhau; khác loại thì viết liền nhau theo trật tự cố định, không đảo được.',
        pair: [
          { en: 'It was a cold, wet, windy day.', vi: 'Đó là một ngày lạnh, ẩm, nhiều gió. (cùng loại — có dấu phẩy, đảo chỗ vẫn xuôi)' },
          { en: 'It was a big old wooden house.', vi: 'Đó là một ngôi nhà gỗ to và cũ. (khác loại — không dấu phẩy, không đảo chỗ được)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She has a red beautiful dress.', right: 'She has a beautiful red dress.', why: 'Ý kiến ("beautiful") đứng trước màu sắc ("red").' },
      { wrong: 'He drives an Italian old small car.', right: 'He drives a small old Italian car.', why: 'Trật tự đúng là kích cỡ – tuổi – nguồn gốc.' }
    ],
    examples: [
      ['She wore a beautiful long silk dress.', 'Cô ấy mặc một chiếc váy lụa dài rất đẹp.', 1, 'Ý kiến – kích cỡ – chất liệu.'],
      ['They live in a small old wooden house.', 'Họ sống trong một ngôi nhà gỗ nhỏ và cũ.', 1, 'Kích cỡ – tuổi – chất liệu.'],
      ['It was a cold, wet, windy day.', 'Đó là một ngày lạnh, ẩm và nhiều gió.', 1, 'Ba tính từ cùng loại nên ngăn bằng dấu phẩy.'],
      ['He bought an expensive Japanese camera.', 'Anh ấy mua một chiếc máy ảnh Nhật đắt tiền.', 1, 'Ý kiến đứng trước nguồn gốc.'],
      ['She has a red beautiful dress.', 'Cô ấy có một chiếc váy đỏ rất đẹp.', 0, 'Sai trật tự. Sửa thành "a beautiful red dress".'],
      ['He drives an Italian old small car.', 'Anh ấy lái một chiếc xe Ý nhỏ và cũ.', 0, 'Sai trật tự. Sửa thành "a small old Italian car".']
    ],
    practice: [
      ['She wore a ___ ___ (red / beautiful) dress.', 'beautiful … red', 'Cô ấy mặc một chiếc váy đỏ rất đẹp.'],
      ['They live in a ___ ___ (wooden / small) house.', 'small … wooden', 'Họ sống trong một ngôi nhà gỗ nhỏ.'],
      ['He drives a ___ ___ (Japanese / new) car.', 'new … Japanese', 'Anh ấy lái một chiếc xe Nhật mới.'],
      ['We visited a ___ ___ (old / fascinating) temple.', 'fascinating … old', 'Chúng tôi thăm một ngôi chùa cổ rất hấp dẫn.'],
      ['She bought a ___ ___ (leather / black) bag.', 'black … leather', 'Cô ấy mua một chiếc túi da đen.'],
      ['It is a ___ ___ (round / big) table.', 'big … round', 'Đó là một chiếc bàn tròn to.'],
      ['They have a ___ ___ (little / lovely) garden.', 'lovely … little', 'Họ có một khu vườn nhỏ xinh.'],
      ['He showed me a ___ ___ (silver / old) ring.', 'old … silver', 'Anh ấy cho tôi xem một chiếc nhẫn bạc cũ.'],
      ['She has ___ ___ (brown / long) hair.', 'long … brown', 'Cô ấy có mái tóc nâu dài.'],
      ['It was a ___ ___ (cotton / cheap) shirt.', 'cheap … cotton', 'Đó là một chiếc áo cotton rẻ tiền.']
    ]
  },

  {
    slug: 'comparative-modifiers',
    en: 'Making a comparison stronger or weaker',
    vi: 'Bổ nghĩa cho so sánh — much better, a bit cheaper, by far the best',
    level: 'B1',
    summary: 'Muốn nói hơn nhiều hay hơn một chút thì đặt much / far / a bit / slightly trước dạng so sánh — nhưng tuyệt đối không dùng "very".',
    formula: {
      rows: [
        ['Hơn nhiều', 'MUCH / FAR / A LOT + so sánh hơn: much better · far more expensive'],
        ['Hơn một chút', 'A BIT / A LITTLE / SLIGHTLY + so sánh hơn: slightly cheaper'],
        ['Nhấn so sánh nhất', 'BY FAR the best · EASILY the best'],
        ['Không dùng "very"', 'Không nói "very better"; muốn nhấn thì "much better".']
      ],
      note: '"very" chỉ bổ nghĩa cho tính từ nguyên dạng (very good). Dạng so sánh hơn đòi nhóm bổ nghĩa riêng: much, far, a lot, a bit, slightly, rather.'
    },
    signals: ['much better', 'far more', 'a bit cheaper', 'slightly', 'by far'],
    useWhen: [
      'Nói rõ khoảng cách giữa hai bên là lớn hay nhỏ.',
      'Viết Task 1 mô tả chênh lệch số liệu.',
      'Nhấn mạnh vị trí dẫn đầu: by far the largest.'
    ],
    useNot: [
      { what: 'Không dùng "very" trước dạng so sánh hơn.', why: '"very better" sai; nhóm bổ nghĩa cho so sánh hơn là much, far, a lot, a bit, slightly.' },
      { what: 'Không đặt bổ ngữ sai chỗ.', why: '"more much expensive" sai; phải "much more expensive" — bổ ngữ đứng trước cả cụm so sánh.' }
    ],
    confuse: [
      {
        with: 'Bổ nghĩa cho tính từ nguyên dạng',
        tell: '"very" đi với dạng nguyên; "much/far/a bit" đi với dạng so sánh hơn.',
        pair: [
          { en: 'This one is very good.', vi: 'Cái này rất tốt. (dạng nguyên → very)' },
          { en: 'This one is much better.', vi: 'Cái này tốt hơn nhiều. (dạng so sánh → much)' }
        ]
      }
    ],
    errors: [
      { wrong: 'This laptop is very better than the old one.', right: 'This laptop is much better than the old one.', why: '"very" không bổ nghĩa cho dạng so sánh hơn.' },
      { wrong: 'My new phone is more much expensive.', right: 'My new phone is much more expensive.', why: 'Bổ ngữ đứng trước cả cụm "more + tính từ".' }
    ],
    examples: [
      ['The new road is much faster than the old one.', 'Con đường mới nhanh hơn hẳn đường cũ.', 1, '"much" nói khoảng cách lớn.'],
      ['This shirt is slightly cheaper than that one.', 'Chiếc áo này rẻ hơn chiếc kia một chút.', 1, '"slightly" nói khoảng cách nhỏ.'],
      ['She is by far the best student in the group.', 'Cô ấy vượt xa cả nhóm, giỏi nhất.', 1, '"by far" nhấn so sánh nhất.'],
      ['The exam was a bit harder than last year.', 'Kỳ thi khó hơn năm ngoái một chút.', 1, '"a bit" giảm nhẹ mức chênh lệch.'],
      ['This laptop is very better than the old one.', 'Máy này tốt hơn hẳn máy cũ.', 0, 'Sai: "very" không đi với dạng so sánh hơn. Sửa thành "much better".'],
      ['My new phone is more much expensive.', 'Điện thoại mới của tôi đắt hơn nhiều.', 0, 'Sai trật tự. Sửa thành "much more expensive".']
    ],
    practice: [
      ['The second test was ___ (much / very) easier than the first.', 'much', 'Bài kiểm tra thứ hai dễ hơn hẳn bài đầu.'],
      ['This route is ___ (slightly) longer but safer.', 'slightly', 'Tuyến này dài hơn một chút nhưng an toàn hơn.'],
      ['He is ___ (far) more experienced than the other candidates.', 'far', 'Anh ấy nhiều kinh nghiệm hơn hẳn các ứng viên khác.'],
      ['Their new album is ___ (by far) the best of the year.', 'by far', 'Album mới của họ hay nhất năm, vượt xa phần còn lại.'],
      ['The weather is ___ (a bit) warmer today.', 'a bit', 'Hôm nay trời ấm hơn một chút.'],
      ['This solution is ___ (much / very) more practical.', 'much', 'Giải pháp này thiết thực hơn nhiều.'],
      ['Prices are ___ (slightly) higher in the city centre.', 'slightly', 'Giá ở trung tâm cao hơn một chút.'],
      ['She speaks ___ (a lot) more confidently than before.', 'a lot', 'Cô ấy nói tự tin hơn trước nhiều.'],
      ['The old model was ___ (far) less reliable.', 'far', 'Đời máy cũ kém tin cậy hơn nhiều.'],
      ['This is ___ (easily) the cheapest option.', 'easily', 'Đây rõ ràng là lựa chọn rẻ nhất.']
    ]
  },

  {
    slug: 'double-comparative',
    en: 'Parallel and progressive comparatives',
    vi: 'So sánh kép — "the more … the better" và "hotter and hotter"',
    level: 'B1',
    summary: 'Hai vế so sánh song song diễn tả quan hệ càng… càng…; lặp lại dạng so sánh với "and" diễn tả mức độ tăng dần theo thời gian.',
    formula: {
      rows: [
        ['Hai vế song song', 'THE + so sánh hơn …, THE + so sánh hơn …: THE MORE you practise, THE BETTER you get.'],
        ['Rút gọn khi ý đã rõ', 'THE sooner, THE better. · THE more, THE merrier.'],
        ['Tăng dần theo thời gian', 'so sánh hơn + AND + so sánh hơn: hotter AND hotter'],
        ['Với tính từ dài', 'MORE AND MORE + tính từ: more and more expensive'],
        ['Dấu phẩy', 'Vế đầu là mệnh đề phụ nên luôn có dấu phẩy ngăn cách hai vế.']
      ],
      note: 'Hai vế đều bắt buộc có "the". Bỏ mất "the" ở vế sau là lỗi hay gặp: "The more you read, better you write" thiếu "the" trước "better".'
    },
    signals: ['the more … the more', 'the sooner the better', 'more and more', '-er and -er'],
    useWhen: [
      'Nói quan hệ tỉ lệ thuận hoặc nghịch giữa hai việc.',
      'Mô tả xu hướng tăng dần trong bài Viết Task 1.',
      'Đưa lời khuyên gọn: The sooner, the better.'
    ],
    useNot: [
      { what: 'Không bỏ "the" ở một trong hai vế.', why: 'Cấu trúc này bắt buộc có "the" ở cả hai vế; thiếu một chỗ là câu hỏng.' },
      { what: 'Không dùng "more and more" với tính từ ngắn.', why: '"more and more hot" nghe vụng; tính từ ngắn thì lặp đuôi -er: "hotter and hotter".' }
    ],
    confuse: [
      {
        with: 'So sánh hơn thông thường',
        tell: 'So sánh hơn thường so hai đối tượng; so sánh kép nói quan hệ giữa hai đại lượng cùng thay đổi.',
        pair: [
          { en: 'He works harder than his brother.', vi: 'Anh ấy làm việc chăm hơn em trai. (so hai người)' },
          { en: 'The harder he works, the more tired he feels.', vi: 'Càng làm nhiều anh ấy càng thấy mệt. (hai đại lượng cùng đổi)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The more you read, better you write.', right: 'The more you read, the better you write.', why: 'Vế sau cũng phải có "the".' },
      { wrong: 'The weather is getting more and more hot.', right: 'The weather is getting hotter and hotter.', why: 'Tính từ một âm tiết thì lặp đuôi -er, không dùng "more and more".' }
    ],
    examples: [
      ['The more you practise, the better you get.', 'Càng luyện tập bạn càng giỏi lên.', 1, 'Hai vế song song, đủ "the" cả hai.'],
      ['The sooner we leave, the sooner we arrive.', 'Càng đi sớm càng đến sớm.', 1, 'Quan hệ tỉ lệ thuận.'],
      ['Prices are getting higher and higher every year.', 'Giá cả năm nào cũng cao dần lên.', 1, 'Lặp dạng so sánh để nói tăng dần.'],
      ['English is becoming more and more important for work.', 'Tiếng Anh ngày càng quan trọng với công việc.', 1, 'Tính từ dài thì dùng "more and more".'],
      ['The more you read, better you write.', 'Càng đọc nhiều bạn càng viết tốt.', 0, 'Sai: thiếu "the" ở vế sau. Sửa thành "the better you write".'],
      ['The weather is getting more and more hot.', 'Thời tiết ngày càng nóng.', 0, 'Sai: tính từ ngắn thì lặp đuôi. Sửa thành "hotter and hotter".']
    ],
    practice: [
      ['The more you sleep, ___ (the better / better) you feel.', 'the better', 'Càng ngủ đủ bạn càng thấy khoẻ.'],
      ['The ___ (hard) you try, the more you learn.', 'harder', 'Càng cố gắng bạn càng học được nhiều.'],
      ['The city is getting ___ (crowded) and ___ (crowded).', 'more crowded … more crowded', 'Thành phố ngày càng đông đúc.'],
      ['The ___ (soon), the better.', 'sooner', 'Càng sớm càng tốt.'],
      ['The days are getting ___ (long) and ___ (long).', 'longer … longer', 'Ngày càng dài ra.'],
      ['The ___ (little) you worry, the better you sleep.', 'less', 'Càng ít lo bạn càng ngủ ngon.'],
      ['Traffic is becoming ___ (more and more) difficult in the centre.', 'more and more', 'Giao thông trong trung tâm ngày càng khó khăn.'],
      ['The ___ (much) he earns, the more he spends.', 'more', 'Anh ấy càng kiếm nhiều càng tiêu nhiều.'],
      ['Her handwriting is getting ___ (bad) and ___ (bad).', 'worse … worse', 'Chữ cô ấy ngày càng xấu.'],
      ['The ___ (early) you book, the cheaper the ticket.', 'earlier', 'Càng đặt sớm vé càng rẻ.']
    ]
  },

  {
    slug: 'adv-position-order',
    en: 'Where adverbs go in a sentence',
    vi: 'Vị trí trạng từ và trật tự cách thức – nơi chốn – thời gian',
    level: 'B1',
    summary: 'Nhiều trạng ngữ đứng cuối câu thì theo trật tự cố định cách thức – nơi chốn – thời gian, và không bao giờ chen giữa động từ với tân ngữ.',
    formula: {
      rows: [
        ['Trật tự chuẩn cuối câu', 'CÁCH THỨC – NƠI CHỐN – THỜI GIAN: She sang beautifully at the concert last night.'],
        ['Không chen giữa động từ và tân ngữ', 'Không nói "She speaks fluently English"; phải "She speaks English fluently".'],
        ['Đưa trạng ngữ thời gian lên đầu', 'Last night, she sang beautifully. — để đổi trọng tâm câu.'],
        ['Trạng từ mức độ đứng sát từ nó bổ nghĩa', 'She sang VERY beautifully. · an EXTREMELY difficult test.']
      ],
      note: 'Câu có đủ ba loại trạng ngữ mà xếp sai thứ tự thì không sai ngữ pháp nặng nhưng nghe rất vụng, và giám khảo Speaking nhận ra ngay.'
    },
    signals: ['trạng ngữ cuối câu', 'here, there, at home', 'yesterday, last night', 'quickly, carefully'],
    useWhen: [
      'Câu có nhiều thông tin phụ về cách, nơi và lúc.',
      'Kể lại sự việc trong bài Nói Part 2.',
      'Đổi trọng tâm câu bằng cách đưa trạng ngữ lên đầu.'
    ],
    useNot: [
      { what: 'Không đặt trạng từ giữa động từ và tân ngữ.', why: 'Tiếng Anh giữ động từ và tân ngữ liền nhau: "I like coffee very much", không phải "I like very much coffee".' },
      { what: 'Không xếp thời gian trước nơi chốn ở cuối câu.', why: '"We went last week to Hue" nghe vụng; đúng là "We went to Hue last week".' }
    ],
    confuse: [
      {
        with: 'Trạng từ tần suất',
        tell: 'Trạng từ tần suất đứng giữa câu (trước động từ thường); trạng từ cách thức, nơi chốn, thời gian đứng cuối câu.',
        pair: [
          { en: 'She often sings at that café.', vi: 'Cô ấy hay hát ở quán cà phê đó. (tần suất — giữa câu)' },
          { en: 'She sang beautifully at that café last night.', vi: 'Tối qua cô ấy hát rất hay ở quán cà phê đó. (cách thức – nơi – thời gian, cuối câu)' }
        ]
      }
    ],
    errors: [
      { wrong: 'He speaks very well English.', right: 'He speaks English very well.', why: 'Trạng từ không chen giữa động từ "speaks" và tân ngữ "English".' },
      { wrong: 'We went last week to Hue.', right: 'We went to Hue last week.', why: 'Nơi chốn đứng trước thời gian.' }
    ],
    examples: [
      ['She sang beautifully at the concert last night.', 'Tối qua cô ấy hát rất hay ở buổi hoà nhạc.', 1, 'Đủ ba loại, đúng thứ tự.'],
      ['The children played quietly in the garden all afternoon.', 'Bọn trẻ chơi lặng lẽ ngoài vườn suốt buổi chiều.', 1, 'Cách thức – nơi chốn – thời gian.'],
      ['Last night, she sang beautifully.', 'Tối qua cô ấy hát rất hay.', 1, 'Đưa thời gian lên đầu để đổi trọng tâm.'],
      ['He finished the report quickly this morning.', 'Sáng nay anh ấy làm xong báo cáo rất nhanh.', 1, 'Tân ngữ đứng liền động từ, trạng từ ra sau.'],
      ['He speaks very well English.', 'Anh ấy nói tiếng Anh rất giỏi.', 0, 'Sai: chen trạng từ vào giữa. Sửa thành "He speaks English very well."'],
      ['We went last week to Hue.', 'Tuần trước chúng tôi đi Huế.', 0, 'Sai thứ tự. Sửa thành "We went to Hue last week."']
    ],
    practice: [
      ['She plays the piano ___ (beautifully) every evening.', 'beautifully', 'Tối nào cô ấy cũng chơi piano rất hay.'],
      ['They arrived ___ ___ (yesterday / at the station).', 'at the station … yesterday', 'Hôm qua họ tới ga.'],
      ['He reads the news ___ (carefully) every morning.', 'carefully', 'Sáng nào anh ấy cũng đọc tin tức kỹ càng.'],
      ['We waited ___ (patiently) outside the office for an hour.', 'patiently', 'Chúng tôi kiên nhẫn đợi bên ngoài văn phòng một tiếng.'],
      ['I like this song very ___ (much).', 'much', 'Tôi rất thích bài hát này.'],
      ['She speaks Japanese ___ (fluently).', 'fluently', 'Cô ấy nói tiếng Nhật trôi chảy.'],
      ['The team worked ___ (hard) at the office last weekend.', 'hard', 'Cuối tuần trước cả đội làm việc vất vả ở văn phòng.'],
      ['He drove ___ (slowly) through the village this morning.', 'slowly', 'Sáng nay anh ấy lái xe chậm qua làng.'],
      ['They danced ___ (happily) at the wedding all night.', 'happily', 'Họ nhảy vui vẻ ở đám cưới suốt đêm.'],
      ['She answered the questions ___ (confidently) in the interview.', 'confidently', 'Cô ấy trả lời các câu hỏi tự tin trong buổi phỏng vấn.']
    ]
  },

  {
    slug: 'compound-adjective',
    en: 'Compound adjectives',
    vi: 'Tính từ ghép — "a two-hour meeting", không phải "two-hours"',
    level: 'B1',
    summary: 'Cụm số + danh từ khi làm tính từ thì có gạch nối và danh từ giữ số ÍT; trả về sau danh từ thì lại thành số nhiều bình thường.',
    formula: {
      rows: [
        ['Số + danh từ số ít + gạch nối', 'a five-YEAR-old boy · a two-HOUR meeting · a ten-MINUTE walk'],
        ['Tính từ ghép có phân từ', 'well-known · hand-made · time-consuming · English-speaking'],
        ['Chỉ gạch nối khi đứng TRƯỚC danh từ', 'a well-known writer — nhưng "The writer is well known."'],
        ['Đứng sau danh từ thì trả lại số nhiều', 'The boy is five years old. · The meeting lasted two hours.']
      ],
      note: 'Đây là chỗ sai nhiều nhất của cả nhóm: "a five-years-old boy". Khi cụm số + danh từ làm nhiệm vụ tính từ thì danh từ không được thêm -s, dù số đứng trước là bao nhiêu.'
    },
    signals: ['gạch nối giữa hai từ', 'a … -year-old', 'a … -hour', 'well-known', 'hand-made'],
    useWhen: [
      'Mô tả tuổi, thời lượng, khoảng cách gọn trong một cụm.',
      'Viết CV, mô tả công việc: a three-year contract.',
      'Viết mô tả sản phẩm: a hand-made leather bag.'
    ],
    useNot: [
      { what: 'Không thêm -s vào danh từ trong tính từ ghép.', why: '"a two-hours meeting" sai; cụm làm tính từ thì danh từ giữ số ít: "a two-hour meeting".' },
      { what: 'Không dùng gạch nối khi cụm đứng sau danh từ.', why: '"The writer is well-known" thừa gạch nối; chỉ gạch nối khi cụm đứng trước danh từ nó bổ nghĩa.' }
    ],
    confuse: [
      {
        with: 'Cụm số + danh từ đứng sau danh từ',
        tell: 'Đứng trước danh từ thì gạch nối và số ít; đứng sau thì viết rời và số nhiều bình thường.',
        pair: [
          { en: 'It was a three-hour flight.', vi: 'Đó là chuyến bay ba tiếng. (trước danh từ — gạch nối, số ít)' },
          { en: 'The flight lasted three hours.', vi: 'Chuyến bay kéo dài ba tiếng. (sau động từ — số nhiều)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She has a five-years-old son.', right: 'She has a five-year-old son.', why: 'Cụm làm tính từ nên "year" giữ số ít.' },
      { wrong: 'We had a two-hours meeting this morning.', right: 'We had a two-hour meeting this morning.', why: 'Cùng lỗi: danh từ trong tính từ ghép không thêm -s.' }
    ],
    examples: [
      ['They signed a three-year contract.', 'Họ ký hợp đồng ba năm.', 1, 'Cụm làm tính từ nên "year" số ít.'],
      ['It is only a ten-minute walk from here.', 'Đi bộ từ đây chỉ mất mười phút.', 1, 'Gạch nối và số ít.'],
      ['She is a well-known writer in Vietnam.', 'Cô ấy là nhà văn nổi tiếng ở Việt Nam.', 1, 'Tính từ ghép có gạch nối vì đứng trước danh từ.'],
      ['The writer is well known outside Vietnam too.', 'Nhà văn này cũng nổi tiếng ở ngoài Việt Nam.', 1, 'Đứng sau động từ nên viết rời, không gạch nối.'],
      ['She has a five-years-old son.', 'Cô ấy có một cậu con trai năm tuổi.', 0, 'Sai: phải là "a five-year-old son".'],
      ['We had a two-hours meeting this morning.', 'Sáng nay chúng tôi họp hai tiếng.', 0, 'Sai: phải là "a two-hour meeting".']
    ],
    practice: [
      ['They offered him a two-___ (year / years) contract.', 'year', 'Họ mời anh ấy ký hợp đồng hai năm.'],
      ['It was a four-___ (hour / hours) journey by train.', 'hour', 'Đó là chuyến tàu bốn tiếng.'],
      ['My niece is a six-___ (year / years) old girl.', 'year', 'Cháu gái tôi là một bé gái sáu tuổi.'],
      ['The hotel is a five-___ (minute / minutes) walk from the beach.', 'minute', 'Khách sạn cách bãi biển năm phút đi bộ.'],
      ['She bought a hand-___ (make / made) bag in Hoi An.', 'made', 'Cô ấy mua một chiếc túi làm thủ công ở Hội An.'],
      ['He works for an English-___ (speak / speaking) company.', 'speaking', 'Anh ấy làm cho một công ty nói tiếng Anh.'],
      ['The meeting lasted two ___ (hour / hours).', 'hours', 'Cuộc họp kéo dài hai tiếng.'],
      ['My son is seven ___ (year / years) old.', 'years', 'Con trai tôi bảy tuổi.'],
      ['It is a time-___ (consume / consuming) process.', 'consuming', 'Đó là một quy trình tốn thời gian.'],
      ['They live in a three-___ (bedroom / bedrooms) flat.', 'bedroom', 'Họ sống trong căn hộ ba phòng ngủ.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'adjadv',
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
