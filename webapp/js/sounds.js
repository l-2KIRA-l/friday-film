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

  // Unlock audio context on first user gesture (mobile restriction)
  function unlock() {
    if (unlocked) return;
    const handler = () => {
      getAudioContext();
      for (const a of Object.values(audio)) {
        a.play().then(() => a.pause()).catch(() => {});
        a.currentTime = 0;
      }
      unlocked = true;
      document.removeEventListener('touchstart', handler, true);
      document.removeEventListener('click', handler, true);
    };
    document.addEventListener('touchstart', handler, true);
    document.addEventListener('click', handler, true);
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

  // Realistic Casino Wheel Peg Click
  function playTick() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Sharp wooden/plastic peg click sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1050 + Math.random() * 180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.022);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      gain.gain.setValueAtTime(0.38, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.025);
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
