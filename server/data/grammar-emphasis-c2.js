/**
 * Ngữ pháp — nhóm ĐẢO NGỮ, NHẤN MẠNH và CÂU CHẺ, phần bậc C2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Tiếp nối server/data/grammar-emphasis.js (bậc B1–C1). Hạn mức của nhóm là
 * 21 điểm; tệp kia đã dùng 14 điểm, tệp này dùng nốt 7 điểm bậc C2.
 * Vậy là nhóm đủ 21/21.
 *
 * Bậc dưới học từng khuôn đảo ngữ một. Bậc này nhìn ra CƠ CHẾ ĐẰNG SAU và
 * chọn được khuôn phù hợp với văn cảnh:
 *
 *   · Có hai kiểu đảo khác hẳn nhau. Đảo TRỢ ĐỘNG TỪ chỉ nhấc trợ động từ lên
 *     ("Never HAVE I seen"); đảo TOÀN PHẦN nhấc cả động từ chính và đẩy chủ ngữ
 *     xuống cuối ("Down the hill ROLLED THE BARREL"). Hai kiểu đi với hai loại
 *     ngữ cảnh khác nhau, lẫn là hỏng.
 *   · Cùng một ý có khi diễn đạt được bằng đảo ngữ HOẶC bằng câu chẻ:
 *     "Not until later did we learn" và "It was not until later that we
 *     learned" bằng nhau về nghĩa, khác nhau về nhịp. Hai điểm trong tệp này
 *     dựng cạnh nhau đúng để đối chiếu chỗ đó.
 *
 * Ghi chú tránh trùng: đảo ngữ điều kiện thuộc nhóm câu điều kiện; nhượng bộ
 * trang trọng thuộc nhóm mệnh đề phụ; so sánh hơn kém thuộc nhóm tính từ và
 * trạng từ — ở đây chỉ bàn phép ĐẢO trong mệnh đề so sánh, không bàn cách
 * dựng so sánh. Đưa TÂN NGỮ lên đầu đã có ở bậc C1; tệp này bàn việc đưa
 * CỤM GIỚI TỪ lên đầu để nối mạch, là việc khác.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'inversion-full-vs-auxiliary',
    en: 'Full inversion versus auxiliary inversion',
    vi: 'Đảo toàn phần khác đảo trợ động từ — hai cơ chế, hai văn cảnh',
    level: 'C2',
    summary: 'Tiếng Anh có hai kiểu đảo hoàn toàn khác nhau. Một kiểu chỉ nhấc trợ động từ, kiểu kia nhấc cả động từ chính và đẩy chủ ngữ xuống cuối câu.',
    formula: {
      rows: [
        ['Đảo trợ động từ', 'Never HAVE I seen such a mess. — chủ ngữ vẫn đứng trước động từ chính.'],
        ['Đảo toàn phần', 'Down the hill ROLLED THE BARREL. — chủ ngữ xuống hẳn cuối câu.'],
        ['Đảo trợ động từ đi với', 'trạng ngữ phủ định: never, rarely, not once, only then.'],
        ['Đảo toàn phần đi với', 'cụm chỉ nơi chốn và hướng: down, into, on the wall, among them.'],
        ['Ràng buộc của đảo toàn phần', 'Chỉ dùng với nội động từ chỉ chuyển động hoặc trạng thái tồn tại.']
      ],
      note: 'Vì sao hai kiểu không lẫn được: đảo toàn phần đẩy chủ ngữ xuống cuối vì đó là THÔNG TIN MỚI, nên chủ ngữ phải là một cụm danh từ đáng kể — đại từ thì không được. Còn đảo trợ động từ chỉ là hệ quả ngữ pháp của việc đưa trạng ngữ phủ định lên đầu, không liên quan gì tới thông tin mới hay cũ.'
    },
    signals: ['trạng ngữ phủ định + trợ động từ', 'cụm nơi chốn + động từ chính', 'chủ ngữ nằm cuối câu'],
    useWhen: [
      'Văn kể: đảo toàn phần dựng cảnh, để chủ thể xuất hiện ở cuối cho bất ngờ.',
      'Bài Viết trang trọng: đảo trợ động từ sau trạng ngữ phủ định cho câu có sức nặng.',
      'Văn tả: đưa bối cảnh lên trước rồi mới lộ ra cái gì nằm ở đó.'
    ],
    useNot: [
      { what: 'Không dùng đảo toàn phần với ngoại động từ.', why: '"Into the room brought he a chair" sai. Đảo toàn phần chỉ đi với nội động từ chỉ chuyển động hay tồn tại.' },
      { what: 'Không đảo toàn phần khi chủ ngữ là đại từ.', why: '"Down the hill rolled it" sai. Đại từ là thông tin cũ nên không đẩy xuống cuối được: "Down it rolled."' }
    ],
    confuse: [
      {
        with: 'đảo toàn phần khác đảo trợ động từ',
        tell: 'Nhìn động từ chính: nó nhảy lên trước chủ ngữ thì là đảo toàn phần. Chỉ mỗi trợ động từ nhảy lên thì là đảo trợ động từ.',
        pair: [
          { en: 'Down the hill rolled the barrel.', vi: 'Cái thùng lăn xuống đồi (đảo toàn phần, chủ ngữ ở cuối).' },
          { en: 'Never have I seen such a mess.', vi: 'Chưa bao giờ tôi thấy bừa bộn đến thế (chỉ trợ động từ đảo).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Down the hill rolled it.', right: 'Down it rolled.', why: 'Chủ ngữ là đại từ nên không đẩy xuống cuối được.' },
      { wrong: 'Never saw I such a mess.', right: 'Never have I seen such a mess.', why: 'Trạng ngữ phủ định chỉ kéo theo đảo TRỢ động từ, không đảo động từ chính.' }
    ],
    examples: [
      ['Down the hill rolled the barrel.', 'Cái thùng lăn xuống đồi.', 1, 'Đảo toàn phần: động từ chính lên trước, chủ ngữ mới xuống cuối.'],
      ['Never have I seen such a mess.', 'Chưa bao giờ tôi thấy bừa bộn đến thế.', 1, 'Đảo trợ động từ: chủ ngữ vẫn đứng trước "seen".'],
      ['Into the room came a tall stranger.', 'Một người lạ cao lớn bước vào phòng.', 1, 'Nội động từ chỉ chuyển động, chủ ngữ là thông tin mới.'],
      ['Down it rolled, faster and faster.', 'Nó lăn xuống, mỗi lúc một nhanh.', 1, 'Chủ ngữ là đại từ nên giữ nguyên trước động từ.'],
      ['Down the hill rolled it.', 'Nó lăn xuống đồi.', 0, 'Sai: sửa thành "Down it rolled."'],
      ['Never saw I such a mess.', 'Chưa bao giờ tôi thấy bừa bộn đến thế.', 0, 'Sai: sửa thành "Never have I seen such a mess."']
    ],
    practice: [
      ['Down the hill ___ (rolled the barrel / the barrel rolled), gathering speed.', 'rolled the barrel', 'Cái thùng lăn xuống đồi, mỗi lúc một nhanh.'],
      ['Never ___ (have I seen / saw I) such a mess.', 'have I seen', 'Chưa bao giờ tôi thấy bừa bộn đến thế.'],
      ['Down ___ (it rolled / rolled it), faster and faster.', 'it rolled', 'Nó lăn xuống, mỗi lúc một nhanh.'],
      ['Into the room ___ (came a tall stranger / a tall stranger came).', 'came a tall stranger', 'Một người lạ cao lớn bước vào phòng.'],
      ['Full inversion needs an ___ (intransitive / transitive) verb.', 'intransitive', 'Đảo toàn phần cần một nội động từ.'],
      ['In full inversion the subject moves to the ___ (end / front).', 'end', 'Trong đảo toàn phần, chủ ngữ chuyển xuống cuối câu.'],
      ['Rarely ___ (does he complain / complains he).', 'does he complain', 'Anh ấy hiếm khi than phiền.'],
      ['On the table ___ (lay an open book / an open book lay).', 'lay an open book', 'Trên bàn có một cuốn sách đang mở.'],
      ['Full inversion does not work with a ___ (pronoun / noun) subject.', 'pronoun', 'Đảo toàn phần không dùng được khi chủ ngữ là đại từ.'],
      ['Seldom ___ (had they faced / faced they) such a problem.', 'had they faced', 'Họ hiếm khi gặp vấn đề như vậy.']
    ]
  },

  {
    slug: 'fronting-participle-adjective',
    en: 'Fronted participles and adjectives',
    vi: 'Đưa phân từ và tính từ lên đầu — Standing there was…, Gone are the days…',
    level: 'C2',
    summary: 'Đưa cụm phân từ hoặc tính từ lên đầu rồi đảo toàn phần. Chủ ngữ thật nằm cuối câu, nên động từ phải hợp số với nó chứ không hợp với từ đứng đầu.',
    formula: {
      rows: [
        ['Phân từ hiện tại', 'STANDING in the doorway WAS a tall man.'],
        ['Tính từ hoặc phân từ ba', 'GONE ARE the days when houses were cheap.'],
        ['Văn thư tín', 'ATTACHED IS the report you requested.'],
        ['Hợp số với chủ ngữ ở cuối', 'Gone ARE the days (số nhiều) · Attached IS the report (số ít)']
      ],
      note: 'Bẫy hợp số là chỗ sai nhiều nhất: "Gone is the days" sai vì chủ ngữ thật là "the days" số nhiều, dù "Gone" đứng trước. Cứ tìm cụm danh từ ở cuối câu rồi chia động từ theo nó. Mẫu "Attached is…" và "Enclosed is…" là nếp chuẩn của thư công việc.'
    },
    signals: ['V-ing mở đầu rồi tới was hoặc were', 'Gone are', 'Attached is', 'Enclosed is'],
    useWhen: [
      'Văn kể và văn tả: dựng cảnh rồi mới lộ ra ai hoặc cái gì.',
      'Thư công việc và email: "Attached is the invoice for August."',
      'Câu than tiếc hay tổng kết một thời đã qua: "Gone are the days when…".'
    ],
    useNot: [
      { what: 'Không chia động từ theo từ đứng đầu câu.', why: '"Gone is the days" sai. Chủ ngữ thật là "the days" nên phải là "Gone are the days".' },
      { what: 'Không dùng khi chủ ngữ là đại từ.', why: '"Standing in the doorway was he" sai. Đại từ là thông tin cũ nên viết thường: "He was standing in the doorway."' }
    ],
    confuse: [
      {
        with: 'phân từ đưa lên đầu khác mệnh đề phân từ trạng ngữ',
        tell: 'Có đảo động từ theo sau thì là phép đưa lên đầu để nhấn. Không đảo, chỉ có dấu phẩy rồi tới mệnh đề chính, thì là mệnh đề phân từ trạng ngữ.',
        pair: [
          { en: 'Standing in the doorway was a tall man.', vi: 'Đứng ở cửa là một người đàn ông cao lớn (đảo, nhấn mạnh).' },
          { en: 'Standing in the doorway, she waved at us.', vi: 'Đứng ở cửa, cô ấy vẫy tay với chúng tôi (mệnh đề phân từ trạng ngữ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Gone is the days when houses were cheap.', right: 'Gone are the days when houses were cheap.', why: 'Chủ ngữ thật là "the days" số nhiều.' },
      { wrong: 'Attached are the report you requested.', right: 'Attached is the report you requested.', why: 'Chủ ngữ thật là "the report" số ít.' }
    ],
    examples: [
      ['Standing in the doorway was a tall man in a grey coat.', 'Đứng ở cửa là một người đàn ông cao lớn mặc áo khoác xám.', 1, 'Dựng cảnh trước, chủ thể lộ ra ở cuối.'],
      ['Gone are the days when you could buy a house on one salary.', 'Qua rồi cái thời một suất lương mua được nhà.', 1, '"are" hợp với "the days" số nhiều.'],
      ['Attached is the report you requested.', 'Đính kèm là bản báo cáo anh yêu cầu.', 1, 'Nếp chuẩn của thư công việc, "is" hợp với "the report".'],
      ['Standing in the doorway, she waved at us.', 'Đứng ở cửa, cô ấy vẫy tay với chúng tôi.', 1, 'Đối chiếu: không đảo thì đây là mệnh đề phân từ trạng ngữ.'],
      ['Gone is the days when houses were cheap.', 'Qua rồi cái thời nhà còn rẻ.', 0, 'Sai: sửa thành "Gone are the days when houses were cheap."'],
      ['Attached are the report you requested.', 'Đính kèm là bản báo cáo anh yêu cầu.', 0, 'Sai: sửa thành "Attached is the report you requested."']
    ],
    practice: [
      ['Gone ___ (are / is) the days when houses were cheap.', 'are', 'Qua rồi cái thời nhà còn rẻ.'],
      ['Attached ___ (is / are) the report you requested.', 'is', 'Đính kèm là bản báo cáo anh yêu cầu.'],
      ['Standing in the doorway ___ (was a tall man / a tall man was).', 'was a tall man', 'Đứng ở cửa là một người đàn ông cao lớn.'],
      ['The verb agrees with the subject at the ___ (end / start) of the sentence.', 'end', 'Động từ hợp số với chủ ngữ nằm ở cuối câu.'],
      ['Enclosed ___ (are / is) two copies of the contract.', 'are', 'Kèm theo là hai bản hợp đồng.'],
      ['Also included ___ (is / are) a summary of the findings.', 'is', 'Kèm theo còn có một bản tóm tắt kết quả.'],
      ['___ (Standing in the doorway, she waved / Standing in the doorway was she) at us.', 'Standing in the doorway, she waved', 'Đứng ở cửa, cô ấy vẫy tay với chúng tôi.'],
      ['Seated at the far table ___ (were three men / three men were).', 'were three men', 'Ngồi ở bàn cuối là ba người đàn ông.'],
      ['This pattern does not work with a ___ (pronoun / noun) subject.', 'pronoun', 'Mẫu này không dùng được khi chủ ngữ là đại từ.'],
      ['Lost ___ (were / was) all the files from that year.', 'were', 'Mất sạch toàn bộ hồ sơ của năm đó.']
    ]
  },

  {
    slug: 'inversion-comparative',
    en: 'Inversion after as and than',
    vi: 'Đảo ngữ trong mệnh đề so sánh — as were the others, than did wages',
    level: 'C2',
    summary: 'Sau "as" và "than" có thể đảo động từ lên trước chủ ngữ. Không bắt buộc, nhưng đảo thì câu trang trọng và cân đối hơn hẳn.',
    formula: {
      rows: [
        ['Sau "as"', 'She was exhausted, AS WERE the others.'],
        ['Sau "than"', 'Prices rose faster THAN DID wages.'],
        ['Bản không đảo cũng đúng', 'as the others were / than wages did — chỉ bớt trang trọng.'],
        ['Hợp với cụm danh từ đầy đủ', 'Chủ ngữ là đại từ thì thường không đảo: "as they were" tự nhiên hơn.']
      ],
      note: 'Phép đảo ở đây là tuỳ chọn về văn phong, khác hẳn đảo ngữ sau trạng ngữ phủ định vốn bắt buộc. Nhớ: chỉ đảo được khi chủ ngữ là một cụm danh từ đáng kể; đảo với đại từ nghe cứng và văn chương quá mức, trừ vài trường hợp cố ý.'
    },
    signals: ['as were', 'as did', 'than did', 'than had', 'mệnh đề so sánh trang trọng'],
    useWhen: [
      'Bài Viết học thuật khi so sánh hai nhóm số liệu: "than did the control group".',
      'Tránh lặp lại cả một mệnh đề dài mà vẫn giữ được nhịp cân đối.',
      'Văn viết trang trọng và bài báo cáo.'
    ],
    useNot: [
      { what: 'Không đảo khi chủ ngữ là đại từ.', why: '"as were they" nghe cứng. Chỗ này viết "as they were" tự nhiên hơn nhiều.' },
      { what: 'Không nhầm phép đảo này với đảo ngữ bắt buộc.', why: 'Sau "as" và "than" thì đảo là tuỳ chọn văn phong; sau "never" hay "rarely" thì đảo là bắt buộc.' }
    ],
    confuse: [
      {
        with: 'đảo tuỳ chọn khác đảo bắt buộc',
        tell: 'Sau "as" và "than" thì không đảo vẫn đúng. Sau trạng ngữ phủ định mà không đảo là sai.',
        pair: [
          { en: 'Prices rose faster than did wages.', vi: 'Giá tăng nhanh hơn lương (đảo tuỳ chọn, trang trọng).' },
          { en: 'Never have I seen such a mess.', vi: 'Chưa bao giờ tôi thấy bừa bộn đến thế (đảo bắt buộc).' }
        ]
      }
    ],
    errors: [
      { wrong: 'She was exhausted, as were them.', right: 'She was exhausted, as were the others.', why: 'Sau "as were" phải là chủ ngữ, không dùng đại từ tân ngữ "them".' },
      { wrong: 'Prices rose faster than did they.', right: 'Prices rose faster than they did.', why: 'Chủ ngữ là đại từ nên không đảo.' }
    ],
    examples: [
      ['She was exhausted, as were the other runners.', 'Cô ấy kiệt sức, những người chạy khác cũng vậy.', 1, 'Đảo sau "as", chủ ngữ là cụm danh từ đầy đủ.'],
      ['Prices rose faster than did wages.', 'Giá tăng nhanh hơn lương.', 1, 'Đảo sau "than", rất hợp văn báo cáo.'],
      ['The older group scored higher than did the younger group.', 'Nhóm lớn tuổi đạt điểm cao hơn nhóm trẻ.', 1, 'Mẫu quen thuộc khi so sánh hai nhóm trong bài học thuật.'],
      ['Prices rose faster than wages did.', 'Giá tăng nhanh hơn lương.', 1, 'Bản không đảo: vẫn đúng, chỉ bớt trang trọng.'],
      ['She was exhausted, as were them.', 'Cô ấy kiệt sức, mấy người kia cũng vậy.', 0, 'Sai: sửa thành "She was exhausted, as were the others."'],
      ['Prices rose faster than did they.', 'Giá tăng nhanh hơn lương.', 0, 'Sai: chủ ngữ là đại từ, sửa thành "Prices rose faster than they did."']
    ],
    practice: [
      ['She was exhausted, as ___ (were the others / the others were), after the race.', 'were the others', 'Cô ấy kiệt sức, những người khác cũng vậy.'],
      ['Prices rose faster than ___ (did wages / did they).', 'did wages', 'Giá tăng nhanh hơn lương.'],
      ['Inversion after "as" and "than" is ___ (optional / compulsory).', 'optional', 'Đảo sau "as" và "than" là tuỳ chọn.'],
      ['Inversion after "never" is ___ (compulsory / optional).', 'compulsory', 'Đảo sau "never" là bắt buộc.'],
      ['The older group scored higher than ___ (did the younger group / did they).', 'did the younger group', 'Nhóm lớn tuổi đạt điểm cao hơn nhóm trẻ.'],
      ['She was exhausted, as ___ (were / was) the other runners.', 'were', 'Cô ấy kiệt sức, những người chạy khác cũng vậy.'],
      ['With a pronoun subject, prefer ___ (than they did / than did they).', 'than they did', 'Với chủ ngữ là đại từ thì nên viết "than they did".'],
      ['Sales fell in the north, as ___ (did profits / did them).', 'did profits', 'Doanh số giảm ở miền Bắc, lợi nhuận cũng vậy.'],
      ['This inversion suits ___ (formal / casual) writing.', 'formal', 'Phép đảo này hợp văn viết trang trọng.'],
      ['Rainfall was heavier in 2024 than ___ (had been forecast / had it been forecast).', 'had been forecast', 'Lượng mưa năm 2024 lớn hơn dự báo.']
    ]
  },

  {
    slug: 'cleft-not-until',
    en: 'Negative and contrastive it-clefts',
    vi: 'Câu chẻ phủ định — It was not until… that…',
    level: 'C2',
    summary: 'Chẻ câu quanh một mốc phủ định để nhấn rằng phải tới lúc đó việc mới xảy ra. Cùng họ là mẫu đối lập "not X but Y".',
    formula: {
      rows: [
        ['Mốc thời gian', 'IT WAS NOT UNTIL 1990 THAT the law changed.'],
        ['Đối lập hai vế', 'IT IS NOT the cost BUT the delay THAT worries me.'],
        ['Kèm "only"', 'IT WAS ONLY AFTER the meeting THAT she explained.'],
        ['Luôn là "that"', 'Không dùng "when" hay "which" thay cho "that" trong khung này.']
      ],
      note: 'Bẫy lớn nhất là viết "It was not until 1990 when…". Dù phần nhấn là một mốc thời gian, khung câu chẻ vẫn luôn dùng "that". Mẫu này rất được việc trong bài Viết: nó vừa nhấn mốc, vừa hàm ý suốt trước đó chuyện chưa xảy ra.'
    },
    signals: ['It was not until … that', 'It is not … but … that', 'It was only after … that'],
    useWhen: [
      'Nhấn một bước ngoặt trong bài Viết dạng kể lại quá trình hay lịch sử.',
      'Đính chính bằng cách đối lập: "It is not the cost but the delay that worries me."',
      'Bài Đọc: nhận ra hàm ý "mãi tới lúc đó mới" của tác giả.'
    ],
    useNot: [
      { what: 'Không dùng "when" thay cho "that".', why: '"It was not until 1990 when the law changed" sai. Khung câu chẻ luôn dùng "that".' },
      { what: 'Không thêm phủ định lần nữa ở vế sau.', why: '"It was not until 1990 that the law did not change" là phủ định hai lần, đổi hẳn nghĩa. Vế sau viết khẳng định.' }
    ],
    confuse: [
      {
        with: 'câu chẻ phủ định khác đảo ngữ cùng nghĩa',
        tell: 'Hai cách nói cùng một ý. Câu chẻ dàn ý ra thong thả; đảo ngữ dồn nén và mạnh hơn.',
        pair: [
          { en: 'It was not until much later that we learned the truth.', vi: 'Mãi về sau chúng tôi mới biết sự thật (câu chẻ).' },
          { en: 'Not until much later did we learn the truth.', vi: 'Mãi về sau chúng tôi mới biết sự thật (đảo ngữ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'It was not until 1990 when the law changed.', right: 'It was not until 1990 that the law changed.', why: 'Khung câu chẻ luôn dùng "that", kể cả khi phần nhấn là thời gian.' },
      { wrong: 'It was not until much later that we did not learn the truth.', right: 'It was not until much later that we learned the truth.', why: 'Phủ định hai lần làm đảo ngược nghĩa câu.' }
    ],
    examples: [
      ['It was not until 1990 that the law finally changed.', 'Mãi tới năm 1990 luật mới thay đổi.', 1, 'Nhấn mốc, hàm ý suốt trước đó chưa đổi.'],
      ['It is not the cost but the delay that worries me.', 'Cái làm tôi lo không phải chi phí mà là sự chậm trễ.', 1, 'Mẫu đối lập, rất hợp khi đính chính.'],
      ['It was only after the meeting that she explained her decision.', 'Mãi sau cuộc họp cô ấy mới giải thích quyết định của mình.', 1, 'Kèm "only", cùng họ với mẫu "not until".'],
      ['Not until much later did we learn the truth.', 'Mãi về sau chúng tôi mới biết sự thật.', 1, 'Bản đảo ngữ: cùng nghĩa, dồn nén hơn.'],
      ['It was not until 1990 when the law changed.', 'Mãi tới năm 1990 luật mới thay đổi.', 0, 'Sai: sửa thành "It was not until 1990 that the law changed."'],
      ['It was not until much later that we did not learn the truth.', 'Mãi về sau chúng tôi mới biết sự thật.', 0, 'Sai: sửa thành "It was not until much later that we learned the truth."']
    ],
    practice: [
      ['It was not until 1990 ___ (that / when) the law changed.', 'that', 'Mãi tới năm 1990 luật mới thay đổi.'],
      ['It is not the cost ___ (but / and) the delay that worries me.', 'but', 'Cái làm tôi lo không phải chi phí mà là sự chậm trễ.'],
      ['It was only after the meeting ___ (that / when) she explained.', 'that', 'Mãi sau cuộc họp cô ấy mới giải thích.'],
      ['It was not until much later that we ___ (learned / did not learn) the truth.', 'learned', 'Mãi về sau chúng tôi mới biết sự thật.'],
      ['The cleft frame always uses ___ (that / when), even for time.', 'that', 'Khung câu chẻ luôn dùng "that", kể cả với mốc thời gian.'],
      ['___ (It was not until / Not until it was) the second week that results appeared.', 'It was not until', 'Mãi tới tuần thứ hai mới thấy kết quả.'],
      ['The inverted version is "Not until later ___ (did we learn / we learned) the truth".', 'did we learn', 'Bản đảo ngữ là "Not until later did we learn the truth".'],
      ['It is not what he said ___ (but / that) how he said it that upset her.', 'but', 'Cái làm cô ấy buồn không phải lời anh ta nói mà là cách nói.'],
      ['It was not until the rain stopped ___ (that / when) we set off.', 'that', 'Mãi tới khi tạnh mưa chúng tôi mới lên đường.'],
      ['This pattern hints that before then the event ___ (had not happened / had happened).', 'had not happened', 'Mẫu này hàm ý trước lúc đó việc kia chưa xảy ra.']
    ]
  },

  {
    slug: 'inversion-not-phrases',
    en: 'Not once, Not for one moment, Not until…',
    vi: 'Đảo ngữ với cụm mở đầu bằng "Not"',
    level: 'C2',
    summary: 'Cả một cụm mở đầu bằng "Not" đưa lên đầu câu cũng kéo theo đảo trợ động từ, y như một trạng từ phủ định đơn lẻ.',
    formula: {
      rows: [
        ['Not once', 'NOT ONCE DID she complain about the noise.'],
        ['Not for one moment', 'NOT FOR ONE MOMENT DID I believe him.'],
        ['Not until + mốc', 'NOT UNTIL much later DID we learn the truth.'],
        ['Not since + mốc', 'NOT SINCE 1975 HAS the country seen such floods.']
      ],
      note: 'Điểm khác so với "never" và "rarely": ở đây cả một CỤM đi lên đầu chứ không chỉ một từ, nhưng luật vẫn thế — trợ động từ nhảy lên trước chủ ngữ. Và nhớ đối chiếu với câu chẻ: "Not until later did we learn" bằng đúng "It was not until later that we learned", chỉ khác nhịp.'
    },
    signals: ['Not once', 'Not for one moment', 'Not until', 'Not since', 'Not in any way'],
    useWhen: [
      'Phủ định dứt khoát trong bài Viết tranh luận hoặc lời khai.',
      'Nhấn rằng suốt một quãng thời gian dài chuyện đó không hề xảy ra.',
      'Văn kể: dựng cao trào trước một bước ngoặt.'
    ],
    useNot: [
      { what: 'Không giữ trật tự thường sau cụm "Not…" đứng đầu.', why: '"Not once she complained" sai. Phải đảo: "Not once did she complain."' },
      { what: 'Không dùng khi "not" chỉ phủ định một danh từ trong câu.', why: '"Not many people came" giữ trật tự thường, vì "not" ở đây gắn vào cụm danh từ chủ ngữ chứ không phải trạng ngữ đưa lên đầu.' }
    ],
    confuse: [
      {
        with: 'cụm "Not…" đảo ngữ khác "not" phủ định chủ ngữ',
        tell: 'Cụm đưa lên đầu là trạng ngữ thì đảo. "Not" gắn thẳng vào chủ ngữ thì không đảo.',
        pair: [
          { en: 'Not once did she complain.', vi: 'Cô ấy không hề than phiền lấy một lần (đảo).' },
          { en: 'Not many people came to the talk.', vi: 'Không nhiều người tới buổi nói chuyện (không đảo).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Not once she complained about the noise.', right: 'Not once did she complain about the noise.', why: 'Cụm phủ định đứng đầu thì bắt buộc đảo trợ động từ.' },
      { wrong: 'Not until much later we learned the truth.', right: 'Not until much later did we learn the truth.', why: 'Cùng lý do: phải có "did" đảo lên trước chủ ngữ.' }
    ],
    examples: [
      ['Not once did she complain about the noise.', 'Cô ấy không hề than phiền về tiếng ồn lấy một lần.', 1, 'Cụm "Not once" kéo theo đảo trợ động từ.'],
      ['Not for one moment did I believe his story.', 'Tôi không tin câu chuyện của anh ta lấy một giây.', 1, 'Cụm dài hơn nhưng luật vẫn vậy.'],
      ['Not since 1975 has the country seen such floods.', 'Từ năm 1975 tới nay đất nước chưa gặp trận lụt nào như thế.', 1, 'Nhấn cả một quãng thời gian dài.'],
      ['Not many people came to the talk.', 'Không nhiều người tới buổi nói chuyện.', 1, 'Đối chiếu: "not" gắn vào chủ ngữ nên không đảo.'],
      ['Not once she complained about the noise.', 'Cô ấy không hề than phiền về tiếng ồn.', 0, 'Sai: sửa thành "Not once did she complain about the noise."'],
      ['Not until much later we learned the truth.', 'Mãi về sau chúng tôi mới biết sự thật.', 0, 'Sai: sửa thành "Not until much later did we learn the truth."']
    ],
    practice: [
      ['Not once ___ (did she complain / she complained) about the noise.', 'did she complain', 'Cô ấy không hề than phiền về tiếng ồn.'],
      ['Not for one moment ___ (did I believe / I believed) his story.', 'did I believe', 'Tôi không tin câu chuyện của anh ta lấy một giây.'],
      ['Not until much later ___ (did we learn / we learned) the truth.', 'did we learn', 'Mãi về sau chúng tôi mới biết sự thật.'],
      ['Not since 1975 ___ (has the country seen / the country has seen) such floods.', 'has the country seen', 'Từ năm 1975 tới nay chưa có trận lụt nào như thế.'],
      ['___ (Not many people came / Not many people did come) to the talk.', 'Not many people came', 'Không nhiều người tới buổi nói chuyện.'],
      ['The cleft version is "It was not until later ___ (that we learned / when we learned)".', 'that we learned', 'Bản câu chẻ là "It was not until later that we learned".'],
      ['Not in any way ___ (does this excuse / this excuses) his behaviour.', 'does this excuse', 'Điều đó không hề bào chữa được cho cách cư xử của anh ta.'],
      ['When "not" attaches to the subject there is ___ (no inversion / inversion).', 'no inversion', 'Khi "not" gắn vào chủ ngữ thì không đảo.'],
      ['Not a single word ___ (did he say / he said) all evening.', 'did he say', 'Suốt cả tối anh ta không nói lấy một lời.'],
      ['Not until the results came out ___ (did she relax / she relaxed).', 'did she relax', 'Mãi tới lúc có kết quả cô ấy mới thở phào.']
    ]
  },

  {
    slug: 'fronting-cohesion',
    en: 'Fronting phrases for cohesion',
    vi: 'Đưa cụm giới từ lên đầu để nối mạch văn bản',
    level: 'C2',
    summary: 'Đưa lên đầu câu cái mà người đọc VỪA BIẾT, để dành cuối câu cho cái mới. Đây là cách nối câu với câu mà không cần từ nối.',
    formula: {
      rows: [
        ['Nối vào ý vừa nêu', 'OF THESE THREE OPTIONS, the second is the most promising.'],
        ['Khoanh vùng bàn luận', 'IN THIS RESPECT, the two studies differ sharply.'],
        ['Nêu vấn đề rồi trả lời', 'TO THIS PROBLEM there is no easy solution.'],
        ['Nguyên tắc', 'Thông tin CŨ lên đầu, thông tin MỚI xuống cuối.']
      ],
      note: 'Đây là kỹ thuật mạch lạc chứ không phải phép nhấn mạnh: đưa cụm lên đầu không phải để hét to mà để bắc cầu sang câu trước. Khác với việc đưa TÂN NGỮ lên đầu ở bậc C1 — chỗ đó là để đối lập hai vế. Ở đây thường không đảo, trừ khi là cụm chỉ nơi chốn kéo theo đảo toàn phần.'
    },
    signals: ['Of these…', 'In this respect', 'To this problem', 'Among these', 'cụm giới từ mở đầu câu'],
    useWhen: [
      'Bài Viết học thuật: nối đoạn với đoạn mà khỏi lạm dụng "however", "moreover".',
      'Sau khi liệt kê xong thì chọn ra một mục để bàn tiếp: "Of these, the first…".',
      'Khoanh vùng phạm vi bàn luận trước khi nêu nhận định.'
    ],
    useNot: [
      { what: 'Không đưa lên đầu một cụm mà người đọc chưa biết.', why: 'Kỹ thuật này chỉ chạy khi cụm đầu câu trỏ về điều vừa nói. Đưa thông tin mới lên đầu là làm câu khó theo.' },
      { what: 'Không lạm dụng liên tiếp nhiều câu.', why: 'Câu nào cũng mở bằng cụm giới từ thì đoạn văn nghe đều đều và kiểu cách.' }
    ],
    confuse: [
      {
        with: 'đưa lên đầu để nối mạch khác để đối lập',
        tell: 'Cụm giới từ trỏ về điều vừa nói thì là nối mạch. Tân ngữ đưa lên đầu để so với vế kia thì là đối lập.',
        pair: [
          { en: 'Of these three options, the second is the most promising.', vi: 'Trong ba phương án đó, phương án hai hứa hẹn nhất (nối mạch).' },
          { en: 'Tea I like; coffee I cannot stand.', vi: 'Trà thì tôi thích; cà phê thì tôi chịu không nổi (đối lập).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Of these three options, is the second the most promising.', right: 'Of these three options, the second is the most promising.', why: 'Cụm giới từ đưa lên đầu để nối mạch thì không kéo theo đảo ngữ.' },
      { wrong: 'In this respect differ the two studies.', right: 'In this respect the two studies differ.', why: 'Cùng lý do: giữ trật tự chủ ngữ trước động từ.' }
    ],
    examples: [
      ['Of these three options, the second is the most promising.', 'Trong ba phương án đó, phương án hai hứa hẹn nhất.', 1, 'Cụm đầu câu trỏ về danh sách vừa nêu.'],
      ['In this respect, the two studies differ sharply.', 'Về mặt này, hai nghiên cứu khác nhau rõ rệt.', 1, 'Khoanh vùng bàn luận trước khi nêu nhận định.'],
      ['To this problem there is no easy solution.', 'Vấn đề này không có lời giải dễ dàng nào.', 1, 'Nêu vấn đề rồi mới đưa ra câu trả lời.'],
      ['Among the findings, one stands out.', 'Trong số các kết quả, có một kết quả nổi bật.', 1, 'Thông tin cũ lên đầu, thông tin mới xuống cuối.'],
      ['Of these three options, is the second the most promising.', 'Trong ba phương án đó, phương án hai hứa hẹn nhất.', 0, 'Sai: sửa thành "Of these three options, the second is the most promising."'],
      ['In this respect differ the two studies.', 'Về mặt này, hai nghiên cứu khác nhau.', 0, 'Sai: sửa thành "In this respect the two studies differ."']
    ],
    practice: [
      ['Of these three options, ___ (the second is / is the second) the most promising.', 'the second is', 'Trong ba phương án đó, phương án hai hứa hẹn nhất.'],
      ['In this respect, ___ (the two studies differ / differ the two studies).', 'the two studies differ', 'Về mặt này, hai nghiên cứu khác nhau.'],
      ['This technique puts ___ (old / new) information at the front.', 'old', 'Kỹ thuật này đặt thông tin cũ lên đầu câu.'],
      ['Among the findings, one ___ (stands out / does stand out) clearly.', 'stands out', 'Trong số các kết quả, có một kết quả nổi bật.'],
      ['To this problem ___ (there is / is there) no easy solution.', 'there is', 'Vấn đề này không có lời giải dễ dàng nào.'],
      ['Fronting for cohesion normally has ___ (no inversion / inversion).', 'no inversion', 'Đưa lên đầu để nối mạch thì thường không đảo.'],
      ['For this reason, ___ (the plan was dropped / was the plan dropped).', 'the plan was dropped', 'Vì lý do đó, kế hoạch bị bỏ.'],
      ['The purpose here is ___ (cohesion / emphasis).', 'cohesion', 'Mục đích ở đây là nối mạch văn bản.'],
      ['Under these conditions, ___ (the reaction slows / does the reaction slow).', 'the reaction slows', 'Trong điều kiện đó, phản ứng chậm lại.'],
      ['With regard to cost, ___ (the second option wins / wins the second option).', 'the second option wins', 'Xét về chi phí, phương án hai thắng.']
    ]
  },

  {
    slug: 'emphasis-far-from',
    en: 'far from, anything but, nothing short of',
    vi: 'Phủ định nhấn mạnh gián tiếp — far from, anything but, nothing short of',
    level: 'C2',
    summary: 'Phủ định mà không dùng chữ "not". Nhóm cụm này bác bỏ mạnh hơn hẳn phủ định thường, vì nó nêu luôn cái đối lập.',
    formula: {
      rows: [
        ['far from + V-ing hoặc danh từ', 'FAR FROM BEING a solution, it made things worse.'],
        ['anything but + tính từ', 'The result was ANYTHING BUT simple. (hoàn toàn không đơn giản)'],
        ['nothing short of + danh từ', 'It was NOTHING SHORT OF a disaster.'],
        ['the last thing + mệnh đề', 'THE LAST THING I want IS an argument.']
      ],
      note: 'Cẩn thận với "anything but": nó nghĩa là HOÀN TOÀN KHÔNG, chứ không phải "bất cứ thứ gì trừ". "He is anything but stupid" nghĩa là anh ta thông minh, chứ không phải anh ta ngốc. Đọc hiểu sai chỗ này là hiểu ngược cả câu. Riêng "far from" không kéo theo đảo ngữ dù đứng đầu câu.'
    },
    signals: ['far from', 'anything but', 'nothing short of', 'the last thing', 'by no means'],
    useWhen: [
      'Bác bỏ dứt khoát trong bài Viết tranh luận.',
      'Nhượng bộ giả rồi lật lại: "Far from solving the problem, the policy created new ones."',
      'Nhấn mức độ cực đoan của một đánh giá: "nothing short of remarkable".'
    ],
    useNot: [
      { what: 'Không hiểu "anything but" theo nghĩa đen.', why: '"He is anything but stupid" nghĩa là anh ta rất thông minh. Hiểu thành "anh ta ngốc" là ngược hẳn ý người viết.' },
      { what: 'Không đảo ngữ sau "Far from" đứng đầu câu.', why: '"Far from being a solution, did it make things worse" sai. Cụm này không kéo theo đảo: "Far from being a solution, it made things worse."' }
    ],
    confuse: [
      {
        with: '"anything but" khác "nothing but"',
        tell: '"anything but X" nghĩa là hoàn toàn KHÔNG phải X. "nothing but X" nghĩa là CHỈ có X, không gì khác.',
        pair: [
          { en: 'The exam was anything but easy.', vi: 'Kỳ thi hoàn toàn không dễ chút nào.' },
          { en: 'The exam was nothing but memorisation.', vi: 'Kỳ thi chỉ toàn là học thuộc lòng.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Far from being a solution, did it make things worse.', right: 'Far from being a solution, it made things worse.', why: '"Far from" không kéo theo đảo ngữ.' },
      { wrong: 'Far from be a solution, the plan created new problems.', right: 'Far from being a solution, the plan created new problems.', why: 'Sau "far from" là V-ing hoặc danh từ, không phải nguyên thể trần.' }
    ],
    examples: [
      ['Far from being a solution, the policy made things worse.', 'Chính sách này chẳng những không giải quyết được gì mà còn làm mọi thứ tệ hơn.', 1, 'Nhượng bộ giả rồi lật lại — rất mạnh trong bài tranh luận.'],
      ['The result was anything but simple.', 'Kết quả hoàn toàn không đơn giản chút nào.', 1, '"anything but" nghĩa là hoàn toàn không, chứ không phải nghĩa đen.'],
      ['It was nothing short of a disaster.', 'Đó chẳng khác gì một thảm hoạ.', 1, 'Nhấn mức độ cực đoan của đánh giá.'],
      ['The last thing I want is an argument.', 'Thứ tôi ngại nhất là cãi nhau.', 1, '"the last thing" là cách phủ định gián tiếp rất tự nhiên.'],
      ['Far from being a solution, did it make things worse.', 'Chính sách này còn làm mọi thứ tệ hơn.', 0, 'Sai: sửa thành "Far from being a solution, it made things worse."'],
      ['Far from be a solution, the plan created new problems.', 'Kế hoạch này chẳng giải quyết được gì mà còn sinh thêm vấn đề.', 0, 'Sai: sửa thành "Far from being a solution, the plan created new problems."']
    ],
    practice: [
      ['Far from ___ (being / be) a solution, the policy made things worse.', 'being', 'Chính sách này chẳng những không giải quyết được gì mà còn làm mọi thứ tệ hơn.'],
      ['The result was ___ (anything but / nothing but) simple.', 'anything but', 'Kết quả hoàn toàn không đơn giản chút nào.'],
      ['"He is anything but stupid" means he is ___ (clever / stupid).', 'clever', 'Câu "He is anything but stupid" nghĩa là anh ta thông minh.'],
      ['It was nothing ___ (short of / but short of) a disaster.', 'short of', 'Đó chẳng khác gì một thảm hoạ.'],
      ['The last thing I want ___ (is / are) an argument.', 'is', 'Thứ tôi ngại nhất là cãi nhau.'],
      ['Far from being a solution, ___ (it made / did it make) things worse.', 'it made', 'Chẳng giải quyết được gì, nó còn làm mọi thứ tệ hơn.'],
      ['"Nothing but memorisation" means ___ (only memorisation / no memorisation).', 'only memorisation', 'Cụm "nothing but memorisation" nghĩa là chỉ toàn học thuộc lòng.'],
      ['Her performance was nothing short of ___ (remarkable / remark).', 'remarkable', 'Màn trình diễn của cô ấy quả là xuất sắc.'],
      ['"Far from" is followed by a noun or ___ (V-ing / bare infinitive).', 'V-ing', 'Sau "far from" là danh từ hoặc V-ing.'],
      ['The journey was ___ (anything but / nothing but) comfortable after the delay.', 'anything but', 'Chuyến đi hoàn toàn không thoải mái sau vụ hoãn.']
    ]
  }

];

/** Điểm ngữ pháp, đã phẳng hoá phần JSON để nạp thẳng vào bảng. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'emphasis',
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
