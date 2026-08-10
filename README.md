# VPET Prep — Frontend nền tảng luyện thi thử (Giai đoạn 1)

Giao diện nền tảng luyện thi thử (mock test) cho 6 nhóm chứng chỉ tiếng Anh:
**VEPT · VPET · OTE · TOEIC · IELTS · PTE**.
Cơ chế truy cập: đăng ký tài khoản → mua/nhập code → mở khoá bài thi.

> **Phạm vi hiện tại: khu học viên và khu quản trị đều chạy trên backend thật.**
> Chưa có engine làm bài, chưa chấm điểm.
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
| `node scripts/test-catalog.mjs` | kiểm thử trang học viên đọc `/api/catalog` + nhánh dự phòng khi API hỏng |
| `node scripts/test-user-api.mjs` | kiểm thử API tài khoản học viên: đăng ký, đăng nhập, xác thực email, đặt lại mật khẩu, CSRF, chống dò |
| `node scripts/test-learn.mjs` | kiểm thử khu tự học: chất lượng dữ liệu động từ bất quy tắc, từ nối và hai nhóm ngữ pháp (nhóm khớp hình thái, ví dụ chứa đúng mục từ, đủ bốn lát cắt, chỗ trống khớp đáp án, đúng hạn mức bậc) + bộ lọc bốn trang |
| `npm run screenshot:admin` | chụp các màn quản trị |
| `npm test` | chạy cả sáu bộ kiểm thử |

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
| Ngân hàng câu hỏi | `/admin/ngan-hang/` | Lọc đa tiêu chí, thêm/sửa câu, ngưng dùng, **nhập hàng loạt từ CSV** (tải mẫu, xem trước, báo lỗi từng dòng) hoặc JSON |
| Học viên | `/admin/hoc-vien/` | Tìm kiếm, xem code và đơn, ghi chú, khoá/mở, đánh dấu xác thực, cấp code |
| Code | `/admin/code/` | Lô code, cấp theo lô hoặc cho một học viên, thu hồi, xuất CSV |
| Quản trị | `/admin/quan-tri/` | Thương hiệu, giá gói, đổi mật khẩu, nhật ký thao tác |

### Format đề chuẩn

`/admin/format/` giữ cấu trúc đề thật của cả 6 kỳ thi — dữ liệu nằm trong
`server/data/exam-formats.js`, không hardcode trong giao diện.

| Kỳ thi | Format |
|---|---|
| VEPT · VPET | 4 kỹ năng chuẩn VSTEP.3-5 — 80 câu, 172 phút |
| IELTS | Academic trọn bài (85 câu, 164 phút) + luyện riêng Nghe / Đọc |
| TOEIC | L&R đầy đủ 200 câu (120 phút), L&R rút gọn 100 câu, Speaking & Writing |
| PTE | Academic trọn bài, 3 khối, 127 phút |
| OTE | Module Nghe và module Đọc (thi từng module) |

Mỗi format khai báo tới **từng part**: Part 1 của TOEIC 6 câu mô tả tranh, Part 7
54 câu đọc hiểu, IELTS Reading Passage 3 khó nhất 14 câu… kèm dạng câu được phép
bốc (`types`) nên trình sinh đề không lấy nhầm câu tự luận vào phần trắc nghiệm.

**Phân tích độ phủ**: trước khi bấm sinh đề, mỗi khối hiện ngay ngân hàng đang có
bao nhiêu câu dùng được so với số cần. Thiếu thì nút Sinh đề khoá lại và ghi rõ
thiếu bao nhiêu — không để admin bấm rồi mới báo lỗi.

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
| 12 thì | `/prep/hoc/thi/` | 12 thì, mỗi thì đủ bốn lát cắt: công thức, dùng khi nào, **không** dùng khi nào, phân biệt với thì dễ nhầm — kèm lỗi người Việt hay mắc, 8 ví dụ (có cả phản ví dụ kèm cách sửa) và 12 câu luyện có đáp án |
| Danh từ, mạo từ, lượng từ | `/prep/hoc/danh-tu/` | Đủ 28 điểm A1–C2. Bậc thấp lo hình thái: số nhiều, đếm được / không đếm được, `a` – `an` – `the` – không mạo từ, `some/any`, sở hữu cách, `much/many`. Bậc cao lo sắc thái và hoà hợp: `few` khác `a few`, `each` khác `every`, danh từ tập hợp, mạo từ với tên riêng, `most of` khác `most`, zero article học thuật, `a number of` khác `the number of`, mạo từ trong thành ngữ, danh từ hoá |
| Động từ khuyết thiếu | `/prep/hoc/khuyet-thieu/` | Đủ 29 điểm A1–C2. Bậc thấp: `can`, `must`, `have to`, `should`, `may`/`might`, `used to`, `be able to` — trọng tâm là sắc thái, `mustn't` là CẤM còn `don't have to` là KHÔNG CẦN. Bậc cao: nói về quá khứ bằng `have + V3` (`must have`, `should have`, `needn't have` khác `didn't need to`), hedging trong bài viết học thuật, và lùi thì để giữ khoảng cách lịch sự |

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
