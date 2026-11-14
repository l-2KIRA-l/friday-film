"""TMDB movie search — multi-language with deduplication."""

from __future__ import annotations

import aiohttp

from config import TMDB_API_KEY

TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"
TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500"
LANGUAGES = ["uk-UA", "ru-RU", "en-US"]


async def search_movies(query: str) -> list[dict]:
    """Search TMDB in three languages, merge & deduplicate, return top 5."""
    if not TMDB_API_KEY:
        return []

    seen: dict[int, dict] = {}

    async with aiohttp.ClientSession() as session:
        for lang in LANGUAGES:
            params = {
                "api_key": TMDB_API_KEY,
                "query": query,
                "language": lang,
                "include_adult": "false",
            }
            try:
                async with session.get(TMDB_SEARCH_URL, params=params) as resp:
                    if resp.status != 200:
                        continue
                    data = await resp.json()
            except Exception:
                continue

            for item in data.get("results", []):
                tmdb_id = item.get("id")
                if tmdb_id and tmdb_id not in seen:
                    poster_path = item.get("poster_path")
                    release = item.get("release_date", "")
                    seen[tmdb_id] = {
                        "tmdb_id": tmdb_id,
                        "title": item.get("title", ""),
                        "original_title": item.get("original_title", ""),
                        "year": release[:4] if release else "",
                        "poster_url": (
                            f"{TMDB_POSTER_BASE}{poster_path}"
                            if poster_path
                            else ""
                        ),
                    }

    results = list(seen.values())[:5]
    return results
