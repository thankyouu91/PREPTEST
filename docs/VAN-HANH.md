# Vận hành — những việc chỉ làm được trên máy thật

Mọi thứ trong repo này đều có test. Ba việc dưới đây thì không, vì chúng không
phải là mã: chúng là **một khoá, một lệnh chạy trên EC2, và một biến môi
trường**. Không ai gõ chúng thì nền tảng vẫn xanh, vẫn chạy, và vẫn thiếu.

Tài liệu này viết cho người ngồi trước máy chủ, không phải cho người đọc mã.
Mỗi việc có: **vì sao**, **gõ gì**, và **làm sao biết là xong**.

Ba việc, theo thứ tự đáng làm:

| # | Việc | Không làm thì sao | Mất bao lâu |
|---|---|---|---|
| 1 | Bật chấm bài bằng mô hình | **26 trong 58 câu không có điểm**, và không bài nào có band tổng | ~10 phút |
| 2 | Nghiệm thu lại bản sao lưu | Block 0 chưa khoá được: đã phục hồi bằng **mã chưa commit** | ~5 phút |
| 3 | Bật nhiều tiến trình | Máy 4 nhân dùng 1 nhân | ~2 phút |

---

## 1. Bật chấm bài bằng mô hình

### Vì sao việc này đứng đầu danh sách

Đề VPET có 10 phần. Bốn phần — A, C, E, F — là chọn đáp án hoặc điền từ, máy so
chuỗi là chấm được, và chúng đã được chấm ngay lúc nộp bài từ lâu.

Sáu phần còn lại thì không:

| Phần | Dạng | Số câu |
|---|---|---|
| B | viết luận | 3 |
| D | viết luận | 2 |
| G | nói | 6 |
| H | nói | 10 |
| I | nói | 2 |
| J | nói | 3 |

**26 trong 58 câu.** Và vì `overall` chỉ tính khi cả bốn kỹ năng có điểm, thiếu
Writing với Speaking nghĩa là **không bài nào có band tổng** — màn hình kết quả
hiện một ô trống ở chỗ quan trọng nhất.

Đó là lựa chọn cố ý chứ không phải lỗi: `server/marking.js` để những câu đó ở
trạng thái `pending` thay vì cho 0, vì **chấm 0 một bài luận chưa ai đọc là một
lời nói dối trông giống một con số**. Nhưng trạng thái `pending` đó không có gì
gỡ ra, nên nó ở lại vĩnh viễn cho tới khi có khoá.

### Bước 0 — dọn các bài mô phỏng TRƯỚC khi dán khoá

**Làm bước này trước tiên.** Nếu trên máy còn các lần làm bài mô phỏng, bộ quét
nền sẽ tự chấm chúng ngay sau khi khoá được lưu — không hỏi, không có nút huỷ.

Cửa sổ thời gian là bao lâu: bộ quét chạy **10 phút một lần** kể từ lúc tiến
trình khởi động, và lần đầu tiên là **15 giây** sau khi khởi động. Hai mốc đó
được đặt lúc `pm2 start`, không phải lúc dán khoá — nên thực tế anh/chị có từ
vài giây đến mười phút, tuỳ lúc dán rơi vào đâu trong chu kỳ. Bước 1 dưới đây
lại yêu cầu `pm2 restart`, và mỗi lần deploy cũng khởi động lại, nên trường hợp
15 giây không hiếm.

Cái giá: **26 lần gọi mô hình mỗi bài** (cộng 21 lần gỡ băng nếu đã bật bước 3).
56 bài mô phỏng là khoảng **1.456 lần gọi**, tức gần một phần tư trần
`AI_CALLS_PER_DAY` mặc định (6000) trong cửa sổ trượt 24 giờ. Tiền thì nhỏ, vài
chục đô; **phần không lấy lại được là cái trần đó** — `scripts/attempts.js` cố ý
không xoá bảng `ai_calls`, vì đó là sổ chi tiêu chứ không phải bài làm. Xoá bài
sau khi đã chấm không hoàn lại phần trần đã tiêu, nên nếu lớp thật vào làm bài
cùng ngày, họ sẽ gặp thông báo hết hạn mức.

```
pm2 stop preptest                      # các lệnh dưới đây đều GHI vào CSDL
cd /home/ubuntu/PREPTEST
node scripts/backup.mjs run            # có đường lùi trước khi xoá
node scripts/attempts.js list          # đọc TÊN tài khoản, đừng chỉ nhìn cột KIND
node scripts/attempts.js purge         # chạy thử, in ra thiệt hại rồi dừng
node scripts/attempts.js purge --yes   # làm thật
node scripts/attempts.js pending       # phải về 0
pm2 start preptest
```

`purge` không có phạm vi nào kèm theo chỉ đụng vào 8 tài khoản mẫu và các tài
khoản thử nghiệm `@thu-nghiem.vn`. Tài khoản hiện `REAL` là bài làm thật và
không bị đụng tới — muốn xoá cả chúng thì phải gõ `--all`, và **không có undo**.
Muốn xoá đúng một tài khoản: `purge --user=<tên> --yes`.

> `pm2 stop` ở đầu là thật chứ không phải cho chắc. Mọi lệnh trong
> `scripts/attempts.js`, kể cả `list`, đều nạp `server/db` — mà việc nạp đó chạy
> migration và seed, tức là **ghi**. Chạy song song với máy chủ đang bật thì hai
> tiến trình tranh khoá ghi, và `busy_timeout` chỉ có 5 giây.

Nếu khoá đã dán rồi mới nhớ ra bước này: **Quản trị → Cài đặt → "Remove the
key"**. Mỗi bài và mỗi lần gọi đều đọc lại khoá, nên việc chấm dừng trong vòng
một bài. `pm2 stop` **không** phải cách dừng — lần khởi động sau lại quét tiếp
sau 15 giây.

### Bước 1 — tạo `TOKEN_ENCRYPTION_KEY`

Khoá API của mô hình không được nằm trần trong CSDL. Nó được niêm bằng
AES-256-GCM (`server/sealed.js`) trước khi ghi, và thứ dùng để niêm là
`TOKEN_ENCRYPTION_KEY`. **Không có biến này thì màn hình Cài đặt từ chối nhận
khoá** — nó không âm thầm lưu bản trần; đó là chỗ duy nhất nền tảng cố tình
không "xuống cấp cho êm", vì một bản dự phòng êm ái sẽ khiến cái máy không làm
gì trở thành cái máy kém an toàn nhất.

Sinh khoá và ghi thẳng vào `/etc/vpet-prep.env` bằng một lệnh — **32 byte, mã
base64, đúng 32 byte chứ không phải 32 ký tự**. Tệp đang có 4 dòng; đây là
**dòng thứ 5, không sửa 4 dòng cũ**:

```
sudo sh -c '[ -s /etc/vpet-prep.env ] && [ -n "$(tail -c1 /etc/vpet-prep.env)" ] && printf "\n" >> /etc/vpet-prep.env; printf "TOKEN_ENCRYPTION_KEY=%s\n" "$(openssl rand -base64 32)" >> /etc/vpet-prep.env'
```

Giá trị được sinh bên trong dấu nháy đơn, do `sh` của root chạy, nên nó **không
đi qua shell của anh/chị và không vào lịch sử lệnh**. Đoạn `tail -c1` ở đầu là
để phòng trường hợp tệp cũ không kết thúc bằng ký tự xuống dòng — nếu không có
nó, dòng mới sẽ dán vào đuôi dòng cuối và hỏng cả hai biến cùng lúc.

Kiểm tra là đã ghi được — **không in giá trị ra màn hình**, chỉ đếm:

```
sudo grep -c '^TOKEN_ENCRYPTION_KEY=' /etc/vpet-prep.env     # phải là 1
sudo sed -n 's/^TOKEN_ENCRYPTION_KEY=//p' /etc/vpet-prep.env | tr -d '\n' | wc -c   # phải là 44
```

> 44 ký tự base64 = 32 byte. Ra số khác là sai độ dài, và app sẽ báo
> `TOKEN_ENCRYPTION_KEY must be exactly 32 bytes, base64 encoded` lúc khởi động
> chứ không phải lúc ai đó nộp bài.
>
> Chỗ này trước đây dùng `awk -F=`, và nó **luôn** in ra 43 với một khoá hoàn
> toàn đúng: `-F=` cắt chuỗi tại dấu `=`, mà base64 của 32 byte luôn kết thúc
> bằng đúng một dấu `=` đệm — nên `$2` là 43 ký tự trước dấu đệm. Ai làm theo sẽ
> xoá một khoá tốt rồi sinh lại, mãi không ra 44.

Chép giá trị này vào nơi giữ bí mật của anh/chị (password manager, Secrets
Manager). **Bản sao lưu CSDL không chứa nó** — đó là chủ ý, khoá và dữ liệu đi
riêng — nhưng hệ quả là mất tệp env thì khoá mô hình đã niêm và token Google
Classroom trong bản sao lưu không mở lại được nữa.

Nạp lại — và đây là cái bẫy đã ghi trong `docs/BLOCKS.md`:
`pm2 restart --update-env` **gộp** env mới vào env cũ, nó không đọc lại tệp.
Phải source trước:

```
set -a; . /etc/vpet-prep.env; set +a
pm2 restart preptest --update-env
pm2 save
```

`pm2 save` không phải thừa: không có nó, biến mới sống trong tiến trình đang
chạy nhưng biến mất ở lần `pm2 resurrect` sau, tức là ở lần khởi động lại máy.

### Bước 2 — nhập khoá mô hình

Vào **Quản trị → Cài đặt → Marking writing and speaking**. Màn hình tự biết
bước 1 đã xong hay chưa (`canStore`): chưa xong thì nó **nói ra** trước khi hiện
một cái form sẽ từ chối — và nay nó in luôn hai dòng lệnh cần gõ.

Điền đúng ba ô này (khoá Anthropic):

| Ô | Giá trị |
|---|---|
| Model endpoint | `https://api.anthropic.com` |
| Model | `claude-sonnet-5` |
| API key | khoá Anthropic, dạng `sk-ant-…` |

> **Cảnh báo về trình quản lý mật khẩu.** Hai ô khoá là `type="password"`, nên
> Chrome/1Password sẽ **mời điền mật khẩu đăng nhập của chính anh/chị** vào đó.
> Nếu lỡ lưu, mật khẩu quản trị sẽ được niêm vào CSDL rồi **gửi thẳng cho
> Anthropic** trong header `x-api-key` ở lần chấm kế tiếp. Ô nhập đã được đánh
> dấu để các trình đó không tự điền, và **máy chủ từ chối** đúng giá trị đó kèm
> lời giải thích. Thấy thông báo "That is your own sign-in password" thì nghĩa
> là cái chặn đã làm việc — xoá ô đi và dán khoá thật.

- **Base URL** — mặc định `https://api.anthropic.com`
- **Model** — mặc định `claude-sonnet-5`
- **API key** — dán vào ô `password`, bấm Lưu

Khoá đi thẳng vào `sealed.seal()`. Endpoint đọc cài đặt **không đọc được** dòng
chứa nó; cái nó trả về là `hasKey: true` và một `hint` mấy ký tự cuối. Mọi thông
báo lỗi từ tầng này đều đi qua `scrub()` trước khi vào log, vì cách phổ biến
nhất để một khoá lọt vào tệp log là một HTTP client tử tế in lại request header
trong exception.

Bấm **Test** — nút này bảo mô hình chấm thử đúng một câu mẫu. Xanh là xong.

### Bước 3 — nói (không bắt buộc)

Mô hình đọc chữ, không nghe tiếng. Một câu nói phải được **gỡ băng** trước khi
chấm được, và đó là nhà cung cấp thứ hai với khoá thứ hai. Không cấu hình thì
G, H, I, J ở lại `pending` và màn hình **nói vì sao** thay vì bịa ra điểm.

Mở **Speaking: transcription** rồi điền (khoá OpenAI):

| Ô | Giá trị |
|---|---|
| Transcription endpoint | `https://api.openai.com` |
| Transcription model | `whisper-1` |
| Transcription API key | khoá OpenAI, dạng `sk-…` |

Ô endpoint để trống chính là tín hiệu "chưa cấu hình gỡ băng" — nên phải điền
`https://api.openai.com`, không bỏ trống rồi chỉ dán khoá.

> Phải nói rõ một lần nữa, vì nó nằm trong rubric và nằm trong cả ghi chú học
> viên đọc: cái được chấm là **bản gỡ băng**. Nó đo từ vựng và ngữ pháp. Nó
> **không** đo phát âm, độ trôi chảy hay ngữ điệu. Một điểm phát âm suy ra từ
> bản gỡ băng là một con số không có gì đứng sau.

### Làm sao biết là xong

Sau khi lưu khoá, bộ quét nền sẽ tự tìm những bài còn `pending` và chấm nốt —
**kể cả những bài đã nộp từ trước khi có khoá, nên phải làm Bước 0 trước.** Nó
chạy 10 phút một lần.

Đếm số bài **chưa có band tổng**, trước khi dán khoá và lại sau ~15 phút. Con số
phải **giảm**:

```
node scripts/attempts.js pending
```

Lệnh này cũng in ra đang kẹt ở kỹ năng nào. Còn `speaking` mà hết `writing`
nghĩa là bước 3 chưa làm — đúng như thiết kế, không phải lỗi.

> Trước đây chỗ này là hai câu lệnh `sqlite3`. Máy chủ **không có** CLI đó:
> `deploy/ec2-bootstrap.sh` không cài, `Dockerfile` không cài, và Ubuntu server
> không kèm sẵn — nền tảng nói chuyện với SQLite qua `node:sqlite` nên chưa bao
> giờ cần đến. Câu lệnh duy nhất để kiểm tra việc chấm có chạy hay không lại là
> câu lệnh báo `command not found`.

Không giảm gì cả thì xem **Quản trị → Cài đặt**: ô `lastError` giữ lý do thất
bại gần nhất, đã được scrub.

Muốn chạy ngay không đợi 10 phút: **Quản trị → Cài đặt → "Mark what is
waiting"**. Nút này chỉ hiện khi đã có khoá.

---

## 2. Nghiệm thu lại bản sao lưu, để khoá được block 0

Ba lệnh này **đã chạy qua trên máy thật rồi** — nhưng chạy với bản vá chưa
commit trong tay. Điều kiện khoá của block 0 là *đã phục hồi được từ mã đã
commit*, không phải *đã phục hồi được một lần nào đó*. Nên phải chạy lại đúng ba
lệnh đó sau khi self-update đã kéo `59b8485` về.

```
cd /home/ubuntu/PREPTEST
set -a; . /etc/vpet-prep.env; set +a

node scripts/backup.mjs run
node scripts/backup.mjs list
node scripts/backup.mjs restore latest --into /tmp/thu.sqlite --yes
```

Phải thấy:

1. `run` — kết thúc 0, và bản mới hiện ra trong `list`
2. `list` — **có dòng**. Đây là dòng đáng nhìn kỹ nhất: lỗi đã vá ở `59b8485`
   làm `list()` trả mảng rỗng, mà mọi nơi gọi nó đều đọc mảng rỗng là "chưa có
   bản sao lưu nào" — kể cả sàn `MIN_KEEP` của `prune()`.
3. `restore` — tạo `/tmp/thu.sqlite` mở được:

```
PREP_DB=/tmp/thu.sqlite node -e "console.log(require('./server/db').db.prepare('SELECT COUNT(*) n FROM users').get())"
rm -f /tmp/thu.sqlite
```

Và câu lệnh cần đến khi có sự cố thật, khác hẳn bài diễn tập ở trên vì nó **ghi
đè CSDL đang chạy** — thiếu `--into` là một chữ:

```
pm2 stop preptest                             # bắt buộc, xem ghi chú dưới
node scripts/backup.mjs restore latest --yes
pm2 start preptest
```

> `pm2 stop` không phải cho chắc. `restore` đổi tên tệp cũ sang một bên rồi chép
> bản lưu vào chỗ của nó — tiến trình Node đang chạy vẫn giữ inode cũ, nên nó
> tiếp tục phục vụ dữ liệu cũ và ghi vào cái tệp đã bị đẩy sang bên, rồi lần
> khởi động sau vứt hết những gì nó vừa ghi.

`set -a; . /etc/vpet-prep.env; set +a` **không được bỏ**. Thiếu nó thì
`BACKUP_DRIVER` không có và lệnh sẽ âm thầm ghi vào `disk` — tức là chụp bản sao
vào đúng cái ổ mà bản sao đó sinh ra để đề phòng.

---

## 3. Bật nhiều tiến trình

Máy 4 nhân, Node chạy một luồng, nên nền tảng dùng 1 nhân và để 3 nhân ngồi
không. Block 7 sửa được việc đó, nhưng **cố tình không tự bật**: một bản cài
đang chạy không được phép nhân tư bộ nhớ chỉ vì nó thấy bốn nhân.

```
# thêm vào /etc/vpet-prep.env
WEB_CONCURRENCY=auto
```

`auto` = một worker mỗi nhân, tối đa 8. Muốn cố định thì ghi thẳng số. Để trống
hoặc bỏ dòng này = một tiến trình, y như hôm nay.

Nạp lại đúng cách như bước 1 (`set -a; . …; set +a` rồi `pm2 restart … && pm2 save`).

Biết là chạy đúng khi log có **một** dòng jobs và **N** dòng worker:

```
pm2 logs preptest --lines 50 --nostream | grep -E '\[cluster\]|\[jobs\]'
```

```
[cluster] primary 1234 starting 4 workers
[jobs] background jobs armed in pid 1234       ← đúng MỘT dòng này
[cluster] worker 1235 listening
[cluster] worker 1236 listening
[cluster] worker 1237 listening
[cluster] worker 1238 listening
```

> **Hai dòng `[jobs]` trở lên là hỏng, và hỏng theo kiểu tốn tiền.** Bộ quét
> chấm AI giữ hàng đợi trong bộ nhớ, nên hai bản sao sẽ cùng tìm thấy một bài
> chưa chấm, cùng chấm nó, và gửi hai hoá đơn. `scripts/test-cluster.mjs` canh
> đúng chỗ này.

Sau vài phút có người dùng, `grep 'serving'` phải cho ra nhiều pid khác nhau —
nếu chỉ một pid phục vụ thì lưu lượng đang bị ghim vào một worker và cụm không
mua được gì.

Số đo trên máy 4 nhân, cùng CSDL, cách nhau mười phút (`docs/BLOCKS.md`):
`/api/catalog` **1.555 → 4.729 req/s**, và ở 200 luồng đồng thời yêu cầu chậm
nhất **5.121 ms → 630 ms**.

Cái giá: ở **1 luồng** cụm chậm hơn (`/healthz` 2.899 → 1.411 req/s) vì có thêm
chặng điều phối. Máy phục vụ vài người thì để trống là đúng.

---

## 4. Ba trần chi phí — biết chúng ở đâu, và nới thế nào

Block 8 thêm ba cái trần. Cả ba đều **đã bật sẵn** với mặc định an toàn, nên mục
này không phải việc phải làm — nó là chỗ tra khi có gì đó bị chặn.

| Biến | Mặc định | Chặn cái gì |
|---|---|---|
| `AI_CALLS_PER_DAY` | 6000 | tổng số lần gọi mô hình trong 24 giờ trượt |
| `AI_CALLS_PER_ACCOUNT_PER_DAY` | 240 | một tài khoản trong 24 giờ trượt |
| `READ_PER_MIN` | 1200 | số lần đọc `/api/` mỗi phút, tính theo phiên đăng nhập |

Một bài VPET đầy đủ = **26 lần chấm + 21 lần gỡ băng**. Nên 240 ≈ năm bài trọn
vẹn một ngày cho một người, và 6000 ≈ 127 bài cho cả nền tảng.

Muốn **dừng chi tiêu ngay**: đặt `AI_CALLS_PER_DAY=0` rồi nạp lại env. Số 0
nghĩa là trần bằng không, tức từ chối ngay lần gọi đầu tiên. (Trước đây số 0 lại
có nghĩa là *bỏ trần* — đúng ngược với điều người gõ nó đang muốn, và không màn
hình nào báo gì cả.) Muốn **bỏ hẳn trần** thì phải viết ra chữ: `=off`. Mọi giá
trị sai hoặc gõ nhầm đều quay về mặc định chứ không bao giờ thành "không giới
hạn".

Đặt `0` là **tắt hẳn** cái trần đó. Gõ sai (`none`, `-5`, để trống) thì rơi về
**mặc định**, không rơi về "không giới hạn" — một lỗi đánh máy không được phép
là thứ gỡ mất giới hạn chi tiêu.

Xem đang dùng bao nhiêu: **Quản trị → Cài đặt**, ngay dưới ô trạng thái khoá.
Quá 80% thì banner chuyển vàng, chạm trần thì chuyển đỏ.

Chạm trần **không** làm bài bị điểm 0. Câu đó ở lại `pending`, bộ quét quay lại
sau mười phút, và khi cửa sổ 24 giờ trượt qua thì nó được chấm. Ngân sách của
nền tảng không phải lỗi của thí sinh.

### Còn một tầng nữa, và nó không nằm trong repo

Ba cái trần trên đều đếm **sau khi request đã vào tới Node**. Chúng chặn được
một tài khoản tiêu quá tay; chúng **không** chặn được một trận lụt request ẩn
danh, vì lúc đó tiến trình đã phải nhận kết nối, phân tích header và trả lời rồi.

Việc đó thuộc về **rìa mạng**, và với deployment này là CloudFront + AWS WAF
đứng trước EC2:

- một **rate-based rule** theo IP (ví dụ 2000 request/5 phút) — chặn kẻ quét
- **AWS managed rules**: `AWSManagedRulesCommonRuleSet` và
  `AWSManagedRulesKnownBadInputsRuleSet`
- CloudFront cache cho `/tailwind-built.css`, `/fonts/*` và ảnh — mấy thứ này
  không bao giờ nên chạm tới Node

Chưa làm. Ghi ra đây để nó là một việc còn nợ, không phải một chỗ trống ai đó
tưởng đã có. Trong lúc chưa có, `readLimit` cố tình **không** đếm request ẩn
danh: khoá duy nhất còn lại lúc đó là địa chỉ IP, mà một trường học sau một
NAT sẽ thành **một hạn mức chung cho bốn mươi học viên**. Thà để rìa mạng làm
đúng việc của nó còn hơn làm sai việc đó ở đây.

---

## 5. Ba cấp quản trị

Không phải việc phải làm — ghi ở đây để tra khi cần.

| Cấp | Trong CSDL | Làm được |
|---|---|---|
| **Quản trị** | `owner` | tất cả; **duy nhất** tạo được tài khoản quản trị, giữ khoá mô hình, phục hồi sao lưu |
| **Quản lý** | `manager` | học viên, mã kích hoạt, đề thi, ngân hàng câu hỏi, nhật ký |
| **Giáo viên** | `teacher` | xem báo cáo, soạn câu hỏi, chấm lại bài. Không sửa tài khoản, không thấy khoá API |

Tạo và đổi cấp: **Quản trị → Cài đặt → Tài khoản quản trị**. Tab đó chỉ hiện với
cấp Quản trị.

> **Cả ba cấp đều chấm lại được bài, và việc đó tiêu tiền của khoá.** Quyền
> `marking.run` cố ý mở cho cả ba: chấm lại một bài là cách xử lý thường ngày
> khi giáo viên nhìn thấy một điểm sai, đẩy nó lên cấp Quản trị thì biến việc đó
> thành một cái ticket. Thứ chặn chi tiêu là trần trong `server/ai-budget.js`
> chứ không phải phân quyền. Cụ thể, `teacher` và `manager` gọi được
> `POST /admin/ai/sweep` (xếp hàng toàn bộ tồn đọng) và
> `POST /admin/attempts/:id/mark?force=1` (xoá điểm cũ và chấm lại, 26 lần gọi
> một bài) qua API, dù nút không hiện trên màn hình của họ.

Vài quy tắc do **máy chủ** giữ, không phải giao diện — nghĩa là mở devtools cũng
không lách được:

- Không tự đổi cấp của chính mình, không tự ngưng chính mình.
- Không thao tác nào được phép để nền tảng còn **0 tài khoản Quản trị** đang hoạt
  động.
- Đổi cấp hoặc ngưng một tài khoản sẽ **đăng xuất tài khoản đó ngay**. Một quyền
  bị lấy đi mà còn chạy tiếp tám tiếng nữa cho tới lúc cookie hết hạn thì không
  phải là quyền đã bị lấy đi.

### Nếu không còn ai vào được

Màn hình từ chối tạo ra trạng thái đó, nhưng một bản phục hồi hoặc một lần sửa
tay vào CSDL vẫn tạo ra được. Khi đó **không ai còn quyền cấp lại quyền cho ai**,
và đường về là dòng lệnh trên máy chủ:

```
cd /home/ubuntu/PREPTEST
node scripts/accounts.js list                  # xem còn những tài khoản nào
node scripts/accounts.js set-level <tên> owner # nâng một tài khoản lên, và bật lại
node scripts/accounts.js reset-admin --user=<tên>
```

`set-level` cũng giữ đúng quy tắc "phải còn một Quản trị": nó không tự tạo ra
được cái trạng thái nó sinh ra để sửa.

---

## Còn treo, không sửa được từ repo

`/home/ubuntu/vpet-selfupdate.sh` chạy `pm2 restart preptest --update-env` mà
**không** source `/etc/vpet-prep.env`. Hiện tại biến vẫn sống vì PM2 gộp env chứ
không thay và `pm2 save` đã ghi xuống dump — nhưng đó là **may, không phải thiết
kế**, và nó sẽ cắn đúng vào lần thêm biến mới tiếp theo, tức là đúng vào
`TOKEN_ENCRYPTION_KEY` ở mục 1. Script đó không nằm trong repo.

Sửa: thêm một dòng vào đầu script, ngay trước `pm2 restart`:

```
set -a; . /etc/vpet-prep.env; set +a
```
