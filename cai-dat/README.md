# Chạy VPET Prep trên Windows

Thư mục này chứa mấy tệp `.bat` để chạy dự án bằng cách nhấn đúp, không cần gõ lệnh.

## Cần có trước

**Node.js phiên bản 22.5 trở lên** — tải bản LTS tại <https://nodejs.org>.

Vì sao phải là 22.5: dự án dùng module `node:sqlite` có sẵn trong Node, nhờ vậy
không phải cài thư viện SQLite biên dịch từ mã C. Module này chỉ có từ 22.5.
Bản cũ hơn thì `chay-server.bat` sẽ báo lỗi và dừng chứ không chạy dở dang.

## Các tệp

| Tệp | Việc nó làm |
|---|---|
| `chay-server.bat` | Nhấn đúp để chạy. Tự kiểm tra Node, cài thư viện, build CSS, bật server rồi mở trình duyệt |
| `cap-nhat.bat` | Kéo code mới nhất từ GitHub về, cài lại thư viện, build lại CSS |
| `dung-server.bat` | Tắt server còn sót lại khi lỡ đóng cửa sổ mà tiến trình vẫn chạy |
| `accounts.bat` | **Không đăng nhập được?** Xem tài khoản đang có, đặt lại mật khẩu quản trị hoặc học viên demo, mở khoá tài khoản |
| `cau-hinh.mau.bat` | Mẫu cấu hình. Chép thành `cau-hinh.bat` rồi sửa nếu muốn đổi cổng hay mật khẩu |
| `_mo-trinh-duyet.bat` | Tệp phụ, `chay-server.bat` gọi. Không chạy trực tiếp |

## Lần chạy đầu

Nhấn đúp `chay-server.bat`. Lần đầu sẽ lâu vài phút vì phải tải thư viện về.
Xong xuôi trình duyệt tự mở vào trang học viên.

- Học viên: <http://localhost:3000/prep/landing/>
- Quản trị: <http://localhost:3000/admin/>

Tài khoản khởi tạo in ra ngay trong cửa sổ đen lúc server lên. Đăng nhập xong
thì **đổi mật khẩu ngay** trong màn Quản trị.

Muốn dừng: bấm `Ctrl+C` trong cửa sổ đen, hoặc đóng cửa sổ rồi chạy `dung-server.bat`.

## Lấy code mới nhất về

Nhấn đúp `cap-nhat.bat`. Nó kéo code mới từ GitHub, cài lại thư viện, build lại
CSS, rồi liệt kê những commit vừa về.

Hai chỗ nó **cố ý dừng lại** thay vì làm liều:

- **Bạn đang có sửa đổi chưa lưu.** Script in ra danh sách tệp đang sửa và dừng,
  không kéo code đè lên. Muốn giữ phần đang sửa thì `git stash`, muốn bỏ thì
  `git checkout -- .`, rồi chạy lại.
- **Nhánh ở máy đã rẽ hướng khác** so với trên GitHub (thường là do bạn đã commit
  thêm ở máy). Script chỉ cho phép tua thẳng (`--ff-only`) nên sẽ báo lỗi thay vì
  tự trộn. Xem lại bằng `git log --oneline --graph --all -20`.

Script không bao giờ xoá hay ghi đè thay đổi của bạn.

### Lần đầu tải về

Nếu thư mục chưa phải bản sao git, mở Command Prompt ở **thư mục cha** rồi chạy:

```bat
git clone -b claude/prep-test-platform-design-fpiuqn https://github.com/thankyouu91/PREPTEST.git PrepTest
```

Cần cài Git trước: <https://git-scm.com/download/win>.

## Đổi cổng hoặc mật khẩu

Chép `cau-hinh.mau.bat` thành `cau-hinh.bat` (cùng thư mục này) rồi bỏ dấu `rem`
ở dòng cần dùng. `chay-server.bat` và `dung-server.bat` tự đọc tệp đó.

`cau-hinh.bat` đã nằm trong `.gitignore` nên mật khẩu bạn đặt ở đó không bị đẩy
lên git. Đừng viết mật khẩu thẳng vào `cau-hinh.mau.bat` vì tệp mẫu thì có commit.

## Không đăng nhập được

Nhấn đúp `accounts.bat`. Nó liệt kê tài khoản đang có trong cơ sở dữ liệu rồi
cho chọn: đặt lại mật khẩu quản trị, đặt lại tài khoản học viên demo, hoặc mở
khoá tài khoản bị khoá.

Vì sao lại xảy ra: mật khẩu quản trị chỉ được tạo ở **lần chạy đầu tiên**, khi cơ
sở dữ liệu còn trống. Từ lần sau server không in lại và cũng không đặt lại, nên
nếu mật khẩu trong máy đã khác với README thì trước đây không có đường vào lại.
Cơ sở dữ liệu chỉ lưu bản băm nên không ai đọc ngược ra mật khẩu được — kể cả bạn.

Vài trường hợp khác:

- **Nhập sai 5 lần liên tiếp** thì bị khoá 15 phút. Bộ đếm nằm trong bộ nhớ, chỉ
  cần tắt rồi bật lại server là hết.
- **Tài khoản học viên demo** nay tự phục hồi: mỗi lần khởi động, nếu nó lệch khỏi
  `student` / `Goodmorning01` thì server đặt lại và in một dòng báo.
- **Đặt `NODE_ENV=production`** trong `cau-hinh.bat` sẽ tắt hẳn tài khoản demo và
  bắt buộc phải có `ADMIN_PASSWORD`. Chạy thử ở máy thì đừng bật.

## Hay gặp

**"Chưa cài Node.js"** — cài xong phải đóng hẳn cửa sổ rồi mở lại tệp `.bat`,
vì Windows chỉ nạp biến `PATH` mới cho cửa sổ mới.

**Cổng 3000 đang bị chiếm** — chạy `dung-server.bat`, hoặc đổi `PORT` trong
`cau-hinh.bat`.

**Sửa giao diện mà không thấy đổi** — CSS chỉ build lại khi chưa có tệp. Chạy
`chay-server.bat build` để ép build lại.

**Chữ tiếng Việt trong cửa sổ đen bị vỡ** — bấm chuột phải lên thanh tiêu đề →
Properties → Font, đổi sang *Consolas* hoặc *Lucida Console*. Phông mặc định
kiểu điểm ảnh cũ không có dấu tiếng Việt.

## Vì sao chữ trong tệp `.bat` không có dấu

Cố ý. `cmd.exe` đọc tệp `.bat` theo bảng mã của hệ thống, và trên máy đặt bảng mã
mặc định (không phải UTF-8) thì chữ có dấu sẽ thành ký tự rác — có khi làm hỏng
cả câu lệnh chứ không chỉ xấu chữ. Nên phần chữ nằm *bên trong* tệp `.bat` viết
không dấu cho chắc, còn chữ có dấu để ở tệp `.md` này và ở phần server in ra
(server chạy bằng Node nên không dính vấn đề đó, và `chcp 65001` trong script đã
lo phần hiển thị).

## Máy Mac và Linux

Mấy tệp `.bat` chỉ chạy trên Windows. Trên Mac hoặc Linux thì dùng lệnh:

```bash
npm install
npm run build
npm start
```
