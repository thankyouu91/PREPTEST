/**
 * Ngữ pháp — nhóm ĐỘNG TỪ KHUYẾT THIẾU, phần bậc A1 đến B1.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 29 điểm
 * (A1 ×3, A2 ×5, B1 ×6, B2 ×6, C1 ×5, C2 ×4). Tệp này soạn 14 điểm của A1, A2
 * và B1; 15 điểm bậc B2–C2 tách thành mục riêng trong hàng đợi.
 *
 * Vì sao nhóm này khó với người Việt: động từ khuyết thiếu không chia theo ngôi,
 * không đi với "to", và quan trọng nhất là chúng diễn đạt THÁI ĐỘ của người nói
 * chứ không phải sự việc. Tiếng Việt dùng trợ từ tình thái rời rạc (chắc, có lẽ,
 * phải, nên) nên người học hay ghép một-đối-một rồi sai sắc thái. Cặp sai nhiều
 * nhất là "mustn't" với "don't have to": tiếng Việt đều dịch quanh chữ "không
 * phải" nhưng một bên là CẤM, một bên là KHÔNG CẦN.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A1 ==================== */

  {
    slug: 'can-ability',
    en: 'can / cannot for ability',
    vi: 'can · cannot — khả năng',
    level: 'A1',
    summary: 'Nói làm được hay không làm được việc gì. Sau can luôn là động từ nguyên thể, không "to", không thêm -s.',
    formula: {
      rows: [
        ['Khẳng định', 'S + can + V(nguyên thể)'],
        ['Phủ định', "S + cannot / can't + V"],
        ['Nghi vấn', 'Can + S + V?'],
        ['Trả lời ngắn', 'Yes, I can. / No, I cannot.']
      ],
      note: 'can không đổi theo ngôi: I can, he can, they can. Viết liền "cannot" hoặc rút gọn "can\'t"; dạng "can not" tách rời rất hiếm và chỉ dùng khi muốn nhấn.'
    },
    signals: ['can', "can't", 'cannot', 'be able to', 'know how to'],
    useWhen: [
      'Nói về khả năng hoặc kỹ năng ở hiện tại.',
      'Nói việc gì đó có thể xảy ra theo lẽ thường: "It can get very cold here in January."',
      'Nói về giác quan đang cảm nhận: "I can hear something."'
    ],
    useNot: [
      { what: 'Không thêm -s ở ngôi thứ ba.', why: '"He cans swim" luôn sai; động từ khuyết thiếu giữ nguyên với mọi ngôi.' },
      { what: 'Không thêm "to" sau can.', why: '"I can to swim" sai; sau can là động từ nguyên thể trần.' }
    ],
    confuse: [
      {
        with: 'be able to',
        tell: 'Hai cái gần nghĩa ở hiện tại, nhưng "can" không chia được ở mọi thì nên chỗ nào can bí thì mượn "be able to".',
        pair: [
          { en: 'She can drive.', vi: 'Cô ấy biết lái xe. (hiện tại, tự nhiên nhất)' },
          { en: 'She will be able to drive next year.', vi: 'Sang năm cô ấy sẽ lái được xe. (không nói "will can")' }
        ]
      }
    ],
    errors: [
      { wrong: 'He cans play the guitar.', right: 'He can play the guitar.', why: 'Động từ khuyết thiếu không chia theo ngôi, không thêm -s.' },
      { wrong: 'I can to speak English.', right: 'I can speak English.', why: 'Sau can là động từ nguyên thể trần, không có "to".' }
    ],
    examples: [
      ['I can swim, but I cannot dive.', 'Tôi biết bơi nhưng không biết lặn.', 1, 'Khẳng định và phủ định trong một câu.'],
      ['Can you play the piano?', 'Bạn biết chơi piano không?', 1, 'Nghi vấn: đảo can lên trước chủ ngữ.'],
      ['My sister can speak three languages.', 'Chị tôi nói được ba thứ tiếng.', 1, 'Ngôi thứ ba vẫn là "can", không thêm -s.'],
      ['I can hear the rain outside.', 'Tôi nghe thấy tiếng mưa bên ngoài.', 1, 'Dùng với động từ chỉ giác quan.'],
      ['He cans play the guitar.', 'Anh ấy biết chơi ghi-ta.', 0, 'Sai: sửa thành "He can play the guitar."'],
      ['I can to speak English a little.', 'Tôi nói được một chút tiếng Anh.', 0, 'Sai: bỏ "to". Sửa thành "I can speak English a little."']
    ],
    practice: [
      ['She ___ (can / cans) ride a motorbike.', 'can', 'Cô ấy biết đi xe máy.'],
      ['I ___ (can / can to) cook Vietnamese food.', 'can', 'Tôi biết nấu món Việt.'],
      ['___ (Can / Do) you help me with this box?', 'Can', 'Bạn khiêng giúp tôi cái thùng này được không?'],
      ['They ___ (cannot / do not can) come tonight.', 'cannot', 'Tối nay họ không tới được.'],
      ['My brother ___ (can / cans) speak Japanese.', 'can', 'Anh trai tôi nói được tiếng Nhật.'],
      ['___ (Can / Are) you see the board from there?', 'Can', 'Bạn nhìn thấy bảng từ chỗ đó không?'],
      ['We ___ (can / can to) meet at six.', 'can', 'Chúng ta gặp nhau lúc sáu giờ được đấy.'],
      ['He ___ (cannot / cans not) drive yet.', 'cannot', 'Anh ấy chưa lái xe được.'],
      ['___ (Can / Does) she swim well?', 'Can', 'Cô ấy bơi giỏi không?'],
      ['I ___ (can / am can) hear you clearly.', 'can', 'Tôi nghe bạn rõ lắm.']
    ]
  },

  {
    slug: 'can-could-permission',
    en: 'can / could for permission and requests',
    vi: 'can · could — xin phép và nhờ vả',
    level: 'A1',
    summary: 'Cùng nghĩa xin phép, nhưng could lịch sự hơn can. Ở đây could KHÔNG mang nghĩa quá khứ.',
    formula: {
      rows: [
        ['Xin phép', 'Can I …? · Could I …? · May I …?'],
        ['Nhờ người khác', 'Can you …? · Could you …?'],
        ['Cho phép', 'You can … · You may …'],
        ['Từ chối', "Sorry, you can't. · I'm afraid not."]
      ],
      note: 'Thang lịch sự tăng dần: Can I → Could I → May I. Thêm "please" và "possibly" thì lịch sự hơn nữa: "Could you possibly help me?"'
    },
    signals: ['Can I', 'Could I', 'May I', 'Could you', 'please'],
    useWhen: [
      'Xin phép làm gì đó.',
      'Nhờ người khác làm giúp.',
      'Cho phép hoặc từ chối cho phép.',
      'Mời chào trong quán, cửa hàng: "Can I take your order?"'
    ],
    useNot: [
      { what: 'Không hiểu "could" ở đây là quá khứ.', why: '"Could you open the window?" là nhờ vả ở hiện tại, không phải hỏi chuyện đã qua.' },
      { what: 'Không dùng "Can I…?" khi cần rất trang trọng.', why: 'Với người lạ hoặc cấp trên thì "Could I…?" hoặc "May I…?" hợp hơn.' }
    ],
    confuse: [
      {
        with: 'Can I và Can you',
        tell: '"Can I" là tôi xin làm; "Can you" là nhờ bạn làm. Lẫn hai cái là đổi hẳn người thực hiện.',
        pair: [
          { en: 'Can I open the window?', vi: 'Tôi mở cửa sổ được không? (tôi làm)' },
          { en: 'Can you open the window?', vi: 'Bạn mở cửa sổ giúp được không? (bạn làm)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Can I to use your phone?', right: 'Can I use your phone?', why: 'Sau can không có "to".' },
      { wrong: 'Could you helped me?', right: 'Could you help me?', why: 'Sau could là động từ nguyên thể; "could" ở đây là lịch sự, không phải quá khứ.' }
    ],
    examples: [
      ['Can I sit here?', 'Tôi ngồi đây được không?', 1, 'Xin phép, thân mật.'],
      ['Could I have the bill, please?', 'Cho tôi xin hoá đơn được không ạ?', 1, 'Xin phép, lịch sự hơn.'],
      ['Could you speak more slowly, please?', 'Bạn nói chậm lại giúp được không?', 1, 'Nhờ vả lịch sự.'],
      ['You can leave your bag here.', 'Bạn để túi ở đây cũng được.', 1, 'Cho phép.'],
      ['Can I to use your phone?', 'Tôi dùng nhờ điện thoại được không?', 0, 'Sai: bỏ "to". Sửa thành "Can I use your phone?"'],
      ['Could you helped me with this?', 'Bạn giúp tôi cái này được không?', 0, 'Sai: sau could là nguyên thể. Sửa thành "Could you help me with this?"']
    ],
    practice: [
      ['___ (Can I / Can you) borrow your pen?', 'Can I', 'Tôi mượn bút của bạn được không?'],
      ['___ (Can I / Can you) pass me the salt?', 'Can you', 'Bạn đưa giúp tôi lọ muối được không?'],
      ['Could I ___ (have / to have) a glass of water?', 'have', 'Cho tôi xin một ly nước được không?'],
      ['___ (Could / Do) you repeat that, please?', 'Could', 'Bạn nhắc lại giúp được không?'],
      ['You ___ (can / can to) park over there.', 'can', 'Bạn đỗ xe đằng kia được.'],
      ['___ (May / Do) I come in?', 'May', 'Tôi vào được không ạ?'],
      ['Could you ___ (open / opened) the door for me?', 'open', 'Bạn mở cửa giúp tôi được không?'],
      ['___ (Can I / Can you) take a photo here?', 'Can I', 'Tôi chụp ảnh ở đây được không?'],
      ['Sorry, you ___ (cannot / do not can) smoke inside.', 'cannot', 'Xin lỗi, bên trong không được hút thuốc.'],
      ['___ (Could / Would) you possibly check this again?', 'Could', 'Bạn kiểm tra lại giúp cái này được không?']
    ]
  },

  {
    slug: 'must-mustnt',
    en: "must / mustn't",
    vi: "must · mustn't — bắt buộc và cấm",
    level: 'A1',
    summary: "must là bắt buộc, mustn't là CẤM chứ không phải \"không bắt buộc\". Nhầm chỗ này là đổi hẳn nghĩa câu.",
    formula: {
      rows: [
        ['Bắt buộc', 'S + must + V(nguyên thể)'],
        ['Cấm', "S + must not / mustn't + V"],
        ['Nghi vấn', 'Must + S + V? (ít dùng, thường thay bằng "Do I have to…?")'],
        ['Không có thì khác', 'must chỉ dùng ở hiện tại; quá khứ mượn "had to"']
      ],
      note: "mustn't KHÔNG phải phủ định của must theo nghĩa \"không cần\". \"You mustn't go\" là cấm đi; muốn nói không cần đi thì là \"You don't have to go\"."
    },
    signals: ['must', "mustn't", 'must not', 'rule', 'It is forbidden'],
    useWhen: [
      'Nói một việc bắt buộc, thường do chính người nói thấy cần thiết.',
      'Viết nội quy và biển báo: "Passengers must wear a seatbelt."',
      'Nhấn mạnh lời khuyên rất mạnh: "You must see this film."'
    ],
    useNot: [
      { what: "Không dùng mustn't khi ý là \"không cần\".", why: "mustn't là cấm. Không cần thì dùng \"don't have to\" hoặc \"needn't\"." },
      { what: 'Không dùng must cho quá khứ.', why: '"I must go yesterday" sai; phải là "I had to go yesterday".' },
      { what: 'Không thêm "to".', why: '"must to go" sai; chỉ "have to" và "ought to" mới có "to".' }
    ],
    confuse: [
      {
        with: "don't have to",
        tell: 'Đây là cặp bị nhầm nhiều nhất cả nhóm, vì tiếng Việt đều dịch quanh chữ "không phải".',
        pair: [
          { en: "You mustn't tell anyone.", vi: 'Bạn không được nói với ai. (CẤM)' },
          { en: "You don't have to tell anyone.", vi: 'Bạn không nhất thiết phải nói với ai. (KHÔNG CẦN, nói cũng được)' }
        ]
      }
    ],
    errors: [
      { wrong: "You mustn't pay — it is free.", right: "You don't have to pay — it is free.", why: 'Ý là không cần trả tiền, không phải cấm trả tiền.' },
      { wrong: 'I must to finish this today.', right: 'I must finish this today.', why: 'Sau must không có "to".' }
    ],
    examples: [
      ['You must wear a helmet.', 'Bạn phải đội mũ bảo hiểm.', 1, 'Bắt buộc.'],
      ["You mustn't park here.", 'Bạn không được đỗ xe ở đây.', 1, 'Cấm.'],
      ['Students must arrive before eight.', 'Học sinh phải có mặt trước tám giờ.', 1, 'Nội quy.'],
      ['I must call my mother tonight.', 'Tối nay tôi phải gọi cho mẹ.', 1, 'Tự thấy cần thiết.'],
      ["You mustn't pay — it is free.", 'Bạn không cần trả tiền, cái này miễn phí.', 0, 'Sai nghĩa: sửa thành "You don\'t have to pay".'],
      ['I must to finish this today.', 'Hôm nay tôi phải làm xong cái này.', 0, 'Sai: bỏ "to". Sửa thành "I must finish this today."']
    ],
    practice: [
      ['You ___ (must / must to) show your ID at the gate.', 'must', 'Bạn phải xuất trình giấy tờ ở cổng.'],
      ["Visitors ___ (mustn't / don't have to) touch the exhibits.", "mustn't", 'Khách tham quan không được sờ vào hiện vật.'],
      ["It's Sunday — you ___ (mustn't / don't have to) get up early.", "don't have to", 'Chủ nhật rồi, bạn không cần dậy sớm.'],
      ['I ___ (must / had to) go to the hospital yesterday.', 'had to', 'Hôm qua tôi phải vào bệnh viện.'],
      ['Drivers ___ (must / must to) stop at a red light.', 'must', 'Người lái xe phải dừng khi đèn đỏ.'],
      ["You ___ (mustn't / don't have to) smoke in here.", "mustn't", 'Trong này không được hút thuốc.'],
      ['We ___ (must / musts) be quiet in the library.', 'must', 'Trong thư viện chúng ta phải giữ yên lặng.'],
      ["The test is optional — you ___ (mustn't / don't have to) take it.", "don't have to", 'Bài kiểm tra là tự nguyện, bạn không nhất thiết phải làm.'],
      ['You ___ (must / must to) try this cake.', 'must', 'Bạn phải thử cái bánh này mới được.'],
      ["Children ___ (mustn't / don't have to) play near the road.", "mustn't", 'Trẻ em không được chơi gần đường.']
    ]
  },

  /* ==================== A2 ==================== */

  {
    slug: 'have-to',
    en: "have to / don't have to",
    vi: "have to · don't have to",
    level: 'A2',
    summary: 'Bắt buộc đến từ bên ngoài: luật lệ, lịch trình, sếp. Khác must ở chỗ have to chia được theo ngôi và theo thì.',
    formula: {
      rows: [
        ['Khẳng định', 'S + have/has to + V'],
        ['Phủ định', "S + don't/doesn't have to + V (= không cần)"],
        ['Nghi vấn', 'Do/Does + S + have to + V?'],
        ['Quá khứ và tương lai', 'had to · will have to']
      ],
      note: 'have to là động từ thường nên cần trợ động từ do/does/did khi phủ định và nghi vấn. Đây cũng là cách nói bắt buộc ở quá khứ và tương lai, chỗ mà must không dùng được.'
    },
    signals: ['have to', 'has to', 'had to', "don't have to", 'will have to'],
    useWhen: [
      'Bắt buộc do quy định, hoàn cảnh hay người khác đặt ra.',
      'Nói bắt buộc ở quá khứ hoặc tương lai, chỗ must không có dạng.',
      "Nói không cần thiết: \"You don't have to come early.\""
    ],
    useNot: [
      { what: 'Không quên trợ động từ khi phủ định và nghi vấn.', why: '"You not have to go" và "Have you to go?" đều sai; phải là "don\'t have to" và "Do you have to…?"' },
      { what: "Không dùng don't have to khi ý là cấm.", why: "Cấm thì dùng mustn't hoặc \"be not allowed to\"." }
    ],
    confuse: [
      {
        with: 'must',
        tell: 'must thiên về người nói tự thấy cần; have to thiên về sức ép từ bên ngoài. Nhiều câu dùng cả hai được, nhưng sắc thái khác nhau.',
        pair: [
          { en: 'I must lose some weight.', vi: 'Tôi phải giảm cân thôi. (tự tôi thấy vậy)' },
          { en: 'I have to wear a uniform at work.', vi: 'Ở chỗ làm tôi phải mặc đồng phục. (công ty quy định)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She have to work on Saturday.', right: 'She has to work on Saturday.', why: 'have to là động từ thường nên phải chia theo ngôi.' },
      { wrong: 'Have you to pay in cash?', right: 'Do you have to pay in cash?', why: 'Nghi vấn của have to cần trợ động từ "do".' }
    ],
    examples: [
      ['I have to get up at five every day.', 'Ngày nào tôi cũng phải dậy lúc năm giờ.', 1, 'Bắt buộc do hoàn cảnh.'],
      ['She has to wear a uniform at work.', 'Ở chỗ làm cô ấy phải mặc đồng phục.', 1, 'Ngôi thứ ba nên là "has to".'],
      ["We don't have to book in advance.", 'Chúng ta không cần đặt trước.', 1, 'Phủ định nghĩa là không cần.'],
      ['Do you have to work this weekend?', 'Cuối tuần này bạn có phải làm không?', 1, 'Nghi vấn với trợ động từ "do".'],
      ['She have to work on Saturday.', 'Thứ Bảy cô ấy phải làm việc.', 0, 'Sai: sửa thành "She has to work on Saturday."'],
      ['Have you to pay in cash?', 'Bạn có phải trả tiền mặt không?', 0, 'Sai: sửa thành "Do you have to pay in cash?"']
    ],
    practice: [
      ['He ___ (have to / has to) leave at seven.', 'has to', 'Anh ấy phải đi lúc bảy giờ.'],
      ['___ (Do you have to / Have you to) wear a tie?', 'Do you have to', 'Bạn có phải đeo cà vạt không?'],
      ['We ___ (had to / must) cancel the trip last week.', 'had to', 'Tuần trước chúng tôi đã phải huỷ chuyến đi.'],
      ["You ___ (don't have to / mustn't) bring anything — just come.", "don't have to", 'Bạn không cần mang gì cả, cứ tới thôi.'],
      ['She ___ (will have to / will must) retake the exam.', 'will have to', 'Cô ấy sẽ phải thi lại.'],
      ['___ (Does he have to / Has he to) sign the form?', 'Does he have to', 'Anh ấy có phải ký vào đơn không?'],
      ['I ___ (have to / has to) finish this report today.', 'have to', 'Hôm nay tôi phải làm xong báo cáo này.'],
      ["They ___ (didn't have to / mustn't) pay for parking.", "didn't have to", 'Họ không phải trả tiền gửi xe.'],
      ['Students ___ (have to / have) submit the essay online.', 'have to', 'Sinh viên phải nộp bài luận trực tuyến.'],
      ['___ (Did you have to / Must you) wait long?', 'Did you have to', 'Bạn có phải đợi lâu không?']
    ]
  },

  {
    slug: 'should-advice',
    en: "should / shouldn't for advice",
    vi: "should · shouldn't — lời khuyên",
    level: 'A2',
    summary: 'Khuyên nên hay không nên. Nhẹ hơn must nhiều: đây là ý kiến, không phải bắt buộc.',
    formula: {
      rows: [
        ['Khẳng định', 'S + should + V(nguyên thể)'],
        ['Phủ định', "S + should not / shouldn't + V"],
        ['Nghi vấn', 'Should + S + V?'],
        ['Xin lời khuyên', 'What should I do?']
      ],
      note: 'should cũng dùng để nói điều được kỳ vọng sẽ xảy ra: "The train should arrive at six" (theo lịch thì đúng sáu giờ).'
    },
    signals: ['should', "shouldn't", 'I think you should', 'What should I do'],
    useWhen: [
      'Đưa lời khuyên hoặc nêu ý kiến về điều nên làm.',
      'Xin lời khuyên từ người khác.',
      'Nói điều được kỳ vọng sẽ xảy ra theo lẽ thường.'
    ],
    useNot: [
      { what: 'Không dùng should khi việc là bắt buộc.', why: 'Luật lệ thì dùng must hoặc have to: "You must wear a seatbelt", không phải "should".' },
      { what: 'Không thêm "to".', why: '"You should to rest" sai; sau should là nguyên thể trần.' }
    ],
    confuse: [
      {
        with: 'must',
        tell: 'should là lời khuyên, có thể không nghe theo; must là bắt buộc.',
        pair: [
          { en: 'You should see a doctor.', vi: 'Bạn nên đi khám. (khuyên)' },
          { en: 'You must see a doctor immediately.', vi: 'Bạn phải đi khám ngay. (không có lựa chọn)' }
        ]
      }
    ],
    errors: [
      { wrong: 'You should to take a rest.', right: 'You should take a rest.', why: 'Sau should không có "to".' },
      { wrong: 'What I should do?', right: 'What should I do?', why: 'Câu hỏi phải đảo should lên trước chủ ngữ.' }
    ],
    examples: [
      ['You should drink more water.', 'Bạn nên uống nhiều nước hơn.', 1, 'Lời khuyên.'],
      ["You shouldn't eat so late at night.", 'Bạn không nên ăn khuya thế.', 1, 'Khuyên không nên.'],
      ['Should I bring an umbrella?', 'Tôi có nên mang ô không?', 1, 'Xin lời khuyên.'],
      ['The parcel should arrive tomorrow.', 'Kiện hàng chắc mai tới.', 1, 'Điều được kỳ vọng theo lẽ thường.'],
      ['You should to take a rest.', 'Bạn nên nghỉ ngơi.', 0, 'Sai: bỏ "to". Sửa thành "You should take a rest."'],
      ['What I should do now?', 'Giờ tôi nên làm gì?', 0, 'Sai trật tự. Sửa thành "What should I do now?"']
    ],
    practice: [
      ['You ___ (should / should to) apologise to her.', 'should', 'Bạn nên xin lỗi cô ấy.'],
      ["He ___ (shouldn't / doesn't should) drive so fast.", "shouldn't", 'Anh ấy không nên lái nhanh thế.'],
      ['___ (Should I / I should) call him now?', 'Should I', 'Tôi có nên gọi cho anh ấy bây giờ không?'],
      ['You ___ (should / must) wear a seatbelt — it is the law.', 'must', 'Bạn phải thắt dây an toàn, đó là luật.'],
      ['We ___ (should / shoulds) leave earlier next time.', 'should', 'Lần sau chúng ta nên đi sớm hơn.'],
      ['What ___ (should we / we should) do about this?', 'should we', 'Chúng ta nên làm gì với chuyện này?'],
      ['The bus ___ (should / must) be here in five minutes.', 'should', 'Chắc năm phút nữa xe buýt tới.'],
      ["You ___ (shouldn't / mustn't) worry too much.", "shouldn't", 'Bạn không nên lo lắng quá.'],
      ['___ (Should / Do) I book a table?', 'Should', 'Tôi có nên đặt bàn không?'],
      ['She ___ (should / should to) study harder.', 'should', 'Cô ấy nên học chăm hơn.']
    ]
  },

  {
    slug: 'may-might-possibility',
    en: 'may / might for possibility',
    vi: 'may · might — có thể xảy ra',
    level: 'A2',
    summary: 'Nói việc gì đó có thể xảy ra nhưng không chắc. might hơi kém chắc hơn may một chút.',
    formula: {
      rows: [
        ['Khẳng định', 'S + may/might + V(nguyên thể)'],
        ['Phủ định', 'S + may not / might not + V'],
        ['Độ chắc', 'will (chắc) > may (có thể) > might (có lẽ) > could (biết đâu)'],
        ['Không rút gọn', '"mayn\'t" gần như không dùng; "mightn\'t" hiếm']
      ],
      note: 'Phân biệt "may be" (hai chữ, động từ khuyết thiếu + be) với "maybe" (một chữ, trạng từ đứng đầu câu): "She may be late" khác "Maybe she is late".'
    },
    signals: ['may', 'might', 'perhaps', 'maybe', 'possibly', 'It is possible that'],
    useWhen: [
      'Nói khả năng xảy ra trong hiện tại hoặc tương lai, không chắc chắn.',
      'Nói nhẹ đi để tránh khẳng định quá mạnh trong văn viết học thuật.',
      'may còn dùng để xin phép trang trọng: "May I come in?"'
    ],
    useNot: [
      { what: 'Không dùng may/might để hỏi khả năng.', why: 'Không hỏi "May it rain?"; dùng "Do you think it will rain?" hoặc "Is it likely to rain?"' },
      { what: 'Không viết liền "maybe" khi ý là động từ.', why: '"She maybe late" sai; phải là "She may be late".' }
    ],
    confuse: [
      {
        with: 'may be và maybe',
        tell: 'Hai chữ rời là động từ khuyết thiếu + be, đứng sau chủ ngữ. Một chữ là trạng từ, thường đứng đầu câu.',
        pair: [
          { en: 'He may be at home now.', vi: 'Giờ chắc anh ấy đang ở nhà.' },
          { en: 'Maybe he is at home now.', vi: 'Có lẽ giờ anh ấy đang ở nhà.' }
        ]
      }
    ],
    errors: [
      { wrong: 'She maybe come tomorrow.', right: 'She may come tomorrow.', why: '"maybe" là trạng từ, không thay được động từ khuyết thiếu.' },
      { wrong: 'It might to rain later.', right: 'It might rain later.', why: 'Sau might không có "to".' }
    ],
    examples: [
      ['It may rain this afternoon.', 'Chiều nay có thể mưa.', 1, 'Khả năng trong tương lai gần.'],
      ['She might not come to the party.', 'Có lẽ cô ấy không tới bữa tiệc.', 1, 'Phủ định, độ chắc thấp.'],
      ['He may be in a meeting right now.', 'Giờ chắc anh ấy đang họp.', 1, '"may be" hai chữ.'],
      ['May I ask a question?', 'Tôi hỏi một câu được không ạ?', 1, 'may dùng xin phép trang trọng.'],
      ['She maybe come tomorrow.', 'Có lẽ mai cô ấy tới.', 0, 'Sai: sửa thành "She may come tomorrow."'],
      ['It might to rain later.', 'Lát nữa có thể mưa.', 0, 'Sai: bỏ "to". Sửa thành "It might rain later."']
    ],
    practice: [
      ['It ___ (may / maybe) snow tonight.', 'may', 'Tối nay có thể có tuyết.'],
      ['___ (Maybe / May be) she forgot the meeting.', 'Maybe', 'Có lẽ cô ấy quên buổi họp.'],
      ['He ___ (may be / maybe) on his way already.', 'may be', 'Chắc anh ấy đang trên đường rồi.'],
      ['They ___ (might / might to) arrive late.', 'might', 'Có lẽ họ sẽ tới muộn.'],
      ['___ (May / Can) I use your laptop, please?', 'May', 'Tôi dùng nhờ máy tính của bạn được không ạ?'],
      ['I ___ (may not / not may) be able to join.', 'may not', 'Có thể tôi không tham gia được.'],
      ['The results ___ (might / must) be delayed.', 'might', 'Kết quả có thể bị chậm.'],
      ['She ___ (may / may to) know the answer.', 'may', 'Có thể cô ấy biết câu trả lời.'],
      ['It ___ (might / maybe) be cheaper online.', 'might', 'Mua trên mạng có khi rẻ hơn.'],
      ['We ___ (may not / mayn\'t) have enough time.', 'may not', 'Có thể chúng ta không đủ thời gian.']
    ]
  },

  {
    slug: 'would-like',
    en: 'would like / Would you like…?',
    vi: 'would like — mời và ngỏ ý lịch sự',
    level: 'A2',
    summary: 'Cách lịch sự để nói mình muốn gì và để mời người khác. Lịch sự hơn "want" rất nhiều.',
    formula: {
      rows: [
        ['Muốn một vật', "I'd like + danh từ: I'd like a coffee."],
        ['Muốn làm gì', "I'd like + to + V: I'd like to book a table."],
        ['Mời', 'Would you like + danh từ / to + V?'],
        ['Trả lời', "Yes, please. · No, thank you. · I'd love to."]
      ],
      note: 'Khác với các động từ khuyết thiếu khác, "would like" LUÔN đi với "to" khi theo sau là động từ. Rút gọn: I would → I\'d.'
    },
    signals: ["would like", "'d like", 'Would you like', 'please', "I'd love to"],
    useWhen: [
      'Gọi món, mua hàng, đặt chỗ.',
      'Mời người khác một cách lịch sự.',
      'Nói nguyện vọng nhẹ nhàng thay cho "I want".'
    ],
    useNot: [
      { what: 'Không bỏ "to" trước động từ.', why: '"I would like go" sai; phải là "I would like to go".' },
      { what: 'Không dùng "want" khi cần lịch sự.', why: '"I want a coffee" nghe cộc; trong quán nên nói "I\'d like a coffee, please".' },
      { what: 'Không nhầm với "like" thường.', why: '"Do you like coffee?" là hỏi sở thích chung; "Would you like a coffee?" là mời uống ngay bây giờ.' }
    ],
    confuse: [
      {
        with: 'Do you like và Would you like',
        tell: 'Hỏi sở thích lâu dài dùng "Do you like"; mời ngay lúc này dùng "Would you like".',
        pair: [
          { en: 'Do you like tea?', vi: 'Bạn có thích trà không? (nói chung)' },
          { en: 'Would you like some tea?', vi: 'Bạn dùng chút trà nhé? (mời bây giờ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I would like go home now.', right: 'I would like to go home now.', why: '"would like" đi với "to" trước động từ.' },
      { wrong: 'Do you like a sandwich? I made some.', right: 'Would you like a sandwich? I made some.', why: 'Đang mời ngay bây giờ nên dùng "Would you like".' }
    ],
    examples: [
      ["I'd like a table for two, please.", 'Cho tôi bàn cho hai người ạ.', 1, 'would like + danh từ.'],
      ["I'd like to speak to the manager.", 'Tôi muốn nói chuyện với quản lý.', 1, 'would like + to + động từ.'],
      ['Would you like some dessert?', 'Bạn dùng chút tráng miệng nhé?', 1, 'Lời mời.'],
      ['Would you like to join us for dinner?', 'Bạn ăn tối cùng chúng tôi nhé?', 1, 'Mời làm gì đó.'],
      ['I would like go home now.', 'Giờ tôi muốn về nhà.', 0, 'Sai: thiếu "to". Sửa thành "I would like to go home now."'],
      ['Do you like a coffee? I am making one.', 'Bạn uống cà phê nhé? Tôi đang pha đây.', 0, 'Sai sắc thái: đang mời nên dùng "Would you like a coffee?"']
    ],
    practice: [
      ["I'd like ___ (to book / book) a room for two nights.", 'to book', 'Tôi muốn đặt phòng hai đêm.'],
      ['___ (Would you like / Do you like) some water?', 'Would you like', 'Bạn dùng chút nước nhé?'],
      ['___ (Do you like / Would you like) Vietnamese food in general?', 'Do you like', 'Nói chung bạn có thích món Việt không?'],
      ["She ___ (would like / would likes) to study abroad.", 'would like', 'Cô ấy muốn đi du học.'],
      ["We'd like ___ (to pay / pay) by card, please.", 'to pay', 'Chúng tôi muốn thanh toán bằng thẻ.'],
      ['Would you like ___ (to sit / sit) here?', 'to sit', 'Bạn ngồi đây nhé?'],
      ["I ___ ('d like / like) two tickets, please.", "'d like", 'Cho tôi hai vé ạ.'],
      ['___ (Would / Do) you like to leave a message?', 'Would', 'Bạn có muốn để lại lời nhắn không?'],
      ["He'd like ___ (to change / change) his appointment.", 'to change', 'Anh ấy muốn đổi lịch hẹn.'],
      ["___ (Would you like / Do you want) another slice? — Yes, please.", 'Would you like', 'Bạn dùng thêm một miếng nữa nhé? — Vâng ạ.']
    ]
  },

  {
    slug: 'could-past-ability',
    en: 'could / was able to for past ability',
    vi: 'could · was able to — khả năng trong quá khứ',
    level: 'A2',
    summary: 'could nói khả năng chung thời trước; was able to nói làm được một việc cụ thể trong một lần cụ thể.',
    formula: {
      rows: [
        ['Khả năng chung', 'could + V: "I could swim at five."'],
        ['Một lần cụ thể làm được', 'was/were able to + V: "I was able to fix it yesterday."'],
        ['Phủ định', "couldn't dùng được cho cả hai trường hợp"],
        ['Có gắng sức', 'managed to + V nhấn là khó mà vẫn làm được']
      ],
      note: 'Ở câu phủ định, "couldn\'t" dùng thoải mái cho cả khả năng chung lẫn một lần cụ thể — phân biệt trên chỉ chặt ở câu khẳng định.'
    },
    signals: ['could', "couldn't", 'was able to', 'were able to', 'managed to'],
    useWhen: [
      'could: kỹ năng hoặc khả năng kéo dài trong quá khứ.',
      'was/were able to: một lần cụ thể đã thực hiện thành công.',
      'managed to: nhấn rằng việc đó khó nhưng vẫn xong.',
      "couldn't: không làm được, dùng cho cả hai kiểu."
    ],
    useNot: [
      { what: 'Không dùng could cho một lần thành công cụ thể.', why: '"The building was on fire but we could escape" nghe sai; phải là "we were able to escape" hoặc "we managed to escape".' },
      { what: 'Không thêm "to" sau could.', why: '"I could to run fast" sai.' }
    ],
    confuse: [
      {
        with: 'could và was able to',
        tell: 'Khả năng kéo dài thì could; một lần cụ thể xong việc thì was able to.',
        pair: [
          { en: 'She could play the violin when she was six.', vi: 'Sáu tuổi cô ấy đã chơi được violin. (khả năng chung)' },
          { en: 'She was able to finish the piece last night.', vi: 'Tối qua cô ấy chơi trọn được bản nhạc đó. (một lần cụ thể)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The traffic was terrible, but I could arrive on time.', right: 'The traffic was terrible, but I was able to arrive on time.', why: 'Một lần cụ thể làm được thì dùng "was able to" hoặc "managed to".' },
      { wrong: 'When I was young I can run fast.', right: 'When I was young I could run fast.', why: 'Nói quá khứ thì can đổi thành could.' }
    ],
    examples: [
      ['I could read before I started school.', 'Tôi biết đọc từ trước khi đi học.', 1, 'Khả năng kéo dài trong quá khứ.'],
      ['We were able to book the last two seats.', 'Chúng tôi đặt được hai ghế cuối cùng.', 1, 'Một lần cụ thể thành công.'],
      ['She managed to finish the report on time.', 'Cô ấy xoay xở nộp báo cáo kịp giờ.', 1, 'Nhấn là khó nhưng vẫn xong.'],
      ["I couldn't find my keys this morning.", 'Sáng nay tôi không tìm thấy chìa khoá.', 1, 'Phủ định dùng được cho một lần cụ thể.'],
      ['The traffic was terrible, but I could arrive on time.', 'Đường tắc lắm nhưng tôi vẫn tới kịp.', 0, 'Sai: sửa thành "I was able to arrive on time."'],
      ['When I was young I can run very fast.', 'Hồi trẻ tôi chạy rất nhanh.', 0, 'Sai: quá khứ dùng "could". Sửa thành "I could run very fast."']
    ],
    practice: [
      ['At the age of four she ___ (could / was able to) already read.', 'could', 'Bốn tuổi cô bé đã biết đọc.'],
      ['It was hard, but we ___ (could / were able to) repair the engine.', 'were able to', 'Khó lắm nhưng chúng tôi sửa được cái máy.'],
      ['I ___ (couldn\'t / wasn\'t able) see anything in the dark.', "couldn't", 'Trong bóng tối tôi chẳng nhìn thấy gì.'],
      ['My grandfather ___ (could / was able to) speak four languages.', 'could', 'Ông tôi nói được bốn thứ tiếng.'],
      ['She ___ (managed to / could) catch the last bus.', 'managed to', 'Cô ấy kịp bắt chuyến xe buýt cuối.'],
      ['We ___ (could / were able to) get tickets even though it was sold out.', 'were able to', 'Dù hết vé chúng tôi vẫn mua được.'],
      ['When I was ten I ___ (could / can) climb that tree.', 'could', 'Hồi mười tuổi tôi trèo được cái cây đó.'],
      ['They ___ (couldn\'t / could not to) open the door.', "couldn't", 'Họ không mở được cửa.'],
      ['After three attempts he ___ (was able to / could) pass the test.', 'was able to', 'Sau ba lần thi anh ấy mới đỗ.'],
      ['I ___ (could / could to) swim before I could walk.', 'could', 'Tôi biết bơi trước cả khi biết đi.']
    ]
  },

  /* ==================== B1 ==================== */

  {
    slug: 'must-vs-have-to',
    en: 'must vs have to',
    vi: 'must khác have to ở chỗ nào',
    level: 'B1',
    summary: 'Cùng nghĩa bắt buộc nhưng khác nguồn gốc, và quan trọng hơn là hai dạng phủ định của chúng nghĩa ngược nhau hoàn toàn.',
    formula: {
      rows: [
        ['must', 'bắt buộc từ bên trong: người nói tự thấy cần'],
        ['have to', 'bắt buộc từ bên ngoài: luật, quy định, người khác'],
        ["mustn't", 'CẤM — không được làm'],
        ["don't have to", 'KHÔNG CẦN — làm hay không tuỳ']
      ],
      note: 'must không có dạng quá khứ và tương lai, nên mọi thì khác đều mượn have to: had to, will have to, have had to.'
    },
    signals: ['must', 'have to', "mustn't", "don't have to", 'had to', 'will have to'],
    useWhen: [
      'must: khi chính người nói thấy việc đó cần thiết, hoặc khi viết nội quy.',
      'have to: khi sức ép đến từ bên ngoài.',
      'have to: khi cần nói bắt buộc ở quá khứ hoặc tương lai.',
      "mustn't: khi cấm. don't have to: khi miễn."
    ],
    useNot: [
      { what: "Không coi mustn't là phủ định của must theo nghĩa \"không bắt buộc\".", why: 'Đây là chỗ sai nhiều nhất cả nhóm: "You mustn\'t come" là cấm tới, không phải không cần tới.' },
      { what: 'Không dùng must ở quá khứ.', why: '"I must work late yesterday" sai; phải là "I had to work late yesterday".' }
    ],
    confuse: [
      {
        with: "mustn't và don't have to",
        tell: 'Một bên đóng cửa hoàn toàn, một bên mở cửa cho lựa chọn. Tiếng Việt dịch cả hai quanh chữ "không phải" nên phải nhớ bằng nghĩa chứ đừng dịch máy móc.',
        pair: [
          { en: "You mustn't use your phone during the exam.", vi: 'Trong giờ thi không được dùng điện thoại. (CẤM)' },
          { en: "You don't have to use a pen; a pencil is fine.", vi: 'Không nhất thiết phải dùng bút mực, bút chì cũng được. (KHÔNG CẦN)' }
        ]
      },
      {
        with: 'must và have to ở nội quy',
        tell: 'Văn bản quy định thường dùng must; người kể lại quy định đó cho người khác thường dùng have to.',
        pair: [
          { en: 'All visitors must sign in at reception.', vi: 'Mọi khách phải ký tên ở quầy lễ tân. (biển báo)' },
          { en: 'I have to sign in every morning.', vi: 'Sáng nào tôi cũng phải ký tên. (tôi kể lại)' }
        ]
      }
    ],
    errors: [
      { wrong: "The museum is free, so you mustn't buy a ticket.", right: "The museum is free, so you don't have to buy a ticket.", why: 'Ý là không cần mua vé, không phải cấm mua vé.' },
      { wrong: 'Yesterday I must stay late at the office.', right: 'Yesterday I had to stay late at the office.', why: 'must không có dạng quá khứ.' }
    ],
    examples: [
      ['I must remember to call the bank.', 'Tôi phải nhớ gọi cho ngân hàng.', 1, 'Tự người nói thấy cần.'],
      ['I have to submit the form by Friday.', 'Tôi phải nộp đơn trước thứ Sáu.', 1, 'Hạn do bên ngoài đặt ra.'],
      ["You mustn't leave the door unlocked.", 'Bạn không được để cửa không khoá.', 1, 'Cấm.'],
      ["You don't have to stay until the end.", 'Bạn không nhất thiết phải ở tới hết.', 1, 'Không cần.'],
      ["The museum is free, so you mustn't buy a ticket.", 'Bảo tàng miễn phí nên bạn không cần mua vé.', 0, 'Sai nghĩa: sửa thành "you don\'t have to buy a ticket".'],
      ['Yesterday I must stay late at the office.', 'Hôm qua tôi phải ở lại văn phòng muộn.', 0, 'Sai: sửa thành "I had to stay late".']
    ],
    practice: [
      ["Passengers ___ (mustn't / don't have to) open the emergency door.", "mustn't", 'Hành khách không được mở cửa thoát hiểm.'],
      ["Entry is free, so we ___ (mustn't / don't have to) pay.", "don't have to", 'Vào cửa miễn phí nên chúng ta không cần trả tiền.'],
      ['Last night I ___ (must / had to) finish the whole report.', 'had to', 'Tối qua tôi phải làm xong cả bản báo cáo.'],
      ['Next week she ___ (will have to / will must) present the results.', 'will have to', 'Tuần sau cô ấy sẽ phải trình bày kết quả.'],
      ["You ___ (mustn't / don't have to) tell him — it is a surprise.", "mustn't", 'Đừng nói với anh ấy nhé, để làm bất ngờ.'],
      ['All staff ___ (must / have) wear an ID badge.', 'must', 'Toàn thể nhân viên phải đeo thẻ.'],
      ["It's optional, so you ___ (mustn't / don't have to) attend.", "don't have to", 'Không bắt buộc nên bạn không cần dự.'],
      ['I ___ (must / had to) call my parents tonight.', 'must', 'Tối nay tôi phải gọi cho bố mẹ.'],
      ["Children ___ (mustn't / don't have to) play with matches.", "mustn't", 'Trẻ em không được nghịch diêm.'],
      ['We ___ (had to / must) wait two hours at the airport.', 'had to', 'Chúng tôi đã phải đợi hai tiếng ở sân bay.']
    ]
  },

  {
    slug: 'deduction-present',
    en: 'must / might / can\'t for deduction',
    vi: "must · might · can't — suy đoán ở hiện tại",
    level: 'B1',
    summary: 'Dùng động từ khuyết thiếu để đoán, không phải để nói bắt buộc. Ba mức chắc chắn khác nhau rõ rệt.',
    formula: {
      rows: [
        ['Gần như chắc chắn đúng', "must + V: \"He must be tired.\""],
        ['Có thể', 'may / might / could + V'],
        ['Gần như chắc chắn sai', "can't + V: \"He can't be at home.\""],
        ['Đang diễn ra', 'must / might + be + V-ing: "She must be sleeping."']
      ],
      note: 'Phủ định của suy đoán chắc chắn là "can\'t", KHÔNG phải "mustn\'t". "He mustn\'t be tired" là cấm anh ta mệt — vô nghĩa.'
    },
    signals: ['must be', "can't be", 'might be', 'could be', 'That explains'],
    useWhen: [
      'Suy ra một kết luận từ bằng chứng đang thấy.',
      'Đoán tình trạng hoặc việc đang diễn ra của ai đó.',
      'Bác bỏ một khả năng khi có bằng chứng trái ngược.'
    ],
    useNot: [
      { what: "Không dùng mustn't để suy đoán phủ định.", why: 'Suy đoán phủ định dùng "can\'t": "She can\'t be serious", không phải "She mustn\'t be serious".' },
      { what: 'Không dùng must để suy đoán về quá khứ ở dạng này.', why: 'Quá khứ cần dạng "must have + V3": "He must have left" — học ở bậc B2.' }
    ],
    confuse: [
      {
        with: 'must chỉ bắt buộc và must chỉ suy đoán',
        tell: 'Cùng một chữ, hai việc khác hẳn. Nhìn ngữ cảnh: có bằng chứng để suy ra thì là suy đoán, có quy định thì là bắt buộc.',
        pair: [
          { en: 'You must wear a helmet.', vi: 'Bạn phải đội mũ bảo hiểm. (bắt buộc)' },
          { en: 'You must be exhausted after that trip.', vi: 'Sau chuyến đi đó chắc bạn kiệt sức. (suy đoán)' }
        ]
      }
    ],
    errors: [
      { wrong: "The lights are off — he mustn't be home.", right: "The lights are off — he can't be home.", why: 'Suy đoán phủ định dùng "can\'t", không dùng "mustn\'t".' },
      { wrong: 'She must to be very busy.', right: 'She must be very busy.', why: 'Sau must không có "to".' }
    ],
    examples: [
      ['You must be hungry after that long walk.', 'Sau chặng đi bộ dài đó chắc bạn đói lắm.', 1, 'Suy đoán chắc chắn từ bằng chứng.'],
      ["That can't be right — check the figures again.", 'Cái đó không thể đúng được, kiểm tra lại số liệu đi.', 1, 'Bác bỏ, gần như chắc chắn sai.'],
      ['He might be stuck in traffic.', 'Có thể anh ấy đang kẹt xe.', 1, 'Khả năng, không chắc.'],
      ['She must be sleeping — the light is off.', 'Chắc cô ấy đang ngủ, đèn tắt rồi.', 1, 'Suy đoán về việc đang diễn ra.'],
      ["The lights are off — he mustn't be home.", 'Đèn tắt rồi, chắc anh ấy không có nhà.', 0, 'Sai: sửa thành "he can\'t be home".'],
      ['She must to be very busy these days.', 'Dạo này chắc cô ấy bận lắm.', 0, 'Sai: bỏ "to". Sửa thành "She must be very busy these days."']
    ],
    practice: [
      ["He has been running — he ___ (must / can't) be tired.", 'must', 'Anh ấy vừa chạy xong, chắc mệt lắm.'],
      ["She just ate — she ___ (can't / mustn't) be hungry.", "can't", 'Cô ấy vừa ăn xong, không thể đói được.'],
      ['The phone is ringing — it ___ (might / must not) be Lan.', 'might', 'Điện thoại reo kìa, có thể là Lan.'],
      ["That ___ (can't / mustn't) be true — I saw him this morning.", "can't", 'Không thể như vậy được, sáng nay tôi vừa thấy anh ta.'],
      ['They ___ (must / should) be on holiday — the shop is closed.', 'must', 'Chắc họ đi nghỉ, cửa hàng đóng cửa.'],
      ['You ___ (must / must to) be joking!', 'must', 'Chắc bạn đùa thôi!'],
      ["The car isn't here, so she ___ (must / can't) have left.", 'must', 'Xe không còn đây nên chắc cô ấy đi rồi.'],
      ['He ___ (might / must) be in the garden — I am not sure.', 'might', 'Có thể anh ấy ở ngoài vườn, tôi không chắc.'],
      ["It ___ (can't / mustn't) be five o'clock already!", "can't", 'Không thể nào đã năm giờ rồi!'],
      ['She ___ (must / may) be working late — her light is still on.', 'must', 'Chắc cô ấy làm muộn, đèn vẫn sáng.']
    ]
  },

  {
    slug: 'advice-strength',
    en: 'should / ought to / had better',
    vi: 'should · ought to · had better — ba mức khuyên',
    level: 'B1',
    summary: 'Cùng là khuyên nhưng mức nặng khác nhau, và had better hàm ý sẽ có hậu quả xấu nếu không nghe.',
    formula: {
      rows: [
        ['Nhẹ, hay dùng nhất', 'should + V'],
        ['Trang trọng hơn', 'ought to + V (có "to")'],
        ['Cảnh báo hậu quả', "had better ('d better) + V — KHÔNG có \"to\""],
        ['Phủ định', "shouldn't · ought not to · had better not"]
      ],
      note: '"had better" nhìn có "had" nhưng nói về hiện tại và tương lai, không phải quá khứ. Phủ định là "had better not", không phải "hadn\'t better".'
    },
    signals: ['should', 'ought to', "had better", "'d better", "had better not"],
    useWhen: [
      'should: lời khuyên thông thường, dùng được mọi lúc.',
      'ought to: giống should nhưng trang trọng hơn, thiên về bổn phận đúng sai.',
      "had better: khuyên gấp, hàm ý nếu không làm sẽ gặp rắc rối."
    ],
    useNot: [
      { what: 'Không thêm "to" sau had better.', why: '"You had better to go" sai; đúng là "You had better go".' },
      { what: 'Không dùng had better cho lời khuyên chung chung.', why: 'Nó mang sắc thái cảnh báo. Khuyên nhẹ nhàng thì dùng should.' },
      { what: 'Không viết "hadn\'t better".', why: 'Phủ định đặt "not" sau better: "You had better not tell her".' }
    ],
    confuse: [
      {
        with: 'should và had better',
        tell: 'should là gợi ý; had better là cảnh báo có hậu quả nếu không nghe.',
        pair: [
          { en: 'You should see that film — it is very good.', vi: 'Bạn nên xem phim đó, hay lắm. (gợi ý)' },
          { en: "You'd better leave now or you'll miss the train.", vi: 'Bạn đi ngay đi không lỡ tàu bây giờ. (cảnh báo)' }
        ]
      }
    ],
    errors: [
      { wrong: "You had better to see a doctor.", right: 'You had better see a doctor.', why: 'Sau "had better" là động từ nguyên thể trần.' },
      { wrong: "You hadn't better say anything.", right: "You'd better not say anything.", why: 'Phủ định là "had better not".' }
    ],
    examples: [
      ['You should take a break.', 'Bạn nên nghỉ một lát.', 1, 'Khuyên nhẹ.'],
      ['We ought to tell her the truth.', 'Chúng ta nên nói thật với cô ấy.', 1, 'Trang trọng hơn, thiên về đúng sai.'],
      ["You'd better hurry — the shop closes at six.", 'Nhanh lên không cửa hàng đóng lúc sáu giờ đấy.', 1, 'Cảnh báo hậu quả.'],
      ["You'd better not park there.", 'Đừng đỗ xe ở đó thì hơn.', 1, 'Phủ định đúng dạng.'],
      ['You had better to see a doctor.', 'Bạn nên đi khám thì hơn.', 0, 'Sai: bỏ "to". Sửa thành "You had better see a doctor."'],
      ["You hadn't better say anything to him.", 'Bạn đừng nói gì với anh ta thì hơn.', 0, 'Sai: sửa thành "You\'d better not say anything to him."']
    ],
    practice: [
      ["It's late — you ___ (had better / had better to) go home.", 'had better', 'Muộn rồi, bạn về nhà đi thì hơn.'],
      ['We ___ (ought to / ought) apologise for the delay.', 'ought to', 'Chúng ta nên xin lỗi vì sự chậm trễ.'],
      ['You ___ (should / had better) try this restaurant sometime.', 'should', 'Lúc nào đó bạn nên thử nhà hàng này.'],
      ["You'd ___ (better not / not better) be late again.", 'better not', 'Đừng có muộn lần nữa đấy.'],
      ['She ___ (ought to / oughts to) rest more.', 'ought to', 'Cô ấy nên nghỉ ngơi nhiều hơn.'],
      ["We ___ ('d better / 'd better to) book now before it sells out.", "'d better", 'Đặt ngay đi không hết chỗ bây giờ.'],
      ['You ___ (shouldn\'t / hadn\'t better) worry so much.', "shouldn't", 'Bạn không nên lo nhiều thế.'],
      ["He ___ ('d better / should) take an umbrella — it looks like rain.", "'d better", 'Anh ấy nên mang ô, trời sắp mưa rồi.'],
      ['They ___ (ought to / had better to) check the figures again.', 'ought to', 'Họ nên kiểm tra lại số liệu.'],
      ["You ___ ('d better not / hadn't better) touch that wire.", "'d better not", 'Đừng có chạm vào sợi dây đó.']
    ]
  },

  {
    slug: 'used-to-would',
    en: 'used to / would / be used to',
    vi: 'used to · would · be used to',
    level: 'B1',
    summary: 'Hai cái đầu nói thói quen xưa nay không còn; cái thứ ba nghĩa hoàn toàn khác — đã quen với việc gì.',
    formula: {
      rows: [
        ['Thói quen và trạng thái xưa', 'used to + V: "I used to live in Hue."'],
        ['Thói quen xưa lặp lại', 'would + V — chỉ dùng cho HÀNH ĐỘNG, không dùng cho trạng thái'],
        ['Đã quen với', 'be used to + danh từ / V-ing: "I am used to the noise."'],
        ['Đang dần quen', 'get used to + danh từ / V-ing']
      ],
      note: 'Ba cấu trúc nhìn giống nhau nhưng khác hẳn: "used to" đi với động từ nguyên thể, còn "be/get used to" đi với danh từ hoặc V-ing. "I used to swim" là ngày xưa hay bơi; "I am used to swimming" là tôi đã quen với việc bơi.'
    },
    signals: ['used to', 'would', 'be used to', 'get used to', 'in those days'],
    useWhen: [
      'used to: thói quen hoặc trạng thái trong quá khứ nay đã khác.',
      'would: kể lại thói quen xưa trong văn kể chuyện, chỉ với hành động.',
      'be used to: nói mình đã quen với điều gì.',
      'get used to: nói quá trình dần quen.'
    ],
    useNot: [
      { what: 'Không dùng would cho trạng thái quá khứ.', why: '"I would have long hair" sai nghĩa; trạng thái phải dùng "I used to have long hair".' },
      { what: 'Không dùng nguyên thể sau "be used to".', why: '"I am used to get up early" sai; phải là "I am used to getting up early".' },
      { what: 'Không dùng "used to" cho hiện tại.', why: 'Nó chỉ nói chuyện quá khứ. Thói quen hiện tại dùng hiện tại đơn với trạng từ tần suất.' }
    ],
    confuse: [
      {
        with: 'used to và be used to',
        tell: 'Nhìn cái đứng sau: động từ nguyên thể thì là thói quen xưa; danh từ hoặc V-ing thì là đã quen.',
        pair: [
          { en: 'I used to get up at five.', vi: 'Ngày xưa tôi hay dậy lúc năm giờ. (giờ không nữa)' },
          { en: 'I am used to getting up at five.', vi: 'Tôi đã quen dậy lúc năm giờ. (giờ vẫn vậy, thấy bình thường)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I am used to get up early now.', right: 'I am used to getting up early now.', why: 'Sau "be used to" là danh từ hoặc V-ing.' },
      { wrong: 'She would be very shy as a child.', right: 'She used to be very shy as a child.', why: '"be shy" là trạng thái nên không dùng would.' }
    ],
    examples: [
      ['I used to live in Da Lat.', 'Ngày xưa tôi sống ở Đà Lạt.', 1, 'Trạng thái quá khứ nay đã khác.'],
      ['Every summer we would go to my grandmother\'s house.', 'Hè nào chúng tôi cũng về nhà bà.', 1, 'Thói quen hành động, văn kể chuyện.'],
      ['I am used to the traffic here now.', 'Giờ tôi quen với cảnh xe cộ ở đây rồi.', 1, '"be used to" + danh từ.'],
      ['She is getting used to working nights.', 'Cô ấy đang dần quen với ca đêm.', 1, '"get used to" + V-ing.'],
      ['I am used to get up early now.', 'Giờ tôi quen dậy sớm rồi.', 0, 'Sai: sửa thành "I am used to getting up early now."'],
      ['She would be very shy as a child.', 'Hồi nhỏ cô ấy rất nhút nhát.', 0, 'Sai: trạng thái nên dùng "used to be". Sửa thành "She used to be very shy as a child."']
    ],
    practice: [
      ['I ___ (used to / am used to) smoke, but I quit last year.', 'used to', 'Ngày xưa tôi hút thuốc nhưng năm ngoái bỏ rồi.'],
      ['He ___ (is used to / used to) working under pressure.', 'is used to', 'Anh ấy quen làm việc dưới áp lực.'],
      ['We ___ (would / used to) have a dog when I was small.', 'used to', 'Hồi nhỏ nhà tôi có một con chó.'],
      ['Every Sunday my father ___ (would / was used to) take us fishing.', 'would', 'Chủ nhật nào bố cũng dẫn chúng tôi đi câu.'],
      ['She is getting used to ___ (live / living) alone.', 'living', 'Cô ấy đang dần quen sống một mình.'],
      ['I ___ (used to / am used to) the weather here now.', 'am used to', 'Giờ tôi quen thời tiết ở đây rồi.'],
      ['There ___ (used to / would) be a cinema on this corner.', 'used to', 'Ở góc phố này ngày trước có một rạp chiếu phim.'],
      ['He is not used to ___ (drive / driving) on the left.', 'driving', 'Anh ấy chưa quen lái xe bên trái.'],
      ['They ___ (used to / would) visit us every Tet.', 'would', 'Tết nào họ cũng tới thăm chúng tôi.'],
      ['Did you ___ (use to / used to) play any sport at school?', 'use to', 'Hồi đi học bạn có chơi môn thể thao nào không?']
    ]
  },

  {
    slug: 'permission-register',
    en: 'Permission across registers',
    vi: 'Xin phép theo độ trang trọng',
    level: 'B1',
    summary: 'Cùng một việc xin phép, chọn sai mức trang trọng là mất điểm ở phần Nói. Thêm "be allowed to" cho các thì mà may và can không có.',
    formula: {
      rows: [
        ['Thân mật', 'Can I …? · Is it OK if I …?'],
        ['Trung tính, lịch sự', 'Could I …? · Do you mind if I …?'],
        ['Trang trọng', 'May I …? · Would it be possible to …?'],
        ['Nói về quyền được phép', 'be allowed to · be permitted to (trang trọng)']
      ],
      note: '"Do you mind if I…?" hỏi "bạn có phiền không", nên đồng ý là trả lời PHỦ ĐỊNH: "No, not at all" nghĩa là cứ tự nhiên. Trả lời "Yes" là đang từ chối.'
    },
    signals: ['Can I', 'Could I', 'May I', 'Do you mind if', 'be allowed to', 'be permitted to'],
    useWhen: [
      'Can I: bạn bè, người thân, tình huống thoải mái.',
      'Could I: mặc định an toàn cho hầu hết tình huống.',
      'May I: khách hàng, giám khảo, người lớn tuổi, văn viết trang trọng.',
      'be allowed to: kể lại quy định, và dùng được ở mọi thì.'
    ],
    useNot: [
      { what: 'Không trả lời "Yes" khi muốn đồng ý với "Do you mind if…?".', why: '"Yes" nghĩa là có, tôi phiền. Đồng ý thì nói "No, go ahead" hoặc "Not at all".' },
      { what: 'Không dùng may/can cho thì tương lai và hoàn thành.', why: '"will can" sai; nói "will be allowed to".' }
    ],
    confuse: [
      {
        with: 'can chỉ khả năng và can chỉ được phép',
        tell: 'Cùng một chữ, hai nghĩa. Ngữ cảnh quyết định: nói về kỹ năng hay nói về quy định.',
        pair: [
          { en: 'She can swim.', vi: 'Cô ấy biết bơi. (khả năng)' },
          { en: 'You can swim here — it is allowed.', vi: 'Bạn bơi ở đây được, chỗ này cho phép. (được phép)' }
        ]
      }
    ],
    errors: [
      { wrong: '"Do you mind if I open the window?" — "Yes, of course!"', right: '"Do you mind if I open the window?" — "No, not at all."', why: 'Trả lời "Yes" là nói bạn có phiền, tức là từ chối.' },
      { wrong: 'Next year we will can park here.', right: 'Next year we will be allowed to park here.', why: 'Không ghép hai động từ khuyết thiếu; mượn "be allowed to".' }
    ],
    examples: [
      ['Can I borrow your charger?', 'Cho tôi mượn sạc nhé?', 1, 'Thân mật.'],
      ['Could I have a word with you?', 'Tôi nói chuyện với anh một lát được không?', 1, 'Lịch sự, dùng được hầu hết tình huống.'],
      ['May I see your boarding pass, please?', 'Cho tôi xem thẻ lên máy bay của quý khách ạ.', 1, 'Trang trọng, dịch vụ.'],
      ['Students are not allowed to bring phones into the exam room.', 'Thí sinh không được mang điện thoại vào phòng thi.', 1, 'Kể lại quy định.'],
      ['"Do you mind if I sit here?" — "Yes, of course."', '"Tôi ngồi đây có phiền không?" — "Có chứ."', 0, 'Sai sắc thái: "Yes" là từ chối. Muốn đồng ý thì nói "No, not at all."'],
      ['Next year we will can use the new library.', 'Sang năm chúng ta sẽ được dùng thư viện mới.', 0, 'Sai: sửa thành "we will be allowed to use the new library".']
    ],
    practice: [
      ['___ (May I / Can I) see your ticket, madam?', 'May I', 'Cho tôi xem vé của quý khách ạ.'],
      ['___ (Could I / Can I) ask you something, Professor?', 'Could I', 'Thưa thầy, em hỏi một câu được không ạ?'],
      ['"Do you mind if I join you?" — "___ (No / Yes), not at all."', 'No', '"Tôi ngồi cùng có phiền không?" — "Không, cứ tự nhiên."'],
      ['We ___ (were allowed to / could to) leave early yesterday.', 'were allowed to', 'Hôm qua chúng tôi được về sớm.'],
      ['Visitors ___ (are not allowed to / cannot to) take photos.', 'are not allowed to', 'Khách tham quan không được chụp ảnh.'],
      ['___ (Can I / May I) grab your pen for a second?', 'Can I', 'Cho tớ mượn cái bút một tí nhé?'],
      ['Next term students ___ (will be allowed to / will can) choose their topic.', 'will be allowed to', 'Học kỳ tới sinh viên sẽ được tự chọn đề tài.'],
      ['___ (Would it be possible / Can it be possible) to reschedule the meeting?', 'Would it be possible', 'Có thể dời lịch họp được không ạ?'],
      ['Children under twelve ___ (are not permitted to / must not to) enter.', 'are not permitted to', 'Trẻ dưới mười hai tuổi không được vào.'],
      ['___ (Could / Do) I leave my bag here for a moment?', 'Could', 'Tôi để túi ở đây một lát được không?']
    ]
  },

  {
    slug: 'ability-across-tenses',
    en: 'be able to across tenses',
    vi: 'be able to — bù chỗ can không chia được',
    level: 'B1',
    summary: 'can chỉ có hai dạng là can và could. Mọi thì còn lại đều phải mượn be able to, và không bao giờ ghép hai động từ khuyết thiếu.',
    formula: {
      rows: [
        ['Hiện tại', 'can = am/is/are able to'],
        ['Quá khứ', 'could = was/were able to'],
        ['Tương lai', 'will be able to — KHÔNG có "will can"'],
        ['Hoàn thành và nguyên thể', "have been able to · to be able to · would like to be able to"]
      ],
      note: 'Quy tắc gốc: trong tiếng Anh không đặt hai động từ khuyết thiếu cạnh nhau. "will can", "must can", "might can" đều sai; thay bằng "will be able to", "must be able to", "might be able to".'
    },
    signals: ['will be able to', 'have been able to', 'to be able to', 'might be able to'],
    useWhen: [
      'Nói khả năng ở tương lai, hiện tại hoàn thành hoặc sau một động từ khuyết thiếu khác.',
      'Sau giới từ hoặc khi cần dạng nguyên thể: "I hope to be able to help."',
      'Trong văn viết trang trọng, "be able to" nghe cân đối hơn can.'
    ],
    useNot: [
      { what: 'Không ghép hai động từ khuyết thiếu.', why: '"will can", "must can", "should can" đều sai không có ngoại lệ.' },
      { what: 'Không thay can bằng be able to ở mọi chỗ.', why: 'Với động từ giác quan thì can tự nhiên hơn: "I can see it" chứ ít ai nói "I am able to see it".' }
    ],
    confuse: [
      {
        with: 'can và will be able to',
        tell: 'Nói khả năng hiện tại thì can; nói khả năng sẽ có trong tương lai thì will be able to.',
        pair: [
          { en: 'I can drive.', vi: 'Tôi biết lái xe. (bây giờ)' },
          { en: 'I will be able to drive after the test.', vi: 'Thi xong tôi sẽ lái xe được. (tương lai)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Next month I will can start the course.', right: 'Next month I will be able to start the course.', why: 'Không đặt "can" sau "will".' },
      { wrong: 'I have could finish the report.', right: 'I have been able to finish the report.', why: 'can và could không có dạng hoàn thành; mượn "have been able to".' }
    ],
    examples: [
      ['I will be able to help you tomorrow.', 'Ngày mai tôi giúp bạn được.', 1, 'Khả năng ở tương lai.'],
      ['We have not been able to reach him all day.', 'Cả ngày nay chúng tôi không liên lạc được với anh ấy.', 1, 'Dạng hoàn thành.'],
      ['She might be able to answer that.', 'Có thể cô ấy trả lời được câu đó.', 1, 'Sau một động từ khuyết thiếu khác.'],
      ['It is good to be able to work from home.', 'Được làm việc ở nhà cũng hay.', 1, 'Dạng nguyên thể sau tính từ.'],
      ['Next month I will can start the course.', 'Tháng sau tôi sẽ bắt đầu khoá học được.', 0, 'Sai: sửa thành "I will be able to start the course."'],
      ['I have could not finish the report.', 'Tôi chưa làm xong báo cáo được.', 0, 'Sai: sửa thành "I have not been able to finish the report."']
    ],
    practice: [
      ['After the operation he ___ (will be able to / will can) walk again.', 'will be able to', 'Sau ca mổ anh ấy sẽ đi lại được.'],
      ['I ___ (have not been able to / have not could) sleep well lately.', 'have not been able to', 'Dạo này tôi ngủ không ngon.'],
      ['She ___ (might be able to / might can) lend you the money.', 'might be able to', 'Có thể cô ấy cho bạn vay được tiền.'],
      ['I hope ___ (to be able to / to can) visit you soon.', 'to be able to', 'Tôi mong sớm tới thăm bạn được.'],
      ['___ (Can / Are able) you hear me?', 'Can', 'Bạn nghe thấy tôi không?'],
      ['They ___ (were able to / could to) solve the problem in the end.', 'were able to', 'Cuối cùng họ cũng giải quyết được vấn đề.'],
      ['You ___ (should be able to / should can) finish this in an hour.', 'should be able to', 'Chắc một tiếng là bạn xong cái này.'],
      ['We ___ (will not be able to / will cannot) attend the meeting.', 'will not be able to', 'Chúng tôi sẽ không dự họp được.'],
      ['It is important ___ (to be able to / to can) work in a team.', 'to be able to', 'Làm việc nhóm được là điều quan trọng.'],
      ['I ___ (can / am able) smell something burning.', 'can', 'Tôi ngửi thấy mùi khét.']
    ]
  }
];

/** Điểm ngữ pháp — nhóm động từ khuyết thiếu bậc A1–B1. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'modal',
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
