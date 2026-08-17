# VPET Prep — Frontend nền tảng luyện thi thử (Giai đoạn 1)

Giao diện nền tảng luyện thi thử (mock test) cho 6 nhóm chứng chỉ tiếng Anh:
**VEPT · VPET · OTE · TOEIC · IELTS · PTE**.
Cơ chế truy cập: đăng ký tài khoản → mua/nhập code → mở khoá bài thi.

> **Phạm vi hiện tại: khu học viên và khu quản trị đều chạy trên backend thật.**
> Engine làm bài đã chạy được đầu-cuối: mở lượt thi, đồng hồ từng phần, nghe lại có
> hạn, ghi âm phần nói, tự lưu, nộp bài, trừ lượt theo gói — màn làm bài ở `/prep/lam-bai/`.
> Chấm điểm: trắc nghiệm và điền từ chấm ngay khi nộp, quy đổi thang 10 và bậc
> VSTEP; Viết và Nói để trạng thái chờ chấm. Màn kết quả ở `/prep/ket-qua/:id/`,
> chi tiết tới từng câu với gói Plus trở lên, rút gọn với gói Starter.
> Danh mục đọc từ `GET /api/catalog`; tài khoản học viên có đăng ký / đăng nhập / xác thực
> email / đặt lại mật khẩu thật với phiên cookie. Kích hoạt code còn ở phía client.

## Ngôn ngữ giao diện

Đang chuyển sang tiếng Anh theo từng mảng. Xong: **toàn bộ phần trước khi đăng
nhập** (trang giới thiệu, năm màn tài khoản, thông báo `/api/auth/*`) và **khu
học viên đã đăng nhập** — chrome dùng chung, trang chủ, thư viện, chi tiết bài
thi, màn làm bài, màn kết quả, ba màn code, hồ sơ, `_mock.js`, cùng
`server/exam-api.js` và `server/user-api.js`. Điểm số nay viết theo lối tiếng
Anh (`7.5` chứ không phải `7,5`); giá tiền vẫn giữ đơn vị đồng.

Tài khoản demo hiển thị tên **Demo Student**. Tên này được kéo về đúng tài liệu
ở mỗi lần khởi động ngoài production, cùng lúc với mật khẩu và trạng thái, nên
một CSDL cũ không giữ mãi tên cũ (`ensureDemoStudent` trong `server/auth.js`).

**Mười một trang tự học** đã đổi phần vỏ sang tiếng Anh: tiêu đề, hàng chip, bộ
lọc, trạng thái rỗng, tiêu đề cột, và các nhãn khối do `_grammar.js` dựng (When
to use it, When NOT to use it, Mistakes Vietnamese learners make, Examples,
Practice). Phần **giảng giải vẫn nguyên tiếng Việt**: đoạn dẫn mỗi trang và mọi
thứ đọc từ CSDL. Một thẻ giờ có tiêu đề tiếng Anh, nội dung tiếng Việt — đúng
hình dạng của một cuốn tra cứu song ngữ.

**Các tệp máy chủ dùng chung** cũng đã sang tiếng Anh: `auth.js`, `marking.js`,
phần mã của `db.js` (`storage.js` vốn đã là tiếng Anh). Giữ nguyên tiếng Việt có
chủ đích: tên bậc VSTEP (`Bậc 3/4/5`) vì đó là tên chính thức ghi trên chứng
chỉ, tên các tài khoản demo, và ngân hàng câu hỏi mẫu trong `db.js` — phần này
sẽ bị ngân hàng đề VPET thay toàn bộ.

**Bộ format đề** (`server/data/exam-formats.js`) cũng đã sang tiếng Anh: cả
mười một format, nhãn từng khối, ghi chú từng phần và phần tài liệu của tệp.
Số câu và số phút giữ nguyên từng con số — đây là bất biến, không phải văn bản.

**Tám màn quản trị** đã sang tiếng Anh: đăng nhập, báo cáo, đề thi, trình xây
đề, ngân hàng câu hỏi, format, học viên, code, quản trị, cùng chrome dùng chung.
Tên cột CSV khi nhập hàng loạt (`ky_thi`, `ky_nang`, `do_kho`, …) giữ nguyên —
đó là hợp đồng định dạng, đổi tên là đổi chức năng chứ không phải dịch.

`server/api.js` cũng đã sang tiếng Anh: thông báo lỗi `/api/admin/*`, phần chú
thích, nhãn phễu và việc cần làm, và các dòng CSV mẫu.

**Toàn bộ giao diện — trước đăng nhập, khu học viên, khu tự học và khu quản trị
— nay là tiếng Anh.** Phần cố ý giữ tiếng Việt: nội dung giảng dạy ở khu tự
học, tên bậc VSTEP (`Bậc 3/4/5`), giá tiền theo đồng, tên các tài khoản demo,
tên cột CSV khi nhập hàng loạt, và ngân hàng câu hỏi mẫu trong `db.js` — phần
này sẽ bị ngân hàng đề VPET thay toàn bộ.

**Nội dung khu tự học giữ nguyên tiếng Việt**: phần nghĩa, ví dụ song ngữ và
"lỗi người Việt hay mắc" tồn tại để giải thích tiếng Anh bằng tiếng mẹ đẻ của
người học; dịch sang tiếng Anh là bỏ đi chính công dụng của chúng.

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
| `node scripts/accounts.js doctor` | **Vào không được? Chạy cái này trước.** So sánh CSDL mà lệnh này sắp sửa với **CSDL mà tiến trình server đang thật sự mở** (đọc `/proc/<pid>/fd`) — đây là nhầm lẫn trông giống hệt sai mật khẩu: đổi mật khẩu trên một file, server đọc file khác. Rồi kiểm hai thứ làm hỏng đăng nhập *sau khi* mật khẩu đã đúng và đều hỏng im lặng: `NODE_ENV=production` trên `http://` khiến cookie `Secure` không bao giờ được gửi lại (đăng nhập xong bật về màn đăng nhập), và `TRUST_PROXY` sai sau load balancer khiến `req.ip` là balancer với mọi người. Cũng báo 2FA đang bật, tài khoản bị vô hiệu hoá, và các khoá 15 phút còn hiệu lực |
| `node scripts/accounts.js list` | **Vào không được?** Liệt kê tài khoản quản trị và trạng thái học viên demo. Đặt lại bằng `reset-admin` / `reset-student`. `unlock` gỡ **cả hai** thứ tên "khoá": tài khoản bị quản trị vô hiệu hoá, và khoá 15 phút do sai mật khẩu 5 lần — khoá này nằm trong CSDL nên khởi động lại server không xoá nó. Trên Windows nhấn đúp `cai-dat\accounts.bat` |
| `node scripts/test-accounts.js` | kiểm thử đường cứu hộ tài khoản (tự phục hồi tài khoản demo, đặt lại mật khẩu quản trị) |
| `node scripts/test-mail.mjs` | kiểm thử thư đi: soạn thư (mã hoá tiêu đề, chống chèn header), toàn bộ hội thoại SMTP với một server giả chạy tại chỗ, và **token không lọt vào log** |
| `node scripts/test-totp.mjs` | kiểm thử lớp xác thực thứ hai: **sáu vector chuẩn RFC 6238**, cửa sổ lệch giờ, mã đã dùng không dùng lại được, mã cứu hộ, và toàn bộ luồng đăng nhập thật |
| `node scripts/test-analytics.mjs` | kiểm thử analytics phía máy chủ: định danh không dùng cookie theo dõi, các giới hạn GA4 âm thầm bắt (tên sự kiện, số/độ dài tham số, `session_id`), trần số request đang bay, và **quét khẳng định payload không chứa** email, tên, địa chỉ IP hay user-agent |
| `node scripts/test-pg-schema.mjs` | nạp lược đồ đã dịch sang **PostgreSQL thật** rồi so hai bên: 34 bảng, từng cột, từng NOT NULL, hai kiểu phải đổi, và các dạng câu lệnh mã nguồn đang dùng (`ON CONFLICT DO UPDATE`, khoá ngoại, index `DESC`). Không có `PG_URL` thì **bỏ qua và nói rõ**, không lặng lẽ xanh. `scripts/pg-dev.sh` dựng sẵn một cụm tạm |
| `node scripts/test-payments.mjs` | kiểm thử cổng thanh toán: **chữ ký đối chiếu với chuỗi thô chép tay từ tài liệu** của VNPay và MoMo, rồi luật quyết định lúc nào cấp code — sai số tiền, sai nhà cung cấp, mã tham chiếu lạ, và **báo lại lần hai chỉ cấp một code** |
| `node scripts/test-classroom.mjs` | kiểm thử Google Classroom: refresh token **niêm phong bằng AES-256-GCM** — sửa một byte ở iv, ở ciphertext hay ở tag đều mở không ra, và khoá sai độ dài bị từ chối chứ không kéo giãn; **không có khoá thì tính năng TẮT**, không phải "bật và lưu token trần"; hai quản trị viên không tiêu được quyền của nhau; rồi một Google giả trả về hai trang lớp học và một roster để kiểm việc đi hết trang, ghép email với tài khoản sẵn có (không phân biệt hoa thường), và **không lấy ảnh đại diện** |
| `node scripts/test-secrets.mjs` | kiểm thử nạp bí mật từ AWS Secrets Manager: một Secrets Manager giả **tự xác minh chữ ký SigV4 từ đúng byte nhận được** (kể cả `x-amz-target`, vì header chọn hành động thì phải được ký), giá trị nào vào được `process.env`, giá trị nào bị từ chối (bí mật **không được** ghi đè chính endpoint/credential/`NODE_ENV` đã dùng để lấy nó), và **không dòng log nào chứa giá trị**. Nửa sau đọc thẳng mã nguồn: **không module nào được bắt biến bí mật vào hằng số lúc import** — vì `load()` chạy sau mọi `require`, hằng số như thế giữ chuỗi rỗng lúc trước khi bí mật về, và không có gì ném lỗi cả |
| `node scripts/test-s3.mjs` | kiểm thử driver Amazon S3 và lớp ký SigV4: **canonical request dựng lại đúng từng byte theo ví dụ AWS công bố** và băm ra đúng giá trị AWS in kèm, quy tắc percent-encode (`!'()*` phải mã hoá, `encodeURIComponent` thì không), lấy khoá tạm từ task role ECS và từ **IMDSv2** (bắt buộc PUT lấy token, không có đường lùi IMDSv1), rồi cả ba request chạy qua một S3 giả **tự tính lại chữ ký từ đúng những byte nhận được** — sửa một byte body sau khi ký thì bị từ chối |
| `node scripts/test-gcs.mjs` | kiểm thử driver Google Cloud Storage và lớp lấy token: **sinh cặp khoá RSA thật rồi verify chữ ký JWT**, cache token, và toàn bộ hình dạng request (method, path, query, `Metadata-Flavor`, tên object đã encode) đối chiếu với một Google giả chạy tại chỗ |
| `node scripts/test-srs.mjs` | kiểm thử lặp lại ngắt quãng: **lịch SM-2 tính chính xác từng ngày** (hàm thuần, đồng hồ truyền vào nên không phải chờ), rồi hàng đợi ôn tập qua API — ai được hỏi, chấm điểm lưu đúng cái lịch đã tính, hai học viên không thấy tiến độ của nhau |
| `node scripts/test-health.mjs` | kiểm thử vòng đời tiến trình (sập thì thoát khác 0, SIGTERM thì thoát êm bằng 0, có chặn thời gian) và endpoint `/healthz` |
| `node scripts/test-async.mjs` | kiểm **tĩnh** kỷ luật bất đồng bộ, đọc thẳng mã nguồn, không cần server: mọi lời gọi hàm async đều có `await`, không có callback `async` nào đưa cho `map`/`forEach`, mọi router đều đi qua `asyncRoutes()`, và cuối chuỗi có error handler. Ba lỗi nó bắt đều **không ném exception**: `if (!currentUser(req))` trên một Promise luôn đúng nên guard hết chặn ai, `rows.map(async …)` trả về mảng Promise mà `JSON.stringify` in ra `{}`, `forEach(async …)` trả về trước khi đọc xong dòng đầu. Ngoại lệ (`analytics.track`) phải khai báo kèm lý do |
| `node scripts/test-harness.mjs` | kiểm thử **chính bộ máy chạy test**: lớp thử lại có chặn trên (kiểm bằng một socket bị ngắt thật, không chỉ bằng chuỗi lỗi tự gõ), pool báo đúng job nào hỏng thay vì kéo sập cả lượt, và bước hâm nóng CSRF. Không cần server, không cần trình duyệt |
| `node scripts/test-exam.mjs` | kiểm thử engine làm bài: mở/nối lại lượt thi, đồng hồ từng phần, số lần nghe lại đếm ở máy chủ, ghi âm câu trả lời, nộp bài, hạn mức lượt của gói Starter, và **đáp án không lọt ra trình duyệt** |
| `node scripts/test-learn.mjs` | kiểm thử khu tự học: chất lượng dữ liệu động từ bất quy tắc, từ nối và hai nhóm ngữ pháp (nhóm khớp hình thái, ví dụ chứa đúng mục từ, đủ bốn lát cắt, chỗ trống khớp đáp án, đúng hạn mức bậc) + bộ lọc bốn trang |
| `node scripts/export-supabase.mjs --count` | xuất nội dung ra Supabase (SQL hoặc JSON) — xem [Bản sao nội dung trên Supabase](#bản-sao-nội-dung-trên-supabase) |
| `npm run screenshot:admin` | chụp các màn quản trị |
| `npm test` | chạy cả bảy bộ kiểm thử |

## Khu quản trị (backend thật)

Truy cập `/admin/`. Dữ liệu nằm trong SQLite nhúng (`node:sqlite`, không cần dependency native),
file `data/prep.sqlite` tự tạo và seed ở lần chạy đầu — thư mục `data/` không đưa vào git.

Tài khoản quản trị khởi tạo: `admin`, **mật khẩu sinh ngẫu nhiên và in ra console đúng một lần** ở lần chạy đầu. Không còn mật khẩu mặc định viết sẵn trong mã nguồn — một giá trị mặc định nằm trong repo công khai là một lượt đăng nhập quản trị phát cho mọi người đọc được nó. Đặt `ADMIN_PASSWORD` để tự chọn, hoặc `node scripts/accounts.js reset-admin` để sinh lại.
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

### Quản lý học viên từ khu quản trị

Học viên bình thường tự đăng ký. Trung tâm cần chiều ngược lại: có người trả
tiền tại quầy, hoặc một lớp ba mươi em vào cùng lúc. Màn **Học viên** làm được
cả ba việc:

| Việc | Endpoint | Ghi chú |
|---|---|---|
| **Tạo tài khoản** | `POST /api/admin/users` | Tạo ra là **đã xác thực sẵn** — người quản trị đã tự xác nhận địa chỉ; để chưa xác thực thì chính người đó bị khoá ngoài cái tài khoản vừa lập cho họ. Có thể cấp luôn kỳ hạn khi tạo |
| **Cấp kỳ hạn 3 / 6 / 12 tháng** | `POST /api/admin/users/:id/grant` | Sinh code rồi **kích hoạt ngay** trên tài khoản, không phải gửi mã cho ai |
| **Đặt lại mật khẩu** | `POST /api/admin/users/:id/password` | **Huỷ mọi phiên** của tài khoản đó — lý do phải đặt lại thường là để ai đó không còn đăng nhập được nữa |

Cộng với những thứ đã có: khoá/mở tài khoản, đánh dấu đã xác thực, ghi chú nội bộ.

**Ba kỳ hạn chính là ba gói** — `starter-3m`, `plus-6m`, `pro-12m`. Nút trên màn
hình dựng từ bảng giá máy chủ trả về chứ không gõ tay, nên đổi bảng giá là màn
này đi theo, và thêm gói thứ tư thì nút tự xuất hiện.

**Mật khẩu sinh ra chỉ hiện đúng một lần**, trong hộp thoại kèm nút copy. Cột
trong CSDL là hash scrypt, nên sau khi đóng hộp thoại thì không ai đọc lại được
— kể cả người vừa tạo. Không ghi log, không gửi mail.

**Kỳ hạn tính từ hôm nay**, giống hệt khi học viên tự nhập code. Cấp thêm một kỳ
hạn khi kỳ cũ còn hạn thì không mất gì: `entitlementOf()` lấy **ngày xa nhất**
trong các code còn sống và **cộng dồn** số lượt thi, gói mạnh hơn quyết định mở
khoá những gì.

### Ngân hàng đề VPET

`server/data/vpet-items.js` giữ **62 câu** cho năm phần không cần audio:
A (30 điền từ) · B (8 dựng lại đoạn) · C (8 đọc hiểu) · D (8 email) · I (8 nói
theo tình huống). Ngân hàng là pool: trình sinh đề bốc đúng số câu blueprint
yêu cầu, nên thi lại là bốc ra bộ khác.

Độ sâu đếm **theo bậc**, không theo phần, vì bậc mới là thứ trình sinh đề phản
ứng: nó xếp câu đúng bậc lên trước rồi mới lấy đủ số lượng. Một phần có ít câu ở
bậc của đề hơn số blueprint yêu cầu sẽ lặp lại toàn bộ số câu ấy ở lượt sau — và
một phần có *đúng bằng* số blueprint thì lặp lại chắc chắn cả phần, trường hợp tệ
hơn trong hai cái. Luật của ngân hàng: ở mỗi bậc, một phần hoặc **nông** (ít hơn
số blueprint, phần bù lấy từ bậc khác nên vẫn đổi giữa hai lượt) hoặc **sâu** (ít
nhất gấp đôi, đủ hai đề khác nhau) — không được rơi vào khoảng giữa. Hiện mọi
phần đều sâu ở B2, riêng D và I sâu cả ở B1; A, B và C còn nông ở B1, còn A2 và
C1 nông ở mọi phần.

Seed chạy lại được: upsert theo `questions.ext_key`, không xoá rồi nạp lại —
`section_items` trỏ khoá ngoại vào `questions`, xoá ngân hàng là xoá luôn mọi đề
đã dựng từ nó. Câu do admin tự nhập không có `ext_key` nên không bao giờ bị đụng.

Năm phần còn lại (E, F, G, H, J — 35 câu) **chưa có**, và đó là chủ ý: với các
phần này bản ghi chính là đề bài, kịch bản không kèm MP3 thì thí sinh không làm
được. Chúng đi cùng phần giọng nói. `scripts/test-items.mjs` đọc thẳng blueprint
để kiểm, nên bài test không thể "đúng" khi blueprint đã đổi; nó cũng giữ luật
nông/sâu ở trên. `scripts/test-admin.mjs` kiểm cùng điều đó qua API thay vì qua
tệp dữ liệu: đề B2 phải bốc toàn câu B2, và hai lượt bốc phần A không được trùng
khít.

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
| `AUDIO_STORAGE` | `disk` | `disk` lưu vào `data/uploads/audio`; `supabase` đẩy lên Supabase Storage; `gcs` đẩy lên Google Cloud Storage; `s3` đẩy lên Amazon S3 |
| `S3_BUCKET`, `AWS_REGION` | — | bắt buộc khi `AUDIO_STORAGE=s3`. **Không có region mặc định**: `us-east-1` là mặc định ở mọi nơi khác trong AWS và sai với gần như mọi bucket, đổi lại là một redirect mà chữ ký không sống sót, báo về dưới dạng 403 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | — | chỉ dùng khi chạy ngoài AWS. Trên ECS/App Runner thì **task role** cấp khoá tạm, không phải lưu khoá ở đâu cả; trên EC2 thì instance role qua IMDSv2 |
| `S3_ENDPOINT` | — | trỏ sang MinIO hoặc một S3 giả (chuyển sang path-style). Bỏ trống thì dùng virtual-hosted `https://<bucket>.s3.<region>.amazonaws.com` |
| `AWS_SECRETS_ID` | — | tên hoặc ARN của một secret JSON trong AWS Secrets Manager. Có biến này thì lúc khởi động, `server/secrets.js` lấy secret đó và **trộn vào `process.env`** trước khi bất cứ thứ gì đọc khoá. Không có thì không làm gì cả |
| `TOKEN_ENCRYPTION_KEY` | — | 32 byte base64. Cần cho Google Classroom: refresh token của giáo viên được niêm phong AES-256-GCM trước khi vào CSDL. **Không có khoá thì Classroom tắt** — không bao giờ lưu token trần. Sinh khoá: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `GOOGLE_CLASSROOM_REDIRECT_URI` | — | mặc định `<origin>/auth/google/classroom/callback`. Phải khai trong Google console, tách khỏi URI của Sign-In |
| `SECRETS_ENDPOINT` | — | trỏ Secrets Manager sang một endpoint khác (dùng cho test). Bỏ trống thì `https://secretsmanager.<region>.amazonaws.com` |
| `AUDIO_DIR` | `data/uploads/audio` | thư mục cho driver đĩa |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | — | bắt buộc khi dùng driver Supabase |
| `SUPABASE_AUDIO_BUCKET` | `exam-audio` | tên bucket |
| `GCS_BUCKET` | — | bắt buộc khi dùng driver GCS |
| `STORAGE_EMULATOR_HOST` | — | trỏ sang emulator/máy giả; đúng tên biến mà thư viện của Google đọc |

Đĩa hợp cho lúc phát triển (không cần khoá, chạy ngay) nhưng container dựng lại
là mất. Chỗ gọi không bao giờ phải sửa: thêm driver là thêm một object trong
`server/storage.js`.

#### Driver Google Cloud Storage

Dùng thẳng JSON API qua `fetch`, **không thêm dependency nào** — thư viện chính
chủ là hơn hai trăm gói phụ thuộc để gọi ba lần HTTP. Khoá lấy từ
`server/google-token.js` (xem [Lấy access token của Google](#lấy-access-token-của-google)),
nên trên Cloud Run **không cần khoá nào cả**.

Một chi tiết dễ sai và đã được kiểm bằng máy chủ giả: tên object nằm ở **query
string** khi tải lên nhưng nằm trong **đường dẫn** khi đọc và xoá, và ở đường dẫn
thì phải percent-encode **cả tên** — khoá của dự án có dấu `/`, để nguyên là trỏ
sang một object khác. Driver Supabase ngay bên trên **không** encode, và như thế
mới đúng, vì API đó nhận đường dẫn thật.

**Thiếu khoá thì xử lý khác nhau tuỳ nơi chạy.** Roadmap yêu cầu "chưa có khoá
thì lùi về đĩa", nhưng lùi *âm thầm* ở production là **mất dữ liệu** chứ không
phải chạy giảm chất lượng: bài ghi âm của thí sinh sẽ nằm trên ổ đĩa container và
biến mất ở lần deploy sau, không ai biết cho tới lúc cần tới nó. Nên:

- `NODE_ENV=production` mà thiếu `GCS_BUCKET` hoặc thiếu khoá → **không khởi động
  được**, và báo rõ thiếu cái gì. Chết lúc khởi động rẻ hơn nhiều so với một lượt
  tải lên biến mất.
- Ngoài production → cảnh báo **một lần**, rõ ràng, rồi dùng đĩa; nhờ vậy vẫn chạy
  được đúng cấu hình ấy trên máy cá nhân không có khoá nào.

### Lấy access token của Google

`server/google-token.js`. Cloud Storage là chỗ gọi đầu tiên; Gemini, Cloud SQL và
Secret Manager rồi cũng cần đúng thứ đó, nên nó là file riêng chứ không phải một
góc kín của `server/storage.js`. Hai nguồn khoá, xét theo thứ tự, đều đúng cách
mà công cụ của chính Google làm:

1. **Khoá service account.** `GOOGLE_SERVICE_ACCOUNT_JSON` chứa nguyên JSON (hoặc
   base64, vì nhét một khối PEM vào biến môi trường là cuộc chiến ở phần lớn giao
   diện deploy), hoặc `GOOGLE_APPLICATION_CREDENTIALS` trỏ tới file. Khoá ký một
   JWT RS256 rồi đổi lấy access token (RFC 7523) — `node:crypto` ký được, không
   cần thư viện.
2. **Metadata server.** Trên Cloud Run và GCE **không có khoá nào cả**: nền tảng
   phát token cho service account gắn sẵn qua một địa chỉ chỉ gọi được từ bên
   trong instance. Đây mới là cách deploy tốt hơn — khoá không tồn tại thì không
   lộ được — và là cách mục Cloud Run trong roadmap sẽ dùng. Nhận biết bằng
   `K_SERVICE` (Cloud Run tự đặt) chứ không thăm dò metadata server mỗi lần khởi
   động, vì như thế là trả giá một lần timeout ở mọi nơi khác.

Không có nguồn nào thì coi như **chưa cấu hình**, và chỗ gọi tự quyết định làm gì.
File này không bịa ra khoá, cũng không chạy nửa vời khi thiếu khoá.

Hai điều tuyệt đối không làm: **không log** token, assertion hay private key (lỗi
ném ra chỉ mang HTTP status và phần đầu response), và **không mint token mỗi
request** — token sống một giờ, được cache tới trước hạn 60 giây, và bốn lượt tải
lên song song dùng chung **một** lần làm mới chứ không khởi động bốn.

`scripts/test-gcs.mjs` (70 kiểm tra) tự sinh một cặp khoá RSA thật rồi **verify
chữ ký** bằng nửa công khai — "ký JWT RS256 đúng" được chứng minh bằng mật mã chứ
không phải bằng cách đọc code rồi gật đầu. Phần HTTP kiểm bằng một Google giả
chạy tại chỗ, nơi khẳng định đúng những thứ chạy-được-ở-máy-mình-hỏng-ở-production:
method, path, query, header `Metadata-Flavor` mà metadata server bắt buộc phải có,
và tên object đã percent-encode.

### Vòng đời tiến trình và `/healthz`

`server/lifecycle.js`. Ba việc tách bạch:

- **Sập thì phải ồn ào và dứt khoát.** `unhandledRejection` và `uncaughtException`
  đều ghi log có ngữ cảnh rồi **thoát khác 0**, để bộ giám sát khởi động lại một
  tiến trình đã hỏng thay vì tin nó. Tiến trình còn sống mà đã hỏng là trạng thái
  tệ nhất — nó vẫn trả lời health check nên không ai biết mà cứu.
- **Tắt theo yêu cầu thì phải lịch sự.** Cloud Run gửi `SIGTERM` trước khi hạ
  container. Không bắt tín hiệu là mọi request đang dở bị cắt giữa chừng — người
  dùng thật thấy nó là một lần nộp bài thất bại trong lúc deploy. Giờ: ngừng nhận
  kết nối mới, để request đang chạy xong, thoát **bằng 0**.
- **Kiểu gì cũng phải có hạn.** `server.close()` chờ kết nối đang mở, mà một
  keep-alive nhàn rỗi thì chờ mãi mãi. Nên kết nối rỗi bị đóng ngay, và một hẹn
  giờ (`SHUTDOWN_GRACE_MS`, mặc định 8000) bảo đảm tiến trình vẫn thoát.

`GET /healthz` trả `{"ok":true}` kèm **một truy vấn thật xuống cơ sở dữ liệu** —
tiến trình đang chạy thì nền tảng đã biết rồi; cái nó không thấy được là tiến
trình vẫn nghe cổng trong khi CSDL đã mất, và đúng trạng thái đó mới đáng khởi
động lại. Endpoint không nói gì thêm: không phiên bản, không đường dẫn, không
nội dung lỗi — lý do hỏng đi vào log, chỗ người vận hành đang nhìn.

### Lớp xác thực thứ hai cho khu quản trị

Khu quản trị nắm mọi tài khoản, mọi đề thi, mọi mã kích hoạt — và trước đây chỉ
có **một mật khẩu** đứng giữa nó và Internet. Giờ có TOTP (RFC 6238), thứ mà mọi
app authenticator đều nói.

Mặc định **tắt**. Bật bằng dòng lệnh, với server đã dừng:

```bash
node scripts/accounts.js totp-enable            # in ra secret + URI otpauth://
# thêm secret vào app authenticator, rồi:
node scripts/accounts.js totp-enable 123456 --secret=<secret>
```

Hai bước là cố ý: bước một chỉ **in** secret chứ chưa bật gì cả; bước hai chứng
minh app thật sự đã có nó. Bật một bước là bật một lớp bảo vệ mà chưa chắc ai
tạo được mã.

Bật xong sẽ in **10 mã cứu hộ**, chỉ hiện đúng một lần (CSDL chỉ giữ hash). Không
có chúng thì bật lớp thứ hai đồng nghĩa với việc mất điện thoại là mất luôn khu
quản trị. `totp-disable` là đường về cuối cùng khi mất cả điện thoại lẫn mã cứu
hộ — nó cần CSDL chứ không phải trình duyệt, đó là lý do nó nằm ở dòng lệnh.

`totp-status` cho biết ai đang bật và còn bao nhiêu mã cứu hộ.

Bật được cả **trong giao diện**: `/admin/quan-tri/` → tab **Admin account** → thẻ
**Two-factor sign-in**, chạy đúng hai bước như dòng lệnh. Màn đăng nhập tự hiện ô
nhập mã khi máy chủ trả `needCode`, nên tài khoản chưa bật thì không thấy gì lạ.

Dòng lệnh vẫn là nơi duy nhất **tắt** được khi đã mất điện thoại lẫn mã cứu hộ —
tắt trong giao diện thì phải nhập lại mật khẩu, mà mất máy thì có vào được đâu.

Không vẽ mã QR: vẽ QR cần thêm dependency hoặc tự viết Reed-Solomon, mà mọi app
authenticator đều cho gõ tay secret, nên QR là tiện chứ không phải thiếu.

### Thư đi (xác thực email, đặt lại mật khẩu)

Cùng kiểu adapter, ở `server/mail.js`. Nền tảng chỉ gửi hai loại thư, cả hai đều
chứa một token dùng một lần — nên **token không bao giờ được ghi vào log**.

| Biến | Mặc định | Việc |
|---|---|---|
| `MAIL_DRIVER` | `console` | `console` không gửi gì; `smtp` gửi thật |
| `PUBLIC_BASE_URL` | suy từ request | gốc URL tuyệt đối đặt trong thư (`https://vpetprep.vn`) |
| `MAIL_FROM` | — | bắt buộc khi dùng `smtp`, ví dụ `VPET Prep <no-reply@vpetprep.vn>` |
| `SMTP_HOST` | — | bắt buộc khi dùng `smtp` |
| `SMTP_PORT` | `587` | `465` là TLS ngay từ byte đầu; `587` bắt đầu thường rồi STARTTLS |
| `SMTP_USER`, `SMTP_PASS` | — | bỏ trống nếu relay không cần đăng nhập |
| `SMTP_SECURE` | `1` khi cổng 465 | ép TLS ngay từ đầu |
| `SMTP_ALLOW_PLAINTEXT_AUTH` | `0` | chỉ bật với relay nội bộ bạn tự quản |

Driver `smtp` viết bằng `node:net` + `node:tls`, **không thêm dependency**, và
không gắn với nhà cung cấp nào: SES, SendGrid, Postmark hay Gmail (app password)
đều nói SMTP. Chưa cấu hình thì driver `console` chạy — ngoài production nó trả
link về cho client để bấm thử, còn trong production thì không trả gì cả.

Nó **không bao giờ gửi mật khẩu qua kết nối chưa mã hoá**: nếu server không mời
STARTTLS và cổng cũng không phải TLS sẵn thì AUTH bị từ chối chứ không hạ cấp.

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

### Bảo mật toàn hệ

Chi tiết đầy đủ — kèm **bảng 74 endpoint → guard → giới hạn ghi** — nằm trong
[`docs/SECURITY.md`](docs/SECURITY.md). Bảng ấy **sinh tự động** từ stack của
Express, không gõ tay, và `scripts/test-security.mjs` sinh lại rồi so mỗi lần
chạy `npm run verify`: thêm endpoint mà quên guard là đỏ ngay, không đợi lần rà
soát sau. Đọc stack chứ không đọc mã nguồn, vì `router.use('/admin', …)` chỉ
bọc những route đăng ký **sau** nó — nhìn mã rất dễ kết luận ngược.

- **Header nền trên mọi response**, đặt một chỗ ở `server/security.js` và gắn
  trước mọi router: `nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  `X-Frame-Options`, COOP, CORP, `X-Permitted-Cross-Domain-Policies`. Trước đây
  chỉ trang HTML mới có; response API và tệp tĩnh thì trống. `Permissions-Policy`
  tắt hết trừ `microphone=(self)` — phần Nói ghi âm qua MediaRecorder.
- **HSTS chỉ khi request đã là HTTPS.** Gửi qua HTTP thì trình duyệt bỏ qua, mà
  gửi lúc chạy dev sẽ ghim `localhost` sang HTTPS cả năm trong máy người phát triển.
- **CSP riêng cho `/api/*`**: `default-src 'none'; frame-ancestors 'none'; sandbox`.
  Response API là dữ liệu, không bao giờ là tài liệu.
- **Giới hạn ghi toàn cục** `WRITE_PER_MIN` (mặc định 300/phút), gắn trước mọi
  router nên phủ cả endpoint viết ngày mai. Khoá đếm là **cookie phiên đã băm ×
  IP** — ai cầm cookie thì người đó bị đếm, đúng đơn vị mà một phiên ăn cắp được
  tiêu. Đây là trần chứ không phải hạn mức: người dùng thật không chạm tới.
  Endpoint cần chặt hơn vẫn giữ giới hạn riêng của nó.
- **Tám endpoint ghi không có guard đăng nhập** (đăng ký, hai màn đăng nhập,
  quên mật khẩu, đặt lại, xác thực, hai màn đăng xuất) được khai tên trong
  `PUBLIC_WRITES` cùng thứ thay thế guard. Bài test kiểm cả hai chiều: thiếu khai
  là đỏ, mà khai thừa cũng đỏ.
- **`csrfGuard` phủ 43/43 route ghi**, kể cả những route không đòi đăng nhập.
  Cookie `prep_csrf` được cấp ngay khi phục vụ bất kỳ trang HTML nào, nên khách
  chưa đăng nhập cũng có token để đối chiếu; đăng nhập xong thì token được xoay
  mới. Bản rà soát trước gọi chỗ này là **login CSRF** đang mở — kiểm lại bằng
  request thật thì không khai thác được (xem đính chính ở `docs/SECURITY.md` mục
  3). Hàng rào có thật nhưng là hệ quả tình cờ của việc chỉ nạp `express.json()`
  và không cấu hình CORS; đặt `csrfGuard` lên biến nó thành hàng rào cố ý.
- **Ba ngưỡng theo thời gian có biến môi trường cho bộ test**, mặc định trong mã
  nguồn không đổi: `REGISTER_PER_HOUR`, `FORGOT_PER_HOUR`, `REDEEM_PER_10MIN`.
  Mỗi lượt `npm run verify` tiêu một suất của cả ba, nên với mặc định thì chạy bộ
  test sáu lần trong một giờ là tự làm mình đỏ — đúng việc mà người đang truy một
  bài test chập chờn sẽ làm. `scripts/verify.sh` nới cả ba lên 200.

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

## Chuyển từ SQLite sang PostgreSQL

SQLite nhúng thì tốt trên một máy và **chết trong container**: `/app/data` mất
theo task, nghĩa là mất luôn tài khoản. Nên nền tảng phải nói chuyện được với một
Postgres có quản lý — RDS, vì đích deploy nay là AWS.

Việc này chia **ba bước**, vì một lượt làm không xong mà làm dở thì tệ hơn không
làm. Phần khó không phải là đổi engine mà là **đổi giao diện**: `q.all/get/run/val`
là đồng bộ, Postgres thì không.

| Bước | Việc | Trạng thái |
|---|---|---|
| 1 | Lược đồ: dịch DDL và **nạp thử vào Postgres thật** | ✅ xong |
| 2 | Cho mọi chỗ gọi `q.*` thành `await`, **vẫn chạy SQLite bên dưới** | ✅ xong |
| 3 | Driver `pg` + `$1…$n` + `RETURNING id` + transaction có pool | chưa — **cần chủ dự án duyệt thêm dependency** |

Bước 2 tách khỏi bước 3 là có chủ ý: đổi giao diện và đổi engine trong cùng một
nhịp thì lúc hỏng không biết nửa nào gây ra.

### Bước 2 đã làm gì

`server/db.js` nay có **hai giao diện trên cùng một engine**, và chỗ khác nhau
chính là điểm mấu chốt:

- `qs` — đồng bộ, **riêng tư trong `db.js`**. Lược đồ, migration và seed chạy một
  lần lúc `require()`, trước khi có gì đang lắng nghe, và CommonJS không có
  top-level await để cho chúng dùng. Nên phần khởi động ở lại đồng bộ, ở lại
  trong file đó.
- `q` — bất đồng bộ, là đường mọi request đi qua. SQLite vẫn trả lời đồng bộ bên
  dưới nên promise đã settle sẵn lúc trao tay; điều đổi là **chỗ gọi không còn
  giả định như thế nữa**.

Ba thứ phải thêm mới đúng, và cả ba đều là chuyện đúng/sai chứ không phải gọn/xấu:

**Transaction không còn tự cô lập.** Giao diện bất đồng bộ trên một kết nối dùng
chung nghĩa là một transaction đang mở **vắt qua các điểm `await`**, nên câu lệnh
của request khác có thể rơi vào giữa BEGIN và COMMIT rồi bị commit — hoặc bị
rollback — cùng với nó. `AsyncLocalStorage` đánh dấu những lời gọi thực sự thuộc
transaction đang mở, mọi lời gọi khác **chờ** nó xong; bản thân các transaction
xếp hàng, vì SQLite không có BEGIN lồng nhau. Đây không phải giàn giáo bỏ đi ở
bước 3: một client Postgres có pool đúng hình dạng này — lệnh trong transaction
đi vào client đang giữ, phần còn lại đi vào pool. Ở đây "pool" là một kết nối, nên
phần còn lại chờ thay vì đi đường khác.

**Express 4 không bắt được handler bị reject.** Nó gọi handler rồi đi tiếp: nếu
handler `async` mà reject thì không ai gọi `next(err)`, error handler không chạy,
không có response nào được ghi, và **request treo cho tới khi client bỏ cuộc** —
không một dòng log, vì không ai bắt gì cả. `server/async-route.js` bọc mọi handler
đăng ký qua router hoặc qua app, giữ nguyên `fn.name` (bảng trong `docs/SECURITY.md`
nhận ra guard bằng tên) và giữ nguyên số tham số (4 tham số mới là error handler).

**Kiểm tĩnh, vì ba lỗi hay gặp nhất đều không ném exception.** Xem
`scripts/test-async.mjs` trong bảng lệnh ở trên.

**Dịch chứ không chép.** DDL Postgres được sinh từ `SCHEMA_SQL` trong
`server/db.js` ngay lúc chạy (`server/schema.js`). Lược đồ giữ ở hai nơi thì trong
vòng một tháng là lệch nhau, và chỗ phát hiện ra sẽ là một câu INSERT trên
production. Mọi migration `addColumnIfMissing` cũng **tự ghi tên mình** vào một
danh sách khi chạy — bản chép tay đầu tiên đã thiếu sáu cột.

**Hai kiểu không mang nguyên sang được**, và cả hai đều hỏng âm thầm:

- `INTEGER PRIMARY KEY AUTOINCREMENT` → identity column, **`BY DEFAULT` chứ không
  `ALWAYS`**, vì bản seed có chèn id tường minh.
- `REAL` → `DOUBLE PRECISION`. `REAL` của SQLite là 64-bit, của Postgres là 32-bit;
  để nguyên tên là **lặng lẽ làm tròn mọi điểm số** lưu trong đó. Bản dịch đầu tiên
  đã dính đúng lỗi này ở hai cột và chỉ lộ ra khi hỏi một máy chủ thật xem nó vừa
  tạo cột kiểu gì.

**Cố ý giữ nguyên:** ngày tháng vẫn là `TEXT` ISO-8601, boolean vẫn là `INTEGER`
0/1. Cả hai trông như lỗi và cả hai đang gánh việc — `expires_at <= ?` so với một
chuỗi là phép so khác hẳn khi cột là `timestamptz`, mà có vài trăm câu truy vấn
đang dựa vào phép so hiện tại.

## Chạy bằng container (AWS)

`Dockerfile` + `.dockerignore` ở gốc repo. Hai tầng: Tailwind biên dịch ở tầng
build rồi bị vứt đi, tầng chạy chỉ còn `express` (`node_modules` 4.5 MB, không
Tailwind, không Playwright, không bộ test). Chạy bằng user `node` (uid 1000),
`HEALTHCHECK` gọi `/healthz` thật — có round-trip xuống CSDL. Ảnh ~336 MB.

```bash
docker build -t vpet-prep .
docker run -p 3000:3000 -e ADMIN_PASSWORD='…' -e TRUST_PROXY=1 vpet-prep
```

Không có gì gắn riêng với AWS: App Runner, ECS/Fargate, Elastic Beanstalk hay
Docker trần trên EC2 đều chạy được. Nền tảng chọn hoàn toàn bằng biến môi trường.

### Bốn thứ phải biết trước khi deploy

**1. `ADMIN_PASSWORD` không có thì container KHÔNG khởi động được.** Đây là cố ý
và đã kiểm chứng bằng cách chạy thật: ở `NODE_ENV=production`, `ensureSeedAdmin()`
từ chối tạo tài khoản quản trị với mật khẩu mặc định. Log ghi rõ
*"No administrator account exists. In production, ADMIN_PASSWORD must be set
before the first run."* Đặt qua Secrets Manager / SSM Parameter Store, đừng đặt
thẳng trong task definition.

**2. `TRUST_PROXY=1` khi đứng sau ALB/CloudFront.** Để mặc định 0 thì `req.ip` là
địa chỉ của ALB với **mọi** người dùng — nghĩa là khoá đăng nhập sai 5 lần và
write limit gộp chung toàn bộ khách thành một, một người gõ sai mật khẩu là cả
hệ thống bị khoá. Đặt đúng bằng **số tầng proxy** đứng trước, không đặt `true`
(lý do ở `resolveTrustProxy` trong `server/security.js`).

**3. Cookie tự bật `Secure` ở production**, nên trình duyệt sẽ **không gửi** nó
qua HTTP. TLS phải kết thúc ở ALB/CloudFront và người dùng phải vào bằng HTTPS,
nếu không sẽ thấy triệu chứng "đăng nhập xong lại về trang đăng nhập".

**4. `/app/data` là tạm bợ.** CSDL SQLite và tệp âm thanh nằm ở đó, và nó biến
mất khi task bị thay — tức là mất toàn bộ tài khoản và bài làm. Ba lối ra, xếp
theo độ đúng đắn: chuyển sang RDS Postgres (đã có mục trong roadmap, và là việc
lớn), hoặc gắn EFS vào `/app/data`, hoặc chấp nhận mất dữ liệu ở môi trường thử.
Riêng tệp âm thanh thì `AUDIO_STORAGE=s3` đã tách hẳn ra khỏi `/app/data` được
rồi (2026-08-13). Trên ECS/App Runner nên gắn **task role** thay vì đặt khoá:
khoá tạm do nền tảng cấp, tự xoay vòng, và một khoá không tồn tại thì không rò
được. Chỉ còn CSDL là chưa tách.

### Bí mật: đừng để trong task definition

Biến môi trường trên ECS được ghi thẳng vào **task definition** — ai có quyền
xem console đều đọc được, `describe-task-definition` in ra, và **mọi revision cũ
đều giữ lại vĩnh viễn**. Nên mật khẩu CSDL nằm ở một chỗ không ai coi là kho bí
mật, và đổi nó nghĩa là sửa rồi deploy lại.

Đặt `AWS_SECRETS_ID` trỏ tới một secret JSON dạng `{"ADMIN_PASSWORD": "…",
"VNPAY_HASH_SECRET": "…"}`; lúc khởi động `server/secrets.js` lấy về rồi trộn
vào `process.env` **trước khi có gì đọc khoá**. Task chỉ cần quyền đọc đúng
secret đó. Không có gì nhạy cảm trong task definition, xoay vòng khoá là sửa một
chỗ, và AWS ghi log ai đã đọc.

**Secret thắng biến môi trường**, và tên nào bị ghi đè thì in ra log (chỉ tên,
không bao giờ giá trị). Chiều ngược lại trông quen hơn nhưng sai ở đây: một
`ADMIN_PASSWORD` cũ còn sót trong task definition sẽ **âm thầm che** khoá vừa
xoay vòng — xoay xong tưởng là xong, thực tế không đổi gì. Riêng những biến
quyết định **chỗ lấy** secret (`AWS_REGION`, credential, `AWS_SECRETS_ID`,
`SECRETS_ENDPOINT`, `NODE_ENV`) thì secret không được phép đặt: một secret sửa
được địa chỉ đã lấy chính nó là một secret trỏ lần khởi động sau đi nơi khác.

Một luật đi kèm, và `scripts/test-secrets.mjs` đọc mã nguồn để giữ nó: **không
module nào được đọc khoá vào hằng số lúc import**. `load()` chạy trong hàm boot,
tức là *sau* mọi `require` ở đầu `server.js`, nên hằng số bắt lúc import giữ
đúng chuỗi rỗng của lúc trước khi secret về — và không có gì ném lỗi. Triệu
chứng là màn đăng nhập báo Google chưa cấu hình trên một deployment đã cấu hình
đủ, và thư xác thực gửi đi không tới. Đọc lúc gọi (`clientId()`, `settings()`,
`supabase()`) thì không dính.

## Deploy: Claude → GitHub → AWS

Một commit lên nhánh làm việc → GitHub chạy **toàn bộ** gate → chỉ khi xanh mới
được chạm tới máy chủ. Ba tệp:

| Tệp | Việc |
|---|---|
| `.github/workflows/deploy.yml` | **khi nào** deploy: chạy gate, rồi gọi Systems Manager |
| `deploy/ec2-deploy.sh` | **làm thế nào**: fetch, cài, build, restart, kiểm `/healthz`, hỏng thì **tự lùi lại commit cũ** |
| `deploy/vpet-prep.service` | unit systemd: tự dậy sau reboot và sau crash, log vào journal |

**Chưa cấu hình thì nó không làm gì cả.** Job deploy có điều kiện trên hai
biến, nên gộp tệp này vào nhánh không deploy đi đâu hết.

**Không có khoá AWS trong GitHub.** Job deploy nhận vai IAM qua **OIDC** — khoá
sinh ra cho đúng một lần chạy rồi hết hạn — và chạm tới máy chủ qua **Systems
Manager** chứ không phải SSH: không có khoá nào để giữ, không phải mở cổng 22,
và AWS ghi lại ai chạy lệnh gì.

**Tự động deploy mặc định TẮT.** Phiên tự động commit lên nhánh này khoảng mỗi
giờ, nên "mỗi commit hàng giờ đi thẳng lên production" phải là quyết định có
người bấm. Bật bằng biến `DEPLOY_ON_PUSH=true`. Trước khi bật thì vẫn deploy
được bằng tay từ tab Actions, trên đúng commit bạn chọn.

Cần khai trong **Settings → Secrets and variables → Actions → Variables** (là
*variables*, không phải secrets — không cái nào là bí mật cả):

```
AWS_ROLE_ARN      arn:aws:iam::<account>:role/<vai cho GitHub OIDC>
AWS_REGION        ap-southeast-1
EC2_INSTANCE_ID   i-0123456789abcdef0
DEPLOY_ON_PUSH    true, khi muốn mỗi commit tự lên
```

Phía AWS cần bốn thứ, hai cái đầu đã có sẵn tệp dán thẳng vào:

1. Một OIDC provider cho `token.actions.githubusercontent.com`.
2. Một role tin provider đó — `deploy/github-oidc-trust-policy.json`.
3. Quyền cho role đó — `deploy/github-oidc-permissions.json`: `ssm:SendCommand`
   lên **một** instance với **một** document, hết.
4. Bản thân instance cần SSM agent và `AmazonSSMManagedInstanceCore`.

### `sub` claim: chỗ trust policy hay sai, và sai thì im lặng

`sub` do **GitHub** phát, không phải workflow tự khai, và nó **luôn** bắt đầu
bằng `repo:<owner>/<name>`. Đó là lý do khoá theo repo là thật: không workflow
nào giả được tiền tố ấy. Phần **sau** tiền tố mới là chỗ dễ sai:

| Ngữ cảnh | `sub` |
|---|---|
| push / dispatch trên một nhánh | `repo:owner/name:ref:refs/heads/<branch>` |
| job có khai `environment:` | `repo:owner/name:environment:<name>` |
| sự kiện `pull_request` | `repo:owner/name:pull_request` |

Job deploy ở đây khai `environment: production`, nên **dạng environment mới là
dạng thật sự đến** — trust policy ghim theo `ref:refs/heads/...` sẽ không bao
giờ khớp, và lỗi trả về chỉ nói `Not authorized to perform
sts:AssumeRoleWithWebIdentity`, không nói claim nào lệch.

Hệ quả quan trọng: **trust policy ghim environment, không ghim được nhánh** —
nhánh nào trong repo này cũng khai được `environment: production`. Nên khoá
nhánh nằm ở GitHub, nơi nó thật sự được thi hành: **Settings → Environments →
production → Deployment branches and tags → Selected branches →
`claude/prep-test-platform-design-fpiuqn`**. Thiếu bước này thì mọi nhánh trong
repo đều nhận được vai.

Repo tạo sau 15/07/2026 (hoặc đã bật immutable subject claims) còn kèm id số:
`repo:owner@123456/name@456789:environment:production`. Nên **đừng đoán chuỗi
`sub`** — chạy thử rồi đọc giá trị thật từ log.

Xem trust policy đang thật sự là gì, thay vì cái mình tưởng:

```bash
aws iam get-role --role-name <tên-role> \
  --query 'Role.AssumeRolePolicyDocument.Statement[].Condition' --output json
```

Đọc kỹ hai điều: chuỗi có còn nguyên tiền tố `repo:thankyouu91/PREPTEST:` không
(mất tiền tố này, hoặc đổi thành `repo:thankyouu91/*`, là repo **không** còn bị
khoá), và điều kiện là `StringEquals` hay `StringLike` — `StringLike` với `*` ở
cuối mở ra mọi nhánh, mọi environment và cả `pull_request` trong repo đó.

### Lần đầu: phải `bootstrap` trước, `deploy` sau

`deploy/ec2-deploy.sh` **cập nhật** một bản cài đã có — fetch, cài, restart. Nó
không tạo ra bản cài. Lần deploy đầu tiên qua pipeline hỏng đúng ở chỗ đó:

```
bash: /opt/vpet-prep/deploy/ec2-deploy.sh: No such file or directory
failed to run commands: exit status 127
```

OIDC và SSM đều chạy đúng — lệnh đã tới được instance và đã chạy. Chỉ là ở
đường dẫn ấy không có gì cả, vì chưa ai đặt vào. `deploy/ec2-bootstrap.sh` là
bước còn thiếu, chạy **một lần** bằng tay trên instance:

```bash
sudo bash ec2-bootstrap.sh      # hoặc dán vào SSM → Run Command
```

Nó tạo user, clone repo vào `/opt/vpet-prep`, đặt CSDL và tệp âm thanh ở
`/var/lib/vpet-prep` (**ngoài** checkout, vì mỗi lần deploy sẽ reset working
tree), cài unit systemd, sinh `ADMIN_PASSWORD` và in ra **một lần**, rồi khởi
động. Chạy lại lần hai vô hại: bước nào cũng kiểm trước khi làm.

**Repo private thì script tự lo phần khoá.** Nó sinh một cặp khoá ed25519
**ngay trên instance** (nửa private không bao giờ rời ổ đĩa đó — không vào chat,
không vào repo, không vào password manager), thử đọc repo qua HTTPS trước (repo
public thì không cần khoá gì cả), rồi qua SSH. Nếu chưa đọc được, nó **in ra nửa
public** kèm đúng đường link để dán vào và dừng lại; chạy lại lần nữa là đi tiếp.

Dán vào **Settings → Deploy keys → Add deploy key**, và **để trống ô "Allow
write access"**: một deploy key có quyền ghi nghĩa là máy chủ có thể sửa lại
chính cái repo mà nó deploy từ đó.

Deploy key khác PAT ở chỗ nó chỉ đọc được **một repo này**, không gắn với tài
khoản người nào, và thu hồi là xoá một dòng.

Nó cũng **dừng lại nếu cổng 3000 đang có người khác giữ** — đó là dấu hiệu đang
có một bản cài bằng tay ở chỗ khác, và cài chồng lên nghĩa là hai CSDL song
song: mật khẩu bạn vừa đặt nằm ở một cái, còn người đăng nhập lại vào cái kia.

### Ba cái bẫy trên EC2, cả ba đều im lặng

Chạy `node scripts/accounts.js doctor` **trên chính instance đó** — nó kiểm cả ba.

1. **Đổi mật khẩu nhầm CSDL.** `PREP_DB` không đặt thì CSDL là
   `<thư-mục-làm-việc>/data/prep.sqlite`, nên hai bản checkout là hai CSDL khác
   nhau và không có gì báo cho bạn. Triệu chứng giống hệt sai mật khẩu: 401 với
   đúng mật khẩu bạn vừa đặt. `doctor` đọc `/proc/<pid>/fd` để nói ra file mà
   tiến trình **đang thật sự mở**.
2. **`NODE_ENV=production` trên `http://`.** Cookie phiên bật cờ `Secure`, trình
   duyệt không gửi lại, nên đăng nhập xong bật ngay về màn đăng nhập. Dựng HTTPS,
   hoặc `FORCE_SECURE_COOKIE=0` một cách có ý thức.
3. **`TRUST_PROXY` sai sau load balancer.** `req.ip` thành địa chỉ của balancer
   với mọi người, nên năm lần gõ sai của một người khoá tất cả những người khác.

### Lần đầu chưa có admin thì mật khẩu ở đâu

Boot đầu tiên trên một CSDL trống mà **không** có `ADMIN_PASSWORD` sẽ tự sinh
một mật khẩu và in ra log **đúng một lần**:

```bash
sudo journalctl -u vpet-prep | grep -A3 "Seed administrator"
```

Mất rồi thì `sudo -u vpet node scripts/accounts.js reset-admin` (bỏ trống để nó
tự sinh và in ra một lần). Cách đúng là đặt `ADMIN_PASSWORD` **trước** lần chạy
đầu — hoặc tốt hơn, đặt `AWS_SECRETS_ID` và để Secrets Manager giữ nó.

## Google Classroom (đọc lớp học và roster)

Mọi tích hợp Google khác ở đây nói chuyện với tư cách **máy chủ** — Cloud
Storage và Gemini dùng service account, tức là một danh tính máy có quyền
riêng. Classroom không làm thế được: một lớp học thuộc về **giáo viên**, và
không có cỗ máy nào là thành viên của lớp đó. Nên đây là tích hợp duy nhất mà
quản trị viên phải cấp cho nền tảng quyền hành động thay mình, và mọi thứ trong
`server/classroom.js` là hệ quả của điều đó.

| Đường đi | Việc |
|---|---|
| `GET /auth/google/classroom` | requireAdmin → màn hình đồng ý của Google |
| `GET /auth/google/classroom/callback` | đổi code lấy **refresh token**, niêm phong rồi lưu |
| `GET /api/admin/classroom` | trạng thái: bật chưa, nối chưa, nối bằng email nào |
| `GET /api/admin/classroom/courses` | các lớp đang hoạt động của giáo viên đó |
| `GET /api/admin/classroom/courses/:id/roster` | học viên trong lớp, kèm tài khoản tương ứng ở đây |
| `POST /api/admin/classroom/unlink` | thu hồi ở Google rồi xoá bản ghi |

Thêm một thẻ trong `/admin/quan-tri/`: nối tài khoản, chọn lớp, xem roster.
Chưa có khoá thì thẻ nói thẳng là thiếu biến nào, không giả vờ đã nối.

**Refresh token được mã hoá khi lưu.** Nó không giống TOTP secret mà CSDL này
đã giữ: TOTP secret vô dụng nếu không có mật khẩu, còn refresh token **tự nó**
là một đường vào tài khoản Google của người ta cho tới khi bị thu hồi — mà bản
ghi ấy nằm trong mọi bản sao lưu và mọi lần export. Nên nó được niêm phong
AES-256-GCM dưới `TOKEN_ENCRYPTION_KEY`, và **không có khoá thì tính năng tắt**
chứ không lưu token trần. Đây là chỗ duy nhất cố ý không xuống thang êm ái:
xuống thang ở đây nghĩa là bản triển khai nào không làm gì cả lại là bản kém an
toàn nhất.

**Chỉ xin quyền đọc.** `classroom.courses.readonly`, `classroom.rosters.readonly`
và `classroom.profile.emails`. Đăng bài tập và đẩy điểm cần
`classroom.coursework.students`, và quyền đó sẽ xin khi có tính năng dùng tới —
Google có sẵn cơ chế xin thêm quyền về sau, còn một quyền xin trước khi dùng là
một quyền giáo viên cấp không.

**Hai tham số trên URL đồng ý không được thiếu.** `access_type=offline` là thứ
khiến Google trả refresh token, còn `prompt=consent` là thứ khiến Google trả nó
**lần nữa** khi nối lại — Google chỉ phát refresh token ở lần đồng ý đầu tiên,
nên thiếu tham số thứ hai thì lần nối lại tạo ra một grant không tự gia hạn
được: chạy được cho tới lúc không.

## Thanh toán (VNPay / MoMo, sandbox)

`server/payments.js` ký và xác minh chữ ký cho hai cổng; `server/payment-api.js`
là vòng đời đơn hàng quanh nó. **Tắt hẳn khi chưa có khoá** — màn mua code vẫn
hiển thị đúng câu đang hiển thị hôm nay: liên hệ trung tâm để lấy code.

| Biến | Việc |
|---|---|
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET` | thiếu một trong hai là VNPay tắt |
| `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` | thiếu một trong ba là MoMo tắt |
| `PUBLIC_BASE_URL` | tên miền công khai, để dựng URL trả về và URL nhận thông báo |
| `VNPAY_PAY_URL`, `MOMO_CREATE_URL` | đổi sang endpoint thật khi chủ dự án quyết định chạy live |
| `CHECKOUT_PER_HOUR` (20), `IPN_PER_MIN` (120) | trần chống lạm dụng |

### Chỉ IPN mới chốt đơn

Mỗi cổng báo kết quả về **hai nơi**: một **URL trả về** (trình duyệt người mua
được chuyển hướng về) và một **IPN** (máy chủ của cổng gọi thẳng máy chủ mình).

URL trả về là lời khai của bất kỳ ai đang cầm trình duyệt — tham số nằm ngay trên
thanh địa chỉ và gõ tay được. Nó chỉ quyết định **người mua nhìn thấy gì**, không
quyết định gì khác. **Chỉ IPN mới chốt đơn**, và chỉ sau khi HMAC khớp. Coi
redirect là bằng chứng đã thanh toán là cách kinh điển để cho không sản phẩm.

Mọi thứ đến từ bên ngoài đều kiểm trên nội dung: HMAC tính lại tại chỗ và so
sánh theo thời gian hằng định; đơn phải tồn tại và đúng cổng đã đặt; **số tiền
khớp tới từng đồng**; và chốt hai lần chỉ cấp **một** code — cổng thanh toán gửi
lại IPN cho tới khi được xác nhận, nên bản trùng là lưu lượng bình thường chứ
không phải tấn công.

Code cấp ra ở trạng thái **chưa kích hoạt** và chưa gán cho ai: mua không phải là
kích hoạt, nên code mua tặng vẫn dùng được. Người mua kích hoạt bằng luồng nhập
code sẵn có, và kỳ hạn tính từ lúc kích hoạt.

### Màn mua và màn nhận kết quả

`/prep/mua-code/` hỏi `GET /api/checkout/providers` **một lần**, rồi hiện mỗi cổng
đã cấu hình một nút. Bấm nút là gọi `POST /api/checkout` và chuyển trình duyệt
sang trang thanh toán. Chưa có khoá thì cả khối ẩn đi và hộp thoại đọc y hệt lúc
chưa có thanh toán online — mua qua trung tâm **không phải** là phương án chữa
cháy, nó vẫn là đường mua bình thường, nên khi có cổng thì phần đó được **viết
lại** chứ không bị bỏ đi.

`/prep/code-cua-toi/` đọc `?order=&status=` do URL trả về để lại.
**`pending` là trường hợp bình thường, không phải lỗi**: trình duyệt người mua
gần như luôn về đích trước khi IPN của cổng kịp tới, nên câu đúng là "đã nhận,
đang xác nhận". Sau khi hiện xong thì tham số bị gỡ khỏi thanh địa chỉ — tải lại
trang không nên báo lại một lần thanh toán, và mã tham chiếu không nên nằm trong
bookmark.

Màn học viên bên khu quản trị hiện **trạng thái đơn**. Trước đây không cần: đơn
hàng là bản ghi của việc đã xong rồi. Giờ đơn tồn tại **trước** khi tiền chuyển,
nên `pending` mà hiển thị như `paid` thì một đơn chưa trả trông y như một đơn đã
bán.

### Hai ngoại lệ mới trong bản đồ bảo mật

Cổng thanh toán không giữ được cookie, nên IPN **không thể** có auth guard lẫn
`csrfGuard`. Thay vào đó là `gatewaySigned` — một middleware **có tên** để
`scripts/security-map.mjs` đọc được ra từ stack của Express và in vào bảng trong
`docs/SECURITY.md`, thay vì route trông như đang trần trụi.

Và VNPay quy định IPN của họ là **GET**, thứ mà bản rà soát vốn coi là an toàn
nên sẽ bỏ qua — cũng nằm ngoài write limit toàn cục vì cái đó chỉ phủ các method
không an toàn. Nên có thêm danh sách `MUTATING_GETS`, kiểm tra hai chiều, và
handler tự mang rate limit riêng.

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

## Analytics gửi từ máy chủ (GA4 Measurement Protocol)

Thẻ gtag.js **không chạy được ở đây và sẽ không bao giờ chạy**: `script-src 'self'
'nonce-…'` không có ngoại lệ nào, và mở một ngoại lệ để chiều một thẻ của bên thứ
ba là xoá đi dòng giá trị nhất trong toàn bộ CSP. Google có sẵn đường đi phía máy
chủ cho đúng việc này — Measurement Protocol — nên sự kiện được `fetch` thẳng từ
`server/analytics.js`, không thêm dependency, không thêm script nào vào trang.

**Tắt khi thiếu `GA4_MEASUREMENT_ID` hoặc `GA4_API_SECRET`.** Lúc đó `track()` là
hàm rỗng, không có request nào rời khỏi tiến trình — cũng là điều mọi bài test
khác nhìn thấy.

| Biến | Mặc định | Việc |
|---|---|---|
| `GA4_MEASUREMENT_ID`, `GA4_API_SECRET` | — | thiếu một trong hai là tắt hẳn |
| `ANALYTICS_SALT` | chính `GA4_API_SECRET` | khoá HMAC để băm định danh |
| `GA4_ENDPOINT` | endpoint của Google | đổi sang collector tự dựng, hoặc máy giả khi test |

### Nhận ra một người mà không đặt cookie theo dõi

Thẻ gtag bình thường ghi cookie `_ga` rồi gọi đó là `client_id`. Không có thẻ, nên
danh tính phải lấy từ chỗ khác — và một cookie bền vững gắn theo từng người chỉ để
**đếm người** là thứ nền tảng này sẽ nợ học viên một banner xin phép. Nên làm hẹp
hơn:

- **Đã đăng nhập** — `client_id` là HMAC của user id, `user_id` là id số. Bền qua
  nhiều thiết bị và nhiều lần deploy, không cần cookie nào, và đó mới là danh tính
  mà báo cáo của một nền tảng học thật sự cần.
- **Khách** — `client_id` là HMAC của địa chỉ IP, user-agent **và ngày**. Ổn định
  trong một ngày để một lượt ghé thăm còn dính vào nhau, và hết ngày là mất, nên
  không phải định danh lâu dài của bất kỳ ai.

**Cái giá thì nói thẳng chứ không giấu:** khách quay lại hôm sau bị đếm là người
mới, nên số người dùng duy nhất của lưu lượng chưa đăng nhập sẽ cao hơn thực tế.
Phiên, đường dẫn trang và phễu chuyển đổi vẫn đúng, mà đó mới là thứ những con số
này dùng để làm gì.

Hai tính chất hay ho đi kèm việc gửi từ máy chủ: Google thấy địa chỉ IP của **máy
chủ** chứ không phải của học viên, và `non_personalized_ads` được bật trên mọi
payload. Không có gì trong payload mang tên, email, địa chỉ IP hay chuỗi
user-agent — chỉ có bản băm, không đảo ngược được nếu không có salt. Có hẳn một
mục trong `scripts/test-analytics.mjs` quét khẳng định điều đó.

### Không bao giờ được làm hỏng một request

Analytics là việc kém quan trọng nhất tiến trình này làm. Sự kiện chỉ gửi **sau
khi response đã đi**, không handler nào `await` nó, có timeout ngắn, và mọi lỗi bị
nuốt vào một bộ đếm. Payload mà GA4 sẽ từ chối thì bỏ ngay tại chỗ chứ không ném
ra. Quá 16 request đang bay thì bỏ bớt, nên một đợt tăng tải không biến thành số
socket không giới hạn.

Sự kiện đang gửi: `page_view` (chỉ trang `/prep/*`; **màn quản trị cố ý không
đếm** — lưu lượng nhân viên nằm chung một property làm sai mọi phễu, mà sau đó
không tách ra được nữa), `sign_up`, `login`, `unlock_code` (gửi id gói, **không
bao giờ gửi mã code** — mã là một thứ bearer credential), `exam_start`,
`exam_submit`.

`session_id` và `engagement_time_msec` được đặt trên mọi sự kiện. Thiếu hai thứ
đó thì sự kiện vẫn tới nơi nhưng gần như không hiện trong báo cáo tiêu chuẩn nào —
đó là khác biệt giữa "POST trả về 204" và "số liệu có thật".

## Tự động hoá

`docs/ROADMAP.md` là hàng đợi công việc. Một Routine chạy **mỗi giờ** sẽ lấy mục chưa tick đầu tiên,
làm xong, chạy toàn bộ kiểm thử rồi mới commit và push lên nhánh làm việc. Nếu kiểm thử đỏ thì hoàn
tác và ghi lý do vào mục "Vướng mắc" thay vì push. Tắt Routine bất cứ lúc nào trong phần Routines.

**CI**: `.github/workflows/verify.yml` chạy `SKIP_SHOTS=1 npm run verify` cho
mọi nhánh, mọi pull request, và chạy tay được. Bỏ bước chụp ảnh là chủ ý — ảnh
nghiệm thu là sản phẩm soi bằng mắt rồi commit tay, để CI sinh ra ảnh không ai
xem trong một thư mục nó vứt đi ngay sau đó thì tốn hai phút mà chẳng được gì;
mọi cổng đúng-sai vẫn chạy đủ, kể cả bước audit (bước này thật sự cần trình
duyệt). Không thêm dependency nào: `playwright-core` có sẵn lệnh `install`.

Đường dẫn Chromium do `scripts/_browser.mjs` quyết: biến `CHROMIUM` nếu có →
`/opt/pw-browsers/chromium` nếu nó tồn tại thật → không đặt gì, để Playwright tự
tìm bản nó vừa cài. Trước đây tám script gắn cứng đường dẫn ấy, thứ chỉ tồn tại
trên máy phát triển này. Bốn script vẫn còn tự gọi `chromium.launch()` — ba
trong số đó truyền `executablePath` có thể bằng `null` — nay cả bốn đều đi qua
`launchChromium()`, nên không còn chỗ nào tự quyết đường dẫn, và mọi trang mở ra
đều được bọc sẵn lớp thử lại `goto` nói ở dưới.

`npm run verify` chạy hết trong khoảng **sáu phút** và in **bảng thời gian từng
bước** ở cuối, nên lần chậm sau tự tố cáo chính nó thay vì lẫn trong một bức
tường dấu tích. Bước audit và bước chụp ảnh — 318 lượt tải trang, mỗi lượt một
`BrowserContext` riêng và không dùng chung state nào — chạy song song qua
`scripts/_pool.mjs`, số luồng lấy theo số lõi máy và chặn trên ở 4 (ép bằng
`PW_JOBS`). Kết quả thu theo đúng thứ tự đầu vào rồi mới in: báo cáo mà đổi thứ
tự sau mỗi lần chạy thì không so được với lần trước.

**Một job hỏng không còn kéo sập cả lượt chạy.** Trước đây ngoại lệ thoát khỏi
worker, `Promise.all` bị reject, và 220 job được báo bằng một stack trace không
nói trang nào cũng không nói bề rộng nào — nên một kết nối bị rớt trông y hệt
như giao diện hỏng ở khắp nơi. Nay lỗi nằm đúng ô của job đó, có tên trang, và
các job còn lại vẫn chạy hết. Tính chất "hỏng thì dừng sớm" vẫn giữ cho đúng
trường hợp cần nó: đủ nhiều job hỏng trong một lượt (mặc định 5) thì pool bỏ
cuộc, vì lúc ấy không phải chập chờn mà là server đã chết.

Đi kèm là `scripts/_retry.mjs`, một lớp thử lại **có chặn trên** cho hai chỗ đã
từng làm cổng đỏ oan: bước hâm nóng CSRF và `page.goto`. Hai quy tắc giữ cho nó
không che lỗi thật — danh sách lỗi coi là "tạm thời" là **danh sách đóng** (sai
assertion, timeout, lỗi 500 đều không thử lại, vì hỏi lại lần nữa cũng thế), và
**mỗi lần thử lại đều in ra một dòng**, vì im lặng sẽ biến một lỗi server chập
chờn thành một lỗi vô hình. Danh sách ấy viết bằng cách đọc lỗi thật ném ra chứ
không viết theo trí nhớ: `fetch` báo đứt kết nối là `TypeError: fetch failed` và
giấu `SocketError: other side closed` trong `cause`, nên bản đầu tiên — viết
theo trí nhớ — không khớp chữ nào.

## Tài khoản demo

Có một tài khoản học viên mẫu, tên đăng nhập `student` (hoặc
`student@vpetprep.vn`), đã mở sẵn 1 bài VPET B1. **Mật khẩu của nó không nằm
trong repo này** — đặt lấy một lần:

```bash
node scripts/accounts.js reset-student '<mật khẩu bạn chọn>'
```

**Vì sao bỏ đi.** Trước đây mật khẩu demo là một chuỗi cố định nằm trong hơn mười
tệp, được liệt kê ở đây, và **in thẳng lên trang đăng nhập kèm nút điền sẵn**.
Trong một repo ai cũng đọc được thì đó không phải tài khoản demo — đó là một lượt
đăng nhập phát cho mọi người đọc mã nguồn. Thẻ demo trên trang đăng nhập đã bị gỡ,
và `scripts/test-auth.mjs` kiểm tra rằng nó **không quay lại**.

`npm run verify` tự sinh một mật khẩu mới cho mỗi lượt chạy, đặt vào tài khoản rồi
truyền cho các script qua biến `DEMO_STUDENT_PASSWORD`. Muốn chạy tay một script:

```bash
DEMO_STUDENT_PASSWORD='<mật khẩu>' node scripts/audit.mjs
```

> ⚠️ Ở `NODE_ENV=production` tài khoản demo **không** được đụng tới, và không có
> `DEMO_STUDENT_PASSWORD` thì server cũng không đặt lại gì cả.

Tài khoản tự đăng ký nằm trong bảng `users` phía server, mật khẩu băm scrypt. Quyền mở khoá suy ra
từ các code đã kích hoạt trong CSDL, nên đổi máy vẫn còn. Đổi mật khẩu ở tab Bảo mật đăng xuất mọi
thiết bị khác.

## Khu tự học

| Màn | Đường dẫn | Nội dung |
|---|---|---|
| Ôn tập ngắt quãng | `/prep/hoc/on-tap/` | Hàng đợi thẻ ghi nhớ theo lịch SM-2 rút gọn, rút từ ba bộ: động từ bất quy tắc, từ nối, và nghĩa từ vựng. Chỉ hiện thẻ **đến hạn**; tự chấm bằng bốn nút, bấm phím `Space` để lật và `1`–`4` để chấm. Lịch tính ở máy chủ nên đổi máy vẫn đúng — xem [Lịch ôn tập](#lịch-ôn-tập-sm-2-rút-gọn) |
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

### Lịch ôn tập (SM-2 rút gọn)

`docs/LEARNING.md` §6 đặt ra `ease`, `interval`, `due_at` và "chỉ thấy mục đến
hạn", nhưng không chốt con số. Con số nằm ở `server/srs.js`, và **chỉ ở đó**: mọi
hàm trong file là hàm thuần — trạng thái vào, trạng thái ra, đồng hồ truyền vào
làm tham số — nên kiểm được chính xác từng ngày mà không phải chờ một ngày.

SM-2 gốc chấm 0–5 rồi chạy đa thức. Sáu nút là nhiều hơn mức một người tự phân
biệt được thật lòng, nên bản này giữ **hình dạng** của SM-2 (mỗi thẻ một hệ số
`ease`, nhân vào khoảng cách đang lớn dần, có sàn) và rút xuống bốn nút:

| Nút | Nghĩa | Làm gì với lịch | `ease` |
|---|---|---|---|
| **Again** | không nhớ ra | **vứt** khoảng cách, học lại từ đầu, hẹn lại sau 10 phút, `lapses` +1 | −0.20 |
| **Hard** | nhớ ra, chật vật | ×1.2 (ít nhất +1 ngày) | −0.15 |
| **Good** | nhớ ra | bước SM-2 bình thường | 0 |
| **Easy** | nhớ ngay, quá dễ | bước bình thường rồi ×1.3 | +0.15 |

- `ease` bắt đầu 2.5 và **không bao giờ xuống dưới 1.3** — sàn của chính SM-2, và
  nó quan trọng: không có sàn thì một thẻ sai đủ nhiều lần sẽ về 0 và vĩnh viễn
  không rời khỏi hàng đợi.
- Hai khoảng cách đầu **cố định 1 ngày rồi 6 ngày**, đúng như SM-2 công bố: lấy
  `interval × ease` ngay từ đầu sẽ đẩy một thẻ mới ra tận hai ngày rưỡi khi nó
  còn chưa được nhớ lại lần nào.
- Từ lần đúng thứ ba: `interval = round(interval × ease)`.
- Trần một năm. Xa hơn thế thì lịch là chuyện hư cấu — từ đó hoặc đã nằm trong
  vốn dùng hằng ngày, hoặc đã mất.

**Tự chấm là có chủ ý.** Đây là thẻ nhớ lại, không phải câu thi: chỉ người học
mới biết đáp án bật ra hay là chắp vá lại. Vì thế mặt sau của thẻ **được gửi kèm
mặt trước** — ngược hẳn với router làm bài, nơi mọi `answer` đều bị loại bỏ trước
khi serialise. Ở đây không có gì để gian lận, và gửi cả hai mặt nghĩa là cả buổi
ôn không cần thêm một vòng gọi mạng nào cho mỗi thẻ.

Lịch tính **ở máy chủ**, từ đồng hồ máy chủ; không nhận bất cứ mốc thời gian nào
từ trình duyệt. Mỗi lượt gọi trả về tối đa 20 thẻ, và **20 thẻ mới mỗi ngày**
(`LEARN_NEW_PER_DAY`). Mốc "hôm nay" mặc định theo giờ UTC+7 chứ không phải UTC
(`LEARN_DAY_OFFSET_MIN`): tính theo UTC thì một buổi học lúc 6 giờ sáng sẽ được
phát nhầm hạn mức của hôm qua.

### Lược đồ từ vựng

Năm bảng theo đúng `docs/LEARNING.md` mục 6: `vocab_entries` (từ gốc, khoá tự
nhiên là **(headword, pos)** — `book` danh từ A1 và `book` động từ A2 là hai
mục), `vocab_senses` (nghĩa, **mang bậc riêng** vì một nghĩa có thể cao hơn bậc
của từ gốc), `vocab_examples` (câu song ngữ, treo dưới *nghĩa* chứ không phải
dưới từ), `vocab_forms` (dạng biến đổi, có index riêng để gõ `children` vẫn ra
`child`) và `collocations`.

Trình nhập `seedVocab()` **upsert theo khoá tự nhiên**, không xoá-rồi-nạp như
các bảng nội dung khác. Lý do: `learn_progress` sắp trỏ vào id của nghĩa, nên
nhập lại danh sách từ không được phép đánh số lại hàng bên dưới lịch ôn của
người học. Ba luật kèm theo:

- Bậc có `level_source = 'manual'` **không bị ghi đè** — mục 1.4 nói sửa tay
  luôn thắng ba luật tự động, một lần nhập lại lặng lẽ trả về cũ sẽ khiến câu đó
  thành sai. Mọi thứ khác của mục đó vẫn được làm mới.
- Nhánh dưới mà nguồn đã bỏ thì bị xoá, nhưng chỉ trong những mục đang được
  nhập. Nghĩa còn trong nguồn giữ nguyên id; nghĩa mất đi kéo theo câu ví dụ của
  nó qua `ON DELETE CASCADE`.
- Mục nguồn **không** nhắc tới thì không bị đụng, nên từ do quản trị viên tự
  thêm không bị quét đi.

`server/data/vocab.js` hiện giữ **12 mục khởi tạo** — không phải danh sách từ.
Chúng được chọn để mọi bảng và mọi quan hệ đều có dữ liệu thật: hai mục chung
mặt chữ khác từ loại, nghĩa cao hơn bậc từ gốc, số nhiều bất quy tắc, đủ bốn
dạng động từ, so sánh bất quy tắc, dạng phái sinh, danh từ không đếm được, và
collocation đủ các kiểu. Cột `freq_rank` để trống ở mọi dòng: hạng tần suất là
dữ liệu của NGSL, bịa ra một con số còn tệ hơn để trống. Việc nhập NGSL / NAWL /
TSL / Tatoeba nằm ở hàng đợi nội dung.

Đọc qua `GET /api/learn/vocab` (lọc theo bậc, từ loại, tìm theo mặt chữ / dạng
biến đổi / nghĩa tiếng Việt) và `GET /api/learn/vocab/:headword` (một mặt chữ,
trả về **mọi từ loại** cùng lúc — người tra chưa biết mình cần từ loại nào).
`scripts/test-vocab.mjs` kiểm cả hai nửa: API trên server đang chạy, và ngữ
nghĩa của trình nhập trên một cơ sở dữ liệu tạm qua `PREP_DB`.

Hàng đợi ôn tập dùng hai endpoint nữa, cả hai đều sau `requireUser`:
`GET /api/learn/review` (một mẻ tối đa 20 thẻ, kèm tiến độ từng bộ và **nhãn cho
từng nút** — màn hình không phải cài lại thuật toán để in ra "6 ngày") và
`POST /api/learn/review` (`requireUser` + `csrfGuard`, thân `{deck, itemId, grade}`).
Bảng `learn_progress` **không** có khoá ngoại sang ba bảng nội dung: chúng được
nạp lại từ file, và một `ON DELETE CASCADE` sẽ biến việc sửa một lỗi chính tả
trong danh sách từ thành việc xoá sạch sáu tháng lịch ôn của người học. Thẻ trỏ
vào một dòng không còn tồn tại thì lặng lẽ bị bỏ qua lúc dựng hàng đợi — kiểu
hỏng không làm mất gì.

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
node scripts/export-supabase.mjs --ddl              # tạo bảng + RLS (chạy lại vô hại)
node scripts/export-supabase.mjs --data             # toàn bộ INSERT, đã ON CONFLICT DO UPDATE
node scripts/export-supabase.mjs --json exam_questions   # hoặc JSON để nạp qua PostgREST
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
| `/prep/hoc/on-tap/` | `public/prep/learn/on-tap.html` | Cần đăng nhập |
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
dark mode và tenant `evergreen`. Sinh bằng `npm run screenshot` và
`npm run screenshot:admin`.

**Không commit nữa (2026-08-13).** 86 ảnh này được chụp lại mỗi lượt chạy cổng
kiểm thử, và lịch sử của chúng đã chiếm **575 MB — 95% khối lượng repo** cho
những tệp tái tạo được bằng một lệnh. Nay nằm trong `.gitignore`; xem chúng bằng
cách chạy lệnh ở trên, ảnh sẽ hiện ra trong thư mục đó như cũ.

## Ngoài phạm vi giai đoạn này

Engine làm bài + chấm điểm + nội dung đề; backend (tài khoản, phiên, access code, thanh toán,
dashboard admin nhập đề, API từng màn); bảo mật (bcrypt, CSRF, rate-limit, chống brute-force
và redeem-abuse, mã hoá PII, phân quyền). Sẽ làm ở các prompt riêng.
