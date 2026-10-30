# FocusQuest Extension — Distraction Monitor (Manifest V3)

Extension này giúp phát hiện và gửi tên miền của tab trình duyệt đang xem tới ứng dụng desktop FocusQuest chạy tại `127.0.0.1:48123`.

## Hướng dẫn cài đặt trên Google Chrome / Cốc Cốc / Edge / Brave

1. Mở trình duyệt Chrome (hoặc Chromium browser).
2. Truy cập vào `chrome://extensions/` trên thanh địa chỉ.
3. Bật công tắc **Chế độ dành cho nhà phát triển** (Developer mode) ở góc trên bên phải.
4. Nhấn nút **Tải tiện ích đã giải nén** (Load unpacked).
5. Chọn thư mục `extension` nằm trong thư mục dự án `d:\TRACKER\extension`.
6. Extension sẽ xuất hiện trên thanh công cụ với tên **FocusQuest — Distraction Monitor**.

## Cách kiểm tra kết nối

1. Khởi chạy ứng dụng FocusQuest Desktop.
2. Bấm vào icon extension trên thanh công cụ Chrome.
3. Nhấn **Kiểm Tra Kết Nối**:
   - Nếu hiện huy hiệu xanh **Đã kết nối**, extension đã liên kết thành công với Desktop app.
   - Nếu hiện **Mất kết nối**, kiểm tra xem Desktop app đã mở chưa và cổng mặc định là `48123`.

## Hạn chế và phạm vi trình duyệt (Browser Compatibility & Limitations)
- **Hỗ trợ đầy đủ**: Google Chrome, Microsoft Edge, Brave, Cốc Cốc, Opera và các trình duyệt nền Chromium hỗ trợ Manifest V3.
- **Trình duyệt khác (Firefox, Safari)**: Firefox sử dụng WebExtensions API có cơ chế tương đồng nhưng cần nộp gói qua `about:debugging` hoặc cấu hình manifest tương ứng cho Gecko. Safari yêu cầu đóng gói Xcode app extension native của macOS. FocusQuest hiện tại tập trung hỗ trợ chuẩn Manifest V3 trên Chromium để đảm bảo tính ổn định và bảo mật cao nhất trên Windows.

## Bảo mật và quyền riêng tư
- **Chỉ thu thập tên miền**: Extension chỉ bóc tách `hostname` (ví dụ: `youtube.com`) của tab đang kích hoạt.
- **Không thu thập dữ liệu nhạy cảm**: Tuyệt đối không chụp màn hình, không ghi nhận phím bấm (keystroke), không đọc mật khẩu, không đọc cookies hay nội dung trang web.
- **Không lưu trữ hay gửi ra Internet**: Dữ liệu chỉ gửi qua kết nối cục bộ nội bộ máy tính `127.0.0.1:48123` được bảo vệ bằng mã token xác thực `X-FocusQuest-Token`.
