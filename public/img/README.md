# Ảnh minh họa dùng trong giao diện

## `login-hero.png` — khung phải trang đăng nhập

**File hiện tại là ảnh trống 1600×900, trong suốt.** Nó tồn tại để `/img/login-hero.png`
luôn trả 200: CSS ở `src/tailwind.css` (`.panel-illustration`) đã trỏ sẵn vào đường dẫn
này, và một đường dẫn 404 sẽ làm `scripts/audit.mjs` đỏ — script đó đếm **mọi** lỗi
console, không lọc.

Với ảnh trống, khung phải hiện nền xanh thương hiệu phẳng kèm dòng tiêu đề. Trông vẫn
chỉn chu, chỉ là chưa có hình.

### Thay bằng ảnh thật

Ghi đè đúng file này, **giữ nguyên tên**. Không cần sửa một dòng code nào.

```
public/img/login-hero.png
```

Yêu cầu:

| | |
|---|---|
| Tỷ lệ | 16:9 (khuyến nghị 1600×900 hoặc 2000×1125) |
| Định dạng | PNG |
| Nền | Xanh navy `#1c3d8f` — **đúng bằng** `--color-primary` |
| Bố cục | Chủ thể nằm ở nửa dưới, canh giữa |

Hai yêu cầu cuối không phải tùy chọn:

- CSS dùng `background-size: contain` và `background-position: center bottom`, nên ảnh
  đứng ở đáy khung và phần trên là nền phẳng của khung. Nền ảnh lệch màu sẽ tạo một
  đường ngang nhìn thấy được ở giữa khung.
- Khung có tỷ lệ gần vuông, ảnh 16:9 nên chỉ chiếm khoảng nửa dưới. Chủ thể đặt cao quá
  sẽ chui vào sau dòng tiêu đề.

Đổi màu thương hiệu (tenant khác trong `src/tailwind.css`) thì phải đổi cả nền ảnh.
