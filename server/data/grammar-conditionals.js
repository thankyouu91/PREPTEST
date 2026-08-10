/**
 * Ngữ pháp — nhóm CÂU ĐIỀU KIỆN VÀ GIẢ ĐỊNH, phần bậc A2 đến B2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 20 điểm
 * (A2 ×2, B1 ×4, B2 ×5, C1 ×5, C2 ×4). Tệp này soạn 11 điểm của A2, B1 và B2;
 * 9 điểm bậc C1–C2 tách thành mục riêng trong hàng đợi.
 *
 * Vì sao nhóm này khó với người Việt: tiếng Anh đánh dấu chuyện KHÔNG CÓ THẬT
 * bằng cách lùi thì — muốn nói trái với hiện tại thì dùng quá khứ, muốn nói
 * trái với quá khứ thì dùng quá khứ hoàn thành. Tiếng Việt không có cơ chế đó,
 * chỉ thêm chữ "giá mà", "nếu như" rồi giữ nguyên động từ. Người học vì thế hay
 * chia thì theo nghĩa thời gian thay vì theo mức độ có thật, dẫn tới hai lỗi
 * kinh điển: đặt "will" vào mệnh đề if, và đặt "would" vào mệnh đề if.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== A2 ==================== */

  {
    slug: 'conditional-zero',
    en: 'Zero conditional',
    vi: 'Câu điều kiện loại 0 — sự thật hiển nhiên',
    level: 'A2',
    summary: 'Nói quy luật luôn đúng: cứ có A là có B. Cả hai vế đều dùng hiện tại đơn.',
    formula: {
      rows: [
        ['Công thức', 'If + hiện tại đơn, hiện tại đơn'],
        ['Đảo vế', 'Hiện tại đơn + if + hiện tại đơn (bỏ dấu phẩy)'],
        ['Thay được if', 'when — vì việc chắc chắn xảy ra'],
        ['Ví dụ gốc', 'If you heat ice, it melts.']
      ],
      note: 'Đây là loại duy nhất mà "if" và "when" thay nhau được mà nghĩa gần như không đổi, bởi điều kiện luôn đúng chứ không phải giả định.'
    },
    signals: ['always', 'usually', 'every time', 'whenever', 'when'],
    useWhen: [
      'Quy luật tự nhiên và sự thật khoa học.',
      'Thói quen và phản ứng luôn xảy ra như nhau.',
      'Hướng dẫn và nội quy: "If the alarm rings, you leave the building."'
    ],
    useNot: [
      { what: 'Không dùng "will" ở bất kỳ vế nào.', why: 'Loại 0 nói quy luật, không nói tương lai. "If you heat ice, it will melt" là loại 1, nói một lần cụ thể.' },
      { what: 'Không dùng cho việc chỉ xảy ra một lần.', why: 'Một lần cụ thể trong tương lai thì dùng loại 1.' }
    ],
    confuse: [
      {
        with: 'câu điều kiện loại 1',
        tell: 'Loại 0 nói lần nào cũng thế; loại 1 nói một lần cụ thể sắp tới.',
        pair: [
          { en: 'If it rains, the ground gets wet.', vi: 'Cứ mưa là đất ướt. (quy luật)' },
          { en: 'If it rains tomorrow, we will stay home.', vi: 'Nếu mai mưa thì chúng ta ở nhà. (một lần cụ thể)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If you mix red and blue, you will get purple.', right: 'If you mix red and blue, you get purple.', why: 'Đây là quy luật luôn đúng nên cả hai vế dùng hiện tại đơn.' },
      { wrong: 'If water will reach 100 degrees, it boils.', right: 'If water reaches 100 degrees, it boils.', why: 'Không bao giờ đặt "will" vào mệnh đề if.' }
    ],
    examples: [
      ['If you heat ice, it melts.', 'Cứ đun đá là nó tan.', 1, 'Quy luật tự nhiên.'],
      ['Plants die if they do not get water.', 'Cây chết nếu không được tưới nước.', 1, 'Đảo vế nên bỏ dấu phẩy.'],
      ['If the light is red, you stop.', 'Đèn đỏ thì dừng lại.', 1, 'Nội quy, lần nào cũng vậy.'],
      ['When you press this button, the machine starts.', 'Bấm nút này là máy chạy.', 1, '"when" thay được "if" ở loại 0.'],
      ['If you mix red and blue, you will get purple.', 'Trộn đỏ với xanh thì ra tím.', 0, 'Sai: quy luật thì bỏ "will". Sửa thành "you get purple".'],
      ['If water will reach 100 degrees, it boils.', 'Nước đạt 100 độ thì sôi.', 0, 'Sai: không đặt "will" vào mệnh đề if. Sửa thành "If water reaches 100 degrees".']
    ],
    practice: [
      ['If you ___ (heat / will heat) water, it boils.', 'heat', 'Đun nước thì nước sôi.'],
      ['Ice ___ (melts / will melt) if you leave it in the sun.', 'melts', 'Để ngoài nắng thì đá tan.'],
      ['If the door ___ (is / will be) locked, use the side entrance.', 'is', 'Nếu cửa khoá thì đi lối bên.'],
      ['My dog barks if someone ___ (comes / will come) to the gate.', 'comes', 'Có ai tới cổng là chó nhà tôi sủa.'],
      ['If you press this key, the screen ___ (goes / will go) dark.', 'goes', 'Bấm phím này là màn hình tối đi.'],
      ['Metal ___ (expands / expanded) if you heat it.', 'expands', 'Kim loại nở ra khi bị nung nóng.'],
      ['If it ___ (rains / will rain), the roads get slippery.', 'rains', 'Cứ mưa là đường trơn.'],
      ['Babies cry if they ___ (are / will be) hungry.', 'are', 'Trẻ con đói là khóc.'],
      ['If you do not water plants, they ___ (die / died).', 'die', 'Không tưới thì cây chết.'],
      ['The alarm ___ (rings / rang) if someone opens the window.', 'rings', 'Có ai mở cửa sổ là chuông báo kêu.']
    ]
  },

  {
    slug: 'conditional-first',
    en: 'First conditional',
    vi: 'Câu điều kiện loại 1 — có thật ở tương lai',
    level: 'A2',
    summary: 'Điều kiện hoàn toàn có thể xảy ra và kết quả kéo theo trong tương lai. Mệnh đề if dùng hiện tại đơn dù nói chuyện sắp tới.',
    formula: {
      rows: [
        ['Công thức', 'If + hiện tại đơn, will + V(nguyên thể)'],
        ['Đảo vế', 'will + V + if + hiện tại đơn (bỏ dấu phẩy)'],
        ['Phủ định', 'If … do not …, … will not …'],
        ['Cùng nhóm liên từ', 'when, as soon as, until, before, after cũng dùng hiện tại đơn']
      ],
      note: 'Đây là chỗ sai nhiều nhất cả nhóm: mệnh đề if nói chuyện tương lai nhưng KHÔNG dùng "will". Quy tắc này áp cho cả when, as soon as, until, before, after.'
    },
    signals: ['if', 'unless', 'when', 'as soon as', 'tomorrow', 'next week'],
    useWhen: [
      'Điều kiện có khả năng xảy ra thật và hệ quả trong tương lai.',
      'Cảnh báo và hứa hẹn: "If you touch that, you will get burnt."',
      'Đề nghị có điều kiện: "If you help me, I will buy you lunch."'
    ],
    useNot: [
      { what: 'Không đặt "will" vào mệnh đề if.', why: '"If it will rain" luôn sai; đúng là "If it rains".' },
      { what: 'Không dùng cho điều kiện trái thực tế.', why: 'Trái với hiện tại thì dùng loại 2: "If I were rich…".' }
    ],
    confuse: [
      {
        with: 'câu điều kiện loại 2',
        tell: 'Loại 1 nói việc có thể xảy ra thật; loại 2 nói việc giả định, khó hoặc không xảy ra.',
        pair: [
          { en: 'If I have time, I will help you.', vi: 'Nếu tôi có thời gian thì tôi giúp. (có khả năng thật)' },
          { en: 'If I had time, I would help you.', vi: 'Giá mà tôi có thời gian thì tôi đã giúp. (thực tế là không có)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If it will rain tomorrow, we will cancel the trip.', right: 'If it rains tomorrow, we will cancel the trip.', why: 'Mệnh đề if dùng hiện tại đơn dù nói về tương lai.' },
      { wrong: 'I will call you as soon as I will arrive.', right: 'I will call you as soon as I arrive.', why: '"as soon as" cũng theo quy tắc đó, không dùng "will".' }
    ],
    examples: [
      ['If it rains tomorrow, we will stay at home.', 'Nếu mai mưa thì chúng ta ở nhà.', 1, 'Điều kiện có thật, hệ quả tương lai.'],
      ['I will text you if I find the book.', 'Tìm được sách tôi sẽ nhắn cho bạn.', 1, 'Đảo vế, bỏ dấu phẩy.'],
      ['If you do not hurry, you will miss the bus.', 'Không nhanh lên là lỡ xe buýt đấy.', 1, 'Cảnh báo.'],
      ['We will start as soon as everyone arrives.', 'Mọi người tới đủ là chúng ta bắt đầu.', 1, '"as soon as" đi với hiện tại đơn.'],
      ['If it will rain tomorrow, we will cancel the trip.', 'Nếu mai mưa thì chúng ta huỷ chuyến đi.', 0, 'Sai: sửa thành "If it rains tomorrow".'],
      ['I will call you as soon as I will arrive.', 'Tôi sẽ gọi cho bạn ngay khi tới nơi.', 0, 'Sai: sửa thành "as soon as I arrive".']
    ],
    practice: [
      ['If you ___ (study / will study) hard, you will pass.', 'study', 'Học chăm thì bạn sẽ đỗ.'],
      ['We ___ (will go / go) to the beach if the weather is nice.', 'will go', 'Thời tiết đẹp thì chúng ta ra biển.'],
      ['If she ___ (calls / will call), tell her I am busy.', 'calls', 'Nếu cô ấy gọi thì bảo tôi đang bận.'],
      ['I will wait until you ___ (finish / will finish).', 'finish', 'Tôi sẽ đợi tới khi bạn xong.'],
      ['If we do not leave now, we ___ (will be / are) late.', 'will be', 'Không đi bây giờ là muộn mất.'],
      ['He ___ (will help / helps) you if you ask him.', 'will help', 'Bạn nhờ thì anh ấy sẽ giúp.'],
      ['If the shop ___ (is / will be) closed, we will try tomorrow.', 'is', 'Nếu cửa hàng đóng thì mai thử lại.'],
      ['Send me a message when you ___ (get / will get) home.', 'get', 'Về tới nhà thì nhắn cho tôi.'],
      ['If it ___ (snows / will snow), the school will close.', 'snows', 'Nếu tuyết rơi thì trường đóng cửa.'],
      ['They ___ (will not come / do not come) if it rains.', 'will not come', 'Trời mưa thì họ không tới đâu.']
    ]
  },

  /* ==================== B1 ==================== */

  {
    slug: 'conditional-second',
    en: 'Second conditional',
    vi: 'Câu điều kiện loại 2 — trái với hiện tại',
    level: 'B1',
    summary: 'Giả định trái với thực tế bây giờ, hoặc chuyện rất khó xảy ra. Dùng quá khứ đơn nhưng KHÔNG nói về quá khứ.',
    formula: {
      rows: [
        ['Công thức', 'If + quá khứ đơn, would + V(nguyên thể)'],
        ['Động từ to be', 'If I were / he were — dạng giả định, dùng "were" cho mọi ngôi'],
        ['Khuyên nhủ', 'If I were you, I would …'],
        ['Thay would', 'could, might khi muốn nhẹ hơn']
      ],
      note: 'Quá khứ ở đây đánh dấu chuyện KHÔNG CÓ THẬT chứ không phải thời gian đã qua. Lối trang trọng dùng "were" cho mọi ngôi; lối nói thường ngày chấp nhận "was" với I/he/she/it, nhưng cụm khuyên "If I were you" thì gần như luôn giữ "were".'
    },
    signals: ['if', 'would', 'If I were you', 'imagine', 'suppose'],
    useWhen: [
      'Giả định trái với thực tế hiện tại.',
      'Chuyện có thể xảy ra nhưng rất khó, như trúng số.',
      'Khuyên người khác một cách nhã: "If I were you, I would wait."',
      'Nói ước muốn xa vời.'
    ],
    useNot: [
      { what: 'Không đặt "would" vào mệnh đề if.', why: '"If I would have money" sai; đúng là "If I had money".' },
      { what: 'Không dùng khi điều kiện thật sự có khả năng.', why: 'Có khả năng thật thì dùng loại 1: "If I have time, I will help."' }
    ],
    confuse: [
      {
        with: 'câu điều kiện loại 1',
        tell: 'Câu hỏi để chọn: điều kiện này CÓ THỂ xảy ra không? Có thì loại 1, không thì loại 2.',
        pair: [
          { en: 'If I win the lottery, I will buy a house.', vi: 'Nếu trúng số tôi sẽ mua nhà. (tôi có mua vé, có khả năng)' },
          { en: 'If I won the lottery, I would buy a house.', vi: 'Giá mà trúng số thì tôi mua nhà. (chỉ là tưởng tượng)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If I would have more money, I would travel more.', right: 'If I had more money, I would travel more.', why: 'Mệnh đề if không bao giờ có "would".' },
      { wrong: 'If I am you, I would take the job.', right: 'If I were you, I would take the job.', why: 'Cụm khuyên cố định là "If I were you".' }
    ],
    examples: [
      ['If I had more time, I would learn the piano.', 'Giá mà có thời gian thì tôi học piano.', 1, 'Trái với thực tế hiện tại.'],
      ['If I were you, I would apologise.', 'Nếu tôi là bạn thì tôi xin lỗi.', 1, 'Cụm khuyên nhã, giữ "were".'],
      ['She would travel more if she earned more.', 'Kiếm được nhiều hơn thì cô ấy sẽ đi du lịch nhiều hơn.', 1, 'Đảo vế.'],
      ['If we lived closer, we could meet every week.', 'Ở gần nhau thì tuần nào chúng ta cũng gặp được.', 1, 'Dùng "could" thay "would".'],
      ['If I would have more money, I would travel more.', 'Giá mà có nhiều tiền hơn thì tôi đi du lịch nhiều hơn.', 0, 'Sai: sửa thành "If I had more money".'],
      ['If I am you, I would take the job.', 'Nếu tôi là bạn thì tôi nhận việc đó.', 0, 'Sai: sửa thành "If I were you".']
    ],
    practice: [
      ['If I ___ (had / would have) a car, I would drive to work.', 'had', 'Có ô tô thì tôi lái xe đi làm.'],
      ['If I ___ (were / am) you, I would say sorry.', 'were', 'Nếu tôi là bạn thì tôi xin lỗi.'],
      ['She ___ (would move / moved) abroad if she spoke English well.', 'would move', 'Giỏi tiếng Anh thì cô ấy sẽ ra nước ngoài.'],
      ['If he ___ (studied / would study) more, he would get better marks.', 'studied', 'Học nhiều hơn thì anh ấy được điểm cao hơn.'],
      ['We ___ (could go / can go) out if it were not raining.', 'could go', 'Không mưa thì chúng ta ra ngoài được.'],
      ['If they ___ (lived / live) nearer, we would visit them often.', 'lived', 'Họ ở gần hơn thì chúng tôi hay tới thăm.'],
      ['What ___ (would you do / will you do) if you lost your passport?', 'would you do', 'Mất hộ chiếu thì bạn sẽ làm gì?'],
      ['If I ___ (knew / would know) her number, I would call her.', 'knew', 'Biết số của cô ấy thì tôi đã gọi.'],
      ['He would be happier if he ___ (had / has) more free time.', 'had', 'Có nhiều thời gian rảnh hơn thì anh ấy vui hơn.'],
      ['If the flat ___ (were / is) cheaper, we would take it.', 'were', 'Căn hộ rẻ hơn thì chúng tôi thuê.']
    ]
  },

  {
    slug: 'unless-and-conjunctions',
    en: 'unless, as long as, provided that, in case',
    vi: 'unless và các liên từ điều kiện khác',
    level: 'B1',
    summary: 'Bốn cách nói điều kiện ngoài "if". Mỗi cái một sắc thái, và "unless" đã mang sẵn nghĩa phủ định.',
    formula: {
      rows: [
        ['unless', '= if … not: "Unless you hurry, you will be late."'],
        ['as long as / so long as', 'miễn là, đặt điều kiện duy nhất'],
        ['provided (that) / providing', 'với điều kiện là — trang trọng hơn'],
        ['in case', 'phòng khi — KHÔNG phải "nếu"']
      ],
      note: '"in case" khác hẳn "if": "Take an umbrella in case it rains" là mang ô phòng khi mưa (mang trước, chưa biết có mưa không), còn "Take an umbrella if it rains" là lúc nào mưa mới mang.'
    },
    signals: ['unless', 'as long as', 'provided that', 'in case', 'otherwise'],
    useWhen: [
      'unless: nêu ngoại lệ duy nhất khiến điều kia không xảy ra.',
      'as long as: nhấn rằng đó là điều kiện duy nhất.',
      'provided that: văn bản trang trọng, hợp đồng.',
      'in case: chuẩn bị trước cho khả năng có thể xảy ra.'
    ],
    useNot: [
      { what: 'Không dùng phủ định sau "unless".', why: '"Unless you do not hurry" là phủ định hai lần, nghĩa ngược lại ý muốn nói.' },
      { what: 'Không dùng "will" sau các liên từ này.', why: 'Chúng đều theo quy tắc mệnh đề điều kiện: dùng hiện tại đơn.' },
      { what: 'Không lẫn "in case" với "if".', why: '"in case" là làm trước để phòng; "if" là chờ điều kiện xảy ra mới làm.' }
    ],
    confuse: [
      {
        with: 'in case và if',
        tell: '"in case" là hành động phòng bị làm TRƯỚC; "if" là hành động chỉ làm KHI điều kiện xảy ra.',
        pair: [
          { en: 'I will take an umbrella in case it rains.', vi: 'Tôi mang ô phòng khi trời mưa. (mang sẵn từ bây giờ)' },
          { en: 'I will take an umbrella if it rains.', vi: 'Nếu trời mưa thì tôi mới mang ô. (mưa rồi mới mang)' }
        ]
      }
    ],
    errors: [
      { wrong: 'Unless you do not book early, you will not get a seat.', right: 'Unless you book early, you will not get a seat.', why: '"unless" đã mang nghĩa phủ định, thêm "not" là phủ định hai lần.' },
      { wrong: 'I will lend you the money as long as you will pay me back.', right: 'I will lend you the money as long as you pay me back.', why: 'Mệnh đề điều kiện dùng hiện tại đơn.' }
    ],
    examples: [
      ['Unless you leave now, you will miss the train.', 'Không đi ngay là bạn lỡ tàu đấy.', 1, 'unless = if … not.'],
      ['You can borrow my laptop as long as you return it today.', 'Cho mượn máy tính, miễn là hôm nay trả.', 1, 'Điều kiện duy nhất.'],
      ['We will refund the fee provided that you cancel in writing.', 'Chúng tôi hoàn phí với điều kiện quý khách huỷ bằng văn bản.', 1, 'Văn phong trang trọng.'],
      ['Take some cash in case the card machine is broken.', 'Mang ít tiền mặt phòng khi máy quẹt thẻ hỏng.', 1, 'Chuẩn bị trước.'],
      ['Unless you do not book early, you will not get a seat.', 'Không đặt sớm là không có chỗ.', 0, 'Sai: phủ định hai lần. Sửa thành "Unless you book early".'],
      ['I will help you as long as you will ask politely.', 'Tôi giúp, miễn là bạn hỏi cho lịch sự.', 0, 'Sai: bỏ "will". Sửa thành "as long as you ask politely".']
    ],
    practice: [
      ['___ (Unless / If) you hurry, you will be late.', 'Unless', 'Không nhanh lên là muộn đấy.'],
      ['You can stay ___ (as long as / in case) you keep quiet.', 'as long as', 'Bạn ở lại được, miễn là giữ yên lặng.'],
      ['Take a map ___ (in case / if) you get lost.', 'in case', 'Mang theo bản đồ phòng khi lạc.'],
      ['Unless it ___ (rains / will rain), we will play outside.', 'rains', 'Trời không mưa thì chúng ta chơi ngoài sân.'],
      ['I will sign ___ (provided that / in case) the terms are clear.', 'provided that', 'Tôi sẽ ký với điều kiện các điều khoản rõ ràng.'],
      ['Bring a jacket ___ (in case / unless) it gets cold.', 'in case', 'Mang áo khoác phòng khi trời lạnh.'],
      ['___ (Unless / As long as) you pay today, we will hold the room.', 'As long as', 'Miễn là hôm nay bạn thanh toán thì chúng tôi giữ phòng.'],
      ['She will not come ___ (unless / if) you invite her.', 'unless', 'Bạn không mời thì cô ấy không tới.'],
      ['We can start ___ (provided / in case) everyone agrees.', 'provided', 'Chúng ta bắt đầu được với điều kiện mọi người đồng ý.'],
      ['Save your work ___ (in case / unless) the power goes off.', 'in case', 'Lưu bài lại phòng khi mất điện.']
    ]
  },

  {
    slug: 'wish-present',
    en: 'wish / if only about the present',
    vi: 'wish · if only — ước ở hiện tại',
    level: 'B1',
    summary: 'Ước điều trái với thực tế bây giờ. Cũng lùi thì như câu điều kiện loại 2: dùng quá khứ nhưng nói chuyện hiện tại.',
    formula: {
      rows: [
        ['Ước ở hiện tại', 'wish + quá khứ đơn: "I wish I had a car."'],
        ['Với động từ to be', 'wish + were (mọi ngôi): "I wish I were taller."'],
        ['Nhấn mạnh hơn', 'If only + quá khứ đơn'],
        ['Ước có khả năng', 'wish + could + V: "I wish I could come."']
      ],
      note: 'Lùi thì ở đây đánh dấu chuyện không có thật, không phải thời gian quá khứ. "I wish I had a car" nghĩa là bây giờ tôi KHÔNG có ô tô.'
    },
    signals: ['I wish', 'If only', 'I wish I were', 'I wish I could'],
    useWhen: [
      'Ước điều trái với thực tế đang diễn ra.',
      'Tiếc vì mình không có khả năng làm gì: "I wish I could help."',
      '"If only" khi muốn nhấn mạnh cảm xúc nhiều hơn "wish".'
    ],
    useNot: [
      { what: 'Không dùng hiện tại đơn sau wish.', why: '"I wish I have more time" sai; phải lùi thì thành "I wish I had more time".' },
      { what: 'Không dùng "wish + would" cho chính mình.', why: '"I wish I would be taller" sai; "would" sau wish chỉ dùng để phàn nàn về NGƯỜI KHÁC hoặc hoàn cảnh.' }
    ],
    confuse: [
      {
        with: 'wish và hope',
        tell: 'wish nói điều trái thực tế; hope nói điều còn có khả năng xảy ra.',
        pair: [
          { en: 'I wish I had a ticket.', vi: 'Giá mà tôi có vé. (thực tế là không có)' },
          { en: 'I hope I get a ticket.', vi: 'Mong là tôi mua được vé. (vẫn còn cơ hội)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I wish I have more free time.', right: 'I wish I had more free time.', why: 'Sau wish phải lùi thì để đánh dấu chuyện không có thật.' },
      { wrong: 'I wish I can speak Japanese.', right: 'I wish I could speak Japanese.', why: 'can lùi thành could.' }
    ],
    examples: [
      ['I wish I had more free time.', 'Giá mà tôi rảnh hơn.', 1, 'Trái với thực tế bây giờ.'],
      ['I wish I were better at maths.', 'Giá mà tôi giỏi toán hơn.', 1, 'Dùng "were" cho mọi ngôi.'],
      ['If only she lived closer!', 'Giá mà cô ấy ở gần hơn!', 1, '"If only" nhấn cảm xúc.'],
      ['I wish I could come to your wedding.', 'Giá mà tôi dự được đám cưới của bạn.', 1, 'Ước về khả năng.'],
      ['I wish I have more free time.', 'Giá mà tôi rảnh hơn.', 0, 'Sai: sửa thành "I wish I had more free time."'],
      ['I wish I can speak Japanese.', 'Giá mà tôi nói được tiếng Nhật.', 0, 'Sai: sửa thành "I wish I could speak Japanese."']
    ],
    practice: [
      ['I wish I ___ (knew / know) the answer.', 'knew', 'Giá mà tôi biết đáp án.'],
      ['I wish she ___ (were / is) here right now.', 'were', 'Giá mà giờ này cô ấy ở đây.'],
      ['If only I ___ (had / have) a bigger flat!', 'had', 'Giá mà tôi có căn hộ rộng hơn!'],
      ['I wish I ___ (could / can) play the guitar.', 'could', 'Giá mà tôi chơi được ghi-ta.'],
      ['He wishes he ___ (lived / lives) nearer his family.', 'lived', 'Anh ấy ước gì được sống gần gia đình hơn.'],
      ['I ___ (hope / wish) you have a great trip!', 'hope', 'Chúc bạn có chuyến đi vui vẻ!'],
      ['I ___ (wish / hope) I were taller.', 'wish', 'Giá mà tôi cao hơn.'],
      ['If only it ___ (were not / is not) so hot today.', 'were not', 'Giá mà hôm nay đừng nóng thế.'],
      ['She wishes she ___ (did not have / does not have) to work weekends.', 'did not have', 'Cô ấy ước gì không phải làm cuối tuần.'],
      ['I wish my neighbours ___ (were / are) quieter.', 'were', 'Giá mà hàng xóm nhà tôi yên tĩnh hơn.']
    ]
  },

  {
    slug: 'conditional-first-variants',
    en: 'Variants of the first conditional',
    vi: 'Biến thể của câu điều kiện loại 1',
    level: 'B1',
    summary: 'Vế kết quả không nhất thiết phải là "will". Thay bằng mệnh lệnh, can, may, might hay should là đổi hẳn sắc thái.',
    formula: {
      rows: [
        ['Mệnh lệnh', 'If + hiện tại đơn, mệnh lệnh: "If you see him, tell him."'],
        ['Cho phép, khả năng', 'If …, you can / you may …'],
        ['Bớt chắc chắn', 'If …, it might / it may …'],
        ['Điều kiện ít khả năng hơn', 'If + should + V: "If you should need help, call me."']
      ],
      note: '"If you should…" (hoặc "Should you…") nghĩa là nếu chẳng may, xác suất thấp hơn "if" thường, và nghe trang trọng. Hay gặp trong thư từ công việc.'
    },
    signals: ['If you see', 'you can', 'you may', 'it might', 'If you should', 'Should you'],
    useWhen: [
      'Dặn dò kèm điều kiện, dùng mệnh lệnh ở vế sau.',
      'Cho phép có điều kiện.',
      'Nói hệ quả không chắc chắn.',
      '"If … should" khi điều kiện ít khả năng hoặc muốn nghe nhã hơn.'
    ],
    useNot: [
      { what: 'Vẫn không được đặt "will" vào mệnh đề if.', why: 'Đổi vế kết quả không đổi quy tắc của vế điều kiện.' },
      { what: 'Không dùng "would" ở vế kết quả nếu điều kiện là có thật.', why: '"would" kéo câu sang loại 2, tức là giả định.' }
    ],
    confuse: [
      {
        with: 'will và might ở vế kết quả',
        tell: 'will là chắc chắn xảy ra; might là có thể xảy ra.',
        pair: [
          { en: 'If you take this road, you will arrive faster.', vi: 'Đi đường này thì bạn tới nhanh hơn. (chắc chắn)' },
          { en: 'If you take this road, you might avoid the traffic.', vi: 'Đi đường này biết đâu tránh được tắc. (không chắc)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If you will see Lan, give her this book.', right: 'If you see Lan, give her this book.', why: 'Đổi vế sau thành mệnh lệnh nhưng mệnh đề if vẫn dùng hiện tại đơn.' },
      { wrong: 'If you finish early, you would leave.', right: 'If you finish early, you can leave.', why: 'Điều kiện có thật thì vế sau không dùng "would".' }
    ],
    examples: [
      ['If you see Lan, give her this book.', 'Gặp Lan thì đưa cô ấy cuốn sách này.', 1, 'Vế sau là mệnh lệnh.'],
      ['If you finish early, you can go home.', 'Xong sớm thì bạn về được.', 1, 'Cho phép có điều kiện.'],
      ['If we leave now, we might catch the early train.', 'Đi bây giờ biết đâu kịp chuyến tàu sớm.', 1, 'Hệ quả không chắc.'],
      ['If you should need any help, please call me.', 'Nếu chẳng may anh cần giúp gì, cứ gọi tôi.', 1, 'Xác suất thấp, nghe nhã.'],
      ['If you will see Lan, give her this book.', 'Gặp Lan thì đưa cô ấy cuốn sách này.', 0, 'Sai: sửa thành "If you see Lan".'],
      ['If you finish early, you would leave.', 'Xong sớm thì bạn về được.', 0, 'Sai: điều kiện có thật nên dùng "can". Sửa thành "you can leave".']
    ],
    practice: [
      ['If you ___ (need / will need) anything, just ask.', 'need', 'Cần gì thì cứ hỏi.'],
      ['If it gets cold, you ___ (can / would) use this blanket.', 'can', 'Lạnh thì bạn dùng cái chăn này.'],
      ['If you see him, ___ (tell / you will tell) him to call me.', 'tell', 'Gặp anh ấy thì bảo gọi cho tôi.'],
      ['If we hurry, we ___ (might / would) still make it.', 'might', 'Nhanh lên biết đâu vẫn kịp.'],
      ['___ (Should / Will) you have any questions, contact our office.', 'Should', 'Nếu quý khách có thắc mắc, xin liên hệ văn phòng.'],
      ['If the shop is open, ___ (buy / you would buy) some bread.', 'buy', 'Cửa hàng mở thì mua ít bánh mì.'],
      ['If you take the bus, you ___ (may / would) save money.', 'may', 'Đi xe buýt thì có thể tiết kiệm được tiền.'],
      ['If it ___ (starts / will start) raining, close the windows.', 'starts', 'Bắt đầu mưa thì đóng cửa sổ lại.'],
      ['If you are tired, ___ (take / you took) a break.', 'take', 'Mệt thì nghỉ một lát.'],
      ['If she ___ (calls / will call), you can give her my number.', 'calls', 'Cô ấy gọi thì bạn cho số của tôi.']
    ]
  },

  /* ==================== B2 ==================== */

  {
    slug: 'conditional-third',
    en: 'Third conditional',
    vi: 'Câu điều kiện loại 3 — trái với quá khứ',
    level: 'B2',
    summary: 'Tiếc nuối chuyện đã rồi: nếu quá khứ khác đi thì kết quả đã khác. Cả hai vế đều nói điều KHÔNG xảy ra.',
    formula: {
      rows: [
        ['Công thức', 'If + had + V3, would have + V3'],
        ['Thay would', 'could have / might have + V3'],
        ['Rút gọn', "If I'd known… · I would've called…"],
        ['Phủ định', 'If … had not …, … would not have …']
      ],
      note: 'Câu loại 3 luôn ngầm nói điều ngược lại đã xảy ra: "If I had known, I would have called" nghĩa là tôi KHÔNG biết nên tôi ĐÃ KHÔNG gọi.'
    },
    signals: ['If I had known', 'would have', 'could have', 'might have', 'otherwise'],
    useWhen: [
      'Tiếc nuối hoặc trách về chuyện đã qua.',
      'Giải thích vì sao mọi việc không diễn ra như mong muốn.',
      'Nói suýt gặp nguy: "If he had not braked, there would have been a crash."'
    ],
    useNot: [
      { what: 'Không đặt "would" vào mệnh đề if.', why: '"If I would have known" là lỗi rất nặng; đúng là "If I had known".' },
      { what: 'Không viết "would of have".', why: 'Luôn là "would have", rút gọn "would\'ve".' }
    ],
    confuse: [
      {
        with: 'câu điều kiện loại 2',
        tell: 'Loại 2 trái với hiện tại; loại 3 trái với quá khứ. Nhìn "had + V3" trong mệnh đề if là biết loại 3.',
        pair: [
          { en: 'If I knew her number, I would call her.', vi: 'Biết số cô ấy thì tôi gọi. (bây giờ tôi không biết)' },
          { en: 'If I had known her number, I would have called her.', vi: 'Giá mà lúc đó tôi biết số cô ấy thì tôi đã gọi. (chuyện đã rồi)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If I would have known, I would have told you.', right: 'If I had known, I would have told you.', why: 'Mệnh đề if của loại 3 dùng "had + V3", không dùng "would".' },
      { wrong: 'If she had studied, she would pass the exam.', right: 'If she had studied, she would have passed the exam.', why: 'Cả hai vế đều nói về quá khứ nên vế sau cần "would have + V3".' }
    ],
    examples: [
      ['If I had left earlier, I would have caught the train.', 'Giá mà tôi đi sớm hơn thì đã kịp tàu.', 1, 'Tiếc chuyện đã rồi.'],
      ['She would have passed if she had revised.', 'Cô ấy đã đỗ nếu chịu ôn bài.', 1, 'Đảo vế.'],
      ['If we had not booked, we could have missed out.', 'Không đặt trước thì có khi chúng ta đã lỡ mất.', 1, 'Dùng "could have".'],
      ['If he had not braked, there would have been an accident.', 'Anh ấy mà không phanh thì đã có tai nạn.', 1, 'Suýt gặp nguy.'],
      ['If I would have known, I would have told you.', 'Giá mà tôi biết thì đã nói với bạn.', 0, 'Sai: sửa thành "If I had known".'],
      ['If she had studied, she would pass the exam.', 'Chịu ôn bài thì cô ấy đã đỗ.', 0, 'Sai: sửa thành "she would have passed the exam".']
    ],
    practice: [
      ['If I ___ (had known / would have known), I would have helped.', 'had known', 'Biết thì tôi đã giúp.'],
      ['She would have come if you ___ (had invited / invited) her.', 'had invited', 'Bạn mời thì cô ấy đã tới.'],
      ['If they had left earlier, they ___ (would have arrived / would arrive) on time.', 'would have arrived', 'Đi sớm hơn thì họ đã tới kịp.'],
      ['We ___ (could have won / could win) if the referee had been fair.', 'could have won', 'Trọng tài công bằng thì chúng tôi đã thắng.'],
      ['If it ___ (had not rained / did not rain), we would have gone hiking.', 'had not rained', 'Không mưa thì chúng tôi đã đi leo núi.'],
      ['He would not have failed if he ___ (had worked / worked) harder.', 'had worked', 'Chăm hơn thì anh ấy đã không trượt.'],
      ['If I ___ (had had / had) more money, I would have bought it.', 'had had', 'Có nhiều tiền hơn thì tôi đã mua rồi.'],
      ['They ___ (might have stayed / might stay) if the hotel had been cheaper.', 'might have stayed', 'Khách sạn rẻ hơn thì có khi họ đã ở lại.'],
      ['If you had told me, I ___ (would have waited / would wait).', 'would have waited', 'Bạn báo thì tôi đã đợi.'],
      ['If the shop ___ (had been / was) open, I would have bought bread.', 'had been', 'Cửa hàng mà mở thì tôi đã mua bánh mì.']
    ]
  },

  {
    slug: 'wish-past',
    en: 'wish about the past and wish + would',
    vi: 'wish về quá khứ và wish + would',
    level: 'B2',
    summary: 'Tiếc chuyện đã rồi thì lùi thêm một bậc thành quá khứ hoàn thành. Riêng "wish + would" là để phàn nàn, không phải để ước.',
    formula: {
      rows: [
        ['Tiếc quá khứ', 'wish + had + V3: "I wish I had studied."'],
        ['Phàn nàn về người khác', 'wish + would + V: "I wish he would listen."'],
        ['Phàn nàn về hoàn cảnh', 'I wish it would stop raining.'],
        ['Không dùng cho chính mình', 'KHÔNG nói "I wish I would…"']
      ],
      note: '"wish + would" luôn hàm ý bực bội và mong người khác đổi hành vi. Vì thế không dùng cho chính mình — mình muốn đổi thì tự đổi, không cần ước.'
    },
    signals: ['I wish I had', 'If only I had', 'I wish he would', 'I wish it would'],
    useWhen: [
      'Tiếc một việc mình đã làm hoặc đã không làm trong quá khứ.',
      'Phàn nàn về thói quen khó chịu của người khác.',
      'Mong một hoàn cảnh khó chịu chấm dứt.'
    ],
    useNot: [
      { what: 'Không dùng quá khứ đơn khi tiếc chuyện đã rồi.', why: '"I wish I studied harder last year" nói về hiện tại; tiếc quá khứ phải là "I wish I had studied harder".' },
      { what: 'Không dùng "I wish I would".', why: 'Sai vì "would" hàm ý mong người khác đổi; nói về mình thì dùng "I wish I could" hoặc "I wish I had".' }
    ],
    confuse: [
      {
        with: 'wish ở hiện tại và wish ở quá khứ',
        tell: 'Một bậc lùi là hiện tại, hai bậc lùi là quá khứ.',
        pair: [
          { en: 'I wish I spoke French.', vi: 'Giá mà tôi nói được tiếng Pháp. (bây giờ không nói được)' },
          { en: 'I wish I had studied French at school.', vi: 'Giá mà hồi đi học tôi đã học tiếng Pháp. (chuyện đã rồi)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I wish I studied harder when I was at school.', right: 'I wish I had studied harder when I was at school.', why: 'Tiếc chuyện quá khứ nên phải lùi hai bậc.' },
      { wrong: 'I wish I would be more organised.', right: 'I wish I were more organised.', why: 'Không dùng "wish + would" cho chính mình.' }
    ],
    examples: [
      ['I wish I had taken that job.', 'Giá mà hồi đó tôi nhận công việc ấy.', 1, 'Tiếc chuyện đã rồi.'],
      ['If only we had booked earlier!', 'Giá mà chúng ta đặt sớm hơn!', 1, '"If only" nhấn mạnh.'],
      ['I wish my neighbour would turn the music down.', 'Ước gì hàng xóm vặn nhỏ nhạc lại.', 1, 'Phàn nàn về người khác.'],
      ['I wish it would stop raining.', 'Ước gì trời tạnh mưa đi.', 1, 'Phàn nàn về hoàn cảnh.'],
      ['I wish I studied harder when I was at school.', 'Giá mà hồi đi học tôi chăm hơn.', 0, 'Sai: sửa thành "I wish I had studied harder".'],
      ['I wish I would be more patient.', 'Ước gì tôi kiên nhẫn hơn.', 0, 'Sai: sửa thành "I wish I were more patient."']
    ],
    practice: [
      ['I wish I ___ (had listened / listened) to your advice last week.', 'had listened', 'Giá mà tuần trước tôi nghe lời khuyên của bạn.'],
      ['I wish he ___ (would stop / stopped) interrupting me.', 'would stop', 'Ước gì anh ta thôi ngắt lời tôi.'],
      ['If only I ___ (had known / knew) about the discount yesterday.', 'had known', 'Giá mà hôm qua tôi biết có giảm giá.'],
      ['I wish I ___ (were / would be) more confident.', 'were', 'Giá mà tôi tự tin hơn.'],
      ['She wishes she ___ (had not sold / did not sell) her old car.', 'had not sold', 'Cô ấy tiếc vì đã bán chiếc xe cũ.'],
      ['I wish the bus ___ (would come / came) soon.', 'would come', 'Ước gì xe buýt tới nhanh lên.'],
      ['I wish I ___ (had brought / brought) an umbrella this morning.', 'had brought', 'Giá mà sáng nay tôi mang ô.'],
      ['They wish they ___ (had chosen / chose) a different hotel.', 'had chosen', 'Họ tiếc vì đã không chọn khách sạn khác.'],
      ['I wish you ___ (would tell / told) me the truth from the start.', 'would tell', 'Ước gì bạn nói thật với tôi ngay từ đầu.'],
      ['If only she ___ (had not left / did not leave) so early.', 'had not left', 'Giá mà cô ấy đừng về sớm thế.']
    ]
  },

  {
    slug: 'mixed-conditionals',
    en: 'Mixed conditionals',
    vi: 'Câu điều kiện hỗn hợp',
    level: 'B2',
    summary: 'Hai vế ở hai mốc thời gian khác nhau. Rất hay gặp trong đời thật vì hậu quả của quá khứ thường kéo dài tới hiện tại.',
    formula: {
      rows: [
        ['Quá khứ → hiện tại', 'If + had + V3, would + V: "If I had saved, I would be rich now."'],
        ['Hiện tại → quá khứ', 'If + quá khứ đơn, would have + V3: "If I were braver, I would have asked."'],
        ['Dấu hiệu', 'thường có "now", "today" hoặc "at that time" để chỉ rõ mốc'],
        ['Vẫn giữ quy tắc', 'mệnh đề if không bao giờ có "would"']
      ],
      note: 'Cách nhận ra: nhìn từng vế riêng. Vế nào nói chuyện quá khứ thì lùi hai bậc, vế nào nói chuyện hiện tại thì lùi một bậc. Ghép lại là ra câu hỗn hợp.'
    },
    signals: ['now', 'today', 'still', 'at that time', 'these days'],
    useWhen: [
      'Hậu quả hiện tại của một việc trong quá khứ.',
      'Tính cách hoặc hoàn cảnh hiện tại giải thích một hành động trong quá khứ.',
      'Nói về tiếc nuối mà ảnh hưởng vẫn còn.'
    ],
    useNot: [
      { what: 'Không ép cả hai vế về cùng một loại.', why: 'Nếu hai mốc thời gian khác nhau thật thì ép về loại 3 sẽ sai nghĩa.' },
      { what: 'Vẫn không đặt "would" vào mệnh đề if.', why: 'Quy tắc này không có ngoại lệ ở bất kỳ loại nào.' }
    ],
    confuse: [
      {
        with: 'câu điều kiện loại 3 thuần',
        tell: 'Loại 3 thuần thì cả hai vế đều ở quá khứ. Có chữ "now" ở vế kết quả là dấu hiệu câu hỗn hợp.',
        pair: [
          { en: 'If I had studied medicine, I would have become a doctor.', vi: 'Giá mà tôi học y thì tôi đã thành bác sĩ. (cả hai vế quá khứ)' },
          { en: 'If I had studied medicine, I would be a doctor now.', vi: 'Giá mà tôi học y thì giờ tôi đã là bác sĩ. (kết quả ở hiện tại)' }
        ]
      }
    ],
    errors: [
      { wrong: 'If I had taken that job, I would have been happier now.', right: 'If I had taken that job, I would be happier now.', why: 'Có "now" nên vế kết quả nói hiện tại, dùng "would + V".' },
      { wrong: 'If I would be more careful, I would not have broken it.', right: 'If I were more careful, I would not have broken it.', why: 'Mệnh đề if không dùng "would".' }
    ],
    examples: [
      ['If I had saved more, I would have my own flat now.', 'Giá mà tôi tiết kiệm nhiều hơn thì giờ đã có căn hộ riêng.', 1, 'Quá khứ dẫn tới kết quả hiện tại.'],
      ['If she were more patient, she would not have quit last year.', 'Nếu cô ấy kiên nhẫn hơn thì năm ngoái đã không nghỉ việc.', 1, 'Tính cách hiện tại giải thích hành động quá khứ.'],
      ['If he had not missed the flight, he would be in Tokyo today.', 'Không lỡ chuyến bay thì hôm nay anh ấy đã ở Tokyo.', 1, 'Có "today" chỉ rõ mốc hiện tại.'],
      ['If I spoke Korean, I would have applied for that job.', 'Nếu tôi biết tiếng Hàn thì tôi đã nộp đơn việc đó.', 1, 'Hiện tại dẫn tới hành động quá khứ.'],
      ['If I had taken that job, I would have been happier now.', 'Giá mà nhận việc đó thì giờ tôi đã vui hơn.', 0, 'Sai: có "now" nên sửa thành "I would be happier now".'],
      ['If I would be more careful, I would not have broken it.', 'Nếu tôi cẩn thận hơn thì đã không làm vỡ.', 0, 'Sai: sửa thành "If I were more careful".']
    ],
    practice: [
      ['If I had gone to bed earlier, I ___ (would not be / would not have been) so tired now.', 'would not be', 'Ngủ sớm hơn thì giờ tôi đã không mệt thế này.'],
      ['If she ___ (were / had been) taller, she would have joined the team.', 'were', 'Nếu cô ấy cao hơn thì đã vào đội rồi.'],
      ['If they had invested then, they ___ (would be / would have been) wealthy today.', 'would be', 'Đầu tư hồi đó thì hôm nay họ đã giàu.'],
      ['If I ___ (had learnt / learnt) to drive, I would have my own car.', 'had learnt', 'Giá mà tôi học lái thì đã có ô tô riêng.'],
      ['If he were not so shy, he ___ (would have spoken / would speak) at the meeting yesterday.', 'would have spoken', 'Không nhút nhát thế thì hôm qua anh ấy đã phát biểu.'],
      ['If we had bought the house, we ___ (would not be / would not have been) renting now.', 'would not be', 'Mua nhà rồi thì giờ đâu phải đi thuê.'],
      ['If I ___ (knew / had known) more about cars, I would have fixed it myself.', 'knew', 'Nếu tôi rành xe hơn thì đã tự sửa.'],
      ['If she had studied harder, she ___ (would have / would have had) a better job now.', 'would have', 'Học chăm hơn thì giờ cô ấy đã có việc tốt hơn.'],
      ['If you were not so busy, you ___ (would have come / would come) with us last week.', 'would have come', 'Không bận thế thì tuần trước bạn đã đi cùng chúng tôi.'],
      ['If they had told us, we ___ (would be / would have been) there now.', 'would be', 'Họ báo thì giờ chúng tôi đã có mặt ở đó.']
    ]
  },

  {
    slug: 'would-rather-its-time',
    en: "would rather / it's time + past subjunctive",
    vi: "would rather · it's time — thức giả định",
    level: 'B2',
    summary: 'Hai cấu trúc dùng quá khứ để nói chuyện hiện tại hoặc tương lai, giống hệt cơ chế của câu điều kiện loại 2.',
    formula: {
      rows: [
        ['Muốn người khác làm gì', 'would rather + S + quá khứ đơn: "I would rather you left."'],
        ['Chính mình làm', 'would rather + V(trần): "I would rather stay."'],
        ['Đến lúc rồi', "It's time + S + quá khứ đơn: \"It's time we left.\""],
        ['Nhấn mạnh hơn', "It's high time / about time + quá khứ đơn"]
      ],
      note: 'Cả hai dùng quá khứ để nói chuyện HIỆN TẠI. "It\'s time we left" nghĩa là bây giờ nên đi rồi, không phải chuyện đã qua. Muốn nói chính mình thì "would rather" đi với động từ trần, không lùi thì.'
    },
    signals: ["would rather", "It's time", "It's high time", 'about time', 'would sooner'],
    useWhen: [
      'Nói mình muốn người khác làm hoặc đừng làm gì đó.',
      'Nhắc rằng đã đến lúc phải làm gì, thường kèm chút sốt ruột.',
      '"It\'s high time" khi muốn trách nhẹ vì việc đó lẽ ra phải làm từ lâu.'
    ],
    useNot: [
      { what: 'Không dùng nguyên thể khi "would rather" nói về người khác.', why: '"I would rather you go" ít chuẩn; dạng chuẩn là "I would rather you went".' },
      { what: "Không dùng hiện tại sau \"It's time\" + chủ ngữ.", why: '"It\'s time we go" sai; đúng là "It\'s time we went" hoặc "It\'s time to go".' }
    ],
    confuse: [
      {
        with: "It's time to go và It's time we went",
        tell: 'Có chủ ngữ thì phải lùi thì; không có chủ ngữ thì dùng "to + V".',
        pair: [
          { en: "It's time to go.", vi: 'Đến giờ đi rồi. (nói chung)' },
          { en: "It's time we went.", vi: 'Đến lúc chúng ta phải đi rồi. (nêu rõ ai)' }
        ]
      }
    ],
    errors: [
      { wrong: 'I would rather you come tomorrow.', right: 'I would rather you came tomorrow.', why: 'Nói về người khác thì lùi thì.' },
      { wrong: "It's time we go home.", right: "It's time we went home.", why: 'Sau "It\'s time + chủ ngữ" phải dùng quá khứ đơn.' }
    ],
    examples: [
      ['I would rather you did not smoke in here.', 'Tôi muốn bạn đừng hút thuốc trong này.', 1, 'Nói về người khác nên lùi thì.'],
      ['I would rather stay at home tonight.', 'Tối nay tôi thà ở nhà.', 1, 'Nói về chính mình nên dùng động từ trần.'],
      ["It's time we left — the train goes at six.", 'Đến lúc đi rồi, sáu giờ tàu chạy.', 1, 'Quá khứ nhưng nói chuyện bây giờ.'],
      ["It's high time you told her the truth.", 'Đã đến lúc bạn phải nói thật với cô ấy rồi đấy.', 1, 'Trách nhẹ vì lẽ ra phải làm từ lâu.'],
      ['I would rather you come tomorrow.', 'Tôi muốn bạn tới vào ngày mai hơn.', 0, 'Sai: sửa thành "I would rather you came tomorrow."'],
      ["It's time we go home.", 'Đến lúc chúng ta về rồi.', 0, 'Sai: sửa thành "It\'s time we went home."']
    ],
    practice: [
      ['I would rather you ___ (told / tell) me the truth.', 'told', 'Tôi muốn bạn nói thật với tôi hơn.'],
      ['I would rather ___ (walk / walked) than take a taxi.', 'walk', 'Tôi thà đi bộ còn hơn bắt taxi.'],
      ["It's time we ___ (started / start) the meeting.", 'started', 'Đến lúc bắt đầu cuộc họp rồi.'],
      ["It's high time she ___ (found / finds) a new job.", 'found', 'Đã đến lúc cô ấy phải tìm việc mới.'],
      ['I would rather he ___ (did not / does not) know about this.', 'did not', 'Tôi không muốn anh ấy biết chuyện này.'],
      ["It's time ___ (to go / we go) — we are already late.", 'to go', 'Đến giờ đi rồi, chúng ta muộn rồi đấy.'],
      ['She would rather ___ (work / worked) from home.', 'work', 'Cô ấy thích làm việc ở nhà hơn.'],
      ["It's about time you ___ (apologised / apologise).", 'apologised', 'Đã đến lúc bạn nên xin lỗi rồi.'],
      ['I would rather you ___ (did not call / do not call) after ten.', 'did not call', 'Tôi mong bạn đừng gọi sau mười giờ.'],
      ["It's time the government ___ (acted / acts) on this issue.", 'acted', 'Đã đến lúc nhà nước phải hành động về vấn đề này.']
    ]
  },

  {
    slug: 'conditional-alternatives',
    en: 'Other ways to express a condition',
    vi: 'Các cách nói điều kiện khác ngoài "if"',
    level: 'B2',
    summary: 'Thay "if" bằng supposing, what if, imagine hoặc dùng "otherwise" để nói hệ quả ngược lại. Câu văn đa dạng hơn hẳn.',
    formula: {
      rows: [
        ['Đặt giả thiết', 'Supposing / Suppose / Imagine + mệnh đề'],
        ['Hỏi giả thiết', 'What if + hiện tại đơn (hoặc quá khứ đơn nếu xa thực tế)'],
        ['Hệ quả ngược lại', 'otherwise / or else = nếu không thì'],
        ['Điều kiện kèm mong đợi', 'in the event of + danh từ (trang trọng)']
      ],
      note: '"otherwise" đứng ở câu sau và nhìn ngược lại điều vừa nói: "Write it down; otherwise you will forget" tương đương "If you do not write it down, you will forget".'
    },
    signals: ['supposing', 'suppose', 'what if', 'imagine', 'otherwise', 'or else'],
    useWhen: [
      'Mở một tình huống giả định trong hội thoại.',
      'Hỏi ý người khác về một khả năng: "What if it rains?"',
      'Cảnh báo hệ quả nếu không làm theo: "Hurry up, otherwise we will be late."',
      'Văn bản trang trọng: "In the event of fire, use the stairs."'
    ],
    useNot: [
      { what: 'Không dùng "otherwise" ngay sau "if".', why: 'Hai cái thay nhau chứ không đi cùng: "If you do not hurry, otherwise…" là thừa.' },
      { what: 'Không thêm "will" sau supposing và what if.', why: 'Chúng theo cùng quy tắc mệnh đề điều kiện.' }
    ],
    confuse: [
      {
        with: 'if not và otherwise',
        tell: 'Cùng nghĩa nhưng khác vị trí: "if not" mở mệnh đề điều kiện; "otherwise" đứng ở vế hệ quả, thường sau dấu chấm phẩy.',
        pair: [
          { en: 'If you do not book now, you will lose the seat.', vi: 'Không đặt ngay là mất chỗ.' },
          { en: 'Book now; otherwise you will lose the seat.', vi: 'Đặt ngay đi, không thì mất chỗ.' }
        ]
      }
    ],
    errors: [
      { wrong: 'Supposing it will rain, what will we do?', right: 'Supposing it rains, what will we do?', why: 'Mệnh đề điều kiện dùng hiện tại đơn.' },
      { wrong: 'If you do not leave now, otherwise you will be late.', right: 'Leave now; otherwise you will be late.', why: '"if not" và "otherwise" thay nhau, không dùng cùng lúc.' }
    ],
    examples: [
      ['Supposing you lost your job, what would you do?', 'Giả sử bạn mất việc thì bạn sẽ làm gì?', 1, 'Giả thiết xa thực tế nên lùi thì.'],
      ['What if the flight is delayed?', 'Nhỡ chuyến bay bị hoãn thì sao?', 1, 'Hỏi về khả năng có thật.'],
      ['Write it down; otherwise you will forget.', 'Ghi lại đi, không là quên đấy.', 1, '"otherwise" ở vế hệ quả.'],
      ['In the event of fire, use the stairs.', 'Trong trường hợp có hoả hoạn, dùng cầu thang bộ.', 1, 'Văn bản trang trọng.'],
      ['Supposing it will rain, what will we do?', 'Giả sử trời mưa thì chúng ta làm gì?', 0, 'Sai: sửa thành "Supposing it rains".'],
      ['If you do not leave now, otherwise you will be late.', 'Không đi ngay thì bạn sẽ muộn.', 0, 'Sai: thừa. Sửa thành "Leave now; otherwise you will be late."']
    ],
    practice: [
      ['___ (Supposing / If not) you won the prize, how would you feel?', 'Supposing', 'Giả sử bạn trúng giải thì bạn thấy sao?'],
      ['Hurry up, ___ (otherwise / unless) we will miss the film.', 'otherwise', 'Nhanh lên không là lỡ phim.'],
      ['What if she ___ (says / will say) no?', 'says', 'Nhỡ cô ấy nói không thì sao?'],
      ['Take a jumper, ___ (or else / in case of) you will be cold.', 'or else', 'Mang áo len đi không là lạnh đấy.'],
      ['___ (Imagine / In case) you had a year off — where would you go?', 'Imagine', 'Thử tưởng tượng bạn được nghỉ một năm, bạn sẽ đi đâu?'],
      ['In the event ___ (of / that) cancellation, we will refund you.', 'of', 'Trong trường hợp huỷ, chúng tôi sẽ hoàn tiền.'],
      ['Suppose it ___ (rains / will rain) tomorrow — do we still go?', 'rains', 'Giả sử mai mưa thì chúng ta vẫn đi chứ?'],
      ['Leave now; ___ (otherwise / unless) you will hit the traffic.', 'otherwise', 'Đi ngay đi không là gặp tắc đường.'],
      ['What ___ (would happen / will happen) if everyone stopped driving?', 'would happen', 'Chuyện gì xảy ra nếu ai cũng thôi lái xe?'],
      ['Save the file, ___ (or else / provided that) you will lose your work.', 'or else', 'Lưu tệp lại không là mất hết công.']
    ]
  }
];

/** Điểm ngữ pháp — nhóm câu điều kiện và giả định bậc A2–B2. */
function points() {
  return POINTS.map((p, i) => ({
    slug: p.slug,
    name_en: p.en,
    name_vi: p.vi,
    grp: 'conditional',
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
