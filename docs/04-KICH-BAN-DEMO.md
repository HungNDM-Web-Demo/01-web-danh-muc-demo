# Kịch bản demo — Danh mục Demo

> Dùng trong hai tình huống: mở đầu buổi gặp khách để dẫn vào đúng demo của ngành; giới thiệu cho khách cần website danh mục sản phẩm, giải pháp. Thời lượng 10–12 phút. Đi theo một ngày làm việc của Mạnh Hùng: chuẩn bị, gặp khách, gửi link, cập nhật demo mới. Chỉ có hai vai trò: Khách (không đăng nhập) và Quản trị viên (`admin`).

---

## 1. Chuẩn bị trước buổi demo

- [ ] Mở sẵn link danh mục, thử "Đăng nhập nhanh" vai trò Quản trị viên
- [ ] Đặt lại dữ liệu demo (thanh công cụ demo → Đặt lại dữ liệu) để thẻ tổng hợp về đúng số mẫu: 18 demo, 14 đang hiển thị, 5 nổi bật
- [ ] Mở một cửa sổ ẩn danh (hoặc điện thoại) cho các bước vai trò Khách, vì khách không đăng nhập
- [ ] Kiểm tra demo POS Quán Cafe (`https://pum-pos-cafe.vercel.app`) mở được, vì bước 5 sẽ bấm "Xem demo"
- [ ] Chuẩn bị sẵn 3 ảnh chụp màn hình PNG rộng từ 1280 px cho demo Quản lý Phòng khám (bước 8)
- [ ] Mở Zalo trên máy tính để dán thử nội dung "Sao chép gửi khách" (gửi cho chính mình)

| Link | Ghi chú |
| :--- | :--- |
| FE | `http://localhost:3101` hoặc link online |
| Swagger | `https://localhost:7101/swagger` (khi khách hỏi về tích hợp) |

| Tài khoản | Vai trò | Dùng để cho xem |
| :--- | :--- | :--- |
| `admin` | Quản trị viên | Thẻ tổng hợp, thông tin nội bộ, sao chép gửi khách, thêm, sửa demo, ảnh chụp, trạng thái, hiển thị, nổi bật, thống kê |
| (không cần) | Khách | Trang danh mục, trang chi tiết, mở demo, hotline, Zalo |

Mật khẩu: giá trị `DEMO_PASSWORD` trong `.env`, hoặc bấm "Đăng nhập nhanh".

---

## 2. Câu chuyện demo

> Mở đầu: "Bên em có 18 demo thuộc 8 ngành. Thay vì gửi anh/chị 18 đường link và 18 bộ tài khoản, em gom hết vào một trang. Em đi đúng một ngày làm việc của em để anh/chị thấy trang này chạy thế nào: trước khi gặp khách em xem gì, khách thấy gì, và em cập nhật demo mới ra sao."

| # | Vai trò | Thao tác | Điểm cần nhấn mạnh |
| :---: | :--- | :--- | :--- |
| 1 | Quản trị viên | Đăng nhập nhanh `admin`; trang Quản lý demo mở ra với thẻ tổng hợp: 5 Hoàn thiện, 8 Demo được, 4 Đang làm, 1 Mới tạo | Nhìn một màn hình biết ngay demo nào mang đi gặp khách được |
| 2 | Quản trị viên | Lọc F&B, mở POS Quán Cafe; khung "Thông tin nội bộ" hiện mật khẩu, kịch bản 12 bước, câu hỏi khách hay hỏi | 5 phút trước buổi gặp là ôn xong kịch bản, không phải lục tài liệu |
| 3 | Khách | Mở trang danh mục ở cửa sổ ẩn danh: 14 thẻ, 5 demo nổi bật đứng đầu, 2 thẻ "Sắp ra mắt" ở cuối | Một link duy nhất, không cần đăng nhập, khách thấy toàn bộ giải pháp PUM có |
| 4 | Khách | Bấm "F&B" còn 3 demo; gõ "qr goi mon" (không dấu) còn đúng Menu QR Gọi món | Lọc theo ngành, gõ không dấu vẫn tìm đúng; xem tốt trên điện thoại |
| 5 | Khách | Mở chi tiết POS Quán Cafe: xem ảnh phóng to, tính năng, bảng tài khoản; bấm "Xem demo", đăng nhập nhanh vai trò Thu ngân | Từ danh mục tới demo chạy thật chỉ 2 lần bấm; trang công khai không lộ mật khẩu |
| 6 | Khách | Bấm "Dịch vụ": thấy Quản lý Phòng khám gắn nhãn "Sắp ra mắt", không có nút Xem demo; bấm hotline, Zalo ở đầu trang | Khách thấy cả lộ trình sản phẩm; muốn xem sâu hơn thì gọi hoặc nhắn Zalo ngay trên trang |
| 7 | Quản trị viên | Quay lại cửa sổ đã đăng nhập, ở POS Quán Cafe bấm "Sao chép gửi khách", dán vào Zalo | Gửi đúng link, tài khoản, hướng dẫn trong 3 giây, không gõ tay sai |
| 8 | Quản trị viên | Chuyển Quản lý Phòng khám sang "Demo được": hệ thống báo "Cần ít nhất 1 ảnh chụp màn hình"; tải 3 ảnh, chuyển lại thành công | Có kiểm tra đủ thông tin trước khi công khai; mọi lần đổi trạng thái đều lưu lịch sử |
| 9 | Quản trị viên | Bật "Sắp xếp", đánh dấu nổi bật Phòng khám (6/6), kéo lên đầu; thử đánh dấu thêm demo thứ 7 bị chặn | Chủ động đẩy demo mới; giới hạn 6 nổi bật giữ trang gọn |
| 10 | Khách | Tải lại cửa sổ ẩn danh: Phòng khám đứng đầu danh mục, có nút "Xem demo" | Cập nhật ngay, không cần sửa code |
| 11 | Quản trị viên | Mở Thống kê: lượt xem 30 ngày, top demo, tỉ lệ mở demo theo nhóm ngành | Biết ngành nào khách quan tâm nhất để ưu tiên làm demo tiếp |
| 12 | Quản trị viên | Mở lại trang chi tiết POS Quán Cafe trong cửa sổ đã đăng nhập, rồi so với cửa sổ ẩn danh: cùng một trang, bên đăng nhập có thêm khung nội bộ, bên khách không có | Một trang phục vụ cả hai phía; phần nội bộ chỉ hiện khi đăng nhập `admin`, API công khai không trả mật khẩu |

> Kết: "Trang anh/chị vừa xem chính là một website danh mục. Nếu anh/chị có nhiều sản phẩm, giải pháp hoặc dự án cần giới thiệu, bên em làm được trang tương tự, có khu nội bộ riêng cho người quản lý."

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
| Em là sinh viên làm đồ án, dùng demo này được không? | Được. Mỗi demo có tài liệu nghiệp vụ, use case, test case và mã nguồn FE lẫn BE. Em chọn demo gần đề tài rồi trao đổi với anh qua Zalo để biết cần điều chỉnh gì. |
| Làm được trang danh mục như thế này cho sản phẩm của tôi không? | Được. Đây là dạng website catalog: lọc theo nhóm, trang chi tiết có ảnh, thông số, nút liên hệ hoặc nhận báo giá; có khu nội bộ cho người quản lý như anh/chị vừa thấy. |
| Xem trên điện thoại được không? | Được. Trang danh mục thiết kế cho điện thoại trước, khách mở link Zalo là xem ngay. |

---

## 4. Sau buổi demo

- [ ] Ghi lại ngành của khách, các demo khách đã xem và yêu cầu thêm vào `01-TONG-QUAN-NGHIEP-VU.md` của demo tương ứng
- [ ] Gửi khách nội dung "Sao chép gửi khách" của các demo đã xem (không kèm mật khẩu, khách dùng "Đăng nhập nhanh")
- [ ] Nếu ngành của khách chưa có demo, đề xuất thêm vào `ZDOCS/02-KE-HOACH/DANH-SACH-Y-TUONG.md`
- [ ] Demo nào gặp lỗi trong buổi gặp thì chuyển trạng thái hoặc tắt hiển thị ngay trên trang quản trị
- [ ] Đặt lại dữ liệu demo để thẻ tổng hợp và thứ tự nổi bật về đúng số mẫu cho buổi sau
