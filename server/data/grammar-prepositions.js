/**
 * Ngữ pháp — nhóm GIỚI TỪ và CỤM GIỚI TỪ, phần bậc A1–A2.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Hạn mức của nhóm theo bảng phân bậc trong docs/LEARNING.md là 35 điểm:
 * A1 6 · A2 7 · B1 7 · B2 6 · C1 5 · C2 4. Tệp này dùng 13 điểm đầu (A1 6,
 * A2 7); phần B1 trở lên nằm ở tệp riêng, giống cách các nhóm khác chia.
 *
 * Vì sao nhóm này đáng có mặt, và vì sao nó khó với người Việt hơn các nhóm
 * khác: giới từ tiếng Anh gần như không dịch được một-đối-một. Tiếng Việt dùng
 * "ở" cho cả *at the door*, *on the table* và *in the box*; dùng "trong" cho cả
 * *in July* và *during the meeting*. Nên lỗi ở đây không phải lỗi quên quy tắc
 * mà là lỗi dịch thẳng — và cách chữa duy nhất là học theo CỤM, không học theo
 * từ. Mọi điểm dưới đây vì thế đều dựng quanh một cặp dễ lẫn cụ thể chứ không
 * liệt kê giới từ.
 *
 * Ghi chú tránh trùng: giới từ đi với *which* và *whom* thuộc nhóm mệnh đề
 * (`relative-preposition`, bậc B2) — ở đây không bàn mệnh đề quan hệ. Cách
 * dựng so sánh thuộc nhóm tính từ và trạng từ. Mức trang trọng của cụm giới từ
 * trong thư tín thuộc nhóm sắc thái.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  {
    slug: 'prep-time-at-on-in',
    en: 'at, on, in for time',
    vi: 'at, on, in cho thời gian — giờ, ngày, tháng',
    level: 'A1',
    summary: 'Ba giới từ thời gian cơ bản, chia theo ĐỘ DÀI của khoảng thời gian: điểm giờ dùng at, trọn một ngày dùng on, khoảng dài hơn một ngày dùng in.',
    formula: {
      rows: [
        ['at + giờ, thời điểm', 'at 7 o\'clock · at noon · at night · at the weekend'],
        ['on + ngày, thứ, ngày tháng', 'on Monday · on 5 May · on my birthday'],
        ['in + tháng, mùa, năm, buổi', 'in July · in summer · in 2026 · in the morning'],
        ['Không có giới từ', 'today · tomorrow · yesterday · next week · last year'],
        ['Mẹo nhớ độ dài', 'at < on < in — càng dài càng dùng từ sau.']
      ],
      note: 'Cái bẫy lớn nhất là "in the morning" nhưng "at night". Không có lý do ngữ pháp nào cả, đây là thói quen dùng của tiếng Anh và phải nhớ như một cụm. Tương tự "at the weekend" (Anh-Anh) và "on the weekend" (Anh-Mỹ) — cả hai đều được chấp nhận.'
    },
    signals: ['giờ cụ thể đi với at', 'tên thứ hoặc ngày tháng đi với on', 'tháng, mùa, năm đi với in'],
    useWhen: [
      'Hẹn giờ trong email công việc: "The meeting is at 9 on Monday."',
      'Nói về lịch trình: "The course starts in September."',
      'Kể thói quen hằng ngày: "I study in the evening."'
    ],
    useNot: [
      { what: 'Không dùng giới từ trước today, tomorrow, next, last, this.', why: '"on tomorrow" sai. Những từ này tự nó đã là trạng ngữ thời gian: "See you tomorrow."' },
      { what: 'Không dùng in với một ngày cụ thể.', why: '"in Monday" sai. Trọn một ngày thì dùng on: "on Monday".' }
    ],
    confuse: [
      {
        with: 'in the morning khác at night',
        tell: 'Ba buổi morning, afternoon, evening đều đi với in. Riêng night đi với at. Học "at night" như một cụm chứ đừng suy từ quy tắc.',
        pair: [
          { en: 'I read in the evening.', vi: 'Tôi đọc sách vào buổi tối.' },
          { en: 'I read at night.', vi: 'Tôi đọc sách vào ban đêm.' }
        ]
      }
    ],
    errors: [
      { wrong: 'The meeting is in Monday.', right: 'The meeting is on Monday.', why: 'Tên thứ là trọn một ngày nên dùng on.' },
      { wrong: 'I will call you on tomorrow.', right: 'I will call you tomorrow.', why: 'tomorrow không đi với giới từ.' }
    ],
    examples: [
      ['The train leaves at 6.15.', 'Tàu chạy lúc 6 giờ 15.', 1, 'Giờ cụ thể đi với at.'],
      ['We have a test on Friday.', 'Chúng tôi có bài kiểm tra vào thứ Sáu.', 1, 'Tên thứ đi với on.'],
      ['She was born in 1998.', 'Cô ấy sinh năm 1998.', 1, 'Năm đi với in.'],
      ['I do not work at night.', 'Tôi không làm việc vào ban đêm.', 1, 'night là ngoại lệ, đi với at.'],
      ['The meeting is in Monday.', 'Cuộc họp vào thứ Hai.', 0, 'Sai: sửa thành "on Monday".'],
      ['I will call you on tomorrow.', 'Tôi sẽ gọi bạn vào ngày mai.', 0, 'Sai: sửa thành "I will call you tomorrow." — bỏ giới từ.']
    ],
    practice: [
      ['The shop opens ___ (at / in) 8 o\'clock.', 'at', 'Cửa hàng mở cửa lúc 8 giờ.'],
      ['My birthday is ___ (on / in) 12 March.', 'on', 'Sinh nhật tôi ngày 12 tháng Ba.'],
      ['It is very hot ___ (in / at) summer.', 'in', 'Mùa hè rất nóng.'],
      ['I often read ___ (at / in) night.', 'at', 'Tôi hay đọc sách vào ban đêm.'],
      ['We have English ___ (on / in) Tuesday.', 'on', 'Chúng tôi học tiếng Anh vào thứ Ba.'],
      ['She gets up early ___ (in / at) the morning.', 'in', 'Cô ấy dậy sớm vào buổi sáng.'],
      ['The film starts ___ (at / on) 7.30.', 'at', 'Phim bắt đầu lúc 7 giờ rưỡi.'],
      ['They moved here ___ (in / on) 2020.', 'in', 'Họ chuyển đến đây năm 2020.'],
      ['I will see you ___ (tomorrow / on tomorrow).', 'tomorrow', 'Mai gặp bạn nhé.'],
      ['We rest ___ (at / in) the weekend.', 'at', 'Chúng tôi nghỉ vào cuối tuần.']
    ]
  },

  {
    slug: 'prep-place-at-on-in',
    en: 'at, on, in for place',
    vi: 'at, on, in cho nơi chốn — điểm, mặt phẳng, không gian kín',
    level: 'A1',
    summary: 'Ba giới từ nơi chốn cơ bản, chia theo cách người nói HÌNH DUNG chỗ đó: một điểm dùng at, một mặt phẳng dùng on, một không gian có bên trong dùng in.',
    formula: {
      rows: [
        ['at + một điểm', 'at the door · at the bus stop · at school · at work'],
        ['on + một mặt phẳng', 'on the table · on the wall · on the floor · on page 5'],
        ['in + bên trong một không gian', 'in the box · in the room · in Hanoi · in the water'],
        ['Cùng một chỗ, hai cách nhìn', 'at the office = tới đó làm việc · in the office = đang ở bên trong'],
        ['Địa chỉ', 'at 12 Le Loi (số nhà) · on Le Loi Street (tên phố) · in Hanoi (thành phố)']
      ],
      note: 'Tiếng Việt dùng chung một chữ "ở" cho cả ba, nên đây là chỗ dịch thẳng hỏng nhiều nhất. Cách chữa: đừng hỏi "ở đây dịch là gì", hãy hỏi "chỗ này là một điểm, một mặt phẳng, hay có bên trong".'
    },
    signals: ['một điểm trên bản đồ đi với at', 'bề mặt phẳng đi với on', 'có thể bước vào bên trong thì đi với in'],
    useWhen: [
      'Chỉ đường: "Wait at the corner."',
      'Tả vị trí đồ vật: "Your keys are on the table."',
      'Nói nơi ở, nơi làm: "She lives in Da Nang and works in a bank."'
    ],
    useNot: [
      { what: 'Không dùng in với một điểm hẹn.', why: '"in the bus stop" sai — bến xe buýt là một điểm trên đường, không phải chỗ có bên trong: "at the bus stop".' },
      { what: 'Không dùng at với một thành phố hay một nước.', why: '"at Hanoi" sai. Thành phố là không gian bao quanh mình: "in Hanoi".' }
    ],
    confuse: [
      {
        with: 'at school khác in the school',
        tell: 'at + nơi chốn nói về VIỆC diễn ra ở đó (đang đi học, đang làm việc). in + nơi chốn nói về VỊ TRÍ vật lý bên trong toà nhà.',
        pair: [
          { en: 'My son is at school until four.', vi: 'Con trai tôi đi học tới bốn giờ (đang học).' },
          { en: 'The meeting is in the school, not outside.', vi: 'Cuộc họp ở trong trường, không phải bên ngoài (vị trí).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I am waiting in the bus stop.', right: 'I am waiting at the bus stop.', why: 'Bến xe buýt là một điểm, không phải không gian có bên trong.' },
      { wrong: 'She lives at Hanoi.', right: 'She lives in Hanoi.', why: 'Thành phố bao quanh người nói nên dùng in.' }
    ],
    examples: [
      ['Your book is on the table.', 'Sách của bạn ở trên bàn.', 1, 'Mặt phẳng đi với on.'],
      ['I will meet you at the door.', 'Tôi sẽ gặp bạn ở cửa.', 1, 'Một điểm hẹn đi với at.'],
      ['There is milk in the fridge.', 'Có sữa trong tủ lạnh.', 1, 'Không gian có bên trong đi với in.'],
      ['He works at a hospital in Hue.', 'Anh ấy làm ở một bệnh viện tại Huế.', 1, 'at cho nơi làm việc, in cho thành phố.'],
      ['I am waiting in the bus stop.', 'Tôi đang đợi ở bến xe buýt.', 0, 'Sai: sửa thành "at the bus stop".'],
      ['She lives at Hanoi.', 'Cô ấy sống ở Hà Nội.', 0, 'Sai: sửa thành "in Hanoi".']
    ],
    practice: [
      ['The picture is ___ (on / in) the wall.', 'on', 'Bức tranh ở trên tường.'],
      ['My parents live ___ (in / at) Can Tho.', 'in', 'Bố mẹ tôi sống ở Cần Thơ.'],
      ['I will wait ___ (at / in) the gate.', 'at', 'Tôi sẽ đợi ở cổng.'],
      ['There are books ___ (in / on) the bag.', 'in', 'Có sách ở trong túi.'],
      ['She is ___ (at / in) work until six.', 'at', 'Cô ấy đi làm tới sáu giờ.'],
      ['Write your name ___ (on / at) page one.', 'on', 'Viết tên bạn ở trang một.'],
      ['We had lunch ___ (at / in) a small café.', 'at', 'Chúng tôi ăn trưa ở một quán cà phê nhỏ.'],
      ['The children are playing ___ (in / on) the garden.', 'in', 'Bọn trẻ đang chơi trong vườn.'],
      ['He lives ___ (on / in) Tran Phu Street.', 'on', 'Anh ấy sống ở phố Trần Phú.'],
      ['Put the cup ___ (on / in) the shelf, not inside the box.', 'on', 'Đặt cái cốc lên kệ, đừng để trong hộp.']
    ]
  },

  {
    slug: 'prep-to-from',
    en: 'to and from',
    vi: 'to và from — đi tới đâu, đến từ đâu',
    level: 'A1',
    summary: 'to chỉ đích đến của một chuyển động, from chỉ điểm xuất phát. Cặp này đơn giản, nhưng có hai ngoại lệ phải nhớ vì chúng xuất hiện hằng ngày.',
    formula: {
      rows: [
        ['to + đích đến', 'go to school · fly to Japan · send it to me'],
        ['from + điểm xuất phát', 'come from Vietnam · a letter from my sister'],
        ['from … to …', 'from Monday to Friday · from 9 to 5'],
        ['Ngoại lệ: home', 'go home — KHÔNG có to.'],
        ['Ngoại lệ: here, there', 'come here · go there — KHÔNG có to.']
      ],
      note: 'Vì sao "go home" không có to: home ở đây không còn là danh từ chỉ nơi chốn mà đã thành trạng từ. Cùng lý do với here và there. Đây là ba từ duy nhất ở bậc này rơi vào ngoại lệ, nên nhớ đủ ba là xong.'
    },
    signals: ['động từ chuyển động + to', 'nguồn gốc, xuất xứ + from', 'cặp from … to … chỉ khoảng'],
    useWhen: [
      'Nói lịch trình đi lại: "I go to work by bus."',
      'Giới thiệu bản thân: "I am from Vietnam."',
      'Nêu khoảng thời gian hoặc quãng đường: "The shop is open from 8 to 10."'
    ],
    useNot: [
      { what: 'Không dùng to trước home.', why: '"go to home" sai. Đúng là "go home".' },
      { what: 'Không dùng to sau arrive.', why: '"arrive to Hanoi" sai. arrive đi với in (thành phố) hoặc at (một điểm): "arrive in Hanoi", "arrive at the airport".' }
    ],
    confuse: [
      {
        with: 'go to khác arrive in/at',
        tell: 'go nhìn từ lúc bắt đầu đi nên cần to chỉ hướng. arrive nhìn từ lúc đã tới nơi nên dùng in hoặc at chỉ vị trí.',
        pair: [
          { en: 'We went to Hue last year.', vi: 'Năm ngoái chúng tôi đi Huế.' },
          { en: 'We arrived in Hue at nine.', vi: 'Chúng tôi tới Huế lúc chín giờ.' }
        ]
      }
    ],
    errors: [
      { wrong: 'I want to go to home.', right: 'I want to go home.', why: 'home là trạng từ ở đây nên không cần to.' },
      { wrong: 'The plane arrived to Da Nang.', right: 'The plane arrived in Da Nang.', why: 'arrive không đi với to.' }
    ],
    examples: [
      ['She goes to school by bike.', 'Cô ấy đi học bằng xe đạp.', 1, 'to chỉ đích đến.'],
      ['I am from Hai Phong.', 'Tôi đến từ Hải Phòng.', 1, 'from chỉ xuất xứ.'],
      ['We work from Monday to Friday.', 'Chúng tôi làm từ thứ Hai đến thứ Sáu.', 1, 'Cặp from … to … chỉ khoảng.'],
      ['It is late — let us go home.', 'Muộn rồi, mình về nhà thôi.', 1, 'go home không có to.'],
      ['I want to go to home.', 'Tôi muốn về nhà.', 0, 'Sai: sửa thành "go home".'],
      ['The plane arrived to Da Nang.', 'Máy bay tới Đà Nẵng.', 0, 'Sai: sửa thành "arrived in Da Nang".']
    ],
    practice: [
      ['I go ___ (to / at) the market every morning.', 'to', 'Tôi đi chợ mỗi sáng.'],
      ['This letter is ___ (from / to) my teacher.', 'from', 'Lá thư này từ cô giáo tôi.'],
      ['The office is open ___ (from / at) 8 to 5.', 'from', 'Văn phòng mở từ 8 tới 5 giờ.'],
      ['It is raining. Let us go ___ (home / to home).', 'home', 'Trời mưa rồi, về nhà thôi.'],
      ['They moved ___ (to / in) Hue in 2021.', 'to', 'Họ chuyển tới Huế năm 2021.'],
      ['We arrived ___ (in / to) Hanoi very late.', 'in', 'Chúng tôi tới Hà Nội rất muộn.'],
      ['Where are you ___ (from / of)?', 'from', 'Bạn từ đâu tới?'],
      ['Please send the file ___ (to / for) me.', 'to', 'Gửi tệp cho tôi nhé.'],
      ['Come ___ (here / to here) and sit down.', 'here', 'Lại đây ngồi đi.'],
      ['The bus goes ___ (from / at) the station to the airport.', 'from', 'Xe buýt chạy từ bến ra sân bay.']
    ]
  },

  {
    slug: 'prep-with-without',
    en: 'with and without',
    vi: 'with và without — có và không có, đi cùng ai, dùng bằng gì',
    level: 'A1',
    summary: 'with có ba nghĩa hay dùng: đi cùng ai, có kèm cái gì, và dùng công cụ gì. without là phủ định của cả ba.',
    formula: {
      rows: [
        ['Đi cùng ai', 'I live with my parents.'],
        ['Có kèm cái gì', 'a room with a window · coffee with milk'],
        ['Dùng công cụ gì', 'Write with a pen. · Cut it with a knife.'],
        ['without = không có', 'coffee without sugar · He left without me.'],
        ['without + V-ing', 'He left without saying goodbye.']
      ],
      note: 'Người Việt hay dùng "by" cho công cụ vì tiếng Việt nói "viết bằng bút", "đi bằng xe buýt" — cùng một chữ "bằng". Tiếng Anh tách đôi: cầm được trên tay thì dùng with (with a pen), phương tiện đi lại thì dùng by (by bus).'
    },
    signals: ['đi cùng người nào đó', 'món gì có kèm thứ gì', 'cầm dụng cụ trên tay để làm'],
    useWhen: [
      'Gọi món: "A coffee with milk, please."',
      'Nói mình sống hoặc đi với ai: "I went with my sister."',
      'Nêu dụng cụ: "Open it with this key."'
    ],
    useNot: [
      { what: 'Không dùng by cho dụng cụ cầm tay.', why: '"write by a pen" sai. Bút cầm trên tay nên dùng with: "write with a pen".' },
      { what: 'Sau without thì động từ ở dạng V-ing, không phải nguyên thể.', why: '"without to say" sai. Đúng là "without saying".' }
    ],
    confuse: [
      {
        with: 'with (dụng cụ) khác by (phương tiện)',
        tell: 'Cầm được trên tay thì with. Ngồi lên trên hoặc vào trong nó để đi thì by.',
        pair: [
          { en: 'I cut the bread with a knife.', vi: 'Tôi cắt bánh mì bằng dao.' },
          { en: 'I go to work by bus.', vi: 'Tôi đi làm bằng xe buýt.' }
        ]
      }
    ],
    errors: [
      { wrong: 'She writes by a blue pen.', right: 'She writes with a blue pen.', why: 'Dụng cụ cầm tay đi với with.' },
      { wrong: 'He left without to say goodbye.', right: 'He left without saying goodbye.', why: 'Sau without dùng V-ing.' }
    ],
    examples: [
      ['I live with my grandmother.', 'Tôi sống với bà tôi.', 1, 'with chỉ người đi cùng.'],
      ['I would like tea without sugar.', 'Cho tôi trà không đường.', 1, 'without là phủ định của with.'],
      ['Cut the paper with these scissors.', 'Cắt giấy bằng cái kéo này.', 1, 'Dụng cụ cầm tay đi với with.'],
      ['He went out without his phone.', 'Anh ấy ra ngoài mà không mang điện thoại.', 1, 'without + danh từ.'],
      ['She writes by a blue pen.', 'Cô ấy viết bằng bút xanh.', 0, 'Sai: sửa thành "with a blue pen".'],
      ['He left without to say goodbye.', 'Anh ấy đi mà không chào.', 0, 'Sai: sửa thành "without saying goodbye".']
    ],
    practice: [
      ['I always drink coffee ___ (with / by) milk.', 'with', 'Tôi luôn uống cà phê có sữa.'],
      ['Please open the door ___ (with / by) this key.', 'with', 'Mở cửa bằng chìa này nhé.'],
      ['She went to the party ___ (with / to) her brother.', 'with', 'Cô ấy đi dự tiệc cùng anh trai.'],
      ['I cannot read ___ (without / with) my glasses.', 'without', 'Không có kính thì tôi không đọc được.'],
      ['He left ___ (without / with) saying anything.', 'without', 'Anh ấy đi mà không nói gì.'],
      ['We need a room ___ (with / by) two beds.', 'with', 'Chúng tôi cần phòng có hai giường.'],
      ['Do not eat soup ___ (with / by) a fork.', 'with', 'Đừng ăn súp bằng nĩa.'],
      ['A sandwich ___ (without / with) cheese, please.', 'without', 'Cho tôi bánh mì không phô mai.'],
      ['She fixed it ___ (with / by) her own hands.', 'with', 'Cô ấy tự tay sửa nó.'],
      ['I went to the cinema ___ (with / from) two friends.', 'with', 'Tôi đi xem phim với hai người bạn.']
    ]
  },

  {
    slug: 'prep-place-near-between',
    en: 'near, next to, between, opposite, in front of, behind',
    vi: 'near, next to, between, opposite, in front of, behind — tả vị trí tương đối',
    level: 'A1',
    summary: 'Sáu cụm chỉ vị trí của vật này so với vật kia. Điểm khó không phải nghĩa mà là mấy cụm có nhiều hơn một chữ: quên mất chữ "to" hay chữ "of" là lỗi phổ biến nhất.',
    formula: {
      rows: [
        ['near + danh từ', 'The bank is near my house. — KHÔNG có "to".'],
        ['next to + danh từ', 'Sit next to me. — luôn đủ hai chữ.'],
        ['between A and B', 'between the bank and the school — hai vật.'],
        ['among + số nhiều', 'among the trees — ba vật trở lên.'],
        ['in front of / behind', 'in front of the house · behind the door']
      ],
      note: 'in front of luôn đủ ba chữ, còn behind chỉ một chữ và không bao giờ có "of". Hai cụm này đối nhau về nghĩa nhưng không đối nhau về hình dạng, nên nhớ riêng từng cụm chứ đừng suy từ cụm kia.'
    },
    signals: ['hai vật đứng cạnh nhau', 'một vật nằm giữa hai vật khác', 'vật này che trước hoặc nấp sau vật kia'],
    useWhen: [
      'Chỉ đường: "The café is next to the post office."',
      'Tả một bức ảnh trong bài Nói: "A man is standing in front of the door."',
      'Nói chỗ ngồi: "I sat between my parents."'
    ],
    useNot: [
      { what: 'Không thêm "to" sau near.', why: '"near to my house" nghe rất cứng và hiếm dùng. Đúng và tự nhiên là "near my house".' },
      { what: 'Không dùng between cho ba thứ trở lên.', why: '"between the trees" khi có cả rừng cây thì sai; dùng "among the trees".' }
    ],
    confuse: [
      {
        with: 'between khác among',
        tell: 'Đếm được hai vật rõ ràng thì between. Một đám đông không đếm rành mạch thì among.',
        pair: [
          { en: 'The shop is between the bank and the school.', vi: 'Cửa hàng nằm giữa ngân hàng và trường học (hai vật).' },
          { en: 'The house is among the trees.', vi: 'Căn nhà nằm giữa rừng cây (nhiều vật).' }
        ]
      }
    ],
    errors: [
      { wrong: 'She sat next me.', right: 'She sat next to me.', why: 'next to luôn đủ hai chữ.' },
      { wrong: 'The car is in front the house.', right: 'The car is in front of the house.', why: 'in front of luôn đủ ba chữ.' }
    ],
    examples: [
      ['The bank is near my school.', 'Ngân hàng gần trường tôi.', 1, 'near không cần "to".'],
      ['Come and sit next to me.', 'Lại ngồi cạnh tôi này.', 1, 'next to đủ hai chữ.'],
      ['The café is between the bank and the park.', 'Quán cà phê nằm giữa ngân hàng và công viên.', 1, 'between dùng cho hai vật.'],
      ['There is a tree behind the house.', 'Có một cái cây sau nhà.', 1, 'behind chỉ một chữ, không có "of".'],
      ['She sat next me.', 'Cô ấy ngồi cạnh tôi.', 0, 'Sai: sửa thành "next to me".'],
      ['The car is in front the house.', 'Xe đỗ trước nhà.', 0, 'Sai: sửa thành "in front of the house".']
    ],
    practice: [
      ['The post office is ___ (next to / next) the bank.', 'next to', 'Bưu điện ở cạnh ngân hàng.'],
      ['My house is ___ (near / near to) the market.', 'near', 'Nhà tôi gần chợ.'],
      ['She is standing ___ (in front of / in front) the door.', 'in front of', 'Cô ấy đang đứng trước cửa.'],
      ['The cat is hiding ___ (behind / behind of) the sofa.', 'behind', 'Con mèo trốn sau ghế sofa.'],
      ['The school is ___ (between / among) the park and the river.', 'between', 'Trường nằm giữa công viên và con sông.'],
      ['He found the key ___ (among / between) the papers.', 'among', 'Anh ấy tìm thấy chìa khoá giữa đống giấy tờ.'],
      ['The pharmacy is ___ (opposite / opposite of) the hospital.', 'opposite', 'Hiệu thuốc đối diện bệnh viện.'],
      ['Please stand ___ (behind / near to) me in the queue.', 'behind', 'Đứng sau tôi trong hàng nhé.'],
      ['There is a small shop ___ (near / at near) the station.', 'near', 'Có một cửa hàng nhỏ gần ga.'],
      ['Sit ___ (between / among) Nam and Lan.', 'between', 'Ngồi giữa Nam và Lan đi.']
    ]
  },

  {
    slug: 'prep-for-basic',
    en: 'for: who it is for, how long, what it is used for',
    vi: 'for — cho ai, trong bao lâu, dùng để làm gì',
    level: 'A1',
    summary: 'for có ba nghĩa cơ bản đi cùng nhau ở bậc này: người nhận, khoảng thời gian kéo dài, và mục đích sử dụng.',
    formula: {
      rows: [
        ['Người nhận', 'This gift is for you.'],
        ['Khoảng thời gian kéo dài', 'I waited for two hours.'],
        ['Mục đích, công dụng', 'a knife for cutting bread · What is this for?'],
        ['for + V-ing (công dụng)', 'This box is for keeping photos.'],
        ['to + V (mục đích của người)', 'I came here to study. — KHÔNG dùng "for to study".']
      ],
      note: 'Chỗ lẫn lớn nhất ở bậc này: "for + V-ing" nói công dụng của một ĐỒ VẬT, còn "to + V" nói mục đích của một NGƯỜI. "This app is for learning English" (công dụng của app) nhưng "I use this app to learn English" (mục đích của tôi).'
    },
    signals: ['món quà dành cho ai', 'khoảng thời gian kéo dài bao lâu', 'câu hỏi "cái này để làm gì"'],
    useWhen: [
      'Tặng quà, gửi đồ: "I bought this for my mother."',
      'Nói mình chờ hoặc học bao lâu: "I studied for three years."',
      'Hỏi công dụng: "What is this button for?"'
    ],
    useNot: [
      { what: 'Không dùng "for to + V".', why: '"I came for to study" sai. Mục đích của người dùng to + V: "I came to study."' },
      { what: 'Không dùng for với một mốc thời gian.', why: '"for 2020" sai. for đi với khoảng dài bao lâu, không đi với một mốc: "since 2020" hoặc "in 2020".' }
    ],
    confuse: [
      {
        with: 'for + V-ing khác to + V',
        tell: 'Hỏi xem chủ ngữ là vật hay người. Vật thì nói công dụng — for + V-ing. Người thì nói mục đích — to + V.',
        pair: [
          { en: 'This knife is for cutting bread.', vi: 'Con dao này dùng để cắt bánh mì (công dụng của vật).' },
          { en: 'I bought a knife to cut bread.', vi: 'Tôi mua dao để cắt bánh mì (mục đích của người).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I came here for to learn English.', right: 'I came here to learn English.', why: 'Mục đích của người dùng to + V, không có "for".' },
      { wrong: 'I have lived here for 2019.', right: 'I have lived here since 2019.', why: 'for đi với khoảng dài, không đi với một mốc năm.' }
    ],
    examples: [
      ['This letter is for you.', 'Lá thư này gửi cho bạn.', 1, 'for chỉ người nhận.'],
      ['We walked for an hour.', 'Chúng tôi đi bộ một tiếng.', 1, 'for chỉ khoảng thời gian kéo dài.'],
      ['This room is for meetings.', 'Phòng này dùng để họp.', 1, 'for chỉ công dụng.'],
      ['I went to the shop to buy milk.', 'Tôi ra cửa hàng để mua sữa.', 1, 'Mục đích của người dùng to + V.'],
      ['I came here for to learn English.', 'Tôi tới đây để học tiếng Anh.', 0, 'Sai: sửa thành "to learn English".'],
      ['I have lived here for 2019.', 'Tôi sống ở đây từ 2019.', 0, 'Sai: sửa thành "since 2019".']
    ],
    practice: [
      ['I bought some flowers ___ (for / to) my mother.', 'for', 'Tôi mua hoa tặng mẹ.'],
      ['We waited ___ (for / since) twenty minutes.', 'for', 'Chúng tôi đợi hai mươi phút.'],
      ['This bag is ___ (for / to) carrying books.', 'for', 'Cái túi này để đựng sách.'],
      ['She went out ___ (to / for to) buy bread.', 'to', 'Cô ấy ra ngoài mua bánh mì.'],
      ['What is this key ___ (for / to)?', 'for', 'Chìa khoá này để làm gì?'],
      ['He has worked here ___ (for / since) five years.', 'for', 'Anh ấy làm ở đây năm năm rồi.'],
      ['I am saving money ___ (for / to) a new bike.', 'for', 'Tôi để dành tiền mua xe đạp mới.'],
      ['These shoes are ___ (for / to) running.', 'for', 'Đôi giày này để chạy bộ.'],
      ['I use this app ___ (to / for to) practise English.', 'to', 'Tôi dùng ứng dụng này để luyện tiếng Anh.'],
      ['Can you hold this ___ (for / to) me?', 'for', 'Cầm hộ tôi cái này được không?']
    ]
  },

  {
    slug: 'prep-since-for',
    en: 'since and for',
    vi: 'since và for — từ mốc nào, và kéo dài bao lâu',
    level: 'A2',
    summary: 'Hai từ đều nói về thời gian kéo dài tới hiện tại, nhưng trả lời hai câu hỏi khác nhau: since trả lời "từ khi nào", for trả lời "được bao lâu".',
    formula: {
      rows: [
        ['since + MỐC thời gian', 'since 2019 · since Monday · since I was ten'],
        ['for + KHOẢNG dài', 'for three years · for two hours · for a long time'],
        ['Thì đi kèm', 'Cả hai thường đi với hiện tại hoàn thành: "I have lived here since 2019 / for five years."'],
        ['since + mệnh đề', 'since I moved here — sau since có thể là cả một mệnh đề, sau for thì không.'],
        ['Cách tự kiểm', 'Đặt câu hỏi: "Từ bao giờ?" → since. "Bao lâu rồi?" → for.']
      ],
      note: 'Tiếng Việt dùng chung chữ "từ" cho cả hai — "từ năm 2019" và "từ ba năm nay" — nên dịch thẳng là hỏng. Cách chữa nhanh: nhìn vào cụm đứng sau, nếu đọc lên nghe như một cái mốc trên lịch thì since, nếu nghe như một độ dài đo được thì for.'
    },
    signals: ['một mốc trên lịch đi với since', 'một độ dài đo được đi với for', 'thường đứng cùng hiện tại hoàn thành'],
    useWhen: [
      'Nói kinh nghiệm làm việc trong bài Nói: "I have worked here for two years."',
      'Kể từ khi nào một việc bắt đầu: "We have known each other since school."',
      'Viết email công việc: "We have not received a reply since Tuesday."'
    ],
    useNot: [
      { what: 'Không dùng for trước một mốc.', why: '"for last Monday" sai. Mốc thì dùng since: "since last Monday".' },
      { what: 'Không dùng since trước một độ dài.', why: '"since three years" sai — lỗi phổ biến nhất của người Việt ở điểm này. Đúng là "for three years".' }
    ],
    confuse: [
      {
        with: 'since khác for',
        tell: 'Che phần trước đi và chỉ đọc phần sau. "2019" là một điểm trên lịch → since. "three years" là một độ dài → for.',
        pair: [
          { en: 'I have studied English since 2019.', vi: 'Tôi học tiếng Anh từ năm 2019 (mốc).' },
          { en: 'I have studied English for five years.', vi: 'Tôi học tiếng Anh được năm năm (độ dài).' }
        ]
      }
    ],
    errors: [
      { wrong: 'She has worked here since three years.', right: 'She has worked here for three years.', why: 'three years là độ dài nên dùng for.' },
      { wrong: 'I have not seen him for last week.', right: 'I have not seen him since last week.', why: 'last week là một mốc nên dùng since.' }
    ],
    examples: [
      ['I have lived in Hue since 2018.', 'Tôi sống ở Huế từ năm 2018.', 1, 'Mốc năm đi với since.'],
      ['We have waited for half an hour.', 'Chúng tôi đợi nửa tiếng rồi.', 1, 'Độ dài đi với for.'],
      ['He has been ill since Monday.', 'Anh ấy ốm từ thứ Hai.', 1, 'Tên thứ là một mốc.'],
      ['They have known each other since they were children.', 'Họ biết nhau từ hồi còn bé.', 1, 'Sau since có thể là cả một mệnh đề.'],
      ['She has worked here since three years.', 'Cô ấy làm ở đây ba năm rồi.', 0, 'Sai: sửa thành "for three years".'],
      ['I have not seen him for last week.', 'Tôi không gặp anh ấy từ tuần trước.', 0, 'Sai: sửa thành "since last week".']
    ],
    practice: [
      ['I have been here ___ (for / since) two hours.', 'for', 'Tôi ở đây hai tiếng rồi.'],
      ['She has studied French ___ (since / for) 2020.', 'since', 'Cô ấy học tiếng Pháp từ năm 2020.'],
      ['We have not met ___ (since / for) last summer.', 'since', 'Chúng tôi không gặp nhau từ hè năm ngoái.'],
      ['He has worked there ___ (for / since) six months.', 'for', 'Anh ấy làm ở đó sáu tháng rồi.'],
      ['They have lived here ___ (since / for) a long time.', 'for', 'Họ sống ở đây lâu rồi.'],
      ['I have known Mai ___ (since / for) we were at school.', 'since', 'Tôi biết Mai từ hồi đi học.'],
      ['It has been raining ___ (since / for) this morning.', 'since', 'Trời mưa từ sáng nay.'],
      ['The shop has been closed ___ (for / since) three days.', 'for', 'Cửa hàng đóng cửa ba ngày rồi.'],
      ['We have used this system ___ (since / for) January.', 'since', 'Chúng tôi dùng hệ thống này từ tháng Một.'],
      ['She has not called me ___ (for / since) a week.', 'for', 'Cô ấy không gọi tôi cả tuần rồi.']
    ]
  },

  {
    slug: 'prep-during-while',
    en: 'during and while',
    vi: 'during và while — cùng nghĩa "trong lúc", khác nhau ở thứ đứng sau',
    level: 'A2',
    summary: 'Hai từ dịch ra tiếng Việt gần như y hệt, nhưng during là GIỚI TỪ nên sau nó là danh từ, còn while là LIÊN TỪ nên sau nó là cả một mệnh đề có chủ ngữ và động từ.',
    formula: {
      rows: [
        ['during + DANH TỪ', 'during the meeting · during the summer · during dinner'],
        ['while + MỆNH ĐỀ', 'while we were eating · while she was driving'],
        ['Cùng một ý, hai cách viết', 'during the film = while the film was on'],
        ['Cách tự kiểm', 'Sau nó có động từ chia không? Có → while. Không → during.'],
        ['for khác during', 'for nói KÉO DÀI BAO LÂU, during nói XẢY RA TRONG LÚC NÀO.']
      ],
      note: 'Đây là một trong hai lỗi giới từ nặng nhất ở bậc A2 với người Việt, vì tiếng Việt dùng "trong lúc / trong khi" cho cả hai mà không đổi cấu trúc câu. Tiếng Anh thì đổi: chọn sai từ là câu vỡ ngữ pháp chứ không chỉ nghe lạ tai.'
    },
    signals: ['sau nó là một danh từ đơn thuần', 'sau nó là chủ ngữ cộng động từ', 'hai việc xảy ra cùng lúc'],
    useWhen: [
      'Kể chuyện trong phần Nói: "While I was waiting, I read a book."',
      'Nói quy định trong email: "Please do not use phones during the test."',
      'Tả hai việc song song: "He cooked during the break."'
    ],
    useNot: [
      { what: 'Không đặt mệnh đề sau during.', why: '"during I was studying" sai. Có chủ ngữ và động từ thì dùng while: "while I was studying".' },
      { what: 'Không đặt danh từ trần sau while.', why: '"while the meeting" sai. Danh từ thì dùng during: "during the meeting".' }
    ],
    confuse: [
      {
        with: 'during khác while',
        tell: 'Nhìn ngay chữ đứng sau. Nếu đó là một danh từ thì during; nếu đó là một chủ ngữ kéo theo động từ thì while.',
        pair: [
          { en: 'I fell asleep during the film.', vi: 'Tôi ngủ gật trong lúc xem phim (sau đó là danh từ).' },
          { en: 'I fell asleep while I was watching the film.', vi: 'Tôi ngủ gật trong lúc đang xem phim (sau đó là mệnh đề).' }
        ]
      }
    ],
    errors: [
      { wrong: 'During I was cooking, the phone rang.', right: 'While I was cooking, the phone rang.', why: 'Sau đó là mệnh đề nên dùng while.' },
      { wrong: 'Please stay quiet while the exam.', right: 'Please stay quiet during the exam.', why: 'Sau đó là danh từ nên dùng during.' }
    ],
    examples: [
      ['Do not talk during the test.', 'Đừng nói chuyện trong lúc thi.', 1, 'Sau during là danh từ.'],
      ['While she was cooking, I set the table.', 'Trong lúc cô ấy nấu ăn, tôi dọn bàn.', 1, 'Sau while là mệnh đề.'],
      ['It rained during the night.', 'Trời mưa trong đêm.', 1, 'during + danh từ.'],
      ['He called while I was out.', 'Anh ấy gọi lúc tôi đi vắng.', 1, 'while + mệnh đề.'],
      ['During I was cooking, the phone rang.', 'Trong lúc tôi nấu ăn, điện thoại reo.', 0, 'Sai: sửa thành "While I was cooking".'],
      ['Please stay quiet while the exam.', 'Xin giữ trật tự trong lúc thi.', 0, 'Sai: sửa thành "during the exam".']
    ],
    practice: [
      ['I read a book ___ (during / while) the flight.', 'during', 'Tôi đọc sách trong chuyến bay.'],
      ['___ (While / During) I was walking home, I met Lan.', 'While', 'Trong lúc đi bộ về nhà, tôi gặp Lan.'],
      ['She sleeps ___ (during / while) the afternoon.', 'during', 'Cô ấy ngủ vào buổi chiều.'],
      ['The lights went out ___ (while / during) we were eating.', 'while', 'Đèn tắt lúc chúng tôi đang ăn.'],
      ['Do not use your phone ___ (during / while) the meeting.', 'during', 'Đừng dùng điện thoại trong cuộc họp.'],
      ['He arrived ___ (while / during) I was on the phone.', 'while', 'Anh ấy tới lúc tôi đang gọi điện.'],
      ['It snowed a lot ___ (during / while) the winter.', 'during', 'Tuyết rơi nhiều trong mùa đông.'],
      ['I took notes ___ (while / during) the teacher was speaking.', 'while', 'Tôi ghi chép lúc cô giáo đang giảng.'],
      ['Nobody left ___ (during / while) the ceremony.', 'during', 'Không ai rời đi trong buổi lễ.'],
      ['___ (While / During) they were talking, I finished my work.', 'While', 'Trong lúc họ nói chuyện, tôi làm xong việc.']
    ]
  },

  {
    slug: 'prep-by-until',
    en: 'by and until',
    vi: 'by và until — hạn chót khác với kéo dài tới lúc đó',
    level: 'A2',
    summary: 'by nói HẠN CHÓT: xong lúc nào cũng được, miễn không muộn hơn mốc đó. until nói VIỆC KÉO DÀI liên tục cho tới mốc đó rồi dừng.',
    formula: {
      rows: [
        ['by + mốc = hạn chót', 'Send it by Friday. — thứ Tư gửi cũng được.'],
        ['until + mốc = kéo dài tới', 'I will be here until Friday. — có mặt liên tục tới thứ Sáu.'],
        ['Động từ đi kèm by', 'Động từ chỉ một lần: finish, send, arrive, pay.'],
        ['Động từ đi kèm until', 'Động từ chỉ trạng thái kéo dài: wait, stay, work, be open.'],
        ['not … until', 'The shop does not open until nine. — mãi chín giờ mới mở.']
      ],
      note: 'Cặp này đáng học kỹ vì nó xuất hiện trong đúng phần bài thi tốn điểm nhất: viết email công việc. "Please reply by Thursday" (hạn chót thứ Năm) và "Please reply until Thursday" (sai — nghe như bảo người ta trả lời liên tục suốt tới thứ Năm) khác nhau một chữ và khác hẳn nhau về nghĩa.'
    },
    signals: ['một hạn nộp, một deadline', 'một việc kéo dài rồi dừng', 'cấu trúc phủ định not … until'],
    useWhen: [
      'Viết email đặt hạn: "Could you confirm by Wednesday?"',
      'Nói giờ mở cửa: "We are open until ten."',
      'Nói việc gì mãi mới xảy ra: "I did not know until yesterday."'
    ],
    useNot: [
      { what: 'Không dùng until cho một hạn chót.', why: '"Finish it until Friday" sai. Hạn chót dùng by: "Finish it by Friday."' },
      { what: 'Không dùng by cho một việc kéo dài.', why: '"I will wait by six" sai. Việc kéo dài dùng until: "I will wait until six."' }
    ],
    confuse: [
      {
        with: 'by khác until',
        tell: 'Hỏi xem việc đó xảy ra MỘT LẦN hay KÉO DÀI. Một lần, chỉ cần không muộn hơn mốc → by. Kéo dài liên tục tới mốc → until.',
        pair: [
          { en: 'Please send the report by Friday.', vi: 'Gửi báo cáo chậm nhất là thứ Sáu (hạn chót).' },
          { en: 'I will be in the office until Friday.', vi: 'Tôi ở văn phòng cho tới hết thứ Sáu (kéo dài).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Please finish the work until Monday.', right: 'Please finish the work by Monday.', why: 'finish là việc một lần, có hạn chót nên dùng by.' },
      { wrong: 'We will wait by nine o\'clock.', right: 'We will wait until nine o\'clock.', why: 'wait là việc kéo dài nên dùng until.' }
    ],
    examples: [
      ['Please reply by Thursday.', 'Vui lòng trả lời chậm nhất thứ Năm.', 1, 'Hạn chót đi với by.'],
      ['The library is open until nine.', 'Thư viện mở tới chín giờ.', 1, 'Kéo dài tới mốc đi với until.'],
      ['I must pay the bill by the end of the month.', 'Tôi phải thanh toán trước cuối tháng.', 1, 'Việc một lần, có hạn.'],
      ['She did not tell me until yesterday.', 'Mãi hôm qua cô ấy mới nói với tôi.', 1, 'Cấu trúc not … until.'],
      ['Please finish the work until Monday.', 'Làm xong việc trước thứ Hai nhé.', 0, 'Sai: sửa thành "by Monday".'],
      ['We will wait by nine o\'clock.', 'Chúng tôi sẽ đợi tới chín giờ.', 0, 'Sai: sửa thành "until nine o\'clock".']
    ],
    practice: [
      ['Please send the file ___ (by / until) Friday.', 'by', 'Gửi tệp chậm nhất thứ Sáu nhé.'],
      ['The shop stays open ___ (until / by) ten.', 'until', 'Cửa hàng mở tới mười giờ.'],
      ['I need your answer ___ (by / until) tomorrow.', 'by', 'Tôi cần câu trả lời chậm nhất là mai.'],
      ['We waited ___ (until / by) the rain stopped.', 'until', 'Chúng tôi đợi tới khi tạnh mưa.'],
      ['He did not arrive ___ (until / by) midnight.', 'until', 'Mãi nửa đêm anh ấy mới tới.'],
      ['Can you finish it ___ (by / until) six?', 'by', 'Bạn làm xong trước sáu giờ được không?'],
      ['She will be away ___ (until / by) next week.', 'until', 'Cô ấy đi vắng tới tuần sau.'],
      ['The report must be ready ___ (by / until) Monday morning.', 'by', 'Báo cáo phải xong trước sáng thứ Hai.'],
      ['I will stay here ___ (until / by) you come back.', 'until', 'Tôi sẽ ở đây tới lúc bạn quay lại.'],
      ['Please pay ___ (by / until) the fifth of the month.', 'by', 'Vui lòng thanh toán trước ngày mùng năm.']
    ]
  },

  {
    slug: 'prep-into-onto-out-of',
    en: 'into, onto, out of versus in, on',
    vi: 'into, onto, out of so với in, on — chuyển động khác vị trí',
    level: 'A2',
    summary: 'in và on tả VỊ TRÍ đứng yên. into, onto và out of tả CHUYỂN ĐỘNG đi vào, đi lên hoặc đi ra. Chọn theo động từ: động từ đứng yên hay động từ di chuyển.',
    formula: {
      rows: [
        ['Vị trí đứng yên', 'The keys are in the drawer. · The book is on the desk.'],
        ['Chuyển động vào trong', 'Put the keys into the drawer. · She walked into the room.'],
        ['Chuyển động lên trên', 'He climbed onto the roof.'],
        ['Chuyển động ra ngoài', 'Take the keys out of the drawer. · She ran out of the house.'],
        ['out of luôn đủ hai chữ', 'KHÔNG nói "out the house" (trừ lối nói Anh-Mỹ thân mật).']
      ],
      note: 'Sau nhiều động từ chuyển động thông dụng, người bản ngữ vẫn dùng in và on thay cho into và onto mà không sai: "Put it in the box" cũng đúng như "Put it into the box". Nhưng chiều ngược lại thì không: dùng into cho một vị trí đứng yên ("The keys are into the drawer") thì sai hẳn. Nên khi chưa chắc, in và on là lựa chọn an toàn hơn.'
    },
    signals: ['động từ chỉ chuyển động: go, walk, run, put, climb', 'động từ chỉ trạng thái: be, stay, sit, lie', 'đi ra khỏi một chỗ kín'],
    useWhen: [
      'Tả hành động trong phần Nói: "He walked into the office."',
      'Hướng dẫn ai làm gì: "Put the papers into this folder."',
      'Kể chuyện: "She ran out of the room."'
    ],
    useNot: [
      { what: 'Không dùng into cho một vị trí đứng yên.', why: '"The milk is into the fridge" sai. Đứng yên thì dùng in: "The milk is in the fridge."' },
      { what: 'Không bỏ chữ "of" trong out of.', why: '"He went out the room" là lối nói thân mật; trong bài thi viết đúng là "out of the room".' }
    ],
    confuse: [
      {
        with: 'in khác into',
        tell: 'Nhìn động từ. be, stay, sit, lie là đứng yên → in. go, walk, put, jump là di chuyển → into.',
        pair: [
          { en: 'The cat is in the box.', vi: 'Con mèo ở trong hộp (vị trí).' },
          { en: 'The cat jumped into the box.', vi: 'Con mèo nhảy vào hộp (chuyển động).' }
        ]
      }
    ],
    errors: [
      { wrong: 'The milk is into the fridge.', right: 'The milk is in the fridge.', why: 'be là động từ đứng yên nên dùng in.' },
      { wrong: 'She came out the building.', right: 'She came out of the building.', why: 'out of cần đủ hai chữ trong văn viết.' }
    ],
    examples: [
      ['She walked into the classroom.', 'Cô ấy bước vào lớp.', 1, 'Động từ chuyển động đi với into.'],
      ['Your phone is in my bag.', 'Điện thoại của bạn ở trong túi tôi.', 1, 'Vị trí đứng yên đi với in.'],
      ['The cat climbed onto the wall.', 'Con mèo trèo lên tường.', 1, 'Chuyển động lên trên đi với onto.'],
      ['He took a pen out of his pocket.', 'Anh ấy lấy cây bút ra khỏi túi.', 1, 'out of đủ hai chữ.'],
      ['The milk is into the fridge.', 'Sữa ở trong tủ lạnh.', 0, 'Sai: sửa thành "in the fridge".'],
      ['She came out the building.', 'Cô ấy đi ra khỏi toà nhà.', 0, 'Sai: sửa thành "out of the building".']
    ],
    practice: [
      ['He put the letter ___ (into / in) the envelope and sealed it.', 'into', 'Anh ấy bỏ lá thư vào phong bì rồi dán lại.'],
      ['Your keys are ___ (in / into) the drawer.', 'in', 'Chìa khoá của bạn ở trong ngăn kéo.'],
      ['The boy jumped ___ (into / in) the river.', 'into', 'Cậu bé nhảy xuống sông.'],
      ['She took her wallet ___ (out of / out) her bag.', 'out of', 'Cô ấy lấy ví ra khỏi túi.'],
      ['The cat is sleeping ___ (on / onto) the sofa.', 'on', 'Con mèo đang ngủ trên ghế sofa.'],
      ['He climbed ___ (onto / on) the roof to fix it.', 'onto', 'Anh ấy trèo lên mái để sửa.'],
      ['Please come ___ (into / in) my office for a moment.', 'into', 'Mời vào phòng tôi một lát.'],
      ['The children ran ___ (out of / out) the house.', 'out of', 'Bọn trẻ chạy ra khỏi nhà.'],
      ['There is nobody ___ (in / into) the room.', 'in', 'Không có ai trong phòng.'],
      ['Pour the water ___ (into / in) this glass, carefully.', 'into', 'Rót nước vào cốc này, cẩn thận nhé.']
    ]
  },

  {
    slug: 'prep-transport',
    en: 'by bus, on the bus, in a car',
    vi: 'by bus, on the bus, in a car — phương tiện đi lại',
    level: 'A2',
    summary: 'Nói ĐI BẰNG GÌ thì dùng by + phương tiện, không có mạo từ. Nói ĐANG NGỒI TRONG ĐÓ thì dùng in hoặc on, và có mạo từ. Chọn in hay on tuỳ xe to hay nhỏ.',
    formula: {
      rows: [
        ['by + phương tiện (không mạo từ)', 'by bus · by train · by plane · by bike · by car'],
        ['Ngoại lệ: đi bộ', 'on foot — KHÔNG nói "by foot".'],
        ['Xe lớn, đứng được', 'on the bus · on the train · on the plane · on a boat'],
        ['Xe nhỏ, phải cúi vào', 'in a car · in a taxi'],
        ['Cách nhớ in hay on', 'Đứng thẳng đi lại được trong đó → on. Phải ngồi khom vào → in.']
      ],
      note: 'Vì sao by không đi với mạo từ: "by bus" ở đây không nói về một chiếc xe cụ thể nào, nó nói về CÁCH đi. Cho nên khi đã chỉ vào một chiếc xe cụ thể thì mạo từ quay lại và giới từ đổi luôn: "I go by bus" nhưng "I left my bag on the bus".'
    },
    signals: ['câu hỏi "đi bằng gì"', 'đang ở bên trong phương tiện', 'phương tiện có mạo từ hay không'],
    useWhen: [
      'Trả lời câu hỏi thường gặp trong phần Nói: "How do you get to work?"',
      'Kể một chuyến đi: "We went to Sa Pa by train."',
      'Nói mình quên đồ ở đâu: "I left my umbrella on the bus."'
    ],
    useNot: [
      { what: 'Không dùng mạo từ sau by.', why: '"by the bus" sai khi đang nói cách đi. Đúng là "by bus".' },
      { what: 'Không nói "by foot".', why: 'Đi bộ là ngoại lệ duy nhất trong nhóm này: "on foot".' }
    ],
    confuse: [
      {
        with: 'by bus khác on the bus',
        tell: 'by bus trả lời "đi bằng cách nào". on the bus trả lời "lúc đó đang ở đâu". Có mạo từ "the" là dấu hiệu đang nói về một chiếc xe cụ thể.',
        pair: [
          { en: 'I go to school by bus.', vi: 'Tôi đi học bằng xe buýt (cách đi).' },
          { en: 'I met her on the bus.', vi: 'Tôi gặp cô ấy trên xe buýt (vị trí).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I go to work by the bus.', right: 'I go to work by bus.', why: 'by + phương tiện không có mạo từ.' },
      { wrong: 'She comes to school by foot.', right: 'She comes to school on foot.', why: 'Đi bộ là ngoại lệ, dùng on foot.' }
    ],
    examples: [
      ['We travelled to Hue by train.', 'Chúng tôi đi Huế bằng tàu.', 1, 'by + phương tiện, không mạo từ.'],
      ['I usually go to school on foot.', 'Tôi thường đi bộ tới trường.', 1, 'Ngoại lệ duy nhất của nhóm.'],
      ['I read a book on the train.', 'Tôi đọc sách trên tàu.', 1, 'Xe lớn dùng on, có mạo từ.'],
      ['They were sitting in a taxi.', 'Họ đang ngồi trong taxi.', 1, 'Xe nhỏ dùng in.'],
      ['I go to work by the bus.', 'Tôi đi làm bằng xe buýt.', 0, 'Sai: sửa thành "by bus".'],
      ['She comes to school by foot.', 'Cô ấy đi bộ tới trường.', 0, 'Sai: sửa thành "on foot".']
    ],
    practice: [
      ['He goes to the office ___ (by / on) motorbike.', 'by', 'Anh ấy đi làm bằng xe máy.'],
      ['We walked there ___ (on / by) foot.', 'on', 'Chúng tôi đi bộ tới đó.'],
      ['I left my bag ___ (on / by) the bus.', 'on', 'Tôi để quên túi trên xe buýt.'],
      ['They arrived ___ (by / in) plane.', 'by', 'Họ tới bằng máy bay.'],
      ['She was sitting ___ (in / on) a car when I saw her.', 'in', 'Cô ấy đang ngồi trong xe hơi lúc tôi thấy.'],
      ['Is it faster ___ (by / on) train or by bus?', 'by', 'Đi tàu hay xe buýt nhanh hơn?'],
      ['We met ___ (on / by) the plane to Seoul.', 'on', 'Chúng tôi gặp nhau trên chuyến bay đi Seoul.'],
      ['My father goes to work ___ (by / in) bike.', 'by', 'Bố tôi đi làm bằng xe đạp.'],
      ['There were only three people ___ (on / by) the boat.', 'on', 'Trên thuyền chỉ có ba người.'],
      ['I always sleep ___ (in / by) a taxi.', 'in', 'Tôi lúc nào cũng ngủ trong taxi.']
    ]
  },

  {
    slug: 'prep-verb-prep',
    en: 'verb + preposition: listen to, wait for, depend on',
    vi: 'động từ + giới từ — listen to, wait for, depend on',
    level: 'A2',
    summary: 'Một số động từ tiếng Anh luôn kéo theo một giới từ cố định, và giới từ ấy không suy ra được từ tiếng Việt. Phải học cả cụm như một từ.',
    formula: {
      rows: [
        ['+ to', 'listen to · belong to · talk to · reply to'],
        ['+ for', 'wait for · look for · ask for · pay for'],
        ['+ on', 'depend on · rely on'],
        ['+ at', 'look at · laugh at · arrive at'],
        ['+ about', 'think about · worry about · talk about']
      ],
      note: 'Ba cụm gài bẫy nặng nhất với người Việt: "listen to music" (tiếng Việt "nghe nhạc" không có giới từ), "wait for me" ("đợi tôi" cũng không có), và "answer the question" (tiếng Việt "trả lời CHO câu hỏi" có giới từ, tiếng Anh thì KHÔNG). Nghĩa là lỗi xảy ra ở cả hai chiều: chỗ cần thì quên, chỗ không cần lại thêm vào.'
    },
    signals: ['động từ và giới từ luôn đi liền nhau', 'tiếng Việt không có giới từ tương ứng', 'đổi giới từ là đổi nghĩa'],
    useWhen: [
      'Gần như mọi câu trong bài Nói và bài Viết đều chạm tới ít nhất một cụm loại này.',
      'Viết email công việc: "I am waiting for your reply."',
      'Nói về sở thích: "I listen to music every evening."'
    ],
    useNot: [
      { what: 'Không bỏ giới từ ở listen to và wait for.', why: '"listen music" và "wait me" đều sai — đây là hai lỗi phổ biến nhất của nhóm này.' },
      { what: 'Không thêm giới từ vào answer, discuss, marry, enter.', why: '"answer to the question" sai. Bốn động từ này đi thẳng với tân ngữ: "answer the question".' }
    ],
    confuse: [
      {
        with: 'listen to khác hear',
        tell: 'listen là CHỦ ĐỘNG lắng nghe nên cần to. hear là nghe thấy một cách bị động và đi thẳng với tân ngữ, không có giới từ.',
        pair: [
          { en: 'I listen to the news every morning.', vi: 'Sáng nào tôi cũng nghe tin tức (chủ động).' },
          { en: 'I heard a strange noise.', vi: 'Tôi nghe thấy một tiếng động lạ (bị động, không giới từ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I am waiting my friend.', right: 'I am waiting for my friend.', why: 'wait luôn kéo theo for.' },
      { wrong: 'Please answer to my question.', right: 'Please answer my question.', why: 'answer đi thẳng với tân ngữ, không có giới từ.' }
    ],
    examples: [
      ['I listen to music while I study.', 'Tôi nghe nhạc trong lúc học.', 1, 'listen luôn đi với to.'],
      ['We are waiting for the bus.', 'Chúng tôi đang đợi xe buýt.', 1, 'wait luôn đi với for.'],
      ['It depends on the weather.', 'Cái đó còn tuỳ thời tiết.', 1, 'depend luôn đi với on.'],
      ['She answered my email quickly.', 'Cô ấy trả lời email tôi rất nhanh.', 1, 'answer không cần giới từ.'],
      ['I am waiting my friend.', 'Tôi đang đợi bạn tôi.', 0, 'Sai: sửa thành "waiting for my friend".'],
      ['Please answer to my question.', 'Xin trả lời câu hỏi của tôi.', 0, 'Sai: sửa thành "answer my question".']
    ],
    practice: [
      ['I am looking ___ (for / to) my keys.', 'for', 'Tôi đang tìm chìa khoá.'],
      ['Please listen ___ (to / at) the teacher.', 'to', 'Hãy nghe cô giáo nói.'],
      ['It depends ___ (on / of) the price.', 'on', 'Cái đó còn tuỳ giá.'],
      ['She is waiting ___ (for / of) her results.', 'for', 'Cô ấy đang chờ kết quả.'],
      ['Look ___ (at / to) this photo.', 'at', 'Nhìn tấm ảnh này này.'],
      ['I often think ___ (about / on) my family.', 'about', 'Tôi hay nghĩ về gia đình.'],
      ['He paid ___ (for / to) the tickets.', 'for', 'Anh ấy trả tiền vé.'],
      ['Can you answer ___ (this question / to this question)?', 'this question', 'Bạn trả lời câu hỏi này được không?'],
      ['This book belongs ___ (to / for) Mai.', 'to', 'Cuốn sách này của Mai.'],
      ['Do not worry ___ (about / for) the test.', 'about', 'Đừng lo về bài kiểm tra.']
    ]
  },

  {
    slug: 'prep-adj-prep',
    en: 'adjective + preposition: good at, interested in, afraid of',
    vi: 'tính từ + giới từ — good at, interested in, afraid of',
    level: 'A2',
    summary: 'Cũng như động từ, nhiều tính từ tiếng Anh kéo theo một giới từ cố định. Sau giới từ đó, nếu là động từ thì luôn ở dạng V-ing.',
    formula: {
      rows: [
        ['+ at', 'good at · bad at · terrible at'],
        ['+ in', 'interested in · successful in'],
        ['+ of', 'afraid of · proud of · full of · tired of'],
        ['+ about', 'worried about · excited about · sorry about'],
        ['Sau giới từ dùng V-ing', 'good at swimming · interested in learning · afraid of flying']
      ],
      note: 'Quy tắc V-ing sau giới từ là chỗ đáng nhớ nhất, vì nó áp cho MỌI giới từ chứ không riêng nhóm này: "good at swim" sai, "good at swimming" đúng. Một khi nắm được, nó chữa luôn hàng loạt lỗi ở các điểm khác.'
    },
    signals: ['tính từ đi liền một giới từ cố định', 'sau giới từ là danh từ hoặc V-ing', 'nói về khả năng, cảm xúc hoặc sở thích'],
    useWhen: [
      'Giới thiệu bản thân trong phần Nói: "I am interested in technology."',
      'Nói điểm mạnh điểm yếu: "I am quite good at maths."',
      'Nói cảm xúc: "She is worried about the exam."'
    ],
    useNot: [
      { what: 'Không dùng nguyên thể sau giới từ.', why: '"interested in to learn" sai. Sau giới từ luôn là V-ing: "interested in learning".' },
      { what: 'Không đổi at thành in ở good at.', why: '"good in English" sai. Đúng là "good at English".' }
    ],
    confuse: [
      {
        with: 'interested in khác interesting',
        tell: 'interested nói về CẢM XÚC của người và đi với in. interesting nói về TÍNH CHẤT của vật và không có giới từ theo sau.',
        pair: [
          { en: 'I am interested in history.', vi: 'Tôi thấy hứng thú với lịch sử (cảm xúc của tôi).' },
          { en: 'History is interesting.', vi: 'Lịch sử thì thú vị (tính chất của môn học).' }
        ]
      }
    ],
    errors: [
      { wrong: 'She is very good in cooking.', right: 'She is very good at cooking.', why: 'good luôn đi với at.' },
      { wrong: 'I am interested in to learn Japanese.', right: 'I am interested in learning Japanese.', why: 'Sau giới từ dùng V-ing.' }
    ],
    examples: [
      ['He is good at drawing.', 'Anh ấy vẽ giỏi.', 1, 'good + at, rồi V-ing.'],
      ['I am interested in Korean films.', 'Tôi thích phim Hàn.', 1, 'interested luôn đi với in.'],
      ['She is afraid of dogs.', 'Cô ấy sợ chó.', 1, 'afraid luôn đi với of.'],
      ['We are worried about the weather.', 'Chúng tôi lo về thời tiết.', 1, 'worried luôn đi với about.'],
      ['She is very good in cooking.', 'Cô ấy nấu ăn rất giỏi.', 0, 'Sai: sửa thành "good at cooking".'],
      ['I am interested in to learn Japanese.', 'Tôi muốn học tiếng Nhật.', 0, 'Sai: sửa thành "interested in learning".']
    ],
    practice: [
      ['My sister is good ___ (at / in) English.', 'at', 'Chị tôi giỏi tiếng Anh.'],
      ['Are you interested ___ (in / on) music?', 'in', 'Bạn có thích nhạc không?'],
      ['He is afraid ___ (of / from) flying.', 'of', 'Anh ấy sợ đi máy bay.'],
      ['I am excited ___ (about / for) the trip.', 'about', 'Tôi háo hức về chuyến đi.'],
      ['She is proud ___ (of / about) her son.', 'of', 'Cô ấy tự hào về con trai.'],
      ['We are tired ___ (of / from) waiting.', 'of', 'Chúng tôi chán đợi rồi.'],
      ['I am not very good ___ (at / in) swimming.', 'at', 'Tôi bơi không giỏi lắm.'],
      ['They are worried ___ (about / of) their exams.', 'about', 'Họ lo về kỳ thi.'],
      ['The bottle is full ___ (of / with) water.', 'of', 'Cái chai đầy nước.'],
      ['She is interested in ___ (learning / to learn) Chinese.', 'learning', 'Cô ấy muốn học tiếng Trung.']
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
