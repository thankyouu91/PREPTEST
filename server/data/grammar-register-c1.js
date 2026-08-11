/**
 * Ngữ pháp — nhóm SẮC THÁI, ĐỘ TRANG TRỌNG và RÀO ĐÓN, phần bậc C1.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-register.js (bậc A1–B2). Hạn mức của nhóm là
 * 33 điểm; tệp kia đã dùng 14 điểm, tệp này dùng 9 điểm bậc C1. Còn 10 điểm
 * bậc C2 tách thành mục riêng trong hàng đợi.
 *
 * Bậc dưới học từng công cụ một: từ giảm nhẹ, câu hỏi đuôi, trạng từ rào đón.
 * Bậc C1 chuyển sang việc khó hơn nhiều: CÂN CHO ĐÚNG LIỀU. Rào đón thiếu tay
 * thì khẳng định vống lên hơn bằng chứng cho phép; rào đón quá tay thì cả câu
 * không còn nói gì. Cùng lúc đó, người viết phải chọn được mức gián tiếp hợp
 * với quan hệ và với văn cảnh — nhờ vả trong thư công việc khác hẳn nhờ vả khi
 * nói chuyện, góp ý cho đồng nghiệp khác hẳn chê thẳng.
 *
 * Ghi chú tránh trùng: rào đón bằng KHUYẾT THIẾU và lối lùi thì để lịch sự
 * thuộc nhóm động từ khuyết thiếu; động từ tường thuật mang sắc thái đánh giá
 * (claim, concede, point out) thuộc nhóm bị động - tường thuật; danh từ hoá
 * thuộc nhóm danh từ; từ nối theo độ trang trọng nằm ở bảng linking_words.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'hedging-scope-quantity',
    en: 'Limiting the scope of a claim',
    vi: 'Hạn định phạm vi khẳng định — most, generally, in most cases',
    level: 'C1',
    summary: 'Cách rào đón rẻ nhất và hiệu quả nhất: đừng nói "tất cả". Thu hẹp phạm vi là câu vừa an toàn vừa chính xác hơn.',
    formula: {
      rows: [
        ['Thay lượng từ tuyệt đối', 'ALL students → MOST students / MANY students'],
        ['Trạng từ hạn định', 'GENERALLY · TYPICALLY · ON THE WHOLE · AS A RULE'],
        ['Cụm hạn định', 'IN MOST CASES · FOR THE MOST PART · IN GENERAL'],
        ['Nêu bộ phận thay vì toàn thể', 'THE MAJORITY OF respondents · A SIGNIFICANT PROPORTION OF']
      ],
      note: 'Khẳng định vống là lỗi bị trừ điểm nhiều nhất trong bài Viết: chỉ cần một phản ví dụ là cả câu "All X are Y" sụp. Đổi sang "Most X are Y" thì câu vừa đúng hơn vừa không mất sức thuyết phục. Đây là chỗ ăn điểm dễ nhất của phần rào đón.'
    },
    signals: ['most', 'many', 'generally', 'typically', 'in most cases', 'the majority of'],
    useWhen: [
      'Bài Viết: mọi khẳng định về một nhóm người, một hiện tượng xã hội.',
      'Trình bày kết quả khảo sát: nêu tỉ lệ thay vì nói chung chung.',
      'Bất cứ khi nào định viết "all", "every", "always", "never" — dừng lại và cân nhắc.'
    ],
    useNot: [
      { what: 'Không dùng lượng từ tuyệt đối cho nhận định xã hội.', why: '"All Vietnamese people love pho" chỉ cần một người không thích là sai. Viết "Many Vietnamese people…" thì không ai bác được.' },
      { what: 'Không hạn định một sự thật đã xác lập.', why: '"Water generally boils at 100 degrees at sea level" nghe kỳ. Sự thật vật lý thì nói thẳng.' }
    ],
    confuse: [
      {
        with: 'hạn định phạm vi khác rào đón mức chắc chắn',
        tell: 'Hạn định phạm vi thu hẹp SỐ LƯỢNG đối tượng. Rào đón mức chắc chắn hạ độ tin của cả câu.',
        pair: [
          { en: 'Most students find this difficult.', vi: 'Phần lớn sinh viên thấy phần này khó (thu hẹp phạm vi).' },
          { en: 'Students may find this difficult.', vi: 'Sinh viên có thể thấy phần này khó (hạ mức chắc chắn).' }
        ]
      }
    ],
    errors: [
      { wrong: 'All Vietnamese people love pho.', right: 'Many Vietnamese people love pho.', why: 'Khẳng định tuyệt đối chỉ cần một phản ví dụ là sụp.' },
      { wrong: 'Water generally boils at 100 degrees at sea level.', right: 'Water boils at 100 degrees at sea level.', why: 'Sự thật đã xác lập thì không cần hạn định.' }
    ],
    examples: [
      ['Most students find the second section difficult.', 'Phần lớn sinh viên thấy phần hai khó.', 1, 'Thu hẹp phạm vi, câu vừa an toàn vừa chính xác.'],
      ['In most cases the treatment works within a week.', 'Trong phần lớn trường hợp, thuốc có tác dụng trong một tuần.', 1, 'Cụm hạn định mở đầu câu.'],
      ['The majority of respondents said they would recommend it.', 'Đa số người trả lời nói họ sẽ giới thiệu cho người khác.', 1, 'Nêu bộ phận thay vì toàn thể.'],
      ['Water boils at 100 degrees at sea level.', 'Nước sôi ở 100 độ tại mực nước biển.', 1, 'Đối chiếu: sự thật đã xác lập thì nói thẳng.'],
      ['All Vietnamese people love pho.', 'Người Việt ai cũng thích phở.', 0, 'Sai: sửa thành "Many Vietnamese people love pho."'],
      ['Water generally boils at 100 degrees at sea level.', 'Nước nhìn chung sôi ở 100 độ tại mực nước biển.', 0, 'Thừa: sửa thành "Water boils at 100 degrees at sea level."']
    ],
    practice: [
      ['___ (Many / All) Vietnamese people enjoy pho.', 'Many', 'Nhiều người Việt thích phở.'],
      ['___ (Most / Every) students find the second section difficult.', 'Most', 'Phần lớn sinh viên thấy phần hai khó.'],
      ['___ (In most cases / In all cases) the treatment works within a week.', 'In most cases', 'Trong phần lớn trường hợp, thuốc có tác dụng trong một tuần.'],
      ['The ___ (majority / totality) of respondents would recommend it.', 'majority', 'Đa số người trả lời sẽ giới thiệu cho người khác.'],
      ['Water ___ (boils / generally boils) at 100 degrees at sea level.', 'boils', 'Nước sôi ở 100 độ tại mực nước biển.'],
      ['Overgeneralising is a common ___ (weakness / strength) in essays.', 'weakness', 'Khẳng định vống là điểm yếu thường gặp trong bài luận.'],
      ['Older workers ___ (tend to / always) prefer stable hours.', 'tend to', 'Người lao động lớn tuổi thường thích giờ giấc ổn định.'],
      ['___ (On the whole / Without exception), the policy has been effective.', 'On the whole', 'Nhìn chung chính sách này có hiệu quả.'],
      ['A significant ___ (proportion / total) of the sample dropped out.', 'proportion', 'Một tỉ lệ đáng kể trong mẫu đã bỏ giữa chừng.'],
      ['Before writing "always", consider ___ (typically / certainly).', 'typically', 'Trước khi viết "always", hãy cân nhắc dùng "typically".']
    ]
  },

  {
    slug: 'hedging-conditions-limits',
    en: 'Bounding a claim with conditions',
    vi: 'Nêu điều kiện và giới hạn — to some extent, in principle',
    level: 'C1',
    summary: 'Thay vì hạ độ tin của cả câu, khoanh cho nó một vùng áp dụng. Khẳng định vẫn mạnh, chỉ là có biên rõ ràng.',
    formula: {
      rows: [
        ['Mức độ', 'TO SOME EXTENT · TO A CERTAIN DEGREE'],
        ['Trên lý thuyết', 'IN PRINCIPLE the system works, but in practice it often fails.'],
        ['Kèm điều kiện', 'UNDER CERTAIN CONDITIONS · PROVIDED THAT the sample is large'],
        ['Chừa ngoại lệ', 'WITH SOME EXCEPTIONS · AT LEAST IN THIS CONTEXT']
      ],
      note: 'Khác với "possibly" hay "perhaps" ở chỗ: rào đón mức chắc chắn làm cả câu yếu đi, còn khoanh vùng thì giữ nguyên sức mạnh của khẳng định trong phạm vi đã nêu. Người chấm bài Viết đánh giá cao lối thứ hai vì nó cho thấy người viết biết rõ giới hạn của lập luận mình.'
    },
    signals: ['to some extent', 'in principle', 'under certain conditions', 'with some exceptions'],
    useWhen: [
      'Bài Viết: thừa nhận lập luận của mình chỉ đúng trong một phạm vi.',
      'Phân biệt lý thuyết với thực tế: "In principle… but in practice…".',
      'Trả lời câu hỏi tranh luận: đồng ý một phần rồi nêu giới hạn.'
    ],
    useNot: [
      { what: 'Không viết "in principal" khi định nói "in principle".', why: '"principal" là hiệu trưởng hoặc chính yếu; "principle" là nguyên tắc. Đây là lỗi chính tả rất hay gặp.' },
      { what: 'Không khoanh vùng rồi lại quên nêu vùng đó.', why: '"To some extent this is true." mà không nói rõ tới đâu thì câu thành nước đôi. Nêu tiếp: "…in that the costs did fall, although service worsened."' }
    ],
    confuse: [
      {
        with: 'khoanh vùng khác hạ mức chắc chắn',
        tell: 'Khoanh vùng giữ nguyên sức mạnh của khẳng định trong phạm vi đã nêu. Hạ mức chắc chắn làm cả câu yếu đi.',
        pair: [
          { en: 'In principle the system works well.', vi: 'Về nguyên tắc thì hệ thống chạy tốt (khoanh vùng: trên lý thuyết).' },
          { en: 'The system possibly works well.', vi: 'Hệ thống có thể chạy tốt (hạ mức chắc chắn của cả câu).' }
        ]
      }
    ],
    errors: [
      { wrong: 'In principal, the system should work without supervision.', right: 'In principle, the system should work without supervision.', why: '"principle" là nguyên tắc; "principal" là hiệu trưởng hoặc chính yếu.' },
      { wrong: 'To some extent this is true.', right: 'To some extent this is true, in that costs did fall, although service worsened.', why: 'Khoanh vùng mà không nêu vùng thì câu thành nước đôi.' }
    ],
    examples: [
      ['To some extent this is true, in that costs did fall.', 'Điều này đúng ở một mức nào đó, cụ thể là chi phí có giảm thật.', 1, 'Khoanh vùng rồi nêu rõ vùng đó tới đâu.'],
      ['In principle the system works; in practice it often fails.', 'Về nguyên tắc thì hệ thống chạy được; thực tế thì hay hỏng.', 1, 'Cặp "in principle" và "in practice" rất được việc trong bài luận.'],
      ['Under certain conditions the reaction proceeds much faster.', 'Trong một số điều kiện nhất định, phản ứng xảy ra nhanh hơn nhiều.', 1, 'Khoanh điều kiện áp dụng.'],
      ['With some exceptions, the pattern holds across all six regions.', 'Trừ vài ngoại lệ, quy luật này đúng ở cả sáu vùng.', 1, 'Chừa ngoại lệ mà vẫn giữ được khẳng định chính.'],
      ['In principal, the system should work without supervision.', 'Về nguyên tắc, hệ thống chạy được mà không cần giám sát.', 0, 'Sai chính tả: sửa thành "In principle, the system should work without supervision."'],
      ['To some extent this is true.', 'Điều này đúng ở một mức nào đó.', 0, 'Nước đôi: sửa thành "To some extent this is true, in that costs did fall, although service worsened."']
    ],
    practice: [
      ['___ (In principle / In principal), the system should work without supervision.', 'In principle', 'Về nguyên tắc, hệ thống chạy được mà không cần giám sát.'],
      ['___ (To some extent / To some extend) this is true.', 'To some extent', 'Điều này đúng ở một mức nào đó.'],
      ['___ (Under certain conditions / Under certain condition) the reaction is faster.', 'Under certain conditions', 'Trong một số điều kiện nhất định, phản ứng nhanh hơn.'],
      ['___ (With some exceptions / With some exception), the pattern holds.', 'With some exceptions', 'Trừ vài ngoại lệ, quy luật này vẫn đúng.'],
      ['Bounding a claim keeps it ___ (strong / weak) within the stated limits.', 'strong', 'Khoanh vùng giữ nguyên sức mạnh của khẳng định trong phạm vi đã nêu.'],
      ['The word for a rule is ___ (principle / principal).', 'principle', 'Từ chỉ nguyên tắc là "principle".'],
      ['In principle it is free; ___ (in practice / in practise, US spelling) there are fees.', 'in practice', 'Về nguyên tắc là miễn phí; thực tế thì có phí.'],
      ['This holds ___ (at least in this context / at least in this contexts).', 'at least in this context', 'Điều này đúng, ít nhất là trong bối cảnh này.'],
      ['The claim is valid ___ (to a certain degree / to a certain degrees).', 'to a certain degree', 'Khẳng định này đúng ở một mức nhất định.'],
      ['A bounded claim shows the writer knows its ___ (limits / weaknesses).', 'limits', 'Khẳng định có biên cho thấy người viết biết rõ giới hạn của nó.']
    ]
  },

  {
    slug: 'hedging-calibration',
    en: 'Calibrating how much to hedge',
    vi: 'Cân liều rào đón — thiếu tay và quá tay đều hỏng',
    level: 'C1',
    summary: 'Không phải cứ rào đón nhiều là an toàn. Mức rào đón phải khớp với sức mạnh của bằng chứng: một đến hai lớp cho mỗi khẳng định.',
    formula: {
      rows: [
        ['Thiếu tay', 'This PROVES that X causes Y. — dữ liệu tương quan không chứng minh được nhân quả.'],
        ['Quá tay', 'It could possibly be argued that there may perhaps be some indication that…'],
        ['Vừa', 'These results SUGGEST that X MAY contribute to Y.'],
        ['Quy tắc ngón tay', 'Một tới hai lớp rào đón cho mỗi khẳng định là đủ.']
      ],
      note: 'Chữ "prove" gần như không bao giờ đúng trong bài viết khoa học xã hội: dữ liệu chỉ ủng hộ hay gợi ý, không chứng minh. Ngược lại, chồng bốn năm lớp rào đón thì người đọc không còn biết người viết định nói gì — người chấm coi đó là né tránh chứ không phải cẩn trọng.'
    },
    signals: ['prove khác suggest', 'chồng nhiều lớp rào đón', 'mức rào đón khớp bằng chứng'],
    useWhen: [
      'Rà lại bài Viết: soi từng khẳng định xem có khớp với bằng chứng đã đưa không.',
      'Viết phần Kết quả và Bàn luận của báo cáo.',
      'Bài Đọc: nhận ra tác giả đang tự tin tới đâu.'
    ],
    useNot: [
      { what: 'Không dùng "prove" cho dữ liệu tương quan.', why: 'Tương quan không phải nhân quả. Viết "suggest", "indicate" hoặc "are consistent with".' },
      { what: 'Không chồng quá hai lớp rào đón.', why: '"It may possibly perhaps suggest" rào tới mức câu không còn khẳng định gì. Người chấm coi là né tránh.' }
    ],
    confuse: [
      {
        with: 'rào đón đủ liều khác rào đón quá tay',
        tell: 'Đếm số lớp rào đón trong một khẳng định. Quá hai lớp thì bỏ bớt.',
        pair: [
          { en: 'These results suggest that X may contribute to Y.', vi: 'Kết quả cho thấy X có thể góp phần vào Y (hai lớp, vừa đủ).' },
          { en: 'It could possibly be argued that there may perhaps be some indication that X contributes to Y.', vi: 'Rào đón quá tay: câu không còn nói gì rõ ràng.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The survey proves that social media causes anxiety.', right: 'The survey suggests that social media may contribute to anxiety.', why: 'Dữ liệu khảo sát là tương quan, không chứng minh được nhân quả.' },
      { wrong: 'It could possibly be argued that there may perhaps be a link.', right: 'It could be argued that there is a link.', why: 'Bốn lớp rào đón chồng lên nhau; giữ một lớp là đủ.' }
    ],
    examples: [
      ['These results suggest that X may contribute to Y.', 'Kết quả cho thấy X có thể góp phần vào Y.', 1, 'Hai lớp rào đón, khớp với sức mạnh của bằng chứng.'],
      ['The findings are consistent with earlier work.', 'Các kết quả này nhất quán với những nghiên cứu trước.', 1, '"consistent with" cẩn trọng hơn hẳn "prove".'],
      ['It could be argued that there is a link.', 'Có thể lập luận rằng giữa hai bên có liên hệ.', 1, 'Một lớp rào đón, câu vẫn rõ ý.'],
      ['The experiment shows that the material expands when heated.', 'Thí nghiệm cho thấy vật liệu giãn nở khi bị nung.', 1, 'Bằng chứng thực nghiệm chắc chắn thì không cần rào đón.'],
      ['The survey proves that social media causes anxiety.', 'Khảo sát chứng minh mạng xã hội gây lo âu.', 0, 'Sai: sửa thành "The survey suggests that social media may contribute to anxiety."'],
      ['It could possibly be argued that there may perhaps be a link.', 'Có thể lập luận rằng có lẽ giữa hai bên có liên hệ nào đó.', 0, 'Quá tay: sửa thành "It could be argued that there is a link."']
    ],
    practice: [
      ['The survey ___ (suggests / proves) that social media may contribute to anxiety.', 'suggests', 'Khảo sát cho thấy mạng xã hội có thể góp phần gây lo âu.'],
      ['It could ___ (be argued / possibly perhaps be argued) that there is a link.', 'be argued', 'Có thể lập luận rằng giữa hai bên có liên hệ.'],
      ['Correlation does not establish ___ (causation / correlation).', 'causation', 'Tương quan không xác lập được quan hệ nhân quả.'],
      ['The findings are ___ (consistent with / proof of) earlier work.', 'consistent with', 'Các kết quả này nhất quán với những nghiên cứu trước.'],
      ['One or two hedges per claim is ___ (enough / too few).', 'enough', 'Một tới hai lớp rào đón cho mỗi khẳng định là đủ.'],
      ['The experiment ___ (shows / might possibly show) that metal expands when heated.', 'shows', 'Thí nghiệm cho thấy kim loại giãn nở khi bị nung.'],
      ['Over-hedging reads as ___ (evasive / careful).', 'evasive', 'Rào đón quá tay bị coi là né tránh.'],
      ['In social science, "prove" is ___ (rarely / usually) appropriate.', 'rarely', 'Trong khoa học xã hội, chữ "prove" hiếm khi phù hợp.'],
      ['These data ___ (indicate / definitively prove) a possible trend.', 'indicate', 'Dữ liệu này cho thấy một xu hướng khả dĩ.'],
      ['Match the hedge to the strength of the ___ (evidence / argument).', 'evidence', 'Cân mức rào đón theo sức mạnh của bằng chứng.']
    ]
  },

  {
    slug: 'written-request-formulae',
    en: 'Formal written requests',
    vi: 'Lời nhờ trong thư công việc — I would be grateful if…',
    level: 'C1',
    summary: 'Thư công việc có bộ khuôn riêng, học nguyên khối là dùng được ngay. Một chữ thiếu trong khuôn là lộ ngay người viết chưa quen.',
    formula: {
      rows: [
        ['Khuôn chuẩn nhất', 'I WOULD BE GRATEFUL IF YOU COULD send the report by Friday.'],
        ['Khuôn có "it" bắt buộc', 'I WOULD APPRECIATE IT IF YOU COULD confirm by Monday.'],
        ['Nhờ việc nhỏ', 'COULD YOU POSSIBLY forward me the file?'],
        ['Rào đón thêm một lớp', 'I WAS WONDERING WHETHER you might be able to help.'],
        ['Cụm kết thư', 'I LOOK FORWARD TO HEARING FROM YOU.']
      ],
      note: 'Chỗ sai kinh điển là bỏ mất chữ "it" trong "I would appreciate IT if you could…". Không có "it" thì câu thiếu tân ngữ. Nhớ mẹo: "appreciate" phải có cái gì đó để mà trân trọng, và cái đó chính là "it" — trỏ tới việc nêu trong mệnh đề "if".'
    },
    signals: ['I would be grateful if', 'I would appreciate it if', 'Could you possibly', 'I look forward to'],
    useWhen: [
      'Email công việc gửi người chưa quen hoặc người trên.',
      'Thư khiếu nại, thư xin việc, thư gửi cơ quan.',
      'Nhờ một việc đáng kể, cần giọng chỉn chu để người ta nhận lời.'
    ],
    useNot: [
      { what: 'Không bỏ "it" trong "I would appreciate it if…".', why: '"I would appreciate if you could" thiếu tân ngữ. Bắt buộc phải có "it".' },
      { what: 'Không dùng khuôn trang trọng cho việc vặt hằng ngày.', why: '"I would be grateful if you could pass the salt" nghe kỳ. Việc nhỏ thì "Could you pass the salt?" là đủ.' }
    ],
    confuse: [
      {
        with: '"grateful if" khác "appreciate it if"',
        tell: '"grateful" không cần "it"; "appreciate" bắt buộc có "it".',
        pair: [
          { en: 'I would be grateful if you could confirm.', vi: 'Tôi rất mong anh xác nhận giúp (không có "it").' },
          { en: 'I would appreciate it if you could confirm.', vi: 'Tôi rất mong anh xác nhận giúp (bắt buộc có "it").' }
        ]
      }
    ],
    errors: [
      { wrong: 'I would appreciate if you could confirm by Monday.', right: 'I would appreciate it if you could confirm by Monday.', why: 'Động từ "appreciate" cần tân ngữ "it".' },
      { wrong: 'I would be grateful if you could pass the salt.', right: 'Could you pass the salt, please?', why: 'Khuôn trang trọng dùng cho việc vặt trên bàn ăn thì lệch hẳn văn cảnh.' }
    ],
    examples: [
      ['I would be grateful if you could send the report by Friday.', 'Tôi rất mong anh gửi báo cáo trước thứ Sáu.', 1, 'Khuôn chuẩn nhất của thư công việc.'],
      ['I would appreciate it if you could confirm by Monday.', 'Tôi rất mong anh xác nhận trước thứ Hai.', 1, 'Chữ "it" là bắt buộc trong khuôn này.'],
      ['Could you possibly forward me the file?', 'Anh chuyển giúp tôi tệp đó được không ạ?', 1, '"possibly" làm mềm thêm một nấc.'],
      ['I look forward to hearing from you.', 'Tôi mong sớm nhận được hồi âm từ anh.', 1, 'Cụm kết thư chuẩn, sau "to" là danh động từ.'],
      ['I would appreciate if you could confirm by Monday.', 'Tôi rất mong anh xác nhận trước thứ Hai.', 0, 'Sai: sửa thành "I would appreciate it if you could confirm by Monday."'],
      ['I would be grateful if you could pass the salt.', 'Phiền anh đưa giúp lọ muối.', 0, 'Lệch văn cảnh: sửa thành "Could you pass the salt, please?"']
    ],
    practice: [
      ['I would appreciate ___ (it if / if) you could confirm by Monday.', 'it if', 'Tôi rất mong anh xác nhận trước thứ Hai.'],
      ['I would be ___ (grateful if / grateful it if) you could send the report.', 'grateful if', 'Tôi rất mong anh gửi báo cáo.'],
      ['Could you ___ (possibly / possible) forward me the file?', 'possibly', 'Anh chuyển giúp tôi tệp đó được không ạ?'],
      ['I look forward to ___ (hearing / hear) from you.', 'hearing', 'Tôi mong sớm nhận được hồi âm.'],
      ['For the salt at dinner, say ___ (Could you pass the salt / I would be grateful if you could pass the salt).', 'Could you pass the salt', 'Trên bàn ăn thì nói "Could you pass the salt".'],
      ['"Appreciate" in this formula needs the object ___ (it / that).', 'it', 'Trong khuôn này, "appreciate" cần tân ngữ "it".'],
      ['I was ___ (wondering whether / wonder whether) you might be able to help.', 'wondering whether', 'Không biết anh có giúp được không ạ.'],
      ['Please ___ (find attached / find attach) the signed contract.', 'find attached', 'Đính kèm là bản hợp đồng đã ký.'],
      ['These formulae suit ___ (formal email / casual chat).', 'formal email', 'Các khuôn này hợp với email trang trọng.'],
      ['I would be grateful ___ (if you could / that you could) reply by Thursday.', 'if you could', 'Tôi rất mong anh hồi âm trước thứ Năm.']
    ]
  },

  {
    slug: 'softening-criticism',
    en: 'Softening criticism',
    vi: 'Góp ý phê bình cho nhã',
    level: 'C1',
    summary: 'Chuyển lời chê thẳng thành lời gợi ý hướng sửa. Người nghe tiếp thu được, mà nội dung góp ý không mất chút nào.',
    formula: {
      rows: [
        ['Nêu chỗ cần sửa, không nêu chỗ dở', 'THERE IS ROOM FOR IMPROVEMENT in the introduction.'],
        ['Gợi ý bằng điều kiện', 'The argument WOULD BE STRONGER IF you added an example.'],
        ['Dùng "might be worth"', 'IT MIGHT BE WORTH reconsidering the structure.'],
        ['Nêu hướng thay vì nêu lỗi', 'ONE AREA TO LOOK AT IS the conclusion.']
      ],
      note: 'Cơ chế chung: đổi từ mô tả hiện trạng xấu sang mô tả trạng thái tốt hơn mà bài có thể đạt tới. "Your conclusion is weak" nói về cái đã hỏng; "The conclusion would be stronger with a clear recommendation" nói về cái sắp làm được. Cùng một thông tin, người nhận phản ứng khác hẳn.'
    },
    signals: ['room for improvement', 'would be stronger if', 'might be worth', 'one area to look at'],
    useWhen: [
      'Nhận xét bài của đồng nghiệp, học viên, hoặc bạn cùng nhóm.',
      'Phản hồi trong công việc: đánh giá, họp rút kinh nghiệm.',
      'Bài Viết dạng thư góp ý hoặc thư khiếu nại cần giữ quan hệ.'
    ],
    useNot: [
      { what: 'Không nhã tới mức người nghe không biết là bị chê.', why: '"It is quite interesting" mà thật ra là dở thì người nhận không sửa gì. Nêu rõ chỗ cần sửa, chỉ khác cách diễn đạt.' },
      { what: 'Không dùng lối này khi cần cảnh báo dứt khoát.', why: 'Vấn đề an toàn hay sai phạm nghiêm trọng thì phải nói thẳng, không rào đón.' }
    ],
    confuse: [
      {
        with: 'góp ý nhã khác nói vòng vo',
        tell: 'Góp ý nhã vẫn nêu rõ chỗ cần sửa. Nói vòng vo thì người nghe không biết phải làm gì.',
        pair: [
          { en: 'The conclusion would be stronger with a clear recommendation.', vi: 'Phần kết sẽ mạnh hơn nếu có một khuyến nghị rõ ràng (nhã mà rõ).' },
          { en: 'The conclusion is quite interesting.', vi: 'Phần kết cũng thú vị đấy (vòng vo, người nhận không biết sửa gì).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Your introduction is bad and the structure is a mess.', right: 'There is room for improvement in the introduction, and it might be worth reconsidering the structure.', why: 'Chê thẳng làm người nhận phòng thủ, không tiếp thu được.' },
      { wrong: 'The safety guard is quite interesting as it is.', right: 'The safety guard is missing and must be fitted before the machine is used.', why: 'Chuyện an toàn thì phải nói thẳng, không rào đón.' }
    ],
    examples: [
      ['There is room for improvement in the introduction.', 'Phần mở bài còn chỗ để cải thiện.', 1, 'Nêu hướng sửa thay vì nêu chỗ dở.'],
      ['The argument would be stronger if you added an example.', 'Lập luận sẽ chặt hơn nếu bạn thêm một ví dụ.', 1, 'Gợi ý bằng câu điều kiện — rất dễ tiếp thu.'],
      ['It might be worth reconsidering the structure.', 'Có lẽ nên cân nhắc lại bố cục.', 1, '"might be worth" mềm mà vẫn rõ ý.'],
      ['The safety guard is missing and must be fitted before use.', 'Thiếu tấm chắn an toàn, phải lắp trước khi dùng máy.', 1, 'Đối chiếu: chuyện an toàn thì nói thẳng, không rào đón.'],
      ['Your introduction is bad and the structure is a mess.', 'Mở bài của bạn dở và bố cục thì lộn xộn.', 0, 'Cộc: sửa thành "There is room for improvement in the introduction, and it might be worth reconsidering the structure."'],
      ['The conclusion is quite interesting.', 'Phần kết cũng thú vị đấy.', 0, 'Vòng vo: nếu ý là chê thì sửa thành "The conclusion would be stronger with a clear recommendation."']
    ],
    practice: [
      ['There is ___ (room for improvement / a big problem) in the introduction.', 'room for improvement', 'Phần mở bài còn chỗ để cải thiện.'],
      ['The argument ___ (would be stronger if / is weak because) you added an example.', 'would be stronger if', 'Lập luận sẽ chặt hơn nếu bạn thêm một ví dụ.'],
      ['It ___ (might be worth / is necessary to) reconsidering the structure.', 'might be worth', 'Có lẽ nên cân nhắc lại bố cục.'],
      ['One area ___ (to look at / of failure) is the conclusion.', 'to look at', 'Một chỗ nên xem lại là phần kết.'],
      ['Softened criticism should still be ___ (specific / vague).', 'specific', 'Góp ý nhã vẫn phải nêu rõ chỗ cần sửa.'],
      ['For a safety fault, be ___ (direct / indirect).', 'direct', 'Với lỗi an toàn thì phải nói thẳng.'],
      ['The report ___ (could benefit from / is ruined by) a clearer summary.', 'could benefit from', 'Báo cáo sẽ tốt hơn nếu có phần tóm tắt rõ hơn.'],
      ['Describe the ___ (improved version / current fault) to sound constructive.', 'improved version', 'Mô tả bản tốt hơn thay vì mô tả cái đang hỏng.'],
      ['Have you ___ (considered / failed to consider) adding a chart here?', 'considered', 'Bạn đã nghĩ tới việc thêm một biểu đồ ở đây chưa?'],
      ['Being too gentle risks the reader not ___ (noticing / enjoying) the problem.', 'noticing', 'Nhã quá thì người đọc không nhận ra là có vấn đề.']
    ]
  },

  {
    slug: 'understatement-litotes',
    en: 'Understatement and litotes',
    vi: 'Nói giảm — not bad, not uncommon, no small task',
    level: 'C1',
    summary: 'Khen bằng cách phủ định điều ngược lại. Người học hay hiểu ngược: "not bad" là khen chứ không phải chê nhẹ.',
    formula: {
      rows: [
        ['not + tính từ xấu = khen', 'NOT BAD = khá tốt · NOT UNCOMMON = khá phổ biến'],
        ['no small + danh từ = lớn', 'NO SMALL achievement = một thành tựu đáng kể'],
        ['not exactly + khen = chê', 'NOT EXACTLY cheap = đắt'],
        ['I would not say no = đồng ý', '"Fancy a coffee?" — "I WOULD NOT SAY NO."']
      ],
      note: 'Đây là nếp rất đậm trong tiếng Anh, nhất là Anh-Anh: khen thẳng bị coi là quá đà nên người ta khen bằng lối phủ định. Nghe "The food was not bad" mà tưởng là chê thì hiểu ngược hẳn ý người nói — đó là một lời khen thật lòng, chỉ nói kiểu kiềm chế.'
    },
    signals: ['not bad', 'not uncommon', 'no small', 'not exactly', 'I would not say no'],
    useWhen: [
      'Khen mà không muốn nghe quá đà, nhất là trong văn hoá Anh.',
      'Chê nhẹ bằng lối "not exactly": "The service was not exactly quick."',
      'Bài Đọc và phần Nghe: nhận ra ý thật đằng sau lời phủ định.'
    ],
    useNot: [
      { what: 'Không hiểu "not bad" là chê.', why: '"The film was not bad" là một lời khen thật, nghĩa là khá hay, chỉ nói theo lối kiềm chế.' },
      { what: 'Không dùng lối nói giảm trong văn bản cần rõ ràng tuyệt đối.', why: 'Hướng dẫn an toàn hay báo cáo kỹ thuật mà viết "the risk is not insignificant" thì người đọc dễ hiểu nhẹ đi. Viết thẳng mức rủi ro.' }
    ],
    confuse: [
      {
        with: '"not bad" khác "not good"',
        tell: 'Phủ định một tính từ XẤU thì thành khen. Phủ định một tính từ TỐT thì thành chê.',
        pair: [
          { en: 'The food was not bad at all.', vi: 'Đồ ăn khá ngon đấy chứ (khen).' },
          { en: 'The food was not very good.', vi: 'Đồ ăn không ngon lắm (chê).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The safety report says the risk is not insignificant, so we can relax.', right: 'The safety report says the risk is not insignificant, so we must act on it.', why: '"not insignificant" nghĩa là đáng kể; hiểu ngược thành nhẹ là nguy hiểm.' },
      { wrong: 'Fancy a coffee? — I would not say no, so no thanks.', right: 'Fancy a coffee? — I would not say no, thanks.', why: '"I would not say no" nghĩa là có, xin cảm ơn.' }
    ],
    examples: [
      ['The food was not bad at all.', 'Đồ ăn khá ngon đấy chứ.', 1, 'Phủ định tính từ xấu thành lời khen.'],
      ['Finishing the project on time was no small achievement.', 'Xong dự án đúng hạn là một thành tựu đáng kể.', 1, '"no small" nghĩa là lớn.'],
      ['The service was not exactly quick.', 'Phục vụ thì không nhanh cho lắm.', 1, '"not exactly" là chê nhẹ.'],
      ['Delays of this kind are not uncommon in July.', 'Chậm trễ kiểu này không hiếm vào tháng Bảy.', 1, '"not uncommon" nghĩa là khá phổ biến.'],
      ['The safety report says the risk is not insignificant, so we can relax.', 'Báo cáo an toàn nói rủi ro là không nhỏ, nên chúng ta yên tâm.', 0, 'Hiểu ngược: sửa thành "…so we must act on it."'],
      ['Fancy a coffee? — I would not say no, so no thanks.', 'Uống cà phê không? — Cũng được, nên thôi không uống.', 0, 'Hiểu ngược: "I would not say no" là đồng ý, sửa thành "I would not say no, thanks."']
    ],
    practice: [
      ['"The food was not bad" is a ___ (compliment / complaint).', 'compliment', 'Câu "The food was not bad" là một lời khen.'],
      ['Finishing on time was ___ (no small / not a small) achievement.', 'no small', 'Xong đúng hạn là một thành tựu đáng kể.'],
      ['The service was ___ (not exactly / not exact) quick.', 'not exactly', 'Phục vụ thì không nhanh cho lắm.'],
      ['Delays are ___ (not uncommon / not common) in July, they happen often.', 'not uncommon', 'Chậm trễ không hiếm vào tháng Bảy, chuyện đó xảy ra luôn.'],
      ['"The risk is not insignificant" means the risk is ___ (considerable / tiny).', 'considerable', 'Câu đó nghĩa là rủi ro đáng kể.'],
      ['Fancy a coffee? — I would not say ___ (no / yes).', 'no', 'Uống cà phê không? — Có chứ.'],
      ['Negating a ___ (negative / positive) adjective creates praise.', 'negative', 'Phủ định một tính từ xấu thì thành lời khen.'],
      ['Her performance was ___ (not unimpressive / not impressive) — everyone applauded.', 'not unimpressive', 'Màn trình diễn của cô ấy khá ấn tượng, ai cũng vỗ tay.'],
      ['Avoid understatement in ___ (safety instructions / casual chat).', 'safety instructions', 'Tránh nói giảm trong hướng dẫn an toàn.'],
      ['"He is no fool" means he is ___ (clever / foolish).', 'clever', 'Câu "He is no fool" nghĩa là ông ta khôn.']
    ]
  },

  {
    slug: 'euphemism',
    en: 'Euphemism',
    vi: 'Uyển ngữ — pass away, let go, between jobs',
    level: 'C1',
    summary: 'Nói tránh chuyện đau lòng hoặc khó nói. Có loại là tử tế thật, có loại là né trách nhiệm — đọc kỹ phải phân biệt được.',
    formula: {
      rows: [
        ['Vì tế nhị', 'PASS AWAY = die · SENIOR CITIZENS = old people'],
        ['Vì thể diện', 'BETWEEN JOBS = unemployed · LET GO = fired'],
        ['Vì né trách nhiệm', 'ECONOMICAL WITH THE TRUTH = lying · DOWNSIZING = sa thải hàng loạt'],
        ['Từ trực tiếp', 'die · fired · unemployed · lying']
      ],
      note: 'Phân biệt hai loại là kỹ năng đọc quan trọng: uyển ngữ về cái chết hay bệnh tật là phép lịch sự thật lòng, nên dùng. Còn uyển ngữ của doanh nghiệp và chính trị ("downsizing", "collateral damage", "revenue enhancement") là để làm nhẹ đi chuyện khó nghe — người đọc tỉnh táo phải dịch ngược lại thành từ trực tiếp mới thấy chuyện gì đang xảy ra.'
    },
    signals: ['pass away', 'let go', 'between jobs', 'downsizing', 'economical with the truth'],
    useWhen: [
      'Nói về cái chết, bệnh tật, tuổi già với người trong cuộc.',
      'Giữ thể diện cho người khác khi nhắc chuyện tế nhị.',
      'Bài Đọc: nhận ra chỗ tác giả hoặc tổ chức đang làm nhẹ chuyện khó nghe.'
    ],
    useNot: [
      { what: 'Không dùng uyển ngữ ở nơi cần chính xác.', why: 'Hồ sơ y tế hay văn bản pháp lý phải ghi "died", không ghi "passed away".' },
      { what: 'Không để uyển ngữ của tổ chức che mất sự việc khi mình viết bài phân tích.', why: 'Viết "the company downsized" thì nên nói rõ luôn: "…made 200 staff redundant".' }
    ],
    confuse: [
      {
        with: 'uyển ngữ tử tế khác uyển ngữ né tránh',
        tell: 'Hỏi: nói tránh để đỡ đau lòng cho người trong cuộc, hay để người nói bớt phải chịu trách nhiệm?',
        pair: [
          { en: 'I was sorry to hear your grandmother passed away.', vi: 'Tôi rất tiếc khi nghe tin bà bạn qua đời (tử tế thật lòng).' },
          { en: 'The company is downsizing its workforce.', vi: 'Công ty đang tinh giản nhân sự (né tránh: thực chất là sa thải).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The medical record states that the patient passed away at 3 a.m.', right: 'The medical record states that the patient died at 3 a.m.', why: 'Hồ sơ y tế cần từ chính xác, không dùng uyển ngữ.' },
      { wrong: 'The minister was economical with the truth, which means he was careful.', right: 'The minister was economical with the truth, which means he lied.', why: 'Hiểu sai uyển ngữ: cụm này nghĩa là nói dối.' }
    ],
    examples: [
      ['I was sorry to hear your grandmother passed away.', 'Tôi rất tiếc khi nghe tin bà bạn qua đời.', 1, 'Uyển ngữ tử tế, dùng đúng chỗ.'],
      ['Two hundred staff were let go last year.', 'Hai trăm nhân viên bị cho thôi việc năm ngoái.', 1, '"let go" nhẹ hơn "fired", vẫn hiểu được.'],
      ['The medical record states that the patient died at 3 a.m.', 'Hồ sơ y tế ghi bệnh nhân tử vong lúc 3 giờ sáng.', 1, 'Văn bản chính xác thì dùng từ trực tiếp.'],
      ['The company calls it downsizing; in fact it is making people redundant.', 'Công ty gọi đó là tinh giản; thực chất là cho người ta nghỉ việc.', 1, 'Dịch ngược uyển ngữ — đúng việc của người đọc tỉnh táo.'],
      ['The medical record states that the patient passed away at 3 a.m.', 'Hồ sơ y tế ghi bệnh nhân qua đời lúc 3 giờ sáng.', 0, 'Sai văn cảnh: sửa thành "…the patient died at 3 a.m."'],
      ['The minister was economical with the truth, which means he was careful.', 'Bộ trưởng đã dè sẻn với sự thật, nghĩa là ông ấy thận trọng.', 0, 'Hiểu sai: sửa thành "…which means he lied."']
    ],
    practice: [
      ['"Passed away" is a gentler way of saying ___ (died / left).', 'died', 'Cụm "passed away" là cách nói nhẹ của "died".'],
      ['In a medical record write ___ (died / passed away).', 'died', 'Trong hồ sơ y tế thì viết "died".'],
      ['"Let go" in a work context means ___ (dismissed / promoted).', 'dismissed', 'Cụm "let go" trong công việc nghĩa là bị cho thôi việc.'],
      ['"Between jobs" means currently ___ (unemployed / travelling).', 'unemployed', 'Cụm "between jobs" nghĩa là đang thất nghiệp.'],
      ['"Economical with the truth" means ___ (lying / saving money).', 'lying', 'Cụm "economical with the truth" nghĩa là nói dối.'],
      ['"Downsizing" usually means making staff ___ (redundant / happier).', 'redundant', 'Từ "downsizing" thường nghĩa là cho nhân viên nghỉ việc.'],
      ['Euphemism about death is usually ___ (kind / evasive).', 'kind', 'Uyển ngữ về cái chết thường là phép lịch sự tử tế.'],
      ['Corporate euphemism is often ___ (evasive / kind).', 'evasive', 'Uyển ngữ của doanh nghiệp thường mang tính né tránh.'],
      ['A critical reader should ___ (translate / accept) corporate euphemism.', 'translate', 'Người đọc tỉnh táo nên dịch ngược uyển ngữ của doanh nghiệp.'],
      ['Legal documents need ___ (direct / softened) wording.', 'direct', 'Văn bản pháp lý cần từ ngữ trực tiếp.']
    ]
  },

  {
    slug: 'spoken-vs-written-grammar',
    en: 'The grammar of speech',
    vi: 'Ngữ pháp của văn nói — lược bỏ, đuôi câu, câu ngắn',
    level: 'C1',
    summary: 'Văn nói có ngữ pháp riêng, không phải văn viết bị hỏng. Biết rõ ranh giới thì nói mới tự nhiên mà viết vẫn chỉn chu.',
    formula: {
      rows: [
        ['Lược bỏ đầu câu', '"WANT A COFFEE?" = Do you want a coffee? · "SEEN HIM?" = Have you seen him?'],
        ['Đuôi câu nhắc lại', '"He is clever, THAT BOY."'],
        ['Đưa chủ đề lên đầu', '"THAT NEW CAFE — have you been?"'],
        ['Từ đệm', 'you know · I mean · sort of · well'],
        ['Trong bài viết', 'Bỏ hết những lối trên, viết câu đủ thành phần.']
      ],
      note: 'Điều quan trọng là những lối này KHÔNG PHẢI lỗi: chúng có quy luật hẳn hoi và người bản ngữ dùng suốt. Học viên chỉ nói bằng câu viết đầy đủ thì nghe cứng và xa cách. Ngược lại, bê "Want a coffee?" vào bài luận thì mất điểm ngay. Biết cả hai và biết khi nào dùng cái nào mới là đích của bậc C1.'
    },
    signals: ['lược bỏ chủ ngữ và trợ động từ', 'đuôi câu', 'từ đệm', 'câu ngắn'],
    useWhen: [
      'Phần Nói của kỳ thi: nói tự nhiên, có nhịp hội thoại thật.',
      'Tin nhắn và hội thoại đời thường.',
      'Viết đối thoại trong truyện: giữ nguyên đặc điểm văn nói cho thật.'
    ],
    useNot: [
      { what: 'Không dùng lối lược bỏ trong bài viết trang trọng.', why: '"Want a coffee?" trong email công việc hay bài luận là lệch hẳn giọng. Viết đủ: "Would you like a coffee?"' },
      { what: 'Không coi các lối này là tiếng Anh sai.', why: 'Chúng có quy luật riêng và người bản ngữ dùng thường xuyên. Chỉ nói bằng câu viết đầy đủ thì nghe cứng.' }
    ],
    confuse: [
      {
        with: 'ngữ pháp văn nói khác câu viết sai',
        tell: 'Văn nói lược bỏ theo quy luật, phục hồi lại được đầy đủ. Câu sai thì phục hồi kiểu gì cũng không thành câu đúng.',
        pair: [
          { en: 'Seen him lately?', vi: 'Dạo này có gặp anh ta không? (lược bỏ có quy luật, phục hồi thành "Have you seen him lately?").' },
          { en: 'Have you seen him lately?', vi: 'Dạo này bạn có gặp anh ta không? (bản đầy đủ, hợp văn viết).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Dear Ms Ha, Want to meet on Tuesday?', right: 'Dear Ms Ha, Would you be free to meet on Tuesday?', why: 'Lối lược bỏ của văn nói không hợp email trang trọng.' },
      { wrong: 'The essay argues that, you know, the policy sort of failed.', right: 'The essay argues that the policy failed.', why: 'Từ đệm của văn nói không có chỗ trong bài viết.' }
    ],
    examples: [
      ['Want a coffee?', 'Uống cà phê không?', 1, 'Lược bỏ "Do you" — hoàn toàn tự nhiên khi nói.'],
      ['He is clever, that boy.', 'Thằng bé ấy thông minh phết.', 1, 'Đuôi câu nhắc lại chủ ngữ, đặc trưng văn nói.'],
      ['Would you like a coffee?', 'Bạn có muốn uống cà phê không?', 1, 'Bản đầy đủ, hợp cả văn viết lẫn văn nói trang trọng.'],
      ['The essay argues that the policy failed.', 'Bài luận lập luận rằng chính sách đó đã thất bại.', 1, 'Không từ đệm, không lược bỏ — đúng giọng bài viết.'],
      ['Dear Ms Ha, Want to meet on Tuesday?', 'Kính gửi cô Hà, gặp thứ Ba nhé?', 0, 'Lệch giọng: sửa thành "Dear Ms Ha, Would you be free to meet on Tuesday?"'],
      ['The essay argues that, you know, the policy sort of failed.', 'Bài luận lập luận rằng, kiểu như, chính sách đó hơi thất bại.', 0, 'Lệch giọng: sửa thành "The essay argues that the policy failed."']
    ],
    practice: [
      ['In speech, ___ (Want a coffee? / Would you like a coffee?) is natural.', 'Want a coffee?', 'Khi nói chuyện thì "Want a coffee?" rất tự nhiên.'],
      ['In a formal email, write ___ (Would you like a coffee? / Want a coffee?).', 'Would you like a coffee?', 'Trong email trang trọng thì viết đầy đủ.'],
      ['"He is clever, that boy" uses a spoken ___ (tail / heading).', 'tail', 'Câu đó dùng đuôi câu, một nét của văn nói.'],
      ['"Seen him lately?" is short for "___ (Have you seen / Did you saw) him lately?".', 'Have you seen', 'Câu đó là dạng rút của "Have you seen him lately?".'],
      ['Fillers like "you know" belong in ___ (speech / essays).', 'speech', 'Các từ đệm như "you know" thuộc về văn nói.'],
      ['Spoken ellipsis is ___ (rule-governed / random).', 'rule-governed', 'Lối lược bỏ trong văn nói có quy luật rõ ràng.'],
      ['The essay argues that the policy ___ (failed / sort of failed).', 'failed', 'Bài luận lập luận rằng chính sách đó đã thất bại.'],
      ['Speaking only in full written sentences sounds ___ (stiff / natural).', 'stiff', 'Chỉ nói bằng câu viết đầy đủ thì nghe cứng.'],
      ['In a story, dialogue should keep ___ (spoken features / formal grammar).', 'spoken features', 'Trong truyện, lời thoại nên giữ nét của văn nói.'],
      ['Knowing the boundary is the real ___ (skill / rule).', 'skill', 'Biết ranh giới giữa hai bên mới là kỹ năng thật sự.']
    ]
  },

  {
    slug: 'stance-markers',
    en: 'Marking your own stance',
    vi: 'Đánh dấu lập trường cá nhân — In my view, I would argue',
    level: 'C1',
    summary: 'Nêu rõ đây là ý mình chứ không phải sự thật chung. Ngược với lối phi ngôi ở bậc B2: chỗ này là chủ động đưa mình vào.',
    formula: {
      rows: [
        ['Trung tính', 'IN MY VIEW · IT SEEMS TO ME THAT'],
        ['Học thuật hơn', 'I WOULD ARGUE THAT · THIS PAPER ARGUES THAT'],
        ['Thân mật', 'PERSONALLY · IF YOU ASK ME'],
        ['CẤM', 'ACCORDING TO ME ✗ — "according to" chỉ dùng cho nguồn khác.']
      ],
      note: 'Hai lỗi hay gặp. Một là "According to me" — cụm "according to" dành cho nguồn khác, nói về mình thì dùng "In my view". Hai là chồng đôi: "In my opinion, I think that…" đánh dấu lập trường hai lần, thừa một nửa. Chọn một trong hai là đủ.'
    },
    signals: ['In my view', 'I would argue', 'It seems to me', 'Personally', 'This paper argues'],
    useWhen: [
      'Bài Viết dạng nêu quan điểm: bài IELTS Task 2 chấp nhận và thường đòi hỏi nêu rõ lập trường.',
      'Tách ý kiến riêng khỏi phần thuật lại nguồn, để người đọc biết đâu là đâu.',
      'Tranh luận: nêu rõ đây là cách mình nhìn nhận.'
    ],
    useNot: [
      { what: 'Không viết "According to me".', why: '"according to" chỉ dùng cho nguồn khác: "according to Smith". Nói về mình thì "In my view".' },
      { what: 'Không đánh dấu lập trường hai lần.', why: '"In my opinion, I think that…" thừa. Chọn "In my opinion, …" hoặc "I think that…".' }
    ],
    confuse: [
      {
        with: 'đánh dấu lập trường khác nói phi ngôi',
        tell: 'Đánh dấu lập trường là chủ động nhận đây là ý mình. Nói phi ngôi là cố ý giấu mình đi.',
        pair: [
          { en: 'In my view, the policy has failed.', vi: 'Theo tôi, chính sách này đã thất bại (nhận là ý mình).' },
          { en: 'It is widely accepted that the policy has failed.', vi: 'Người ta nhìn chung cho rằng chính sách này đã thất bại (giấu mình đi).' }
        ]
      }
    ],
    errors: [
      { wrong: 'According to me, the policy has failed.', right: 'In my view, the policy has failed.', why: '"according to" chỉ dùng cho nguồn khác, không dùng cho chính mình.' },
      { wrong: 'In my opinion, I think that the policy has failed.', right: 'In my opinion, the policy has failed.', why: 'Đánh dấu lập trường hai lần là thừa.' }
    ],
    examples: [
      ['In my view, the policy has failed.', 'Theo tôi, chính sách này đã thất bại.', 1, 'Cách nêu lập trường trung tính, dùng được cả trong bài luận.'],
      ['I would argue that the evidence points the other way.', 'Tôi cho rằng bằng chứng lại chỉ theo hướng ngược lại.', 1, '"I would argue" học thuật hơn "I think".'],
      ['It seems to me that the sample was too small.', 'Tôi thấy hình như mẫu khảo sát quá nhỏ.', 1, 'Nêu ý mình mà vẫn giữ giọng dè dặt.'],
      ['It is widely accepted that the policy has failed.', 'Người ta nhìn chung cho rằng chính sách này đã thất bại.', 1, 'Đối chiếu: lối phi ngôi giấu người viết đi.'],
      ['According to me, the policy has failed.', 'Theo tôi, chính sách này đã thất bại.', 0, 'Sai: sửa thành "In my view, the policy has failed."'],
      ['In my opinion, I think that the policy has failed.', 'Theo ý kiến tôi, tôi nghĩ rằng chính sách này đã thất bại.', 0, 'Thừa: sửa thành "In my opinion, the policy has failed."']
    ],
    practice: [
      ['___ (In my view / According to me), the policy has failed.', 'In my view', 'Theo tôi, chính sách này đã thất bại.'],
      ['___ (In my opinion, the policy has failed / In my opinion, I think that the policy has failed).', 'In my opinion, the policy has failed', 'Theo ý kiến tôi, chính sách này đã thất bại.'],
      ['I ___ (would argue / would arguing) that the evidence points the other way.', 'would argue', 'Tôi cho rằng bằng chứng chỉ theo hướng ngược lại.'],
      ['"According to" is used for ___ (other sources / yourself).', 'other sources', 'Cụm "according to" dùng cho nguồn khác.'],
      ['It ___ (seems to me / seems to my) that the sample was too small.', 'seems to me', 'Tôi thấy hình như mẫu khảo sát quá nhỏ.'],
      ['___ (Personally / Personal), I would choose the second option.', 'Personally', 'Cá nhân tôi thì chọn phương án hai.'],
      ['Stance markers ___ (add / remove) the writer from the claim.', 'add', 'Đánh dấu lập trường là đưa người viết vào khẳng định.'],
      ['This paper ___ (argues / arguing) that the two effects are linked.', 'argues', 'Bài viết này lập luận rằng hai hiệu ứng có liên hệ.'],
      ['Marking stance twice in one sentence is ___ (redundant / emphatic).', 'redundant', 'Đánh dấu lập trường hai lần trong một câu là thừa.'],
      ['IELTS Task 2 usually ___ (expects / forbids) a clear stance.', 'expects', 'Bài IELTS Task 2 thường đòi hỏi nêu rõ lập trường.']
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
