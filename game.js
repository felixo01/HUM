(() => {
  const STORAGE_KEY = "humanum-best-score";
  const DURATION = 60;
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
  const finalScore = document.getElementById("final-score");
  const finalBest = document.getElementById("final-best");
  const shareStatus = document.getElementById("share-status");
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const shareButton = document.getElementById("share-button");

  const view = {
    width: 0,
    height: 0,
    dpr: 1,
  };

  const state = {
    mode: "start",
    timeLeft: DURATION,
    score: START_SCORE,
    bestScore: loadBestScore(),
    combo: 0,
    bonusUnlocked: false,
    spawnTimer: 0,
    specialDrop: null,
    pkaTimer: 0,
    pkaStorm: 0,
    cancelWave: 0,
    items: [],
    popups: [],
    flash: 0,
    shake: 0,
    mbaFx: 0,
    speedBoost: 0,
    bannerTimer: 0,
    bannerText: "",
    pausedReason: "",
    lastFrame: 0,
    player: {
      lane: Math.floor(LANE_COUNT / 2),
      x: 0,
      y: 0,
      width: 60,
      height: 88,
      bob: 0,
    },
    input: {
      dragging: false,
      pointerId: null,
      touchMode: false,
    },
  };

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

  function snap4(value) {
    return Math.round(value / 4) * 4;
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomLane() {
    return Math.floor(Math.random() * LANE_COUNT);
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
    hudScore.textContent = String(state.score);
    hudCombo.textContent = state.combo > 0 ? `x${state.combo}` : "0";
    hudBest.textContent = String(Math.max(state.bestScore, state.score));
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

  function resetRound() {
    state.mode = "playing";
    state.timeLeft = DURATION;
    state.score = START_SCORE;
    state.combo = 0;
    state.bonusUnlocked = false;
    state.spawnTimer = 0;
    state.specialDrop = null;
    state.pkaTimer = randomRange(8, 14);
    state.pkaStorm = 0;
    state.cancelWave = 0;
    state.items.length = 0;
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
    state.lastFrame = performance.now();
    hideBanner();
    setOverlay(null);
    shareStatus.textContent = "";
    syncHud();
  }

  function startGame() {
    resetRound();
    showBanner("Złap dyplomy, zanim uciekną!", 1.2);
  }

  function endGame() {
    state.mode = "gameover";
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveBestScore(state.bestScore);
    }
    finalScore.textContent = String(state.score);
    finalBest.textContent = String(state.bestScore);
    setOverlay("end");
    showBanner("Koniec gry", 1.8);
    syncHud();
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
    const fallBase = 150 + ((DURATION - state.timeLeft) / DURATION) * 160;
    const speedFactor = 0.9 + Math.random() * 0.28;
    const item = {
      type,
      lane,
      x: targetX,
      y: -60,
      vx: 0,
      speed: fallBase * speedFactor,
      size: type === "mba" ? 56 : type === "cash" ? 52 : type === "pka" ? 50 : 48,
      w: type === "mba" ? 68 : type === "cash" ? 62 : type === "pka" ? 72 : 46,
      h: type === "mba" ? 48 : type === "cash" ? 42 : type === "pka" ? 32 : 68,
      caught: false,
      wobble: Math.random() * Math.PI * 2,
    };

    if (type === "pka") {
      item.x = targetX;
      item.vx = 0;
      item.speed = 360 + ((DURATION - state.timeLeft) / DURATION) * 260;
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
    queueSpecialDrop("cash", 0.15);
  }

  function triggerPkaAlert() {
    showBanner("UWAGA PKA!", 1.2);
    spawnItem("pka", { targetX: state.player.x });
    state.pkaTimer = randomRange(11, 18);
  }

  function triggerPkaCancel() {
    state.cancelWave = 5;
    state.pkaStorm = 5;
    state.flash = Math.max(state.flash, 0.28);
    state.shake = Math.max(state.shake, 0.22);
    showBanner("PKA! ANULOWANO", 1.15);
  }

  function catchItem(item) {
    item.caught = true;

    if (item.type === "diploma") {
      state.combo += 1;
      state.score += 10 + Math.min(12, state.combo * 2);
      addPopup(`+${10 + Math.min(12, state.combo * 2)}`, item.x, item.y, PALETTE.cream);
      if (state.combo >= 5 && !state.bonusUnlocked) {
        triggerBonusChain();
      }
    } else if (item.type === "cash") {
      state.score += 40;
      addPopup("+40", item.x, item.y, PALETTE.goldSoft);
      showBanner("Bonus MBA!", 1.15);
      queueSpecialDrop("mba", 0.28);
    } else if (item.type === "mba") {
      state.score += 250;
      addPopup("+250", item.x, item.y, PALETTE.goldSoft);
      state.flash = 0.55;
      state.shake = 0.3;
      state.mbaFx = 1.35;
      state.speedBoost = 5;
      showBanner("MBA!", 1.2);
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
      } else {
        addPopup("MISS", item.x, Math.min(view.height * 0.8, item.y), PALETTE.redWarm);
      }
      syncHud();
    } else if (item.type === "cash" || item.type === "mba") {
      state.combo = 0;
      state.bonusUnlocked = false;
    }
  }

  function updateItems(dt) {
    const playerX = state.player.x;
    const playerY = state.player.y;
    const playerW = state.player.width;
    const playerH = state.player.height;
    const pkaActive = state.pkaStorm > 0;

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
        } else {
          item.vx *= Math.pow(0.93, dt * 60);
          item.vx = clamp(item.vx, -120, 120);
          item.x += item.vx * dt;
          item.y += item.speed * dt;
        }
      } else {
        if (item.type === "pka" && typeof item.targetX === "number") {
          item.x += (item.targetX - item.x) * clamp(dt * 15, 0, 0.95);
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

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    updatePlayer(dt);

    const progress = 1 - state.timeLeft / DURATION;
    state.spawnTimer += dt;
    state.pkaTimer -= dt;
    if (state.pkaTimer <= 0) {
      triggerPkaAlert();
    }

    const spawnInterval = clamp(0.82 - progress * 0.46, 0.3, 0.82);
    while (state.spawnTimer >= spawnInterval) {
      state.spawnTimer -= spawnInterval;
      spawnItem("diploma");
      if (Math.random() < 0.12 + progress * 0.08) {
        spawnItem("diploma");
      }
    }

    updateSpecialDrop(dt);
    updateItems(dt);
    updatePopups(dt);
    updateEffects(dt);
    syncHud();

    if (state.timeLeft <= 0) {
      endGame();
    }
  }

  function drawBackground() {
    const { width: w, height: h } = view;

    ctx.fillStyle = PALETTE.beigeLight;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(0, 0, w, snap4(h * 0.12));
    ctx.fillStyle = PALETTE.beige;
    ctx.fillRect(0, snap4(h * 0.12), w, snap4(h * 0.12));
    ctx.fillStyle = PALETTE.navyDark;
    ctx.fillRect(0, snap4(h * 0.24), w, h - snap4(h * 0.24));
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, w, 4);

    const left = w * 0.09;
    const spacing = laneSpacing();

    for (let i = 0; i < LANE_COUNT; i += 1) {
      const x = left + spacing * i;
      ctx.fillStyle = i === Math.floor(LANE_COUNT / 2) ? "rgba(255, 244, 214, 0.16)" : "rgba(255, 244, 214, 0.08)";
      ctx.fillRect(snap4(x - 1), snap4(h * 0.11), 2, h - snap4(h * 0.18));
    }

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, snap4(h * 0.24), w, 2);
    ctx.fillRect(0, snap4(h * 0.48), w, 2);
    ctx.fillRect(0, snap4(h * 0.72), w, 2);

    const platformY = snap4(state.player.y + state.player.height * 0.28);
    ctx.fillStyle = "rgba(8, 51, 90, 0.18)";
    ctx.fillRect(0, platformY, w, h - platformY);
    ctx.fillStyle = "rgba(139, 0, 0, 0.12)";
    ctx.fillRect(0, platformY + 4, w, 4);
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

    drawShadow(x, y + h, w, 12, 0.24);

    const x0 = snap4(x - w / 2);
    const y0 = snap4(y);
    const ww = snap4(w);
    const hh = snap4(h);
    ctx.fillStyle = PALETTE.beigeSoft;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(x0, y0, 8, hh);
    ctx.fillStyle = PALETTE.beige;
    ctx.fillRect(x0 + 10, y0 + 8, ww - 16, 4);
    ctx.fillRect(x0 + 10, y0 + 20, ww - 20, 4);
    ctx.fillRect(x0 + 10, y0 + 32, ww - 14, 4);
    ctx.fillRect(x0 + 10, y0 + 44, ww - 24, 4);

    if (state.pkaStorm > 0) {
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

    ctx.fillStyle = PALETTE.navyDark;
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

    const x0 = snap4(x - w / 2);
    const y0 = snap4(y);
    const ww = snap4(w);
    const hh = snap4(h);
    ctx.fillStyle = PALETTE.redWarm;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = PALETTE.redDark;
    ctx.fillRect(x0 + 4, y0 + 4, ww - 8, hh - 8);
    ctx.fillStyle = PALETTE.goldSoft;
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
  }

  function drawCash(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;

    drawShadow(x, y + h, w, 10, 0.25);

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

  function drawMba(item) {
    const x = item.x;
    const y = item.y;
    const w = item.w;
    const h = item.h;
    const pulse = state.mbaFx > 0 ? 1 + Math.sin(performance.now() / 90) * 0.05 : 1;

    drawShadow(x, y + h, w * pulse, 12, 0.25);

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
    const y0 = y - bodyH / 2 + bob;

    drawShadow(x, y0 + bodyH * 0.94, bodyW * 0.38, 11, 0.22);

    const scale = Math.max(4, Math.round(bodyW / 16));
    const spriteW = 16;
    const ox = Math.round(x - (spriteW * scale) / 2);
    const oy = Math.round(y0);
    const px = (gx, gy, gw, gh, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + gx * scale, oy + gy * scale, gw * scale, gh * scale);
    };

    px(2, 0, 12, 1, PALETTE.navyDark);
    px(1, 1, 14, 1, PALETTE.navyMid);
    px(1, 2, 13, 1, PALETTE.navyDark);
    px(2, 3, 11, 1, PALETTE.navyMid);
    px(3, 4, 9, 1, PALETTE.navyDark);
    px(0, 1, 1, 1, PALETTE.gold);
    px(0, 2, 1, 2, PALETTE.gold);

    px(2, 4, 2, 2, PALETTE.brown);
    px(12, 4, 2, 2, PALETTE.brown);
    px(3, 5, 1, 1, PALETTE.brown);
    px(12, 5, 1, 1, PALETTE.brown);

    px(4, 4, 8, 5, "#f0c6a2");
    px(4, 5, 8, 4, "#e7b88f");
    px(5, 4, 6, 1, "#f5d3b2");
    px(5, 6, 6, 2, "#f7dcbf");
    px(6, 6, 1, 1, PALETTE.ink);
    px(9, 6, 1, 1, PALETTE.ink);
    px(6, 7, 1, 1, "#30415f");
    px(9, 7, 1, 1, "#30415f");
    px(7, 8, 2, 1, "#deab84");

    px(6, 9, 4, 1, "#e4c09d");

    px(4, 10, 8, 7, PALETTE.navy);
    px(5, 10, 6, 7, PALETTE.navyMid);
    px(6, 11, 4, 5, PALETTE.navySoft);
    px(6, 10, 4, 1, PALETTE.beigeSoft);
    px(5, 11, 1, 4, PALETTE.beigeLight);
    px(10, 11, 1, 4, PALETTE.beigeLight);

    px(2, 11, 2, 4, PALETTE.navyMid);
    px(1, 13, 2, 2, "#f0c6a2");
    px(0, 12, 2, 3, PALETTE.paper);
    px(0, 13, 1, 1, PALETTE.navyDark);
    px(1, 11, 1, 1, PALETTE.gold);

    px(12, 11, 2, 4, PALETTE.navyMid);
    px(13, 13, 2, 2, "#f0c6a2");

    px(5, 17, 2, 2, PALETTE.navySoft);
    px(9, 17, 2, 2, PALETTE.navySoft);
    px(5, 16, 2, 1, PALETTE.beigeLight);
    px(9, 16, 2, 1, PALETTE.beigeLight);

    px(4, 19, 3, 1, PALETTE.ink);
    px(9, 19, 4, 1, PALETTE.ink);
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
      } else if (item.type === "cash") {
        drawCash(item);
      } else if (item.type === "mba") {
        drawMba(item);
      } else if (item.type === "pka") {
        drawPka(item);
      }
    }

    drawPlayer();
    drawPopups();
  }

  async function shareResult() {
    const text = `Humanum - wynik: ${state.score}. Najlepszy wynik: ${state.bestScore}.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Humanum",
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
    if (state.mode !== "playing") {
      return;
    }

    const key = event.key;
    const left = key === "ArrowLeft" || key === "a" || key === "A";
    const right = key === "ArrowRight" || key === "d" || key === "D";
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
    if (state.mode !== "playing") {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
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
    if (!state.input.dragging || state.input.pointerId !== event.pointerId || state.mode !== "playing") {
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
    restartButton.addEventListener("click", () => {
      startGame();
    });
    shareButton.addEventListener("click", () => {
      shareResult();
    });
  }

  function boot() {
    resizeCanvas();
    syncHud();
    setOverlay("start");
    wireInput();
    wirePauseHandling();
    wireButtons();
    window.addEventListener("resize", resizeCanvas);
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
