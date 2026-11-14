"""Seed database with sample movies and posters for immediate preview."""

import asyncio
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import aiohttp
from config import DATA_DIR, POSTERS_DIR, PHOTOS_DIR, AVATARS_DIR, ensure_dirs
import database as db

SAMPLE_MOVIES = [
    {
        "title": "Інтерстеллар",
        "poster_url": "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        "added_by": "Кирило",
        "tg_id": 8200555770,
    },
    {
        "title": "Початок (Inception)",
        "poster_url": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
        "added_by": "Сестра 1",
        "tg_id": 111111111,
    },
    {
        "title": "Дюна: Частина друга",
        "poster_url": "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        "added_by": "Сестра 2",
        "tg_id": 222222222,
    },
    {
        "title": "Оппенгеймер",
        "poster_url": "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        "added_by": "Кузен",
        "tg_id": 333333333,
    },
    {
        "title": "Людина-павук: Крізь всесвіт",
        "poster_url": "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
        "added_by": "Кирило",
        "tg_id": 8200555770,
    },
    {
        "title": "Матриця",
        "poster_url": "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        "added_by": "Кузинка",
        "tg_id": 444444444,
    },
]


async def seed():
    ensure_dirs()
    print("🌱 Seeding initial sample movies...")

    async with aiohttp.ClientSession() as session:
        for item in SAMPLE_MOVIES:
            user = await db.get_or_create_user(item["tg_id"], item["added_by"])
            now = datetime.now(timezone.utc).isoformat()
            movie = await db.add_movie(item["title"], None, user["id"], now)
            movie_id = movie["id"]

            poster_path = POSTERS_DIR / f"{movie_id}.jpg"
            if not poster_path.exists():
                try:
                    async with session.get(item["poster_url"]) as resp:
                        if resp.status == 200:
                            poster_path.write_bytes(await resp.read())
                            print(f"  ✓ Downloaded poster for: {item['title']}")
                except Exception as e:
                    print(f"  ✗ Failed to download poster for {item['title']}: {e}")

    # Add 1 watched movie with photo to memories
    history = await db.get_history()
    if not history:
        user = await db.get_or_create_user(8200555770, "Кирило")
        movie = await db.add_movie("Гаррі Поттер і філософський камінь", None, user["id"], "2026-11-07T20:00:00")
        poster_path = POSTERS_DIR / f"{movie['id']}.jpg"
        if not poster_path.exists():
            try:
                url = "https://image.tmdb.org/t/p/w500/wuMc08IPKEatv9rnMNXvIDxqP4W.jpg"
                async with session.get(url) as resp:
                    if resp.status == 200:
                        poster_path.write_bytes(await resp.read())
            except Exception:
                pass

        hist_id = await db.mark_watched(movie["id"], "2026-11-07")
        print(f"  ✓ Added sample memory: Гаррі Поттер")

    await db.close_db()
    print("✅ Seeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
