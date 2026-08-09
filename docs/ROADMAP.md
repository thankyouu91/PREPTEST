# Lộ trình xây nền tảng VPET Prep

Đây là **hàng đợi công việc** cho phiên tự động chạy mỗi giờ (Routine).
Quy tắc: mỗi lần chạy làm **đúng một mục chưa tick** ở đầu danh sách, làm cho xong,
kiểm thử, commit, push, rồi tick vào ô đó. Không nhảy cóc, không tự thêm việc ngoài danh sách.

Nhánh làm việc: `claude/prep-test-platform-design-fpiuqn`

## Hàng đợi

- [x] Frontend giai đoạn 1: 12 màn học viên, token white-label, dark mode, CSP nghiêm ngặt
- [x] Tài khoản học viên demo `student` + kho tài khoản phía client
- [x] Dashboard học viên đầy đủ sau đăng nhập
- [x] Backend quản trị: SQLite, phiên đăng nhập, CSRF, chống dò mật khẩu, nhật ký thao tác
- [x] API quản trị: báo cáo, đề thi, ngân hàng câu hỏi, học viên, code, cài đặt
- [x] Giao diện quản trị: đăng nhập, báo cáo, danh sách đề, trình xây đề, ngân hàng câu hỏi, học viên, code, quản trị + ảnh nghiệm thu
- [ ] Nhập câu hỏi hàng loạt từ CSV trong màn Ngân hàng câu hỏi (tải mẫu, xem trước, báo lỗi từng dòng)
- [ ] Chuyển trang học viên từ `public/prep/_mock.js` sang đọc `GET /api/catalog`, giữ nguyên markup và các trạng thái loading/empty
- [ ] API học viên thật: đăng ký, đăng nhập, xác thực email, phiên cookie (scrypt như khu quản trị) — thay `PrepAuth` phía client
- [ ] API kích hoạt code phía server (`POST /api/redeem`) + rate-limit chống dò mã, thay `PrepState.redeem`
- [ ] Engine làm bài: khung làm bài theo phần, đồng hồ từng phần, tự lưu tiến độ, nộp bài
- [ ] Chấm tự động phần trắc nghiệm và điền từ, lưu kết quả theo lần làm
- [ ] Màn kết quả cho học viên: điểm từng phần, phân tích 4 kỹ năng, lịch sử các lần làm
- [ ] Chấm phần Viết và Nói: khung chấm theo tiêu chí + chỗ cắm dịch vụ chấm
- [ ] Tích hợp thanh toán VNPay/MoMo ở chế độ sandbox, tự sinh code sau khi thanh toán thành công
- [ ] Rà soát bảo mật toàn hệ: security headers, rate-limit toàn API, kiểm tra phân quyền từng endpoint
- [ ] Kiểm thử đầu-cuối: luồng học viên và luồng quản trị chạy trong CI

## Ghi chú cho phiên tự động

- Trước khi làm: `git fetch origin` và `git pull --rebase origin <nhánh>`.
- Nếu commit gần nhất mới dưới 15 phút, khả năng có phiên khác đang làm: bỏ lượt này, thoát êm.
- Sau khi làm xong phải chạy đủ: `npm run build`, `node scripts/test-admin.mjs`,
  `node scripts/test-auth.mjs`, `node scripts/audit.mjs`, `npm run screenshot`.
- Chỉ push khi tất cả đều xanh. Nếu không sửa được thì hoàn tác thay đổi, ghi lý do vào mục
  "Vướng mắc" bên dưới rồi thoát, không push code hỏng.
- Không đụng vào `data/` (dữ liệu chạy), không commit mật khẩu hay khoá bí mật.

## Vướng mắc

_(phiên tự động ghi lại đây nếu bị chặn)_
