/**
 * Bộ format đề chuẩn cho từng kỳ thi — phần "kiến thức học thuật" của nền tảng.
 *
 * Mỗi format mô tả đúng cấu trúc đề thật: có bao nhiêu phần, mỗi phần bao nhiêu
 * câu, bao nhiêu phút, dạng câu nào, chấm theo thang gì. Admin chọn format là
 * trình sinh đề tự động có sẵn blueprint chuẩn, không phải gõ tay từng con số.
 *
 * Cấu trúc một format:
 *   id          mã duy nhất
 *   familyId    thuộc kỳ thi nào
 *   name        tên hiển thị
 *   kind        'full' (trọn bài) | 'module' (một kỹ năng) | 'mini' (rút gọn để luyện)
 *   levels      các bậc dùng được
 *   scoring     mô tả thang điểm
 *   guide       hướng dẫn hiện ở màn chuẩn bị
 *   sections[]  các KHỐI CÓ ĐỒNG HỒ RIÊNG — đây chính là blueprint gửi cho
 *               POST /api/admin/tests/generate
 *     name, skill, type (nhãn), items, minutes, types[] (lọc dạng câu khi bốc)
 *     parts[]   chi tiết bên trong khối, chỉ để hiển thị và giải thích thiết kế
 *   notes[]     lưu ý học thuật: vì sao chia như vậy, bẫy hay gặp
 *
 * Nguồn: tài liệu công bố của từng tổ chức khảo thí; VEPT/VPET theo định dạng
 * VSTEP.3-5 (Thông tư 01/2014/TT-BGDĐT). Xem docs/SCORING.md.
 */
'use strict';

/* Định dạng VSTEP dùng chung cho VEPT và VPET — hai chứng chỉ nội địa cùng khung */
function vstepSections() {
  return [
    {
      name: 'Listening', skill: 'listening', type: 'Trắc nghiệm', items: 35, minutes: 40,
      types: ['mcq'],
      parts: [
        { label: 'Part 1', items: 8, note: 'Thông báo, hướng dẫn ngắn — nghe một lần' },
        { label: 'Part 2', items: 12, note: 'Hội thoại giữa hai người' },
        { label: 'Part 3', items: 15, note: 'Bài nói, bài giảng dài' }
      ]
    },
    {
      name: 'Reading', skill: 'reading', type: 'Đọc hiểu 4 bài', items: 40, minutes: 60,
      types: ['mcq'],
      parts: [
        { label: 'Passage 1', items: 10, note: 'Chủ đề đời sống, độ khó thấp nhất' },
        { label: 'Passage 2', items: 10, note: 'Chủ đề xã hội' },
        { label: 'Passage 3', items: 10, note: 'Chủ đề khoa học phổ thông' },
        { label: 'Passage 4', items: 10, note: 'Chủ đề học thuật, độ khó cao nhất' }
      ]
    },
    {
      name: 'Writing', skill: 'writing', type: 'Hai bài viết', items: 2, minutes: 60,
      types: ['essay'],
      parts: [
        { label: 'Task 1', items: 1, note: 'Thư hoặc email khoảng 120 từ, ~20 phút' },
        { label: 'Task 2', items: 1, note: 'Bài luận khoảng 250 từ, ~40 phút' }
      ]
    },
    {
      name: 'Speaking', skill: 'speaking', type: 'Ba phần, ghi âm', items: 3, minutes: 12,
      types: ['speaking'],
      parts: [
        { label: 'Part 1', items: 1, note: 'Tương tác xã hội, 3–4 phút' },
        { label: 'Part 2', items: 1, note: 'Thảo luận giải pháp, 4 phút' },
        { label: 'Part 3', items: 1, note: 'Phát triển chủ đề, 5 phút' }
      ]
    }
  ];
}

/* ------------------------------------------------------------------ *
 * VPET blueprint — ten lettered parts, A to J, 55 items in total.
 *
 * Item counts are fixed by the published VPET part table:
 *   A Sentence Completion 10 · B Passage Reconstruction 3
 *   C Reading Comprehension 3 · D E-Mail Writing 2
 *   E Dictation 8 · F Response Selection 8 · G Passage Comprehension 6
 *   H Repeat 10 · I Speaking Situations 2 · J Story Retellings 3
 *
 * Skill and item type per part are the platform's mapping onto its own item
 * bank (mcq | gap | essay | speaking); minutes are editable defaults, since
 * the part table publishes counts only.
 * ------------------------------------------------------------------ */
function vpetSections() {
  return [
    {
      name: 'Part A - Sentence Completion', skill: 'writing', type: 'Type the missing word',
      items: 10, minutes: 10, types: ['gap'],
      parts: [{ label: 'A1-A10', items: 10, note: 'One word missing per sentence; grammar and collocation in context.' }]
    },
    {
      name: 'Part B - Passage Reconstruction', skill: 'writing', type: 'Read, then rewrite from memory',
      items: 3, minutes: 9, types: ['essay'],
      parts: [{ label: 'B1-B3', items: 3, note: 'Passage shown for a short time, then hidden; rebuild it in your own words.' }]
    },
    {
      name: 'Part C - Reading Comprehension', skill: 'reading', type: 'Multiple choice',
      items: 3, minutes: 6, types: ['mcq'],
      parts: [{ label: 'C1-C3', items: 3, note: 'Short passages, one question each.' }]
    },
    {
      name: 'Part D - E-Mail Writing', skill: 'writing', type: 'Two emails',
      items: 2, minutes: 18, types: ['essay'],
      parts: [{ label: 'D1-D2', items: 2, note: 'Reply to a prompt in a set register; graded on task, tone and accuracy.' }]
    },
    {
      name: 'Part E - Dictation', skill: 'listening', type: 'Type what you hear',
      items: 8, minutes: 6, types: ['gap'], needsAudio: true,
      parts: [{ label: 'E1-E8', items: 8, note: 'One sentence per item, played a fixed number of times. Needs audio.' }]
    },
    {
      name: 'Part F - Response Selection', skill: 'listening', type: 'Multiple choice',
      items: 8, minutes: 4, types: ['mcq'], needsAudio: true,
      parts: [{ label: 'F1-F8', items: 8, note: 'Hear a prompt, pick the natural reply. Needs audio.' }]
    },
    {
      name: 'Part G - Passage Comprehension', skill: 'listening', type: 'Multiple choice',
      items: 6, minutes: 6, types: ['mcq'], needsAudio: true,
      parts: [{ label: 'G1-G6', items: 6, note: 'Longer spoken passages with comprehension questions. Needs audio.' }]
    },
    {
      name: 'Part H - Repeat', skill: 'speaking', type: 'Say the sentence back',
      items: 10, minutes: 4, types: ['speaking'], needsAudio: true,
      parts: [{ label: 'H1-H10', items: 10, note: 'Repeat each sentence exactly. Scores pronunciation and fluency. Needs audio.' }]
    },
    {
      name: 'Part I - Speaking Situations', skill: 'speaking', type: 'Respond to a situation',
      items: 2, minutes: 4, types: ['speaking'],
      parts: [{ label: 'I1-I2', items: 2, note: 'Speak for up to a minute in the register the situation calls for.' }]
    },
    {
      name: 'Part J - Story Retellings', skill: 'speaking', type: 'Retell what you heard',
      items: 3, minutes: 6, types: ['speaking'], needsAudio: true,
      parts: [{ label: 'J1-J3', items: 3, note: 'Listen to a short story, then retell it in your own words. Needs audio.' }]
    }
  ];
}

const VPET_GUIDE = [
  'Ten parts, A to J, 55 items in one sitting. Every part has its own timer.',
  'Parts E, F, G, H and J play audio. Check your headphones before you start.',
  'Parts H, I and J record your voice. Speak after the beep and stay in the time shown.',
  'Reading and Listening are marked automatically; Writing and Speaking are AI scored, then a reviewer can override.'
];

const VPET_NOTES = [
  'Item counts follow the published VPET part table and are fixed: 10-3-3-2-8-8-6-10-2-3.',
  'Minutes shown are platform defaults; an admin can change them on each test without touching the blueprint.',
  'Audio parts cannot be generated until every question in them has an MP3 attached.'
];

const VSTEP_GUIDE = [
  'Mỗi kỹ năng chấm 0–10, làm tròn tới 0,5. Điểm tổng là trung bình cộng bốn kỹ năng.',
  'Từ 4,0 đến 5,5 đạt Bậc 3 (B1) · 6,0 đến 8,0 đạt Bậc 4 (B2) · 8,5 trở lên đạt Bậc 5 (C1).',
  'Phần Nghe chỉ phát một lần, hãy đọc lướt câu hỏi trước khi bắt đầu.'
];

const VSTEP_NOTES = [
  'Bốn kỹ năng thi liên tục, tổng khoảng 180 phút.',
  'Đọc xếp độ khó tăng dần qua bốn bài — đừng dồn thời gian cho bài đầu.',
  'Viết Task 2 chiếm trọng số lớn hơn Task 1 khi quy điểm kỹ năng Viết.'
];

const FORMATS = [
  /* ------------------------- VEPT ------------------------- */
  {
    id: 'vept-full', familyId: 'vept', kind: 'full',
    name: 'VEPT 4 kỹ năng (chuẩn VSTEP.3-5)',
    levels: ['B1', 'B2', 'C1'],
    scoring: 'Theo thang CEFR A1-C2, quy đổi từng kỹ năng',
    guide: VSTEP_GUIDE, notes: VSTEP_NOTES, sections: vstepSections()
  },

  /* ------------------------- VPET -------------------------
     The official VPET blueprint: ten lettered parts, A to J, 55 items.
     Item counts come straight from the published part table and must not be
     changed. Minutes are platform defaults an admin can edit per test — the
     part table does not publish timings.

     Each lettered part is its own timed section because every part has a
     different task, its own instructions and its own answer mode. Audio parts
     (E, F, G, H, J) need an MP3 attached to each question. */
  {
    id: 'vpet-full', familyId: 'vpet', kind: 'full',
    name: 'VPET full test (parts A-J, 55 items)',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    scoring: 'CEFR A1-C2 per skill; Speaking parts H, I and J are AI scored',
    guide: VPET_GUIDE, notes: VPET_NOTES, sections: vpetSections()
  },

  /* ------------------------ IELTS ------------------------- */
  {
    id: 'ielts-academic-full', familyId: 'ielts', kind: 'full',
    name: 'IELTS Academic — trọn 4 kỹ năng',
    levels: ['B1', 'B2', 'C1', 'C2'],
    scoring: 'Band 0-9, làm tròn 0.5',
    guide: [
      'Phần Nghe chỉ phát một lần. Bản máy tính không có thời gian chép đáp án riêng.',
      'Writing Task 2 tính trọng số gấp đôi Task 1 khi ra band kỹ năng Viết.',
      'Điểm tổng là trung bình bốn kỹ năng, làm tròn: lẻ 0,25 lên 0,5; lẻ 0,75 lên số nguyên.'
    ],
    notes: [
      'Nghe và Đọc đều 40 câu, quy từ điểm thô sang band bằng bảng riêng cho từng kỹ năng.',
      'Đọc Academic khó hơn General Training ở cùng điểm thô — bảng quy đổi khác nhau.',
      'Không trừ điểm câu sai, tuyệt đối không bỏ trống.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Trắc nghiệm + điền từ', items: 40, minutes: 30,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Part 1', items: 10, note: 'Hội thoại đời sống giữa hai người — thường điền form' },
          { label: 'Part 2', items: 10, note: 'Độc thoại tình huống đời sống' },
          { label: 'Part 3', items: 10, note: 'Thảo luận học thuật, tối đa bốn người' },
          { label: 'Part 4', items: 10, note: 'Bài giảng học thuật — khó nhất, không nghỉ giữa chừng' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: 'Đọc hiểu học thuật', items: 40, minutes: 60,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Passage 1', items: 13, note: 'Bài dễ nhất, nên xong trong 17 phút' },
          { label: 'Passage 2', items: 13, note: 'Độ khó trung bình' },
          { label: 'Passage 3', items: 14, note: 'Lập luận trừu tượng, khó nhất' }
        ]
      },
      {
        name: 'Writing', skill: 'writing', type: 'Task 1 + Task 2', items: 2, minutes: 60,
        types: ['essay'],
        parts: [
          { label: 'Task 1', items: 1, note: 'Mô tả biểu đồ hoặc quy trình, tối thiểu 150 từ, ~20 phút' },
          { label: 'Task 2', items: 1, note: 'Bài luận quan điểm, tối thiểu 250 từ, ~40 phút' }
        ]
      },
      {
        name: 'Speaking', skill: 'speaking', type: '3 part, ghi âm', items: 3, minutes: 14,
        types: ['speaking'],
        parts: [
          { label: 'Part 1', items: 1, note: 'Hỏi đáp về bản thân, 4–5 phút' },
          { label: 'Part 2', items: 1, note: 'Nói dài 2 phút theo cue card, có 1 phút chuẩn bị' },
          { label: 'Part 3', items: 1, note: 'Thảo luận sâu chủ đề Part 2, 4–5 phút' }
        ]
      }
    ]
  },
  {
    id: 'ielts-listening-module', familyId: 'ielts', kind: 'module',
    name: 'IELTS — luyện riêng kỹ năng Nghe',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Band 0-9 cho riêng kỹ năng Nghe',
    guide: ['Luyện riêng một kỹ năng, không tính điểm tổng.'],
    notes: ['Dùng để luyện tập trung; đề đủ 40 câu như bài thật.'],
    sections: [{
      name: 'Listening', skill: 'listening', type: 'Trắc nghiệm + điền từ', items: 40, minutes: 30,
      types: ['mcq', 'gap'],
      parts: [
        { label: 'Part 1', items: 10, note: 'Hội thoại đời sống' },
        { label: 'Part 2', items: 10, note: 'Độc thoại đời sống' },
        { label: 'Part 3', items: 10, note: 'Thảo luận học thuật' },
        { label: 'Part 4', items: 10, note: 'Bài giảng học thuật' }
      ]
    }]
  },
  {
    id: 'ielts-reading-module', familyId: 'ielts', kind: 'module',
    name: 'IELTS Academic — luyện riêng kỹ năng Đọc',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Band 0-9 cho riêng kỹ năng Đọc',
    guide: ['Luyện riêng một kỹ năng, không tính điểm tổng.'],
    notes: ['Phân bổ 20 phút cho mỗi bài đọc.'],
    sections: [{
      name: 'Reading', skill: 'reading', type: 'Đọc hiểu học thuật', items: 40, minutes: 60,
      types: ['mcq', 'gap'],
      parts: [
        { label: 'Passage 1', items: 13, note: 'Dễ nhất' },
        { label: 'Passage 2', items: 13, note: 'Trung bình' },
        { label: 'Passage 3', items: 14, note: 'Khó nhất' }
      ]
    }]
  },

  /* ------------------------ TOEIC ------------------------- */
  {
    id: 'toeic-lr-full', familyId: 'toeic', kind: 'full',
    name: 'TOEIC Listening & Reading — đề đầy đủ 200 câu',
    levels: ['A2', 'B1', 'B2', 'C1'],
    scoring: 'Thang 10-990 (mỗi phần 5-495)',
    guide: [
      'Không trừ điểm câu sai — không bao giờ bỏ trống, hết giờ thì đoán.',
      'Phần Nghe 45 phút phát liên tục, không tua lại.',
      'Phần Đọc dùng chung 75 phút cho cả Part 5, 6, 7 — tự phân bổ.'
    ],
    notes: [
      'Part 7 chiếm 54/100 câu phần Đọc, nên làm Part 5 và 6 thật nhanh để dành thời gian.',
      'Điểm thô quy sang thang bằng bảng equating riêng từng đề; bảng của nền tảng là tham chiếu.',
      'Đề đầy đủ cần 200 câu trong ngân hàng — kiểm tra độ phủ trước khi sinh.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Part 1-4, trắc nghiệm', items: 100, minutes: 45,
        types: ['mcq'],
        parts: [
          { label: 'Part 1', items: 6, note: 'Mô tả tranh, 4 phương án' },
          { label: 'Part 2', items: 25, note: 'Hỏi – đáp, 3 phương án, không in trên đề' },
          { label: 'Part 3', items: 39, note: '13 hội thoại × 3 câu' },
          { label: 'Part 4', items: 30, note: '10 bài nói ngắn × 3 câu' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: 'Part 5-7, trắc nghiệm', items: 100, minutes: 75,
        types: ['mcq'],
        parts: [
          { label: 'Part 5', items: 30, note: 'Điền câu chưa hoàn chỉnh — ngữ pháp và từ vựng' },
          { label: 'Part 6', items: 16, note: '4 đoạn văn × 4 chỗ trống, có câu điền nguyên câu' },
          { label: 'Part 7', items: 54, note: '29 câu đoạn đơn + 25 câu đoạn đôi/ba' }
        ]
      }
    ]
  },
  {
    id: 'toeic-lr-mini', familyId: 'toeic', kind: 'mini',
    name: 'TOEIC L&R — bản rút gọn 100 câu (luyện nhanh)',
    levels: ['A2', 'B1', 'B2'],
    scoring: 'Thang tham chiếu, quy đổi ước lượng từ nửa đề',
    guide: ['Bản rút gọn một nửa để luyện trong khoảng 60 phút.'],
    notes: [
      'Giữ đúng tỉ lệ dạng câu của đề thật, chỉ giảm một nửa số lượng.',
      'Điểm chỉ mang tính tham khảo vì bảng quy đổi thật dựa trên đủ 200 câu.'
    ],
    sections: [
      {
        name: 'Listening', skill: 'listening', type: 'Part 1-4 rút gọn', items: 50, minutes: 23,
        types: ['mcq'],
        parts: [
          { label: 'Part 1', items: 3, note: 'Mô tả tranh' },
          { label: 'Part 2', items: 13, note: 'Hỏi – đáp' },
          { label: 'Part 3', items: 19, note: 'Hội thoại' },
          { label: 'Part 4', items: 15, note: 'Bài nói ngắn' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: 'Part 5-7 rút gọn', items: 50, minutes: 38,
        types: ['mcq'],
        parts: [
          { label: 'Part 5', items: 15, note: 'Điền câu' },
          { label: 'Part 6', items: 8, note: 'Điền đoạn văn' },
          { label: 'Part 7', items: 27, note: 'Đọc hiểu' }
        ]
      }
    ]
  },
  {
    id: 'toeic-sw', familyId: 'toeic', kind: 'full',
    name: 'TOEIC Speaking & Writing',
    levels: ['B1', 'B2', 'C1'],
    scoring: 'Mỗi bài 0-200; Nói 8 mức, Viết 9 mức',
    guide: [
      'Bài Nói ghi âm trực tiếp, mỗi câu có thời gian chuẩn bị riêng.',
      'Bài Viết gõ trên máy, không có công cụ kiểm chính tả.'
    ],
    notes: ['Chấm theo rubric từng dạng câu, không phải đúng/sai.'],
    sections: [
      {
        name: 'Speaking', skill: 'speaking', type: '11 câu, ghi âm', items: 11, minutes: 20,
        types: ['speaking'],
        parts: [
          { label: 'Đọc to', items: 2, note: 'Read a text aloud' },
          { label: 'Mô tả tranh', items: 1, note: 'Describe a picture' },
          { label: 'Trả lời câu hỏi', items: 3, note: 'Respond to questions' },
          { label: 'Trả lời theo thông tin cho sẵn', items: 3, note: 'Dùng lịch, chương trình' },
          { label: 'Đề xuất giải pháp', items: 1, note: 'Propose a solution' },
          { label: 'Nêu ý kiến', items: 1, note: 'Express an opinion' }
        ]
      },
      {
        name: 'Writing', skill: 'writing', type: '8 câu, gõ máy', items: 8, minutes: 60,
        types: ['essay'],
        parts: [
          { label: 'Viết câu theo tranh', items: 5, note: 'Dùng đúng hai từ cho sẵn' },
          { label: 'Trả lời email', items: 2, note: 'Mỗi bài 10 phút' },
          { label: 'Bài luận quan điểm', items: 1, note: '~300 từ, 30 phút' }
        ]
      }
    ]
  },

  /* ------------------------- PTE -------------------------- */
  {
    id: 'pte-academic-full', familyId: 'pte', kind: 'full',
    name: 'PTE Academic — trọn bài, chấm máy',
    levels: ['B1', 'B2', 'C1'],
    scoring: 'Thang 10-90, chấm máy toàn phần',
    guide: [
      'Nói to, rõ, đều nhịp — máy chấm ưu tiên độ trôi chảy hơn giọng bản xứ.',
      'Một số dạng nhiều đáp án CÓ TRỪ ĐIỂM khi chọn sai, khác hẳn TOEIC.',
      'Không quay lại câu đã nộp, cân nhắc kỹ trước khi bấm Next.'
    ],
    notes: [
      'Chấm tích hợp: một câu đóng góp điểm cho nhiều kỹ năng cùng lúc.',
      'Nhiều dạng cho điểm thành phần, không phải đúng/sai nhị phân.',
      'Báo cáo thêm enabling skills: ngữ pháp, độ trôi chảy, phát âm, chính tả, từ vựng, mạch văn.'
    ],
    sections: [
      {
        name: 'Speaking & Writing', skill: 'speaking', type: '7 dạng câu, ghi âm + gõ', items: 28, minutes: 62,
        types: ['speaking', 'essay'],
        parts: [
          { label: 'Read Aloud', items: 6, note: 'Tính cả Đọc lẫn Nói' },
          { label: 'Repeat Sentence', items: 10, note: 'Tính cả Nghe lẫn Nói' },
          { label: 'Describe Image', items: 3, note: 'Chỉ tính Nói' },
          { label: 'Re-tell Lecture', items: 2, note: 'Tính cả Nghe lẫn Nói' },
          { label: 'Answer Short Question', items: 5, note: 'Tính cả Nghe lẫn Nói' },
          { label: 'Summarize Written Text', items: 1, note: 'Tính cả Đọc lẫn Viết' },
          { label: 'Essay', items: 1, note: '200–300 từ, 20 phút' }
        ]
      },
      {
        name: 'Reading', skill: 'reading', type: '5 dạng câu', items: 15, minutes: 30,
        types: ['mcq', 'gap'],
        parts: [
          { label: 'Fill in the Blanks', items: 6, note: 'Kéo thả và chọn đáp án' },
          { label: 'Multiple Choice', items: 4, note: 'Dạng nhiều đáp án có trừ điểm' },
          { label: 'Re-order Paragraphs', items: 2, note: 'Chấm theo cặp liền kề đúng' },
          { label: 'Reading Comprehension', items: 3, note: 'Đoạn dài, chọn một đáp án' }
        ]
      },
      {
        name: 'Listening', skill: 'listening', type: '8 dạng câu', items: 17, minutes: 35,
        types: ['mcq', 'gap', 'essay'],
        parts: [
          { label: 'Summarize Spoken Text', items: 2, note: '50–70 từ, tính cả Nghe lẫn Viết' },
          { label: 'Multiple Choice', items: 3, note: 'Có dạng trừ điểm' },
          { label: 'Fill in the Blanks', items: 2, note: 'Gõ từ nghe được' },
          { label: 'Highlight Correct Summary', items: 2, note: 'Chọn đoạn tóm tắt đúng' },
          { label: 'Select Missing Word', items: 2, note: 'Đoán từ cuối bị cắt' },
          { label: 'Highlight Incorrect Words', items: 3, note: 'Có trừ điểm khi chọn nhầm' },
          { label: 'Write from Dictation', items: 3, note: 'Chấm theo số từ đúng' }
        ]
      }
    ]
  },

  /* -------------------------- OTE ------------------------- */
  {
    id: 'ote-listening', familyId: 'ote', kind: 'module',
    name: 'Oxford Test of English — module Nghe',
    levels: ['A2', 'B1', 'B2'],
    scoring: 'CEFR (dưới A2 / A2 / B1 / B2) kèm điểm 51-140',
    guide: ['Thi theo module, không bắt buộc thi đủ bốn kỹ năng.'],
    notes: [
      'Bài thật chạy thích ứng: độ khó câu sau phụ thuộc câu trước.',
      'Nền tảng hiện sinh đề cố định; chấm thích ứng nằm trong hàng đợi phát triển.'
    ],
    sections: [{
      name: 'Listening', skill: 'listening', type: 'Thích ứng, 4 phần', items: 20, minutes: 30,
      types: ['mcq'],
      parts: [
        { label: 'Part 1', items: 6, note: 'Đoạn ngắn độc lập' },
        { label: 'Part 2', items: 4, note: 'Độc thoại, điền thông tin' },
        { label: 'Part 3', items: 6, note: 'Ghép người nói với ý' },
        { label: 'Part 4', items: 4, note: 'Hội thoại dài' }
      ]
    }]
  },
  {
    id: 'ote-reading', familyId: 'ote', kind: 'module',
    name: 'Oxford Test of English — module Đọc',
    levels: ['A2', 'B1', 'B2'],
    scoring: 'CEFR (dưới A2 / A2 / B1 / B2) kèm điểm 51-140',
    guide: ['Thi theo module, không bắt buộc thi đủ bốn kỹ năng.'],
    notes: ['Bài thật chạy thích ứng theo từng câu trả lời.'],
    sections: [{
      name: 'Reading', skill: 'reading', type: 'Thích ứng, 4 phần', items: 22, minutes: 35,
      types: ['mcq', 'gap'],
      parts: [
        { label: 'Part 1', items: 6, note: 'Đoạn ngắn, chọn ý đúng' },
        { label: 'Part 2', items: 6, note: 'Ghép đoạn với tiêu đề' },
        { label: 'Part 3', items: 6, note: 'Đọc hiểu chi tiết' },
        { label: 'Part 4', items: 4, note: 'Điền từ vào đoạn văn' }
      ]
    }]
  }
];

/** Tổng số câu của một format */
function totalItems(f) {
  return f.sections.reduce((s, x) => s + x.items, 0);
}

/** Tổng thời lượng của một format */
function totalMinutes(f) {
  return f.sections.reduce((s, x) => s + x.minutes, 0);
}

/** Kiểm tra tính nhất quán: tổng items của parts phải khớp items của section */
function inconsistencies() {
  const out = [];
  for (const f of FORMATS) {
    for (const s of f.sections) {
      if (!Array.isArray(s.parts) || !s.parts.length) continue;
      const sum = s.parts.reduce((a, p) => a + p.items, 0);
      if (sum !== s.items) {
        out.push(`${f.id} · ${s.name}: tổng parts ${sum} ≠ items ${s.items}`);
      }
    }
  }
  return out;
}

module.exports = { FORMATS, totalItems, totalMinutes, inconsistencies };
