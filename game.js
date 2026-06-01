(() => {
  const STORAGE_KEY = "humanum-best-score";
  const LOCAL_LEADERBOARD_KEY = "humanum-local-leaderboard";
  const LEADERBOARD_META_NAME = "humanum-leaderboard-api";
  const LEADERBOARD_API_FALLBACK = "https://humanum-api.felix-7d1.workers.dev";
  const BUILD_VERSION = "1.7.0-1e5f067";
  const MAX_LEVEL = 5;
  const DURATION = 60;
  const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";
  const ROUND_DURATION = DEV_MODE ? 10 : DURATION;
  const LANE_COUNT = 5;
  const START_SCORE = 0;
  const PALETTE = {
    red: "#c00000",
    redDark: "#8b0000",
    redWarm: "#b53a2e",
    beige: "#d9c8a2",
    beigeLight: "#efe4c7",
    beigeSoft: "#f8f2de",
    navy: "#0c4575",
    navyDark: "#08335a",
    navyMid: "#1c578a",
    navySoft: "#4f78a8",
    ink: "#1a2740",
    paper: "#f8f4ea",
    gold: "#e4b84f",
    goldSoft: "#ffe49a",
    mint: "#d7e8f1",
    cream: "#f6ffd6",
    brown: "#8b4a2f",
  };

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const hudTime = document.getElementById("hud-time");
  const hudScore = document.getElementById("hud-score");
  const hudCombo = document.getElementById("hud-combo");
  const hudBest = document.getElementById("hud-best");

  const overlayStart = document.getElementById("overlay-start");
  const overlayEnd = document.getElementById("overlay-end");
  const banner = document.getElementById("banner");
  const finalTitle = document.getElementById("final-title");
  const finalScore = document.getElementById("final-score");
  const finalBest = document.getElementById("final-best");
  const finalEyebrow = overlayEnd?.querySelector(".panel-kicker");
  const hudLevel = document.getElementById("hud-level");
  const leaderboardToggle = document.getElementById("leaderboard-toggle");
  const leaderboardToggleHint = document.getElementById("leaderboard-toggle-hint");
  const resultLabelPrefix = document.getElementById("result-label-prefix");
  const leaderboardCard = document.getElementById("leaderboard-card");
  const bossActionButton = document.getElementById("boss-action");
  const rankingButton = document.getElementById("ranking-button");
  const shareStatus = document.getElementById("share-status");
  const leaderboardWeek = document.getElementById("leaderboard-week");
  const leaderboardForm = document.getElementById("leaderboard-form");
  const leaderboardName = document.getElementById("leaderboard-name");
  const leaderboardSubmit = document.getElementById("leaderboard-submit");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardStatus = document.getElementById("leaderboard-status");
  const buildVersion = document.getElementById("build-version");
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const shareButton = document.getElementById("share-button");
  const AudioCtor = window.AudioContext || window.webkitAudioContext || null;
  const ART_ASSET_SOURCES = {
    playerStudent: "assets/player-student.png",
    diploma: "assets/diploma.png",
    book: "assets/book.png",
    newsmonth: "assets/newsmonth.png",
    renataBoss: "assets/renata-boss.png",
    mba: "assets/MBA.png",
    pka: "assets/PKA.png",
    lapowka: "assets/lapowka.png",
  };
  const ASSET_RENDER_CONFIG = {
    playerStudent: {
      key: "playerStudent",
      scale: 1.1,
      offsetY: 0,
      bob: true,
      flipX: true,
    },
    diploma: {
      key: "diploma",
      scale: 1.1,
      offsetY: 0,
      sourceCrop: {
        x: 232,
        y: 69,
        width: 795,
        height: 1103,
      },
    },
    book: {
      key: "book",
      scale: 0.75,
      rotate: true,
    },
    newsmonth: {
      key: "newsmonth",
      scale: 0.9,
      rotate: true,
    },
    renataBoss: {
      key: "renataBoss",
      scale: 1.25,
      offsetY: 0,
      bob: true,
    },
    mba: {
      key: "mba",
      scale: 3.12,
      drawScale: 1.55,
    },
    pka: {
      key: "pka",
      scale: 4.12,
      drawScale: 1.8,
    },
    lapowka: {
      key: "lapowka",
      scale: 3.0,
      drawScale: 1.5,
    },
  };

  const BOSS_HP_BY_LEVEL = [6, 9, 12, 16, 21];
  const BOSS_ATTACK_INTERVAL_BY_LEVEL = [1.45, 1.25, 1.1, 0.95, 0.82];
  const BOOK_COOLDOWN_BY_LEVEL = [0.45, 0.48, 0.52, 0.56, 0.6];

  const audio = {
    context: null,
    master: null,
    unlocked: false,
  };

  const assets = {
    loaded: false,
    images: Object.create(null),
    loadingPromise: null,
  };

  const view = {
    width: 0,
    height: 0,
    dpr: 1,
  };

  const state = {
    mode: "start",
    timeLeft: ROUND_DURATION,
    score: START_SCORE,
    bestScore: loadBestScore(),
    level: 1,
    phase: "collect",
    transitionKind: null,
    levelProgress: 0,
    levelGoal: 6,
    levelScoreStart: 0,
    levelCompleteScore: 0,
    playerHp: 3,
    combo: 0,
    bonusUnlocked: false,
    spawnTimer: 0,
    specialDrop: null,
    pkaTimer: 0,
    pkaStorm: 0,
    cancelWave: 0,
    items: [],
    bossShots: [],
    playerShots: [],
    boss: null,
    attackCooldown: 0,
    transitionTimer: 0,
    popups: [],
    flash: 0,
    shake: 0,
    mbaFx: 0,
    speedBoost: 0,
    bannerTimer: 0,
    bannerText: "",
    pausedReason: "",
    lastFrame: 0,
    psychologyFx: 0,
    leaderboardWeekKey: getIsoWeekKey(new Date()),
    leaderboardLevel: 1,
    leaderboardEntries: [],
    leaderboardLoading: false,
    leaderboardExpanded: false,
    resultKind: "",
    endGameReason: "",
    gameoverTitle: "Koniec gry",
    leaderboardSubmissionScore: 0,
    player: {
      lane: Math.floor(LANE_COUNT / 2),
      x: 0,
      y: 0,
      width: 60,
      height: 88,
      bob: 0,
      facing: 1,
      runPhase: 0,
    },
    input: {
      dragging: false,
      pointerId: null,
      touchMode: false,
    },
  };

  if (DEV_MODE) {
    window.__HUMANOOB_DEV = { state };
  }

  const laneSpacing = () => {
    const inner = view.width * 0.82;
    return inner / (LANE_COUNT - 1);
  };

  function laneX(lane) {
    const left = view.width * 0.09;
    return left + laneSpacing() * lane;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function snap4(value) {
    return Math.round(value / 4) * 4;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomLane() {
    return Math.floor(Math.random() * LANE_COUNT);
  }

  function ensureAudioContext() {
    if (!AudioCtor) {
      return null;
    }

    if (!audio.context) {
      audio.context = new AudioCtor();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.08;
      audio.master.connect(audio.context.destination);
    }

    if (audio.context.state === "suspended") {
      audio.context.resume().catch(() => {});
    }

    audio.unlocked = true;
    return audio.context;
  }

  function playTone({
    freq = 440,
    to = null,
    type = "sine",
    gain = 0.06,
    duration = 0.12,
    when = 0,
    detune = 0,
  } = {}) {
    const context = ensureAudioContext();
    if (!context || !audio.master) {
      return;
    }

    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
    }
    if (detune) {
      osc.detune.setValueAtTime(detune, start);
    }
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(audio.master);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function playNoise({
    duration = 0.08,
    gain = 0.03,
    when = 0,
    lowpass = 1200,
  } = {}) {
    const context = ensureAudioContext();
    if (!context || !audio.master) {
      return;
    }

    const start = context.currentTime + when;
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(lowpass, start);
    const amp = context.createGain();
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(audio.master);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  function playSound(name) {
    if (!AudioCtor) {
      return;
    }

    ensureAudioContext();

    switch (name) {
      case "start":
        playTone({ freq: 392, to: 523, type: "triangle", gain: 0.05, duration: 0.12 });
        playTone({ freq: 659, to: 784, type: "triangle", gain: 0.035, duration: 0.14, when: 0.12 });
        break;
      case "catch":
        playTone({ freq: 920, to: 1320, type: "triangle", gain: 0.045, duration: 0.08 });
        break;
      case "cash":
        playTone({ freq: 560, to: 760, type: "square", gain: 0.05, duration: 0.08 });
        playTone({ freq: 820, to: 1040, type: "square", gain: 0.035, duration: 0.08, when: 0.06 });
        break;
      case "mba":
        playTone({ freq: 392, to: 523, type: "triangle", gain: 0.05, duration: 0.1 });
        playTone({ freq: 523, to: 659, type: "triangle", gain: 0.045, duration: 0.1, when: 0.08 });
        playTone({ freq: 659, to: 880, type: "triangle", gain: 0.04, duration: 0.12, when: 0.16 });
        break;
      case "psychologia":
        playTone({ freq: 248, to: 196, type: "sine", gain: 0.035, duration: 0.16 });
        playTone({ freq: 392, to: 312, type: "triangle", gain: 0.025, duration: 0.18, when: 0.05 });
        break;
      case "pka-alert":
        playTone({ freq: 210, to: 160, type: "sawtooth", gain: 0.04, duration: 0.16 });
        playTone({ freq: 150, to: 110, type: "square", gain: 0.03, duration: 0.18, when: 0.08 });
        break;
      case "pka-cancel":
        playTone({ freq: 260, to: 120, type: "square", gain: 0.05, duration: 0.18 });
        playNoise({ duration: 0.11, gain: 0.02, lowpass: 800, when: 0.02 });
        break;
      case "boss-intro":
        playTone({ freq: 523, to: 392, type: "triangle", gain: 0.04, duration: 0.12 });
        playTone({ freq: 392, to: 330, type: "triangle", gain: 0.04, duration: 0.12, when: 0.14 });
        playTone({ freq: 330, to: 294, type: "triangle", gain: 0.05, duration: 0.16, when: 0.28 });
        break;
      case "boss-clear":
        playTone({ freq: 330, to: 440, type: "triangle", gain: 0.05, duration: 0.12 });
        playTone({ freq: 440, to: 587, type: "triangle", gain: 0.04, duration: 0.14, when: 0.12 });
        playTone({ freq: 659, to: 784, type: "triangle", gain: 0.04, duration: 0.16, when: 0.26 });
        break;
      case "hit":
        playNoise({ duration: 0.06, gain: 0.028, lowpass: 900 });
        playTone({ freq: 140, to: 90, type: "square", gain: 0.03, duration: 0.08 });
        break;
      case "hurt":
        playNoise({ duration: 0.08, gain: 0.035, lowpass: 500 });
        playTone({ freq: 90, to: 70, type: "sawtooth", gain: 0.035, duration: 0.12 });
        break;
      case "level-clear":
        playTone({ freq: 440, to: 523, type: "triangle", gain: 0.04, duration: 0.1 });
        playTone({ freq: 587, to: 698, type: "triangle", gain: 0.04, duration: 0.1, when: 0.1 });
        break;
      case "gameover":
        playTone({ freq: 392, to: 262, type: "triangle", gain: 0.05, duration: 0.16 });
        playTone({ freq: 262, to: 196, type: "triangle", gain: 0.045, duration: 0.18, when: 0.16 });
        break;
      default:
        break;
    }
  }

  function getRoundProgress() {
    return clamp(1 - state.timeLeft / ROUND_DURATION, 0, 1);
  }

  function getDifficulty(progress, level = state.level) {
    const curve = Math.pow(progress, 1.35);
    const levelStep = clamp((level - 1) / Math.max(1, MAX_LEVEL - 1), 0, 1);
    const levelBias = levelStep * 0.42;
    const mix = clamp(curve * 0.72 + levelBias, 0, 1);
    const diplomaSpeedLevelMultiplier = lerp(1, 1.42, levelStep);
    const spawnIntervalLevelMultiplier = lerp(1, 0.72, levelStep);
    return {
      progress,
      curve: mix,
      diplomaSpeed: lerp(128, 305, mix) * diplomaSpeedLevelMultiplier,
      diplomaSpeedJitter: lerp(0.18, 0.12, mix),
      spawnInterval: lerp(0.98, 0.38, mix) * spawnIntervalLevelMultiplier,
      extraSpawnChance: lerp(0.08, 0.21, mix) + levelStep * 0.05,
      pkaDelayMin: lerp(15, 9, mix),
      pkaDelayMax: lerp(21, 14, mix),
      pkaSpeed: lerp(280, 440, mix),
      pkaVerticalBoost: lerp(1.1, 1.34, mix),
    };
  }

  function logFlow(label, payload = {}) {
    if (!DEV_MODE) {
      return;
    }

    console.log("[FLOW]", JSON.stringify({
      label,
      level: state.level,
      phase: state.phase,
      mode: state.mode,
      ...payload,
      t: Math.round(performance.now()),
    }));
  }

  function getLevelGoal(level) {
    return 4 + clamp(level, 1, MAX_LEVEL);
  }

  function getDiplomaTheme(level) {
    const themes = [
      { body: PALETTE.beigeSoft, stripe: PALETTE.gold, text: PALETTE.navyDark, accent: PALETTE.beige },
      { body: "#ffe8a6", stripe: "#d9a404", text: "#5a4100", accent: "#fff3c9" },
      { body: "#d8e8ff", stripe: "#2f63cc", text: "#15316a", accent: "#eef5ff" },
      { body: "#ead8ff", stripe: "#7b38bd", text: "#35135a", accent: "#f5ecff" },
      { body: "#ffd7d7", stripe: "#c91515", text: "#5a0f0f", accent: "#ffeded" },
    ];

    return themes[clamp(level - 1, 0, themes.length - 1)];
  }

  function getBossConfig(level) {
    const levelIndex = clampLevel(level) - 1;
    const normalized = clamp(levelIndex / Math.max(1, MAX_LEVEL - 1), 0, 1);
    return {
      name: "Renata",
      hp: BOSS_HP_BY_LEVEL[levelIndex],
      attackInterval: BOSS_ATTACK_INTERVAL_BY_LEVEL[levelIndex],
      attackJitter: lerp(0.18, 0.08, normalized),
      shotSpeed: lerp(220, 300, normalized),
      shotSpread: lerp(0.02, 0.08, normalized),
      shotCount: level >= 4 ? 2 : 1,
      playerHp: 3,
      label: `Boss Renata`,
    };
  }

  function stripTrailingSlash(value) {
    return String(value || "").trim().replace(/\/$/, "");
  }

  function getLeaderboardApiCandidates() {
    const candidates = [];

    if (window.location.protocol !== "file:") {
      candidates.push(stripTrailingSlash(new URL("/api", window.location.href).toString()));
    }

    const meta = document.querySelector(`meta[name="${LEADERBOARD_META_NAME}"]`);
    if (meta?.content?.trim()) {
      candidates.push(stripTrailingSlash(meta.content));
    }

    candidates.push(stripTrailingSlash(LEADERBOARD_API_FALLBACK));

    return [...new Set(candidates.filter(Boolean))];
  }

  async function fetchLeaderboardJson(path, options = {}) {
    const candidates = getLeaderboardApiCandidates();
    let lastError = null;

    for (const base of candidates) {
      try {
        const response = await fetch(`${base}${path}`, options);
        if (response.ok) {
          return response;
        }
        lastError = new Error(`HTTP ${response.status} from ${base}`);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Leaderboard backend unavailable.");
  }

  function getIsoWeekKey(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function clampLevel(level) {
    return clamp(Number(level) || 1, 1, MAX_LEVEL);
  }

  function loadAssetImage(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve({ src, image, loaded: true });
      image.onerror = () => resolve({ src, image: null, loaded: false });
      image.src = src;
    });
  }

  async function preloadArtAssets() {
    if (assets.loadingPromise) {
      return assets.loadingPromise;
    }

    assets.loadingPromise = Promise.all(
      Object.entries(ART_ASSET_SOURCES).map(async ([key, src]) => {
        const result = await loadAssetImage(src);
        return [key, result.loaded ? result.image : null];
      })
    ).then((entries) => {
      for (const [key, image] of entries) {
        if (image) {
          assets.images[key] = image;
        }
      }
      assets.loaded = true;
      return assets.images;
    });

    return assets.loadingPromise;
  }

  function getArtImage(key) {
    const image = assets.images[key];
    if (!image || !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return null;
    }
    return image;
  }

  function drawAssetContain(image, centerX, centerY, boxW, boxH, options = {}) {
    if (!image) {
      return false;
    }

    const iw = image.naturalWidth || image.width || 0;
    const ih = image.naturalHeight || image.height || 0;
    if (!iw || !ih) {
      return false;
    }

    const crop = options.sourceCrop || null;
    const sx = crop ? Math.max(0, Math.round(crop.x ?? 0)) : 0;
    const sy = crop ? Math.max(0, Math.round(crop.y ?? 0)) : 0;
    const sw = crop
      ? Math.max(1, Math.round(crop.width ?? (iw - sx - Math.round(crop.right ?? 0))))
      : iw;
    const sh = crop
      ? Math.max(1, Math.round(crop.height ?? (ih - sy - Math.round(crop.bottom ?? 0))))
      : ih;
    const scale = Math.min(boxW / sw, boxH / sh);
    const drawW = Math.max(1, Math.round(sw * scale));
    const drawH = Math.max(1, Math.round(sh * scale));
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(centerX + offsetX), Math.round(centerY + offsetY));
    if (options.rotate) {
      ctx.rotate(options.rotate);
    }
    if (options.flipX) {
      ctx.scale(-1, 1);
    }
    if (crop) {
      ctx.drawImage(image, sx, sy, sw, sh, -Math.round(drawW / 2), -Math.round(drawH / 2), Math.round(drawW), Math.round(drawH));
    } else {
      ctx.drawImage(image, -Math.round(drawW / 2), -Math.round(drawH / 2), Math.round(drawW), Math.round(drawH));
    }
    ctx.restore();
    return true;
  }

  function drawDiplomaCancelOverlay(item, x, y, w, h) {
    if (state.pkaStorm <= 0) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = PALETTE.red;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.34, y + h * 0.18);
    ctx.lineTo(x + w * 0.34, y + h * 0.82);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.34, y + h * 0.18);
    ctx.lineTo(x - w * 0.34, y + h * 0.82);
    ctx.stroke();
    ctx.fillStyle = PALETTE.red;
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ANUL.", x, y + h * 0.26);
    ctx.restore();
  }

  function drawPsychologyOverlay(x, y, w, h) {
    ctx.fillStyle = "#1b1b1b";
    ctx.fillRect(x - w * 0.12, y + h * 0.15, w * 0.08, h * 0.05);
    ctx.fillRect(x + w * 0.04, y + h * 0.15, w * 0.08, h * 0.05);
    ctx.fillRect(x - w * 0.16, y + h * 0.22, w * 0.04, h * 0.11);
    ctx.fillRect(x + w * 0.12, y + h * 0.22, w * 0.04, h * 0.11);
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(x - w * 0.10, y + h * 0.20, w * 0.20, h * 0.04);
    ctx.fillStyle = "#b3e8d8";
    ctx.fillRect(x - w * 0.10, y + h * 0.26, w * 0.04, h * 0.04);
    ctx.fillRect(x + w * 0.06, y + h * 0.26, w * 0.04, h * 0.04);
    ctx.fillStyle = "#d7fff2";
    ctx.fillRect(x - w * 0.08, y + h * 0.62, w * 0.16, h * 0.04);
    ctx.fillStyle = "#9fe3cf";
    ctx.fillRect(x - w * 0.05, y + h * 0.58, w * 0.10, h * 0.03);
  }

  function drawAssetSprite(key, centerX, centerY, boxW, boxH, options = {}) {
    const image = getArtImage(key);
    if (!image) {
      return false;
    }

    const config = ASSET_RENDER_CONFIG[key] || {};
    const scale = options.scale ?? config.scale ?? 1;
    const renderScale = options.drawScale ?? config.drawScale ?? 1;
    const scaleX = options.scaleX ?? 1;
    const scaleY = options.scaleY ?? 1;
    const drawW = Math.max(1, Math.round(boxW * scale * renderScale * scaleX));
    const drawH = Math.max(1, Math.round(boxH * scale * renderScale * scaleY));
    const offsetX = Math.round((options.offsetX ?? config.offsetX ?? 0) + 0);
    const offsetY = Math.round((options.offsetY ?? config.offsetY ?? 0) + 0);
    const rotate = options.rotate ?? config.rotate ?? false;
    const flipX = options.flipX ?? config.flipX ?? false;
    const finalRotate = typeof rotate === "number"
      ? rotate
      : rotate
        ? (options.angle ?? 0)
        : 0;

    return drawAssetContain(image, centerX, centerY, drawW, drawH, {
      offsetX,
      offsetY,
      rotate: finalRotate,
      flipX,
      sourceCrop: options.sourceCrop ?? config.sourceCrop ?? null,
    });
  }

  function getLeaderboardScopeKey(weekKey, level) {
    return `${weekKey}::${clampLevel(level)}`;
  }

  function formatWeekLabel(weekKey, level = state.leaderboardLevel) {
    return weekKey ? `Tydzień ${weekKey} · Poziom ${clampLevel(level)}` : "Tydzień —";
  }

  function sanitizeNickname(name) {
    return String(name || "")
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F<>`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);
  }

  function setLeaderboardStatus(text, loading = false) {
    leaderboardStatus.textContent = text;
    leaderboardSubmit.disabled = loading;
    leaderboardName.disabled = loading;
  }

  function setLeaderboardExpanded(expanded) {
    state.leaderboardExpanded = Boolean(expanded);
    leaderboardCard.classList.toggle("leaderboard-collapsed", !state.leaderboardExpanded);
    leaderboardToggle.setAttribute("aria-expanded", String(state.leaderboardExpanded));
    leaderboardToggleHint.textContent = state.leaderboardExpanded
      ? "Kliknij, aby ukryć ranking"
      : "Kliknij, aby otworzyć ranking";
  }

  function syncResultOverlay(kind = state.resultKind || state.mode) {
    const levelClear = kind === "levelclear";
    const scoreValue = levelClear ? state.levelCompleteScore : state.score;
    const prefix = levelClear ? "Wynik poziomu:" : "Najlepszy wynik:";
    const playerDead = !levelClear && state.endGameReason === "player-dead";
    const gameoverTitle = playerDead ? "RENATA WYGRA\u0141A" : "KONIEC GRY";

    if (resultLabelPrefix) {
      resultLabelPrefix.textContent = prefix;
    }

    if (finalEyebrow) {
      finalEyebrow.textContent = levelClear
        ? "Poziom zaliczony"
        : (playerDead ? "BOSS WYGRA\u0141" : "KONIEC GRY");
    }
    finalTitle.textContent = levelClear ? `Poziom ${state.level} zaliczony` : gameoverTitle;
    finalScore.textContent = String(scoreValue);
    finalBest.textContent = String(levelClear ? scoreValue : state.bestScore);
    restartButton.textContent = levelClear
      ? (state.level >= MAX_LEVEL ? "Zakończ grę" : "Następny poziom")
      : (playerDead ? "SPR\u00d3BUJ PONOWNIE" : "Zagraj ponownie");
    leaderboardSubmit.textContent = levelClear ? "Zapisz poziom" : "Zapisz wynik";
    leaderboardToggleHint.textContent = state.leaderboardExpanded
      ? (levelClear ? "Kliknij, aby ukryć ranking poziomu" : "Kliknij, aby ukryć ranking")
      : (levelClear ? "Kliknij, aby otworzyć ranking poziomu" : "Kliknij, aby otworzyć ranking");
    setLeaderboardStatus(
      levelClear
        ? "Wpisz login i zapisz wynik tego poziomu."
        : "Wpisz login i zapisz wynik po zakończeniu gry.",
      false
    );
    shareStatus.textContent = playerDead ? "Trafi\u0142y Ci\u0119 NEWSMONTH-y" : "";
  }

  function readLocalLeaderboardStore() {
    try {
      const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeLocalLeaderboardStore(store) {
    try {
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(store));
    } catch {
      // Ignore storage failures in private or restricted contexts.
    }
  }

  function sortLeaderboardEntries(entries = []) {
    return entries
      .slice()
      .sort((a, b) => {
        const scoreDiff = Number(b.score ?? 0) - Number(a.score ?? 0);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
        const timeA = new Date(a.updated_at || 0).getTime();
        const timeB = new Date(b.updated_at || 0).getTime();
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return String(a.nickname || "").localeCompare(String(b.nickname || ""));
      })
      .slice(0, 20);
  }

  function getLocalLeaderboardEntries(weekKey, level = state.leaderboardLevel) {
    const store = readLocalLeaderboardStore();
    const weekBucket = store[weekKey];
    if (Array.isArray(weekBucket)) {
      return clampLevel(level) === 1 ? sortLeaderboardEntries(weekBucket) : [];
    }

    const entries = weekBucket && typeof weekBucket === "object" ? weekBucket[String(clampLevel(level))] : [];
    return sortLeaderboardEntries(entries);
  }

  function upsertLocalLeaderboardEntry(weekKey, level, nickname, score) {
    const store = readLocalLeaderboardStore();
    const bucketKey = String(clampLevel(level));
    const existingWeekBucket = Array.isArray(store[weekKey])
      ? { 1: store[weekKey].slice() }
      : (store[weekKey] && typeof store[weekKey] === "object" ? { ...store[weekKey] } : {});
    const entries = Array.isArray(existingWeekBucket[bucketKey]) ? existingWeekBucket[bucketKey].slice() : [];
    const updatedAt = new Date().toISOString();
    const existingIndex = entries.findIndex((entry) => String(entry.nickname || "") === nickname);

    if (existingIndex >= 0) {
      const existingScore = Number(entries[existingIndex].score ?? 0);
      if (score > existingScore) {
        entries[existingIndex] = {
          nickname,
          score,
          updated_at: updatedAt,
        };
      }
    } else {
      entries.push({
        nickname,
        score,
        updated_at: updatedAt,
      });
    }

    existingWeekBucket[bucketKey] = sortLeaderboardEntries(entries);
    store[weekKey] = existingWeekBucket;
    writeLocalLeaderboardStore(store);
    return store[weekKey][bucketKey];
  }

  function renderLeaderboard(entries = []) {
    leaderboardWeek.textContent = formatWeekLabel(state.leaderboardWeekKey, state.leaderboardLevel);
    leaderboardList.textContent = "";

    if (!entries.length) {
      const item = document.createElement("li");
      item.className = "leaderboard-entry leaderboard-empty";
      item.textContent = "Brak wyników w tym tygodniu dla tego poziomu.";
      leaderboardList.appendChild(item);
      return;
    }

    entries.slice(0, 20).forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "leaderboard-entry";

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `#${index + 1}`;

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = entry.nickname || "anon";

      const score = document.createElement("span");
      score.className = "leaderboard-score";
      score.textContent = String(entry.score ?? 0);

      item.append(rank, name, score);
      leaderboardList.appendChild(item);
    });
  }

  async function loadLeaderboard() {
    state.leaderboardWeekKey = getIsoWeekKey(new Date());
    state.leaderboardLevel = clampLevel(state.level || state.leaderboardLevel);
    leaderboardWeek.textContent = formatWeekLabel(state.leaderboardWeekKey, state.leaderboardLevel);

    state.leaderboardLoading = true;
    setLeaderboardStatus("Ładowanie tabeli...", true);

    try {
      const response = await fetchLeaderboardJson(`/leaderboard?week=${encodeURIComponent(state.leaderboardWeekKey)}&level=${encodeURIComponent(state.leaderboardLevel)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      state.leaderboardEntries = entries;
      renderLeaderboard(entries);
      setLeaderboardStatus(entries.length ? "Wyniki online dla tego poziomu są gotowe." : "Na ten tydzień i poziom jeszcze nikt nie dodał wyniku.", false);
    } catch (error) {
      console.error("Leaderboard load failed:", error);
      const localEntries = getLocalLeaderboardEntries(state.leaderboardWeekKey, state.leaderboardLevel);
      state.leaderboardEntries = localEntries;
      renderLeaderboard(localEntries);
      setLeaderboardStatus(
        localEntries.length
          ? "Backend leaderboardu jest chwilowo niedostępny. Pokazuję zapis lokalny dla tego poziomu."
          : "Backend leaderboardu jest chwilowo niedostępny. Możesz zapisać wynik lokalnie.",
        false
      );
    } finally {
      state.leaderboardLoading = false;
    }
  }

  async function submitLeaderboardEntry(event) {
    event.preventDefault();
    const isLevelClear = state.mode === "levelclear";
    if (state.mode !== "gameover" && !isLevelClear) {
      return;
    }

    const nickname = sanitizeNickname(leaderboardName.value);
    if (!nickname) {
      setLeaderboardStatus("Wpisz login przed zapisaniem wyniku.", false);
      leaderboardName.focus();
      return;
    }

    state.leaderboardWeekKey = getIsoWeekKey(new Date());
    state.leaderboardLevel = clampLevel(state.level || state.leaderboardLevel);
    const scoreToSubmit = isLevelClear ? state.levelCompleteScore : state.score;
    state.leaderboardSubmissionScore = scoreToSubmit;
    setLeaderboardStatus(isLevelClear ? "Zapisywanie poziomu..." : "Zapisywanie wyniku...", true);

    try {
      const response = await fetchLeaderboardJson("/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nickname,
          score: scoreToSubmit,
          weekKey: state.leaderboardWeekKey,
          level: state.leaderboardLevel,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const entries = Array.isArray(payload.entries) ? payload.entries : [];
      state.leaderboardEntries = entries;
      renderLeaderboard(entries);
      leaderboardName.value = nickname;
      setLeaderboardStatus(isLevelClear ? "Poziom zapisany. Tabela odświeżona." : "Wynik zapisany. Tabela odświeżona.", false);
    } catch (error) {
      console.error("Leaderboard submit failed:", error);
      const localEntries = upsertLocalLeaderboardEntry(state.leaderboardWeekKey, state.leaderboardLevel, nickname, scoreToSubmit);
      state.leaderboardEntries = localEntries;
      renderLeaderboard(localEntries);
      leaderboardName.value = nickname;
      setLeaderboardStatus(
        isLevelClear
          ? "Poziom zapisany lokalnie. Backend leaderboardu jest chwilowo niedostępny."
          : "Wynik zapisany lokalnie dla tego poziomu. Backend leaderboardu jest chwilowo niedostępny.",
        false
      );
    }
  }

  function loadBestScore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = Number.parseInt(raw || "0", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // localStorage may be unavailable in private/file contexts.
    }
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function syncHud() {
    hudTime.textContent = formatTime(state.timeLeft);
    hudLevel.textContent = state.phase === "boss" ? `B${state.level}` : `L${state.level}/5`;
    hudScore.textContent = String(state.score);
    hudCombo.textContent = state.combo > 0 ? `x${state.combo}` : "0";
    hudBest.textContent = String(Math.max(state.bestScore, state.score));
    syncBossActionButton();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    view.width = Math.max(1, rect.width);
    view.height = Math.max(1, rect.height);
    view.dpr = dpr;

    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(view.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    state.player.y = view.height * 0.83;
    state.player.height = Math.max(72, view.height * 0.12);
    state.player.width = Math.max(54, view.width * 0.14);
    state.player.x = laneX(state.player.lane);
  }

  function showBanner(text, duration = 1.1) {
    state.bannerText = text;
    state.bannerTimer = duration;
    banner.textContent = text;
    banner.classList.add("show");
  }

  function hideBanner() {
    state.bannerTimer = 0;
    state.bannerText = "";
    banner.classList.remove("show");
    banner.textContent = "";
  }

  function setOverlay(which) {
    const showStart = which === "start";
    const showEnd = which === "end";
    overlayStart.classList.toggle("overlay-visible", showStart);
    overlayEnd.classList.toggle("overlay-visible", showEnd);
  }

  function syncBossActionButton() {
    if (!bossActionButton) {
      return;
    }
    const bossMode = state.mode === "playing" && state.phase === "boss";
    bossActionButton.hidden = !bossMode;
    bossActionButton.disabled = !bossMode || state.attackCooldown > 0;
    bossActionButton.textContent = state.attackCooldown > 0 ? "Chwila..." : "Kop / Książka";
  }

  function clearBattlefield() {
    state.items.length = 0;
    state.bossShots.length = 0;
    state.playerShots.length = 0;
    state.specialDrop = null;
  }

  function beginCollectPhase(level = 1) {
    state.mode = "playing";
    state.level = clamp(level, 1, MAX_LEVEL);
    state.phase = "collect";
    state.transitionKind = null;
    state.resultKind = "";
    state.endGameReason = "";
    state.gameoverTitle = "Koniec gry";
    state.timeLeft = ROUND_DURATION;
    state.levelProgress = 0;
    state.levelGoal = getLevelGoal(state.level);
    state.levelScoreStart = state.score;
    state.levelCompleteScore = 0;
    state.leaderboardLevel = state.level;
    state.leaderboardSubmissionScore = state.score;
    state.playerHp = 3;
    state.combo = 0;
    state.bonusUnlocked = false;
    state.spawnTimer = 0;
    state.pkaTimer = randomRange(13, 18);
    state.pkaStorm = 0;
    state.cancelWave = 0;
    state.boss = null;
    state.attackCooldown = 0;
    state.transitionTimer = 0;
    clearBattlefield();
    showBanner(`Poziom ${state.level}`, 1.0);
    syncHud();
  }

  function beginBossPhase() {
    state.transitionKind = null;
    const boss = getBossConfig(state.level);
    state.phase = "boss";
    state.boss = {
      name: boss.name,
      label: boss.label,
      level: state.level,
      x: view.width * 0.5,
      y: view.height * 0.19,
      width: Math.max(110, view.width * 0.24),
      height: Math.max(98, view.height * 0.15),
      hp: boss.hp,
      maxHp: boss.hp,
      attackTimer: randomRange(0.5, boss.attackInterval),
      attackInterval: boss.attackInterval,
      attackJitter: boss.attackJitter,
      shotSpeed: boss.shotSpeed,
      shotSpread: boss.shotSpread,
      shotCount: boss.shotCount,
      hitCooldown: 0,
    };
    state.playerHp = boss.playerHp;
    state.attackCooldown = 0;
    state.spawnTimer = 0;
    state.combo = 0;
    state.bonusUnlocked = false;
    state.pkaTimer = randomRange(14, 20);
    clearBattlefield();
    showBanner(`${boss.label} - poziom ${state.level}`, 1.35);
    syncHud();
  }

  function beginBossIntroPhase() {
    state.phase = "transition";
    state.transitionKind = "boss-intro";
    state.transitionTimer = 3;
    state.levelCompleteScore = state.score - state.levelScoreStart;
    state.boss = null;
    state.attackCooldown = 0;
    clearBattlefield();
    playSound("boss-intro");
  }

  function beginLevelClearPhase() {
    logFlow("beginLevelClearPhase", { level: state.level });
    state.phase = "transition";
    state.transitionKind = "level-clear";
    state.transitionTimer = 2.2;
    state.levelCompleteScore = state.score - state.levelScoreStart;
    state.boss = null;
    state.attackCooldown = 0;
    clearBattlefield();
    playSound("level-clear");
  }

  function finishLevel() {
    logFlow("finishLevel", { nextLevel: state.level + 1 });
    state.transitionKind = null;
    setOverlay(null);
    if (state.level >= MAX_LEVEL) {
      endGame("final-level-finish");
      return;
    }
    beginCollectPhase(state.level + 1);
  }

  function showLevelClearResults() {
    logFlow("showLevelClearResults", { level: state.level });
    state.mode = "levelclear";
    state.phase = "results";
    state.resultKind = "levelclear";
    state.leaderboardWeekKey = getIsoWeekKey(new Date());
    state.leaderboardLevel = state.level;
    state.leaderboardSubmissionScore = state.levelCompleteScore;
    setOverlay("end");
    setLeaderboardExpanded(true);
    syncResultOverlay("levelclear");
    renderLeaderboard([]);
    loadLeaderboard();
    syncHud();
    syncBossActionButton();
    showBanner(`Poziom ${state.level} zaliczony`, 1.0);
  }

  function defeatBoss() {
    logFlow("defeatBoss", { level: state.level, score: state.score });
    state.flash = Math.max(state.flash, 0.4);
    state.shake = Math.max(state.shake, 0.2);
    const bonus = 120 + state.level * 30;
    state.score += bonus;
    addPopup(`+${bonus}`, view.width * 0.5, view.height * 0.18, PALETTE.goldSoft);
    state.levelCompleteScore = state.score - state.levelScoreStart;
    playSound("boss-clear");
    if (state.level >= MAX_LEVEL) {
      endGame("final-boss");
      return;
    }
    showBanner(`Poziom ${state.level} zaliczony`, 1.1);
    beginLevelClearPhase();
  }

  function fireBook() {
    if (state.mode !== "playing" || state.phase !== "boss" || !state.boss || state.attackCooldown > 0) {
      return;
    }

    const levelIndex = clampLevel(state.level) - 1;
    const cooldown = BOOK_COOLDOWN_BY_LEVEL[levelIndex];
    state.attackCooldown = cooldown;
    state.playerShots.push({
      type: "book",
      x: state.player.x,
      y: state.player.y - state.player.height * 0.4,
      vx: randomRange(-18, 18),
      vy: -420 - state.level * 18,
      w: 40,
      h: 28,
      life: 1.4,
    });
    addPopup("KSIĄŻKA!", state.player.x, state.player.y - state.player.height * 0.5, PALETTE.cream);
    state.flash = Math.max(state.flash, 0.1);
  }

  function spawnBossShot() {
    if (!state.boss) {
      return;
    }

    const boss = state.boss;
    const count = boss.shotCount;
    const spread = boss.shotSpread;

    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i === 0 ? -1 : 1) * boss.width * 0.18;
      const targetX = state.player.x + (i === 0 ? -1 : 1) * boss.width * spread;
      state.bossShots.push({
        type: "newsmonth",
        x: boss.x + offset,
        y: boss.y + boss.height * 0.44,
        vx: 0,
        vy: boss.shotSpeed * 0.94,
        targetX,
        w: 56,
        h: 88,
        life: 3.0,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    boss.attackTimer = boss.attackInterval + randomRange(-boss.attackJitter, boss.attackJitter);
  }

  function hitBoss(damage, sourceX, sourceY) {
    if (!state.boss) {
      return;
    }

    if (state.boss.hitCooldown > 0) {
      return;
    }

    state.boss.hp = Math.max(0, state.boss.hp - damage);
    state.boss.hitCooldown = 0.22;
    state.flash = Math.max(state.flash, 0.22);
    state.shake = Math.max(state.shake, 0.18);
    addPopup(`-${damage}`, sourceX, sourceY, PALETTE.goldSoft);
    playSound("hit");
    if (state.boss.hp <= 0) {
      defeatBoss();
    }
  }

  function hitPlayer(damage, sourceX, sourceY) {
    if (state.mode !== "playing" || state.phase !== "boss" || !state.boss || state.boss.hp <= 0) {
      return;
    }
    state.playerHp = Math.max(0, state.playerHp - damage);
    state.flash = Math.max(state.flash, 0.18);
    state.shake = Math.max(state.shake, 0.22);
    addPopup(`-${damage}`, sourceX, sourceY, PALETTE.redWarm);
    playSound("hurt");
    if (state.playerHp <= 0) {
      showBanner("Renata wygra\u0142a", 1.1);
      endGame("player-dead");
    }
  }

  function resetRound() {
    state.mode = "playing";
    state.timeLeft = ROUND_DURATION;
    state.score = START_SCORE;
    state.level = 1;
    state.phase = "collect";
    state.transitionKind = null;
    state.levelProgress = 0;
    state.levelGoal = getLevelGoal(1);
    state.levelScoreStart = 0;
    state.levelCompleteScore = 0;
    state.playerHp = 3;
    state.combo = 0;
    state.bonusUnlocked = false;
    state.spawnTimer = 0;
    state.specialDrop = null;
    state.pkaTimer = randomRange(14, 20);
    state.pkaStorm = 0;
    state.cancelWave = 0;
    state.psychologyFx = 0;
    state.items.length = 0;
    state.bossShots.length = 0;
    state.playerShots.length = 0;
    state.boss = null;
    state.attackCooldown = 0;
    state.transitionTimer = 0;
    state.resultKind = "";
    state.endGameReason = "";
    state.gameoverTitle = "Koniec gry";
    state.leaderboardSubmissionScore = state.score;
    state.popups.length = 0;
    state.flash = 0;
    state.shake = 0;
    state.mbaFx = 0;
    state.speedBoost = 0;
    state.bannerTimer = 0;
    state.pausedReason = "";
    state.player.lane = Math.floor(LANE_COUNT / 2);
    state.player.x = laneX(state.player.lane);
    state.player.bob = 0;
    state.player.facing = 1;
    state.player.runPhase = 0;
    state.lastFrame = performance.now();
    hideBanner();
    setOverlay(null);
    shareStatus.textContent = "";
    state.leaderboardWeekKey = getIsoWeekKey(new Date());
    state.leaderboardLevel = state.level;
    setLeaderboardExpanded(false);
    syncHud();
    syncBossActionButton();
  }

  function startGame() {
    ensureAudioContext();
    resetRound();
    showBanner("Złap dyplomy, zanim uciekną!", 1.2);
    playSound("start");
  }

  function endGame(reason = "unknown") {
    if (DEV_MODE) {
      console.warn("[ENDGAME CALL]", {
        mode: state.mode,
        phase: state.phase,
        level: state.level,
        playerHp: state.playerHp,
        timeLeft: state.timeLeft,
        transitionKind: state.transitionKind,
        boss: Boolean(state.boss),
        reason,
      });
    }

    if (state.phase === "collect" && state.level < MAX_LEVEL && state.timeLeft <= 0) {
      if (DEV_MODE) {
        console.warn("[ENDGAME GUARD] collect timer reached zero before boss intro", {
          level: state.level,
          timeLeft: state.timeLeft,
          reason,
        });
      }
      beginBossIntroPhase();
      return;
    }

    if (state.transitionKind === "level-clear" || state.mode === "levelclear") {
      if (DEV_MODE) {
        console.warn("[ENDGAME GUARD] blocked during level-clear transition", {
          level: state.level,
          reason,
          transitionKind: state.transitionKind,
          mode: state.mode,
        });
      }
      showLevelClearResults();
      return;
    }

    logFlow("endGame", { level: state.level, score: state.score, reason });
    state.mode = "gameover";
    state.phase = "results";
    state.resultKind = "gameover";
    state.endGameReason = reason;
    state.gameoverTitle = reason === "player-dead" ? "Renata wygra\u0142a" : "Koniec gry";
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.bestScore);
    }
    state.leaderboardSubmissionScore = state.score;
    state.leaderboardLevel = clampLevel(state.level);
    setOverlay("end");
    setLeaderboardExpanded(false);
    syncResultOverlay("gameover");
    renderLeaderboard([]);
    showBanner(state.gameoverTitle, 1.8);
    playSound("gameover");
    syncHud();
    syncBossActionButton();
    loadLeaderboard();
  }

  function pauseForFocus() {
    if (state.mode !== "playing") {
      return;
    }
    state.mode = "paused";
    state.pausedReason = "focus";
    showBanner("Pauza", 1.2);
  }

  function resumeFromFocus() {
    if (state.mode === "paused" && state.pausedReason === "focus") {
      state.mode = "playing";
      state.pausedReason = "";
      showBanner("Wznowiono", 0.8);
      state.lastFrame = performance.now();
    }
  }

  function addPopup(text, x, y, color) {
    state.popups.push({
      text,
      x,
      y,
      vy: -22 - Math.random() * 18,
      life: 0.95,
      color,
    });
  }

  function spawnItem(type, options = {}) {
    const lane = randomLane();
    const targetX = typeof options.targetX === "number" ? options.targetX : laneX(lane);
    const difficulty = options.difficulty || getDifficulty(getRoundProgress(), state.level);
    const speedFactor = 0.9 + Math.random() * difficulty.diplomaSpeedJitter;
    const item = {
      type,
      lane,
      x: targetX,
      y: -60,
      vx: 0,
      speed: difficulty.diplomaSpeed * speedFactor,
      size: type === "mba" ? 56 : (type === "cash" || type === "bribe") ? 52 : type === "pka" ? 50 : type === "psychologia" ? 54 : 48,
      w: type === "mba" ? 68 : (type === "cash" || type === "bribe") ? 62 : type === "pka" ? 72 : type === "psychologia" ? 70 : 46,
      h: type === "mba" ? 48 : (type === "cash" || type === "bribe") ? 42 : type === "pka" ? 32 : type === "psychologia" ? 50 : 68,
      caught: false,
      wobble: Math.random() * Math.PI * 2,
      theme: type === "diploma" ? options.theme || getDiplomaTheme(state.level) : null,
    };

    if (type === "pka") {
      item.x = targetX;
      item.vx = 0;
      item.speed = difficulty.pkaSpeed;
      item.w = 76;
      item.h = 34;
      item.targetX = targetX;
    }

    state.items.push(item);
    return item;
  }

  function queueSpecialDrop(type, delay) {
    state.specialDrop = { type, timer: delay };
  }

  function triggerBonusChain() {
    if (state.bonusUnlocked) {
      return;
    }
    state.bonusUnlocked = true;
    showBanner("Combo x5!", 1.2);
    playSound("cash");
    queueSpecialDrop("cash", 0.15);
  }

  function triggerPkaAlert() {
    showBanner("UWAGA PKA!", 1.2);
    playSound("pka-alert");
    const difficulty = getDifficulty(getRoundProgress());
    spawnItem("pka", {
      targetX: state.player.x + randomRange(-state.player.width * 0.35, state.player.width * 0.35),
      difficulty,
    });
    state.pkaTimer = randomRange(difficulty.pkaDelayMin, difficulty.pkaDelayMax);
  }

  function triggerPkaCancel() {
    state.cancelWave = 3;
    state.pkaStorm = 3;
    state.flash = Math.max(state.flash, 0.28);
    state.shake = Math.max(state.shake, 0.22);
    showBanner("ŻADNEJ AKREDYTACJI!", 1.15);
    playSound("pka-cancel");
  }

  function catchItem(item) {
    item.caught = true;

    if (item.type === "diploma") {
      state.combo += 1;
      state.levelProgress += 1;
      const points = 10 + Math.min(12, state.combo * 2);
      state.score += points;
      addPopup(`+${points}`, item.x, item.y, PALETTE.cream);
      playSound("catch");
      if (state.combo >= 5 && !state.bonusUnlocked) {
        triggerBonusChain();
      }
    } else if (item.type === "cash" || item.type === "bribe") {
      state.score += 40;
      addPopup("+40", item.x, item.y, PALETTE.goldSoft);
      showBanner("Bonus MBA!", 1.15);
      playSound("cash");
      queueSpecialDrop("mba", 0.28);
    } else if (item.type === "mba") {
      state.score += 250;
      addPopup("+250", item.x, item.y, PALETTE.goldSoft);
      state.flash = 0.55;
      state.shake = 0.3;
      state.mbaFx = 1.35;
      state.speedBoost = 5;
      showBanner("MBA!", 1.2);
      playSound("mba");
    } else if (item.type === "psychologia") {
      addPopup("OKULARNIK", item.x, item.y, PALETTE.mint);
      state.psychologyFx = 3;
      showBanner("PSYCHOLOGIA!", 1.15);
      playSound("psychologia");
    } else if (item.type === "pka") {
      addPopup("ANUL.", item.x, item.y, PALETTE.goldSoft);
      triggerPkaCancel();
    }

    syncHud();
  }

  function missItem(item, reason = "miss") {
    if (item.type === "diploma") {
      state.combo = 0;
      state.bonusUnlocked = false;
      if (reason === "pka") {
        const penalty = 8 + Math.min(12, Math.floor(state.score * 0.04));
        state.score = Math.max(0, state.score - penalty);
        addPopup(`-${penalty}`, item.x, Math.max(24, item.y), PALETTE.redWarm);
        playSound("pka-cancel");
      } else {
        addPopup("MISS", item.x, Math.min(view.height * 0.8, item.y), PALETTE.redWarm);
      }
      syncHud();
    } else if (item.type === "cash" || item.type === "bribe" || item.type === "mba" || item.type === "psychologia") {
      state.combo = 0;
      state.bonusUnlocked = false;
    }
  }

  function updateItems(dt) {
    if (state.phase !== "collect") {
      return;
    }

    const playerX = state.player.x;
    const playerY = state.player.y;
    const playerW = state.player.width;
    const playerH = state.player.height;
    const pkaActive = state.pkaStorm > 0;
    const psychologyActive = state.psychologyFx > 0;

    for (let i = state.items.length - 1; i >= 0; i -= 1) {
      const item = state.items[i];
      if (item.type === "diploma") {
        if (pkaActive) {
          const awayFromPlayer = item.x < playerX ? -1 : 1;
          const upwardSpeed = item.speed * (1.15 + Math.min(0.5, state.pkaStorm * 0.06));
          item.vx += awayFromPlayer * 20 * dt;
          item.vx += Math.sin((item.y + item.wobble) * 0.05) * 10 * dt;
          item.vx *= Math.pow(0.965, dt * 60);
          item.vx = clamp(item.vx, -150, 150);
          item.x += item.vx * dt;
          item.y -= upwardSpeed * dt;
        } else if (psychologyActive) {
          const dx = playerX - item.x;
          item.vx += clamp(dx * 9, -220, 220) * dt;
          item.vx *= Math.pow(0.955, dt * 60);
          item.vx = clamp(item.vx, -190, 190);
          item.x += item.vx * dt;
          item.y += item.speed * 0.68 * dt;
        } else {
          item.vx *= Math.pow(0.93, dt * 60);
          item.vx = clamp(item.vx, -120, 120);
          item.x += item.vx * dt;
          item.y += item.speed * dt;
        }
      } else {
        if (item.type === "pka" && typeof item.targetX === "number") {
          const pkaChase = clamp(dt * 18, 0, 0.95);
          item.x += (item.targetX - item.x) * pkaChase;
        }
        item.x += item.vx * dt;
        item.y += item.speed * dt;
      }

      const itemBottom = item.y + item.h;
      const itemLeft = item.x - item.w / 2;
      const itemRight = item.x + item.w / 2;
      const playerLeft = playerX - playerW / 2;
      const playerRight = playerX + playerW / 2;
      const playerTop = playerY - playerH * 0.6;
      const playerBottom = playerY + playerH * 0.25;
      const closeEnough = itemRight >= playerLeft && itemLeft <= playerRight;
      const catchHeight = itemBottom >= playerTop && item.y <= playerBottom;
      const canCatch = !(pkaActive && item.type === "diploma");

      if (!item.caught && canCatch && closeEnough && catchHeight) {
        catchItem(item);
        state.items.splice(i, 1);
        continue;
      }

      if (item.type === "diploma" && pkaActive && item.y + item.h < -56) {
        if (!item.caught) {
          missItem(item, "pka");
        }
        state.items.splice(i, 1);
        continue;
      }

      if (item.y > view.height + 90) {
        if (!item.caught) {
          missItem(item);
        }
        state.items.splice(i, 1);
      }
    }
  }

  function updateBossBattle(dt) {
    if (state.phase !== "boss" || !state.boss || state.mode !== "playing") {
      return;
    }

    const boss = state.boss;
    const playerX = state.player.x;
    const playerY = state.player.y;
    const playerW = state.player.width;
    const playerH = state.player.height;
    const bossLeft = boss.x - boss.width / 2;
    const bossRight = boss.x + boss.width / 2;
    const bossTop = boss.y - boss.height / 2;
    const bossBottom = boss.y + boss.height / 2;
    const playerLeft = playerX - playerW / 2;
    const playerRight = playerX + playerW / 2;
    const playerTop = playerY - playerH * 0.55;
    const playerBottom = playerY + playerH * 0.25;

    boss.attackTimer -= dt;
    boss.hitCooldown = Math.max(0, boss.hitCooldown - dt);
    if (boss.attackTimer <= 0) {
      spawnBossShot();
    }

    state.attackCooldown = Math.max(0, state.attackCooldown - dt);

    for (let i = state.playerShots.length - 1; i >= 0; i -= 1) {
      const shot = state.playerShots[i];
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.life -= dt;

      const shotLeft = shot.x - shot.w / 2;
      const shotRight = shot.x + shot.w / 2;
      const shotTop = shot.y - shot.h / 2;
      const shotBottom = shot.y + shot.h / 2;
      const overlapsBoss = shotRight >= bossLeft && shotLeft <= bossRight && shotBottom >= bossTop && shotTop <= bossBottom;

      if (overlapsBoss) {
        state.playerShots.splice(i, 1);
        hitBoss(1, shot.x, shot.y);
        if (state.mode !== "playing" || state.phase !== "boss" || !state.boss) {
          return;
        }
        continue;
      }

      if (shot.life <= 0 || shot.y < -80) {
        state.playerShots.splice(i, 1);
      }
    }

    for (let i = state.bossShots.length - 1; i >= 0; i -= 1) {
      const shot = state.bossShots[i];
      const drift = clamp(dt * 2.8, 0, 0.32);
      shot.x += (shot.targetX - shot.x) * drift;
      shot.y += shot.vy * dt;
      shot.life -= dt;

      const shotLeft = shot.x - shot.w / 2;
      const shotRight = shot.x + shot.w / 2;
      const shotTop = shot.y - shot.h / 2;
      const shotBottom = shot.y + shot.h / 2;
      const overlapsPlayer = shotRight >= playerLeft && shotLeft <= playerRight && shotBottom >= playerTop && shotTop <= playerBottom;

      if (overlapsPlayer) {
        state.bossShots.splice(i, 1);
        hitPlayer(1, shot.x, shot.y);
        continue;
      }

      if (shot.life <= 0 || shot.y > view.height + 80) {
        state.bossShots.splice(i, 1);
      }
    }

    if (state.boss && state.boss.hp <= 0) {
      state.boss = null;
    }
  }

  function updateSpecialDrop(dt) {
    if (!state.specialDrop) {
      return;
    }
    state.specialDrop.timer -= dt;
    if (state.specialDrop.timer <= 0) {
      const next = state.specialDrop.type;
      state.specialDrop = null;
      spawnItem(next);
    }
  }

  function updatePopups(dt) {
    for (let i = state.popups.length - 1; i >= 0; i -= 1) {
      const popup = state.popups[i];
      popup.y += popup.vy * dt;
      popup.life -= dt;
      if (popup.life <= 0) {
        state.popups.splice(i, 1);
      }
    }
  }

  function updatePlayer(dt) {
    const target = laneX(state.player.lane);
    const moveMultiplier = state.speedBoost > 0 ? 3 : 1;
    const dx = target - state.player.x;
    const moving = Math.abs(dx) > 0.8;
    if (moving) {
      state.player.facing = dx < 0 ? -1 : 1;
      state.player.runPhase += dt * (state.speedBoost > 0 ? 14 : 11);
    } else {
      state.player.runPhase += dt * 3.5;
    }
    state.player.x += (target - state.player.x) * clamp(dt * 10 * moveMultiplier, 0, 0.85);
    state.player.bob += dt * 4.2;
  }

  function updateEffects(dt) {
    state.flash = Math.max(0, state.flash - dt);
    state.shake = Math.max(0, state.shake - dt);
    state.mbaFx = Math.max(0, state.mbaFx - dt);
    state.speedBoost = Math.max(0, state.speedBoost - dt);
    state.pkaStorm = Math.max(0, state.pkaStorm - dt);
    state.cancelWave = Math.max(0, state.cancelWave - dt);
    state.psychologyFx = Math.max(0, state.psychologyFx - dt);

    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.bannerTimer <= 0) {
        hideBanner();
      }
    }
  }

  function update(dt) {
    if (state.mode !== "playing") {
      updateEffects(dt);
      updatePopups(dt * 0.25);
      return;
    }

    if (state.phase === "transition") {
      state.transitionTimer = Math.max(0, state.transitionTimer - dt);
      updatePopups(dt);
      updateEffects(dt);
      if (state.transitionTimer <= 0) {
        if (state.transitionKind === "boss-intro") {
          beginBossPhase();
        } else if (state.transitionKind === "level-clear") {
          showLevelClearResults();
        }
      }
      syncHud();
      return;
    }

    updatePlayer(dt);

    if (state.phase === "collect") {
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      const difficulty = getDifficulty(getRoundProgress(), state.level);
      state.spawnTimer += dt;
      state.pkaTimer -= dt;
      if (state.pkaTimer <= 0) {
        triggerPkaAlert();
      }

      const spawnInterval = difficulty.spawnInterval;
      while (state.spawnTimer >= spawnInterval) {
        state.spawnTimer -= spawnInterval;
        spawnItem("diploma", { difficulty, theme: getDiplomaTheme(state.level) });
        if (Math.random() < difficulty.extraSpawnChance) {
          spawnItem("diploma", { difficulty, theme: getDiplomaTheme(state.level) });
        }
        if (state.level >= 2 && Math.random() < lerp(0.015, 0.03, difficulty.curve)) {
          spawnItem("psychologia", { difficulty });
        }
      }

      updateSpecialDrop(dt);
      updateItems(dt);
      if (state.timeLeft <= 0) {
        beginBossIntroPhase();
      }
    } else if (state.phase === "boss") {
      updateBossBattle(dt);
    }

    updatePopups(dt);
    updateEffects(dt);
    syncHud();
  }

  function drawBackground() {
    const { width: w, height: h } = view;

    ctx.fillStyle = "#050506";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#0c1e3a";
    ctx.fillRect(0, 0, w, snap4(h * 0.18));
    ctx.fillStyle = "#10284a";
    ctx.fillRect(0, snap4(h * 0.18), w, snap4(h * 0.24));
    drawWarsawSkyline(w, h);
    ctx.fillStyle = "#1a1e24";
    ctx.fillRect(0, snap4(h * 0.42), w, snap4(h * 0.18));
    ctx.fillStyle = "#5a5d61";
    ctx.fillRect(0, snap4(h * 0.6), w, h - snap4(h * 0.6));

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, 0, w, 4);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, snap4(h * 0.6), w, 2);

    ctx.fillStyle = "#5a5d61";
    ctx.fillRect(0, snap4(h * 0.81), w, snap4(h * 0.19));
    ctx.fillStyle = "#1a0d08";
    ctx.fillRect(0, snap4(h * 0.81), w, 2);

    const ledges = [0.12, 0.34, 0.58, 0.83];
    for (const pct of ledges) {
      ctx.fillStyle = "rgba(210, 216, 225, 0.08)";
      const y = snap4(h * pct);
      ctx.fillRect(0, y, w, 1);
    }

    drawCityStreet(w, h, h * 0.62, 0.92);
    drawCityStreet(w, h, h * 0.73, 0.82);

    const laneLeft = w * 0.09;
    const laneSpace = laneSpacing();
    for (let i = 0; i < LANE_COUNT; i += 1) {
      const x = laneLeft + laneSpace * i;
      ctx.fillStyle = i === Math.floor(LANE_COUNT / 2) ? "rgba(246, 239, 214, 0.14)" : "rgba(246, 239, 214, 0.07)";
      ctx.fillRect(snap4(x - 1), snap4(h * 0.14), 2, h - snap4(h * 0.23));
    }

    const platformY = snap4(state.player.y + state.player.height * 0.28);
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.fillRect(0, platformY, w, h - platformY);
    ctx.fillStyle = "rgba(208, 214, 224, 0.08)";
    ctx.fillRect(0, platformY + 2, w, 2);

    if (state.phase === "boss") {
      ctx.fillStyle = "rgba(89, 12, 26, 0.12)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawCityStreet(w, h, y, density = 1) {
    const roadY = snap4(h * y);
    const roadH = snap4(h * 0.05);
    ctx.fillStyle = "rgba(10, 16, 23, 0.75)";
    ctx.fillRect(0, roadY, w, roadH);
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, roadY + 2, w, 1);
    ctx.fillStyle = "rgba(255, 190, 120, 0.08)";
    ctx.fillRect(0, roadY + roadH - 2, w, 1);

    const carPositions = [
      { x: 0.08, lane: 0, tint: "#33485d" },
      { x: 0.23, lane: 1, tint: "#495b6d" },
      { x: 0.4, lane: 0, tint: "#5b6572" },
      { x: 0.56, lane: 1, tint: "#546a7a" },
      { x: 0.72, lane: 0, tint: "#444f5d" },
      { x: 0.87, lane: 1, tint: "#5a545f" },
    ];

    for (let i = 0; i < carPositions.length; i += 1) {
      const car = carPositions[i];
      drawPixelCar(w * car.x, roadY + roadH * (0.28 + car.lane * 0.22), 0.75 * density, car.tint, i % 2 === 0);
    }
  }

  function drawPixelCar(x, y, scale = 1, bodyColor = "#4a5561", facingLeft = false) {
    const s = Math.max(2, Math.round(4 * scale));
    const carW = 12 * s;
    const carH = 6 * s;
    const x0 = snap4(x - carW / 2);
    const y0 = snap4(y - carH / 2);

    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(x0 - 2, y0 + carH - 1, carW + 4, 3);

    ctx.fillStyle = "#1a1d22";
    ctx.fillRect(x0, y0 + 1, carW, carH - 1);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x0 + 1, y0, carW - 2, carH - 2);
    ctx.fillStyle = facingLeft ? "#6d7a86" : "#7a8792";
    ctx.fillRect(x0 + 2, y0 + 1, carW - 4, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(x0 + 3, y0 + 2, 4, 1);

    const wheelY = y0 + carH - 1;
    ctx.fillStyle = "#0b0e12";
    ctx.fillRect(x0 + 2, wheelY, 2, 2);
    ctx.fillRect(x0 + carW - 4, wheelY, 2, 2);
    ctx.fillStyle = "#2e353e";
    ctx.fillRect(x0 + 3, wheelY - 1, 1, 1);
    ctx.fillRect(x0 + carW - 3, wheelY - 1, 1, 1);

    if (facingLeft) {
      ctx.fillStyle = "rgba(255, 220, 130, 0.22)";
      ctx.fillRect(x0 - 1, y0 + 2, 1, 2);
    } else {
      ctx.fillStyle = "rgba(255, 220, 130, 0.22)";
      ctx.fillRect(x0 + carW, y0 + 2, 1, 2);
    }
  }

  function drawWarsawSkyline(w, h) {
    const skyBottom = snap4(h * 0.18);
    const cityLine = snap4(h * 0.56);
    const waterLine = snap4(h * 0.61);

    const skyGradient = ctx.createLinearGradient(0, 0, 0, skyBottom);
    skyGradient.addColorStop(0, "#91d6ef");
    skyGradient.addColorStop(0.34, "#7bc8e8");
    skyGradient.addColorStop(0.68, "#4aa8d3");
    skyGradient.addColorStop(1, "#1d7cae");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, w, skyBottom);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (let y = 0; y < skyBottom; y += 6) {
      ctx.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 6) {
      ctx.fillRect(x, 0, 1, skyBottom);
    }

    drawPixelCloud(w * 0.11, h * 0.07, 1.1);
    drawPixelCloud(w * 0.82, h * 0.06, 0.8);
    drawPixelCloud(w * 0.22, h * 0.12, 0.45);

    ctx.fillStyle = "#0d4f78";
    ctx.fillRect(0, skyBottom - 4, w, 4);
    ctx.fillStyle = "#0a1e35";
    ctx.fillRect(0, cityLine, w, 3);

    const buildingDefs = [
      { x: 0.03, w: 0.08, h: 0.16, tone: "#c77b36", light: "#f2c38a", top: "spire" },
      { x: 0.12, w: 0.07, h: 0.24, tone: "#a9542b", light: "#f6c57f", top: "cross" },
      { x: 0.2, w: 0.11, h: 0.14, tone: "#8b4828", light: "#f0bf73", top: "roof" },
      { x: 0.31, w: 0.09, h: 0.34, tone: "#cc6b31", light: "#ffd693", top: "spire" },
      { x: 0.42, w: 0.1, h: 0.2, tone: "#98512a", light: "#f1c884", top: "flat" },
      { x: 0.54, w: 0.14, h: 0.42, tone: "#b85d30", light: "#ffd08d", top: "spire" },
      { x: 0.68, w: 0.1, h: 0.28, tone: "#cf8f3e", light: "#ffe0ae", top: "glass" },
      { x: 0.8, w: 0.1, h: 0.34, tone: "#9f4b2e", light: "#f7c18f", top: "glass" },
      { x: 0.91, w: 0.06, h: 0.18, tone: "#7f3b22", light: "#f0ba7c", top: "flat" },
    ];

    for (const def of buildingDefs) {
      drawPixelBuilding(w, h, def, cityLine, waterLine);
    }

    const labelDef = buildingDefs[5];
    const labelW = snap4(w * labelDef.w * 0.72);
    const labelH = snap4(Math.max(12, h * 0.032));
    const labelX = snap4(w * labelDef.x + w * labelDef.w * 0.14);
    const labelY = snap4(cityLine - h * labelDef.h - h * 0.035);
    const labelCx = labelX + labelW / 2;
    const labelCy = labelY + labelH / 2;
    ctx.save();
    ctx.shadowColor = "rgba(255, 78, 78, 0.95)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(11, 22, 37, 0.28)";
    ctx.fillRect(labelX - 2, labelY - 2, labelW + 4, labelH + 4);
    ctx.fillStyle = "#fff0d8";
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Warsowia", labelCx, labelCy + 1);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 52, 52, 0.68)";
    ctx.fillText("Warsowia", labelCx + 0.5, labelCy + 0.5);
    ctx.restore();

    drawPixelBridge(w * 0.13, cityLine, 0.9);

    ctx.fillStyle = "#173b5f";
    ctx.fillRect(0, cityLine + 1, w, snap4(h * 0.04));
    ctx.fillStyle = "#0e2b4a";
    ctx.fillRect(0, waterLine, w, h - waterLine);

    ctx.fillStyle = "rgba(255, 175, 95, 0.28)";
    ctx.fillRect(0, waterLine - 8, w, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, waterLine - 4, w, 1);

    const reflections = [
      { x: 0.08, w: 0.06, c: "#5fd0ff" },
      { x: 0.18, w: 0.05, c: "#ffb26d" },
      { x: 0.32, w: 0.08, c: "#8a77ff" },
      { x: 0.46, w: 0.06, c: "#ff8e7a" },
      { x: 0.59, w: 0.09, c: "#f6d68e" },
      { x: 0.72, w: 0.05, c: "#73d6ff" },
      { x: 0.86, w: 0.04, c: "#ffad7a" },
    ];

    for (const r of reflections) {
      const rx = snap4(w * r.x);
      const rw = snap4(w * r.w);
      ctx.fillStyle = r.c;
      ctx.fillRect(rx, waterLine + 2, rw, 2);
      ctx.fillRect(rx + 2, waterLine + 7, Math.max(2, rw - 4), 1);
      ctx.fillRect(rx + 4, waterLine + 12, Math.max(2, rw - 8), 1);
    }

    ctx.fillStyle = "#13395d";
    ctx.fillRect(0, waterLine + 18, w, h - (waterLine + 18));
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    for (let y = waterLine + 18; y < h; y += 8) {
      ctx.fillRect(0, y, w, 1);
    }
  }

  function drawPixelCloud(x, y, scale = 1) {
    const px = snap4(x);
    const py = snap4(y);
    const s = Math.max(2, Math.round(4 * scale));
    const blocks = [
      [0, 2, 4, 2],
      [2, 0, 5, 3],
      [7, 1, 3, 2],
      [3, 3, 8, 2],
    ];

    ctx.fillStyle = "rgba(255, 244, 214, 0.85)";
    for (const [bx, by, bw, bh] of blocks) {
      ctx.fillRect(px + bx * s, py + by * s, bw * s, bh * s);
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(px + 2 * s, py + 2 * s, 8 * s, 2 * s);
  }

  function drawPixelBuilding(w, h, def, cityLine, waterLine) {
    const bw = snap4(w * def.w);
    const bh = snap4(h * def.h);
    const bx = snap4(w * def.x);
    const by = cityLine - bh;
    const bodyColor = def.tone;
    const lightColor = def.light;
    const shadowColor = "#09111c";
    const roofH = Math.max(8, snap4(bh * 0.16));
    const windowRows = Math.max(2, Math.floor(bh / 18));
    const windowCols = Math.max(2, Math.floor(bw / 12));

    ctx.fillStyle = shadowColor;
    ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    ctx.fillRect(bx + 2, by + 2, bw + 4, bh + 4);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(bx, by, bw, bh);

    ctx.fillStyle = "#2b4c72";
    ctx.fillRect(bx + 2, by + 2, Math.max(2, bw - 4), Math.max(2, bh - 4));

    ctx.fillStyle = lightColor;
    ctx.fillRect(bx + 4, by + 4, Math.max(2, bw - 8), 2);

    for (let row = 0; row < windowRows; row += 1) {
      for (let col = 0; col < windowCols; col += 1) {
        const wx = bx + 4 + col * Math.max(4, Math.floor((bw - 8) / windowCols));
        const wy = by + 10 + row * Math.max(6, Math.floor((bh - 14) / windowRows));
        ctx.fillStyle = row % 2 === 0 ? "rgba(255, 240, 208, 0.38)" : "rgba(255, 176, 98, 0.28)";
        ctx.fillRect(wx, wy, 2, 3);
      }
    }

    if (def.top === "spire") {
      ctx.fillStyle = "#1c2f4a";
      ctx.fillRect(bx + bw / 2 - 2, by - roofH - 10, 4, roofH + 10);
      ctx.fillRect(bx + bw / 2 - 5, by - 4, 10, 4);
      ctx.fillStyle = lightColor;
      ctx.fillRect(bx + bw / 2 - 1, by - roofH - 14, 2, 6);
    } else if (def.top === "cross") {
      ctx.fillStyle = "#17263b";
      ctx.fillRect(bx + bw / 2 - 2, by - roofH - 6, 4, roofH + 6);
      ctx.fillRect(bx + bw / 2 - 7, by - roofH - 2, 14, 3);
    } else if (def.top === "roof") {
      ctx.fillStyle = "#16314f";
      ctx.fillRect(bx, by - 8, bw, 8);
      ctx.fillStyle = lightColor;
      ctx.fillRect(bx + 4, by - 4, bw - 8, 2);
    } else if (def.top === "glass") {
      ctx.fillStyle = "#72d6ea";
      ctx.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
      ctx.fillStyle = "rgba(255,255,255,0.26)";
      ctx.fillRect(bx + 6, by + 6, 2, bh - 12);
      ctx.fillRect(bx + bw - 8, by + 8, 2, bh - 14);
    } else {
      ctx.fillStyle = lightColor;
      ctx.fillRect(bx + 2, by - 4, bw - 4, 4);
    }

    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(bx + bw - 4, by, 2, bh);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(bx, by + bh - 4, bw, 4);

    const reflection = Math.max(4, Math.floor((bw / 5)));
    const reflectionY = waterLine + 4 + Math.floor((bx / w) * 4);
    ctx.fillStyle = def.light;
    ctx.fillRect(bx + 2, reflectionY, reflection, 2);
  }

  function drawPixelBridge(x, cityLine, scale = 1) {
    const bridgeW = snap4(70 * scale);
    const bridgeH = snap4(30 * scale);
    const bx = snap4(x);
    const by = cityLine - bridgeH + 4;

    ctx.fillStyle = "#08101b";
    ctx.fillRect(bx - 4, by - 2, bridgeW + 8, bridgeH + 4);
    ctx.fillStyle = "#1b314d";
    ctx.fillRect(bx, by, bridgeW, bridgeH);
    ctx.fillStyle = "#7c5a3c";
    ctx.fillRect(bx + 2, by + bridgeH - 8, bridgeW - 4, 8);
    ctx.fillStyle = "#e8c68c";
    ctx.fillRect(bx + 10, by + 4, 6, bridgeH - 12);
    ctx.fillRect(bx + bridgeW - 16, by + 4, 6, bridgeH - 12);

    for (let i = 0; i < 7; i += 1) {
      const archX = bx + 4 + i * 10;
      ctx.fillStyle = i % 2 === 0 ? "#4a86b9" : "#6bc4ea";
      ctx.fillRect(archX, by + 10, 6, 2);
      ctx.fillRect(archX + 1, by + 12, 4, 2);
    }

    ctx.fillStyle = "#0d1a2a";
    ctx.fillRect(bx + 2, by + 2, bridgeW - 4, 2);
    ctx.fillRect(bx + 2, by + bridgeH - 4, bridgeW - 4, 2);
  }

  function drawShadow(x, y, w, h, alpha) {
    ctx.fillStyle = `rgba(32, 45, 30, ${alpha})`;
    ctx.fillRect(snap4(x - w * 0.42), snap4(y - h * 0.05), snap4(w * 0.84), snap4(h * 0.22));
  }

  function drawDiploma(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;
    const theme = item.theme || getDiplomaTheme(state.level);

    drawShadow(x, y + h, w, 12, 0.24);

    if (drawAssetSprite("diploma", x, y + h / 2, w, h)) {
      if (state.level === 1) {
        drawDiplomaCancelOverlay(item, x, y, w, h);
        return;
      }
      const x0 = snap4(x - w / 2);
      const y0 = snap4(y);
      const ww = snap4(w);
      const hh = snap4(h);
      ctx.save();
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = theme.body;
      ctx.fillRect(x0, y0, ww, hh);
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = theme.stripe;
      ctx.fillRect(x0, y0, 8, hh);
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = theme.accent;
      ctx.fillRect(x0 + 10, y0 + 8, ww - 16, 4);
      ctx.fillRect(x0 + 10, y0 + 20, ww - 20, 4);
      ctx.fillRect(x0 + 10, y0 + 32, ww - 14, 4);
      ctx.fillRect(x0 + 10, y0 + 44, ww - 24, 4);
      ctx.restore();
      drawDiplomaCancelOverlay(item, x, y, w, h);
      return;
    }

    const x0 = snap4(x - w / 2);
    const y0 = snap4(y);
    const ww = snap4(w);
    const hh = snap4(h);
    ctx.fillStyle = theme.body;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = theme.stripe;
    ctx.fillRect(x0, y0, 8, hh);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(x0 + 10, y0 + 8, ww - 16, 4);
    ctx.fillRect(x0 + 10, y0 + 20, ww - 20, 4);
    ctx.fillRect(x0 + 10, y0 + 32, ww - 14, 4);
    ctx.fillRect(x0 + 10, y0 + 44, ww - 24, 4);
    drawDiplomaCancelOverlay(item, x, y, w, h);

    ctx.fillStyle = theme.text;
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("DYPLOM", x0 + ww / 2, y0 + hh - 10);
  }

  function drawPka(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;

    drawShadow(x, y + h, w, 10, 0.2);

    const t = performance.now() / 1000;
    const wobble = Math.sin(t * 9 + item.wobble) * 0.04;
    const shake = state.pkaStorm > 0 ? Math.sin(performance.now() / 40 + item.wobble) * 1.4 : 0;
    const pulse = 1 + Math.sin(t * 12 + item.wobble) * 0.03;

    if (drawAssetSprite("pka", x, y + h / 2, w, h, {
      rotate: wobble,
      offsetX: shake,
      offsetY: Math.sin(t * 6 + item.wobble) * 0.3,
      scale: pulse,
    })) {
      return;
    }

    const x0 = snap4(x - w / 2);
    const y0 = snap4(y);
    const ww = snap4(w);
    const hh = snap4(h);
    const flicker = 1 + Math.sin(t * 12 + item.wobble) * 0.12;
    const flicker2 = 1 + Math.sin(t * 18 + item.wobble * 1.7) * 0.15;
    const flicker3 = 1 + Math.sin(t * 9 + item.wobble * 0.9 + 1.3) * 0.1;

    const flameBaseY = y0 - 8;
    const flameTopY = y0 - 22 - Math.round(4 * flicker2);
    const flameMidY = y0 - 16 - Math.round(3 * flicker3);

    ctx.fillStyle = "rgba(255, 166, 58, 0.26)";
    ctx.fillRect(x0 - 6, flameTopY + 6, ww + 12, 6);
    ctx.fillStyle = "rgba(255, 214, 96, 0.4)";
    ctx.fillRect(x0 - 2, flameBaseY - 2, ww + 4, 4);

    ctx.fillStyle = "#ff5d18";
    ctx.fillRect(x0 + 2, flameBaseY - 2, 10, 8 * flicker);
    ctx.fillRect(x0 + 10, flameMidY, 8, 12 * flicker2);
    ctx.fillRect(x0 + ww - 18, flameBaseY - 1, 8, 7 * flicker3);
    ctx.fillRect(x0 + ww - 26, flameTopY + 3, 12, 10 * flicker2);

    ctx.fillStyle = "#ff8924";
    ctx.fillRect(x0 + 6, flameTopY + 2, 8, 14 * flicker2);
    ctx.fillRect(x0 + ww - 22, flameMidY + 1, 10, 11 * flicker3);
    ctx.fillRect(x0 + ww / 2 - 4, flameTopY, 12, 16 * flicker);

    ctx.fillStyle = "#ffd870";
    ctx.fillRect(x0 + 8, flameTopY + 6, 4, 6);
    ctx.fillRect(x0 + ww / 2 - 1, flameTopY + 4, 2, 8);
    ctx.fillRect(x0 + ww - 14, flameMidY + 4, 4, 5);

    ctx.fillStyle = "#ff9a2f";
    ctx.fillRect(x0 + 4, y0 - 8, ww - 8, 8 * flicker);
    ctx.fillRect(x0 + 10, y0 - 14, 10, 8 * flicker2);
    ctx.fillRect(x0 + ww - 18, y0 - 10, 8, 6 * flicker3);
    ctx.fillStyle = PALETTE.goldSoft;
    ctx.fillRect(x0 + 8, y0 - 4, 10, 6 * flicker);
    ctx.fillRect(x0 + ww - 20, y0 - 2, 10, 4 * flicker2);
    ctx.fillStyle = PALETTE.redWarm;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = PALETTE.redDark;
    ctx.fillRect(x0 + 4, y0 + 4, ww - 8, hh - 8);
    ctx.fillStyle = "#ffcc66";
    ctx.fillRect(x0, y0, ww, 4);
    ctx.fillRect(x0, y0 + hh - 4, ww, 4);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x0 + 10, y0 + 10, 8, 8);
    ctx.fillRect(x0 + ww - 18, y0 + 10, 8, 8);
    ctx.fillRect(x0 + 12, y0 + 21, 4, 2);
    ctx.fillRect(x0 + ww - 16, y0 + 21, 4, 2);
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.cream;
    ctx.fillText("PKA", x, y + h * 0.54);

    ctx.fillStyle = "rgba(255, 200, 92, 0.8)";
    ctx.fillRect(x0 + 6, y0 - 2, 4, 2);
    ctx.fillRect(x0 + ww - 10, y0 - 1, 3, 2);
    ctx.fillRect(x0 + ww / 2 - 1, y0 - 6, 2, 3);

    ctx.fillStyle = "rgba(255, 224, 140, 0.75)";
    ctx.fillRect(x0 + 2, y0 - 6, 2, 2);
    ctx.fillRect(x0 + ww - 5, y0 - 8, 2, 2);
    ctx.fillRect(x0 + ww / 2 + 6, y0 - 13, 2, 2);
  }

  function drawCash(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;

    drawShadow(x, y + h, w, 10, 0.25);

    const wobble = Math.sin(performance.now() / 140 + item.wobble) * 0.05;
    const pulse = 1 + Math.sin(performance.now() / 170 + item.wobble * 1.2) * 0.03;

    if (drawAssetSprite("lapowka", x, y + h / 2, w, h, {
      rotate: wobble,
      scale: pulse,
      offsetY: Math.sin(performance.now() / 210 + item.wobble) * 0.2,
    })) {
      return;
    }

    const x0 = snap4(x - w / 2);
    const y0 = snap4(y);
    const ww = snap4(w);
    const hh = snap4(h);
    ctx.fillStyle = PALETTE.navyMid;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = PALETTE.navyDark;
    ctx.fillRect(x0 + 4, y0 + 4, ww - 8, hh - 8);
    ctx.fillStyle = PALETTE.navySoft;
    ctx.fillRect(x0 + 8, y0 + 8, ww - 16, 4);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x0 + 12, y0 + hh / 2 - 6, ww - 24, 4);
    ctx.fillStyle = PALETTE.goldSoft;
    ctx.fillRect(x0 + ww - 16, y0 + 8, 8, 8);
    ctx.fillRect(x0 + 8, y0 + hh - 16, 8, 8);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("ŁAPÓWKA", x, y + h * 0.62);
  }

  function drawBookShot(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;

    drawShadow(x, y + h, w, 8, 0.18);

    if (drawAssetSprite("book", x, y + h / 2, w, h, {
      rotate: Math.sin(performance.now() / 120 + item.life * 4) * 0.08,
    })) {
      return;
    }

    const wobble = Math.sin(performance.now() / 120 + item.life * 4) * 0.8;
    const x0 = snap4(x + wobble);
    const y0 = snap4(y);
    const coverW = snap4(Math.max(48, w * 1.2));
    const coverH = snap4(Math.max(32, h * 1.15));

    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(-0.48);
    ctx.translate(-coverW / 2, -coverH / 2);

    ctx.fillStyle = "#12070f";
    ctx.fillRect(1, 1, coverW, coverH);

    ctx.fillStyle = "#4a1127";
    ctx.fillRect(3, 3, coverW - 8, coverH - 6);

    ctx.fillStyle = "#661a38";
    ctx.fillRect(5, 4, coverW - 12, coverH - 8);

    ctx.fillStyle = "#7a2540";
    ctx.fillRect(8, 6, coverW - 18, coverH - 12);

    ctx.fillStyle = "#3a0d1f";
    ctx.fillRect(3, 4, Math.max(10, Math.round(coverW * 0.22)), coverH - 8);

    ctx.fillStyle = "#5a1731";
    ctx.fillRect(8, 7, Math.max(7, Math.round(coverW * 0.08)), coverH - 14);

    ctx.fillStyle = "#d6bf8b";
    ctx.fillRect(coverW - 18, 8, 12, coverH - 14);
    ctx.fillStyle = "#ead7ae";
    ctx.fillRect(coverW - 14, 10, 9, coverH - 18);

    ctx.fillStyle = "#c7924a";
    ctx.fillRect(7, 6, coverW - 22, 2);
    ctx.fillRect(7, coverH - 8, coverW - 20, 2);
    ctx.fillRect(6, 8, 2, coverH - 16);
    ctx.fillRect(coverW - 18, 8, 2, coverH - 16);

    ctx.fillStyle = "#e2b56b";
    ctx.fillRect(11, 10, 4, 4);
    ctx.fillRect(coverW - 22, 10, 4, 4);
    ctx.fillRect(11, coverH - 14, 4, 4);
    ctx.fillRect(coverW - 22, coverH - 14, 4, 4);

    ctx.fillStyle = "#d9a75c";
    ctx.fillRect(Math.round(coverW * 0.44), Math.round(coverH * 0.38), 10, 10);
    ctx.fillStyle = "#7b3e1d";
    ctx.fillRect(Math.round(coverW * 0.47), Math.round(coverH * 0.41), 4, 4);

    ctx.fillStyle = "#b78a4a";
    ctx.fillRect(coverW - 15, 15, 8, 2);
    ctx.fillRect(coverW - 15, 19, 8, 2);
    ctx.fillRect(coverW - 15, 23, 8, 2);
    ctx.fillRect(coverW - 15, 27, 8, 2);

    ctx.fillStyle = "#f1e0ba";
    ctx.fillRect(coverW - 18, coverH - 10, 13, 4);
    ctx.fillStyle = "#886345";
    ctx.fillRect(4, coverH - 5, coverW - 24, 2);

    ctx.restore();
  }

  function drawNewsmonthShot(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;

    drawShadow(x, y + h, w, 8, 0.18);

    if (drawAssetSprite("newsmonth", x, y + h / 2, w, h, {
      rotate: Math.sin((performance.now() / 85) + item.wobble) * 0.05,
    })) {
      return;
    }

    const wobble = Math.sin((performance.now() / 85) + item.wobble) * 0.6;
    const x0 = snap4(x - w / 2 + wobble);
    const y0 = snap4(y - h / 2);
    const ww = snap4(w);
    const hh = snap4(h);
    ctx.fillStyle = "#070707";
    ctx.fillRect(x0 - 1, y0 - 1, ww + 2, hh + 2);
    ctx.fillStyle = "#d31822";
    ctx.fillRect(x0, y0, ww, hh);

    const topBandH = Math.max(18, Math.round(hh * 0.22));
    const mastheadH = Math.max(24, Math.round(hh * 0.28));
    const bodyTop = y0 + topBandH + mastheadH;
    const bodyH = hh - topBandH - mastheadH;
    const bodyBottom = y0 + hh;
    const footerH = Math.max(16, Math.round(bodyH * 0.28));
    const photoTop = bodyTop;
    const photoH = bodyH - footerH;

    ctx.fillStyle = "#090909";
    ctx.fillRect(x0 + 2, y0 + 2, ww - 4, topBandH - 4);

    const barcodeW = Math.max(10, Math.round(ww * 0.18));
    const articleAreaW = ww - 8 - barcodeW;
    const columnW = Math.max(10, Math.floor((articleAreaW - 8) / 3));
    const columnY = y0 + 4;
    const columnX1 = x0 + 4;
    const columnX2 = columnX1 + columnW + 4;
    const columnX3 = columnX2 + columnW + 4;
    const tinyFont = Math.max(4, Math.round(ww * 0.095));

    ctx.fillStyle = "#f2f2f2";
    ctx.font = `bold ${tinyFont}px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const drawHeadlineColumn = (startX, lines) => {
      lines.forEach((line, index) => {
        ctx.fillText(line, startX, columnY + index * (tinyFont + 1));
      });
    };

    drawHeadlineColumn(columnX1, ["KONSOLE ZA ZDROWIE?", "LECZENIE XP CORAZ", "POPULARNIEJSZE"]);
    drawHeadlineColumn(columnX2, ["MIASTO-BLOK 12", "MIESZKAŃCY CHCĄ", "REALNYCH NPC"]);
    drawHeadlineColumn(columnX3, ["HAKERZY W RADZIE?", "KTO PISAŁ UCHWAŁY", "TO NIKT NIE WIE"]);

    ctx.fillStyle = "#d61b27";
    ctx.fillRect(columnX2 - 3, y0 + 3, 1, topBandH - 6);
    ctx.fillRect(columnX3 - 3, y0 + 3, 1, topBandH - 6);
    ctx.fillRect(columnX3 + columnW + 1, y0 + 3, 1, topBandH - 6);

    const barcodeX = x0 + ww - barcodeW - 4;
    ctx.fillStyle = "#f4f4f4";
    ctx.fillRect(barcodeX, y0 + 2, barcodeW, topBandH - 4);
    ctx.fillStyle = "#111";
    for (let i = 0; i < barcodeW; i += 2) {
      const barH = topBandH - 6 - (i % 4 === 0 ? 1 : 0);
      ctx.fillRect(barcodeX + i, y0 + 3, 1, barH);
    }
    ctx.fillStyle = "#111";
    ctx.font = `bold ${Math.max(5, Math.round(ww * 0.08))}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("8421 07", barcodeX + barcodeW / 2, y0 + topBandH - 2);

    ctx.fillStyle = "#d31822";
    ctx.fillRect(x0 + 2, y0 + topBandH, ww - 4, mastheadH);
    ctx.fillStyle = "#fffbf2";
    ctx.fillRect(x0 + 2, y0 + topBandH + 1, ww - 4, mastheadH - 2);
    ctx.fillStyle = "#d31822";
    ctx.fillRect(x0 + 2, y0 + topBandH + 2, ww - 4, mastheadH - 4);

    ctx.fillStyle = "#fffdf8";
    ctx.font = `bold ${Math.max(17, Math.round(ww * 0.32))}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NEWSMONTH", x, y0 + topBandH + mastheadH * 0.58);

    ctx.fillStyle = "#fff8ec";
    ctx.font = `bold ${Math.max(4, Math.round(ww * 0.07))}px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("NR 07 (427) + 26.05.2087  *  CENA: 5 KREDYTÓW", x0 + 4, y0 + topBandH + 2);
    ctx.textAlign = "right";
    ctx.fillText("TYGODNIK NIEZALEŻNY", x0 + ww - 4, y0 + topBandH + 2);

    ctx.fillStyle = "#ececec";
    ctx.fillRect(x0 + 2, photoTop, ww - 4, photoH);
    ctx.fillStyle = "#bdbdbd";
    ctx.fillRect(x0 + 4, photoTop + 1, ww - 8, photoH - 2);

    ctx.fillStyle = "#0f0f10";
    ctx.fillRect(x0, photoTop, 4, photoH);
    ctx.fillRect(x0 + ww - 4, photoTop, 4, photoH);

    ctx.fillStyle = "#f4f4f4";
    for (let i = 0; i < 6; i += 1) {
      const stripeX = x0 + 8 + i * Math.max(4, Math.round(ww * 0.1));
      ctx.fillRect(stripeX, photoTop + 2, 2, photoH - 4);
    }

    ctx.fillStyle = "#d6d6d6";
    ctx.fillRect(x0 + 6, photoTop + 6, ww - 12, Math.max(6, Math.round(photoH * 0.18)));
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(x0 + 8, photoTop + 8, ww - 16, Math.max(4, Math.round(photoH * 0.12)));

    const figureX = x0 + Math.round(ww * 0.52);
    const figureTop = photoTop + Math.round(photoH * 0.14);
    ctx.fillStyle = "#5e5e5e";
    ctx.fillRect(figureX, figureTop, 4, 10);
    ctx.fillRect(figureX - 2, figureTop + 8, 8, 14);
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(figureX - 4, figureTop + 20, 12, 10);
    ctx.fillRect(figureX - 2, figureTop + 30, 8, 16);
    ctx.fillRect(figureX - 4, figureTop + 44, 4, 16);
    ctx.fillRect(figureX + 4, figureTop + 44, 4, 16);
    ctx.fillStyle = "#8f8f8f";
    ctx.fillRect(figureX - 1, figureTop + 10, 2, 8);
    ctx.fillRect(figureX - 3, figureTop + 12, 6, 2);
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(figureX - 4, figureTop + 40, 12, 4);

    ctx.fillStyle = "#222";
    ctx.fillRect(x0 + 10, photoTop + photoH - 8, ww - 20, 4);
    ctx.fillStyle = "#666";
    ctx.fillRect(x0 + 10, photoTop + photoH - 14, ww - 20, 2);

    ctx.fillStyle = "#111";
    ctx.fillRect(x0 + 4, bodyBottom - footerH - 2, ww - 8, footerH);
    ctx.fillStyle = "#f5f2e7";
    ctx.font = `bold ${Math.max(5, Math.round(ww * 0.08))}px 'Courier New', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("SEZON WYBORCZY 2087:", x0 + 6, bodyBottom - footerH);
    ctx.fillText("KTO KUPI TWOJE GŁOSY?", x0 + 6, bodyBottom - footerH + 6);
    ctx.fillStyle = "#d31822";
    ctx.fillRect(x0 + 4, bodyBottom - footerH - 4, 8, 2);
    ctx.fillRect(x0 + 4, bodyBottom - footerH + 14, 4, 4);
    ctx.fillStyle = "#f5f2e7";
    ctx.font = `bold ${Math.max(4, Math.round(ww * 0.065))}px 'Courier New', monospace`;
    ctx.fillText("PODATKI W GÓRĘ, NASTROJE W DÓŁ", x0 + 12, bodyBottom - footerH + 15);
    ctx.fillText("PORADNIK: JAK PRZETRWAĆ AKTUALIZACJĘ?", x0 + 12, bodyBottom - footerH + 21);
  }

  function drawRenataBoss(boss) {
    const x = boss.x;
    const y = boss.y;
    const w = boss.width;
    const h = boss.height;
    const facing = state.player.x < boss.x ? -1 : 1;
    const bob = Math.sin(performance.now() / 320) * 2;
    drawShadow(x, y + h * 0.42, w * 0.4, 12, 0.22);

    if (drawAssetSprite("renataBoss", x, y + h / 2, w, h, {
      flipX: facing === -1,
      offsetX: state.shake > 0 ? Math.sin(performance.now() / 40) * 1.5 * state.shake : 0,
      offsetY: bob,
      scaleX: state.shake > 0 ? 1.01 : 1,
      scaleY: state.shake > 0 ? 0.99 : 1,
    })) {
      return;
    }

    const scale = Math.max(4, Math.round(w / 18));
    const spriteW = 18;
    const spriteH = 20;
    const ox = Math.round(x - (spriteW * scale) / 2);
    const oy = Math.round(y - (spriteH * scale) / 2 + bob);

    const px = (gx, gy, gw, gh, color) => {
      const drawX = facing === 1 ? gx : spriteW - gx - gw;
      ctx.fillStyle = color;
      ctx.fillRect(ox + drawX * scale, oy + gy * scale, gw * scale, gh * scale);
    };

    px(4, 0, 10, 2, "#16161d");
    px(3, 1, 12, 2, "#16161d");
    px(2, 2, 14, 2, "#23232a");
    px(3, 3, 12, 1, "#2b2b32");
    px(4, 4, 10, 1, "#d9af8f");
    px(4, 5, 10, 3, "#f0c4a1");
    px(5, 5, 8, 1, "#f7d7bf");
    px(5, 7, 2, 1, "#36506f");
    px(11, 7, 2, 1, "#36506f");
    px(6, 8, 2, 1, "#2b2a31");
    px(10, 8, 2, 1, "#2b2a31");
    px(7, 9, 1, 1, "#2b2a31");
    px(10, 9, 1, 1, "#2b2a31");
    px(4, 10, 10, 1, "#d8e1ec");
    px(4, 11, 10, 5, "#23547f");
    px(5, 11, 8, 4, "#2f678f");
    px(6, 12, 6, 2, "#7ca4c4");
    px(5, 13, 1, 3, "#f4c19d");
    px(12, 13, 1, 3, "#f4c19d");
    px(5, 16, 4, 3, "#5c2b3b");
    px(9, 16, 4, 3, "#5c2b3b");
    px(6, 17, 2, 2, "#492033");
    px(10, 17, 2, 2, "#492033");
    px(3, 12, 2, 4, "#f0c4a1");
    px(13, 12, 2, 4, "#f0c4a1");
    px(2, 13, 2, 2, "#1f2a42");
    px(14, 13, 2, 2, "#1f2a42");
    px(2, 11, 3, 1, "#2c4666");
    px(13, 11, 3, 1, "#2c4666");

    const paperSide = facing === 1 ? 0 : 1;
    const paperX = paperSide === 0 ? 1 : 13;
    px(paperX, 11, 4, 5, "#a41a2a");
    px(paperX + 1, 12, 2, 3, "#7d0817");
    px(paperX + 1, 12, 2, 1, "#ffe4d8");
    px(paperX + 1, 14, 2, 1, "#ffe4d8");
    ctx.fillStyle = "#fff0e8";
    ctx.font = "bold 6px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("NEWS", ox + (facing === 1 ? 34 : 8), oy + 60);
  }

  function drawBossHud() {
    if (state.phase !== "boss" || !state.boss) {
      return;
    }

    const boss = state.boss;
    const barW = Math.min(view.width * 0.62, 280);
    const barH = 8;
    const bx = view.width / 2 - barW / 2;
    const by = 18;
    const pct = clamp(boss.hp / boss.maxHp, 0, 1);

    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillText(`BOSS RENATA`, view.width / 2, 12);
    ctx.fillStyle = "rgba(10, 15, 25, 0.8)";
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = PALETTE.redWarm;
    ctx.fillRect(bx + 1, by + 1, Math.max(0, (barW - 2) * pct), barH - 2);
    ctx.strokeStyle = "rgba(255, 244, 214, 0.18)";
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.fillText(`Poziom ${state.level}`, view.width / 2, by + 18);

    const hpLabelX = view.width - 72;
    const hpY = 16;
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("HP", hpLabelX, hpY + 2);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.playerHp ? PALETTE.red : "rgba(255, 244, 214, 0.18)";
      ctx.fillRect(hpLabelX + 18 + i * 12, hpY - 2, 8, 8);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillRect(hpLabelX + 19 + i * 12, hpY - 1, 2, 2);
    }
    ctx.restore();
  }

  function drawPlayerShots() {
    for (const shot of state.playerShots) {
      drawBookShot(shot);
    }
  }

  function drawBossShots() {
    for (const shot of state.bossShots) {
      drawNewsmonthShot(shot);
    }
  }

  function drawMba(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;
    const pulse = state.mbaFx > 0 ? 1 + Math.sin(performance.now() / 90) * 0.05 : 1;

    drawShadow(x, y + h, w * pulse, 12, 0.25);

    if (drawAssetSprite("mba", x, y + h / 2, w, h, {
      scale: pulse,
      offsetY: state.mbaFx > 0 ? Math.sin(performance.now() / 120) * 0.5 : 0,
    })) {
      return;
    }

    const x0 = snap4(x - (w * pulse) / 2);
    const y0 = snap4(y);
    const ww = snap4(w * pulse);
    const hh = snap4(h);
    ctx.fillStyle = PALETTE.navyDark;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = PALETTE.navyMid;
    ctx.fillRect(x0 + 4, y0 + 4, ww - 8, hh - 8);
    ctx.fillStyle = PALETTE.goldSoft;
    ctx.fillRect(x0 + 4, y0 + 4, ww - 8, 4);
    ctx.fillRect(x0 + 4, y0 + hh - 8, ww - 8, 4);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("MBA", x, y + h * 0.42);
    ctx.font = "bold 8px 'Courier New', monospace";
    ctx.fillText("BONUS", x, y + h * 0.72);
  }

  function drawPlayer() {
    const x = state.player.x;
    const y = state.player.y;
    const bob = Math.sin(state.player.bob) * 2;
    const bodyW = state.player.width;
    const bodyH = state.player.height;
    const target = laneX(state.player.lane);
    const moving = Math.abs(target - x) > 0.8;
    const facing = state.player.facing || 1;
    const step = Math.sin(state.player.runPhase);
    const stride = moving ? Math.round(step * 1.2) : 0;
    const lean = moving ? Math.round(step * 0.5) * facing : 0;
    const y0 = y - bodyH / 2 + bob;

    drawShadow(x, y0 + bodyH * 0.96, bodyW * 0.38, 11, 0.22);

    const scale = Math.max(4, Math.round(bodyW / 16));
    const spriteW = 16;
    const ox = Math.round(x - (spriteW * scale) / 2) + lean * scale;
    const oy = Math.round(y0);
    const px = (gx, gy, gw, gh, color) => {
      const drawX = facing === 1 ? gx : spriteW - gx - gw;
      ctx.fillStyle = color;
      ctx.fillRect(ox + drawX * scale, oy + gy * scale, gw * scale, gh * scale);
    };

    if (drawAssetSprite("playerStudent", x, y0 + bodyH / 2, bodyW, bodyH, {
      flipX: facing === -1,
      offsetX: lean * scale,
      offsetY: bob,
      scaleX: moving ? 1.02 : 1,
      scaleY: moving ? 0.98 : 1,
    })) {
      if (state.psychologyFx > 0) {
        drawPsychologyOverlay(x, y0, bodyW, bodyH);
      }
      return;
    }

    // Graduation cap.
    px(4, 0, 8, 1, PALETTE.navySoft);
    px(3, 1, 10, 1, PALETTE.navyMid);
    px(2, 2, 12, 1, PALETTE.navyDark);
    px(1, 3, 14, 1, PALETTE.navyMid);
    px(0, 4, 16, 1, PALETTE.navyDark);
    px(2, 5, 12, 1, PALETTE.navyMid);
    px(4, 6, 8, 1, PALETTE.navyDark);
    px(5, 7, 6, 1, PALETTE.navyMid);
    px(1, 2, 1, 4, PALETTE.gold);
    px(0, 4, 1, 2, PALETTE.goldSoft);
    px(1, 6, 2, 1, PALETTE.gold);

    // Hair and ears.
    px(3, 6, 10, 1, "#6f431d");
    px(2, 7, 12, 1, "#7d4f25");
    px(3, 8, 10, 1, "#8a5a2b");
    px(2, 9, 1, 2, "#f1c58f");
    px(13, 9, 1, 2, "#f1c58f");

    // Face.
    px(4, 8, 8, 7, "#f4c792");
    px(5, 9, 6, 5, "#efb784");
    px(5, 8, 6, 1, "#ffd6ae");
    px(5, 12, 6, 1, "#e4b07f");
    px(6, 13, 4, 1, "#dda173");
    px(7, 14, 2, 1, "#d58f64");
    px(6, 10, 1, 2, PALETTE.ink);
    px(9, 10, 1, 2, PALETTE.ink);
    px(6, 10, 1, 1, PALETTE.paper);
    px(9, 10, 1, 1, PALETTE.paper);
    px(7, 12, 2, 1, "#c97d58");

    // Robe and gold trim.
    px(3, 14, 10, 7, PALETTE.navyDark);
    px(4, 14, 8, 7, PALETTE.navy);
    px(5, 15, 6, 6, PALETTE.navyMid);
    px(6, 16, 4, 4, PALETTE.navySoft);
    px(4, 14, 1, 2, PALETTE.goldSoft);
    px(11, 14, 1, 2, PALETTE.goldSoft);
    px(5, 15, 1, 4, PALETTE.gold);
    px(10, 15, 1, 4, PALETTE.gold);
    px(6, 16, 4, 1, PALETTE.goldSoft);
    px(6, 18, 4, 1, PALETTE.gold);
    px(7, 17, 2, 4, "#7a1722");
    px(7, 16, 2, 1, "#f5f1e8");

    // Sleeves and hands.
    const armSwing = moving ? -stride : 0;
    px(1 + armSwing, 16, 2, 4, PALETTE.navyMid);
    px(13 - armSwing, 16, 2, 4, PALETTE.navyMid);
    px(0 + armSwing, 19, 2, 2, "#f4c792");
    px(14 - armSwing, 19, 2, 2, "#f4c792");
    px(1 + armSwing, 15, 1, 1, PALETTE.gold);
    px(13 - armSwing, 15, 1, 1, PALETTE.gold);

    // Legs and shoes.
    const legSwing = moving ? stride : 0;
    px(5 + legSwing, 20, 2, 3, "#4f596a");
    px(9 - legSwing, 20, 2, 3, "#4f596a");
    px(5 + legSwing, 19, 2, 1, PALETTE.beigeLight);
    px(9 - legSwing, 19, 2, 1, PALETTE.beigeLight);
    px(4 + legSwing, 22, 3, 2, PALETTE.brown);
    px(9 - legSwing, 22, 3, 2, PALETTE.brown);
    px(4 + legSwing, 23, 3, 1, "#5b3414");
    px(9 - legSwing, 23, 3, 1, "#5b3414");

    if (moving) {
      px(6, 20, 4, 1, PALETTE.navySoft);
      px(5, 21, 6, 1, PALETTE.navyDark);
      px(6, 22, 4, 1, PALETTE.navySoft);
    } else {
      px(6, 20, 4, 1, PALETTE.navySoft);
      px(5, 21, 6, 1, PALETTE.navyDark);
      px(6, 22, 4, 1, PALETTE.navySoft);
    }

    if (state.psychologyFx > 0) {
      px(5, 10, 2, 1, "#1b1b1b");
      px(9, 10, 2, 1, "#1b1b1b");
      px(4, 11, 1, 2, "#1b1b1b");
      px(11, 11, 1, 2, "#1b1b1b");
      px(5, 11, 6, 1, "#2d2d2d");
      px(6, 12, 1, 1, "#b3e8d8");
      px(9, 12, 1, 1, "#b3e8d8");
      px(5, 13, 6, 1, "#d7fff2");
      px(6, 14, 4, 1, "#9fe3cf");
    }
  }

  function drawPsychologia(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;

    drawShadow(x, y + h, w, 10, 0.22);

    const x0 = snap4(x - w / 2);
    const y0 = snap4(y);
    const ww = snap4(w);
    const hh = snap4(h);
    ctx.fillStyle = "#3f4e61";
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = "#273241";
    ctx.fillRect(x0 + 4, y0 + 4, ww - 8, hh - 8);
    ctx.fillStyle = "#8bc7b1";
    ctx.fillRect(x0 + 6, y0 + 6, ww - 12, 4);
    ctx.fillStyle = "#d7e8d8";
    ctx.fillRect(x0 + 12, y0 + 15, 12, 8);
    ctx.fillRect(x0 + ww - 24, y0 + 15, 12, 8);
    ctx.fillStyle = "#1b1f2a";
    ctx.fillRect(x0 + 11, y0 + 18, 4, 2);
    ctx.fillRect(x0 + ww - 15, y0 + 18, 4, 2);
    ctx.fillRect(x0 + 15, y0 + 18, ww - 30, 2);
    ctx.fillStyle = "#d7e8d8";
    ctx.fillRect(x0 + 8, y0 + hh - 14, ww - 16, 4);
    ctx.fillStyle = "#b3e8d8";
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText("PSYCHOLOGIA", x, y + h * 0.78);
  }

  function drawPopups() {
    ctx.textAlign = "center";
    ctx.font = "bold 12px 'Courier New', monospace";
    for (const popup of state.popups) {
      const alpha = clamp(popup.life / 0.95, 0, 1);
      ctx.fillStyle = popup.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.globalAlpha = 1;
    }
  }

  function drawOverlayText() {
    if (state.mode === "paused") {
      ctx.fillStyle = "rgba(18, 28, 18, 0.58)";
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.fillStyle = PALETTE.cream;
      ctx.font = "bold 24px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText("PAUZA", view.width / 2, view.height / 2);
      return;
    }

    if (state.phase === "transition") {
      ctx.fillStyle = "rgba(5, 12, 20, 0.52)";
      ctx.fillRect(0, 0, view.width, view.height);

      const panelW = Math.min(view.width * 0.8, 360);
      const panelH = 146;
      const panelX = (view.width - panelW) / 2;
      const panelY = view.height * 0.2;
      const countdown = Math.max(0, Math.ceil(state.transitionTimer));

      ctx.fillStyle = "rgba(11, 22, 37, 0.96)";
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = "rgba(255, 244, 214, 0.26)";
      ctx.lineWidth = 2;
      ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);

      ctx.fillStyle = PALETTE.goldSoft;
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.textAlign = "center";
      if (state.transitionKind === "boss-intro") {
        ctx.fillText(`KONIEC POZIOMU ${state.level}`, view.width / 2, panelY + 22);

        ctx.fillStyle = PALETTE.cream;
        ctx.font = "bold 38px 'Courier New', monospace";
        ctx.fillText(String(countdown), view.width / 2, panelY + 68);

        ctx.fillStyle = PALETTE.accent;
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.fillText("BOSS RENATA", view.width / 2, panelY + 94);

        ctx.fillStyle = "rgba(255, 244, 214, 0.72)";
        ctx.font = "bold 11px 'Courier New', monospace";
        ctx.fillText("Za chwilę wjeżdża boss", view.width / 2, panelY + 116);
        ctx.fillText(`Wynik poziomu: ${state.levelCompleteScore}`, view.width / 2, panelY + 132);
      } else {
        ctx.fillText(`POZIOM ${state.level} ZALICZONY`, view.width / 2, panelY + 22);

        ctx.fillStyle = PALETTE.cream;
        ctx.font = "bold 26px 'Courier New', monospace";
        ctx.fillText("BOSS RENATA", view.width / 2, panelY + 60);

        ctx.fillStyle = PALETTE.accent;
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillText(`Wynik poziomu: ${state.levelCompleteScore}`, view.width / 2, panelY + 88);
        ctx.fillText(`Za ${countdown} s zacznie się kolejny level`, view.width / 2, panelY + 108);

        ctx.fillStyle = "rgba(255, 244, 214, 0.72)";
        ctx.font = "bold 10px 'Courier New', monospace";
        ctx.fillText(state.level >= MAX_LEVEL ? "To był już finał" : `Przygotuj się na poziom ${state.level + 1}`, view.width / 2, panelY + 128);
      }
    }
  }

  function drawEffects() {
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 240, 163, ${state.flash * 0.35})`;
      ctx.fillRect(0, 0, view.width, view.height);
    }

    if (state.mbaFx > 0) {
      const alpha = state.mbaFx * 0.08;
      ctx.fillStyle = `rgba(255, 206, 81, ${alpha})`;
      ctx.fillRect(0, 0, view.width, view.height);
      ctx.fillStyle = `rgba(95, 255, 177, ${alpha * 0.5})`;
      ctx.fillRect(0, view.height * 0.18, view.width, 2);
      ctx.fillRect(0, view.height * 0.49, view.width, 2);
      ctx.fillRect(0, view.height * 0.8, view.width, 2);
    }

    if (state.psychologyFx > 0) {
      const alpha = state.psychologyFx * 0.12;
      ctx.fillStyle = `rgba(136, 238, 209, ${alpha})`;
      ctx.fillRect(0, view.height * 0.2, view.width, 1);
      ctx.fillRect(0, view.height * 0.51, view.width, 1);
      ctx.fillRect(0, view.height * 0.76, view.width, 1);
      ctx.fillStyle = `rgba(208, 180, 255, ${alpha * 0.6})`;
      ctx.fillRect(0, view.height * 0.27, view.width, 1);
      ctx.fillRect(0, view.height * 0.64, view.width, 1);
    }
  }

  function render() {
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * 8 * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * 6 * state.shake : 0;

    ctx.save();
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.translate(shakeX, shakeY);

    if (state.mbaFx > 0) {
      ctx.save();
      ctx.translate(2, 0);
      ctx.globalAlpha = 0.85;
      drawBackground();
      drawScene();
      ctx.restore();

      ctx.save();
      ctx.translate(-2, 0);
      ctx.globalAlpha = 0.72;
      drawBackground();
      drawScene();
      ctx.restore();

      ctx.globalAlpha = 1;
      drawBackground();
      drawScene();
    } else {
      drawBackground();
      drawScene();
    }

    drawEffects();
    drawOverlayText();
    ctx.restore();
  }

  function drawScene() {
    for (const item of state.items) {
      if (item.type === "diploma") {
        drawDiploma(item);
      } else if (item.type === "cash" || item.type === "bribe") {
        drawCash(item);
      } else if (item.type === "mba") {
        drawMba(item);
      } else if (item.type === "psychologia") {
        drawPsychologia(item);
      } else if (item.type === "pka") {
        drawPka(item);
      }
    }

    if (state.phase === "boss" && state.boss) {
      drawRenataBoss(state.boss);
      drawBossShots();
      drawPlayerShots();
      drawBossHud();
    }

    drawPlayer();
    drawPopups();
  }

  async function shareResult() {
    const isLevelClear = state.mode === "levelclear";
    const score = isLevelClear ? state.levelCompleteScore : state.score;
    const text = isLevelClear
      ? `KOLEGUM HUMANOOB - poziom ${state.level}: ${score}. Najlepszy wynik: ${state.bestScore}.`
      : `KOLEGUM HUMANOOB - wynik: ${score}. Najlepszy wynik: ${state.bestScore}.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "KOLEGUM HUMANOOB",
          text,
        });
        shareStatus.textContent = "Gotowe do udostępnienia.";
        return;
      }
    } catch {
      // Falls through to copy fallback.
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        shareStatus.textContent = "Wynik skopiowany do schowka.";
        return;
      }
    } catch {
      // Falls through to the textarea fallback.
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    document.body.removeChild(area);
    shareStatus.textContent = copied ? "Wynik skopiowany do schowka." : `Skopiuj ręcznie: ${text}`;
  }

  function handleKeyboard(event) {
    if (state.mode !== "playing" || (state.phase !== "collect" && state.phase !== "boss")) {
      return;
    }

    ensureAudioContext();
    const key = event.key;
    const left = key === "ArrowLeft" || key === "a" || key === "A";
    const right = key === "ArrowRight" || key === "d" || key === "D";
    const attack = key === " " || key === "Spacebar" || key === "Enter" || key === "z" || key === "Z";

    if (attack && state.phase === "boss") {
      event.preventDefault();
      fireBook();
      return;
    }

    if (!left && !right) {
      return;
    }

    event.preventDefault();
    if (left) {
      state.player.lane = clamp(state.player.lane - 1, 0, LANE_COUNT - 1);
    } else if (right) {
      state.player.lane = clamp(state.player.lane + 1, 0, LANE_COUNT - 1);
    }
  }

  function pointerToLane(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const laneWidth = rect.width * 0.82;
    const left = rect.width * 0.09;
    const pct = clamp((x - left) / laneWidth, 0, 1);
    return Math.round(pct * (LANE_COUNT - 1));
  }

  function handlePointerDown(event) {
    if (state.mode !== "playing" || (state.phase !== "collect" && state.phase !== "boss")) {
      return;
    }

    ensureAudioContext();
    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const isTouchLike = event.pointerType === "touch" || typeof event.pointerType === "undefined";
    const isMouse = event.pointerType === "mouse";

    if (state.phase === "boss") {
      if (isMouse) {
        state.player.lane = pointerToLane(event.clientX);
        event.preventDefault();
        fireBook();
        return;
      }
      if (y < rect.height * 0.45) {
        event.preventDefault();
        fireBook();
        return;
      }
    }

    if (y < rect.height * 0.45) {
      return;
    }

    canvas.setPointerCapture?.(event.pointerId);
    state.input.dragging = true;
    state.input.pointerId = event.pointerId;
    state.player.lane = pointerToLane(event.clientX);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (state.mode !== "playing" || (state.phase !== "collect" && state.phase !== "boss")) {
      return;
    }

    if (state.phase === "boss" && event.pointerType === "mouse") {
      state.player.lane = pointerToLane(event.clientX);
      event.preventDefault();
      return;
    }

    if (!state.input.dragging || state.input.pointerId !== event.pointerId) {
      return;
    }

    state.player.lane = pointerToLane(event.clientX);
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (state.input.pointerId === event.pointerId) {
      state.input.dragging = false;
      state.input.pointerId = null;
    }
  }

  function wireInput() {
    window.addEventListener("keydown", handleKeyboard, { passive: false });
    if (window.PointerEvent) {
      canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
      canvas.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    } else {
      canvas.addEventListener("touchstart", (event) => {
        const touch = event.changedTouches[0];
        if (!touch) {
          return;
        }
        handlePointerDown({
          clientX: touch.clientX,
          clientY: touch.clientY,
          pointerId: touch.identifier,
          pointerType: "touch",
          preventDefault: () => event.preventDefault(),
        });
      }, { passive: false });
      canvas.addEventListener("touchmove", (event) => {
        const touch = event.changedTouches[0];
        if (!touch) {
          return;
        }
        handlePointerMove({
          clientX: touch.clientX,
          clientY: touch.clientY,
          pointerId: touch.identifier,
          pointerType: "touch",
          preventDefault: () => event.preventDefault(),
        });
      }, { passive: false });
      window.addEventListener("touchend", (event) => {
        const touch = event.changedTouches[0];
        if (touch) {
          handlePointerUp({ pointerId: touch.identifier });
        }
      });
      window.addEventListener("touchcancel", (event) => {
        const touch = event.changedTouches[0];
        if (touch) {
          handlePointerUp({ pointerId: touch.identifier });
        }
      });
    }
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  function wirePauseHandling() {
    window.addEventListener("blur", pauseForFocus);
    window.addEventListener("focus", resumeFromFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseForFocus();
      } else {
        resumeFromFocus();
      }
    });
    window.addEventListener("pagehide", pauseForFocus);
    window.addEventListener("pageshow", resumeFromFocus);
  }

  function wireButtons() {
    startButton.addEventListener("click", () => {
      startGame();
    });
    shareButton.addEventListener("click", () => {
      shareResult();
    });
    if (bossActionButton) {
      bossActionButton.addEventListener("click", () => {
        fireBook();
      });
    }
    if (rankingButton) {
      rankingButton.addEventListener("click", () => {
        if (state.mode !== "gameover" && state.mode !== "levelclear") {
          showBanner("Ranking otwiera się po zakończeniu poziomu lub gry.", 1.1);
          return;
        }
        state.leaderboardLevel = clampLevel(state.level);
        setLeaderboardExpanded(!state.leaderboardExpanded);
        syncResultOverlay();
        if (state.leaderboardExpanded) {
          loadLeaderboard();
        }
      });
    }
    leaderboardForm.addEventListener("submit", submitLeaderboardEntry);
    leaderboardToggle.addEventListener("click", () => {
      state.leaderboardLevel = clampLevel(state.level);
      setLeaderboardExpanded(!state.leaderboardExpanded);
      syncResultOverlay();
      if (state.leaderboardExpanded) {
        loadLeaderboard();
      }
    });
    restartButton.addEventListener("click", () => {
      logFlow("restartButton.click", { mode: state.mode, level: state.level });
      if (state.mode === "levelclear" || state.resultKind === "levelclear") {
        finishLevel();
        return;
      }
      startGame();
    });
  }

  function boot() {
    if (buildVersion) {
      buildVersion.textContent = `v${BUILD_VERSION}`;
    }
    void preloadArtAssets();
    resizeCanvas();
    syncHud();
    renderLeaderboard([]);
    setLeaderboardStatus("Wpisz login i zapisz wynik po zakończeniu gry lub poziomu.", false);
    setOverlay("start");
    wireInput();
    wirePauseHandling();
    wireButtons();
    window.addEventListener("resize", resizeCanvas);
    loadLeaderboard();
    requestAnimationFrame(loop);
  }

  function loop(timestamp) {
    const last = state.lastFrame || timestamp;
    const dt = clamp((timestamp - last) / 1000, 0, 0.05);
    state.lastFrame = timestamp;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  boot();
})();
