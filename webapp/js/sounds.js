/* ============================================
   FRIDAY FILM — Audio Manager
   Preloads and plays sounds with mobile support
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

  function preload() {
    for (const [key, src] of Object.entries(files)) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
      audio[key] = a;
    }
  }

  // Unlock audio context on first user gesture (mobile restriction)
  function unlock() {
    if (unlocked) return;
    const handler = () => {
      // Play and immediately pause all audio to unlock
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

  return {
    init() {
      preload();
      unlock();
    },

    playWow() {
      play('wow');
    },

    playFireworks() {
      // Play fireworks + kids-happy simultaneously
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

    stopAll,
  };
})();
