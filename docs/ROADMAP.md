# Lộ trình xây nền tảng VPET Prep

Hai hàng đợi tách riêng:

- **Hàng đợi** — việc lặp, tốn thời gian, làm được không cần bàn bạc (nhồi dữ liệu,
  soạn nội dung theo mẫu). Phiên tự động chạy mỗi giờ (Routine) **chỉ lấy việc ở đây**:
  mỗi lượt đúng một mục chưa tick ở đầu danh sách, làm xong, kiểm thử, commit, push, tick.
- **Việc kiến trúc** — thiết kế hệ thống, đổi lược đồ, engine. Làm trực tiếp cùng người
  dùng, **Routine không đụng vào**.

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
- [x] Nối 4 màn auth + màn Tài khoản vào API học viên: bỏ `PrepAuth`/`PrepAccounts` localStorage, dựng thêm màn `/prep/dat-lai-mat-khau/`, guard phía server cho trang cần đăng nhập
- [x] Nghiên cứu cơ cấu và cách chấm 6 kỳ thi + thiết kế engine chấm điểm (`docs/SCORING.md`)
- [x] Thiết kế khu tự học: định mức từ vựng A1–C2, nguồn dữ liệu mở, lược đồ (`docs/LEARNING.md`)
- [x] Bảng động từ bất quy tắc V1–V2–V3 (193 từ) + lớp TTS Anh/Mỹ dùng chung
- [x] Engine format đề chuẩn: 11 format của 6 kỳ thi + phân tích độ phủ ngân hàng + sinh đề một chạm

### Việc soạn nội dung (Routine làm tiếp từ đây)

- [x] Linking words: 123 mục theo chức năng × độ trang trọng, kèm vị trí trong câu, dấu câu và cảnh báo lạm dụng
- [x] Ngữ pháp 12 thì: công thức, khi dùng / khi không dùng, phân biệt cặp dễ nhầm, lỗi người Việt hay mắc, 8 ví dụ + 12 câu luyện mỗi thì
- [x] Ngữ pháp nhóm danh từ – mạo từ – lượng từ, bậc A1–A2 (14 điểm: số nhiều, đếm được, a/an/the/zero, this–that, some–any, sở hữu cách, much–many, a few–a little, danh từ ghép, there is–are, đơn vị đo)
- [x] Ngữ pháp nhóm danh từ – mạo từ – lượng từ, bậc B1–C2 (14 điểm: few/little không có "a", all–both–whole, each–every, danh từ tập hợp, mạo từ với tên riêng, danh từ đổi nghĩa theo tính đếm được, lượng từ với "of", no–none–neither, mạo từ khái quát, zero article học thuật, lượng từ trang trọng, hoà hợp chủ ngữ với cụm lượng, mạo từ trong thành ngữ, danh từ hoá) — nhóm này đủ 28/28 điểm theo hạn mức
- [x] Ngữ pháp động từ khuyết thiếu bậc A1–B1 (14 điểm: can, can/could xin phép, must/mustn't, have to, should, may/might, would like, could quá khứ, must khác have to, suy đoán, should/ought to/had better, used to, xin phép theo độ trang trọng, be able to)
- [x] Ngữ pháp động từ khuyết thiếu bậc B2–C2 (15 điểm: suy đoán quá khứ, should have, needn't have khác didn't need to, could have, would đa chức năng, khuyết thiếu bị động, thang chắc chắn, hedging học thuật, may well / might as well, bán khuyết thiếu với "be", shall, lùi thì để lịch sự, cụm cố định, was to have done, lược bỏ sau khuyết thiếu) — nhóm này đủ 29/29 điểm
- [x] Ngữ pháp câu điều kiện bậc A2–B2 (11 điểm: loại 0, loại 1, loại 2, unless và các liên từ điều kiện, wish hiện tại, biến thể loại 1, loại 3, wish quá khứ và wish + would, điều kiện hỗn hợp, would rather / it's time, các cách nói điều kiện khác)
- [x] Ngữ pháp câu điều kiện bậc C1–C2 (9 điểm: đảo ngữ điều kiện, but for / if it were not for, thức giả định trong mệnh đề that, điều kiện ngầm, otherwise trong lập luận, lest, rào đón bằng điều kiện trong bài học thuật, sắc thái tiếc nuối và trách móc, lược bỏ trong câu điều kiện) — nhóm này đủ 20/20 điểm
- [ ] Ngữ pháp nhóm bị động – tường thuật – mệnh đề quan hệ
- [ ] Ngữ pháp nhóm đảo ngữ – nhấn mạnh – sắc thái và độ trang trọng
- [ ] Nhập từ vựng NGSL (~2.800 từ) → `vocab_entries`, gán bậc A1–B1 theo hạng tần suất
- [ ] Nhập từ vựng NAWL (~960 từ học thuật) + TSL (~1.200 từ TOEIC), gán bậc B2–C1
- [ ] Nhập câu ví dụ song ngữ Anh–Việt từ Tatoeba, ghép vào từng nghĩa
- [ ] Bổ sung nghĩa và phiên âm Anh/Mỹ từ Wiktextract cho toàn bộ từ đã nhập
- [ ] Collocations: trích từ corpus bằng thống kê đồng hiện, lọc tay, gán bậc

## Việc kiến trúc

Routine **không** lấy việc ở mục này.

- [ ] Lược đồ từ vựng: `vocab_entries` / `vocab_senses` / `vocab_examples` / `vocab_forms` / `collocations` + trình nhập
- [x] Lược đồ ngữ pháp: `grammar_points` / `grammar_examples` (dựng cùng mục 12 thì, theo đúng đặc tả `docs/LEARNING.md` mục 6; `linking_words` đã dựng cùng mục từ nối)
- [ ] API kích hoạt code phía server (`POST /api/redeem`) + rate-limit chống dò mã, thay `PrepState.redeem`
- [ ] Màn học từ vựng có lặp lại ngắt quãng (SM-2 rút gọn) + bảng `learn_progress`
- [ ] Engine chấm điểm: `attempts` + chấm trắc nghiệm/điền từ + bảng quy đổi theo kỳ thi (`docs/SCORING.md` mục 2)
- [ ] Engine làm bài: khung làm bài theo phần, đồng hồ từng phần, tự lưu tiến độ, nộp bài
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
                        # (test-admin, test-auth, test-catalog, test-user-api, test-learn)
SKIP_SHOTS=1 npm run verify   # bản nhanh, bỏ bước chụp ảnh
```

Lệnh trả mã thoát khác 0 nếu có bước đỏ. Chỉ push khi nó xanh.

Quy trình một lượt:

1. `git fetch origin` và `git pull --rebase origin claude/prep-test-platform-design-fpiuqn`.
2. Nếu commit gần nhất mới dưới 15 phút: có thể có phiên khác đang làm, bỏ lượt, thoát êm.
3. Lấy mục chưa tick đầu tiên ở **"Hàng đợi"**. Làm đúng một mục đó.
   Tuyệt đối không lấy việc ở mục "Việc kiến trúc".
4. Chạy `npm run verify`. Đỏ thì sửa; không sửa được thì `git checkout -- .`, ghi lý do vào
   "Vướng mắc" bên dưới, commit riêng ghi chú đó rồi thoát. Không push code hỏng.
5. Tick ô đã xong, cập nhật README nếu có tính năng mới, commit và push.

Giới hạn: không đụng `data/` (dữ liệu chạy), không commit mật khẩu hay khoá bí mật, không
force-push, không tạo pull request, không đổi nhánh.

## Vướng mắc

_(phiên tự động ghi lại đây nếu bị chặn)_
