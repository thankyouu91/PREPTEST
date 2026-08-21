# Kế hoạch xây phần ôn tập, và cái nền đỡ nó

Tài liệu này trả lời bốn câu hỏi chủ đầu tư đặt ra ngày 2026-08-21:

1. Phần ôn tập thiết kế lại thế nào để **đồng bộ** từ tiến độ → luyện → từ vựng
   → viết → nói, với một rubric **sát và khắt khe**?
2. Quy trình xây có **giám sát, QC & QA**, xong block nào **khóa** block đó — cụ
   thể là gì, ai kiểm, khóa bằng cách nào?
3. **1000 người học cùng lúc** — bài toán xử lý và giãn nở ra sao?
4. Nền tảng dễ bị **hack, DDoS, lỗi** — tiêu chí chất lượng và **phương án backup**?

Thứ tự dưới đây là thứ tự đọc, không phải thứ tự làm. Thứ tự làm ở mục 2.

---

## 0. Đo trước, hứa sau

Câu hỏi "1000 người cùng lúc" không đọc mã mà trả lời được. Nên trước khi viết
một dòng kế hoạch nào, đã dựng `scripts/loadprobe.mjs` và bắn traffic thật vào
server thật. Đây là số đo, không phải ước lượng.

**Máy đo:** 4 nhân, 16 GB RAM, đĩa cục bộ. Một tiến trình Node, một handle
SQLite đồng bộ — đúng cấu hình đang chạy trên production.

| Đường | Trần thông lượng | p95 @25 luồng | p99 @200 luồng |
|---|---|---|---|
| `/healthz` (1 SELECT có index) | ~3.950 req/s | 13 ms | 106 ms |
| `tailwind-built.css` (tệp tĩnh) | ~1.915 req/s | 21 ms | 591 ms |
| `/prep/hoc/…` (302, chưa đăng nhập) | ~4.700 req/s | 12 ms | 122 ms |
| `/api/catalog` (đọc lúc vào trang) | ~1.150 req/s | 39 ms | **4.092 ms** |

Ghi:

- **Thông lượng phẳng từ 25 luồng trở lên, còn độ trễ thì tăng tuyến tính.**
  Đó là chữ ký của bão hoà một luồng: thêm người vào không làm server làm được
  nhiều hơn, chỉ làm hàng đợi dài ra. `/api/catalog` chạm trần ~1.150 req/s ở
  25 luồng và giữ nguyên con số đó tới 200 luồng.
- **Đuôi p99 mới là chỗ gãy, không phải trung bình.** Ở 200 luồng, 1% số request
  của `/api/catalog` mất **hơn 4 giây**. Trung bình lúc đó vẫn đẹp. `node:sqlite`
  chạy **đồng bộ**: mỗi truy vấn chặn event loop suốt thời gian nó chạy, nên một
  truy vấn chậm không xếp hàng sau chính nó — nó xếp hàng sau **mọi** request
  đang bay. Đây đúng là hình dạng "ổn với 20 người, sập với 200".
- **3 trong 4 nhân đang ngồi không.** Một tiến trình fork, không cluster.

**Ghi:** ổ đĩa của máy đo nhanh hơn EBS gp3 trên production. Riêng cột ghi phải
đo lại trên chính máy production trước khi tin.

Còn ghi (đo thẳng vào tầng lưu trữ, vì đó mới là trần thật):

| Chế độ | Một ghi tự-commit | Trong một transaction |
|---|---|---|
| `synchronous = FULL` (mặc định hiện nay) | 0,246 ms → **~4.060 /s** | ~413.000 /s |
| `synchronous = NORMAL` (an toàn trong WAL) | 0,026 ms → **~37.990 /s** | ~504.795 /s |

### Vậy 1000 người cùng lúc có chạy được không?

Phải tách hai nghĩa của chữ "cùng lúc".

**1000 người đang mở trang** — mỗi người bấm vài giây một lần, tức ~0,2–0,3
request/giây/người → **200–300 req/s**. Con số này **nằm gọn trong sức máy hiện
tại** (trần 1.150 req/s ở đường nặng nhất). Autosave khi làm bài, 5 giây một
lần cho 1000 người = 200 ghi/s, so với trần ~4.000/s: cũng vừa.

**1000 người vào cùng một phút** — lớp học 9 giờ sáng, tất cả bấm đăng nhập
trong 30 giây. Mỗi lần tải trang là 5–10 request (HTML, CSS, JS, ảnh, catalog)
→ đỉnh **2.000–5.000 req/s trong nửa phút**. Chỗ này **không vừa**, và cái hỏng
trước không phải "server báo lỗi" mà là đuôi p99 kéo lên vài giây, người dùng bấm
lại, request nhân đôi, và một server chậm biến thành một server chết.

> **Kết luận thẳng:** trần hôm nay là khoảng **200–300 người học đồng thời**
> chạy êm, và một đỉnh vào lớp cỡ **150–200 người** là chịu được. Muốn 1000
> người thì phải đi hết bậc 1 và bậc 2 ở mục 4 — và cả hai đều rẻ hơn nhiều so
> với những gì tưởng.

### Nhưng rủi ro lớn nhất không phải thông lượng

Xếp theo mức thiệt hại, không theo mức ồn ào:

1. **Mất dữ liệu.** Cơ sở dữ liệu là **một tệp, trên một máy, không có bản sao
   lưu nào**. Ổ hỏng, xoá nhầm, hoặc một lần deploy sai đường dẫn là mất sạch
   tài khoản, code đã bán và toàn bộ bài làm. Không có nút hoàn tác. Đây là việc
   **phải làm trước mọi việc khác trong tài liệu này**.
2. **Một điểm chết duy nhất.** Một EC2. Máy đó khởi động lại thì nền tảng offline.
3. **Đuôi p99.** Đã đo, đã biết, sửa được ở bậc 1–2.
4. **Thông lượng.** Vấn đề nhỏ nhất trong bốn cái.

---

## 1. Quy trình xây: block, cổng QC/QA, khóa block

### 1.1 Một block là gì

Một block là một **lát cắt dọc chạy được**: có lược đồ dữ liệu, có API, có giao
diện, có bộ test riêng. Không phải "làm xong tầng database" rồi mới "làm tầng
API" — cắt ngang như thế thì đến cuối mới biết cái gì sai, và lúc đó không lần
ra được sai ở đâu.

Một block có đúng bốn thứ, thiếu một là chưa xong:

| | |
|---|---|
| **Đầu vào** | Block nào phải khóa trước nó |
| **Sản phẩm** | Danh sách tệp, và một câu tả người dùng làm được gì thêm |
| **Bộ kiểm** | Một `scripts/test-*.mjs` riêng, cắm vào `scripts/verify.sh` |
| **Điều kiện khóa** | Bảng 1.2 dưới đây, đủ cả 6 dòng |

### 1.2 Sáu điều kiện khóa

Khóa không phải là "tôi thấy nó chạy". Khóa là sáu dòng này, và **cả sáu phải
kiểm được bằng lệnh** — điều kiện nào chỉ kiểm bằng mắt thì lần sau sẽ bỏ qua.

| # | Điều kiện | Kiểm bằng |
|---|---|---|
| 1 | Toàn bộ cổng xanh | `npm run verify` → EXIT 0 |
| 2 | Block có bộ test riêng, và bộ test đó **đã từng bị nhìn thấy đỏ** | Bỏ lỗi trở lại → đỏ; sửa lại → xanh. Ghi vào commit message |
| 3 | Hiệu năng không tụt | `node scripts/loadprobe.mjs`, không route nào tệ hơn lần đo trước quá 15% |
| 4 | Ảnh chụp mới cho mọi màn block đụng tới | `npm run verify` bước screenshot |
| 5 | Không thêm dependency runtime | `node -e "…dependencies"` vẫn chỉ có `express` |
| 6 | Đã ghi vào `docs/BLOCKS.md`: khóa ngày nào, commit nào, ai kiểm | Bảng trong tệp đó |

**Điều kiện 2 là điều kiện quan trọng nhất và cũng là điều kiện dễ bỏ nhất.**
Một bộ test chưa ai nhìn thấy đỏ là một bộ test chưa ai kiểm. Repo này đã có
thói quen đó (xem `docs/ROADMAP.md`, mục "Một CSDL mới ship 16 code không mở
được gì" — bug được đặt lại vào để xem test có đỏ không). Quy trình này chỉ viết
nó thành luật.

### 1.3 Khóa rồi thì sao

Sau khi khóa, **tệp của block đó không sửa trong block sau**. Cần sửa thì:

1. Ghi vào `docs/BLOCKS.md` một dòng "mở lại block N vì …",
2. Chạy lại đủ 6 điều kiện cho block N,
3. Rồi mới đi tiếp.

Không phải để làm khó. Là vì cách hỏng phổ biến nhất của một nền tảng nhiều
tầng là block 7 lặng lẽ sửa một hàm của block 2, không ai chạy lại test của
block 2, và ba tuần sau mới phát hiện — lúc đó có 40 commit nằm giữa.

### 1.4 Ai giám sát

- **Cổng tự động** (`npm run verify` + `.github/workflows/verify.yml`) là người
  gác thường trực. Không xanh thì không push.
- **Phiên Routine hàng giờ** lấy đúng một mục chưa tick ở đầu hàng đợi, làm,
  chạy cổng, tick, push. Đây là người xây.
- **Chủ đầu tư** duyệt ở hai chỗ, và chỉ hai chỗ: (a) khi một block đề nghị khóa,
  (b) khi một quyết định đụng vào blueprint, bảng band, hay hợp đồng lược đồ.
  Mọi thứ khác không cần chờ.

---

## 2. Thứ tự block

Đây là hàng đợi thật. Đã chèn lên đầu `docs/ROADMAP.md` mục "Nền tảng & engine"
để phiên Routine lấy đúng thứ tự này.

### Block 0 — Đừng mất dữ liệu (chặn mọi thứ khác)

Không có gì trong tài liệu này đáng làm nếu một ổ đĩa hỏng xoá sạch được tất cả.

- `deploy/backup.sh`: `VACUUM INTO` một bản sao nhất quán (an toàn khi đang chạy,
  khác hẳn `cp`), nén, đẩy lên S3 với versioning + object-lock, giữ 30 ngày.
- Cron 6 giờ một lần, cộng một bản trước **mỗi** lần deploy.
- `deploy/restore.sh`, **và một lần phục hồi thật đã chạy được** — một bản sao
  lưu chưa từng phục hồi thử là một tệp, không phải một bản sao lưu.
- Cảnh báo khi bản sao lưu gần nhất quá 12 giờ.

**Khóa khi:** phục hồi được một bản sao lưu vào máy trắng và server lên xanh từ nó.

### Block 1 — Nới trần rẻ tiền (nửa ngày, không đổi kiến trúc)

- `PRAGMA synchronous = NORMAL` (an toàn trong WAL: chỉ mất giao dịch cuối khi
  **mất điện cả máy**, không mất khi tiến trình chết) → đo được **9× ghi**.
- `PRAGMA busy_timeout = 5000` — bắt buộc phải có trước khi chạy nhiều tiến trình.
- `Cache-Control` dài + `ETag` cho tài nguyên tĩnh có vân tay nội dung; nén.
- Đo lại bằng `loadprobe`, ghi số vào `docs/BLOCKS.md`.

**Khóa khi:** loadprobe cho thấy trần đọc lên ≥1,5× và không route nào tụt.

### Block 2 — Mô hình năng lực (trái tim của phần ôn tập)

Chi tiết ở mục 3.1. Đây là block mà cả bốn yêu cầu về "đồng bộ" quy về.

**Khóa khi:** bảng tiến độ đọc từ mô hình năng lực, không còn đếm số bài có sẵn.

### Block 3 — Rubric và đánh giá sau bài thi

Mục 3.2. Nối vào block 2: điểm rubric ghi vào cùng một dòng sự kiện.

### Block 4 — Luyện theo từng Part, đề random

Mục 3.3.

### Block 5 — Từ vựng B1–C2 qua viết câu và áp dụng từ

Mục 3.4.

### Block 6 — Lộ trình ôn tập sinh tự động

Mục 3.5. Chỉ làm được sau khi 2–5 đã khóa, vì nó đọc dữ liệu của cả bốn.

### Block 7 — Nhiều tiến trình

Bậc 2 ở mục 4. Sau block 1 vì `busy_timeout` là điều kiện cần.

### Block 8 — Chống lạm dụng và DDoS

Mục 5.

---

## 3. Thiết kế phần ôn tập

### 3.1 Một mô hình năng lực: nhiều nơi ghi, nhiều nơi đọc

Đây là câu trả lời cho "phải đồng bộ giữa update tiến độ → luyện → từ vựng →
viết → nói".

Cách sai — và là cách mặc định nếu không quyết trước — là mỗi tính năng tự giữ
điểm của mình: bài thi có `attempt_scores`, phần luyện có bảng riêng, từ vựng có
SRS riêng, viết có rubric riêng. Sáu con số cho cùng một người, không con nào
đồng ý với con nào, và bảng tiến độ phải chọn tin cái nào.

Cách đúng: **một bảng sự kiện, một bộ ước lượng.**

```sql
CREATE TABLE skill_events (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source   TEXT NOT NULL,   -- exam | drill | vocab | writing | speaking
  ref_id   TEXT,            -- attempt id, drill id… để truy ngược
  skill    TEXT NOT NULL,   -- listening reading writing speaking grammar vocabulary
  part     TEXT,            -- 'A'..'J', NULL nếu không thuộc phần nào
  topic    TEXT,            -- slug điểm ngữ pháp / nhóm từ vựng
  level    TEXT,            -- B1 | B2 | C1 | C2
  earned   REAL NOT NULL,
  max      REAL NOT NULL,
  weight   REAL NOT NULL DEFAULT 1,
  at       TEXT NOT NULL
);
CREATE INDEX idx_se_user ON skill_events (user_id, skill, at DESC);
CREATE INDEX idx_se_part ON skill_events (user_id, part, at DESC);
```

Mọi thứ được chấm ở bất kỳ đâu đều ghi vào đây: một câu trắc nghiệm trong bài
thi, một ô điền từ khi luyện, một câu tự viết, một lượt nói. `weight` để câu
trong bài thi thật nặng hơn câu luyện — làm đúng khi có đồng hồ chạy khác với
làm đúng lúc thảnh thơi.

**Bộ ước lượng** (`server/ability.js`), Beta–Binomial có suy giảm theo thời gian:

```
w(t)  = 0.5 ^ (số ngày đã qua / 30)      -- nửa đời 30 ngày
A     = 2 + Σ w · earned                 -- prior 2/2: chưa biết gì thì kéo về 50%
B     = 2 + Σ w · (max − earned)
p̂     = A / (A + B)                      -- năng lực ước lượng, 0..1
sd    = sqrt( A·B / ((A+B)² · (A+B+1)) ) -- độ bất định
```

Ba tính chất, mỗi cái giải một vấn đề thật:

- **Suy giảm 30 ngày** — một người giỏi Part C hồi tháng 3 rồi bỏ ba tháng thì
  không còn giỏi Part C. Bảng tiến độ nói thật chứ không nói lịch sử.
- **Prior 2/2** — làm đúng 3/3 câu **không** thành 100%. Nó thành 5/6 ≈ 71%, kèm
  `sd` lớn. Đây chính là chỗ "khắt khe" bắt đầu.
- **`sd` là hạn ngạch nói.** Khi `sd > 0,06` (khoảng dưới 60 câu có trọng số),
  giao diện **không hiện band**. Nó hiện: *"Chưa đủ dữ liệu để xếp bậc — cần
  thêm khoảng N câu ở phần này."* Một nền tảng luyện thi mà xếp bậc C1 cho người
  làm 5 câu là một nền tảng nói dối, và người học sẽ phát hiện ra vào đúng ngày
  thi thật.

Quy p̂ sang thang VPET dùng đúng bộ quy đổi `linear` đã có trong
`docs/SCORING.md` §2.2 tầng 3. Không đẻ thang mới.

**Ai đọc mô hình này:** bảng tiến độ, màn kết quả, bộ sinh lộ trình, bộ rút đề
luyện, và màn xếp bậc. Năm nơi đọc, một nguồn sự thật. Đó là toàn bộ nghĩa của
chữ "đồng bộ" trong yêu cầu.

### 3.2 Rubric: sát và khắt khe

Mở rộng `docs/SCORING.md` §2.3, không thay thế.

**Ba tầng, mỗi tầng nói rõ nó là gì:**

| Tầng | Chấm cái gì | Trả về |
|---|---|---|
| 1 — đo được | Số từ, độ đa dạng từ vựng, độ dài câu, mật độ từ nối, chính tả, tỉ lệ từ ngoài bậc CEFR đang luyện | **Chẩn đoán, không phải điểm.** Nói thẳng ra như thế |
| 2 — rubric người | Giáo viên chấm đúng 4 tiêu chí của kỳ thi | Nguồn sự thật để hiệu chỉnh tầng 3 |
| 3 — máy chấm | Dịch vụ ngoài, hợp đồng `{ criteria, feedback }` cố định | Điểm từng tiêu chí + nhận xét |

**Bốn quy tắc làm nó khắt khe** — và khắt khe ở đây nghĩa là *đúng*, không phải
*cho điểm thấp*:

1. **Trần theo tiêu chí thấp nhất, không phải trung bình.** Bài viết dùng từ vựng
   C1 nhưng ngữ pháp B1 thì không phải bài B2. Điểm chung ≤ tiêu chí thấp nhất
   + 0,5. Đây là cách giám khảo thật chấm, và là chỗ các nền tảng luyện thi
   thường rộng tay nhất.
2. **Không cho điểm cái không đọc được.** Bài dưới 60% số từ yêu cầu bị chặn
   trần ở 4,0 và nói rõ vì sao, giống hệt bài thi thật.
3. **Mỗi điểm phải chỉ được vào bằng chứng.** Rubric trả về đoạn văn bản cụ thể
   cho mỗi nhận xét. Một điểm 5,5 không kèm chỗ nào trong bài giải thích cho nó
   là một điểm học viên không học được gì.
4. **Rubric có phiên bản.** `rubric_version` lưu cùng mỗi lần chấm. Đổi tiêu chí
   mà điểm cũ đổi theo là xoá lịch sử tiến bộ của người học.

Nói với người học bằng **band kèm khoảng**, không phải một con số: *"B1+ (5,0–5,5)
— chắc chắn ở mức trung bình"*. Trung thực với `sd`, và có ích hơn một con số giả
vờ chính xác.

### 3.3 Luyện theo từng Part, đề random

Yêu cầu: mỗi Part luyện riêng, mỗi lần một đề khác.

Bộ máy đã có. `plannedPaper()` trong `server/db.js` rút đề không lặp câu và từ
2026-08-20 rút **nguyên cụm** cho những phần có bài đọc/bài nghe dùng chung
(Part C, Part G). Việc còn lại là mở nó ra cho một Part đơn lẻ:

- `POST /api/drills` với `{ part: 'C', level: 'B2', size: 6 }` → rút một đề nhỏ
  từ đúng ngân hàng ấy, ở đúng bậc ấy.
- **Không lặp trong 30 ngày**: bộ rút loại những câu người này đã gặp gần đây,
  nới ra dần nếu ngân hàng cạn. Chỗ này cần ngân hàng đủ sâu — hiện E/F/H/J còn
  chưa đạt gấp đôi blueprint, và đó là điều kiện tiên quyết cho block 4.
- Chấm xong ghi thẳng `skill_events` với `source='drill'`, `weight=0,6`.
- Đồng hồ **theo từng câu**, đúng như VPET thật (xem `docs/VPET-OFFICIAL-SPEC.md`)
  — luyện với đồng hồ khác thi mà không có đồng hồ là luyện sai việc.

### 3.4 Từ vựng B1–C2 qua viết câu và áp dụng từ

Yêu cầu nói rõ: **không** phải chọn A/B/C/D. Hai dạng bài, cả hai đều là dùng
từ chứ không phải nhận ra từ:

**Dạng 1 — `gap-apply` (áp dụng từ, máy chấm chính xác).** Cho một câu có chỗ
trống và từ ở dạng gốc; người học phải chia đúng dạng và đặt đúng chỗ.

> The committee ______ (consider) the proposal since March.
> → *has been considering*

Máy chấm được tuyệt đối vì đáp án là một tập dạng đúng hữu hạn. Ghi hai sự kiện:
`skill='vocabulary'` và `skill='grammar'` với `topic` là điểm ngữ pháp liên quan
— một câu dạy hai thứ thì phải ghi điểm cho cả hai, nếu không lộ trình sẽ mù một
nửa.

**Dạng 2 — `sentence-build` (viết câu, tầng 1 + tầng 3).** Cho một từ và một
nghĩa bắt buộc; người học tự viết một câu dùng đúng nghĩa ấy.

> Viết một câu dùng **substantial** với nghĩa "lớn về số lượng" (không phải
> "chắc chắn về cấu trúc").

Tầng 1 kiểm được ngay và miễn phí: từ có xuất hiện không, đúng từ loại không,
câu có đủ chủ–vị không, có phải chép lại ví dụ mẫu không. Tầng 3 chấm nghĩa và
độ tự nhiên. Đây chính là "luyện trong viết câu + áp dụng từ".

**Phân bậc B1–C2** lấy theo danh sách tần suất đã có trong hàng đợi ROADMAP
(NGSL → A1–B1, NAWL + TSL → B2–C1). Bộ rút chọn từ ở **bậc kế tiếp** của người
học, không phải bậc hiện tại: luyện lại cái đã biết thì `p̂` không nhúc nhích,
và người học cảm thấy đang giậm chân — vì đúng là đang giậm chân.

### 3.5 Mẹo làm nhanh, và lộ trình

**Mẹo** là dữ liệu, không phải chữ cứng trong HTML — để sửa được từ trang quản
trị mà không phải deploy. Mỗi Part và mỗi dạng câu có một danh sách mẹo ngắn,
hiện ra **sau khi** người học làm sai câu thuộc dạng đó, không phải trước:

> **Part B, dạng điền từ:** đọc từ **ngay trước** chỗ trống trước đã. Trong ngân
> hàng VPET, từ loại của chỗ trống bị quyết định bởi từ liền trước ở phần lớn
> câu — mạo từ → danh từ, trợ động từ → phân từ, giới từ → V-ing. Xác định từ
> loại trước rồi mới nghĩ đến nghĩa: nó cắt bốn lựa chọn xuống còn một hoặc hai.

Mẹo hiện đúng lúc vừa làm sai thì được đọc; mẹo hiện trước khi làm thì bị bỏ qua.

**Lộ trình ôn tập** sinh từ mô hình năng lực, không phải từ danh mục bài có sẵn:

```
ưu tiên(kỹ năng, phần) = (mục tiêu − p̂) × trọng số phần trong blueprint × (1 + sd)
```

Ba thừa số, ba lý do: *(mục tiêu − p̂)* là còn thiếu bao nhiêu; *trọng số phần*
là phần đó nặng bao nhiêu điểm trong đề thật — kém Part A và kém Part J không
đáng lo như nhau; *(1 + sd)* đẩy những phần **chưa đủ dữ liệu** lên trên, vì
việc đầu tiên cần làm với một chỗ chưa biết là đi đo nó.

Lấy 3 mục cao nhất làm "việc tuần này". Ba chứ không phải mười — một lộ trình
mười mục là một danh sách người ta đóng lại.

---

## 4. Giãn nở: bốn bậc

Mỗi bậc là một block riêng, khóa xong mới sang bậc sau, và **mỗi bậc đo lại
bằng `loadprobe`** để biết nó có thật sự nới được trần không.

| Bậc | Làm gì | Trần ước tính | Giá phải trả |
|---|---|---|---|
| **0** — hôm nay | 1 tiến trình, 1 máy | ~200–300 người đồng thời | — |
| **1** — nửa ngày | `synchronous=NORMAL`, `busy_timeout`, cache tĩnh + ETag, nén | ~400–600 | Mất giao dịch cuối khi **mất điện cả máy** |
| **2** — 2–3 ngày | `cluster` N tiến trình trên cùng máy, WAL nhiều reader | ~1.000–1.500 | Chỉ một writer; writer bị chặn thì **chặn cả event loop** của worker đó |
| **3** — 1–2 tuần | Postgres (RDS), viết lại tầng `q.all/get/run/val` thành client bất đồng bộ có pool | ~5.000+, và **mở đường ra nhiều máy** | Việc lớn, xâm lấn. Làm một lượt riêng, không làm rải rác |
| **4** | Nhiều máy sau ALB, tự co giãn | theo tiền | Vận hành phức tạp hơn hẳn |

Ba ghi chú thật thà về bậc 2 và 3:

- **Bậc 2 đã được dọn đường sẵn.** `throttle_locks` và `throttle_hits` đã chuyển
  từ bộ nhớ tiến trình xuống CSDL đúng vì lý do này (`docs/ROADMAP.md`) — nếu
  không, chạy 4 tiến trình sẽ biến "khóa sau 5 lần sai" thành "5 lần sai **mỗi
  tiến trình**", tức là âm thầm gỡ bỏ chống dò mật khẩu đúng lúc đông người nhất.
  Phiên đăng nhập cũng đã nằm trong CSDL. Việc còn lại chủ yếu là `busy_timeout`
  và một lần rà những chỗ còn giữ trạng thái trong RAM.
- **Bậc 2 có một cái bẫy phải nói ra.** `node:sqlite` đồng bộ, nên một worker
  chờ khóa ghi sẽ **chặn toàn bộ event loop của nó** suốt thời gian chờ, chứ
  không nhường cho request khác. Nghĩa là `busy_timeout` phải để ngắn (5s là
  trần chịu đựng, không phải mục tiêu), và ghi phải gom vào transaction ngắn.
  Nếu tranh chấp ghi đo được là đáng kể ở bậc 2 thì đó là tín hiệu đi thẳng bậc 3.
- **Bậc 3 đã làm sẵn một nửa.** `server/schema.js` dịch DDL sang Postgres và
  `scripts/test-pg-schema.mjs` kiểm nó trên một server thật. Nửa còn lại — viết
  lại tầng truy vấn thành bất đồng bộ và `await` ở vài trăm chỗ gọi — mới là
  phần nặng, và **chưa có driver `pg` trong dependency**. Đừng nhầm "lược đồ đã
  port được" với "ứng dụng chạy được trên Postgres".

**Chuẩn để quyết đi bậc tiếp:** p95 của `/api/catalog` vượt 250 ms ở tải giờ cao
điểm thật, hoặc p99 vượt 1 giây. Không phải "cảm thấy chậm", và cũng không phải
"phòng xa".

---

## 5. An toàn, DDoS, và phương án backup

### 5.1 Cái đã có (đừng làm lại)

Rà soát 2026-08-12 đã bịt hai lỗ và dựng khá nhiều nền, ghi đủ trong
`docs/SECURITY.md`. Tóm tắt để không ai audit lại: một dependency runtime và
không có advisory nào; mã nguồn server, `.git`, `package.json`, `data/*.sqlite`
đều 404 qua HTTP; không source map, không secret trong `public/`; CSP nghiêm với
nonce mỗi request, không script ngoài; `TRUST_PROXY` số nguyên nên `X-Forwarded-For`
không giả được; scrypt; CSRF trên mọi route ghi; khóa đăng nhập theo IP × tên
tài khoản nằm trong CSDL; 2FA TOTP cho quản trị; upload nhận dạng theo byte.

`scripts/test-security.mjs` đọc thẳng stack Express và đỏ nếu một route ghi lọt
ra ngoài guard — nên một endpoint mới quên guard bị bắt ngay ở cổng, không đợi
lần rà sau.

### 5.2 Cái còn thiếu (block 8)

| Mối đe doạ | Hiện trạng | Việc |
|---|---|---|
| **DDoS tầng mạng** | Không có gì | CloudFront/WAF trước ALB — chặn ở biên, đừng chặn bằng Node |
| **Flood tầng ứng dụng** | Có giới hạn ghi, đọc thì không | Giới hạn theo token bucket cho `/api/*` theo IP + tài khoản; đường đọc nặng có hàng đợi riêng |
| **Bùng chi phí AI** | Hàng đợi chấm chạy tuần tự, không có trần | Trần chi/ngày, trần chi/tài khoản, ngắt cầu dao khi vượt |
| **Vét dữ liệu** | Không có gì | Trần số lần xem đề/giờ cho mỗi tài khoản |
| **Sập một máy** | Không có gì | Bậc 4 ở mục 4 |
| **Mất dữ liệu** | **Không có gì** | **Block 0 — làm đầu tiên** |

### 5.3 Phương án backup, nói cho hết

Bốn tầng, mỗi tầng đỡ một kiểu hỏng khác nhau:

1. **Bản sao lưu 6 giờ/lần** (block 0) — đỡ hỏng ổ, xoá nhầm, deploy sai.
   `VACUUM INTO` chứ không `cp`: chép một tệp SQLite đang được ghi thì được một
   tệp hỏng, và người ta chỉ biết điều đó vào đúng hôm cần phục hồi.
2. **Bản sao trước mỗi lần deploy** — đỡ migration sai. Đây là kiểu hỏng hay xảy
   ra nhất và cũng là kiểu duy nhất biết trước được thời điểm.
3. **Bản trên S3 có versioning + object-lock** — đỡ kẻ xâm nhập xoá cả bản sao
   lưu. Bản sao lưu mà tài khoản bị chiếm quyền xoá được thì không tính là bản
   sao lưu.
4. **Một lần phục hồi thật đã chạy, có ghi lại ngày** — đỡ cái tưởng-là-có.

Cộng thêm hai thứ nhỏ mà cứu được nhiều giờ: giữ **`data/*.sqlite-wal`** cùng
bản sao lưu, và **cảnh báo khi bản gần nhất quá 12 giờ** — cách hỏng phổ biến
nhất của backup không phải chạy sai, mà là lặng lẽ ngừng chạy.

---

## 6. Cái sẽ không làm, và vì sao

Ghi ra để khỏi bị hỏi lại:

- **Không viết lại thành SPA/React.** CSP nghiêm không script ngoài đang là tài
  sản, không phải hạn chế. Trang HTML tĩnh + JS thuần đo được ~4.700 req/s.
  Không có vấn đề nào ở đây mà một framework giải được.
- **Không thêm Redis/Kafka/hàng đợi ngoài.** SQLite làm hàng đợi tốt tới quy mô
  gấp nhiều lần hiện nay, và `ai_marking_backlog` đã chạy đúng như thế. Thêm một
  hệ thống nữa là thêm một thứ nữa để hỏng lúc 2 giờ sáng.
- **Không đi Kubernetes.** Một EC2 + PM2 đang phục vụ tốt trần hôm nay. Bậc 3
  và 4 ở mục 4 là con đường, theo đúng thứ tự đó.
- **Không nhảy sang Postgres trước block 6.** Nó chặn mọi việc khác trong 1–2
  tuần, và trần hiện tại chưa chạm. Đi khi số đo bảo đi, không đi vì sốt ruột.

---

## 7. Trạng thái các block

Xem `docs/BLOCKS.md` — bảng đó là nguồn sự thật về block nào đã khóa, khóa ngày
nào, ở commit nào. Tài liệu này là thiết kế; tệp đó là tình hình.
