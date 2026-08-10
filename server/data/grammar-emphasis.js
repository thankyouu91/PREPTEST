/**
 * Ngữ pháp — nhóm ĐẢO NGỮ, NHẤN MẠNH và CÂU CHẺ, phần bậc B1 đến C1.
 *
 * Nguồn: tự soạn. Giấy phép: nội dung của dự án (không chép Oxford 3000/5000
 * hay English Vocabulary Profile — hai nguồn đó có bản quyền).
 *
 * Bảng phân bậc trong docs/LEARNING.md mục 2 cấp cho nhóm này 21 điểm
 * (B1 ×2, B2 ×5, C1 ×7, C2 ×7). Tệp này soạn 14 điểm của B1, B2 và C1;
 * 7 điểm bậc C2 tách thành mục riêng trong hàng đợi.
 *
 * Cả nhóm chỉ lo một việc: ĐỔI TRẬT TỰ ĐỂ ĐỔI CHỖ NHẤN. Tiếng Việt nhấn bằng
 * hư từ — "chính", "mới", "chứ", "cơ" — nên trật tự câu gần như không đổi.
 * Tiếng Anh thì ngược lại: muốn nhấn phải xê dịch thành phần trong câu, và
 * có khi phải đảo cả trợ động từ lên trước chủ ngữ.
 *
 * Chỗ khó nhất là biết KHI NÀO đảo và khi nào không. Đưa trạng ngữ phủ định
 * lên đầu thì bắt buộc đảo ("Never have I seen…"), nhưng đưa tân ngữ lên đầu
 * thì tuyệt đối không đảo ("That book I have never read"). Hai phép cùng là
 * "đưa lên đầu" mà luật ngược nhau, nên tệp này dựng hẳn hai điểm cạnh nhau
 * để đối chiếu.
 *
 * Ghi chú tránh trùng: đảo ngữ điều kiện ("Had I known…") đã dựng ở nhóm câu
 * điều kiện, tệp này không nhắc lại. Mệnh đề nhượng bộ trang trọng
 * ("Much as…", "Try as…") thuộc nhóm mệnh đề phụ. Từ nối và mạch lạc văn bản
 * là nhóm riêng, đã dựng ở bảng linking_words.
 *
 * Mỗi điểm: 6 câu ví dụ (ít nhất 2 phản ví dụ) + 10 câu luyện tập.
 *
 * ok = 1 câu đúng, ok = 0 phản ví dụ (câu sai kèm cách sửa trong note).
 */
'use strict';

const POINTS = [

  /* ==================== B1 ==================== */

  {
    slug: 'so-neither-nor',
    en: 'So do I / Neither do I',
    vi: 'Đảo ngữ đồng tình — So do I, Neither do I',
    level: 'B1',
    summary: 'Nói "tôi cũng vậy" mà không phải lặp lại cả câu. Trợ động từ phải khớp với câu trước, và bắt buộc đảo lên trước chủ ngữ.',
    formula: {
      rows: [
        ['Đồng tình câu khẳng định', 'So + TRỢ ĐỘNG TỪ + CHỦ NGỮ: "I like coffee." — "SO DO I."'],
        ['Đồng tình câu phủ định', 'Neither / Nor + TRỢ + CHỦ NGỮ: "I do not smoke." — "NEITHER DO I."'],
        ['Trợ động từ phải khớp', '"I am tired" → So AM I · "I went" → So DID I · "I can swim" → So CAN I'],
        ['Bản thân mật', '"Me too" và "Me neither" — nói được, viết trang trọng thì không.']
      ],
      note: 'Trật tự là chỗ sai nhiều nhất: phải là "So do I", không phải "So I do". Và nhớ chọn đúng vế: câu trước khẳng định thì "So…", câu trước phủ định thì "Neither…" hoặc "Nor…". Bản thân "neither" đã mang nghĩa phủ định nên không thêm "not" nữa.'
    },
    signals: ['So do I', 'Neither do I', 'Nor do I', 'trả lời đồng tình'],
    useWhen: [
      'Đáp lại lời người khác để nói mình cũng thế, trong hội thoại hằng ngày.',
      'Phần Nói của kỳ thi: câu đáp gọn, tự nhiên, đúng nhịp hội thoại.',
      'Viết: nối hai chủ ngữ cùng chung một việc mà khỏi lặp động từ.'
    ],
    useNot: [
      { what: 'Không viết "So I do" khi đáp lời.', why: 'Câu đáp bắt buộc đảo: "So do I". "So I do" là cách nói khác hẳn, nghĩa là "đúng là tôi có làm thế thật".' },
      { what: 'Không dùng "So" sau câu phủ định.', why: '"I do not smoke." — "So do I" sai. Câu trước phủ định thì đáp bằng "Neither do I" hoặc "Nor do I".' }
    ],
    confuse: [
      {
        with: '"So do I" khác "Neither do I"',
        tell: 'Nhìn câu trước: khẳng định thì "So", phủ định thì "Neither" hoặc "Nor".',
        pair: [
          { en: 'I like coffee. So do I.', vi: 'Tôi thích cà phê. Tôi cũng vậy (câu trước khẳng định).' },
          { en: 'I do not like coffee. Neither do I.', vi: 'Tôi không thích cà phê. Tôi cũng không (câu trước phủ định).' }
        ]
      }
    ],
    errors: [
      { wrong: 'I like coffee. So I do.', right: 'I like coffee. So do I.', why: 'Câu đáp phải đảo trợ động từ lên trước chủ ngữ.' },
      { wrong: 'I cannot swim. So can I.', right: 'I cannot swim. Neither can I.', why: 'Câu trước phủ định nên đáp bằng "Neither" hoặc "Nor".' }
    ],
    examples: [
      ['I like coffee. So do I.', 'Tôi thích cà phê. Tôi cũng vậy.', 1, 'Trợ động từ "do" khớp với thì hiện tại đơn của câu trước.'],
      ['I am tired. So am I.', 'Tôi mệt. Tôi cũng thế.', 1, 'Câu trước dùng "am" nên câu đáp cũng "am".'],
      ['She does not eat meat. Neither do I.', 'Cô ấy không ăn thịt. Tôi cũng không.', 1, 'Câu trước phủ định nên dùng "Neither".'],
      ['He has never been to Hue. Nor have I.', 'Anh ấy chưa từng tới Huế. Tôi cũng chưa.', 1, '"Nor" thay được cho "Neither", trang trọng hơn một chút.'],
      ['I like coffee. So I do.', 'Tôi thích cà phê. Tôi cũng vậy.', 0, 'Sai: sửa thành "I like coffee. So do I."'],
      ['I cannot swim. So can I.', 'Tôi không biết bơi. Tôi cũng không.', 0, 'Sai: sửa thành "I cannot swim. Neither can I."']
    ],
    practice: [
      ['I like coffee. ___ (So do I / So I do).', 'So do I', 'Tôi thích cà phê. Tôi cũng vậy.'],
      ['I am tired. ___ (So am I / So I am).', 'So am I', 'Tôi mệt. Tôi cũng thế.'],
      ['She does not eat meat. ___ (Neither do I / So do I).', 'Neither do I', 'Cô ấy không ăn thịt. Tôi cũng không.'],
      ['He went home early. So ___ (did / does) I.', 'did', 'Anh ấy về sớm. Tôi cũng vậy.'],
      ['I cannot swim. ___ (Neither can I / So can I).', 'Neither can I', 'Tôi không biết bơi. Tôi cũng không.'],
      ['They have finished. So ___ (have / has) we.', 'have', 'Họ xong rồi. Chúng tôi cũng thế.'],
      ['I will not be there. ___ (Nor will I / So will I).', 'Nor will I', 'Tôi sẽ không có mặt. Tôi cũng không.'],
      ['The informal version of "Neither do I" is ___ (Me neither / Me too).', 'Me neither', 'Bản thân mật của "Neither do I" là "Me neither".'],
      ['She should apologise. So ___ (should / shall) he.', 'should', 'Cô ấy nên xin lỗi. Anh ta cũng nên.'],
      ['I have not seen it. ___ (Neither have I / So have I).', 'Neither have I', 'Tôi chưa xem. Tôi cũng chưa.']
    ]
  },

  {
    slug: 'here-there-inversion',
    en: 'Here comes… / There goes…',
    vi: 'Đảo ngữ với here, there và trạng ngữ nơi chốn',
    level: 'B1',
    summary: 'Đưa "here", "there" hay một cụm chỉ nơi chốn lên đầu rồi đảo động từ lên trước chủ ngữ — nhưng chỉ đảo khi chủ ngữ là DANH TỪ.',
    formula: {
      rows: [
        ['Chủ ngữ là danh từ → đảo', 'HERE COMES the bus. / THERE GOES my chance.'],
        ['Chủ ngữ là đại từ → KHÔNG đảo', 'Here IT comes. / There SHE goes.'],
        ['Trạng ngữ nơi chốn, văn viết', 'On the wall HUNG a painting.'],
        ['Cụm đã thành nếp', 'Here you are. / There you go. / Here we are.']
      ],
      note: 'Luật đại từ là chỗ sai nhiều nhất: "Here comes the bus" đúng nhưng "Here comes it" sai, phải là "Here it comes". Lý do là đại từ vốn đã là thông tin cũ nên không được đẩy xuống cuối câu — chỗ dành cho thông tin mới.'
    },
    signals: ['Here comes', 'There goes', 'trạng ngữ nơi chốn đứng đầu câu'],
    useWhen: [
      'Hội thoại: báo hiệu cái gì đó vừa xuất hiện — "Here comes the bus."',
      'Văn kể và văn tả: đưa bối cảnh lên trước rồi mới lộ ra chủ thể.',
      'Các cụm đã thành nếp khi đưa đồ cho ai: "Here you are."'
    ],
    useNot: [
      { what: 'Không đảo khi chủ ngữ là đại từ.', why: '"Here comes it" sai. Đại từ giữ nguyên vị trí: "Here it comes."' },
      { what: 'Không dùng lối này với thì hoàn thành hay tiếp diễn.', why: '"Here is coming the bus" sai. Mẫu này đi với thì hiện tại đơn hoặc quá khứ đơn.' }
    ],
    confuse: [
      {
        with: 'chủ ngữ danh từ khác chủ ngữ đại từ',
        tell: 'Danh từ thì đảo, đại từ thì không. Chỉ cần nhìn chủ ngữ là biết.',
        pair: [
          { en: 'Here comes the bus.', vi: 'Xe buýt tới kìa (chủ ngữ là danh từ nên đảo).' },
          { en: 'Here it comes.', vi: 'Nó tới kìa (chủ ngữ là đại từ nên giữ nguyên).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Here comes it.', right: 'Here it comes.', why: 'Chủ ngữ là đại từ nên không đảo.' },
      { wrong: 'There goes she.', right: 'There she goes.', why: 'Cùng lý do: đại từ giữ nguyên vị trí trước động từ.' }
    ],
    examples: [
      ['Here comes the bus.', 'Xe buýt tới kìa.', 1, 'Chủ ngữ là danh từ nên đảo động từ lên trước.'],
      ['Here it comes.', 'Nó tới kìa.', 1, 'Chủ ngữ là đại từ nên giữ nguyên trật tự.'],
      ['There goes my last chance.', 'Thế là mất nốt cơ hội cuối.', 1, '"There goes" hay dùng khi vừa mất cái gì đó.'],
      ['On the wall hung a large painting.', 'Trên tường treo một bức tranh lớn.', 1, 'Trạng ngữ nơi chốn đứng đầu, hợp văn tả.'],
      ['Here comes it.', 'Nó tới kìa.', 0, 'Sai: sửa thành "Here it comes."'],
      ['There goes she.', 'Cô ấy đi kìa.', 0, 'Sai: sửa thành "There she goes."']
    ],
    practice: [
      ['___ (Here comes / Here come) the bus.', 'Here comes', 'Xe buýt tới kìa.'],
      ['Here ___ (it comes / comes it).', 'it comes', 'Nó tới kìa.'],
      ['There ___ (goes / go) my last chance.', 'goes', 'Thế là mất nốt cơ hội cuối.'],
      ['There ___ (she goes / goes she) again.', 'she goes', 'Cô ấy lại thế nữa rồi.'],
      ['You invert only when the subject is a ___ (noun / pronoun).', 'noun', 'Chỉ đảo khi chủ ngữ là danh từ.'],
      ['On the wall ___ (hung / was hanging) a large painting.', 'hung', 'Trên tường treo một bức tranh lớn.'],
      ['___ (Here you are / Here are you) — your ticket.', 'Here you are', 'Của bạn đây — vé nè.'],
      ['Here ___ (come / comes) the children.', 'come', 'Bọn trẻ tới kìa.'],
      ['In the corner ___ (stood / was stood) an old clock.', 'stood', 'Ở góc phòng có một chiếc đồng hồ cũ.'],
      ['There ___ (he goes / goes he), late as always.', 'he goes', 'Anh ta lại đi rồi, muộn như mọi khi.']
    ]
  },

  /* ==================== B2 ==================== */

  {
    slug: 'do-emphasis',
    en: 'Emphatic do, does, did',
    vi: 'Nhấn mạnh bằng trợ động từ — I DO like it',
    level: 'B2',
    summary: 'Thêm do, does hay did vào câu khẳng định để nhấn. Dùng khi cần cãi lại, khẳng định chắc nịch, hoặc đối lập với điều vừa nói.',
    formula: {
      rows: [
        ['Hiện tại', 'I DO like it. / She DOES know the answer.'],
        ['Quá khứ', 'He DID call you — I saw it.'],
        ['Động từ chính về nguyên thể trần', 'He DID CALL, không phải "did called".'],
        ['Mệnh lệnh lịch sự', 'DO sit down. / DO have another slice.']
      ],
      note: 'Chỉ dùng cho câu khẳng định. Câu hỏi và câu phủ định vốn đã có "do" nên không thêm nữa. Nhớ: sau "do/does/did" thì động từ chính về dạng nguyên thể trần, "did called" là sai. Khi nói thì nhấn giọng ngay vào chữ "do".'
    },
    signals: ['do + động từ nguyên thể trong câu khẳng định', 'cãi lại', 'khẳng định chắc nịch'],
    useWhen: [
      'Cãi lại điều người khác vừa nói: "You never call." — "I DO call!"',
      'Nhượng bộ rồi phản bác trong bài Viết: "The plan DOES have merits, but…"',
      'Mời mọc lịch sự: "Do come in." — giọng nồng hậu hơn hẳn "Come in."'
    ],
    useNot: [
      { what: 'Không chia động từ chính sau "did".', why: '"He did called you" sai. Sau "did" là nguyên thể trần: "He did call you."' },
      { what: 'Không dùng trong câu phủ định hay câu hỏi.', why: 'Hai loại câu đó đã có "do" làm nhiệm vụ ngữ pháp rồi; muốn nhấn thì nhấn giọng hoặc thêm trạng từ.' }
    ],
    confuse: [
      {
        with: '"do" nhấn mạnh khác "do" động từ thường',
        tell: '"do" nhấn mạnh luôn có động từ chính đi ngay sau. "do" động từ thường thì tự nó mang nghĩa "làm".',
        pair: [
          { en: 'I do like your new hat.', vi: 'Tôi thích cái mũ mới của bạn thật đấy (nhấn mạnh).' },
          { en: 'I do the washing up every evening.', vi: 'Tối nào tôi cũng rửa bát ("do" là động từ thường).' }
        ]
      }
    ],
    errors: [
      { wrong: 'He did called you yesterday.', right: 'He did call you yesterday.', why: 'Sau "did" là động từ nguyên thể trần.' },
      { wrong: 'She does knows the answer.', right: 'She does know the answer.', why: 'Cùng lý do: "does" đã gánh phần chia ngôi rồi.' }
    ],
    examples: [
      ['I do like your new hat.', 'Tôi thích cái mũ mới của bạn thật đấy.', 1, 'Nhấn mạnh để cãi lại hoặc khẳng định chắc chắn.'],
      ['She does know the answer, she is just shy.', 'Cô ấy biết câu trả lời đấy, chỉ là ngại thôi.', 1, 'Nhấn rồi giải thích ngay lý do người khác hiểu nhầm.'],
      ['He did call you — I heard the phone.', 'Anh ấy có gọi cho bạn mà — tôi nghe tiếng chuông.', 1, 'Nhấn ở thì quá khứ, động từ chính giữ nguyên thể trần.'],
      ['Do sit down and make yourself at home.', 'Mời ngồi, cứ tự nhiên như ở nhà nhé.', 1, 'Mệnh lệnh có "do" nghe nồng hậu hơn hẳn.'],
      ['He did called you yesterday.', 'Anh ấy có gọi cho bạn hôm qua mà.', 0, 'Sai: sửa thành "He did call you yesterday."'],
      ['She does knows the answer.', 'Cô ấy biết câu trả lời đấy.', 0, 'Sai: sửa thành "She does know the answer."']
    ],
    practice: [
      ['I ___ (do like / do liked) your new hat.', 'do like', 'Tôi thích cái mũ mới của bạn thật đấy.'],
      ['She ___ (does know / does knows) the answer.', 'does know', 'Cô ấy biết câu trả lời đấy.'],
      ['He ___ (did call / did called) you yesterday.', 'did call', 'Anh ấy có gọi cho bạn hôm qua mà.'],
      ['___ (Do sit / Do sitting) down and make yourself at home.', 'Do sit', 'Mời ngồi, cứ tự nhiên nhé.'],
      ['Emphatic "do" is used only in ___ (affirmative / negative) statements.', 'affirmative', 'Trợ động từ nhấn mạnh chỉ dùng trong câu khẳng định.'],
      ['The plan ___ (does have / does has) some merits.', 'does have', 'Kế hoạch này cũng có mặt được đấy chứ.'],
      ['They ___ (did try / did tried) their best.', 'did try', 'Họ đã cố hết sức thật mà.'],
      ['After "did" the main verb is in the ___ (base form / past form).', 'base form', 'Sau "did" thì động từ chính ở dạng nguyên thể trần.'],
      ['I ___ (do apologise / do apologised) for the delay.', 'do apologise', 'Tôi thành thật xin lỗi vì đã chậm trễ.'],
      ['We ___ (did enjoy / did enjoyed) the concert very much.', 'did enjoy', 'Chúng tôi rất thích buổi hoà nhạc đó.']
    ]
  },

  {
    slug: 'it-cleft',
    en: 'It-cleft sentences',
    vi: 'Câu chẻ với "It is … that" — chẻ câu để nhấn một thành phần',
    level: 'B2',
    summary: 'Tách một câu thành hai để đẩy đúng thành phần muốn nhấn ra chỗ sáng nhất. Cùng một câu gốc, chẻ chỗ nào là nhấn chỗ đó.',
    formula: {
      rows: [
        ['Khung câu', 'It + be + THÀNH PHẦN NHẤN + that / who + phần còn lại'],
        ['Nhấn người', 'It was NAM WHO broke the window. (chính Nam chứ không phải ai khác)'],
        ['Nhấn vật', 'It was THE WINDOW THAT Nam broke. (cái cửa sổ chứ không phải cái khác)'],
        ['Nhấn thời gian, nơi chốn', 'It was IN 2019 THAT they met.']
      ],
      note: 'Chữ "It" ở đầu chỉ giữ chỗ, không trỏ vào cái gì cả, và động từ luôn là "It is" hay "It was" bất kể phần nhấn số ít hay số nhiều. Bỏ "that" hay "who" đi là câu gãy: "It was Nam broke the window" sai.'
    },
    signals: ['It is … that', 'It was … who', 'chẻ câu để nhấn'],
    useWhen: [
      'Đính chính một hiểu nhầm: người kia tưởng là ai khác, mình chẻ câu để chỉ đúng người.',
      'Bài Viết: đưa thông tin quan trọng nhất ra vị trí nổi bật.',
      'Nhấn vào thời gian hoặc nơi chốn: "It was only last year that the law changed."'
    ],
    useNot: [
      { what: 'Không bỏ "that" hay "who".', why: '"It was Nam broke the window" sai. Khung câu chẻ bắt buộc có từ nối.' },
      { what: 'Không đổi "It was" theo số của phần nhấn.', why: '"It were Nam and Lan who came" sai. Luôn là "It was", vì "It" mới là chủ ngữ ngữ pháp.' }
    ],
    confuse: [
      {
        with: 'chẻ chỗ này khác chẻ chỗ kia',
        tell: 'Thành phần nào đứng ngay sau "It was" thì đó là thành phần đang được nhấn.',
        pair: [
          { en: 'It was Nam who broke the window.', vi: 'Chính Nam là người làm vỡ cửa sổ (nhấn vào người).' },
          { en: 'It was the window that Nam broke.', vi: 'Cái Nam làm vỡ là cửa sổ (nhấn vào vật).' }
        ]
      }
    ],
    errors: [
      { wrong: 'It was Nam broke the window.', right: 'It was Nam who broke the window.', why: 'Thiếu "who" nên câu gãy làm đôi.' },
      { wrong: 'It were Nam and Lan who came first.', right: 'It was Nam and Lan who came first.', why: 'Chủ ngữ ngữ pháp là "It" nên luôn dùng "was".' }
    ],
    examples: [
      ['It was Nam who broke the window.', 'Chính Nam là người làm vỡ cửa sổ.', 1, 'Nhấn vào người, dùng "who".'],
      ['It was the window that Nam broke.', 'Cái Nam làm vỡ là cửa sổ.', 1, 'Cùng câu gốc, chẻ chỗ khác thì nhấn chỗ khác.'],
      ['It was in 2019 that they first met.', 'Chính năm 2019 họ mới gặp nhau lần đầu.', 1, 'Nhấn vào mốc thời gian.'],
      ['It is the noise that bothers me, not the dust.', 'Cái làm tôi khó chịu là tiếng ồn, không phải bụi.', 1, 'Chẻ câu rất hợp khi cần đính chính.'],
      ['It was Nam broke the window.', 'Chính Nam là người làm vỡ cửa sổ.', 0, 'Sai: sửa thành "It was Nam who broke the window."'],
      ['It were Nam and Lan who came first.', 'Chính Nam và Lan tới trước.', 0, 'Sai: sửa thành "It was Nam and Lan who came first."']
    ],
    practice: [
      ['It was Nam ___ (who / which) broke the window.', 'who', 'Chính Nam là người làm vỡ cửa sổ.'],
      ['It was the window ___ (that / who) Nam broke.', 'that', 'Cái Nam làm vỡ là cửa sổ.'],
      ['___ (It was / They were) in 2019 that they first met.', 'It was', 'Chính năm 2019 họ mới gặp nhau lần đầu.'],
      ['It ___ (was / were) Nam and Lan who came first.', 'was', 'Chính Nam và Lan tới trước.'],
      ['It is the noise ___ (that / what) bothers me.', 'that', 'Cái làm tôi khó chịu là tiếng ồn.'],
      ['The cleft frame always needs ___ (that or who / a comma).', 'that or who', 'Khung câu chẻ luôn cần "that" hoặc "who".'],
      ['It was ___ (my sister who / my sister she) called you.', 'my sister who', 'Chính chị tôi là người gọi cho bạn.'],
      ['It was in Hue ___ (that / where) I learned to cook.', 'that', 'Chính ở Huế tôi mới học nấu ăn.'],
      ['The word "It" here is a ___ (placeholder / real pronoun).', 'placeholder', 'Chữ "It" ở đây chỉ giữ chỗ, không trỏ vào cái gì.'],
      ['It was only yesterday ___ (that / when) I heard the news.', 'that', 'Mãi tới hôm qua tôi mới nghe tin.']
    ]
  },

  {
    slug: 'wh-cleft',
    en: 'Wh-cleft sentences',
    vi: 'Câu chẻ với "What … is" — đẩy phần nhấn xuống cuối',
    level: 'B2',
    summary: 'Ngược với câu chẻ "It": chỗ nhấn nằm ở CUỐI câu. Mở đầu bằng "What…" để treo người nghe lại rồi mới tung ra thông tin.',
    formula: {
      rows: [
        ['Khung câu', 'What + MỆNH ĐỀ + be + THÀNH PHẦN NHẤN'],
        ['Nhấn danh từ', 'WHAT I need IS a holiday.'],
        ['Nhấn hành động', 'WHAT he did WAS call the police.'],
        ['Động từ "be" hợp với phần nhấn', 'What I need IS a holiday. / What I need ARE new shoes.']
      ],
      note: 'Chỗ nhấn ở cuối câu là điểm khác lớn nhất so với câu chẻ "It". Tiếng Anh đặt thông tin mới ở cuối, nên mẫu này rất hợp khi muốn dồn người nghe chờ đợi. Lưu ý "be" chia theo phần nhấn ở cuối chứ không theo "What".'
    },
    signals: ['What … is', 'What … was', 'All … is', 'nhấn ở cuối câu'],
    useWhen: [
      'Muốn dồn sự chú ý vào cuối câu, chỗ tai người nghe bám nhất.',
      'Bài Nói: mở bằng "What I mean is…" để có thời gian sắp ý.',
      'Đính chính hoặc làm rõ: "What I said was…, not…".'
    ],
    useNot: [
      { what: 'Không chia "be" theo chữ "What".', why: '"What I need is new shoes" nên sửa thành "What I need ARE new shoes" — "be" hợp với phần nhấn ở cuối.' },
      { what: 'Không thêm đại từ thừa vào giữa.', why: '"What I need it is a holiday" sai. Bỏ "it" đi.' }
    ],
    confuse: [
      {
        with: 'câu chẻ "What" khác câu chẻ "It"',
        tell: 'Câu chẻ "It" đặt phần nhấn ngay đầu. Câu chẻ "What" đẩy phần nhấn xuống cuối.',
        pair: [
          { en: 'It is a holiday that I need.', vi: 'Cái tôi cần là một kỳ nghỉ (nhấn ở đầu).' },
          { en: 'What I need is a holiday.', vi: 'Cái tôi cần là một kỳ nghỉ (nhấn ở cuối).' }
        ]
      }
    ],
    errors: [
      { wrong: 'What I need it is a holiday.', right: 'What I need is a holiday.', why: 'Thừa đại từ "it" ở giữa.' },
      { wrong: 'What I need is new shoes.', right: 'What I need are new shoes.', why: '"be" hợp với phần nhấn số nhiều ở cuối câu.' }
    ],
    examples: [
      ['What I need is a good night of sleep.', 'Cái tôi cần là một giấc ngủ ngon.', 1, 'Phần nhấn nằm ở cuối câu.'],
      ['What he did was call the police.', 'Việc anh ấy làm là gọi cảnh sát.', 1, 'Nhấn vào cả một hành động.'],
      ['What I need are new shoes.', 'Cái tôi cần là mấy đôi giày mới.', 1, '"are" hợp với "new shoes" số nhiều.'],
      ['What bothers me is the noise, not the dust.', 'Cái làm tôi khó chịu là tiếng ồn, không phải bụi.', 1, 'Rất hợp khi cần đính chính.'],
      ['What I need it is a holiday.', 'Cái tôi cần là một kỳ nghỉ.', 0, 'Sai: sửa thành "What I need is a holiday."'],
      ['What I need is new shoes.', 'Cái tôi cần là mấy đôi giày mới.', 0, 'Sai: sửa thành "What I need are new shoes."']
    ],
    practice: [
      ['What I need ___ (is / it is) a good night of sleep.', 'is', 'Cái tôi cần là một giấc ngủ ngon.'],
      ['What I need ___ (are / is) new shoes.', 'are', 'Cái tôi cần là mấy đôi giày mới.'],
      ['What he did ___ (was call / was called) the police.', 'was call', 'Việc anh ấy làm là gọi cảnh sát.'],
      ['In a wh-cleft the emphasis falls at the ___ (end / beginning).', 'end', 'Trong câu chẻ với "What", chỗ nhấn nằm ở cuối câu.'],
      ['___ (What / Which) bothers me is the noise.', 'What', 'Cái làm tôi khó chịu là tiếng ồn.'],
      ['What she wants ___ (is / are) more time.', 'is', 'Cái cô ấy muốn là thêm thời gian.'],
      ['___ (All I want / All what I want) is a quiet evening.', 'All I want', 'Tất cả những gì tôi muốn là một buổi tối yên tĩnh.'],
      ['The verb agrees with the ___ (focus / word What).', 'focus', 'Động từ "be" hợp với phần nhấn chứ không theo chữ "What".'],
      ['What they need ___ (are / is) better tools.', 'are', 'Cái họ cần là những công cụ tốt hơn.'],
      ['What I said ___ (was / were) that we should wait.', 'was', 'Điều tôi nói là chúng ta nên đợi.']
    ]
  },

  {
    slug: 'negative-inversion-basic',
    en: 'Inversion after negative adverbials',
    vi: 'Đảo ngữ sau trạng ngữ phủ định — Never, Rarely, Seldom',
    level: 'B2',
    summary: 'Đưa trạng ngữ phủ định lên đầu câu thì BẮT BUỘC đảo trợ động từ lên trước chủ ngữ, y như đang đặt câu hỏi.',
    formula: {
      rows: [
        ['Khung câu', 'TRẠNG NGỮ PHỦ ĐỊNH + TRỢ ĐỘNG TỪ + CHỦ NGỮ + động từ chính'],
        ['Có sẵn trợ động từ', 'NEVER HAVE I seen such a mess.'],
        ['Không có thì mượn do/does/did', 'RARELY DOES he arrive on time.'],
        ['Nhóm trạng ngữ hay gặp', 'never · rarely · seldom · hardly ever · at no time · on no account']
      ],
      note: 'Mẹo nhớ: đảo y hệt khi đặt câu hỏi, chỉ khác là không có dấu hỏi. "Have I seen…?" thành "Never have I seen…". Nếu câu gốc không có trợ động từ thì mượn do, does hoặc did, và động từ chính về nguyên thể trần.'
    },
    signals: ['Never', 'Rarely', 'Seldom', 'Hardly ever', 'At no time', 'trạng ngữ phủ định đứng đầu'],
    useWhen: [
      'Bài Viết trang trọng: câu mở đoạn có sức nặng hơn hẳn trật tự thường.',
      'Nhấn vào chuyện hiếm hoi hoặc chưa từng xảy ra.',
      'Văn nói trịnh trọng, diễn văn, bài phát biểu.'
    ],
    useNot: [
      { what: 'Không giữ trật tự thường sau trạng ngữ phủ định đứng đầu.', why: '"Never I have seen such a mess" sai. Đưa trạng ngữ phủ định lên đầu là phải đảo.' },
      { what: 'Không dùng tràn lan trong văn thân mật.', why: 'Giọng khá trịnh trọng. Nói chuyện thường ngày thì "I have never seen such a mess" tự nhiên hơn.' }
    ],
    confuse: [
      {
        with: 'trạng ngữ đứng đầu khác trạng ngữ đứng giữa',
        tell: 'Trạng ngữ phủ định ở đầu câu thì đảo. Nằm ở vị trí thường giữa câu thì không đảo.',
        pair: [
          { en: 'Never have I seen such a mess.', vi: 'Chưa bao giờ tôi thấy bừa bộn đến thế (đứng đầu nên đảo).' },
          { en: 'I have never seen such a mess.', vi: 'Tôi chưa bao giờ thấy bừa bộn đến thế (trật tự thường).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Never I have seen such a mess.', right: 'Never have I seen such a mess.', why: 'Trạng ngữ phủ định đứng đầu thì bắt buộc đảo trợ động từ.' },
      { wrong: 'Rarely he arrives on time.', right: 'Rarely does he arrive on time.', why: 'Không có sẵn trợ động từ thì mượn "does", động từ chính về nguyên thể trần.' }
    ],
    examples: [
      ['Never have I seen such a mess.', 'Chưa bao giờ tôi thấy bừa bộn đến thế.', 1, 'Đảo y như đặt câu hỏi, chỉ khác là không có dấu hỏi.'],
      ['Rarely does he arrive on time.', 'Anh ta hiếm khi tới đúng giờ.', 1, 'Không có trợ động từ sẵn nên mượn "does".'],
      ['Seldom had they faced such a difficult case.', 'Họ hiếm khi gặp ca khó đến vậy.', 1, 'Đảo ở thì quá khứ hoàn thành.'],
      ['At no time did the company admit responsibility.', 'Chưa lúc nào công ty nhận trách nhiệm.', 1, 'Cụm "at no time" cũng kéo theo đảo ngữ.'],
      ['Never I have seen such a mess.', 'Chưa bao giờ tôi thấy bừa bộn đến thế.', 0, 'Sai: sửa thành "Never have I seen such a mess."'],
      ['Rarely he arrives on time.', 'Anh ta hiếm khi tới đúng giờ.', 0, 'Sai: sửa thành "Rarely does he arrive on time."']
    ],
    practice: [
      ['Never ___ (have I / I have) seen such a mess.', 'have I', 'Chưa bao giờ tôi thấy bừa bộn đến thế.'],
      ['Rarely ___ (does he arrive / he arrives) on time.', 'does he arrive', 'Anh ta hiếm khi tới đúng giờ.'],
      ['Seldom ___ (had they / they had) faced such a case.', 'had they', 'Họ hiếm khi gặp ca như vậy.'],
      ['At no time ___ (did the company admit / the company admitted) responsibility.', 'did the company admit', 'Chưa lúc nào công ty nhận trách nhiệm.'],
      ['The inversion looks like the word order of a ___ (question / command).', 'question', 'Trật tự đảo trông y như trật tự câu hỏi.'],
      ['Hardly ever ___ (do we / we do) eat out these days.', 'do we', 'Dạo này chúng tôi hiếm khi ăn ngoài.'],
      ['On no account ___ (should you / you should) leave the door open.', 'should you', 'Tuyệt đối không được để cửa mở.'],
      ['Never ___ (had I heard / I had heard) that story before.', 'had I heard', 'Chưa bao giờ tôi nghe chuyện đó trước đây.'],
      ['Without fronting: ___ (I have never seen it / Never I have seen it).', 'I have never seen it', 'Không đảo lên đầu thì viết theo trật tự thường.'],
      ['Rarely ___ (did she complain / she complained) about the noise.', 'did she complain', 'Cô ấy hiếm khi than phiền về tiếng ồn.']
    ]
  },

  {
    slug: 'emphatic-pronouns',
    en: 'Emphatic reflexive pronouns',
    vi: 'Đại từ phản thân dùng để nhấn — I did it myself',
    level: 'B2',
    summary: 'Cùng một bộ myself, himself, themselves nhưng hai vai khác hẳn: làm tân ngữ thì là phản thân, còn đứng thêm vào thì là nhấn mạnh.',
    formula: {
      rows: [
        ['Nhấn mạnh, bỏ đi câu vẫn đủ', 'I did it MYSELF. / The manager HIMSELF apologised.'],
        ['Phản thân, bỏ đi câu gãy', 'I hurt MYSELF. (myself là tân ngữ bắt buộc)'],
        ['Vị trí khi nhấn', 'Ngay sau chủ ngữ, hoặc đặt ở cuối câu.'],
        ['by + phản thân = một mình', 'She lives BY HERSELF. (sống một mình)']
      ],
      note: 'Phép thử một giây: bỏ đại từ đó ra. Câu vẫn đủ nghĩa thì nó đang làm nhiệm vụ nhấn mạnh; câu gãy mất tân ngữ thì nó là đại từ phản thân thật. "I did it" vẫn đủ nên "myself" là nhấn; "I hurt" thì cụt nên "myself" là tân ngữ.'
    },
    signals: ['myself', 'himself', 'herself', 'themselves', 'the very', 'by myself'],
    useWhen: [
      'Nhấn rằng chính người đó làm, không nhờ ai: "I cooked it myself."',
      'Nhấn vào chức vụ hay vai vế: "The director himself came to the meeting."',
      'Nói mình tự làm một mình: "by myself".'
    ],
    useNot: [
      { what: 'Không dùng đại từ phản thân làm chủ ngữ.', why: '"Myself will do it" sai. Chủ ngữ phải là "I": "I will do it myself."' },
      { what: 'Không dùng phản thân sau giới từ chỉ nơi chốn.', why: '"He put the bag beside himself" nghe lạ; chỗ này dùng "him": "beside him".' }
    ],
    confuse: [
      {
        with: 'nhấn mạnh khác phản thân',
        tell: 'Bỏ đại từ ra: câu vẫn đủ thì là nhấn mạnh, câu cụt thì là phản thân.',
        pair: [
          { en: 'I did it myself.', vi: 'Chính tôi tự làm việc đó (bỏ "myself" thì câu vẫn đủ).' },
          { en: 'I hurt myself.', vi: 'Tôi làm mình bị thương (bỏ "myself" thì câu cụt).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Myself will do it tomorrow.', right: 'I will do it myself tomorrow.', why: 'Đại từ phản thân không làm chủ ngữ được.' },
      { wrong: 'The manager apologised himself the delay.', right: 'The manager himself apologised for the delay.', why: 'Khi nhấn thì đại từ đứng ngay sau chủ ngữ hoặc ở cuối câu.' }
    ],
    examples: [
      ['I cooked the whole meal myself.', 'Chính tôi tự nấu cả bữa.', 1, 'Bỏ "myself" thì câu vẫn đủ nên đây là nhấn mạnh.'],
      ['The manager himself apologised for the delay.', 'Đích thân quản lý xin lỗi vì sự chậm trễ.', 1, 'Nhấn vào chức vụ, đứng ngay sau chủ ngữ.'],
      ['I hurt myself while cutting vegetables.', 'Tôi bị đứt tay khi thái rau.', 1, 'Đối chiếu: chỗ này "myself" là tân ngữ thật.'],
      ['She lives by herself in a small flat.', 'Cô ấy sống một mình trong căn hộ nhỏ.', 1, '"by + phản thân" nghĩa là một mình.'],
      ['Myself will do it tomorrow.', 'Chính tôi sẽ làm việc đó ngày mai.', 0, 'Sai: sửa thành "I will do it myself tomorrow."'],
      ['The manager apologised himself the delay.', 'Đích thân quản lý xin lỗi vì chậm trễ.', 0, 'Sai: sửa thành "The manager himself apologised for the delay."']
    ],
    practice: [
      ['I cooked the whole meal ___ (myself / me).', 'myself', 'Chính tôi tự nấu cả bữa.'],
      ['The manager ___ (himself / him) apologised for the delay.', 'himself', 'Đích thân quản lý xin lỗi vì chậm trễ.'],
      ['___ (I will do it myself / Myself will do it) tomorrow.', 'I will do it myself', 'Chính tôi sẽ làm việc đó ngày mai.'],
      ['I hurt ___ (myself / me) while cutting vegetables.', 'myself', 'Tôi bị đứt tay khi thái rau.'],
      ['She lives ___ (by herself / by her) in a small flat.', 'by herself', 'Cô ấy sống một mình trong căn hộ nhỏ.'],
      ['If you can delete the pronoun, it is ___ (emphatic / reflexive).', 'emphatic', 'Bỏ đại từ ra mà câu vẫn đủ thì nó đang nhấn mạnh.'],
      ['They built the house ___ (themselves / them).', 'themselves', 'Chính họ tự xây căn nhà.'],
      ['This is the ___ (very / much) book I was looking for.', 'very', 'Đây đúng là cuốn sách tôi đang tìm.'],
      ['The president ___ (herself / her) signed the letter.', 'herself', 'Đích thân tổng thống ký lá thư.'],
      ['He did not help at ___ (all / any).', 'all', 'Anh ta chẳng giúp gì cả.']
    ]
  },

  /* ==================== C1 ==================== */

  {
    slug: 'negative-inversion-advanced',
    en: 'Not only… / No sooner… / Hardly…',
    vi: 'Đảo ngữ nâng cao — Not only, No sooner, Hardly, Little did',
    level: 'C1',
    summary: 'Bốn khung cố định hay gặp trong bài Viết điểm cao. Bẫy lớn nhất là cặp từ đi kèm: "No sooner" đi với "than", "Hardly" đi với "when".',
    formula: {
      rows: [
        ['Not only … but also', 'NOT ONLY DID he arrive late, BUT he ALSO forgot the tickets.'],
        ['No sooner … THAN', 'NO SOONER HAD I sat down THAN the phone rang.'],
        ['Hardly / Scarcely … WHEN', 'HARDLY HAD I sat down WHEN the phone rang.'],
        ['Little did …', 'LITTLE DID he know that the job was already taken.']
      ],
      note: 'Nhớ cặp từ cho chắc: "No sooner… THAN", "Hardly… WHEN", "Scarcely… WHEN". Đổi chỗ hai từ này là lỗi kinh điển của bậc C1. "Little did he know" là cụm cố định, luôn dùng thì quá khứ và luôn mang ý người trong cuộc chưa hay biết.'
    },
    signals: ['Not only', 'No sooner … than', 'Hardly … when', 'Little did', 'Under no circumstances'],
    useWhen: [
      'Bài Viết: câu mở đoạn hoặc câu chốt cần sức nặng.',
      'Kể chuyện: "No sooner… than" dựng cảm giác hai việc xảy ra sát nhau.',
      'Nội quy và cảnh báo: "Under no circumstances should you…".'
    ],
    useNot: [
      { what: 'Không đổi chỗ "than" và "when".', why: '"No sooner had I sat down when…" sai. Đúng là "No sooner… than" và "Hardly… when".' },
      { what: 'Không quên đảo ở vế đầu của "Not only".', why: '"Not only he arrived late…" sai. Phải là "Not only did he arrive late…".' }
    ],
    confuse: [
      {
        with: '"No sooner … than" khác "Hardly … when"',
        tell: 'Hai khung cùng nghĩa nhưng cặp từ khác nhau. "No sooner" bắt cặp với "than"; "Hardly" và "Scarcely" bắt cặp với "when".',
        pair: [
          { en: 'No sooner had I sat down than the phone rang.', vi: 'Tôi vừa ngồi xuống thì điện thoại reo (cặp than).' },
          { en: 'Hardly had I sat down when the phone rang.', vi: 'Tôi vừa ngồi xuống thì điện thoại reo (cặp when).' }
        ]
      }
    ],
    errors: [
      { wrong: 'No sooner had I sat down when the phone rang.', right: 'No sooner had I sat down than the phone rang.', why: '"No sooner" luôn bắt cặp với "than".' },
      { wrong: 'Not only he arrived late, but he also forgot the tickets.', right: 'Not only did he arrive late, but he also forgot the tickets.', why: 'Vế đầu phải đảo trợ động từ lên trước chủ ngữ.' }
    ],
    examples: [
      ['Not only did he arrive late, but he also forgot the tickets.', 'Anh ta không những tới muộn mà còn quên cả vé.', 1, 'Vế đầu đảo, vế sau giữ trật tự thường.'],
      ['No sooner had I sat down than the phone rang.', 'Tôi vừa ngồi xuống thì điện thoại reo.', 1, 'Cặp cố định "No sooner… than".'],
      ['Hardly had I sat down when the phone rang.', 'Tôi vừa ngồi xuống thì điện thoại reo.', 1, 'Cùng nghĩa nhưng cặp từ là "when".'],
      ['Little did he know that the job was already taken.', 'Anh ta đâu biết rằng vị trí đó đã có người.', 1, 'Cụm cố định, hàm ý người trong cuộc chưa hay biết.'],
      ['No sooner had I sat down when the phone rang.', 'Tôi vừa ngồi xuống thì điện thoại reo.', 0, 'Sai: sửa thành "No sooner had I sat down than the phone rang."'],
      ['Not only he arrived late, but he also forgot the tickets.', 'Anh ta không những tới muộn mà còn quên cả vé.', 0, 'Sai: sửa thành "Not only did he arrive late, but he also forgot the tickets."']
    ],
    practice: [
      ['No sooner had I sat down ___ (than / when) the phone rang.', 'than', 'Tôi vừa ngồi xuống thì điện thoại reo.'],
      ['Hardly had I sat down ___ (when / than) the phone rang.', 'when', 'Tôi vừa ngồi xuống thì điện thoại reo.'],
      ['Not only ___ (did he arrive / he arrived) late, but he also forgot the tickets.', 'did he arrive', 'Anh ta không những tới muộn mà còn quên cả vé.'],
      ['Little ___ (did he know / he knew) that the job was taken.', 'did he know', 'Anh ta đâu biết vị trí đó đã có người.'],
      ['Under no circumstances ___ (should you / you should) share the password.', 'should you', 'Tuyệt đối không được chia sẻ mật khẩu.'],
      ['Scarcely had we left ___ (when / than) it started to rain.', 'when', 'Chúng tôi vừa đi khỏi thì trời đổ mưa.'],
      ['"No sooner" always pairs with ___ (than / when).', 'than', 'Cụm "no sooner" luôn bắt cặp với "than".'],
      ['Not only ___ (was the food cold / the food was cold), but the service was slow.', 'was the food cold', 'Không những đồ ăn nguội mà phục vụ còn chậm.'],
      ['No sooner ___ (had they arrived / they had arrived) than the show began.', 'had they arrived', 'Họ vừa tới thì buổi diễn bắt đầu.'],
      ['"Hardly" and "scarcely" pair with ___ (when / than).', 'when', 'Hai từ "hardly" và "scarcely" bắt cặp với "when".']
    ]
  },

  {
    slug: 'only-inversion',
    en: 'Inversion after Only…',
    vi: 'Đảo ngữ sau "Only" — Only then, Only when, Only after',
    level: 'C1',
    summary: 'Đưa cụm "Only…" lên đầu thì đảo — nhưng đảo ở MỆNH ĐỀ CHÍNH, không đảo ở mệnh đề đi liền sau "only".',
    formula: {
      rows: [
        ['Only + trạng ngữ', 'ONLY THEN DID I understand.'],
        ['Only + mệnh đề', 'ONLY WHEN you leave WILL YOU realise. (đảo ở vế sau)'],
        ['Only after + cụm', 'ONLY AFTER the meeting DID SHE explain.'],
        ['Ngoại lệ: only bổ nghĩa chủ ngữ', 'ONLY NAM knows the answer. — không đảo.']
      ],
      note: 'Chỗ rối nhất là "Only when you leave will you realise": mệnh đề "you leave" giữ trật tự thường, còn mệnh đề chính "will you realise" mới đảo. Lý do là phép đảo luôn xảy ra ở mệnh đề chính. Riêng khi "only" bổ nghĩa thẳng cho chủ ngữ thì không đảo gì cả.'
    },
    signals: ['Only then', 'Only when', 'Only after', 'Only by', 'Only if'],
    useWhen: [
      'Nhấn rằng phải tới lúc đó, phải qua bước đó thì việc kia mới xảy ra.',
      'Bài Viết: câu kết đoạn có sức nặng — "Only by working together can we solve this."',
      'Văn kể: dựng cao trào rồi mới bung ra nhận thức.'
    ],
    useNot: [
      { what: 'Không đảo trong chính mệnh đề đi sau "only when".', why: '"Only when do you leave will you realise" sai. Mệnh đề đó giữ trật tự thường: "Only when you leave will you realise."' },
      { what: 'Không đảo khi "only" bổ nghĩa cho chủ ngữ.', why: '"Only did Nam know the answer" sai. Ở đây "only" gắn thẳng vào chủ ngữ nên viết thường: "Only Nam knows the answer."' }
    ],
    confuse: [
      {
        with: 'đảo ở mệnh đề chính khác đảo ở mệnh đề phụ',
        tell: 'Tìm mệnh đề chính rồi đảo đúng ở đó. Mệnh đề đi liền sau "only when", "only after" giữ nguyên trật tự.',
        pair: [
          { en: 'Only when you leave will you realise.', vi: 'Chỉ khi bạn đi rồi mới nhận ra (vế sau đảo).' },
          { en: 'Only Nam knows the answer.', vi: 'Chỉ mình Nam biết đáp án (only gắn vào chủ ngữ, không đảo).' }
        ]
      }
    ],
    errors: [
      { wrong: 'Only when you leave, you will realise.', right: 'Only when you leave will you realise.', why: 'Mệnh đề chính phải đảo trợ động từ lên trước chủ ngữ.' },
      { wrong: 'Only did Nam know the answer.', right: 'Only Nam knew the answer.', why: '"only" bổ nghĩa cho chủ ngữ thì không đảo.' }
    ],
    examples: [
      ['Only then did I understand what she meant.', 'Mãi lúc đó tôi mới hiểu cô ấy nói gì.', 1, '"Only then" kéo theo đảo ngữ ở mệnh đề chính.'],
      ['Only when you leave will you realise how much you miss it.', 'Chỉ khi đi rồi bạn mới thấy nhớ đến nhường nào.', 1, 'Vế "you leave" giữ trật tự thường, vế chính mới đảo.'],
      ['Only after the meeting did she explain her decision.', 'Mãi sau cuộc họp cô ấy mới giải thích quyết định của mình.', 1, 'Cụm giới từ sau "only" cũng kéo theo đảo.'],
      ['Only Nam knew the answer.', 'Chỉ mình Nam biết đáp án.', 1, 'Ngoại lệ: "only" gắn vào chủ ngữ nên không đảo.'],
      ['Only when you leave, you will realise.', 'Chỉ khi đi rồi bạn mới nhận ra.', 0, 'Sai: sửa thành "Only when you leave will you realise."'],
      ['Only did Nam know the answer.', 'Chỉ mình Nam biết đáp án.', 0, 'Sai: sửa thành "Only Nam knew the answer."']
    ],
    practice: [
      ['Only then ___ (did I understand / I understood) what she meant.', 'did I understand', 'Mãi lúc đó tôi mới hiểu cô ấy nói gì.'],
      ['Only when you leave ___ (will you realise / you will realise) how much you miss it.', 'will you realise', 'Chỉ khi đi rồi bạn mới thấy nhớ.'],
      ['Only after the meeting ___ (did she explain / she explained) her decision.', 'did she explain', 'Mãi sau cuộc họp cô ấy mới giải thích.'],
      ['___ (Only Nam knew / Only did Nam know) the answer.', 'Only Nam knew', 'Chỉ mình Nam biết đáp án.'],
      ['The inversion happens in the ___ (main clause / only-clause).', 'main clause', 'Phép đảo xảy ra ở mệnh đề chính.'],
      ['Only by working together ___ (can we / we can) solve this.', 'can we', 'Chỉ khi hợp sức chúng ta mới giải quyết được.'],
      ['Only if you ask ___ (will they help / they will help).', 'will they help', 'Chỉ khi bạn hỏi họ mới giúp.'],
      ['Only in Hue ___ (can you / you can) find this dish.', 'can you', 'Chỉ ở Huế mới có món này.'],
      ['When "only" modifies the subject there is ___ (no inversion / always inversion).', 'no inversion', 'Khi "only" bổ nghĩa cho chủ ngữ thì không đảo.'],
      ['Only later ___ (did we learn / we learned) the truth.', 'did we learn', 'Mãi về sau chúng tôi mới biết sự thật.']
    ]
  },

  {
    slug: 'so-such-inversion',
    en: 'So… / Such… fronted with inversion',
    vi: 'Đảo ngữ với "So" và "Such" — So great was his anger…',
    level: 'C1',
    summary: 'Đưa phần chỉ mức độ lên đầu rồi đảo động từ. Văn phong trang trọng, hay gặp trong văn kể và bài luận.',
    formula: {
      rows: [
        ['So + tính từ + be + chủ ngữ', 'SO GREAT WAS his anger THAT he could not speak.'],
        ['Such + be + chủ ngữ', 'SUCH WAS the noise THAT we could not hear.'],
        ['Câu gốc', 'His anger was so great that… → So great was his anger that…'],
        ['Luôn có vế "that"', 'Mẫu này gần như luôn kéo theo một mệnh đề kết quả.']
      ],
      note: 'Đây là dạng đảo của mệnh đề kết quả "so… that" và "such… that". Cùng một nội dung, đưa phần mức độ lên đầu thì câu trang trọng và có sức nặng hơn hẳn. Nhớ đảo cho đủ: "So great his anger was" là thiếu một nửa việc.'
    },
    signals: ['So + tính từ + was', 'Such was', 'văn phong trang trọng', 'kéo theo mệnh đề that'],
    useWhen: [
      'Văn kể và văn tả: dựng cao trào cho một mức độ dữ dội.',
      'Bài luận: một câu như vậy giữa đoạn làm nhịp văn khác hẳn.',
      'Diễn văn và văn viết trịnh trọng.'
    ],
    useNot: [
      { what: 'Không quên đảo động từ.', why: '"So great his anger was that…" sai. Đưa phần mức độ lên đầu là phải đảo: "So great was his anger that…".' },
      { what: 'Không dùng trong văn thân mật.', why: 'Nghe rất kịch. Nói chuyện thường ngày thì "He was so angry that…" tự nhiên hơn nhiều.' }
    ],
    confuse: [
      {
        with: '"So + tính từ" khác "Such + danh từ"',
        tell: 'Sau "So" là tính từ trần. Sau "Such" là cụm danh từ, và "Such" đứng ngay trước "was".',
        pair: [
          { en: 'So great was his anger that he could not speak.', vi: 'Cơn giận lớn tới mức ông không nói nổi (so + tính từ).' },
          { en: 'Such was the noise that we could not hear.', vi: 'Tiếng ồn lớn tới mức chúng tôi không nghe được gì (such + danh từ).' }
        ]
      }
    ],
    errors: [
      { wrong: 'So great his anger was that he could not speak.', right: 'So great was his anger that he could not speak.', why: 'Thiếu phép đảo động từ lên trước chủ ngữ.' },
      { wrong: 'Such the noise was that we could not hear.', right: 'Such was the noise that we could not hear.', why: 'Cùng lý do: "was" phải đứng ngay sau "Such".' }
    ],
    examples: [
      ['So great was his anger that he could not speak.', 'Cơn giận lớn tới mức ông không nói nổi.', 1, 'Đảo dạng của mệnh đề kết quả, giọng trang trọng.'],
      ['Such was the noise that we could not hear each other.', 'Tiếng ồn lớn tới mức chúng tôi không nghe thấy nhau.', 1, '"Such" đứng ngay trước "was".'],
      ['So rapid was the change that few people noticed.', 'Thay đổi nhanh tới mức ít ai để ý.', 1, 'Rất hợp câu mở đoạn trong bài luận.'],
      ['He was so angry that he could not speak.', 'Ông ấy giận tới mức không nói nổi.', 1, 'Bản trật tự thường: cùng nghĩa, giọng bình thường hơn.'],
      ['So great his anger was that he could not speak.', 'Cơn giận lớn tới mức ông không nói nổi.', 0, 'Sai: sửa thành "So great was his anger that he could not speak."'],
      ['Such the noise was that we could not hear.', 'Tiếng ồn lớn tới mức chúng tôi không nghe được.', 0, 'Sai: sửa thành "Such was the noise that we could not hear."']
    ],
    practice: [
      ['So great ___ (was his anger / his anger was) that he could not speak.', 'was his anger', 'Cơn giận lớn tới mức ông không nói nổi.'],
      ['___ (Such was / Such) the noise that we could not hear.', 'Such was', 'Tiếng ồn lớn tới mức chúng tôi không nghe được.'],
      ['So rapid ___ (was the change / the change was) that few noticed.', 'was the change', 'Thay đổi nhanh tới mức ít ai để ý.'],
      ['After "So" you put an ___ (adjective / article).', 'adjective', 'Sau "So" là một tính từ.'],
      ['This pattern almost always leads to a ___ (that-clause / question).', 'that-clause', 'Mẫu này gần như luôn kéo theo một mệnh đề "that".'],
      ['So heavy ___ (was the rain / the rain was) that the match was cancelled.', 'was the rain', 'Mưa lớn tới mức trận đấu bị huỷ.'],
      ['Such ___ (was her skill / her skill was) that nobody could beat her.', 'was her skill', 'Tài nghệ của cô ấy tới mức không ai thắng nổi.'],
      ['The plain version is "He ___ (was so angry / so angry was) that he could not speak".', 'was so angry', 'Bản trật tự thường là "He was so angry that…".'],
      ['So sudden ___ (was the noise / the noise was) that everyone jumped.', 'was the noise', 'Tiếng động bất ngờ tới mức ai cũng giật mình.'],
      ['This style belongs to ___ (formal / casual) writing.', 'formal', 'Lối viết này thuộc văn phong trang trọng.']
    ]
  },

  {
    slug: 'fronting-no-inversion',
    en: 'Fronting without inversion',
    vi: 'Đưa lên đầu mà KHÔNG đảo — That book I have never read',
    level: 'C1',
    summary: 'Đưa tân ngữ hay bổ ngữ lên đầu để nhấn, nhưng phần còn lại giữ nguyên trật tự. Đây là chỗ đối chiếu quan trọng với đảo ngữ phủ định.',
    formula: {
      rows: [
        ['Đưa tân ngữ lên đầu', 'THAT BOOK I have never read. (không đảo)'],
        ['Đối lập hai vế', 'TEA I like; COFFEE I cannot stand.'],
        ['Đưa bổ ngữ lên đầu', 'THIS I know for certain.'],
        ['Khác hẳn đảo ngữ phủ định', 'NEVER have I read that book. (phủ định thì PHẢI đảo)']
      ],
      note: 'Hai phép cùng là "đưa lên đầu" mà luật ngược nhau, nên phải nhớ cho rõ: đưa TRẠNG NGỮ PHỦ ĐỊNH lên đầu thì bắt buộc đảo; đưa TÂN NGỮ hay BỔ NGỮ lên đầu thì tuyệt đối không đảo. "That book have I never read" là lỗi vì trộn hai luật vào nhau.'
    },
    signals: ['tân ngữ đứng đầu câu', 'đối lập hai vế', 'chủ ngữ và động từ giữ nguyên trật tự'],
    useWhen: [
      'Đối lập hai thứ ngay cạnh nhau: "Tea I like; coffee I cannot stand."',
      'Nối mạch với câu trước bằng cách đưa thông tin cũ lên đầu.',
      'Nhấn giọng trong văn nói và văn kể.'
    ],
    useNot: [
      { what: 'Không đảo khi đưa tân ngữ lên đầu.', why: '"That book have I never read" sai. Chỉ trạng ngữ phủ định mới kéo theo đảo ngữ.' },
      { what: 'Không lạm dụng trong bài viết trang trọng.', why: 'Lối này khá đậm chất văn nói và văn kể; bài học thuật dùng nhiều nghe kịch.' }
    ],
    confuse: [
      {
        with: 'đưa tân ngữ lên đầu khác đưa trạng ngữ phủ định lên đầu',
        tell: 'Thành phần đưa lên đầu là tân ngữ hay bổ ngữ thì không đảo. Là trạng ngữ phủ định thì phải đảo.',
        pair: [
          { en: 'That book I have never read.', vi: 'Cuốn sách đó thì tôi chưa đọc bao giờ (không đảo).' },
          { en: 'Never have I read that book.', vi: 'Chưa bao giờ tôi đọc cuốn sách đó (phủ định nên đảo).' }
        ]
      }
    ],
    errors: [
      { wrong: 'That book have I never read.', right: 'That book I have never read.', why: 'Đưa tân ngữ lên đầu thì không đảo.' },
      { wrong: 'Never I have read that book.', right: 'Never have I read that book.', why: 'Ngược lại: trạng ngữ phủ định lên đầu thì bắt buộc đảo.' }
    ],
    examples: [
      ['That book I have never read.', 'Cuốn sách đó thì tôi chưa đọc bao giờ.', 1, 'Tân ngữ lên đầu, phần còn lại giữ nguyên trật tự.'],
      ['Tea I like; coffee I cannot stand.', 'Trà thì tôi thích; cà phê thì tôi chịu không nổi.', 1, 'Đưa lên đầu để đối lập hai vế cho rõ.'],
      ['This I know for certain.', 'Điều này thì tôi chắc chắn.', 1, 'Đưa bổ ngữ lên đầu, giọng nhấn mạnh.'],
      ['Never have I read that book.', 'Chưa bao giờ tôi đọc cuốn sách đó.', 1, 'Đối chiếu: trạng ngữ phủ định lên đầu thì phải đảo.'],
      ['That book have I never read.', 'Cuốn sách đó thì tôi chưa đọc bao giờ.', 0, 'Sai: sửa thành "That book I have never read."'],
      ['Never I have read that book.', 'Chưa bao giờ tôi đọc cuốn sách đó.', 0, 'Sai: sửa thành "Never have I read that book."']
    ],
    practice: [
      ['That book ___ (I have never read / have I never read).', 'I have never read', 'Cuốn sách đó thì tôi chưa đọc bao giờ.'],
      ['Never ___ (have I read / I have read) that book.', 'have I read', 'Chưa bao giờ tôi đọc cuốn sách đó.'],
      ['Tea I like; coffee ___ (I cannot stand / cannot I stand).', 'I cannot stand', 'Trà thì tôi thích; cà phê thì tôi chịu không nổi.'],
      ['This ___ (I know / know I) for certain.', 'I know', 'Điều này thì tôi chắc chắn.'],
      ['Fronting an object requires ___ (no inversion / inversion).', 'no inversion', 'Đưa tân ngữ lên đầu thì không đảo.'],
      ['Fronting a negative adverbial requires ___ (inversion / no inversion).', 'inversion', 'Đưa trạng ngữ phủ định lên đầu thì phải đảo.'],
      ['His name ___ (I could not remember / could I not remember).', 'I could not remember', 'Tên anh ta thì tôi không nhớ nổi.'],
      ['Rarely ___ (does she complain / she complains).', 'does she complain', 'Cô ấy hiếm khi than phiền.'],
      ['The rest of the sentence keeps its ___ (normal / question) order.', 'normal', 'Phần còn lại của câu giữ trật tự thường.'],
      ['Those photos ___ (we kept / kept we) for years.', 'we kept', 'Mấy tấm ảnh đó chúng tôi giữ suốt bao năm.']
    ]
  },

  {
    slug: 'cleft-variants',
    en: 'All-clefts and noun-headed clefts',
    vi: 'Biến thể câu chẻ — All I want is…, The reason why… is…',
    level: 'C1',
    summary: 'Cùng họ với câu chẻ "What" nhưng thay "What" bằng "All", "The thing", "The reason", "The place". Mỗi từ đầu định sẵn loại thông tin sắp nói.',
    formula: {
      rows: [
        ['All = chỉ mỗi', 'ALL I want IS a quiet evening.'],
        ['The thing that…', 'THE THING THAT bothers me IS the noise.'],
        ['The reason why…', 'THE REASON WHY he left IS still unclear.'],
        ['The place where…', 'THE PLACE WHERE we met HAS closed down.']
      ],
      note: '"All I want" mang thêm sắc thái "chỉ mỗi thế thôi, không đòi gì hơn" — đó là chỗ khác với "What I want". Và nhớ không có "what" sau "All": "All what I want" là lỗi rất hay gặp, vì "All" đã gánh vai của "what" rồi.'
    },
    signals: ['All I want is', 'The thing that', 'The reason why', 'The place where'],
    useWhen: [
      'Rút gọn yêu cầu xuống một điều duy nhất: "All I need is your signature."',
      'Bài Viết: câu chủ đề nêu thẳng vấn đề — "The reason why this matters is…".',
      'Đính chính và làm rõ trong hội thoại.'
    ],
    useNot: [
      { what: 'Không thêm "what" sau "All".', why: '"All what I want is…" sai. "All" đã thay cho "what" rồi: "All I want is…".' },
      { what: 'Không dùng "because" sau "The reason is".', why: '"The reason is because he left" là thừa; viết "The reason is that he left".' }
    ],
    confuse: [
      {
        with: '"All I want" khác "What I want"',
        tell: '"All" thêm sắc thái chỉ mỗi thế thôi. "What" thì trung tính, không hàm ý ít hay nhiều.',
        pair: [
          { en: 'All I want is a quiet evening.', vi: 'Tôi chỉ muốn mỗi một buổi tối yên tĩnh thôi (hàm ý không đòi gì hơn).' },
          { en: 'What I want is a quiet evening.', vi: 'Cái tôi muốn là một buổi tối yên tĩnh (trung tính).' }
        ]
      }
    ],
    errors: [
      { wrong: 'All what I want is a quiet evening.', right: 'All I want is a quiet evening.', why: '"All" đã gánh vai của "what" nên bỏ "what" đi.' },
      { wrong: 'The reason is because he left early.', right: 'The reason is that he left early.', why: '"The reason is because" là thừa nghĩa; dùng "that".' }
    ],
    examples: [
      ['All I want is a quiet evening at home.', 'Tôi chỉ muốn mỗi một buổi tối yên tĩnh ở nhà.', 1, '"All" thêm sắc thái chỉ mỗi thế thôi.'],
      ['The thing that bothers me is the noise.', 'Cái làm tôi khó chịu là tiếng ồn.', 1, 'Danh từ đứng đầu định sẵn loại thông tin sắp nói.'],
      ['The reason why he left is still unclear.', 'Lý do anh ấy rời đi tới giờ vẫn chưa rõ.', 1, 'Rất hợp làm câu chủ đề của đoạn.'],
      ['The place where we first met has closed down.', 'Chỗ chúng tôi gặp nhau lần đầu đã đóng cửa.', 1, 'Cùng họ, chỉ đổi danh từ đầu.'],
      ['All what I want is a quiet evening.', 'Tôi chỉ muốn một buổi tối yên tĩnh.', 0, 'Sai: sửa thành "All I want is a quiet evening."'],
      ['The reason is because he left early.', 'Lý do là vì anh ấy về sớm.', 0, 'Sai: sửa thành "The reason is that he left early."']
    ],
    practice: [
      ['___ (All I want / All what I want) is a quiet evening.', 'All I want', 'Tôi chỉ muốn mỗi một buổi tối yên tĩnh.'],
      ['The thing ___ (that / what) bothers me is the noise.', 'that', 'Cái làm tôi khó chịu là tiếng ồn.'],
      ['The reason ___ (why / because) he left is still unclear.', 'why', 'Lý do anh ấy rời đi vẫn chưa rõ.'],
      ['The reason is ___ (that / because) he left early.', 'that', 'Lý do là anh ấy về sớm.'],
      ['"All" already replaces ___ (what / that).', 'what', 'Chữ "All" đã thay cho "what" rồi.'],
      ['___ (All I need / All what I need) is your signature.', 'All I need', 'Tôi chỉ cần chữ ký của bạn thôi.'],
      ['The place ___ (where / which) we first met has closed.', 'where', 'Chỗ chúng tôi gặp nhau lần đầu đã đóng cửa.'],
      ['"All I want" suggests ___ (nothing more / a lot more).', 'nothing more', 'Cụm "All I want" hàm ý chỉ mỗi thế, không đòi gì hơn.'],
      ['The thing ___ (I remember / what I remember) most is the smell.', 'I remember', 'Cái tôi nhớ nhất là mùi hương.'],
      ['All she did ___ (was smile / was smiled).', 'was smile', 'Tất cả những gì cô ấy làm là mỉm cười.']
    ]
  },

  {
    slug: 'reverse-cleft',
    en: 'Reverse clefts: That is what I meant',
    vi: 'Câu chẻ đảo — That is what I meant',
    level: 'C1',
    summary: 'Đảo ngược câu chẻ "What": đặt phần trỏ ngược lên trước rồi mới tới mệnh đề "wh-". Công cụ nối ý rất mạnh trong hội thoại và bài Nói.',
    formula: {
      rows: [
        ['Khung câu', 'That / This + be + wh- + MỆNH ĐỀ'],
        ['Xác nhận', 'THAT IS WHAT I meant.'],
        ['Nêu lý do', 'THIS IS WHY I called you.'],
        ['Chỉ ra chỗ sai', 'THAT IS WHERE you are wrong.']
      ],
      note: 'Sức mạnh của mẫu này nằm ở chữ "That" và "This": chúng trỏ ngược về điều vừa nói, nên câu vừa nhấn vừa nối mạch. Trong phần Nói của kỳ thi, đây là cách bám vào lời người đối thoại rất tự nhiên.'
    },
    signals: ['That is what', 'This is why', 'That is where', 'That is how'],
    useWhen: [
      'Xác nhận hoặc đính chính điều người kia vừa hiểu: "That is what I meant."',
      'Bài Nói: bám vào lời vừa nghe rồi triển khai tiếp.',
      'Văn viết: nối câu trước với câu sau mà không cần từ nối.'
    ],
    useNot: [
      { what: 'Không dùng "which" thay cho "what".', why: '"That is which I meant" sai. Ở đây phải là "what" vì nó mang sẵn nghĩa "điều mà".' },
      { what: 'Không thêm "that" sau mệnh đề wh-.', why: '"That is what that I meant" thừa. Chỉ một từ nối là đủ.' }
    ],
    confuse: [
      {
        with: 'câu chẻ đảo khác câu chẻ "What" thường',
        tell: 'Mệnh đề "wh-" đứng trước thì là câu chẻ thường. Đứng sau thì là câu chẻ đảo.',
        pair: [
          { en: 'What I meant was that we should wait.', vi: 'Ý tôi là chúng ta nên đợi (mệnh đề wh- đứng trước).' },
          { en: 'That is what I meant.', vi: 'Đúng ý tôi là thế (mệnh đề wh- đứng sau).' }
        ]
      }
    ],
    errors: [
      { wrong: 'That is which I meant.', right: 'That is what I meant.', why: 'Chỗ này dùng "what" vì nó mang sẵn nghĩa "điều mà".' },
      { wrong: 'This is why that I called you.', right: 'This is why I called you.', why: 'Thừa "that"; một từ nối là đủ.' }
    ],
    examples: [
      ['That is exactly what I meant.', 'Đúng y ý tôi là thế.', 1, '"That" trỏ ngược về điều vừa nói nên câu vừa nhấn vừa nối.'],
      ['This is why I called you so early.', 'Đây chính là lý do tôi gọi bạn sớm thế.', 1, 'Nêu lý do và nối mạch cùng lúc.'],
      ['That is where you are wrong.', 'Đó chính là chỗ bạn nhầm.', 1, 'Chỉ ra chỗ sai một cách dứt khoát.'],
      ['What I meant was that we should wait.', 'Ý tôi là chúng ta nên đợi.', 1, 'Bản chẻ thường: mệnh đề wh- đứng trước.'],
      ['That is which I meant.', 'Đúng ý tôi là thế.', 0, 'Sai: sửa thành "That is what I meant."'],
      ['This is why that I called you.', 'Đây là lý do tôi gọi bạn.', 0, 'Sai: sửa thành "This is why I called you."']
    ],
    practice: [
      ['That is exactly ___ (what / which) I meant.', 'what', 'Đúng y ý tôi là thế.'],
      ['This is ___ (why / because) I called you so early.', 'why', 'Đây chính là lý do tôi gọi bạn sớm thế.'],
      ['That is ___ (where / which) you are wrong.', 'where', 'Đó chính là chỗ bạn nhầm.'],
      ['This is ___ (why I called / why that I called) you.', 'why I called', 'Đây là lý do tôi gọi bạn.'],
      ['In a reverse cleft the wh-clause comes ___ (second / first).', 'second', 'Trong câu chẻ đảo, mệnh đề "wh-" đứng sau.'],
      ['That is ___ (how / what) we solved the problem.', 'how', 'Đó là cách chúng tôi giải quyết vấn đề.'],
      ['This is ___ (what / that) worries me most.', 'what', 'Đây là điều làm tôi lo nhất.'],
      ['The words "that" and "this" point ___ (backwards / forwards) to what was just said.', 'backwards', 'Hai chữ "that" và "this" trỏ ngược về điều vừa nói.'],
      ['That is ___ (when / what) the trouble started.', 'when', 'Đó là lúc rắc rối bắt đầu.'],
      ['___ (That is what / What is that) I have been trying to say.', 'That is what', 'Đó chính là điều tôi cố nói nãy giờ.']
    ]
  },

  {
    slug: 'emphasis-adverbs',
    en: 'Emphasising adverbs and negative phrases',
    vi: 'Trạng từ nhấn mạnh — indeed, at all, whatsoever, by no means',
    level: 'C1',
    summary: 'Bộ trạng từ và cụm để tăng đô cho câu. Mỗi từ có chỗ đứng riêng và ràng buộc riêng, nhất là nhóm chỉ dùng được trong câu phủ định.',
    formula: {
      rows: [
        ['indeed = quả thật', 'It was INDEED a mistake. / Very good INDEED.'],
        ['at all, whatsoever — chỉ trong câu phủ định', 'no evidence WHATSOEVER · not tired AT ALL'],
        ['by no means, in no way — đảo khi đứng đầu', 'BY NO MEANS IS THIS the end.'],
        ['Vị trí của whatsoever', 'Đứng ngay sau cụm danh từ phủ định: no doubt WHATSOEVER.']
      ],
      note: '"whatsoever" và "at all" chỉ sống được trong câu phủ định hoặc câu hỏi — viết "There is evidence whatsoever" là sai. Còn "by no means" và "in no way" mang sẵn nghĩa phủ định nên khi đưa lên đầu câu thì kéo theo đảo ngữ, y như "never" và "rarely".'
    },
    signals: ['indeed', 'at all', 'whatsoever', 'by no means', 'in no way'],
    useWhen: [
      'Tăng đô cho một nhận định: "The results were indeed surprising."',
      'Phủ định dứt khoát trong văn trang trọng: "There is no evidence whatsoever."',
      'Bác bỏ mạnh trong bài Viết tranh luận: "By no means is this the only explanation."'
    ],
    useNot: [
      { what: 'Không dùng "whatsoever" hay "at all" trong câu khẳng định.', why: '"There is evidence whatsoever" sai. Hai từ này chỉ đi với câu phủ định hoặc câu hỏi.' },
      { what: 'Không quên đảo khi đưa "by no means" lên đầu.', why: '"By no means this is the end" sai. Cụm này mang nghĩa phủ định nên kéo theo đảo: "By no means is this the end."' }
    ],
    confuse: [
      {
        with: '"indeed" khác "whatsoever"',
        tell: '"indeed" dùng được cả câu khẳng định lẫn phủ định. "whatsoever" chỉ sống trong câu phủ định.',
        pair: [
          { en: 'The results were indeed surprising.', vi: 'Kết quả quả thật đáng ngạc nhiên (câu khẳng định).' },
          { en: 'There was no evidence whatsoever.', vi: 'Chẳng có bằng chứng nào hết (bắt buộc phủ định).' }
        ]
      }
    ],
    errors: [
      { wrong: 'There is evidence whatsoever for this claim.', right: 'There is no evidence whatsoever for this claim.', why: '"whatsoever" chỉ dùng được sau một cụm danh từ phủ định.' },
      { wrong: 'By no means this is the end of the story.', right: 'By no means is this the end of the story.', why: 'Cụm phủ định đứng đầu thì kéo theo đảo ngữ.' }
    ],
    examples: [
      ['The results were indeed surprising.', 'Kết quả quả thật đáng ngạc nhiên.', 1, '"indeed" tăng đô cho một nhận định.'],
      ['There was no evidence whatsoever for the claim.', 'Chẳng có bằng chứng nào cho khẳng định đó.', 1, '"whatsoever" bám ngay sau cụm danh từ phủ định.'],
      ['By no means is this the end of the story.', 'Đây hoàn toàn chưa phải hồi kết.', 1, 'Cụm phủ định đứng đầu nên đảo ngữ.'],
      ['I was not tired at all after the walk.', 'Đi bộ xong tôi chẳng mệt chút nào.', 1, '"at all" đứng cuối câu phủ định.'],
      ['There is evidence whatsoever for this claim.', 'Chẳng có bằng chứng nào cho khẳng định đó.', 0, 'Sai: sửa thành "There is no evidence whatsoever for this claim."'],
      ['By no means this is the end of the story.', 'Đây hoàn toàn chưa phải hồi kết.', 0, 'Sai: sửa thành "By no means is this the end of the story."']
    ],
    practice: [
      ['The results were ___ (indeed / whatsoever) surprising.', 'indeed', 'Kết quả quả thật đáng ngạc nhiên.'],
      ['There was ___ (no evidence whatsoever / evidence whatsoever) for the claim.', 'no evidence whatsoever', 'Chẳng có bằng chứng nào cho khẳng định đó.'],
      ['By no means ___ (is this / this is) the end of the story.', 'is this', 'Đây hoàn toàn chưa phải hồi kết.'],
      ['I was not tired ___ (at all / whatsoever) after the walk.', 'at all', 'Đi bộ xong tôi chẳng mệt chút nào.'],
      ['"Whatsoever" only works in a ___ (negative / positive) sentence.', 'negative', 'Từ "whatsoever" chỉ dùng được trong câu phủ định.'],
      ['In no way ___ (does this excuse / this excuses) his behaviour.', 'does this excuse', 'Điều đó hoàn toàn không bào chữa được cho cách cư xử của anh ta.'],
      ['She had no doubt ___ (whatsoever / indeed) about the decision.', 'whatsoever', 'Cô ấy không hề nghi ngờ gì về quyết định đó.'],
      ['Thank you very much ___ (indeed / at all).', 'indeed', 'Thật sự cảm ơn bạn rất nhiều.'],
      ['"By no means" at the front triggers ___ (inversion / no change).', 'inversion', 'Cụm "by no means" đứng đầu thì kéo theo đảo ngữ.'],
      ['He did not help ___ (at all / whatsoever).', 'at all', 'Anh ta chẳng giúp gì cả.']
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
