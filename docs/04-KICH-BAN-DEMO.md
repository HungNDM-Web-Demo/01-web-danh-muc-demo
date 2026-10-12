# Kịch bản demo — Danh mục Demo

> Dùng trong ba tình huống: mở đầu buổi gặp khách để dẫn vào đúng demo của ngành; giới thiệu cho khách cần website danh mục sản phẩm, giải pháp; đào tạo nhân viên kinh doanh mới. Thời lượng 10–12 phút. Đi theo một ngày của nhân viên kinh doanh: chuẩn bị, gặp khách, gửi link, quản lý cập nhật demo mới.

---

## 1. Chuẩn bị trước buổi demo

- [ ] Mở sẵn link danh mục, thử "Đăng nhập nhanh" cả 3 vai trò
- [ ] Đặt lại dữ liệu demo (thanh công cụ demo → Đặt lại dữ liệu) để thẻ tổng hợp về đúng số mẫu: 18 demo, 13 đang hiển thị, 5 nổi bật
- [ ] Mở một cửa sổ ẩn danh (hoặc điện thoại) cho các bước vai trò Khách, vì khách không đăng nhập
- [ ] Kiểm tra demo POS Quán Cafe (`http://localhost:3102`) đang chạy, vì bước 5 sẽ bấm "Xem demo"
- [ ] Chuẩn bị sẵn 3 ảnh chụp màn hình PNG rộng từ 1280 px cho demo Quản lý Phòng khám (bước 8)
- [ ] Mở Zalo trên máy tính để dán thử nội dung "Sao chép gửi khách" (gửi cho chính mình)

| Link | Ghi chú |
| :--- | :--- |
| FE | `http://localhost:3101` hoặc link online |
| Swagger | `https://localhost:7101/swagger` (khi khách hỏi về tích hợp) |

| Tài khoản | Vai trò | Dùng để cho xem |
| :--- | :--- | :--- |
| `admin` | Quản trị viên | Phân quyền, thương hiệu |
| `quanly` | Quản lý | Thêm, sửa demo, ảnh chụp, trạng thái, hiển thị, nổi bật, thống kê |
| `nhanvien` | Nhân viên kinh doanh | Thẻ tổng hợp, thông tin nội bộ, sao chép gửi khách |
| (không cần) | Khách | Trang danh mục, trang chi tiết, mở demo |

Mật khẩu: giá trị `DEMO_PASSWORD` trong `.env`, hoặc bấm "Đăng nhập nhanh".

---

## 2. Câu chuyện demo

> Mở đầu: "Công ty em có 18 demo thuộc 8 ngành. Thay vì gửi anh/chị 18 đường link và 18 bộ tài khoản, em gom hết vào một trang. Em đi đúng một ngày làm việc của nhân viên kinh doanh bên em để anh/chị thấy trang này chạy thế nào."

| # | Vai trò | Thao tác | Điểm cần nhấn mạnh |
| :---: | :--- | :--- | :--- |
| 1 | Nhân viên kinh doanh | Đăng nhập nhanh vai trò Nhân viên; trang Quản lý demo mở ra với thẻ tổng hợp: 5 Hoàn thiện, 7 Demo được, 4 Đang làm, 2 Mới tạo | Nhìn một màn hình biết ngay demo nào mang đi gặp khách được, không phải hỏi đội dev |
| 2 | Nhân viên kinh doanh | Lọc F&B, mở POS Quán Cafe; khung "Thông tin nội bộ" hiện mật khẩu, kịch bản 12 bước, câu hỏi khách hay hỏi | 5 phút trước buổi gặp là ôn xong kịch bản; nhân viên mới cũng trình bày được |
| 3 | Khách | Mở trang danh mục ở cửa sổ ẩn danh: 13 thẻ, 5 demo nổi bật đứng đầu, 2 thẻ "Sắp ra mắt" ở cuối | Một link duy nhất, không cần đăng nhập, khách thấy toàn bộ giải pháp công ty có |
| 4 | Khách | Bấm "F&B" còn 3 demo; gõ "qr goi mon" (không dấu) còn đúng Menu QR Gọi món | Lọc theo ngành, gõ không dấu vẫn tìm đúng; xem tốt trên điện thoại |
| 5 | Khách | Mở chi tiết POS Quán Cafe: xem ảnh phóng to, tính năng, bảng tài khoản; bấm "Xem demo", đăng nhập nhanh vai trò Thu ngân | Từ danh mục tới demo chạy thật chỉ 2 lần bấm; trang công khai không lộ mật khẩu |
| 6 | Khách | Bấm "Dịch vụ": thấy Quản lý Phòng khám gắn nhãn "Sắp ra mắt", không có nút Xem demo | Khách thấy cả lộ trình sản phẩm; demo chưa xong không bị bấm nhầm trước mặt khách |
| 7 | Nhân viên kinh doanh | Quay lại cửa sổ đã đăng nhập, ở POS Quán Cafe bấm "Sao chép gửi khách", dán vào Zalo | Gửi đúng link, tài khoản, hướng dẫn trong 3 giây, không gõ tay sai |
| 8 | Quản lý | Đổi vai trò sang Quản lý; chuyển Quản lý Phòng khám sang "Demo được": hệ thống báo "Cần ít nhất 1 ảnh chụp màn hình"; tải 3 ảnh, chuyển lại thành công | Có kiểm tra đủ thông tin trước khi công khai; mọi lần đổi trạng thái đều lưu lịch sử |
| 9 | Quản lý | Bật "Sắp xếp", đánh dấu nổi bật Phòng khám (6/6), kéo lên đầu; thử đánh dấu thêm demo thứ 7 bị chặn | Chủ động đẩy demo mới; giới hạn 6 nổi bật giữ trang gọn |
| 10 | Khách | Tải lại cửa sổ ẩn danh: Phòng khám đứng đầu danh mục, có nút "Xem demo" | Cập nhật ngay, không cần lập trình viên |
| 11 | Quản lý | Mở Thống kê: lượt xem 30 ngày, top demo, tỉ lệ mở demo theo nhóm ngành | Biết ngành nào khách quan tâm nhất để ưu tiên làm demo tiếp |
| 12 | Quản trị viên | Đổi sang Quản trị viên, bỏ quyền "Xem thông tin nội bộ" của Nhân viên; đổi về Nhân viên thấy khung nội bộ biến mất | Phân quyền tới từng phần của trang; cộng tác viên bán hàng chỉ thấy phần công khai |

> Kết: "Trang anh/chị vừa xem chính là một website danh mục. Nếu công ty mình có nhiều sản phẩm, giải pháp hoặc dự án cần giới thiệu, bên em làm được trang tương tự, có khu nội bộ riêng cho đội kinh doanh."

---

## 3. Câu hỏi khách hay hỏi

| Câu hỏi | Trả lời gợi ý |
| :--- | :--- |
| Các demo này là sản phẩm làm sẵn hay làm theo yêu cầu? | Mỗi demo là một bản chuẩn chạy được. Khi triển khai, bên em khảo sát quy trình của anh/chị, điều chỉnh rồi nhập dữ liệu thật. Có bản chuẩn sẵn nên thời gian triển khai ngắn hơn làm từ đầu. |
| Dữ liệu trong demo có phải thật không? Tôi bấm thử có ảnh hưởng gì không? | Toàn bộ là dữ liệu mẫu. Hệ thống tự đặt lại theo lịch, anh/chị cứ thao tác thoải mái. |
| Tôi muốn tự xem lại sau buổi gặp được không? | Được. Em gửi link và tài khoản qua Zalo ngay bây giờ; vào trang đăng nhập bấm "Đăng nhập nhanh" là dùng được. |
| Ngành của tôi chưa có demo thì sao? | Em ghi nhận ngành và quy trình của anh/chị. Trong lúc chờ, em cho xem demo gần nhất, vd ngành gym xem demo Spa Salon vì cùng kiểu đặt lịch, gói dịch vụ. |
| Demo "Sắp ra mắt" khi nào có? | Em xem trạng thái nội bộ và báo lại ngày cụ thể; khi demo công khai em gửi link cho anh/chị. |
| Chi phí triển khai một hệ thống như demo là bao nhiêu? | Tùy phạm vi và mức điều chỉnh. Bên em báo giá sau buổi khảo sát, tách rõ phần có sẵn và phần làm thêm. |
| Làm được trang danh mục như thế này cho sản phẩm của công ty tôi không? | Được. Đây là dạng website catalog: lọc theo nhóm, trang chi tiết có ảnh, thông số, nút liên hệ hoặc nhận báo giá; có khu nội bộ cho đội kinh doanh như anh/chị vừa thấy. |
| Xem trên điện thoại được không? | Được. Trang danh mục thiết kế cho điện thoại trước, khách mở link Zalo là xem ngay. |

---

## 4. Sau buổi demo

- [ ] Ghi lại ngành của khách, các demo khách đã xem và yêu cầu thêm vào `01-TONG-QUAN-NGHIEP-VU.md` của demo tương ứng
- [ ] Gửi khách nội dung "Sao chép gửi khách" của các demo đã xem (không kèm mật khẩu, khách dùng "Đăng nhập nhanh")
- [ ] Nếu ngành của khách chưa có demo, đề xuất thêm vào `ZDOCS/02-KE-HOACH/DANH-SACH-Y-TUONG.md`
- [ ] Báo quản lý nếu demo nào gặp lỗi trong buổi gặp để chuyển trạng thái hoặc tắt hiển thị
- [ ] Cấp lại quyền "Xem thông tin nội bộ" cho vai trò Nhân viên nếu đã bỏ ở bước 12 (đặt lại dữ liệu không khôi phục phân quyền)
