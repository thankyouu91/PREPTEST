# Quy cách chấm điểm chuẩn — VPET

**Phiên bản rubric: `2026-08-vpet-5`** · nguồn duy nhất: `server/rubric.js`

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
     ├─ điểm_thô = trung bình CÓ TRỌNG SỐ các tiêu chí   ← "beforeCaps"
     │             (trọng số mặc định 1; Part D dùng trọng số của Pearson)
     │
     ├─ Luật 1  Mắt xích yếu nhất      (trần)   — KHÔNG áp cho Part D
     ├─ Luật 2  Không nộp gì → 0       (sàn, DỪNG tại đây)
     ├─ Luật 3  Cửa độ dài             (trần)   — KHÔNG áp cho Part D
     ├─ Luật 3b Lạc đề → 0             (sàn, DỪNG) — CHỈ Part D
     ├─ Luật 4  Chép lại đề            (trần)
     │
     └─ làm tròn tới 0,5  →  điểm cuối 0–10  →  earned = điểm/10  (max luôn = 1)
```

**Part D là ngoại lệ có chủ ý và có lý do**: nó chấm theo rubric Write Email của
chính Pearson, và hai luật của nền tảng (1 và 3) nhường chỗ vì scheme của
Pearson đã tính những thứ đó theo cách riêng. Chi tiết ở §3.1.

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

Có **hai thang**, cho **hai loại câu hỏi khác nhau**, và mỗi tiêu chí tự khai
báo nó dùng thang nào (trường `dim` trong `server/rubric.js`):

| Loại tiêu chí | Câu hỏi nó trả lời | Thang dùng |
|---|---|---|
| `content` — nội dung | *Có bao nhiêu phần đề yêu cầu thực sự có mặt?* | Thang mức độ hoàn thành (2.1) |
| `accuracy` · `range` · `organisation` · `register` | *Tiếng Anh ở trình độ nào?* | **Thang theo bậc CEFR (2.2)** |

> **Vì sao phải tách?** "Họ có nhắc tới ngày giao hàng không" **không phải** một
> câu hỏi về trình độ tiếng Anh — áp thang CEFR lên nó là nhầm phạm trù. Ngược
> lại, "ngữ pháp ở mức nào" thì đúng là câu hỏi CEFR sinh ra để trả lời. Đưa cho
> người chấm hai thang cho **cùng một** con số là lỗi; đưa cho **hai tiêu chí
> khác nhau** mỗi bên một thang thì không.

### 2.1 Thang mức độ hoàn thành — cho tiêu chí nội dung

Viết từ phía **người đọc / người nghe**: họ phải bù đắp bao nhiêu.

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

### 2.2 Thang theo bậc — điểm nào ứng với bậc nào, trên từng đề

**Đây là phần quan trọng nhất của cả tài liệu, và nó là chỗ hệ thống từng tự
mâu thuẫn.**

`server/bands.js` đổi điểm 0–10 thành bậc CEFR bằng cách đặt điểm đó vào **dải
GSE mà đề công bố**: trên đề Cấp 1, 10/10 là GSE 58 — đúng đỉnh B1+. Tức là
**con số đã mang sẵn một khẳng định về bậc của thí sinh** — đó chính là công
dụng của nó.

Và **chưa bao giờ có ai nói điều đó với AI chấm bài.** Lời nhắc chỉ ghi
"Candidate level for this paper: B1" rồi để mô hình tự đoán xem câu đó nghĩa là
"chấm theo kỳ vọng của B1" hay "chấm theo tiếng Anh tốt". Hai cách hiểu cho ra
hai con số rất khác nhau từ cùng một bài, còn `bands.js` thì luôn đọc kết quả
như thể cách thứ nhất đã xảy ra. **Hai nửa của việc chấm điểm chưa từng khớp
nhau, ngoài lúc may mắn.**

Nay bảng dưới đây được **suy ra ngược từ chính phép tính của `bands.js`**, nên
người chấm nhắm đúng vào cái thước mà báo cáo sẽ dùng để đọc lại:

| Bậc | Đề Cấp 1 (`level` = B1) | Đề Cấp 2 (`level` = C1) |
|---|---|---|
| **C2** | — | 8,7 – 10 |
| **C1** | — | 6,4 – 8,7 |
| **B2+** | — | 4,1 – 6,4 |
| **B2** | — | 2,1 – 4,1 |
| **B1+** | 8,5 – 10 | 0 – 2,1 |
| **B1** | 6,9 – 8,5 | — |
| **A2+** | 5,4 – 6,9 | — |
| **A2** | 4,2 – 5,4 | — |
| **A1** | 2,5 – 4,2 | — |
| **dưới A1** | 0 – 2,5 | — |

Đọc bảng này cho đúng:

- **Điểm không phải "bài này hay tới đâu" mà là "bài này nằm ở đâu trên dải của
  ĐỀ NÀY".** Cùng một bài viết, làm trên đề Cấp 1 được 10, làm trên đề Cấp 2 chỉ
  được 8 — và như thế là đúng, vì hai đề hỏi hai câu hỏi khác nhau về nó.
- **10/10 trên đề Cấp 1 là B1+, không phải C2.** Đề Cấp 1 không nhìn quá B1+
  được; một bài C1 làm đề Cấp 1 cũng chỉ ra B1+, và người chấm được dặn rõ là
  bài mạnh hơn trần vẫn cho điểm tối đa chứ **không** bị trừ vì "chỉ" B1+.
- **Bảng này KHÔNG được gõ tay.** Nó tính ngược từ `bands.js`. Một bảng chép tay
  sẽ là bản sao thứ hai của một phép ánh xạ đã có, và lần đầu ai đó sửa mốc GSE
  thì hai bên lệch nhau — người chấm nhắm một thước, báo cáo đọc một thước khác,
  im lặng, cho tới khi có người thấy một cái bậc trông sai.

`scripts/test-rubric.mjs` kiểm đúng điều này: lấy điểm giữa của **mỗi** nấc rồi
đưa ngược qua `bands.js`, và bậc trả về phải đúng nấc đó.

### 2.3 Bậc trông như thế nào — mô tả từng chiều

Bốn chiều, sáu bậc. Mỗi tiêu chí khai báo nó thuộc chiều nào.

**`accuracy` — Độ chính xác ngữ pháp và chính tả**

| Bậc | Mô tả |
|---|---|
| C2 | Kiểm soát hoàn toàn, kể cả câu dài. Sai sót hiếm tới mức đọc như lỗi gõ phím. |
| C1 | Chính xác đều. Lỗi có thì cũng rõ ràng là lỡ tay, không phải lỗ hổng. |
| B2 | Kiểm soát tốt. Lỗi xuất hiện ở câu phức và hiếm khi làm hiểu sai. |
| B1 | Cấu trúc đơn giản thì chắc. Câu dài hơn và thì ít gặp thì sai, nhưng nghĩa vẫn còn. |
| A2 | Có thử viết câu đơn. Đuôi từ, mạo từ, số nhiều rơi rụng đủ nhiều để người đọc phải tự vá. |
| A1 | Từ rời và cụm học thuộc. Phần lớn nỗ lực viết thành câu đều đổ. |

**`range` — Vốn ngôn ngữ**

| Bậc | Mô tả |
|---|---|
| C2 | Vốn đầy đủ, dùng chính xác, kể cả sắc thái và thành ngữ cố định. |
| C1 | Rộng và chuẩn. Từ được chọn là từ **đúng**, không phải từ gần đúng nhất; kết hợp từ phần lớn chuẩn. |
| B2 | Vốn rõ rệt. Có mệnh đề phụ, có từ ít gặp, lựa chọn hợp chủ đề. |
| B1 | Đủ cho chủ đề quen thuộc, biết đường vòng khi thiếu từ. Chủ yếu câu đơn và câu ghép. |
| A2 | Từ đời thường và những cách nối đơn giản nhất — and, but, because. |
| A1 | Vài từ và cụm học thuộc; không dựng được gì từ chúng. |

**`organisation` — Bố cục và mạch văn**

| Bậc | Mô tả |
|---|---|
| C2 | Bố cục là một lựa chọn có chủ ý và người đọc không hề thấy nó đang làm việc. |
| C1 | Bố cục phục vụ điều đang nói; liên kết mượt và gần như vô hình. |
| B2 | Hình hài rõ. Mỗi đoạn làm một việc, từ nối để giúp chứ không để trang trí. |
| B1 | Có mở – thân – kết nhận ra được. Có liên kết, đôi khi máy móc. |
| A2 | Các ý nối bằng and / then / but. Người đọc phải tự sắp thứ tự. |
| A1 | Không có thứ tự nào người đọc theo được; không gì liên kết với gì. |

**`register` — Mức trang trọng**

| Bậc | Mô tả |
|---|---|
| C2 | Dùng mức trang trọng có chủ đích, kể cả chuyển giọng trong cùng một bài để đạt hiệu quả. |
| C1 | Kiểm soát và giữ được suốt bài, kể cả cách nói lịch sự và cách nói giảm. |
| B2 | Nhất quán và hợp người nhận; thi thoảng có câu đặt hơi lạc. |
| B1 | Phân biệt được trang trọng và thân mật, phần lớn chọn đúng; bị áp lực thì trượt sang bên kia. |
| A2 | Một giọng duy nhất, thường là thân mật, nói với ai cũng vậy. |
| A1 | Không kiểm soát được mức trang trọng — biết cụm nào dùng cụm đó. |

> **Đây là mô tả của nền tảng này, không phải trích CEFR.** Chúng được viết dựa
> trên bộ mô tả của CEFR và các bậc GSE Pearson công bố, cho đúng những gì người
> chấm nhìn thấy được trong một bài ngắn hoặc một bản ghi — nhưng **không phải
> là trích dẫn** của bên nào, và không được dẫn lại như thể Hội đồng châu Âu
> viết ra.
>
> **Vì sao chia theo chiều chứ không theo từng tiêu chí?** 16 tiêu chí × 6 bậc
> là 96 câu mô tả, và 90 câu trong đó sẽ không bao giờ có ai đọc. Bốn chiều × 6
> bậc = 24 câu, và cả 24 đều kiểm được.

---

## 2b. Quy chuẩn dùng từ và định dạng — cái gì tính là lỗi

Tiêu chí nói **chấm cái gì**, thang nói **cao tới đâu**. Không cái nào nói
"colour" có phải lỗi chính tả không khi trong bài cũng có "color", "I'll" có
được dùng trong email trang trọng không, hay một từ máy nghe nhầm có phải lỗi
của thí sinh không. Bỏ ngỏ thì người chấm quyết lại từ đầu **mỗi lần chạy** —
cùng một loại lỗi với thang không có mốc, chỉ thấp hơn một tầng, và nó rơi nặng
nhất vào `accuracy`, tiêu chí hay kéo trần cả câu xuống nhất qua Luật 1.

Mười điều dưới đây được đưa **nguyên văn** vào lời nhắc cho AI và công bố ở đây,
vì **một luật thí sinh không đọc được là một luật họ không chuẩn bị được**.

| # | Quy chuẩn |
|---|---|
| 1 | Chính tả Mỹ, Anh, Úc và Canada đều đúng — "colour" và "color" đều được chấp nhận — nhưng phải dùng nhất quán MỘT lối trong cả bài. Cái tính là lỗi là việc trộn lẫn, không phải việc chọn lối nào. |
| 2 | Lỡ tay khác với chưa biết. Một từ sai một lần mà chỗ khác viết đúng là lỗi đánh máy: nhắc thôi, không trừ. Một dạng sai ở mọi lần xuất hiện mới là lỗi, vì nó cho thấy người viết đang hiểu như thế. |
| 3 | Dạng rút gọn là bình thường khi nói và trong thư thân mật. Trong email trang trọng, đó là nhận xét về giọng văn, không bao giờ là lỗi ngữ pháp. |
| 4 | Lỗi do ảnh hưởng tiếng mẹ đẻ — thiếu mạo từ, thiếu dấu số nhiều, thì không khớp — chấm đúng như mọi lỗi cùng mức độ khác. Không nới tay cũng không khắt khe hơn vì gốc gác của thí sinh, và không nhắc đến tiếng mẹ đẻ của họ: cái họ cần biết là tiếng Anh của mình. |
| 5 | Một email gồm lời chào, phần thân và lời kết. Thiếu lời chào hay lời kết thuộc về bố cục và giọng văn, không phải ngữ pháp; cách chia đoạn cũng thuộc bố cục. |
| 6 | Mọi quy ước nhất quán về ngày tháng, số và viết hoa đều được chấp nhận. "15/3", "15 March" và "March 15" đều đúng. |
| 7 | Dấu kết câu và viết hoa đầu câu tính vào độ chính xác. Cách dùng dấu phẩy thì không, trừ khi thiếu dấu phẩy làm câu không đọc được. |
| 8 | Câu trả lời ngắn không phải là câu trả lời kém, khi đề cho phép ngắn; và một lựa chọn lạ nhưng đúng thì vẫn đúng. Không trừ điểm vì thí sinh không viết giống ý bạn. |
| 9 | Bài nói đến tay bạn dưới dạng BẢN GHI TỰ ĐỘNG. Không ai nghe bản ghi âm, nên không nhận xét gì về phát âm, ngữ điệu hay độ trôi chảy — và chỗ nào máy rõ ràng nghe nhầm thì chấm theo điều thí sinh hiển nhiên đã nói, không theo chữ máy gõ ra. |
| 10 | Ba thứ được đo bằng số học và áp dụng độc lập với bạn: độ dài bài làm, tỉ lệ chép lại từ đề bài, và ở Part H là lượng từ nhắc lại được. Hãy chấm các tiêu chí theo đúng bản thân chúng và không trừ thêm vì ba thứ đó. |

Điều 10 là điều quan trọng nhất và ít hiển nhiên nhất. Một người chấm được yêu
cầu đánh giá thứ đã được tính sẵn sẽ **trừ hai lần** ở những lần chạy nó để ý và
**một lần** ở những lần không — và sự bất nhất đó nhìn từ ngoài không phân biệt
được với thiên vị.

---

## 3. Tiêu chí từng phần — điểm được chia ra sao

Chỉ phần nào thật sự có nhiều chiều mới có nhiều tiêu chí. Tách một thứ đo được
thành bốn cho ra vẻ đầy đủ thì bốn con số sẽ luôn nhích cùng nhau và không nói
thêm được gì.

**Trong một phần, các tiêu chí có trọng số bằng nhau** (trung bình cộng), rồi
Luật 1 mới kéo xuống. Không có tiêu chí nào "nặng hơn" tiêu chí nào — thứ đóng
vai trò đó là mắt xích yếu nhất.

Ký hiệu chiều: **[nd]** = nội dung (thang 2.1) · **[cx]** `accuracy` · **[vn]**
`range` · **[bc]** `organisation` · **[tt]** `register` — bốn cái sau dùng thang
bậc CEFR (2.2).

| Phần | Ai chấm | Tiêu chí (trọng số bằng nhau) | Luật chặn |
|---|---|---|---|
| **A** — Điền từ | so khớp đáp án | *(không rubric)* | — |
| **B** — Dựng lại đoạn văn | mô hình | `meaning` Giữ được ý **[nd]** · `accuracy` Ngữ pháp và chính tả **[cx]** · `organisation` Sắp xếp và mạch văn **[bc]** | 1, 2, **4** |
| **C** — Đọc hiểu | trắc nghiệm | *(không rubric)* | — |
| **D** — Viết email | mô hình + **nền tảng đếm** | **Theo rubric PTE Core của Pearson, 7 tiêu chí / 15 điểm** — xem §3.1 | 2, **3b**, **4** |
| **E** — Chính tả nghe | so khớp đáp án | *(không rubric)* | — |
| **F** — Chọn câu đáp | trắc nghiệm | *(không rubric)* | — |
| **G** — Nghe hiểu đoạn | mô hình | `correct` Trả lời đúng **[nd]** | 1, 2 |
| **H** — Nhắc lại câu | **so khớp, không dùng mô hình** | `content` Giữ được bao nhiêu **[nd]** · `structure` Giữ được cấu trúc **[cx]** | 1, 2 |
| **I** — Tình huống nói | mô hình | `task` Xử lý tình huống **[nd]** · `range` Vốn ngôn ngữ **[vn]** · `accuracy` Độ chính xác **[cx]** · `register` Mức trang trọng **[tt]** | 1, 2 |
| **J** — Kể lại chuyện | mô hình | `events` Giữ được sự việc **[nd]** · `sequence` Trình tự **[bc]** · `point` Ý chính **[nd]** | 1, 2 |

### 3.1 Rubric đầy đủ — từng tiêu chí, từng mức, cả hai đề

Mỗi tiêu chí dưới đây có mô tả cho **từng mức điểm**, và nói rõ mức đó **có khác
nhau giữa đề Cấp 1 và Cấp 2 hay không**.

> **Quy tắc quyết định cái nào khác:** tiêu chí hỏi *"cái đó có mặt không"* — có
> lời chào không, trả lời đủ ý chưa, mấy lỗi chính tả — thì **giống nhau ở cả
> hai đề**, vì một lời chào vẫn là một lời chào ở mọi trình độ. Tiêu chí hỏi
> *"tiếng Anh giỏi tới đâu"* — ngữ pháp, từ vựng, bố cục, mức trang trọng — thì
> **khác nhau**, vì hai đề đo hai đoạn khác nhau của thang.
>
> **Và hai đề gặp nhau ở B1+:** mức **10 của đề Cấp 1** và mức **0 của đề Cấp
> 2** mô tả *cùng một người*. Đó không phải lỗi — đó là cách rõ nhất để thấy hai
> đề dùng để làm gì. Ai đọc báo cáo đề Cấp 2 thấy "2/10 ngữ pháp" phải hiểu là
> *"dưới mức đề này đo được"*, **không** phải *"không viết nổi một câu"* — nên
> `server/bands.js` báo mức đó là **trần**, không phải bậc.

**Part D — Viết email** *(9 phút, tối thiểu 100 từ)* — **theo rubric của chính Pearson**

Đây là phần duy nhất **không** dùng thang chung ở mục 2. Part D chấm theo
**rubric Write Email của PTE Core** — của chính Pearson — gồm **7 tiêu chí trên
thang 15 điểm. Rubric đó được đưa vào nguyên vẹn, không diễn giải lại.

| Tiêu chí | Điểm PTE | Trọng số | Ai chấm | Ứng với subscore Versant |
|---|---|---|---|---|
| `content` **Nội dung** | 3 | 3 | mô hình | Content |
| `conventions` **Quy cách email** | 2 | 2 | mô hình | Voice and Tone |
| `form` **Hình thức / độ dài** | 2 | 2 | **nền tảng ĐẾM** | Form |
| `organisation` **Sắp xếp / mạch lạc** | 2 | 2 | mô hình | Organization |
| `vocabulary` **Từ vựng** | 2 | 2 | mô hình | Vocabulary |
| `grammar` **Ngữ pháp** | 2 | 2 | mô hình | Grammar |
| `spelling` **Chính tả** | 2 | 2 | mô hình | Grammar |
| | **15** | | | |

**Điểm cuối = tổng có trọng số ÷ 15**, quy về thang 10. `content` nặng gấp rưỡi
các tiêu chí còn lại vì Pearson cho nó 3/15.

#### Mô tả từng mức — Part D

**`content` — Nội dung** *(Content, 3 điểm PTE)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Trả lời đầy đủ, chính xác tất cả các ý được yêu cầu trong đề. |
| **6** | Trả lời được hầu hết các ý. Bỏ sót 1 ý, hoặc 1 ý chưa thật rõ ràng. |
| **2** | Bỏ sót nhiều ý bắt buộc, hoặc nội dung khiến người đọc hiểu lầm. |
| **0** | Lạc đề hoàn toàn. Không có gì thuộc yêu cầu của đề. |

**`conventions` — Quy cách email** *(E-mail conventions, 2 điểm PTE)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Đủ cấu trúc một email: lời chào đầu thư, các đoạn nội dung rõ ràng, lời chúc/hẹn gặp ở cuối và ký tên. Mức trang trọng phù hợp với người nhận. |
| **5** | Thiếu một phần, hoặc mức trang trọng chưa đúng — quá trang trọng với bạn bè, hoặc quá suồng sã với cấp trên. |
| **0** | Không nhận ra được là một email, hoặc không xác định được viết cho ai. |

**`organisation` — Sắp xếp và mạch lạc** *(Organisation, 2 điểm PTE)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 — rubric PTE Core | Đề Cấp 2 — thang theo bậc |
|---|---|---|
| **10** | Các ý có tính liên kết, chuyển dòng hoặc chuyển đoạn hợp lý. Dùng từ nối (However, In addition, Therefore) một cách tự nhiên. | Bố cục phục vụ điều đang nói, và người đọc không hề thấy nó đang làm việc. |
| **5** | Có trình tự cơ bản. Từ nối lặp lại, gượng ép, hoặc thiếu ở một số chỗ. | Hình hài rõ. Mỗi đoạn làm một việc và từ nối dẫn được người đọc đi. |
| **0** | Các câu rời rạc, không có gì nối chúng với nhau. | Có mở – thân – kết, và không hơn. |

**`vocabulary` — Từ vựng** *(Vocabulary, 2 điểm PTE)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 — rubric PTE Core | Đề Cấp 2 — thang theo bậc |
|---|---|---|
| **10** | Dùng từ vựng chính xác, phù hợp ngữ cảnh của bức thư, và chọn đúng sắc thái trang trọng hay thân mật theo yêu cầu của đề. | Vốn đầy đủ, dùng chính xác, kể cả sắc thái và thành ngữ cố định. Từ được chọn là từ đúng, không phải từ gần đúng nhất. |
| **5** | Đủ dùng nhưng đơn điệu, hoặc dùng sai từ ở một hai chỗ. | Vốn rõ rệt: có mệnh đề phụ, có từ ít gặp, lựa chọn hợp chủ đề chứ không phải lựa chọn an toàn nhất. |
| **0** | Nghèo nàn, lặp lại, hoặc sai đủ nhiều để làm mờ nghĩa. | Đủ cho chủ đề quen thuộc và không hơn — lúc nào cũng chọn từ an toàn nhất. |

**`grammar` — Ngữ pháp** *(Grammar, 2 điểm PTE)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 — rubric PTE Core | Đề Cấp 2 — thang theo bậc |
|---|---|---|
| **10** | Cấu trúc, thì và sự hòa hợp chủ vị đúng suốt bài. | Kiểm soát hoàn toàn, kể cả câu dài và câu phức. Sai sót nếu có thì đọc như lỗi gõ phím chứ không phải lỗ hổng. |
| **5** | Có một vài lỗi nhưng người đọc vẫn theo được. | Kiểm soát tốt. Lỗi xuất hiện ở câu phức và hiếm khi làm hiểu sai. |
| **0** | Sai nhiều lỗi ngữ pháp cơ bản đến mức bài viết khó hiểu. | Cấu trúc đơn giản thì chắc, ngoài đó thì không. Đây là sàn của những gì đề này đo được, không phải sàn của trình độ. |

**`spelling` — Chính tả** *(Spelling, 2 điểm PTE)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | 0 – 1 lỗi chính tả. |
| **5** | Đúng 2 lỗi chính tả. |
| **0** | Từ 3 lỗi chính tả trở lên. |

#### Ba thói quen của nền tảng phải nhường chỗ ở Part D

| Luật của nền tảng | Ở Part D | Vì sao |
|---|---|---|
| **Luật 1 — mắt xích yếu nhất** | **KHÔNG áp dụng** | Đó là luật của nền tảng này; scheme của PTE là tổng có trọng số thuần túy. Chồng luật của mình lên rubric của người khác là đổi câu trả lời của họ mà vẫn gọi là rubric của họ. Với 7 tiêu chí nó còn tàn khốc ngoài ý muốn: 3 lỗi chính tả đưa `spelling` về 0, và mắt xích yếu nhất sẽ ghìm cả bức email xuống **0,5/10**. |
| **Luật 3 — cửa độ dài** | **KHÔNG áp dụng** | Độ dài đã là một trong bảy tiêu chí (`form`). Chặn thêm là trừ cùng một thiếu sót hai lần. *Ngoại lệ:* nếu mô hình trả về theo định dạng cũ không có tiêu chí nào, `form` không nằm trong trung bình, và cửa độ dài bật lại. |
| **Luật 2 — không nộp gì thì 0** | **Vẫn áp dụng** | Không viết gì là không viết gì, ở mọi phần. |
| **Luật 4 — chép lại đề** | **Vẫn áp dụng** | Dán đề vào ô trả lời thì chưa viết email nào cả. |

> **Thay đổi này nới điểm ở một chỗ, cần biết rõ:** trước đây một email 60 từ
> câu cú tốt bị chặn ở **4,0**. Theo scheme của Pearson, `form` chỉ đáng 2/15
> nên bài đó nay ra khoảng **8,5**. Đây là kết quả trực tiếp của việc theo cách
> chấm của Pearson thay vì luật cũ của nền tảng. Nếu chủ đầu tư muốn giữ mức
> khắt khe cũ về độ dài thì phải nói rõ, vì nó **trái** với rubric của Pearson.

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



---

### 3.2 Rubric các phần còn lại

### Part B — Dựng lại đoạn văn

*30 giây đọc, đoạn văn biến mất, 90 giây viết lại bằng lời của mình*

**`meaning` — Giữ được ý** *(Meaning kept)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Mọi ý của đoạn văn đều quay lại. Không mất ý nào người đọc sẽ thấy thiếu. |
| **6** | Phần lớn các ý quay lại. Thiếu một ý, hoặc một ý bị nhòe vào ý khác. |
| **2** | Chỉ còn lại vài mảnh của đoạn văn. |
| **0** | Không còn gì của đoạn văn. |

**`accuracy` — Ngữ pháp và chính tả** *(Grammar and spelling)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 (A1 – B1+) | Đề Cấp 2 (B1+ – C2) |
|---|---|---|
| **10** | Cấu trúc đơn giản dùng chắc, nghĩa luôn còn nguyên. Chỗ sai là ở câu dài hơn hoặc thì ít gặp. | Kiểm soát hoàn toàn, kể cả câu dài và câu phức. Sai sót nếu có thì đọc như lỗi gõ phím chứ không phải lỗ hổng. |
| **5** | Có viết được câu đơn, nhưng đuôi từ, mạo từ và số nhiều rơi rụng đủ nhiều để người đọc phải tự vá. | Kiểm soát tốt. Lỗi xuất hiện ở câu phức và hiếm khi làm hiểu sai. |
| **0** | Từ rời và cụm học thuộc. Phần lớn nỗ lực viết thành câu đều đổ. | Cấu trúc đơn giản thì chắc, ngoài đó thì không. Đây là sàn của những gì đề này đo được, không phải sàn của trình độ. |

**`organisation` — Sắp xếp và mạch văn** *(Order and flow)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 (A1 – B1+) | Đề Cấp 2 (B1+ – C2) |
|---|---|---|
| **10** | Có mở – thân – kết mà người đọc theo được, với từ nối để giúp chứ không để trang trí. | Bố cục phục vụ điều đang nói, và người đọc không hề thấy nó đang làm việc. |
| **5** | Các ý nối bằng and / then / but. Người đọc phải tự sắp thứ tự. | Hình hài rõ. Mỗi đoạn làm một việc và từ nối dẫn được người đọc đi. |
| **0** | Không có thứ tự nào người đọc theo được; không gì liên kết với gì. | Có mở – thân – kết, và không hơn. |

### Part G — Nghe hiểu đoạn

*nghe một lần, trả lời miệng bằng một cụm ngắn*

**`correct` — Trả lời đúng** *(Right answer)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Đúng. Một cụm ba từ đúng là điểm tối đa, không bị trừ vì ngắn, vì thiếu động từ, hay vì không thành câu. |
| **5** | Đúng hướng nhưng sai chi tiết — hoặc đúng nhưng mơ hồ tới mức có thể là câu trả lời cho câu hỏi khác. |
| **0** | Sai, hoặc trả lời một câu hỏi không được hỏi. Trả lời sai một cách tự tin vẫn không có điểm. |

### Part H — Nhắc lại câu

*nghe một câu, nói lại — **so khớp từ, không dùng mô hình***

**`content` — Giữ được bao nhiêu** *(How much came back)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Nhắc lại được trọn câu. |
| **5** | Nhắc lại được khoảng một nửa câu. |
| **0** | Gần như không nhắc lại được gì. |

**`structure` — Giữ được cấu trúc** *(Structure kept)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Trật tự từ và ngữ pháp còn nguyên. |
| **5** | Từ thì phần lớn còn nhưng trật tự đã xê dịch. |
| **0** | Không còn cấu trúc nào — các từ không theo trật tự nào khôi phục được. |

### Part I — Tình huống nói

*10 giây nghĩ, tối đa 60 giây nói*

**`task` — Xử lý được tình huống** *(Dealing with the situation)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Mọi việc tình huống đòi hỏi đều thực sự xảy ra — có xin lỗi, có nêu lý do, có đề xuất phương án. |
| **6** | Phần lớn có xảy ra. Thiếu một việc, hoặc chỉ ngụ ý chứ không nói ra. |
| **2** | Gần như chưa xử lý tình huống — được một câu đúng hướng và không hơn. |
| **0** | Bài này hoàn toàn không đáp lại tình huống. |

**`range` — Vốn ngôn ngữ** *(Range of language)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 (A1 – B1+) | Đề Cấp 2 (B1+ – C2) |
|---|---|---|
| **10** | Đủ từ vựng cho chủ đề quen thuộc, biết đường vòng khi thiếu từ. Câu đơn và câu ghép, dùng đúng. | Vốn đầy đủ, dùng chính xác, kể cả sắc thái và thành ngữ cố định. Từ được chọn là từ đúng, không phải từ gần đúng nhất. |
| **5** | Từ đời thường và những cách nối đơn giản nhất — and, but, because. | Vốn rõ rệt: có mệnh đề phụ, có từ ít gặp, lựa chọn hợp chủ đề chứ không phải lựa chọn an toàn nhất. |
| **0** | Vài từ và cụm học thuộc; không dựng được gì từ chúng. | Đủ cho chủ đề quen thuộc và không hơn — lúc nào cũng chọn từ an toàn nhất. |

**`accuracy` — Độ chính xác** *(Accuracy)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 (A1 – B1+) | Đề Cấp 2 (B1+ – C2) |
|---|---|---|
| **10** | Cấu trúc đơn giản dùng chắc, nghĩa luôn còn nguyên. Chỗ sai là ở câu dài hơn hoặc thì ít gặp. | Kiểm soát hoàn toàn, kể cả câu dài và câu phức. Sai sót nếu có thì đọc như lỗi gõ phím chứ không phải lỗ hổng. |
| **5** | Có viết được câu đơn, nhưng đuôi từ, mạo từ và số nhiều rơi rụng đủ nhiều để người đọc phải tự vá. | Kiểm soát tốt. Lỗi xuất hiện ở câu phức và hiếm khi làm hiểu sai. |
| **0** | Từ rời và cụm học thuộc. Phần lớn nỗ lực viết thành câu đều đổ. | Cấu trúc đơn giản thì chắc, ngoài đó thì không. Đây là sàn của những gì đề này đo được, không phải sàn của trình độ. |

**`register` — Mức trang trọng** *(Register)* · **khác nhau theo đề**

| Điểm | Đề Cấp 1 (A1 – B1+) | Đề Cấp 2 (B1+ – C2) |
|---|---|---|
| **10** | Phân biệt được trang trọng và thân mật, chọn đúng cho người nhận và giữ được gần hết bài. | Mức trang trọng được kiểm soát và giữ suốt bài, kể cả cách nói lịch sự và nói giảm; chuyển giọng trong bài là có chủ ý. |
| **5** | Một giọng duy nhất cho cả bài, nói với ai cũng vậy. | Nhất quán và hợp người nhận; thi thoảng có câu đặt hơi lạc. |
| **0** | Không kiểm soát được mức trang trọng — biết cụm nào dùng cụm đó. | Chọn đúng mức trang trọng nhưng không giữ được khi bí. |

### Part J — Kể lại chuyện

*nghe một lần, 30 giây kể lại*

**`events` — Giữ được sự việc** *(Events kept)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Mọi sự việc trong câu chuyện đều được kể lại. |
| **6** | Phần lớn sự việc được kể lại; mất một hai việc. |
| **2** | Chỉ còn vài mảnh của câu chuyện, không hơn. |
| **0** | Không còn gì của câu chuyện. |

**`sequence` — Trình tự** *(Order of events)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Các sự việc đến đúng theo trình tự đã xảy ra. |
| **5** | Phần lớn đúng trình tự, có một sự việc bị đặt sai chỗ. |
| **0** | Không có trình tự nào để người nghe dựng lại câu chuyện. |

**`point` — Ý chính** *(The point of it)* · giống nhau ở cả hai đề

| Điểm | Mô tả |
|---|---|
| **10** | Ý của câu chuyện toát ra được, không chỉ là các mảnh rời của nó. |
| **5** | Các mảnh thì có, nhưng người nghe phải tự rút ra ý. |
| **0** | Ý chính hoàn toàn không toát ra được. |

---

## 4. Năm luật chặn, theo đúng thứ tự chạy

### Luật 1 — Mắt xích yếu nhất *(trần)* — **không áp cho Part D**

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

### Luật 3 — Cửa độ dài *(trần)* — **không còn áp cho Part D**

Trên Part D, độ dài nay là **một trong bảy tiêu chí** (`form`, do nền tảng đếm),
nên cửa này **không** chạy nữa ở đó — chặn thêm là trừ cùng một thiếu sót hai
lần. Xem §3.1.

Cửa vẫn còn nguyên và vẫn chạy cho **bất kỳ phần nào khai báo ngưỡng số từ mà
không tính độ dài thành tiêu chí riêng**. Part B **không có** ngưỡng công bố nào
— đoạn văn mỗi bài một khác — nên không đặt ra một con số do ai đó đoán.

```
n = số từ.  floor = ngưỡng của phần đó
n >= floor              →  không chặn
0,6·floor <= n < floor  →  trần = 4 + 6 × (n − 0,6·floor) / (0,4·floor)
n < 0,6·floor           →  trần = 4
```

**Trước đây đây là một bậc thang và có một lỗ 40 từ**: cửa chỉ sập dưới 60 từ và
không có gì áp từ 60 đến 99, nên đo được một email 60 từ câu cú tốt ra **9/10**
trên yêu cầu 100 từ. Nay trần chạy liên tục từ 4,0 ở 60% lên không-trần ở ngưỡng,
nên không có từ nào đáng quá nửa điểm.

**Một ngoại lệ có chủ ý:** nếu mô hình trả lời theo định dạng cũ *không có tiêu
chí nào*, thì `form` không nằm trong trung bình, và cửa này **bật lại** cho câu
đó. Thiếu nó thì một email 20 từ có điểm tổng 8 của mô hình sẽ ra **0** — chấm
hoàn toàn theo số từ và vứt bỏ đánh giá của mô hình.

Độ dài là **cửa, không phải tiêu chí** (ở những phần còn dùng cửa): nó đo được,
nên áp cả khi chưa có ai chấm, và mô hình chấm được dặn **không trừ thêm lần
nữa** vì nó đã bị trừ ở đây.

### Luật 3b — Lạc đề thì cả bài 0 điểm *(sàn — dừng tại đây)* — chỉ Part D

**Luật của chính Pearson**, và là cái *duy nhất* trong scheme của họ đưa cả bài
về 0: `content` = 0 → toàn bộ email = 0, dù các tiêu chí khác tốt đến đâu.

Đáng chú ý là **độ dài không nằm trong đó**. Email viết về chuyện khác thì chưa
được viết, dù viết hay; email ngắn thì đã được viết, chỉ là ngắn.

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

Bài đã chấm dưới phiên bản cũ **giữ nguyên**. Luật 4 (chép lại đề) không hồi tố từ `-2`; và bài Part D chấm dưới `-3` có bốn tiêu chí tên khác, **không so sánh được theo từng tiêu chí** với bài chấm dưới `-4`. Phiên bản ghi trên mỗi dòng điểm là cách duy nhất để biết bài đó được chấm theo luật nào.

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
