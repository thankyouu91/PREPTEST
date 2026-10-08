# Mẫu giọng Kokoro — nội dung đã bị xoá

Sáu tệp MP3 trong thư mục này dựng ngày 19/09/2026 bằng Kokoro-82M, từ **bộ đề
1 và bộ đề 4** của kho VPET đời trước. Kho ấy đã bị xoá ngày 08/10/2026 khi
nền tảng được dựng lại theo bản đặc tả của chủ dự án, nên **không còn câu hỏi
nào trong hệ thống khớp với lời đọc trong các tệp này**.

Giữ lại vì chúng vẫn trả lời đúng một câu hỏi, và câu ấy không phụ thuộc vào nội
dung: **giọng này nghe có dùng được cho một bài thi không.** Chất giọng, cách
đọc số, cách xử lý tên riêng, và khoảng lặng do `server/script-markup.js` đặt ra
— tất cả vẫn đúng như hôm nay engine dựng ra.

Những gì chúng **không** còn trả lời được: lời đọc có khớp đề hay không, nhịp có
vừa đồng hồ của part hay không. Hai thứ đó phải đo trên kho hiện tại:

```bash
node scripts/nghe-thu-nhip.mjs      # nhịp, chưa cần giọng
npm run soat-de                     # audio, nhịp, đồng hồ, theo từng part
```

Tên tệp đọc là `f<số bộ đề>-<mã câu>-<part>-<nhãn>`; `f1-E1-E-dictation.mp3` là
câu E1 của bộ đề 1. Mã câu theo cách đặt của kho cũ, không còn tồn tại.
