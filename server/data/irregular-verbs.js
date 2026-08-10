/**
 * Bảng động từ bất quy tắc tiếng Anh — dữ liệu gốc để seed vào bảng irregular_verbs.
 *
 * Mỗi dòng: [v1, v2, v3, ving, ipaUk, ipaUs, nghĩa Việt, nhóm, bậc, ghi chú, ví dụ V2, dịch ví dụ]
 *
 * - IPA ghi cho **dạng nguyên thể (V1)**. Phát âm V2/V3 để TTS đọc; chỉ ghi chú
 *   thêm khi cách đọc gây bẫy (read/read/read viết giống nhau nhưng đọc khác).
 * - Nhóm biến đổi:
 *     'aaa' — ba dạng giống nhau (cut · cut · cut)
 *     'aba' — V1 = V3 (come · came · come)
 *     'abb' — V2 = V3 (buy · bought · bought)
 *     'abc' — ba dạng khác nhau (go · went · gone)
 * - Bậc CEFR để lọc theo trình độ người học.
 * - Ghi chú biến thể Anh–Mỹ ghi ở cột note (learnt/learned, gotten/got…).
 */
'use strict';

const COLUMNS = ['v1', 'v2', 'v3', 'ving', 'ipa_uk', 'ipa_us', 'vi', 'grp', 'level', 'note', 'ex_en', 'ex_vi'];

/* eslint-disable max-len */
const ROWS = [
  // ---------- Nhóm aaa: ba dạng giống nhau ----------
  ['bet', 'bet', 'bet', 'betting', 'bet', 'bet', 'cá cược', 'aaa', 'B1', 'Cũng dùng betted (hiếm)', 'She bet me ten dollars that it would rain.', 'Cô ấy cá với tôi mười đô là trời sẽ mưa.'],
  ['bid', 'bid', 'bid', 'bidding', 'bɪd', 'bɪd', 'trả giá, đấu giá', 'aaa', 'B2', 'Nghĩa "chào, chúc" thì chia bade/bidden', 'He bid twice as much as anyone else.', 'Anh ấy trả giá gấp đôi mọi người khác.'],
  ['broadcast', 'broadcast', 'broadcast', 'broadcasting', 'ˈbrɔːdkɑːst', 'ˈbrɔːdkæst', 'phát sóng', 'aaa', 'B2', '', 'The station broadcast the match live.', 'Đài phát trực tiếp trận đấu.'],
  ['burst', 'burst', 'burst', 'bursting', 'bɜːst', 'bɜːrst', 'nổ tung, vỡ', 'aaa', 'B1', '', 'The pipe burst during the cold night.', 'Đường ống vỡ trong đêm lạnh.'],
  ['cast', 'cast', 'cast', 'casting', 'kɑːst', 'kæst', 'ném, phân vai', 'aaa', 'B2', '', 'They cast him as the villain.', 'Họ chọn anh ấy vào vai phản diện.'],
  ['cost', 'cost', 'cost', 'costing', 'kɒst', 'kɔːst', 'có giá, tốn', 'aaa', 'A2', 'Nghĩa "tính giá thành" chia costed', 'The repairs cost more than we expected.', 'Việc sửa chữa tốn hơn chúng tôi tưởng.'],
  ['cut', 'cut', 'cut', 'cutting', 'kʌt', 'kʌt', 'cắt', 'aaa', 'A1', '', 'I cut my finger while cooking.', 'Tôi bị đứt tay khi nấu ăn.'],
  ['fit', 'fit', 'fit', 'fitting', 'fɪt', 'fɪt', 'vừa vặn', 'aaa', 'A2', 'Anh-Anh thường dùng fitted', 'The jacket fit him perfectly.', 'Chiếc áo khoác vừa in với anh ấy.'],
  ['forecast', 'forecast', 'forecast', 'forecasting', 'ˈfɔːkɑːst', 'ˈfɔːrkæst', 'dự báo', 'aaa', 'B2', 'Cũng dùng forecasted', 'They forecast heavy rain for the weekend.', 'Họ dự báo mưa lớn vào cuối tuần.'],
  ['hit', 'hit', 'hit', 'hitting', 'hɪt', 'hɪt', 'đánh, va vào', 'aaa', 'A1', '', 'The car hit a tree.', 'Chiếc xe đâm vào một cái cây.'],
  ['hurt', 'hurt', 'hurt', 'hurting', 'hɜːt', 'hɜːrt', 'làm đau, đau', 'aaa', 'A1', '', 'I hurt my back lifting the box.', 'Tôi đau lưng vì nhấc cái hộp.'],
  ['let', 'let', 'let', 'letting', 'let', 'let', 'cho phép', 'aaa', 'A1', '', 'They let us leave early.', 'Họ cho chúng tôi về sớm.'],
  ['put', 'put', 'put', 'putting', 'pʊt', 'pʊt', 'đặt, để', 'aaa', 'A1', '', 'She put the keys on the table.', 'Cô ấy đặt chìa khoá lên bàn.'],
  ['quit', 'quit', 'quit', 'quitting', 'kwɪt', 'kwɪt', 'nghỉ việc, bỏ', 'aaa', 'B1', 'Anh-Anh cũng dùng quitted', 'He quit his job last month.', 'Anh ấy nghỉ việc tháng trước.'],
  ['read', 'read', 'read', 'reading', 'riːd', 'riːd', 'đọc', 'aaa', 'A1', 'BẪY: V1 đọc /riːd/, V2 và V3 đọc /red/', 'I read the whole book last night.', 'Tôi đọc hết quyển sách tối qua.'],
  ['rid', 'rid', 'rid', 'ridding', 'rɪd', 'rɪd', 'loại bỏ', 'aaa', 'B2', '', 'They rid the house of mice.', 'Họ dọn sạch chuột trong nhà.'],
  ['set', 'set', 'set', 'setting', 'set', 'set', 'đặt, thiết lập', 'aaa', 'A2', '', 'She set the alarm for six.', 'Cô ấy đặt báo thức lúc sáu giờ.'],
  ['shed', 'shed', 'shed', 'shedding', 'ʃed', 'ʃed', 'rụng, đổ (nước mắt)', 'aaa', 'B2', '', 'The tree shed its leaves early.', 'Cái cây rụng lá sớm.'],
  ['shut', 'shut', 'shut', 'shutting', 'ʃʌt', 'ʃʌt', 'đóng', 'aaa', 'A2', '', 'He shut the door quietly.', 'Anh ấy đóng cửa nhẹ nhàng.'],
  ['slit', 'slit', 'slit', 'slitting', 'slɪt', 'slɪt', 'rạch, xẻ', 'aaa', 'C1', '', 'She slit the envelope open.', 'Cô ấy rạch phong bì ra.'],
  ['split', 'split', 'split', 'splitting', 'splɪt', 'splɪt', 'chia, tách', 'aaa', 'B1', '', 'We split the bill between us.', 'Chúng tôi chia đôi hoá đơn.'],
  ['spread', 'spread', 'spread', 'spreading', 'spred', 'spred', 'lan ra, phết', 'aaa', 'B1', '', 'The news spread quickly.', 'Tin tức lan nhanh.'],
  ['thrust', 'thrust', 'thrust', 'thrusting', 'θrʌst', 'θrʌst', 'đẩy mạnh', 'aaa', 'C1', '', 'He thrust the note into my hand.', 'Anh ấy dúi mẩu giấy vào tay tôi.'],
  ['upset', 'upset', 'upset', 'upsetting', 'ʌpˈset', 'ʌpˈset', 'làm buồn bực', 'aaa', 'B1', '', 'The news upset her badly.', 'Tin đó làm cô ấy buồn ghê gớm.'],

  // ---------- Nhóm aba: V1 = V3 ----------
  ['become', 'became', 'become', 'becoming', 'bɪˈkʌm', 'bɪˈkʌm', 'trở thành', 'aba', 'A2', '', 'She became a doctor at twenty-six.', 'Cô ấy trở thành bác sĩ năm hai mươi sáu tuổi.'],
  ['come', 'came', 'come', 'coming', 'kʌm', 'kʌm', 'đến', 'aba', 'A1', '', 'They came home very late.', 'Họ về nhà rất muộn.'],
  ['overcome', 'overcame', 'overcome', 'overcoming', 'ˌəʊvəˈkʌm', 'ˌoʊvərˈkʌm', 'vượt qua', 'aba', 'B2', '', 'She overcame her fear of flying.', 'Cô ấy vượt qua nỗi sợ đi máy bay.'],
  ['run', 'ran', 'run', 'running', 'rʌn', 'rʌn', 'chạy, điều hành', 'aba', 'A1', '', 'He ran five kilometres this morning.', 'Anh ấy chạy năm cây số sáng nay.'],

  // ---------- Nhóm abb: V2 = V3 ----------
  ['bend', 'bent', 'bent', 'bending', 'bend', 'bend', 'uốn cong', 'abb', 'B1', '', 'She bent down to pick it up.', 'Cô ấy cúi xuống nhặt nó lên.'],
  ['bleed', 'bled', 'bled', 'bleeding', 'bliːd', 'bliːd', 'chảy máu', 'abb', 'B1', '', 'His nose bled for a few minutes.', 'Mũi anh ấy chảy máu mấy phút.'],
  ['bring', 'brought', 'brought', 'bringing', 'brɪŋ', 'brɪŋ', 'mang đến', 'abb', 'A1', '', 'She brought a cake to the party.', 'Cô ấy mang bánh đến bữa tiệc.'],
  ['build', 'built', 'built', 'building', 'bɪld', 'bɪld', 'xây dựng', 'abb', 'A2', '', 'They built the bridge in two years.', 'Họ xây cây cầu trong hai năm.'],
  ['burn', 'burnt', 'burnt', 'burning', 'bɜːn', 'bɜːrn', 'đốt, cháy', 'abb', 'A2', 'Mỹ dùng burned; Anh dùng cả hai', 'I burnt the toast again.', 'Tôi lại làm cháy bánh mì nướng.'],
  ['buy', 'bought', 'bought', 'buying', 'baɪ', 'baɪ', 'mua', 'abb', 'A1', '', 'We bought the tickets online.', 'Chúng tôi mua vé trên mạng.'],
  ['catch', 'caught', 'caught', 'catching', 'kætʃ', 'kætʃ', 'bắt, kịp', 'abb', 'A2', '', 'He caught the last train.', 'Anh ấy kịp chuyến tàu cuối.'],
  ['cling', 'clung', 'clung', 'clinging', 'klɪŋ', 'klɪŋ', 'bám chặt', 'abb', 'C1', '', 'The child clung to her mother.', 'Đứa bé bám chặt lấy mẹ.'],
  ['creep', 'crept', 'crept', 'creeping', 'kriːp', 'kriːp', 'bò, lẻn', 'abb', 'B2', '', 'He crept out without a sound.', 'Anh ấy lẻn ra không một tiếng động.'],
  ['deal', 'dealt', 'dealt', 'dealing', 'diːl', 'diːl', 'giải quyết, chia bài', 'abb', 'B1', 'dealt đọc /delt/', 'She dealt with the complaint herself.', 'Cô ấy tự xử lý khiếu nại.'],
  ['dig', 'dug', 'dug', 'digging', 'dɪɡ', 'dɪɡ', 'đào', 'abb', 'B1', '', 'They dug a hole for the tree.', 'Họ đào một cái hố để trồng cây.'],
  ['dream', 'dreamt', 'dreamt', 'dreaming', 'driːm', 'driːm', 'mơ', 'abb', 'A2', 'Mỹ dùng dreamed', 'I dreamt about the exam.', 'Tôi mơ thấy kỳ thi.'],
  ['feed', 'fed', 'fed', 'feeding', 'fiːd', 'fiːd', 'cho ăn', 'abb', 'A2', '', 'She fed the cat before leaving.', 'Cô ấy cho mèo ăn trước khi đi.'],
  ['feel', 'felt', 'felt', 'feeling', 'fiːl', 'fiːl', 'cảm thấy', 'abb', 'A1', '', 'I felt tired all day.', 'Tôi thấy mệt cả ngày.'],
  ['fight', 'fought', 'fought', 'fighting', 'faɪt', 'faɪt', 'chiến đấu', 'abb', 'B1', '', 'They fought for their rights.', 'Họ đấu tranh cho quyền lợi của mình.'],
  ['find', 'found', 'found', 'finding', 'faɪnd', 'faɪnd', 'tìm thấy', 'abb', 'A1', 'Đừng nhầm với found (thành lập) — chia đều', 'She found her keys under the sofa.', 'Cô ấy tìm thấy chìa khoá dưới ghế sofa.'],
  ['flee', 'fled', 'fled', 'fleeing', 'fliː', 'fliː', 'chạy trốn', 'abb', 'B2', '', 'Thousands fled the fighting.', 'Hàng nghìn người chạy trốn cuộc giao tranh.'],
  ['fling', 'flung', 'flung', 'flinging', 'flɪŋ', 'flɪŋ', 'quăng, ném', 'abb', 'C1', '', 'He flung his bag onto the bed.', 'Anh ấy quăng túi lên giường.'],
  ['grind', 'ground', 'ground', 'grinding', 'ɡraɪnd', 'ɡraɪnd', 'xay, nghiền', 'abb', 'B2', '', 'She ground the coffee beans fresh.', 'Cô ấy xay hạt cà phê tươi.'],
  ['hang', 'hung', 'hung', 'hanging', 'hæŋ', 'hæŋ', 'treo', 'abb', 'B1', 'Nghĩa "treo cổ" chia hanged', 'He hung the picture above the desk.', 'Anh ấy treo bức tranh phía trên bàn.'],
  ['have', 'had', 'had', 'having', 'hæv', 'hæv', 'có', 'abb', 'A1', '', 'We had a great time.', 'Chúng tôi đã có khoảng thời gian tuyệt vời.'],
  ['hear', 'heard', 'heard', 'hearing', 'hɪə', 'hɪr', 'nghe thấy', 'abb', 'A1', 'heard đọc /hɜːd/, không phải /hɪəd/', 'I heard a strange noise.', 'Tôi nghe thấy một tiếng động lạ.'],
  ['hold', 'held', 'held', 'holding', 'həʊld', 'hoʊld', 'cầm, giữ, tổ chức', 'abb', 'A2', '', 'She held the baby carefully.', 'Cô ấy bế em bé cẩn thận.'],
  ['keep', 'kept', 'kept', 'keeping', 'kiːp', 'kiːp', 'giữ', 'abb', 'A2', '', 'He kept all her letters.', 'Anh ấy giữ tất cả thư của cô ấy.'],
  ['kneel', 'knelt', 'knelt', 'kneeling', 'niːl', 'niːl', 'quỳ', 'abb', 'B2', 'Mỹ dùng kneeled', 'She knelt beside the bed.', 'Cô ấy quỳ bên giường.'],
  ['lay', 'laid', 'laid', 'laying', 'leɪ', 'leɪ', 'đặt nằm xuống', 'abb', 'B1', 'Ngoại động từ — đừng nhầm với lie', 'He laid the book on the desk.', 'Anh ấy đặt quyển sách lên bàn.'],
  ['lead', 'led', 'led', 'leading', 'liːd', 'liːd', 'dẫn dắt', 'abb', 'B1', 'led đọc /led/', 'She led the team to victory.', 'Cô ấy dẫn dắt đội đến chiến thắng.'],
  ['lean', 'leant', 'leant', 'leaning', 'liːn', 'liːn', 'dựa, nghiêng', 'abb', 'B1', 'Mỹ dùng leaned', 'He leant against the wall.', 'Anh ấy dựa vào tường.'],
  ['leap', 'leapt', 'leapt', 'leaping', 'liːp', 'liːp', 'nhảy vọt', 'abb', 'B2', 'Mỹ dùng leaped', 'The cat leapt onto the shelf.', 'Con mèo nhảy vọt lên kệ.'],
  ['learn', 'learnt', 'learnt', 'learning', 'lɜːn', 'lɜːrn', 'học', 'abb', 'A1', 'Mỹ dùng learned', 'I learnt Spanish at school.', 'Tôi học tiếng Tây Ban Nha ở trường.'],
  ['leave', 'left', 'left', 'leaving', 'liːv', 'liːv', 'rời đi, để lại', 'abb', 'A1', '', 'They left before dawn.', 'Họ rời đi trước bình minh.'],
  ['lend', 'lent', 'lent', 'lending', 'lend', 'lend', 'cho mượn', 'abb', 'A2', '', 'She lent me her umbrella.', 'Cô ấy cho tôi mượn ô.'],
  ['light', 'lit', 'lit', 'lighting', 'laɪt', 'laɪt', 'thắp sáng', 'abb', 'B1', 'Cũng dùng lighted khi làm tính từ', 'He lit a candle.', 'Anh ấy thắp một ngọn nến.'],
  ['lose', 'lost', 'lost', 'losing', 'luːz', 'luːz', 'mất, thua', 'abb', 'A1', '', 'We lost the match by one goal.', 'Chúng tôi thua trận đấu một bàn.'],
  ['make', 'made', 'made', 'making', 'meɪk', 'meɪk', 'làm, chế tạo', 'abb', 'A1', '', 'She made dinner for everyone.', 'Cô ấy nấu bữa tối cho mọi người.'],
  ['mean', 'meant', 'meant', 'meaning', 'miːn', 'miːn', 'có nghĩa là', 'abb', 'A2', 'meant đọc /ment/', 'I meant it as a joke.', 'Tôi nói vậy để đùa thôi.'],
  ['meet', 'met', 'met', 'meeting', 'miːt', 'miːt', 'gặp', 'abb', 'A1', '', 'We met at a conference.', 'Chúng tôi gặp nhau ở một hội nghị.'],
  ['pay', 'paid', 'paid', 'paying', 'peɪ', 'peɪ', 'trả tiền', 'abb', 'A1', '', 'He paid for everyone.', 'Anh ấy trả tiền cho tất cả mọi người.'],
  ['say', 'said', 'said', 'saying', 'seɪ', 'seɪ', 'nói', 'abb', 'A1', 'said đọc /sed/', 'She said nothing about it.', 'Cô ấy không nói gì về chuyện đó.'],
  ['seek', 'sought', 'sought', 'seeking', 'siːk', 'siːk', 'tìm kiếm', 'abb', 'B2', '', 'They sought advice from a lawyer.', 'Họ tìm lời khuyên từ một luật sư.'],
  ['sell', 'sold', 'sold', 'selling', 'sel', 'sel', 'bán', 'abb', 'A1', '', 'They sold the house last year.', 'Họ bán căn nhà năm ngoái.'],
  ['send', 'sent', 'sent', 'sending', 'send', 'send', 'gửi', 'abb', 'A1', '', 'I sent the email yesterday.', 'Tôi gửi email hôm qua.'],
  ['shine', 'shone', 'shone', 'shining', 'ʃaɪn', 'ʃaɪn', 'chiếu sáng', 'abb', 'B1', 'Nghĩa "đánh bóng" chia shined', 'The sun shone all afternoon.', 'Mặt trời chiếu sáng suốt buổi chiều.'],
  ['shoot', 'shot', 'shot', 'shooting', 'ʃuːt', 'ʃuːt', 'bắn, quay phim', 'abb', 'B1', '', 'They shot the film in Iceland.', 'Họ quay bộ phim ở Iceland.'],
  ['sit', 'sat', 'sat', 'sitting', 'sɪt', 'sɪt', 'ngồi', 'abb', 'A1', '', 'She sat by the window.', 'Cô ấy ngồi cạnh cửa sổ.'],
  ['sleep', 'slept', 'slept', 'sleeping', 'sliːp', 'sliːp', 'ngủ', 'abb', 'A1', '', 'I slept for ten hours.', 'Tôi ngủ mười tiếng.'],
  ['slide', 'slid', 'slid', 'sliding', 'slaɪd', 'slaɪd', 'trượt', 'abb', 'B1', '', 'The book slid off the table.', 'Quyển sách trượt khỏi bàn.'],
  ['smell', 'smelt', 'smelt', 'smelling', 'smel', 'smel', 'ngửi, có mùi', 'abb', 'A2', 'Mỹ dùng smelled', 'The kitchen smelt of garlic.', 'Bếp có mùi tỏi.'],
  ['spell', 'spelt', 'spelt', 'spelling', 'spel', 'spel', 'đánh vần', 'abb', 'A2', 'Mỹ dùng spelled', 'She spelt her name for me.', 'Cô ấy đánh vần tên cho tôi.'],
  ['spend', 'spent', 'spent', 'spending', 'spend', 'spend', 'tiêu, dành (thời gian)', 'abb', 'A2', '', 'We spent three days in Hue.', 'Chúng tôi ở Huế ba ngày.'],
  ['spill', 'spilt', 'spilt', 'spilling', 'spɪl', 'spɪl', 'làm đổ', 'abb', 'B1', 'Mỹ dùng spilled', 'He spilt coffee on his shirt.', 'Anh ấy làm đổ cà phê lên áo.'],
  ['spin', 'spun', 'spun', 'spinning', 'spɪn', 'spɪn', 'quay tròn', 'abb', 'B2', '', 'The wheel spun freely.', 'Bánh xe quay tự do.'],
  ['stand', 'stood', 'stood', 'standing', 'stænd', 'stænd', 'đứng, chịu đựng', 'abb', 'A1', '', 'He stood at the back of the room.', 'Anh ấy đứng ở cuối phòng.'],
  ['stick', 'stuck', 'stuck', 'sticking', 'stɪk', 'stɪk', 'dán, mắc kẹt', 'abb', 'B1', '', 'The door stuck in the damp weather.', 'Cánh cửa bị kẹt trong thời tiết ẩm.'],
  ['sting', 'stung', 'stung', 'stinging', 'stɪŋ', 'stɪŋ', 'chích, đốt', 'abb', 'B2', '', 'A bee stung him on the arm.', 'Một con ong đốt vào tay anh ấy.'],
  ['strike', 'struck', 'struck', 'striking', 'straɪk', 'straɪk', 'đánh, đình công', 'abb', 'B2', 'V3 stricken dùng trong nghĩa bóng', 'Lightning struck the tower.', 'Sét đánh vào tháp.'],
  ['sweep', 'swept', 'swept', 'sweeping', 'swiːp', 'swiːp', 'quét', 'abb', 'B1', '', 'She swept the floor.', 'Cô ấy quét sàn nhà.'],
  ['swing', 'swung', 'swung', 'swinging', 'swɪŋ', 'swɪŋ', 'đung đưa', 'abb', 'B2', '', 'The gate swung open.', 'Cánh cổng bật mở.'],
  ['teach', 'taught', 'taught', 'teaching', 'tiːtʃ', 'tiːtʃ', 'dạy', 'abb', 'A1', '', 'She taught maths for twenty years.', 'Cô ấy dạy toán hai mươi năm.'],
  ['tell', 'told', 'told', 'telling', 'tel', 'tel', 'kể, bảo', 'abb', 'A1', '', 'He told us the whole story.', 'Anh ấy kể cho chúng tôi toàn bộ câu chuyện.'],
  ['think', 'thought', 'thought', 'thinking', 'θɪŋk', 'θɪŋk', 'nghĩ', 'abb', 'A1', '', 'I thought you were joking.', 'Tôi tưởng bạn đùa.'],
  ['understand', 'understood', 'understood', 'understanding', 'ˌʌndəˈstænd', 'ˌʌndərˈstænd', 'hiểu', 'abb', 'A2', '', 'She understood the problem immediately.', 'Cô ấy hiểu vấn đề ngay lập tức.'],
  ['weep', 'wept', 'wept', 'weeping', 'wiːp', 'wiːp', 'khóc', 'abb', 'C1', '', 'She wept when she heard the news.', 'Cô ấy khóc khi nghe tin.'],
  ['win', 'won', 'won', 'winning', 'wɪn', 'wɪn', 'thắng', 'abb', 'A1', 'won đọc /wʌn/', 'They won the championship.', 'Họ thắng giải vô địch.'],
  ['wind', 'wound', 'wound', 'winding', 'waɪnd', 'waɪnd', 'quấn, lên dây', 'abb', 'B2', 'V1 đọc /waɪnd/, V2/V3 đọc /waʊnd/', 'He wound the rope around the post.', 'Anh ấy quấn dây quanh cột.'],

  // ---------- Nhóm abc: ba dạng khác nhau ----------
  ['arise', 'arose', 'arisen', 'arising', 'əˈraɪz', 'əˈraɪz', 'nảy sinh', 'abc', 'B2', '', 'A problem arose during testing.', 'Một vấn đề nảy sinh trong quá trình thử nghiệm.'],
  ['awake', 'awoke', 'awoken', 'awaking', 'əˈweɪk', 'əˈweɪk', 'thức dậy', 'abc', 'B1', '', 'She awoke to the sound of rain.', 'Cô ấy thức dậy trong tiếng mưa.'],
  ['bear', 'bore', 'borne', 'bearing', 'beə', 'ber', 'chịu đựng, sinh ra', 'abc', 'B2', 'V3 born khi nói về việc sinh ra', 'He bore the pain without complaining.', 'Anh ấy chịu đựng cơn đau không than vãn.'],
  ['beat', 'beat', 'beaten', 'beating', 'biːt', 'biːt', 'đánh bại', 'abc', 'A2', 'V1 và V2 viết giống nhau', 'Our team beat them 3–1.', 'Đội chúng tôi thắng họ 3–1.'],
  ['begin', 'began', 'begun', 'beginning', 'bɪˈɡɪn', 'bɪˈɡɪn', 'bắt đầu', 'abc', 'A1', '', 'The film began at eight.', 'Bộ phim bắt đầu lúc tám giờ.'],
  ['bite', 'bit', 'bitten', 'biting', 'baɪt', 'baɪt', 'cắn', 'abc', 'A2', '', 'The dog bit the postman.', 'Con chó cắn người đưa thư.'],
  ['blow', 'blew', 'blown', 'blowing', 'bləʊ', 'bloʊ', 'thổi', 'abc', 'A2', '', 'The wind blew all night.', 'Gió thổi suốt đêm.'],
  ['break', 'broke', 'broken', 'breaking', 'breɪk', 'breɪk', 'làm vỡ, phá', 'abc', 'A1', '', 'He broke the window.', 'Anh ấy làm vỡ cửa sổ.'],
  ['choose', 'chose', 'chosen', 'choosing', 'tʃuːz', 'tʃuːz', 'chọn', 'abc', 'A2', '', 'She chose the red one.', 'Cô ấy chọn cái màu đỏ.'],
  ['do', 'did', 'done', 'doing', 'duː', 'duː', 'làm', 'abc', 'A1', '', 'I did my homework early.', 'Tôi làm bài tập sớm.'],
  ['draw', 'drew', 'drawn', 'drawing', 'drɔː', 'drɔː', 'vẽ, kéo', 'abc', 'A1', '', 'She drew a map for us.', 'Cô ấy vẽ bản đồ cho chúng tôi.'],
  ['drink', 'drank', 'drunk', 'drinking', 'drɪŋk', 'drɪŋk', 'uống', 'abc', 'A1', '', 'He drank three cups of tea.', 'Anh ấy uống ba tách trà.'],
  ['drive', 'drove', 'driven', 'driving', 'draɪv', 'draɪv', 'lái xe', 'abc', 'A1', '', 'They drove all the way to Da Nang.', 'Họ lái xe suốt tới Đà Nẵng.'],
  ['eat', 'ate', 'eaten', 'eating', 'iːt', 'iːt', 'ăn', 'abc', 'A1', 'ate: Anh /et/ hoặc /eɪt/, Mỹ /eɪt/', 'We ate at a small restaurant.', 'Chúng tôi ăn ở một nhà hàng nhỏ.'],
  ['fall', 'fell', 'fallen', 'falling', 'fɔːl', 'fɔːl', 'rơi, ngã', 'abc', 'A1', '', 'He fell off his bike.', 'Anh ấy ngã khỏi xe đạp.'],
  ['fly', 'flew', 'flown', 'flying', 'flaɪ', 'flaɪ', 'bay', 'abc', 'A1', '', 'We flew to Singapore.', 'Chúng tôi bay đến Singapore.'],
  ['forbid', 'forbade', 'forbidden', 'forbidding', 'fəˈbɪd', 'fərˈbɪd', 'cấm', 'abc', 'B2', '', 'The rules forbade mobile phones.', 'Nội quy cấm điện thoại di động.'],
  ['forget', 'forgot', 'forgotten', 'forgetting', 'fəˈɡet', 'fərˈɡet', 'quên', 'abc', 'A1', 'Mỹ đôi khi dùng forgot làm V3', 'I forgot her birthday.', 'Tôi quên sinh nhật cô ấy.'],
  ['forgive', 'forgave', 'forgiven', 'forgiving', 'fəˈɡɪv', 'fərˈɡɪv', 'tha thứ', 'abc', 'B1', '', 'She forgave him eventually.', 'Cuối cùng cô ấy cũng tha thứ cho anh ấy.'],
  ['freeze', 'froze', 'frozen', 'freezing', 'friːz', 'friːz', 'đóng băng', 'abc', 'A2', '', 'The lake froze last winter.', 'Cái hồ đóng băng mùa đông năm ngoái.'],
  ['get', 'got', 'got', 'getting', 'ɡet', 'ɡet', 'nhận, trở nên', 'abb', 'A1', 'Anh-Mỹ dùng V3 gotten → khi đó thành nhóm abc', 'She got a new job.', 'Cô ấy có việc làm mới.'],
  ['give', 'gave', 'given', 'giving', 'ɡɪv', 'ɡɪv', 'cho', 'abc', 'A1', '', 'He gave me his number.', 'Anh ấy cho tôi số của anh ấy.'],
  ['go', 'went', 'gone', 'going', 'ɡəʊ', 'ɡoʊ', 'đi', 'abc', 'A1', 'been dùng khi đã đi và đã về', 'They went to the beach.', 'Họ đi biển.'],
  ['grow', 'grew', 'grown', 'growing', 'ɡrəʊ', 'ɡroʊ', 'lớn lên, trồng', 'abc', 'A2', '', 'The company grew very fast.', 'Công ty phát triển rất nhanh.'],
  ['hide', 'hid', 'hidden', 'hiding', 'haɪd', 'haɪd', 'giấu, trốn', 'abc', 'A2', '', 'She hid the present in the wardrobe.', 'Cô ấy giấu món quà trong tủ.'],
  ['know', 'knew', 'known', 'knowing', 'nəʊ', 'noʊ', 'biết', 'abc', 'A1', '', 'I knew the answer.', 'Tôi biết câu trả lời.'],
  ['lie', 'lay', 'lain', 'lying', 'laɪ', 'laɪ', 'nằm', 'abc', 'B1', 'BẪY: V2 là lay, trùng V1 của "lay" (đặt)', 'He lay on the sofa all afternoon.', 'Anh ấy nằm trên ghế sofa cả buổi chiều.'],
  ['mistake', 'mistook', 'mistaken', 'mistaking', 'mɪˈsteɪk', 'mɪˈsteɪk', 'nhầm lẫn', 'abc', 'B2', '', 'I mistook her for her sister.', 'Tôi nhầm cô ấy với chị cô ấy.'],
  ['ride', 'rode', 'ridden', 'riding', 'raɪd', 'raɪd', 'cưỡi, đi (xe)', 'abc', 'A2', '', 'She rode her bike to school.', 'Cô ấy đạp xe đến trường.'],
  ['ring', 'rang', 'rung', 'ringing', 'rɪŋ', 'rɪŋ', 'reo, gọi điện', 'abc', 'A2', '', 'The phone rang twice.', 'Điện thoại reo hai lần.'],
  ['rise', 'rose', 'risen', 'rising', 'raɪz', 'raɪz', 'tăng lên, mọc', 'abc', 'B1', 'Nội động từ — đừng nhầm với raise', 'Prices rose sharply last year.', 'Giá tăng mạnh năm ngoái.'],
  ['see', 'saw', 'seen', 'seeing', 'siː', 'siː', 'nhìn thấy', 'abc', 'A1', '', 'I saw her at the station.', 'Tôi thấy cô ấy ở nhà ga.'],
  ['shake', 'shook', 'shaken', 'shaking', 'ʃeɪk', 'ʃeɪk', 'lắc, rung', 'abc', 'B1', '', 'He shook my hand warmly.', 'Anh ấy bắt tay tôi nồng nhiệt.'],
  ['show', 'showed', 'shown', 'showing', 'ʃəʊ', 'ʃoʊ', 'cho xem', 'abc', 'A1', 'V3 showed cũng chấp nhận được', 'She showed me the photos.', 'Cô ấy cho tôi xem ảnh.'],
  ['shrink', 'shrank', 'shrunk', 'shrinking', 'ʃrɪŋk', 'ʃrɪŋk', 'co lại', 'abc', 'B2', '', 'My shirt shrank in the wash.', 'Áo tôi co lại sau khi giặt.'],
  ['sing', 'sang', 'sung', 'singing', 'sɪŋ', 'sɪŋ', 'hát', 'abc', 'A1', '', 'She sang beautifully.', 'Cô ấy hát rất hay.'],
  ['sink', 'sank', 'sunk', 'sinking', 'sɪŋk', 'sɪŋk', 'chìm', 'abc', 'B1', '', 'The boat sank in minutes.', 'Con thuyền chìm trong vài phút.'],
  ['speak', 'spoke', 'spoken', 'speaking', 'spiːk', 'spiːk', 'nói', 'abc', 'A1', '', 'He spoke to the manager.', 'Anh ấy nói chuyện với quản lý.'],
  ['steal', 'stole', 'stolen', 'stealing', 'stiːl', 'stiːl', 'ăn cắp', 'abc', 'A2', '', 'Someone stole my bike.', 'Ai đó lấy trộm xe đạp của tôi.'],
  ['swear', 'swore', 'sworn', 'swearing', 'sweə', 'swer', 'thề, chửi thề', 'abc', 'B2', '', 'He swore he had never seen it.', 'Anh ấy thề chưa từng thấy nó.'],
  ['swim', 'swam', 'swum', 'swimming', 'swɪm', 'swɪm', 'bơi', 'abc', 'A1', '', 'We swam in the sea.', 'Chúng tôi bơi ngoài biển.'],
  ['take', 'took', 'taken', 'taking', 'teɪk', 'teɪk', 'lấy, mang', 'abc', 'A1', '', 'She took the bus home.', 'Cô ấy bắt xe buýt về nhà.'],
  ['tear', 'tore', 'torn', 'tearing', 'teə', 'ter', 'xé', 'abc', 'B1', 'V1 đọc /teə/, khác tear (nước mắt) /tɪə/', 'He tore the letter in half.', 'Anh ấy xé đôi lá thư.'],
  ['throw', 'threw', 'thrown', 'throwing', 'θrəʊ', 'θroʊ', 'ném', 'abc', 'A2', '', 'She threw the ball to him.', 'Cô ấy ném quả bóng cho anh ấy.'],
  ['wake', 'woke', 'woken', 'waking', 'weɪk', 'weɪk', 'thức dậy', 'abc', 'A2', '', 'I woke at five this morning.', 'Tôi thức dậy lúc năm giờ sáng nay.'],
  ['wear', 'wore', 'worn', 'wearing', 'weə', 'wer', 'mặc, đeo', 'abc', 'A1', '', 'She wore a blue dress.', 'Cô ấy mặc một chiếc váy xanh.'],
  ['weave', 'wove', 'woven', 'weaving', 'wiːv', 'wiːv', 'dệt', 'abc', 'C1', '', 'They wove the baskets by hand.', 'Họ đan giỏ bằng tay.'],
  ['withdraw', 'withdrew', 'withdrawn', 'withdrawing', 'wɪðˈdrɔː', 'wɪðˈdrɔː', 'rút lui, rút tiền', 'abc', 'B2', '', 'He withdrew from the competition.', 'Anh ấy rút khỏi cuộc thi.'],
  ['write', 'wrote', 'written', 'writing', 'raɪt', 'raɪt', 'viết', 'abc', 'A1', '', 'She wrote three novels.', 'Cô ấy viết ba cuốn tiểu thuyết.'],

  // ---------- Bổ sung: động từ bất quy tắc thường gặp còn lại ----------
  ['be', 'was/were', 'been', 'being', 'biː', 'biː', 'thì, là, ở', 'abc', 'A1', 'was cho I/he/she/it, were cho you/we/they', 'She was at home all day.', 'Cô ấy ở nhà cả ngày.'],
  ['bind', 'bound', 'bound', 'binding', 'baɪnd', 'baɪnd', 'buộc, ràng buộc', 'abb', 'B2', '', 'The contract bound both parties.', 'Hợp đồng ràng buộc cả hai bên.'],
  ['breed', 'bred', 'bred', 'breeding', 'briːd', 'briːd', 'nhân giống', 'abb', 'B2', '', 'They bred horses for racing.', 'Họ nhân giống ngựa đua.'],
  ['forsake', 'forsook', 'forsaken', 'forsaking', 'fəˈseɪk', 'fərˈseɪk', 'ruồng bỏ', 'abc', 'C2', 'Văn viết trang trọng', 'He forsook his old friends.', 'Anh ấy ruồng bỏ những người bạn cũ.'],
  ['lend', 'lent', 'lent', 'lending', 'lend', 'lend', 'cho vay', 'abb', 'A2', '', 'The bank lent them the money.', 'Ngân hàng cho họ vay tiền.'],
  ['mow', 'mowed', 'mown', 'mowing', 'məʊ', 'moʊ', 'cắt cỏ', 'abc', 'B2', 'V3 mowed cũng dùng được', 'He mowed the lawn on Sunday.', 'Anh ấy cắt cỏ vào Chủ nhật.'],
  ['prove', 'proved', 'proven', 'proving', 'pruːv', 'pruːv', 'chứng minh', 'abc', 'B1', 'V3 proved phổ biến ở Anh', 'The theory proved correct.', 'Lý thuyết đó được chứng minh là đúng.'],
  ['seek', 'sought', 'sought', 'seeking', 'siːk', 'siːk', 'tìm kiếm', 'abb', 'B2', '', 'She sought help from a specialist.', 'Cô ấy tìm sự giúp đỡ từ chuyên gia.'],
  ['sew', 'sewed', 'sewn', 'sewing', 'səʊ', 'soʊ', 'khâu', 'abc', 'B2', 'sew đọc /səʊ/, không phải /suː/', 'She sewed a button on my coat.', 'Cô ấy khâu cúc áo khoác cho tôi.'],
  ['shrink', 'shrank', 'shrunk', 'shrinking', 'ʃrɪŋk', 'ʃrɪŋk', 'co lại, thu nhỏ', 'abc', 'B2', '', 'The market shrank by ten percent.', 'Thị trường thu hẹp mười phần trăm.'],
  ['sow', 'sowed', 'sown', 'sowing', 'səʊ', 'soʊ', 'gieo hạt', 'abc', 'B2', '', 'They sowed the seeds in spring.', 'Họ gieo hạt vào mùa xuân.'],
  ['strive', 'strove', 'striven', 'striving', 'straɪv', 'straɪv', 'phấn đấu', 'abc', 'C1', '', 'She strove to finish on time.', 'Cô ấy cố gắng hoàn thành đúng hạn.'],
  ['swell', 'swelled', 'swollen', 'swelling', 'swel', 'swel', 'sưng lên', 'abc', 'B2', '', 'His ankle swelled up overnight.', 'Mắt cá chân anh ấy sưng lên qua đêm.'],
  ['tread', 'trod', 'trodden', 'treading', 'tred', 'tred', 'giẫm lên', 'abc', 'C1', '', 'Someone trod on my foot.', 'Ai đó giẫm lên chân tôi.'],
  ['undergo', 'underwent', 'undergone', 'undergoing', 'ˌʌndəˈɡəʊ', 'ˌʌndərˈɡoʊ', 'trải qua', 'abc', 'B2', '', 'She underwent surgery last week.', 'Cô ấy trải qua phẫu thuật tuần trước.'],
  ['uphold', 'upheld', 'upheld', 'upholding', 'ʌpˈhəʊld', 'ʌpˈhoʊld', 'giữ vững, duy trì', 'abb', 'C1', '', 'The court upheld the decision.', 'Toà giữ nguyên phán quyết.'],
  ['wet', 'wet', 'wet', 'wetting', 'wet', 'wet', 'làm ướt', 'aaa', 'B1', 'Cũng dùng wetted', 'The rain wet the whole floor.', 'Mưa làm ướt cả sàn nhà.'],

  // ---------- Bổ sung đợt 2: dạng ghép và ít gặp hơn ----------
  ['behold', 'beheld', 'beheld', 'beholding', 'bɪˈhəʊld', 'bɪˈhoʊld', 'ngắm nhìn', 'abb', 'C2', 'Văn chương, cổ', 'They beheld a stunning view.', 'Họ ngắm nhìn một khung cảnh tuyệt đẹp.'],
  ['bless', 'blessed', 'blessed', 'blessing', 'bles', 'bles', 'ban phước', 'abb', 'B2', 'Dạng cổ blest dùng trong thơ ca', 'The priest blessed the couple.', 'Vị linh mục ban phước cho đôi vợ chồng.'],
  ['clothe', 'clothed', 'clothed', 'clothing', 'kləʊð', 'kloʊð', 'mặc quần áo cho', 'abb', 'C1', 'Dạng clad dùng như tính từ', 'She clothed the children warmly.', 'Cô ấy mặc ấm cho lũ trẻ.'],
  ['dive', 'dived', 'dived', 'diving', 'daɪv', 'daɪv', 'lặn, lao xuống', 'abb', 'B1', 'Mỹ thường dùng dove cho V2', 'He dived into the pool.', 'Anh ấy lao xuống hồ bơi.'],
  ['dwell', 'dwelt', 'dwelt', 'dwelling', 'dwel', 'dwel', 'cư ngụ, nghiền ngẫm', 'abb', 'C1', 'Cũng dùng dwelled', 'She dwelt on the mistake for days.', 'Cô ấy day dứt về sai lầm đó mấy ngày.'],
  ['foresee', 'foresaw', 'foreseen', 'foreseeing', 'fɔːˈsiː', 'fɔːrˈsiː', 'thấy trước', 'abc', 'B2', '', 'Nobody foresaw the collapse.', 'Không ai thấy trước sự sụp đổ.'],
  ['foretell', 'foretold', 'foretold', 'foretelling', 'fɔːˈtel', 'fɔːrˈtel', 'tiên đoán', 'abb', 'C1', '', 'The report foretold the crisis.', 'Bản báo cáo đã tiên đoán cuộc khủng hoảng.'],
  ['input', 'input', 'input', 'inputting', 'ˈɪnpʊt', 'ˈɪnpʊt', 'nhập liệu', 'aaa', 'B2', 'Cũng dùng inputted', 'She input the figures manually.', 'Cô ấy nhập số liệu bằng tay.'],
  ['knit', 'knitted', 'knitted', 'knitting', 'nɪt', 'nɪt', 'đan', 'abb', 'B1', 'Dạng knit dùng trong nghĩa bóng (close-knit)', 'She knitted a scarf for him.', 'Cô ấy đan một chiếc khăn cho anh ấy.'],
  ['misunderstand', 'misunderstood', 'misunderstood', 'misunderstanding', 'ˌmɪsʌndəˈstænd', 'ˌmɪsʌndərˈstænd', 'hiểu lầm', 'abb', 'B1', '', 'I misunderstood the question.', 'Tôi hiểu lầm câu hỏi.'],
  ['outdo', 'outdid', 'outdone', 'outdoing', 'aʊtˈduː', 'aʊtˈduː', 'vượt trội hơn', 'abc', 'C1', '', 'She outdid everyone in the test.', 'Cô ấy vượt trội hơn tất cả trong bài kiểm tra.'],
  ['outgrow', 'outgrew', 'outgrown', 'outgrowing', 'aʊtˈɡrəʊ', 'aʊtˈɡroʊ', 'lớn vượt, bỏ lại', 'abc', 'B2', '', 'He outgrew his shoes in months.', 'Chỉ vài tháng là chân nó đã chật giày.'],
  ['overdo', 'overdid', 'overdone', 'overdoing', 'ˌəʊvəˈduː', 'ˌoʊvərˈduː', 'làm quá', 'abc', 'B2', '', 'He overdid the introduction.', 'Anh ấy làm phần mở đầu quá đà.'],
  ['overhear', 'overheard', 'overheard', 'overhearing', 'ˌəʊvəˈhɪə', 'ˌoʊvərˈhɪr', 'nghe lỏm', 'abb', 'B2', '', 'I overheard them arguing.', 'Tôi nghe lỏm họ cãi nhau.'],
  ['override', 'overrode', 'overridden', 'overriding', 'ˌəʊvəˈraɪd', 'ˌoʊvərˈraɪd', 'bác bỏ, ghi đè', 'abc', 'C1', '', 'The board overrode his objection.', 'Hội đồng bác bỏ ý kiến phản đối của ông ấy.'],
  ['oversee', 'oversaw', 'overseen', 'overseeing', 'ˌəʊvəˈsiː', 'ˌoʊvərˈsiː', 'giám sát', 'abc', 'B2', '', 'She oversaw the whole project.', 'Cô ấy giám sát toàn bộ dự án.'],
  ['oversleep', 'overslept', 'overslept', 'oversleeping', 'ˌəʊvəˈsliːp', 'ˌoʊvərˈsliːp', 'ngủ quên', 'abb', 'B1', '', 'I overslept and missed the bus.', 'Tôi ngủ quên và lỡ xe buýt.'],
  ['overtake', 'overtook', 'overtaken', 'overtaking', 'ˌəʊvəˈteɪk', 'ˌoʊvərˈteɪk', 'vượt qua', 'abc', 'B2', '', 'China overtook Japan in output.', 'Trung Quốc vượt Nhật Bản về sản lượng.'],
  ['overthrow', 'overthrew', 'overthrown', 'overthrowing', 'ˌəʊvəˈθrəʊ', 'ˌoʊvərˈθroʊ', 'lật đổ', 'abc', 'C1', '', 'The rebels overthrew the government.', 'Quân nổi dậy lật đổ chính phủ.'],
  ['plead', 'pleaded', 'pleaded', 'pleading', 'pliːd', 'pliːd', 'cầu xin, biện hộ', 'abb', 'B2', 'Mỹ (pháp lý) dùng pled', 'He pleaded not guilty.', 'Anh ta khai không có tội.'],
  ['rebuild', 'rebuilt', 'rebuilt', 'rebuilding', 'ˌriːˈbɪld', 'ˌriːˈbɪld', 'xây lại', 'abb', 'B1', '', 'They rebuilt the school after the flood.', 'Họ xây lại trường sau trận lụt.'],
  ['repay', 'repaid', 'repaid', 'repaying', 'rɪˈpeɪ', 'rɪˈpeɪ', 'hoàn trả', 'abb', 'B1', '', 'She repaid the loan early.', 'Cô ấy trả khoản vay sớm.'],
  ['rewrite', 'rewrote', 'rewritten', 'rewriting', 'ˌriːˈraɪt', 'ˌriːˈraɪt', 'viết lại', 'abc', 'B1', '', 'He rewrote the whole chapter.', 'Anh ấy viết lại cả chương.'],
  ['saw', 'sawed', 'sawn', 'sawing', 'sɔː', 'sɔː', 'cưa', 'abc', 'B2', 'BẪY: trùng chính tả với V2 của "see"', 'They sawed the log in half.', 'Họ cưa đôi khúc gỗ.'],
  ['shave', 'shaved', 'shaved', 'shaving', 'ʃeɪv', 'ʃeɪv', 'cạo râu', 'abb', 'A2', 'Dạng shaven dùng như tính từ', 'He shaved before the interview.', 'Anh ấy cạo râu trước buổi phỏng vấn.'],
  ['sling', 'slung', 'slung', 'slinging', 'slɪŋ', 'slɪŋ', 'quăng, đeo lủng lẳng', 'abb', 'C1', '', 'She slung her bag over her shoulder.', 'Cô ấy quàng túi qua vai.'],
  ['speed', 'sped', 'sped', 'speeding', 'spiːd', 'spiːd', 'phóng nhanh', 'abb', 'B2', 'Nghĩa "chạy quá tốc độ" chia speeded', 'The car sped past us.', 'Chiếc xe phóng vụt qua chúng tôi.'],
  ['spit', 'spat', 'spat', 'spitting', 'spɪt', 'spɪt', 'nhổ, khạc', 'abb', 'B2', 'Mỹ cũng dùng spit cho V2/V3', 'He spat out the bitter medicine.', 'Anh ấy nhổ ra thứ thuốc đắng.'],
  ['spoil', 'spoilt', 'spoilt', 'spoiling', 'spɔɪl', 'spɔɪl', 'làm hỏng, nuông chiều', 'abb', 'B1', 'Mỹ dùng spoiled', 'The rain spoilt our picnic.', 'Cơn mưa làm hỏng buổi dã ngoại.'],
  ['spring', 'sprang', 'sprung', 'springing', 'sprɪŋ', 'sprɪŋ', 'bật lên, nảy sinh', 'abc', 'B2', 'Mỹ cũng dùng sprung cho V2', 'She sprang out of bed.', 'Cô ấy bật dậy khỏi giường.'],
  ['stink', 'stank', 'stunk', 'stinking', 'stɪŋk', 'stɪŋk', 'bốc mùi hôi', 'abc', 'B2', '', 'The bin stank in the heat.', 'Thùng rác bốc mùi trong cái nóng.'],
  ['string', 'strung', 'strung', 'stringing', 'strɪŋ', 'strɪŋ', 'xâu chuỗi, căng dây', 'abb', 'C1', '', 'They strung lights across the yard.', 'Họ căng dây đèn ngang sân.'],
  ['undertake', 'undertook', 'undertaken', 'undertaking', 'ˌʌndəˈteɪk', 'ˌʌndərˈteɪk', 'đảm nhận', 'abc', 'B2', '', 'She undertook the research alone.', 'Cô ấy đảm nhận nghiên cứu một mình.'],
  ['unwind', 'unwound', 'unwound', 'unwinding', 'ˌʌnˈwaɪnd', 'ˌʌnˈwaɪnd', 'tháo ra, thư giãn', 'abb', 'B2', 'V2/V3 đọc /ʌnˈwaʊnd/', 'He unwound with a book.', 'Anh ấy thư giãn với một quyển sách.'],
  ['withhold', 'withheld', 'withheld', 'withholding', 'wɪðˈhəʊld', 'wɪðˈhoʊld', 'giữ lại, không cung cấp', 'abb', 'C1', '', 'They withheld the results.', 'Họ giữ lại kết quả không công bố.'],
  ['withstand', 'withstood', 'withstood', 'withstanding', 'wɪðˈstænd', 'wɪðˈstænd', 'chịu đựng, chống chọi', 'abb', 'C1', '', 'The bridge withstood the storm.', 'Cây cầu chống chọi được cơn bão.'],
  ['wring', 'wrung', 'wrung', 'wringing', 'rɪŋ', 'rɪŋ', 'vắt, siết', 'abb', 'C1', 'w câm — đọc giống ring', 'She wrung the towel dry.', 'Cô ấy vắt khô cái khăn.'],
];
/* eslint-enable max-len */

/** Bỏ dòng trùng v1 (giữ dòng đầu) rồi trả về mảng object */
function rows() {
  const seen = new Set();
  const out = [];
  for (const r of ROWS) {
    if (seen.has(r[0])) continue;
    seen.add(r[0]);
    const o = {};
    COLUMNS.forEach((c, i) => { o[c] = r[i]; });
    out.push(o);
  }
  return out;
}

module.exports = { COLUMNS, rows };
