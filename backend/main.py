"""Entry point — runs FastAPI + aiogram polling together."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure backend/ is on sys.path so local imports work
sys.path.insert(0, str(Path(__file__).resolve().parent))

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from config import ensure_dirs, WEBAPP_DIR, SOUNDS_DIR
from api import router as api_router
from bot import bot, get_dispatcher
from database import close_db

app = FastAPI(title="Friday Film")

# Mount API
app.include_router(api_router)

# Mount sounds (before the catch-all webapp mount)
if SOUNDS_DIR.exists():
    app.mount("/sounds", StaticFiles(directory=str(SOUNDS_DIR)), name="sounds")

# Mount webapp as static at "/" (catch-all, must be last)
if WEBAPP_DIR.exists():
    app.mount("/", StaticFiles(directory=str(WEBAPP_DIR), html=True), name="webapp")


@app.on_event("startup")
async def startup():
    ensure_dirs()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


async def _run_bot():
    """Run aiogram polling with resilient auto-reconnect."""
    while True:
        try:
            dp = get_dispatcher()
            await dp.start_polling(bot, skip_updates=True)
        except Exception as e:
            print(f"⚠️ Telegram bot polling warning: {e}. Retrying in 15s...")
            await asyncio.sleep(15)


async def _run_api():
    """Run uvicorn programmatically."""
    config = uvicorn.Config(app, host="0.0.0.0", port=8080, log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


async def main():
    ensure_dirs()
    await asyncio.gather(
        _run_bot(),
        _run_api(),
    )


if __name__ == "__main__":
    asyncio.run(main())
