# 🌕 LUNAR HERITAGE – Mạng Xã Hội Du Lịch Di Sản Việt Nam

![Version](https://img.shields.io/badge/Version-6.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)
![Express](https://img.shields.io/badge/Express-v5-black.svg)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-white.svg)
![Three.js](https://img.shields.io/badge/3D-Three.js-black.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Lunar Heritage** là mạng xã hội đột phá kết hợp giữa nền tảng kết nối du lịch và công nghệ tương tác 3D WebGL, dành riêng cho việc quảng bá và bảo tồn Di sản văn hóa Việt Nam. Hệ thống tích hợp AI thông minh (Google Gemini), tính năng trò chuyện thời gian thực, bản đồ số, hệ thống gamification, đặt tour trực tuyến, trải nghiệm AR/VR và tái dựng di tích bằng AI.

---

## ✨ Tính Năng Nổi Bật

### 🌐 Mạng Xã Hội Đa Dạng
- **Đăng ký / Đăng nhập an toàn:** Xác thực bằng JWT, mã hóa mật khẩu với bcrypt.
- **Tương tác bài viết:** Khám phá feed bài viết, chia sẻ cảm nghĩ, tải ảnh lên, thả tim (like) và bình luận. Dữ liệu lưu trữ MongoDB.
- **Kết nối người dùng:** Tìm kiếm, xem hồ sơ, theo dõi (Follow/Unfollow) bạn bè. Quản lý hồ sơ cá nhân.
- **Real-time Chat:** Nhắn tin trực tiếp thời gian thực, lưu trữ và gửi ảnh qua Socket.io.
- **Thắp đèn lồng:** Tính năng cầu bình an ảo và chia sẻ câu chuyện tại các khu di tích lịch sử.

### 🗺️ Khám Phá & Quản Trị
- **Bản Đồ Tương Tác:** Khám phá trực quan các địa điểm di sản trên bản đồ Việt Nam sử dụng Leaflet.js.
- **Admin Dashboard:** Trang quản trị kiểm duyệt người dùng, quản lý bài viết và theo dõi hoạt động toàn hệ thống.

### 🏛️ Trải Nghiệm 3D Di Sản (WebGL)
Khám phá các di sản Việt Nam qua không gian 3D tương tác sống động xây dựng bằng Three.js:
- Vịnh Hạ Long, Cố đô Huế, Phố cổ Hội An, Ruộng bậc thang, Cao nguyên đá Đồng Văn, Hoàng thành Thăng Long, Phong Nha–Kẻ Bàng, Thánh địa Mỹ Sơn, Quần thể Tràng An, Thành Nhà Hồ.

### 📱 Hộ Chiếu Di Sản (Heritage Passport)
- Hệ thống hộ chiếu cá nhân ghi lại hành trình tham quan các di sản đã khám phá.
- Nhận tem (stamp) điện tử khi check-in tại mỗi địa điểm.

### 🎮 Gamification & Bảng Xếp Hạng
- **Điểm thưởng (XP):** Tích lũy kinh nghiệm qua mỗi hoạt động (đăng bài, like, bình luận, check-in di sản).
- **Huy hiệu (Badges):** Hệ thống thành tựu đa dạng được mở khóa tự động qua `GamificationService`.
- **Bảng xếp hạng (Leaderboard):** Xem thứ hạng trong cộng đồng theo điểm XP tích lũy.

### 🎟️ Đặt Tour & Vé Tham Quan (Booking)
- Tra cứu và đặt vé tham quan, tour du lịch trực tuyến tại các di sản.
- Quản lý lịch sử đặt tour cá nhân.

### 🥽 Trải Nghiệm AR/VR
- **AR View:** Xem di sản qua góc nhìn thực tế tăng cường (Augmented Reality) ngay trên trình duyệt.
- Hỗ trợ giao diện chuyên biệt cho thiết bị di động.

### 🤖 Tích Hợp AI & Kiến Trúc (Google Gemini)
Hệ thống AI của Lunar Heritage được thiết kế với luồng tương tác chặt chẽ, an toàn giữa Frontend và Backend:
- **Thầy Đồ Neon:** Chatbot AI am hiểu văn hóa, lịch sử Việt Nam.
- **Nhận diện ảnh AI:** Phân tích hình ảnh di sản tải lên để cung cấp thông tin lịch sử chi tiết.
- **Lên lịch trình AI:** Tự động tạo kế hoạch du lịch cá nhân hóa.
- **AI Phục Dựng (Reconstruction):** Phân tích ảnh di tích và dùng AI phác họa lại kiến trúc nguyên thủy.

**Kiến trúc xử lý & Tích hợp (AI Integration Architecture):**
1. **Frontend (Giao diện & Logic):** Lớp xử lý UI (`ai.html`, `ai.css`, `ai.js`) chịu trách nhiệm thu thập đầu vào (văn bản, ảnh, tùy chọn lịch trình). Sau đó, `ai.js` gọi qua `api.js` (Frontend API Client) để chuẩn hóa và đóng gói request gửi lên server.
2. **Data Validation (Lớp Bảo Mật):** Mọi dữ liệu truyền từ `api.js` lên server sẽ được kiểm duyệt qua `schemas.js`. Các Zod schemas (như `aiChatSchema`, `aiImageAnalysisSchema`) sẽ chặn dữ liệu xấu và dọn dẹp chống XSS trước khi đưa vào xử lý logic.
3. **Backend & AI Engine:** File `routes/aiRoutes.js` tiếp nhận dữ liệu hợp lệ, tương tác trực tiếp với API của Google Gemini (`@google/generative-ai`), trích xuất câu trả lời và định dạng JSON trả về cho Frontend.
4. **Fine-tuning AI:** Cung cấp dataset mẫu (`heritage_dataset.jsonl`) và Modelfile để huấn luyện, tối ưu độ chính xác của AI theo ngữ cảnh di sản Việt.

### 🌍 Đa Ngôn Ngữ (i18n)
- Hỗ trợ **Tiếng Việt** và **Tiếng Anh** (`locales/vi`, `locales/en`).
- Tự động phát hiện ngôn ngữ người dùng và cho phép chuyển đổi dễ dàng qua `i18n.js`.

### 🔒 Bảo Mật & Hiệu Năng
- **Helmet.js:** Bảo vệ HTTP headers tự động.
- **CSRF Protection:** Chống tấn công Cross-Site Request Forgery bằng `csurf`.
- **Rate Limiting:** Giới hạn tần suất request chống DDoS với `express-rate-limit`.
- **XSS Protection:** Lọc nội dung độc hại bằng `xss`.
- **Validation:** Kiểm tra dữ liệu đầu vào với `zod`.
- **Compression:** Nén response tự động với `compression`.
- **Logging:** Ghi log hệ thống chuyên nghiệp với `winston`.
- **Cron Jobs:** Tự động hóa tác vụ định kỳ với `node-cron`.
- **Image Processing:** Tối ưu hình ảnh upload bằng `sharp`.

---

## 🛠️ Công Nghệ & Kiến Trúc

| Layer | Công nghệ |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Map & 3D** | Leaflet.js, Three.js |
| **Backend** | Node.js, Express.js v5 |
| **Database** | MongoDB + Mongoose |
| **Authentication** | JWT, bcryptjs |
| **Real-time** | Socket.io v4 |
| **AI** | Google Gemini 2.0 Flash (`@google/generative-ai`) |
| **Security** | Helmet, csurf, express-rate-limit, xss, zod |
| **File Upload** | Multer, Sharp (image optimization) |
| **Logging** | Winston |
| **Scheduler** | node-cron |

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Động

### Yêu Cầu Hệ Thống
- **Node.js** phiên bản 18 trở lên
- **MongoDB** chạy local hoặc **MongoDB Atlas**

### Các Bước Thực Hiện

**1. Clone dự án & cài đặt thư viện**
```bash
git clone <repository-url>
cd web
npm install
```

**2. Cấu hình biến môi trường**
Sao chép file mẫu và điền thông tin:
```bash
cp .env.example .env
```

Nội dung file `.env`:
```env
# Port mặc định
PORT=8000

# Chuỗi kết nối MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/lunar_heritage

# Khóa bảo mật cho hệ thống JWT
JWT_SECRET=lunar-heritage-secret-key-super-secure

# API Key để sử dụng tính năng AI Thầy Đồ / Nhận diện ảnh
GEMINI_API_KEY=your_gemini_api_key_here
```

**3. Khởi tạo Dữ liệu mẫu (Tùy chọn)**
```bash
# Nạp dữ liệu di sản
node seed-heritage.js

# Nạp dữ liệu huy hiệu gamification
node seed-badges.js

# Khởi tạo cấu trúc MongoDB
node init-mongodb.js
```

**4. Khởi động Máy chủ**
```bash
# Production
npm start

# Development (auto-reload với nodemon)
npm run dev
```

**5. Trải Nghiệm Ứng Dụng**
Mở trình duyệt và truy cập: **[http://localhost:8000](http://localhost:8000)**

---

## 📂 Cấu Trúc Thư Mục

```text
/
├── server.js                  # Điểm khởi đầu Express, Socket.io, cấu hình middleware
├── db.js                      # Kết nối MongoDB với Mongoose
├── schemas.js                 # Zod validation schemas kiểm duyệt an toàn dữ liệu API
├── api.js                     # Frontend API Client: Cầu nối giao tiếp với Backend
├── ai.js                      # Frontend Logic: Xử lý giao diện và tương tác AI
├── auth.js                    # Middleware xác thực JWT
│
├── routes/                    # API Routes (MVC)
│   ├── authRoutes.js          #   Đăng ký, đăng nhập
│   ├── userRoutes.js          #   Hồ sơ, follow/unfollow, tìm kiếm
│   ├── postRoutes.js          #   Bài viết, like, bình luận
│   ├── heritageRoutes.js      #   Di sản, check-in, thông tin địa điểm
│   ├── bookingRoutes.js       #   Đặt tour, vé tham quan
│   ├── gamificationRoutes.js  #   XP, huy hiệu, bảng xếp hạng
│   ├── aiRoutes.js            #   Chatbot AI, nhận diện ảnh, lịch trình
│   ├── messageRoutes.js       #   Tin nhắn real-time
│   ├── lanternRoutes.js       #   Thắp đèn lồng
│   ├── passportRoutes.js      #   Hộ chiếu di sản
│   ├── adminRoutes.js         #   Quản trị hệ thống
│   ├── accountRoutes.js       #   Quản lý tài khoản
│   ├── settingsRoutes.js      #   Cài đặt người dùng
│   ├── friendRoutes.js        #   Kết bạn, gợi ý bạn bè
│   └── statsRoutes.js         #   Thống kê hệ thống
│
├── services/
│   ├── GamificationService.js # Logic điểm XP và huy hiệu
│   └── booking/               # Logic xử lý đặt tour
│
├── middlewares/               # Middleware bảo mật & xử lý
├── utils/                     # Tiện ích dùng chung
│
├── locales/                   # Đa ngôn ngữ
│   ├── vi/                    #   Tiếng Việt
│   └── en/                    #   Tiếng Anh
│
├── uploads/                   # Hình ảnh người dùng tải lên
│
├── *.html                     # Giao diện: index, explore, profile, di-san, booking,
│                              #   leaderboard, passport, ar-view, reconstruction, admin...
├── global.css                 # CSS toàn cục & design system
├── i18n.js                    # Module đa ngôn ngữ client-side
├── mobile-nav.js              # Navigation responsive
│
├── seed-heritage.js           # Script nạp dữ liệu di sản mẫu
├── seed-badges.js             # Script nạp dữ liệu huy hiệu
├── init-mongodb.js            # Script khởi tạo cấu trúc Database
├── heritage_dataset.jsonl     # Dataset fine-tuning AI di sản
├── Modelfile                  # Cấu hình Ollama model tùy chỉnh
│
├── manifest.json              # PWA Manifest
├── sw.js                      # Service Worker (offline support)
├── sitemap.xml                # SEO Sitemap
├── robots.txt                 # SEO Robots
└── .env                       # File cấu hình môi trường (không commit)
```

---

## 💡 Xử Lý Sự Cố Thường Gặp

| Lỗi | Nguyên nhân & Cách sửa |
|---|---|
| Không kết nối được Database | Đảm bảo MongoDB đang chạy và `MONGODB_URI` trong `.env` chính xác |
| Port 8000 đã được sử dụng | Đổi giá trị `PORT` trong `.env` |
| Chức năng AI báo lỗi | Kiểm tra `GEMINI_API_KEY` đã được điền chính xác |
| Lỗi tải ảnh | Kiểm tra thư mục `uploads/` có quyền đọc/ghi |
| CSRF Token mismatch | Xóa cache trình duyệt và đăng nhập lại |

---

## 🎯 Roadmap

### ✅ Đã Hoàn Thành
- [x] Hệ thống xác thực JWT
- [x] Mạng xã hội: đăng bài, like, bình luận, follow
- [x] Real-time Chat với Socket.io
- [x] Admin Dashboard quản trị hệ thống
- [x] Bản đồ tương tác Leaflet.js
- [x] Trải nghiệm 3D di sản với Three.js (10 địa điểm)
- [x] Chatbot AI "Thầy Đồ Neon" (Google Gemini)
- [x] Nhận diện ảnh AI & Lập lịch trình AI
- [x] **Gamification:** Điểm XP, huy hiệu, bảng xếp hạng
- [x] **Booking:** Đặt vé tham quan và tour du lịch
- [x] **Hộ chiếu di sản (Passport):** Tem check-in điện tử
- [x] **AR View:** Trải nghiệm thực tế tăng cường
- [x] **AI Phục dựng (Reconstruction):** Tái dựng kiến trúc di tích
- [x] **Đa ngôn ngữ (i18n):** Tiếng Việt & Tiếng Anh
- [x] PWA: Service Worker, offline support, installable
- [x] Bảo mật nâng cao: Helmet, CSRF, Rate Limiting, XSS, Zod
- [x] Logging chuyên nghiệp với Winston
- [x] Fine-tuning AI chuyên biệt về di sản Việt Nam

### 🚀 Giai Đoạn Tiếp Theo
- [ ] **WebXR:** Hỗ trợ kính VR thực thụ (Meta Quest, etc.)
- [ ] **Tối ưu Mobile 3D:** Cải thiện hiệu năng Three.js trên thiết bị cũ
- [ ] **Payment Gateway:** Tích hợp thanh toán trực tuyến cho booking
- [ ] **Push Notifications:** Thông báo đẩy mobile qua PWA
- [ ] **AI nâng cao:** Tích hợp mô hình fine-tuned vào chatbot

---

*© 2026 LUNAR HERITAGE – Cùng chung tay lan tỏa vẻ đẹp Di sản văn hóa Việt Nam* 🇻🇳
