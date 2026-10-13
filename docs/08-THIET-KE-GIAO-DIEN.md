# Thiết kế giao diện — Danh mục Demo

> Token màu, font, quy tắc chung: `ZDOCS/03-KIEN-TRUC/KIEN-TRUC-HE-THONG.md` §6.5 (mặc định của `_template`: Be Vietnam Pro, xanh `#2563EB`, cam hành động `#C2410C` qua token `--cta`).
> File này chỉ ghi phần riêng của Danh mục Demo. Trang công khai là bộ mặt của PUM trước khách: ưu tiên rõ ràng, nhanh, đẹp trên điện thoại.

---

## 1. Phong cách

| Hạng mục | Quyết định |
| :--- | :--- |
| Kiểu | SaaS hiện đại, sáng, nhiều khoảng trắng; ảnh chụp màn hình là nhân vật chính |
| Nền | `--background` sáng; khu đầu trang có dải gradient rất nhạt từ màu chính, không dùng ảnh nền nặng |
| Kính mờ | Chỉ thanh đầu trang khi cuộn (`backdrop-blur`, nền bán trong suốt), không dùng cho thẻ |
| Bo góc | Thẻ `rounded-2xl`, nút và ô nhập `rounded-xl`, nhãn `rounded-full` |
| Bóng | Thẻ bóng rất nhẹ; khi hover nâng 2 px và bóng đậm hơn (200 ms); tắt chuyển động khi `prefers-reduced-motion` |
| Chế độ tối | Hỗ trợ qua token, mặc định sáng |

---

## 2. Màu nhóm ngành

Dùng cho nhãn nhóm (nền nhạt 10–12% + chữ màu đậm), nút lọc khi chọn, ảnh mặc định. Lưu ở cột `Color` của `Cms_Industries`, không viết cứng trong component.

| Mã | Nhóm | Màu | Icon (lucide) |
| :---: | :--- | :--- | :--- |
| 1 | F&B | `#EA580C` | `UtensilsCrossed` |
| 2 | Bán lẻ | `#2563EB` | `ShoppingBag` |
| 3 | Dịch vụ | `#DB2777` | `CalendarCheck` |
| 4 | Giáo dục | `#7C3AED` | `GraduationCap` |
| 5 | Doanh nghiệp | `#0F766E` | `Building2` |
| 6 | Bất động sản | `#B45309` | `House` |
| 7 | Vận tải | `#0369A1` | `Truck` |
| 8 | Website | `#4F46E5` | `Globe` |
| 9 | App di động | `#16A34A` | `Smartphone` |
| 10 | AI | `#9333EA` | `Bot` |
| 11 | Ngành khác | `#475569` | `Shapes` |

Chữ màu nhóm trên nền nhạt phải đạt tương phản 4.5:1; nếu không đạt thì làm đậm màu chữ (vd trộn 20% đen).

---

## 3. Trang danh mục `/`

```
┌──────────────────────────────────────────────────────────┐
│ Logo  Tên thương hiệu               Hotline   [Zalo]  (Đăng nhập) │  ← thanh đầu, dính khi cuộn
├──────────────────────────────────────────────────────────┤
│  Giải pháp phần mềm doanh nghiệp và đồ án sinh viên      │  ← tiêu đề ngắn + 1 dòng mô tả
│  [🔍 Tìm demo: POS, nhà trọ, spa…            ]           │  ← ô tìm kiếm lớn
│  (Tất cả 13) (F&B 3) (Bán lẻ 3) (Dịch vụ 3) …  → cuộn ngang trên điện thoại
│  Tìm thấy 13 demo                       [Sao chép link]  │  ← nút chỉ hiện khi đăng nhập admin (quyền demos.share)
├──────────────────────────────────────────────────────────┤
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ ảnh 16:10│ │        │ │        │ │        │  lưới 1/2/3/4 cột (NFR-01)
│  │ ★ Nổi bật│ │        │ │        │ │        │
│  │ [F&B] [Hoàn thiện] │ …                                │
│  │ Tên demo         │                                     │
│  │ Mô tả ngắn 2 dòng│                                     │
│  │ [Xem demo ↗] [Chi tiết] │                              │
│  └────────┘ └────────┘ …                                  │
├──────────────────────────────────────────────────────────┤
│  Khối kêu gọi: "Chưa thấy giải pháp phù hợp?" + hotline + Zalo │
│  Chân trang: tên thương hiệu, địa chỉ, email, website        │
└──────────────────────────────────────────────────────────┘
```

**Thẻ demo**

- Ảnh tỉ lệ 16:10, `object-cover`, tải lười ngoài màn hình đầu, có `alt` = tên demo + chú thích ảnh.
- Góc trên trái: nhãn "Nổi bật" (icon sao) khi `isFeatured`. Thẻ Sắp ra mắt: ảnh phủ lớp mờ, nhãn "Sắp ra mắt".
- Nhãn trạng thái: Hoàn thiện (xanh lá), Demo được (xanh dương), Sắp ra mắt (xám).
- Mô tả ngắn tối đa 2 dòng (`line-clamp-2`), tên tối đa 2 dòng; chiều cao các thẻ trong một hàng bằng nhau.
- Nút "Xem demo" màu cam hành động, mở tab mới, có icon `ExternalLink` và `aria-label` "Xem demo {tên} (mở tab mới)". Thẻ Sắp ra mắt thay bằng dòng chữ nhỏ "Đang hoàn thiện".
- Cả thẻ bấm được để vào Chi tiết (trừ vùng nút Xem demo).

**Lọc và tìm kiếm**

- Hàng nút nhóm ngành dạng chip; chip đang chọn nền màu nhóm, chữ trắng; trên điện thoại cuộn ngang, không xuống dòng.
- Ô tìm kiếm có nút xóa; chạy sau 300 ms ngừng gõ (NFR-03); từ khóa 1 ký tự hiện gợi ý "Nhập ít nhất 2 ký tự".
- Trạng thái trống: minh họa nhẹ (icon `SearchX`), "Chưa có demo phù hợp", nút "Xóa bộ lọc", hotline.
- Đang tải: khung xương đúng kích thước thẻ (không nhảy bố cục).

**Ảnh mặc định (BR-07)**

Demo chưa có ảnh: nền gradient từ màu nhóm (đậm) sang màu nhóm pha trắng 70%, icon nhóm lớn mờ ở góc phải, tên demo chữ trắng đậm ở góc trái dưới. Vẽ bằng component, không cần file ảnh. Ảnh chia sẻ mạng xã hội (FR-10) dùng cùng bố cục, kích thước 1200×630.

---

## 4. Trang chi tiết `/demos/[slug]`

```
← Danh mục                                   (thanh đầu như danh mục)
┌───────────────────────────────┬──────────────────────────┐
│ Thư viện ảnh                   │ [F&B] [Hoàn thiện]        │
│ ┌───────────────────────────┐ │ POS Quán Cafe             │
│ │ ảnh lớn 16:10, bấm phóng to│ │ Mô tả ngắn                │
│ └───────────────────────────┘ │ [Xem demo ↗] (nút lớn cam)│
│ [ ][ ][ ][ ][ ] ảnh nhỏ        │ [Sao chép gửi khách]      │
│                                │ Tài khoản demo (bảng)     │
│                                │ "Mở link, bấm Đăng nhập nhanh…" │
├───────────────────────────────┴──────────────────────────┤
│ Dành cho · Vấn đề giải quyết · Tính năng nổi bật (lưới icon check) │
│ Mô tả chi tiết · Loại sản phẩm · Thiết bị                 │
├──────────────────────────────────────────────────────────┤
│ Khung "Thông tin nội bộ" (viền nét đứt màu vàng, chỉ Quản trị viên thấy) │
├──────────────────────────────────────────────────────────┤
│ Demo cùng nhóm (tối đa 3 thẻ)                             │
└──────────────────────────────────────────────────────────┘
```

- Desktop: 2 cột 7/5; điện thoại: 1 cột, nút "Xem demo" dính đáy màn hình.
- Hộp xem ảnh phóng to: nền tối 90%, ảnh giữa màn hình, chú thích dưới ảnh, nút trước/sau, phím ←/→/Esc, vuốt ngang trên điện thoại, khóa cuộn trang, trả focus về ảnh nhỏ khi đóng.
- Dải "Xem trước, khách không thấy trang này": nền vàng nhạt, dính dưới thanh đầu.
- Khung nội bộ: mật khẩu che bằng `••••••`, nút hiện và nút sao chép; link Swagger, repo mở tab mới; câu hỏi khách hay hỏi dạng accordion.

---

## 5. Trang quản trị

Dùng layout quản trị của `_template` (sidebar + header + thanh công cụ demo). Menu:

| Mục | Route | Icon |
| :--- | :--- | :--- |
| Quản lý demo | `/admin/demos` | `LayoutGrid` |
| Nhóm ngành | `/admin/categories` | `Tags` |
| Thống kê | `/admin/reports` | `ChartColumn` |
| Xem trang công khai | `/` (tab mới) | `ExternalLink` |
| Cài đặt (nền) | `/settings/*` | |

**Quản lý demo:** hàng thẻ tổng hợp (7 thẻ nhỏ: Tổng, 4 trạng thái, Đang hiển thị, Nổi bật x/6) → thanh lọc (nhóm ngành, trạng thái, hiển thị, ô tìm) + nút "Sắp xếp" và "Thêm demo" → bảng. Cột: thứ tự, ảnh nhỏ 64×40, tên + thư mục (chữ nhỏ), nhóm ngành (nhãn màu), trạng thái (nhãn), hiển thị (công tắc), nổi bật (nút sao), người phụ trách, cập nhật. Bấm dòng mở trang chi tiết công khai (cùng tab, kèm khung nội bộ); nút "Sửa" ở cuối dòng mở trang sửa (hiện theo quyền `demos.update`, Quản trị viên luôn có). Chế độ sắp xếp: tay nắm kéo ở đầu dòng, nút "Lưu thứ tự" / "Hủy".

**Thêm, sửa demo:** đầu trang có tên, thư mục, nhãn trạng thái, nút đổi trạng thái, công tắc hiển thị kèm danh sách điều kiện còn thiếu (check xanh / x đỏ). 5 tab: Thông tin · Ảnh chụp · Tài khoản demo · Nội bộ · Lịch sử. Thanh lưu dính đáy, cảnh báo khi rời trang chưa lưu. Lỗi hiển thị ngay dưới ô nhập.

**Ảnh chụp:** vùng kéo thả nhiều file, kiểm tra ngay trên trình duyệt (định dạng, 2 MB, rộng 1280 px, tối đa 8), ảnh bị từ chối hiện lý do riêng; lưới ảnh kéo thả sắp xếp, ô chú thích, nút "Đặt làm đại diện", nút xóa có xác nhận.

**Thống kê:** chọn khoảng ngày (7, 30, 90 ngày, tùy chọn) + nhóm ngành → 3 thẻ tổng (lượt xem, lượt mở, tỉ lệ mở) → biểu đồ đường lượt xem/lượt mở theo ngày → top 10 demo (bảng) → tỉ trọng nhóm ngành (thanh ngang) và thiết bị (donut) → nút "Xuất Excel".
