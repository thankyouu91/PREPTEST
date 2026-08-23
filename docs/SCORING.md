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

### 1.1 VEPT / VPET (theo khung VSTEP, 6 bậc dùng cho Việt Nam)

Hai chứng chỉ nội địa của nền tảng, bám Khung năng lực ngoại ngữ 6 bậc
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
2. **Tầng rubric thủ công.** Giáo viên chấm theo đúng 4 tiêu chí của kỳ thi, lưu
   điểm từng tiêu chí + nhận xét. Đây là nguồn sự thật để hiệu chỉnh tầng 3.
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
| 3 | **Độ dài là cửa, không phải tiêu chí.** Dưới **60%** số từ yêu cầu → trần **4,0** | Part D yêu cầu tối thiểu 100 từ. Quá ngắn thì chưa tính là đã làm bài, dù câu cú có tốt đến đâu. Đo được, nên áp cả khi chưa có ai chấm |
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
tiêu chí. Part H là "nhắc lại câu vừa nghe" — có đúng một thứ để đo, tách thành
bốn cho ra vẻ đầy đủ thì bốn con số sẽ luôn nhích cùng nhau và chẳng nói thêm gì.

| Phần | Tiêu chí |
|---|---|
| B — Dựng lại đoạn văn | giữ được ý · ngữ pháp và chính tả · sắp xếp |
| D — Viết email | hoàn thành yêu cầu · giọng văn · bố cục · ngữ pháp và chính tả |
| I — Tình huống nói | xử lý tình huống · vốn ngôn ngữ · độ chính xác · mức trang trọng |
| J — Kể lại chuyện | giữ được sự việc · trình tự · ý chính |
| G, H | một chiều duy nhất, không tách tiêu chí |

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
