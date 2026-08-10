/**
 * Ngữ pháp — nhóm BỊ ĐỘNG và CÂU TƯỜNG THUẬT, phần bậc A2 đến B2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 22 điểm
 * (A2 ×2, B1 ×5, B2 ×6, C1 ×5, C2 ×4). Tệp này soạn 13 điểm của A2, B1 và B2;
 * 9 điểm bậc C1–C2 tách thành mục riêng trong hàng đợi.
 *
 * Hai phần này gộp chung một nhóm vì cùng một cơ chế: ĐỔI GÓC NHÌN của câu.
 * Bị động đẩy tân ngữ lên làm chủ ngữ để khỏi phải nêu ai làm; tường thuật
 * chuyển lời người khác sang góc nhìn người kể, kéo theo lùi thì, đổi đại từ,
 * đổi trạng ngữ thời gian và nơi chốn.
 *
 * Vì sao khó với người Việt: tiếng Việt có bị động ("bị", "được") nhưng dùng
 * thưa hơn nhiều và không đổi hình thái động từ, nên người học hay quên "be"
 * hoặc quên chia phân từ. Với tường thuật, tiếng Việt giữ nguyên câu gốc và chỉ
 * thêm "rằng", nên lỗi kinh điển là bê nguyên trật tự câu hỏi vào câu tường
 * thuật: "He asked me where did I live".
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A2 ==================== */

  {
    slug: 'passive-basic',
    en: 'Passive: present and past simple',
    vi: 'Bị động hiện tại đơn và quá khứ đơn',
    level: 'A2',
    summary: 'Đưa tân ngữ lên làm chủ ngữ khi ai làm không quan trọng. Công thức gốc: be + phân từ ba.',
    formula: {
      rows: [
        ['Hiện tại đơn', 'am / is / are + V3: "The room is cleaned every day."'],
        ['Quá khứ đơn', 'was / were + V3: "The letter was sent yesterday."'],
        ['Phủ định', 'is not / was not + V3'],
        ['Nghi vấn', 'Is / Was + S + V3?']
      ],
      note: '"be" phải chia theo chủ ngữ MỚI, tức là tân ngữ cũ: "The books are sold" chứ không phải "The books is sold". Động từ chính luôn đứng ở dạng phân từ ba, không đổi.'
    },
    signals: ['is made', 'was built', 'are sold', 'were written', 'by'],
    useWhen: [
      'Không biết hoặc không cần biết ai làm.',
      'Người làm là hiển nhiên: "The thief was arrested" (tất nhiên là cảnh sát bắt).',
      'Muốn nhấn vào việc chứ không vào người: bản tin, hướng dẫn, biển báo.'
    ],
    useNot: [
      { what: 'Không dùng bị động với nội động từ.', why: 'happen, arrive, come, go, sleep, die không có tân ngữ nên không có dạng bị động. "The accident was happened" luôn sai.' },
      { what: 'Không quên "be".', why: '"The room cleaned every day" thiếu "is"; câu thành nghĩa khác hẳn.' }
    ],
    confuse: [
      {
        with: 'câu chủ động',
        tell: 'Chủ động nhấn vào người làm; bị động nhấn vào việc. Chọn theo điều bạn muốn người đọc chú ý.',
        pair: [
          { en: 'Someone stole my bike.', vi: 'Có ai đó lấy trộm xe đạp của tôi. (nhấn vào kẻ trộm)' },
          { en: 'My bike was stolen.', vi: 'Xe đạp của tôi bị lấy trộm. (nhấn vào chiếc xe)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The accident was happened last night.', right: 'The accident happened last night.', why: '"happen" là nội động từ nên không có dạng bị động.' },
      { wrong: 'These shirts is made in Viet Nam.', right: 'These shirts are made in Viet Nam.', why: '"be" chia theo chủ ngữ mới; "these shirts" là số nhiều.' }
    ],
    examples: [
      ['This bridge was built in 1995.', 'Cây cầu này được xây năm 1995.', 1, 'Quá khứ đơn bị động.'],
      ['The office is cleaned every evening.', 'Văn phòng được dọn mỗi tối.', 1, 'Hiện tại đơn bị động, việc lặp lại.'],
      ['These shoes are made in Italy.', 'Đôi giày này được sản xuất ở Ý.', 1, 'Chủ ngữ số nhiều nên dùng "are".'],
      ['My wallet was stolen on the bus.', 'Ví của tôi bị lấy trộm trên xe buýt.', 1, 'Không biết ai lấy nên dùng bị động.'],
      ['The accident was happened last night.', 'Vụ tai nạn xảy ra đêm qua.', 0, 'Sai: "happen" là nội động từ. Sửa thành "The accident happened last night."'],
      ['These shirts is made in Viet Nam.', 'Mấy chiếc áo này may ở Việt Nam.', 0, 'Sai: sửa thành "These shirts are made in Viet Nam."']
    ],
    practice: [
      ['The room ___ (is cleaned / cleans) every morning.', 'is cleaned', 'Phòng được dọn mỗi sáng.'],
      ['This house ___ (was built / built) in 1980.', 'was built', 'Ngôi nhà này được xây năm 1980.'],
      ['These cakes ___ (are / is) made by hand.', 'are', 'Mấy cái bánh này làm bằng tay.'],
      ['The window ___ (was broken / broke) by the storm.', 'was broken', 'Cửa sổ bị bão làm vỡ.'],
      ['Rice ___ (is grown / grows) in many parts of Viet Nam.', 'is grown', 'Lúa được trồng ở nhiều nơi tại Việt Nam.'],
      ['The letters ___ (were sent / was sent) last Friday.', 'were sent', 'Mấy lá thư được gửi hôm thứ Sáu tuần trước.'],
      ['What happened? An accident ___ (happened / was happened).', 'happened', 'Chuyện gì thế? Có tai nạn xảy ra.'],
      ['This song ___ (is not sung / does not sing) in English.', 'is not sung', 'Bài hát này không hát bằng tiếng Anh.'],
      ['___ (Was / Did) the report finished on time?', 'Was', 'Báo cáo có xong đúng hạn không?'],
      ['The tickets ___ (are sold / sell) at the entrance.', 'are sold', 'Vé được bán ở lối vào.']
    ]
  },

  {
    slug: 'reported-statements',
    en: 'Reported statements',
    vi: 'Tường thuật câu kể',
    level: 'A2',
    summary: 'Kể lại lời người khác. Lùi động từ về một bậc quá khứ và đổi đại từ theo góc nhìn người kể.',
    formula: {
      rows: [
        ['Công thức', 'S + said (that) + mệnh đề đã lùi thì'],
        ['Lùi thì', 'hiện tại đơn → quá khứ đơn · hiện tại tiếp diễn → quá khứ tiếp diễn'],
        ['say và tell', 'say (KHÔNG có tân ngữ) · tell + tân ngữ: "He told me that…"'],
        ['Bỏ được "that"', 'He said (that) he was tired.']
      ],
      note: 'Khác biệt hay sai nhất: "say" không đi thẳng với người nghe. Nói "He said me" luôn sai — hoặc "He said to me", hoặc "He told me".'
    },
    signals: ['said', 'told', 'that', 'explained', 'mentioned'],
    useWhen: [
      'Kể lại điều người khác đã nói mà không trích nguyên văn.',
      'Viết biên bản, báo cáo, tóm tắt hội thoại.',
      'Thuật lại thông tin nghe được từ người thứ ba.'
    ],
    useNot: [
      { what: 'Không dùng "say" với tân ngữ chỉ người.', why: '"He said me" sai; đúng là "He told me" hoặc "He said to me".' },
      { what: 'Không giữ nguyên thì của câu gốc khi động từ dẫn ở quá khứ.', why: '"He said he is tired" thường bị coi là thiếu lùi thì; chuẩn là "He said he was tired".' }
    ],
    confuse: [
      {
        with: 'say và tell',
        tell: '"tell" bắt buộc có người nghe ngay sau; "say" thì không.',
        pair: [
          { en: 'She told me she was busy.', vi: 'Cô ấy bảo tôi là cô ấy bận.' },
          { en: 'She said she was busy.', vi: 'Cô ấy nói là cô ấy bận.' }
        ]
      }
    ],
    errors: [
      { wrong: 'He said me that he was late.', right: 'He told me that he was late.', why: '"say" không đi thẳng với tân ngữ chỉ người.' },
      { wrong: 'She said she is a teacher.', right: 'She said she was a teacher.', why: 'Động từ dẫn ở quá khứ nên mệnh đề sau lùi một bậc.' }
    ],
    examples: [
      ['He said that he was tired.', 'Anh ấy nói là anh ấy mệt.', 1, 'Lùi từ "am" thành "was".'],
      ['She told me she lived in Hue.', 'Cô ấy bảo tôi là cô ấy sống ở Huế.', 1, '"tell" đi với tân ngữ chỉ người.'],
      ['They said they were looking for a flat.', 'Họ nói họ đang tìm căn hộ.', 1, 'Hiện tại tiếp diễn lùi thành quá khứ tiếp diễn.'],
      ['My teacher said the test would be easy.', 'Cô giáo tôi nói bài kiểm tra sẽ dễ.', 1, '"will" lùi thành "would".'],
      ['He said me that he was late.', 'Anh ấy bảo tôi là anh ấy tới muộn.', 0, 'Sai: sửa thành "He told me that he was late."'],
      ['She said she is a teacher.', 'Cô ấy nói cô ấy là giáo viên.', 0, 'Sai: sửa thành "She said she was a teacher."']
    ],
    practice: [
      ['He ___ (told / said) me he was busy.', 'told', 'Anh ấy bảo tôi là anh ấy bận.'],
      ['She ___ (said / told) that she liked the film.', 'said', 'Cô ấy nói là cô ấy thích bộ phim.'],
      ['They said they ___ (were / are) tired.', 'were', 'Họ nói họ mệt.'],
      ['He said he ___ (worked / works) in a bank.', 'worked', 'Anh ấy nói anh ấy làm ở ngân hàng.'],
      ['My mother told ___ (me / to me) to be careful.', 'me', 'Mẹ tôi dặn tôi phải cẩn thận.'],
      ['She said she ___ (would / will) call me later.', 'would', 'Cô ấy nói sẽ gọi cho tôi sau.'],
      ['He told us he ___ (had / has) two brothers.', 'had', 'Anh ấy bảo chúng tôi là anh ấy có hai anh em trai.'],
      ['They ___ (said / told) us the shop was closed.', 'told', 'Họ bảo chúng tôi là cửa hàng đóng cửa.'],
      ['She said she ___ (was studying / is studying) English.', 'was studying', 'Cô ấy nói cô ấy đang học tiếng Anh.'],
      ['He said the train ___ (had left / has left) already.', 'had left', 'Anh ấy nói tàu đã chạy rồi.']
    ]
  },

  /* ==================== B1 ==================== */

  {
    slug: 'passive-tenses',
    en: 'Passive in other tenses',
    vi: 'Bị động ở các thì còn lại',
    level: 'B1',
    summary: 'Chỉ chia phần "be" theo thì, còn động từ chính luôn giữ nguyên dạng phân từ ba.',
    formula: {
      rows: [
        ['Hiện tại tiếp diễn', 'am / is / are being + V3: "The road is being repaired."'],
        ['Hiện tại hoàn thành', 'have / has been + V3: "The work has been finished."'],
        ['Quá khứ tiếp diễn', 'was / were being + V3'],
        ['Tương lai', 'will be + V3 · is going to be + V3']
      ],
      note: 'Cách nhớ: đổi thì chỉ đổi chữ "be". "is cleaned" → "is being cleaned" → "has been cleaned" → "will be cleaned" — phần "cleaned" không bao giờ đổi.'
    },
    signals: ['is being', 'has been', 'will be', 'was being', 'is going to be'],
    useWhen: [
      'Việc đang được làm ngay lúc nói: "The system is being upgraded."',
      'Việc vừa hoàn tất và còn ảnh hưởng: "The report has been submitted."',
      'Việc sẽ được làm: "The results will be announced tomorrow."'
    ],
    useNot: [
      { what: 'Không dùng bị động ở hiện tại hoàn thành tiếp diễn.', why: '"has been being repaired" đúng ngữ pháp nhưng nghe rất nặng; người bản ngữ tránh và dùng chủ động thay thế.' },
      { what: 'Không chia động từ chính theo thì.', why: '"has been finish" sai; luôn là "has been finished".' }
    ],
    confuse: [
      {
        with: 'is being + V3 và has been + V3',
        tell: '"is being" là đang làm dở; "has been" là đã xong.',
        pair: [
          { en: 'The road is being repaired.', vi: 'Con đường đang được sửa. (chưa xong)' },
          { en: 'The road has been repaired.', vi: 'Con đường đã được sửa xong. (xong rồi)' }
        ]
      }
    ],
    errors: [
      { wrong: 'The house is building at the moment.', right: 'The house is being built at the moment.', why: 'Bị động tiếp diễn cần "being" trước phân từ ba.' },
      { wrong: 'The report has been finish.', right: 'The report has been finished.', why: 'Động từ chính luôn ở dạng phân từ ba.' }
    ],
    examples: [
      ['The bridge is being repaired this month.', 'Cây cầu đang được sửa trong tháng này.', 1, 'Hiện tại tiếp diễn bị động.'],
      ['All the invitations have been sent.', 'Tất cả thiệp mời đã được gửi đi.', 1, 'Hiện tại hoàn thành bị động.'],
      ['The winners will be announced on Friday.', 'Người thắng cuộc sẽ được công bố vào thứ Sáu.', 1, 'Tương lai bị động.'],
      ['The room was being painted when I arrived.', 'Lúc tôi tới thì căn phòng đang được sơn.', 1, 'Quá khứ tiếp diễn bị động.'],
      ['The house is building at the moment.', 'Ngôi nhà đang được xây.', 0, 'Sai: sửa thành "The house is being built at the moment."'],
      ['The report has been finish.', 'Báo cáo đã xong.', 0, 'Sai: sửa thành "The report has been finished."']
    ],
    practice: [
      ['The car ___ (is being / is) washed right now.', 'is being', 'Chiếc xe đang được rửa.'],
      ['The letters ___ (have been / has been) posted.', 'have been', 'Mấy lá thư đã được gửi.'],
      ['The results ___ (will be / will) published next week.', 'will be', 'Kết quả sẽ được công bố tuần sau.'],
      ['The office ___ (was being / was) cleaned when we came in.', 'was being', 'Văn phòng đang được dọn lúc chúng tôi vào.'],
      ['This problem ___ (has been / has) solved already.', 'has been', 'Vấn đề này đã được giải quyết rồi.'],
      ['A new hospital ___ (is going to be / is going) built here.', 'is going to be', 'Một bệnh viện mới sắp được xây ở đây.'],
      ['The documents ___ (have been / are been) checked twice.', 'have been', 'Tài liệu đã được kiểm tra hai lần.'],
      ['My laptop ___ (is being / is been) repaired at the moment.', 'is being', 'Máy tính của tôi đang được sửa.'],
      ['The meeting ___ (will be / will been) held online.', 'will be', 'Cuộc họp sẽ được tổ chức trực tuyến.'],
      ['The bill ___ (has been / has) paid, thank you.', 'has been', 'Hoá đơn đã được thanh toán rồi, cảm ơn.']
    ]
  },

  {
    slug: 'passive-agent',
    en: 'The agent: when to say "by"',
    vi: '"by + tác nhân" — khi nào nêu, khi nào bỏ',
    level: 'B1',
    summary: 'Phần lớn câu bị động KHÔNG có "by". Chỉ nêu tác nhân khi đó là thông tin mới và đáng chú ý.',
    formula: {
      rows: [
        ['Nêu tác nhân', 'khi đó là thông tin mới: "The novel was written by a teenager."'],
        ['Bỏ tác nhân', 'khi không biết, hiển nhiên, hoặc không quan trọng'],
        ['Công cụ dùng "with"', '"It was cut with a knife" — với là dụng cụ, không phải người làm'],
        ['Tác nhân chung chung', 'bỏ hẳn: "English is spoken here" (không cần "by people")']
      ],
      note: 'Ước lượng trong văn bản thật, khoảng bốn phần năm câu bị động không có "by". Thêm "by someone", "by people" là thừa và làm câu nặng.'
    },
    signals: ['by', 'with', 'was written by', 'is spoken'],
    useWhen: [
      'Tác nhân là thông tin mới hoặc bất ngờ.',
      'Nêu tác giả, nhà thiết kế, người phát minh.',
      'Đối chiếu hai tác nhân khác nhau trong cùng một đoạn.'
    ],
    useNot: [
      { what: 'Không thêm "by someone" hay "by people".', why: 'Thừa hẳn: "My bike was stolen by someone" nên rút thành "My bike was stolen".' },
      { what: 'Không dùng "by" cho dụng cụ.', why: 'Dụng cụ đi với "with": "The cake was cut with a knife", không phải "by a knife".' }
    ],
    confuse: [
      {
        with: 'by và with',
        tell: '"by" đi với người hoặc lực gây ra hành động; "with" đi với dụng cụ hoặc chất liệu.',
        pair: [
          { en: 'The window was broken by a boy.', vi: 'Cửa sổ bị một cậu bé làm vỡ. (người làm)' },
          { en: 'The window was broken with a stone.', vi: 'Cửa sổ bị đập vỡ bằng một hòn đá. (dụng cụ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'My phone was stolen by someone yesterday.', right: 'My phone was stolen yesterday.', why: '"by someone" không thêm thông tin gì nên bỏ đi.' },
      { wrong: 'The letter was written by a pen.', right: 'The letter was written with a pen.', why: 'Bút là dụng cụ nên dùng "with".' }
    ],
    examples: [
      ['This song was written by a fifteen-year-old.', 'Bài hát này do một cậu bé mười lăm tuổi sáng tác.', 1, 'Tác nhân là thông tin đáng chú ý.'],
      ['My bike was stolen last week.', 'Tuần trước xe đạp của tôi bị lấy trộm.', 1, 'Không biết ai lấy nên bỏ tác nhân.'],
      ['The vegetables were chopped with a sharp knife.', 'Rau được thái bằng con dao sắc.', 1, 'Dụng cụ nên dùng "with".'],
      ['English is spoken in over fifty countries.', 'Tiếng Anh được nói ở hơn năm mươi quốc gia.', 1, 'Tác nhân chung chung nên bỏ hẳn.'],
      ['My phone was stolen by someone yesterday.', 'Hôm qua điện thoại tôi bị lấy trộm.', 0, 'Sai: thừa. Sửa thành "My phone was stolen yesterday."'],
      ['The letter was written by a pen.', 'Lá thư được viết bằng bút.', 0, 'Sai: sửa thành "written with a pen".']
    ],
    practice: [
      ['The painting was created ___ (by / with) a local artist.', 'by', 'Bức tranh do một hoạ sĩ địa phương vẽ.'],
      ['The bread was cut ___ (by / with) a bread knife.', 'with', 'Bánh mì được cắt bằng dao chuyên dụng.'],
      ['My car ___ (was damaged / was damaged by someone) in the car park.', 'was damaged', 'Xe tôi bị hỏng ở bãi đỗ.'],
      ['The report was signed ___ (by / with) the director.', 'by', 'Báo cáo do giám đốc ký.'],
      ['Rice ___ (is eaten / is eaten by people) all over Asia.', 'is eaten', 'Gạo được ăn khắp châu Á.'],
      ['The wall was painted ___ (by / with) a roller.', 'with', 'Bức tường được sơn bằng con lăn.'],
      ['This law was passed ___ (by / with) parliament in 2019.', 'by', 'Luật này được quốc hội thông qua năm 2019.'],
      ['The window ___ (was broken / was broken by something) during the storm.', 'was broken', 'Cửa sổ bị vỡ trong cơn bão.'],
      ['The soup was flavoured ___ (by / with) fresh herbs.', 'with', 'Món canh được nêm bằng rau thơm tươi.'],
      ['The building was designed ___ (by / with) a Japanese architect.', 'by', 'Toà nhà do một kiến trúc sư Nhật thiết kế.']
    ]
  },

  {
    slug: 'reported-questions',
    en: 'Reported questions',
    vi: 'Câu hỏi tường thuật',
    level: 'B1',
    summary: 'Câu hỏi khi kể lại trở thành câu kể: bỏ đảo ngữ, bỏ trợ động từ do/does/did, bỏ dấu hỏi.',
    formula: {
      rows: [
        ['Có từ hỏi', 'asked + từ hỏi + S + V: "He asked where I lived."'],
        ['Không có từ hỏi', 'asked + if / whether + S + V: "She asked if I was ready."'],
        ['Bỏ do, does, did', '"Do you live here?" → "asked if I lived there"'],
        ['Không đảo ngữ, không dấu hỏi', 'trật tự y như câu kể']
      ],
      note: 'Đây là chỗ sai nhiều nhất cả nhóm vì tiếng Việt giữ nguyên câu hỏi khi kể lại. Nhớ một câu: câu hỏi tường thuật KHÔNG còn hình dạng câu hỏi nữa.'
    },
    signals: ['asked', 'wanted to know', 'wondered', 'if', 'whether'],
    useWhen: [
      'Kể lại câu hỏi của người khác.',
      'Viết biên bản phỏng vấn, báo cáo trao đổi.',
      '"whether" khi nêu hai lựa chọn hoặc trong văn trang trọng.'
    ],
    useNot: [
      { what: 'Không giữ trật tự đảo ngữ của câu hỏi.', why: '"He asked me where did I live" là lỗi kinh điển; đúng là "where I lived".' },
      { what: 'Không giữ trợ động từ do, does, did.', why: 'Chúng biến mất hoàn toàn khi tường thuật.' },
      { what: 'Không đặt dấu hỏi ở cuối.', why: 'Câu tường thuật là câu kể nên kết bằng dấu chấm.' }
    ],
    confuse: [
      {
        with: 'câu hỏi trực tiếp',
        tell: 'Trực tiếp thì đảo ngữ và có dấu hỏi; tường thuật thì trật tự câu kể và dấu chấm.',
        pair: [
          { en: 'He asked, "Where do you live?"', vi: 'Anh ấy hỏi: "Bạn sống ở đâu?" (trực tiếp)' },
          { en: 'He asked where I lived.', vi: 'Anh ấy hỏi tôi sống ở đâu. (tường thuật)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She asked me where did I work.', right: 'She asked me where I worked.', why: 'Bỏ đảo ngữ và bỏ "did"; dùng trật tự câu kể.' },
      { wrong: 'He asked me that I was ready.', right: 'He asked me if I was ready.', why: 'Câu hỏi không có từ hỏi thì dùng "if" hoặc "whether", không dùng "that".' }
    ],
    examples: [
      ['She asked where I lived.', 'Cô ấy hỏi tôi sống ở đâu.', 1, 'Có từ hỏi, trật tự câu kể.'],
      ['He asked if I could help him.', 'Anh ấy hỏi tôi có giúp được không.', 1, 'Không có từ hỏi nên dùng "if".'],
      ['They wanted to know when the shop opened.', 'Họ muốn biết cửa hàng mở lúc mấy giờ.', 1, '"wanted to know" thay cho "asked".'],
      ['She asked whether I preferred tea or coffee.', 'Cô ấy hỏi tôi thích trà hay cà phê.', 1, '"whether" khi có hai lựa chọn.'],
      ['She asked me where did I work.', 'Cô ấy hỏi tôi làm ở đâu.', 0, 'Sai: sửa thành "She asked me where I worked."'],
      ['He asked me that I was ready.', 'Anh ấy hỏi tôi đã sẵn sàng chưa.', 0, 'Sai: sửa thành "He asked me if I was ready."']
    ],
    practice: [
      ['He asked me where ___ (I lived / did I live).', 'I lived', 'Anh ấy hỏi tôi sống ở đâu.'],
      ['She asked ___ (if / that) I wanted a drink.', 'if', 'Cô ấy hỏi tôi có muốn uống gì không.'],
      ['They asked what time ___ (the film started / did the film start).', 'the film started', 'Họ hỏi phim bắt đầu lúc mấy giờ.'],
      ['I asked her ___ (whether / that) she had finished.', 'whether', 'Tôi hỏi cô ấy đã xong chưa.'],
      ['He wanted to know why ___ (I was late / was I late).', 'I was late', 'Anh ấy muốn biết vì sao tôi tới muộn.'],
      ['She asked me if I ___ (had / have) seen the news.', 'had', 'Cô ấy hỏi tôi đã xem tin chưa.'],
      ['They asked how much ___ (it cost / did it cost).', 'it cost', 'Họ hỏi cái đó giá bao nhiêu.'],
      ['He asked me who ___ (had called / did call).', 'had called', 'Anh ấy hỏi ai đã gọi.'],
      ['She wondered ___ (if / what if) the shop was still open.', 'if', 'Cô ấy tự hỏi không biết cửa hàng còn mở không.'],
      ['I asked them where ___ (they were going / were they going).', 'they were going', 'Tôi hỏi họ đang đi đâu.']
    ]
  },

  {
    slug: 'reported-commands',
    en: 'Reported commands and requests',
    vi: 'Tường thuật mệnh lệnh, yêu cầu và lời khuyên',
    level: 'B1',
    summary: 'Mệnh lệnh khi kể lại thành "động từ + tân ngữ + to + V". Phủ định đặt "not" trước "to".',
    formula: {
      rows: [
        ['Khẳng định', 'told / asked + tân ngữ + to + V: "She told me to wait."'],
        ['Phủ định', '+ not to + V: "He asked me not to leave."'],
        ['Nhóm động từ dẫn', 'tell, ask, advise, warn, remind, order, beg, encourage'],
        ['Sắc thái', 'tell = bảo · ask = nhờ · order = ra lệnh · beg = nài nỉ']
      ],
      note: 'Nhóm này bắt buộc có tân ngữ chỉ người ngay sau động từ: "He told to wait" thiếu người nghe. Riêng "suggest" KHÔNG theo mẫu này — nói "suggested that we wait" hoặc "suggested waiting".'
    },
    signals: ['told me to', 'asked me to', 'advised me to', 'warned me not to', 'reminded me to'],
    useWhen: [
      'Kể lại một mệnh lệnh, lời nhờ hay lời khuyên.',
      'Chọn động từ dẫn đúng sắc thái để người đọc hiểu mức độ.',
      'Viết báo cáo về chỉ đạo trong công việc.'
    ],
    useNot: [
      { what: 'Không bỏ tân ngữ chỉ người.', why: '"She told to sit down" sai; phải là "She told me to sit down".' },
      { what: 'Không đặt "not" sai chỗ.', why: '"He asked me to not go" nghe vụng; chuẩn là "He asked me not to go".' },
      { what: 'Không dùng mẫu này với "suggest".', why: '"He suggested me to go" luôn sai; nói "He suggested that I go" hoặc "He suggested going".' }
    ],
    confuse: [
      {
        with: 'tell và ask',
        tell: '"tell" mang giọng bảo ban hoặc ra lệnh; "ask" là nhờ vả, lịch sự hơn.',
        pair: [
          { en: 'The teacher told us to be quiet.', vi: 'Cô giáo bảo chúng tôi giữ trật tự. (mệnh lệnh)' },
          { en: 'She asked us to be quiet.', vi: 'Cô ấy nhờ chúng tôi giữ trật tự. (lời nhờ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She told to close the door.', right: 'She told me to close the door.', why: '"tell" bắt buộc có tân ngữ chỉ người.' },
      { wrong: 'He suggested me to take a taxi.', right: 'He suggested that I take a taxi.', why: '"suggest" không theo mẫu "tân ngữ + to + V".' }
    ],
    examples: [
      ['The doctor advised me to rest for a week.', 'Bác sĩ khuyên tôi nghỉ một tuần.', 1, '"advise" + tân ngữ + to + V.'],
      ['She asked me not to tell anyone.', 'Cô ấy nhờ tôi đừng nói với ai.', 1, 'Phủ định đặt "not" trước "to".'],
      ['He reminded us to bring our passports.', 'Anh ấy nhắc chúng tôi mang hộ chiếu.', 1, '"remind" nhấn việc nhắc nhở.'],
      ['The guard warned them not to go any further.', 'Người bảo vệ cảnh báo họ đừng đi tiếp.', 1, '"warn" mang sắc thái cảnh báo.'],
      ['She told to close the door.', 'Cô ấy bảo đóng cửa lại.', 0, 'Sai: sửa thành "She told me to close the door."'],
      ['He suggested me to take a taxi.', 'Anh ấy khuyên tôi bắt taxi.', 0, 'Sai: sửa thành "He suggested that I take a taxi."']
    ],
    practice: [
      ['She told ___ (me to wait / to wait) outside.', 'me to wait', 'Cô ấy bảo tôi đợi bên ngoài.'],
      ['He asked me ___ (not to / to not) touch anything.', 'not to', 'Anh ấy nhờ tôi đừng chạm vào thứ gì.'],
      ['The nurse advised him ___ (to drink / drinking) more water.', 'to drink', 'Y tá khuyên anh ấy uống nhiều nước hơn.'],
      ['My father reminded me ___ (to lock / locking) the door.', 'to lock', 'Bố tôi nhắc tôi khoá cửa.'],
      ['They warned us ___ (not to swim / to not swim) there.', 'not to swim', 'Họ cảnh báo chúng tôi đừng bơi ở đó.'],
      ['She ___ (suggested that we leave / suggested us to leave) early.', 'suggested that we leave', 'Cô ấy đề nghị chúng tôi đi sớm.'],
      ['The officer ordered them ___ (to stop / stopping).', 'to stop', 'Viên sĩ quan ra lệnh cho họ dừng lại.'],
      ['He begged her ___ (to stay / that she stay).', 'to stay', 'Anh ấy nài nỉ cô ấy ở lại.'],
      ['The teacher ___ (told / said) us to open our books.', 'told', 'Thầy giáo bảo chúng tôi mở sách ra.'],
      ['She encouraged me ___ (to apply / applying) for the job.', 'to apply', 'Cô ấy động viên tôi nộp đơn xin việc.']
    ]
  },

  {
    slug: 'reported-shifts',
    en: 'Shifting pronouns, time and place',
    vi: 'Chuyển đại từ, thời gian và nơi chốn',
    level: 'B1',
    summary: 'Lùi thì mới là một nửa việc. Đại từ, trạng ngữ thời gian và nơi chốn cũng phải đổi theo góc nhìn người kể.',
    formula: {
      rows: [
        ['Đại từ', 'I → he/she · we → they · my → his/her · you → me/him/her'],
        ['Thời gian', 'now → then · today → that day · tomorrow → the next day · yesterday → the day before'],
        ['Nơi chốn', 'here → there · this → that · these → those'],
        ['Chỉ đổi khi hoàn cảnh đã đổi', 'kể ngay tại chỗ, ngay hôm đó thì giữ nguyên']
      ],
      note: 'Đừng đổi máy móc. Nếu kể lại ngay trong ngày và vẫn ở đúng chỗ đó thì "today" và "here" giữ nguyên. Đổi hay không phụ thuộc vào việc hoàn cảnh kể đã khác hoàn cảnh nói hay chưa.'
    },
    signals: ['then', 'that day', 'the next day', 'the day before', 'there'],
    useWhen: [
      'Kể lại lời nói ở một thời điểm hoặc địa điểm khác.',
      'Viết tường thuật, biên bản, tóm tắt hội thoại đã qua.',
      'Giữ nguyên trạng ngữ khi hoàn cảnh chưa đổi.'
    ],
    useNot: [
      { what: 'Không đổi trạng ngữ khi hoàn cảnh chưa đổi.', why: 'Đang ở cùng chỗ và cùng ngày thì "He said he would come here today" hoàn toàn tự nhiên.' },
      { what: 'Không quên đổi đại từ.', why: 'Giữ nguyên "I" khi kể về người khác làm câu tối nghĩa: "He said I was tired" hoá ra là tôi mệt.' }
    ],
    confuse: [
      {
        with: 'đổi và không đổi trạng ngữ',
        tell: 'Câu hỏi để quyết định: hoàn cảnh lúc kể có còn giống lúc nói không?',
        pair: [
          { en: 'This morning he said, "I am busy today." → He said he was busy today.', vi: 'Sáng nay anh ấy nói bận, và vẫn đang trong ngày đó nên giữ "today".' },
          { en: 'Last week he said, "I am busy today." → He said he was busy that day.', vi: 'Kể lại sau một tuần nên "today" đổi thành "that day".' }
        ]
      }
    ],
    errors: [
      { wrong: 'He said, "I will see you tomorrow." → He said he would see me tomorrow. (kể lại sau ba ngày)', right: 'He said he would see me the next day.', why: 'Kể sau ba ngày thì "tomorrow" không còn là ngày mai nữa.' },
      { wrong: 'She said, "I live here." → She said she lived here. (kể ở nơi khác)', right: 'She said she lived there.', why: 'Đã đổi chỗ nên "here" phải thành "there".' }
    ],
    examples: [
      ['She said she would call me the next day.', 'Cô ấy nói hôm sau sẽ gọi cho tôi.', 1, '"tomorrow" đổi thành "the next day".'],
      ['He told me he had seen her the day before.', 'Anh ấy bảo tôi hôm trước đã gặp cô ta.', 1, '"yesterday" đổi thành "the day before".'],
      ['They said they liked living there.', 'Họ nói họ thích sống ở đó.', 1, '"here" đổi thành "there" vì đã kể ở nơi khác.'],
      ['He phoned this morning and said he was busy today.', 'Sáng nay anh ấy gọi và nói hôm nay anh ấy bận.', 1, 'Vẫn trong ngày nên giữ "today".'],
      ['Last week he said he would see me tomorrow.', 'Tuần trước anh ấy nói mai sẽ gặp tôi.', 0, 'Sai: kể sau một tuần thì sửa thành "the next day".'],
      ['She wrote from Hue and said she lived here.', 'Cô ấy viết thư từ Huế và nói cô ấy sống ở đây.', 0, 'Sai: người kể không ở Huế nên sửa thành "she lived there".']
    ],
    practice: [
      ['He said he would come ___ (the next day / tomorrow), but that was a month ago.', 'the next day', 'Anh ấy nói hôm sau sẽ tới, nhưng đó là chuyện tháng trước.'],
      ['She said she had arrived ___ (the day before / yesterday), speaking to us a week later.', 'the day before', 'Cô ấy nói hôm trước đã tới, kể với chúng tôi một tuần sau.'],
      ['They said they were happy ___ (there / here), writing from abroad.', 'there', 'Họ viết thư từ nước ngoài nói họ sống ở đó vui.'],
      ['He said, "I am tired." → He said ___ (he was / I was) tired.', 'he was', 'Anh ấy nói anh ấy mệt.'],
      ['She said, "We live in Hanoi." → She said ___ (they lived / we live) in Hanoi.', 'they lived', 'Cô ấy nói họ sống ở Hà Nội.'],
      ['He said the meeting was ___ (that day / today), telling me a month later.', 'that day', 'Anh ấy nói cuộc họp hôm đó, kể với tôi một tháng sau.'],
      ['She called an hour ago and said she was busy ___ (today / that day).', 'today', 'Cô ấy gọi cách đây một tiếng và nói hôm nay bận.'],
      ['He said, "This is my seat." → He said ___ (that was / this is) his seat.', 'that was', 'Anh ấy nói đó là chỗ của anh ấy.'],
      ['They said they would leave ___ (the following week / next week), speaking last year.', 'the following week', 'Năm ngoái họ nói tuần sau đó sẽ đi.'],
      ['She said, "I saw you here." → She said she had seen me ___ (there / here), told in another city.', 'there', 'Cô ấy nói đã gặp tôi ở đó.']
    ]
  },

  /* ==================== B2 ==================== */

  {
    slug: 'backshift-exceptions',
    en: 'When NOT to backshift',
    vi: 'Khi nào KHÔNG lùi thì',
    level: 'B2',
    summary: 'Lùi thì không phải là luật cứng. Bốn trường hợp giữ nguyên thì gốc, và giữ nguyên còn tự nhiên hơn.',
    formula: {
      rows: [
        ['Sự thật vẫn đúng', '"He said water boils at 100 degrees." — không lùi'],
        ['Động từ dẫn ở hiện tại', '"She says she is busy." — không lùi'],
        ['Quá khứ hoàn thành', 'đã lùi hết mức, không lùi thêm được nữa'],
        ['Khuyết thiếu đã ở dạng quá khứ', 'would, could, should, might, ought to giữ nguyên']
      ],
      note: '"must" khi chỉ bắt buộc thì lùi thành "had to"; khi chỉ suy đoán thì giữ nguyên "must": "He said she must be tired."'
    },
    signals: ['says', 'has told me', 'still true', 'would', 'could', 'might'],
    useWhen: [
      'Điều được nói vẫn còn đúng ở thời điểm kể.',
      'Động từ dẫn ở hiện tại hoặc hiện tại hoàn thành.',
      'Câu gốc đã ở quá khứ hoàn thành.',
      'Câu gốc dùng would, could, should, might, ought to.'
    ],
    useNot: [
      { what: 'Không lùi thì khi động từ dẫn ở hiện tại.', why: '"She says she was busy" đổi nghĩa: hoá ra lúc trước cô ấy bận, không phải bây giờ.' },
      { what: 'Không cố lùi "would" thành gì khác.', why: 'Nó đã là dạng quá khứ của "will", không có bậc thấp hơn.' }
    ],
    confuse: [
      {
        with: 'lùi thì và giữ nguyên khi sự thật còn đúng',
        tell: 'Cả hai đều chấp nhận được, nhưng giữ nguyên khẳng định rằng điều đó vẫn đúng đến giờ.',
        pair: [
          { en: 'He said the earth goes round the sun.', vi: 'Anh ấy nói trái đất quay quanh mặt trời. (vẫn đúng)' },
          { en: 'He said he was living in Hue.', vi: 'Anh ấy nói lúc đó anh ấy đang sống ở Huế. (có thể giờ đã khác)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She says she was very busy at the moment.', right: 'She says she is very busy at the moment.', why: 'Động từ dẫn ở hiện tại nên không lùi thì.' },
      { wrong: 'He said he would could help us.', right: 'He said he could help us.', why: '"could" đã là dạng lùi, không lùi thêm.' }
    ],
    examples: [
      ['She says she is on her way.', 'Cô ấy nói đang trên đường tới.', 1, 'Động từ dẫn ở hiện tại nên giữ nguyên.'],
      ['The guide explained that Hue is the old capital.', 'Hướng dẫn viên giải thích rằng Huế là cố đô.', 1, 'Sự thật vẫn đúng nên không lùi.'],
      ['He said he had already eaten.', 'Anh ấy nói đã ăn rồi.', 1, 'Quá khứ hoàn thành đã lùi hết mức.'],
      ['She said she might be late.', 'Cô ấy nói có thể sẽ tới muộn.', 1, '"might" giữ nguyên.'],
      ['She says she was very busy at the moment.', 'Cô ấy nói lúc này rất bận.', 0, 'Sai: sửa thành "She says she is very busy at the moment."'],
      ['He said he would could help us.', 'Anh ấy nói có thể giúp chúng tôi.', 0, 'Sai: sửa thành "He said he could help us."']
    ],
    practice: [
      ['She says she ___ (is / was) coming tonight.', 'is', 'Cô ấy nói tối nay sẽ tới.'],
      ['The teacher explained that light ___ (travels / travelled) faster than sound.', 'travels', 'Thầy giáo giải thích ánh sáng đi nhanh hơn âm thanh.'],
      ['He said he ___ (could / can) swim when he was five.', 'could', 'Anh ấy nói năm tuổi đã biết bơi.'],
      ['She has told me she ___ (needs / needed) more time.', 'needs', 'Cô ấy đã bảo tôi là cô ấy cần thêm thời gian.'],
      ['He said he ___ (had finished / finished had) before we arrived.', 'had finished', 'Anh ấy nói đã xong trước khi chúng tôi tới.'],
      ['They said they ___ (would / will) let us know.', 'would', 'Họ nói sẽ báo cho chúng tôi.'],
      ['She says the shop ___ (opens / opened) at nine every day.', 'opens', 'Cô ấy nói cửa hàng mở lúc chín giờ mỗi ngày.'],
      ['He said we ___ (should / shall) book early.', 'should', 'Anh ấy nói chúng ta nên đặt sớm.'],
      ['He said she ___ (must / had to) be tired after the flight.', 'must', 'Anh ấy nói chắc cô ấy mệt sau chuyến bay.'],
      ['The manager says the meeting ___ (is / was) at three.', 'is', 'Quản lý nói cuộc họp lúc ba giờ.']
    ]
  },

  {
    slug: 'passive-modals',
    en: 'Passive with modals and infinitives',
    vi: 'Bị động với khuyết thiếu và nguyên thể',
    level: 'B2',
    summary: 'Ghép bị động vào sau khuyết thiếu hoặc nguyên thể để viết quy định và hướng dẫn mà không nêu ai làm.',
    formula: {
      rows: [
        ['Khuyết thiếu', 'must / should / can + be + V3: "Forms must be signed."'],
        ['Khuyết thiếu quá khứ', 'should / must + have been + V3'],
        ['Nguyên thể', 'to be + V3: "He wants to be promoted."'],
        ['Danh động từ', 'being + V3: "She hates being interrupted."']
      ],
      note: 'Nhớ đúng chuỗi: khuyết thiếu + be + V3 ở hiện tại, khuyết thiếu + have been + V3 ở quá khứ. Bỏ "be" hay "been" là hỏng câu.'
    },
    signals: ['must be', 'should be', 'can be', 'to be', 'being', 'should have been'],
    useWhen: [
      'Viết nội quy, hướng dẫn sử dụng, quy trình.',
      'Nói điều lẽ ra đã phải được làm: "It should have been checked."',
      'Sau động từ đòi nguyên thể: want, expect, hope, need.',
      'Sau giới từ hoặc động từ đòi danh động từ: avoid, hate, risk.'
    ],
    useNot: [
      { what: 'Không bỏ "be" sau khuyết thiếu.', why: '"The form must signed" sai; phải là "must be signed".' },
      { what: 'Không dùng "be" thay cho "been" sau "have".', why: '"should have be done" sai; đúng là "should have been done".' }
    ],
    confuse: [
      {
        with: 'bị động hiện tại và bị động quá khứ với khuyết thiếu',
        tell: 'Thêm "have" là chuyển sang chuyện lẽ ra đã phải xong.',
        pair: [
          { en: 'The report must be submitted by Friday.', vi: 'Báo cáo phải nộp trước thứ Sáu. (còn kịp)' },
          { en: 'The report should have been submitted last week.', vi: 'Lẽ ra báo cáo phải nộp tuần trước. (đã trễ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'All luggage must checked at the gate.', right: 'All luggage must be checked at the gate.', why: 'Thiếu "be" trong cấu trúc bị động.' },
      { wrong: 'The error should have be corrected.', right: 'The error should have been corrected.', why: 'Sau "have" là "been", không phải "be".' }
    ],
    examples: [
      ['Applications must be submitted online.', 'Hồ sơ phải được nộp trực tuyến.', 1, 'Khuyết thiếu + be + V3.'],
      ['This medicine should be kept in a cool place.', 'Thuốc này nên được để nơi mát.', 1, 'Hướng dẫn sử dụng.'],
      ['The problem could have been avoided.', 'Vấn đề đó lẽ ra tránh được.', 1, 'Bị động quá khứ với khuyết thiếu.'],
      ['She hates being interrupted while working.', 'Cô ấy ghét bị ngắt lời lúc đang làm việc.', 1, 'Danh động từ bị động.'],
      ['All luggage must checked at the gate.', 'Mọi hành lý phải được kiểm tra ở cửa.', 0, 'Sai: sửa thành "must be checked".'],
      ['The error should have be corrected.', 'Lẽ ra lỗi đó phải được sửa.', 0, 'Sai: sửa thành "should have been corrected".']
    ],
    practice: [
      ['The door must ___ (be / – ) locked at night.', 'be', 'Ban đêm cửa phải được khoá.'],
      ['This form can ___ (be / been) downloaded online.', 'be', 'Mẫu đơn này tải được trên mạng.'],
      ['The mistake should have ___ (been / be) noticed earlier.', 'been', 'Lẽ ra lỗi đó phải được phát hiện sớm hơn.'],
      ['He expects ___ (to be / to been) told the results today.', 'to be', 'Anh ấy mong hôm nay được báo kết quả.'],
      ['Nobody likes ___ (being / to been) criticised.', 'being', 'Chẳng ai thích bị phê bình.'],
      ['These files must ___ (be / being) backed up daily.', 'be', 'Mấy tệp này phải được sao lưu hằng ngày.'],
      ['The damage could ___ (have been / have) prevented.', 'have been', 'Thiệt hại lẽ ra ngăn được.'],
      ['She wants ___ (to be / being) considered for the role.', 'to be', 'Cô ấy muốn được cân nhắc cho vai trò đó.'],
      ['Payments may ___ (be / been) made by card.', 'be', 'Có thể thanh toán bằng thẻ.'],
      ['The road ought to ___ (have been / be been) repaired years ago.', 'have been', 'Lẽ ra con đường phải được sửa từ nhiều năm trước.']
    ]
  },

  {
    slug: 'passive-two-objects',
    en: 'Passive with two objects',
    vi: 'Bị động với động từ hai tân ngữ',
    level: 'B2',
    summary: 'Động từ như give, send, offer có hai tân ngữ nên đổi sang bị động được hai cách. Tiếng Anh chuộng đưa NGƯỜI lên làm chủ ngữ.',
    formula: {
      rows: [
        ['Chủ động', 'They gave him a prize.'],
        ['Bị động cách 1 (hay dùng)', 'He was given a prize.'],
        ['Bị động cách 2', 'A prize was given to him.'],
        ['Nhóm động từ', 'give, send, offer, show, tell, lend, pay, promise, teach']
      ],
      note: 'Cách 1 thông dụng hơn hẳn vì tiếng Anh thích đặt người lên đầu câu. Cách 2 chỉ dùng khi muốn nhấn vào vật, và bắt buộc phải có "to" hoặc "for" trước người.'
    },
    signals: ['was given', 'was sent', 'was offered', 'was shown', 'was told'],
    useWhen: [
      'Nhấn vào người nhận: "She was offered the job."',
      'Nhấn vào vật khi vật mới là thông tin chính: "The letter was sent to the wrong address."',
      'Tránh nêu ai là người trao, cho, gửi.'
    ],
    useNot: [
      { what: 'Không bỏ "to" ở cách 2.', why: '"A prize was given him" nghe cổ; văn hiện đại viết "was given to him".' },
      { what: 'Không dùng bị động với động từ chỉ một tân ngữ theo mẫu này.', why: '"explain" và "describe" không nhận người làm tân ngữ trực tiếp: "I was explained the rule" sai; nói "The rule was explained to me".' }
    ],
    confuse: [
      {
        with: 'hai cách chuyển bị động',
        tell: 'Cách nào cũng đúng, khác ở chỗ nhấn mạnh. Đưa cái nào lên đầu là nhấn cái đó.',
        pair: [
          { en: 'She was given a scholarship.', vi: 'Cô ấy được cấp một suất học bổng. (nhấn vào cô ấy)' },
          { en: 'A scholarship was given to her.', vi: 'Một suất học bổng đã được trao cho cô ấy. (nhấn vào học bổng)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I was explained the new rule.', right: 'The new rule was explained to me.', why: '"explain" không nhận người làm tân ngữ trực tiếp.' },
      { wrong: 'A certificate was given him.', right: 'A certificate was given to him.', why: 'Cách 2 cần "to" trước người nhận.' }
    ],
    examples: [
      ['He was offered a job in Da Nang.', 'Anh ấy được mời làm việc ở Đà Nẵng.', 1, 'Người lên làm chủ ngữ, cách thông dụng.'],
      ['The parcel was sent to the wrong address.', 'Kiện hàng bị gửi nhầm địa chỉ.', 1, 'Vật lên làm chủ ngữ vì địa chỉ mới là điểm chính.'],
      ['We were told the news yesterday.', 'Hôm qua chúng tôi được báo tin đó.', 1, '"tell" đưa người lên làm chủ ngữ.'],
      ['The rules were explained to us clearly.', 'Các quy định được giải thích rõ cho chúng tôi.', 1, '"explain" bắt buộc dùng "to + người".'],
      ['I was explained the new rule.', 'Tôi được giải thích quy định mới.', 0, 'Sai: sửa thành "The new rule was explained to me."'],
      ['A certificate was given him.', 'Một chứng chỉ đã được trao cho anh ấy.', 0, 'Sai: sửa thành "was given to him".']
    ],
    practice: [
      ['She ___ (was given / was gave) a prize for her essay.', 'was given', 'Cô ấy được trao giải cho bài luận.'],
      ['The keys were handed ___ (to / for) the new tenant.', 'to', 'Chìa khoá được giao cho người thuê mới.'],
      ['We ___ (were told / were said) to wait outside.', 'were told', 'Chúng tôi được bảo đợi bên ngoài.'],
      ['The plan was explained ___ (to / – ) the whole team.', 'to', 'Kế hoạch được giải thích cho cả nhóm.'],
      ['He ___ (was sent / was send) an email this morning.', 'was sent', 'Sáng nay anh ấy nhận được một email.'],
      ['A new laptop ___ (was offered to / was offered) each intern.', 'was offered to', 'Mỗi thực tập sinh được cấp một máy tính mới.'],
      ['They ___ (were shown / were showed) around the factory.', 'were shown', 'Họ được dẫn đi tham quan nhà máy.'],
      ['The money ___ (was paid to / was paid) the supplier last week.', 'was paid to', 'Tiền đã được trả cho nhà cung cấp tuần trước.'],
      ['I ___ (was taught / was teached) French at school.', 'was taught', 'Hồi đi học tôi được dạy tiếng Pháp.'],
      ['The situation ___ (was described to / was described) us in detail.', 'was described to', 'Tình hình được mô tả chi tiết cho chúng tôi.']
    ]
  },

  {
    slug: 'passive-impersonal',
    en: 'Impersonal passive: It is said that…',
    vi: 'Bị động phi ngôi — It is said that…',
    level: 'B2',
    summary: 'Nêu điều người ta nói mà không quy cho ai. Công cụ chuẩn của báo chí và văn học thuật khi nguồn tin chưa chắc.',
    formula: {
      rows: [
        ['Mẫu 1', 'It is said / believed / thought that + mệnh đề'],
        ['Mẫu 2', 'S + is said / believed + to + V: "He is said to be rich."'],
        ['Nói về quá khứ', 'S + is said + to have + V3: "He is said to have left."'],
        ['Nhóm động từ', 'say, believe, think, report, know, expect, consider, allege']
      ],
      note: 'Hai mẫu cùng nghĩa. Mẫu 1 giữ nguyên mệnh đề nên dễ viết; mẫu 2 gọn hơn và trang trọng hơn, hay gặp trong bản tin: "The suspect is believed to have fled the country."'
    },
    signals: ['It is said that', 'is believed to', 'is thought to', 'is reported to', 'allegedly'],
    useWhen: [
      'Nêu tin đồn hoặc thông tin chưa xác minh mà không chịu trách nhiệm về nguồn.',
      'Bản tin, báo chí, văn bản pháp lý.',
      'Bài học thuật khi thuật lại quan điểm chung trong ngành.'
    ],
    useNot: [
      { what: 'Không dùng khi đã biết rõ nguồn.', why: 'Biết ai nói thì nêu thẳng: "Professor Ha argues that…" đáng tin hơn "It is said that…".' },
      { what: 'Không quên "to have" khi nói chuyện quá khứ ở mẫu 2.', why: '"He is said to leave yesterday" sai; đúng là "He is said to have left yesterday".' }
    ],
    confuse: [
      {
        with: 'hai mẫu bị động phi ngôi',
        tell: 'Mẫu "It is said that" mở đầu bằng "It"; mẫu kia đưa chính chủ thể lên đầu câu.',
        pair: [
          { en: 'It is believed that he lives in Paris.', vi: 'Người ta tin rằng ông ấy sống ở Paris.' },
          { en: 'He is believed to live in Paris.', vi: 'Ông ấy được cho là sống ở Paris.' }
        ]
      }
    ],
    errors: [
      { wrong: 'He is said to be left the country last week.', right: 'He is said to have left the country last week.', why: 'Chuyện quá khứ dùng "to have + V3".' },
      { wrong: 'It is said he to be very wealthy.', right: 'It is said that he is very wealthy.', why: 'Mẫu "It is said" đi với mệnh đề đầy đủ, không trộn với mẫu nguyên thể.' }
    ],
    examples: [
      ['It is said that the castle is over 500 years old.', 'Người ta nói toà lâu đài này hơn 500 năm tuổi.', 1, 'Mẫu mệnh đề.'],
      ['The suspect is believed to have left the country.', 'Nghi phạm được cho là đã rời khỏi đất nước.', 1, 'Mẫu nguyên thể, nói chuyện quá khứ.'],
      ['She is thought to be one of the best in her field.', 'Cô ấy được xem là một trong những người giỏi nhất ngành.', 1, 'Mẫu nguyên thể ở hiện tại.'],
      ['It is reported that talks will resume next month.', 'Có tin cuộc đàm phán sẽ nối lại vào tháng sau.', 1, 'Văn phong bản tin.'],
      ['He is said to be left the country last week.', 'Anh ta được cho là đã rời khỏi nước tuần trước.', 0, 'Sai: sửa thành "He is said to have left the country last week."'],
      ['It is said he to be very wealthy.', 'Người ta nói ông ấy rất giàu.', 0, 'Sai: sửa thành "It is said that he is very wealthy."']
    ],
    practice: [
      ['It ___ (is said / says) that the road will close tomorrow.', 'is said', 'Nghe nói mai con đường sẽ đóng.'],
      ['He is believed ___ (to be / being) in his eighties.', 'to be', 'Ông ấy được cho là ngoài tám mươi.'],
      ['She is said ___ (to have written / to write) the book in a month.', 'to have written', 'Nghe nói cô ấy viết cuốn sách trong một tháng.'],
      ['It ___ (is thought / thinks) that prices will rise.', 'is thought', 'Người ta cho rằng giá sẽ tăng.'],
      ['The painting is known ___ (to be / to being) a forgery.', 'to be', 'Bức tranh được biết là đồ giả.'],
      ['It is reported ___ (that / to) two people were injured.', 'that', 'Có tin hai người bị thương.'],
      ['He is alleged ___ (to have taken / to take) the money.', 'to have taken', 'Ông ta bị cáo buộc đã lấy số tiền đó.'],
      ['They are expected ___ (to arrive / arriving) this evening.', 'to arrive', 'Họ được cho là sẽ tới tối nay.'],
      ['It ___ (is considered / considers) rude to point.', 'is considered', 'Chỉ tay bị coi là bất lịch sự.'],
      ['The company is said ___ (to be losing / to lose) money.', 'to be losing', 'Nghe nói công ty đang thua lỗ.']
    ]
  },

  {
    slug: 'have-get-done',
    en: 'have / get something done',
    vi: 'have · get something done — nhờ người khác làm',
    level: 'B2',
    summary: 'Nói việc mình thuê hoặc nhờ người khác làm, chứ không tự làm. Cùng cấu trúc đó còn dùng để kể chuyện rủi ro.',
    formula: {
      rows: [
        ['Nhờ làm', 'have + vật + V3: "I had my car repaired."'],
        ['Thân mật hơn', 'get + vật + V3: "I got my hair cut."'],
        ['Chuyện rủi ro', 'have + vật + V3: "She had her bag stolen."'],
        ['Nghi vấn và phủ định', 'dùng do/does/did: "Did you have the car serviced?"']
      ],
      note: 'Cùng một cấu trúc mà hai nghĩa: chủ động nhờ ("I had my hair cut") hay gặp chuyện không may ("I had my phone stolen"). Ngữ cảnh quyết định — không ai tự nhờ người khác trộm đồ của mình.'
    },
    signals: ['have it done', 'get it fixed', 'had my hair cut', 'had my bag stolen'],
    useWhen: [
      'Nói về dịch vụ mình thuê: sửa xe, cắt tóc, giặt đồ.',
      'Kể chuyện không may xảy ra với đồ của mình.',
      '"get" thay "have" trong lối nói thân mật.'
    ],
    useNot: [
      { what: 'Không đảo thứ tự vật và phân từ.', why: '"I had repaired my car" nghĩa là chính tôi đã sửa; "I had my car repaired" mới là nhờ thợ.' },
      { what: 'Không quên trợ động từ ở câu hỏi.', why: '"Have you your car serviced?" sai; đúng là "Did you have your car serviced?"' }
    ],
    confuse: [
      {
        with: 'tự làm và nhờ người làm',
        tell: 'Vị trí của vật quyết định nghĩa. Vật đứng trước phân từ là nhờ người khác làm.',
        pair: [
          { en: 'I repaired my car.', vi: 'Tôi tự sửa xe.' },
          { en: 'I had my car repaired.', vi: 'Tôi mang xe đi sửa. (thợ sửa)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Yesterday I cut my hair at the salon.', right: 'Yesterday I had my hair cut at the salon.', why: 'Câu đầu nghĩa là tự cắt tóc; ra tiệm thì dùng "had my hair cut".' },
      { wrong: 'I had repaired my laptop by a technician.', right: 'I had my laptop repaired by a technician.', why: 'Vật phải đứng trước phân từ.' }
    ],
    examples: [
      ['I had my car serviced last week.', 'Tuần trước tôi mang xe đi bảo dưỡng.', 1, 'Nhờ dịch vụ làm.'],
      ['She gets her nails done every month.', 'Tháng nào cô ấy cũng đi làm móng.', 1, '"get" thân mật hơn.'],
      ['They had their house painted before moving in.', 'Họ cho sơn nhà trước khi dọn vào.', 1, 'Thuê người sơn.'],
      ['He had his wallet stolen on the train.', 'Anh ấy bị móc ví trên tàu.', 1, 'Nghĩa chuyện không may.'],
      ['Yesterday I cut my hair at the salon.', 'Hôm qua tôi đi cắt tóc ở tiệm.', 0, 'Sai nghĩa: sửa thành "I had my hair cut at the salon."'],
      ['I had repaired my laptop by a technician.', 'Tôi nhờ thợ sửa máy tính.', 0, 'Sai trật tự: sửa thành "I had my laptop repaired by a technician."']
    ],
    practice: [
      ['I need to have my glasses ___ (fixed / fix).', 'fixed', 'Tôi cần mang kính đi sửa.'],
      ['She had her photo ___ (taken / took) for the passport.', 'taken', 'Cô ấy đi chụp ảnh làm hộ chiếu.'],
      ['We are getting the kitchen ___ (redecorated / redecorate).', 'redecorated', 'Chúng tôi đang cho sửa lại bếp.'],
      ['He ___ (had / has) his bike stolen last night.', 'had', 'Đêm qua anh ấy bị mất xe đạp.'],
      ['___ (Did you have / Have you) the car checked?', 'Did you have', 'Bạn đã mang xe đi kiểm tra chưa?'],
      ['I ___ (had my suit cleaned / had cleaned my suit) for the wedding.', 'had my suit cleaned', 'Tôi mang bộ vest đi giặt để dự đám cưới.'],
      ['They had the documents ___ (translated / translate) into English.', 'translated', 'Họ cho dịch tài liệu sang tiếng Anh.'],
      ['She got her tooth ___ (removed / remove) yesterday.', 'removed', 'Hôm qua cô ấy đi nhổ răng.'],
      ['We should have the roof ___ (repaired / repairing) before winter.', 'repaired', 'Nên cho sửa mái trước mùa đông.'],
      ['He ___ (had his phone repaired / repaired his phone) at the shop.', 'had his phone repaired', 'Anh ấy mang điện thoại ra tiệm sửa.']
    ]
  },

  {
    slug: 'reporting-verb-patterns',
    en: 'Reporting verb patterns',
    vi: 'Mẫu câu của động từ tường thuật',
    level: 'B2',
    summary: 'Mỗi động từ tường thuật đi với một mẫu cố định. Chọn đúng động từ là tóm được sắc thái mà không cần trích nguyên văn.',
    formula: {
      rows: [
        ['+ V-ing', 'admit, deny, suggest, recommend: "He admitted taking the money."'],
        ['+ to + V', 'promise, refuse, offer, agree, threaten: "She refused to answer."'],
        ['+ tân ngữ + to + V', 'advise, remind, warn, encourage, persuade'],
        ['+ giới từ + V-ing', 'accuse sb OF, apologise FOR, insist ON, congratulate sb ON']
      ],
      note: 'Chọn động từ tường thuật khéo là tóm cả thái độ người nói: "He admitted…" khác "He claimed…" khác "He insisted…" dù nội dung có thể giống nhau.'
    },
    signals: ['admitted', 'denied', 'refused', 'accused of', 'apologised for', 'insisted on'],
    useWhen: [
      'Tóm tắt hội thoại dài mà không trích nguyên văn.',
      'Bài viết học thuật khi thuật lại lập luận của tác giả khác.',
      'Nêu rõ thái độ: thừa nhận, chối, khăng khăng, đe doạ.'
    ],
    useNot: [
      { what: 'Không dùng "to + V" sau admit và deny.', why: '"He admitted to take the money" sai; đúng là "admitted taking" hoặc "admitted that he had taken".' },
      { what: 'Không bỏ giới từ ở nhóm thứ tư.', why: '"He accused me stealing" sai; phải là "accused me of stealing".' },
      { what: 'Không dùng "suggest + tân ngữ + to V".', why: '"He suggested me to go" luôn sai.' }
    ],
    confuse: [
      {
        with: 'say và các động từ tường thuật cụ thể',
        tell: '"say" trung tính; động từ cụ thể mang thêm thái độ, giúp câu tóm gọn mà vẫn đủ ý.',
        pair: [
          { en: 'He said he had not taken the money.', vi: 'Anh ta nói mình không lấy tiền. (trung tính)' },
          { en: 'He denied taking the money.', vi: 'Anh ta chối là đã lấy tiền. (có thái độ)' }
        ]
      }
    ],
    errors: [
      { wrong: 'She apologised for be late.', right: 'She apologised for being late.', why: 'Sau giới từ là danh động từ.' },
      { wrong: 'He accused me to break the window.', right: 'He accused me of breaking the window.', why: '"accuse" đi với "of + V-ing".' }
    ],
    examples: [
      ['He admitted breaking the window.', 'Anh ta thừa nhận đã làm vỡ cửa sổ.', 1, '"admit" + V-ing.'],
      ['She refused to sign the contract.', 'Cô ấy từ chối ký hợp đồng.', 1, '"refuse" + to + V.'],
      ['They warned us not to swim there.', 'Họ cảnh báo chúng tôi đừng bơi ở đó.', 1, '"warn" + tân ngữ + not to + V.'],
      ['He apologised for arriving late.', 'Anh ấy xin lỗi vì tới muộn.', 1, '"apologise for" + V-ing.'],
      ['She apologised for be late.', 'Cô ấy xin lỗi vì tới muộn.', 0, 'Sai: sửa thành "apologised for being late".'],
      ['He accused me to break the window.', 'Anh ta buộc tội tôi làm vỡ cửa sổ.', 0, 'Sai: sửa thành "accused me of breaking the window".']
    ],
    practice: [
      ['He denied ___ (taking / to take) the documents.', 'taking', 'Anh ta chối là đã lấy tài liệu.'],
      ['She promised ___ (to call / calling) me back.', 'to call', 'Cô ấy hứa sẽ gọi lại cho tôi.'],
      ['They accused him ___ (of cheating / to cheat).', 'of cheating', 'Họ buộc tội anh ta gian lận.'],
      ['He insisted ___ (on paying / to pay) for dinner.', 'on paying', 'Anh ấy khăng khăng đòi trả tiền bữa tối.'],
      ['She advised me ___ (to see / seeing) a specialist.', 'to see', 'Cô ấy khuyên tôi đi khám chuyên khoa.'],
      ['We congratulated her ___ (on passing / to pass) the exam.', 'on passing', 'Chúng tôi chúc mừng cô ấy đã đỗ.'],
      ['He threatened ___ (to resign / resigning).', 'to resign', 'Anh ấy doạ sẽ từ chức.'],
      ['The report recommended ___ (reducing / to reduce) costs.', 'reducing', 'Báo cáo khuyến nghị cắt giảm chi phí.'],
      ['She reminded him ___ (to bring / bringing) the tickets.', 'to bring', 'Cô ấy nhắc anh ấy mang vé.'],
      ['He apologised ___ (for forgetting / to forget) my birthday.', 'for forgetting', 'Anh ấy xin lỗi vì quên sinh nhật tôi.']
    ]
  }
];

/** Điểm ngữ pháp — nhóm bị động và câu tường thuật bậc A2–B2. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'passive',
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
