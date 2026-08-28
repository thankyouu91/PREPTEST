# Quy cách chấm điểm chuẩn — VPET

**Phiên bản rubric: `2026-08-vpet-3`** · nguồn duy nhất: `server/rubric.js`

Tài liệu này là **quy cách chấm**: một câu trả lời được chia điểm theo tiêu chí
nào, mỗi con số trên thang 10 nghĩa là gì, và luật nào chặn điểm lại. Đây là văn
bản để đối chiếu khi một điểm số trông sai — không phải mô tả mong muốn, mà là
đúng những gì mã đang làm.

> **Quan hệ với `docs/SCORING.md`.** SCORING.md nói *thiết kế engine* cho cả sáu
> kỳ thi và công thức tổng của một bài VPET (2.3b). Tài liệu này chỉ nói **một
> câu Viết/Nói được chấm ra sao**, chi tiết đến mức chấm tay lại được. Hằng số
> hai nơi đều đọc từ `server/rubric.js`; `scripts/test-rubric.mjs` giữ cho tài
> liệu này không lệch khỏi mã.

---

## 0. Nguyên tắc: "khắt khe" nghĩa là **đúng**, không phải **cho điểm thấp**

Một rubric trừ đều một bậc của mọi người thì vô ích y như một rubric nới tay, mà
còn tệ hơn vì nó làm người học bỏ cuộc. Ba nguyên tắc quyết định mọi thứ dưới
đây:

1. **Đo được thì đo, đừng đưa cho mô hình.** Cái gì tính ra được bằng số học —
   độ dài, tỉ lệ chép nguyên văn, độ trùng từ của Part H — thì tính, vì số học
   ra cùng một kết quả mọi lần chạy, còn một mô hình ngôn ngữ thì không. Chính
   lỗi Part B (mục 5) là bằng chứng: cùng một bài chép nguyên xi, chấm hai lần
   ra **10/10** và **1/10**.
2. **Điểm phải truy được về chữ của người học.** Mọi tiêu chí phải chỉ vào một
   câu trích trong bài, và câu trích đó **bị kiểm** trước khi hiện ra.
3. **Không chấm cái không có căn cứ.** Bài nói chấm từ transcript, tức là chưa
   ai nghe giọng thí sinh, nên **không có tiêu chí phát âm và độ trôi chảy**.
   Thêm vào là bịa ra một con số không có gì đứng sau.

---

## 1. Điểm một câu ra đời như thế nào

```
     ┌─ mỗi tiêu chí được chấm 0–10 theo thang ở mục 2
     │
     ├─ điểm_thô = trung bình cộng các tiêu chí          ← "beforeCaps"
     │
     ├─ Luật 1  Mắt xích yếu nhất      (trần)
     ├─ Luật 2  Không nộp gì → 0       (sàn, DỪNG tại đây)
     ├─ Luật 3  Cửa độ dài             (trần)
     ├─ Luật 4  Chép lại đề            (trần)
     │
     └─ làm tròn tới 0,5  →  điểm cuối 0–10  →  earned = điểm/10  (max luôn = 1)
```

**Mọi câu nặng bằng nhau: `max = 1`.** Một email 9 phút bằng đúng một câu điền
từ 25 giây. Đây là lựa chọn có chủ ý — VPET không công bố trọng số theo câu, nên
tự đặt ra một bảng trọng số là bịa ra một con số rồi giấu nó trong mã.

**Chưa chấm được thì `earned = NULL`, không phải `0`.** `0` nghĩa là "đã chấm,
không được điểm nào"; `NULL` nghĩa là "chưa ai chấm". Cho `0` một bài chưa ai đọc
là một lời nói dối trông giống một con số.

---

## 2. Thang 10 — con số nào nghĩa là gì

Đây là phần trước đây **không tồn tại**, và là gốc của việc chấm không nhất
quán: mỗi tiêu chí có một câu mô tả *nó nói về cái gì*, nhưng không có gì nói
*7 điểm là thế nào*. Một thang không có mốc thì không phải thang — nó là tâm
trạng của người chấm.

Sáu mốc, dùng chung cho **mọi tiêu chí của mọi phần**. Viết từ phía **người
đọc / người nghe**: họ phải bù đắp bao nhiêu.

| Điểm | Nghĩa |
|---|---|
| **10** | Đạt trọn vẹn. Người đọc/người nghe không phải bù đắp gì. |
| **8** | Đạt. Có vài chỗ chưa chuẩn nhưng không làm người đọc phải dừng lại. |
| **6** | Đạt phần lớn. Người đọc vẫn hiểu, nhưng phải tự đoán một hai chỗ. |
| **4** | Đạt một phần. Người đọc phải đọc lại, hoặc thiếu hẳn một phần yêu cầu. |
| **2** | Gần như chưa đạt. Chỉ có vài mảnh dùng được. |
| **0** | Không có gì thuộc tiêu chí này. |

Số lẻ và số 0,5 được phép, nghĩa là "nằm giữa hai mốc". Chỉ đặt tên sáu mốc chứ
không phải mười một, vì đặt tên cả mười một là giả vờ rằng các khoảng giữa cũng
đã được định nghĩa.

> **Vì sao dùng chung một thang thay vì mỗi tiêu chí một bảng riêng?** 15 tiêu
> chí × 6 mốc là 90 câu mô tả, và sẽ không có ai kiểm 85 câu trong đó. Bản trung
> thực là: một cái thang thật sự tổng quát, cộng với một câu `about` cho từng
> tiêu chí nói *đang leo cái gì*.

---

## 3. Tiêu chí từng phần — điểm được chia ra sao

Chỉ phần nào thật sự có nhiều chiều mới có nhiều tiêu chí. Tách một thứ đo được
thành bốn cho ra vẻ đầy đủ thì bốn con số sẽ luôn nhích cùng nhau và không nói
thêm được gì.

**Trong một phần, các tiêu chí có trọng số bằng nhau** (trung bình cộng), rồi
Luật 1 mới kéo xuống. Không có tiêu chí nào "nặng hơn" tiêu chí nào — thứ đóng
vai trò đó là mắt xích yếu nhất.

| Phần | Ai chấm | Tiêu chí (trọng số bằng nhau) | Luật chặn áp dụng |
|---|---|---|---|
| **A** — Điền từ | so khớp đáp án | *(không rubric)* | — |
| **B** — Dựng lại đoạn văn | mô hình | `meaning` Giữ được ý · `accuracy` Ngữ pháp và chính tả · `organisation` Sắp xếp và mạch văn | 1, 2, **4** |
| **C** — Đọc hiểu | trắc nghiệm | *(không rubric)* | — |
| **D** — Viết email | mô hình | `task` Hoàn thành yêu cầu · `register` Giọng văn phù hợp · `organisation` Bố cục · `accuracy` Ngữ pháp và chính tả | 1, 2, **3**, **4** |
| **E** — Chính tả nghe | so khớp đáp án | *(không rubric)* | — |
| **F** — Chọn câu đáp | trắc nghiệm | *(không rubric)* | — |
| **G** — Nghe hiểu đoạn | mô hình | `correct` Trả lời đúng | 1, 2 |
| **H** — Nhắc lại câu | **so khớp, không dùng mô hình** | `content` Giữ được bao nhiêu · `structure` Giữ được cấu trúc | 1, 2 |
| **I** — Tình huống nói | mô hình | `task` Xử lý được tình huống · `range` Vốn ngôn ngữ · `accuracy` Độ chính xác · `register` Mức trang trọng | 1, 2 |
| **J** — Kể lại chuyện | mô hình | `events` Giữ được sự việc · `sequence` Trình tự · `point` Ý chính | 1, 2 |

### 3.1 Từng tiêu chí nói về cái gì

**Part B — Dựng lại đoạn văn** *(đọc 30 giây, đoạn văn biến mất, viết lại bằng
lời của mình trong 90 giây)*

| Khóa | Tên | Đo cái gì |
|---|---|---|
| `meaning` | Giữ được ý | Bao nhiêu **ý** của đoạn văn còn lại. Dùng đúng từ gốc không bắt buộc và cũng không được thưởng; **mất hẳn một ý** mới là chỗ mất điểm. |
| `accuracy` | Ngữ pháp và chính tả | Cấu trúc câu, dạng động từ, mạo từ, chính tả. |
| `organisation` | Sắp xếp và mạch văn | Các ý có đến theo thứ tự người đọc theo được không. |

**Part D — Viết email** *(9 phút, tối thiểu 100 từ)*

| Khóa | Tên | Đo cái gì |
|---|---|---|
| `task` | Hoàn thành yêu cầu | **Mọi** ý tình huống yêu cầu đều được nói tới. Lịch sự không bù được cho một ý bị thiếu. |
| `register` | Giọng văn phù hợp | Giọng có hợp với người nhận và với môi trường công việc không. |
| `organisation` | Bố cục | Mở – thân – kết; mỗi đoạn một ý; từ nối để giúp người đọc chứ không để trang trí. |
| `accuracy` | Ngữ pháp và chính tả | Cấu trúc câu, dạng động từ, mạo từ, chính tả. |

**Part G — Nghe hiểu đoạn** *(nghe một lần, trả lời miệng)*

| Khóa | Tên | Đo cái gì |
|---|---|---|
| `correct` | Trả lời đúng | Câu trả lời có đúng không. Hướng dẫn thi bảo thí sinh trả lời "bằng một cụm ngắn", nên **một cụm ba từ đúng là điểm tối đa** và không bị trừ vì ngắn, vì thiếu động từ, hay vì không thành câu. Ngữ pháp chỉ tính khi nó làm sai nghĩa. |

**Part H — Nhắc lại câu** *(nghe một câu, nói lại)* — **không dùng mô hình.**
`server/repeat.js` so khớp từ: câu gốc nằm sẵn trong ngân hàng đề, nên trả tiền
cho một ý kiến về câu hỏi đã có đáp án là lãng phí, và một mô hình có thể tự mâu
thuẫn giữa hai lần chạy còn phép so khớp thì không.

| Khóa | Tên | Đo cái gì |
|---|---|---|
| `content` | Giữ được bao nhiêu | Tỉ lệ từ của câu gốc xuất hiện lại. |
| `structure` | Giữ được cấu trúc | Chuỗi từ đúng thứ tự dài nhất — trật tự và ngữ pháp có sống sót không. |

**Part I — Tình huống nói** *(10 giây nghĩ, tối đa 60 giây nói)*

| Khóa | Tên | Đo cái gì |
|---|---|---|
| `task` | Xử lý được tình huống | Mọi việc tình huống đòi hỏi có thật sự xảy ra không. |
| `range` | Vốn ngôn ngữ | Từ vựng và cấu trúc có vượt khỏi lựa chọn an toàn nhất không. |
| `accuracy` | Độ chính xác | Ngữ pháp và chọn từ, chấm từ transcript. |
| `register` | Mức trang trọng | Mức trang trọng có hợp với người đang được nói chuyện cùng không. |

**Part J — Kể lại chuyện** *(nghe một lần, 30 giây kể lại)*

| Khóa | Tên | Đo cái gì |
|---|---|---|
| `events` | Giữ được sự việc | Bao nhiêu sự việc của câu chuyện còn lại. |
| `sequence` | Trình tự | Chúng có đến đúng thứ tự không. |
| `point` | Ý chính | Ý của câu chuyện có toát ra không, chứ không chỉ các mảnh của nó. |

---

## 4. Bốn luật chặn, theo đúng thứ tự chạy

### Luật 1 — Mắt xích yếu nhất *(trần)*

```
nếu điểm_thô > min(các tiêu chí) + 0,5
   thì điểm = min(các tiêu chí) + 0,5
(chỉ áp khi có từ 2 tiêu chí trở lên)
```

Bài có từ vựng C1 nhưng ngữ pháp A2 không phải bài B2 — ở chỗ làm thật, ngữ pháp
mới là chỗ người đọc vấp.

> ⚠️ **Đây là luật của nền tảng này, không phải luật của VPET.** Pearson không
> công bố quy tắc nào như thế. Ghi rõ để không ai đọc mã rồi tưởng là quy định
> chính thức của kỳ thi.

### Luật 2 — Không nộp gì thì 0 *(sàn — dừng tại đây)*

Không có chữ nào → **0**, và không chạy tiếp luật nào nữa.

Luật này phải chạy **trước** Luật 3 và phải là **sàn** chứ không phải trần:
thiếu nó thì bài bỏ trống đi qua Luật 3 và ra **4,0** — chính lời của Luật 3 nói
"quá ngắn thì chưa tính là đã làm bài" rồi vẫn cho 4 điểm. Một cái trần đứng ở
chỗ đáng lẽ phải là một cái sàn.

Áp cho **mọi phần**, kể cả phần không có yêu cầu số từ: không viết gì là không
viết gì.

### Luật 3 — Cửa độ dài *(trần)* — chỉ Part D

Part D yêu cầu **tối thiểu 100 từ** (con số này của hướng dẫn thi chính thức).
Part B **không có** ngưỡng công bố nào — đoạn văn mỗi bài một khác — nên ở đây
cũng không đặt ra một con số do ai đó đoán.

```
n = số từ.  floor = 100
n >= 100        →  không chặn
60 <= n < 100   →  trần = 4 + 6 × (n − 60) / 40
n < 60          →  trần = 4
```

**Trước đây đây là một bậc thang và có một lỗ 40 từ**: cửa chỉ sập dưới 60 từ và
không có gì áp từ 60 đến 99, nên đo được một email 60 từ câu cú tốt ra **9/10**
trên yêu cầu 100 từ. Nay trần chạy liên tục từ 4,0 ở 60 từ lên không-trần ở 100,
nên không có từ nào đáng quá nửa điểm.

Độ dài là **cửa, không phải tiêu chí**: nó đo được, nên áp cả khi chưa có ai
chấm, và mô hình chấm được dặn **không trừ thêm lần nữa** vì nó đã bị trừ ở đây.

### Luật 4 — Chép lại đề *(trần)* — Part B và Part D

```
so khớp các chuỗi 5 từ liên tiếp của bài làm với đoạn đề
f = (số chuỗi 5 từ có trong đề) / (tổng số chuỗi 5 từ của bài làm)

f <= 0,35          →  không chặn
0,35 < f < 0,85    →  trần = 3 + 7 × (1 − (f − 0,35) / 0,50)
f >= 0,85          →  trần = 3

(chỉ áp khi bài làm có từ 12 từ trở lên)
```

**Vì sao chuỗi 5 từ chứ không phải đếm từ trùng.** Một bài dựng lại đoạn văn
*đương nhiên* dùng lại danh từ của đoạn văn — đó là nhớ chứ không phải chép. Cái
phân biệt kể lại với chép lại là các từ có quay về **đúng thứ tự của đoạn văn**
hay không, và 5 từ liên tiếp là quãng ngắn nhất mà việc đó không còn xảy ra do
tình cờ.

**Vì sao 3 điểm chứ không phải 0.** Bài chép lại vẫn chứng minh thí sinh đọc
được. Nhưng 3 **thấp hơn** mức 4 mà một bài ngắn nhưng thật được chặn ở — có chủ
ý: bài ngắn là *một phần* của bài làm, bài chép là *không phần nào*.

**Áp cho phần nào — và vì sao KHÔNG áp cho các phần còn lại.**

| Phần | Có áp? | Vì sao |
|---|---|---|
| **B** | ✅ | Đoạn văn hiện trên màn hình 30 giây và bôi đen được. Chép lại là đúng cái phần này cấm. |
| **D** | ✅ | Tình huống là chữ trên màn hình. Dán nó lại thì chưa viết email nào cả. |
| G | ❌ | Hướng dẫn thi bảo trả lời "bằng một cụm ngắn", và **cụm đúng thường chính là chữ của đoạn nghe**. Chặn nó là phạt câu trả lời đúng. |
| H | ❌ | Nói lại nguyên văn **chính là** đề bài. `repeat.js` cho điểm bằng đúng độ trùng mà luật này phạt. |
| I | ❌ | Cùng lý do với G: một câu đáp tốt cho "xin lỗi vì lỡ cuộc họp" dùng lại chính chữ của tình huống. Chặn nhầm một bài làm thật tệ hơn là bỏ sót một lần gian lận hiếm. |
| J | ❌ | Câu chuyện chỉ được **nghe**, không hiện trên màn hình — không có gì để chép, và nhớ sát là chính kỹ năng đang đo. |

> ⚠️ **Đây cũng là luật của nền tảng này, và nó là một sự đánh đổi.** Kỳ thi
> thật chạy trong trình duyệt khóa, không có gì để dán. Nền tảng này chạy trong
> tab thường: đoạn văn đến trong payload của bài thi và cửa sổ đọc là 30 giây
> chữ bôi đen được. Nền tảng **không phân biệt được** một cú dán với một trí nhớ
> phi thường, và nó không giả vờ phân biệt được — cái nó đo là **độ trùng**, và
> cái nó nói với thí sinh cũng là độ trùng. Một thí sinh thật sự nhớ được cả
> đoạn văn sẽ bị trừ oan; đó là cái giá, và nó đáng trả, vì phương án còn lại là
> luyện tập ở phần này dạy người ta chép, rồi ngày thi thật mới biết.

---

## 5. Ca đã xảy ra: Part B cho 10/10 một bài chép nguyên xi

**Hiện tượng.** Thí sinh bôi đen đoạn văn trong 30 giây đọc, dán vào ô trả lời.
Kết quả: **10/10 cả ba tiêu chí.**

**Và cả ba con số ấy đều đúng theo đúng định nghĩa của chúng:**

- `meaning` — không mất một ý nào. Đúng là không mất ý nào thật.
- `accuracy` — ngữ pháp là ngữ pháp của chính đoạn văn, nên hoàn hảo.
- `organisation` — các ý đến theo thứ tự người đọc theo được, vì chúng đến theo
  thứ tự của đoạn văn.

Ba câu trả lời đúng cho ba câu hỏi sai.

**Nửa còn lại của lỗi.** Cũng cú dán đó, chấm lần hai, ra **1/10**. Đây mới là
lý do phải làm thành **luật số học** chứ không phải sửa lời nhắc: phán đoán của
một mô hình về cùng một đoạn chữ hai lần là hai phán đoán, và một điểm số phụ
thuộc vào "bạn rơi vào lần chạy nào" thì không phải điểm số.

**Đã sửa thế nào.**

1. **Luật 4** đo độ trùng bằng số học — ra cùng một kết quả mọi lần chạy, và áp
   kể cả khi chưa có mô hình nào chạy.
2. **Mô hình được dặn KHÔNG trừ thêm** vì việc chép ("measured separately and
   enforced without you"). Bảo nó trừ nữa sẽ thành trừ hai lần ở những lần chạy
   nó phát hiện ra và một lần ở những lần nó không — đúng cái mâu thuẫn cũ đội
   mũ mới. Đây là cùng một khuôn với Luật 3 độ dài.
3. **Thang điểm ở mục 2** cho mọi tiêu chí một cái mốc, để hai lần chạy còn có
   cùng một thứ để bám vào.

**Đo lại sau khi sửa** (`scripts/test-rubric.mjs`):

| Bài làm | Độ trùng | Chuỗi chép dài nhất | Điểm |
|---|---|---|---|
| Dán nguyên đoạn văn | 100% | 63 từ | **3,0** |
| Dán rồi sửa từ đầu và dấu cuối | 100% | 62 từ | **3,0** |
| Chép quá nửa, còn lại tự viết | 74% | 39 từ | **4,5** |
| Viết lại thật bằng lời của mình | 0% | 4 từ | **10** |
| Viết lại thật, có nhớ nguyên một mệnh đề | 27% | 14 từ | **10** |

Hai dòng cuối là hai dòng quan trọng nhất: **luật này không được phạt người làm
thật.**

---

## 6. Bằng chứng phải chỉ vào chữ của chính thí sinh — và bị kiểm

Mỗi tiêu chí kèm một câu trích từ bài làm. Câu trích **bị đối chiếu với bài thật
trước khi hiện ra**, và bị bỏ nếu không tìm thấy.

- Tối thiểu **3 từ**. "the" có trong gần như mọi bài; dưới ba từ thì một cú khớp
  không còn là bằng chứng của cái gì.
- So khớp bỏ qua hoa/thường, dấu câu và khoảng trắng — khác biệt ở đó không phải
  là bịa.
- Câu trích bị bỏ được **nói ra**, không im lặng: "người chấm trích một câu bạn
  không viết" là thông tin thí sinh có quyền biết.

> **Một câu trích bịa còn tệ hơn không có câu trích nào, vì nó trông y hệt bằng
> chứng.** Đây là lý do cả cơ chế này tồn tại.

---

## 7. Cố tình KHÔNG chấm

| Không có | Vì sao |
|---|---|
| **Phát âm, trọng âm, độ trôi chảy** | Bài nói chấm từ transcript — chưa ai nghe giọng thí sinh. Thêm tiêu chí về cách họ phát âm là bịa ra một con số không có gì đứng sau. Điều này được nói với mô hình chấm **và** nói với thí sinh trên phiếu điểm. |
| **Giáo viên chấm tay** | Không tồn tại trong nền tảng này và không có kế hoạch làm. `rubric_scores.marked_by` là chuỗi `'ai'` cố định ở chỗ ghi duy nhất. Hứa một lớp kiểm duyệt của con người mà không có là câu tệ nhất trong ba lựa chọn — tệ hơn cả im lặng — vì đó chính là câu thí sinh sẽ bám vào khi thấy điểm sai. |
| **Trọng số theo câu** | VPET không công bố. Mọi câu `max = 1`. |
| **Ngưỡng số từ cho Part B** | Hướng dẫn thi không đặt ngưỡng nào cho Part B; đoạn văn mỗi bài một khác. Đặt ra một con số là đoán. |

---

## 8. Đổi rubric thì làm gì

**Mọi điểm đã lưu đều mang `RUBRIC_VERSION` của lúc nó được chấm.** Khi tiêu chí
đổi, **không chấm lại lịch sử** — làm thế là xóa mất bản ghi tiến bộ của chính
người học, và tệ hơn nữa khi luật mới nghiêm hơn luật cũ: một bài thi đã làm
theo luật nó được thông báo, hạ điểm nó vài tháng sau là điều một điểm số không
bao giờ được làm.

Bài đã chấm dưới `2026-08-vpet-2` **giữ nguyên** — Luật 4 không hồi tố.

Khi sửa `server/rubric.js`:

1. Tăng `RUBRIC_VERSION`.
2. Sửa tài liệu này **trong cùng một commit**.
3. Chạy `node scripts/test-rubric.mjs` — nó kiểm cả hằng số lẫn việc tài liệu
   này còn khớp với mã.
4. Nếu tiêu chí đổi tên hoặc đổi nghĩa: sửa cả `RUBRIC` trong
   `server/ai-marking.js`, vì lời nhắc cho mô hình phải nói cùng một thứ.

---

## 9. Đọc mã ở đâu

| Thứ | File |
|---|---|
| Tiêu chí, thang điểm, bốn luật chặn, kiểm bằng chứng | `server/rubric.js` |
| Lời nhắc gửi cho mô hình chấm | `server/ai-marking.js` |
| Đường chấm một bài thi thật | `server/ai-marking-run.js` |
| Đường chấm bài luyện (cùng luật) | `server/drills.js` |
| Part H — so khớp, không dùng mô hình | `server/repeat.js` |
| Công thức từ điểm câu ra điểm kỹ năng và bậc | `server/marking.js`, `server/bands.js` |
| Kiểm chứng toàn bộ tài liệu này | `scripts/test-rubric.mjs` |
