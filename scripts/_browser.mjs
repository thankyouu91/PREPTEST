/**
 * Mở Chromium theo cách chạy được ở cả hai nơi: máy phát triển này và CI.
 *
 * Máy ở đây có sẵn một bản Chromium tại `/opt/pw-browsers/chromium`, nên các
 * script vẫn trỏ thẳng đường dẫn ấy. Trên CI thì không có: ở đó
 * `playwright-core install chromium` tự tải bản của nó về `~/.cache/ms-playwright`
 * với tên thư mục kèm số hiệu bản dựng. Ép `executablePath` vào một đường dẫn
 * không tồn tại thì hỏng ngay ở `launch()`, mà thông báo lỗi lại không hề gợi ý
 * rằng vấn đề nằm ở đường dẫn gắn cứng.
 *
 * Thứ tự: biến `CHROMIUM` nếu có → đường dẫn quen nếu nó thật sự tồn tại →
 * không đặt gì, để Playwright tự tìm bản nó vừa cài.
 */
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const LOCAL = '/opt/pw-browsers/chromium';

/** Đường dẫn Chromium nên dùng, hoặc null nếu để Playwright tự quyết. */
export function chromiumPath() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  return existsSync(LOCAL) ? LOCAL : null;
}

/** launchOptions kèm executablePath khi — và chỉ khi — biết chắc nó tồn tại. */
export function launchOptions(extra) {
  const exec = chromiumPath();
  return Object.assign({}, extra || {}, exec ? { executablePath: exec } : {});
}

/** chromium.launch() đã điền sẵn đường dẫn đúng cho môi trường đang chạy. */
export function launchChromium(extra) {
  return chromium.launch(launchOptions(extra));
}
