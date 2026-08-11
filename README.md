# VPET Prep — Frontend nền tảng luyện thi thử (Giai đoạn 1)

Giao diện nền tảng luyện thi thử (mock test) cho 6 nhóm chứng chỉ tiếng Anh:
**VEPT · VPET · OTE · TOEIC · IELTS · PTE**.
Cơ chế truy cập: đăng ký tài khoản → mua/nhập code → mở khoá bài thi.

> **Phạm vi hiện tại: khu học viên và khu quản trị đều chạy trên backend thật.**
> Engine làm bài đã có phần máy chủ (mở lượt thi, đồng hồ từng phần, nghe lại có hạn,
> ghi âm, nộp bài, trừ lượt theo gói); màn làm bài cho học viên và phần chấm điểm chưa có.
> Danh mục đọc từ `GET /api/catalog`; tài khoản học viên có đăng ký / đăng nhập / xác thực
> email / đặt lại mật khẩu thật với phiên cookie. Kích hoạt code còn ở phía client.

## Chạy thử

```bash
npm install
npm run build     # build Tailwind → public/tailwind-built.css
npm start         # http://localhost:3000
```

Lệnh khác:

| Lệnh | Việc |
|---|---|
| `npm run dev` | chạy server với `--watch` |
| `cai-dat\chay-server.bat` | **Windows**: nhấn đúp để chạy — tự kiểm tra Node, cài thư viện, build CSS, bật server và mở trình duyệt. Xem [`cai-dat/README.md`](cai-dat/README.md) |
| `npm run build` | build lại CSS (**bắt buộc chạy + commit sau khi thêm class mới**) |
| `npm run screenshot` | chụp desktop + mobile mọi màn vào `docs/screenshots/`, báo lỗi console/CSP |
| `node scripts/audit.mjs` | audit tràn ngang, tương phản WCAG AA, nút xuống dòng, chiều cao nav (light + dark, 5 bề rộng) |
| `node scripts/test-auth.mjs` | kiểm thử luồng tài khoản trên giao diện: đăng ký, đăng nhập, guard, xác thực email, đặt lại mật khẩu |
| `node scripts/test-admin.mjs` | kiểm thử API quản trị: phiên, CSRF, phân quyền, CRUD, sinh đề, cấp code |
| `node scripts/test-catalog.mjs` | kiểm thử trang học viên đọc `/api/catalog` + nhánh dự phòng khi API hỏng, và bảng giá ở trang giới thiệu đọc từ `plans.js` (đổi giá ở máy chủ thì trang phải đổi theo) |
| `node scripts/test-user-api.mjs` | kiểm thử API tài khoản học viên: đăng ký, đăng nhập, xác thực email, đặt lại mật khẩu, CSRF, chống dò |
| `node scripts/tai-khoan.js xem` | **Vào không được?** Liệt kê tài khoản quản trị và trạng thái học viên demo. Đặt lại bằng `dat-lai-admin` / `dat-lai-student`, mở khoá bằng `mo-khoa`. Trên Windows nhấn đúp `cai-dat\tai-khoan.bat` |
| `node scripts/test-taikhoan.js` | kiểm thử đường cứu hộ tài khoản (tự phục hồi tài khoản demo, đặt lại mật khẩu quản trị) |
| `node scripts/test-exam.mjs` | kiểm thử engine làm bài: mở/nối lại lượt thi, đồng hồ từng phần, số lần nghe lại đếm ở máy chủ, ghi âm câu trả lời, nộp bài, hạn mức lượt của gói Starter, và **đáp án không lọt ra trình duyệt** |
| `node scripts/test-learn.mjs` | kiểm thử khu tự học: chất lượng dữ liệu động từ bất quy tắc, từ nối và hai nhóm ngữ pháp (nhóm khớp hình thái, ví dụ chứa đúng mục từ, đủ bốn lát cắt, chỗ trống khớp đáp án, đúng hạn mức bậc) + bộ lọc bốn trang |
| `node scripts/xuat-supabase.mjs --count` | xuất nội dung ra Supabase (SQL hoặc JSON) — xem [Bản sao nội dung trên Supabase](#bản-sao-nội-dung-trên-supabase) |
| `npm run screenshot:admin` | chụp các màn quản trị |
| `npm test` | chạy cả bảy bộ kiểm thử |

## Khu quản trị (backend thật)

Truy cập `/admin/`. Dữ liệu nằm trong SQLite nhúng (`node:sqlite`, không cần dependency native),
file `data/prep.sqlite` tự tạo và seed ở lần chạy đầu — thư mục `data/` không đưa vào git.

Tài khoản quản trị khởi tạo: `admin` / `Admin@123456` (in ra console kèm cảnh báo).
Đặt `ADMIN_PASSWORD` để dùng mật khẩu khác; ở `NODE_ENV=production` server **từ chối khởi động**
nếu chưa có tài khoản nào và cũng không có `ADMIN_PASSWORD`.

### Các màn

| Màn | Đường dẫn | Nội dung |
|---|---|---|
| Tổng quan | `/admin/` | **Việc cần làm** xếp theo mức khẩn; 4 chỉ số so với kỳ liền trước; phễu học viên; biểu đồ 7/30/90 ngày; cung–cầu theo kỳ thi; doanh thu theo gói; thao tác gần đây |
| Đề thi | `/admin/de-thi/` | Danh sách, lọc theo kỳ thi và trạng thái, tạo thủ công, **sinh đề tự động** |
| Format đề | `/admin/format/` | 11 format chuẩn của 6 kỳ thi, phân tích độ phủ ngân hàng, **sinh đề một chạm** |
| Xây đề | `/admin/de-thi/:id/` | Sửa thông tin, thêm/xoá phần, chọn câu từ ngân hàng, bốc lại cả phần, phát hành |
| Ngân hàng câu hỏi | `/admin/ngan-hang/` | Lọc đa tiêu chí, thêm/sửa câu, ngưng dùng, **nhập hàng loạt từ CSV** (tải mẫu, xem trước, báo lỗi từng dòng) hoặc JSON, **gắn MP3 cho câu Nghe / Nói** (nghe thử ngay trong danh sách, thay hoặc gỡ), **gắn nhãn phần thi VPET (A–J)** — lọc theo phần, lọc riêng câu chưa gắn phần |
| Học viên | `/admin/hoc-vien/` | Tìm kiếm, xem code và đơn, ghi chú, khoá/mở, đánh dấu xác thực, cấp code |
| Code | `/admin/code/` | Lô code, cấp theo lô hoặc cho một học viên, thu hồi, xuất CSV |
| Quản trị | `/admin/quan-tri/` | Thương hiệu, giá gói, đổi mật khẩu, nhật ký thao tác |

### Format đề chuẩn

`/admin/format/` giữ cấu trúc đề thật của cả 6 kỳ thi — dữ liệu nằm trong
`server/data/exam-formats.js`, không hardcode trong giao diện.

| Kỳ thi | Trạng thái | Format |
|---|---|---|
| **VPET** | **đang xây** | 10 phần A–J, 55 câu — xem bảng dưới |
| VEPT | chưa sẵn sàng | 4 kỹ năng chuẩn VSTEP.3-5 — 80 câu, 172 phút |
| IELTS | chưa sẵn sàng | Academic trọn bài (85 câu, 164 phút) + luyện riêng Nghe / Đọc |
| TOEIC | chưa sẵn sàng | L&R đầy đủ 200 câu (120 phút), L&R rút gọn 100 câu, Speaking & Writing |
| PTE | chưa sẵn sàng | Academic trọn bài, 3 khối, 127 phút |
| OTE | chưa sẵn sàng | Module Nghe và module Đọc (thi từng module) |

**Nền tảng đang tập trung vào VPET.** Năm kỳ thi còn lại mang cờ
`families.status = 'coming_soon'`: vẫn hiện trong danh mục nhưng chưa mở bán và
chưa dựng đề. Cờ này nằm trong CSDL, trả ra ở `GET /api/catalog`, đổi được bằng
cách sửa `FAMILIES` trong `server/db.js` — bảng `families` được đồng bộ lại mỗi
lần khởi động.

Cờ đó được **thi hành ở ba chỗ**, không chỉ là nhãn hiển thị:

1. Đề seed của kỳ thi đang park nằm ở trạng thái nháp ngay từ đầu.
2. Mỗi lần khởi động, đề nào của kỳ thi đang park mà lỡ đang phát hành sẽ bị kéo
   về nháp và ghi cảnh báo ra console — CSDL cũ cũng phải tuân luật, không chỉ
   CSDL mới.
3. `POST /api/admin/tests/:id/status` từ chối phát hành đề thuộc kỳ thi đang
   park, kèm chỉ dẫn phải mở kỳ thi trong `FAMILIES` trước.

Bảng "Việc cần làm" ở màn Tổng quan cũng bỏ qua các kỳ thi đang park: chúng
không có đề đang bán là **đúng ý đồ**, không phải việc cần xử lý.

#### Format VPET — 10 phần, 55 câu

| Phần | Task | Số câu | Kỹ năng | Cần MP3 |
|---|---|---:|---|---|
| A | Sentence Completion | 10 | writing | |
| B | Passage Reconstruction | 3 | writing | |
| C | Reading Comprehension | 3 | reading | |
| D | E-Mail Writing | 2 | writing | |
| E | Dictation | 8 | listening | có |
| F | Response Selection | 8 | listening | có |
| G | Passage Comprehension | 6 | listening | có |
| H | Repeat | 10 | speaking | có |
| I | Speaking Situations | 2 | speaking | |
| J | Story Retellings | 3 | speaking | có |

Số câu từng phần là **cố định theo bảng chính thức**, không được đổi. Số phút là
mặc định của nền tảng (tổng 73 phút) vì bảng gốc không công bố thời lượng — admin
sửa được trên từng đề mà không đụng vào blueprint. Phần Nói (H, I, J) sẽ do AI
chấm; xem hàng đợi VPET trong [`docs/ROADMAP.md`](docs/ROADMAP.md).

Mỗi format khai báo tới **từng part**: Part 1 của TOEIC 6 câu mô tả tranh, Part 7
54 câu đọc hiểu, IELTS Reading Passage 3 khó nhất 14 câu… kèm dạng câu được phép
bốc (`types`) nên trình sinh đề không lấy nhầm câu tự luận vào phần trắc nghiệm.

**Phân tích độ phủ**: trước khi bấm sinh đề, mỗi khối hiện ngay ngân hàng đang có
bao nhiêu câu dùng được so với số cần. Thiếu thì nút Sinh đề khoá lại và ghi rõ
thiếu bao nhiêu — không để admin bấm rồi mới báo lỗi.

### Tệp âm thanh cho câu hỏi

VPET có năm phần phát MP3 (E, F, G, H, J) nên mỗi câu Nghe hoặc Nói gắn được một
tệp. Tải lên ngay trong màn Ngân hàng câu hỏi; nghe thử, thay tệp khác hoặc gỡ
đều tại chỗ.

Nơi lưu do biến môi trường quyết định, không phải sửa mã:

| Biến | Mặc định | Việc |
|---|---|---|
| `AUDIO_STORAGE` | `disk` | `disk` lưu vào `data/uploads/audio`; `supabase` đẩy lên Supabase Storage |
| `AUDIO_DIR` | `data/uploads/audio` | thư mục cho driver đĩa |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | — | bắt buộc khi dùng driver Supabase |
| `SUPABASE_AUDIO_BUCKET` | `exam-audio` | tên bucket |

Đĩa hợp cho lúc phát triển (không cần khoá, chạy ngay) nhưng container dựng lại
là mất; production dùng Supabase. Thêm driver thứ ba (ví dụ Google Cloud Storage)
chỉ cần viết thêm một object trong `server/storage.js`, chỗ gọi không phải sửa.

**Kiểm tra khi nhận tệp** — đây là chỗ duy nhất nền tảng nhận file từ ngoài:

- Tên tệp của client **không bao giờ được dùng**; khoá lưu trữ do server sinh ngẫu nhiên.
- Không chỉ tin `Content-Type`: server đọc mấy byte đầu, phải là `ID3` hoặc frame
  sync của MP3 thì mới nhận. Đổi tên `evil.exe` thành `song.mp3` không lọt.
- Chặn trên 10 MB trước khi ghi bất cứ đâu.
- Upload và gỡ đều qua `requireAdmin` + CSRF và đều ghi nhật ký thao tác.
- Khi trả tệp về đặt `Cache-Control: private, no-store` — audio đề thi là đáp án,
  không để nằm trong cache dùng chung.

Màn **Format đề** báo luôn phần nào còn thiếu MP3: một phần cần audio chỉ tính là
sẵn sàng khi số câu **có tệp** đủ cho phần đó, nên không sinh ra đề nghe câm.

### Sinh đề: tự động và thủ công

- **Thủ công**: tạo đề → thêm từng phần → chọn câu từ ngân hàng. Chỉ nhận câu **cùng kỳ thi và cùng
  kỹ năng** với phần đang sửa, câu sai loại bị bỏ qua và báo lại.
- **Tự động**: khai báo blueprint (phần nào, bao nhiêu câu, bao nhiêu phút) → hệ thống bốc ngẫu
  nhiên từ ngân hàng, ưu tiên câu đúng độ khó, không bốc trùng trong cùng đề. Thiếu câu thì trả lỗi
  409 kèm danh sách phần nào thiếu bao nhiêu, không tạo đề dở dang. Hộp thoại hiện sẵn số câu khả
  dụng theo từng kỹ năng trước khi bấm.
- Đề mới luôn ở trạng thái **nháp**. Chỉ phát hành được khi mọi phần đều đã có câu hỏi; đề đã phát
  hành mới xuất hiện trong `GET /api/catalog`.

### Bảo mật khu quản trị

- Mật khẩu băm bằng **scrypt** (có sẵn trong Node) + salt ngẫu nhiên, so khớp `timingSafeEqual`.
- Phiên: token ngẫu nhiên 32 byte trong cookie **HttpOnly + SameSite=Strict**; DB chỉ lưu **bản băm**
  của token nên rò rỉ DB không tái tạo được cookie. Hết hạn sau 8 giờ, dọn định kỳ.
- **CSRF** double-submit: mọi request thay đổi dữ liệu phải có header `X-CSRF-Token` trùng cookie.
- Chống dò mật khẩu: sai 5 lần theo cặp IP + tài khoản thì khoá 15 phút; thông báo lỗi giống nhau
  cho mọi trường hợp để không lộ tài khoản nào tồn tại.
- Guard **phía server** cho trang `/admin/*`: chưa đăng nhập bị chuyển hướng ngay ở tầng HTTP.
- Mọi thao tác thay đổi dữ liệu đều ghi vào bảng `audit` (ai, làm gì, lúc nào, IP).
- Toàn bộ truy vấn dùng prepared statement có tham số.

### API

Công khai: `GET /api/catalog` (kỳ thi, đề đã phát hành, gói bán — cùng shape với mock phía học viên).

Quản trị (đều cần phiên + CSRF): `/api/admin/reports` (nhận `?days=7|30|90`, trả kèm
`kpi` so sánh kỳ trước, `funnel`, `todo`, `revenueByPackage`), `/api/admin/tests` (+ `/generate`,
`/:id/status`, `/:id/sections`), `/api/admin/sections/:id` (+ `/items`, `/reshuffle`),
`/api/admin/questions` (+ `/bulk`, `/availability`, `/:id/status`), `/api/admin/users`,
`/api/admin/codes` (+ `/export`, `/:id/revoke`), `/api/admin/batches`, `/api/admin/settings`,
`/api/admin/packages/:id`, `/api/admin/password`, `/api/admin/audit`.

## Cài như ứng dụng (PWA)

Nền tảng cài được thẳng từ Chrome trên Android — không cần lên Play Store. Trên
máy tính, Chrome hiện nút cài ở thanh địa chỉ.

- `public/manifest.webmanifest` — tên, màu, lối tắt tới Thư viện đề và Khu tự học.
- `public/icons/` — sinh từ `public/favicon.svg` bằng `npm run icons`, gồm bản
  **maskable** (Android cắt icon theo hình của launcher, nên phần mark phải nằm
  gọn trong 80% ở giữa, nền lấp đầy khung).
- `public/sw.js` — service worker.
- `/prep/offline/` — màn hiện khi mất mạng.

**Service worker cố tình cache rất ít**, vì bộ nhớ đệm trên máy dùng chung là
chỗ đáp án rò ra:

| Loại | Xử lý | Vì sao |
|---|---|---|
| `/api/**` | không đụng tới | Câu hỏi, đáp án, audio và phiên đăng nhập đều ở đây. Đáp án nằm lại trong cache sẽ sống lâu hơn cái phiên được phép xem nó |
| Trang HTML | không cache | Trang nằm sau guard đăng nhập và trả `no-store`; cache lại là đưa bản chụp màn hình đã đăng nhập cho người dùng máy tiếp theo |
| `/admin/**`, `/auth/**` | không đụng tới | Khu quản trị chạy online; OAuth phải đi thẳng ra mạng |
| CSS, JS, font, icon | cache, nền tự làm mới | Không mang dữ liệu người dùng nào |

Bộ kiểm thử soi đúng chỗ này: sau khi service worker chạy, nó liệt kê toàn bộ
cache và bắt buộc không có mục nào thuộc `/api`, cũng không có trang HTML nào
ngoài trang offline.

Đổi nhận diện thương hiệu thì chạy lại `npm run icons` — nguồn duy nhất vẫn là
`favicon.svg`, mọi kích thước sinh lại theo.

## Đăng nhập bằng Google

Học viên đăng nhập bằng Google hoặc bằng email + mật khẩu như cũ. Chưa cấu hình
khoá thì nút Google **không hiện**, nền tảng chạy y như trước.

```
GOOGLE_CLIENT_ID       OAuth client id (loại Web application)
GOOGLE_CLIENT_SECRET   OAuth client secret
GOOGLE_REDIRECT_URI    tuỳ chọn; mặc định <origin>/auth/google/callback
```

Lấy khoá ở Google Cloud Console → APIs & Services → Credentials → OAuth client ID,
khai đúng redirect URI ở trên.

**Vì sao không dùng nút "Sign in with Google" quen thuộc**: nút đó nạp script từ
`accounts.google.com`, mà nền tảng chạy CSP nghiêm ngặt cấm mọi script ngoài.
Thay vì mở ngoại lệ CSP cho script bên thứ ba, toàn bộ trao đổi làm ở máy chủ:

```
/auth/google           → 302 sang Google, kèm state + nonce
/auth/google/callback  ← Google trả code, server đổi lấy id_token,
                         tìm hoặc tạo tài khoản, mở phiên
```

Trình duyệt không chạy dòng mã nào của Google và không bao giờ thấy token.

**Những chỗ đã phòng**:

- `state` chống callback giả mạo, `nonce` buộc id_token phải thuộc đúng lần đăng
  nhập này; cả hai so bằng thời gian hằng định.
- Kiểm `iss`, `aud`, `exp` và `email_verified` trên id_token. Chữ ký không kiểm
  vì token lấy trực tiếp từ endpoint của Google qua TLS ngay trên máy chủ —
  Google ghi rõ trường hợp này không cần kiểm chữ ký.
- Tham số `next` chỉ nhận đường dẫn nội bộ: chặn `//evil.example`,
  `https://…`, dấu gạch chéo ngược và ký tự điều khiển.
- Cookie `state` để `SameSite=Lax` (bắt buộc, vì cookie `Strict` không được gửi
  khi quay về từ Google); cookie phiên vẫn `Strict`.
- Callback trả về một trang chuyển tiếp nhỏ thay vì 302 thẳng: cookie phiên là
  `Strict` nên nếu redirect tiếp trong cùng chuỗi điều hướng do Google khởi
  tạo, trình duyệt sẽ không gửi cookie và học viên bị đá về màn đăng nhập.
- Ghép tài khoản theo email **chỉ khi Google xác nhận email đã xác thực**, để
  không ai chiếm được tài khoản người khác.
- Tài khoản tạo qua Google không có mật khẩu; đăng nhập bằng mật khẩu vào tài
  khoản đó sẽ được chỉ sang nút Google hoặc luồng đặt lại mật khẩu.

## Tự động hoá

`docs/ROADMAP.md` là hàng đợi công việc. Một Routine chạy **mỗi giờ** sẽ lấy mục chưa tick đầu tiên,
làm xong, chạy toàn bộ kiểm thử rồi mới commit và push lên nhánh làm việc. Nếu kiểm thử đỏ thì hoàn
tác và ghi lý do vào mục "Vướng mắc" thay vì push. Tắt Routine bất cứ lúc nào trong phần Routines.

## Tài khoản demo

| Tên đăng nhập | Mật khẩu | Ghi chú |
|---|---|---|
| `student` | `Goodmorning01` | Đăng nhập được bằng `student` hoặc `student@vpetprep.vn`. Có sẵn 1 bài VPET B1 đã mở khoá. |

Trang đăng nhập có nút **Điền sẵn tài khoản demo**.

> ⚠️ **Mật khẩu demo chỉ được đặt khi `NODE_ENV` khác `production`** (xem
> `ensureDemoStudentPassword` trong `server/auth.js`). Ở production bản seed để trống
> `pass_hash` nên không ai đăng nhập được vào tài khoản mẫu. Đừng dùng lại mật khẩu này
> ở bất kỳ hệ thống nào khác.

Tài khoản tự đăng ký nằm trong bảng `users` phía server, mật khẩu băm scrypt. Quyền mở khoá suy ra
từ các code đã kích hoạt trong CSDL, nên đổi máy vẫn còn. Đổi mật khẩu ở tab Bảo mật đăng xuất mọi
thiết bị khác.

## Khu tự học

| Màn | Đường dẫn | Nội dung |
|---|---|---|
| Động từ bất quy tắc | `/prep/hoc/dong-tu-bat-quy-tac/` | 193 động từ, tra theo V1/V2/V3 hoặc nghĩa tiếng Việt, lọc theo bậc và nhóm biến đổi, phát âm từng dạng |
| Từ nối | `/prep/hoc/tu-noi/` | 123 từ nối theo 13 chức năng × 3 mức trang trọng, kèm vị trí trong câu, quy tắc dấu câu, ví dụ song ngữ và cảnh báo dùng sai |
| Thì, phối hợp thì | `/prep/hoc/thi/` | Đủ 21 điểm A1–C2. **12 thì**: mỗi thì đủ bốn lát cắt — công thức, dùng khi nào, **không** dùng khi nào, phân biệt với thì dễ nhầm, kèm 8 ví dụ và 12 câu luyện. **9 điểm phối hợp thì**: chỗ tiếng Việt chỉ cần một chữ *đã* cho cả câu còn tiếng Anh bắt từng động từ tự mang thì. Bậc thấp lo hai vế nối bằng `and`/`but` phải chia cả hai, và vì sao có `before`/`after` thì quá khứ đơn là đủ. Bậc B1–B2 lo bộ ba thì kể chuyện (nền tiếp diễn → chuỗi việc quá khứ đơn → quá khứ hoàn thành lùi về trước), giữ mốc thì nhất quán trong cả đoạn (**lỗi trôi thì** bị trừ điểm nặng ở bài Viết), và tương lai nhìn từ quá khứ (`would`, `was going to`, `was to`). Bậc C1–C2 lo ba thì hoàn thành quanh một mốc quy chiếu (`by the time` không bao giờ đi với `will`), thì theo từng phần của bài học thuật (tổng quan / phương pháp / bàn luận), hiện tại lịch sử, và cách điều khiển một đoạn hồi tưởng |
| Danh từ, mạo từ, lượng từ | `/prep/hoc/danh-tu/` | Đủ 28 điểm A1–C2. Bậc thấp lo hình thái: số nhiều, đếm được / không đếm được, `a` – `an` – `the` – không mạo từ, `some/any`, sở hữu cách, `much/many`. Bậc cao lo sắc thái và hoà hợp: `few` khác `a few`, `each` khác `every`, danh từ tập hợp, mạo từ với tên riêng, `most of` khác `most`, zero article học thuật, `a number of` khác `the number of`, mạo từ trong thành ngữ, danh từ hoá |
| Tính từ, trạng từ, so sánh | `/prep/hoc/tinh-tu/` | 16 điểm bậc A1–B1 (nhóm còn 12 điểm B2–C2 chưa soạn). Trọng tâm là ba chỗ trật tự tiếng Anh ngược với tiếng Việt: tính từ đứng **trước** danh từ (`a red shirt`, không phải `a shirt red`), câu tả trạng thái bắt buộc có `be` (`I am hungry`), và tính từ không thêm `-s`. Kèm trạng từ tần suất, so sánh hơn và nhất (ngắn `-er`/`-est`, dài `more`/`the most`, bất quy tắc `better`/`worse`), `as … as`, trạng từ cách thức với bẫy `hard` khác `hardly`, `-ed` khác `-ing` (`I am boring` là tự nhận mình nhạt), `too` khác `very`, vị trí `enough`; bậc B1 lo trật tự nhiều tính từ, bổ nghĩa cho so sánh (`much better`, không phải `very better`), so sánh kép `the more … the better`, trật tự trạng ngữ cách thức – nơi chốn – thời gian, và tính từ ghép `a two-hour meeting` |
| Động từ khuyết thiếu | `/prep/hoc/khuyet-thieu/` | Đủ 29 điểm A1–C2. Bậc thấp: `can`, `must`, `have to`, `should`, `may`/`might`, `used to`, `be able to` — trọng tâm là sắc thái, `mustn't` là CẤM còn `don't have to` là KHÔNG CẦN. Bậc cao: nói về quá khứ bằng `have + V3` (`must have`, `should have`, `needn't have` khác `didn't need to`), hedging trong bài viết học thuật, và lùi thì để giữ khoảng cách lịch sự |
| Câu điều kiện | `/prep/hoc/dieu-kien/` | Đủ 20 điểm A2–C2. Bậc thấp: loại 0–1–2–3, điều kiện hỗn hợp, `unless`, `wish`/`if only`, `would rather`, `it's time` — trọng tâm là cơ chế lùi thì, nguồn của hai lỗi kinh điển `if … will` và `if … would`. Bậc cao: điều kiện **không còn chữ `if`** — đảo ngữ `Had I known`, `but for`, thức giả định trong mệnh đề `that`, điều kiện ngầm, `otherwise` trong lập luận, `lest`, và lược bỏ (`if so`, `if any`, `if anything`) |
| Mệnh đề quan hệ, mệnh đề phụ | `/prep/hoc/menh-de/` | Đủ 29 điểm A2–C2. Mệnh đề quan hệ: `who`/`which`/`that`, `whose`, `where`/`when`/`why`, mệnh đề xác định khác không xác định (**hai dấu phẩy đổi cả nghĩa câu**), và lược bỏ đại từ — bỏ được khi nó làm tân ngữ, không bỏ được khi làm chủ ngữ. Mệnh đề trạng ngữ: thời gian (**không dùng `will` sau `when`**), nguyên nhân, mục đích, nhượng bộ. Hai mục riêng trị hai lỗi dấu vân tay của người Việt: `Because… so…` và `Although… but…` (tiếng Việt nói đủ *Vì… nên…*, tiếng Anh chỉ được một). Bậc B2 chuyển sang **nén và nối**: rút gọn mệnh đề (`the man standing there`), giới từ đứng trước (`the house in which…`), lượng từ (`most of whom`), `which` thay cho cả mệnh đề vừa nói, `whereas` đối chiếu khác `although` nhượng bộ, `as if` + lùi thì khi chuyện không thật, trật tự `However hard he tried`, và mệnh đề danh ngữ `what` khác `that`. Bậc C1–C2 **bỏ hẳn động từ chia** mà câu vẫn chặt: mệnh đề phân từ (và lỗi **phân từ treo** — `Walking down the street, the building came into view`), cấu trúc tuyệt đối `The weather being fine…`, lược bỏ `When ready`, chủ ngữ giả `it`, `for + tân ngữ + to-V`, `so…that` khác `so that`, `in case` phòng khi khác `if` nếu, `as is well known` của văn học thuật, `whereby`/`wherein`/`whereupon`, và cách chữa câu hiểu hai nghĩa do mệnh đề gắn nhầm chỗ |
| Sắc thái, độ trang trọng, rào đón | `/prep/hoc/sac-thai/` | Đủ 33 điểm A1–C2. Phần ngữ pháp sách vở ít nói tới: **nói đúng thì chưa đủ, còn phải nói vừa phải**. Tiếng Việt đánh dấu sắc thái bằng xưng hô và tiểu từ cuối câu (*ạ*, *nhé*, *cơ mà*); tiếng Anh không có bộ đó nên chuyển sang câu hỏi gián tiếp (`Do you know where the station is` — **không đảo bên trong**), câu hỏi đuôi, từ giảm nhẹ (`a bit`, `not very`), và trạng từ rào đón. Kèm `excuse me` khác `sorry`, `I'm afraid`, bẫy `quite right` = *hoàn toàn* đúng, `seem`/`tend to`, `apparently` = *nghe nói* chứ không phải *rõ ràng*, bẫy kẻ cả của `obviously`, cụm động từ khác động từ trang trọng, từ chối bằng `not really`, và lối nói phi ngôi. Bậc C1 chuyển sang **cân cho đúng liều**: hạn định phạm vi (`Most X`, không phải `All X`), khoanh vùng bằng `to some extent` / `in principle`, và cân liều rào đón — `prove` gần như không bao giờ đúng với dữ liệu tương quan, nhưng `may possibly perhaps suggest` thì rào tới mức không còn nói gì. Kèm khuôn nhờ vả trong thư (`I would appreciate **it** if…`), góp ý phê bình cho nhã, nói giảm (`not bad` là **khen**), uyển ngữ tử tế khác uyển ngữ né tránh, ngữ pháp của văn nói, và `In my view` — không phải `According to me`. Bậc C2 lo **đọc ra điều không được nói ra**: mỉa mai nói ngược ý thật, hàm ý (`Some students passed` ⇒ không phải tất cả), tiền giả định gài sẵn trong câu hỏi (`Have you stopped…?`), phê bình nguồn học thuật, khuôn `We regret to inform you`, từ mang đánh giá ngầm (`regime` khác `government`), ngoặc kép giữ khoảng cách, câu rào đón dọn đường, thang xin lỗi, và cố ý đổi giọng |
| Đảo ngữ, nhấn mạnh, câu chẻ | `/prep/hoc/nhan-manh/` | Đủ 21 điểm B1–C2. Tiếng Việt nhấn bằng hư từ (*chính*, *mới*, *chứ*) nên trật tự câu không đổi; tiếng Anh phải xê dịch thành phần, có khi đảo cả trợ động từ. Trọng tâm là **khi nào đảo và khi nào không**: `Never have I seen…` (trạng ngữ phủ định → bắt buộc đảo) đặt cạnh `That book I have never read` (tân ngữ → tuyệt đối không đảo). Kèm câu chẻ `It is… that` và `What… is`, nhấn mạnh bằng `do`/`does`/`did`, `Not only`/`No sooner… than`/`Hardly… when`, `Only then did…`, `So great was…`, `All I want is…`, `That is what…`, và `indeed`/`whatsoever`/`by no means`. Bậc C2 nhìn ra cơ chế: **hai kiểu đảo khác hẳn nhau** — đảo trợ động từ (`Never have I seen`) và đảo toàn phần đẩy chủ ngữ xuống cuối (`Down the hill rolled the barrel`, `Gone are the days`, `Attached is…`); đảo tuỳ chọn sau `as`/`than`; và cùng một ý nói được bằng đảo ngữ (`Not once did she complain`) hoặc câu chẻ (`It was not until… that…`). Kèm đưa cụm giới từ lên đầu để nối mạch, và phủ định gián tiếp `far from` / `anything but` / `nothing short of` |
| Bị động, tường thuật | `/prep/hoc/bi-dong/` | Đủ 22 điểm A2–C2. Bậc thấp lo phần cơ khí: bị động các thì, `by`-tác nhân, khuyết thiếu, hai tân ngữ, `It is said that…`, `have/get something done`; tường thuật câu kể, câu hỏi, mệnh lệnh, chuyển đại từ và trạng ngữ, **khi nào KHÔNG lùi thì**. Bậc cao lo hàm ý của việc chọn góc nhìn: bị động học thuật, `was made TO sign`, `being done` – `having been done`, `There is said to be…`, chọn `claim` hay `point out` là chọn lập trường, tường thuật gián tiếp tự do trong văn học, `shall` nghĩa vụ trong hợp đồng, bị động giấu tác nhân (`mistakes were made`), và danh từ tường thuật + mệnh đề `that` |

**Phát âm miễn phí bằng Web Speech API** (`public/prep/learn/_tts.js`): giọng có sẵn
trong trình duyệt nên không tốn phí, không gọi mạng ngoài, không đụng CSP. Ba cách
kích hoạt — nhấn vào từ, bôi đen đoạn chữ, hoặc nút loa. Chuyển giọng **Mỹ ↔ Anh**
và chỉnh tốc độ, lưu theo trình duyệt. Máy không có giọng tiếng Anh thì hiện cảnh
báo và vẫn tra được IPA.

Kế hoạch chi tiết cho từ vựng, ngữ pháp, collocations và linking words nằm trong
[`docs/LEARNING.md`](docs/LEARNING.md) — kèm **định mức từ vựng theo bậc A1–C2** và
danh sách nguồn dữ liệu mở có giấy phép rõ ràng.

Cơ cấu và cách chấm điểm của 6 kỳ thi, cùng thiết kế engine chấm, nằm trong
[`docs/SCORING.md`](docs/SCORING.md).

## Bản sao nội dung trên Supabase

Ứng dụng **vẫn chạy SQLite nhúng** như cũ. Supabase không thay CSDL chạy — nó là bản sao
chỉ-đọc của phần *nội dung*, để chỗ khác dùng lại được (ứng dụng khác, trang tĩnh, công cụ
phân tích) mà không phải mở cổng vào máy chủ.

Dự án: `https://lyyykupmtkisppmvslao.supabase.co` — đọc qua PostgREST (`/rest/v1/<bảng>`).

| Bảng | Dòng | Nguồn | Khoá công khai đọc được? |
|---|---|---|---|
| `irregular_verbs` | 193 | `server/data/irregular-verbs.js` | có |
| `linking_words` | 123 | `server/data/linking-words.js` | có |
| `grammar_points` | 219 | 19 tệp `server/data/grammar-*.js` | có |
| `grammar_examples` | 3.552 | 19 tệp `server/data/grammar-*.js` | có |
| `exam_families` | 6 | `data/prep.sqlite` | có |
| `exam_packages` | 5 | `data/prep.sqlite` | có |
| `exam_formats` | 11 | `server/data/exam-formats.js` | có |
| `exam_tests` | 7 | `data/prep.sqlite` | **chỉ đề `published`** (5/7) |
| `exam_sections` | 20 | `data/prep.sqlite` | **chỉ phần của đề đã phát hành** (16/20) |
| `exam_questions` | 622 | `data/prep.sqlite` | **không** |
| `exam_section_items` | 278 | `data/prep.sqlite` | **không** |

Hai bảng cuối bật RLS mà **cố tình không có policy nào**, nên khoá công khai không đọc
được dòng nào — cột `answer` và `explanation` là đáp án đề thi, lộ ra là hỏng ngân hàng
câu hỏi. Chỉ service role (tức là qua máy chủ) mới thấy. Trình lint của Supabase báo
`rls_enabled_no_policy` ở hai bảng này là **đúng ý đồ**, không phải lỗi cần sửa.

Mọi bảng đều chặn ghi qua khoá công khai. **Không** đưa lên Supabase: tài khoản, phiên
đăng nhập, token, access code, đơn hàng, nhật ký thao tác — dữ liệu người dùng và bí mật
ở lại máy chủ.

Nạp lại sau khi sửa nội dung:

```bash
node scripts/xuat-supabase.mjs --ddl              # tạo bảng + RLS (chạy lại vô hại)
node scripts/xuat-supabase.mjs --data             # toàn bộ INSERT, đã ON CONFLICT DO UPDATE
node scripts/xuat-supabase.mjs --json exam_questions   # hoặc JSON để nạp qua PostgREST
```

Chạy lại chỉ cập nhật chứ không nhân đôi. Các bảng lấy từ `data/prep.sqlite` cần chạy
`npm start` một lần trước để CSDL tồn tại và đã seed.

## Bản đồ màn hình

| Route | File | Truy cập |
|---|---|---|
| `/prep/landing/` (`/` redirect về đây) | `public/prep/landing/index.html` | Công khai |
| `/prep/dang-ky/` | `public/prep/auth/dang-ky.html` | Công khai |
| `/prep/dang-nhap/` | `public/prep/auth/dang-nhap.html` | Công khai |
| `/prep/quen-mat-khau/` | `public/prep/auth/quen-mat-khau.html` | Công khai |
| `/prep/xac-thuc-email/` | `public/prep/auth/xac-thuc-email.html` | Công khai (mở được từ email) |
| `/prep/dat-lai-mat-khau/` | `public/prep/auth/dat-lai-mat-khau.html` | Công khai (cần token trong liên kết) |
| `/prep/` (dashboard) | `public/prep/index.html` | Cần đăng nhập |
| `/prep/thu-vien/` | `public/prep/library/index.html` | Cần đăng nhập |
| `/prep/mua-code/` | `public/prep/codes/mua-code.html` | Cần đăng nhập |
| `/prep/nhap-code/` | `public/prep/codes/nhap-code.html` | Cần đăng nhập |
| `/prep/code-cua-toi/` | `public/prep/codes/code-cua-toi.html` | Cần đăng nhập |
| `/prep/bai-thi/:id/` | `public/prep/test/index.html` | Cần đăng nhập (+ code để bắt đầu) |
| `/prep/tai-khoan/` | `public/prep/account/index.html` | Cần đăng nhập |
| `/prep/hoc/dong-tu-bat-quy-tac/` | `public/prep/learn/dong-tu-bat-quy-tac.html` | Cần đăng nhập |

Mỗi route khai báo trong `server.js` qua `serveHtmlWithNonce(...)`, kèm guard exact-path:
bản không có dấu `/` ở cuối được redirect **một lần** sang bản chuẩn (bản có `/` không đi vào
nhánh redirect nên không lặp vòng). File `.html` tĩnh bị chặn 404 để HTML luôn đi qua vòng chèn nonce.

## Ràng buộc kỹ thuật đang tuân thủ

- **CSP nghiêm ngặt**, đặt riêng cho từng response với nonce mới:
  `script-src 'self' 'nonce-…'`, `style-src 'self' 'nonce-…'`, `font-src 'self'`,
  `img-src 'self' data:`, `object-src 'none'`. Không CDN, không `eval`, không script ngoài.
- **CSS**: chỉ `<link rel="stylesheet" href="/tailwind-built.css">` (Tailwind đã build).
- **Font**: `Plus Jakarta Sans` **self-host** trong `public/fonts/` (woff2, subset latin +
  latin-ext + vietnamese, `font-display: swap`) → không phụ thuộc Google Fonts, CSP `'self'` trọn vẹn.
- **Icon**: một bộ inline SVG duy nhất (Lucide, stroke 1.9, `currentColor`) trong `PREP.icon()`.
  Không icon-font, không emoji trang trí.
- **JS**: vanilla, chỉ `<script>` nội bộ. Không framework, không bundler, không dependency runtime.
- **Ảnh**: không dùng ảnh ngoài; minh hoạ bằng SVG/gradient dựng từ token màu.

## Hệ màu (white-label)

Toàn bộ màu thương hiệu đi qua CSS variables trong `src/tailwind.css`:

```
--color-primary  --color-accent   --color-surface  --color-card
--color-text     --color-muted    --color-border
--color-danger   --color-success  --color-hl (#FFC94D, chỉ dùng highlight chức năng)
```

Dùng qua token: `bg-brand`, `text-accent-strong`, `bg-[color:var(--color-surface)]`,
`text-ink`, `text-muted`, `border-line`. **Không hardcode hex xanh/teal trong markup.**

Đổi màu theo tenant bằng `data-tenant` trên `<html>` (demo sẵn: `default`, `evergreen`, `sunrise`);
đổi ngay trong UI ở sidebar (nút bảng màu) hoặc Hồ sơ → Giao diện. Dark mode qua class `.dark`.

**Màu nhận diện kỳ thi** (`--exam-ielts`, `--exam-toeic`, `--exam-pte`, `--exam-vpet`, `--exam-vept`,
`--exam-ote`) cố định, **không** đổi theo tenant, và chỉ dùng cho chip/nhãn kỳ thi.

## Nguồn dữ liệu phía học viên

Danh mục đã nối API thật. Mọi trang gọi `PREP.loadCatalog()` (trong `public/prep/_mock.js`)
trước khi render:

```js
PREP.loadCatalog().then(res => {   // luôn resolve { ok, error }, không bao giờ throw
  PREP.catalogWarning(res);        // ok=false → dải cảnh báo vàng, trang vẫn chạy
  ...render...                     // PREP.families / PREP.tests / PREP.packages đã là dữ liệu thật
});
```

- Chỉ fetch **một lần** mỗi trang, các lời gọi sau dùng chung promise.
- Hỏng mạng hoặc API lỗi → giữ mảng `PREP_*` tĩnh làm **dữ liệu dự phòng**, hiện banner
  "đang hiển thị bản lưu sẵn" kèm nút tải lại. Trang không bao giờ trắng.
- `PREP.catalogSource` cho biết đang dùng `'api'` hay `'fallback'`.
- Đề chưa nhập câu hỏi trả `items: 0` → giao diện ẩn dòng "N câu" và ghi "đề đang biên soạn"
  thay vì hiện "0 câu".

Shape dữ liệu (giống hệt giữa API và dữ liệu dự phòng):

```js
examFamily = { id, name, sub, format, skills[] }
test       = { id, familyId, title, level, durationMin, skills[], comingSoon,
               sections: [{ name, type, items, minutes }], scoring, guide[] }
user       = { name, email, verified, interests[] }
accessCode = { code, unlocks: { testId? | familyId? | bundle[] }, redeemedAt, expiresAt, status }
package    = { id, name, price, familyId, desc, perks[], featured }
```

## API tài khoản học viên

Backend thật, cùng cơ chế bảo mật với khu quản trị (scrypt, phiên cookie HttpOnly,
CSRF double-submit, chống dò, ghi nhật ký). Cookie phiên là `prep_user`, tách hẳn khỏi
`prep_admin` để hai khu không dùng nhầm phiên của nhau.

| Endpoint | Việc |
|---|---|
| `POST /api/auth/register` | tạo tài khoản, mở phiên, phát token xác thực email |
| `POST /api/auth/login` | đăng nhập bằng tên đăng nhập **hoặc** email |
| `POST /api/auth/logout` | huỷ phiên hiện tại |
| `POST /api/auth/verify/send` | gửi lại liên kết xác thực (tối đa 3 lần/giờ) |
| `POST /api/auth/verify` | đổi token lấy trạng thái đã xác thực (không cần phiên) |
| `POST /api/auth/forgot` | xin liên kết đặt lại — luôn trả cùng một câu trả lời |
| `POST /api/auth/reset` | đặt lại mật khẩu bằng token, đăng xuất mọi thiết bị |
| `GET /api/me` | hồ sơ + quyền mở khoá + code + đơn hàng |
| `PATCH /api/me` | sửa tên, email, kỳ thi quan tâm (đổi email thì phải xác thực lại) |
| `POST /api/me/password` | đổi mật khẩu, đăng xuất thiết bị khác |

Quy tắc mật khẩu: tối thiểu 8 ký tự, có cả chữ và số. Token xác thực sống 48 giờ,
token đặt lại sống 2 giờ, cả hai chỉ dùng được một lần và DB chỉ lưu bản băm.

> **Chưa nối dịch vụ gửi mail.** Liên kết xác thực / đặt lại được in ra log máy chủ,
> và chỉ khi `NODE_ENV` khác `production` mới trả kèm trong response để chạy thử luồng.
> Xem `TODO(backend/mail)` trong `server/user-api.js`.

Tài khoản demo `student` được đặt sẵn mật khẩu ở môi trường không phải production;
ở production bản seed để trống `pass_hash` nên không ai đăng nhập được vào nó.

### Guard phía server

Trang cần đăng nhập (`/prep/`, `/prep/thu-vien/`, `/prep/mua-code/`, `/prep/nhap-code/`,
`/prep/code-cua-toi/`, `/prep/bai-thi/:id/`, `/prep/tai-khoan/`) đi qua `studentPage()`: chưa có
phiên thì redirect 302 về `/prep/dang-nhap/?next=…` ngay ở tầng HTTP, không để lộ khung trang rồi
mới kiểm ở client. Ngược lại `guestPage()` đưa người đã đăng nhập từ màn đăng ký / đăng nhập /
quên mật khẩu vào thẳng khu học viên.

`PREP.boot({ auth: true })` trong `_mock.js` là lớp đỡ thứ hai (cho HTML nằm trong cache): nạp
danh mục và phiên song song, chuyển hướng nếu không có phiên, rồi mới render.

Các seam còn lại:

| Seam | Vị trí | Ghi chú |
|---|---|---|
| `TODO(backend)` | `PrepState.redeem`, `demoPurchase` | Kích hoạt code và đơn demo còn ở client, dưới dạng lớp phủ trên dữ liệu server |
| `TODO(backend)` | `seenTestIds`, `notif` | Hai tuỳ chọn nhỏ chưa có API, lưu cục bộ theo tài khoản |
| `TODO(backend/mail)` | `server/user-api.js` | Chưa nối dịch vụ gửi mail |
| `TODO(backend/payment)` | `mua-code.html` | Nút thanh toán hiện chỉ mở modal demo và cấp mã miễn phí |
| `TODO(backend/exam-engine)` | `test/index.html` | Nút "Bắt đầu làm bài" mở overlay "sẽ sớm ra mắt" |

Chrome dùng chung (sidebar desktop, top-bar, bottom-nav mobile, dark mode, tenant switcher, toast)
nằm trong `public/prep/_chrome.js` — gọi `PrepChrome.mount({ title })`, không lặp markup giữa các trang.

## Thử luồng demo

- Đăng nhập bằng tài khoản `student` ở trên; gõ sai mật khẩu để xem banner lỗi.
- Đăng ký tài khoản mới bằng email bất kỳ; đăng ký lại cùng email đó để xem lỗi trùng.
- Mã code demo ở màn Nhập code: `VPET-B1MK-24TR` (hợp lệ), `IELT-AC12-96HD` (mở trọn bộ IELTS),
  `PREP-HHAN-2025` (hết hạn), `PREP-DUNG-ROI1` (đã dùng).
- Mua code demo sinh mã ngẫu nhiên có thể kích hoạt được ngay.

## Dashboard học viên (`/prep/`)

Màn hình sau khi đăng nhập, render hoàn toàn từ trạng thái thật của tài khoản. **Không có số liệu
bịa**: chưa có engine làm bài nên không có điểm số, streak hay biểu đồ giả.

| Khối | Nguồn dữ liệu |
|---|---|
| Ưu tiên hôm nay | bài đã mở khoá mà chưa xem cấu trúc; nếu chưa mở khoá bài nào thì đổi thành CTA nhập code |
| Nhắc xác thực email | `user.verified` (ẩn khi đã xác thực) |
| Bài thi của bạn | `unlockedTestIds` + `unlockedFamilyIds`, tối đa 4 thẻ, lấp ô lẻ bằng thẻ "Mở khoá thêm bài" |
| Kết quả luyện tập | empty state trung thực, chờ `TODO(backend/exam-engine)` |
| Tiến độ | tỉ lệ bài đã mở / tổng số bài + độ phủ 4 kỹ năng |
| Bước tiếp theo | checklist suy ra từ trạng thái: xác thực email, chọn kỳ thi quan tâm, kích hoạt code, xem cấu trúc đề |
| Code đang hoạt động | `myCodes` còn hạn, kèm số ngày còn lại (chip vàng khi ≤ 30 ngày) |
| Hoạt động gần đây | mốc thời gian có thật từ code đã kích hoạt và đơn đã mua |
| Khám phá theo kỳ thi | 6 kỳ thi, kỳ thi trong `interests` xếp trước |

Việc "đã xem cấu trúc đề" được ghi nhận khi mở màn chi tiết bài thi (`seenTestIds`), nên checklist
phản ánh hành vi thật chứ không phải cờ tĩnh.

## Trạng thái UI đã dựng

Mọi nơi có dữ liệu đều có đủ **loading (skeleton khớp layout) · empty · error · success**:
dashboard (chưa mở khoá bài nào), thư viện (kỳ thi chưa có đề + bộ lọc không khớp),
code của tôi (chưa có code), lịch sử đơn (chưa có đơn), các form auth (validate inline + banner lỗi),
redeem code (thành công có confetti nhẹ / sai / hết hạn / đã dùng).
Toàn bộ chuyển động tắt dưới `prefers-reduced-motion`.

## Ảnh nghiệm thu

`docs/screenshots/` — mỗi màn 1 ảnh desktop (1440px) + 1 ảnh mobile (390px), kèm biến thể
dark mode và tenant `evergreen`.

## Ngoài phạm vi giai đoạn này

Engine làm bài + chấm điểm + nội dung đề; backend (tài khoản, phiên, access code, thanh toán,
dashboard admin nhập đề, API từng màn); bảo mật (bcrypt, CSRF, rate-limit, chống brute-force
và redeem-abuse, mã hoá PII, phân quyền). Sẽ làm ở các prompt riêng.
