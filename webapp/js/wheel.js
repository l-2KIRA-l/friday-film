/* ============================================
   FRIDAY FILM — Fortune Wheel (Canvas API)
   Bottom arrow pointer, upright movie posters,
   realistic 5s physics deceleration
   ============================================ */

const Wheel = (() => {
  let canvas, ctx;
  let movies = [];
  const imageCache = new Map();

  let currentAngle = 0; // In radians
  let isSpinning = false;
  let animId = null;

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
    const hubRadius = 40;

    ctx.clearRect(0, 0, size, size);

    // If no movies
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

      // 1. Clip sector wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.clip();

      // 2. Sector background gradient
      const hue = (i * (360 / Math.max(n, 1)) + 260) % 360;
      const bgGrad = ctx.createRadialGradient(0, 0, hubRadius, 0, 0, radius);
      bgGrad.addColorStop(0, `hsla(${hue}, 65%, 15%, 0.95)`);
      bgGrad.addColorStop(1, `hsla(${hue}, 75%, 8%, 0.98)`);
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // 3. Draw Movie Poster inside wedge
      // Orientation: Bottom of poster points to center, top points to outer rim!
      const img = imageCache.get(movie.poster_url);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.rotate(mid);

        // Radial space available
        const rMin = hubRadius + 6;
        const rMax = radius - 10;
        const radLength = rMax - rMin;

        // Sector width available at middle radius
        const rMid = (rMin + rMax) / 2;
        const availWidth = 2 * rMid * Math.sin(arc / 2) * 0.90;

        // Scale poster to fit FULLY without being cropped (2:3 aspect ratio)
        let posterH = radLength;
        let posterW = posterH * (2 / 3);

        if (posterW > availWidth) {
          posterW = availWidth;
          posterH = posterW * 1.5;
        }

        // Translate to poster center along radius
        const posX = rMin + (radLength / 2);
        ctx.translate(posX, 0);

        // Rotate by +90 deg so bottom of poster faces center, top faces rim!
        ctx.rotate(Math.PI / 2);

        // Draw poster with rounded corners and border
        ctx.save();
        roundedRect(ctx, -posterW / 2, -posterH / 2, posterW, posterH, 6);
        ctx.clip();
        ctx.drawImage(img, -posterW / 2, -posterH / 2, posterW, posterH);
        ctx.restore();

        // Subtle glow border around poster
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        roundedRect(ctx, -posterW / 2, -posterH / 2, posterW, posterH, 6);
        ctx.stroke();

        ctx.restore();
      }

      // 4. Sector border / divider line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius * Math.cos(start), radius * Math.sin(start));
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 2;
      ctx.shadowColor = NEON_GLOW;
      ctx.shadowBlur = 6;
      ctx.stroke();

      ctx.restore();
    }

    // Outer rim ring
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = VIOLET;
    ctx.shadowColor = NEON_GLOW;
    ctx.shadowBlur = 14;
    ctx.stroke();

    // Inner rim accent
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
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
    // When sector targetIndex center is at PI / 2:
    // angle + targetIndex * arc + arc / 2 = PI / 2 (mod 2PI)
    const targetSliceMid = targetIndex * arc + arc / 2;
    const pointerAngle = Math.PI / 2;

    const normalizedCurrent = currentAngle % (2 * Math.PI);
    let delta = (pointerAngle - targetSliceMid - normalizedCurrent) % (2 * Math.PI);
    if (delta <= 0) delta += 2 * Math.PI;

    // 8 full fast rotations + exact delta
    const extraTurns = 8 * 2 * Math.PI;
    const totalRotation = extraTurns + delta;

    const startAngle = currentAngle;
    const duration = 5000; // 5.0 seconds
    const startTime = performance.now();

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);

      currentAngle = startAngle + totalRotation * eased;
      draw();

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
