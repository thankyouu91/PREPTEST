# Rà soát toàn bộ mã theo block — 2026-09-02

Yêu cầu của chủ đầu tư: đọc **toàn bộ** mã theo từng block, lập kế hoạch sửa và
nâng cấp để nền tảng chạy tốt, gộp mọi thay đổi vào **một** commit.

Tệp này là biên bản của lần đọc đó: cái gì đã xem, thấy gì, sửa gì, còn gì để
lại và vì sao. Thứ tự block lấy theo `docs/BLOCKS.md`; hai mục cuối (API và
giao diện) không phải block nhưng là chỗ mã chạm người dùng nên đọc riêng.

**Mọi phát hiện đều được kiểm chứng trên mã trước khi ghi.** Cái nào chỉ là
suy đoán thì nói rõ là suy đoán. Điểm xuất phát: commit `58912e2`, cổng
`scripts/verify.sh` xanh 58 bước / ~3.060 phép kiểm.

Mức độ:

- **P1** — một màn hình nói dối hoặc một đường đi hỏng với người dùng thật.
- **P2** — sai ở một tình huống biên: đua, dữ liệu do quản trị viên tự nhập,
  phục hồi khi server đang chạy.
- **P3** — đúng nhưng dễ hỏng, chữ sai ngôn ngữ, tài liệu lệch mã, lệ thuộc thư
  mục làm việc.

---

## 0. Cách đọc

Từng block đọc trọn tệp, không đọc lướt: `server/*.js`, `server/data/*.js` (phần
đầu và hàm `rows()`), `scripts/*.mjs` của block, `public/prep/*` và
`public/admin/*`, `sw.js`, `i18n.js`. Mỗi nghi vấn đều được dựng lại — ví dụ
lỗi CSP dưới đây được tái hiện trong Chromium thật trước khi ghi là lỗi, và cổng
cũ được đọc lại để hiểu **vì sao cổng không thấy**.

Bài học chung của lần này: **cổng đo cái cổng biết đo**. Ba lỗi P1 đều nằm ở
chỗ bộ test dùng một `Audio` giả, một STT giả chấp nhận mọi thứ, hoặc chỉ chạy
trên bộ đề đã soạn sẵn — tức là đúng ba chỗ test tự làm cho mình dễ.

---

## 1. Ba lỗi P1

### 1.1 Nút "Nghe" ở phần không có chữ cái không phát được gì (block 1 + giao diện)

`server.js` `cspFor()` không có `media-src`, và theo CSP3 `'self'` **không**
khớp `blob:`. `public/prep/exam/_runner.js` `play()` tải bản ghi bằng `fetch`
(để đọc được 429 khi hết lượt nghe) rồi phát qua `URL.createObjectURL(blob)`.
Chromium từ chối: *Refused to load media from 'blob:…'*, `audio.error.code = 4`.
Lượt nghe **đã bị trừ** ở server (fetch thành công), và không có tiếng nào.

Vì sao cổng không thấy: `test-exam.mjs` chỉ đếm lượt nghe, `test-exam-audio-queue.mjs`
dùng `Audio` giả. Vì sao người dùng chưa kêu: mọi phần có chữ cái A–J đều được
`pacingFor()` đưa vào luồng `showPaced()`, luồng đó phát bằng URL cùng nguồn
trực tiếp nên chạy được. Đường `play()` chỉ gặp ở phần **không** có chữ cái
(trình xây đề cho phép "- no part -") và mọi họ đề không phải VPET.

**Đã sửa.** Thêm `media-src 'self' blob:` vào CSP. `play()` có thêm handler
`error` — trước đây phát hỏng thì nút bị khóa mãi và chú thích vẫn nói "phát
một lần". Thêm `scripts/test-exam-play.mjs`: Chromium thật, dựng một đề có phần
không chữ cái, bấm Nghe, và **đợi sự kiện `playing`** — tức là kiểm đúng cái
việc "có tiếng ra hay không", thứ mà không test nào trước đây hỏi.

### 1.2 Câu Part G/H/J do quản trị viên tự soạn không có lời thoại để chấm (block 3)

`ai-marking-run.js scriptFor()` và `repeat.js sentenceFor()` đọc lời thoại
**từ tệp tĩnh** `server/data/vpet-items.js` theo `ext_key`. Câu do quản trị viên
soạn qua màn ngân hàng câu hỏi không có `ext_key`, nên `source = null`:

- Part H rơi xuống đường gọi mô hình (mất tiền) thay vì so sánh chuỗi miễn phí;
- Part G/J được chấm **không có** đoạn văn / câu chuyện mà thí sinh đã nghe.

**Đã sửa.** Thêm hai cột `questions.script` (lời thoại) và
`questions.model_answer` (đáp án mẫu, chỉ Part G). Seed ghi từ `say`/`modelAnswer`
của bộ đề; màn ngân hàng câu hỏi có ô "Transcript" cho câu Nghe/Nói và ô "Model
answer" cho Part G; API nhận và trả hai trường này. `scriptFor()`/`sentenceFor()`
đọc **hàng trong CSDL trước**, chỉ khi trống mới quay về tệp tĩnh. Với
Postgres, `connectEngine()` sẽ từ chối khởi động cho tới khi chạy
`npm run pg:migrate` — đúng như thiết kế ở `docs/VAN-HANH.md`.

### 1.3 Bài luyện nói gửi bản ghi sai tên tệp cho dịch vụ chuyển giọng nói (block 4)

`drills.js submitMarked()`: `storage.get()` chỉ trả `{ body }`, nên
`ai.transcribe(file.body, file.mime)` nhận `mime = undefined` → multipart mang
`filename="answer.mp3"` cho một bản ghi WebM/Ogg. Dịch vụ kiểu OpenAI quyết
định định dạng theo phần mở rộng → *invalid file format*, bài luyện treo ở
`marking`. Đường bài thi thật đã ngửi byte đầu (`sniffMime`); đường luyện thì
không. Cổng không thấy vì STT giả nhận mọi thứ.

**Đã sửa.** `sniffMime()` chuyển sang `server/storage.js` (một chỗ, hai đường
dùng chung), bài luyện gọi nó. STT giả trong `test-ai-marking.mjs` giờ **đọc
tên tệp** trong multipart và đỏ khi tên không khớp byte.

---

## 2. Theo block

### Block 0–1 — sao lưu, lưu trữ, phục vụ trang

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P2 | `scripts/backup.mjs restore` | Thay tệp CSDL ngay dưới một server đang mở nó; ghi giữa lúc phục hồi và khởi động lại rơi vào tệp đã bị đổi tên. | **Đã sửa**: từ chối khi có `node server.js` đang giữ đúng tệp đó, trừ khi `--force`. Bộ quét `/proc` tách ra `scripts/_live-servers.js`, `accounts.js` dùng chung. |
| P3 | `storage.js` `DISK_ROOT` | Tính từ `process.cwd()` trong khi `db.js` tính từ `__dirname` — chạy từ thư mục khác là CSDL một nơi, âm thanh một nơi. | **Đã sửa**: theo `__dirname` như `db.js`. |
| P3 | `backup.js backup({workDir})` | `finally` xoá cả thư mục do **người gọi** đưa vào. | **Đã sửa**: chỉ xoá thư mục tự tạo. |
| P3 | `server.js` 404 | `/api/*` lạ trả `text/plain`, trong khi mọi lỗi khác của `/api` là JSON. | **Đã sửa**: JSON dưới `/api/`. |

Đã xem, không có gì: verify/prune/`MIN_KEEP`, phân trang S3, mã thoát của
lifecycle, hàng rào "một tiến trình làm việc nền" của cluster, rollback khi
deploy, cron.

### Block 2–3.5 — mô hình năng lực, rubric, chấm, xếp lớp

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P1 | `ai-marking-run.js`, `repeat.js` | Mục 1.2. | **Đã sửa**. |
| P3 | `ai-marking-run.js clearRubricMarks()` | Xoá điểm nhưng để lại `mark_caps`; bản chụp để khôi phục cũng thiếu cột này → màn kết quả có thể hiện "trần điểm" dưới dòng "Đang chờ chấm". | **Đã sửa**: xoá và khôi phục cả `mark_caps`. |
| P3 | `bands.js` | `'dưới A1'` và ghi chú sàn Level 2 là chữ Việt cứng trong giao diện tiếng Anh; ghi chú động nên `i18n.js` không dịch được. | **Đã sửa**: tiếng Anh + cặp `noteEn`/`noteVi`, màn kết quả chọn theo ngôn ngữ. |
| P3 | `placement.js:126` | Bình luận dẫn số lượng đề cũ. | Ghi nhận, không sửa. |

Đã xem, không có gì: toán ước lượng và suy giảm theo thời gian, `record()`
idempotent, các tầng chấm, band chỉ cấp khi đủ bốn kỹ năng, phạm vi rung của
xếp lớp, tách từ trong `repeat.js`.

### Block 4–6 — luyện phần, ôn tập, kế hoạch, báo cáo

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P1 | `drills.js` | Mục 1.3. | **Đã sửa**. |
| P3 | `report.js sittings()` | Lấy cả hàng `overall` của `attempt_scores` nên `skills` có khoá thứ năm và điểm trung bình là trung-bình-của-trung-bình. | **Đã sửa**: `AND s.skill <> 'overall'`, có test. |
| P3 | `plan.js:226` | Liên kết `/prep/thu-vien/` — trang đã bỏ, đi qua 301. | **Đã sửa**: `/prep/`. |
| P3 | `drills.js overview()` | Gọi `levelFor` không có `targetPaper` trong khi `suggest()` có → mức luyện trên màn hình có thể lệch với kế hoạch. | **Đã sửa**. |
| P3 | `level-advice.js:43` | Hai mã đề ghi cứng. | Ghi nhận, không sửa: đổi tên đề là chuyện có chủ ý và test-paper sẽ đỏ. |

### Block 7–8 + bảo mật

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P2 | `auth.js parseCookies()` | `decodeURIComponent` ném lỗi với cookie hỏng (một ứng dụng khác trên cùng tên miền, cookie sửa tay) → **mọi** trang trả 500 cho trình duyệt đó. | **Đã sửa**: bỏ qua cặp hỏng, có test. |
| P3 | `auth.js verifyPassword()` | Chuỗi băm có phần khoá rỗng → `scryptSync(…, 0)` trả buffer rỗng, `timingSafeEqual(rỗng, rỗng)` là true → mật khẩu nào cũng đúng. Cần một hàng bị sửa tay mới tới được; một dòng chặn. | **Đã sửa**: từ chối khoá ngắn hơn 32 byte. |

Đã xem, không có gì: `TRUST_PROXY`, cookie Secure theo chính yêu cầu đang xét,
giới hạn đọc/ghi theo băm phiên, bảng năng lực + guard có tên, AES-GCM, từ chối
BOOTSTRAP, trần chi tiêu cửa sổ trượt, hàng rào cluster.

### Dữ liệu và tích hợp

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P2 | `payment-api.js` checkout | Lấy id đơn bằng `SELECT id … ORDER BY id DESC LIMIT 1` **sau** một INSERT đã await, ngoài transaction → hai người mua cùng lúc có thể đúc mã tham chiếu lên đơn của nhau. | **Đã sửa**: dùng `lastInsertRowid` mà `q.run` đã trả trên cả hai engine. |
| P3 | `pg.js toDollars()` | Biết chuỗi literal, không biết chú thích SQL: dấu nháy đơn trong `/* … */` (`ability.js`, `study-map.js`) lật trạng thái nháy. Hôm nay cân bằng nhờ may. | **Đã sửa**: bỏ qua `--` và `/* */`, có test. |

Đã xem, không có gì: ký VNPay/MoMo và chỉ IPN mới chốt đơn, idempotent, khớp
tiền tới đồng, gộp quyền, OAuth Google (state/nonce/issuer/audience/hạn/`safeNext`),
`RETURNING`/int8 trong pg, seed một lần, đọc bí mật lúc gọi.

### API

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P2 | `api.js reshuffle` | Rút lại từng câu rồi cắt lát → tách nhóm Part G (ba câu về **một** bản ghi mà chỉ câu đầu mang). `generate` đã sửa đúng lỗi này, `reshuffle` thì chưa. | **Đã sửa**: tách bộ rút "cả nhóm hoặc không" ra `drawFromPool()`, hai đường dùng chung, có test. |
| P2 | `api.js PUT /admin/users/:id` | `.filter(familyExists)` với hàm **async**: Promise luôn truthy, bộ lọc giữ mọi thứ. | **Đã sửa**: vòng lặp await, có test. |
| P2 | `api.js validUnlock('bundle')` | `.every(familyExists)` — cùng lỗi: combo nào có ≥2 tên đều "hợp lệ", kể cả tên không tồn tại. | **Đã sửa**, có test. |
| P3 | `api.js` gắn câu từ ngân hàng | Kiểm họ đề và kỹ năng, không kiểm chữ cái phần → qua API gắn được câu Part H vào phần Part J. | **Đã sửa**: hai bên đều có chữ cái thì phải trùng. |
| P3 | `api.js generate`, cấp lô mã | `SELECT id … ORDER BY id DESC` sau INSERT — trong transaction nên an toàn, nhưng cùng dáng với lỗi checkout. | **Đã sửa**: `lastInsertRowid`. |

Đã xem, không có gì: mọi route ghi có capability, `requireAdmin + csrfGuard`
toàn router, bất biến "còn ít nhất một owner" kiểm **trong** transaction, khoá
AI không bao giờ trả về, chặn dán nhầm mật khẩu làm khoá, quy tắc https, một
đoạn văn cho một nhóm, chặn phát hành đề của họ đang tạm dừng, từ chối xoá bằng
lời, BOM cho CSV, SRS kiểm thẻ tồn tại, ranh giới ngày UTC+7.

### Giao diện

| Mức | Chỗ | Vấn đề | Xử lý |
|---|---|---|---|
| P1 | `_runner.js play()` | Mục 1.1. | **Đã sửa**. |
| P3 | `_runner.js` | Nút phát ghi "Nghe" trong giao diện tiếng Anh (`i18n` có "Listening", không có "Listen"). | **Đã sửa**: "Listen" + mục từ điển. |
| P3 | `ket-qua.html` | Câu "trần của đề" là chữ Việt cứng; ghi chú sàn của `bands.js` cũng vậy; "x/y correct" in cho cả Viết/Nói dù rubric không đếm câu đúng. | **Đã sửa**: `PREP.t`, cặp `noteEn/noteVi`, "points" cho kỹ năng chấm rubric. |
| P3 | `test/index.html` | `data-active="library"` không sáng mục nào; nút "Luyện theo phần — sắp có" bị khoá dù `/prep/luyen/` đã có; "Báo tôi khi có đề" chỉ toast, phía sau là TODO. | **Đã sửa**: sáng mục Home, nút dẫn tới luyện phần, nút báo bật đúng tuỳ chọn `newTests` đã có trên tài khoản và nói thật kết quả. |
| P3 | `manifest.webmanifest` | Lối tắt trỏ `/prep/thu-vien/` đã bỏ. | **Đã sửa**: `/prep/luyen/`. |
| P3 | `README.md` | Hai chỗ vẫn liệt kê `/prep/thu-vien/` là trang. | **Đã sửa**. |

Đã xem, không có gì: `sw.js` (network-first cho css/js, không đụng `/api`,
`/auth`, `/admin`, HTML), `_chrome.js`, `_mock.js` (CSRF, guard boot, redeem
qua `PrepApi`), trang chủ, luyện, xếp lớp, ôn tập, tài khoản (mọi chuỗi từ server
đều escape), `bank.html`, `_admin.js` (401 → đăng nhập).

---

## 3. Kế hoạch triển khai — thứ tự đã làm

1. **Server, phần không đổi hành vi đúng**: CSP, JSON 404, cookie hỏng, khoá
   băm rỗng, `toDollars`, `lastInsertRowid` ở ba chỗ, `DISK_ROOT`, `workDir`,
   `sittings()`, `plan.js`, `overview()`, `mark_caps`.
2. **Mô hình nội dung**: hai cột mới trên `questions`, seed, API đọc/ghi, màn
   ngân hàng câu hỏi, `scriptFor()`/`sentenceFor()` đọc CSDL trước.
3. **Bài luyện nói**: `storage.sniffMime()`, `drills.js` dùng.
4. **API xây đề**: `drawFromPool()`, kiểm chữ cái khi gắn, hai bộ lọc async.
5. **Phục hồi an toàn**: `_live-servers.js`, guard `--force`.
6. **Giao diện**: `_runner.js`, `ket-qua.html`, `test/index.html`, manifest,
   `i18n.js`, `bands.js`.
7. **Test**: mỗi mục trên có ít nhất một phép kiểm mới; thêm bước
   "The exam screen plays what it fetched" vào `scripts/verify.sh`.
8. Chạy trọn cổng, tài liệu, **một** commit.

## 4. Kiểm chứng

Phép kiểm mới, theo tệp:

- `scripts/test-exam-play.mjs` (mới, bước cổng mới) — phần không chữ cái, bấm
  Nghe, sự kiện `playing` phải tới; CSP thật, Chromium thật.
- `scripts/test-ai-marking.mjs` — STT giả đọc `filename=` và so với byte đầu;
  bài luyện nói Part I đi trọn đường tải lên → chấm.
- `scripts/test-security.mjs` — cookie hỏng không thành 500; `/api/không-có`
  trả JSON 404.
- `scripts/test-pg-driver.mjs` — dấu nháy trong chú thích không nuốt placeholder.
- `scripts/test-admin.mjs` — sở thích không tồn tại bị loại; combo tên họ đề
  không tồn tại bị từ chối; gắn câu khác chữ cái bị bỏ qua; rút lại Part G giữ
  trọn nhóm; câu tự soạn có `script`/`modelAnswer` đi ra đi vào nguyên vẹn.
- `scripts/test-report.mjs` — `sittings()` không có khoá `overall`.
- `scripts/test-backup.mjs` — `restore` từ chối khi tệp đang bị một server giữ,
  `--force` thì đi tiếp.
- `scripts/test-rubric.mjs` / `test-ai-marking.mjs` — câu Part H tự soạn với
  `script` được chấm bằng so sánh, không gọi mô hình.

Cổng `bash scripts/verify.sh` phải xanh trọn trước khi commit; số bước tính
bằng `grep -c '^step ' scripts/verify.sh`.

**Kết quả trước khi commit:** cổng xanh **59 bước** (thêm một bước so với điểm
xuất phát), khoảng **3.120 phép kiểm**, 606 giây trên máy 4 nhân. Ba phép kiểm
mới đã **từng đỏ** trên mã cũ trước khi sửa — nút Nghe dưới CSP cũ, tên tệp
`answer.mp3` cho bản ghi WebM, và câu Part H tự soạn phải gọi mô hình — đúng
điều kiện khóa thứ hai của `docs/KE-HOACH-XAY.md` §1.2.

## 5. Vòng hai — liên kết giữa các màn hình và vận hành

Yêu cầu tiếp theo của chủ đầu tư: *"tiếp tục kiểm tra và chỉnh sửa để vận hành
trơn tru và có tính liên kết tốt hơn."* Vòng này không đọc lại từng tệp; nó đi
theo **đường tay của người dùng** — từ màn này bấm sang màn kia — và hỏi mỗi
bước có đến nơi không.

### 5.1 Một lỗi của chính vòng một, tìm ra trước khi có ai gặp

`scripts/accounts.js` sau vòng một gọi `liveServers()` ở đầu tệp nhưng khai báo
nó bằng `const` ở cuối tệp — `function` được hoist, `const` thì không — nên **mọi
lệnh không đặt `PREP_DB`** (đúng cách người vận hành gõ trên máy chủ) chết ngay
với `ReferenceError`. Cổng vẫn xanh vì mọi chỗ trong cổng gọi công cụ này đều
đặt `PREP_DB`, tức là không chỗ nào đi qua khối mã hỏng. **Đã sửa**, và
`test-accounts.js` có thêm một phép kiểm chạy công cụ **không có** `PREP_DB`.

### 5.2 Bộ kiểm tra liên kết — `scripts/test-links.mjs`, bước cổng mới

Mở **mọi** trang (12 trang khách, 24 trang học viên, 8 trang quản trị) trong
Chromium thật, đúng phiên của trang đó, và kiểm bốn điều: mọi liên kết nội bộ
nhìn thấy được trả 200 trong phiên đó (hoặc đúng lượt chuyển hướng đăng nhập mà
guard dự định), mọi neo `#id` có phần tử thật, thanh điều hướng **sáng đúng một
mục** và khoá `data-active` của trang là khoá chrome biết, không có lỗi console,
không có chữ `undefined`/`NaN`/`null` lộ ra. Lần chạy đầu tìm được:

| Chỗ | Vấn đề | Xử lý |
|---|---|---|
| `exam/index.html`, `ket-qua.html` | `data-active` là `library`/`progress` — hai khoá không còn tồn tại, nên khi làm bài và xem kết quả **không mục nào sáng**. | Về `home`. |
| Trang chủ, màn làm bài | Chữ vẫn bảo người học "vào thư viện" — thư viện đã bỏ. | Sửa chữ, cả từ điển VI. |
| Tổng quan admin | `Doanh thu`, `orders`, `urgent`, "Against the previous…" là chữ cứng lẫn hai ngôn ngữ. | `AD.t` cho từng chuỗi. |

### 5.3 Kế hoạch dẫn tới đúng chỗ

`server/plan.js` nói "Luyện Part H" nhưng liên kết chỉ là `/prep/luyen/` — người
học rơi vào lưới mười phần và phải tự tìm chữ H; "Ôn thì hiện tại hoàn thành"
cũng chỉ mở màn chọn chủ đề. Giờ kế hoạch đưa `?part=H` và `?topic=…&level=…`,
và hai màn ấy mở **thẳng vào** phần/bộ câu được nêu (chỉ một lần — bấm "Chọn
phần khác" thì lại là lưới). Chủ đề mà máy chủ không mở được rơi về màn chọn,
không phải màn lỗi.

### 5.4 Khép vòng bài giảng ↔ luyện

Bài giảng ngữ pháp có phần "Practice" hiện đáp án nhưng không dẫn đi đâu; màn ôn
tập không dẫn về bài giảng. Giờ mỗi điểm ngữ pháp mở ra có nút **"Luyện nó trong
câu"** mở đúng bộ câu của chủ đề đó, và màn chọn chủ đề có **"Đọc bài giảng"**
cạnh chủ đề có bài (cùng bảng `study-map` mà kế hoạch dùng, qua
`/api/revision/topics`). Vòng kế hoạch → bài giảng → luyện → kế hoạch đã kín cả
hai chiều, và `test-links.mjs` đi trọn vòng đó.

### 5.5 Vận hành: tổng quan admin bớt 270 truy vấn

`GET /api/admin/reports` chạy **ba truy vấn cho mỗi ngày** của kỳ báo cáo — 270
lượt ở kỳ 90 ngày, trên chính tiến trình đang phục vụ học viên, mỗi lần bấm chip
kỳ. Thay bằng ba truy vấn gộp theo ngày, điền ngày trống ở phía ứng dụng, hình
trả về không đổi (`test-admin` giữ).

## 6. Để lại, và vì sao

- `level-advice.js` ghi cứng `vpet-b1-01`/`vpet-c1-01`: đổi tên đề là việc có
  chủ ý, và `test-paper.mjs` đỏ ngay khi đề đó không còn phát hành. Không đáng
  một lớp cấu hình.
- `analytics.js` được `file(1)` báo là "data" dù không có byte điều khiển nào —
  chưa rõ vì sao, không ảnh hưởng chạy. Ghi để có người nhìn lại.
- Mọi ghi chú giao diện tiếng Anh/Việt còn lại đều đi qua `i18n.js` hoặc
  `PREP.t`; không thấy chuỗi cứng nào khác ngoài các mục đã sửa.
- Bảng `BLOCKS.md` không đổi: không block nào bị "mở lại" theo nghĩa của tệp đó
  — không có thay đổi thiết kế, chỉ có sửa lỗi kèm test.
