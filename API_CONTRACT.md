# Friday Film — API Contract

Base URL: `/api`

All responses are JSON. Mini App authenticates via Telegram `initData` passed in `Authorization: tma <initData>` header.

## Endpoints

### GET /api/movies
Returns all unwatched movies (for the wheel + grid).
```json
{
  "movies": [
    {
      "id": 1,
      "title": "Інтерстеллар",
      "poster_url": "/api/posters/1.jpg",
      "added_by": {
        "telegram_id": 8200555770,
        "first_name": "Кирило",
        "avatar_url": "/api/avatar/8200555770"
      },
      "added_at": "2026-11-14T20:00:00Z"
    }
  ]
}
```

### POST /api/movies
Add a new movie. Multipart form data.
- `title` (string, required)
- `poster` (file, optional — if TMDB poster is used, send `tmdb_poster_url` instead)
- `tmdb_poster_url` (string, optional)
- `telegram_init_data` (string, required — for auth)

Response:
```json
{
  "success": true,
  "movie": { "id": 2, "title": "...", "poster_url": "..." }
}
```

### GET /api/movies/search?q=inception
Search TMDB for movie posters. Returns top 5 results.
```json
{
  "results": [
    {
      "tmdb_id": 27205,
      "title": "Inception",
      "original_title": "Inception",
      "year": "2010",
      "poster_url": "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg"
    }
  ]
}
```

### POST /api/wheel/spin
Spin the wheel. Only admin (telegram_id=8200555770) can call this.
```json
{
  "winner": {
    "id": 1,
    "title": "Інтерстеллар",
    "poster_url": "/api/posters/1.jpg",
    "added_by": { "first_name": "Кирило" }
  },
  "winning_index": 3
}
```
This also moves the movie to watch_history and sends notification to group.

### GET /api/history
Returns watch history (memories).
```json
{
  "history": [
    {
      "id": 1,
      "movie": { "id": 1, "title": "Інтерстеллар", "poster_url": "..." },
      "watched_at": "2026-11-14",
      "proposed_by": { "first_name": "Кирило", "avatar_url": "..." },
      "photos": [
        { "id": 1, "url": "/api/photos/1.jpg" }
      ]
    }
  ]
}
```

### POST /api/history/{history_id}/photos
Upload photos (max 3). Multipart form data.
- `photos` (files, max 3)

### GET /api/photos/{photo_id}.jpg
Serve a photo.

### GET /api/posters/{movie_id}.jpg
Serve a movie poster.

### GET /api/avatar/{telegram_id}
Proxy Telegram user avatar.

### GET /api/history/{history_id}/download
Download all photos as ZIP (with movie name + date in filename).
