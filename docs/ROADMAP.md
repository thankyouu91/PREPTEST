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
- [x] Nhập câu hỏi hàng loạt từ CSV trong màn Ngân hàng câu hỏi (tải mẫu, xem trước, báo lỗi từng dòng)
- [x] Chuyển trang học viên từ `public/prep/_mock.js` sang đọc `GET /api/catalog`, giữ nguyên markup và các trạng thái loading/empty
- [x] API học viên thật: đăng ký, đăng nhập, xác thực email, quên/đặt lại mật khẩu, phiên cookie `prep_user` (scrypt như khu quản trị)
- [ ] Nối 4 màn auth + màn Tài khoản vào API học viên: bỏ `PrepAuth`/`PrepAccounts` localStorage, dựng thêm màn `/prep/dat-lai-mat-khau/`, guard phía server cho trang cần đăng nhập
- [ ] API kích hoạt code phía server (`POST /api/redeem`) + rate-limit chống dò mã, thay `PrepState.redeem`
- [ ] Engine làm bài: khung làm bài theo phần, đồng hồ từng phần, tự lưu tiến độ, nộp bài
- [ ] Chấm tự động phần trắc nghiệm và điền từ, lưu kết quả theo lần làm
- [ ] Màn kết quả cho học viên: điểm từng phần, phân tích 4 kỹ năng, lịch sử các lần làm
- [ ] Chấm phần Viết và Nói: khung chấm theo tiêu chí + chỗ cắm dịch vụ chấm
- [ ] Tích hợp thanh toán VNPay/MoMo ở chế độ sandbox, tự sinh code sau khi thanh toán thành công
- [ ] Rà soát bảo mật toàn hệ: security headers, rate-limit toàn API, kiểm tra phân quyền từng endpoint
- [ ] Kiểm thử đầu-cuối: luồng học viên và luồng quản trị chạy trong CI

## Ghi chú cho phiên tự động

**Quan trọng — phiên mới clone repo sạch, chưa có `node_modules`.** Đừng chạy lẻ từng lệnh test,
hãy dùng đúng một lệnh sau, nó tự cài dependency, tự bật/tắt server và chạy hết mọi bước:

```bash
npm run verify          # cài deps → build → chạy server → 5 bộ test → audit → chụp ảnh
SKIP_SHOTS=1 npm run verify   # bản nhanh, bỏ bước chụp ảnh
```

Lệnh trả mã thoát khác 0 nếu có bước đỏ. Chỉ push khi nó xanh.

Quy trình một lượt:

1. `git fetch origin` và `git pull --rebase origin claude/prep-test-platform-design-fpiuqn`.
2. Nếu commit gần nhất mới dưới 15 phút: có thể có phiên khác đang làm, bỏ lượt, thoát êm.
3. Lấy mục chưa tick đầu tiên ở "Hàng đợi". Làm đúng một mục đó.
4. Chạy `npm run verify`. Đỏ thì sửa; không sửa được thì `git checkout -- .`, ghi lý do vào
   "Vướng mắc" bên dưới, commit riêng ghi chú đó rồi thoát. Không push code hỏng.
5. Tick ô đã xong, cập nhật README nếu có tính năng mới, commit và push.

Giới hạn: không đụng `data/` (dữ liệu chạy), không commit mật khẩu hay khoá bí mật, không
force-push, không tạo pull request, không đổi nhánh.

## Vướng mắc

_(phiên tự động ghi lại đây nếu bị chặn)_
