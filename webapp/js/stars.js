/* ============================================
   FRIDAY FILM — Starry Sky Background (Canvas)
   Twinkling stars + neon purple flares + shooting stars
   ============================================ */

const Stars = (() => {
  let canvas, ctx;
  let stars = [];
  let meteors = [];
  let animId = null;
  let w = 0, h = 0;

  const STAR_COUNT = 320;
  const COLORS = [
    [255, 255, 255],      // crisp white
    [255, 255, 255],      // crisp white
    [230, 220, 255],      // slight lavender
    [196, 160, 255],      // vibrant neon violet
    [168, 85, 247],       // neon purple
    [216, 180, 254],      // lilac
  ];

  function init() {
    canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    generateStars();
    animate();

    window.addEventListener('resize', () => {
      resize();
      generateStars();
    });
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
      z-index: 0;
      pointer-events: none;
    `;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function generateStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.8,
        color,
        phase: Math.random() * Math.PI * 2,
        freq: 0.8 + Math.random() * 2.5,        // Twinkle speed
        baseAlpha: 0.25 + Math.random() * 0.55,
        sparkle: Math.random() < 0.12,          // 12% sparkle flares
        sparkleTimer: Math.random() * 1000,
      });
    }
  }

  function maybeSpawnMeteor() {
    if (Math.random() < 0.006 && meteors.length < 2) {
      meteors.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.4),
        len: 60 + Math.random() * 80,
        speed: 12 + Math.random() * 8,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2, // ~45 deg
        opacity: 0.9,
      });
    }
  }

  function animate() {
    const t = performance.now() * 0.001; // seconds

    // Deep space black base
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Subtle neon purple cosmic dust glow
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.25, 40, w * 0.5, h * 0.25, w * 0.8);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.07)');
    grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Draw stars
    for (const s of stars) {
      let alpha = s.baseAlpha + 0.35 * Math.sin(t * s.freq + s.phase);
      alpha = Math.max(0.08, Math.min(1, alpha));

      let radius = s.r;
      if (s.sparkle) {
        const sparklePhase = Math.sin(t * 0.4 + s.sparkleTimer);
        if (sparklePhase > 0.92) {
          alpha = 1;
          radius = s.r * 2.2;
        }
      }

      const [cr, cg, cb] = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
      ctx.fill();

      // Outer glow for brighter stars
      if (radius > 1.2 && alpha > 0.5) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha * 0.18})`;
        ctx.fill();
      }
    }

    // Meteors / shooting stars
    maybeSpawnMeteor();
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      const ex = m.x - Math.cos(m.angle) * m.len;
      const ey = m.y - Math.sin(m.angle) * m.len;

      const mGrad = ctx.createLinearGradient(m.x, m.y, ex, ey);
      mGrad.addColorStop(0, `rgba(255, 255, 255, ${m.opacity})`);
      mGrad.addColorStop(0.3, `rgba(168, 85, 247, ${m.opacity * 0.8})`);
      mGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = mGrad;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.opacity -= 0.02;

      if (m.opacity <= 0 || m.x > w + 100 || m.y > h + 100) {
        meteors.splice(i, 1);
      }
    }

    animId = requestAnimationFrame(animate);
  }

  return {
    init,
  };
})();
