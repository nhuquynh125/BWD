"""
LUNAR HERITAGE AI – Khởi động server
Chạy: python run.py
"""
import os
from dotenv import load_dotenv

load_dotenv()   # Đọc file .env

import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    env  = os.getenv("ENV", "development")
    reload = env == "development"

    print(f"""
╔══════════════════════════════════════════════╗
║        LUNAR HERITAGE AI  –  Backend         ║
║                                              ║
║  URL:  http://localhost:{port}                  ║
║  Docs: http://localhost:{port}/docs             ║
║  ENV:  {env:<39}║
╚══════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level="info",
    )
