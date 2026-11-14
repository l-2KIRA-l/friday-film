/* ============================================
   FRIDAY FILM — API Client
   ============================================ */

const API = (() => {
  const BASE = '';

  function getAuthHeader() {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg && tg.initData) {
        return { 'Authorization': tg.initData };
      }
    } catch (e) {}
    return {};
  }

  async function request(path, options = {}) {
    const url = `${BASE}${path}`;
    const headers = { ...getAuthHeader(), ...options.headers };
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${text}`);
      }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        return await res.json();
      }
      return res;
    } catch (err) {
      console.error(`[API] ${options.method || 'GET'} ${path}:`, err);
      throw err;
    }
  }

  return {
    async getMovies() {
      return request('/api/movies');
    },

    async addMovie(formData) {
      return request('/api/movies', {
        method: 'POST',
        body: formData,
        // No Content-Type — browser sets multipart boundary
      });
    },

    async searchMovies(query) {
      if (!query || query.trim().length < 2) return [];
      return request(`/api/movies/search?q=${encodeURIComponent(query.trim())}`);
    },

    async spinWheel() {
      return request('/api/wheel/spin', { method: 'POST' });
    },

    async getHistory() {
      return request('/api/history');
    },

    async uploadPhotos(historyId, files) {
      const formData = new FormData();
      for (const file of files) {
        formData.append('photos', file);
      }
      return request(`/api/history/${historyId}/photos`, {
        method: 'POST',
        body: formData,
      });
    },

    getDownloadUrl(historyId) {
      return `${BASE}/api/history/${historyId}/download`;
    },

    getPosterUrl(movieId) {
      return `${BASE}/api/posters/${movieId}.jpg`;
    },

    getPhotoUrl(photoId) {
      return `${BASE}/api/photos/${photoId}.jpg`;
    },

    getAvatarUrl(telegramId) {
      return `${BASE}/api/avatar/${telegramId}`;
    },
  };
})();
