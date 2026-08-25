/**
 * Ngữ pháp — nhóm GIỚI TỪ và CỤM GIỚI TỪ, phần bậc C1–C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tệp thứ ba và cuối cùng của nhóm. Hạn mức 35 điểm: A1–A2 13, B1–B2 13, và
 * 9 điểm ở đây (C1 5, C2 4). Vậy là nhóm đủ 35/35.
 *
 * Bậc dưới chọn giới từ để câu đúng. Bậc này chọn giới từ để câu nói ĐÚNG THỨ
 * MÌNH ĐỊNH NÓI, và cái được chọn thường không phải giới từ đơn nữa mà là cả
 * một cụm cố định. Ba việc phân biệt bậc này:
 *
 *   · CHIỀU CỦA QUAN HỆ. result IN và result FROM trỏ ngược nhau: một bên là
 *     nguyên nhân dẫn tới kết quả, một bên là kết quả sinh ra từ nguyên nhân.
 *     Viết ngược là đảo hẳn lập luận, mà câu vẫn trôi chảy nên không ai sửa.
 *   · KHUÔN DANH TỪ HOÁ. Văn học thuật và báo cáo dựng câu quanh danh từ chứ
 *     không quanh động từ, nên giới từ trở thành thứ nối các danh từ đó lại:
 *     the impact OF X ON Y, a shift FROM A TO B.
 *   · CỤM CỐ ĐỊNH của văn bản pháp lý và trang trọng — pursuant to, subject to,
 *     notwithstanding. Không suy ra được, và cũng không nên dùng bừa: dùng sai
 *     chỗ thì câu nghe khoa trương chứ không nghe trang trọng.
 *
 * Ghi chú tránh trùng — đã đối chiếu với ngân hàng hiện có:
 *   · Đưa CỤM GIỚI TỪ lên đầu câu để nối mạch thuộc `grammar-emphasis-c2.js`
 *     (nhóm nhấn mạnh, C2). Ở đây không bàn phép đảo hay phép đưa lên đầu.
 *   · although / despite thuộc `adverbial-concession` (nhóm mệnh đề, B1);
 *     because of thuộc `adverbial-reason-basic` (A2). Không nhắc lại.
 *   · Giới từ đi với which và whom thuộc `relative-preposition` (nhóm mệnh đề,
 *     B2). Ở đây không bàn mệnh đề quan hệ.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'prep-academic-noun-patterns',
    en: 'the impact of X on Y, a shift from A to B',
    vi: 'Khuôn danh từ hoá — the impact of X on Y, a shift from A to B',
    level: 'C1',
    summary: 'Văn học thuật và báo cáo dựng câu quanh danh từ chứ không quanh động từ. Khi đó giới từ là thứ gánh toàn bộ quan hệ giữa các danh từ, và mỗi danh từ đòi một bộ giới từ riêng.',
    formula: {
      rows: [
        ['impact / effect / influence', 'the impact OF automation ON employment — of dẫn tới nguyên nhân, on dẫn tới đối tượng chịu.'],
        ['shift / change / move', 'a shift FROM coal TO gas — from là điểm đầu, to là điểm cuối.'],
        ['relationship / difference / gap', 'the relationship BETWEEN income AND health — between … and, không dùng with.'],
        ['increase / decline / rise', 'a decline IN quality OF 20 per cent — in dẫn tới thứ giảm, of dẫn tới mức giảm.'],
        ['approach / solution / response', 'an approach TO the problem · a response TO criticism']
      ],
      note: 'Chỗ sai nặng nhất là "the impact on X of Y" đảo ngược. Trật tự tự nhiên là NGUỒN trước, ĐỐI TƯỢNG sau: impact of A on B. Viết ngược thì người đọc hiểu ngược chiều nhân quả, mà câu vẫn đúng ngữ pháp nên không có gì báo động.'
    },
    signals: ['câu dựng quanh một danh từ trừu tượng', 'hai danh từ nối nhau bằng hai giới từ', 'văn báo cáo hoặc bài luận'],
    useWhen: [
      'Viết mở bài một bài luận: "This essay examines the impact of tourism on local culture."',
      'Mô tả số liệu trong báo cáo: "There was a shift from print to digital."',
      'Nêu quan hệ: "The relationship between sleep and memory is well documented."'
    ],
    useNot: [
      { what: 'Không đảo trật tự of và on trong impact.', why: '"the impact on employment of automation" nghe rối. Trật tự tự nhiên là "the impact of automation on employment".' },
      { what: 'Không dùng with sau relationship khi nói quan hệ giữa hai khái niệm.', why: '"the relationship with income and health" sai. Đúng là "between income and health".' }
    ],
    confuse: [
      {
        with: 'an increase IN khác an increase OF',
        tell: 'in dẫn tới THỨ thay đổi, of dẫn tới MỨC thay đổi. Một câu đầy đủ mang cả hai, và trật tự là in trước of sau.',
        pair: [
          { en: 'There was an increase in unemployment.', vi: 'Thất nghiệp có tăng (tăng ở cái gì).' },
          { en: 'There was an increase of three per cent in unemployment.', vi: 'Thất nghiệp tăng ba phần trăm (cả mức lẫn thứ tăng).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The study examines the effect on health of diet.', right: 'The study examines the effect of diet on health.', why: 'Nguồn đứng trước, đối tượng chịu đứng sau.' },
      { wrong: 'There is a clear difference among the two methods.', right: 'There is a clear difference between the two methods.', why: 'Hai thứ đếm được thì dùng between, không dùng among.' }
    ],
    examples: [
      ['The report measures the impact of the policy on small firms.', 'Báo cáo đo tác động của chính sách lên doanh nghiệp nhỏ.', 1, 'impact of A on B, đúng trật tự.'],
      ['We observed a shift from formal to informal language.', 'Chúng tôi quan sát thấy sự chuyển từ văn trang trọng sang văn thân mật.', 1, 'shift from A to B.'],
      ['The relationship between exercise and mood is complex.', 'Quan hệ giữa vận động và tâm trạng khá phức tạp.', 1, 'relationship between A and B.'],
      ['There has been a decline in the quality of applications.', 'Chất lượng hồ sơ đã giảm sút.', 1, 'decline in + thứ giảm.'],
      ['The study examines the effect on health of diet.', 'Nghiên cứu xem xét tác động của chế độ ăn lên sức khoẻ.', 0, 'Sai: sửa thành "the effect of diet on health".'],
      ['There is a clear difference among the two methods.', 'Có khác biệt rõ giữa hai phương pháp.', 0, 'Sai: sửa thành "between the two methods".']
    ],
    practice: [
      ['The paper studies the influence ___ (of / on) climate on migration.', 'of', 'Bài báo nghiên cứu ảnh hưởng của khí hậu lên di cư.'],
      ['We saw a move ___ (from / of) paper to digital records.', 'from', 'Chúng tôi thấy sự chuyển từ hồ sơ giấy sang hồ sơ số.'],
      ['The gap ___ (between / among) rich and poor has widened.', 'between', 'Khoảng cách giàu nghèo đã nới rộng.'],
      ['There was a sharp rise ___ (in / of) demand last year.', 'in', 'Nhu cầu tăng mạnh hồi năm ngoái.'],
      ['They propose a new approach ___ (to / of) the problem.', 'to', 'Họ đề xuất một hướng tiếp cận mới cho vấn đề.'],
      ['The company issued a response ___ (to / for) the criticism.', 'to', 'Công ty đưa ra phản hồi trước lời chỉ trích.'],
      ['An increase ___ (of / in) five per cent was recorded.', 'of', 'Ghi nhận mức tăng năm phần trăm.'],
      ['The effect ___ (of / on) noise on concentration is well known.', 'of', 'Tác động của tiếng ồn lên khả năng tập trung đã rõ.'],
      ['There is little difference ___ (between / with) the two versions.', 'between', 'Hai phiên bản khác nhau không đáng kể.'],
      ['The report notes a fall ___ (in / of) public trust.', 'in', 'Báo cáo ghi nhận niềm tin công chúng sụt giảm.']
    ]
  },

  {
    slug: 'prep-directionality',
    en: 'result in versus result from, stem from, lead to',
    vi: 'Chiều của quan hệ nhân quả — result in, result from, stem from',
    level: 'C1',
    summary: 'Một nhóm động từ nhân quả mà giới từ quyết định CHIỀU. Viết ngược chiều là đảo hẳn lập luận, và vì câu vẫn trôi chảy nên lỗi này sống sót qua mọi lần đọc lại.',
    formula: {
      rows: [
        ['A results IN B', 'nguyên nhân → kết quả. The delay resulted in extra costs.'],
        ['B results FROM A', 'kết quả ← nguyên nhân. The extra costs resulted from the delay.'],
        ['A leads TO B', 'nguyên nhân → kết quả, đồng nghĩa result in.'],
        ['B stems FROM / arises FROM A', 'kết quả ← nguyên nhân, trang trọng hơn.'],
        ['attribute B TO A', 'quy kết quả cho nguyên nhân. They attributed the loss to bad weather.']
      ],
      note: 'Cách tự kiểm nhanh và không bao giờ sai: đọc câu rồi hỏi "chủ ngữ là nguyên nhân hay là kết quả". Chủ ngữ là NGUYÊN NHÂN thì giới từ trỏ về phía trước (in, to). Chủ ngữ là KẾT QUẢ thì giới từ trỏ ngược lại (from). Đây là một quy tắc chứ không phải một danh sách phải nhớ.'
    },
    signals: ['câu lập luận nhân quả', 'chủ ngữ là nguyên nhân hay là hệ quả', 'văn báo cáo, bài luận'],
    useWhen: [
      'Viết đoạn phân tích: "Rising costs resulted in lower demand."',
      'Giải thích một hệ quả: "The problem stems from poor planning."',
      'Quy trách nhiệm thận trọng: "The delay was attributed to a supplier fault."'
    ],
    useNot: [
      { what: 'Không dùng result in khi chủ ngữ là kết quả.', why: '"The extra cost resulted in the delay" nói rằng chi phí gây ra chậm trễ — ngược lại điều bạn định nói. Đúng là "resulted from the delay".' },
      { what: 'Không dùng attribute cho chiều ngược.', why: '"They attributed bad weather to the loss" đảo hẳn. Đúng là "attributed the loss to bad weather".' }
    ],
    confuse: [
      {
        with: 'result in khác result from',
        tell: 'Nhìn chủ ngữ. Chủ ngữ là nguyên nhân → result in. Chủ ngữ là kết quả → result from. Không có ngoại lệ.',
        pair: [
          { en: 'The strike resulted in long delays.', vi: 'Cuộc đình công dẫn tới chậm trễ kéo dài (chủ ngữ là nguyên nhân).' },
          { en: 'The long delays resulted from the strike.', vi: 'Chậm trễ kéo dài là do đình công (chủ ngữ là kết quả).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The higher prices resulted in the shortage of fuel.', right: 'The higher prices resulted from the shortage of fuel.', why: 'Giá cao là kết quả của thiếu nhiên liệu, nên dùng from.' },
      { wrong: 'The committee attributed the weather to the cancellation.', right: 'The committee attributed the cancellation to the weather.', why: 'Quy KẾT QUẢ cho NGUYÊN NHÂN, không phải ngược lại.' }
    ],
    examples: [
      ['Poor planning resulted in a serious overspend.', 'Lập kế hoạch kém dẫn tới bội chi nghiêm trọng.', 1, 'Chủ ngữ là nguyên nhân nên dùng in.'],
      ['The overspend resulted from poor planning.', 'Bội chi là hệ quả của lập kế hoạch kém.', 1, 'Chủ ngữ là kết quả nên dùng from.'],
      ['Most of these errors stem from a single misunderstanding.', 'Phần lớn lỗi này bắt nguồn từ một hiểu lầm duy nhất.', 1, 'stem from = bắt nguồn từ.'],
      ['They attributed the improvement to better training.', 'Họ quy sự cải thiện là nhờ đào tạo tốt hơn.', 1, 'attribute kết quả to nguyên nhân.'],
      ['The higher prices resulted in the shortage of fuel.', 'Giá cao là do thiếu nhiên liệu.', 0, 'Sai: sửa thành "resulted from the shortage".'],
      ['The committee attributed the weather to the cancellation.', 'Ban tổ chức cho rằng việc huỷ là do thời tiết.', 0, 'Sai: sửa thành "attributed the cancellation to the weather".']
    ],
    practice: [
      ['The new rules resulted ___ (in / from) fewer applications.', 'in', 'Quy định mới khiến số hồ sơ giảm.'],
      ['The fall in applications resulted ___ (from / in) the new rules.', 'from', 'Số hồ sơ giảm là do quy định mới.'],
      ['Careless design can lead ___ (to / from) expensive repairs.', 'to', 'Thiết kế cẩu thả có thể dẫn tới sửa chữa tốn kém.'],
      ['Many complaints arise ___ (from / in) unclear instructions.', 'from', 'Nhiều khiếu nại nảy sinh từ hướng dẫn không rõ.'],
      ['They attributed the success ___ (to / from) careful preparation.', 'to', 'Họ cho rằng thành công là nhờ chuẩn bị kỹ.'],
      ['The shortage stems ___ (from / in) a change in policy.', 'from', 'Tình trạng thiếu hụt bắt nguồn từ thay đổi chính sách.'],
      ['Higher taxes may result ___ (in / from) lower spending.', 'in', 'Thuế cao có thể khiến chi tiêu giảm.'],
      ['The damage resulted ___ (from / in) a faulty valve.', 'from', 'Hư hỏng là do một van hỏng.'],
      ['Poor communication often leads ___ (to / from) mistakes.', 'to', 'Giao tiếp kém thường dẫn tới sai sót.'],
      ['The delay is largely attributable ___ (to / from) staff shortages.', 'to', 'Việc chậm trễ phần lớn là do thiếu nhân sự.']
    ]
  },

  {
    slug: 'prep-complex-c1',
    en: 'in the light of, with a view to, at the expense of',
    vi: 'Cụm giới từ phức hợp — in the light of, with a view to, at the expense of',
    level: 'C1',
    summary: 'Những cụm ba bốn chữ hoạt động y như một giới từ đơn. Chúng là dấu hiệu rõ nhất của văn viết bậc cao — nhưng chỉ khi dùng đúng chỗ và đúng dạng.',
    formula: {
      rows: [
        ['in the light of = xét theo', 'In the light of these findings, we revised the plan.'],
        ['with a view to + V-ing = nhằm', 'We met with a view to reaching an agreement.'],
        ['for the purpose of + V-ing = để', 'kept for the purpose of auditing'],
        ['at the expense of = phải đánh đổi', 'Speed was gained at the expense of accuracy.'],
        ['by virtue of = nhờ vào', 'She qualified by virtue of her experience.']
      ],
      note: 'Bẫy hình thái quan trọng nhất: "with a view to" và "for the purpose of" đều kết thúc bằng một GIỚI TỪ, nên sau chúng là V-ing chứ không phải nguyên thể. "with a view to reach an agreement" sai; đúng là "to reaching". Đây là chỗ ngay cả người viết khá cũng vấp, vì chữ "to" ở cuối trông y hệt "to" của nguyên thể.'
    },
    signals: ['cụm bốn chữ đứng đầu mệnh đề', 'văn bản chính sách, báo cáo, bài luận', 'chữ to cuối cụm kéo theo V-ing'],
    useWhen: [
      'Mở đoạn trong bài luận: "In the light of recent data, the argument needs revising."',
      'Nêu mục đích trong báo cáo: "The trial was run with a view to cutting costs."',
      'Nêu cái giá phải trả: "Growth came at the expense of the environment."'
    ],
    useNot: [
      { what: 'Không dùng nguyên thể sau "with a view to".', why: '"with a view to improve" sai. Chữ to ở đây là giới từ: "with a view to improving".' },
      { what: 'Không dùng "in the light of" cho một nguyên nhân đơn giản.', why: 'Cụm này nghĩa là "xét theo bằng chứng mới", không phải "bởi vì". Dùng thay because thì câu nghe khoa trương.' }
    ],
    confuse: [
      {
        with: 'with a view to + V-ing khác in order to + V',
        tell: 'in order to là nguyên thể vì to là chữ của nguyên thể. with a view to là V-ing vì to là giới từ. Hai cụm cùng nghĩa, khác dạng.',
        pair: [
          { en: 'We met in order to reach an agreement.', vi: 'Chúng tôi gặp nhau để đi tới thoả thuận (nguyên thể).' },
          { en: 'We met with a view to reaching an agreement.', vi: 'Chúng tôi gặp nhau nhằm đi tới thoả thuận (V-ing).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The team was formed with a view to improve quality.', right: 'The team was formed with a view to improving quality.', why: 'Chữ to ở đây là giới từ nên đi với V-ing.' },
      { wrong: 'In light of you were late, we started without you.', right: 'In the light of your lateness, we started without you.', why: 'Sau cụm này là danh từ, không phải mệnh đề.' }
    ],
    examples: [
      ['In the light of the new evidence, the case was reopened.', 'Xét theo bằng chứng mới, vụ việc được mở lại.', 1, 'Cụm + danh từ.'],
      ['The scheme was set up with a view to reducing waste.', 'Chương trình được lập ra nhằm giảm rác thải.', 1, 'with a view to + V-ing.'],
      ['Efficiency improved, but at the expense of morale.', 'Hiệu suất tăng, nhưng phải đánh đổi tinh thần nhân viên.', 1, 'at the expense of = cái giá phải trả.'],
      ['He was appointed by virtue of his long service.', 'Ông ấy được bổ nhiệm nhờ thâm niên công tác.', 1, 'by virtue of = nhờ vào.'],
      ['The team was formed with a view to improve quality.', 'Nhóm được lập nhằm cải thiện chất lượng.', 0, 'Sai: sửa thành "with a view to improving".'],
      ['In light of you were late, we started without you.', 'Vì bạn tới muộn nên chúng tôi bắt đầu trước.', 0, 'Sai: sửa thành "In the light of your lateness".']
    ],
    practice: [
      ['The policy was changed in the light ___ (of / on) the report.', 'of', 'Chính sách được đổi theo báo cáo.'],
      ['They invested with a view to ___ (expanding / expand) overseas.', 'expanding', 'Họ đầu tư nhằm mở rộng ra nước ngoài.'],
      ['Records are kept for the purpose ___ (of / to) auditing.', 'of', 'Hồ sơ được lưu để phục vụ kiểm toán.'],
      ['Profits rose at the expense ___ (of / to) safety.', 'of', 'Lợi nhuận tăng nhưng phải đánh đổi an toàn.'],
      ['She was promoted by virtue ___ (of / by) her record.', 'of', 'Cô ấy được thăng chức nhờ thành tích.'],
      ['The trial was run with a view to ___ (cutting / cut) costs.', 'cutting', 'Đợt thử nghiệm nhằm cắt giảm chi phí.'],
      ['___ (In the light of / In the light on) these results, we will wait.', 'In the light of', 'Xét theo các kết quả này, chúng tôi sẽ chờ.'],
      ['The data is stored for the purpose of ___ (research / to research).', 'research', 'Dữ liệu được lưu để phục vụ nghiên cứu.'],
      ['Speed was achieved at the ___ (expense / expenses) of accuracy.', 'expense', 'Tốc độ đạt được bằng cái giá là độ chính xác.'],
      ['He qualified ___ (by virtue of / by virtue) his experience.', 'by virtue of', 'Anh ấy đủ điều kiện nhờ kinh nghiệm.']
    ]
  },

  {
    slug: 'prep-framing-phrases',
    en: 'in terms of, with respect to, in relation to, as regards',
    vi: 'Cụm khoanh phạm vi — in terms of, with respect to, in relation to',
    level: 'C1',
    summary: 'Một nhóm cụm dùng để KHOANH phạm vi đang bàn: "xét về mặt nào". Chúng rất hay dùng trong báo cáo và bài luận, và cũng rất hay bị dùng thừa.',
    formula: {
      rows: [
        ['in terms of = xét về mặt', 'In terms of cost, the two options are similar.'],
        ['with respect to / with regard to = về phần', 'With respect to clause 4, we disagree.'],
        ['in relation to = so với, liên quan tới', 'The fee is small in relation to the benefit.'],
        ['as regards = về', 'As regards funding, no decision has been made.'],
        ['Đứng đầu câu thì có dấu phẩy', 'In terms of quality, it is excellent.']
      ],
      note: 'Cảnh báo về việc dùng thừa: "in terms of" bị lạm dụng nhiều tới mức trong văn viết học thuật nó thường bị coi là chữ độn. "In terms of cost, it is cheap" nói được gọn hơn là "It is cheap". Chỉ dùng khi thật sự có NHIỀU mặt để xét và mình đang chọn một mặt trong số đó — đó là lúc cụm này làm việc thật.'
    },
    signals: ['câu so sánh trên nhiều tiêu chí', 'chuyển sang một khía cạnh khác của vấn đề', 'văn bản báo cáo hoặc hợp đồng'],
    useWhen: [
      'So sánh có nhiều tiêu chí: "In terms of speed, A wins; in terms of cost, B does."',
      'Chuyển chủ đề trong email dài: "As regards the second point, …"',
      'Đặt một con số vào bối cảnh: "The rise is small in relation to last year."'
    ],
    useNot: [
      { what: 'Không dùng "in terms of" khi chỉ có một mặt để xét.', why: '"In terms of cost, it is expensive" thừa. Nói thẳng "It is expensive" mạnh hơn.' },
      { what: 'Không viết "as regard" hay "in regards to".', why: 'Dạng đúng là "as regards" (có s) và "with regard to" (không s). Hai cụm ngược nhau về chữ s, nên rất dễ lẫn.' }
    ],
    confuse: [
      {
        with: 'as regards khác with regard to',
        tell: 'as regards CÓ chữ s và không có "to". with regard to KHÔNG có s và có "to". Nhớ theo cặp chứ đừng suy.',
        pair: [
          { en: 'As regards the budget, we need more detail.', vi: 'Về ngân sách, chúng tôi cần chi tiết hơn.' },
          { en: 'With regard to the budget, we need more detail.', vi: 'Về ngân sách, chúng tôi cần chi tiết hơn (cùng nghĩa, khác dạng).' }
        ]
      }
    ],
    errors: [
      { wrong: 'In regards to your letter, we have replied.', right: 'With regard to your letter, we have replied.', why: 'Dạng đúng là "with regard to", không có chữ s.' },
      { wrong: 'As regard the timetable, nothing has changed.', right: 'As regards the timetable, nothing has changed.', why: '"as regards" luôn có chữ s.' }
    ],
    examples: [
      ['In terms of speed, the new system is far better.', 'Xét về tốc độ, hệ thống mới tốt hơn hẳn.', 1, 'Chọn một mặt trong nhiều mặt.'],
      ['With respect to clause 7, we would like a change.', 'Về điều khoản 7, chúng tôi muốn sửa.', 1, 'with respect to + danh từ.'],
      ['The cost is minor in relation to the savings.', 'Chi phí là nhỏ so với khoản tiết kiệm.', 1, 'in relation to = đặt vào bối cảnh.'],
      ['As regards staffing, we will decide next month.', 'Về nhân sự, tháng sau chúng tôi quyết.', 1, 'as regards, có chữ s.'],
      ['In regards to your letter, we have replied.', 'Về thư của quý vị, chúng tôi đã trả lời.', 0, 'Sai: sửa thành "With regard to your letter".'],
      ['As regard the timetable, nothing has changed.', 'Về lịch trình, không có gì thay đổi.', 0, 'Sai: sửa thành "As regards the timetable".']
    ],
    practice: [
      ['___ (In terms of / In term of) quality, both are acceptable.', 'In terms of', 'Xét về chất lượng, cả hai đều chấp nhận được.'],
      ['___ (With regard to / With regards to) your query, see below.', 'With regard to', 'Về thắc mắc của bạn, xem bên dưới.'],
      ['___ (As regards / As regard) the deadline, it is fixed.', 'As regards', 'Về hạn chót, nó là cố định.'],
      ['The risk is small in relation ___ (to / with) the reward.', 'to', 'Rủi ro là nhỏ so với phần thưởng.'],
      ['___ (With respect to / With respect of) safety, we follow the law.', 'With respect to', 'Về an toàn, chúng tôi tuân thủ pháp luật.'],
      ['In terms ___ (of / for) cost, the difference is tiny.', 'of', 'Xét về chi phí, khác biệt rất nhỏ.'],
      ['___ (As regards / In regards) payment, we accept transfers.', 'As regards', 'Về thanh toán, chúng tôi nhận chuyển khoản.'],
      ['His salary is low in relation ___ (to / of) his experience.', 'to', 'Lương của anh ấy thấp so với kinh nghiệm.'],
      ['___ (With regard to / As regard to) the contract, clause 3 applies.', 'With regard to', 'Về hợp đồng, điều khoản 3 được áp dụng.'],
      ['They differ ___ (in terms of / in term of) approach, not aim.', 'in terms of', 'Họ khác nhau về cách làm, không khác về mục tiêu.']
    ]
  },

  {
    slug: 'prep-differ-compare',
    en: 'differ from, differ in, compare to, compare with, consist of',
    vi: 'differ, compare, consist — giới từ đổi thì phép so sánh đổi',
    level: 'C1',
    summary: 'Một nhóm động từ so sánh và cấu thành, trong đó giới từ quyết định chính xác phép so sánh nào đang được thực hiện — và một động từ nổi tiếng vì KHÔNG có giới từ nào cả.',
    formula: {
      rows: [
        ['differ FROM = khác với ai', 'Version 2 differs from version 1.'],
        ['differ IN = khác ở mặt nào', 'They differ in price but not in quality.'],
        ['compare TO = ví như', 'He compared the city to an anthill.'],
        ['compare WITH = đối chiếu', 'Compare this year with last year.'],
        ['consist OF khác comprise', 'The team consists of six people. = The team comprises six people. — comprise KHÔNG có of.']
      ],
      note: '"comprise of" là một trong những lỗi bị bắt lỗi nhiều nhất trong văn viết học thuật tiếng Anh, vì bản thân chữ comprise đã chứa nghĩa "gồm có". Nhớ theo cặp: consist thì CÓ of, comprise thì KHÔNG. Và "be composed of" thì có of.'
    },
    signals: ['câu so sánh hai phiên bản, hai năm, hai phương án', 'liệt kê thành phần cấu thành', 'phép ví von'],
    useWhen: [
      'Viết phần so sánh trong báo cáo: "Compared with last quarter, sales are flat."',
      'Nêu điểm khác biệt cụ thể: "The two plans differ in scope."',
      'Mô tả cấu trúc: "The course consists of ten units."'
    ],
    useNot: [
      { what: 'Không thêm of sau comprise.', why: '"The team comprises of six people" sai. Hoặc "comprises six people", hoặc "consists of six people".' },
      { what: 'Không dùng differ with khi nói về vật.', why: '"This version differs with the old one" sai. Vật thì differ from; differ with chỉ dùng khi hai NGƯỜI bất đồng ý kiến.' }
    ],
    confuse: [
      {
        with: 'compare to khác compare with',
        tell: 'to là VÍ NHƯ, dùng khi hai thứ khác loại và mình đang tạo hình ảnh. with là ĐỐI CHIẾU, dùng khi hai thứ cùng loại và mình đang tìm khác biệt.',
        pair: [
          { en: 'She compared the brain to a computer.', vi: 'Cô ấy ví bộ não như một cái máy tính (ví von).' },
          { en: 'Compare this month with last month.', vi: 'So tháng này với tháng trước (đối chiếu).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The committee comprises of twelve members.', right: 'The committee comprises twelve members.', why: 'comprise đã mang nghĩa "gồm" nên không cần of.' },
      { wrong: 'This model differs with the previous one.', right: 'This model differs from the previous one.', why: 'Vật khác nhau thì dùng differ from.' }
    ],
    examples: [
      ['The new design differs from the old one in three ways.', 'Thiết kế mới khác thiết kế cũ ở ba điểm.', 1, 'differ from + thứ được so.'],
      ['The two courses differ in length but not in content.', 'Hai khoá khác nhau về thời lượng nhưng không khác nội dung.', 1, 'differ in + mặt khác nhau.'],
      ['Compared with last year, costs have fallen.', 'So với năm ngoái, chi phí đã giảm.', 1, 'compare with = đối chiếu cùng loại.'],
      ['The report consists of four sections.', 'Báo cáo gồm bốn phần.', 1, 'consist of + thành phần.'],
      ['The committee comprises of twelve members.', 'Uỷ ban gồm mười hai thành viên.', 0, 'Sai: bỏ "of" — "comprises twelve members".'],
      ['This model differs with the previous one.', 'Mẫu này khác mẫu trước.', 0, 'Sai: sửa thành "differs from the previous one".']
    ],
    practice: [
      ['The syllabus consists ___ (of / in) six modules.', 'of', 'Chương trình gồm sáu học phần.'],
      ['The board comprises ___ (nine members / of nine members).', 'nine members', 'Hội đồng gồm chín thành viên.'],
      ['Her view differs ___ (from / with) mine on this point.', 'from', 'Quan điểm của cô ấy khác tôi ở điểm này.'],
      ['The models differ ___ (in / from) price rather than function.', 'in', 'Các mẫu khác nhau về giá chứ không khác chức năng.'],
      ['Compared ___ (with / to) June, July was quiet.', 'with', 'So với tháng Sáu, tháng Bảy khá vắng.'],
      ['The poet compared the city ___ (to / with) a machine.', 'to', 'Nhà thơ ví thành phố như một cỗ máy.'],
      ['The kit is composed ___ (of / from) twelve parts.', 'of', 'Bộ dụng cụ gồm mười hai bộ phận.'],
      ['These figures differ ___ (from / of) the published ones.', 'from', 'Các con số này khác với số đã công bố.'],
      ['Let us compare the results ___ (with / of) the control group.', 'with', 'Ta hãy đối chiếu kết quả với nhóm đối chứng.'],
      ['The two proposals differ ___ (in / with) scope and in cost.', 'in', 'Hai đề xuất khác nhau về phạm vi và chi phí.']
    ]
  },

  {
    slug: 'prep-source-material',
    en: 'made of, made from, made out of, die of, die from',
    vi: 'made of / from, die of / from — giới từ chỉ nguồn gốc',
    level: 'C2',
    summary: 'Hai cặp mà giới từ mã hoá một khác biệt rất tinh: nguyên liệu còn NHÌN THẤY được hay đã BIẾN ĐỔI hẳn. Người bản ngữ dùng đúng theo bản năng và hiếm khi giải thích được vì sao.',
    formula: {
      rows: [
        ['made OF = nguyên liệu còn nhận ra', 'a table made of wood — vẫn thấy đó là gỗ.'],
        ['made FROM = nguyên liệu đã biến đổi', 'paper made from wood — không còn thấy gỗ nữa.'],
        ['made OUT OF = làm từ thứ vốn dùng việc khác', 'a lamp made out of a bottle.'],
        ['die OF = chết vì một bệnh, một trạng thái', 'die of cancer · die of hunger'],
        ['die FROM = chết vì một nguyên nhân bên ngoài', 'die from an injury · die from the effects of smoke']
      ],
      note: 'Ranh giới của die of và die from mờ và người bản ngữ cũng dùng lẫn, nhưng khuynh hướng rõ: of đi với thứ nằm BÊN TRONG cơ thể (bệnh tật, đói, tuổi già), from đi với thứ ĐẾN TỪ BÊN NGOÀI (vết thương, tai nạn, tác động). Ở bậc C2 thì biết là có sự phân biệt này quan trọng hơn là dùng tuyệt đối đúng.'
    },
    signals: ['nói nguyên liệu làm ra một vật', 'nguyên liệu còn nhận ra được hay không', 'nguyên nhân bên trong hay bên ngoài'],
    useWhen: [
      'Mô tả một vật trong phần Nói: "It is made of bamboo."',
      'Nói về quy trình sản xuất: "Vinegar is made from rice."',
      'Viết bài học thuật về y tế: "Most patients died from complications."'
    ],
    useNot: [
      { what: 'Không dùng made of khi nguyên liệu đã biến đổi hẳn.', why: '"wine made of grapes" sai — nho không còn nhìn ra được trong rượu: "made from grapes".' },
      { what: 'Không dùng die of cho một tai nạn.', why: '"She died of a car crash" sai. Nguyên nhân bên ngoài thì "died from a car crash" hoặc "died in a car crash".' }
    ],
    confuse: [
      {
        with: 'made of khác made from',
        tell: 'Nhìn vào vật thành phẩm: còn NHẬN RA nguyên liệu thì of, không còn nhận ra vì đã qua chế biến thì from.',
        pair: [
          { en: 'The bowl is made of clay.', vi: 'Cái bát làm bằng đất sét (vẫn thấy đất sét).' },
          { en: 'Bread is made from wheat.', vi: 'Bánh mì làm từ lúa mì (không còn thấy lúa mì).' }
        ]
      }
    ],
    errors: [
      { wrong: 'This wine is made of local grapes.', right: 'This wine is made from local grapes.', why: 'Nho đã biến đổi hẳn nên dùng from.' },
      { wrong: 'He died of the injuries he received in the fall.', right: 'He died from the injuries he received in the fall.', why: 'Vết thương là nguyên nhân bên ngoài nên dùng from.' }
    ],
    examples: [
      ['The frame is made of steel.', 'Khung làm bằng thép.', 1, 'Thép vẫn nhận ra được.'],
      ['Sugar is made from sugar cane.', 'Đường được làm từ mía.', 1, 'Mía đã biến đổi hẳn.'],
      ['She built a shelf made out of old crates.', 'Cô ấy đóng một cái kệ từ mấy thùng gỗ cũ.', 1, 'Vật vốn dùng việc khác.'],
      ['Thousands died of hunger that winter.', 'Mùa đông đó hàng nghìn người chết đói.', 1, 'Nguyên nhân bên trong cơ thể.'],
      ['This wine is made of local grapes.', 'Rượu này làm từ nho địa phương.', 0, 'Sai: sửa thành "made from local grapes".'],
      ['He died of the injuries he received in the fall.', 'Ông ấy chết vì vết thương do ngã.', 0, 'Sai: sửa thành "died from the injuries".']
    ],
    practice: [
      ['The statue is made ___ (of / from) marble.', 'of', 'Bức tượng làm bằng đá cẩm thạch.'],
      ['Cheese is made ___ (from / of) milk.', 'from', 'Phô mai được làm từ sữa.'],
      ['He made a boat ___ (out of / of out) old doors.', 'out of', 'Anh ấy đóng thuyền từ mấy cánh cửa cũ.'],
      ['Her grandmother died ___ (of / from) old age.', 'of', 'Bà cô ấy mất vì tuổi già.'],
      ['Two workers died ___ (from / of) their burns.', 'from', 'Hai công nhân tử vong vì bỏng.'],
      ['The bag is made ___ (of / from) leather.', 'of', 'Cái túi làm bằng da.'],
      ['Paper is made ___ (from / of) wood pulp.', 'from', 'Giấy được làm từ bột gỗ.'],
      ['Many people die ___ (of / from) heart disease each year.', 'of', 'Mỗi năm nhiều người chết vì bệnh tim.'],
      ['The roof is made ___ (of / from) corrugated iron.', 'of', 'Mái nhà làm bằng tôn.'],
      ['He nearly died ___ (from / of) the effects of the smoke.', 'from', 'Anh ấy suýt chết vì tác động của khói.']
    ]
  },

  {
    slug: 'prep-idiomatic-c2',
    en: 'at odds with, in the wake of, on the brink of, in lieu of',
    vi: 'Cụm giới từ thành ngữ bậc cao — at odds with, in the wake of, on the brink of',
    level: 'C2',
    summary: 'Những cụm mà nghĩa không suy ra được từ các từ thành phần. Chúng nâng hẳn giọng văn khi đúng chỗ, và làm câu nghe kệch cỡm khi sai chỗ — nên điểm này bàn cả hai.',
    formula: {
      rows: [
        ['at odds with = mâu thuẫn với', 'His account is at odds with the evidence.'],
        ['in the wake of = ngay sau và do hệ quả của', 'in the wake of the scandal'],
        ['on the brink of = bên bờ vực của', 'on the brink of collapse'],
        ['in lieu of = thay cho', 'time off in lieu of overtime pay'],
        ['by dint of = nhờ vào (sự bền bỉ)', 'by dint of sheer hard work']
      ],
      note: 'Cảnh báo về sắc thái, và nó quan trọng ngang phần nghĩa: "in the wake of" và "on the brink of" đều mang sức nặng của biến cố lớn. Dùng cho việc nhỏ thì câu thành khôi hài — "in the wake of the coffee break" nghe như đùa. Ở bậc C2, biết khi nào KHÔNG dùng một cụm là năng lực chứ không phải sự dè dặt.'
    },
    signals: ['văn báo chí, bình luận, bài luận bậc cao', 'biến cố lớn và hệ quả của nó', 'mâu thuẫn giữa hai lời kể'],
    useWhen: [
      'Viết bài luận về một sự kiện lớn: "In the wake of the reforms, inequality widened."',
      'Chỉ ra mâu thuẫn trong lập luận: "This claim is at odds with the data."',
      'Văn bản nhân sự: "Staff may take leave in lieu of payment."'
    ],
    useNot: [
      { what: 'Không dùng "in the wake of" cho một việc nhỏ.', why: 'Cụm này mang sức nặng của biến cố. "In the wake of lunch" nghe khôi hài chứ không trang trọng.' },
      { what: 'Không viết "in lieu" mà thiếu of.', why: '"paid in lieu" chỉ đúng khi vế kia đã hiểu ngầm. Khi nêu rõ thay cho cái gì thì phải đủ: "in lieu of notice".' }
    ],
    confuse: [
      {
        with: 'at odds with khác in conflict with',
        tell: 'at odds with dùng cho hai LỜI KỂ, hai con số, hai lập luận không khớp nhau. in conflict with dùng cho hai bên có tranh chấp thật, kể cả con người.',
        pair: [
          { en: 'His statement is at odds with the report.', vi: 'Lời khai của ông ta không khớp với báo cáo (hai lời kể).' },
          { en: 'The two departments are in conflict with each other.', vi: 'Hai phòng ban đang xung đột với nhau (tranh chấp thật).' }
        ]
      }
    ],
    errors: [
      { wrong: 'In the wake of the meeting, we had lunch.', right: 'After the meeting, we had lunch.', why: 'Cụm này dành cho biến cố lớn; dùng cho việc thường nhật thì nghe khôi hài.' },
      { wrong: 'The firm was on the brink for bankruptcy.', right: 'The firm was on the brink of bankruptcy.', why: 'Cụm cố định là "on the brink of".' }
    ],
    examples: [
      ['His version of events is at odds with the recording.', 'Lời kể của ông ta không khớp với đoạn ghi âm.', 1, 'Hai lời kể mâu thuẫn.'],
      ['In the wake of the crisis, three banks closed.', 'Sau khủng hoảng, ba ngân hàng đóng cửa.', 1, 'Biến cố lớn và hệ quả.'],
      ['The company was on the brink of collapse.', 'Công ty bên bờ vực sụp đổ.', 1, 'on the brink of + danh từ.'],
      ['Employees may take leave in lieu of overtime pay.', 'Nhân viên có thể nghỉ bù thay cho tiền làm thêm giờ.', 1, 'in lieu of = thay cho.'],
      ['In the wake of the meeting, we had lunch.', 'Sau cuộc họp, chúng tôi đi ăn trưa.', 0, 'Sai sắc thái: dùng "After the meeting".'],
      ['The firm was on the brink for bankruptcy.', 'Công ty bên bờ vực phá sản.', 0, 'Sai: sửa thành "on the brink of bankruptcy".']
    ],
    practice: [
      ['His account is at odds ___ (with / to) the witnesses.', 'with', 'Lời kể của ông ta không khớp với các nhân chứng.'],
      ['___ (In the wake of / In the wake to) the storm, power was lost.', 'In the wake of', 'Sau cơn bão, điện bị mất.'],
      ['The talks were on the brink ___ (of / to) failure.', 'of', 'Đàm phán bên bờ vực thất bại.'],
      ['She was given shares in lieu ___ (of / for) a bonus.', 'of', 'Cô ấy được nhận cổ phần thay cho tiền thưởng.'],
      ['He succeeded by dint ___ (of / by) sheer persistence.', 'of', 'Anh ấy thành công nhờ sự bền bỉ thuần tuý.'],
      ['The figures are at ___ (odds / odd) with the forecast.', 'odds', 'Các con số không khớp với dự báo.'],
      ['Reforms followed ___ (in the wake of / in wake of) the report.', 'in the wake of', 'Cải cách diễn ra ngay sau bản báo cáo.'],
      ['The species is on the ___ (brink / brim) of extinction.', 'brink', 'Loài này bên bờ tuyệt chủng.'],
      ['Notice was paid ___ (in lieu of / in lieu to) working it.', 'in lieu of', 'Tiền báo trước được trả thay cho việc làm hết thời hạn.'],
      ['Their claims are at odds ___ (with / against) one another.', 'with', 'Các tuyên bố của họ mâu thuẫn với nhau.']
    ]
  },

  {
    slug: 'prep-legal-register',
    en: 'pursuant to, notwithstanding, subject to, save for',
    vi: 'Giới từ văn bản pháp lý — pursuant to, notwithstanding, subject to',
    level: 'C2',
    summary: 'Nhóm giới từ của hợp đồng và văn bản chính thức. Đọc hiểu chúng là kỹ năng thật; viết chúng thì phải rất tiết chế, vì dùng ngoài đúng ngữ cảnh là dấu hiệu rõ nhất của văn giả trang trọng.',
    formula: {
      rows: [
        ['pursuant to = chiếu theo', 'pursuant to clause 12 of the agreement'],
        ['notwithstanding = bất kể', 'Notwithstanding the delay, payment is due.'],
        ['subject to = tuỳ thuộc vào', 'The offer is subject to approval.'],
        ['save for / save that = trừ', 'The terms are unchanged save for clause 3.'],
        ['in respect of = về khoản', 'a claim in respect of damages']
      ],
      note: 'notwithstanding là chữ duy nhất trong nhóm đứng được cả TRƯỚC và SAU danh từ nó chi phối: "notwithstanding the delay" và "the delay notwithstanding" đều đúng. Dạng đứng sau là dấu hiệu của văn viết rất trang trọng và cũng là dạng dễ đọc nhầm nhất, vì lúc đó nó trông như một trạng từ lạc chỗ.'
    },
    signals: ['hợp đồng, điều khoản, văn bản chính thức', 'viện dẫn một điều khoản cụ thể', 'điều kiện ràng buộc một cam kết'],
    useWhen: [
      'Đọc và hiểu hợp đồng — đây là công dụng chính ở bậc này.',
      'Viết một điều khoản: "This offer is subject to written confirmation."',
      'Trích dẫn căn cứ: "Pursuant to Article 5, notice must be given."'
    ],
    useNot: [
      { what: 'Không dùng chúng trong email công việc thường ngày.', why: '"Pursuant to your email, I will call you" nghe kệch cỡm. Đúng ngữ cảnh là "Following your email".' },
      { what: 'Không thêm "of" sau notwithstanding.', why: '"notwithstanding of the delay" sai. Chữ này đi thẳng với danh từ.' }
    ],
    confuse: [
      {
        with: 'subject to (giới từ) khác be subjected to (bị động)',
        tell: 'subject to nghĩa là "tuỳ thuộc vào, còn phải chờ". be subjected to nghĩa là "bị đem ra chịu đựng". Khác nhau một chữ và khác hẳn nghĩa.',
        pair: [
          { en: 'The plan is subject to approval.', vi: 'Kế hoạch còn tuỳ thuộc vào việc phê duyệt.' },
          { en: 'The samples were subjected to intense heat.', vi: 'Các mẫu bị đem nung ở nhiệt độ cao.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Notwithstanding of the weather, the match went ahead.', right: 'Notwithstanding the weather, the match went ahead.', why: 'notwithstanding đi thẳng với danh từ, không có of.' },
      { wrong: 'Pursuant to your text message, I will be late.', right: 'Following your text message, I will be late.', why: 'Ngữ cảnh thân mật không hợp với văn pháp lý.' }
    ],
    examples: [
      ['Pursuant to clause 9, either party may cancel.', 'Chiếu theo điều 9, bên nào cũng có quyền huỷ.', 1, 'Viện dẫn một điều khoản.'],
      ['Notwithstanding the objections, the plan proceeded.', 'Bất kể các phản đối, kế hoạch vẫn tiến hành.', 1, 'notwithstanding + danh từ.'],
      ['All bookings are subject to availability.', 'Mọi đặt chỗ đều tuỳ thuộc tình trạng còn chỗ.', 1, 'subject to = tuỳ thuộc.'],
      ['The terms remain unchanged save for the fee.', 'Các điều khoản giữ nguyên trừ khoản phí.', 1, 'save for = trừ.'],
      ['Notwithstanding of the weather, the match went ahead.', 'Bất kể thời tiết, trận đấu vẫn diễn ra.', 0, 'Sai: bỏ "of" — "Notwithstanding the weather".'],
      ['Pursuant to your text message, I will be late.', 'Theo tin nhắn của bạn, tôi sẽ tới muộn.', 0, 'Sai sắc thái: dùng "Following your text message".']
    ],
    practice: [
      ['___ (Pursuant to / Pursuant of) Article 3, notice is required.', 'Pursuant to', 'Chiếu theo Điều 3, phải có thông báo.'],
      ['___ (Notwithstanding / Notwithstanding of) the cost, they agreed.', 'Notwithstanding', 'Bất kể chi phí, họ vẫn đồng ý.'],
      ['The offer is subject ___ (to / of) board approval.', 'to', 'Đề nghị này còn tuỳ thuộc vào phê duyệt của hội đồng.'],
      ['Everything is agreed save ___ (for / of) the delivery date.', 'for', 'Mọi thứ đã thống nhất trừ ngày giao hàng.'],
      ['A claim was filed in respect ___ (of / to) the damage.', 'of', 'Một đơn khiếu nại đã được nộp về khoản thiệt hại.'],
      ['The samples were ___ (subjected to / subject to) high pressure.', 'subjected to', 'Các mẫu bị đem nén ở áp suất cao.'],
      ['Prices are ___ (subject to / subjected to) change without notice.', 'subject to', 'Giá có thể thay đổi mà không báo trước.'],
      ['The delay ___ (notwithstanding / notwithstanding of), we shipped.', 'notwithstanding', 'Bất kể chậm trễ, chúng tôi vẫn giao hàng.'],
      ['Payment is due pursuant ___ (to / with) the schedule.', 'to', 'Thanh toán tới hạn theo đúng lịch.'],
      ['No refunds save ___ (for / from) exceptional cases.', 'for', 'Không hoàn tiền trừ các trường hợp đặc biệt.']
    ]
  },

  {
    slug: 'prep-metaphorical-space',
    en: 'under way, beyond repair, within reach',
    vi: 'Giới từ không gian dùng theo nghĩa bóng — under way, beyond repair, within reach',
    level: 'C2',
    summary: 'Giới từ chỉ không gian đem dùng cho khái niệm trừu tượng. Mỗi giới từ giữ lại một phần nghĩa gốc, nên nhận ra được cái lõi ấy là nắm được cả một họ cụm cùng lúc.',
    formula: {
      rows: [
        ['under = đang trong quá trình, chịu tác động', 'under way · under consideration · under review · under threat'],
        ['beyond = vượt quá giới hạn', 'beyond repair · beyond doubt · beyond belief · beyond dispute'],
        ['within = còn trong giới hạn', 'within reach · within reason · within budget · within the law'],
        ['above = cao hơn về phẩm giá', 'above suspicion · above criticism'],
        ['below = dưới ngưỡng chấp nhận', 'below standard · below expectations']
      ],
      note: 'Cái lõi nghĩa vẫn còn nguyên và đó là chỗ hay: beyond bao giờ cũng là "đã ra ngoài giới hạn" dù giới hạn ấy là bức tường hay là khả năng sửa chữa; within bao giờ cũng là "còn ở bên trong". Nắm được lõi thì đoán đúng cả những cụm chưa gặp bao giờ — điều mà học thuộc danh sách không làm được.'
    },
    signals: ['giới từ không gian đứng trước một danh từ trừu tượng', 'thường không có mạo từ', 'văn báo cáo, tin tức, bình luận'],
    useWhen: [
      'Báo cáo tiến độ: "The investigation is already under way."',
      'Kết luận dứt khoát trong bài luận: "The evidence puts this beyond doubt."',
      'Nói về giới hạn: "The target is still within reach."'
    ],
    useNot: [
      { what: 'Không thêm mạo từ vào các cụm này.', why: '"under the way" sai và đổi nghĩa hẳn. Cụm cố định là "under way", không mạo từ.' },
      { what: 'Không viết "underway" liền một chữ trong văn trang trọng.', why: 'Dạng chuẩn trong văn viết là hai chữ: "under way".' }
    ],
    confuse: [
      {
        with: 'within reason khác beyond reason',
        tell: 'within là CÒN Ở TRONG giới hạn, tức là chấp nhận được. beyond là ĐÃ RA NGOÀI, tức là không còn hợp lý nữa. Cái lõi nghĩa không gian vẫn nguyên.',
        pair: [
          { en: 'We will pay any price within reason.', vi: 'Chúng tôi trả bất kỳ giá nào còn hợp lý (còn trong giới hạn).' },
          { en: 'His demands are beyond reason.', vi: 'Yêu sách của ông ta vượt quá mức hợp lý (đã ra ngoài).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The review is under the way already.', right: 'The review is under way already.', why: 'Cụm cố định không có mạo từ.' },
      { wrong: 'The old machine is above repair.', right: 'The old machine is beyond repair.', why: '"Không sửa được nữa" là vượt quá giới hạn, dùng beyond.' }
    ],
    examples: [
      ['Construction is already under way.', 'Việc thi công đã bắt đầu.', 1, 'under way = đang tiến hành.'],
      ['The damage is beyond repair.', 'Hư hỏng không sửa được nữa.', 1, 'beyond = vượt quá giới hạn.'],
      ['A pay rise is not within our budget this year.', 'Năm nay tăng lương không nằm trong ngân sách của chúng tôi.', 1, 'within = còn trong giới hạn.'],
      ['Her honesty was above suspicion.', 'Sự trung thực của bà ấy là không thể nghi ngờ.', 1, 'above = cao hơn về phẩm giá.'],
      ['The review is under the way already.', 'Đợt rà soát đã bắt đầu rồi.', 0, 'Sai: bỏ mạo từ — "under way".'],
      ['The old machine is above repair.', 'Cái máy cũ không sửa được nữa.', 0, 'Sai: sửa thành "beyond repair".']
    ],
    practice: [
      ['Talks are ___ (under way / under the way) in Geneva.', 'under way', 'Các cuộc đàm phán đang diễn ra tại Geneva.'],
      ['The proposal is still ___ (under / in) consideration.', 'under', 'Đề xuất vẫn đang được xem xét.'],
      ['His guilt is ___ (beyond / above) doubt.', 'beyond', 'Tội của ông ta là không thể nghi ngờ.'],
      ['The target remains ___ (within / inside) reach.', 'within', 'Mục tiêu vẫn nằm trong tầm với.'],
      ['We will help, ___ (within / in) reason.', 'within', 'Chúng tôi sẽ giúp, trong mức hợp lý.'],
      ['The species is ___ (under / on) threat from logging.', 'under', 'Loài này bị đe doạ bởi nạn khai thác gỗ.'],
      ['The work was ___ (below / under) standard and had to be redone.', 'below', 'Công việc dưới chuẩn nên phải làm lại.'],
      ['The project came in ___ (within / inside) budget.', 'within', 'Dự án hoàn thành trong ngân sách.'],
      ['The policy is currently ___ (under / on) review.', 'under', 'Chính sách hiện đang được rà soát.'],
      ['His conduct was ___ (above / over) criticism.', 'above', 'Cách hành xử của ông ấy không có gì để chê.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'preposition',
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
