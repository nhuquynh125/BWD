# 🌕 LUNAR HERITAGE – Hướng dẫn tạo AI riêng (Fine-tune + Offline)

## Tổng quan quy trình

```
[Colab T4 GPU]          [Máy tính của nhóm]
Dataset JSONL  ──→  Fine-tune Llama 3.2  ──→  File .gguf  ──→  Ollama  ──→  FastAPI  ──→  Website
   (có sẵn)        (3–5 giờ, miễn phí)     (tải về)       (offline)   (backend)   (ai.html)
```

---

## PHẦN 1 – FINE-TUNE TRÊN GOOGLE COLAB (miễn phí)

### Bước 1.1 – Mở Colab
1. Vào **https://colab.research.google.com**
2. Upload file `LUNAR_HERITAGE_Finetune.ipynb`
3. Chọn **Runtime → Change runtime type → T4 GPU** ⚡

### Bước 1.2 – Upload dataset
Trong ô số 5 của notebook, upload file `heritage_dataset.jsonl`

### Bước 1.3 – Chạy từng ô theo thứ tự
```
Ô 1 → Ô 2 → Ô 3 → ... → Ô 10
```
⏱ Tổng thời gian: **3–5 giờ** (để máy chạy, không cần trực)

### Bước 1.4 – Tải model về
Ô 10 sẽ tự động tải file `lunar_heritage_model.zip` về máy.
Giải nén sẽ có file: `unsloth.Q4_K_M.gguf` (~2GB)

---

## PHẦN 2 – CÀI OLLAMA (chạy model offline)

### Bước 2.1 – Cài Ollama
```bash
# Windows: Tải tại https://ollama.com/download/windows
# Mac:
brew install ollama
# Linux:
curl -fsSL https://ollama.com/install.sh | sh
```

### Bước 2.2 – Đặt file đúng vị trí
```
lunar_ai_v2/
├── lunar_heritage_gguf/
│   └── unsloth.Q4_K_M.gguf   ← file tải từ Colab
└── Modelfile                  ← có sẵn trong repo
```

### Bước 2.3 – Tạo model Thầy Đồ Neon
```bash
cd lunar_ai_v2
ollama create thaydoneon -f Modelfile
```

### Bước 2.4 – Test model
```bash
ollama run thaydoneon "Vịnh Hạ Long được UNESCO công nhận năm nào?"
```
Nếu model trả lời đúng → thành công! 🎉

### Bước 2.5 – (Tùy chọn) Thêm nhận diện ảnh
```bash
ollama pull llava:7b   # ~4GB, cần thêm thời gian tải
```

---

## PHẦN 3 – CHẠY BACKEND FASTAPI

### Bước 3.1 – Cài thư viện
```bash
pip install fastapi uvicorn httpx python-multipart
```

### Bước 3.2 – Khởi động Ollama (terminal 1)
```bash
ollama serve
# Giữ terminal này mở
```

### Bước 3.3 – Chạy FastAPI (terminal 2)
```bash
cd lunar_ai_v2/backend
uvicorn app_local:app --host 0.0.0.0 --port 8000 --reload
```

### Bước 3.4 – Kiểm tra hoạt động
Mở trình duyệt: **http://localhost:8000/api/health**

Kết quả mong đợi:
```json
{
  "status": "online",
  "ollama": true,
  "local_model": "thaydoneon",
  "offline_mode": true
}
```

---

## PHẦN 4 – KẾT NỐI VỚI WEBSITE

Mở file `ai.html`, tìm dòng:
```javascript
const API = 'http://localhost:8000';
```
Giữ nguyên nếu chạy local, đổi thành URL server nếu deploy.

---

## PHẦN 5 – THÊM DỮ LIỆU (tùy chọn)

Để model hiểu thêm, mở `heritage_dataset.jsonl` và thêm các dòng theo format:
```json
{"messages":[
  {"role":"system","content":"Bạn là Thầy Đồ Neon..."},
  {"role":"user","content":"Câu hỏi về di sản..."},
  {"role":"assistant","content":"Câu trả lời chi tiết..."}
]}
```

Mỗi cặp hỏi-đáp = 1 dòng. Sau khi thêm, chạy lại notebook Colab.

---

## Lỗi thường gặp

| Lỗi | Giải pháp |
|-----|-----------|
| `ollama: command not found` | Cài lại Ollama từ ollama.com |
| `model thaydoneon not found` | Chạy `ollama create thaydoneon -f Modelfile` |
| `Connection refused port 11434` | Chạy `ollama serve` trước |
| Colab bị ngắt kết nối | Mở lại, chạy lại từ ô checkpoint đã lưu |
| File .gguf không tìm thấy | Kiểm tra đường dẫn trong Modelfile |

---

## Nói với ban giám khảo

> *"Nhóm chúng tôi đã fine-tune mô hình ngôn ngữ lớn Llama 3.2 (3B tham số) trên tập dữ liệu hỏi đáp về di sản văn hóa Việt Nam do nhóm tự xây dựng. Model sau fine-tune có weights riêng, chạy hoàn toàn offline trên thiết bị cục bộ thông qua Ollama và được phục vụ qua API FastAPI. Đây là mô hình AI thuộc sở hữu hoàn toàn của nhóm, không phụ thuộc vào bất kỳ dịch vụ AI thương mại nào."*
