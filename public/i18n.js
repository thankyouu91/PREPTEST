/* =============================================================================
   Bilingual VI / EN for the whole platform.

   Vietnamese is the default. The HTML is authored in clean English (the project
   builds in English first), and this runtime swaps English → Vietnamese at load
   time by matching whole text nodes against a dictionary. Anything not in the
   dictionary stays English, so coverage can grow page by page without breaking
   what is already there.

   Why match text nodes instead of tagging every element with a key: the pages
   are plain HTML across ~30 files, much of it rendered by JS at runtime. A
   MutationObserver re-runs the swap on anything added after load, so dynamically
   built menus, modals and cards get translated too — without touching the code
   that renders them.

   Loaded early in <head> (like the theme boot) so the language and a no-flash
   guard are set before the body paints. CSP-safe: one same-origin script, no
   inline anything.
   ============================================================================= */
(function () {
  'use strict';
  var KEY = 'prep.lang';

  var lang = (function () {
    try {
      var p = new URLSearchParams(location.search).get('lang');
      if (p === 'en' || p === 'vi') { localStorage.setItem(KEY, p); return p; }
      var s = localStorage.getItem(KEY);
      if (s === 'en' || s === 'vi') return s;
    } catch (e) {}
    return 'vi';                      // Vietnamese by default
  })();

  document.documentElement.setAttribute('lang', lang);
  /* Hide the body until the swap has run, but ONLY when we are actually going to
     translate — otherwise an English reader would see a needless blank flash. The
     class is removed on DOMContentLoaded (always fires) and by a safety timeout,
     so a failure to translate can never leave the page hidden. */
  if (lang === 'vi') {
    document.documentElement.classList.add('i18n-hide');
    setTimeout(function () { document.documentElement.classList.remove('i18n-hide'); }, 1600);
  }

  /* English source phrase -> Vietnamese. Keys are the exact trimmed text. */
  var VI = {
    /* ---- Nav / chrome / shared ---- */
    'How it works': 'Cách hoạt động',
    'Pricing': 'Bảng giá',
    'Sign in': 'Đăng nhập',
    'Sign up': 'Đăng ký',
    'Start free': 'Bắt đầu miễn phí',
    'Continue studying': 'Tiếp tục học',
    'Platform': 'Nền tảng',
    'Support': 'Hỗ trợ',

    /* ---- Hero ---- */
    'Sit the real thing first,': 'Thi thử bản thật trước,',
    'walk in calm': 'vào phòng thi thảnh thơi',
    'Practice papers for the VPET exam — the real structure, marked automatically, with each skill scored on its own.':
      'Đề luyện thi VPET — đúng cấu trúc thật, chấm tự động, mỗi kỹ năng chấm điểm riêng.',
    'See the exam': 'Xem kỳ thi',
    'The real VPET format': 'Đúng định dạng VPET',
    'Marked automatically': 'Chấm tự động',
    'See the weak spot': 'Thấy rõ điểm yếu',
    'Unlocked': 'Đã mở',
    'ready': 'sẵn sàng',
    'Listening': 'Nghe',
    'Reading': 'Đọc',
    'Writing': 'Viết',
    'Speaking': 'Nói',
    'Suggested: more Writing practice': 'Gợi ý: luyện Viết thêm',
    'Practise now': 'Luyện ngay',
    'Paper submitted': 'Đã nộp bài',
    'Results come straight back': 'Có kết quả ngay',
    'Interface mock-up': 'Ảnh minh họa giao diện',

    /* ---- The exam section ---- */
    'The exam': 'Kỳ thi',
    'VPET has its own structure and scale. The practice papers follow the real format, so nothing on the day is a surprise.':
      'VPET có cấu trúc và thang điểm riêng. Đề luyện bám sát định dạng thật, nên ngày thi không có gì bất ngờ.',
    'See details': 'Xem chi tiết',
    '1 mock tests': '1 đề thi',
    'Vietnam Proficiency English Test': 'Kỳ thi Năng lực tiếng Anh Việt Nam',
    'Parts A-J, 55 items, AI scored speaking.': 'Phần A-J, 55 câu, chấm Nói bằng AI.',

    /* ---- Three steps ---- */
    'Three steps and you are practising': 'Ba bước là bắt đầu luyện',
    'No card needed to start. The account is free; you only pay for the practice you actually use.':
      'Không cần thẻ để bắt đầu. Tài khoản miễn phí; bạn chỉ trả cho phần luyện thực sự dùng.',
    'Create an account': 'Tạo tài khoản',
    'A minute with a school or personal email; verify it and you are in.':
      'Một phút với email trường hoặc cá nhân; xác thực là vào được.',
    'Buy or enter a code': 'Mua hoặc nhập mã',
    'A code opens the plan you chose. Got one from your school or class? Type it in and it unlocks.':
      'Mã mở gói bạn chọn. Được trường hay lớp cấp mã? Nhập vào là mở khóa.',
    'Practise like the real sitting': 'Luyện như thi thật',
    'The same clock, structure and scale. Hand it in and the per-skill breakdown is there.':
      'Cùng đồng hồ, cấu trúc và thang điểm. Nộp bài là có bảng phân tích từng kỹ năng.',

    /* ---- Why this one (bento) ---- */
    'Practise the weak spot, not everything at random': 'Luyện đúng điểm yếu, không luyện tràn lan',
    'Marked automatically, results right away': 'Chấm tự động, có kết quả ngay',
    'Hand it in and every part is scored, with a note on what went wrong. No waiting for a teacher, no guessing.':
      'Nộp bài là mọi phần được chấm, kèm ghi chú chỗ sai. Không chờ giáo viên, không đoán mò.',
    'Listening · Part 3': 'Nghe · Phần 3',
    '18/20 correct': '18/20 đúng',
    'All four skills scored separately': 'Chấm riêng cả bốn kỹ năng',
    'Listening, Reading, Writing and Speaking kept apart, so you can see which one is pulling the score down.':
      'Nghe, Đọc, Viết và Nói tách riêng, để bạn thấy kỹ năng nào kéo điểm xuống.',
    'Topics drawn from recent papers': 'Chủ đề lấy từ đề gần đây',
    'Topics written to match the most recent sittings of each certificate.':
      'Chủ đề viết bám sát các kỳ thi gần nhất.',
    'Aligned to CEFR A1-C2': 'Theo khung CEFR A1-C2',
    'Start at the level you are on and step the difficulty up as you go.':
      'Bắt đầu từ đúng trình độ và nâng dần độ khó.',
    'Practise anywhere, on any device': 'Luyện mọi nơi, trên mọi thiết bị',
    'Smooth on a phone or a laptop, with progress following your account.':
      'Mượt trên điện thoại hay laptop, tiến độ theo tài khoản.',

    /* ---- Pricing ---- */
    'Choose how long you practise, not which papers': 'Chọn thời lượng luyện, không phải chọn đề',
    'One code, one account. Pay once for the whole term - no monthly subscription, no hidden charges.':
      'Một mã, một tài khoản. Trả một lần cho cả kỳ - không thuê bao tháng, không phí ẩn.',
    'Most popular': 'Phổ biến nhất',
    'month': 'tháng',
    'months': 'tháng',
    'Ten full sittings, enough to see where you stand.': 'Mười lượt thi đầy đủ, đủ để biết bạn đang ở đâu.',
    'Practise without counting, and have something to study between sittings.':
      'Luyện không giới hạn, và có cái để học giữa các lượt thi.',
    'Six months, for a test date that is further off.': 'Sáu tháng, cho ngày thi còn xa.',
    '10 full VPET sittings': '10 lượt thi VPET đầy đủ',
    'Score and CEFR band after every sitting': 'Điểm và bậc CEFR sau mỗi lượt',
    'All ten parts A-J, exactly as the real paper': 'Đủ mười phần A-J, đúng như đề thật',
    'Practice stops after the tenth sitting': 'Dừng luyện sau lượt thứ mười',
    'Vocabulary and grammar area stays locked': 'Khu từ vựng và ngữ pháp vẫn khóa',
    'Score only, no per-part breakdown': 'Chỉ có điểm, không phân tích từng phần',
    'Unlimited VPET sittings': 'Thi VPET không giới hạn',
    'The whole self-study area: vocabulary, grammar, linking words, pronunciation':
      'Toàn bộ khu tự học: từ vựng, ngữ pháp, từ nối, phát âm',
    'Detailed per-part report with written feedback': 'Báo cáo chi tiết từng phần kèm nhận xét',
    'New papers the day they are published': 'Đề mới ngay khi phát hành',
    'The whole self-study area': 'Toàn bộ khu tự học',
    'Best value per month': 'Đáng giá nhất theo tháng',
    'Sign up for': 'Đăng ký gói',
    '799.000đ for 3 months of practice': '799.000đ cho 3 tháng luyện tập',
    'VNPay and MoMo payment open alongside the first paper release. An activation code binds permanently to the first account that uses it.':
      'Thanh toán VNPay và MoMo mở cùng đợt đề đầu tiên. Mã kích hoạt gắn vĩnh viễn với tài khoản đầu tiên dùng nó.',

    /* ---- Testimonials ---- */
    'Built around what students actually need': 'Xây quanh nhu cầu thật của học viên',
    'Illustrative quotes for the demo stage.': 'Trích dẫn minh họa cho giai đoạn demo.',
    '"I had only ever practised on paper, so the computer-based exam threw me. Sitting the real format first made all the difference."':
      '"Mình chỉ từng luyện trên giấy nên thi trên máy thấy lạ. Thi thử đúng định dạng trước tạo ra khác biệt lớn."',
    '"My Writing score was low and I had no idea why. The per-skill breakdown showed me exactly which part was weak."':
      '"Điểm Viết của mình thấp mà không hiểu vì sao. Bảng phân tích từng kỹ năng chỉ đúng phần yếu."',
    '"Our class got codes from the university. I typed mine in and the papers were there. Nothing to install."':
      '"Lớp mình được trường cấp mã. Nhập mã vào là có đề luôn. Không phải cài gì cả."',
    'Third year, Foreign Trade University': 'Năm ba, Đại học Ngoại thương',
    'Second year, HCMC University of Technology': 'Năm hai, Đại học Bách khoa TP.HCM',
    'First year, HUTECH': 'Năm nhất, HUTECH',
    'items per paper, parts A to J': 'câu mỗi đề, phần A đến J',
    'skills scored separately': 'kỹ năng chấm riêng',
    'from entering a code to practising': 'từ lúc nhập mã đến khi luyện',

    /* ---- Closing CTA ---- */
    'The exam date will not wait. Start today.': 'Ngày thi sẽ không chờ. Bắt đầu hôm nay.',
    'Create a free account, look through the library, and unlock when you are ready.':
      'Tạo tài khoản miễn phí, xem qua thư viện, và mở khóa khi bạn sẵn sàng.',

    /* ---- Footer ---- */
    'An independent mock-test platform for Vietnamese students. Not affiliated with any examination board.':
      'Nền tảng thi thử độc lập cho học viên Việt Nam. Không liên kết với hội đồng thi nào.',
    'How codes work': 'Mã hoạt động thế nào',
    'Terms (being written)': 'Điều khoản (đang soạn)',
    'Privacy (being written)': 'Bảo mật (đang soạn)',
    '© 2026 VPET Prep. For practice only, not an official examination.':
      '© 2026 VPET Prep. Chỉ để luyện tập, không phải kỳ thi chính thức.',

    /* =====================================================================
       KHU QUẢN TRỊ (admin)
       Chỉ dịch phần giao diện: menu, tiêu đề, nút, cột bảng, bộ lọc, hộp
       thoại. KHÔNG dịch dữ liệu (tên học viên, email, mã code, tên đề thi,
       nhật ký) — đó là nội dung, không phải chữ của giao diện.
       ===================================================================== */
    /* ---- Khung admin ---- */
    'Admin area': 'Khu quản trị',
    'Admin navigation': 'Điều hướng quản trị',
    'Navigation': 'Điều hướng',
    'Reports': 'Báo cáo',
    'Test System': 'Hệ thống đề thi',
    'Account Management': 'Quản lý tài khoản',
    'Codes': 'Mã kích hoạt',
    'Administration': 'Quản trị',
    'View as a student': 'Xem với vai học viên',
    'Dark mode': 'Chế độ tối',
    'Light mode': 'Chế độ sáng',
    'Toggle dark mode': 'Bật/tắt chế độ tối',
    'Your profile': 'Hồ sơ của bạn',
    'Display name': 'Tên hiển thị',
    'Save': 'Lưu',
    'Change password': 'Đổi mật khẩu',
    'Sign out': 'Đăng xuất',
    'Owner': 'Chủ sở hữu',
    'Editor': 'Biên tập',
    'Viewing as a student': 'Đang xem với vai học viên',
    'Back to admin': 'Về trang quản trị',
    'Current password': 'Mật khẩu hiện tại',
    'New password': 'Mật khẩu mới',
    'At least 10 characters, with both letters and digits.': 'Tối thiểu 10 ký tự, có cả chữ và số.',
    'Update password': 'Cập nhật mật khẩu',
    'Cancel': 'Hủy',
    'Close': 'Đóng',
    'Confirm': 'Xác nhận',
    'Try again': 'Thử lại',
    'The data could not be loaded': 'Không tải được dữ liệu',

    /* ---- Báo cáo ---- */
    'Overview': 'Tổng quan',
    'What needs doing, growth, the student funnel and the content':
      'Việc cần làm, tăng trưởng, phễu học viên và nội dung',
    'Period': 'Kỳ',
    '7 days': '7 ngày',
    '30 days': '30 ngày',
    '90 days': '90 ngày',
    'Choose the reporting period': 'Chọn kỳ báo cáo',
    'Choose a metric': 'Chọn chỉ số',
    'Daily activity chart': 'Biểu đồ hoạt động theo ngày',
    'New students': 'Học viên mới',
    'Codes activated': 'Mã đã kích hoạt',
    'Content': 'Nội dung',
    'What needs doing': 'Việc cần làm',
    'Worth doing': 'Nên làm',
    'Tidy-up': 'Dọn dẹp',
    'Top up': 'Bổ sung',
    'View students': 'Xem học viên',
    'Student funnel': 'Phễu học viên',
    'Percentages are of everyone who registered': 'Tỷ lệ tính trên tổng số đã đăng ký',
    'Registered': 'Đã đăng ký',
    'Email verified': 'Đã xác thực email',
    'Code activated': 'Đã kích hoạt mã',
    'Still studying within 30 days': 'Còn học trong 30 ngày',
    'Revenue by plan': 'Doanh thu theo gói',
    'Edit prices': 'Sửa giá',
    'Supply and demand by exam': 'Cung và cầu theo kỳ thi',
    'Exam': 'Kỳ thi',
    'Published': 'Đã xuất bản',
    'Questions': 'Câu hỏi',
    'Codes used': 'Mã đã dùng',
    'Following': 'Đang theo dõi',
    'Recent actions': 'Hoạt động gần đây',
    'Audit log': 'Nhật ký',

    /* ---- Đề thi / ngân hàng ---- */
    'Tests': 'Đề thi',
    'Create one by hand, or generate it from the question bank':
      'Tạo thủ công, hoặc sinh tự động từ ngân hàng câu hỏi',
    'Generate a test': 'Sinh đề',
    'New test': 'Đề mới',
    'Formats': 'Định dạng',
    'Question Bank': 'Ngân hàng câu hỏi',
    'Test System sections': 'Các mục Hệ thống đề thi',
    'All': 'Tất cả',
    'Draft': 'Nháp',
    'Archived': 'Lưu trữ',
    'Search tests': 'Tìm đề thi',
    'Search by test name…': 'Tìm theo tên đề…',
    'Test': 'Đề thi',
    'Structure': 'Cấu trúc',
    'Updated': 'Cập nhật',
    'Status': 'Trạng thái',
    'Actions': 'Thao tác',
    'Open': 'Mở',
    'Level': 'Trình độ',
    'Details': 'Chi tiết',
    'Generate': 'Sinh đề',
    'Standard paper formats': 'Định dạng đề chuẩn',
    'Notes on the exam': 'Ghi chú về kỳ thi',
    'Whole paper': 'Cả đề',

    /* ---- Quản lý tài khoản ---- */
    'Create accounts one at a time or in bulk, and manage each one':
      'Tạo tài khoản lẻ hoặc hàng loạt, và quản lý từng tài khoản',
    'Verified': 'Đã xác thực',
    'Not verified': 'Chưa xác thực',
    'Locked': 'Đã khóa',
    'Search students': 'Tìm học viên',
    'Search by name or email…': 'Tìm theo tên hoặc email…',
    'Bulk create': 'Tạo hàng loạt',
    'New student': 'Học viên mới',
    'Student': 'Học viên',
    'Spent': 'Đã chi',
    'Phone number': 'Số điện thoại',
    'Internal note': 'Ghi chú nội bộ',
    'Save changes': 'Lưu thay đổi',
    'Mark as verified': 'Đánh dấu đã xác thực',
    'Lock the account': 'Khóa tài khoản',
    'Unlock the account': 'Mở khóa tài khoản',
    'Reset the password': 'Đặt lại mật khẩu',
    'Issue a code': 'Cấp mã',
    'Give this account a term': 'Cấp thời hạn cho tài khoản này',
    'Activated codes': 'Mã đã kích hoạt',
    'Orders': 'Đơn hàng',
    'No orders.': 'Chưa có đơn hàng.',

    /* ---- Mã kích hoạt ---- */
    'Issue a batch for a class, or bind one code to a single account':
      'Cấp một lô cho lớp, hoặc gắn một mã cho một tài khoản',
    'Export CSV': 'Xuất CSV',
    'Issue codes': 'Cấp mã',
    'Code batches': 'Lô mã',
    'Codes issued together for one class or one intake':
      'Các mã cấp cùng lúc cho một lớp hoặc một đợt',
    'Used': 'Đã dùng',
    'View codes': 'Xem mã',
    'Unused': 'Chưa dùng',
    'Activated': 'Đã kích hoạt',
    'Revoked': 'Đã thu hồi',
    'Reserved': 'Đã giữ chỗ',
    'Expired': 'Hết hạn',
    'Search codes': 'Tìm mã',
    'Search by code…': 'Tìm theo mã…',
    'Unlocks': 'Mở khóa',
    'Expires': 'Hết hạn',
    'Copy the code': 'Sao chép mã',
    'Revoke the code': 'Thu hồi mã',
    'Download this batch as CSV': 'Tải lô này dạng CSV',
    'Issue unlock codes': 'Cấp mã mở khóa',
    'Plan': 'Gói',
    'What it unlocks': 'Mã mở khóa gì',
    'A whole exam': 'Cả một kỳ thi',
    'One specific test': 'Một đề cụ thể',
    'Several exams (combo)': 'Nhiều kỳ thi (combo)',
    'Issue to': 'Cấp cho',
    'A batch — many codes': 'Một lô — nhiều mã',
    'One account — bound to a student': 'Một tài khoản — gắn cho một học viên',
    'How many codes': 'Số lượng mã',
    'Find the account': 'Tìm tài khoản',
    'When': 'Khi nào',
    'Activation deadline': 'Hạn kích hoạt',
    'Change': 'Đổi',

    /* ---- Quản trị / cấu hình ---- */
    'Platform configuration, the plans on sale, and the audit log':
      'Cấu hình nền tảng, các gói đang bán, và nhật ký',
    'Plans': 'Các gói',
    'Admin account': 'Tài khoản quản trị',
    'Branding': 'Thương hiệu',
    'Shown at the top of the sidebar and on the landing page.':
      'Hiển thị ở đầu thanh bên và trên trang chủ.',
    'Tenant palette': 'Bảng màu thương hiệu',
    'Platform-wide notice': 'Thông báo toàn nền tảng',
    'A short line for students, a maintenance window for instance.':
      'Một dòng ngắn cho học viên, ví dụ lịch bảo trì.',
    'Configuration saved.': 'Đã lưu cấu hình.',
    'Save configuration': 'Lưu cấu hình',
    'Exams': 'Các kỳ thi',
    'The fixed catalogue of the platform.': 'Danh mục cố định của nền tảng.'
  };

  function tr(s) {
    if (lang !== 'vi') return s;
    var raw = String(s == null ? '' : s);
    var key = raw.trim();
    if (!key) return raw;
    var vi = VI[key];
    if (vi == null || vi === key) return raw;
    return raw.replace(key, vi);      // keep any surrounding whitespace
  }

  function trTextNode(n) {
    var out = tr(n.nodeValue);
    if (out !== n.nodeValue) n.nodeValue = out;
  }

  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function trAttrs(el) {
    if (!el.getAttribute) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (el.hasAttribute(a)) {
        var v = el.getAttribute(a), key = v.trim();
        if (VI[key]) el.setAttribute(a, VI[key]);
      }
    }
  }

  function walk(root) {
    if (lang !== 'vi' || !root) return;
    if (root.nodeType === 3) { trTextNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode, nm = p && p.nodeName;
        if (nm === 'SCRIPT' || nm === 'STYLE' || nm === 'NOSCRIPT' || nm === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = tw.nextNode())) nodes.push(n);
    nodes.forEach(trTextNode);
    if (root.nodeType === 1) trAttrs(root);
    if (root.querySelectorAll) {
      Array.prototype.forEach.call(root.querySelectorAll('[placeholder],[title],[aria-label]'), trAttrs);
    }
  }

  function observe() {
    if (lang !== 'vi' || !window.MutationObserver) return;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) walk(added[j]);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* Delegated, so a switch that is injected later — the admin chrome builds its
     sidebar from JS after this file has run — still works, in both languages.
     markToggles() only paints which side is current; the click is handled once
     on the document. */
  function markToggles(root) {
    var btns = (root || document).querySelectorAll('[data-lang]');
    Array.prototype.forEach.call(btns, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }

  function wireToggle() {
    markToggles();
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest && e.target.closest('[data-lang]');
      if (b) setLang(b.getAttribute('data-lang'));
    });
    /* Keep the marking right for switches added after load, whatever the language. */
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (n.nodeType === 1 && (n.matches && n.matches('[data-lang]') || n.querySelector && n.querySelector('[data-lang]'))) markToggles(n.parentNode || document);
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function setLang(l) {
    if (l !== 'en' && l !== 'vi' || l === lang) { if (l === lang) return; }
    try { localStorage.setItem(KEY, l); } catch (e) {}
    var u = new URL(location.href);
    u.searchParams.delete('lang');
    location.href = u.toString();     // reload cleanly in the chosen language
  }

  function boot() {
    walk(document.body);
    wireToggle();
    document.documentElement.classList.remove('i18n-hide');
    observe();
  }

  window.PREP_I18N = { lang: lang, t: tr, setLang: setLang, dict: VI };
  window.PREP_T = tr;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
