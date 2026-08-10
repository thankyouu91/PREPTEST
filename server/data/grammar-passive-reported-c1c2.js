/**
 * Ngữ pháp — nhóm BỊ ĐỘNG và CÂU TƯỜNG THUẬT, phần bậc C1 và C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-passive-reported.js (bậc A2–B2). Hạn mức của
 * nhóm là 22 điểm; tệp kia đã dùng 13 điểm, tệp này dùng nốt 9 điểm: C1 ×5,
 * C2 ×4. Vậy là nhóm đủ 22/22.
 *
 * Bậc A2–B2 lo phần cơ khí: đổi "be + V3" cho đúng thì, lùi thì cho đúng,
 * đảo lại trật tự câu hỏi. Bậc này chuyển sang chuyện khác hẳn — CHỌN GÓC
 * NHÌN LÀ MỘT QUYẾT ĐỊNH CÓ HÀM Ý. Bỏ tác nhân đi là giấu người chịu trách
 * nhiệm; chọn "claim" thay vì "point out" là gieo nghi ngờ vào nguồn; dùng
 * "shall" trong hợp đồng là áp nghĩa vụ chứ không nói chuyện tương lai. Ở kỳ
 * thi, đây là phần ăn điểm của bài Đọc (nhận ra thái độ tác giả) và bài Viết
 * (thuật lại nguồn mà vẫn giữ được lập trường của mình).
 *
 * Ghi chú tránh trùng: điểm "danh từ hoá" chung nằm ở nhóm danh từ; ở đây chỉ
 * bàn riêng DANH TỪ TƯỜNG THUẬT đi với mệnh đề "that". Thức giả định đã dựng
 * ở nhóm câu điều kiện, chỗ này chỉ nhắc lại khi nó đi sau danh từ tường thuật.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== C1 ==================== */

  {
    slug: 'passive-academic',
    en: 'The passive in academic writing',
    vi: 'Bị động trong văn viết học thuật',
    level: 'C1',
    summary: 'Trong bài học thuật, bị động dùng để đẩy quy trình và kết quả lên trước, giấu người làm khi người làm không quan trọng. Nhưng đây không phải luật bắt buộc.',
    formula: {
      rows: [
        ['Phần Phương pháp', 'The samples were heated / Data were collected'],
        ['Nêu quan điểm chung', 'It has been argued / suggested / shown that…'],
        ['Dẫn vào nhận xét', 'It should be noted that… / It is worth noting that…'],
        ['Chủ động khi nêu đóng góp riêng', 'In this paper we argue that…']
      ],
      note: 'Đừng tin lời đồn "văn học thuật phải viết bị động hết". Các sổ tay văn phong hiện nay, kể cả APA, khuyến khích chủ động khi nói về việc chính mình làm. Bài viết hay là bài biết đổi qua đổi lại: bị động cho quy trình, chủ động cho lập luận của mình.'
    },
    signals: ['were collected', 'it has been argued', 'it should be noted', 'was conducted', 'are discussed'],
    useWhen: [
      'Mô tả quy trình, thí nghiệm, cách thu thập dữ liệu — cách làm mới là điều đáng nói.',
      'Thuật lại quan điểm chung trong ngành mà chưa cần chỉ đích danh ai.',
      'Muốn đưa đối tượng nghiên cứu lên đầu câu để nối mạch với câu trước.'
    ],
    useNot: [
      { what: 'Không dùng bị động khi nêu đóng góp của chính mình.', why: '"In this paper it is argued that…" nghe vòng vo; "In this paper we argue that…" mạnh và rõ ai chịu trách nhiệm cho lập luận.' },
      { what: 'Không viết bị động cả đoạn liền.', why: 'Câu nào cũng "was found", "was observed" thì đoạn văn mất nhịp và người chấm khó theo. Trộn chủ động vào cho thoáng.' }
    ],
    confuse: [
      {
        with: 'bị động cho quy trình khác chủ động cho lập luận',
        tell: 'Hỏi: câu này nói về VIỆC LÀM hay về Ý KIẾN? Việc làm thì bị động được, ý kiến của mình thì chủ động.',
        pair: [
          { en: 'The interviews were recorded and transcribed.', vi: 'Các buổi phỏng vấn được ghi âm và gỡ băng.' },
          { en: 'We argue that these findings challenge the standard model.', vi: 'Chúng tôi lập luận rằng các kết quả này thách thức mô hình chuẩn.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The samples was heated to 80 degrees.', right: 'The samples were heated to 80 degrees.', why: 'Chủ ngữ số nhiều thì "be" phải là "were".' },
      { wrong: 'In this section discussed the results.', right: 'In this section the results are discussed.', why: 'Thiếu chủ ngữ và thiếu "be" — bị động luôn cần đủ "be + V3".' }
    ],
    examples: [
      ['The samples were heated to 80 degrees and then cooled slowly.', 'Các mẫu được nung tới 80 độ rồi làm nguội từ từ.', 1, 'Phần Phương pháp: cách làm mới quan trọng, ai làm thì không.'],
      ['It has been argued that the two effects are unrelated.', 'Đã có lập luận cho rằng hai hiệu ứng này không liên quan tới nhau.', 1, 'Thuật lại quan điểm chung mà chưa cần dẫn tên ai.'],
      ['Data were collected over a six-month period.', 'Dữ liệu được thu thập trong sáu tháng.', 1, 'Trong văn học thuật trang trọng, "data" thường được coi là số nhiều.'],
      ['In this paper we argue that the model needs revising.', 'Trong bài này chúng tôi lập luận rằng mô hình cần được sửa lại.', 1, 'Chủ động khi nêu đóng góp của chính mình — đúng khuyến nghị của APA.'],
      ['It was decided that the second phase would be cancelled.', 'Người ta đã quyết định huỷ giai đoạn hai.', 0, 'Hỏng về văn phong: giấu mất ai quyết định. Viết rõ "The research team decided to cancel the second phase."'],
      ['The samples was heated to 80 degrees.', 'Các mẫu được nung tới 80 độ.', 0, 'Sai: sửa thành "The samples were heated to 80 degrees."']
    ],
    practice: [
      ['The samples ___ (were heated / heated) to 80 degrees for two hours.', 'were heated', 'Các mẫu được nung tới 80 độ trong hai giờ.'],
      ['It ___ (has been argued / has argued) that the model is too simple.', 'has been argued', 'Đã có lập luận cho rằng mô hình này quá đơn giản.'],
      ['The questionnaire ___ (was distributed / distributed) to 300 students.', 'was distributed', 'Bảng hỏi được phát cho 300 sinh viên.'],
      ['In this section the results ___ (are discussed / discuss) in detail.', 'are discussed', 'Trong phần này, các kết quả được bàn kỹ.'],
      ['Little attention ___ (has been paid / has paid) to this variable.', 'has been paid', 'Biến số này ít được chú ý tới.'],
      ['The two datasets ___ (were compared / compared) using a t-test.', 'were compared', 'Hai bộ dữ liệu được so sánh bằng kiểm định t.'],
      ['It ___ (should be noted / should note) that the sample was small.', 'should be noted', 'Cần lưu ý rằng mẫu khảo sát nhỏ.'],
      ['The interviews ___ (were recorded / recorded) with written consent.', 'were recorded', 'Các buổi phỏng vấn được ghi âm với sự đồng ý bằng văn bản.'],
      ['This approach ___ (has been adopted / has adopted) by several researchers.', 'has been adopted', 'Cách tiếp cận này đã được nhiều nhà nghiên cứu áp dụng.'],
      ['The limitations of the study ___ (are outlined / outline) below.', 'are outlined', 'Các hạn chế của nghiên cứu được nêu ở dưới.']
    ]
  },

  {
    slug: 'passive-perception-causative',
    en: 'Passive with verbs of perception and causation',
    vi: 'Bị động với động từ tri giác và sai khiến — "to" quay trở lại',
    level: 'C1',
    summary: 'Sau see, hear, watch, make ở dạng chủ động là nguyên thể TRẦN. Sang bị động thì "to" quay lại. Đây là chỗ sai nhiều nhất của bậc này.',
    formula: {
      rows: [
        ['Chủ động, nguyên thể trần', 'I saw him leave. / They made him sign.'],
        ['Bị động, "to" quay lại', 'He was seen TO leave. / He was made TO sign.'],
        ['Dạng V-ing giữ nguyên', 'I saw him leaving → He was seen leaving.'],
        ['let: không có bị động thường', 'They let him go → He was allowed to go (hoặc cụm cố định "was let go").']
      ],
      note: 'Vì sao "to" quay lại: ở câu chủ động, "him leave" nằm ngay sau động từ nên không cần "to"; sang bị động, "leave" mất chỗ dựa đó nên phải có "to" đứng nối. Nhớ một câu là đủ: "was made TO sign".'
    },
    signals: ['was seen to', 'was heard to', 'was made to', 'was watched', 'was let go'],
    useWhen: [
      'Thuật lại nhân chứng thấy hoặc nghe được điều gì mà không muốn nêu tên nhân chứng.',
      'Văn bản pháp lý và bản tin: "The suspect was seen to enter the building."',
      'Nói về việc bị ép làm gì: "We were made to wait for three hours."'
    ],
    useNot: [
      { what: 'Không giữ nguyên thể trần khi sang bị động.', why: '"He was made sign" và "He was seen leave" đều sai. Bị động luôn có "to" trước động từ.' },
      { what: 'Không dùng bị động thường cho "let".', why: '"He was let to go" sai. Dùng "He was allowed to go", hoặc cụm cố định "He was let go" nghĩa là bị cho thôi việc.' }
    ],
    confuse: [
      {
        with: '"was seen to leave" khác "was seen leaving"',
        tell: '"to + V" là thấy trọn hành động từ đầu đến cuối; "V-ing" là thấy đang giữa chừng.',
        pair: [
          { en: 'He was seen to leave the building.', vi: 'Người ta thấy anh ta rời khỏi toà nhà (thấy trọn việc rời đi).' },
          { en: 'He was seen leaving the building.', vi: 'Người ta thấy anh ta đang rời khỏi toà nhà (bắt gặp giữa chừng).' }
        ]
      }
    ],
    errors: [
      { wrong: 'He was made sign the document.', right: 'He was made to sign the document.', why: 'Sang bị động thì "to" quay lại sau "made".' },
      { wrong: 'The thief was seen run down the alley.', right: 'The thief was seen to run down the alley.', why: 'Bị động không dùng nguyên thể trần; hoặc đổi sang "was seen running".' }
    ],
    examples: [
      ['He was seen to leave the office shortly before the fire.', 'Người ta thấy anh ta rời văn phòng ngay trước khi xảy ra hoả hoạn.', 1, 'Chủ động là "saw him leave" không có "to"; sang bị động thì "to" quay lại.'],
      ['She was heard arguing with someone on the phone.', 'Người ta nghe thấy cô ấy đang cãi nhau với ai đó qua điện thoại.', 1, 'Dạng V-ing giữ nguyên khi chuyển sang bị động.'],
      ['The workers were made to sign a new contract.', 'Công nhân bị buộc phải ký hợp đồng mới.', 1, 'Chỗ sai nhiều nhất: "made them sign" nhưng "were made TO sign".'],
      ['Two employees were let go last month.', 'Hai nhân viên bị cho thôi việc tháng trước.', 1, 'Cụm cố định "be let go", không có "to" — nghĩa là bị cho nghỉ việc.'],
      ['He was made sign the document.', 'Anh ta bị buộc phải ký giấy tờ.', 0, 'Sai: sửa thành "He was made to sign the document."'],
      ['The thief was seen run down the alley.', 'Người ta thấy tên trộm chạy xuống con hẻm.', 0, 'Sai: sửa thành "The thief was seen to run down the alley" hoặc "was seen running down the alley."']
    ],
    practice: [
      ['He was seen ___ (to leave / leave) the building at nine.', 'to leave', 'Người ta thấy anh ta rời toà nhà lúc chín giờ.'],
      ['The children were made ___ (to apologise / apologise) to their teacher.', 'to apologise', 'Bọn trẻ bị bắt phải xin lỗi cô giáo.'],
      ['She was heard ___ (to shout / shout) at someone in the corridor.', 'to shout', 'Người ta nghe thấy cô ấy quát ai đó ngoài hành lang.'],
      ['We were made ___ (to wait / wait) for over an hour.', 'to wait', 'Chúng tôi bị bắt chờ hơn một tiếng.'],
      ['The suspect was seen ___ (running / run) away from the scene.', 'running', 'Người ta thấy nghi phạm đang chạy khỏi hiện trường.'],
      ['Nobody was allowed ___ (to enter / enter) without a pass.', 'to enter', 'Không ai được vào nếu không có thẻ.'],
      ['Several staff were let ___ (go / to go) when the branch closed.', 'go', 'Vài nhân viên bị cho thôi việc khi chi nhánh đóng cửa.'],
      ['He was made ___ (to feel / feel) unwelcome at the meeting.', 'to feel', 'Anh ấy bị làm cho thấy mình không được chào đón ở cuộc họp.'],
      ['The car was heard ___ (to start / start) just after midnight.', 'to start', 'Người ta nghe tiếng xe nổ máy ngay sau nửa đêm.'],
      ['Passengers were asked ___ (to remain / remain) seated.', 'to remain', 'Hành khách được yêu cầu ngồi yên tại chỗ.']
    ]
  },

  {
    slug: 'passive-nonfinite',
    en: 'Non-finite passives: being done, having been done, to be done',
    vi: 'Bị động ở dạng không chia — being done, having been done, to be done',
    level: 'C1',
    summary: 'Bị động không phải lúc nào cũng là một động từ chia. Sau giới từ, sau động từ đi với V-ing, hay ở dạng nguyên thể, nó có ba hình dạng riêng.',
    formula: {
      rows: [
        ['Sau giới từ và động từ đi với V-ing', 'being + V3: "after being told", "hate being interrupted"'],
        ['Việc xảy ra trước', 'having been + V3: "Having been warned, he left."'],
        ['Nguyên thể bị động', 'to be + V3: "The form needs to be signed."'],
        ['Nguyên thể hoàn thành bị động', 'to have been + V3: "He seems to have been misinformed."']
      ],
      note: 'Một mẹo riêng: "need / want / require + V-ing" đã mang sẵn nghĩa bị động. "The car needs washing" bằng đúng "The car needs to be washed", chỉ thân mật hơn.'
    },
    signals: ['being', 'having been', 'to be', 'to have been', 'needs -ing'],
    useWhen: [
      'Sau giới từ: after, before, without, on, by — chỗ này bắt buộc dùng V-ing, không có ngoại lệ.',
      'Sau các động từ đi với V-ing: avoid, deny, risk, resent, enjoy, mind, hate.',
      'Rút gọn mệnh đề cho câu gọn: "Having been rejected twice, he stopped applying."'
    ],
    useNot: [
      { what: 'Không viết "been" trơ sau giới từ.', why: '"After been told" sai. Sau giới từ luôn là "being": "after being told".' },
      { what: 'Không dùng nguyên thể sau động từ vốn đi với V-ing.', why: '"He denied to be involved" sai vì "deny" đi với V-ing: "He denied being involved."' }
    ],
    confuse: [
      {
        with: '"being done" khác "having been done"',
        tell: '"being" là cùng lúc; "having been" là xong trước rồi mới tới việc kia.',
        pair: [
          { en: 'Being watched, she said nothing.', vi: 'Vì đang bị theo dõi, cô ấy không nói gì (hai việc cùng lúc).' },
          { en: 'Having been watched for weeks, she said nothing.', vi: 'Vì đã bị theo dõi suốt mấy tuần, cô ấy không nói gì (việc trước, việc sau).' }
        ]
      }
    ],
    errors: [
      { wrong: 'After been told the result, she left.', right: 'After being told the result, she left.', why: 'Sau giới từ dùng V-ing, tức "being".' },
      { wrong: 'The form needs to be sign by both parties.', right: 'The form needs to be signed by both parties.', why: 'Nguyên thể bị động là "to be + V3", phải chia phân từ ba.' }
    ],
    examples: [
      ['Nobody likes being criticised in public.', 'Chẳng ai thích bị phê bình trước mặt người khác.', 1, 'Sau động từ đi với V-ing thì bị động là "being + V3".'],
      ['The contract needs to be reviewed before Friday.', 'Hợp đồng cần được rà lại trước thứ Sáu.', 1, 'Nguyên thể bị động sau "need".'],
      ['Having been rejected twice, he stopped applying.', 'Sau hai lần bị từ chối, anh ấy thôi không nộp nữa.', 1, 'Bị động hoàn thành: việc bị từ chối xảy ra trước.'],
      ['The window needs cleaning.', 'Cửa sổ cần được lau.', 1, '"need + V-ing" mang sẵn nghĩa bị động; bằng với "needs to be cleaned", chỉ thân mật hơn.'],
      ['After been told the result, she left the room.', 'Sau khi được báo kết quả, cô ấy rời phòng.', 0, 'Sai: sửa thành "After being told the result, she left the room."'],
      ['He denied to be involved in the deal.', 'Anh ta phủ nhận có dính líu tới thương vụ.', 0, 'Sai: "deny" đi với V-ing, sửa thành "He denied being involved in the deal."']
    ],
    practice: [
      ['I hate ___ (being interrupted / to being interrupted) in the middle of a sentence.', 'being interrupted', 'Tôi ghét bị ngắt lời giữa câu.'],
      ['The form needs ___ (to be signed / to be sign) by both parties.', 'to be signed', 'Mẫu đơn cần được cả hai bên ký.'],
      ['After ___ (being told / been told) the news, she sat down.', 'being told', 'Sau khi được báo tin, cô ấy ngồi xuống.'],
      ['He seems ___ (to have been misinformed / to have misinformed) about the deadline.', 'to have been misinformed', 'Có vẻ anh ấy đã bị cho thông tin sai về hạn nộp.'],
      ['___ (Having been warned / Having warned) about the traffic, we left early.', 'Having been warned', 'Vì đã được cảnh báo về tình hình giao thông, chúng tôi đi sớm.'],
      ['She denied ___ (having been / to have been) anywhere near the building.', 'having been', 'Cô ấy phủ nhận có mặt ở gần toà nhà.'],
      ['This shirt needs ___ (washing / to washing).', 'washing', 'Cái áo này cần được giặt.'],
      ['The report is expected ___ (to be published / to be publish) next week.', 'to be published', 'Báo cáo dự kiến được công bố vào tuần tới.'],
      ['He resented ___ (being asked / to be asked) to work on Sunday.', 'being asked', 'Anh ấy bực vì bị yêu cầu làm việc vào Chủ nhật.'],
      ['The bridge is said ___ (to have been built / to have built) in 1890.', 'to have been built', 'Nghe nói cây cầu được xây vào năm 1890.']
    ]
  },

  {
    slug: 'there-said-to-be',
    en: 'There is said to be…',
    vi: 'Bị động phi ngôi với "there" — There is said to be…',
    level: 'C1',
    summary: 'Khi điều người ta nói là "có cái gì đó tồn tại", chủ ngữ hình thức không phải "It" mà là "There". Đây là chỗ người học hay ghép sai hai mẫu.',
    formula: {
      rows: [
        ['Mẫu chuẩn', 'There + be + said / believed / thought / known + to be…'],
        ['Số nhiều theo sau', 'There ARE believed to be around 4,000 tigers left.'],
        ['Nói chuyện quá khứ', 'There is thought to HAVE BEEN a fire here in 1902.'],
        ['Hai cách viết một ý', 'It is said that there is a tunnel = There is said to be a tunnel.']
      ],
      note: 'Luật xương sống: "It" đi với mệnh đề "that", "There" đi với "to be". Ghép chéo là hỏng — "There is said that…" không tồn tại trong tiếng Anh.'
    },
    signals: ['there is said to be', 'there are believed to be', 'there is thought to have been'],
    useWhen: [
      'Nêu sự tồn tại của cái gì đó mà nguồn tin chưa chắc: tin đồn, ước tính, số liệu chưa kiểm chứng.',
      'Bản tin và bài viết khoa học phổ thông khi đưa con số ước lượng.',
      'Muốn viết gọn hơn mẫu "It is said that there is…" vốn dài dòng.'
    ],
    useNot: [
      { what: 'Không viết "There is said that…".', why: '"There" chỉ đi với "to be". Muốn dùng mệnh đề "that" thì chủ ngữ hình thức phải là "It": "It is said that…".' },
      { what: 'Không để "there is" đứng trước danh từ số nhiều.', why: 'Động từ hoà hợp với cụm danh từ theo sau: "There ARE believed to be 4,000 tigers", không phải "There is believed to be 4,000 tigers".' }
    ],
    confuse: [
      {
        with: '"There is said to be" khác "It is said to be"',
        tell: '"There" giới thiệu cái gì đó lần đầu; "It" nói về một thứ cụ thể mà cả hai bên đã biết.',
        pair: [
          { en: 'There is said to be a good school in the next town.', vi: 'Nghe nói ở thị trấn bên có một trường tốt (giới thiệu, chưa ai nhắc tới).' },
          { en: 'It is said to be a good school.', vi: 'Nghe nói đó là một trường tốt (nói về ngôi trường vừa nhắc).' }
        ]
      }
    ],
    errors: [
      { wrong: 'There is said that a secret passage exists.', right: 'It is said that a secret passage exists.', why: '"There" không đi với mệnh đề "that"; đổi sang "It", hoặc viết "There is said to be a secret passage".' },
      { wrong: 'There is believed to be around 4,000 tigers left.', right: 'There are believed to be around 4,000 tigers left.', why: 'Cụm danh từ theo sau là số nhiều nên phải là "There are".' }
    ],
    examples: [
      ['There is said to be a secret passage behind the bookcase.', 'Nghe nói có một lối đi bí mật sau giá sách.', 1, 'Ghép "there is" với bị động phi ngôi — mẫu chuẩn.'],
      ['There are believed to be around 4,000 tigers left in the wild.', 'Người ta tin rằng chỉ còn khoảng 4.000 con hổ ngoài tự nhiên.', 1, 'Theo sau là số nhiều nên dùng "There are".'],
      ['There is thought to have been a fire here in 1902.', 'Người ta cho rằng đã có một vụ cháy ở đây vào năm 1902.', 1, 'Chuyện quá khứ thì dùng "to have been".'],
      ['It is said that there is a secret passage behind the bookcase.', 'Người ta nói rằng có một lối đi bí mật sau giá sách.', 1, 'Cùng nghĩa với câu đầu, chỉ dài hơn — hai cách viết của một ý.'],
      ['There is said that a secret passage exists.', 'Nghe nói có một lối đi bí mật.', 0, 'Sai: sửa thành "It is said that a secret passage exists" hoặc "There is said to be a secret passage."'],
      ['There is believed to be around 4,000 tigers left.', 'Người ta tin rằng còn khoảng 4.000 con hổ.', 0, 'Sai: sửa thành "There are believed to be around 4,000 tigers left."']
    ],
    practice: [
      ['There ___ (is said / is says) to be a tunnel under the church.', 'is said', 'Nghe nói có một đường hầm dưới nhà thờ.'],
      ['There ___ (are believed / is believed) to be fewer than 100 left in the wild.', 'are believed', 'Người ta tin rằng còn chưa tới 100 con ngoài tự nhiên.'],
      ['There is thought ___ (to have been / to be) an error in the original data.', 'to have been', 'Người ta cho rằng đã có lỗi trong dữ liệu gốc.'],
      ['___ (There is / It is) said to be a good school in the next town.', 'There is', 'Nghe nói ở thị trấn bên có một trường tốt.'],
      ['___ (It is / There is) said that the road will be closed all week.', 'It is', 'Nghe nói con đường sẽ đóng suốt tuần.'],
      ['There ___ (are known / is known) to be several routes to the summit.', 'are known', 'Được biết là có vài đường lên đỉnh.'],
      ['There is reported ___ (to be / that is) a shortage of nurses.', 'to be', 'Có tin là đang thiếu y tá.'],
      ['There were said ___ (to be / to have) around fifty people at the meeting.', 'to be', 'Nghe nói có khoảng năm mươi người dự họp.'],
      ['There is alleged ___ (to have been / to been) a cover-up.', 'to have been', 'Có cáo buộc rằng đã có sự che giấu.'],
      ['There ___ (appears / is appeared) to be a mistake in the bill.', 'appears', 'Hình như hoá đơn có chỗ sai.']
    ]
  },

  {
    slug: 'reporting-verb-stance',
    en: 'Reporting verbs that carry a judgement',
    vi: 'Động từ tường thuật mang sắc thái đánh giá',
    level: 'C1',
    summary: 'Chọn động từ tường thuật là chọn lập trường. "Smith points out that…" là đồng tình; "Smith claims that…" là gieo nghi ngờ. Cùng một nội dung, hai thái độ khác hẳn.',
    formula: {
      rows: [
        ['Trung tính', 'say, state, note, observe, report, describe'],
        ['Đồng tình, coi là đúng', 'point out, show, demonstrate, reveal, establish'],
        ['Giữ khoảng cách, nghi ngờ', 'claim, allege, assert, contend, purport'],
        ['Nhượng bộ, thừa nhận điều bất lợi', 'admit, concede, acknowledge'],
        ['Khăng khăng bảo vệ', 'insist, maintain, stress']
      ],
      note: 'Nhóm "đồng tình" là động từ tiền giả định: dùng "point out" hay "reveal" là người viết ngầm nhận nội dung đó đúng. Nhóm "nghi ngờ" thì không. Đây chính là chỗ bài Đọc hỏi "thái độ của tác giả là gì" và bài Viết bị trừ điểm nếu dùng lẫn.'
    },
    signals: ['points out', 'claims', 'admits', 'concedes', 'insists', 'alleges'],
    useWhen: [
      'Bài Viết học thuật: thuật lại nguồn mà vẫn cho người đọc biết mình có tin nguồn đó không.',
      'Bài Đọc: nhận ra thái độ của tác giả với người mà tác giả đang trích.',
      'Bản tin: dùng "claim" và "allege" để đưa tin mà không tự nhận trách nhiệm về tính đúng sai.'
    ],
    useNot: [
      { what: 'Không dùng "claim" cho sự thật hiển nhiên.', why: '"Smith claims that water boils at 100 degrees" nghe như đang chê Smith. Sự thật đã xác lập thì dùng "notes" hoặc "points out".' },
      { what: 'Không dùng "admit" cho tin vui.', why: '"He admitted that he had won first prize" nghe kỳ, vì "admit" hàm ý thừa nhận điều bất lợi. Tin vui thì "announced" hoặc "revealed".' }
    ],
    confuse: [
      {
        with: '"point out" khác "claim"',
        tell: 'Hỏi: người viết có đứng về phía nguồn không? Có thì "point out", không chắc thì "claim".',
        pair: [
          { en: 'Tran (2020) points out that the sample was too small.', vi: 'Trần (2020) chỉ ra rằng mẫu khảo sát quá nhỏ (người viết đồng tình).' },
          { en: 'Tran (2020) claims that the sample was too small.', vi: 'Trần (2020) cho rằng mẫu khảo sát quá nhỏ (người viết chưa tin hẳn).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Smith claims that water boils at 100 degrees at sea level.', right: 'Smith notes that water boils at 100 degrees at sea level.', why: '"claim" gieo nghi ngờ vào một sự thật đã xác lập.' },
      { wrong: 'He admitted that he had won first prize.', right: 'He announced that he had won first prize.', why: '"admit" chỉ dùng cho điều bất lợi hoặc điều phải miễn cưỡng nhận.' }
    ],
    examples: [
      ['Nguyen (2021) points out that the two samples were not comparable.', 'Nguyễn (2021) chỉ ra rằng hai mẫu không thể so sánh với nhau.', 1, 'Động từ tiền giả định: người viết ngầm nhận điều đó đúng.'],
      ['The company claims that the product is entirely recyclable.', 'Công ty tuyên bố rằng sản phẩm tái chế được hoàn toàn.', 1, '"claim" tạo khoảng cách: người viết không bảo đảm điều đó đúng.'],
      ['The witness admitted that he had lied to the police.', 'Nhân chứng thừa nhận đã nói dối cảnh sát.', 1, '"admit" hàm ý thừa nhận điều bất lợi cho chính mình.'],
      ['The minister conceded that the target would be missed.', 'Bộ trưởng nhượng bộ thừa nhận sẽ không đạt chỉ tiêu.', 1, '"concede" là nhượng bộ trước sức ép, nặng hơn "say" nhiều.'],
      ['Smith claims that water boils at 100 degrees at sea level.', 'Smith cho rằng nước sôi ở 100 độ tại mực nước biển.', 0, 'Sai sắc thái: sửa thành "Smith notes that water boils at 100 degrees at sea level."'],
      ['He admitted that he had won first prize.', 'Anh ấy thừa nhận đã giành giải nhất.', 0, 'Sai sắc thái: sửa thành "He announced that he had won first prize."']
    ],
    practice: [
      ['Smith ___ (points out / claims) that the method has three clear advantages.', 'points out', 'Smith chỉ ra rằng phương pháp này có ba ưu điểm rõ ràng — người viết đồng tình.'],
      ['The company ___ (admitted / announced) that it had misled customers.', 'admitted', 'Công ty thừa nhận đã gây hiểu lầm cho khách hàng.'],
      ['He ___ (claims / demonstrates) to have met the president, but there is no record of it.', 'claims', 'Ông ta tự nhận đã gặp tổng thống, nhưng không có ghi chép nào.'],
      ['The study ___ (demonstrates / alleges) that the drug reduces symptoms by 40 per cent.', 'demonstrates', 'Nghiên cứu chứng minh rằng thuốc giảm 40 phần trăm triệu chứng.'],
      ['The minister ___ (insisted / mentioned) that no money had been lost, despite the report.', 'insisted', 'Bộ trưởng khăng khăng rằng không mất đồng nào, bất chấp báo cáo.'],
      ['The author ___ (concedes / proves) that her sample was too small.', 'concedes', 'Tác giả thừa nhận rằng mẫu khảo sát của mình quá nhỏ.'],
      ['The newspaper ___ (alleged / showed) that the official had taken bribes.', 'alleged', 'Tờ báo cáo buộc rằng vị quan chức đã nhận hối lộ.'],
      ['Both studies ___ (note / claim) that the effect disappears after six months.', 'note', 'Cả hai nghiên cứu đều ghi nhận rằng hiệu ứng biến mất sau sáu tháng — người viết coi đây là sự thật.'],
      ['She ___ (maintains / admits) that she was not in the building and refuses to change her story.', 'maintains', 'Cô ấy vẫn khăng khăng rằng mình không ở trong toà nhà và không đổi lời khai.'],
      ['The audit ___ (revealed / suggested) that over half the files were missing.', 'revealed', 'Cuộc kiểm toán phát hiện hơn một nửa số hồ sơ bị thất lạc — dữ kiện đã xác minh.']
    ]
  },

  /* ==================== C2 ==================== */

  {
    slug: 'free-indirect-speech',
    en: 'Free indirect speech',
    vi: 'Tường thuật gián tiếp tự do — giọng nhân vật trong lời người kể',
    level: 'C2',
    summary: 'Không có "he said", không có ngoặc kép, nhưng vẫn là ý nghĩ của nhân vật. Ngữ pháp mượn của tường thuật gián tiếp, còn giọng thì vẫn là giọng nhân vật.',
    formula: {
      rows: [
        ['Trực tiếp', '"Is it really that late? I will have to run."'],
        ['Gián tiếp thường', 'He wondered whether it was really that late.'],
        ['Gián tiếp tự do', 'Was it really that late? He would have to run.'],
        ['Dấu nhận biết', 'Thì quá khứ + ngôi thứ ba, nhưng giữ "now", "tomorrow", "here" của nhân vật']
      ],
      note: 'Chỗ độc nhất của kiểu này: "Now he would have to walk." Trong lời kể thường, "now" đi với thì quá khứ là sai; ở đây lại đúng, vì "now" là mốc thời gian của nhân vật chứ không phải của người kể. Thấy tổ hợp đó là biết đang đọc suy nghĩ nhân vật.'
    },
    signals: ['câu hỏi không có mệnh đề dẫn', 'now / tomorrow đi với thì quá khứ', 'câu cảm thán trong lời kể', 'câu cụt'],
    useWhen: [
      'Viết truyện: kéo người đọc vào đầu nhân vật mà không phải viết "cô ấy nghĩ" mỗi câu.',
      'Bài Đọc văn học: nhận ra câu nào là lời người kể, câu nào là ý nghĩ nhân vật.',
      'Khi muốn để ngỏ, không nói rõ người kể có đồng tình với nhân vật hay không.'
    ],
    useNot: [
      { what: 'Không dùng trong bài viết học thuật hay báo cáo.', why: 'Văn nghị luận và báo cáo cần rạch ròi ai nói câu nào. Kiểu này cố ý làm mờ ranh giới đó nên không hợp.' },
      { what: 'Không trộn thì hiện tại của lời trực tiếp vào.', why: 'Đoạn kể ở quá khứ mà chen "Is it really that late?" là lỗi mạch thì. Phải là "Was it really that late?".' }
    ],
    confuse: [
      {
        with: 'gián tiếp tự do khác gián tiếp thường',
        tell: 'Có mệnh đề dẫn ("he wondered", "she thought") thì là gián tiếp thường; không có mà vẫn là ý nghĩ nhân vật thì là gián tiếp tự do.',
        pair: [
          { en: 'He wondered whether it was really that late.', vi: 'Anh tự hỏi liệu có thật là muộn đến thế không (gián tiếp thường).' },
          { en: 'Was it really that late?', vi: 'Muộn đến thế rồi ư? (gián tiếp tự do — ý nghĩ đi thẳng vào lời kể).' }
        ]
      }
    ],
    errors: [
      { wrong: 'He looked at the clock. Is it really that late? He would have to run.', right: 'He looked at the clock. Was it really that late? He would have to run.', why: 'Đoạn kể ở quá khứ nên câu hỏi cũng phải lùi thì.' },
      { wrong: 'She read the letter again. Tomorrow I would have to tell them.', right: 'She read the letter again. Tomorrow she would have to tell them.', why: 'Gián tiếp tự do dùng ngôi thứ ba, không dùng "I".' }
    ],
    examples: [
      ['He looked at the clock. Was it really that late? He would have to run.', 'Anh nhìn đồng hồ. Muộn đến thế rồi ư? Chắc phải chạy mất thôi.', 1, 'Không có "he wondered" — câu hỏi và ý nghĩ đi thẳng vào lời kể.'],
      ['She read the letter again. Tomorrow she would have to tell them the truth.', 'Cô đọc lại lá thư. Ngày mai cô sẽ phải nói thật với họ.', 1, 'Dấu hiệu đặc trưng: "tomorrow" của nhân vật đứng cùng thì quá khứ.'],
      ['Nam stopped at the gate. No, he could not do this. Not today.', 'Nam dừng lại ở cổng. Không, anh không làm nổi. Không phải hôm nay.', 1, 'Câu cụt và giọng nhân vật giữ nguyên; chỉ ngôi và thì là của người kể.'],
      ['He wondered whether it was really that late and decided that he would have to run.', 'Anh tự hỏi có thật là muộn đến thế không rồi quyết định phải chạy.', 1, 'Cùng nội dung nhưng viết theo gián tiếp thường — chính xác mà mất hết nhịp gấp gáp.'],
      ['He looked at the clock. Is it really that late? He would have to run.', 'Anh nhìn đồng hồ. Muộn đến thế rồi ư? Chắc phải chạy mất thôi.', 0, 'Sai: sửa thành "Was it really that late?" cho khớp mạch quá khứ.'],
      ['She read the letter again. Tomorrow I would have to tell them the truth.', 'Cô đọc lại lá thư. Ngày mai cô sẽ phải nói thật với họ.', 0, 'Sai: sửa thành "Tomorrow she would have to tell them the truth."']
    ],
    practice: [
      ['He stared at the letter. ___ (Was this / Is this) really all they were offering?', 'Was this', 'Anh nhìn chằm chằm lá thư. Họ chỉ trả có ngần này thôi ư?'],
      ['She checked her watch. She ___ (would have to / will have to) leave now or miss the train.', 'would have to', 'Cô liếc đồng hồ. Phải đi ngay không thì lỡ tàu.'],
      ['He put down the phone. ___ (What had he / What have I) just agreed to?', 'What had he', 'Anh đặt điện thoại xuống. Vừa nãy anh đồng ý cái gì thế?'],
      ['They looked at the ruined garden. ___ (It was hopeless / It is hopeless). Nothing would grow here again.', 'It was hopeless', 'Họ nhìn khu vườn tan hoang. Vô vọng. Ở đây sẽ chẳng còn gì mọc nổi.'],
      ['Mai read the message twice. ___ (Why would he / Why will he) say a thing like that?', 'Why would he', 'Mai đọc tin nhắn hai lần. Sao anh ta lại nói thế nhỉ?'],
      ['He watched the last bus pull away. ___ (Now he would have to walk / Now I will have to walk).', 'Now he would have to walk', 'Anh nhìn chuyến xe cuối rời bến. Giờ thì phải cuốc bộ rồi.'],
      ['She opened the fridge. ___ (There was nothing / There is nothing) to eat, as usual.', 'There was nothing', 'Cô mở tủ lạnh. Chẳng có gì ăn, như mọi khi.'],
      ['The old man sat down heavily. ___ (He was too old for this / I am too old for this).', 'He was too old for this', 'Ông lão ngồi phịch xuống. Già rồi, không kham nổi nữa.'],
      ['Lan folded the letter. ___ (Tomorrow she would tell them / Tomorrow I will tell them) everything.', 'Tomorrow she would tell them', 'Lan gấp lá thư lại. Ngày mai cô sẽ kể hết cho họ.'],
      ['He looked around the empty flat. ___ (Had it always been / Has it always been) this small?', 'Had it always been', 'Anh nhìn quanh căn hộ trống. Nó vẫn bé thế này từ trước à?']
    ]
  },

  {
    slug: 'reported-legal',
    en: 'Reporting in legal and official documents',
    vi: 'Tường thuật trong văn bản pháp lý và hành chính',
    level: 'C2',
    summary: 'Hợp đồng, lời khai và văn bản hành chính có bộ quy ước riêng: "shall" là nghĩa vụ chứ không phải tương lai, lùi thì tuyệt đối không có ngoại lệ, và cáo buộc luôn đi qua "is alleged to have".',
    formula: {
      rows: [
        ['Nghĩa vụ', 'The Tenant SHALL keep the premises in good repair.'],
        ['Cáo buộc chưa kết luận', 'The defendant IS ALLEGED TO HAVE falsified three invoices.'],
        ['Lời khai, lùi thì triệt để', 'The witness stated that she HAD LEFT before midnight.'],
        ['Từ công thức', 'hereby, herein, thereof, the said, the aforementioned'],
        ['Xu hướng mới', 'must thay cho shall: The Contractor MUST complete the works by 30 June.']
      ],
      note: '"Shall" ở đây là bẫy đọc hiểu lớn nhất. Trong hợp đồng nó KHÔNG nói chuyện tương lai mà áp nghĩa vụ, đọc là "có trách nhiệm phải". Phong trào soạn thảo ngôn ngữ giản dị đang thay dần bằng "must" cho khỏi nhập nhằng, nhưng văn bản cũ thì vẫn đầy "shall".'
    },
    signals: ['shall', 'hereby', 'the said', 'is alleged to have', 'the aforementioned', 'stated that'],
    useWhen: [
      'Đọc hiểu hợp đồng, điều khoản dịch vụ, thư thông báo của cơ quan.',
      'Thuật lại lời khai hoặc biên bản: bắt buộc lùi thì đầy đủ, không nới như văn nói.',
      'Viết đơn từ và thư khiếu nại trang trọng.'
    ],
    useNot: [
      { what: 'Không đọc "shall" trong hợp đồng thành thì tương lai.', why: '"The Tenant shall pay the rent monthly" không phải dự đoán mà là nghĩa vụ: người thuê có trách nhiệm trả tiền hằng tháng.' },
      { what: 'Không bỏ "have" khi thuật lại cáo buộc về chuyện đã xảy ra.', why: '"is alleged to take" nói chuyện thói quen hiện tại; chuyện đã xảy ra phải là "is alleged to have taken".' }
    ],
    confuse: [
      {
        with: '"shall" nghĩa vụ khác "will" tương lai',
        tell: 'Trong hợp đồng, chủ ngữ là một bên có trách nhiệm thì "shall" là nghĩa vụ. Trong văn thường, "shall" chỉ còn ở câu đề nghị ngôi thứ nhất.',
        pair: [
          { en: 'The Tenant shall pay the rent on the first day of each month.', vi: 'Bên thuê có nghĩa vụ trả tiền thuê vào ngày đầu mỗi tháng.' },
          { en: 'The rent will increase next year.', vi: 'Tiền thuê sẽ tăng vào năm sau (dự báo, không phải nghĩa vụ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The Tenant shall be keep the premises in good repair.', right: 'The Tenant shall keep the premises in good repair.', why: 'Sau "shall" là nguyên thể trần, không chen "be".' },
      { wrong: 'The defendant is alleged to take three invoices last year.', right: 'The defendant is alleged to have taken three invoices last year.', why: 'Chuyện đã xảy ra phải dùng "to have + V3".' }
    ],
    examples: [
      ['The Tenant shall keep the premises in good repair.', 'Bên thuê có nghĩa vụ giữ mặt bằng trong tình trạng tốt.', 1, '"shall" trong hợp đồng là nghĩa vụ, không phải thì tương lai.'],
      ['The defendant is alleged to have falsified three invoices.', 'Bị đơn bị cáo buộc đã làm giả ba hoá đơn.', 1, 'Cáo buộc mà chưa kết luận, giữ nguyên tắc suy đoán vô tội.'],
      ['The witness stated that she had left the building before midnight.', 'Nhân chứng khai rằng cô đã rời toà nhà trước nửa đêm.', 1, 'Lời khai lùi thì triệt để, không nới lỏng như văn nói.'],
      ['The Contractor must complete the works by 30 June.', 'Nhà thầu phải hoàn thành công việc trước ngày 30 tháng 6.', 1, 'Xu hướng soạn thảo giản dị: thay "shall" bằng "must" cho rõ nghĩa vụ.'],
      ['The Tenant shall be keep the premises in good repair.', 'Bên thuê có nghĩa vụ giữ mặt bằng trong tình trạng tốt.', 0, 'Sai: sửa thành "The Tenant shall keep the premises in good repair."'],
      ['The defendant is alleged to take three invoices last year.', 'Bị đơn bị cáo buộc đã lấy ba hoá đơn năm ngoái.', 0, 'Sai: sửa thành "The defendant is alleged to have taken three invoices last year."']
    ],
    practice: [
      ['The tenant ___ (shall / will) pay the rent on the first day of each month.', 'shall', 'Bên thuê có nghĩa vụ trả tiền thuê vào ngày đầu mỗi tháng.'],
      ['The witness stated that he ___ (had seen / has seen) the car leave at eleven.', 'had seen', 'Nhân chứng khai rằng ông đã thấy chiếc xe rời đi lúc mười một giờ.'],
      ['The defendant is alleged ___ (to have taken / to take) documents from the office.', 'to have taken', 'Bị đơn bị cáo buộc đã lấy tài liệu khỏi văn phòng.'],
      ['It is hereby ___ (agreed / agreeing) that the contract takes effect on 1 January.', 'agreed', 'Các bên theo đây thoả thuận rằng hợp đồng có hiệu lực từ ngày 1 tháng 1.'],
      ['___ (The said / The say) agreement shall be governed by Vietnamese law.', 'The said', 'Thoả thuận nói trên chịu sự điều chỉnh của pháp luật Việt Nam.'],
      ['Plain-language drafting now prefers ___ (must / shall) for obligations.', 'must', 'Cách soạn thảo ngôn ngữ giản dị nay chuộng "must" hơn khi nêu nghĩa vụ.'],
      ['In his statement the claimant ___ (asserted / asserts) that he had never signed the form.', 'asserted', 'Trong bản khai, nguyên đơn đã khẳng định rằng mình chưa từng ký vào mẫu đơn.'],
      ['The parties ___ (hereby / here by) waive any right to appeal.', 'hereby', 'Các bên theo đây từ bỏ mọi quyền kháng cáo.'],
      ['The report concluded that the funds ___ (had been / have been) transferred without approval.', 'had been', 'Báo cáo kết luận rằng số tiền đã được chuyển đi mà không có phê duyệt.'],
      ['The accused denied ___ (having been / to have been) at the scene.', 'having been', 'Bị cáo phủ nhận việc có mặt tại hiện trường.']
    ]
  },

  {
    slug: 'passive-agent-deletion',
    en: 'Agentless passives and responsibility',
    vi: 'Bị động giấu tác nhân — khi nào chính đáng, khi nào là né trách nhiệm',
    level: 'C2',
    summary: 'Bỏ tác nhân đi đôi khi là hợp lý, đôi khi là né. "Mistakes were made" đúng ngữ pháp mà rỗng nội dung: không ai nhận lỗi cả. Đọc kỹ luôn phải hỏi "ai?".',
    formula: {
      rows: [
        ['Chính đáng: không ai biết ai làm', 'My bike was stolen last night.'],
        ['Chính đáng: ai làm không quan trọng', 'The mixture was heated for ten minutes.'],
        ['Né trách nhiệm', 'Mistakes were made. / It was decided to close the branch.'],
        ['Cách chữa: nêu rõ tác nhân', 'The board decided to close the branch in March.']
      ],
      note: 'Phép thử một câu: thêm "by…" vào cuối. Thêm vào mà thành thừa ("My bike was stolen by someone") thì bị động là chính đáng. Thêm vào mà lộ ra một thông tin người đọc đang cần ("Mistakes were made by the management") thì câu gốc đang giấu chuyện.'
    },
    signals: ['mistakes were made', 'it was decided', 'concerns have been raised', 'errors were identified'],
    useWhen: [
      'Đọc phê phán: thông cáo báo chí, thư từ chối, báo cáo nội bộ — chỗ nào bỏ tác nhân thì đánh dấu lại.',
      'Viết khiếu nại: nêu sự việc mà chưa vội quy cho cá nhân nào, giữ giọng lịch sự.',
      'Báo cáo thí nghiệm: quy trình mới là điều đáng nói, người thao tác thì không.'
    ],
    useNot: [
      { what: 'Không dùng bị động khi người đọc cần biết ai chịu trách nhiệm.', why: 'Thư báo "Your application has been rejected" để người nhận không biết khiếu nại với ai. Nêu rõ bộ phận quyết định thì minh bạch hơn.' },
      { what: 'Không viết bị động chỉ để nghe cho trang trọng.', why: 'Giám khảo bài Viết coi câu mù mờ là điểm trừ. Câu chủ động nêu rõ chủ thể vừa ngắn vừa mạnh.' }
    ],
    confuse: [
      {
        with: 'bị động chính đáng khác bị động né tránh',
        tell: 'Người đọc có cần biết ai làm không? Không cần thì chính đáng; cần mà bị giấu thì là né.',
        pair: [
          { en: 'The samples were stored at five degrees.', vi: 'Các mẫu được bảo quản ở năm độ (ai cất không quan trọng).' },
          { en: 'The complaint was overlooked for six months.', vi: 'Khiếu nại bị bỏ quên suốt sáu tháng (ai bỏ quên? câu này đang giấu).' }
        ]
      }
    ],
    errors: [
      { wrong: 'A number of errors were founded in the accounts.', right: 'A number of errors were found in the accounts.', why: 'Phân từ ba của "find" là "found"; "founded" là của "found" nghĩa là thành lập.' },
      { wrong: 'It was decided that your application would not be taken further.', right: 'The admissions committee decided not to take your application further.', why: 'Đúng ngữ pháp nhưng giấu người quyết định; văn bản gửi cho người khác nên nêu rõ.' }
    ],
    examples: [
      ['My bike was stolen last night.', 'Xe đạp của tôi bị mất trộm tối qua.', 1, 'Bị động chính đáng: không ai biết ai lấy.'],
      ['The mixture was heated for ten minutes.', 'Hỗn hợp được đun trong mười phút.', 1, 'Bị động chính đáng: quy trình mới quan trọng, ai làm thì không.'],
      ['Mistakes were made in handling the complaint.', 'Đã có sai sót trong việc xử lý khiếu nại.', 1, 'Đúng ngữ pháp nhưng là lời xin lỗi rỗng: không ai nhận trách nhiệm. Đọc kỹ phải hỏi "ai?".'],
      ['The board decided to close the branch in March.', 'Hội đồng quản trị đã quyết định đóng chi nhánh vào tháng Ba.', 1, 'Chủ động nêu rõ ai quyết định — mạnh và minh bạch hơn "It was decided…".'],
      ['It was decided that your application would not be taken further.', 'Đã có quyết định không xét tiếp hồ sơ của bạn.', 0, 'Hỏng về văn phong: sửa thành "The admissions committee decided not to take your application further."'],
      ['A number of errors were founded in the accounts.', 'Người ta phát hiện một số sai sót trong sổ sách.', 0, 'Sai: sửa thành "A number of errors were found in the accounts."']
    ],
    practice: [
      ['The phrase "mistakes ___ (were made / were make)" is the classic non-apology.', 'were made', 'Câu "mistakes were made" là kiểu xin lỗi rỗng kinh điển.'],
      ['Instead of "It was decided to close the branch", write "The board ___ (decided / was decided) to close the branch".', 'decided', 'Thay vì viết mập mờ, hãy nêu rõ hội đồng quản trị đã quyết định.'],
      ['In a complaint letter, "my parcel ___ (was damaged / damaged)" avoids blaming a named person.', 'was damaged', 'Trong thư khiếu nại, viết "bưu kiện của tôi bị hỏng" để khỏi quy lỗi cho ai cụ thể.'],
      ['The sentence "the funds were transferred" hides ___ (who transferred them / they transferred).', 'who transferred them', 'Câu "số tiền đã được chuyển" giấu mất ai là người chuyển.'],
      ['A report should name the agent: "the auditors ___ (found / were found) several errors".', 'found', 'Báo cáo nên nêu rõ chủ thể: chính các kiểm toán viên đã phát hiện sai sót.'],
      ['"The order ___ (was cancelled / cancelled) without notice" leaves the reader asking who did it.', 'was cancelled', 'Câu "đơn hàng bị huỷ mà không báo trước" khiến người đọc phải hỏi ai huỷ.'],
      ['When the doer is unknown the passive is right: "my phone ___ (was stolen / stole) on the bus".', 'was stolen', 'Khi không biết ai làm thì bị động là đúng: điện thoại của tôi bị lấy trộm trên xe buýt.'],
      ['Name the agent for a clear answer: "the government ___ (introduced / was introduced) the policy in 2019".', 'introduced', 'Nêu rõ chủ thể cho câu trả lời rành mạch: chính phủ ban hành chính sách này năm 2019.'],
      ['"It ___ (has been suggested / has suggested) that staff take a pay cut" — but by whom?', 'has been suggested', 'Câu "đã có đề xuất nhân viên giảm lương" — nhưng ai đề xuất?'],
      ['In a lab report the passive is fine: "the sample ___ (was weighed / weighed) three times".', 'was weighed', 'Trong báo cáo thí nghiệm, bị động là hợp lý: mẫu được cân ba lần.']
    ]
  },

  {
    slug: 'reporting-nouns',
    en: 'Reporting nouns with that-clauses',
    vi: 'Danh từ tường thuật đi với mệnh đề "that"',
    level: 'C2',
    summary: 'Cả một câu tường thuật có thể nén thành một cụm danh từ: "He claimed that…" thành "his claim that…". Đây là dấu hiệu của văn học thuật dày và gọn.',
    formula: {
      rows: [
        ['Mẫu chính', 'DANH TỪ + that + mệnh đề đủ: "his claim that the data were flawed"'],
        ['Nhóm danh từ hay gặp', 'claim, allegation, assertion, belief, suggestion, denial, admission, announcement'],
        ['Một số đi với "of"', 'a denial OF any wrongdoing / the accusation OF cheating'],
        ['Thức giả định sau ba danh từ', 'suggestion / demand / insistence + that + S + V nguyên thể: "the suggestion that the deadline BE extended"']
      ],
      note: '"That" ở đây KHÔNG phải đại từ quan hệ mà là từ nối mở mệnh đề nội dung, nên không bao giờ đổi được thành "which". "His claim which the data were flawed" là câu sai kinh điển của bậc này. Phép thử: bỏ "that" đi mà phần sau vẫn là một câu đủ chủ ngữ và động từ thì đúng là mệnh đề nội dung.'
    },
    signals: ['the claim that', 'the allegation that', 'the suggestion that', 'the fact that', 'his denial of'],
    useWhen: [
      'Bài Viết học thuật: nhắc lại một ý đã nêu để bình luận tiếp mà khỏi viết lại cả câu.',
      'Nối mạch giữa hai đoạn: "This claim rests on two assumptions."',
      'Nén thông tin cho câu chủ đề ngắn gọn, đúng gu bài IELTS Writing Task 2 điểm cao.'
    ],
    useNot: [
      { what: 'Không thay "that" bằng "which" trong mệnh đề nội dung.', why: '"The claim which the data were flawed" sai. "Which" chỉ dùng cho mệnh đề quan hệ, tức khi nó thay cho một danh từ trong mệnh đề sau.' },
      { what: 'Không lạm dụng đến mức câu không còn động từ chính.', why: 'Nhồi nhiều cụm danh từ liền nhau thì câu nặng và khó theo. Mỗi câu nên còn một động từ thật để người đọc bám vào.' }
    ],
    confuse: [
      {
        with: 'mệnh đề nội dung khác mệnh đề quan hệ',
        tell: 'Bỏ "that" ra: còn lại là câu đủ thì đó là mệnh đề nội dung, dùng "that". Còn lại thiếu một thành phần thì là mệnh đề quan hệ, dùng được "which".',
        pair: [
          { en: 'His claim that the data were flawed was never tested.', vi: 'Khẳng định của ông rằng dữ liệu có sai sót chưa từng được kiểm chứng (mệnh đề nội dung).' },
          { en: 'His claim, which nobody tested, was published anyway.', vi: 'Khẳng định của ông, thứ không ai kiểm chứng, vẫn được đăng (mệnh đề quan hệ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'His claim which the data were flawed has never been tested.', right: 'His claim that the data were flawed has never been tested.', why: 'Mệnh đề nội dung dùng "that", không dùng "which".' },
      { wrong: 'The company issued a firm denial that any wrongdoing.', right: 'The company issued a firm denial that any wrongdoing had occurred.', why: 'Sau "that" phải là mệnh đề đủ chủ ngữ và động từ.' }
    ],
    examples: [
      ['His claim that the data were flawed has never been tested.', 'Khẳng định của ông rằng dữ liệu có sai sót chưa từng được kiểm chứng.', 1, 'Nén cả một câu tường thuật vào một cụm danh từ.'],
      ['The committee rejected the suggestion that the deadline be extended.', 'Hội đồng bác đề xuất gia hạn thời hạn nộp.', 1, 'Sau "suggestion", "demand", "insistence" là thức giả định: "be extended", không phải "is extended".'],
      ['The company issued a firm denial of any wrongdoing.', 'Công ty ra tuyên bố phủ nhận dứt khoát mọi sai phạm.', 1, 'Một số danh từ đi với "of + danh từ" thay vì mệnh đề "that".'],
      ['Her admission that she had missed the deadline came too late.', 'Việc cô thừa nhận đã trễ hạn đến quá muộn.', 1, '"admission" là sự thừa nhận; "admittance" là được phép vào — hai từ khác hẳn nhau.'],
      ['His claim which the data were flawed has never been tested.', 'Khẳng định của ông rằng dữ liệu có sai sót chưa từng được kiểm chứng.', 0, 'Sai: sửa thành "His claim that the data were flawed has never been tested."'],
      ['The company issued a firm denial that any wrongdoing.', 'Công ty ra tuyên bố phủ nhận mọi sai phạm.', 0, 'Sai: sửa thành "…a firm denial that any wrongdoing had occurred."']
    ],
    practice: [
      ['His claim ___ (that / which) the data were flawed was never tested.', 'that', 'Khẳng định của ông rằng dữ liệu có sai sót chưa từng được kiểm chứng.'],
      ['The committee rejected the suggestion ___ (that / of) the deadline be extended.', 'that', 'Hội đồng bác đề xuất gia hạn thời hạn nộp.'],
      ['There is no evidence to support the allegation ___ (that / what) money changed hands.', 'that', 'Không có bằng chứng nào chứng minh cáo buộc rằng đã có chuyện tiền bạc đổi chủ.'],
      ['She was surprised by his denial ___ (of / that) any involvement.', 'of', 'Cô ngạc nhiên trước lời phủ nhận mọi dính líu của anh ta.'],
      ['The minister repeated her ___ (assertion / assert) that no laws had been broken.', 'assertion', 'Bộ trưởng nhắc lại khẳng định của mình rằng không luật nào bị vi phạm.'],
      ['The company issued a formal ___ (denial / deny) of the reports.', 'denial', 'Công ty ra tuyên bố chính thức phủ nhận các thông tin đó.'],
      ['His ___ (admission / admittance) that he had copied the essay ended the matter.', 'admission', 'Việc anh ta thừa nhận đã chép bài luận đã khép lại chuyện này.'],
      ['The ___ (announcement / announce) that the factory would close came on Friday.', 'announcement', 'Thông báo nhà máy sẽ đóng cửa được đưa ra hôm thứ Sáu.'],
      ['Their demand that he ___ (resign / resigns) was rejected by the board.', 'resign', 'Yêu cầu ông từ chức của họ đã bị hội đồng bác bỏ.'],
      ['The book challenges the ___ (belief / believe) that talent is fixed at birth.', 'belief', 'Cuốn sách thách thức niềm tin rằng tài năng đã định sẵn từ khi sinh ra.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
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
