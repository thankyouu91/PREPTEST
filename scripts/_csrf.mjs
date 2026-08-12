/**
 * Gửi một request ghi qua APIRequestContext của Playwright, kèm token CSRF.
 *
 * Từ 2026-08-12 mọi route ghi đều đi qua csrfGuard, kể cả đăng nhập và đăng ký.
 * Trình duyệt thật không phải làm gì thêm: nó mở trang trước, máy chủ cấp cookie
 * `prep_csrf` trong response ấy, rồi mã trên trang đọc cookie và gắn header. Một
 * script gọi thẳng `ctx.request.post()` thì bỏ qua bước "mở trang", nên không có
 * cookie và nhận 403 — đúng như audit và bước chụp ảnh đã dính.
 *
 * Hàm này làm lại đúng thứ tự đó: chưa có cookie thì xin một trang không có
 * guard chuyển hướng, rồi mới gửi. Cookie nằm trong jar của chính context nên
 * phiên đăng nhập sau đó vẫn thuộc về context ấy.
 */

/** Trang dùng để xin cookie: công khai và không chuyển hướng dù đã đăng nhập. */
const WARM_PATH = '/prep/landing/';

async function csrfToken(ctx, base) {
  const read = async () => (await ctx.cookies(base)).find(c => c.name === 'prep_csrf');
  let hit = await read();
  if (!hit) {
    await ctx.request.get(base + WARM_PATH);
    hit = await read();
  }
  return hit ? hit.value : '';
}

/** POST kèm X-CSRF-Token, trả về APIResponse như ctx.request.post(). */
export async function postWithCsrf(ctx, base, path, data) {
  const token = await csrfToken(ctx, base);
  return ctx.request.post(base + path, { data, headers: { 'X-CSRF-Token': token } });
}
