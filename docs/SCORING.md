# Cơ cấu bài thi và phương thức chấm điểm

Tài liệu nghiên cứu + thiết kế cho engine chấm điểm của nền tảng. Phần 1 mô tả
cấu trúc và cách tính điểm **thật** của 6 kỳ thi. Phần 2 là thiết kế engine
chung để một bộ mã phục vụ được cả 6 kỳ mà không phải viết 6 lần.

> **Về độ chính xác của số liệu.** Cấu trúc bài thi, thang điểm và tiêu chí chấm
> là thông tin công bố công khai của các tổ chức khảo thí. Riêng **bảng quy đổi
> điểm thô → điểm thang** của TOEIC và IELTS thì mỗi đề một khác (equating theo
> độ khó từng form) và không được công bố chính thức. Các bảng trong tài liệu này
> là **bảng tham chiếu xấp xỉ** dùng cho luyện tập — phải ghi rõ điều đó trên
> màn kết quả, không được trình bày như điểm thi thật.

---

## Phần 1 — Cấu trúc và thang điểm từng kỳ thi

### 1.1 VEPT (theo khung VSTEP, 6 bậc dùng cho Việt Nam)

> **VPET **không** thuộc mục này.** Mục này từng ghi "VEPT / VPET (theo khung
> VSTEP)" và đó là gốc của một lỗi thật: VPET là **Versant Professional English
> Test của Pearson**, không dùng khung VSTEP, không có "Bậc", và **chia làm hai
> cấp đề** đo hai đoạn khác nhau của thang. Gộp chung khiến engine áp bảng Bậc
> của VSTEP lên đề VPET Cấp 1 — một thí sinh làm đúng hết được báo **Bậc 5 /
> C1**, trong khi đề đó không đo quá **B1+**. Cách tính đúng của VPET ở **2.3c**;
> đặc tả gốc ở `docs/VPET-OFFICIAL-SPEC.md`.

Chứng chỉ nội địa bám Khung năng lực ngoại ngữ 6 bậc
(Thông tư 01/2014/TT-BGDĐT), tương thích CEFR A1–C2. Định dạng chuẩn VSTEP.3-5
(đánh giá bậc 3–5, tức B1–C1):

| Kỹ năng | Thời lượng | Cấu trúc |
|---|---|---|
| Nghe | ~40 phút | 3 phần, 35 câu trắc nghiệm (hội thoại ngắn → hội thoại dài → bài nói/giảng) |
| Đọc | 60 phút | 4 bài đọc, 40 câu trắc nghiệm, độ khó tăng dần |
| Viết | 60 phút | Task 1: thư/email ~120 từ · Task 2: bài luận ~250 từ |
| Nói | ~12 phút | Part 1 tương tác xã hội · Part 2 thảo luận giải pháp · Part 3 phát triển chủ đề |

**Cách tính điểm**

- Mỗi kỹ năng cho **0–10 điểm**, làm tròn tới **0,5**.
- Điểm tổng = **trung bình cộng 4 kỹ năng**, làm tròn tới 0,5.
- Quy đổi bậc: **3,5–5,0 → Bậc 3 (B1)** · **5,5–8,0 → Bậc 4 (B2)** · **8,5–10 → Bậc 5 (C1)**.
  Dưới 3,5 không cấp chứng chỉ.

Nghe và Đọc chấm máy: điểm thô (số câu đúng) quy sang thang 10. Viết và Nói chấm
theo rubric (xem 1.6).

### 1.2 IELTS (Academic / General Training)

| Kỹ năng | Thời lượng | Cấu trúc |
|---|---|---|
| Nghe | 30 phút (+10 phút chép đáp án bản giấy) | 4 phần, 40 câu |
| Đọc | 60 phút | 3 bài (Academic) hoặc 5 bài (GT), 40 câu |
| Viết | 60 phút | Task 1 ≥150 từ · Task 2 ≥250 từ |
| Nói | 11–14 phút | Part 1 hỏi đáp · Part 2 nói dài 2 phút (có 1 phút chuẩn bị) · Part 3 thảo luận sâu |

**Cách tính điểm**

- Thang **band 0–9**, bước **0,5**.
- Nghe / Đọc: điểm thô 0–40 → band theo bảng quy đổi. Bảng khác nhau giữa Nghe,
  Đọc Academic và Đọc GT. **Không trừ điểm câu sai.**
- Viết: mỗi task chấm 4 tiêu chí, Task 2 **nhân đôi trọng số**:
  `Band Viết = (Task1 + 2 × Task2) / 3`
- Nói: 4 tiêu chí, lấy trung bình.
- **Điểm tổng** = trung bình 4 kỹ năng, làm tròn: phần lẻ `.25` → lên `.5`;
  `.75` → lên số nguyên kế tiếp; dưới `.25` → xuống.
  Ví dụ: 6,125 → 6,0 · 6,25 → 6,5 · 6,75 → 7,0.

**Bảng quy đổi tham chiếu (xấp xỉ)**

| Band | Nghe (đúng/40) | Đọc Academic (đúng/40) |
|---|---|---|
| 9,0 | 39–40 | 39–40 |
| 8,5 | 37–38 | 37–38 |
| 8,0 | 35–36 | 35–36 |
| 7,5 | 32–34 | 33–34 |
| 7,0 | 30–31 | 30–32 |
| 6,5 | 26–29 | 27–29 |
| 6,0 | 23–25 | 23–26 |
| 5,5 | 18–22 | 19–22 |
| 5,0 | 16–17 | 15–18 |
| 4,5 | 13–15 | 13–14 |
| 4,0 | 10–12 | 10–12 |

### 1.3 TOEIC Listening & Reading

| Phần | Số câu | Thời lượng | Nội dung |
|---|---|---|---|
| Part 1 | 6 | \multirow 45 phút | Mô tả tranh |
| Part 2 | 25 | | Hỏi – đáp |
| Part 3 | 39 (13 đoạn × 3) | | Hội thoại |
| Part 4 | 30 (10 bài × 3) | | Bài nói ngắn |
| Part 5 | 30 | 75 phút | Điền câu chưa hoàn chỉnh |
| Part 6 | 16 (4 đoạn × 4) | | Điền đoạn văn |
| Part 7 | 54 | | Đọc hiểu: 29 câu đoạn đơn, 25 câu đa đoạn |

**Cách tính điểm**

- Mỗi phần (Nghe / Đọc) quy từ điểm thô 0–100 sang **thang 5–495**, bước 5.
- Tổng **10–990**. **Không trừ điểm câu sai** → luôn phải đoán, không bỏ trống.
- Quy đổi phi tuyến và thay đổi theo từng đề. Bảng xấp xỉ dùng cho luyện tập:

| Đúng /100 | Nghe (≈) | Đọc (≈) |
|---|---|---|
| 96–100 | 495 | 495 |
| 90 | 450 | 455 |
| 80 | 390 | 400 |
| 70 | 330 | 335 |
| 60 | 275 | 270 |
| 50 | 220 | 210 |
| 40 | 165 | 150 |
| 30 | 110 | 95 |

### 1.4 TOEIC Speaking & Writing

| Bài | Số câu | Thời lượng | Thang |
|---|---|---|---|
| Speaking | 11 | ~20 phút | 0–200, 8 mức |
| Writing | 8 | ~60 phút | 0–200, 9 mức |

Chấm theo rubric từng dạng câu (đọc to, mô tả tranh, trả lời câu hỏi, đề xuất
giải pháp, nêu ý kiến / viết câu theo tranh, trả lời email, viết luận).

### 1.5 PTE Academic

Thi trên máy, chấm hoàn toàn bằng máy, thang **10–90** theo Global Scale of English.

| Phần | Thời lượng | Dạng câu chính |
|---|---|---|
| Speaking & Writing | 54–67 phút | Read Aloud, Repeat Sentence, Describe Image, Re-tell Lecture, Answer Short Question, Summarize Written Text, Essay |
| Reading | 29–30 phút | Fill in the Blanks, Multiple Choice, Re-order Paragraphs |
| Listening | 30–43 phút | Summarize Spoken Text, Fill in the Blanks, Highlight Correct Summary, Write from Dictation |

**Đặc thù cần mô phỏng đúng**

- **Chấm tích hợp**: một câu đóng góp điểm cho nhiều kỹ năng cùng lúc. Ví dụ
  *Read Aloud* tính cả Reading lẫn Speaking; *Write from Dictation* tính cả
  Listening lẫn Writing.
- **Điểm thành phần (partial credit)**: nhiều dạng câu cho điểm từng phần chứ
  không đúng/sai nhị phân — ví dụ *Write from Dictation* tính theo số từ đúng.
- **Trừ điểm chọn sai**: một số dạng multiple-choice nhiều đáp án **có trừ điểm**
  cho lựa chọn sai (khác hẳn TOEIC). Phải cảnh báo học viên.
- Báo cáo thêm **enabling skills**: Grammar, Oral Fluency, Pronunciation,
  Spelling, Vocabulary, Written Discourse.

### 1.6 Oxford Test of English (OTE)

Thi theo module, **thích ứng (adaptive)** — độ khó câu sau phụ thuộc kết quả câu trước.

| Module | Thời lượng |
|---|---|
| Speaking | 15 phút |
| Listening | 30 phút |
| Reading | 35 phút |
| Writing | 45 phút |

- Kết quả trả về **CEFR** (dưới A2 / A2 / B1 / B2) kèm **điểm số 51–140** cho từng
  module và điểm trung bình.
- Học viên thi từng module riêng, không bắt buộc thi đủ 4.

---

## Phần 2 — Thiết kế engine chấm điểm

### 2.1 Nguyên tắc

1. **Một engine, nhiều thang.** Chấm luôn đi qua ba tầng tách rời:
   `chấm từng câu → gộp điểm thô theo phần → quy đổi sang thang của kỳ thi`.
   Chỉ tầng thứ ba biết về band IELTS hay thang 990 của TOEIC.
2. **Thang quy đổi là dữ liệu, không phải mã.** Mỗi kỳ thi có một bảng quy đổi
   lưu trong CSDL, admin sửa được mà không cần deploy.
3. **Chấm được phần nào trả phần đó.** Trắc nghiệm và điền từ trả kết quả ngay;
   Viết / Nói xếp hàng chờ chấm và bổ sung vào kết quả sau.
4. **Luôn giải thích được.** Mỗi điểm số lưu kèm dấu vết: câu nào đúng/sai, quy
   đổi bằng bảng nào, phiên bản rubric nào. Học viên khiếu nại là tra ra ngay.
5. **Không hứa điểm thật.** Màn kết quả ghi rõ "điểm tham chiếu khi luyện tập".

### 2.2 Ba tầng chấm

**Tầng 1 — chấm từng câu.** Mỗi dạng câu có một hàm chấm thuần, trả về
`{ earned, max, detail }`:

| Dạng | Cách chấm |
|---|---|
| `mcq` | Đúng/sai. Có cờ `negativeMarking` cho dạng PTE nhiều đáp án |
| `multi` | Điểm thành phần: `max(0, số chọn đúng − số chọn sai) / tổng đáp án đúng` |
| `gap` | So chuỗi sau khi chuẩn hoá: bỏ khoảng trắng thừa, không phân biệt hoa thường, chấp nhận danh sách biến thể (`color\|colour`), tuỳ chọn bỏ qua lỗi chính tả 1 ký tự |
| `order` | Tính theo số **cặp liền kề** đúng, không phải vị trí tuyệt đối (đúng cách PTE Re-order Paragraphs làm) |
| `match` | Điểm thành phần theo số cặp ghép đúng |
| `dictation` | Số từ đúng / tổng số từ, có chuẩn hoá dấu câu |
| `essay` | Rubric, chấm sau |
| `speaking` | Rubric, chấm sau |

**Tầng 2 — gộp theo phần.** Cộng `earned` / `max` của các câu trong phần. Với
PTE, một câu ghi điểm vào nhiều kỹ năng nên bảng `section_items` cần cột
`skill_weights_json` dạng `{"reading": 0.5, "speaking": 0.5}`.

**Tầng 3 — quy đổi.** Bốn kiểu quy đổi, đủ phủ cả 6 kỳ thi:

| Kiểu | Dùng cho | Cách hoạt động |
|---|---|---|
| `band_table` | IELTS | Tra bảng điểm thô → band |
| `scaled_table` | TOEIC L&R | Tra bảng điểm thô → 5–495 |
| `linear` | VEPT / VPET | `round(raw / max × 10 × 2) / 2` → thang 10 bước 0,5 |
| `irt_stub` | OTE, PTE | Tạm dùng ánh xạ tuyến tính có trọng số độ khó; chỗ cắm cho mô hình IRT thật sau |

**Điểm tổng** khai báo bằng công thức trong cấu hình kỳ thi:

```json
{
  "overall": { "type": "mean_round_half", "skills": ["listening","reading","writing","speaking"] },
  "writing": { "type": "weighted", "parts": { "task1": 1, "task2": 2 } }
}
```

### 2.3 Chấm Viết và Nói

Không thể chấm đúng bằng luật thuần. Thiết kế theo tầng, mỗi tầng bật/tắt được:

1. **Tầng đo được (làm ngay, miễn phí).** Số từ so với yêu cầu, độ đa dạng từ
   vựng (type-token ratio), độ dài câu trung bình, mật độ linking words, lỗi
   chính tả, tỉ lệ từ ngoài danh sách CEFR của bậc đang luyện. Đây **không phải
   điểm**, mà là **phản hồi chẩn đoán** — nói rõ với học viên.
2. **Tầng so khớp (làm ngay, miễn phí).** Chỉ dùng được khi câu hỏi có đáp án
   đúng cố định. Part H — "nhắc lại câu vừa nghe" — là trường hợp duy nhất trong
   các phần Nói: câu gốc nằm sẵn trong ngân hàng đề, nên `server/repeat.js` so
   khớp từ thay vì trả tiền cho một ý kiến về câu hỏi đã có đáp án. Xem 2.3b
   bước 2b.
   *(Tầng rubric thủ công — giáo viên chấm tay — **không tồn tại** trong nền
   tảng này và không có kế hoạch làm: `rubric_scores.marked_by` là chuỗi `'ai'`
   cố định ở chỗ ghi duy nhất. Chủ đầu tư đã xác nhận giáo viên không chấm bài.)*
3. **Tầng máy chấm.** Chỗ cắm cho dịch vụ chấm ngoài. Hợp đồng dữ liệu cố định
   `{ criteria: {...}, feedback: [...] }` để đổi nhà cung cấp không phải sửa engine.

Phần Nói còn cần đo **phát âm và độ trôi chảy**. Miễn phí trước mắt: dùng
`SpeechRecognition` của trình duyệt để lấy transcript rồi so với văn bản mẫu
(chỉ hợp cho dạng *Read Aloud* / *Repeat Sentence*), cộng thêm đo tốc độ nói và
số lần ngập ngừng từ chính file ghi âm.

#### Năm luật giữ cho điểm rubric trung thực — `server/rubric.js`

Chủ đầu tư yêu cầu rubric "thật sát và khắt khe" để người học nhận ra đúng trình
độ mình. **Khắt khe ở đây nghĩa là *đúng*, không phải *cho điểm thấp*.** Một
rubric trừ đều một bậc của tất cả mọi người thì cũng vô ích y như một rubric
nới tay, mà còn tệ hơn vì nó làm người ta bỏ cuộc. Năm luật dưới đây làm việc
đó, và luật nào cũng là về chuyện *chấm cho đúng*:

| # | Luật | Vì sao |
|---|---|---|
| 1 | **Tiêu chí yếu nhất chặn trần cả bài.** Điểm chung cao nhất chỉ được hơn tiêu chí thấp nhất **0,5** | Bài có từ vựng C1 nhưng ngữ pháp A2 không phải bài B2 — ở chỗ làm thật, ngữ pháp mới là chỗ người đọc vấp |
| 2 | **Không nộp gì thì 0 điểm.** Không có chữ nào → **0**, chặn trước mọi luật khác | Luật này thêm sau, vì thiếu nó thì bài **bỏ trống** ra **4,0**: luật 3 chặn TRẦN ở 4 và chính lời của nó nói "quá ngắn thì chưa tính là đã làm bài" — rồi vẫn cho 4 điểm. Một cái trần đứng ở chỗ đáng lẽ phải là một cái sàn. Không viết gì khác với viết ngắn, và hai việc đó phải ra hai con số khác nhau |
| 3 | **Độ dài là cửa, không phải tiêu chí.** Dưới số từ yêu cầu → trần điểm tăng dần theo độ dài, chạm sàn **4,0** ở mức **60%** | Part D yêu cầu tối thiểu 100 từ. Quá ngắn thì chưa tính là đã làm bài, dù câu cú có tốt đến đâu. Đo được, nên áp cả khi chưa có ai chấm. **Trước đây đây là một bậc thang và có một lỗ 40 từ**: cửa chỉ sập dưới 60 từ và không có gì áp từ 60 đến 99, nên một email 60 từ câu cú tốt ra **9/10** trên yêu cầu 100 từ. Nay trần chạy liên tục từ 4,0 ở 60 từ lên không-trần ở 100, nên không từ nào đáng quá nửa điểm |
| 4 | **Mỗi tiêu chí phải chỉ vào bằng chứng, và bằng chứng bị KIỂM** | Điểm mà người học không truy được về chữ của chính mình thì không dạy được gì. Và vì tầng 3 là một mô hình ngôn ngữ, câu trích nó đưa ra **không được tin ngay**: `verifyEvidence` tìm câu đó trong bài thật, không thấy thì bỏ. **Một câu trích bịa còn tệ hơn không có câu trích nào, vì nó trông y hệt bằng chứng** |
| 5 | **Mỗi điểm ghi kèm phiên bản rubric** | Tiêu chí rồi sẽ đổi. Chấm lại lịch sử khi đổi là xoá mất bản ghi tiến bộ của người học, nên điểm cũ giữ nguyên phiên bản đã chấm nó |

> **Luật 1 là luật của nền tảng này, không phải luật của VPET.** Pearson không
> công bố quy tắc nào như thế. Ghi rõ ra đây để không ai đọc mã rồi tưởng đó là
> quy định chính thức của kỳ thi.

**Cố tình KHÔNG có: phát âm và độ trôi chảy trong rubric các phần Nói.** Bài nói
được chấm từ transcript, tức là chưa ai nghe giọng thí sinh; thêm tiêu chí về
cách họ phát âm là bịa ra một con số không có gì đứng sau. Điều này đã được nói
với mô hình chấm và nói với thí sinh, và `server/rubric.js` không lặng lẽ thêm
lại.

**Tiêu chí theo từng phần.** Chỉ những phần thật sự có nhiều chiều mới có nhiều
tiêu chí — tách một thứ đo được thành bốn cho ra vẻ đầy đủ thì bốn con số sẽ
luôn nhích cùng nhau và chẳng nói thêm gì.

| Phần | Tiêu chí | Ai chấm |
|---|---|---|
| B — Dựng lại đoạn văn | giữ được ý · ngữ pháp và chính tả · sắp xếp | mô hình |
| D — Viết email | hoàn thành yêu cầu · giọng văn · bố cục · ngữ pháp và chính tả | mô hình |
| G — Nghe hiểu đoạn | trả lời đúng | mô hình |
| H — Nhắc lại câu | giữ được bao nhiêu · giữ được cấu trúc | **so khớp, không dùng mô hình** |
| I — Tình huống nói | xử lý tình huống · vốn ngôn ngữ · độ chính xác · mức trang trọng | mô hình |
| J — Kể lại chuyện | giữ được sự việc · trình tự · ý chính | mô hình |

> **G và H trước đây không có tiêu chí nào** — 16 trong 58 câu, trong đó 10 câu
> là Speaking. `combine()` rơi thẳng xuống con số tổng của mô hình: không gì đối
> chiếu nó, không ghi gì vào `rubric_scores`, và báo cáo hiện điểm mà không có
> phần giải thích nào. Hai phần ba điểm Speaking không có căn cứ. Hai phần này
> hẹp thật, nên tiêu chí nói *hẹp về cái gì* chứ không bịa thêm chiều.

### 2.3b Công thức tính điểm một bài VPET, từ đầu đến cuối

Phần trên nói *thiết kế*. Phần này là **công thức đang chạy**, đúng như mã. Mọi
hằng số dưới đây đọc thẳng từ `server/rubric.js` và `server/marking.js`.

#### Bước 1 — mỗi câu ra `earned / max`

**Mọi câu đều có `max = 1`.** Một email 9 phút nặng đúng bằng một câu điền từ 25
giây. Đây là lựa chọn có chủ ý: VPET không công bố trọng số theo câu, nên tự đặt
ra một bảng trọng số là bịa ra một con số rồi giấu nó trong mã.

| Phần | Dạng | `earned` |
|---|---|---|
| A, E | điền từ | `1` nếu khớp đáp án (bỏ hoa/thường, dấu câu hai đầu, chấp nhận biến thể `color\|colour`), ngược lại `0` |
| C, F | trắc nghiệm | `1` nếu đúng, `0` nếu sai |
| H | nhắc lại | `điểm_rubric / 10` — so khớp từ, xem bước 2b |
| B, D, G, I, J | rubric | `điểm_rubric / 10` — xem bước 2 |

Không làm → `earned = 0`. **Chưa chấm được → `earned = NULL`**, không phải `0`.
Khác biệt này là cả một nguyên tắc: `0` nghĩa là "đã chấm, không được điểm nào";
`NULL` nghĩa là "chưa ai chấm". Cho `0` một bài luận chưa ai đọc là một lời nói
dối trông giống một con số.

#### Bước 2 — điểm rubric của một câu Viết/Nói (thang 10)

```
điểm_thô  = trung bình cộng điểm các tiêu chí         (mỗi tiêu chí 0–10)
```

Rồi **ba luật chặn**, theo đúng thứ tự này:

```
1. Mắt xích yếu nhất   nếu điểm_thô > min(tiêu_chí) + 0,5
                       thì điểm = min(tiêu_chí) + 0,5
                       (chỉ áp khi có từ 2 tiêu chí trở lên)

2. Sàn không-nộp-gì    nếu bài không có chữ nào  ->  điểm = 0   [DỪNG]

3. Cửa độ dài          chỉ Part D, yêu cầu 100 từ.  n = số từ
                       n >= 100          ->  không chặn
                       60 <= n < 100     ->  trần = 4 + 6 × (n − 60) / 40
                       n < 60            ->  trần = 4
                       nếu điểm > trần   ->  điểm = trần

điểm cuối = làm tròn tới 0,5
```

Luật 2 phải chạy **trước** luật 3 và phải là **sàn** chứ không phải trần: thiếu
nó thì bài bỏ trống đi qua luật 3 và ra **4,0** — chính lời của luật 3 nói "quá
ngắn thì chưa tính là đã làm bài" rồi vẫn cho 4 điểm.

Ví dụ Part D, bốn tiêu chí `8 / 7 / 8 / 6`, bài 140 từ:

```
điểm_thô = (8+7+8+6)/4 = 7,25
mắt xích yếu nhất: min = 6, trần = 6,5  ->  7,25 > 6,5  ->  điểm = 6,5
đủ độ dài, không chặn
điểm cuối = 6,5   ->  earned = 0,65
```

#### Bước 2b — Part H không dùng mô hình

Câu phải nhắc lại nằm sẵn trong ngân hàng đề. Gọi `E` = tập từ câu gốc,
`G` = tập từ bản gỡ băng (đã viết ra contraction, quy số về một dạng):

```
chung     = số từ có ở CẢ HAI, đếm lặp đúng số lần cả hai cùng có
đúng_thứ_tự = chuỗi con chung dài nhất giữ nguyên thứ tự

content   = chung / |E| × 10
structure = đúng_thứ_tự / max(|E|, |G|) × 10        (0 nếu chung = 0)
```

Hai con số đó vào đúng chỗ hai tiêu chí, rồi chạy tiếp ba luật chặn ở bước 2 như
mọi câu khác. Chia `structure` cho **bên dài hơn** là để nói thừa cũng bị trừ:
đọc đúng câu rồi kể thêm một tràng thì không phải là nhắc lại.

#### Bước 3 — điểm từng kỹ năng (thang 10)

```
điểm_kỹ_năng = làm_tròn_0,5( Σ earned / Σ max × 10 )
```

`Σ max` là **mọi câu của kỹ năng đó trên đề**, kể cả câu bỏ trống — bỏ trống
nhiều hơn mà điểm cao hơn thì không còn là điểm nữa.

| Kỹ năng | Các phần | Số câu (= `Σ max`) |
|---|---|---:|
| Nghe | E, F, G | 22 |
| Đọc | C | 6 |
| Viết | A, B, D | 15 |
| Nói | H, I, J | 15 |
| | | **58** |

> Part G là **nói** nhưng tính vào **Nghe** — cái được đo là hiểu đoạn băng,
> miệng chỉ là đường ra của câu trả lời. Part A là điền từ nhưng tính vào
> **Viết**. Kỹ năng nằm ở `sections.skill`, không suy từ dạng câu.

#### Bước 4 — điểm tổng và bậc

```
điểm_tổng = làm_tròn_0,5( trung bình cộng 4 điểm kỹ năng )
```

Chỉ tính khi **mọi câu chấm được đã chấm xong**; còn câu `NULL` thì điểm tổng là
`NULL` và màn hình nói đang chờ, chứ không lấy trung bình một nửa bài.

Quy đổi ra trình độ **phụ thuộc kỳ thi và cấp đề** — xem 2.3c ngay dưới. Đây là
chỗ dễ sai nhất và đã từng sai: mọi đề đều bị áp bảng Bậc của VSTEP, kể cả đề
VPET Cấp 1 vốn không đo quá B1+.

**Trình độ cần đủ cả bốn kỹ năng.** Điểm trung bình là số học, luôn đúng với đề
đó; còn *trình độ* là một phát biểu về một kỳ thi trọn vẹn và không đọc được từ
một phần đề. Một đề chỉ có Đọc, 8,0 điểm, vẫn ra điểm 8,0 nhưng **không có trình
độ**.

### 2.3c Quy đổi điểm ra trình độ — `server/bands.js`

**VPET có hai cấp đề, và mỗi cấp đo một đoạn khác nhau của thang.** Nguồn:
`docs/VPET-OFFICIAL-SPEC.md` §0, chép từ *Official Guide for Test-Takers*.

| Đề | GSE | Đo được từ | đến |
|---|---|---|---|
| **Cấp 1** | 10 – 58 | A1 | **B1+** |
| **Cấp 2** | 51 – 90 | B1+ | **C2** |

Hai khoảng **chồng nhau ở B1+** (58 / 51), và đó là chủ ý của kỳ thi thật: hai
đề phải gặp nhau, để thí sinh ở ngay chỗ nối làm đề nào cũng ra kết quả như nhau.

Cách quy đổi:

```
gse  = cận_dưới + (điểm_tổng / 10) × (cận_trên − cận_dưới)
trình_độ = tra gse vào bảng GSE↔CEFR của Pearson
```

Bảng GSE↔CEFR (Pearson công bố, thang 10–90):

| GSE | CEFR |  | GSE | CEFR |
|---|---|---|---|---|
| 85 – 90 | C2 | | 43 – 50 | B1 |
| 76 – 84 | C1 | | 36 – 42 | A2+ |
| 67 – 75 | B2+ | | 30 – 35 | A2 |
| 59 – 66 | B2 | | 22 – 29 | A1 |
| 51 – 58 | B1+ | | 10 – 21 | dưới A1 |

**Trần rơi ra từ phép tính, không phải một luật gắn thêm.** 10/10 ở Cấp 1 là
GSE 58, mà GSE 58 là đỉnh B1+. Đề dừng ở B1+ thì không thể phát hiện ra một
người C1 — nó chỉ phát hiện được rằng người đó vượt qua nó. Màn hình kết quả nói
đúng câu ấy chứ không để thí sinh tự hỏi vì sao bài đúng hết lại dừng ở B1+.

**Sàn của Cấp 2.** Điểm rơi vào bậc thấp nhất của khoảng (B1+, tức GSE 51–58)
nghĩa là đã chạm sàn của công cụ đo: đề chỉ nói được "không quá B1+", không phân
biệt nổi B1+ với B1 hay A2, vì cả ba đều cho gần như cùng một điểm trên một đề ra
ở tầm C. Trường hợp đó báo **trần** chứ không báo trình độ, và chỉ sang đề Cấp 1.
Cấp 1 không cần luật này: sàn của nó là "dưới A1", vốn đã là một câu trả lời
đúng và trọn vẹn.

> **Đường thẳng giữa hai đầu khoảng là lựa chọn của nền tảng này, Pearson không
> công bố gì như thế.** Điểm Versant thật đến từ một mô hình IRT trên độ khó
> từng câu, thứ nền tảng này không có. **Ranh giới GSE↔CEFR là của Pearson; cách
> rải điểm 0–10 vào trong khoảng là của chúng ta.** Nói rõ ở đây vì sẽ có người
> đọc mã rồi tưởng đó là phương pháp chính thức.

**VEPT thì khác và không đổi.** VEPT theo khung VSTEP (Thông tư
01/2014/TT-BGDĐT) và giữ nguyên bảng Bậc:

| Điểm tổng | Bậc | CEFR |
|---|---|---|
| 8,5 – 10 | Bậc 5 | C1 |
| 5,5 – 8,0 | Bậc 4 | B2 |
| 3,5 – 5,0 | Bậc 3 | B1 |
| < 3,5 | không cấp | — |

> **VPET không có "Bậc".** Bậc là của khung VSTEP. Gộp hai thứ vào một bảng
> chính là lỗi cũ: một đề Cấp 1 làm đúng hết được báo **Bậc 5 / C1** — cao hơn
> hai bậc so với thứ cao nhất đề đó có thể đo.

#### Ví dụ trọn một bài

```
Nghe      16,4 / 22  ->  16,4/22 × 10 = 7,45  ->  7,5
Đọc          4 / 6   ->     4/6  × 10 = 6,67  ->  6,5
Viết     10,15 / 15  -> 10,15/15 × 10 = 6,77  ->  7,0
Nói        9,3 / 15  ->   9,3/15 × 10 = 6,20  ->  6,0

điểm tổng = (7,5 + 6,5 + 7,0 + 6,0) / 4 = 6,75  ->  7,0

trên đề CẤP 1:  gse = 10 + 7,0/10 × 48 = 43,6  ->  B1
trên đề CẤP 2:  gse = 51 + 7,0/10 × 39 = 78,3  ->  C1
```

Cùng một bài làm, cùng 7,0 điểm, hai kết quả khác nhau — vì hai đề đo hai đoạn
khác nhau của thang. Đó chính là lý do phải tách.

Ba chỗ làm tròn 0,5 và chỉ ba: mỗi tiêu chí, mỗi kỹ năng, điểm tổng. Không làm
tròn ở `earned` từng câu — làm tròn sớm thì 58 lần sai số nhỏ cộng lại thành
một sai số lớn.

### 2.3d Từ điểm sang việc phải làm — `server/study-map.js`

Chấm xong mới là một nửa. Nửa còn lại là trả lời câu hỏi *"vậy giờ học gì"*, và
nền tảng này đã có sẵn **11 bài giảng tự học** ở `/prep/hoc/…`. Thiếu duy nhất
một bảng nối hai đầu lại.

**Chẩn đoán lấy từ đâu.** Không ước lượng lại lần nữa. `rubric_scores` lưu điểm
**từng tiêu chí, từng câu** đúng như người chấm viết ra, nên chỉ cần gộp lại theo
`part` + `criterion`:

```
Part D · accuracy (Ngữ pháp và chính tả)   5,3/10   trên 22 câu đã chấm
Part D · organisation                      7,25/10  trên 22 câu đã chấm
Part H · structure                         1,0/10   trên 11 câu đã chấm
```

Câu đầu tiên là thứ đáng nói: *bài e-mail của bạn mất điểm ở ngữ pháp nhiều hơn
mọi thứ khác*. Đó là câu hành động được ngay tối nay, khác hẳn "Part D: 5,3".

**Ngưỡng.** `MIN_MARKS = 2` — một bài bị chấm thấp là một bài, chưa phải một
khuynh hướng. `FINE = 7` — từ 7/10 trở lên coi như không còn gì phải sửa. Số câu
đã chấm luôn đi kèm điểm ra tới giao diện: *"5,3/10 trên 22 câu"* là con số cân
đo được, còn *"5,3"* trần trụi thì người học chỉ còn cách tin.

**Bảng nối tiêu chí → bài giảng.**

| Tiêu chí | Học ở đâu |
|---|---|
| `accuracy` | Chính những nhóm ngữ pháp **người này** hay sai (đọc từ `skill_events`) |
| `register` | Sắc thái và mức trang trọng — `/prep/hoc/sac-thai/` |
| `organisation` | Từ nối `/prep/hoc/tu-noi/` + Mệnh đề `/prep/hoc/menh-de/` |
| `range` | Đảo ngữ – nhấn mạnh, Bị động – tường thuật |
| `task`, `meaning`, `correct`, `content`, `structure`, `events`, `sequence`, `point` | **Không có bài giảng nào** |

Hàng cuối là hàng quan trọng nhất. Không bài nào ở đây dạy *"trả lời đủ mọi yêu
cầu của đề"* — cái đó chỉ khá lên bằng cách viết thêm và đọc lại nhận xét. Bịa ra
một đường link cho nó thì tệ hơn là để trống: người học bấm vào, thấy không liên
quan, và mất luôn niềm tin vào những link **có** thật. Nên những dòng đó mang cờ
`technique: true` và giao diện nói thẳng ra.

**Một cái bẫy đã sập.** Bản đầu lấy hai nhóm ngữ pháp *yếu nhất* — tức là sắp xếp
rồi cắt hai dòng cuối. Cách đó luôn trả về hai dòng bất kể người học giỏi tới đâu,
nên một người đạt **10/10** phần khuyết thiếu — nhóm duy nhất họ từng được đo —
lại được đưa bài giảng khuyết thiếu dưới tiêu đề *"những điểm ngữ pháp đang mất
điểm nhiều nhất"*. Giờ dùng chung ngưỡng `FINE`: yếu **thật** mới hiện, không có
thì rơi về danh sách chung.

**Hai bài kiểm tra giữ cho bảng không mục.** `scripts/test-plan.mjs` bắt buộc:
mọi nhóm ngữ pháp trong ngân hàng phải có bài giảng, và mọi bài giảng được nêu
tên phải là trang mà server còn phục vụ thật. Đổi tên một route giờ làm đỏ cổng
kiểm — thay vì thành một link chết mà chỉ người học gặp.

### 2.4 Lược đồ dữ liệu cần thêm

```
attempts            lần làm bài: user, test, bắt đầu, nộp, trạng thái
attempt_answers     đáp án từng câu + earned/max + dấu vết chấm
attempt_scores      điểm theo kỹ năng + điểm tổng + bảng quy đổi đã dùng
scoring_scales      bảng quy đổi theo kỳ thi (band_table / scaled_table / linear)
rubrics             tiêu chí chấm Viết–Nói theo kỳ thi, có phiên bản
rubric_scores       điểm từng tiêu chí cho một lần làm bài
```

### 2.5 Thứ tự làm

1. `attempts` + `attempt_answers` + engine tầng 1–2 (chấm trắc nghiệm, điền từ).
2. `scoring_scales` + tầng 3 cho VEPT/VPET (`linear`) và IELTS/TOEIC (bảng).
3. Màn kết quả: điểm từng kỹ năng, so với mục tiêu, phân tích câu sai theo dạng.
4. Rubric Viết–Nói + màn chấm cho giáo viên.
5. Phản hồi tự động tầng 1 cho bài Viết.
6. Chấm thích ứng (OTE) và chấm tích hợp đa kỹ năng (PTE).
