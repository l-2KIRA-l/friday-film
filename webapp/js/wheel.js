/* ============================================
   FRIDAY FILM — Fortune Wheel (Canvas API)
   Bottom arrow pointer, full-wedge poster expansion,
   casino peg ticking audio & smooth 5s physics
   ============================================ */

const Wheel = (() => {
  let canvas, ctx;
  let movies = [];
  const imageCache = new Map();

  let currentAngle = 0; // In radians
  let isSpinning = false;
  let animId = null;
  let lastTickSlice = -1;

  const PURPLE = '#8B5CF6';
  const VIOLET = '#A855F7';
  const NEON_GLOW = 'rgba(168, 85, 247, 0.6)';

  function init() {
    canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 340;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function setMovies(newMovies) {
    movies = newMovies || [];
    preloadImages();
    draw();
  }

  function preloadImages() {
    movies.forEach(m => {
      const url = m.poster_url;
      if (!url || imageCache.has(url)) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => draw();
      img.src = url;
      imageCache.set(url, img);
    });
  }

  function draw() {
    if (!ctx) return;
    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 8;
    const hubRadius = 38; // Radius of center button

    ctx.clearRect(0, 0, size, size);

    if (!movies || movies.length === 0) {
      drawEmptyWheel(cx, cy, radius);
      return;
    }

    const n = movies.length;
    const arc = (2 * Math.PI) / n;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentAngle);

    // Draw each slice
    for (let i = 0; i < n; i++) {
      const movie = movies[i];
      const start = i * arc;
      const end = start + arc;
      const mid = start + arc / 2;

      ctx.save();

      // 1. Clip sector wedge with clean angular margin so slices NEVER touch or overlap
      const margin = n > 1 ? 0.018 : 0; // In radians
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius - 2, start + margin, end - margin);
      ctx.closePath();
      ctx.clip();

      // 2. Sector background
      const hue = (i * (360 / Math.max(n, 1)) + 260) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, 12%)`;
      ctx.fill();

      // 3. Draw Movie Poster: EXPANDED to fill the wedge without bleeding
      const img = imageCache.get(movie.poster_url);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.rotate(mid);

        const rMin = hubRadius + 4;
        const rMax = radius - 4;
        const wedgeHeight = rMax - rMin;
        const rCenter = (rMin + rMax) / 2;

        const wedgeWidth = 2 * rMax * Math.sin((arc - margin * 2) / 2);
        const posterH = wedgeHeight * 1.02;
        const posterW = Math.max(wedgeWidth * 1.08, posterH * (2 / 3));

        ctx.translate(rCenter, 0);
        ctx.rotate(Math.PI / 2); // bottom faces center, top faces rim

        ctx.drawImage(img, -posterW / 2, -posterH / 2, posterW, posterH);

        // Subtle gradient darkening near center for contrast
        const darkGrad = ctx.createLinearGradient(0, posterH / 2, 0, -posterH / 2);
        darkGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
        darkGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.05)');
        darkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(-posterW / 2, -posterH / 2, posterW, posterH);

        ctx.restore();
      }

      ctx.restore(); // restore slice clip
    }

    // 4. Prominent, clean dividers between all slices (drawn unclipped so they never get cut off)
    for (let i = 0; i < n; i++) {
      const angle = i * arc;

      // Dark solid base line
      ctx.beginPath();
      ctx.moveTo(hubRadius * Math.cos(angle), hubRadius * Math.sin(angle));
      ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Glowing violet accent line
      ctx.beginPath();
      ctx.moveTo(hubRadius * Math.cos(angle), hubRadius * Math.sin(angle));
      ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 2;
      ctx.shadowColor = NEON_GLOW;
      ctx.shadowBlur = 8;
      ctx.stroke();
    }

    // Outer rim ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#9333EA';
    ctx.shadowColor = NEON_GLOW;
    ctx.shadowBlur = 16;
    ctx.stroke();

    // Inner rim line
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();

    ctx.restore();
  }

  function drawEmptyWheel(cx, cy, radius) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#100d1c';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = VIOLET;
    ctx.shadowColor = NEON_GLOW;
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Додайте фільми для колеса', 0, 0);

    ctx.restore();
  }

  // Smooth physics ease out (starts fast, gradually decelerates)
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3.8);
  }

  function spinTo(targetIndex, onComplete) {
    if (isSpinning || movies.length === 0) return;
    isSpinning = true;

    const n = movies.length;
    const arc = (2 * Math.PI) / n;

    // Bottom pointer is at 6 o'clock (PI / 2)
    const targetSliceMid = targetIndex * arc + arc / 2;
    const pointerAngle = Math.PI / 2;

    const normalizedCurrent = currentAngle % (2 * Math.PI);
    let delta = (pointerAngle - targetSliceMid - normalizedCurrent) % (2 * Math.PI);
    if (delta <= 0) delta += 2 * Math.PI;

    // 8-9 full fast rotations + exact delta
    const extraTurns = 8 * 2 * Math.PI;
    const totalRotation = extraTurns + delta;

    const startAngle = currentAngle;
    const duration = 5000; // 5.0 seconds
    const startTime = performance.now();
    lastTickSlice = -1;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);

      currentAngle = startAngle + totalRotation * eased;
      draw();

      // Calculate which slice is currently passing the bottom pointer
      let pointerRel = (Math.PI / 2 - (currentAngle % (2 * Math.PI)));
      if (pointerRel < 0) pointerRel += 2 * Math.PI;
      const currentSlice = Math.floor(pointerRel / arc) % n;

      if (currentSlice !== lastTickSlice) {
        Sounds.playTick(); // Casino click sound!
        lastTickSlice = currentSlice;
      }

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        if (typeof onComplete === 'function') {
          onComplete(movies[targetIndex], targetIndex);
        }
      }
    }

    animId = requestAnimationFrame(animate);
  }

  return {
    init,
    setMovies,
    draw,
    spinTo,
    isSpinning: () => isSpinning,
  };
})();
