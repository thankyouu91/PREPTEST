# VPET Prep — Frontend nền tảng luyện thi thử (Giai đoạn 1)

Giao diện nền tảng luyện thi thử (mock test) cho 6 nhóm chứng chỉ tiếng Anh:
**VEPT · VPET · OTE · TOEIC · IELTS · PTE**.
Cơ chế truy cập: đăng ký tài khoản → mua/nhập code → mở khoá bài thi.

> **Phạm vi hiện tại: vỏ nền tảng + luồng UI + khu quản trị có backend thật.**
> Chưa có engine làm bài, chưa chấm điểm.
> Danh mục (kỳ thi / đề đã phát hành / gói code) đọc thật từ `GET /api/catalog`;
> tài khoản và tiến độ học viên vẫn là mock localStorage — auth thật làm ở bước sau.

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
| `npm run build` | build lại CSS (**bắt buộc chạy + commit sau khi thêm class mới**) |
| `npm run screenshot` | chụp desktop + mobile mọi màn vào `docs/screenshots/`, báo lỗi console/CSP |
| `node scripts/audit.mjs` | audit tràn ngang, tương phản WCAG AA, nút xuống dòng, chiều cao nav (light + dark, 5 bề rộng) |
| `node scripts/test-auth.mjs` | kiểm thử luồng đăng nhập / đổi mật khẩu / lưu tiến độ theo tài khoản |
| `node scripts/test-admin.mjs` | kiểm thử API quản trị: phiên, CSRF, phân quyền, CRUD, sinh đề, cấp code |
| `node scripts/test-catalog.mjs` | kiểm thử trang học viên đọc `/api/catalog` + nhánh dự phòng khi API hỏng |
| `node scripts/test-user-api.mjs` | kiểm thử API tài khoản học viên: đăng ký, đăng nhập, xác thực email, đặt lại mật khẩu, CSRF, chống dò |
| `npm run screenshot:admin` | chụp các màn quản trị |
| `npm test` | chạy cả năm bộ kiểm thử |

## Khu quản trị (backend thật)

Truy cập `/admin/`. Dữ liệu nằm trong SQLite nhúng (`node:sqlite`, không cần dependency native),
file `data/prep.sqlite` tự tạo và seed ở lần chạy đầu — thư mục `data/` không đưa vào git.

Tài khoản quản trị khởi tạo: `admin` / `Admin@123456` (in ra console kèm cảnh báo).
Đặt `ADMIN_PASSWORD` để dùng mật khẩu khác; ở `NODE_ENV=production` server **từ chối khởi động**
nếu chưa có tài khoản nào và cũng không có `ADMIN_PASSWORD`.

### Các màn

| Màn | Đường dẫn | Nội dung |
|---|---|---|
| Báo cáo | `/admin/` | Số học viên, code, đề, doanh thu; biểu đồ 14 ngày; bảng theo kỳ thi; cảnh báo thiếu câu hỏi; thao tác gần đây |
| Đề thi | `/admin/de-thi/` | Danh sách, lọc theo kỳ thi và trạng thái, tạo thủ công, **sinh đề tự động** |
| Xây đề | `/admin/de-thi/:id/` | Sửa thông tin, thêm/xoá phần, chọn câu từ ngân hàng, bốc lại cả phần, phát hành |
| Ngân hàng câu hỏi | `/admin/ngan-hang/` | Lọc đa tiêu chí, thêm/sửa câu, ngưng dùng, **nhập hàng loạt từ CSV** (tải mẫu, xem trước, báo lỗi từng dòng) hoặc JSON |
| Học viên | `/admin/hoc-vien/` | Tìm kiếm, xem code và đơn, ghi chú, khoá/mở, đánh dấu xác thực, cấp code |
| Code | `/admin/code/` | Lô code, cấp theo lô hoặc cho một học viên, thu hồi, xuất CSV |
| Quản trị | `/admin/quan-tri/` | Thương hiệu, giá gói, đổi mật khẩu, nhật ký thao tác |

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

Quản trị (đều cần phiên + CSRF): `/api/admin/reports`, `/api/admin/tests` (+ `/generate`,
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

> ⚠️ **Mật khẩu này nằm dạng chữ thường trong `public/prep/_mock.js`** — bất kỳ ai xem source
> cũng đọc được. Nó chỉ hợp lệ ở bản dựng giao diện không có dữ liệu thật. Đừng dùng lại mật khẩu
> này ở hệ thống khác, và xoá `PREP_SEED_ACCOUNTS` khi nối auth thật.

Tài khoản tự đăng ký cũng đăng nhập lại được: mỗi bản ghi lưu trong `localStorage`
(`prep.accounts.v1`), tiến độ (bài đã mở khoá, code, đơn) gắn theo tài khoản chứ không theo phiên,
nên đăng xuất rồi đăng nhập lại vẫn còn. Đổi mật khẩu ở tab Bảo mật có hiệu lực thật cho lần đăng
nhập sau. Phần tài khoản này vẫn là mock phía client — auth thật (scrypt, phiên cookie, rate-limit,
như khu quản trị đang dùng) là mục kế tiếp trong `docs/ROADMAP.md`.

## Bản đồ màn hình

| Route | File | Truy cập |
|---|---|---|
| `/prep/landing/` (`/` redirect về đây) | `public/prep/landing/index.html` | Công khai |
| `/prep/dang-ky/` | `public/prep/auth/dang-ky.html` | Công khai |
| `/prep/dang-nhap/` | `public/prep/auth/dang-nhap.html` | Công khai |
| `/prep/quen-mat-khau/` | `public/prep/auth/quen-mat-khau.html` | Công khai |
| `/prep/xac-thuc-email/` | `public/prep/auth/xac-thuc-email.html` | Công khai |
| `/prep/` (dashboard) | `public/prep/index.html` | Cần đăng nhập |
| `/prep/thu-vien/` | `public/prep/library/index.html` | Cần đăng nhập |
| `/prep/mua-code/` | `public/prep/codes/mua-code.html` | Cần đăng nhập |
| `/prep/nhap-code/` | `public/prep/codes/nhap-code.html` | Cần đăng nhập |
| `/prep/code-cua-toi/` | `public/prep/codes/code-cua-toi.html` | Cần đăng nhập |
| `/prep/bai-thi/:id/` | `public/prep/test/index.html` | Cần đăng nhập (+ code để bắt đầu) |
| `/prep/tai-khoan/` | `public/prep/account/index.html` | Cần đăng nhập |

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

Các seam còn lại:

| Seam | Vị trí | Ghi chú |
|---|---|---|
| `TODO(frontend)` | `PrepAuth`, 4 màn auth | Giao diện còn dùng localStorage, chưa gọi API ở trên |
| `TODO(backend)` | `PrepState` | Kích hoạt code và tiến độ còn ở localStorage |
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
