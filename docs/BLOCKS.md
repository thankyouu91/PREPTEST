# Trạng thái block — cái gì đã khóa, khóa lúc nào

Thiết kế nằm ở `docs/KE-HOACH-XAY.md`. Tệp này chỉ ghi **tình hình**: block nào
đã qua đủ sáu điều kiện khóa, ở commit nào, và số đo hiệu năng tại thời điểm đó.

Sáu điều kiện khóa (chi tiết ở `docs/KE-HOACH-XAY.md` §1.2), rút gọn:

1. `npm run verify` xanh · 2. có test riêng, **đã từng nhìn thấy đỏ** ·
3. `loadprobe` không tụt >15%, **đo bằng đúng thang của đường cơ sở** ·
4. ảnh chụp mới · 5. vẫn chỉ một dependency · 6. có dòng trong bảng dưới đây

> **Đã khóa nghĩa là không sửa tệp của block đó ở block sau.** Cần sửa thì ghi
> một dòng "mở lại" vào mục cuối tệp, chạy lại đủ sáu điều kiện, rồi mới đi tiếp.

## Bảng

| Block | Nội dung | Trạng thái | Commit khóa | Ngày |
|---|---|---|---|---|
| 0 | Sao lưu và phục hồi CSDL | 🟡 gần xong — S3 đã dựng và chạy thật; chờ chạy lại 3 lệnh nghiệm thu trên mã đã commit | — | — |
| 1 | Nới trần rẻ tiền (pragma, cắt trang sẵn) | 🔒 **đã khóa** | `87b05ce` | 2026-08-21 |
| 2 | Mô hình năng lực (`skill_events` + `server/ability.js`) | 🔒 **đã khóa** | `87b05ce` | 2026-08-21 |
| 3 | Rubric và đánh giá sau bài thi | 🔒 **đã khóa** | `5113a11` | 2026-08-21 |
| 3.5 | Xếp lớp bắt buộc khi đăng ký | 🔒 **đã khóa** | `1512e15` | 2026-08-22 |
| 4 | Luyện theo từng Part, đề random (mười phần A-J) | 🔒 **đã khóa**, mở lại rồi đóng | `208848d` | 2026-08-23 |
| 5 | Ngữ pháp và từ vựng luyện bằng cách dùng chúng | 🔒 **đã khóa** | `716cd46`+ | 2026-08-23 |
| 6 | Lộ trình tuần sinh tự động, có mẹo làm bài | 🔒 **đã khóa** | `ed1901e`+ | 2026-08-23 |
| 7 | Nhiều tiến trình (`cluster`) | ⬜ chưa bắt đầu | — | — |
| 8 | Chống lạm dụng và DDoS | ⬜ chưa bắt đầu | — | — |

Ký hiệu: ⬜ chưa bắt đầu · 🟡 đang làm · 🔒 đã khóa · 🔓 đã mở lại

## Các block nối vào báo cáo năng lực như thế nào

Đây là thứ giữ cả thiết kế lại với nhau, nên nó có một bộ test riêng —
`scripts/test-chain.mjs`, chạy trong cổng sau cả năm bộ kia.

**Mọi thứ được chấm đều đi về MỘT báo cáo**, và báo cáo đó là thứ duy nhất trên
nền tảng này có ý kiến về việc ai giỏi đến đâu:

| Nguồn | `source` | Trọng số | Vào band tổng? |
|---|---|---|---|
| Bài thi thật | `exam` | 1 | ✅ |
| Xếp lớp (block 3.5) | `placement` | 1 | ✅ |
| Luyện Part (block 4) | `drill` | 0,6 | ✅ |
| Ôn tập (block 5) | `revision` | 0,6 | ❌ **không** |

Hàng cuối là chỗ dễ hỏng nhất và là bất biến quan trọng nhất: ngữ pháp và từ
vựng là **chiều chẩn đoán**, VPET không chấm chúng, nên gộp vào band sẽ đẻ ra
một con số không ứng với bài thi nào cả. Nó chỉ là **một dòng lọc** trong
`abilityOf()`. Xoá thử dòng đó thì hai dòng test canh nó đỏ ngay, và số liệu nói
rõ thiệt hại: `n` nhảy 24 → 40, và `confident` lật từ `false` sang **`true`** —
nền tảng sẽ tuyên bố một band chắc chắn dựa trên mấy câu điền ngữ pháp.

Block 6 không sinh ra số mới. Nó **xếp hạng** chính báo cáo đó, nên nếu lộ trình
và bảng tiến độ có lúc nào nói khác nhau thì đó là lỗi ở `server/plan.js`, không
phải mô hình thứ hai. Test kiểm đúng điều này bằng cách đọc cả hai và so.

Năm bộ test của từng block chỉ chứng minh được nửa của nó. `test-chain.mjs` là
bộ duy nhất hỏi **chúng có cộng lại thành một không** — và đường nối mới là chỗ
mà năm bộ test xanh vẫn cứ xanh trong khi sản phẩm nói với học viên hai điều
khác nhau.

## Số đo hiệu năng

Điều kiện khóa số 3 so với **lần đo gần nhất**, nên mỗi lần khóa phải thêm một
hàng. Chạy bằng `node scripts/loadprobe.mjs` (server phải đang chạy).

Cột ghi là số của `PRAGMA synchronous` đang đặt, đo thẳng vào tầng lưu trữ chứ
không qua HTTP — vì đó mới là trần thật của đường ghi.

| Ngày | Commit | Máy | `/healthz` | tệp tĩnh | `/prep/landing/` | `/api/catalog` | ghi tự-commit |
|---|---|---|---|---|---|---|---|
| 2026-08-21 | `9366f3b` | 4 nhân, đĩa cục bộ | 3.955 req/s | 1.915 req/s | — | 1.150 req/s | 4.060/s (`FULL`) |
| 2026-08-21 | `cdbfb3f` | 4 nhân, đĩa cục bộ | — | — | **1.007 req/s** | 1.152 req/s | 4.060/s (`FULL`) |
| 2026-08-21 | block 1 | 4 nhân, đĩa cục bộ | — | — | **1.664 req/s** | 1.142 req/s | **37.990/s** (`NORMAL`) |
| 2026-08-21 | `87b05ce` khóa 1+2 | 4 nhân, đĩa cục bộ | 3.741 req/s | 1.718 req/s | **1.597 req/s** | 1.146 req/s | 37.990/s (`NORMAL`) |
| 2026-08-21 | `5113a11` khóa 3 | 4 nhân, đĩa cục bộ | 3.455 req/s | **1.780 req/s** | 1.708 req/s | 1.118 req/s | 37.990/s (`NORMAL`) |
| 2026-08-22 | `1512e15` khóa 3.5 | 4 nhân, đĩa cục bộ | 7.871 req/s | 2.794 req/s | 2.797 req/s | 1.363 req/s | 37.990/s (`NORMAL`) |
| 2026-08-23 | khóa 4 | 4 nhân, đĩa cục bộ | 4.294 req/s | 1.956 req/s | 1.935 req/s | 1.226 req/s | 37.990/s (`NORMAL`) |
| 2026-08-23 | `def8c7a` khóa 5+6 | 4 nhân, đĩa cục bộ | 4.286 req/s | 2.043 req/s | 1.934 req/s | 1.238 req/s | 37.990/s (`NORMAL`) |
| 2026-08-23 | mở lại block 4 | 4 nhân, đĩa cục bộ | 4.107 req/s | 1.844 req/s | 1.857 req/s | 1.220 req/s | 37.990/s (`NORMAL`) |
| 2026-08-23 | gộp Tiến độ vào Trang chủ | 4 nhân, đĩa cục bộ | 4.409 req/s | 1.888 req/s | 1.771 req/s | 1.156 req/s | 37.990/s (`NORMAL`) |
| 2026-08-23 | block 7 · **1 tiến trình** (mặc định) | 4 nhân, đĩa cục bộ | 7.661 req/s | 3.158 req/s | 2.945 req/s | 1.555 req/s | 37.990/s (`NORMAL`) |
| 2026-08-23 | block 7 · **4 worker** (`WEB_CONCURRENCY=auto`) | 4 nhân, đĩa cục bộ | **10.346 req/s** | **4.183 req/s** | **4.724 req/s** | **4.729 req/s** | 37.990/s (`NORMAL`) |
| 2026-08-23 | block 8 · 1 tiến trình | 4 nhân, đĩa cục bộ | 7.859 req/s | 3.102 req/s | 2.917 req/s | 1.501 req/s | 37.990/s (`NORMAL`) |

Hàng mở lại block 4, so với **đường cơ sở**: `/healthz` +3,8%, tệp tĩnh −3,7%,
`/prep/landing/` +84%, `/api/catalog` +5,9%. Không route nào quá ngưỡng 15%.

So với **hàng liền trước** thì tệp tĩnh −9,7%, và lần này có một phần nguyên
nhân đo được chứ không phải suy đoán: CSS tăng từ 71.814 lên 73.795 byte
(**+2,76%**) vì mấy lớp `.part-*` mới của thẻ phần thi. 2,76% không giải thích
hết 9,7%, phần còn lại nằm trong sai số ±4,5% đã đo ở block 3. Ghi ra đây để
lần khóa sau còn có cái mà so: nếu đường tệp tĩnh tiếp tục tụt trong khi CSS
không to thêm nữa thì lúc đó mới là chuyện khác.

Hàng gộp Tiến độ so với **đường cơ sở**: `/healthz` +11,5%, tệp tĩnh −1,4%,
`/prep/landing/` +76%, `/api/catalog` +0,3%. Không route nào quá ngưỡng.

**Hai hàng block 7 phải đọc theo cặp, không đọc theo cột dọc.** Số tuyệt đối của
cả hai cao hơn hẳn mọi hàng phía trên vì container lần này nhanh hơn cái đã đo
những hàng cũ — so hàng block 7 với hàng 2026-08-22 là so hai cái máy. Cái so
được là **hai hàng với nhau**: cùng một `data/prep.sqlite`, cùng một máy, cách
nhau mười phút, chỉ khác đúng một biến môi trường.

Đọc theo cặp thì: `/healthz` +35%, tệp tĩnh +32%, `/prep/landing/` +60%,
`/api/catalog` **+204%**.

`/api/catalog` gấp ba, và đó không phải may mắn — nó là tuyến nặng CSDL nhất
trong bốn tuyến, tức là tuyến bị **một luồng** bóp nghẹt nhiều nhất. Ba tuyến
kia phần lớn là việc của nhân hệ điều hành nên tăng vừa phải.

**Nhưng đuôi mới là chỗ đáng nhìn.** Ở 200 luồng:

| | 1 tiến trình | 4 worker |
|---|---|---|
| `/api/catalog` p99 | **2.320 ms** | 119 ms |
| `/api/catalog` chậm nhất | **5.121 ms** | 630 ms |
| `/prep/landing/` chậm nhất | **2.383 ms** | 111 ms |
| tệp tĩnh chậm nhất | 976 ms | 126 ms |

Năm giây. Một tiến trình, 200 yêu cầu cùng lúc, và người xui nhất đợi **năm
giây** cho một trang danh mục. Đó chính là cái mà `docs/KE-HOACH-XAY.md` §4 nói
trước: `node:sqlite` chạy đồng bộ, nên một truy vấn chậm chặn cả vòng lặp sự
kiện và mọi người xếp hàng sau nó. Bốn tiến trình không làm truy vấn đó nhanh
hơn — nó chỉ làm cho một truy vấn chậm chặn **một phần tư** lưu lượng.

**Và cái giá, nói thẳng:** ở 1 luồng cụm **chậm hơn** — `/healthz` 2.899 →
1.411 req/s, tệp tĩnh 1.056 → 824 req/s. Đó là chặng đi thêm qua bộ điều phối
của tiến trình chính. Nghĩa là: cụm lấy tiền của bạn khi không có ai và trả lại
gấp bội khi đông. Một máy phục vụ vài người thì `WEB_CONCURRENCY` để trống là
đúng, và đó cũng là mặc định.

Hàng block 8 so với hàng block 7 một tiến trình (cùng máy, cùng CSDL, cùng
thang): `/healthz` +2,6%, tệp tĩnh −1,8%, `/prep/landing/` −1,0%,
`/api/catalog` −3,5%. Cả bốn nằm trong sai số ±4,5% đã đo ở block 3, không đường
nào gần ngưỡng 15%.

Điều đó **đúng như thiết kế chứ không phải may**: `loadprobe` gọi ẩn danh, mà
`readLimit` cố ý không đếm request ẩn danh — nên bốn tuyến này đi qua đúng hai
phép so sánh rẻ tiền rồi thoát. Chi phí thật của trần đọc nằm ở đường **đã đăng
nhập**, và nó được đo riêng ở bảng dưới vì `loadprobe` không với tới đó.

Chưa đo được, ghi ra để lần sau đo: **đường ghi**. Bốn tiến trình cùng giành một
khoá ghi SQLite là kịch bản mà `busy_timeout` của block 1 dựng ra để chịu, và
loadprobe hiện chỉ đọc. Nếu chờ khoá bao giờ chạm 5 giây thì câu trả lời là bậc
3 (PostgreSQL), không phải thêm worker.

**Nhưng bốn đường đó không chạm tới thứ vừa thêm.** `/api/me/report` nằm sau
đăng nhập nên `loadprobe` không đo được, mà nó lại chạy ở **trang mọi người vào
đầu tiên**. Đo thẳng thì rõ hơn: với một tài khoản có **5.863 sự kiện**, một lần
gọi mất **23,6 ms** — và `node:sqlite` là **đồng bộ**, nên 23,6 ms đó là event
loop bị chặn cho mọi request khác trên tiến trình, không phải chỉ chậm cho một
người.

Đã sửa: gom sự kiện theo ngày bằng `date(at, '+7 hours')` trong chính SQLite
thay vì kéo mấy nghìn dòng sang JavaScript để đếm ra 56 con số.
**23,6 ms → 11,4 ms.** Bóc từng phần: `activity()` 4,95 ms · `quality()` 3,82 ms
· `sittings()` 1,72 ms.

Còn 11,4 ms vẫn là ~14 lần `/api/catalog`, tức khoảng **88 lượt/giây trên một
tiến trình**. Chấp nhận được vì trang chủ mỗi phiên chỉ tải một lần, nhưng phải
ghi ra đây thay vì lờ đi: đây chính là một lý do cụ thể cho **block 7**
(`cluster`), và là đường đầu tiên cần đo lại sau khi block 7 xong.

**Hàng khóa 5+6 so với đường cơ sở** — không route nào tụt, ba trong bốn nhích lên:

| Đường | cơ sở | khi khóa | |
|---|---|---|---|
| `/prep/landing/` | 1.007 | 1.934 | **+92%** ✓ |
| `/api/catalog` | 1.152 | 1.238 | +7,5% ✓ |
| `/healthz` | 3.955 | 4.286 | +8,4% ✓ |
| tệp tĩnh | 1.915 | 2.043 | +6,7% ✓ |

Đáng nói: **đường tệp tĩnh đã hết là chỗ đáng lo.** Ở block 1+2 nó ở −10,3% và
tôi đã ghi rằng "nếu lần sau vẫn thấy mức này thì mới là xu hướng". Ba lần đo
liên tiếp kể từ đó — 1.780, 1.956, 2.043 — cho thấy nó không phải xu hướng mà
là đúng cái đã truy ra ở block 3: thang đo rút gọn cộng máy vừa chạy xong cổng.
Đây là lý do quy tắc "đo bằng đúng thang gốc" đáng giữ.

Bốn block gần nhất (3.5, 4, 5, 6) **không thêm gì vào đường nóng**. Xếp lớp,
luyện Part, ôn tập và lộ trình đều nằm sau đăng nhập và không đường nào trong
bốn đường trên gọi tới chúng — đó là lý do các số nằm ngang. Khi nào chúng bắt
đầu tụt thì nghĩa là có thứ đã bò vào phần dựng trang chung, và lúc đó phải truy.

Hàng khóa 3 đo bằng **đúng thang của đường cơ sở** (`1,10,25,50,100,200`) — xem
ghi chú về phương pháp bên dưới. So với cơ sở: tệp tĩnh −7,1%, `/api/catalog`
−3,0%, `/healthz` −12,6%, `/prep/landing/` **+70%**. Không route nào quá 15%.

Hàng thứ hai là đường cơ sở đúng cho trang HTML: hàng đầu đo nhầm một route
sau đăng nhập nên chỉ đo được tốc độ trả về 302, không phải tốc độ dựng trang.

Hai hàng đầu là **đường cơ sở**, đo trước khi bắt đầu block 0. Diễn giải đầy đủ
— gồm cả đuôi p99 4,1 giây ở 200 luồng, và vì sao thông lượng phẳng từ 25 luồng
trở lên — ở `docs/KE-HOACH-XAY.md` §0.

**Block 1 đo được: `/prep/landing/` 1.007 → 1.664 req/s (+65%), p95 ở 100 luồng
141 ms → 88 ms (−38%).** `/api/catalog` không đổi (1.152 → 1.142, trong sai số) —
đúng như dự đoán, đường đó không dựng HTML. Đường ghi 9× theo số đo ở §0.

Máy đo không phải máy production: ổ ở đây nhanh hơn EBS gp3, nên cột ghi trên
production sẽ thấp hơn. Phải đo lại trên chính máy đó trong block 0.

**Hàng khóa 1+2 so với đường cơ sở** — điều kiện khóa số 3 là không route nào
tụt quá 15%:

| Đường | cơ sở | khi khóa | |
|---|---|---|---|
| `/prep/landing/` | 1.007 | 1.597 | **+59%** ✓ |
| `/api/catalog` | 1.152 | 1.146 | −0,5%, trong sai số ✓ |
| `/healthz` | 3.955 | 3.741 | −5,4% ✓ |
| tệp tĩnh | 1.915 | 1.718 | **−10,3%** ✓ nhưng sát |

Hàng cuối cần nói cho rõ chứ không lờ đi: −10,3% nằm trong ngưỡng nhưng là mức
tụt lớn nhất của lần đo này. Ba lý do đều khả dĩ và chưa tách được: máy vừa chạy
xong cổng 441 giây nên còn nóng; lần đo này chỉ tới 100 luồng chứ không phải
200; và sai số giữa các lần chạy của một tiến trình đơn luồng vốn ở mức vài phần
trăm. **Không có thay đổi nào trong block 1 hay 2 chạm vào đường tệp tĩnh** —
`express.static` không bị sửa. Nếu lần đo của block sau vẫn thấy nó ở mức này
thì lúc đó mới là xu hướng, và phải truy.

> **Đã truy ở block 3, và nguyên nhân là cách đo, không phải mã.** Lần đo block 3
> lại thấy 1.572 req/s, nên đã điều tra thay vì cho qua. Ba việc đã làm:
>
> 1. **Kích thước CSS** — giả thuyết "thêm class nên tệp to ra": sai.
>    69.733 → 69.771 byte, tức +0,05%.
> 2. **Phương sai** — chạy lại 5 lần trên cùng một server, cùng một mã:
>    1.695 · 1.630 · 1.620 · 1.740 · 1.595 → khoảng ±4,5%. Không đủ để giải
>    thích −18%.
> 3. **Thang đo** — và đây là nguyên nhân. Đường cơ sở 1.915 đạt đỉnh ở **50
>    luồng**. Các lần đo sau tôi rút thang xuống `1,25,100` cho nhanh, tức là
>    **không hề lấy mẫu ở mức 50** — con số "tụt" chỉ là đỉnh của một thang khác.
>    Chạy lại đúng thang gốc `1,10,25,50,100,200`: **1.780 req/s**, tức −7,1%
>    so với cơ sở, nằm gọn trong ngưỡng.
>
> **Luật rút ra, áp cho mọi lần khóa sau:** đo để so sánh thì phải dùng **đúng
> thang của đường cơ sở**. Một thang rút gọn đo ra một đại lượng khác, và đem
> hai đại lượng khác nhau ra so là tự tạo ra hồi quy không có thật — hoặc tệ
> hơn, che mất một hồi quy có thật.

## Phần AWS của block 0 — đã dựng xong trên máy thật, 2026-08-22

Chủ đầu tư dựng qua AWS CloudShell (connector AWS hết token, ba đường tự động
đều tắc — xem cuối mục này). Đọc lại từ AWS, không phải chép lại từ ý định:

| Thứ | Trạng thái đã kiểm |
|---|---|
| Bucket | `vpet-prep-backups-659161125499` @ ap-southeast-1 |
| Object Lock | `Enabled`, `GOVERNANCE`, 30 ngày — **bật lúc `create-bucket`**, không tạo lại được |
| Versioning | `Enabled` |
| Public access | cả bốn cờ `true` |
| Mã hoá | `AES256`, bucket key bật |
| Lifecycle | noncurrent version hết hạn sau 45 ngày, prefix `db-backups/` |
| IAM role | `EC2-SSM-Role`, dò qua instance profile chứ không đoán |
| Inline policy | `VpetPrepBackupWrite` — `ListBucket` có Condition `s3:prefix`; `PutObject`/`GetObject`/`DeleteObject` trong đúng prefix |
| **Không** cấp | `s3:DeleteObjectVersion`, `s3:BypassGovernanceRetention` — giữ nguyên như vậy |

Object thật trong bucket đã bị khoá thật, không chỉ là cấu hình:
`ObjectLockMode: GOVERNANCE`, `RetainUntil: 2026-09-21T07:04:32Z`.

### Một chi tiết bắt buộc, không phải thừa

`/etc/vpet-prep.env` có bốn dòng, dòng thứ tư là:

```
AWS_EC2_METADATA_SERVICE_ENDPOINT=http://169.254.169.254
```

`credentialSource()` trong `server/aws-sigv4.js` chỉ chọn IMDS khi thấy biến này
hoặc `AWS_EXECUTION_ENV` — cố ý, để không phải chờ timeout trên máy không phải
EC2. Thiếu nó thì app báo `BACKUP_DRIVER=s3 needs an AWS credential`. Đây **vẫn
là instance role qua IMDSv2**, không phải khoá tĩnh.

### Hai lỗi lộ ra khi chạy thật, đã vá ở `59b8485`

1. **S3 từ chối PUT vào bucket có Object Lock** nếu request không mang
   `Content-MD5` hoặc một header `x-amz-checksum-*`. `s3Dest.put` chỉ gửi
   `content-type`. Mọi upload trả 400.
2. Vá xong lỗi 1 thì S3 bắt đầu chèn `<ChecksumAlgorithm>` và `<ChecksumType>`
   vào giữa `<ETag>` và `<Size>`, làm vỡ regex trong `list()`. **Đây mới là lỗi
   nguy hiểm**: `list()` trả `[]`, mà mọi nơi gọi nó đều đọc là "không có bản
   sao lưu nào" — kể cả sàn `MIN_KEEP` của `prune()`. Lỗi có sẵn từ đầu, chỉ
   chưa lộ vì chưa object nào có checksum.

Tám phép kiểm mới trong `scripts/test-backup.mjs` chặn `fetch` để kiểm cả hai
mà không cần bucket thật. Regex cũ được **giữ lại trong test** và khẳng định là
nó tìm thấy **không gì cả** trong cùng đoạn XML đó.

### Còn đúng một việc trước khi khóa block 0

Ba lệnh nghiệm thu đã qua trên máy thật — nhưng **với bản vá chưa commit**. Sau
khi `59b8485` được self-update kéo về, phải chạy lại đúng ba lệnh đó để xác nhận
mã đã commit hành xử y hệt:

```
cd /home/ubuntu/PREPTEST
set -a; . /etc/vpet-prep.env; set +a
node scripts/backup.mjs run
node scripts/backup.mjs list
node scripts/backup.mjs restore latest --into /tmp/thu.sqlite --yes
```

Điều kiện khóa của block 0 là **đã phục hồi được từ mã đã commit**, không phải
*đã phục hồi được một lần nào đó*.

### Một rủi ro còn treo

`/home/ubuntu/vpet-selfupdate.sh` chạy `pm2 restart preptest --update-env` mà
**không** source `/etc/vpet-prep.env`. Lần này biến vẫn sống vì PM2 gộp env chứ
không thay, và `pm2 save` đã ghi xuống dump — nhưng đó là may, không phải thiết
kế. `deploy/ec2-deploy.sh` có một đoạn chú thích dài giải thích đúng cái bẫy
`--update-env` này. Script kia không nằm trong repo nên phiên này không sửa
được. Chốt chặn hiện có: cron chạy `backup.mjs check` mỗi giờ và thoát khác 0,
và banner ở Quản trị → Cài đặt chuyển đỏ.

**Cùng lỗi đó có trong chính `deploy/ec2-deploy.sh` và đã sửa**: nó chạy
`node scripts/backup.mjs run` mà không đọc env file, nên bản chụp trước mỗi lần
deploy âm thầm ghi vào `disk` trong khi mọi bản khác đi S3 — tức là chụp vào
đúng cái ổ sắp bị thay đổi, thời điểm bản sao đó ít hữu dụng nhất.

### Ba đường tự động đều tắc, và tắc đúng

| Đường | Kết quả |
|---|---|
| AWS MCP | `requires re-authorization (token expired)`, phiên không tương tác nên không chạy được OAuth |
| Credential trong container | STS trả `InvalidClientTokenId` — không phải credential của tài khoản này |
| Vai trò GitHub Actions | **Cố ý** chỉ có `ssm:SendCommand` tới một instance với một document |

## Mở lại

**Block 2, 2026-08-22 — `record()` báo thành công cho việc nó đã bỏ qua.**

`server/ability.js` `record()` trả về `events.length`, tức là số sự kiện được
*đưa vào*, không phải số được *ghi xuống*. Nó bỏ qua mọi sự kiện không có
`max_score > 0` — đúng, một sự kiện 0 trên 0 chẳng dịch chuyển ước lượng nào —
nhưng rồi vẫn báo đủ số.

Lỗi lộ ra khi dựng bài xếp lớp: bên gọi dựng sự kiện bằng tên trường camelCase
(`max` thay vì `max_score`), nên **cả 18 bị bỏ qua và hàm báo đã ghi 18**. Mô
hình năng lực rỗng trong khi đoạn mã nạp nó nói là đã xong. Mất một buổi để
tìm ra, và chỉ tìm ra bằng cách đếm dòng trong CSDL.

Sửa: trả về số **đã ghi**. Một con số không thể mâu thuẫn với thực tế thì không
phải là một con số.

Đã chạy lại đủ sáu điều kiện cho block 2 cùng lượt với block 3.5. **Đóng lại ở
`1512e15`.**

**Block 4 (và 3.5, 5, 6), 2026-08-23 — bốn trang chưa từng có gì mở ra xem.**

Chủ đầu tư gửi ảnh màn hình tab Luyện thi kèm hai nhận xét: **rất xấu**, và
**chỉ có 3 phần trong 10 phần**. Cả hai đều đúng, và cái thứ hai kéo ra một lỗi
lớn hơn cái đang được phàn nàn.

**1. Ba phần thay vì mười.** Màn hình dựng từ `/api/drills/suggest`, vốn chốt ở
ba gợi ý; bảy phần còn lại nằm sau một thẻ `<details>`. Một đề mười phần hiện
ra như một danh sách ba việc. Đã thêm `drills.overview()` và
`GET /api/drills/parts`: đủ mười phần, đọc thẳng từ `server/data/exam-formats.js`
nên đề đổi thì trang đổi theo. Sáu phần **không** luyện lẻ được (B, D là email;
G, H, I, J là nói) vẫn hiện đủ và nói rõ vì sao, thay vì bị giấu đi hoặc tệ hơn
là được gắn một cái nút bấm không ra gì.

**2. Lỗi thật: 45 nhãn rỗng trên bốn trang.** Chúng được viết bằng thuộc tính
`data-en` / `data-vi`, mà **không có dòng mã nào trên nền tảng này đọc hai
thuộc tính đó**. Quy ước là viết tiếng Anh thẳng trong HTML rồi thêm một dòng
vào từ điển `public/i18n.js`. Toàn bộ 45 phần tử đó **hiện ra trống**: trang xếp
lớp — thứ đầu tiên một học viên mới nhìn thấy — không có tiêu đề và không có
chữ trên nút bắt đầu. Năm chỗ nữa để tiếng Việt cứng giữa hai thẻ, tức là không
bao giờ rỗng mà cũng không bao giờ ra tiếng Anh.

**Vì sao cổng xanh mà vẫn lọt.** `/prep/luyen/`, `/prep/xep-lop/` và
`/prep/on-tap/` **không nằm trong danh sách của `audit.mjs`, cũng không nằm
trong danh sách của `screenshot.mjs`**. Điều kiện khóa số 4 — "ảnh chụp mới" —
đã được tính là đạt cho các block 3.5 tới 6 trong khi chưa có gì từng mở bốn
trang đó ra. Đây là lỗi của người viết điều kiện khóa, không phải của điều kiện.

Đã sửa cả ba việc: thêm bốn trang vào cả hai danh sách, và thêm một phép kiểm
mới vào `audit.mjs` — **bất kỳ tiêu đề, nút hay nhãn nào nằm trên trang mà
không hiện chữ nào**. Bỏ qua nút biểu tượng và mọi thứ có `aria-label`. Cố tình
làm rỗng lại một thẻ `<h3>` thì nó đỏ ở cả năm bề ngang và cả hai chế độ màu,
không báo nhầm ở 25 trang còn lại.

> Đáng ghi lại vì sao bản đầu của phép kiểm đó **không** bắt được gì: nó đòi
> phần tử phải có chiều cao khác 0, mà một tiêu đề rỗng co lại đúng bằng 0.
> Chính tính chất đó là lý do lỗi sống sót lâu đến vậy — một thẻ `<h2>` trống
> không để lại khoảng hở đáng ngờ nào, nó không để lại dấu vết gì cả.

Đã chạy lại đủ sáu điều kiện. **Đóng lại ở `208848d`.**

**Block 2 và 6, 2026-08-23 — tab Tiến độ và Trang chủ là cùng một trang.**

Chủ đầu tư chỉ ra hai mục menu dẫn tới cùng một chỗ. Đúng, và còn tệ hơn thế:
"Tiến độ" chưa bao giờ là một trang — nó trỏ vào `/prep/#tien-do`, một cái neo
giữa trang chủ. Bấm vào nó thì trang không đổi, chỉ cuộn.

Đã gộp thành một mục, và nhân đó **bỏ sáu trong mười hai khối** của trang chủ:
"Practice results" (một biểu đồ vẽ tay kèm nhãn *Coming soon*, tức là biểu đồ
giả của dữ liệu không có), "Next steps" (danh sách năm việc nằm ngay dưới "Việc
nên làm tiếp" — hai danh sách việc cần làm trên một màn hình), "Explore by exam"
(lưới các kỳ thi, mà nền tảng chỉ còn một kỳ), "Active codes" và "Recent
activity" (cả hai là toàn bộ nội dung của trang `/prep/code-cua-toi/`), và
"Today's focus" (gợi ý một đề, việc mà lộ trình đã làm từ mô hình năng lực chứ
không phải từ những gì tình cờ đang mở).

Thay vào đó là `server/report.js` + bốn biểu đồ SVG tự vẽ (không thêm thư viện):
thời gian học theo ngày, điểm từng bài, độ chính xác theo từng loại việc, và
mười phần của đề. Nguyên tắc của tệp đó: **nó đếm, nó không ước lượng.**
`server/ability.js` vẫn là thứ duy nhất có ý kiến về năng lực; nếu report bắt
đầu suy ra năng lực thì bảng điều khiển sẽ có hai mô hình cãi nhau ở hai thẻ
cạnh nhau.

Ba quyết định phải nói rõ:

- **Thời gian là đo, không phải đoán.** Mọi bảng hoạt động đều đã có
  `started_at` và `done_at`, nên chỉ là phép trừ.
- **Một phiên bị chặn ở 90 phút.** Tab để quên qua đêm mà tính tám tiếng thì
  biểu đồ đó mất uy tín vĩnh viễn. Chặn chứ không bỏ: phiên đó có thật.
- **Ngày cắt theo giờ Việt Nam, không phải UTC.** Gom theo UTC thì bảy tiếng
  đầu của mỗi ngày Việt Nam rơi vào cột hôm trước; ai học lúc 9 giờ tối sẽ thấy
  nó nhảy sang "hôm qua". `+07:00` cố định là **chính xác** chứ không phải xấp
  xỉ: Việt Nam bỏ giờ mùa hè từ 1975.

Và một lỗi thật lòi ra khi nhìn màn hình: thẻ lộ trình ghi
**"Chưa đo được · 6.5/10"** — một khẳng định nằm cạnh chính thứ phủ định nó.
`drills.js` gộp "chưa có dữ liệu" và "có dữ liệu nhưng chưa đủ chắc" vào cùng
một mã lý do. Nay tách thành `notMeasured` và `provisional`.

`scripts/test-report.mjs`, 42 phép kiểm. Cố tình đổi múi giờ về UTC thì ba phép
đỏ. Có một phép canh riêng chỗ **hai cách tính "hôm nay"** (JavaScript dựng lưới
ngày, SQLite gom điểm) không được lệch nhau, đối chiếu trên 400 dòng thật.

Đã chạy lại đủ sáu điều kiện. **Đóng lại ở `2f3d5b9`.**

**Block 7, 2026-08-23 — chạy trên nhiều tiến trình.**

Bậc 2 của thang mở rộng. Máy có 4 nhân, nền tảng dùng 1 — Node chạy một luồng
và server này là một tiến trình. `server/cluster.js` chẻ ra một worker mỗi nhân
và trông chúng.

Một cụm hỏng theo hai kiểu mà không kiểu nào tự báo, nên cả hai đều được rào:

**Việc chỉ được làm một lần.** Tiến trình chính chạy `secrets.load()`,
`attachBankAudio()` và cả hai seed **một mình**, xong xuôi mới chẻ. Worker thừa
hưởng một CSDL người khác đã dựng sẵn, và một `process.env` người khác đã điền
sẵn — `cluster.fork()` sao chép môi trường của tiến trình chính **tại thời điểm
chẻ**, nên `secrets.load()` gọi Secrets Manager một lần chứ không phải bốn.
Đó là hành vi có tài liệu của Node, và test chứng minh nó chứ không tin nó:
một fixture mười dòng đặt biến *sau khi khởi động* rồi đọc lại trong worker.

**Việc nền chỉ được chạy một chỗ.** Bộ quét chấm AI giữ hàng đợi trong bộ nhớ,
nên bốn bản sao sẽ cùng tìm thấy một bài chưa chấm, cùng chấm nó, và gửi **bốn
hoá đơn**. `startBackgroundJobs()` chạy trong tiến trình giám sát, không chạy ở
worker. Test đếm dòng log nó in ra và đỏ ở con số hai.

> Đây là dòng quan trọng nhất của cả block. Bỏ nó thì mọi thứ vẫn xanh, vẫn
> phục vụ đúng, và hoá đơn mô hình nhân bốn mà không ai thấy trong log.

**Mặc định là một tiến trình.** Đó mới là hình dạng thật của thay đổi này:
`WEB_CONCURRENCY` để trống thì hành xử **y hệt hôm nay**, `auto` thì tự co theo
số nhân, một con số thì lấy đúng con số đó. Một máy đang chạy nền tảng không
được phép nhân tư bộ nhớ chỉ vì nó thấy bốn nhân trong một bản cài cho việc
khác. **Con số bật nó lên, không phải đoạn mã.**

Đã thấy đỏ theo cả hai hướng trước khi tin: bỏ rào việc nền thì bộ test báo bốn
bộ quét thay vì một; đổi mặc định thành "theo số nhân" thì nó báo 4 ở chỗ phải
là 1.

Một chi tiết nhỏ đã sửa nhân đây: biểu ngữ khởi động và bản kê tài khoản quản
trị nằm trong callback của `listen()`, mà bốn worker thì `listen()` bốn lần —
tức bốn lần quét bảng admin để in cùng một cảnh báo. Chúng thuộc về lần khởi
động, không thuộc về cái socket, nên đã chuyển ra ngoài.

Điều kiện số 4 (ảnh chụp mới) không áp dụng theo nghĩa thông thường: block này
**không đổi một pixel nào**. Bộ ảnh vẫn được chụp lại trong cổng và vẫn phải
giống hệt — với một block hạ tầng thì "không có gì đổi" mới là kết quả đúng, và
một khác biệt trong ảnh sẽ là dấu hiệu có gì đó rò ra tầng giao diện.

Đã chạy lại đủ sáu điều kiện. **Mã đóng lại ở `d19490d`.**

**Block 8, 2026-08-23 — trần chi phí và trần đọc.**

Mọi giới hạn khác trên nền tảng này bảo vệ cái máy hoặc dữ liệu. Block 8 có một
giới hạn bảo vệ **tài khoản ngân hàng**, và nó là giới hạn duy nhất mà sự vắng
mặt của nó **vô hình cho tới lúc hoá đơn về**.

Rủi ro là cấu trúc, không phải giả định. Chấm bài là tự động: nộp bài → bộ quét
tìm thấy → 26 câu đi tới mô hình mà không ai quyết định gì cả. Nghĩa là chi phí
của nền tảng là hàm của số bài, là hàm của số tài khoản — **một con số kẻ tấn
công được chọn**. Đăng ký, nộp, lặp lại. Trước file này, không có một dòng nào
trên đường chấm bài hỏi một câu về tiền.

**Hai trần, vì một là không đủ.**

- *Mỗi tài khoản mỗi ngày* chặn một người trở thành cả cái hoá đơn.
- *Toàn nền tảng mỗi ngày* chặn một nghìn tài khoản mỗi cái đều lịch sự nằm dưới
  trần riêng của nó. Đây là trường hợp mà một trần đơn lẻ **bỏ sót hoàn toàn**,
  và bộ test dựng đúng nó: mười tài khoản, mỗi cái một lần gọi.

**Đếm, không ước lượng** — cùng nguyên tắc với `server/report.js`. Một dòng vào
`ai_calls` **trước khi** request rời máy, và trần đếm dòng. Đếm số bài chấm
thành công thì dễ hơn và sai theo hướng tốn tiền: một cuộc gọi timeout **sau
khi** mô hình đã sinh xong câu trả lời vẫn tính đủ tiền và không để lại dấu vết
nào. Nhà cung cấp có một buổi chiều tồi tệ sẽ tính tiền không giới hạn trong khi
màn hình báo còn rất nhiều chỗ — đúng cái khoảnh khắc mà trần sinh ra để chặn.

**Cửa sổ 24 giờ trượt, không phải ngày dương lịch.** Ngày dương lịch trả lại
toàn bộ hạn mức tại một thời điểm mà một script biết trước và ngồi đợi được.

**Chạm trần thì câu đó ở lại `pending`, không phải 0 điểm.** Ngân sách của nền
tảng không phải lỗi của thí sinh, và `server/rubric.js` đã có sẵn quy tắc: điểm
0 phải nghĩa là "không nộp gì", không bao giờ nghĩa là "không ai làm gì". Và lượt
chấm **dừng lại ở lần từ chối đầu tiên** thay vì hỏi thêm hai mươi lăm lần nữa
để nhận cùng một câu trả lời.

**Trần đọc.** Trước đây chỉ đếm ghi, và lý do nghe rất hợp lý: một GET không đổi
gì cả. Nhưng một GET vẫn tốn một vòng tới CSDL và một chỗ trên vòng lặp sự kiện
đồng bộ, nên **một script đã đăng nhập kéo cùng một bài trong vòng lặp là một
cuộc từ chối dịch vụ để lại nhật ký sạch bong** và không chạm vào bất kỳ giới
hạn ghi nào.

Ba chỗ thu hẹp, mỗi chỗ là khác biệt giữa một giới hạn có ích và một giới hạn
gây vướng: chỉ `/api/`, chỉ khi đã đăng nhập, và rộng rãi (1200/phút). Cái thứ
hai đáng nói: ẩn danh thì khoá duy nhất còn lại là địa chỉ IP, mà **một trường
học sau một NAT sẽ thành một hạn mức chung cho bốn mươi học viên**. Lụt ẩn danh
là việc của rìa mạng, và `docs/VAN-HANH.md` §4 nói rõ nó **vẫn còn nợ**, không
phải một chỗ trống ai đó tưởng đã có.

**Trần đọc tốn bao nhiêu, đo chứ không đoán.** Nó thêm một `COUNT` và một
`INSERT` vào mỗi lần đọc `/api/` đã đăng nhập:

| | ms/request |
|---|---|
| trang, tệp tĩnh (thoát sớm theo đường dẫn) | 0,0008 |
| `/api/` ẩn danh (không có phiên) | 0,0008 |
| `/api/` đã đăng nhập (bị đếm) | **0,078** |
| như trên, với 145.200 dòng trong xô | **0,065** |

Dòng cuối là dòng đáng kể, và nó suýt làm tôi sửa nhầm một chỗ. Tôi đã viết một
bản `COUNT` có `LIMIT` để chặn quét, vì lo rằng phép kiểm sẽ **đắt lên đúng lúc
người gọi bận hơn** — một cái van mà chi phí tăng theo tải nó sinh ra để chịu thì
là bộ khuếch đại, không phải cái van.

Phép đo đầu tiên có vẻ xác nhận điều đó: 0,09 ms → 2,57 ms với 60.000 dòng. **Phép
đo đó sai.** Nó đặt trần lên 100 triệu để khỏi bị chặn, nên trạng thái "60.000
dòng trong cửa sổ 60 giây" mà nó dựng ra **không thể xảy ra** với trần thật:
chạm trần thì `rateLimit()` ngừng gọi `rateLimitNote()`, nên số dòng trong cửa
sổ không bao giờ vượt `max`. Đo lại với trần thật 1200/phút: 145.200 dòng trong
xô, 1.200 dòng trong cửa sổ, **0,065 ms** — vì `idx_throttle_hits (bucket, at)`
không bao giờ chạm tới những dòng đã hết hạn.

Bản `LIMIT` đã bị **gỡ bỏ**, và còn chậm hơn bản gốc. Ghi lại trong
`server/auth.js` để lần sau không ai đi lại đúng con đường đó.

Đã thấy đỏ bốn lần trước khi tin: đếm thành công thay vì đếm ý định; bỏ trần
toàn nền tảng; `parseInt(raw,10) || 0` biến một lỗi đánh máy thành không giới
hạn; và bỏ chỗ thu hẹp `/api/`.

> Lần thứ tư đó lộ ra một phép kiểm **rỗng của chính tôi**. Nó khẳng định request
> đi qua được — mà đi qua thì lúc nào cũng đi qua khi còn dưới trần. Xoá chỗ thu
> hẹp `/api/` nó vẫn xanh. Nay nó đếm dòng trong `throttle_hits` và khẳng định
> **hạn mức không bị tiêu**, và với sửa đó thì nó đỏ đúng chỗ.

Đã chạy lại đủ sáu điều kiện. **Mã đóng lại ở `e8732cc`.**

**Phân quyền quản trị, 2026-08-24 — ba cấp thay vì hai.**

Trước đó có hai cấp: `owner`, và tất cả những người còn lại. Phép kiểm là
`role !== 'owner'` viết tay ở đúng bảy route cần nó; **bốn mươi tám route còn
lại mở cho bất kỳ ai đã đăng nhập vào khu quản trị.**

Hai cấp thì như vậy còn chạy được. Ba cấp thì không, vì một lý do đáng nói
thẳng: **một phép kiểm vai trò rải khắp năm mươi route hỏng âm thầm và hỏng về
phía nguy hiểm.** Thêm một route rồi quên phép kiểm — nó không lỗi, nó *chạy*,
cho tất cả mọi người, và không có gì báo. Lỗi vô hình chính vì tính năng vẫn
hoạt động.

Nên `server/roles.js` giữ **một bảng năng lực** và mỗi route khai báo nó cần
năng lực nào:

| Cấp | Làm được |
|---|---|
| `owner` — **Quản trị** | tất cả; là cấp **duy nhất** tạo được tài khoản quản trị, giữ khoá mô hình, phục hồi sao lưu |
| `manager` — **Quản lý** | vận hành: học viên, mã kích hoạt, đề thi, ngân hàng câu hỏi, nhật ký |
| `teacher` — **Giáo viên** | giảng dạy: xem báo cáo, soạn câu hỏi, chấm lại bài. Không đụng tiền, không sửa tài khoản |

Hai ranh giới đều gây tranh cãi nên viết rõ vì sao:

- **Giáo viên SOẠN được câu hỏi nhưng không DUYỆT được.** Soạn câu hỏi là công
  việc; quyết định một câu hỏi đủ chuẩn để vào đề thi thật của một thí sinh là
  một phán đoán khác. Tách ra thì trường có một bước duyệt, không thì phải tin
  nhau. Vì thế `bank.write` và `bank.publish` là hai năng lực.
- **Quản lý không đọc được bí mật.** Không phải vì kém tin cậy — họ phát được
  mã, tức là tiền — mà vì khoá mô hình và thông tin sao lưu là hai thứ mà rò rỉ
  rồi thì **thu hồi cái gì cũng không cứu được**. Bán kính thiệt hại quyết định
  cấp, không phải thâm niên.

`scripts/test-roles.mjs` đọc **stack Express đang chạy** và đỏ nếu bất kỳ route
`/api/admin` nào không khai báo năng lực; chín route tự-phục-vụ (đăng nhập, đổi
mật khẩu của chính mình, 2FA) nằm trong một danh sách viết tay, để **thêm vào
danh sách đó là một quyết định nhìn thấy trong diff** chứ không phải một chỗ bỏ
sót. Nó kiểm cả chiều ngược: không có ngoại lệ chết, không có năng lực nào route
đòi mà `roles.js` không định nghĩa, và không có năng lực nào định nghĩa rồi
không ai dùng.

### Hai lỗi thật lòi ra khi làm

**`GET /admin/settings` trả về danh sách toàn bộ tài khoản quản trị.** Route đó
mọi cấp đều đọc được — giáo viên cũng mở màn hình đó để đổi mật khẩu của chính
mình — nên một giáo viên sẽ được đưa tận tay tên đăng nhập và cấp của mọi quản
trị viên. Đã chuyển sang `GET /admin/admins`, sau `admins.manage`.

**Và cái rào "người owner cuối cùng" đầu tiên tôi viết không bao giờ chạy
được.** Chỉ owner mới quản lý được tài khoản quản trị, nên người thao tác *luôn
luôn* là một owner khác, và "đếm số owner khác" không bao giờ bằng 0. Nó trông
như một tấm lưới an toàn và không bắt được gì.

Cái nó bỏ sót là **hai owner thao tác cùng lúc**: A ngưng B trong khi B ngưng A,
mỗi bên đều thấy bên kia là người sống sót, cả hai đều được cho qua, cả hai lệnh
ghi đều xuống, và nền tảng không còn ai đăng nhập được. Nay phép kiểm là **hậu
điều kiện nằm trong transaction**: ghi xong rồi mới hỏi "còn owner nào đang hoạt
động không?", không thì rollback. Đã kiểm bằng cách ép nó chạy — transaction lùi
lại và thao tác bị từ chối 400.

> Nói thẳng một điều bộ test **không** chứng minh: cặp request chạy song song
> trong test không ép được đúng thứ tự đan xen đó. Node phục vụ hai request trên
> một luồng nên phần lớn lần chạy ra 200 rồi 401. Khẳng định trong test là về
> **bất biến** — dù hai lệnh rơi kiểu gì thì vẫn phải còn một owner đăng nhập
> được — chứ không phải bằng chứng hậu điều kiện đã nổ.

### Giao diện, và ba lỗi nữa chỉ lộ khi chạy thật

Chạy màn hình quản trị bằng trình duyệt thật ở **cả ba cấp** tìm ra ba thứ mà
unit test không thấy: lệnh gọi `/admin/me` nằm **dưới** thanh sub-tab mà nó phải
lọc (nên sub-tab dựng từ danh sách năng lực rỗng); ba thẻ chỉ-owner dưới tab
Platform vẫn được chèn cho mọi cấp rồi mỗi thẻ tự gọi API của nó (ba lần 403 và
ba cái thẻ trống); và tệ nhất — panel Plans bị **gỡ khỏi DOM** với cấp không có
`settings.write` mà đoạn mã sau đó vẫn ghi `innerHTML` vào, tức một null
dereference chặn đứng mọi dòng phía sau, kể cả những dòng cấp đó *cần*.

`scripts/accounts.js set-level` là đường về. Màn hình từ chối tạo ra trạng thái
"không còn owner", nhưng một bản phục hồi, một lần sửa tay hay một lỗi vẫn tạo
ra được — và khi đã ở đó thì **không ai còn `admins.manage` để cấp lại cho ai**.
Lệnh này trả lời người cầm máy chủ, không trả lời người cầm phiên đăng nhập, và
nó giữ đúng bất biến kia nên không tự tạo ra được cái trạng thái nó sinh ra để
sửa.

_(ghi vào đây mỗi lần một block đã khóa bị mở ra sửa: block nào, vì sao, commit
nào đóng lại)_
