/* ============================================
   FRIDAY FILM — Massive Fireworks & Confetti
   High density celebration particles & sparks
   ============================================ */

const Confetti = (() => {
  let canvas, ctx;
  let particles = [];
  let animId = null;
  let w = 0, h = 0;
  let startTime = 0;

  const COLORS = [
    '#A855F7', // Neon Violet
    '#C084FC', // Light Violet
    '#F59E0B', // Gold
    '#FBBF24', // Bright Gold
    '#EC4899', // Pink
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#FFFFFF', // White
    '#F43F5E', // Rose
  ];

  function init() {
    canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas || !ctx) return;
    w = window.innerWidth;
    h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: ${w}px; height: ${h}px;
      z-index: 250;
      pointer-events: none;
    `;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addBurst(originX, originY, count, speedMin, speedMax) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4, // upward boost
        size: 4 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        shape: Math.random() > 0.35 ? 'rect' : 'circle',
        opacity: 1,
        drag: 0.982,
        gravity: 0.22,
        wobble: Math.random() * 10,
        sparkle: Math.random() < 0.25,
      });
    }
  }

  function createParticles() {
    particles = [];
    // 1. Initial massive explosive barrage
    addBurst(w * 0.5, h * 0.45, 260, 5, 20);
    addBurst(w * 0.15, h * 0.75, 140, 7, 22);
    addBurst(w * 0.85, h * 0.75, 140, 7, 22);
  }

  const firedStages = new Set();

  function update() {
    const elapsed = performance.now() - startTime;
    ctx.clearRect(0, 0, w, h);

    // Continuous firework waves:
    // Wave 2 at 700ms: Double mid explosions
    if (elapsed > 700 && !firedStages.has(2)) {
      firedStages.add(2);
      addBurst(w * 0.3, h * 0.35, 120, 6, 17);
      addBurst(w * 0.7, h * 0.35, 120, 6, 17);
    }

    // Wave 3 at 1400ms: Big center starburst
    if (elapsed > 1400 && !firedStages.has(3)) {
      firedStages.add(3);
      addBurst(w * 0.5, h * 0.3, 180, 6, 19);
      addBurst(w * 0.1, h * 0.6, 90, 7, 18);
      addBurst(w * 0.9, h * 0.6, 90, 7, 18);
    }

    // Wave 4 at 2200ms: Golden shower
    if (elapsed > 2200 && !firedStages.has(4)) {
      firedStages.add(4);
      addBurst(w * 0.4, h * 0.25, 100, 4, 15);
      addBurst(w * 0.6, h * 0.25, 100, 4, 15);
    }

    let aliveCount = 0;

    for (const p of particles) {
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;

      p.wobble += 0.14;
      p.x += p.vx + Math.sin(p.wobble) * 0.8;
      p.y += p.vy;
      p.rotation += p.vRot;

      if (elapsed > 4500) {
        p.opacity = Math.max(0, p.opacity - 0.015);
      }

      if (p.opacity > 0 && p.y < h + 60) {
        aliveCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        let alpha = p.opacity;
        if (p.sparkle) {
          alpha = Math.min(1, alpha * (0.6 + 0.4 * Math.sin(p.wobble * 3)));
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (aliveCount > 0 && elapsed < 6000) {
      animId = requestAnimationFrame(update);
    } else {
      stop();
    }
  }

  function start() {
    stop();
    if (!canvas) init();
    resize();
    firedStages.clear();
    createParticles();
    startTime = performance.now();
    animId = requestAnimationFrame(update);
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    if (ctx && canvas) {
      ctx.clearRect(0, 0, w, h);
    }
  }

  return {
    init,
    start,
    stop,
  };
})();
