# 🎯 FocusQuest (Time-focus) — Minimal Study App With Virtual Pet

<div align="center">

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-45.0-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-33%20passed-success?logo=vitest&logoColor=white)

**Ứng dụng Desktop Windows tối ưu cho việc học tập, kết hợp Pomodoro Timer thông minh, Quản lý tác vụ, Thú cưng ảo tạo động lực và Tiện ích mở rộng chặn trang web xao nhãng.**

[Tính Năng Nổi Bật](#-tính-năng-nổi-bật) • [Cài Đặt & Khởi Chạy](#-cài-đặt--khởi-chạy) • [Cài Đặt Extension](#-cài-đặt-browser-extension) • [Build Ứng Dụng .EXE](#-đóng-gói--build-ứng-dụng-windows) • [Kiến Trúc & Công Nghệ](#-kiến-trúc--công-nghệ)

</div>

---

## 📖 Giới thiệu

**FocusQuest (Time-focus)** được xây dựng nhằm giải quyết bài toán mất tập trung khi học tập và làm việc trên máy tính. Bằng việc kết hợp phương pháp Pomodoro, hệ thống phân chia công việc theo từng chế độ học (`Calculation`, `Coding`, `Memorization`, `Mixed`), cùng thú cưng ảo (Virtual Pet) nuôi dưỡng sự kiên trì mà không gây áp lực trừng phạt, bạn sẽ dễ dàng bước vào trạng thái dòng chảy (*flow state*) và duy trì cảm hứng học tập mỗi ngày.

---

## ✨ Tính Năng Nổi Bật

### 1. 🎯 4 Chế Độ Học Tập Chuyên Biệt (Study Modes)
- **Calculation (Tính toán / Toán học)**: Tập trung vào giải bài tập logic, thời lượng tập trung cao.
- **Coding (Lập trình)**: Phiên học kéo dài hơn, tối ưu chu kỳ tập trung cho các tác vụ viết mã và gỡ lỗi.
- **Memorization (Ghi nhớ / Học thuộc)**: Nhịp độ Pomodoro ngắn, tăng tần suất nghỉ ngơi giúp củng cố trí nhớ ngắn và dài hạn.
- **Mixed (Tổng hợp)**: Cân bằng linh hoạt giữa đọc tài liệu và thực hành.

### 2. ⏱️ Focus Timer Thông Minh & Chống Mất Dữ Liệu
- **Đồng hồ đếm ngược trực quan**: Hiển thị rõ ràng thời gian còn lại, tiến độ phiên học.
- **Tạm dừng / Tiếp tục linh hoạt**: Kiểm soát nhịp độ khi có việc đột xuất.
- **Chế độ Overtime (Gia hạn thời gian)**: Tự động đếm tiếp khi hết giờ để bạn tiếp tục giữ nhịp tập trung mà không bị ngắt quãng.
- **Session Recovery (Khôi phục phiên tự động)**: Nếu lỡ tắt app hoặc máy khởi động lại, phiên học đang dang dở được bảo toàn và khôi phục ngay khi mở lại ứng dụng.

### 3. 🐾 Thú Cưng Ảo Đồng Hành (Virtual Pet & Positive Rewards)
- **Hệ thống nuôi dưỡng thú cưng**: Tích lũy **XP** và **Thức ăn (Food)** khi hoàn thành các phiên học và tác vụ.
- **Cho ăn & Lên cấp**: Nâng cấp thú cưng để mở khóa các trạng thái biểu cảm và các bạn thú cưng đồng hành mới.
- **Triết lý không áp lực (No Punishment)**: Không trừ điểm, không bỏ đói thú cưng làm bạn căng thẳng. Trải nghiệm tập trung hoàn toàn vào khuyến khích tích cực.

### 4. 🛡️ Giám Sát Xao Nhãng Với Tiện Ích Trình Duyệt (Browser Extension)
- **Tích hợp liền mạch**: Extension Manifest V3 dành cho Google Chrome, Edge, Brave, Cốc Cốc,...
- **Cảnh báo website phân tâm**: Phát hiện các trang mạng xã hội, giải trí (YouTube, Facebook, TikTok,...) khi đang trong phiên học và đưa ra nhắc nhở trực quan.
- **Bảo mật tuyệt đối**: Chỉ đọc tên miền (domain) đang xem, không chụp màn hình, không ghi nhận phím bấm, không đọc cookie hay dữ liệu cá nhân. Kết nối qua `127.0.0.1:48123` bảo vệ bằng mã token `X-FocusQuest-Token`.

### 5. 📋 Quản Lý Tác Vụ & Thống Kê Học Tập (Task Management)
- Tạo danh sách công việc theo mức độ khó, thời lượng mục tiêu.
- Sắp xếp thứ tự ưu tiên nhanh chóng.
- Ghi nhận chính xác số phút học thực tế (Real Study Time) hỗ trợ đánh giá hiệu suất.

---

## 🛠️ Yêu Cầu Hệ Thống (Prerequisites)

- **Hệ điều hành**: Windows 10 / 11 (64-bit)
- **Node.js**: Phiên bản 18 trở lên (khuyên dùng Node.js 20 LTS hoặc 22 LTS)
- **Trình quản lý gói**: `npm` đi kèm với Node.js
- **Trình duyệt (tùy chọn)**: Chrome / Edge / Brave / Cốc Cốc để dùng extension giám sát xao nhãng.

---

## 🚀 Cài Đặt & Khởi Chạy

### 1. Tải Mã Nguồn Về Máy
```bash
git clone https://github.com/mariongoc5454/Time-focus.git
cd Time-focus
```

### 2. Cài Đặt Thư Viện Dependencies
```bash
npm install
```

### 3. Khởi Chạy Ứng Dụng Ở Chế Độ Phát Triển (Development)
Mở 2 cửa sổ dòng lệnh (Terminal):

- **Terminal 1** (Khởi chạy Vite Renderer Server):
  ```bash
  npm run dev
  ```
- **Terminal 2** (Khởi chạy ứng dụng Electron Desktop):
  ```bash
  npm run dev:electron
  ```

*(Lưu ý trên Windows PowerShell: Nếu gặp lỗi script execution policy, sử dụng lệnh `npm.cmd run dev` và `npm.cmd run dev:electron`)*.

---

## 🧩 Cài Đặt Browser Extension (Tùy chọn)

Thư mục `extension/` chứa tiện ích mở rộng Chrome Manifest V3 giúp theo dõi và cảnh báo website phân tâm:

1. Mở trình duyệt Chrome / Edge / Brave / Cốc Cốc.
2. Truy cập vào `chrome://extensions/` (hoặc `edge://extensions/`).
3. Bật chế độ **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
4. Bấm nút **Tải tiện ích đã giải nén (Load unpacked)**.
5. Chọn thư mục `extension` nằm trong thư mục dự án `Time-focus/extension`.
6. Mở ứng dụng Desktop FocusQuest, sau đó bấm vào biểu tượng extension trên thanh công cụ trình duyệt để kiểm tra trạng thái **Đã kết nối (Connected)**.

---

## 📦 Đóng Gói & Build Ứng Dụng Windows (.EXE)

Khi muốn đóng gói thành bộ cài đặt hoàn chỉnh cho Windows:

### Build bản cài đặt (.exe Installer qua NSIS):
```bash
npm run dist
```
File cài đặt sẽ được tạo tại thư mục `release/` (ví dụ: `FocusQuest Setup 1.0.0.exe`).

### Build bản Portable (Chạy ngay không cần cài đặt):
```bash
npm run dist:portable
```

---

## 🧪 Kiểm Thử & Kiểm Tra Kiểu (Testing & Quality)

Dự án bao gồm 13 bộ kiểm thử tự động (Unit & Integration Tests) với hơn 33 test case bao phủ toàn bộ các luồng nghiệp vụ quan trọng:

```bash
# Chạy toàn bộ test suite với Vitest
npm run test

# Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript
npm run typecheck
```

---

## 🏛️ Kiến Trúc & Công Nghệ Sử Dụng

```
Time-focus/
├── build/                # Tài nguyên icon ứng dụng (.ico, .png)
├── electron/             # Mã nguồn Electron Main Process & Native Backend
│   ├── db/               # SQLite database layer, schema migrations, WAL mode
│   ├── services/         # Logic nghiệp vụ (Task, Pet, Timer, Reward Ledger, Anti-cheat)
│   ├── server/           # Local HTTP server xác thực Token cho browser extension
│   ├── main.ts           # Điểm khởi đầu của ứng dụng Electron
│   └── preload.ts        # Typed IPC bridge an toàn giữa Main & Renderer
├── extension/            # Chrome Extension MV3 giám sát tên miền phân tâm
├── public/               # Tài nguyên công khai cho Renderer
├── src/                  # React Frontend (Renderer Process)
│   ├── components/       # Các UI components (Timer, Tasks, Pet, Settings,...)
│   ├── context/          # State management (Global context)
│   ├── styles/           # CSS thiết kế hiện đại, typography & dark mode
│   └── App.tsx           # Component chính
├── tests/                # Bộ kiểm thử tự động toàn diện (Vitest)
├── package.json          # Cấu hình dự án & scripts
├── tsconfig.json         # Cấu hình TypeScript
└── vite.config.ts        # Cấu hình Vite bundler
```

- **Electron 45**: Bảo mật nghiêm ngặt (`contextIsolation: true`, `nodeIntegration: false`, IPC định kiểu rõ ràng).
- **React 19 & TypeScript 5**: Trải nghiệm giao diện mượt mà, trực quan, tin cậy.
- **SQLite (better-sqlite3)**: Chế độ WAL (Write-Ahead Logging), lưu trữ offline 100%, bảo toàn dữ liệu.
- **Idempotent Reward Ledger**: Cơ chế sổ cái chống gian lận thưởng XP và thức ăn cho thú cưng.
- **Vitest**: Khung kiểm thử tự động hiệu năng cao.

---

## 📄 Giấy Phép (License)

Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
Tự do sử dụng, chỉnh sửa và đóng góp cho cộng đồng!
