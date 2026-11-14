/* ============================================
   FRIDAY FILM — Master Controller
   Sliding sheet, wheel spin & audio, card deletion,
   in-place memory photos upload
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let movies = [];
  let isWheelExpanded = false;
  let selectedTmdbPosterUrl = null;
  let customPosterFile = null;
  let currentWinner = null;
  let currentHistoryId = null;
  let searchDebounceTimer = null;
  let movieToDelete = null;
  let memoryToDelete = null;

  // Create Memory Modal State
  let selectedMemTitle = '';
  let selectedMemPosterUrl = '';
  let selectedMemPhotos = [];
  let memSearchTimer = null;

  // Elements
  const tg = window.Telegram?.WebApp;
  const wheelStage = document.getElementById('wheel-stage');
  const wheelCanvas = document.getElementById('wheel-canvas');
  const btnWheelCenter = document.getElementById('btn-wheel-center');
  const btnCollapseWheel = document.getElementById('btn-collapse-wheel');
  const movieSheet = document.getElementById('movie-sheet');
  const sheetHandle = document.getElementById('sheet-handle');
  const movieGrid = document.getElementById('movie-grid');
  const moviesCounter = document.getElementById('movies-counter');
  const btnAddMovie = document.getElementById('btn-add-movie');
  const btnMemories = document.getElementById('btn-memories');

  // Movie Detail Modal
  const modalMovieDetail = document.getElementById('modal-movie-detail');
  const movieDetailBackdrop = modalMovieDetail?.querySelector('.movie-detail-backdrop');
  const btnCloseMovieDetail = document.getElementById('btn-close-movie-detail');
  const detailMoviePoster = document.getElementById('detail-movie-poster');
  const detailMovieTitle = document.getElementById('detail-movie-title');
  const detailProposerAvatar = document.getElementById('detail-proposer-avatar');
  const detailProposerName = document.getElementById('detail-proposer-name');
  const btnDetailDeleteMovie = document.getElementById('btn-detail-delete-movie');
  let currentDetailMovie = null;

  // Add Modal
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

  // Delete Confirm Modal
  const modalDelete = document.getElementById('modal-delete');
  const modalDeleteDesc = document.getElementById('modal-delete-desc');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

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
  const btnCreateMemory = document.getElementById('btn-create-memory');

  // Create Memory Modal
  const modalCreateMemory = document.getElementById('modal-create-memory');
  const modalCreateMemoryBackdrop = modalCreateMemory?.querySelector('.modal__backdrop');
  const memDateInput = document.getElementById('mem-date-input');
  const memSearchInput = document.getElementById('mem-search-input');
  const memSearchLoading = document.getElementById('mem-search-loading');
  const memSearchResults = document.getElementById('mem-search-results');
  const memSelectedPosterSection = document.getElementById('mem-selected-poster-section');
  const memSelectedPosterImg = document.getElementById('mem-selected-poster-img');
  const btnMemClearPoster = document.getElementById('btn-mem-clear-poster');
  const memPhotosInput = document.getElementById('mem-photos-input');
  const memPhotosPreview = document.getElementById('mem-photos-preview');
  const btnSubmitMemory = document.getElementById('btn-submit-memory');

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

    // Init engines
    Stars.init();
    Confetti.init();
    Sounds.init();
    Wheel.init();

    bindEvents();
    loadMovies();
  }

  function bindEvents() {
    // 1. Center button click:
    // If sheet is closed -> slide down sheet (expand wheel)
    // If sheet is open -> SPIN THE WHEEL!
    btnWheelCenter?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isWheelExpanded) {
        expandWheel();
      } else {
        handleSpin();
      }
    });

    // Tapping wheel canvas when expanded also spins!
    wheelCanvas?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isWheelExpanded) {
        expandWheel();
      } else {
        handleSpin();
      }
    });

    // Tapping wheel stage when closed expands wheel
    wheelStage?.addEventListener('click', () => {
      if (!isWheelExpanded) {
        expandWheel();
      }
    });

    // Collapse wheel back
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

    // Delete Modal
    btnCancelDelete?.addEventListener('click', () => {
      closeDeleteModal();
    });

    modalDelete?.querySelector('.modal-confirm__backdrop')?.addEventListener('click', () => {
      closeDeleteModal();
    });

    btnConfirmDelete?.addEventListener('click', () => {
      confirmDelete();
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

    // Create Memory Modal Events
    btnCreateMemory?.addEventListener('click', () => {
      openCreateMemoryModal();
    });

    modalCreateMemoryBackdrop?.addEventListener('click', () => {
      closeCreateMemoryModal();
    });

    memSearchInput?.addEventListener('input', (e) => {
      handleMemSearchInput(e.target.value);
    });

    btnMemClearPoster?.addEventListener('click', () => {
      resetMemPoster();
    });

    memPhotosInput?.addEventListener('change', (e) => {
      handleMemPhotosSelected(e);
    });

    btnSubmitMemory?.addEventListener('click', () => {
      submitMemory();
    });

    // Movie Detail Modal Events
    movieDetailBackdrop?.addEventListener('click', () => {
      closeMovieDetail();
    });

    btnCloseMovieDetail?.addEventListener('click', () => {
      closeMovieDetail();
    });

    btnDetailDeleteMovie?.addEventListener('click', () => {
      if (currentDetailMovie) {
        const m = currentDetailMovie;
        closeMovieDetail();
        askDeleteMovie(m);
      }
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

      const avatarSrc = movie.added_by?.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="%23A855F7"/></svg>';

      card.innerHTML = `
        <img class="movie-card__poster" src="${escapeHtml(movie.poster_url)}" alt="${escapeHtml(movie.title)}" loading="lazy">
        <div class="movie-card__title">• ${escapeHtml(movie.title)}</div>
        <img class="movie-card__avatar" src="${escapeHtml(avatarSrc)}" alt="Аватар" title="${escapeHtml(movie.added_by?.first_name || 'Учасник')}">
        <button class="btn-card-delete" title="Видалити фільм" aria-label="Видалити">✕</button>
      `;

      // Tap card: opens enlarged movie view in center of screen with blurred background!
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-delete')) return;
        openMovieDetail(movie);
      });

      // Quick delete button on card
      const btnDel = card.querySelector('.btn-card-delete');
      btnDel?.addEventListener('click', (e) => {
        e.stopPropagation();
        askDeleteMovie(movie);
      });

      movieGrid.appendChild(card);
    });
  }

  /* ---- Movie Detail Modal (Enlarged card with blurred background) ---- */
  function openMovieDetail(movie) {
    currentDetailMovie = movie;
    if (detailMoviePoster) detailMoviePoster.src = movie.poster_url || '';
    if (detailMovieTitle) detailMovieTitle.textContent = movie.title || '';
    if (detailProposerName) {
      detailProposerName.textContent = `Додав(ла): ${movie.added_by?.first_name || 'Учасник'}`;
    }
    if (detailProposerAvatar) {
      detailProposerAvatar.src = movie.added_by?.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="%23A855F7"/></svg>';
    }
    modalMovieDetail?.classList.remove('hidden');
  }

  function closeMovieDetail() {
    modalMovieDetail?.classList.add('hidden');
    currentDetailMovie = null;
  }

  /* ---- Delete Confirmation (Movies & Memories) ---- */
  function askDeleteMovie(movie) {
    movieToDelete = movie;
    memoryToDelete = null;
    if (modalDeleteDesc) {
      modalDeleteDesc.textContent = `Ви точно впевнені, що хочете видалити «${movie.title}» зі списку колеса?`;
    }
    modalDelete?.classList.remove('hidden');
  }

  window.askDeleteMemory = function(historyId, title) {
    memoryToDelete = { id: historyId, title };
    movieToDelete = null;
    if (modalDeleteDesc) {
      modalDeleteDesc.textContent = `Ви точно впевнені, що хочете видалити спогад про «${title}»?`;
    }
    modalDelete?.classList.remove('hidden');
  };

  function closeDeleteModal() {
    modalDelete?.classList.add('hidden');
    movieToDelete = null;
    memoryToDelete = null;
  }

  async function confirmDelete() {
    if (movieToDelete) {
      const movieId = movieToDelete.id;
      btnConfirmDelete.disabled = true;

      try {
        await API.deleteMovie(movieId);
        closeDeleteModal();
        await loadMovies();
      } catch (err) {
        alert('Не вдалося видалити фільм: ' + err.message);
      } finally {
        btnConfirmDelete.disabled = false;
      }
    } else if (memoryToDelete) {
      const historyId = memoryToDelete.id;
      btnConfirmDelete.disabled = true;

      try {
        await API.deleteMemory(historyId);
        closeDeleteModal();
        await loadMemories();
      } catch (err) {
        alert('Не вдалося видалити спогад: ' + err.message);
      } finally {
        btnConfirmDelete.disabled = false;
      }
    }
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
    searchLoading?.classList.add('hidden');
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
      await API.addMovie(formData);

      // Play wow sound (3.4s wow_2.mp3)
      Sounds.playWow();

      // Trigger card flying animation
      animateCardFlyIn(posterPreviewSrc);

      // Close modal
      closeAddModal();

      // Refresh list
      await loadMovies();

      // Ensure movie sheet is open
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

  function animateCardFlyIn(imgSrc) {
    if (!imgSrc) return;

    const clone = document.createElement('div');
    clone.className = 'flying-card-clone';
    clone.style.width = '100px';
    clone.style.height = '150px';
    clone.style.left = 'calc(50% - 50px)';
    clone.style.bottom = '120px';
    clone.innerHTML = `<img src="${escapeHtml(imgSrc)}" style="width:100%;height:100%;object-fit:cover;">`;
    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      clone.style.transform = 'translateY(-180px) scale(1.1) rotate(-6deg)';
      setTimeout(() => {
        clone.style.transform = 'translateY(-260px) scale(0.7) rotate(3deg)';
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
      console.warn('API spin error, local pick:', err);
      const winningIndex = Math.floor(Math.random() * movies.length);
      currentWinner = movies[winningIndex];

      Wheel.spinTo(winningIndex, (winner) => {
        onWheelFinished(winner || currentWinner);
      });
    }
  }

  function onWheelFinished(winner) {
    btnWheelCenter.disabled = false;

    // 1. Set stars into brilliant celebration mode (hyper-fast twinkling, meteors, glowing aura)
    Stars.setCelebrationMode(true);

    // 2. Play celebrate sounds (fireworks + kids-happy)
    Sounds.playFireworks();

    // 3. Launch massive cascading fireworks & confetti
    Confetti.start();

    // 4. Show Winner Card
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
    Stars.setCelebrationMode(false);
    winnerOverlay?.classList.add('hidden');
    collapseWheel();
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
            Поки немає спогадів.<br>Створіть свій перший спогад кнопкою внизу!
          </div>
        </div>
      `;
      return;
    }

    history.forEach(item => {
      const entry = document.createElement('div');
      entry.className = 'memory-entry';
      entry.id = `memory-entry-${item.id}`;

      const dateStr = formatDateUk(item.watched_at);
      const user = item.proposed_by || {};
      const avatarSrc = user.avatar_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="11" fill="%23A855F7"/></svg>';
      const movieTitle = item.movie?.title || '';

      let photosHtml = '';
      if (item.photos && item.photos.length > 0) {
        photosHtml = `
          <div class="memory-photos">
            ${item.photos.map(p => `<img src="${escapeHtml(p.url)}" alt="Фото" onclick="openPhotoViewer('${escapeHtml(p.url)}')">`).join('')}
          </div>
        `;
      }

      const hasPhotos = item.photos && item.photos.length > 0;
      const downloadBtnText = hasPhotos ? '💾 Завантажити фото' : 'Фото ще не додано';
      const downloadBtnDisabled = hasPhotos ? '' : 'disabled style="opacity: 0.4; cursor: default;"';

      entry.innerHTML = `
        <div class="memory-date">${escapeHtml(dateStr)}</div>
        <div class="memory-card liquid-glass-panel">
          <button class="btn-memory-delete" title="Видалити спогад" aria-label="Видалити" onclick="askDeleteMemory(${item.id}, '${escapeHtml(movieTitle)}')">✕</button>
          <img class="memory-card__poster" src="${escapeHtml(item.movie?.poster_url || '')}" alt="${escapeHtml(movieTitle)}">
          <div class="memory-card__info">
            <div class="memory-card__title">${escapeHtml(movieTitle)}</div>
            <div class="memory-card__user">
              <img class="memory-card__user-avatar" src="${escapeHtml(avatarSrc)}" alt="">
              <span>Запропонував(ла): ${escapeHtml(user.first_name || 'Учасник')}</span>
            </div>
          </div>
          ${photosHtml}
          <div style="display: flex; gap: 8px; align-items: center; padding: 4px 12px 10px;">
            <label class="btn-memory-add-photo">
              📸 Додати фото
              <input type="file" accept="image/*" multiple hidden onchange="uploadMemoryPhotos(event, ${item.id})">
            </label>
            <button class="memory-download" ${downloadBtnDisabled} onclick="downloadMemory(${item.id}, ${hasPhotos ? 1 : 0})">
              ${downloadBtnText}
            </button>
          </div>
        </div>
      `;
      memoriesTimeline.appendChild(entry);
    });
  }

  // Handle uploading photos inside Memories screen
  window.uploadMemoryPhotos = async function(e, historyId) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (!files.length) return;

    const label = e.target.parentElement;
    const originalText = label.innerHTML;
    label.textContent = 'Завантаження...';

    try {
      await API.uploadPhotos(historyId, files);
      await loadMemories();
    } catch (err) {
      alert('Помилка завантаження фото: ' + err.message);
      label.innerHTML = originalText;
    }
  };

  /* ---- Create Memory Modal Logic ---- */
  function openCreateMemoryModal() {
    modalCreateMemory?.classList.add('active');
    if (memDateInput) {
      memDateInput.value = new Date().toISOString().split('T')[0];
    }
    if (memSearchInput) memSearchInput.value = '';
    if (memSearchResults) memSearchResults.innerHTML = '';
    resetMemPoster();
    selectedMemPhotos = [];
    if (memPhotosPreview) memPhotosPreview.innerHTML = '';
    if (memPhotosInput) memPhotosInput.value = '';
    updateSubmitMemoryBtn();
    setTimeout(() => memSearchInput?.focus(), 150);
  }

  function closeCreateMemoryModal() {
    modalCreateMemory?.classList.remove('active');
    resetMemPoster();
    selectedMemPhotos = [];
  }

  function resetMemPoster() {
    selectedMemTitle = '';
    selectedMemPosterUrl = '';
    memSelectedPosterSection?.classList.add('hidden');
    if (memSelectedPosterImg) memSelectedPosterImg.src = '';
    updateSubmitMemoryBtn();
  }

  function updateSubmitMemoryBtn() {
    if (!btnSubmitMemory) return;
    const hasTitle = (selectedMemTitle && selectedMemTitle.trim().length > 0) || (memSearchInput && memSearchInput.value.trim().length > 0);
    btnSubmitMemory.disabled = !hasTitle;
  }

  function handleMemSearchInput(query) {
    clearTimeout(memSearchTimer);
    const q = query?.trim() || '';
    updateSubmitMemoryBtn();

    if (q.length < 2) {
      if (memSearchResults) memSearchResults.innerHTML = '';
      memSearchLoading?.classList.add('hidden');
      return;
    }

    memSearchLoading?.classList.remove('hidden');

    memSearchTimer = setTimeout(async () => {
      try {
        const data = await API.searchMovies(q);
        renderMemSearchResults(data.results || []);
      } catch (err) {
        renderMemSearchResults([]);
      } finally {
        memSearchLoading?.classList.add('hidden');
      }
    }, 350);
  }

  function renderMemSearchResults(results) {
    if (!memSearchResults) return;
    memSearchResults.innerHTML = '';

    if (!results.length) {
      memSearchResults.innerHTML = '<span style="font-size:12px;color:var(--text-muted);padding:8px;">Фільмів не знайдено, назву можна ввести вручну</span>';
      return;
    }

    results.forEach(movie => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.innerHTML = `
        <img src="${escapeHtml(movie.poster_url)}" alt="${escapeHtml(movie.title)}" loading="lazy">
        <div class="result-title">${escapeHtml(movie.title)}</div>
      `;
      item.addEventListener('click', () => {
        selectMemMovie(movie);
      });
      memSearchResults.appendChild(item);
    });
  }

  function selectMemMovie(movie) {
    selectedMemTitle = movie.title;
    selectedMemPosterUrl = movie.poster_url;
    if (memSearchInput) memSearchInput.value = movie.title;
    if (memSelectedPosterImg) memSelectedPosterImg.src = movie.poster_url;
    memSelectedPosterSection?.classList.remove('hidden');
    if (memSearchResults) memSearchResults.innerHTML = '';
    updateSubmitMemoryBtn();
  }

  function handleMemPhotosSelected(e) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    selectedMemPhotos = files;
    if (!memPhotosPreview) return;
    memPhotosPreview.innerHTML = '';

    files.forEach(f => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.style.cssText = 'width:64px;height:64px;border-radius:10px;object-fit:cover;border:1px solid #A855F7;';
      memPhotosPreview.appendChild(img);
    });
  }

  async function submitMemory() {
    const title = selectedMemTitle.trim() || (memSearchInput ? memSearchInput.value.trim() : '');
    const dateVal = memDateInput?.value || new Date().toISOString().split('T')[0];

    if (!title) {
      alert('Будь ласка, оберіть або введіть назву фільму');
      return;
    }

    btnSubmitMemory.disabled = true;
    btnSubmitMemory.textContent = 'Збереження...';

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('watched_at', dateVal);
      if (selectedMemPosterUrl) {
        fd.append('tmdb_poster_url', selectedMemPosterUrl);
      }
      for (const p of selectedMemPhotos) {
        fd.append('photos', p);
      }

      await API.createMemory(fd);
      Sounds.playWow();
      closeCreateMemoryModal();
      await loadMemories();
    } catch (err) {
      alert('Помилка при збереженні спогаду: ' + err.message);
    } finally {
      if (btnSubmitMemory) {
        btnSubmitMemory.disabled = false;
        btnSubmitMemory.textContent = 'Зберегти спогад';
      }
    }
  }

  window.downloadMemory = function(historyId, hasPhotos) {
    if (!hasPhotos) {
      alert('До цього перегляду ще не додано жодного фото.');
      return;
    }
    window.open(`/api/history/${historyId}/download`, '_blank');
  };

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
