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

Cái giá: **16 lần gọi mô hình mỗi bài** (cộng 21 lần gỡ băng nếu đã bật bước 3;
phần H được chấm bằng so khớp nên không tốn lần gọi nào).
56 bài mô phỏng là khoảng **896 lần gọi**, tức khoảng 15% trần
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
| Model | `claude-haiku-4-5` |
| API key | khoá Anthropic, dạng `sk-ant-…` |

> **Cảnh báo về trình quản lý mật khẩu.** Hai ô khoá là `type="password"`, nên
> Chrome/1Password sẽ **mời điền mật khẩu đăng nhập của chính anh/chị** vào đó.
> Nếu lỡ lưu, mật khẩu quản trị sẽ được niêm vào CSDL rồi **gửi thẳng cho
> Anthropic** trong header `x-api-key` ở lần chấm kế tiếp. Ô nhập đã được đánh
> dấu để các trình đó không tự điền, và **máy chủ từ chối** đúng giá trị đó kèm
> lời giải thích. Thấy thông báo "That is your own sign-in password" thì nghĩa
> là cái chặn đã làm việc — xoá ô đi và dán khoá thật.

- **Base URL** — mặc định `https://api.anthropic.com`
- **Model** — mặc định `claude-haiku-4-5`
- **API key** — dán vào ô `password`, bấm Lưu

> **Vì sao mặc định là Haiku chứ không phải Sonnet.** $1 vào / $5 ra mỗi triệu
> token, so với $3 / $15 của Sonnet 5 — rẻ gấp ba cho đúng 16 lần gọi mà một bài
> cần. Việc chấm ở đây là *trích xuất có cấu trúc* theo rubric có sẵn, không phải
> suy luận mở: đọc định nghĩa tiêu chí, cho điểm 0–10, chép một cụm từ trong bài
> của thí sinh, viết 25 chữ. Và những chỗ một model rẻ hay sai thì hệ thống này
> vốn đã không tin sẵn — `readVerdict()` bỏ câu trả lời không đọc được rõ ràng,
> `verifyEvidence()` bỏ trích dẫn thí sinh không hề viết, `combine()` áp trần dù
> model nói gì. Nên một model yếu hơn sẽ trượt về phía **"chưa chấm"** (quản trị
> viên nhìn thấy) chứ không phải **"chấm sai"** (không ai nhìn thấy).
>
> Thứ đó **không** trả lời được là *độ chuẩn của thang điểm*. Xem mục "So sánh
> hai model" bên dưới trước khi mở cho cả lớp.

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
| Transcription model | `gpt-transcribe` |
| Transcription API key | khoá OpenAI, dạng `sk-…` |

> **Vì sao `gpt-transcribe` chứ không phải `whisper-1`.** $0.0045/phút so với
> $0.006 — rẻ hơn 25%, chính xác hơn, và là model OpenAI khuyến nghị cho gỡ băng
> thông thường; `whisper-1` nằm trong nhóm cũ đang bị cắt dần.
>
> Có model rẻ hơn nữa là `gpt-4o-mini-transcribe` ($0.003/phút) và **cố ý không
> chọn**. Một bài nhiều nhất là 8 phút tiếng nói, nên cả khoản tiết kiệm chỉ
> khoảng **một xu một bài** — trong khi phần H là "nhắc lại đúng câu vừa nghe",
> tức là *bản gỡ băng chính là câu trả lời*. Trả thêm một xu để không trừ điểm
> thí sinh vì lỗi của máy gỡ băng là đổi đúng chiều.

Ô endpoint để trống chính là tín hiệu "chưa cấu hình gỡ băng" — nên phải điền
`https://api.openai.com`, không bỏ trống rồi chỉ dán khoá.

> Phải nói rõ một lần nữa, vì nó nằm trong rubric và nằm trong cả ghi chú học
> viên đọc: cái được chấm là **bản gỡ băng**. Nó đo từ vựng và ngữ pháp. Nó
> **không** đo phát âm, độ trôi chảy hay ngữ điệu. Một điểm phát âm suy ra từ
> bản gỡ băng là một con số không có gì đứng sau.

### Một bài tốn bao nhiêu

Một bài VPET đầy đủ cần **21 lần gỡ băng** và — kể từ khi phần H được chấm bằng
so khớp thay vì bằng model — chỉ còn **16 lần gọi model**, không phải 26. Tối đa
khoảng 8 phút tiếng nói. Ước tính theo prompt thật (~1.400 token vào, ~350 token
ra mỗi câu):

| Cấu hình | Chấm | Gỡ băng | **Một bài** |
|---|---:|---:|---:|
| `claude-haiku-4-5` + `gpt-transcribe` *(mặc định)* | ~$0,05 | ~$0,036 | **~$0,09** |
| `claude-haiku-4-5` + `gpt-4o-mini-transcribe` | ~$0,05 | ~$0,024 | ~$0,07 |
| `claude-sonnet-5` + `whisper-1` *(cũ, và H vẫn qua model)* | ~$0,25 | ~$0,048 | ~$0,29 |

**Phần H không tốn lần gọi model nào.** Câu phải nhắc lại nằm sẵn trong ngân
hàng đề (`say`), nên `server/repeat.js` so khớp từ: bao nhiêu từ quay lại, và
chuỗi dài nhất còn đúng thứ tự. Hai con số đó chính là hai tiêu chí `content` và
`structure` mà rubric vốn đã định nghĩa cho H, nên báo cáo hiện y hệt như khi
model chấm. Nó cũng **không thể tự mâu thuẫn giữa hai lần chạy**, điều mà model
thì có.

> Đánh đổi phải nói rõ: **độ chính xác của máy gỡ băng giờ chính là điểm.** Một
> model chấm bản gỡ băng có thể bỏ qua sai lệch nhỏ; phép so khớp thì không, vì
> nó không biết lỗi là của thí sinh hay của máy. Đó là lý do trực tiếp để dùng
> `gpt-transcribe` chứ không phải model gỡ băng rẻ nhất. Ghi chú chấm điểm luôn
> in **cả hai câu** — thí sinh nói gì và câu gốc là gì — để ai bị trừ điểm cũng
> thấy được chính xác cái gì đã được đem so.

Giá tra ngày 2026-08-24: Haiku 4.5 $1/$5, Sonnet 5 $3/$15 mỗi triệu token;
Whisper $0,006/phút, `gpt-transcribe` $0,0045, `gpt-4o-mini-transcribe` $0,003.
**Giá có thể đổi — tra lại trước khi lấy con số này đi báo cáo.**

Còn một mức giảm nữa chưa làm: **Batch API giảm 50%**. Việc chấm ở đây vốn
không cần trả lời ngay — bộ quét chạy 10 phút một lần và bài nằm trong hàng đợi
sẵn — nên nó hợp gần như hoàn hảo. Đây là thay đổi mã thật (tạo batch, hỏi
trạng thái, lấy kết quả), chưa làm, ghi lại vì đó là đòn bẩy lớn nhất còn lại:
Haiku + Batch ≈ **$0,04/bài** cho phần chấm.

**Prompt caching thì không dùng được.** Phần prompt cố định chỉ khoảng 480
token, dưới mức tối thiểu ~1.024 token để cache — có nhồi thêm cho đủ thì cũng
là thêm token để tiết kiệm token.

### So sánh hai model, trước khi mở cho cả lớp

Đừng tin lời tôi, cũng đừng tin model card. Chấm cùng một bài bằng hai model rồi
đọc chênh lệch:

```
node scripts/model-compare.mjs --attempt=<id>          # chạy thử, chỉ ước tính
node scripts/model-compare.mjs --attempt=<id> --yes    # làm thật
node scripts/model-compare.mjs --attempt=<id> --repeat=3 --yes   # model tự so với chính nó
```

Lệnh này **không đụng vào bài** — điểm được đọc, so, rồi bỏ đi; `attempt_answers`,
`rubric_scores`, `attempt_scores` không bị ghi. Nhưng nó **tiêu tiền thật** (hai
model × 26 câu = 52 lần gọi một bài), nên nó in số ra rồi dừng cho tới khi có
`--yes`.

Ba cột đáng nhìn:

- **NOT MARKED** — model không tạo được câu trả lời đọc được. Model nào cao ở
  đây thì không rẻ ở bất kỳ giá nào: những câu đó nằm lại `pending` rồi quay
  vòng theo thang backoff, mỗi vòng lại trả tiền.
- **spread of the gap** — chứ không phải *mean gap*. Model rẻ chấm thấp đều 0,3
  điểm thì không sao, đó là hằng số. Chênh lệch **tản rộng** mới là vấn đề: nghĩa
  là hai model bất đồng về *bài nào tốt hơn bài nào*, không phải về vị trí thang.
- **EVIDENCE DROPPED** — `rubric.js` vứt trích dẫn không có thật trong bài thí
  sinh. Số này cao nghĩa là model đang bịa dẫn chứng: điểm có thể vẫn đúng, nhưng
  phần nhận xét người học đọc thì không có gì đứng sau.

`--repeat=3` trả lời câu khác: model bất đồng với **chính nó** bao nhiêu. Nếu
own-spread lớn ngang chênh lệch giữa hai model thì phép so ở trên đang đo nhiễu.

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
>
> Từ 2026-09-02 lệnh tự kiểm điều này: nó quét `/proc` (cùng cách
> `scripts/accounts.js` tìm CSDL server đang mở) và **từ chối** khi còn một
> `node server.js` giữ đúng tệp đó, in ra pid. Quên `pm2 stop` thì không mất gì
> — chỉ phải chạy lại. `--force` đè qua kiểm tra này; chỉ dùng khi biết chắc
> tiến trình đang giữ tệp không phải server thật.

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

Một bài VPET đầy đủ = **16 lần chấm + 21 lần gỡ băng**. Nên 240 ≈ sáu bài trọn
vẹn một ngày cho một người, và 6000 ≈ 162 bài cho cả nền tảng.

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
> `POST /admin/attempts/:id/mark?force=1` (xoá điểm cũ và chấm lại, 16 lần gọi
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

## 6. Chuyển sang PostgreSQL

Nền tảng chạy được trên **cả hai** engine. SQLite là mặc định và không cần
làm gì; đặt `DATABASE_URL` (hoặc `PG_URL`) là chuyển sang Postgres.

### Vì sao phải chuyển

`data/prep.sqlite` là **một tệp trên một máy**. Trong container thì `/app/data`
bị thay cùng với task, và toàn bộ tài khoản đi theo. Đó là lý do duy nhất, và
nó chỉ thành vấn đề khi triển khai lên nhiều máy — máy đơn hiện tại thì SQLite
vẫn đúng.

### Ba lệnh

```bash
# 1. Một cụm để thử (máy dev; máy thật thì bỏ qua, dùng RDS)
npm run pg:dev                      # in ra: export PG_URL=…

# 2. Tạo bảng và chép dữ liệu sang. Mặc định là CHẠY THỬ, không ghi gì.
PG_URL=… npm run pg:migrate         # xem nó sẽ làm gì
PG_URL=… npm run pg:migrate -- --yes

# 3. Chạy server trên Postgres
DATABASE_URL=… npm start
```

Khởi động lên sẽ in `[db] postgres: 43 tables, …`. Nếu chưa chạy bước 2 thì
tiến trình **dừng hẳn** với câu "PostgreSQL is reachable but empty" chứ không
lên rồi lỗi từng request — một tiến trình mở cổng mà mọi request đều hỏng thì
tệ hơn là không lên, vì health check nhìn cổng sẽ báo là khoẻ.

### Ba điều cần biết

**Tạo bảng là bước triển khai, không phải việc lúc khởi động.** `pg-migrate`
chạy một lần, có chủ ý. Server không tự tạo bảng: mười task khởi động cùng lúc
mà cùng `CREATE TABLE` là hỏng, và một seed chạy mỗi lần khởi động thì sẽ có
ngày chạy đè lên dữ liệu thật.

**Sequence.** Dữ liệu chép sang giữ nguyên id, nên nếu không chỉnh thì sequence
vẫn ở 1 và lần chèn kế tiếp đâm vào dòng số một. `pg-migrate` đặt mọi sequence
vượt mốc cao nhất **rồi đọc lại để kiểm**. Đây là lỗi khiến một cuộc chuyển đổi
trông như thành công cho tới đúng lúc có người đăng ký.

**Sao lưu đổi chủ.** `server/backup.js` sao lưu tệp SQLite. Trên Postgres thì
việc đó là snapshot của RDS, không phải của tiến trình này. Màn sao lưu trong
khu quản trị vẫn nói về tệp SQLite và **không** mô tả đúng một cài đặt Postgres.

### Kiểm

Ba bộ, đều nằm trong `npm run verify` và đều **báo bỏ qua thật to** khi máy
không có Postgres:

| Bộ | Kiểm gì |
|---|---|
| `test-pg-schema` | DDL nạp được vào một server thật, so từng bảng từng cột |
| `test-pg-driver` | Bốn động từ trả lời **giống hệt** SQLite, dấu giữ chỗ, giao dịch |
| `test-pg-app` | Các module thật chạy trên dữ liệu đã chép sang |

Bộ thứ ba là bộ đáng giá nhất: nó tìm ra năm khác biệt phương ngữ trong những
truy vấn đã đúng suốt nhiều tháng, trong đó có một lỗi **không báo lỗi gì cả**
— node-postgres trả `COUNT(*)` dưới dạng chuỗi, nên phép cộng lặng lẽ thành
phép nối chuỗi.

---

## 7. Tài khoản AWS — khảo sát 25/08/2026, và những gì phải cẩn thận

Khảo sát bằng quyền đọc trước khi định triển khai App Runner. Ghi lại vì hai lý
do: nó tốn lệnh gọi thật, và nó tìm ra vài thứ mà ai triển khai cũng cần biết
trước khi gõ `create`.

### Đây là tài khoản DÙNG CHUNG

Tài khoản `659161125499` không chỉ có VPET Prep. Ở **ap-southeast-1**:

| Tài nguyên | Của ai | Trạng thái |
|---|---|---|
| EC2 `testprep-backend` (t3.micro, `54.255.98.192`) | **VPET Prep** | **đang chạy** |
| RDS `vietravel-db` (postgres 16.14, db.t4g.micro) | dự án khác | đang chạy |
| EC2 `Ebookmedi`, `English Learning System`, `Support Agent`, `Top Stars`, `office-server`, `vietravel-exam` | dự án khác | đã tắt |
| S3 `vpet-prep-backups-659161125499` | **VPET Prep** | 65 bản, mới nhất 25/08 09:23 |

Ở **us-east-1** còn một Aurora PostgreSQL và hai kho ECR `easy-english-*` của
một dự án khác nữa.

> **Ràng buộc bàn giao có răng thật ở đây.** "Chỉ tạo, KHÔNG xoá, không sửa,
> không tách rời tài nguyên đang có" không còn là câu nói suông khi trong cùng
> một VPC mặc định có production của người khác. Cụ thể: **không** đụng vào
> `vietravel-db`, **không** sửa security group nào đang có (`default`,
> `launch-wizard-*`, `rds-postgres-sg`) — chỉ tạo group mới.

### VPET Prep ĐÃ chạy production rồi

`http://54.255.98.192/healthz` trả **200**, và `/prep/landing/` trả đúng
`<title>VPET Prep · Mock tests for the VPET exam</title>`. Nghĩa là bất kỳ việc
dựng App Runner nào cũng **không phải triển khai lần đầu** mà là dựng một bản
thứ hai bên cạnh một bản đang phục vụ người thật.

Chủ sở hữu đã chọn (25/08): **dựng song song, nạp dữ liệu thật, không đụng máy
EC2 đang chạy.** Kiểm xong rồi chuyển đổi là một quyết định riêng.

### Hai điều đáng sửa, không liên quan tới việc triển khai

**Đang thao tác bằng root.** `sts:GetCallerIdentity` trả về
`arn:aws:iam::659161125499:root`. Root không có rào chắn nào và không thu hồi
được từng phần. Nên tạo một IAM user hoặc role riêng cho việc triển khai, và bật
MFA cho root.

**Không có ECR, ECS hay App Runner nào ở Singapore.** Nên mọi thứ dưới đây đều
là tạo mới, không có gì để giẫm lên.

### Các bước, khi có kết nối trở lại

Chưa chạy — connector AWS rớt giữa chừng. Thứ tự và tham số đã chốt:

```bash
R=ap-southeast-1

# 1. Kho ảnh
aws ecr create-repository --repository-name vpet-prep --region $R

# 2. Ảnh. KHÔNG build trên testprep-backend — nó là máy đang phục vụ người thật
#    và chỉ có t3.micro. Build ở máy có Docker rồi đẩy lên.
docker build -t vpet-prep .
docker tag  vpet-prep 659161125499.dkr.ecr.$R.amazonaws.com/vpet-prep:latest
docker push 659161125499.dkr.ecr.$R.amazonaws.com/vpet-prep:latest

# 3. Security group RIÊNG cho database mới. Không sửa rds-postgres-sg đang có.
aws ec2 create-security-group --group-name vpet-prep-db-sg \
    --description "VPET Prep RDS" --vpc-id vpc-035d01c64808a850c --region $R

# 4. Database MỚI. Không dùng lại vietravel-db.
aws rds create-db-instance --db-instance-identifier vpet-prep-db \
    --engine postgres --engine-version 16 --db-instance-class db.t4g.micro \
    --allocated-storage 20 --no-publicly-accessible --region $R \
    --master-username vpetadmin --manage-master-user-password

# 5. Chuỗi kết nối vào Secrets Manager, không vào biến môi trường thô
# 6. VPC connector cho App Runner để với tới RDS riêng tư,
#    và mở cổng 5432 trên vpet-prep-db-sg CHỈ cho security group của connector
# 7. Nạp dữ liệu: tải bản sao lưu S3 mới nhất, giải nén, dọn tài khoản demo,
#    rồi PREP_DB=<file> PG_URL=<rds> node scripts/pg-migrate.mjs --yes
# 8. App Runner trỏ vào ECR, biến DATABASE_URL lấy từ Secrets Manager
```

**Chưa xác nhận được:** App Runner có mặt ở `ap-southeast-1` hay không — kết nối
rớt trước khi tôi kiểm. Đó là việc đầu tiên phải làm, vì nếu không có thì phương
án đổi sang ECS Fargate và bước 6–8 khác hẳn.

**Chi phí ước chừng:** 25–60 USD/tháng (RDS ~14, App Runner ~10 cố định cộng CPU
theo lượt truy cập). Ước lượng, không phải báo giá.

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

## 8. Gửi email bằng Gmail — làm được ngay, không sửa mã

Hỏi ngày 04/09/2026. Câu trả lời ngắn: **được**, và `server/mail.js` đã hỗ trợ
sẵn đúng thứ Gmail cần. Module này tự viết trên `node:net` + `node:tls` (không
thêm dependency), biết STARTTLS ở cổng 587 và TLS ngay từ byte đầu ở 465, biết
`AUTH PLAIN` và `AUTH LOGIN`, và **từ chối gửi mật khẩu qua kênh chưa mã hoá**
thay vì âm thầm hạ cấp. Không phải viết thêm dòng nào.

Đây cũng là việc gỡ nốt cảnh báo `no-mail-service` đang in ra log, và là điều
kiện để tính năng quên mật khẩu thực sự đến được người dùng.

### 8.1 Hai đường, chọn theo việc đã có tên miền hay chưa

| | **App Password** (dùng được hôm nay) | **Workspace SMTP relay** (khi có tên miền) |
|---|---|---|
| Host | `smtp.gmail.com` | `smtp-relay.gmail.com` |
| Cần gì | Một tài khoản Google có **2 bước xác minh**, rồi tạo App Password 16 ký tự | Google Workspace trên tên miền của mình |
| Gửi từ địa chỉ nào | **Bắt buộc** là chính tài khoản đã đăng nhập (hoặc alias đã xác minh trong "Send mail as") | Bất kỳ địa chỉ nào thuộc tên miền |
| Trần gửi | ~500 thư/ngày | ~2.000 thư/ngày |
| Hợp cho | Thư xác thực, đặt lại mật khẩu | Như trên, ở quy mô lớn hơn |

Cả hai đều **không** hợp để gửi thư quảng bá hàng loạt (bảng `users` có cột
`notify_promo`): việc đó cần một nhà cung cấp chuyên gửi, và một tên miền có
SPF/DKIM của riêng mình.

### 8.2 Biến môi trường, đặt vào `/etc/vpet-prep.env`

```
MAIL_DRIVER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vpetprep@gmail.com
SMTP_PASS="abcdefghijklmnop"
MAIL_FROM="VPET Prep <vpetprep@gmail.com>"
PUBLIC_BASE_URL=https://d1tjeiogootdxv.cloudfront.net
```

> **Dấu nháy ở hai dòng giữa là bắt buộc, không phải cho gọn.** Tệp này được nạp
> bằng `set -a; . /etc/vpet-prep.env` — nghĩa là shell **thực thi** nó. Viết
> `MAIL_FROM=VPET Prep <vpetprep@gmail.com>` thì `<` là chuyển hướng đầu vào và
> `>` ở cuối dòng không có tên tệp đi kèm: **lỗi cú pháp**, và lỗi cú pháp làm
> việc nạp **dừng ngay tại đó**. Đo thật, không phải suy đoán: mọi biến nằm
> **sau** dòng hỏng đều không được đặt — kể cả `TOKEN_ENCRYPTION_KEY`, vì khoá đó
> được *thêm vào cuối tệp*, tức là nằm dưới. App Password Google hiện ra dạng
> `abcd efgh ijkl mnop`; gõ vào đây **bỏ hết dấu cách**.
>
> `MAIL_FROM` **được phép** kèm tên hiển thị: `server/mail.js` tách địa chỉ ra
> cho phong bì SMTP và cho `Message-ID`, giữ nguyên tên cho header `From`. Trước
> 04/09/2026 nó không tách, nên lệnh gửi thành
> `MAIL FROM:<VPET Prep <a@gmail.com>>` và Gmail trả 5xx — đúng cái dạng README
> vẫn lấy làm ví dụ. `scripts/test-mail.mjs` nay canh chỗ đó.

### 8.2a Đừng sửa tệp bằng tay — `scripts/setup-mail.sh` làm việc đó

Bảy dòng ở trên đọc thì dễ, gõ tay vào một tệp đang giữ `TOKEN_ENCRYPTION_KEY`
thì không. `scripts/setup-mail.sh` **sửa một bản sao, chứng minh bản sao vẫn đọc
ra đúng từng giá trị mà bản gốc đọc ra, rồi mới ghi đè** — và giữ bản cũ lại bên
cạnh. Nó cũng không bao giờ in mật khẩu ra, không nhận mật khẩu trên dòng lệnh
(ai cũng đọc được bằng `ps`), và không để mật khẩu lọt vào `~/.bash_history`.

**Vào máy chủ bằng gì.** EC2 `testprep-backend` (`54.255.98.192`, ap-southeast-1).
Không cần tệp `.pem`, không cần mở cổng 22: AWS Console → **EC2** → Instances →
chọn `testprep-backend` → nút **Connect** → thẻ **Session Manager** → **Connect**.
Ra một cửa sổ dòng lệnh ngay trong trình duyệt. Máy này có sẵn IAM role
`EC2-SSM-Role` (xem `docs/BLOCKS.md`), tức là đúng thứ Session Manager cần. Vào
xong gõ `sudo -i` để thành `root`. Ai có khoá riêng thì
`ssh -i khoa.pem ubuntu@54.255.98.192` cũng ra cùng một chỗ.

> Đừng dùng **Run Command** cho bước nhập mật khẩu: nội dung lệnh gửi qua Run
> Command được AWS lưu lại. Run Command chỉ hợp với `--check` và với
> `deploy/survey.sh` — hai thứ không in bí mật.

**Chạy ở thư mục nào.** Repo mô tả **hai** kiểu cài: tài liệu vận hành ghi
`/home/ubuntu/PREPTEST` + PM2 tên `preptest` chạy dưới người dùng `ubuntu` (khảo
sát máy thật hồi block 0), còn `deploy/ec2-bootstrap.sh` dựng kiểu khác —
`/opt/vpet-prep`, người dùng `vpet`, systemd. Đừng đoán, hỏi máy một câu:

```bash
sudo -u ubuntu pm2 info preptest 2>/dev/null | grep -iE "script path|exec cwd"
ls -d /home/ubuntu/PREPTEST /opt/vpet-prep 2>/dev/null

# không có pm2 thì hỏi thẳng tiến trình đang chạy:
sudo ls -l /proc/$(pgrep -f '[s]erver\.js' | head -1)/cwd
```

Dấu ngoặc trong `'[s]erver\.js'` không thừa: `pgrep -f "server.js"` khớp cả
dòng lệnh của chính cái shell đang gõ, nên nó tự tìm thấy mình.

Thư mục nào trả lời thì `cd` vào đó. Bên dưới viết theo `/home/ubuntu/PREPTEST`;
nếu máy trả về `/opt/vpet-prep` thì thay đường dẫn và đổi `-u ubuntu` thành
`-u vpet`.

Ba lệnh:

```bash
cd /home/ubuntu/PREPTEST
sudo -u ubuntu git pull          # người sở hữu bản checkout mới pull được

# 1. xem tệp hiện có gì (chỉ đọc, không in bí mật, chỉ in độ dài)
sudo bash scripts/setup-mail.sh --check

# 2. ghi cấu hình — nó HỎI App Password, gõ vào không hiện ra màn hình
sudo bash scripts/setup-mail.sh --user vpetprep@gmail.com --base-url https://d1tjeiogootdxv.cloudfront.net --restart

# 3. gửi một thư thật vào hòm thư của mình
sudo bash scripts/setup-mail.sh --test dia-chi-cua-ban@gmail.com
```

> **Lệnh số 2 viết liền MỘT dòng, không cắt bằng dấu `\`.** Lần chạy thật đầu
> tiên (04/09/2026) dán bản nhiều dòng vào Session Manager và **hai dấu gạch bị
> mất**: bash nhận `user` chứ không phải `--user`. Script nay đoán ra trường hợp
> đó và hỏi lại "ý bạn là `--user` chứ?" thay vì chỉ nói không hiểu.

Nó dừng lại thay vì ghi nửa vời khi: mật khẩu không phải 16 ký tự (dấu hiệu gần
như chắc chắn là đang dùng mật khẩu tài khoản — xem 8.2b), `SMTP_USER` không
giống địa chỉ email, `PUBLIC_BASE_URL` thiếu `https://`, hoặc tệp mới sinh ra
không hợp lệ về cú pháp. Nó cảnh báo khi `MAIL_FROM` gửi từ một địa chỉ khác với
tài khoản đăng nhập (bẫy 1 ở 8.3), và khi `TOKEN_ENCRYPTION_KEY` không đủ 44 ký
tự. Chạy lại lần hai không đổi gì thêm; nếu tệp **đã** hỏng cú pháp từ trước thì
nó sửa luôn và nói rõ những biến nào sống lại.

`scripts/test-setup-mail.mjs` (76 kiểm, nằm trong `verify.sh`) canh đúng những
điều đó: một tệp có sẵn `TOKEN_ENCRYPTION_KEY` phải nguyên vẹn sau khi sửa,
`MAIL_FROM` phải giữ được cả tên hiển thị lẫn dấu `<>`, mọi lần từ chối đều
**không** được động vào tệp, và không có đầu ra nào chứa bí mật.

### 8.2b Mật khẩu tài khoản Google KHÔNG dùng được ở đây

Hỏi ngày 04/09: chủ đầu tư đưa `vpetprep@gmail.com` kèm mật khẩu đăng nhập của
chính tài khoản đó. Nó **sẽ không chạy**. Google tắt "Less secure app access" từ
2022, nên `smtp.gmail.com` từ chối mật khẩu tài khoản với
`535-5.7.8 Username and Password not accepted`. Chỉ hai thứ được chấp nhận:
**App Password** (16 ký tự, sinh riêng cho từng ứng dụng) hoặc OAuth2 — và
App Password chỉ hiện ra **sau khi bật Xác minh 2 bước**.

Bốn bước, chừng ba phút:

1. `myaccount.google.com/security` → bật **Xác minh 2 bước**.
2. `myaccount.google.com/apppasswords` → đặt tên (ví dụ `VPET Prep server`) → tạo.
3. Google hiện `abcd efgh ijkl mnop` **một lần duy nhất**. Chép ngay.
4. Điền vào `SMTP_PASS`, **bỏ hết dấu cách**, trong dấu nháy.

> **Và mật khẩu tài khoản đi qua chat thì coi như đã lộ** — đây là mật khẩu của
> cả tài khoản Google chứ không riêng hòm thư, nên phải đổi. Bật 2FA dù sao cũng
> là điều kiện bắt buộc của bước trên, nên làm hai việc đó cùng lúc.
>
> App Password bản thân nó cũng là **quyền gửi thư đầy đủ dưới danh nghĩa tài
> khoản này**. Nó thuộc về `/etc/vpet-prep.env` (chmod 600, chủ `root`) hoặc AWS
> Secrets Manager — **không bao giờ** nằm trong repo, trong ảnh chụp màn hình,
> hay trong tin nhắn.

### 8.3 Ba cái bẫy, cả ba đều im lặng

**1. `MAIL_FROM` phải đúng địa chỉ đã đăng nhập.** Gmail không cho gửi hộ một
địa chỉ lạ: đặt `no-reply@…` của một tên miền chưa xác minh thì hoặc bị từ chối,
hoặc bị Gmail ghi đè — và cả hai đều chỉ thấy khi thư đã không tới.

**2. `PUBLIC_BASE_URL` bây giờ là bắt buộc, và đây là cái bẫy do CloudFront sinh
ra.** Không đặt thì `mail.baseUrl()` dựng link từ `Host` của request; sau
CloudFront, `Host` mà máy gốc nhận được thường là **địa chỉ máy gốc**, nên link
trong thư sẽ ra `http://54.255.98.192/prep/dat-lai-mat-khau/?token=…` — gửi
token đặt lại mật khẩu qua HTTP trần, tới đúng cái máy lẽ ra không nên vào thẳng
được. Đặt biến này là xong; nhưng phải nhớ đặt.

**3. `pm2 restart --update-env` GỘP env, không đọc lại tệp** (mục 1 và
`docs/BLOCKS.md`). Thêm biến vào tệp rồi restart bình thường thì `MAIL_DRIVER`
vẫn là `console`, thư vẫn không gửi, và **không có lỗi nào cả**. Phải:

```
set -a; . /etc/vpet-prep.env; set +a
pm2 restart preptest --update-env
pm2 save
```

### 8.4 Bí mật để ở đâu

App Password là **chìa khoá đầy đủ của hòm thư đó** — ai đọc được thì gửi được
dưới danh nghĩa mình. Hai việc nên làm: dùng một **tài khoản Google riêng cho
nền tảng**, không phải tài khoản cá nhân; và nếu được thì để trong AWS Secrets
Manager (`AWS_SECRETS_ID`, `server/secrets.js` tự nạp vào env lúc khởi động)
thay vì nằm thẳng trong `/etc/vpet-prep.env`. Tệp env phải `chmod 600` và thuộc
`root` trong mọi trường hợp.

### 8.5 Kiểm là đã chạy

0. `sudo bash scripts/setup-mail.sh --check` — in cả **tệp** lẫn **tiến trình
   đang chạy** (đọc từ `pm2 jlist`) cạnh nhau. Đây là cách duy nhất thấy được bẫy
   số 3: tệp có `MAIL_DRIVER=smtp` mà tiến trình vẫn `console` nghĩa là restart
   chưa nạp lại tệp.
1. `pm2 logs preptest --lines 50 | grep "\[config\]"` — dòng `no-mail-service`
   phải **biến mất**.
2. Xin đặt lại mật khẩu cho một tài khoản thử trên
   `https://d1tjeiogootdxv.cloudfront.net/prep/quen-mat-khau/`, rồi mở hòm thư.
3. Bấm link trong thư: phải mở ra `https://d1tjeiogootdxv.cloudfront.net/…`,
   **không** phải `http://54.255.98.192/…`. Sai là do bẫy số 2 ở trên.

Một hệ quả phụ đáng biết: bật `MAIL_DRIVER=smtp` làm `mail.enabled()` thành
true, và `deliverLink()` khi đó **không bao giờ** trả link trong response nữa,
bất kể mọi biến khác. Tức là cấu hình mail cũng khoá vĩnh viễn lỗ ở
`docs/SECURITY.md` §5b.1 thêm một lớp nữa.
