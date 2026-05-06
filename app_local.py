"""
╔══════════════════════════════════════════════════════════════╗
║       LUNAR HERITAGE AI  –  Local Backend (Ollama)          ║
║       Python · FastAPI · Model chạy 100% offline            ║
║                                                              ║
║  Yêu cầu: Ollama đang chạy + model thaydoneon đã tạo        ║
║  Chạy:    python run_local.py                                ║
╚══════════════════════════════════════════════════════════════╝
"""

import os, json, base64, httpx
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://localhost:11434")
LOCAL_MODEL  = os.getenv("LOCAL_MODEL", "thaydoneon")   # tên model đã tạo với Ollama
VISION_MODEL = os.getenv("VISION_MODEL", "llava:7b")    # model nhìn ảnh (tải riêng)

app = FastAPI(
    title="LUNAR HERITAGE AI (Local)",
    description="AI backend chạy hoàn toàn offline với Ollama",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  PYDANTIC MODELS
# ─────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    stream: bool = False

class ItineraryRequest(BaseModel):
    destination: str
    days: int
    budget: str
    interests: List[str]
    travelers: str
    start_from: Optional[str] = None

# ─────────────────────────────────────────────
#  HERITAGE DATA
# ─────────────────────────────────────────────
HERITAGE_DB = [
    {"id":1,"name":"Vịnh Hạ Long","province":"Quảng Ninh","lat":20.9101,"lng":107.1839,"unesco":1994},
    {"id":2,"name":"Cố đô Huế","province":"Thừa Thiên Huế","lat":16.4637,"lng":107.5909,"unesco":1993},
    {"id":3,"name":"Phố cổ Hội An","province":"Quảng Nam","lat":15.8801,"lng":108.3380,"unesco":1999},
    {"id":4,"name":"Ruộng bậc thang Sapa","province":"Lào Cai","lat":22.3364,"lng":103.8438,"unesco":None},
    {"id":5,"name":"Phong Nha – Kẻ Bàng","province":"Quảng Bình","lat":17.55,"lng":106.1333,"unesco":2003},
    {"id":6,"name":"Tràng An","province":"Ninh Bình","lat":20.2521,"lng":105.902,"unesco":2014},
    {"id":7,"name":"Thánh địa Mỹ Sơn","province":"Quảng Nam","lat":15.7636,"lng":108.123,"unesco":1999},
    {"id":8,"name":"Cao nguyên đá Đồng Văn","province":"Hà Giang","lat":23.2741,"lng":105.37,"unesco":2010},
    {"id":9,"name":"Phở Việt Nam","province":"Toàn quốc","lat":21.0285,"lng":105.8542,"unesco":2024},
    {"id":10,"name":"Vịnh Nha Trang","province":"Khánh Hòa","lat":12.2388,"lng":109.1967,"unesco":None},
    {"id":11,"name":"Làng gốm Bát Tràng","province":"Hà Nội","lat":20.9735,"lng":105.908,"unesco":None},
    {"id":12,"name":"Hoàng thành Thăng Long","province":"Hà Nội","lat":21.0359,"lng":105.8359,"unesco":2010},
]

# ─────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────
SYSTEM_CHAT = (
    "Bạn là Thầy Đồ Neon – AI chuyên gia về di sản văn hóa, lịch sử và du lịch Việt Nam, "
    "thuộc dự án LUNAR HERITAGE. Trả lời ngắn gọn bằng tiếng Việt, dùng emoji phù hợp, "
    "giọng thân thiện. Kết thúc bằng gợi mở khám phá thêm."
)

SYSTEM_VISION = (
    "Bạn là chuyên gia nhận diện di sản Việt Nam. Khi nhận ảnh, hãy: "
    "1) Xác định địa danh/di sản (nếu nhận ra) "
    "2) Mô tả những gì thấy trong ảnh "
    "3) Cung cấp thông tin lịch sử ngắn "
    "4) Gợi ý thời điểm tốt để thăm. Trả lời bằng tiếng Việt."
)

SYSTEM_ITINERARY = (
    "Bạn là chuyên gia lập kế hoạch du lịch di sản Việt Nam. Tạo lịch trình chi tiết, "
    "thực tế theo thông tin người dùng cung cấp. Trả lời bằng tiếng Việt, có cấu trúc rõ ràng "
    "theo từng ngày, gợi ý ẩm thực và mẹo hay."
)

async def ollama_chat(messages: list, system: str, stream: bool = False):
    """Gọi Ollama local API"""
    payload = {
        "model": LOCAL_MODEL,
        "messages": [{"role": "system", "content": system}] + messages,
        "stream": stream,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "num_predict": 800,
        }
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        if stream:
            async def gen():
                async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=payload) as r:
                    async for line in r.aiter_lines():
                        if line:
                            try:
                                d = json.loads(line)
                                tok = d.get("message", {}).get("content", "")
                                if tok:
                                    yield f"data: {json.dumps({'text': tok})}\n\n"
                                if d.get("done"):
                                    yield "data: [DONE]\n\n"
                            except Exception:
                                pass
            return gen()
        else:
            r = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            r.raise_for_status()
            return r.json()["message"]["content"]

async def check_ollama():
    """Kiểm tra Ollama đang chạy không"""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{OLLAMA_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            return True, models
    except Exception as e:
        return False, str(e)

# ─────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────

@app.get("/api/health")
async def health():
    ok, info = await check_ollama()
    return {
        "status": "online" if ok else "ollama_offline",
        "ollama": ok,
        "local_model": LOCAL_MODEL,
        "available_models": info if ok else [],
        "offline_mode": True,
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/heritage")
async def get_heritage():
    return {"data": HERITAGE_DB, "total": len(HERITAGE_DB)}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    ok, _ = await check_ollama()
    if not ok:
        raise HTTPException(503, "Ollama chưa chạy. Hãy chạy: ollama serve")

    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    if req.stream:
        gen = await ollama_chat(messages, SYSTEM_CHAT, stream=True)
        return StreamingResponse(gen, media_type="text/event-stream")

    reply = await ollama_chat(messages, SYSTEM_CHAT)
    return {"reply": reply, "model": LOCAL_MODEL, "offline": True}


@app.post("/api/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """Nhận diện ảnh – dùng llava:7b (cần tải riêng)"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Chỉ chấp nhận file ảnh")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Ảnh quá lớn (tối đa 5MB)")

    img_b64 = base64.standard_b64encode(content).decode()

    payload = {
        "model": VISION_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_VISION},
            {"role": "user", "content": "Đây là ảnh địa danh Việt Nam, hãy phân tích chi tiết.",
             "images": [img_b64]},
        ],
        "stream": False,
        "options": {"temperature": 0.6, "num_predict": 1000},
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            r.raise_for_status()
            analysis = r.json()["message"]["content"]
        return {"analysis": analysis, "model": VISION_MODEL}
    except Exception as e:
        # Fallback: dùng model text để mô tả tổng quát
        fallback = await ollama_chat(
            [{"role": "user", "content": "Hãy mô tả tổng quát về các di sản văn hóa Việt Nam và gợi ý tôi nên tìm hiểu về di sản nào."}],
            SYSTEM_CHAT
        )
        return {"analysis": f"⚠️ Cần cài llava:7b để nhận diện ảnh (ollama pull llava:7b).\n\n{fallback}", "model": "text_fallback"}


@app.post("/api/itinerary")
async def itinerary(req: ItineraryRequest):
    prompt = (
        f"Tạo lịch trình du lịch di sản chi tiết:\n"
        f"- Điểm đến: {req.destination}\n"
        f"- Số ngày: {req.days} ngày\n"
        f"- Ngân sách: {req.budget}\n"
        f"- Sở thích: {', '.join(req.interests)}\n"
        f"- Loại du khách: {req.travelers}\n"
        + (f"- Xuất phát từ: {req.start_from}\n" if req.start_from else "")
        + "Hãy chia theo từng ngày, có gợi ý ẩm thực và mẹo hay."
    )
    result = await ollama_chat([{"role": "user", "content": prompt}], SYSTEM_ITINERARY)
    return {"itinerary": {"raw": result}, "model": LOCAL_MODEL}


@app.post("/api/nearby")
async def nearby(lat: float, lng: float, radius_km: float = 500):
    import math
    def dist(la1, lo1, la2, lo2):
        R = 6371
        dlat = math.radians(la2-la1)
        dlng = math.radians(lo2-lo1)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(la1))*math.cos(math.radians(la2))*math.sin(dlng/2)**2
        return R*2*math.atan2(math.sqrt(a), math.sqrt(1-a))

    results = sorted(
        [{**h, "distance_km": round(dist(lat, lng, h["lat"], h["lng"]), 1)} for h in HERITAGE_DB],
        key=lambda x: x["distance_km"]
    )
    return {"nearby": [r for r in results if r["distance_km"] <= radius_km]}
