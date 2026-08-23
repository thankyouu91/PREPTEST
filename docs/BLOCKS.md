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

Hàng mở lại block 4, so với **đường cơ sở**: `/healthz` +3,8%, tệp tĩnh −3,7%,
`/prep/landing/` +84%, `/api/catalog` +5,9%. Không route nào quá ngưỡng 15%.

So với **hàng liền trước** thì tệp tĩnh −9,7%, và lần này có một phần nguyên
nhân đo được chứ không phải suy đoán: CSS tăng từ 71.814 lên 73.795 byte
(**+2,76%**) vì mấy lớp `.part-*` mới của thẻ phần thi. 2,76% không giải thích
hết 9,7%, phần còn lại nằm trong sai số ±4,5% đã đo ở block 3. Ghi ra đây để
lần khóa sau còn có cái mà so: nếu đường tệp tĩnh tiếp tục tụt trong khi CSS
không to thêm nữa thì lúc đó mới là chuyện khác.

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

_(ghi vào đây mỗi lần một block đã khóa bị mở ra sửa: block nào, vì sao, commit
nào đóng lại)_
