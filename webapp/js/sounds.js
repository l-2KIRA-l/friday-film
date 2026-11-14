/* ============================================
   FRIDAY FILM — Audio Manager
   Preloads and plays sounds with mobile support
   + Casino Wheel Peg Tick Synthesizer
   ============================================ */

const Sounds = (() => {
  const files = {
    wow: 'sounds/wow.mp3',
    fireworks: 'sounds/fireworks.mp3',
    kidsHappy: 'sounds/kids-happy.mp3',
    happyTreeFriends: 'sounds/happy-tree-friends.mp3',
  };

  const audio = {};
  let unlocked = false;
  let audioCtx = null;

  function preload() {
    for (const [key, src] of Object.entries(files)) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
      audio[key] = a;
    }
  }

  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // Unlock Web Audio context cleanly on first user gesture without playing any sounds
  function unlock() {
    if (unlocked) return;
    const handler = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      unlocked = true;
      document.removeEventListener('touchstart', handler, true);
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('touchstart', handler, { capture: true, once: true });
    document.addEventListener('click', handler, { capture: true, once: true });
  }

  function play(key) {
    const a = audio[key];
    if (!a) return;
    a.currentTime = 0;
    a.play().catch(() => {});
  }

  function stop(key) {
    const a = audio[key];
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  }

  function stopAll() {
    for (const a of Object.values(audio)) {
      a.pause();
      a.currentTime = 0;
    }
  }

  // Realistic Casino Wheel Peg Click (Гучний, чіткий та соковитий)
  function playTick() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const t = ctx.currentTime;

      // 1. Woody/plastic peg impact punch
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const filter1 = ctx.createBiquadFilter();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400 + Math.random() * 250, t);
      osc1.frequency.exponentialRampToValueAtTime(140, t + 0.04);

      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(1500, t);
      filter1.Q.setValueAtTime(2.0, t);

      gain1.gain.setValueAtTime(1.3, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(t);
      osc1.stop(t + 0.042);

      // 2. High snap click transient (sharp edge of the casino flapper)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(3200 + Math.random() * 400, t);
      osc2.frequency.exponentialRampToValueAtTime(400, t + 0.02);

      gain2.gain.setValueAtTime(0.7, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(t);
      osc2.stop(t + 0.022);
    } catch (e) {}
  }

  return {
    init() {
      preload();
      unlock();
    },

    playWow() {
      play('wow');
    },

    playFireworks() {
      play('fireworks');
      play('kidsHappy');
    },

    playMemories() {
      stopAll();
      const a = audio.happyTreeFriends;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
    },

    stopMemories() {
      stop('happyTreeFriends');
    },

    playTick,
    stopAll,
  };
})();
