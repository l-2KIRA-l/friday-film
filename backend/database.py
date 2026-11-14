"""SQLite database layer using aiosqlite."""

from __future__ import annotations

import aiosqlite

from config import DB_PATH

_db: aiosqlite.Connection | None = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name TEXT,
    avatar_file_id TEXT
);

CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    poster_path TEXT,
    added_by INTEGER REFERENCES users(id),
    added_at TEXT,
    is_watched INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie_id INTEGER REFERENCES movies(id),
    watched_at TEXT
);

CREATE TABLE IF NOT EXISTS watch_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    history_id INTEGER REFERENCES watch_history(id),
    photo_path TEXT
);
"""


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(str(DB_PATH))
        _db.row_factory = aiosqlite.Row
        await _db.executescript(SCHEMA)
        await _db.commit()
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


# ── User helpers ──────────────────────────────────────────────────────

async def get_or_create_user(telegram_id: int, first_name: str | None = None) -> dict:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)
    )
    row = await cursor.fetchone()
    if row:
        if first_name and row["first_name"] != first_name:
            await db.execute(
                "UPDATE users SET first_name = ? WHERE id = ?",
                (first_name, row["id"]),
            )
            await db.commit()
            cursor = await db.execute("SELECT * FROM users WHERE id = ?", (row["id"],))
            row = await cursor.fetchone()
        return dict(row)

    await db.execute(
        "INSERT INTO users (telegram_id, first_name) VALUES (?, ?)",
        (telegram_id, first_name),
    )
    await db.commit()
    cursor = await db.execute(
        "SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)
    )
    row = await cursor.fetchone()
    return dict(row)


# ── Movie helpers ─────────────────────────────────────────────────────

async def add_movie(title: str, poster_path: str | None, user_id: int, added_at: str) -> dict:
    db = await get_db()
    await db.execute(
        "INSERT INTO movies (title, poster_path, added_by, added_at) VALUES (?, ?, ?, ?)",
        (title, poster_path, user_id, added_at),
    )
    await db.commit()
    cursor = await db.execute("SELECT last_insert_rowid()")
    row = await cursor.fetchone()
    movie_id = row[0]
    cursor = await db.execute("SELECT * FROM movies WHERE id = ?", (movie_id,))
    row = await cursor.fetchone()
    return dict(row)


async def get_unwatched_movies() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        """
        SELECT m.*, u.telegram_id, u.first_name
        FROM movies m
        LEFT JOIN users u ON m.added_by = u.id
        WHERE m.is_watched = 0
        ORDER BY m.added_at DESC
        """
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_movie_by_id(movie_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM movies WHERE id = ?", (movie_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def delete_movie(movie_id: int) -> bool:
    db = await get_db()
    cursor = await db.execute("DELETE FROM movies WHERE id = ?", (movie_id,))
    await db.commit()
    return cursor.rowcount > 0


async def mark_watched(movie_id: int, watched_at: str) -> int:
    """Mark movie watched and create history entry. Returns history id."""
    db = await get_db()
    await db.execute("UPDATE movies SET is_watched = 1 WHERE id = ?", (movie_id,))
    await db.execute(
        "INSERT INTO watch_history (movie_id, watched_at) VALUES (?, ?)",
        (movie_id, watched_at),
    )
    await db.commit()
    cursor = await db.execute("SELECT last_insert_rowid()")
    row = await cursor.fetchone()
    return row[0]


# ── History helpers ───────────────────────────────────────────────────

async def get_history() -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        """
        SELECT wh.id as history_id, wh.watched_at,
               m.id as movie_id, m.title, m.poster_path,
               u.telegram_id, u.first_name
        FROM watch_history wh
        JOIN movies m ON wh.movie_id = m.id
        LEFT JOIN users u ON m.added_by = u.id
        ORDER BY wh.watched_at DESC
        """
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_history_entry(history_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute(
        """
        SELECT wh.id as history_id, wh.watched_at,
               m.id as movie_id, m.title, m.poster_path
        FROM watch_history wh
        JOIN movies m ON wh.movie_id = m.id
        WHERE wh.id = ?
        """,
        (history_id,),
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def get_photos_for_history(history_id: int) -> list[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM watch_photos WHERE history_id = ? ORDER BY id",
        (history_id,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def add_photo(history_id: int, photo_path: str) -> int:
    db = await get_db()
    await db.execute(
        "INSERT INTO watch_photos (history_id, photo_path) VALUES (?, ?)",
        (history_id, photo_path),
    )
    await db.commit()
    cursor = await db.execute("SELECT last_insert_rowid()")
    row = await cursor.fetchone()
    return row[0]


async def count_photos_for_history(history_id: int) -> int:
    db = await get_db()
    cursor = await db.execute(
        "SELECT COUNT(*) FROM watch_photos WHERE history_id = ?", (history_id,)
    )
    row = await cursor.fetchone()
    return row[0]


async def get_photo_by_id(photo_id: int) -> dict | None:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM watch_photos WHERE id = ?", (photo_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def get_unwatched_count() -> int:
    db = await get_db()
    cursor = await db.execute("SELECT COUNT(*) FROM movies WHERE is_watched = 0")
    row = await cursor.fetchone()
    return row[0]
