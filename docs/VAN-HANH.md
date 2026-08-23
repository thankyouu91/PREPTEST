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

### Bước 1 — tạo `TOKEN_ENCRYPTION_KEY`

Khoá API của mô hình không được nằm trần trong CSDL. Nó được niêm bằng
AES-256-GCM (`server/sealed.js`) trước khi ghi, và thứ dùng để niêm là
`TOKEN_ENCRYPTION_KEY`. **Không có biến này thì màn hình Cài đặt từ chối nhận
khoá** — nó không âm thầm lưu bản trần; đó là chỗ duy nhất nền tảng cố tình
không "xuống cấp cho êm", vì một bản dự phòng êm ái sẽ khiến cái máy không làm
gì trở thành cái máy kém an toàn nhất.

Sinh khoá — **32 byte, mã base64, đúng 32 byte chứ không phải 32 ký tự**:

```
openssl rand -base64 32
```

Thêm vào `/etc/vpet-prep.env` (tệp đang có 4 dòng; **thêm dòng thứ 5, không sửa
4 dòng cũ**):

```
sudo sh -c 'printf "TOKEN_ENCRYPTION_KEY=%s\n" "$(openssl rand -base64 32)" >> /etc/vpet-prep.env'
```

Kiểm tra là đã ghi được — **không in giá trị ra màn hình**, chỉ đếm:

```
sudo grep -c '^TOKEN_ENCRYPTION_KEY=' /etc/vpet-prep.env     # phải là 1
sudo awk -F= '/^TOKEN_ENCRYPTION_KEY=/{print length($2)}' /etc/vpet-prep.env   # phải là 44
```

> 44 ký tự base64 = 32 byte. Ra số khác là sai độ dài, và app sẽ báo
> `TOKEN_ENCRYPTION_KEY must be exactly 32 bytes, base64 encoded` lúc khởi động
> chứ không phải lúc ai đó nộp bài.

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
một cái form sẽ từ chối.

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

Điền **Transcription base URL** và **Transcription model** (mặc định
`whisper-1`) rồi dán khoá thứ hai.

> Phải nói rõ một lần nữa, vì nó nằm trong rubric và nằm trong cả ghi chú học
> viên đọc: cái được chấm là **bản gỡ băng**. Nó đo từ vựng và ngữ pháp. Nó
> **không** đo phát âm, độ trôi chảy hay ngữ điệu. Một điểm phát âm suy ra từ
> bản gỡ băng là một con số không có gì đứng sau.

### Làm sao biết là xong

Sau khi lưu khoá, bộ quét nền sẽ tự tìm những bài còn `pending` và chấm nốt —
kể cả những bài đã nộp từ trước khi có khoá. Nó chạy 10 phút một lần.

Đếm số bài **chưa có band tổng**. Band tổng không nằm trong bảng `attempts`, nó
là một dòng `skill='overall'` trong `attempt_scores`, và `pending=1` nghĩa là
"đã có chỗ nhưng chưa chấm xong":

```
sqlite3 data/prep.sqlite "
  SELECT COUNT(*) FROM attempts a
   WHERE a.status='submitted'
     AND NOT EXISTS (SELECT 1 FROM attempt_scores s
                      WHERE s.attempt_id=a.id AND s.skill='overall' AND s.pending=0);"
```

Chạy trước khi dán khoá, rồi chạy lại sau ~15 phút. Con số phải **giảm**. Muốn
biết đang kẹt ở kỹ năng nào:

```
sqlite3 data/prep.sqlite \
  "SELECT skill, COUNT(*) FROM attempt_scores WHERE pending=1 GROUP BY skill;"
```

Còn `speaking` mà hết `writing` nghĩa là bước 3 chưa làm — đúng như thiết kế,
không phải lỗi.

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
sqlite3 /tmp/thu.sqlite "SELECT COUNT(*) FROM users;"
rm -f /tmp/thu.sqlite
```

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
