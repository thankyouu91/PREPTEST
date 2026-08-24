/**
 * Từ nối (linking words / discourse markers) — dữ liệu gốc cho bảng linking_words.
 *
 * Xếp theo CHỨC NĂNG × ĐỘ TRANG TRỌNG, không theo bảng chữ cái. Lỗi hay gặp của
 * người học không phải là "không biết từ" mà là dùng sai chỗ: nhét *Moreover*
 * vào câu nói chuyện, hoặc mở đoạn văn học thuật bằng *Plus,*.
 *
 * Mỗi dòng:
 *   [word, fn, register, pos, punct, vi, level, ex_en, ex_vi, warn]
 *
 *   fn        chức năng — xem FUNCTIONS bên dưới
 *   register  'spoken'   nói / thân mật
 *             'neutral'  viết trung tính, dùng được cả hai
 *             'academic' viết học thuật, trang trọng
 *   pos       vị trí trong câu:
 *             'start'  đầu câu · 'mid' giữa câu · 'end' cuối câu
 *             'start-mid' dùng được cả đầu lẫn giữa
 *             'conj'   liên từ nối hai mệnh đề trong cùng một câu
 *             'prep'   giới từ — theo sau là danh từ hoặc V-ing, KHÔNG phải mệnh đề
 *   punct     quy tắc dấu câu đi kèm
 *   warn      cảnh báo lạm dụng hoặc dùng sai (để trống nếu không có)
 *
 * Điểm ngữ pháp quan trọng đã kiểm kỹ:
 *   - however / therefore / moreover là TRẠNG TỪ, không nối được hai mệnh đề bằng
 *     dấu phẩy. Phải chấm câu hoặc chấm phẩy trước nó.
 *   - but / so / because là LIÊN TỪ, nối trực tiếp hai mệnh đề.
 *   - despite / in spite of / due to đi với danh từ hoặc V-ing.
 *     although / though / because đi với mệnh đề.
 */
'use strict';

const COLUMNS = ['word', 'fn', 'register', 'pos', 'punct', 'vi', 'level', 'ex_en', 'ex_vi', 'warn'];

/** Nhóm chức năng, dùng cho bộ lọc trên giao diện */
const FUNCTIONS = [
  ['add', 'Thêm ý'],
  ['contrast', 'Đối lập'],
  ['concession', 'Nhượng bộ'],
  ['cause', 'Nguyên nhân'],
  ['result', 'Kết quả'],
  ['example', 'Ví dụ'],
  ['emphasis', 'Nhấn mạnh'],
  ['clarify', 'Làm rõ, diễn giải'],
  ['compare', 'So sánh'],
  ['sequence', 'Trình tự, thời gian'],
  ['condition', 'Điều kiện'],
  ['purpose', 'Mục đích'],
  ['conclusion', 'Kết luận, tóm tắt']
];

const REGISTERS = [
  ['spoken', 'Nói / thân mật'],
  ['neutral', 'Viết trung tính'],
  ['academic', 'Viết học thuật']
];

/* eslint-disable max-len */
const ROWS = [
  /* ------------------------- Thêm ý ------------------------- */
  ['and', 'add', 'spoken', 'conj', 'Không cần dấu phẩy khi nối hai từ hoặc hai cụm ngắn', 'và', 'A1', 'We bought bread and milk.', 'Chúng tôi mua bánh mì và sữa.', ''],
  ['also', 'add', 'neutral', 'start-mid', 'Giữa câu đứng trước động từ chính, sau trợ động từ: "She has also finished."', 'cũng', 'A2', 'She also speaks Japanese.', 'Cô ấy cũng nói được tiếng Nhật.', ''],
  ['too', 'add', 'spoken', 'end', 'Cuối câu, dấu phẩy trước "too" là tuỳ chọn', 'cũng (đặt cuối câu)', 'A1', 'I want to come too.', 'Tôi cũng muốn đi.', 'Không đặt đầu câu — đó là lỗi phổ biến của người Việt.'],
  ['as well', 'add', 'spoken', 'end', 'Luôn đứng cuối câu', 'cũng vậy', 'A2', 'He plays the guitar as well.', 'Anh ấy cũng chơi ghi-ta.', ''],
  ['as well as', 'add', 'neutral', 'prep', 'Theo sau là danh từ hoặc V-ing, không phải mệnh đề', 'cũng như, bên cạnh', 'B1', 'The course covers grammar as well as pronunciation.', 'Khoá học dạy cả ngữ pháp lẫn phát âm.', 'Động từ chia theo chủ ngữ ĐẦU: "Ann, as well as her friends, is coming."'],
  ['plus', 'add', 'spoken', 'start', 'Dấu phẩy sau nó khi mở câu', 'với lại', 'B1', 'Plus, the tickets were cheaper online.', 'Với lại, vé mua mạng còn rẻ hơn.', 'Quá suồng sã cho bài viết học thuật — đừng dùng trong IELTS Writing.'],
  ['what is more', 'add', 'neutral', 'start', 'Dấu phẩy sau nó', 'hơn nữa', 'B2', "What is more, the price includes delivery.", 'Hơn nữa, giá đã gồm phí giao hàng.', ''],
  ['in addition', 'add', 'neutral', 'start', 'Dấu phẩy sau nó', 'thêm vào đó', 'B1', 'In addition, all staff receive training.', 'Thêm vào đó, toàn bộ nhân viên được đào tạo.', ''],
  ['in addition to', 'add', 'neutral', 'prep', 'Theo sau là danh từ hoặc V-ing', 'ngoài ra còn', 'B2', 'In addition to writing, she edits the journal.', 'Ngoài viết bài, cô ấy còn biên tập tạp chí.', 'Đừng nhầm với "in addition" — bản có "to" phải có danh từ theo sau.'],
  ['moreover', 'add', 'academic', 'start', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'hơn thế nữa', 'B2', 'The method is cheap; moreover, it is easy to teach.', 'Phương pháp này rẻ; hơn thế nữa, nó dễ dạy.', 'Trạng từ, KHÔNG nối hai mệnh đề bằng dấu phẩy.'],
  ['furthermore', 'add', 'academic', 'start', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'ngoài ra', 'B2', 'Furthermore, the data covers three decades.', 'Ngoài ra, dữ liệu trải dài ba thập kỷ.', 'Nặng hơn "moreover" — một bài luận 250 từ dùng một lần là đủ.'],
  ['besides', 'add', 'neutral', 'start-mid', 'Dấu phẩy sau khi mở câu; làm giới từ thì theo sau là danh từ', 'ngoài ra, vả lại', 'B2', 'Besides, we had no other choice.', 'Vả lại, chúng tôi không còn lựa chọn nào.', 'Khác "beside" (bên cạnh) — thiếu chữ s là sai nghĩa hẳn.'],

  /* ------------------------ Đối lập ------------------------- */
  ['but', 'contrast', 'spoken', 'conj', 'Dấu phẩy trước "but" khi nối hai mệnh đề đầy đủ', 'nhưng', 'A1', 'I called her, but she did not answer.', 'Tôi gọi cô ấy, nhưng cô ấy không nghe máy.', ''],
  ['yet', 'contrast', 'neutral', 'conj', 'Dấu phẩy trước khi nối hai mệnh đề', 'thế mà, vậy mà', 'B2', 'The plan was simple, yet it worked.', 'Kế hoạch đơn giản, vậy mà lại hiệu quả.', 'Mang sắc thái bất ngờ mạnh hơn "but".'],
  ['however', 'contrast', 'neutral', 'start-mid', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'tuy nhiên', 'B1', 'The results were promising. However, the sample was small.', 'Kết quả khả quan. Tuy nhiên, mẫu còn nhỏ.', 'LỖI KINH ĐIỂN: "It rained, however we went out." Phải là dấu chấm hoặc chấm phẩy trước "however".'],
  ['on the other hand', 'contrast', 'neutral', 'start', 'Dấu phẩy sau nó', 'mặt khác', 'B1', 'On the other hand, the cost is much higher.', 'Mặt khác, chi phí lại cao hơn nhiều.', 'Chỉ dùng khi đã nêu mặt thứ nhất — đừng mở bài bằng nó.'],
  ['in contrast', 'contrast', 'academic', 'start', 'Dấu phẩy sau nó', 'ngược lại', 'B2', 'In contrast, rural areas saw no growth.', 'Ngược lại, khu vực nông thôn không tăng trưởng.', ''],
  ['by contrast', 'contrast', 'academic', 'start', 'Dấu phẩy sau nó', 'trái lại', 'C1', 'By contrast, the second group improved sharply.', 'Trái lại, nhóm thứ hai tiến bộ rõ rệt.', ''],
  ['conversely', 'contrast', 'academic', 'start', 'Dấu phẩy sau nó', 'ngược lại là', 'C1', 'Conversely, lowering the price reduced profit.', 'Ngược lại, hạ giá làm giảm lợi nhuận.', 'Chỉ dùng khi hai vế thật sự đảo chiều nhau, không phải chỉ khác nhau.'],
  ['whereas', 'contrast', 'neutral', 'conj', 'Dấu phẩy trước khi đứng giữa câu', 'trong khi đó', 'B2', 'She prefers tea, whereas he drinks coffee.', 'Cô ấy thích trà, trong khi anh ấy uống cà phê.', ''],
  ['while', 'contrast', 'neutral', 'conj', 'Dấu phẩy trước khi mang nghĩa đối lập', 'trong khi', 'B1', 'While the theory is elegant, it is hard to test.', 'Trong khi lý thuyết rất đẹp, nó lại khó kiểm chứng.', 'Có hai nghĩa: đối lập và cùng lúc — ngữ cảnh phải rõ.'],
  ['unlike', 'contrast', 'neutral', 'prep', 'Theo sau là danh từ, không phải mệnh đề', 'khác với', 'B1', 'Unlike his brother, he enjoys public speaking.', 'Khác với anh trai, cậu ấy thích nói trước đám đông.', ''],
  ['instead', 'contrast', 'neutral', 'start-mid', 'Dấu phẩy sau khi mở câu', 'thay vào đó', 'B1', 'The meeting was cancelled. Instead, we emailed.', 'Cuộc họp bị huỷ. Thay vào đó, chúng tôi gửi email.', ''],
  ['instead of', 'contrast', 'neutral', 'prep', 'Theo sau là danh từ hoặc V-ing', 'thay vì', 'A2', 'Instead of driving, they took the train.', 'Thay vì lái xe, họ đi tàu.', 'Có "of" thì phải có danh từ hoặc V-ing theo sau.'],
  ['rather than', 'contrast', 'neutral', 'prep', 'Hai vế hai bên phải cùng dạng ngữ pháp', 'chứ không phải', 'B2', 'The problem is cultural rather than technical.', 'Vấn đề mang tính văn hoá chứ không phải kỹ thuật.', ''],
  ['nevertheless', 'contrast', 'academic', 'start', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'dù vậy', 'C1', 'The evidence is thin. Nevertheless, the claim persists.', 'Bằng chứng còn mỏng. Dù vậy, luận điểm đó vẫn tồn tại.', ''],
  ['nonetheless', 'contrast', 'academic', 'start', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'tuy thế', 'C1', 'It was expensive; nonetheless, we bought it.', 'Nó đắt; tuy thế chúng tôi vẫn mua.', 'Gần như đồng nghĩa "nevertheless" — đừng dùng cả hai trong một đoạn.'],

  /* ----------------------- Nhượng bộ ------------------------ */
  ['although', 'concession', 'neutral', 'conj', 'Theo sau là MỆNH ĐỀ; dấu phẩy khi đứng đầu câu', 'mặc dù', 'B1', 'Although it rained, the match continued.', 'Mặc dù trời mưa, trận đấu vẫn tiếp tục.', 'Không dùng "although … but …" trong cùng một câu — lỗi rất phổ biến.'],
  ['though', 'concession', 'spoken', 'conj', 'Như "although" nhưng thân mật hơn; đứng cuối câu thì có dấu phẩy trước', 'dù, mặc dù', 'B1', 'It was expensive. It was worth it, though.', 'Nó đắt. Nhưng cũng đáng.', 'Chỉ "though" mới đặt được cuối câu, "although" thì không.'],
  ['even though', 'concession', 'neutral', 'conj', 'Theo sau là mệnh đề; nhấn mạnh hơn "although"', 'mặc dù thực tế là', 'B2', 'Even though she trained hard, she lost.', 'Mặc dù đã tập rất chăm, cô ấy vẫn thua.', ''],
  ['even if', 'concession', 'neutral', 'conj', 'Theo sau là mệnh đề, nói về giả định chứ không phải sự thật', 'cho dù', 'B2', 'Even if it rains, we will go.', 'Cho dù trời mưa, chúng tôi vẫn đi.', 'Khác "even though": "even if" là giả định, "even though" là sự thật.'],
  ['despite', 'concession', 'neutral', 'prep', 'Theo sau là DANH TỪ hoặc V-ing, KHÔNG phải mệnh đề', 'bất chấp', 'B2', 'Despite the delay, everyone stayed.', 'Bất chấp việc trễ giờ, mọi người vẫn ở lại.', 'Sai kinh điển: "despite of". Không bao giờ có "of" sau "despite".'],
  ['in spite of', 'concession', 'neutral', 'prep', 'Theo sau là danh từ hoặc V-ing', 'mặc cho', 'B2', 'In spite of the noise, he kept working.', 'Mặc cho tiếng ồn, anh ấy vẫn làm việc.', 'Muốn theo sau bằng mệnh đề thì thêm "the fact that".'],
  ['regardless of', 'concession', 'academic', 'prep', 'Theo sau là danh từ hoặc mệnh đề wh-', 'bất kể', 'C1', 'The rule applies regardless of age.', 'Quy định áp dụng bất kể tuổi tác.', ''],
  ['admittedly', 'concession', 'academic', 'start', 'Dấu phẩy sau nó', 'phải thừa nhận là', 'C1', 'Admittedly, the sample was not random.', 'Phải thừa nhận là mẫu chưa ngẫu nhiên.', 'Dùng để tự nhận điểm yếu trước khi phản biện — ghi điểm trong bài luận.'],
  ['granted', 'concession', 'neutral', 'start', 'Dấu phẩy sau nó', 'đành rằng', 'C1', 'Granted, the method is slow, but it is accurate.', 'Đành rằng phương pháp này chậm, nhưng nó chính xác.', ''],
  ['notwithstanding', 'concession', 'academic', 'prep', 'Theo sau hoặc đứng sau danh từ; rất trang trọng', 'mặc dù có', 'C2', 'Notwithstanding these limits, the study is valuable.', 'Mặc dù có những hạn chế đó, nghiên cứu vẫn có giá trị.', 'Rất trang trọng, gần như chỉ gặp trong văn bản pháp lý và học thuật.'],

  /* ---------------------- Nguyên nhân ----------------------- */
  ['because', 'cause', 'spoken', 'conj', 'Theo sau là MỆNH ĐỀ', 'bởi vì', 'A1', 'We stayed home because it was raining.', 'Chúng tôi ở nhà vì trời mưa.', ''],
  ['because of', 'cause', 'neutral', 'prep', 'Theo sau là DANH TỪ hoặc V-ing', 'vì', 'A2', 'The flight was delayed because of fog.', 'Chuyến bay hoãn vì sương mù.', 'Có "of" thì phải là danh từ; không có "of" thì phải là mệnh đề.'],
  ['since', 'cause', 'neutral', 'conj', 'Theo sau là mệnh đề; dấu phẩy khi đứng đầu câu', 'vì, bởi lẽ', 'B1', 'Since you are here, let us start.', 'Vì bạn đã đến rồi, ta bắt đầu thôi.', 'Cũng có nghĩa thời gian ("từ khi") — ngữ cảnh phải rõ.'],
  ['as', 'cause', 'neutral', 'conj', 'Theo sau là mệnh đề', 'vì', 'B1', 'As the road was closed, we turned back.', 'Vì đường bị chặn, chúng tôi quay lại.', 'Nghĩa nguyên nhân của "as" yếu hơn "because"; nhiều nghĩa nên dễ mơ hồ.'],
  ['due to', 'cause', 'neutral', 'prep', 'Theo sau là danh từ; chuẩn mực là đi sau động từ "to be"', 'do', 'B2', 'The delay was due to a technical fault.', 'Việc chậm trễ là do lỗi kỹ thuật.', 'Văn trang trọng: "due to" bổ nghĩa cho danh từ, "owing to" bổ nghĩa cho mệnh đề.'],
  ['owing to', 'cause', 'academic', 'prep', 'Theo sau là danh từ hoặc V-ing', 'do bởi', 'C1', 'Owing to heavy rain, the event was moved indoors.', 'Do mưa lớn, sự kiện được chuyển vào trong nhà.', ''],
  ['on account of', 'cause', 'academic', 'prep', 'Theo sau là danh từ', 'vì lý do', 'C1', 'The road closed on account of flooding.', 'Con đường bị đóng vì ngập lụt.', ''],
  ['given that', 'cause', 'academic', 'conj', 'Theo sau là mệnh đề', 'xét thấy rằng', 'C1', 'Given that resources are limited, we must prioritise.', 'Xét thấy nguồn lực có hạn, ta phải ưu tiên.', ''],

  /* ------------------------ Kết quả ------------------------- */
  ['so', 'result', 'spoken', 'conj', 'Dấu phẩy trước khi nối hai mệnh đề', 'nên', 'A1', 'It was late, so we went home.', 'Muộn rồi nên chúng tôi về nhà.', 'Là liên từ; đừng dùng "so" mở đầu câu trong bài viết học thuật.'],
  ['therefore', 'result', 'academic', 'start-mid', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'do đó', 'B2', 'The data is incomplete; therefore, the result is provisional.', 'Dữ liệu chưa đủ; do đó kết quả chỉ là tạm thời.', 'Trạng từ — không nối hai mệnh đề bằng dấu phẩy.'],
  ['thus', 'result', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu; đi với V-ing thì không cần', 'như vậy', 'C1', 'Costs fell, thus increasing the margin.', 'Chi phí giảm, như vậy làm biên lợi nhuận tăng.', ''],
  ['hence', 'result', 'academic', 'start', 'Dấu phẩy sau nó; theo sau có thể là cụm danh từ không cần động từ', 'vì thế', 'C1', 'The soil is poor; hence the low yield.', 'Đất xấu; vì thế năng suất thấp.', ''],
  ['consequently', 'result', 'academic', 'start', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'kết quả là', 'B2', 'Funding was cut. Consequently, the project stalled.', 'Kinh phí bị cắt. Kết quả là dự án đình trệ.', ''],
  ['as a result', 'result', 'neutral', 'start', 'Dấu phẩy sau nó', 'kết quả là', 'B1', 'As a result, sales doubled.', 'Kết quả là doanh số tăng gấp đôi.', ''],
  ['as a result of', 'result', 'neutral', 'prep', 'Theo sau là danh từ hoặc V-ing', 'do hậu quả của', 'B2', 'Prices rose as a result of the shortage.', 'Giá tăng do hậu quả của tình trạng thiếu hàng.', ''],
  ['for this reason', 'result', 'neutral', 'start', 'Dấu phẩy sau nó', 'vì lý do này', 'B2', 'For this reason, we recommend caution.', 'Vì lý do này, chúng tôi khuyến nghị thận trọng.', ''],
  ['accordingly', 'result', 'academic', 'start', 'Dấu phẩy sau nó', 'theo đó', 'C1', 'The rules changed; accordingly, the form was updated.', 'Quy định đã đổi; theo đó biểu mẫu được cập nhật.', ''],
  ['that is why', 'result', 'spoken', 'start', 'Không cần dấu phẩy sau', 'đó là lý do', 'B1', 'That is why I called you.', 'Đó là lý do tôi gọi bạn.', ''],

  /* ------------------------- Ví dụ -------------------------- */
  ['for example', 'example', 'neutral', 'start-mid', 'Dấu phẩy hai bên khi chen giữa câu', 'ví dụ', 'A2', 'Some fruits, for example mangoes, grow well here.', 'Một số loại quả, ví dụ xoài, hợp với đất này.', ''],
  ['for instance', 'example', 'neutral', 'start-mid', 'Dấu phẩy hai bên khi chen giữa câu', 'chẳng hạn', 'B1', 'For instance, the survey excluded part-time staff.', 'Chẳng hạn, khảo sát đã loại nhân viên bán thời gian.', 'Đồng nghĩa "for example" — đổi qua lại để bài viết đỡ lặp.'],
  ['such as', 'example', 'neutral', 'prep', 'Theo sau là danh từ, KHÔNG có dấu phẩy ngay sau', 'như là', 'B1', 'Skills such as listening take time.', 'Những kỹ năng như nghe cần thời gian.', 'Sai hay gặp: "such as, mangoes" — không có dấu phẩy sau "such as".'],
  ['like', 'example', 'spoken', 'prep', 'Theo sau là danh từ', 'như', 'A2', 'Sports like football are popular here.', 'Các môn như bóng đá rất phổ biến ở đây.', 'Thân mật hơn "such as"; bài học thuật nên dùng "such as".'],
  ['including', 'example', 'neutral', 'prep', 'Theo sau là danh từ; dấu phẩy trước khi chen giữa câu', 'bao gồm', 'B1', 'Several countries, including Vietnam, joined.', 'Nhiều nước, bao gồm Việt Nam, đã tham gia.', ''],
  ['namely', 'example', 'academic', 'mid', 'Dấu phẩy trước; liệt kê ĐẦY ĐỦ chứ không phải nêu mẫu', 'cụ thể là', 'C1', 'Two options remain, namely repair and replacement.', 'Còn lại hai lựa chọn, cụ thể là sửa và thay mới.', 'Khác "for example": "namely" là liệt kê hết, "for example" chỉ nêu vài cái.'],
  ['in particular', 'example', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'đặc biệt là', 'B2', 'In particular, younger learners benefited most.', 'Đặc biệt là người học trẻ hưởng lợi nhiều nhất.', ''],
  ['to illustrate', 'example', 'academic', 'start', 'Dấu phẩy sau nó', 'để minh hoạ', 'C1', 'To illustrate, consider the following case.', 'Để minh hoạ, hãy xét trường hợp sau.', ''],

  /* ----------------------- Nhấn mạnh ------------------------ */
  ['really', 'emphasis', 'spoken', 'mid', 'Đứng trước tính từ hoặc động từ chính', 'thật sự', 'A1', 'I really like this song.', 'Tôi thật sự thích bài này.', 'Quá thân mật cho bài viết học thuật.'],
  ['actually', 'emphasis', 'spoken', 'start-mid', 'Dấu phẩy sau khi mở câu', 'thật ra', 'A2', 'Actually, the meeting is tomorrow.', 'Thật ra cuộc họp là ngày mai.', 'Trong tiếng Anh, "actually" nghĩa là "thật ra", KHÔNG phải "hiện nay" — bẫy với người học nói tiếng có từ gốc Latin.'],
  ['in fact', 'emphasis', 'neutral', 'start-mid', 'Dấu phẩy sau khi mở câu', 'trên thực tế', 'B1', 'In fact, the opposite happened.', 'Trên thực tế, điều ngược lại đã xảy ra.', ''],
  ['indeed', 'emphasis', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'quả thực', 'B2', 'Indeed, the trend has accelerated.', 'Quả thực xu hướng đó đã tăng tốc.', ''],
  ['clearly', 'emphasis', 'neutral', 'start', 'Dấu phẩy sau nó', 'rõ ràng là', 'B2', 'Clearly, more research is needed.', 'Rõ ràng là cần nghiên cứu thêm.', 'Đừng dùng để né việc chứng minh — giám khảo nhận ra ngay.'],
  ['notably', 'emphasis', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'đáng chú ý là', 'C1', 'Notably, three studies reached the same conclusion.', 'Đáng chú ý là ba nghiên cứu cùng đi đến một kết luận.', ''],
  ['above all', 'emphasis', 'neutral', 'start', 'Dấu phẩy sau nó', 'trên hết', 'B2', 'Above all, the plan must be affordable.', 'Trên hết, kế hoạch phải vừa túi tiền.', ''],
  ['most importantly', 'emphasis', 'neutral', 'start', 'Dấu phẩy sau nó', 'quan trọng nhất là', 'B2', 'Most importantly, nobody was hurt.', 'Quan trọng nhất là không ai bị thương.', ''],
  ['it is worth noting that', 'emphasis', 'academic', 'start', 'Theo sau là mệnh đề, không có dấu phẩy', 'đáng lưu ý rằng', 'C1', 'It is worth noting that the sample was self-selected.', 'Đáng lưu ý rằng mẫu là tự chọn.', ''],
  ['let alone', 'emphasis', 'spoken', 'mid', 'Đứng giữa hai vế, vế sau khó xảy ra hơn', 'chứ đừng nói đến', 'C1', 'He cannot cook rice, let alone a whole meal.', 'Anh ấy nấu cơm còn không xong, chứ đừng nói cả bữa.', 'Vế sau bắt buộc phải "nặng đô" hơn vế trước.'],

  /* ------------------ Làm rõ, diễn giải --------------------- */
  ['that is', 'clarify', 'neutral', 'mid', 'Dấu phẩy trước và sau', 'tức là', 'B2', 'The deadline is end of quarter, that is, 30 June.', 'Hạn chót là cuối quý, tức là ngày 30 tháng 6.', ''],
  ['in other words', 'clarify', 'neutral', 'start', 'Dấu phẩy sau nó', 'nói cách khác', 'B1', 'In other words, the plan failed.', 'Nói cách khác, kế hoạch đã thất bại.', 'Dùng khi diễn giải lại cho dễ hiểu, không phải để lặp y nguyên.'],
  ['to put it simply', 'clarify', 'spoken', 'start', 'Dấu phẩy sau nó', 'nói đơn giản là', 'B2', 'To put it simply, we ran out of time.', 'Nói đơn giản là chúng tôi hết giờ.', ''],
  ['i mean', 'clarify', 'spoken', 'start-mid', 'Dấu phẩy sau nó; chỉ dùng khi nói', 'ý tôi là', 'A2', 'I mean, it was not a bad idea.', 'Ý tôi là, cũng không phải ý tồi.', 'Chỉ dùng khi nói. Viết ra là mất điểm trang trọng.'],
  ['specifically', 'clarify', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'cụ thể hơn', 'B2', 'Specifically, three factors explain the gap.', 'Cụ thể hơn, ba yếu tố giải thích khoảng cách này.', ''],
  ['more precisely', 'clarify', 'academic', 'start', 'Dấu phẩy sau nó', 'chính xác hơn là', 'C1', 'More precisely, the effect appears only above 30 degrees.', 'Chính xác hơn, hiệu ứng chỉ xuất hiện trên 30 độ.', ''],
  ['in essence', 'clarify', 'academic', 'start', 'Dấu phẩy sau nó', 'về bản chất', 'C1', 'In essence, both models predict the same outcome.', 'Về bản chất, hai mô hình dự đoán cùng một kết quả.', ''],
  ['simply put', 'clarify', 'neutral', 'start', 'Dấu phẩy sau nó', 'nói gọn lại', 'C1', 'Simply put, the cost outweighs the benefit.', 'Nói gọn lại, chi phí lớn hơn lợi ích.', 'Đảo thành "put simply" cũng đúng, nghĩa không đổi. Chỉ đứng đầu câu, không chen giữa câu.'],

  /* ------------------------ So sánh ------------------------- */
  ['similarly', 'compare', 'academic', 'start', 'Dấu phẩy sau nó', 'tương tự', 'B2', 'Similarly, the second group showed no change.', 'Tương tự, nhóm thứ hai không thay đổi.', ''],
  ['likewise', 'compare', 'academic', 'start', 'Dấu phẩy sau nó', 'cũng vậy', 'C1', 'Likewise, exports fell in the same period.', 'Cũng vậy, xuất khẩu giảm trong cùng kỳ.', ''],
  ['in the same way', 'compare', 'neutral', 'start', 'Dấu phẩy sau nó', 'theo cách tương tự', 'B2', 'In the same way, listening improves with exposure.', 'Theo cách tương tự, kỹ năng nghe tiến bộ nhờ tiếp xúc nhiều.', ''],
  ['just as', 'compare', 'neutral', 'conj', 'Theo sau là mệnh đề; thường đi cặp với "so"', 'cũng như', 'C1', 'Just as reading builds vocabulary, so listening builds fluency.', 'Cũng như đọc giúp mở rộng từ vựng, nghe giúp nói trôi chảy.', ''],
  ['compared with', 'compare', 'academic', 'prep', 'Theo sau là danh từ', 'so với', 'B2', 'Compared with last year, costs are down.', 'So với năm ngoái, chi phí đã giảm.', '"compared with" đối chiếu chi tiết, "compared to" thiên về ví von.'],
  ['in comparison', 'compare', 'academic', 'start', 'Dấu phẩy sau nó', 'khi so sánh', 'B2', 'In comparison, the new method is far faster.', 'Khi so sánh, phương pháp mới nhanh hơn nhiều.', ''],
  ['both … and', 'compare', 'neutral', 'mid', 'Hai vế phải cùng dạng ngữ pháp', 'cả … lẫn', 'A2', 'She is both fluent and accurate.', 'Cô ấy vừa trôi chảy vừa chính xác.', 'Song song sai dạng là lỗi phổ biến: "both fluent and she writes well" là sai.'],
  ['not only … but also', 'compare', 'neutral', 'mid', 'Hai vế phải cùng dạng; đảo ngữ khi "not only" mở câu', 'không những … mà còn', 'B2', 'Not only did costs fall, but also profits rose.', 'Không những chi phí giảm mà lợi nhuận còn tăng.', 'Mở câu bằng "Not only" thì phải đảo ngữ: "Not only did…".'],

  /* ------------------ Trình tự, thời gian ------------------- */
  ['first', 'sequence', 'neutral', 'start', 'Dấu phẩy sau nó', 'đầu tiên', 'A1', 'First, read the whole question.', 'Đầu tiên, đọc hết câu hỏi.', 'Dạng chuẩn là "first", không phải "firstly" trong văn Mỹ.'],
  ['firstly', 'sequence', 'neutral', 'start', 'Dấu phẩy sau nó', 'thứ nhất', 'B1', 'Firstly, the sample was too small.', 'Thứ nhất, mẫu quá nhỏ.', 'Dùng "firstly" thì phải dùng tiếp "secondly", đừng trộn "first… secondly".'],
  ['then', 'sequence', 'spoken', 'start-mid', 'Dấu phẩy sau khi mở câu', 'rồi thì', 'A1', 'Then we checked the results.', 'Rồi chúng tôi kiểm tra kết quả.', ''],
  ['next', 'sequence', 'neutral', 'start', 'Dấu phẩy sau nó', 'tiếp theo', 'A2', 'Next, add the sugar.', 'Tiếp theo, cho đường vào.', ''],
  ['after that', 'sequence', 'spoken', 'start', 'Dấu phẩy sau nó', 'sau đó', 'A2', 'After that, we walked home.', 'Sau đó, chúng tôi đi bộ về.', ''],
  ['meanwhile', 'sequence', 'neutral', 'start', 'Dấu phẩy sau nó', 'trong khi đó', 'B1', 'Meanwhile, the team prepared the report.', 'Trong khi đó, cả nhóm chuẩn bị báo cáo.', ''],
  ['subsequently', 'sequence', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'sau đó', 'C1', 'Subsequently, the policy was revised.', 'Sau đó, chính sách được sửa đổi.', ''],
  ['previously', 'sequence', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'trước đó', 'B2', 'Previously, only two studies existed.', 'Trước đó chỉ có hai nghiên cứu.', ''],
  ['eventually', 'sequence', 'neutral', 'start-mid', 'Dấu phẩy sau khi mở câu', 'cuối cùng thì', 'B1', 'Eventually, they reached an agreement.', 'Cuối cùng họ cũng đạt thoả thuận.', 'Nghĩa là "rốt cuộc", KHÔNG phải "có thể xảy ra".'],
  ['finally', 'sequence', 'neutral', 'start', 'Dấu phẩy sau nó', 'cuối cùng', 'A2', 'Finally, check your spelling.', 'Cuối cùng, kiểm tra lại chính tả.', 'Dùng cho ý cuối trong chuỗi, không phải để kết luận cả bài.'],
  ['as soon as', 'sequence', 'neutral', 'conj', 'Theo sau là mệnh đề; dùng thì hiện tại cho tương lai', 'ngay khi', 'B1', 'As soon as the results arrive, I will call you.', 'Ngay khi có kết quả tôi sẽ gọi bạn.', 'Sau "as soon as" không dùng "will" — dùng hiện tại đơn.'],
  ['once', 'sequence', 'neutral', 'conj', 'Theo sau là mệnh đề', 'một khi', 'B2', 'Once you understand the pattern, it gets easier.', 'Một khi bạn hiểu quy luật, mọi thứ dễ hơn.', ''],

  /* ----------------------- Điều kiện ------------------------ */
  ['if', 'condition', 'spoken', 'conj', 'Theo sau là mệnh đề; dấu phẩy khi mệnh đề if đứng trước', 'nếu', 'A1', 'If it rains, we will stay in.', 'Nếu trời mưa, chúng tôi sẽ ở trong nhà.', 'Sau "if" chỉ điều kiện thì không dùng "will".'],
  ['unless', 'condition', 'neutral', 'conj', 'Theo sau là mệnh đề khẳng định — bản thân nó đã mang nghĩa phủ định', 'trừ khi', 'B1', 'We will start unless someone objects.', 'Chúng tôi sẽ bắt đầu trừ khi có ai phản đối.', 'Không dùng "unless … not" — thành phủ định hai lần.'],
  ['as long as', 'condition', 'neutral', 'conj', 'Theo sau là mệnh đề', 'miễn là', 'B1', 'You can borrow it as long as you return it today.', 'Bạn mượn được, miễn là trả trong hôm nay.', ''],
  ['provided that', 'condition', 'academic', 'conj', 'Theo sau là mệnh đề', 'với điều kiện là', 'C1', 'The data may be used provided that the source is cited.', 'Được dùng dữ liệu với điều kiện ghi rõ nguồn.', ''],
  ['in case', 'condition', 'neutral', 'conj', 'Theo sau là mệnh đề, nói về đề phòng chứ không phải điều kiện', 'phòng khi', 'B2', 'Take an umbrella in case it rains.', 'Mang ô phòng khi trời mưa.', 'Khác "if": "in case" là làm trước để đề phòng, "if" là làm khi điều kiện xảy ra.'],
  ['otherwise', 'condition', 'neutral', 'start-mid', 'Chấm câu hoặc chấm phẩy trước, dấu phẩy sau', 'nếu không thì', 'B2', 'Leave now; otherwise, you will miss the bus.', 'Đi ngay đi; nếu không sẽ lỡ xe buýt.', ''],

  /* ----------------------- Mục đích ------------------------- */
  ['to', 'purpose', 'spoken', 'prep', 'Theo sau là động từ nguyên thể', 'để', 'A1', 'She left early to catch the train.', 'Cô ấy đi sớm để kịp chuyến tàu.', ''],
  ['in order to', 'purpose', 'neutral', 'prep', 'Theo sau là động từ nguyên thể', 'nhằm để', 'B1', 'We use samples in order to save time.', 'Chúng tôi dùng mẫu nhằm tiết kiệm thời gian.', 'Trang trọng hơn "to"; đừng lặp lại quá nhiều trong một đoạn.'],
  ['so as to', 'purpose', 'academic', 'prep', 'Theo sau là động từ nguyên thể; phủ định là "so as not to"', 'để mà', 'B2', 'He spoke slowly so as to be understood.', 'Anh ấy nói chậm để người khác hiểu được.', ''],
  ['so that', 'purpose', 'neutral', 'conj', 'Theo sau là MỆNH ĐỀ, thường có can / will / would', 'để cho', 'B1', 'Turn the light on so that we can see.', 'Bật đèn lên để chúng ta nhìn thấy.', 'Có "that" thì theo sau là mệnh đề; "so as to" thì theo sau là động từ.'],
  ['with a view to', 'purpose', 'academic', 'prep', 'Theo sau là V-ing, KHÔNG phải nguyên thể', 'với mục tiêu', 'C1', 'The rules were revised with a view to reducing waste.', 'Quy định được sửa với mục tiêu giảm lãng phí.', 'Sai hay gặp: "with a view to reduce". Phải là V-ing.'],
  ['for the purpose of', 'purpose', 'academic', 'prep', 'Theo sau là danh từ hoặc V-ing', 'nhằm mục đích', 'C1', 'Data was collected for the purpose of comparison.', 'Dữ liệu được thu thập nhằm mục đích so sánh.', ''],

  /* ------------------ Kết luận, tóm tắt --------------------- */
  ['so', 'conclusion', 'spoken', 'start', 'Dấu phẩy sau nó khi mở câu tổng kết', 'vậy là', 'A2', 'So, what do we do next?', 'Vậy giờ ta làm gì tiếp?', 'Chỉ dùng khi nói. Bài viết học thuật nên dùng "therefore" hoặc "in conclusion".'],
  ['anyway', 'conclusion', 'spoken', 'start', 'Dấu phẩy sau nó', 'dù sao thì', 'B1', 'Anyway, we decided to go.', 'Dù sao thì chúng tôi cũng quyết định đi.', 'Rất thân mật, không dùng trong bài viết.'],
  ['in short', 'conclusion', 'neutral', 'start', 'Dấu phẩy sau nó', 'nói ngắn gọn', 'B2', 'In short, the plan is not viable.', 'Nói ngắn gọn, kế hoạch này không khả thi.', ''],
  ['overall', 'conclusion', 'neutral', 'start', 'Dấu phẩy sau nó', 'nhìn chung', 'B1', 'Overall, the trend is upward.', 'Nhìn chung, xu hướng là đi lên.', 'Rất hợp cho câu tổng quan trong IELTS Writing Task 1.'],
  ['on the whole', 'conclusion', 'neutral', 'start', 'Dấu phẩy sau nó', 'về tổng thể', 'B2', 'On the whole, the feedback was positive.', 'Về tổng thể, phản hồi là tích cực.', ''],
  ['in conclusion', 'conclusion', 'academic', 'start', 'Dấu phẩy sau nó', 'tóm lại', 'B1', 'In conclusion, both factors matter.', 'Tóm lại, cả hai yếu tố đều quan trọng.', 'Chỉ dùng MỘT LẦN, ở đoạn cuối. Dùng giữa bài là mất điểm mạch lạc.'],
  ['to sum up', 'conclusion', 'neutral', 'start', 'Dấu phẩy sau nó', 'tóm lại là', 'B2', 'To sum up, three changes are needed.', 'Tóm lại, cần ba thay đổi.', ''],
  ['to conclude', 'conclusion', 'academic', 'start', 'Dấu phẩy sau nó', 'để kết luận', 'C1', 'To conclude, the evidence supports the hypothesis.', 'Để kết luận, bằng chứng ủng hộ giả thuyết.', ''],
  ['all things considered', 'conclusion', 'neutral', 'start', 'Dấu phẩy sau nó', 'cân nhắc mọi mặt', 'C1', 'All things considered, it was a fair result.', 'Cân nhắc mọi mặt, đó là kết quả công bằng.', ''],
  ['ultimately', 'conclusion', 'academic', 'start-mid', 'Dấu phẩy sau khi mở câu', 'rốt cuộc', 'C1', 'Ultimately, the choice depends on budget.', 'Rốt cuộc, lựa chọn phụ thuộc vào ngân sách.', '']
];
/* eslint-enable max-len */

/** Bỏ dòng trùng (word + fn), trả mảng object */
function rows() {
  const seen = new Set();
  const out = [];
  for (const r of ROWS) {
    const key = r[0] + '|' + r[1];
    if (seen.has(key)) continue;
    seen.add(key);
    const o = {};
    COLUMNS.forEach((c, i) => { o[c] = r[i]; });
    out.push(o);
  }
  return out;
}

module.exports = { COLUMNS, FUNCTIONS, REGISTERS, rows };
