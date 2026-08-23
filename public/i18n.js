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
   built menus, modals and cards get translated too - without touching the code
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
     translate - otherwise an English reader would see a needless blank flash. The
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
    'Practise': 'Luyện thi',
    'Pricing': 'Bảng giá',
    'Sign in': 'Đăng nhập',
    'Sign up': 'Đăng ký',
    'Start free': 'Bắt đầu miễn phí',
    'Continue studying': 'Tiếp tục học',
    'Platform': 'Nền tảng',
    'Support': 'Hỗ trợ',

    /* ---- Hero ---- */
    'Sit the real thing first,': 'Luyện tập trên nền tảng giả lập chuẩn,',
    'walk in calm': 'tự tin thi thật',
    'Practice papers for the VPET exam - the real structure, marked automatically, with each skill scored on its own.':
      'Đề luyện VPET bám sát cấu trúc đề thật, chấm tự động, có điểm riêng cho từng kỹ năng.',
    'The real VPET format': 'Đúng cấu trúc VPET',
    'Marked automatically': 'Chấm điểm tự động',
    'See the weak spot': 'Biết ngay mình yếu ở đâu',
    'Unlocked': 'Đã mở',
    'ready': 'sẵn sàng',
    'Listening': 'Nghe',
    'Reading': 'Đọc',
    'Writing': 'Viết',
    'Speaking': 'Nói',
    'Suggested: more Writing practice': 'Gợi ý: luyện thêm kỹ năng Viết',
    'Practise now': 'Luyện ngay',
    'Paper submitted': 'Đã nộp bài',
    'Results come straight back': 'Có kết quả ngay lập tức',
    'Interface mock-up': 'Ảnh minh họa giao diện',

    /* ---- The exam section ---- */

    /* ---- Bộ tài liệu (PDF) ----
       Ruột hai bản PDF vốn đã là tiếng Việt cho cả hai ngôn ngữ giao diện: đó là
       học liệu cho người học Việt Nam, không phải chữ của giao diện. Ở đây chỉ
       dịch phần vỏ quanh nó. */
    'Study pack': 'Tài liệu',
    'The study pack': 'Bộ tài liệu luyện thi',
    'Everything the exam asks of you, part by part, in Vietnamese. Two packs, one for each VPET level. Read them right here, or take the PDF. No account needed.':
      'Toàn bộ những gì kỳ thi yêu cầu, đi từng phần một, bằng tiếng Việt. Hai bộ cho hai cấp độ VPET. Đọc ngay tại đây, hoặc tải bản PDF về. Không cần tài khoản.',
    'For a learner from beginner to intermediate, proving everyday working English.':
      'Dành cho người từ mới bắt đầu đến trung cấp, cần chứng minh tiếng Anh công việc hằng ngày.',
    'For a learner already past B1, aiming at a professional or international role.':
      'Dành cho người đã qua mức B1, nhắm tới vị trí chuyên môn hoặc môi trường quốc tế.',
    'Open the Level 1 pack': 'Mở bộ Level 1',
    'Open the Level 2 pack': 'Mở bộ Level 2',
    'Download as PDF': 'Tải bản PDF',
    'Read it here, or take the PDF · tiếng Việt': 'Đọc tại chỗ, hoặc tải PDF · tiếng Việt',
    'VPET is published by Pearson. These packs are written for this platform and reproduce no part of a real exam.':
      'VPET do Pearson phát hành. Hai bộ tài liệu này do nền tảng tự biên soạn, không sao chép bất kỳ phần nào của đề thi thật.',
    'VPET has its own structure and scale. The practice papers follow the real format, so nothing on the day is a surprise.':
      'VPET có cấu trúc và thang điểm riêng. Đề luyện bám sát đề thật, nên vào phòng thi bạn không gặp bất ngờ nào.',
    'See details': 'Xem chi tiết',
    '1 mock tests': '1 đề thi',
    'Versant Professional English Test': 'Bài thi tiếng Anh chuyên nghiệp Versant',
    'Parts A-J, 58 items, AI scored speaking.': 'Gồm 10 phần A-J, 58 câu, phần Nói chấm bằng AI.',

    /* ---- Three steps ---- */
    'Three steps and you are practising': 'Ba bước là vào luyện được ngay',
    'No card needed to start. The account is free; you only pay for the practice you actually use.':
      'Không cần thẻ ngân hàng. Tài khoản miễn phí, bạn chỉ trả tiền cho phần mình thực sự luyện.',
    'Create an account': 'Tạo tài khoản',
    'A minute with a school or personal email; verify it and you are in.':
      'Chỉ một phút với email trường hoặc email cá nhân, xác thực xong là dùng được.',
    'Buy or enter a code': 'Mua mã hoặc nhập mã có sẵn',
    'A code opens the plan you chose. Got one from your school or class? Type it in and it unlocks.':
      'Mã sẽ mở gói bạn chọn. Được trường hoặc lớp phát mã? Nhập vào là mở khóa ngay.',
    'Practise like the real sitting': 'Luyện đúng như thi thật',
    'The same clock, structure and scale. Hand it in and the per-skill breakdown is there.':
      'Cùng thời gian, cấu trúc và thang điểm. Nộp bài xong là có ngay bảng phân tích từng kỹ năng.',

    /* ---- Why this one (bento) ---- */
    'Practise the weak spot, not everything at random': 'Luyện đúng chỗ còn yếu, không luyện dàn trải',
    'Marked automatically, results right away': 'Chấm tự động, trả kết quả ngay',
    'Hand it in and every part is scored, with a note on what went wrong. No waiting for a teacher, no guessing.':
      'Nộp bài là từng phần được chấm, kèm ghi chú chỗ sai. Không phải chờ giáo viên, không phải đoán.',
    'Listening · Part 3': 'Nghe · Phần 3',
    '18/20 correct': '18/20 đúng',
    'All four skills scored separately': 'Bốn kỹ năng chấm điểm riêng',
    'Listening, Reading, Writing and Speaking kept apart, so you can see which one is pulling the score down.':
      'Nghe, Đọc, Viết, Nói được tách riêng để bạn biết kỹ năng nào đang kéo điểm xuống.',
    'Topics drawn from recent papers': 'Chủ đề lấy từ các kỳ thi gần đây',
    'Topics written to match the most recent sittings of each certificate.':
      'Nội dung biên soạn bám sát các kỳ thi gần nhất.',
    'Aligned to CEFR A1-C2': 'Chuẩn khung CEFR A1-C2',
    'Start at the level you are on and step the difficulty up as you go.':
      'Bắt đầu từ đúng trình độ hiện tại rồi nâng dần độ khó.',
    'Practise anywhere, on any device': 'Luyện mọi lúc, trên mọi thiết bị',
    'Smooth on a phone or a laptop, with progress following your account.':
      'Chạy mượt trên điện thoại lẫn máy tính, tiến độ luôn đi theo tài khoản.',

    /* ---- Pricing ---- */
    'Choose how long you practise, not which papers': 'Chọn thời gian luyện, không phải chọn đề',
    'One code, one account. Pay once for the whole term - no monthly subscription, no hidden charges.':
      'Một mã dùng cho một tài khoản. Trả một lần cho trọn kỳ hạn, không thuê bao tháng, không phí ẩn.',
    'Most popular': 'Phổ biến nhất',
    'month': 'tháng',
    'months': 'tháng',
    'Ten full sittings, enough to see where you stand.': 'Mười lượt thi đầy đủ, đủ để biết mình đang ở đâu.',
    'Practise without counting, and have something to study between sittings.':
      'Luyện không giới hạn, lại có tài liệu để học giữa các lượt thi.',
    'Six months, for a test date that is further off.': 'Sáu tháng, dành cho ngày thi còn xa.',
    '10 full VPET sittings': '10 lượt thi VPET đầy đủ',
    'Score and CEFR band after every sitting': 'Có điểm và bậc CEFR sau mỗi lượt thi',
    'All ten parts A-J, exactly as the real paper': 'Đủ mười phần A-J, giống hệt đề thật',
    'Practice stops after the tenth sitting': 'Hết lượt thứ mười là dừng',
    'Vocabulary and grammar area stays locked': 'Chưa mở khu từ vựng và ngữ pháp',
    'Score only, no per-part breakdown': 'Chỉ có điểm, không phân tích từng phần',
    'Unlimited VPET sittings': 'Thi VPET không giới hạn',
    'The whole self-study area: vocabulary, grammar, linking words, pronunciation':
      'Toàn bộ khu tự học: từ vựng, ngữ pháp, từ nối, phát âm',
    'Detailed per-part report with written feedback': 'Báo cáo chi tiết từng phần kèm nhận xét',
    'New papers the day they are published': 'Đề mới ngay khi phát hành',
    'The whole self-study area': 'Toàn bộ khu tự học',
    'Best value per month': 'Tính theo tháng là rẻ nhất',
    'Sign up for': 'Đăng ký gói',
    '799.000đ for 3 months of practice': '799.000đ cho 3 tháng luyện tập',
    'VNPay and MoMo payment open alongside the first paper release. An activation code binds permanently to the first account that uses it.':
      'Thanh toán VNPay và MoMo sẽ mở cùng đợt đề đầu tiên. Mã kích hoạt gắn vĩnh viễn với tài khoản dùng nó đầu tiên.',

    /* ---- Testimonials ---- */
    'Built around what students actually need': 'Làm theo đúng nhu cầu của người học',
    'Illustrative quotes for the demo stage.': 'Trích dẫn minh họa cho giai đoạn demo.',
    '"I had only ever practised on paper, so the computer-based exam threw me. Sitting the real format first made all the difference."':
      '"Mình chỉ quen luyện trên giấy nên vào thi máy thấy bỡ ngỡ. Được thi thử đúng cấu trúc trước khác hẳn."',
    '"My Writing score was low and I had no idea why. The per-skill breakdown showed me exactly which part was weak."':
      '"Điểm Viết của mình thấp mà không hiểu vì sao. Bảng phân tích từng kỹ năng chỉ ra đúng chỗ mình yếu."',
    '"Our class got codes from the university. I typed mine in and the papers were there. Nothing to install."':
      '"Lớp mình được trường phát mã. Nhập mã vào là có đề ngay, không phải cài đặt gì."',
    'Third year, Foreign Trade University': 'Năm ba, Đại học Ngoại thương',
    'Second year, HCMC University of Technology': 'Năm hai, Đại học Bách khoa TP.HCM',
    'First year, HUTECH': 'Năm nhất, HUTECH',
    'items per paper, parts A to J': 'câu mỗi đề, phần A đến J',
    'skills scored separately': 'kỹ năng chấm riêng',
    'from entering a code to practising': 'từ lúc nhập mã đến khi luyện',

    /* ---- Closing CTA ---- */
    'The exam date will not wait. Start today.': 'Ngày thi không chờ ai. Bắt đầu từ hôm nay.',
    'Create a free account, look through the library, and unlock when you are ready.':
      'Tạo tài khoản miễn phí, xem trước thư viện đề, và mở khóa khi bạn thấy sẵn sàng.',

    /* ---- Footer ---- */
    'An independent mock-test platform for Vietnamese students. Not affiliated with any examination board.':
      'Nền tảng luyện thi thử độc lập dành cho người học Việt Nam, không trực thuộc hội đồng thi nào.',
    'How codes work': 'Mã dùng thế nào',
    'Terms (being written)': 'Điều khoản (đang soạn)',
    'Privacy (being written)': 'Bảo mật (đang soạn)',
    '© 2026 VPET Prep. For practice only, not an official examination.':
      '© 2026 VPET Prep. Chỉ để luyện tập, không phải kỳ thi chính thức.',

    /* =====================================================================
       KHU QUẢN TRỊ (admin)
       Chỉ dịch phần giao diện: menu, tiêu đề, nút, cột bảng, bộ lọc, hộp
       thoại. KHÔNG dịch dữ liệu (tên học viên, email, mã code, tên đề thi,
       nhật ký) - đó là nội dung, không phải chữ của giao diện.
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
    'A batch - many codes': 'Một lô - nhiều mã',
    'One account - bound to a student': 'Một tài khoản - gắn cho một học viên',
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
    'The fixed catalogue of the platform.': 'Danh mục cố định của nền tảng.',

    /* ================= KHU HỌC VIÊN =================
       Lưu ý: khu tự học (learn/) DẠY tiếng Anh, nên ví dụ ngữ pháp, bậc CEFR và
       các từ mẫu giữ nguyên tiếng Anh - chỉ dịch phần vỏ giao diện quanh chúng. */

    /* ---- Khung chung (sidebar + thanh trên) ---- */
    'Home': 'Trang chủ',
    'Library': 'Thư viện',
    'Self-study': 'Tự học',
    'My codes': 'Mã của tôi',
    'Progress': 'Tiến độ',
    'Profile': 'Hồ sơ',
    /* 'Student' is already above, in the admin block - one entry serves both. */
    'Enter code': 'Nhập mã',
    'Enter a code': 'Nhập mã',
    'Enter an unlock code': 'Nhập mã mở khóa',
    'Self-study opens from the Plus plan': 'Khu tự học mở từ gói Plus',
    'Page title': 'Tiêu đề trang',
    'Back to the home page': 'Về trang chủ',
    'Back to home': 'Về trang chủ',
    'See all': 'Xem tất cả',
    'Manage': 'Quản lý',
    'Got it': 'Đã hiểu',

    /* ---- Bảng điều khiển học viên ---- */
    'Hello,': 'Xin chào,',
    'Your tests': 'Bài thi của bạn',
    'Your progress': 'Tiến độ của bạn',
    "Today's focus": 'Ưu tiên hôm nay',
    'Next steps': 'Bước tiếp theo',
    'Recent activity': 'Hoạt động gần đây',
    'Practice results': 'Kết quả luyện tập',
    'Active codes': 'Mã đang hiệu lực',
    'tests unlocked': 'bài thi đã mở',
    'Skills with practice available': 'Kỹ năng có bài luyện',
    'Explore by exam': 'Khám phá theo kỳ thi',
    'Browse the library': 'Xem thư viện',
    'Buy more codes': 'Mua thêm mã',
    'Need more practice?': 'Cần luyện thêm?',
    'No sittings yet': 'Chưa có lượt thi nào',
    'You have not unlocked any tests yet': 'Bạn chưa mở khóa bài thi nào',
    'Unlock a test to start tracking how your practice is going.':
      'Mở khóa một bài thi để bắt đầu theo dõi tiến độ luyện tập.',
    'Enter a code you already have to unlock one now, or browse the library and pick a test that matches the exam you are aiming at.':
      'Nhập mã bạn đang có để mở khóa ngay, hoặc xem thư viện và chọn bài thi khớp với kỳ thi bạn nhắm tới.',
    'Part-by-part marks and the four-skill breakdown appear here after your first hand-in. The papers are still being written; we will tell you when one opens.':
      'Điểm từng phần và bảng phân tích bốn kỹ năng sẽ hiện ở đây sau lần nộp bài đầu tiên. Đề vẫn đang được soạn; chúng tôi sẽ báo khi có đề mở.',
    'Verify your email to protect your account': 'Xác thực email để bảo vệ tài khoản',
    'Open the email and follow the verification link, or have it sent again.':
      'Mở email và bấm liên kết xác thực, hoặc yêu cầu gửi lại.',

    /* ---- Đăng nhập / đăng ký / mật khẩu ---- */
    'Welcome back': 'Chào bạn trở lại',
    'Sign in to pick up where you left off.': 'Đăng nhập để tiếp tục từ chỗ đang dở.',
    'Your practice is waiting.': 'Bài luyện của bạn đang chờ.',
    'Username or email': 'Tên đăng nhập hoặc email',
    'Your password': 'Mật khẩu của bạn',
    'Password': 'Mật khẩu',
    'Email': 'Email',
    'Full name': 'Họ và tên',
    'Username': 'Tên đăng nhập',
    'Show password': 'Hiện mật khẩu',
    'Stay signed in on this device': 'Duy trì đăng nhập trên thiết bị này',
    'Forgot password?': 'Quên mật khẩu?',
    'Forgot your password?': 'Quên mật khẩu?',
    'No account yet?': 'Chưa có tài khoản?',
    'Create a free account': 'Tạo tài khoản miễn phí',
    'Create account': 'Tạo tài khoản',
    'Already have an account?': 'Đã có tài khoản?',
    'Continue with Google': 'Tiếp tục với Google',
    'or': 'hoặc',
    'Enter your password.': 'Hãy nhập mật khẩu.',
    'Enter your username or email.': 'Hãy nhập tên đăng nhập hoặc email.',
    'Please tell us your name.': 'Hãy cho biết tên của bạn.',
    'That email address is not valid.': 'Địa chỉ email không hợp lệ.',
    'At least 8 characters, letters and numbers': 'Tối thiểu 8 ký tự, có chữ và số',
    'At least 8 characters': 'Tối thiểu 8 ký tự',
    'Password needs at least 8 characters, with both letters and numbers.':
      'Mật khẩu cần tối thiểu 8 ký tự, gồm cả chữ và số.',
    'That phone number does not look right - e.g. 0912345678.':
      'Số điện thoại chưa đúng - ví dụ 0912345678.',
    'Exams you are interested in': 'Kỳ thi bạn quan tâm',
    '(choose any)': '(chọn tùy ý)',
    'I agree to the': 'Tôi đồng ý với',
    'and the': 'và',
    'Terms of use': 'Điều khoản sử dụng',
    'Privacy policy': 'Chính sách bảo mật',
    'You need to accept the terms to continue.': 'Bạn cần đồng ý điều khoản để tiếp tục.',
    'Free, and it takes a minute. Unlock tests when you are ready.':
      'Miễn phí, chỉ mất một phút. Mở khóa bài thi khi bạn sẵn sàng.',
    'Progress, activated codes and skill breakdowns all live in your account.':
      'Tiến độ, mã đã kích hoạt và phân tích kỹ năng đều nằm trong tài khoản của bạn.',
    'Keep practising': 'Tiếp tục luyện',
    'Back to sign in': 'Quay lại đăng nhập',
    'Remembered it?': 'Đã nhớ ra?',
    'Remembered your password?': 'Đã nhớ ra mật khẩu?',
    'Enter your registered email and we will send a reset link.':
      'Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại.',
    'Send the reset link': 'Gửi liên kết đặt lại',
    'Check your inbox': 'Kiểm tra hộp thư',
    'Try a different email': 'Thử email khác',
    'Open the reset link': 'Mở liên kết đặt lại',
    'The trial build does not send real email.': 'Bản dùng thử không gửi email thật.',
    'Interface demo: the reset email is not actually sent.':
      'Bản demo giao diện: email đặt lại không thực sự được gửi.',
    'Set a new password': 'Đặt mật khẩu mới',
    'Reset password': 'Đặt lại mật khẩu',
    'Password changed': 'Đã đổi mật khẩu',
    'Choose a new password. Every signed-in device will have to sign in again.':
      'Chọn mật khẩu mới. Mọi thiết bị đang đăng nhập sẽ phải đăng nhập lại.',
    'Sign in with the new password to carry on practising.':
      'Đăng nhập bằng mật khẩu mới để tiếp tục luyện.',
    'That link is not valid': 'Liên kết không hợp lệ',
    'The reset link is missing its token or has expired. Ask for a new one.':
      'Liên kết đặt lại thiếu mã hoặc đã hết hạn. Hãy yêu cầu liên kết mới.',
    'Request a new link': 'Yêu cầu liên kết mới',

    /* ---- Xác thực email ---- */
    'One step to go': 'Còn một bước nữa',
    'We have sent a verification link to': 'Chúng tôi đã gửi liên kết xác thực tới',
    'your email address': 'địa chỉ email của bạn',
    'Open the email and follow the link to activate your account.':
      'Mở email và bấm liên kết để kích hoạt tài khoản.',
    'Open the verification link': 'Mở liên kết xác thực',
    'I have verified it': 'Tôi đã xác thực',
    'Resend the email': 'Gửi lại email',
    'Sent again. Check your inbox and your spam folder.':
      'Đã gửi lại. Kiểm tra hộp thư và cả thư rác.',
    'Wrong email address?': 'Sai địa chỉ email?',
    'Sign up again': 'Đăng ký lại',
    'Your email is verified. Your account is ready.':
      'Email đã được xác thực. Tài khoản của bạn đã sẵn sàng.',
    'Go to the dashboard': 'Vào bảng điều khiển',
    'No mail service is connected yet: in the trial build the verification link appears on the next screen.':
      'Chưa kết nối dịch vụ email: ở bản dùng thử, liên kết xác thực hiện ở màn hình kế tiếp.',
    'No mail service is connected: the trial build shows the link right here.':
      'Chưa kết nối dịch vụ email: bản dùng thử hiện liên kết ngay tại đây.',

    /* ---- Thư viện ---- */
    'Mock test library': 'Thư viện đề thi thử',
    'Test library': 'Thư viện đề thi',
    'Filter by skill': 'Lọc theo kỹ năng',
    'Filter by status': 'Lọc theo trạng thái',
    'Skill: all': 'Kỹ năng: tất cả',
    'Status: all': 'Trạng thái: tất cả',
    'Clear filters': 'Xóa bộ lọc',
    'Loading the list…': 'Đang tải danh sách…',
    'No tests match these filters': 'Không có bài thi khớp bộ lọc',
    'Loosen a condition, or clear the filters to see the whole library.':
      'Nới một điều kiện, hoặc xóa bộ lọc để xem toàn bộ thư viện.',
    'Tell me when a paper is ready': 'Báo tôi khi có đề',
    'Tell me when it is ready': 'Báo tôi khi có đề',
    'Your email': 'Email của bạn',
    'Email for notifications': 'Email nhận thông báo',
    'Noted. You will be the first to know when a new paper arrives.':
      'Đã ghi nhận. Bạn sẽ là người đầu tiên biết khi có đề mới.',
    'The writing team is building papers against the latest structure. Leave your email and we will tell you the moment the first one lands.':
      'Đội soạn đề đang biên soạn theo cấu trúc mới nhất. Để lại email, chúng tôi sẽ báo ngay khi đề đầu tiên có mặt.',

    /* ---- Chi tiết bài thi ---- */
    'Test structure': 'Cấu trúc bài thi',
    'Instructions and notes': 'Hướng dẫn và lưu ý',
    'Parts of this test': 'Các phần của bài thi',
    'Back to the library': 'Về thư viện',
    'Breadcrumb': 'Đường dẫn',
    'Test not found': 'Không tìm thấy bài thi',
    'This test does not exist, or it has been taken out of the library.':
      'Bài thi không tồn tại, hoặc đã được gỡ khỏi thư viện.',
    'This test is coming soon': 'Bài thi sắp có',
    'The writing team is still finishing the paper. When it is released it opens in your account automatically.':
      'Đội soạn đề đang hoàn thiện. Khi phát hành, đề sẽ tự mở trong tài khoản của bạn.',

    /* ---- Phòng thi ---- */
    'Sitting the test': 'Đang làm bài',
    'Each recording plays once.': 'Mỗi bản ghi chỉ phát một lần.',
    /* Ghi chú chấm bài do khâu chấm rubric ghi lên từng câu. */
    'Awaiting marking': 'Đang chờ chấm',
    'Left blank': 'Bỏ trống',
    'Nothing was recorded for this item.': 'Câu này chưa có bản ghi nào.',
    'The recording could not be read.': 'Không đọc được bản ghi.',
    'Speaking is not marked yet: no transcription service is configured.':
      'Phần Nói chưa chấm được: chưa cấu hình dịch vụ chuyển giọng nói thành chữ.',
    /* Phần D: con số nằm ở node riêng nên chữ quanh nó dịch được. */
    'Write at least': 'Viết tối thiểu',
    'words.': 'từ.',
    'of 100 words': 'trên 100 từ',
    'words - the minimum is met': 'từ - đã đủ mức tối thiểu',
    'Plays once - no replay': 'Phát một lần - không nghe lại',
    'Already played': 'Đã phát',
    'This part has no questions yet, so there is nothing to sit. It is on the paper because the exam has it - your result will not count it.':
      'Phần này chưa có câu hỏi nào nên chưa làm được. Nó vẫn nằm trên đề vì kỳ thi thật có phần này - kết quả của bạn sẽ không tính phần này.',
    'Hand in': 'Nộp bài',
    'Hand in now?': 'Nộp bài ngay?',
    'Handed in': 'Đã nộp bài',
    'Go back and carry on': 'Quay lại làm tiếp',
    'You have no test in progress': 'Bạn không có bài thi nào đang làm',
    'Pick a test in the library and press Start.': 'Chọn một bài trong thư viện và bấm Bắt đầu.',
    'Pick another test': 'Chọn bài khác',
    'Go to the library': 'Vào thư viện',
    'See the result': 'Xem kết quả',
    'Multiple choice and gap-fill are already marked. Writing and Speaking are marked against a rubric, so they follow later.':
      'Trắc nghiệm và điền khuyết đã được chấm. Viết và Nói chấm theo thang tiêu chí nên sẽ có sau.',

    /* ---- Kết quả ---- */
    'Test result': 'Kết quả bài thi',
    'Overall': 'Tổng thể',
    'Band': 'Bậc',
    'out of 10': 'trên 10',
    'Mark per skill': 'Điểm từng kỹ năng',
    'The part-by-part breakdown': 'Phân tích từng phần',
    'Part by part, item by item': 'Từng phần, từng câu',
    'No result yet': 'Chưa có kết quả',
    'Sit another test': 'Làm bài khác',
    'See the price list': 'Xem bảng giá',
    'Your own answers are kept here so you can compare. The correct answers are not shown, because the paper is still used for later sittings.':
      'Câu trả lời của bạn được giữ lại để đối chiếu. Đáp án đúng không hiển thị, vì đề còn dùng cho các lượt thi sau.',

    /* ---- Mã / mua mã ---- */
    'Activation code': 'Mã kích hoạt',
    'Activate code': 'Kích hoạt mã',
    'Enter another code': 'Nhập mã khác',
    'Code': 'Mã',
    'Unlocked.': 'Đã mở khóa.',
    'is now active:': 'đã hiệu lực:',
    'Go to the library and start': 'Vào thư viện và bắt đầu',
    'No code yet?': 'Chưa có mã?',
    'Buy one': 'Mua mã',
    'No codes activated yet': 'Chưa kích hoạt mã nào',
    'Get a code from your school or centre, or buy one directly. Once it is activated, what it unlocks shows up here.':
      'Nhận mã từ trường hoặc trung tâm, hoặc mua trực tiếp. Sau khi kích hoạt, phần được mở sẽ hiện ở đây.',
    'Twelve characters, printed on the card or in your purchase email. For example:':
      'Mười hai ký tự, in trên thẻ hoặc trong email mua hàng. Ví dụ:',
    'Demo codes for trying the flow': 'Mã demo để thử quy trình',
    'VPET practice plans': 'Các gói luyện VPET',
    'Price list': 'Bảng giá',
    'I already have a code': 'Tôi đã có mã',
    'Get a code for this plan': 'Nhận mã cho gói này',
    'Buy through a centre': 'Mua qua trung tâm',
    'Pay online': 'Thanh toán trực tuyến',
    'No plans are on sale': 'Chưa có gói nào được bán',
    'Ask your centre for a code, or come back later.':
      'Hãy hỏi trung tâm để lấy mã, hoặc quay lại sau.',
    'One code opens one time-limited plan for': 'Một mã mở một gói có thời hạn cho',
    'one account': 'một tài khoản',
    '; the term runs from activation, not from purchase.':
      '; thời hạn tính từ lúc kích hoạt, không phải lúc mua.',
    'Contact your centre to buy this plan - each code works for one account only, and the term starts the moment it is activated.':
      'Liên hệ trung tâm để mua gói này - mỗi mã chỉ dùng cho một tài khoản, và thời hạn bắt đầu ngay khi kích hoạt.',
    'You will be taken to the payment provider and brought straight back. Your code is issued the moment the payment settles, and it works for one account only.':
      'Bạn sẽ được chuyển sang cổng thanh toán rồi quay lại ngay. Mã được cấp ngay khi thanh toán hoàn tất, và chỉ dùng cho một tài khoản.',
    'Every plan includes 150 practice papers and unbroken access for the length of the term. VNPay / MoMo checkout is wired in later.':
      'Mọi gói đều có 150 đề luyện và truy cập liên tục trong suốt thời hạn. Thanh toán VNPay / MoMo sẽ nối sau.',

    /* ---- Hồ sơ / tài khoản ---- */
    'Personal details': 'Thông tin cá nhân',
    'Account sections': 'Các mục tài khoản',
    'Security': 'Bảo mật',
    'Session': 'Phiên đăng nhập',
    'Notifications': 'Thông báo',
    'Appearance': 'Giao diện',
    'Order history': 'Lịch sử đơn hàng',
    'No orders yet': 'Chưa có đơn hàng',
    'Exams you follow': 'Kỳ thi bạn theo dõi',
    'Changes saved.': 'Đã lưu thay đổi.',
    'A name is required.': 'Cần nhập tên.',
    'Changing your email means verifying the new address.':
      'Đổi email đồng nghĩa phải xác thực địa chỉ mới.',
    'A username cannot be changed. Sign in with it or with your email.':
      'Không thể đổi tên đăng nhập. Dùng nó hoặc email để đăng nhập.',
    'Repeat the new password': 'Nhập lại mật khẩu mới',
    'Enter your current password.': 'Hãy nhập mật khẩu hiện tại.',
    'The two passwords do not match.': 'Hai mật khẩu không khớp.',
    'A new password needs at least 8 characters, with both letters and digits.':
      'Mật khẩu mới cần tối thiểu 8 ký tự, gồm cả chữ và số.',
    'Password changed. Use the new one next time you sign in.':
      'Đã đổi mật khẩu. Lần sau hãy đăng nhập bằng mật khẩu mới.',
    'Keeping your account safe': 'Giữ an toàn cho tài khoản',
    'Use a password of its own, not the one on your email or social accounts.':
      'Dùng mật khẩu riêng, không trùng với email hay mạng xã hội.',
    'Sign out of this device. Changing your password signs out every other device.':
      'Đăng xuất thiết bị này. Đổi mật khẩu sẽ đăng xuất mọi thiết bị khác.',
    'Sign out on lab machines and shared computers.':
      'Nhớ đăng xuất trên máy phòng thực hành và máy dùng chung.',
    'Email notifications': 'Thông báo qua email',
    'Changes are saved the moment you switch one on or off.':
      'Thay đổi được lưu ngay khi bạn bật hoặc tắt.',
    'Practice reminders': 'Nhắc luyện tập',
    'A gentle weekly nudge if you have an unlocked test you have not sat.':
      'Nhắc nhẹ mỗi tuần nếu bạn có bài đã mở mà chưa làm.',
    'New papers released': 'Có đề mới',
    'Tells you when a new mock test lands for an exam you follow.':
      'Báo khi có đề thi thử mới cho kỳ thi bạn theo dõi.',
    'Offers and promotions': 'Ưu đãi và khuyến mãi',
    'News of discounts on code plans. No more than one email a month.':
      'Tin giảm giá các gói mã. Không quá một email mỗi tháng.',
    'Turn on dark mode': 'Bật chế độ tối',
    'Branding (white-label demo)': 'Thương hiệu (demo white-label)',
    'Code purchases appear here, along with the codes they issued.':
      'Các lần mua mã hiện ở đây, kèm mã đã cấp.',
    'Do not share an activated code: each one works once.':
      'Đừng chia sẻ mã đã kích hoạt: mỗi mã chỉ dùng một lần.',
    'See the code plans': 'Xem các gói mã',

    /* ---- Mất kết nối ---- */
    'No network connection': 'Không có kết nối mạng',
    'Your device is offline, so this page could not load. Turn Wi-Fi or mobile data back on and try again - anything you had in progress is still there.':
      'Thiết bị đang ngoại tuyến nên không tải được trang. Bật lại Wi-Fi hoặc dữ liệu di động rồi thử lại - phần bạn đang làm dở vẫn còn nguyên.',

    /* ---- Khu tự học: chỉ phần vỏ giao diện ---- */
    'Self-study topics': 'Chủ đề tự học',
    'Filter by level': 'Lọc theo bậc',
    'Level: all': 'Bậc: tất cả',
    'Clear filter': 'Xóa bộ lọc',
    'Nothing at this level': 'Không có mục nào ở bậc này',
    'Pick another level to see more.': 'Chọn bậc khác để xem thêm.',
    'This device has no English voice installed, so nothing can be read aloud. The examples are still perfectly readable.':
      'Thiết bị chưa cài giọng đọc tiếng Anh nên không phát âm được. Các ví dụ vẫn đọc được bình thường.',
    'Irregular verbs': 'Động từ bất quy tắc',
    'Linking words': 'Từ nối',
    'Modal verbs': 'Động từ khuyết thiếu',
    'Passive and reported speech': 'Câu bị động và tường thuật',
    'Adjectives and adverbs': 'Tính từ và trạng từ',
    'Nouns and articles': 'Danh từ và mạo từ',
    'Clauses': 'Mệnh đề',
    'Conditionals': 'Câu điều kiện',
    'Inversion and emphasis': 'Đảo ngữ và nhấn mạnh',
    'Register and hedging': 'Sắc thái và nói giảm',
    'Tenses': 'Các thì',
    'Review': 'Ôn tập',

    /* ---- Nhãn thương hiệu ---- */
    'Certificate mock tests': 'Thi thử lấy chứng chỉ',

    /* ---- Bảng điều khiển: các nhãn còn lại ---- */
    'Good afternoon,': 'Chào buổi chiều,',
    'Good morning,': 'Chào buổi sáng,',
    'Good evening,': 'Chào buổi tối,',
    'See the structure': 'Xem cấu trúc',
    'Other VPET tests': 'Bài VPET khác',
    'Start preparing': 'Bắt đầu ôn',
    'Start practising': 'Bắt đầu luyện',
    'Unlock more tests': 'Mở thêm bài thi',
    'Verify your email': 'Xác thực email',
    'Choose the exams you care about': 'Chọn kỳ thi bạn quan tâm',
    'Activate your first code': 'Kích hoạt mã đầu tiên',
    "Look at one test's structure": 'Xem cấu trúc một bài thi',
    'The exams you follow are listed first': 'Kỳ thi bạn theo dõi được xếp trước',
    'All exams': 'Tất cả kỳ thi',
    'Active': 'Đang hiệu lực',
    'Current plan': 'Gói hiện tại',
    'Mua code': 'Mua mã',

    /* ---- Nội dung gói, do server gửi kèm (server/data/plans.js) ----
       Dịch ở đây thay vì thêm cột tiếng Việt vào plans.js: mỗi chuỗi là trọn
       một nút văn bản nên từ điển khớp được, và giá cả vẫn chỉ có một nguồn. */
    'Ten full sittings to see where you stand.': 'Mười lượt thi đầy đủ để biết bạn đang ở đâu.',
    '10 full VPET sittings in one month': '10 lượt thi VPET đầy đủ trong một tháng',
    'Every part of the test, exactly as the real thing': 'Đủ mọi phần của bài thi, đúng như thật',
    'Score only - no per-part breakdown or written feedback':
      'Chỉ có điểm - không phân tích từng phần hay nhận xét',
    'Practise without counting, and study between sittings.':
      'Luyện không giới hạn, và có cái để học giữa các lượt thi.',
    'Unlimited VPET sittings for 3 months': 'Thi VPET không giới hạn trong 3 tháng',
    'Unlimited VPET sittings for 6 months': 'Thi VPET không giới hạn trong 6 tháng',
    'Full self-study area: vocabulary, grammar, linking words, pronunciation':
      'Toàn bộ khu tự học: từ vựng, ngữ pháp, từ nối, phát âm',
    'Detailed report: every part scored, with written feedback':
      'Báo cáo chi tiết: chấm từng phần, kèm nhận xét',
    'New practice sets as they are published': 'Bộ đề mới ngay khi phát hành',
    'Six months, for a target date that is further out.': 'Sáu tháng, cho ngày thi còn xa.',

    /* ---- Câu dài do JS chèn, nhưng vẫn trọn một nút văn bản ---- */
    "You have not looked at this test's structure yet. Knowing the parts, the timing and the question types in advance is what stops the real room feeling strange.":
      'Bạn chưa xem cấu trúc bài thi này. Biết trước các phần, thời gian và dạng câu hỏi là điều giúp phòng thi thật không còn xa lạ.',
    /* Bản không dấu chấm: chuỗi format của kỳ thi do API gửi về. */
    'Parts A-J, 58 items, AI scored speaking': 'Gồm 10 phần A-J, 58 câu, phần Nói chấm bằng AI',
    'No codes yet': 'Chưa có mã nào',
    /* Câu bị <b> và <a> cắt thành nhiều nút, nên dịch theo từng mảnh. */
    '. Activate it under': '. Kích hoạt tại mục',

    /* ---- Ôn tập lặp ngắt quãng ---- */
    'Coming soon': 'Sắp có',
    'Three time-limited plans: 1, 3 or 6 months. Activate a code and you are practising straight away.':
      'Ba gói có thời hạn: 1, 3 hoặc 6 tháng. Kích hoạt mã là luyện được ngay.',
    'Everything': 'Tất cả',
    'Vocabulary': 'Từ vựng',
    'Voice': 'Giọng đọc',
    'Grammar': 'Ngữ pháp',
    'Show answer': 'Hiện đáp án',
    'How did that go?': 'Bạn làm được đến đâu?',
    'Again': 'Lại từ đầu',
    'New': 'Mới',
    'Check again': 'Kiểm tra lại',
    'Nothing is due right now': 'Chưa có thẻ nào tới hạn',
    'Browse the material': 'Xem tài liệu',
    'Pronounce this card': 'Đọc thẻ này',
    'Press': 'Bấm',
    'Space': 'Space',
    'to reveal, then': 'để hiện đáp án, rồi',
    'to grade.': 'để chấm.',
    'Each card comes back just before you would have forgotten it. Answer in your head, reveal, then say honestly how it went - the schedule is only as good as that answer.':
      'Mỗi thẻ quay lại ngay trước lúc bạn sắp quên. Trả lời trong đầu, hiện đáp án, rồi tự đánh giá thật lòng - lịch ôn chỉ chuẩn khi câu trả lời đó thật.',
    'sends a card back to the start; the rest push it further away.':
      'đưa thẻ về lại từ đầu; các mức còn lại đẩy thẻ ra xa hơn.',
    'This device has no English voice installed, so nothing can be read aloud. The cards are still perfectly readable.':
      'Thiết bị chưa cài giọng đọc tiếng Anh nên không phát âm được. Các thẻ vẫn đọc được bình thường.',

    /* ---- Xếp lớp, ôn tập, kế hoạch tuần (blocks 3.5, 5, 6) ----
       Những chuỗi này trước đây nằm trong data-en/data-vi trên chính thẻ HTML,
       mà không có đoạn mã nào đọc hai thuộc tính đó. Xem ghi chú ở cuối tệp. */
    'What to do next': 'Việc nên làm tiếp',
    'Three things, chosen from your progress above.': 'Ba việc, chọn theo đúng tiến độ ở trên.',
    'About 12 minutes, 18 questions. This is not a grade and nobody else sees it — it is how the platform works out what to give you first.':
      'Khoảng 12 phút, 18 câu. Đây không phải bài chấm điểm và không ai khác nhìn thấy — nó chỉ để nền tảng biết nên đưa bạn học từ đâu.',
    'The questions get harder or easier as you go, so it finds your level quickly.':
      'Câu hỏi sẽ khó lên hoặc dễ đi theo bạn làm, nên nó tìm ra trình độ của bạn rất nhanh.',
    'Answer what you can and guess the rest — a wrong answer costs nothing here.':
      'Câu nào không chắc cứ đoán — ở đây trả lời sai không mất gì cả.',
    'Close the tab any time. You come back to the question you were on.':
      'Đóng tab lúc nào cũng được. Quay lại là vào đúng câu đang dở.',
    'Writing and Speaking are placed later, from your first real paper.':
      'Phần Viết và Nói sẽ được xếp sau, từ bài thi đầy đủ đầu tiên của bạn.',
    'Tip: press 1–4 to choose, Enter for next': 'Mẹo: bấm 1–4 để chọn, Enter để sang câu',
    'Your starting point': 'Điểm xuất phát của bạn',
    'What to do first': 'Việc nên làm trước',
    'Three things, chosen from how you just answered. This list changes as you practise.':
      'Ba việc, chọn theo đúng cách bạn vừa làm. Danh sách này đổi theo tiến độ của bạn.',
    'This cannot start right now': 'Chưa bắt đầu được',
    'Go to my account': 'Về trang tài khoản',
    'Revise by using it': 'Ôn bằng cách dùng',
    'Fill the right form into real sentences, then write one of your own. No multiple choice — picking the right answer from a list is a different skill from producing it, and the exam tests the second.':
      'Điền đúng dạng vào câu thật, rồi tự viết một câu. Không có trắc nghiệm — chọn đúng trong bốn đáp án là một kỹ năng khác với tự viết ra, và bài thi kiểm tra cái thứ hai.',
    'Enter for next': 'Enter để sang câu',
    'This set': 'Lượt này',
    'The sentence you wrote': 'Câu bạn tự viết',
    'Another set': 'Lượt nữa',
    'Choose a topic': 'Chọn chủ điểm khác',
    'Let\'s find your starting point': 'Tìm điểm xuất phát của bạn',
    'Start — 12 minutes': 'Bắt đầu — 12 phút',
    'I don\'t know': 'Chưa biết',
    'Go to my dashboard': 'Vào trang học của tôi',

    /* ---- Trang chủ, sau khi gộp tab Tiến độ vào ---- */
    'Practise a part': 'Luyện một phần',
    'Sit a full paper': 'Làm một bài đầy đủ',
    'Where you stand': 'Bạn đang ở đâu',
    'not measured': 'chưa đo',
    'Studied': 'Đã học',
    'Day streak': 'Ngày liên tiếp',
    'Accuracy': 'Độ chính xác',
    'Time on task': 'Thời gian học',
    'Full papers': 'Bài đầy đủ',
    'Part practice': 'Luyện theo phần',
    'Revision': 'Ôn tập',
    'Marks, paper by paper': 'Điểm từng bài đã làm',
    'No paper has been handed in yet. Once one is, every sitting appears here in order, so you can see whether the line is going up.':
      'Chưa nộp bài nào. Nộp rồi thì mỗi lần làm sẽ hiện ở đây theo thứ tự, để bạn thấy đường điểm có đi lên không.',
    'Every part of the paper': 'Từng phần của đề',
    'Practise one': 'Luyện một phần',
    'What to do next': 'Việc nên làm tiếp',
    'Three things, chosen from the numbers above.': 'Ba việc, chọn theo đúng các con số ở trên.',
    'Ability by skill': 'Năng lực theo kỹ năng',
    'How accurate you are': 'Bạn làm đúng bao nhiêu',
    'Kept apart, because a drill is retryable and a paper is not.':
      'Tách riêng, vì luyện lẻ thì làm lại được còn bài thi thì không.',
    'Nothing has been marked yet.': 'Chưa có gì được chấm.',
    'Need more practice?': 'Cần luyện thêm?',
    'Three time-limited plans: 1, 3 or 6 months.': 'Ba gói có thời hạn: 1, 3 hoặc 6 tháng.',
    'Buy more codes': 'Mua thêm mã',
    'Your tests': 'Bài của bạn',
    'See all': 'Xem tất cả',
    'You have not unlocked any tests yet': 'Bạn chưa mở bài nào',
    'Enter an unlock code': 'Nhập mã mở khóa',
    'Browse the library': 'Xem thư viện',
    'Verify your email to protect your account': 'Xác thực email để bảo vệ tài khoản',
    'Open the email and follow the verification link, or have it sent again.':
      'Mở email rồi bấm vào liên kết xác thực, hoặc yêu cầu gửi lại.',

    /* ---- Luyện thi theo phần (block 4) ---- */
    'Practise one part at a time': 'Luyện từng phần một',
    'Six questions, about ten minutes, marked the moment you finish. What you score here moves your progress.':
      'Sáu câu, khoảng mười phút, làm xong chấm ngay. Điểm ở đây sẽ đổi tiến độ của bạn.',
    'Your level': 'Mức của bạn',
    'Parts measured': 'Phần đã đo',
    'The paper, A to J': 'Toàn bộ đề, A tới J',
    'Four you can drill': 'Bốn phần luyện lẻ được',
    'Parts A, C, E and F are typed answers, so six of them can be marked on the spot.':
      'Part A, C, E và F là các câu gõ đáp án, nên sáu câu một lượt là chấm được ngay.',
    'The other six are e-mails and spoken answers. They need a marker rather than an answer key, so they are scored when you sit a full paper.':
      'Sáu phần còn lại là viết email và trả lời bằng lời. Những phần đó cần người chấm chứ không phải đáp án có sẵn, nên chỉ tính điểm khi bạn làm một bài đầy đủ.',
    'Sit a full paper': 'Làm một bài đầy đủ',
    'Recently practised': 'Vừa luyện gần đây',
    'Nothing yet. Your last five drills will sit here, with what you scored on each.':
      'Chưa có gì. Năm lượt luyện gần nhất sẽ nằm ở đây, kèm điểm từng lượt.',
    'Leave': 'Thoát',
    'Next': 'Tiếp',
    'Skip': 'Bỏ qua',
    '1-4 to choose, Enter for next': '1-4 để chọn, Enter để sang câu',
    'This drill': 'Lượt này',
    'Another one': 'Làm tiếp lượt nữa',
    'Choose a part': 'Chọn phần khác',
    'My progress': 'Tiến độ của tôi',
    'Not right now': 'Chưa luyện được',
    'Back': 'Quay lại'
  };

  function tr(s) {
    if (lang !== 'vi') return s;
    var raw = String(s == null ? '' : s);
    /* Split off the surrounding whitespace so it can be put back untouched:
       an indented <p> in the HTML source is one text node whose value starts
       with a newline and a run of spaces, and eating those would reflow it. */
    var m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var body = m[2];
    if (!body) return raw;
    /* A long sentence is wrapped across several source lines, so the text node
       holds newlines and runs of spaces where the dictionary key has one space.
       Look the flattened form up too, or every long string silently stays
       English however carefully it was translated. */
    var vi = VI[body];
    if (vi == null) vi = VI[body.replace(/\s+/g, ' ')];
    if (vi == null || vi === body) return raw;
    return m[1] + vi + m[3];
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

  /* Delegated, so a switch that is injected later - the admin chrome builds its
     sidebar from JS after this file has run - still works, in both languages.
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
