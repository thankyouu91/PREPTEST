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
| P2 → **P1** | `auth.js parseCookies()` | `decodeURIComponent` ném lỗi với cookie hỏng (một ứng dụng khác trên cùng tên miền, cookie sửa tay). Vòng một ghi "mọi trang trả 500 cho trình duyệt đó"; **đo lại lúc nghiệm thu thì nặng hơn**: lỗi ném trong callback đọc tệp, ngoài tầm bắt của Express → `uncaughtException` → **cả tiến trình chết**, một yêu cầu không cần tài khoản là đủ — xem §7.1. | **Đã sửa**: bỏ qua cặp hỏng, có test. |
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
- Bảng trạng thái trong `BLOCKS.md` không đổi: không block nào bị "mở lại"
  theo nghĩa của tệp đó — không có thay đổi thiết kế, chỉ có sửa lỗi kèm test.
  Bảng hiệu năng có thêm hàng nghiệm thu, xem §7.4.

## 7. Nghiệm thu — 2026-09-03

Hai commit của đợt này (`b359de7`, `1877c0e`) đã đẩy lên nhánh mặc định, tức là
đã lên production. Nghiệm thu chạy **sau** đó, trên đúng cây mã đã đẩy, theo sáu
điều kiện khóa của `docs/KE-HOACH-XAY.md` §1.2 — đợt này không khóa block mới,
nhưng đó là bộ tiêu chí duy nhất trong repo kiểm được bằng lệnh, nên dùng nó.
Máy nghiệm thu là container 4 nhân của phiên làm việc, không phải máy production.

### 7.1 Điều kiện 2 — từng bộ kiểm mới đã đỏ trên mã cũ

Cách làm: với mỗi chỗ sửa, trả **đúng các tệp mà chỗ sửa đó chạm** về phiên bản
trước khi sửa (`git show <commit>:<tệp> > <tệp>`), khởi động lại server, chạy bộ
kiểm canh chỗ đó, ghi lại từng dòng ✗, rồi `git checkout` trả tệp về HEAD. Cuối
cùng chạy lại cả tám bộ trên HEAD: **tám bộ xanh, cây làm việc sạch**.

| Tệp trả về mã cũ | Bộ kiểm | Đỏ | Phép kiểm đã đỏ, và mã cũ trả lời gì |
|---|---|---|---|
| `server/pg.js` @ `58912e2` | `test-pg-driver` | 2 | placeholder sau dấu nháy trong chú thích vẫn được đánh số (cũ: đếm ra 1); chú thích được chép nguyên |
| `scripts/backup.mjs` @ `58912e2` | `test-backup` | 2 | `restore --yes` bị từ chối khi một server đang giữ tệp (cũ: đi tiếp); và nêu tên tiến trình |
| `scripts/accounts.js` @ `b359de7` | `test-accounts` | 1 | không có `PREP_DB` vẫn tới được bảng lệnh (cũ: `ReferenceError: Cannot access 'liveServers' before initialization`) |
| `server.js`, `server/auth.js` @ `58912e2` | `test-security` | 2 | CSP có `media-src 'self' blob:` (cũ: không có chỉ thị đó); và một dòng `fetch failed` — xem dưới |
| như trên | `test-exam-play` | 1 | cả bộ ném `fetch failed` — xem dưới |
| `server/drills.js`, `server/ai-marking-run.js`, `server/repeat.js` @ `58912e2` | `test-ai-marking` | 4 | tệp gửi đi đặt tên theo byte thật (cũ: `filename=mp3` cho `audio/webm`); Part H tự soạn không gọi mô hình (cũ: 1 lần gọi); nói lại nguyên câu được trọn điểm (cũ: 0,75 qua mô hình); hai tiêu chí `content`/`structure` (cũ: `[]`) |
| `server/api.js`, `server/report.js`, `server/plan.js` @ `58912e2` | `test-admin` | 6 | câu Part H không gắn được vào phần Part J (cũ: `added:1`); rút lại Part G giữ trọn nhóm ba câu (cũ: tách nhóm); combo nêu họ đề không có bị từ chối (cũ: 201); lời thoại có trên danh sách ngân hàng, và sửa thì thay (cũ: mất); sở thích chỉ giữ họ đề thật, mỗi họ một lần (cũ: `["vpet","no-such-family","vpet"]`) |
| như trên | `test-report` | 3 | `sittings()` đúng bốn kỹ năng (cũ: thêm khoá `overall` thứ năm); trung bình của bốn (cũ: 7,1 thay vì 6,5); cùng điều đó qua API |
| như trên | `test-plan` | 1 | mục luyện mang chữ cái phần trong đường dẫn (cũ: `/prep/luyen/` trơn) |

Tổng: **22 dòng đỏ trên mã cũ, 0 trên HEAD**; 20 dòng là phép kiểm nhắm tới, hai
dòng `fetch failed` nói ở đoạn sau. Bảng trên chép từ `red-check.log` của phiên
nghiệm thu, không chép từ trí nhớ.

Hai dòng `fetch failed` hoá ra là điều đáng ghi nhất của bảng. Trả riêng
`server.js` + `server/auth.js` về `58912e2` rồi gửi đúng cookie mà `test-security`
gửi (`other_app=%E0%A4%A`) cho thấy: server cũ **không trả 500 — nó chết**.
`parseCookies()` ném `URIError: URI malformed` từ trong `ensureCsrfCookie()`, mà
hàm đó chạy trong callback đọc tệp HTML (`FSReqCallback.oncomplete`), ngoài tầm
bắt của Express, nên thành `uncaughtException`: log ghi
`[lifecycle] FATAL uncaughtException: URI malformed`, tiến trình thoát mã 1, mọi
kết nối đang mở bị cắt. Trên production PM2 sẽ dựng lại, nhưng mỗi trình duyệt
mang một cookie hỏng từ ứng dụng khác trên cùng miền là **một lần khởi động lại
cho mỗi lượt xem trang**, và bất kỳ ai cũng gây được bằng một yêu cầu — không
cần tài khoản. Vòng một ghi lỗi này là "mọi trang trả 500 cho trình duyệt đó" —
nhẹ hơn sự thật; lời ghi trong tài liệu này và chú thích trong `server/auth.js`
đã sửa trong commit nghiệm thu. Bản sửa của `b359de7` chặn đúng chỗ đó và đã lên
production; HEAD trả 200 cho cùng cookie ở cả trang HTML lẫn `/api/catalog`.

### 7.2 Điều kiện 5 — không thêm dependency

`package.json` tại HEAD: `express` và `pg` — **đúng như tại `58912e2`**. `pg` vào
từ các lát PostgreSQL ghi ở `docs/ROADMAP.md`, trước đợt này; hai commit này không
thêm gói nào.

### 7.3 Production — chưa kiểm được từ đây, và kiểm thế nào

Phiên này không với tới `https://vpetprep.vn`: proxy của sandbox trả
`CONNECT tunnel failed, response 502`, và connector AWS đã hết hạn token (cấp lại
trong phần Connectors của claude.ai; không làm được từ trong phiên). Nên
production **chưa được nghiệm thu bằng lệnh** trong đợt này. Bốn phép kiểm cho
người vận hành, mỗi phép chừng một phút, rẻ trước đắt sau:

1. Từ máy bất kỳ:
   `curl -sI https://vpetprep.vn/prep/landing/ | grep -i content-security-policy`
   phải chứa `media-src 'self' blob:` (trên máy nghiệm thu header này có ở cả
   GET lẫn HEAD). Thiếu chỉ thị đó nghĩa là bản mới chưa lên, và nút Nghe ở phần
   không chữ cái vẫn câm. Với §1.1 phép kiểm này là đủ: đó chính là điều kiện
   để trình duyệt cho phát `blob:`, phần còn lại của đường phát không đổi.
2. Nếu có đề với phần "- no part -" (trình xây đề cho phép; mọi họ đề không phải
   VPET đều đi đường này): đăng nhập học viên, mở đề, bấm Nghe — phải có tiếng,
   và lượt nghe trừ đúng một.
3. Quản trị → Ngân hàng câu hỏi: câu Part G/H/J chưa có lời thoại mang nhãn
   **No transcript** trên danh sách; mở một câu, có ô **Transcript (what the
   recording says)** và với Part G thêm **Model answer**; sửa, lưu, mở lại còn
   nguyên. Đây là §1.2.
4. Trên máy chủ, trong thư mục ứng dụng: `node scripts/accounts.js list` mà
   **không** đặt `PREP_DB` phải in danh sách tài khoản, không phải
   `ReferenceError`. Đây là §5.1. Cùng lúc xem log PM2 của lần khởi động đầu sau
   khi triển khai: hai cột `questions.script` và `questions.model_answer` được
   thêm tự động lúc khởi động, không có dòng lỗi nào.

### 7.4 Điều kiện 3 — hiệu năng, đo đúng thang và so đúng cách

`node scripts/loadprobe.mjs` với thang gốc `1,10,25,50,100,200`, 5 giây mỗi mức,
server một tiến trình. Lần đo đầu: HEAD trên CSDL đang dùng của phiên (đã qua
cổng và vòng kiểm đỏ; 13 đề, 2 phát hành, WAL 4 MB), hai lần liền nhau:

| | `/healthz` | tệp tĩnh | `/prep/landing/` | `/api/catalog` |
|---|---|---|---|---|
| HEAD, lần 1 | 7.512 | 3.231 | 3.254 | 1.210 |
| HEAD, lần 2 | 8.257 | 3.331 | 3.245 | 1.207 |
| hàng block 8 trong `BLOCKS.md` (2026-08-23) | 7.859 | 3.102 | 2.917 | 1.501 |

`/api/catalog` đọc ra **−19%** so với hàng gần nhất — quá ngưỡng 15% nếu tin phép
so đó. Không tin được: hàng block 8 đo trên container của ngày 23-08 và một
`data/prep.sqlite` khác, mà `BLOCKS.md` đã ghi từ block 7 rằng số tuyệt đối giữa
hai container không so được. Hai lần HEAD trùng nhau tới 0,3% ở tuyến đó, nên
cũng không phải nhiễu. Cách duy nhất quy được cho mã là **một cặp A/B trên cùng
máy, cùng dữ liệu**: `git worktree` của `58912e2` (trước cả hai commit) và HEAD,
mỗi bên một bản `VACUUM INTO` của cùng CSDL, cổng riêng, đo lần lượt
cũ → mới → cũ (kẹp giữa để triệt trôi theo thời gian), cùng thang, cùng máy:

| | `/healthz` | tệp tĩnh | `/prep/landing/` | `/api/catalog` |
|---|---|---|---|---|
| `58912e2`, lần 1 | 10.090 | 3.476 | 3.445 | 1.290 |
| **HEAD** | **9.705** | **3.376** | **3.383** | **1.287** |
| `58912e2`, lần 2 | 8.820 | 3.250 | 3.418 | 1.279 |
| HEAD so với trung bình hai lần cũ | +2,6% | +0,4% | −1,4% | +0,2% |

HEAD nằm **giữa hai lần đo của chính mã cũ** ở cả bốn tuyến. Không có hồi quy
để truy: tuyến `/api/catalog` không đổi một dòng trong diff, và trên đường chung
của mọi request hai commit chỉ thêm một chỉ thị CSP và một `try` quanh
`decodeURIComponent`. **Điều kiện 3 đạt.** Hai hàng tương ứng đã vào bảng hiệu
năng của `docs/BLOCKS.md`, ghi rõ là cặp.

Hai điều ghi lại cho lần đo sau. Một: hai lần chạy **cùng một mã** cách nhau bốn
phút chênh 13% ở `/healthz` (10.090 và 8.820) — trên container này sai số không
phải ±4,5% như đo ở block 3, và một lần đo đơn không phân biệt được thay đổi
10% ở tuyến rẻ nhất; muốn kết luận thì kẹp A/B như trên, đừng so cột dọc giữa
hai ngày. Hai: cùng dữ liệu, tệp `VACUUM INTO` (gọn, không WAL) cho `/api/catalog`
cao hơn CSDL đang chạy khoảng 6% (1.279–1.290 so với 1.207–1.210) — chưa truy
nguyên nhân, chỉ ghi để không ai đem hai loại tệp ra so với nhau.

### 7.5 Điều kiện 1 và 4 — cổng chạy lại trên đúng cây mã này

`bash scripts/verify.sh` chạy lại **sau** thay đổi mã duy nhất của commit nghiệm
thu (một chú thích trong `server/auth.js`) và trước khi commit — các tệp `docs/`
được viết trong lúc cổng chạy và sau đó, cổng không đọc chúng:

- **60 bước, xanh trọn**, `exit 0`, **3.431 phép kiểm ✓, 0 ✗**, **557 giây**
  trên máy nghiệm thu (vòng hai là 565 giây, cũng 60 bước).
- Ba bước nặng nhất: kiểm giao diện (tràn, tương phản, CSP) 204 s; ảnh chụp
  nghiệm thu 118 s; liên kết và điều hướng 62 s.
- Điều kiện 4: bước "Acceptance screenshots" chụp lại **104 ảnh** (desktop và
  mobile, mọi trang, vào `docs/screenshots/` — thư mục nằm trong `.gitignore`)
  lúc 04:01–04:02 ngày nghiệm thu; bộ trước đó là 86 ảnh ngày 20-08. Ảnh không
  vào Git, nên "ảnh mới" nghĩa là bước đó chạy và xanh, đúng như §1.2 định nghĩa.
- Cổng không đụng tệp nào Git theo dõi: `git status` sau cổng chỉ còn ba tệp
  của chính commit này.

### 7.6 Kết luận

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Cổng xanh | ✅ 60 bước, 3.431 phép kiểm, 557 s — §7.5 |
| 2 | Test riêng, đã từng đỏ | ✅ 22 dòng đỏ trên mã cũ, 0 trên HEAD — §7.1 |
| 3 | Hiệu năng không tụt >15%, đúng thang | ✅ cặp A/B cùng máy, cùng dữ liệu: HEAD nằm giữa hai lần đo của mã cũ — §7.4 |
| 4 | Ảnh chụp mới | ✅ 104 ảnh chụp lại trong bước cổng — §7.5 |
| 5 | Không thêm dependency | ✅ `express`, `pg`, như `58912e2` — §7.2 |
| 6 | Ghi vào `BLOCKS.md` | ✅ hai hàng 2026-09-03, đọc theo cặp |

**Nghiệm thu đạt trên máy nghiệm thu.** Còn một việc không làm được từ đây và
phải có người làm: bốn phép kiểm production ở §7.3 — phép 1 chạy từ bất kỳ máy
nào, mười giây. Một điều đáng nói ngoài sáu điều kiện: lỗi cookie hỏng của mã cũ
là lỗi **sập tiến trình bằng một yêu cầu**, nặng hơn mức "P2, trang 500" mà vòng
một ghi; nó đã được sửa từ `b359de7`, và đó là lý do phép kiểm 1 ở §7.3 nên chạy
ngay — header CSP mới và bản sửa cookie cùng một commit, thiếu cái này là thiếu
cả cái kia.
