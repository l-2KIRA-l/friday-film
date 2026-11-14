"""Configuration loaded from environment variables."""

import os
from pathlib import Path

from dotenv import load_dotenv

# Project root is one level up from backend/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
ADMIN_TELEGRAM_ID: int = int(os.getenv("ADMIN_TELEGRAM_ID", "8200555770"))
TMDB_API_KEY: str = os.getenv("TMDB_API_KEY", "")
WEBAPP_URL: str = os.getenv("WEBAPP_URL", "")

# Data directories (relative to project root)
DATA_DIR = PROJECT_ROOT / "data"
POSTERS_DIR = DATA_DIR / "posters"
PHOTOS_DIR = DATA_DIR / "photos"
AVATARS_DIR = DATA_DIR / "avatars"
DB_PATH = DATA_DIR / "friday_film.db"
CHATS_JSON = DATA_DIR / "chats.json"

# Webapp directory (sibling of backend)
WEBAPP_DIR = PROJECT_ROOT / "webapp"
SOUNDS_DIR = WEBAPP_DIR / "sounds"


def ensure_dirs() -> None:
    """Create data directories on startup."""
    for d in (DATA_DIR, POSTERS_DIR, PHOTOS_DIR, AVATARS_DIR):
        d.mkdir(parents=True, exist_ok=True)
