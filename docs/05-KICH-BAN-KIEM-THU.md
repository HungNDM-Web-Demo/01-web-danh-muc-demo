# Kịch bản kiểm thử nghiệm thu — Danh mục Demo

> Test case theo use case trong `03-USE-CASE.md`. Phần nền (đăng nhập, phân quyền, đặt lại dữ liệu) dùng TC-SYS-01 đến TC-SYS-10 trong `ZDOCS/03-KIEN-TRUC/USE-CASE-NEN.md` §8.

---

## 1. Cách chạy

| Mục | Nội dung |
| :--- | :--- |
| Môi trường | Chạy cả hai chế độ: dữ liệu mẫu (`mock`) và BE thật (`api`) |
| Dữ liệu | Đặt lại dữ liệu demo trước mỗi lượt test; test case ghi "Đặt lại dữ liệu" ở bước 1 thì đặt lại ngay trước test đó |
| Tài khoản | Theo cột "Vai trò", dùng "Đăng nhập nhanh". Vai trò "Khách" chạy trong cửa sổ ẩn danh, không đăng nhập |
| Thiết bị | Test case vai trò Khách chạy ở 375×812 (điện thoại) và 1440×900 (desktop); vai trò khác chạy ở 1440×900 |
| Đạt | Kết quả thực tế khớp toàn bộ cột "Kết quả mong đợi" |

**Dữ liệu mẫu dùng trong test**

Nhóm ngành (thứ tự, tên trên nút, slug): 1 F&B `fnb` · 2 Bán lẻ `ban-le` · 3 Dịch vụ `dich-vu` · 4 Giáo dục `giao-duc` · 5 Doanh nghiệp `doanh-nghiep` · 6 Bất động sản `bat-dong-san` · 7 Vận tải `van-tai` · 8 Website `website` · 9 App di động `app-di-dong` · 10 AI `ai` · 11 Ngành khác `nganh-khac`.

Demo (thứ tự = số thứ tự × 10; trạng thái là giả định cho dữ liệu mẫu):

| # | Demo | Slug | Nhóm | Trạng thái | Hiển thị | Nổi bật | Ảnh |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| 01 | Danh mục Demo | `danh-muc-demo` | Website | Hoàn thiện | Tắt | | 4 |
| 02 | POS Quán Cafe | `pos-quan-cafe` | F&B | Hoàn thiện | Bật | ✓ | 5 |
| 03 | Quản lý Nhà hàng | `quan-ly-nha-hang` | F&B | Demo được | Bật | | 4 |
| 04 | Menu QR Gọi món | `menu-qr-goi-mon` | F&B | Demo được | Bật | ✓ | 4 |
| 05 | Website Bán hàng | `website-ban-hang` | Bán lẻ | Hoàn thiện | Bật | ✓ | 4 |
| 06 | Landing Page Bán hàng | `landing-page-ban-hang` | Bán lẻ | Mới tạo | Tắt | | 0 |
| 07 | POS Cửa hàng Bán lẻ | `pos-cua-hang-ban-le` | Bán lẻ | Demo được | Bật | | 4 |
| 08 | Quản lý Kho | `quan-ly-kho` | Bán lẻ | Demo được | Bật | | 4 |
| 09 | Quản lý Spa Salon | `quan-ly-spa-salon` | Dịch vụ | Demo được | Bật | ✓ | 4 |
| 10 | Quản lý Phòng khám | `quan-ly-phong-kham` | Dịch vụ | Đang làm | Bật (Sắp ra mắt) | | 0 |
| 11 | Cho thuê Sân thể thao | `cho-thue-san-the-thao` | Dịch vụ | Demo được | Bật | | 4 |
| 12 | Quản lý Trung tâm Ngoại ngữ | `quan-ly-trung-tam-ngoai-ngu` | Giáo dục | Đang làm | Bật (Sắp ra mắt) | | 0 |
| 13 | CRM Quản lý Khách hàng | `crm-quan-ly-khach-hang` | Doanh nghiệp | Hoàn thiện | Bật | ✓ | 4 |
| 14 | HRM Chấm công Tính lương | `hrm-cham-cong-tinh-luong` | Doanh nghiệp | Đang làm | Tắt | | 2 |
| 15 | Quản lý Công việc | `quan-ly-cong-viec` | Doanh nghiệp | Mới tạo | Tắt | | 0 |
| 16 | Quản lý Nhà trọ | `quan-ly-nha-tro` | Bất động sản | Demo được | Bật | | 4 |
| 17 | Website Công ty | `website-cong-ty` | Website | Hoàn thiện | Bật | | 7 |
| 18 | Chatbot Chăm sóc Khách hàng | `chatbot-cham-soc-khach-hang` | AI | Đang làm | Tắt | | 0 |

Ràng buộc dữ liệu cho test tìm kiếm: cụm "nhà trọ" chỉ có ở Quản lý Nhà trọ; chữ "POS" chỉ có ở tên POS Quán Cafe và POS Cửa hàng Bán lẻ; không demo nào chứa "karaoke". Tài khoản demo của POS Quán Cafe: `admin` (Quản trị viên), `quanly` (Quản lý quán), `thungan` (Thu ngân); link demo `http://localhost:3102`; Swagger `https://localhost:7102/swagger`.

---

## 2. Test case

### 2.1. Danh mục công khai

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-01 | UC-01 | Mở danh mục | Khách | 1. Mở `/` | 13 thẻ theo thứ tự: POS Quán Cafe, Menu QR Gọi món, Website Bán hàng, Quản lý Spa Salon, CRM Quản lý Khách hàng (5 thẻ nổi bật), Quản lý Nhà hàng, POS Cửa hàng Bán lẻ, Quản lý Kho, Cho thuê Sân thể thao, Quản lý Nhà trọ, Website Công ty, Quản lý Phòng khám, Quản lý Trung tâm Ngoại ngữ. Hai thẻ cuối có nhãn "Sắp ra mắt", không có nút "Xem demo". Không có Danh mục Demo, Landing Page, HRM, Quản lý Công việc, Chatbot |
| TC-02 | UC-01 | Hàng nút nhóm ngành | Khách | 1. Xem hàng nút nhóm ngành | Thứ tự và số: Tất cả 13, F&B 3, Bán lẻ 3, Dịch vụ 3, Giáo dục 1, Doanh nghiệp 1, Bất động sản 1, Website 1. Không có Vận tải, App di động, AI, Ngành khác |
| TC-03 | UC-01 | Lọc theo nhóm ngành | Khách | 1. Bấm "F&B" | Còn 3 thẻ: POS Quán Cafe, Menu QR Gọi món, Quản lý Nhà hàng; nút F&B tô đậm; đường dẫn `/?nganh=fnb` |
| TC-04 | UC-01 | Tìm không dấu | Khách | 1. Gõ "nha tro" | Còn 1 thẻ Quản lý Nhà trọ, dòng "Tìm thấy 1 demo" |
| TC-05 | UC-01 | Tìm kết hợp nhóm ngành | Khách | 1. Bấm "Bán lẻ" 2. Gõ "POS" | Còn 1 thẻ POS Cửa hàng Bán lẻ; đường dẫn `/?nganh=ban-le&q=POS` |
| TC-06 | UC-01 | Không có kết quả | Khách | 1. Gõ "karaoke" 2. Bấm "Xóa bộ lọc" | Bước 1: trạng thái trống "Chưa có demo phù hợp", có hotline. Bước 2: trở lại 13 thẻ, ô tìm kiếm trống |
| TC-07 | UC-01 | Từ khóa 1 ký tự | Khách | 1. Gõ "p" | Vẫn 13 thẻ, gợi ý "Nhập ít nhất 2 ký tự" |
| TC-08 | UC-01 | Mở link có sẵn bộ lọc | Khách | 1. Mở `/?nganh=dich-vu` | Nút Dịch vụ tô đậm; 3 thẻ theo thứ tự Quản lý Spa Salon, Cho thuê Sân thể thao, Quản lý Phòng khám (Sắp ra mắt) |
| TC-09 | UC-01 | Tham số nhóm ngành không hợp lệ | Khách | 1. Mở `/?nganh=van-tai` 2. Mở `/?nganh=abc` | Cả hai lần đều hiển thị "Tất cả" với 13 thẻ, không báo lỗi |

### 2.2. Chi tiết demo

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-10 | UC-02 | Xem chi tiết | Khách | 1. Mở `/demos/pos-quan-cafe` 2. Xem mã nguồn trang và phản hồi API của trang | Có tên, nhãn F&B, nhãn Hoàn thiện, 5 ảnh, tính năng nổi bật, bảng tài khoản `admin`, `quanly`, `thungan` kèm hướng dẫn "Đăng nhập nhanh". Không có khung "Thông tin nội bộ"; mã nguồn và API không chứa mật khẩu demo, ghi chú nội bộ, link Swagger |
| TC-11 | UC-02 | Bấm Xem demo | Khách | 1. Ở trang chi tiết POS Quán Cafe, bấm "Xem demo" | Tab mới mở `http://localhost:3102`; tab danh mục vẫn giữ nguyên |
| TC-12 | UC-02 | Xem ảnh phóng to | Khách | 1. Bấm ảnh nhỏ thứ 2 2. Bấm phím → 3. Bấm Esc | Hộp xem ảnh mở ở ảnh 2, chú thích hiển thị; bước 2 sang ảnh 3; bước 3 đóng hộp. Trên 375×812 vuốt ngang chuyển được ảnh |
| TC-13 | UC-02 | Demo Sắp ra mắt | Khách | 1. Mở `/demos/quan-ly-phong-kham` | Không có nút "Xem demo"; có dòng "Demo đang hoàn thiện, gọi hotline để được giới thiệu trực tiếp"; dùng ảnh mặc định màu nhóm Dịch vụ |
| TC-14 | UC-02 | Demo không hiển thị | Khách | 1. Mở `/demos/hrm-cham-cong-tinh-luong` 2. Mở `/demos/khong-co` | Cả hai hiện trang "Không tìm thấy demo" có nút về danh mục |
| TC-15 | UC-02, UC-05 | Đổi slug, link cũ chuyển hướng | Quản lý, Khách | 1. Quản lý đổi slug Quản lý Kho thành `quan-ly-kho-xuat-nhap-ton`, lưu 2. Khách mở `/demos/quan-ly-kho` 3. Quản lý đặt slug của Quản lý Nhà trọ thành `quan-ly-kho` | Bước 1 có cảnh báo link cũ sẽ chuyển hướng. Bước 2 chuyển 301 tới `/demos/quan-ly-kho-xuat-nhap-ton`. Bước 3 báo slug đã được dùng, không lưu |

### 2.3. Thông tin nội bộ

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-16 | UC-03 | Thẻ tổng hợp | Nhân viên | 1. Đăng nhập nhanh vai trò Nhân viên | Vào Quản lý demo; thẻ: Tổng 18, Hoàn thiện 5, Demo được 7, Đang làm 4, Mới tạo 2, Đang hiển thị 13, Nổi bật 5/6. Không có nút "Thêm demo", "Sửa" |
| TC-17 | UC-03 | Khung thông tin nội bộ | Nhân viên | 1. Lọc F&B 2. Bấm POS Quán Cafe | Bảng còn 3 dòng. Trang chi tiết có khung "Thông tin nội bộ": trạng thái Hoàn thiện, người phụ trách, mật khẩu demo (che, có nút hiện và sao chép), link `https://localhost:7102/swagger`, repo, ghi chú, kịch bản, câu hỏi khách hay hỏi |
| TC-18 | UC-03 | Xem trước demo chưa công khai | Nhân viên | 1. Ở Quản lý demo bấm HRM Chấm công Tính lương | Trang chi tiết mở, có dải nhãn vàng "Xem trước, khách không thấy trang này" |
| TC-19 | UC-03 | Thiếu quyền nội bộ | Quản trị viên, Nhân viên | 1. Quản trị viên bỏ quyền `demos.view-internal` của vai trò Nhân viên 2. Đổi sang Nhân viên, mở chi tiết POS Quán Cafe 3. Mở `/demos/hrm-cham-cong-tinh-luong` 4. Bấm "Sao chép gửi khách" 5. Quản trị viên cấp lại quyền | Bước 2 không có khung nội bộ. Bước 3 hiện "Không tìm thấy demo". Bước 4 hộp sao chép không có ô "Kèm mật khẩu". Bước 5 khung nội bộ trở lại (đặt lại dữ liệu không khôi phục quyền, BR-SYS-09) |
| TC-20 | UC-04 | Sao chép gửi khách | Nhân viên | 1. Ở chi tiết POS Quán Cafe bấm "Sao chép gửi khách" 2. Để trống "Kèm mật khẩu", bấm "Sao chép" 3. Dán vào một ô văn bản | Báo "Đã sao chép". Nội dung đúng mẫu BR-17: dòng "POS Quán Cafe", "Xem demo: http://localhost:3102", "Tài khoản: admin (Quản trị viên), quanly (Quản lý quán), thungan (Thu ngân)", dòng cách vào, link `http://localhost:3101/demos/pos-quan-cafe`; không có dòng mật khẩu |
| TC-21 | UC-04 | Sao chép link danh mục đang lọc | Nhân viên | 1. Ở danh mục bấm "Dịch vụ" 2. Bấm "Sao chép link" 3. Mở link vừa chép ở cửa sổ ẩn danh | Link là `http://localhost:3101/?nganh=dich-vu`; cửa sổ ẩn danh hiện đúng 3 thẻ như TC-08 |

### 2.4. Thêm, sửa demo và ảnh chụp

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-22 | UC-05 | Thêm demo mới | Quản lý | 1. Quản lý demo → Thêm demo 2. Nhập mã `fnb-man-hinh-bep`, tên "Màn hình Bếp KDS", nhóm F&B, ý tưởng gốc 1.4, mô tả ngắn 92 ký tự, 4 tính năng, link `http://localhost:3119` 3. Lưu | Số thứ tự gợi ý 19; slug `man-hinh-bep-kds`; thư mục `19-fnb-man-hinh-bep`; trạng thái Mới tạo, Hiển thị tắt. Thẻ tổng hợp: Tổng 19, Mới tạo 3. Danh mục vẫn 13 thẻ |
| TC-23 | UC-05 | Mã dự án trùng | Quản lý | 1. Thêm demo với mã `fnb-pos-cafe` 2. Lưu | Báo lỗi tại ô mã dự án, không lưu |
| TC-24 | UC-05 | Vượt giới hạn độ dài | Quản lý | 1. Thêm demo, mô tả ngắn 170 ký tự, 7 tính năng nổi bật 2. Lưu | Báo lỗi tại ô mô tả ngắn (50–160 ký tự) và ô tính năng (tối đa 6); không lưu |
| TC-25 | UC-05 | Sửa demo đang hiển thị làm mất điều kiện | Quản lý | 1. Sửa Quản lý Nhà hàng, xóa bớt còn 2 tính năng 2. Lưu 3. Hoàn tác, xóa hết tài khoản demo 4. Lưu | Bước 2 và 4 đều bị từ chối với thông báo "Demo đang hiển thị, cần tắt hiển thị trước"; dữ liệu giữ nguyên |
| TC-26 | UC-05 | Xóa demo | Quản trị viên, Quản lý | 1. Quản trị viên chọn POS Quán Cafe 2. Chọn demo vừa tạo ở TC-22, bấm Xóa, xác nhận 3. Đổi sang Quản lý, xem bảng | Bước 1 nút Xóa vô hiệu, chú thích "Demo đã từng công khai, chỉ tắt hiển thị được". Bước 2 xóa thành công, Tổng về 18. Bước 3 không có nút Xóa |
| TC-27 | UC-06 | Tải ảnh hợp lệ | Quản lý | 1. Mở Quản lý Phòng khám, tab Ảnh chụp 2. Tải 3 ảnh PNG 1440×900, mỗi ảnh khoảng 600 KB, nhập chú thích 3. Lưu | 3 ảnh hiện theo thứ tự tải; ảnh đầu có nhãn "Đại diện"; thẻ Phòng khám trên danh mục dùng ảnh này |
| TC-28 | UC-06 | Ảnh không hợp lệ | Quản lý | 1. Ở Quản lý Phòng khám tải cùng lúc: JPG 3 MB, PNG rộng 1024 px, GIF 500 KB | Cả 3 bị từ chối với lý do riêng: "Ảnh vượt 2 MB", "Ảnh cần rộng tối thiểu 1280 px", "Chỉ nhận JPG, PNG, WebP" |
| TC-29 | UC-06 | Vượt 8 ảnh | Quản lý | 1. Mở Website Công ty (7 ảnh) 2. Chọn thêm 3 ảnh hợp lệ | Chỉ nhận ảnh đầu tiên trong 3 ảnh, báo "Mỗi demo tối đa 8 ảnh"; tổng 8 ảnh |
| TC-30 | UC-06 | Xóa ảnh cuối của demo công khai | Quản lý | 1. Mở Quản lý Nhà trọ (4 ảnh) 2. Xóa ảnh đại diện 3. Xóa tiếp 2 ảnh 4. Xóa ảnh cuối | Bước 2 ảnh kế tiếp thành ảnh đại diện. Bước 3 xóa được. Bước 4 bị từ chối: "Demo đang công khai cần ít nhất 1 ảnh chụp" |

### 2.5. Trạng thái, hiển thị, sắp xếp

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-31 | UC-07 | Chuyển Demo được khi thiếu ảnh | Quản lý | 1. Đặt lại dữ liệu 2. Đổi trạng thái Quản lý Phòng khám (đang hiển thị, 0 ảnh) sang Demo được | Từ chối, liệt kê "Cần ít nhất 1 ảnh chụp màn hình"; trạng thái vẫn Đang làm; thẻ vẫn "Sắp ra mắt" |
| TC-32 | UC-07 | Chuyển Demo được khi đủ điều kiện | Quản lý, Khách | 1. Làm TC-27 2. Đổi Quản lý Phòng khám sang Demo được 3. Khách tải lại danh mục | Lưu thành công, không hỏi lý do; tab Lịch sử có dòng "Đang làm → Demo được", người đổi `quanly`, thời điểm; ngày công khai đầu tiên là hôm nay. Thẻ Phòng khám có nút "Xem demo", nằm giữa Quản lý Kho và Cho thuê Sân thể thao |
| TC-33 | UC-07 | Lùi bậc cần lý do | Quản lý | 1. Đổi Website Bán hàng từ Hoàn thiện sang Demo được, để trống lý do 2. Nhập lý do "BE đang nâng cấp phiên bản .NET", lưu | Bước 1 nút Lưu vô hiệu. Bước 2 lưu thành công; thẻ đổi nhãn Demo được, vẫn nổi bật |
| TC-34 | UC-07 | Lùi về Đang làm khi đang công khai | Quản lý, Khách | 1. Đổi Quản lý Kho từ Demo được sang Đang làm, lý do "Đang sửa lỗi phiếu nhập" 2. Khách tải lại danh mục | Thẻ Quản lý Kho có nhãn "Sắp ra mắt", không có nút "Xem demo", đứng đầu phần Sắp ra mắt ở cuối danh mục (thứ tự 80 nhỏ nhất trong phần này); nút Bán lẻ vẫn ghi 3 |
| TC-35 | UC-07 | Bật hiển thị demo Mới tạo | Quản lý | 1. Mở Landing Page Bán hàng | Công tắc Hiển thị vô hiệu, chú thích "Chuyển sang Đang làm trở lên trước" |
| TC-36 | UC-07 | Tắt rồi bật lại hiển thị | Quản lý, Khách | 1. Tắt Hiển thị Quản lý Nhà trọ 2. Khách tải lại danh mục, mở `/demos/quan-ly-nha-tro` 3. Bật lại Hiển thị | Bước 2: còn 12 thẻ, không còn nút Bất động sản, link chi tiết hiện "Không tìm thấy demo". Bước 3: trở lại 13 thẻ |
| TC-37 | UC-08 | Đánh dấu nổi bật quá giới hạn | Quản lý | 1. Bật Sắp xếp 2. Đánh dấu nổi bật Cho thuê Sân thể thao 3. Đánh dấu Quản lý Nhà hàng 4. Đánh dấu Quản lý Trung tâm Ngoại ngữ | Bước 2: "Nổi bật 6/6". Bước 3: báo "Tối đa 6 demo nổi bật, hãy bỏ bớt một demo". Bước 4: ngôi sao vô hiệu vì demo Sắp ra mắt |
| TC-38 | UC-08 | Kéo thả sắp xếp | Quản lý, Khách | 1. Bật Sắp xếp 2. Kéo Website Công ty lên đầu bảng 3. Lưu thứ tự 4. Khách tải lại danh mục | Thứ tự đánh lại: Website Công ty 10, Danh mục Demo 20, POS Quán Cafe 30… Trên danh mục, Website Công ty đứng ngay sau nhóm demo nổi bật, trước Quản lý Nhà hàng (không nổi bật nên không vượt lên trên demo nổi bật) |
| TC-39 | UC-08 | Sắp xếp khi đang lọc | Quản lý | 1. Lọc nhóm F&B 2. Bấm "Sắp xếp" | Nút vô hiệu, chú thích "Bỏ lọc để sắp xếp toàn bộ danh sách" |

### 2.6. Nhóm ngành và thống kê

| Mã | UC | Tình huống | Vai trò | Các bước | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC-40 | UC-09 | Xóa nhóm ngành | Quản lý | 1. Xóa nhóm F&B 2. Xóa nhóm Vận tải | Bước 1 từ chối: "Nhóm đang có 3 demo". Bước 2 xóa thành công |
| TC-41 | UC-09 | Đổi tên nhóm | Quản lý, Khách | 1. Đổi tên F&B thành "Nhà hàng, cafe" 2. Khách tải lại danh mục | Nút hiện "Nhà hàng, cafe 3"; đường dẫn lọc vẫn `?nganh=fnb` |
| TC-42 | UC-10 | Lượt xem không tính trùng | Khách, Quản lý | 1. Ghi lại lượt xem, lượt mở hôm nay của POS Quán Cafe 2. Khách mở chi tiết POS 3 lần trong 5 phút, bấm "Xem demo" 2 lần 3. Quản lý xem Thống kê hôm nay | Lượt xem tăng 1, lượt mở tăng 1; tỉ lệ mở tính lại theo BR-15 (vd 137 lượt mở trên 412 lượt xem hiển thị 33,3%) |
| TC-43 | UC-10 | Người đăng nhập không tính lượt | Nhân viên, Quản lý | 1. Nhân viên mở chi tiết POS, bấm "Xem demo" 2. Quản lý xem Thống kê hôm nay | Số liệu không đổi so với trước bước 1 |

---

## 3. Biên bản chạy thử

| Ngày | Người test | Chế độ | Số TC đạt / tổng | Lỗi ghi nhận |
| :--- | :--- | :--- | :---: | :--- |
| | | | | |
