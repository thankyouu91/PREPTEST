# Trạng thái block — cái gì đã khóa, khóa lúc nào

Thiết kế nằm ở `docs/KE-HOACH-XAY.md`. Tệp này chỉ ghi **tình hình**: block nào
đã qua đủ sáu điều kiện khóa, ở commit nào, và số đo hiệu năng tại thời điểm đó.

Sáu điều kiện khóa (chi tiết ở `docs/KE-HOACH-XAY.md` §1.2), rút gọn:

1. `npm run verify` xanh · 2. có test riêng, **đã từng nhìn thấy đỏ** ·
3. `loadprobe` không tụt >15% · 4. ảnh chụp mới · 5. vẫn chỉ một dependency ·
6. có dòng trong bảng dưới đây

> **Đã khóa nghĩa là không sửa tệp của block đó ở block sau.** Cần sửa thì ghi
> một dòng "mở lại" vào mục cuối tệp, chạy lại đủ sáu điều kiện, rồi mới đi tiếp.

## Bảng

| Block | Nội dung | Trạng thái | Commit khóa | Ngày |
|---|---|---|---|---|
| 0 | Sao lưu và phục hồi CSDL | 🟡 đang làm — mã và 43 phép kiểm xong; **chờ việc trên AWS**, xem mục cuối | — | — |
| 1 | Nới trần rẻ tiền (pragma, cắt trang sẵn) | 🔒 **đã khóa** | `87b05ce` | 2026-08-21 |
| 2 | Mô hình năng lực (`skill_events` + `server/ability.js`) | 🔒 **đã khóa** | `87b05ce` | 2026-08-21 |
| 3 | Rubric và đánh giá sau bài thi | ⬜ chưa bắt đầu | — | — |
| 4 | Luyện theo từng Part, đề random | ⬜ chưa bắt đầu | — | — |
| 5 | Từ vựng B1–C2 qua viết câu và áp dụng từ | ⬜ chưa bắt đầu | — | — |
| 6 | Lộ trình ôn tập sinh tự động | ⬜ chưa bắt đầu | — | — |
| 7 | Nhiều tiến trình (`cluster`) | ⬜ chưa bắt đầu | — | — |
| 8 | Chống lạm dụng và DDoS | ⬜ chưa bắt đầu | — | — |

Ký hiệu: ⬜ chưa bắt đầu · 🟡 đang làm · 🔒 đã khóa · 🔓 đã mở lại

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

## Việc cần quyền trên AWS mới xong được

Ba việc dưới đây là phần còn thiếu của **block 0**, và không phiên nào làm được
nếu không có quyền tương ứng. Ghi ra đây để không ai tưởng block 0 đã xong.

1. **Một bucket S3 riêng cho bản sao lưu, bật versioning + object lock.**
   Object lock là điểm mấu chốt, không phải trang trí: một bản sao lưu mà kẻ
   chiếm được quyền của server xoá đi được thì không tính là bản sao lưu.
2. **Quyền cho instance role** — `s3:PutObject`, `s3:GetObject`,
   `s3:ListBucket`, `s3:DeleteObject`, giới hạn trong đúng prefix đó, và
   `/etc/vpet-prep.env` có `BACKUP_DRIVER=s3`, `BACKUP_BUCKET`, `AWS_REGION`.
   Không dùng khoá tĩnh: EC2 instance metadata (IMDSv2) đã được
   `server/aws-sigv4.js` hỗ trợ và tự xoay vòng.
3. **Chạy `sudo … bash deploy/install-backup-cron.sh`, rồi phục hồi thử thật.**
   Điều kiện khóa của block 0 là *đã phục hồi được*, không phải *đã chạy được
   lệnh sao lưu*.

## Mở lại

_(ghi vào đây mỗi lần một block đã khóa bị mở ra sửa: block nào, vì sao, commit
nào đóng lại)_
