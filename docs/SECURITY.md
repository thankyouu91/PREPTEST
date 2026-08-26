# Rà soát bảo mật — endpoint, guard, giới hạn ghi

Tệp này là **kết quả sinh ra**, không phải ghi chép tay. Bảng ở cuối do
`scripts/security-map.mjs` đọc thẳng stack của Express mà dựng, và
`scripts/test-security.mjs` sinh lại rồi so — lệch một dòng là đỏ. Nghĩa là
thêm một endpoint mà quên guard thì `npm run verify` báo ngay, chứ không đợi
lần rà soát sau.

Đọc stack chứ không đọc mã nguồn, vì chỉ stack mới biết cái gì thực sự chạy:
`router.use('/admin', requireAdmin, csrfGuard)` bọc mọi route đăng ký **sau**
nó và không bọc ba route đăng ký trước. Đọc bằng mắt rất dễ kết luận ngược.

## 1. Header trên mọi response

Đặt một chỗ ở `server/security.js`, gắn trước mọi router trong `server.js`.
Header nào phải nhớ gắn ở từng handler là header mà handler tiếp theo sẽ quên.

| Header | Giá trị | Vì sao |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Trình duyệt không được đoán lại kiểu nội dung |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Không rò đường dẫn có id sang site khác |
| `Permissions-Policy` | tắt hết, trừ `microphone=(self)`, `autoplay=(self)`, `fullscreen=(self)` | Micro là thứ nền tảng thật sự dùng — phần Nói ghi âm qua MediaRecorder. Cho phép thứ không ai xin thì không còn là chính sách |
| `X-Frame-Options` | `SAMEORIGIN` | Bản dự phòng cho trình duyệt chưa đọc `frame-ancestors` |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cắt tham chiếu `window.opener` |
| `Cross-Origin-Resource-Policy` | `same-origin` | Site khác không nhúng được tài nguyên của mình |
| `X-Permitted-Cross-Domain-Policies` | `none` | Chặn `crossdomain.xml` của Flash/PDF cũ |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **Chỉ khi request đã là HTTPS.** Gửi qua HTTP thì trình duyệt bỏ qua, mà gửi lúc chạy dev sẽ ghim `localhost` sang HTTPS cả năm trong trình duyệt của người phát triển |
| `Content-Security-Policy` (trang HTML) | `default-src 'self'` + nonce theo từng request | Không CDN, không eval, không inline lậu |
| `Content-Security-Policy` (`/api/*`) | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; sandbox` | Response API là dữ liệu, không bao giờ là tài liệu: không được tải gì, chạy gì, và không trang nào được nhúng nó |
| `Set-Cookie: prep_csrf` (trang HTML) | token 24 byte, `SameSite=Strict`, đọc được bằng JS | Cấp ngay khi phục vụ trang, kể cả cho khách — đó là thứ cho phép `csrfGuard` phủ được cả màn đăng nhập. Đăng nhập thành công thì xoay token mới |
| `X-Robots-Tag` (`/api/*`) | `noindex, nofollow` | Không để công cụ tìm kiếm lập chỉ mục dữ liệu API |

## 2. Giới hạn ghi toàn cục

`WRITE_PER_MIN` (mặc định **300**) lượt ghi mỗi phút, gắn ở `server.js` trước
mọi router nên phủ mọi phương thức không an toàn — kể cả endpoint viết ngày
mai. Đây là **trần**, không phải hạn mức: quản trị viên làm nhanh, hay bài thi
tự lưu theo debounce, không bao giờ chạm tới. Cái nó chặn là script — vòng lặp
dò mật khẩu, quét mã kích hoạt, xoá hàng loạt bằng phiên ăn cắp được.

Khoá đếm là **cookie phiên đã băm × địa chỉ IP**, không phải tài khoản đã tra
ra: ai cầm cookie thì người đó bị đếm, và đó đúng là đơn vị mà một phiên bị ăn
cắp được tiêu. Băm vì token phiên không nên nằm trong khoá của một map. Chưa
đăng nhập thì rơi về địa chỉ IP.

Endpoint cần chặt hơn vẫn tự đặt giới hạn riêng bên trong handler — giới hạn
toàn cục là sàn nằm dưới tất cả:

| Endpoint | Giới hạn riêng |
|---|---|
| `POST /api/auth/register` | `REGISTER_PER_HOUR` (mặc định 5) mỗi giờ theo IP, chỉ trừ lượt khi đăng ký thành công |
| `POST /api/auth/login`, `POST /api/admin/login` | Khoá 15 phút sau 5 lần sai, theo IP × tên đăng nhập |
| `POST /api/auth/forgot` | `FORGOT_PER_HOUR` (mặc định 5) mỗi giờ theo IP |
| `POST /api/auth/verify/send` | 3 lần/giờ theo tài khoản |
| `POST /api/redeem` | `REDEEM_PER_10MIN` (mặc định 12) mỗi 10 phút theo tài khoản |

Ba biến môi trường ở trên tồn tại **cho bộ test**, không phải để nới trong sản
phẩm. Mỗi lượt `npm run verify` tiêu một suất đăng ký, một suất quên mật khẩu và
một suất kích hoạt mã, nên với ngưỡng mặc định thì chạy bộ test sáu lần trong
một giờ là tự làm mình đỏ — đúng việc mà người đang truy một bài test chập chờn
sẽ làm. `scripts/verify.sh` nới cả ba lên 200; mặc định trong mã nguồn không đổi.

## 3. Tám endpoint ghi không có guard đăng nhập

Đây là danh sách đầy đủ, và mỗi dòng phải nêu được cái gì thay thế — nếu không
thì danh sách này chỉ là chỗ giấu lỗi. `scripts/test-security.mjs` kiểm đúng
danh sách này: thêm một endpoint ghi công khai mà không khai ở đây là đỏ, mà
khai thừa một dòng cũng đỏ.

**Từ 2026-08-12 cả tám đều đã có `csrfGuard`.** Cookie `prep_csrf` được cấp ngay
khi máy chủ phục vụ bất kỳ trang HTML nào, kể cả cho khách chưa đăng nhập, nên
"không đòi đăng nhập" không còn kéo theo "không kiểm CSRF". Trước đó nó chỉ được
cấp sau khi đăng nhập thành công, nên khách không có gì để đối chiếu.

| Endpoint | Vì sao không có guard đăng nhập | Thay bằng |
|---|---|---|
| `POST /api/auth/register` | Người chưa có tài khoản mới cần nó | `csrfGuard`; khoá theo IP, chỉ trừ lượt khi thành công |
| `POST /api/auth/login` | Chưa đăng nhập thì không thể đòi đăng nhập | `csrfGuard`; khoá 15 phút sau 5 lần sai |
| `POST /api/admin/login` | Như trên | `csrfGuard`; như trên |
| `POST /api/auth/forgot` | Người quên mật khẩu không vào được tài khoản | `csrfGuard`; `FORGOT_PER_HOUR` theo IP, và trả lời giống hệt nhau dù email có tồn tại hay không |
| `POST /api/auth/reset` | Người dùng đến từ đường link trong email | `csrfGuard`; token dùng một lần, băm trong CSDL, hết hạn sau 2 giờ |
| `POST /api/auth/verify` | Như trên | `csrfGuard`; token dùng một lần, hết hạn sau 48 giờ |
| `POST /api/auth/logout` | Đăng xuất khi chưa đăng nhập là vô hại | `csrfGuard` |
| `POST /api/admin/logout` | Như trên | `csrfGuard` |

### Đính chính: chỗ hở này chưa từng khai thác được

Bản rà soát trước gọi đây là **login CSRF** và mô tả nó như một lỗ thật. Kiểm
lại bằng request thật thì không đúng, và ghi lại đây vì nói quá về một lỗ hổng
cũng làm hỏng lòng tin vào tài liệu y như nói thiếu:

| Cách tấn công từ site khác | Kết quả thật |
|---|---|
| `<form method=POST>` (không cần preflight) | **400** — `express.json()` không đọc thân form, `req.body` rỗng |
| `fetch` `mode:'no-cors'`, `Content-Type: text/plain` | **400** — cùng lý do |
| `fetch` với `Content-Type: application/json` | Trình duyệt bắt buộc preflight CORS; máy chủ không trả `Access-Control-Allow-Origin` nên request không bao giờ được gửi |

Tức là hàng rào có thật, nhưng nó là **hệ quả tình cờ** của hai lựa chọn không
liên quan: chỉ nạp `express.json()`, và không cấu hình CORS. Thêm
`express.urlencoded()` một ngày nào đó, hoặc mở CORS cho một ứng dụng di động,
là biến cái tình cờ ấy thành lỗ thật mà không ai nhận ra mình vừa làm gì. Đặt
`csrfGuard` lên cả tám endpoint biến hàng rào tình cờ thành hàng rào cố ý — và
đó mới là lý do đáng để làm, chứ không phải vì đang có ai khai thác được.

## 4. Cấu hình bắt buộc khi chạy online

Hai thiết lập dưới đây từng sai, và cả hai đều thuộc loại "nhìn thì như đã cấu
hình xong". Sửa ngày 2026-08-12, có kiểm trong `scripts/test-security.mjs`.

### 4.1 `TRUST_PROXY` — mặc định 0, không bao giờ `true`

`req.ip` là thứ mà **khoá chống dò mật khẩu** (`auth.js` `throttleKey`) và
**giới hạn ghi toàn cục** (mục 2) cùng lấy làm khoá. `server.js` từng đặt
`app.set('trust proxy', true)`, tức tin mọi `X-Forwarded-For` client gửi lên —
và thế là tắt cả hai.

Chạy thật trên máy, trước khi sửa:

```
7 lần sai mật khẩu, cùng một IP khai báo → lần 6 bị khoá 15 phút   ✔ đúng
5 lần tiếp, mỗi lần khai báo một IP khác → không lần nào bị khoá   ✘ đoán vô hạn
```

Sau khi sửa, 10 lần với 10 IP khai báo khác nhau vẫn bị khoá từ lần 6.

| `TRUST_PROXY` | Dùng khi |
|---|---|
| *không đặt* → 0 | Chạy trực tiếp, không có proxy. `req.ip` là địa chỉ socket, client không giả được |
| `1` | Cloud Run, hoặc đúng một load balancer phía trước |
| `2`… | Chuỗi proxy sâu hơn, khai đúng số tầng |

Giá trị không phải số nguyên ≥ 0 — kể cả chuỗi `"true"` — đều về 0. Thà chặn
nhầm cả proxy còn hơn tin nhầm cả thế giới.

Hệ quả kèm theo: `req.secure` cũng chỉ đi theo `X-Forwarded-Proto` trong phạm vi
`TRUST_PROXY` cho phép, nên HSTS ở mục 1 không còn bị một header giả kích hoạt.

### 4.2 Cookie `Secure` — production tự bật

Trước đây `Secure` chỉ được đặt khi `FORCE_SECURE_COOKIE=1`, nghĩa là
`NODE_ENV=production` một mình vẫn phát cookie phiên mà trình duyệt sẵn sàng gửi
qua HTTP thường. Hai công tắc cho một ý định là cách một bản deploy ra đời
không an toàn trong khi trông như đã cấu hình đủ.

Giờ: production tự bật. `FORCE_SECURE_COOKIE` còn lại như một cách ghi đè có chủ
ý theo cả hai chiều — `1` để bật cho máy dev nằm sau TLS proxy, `0` để tắt nếu
một bản production nào đó buộc phải phục vụ HTTP thường.

### 4.3 Khoá đăng nhập và giới hạn tần suất nằm trong CSDL

Trước 2026-08-12 cả hai nằm trong hai `Map` trong bộ nhớ của **một** tiến trình.
Sai theo hai hướng cùng lúc:

- **Khởi động lại là xoá sạch mọi khoá.** Tài liệu của chính công cụ cứu hộ từng
  ghi "bị chặn thì cứ khởi động lại server" — mà đó cũng là lối thoát cho chính
  người đang dò mật khẩu. Một bộ đếm biết quên thì có lợi cho kẻ tấn công hơn là
  cho người dùng.
- **Nhiều instance là nhân bản hạn mức.** Trên Cloud Run, 5 lần thử/instance;
  chạy 4 instance là 20 lần. Nó tự vô hiệu hoá đúng lúc hệ thống đủ đông để cần
  đến nó — và đúng lúc đó cũng là lúc mục 4.1 (`TRUST_PROXY`) vừa mới sửa xong
  trở nên vô nghĩa.

Giờ là hai bảng: `throttle_locks` (khoá 15 phút sau 5 lần sai) và `throttle_hits`
(cửa sổ trượt, **một dòng cho mỗi lượt**). Một dòng mỗi lượt chứ không phải một
cột đếm, vì cửa sổ trượt cần biết *thời điểm* từng lượt, và `COUNT(*)` trên một
khoảng thời gian thì không có tranh chấp giữa các tiến trình theo cách mà
đọc-sửa-ghi trên một dòng chung thì có. `noteFailure` tăng bộ đếm bằng **một câu
lệnh** `ON CONFLICT DO UPDATE`, nên hai tiến trình không thể cùng đọc 4 rồi cùng
ghi 5.

Kiểm bằng hành vi chứ không bằng lời: một tiến trình **khác** mở cùng cơ sở dữ
liệu và thấy đúng cái khoá đó. `throttle_hits` được dọn định kỳ (giữ 2 giờ, dài
gấp đôi cửa sổ dài nhất mà bất kỳ chỗ gọi nào yêu cầu).

**Hệ quả cho bộ test, phát hiện muộn một lượt.** Bộ test cố tình đăng nhập sai vài
lần mỗi lượt chạy, để chứng minh câu trả lời giống hệt nhau dù tài khoản có tồn
tại hay không. Khoá giờ nằm trong CSDL nên nó **tích luỹ giữa các lượt chạy**:
chạy gate vài lần trong 15 phút là 401 biến thành 429, và bộ test đỏ vì một lý do
không liên quan gì đến mã. `scripts/verify.sh` giờ xoá `throttle_locks` và
`throttle_hits` trước khi khởi động server — chỉ trong CSDL test; sản phẩm không
bao giờ tự xoá. Cùng họ với ba biến môi trường ở mục 2, và cùng một bài học: một
cơ chế chống lạm dụng **có trạng thái** thì bộ test cũng là một người dùng của nó.

Đổi lại: khoá **không còn tự mất khi khởi động lại**, nên lối thoát bây giờ là
`node scripts/accounts.js unlock` — lệnh đó xoá cả hai thứ cùng tên "khoá":
tài khoản bị quản trị viên vô hiệu hoá, *và* khoá do sai mật khẩu quá nhiều.

### 4.4 Lớp xác thực thứ hai cho khu quản trị

Trước 2026-08-12, quyền chủ sở hữu với **mọi** tài khoản, đề thi và mã kích hoạt
nằm sau đúng một mật khẩu, mở ra Internet. Giờ có TOTP (RFC 6238), mặc định tắt,
bật bằng `node scripts/accounts.js totp-enable`.

Tự viết bằng `node:crypto`, không thêm dependency. Điều đó chỉ chấp nhận được vì
`scripts/test-totp.mjs` chạy **sáu vector chuẩn của RFC 6238** — trong đó có
T=20000000000, vượt 2³² giây, đúng dòng bắt lỗi bộ đếm 64-bit ghi bằng một
`writeUInt32BE`. "Nhìn thì đúng" là ý kiến; khớp với chuẩn trên đầu vào đã biết
là thứ mọi app authenticator cùng dựa vào.

Ba tính chất mà một bộ sinh mã đúng **không** tự cho không:

- **Mã đã dùng thì không dùng lại.** Một mã sống nguyên 30 giây, nên mã bị nhìn
  trộm qua vai hoặc lọt vào ảnh chụp màn hình vẫn dùng được vài giây sau. Bộ đếm
  của lần dùng gần nhất được lưu và không bao giờ nhận lại.
- **So sánh theo thời gian hằng định.** Mã chỉ có sáu chữ số; so sánh dừng sớm ở
  chữ số sai đầu tiên là phát ra một gợi ý đo được.
- **Cửa sổ lệch giờ đúng một bước mỗi bên.** Rộng hơn thì dễ chịu với đồng hồ
  lệch, và dễ chịu tương ứng với việc dò.

Mã sai bị tính vào **cùng bộ đếm khoá 15 phút** với mật khẩu sai. Nếu không thì
mật khẩu bị giới hạn tần suất còn sáu chữ số đứng sau nó thì không — trong khi
sáu chữ số chỉ là một triệu khả năng, không phải một cụm mật khẩu.

**Mã cứu hộ.** 10 mã, hiện đúng một lần, CSDL chỉ giữ hash — cùng lý do với token
phiên: CSDL rò rỉ không được phép trao ra một lối vào còn dùng được. Không có
chúng thì bật lớp thứ hai là một cách tự khoá mình khỏi nền tảng của chính mình
vĩnh viễn, và lời khuyên trung thực sẽ phải là "đừng bật".

### 4.5 Token trong thư — không bao giờ vào log

`deliverLink()` từng `console.log` nguyên cả liên kết xác thực và đặt lại mật
khẩu, ở **mọi** môi trường kể cả production. Một token dùng một lần là thông tin
xác thực dạng bearer cho đúng một tài khoản cho tới khi bị tiêu — nên **token
trong log là mật khẩu trong log**, và ai đọc được log là chiếm được mọi tài khoản.

Từ 2026-08-12, `server/mail.js` chỉ ghi *việc đã gửi*, gửi *cái gì* và *cho ai*:

```
[mail] would send "Xác thực địa chỉ email — VPET Prep" to probe@example.com (link not logged: it is a credential)
```

Kiểm thật trên server chạy `NODE_ENV=production`: đăng ký một tài khoản rồi đếm
`token=` trong toàn bộ log → **0**. Response cũng không trả link (chỉ driver
`console` ngoài production mới trả, để bấm thử lúc phát triển).

`scripts/test-mail.mjs` chặn bắt `console.log`/`console.error` quanh một lần gửi
thật và khẳng định token không nằm trong đó — nhưng *người nhận thì có*, để vẫn
truy được một lần gửi về đúng tài khoản.

Ba điểm khác của lớp thư, cũng có kiểm:

- **Chèn header.** Địa chỉ người nhận đến từ ô đăng ký. Một ký tự xuống dòng
  trong đó là người gửi tự viết thêm `Bcc:` cho mình. Mọi giá trị đi vào header
  đều bị từ chối nếu có `\r` hoặc `\n`.
- **Không gửi mật khẩu qua kết nối chưa mã hoá.** Server không mời STARTTLS và
  cổng cũng không phải TLS sẵn → AUTH bị từ chối, không hạ cấp. Muốn khác thì
  phải nói rõ bằng `SMTP_ALLOW_PLAINTEXT_AUTH=1`. Test khẳng định thêm rằng
  không có lệnh `AUTH` nào lọt ra dây.
- **Thân thư mã hoá base64**, nên không dòng nào bắt đầu bằng `.` — quy tắc
  dot-stuffing vốn hay làm hỏng SMTP client viết tay trở thành không thể xảy ra
  chứ không phải chỉ khó xảy ra.

## 5. Bài của ai là của người đó

Guard ở mục 3 trả lời "có được vào không". Mục này trả lời câu khác: **đã vào
rồi thì chạm được vào dữ liệu của ai.** Ba lỗi đã tìm thấy đều nằm ở đây, và
không lỗi nào bị guard nào chặn — cả ba đều đến từ một tài khoản đăng nhập hợp
lệ, làm đúng việc của mình, chỉ là trên hàng của người khác.

**Khoá `UNIQUE` bỏ quên chủ sở hữu.** `skill_events` từng là
`UNIQUE (source, ref_id, item_key)` và `ability.record()` upsert trên đúng bộ
ba đó. Phần lớn nơi sinh sự kiện dựng `ref_id` từ một số toàn cục (id bài thi,
id drill) nên không đụng nhau — trừ `learn-practice.js`, lấy số vòng **từ trình
duyệt**. Hai tài khoản luyện cùng loại, cùng số vòng thì ghi vào một hàng, và
`ON CONFLICT` giữ chủ cũ nhưng lấy điểm của người mới.

**Client tự chọn câu để chấm.** `placement.answer()` chấm mọi
`{questionId, answer}` gửi lên, không kiểm câu đó có nằm trong đề đã phát hay
không. Kéo theo ba chuyện: phản hồi có `rungRight` nên gửi một câu lạ với một
đáp án đoán là biết đoán đúng hay sai — tức là một cách dò đáp án của cả ngân
hàng dùng chung với đề thật; `right` quyết định `nextLevel()` và `settle()` nên
tự chọn được mức xếp lớp; và mỗi câu chấm được ghi vào `skill_events` ở trọng
số 1, bằng đúng một bài thi có canh giờ. `drills.js` và `revision.js` vốn đã
chặn việc này; chỉ đường xếp lớp là quên.

**Phiên "xem như học viên" sống lâu hơn lần xem.** `POST /admin/preview-student`
tạo một phiên **thật** trên tài khoản `student` — đó là điều làm nó hữu ích —
nhưng phát đủ hai tuần như một lần đăng nhập bình thường. Đóng tab, tuần sau mở
lại trang học viên: vẫn đang là `student`. Bài làm lúc đó ghi vào `student` và
ghi **đúng**, vì phiên nói vậy. Không có gì trong cơ sở dữ liệu trông sai cả,
nên đây là lỗi không thể tìm ra bằng cách đọc dữ liệu. Nay phiên preview chỉ
sống 2 giờ (`PREVIEW_SESSION_HOURS`), và cờ banner được đặt cùng chỗ với phiên
nên một lần đăng nhập thường luôn hạ nó xuống.

Rà tay một lần thì không thành cái gì cả, nên hai nửa cơ học của nó thành
`scripts/test-tenancy.mjs`, chạy trong `verify.sh`:

1. Mọi khoá `UNIQUE` trên bảng có cột `user_id` phải chứa `user_id` — hoặc phải
   có tên trong `GLOBAL_BY_DESIGN` **kèm lý do** vì sao buộc phải toàn cục
   (mã kích hoạt, `ref` đơn hàng, hash token phiên và token đặt lại mật khẩu:
   cả bốn được tra cứu trước khi biết người dùng là ai).
2. Mọi `ON CONFLICT` trong `server/` nhắm vào những bảng đó cũng phải chứa
   `user_id`. Ràng buộc có chủ mà upsert không có là đúng lỗi cũ thêm một bước.

Kèm theo đó là ba test hành vi: `test-ability-isolation.mjs`,
`test-placement-scope.mjs`, `test-preview-session.mjs`. Cả ba đều đã được chứng
minh là **đỏ trên mã chưa sửa** trước khi được nhận.

## 6. Bảng endpoint → guard → giới hạn ghi

74 route, 43 route ghi. **43/43 route ghi đều có `csrfGuard`**; 35/43 có thêm
guard đăng nhập, 8 route còn lại là danh sách ở mục 3.

<!-- BẢNG SINH TỰ ĐỘNG — đừng sửa tay, chạy scripts/test-security.mjs để kiểm -->

| Method | Endpoint | Guards | Write limit |
|---|---|---|---|
| GET | `/api/admin/admins` | `requireAdmin` + `csrfGuard` + `requireCap(admins.manage)` | n/a (read) |
| POST | `/api/admin/admins` | `requireAdmin` + `csrfGuard` + `requireCap(admins.manage)` | yes |
| PUT | `/api/admin/admins/:id` | `requireAdmin` + `csrfGuard` + `requireCap(admins.manage)` | yes |
| POST | `/api/admin/admins/:id/password` | `requireAdmin` + `csrfGuard` + `requireCap(admins.manage)` | yes |
| GET | `/api/admin/ai` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | n/a (read) |
| PUT | `/api/admin/ai` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | yes |
| POST | `/api/admin/ai/sweep` | `requireAdmin` + `csrfGuard` + `requireCap(marking.run)` | yes |
| POST | `/api/admin/ai/test` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | yes |
| POST | `/api/admin/attempts/:id/mark` | `requireAdmin` + `csrfGuard` + `requireCap(marking.run)` | yes |
| GET | `/api/admin/audit` | `requireAdmin` + `csrfGuard` + `requireCap(audit.read)` | n/a (read) |
| GET | `/api/admin/backup` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | n/a (read) |
| POST | `/api/admin/backup` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | yes |
| GET | `/api/admin/batches` | `requireAdmin` + `csrfGuard` + `requireCap(codes.read)` | n/a (read) |
| GET | `/api/admin/classroom` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | n/a (read) |
| GET | `/api/admin/classroom/courses` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | n/a (read) |
| GET | `/api/admin/classroom/courses/:courseId/roster` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | n/a (read) |
| POST | `/api/admin/classroom/unlink` | `requireAdmin` + `csrfGuard` + `requireCap(secrets.manage)` | yes |
| GET | `/api/admin/codes` | `requireAdmin` + `csrfGuard` + `requireCap(codes.read)` | n/a (read) |
| POST | `/api/admin/codes` | `requireAdmin` + `csrfGuard` + `requireCap(codes.write)` | yes |
| POST | `/api/admin/codes/:id/refund` | `requireAdmin` + `csrfGuard` + `requireCap(codes.write)` | yes |
| POST | `/api/admin/codes/:id/revoke` | `requireAdmin` + `csrfGuard` + `requireCap(codes.write)` | yes |
| GET | `/api/admin/codes/export` | `requireAdmin` + `csrfGuard` + `requireCap(codes.read)` | n/a (read) |
| GET | `/api/admin/exam-formats` | `requireAdmin` + `csrfGuard` + `requireCap(tests.read)` | n/a (read) |
| DELETE | `/api/admin/items/:itemId` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/login` | `csrfGuard` | yes |
| POST | `/api/admin/logout` | `csrfGuard` | yes |
| GET | `/api/admin/me` | — | n/a (read) |
| POST | `/api/admin/me` | `requireAdmin` + `csrfGuard` | yes |
| PUT | `/api/admin/packages/:id` | `requireAdmin` + `csrfGuard` + `requireCap(settings.write)` | yes |
| POST | `/api/admin/password` | `requireAdmin` + `csrfGuard` | yes |
| POST | `/api/admin/preview-student` | `requireAdmin` + `csrfGuard` + `requireCap(users.read)` | yes |
| GET | `/api/admin/questions` | `requireAdmin` + `csrfGuard` + `requireCap(bank.read)` | n/a (read) |
| POST | `/api/admin/questions` | `requireAdmin` + `csrfGuard` + `requireCap(bank.write)` | yes |
| PUT | `/api/admin/questions/:id` | `requireAdmin` + `csrfGuard` + `requireCap(bank.write)` | yes |
| DELETE | `/api/admin/questions/:id/audio` | `requireAdmin` + `csrfGuard` + `requireCap(bank.write)` | yes |
| GET | `/api/admin/questions/:id/audio` | `requireAdmin` + `csrfGuard` + `requireCap(bank.read)` | n/a (read) |
| POST | `/api/admin/questions/:id/audio` | `requireAdmin` + `csrfGuard` + `requireCap(bank.write)` | yes |
| POST | `/api/admin/questions/:id/status` | `requireAdmin` + `csrfGuard` + `requireCap(bank.publish)` | yes |
| GET | `/api/admin/questions/availability` | `requireAdmin` + `csrfGuard` + `requireCap(bank.read)` | n/a (read) |
| POST | `/api/admin/questions/bulk` | `requireAdmin` + `csrfGuard` + `requireCap(bank.write)` | yes |
| GET | `/api/admin/questions/template.csv` | `requireAdmin` + `csrfGuard` + `requireCap(bank.read)` | n/a (read) |
| GET | `/api/admin/reports` | `requireAdmin` + `csrfGuard` + `requireCap(reports.read)` | n/a (read) |
| DELETE | `/api/admin/sections/:sid` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| PUT | `/api/admin/sections/:sid` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/sections/:sid/items` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/sections/:sid/questions` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/sections/:sid/reshuffle` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| GET | `/api/admin/settings` | `requireAdmin` + `csrfGuard` + `requireCap(reports.read)` | n/a (read) |
| PUT | `/api/admin/settings` | `requireAdmin` + `csrfGuard` + `requireCap(settings.write)` | yes |
| GET | `/api/admin/tests` | `requireAdmin` + `csrfGuard` + `requireCap(tests.read)` | n/a (read) |
| POST | `/api/admin/tests` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| DELETE | `/api/admin/tests/:id` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| GET | `/api/admin/tests/:id` | `requireAdmin` + `csrfGuard` + `requireCap(tests.read)` | n/a (read) |
| PUT | `/api/admin/tests/:id` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/tests/:id/sections` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/tests/:id/status` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| POST | `/api/admin/tests/generate` | `requireAdmin` + `csrfGuard` + `requireCap(tests.write)` | yes |
| GET | `/api/admin/totp` | `requireAdmin` + `csrfGuard` | n/a (read) |
| POST | `/api/admin/totp/disable` | `requireAdmin` + `csrfGuard` | yes |
| POST | `/api/admin/totp/enable` | `requireAdmin` + `csrfGuard` | yes |
| POST | `/api/admin/totp/start` | `requireAdmin` + `csrfGuard` | yes |
| GET | `/api/admin/users` | `requireAdmin` + `csrfGuard` + `requireCap(users.read)` | n/a (read) |
| POST | `/api/admin/users` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| GET | `/api/admin/users/:id` | `requireAdmin` + `csrfGuard` + `requireCap(users.read)` | n/a (read) |
| PUT | `/api/admin/users/:id` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| POST | `/api/admin/users/:id/grant` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| POST | `/api/admin/users/:id/password` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| POST | `/api/admin/users/:id/status` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| POST | `/api/admin/users/:id/verify` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| POST | `/api/admin/users/bulk` | `requireAdmin` + `csrfGuard` + `requireCap(users.write)` | yes |
| GET | `/api/attempts` | `requireUser` | n/a (read) |
| POST | `/api/attempts` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/attempts/:id` | `requireUser` | n/a (read) |
| PATCH | `/api/attempts/:id/answers` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/attempts/:id/items/:questionId/audio` | `requireUser` | n/a (read) |
| POST | `/api/attempts/:id/items/:questionId/recording` | `requireUser` + `csrfGuard` | yes |
| POST | `/api/attempts/:id/parts/:sectionId/close` | `requireUser` + `csrfGuard` | yes |
| POST | `/api/attempts/:id/parts/:sectionId/start` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/attempts/:id/result` | `requireUser` | n/a (read) |
| POST | `/api/attempts/:id/submit` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/attempts/current` | `requireUser` | n/a (read) |
| POST | `/api/auth/forgot` | `csrfGuard` | yes |
| POST | `/api/auth/login` | `csrfGuard` | yes |
| POST | `/api/auth/logout` | `csrfGuard` | yes |
| POST | `/api/auth/register` | `csrfGuard` | yes |
| POST | `/api/auth/reset` | `csrfGuard` | yes |
| POST | `/api/auth/verify` | `csrfGuard` | yes |
| POST | `/api/auth/verify/send` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/catalog` | — | n/a (read) |
| POST | `/api/checkout` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/checkout/providers` | — | n/a (read) |
| GET | `/api/drills` | `requireUser` | n/a (read) |
| POST | `/api/drills` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/drills/:id` | `requireUser` | n/a (read) |
| GET | `/api/drills/:id/items/:questionId/audio` | `requireUser` | n/a (read) |
| POST | `/api/drills/:id/items/:questionId/recording` | `requireUser` + `csrfGuard` | yes |
| POST | `/api/drills/:id/submit` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/drills/parts` | `requireUser` | n/a (read) |
| GET | `/api/drills/suggest` | `requireUser` | n/a (read) |
| GET | `/api/learn/grammar` | — | n/a (read) |
| GET | `/api/learn/grammar/:slug` | — | n/a (read) |
| GET | `/api/learn/irregular-verbs` | — | n/a (read) |
| GET | `/api/learn/linking-words` | — | n/a (read) |
| GET | `/api/learn/practice` | `requireUser` | n/a (read) |
| POST | `/api/learn/practice` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/learn/review` | `requireUser` | n/a (read) |
| POST | `/api/learn/review` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/learn/vocab` | — | n/a (read) |
| GET | `/api/learn/vocab/:headword` | — | n/a (read) |
| GET | `/api/me` | — | n/a (read) |
| PATCH | `/api/me` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/me/ability` | `requireUser` | n/a (read) |
| POST | `/api/me/password` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/me/report` | `requireUser` | n/a (read) |
| GET | `/api/placement` | `requireUser` | n/a (read) |
| POST | `/api/placement/answers` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/placement/items/:questionId/audio` | `requireUser` | n/a (read) |
| POST | `/api/placement/start` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/plan` | `requireUser` | n/a (read) |
| POST | `/api/redeem` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/revision` | `requireUser` | n/a (read) |
| POST | `/api/revision` | `requireUser` + `csrfGuard` | yes |
| POST | `/api/revision/:id/submit` | `requireUser` + `csrfGuard` | yes |
| GET | `/api/revision/topics` | `requireUser` | n/a (read) |
| GET | `/auth/google` | — | n/a (read) |
| GET | `/auth/google/callback` | — | n/a (read) |
| GET | `/auth/google/classroom` | `requireAdmin` | n/a (read) |
| GET | `/auth/google/classroom/callback` | `requireAdmin` | n/a (read) |
| GET | `/payments/:provider/ipn` | `gatewaySigned` | n/a (read) |
| POST | `/payments/:provider/ipn` | `gatewaySigned` | yes |
| GET | `/payments/:provider/return` | — | n/a (read) |
