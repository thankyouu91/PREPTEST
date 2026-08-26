# Ảnh minh họa dùng trong giao diện

## `login-hero.png` — khung phải trang đăng nhập

Hiện tại: 1280×720, nền phẳng `#1c408c`.

CSS ở `src/tailwind.css` (`.panel-illustration`) dùng `background-size: contain` +
`background-position: center bottom`, nên ảnh **đứng ở đáy khung**, phần trên là nền
phẳng do CSS tô.

### Nếu thay ảnh khác

Ghi đè đúng file này, giữ nguyên tên — không cần sửa code, **trừ khi màu nền đổi**.

| | |
|---|---|
| Tỷ lệ | 16:9 |
| Định dạng | PNG |
| Nền | Một màu phẳng, tràn hết khung |
| Bố cục | Chủ thể ở nửa dưới, canh giữa |

**Đổi màu nền thì phải sửa hai chỗ trong `src/tailwind.css`:** `.panel-illustration`
(`background-color`) và `.panel-scrim`. Hai chỗ này đang ghi cứng `#1c408c` — đó là màu
nền **của chính file ảnh**, không phải màu thương hiệu.

Nghe như trùng lặp nhưng không phải. Màu thương hiệu `--color-primary` là `#1c3d8f`,
lệch 3 điểm ở hai kênh so với ảnh. Lệch từng đó thì nhìn cả mảng không thấy gì, nhưng
chỗ hai mảng phẳng giáp nhau thành một đường ngang chạy hết chiều rộng khung thì mắt
bắt được. Nên màu ở đó bám theo **file ảnh**, không bám theo tenant.

Vì vậy: đổi ảnh → lấy màu nền của ảnh mới → sửa hai chỗ đó. Đổi tenant (màu thương hiệu)
→ phải xuất lại ảnh theo màu mới.

### Vì sao chủ thể phải ở nửa dưới

Khung bên phải gần vuông, ảnh 16:9 nên chỉ chiếm khoảng nửa dưới khung. Chủ thể đặt cao
quá sẽ chui vào sau dòng tiêu đề.

Đã thử `cover` và bỏ: nó cắt mất khoảng 2/5 chiều ngang của ảnh 16:9 trong khung gần
vuông — mất cây đèn một bên, chồng sách bên kia.
