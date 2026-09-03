# Nhập tay và nhóm câu hỏi — rà soát 2026-09-03 và phương án triển khai

Câu hỏi đặt ra: *"hệ thống cần nâng cấp và sửa chữa gì nữa? nhập bài tay thấy
nhiều lỗi, chưa gom được theo nhóm câu hỏi; cần nhóm câu hỏi cho reading,
speaking, listening…"* Tài liệu này trả lời bằng bằng chứng chạy được, rồi mới
đề xuất. Mọi con số dưới đây lấy từ một kịch bản thăm dò chạy trên máy phiên
(`entry-probe.mjs`, kết quả nguyên văn ở §8) và từ chính cơ sở dữ liệu, không
phải từ đọc mã rồi đoán.

## 0. Kết luận trước

1. **Đường nhập tay hỏng ở đúng chỗ nó không có mô hình.** Nền tảng biết "nhóm
   câu hỏi" ở đúng một chỗ: cột `questions.group_key`, chỉ dùng cho phần G của
   VPET, chỉ được đặt khi soạn qua trình xây đề, và không màn hình nào cho xem
   hay sửa. Mọi lỗi người vận hành gặp — câu G soạn ở ngân hàng không thuộc nhóm
   nào, chọn câu vào phần thì vỡ nhóm mà không ai báo, phần C hiện đoạn văn lặp,
   luyện Part G chỉ luyện được câu đầu mỗi nhóm — đều là hệ quả của việc nhóm
   không phải là một thực thể mà là một quy ước theo vị trí.
2. **Ngân hàng phần C hiện không đúng đề thật.** 26 câu C là **26 đoạn văn khác
   nhau**, mỗi đoạn một câu hỏi; blueprint và đồng hồ của phần này giả định
   **ba đoạn, mỗi đoạn hai câu**. Một đề C hôm nay là sáu đoạn văn cho sáu câu,
   với 540 giây tính cho ba đoạn.
3. **Có tám lỗi vá được trong một, hai buổi mà không đổi lược đồ** (§5, giai
   đoạn 0). Chúng chặn được thiệt hại đang xảy ra hôm nay, và nên làm trước.
4. **Việc đúng để làm là đưa "nhóm câu hỏi" thành thực thể hạng nhất** — một
   bảng riêng, mang đoạn văn hoặc bài nghe, câu hỏi trỏ về nó — dùng chung cho
   reading, listening, speaking và mọi họ đề, không chỉ phần G (§4). Ba đến bốn
   buổi cho lõi, hai đến ba buổi cho màn hình quản trị (§5, giai đoạn 1–2).

## 1. Cách rà

- Đọc theo đúng đường người vận hành đi: màn Ngân hàng câu hỏi
  (`public/admin/bank.html`), trình xây đề và bộ soạn tại chỗ
  (`public/admin/builder.html`), API nhận câu (`server/api.js`:
  `readQuestion`, `bulk`, `readInlineQuestions`, `writeInlineQuestions`,
  `drawFromPool`, đính câu vào phần), blueprint (`server/data/exam-formats.js`),
  cách bài thi giao câu cho trình chạy (`server/exam-api.js`) và cách trình chạy
  hiển thị (`public/prep/exam/_runner.js`), luyện Part (`server/drills.js`).
- Rồi **nhập thử bằng đúng API mà màn hình gọi**: tải tệp CSV mẫu và gửi lại,
  soạn một câu G ở ngân hàng, thêm phần bằng tay, chọn câu từ ngân hàng vào
  phần, gỡ một câu giữa nhóm, rút và sửa một thành viên nhóm. Ghi lại mã trạng
  thái và trạng thái CSDL sau mỗi bước. Dọn sạch sau khi chạy.
- Đối chiếu CSDL: số nhóm G, số đoạn văn riêng biệt của phần C, cột `seconds`
  của các phần thi.

## 2. Những gì hỏng trên đường nhập tay

Mỗi mục: chuyện gì xảy ra · bằng chứng · vì sao · ai chịu hậu quả.

### 2.1 Tệp CSV mẫu tự bị chính bộ nhập từ chối

Màn Ngân hàng cho tải `mau-cau-hoi.csv`. Gửi lại đúng bốn dòng của tệp đó qua
`/admin/questions/bulk`: **3 vào, 1 bị từ chối** — dòng 2 là câu điền từ không
có `dap_an`, mà từ vòng rà soát trước cả server lẫn bộ xem trước CSV đều từ
chối câu điền từ không đáp án (đúng). Tệp mẫu chưa được sửa theo. Hai dòng đầu
còn để trống `phan_thi` trong khi họ đề là VPET, nên một dòng vào ngân hàng với
nhãn **No part** — không thuộc bể nào, không bao giờ được rút. (Probe 1a, 1b;
`server/api.js` route `template.csv`.)

Ngoài ra CSV **không có cột** cho lời thoại (`script`), câu trả lời mẫu
(`modelAnswer`), nhóm, hay âm thanh. Tức là **năm phần cần audio (E, F, G, H, J)
không nhập hàng loạt được** theo cách đúng: nhập xong vẫn phải mở từng câu để
gõ lời thoại và đính MP3, và phần G thì không có cách nào gom nhóm.

### 2.2 Ngân hàng câu hỏi không biết nhóm là gì

Soạn một câu phần G ở màn Ngân hàng: **201, `group_key = null`** (probe 2).
`readQuestion()` không nhận trường nhóm; thẻ câu hỏi không hiện nhóm; không có
cách ghép ba câu về một đoạn nghe. Câu đó đi vào bể phần G như **một nhóm một
câu**: bộ sinh đề rút nó cùng các nhóm ba; trình chạy phát đoạn nghe theo vị trí
(câu ở vị trí chia hết cho 3 là câu đầu nhóm), nên một câu lẻ làm lệch toàn bộ
các nhóm sau nó trong phần. Người soạn không có lỗi gì để nhìn thấy.

### 2.3 Bộ chọn câu của trình xây đề hiện cả ba phần nghe, và từ chối im lặng

Bộ chọn lọc theo họ đề và kỹ năng, không theo phần. Với một phần F, nó liệt kê
**E 37 · F 37 · G 37** (probe 4a). Chọn nhầm một câu E vào phần F: server đáp
`{added: 0, skipped: 1}` — 200, không lý do (probe 4b). Màn hình báo "Added 0
items, skipped 1". Người vận hành không biết vì sao, và lặp lại.

### 2.4 Nhóm vỡ mà không ai chặn

Trên một phần G tạo tay: đính **một** câu không mang đoạn nghe của nhóm
`g-b1-1`, một mình — `added: 1` (probe 5a). Đính đủ ba câu của `g-b1-2` rồi gỡ
câu giữa — `ok: true` (probe 5c). Phần G lúc đó giữ `352, 354*, 356` (`*` = mang
đoạn nghe, probe 5d). Trình chạy coi vị trí 0 là câu đầu nhóm: câu 352 không có
gì để phát, câu 354 phát đoạn nghe **ở giữa**, câu 356 hỏi về một đoạn chưa hề
phát. `POST /admin/sections/:sid/items` và `DELETE /admin/items/:id` không biết
nhóm; luật "nguyên nhóm hoặc không" chỉ có ở bộ sinh đề và bộ rút lại
(`drawFromPool`), không có ở đường tay.

### 2.5 Rút một thành viên, hoặc đổi trình độ một thành viên

Rút (`retired`) một câu của `g-b1-1`: 200, nhóm còn **2 câu hoạt động** (probe
6a). Đổi trình độ một câu sang B2: 200, nhóm có **B1×2 + B2×1** (probe 6b).
`readInlineQuestions()` bắt buộc cả nhóm cùng trình độ **lúc soạn**, nhưng
`PUT /admin/questions/:id` và `/status` không kiểm lại. Hậu quả: sinh đề
`strictLevel` lọc theo trình độ nên rút hai phần ba nhóm; `drawFromPool` gặp
nhóm hai câu trong phần cần bội số của ba thì hoặc bỏ nhóm, hoặc để phần thiếu
một câu và báo "không đủ" khi ngân hàng thực ra vẫn đủ.

### 2.6 Phần thêm bằng tay không bao giờ có đồng hồ đúng

Hộp thoại "Thêm phần" mặc định **30 phút** và không đọc cửa sổ của blueprint khi
chọn chữ cái phần. `POST /admin/tests/:id/sections` ghi `minutes`, **không ghi
`seconds`** (probe 3: phần F tạo tay có `minutes = 30, seconds = null`, blueprint
cho phần F là **152 giây**). `exam-api.js` chỉ dùng `seconds` khi có, còn lại
lấy phút — nên đề tạo tay cho thí sinh 1.800 giây ở phần 152 giây, và ngay cả
khi người soạn tự sửa phút thì phần A 250 giây thành 4 phút, phần F thành 3 phút.
Bộ sinh đề tự động cũng chỉ ghi phút (đã làm tròn từ giây). Chỉ bộ seed trong
`server/db.js` ghi `seconds`.

### 2.7 Phần C: đoạn văn nằm trong từng câu, và ngân hàng không có cặp nào

Quy ước hiện tại: đoạn văn ~60–90 từ, hai dòng trống, rồi câu hỏi — **trong
`prompt` của từng câu** (26/26 câu C đúng quy ước này). Blueprint nói "three
passages, two questions each" và tính giờ theo nhóm hai câu (`group: 2`,
180 giây một đoạn). Nhưng CSDL cho thấy **26 câu C là 26 đoạn văn riêng biệt**,
không cặp nào (probe 7 và truy vấn §8). Nghĩa là:

- Đề C hôm nay: sáu đoạn văn cho sáu câu, mỗi đoạn đọc một lần rồi bỏ; đồng hồ
  540 giây tính cho ba đoạn. Đề thật cho ba đoạn, mỗi đoạn ba phút.
- Ngay cả khi soạn thêm câu thứ hai cho một đoạn, hai câu đó **không có gì nối
  nhau**: không `group_key`, nên bộ sinh đề có thể rút một câu và bỏ câu kia, và
  khi rút cả hai thì thí sinh thấy đoạn văn **hai lần**.
- Trình chạy hiển thị phần C nguyên khối (`itemHTML` cho từng câu), không có
  khái niệm "đoạn văn chung".

Đây không phải lỗi mã, là lỗi mô hình: reading không có nhóm, nên nội dung được
soạn theo hình dạng duy nhất mà mô hình cho phép.

### 2.8 Luyện Part G chỉ luyện được 12 trong 37 câu

`drawItems()` của luyện Part lọc `audio_key IS NOT NULL` cho phần cần audio.
Ở phần G chỉ câu đầu mỗi nhóm mang đoạn nghe, nên bể luyện là **12 câu đầu
nhóm trong 37 câu** (probe 8); 25 câu còn lại không bao giờ được luyện, và câu
được luyện thì đứng một mình, không có hai câu chị em — một bài luyện "nghe
đoạn, trả lời ba câu" thành "nghe đoạn, trả lời một câu".

### 2.9 Logic nhóm có ba bản sao và không bản nào là mô hình

- `server/db.js` `plannedPaper()` — rút nguyên nhóm cho đề seed.
- `server/api.js` `drawFromPool()` — rút nguyên nhóm cho sinh đề và rút lại.
- `public/prep/exam/_runner.js` — suy ra nhóm **theo vị trí** (`i % size`) vì
  `exam-api.js` không gửi thông tin nhóm cho trình chạy.

Ba chỗ, hai luật (nhóm theo khoá, nhóm theo vị trí), và đường tay (§2.4) không
qua chỗ nào. Mỗi lần thêm một họ đề có nhóm (TOEIC Part 3: ba câu một hội thoại;
IELTS: một đoạn 13 câu) là thêm một bản sao nữa.

### 2.10 Những cái nhỏ hơn, gom lại

- Thẻ câu hỏi ở ngân hàng không hiện nhóm dù API đã trả `groupKey`.
- Đính MP3 là bước thứ hai sau khi lưu câu; câu E/F/H/J vừa soạn ở ngân hàng
  luôn ở trạng thái "No audio" cho tới khi người soạn nhớ quay lại.
- Không lọc được "câu thiếu audio", "nhóm thiếu câu", "câu chưa có phần".
- `PUT /admin/sections/:sid` không đổi được chữ cái phần: phần tạo nhầm phải xoá
  và tạo lại.
- Sửa chữ cái phần của một câu đang thuộc nhóm (`PUT`) giữ nguyên `group_key`
  cũ, nên nhóm bị chia sang hai bể.

## 3. Vì sao vá lẻ không đủ

Có thể chặn từng lỗi ở §2.3–2.5 bằng vài điều kiện `if` quanh `group_key`, và
giai đoạn 0 dưới đây làm đúng thế. Nhưng ba việc người dùng cần — soạn một đoạn
văn với hai câu, soạn một bài nghe với ba câu, luyện và thi theo đúng cụm đó —
đòi một thứ mà `group_key` không có: **chỗ để đặt đoạn văn hoặc bài nghe của
nhóm**. Hôm nay đoạn nghe của G nằm trên câu đầu nhóm, đoạn văn của C nằm trong
từng câu, và lời thoại được sao chép sang từng thành viên. Mỗi màn hình phải
biết quy ước đó, và mỗi màn hình biết nó một kiểu.

Khi nhóm là một hàng riêng, mang đoạn văn hoặc bài nghe, câu hỏi chỉ trỏ về nó:
soạn là soạn một nhóm; rút đề là rút nhóm; hiển thị là hiển thị đoạn một lần rồi
tới các câu; luyện là luyện cả nhóm; và mọi thứ trên áp cho reading, listening,
speaking như nhau, cho VPET hôm nay và IELTS/TOEIC ngày mai.

## 4. Mô hình đề xuất

### 4.1 Lược đồ

```
question_groups
  id            INTEGER PRIMARY KEY
  family_id     TEXT NOT NULL            -- vpet, ielts…
  skill         TEXT NOT NULL            -- listening | reading | writing | speaking
  part          TEXT                     -- chữ cái phần, null với họ đề không có bảng phần
  level         TEXT NOT NULL            -- một trình độ cho cả nhóm
  kind          TEXT NOT NULL            -- 'passage' | 'audio' | 'image' | 'scenario'
  title         TEXT                     -- nhãn cho người soạn: "Trees on Main Road"
  text          TEXT                     -- đoạn văn (passage) / lời thoại của bài nghe (audio)
                                         --   / mô tả tình huống (scenario)
  audio_key, audio_bytes, audio_at, audio_sha   -- bài nghe chung của nhóm
  size          INTEGER                  -- số câu blueprint quy định, để kiểm "nhóm thiếu câu"
  ext_key       TEXT UNIQUE              -- khoá soạn thảo (g-b1-1), cho seed và test
  status        TEXT NOT NULL DEFAULT 'active'
  created_at, created_by

questions
  + group_id    INTEGER REFERENCES question_groups(id)
  + group_sort  INTEGER                  -- thứ tự trong nhóm
  (group_key giữ lại một thời gian, dẫn xuất từ group_id, để mã cũ và test cũ
   còn chạy; bỏ ở cuối giai đoạn 1)
```

Di trú, chạy lúc khởi động theo đúng mẫu `addColumnIfMissing` + backfill trong
một giao dịch, idempotent:

- Mỗi `group_key` hiện có → một hàng `question_groups(kind='audio')`; `audio_*`
  của câu đầu nhóm **chuyển lên nhóm**; `script` của câu đầu → `text`.
- Phần C: tách `prompt` tại hai dòng trống → `text` của nhóm (`kind='passage'`),
  phần sau thành `prompt` của câu; mỗi câu C hiện tại thành một nhóm một câu
  (đúng sự thật hiện có), và ngân hàng bổ sung câu thứ hai sau.
- `question_audio_*` (câu hỏi đọc lên của G) **ở lại trên câu**, vì đó là của
  từng câu.
- `server/schema.js` mang bảng mới cho Postgres; `npm run pg:migrate` thêm cột.

### 4.2 Bất biến, thi hành ở API chứ không ở màn hình

1. Thành viên một nhóm cùng `family_id`, `skill`, `part`, `level`. Sửa một câu
   sang trình độ khác → **từ chối** với lời chỉ về nhóm; muốn đổi thì đổi cả nhóm.
2. Bài nghe của nhóm nằm trên nhóm. Câu trong nhóm `audio` không có `audio_key`
   riêng (chỉ có `question_audio_key`). Hết chuyện "đoạn thứ hai phát giữa nhóm".
3. `size` lấy từ blueprint khi phần có bảng phần (C: 2, G: 3); nhóm thiếu câu
   được **ghi nhận là thiếu** (`incomplete`) chứ không phải lỗi lúc soạn, nhưng
   sinh đề, rút lại, luyện và đính vào phần **chỉ nhận nhóm đủ**.
4. Đính vào phần / gỡ khỏi phần / rút / phục hồi: **cả nhóm hoặc không**. API
   nhận `groupIds` bên cạnh `questionIds`; gỡ một câu của nhóm gỡ cả nhóm và
   nói rõ; rút một câu → từ chối, chỉ rút được nhóm.
5. Xoá nhóm chỉ khi không câu nào của nó nằm trong đề nào (mọi đề cũ giữ nội
   dung — cùng luật với câu hỏi hôm nay).
6. Câu không thuộc nhóm vẫn hợp lệ ở phần không có nhóm (A, B, D, E, F, H, I, J).
   Ở phần có nhóm, câu lẻ **không vào bể**; bộ đếm sẵn sàng báo "N câu chưa
   vào nhóm" như hôm nay báo "chưa có phần".

### 4.3 Blueprint

`vpetTiming().group` đã nói C=2, G=3. Chuyển thành trường `group` trên mỗi
section của mọi format (không chỉ VPET) với `kind`:

| Họ đề · phần | kind | size |
|---|---|---|
| VPET C | passage | 2 |
| VPET G | audio | 3 |
| TOEIC L&R Part 3 / Part 4 | audio | 3 |
| TOEIC L&R Part 6 | passage | 4 |
| TOEIC L&R Part 7 | passage | 2–5 (biến thiên) |
| IELTS Reading passage | passage | 13–14 |
| IELTS Listening section | audio | 10 |
| TOEIC S&W "Respond to questions", "Respond using given information" | scenario | 3 |

`size` biến thiên là lý do `drawFromPool()` phải rút "cho tới khi đủ" chứ không
"chia đều" — nó đã làm đúng thế. Các họ đề ngoài VPET **chưa cần làm ngay**
(chúng còn `coming_soon`); bảng trên để lược đồ không phải đổi lần nữa.

### 4.4 Giao câu cho trình chạy và hiển thị

`exam-api.js` gửi thêm cho mỗi phần:

```
groups: [{ id, kind, text?, hasAudio, replaysLeft, questionIds: [...] }]
```

Trình chạy: với phần không nhịp (C), vẽ **đoạn văn một lần** rồi các câu của
nó bên dưới, mỗi nhóm một thẻ; với phần nhịp (G), pha nghe của **nhóm** phát bài
nghe một lần rồi vào câu đầu, các câu sau chỉ phát câu hỏi đọc lên — bỏ hẳn luật
`i % size`. Bài thi đã bắt đầu trước khi triển khai vẫn đọc được: `groups`
vắng thì trình chạy dùng đường cũ (một buổi triển khai, không cần nghỉ hệ
thống). Điểm và báo cáo **không đổi**: chấm vẫn theo câu.

### 4.5 Luyện Part

`drawItems()` rút **nguyên nhóm** ở phần có nhóm (một đoạn nghe, ba câu; một
đoạn văn, hai câu), và không lọc `audio_key` trên câu nữa mà trên nhóm. Số câu
mỗi bài luyện làm tròn lên bội số của `size`.

### 4.6 Quản trị

- **Ngân hàng**: hai chế độ trên cùng màn: *Câu hỏi* (như nay) và *Nhóm*. Thẻ
  nhóm hiện đoạn văn/bài nghe, số câu / `size`, huy hiệu **Thiếu câu** / **Thiếu
  audio** / **Thiếu lời thoại**; mở ra là bộ soạn: đoạn văn hoặc MP3 + lời thoại
  ở trên, các câu ở dưới — **tái sử dụng `questionComposer()`** của trình xây đề,
  tách ra `public/admin/_composer.js` dùng chung, thay vì viết lại.
- Bộ lọc mới: theo phần (đã có), *chưa có phần*, *chưa vào nhóm*, *thiếu
  audio*, *thiếu lời thoại*.
- **Trình xây đề**: bộ chọn lọc **đúng phần** của section và liệt kê **nhóm**
  như một mục chọn; đính là đính nhóm. Khi server bỏ qua thứ gì, trả về **lý do
  từng mục** và màn hình nói lý do. Hộp "Thêm phần" khi chọn chữ cái thì điền
  cửa sổ giây từ blueprint (hiện đúng như màn thi sẽ bấm), và cho **đổi chữ cái
  phần** sau khi tạo.
- **Nhập hàng loạt**: CSV thêm cột `nhom` (nhãn nhóm — các dòng cùng nhãn là
  một nhóm), `doan_van` (đoạn văn, ghi ở dòng đầu nhóm), `loi_thoai`,
  `dap_an_mau`; tệp mẫu sinh từ chính blueprint và **đi qua đúng bộ lọc nhập
  trước khi phục vụ** (một test canh: tệp mẫu phải nhập được 100%). JSON nhận
  `{group: {...}, questions: [...]}`. Audio vẫn đính sau, hoặc qua tệp ZIP đặt
  tên theo `nhom` (giai đoạn 3).

## 5. Lộ trình

Mỗi giai đoạn khoá theo sáu điều kiện của `docs/KE-HOACH-XAY.md` §1.2, kể cả
"test đã từng đỏ" và cặp A/B `loadprobe` trên cùng máy như §7.4 của
`docs/RA-SOAT-TOAN-BO-2026-09.md`.

### Giai đoạn 0 — chặn thiệt hại hôm nay (1–2 buổi, không đổi lược đồ)

| # | Việc | Tệp | Test canh |
|---|---|---|---|
| 0.1 | Tệp CSV mẫu: dòng điền từ có `dap_an`, mọi dòng VPET có `phan_thi`; và một test gửi tệp mẫu qua `bulk` đòi `failed = 0`, `part` khác null | `server/api.js` `template.csv` | `test-admin.mjs` |
| 0.2 | `seconds` cho phần tạo tay và phần sinh tự động: lấy từ blueprint theo chữ cái (`partSeconds`), hộp "Thêm phần" điền sẵn và hiện "152 giây" thay vì "30 phút" | `server/api.js` sections + generate, `builder.html` | `test-admin.mjs`, `test-paper.mjs` |
| 0.3 | Bộ chọn câu lọc theo phần của section; server trả `skipped` kèm **lý do từng câu** và màn hình nói ra | `builder.html`, `server/api.js` items | `test-builder.mjs` |
| 0.4 | Nguyên nhóm hoặc không ở đường tay: đính một câu của nhóm → đính cả nhóm (báo rõ); gỡ một câu của nhóm → gỡ cả nhóm (hỏi xác nhận); rút/phục hồi một câu của nhóm → từ chối, chỉ nhận cả nhóm; `PUT` đổi trình độ hoặc phần của thành viên → từ chối | `server/api.js` | `test-admin.mjs` (mỗi luật một phép kiểm đã đỏ) |
| 0.5 | Thẻ câu ở ngân hàng hiện huy hiệu nhóm (`g-b1-2 · 2/3`) và cảnh báo nhóm thiếu | `bank.html` | `test-links.mjs` không đủ; thêm vào `test-builder.mjs` hoặc bộ UI ngân hàng mới |
| 0.6 | Luyện Part G rút nguyên nhóm ba câu (hoặc, nếu chưa kịp, nói thẳng trên màn luyện rằng phần G luyện một câu mỗi đoạn) | `server/drills.js` | `test-drills.mjs` |
| 0.7 | `PUT /admin/sections/:sid` nhận `part` (kiểm như lúc tạo) | `server/api.js` | `test-admin.mjs` |
| 0.8 | Câu G soạn ở màn Ngân hàng: chặn cho tới giai đoạn 2 với lời chỉ sang trình xây đề ("phần G soạn ba câu một lần ở trình xây đề"), thay vì tạo nhóm một câu | `bank.html`, `server/api.js` | `test-admin.mjs` |

Giai đoạn 0 **không** giải quyết phần C và không cho nhập nhóm hàng loạt; nó làm
cho những gì đang có thôi hỏng âm thầm.

### Giai đoạn 1 — nhóm là thực thể (3–4 buổi)

1. Bảng `question_groups`, cột `group_id`/`group_sort`, di trú §4.1, `schema.js`
   cho Postgres; `test-pg-schema.mjs` và `test-items.mjs` đọc được bảng mới.
2. API nhóm: `GET/POST/PUT /admin/groups`, `POST /admin/groups/:id/audio`,
   `/admin/groups/:id/status`; `readQuestion` nhận `groupId`; bất biến §4.2.
3. `drawFromPool()` và `plannedPaper()` gộp về một hàm trong `server/groups.js`;
   luyện Part dùng cùng hàm.
4. `exam-api.js` gửi `groups`; trình chạy vẽ đoạn văn một lần và phát bài nghe
   theo nhóm; đường cũ giữ cho bài thi đang dở.
5. Seed: `vpet-items.js` phần C viết theo nhóm (đoạn + câu), `vpet-items-audio.js`
   phần G viết theo nhóm; nội dung C **bổ sung câu thứ hai cho từng đoạn** để
   ngân hàng thành 13 nhóm × 2 (hoặc viết đoạn mới, theo luật độ sâu §5.1 của
   `docs/VPET-BLUEPRINT.md`).
6. Test mới `scripts/test-groups.mjs`: từng bất biến một phép kiểm đã đỏ; cập
   nhật `test-paper`, `test-exam`, `test-exam-audio-queue`, `test-drills`.

### Giai đoạn 2 — màn hình quản trị và nhập liệu (2–3 buổi)

1. `_composer.js` dùng chung; chế độ *Nhóm* ở Ngân hàng; huy hiệu và bộ lọc §4.6.
2. Bộ chọn của trình xây đề theo nhóm và theo phần; lý do bỏ qua.
3. CSV/JSON nhập nhóm, lời thoại, câu trả lời mẫu; tệp mẫu sinh từ blueprint và
   được kiểm nhập trước khi phục vụ.
4. Test UI `scripts/test-bank-ui.mjs` (Chromium thật) cho soạn nhóm ở ngân hàng,
   nhập CSV có nhóm, và đính nhóm vào phần; ảnh chụp mới.

### Giai đoạn 3 — theo nhu cầu

- ZIP audio đặt tên theo nhãn nhóm; blueprint nhóm cho IELTS/TOEIC khi mở họ đề;
  thống kê theo nhóm trong báo cáo (đoạn văn nào khó).

### Ước lượng và thứ tự

| Giai đoạn | Thời lượng | Giá trị |
|---|---|---|
| 0 | 1–2 buổi | Không còn đề vỡ nhóm, đồng hồ sai, CSV mẫu hỏng; người vận hành thấy lý do khi bị từ chối |
| 1 | 3–4 buổi | Reading và listening có nhóm thật; phần C đúng đề thật; luyện G đủ ba câu |
| 2 | 2–3 buổi | Soạn và nhập nhóm không cần đường vòng |
| 3 | theo nhu cầu | Họ đề khác, nhập audio hàng loạt |

Làm 0 trước vì rẻ và chặn thiệt hại ngay; 1 là việc đúng; 2 chỉ có nghĩa khi
1 xong. Không nên gộp 0 vào 1 để "làm một thể": 0 lên production được trong
tuần này, 1 cần một buổi di trú và một buổi kiểm lại toàn bộ đường thi.

## 6. Rủi ro và cách kiểm

- **Di trú trên CSDL production (SQLite, một tiến trình).** Chạy trong một giao
  dịch lúc khởi động, idempotent, và **sao lưu trước** (`scripts/backup.mjs`
  đã có; block 0). Kiểm: khởi động hai lần liên tiếp không đổi gì lần hai;
  `test-groups.mjs` chạy trên bản sao CSDL production trước khi đẩy.
- **Bài thi đang dở lúc triển khai.** Trình chạy giữ đường cũ khi thiếu `groups`;
  kiểm bằng một attempt tạo trước khi đổi mã (`test-preview-session.mjs` có sẵn
  khung).
- **Postgres lệch lược đồ.** `schema.js` và `pg:migrate` đi cùng commit;
  `test-pg-schema.mjs` là cổng.
- **Luật độ sâu ngân hàng** (`test-items.mjs`) đếm theo câu; nhóm không đổi
  cách đếm, nhưng phần C sẽ đổi số câu khi thêm câu thứ hai — làm theo lô đủ
  lớn như §5.1 của blueprint đã dặn.
- **Hiệu năng.** Thêm một `JOIN` khi giao câu cho trình chạy; đo bằng cặp A/B
  cùng máy trước khi khoá, ngưỡng 15% như mọi lần.

## 7. Cần người dùng quyết

1. **Phần C:** giữ 26 đoạn một câu cho tới khi có nội dung mới, hay chuyển ngay
   sang nhóm và viết thêm câu thứ hai cho từng đoạn? Đề nghị: chuyển mô hình ở
   giai đoạn 1, nội dung bổ sung theo lô (13 đoạn × 2 câu ở B2 trước).
2. **Luyện Part G:** luyện cả nhóm ba câu (đề nghị) hay giữ một câu mỗi đoạn?
3. **Câu G ở màn Ngân hàng** trong lúc chờ giai đoạn 2: chặn và chỉ sang trình
   xây đề (đề nghị, 0.8), hay cho soạn nhưng đánh dấu "chưa vào nhóm"?
4. **Tên cột CSV** tiếp tục bằng tiếng Việt không dấu như hiện nay (đề nghị),
   hay chuyển sang tiếng Anh cùng với phần còn lại của giao diện?

## 8. Phụ lục — kết quả thăm dò nguyên văn (2026-09-03, máy phiên, HEAD `91ef99c`)

```
1a   sample CSV → bulk: status 201 inserted=3 failed=1
     errors=[{"row":2,"error":"A typed item needs an answer key, or every candidate is marked wrong. …"}]
1b   rows inserted from the sample: [{"id":1299,"part":null,"skill":"reading","type":"mcq"},
     {"id":1300,"part":"C",…},{"id":1301,"part":"A",…}] → without a part: 1
2    bank-screen Part G item: status 201 id=1302 group_key=null
3    hand-added Part F section: status 201 minutes=30 seconds=null (blueprint: 152 s)
4a   picker query for a Part F section returns by part: {"G":37,"F":37,"E":37}
4b   attach a Part E item to the Part F section: status 200 {"added":0,"skipped":1}
5a   attach ONE non-head member of g-b1-1 alone: status 200 {"added":1,"skipped":0}
5b   attach all three of g-b1-2: status 200 {"added":3,"skipped":0}
5c   remove the middle member of g-b1-2 from the part: status 200 {"ok":true}
5d   Part G section now holds 3 items: 352, 354*, 356 (* = carries the passage)
6a   retire one member of g-b1-1: status 200 → active members now 2
6b   set one member of g-b1-1 to level B2: status 200 → levels in group now
     [{"level":"B1","n":2},{"level":"B2","n":1}]
7    first two Part C items share a passage? false
8    Part G items a drill can draw (audio_key not null): 12 of 37
end  cleaned: test deleted, probe items retired
```

Truy vấn CSDL cùng lúc: phần C **26 câu, 26 đoạn văn riêng biệt** (mọi đoạn
đúng một câu); phần G 36 câu trong 12 nhóm ba, mỗi nhóm đúng một câu mang đoạn
nghe; hai đề đã phát hành (`vpet-b1-01`, `vpet-c1-01`) mỗi đề có phần C sáu câu
— tức sáu đoạn văn — và phần G sáu câu trong hai nhóm.
