/* ============================================
   FRIDAY FILM — Confetti & Celebration Effects
   Canvas-based high-performance particle system
   ============================================ */

const Confetti = (() => {
  let canvas, ctx;
  let particles = [];
  let animId = null;
  let w = 0, h = 0;
  let isActive = false;
  let startTime = 0;

  const COLORS = [
    '#8B5CF6', // Neon purple
    '#A855F7', // Violet
    '#EC4899', // Pink
    '#F59E0B', // Amber / Gold
    '#10B981', // Emerald
    '#3B82F6', // Blue
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

  function createParticles() {
    particles = [];
    const count = 180;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / 2) + (Math.random() - 0.5) * 1.6; // upward cone
      const speed = 7 + Math.random() * 12;
      particles.push({
        x: w * (0.3 + Math.random() * 0.4),
        y: h * 0.65,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.abs(Math.sin(angle) * speed),
        size: 5 + Math.random() * 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        opacity: 1,
        drag: 0.985,
        gravity: 0.28,
        wobble: Math.random() * 10,
      });
    }
  }

  function update() {
    const elapsed = performance.now() - startTime;
    ctx.clearRect(0, 0, w, h);

    let aliveCount = 0;

    for (const p of particles) {
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;

      p.wobble += 0.1;
      p.x += p.vx + Math.sin(p.wobble) * 0.5;
      p.y += p.vy;
      p.rotation += p.vRot;

      if (elapsed > 2500) {
        p.opacity = Math.max(0, p.opacity - 0.025);
      }

      if (p.opacity > 0 && p.y < h + 50) {
        aliveCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;
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

    if (aliveCount > 0 && elapsed < 4500) {
      animId = requestAnimationFrame(update);
    } else {
      stop();
    }
  }

  function start() {
    stop();
    if (!canvas) init();
    resize();
    createParticles();
    isActive = true;
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
    isActive = false;
  }

  return {
    init,
    start,
    stop,
  };
})();
