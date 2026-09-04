/**
 * How each part of the paper is actually scored, and the English worth knowing
 * by heart before sitting it.
 *
 * The blueprint (server/data/exam-formats.js) says what a part IS. The item
 * bank says what it asks. Neither says what earns the mark, and that is the
 * thing a candidate can change between now and the exam — so it lives here, in
 * one place, read by the practice screen and the study pack rather than written
 * twice in two screens' markup.
 *
 * Three fields per part, and the shape is the argument:
 *
 *   earn    what the mark is given for. Specific to this part, checkable
 *           against server/rubric.js and the guide — not encouragement.
 *   lose    the mistake that costs most. Every one of these is a mistake a
 *           competent candidate makes, not a beginner's: "did not know the
 *           word" is not worth printing.
 *   frames  the fixed English to learn by heart. This is the part learners ask
 *           for and the part a platform usually leaves out, because it looks
 *           like teaching to the test. It IS teaching to the test: the exam
 *           rewards register and function, both of which live in fixed phrases,
 *           and a candidate who has ten of them ready spends the minute on what
 *           to say rather than on how to start.
 *
 * `earn` and `lose` are bilingual because they are prose a learner reads.
 * `frames` are not: the English IS the content — translating "I am writing with
 * regard to…" gives a learner something they cannot use — so each group carries
 * a bilingual note saying WHEN it is used, and the phrases stand as they are.
 *
 * Provenance: written for this platform from the published VPET part table and
 * the Official Guide for Test-Takers, plus what server/rubric.js actually
 * rewards. Nothing is copied from a published test or a coursebook.
 */
'use strict';

const PARTS = {
  A: {
    earn: {
      en: 'One word, and it is usually decided by something several words away — a time phrase, a plural subject, a fronted adverb. Read to the full stop before you write anything.',
      vi: 'Một từ duy nhất, và nó thường bị quyết định bởi thứ cách đó vài từ — trạng ngữ thời gian, chủ ngữ số nhiều, trạng từ đảo ngữ. Đọc hết dấu chấm rồi mới điền.'
    },
    lose: {
      en: 'Filling the gap from the two words touching it. Both neighbours usually accept two or three words; only the whole sentence accepts one.',
      vi: 'Điền theo hai từ sát chỗ trống. Hai từ đó thường chấp nhận hai ba lựa chọn; chỉ cả câu mới chấp nhận một.'
    },
    frames: [
      {
        use: { en: 'Verbs that own their preposition — the commonest single decider in this part',
          vi: 'Động từ đi liền giới từ — thứ quyết định nhiều nhất ở phần này' },
        say: ['depend on', 'insist on + -ing', 'apologise for + -ing', 'succeed in + -ing',
          'be capable of + -ing', 'look forward to + -ing', 'get used to + -ing',
          'object to + -ing', 'be accused of', 'result in / result from']
      },
      {
        use: { en: 'Frames where the missing word is grammar, not vocabulary',
          vi: 'Khung câu mà chỗ trống là ngữ pháp, không phải từ vựng' },
        say: ['It is high time we took …', 'on the grounds that …', 'no choice but to …',
          'Hardly had I … when …', 'Had I known …, I would have …', 'Not only did he …']
      }
    ]
  },

  B: {
    earn: {
      en: 'How much MEANING comes back, not how much wording. Three ideas in your own plain English beat one sentence copied exactly with the rest lost.',
      vi: 'Lượng Ý quay lại được, không phải lượng CHỮ. Ba ý bằng tiếng Anh mộc của mình hơn hẳn một câu chép đúng rồi mất phần còn lại.'
    },
    lose: {
      en: 'Spending the thirty seconds memorising the first sentence. Read for the list of ideas instead — how many there are, and in what order.',
      vi: 'Dùng ba mươi giây để thuộc câu đầu. Hãy đọc để nắm danh sách ý — có mấy ý, thứ tự thế nào.'
    },
    frames: [
      {
        use: { en: 'A three-move skeleton that holds any passage',
          vi: 'Khung ba bước dùng được cho mọi đoạn' },
        say: ['The passage says that …', 'It also mentions that …', 'Finally, it explains why …']
      },
      {
        use: { en: 'When one idea will not come back — say the shape of it rather than nothing',
          vi: 'Khi một ý không nhớ ra — nói hình dạng của nó, đừng bỏ trống' },
        say: ['There was also a point about …', 'and one more reason, which I cannot recall exactly']
      }
    ]
  },

  C: {
    earn: {
      en: 'The relation between the ideas, not the words they are made of. Every question can be answered from the passage alone; none can be answered by matching a word.',
      vi: 'Quan hệ giữa các ý, không phải chữ tạo ra chúng. Mọi câu đều trả lời được chỉ bằng đoạn văn; không câu nào trả lời được bằng cách dò từ giống nhau.'
    },
    lose: {
      en: 'Choosing the option that reuses the passage\'s own words. That is exactly how the wrong options are written.',
      vi: 'Chọn phương án dùng lại chữ trong đoạn. Phương án sai được viết ra đúng theo cách đó.'
    },
    frames: [
      {
        use: { en: 'The four shapes a wrong option takes — learn to name them and they stop working',
          vi: 'Bốn hình dạng của phương án sai — gọi tên được là chúng hết tác dụng' },
        say: ['cause and effect swapped', 'one case turned into all cases',
          '"mentioned" turned into "recommended"', 'true, but not what was asked']
      }
    ]
  },

  D: {
    earn: {
      en: 'Every task the prompt names, in the register it names. Count the tasks before writing and tick them off; at least a hundred words, and the tone carries half the mark.',
      vi: 'Làm đủ mọi việc đề nêu, đúng văn phong đề nêu. Đếm số việc trước khi viết rồi gạch từng cái; tối thiểu một trăm từ, và văn phong chiếm một nửa số điểm.'
    },
    lose: {
      en: 'Good English that answers two of the three things asked. Most marks lost here are not grammar.',
      vi: 'Tiếng Anh tốt nhưng chỉ trả lời hai trong ba việc được hỏi. Điểm mất ở phần này phần lớn không phải vì ngữ pháp.'
    },
    frames: [
      {
        use: { en: 'Formal opening — somebody you do not know, or a customer',
          vi: 'Mở đầu trang trọng — người chưa quen, hoặc khách hàng' },
        say: ['Dear Ms Tran,', 'I am writing with regard to …', 'Thank you for your e-mail of 12 March.',
          'I am sorry for the delay in replying.']
      },
      {
        use: { en: 'Neutral opening — a colleague',
          vi: 'Mở đầu trung tính — đồng nghiệp' },
        say: ['Hi Minh,', 'Thanks for getting back to me.', 'Just a quick note about …']
      },
      {
        use: { en: 'Asking for something without sounding like an order',
          vi: 'Nhờ việc mà không nghe như ra lệnh' },
        say: ['Could you let me know whether …?', 'I would be grateful if you could …',
          'Would it be possible to …?', 'When you have a moment, could you …']
      },
      {
        use: { en: 'Bad news, then the remedy — the pair that earns the tone mark',
          vi: 'Tin không vui, rồi cách khắc phục — cặp câu ăn điểm văn phong' },
        say: ['I am afraid we will not be able to …', 'Unfortunately, … is no longer available.',
          'What I can offer instead is …', 'To make up for it, we would like to …']
      },
      {
        use: { en: 'Closing — say what you want to happen next',
          vi: 'Kết — nói rõ mong muốn điều gì xảy ra tiếp' },
        say: ['I look forward to hearing from you.', 'Please let me know if either of these suits you.',
          'Best regards,', 'Kind regards,']
      }
    ]
  },

  E: {
    earn: {
      en: 'Every word, spelt. The sentence is short; the marks sit in the parts that carry no stress — the opening two words and the last three.',
      vi: 'Đủ mọi từ, đúng chính tả. Câu ngắn thôi; điểm nằm ở những chỗ không nhấn — hai từ đầu và ba từ cuối.'
    },
    lose: {
      en: 'Writing the content words and guessing the rest. "has been moved" heard as "has moved" costs the item.',
      vi: 'Chép từ mang nghĩa rồi đoán phần còn lại. Nghe "has been moved" thành "has moved" là mất câu đó.'
    },
    frames: [
      {
        use: { en: 'The clusters that disappear in speech — train the ear on these, not on vocabulary',
          vi: 'Những cụm bị nuốt khi nói — luyện tai vào đây, đừng luyện từ vựng' },
        say: ['has been / have been / had been', 'will be / would be', 'there is / there are',
          'to the / of the / at the', 'is going to', 'a lot of']
      },
      {
        use: { en: 'Write the frame first and fill the words in after — half a sentence scores, a blank does not',
          vi: 'Viết khung trước rồi điền chữ sau — nửa câu vẫn có điểm, bỏ trắng thì không' },
        say: ['The ___ has been ___ to ___.', 'Please ___ me the ___ before ___.']
      }
    ]
  },

  F: {
    earn: {
      en: 'The reply that does the right JOB. All three options are correct English; only one answers what was actually said.',
      vi: 'Câu đáp làm đúng CHỨC NĂNG. Cả ba phương án đều đúng ngữ pháp; chỉ một cái đáp đúng điều vừa nghe.'
    },
    lose: {
      en: 'Picking on grammar. If you are ruling an option out because it "sounds wrong", you have not heard the question.',
      vi: 'Chọn theo ngữ pháp. Nếu bạn loại một phương án vì "nghe sai sai", tức là bạn chưa nghe rõ câu hỏi.'
    },
    frames: [
      {
        use: { en: 'Ask what the speaker WANTED, then match — four pairs cover most items',
          vi: 'Hỏi xem người nói MUỐN gì, rồi ghép — bốn cặp này phủ gần hết' },
        say: ['an offer → accept, or decline with a reason',
          'a request → agree, or agree with a condition',
          'a complaint → apologise and give a remedy',
          'a suggestion → agree, or counter with an alternative']
      }
    ]
  },

  G: {
    earn: {
      en: 'A short phrase. The guide asks for "a short phrase or a very short sentence" — three correct words is full marks.',
      vi: 'Một cụm ngắn. Hướng dẫn yêu cầu "một cụm ngắn hoặc một câu rất ngắn" — ba từ đúng là điểm tối đa.'
    },
    lose: {
      en: 'Answering in a full sentence and getting something else wrong on the way. And remember the questions are SPOKEN: listen for the question rather than reading ahead.',
      vi: 'Trả lời cả câu rồi sai ở chỗ khác. Và nhớ rằng câu hỏi được ĐỌC LÊN: hãy nghe câu hỏi, đừng đọc trước.'
    },
    frames: [
      {
        use: { en: 'Short-answer shapes that are complete answers',
          vi: 'Các dạng trả lời ngắn mà vẫn đầy đủ' },
        say: ['Because it was raining.', 'About twenty minutes.', 'The manager did.',
          'On Friday morning.', 'Two of them.']
      }
    ]
  },

  H: {
    earn: {
      en: 'How much of the sentence comes back, in order. It is compared word by word with the sentence you heard, and nobody is marking your accent.',
      vi: 'Lượng câu nói lại được, đúng thứ tự. Máy so từng từ với câu bạn vừa nghe, và không ai chấm giọng của bạn.'
    },
    lose: {
      en: 'Starting to speak before the sentence has finished arriving. A one-second pause costs nothing; trailing off at word six costs four words.',
      vi: 'Nói khi câu chưa nghe xong. Dừng một giây không mất gì; đuối ở từ thứ sáu là mất bốn từ.'
    },
    frames: [
      {
        use: { en: 'Hold it in three chunks rather than as one string — the last chunk is the one that gets dropped',
          vi: 'Giữ câu theo ba cụm thay vì một chuỗi — cụm cuối là cụm hay rơi nhất' },
        say: ['who / did what / when or why',
          'The manager | sent the report | before the meeting.']
      }
    ]
  },

  I: {
    earn: {
      en: 'The register the relationship calls for, and a plan for the difficulty in the situation. The prompt names both — find them before the beep.',
      vi: 'Đúng văn phong mà quan hệ đòi hỏi, và một cách xử lý cho khó khăn trong tình huống. Đề nêu cả hai — tìm ra trước tiếng bíp.'
    },
    lose: {
      en: 'Speaking fluently for a minute without ever addressing the problem — or addressing it in the wrong tone for who you are talking to.',
      vi: 'Nói trôi chảy một phút mà không hề chạm vào vấn đề — hoặc có chạm nhưng sai giọng với người đang nghe.'
    },
    frames: [
      {
        use: { en: 'Open by naming the problem, softened',
          vi: 'Mở đầu bằng cách nêu vấn đề, có giảm nhẹ' },
        say: ['I am afraid there has been a problem with …', 'I wanted to let you know that …',
          'Something has come up with …']
      },
      {
        use: { en: 'Disagree or refuse without damage',
          vi: 'Không đồng ý hoặc từ chối mà không làm hỏng quan hệ' },
        say: ['I completely understand, but …', 'I see what you mean — the difficulty is that …',
          'I would rather not, if that is all right.']
      },
      {
        use: { en: 'Close by offering the next move — the half most answers miss',
          vi: 'Kết bằng cách đề xuất bước tiếp theo — nửa mà đa số bỏ quên' },
        say: ['Shall we say Friday instead?', 'What I can do is …', 'Would that work for you?']
      }
    ]
  },

  J: {
    earn: {
      en: 'The events, in order, all of them. A flat retelling with every event beats a vivid one that loses two.',
      vi: 'Các sự việc, đúng thứ tự, đủ cả. Kể khô mà đủ hơn kể hay mà rơi mất hai sự việc.'
    },
    lose: {
      en: 'Opening with detail and running out of the thirty seconds in the middle of the story.',
      vi: 'Mở đầu bằng chi tiết rồi hết ba mươi giây khi mới kể đến giữa truyện.'
    },
    frames: [
      {
        use: { en: 'A skeleton that fits almost every story and takes about eight seconds to say',
          vi: 'Khung dùng được cho gần như mọi câu chuyện, nói mất chừng tám giây' },
        say: ['A man was …ing when …', 'So he decided to …', 'But then …', 'In the end, …']
      },
      {
        use: { en: 'If the ending will not come, land the point rather than stopping',
          vi: 'Nếu quên đoạn kết, hãy chốt ý thay vì im bặt' },
        say: ['and that is how it was sorted out', 'so he learnt to check first']
      }
    ]
  }
};

/**
 * Ceiling vocabulary: the words that decide a band at the two boundaries this
 * platform reports, B1+ and C1/C2.
 *
 * NOT "hard words". These are the words a marker reads as evidence of the level
 * above — which is a different list, and a much shorter one. Each group says
 * where it pays, because a word learnt with no place to put it is a word that
 * does not arrive during the exam.
 */
const CEILING = [
  {
    tier: 'B1+',
    what: {
      en: 'What lifts a B1 answer to B2: precision where a B1 answer is vague, and softening where it is blunt.',
      vi: 'Thứ nâng bài B1 lên B2: chính xác ở chỗ bài B1 nói chung chung, và giảm nhẹ ở chỗ bài B1 nói thẳng đuột.'
    },
    groups: [
      {
        name: { en: 'Verbs that carry their own preposition', vi: 'Động từ đi kèm giới từ' },
        where: { en: 'Part A, and every e-mail', vi: 'Part A, và mọi email' },
        words: ['depend on', 'apply for', 'deal with', 'result in', 'apologise for',
          'complain about', 'rely on', 'consist of', 'succeed in', 'insist on']
      },
      {
        name: { en: 'Doing-business collocations', vi: 'Cụm từ công việc' },
        where: { en: 'Parts D and I', vi: 'Part D và I' },
        words: ['make a decision', 'take responsibility', 'meet a deadline', 'raise an issue',
          'reach an agreement', 'give notice', 'place an order', 'set up a meeting']
      },
      {
        name: { en: 'Joining ideas beyond "and" and "but"', vi: 'Nối ý ngoài "and" và "but"' },
        where: { en: 'Parts B and D', vi: 'Part B và D' },
        words: ['however', 'although', 'whereas', 'in addition', 'as a result',
          'even though', 'otherwise', 'in that case']
      },
      {
        name: { en: 'Softening — the clearest single B1→B2 marker', vi: 'Giảm nhẹ — dấu hiệu B1→B2 rõ nhất' },
        where: { en: 'Parts D and I', vi: 'Part D và I' },
        words: ['it seems that', 'tends to', 'fairly', 'a little', 'I am afraid',
          'would you mind', 'perhaps we could']
      }
    ]
  },
  {
    tier: 'C1/C2',
    what: {
      en: 'What a C1 answer does that a good B2 one does not: one word where B2 needs three, and a stated degree of certainty.',
      vi: 'Thứ bài C1 làm được mà bài B2 tốt thì không: một từ thay cho ba, và nói rõ mức độ chắc chắn.'
    },
    groups: [
      {
        name: { en: 'One formal verb instead of a phrasal one', vi: 'Một động từ trang trọng thay cụm động từ' },
        where: { en: 'Part D, and any written answer', vi: 'Part D, và mọi bài viết' },
        words: ['obtain (get)', 'submit (hand in)', 'retain (keep)', 'require (need)',
          'establish (set up)', 'resolve (sort out)', 'decline (turn down)', 'postpone (put off)']
      },
      {
        name: { en: 'Turning a verb into the thing itself', vi: 'Danh từ hoá' },
        where: { en: 'Parts B and D', vi: 'Part B và D' },
        words: ['the delay in delivery', 'a reduction in cost', 'the introduction of',
          'on receipt of', 'the implementation of', 'a failure to respond']
      },
      {
        name: { en: 'Saying how sure you are, precisely', vi: 'Nói rõ mức độ chắc chắn' },
        where: { en: 'Parts B, D and I', vi: 'Part B, D và I' },
        words: ['arguably', 'it appears that', 'to a large extent', 'broadly speaking',
          'on balance', 'in principle', 'not necessarily']
      },
      {
        name: { en: 'Adjectives that measure rather than praise', vi: 'Tính từ đo lường thay vì khen chê' },
        where: { en: 'Parts B and D', vi: 'Part B và D' },
        words: ['substantial', 'marginal', 'negligible', 'considerable', 'modest',
          'significant', 'persistent', 'consistent']
      },
      {
        name: { en: 'Formal connectives that replace a whole clause', vi: 'Liên từ trang trọng thay cả mệnh đề' },
        where: { en: 'Part D at C1 and above', vi: 'Part D từ C1 trở lên' },
        words: ['notwithstanding', 'whereby', 'thereby', 'in the event that',
          'provided that', 'insofar as', 'with a view to']
      }
    ]
  }
];

/** What is known about one part, or null. */
function forPart(letter) {
  return PARTS[String(letter || '').toUpperCase()] || null;
}

module.exports = { PARTS, CEILING, forPart };
