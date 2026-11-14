"""FastAPI API router — all /api endpoints."""

from __future__ import annotations

import hashlib
import hmac
import io
import json
import random
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote

import aiohttp
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

import database as db
import tmdb as tmdb_module
from config import ADMIN_TELEGRAM_ID, BOT_TOKEN, PHOTOS_DIR, POSTERS_DIR, AVATARS_DIR

router = APIRouter(prefix="/api")


# ── Telegram initData validation ──────────────────────────────────────

def validate_init_data(init_data: str) -> dict | None:
    """Validate Telegram WebApp initData. Returns parsed user dict or None."""
    if not init_data or not BOT_TOKEN:
        return None
    try:
        parsed = parse_qs(init_data, keep_blank_values=True)
        received_hash = parsed.get("hash", [None])[0]
        if not received_hash:
            return None

        # Build data-check-string: sorted key=value pairs excluding hash
        items = []
        for key, values in parsed.items():
            if key == "hash":
                continue
            items.append(f"{key}={values[0]}")
        items.sort()
        data_check_string = "\n".join(items)

        # HMAC chain
        secret_key = hmac.new(
            b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256
        ).digest()
        computed_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        user_json = parsed.get("user", [None])[0]
        if user_json:
            return json.loads(unquote(user_json))
        return None
    except Exception:
        return None


def _extract_user(request: Request) -> dict:
    """Extract and validate Telegram user from Authorization header or fallback to admin."""
    auth = request.headers.get("Authorization", "")
    init_data = ""
    if auth.startswith("tma "):
        init_data = auth[4:]
    elif auth:
        init_data = auth

    if init_data:
        user = validate_init_data(init_data)
        if user:
            return user

    # Fallback to admin user for browser preview / local testing
    return {"id": ADMIN_TELEGRAM_ID, "first_name": "Кирило"}


def _extract_user_from_form(init_data: str | None, request: Request) -> dict:
    """Extract user from form or header or fallback."""
    if init_data:
        user = validate_init_data(init_data)
        if user:
            return user
    return _extract_user(request)


# ── GET /api/movies ───────────────────────────────────────────────────

@router.get("/movies")
async def get_movies():
    movies = await db.get_unwatched_movies()
    result = []
    for m in movies:
        result.append({
            "id": m["id"],
            "title": m["title"],
            "poster_url": f"/api/posters/{m['id']}.jpg",
            "added_by": {
                "telegram_id": m.get("telegram_id"),
                "first_name": m.get("first_name", "Учасник"),
                "avatar_url": f"/api/avatar/{m.get('telegram_id')}" if m.get("telegram_id") else None,
            },
            "added_at": m.get("added_at", ""),
        })
    return {"movies": result}


# ── POST /api/movies ─────────────────────────────────────────────────

@router.post("/movies")
async def add_movie(
    request: Request,
    title: str = Form(...),
    telegram_init_data: str | None = Form(None),
    poster: UploadFile | None = File(None),
    tmdb_poster_url: str | None = Form(None),
):
    tg_user = _extract_user_from_form(telegram_init_data, request)
    user = await db.get_or_create_user(tg_user["id"], tg_user.get("first_name", "Учасник"))

    now = datetime.now(timezone.utc).isoformat()
    movie = await db.add_movie(title, None, user["id"], now)
    movie_id = movie["id"]

    poster_path = POSTERS_DIR / f"{movie_id}.jpg"

    if poster and poster.filename:
        content = await poster.read()
        poster_path.write_bytes(content)
    elif tmdb_poster_url:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(tmdb_poster_url) as resp:
                    if resp.status == 200:
                        poster_path.write_bytes(await resp.read())
        except Exception:
            pass

    # Notify group
    try:
        from bot import notify_movie_added
        await notify_movie_added(title, user.get("first_name", "Учасник"))
    except Exception:
        pass

    return {
        "success": True,
        "movie": {
            "id": movie_id,
            "title": title,
            "poster_url": f"/api/posters/{movie_id}.jpg",
        },
    }


# ── GET /api/movies/search ───────────────────────────────────────────

@router.get("/movies/search")
async def search_movies(q: str = ""):
    if not q.strip():
        return {"results": []}
    results = await tmdb_module.search_movies(q.strip())
    return {"results": results}


# ── POST /api/wheel/spin ─────────────────────────────────────────────

@router.post("/wheel/spin")
async def wheel_spin(request: Request):
    tg_user = _extract_user(request)
    if tg_user.get("id") != ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Only admin can spin the wheel")

    movies = await db.get_unwatched_movies()
    if not movies:
        raise HTTPException(status_code=400, detail="No movies to spin")

    winning_index = random.randint(0, len(movies) - 1)
    winner = movies[winning_index]

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    history_id = await db.mark_watched(winner["id"], now)

    # Notify group
    try:
        from bot import notify_movie_selected
        await notify_movie_selected(winner["title"])
    except Exception:
        pass

    return {
        "winner": {
            "id": winner["id"],
            "title": winner["title"],
            "poster_url": f"/api/posters/{winner['id']}.jpg",
            "added_by": {"first_name": winner.get("first_name", "")},
        },
        "winning_index": winning_index,
        "history_id": history_id,
    }


# ── GET /api/history ─────────────────────────────────────────────────

@router.get("/history")
async def get_history():
    entries = await db.get_history()
    result = []
    for e in entries:
        photos = await db.get_photos_for_history(e["history_id"])
        result.append({
            "id": e["history_id"],
            "movie": {
                "id": e["movie_id"],
                "title": e["title"],
                "poster_url": f"/api/posters/{e['movie_id']}.jpg",
            },
            "watched_at": e.get("watched_at", ""),
            "proposed_by": {
                "first_name": e.get("first_name", "Учасник"),
                "avatar_url": f"/api/avatar/{e.get('telegram_id')}" if e.get("telegram_id") else None,
            },
            "photos": [
                {"id": p["id"], "url": f"/api/photos/{p['id']}.jpg"}
                for p in photos
            ],
        })
    return {"history": result}


# ── POST /api/history/{id}/photos ─────────────────────────────────────

@router.post("/history/{history_id}/photos")
async def upload_photos(
    history_id: int,
    photos: list[UploadFile] = File(...),
):
    entry = await db.get_history_entry(history_id)
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    existing = await db.count_photos_for_history(history_id)
    allowed = 3 - existing
    if allowed <= 0:
        raise HTTPException(status_code=400, detail="Maximum 3 photos already uploaded")

    uploaded = []
    for photo in photos[:allowed]:
        content = await photo.read()
        photo_id = await db.add_photo(history_id, "")
        photo_path = PHOTOS_DIR / f"{photo_id}.jpg"
        photo_path.write_bytes(content)
        # Update path in DB
        conn = await db.get_db()
        await conn.execute(
            "UPDATE watch_photos SET photo_path = ? WHERE id = ?",
            (str(photo_path), photo_id),
        )
        await conn.commit()
        uploaded.append({"id": photo_id, "url": f"/api/photos/{photo_id}.jpg"})

    return {"success": True, "photos": uploaded}


# ── GET /api/posters/{movie_id}.jpg ───────────────────────────────────

@router.get("/posters/{movie_id}.jpg")
async def serve_poster(movie_id: int):
    path = POSTERS_DIR / f"{movie_id}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Poster not found")
    return FileResponse(path, media_type="image/jpeg")


# ── GET /api/photos/{photo_id}.jpg ────────────────────────────────────

@router.get("/photos/{photo_id}.jpg")
async def serve_photo(photo_id: int):
    path = PHOTOS_DIR / f"{photo_id}.jpg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(path, media_type="image/jpeg")


# ── GET /api/avatar/{telegram_id} ────────────────────────────────────

@router.get("/avatar/{telegram_id}")
async def serve_avatar(telegram_id: int):
    cached = AVATARS_DIR / f"{telegram_id}.jpg"
    if cached.exists():
        return FileResponse(cached, media_type="image/jpeg")

    # Fetch from Telegram Bot API
    if not BOT_TOKEN:
        raise HTTPException(status_code=404, detail="No bot token")

    try:
        async with aiohttp.ClientSession() as session:
            # Get user profile photos
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUserProfilePhotos"
            async with session.get(url, params={"user_id": telegram_id, "limit": 1}) as resp:
                data = await resp.json()
                if not data.get("ok") or not data["result"]["photos"]:
                    raise HTTPException(status_code=404, detail="No avatar")

            file_id = data["result"]["photos"][0][-1]["file_id"]

            # Get file path
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/getFile"
            async with session.get(url, params={"file_id": file_id}) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    raise HTTPException(status_code=404, detail="Cannot get file")
                file_path = data["result"]["file_path"]

            # Download
            url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=404, detail="Cannot download avatar")
                content = await resp.read()
                cached.write_bytes(content)

        return FileResponse(cached, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Avatar fetch failed")


# ── GET /api/history/{history_id}/download ────────────────────────────

@router.get("/history/{history_id}/download")
async def download_photos(history_id: int):
    entry = await db.get_history_entry(history_id)
    if not entry:
        raise HTTPException(status_code=404, detail="History entry not found")

    photos = await db.get_photos_for_history(history_id)
    if not photos:
        raise HTTPException(status_code=404, detail="No photos to download")

    title = entry.get("title", "movie").replace(" ", "_")
    watched = entry.get("watched_at", "unknown")
    zip_name = f"{title}_{watched}.zip"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, p in enumerate(photos, 1):
            photo_path = PHOTOS_DIR / f"{p['id']}.jpg"
            if photo_path.exists():
                zf.write(photo_path, f"{title}_{i}.jpg")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )


# ── GET /api/history/download/all ────────────────────────────────────

@router.get("/history/download/all")
async def download_all_memories():
    entries = await db.get_history()
    buf = io.BytesIO()
    total_files = 0

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for entry in entries:
            history_id = entry["history_id"]
            title = entry.get("title", "movie").replace(" ", "_")
            watched = entry.get("watched_at", "unknown")
            folder = f"{watched}_{title}"

            # Include movie poster
            poster_path = POSTERS_DIR / f"{entry['movie_id']}.jpg"
            if poster_path.exists():
                zf.write(poster_path, f"{folder}/poster.jpg")
                total_files += 1

            # Include attached watch photos
            photos = await db.get_photos_for_history(history_id)
            for i, p in enumerate(photos, 1):
                photo_path = PHOTOS_DIR / f"{p['id']}.jpg"
                if photo_path.exists():
                    zf.write(photo_path, f"{folder}/photo_{i}.jpg")
                    total_files += 1

    if total_files == 0:
        raise HTTPException(status_code=404, detail="No memories or photos to download yet")

    buf.seek(0)
    zip_name = f"Friday_Films_Memories_{datetime.now().strftime('%Y-%m-%d')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )
