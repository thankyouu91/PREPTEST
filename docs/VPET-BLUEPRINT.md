# Blueprint đề thi VPET - 10 phần A→J

Tài liệu tham chiếu cho **mọi agent làm việc trên nền tảng này**, đặc biệt là
agent học thuật sẽ soạn học liệu luyện thi. Đọc hết phần 1-3 trước khi viết câu
hỏi đầu tiên; phần 5 là các quy tắc **bắt buộc**, vi phạm là bộ kiểm thử đỏ.

> **VPET là gì.** VPET = **Versant Professional English Test**, bài thi tiếng Anh
> nghề nghiệp của **Pearson**, chấm hoàn toàn tự động. Đây **không phải** kỳ thi
> nội địa Việt Nam - trước 2026-08-20 nền tảng gọi nhầm là "Vietnam Proficiency
> English Test", đã sửa. VPET cũng **không theo** khung VSTEP.3-5 như VEPT.

> **Độ tin cậy của số liệu.** *Số câu mỗi phần* lấy từ bảng phần thi Pearson công
> bố - **không được tự đổi**. *Thời gian* cũng vậy, từ 2026-08-20: bản
> **Official Guide for Test-Takers** của Pearson ghi thời gian **theo từng câu**,
> và blueprint nay lưu đúng những con số đó (`vpetTiming()` trong
> `server/data/exam-formats.js`), cửa sổ mỗi phần là phép cộng từ chúng chứ không
> phải số ai đó tự đặt. Trước đó mười con số phút là do nền tảng tự nghĩ ra, và
> phần C bị cho 7 phút trong khi guide cho 9.

---

## 1. Toàn cảnh đề thi

**58 câu · 10 phần · khoảng 60 phút · chấm tự động.**

Cột *Giờ chính thức* là nguyên văn từ Official Guide của Pearson. Cột *Cửa sổ* là
thời gian nền tảng thật sự bấm cho cả phần, tính ra từ cột trước - không ai gõ tay.

| Phần | Tên | Kỹ năng thật | Số câu | Giờ chính thức | Cửa sổ | `skill` | `type` | Audio |
|:----:|-----|--------------|:------:|----------------|:------:|---------|--------|:-----:|
| A | Sentence Completion | Reading + Writing | 10 | 25 giây/câu | 250s | `writing` | `gap` | – |
| B | Passage Reconstruction | Writing | 3 | xem 30s, viết 90s | 360s | `writing` | `essay` | – |
| C | Reading Comprehension | Reading | 6 | 3 phút / đoạn (2 câu) | 540s | `reading` | `mcq` | – |
| D | E-mail Writing | Writing | 2 | 9 phút/câu | 1080s | `writing` | `essay` | – |
| E | Dictation | Listening + Writing | 8 | 25 giây/câu | 248s | `listening` | `gap` | ✅ |
| F | Response Selection | Listening | 8 | *guide không nêu* | 152s | `listening` | `mcq` | ✅ |
| G | Passage Comprehension | Listening | 6 | *guide không nêu* | 180s | `listening` | `mcq` | ✅ |
| H | Repeat | Speaking | 10 | 15 giây/câu | 210s | `speaking` | `speaking` | ✅ |
| I | Speaking Situations | Speaking | 2 | nghĩ 10s, nói 60s | 140s | `speaking` | `speaking` | – |
| J | Story Retellings | Speaking | 3 | 30 giây/câu | 186s | `speaking` | `speaking` | ✅ |

**Tổng cửa sổ bấm giờ: 3346 giây ≈ 55,8 phút.** Guide ghi "approximately 60
minutes" cho cả buổi thi, phần chênh là mười màn hình hướng dẫn kèm câu mẫu ở đầu
mỗi phần - nền tảng có hiện chúng nhưng không bấm giờ.

> Hai phần F và G guide **không** công bố thời gian trả lời. Con số ở đây là của
> nền tảng, đánh dấu `ours: true` trong `vpetTiming()`, chọn sao cho tổng rơi
> đúng vào 60 phút guide nêu. Ai có số chính thức thì sửa ở đúng một chỗ đó.

Chuỗi số câu để đối chiếu nhanh: **10-3-6-2-8-8-6-10-2-3**.

> ⚠️ Cột *kỹ năng thật* và cột `skill` **khác nhau** ở phần A, B, E. Ví dụ phần E
> Dictation nghe rồi gõ lại, nhưng nền tảng xếp vào `listening`. Generator lọc
> theo cột `skill`, nên khi soạn đề phải theo cột `skill`, không theo cảm tính.

**Nguồn sự thật trong mã:** `server/data/exam-formats.js` → `vpetSections()`,
format id `vpet-full`. Bộ kiểm thử `scripts/test-items.mjs` đọc thẳng file này
làm chuẩn, nên sửa blueprint là kiểm thử tự đổi theo.

---

## 2. Trình độ và thang điểm

- VPET có **2 cấp**: Level 1 ≈ A1→B1+ (GSE 10-58), Level 2 ≈ B1→C2 (GSE 51-90).
- Nền tảng dùng **CEFR A1-C2**, chấm điểm **riêng từng kỹ năng**
  (`scoring: 'CEFR A1-C2 per skill'`).
- Phần H, I, J chấm bằng **AI**, sau đó người duyệt có quyền sửa đè.
- Reading và Listening chấm máy hoàn toàn.

Trình độ hợp lệ khi tạo câu hỏi: `A1 A2 B1 B2 C1 C2`.

---

## 3. Chi tiết từng phần

Mỗi phần dưới đây gồm: **thí sinh làm gì · phần này đo cái gì · soạn thế nào ·
bẫy cần tránh**.

### Phần A - Sentence Completion (10 câu, `writing`/`gap`)
- **Làm gì:** một câu thiếu đúng **một từ**, thí sinh gõ từ còn thiếu.
- **Đo:** ngữ pháp và collocation trong ngữ cảnh, không phải từ vựng học thuộc.
- **Soạn:** câu phải đủ ngữ cảnh để **chỉ một từ** điền vào là đúng. Đáp án lưu ở
  trường `answer`, **một từ duy nhất**, không dấu câu.
- **Bẫy:** câu mơ hồ cho phép 2-3 từ cùng đúng. Nếu bạn nghĩ ra được từ thứ hai
  nghe lọt tai, câu đó chưa dùng được.

### Phần B - Passage Reconstruction (3 câu, `writing`/`essay`)
- **Làm gì:** đọc một đoạn ngắn trong thời gian giới hạn, đoạn văn **biến mất**,
  rồi viết lại bằng lời của mình.
- **Đo:** đọc hiểu + ghi nhớ ý chính + diễn đạt lại, không phải chép thuộc lòng.
- **Soạn:** đoạn văn nên có **3-5 ý rời rạc** để chấm được mức độ giữ ý. Không có
  `answer`; phần `explanation` ghi rõ **những ý nào bắt buộc phải còn**.
- **Bẫy:** đoạn quá giàu chi tiết số liệu biến bài thành bài kiểm tra trí nhớ.

### Phần C - Reading Comprehension (6 câu, `reading`/`mcq`)
- **Làm gì:** đọc đoạn ngắn, chọn 1 trong 4 đáp án.
- **Đo:** hiểu ý được suy ra, không phải dò từ khóa.
- **Soạn:** đoạn ~60-90 từ, sau đó **hai dòng trống** (`\n\n`) rồi tới câu hỏi -
  đây là quy ước đang dùng cho toàn bộ item phần C. Đúng **4 phương án**.
- **Bẫy:** phương án nhiễu phải *dùng lại chữ trong đoạn* nhưng sai về quan hệ
  (đảo nhân-quả, biến một phần thành toàn bộ, biến "được nêu" thành "bị phê
  phán"). Nhiễu vô lý làm câu hỏi thành cho không.
- Xem `vpet-c-01`…`vpet-c-14` trong `server/data/vpet-items.js` làm mẫu.

### Phần D - E-mail Writing (2 câu, `writing`/`essay`)
- **Làm gì:** viết email trả lời một tình huống, **đúng văn phong được chỉ định**.
- **Đo:** hoàn thành nhiệm vụ + văn phong + độ chính xác ngôn ngữ.
- **Soạn:** đề **phải nêu rõ** người nhận, độ dài mong muốn (~150 từ) và văn
  phong ("Stay formal"). Nêu **3 việc** email phải làm.
- **Bẫy:** đề chỉ nói "viết một email" thì không thể trừ điểm văn phong một cách
  công bằng - văn phong là một nửa số điểm của phần này.

### Phần E - Dictation (8 câu, `listening`/`gap`, **cần audio**)
- **Làm gì:** nghe một câu, gõ lại **nguyên văn**.
- **Đo:** nghe chi tiết ở cấp độ từ, chính tả, giới từ và đuôi từ.
- **Soạn:** mỗi item **một câu** ngắn, đọc số lần cố định. Đáp án là chính câu đó.
- **Bẫy:** câu chứa tên riêng hoặc số hiệu khó đoán chính tả sẽ đo trí nhớ chính
  tả chứ không đo nghe.

### Phần F - Response Selection (8 câu, `listening`/`mcq`, **cần audio**)
- **Làm gì:** nghe một lời thoại, chọn câu **đáp lại tự nhiên nhất**.
- **Đo:** phản xạ hội thoại và chức năng ngôn ngữ.
- **Soạn:** 4 phương án, tất cả đều **đúng ngữ pháp**; cái sai là sai *chức năng*
  (trả lời lệch câu hỏi, sai thì, sai mức lịch sự).
- **Bẫy:** làm nhiễu bằng lỗi ngữ pháp - thí sinh loại được mà không cần nghe.

### Phần G - Passage Comprehension (6 câu, `listening`/`mcq`, **cần audio**)
- **Làm gì:** nghe đoạn nói dài hơn, trả lời câu hỏi hiểu nội dung.
- **Đo:** nghe lấy ý chính và chi tiết có chọn lọc.
- **Soạn:** giống phần C nhưng đầu vào là audio. Câu hỏi **không được** giải
  được chỉ bằng đọc transcript của phương án.
- **Bẫy:** hỏi chi tiết vụn xuất hiện đúng một lần → thành bài kiểm tra trí nhớ.

### Phần H - Repeat (10 câu, `speaking`/`speaking`, **cần audio**)
- **Làm gì:** nghe một câu, **nhắc lại chính xác**.
- **Đo:** phát âm, trôi chảy, và sức chứa của trí nhớ ngôn ngữ.
- **Soạn:** độ dài tăng dần qua 10 câu - đây chính là cơ chế phân hoá của phần này.
- **Bẫy:** câu quá dài ngay từ đầu làm mất khả năng phân biệt trình độ thấp.

### Phần I - Speaking Situations (2 câu, `speaking`/`speaking`, không audio)
- **Làm gì:** đọc một tình huống, nói tối đa **1 phút**.
- **Đo:** nói đúng văn phong theo **quan hệ với người nghe**.
- **Soạn:** đề **bắt buộc nêu hai thứ**: (1) quan hệ với người nghe, (2) một khó
  khăn. Rồi liệt kê 3 việc phải làm khi nói.
- **Bẫy:** tình huống không có xung đột thì không đo được gì ngoài độ trôi chảy.
- Xem `vpet-i-01`…`vpet-i-08` làm mẫu.

### Phần J - Story Retellings (3 câu, `speaking`/`speaking`, **cần audio**)
- **Làm gì:** nghe một mẩu chuyện ngắn, **kể lại bằng lời của mình**.
- **Đo:** nắm mạch truyện + tổ chức lời nói + từ vựng chủ động.
- **Soạn:** chuyện cần **mốc thời gian rõ** (mở đầu → biến cố → kết) để chấm được
  mức độ giữ mạch.
- **Bẫy:** chuyện không có biến cố thì không có gì để kể lại.

---

## 4. Một item trong ngân hàng trông thế nào

File: **`server/data/vpet-items.js`**. Mỗi phần là một mảng riêng
(`PART_A`, `PART_B`, `PART_C`, `PART_D`, `PART_I`), hàm `rows()` ở cuối file
làm phẳng thành đúng shape mà seed chèn vào bảng `questions`:

```js
{
  key: 'vpet-c-09',        // định danh duy nhất, đặt theo 'vpet-<phần>-<số>'
  part: 'C',               // chữ cái A..J
  skill: 'reading',        // theo cột `skill` ở bảng phần 1, KHÔNG theo cảm tính
  type: 'mcq',             // mcq | gap | essay | speaking
  level: 'B2',             // A1..C2
  prompt: '…đoạn văn…\n\n…câu hỏi…',
  options: ['…', '…', '…', '…'],   // chỉ mcq; các type khác để []
  answer: '…',                      // mcq + gap; essay/speaking để ''
  explanation: '…',                 // vì sao đáp án đúng VÀ vì sao nhiễu sai
  tags: ['vpet', 'part-c'],         // rows() tự sinh
  source: SOURCE, licence: LICENCE  // rows() tự sinh
}
```

`explanation` **không phải chú thích cho vui**: nó hiện cho người học sau khi
chấm, nên phải nói được *vì sao phương án nhiễu hấp dẫn nhưng sai*.

---

## 5. Quy tắc BẮT BUỘC khi thêm học liệu

### 5.1. Luật độ sâu ngân hàng (hay làm đỏ kiểm thử nhất)

Với **mỗi phần**, ở **mỗi trình độ**, số item phải hoặc **nông** hoặc **sâu**:

| Trạng thái | Số item ở trình độ đó | Vì sao chấp nhận được |
|---|---|---|
| **Nông** | `< số câu blueprint` | Generator phải lấy bù từ trình độ khác → đề vẫn đổi |
| **Sâu** | `>= 2 ×` số câu blueprint | Đủ cho hai lượt thi khác nhau |
| ❌ **Ở giữa** | `>=` blueprint nhưng `< 2×` | **Cấm** - thi lại sẽ gặp lại đúng từng câu |

Ví dụ đã xảy ra thật: nâng phần C từ 3 → 6 câu khiến trình độ B2 có đúng 6 item,
rơi vào vùng cấm; phải viết thêm 6 item B2 nữa cho đủ 12. Kiểm thử báo lỗi
`No part sits between shallow and deep at any level`.

**Nghĩa là:** thêm học liệu nên thêm **theo lô đủ lớn**, đừng thêm lắt nhắt.

### 5.2. Generator chọn câu như thế nào

`POST /api/admin/tests/generate` lọc theo **family + skill + type + chữ cái phần**,
ưu tiên item **đúng trình độ** trước (`ORDER BY exact DESC`) rồi mới lấy bù từ
trình độ khác. Nếu thiếu, nó **báo toàn bộ chỗ thiếu trước** rồi mới dừng, không
tạo ra đề nửa vời.

→ Item gắn sai `part` sẽ không bao giờ được rút, dù `skill` và `type` đều đúng.

### 5.3. Phần cần audio thì chưa sinh đề được

Phần **E, F, G, H, J** đòi mỗi câu hỏi phải có **MP3 đính kèm**; chưa có audio
thì không sinh đề được. Ngân hàng hiện **chưa có** item nào cho 5 phần này -
kiểm thử đang chốt đúng 5 phần không audio (`A B C D I`), nên khi bổ sung phần
audio phải sửa hằng `AUDIO_FREE` trong `scripts/test-items.mjs`.

### 5.4. Nội dung phải là hàng tự viết

Mọi item ghi `source: 'VPET Prep - written for this platform'` và
`licence: 'Project content; no third-party list reproduced'`. **Không chép** đề
thật, đề mẫu có bản quyền, hay danh sách của bên thứ ba.

---

## 6. Hiện trạng ngân hàng (2026-08-20)

**68 item**, chỉ ở 5 phần không cần audio:

| Phần | Blueprint | Tổng | Theo trình độ | Trạng thái |
|:----:|:---------:|:----:|---------------|-----------|
| A | 10 | 30 | A2:4 · B1:6 · B2:20 | A2, B1 nông · B2 sâu ✅ |
| B | 3 | 8 | B1:2 · B2:6 | B1 nông · B2 sâu ✅ |
| C | 6 | 14 | B1:2 · B2:12 | B1 nông · B2 sâu ✅ |
| D | 2 | 8 | B1:4 · B2:4 | sâu ở **cả hai** ✅ |
| I | 2 | 8 | B1:4 · B2:4 | sâu ở **cả hai** ✅ |
| E F G H J | 8·8·6·10·3 | 0 | – | ❌ chưa có, **cần audio** |

**Việc còn thiếu, theo thứ tự ưu tiên:**

1. **Phần E, F, G** (nghe, 22 câu/đề) - cần cả item lẫn file MP3.
2. **Phần H, J** (nói có audio, 13 câu/đề).
3. **Trình độ ngoài B2**: hiện B2 sâu ở cả 5 phần, các trình độ khác đều nông.
   Muốn ra đề B1 thật sự đa dạng thì phải nâng B1 lên mức sâu (≥ 2× blueprint).
4. **A1, C1, C2** hiện chưa có item nào.

---

## 7. Đọc thêm

- `server/data/exam-formats.js` - blueprint gốc, là nguồn sự thật.
- `server/data/vpet-items.js` - ngân hàng câu hỏi + mẫu để viết theo.
- `scripts/test-items.mjs` - bộ luật tự động; chạy `node scripts/test-items.mjs`.
- `docs/SCORING.md` - cách chấm và quy đổi điểm.
