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
| 0 | Sao lưu và phục hồi CSDL | ⬜ chưa bắt đầu | — | — |
| 1 | Nới trần rẻ tiền (pragma, cache, nén) | ⬜ chưa bắt đầu | — | — |
| 2 | Mô hình năng lực (`skill_events` + `server/ability.js`) | ⬜ chưa bắt đầu | — | — |
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

| Ngày | Commit | Máy | `/healthz` | tệp tĩnh | `/api/catalog` | ghi tự-commit |
|---|---|---|---|---|---|---|
| 2026-08-21 | `9366f3b` | 4 nhân, đĩa cục bộ | 3.955 req/s | 1.915 req/s | 1.150 req/s | 4.060/s (`FULL`) |

Đây là **đường cơ sở**, đo trước khi bắt đầu block 0. Diễn giải đầy đủ — gồm cả
đuôi p99 4,1 giây ở 200 luồng, và vì sao thông lượng phẳng từ 25 luồng trở lên —
ở `docs/KE-HOACH-XAY.md` §0.

Máy đo không phải máy production: ổ ở đây nhanh hơn EBS gp3, nên cột ghi trên
production sẽ thấp hơn. Phải đo lại trên chính máy đó trong block 0.

## Mở lại

_(ghi vào đây mỗi lần một block đã khóa bị mở ra sửa: block nào, vì sao, commit
nào đóng lại)_
