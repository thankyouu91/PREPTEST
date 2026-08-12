/**
 * Đọc thẳng stack của Express để dựng bảng: endpoint → guard → giới hạn ghi.
 *
 * Lý do đọc stack thay vì đọc mã nguồn: chỉ có stack mới biết cái gì THỰC SỰ
 * chạy. `router.use('/admin', requireAdmin, csrfGuard)` bọc mọi route đăng ký
 * SAU nó và không bọc ba route đăng ký trước — đọc bằng mắt rất dễ kết luận
 * ngược, còn thứ tự trong stack thì không nói dối được.
 *
 * Bảng này là đầu vào của `scripts/test-security.mjs` và của docs/SECURITY.md.
 */
import { createRequire } from 'node:module';

const SAFE = ['get', 'head', 'options'];

/* Ghi vào một cơ sở dữ liệu tạm: nạp các router là nạp cả server/db.js, và bài
   kiểm tra không được đụng vào data/. Người gọi có thể đặt trước PREP_DB. */
export function loadRouters(require_) {
  return [
    { mount: '', file: 'server/google-auth.js', router: require_('../server/google-auth.js').router },
    { mount: '/api', file: 'server/user-api.js', router: require_('../server/user-api.js') },
    { mount: '/api', file: 'server/exam-api.js', router: require_('../server/exam-api.js') },
    { mount: '/api', file: 'server/api.js', router: require_('../server/api.js') }
  ];
}

/* Express biến path prefix của router.use() thành regexp. Lấy lại chuỗi gốc để
   so khớp với đường dẫn route, vì bảng cần đọc được bằng mắt. */
function prefixOf(layer) {
  const src = String(layer.regexp);
  if (src === '/^\\/?(?=\\/|$)/i') return '/';
  const m = src.match(/^\/\^((?:\\\/[A-Za-z0-9_.-]+)+)/);
  return m ? m[1].replace(/\\\//g, '/') : null;
}

const GUARDS = new Set(['requireAdmin', 'requireUser', 'requireOwner', 'csrfGuard']);

/** Mọi route của mọi router, kèm guard thật sự chạy trước nó. */
export function routeTable(require_ = createRequire(import.meta.url)) {
  const rows = [];

  for (const { mount, file, router } of loadRouters(require_)) {
    /* Guard gắn bằng router.use() tích luỹ theo thứ tự đăng ký, nên duyệt stack
       một lượt từ đầu và mang theo những gì đã bọc. */
    const inherited = [];

    for (const layer of router.stack) {
      if (!layer.route) {
        const name = layer.handle && layer.handle.name;
        if (GUARDS.has(name)) {
          const prefix = prefixOf(layer);
          if (prefix) inherited.push({ prefix, name });
        }
        continue;
      }

      const path = layer.route.path;
      const full = (mount + path) || '/';
      const own = layer.route.stack.map(s => (s.handle && s.handle.name) || '').filter(n => GUARDS.has(n));
      const from = inherited
        .filter(g => g.prefix === '/' || path === g.prefix || path.startsWith(g.prefix + '/'))
        .map(g => g.name);
      const guards = [...new Set([...from, ...own])];

      for (const method of Object.keys(layer.route.methods)) {
        rows.push({
          method: method.toUpperCase(),
          path: full,
          file,
          guards,
          /* Giới hạn ghi toàn cục nằm ở server.js, trước mọi router, nên nó phủ
             đúng những phương thức không an toàn — không phải thứ đọc ra được
             từ stack của router, mà là hệ quả của chỗ nó được gắn. */
          writeLimited: !SAFE.includes(method),
          mutating: !SAFE.includes(method)
        });
      }
    }
  }

  rows.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return rows;
}

/* Năm endpoint ghi mà không thể có guard đăng nhập: chúng tồn tại để người chưa
   đăng nhập dùng. Mỗi cái phải nêu được cái gì thay thế, nếu không thì danh
   sách này chỉ là chỗ giấu lỗi. */
export const PUBLIC_WRITES = {
  'POST /api/auth/register': 'Khoá theo IP, REGISTER_PER_HOUR, chỉ trừ lượt khi đăng ký thành công',
  'POST /api/auth/login': 'Khoá 15 phút sau 5 lần sai, theo IP × tên đăng nhập',
  'POST /api/admin/login': 'Khoá 15 phút sau 5 lần sai, theo IP × tên đăng nhập',
  'POST /api/auth/forgot': 'Giới hạn 5 lần/giờ theo IP; trả lời như nhau dù email có tồn tại hay không',
  'POST /api/auth/reset': 'Token dùng một lần, băm trong CSDL, hết hạn sau 2 giờ',
  'POST /api/auth/verify': 'Token dùng một lần, băm trong CSDL, hết hạn sau 48 giờ',
  'POST /api/auth/logout': 'Có csrfGuard; đăng xuất khi chưa đăng nhập là vô hại',
  'POST /api/admin/logout': 'Có csrfGuard; đăng xuất khi chưa đăng nhập là vô hại'
};

/** Bảng markdown cho docs/SECURITY.md — sinh ra chứ không gõ tay. */
export function markdownTable(rows) {
  const cell = s => String(s).replace(/\|/g, '\\|');
  const out = ['| Method | Endpoint | Guards | Write limit |', '|---|---|---|---|'];
  for (const r of rows) {
    out.push('| ' + [
      cell(r.method),
      '`' + cell(r.path) + '`',
      r.guards.length ? r.guards.map(g => '`' + g + '`').join(' + ') : '—',
      r.writeLimited ? 'yes' : 'n/a (read)'
    ].join(' | ') + ' |');
  }
  return out.join('\n');
}
