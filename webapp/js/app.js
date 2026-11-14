/* ============================================
   FRIDAY FILM — Master Controller
   Sliding sheet, wheel physics, fly-in animation, TMDB
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const ADMIN_ID = 8200555770;

  // State
  let movies = [];
  let isWheelExpanded = false;
  let selectedTmdbPosterUrl = null;
  let customPosterFile = null;
  let currentWinner = null;
  let currentHistoryId = null;
  let searchDebounceTimer = null;

  // Elements
  const tg = window.Telegram?.WebApp;
  const wheelStage = document.getElementById('wheel-stage');
  const btnWheelCenter = document.getElementById('btn-wheel-center');
  const btnCollapseWheel = document.getElementById('btn-collapse-wheel');
  const movieSheet = document.getElementById('movie-sheet');
  const sheetHandle = document.getElementById('sheet-handle');
  const movieGrid = document.getElementById('movie-grid');
  const moviesCounter = document.getElementById('movies-counter');
  const btnAddMovie = document.getElementById('btn-add-movie');
  const btnMemories = document.getElementById('btn-memories');

  // Modal
  const modalAdd = document.getElementById('modal-add');
  const modalBackdrop = modalAdd?.querySelector('.modal__backdrop');
  const searchInput = document.getElementById('search-input');
  const searchLoading = document.getElementById('search-loading');
  const searchResults = document.getElementById('search-results');
  const selectedPosterSection = document.getElementById('selected-poster-section');
  const selectedPosterImg = document.getElementById('selected-poster-img');
  const btnClearPoster = document.getElementById('btn-clear-poster');
  const customUploadSection = document.getElementById('custom-upload-section');
  const customPosterInput = document.getElementById('custom-poster-input');
  const btnSubmitMovie = document.getElementById('btn-submit-movie');

  // Winner Overlay
  const winnerOverlay = document.getElementById('winner-overlay');
  const winnerPoster = document.getElementById('winner-poster');
  const winnerTitle = document.getElementById('winner-title');
  const winnerProposer = document.getElementById('winner-proposer');
  const winnerPhotoInput = document.getElementById('winner-photo-input');
  const winnerPhotosPreview = document.getElementById('winner-photos-preview');
  const btnWinnerDone = document.getElementById('btn-winner-done');

  // Memories Screen
  const screenMemories = document.getElementById('screen-memories');
  const btnBackMemories = document.getElementById('btn-back-memories');
  const btnDownloadAll = document.getElementById('btn-download-all');
  const memoriesTimeline = document.getElementById('memories-timeline');

  /* ---- Initialize ---- */
  function init() {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation?.();
        if (tg.setHeaderColor) tg.setHeaderColor('#000000');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
      } catch (e) {}
    }

    // Init canvas engines & sounds
    Stars.init();
    Confetti.init();
    Sounds.init();
    Wheel.init();

    bindEvents();
    loadMovies();
  }

  function bindEvents() {
    // Center Hub click:
    // If sheet is up (normal view) -> slide down sheet (expand wheel)
    // If sheet is down (wheel expanded) -> SPIN THE WHEEL!
    btnWheelCenter?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isWheelExpanded) {
        expandWheel();
      } else {
        handleSpin();
      }
    });

    // Tapping on wheel stage when closed -> also expands wheel
    wheelStage?.addEventListener('click', () => {
      if (!isWheelExpanded) {
        expandWheel();
      }
    });

    // Collapse wheel back to movies
    btnCollapseWheel?.addEventListener('click', () => {
      collapseWheel();
    });

    sheetHandle?.addEventListener('click', () => {
      if (isWheelExpanded) {
        collapseWheel();
      } else {
        expandWheel();
      }
    });

    // Add Movie Modal
    btnAddMovie?.addEventListener('click', () => {
      openAddModal();
    });

    modalBackdrop?.addEventListener('click', () => {
      closeAddModal();
    });

    searchInput?.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });

    btnClearPoster?.addEventListener('click', () => {
      resetPosterSelection();
    });

    customPosterInput?.addEventListener('change', (e) => {
      handleCustomPosterUpload(e);
    });

    btnSubmitMovie?.addEventListener('click', () => {
      submitMovie();
    });

    // Winner Photos & Done
    winnerPhotoInput?.addEventListener('change', (e) => {
      handleWinnerPhotosSelected(e);
    });

    btnWinnerDone?.addEventListener('click', () => {
      closeWinnerOverlay();
    });

    // Memories Screen
    btnMemories?.addEventListener('click', () => {
      openMemoriesScreen();
    });

    btnBackMemories?.addEventListener('click', () => {
      closeMemoriesScreen();
    });

    btnDownloadAll?.addEventListener('click', () => {
      window.open('/api/history/download/all', '_blank');
    });
  }

  /* ---- Expand / Collapse Wheel Sheet ---- */
  function expandWheel() {
    isWheelExpanded = true;
    wheelStage?.classList.add('expanded');
    movieSheet?.classList.add('collapsed');
    btnCollapseWheel?.classList.remove('hidden');
    Wheel.draw();
  }

  function collapseWheel() {
    isWheelExpanded = false;
    wheelStage?.classList.remove('expanded');
    movieSheet?.classList.remove('collapsed');
    btnCollapseWheel?.classList.add('hidden');
    Wheel.draw();
  }

  /* ---- Load & Render Movies ---- */
  async function loadMovies() {
    try {
      const data = await API.getMovies();
      movies = data.movies || [];
      renderMoviesGrid();
      Wheel.setMovies(movies);
      updateCounter();
    } catch (err) {
      console.warn('Failed to load movies:', err);
    }
  }

  function updateCounter() {
    if (!moviesCounter) return;
    const count = movies.length;
    let label = `${count} фільмів`;
    if (count === 1) label = '1 фільм';
    else if (count >= 2 && count <= 4) label = `${count} фільми`;
    moviesCounter.textContent = label;
  }

  function renderMoviesGrid() {
    if (!movieGrid) return;
    movieGrid.innerHTML = '';

    if (movies.length === 0) {
      movieGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🍿</div>
          <div class="empty-state__text">
            Поки немає доданих фільмів.<br>Натисни кнопку нижче, щоб додати перший!
          </div>
        </div>
      `;
      return;
    }

    movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card';
      card.id = `movie-card-${movie.id}`;

      const avatarSrc = movie.added_by?.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="14" fill="%23A855F7"/><text x="14" y="18" fill="white" font-size="12" text-anchor="middle" font-family="sans-serif">👤</text></svg>';

      card.innerHTML = `
        <img class="movie-card__poster" src="${escapeHtml(movie.poster_url)}" alt="${escapeHtml(movie.title)}" loading="lazy">
        <div class="movie-card__title">${escapeHtml(movie.title)}</div>
        <img class="movie-card__avatar" src="${escapeHtml(avatarSrc)}" alt="Аватар" title="${escapeHtml(movie.added_by?.first_name || 'Учасник')}">
      `;
      movieGrid.appendChild(card);
    });
  }

  /* ---- Add Movie Modal & TMDB Search ---- */
  function openAddModal() {
    modalAdd?.classList.add('active');
    searchInput?.focus();
  }

  function closeAddModal() {
    modalAdd?.classList.remove('active');
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
    if (searchLoading) searchLoading.classList.add('hidden');
    resetPosterSelection();
  }

  function resetPosterSelection() {
    selectedTmdbPosterUrl = null;
    customPosterFile = null;
    selectedPosterSection?.classList.add('hidden');
    customUploadSection?.classList.add('hidden');
    if (btnSubmitMovie) btnSubmitMovie.disabled = true;
    if (customPosterInput) customPosterInput.value = '';
  }

  function handleSearchInput(query) {
    clearTimeout(searchDebounceTimer);
    const q = query?.trim() || '';

    if (q.length < 2) {
      if (searchResults) searchResults.innerHTML = '';
      searchLoading?.classList.add('hidden');
      customUploadSection?.classList.add('hidden');
      return;
    }

    searchLoading?.classList.remove('hidden');

    searchDebounceTimer = setTimeout(async () => {
      try {
        const data = await API.searchMovies(q);
        const results = data.results || [];
        renderSearchResults(results);
      } catch (e) {
        renderSearchResults([]);
      } finally {
        searchLoading?.classList.add('hidden');
      }
    }, 350);
  }

  function renderSearchResults(results) {
    if (!searchResults) return;
    searchResults.innerHTML = '';

    if (!results || results.length === 0) {
      customUploadSection?.classList.remove('hidden');
      return;
    }

    customUploadSection?.classList.add('hidden');

    results.forEach(item => {
      if (!item.poster_url) return;
      const card = document.createElement('div');
      card.className = 'search-result-item';
      card.innerHTML = `
        <img src="${escapeHtml(item.poster_url)}" alt="${escapeHtml(item.title)}">
        <div class="result-title">${escapeHtml(item.title)}</div>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.search-result-item').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');
        selectTmdbPoster(item.poster_url, item.title);
      });
      searchResults.appendChild(card);
    });
  }

  function selectTmdbPoster(posterUrl, movieTitle) {
    selectedTmdbPosterUrl = posterUrl;
    customPosterFile = null;

    if (movieTitle && searchInput) {
      searchInput.value = movieTitle;
    }

    if (selectedPosterImg) selectedPosterImg.src = posterUrl;
    selectedPosterSection?.classList.remove('hidden');
    customUploadSection?.classList.add('hidden');
    if (btnSubmitMovie) btnSubmitMovie.disabled = false;
  }

  function handleCustomPosterUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    customPosterFile = file;
    selectedTmdbPosterUrl = null;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (selectedPosterImg) selectedPosterImg.src = event.target.result;
      selectedPosterSection?.classList.remove('hidden');
      if (btnSubmitMovie) btnSubmitMovie.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  async function submitMovie() {
    const title = searchInput?.value?.trim();
    if (!title) {
      alert('Будь ласка, введіть назву фільму');
      return;
    }

    if (!selectedTmdbPosterUrl && !customPosterFile) {
      alert('Будь ласка, оберіть або завантажте постер');
      return;
    }

    btnSubmitMovie.disabled = true;
    btnSubmitMovie.textContent = 'Додаємо...';

    const formData = new FormData();
    formData.append('title', title);
    if (selectedTmdbPosterUrl) {
      formData.append('tmdb_poster_url', selectedTmdbPosterUrl);
    } else if (customPosterFile) {
      formData.append('poster', customPosterFile);
    }

    const posterPreviewSrc = selectedPosterImg?.src || '';

    try {
      const res = await API.addMovie(formData);

      // Play wow sound (3.4s wow_2.mp3)
      Sounds.playWow();

      // Trigger card flying animation
      animateCardFlyIn(posterPreviewSrc);

      // Close modal
      closeAddModal();

      // Refresh list
      await loadMovies();

      // Make sure movie sheet is open so the user sees their new card
      collapseWheel();
    } catch (err) {
      console.error('Failed to add movie:', err);
      alert('Помилка додавання: ' + err.message);
    } finally {
      if (btnSubmitMovie) {
        btnSubmitMovie.disabled = false;
        btnSubmitMovie.textContent = 'Додати';
      }
    }
  }

  // Smooth Card Fly-In effect: clone flies from modal button into the movie grid
  function animateCardFlyIn(imgSrc) {
    if (!imgSrc) return;

    const clone = document.createElement('div');
    clone.className = 'flying-card-clone';
    clone.style.width = '120px';
    clone.style.height = '180px';
    clone.style.left = 'calc(50% - 60px)';
    clone.style.bottom = '120px';
    clone.innerHTML = `<img src="${escapeHtml(imgSrc)}" style="width:100%;height:100%;object-fit:cover;">`;
    document.body.appendChild(clone);

    // Animate to grid target
    requestAnimationFrame(() => {
      clone.style.transform = 'translateY(-160px) scale(1.1) rotate(-6deg)';
      setTimeout(() => {
        clone.style.transform = 'translateY(-240px) scale(0.8) rotate(3deg)';
        clone.style.opacity = '0';
        setTimeout(() => clone.remove(), 600);
      }, 350);
    });
  }

  /* ---- Wheel Spin ---- */
  async function handleSpin() {
    if (Wheel.isSpinning()) return;
    if (movies.length === 0) {
      alert('Спочатку додайте фільми у колесо!');
      return;
    }

    btnWheelCenter.disabled = true;

    try {
      const result = await API.spinWheel();
      const winningIndex = result.winning_index ?? Math.floor(Math.random() * movies.length);
      currentWinner = result.winner || movies[winningIndex];
      currentHistoryId = result.history_id;

      Wheel.spinTo(winningIndex, (winner) => {
        onWheelFinished(winner || currentWinner);
      });
    } catch (err) {
      console.warn('API spin error, falling back to local pick:', err);
      const winningIndex = Math.floor(Math.random() * movies.length);
      currentWinner = movies[winningIndex];

      Wheel.spinTo(winningIndex, (winner) => {
        onWheelFinished(winner || currentWinner);
      });
    }
  }

  function onWheelFinished(winner) {
    btnWheelCenter.disabled = false;

    // 1. Play celebrate sounds (fireworks + kids-happy simultaneously)
    Sounds.playFireworks();

    // 2. Launch confetti
    Confetti.start();

    // 3. Show Winner Card
    if (winnerPoster) winnerPoster.src = winner.poster_url || '';
    if (winnerTitle) winnerTitle.textContent = winner.title || 'Фільм пʼятниці';
    if (winnerProposer) {
      winnerProposer.textContent = winner.added_by?.first_name 
        ? `Запропонував(ла): ${winner.added_by.first_name}` 
        : '';
    }
    if (winnerPhotosPreview) winnerPhotosPreview.innerHTML = '';
    if (winnerPhotoInput) winnerPhotoInput.value = '';

    winnerOverlay?.classList.remove('hidden');
  }

  function handleWinnerPhotosSelected(e) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (!files.length) return;

    if (winnerPhotosPreview) {
      winnerPhotosPreview.innerHTML = '';
      files.forEach(file => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        winnerPhotosPreview.appendChild(img);
      });
    }

    if (currentHistoryId) {
      API.uploadPhotos(currentHistoryId, files).catch(err => {
        console.warn('Photo upload error:', err);
      });
    }
  }

  async function closeWinnerOverlay() {
    winnerOverlay?.classList.add('hidden');
    collapseWheel();
    // Reload movies (winner removed from active wheel)
    await loadMovies();
  }

  /* ---- Memories (History) Screen ---- */
  function openMemoriesScreen() {
    screenMemories?.classList.add('active');
    Sounds.playMemories();
    loadMemories();
  }

  function closeMemoriesScreen() {
    Sounds.stopMemories();
    screenMemories?.classList.remove('active');
  }

  async function loadMemories() {
    if (!memoriesTimeline) return;
    memoriesTimeline.innerHTML = '<div class="spinner" style="margin: 40px auto;"></div>';

    try {
      const data = await API.getHistory();
      const history = data.history || [];
      renderMemories(history);
    } catch (err) {
      memoriesTimeline.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🕰</div>
          <div class="empty-state__text">Історія переглядів поки порожня.</div>
        </div>
      `;
    }
  }

  function renderMemories(history) {
    if (!memoriesTimeline) return;
    memoriesTimeline.innerHTML = '';

    if (history.length === 0) {
      memoriesTimeline.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🕰</div>
          <div class="empty-state__text">
            Поки немає спогадів.<br>Виберіть фільм колесом і додайте спільне фото!
          </div>
        </div>
      `;
      return;
    }

    history.forEach(item => {
      const entry = document.createElement('div');
      entry.className = 'memory-entry';

      const dateStr = formatDateUk(item.watched_at);
      const user = item.proposed_by || {};
      const avatarSrc = user.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="11" fill="%23A855F7"/></svg>';

      let photosHtml = '';
      if (item.photos && item.photos.length > 0) {
        photosHtml = `
          <div class="memory-photos">
            ${item.photos.map(p => `<img src="${escapeHtml(p.url)}" alt="Фото" onclick="openPhotoViewer('${escapeHtml(p.url)}')">`).join('')}
          </div>
        `;
      }

      entry.innerHTML = `
        <div class="memory-date">${escapeHtml(dateStr)}</div>
        <div class="memory-card liquid-glass-panel">
          <img class="memory-card__poster" src="${escapeHtml(item.movie?.poster_url || '')}" alt="${escapeHtml(item.movie?.title || '')}">
          <div class="memory-card__info">
            <div class="memory-card__title">${escapeHtml(item.movie?.title || '')}</div>
            <div class="memory-card__user">
              <img class="memory-card__user-avatar" src="${escapeHtml(avatarSrc)}" alt="">
              <span>Запропонував(ла): ${escapeHtml(user.first_name || 'Учасник')}</span>
            </div>
          </div>
          ${photosHtml}
          <button class="memory-download" onclick="window.open('/api/history/${item.id}/download', '_blank')">
            💾 Завантажити фото
          </button>
        </div>
      `;
      memoriesTimeline.appendChild(entry);
    });
  }

  function formatDateUk(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.openPhotoViewer = function(url) {
    const viewer = document.createElement('div');
    viewer.className = 'photo-viewer';
    viewer.innerHTML = `<img src="${escapeHtml(url)}" alt="Фото">`;
    viewer.onclick = () => viewer.remove();
    document.body.appendChild(viewer);
  };

  init();
});
