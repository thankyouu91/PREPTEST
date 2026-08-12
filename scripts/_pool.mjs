/**
 * Chạy một danh sách việc qua N luồng song song, trả kết quả ĐÚNG THỨ TỰ đầu vào.
 *
 * Bước audit và bước chụp ảnh chiếm phần lớn thời gian của `npm run verify`, mà
 * từng lượt tải trang trong đó hoàn toàn độc lập: mỗi lượt một BrowserContext
 * riêng, không dùng chung state nào. Chạy tuần tự chỉ vì vòng lặp viết ra thế.
 *
 * Giữ đúng thứ tự kết quả là chủ ý: chạy song song thì thứ tự HOÀN THÀNH ngẫu
 * nhiên, và một bản báo cáo đổi thứ tự sau mỗi lần chạy thì không diff được với
 * lần trước. Người gọi thu kết quả rồi in một lượt, thay vì in ngay trong luồng.
 */

import { availableParallelism } from 'node:os';

/* Số luồng mặc định đi theo máy, không gắn cứng: máy CI hai lõi mà mở bốn
   context Chromium thì tranh CPU đến mức chậm hơn chạy tuần tự, và chính phép đo
   layout của bước audit bắt đầu nhiễu. Chặn trên ở 4 vì quá số đó thì cái nghẽn
   chuyển sang bộ nhớ chứ không còn là CPU. Đặt PW_JOBS để ép một con số khác. */

const cores = typeof availableParallelism === 'function' ? availableParallelism() : 4;
export const JOBS = Math.max(1, parseInt(process.env.PW_JOBS, 10) || Math.min(4, cores));

/**
 * @param {Array} items   danh sách việc
 * @param {number} limit  số luồng chạy cùng lúc
 * @param {Function} worker  (item, index) => Promise<any>
 * @returns {Promise<Array>} kết quả theo đúng thứ tự của items
 */
export async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  const runner = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, runner));
  return out;
}
