# 🌕 LUNAR HERITAGE – Mạng Xã Hội Du Lịch Di Sản Việt Nam

![Version](https://img.shields.io/badge/Version-5.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)
![Three.js](https://img.shields.io/badge/3D-Three.js-black.svg)

**Lunar Heritage** là mạng xã hội đột phá kết hợp giữa nền tảng kết nối du lịch và công nghệ tương tác 3D WebGL, dành riêng cho việc quảng bá và bảo tồn Di sản văn hóa Việt Nam. Hệ thống tích hợp AI thông minh (Google Gemini), tính năng trò chuyện thời gian thực, bản đồ số và trải nghiệm không gian 3D sống động.

---

## ✨ Tính Năng Nổi Bật

### 🌐 Mạng Xã Hội Đa Dạng
- **Đăng ký / Đăng nhập an toàn:** Hệ thống xác thực bằng JWT, mã hóa mật khẩu với bcrypt. Hỗ trợ đăng nhập nhanh bằng tài khoản Google.
- **Tương tác bài viết:** Khám phá feed bài viết, chia sẻ cảm nghĩ, tải ảnh lên, thả tim (like) và bình luận. Tất cả dữ liệu được lưu trữ trên MongoDB.
- **Kết nối người dùng:** Tìm kiếm, xem hồ sơ, theo dõi (Follow/Unfollow) bạn bè. Quản lý hồ sơ cá nhân.
- **Real-time Chat:** Nhắn tin trực tiếp thời gian thực, lưu trữ và gửi ảnh thông qua công nghệ Socket.io.
- **Thắp đèn lồng:** Tính năng "Thắp đèn lồng" cầu bình an ảo và chia sẻ câu chuyện tại các khu di tích lịch sử.

### 🗺️ Khám Phá Bản Đồ & Quản Trị
- **Bản Đồ Tương Tác (Interactive Map):** Khám phá trực quan các địa điểm di sản trên bản đồ Việt Nam sử dụng Leaflet.js.
- **Admin Dashboard:** Trang quản trị dành riêng cho admin để kiểm duyệt người dùng, quản lý bài viết và theo dõi hoạt động toàn hệ thống.

### 🏛️ Trải Nghiệm 3D Di Sản (WebGL)
Khám phá các di sản Việt Nam qua không gian 3D tương tác sống động được xây dựng bằng Three.js:
- Vịnh Hạ Long, Cố đô Huế, Phố cổ Hội An, Ruộng bậc thang,...

### 🤖 Tích Hợp AI (Google Gemini)
- **Thầy Đồ Neon:** Chatbot AI am hiểu văn hóa, lịch sử Việt Nam, sẵn sàng đồng hành và giải đáp thắc mắc của bạn.
- **Nhận diện ảnh AI:** Phân tích hình ảnh chụp di sản do người dùng tải lên để cung cấp thông tin lịch sử chi tiết.
- **Lên lịch trình AI:** Tự động tạo kế hoạch du lịch cá nhân hóa.

---

## 🛠️ Công Nghệ & Kiến Trúc

- **Frontend:** HTML5, CSS3, Tailwind CSS (CDN), JavaScript Vanilla.
- **Map & 3D Engine:** Leaflet.js, Three.js.
- **Backend:** Node.js, Express.js (v5).
- **Database:** MongoDB (Sử dụng `mongoose`).
- **Authentication:** JWT (JSON Web Tokens), `google-auth-library`.
- **Real-time:** Socket.io.
- **AI Integration:** Google Gemini 2.0 Flash API.

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Động

### Yêu Cầu Hệ Thống
- Đã cài đặt **Node.js** (Phiên bản 18 trở lên).
- Đã cài đặt **MongoDB** (chạy local) hoặc sử dụng **MongoDB Atlas**.

### Các Bước Thực Hiện

**1. Cài đặt thư viện**
Mở terminal và di chuyển vào thư mục dự án `web`, sau đó chạy lệnh:
```bash
npm install
```

**2. Cấu hình biến môi trường**
Tạo file `.env` ở thư mục gốc với nội dung tham khảo sau:

```env
# Port mặc định
PORT=8000

# Chuỗi kết nối MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/lunar_heritage

# Khóa bảo mật cho hệ thống JWT
JWT_SECRET=lunar-heritage-secret-key-super-secure

# API Key để sử dụng tính năng AI Thầy Đồ / Nhận diện ảnh
GEMINI_API_KEY=your_gemini_api_key_here

# Google Client ID để hỗ trợ chức năng đăng nhập qua Google
GOOGLE_CLIENT_ID=your_google_client_id_here
```

**3. Khởi tạo Dữ liệu mẫu (Tùy chọn)**
Để nạp dữ liệu di sản cơ bản vào MongoDB, bạn có thể chạy:
```bash
node seed-heritage.js
```

**4. Khởi động Máy chủ**
```bash
npm start
# Hoặc chạy ở chế độ dev: npm run dev
```

**5. Trải Nghiệm Ứng Dụng**
Mở trình duyệt web và truy cập vào địa chỉ: **[http://localhost:8000](http://localhost:8000)**

---

## 📂 Cấu Trúc Thư Mục Chính

```text
/
 ├── server.js            # Khởi tạo Express server, chứa API Endpoints và Socket.io
 ├── db.js                # Xử lý kết nối MongoDB với Mongoose
 ├── auth.js              # Middleware xử lý xác thực người dùng (JWT)
 ├── seed-heritage.js     # Script khởi tạo dữ liệu mẫu cho Database
 ├── uploads/             # Thư mục lưu trữ hình ảnh người dùng tải lên
 ├── *.html               # Các file giao diện như index, explore, profile, admin, các trang di sản 3D...
 ├── *.js & *.css         # Các script logic phía client và file stylesheet
 └── .env                 # File cấu hình môi trường hệ thống
```

---

## 💡 Xử Lý Sự Cố Thường Gặp (Troubleshooting)

- **Lỗi không kết nối được Database:** Đảm bảo MongoDB đang chạy và `MONGODB_URI` trong `.env` là chính xác.
- **Lỗi Port 8000 đã được sử dụng:** Đổi giá trị `PORT` trong file `.env`.
- **Chức năng AI báo lỗi:** Đảm bảo bạn đã điền chính xác `GEMINI_API_KEY`.
- **Lỗi tải ảnh:** Kiểm tra xem thư mục `uploads/` có quyền đọc/ghi.

---

## 🎯 Định Hướng Phát Triển Tính Năng (Roadmap)

### ✅ Đã Hoàn Thành
- [x] Chuyển đổi dữ liệu cứng sang dữ liệu động từ Database MongoDB.
- [x] Xây dựng trang Quản trị (Admin Dashboard) để kiểm duyệt và quản lý người dùng.
- [x] Bản đồ tương tác (Interactive Map) tích hợp Leaflet.js.
- [x] Tích hợp Push Notifications và Real-time Chat qua Socket.io.

### 🚀 Giai đoạn Tiếp Theo (Giai đoạn 2 & 3)
- [ ] **Tối ưu hóa:** Cải thiện hiệu năng render Three.js trên các thiết bị di động cũ.
- [ ] **Đa ngôn ngữ (i18n):** Hỗ trợ thêm tiếng Anh để quảng bá di sản Việt Nam với bạn bè quốc tế.
- [ ] **Hệ thống Gamification:** Thêm điểm thưởng, huy hiệu (badges) và bảng xếp hạng (leaderboard).
- [ ] **Tích hợp Booking:** Liên kết API cho phép đặt vé tham quan di tích, tour du lịch.
- [ ] **Công nghệ AR/VR:** Hỗ trợ WebXR cho trải nghiệm kính thực tế ảo và AR nhận diện di tích.
- [ ] **AI Phục dựng:** Phân tích ảnh di tích bị tàn phá và dùng AI phác họa kiến trúc nguyên thủy.

---

*© 2026 LUNAR HERITAGE - Cùng chung tay lan tỏa vẻ đẹp Di sản văn hóa Việt Nam*
