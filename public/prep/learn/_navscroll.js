/**
 * Thanh kéo cho hàng chip điều hướng khu tự học.
 *
 * Hàng chip dài hơn bề ngang màn hình nên các mục cuối bị cắt mất, mà lại
 * không có gì báo cho người dùng biết là còn nội dung phía sau. Tệp này gắn
 * thêm ba thứ, đều là nâng cấp dần (không có JS thì hàng chip vẫn cuộn được
 * bằng ngón tay và bằng phím Tab như cũ):
 *
 *   1. Hai nút mũi tên ở hai mép, chỉ hiện khi thật sự còn nội dung bị che.
 *   2. Vệt mờ ở mép để mắt nhận ra ngay là hàng còn kéo được.
 *   3. Thanh cuộn mảnh nhìn thấy được, kéo bằng chuột.
 *
 * Ngoài ra, lúc mở trang thì tự kéo mục đang xem vào giữa tầm nhìn — trước
 * đây vào trang cuối danh sách thì chip của chính nó nằm ngoài màn hình.
 *
 * Không có style inline: mọi thứ đi qua class trong src/tailwind.css để hợp
 * với CSP nghiêm ngặt của dự án.
 */
(function () {
  'use strict';

  var LE = 'http://www.w3.org/2000/svg';

  /** Nút mũi tên; cls phải là tên class VIẾT NGUYÊN, không ghép chuỗi —
      Tailwind quét mã nguồn tìm tên class, ghép chuỗi thì nó không thấy và
      class bị loại khỏi bản CSS đã build. */
  function taoNut(cls, nhan, d) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'navscroll-btn ' + cls;
    b.setAttribute('aria-label', nhan);
    var svg = document.createElementNS(LE, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var p = document.createElementNS(LE, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    b.appendChild(svg);
    return b;
  }

  function gan(nav) {
    if (nav.dataset.navscroll) return;
    nav.dataset.navscroll = '1';

    /* Bọc nav lại để đặt nút và vệt mờ theo toạ độ tương đối */
    var voc = document.createElement('div');
    voc.className = 'navscroll';
    nav.parentNode.insertBefore(voc, nav);
    voc.appendChild(nav);

    /* Đổi sang thanh cuộn mảnh nhìn thấy được thay cho bản ẩn hẳn */
    nav.classList.remove('no-scrollbar');
    nav.classList.add('navscroll-track');

    var truoc = taoNut('navscroll-prev', 'Xem các mục phía trước', 'm15 18-6-6 6-6');
    var sau = taoNut('navscroll-next', 'Xem các mục phía sau', 'm9 18 6-6-6-6');
    voc.appendChild(truoc);
    voc.appendChild(sau);

    function conLai() {
      return nav.scrollWidth - nav.clientWidth;
    }

    function capNhat() {
      var max = conLai();
      var x = nav.scrollLeft;
      /* Ngưỡng 2px cho chắc: bề rộng phân số hay lệch một chút sau khi zoom */
      var traiCon = x > 2;
      var phaiCon = x < max - 2;
      truoc.hidden = !traiCon;
      sau.hidden = !phaiCon;
      voc.classList.toggle('navscroll-has-l', traiCon);
      voc.classList.toggle('navscroll-has-r', phaiCon);
    }

    function keo(huong) {
      nav.scrollBy({ left: huong * Math.max(120, nav.clientWidth * 0.7), behavior: 'smooth' });
    }

    truoc.addEventListener('click', function () { keo(-1); });
    sau.addEventListener('click', function () { keo(1); });
    nav.addEventListener('scroll', capNhat, { passive: true });
    window.addEventListener('resize', capNhat);
    if (window.ResizeObserver) new ResizeObserver(capNhat).observe(nav);

    /* Mở trang nào thì kéo chip của trang đó vào giữa, không cuộn mượt vì
       đang ở thời điểm dựng trang. */
    var dangXem = nav.querySelector('[aria-current="page"]');
    if (dangXem) {
      var giua = dangXem.offsetLeft - (nav.clientWidth - dangXem.offsetWidth) / 2;
      nav.scrollLeft = Math.max(0, giua);
    }
    capNhat();
  }

  function chay() {
    var ds = document.querySelectorAll('nav[aria-label="Mục tự học"]');
    for (var i = 0; i < ds.length; i++) gan(ds[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', chay);
  } else {
    chay();
  }
})();
