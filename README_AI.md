# 🌕 LUNAR HERITAGE AI – Hướng dẫn cài đặt

## Cấu trúc thư mục

```
lunar_ai_backend/
│
├── app.py           ← FastAPI backend (AI engine)
├── run.py           ← Script khởi động server
├── requirements.txt ← Thư viện Python cần cài
├── .env.example     ← Mẫu file cấu hình
├── ai.html          ← Trang AI (đặt cùng folder với index.html)
└── README.md        ← File này
```

---

## BƯỚC 1 – Cài đặt Python & thư viện

```bash
# Kiểm tra Python (cần 3.10+)
python --version

# Tạo môi trường ảo (khuyến nghị)
python -m venv venv

# Kích hoạt (Windows)
venv\Scripts\activate

# Kích hoạt (Mac/Linux)
source venv/bin/activate

# Cài thư viện
pip install -r requirements.txt
```

---

## BƯỚC 2 – Cấu hình API Key

```bash
# Sao chép file mẫu
cp .env.example .env
```

Mở file `.env`, điền API key của bạn:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxx
```

> 🔑 Lấy API key tại: https://console.anthropic.com/

---

## BƯỚC 3 – Chạy server

```bash
python run.py
```

Terminal sẽ hiển thị:
```
╔══════════════════════════════════════════════╗
║        LUNAR HERITAGE AI  –  Backend         ║
║                                              ║
║  URL:  http://localhost:8000                  ║
║  Docs: http://localhost:8000/docs             ║
╚══════════════════════════════════════════════╝
```

---

## BƯỚC 4 – Đặt file HTML đúng chỗ

Sao chép `ai.html` vào cùng folder với `index.html` của dự án:

```
lunar-heritage/
├── index.html
├── vinh-ha-long.html
├── hoi-an.html
├── ai.html          ← đặt ở đây
├── ha-long.jpg
└── ...
```

Thêm link vào navbar của `index.html`:
```html
<a href="ai.html">🧑‍🏫 AI Thầy Đồ</a>
```

---

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET`  | `/api/health` | Kiểm tra server |
| `GET`  | `/api/heritage` | Danh sách di sản |
| `POST` | `/api/chat` | Chat với Thầy Đồ Neon |
| `POST` | `/api/analyze-image` | Nhận diện ảnh di sản |
| `POST` | `/api/itinerary` | Tạo lịch trình du lịch |
| `POST` | `/api/nearby` | Tìm di sản gần vị trí |

📚 Xem tài liệu API đầy đủ tại: `http://localhost:8000/docs`

---

## Deploy lên Render (miễn phí)

1. Push code lên GitHub
2. Vào https://render.com → New → Web Service
3. Chọn repo, cài đặt:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Thêm Environment Variable: `ANTHROPIC_API_KEY = sk-ant-...`
5. Đổi `const API = 'http://localhost:8000'` trong `ai.html`
   thành URL Render của bạn, ví dụ:
   `const API = 'https://lunar-heritage-ai.onrender.com'`

---

## Lỗi thường gặp

| Lỗi | Giải pháp |
|-----|-----------|
| `ANTHROPIC_API_KEY chưa được cấu hình` | Tạo file `.env` và điền key |
| `Connection refused` | Chạy `python run.py` trước |
| CORS error | Server chưa chạy hoặc URL sai trong `ai.html` |
| `413 File too large` | Ảnh upload > 5MB |
