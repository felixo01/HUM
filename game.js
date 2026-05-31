(() => {
  const STORAGE_KEY = "humanum-best-score";
  const LEADERBOARD_META_NAME = "humanum-leaderboard-api";
  const LEADERBOARD_API_FALLBACK = "https://humanumleaderboard.felix-7d1.workers.dev";
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
  const leaderboardWeek = document.getElementById("leaderboard-week");
  const leaderboardForm = document.getElementById("leaderboard-form");
  const leaderboardName = document.getElementById("leaderboard-name");
  const leaderboardSubmit = document.getElementById("leaderboard-submit");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardStatus = document.getElementById("leaderboard-status");
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
    psychologyFx: 0,
    leaderboardWeekKey: getIsoWeekKey(new Date()),
    leaderboardEntries: [],
    leaderboardLoading: false,
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

  function getRoundProgress() {
    return clamp(1 - state.timeLeft / DURATION, 0, 1);
  }

  function getDifficulty(progress) {
    const curve = Math.pow(progress, 1.35);
    return {
      progress,
      curve,
      diplomaSpeed: lerp(132, 320, curve),
      diplomaSpeedJitter: lerp(0.18, 0.12, curve),
      spawnInterval: lerp(0.96, 0.34, curve),
      extraSpawnChance: lerp(0.08, 0.24, curve),
      pkaDelayMin: lerp(14, 8.5, curve),
      pkaDelayMax: lerp(20, 13, curve),
      pkaSpeed: lerp(300, 470, curve),
      pkaVerticalBoost: lerp(1.12, 1.36, curve),
    };
  }

  function getLeaderboardApiUrl() {
    const meta = document.querySelector(`meta[name="${LEADERBOARD_META_NAME}"]`);
    return meta?.content?.trim() || LEADERBOARD_API_FALLBACK;
  }

  function getIsoWeekKey(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
    return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function formatWeekLabel(weekKey) {
    return weekKey ? `Tydzień ${weekKey}` : "Tydzień —";
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

  function renderLeaderboard(entries = []) {
    leaderboardWeek.textContent = formatWeekLabel(state.leaderboardWeekKey);
    leaderboardList.textContent = "";

    if (!entries.length) {
      const item = document.createElement("li");
      item.className = "leaderboard-entry leaderboard-empty";
      item.textContent = "Brak wyników w tym tygodniu.";
      leaderboardList.appendChild(item);
      return;
    }

    entries.slice(0, 10).forEach((entry, index) => {
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
    leaderboardWeek.textContent = formatWeekLabel(state.leaderboardWeekKey);

    const apiUrl = getLeaderboardApiUrl();
    state.leaderboardLoading = true;
    setLeaderboardStatus("Ładowanie tabeli...", true);

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/leaderboard?week=${encodeURIComponent(state.leaderboardWeekKey)}`, {
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
      setLeaderboardStatus(entries.length ? "Wyniki online są gotowe." : "Na ten tydzień jeszcze nikt nie dodał wyniku.", false);
    } catch (error) {
      console.error("Leaderboard load failed:", error);
      state.leaderboardEntries = [];
      renderLeaderboard([]);
      setLeaderboardStatus("Nie udało się pobrać tabeli. Sprawdź URL Worker'a.", false);
    } finally {
      state.leaderboardLoading = false;
    }
  }

  async function submitLeaderboardEntry(event) {
    event.preventDefault();
    if (state.mode !== "gameover") {
      return;
    }

    const apiUrl = getLeaderboardApiUrl();
    const nickname = sanitizeNickname(leaderboardName.value);
    if (!nickname) {
      setLeaderboardStatus("Wpisz login przed zapisaniem wyniku.", false);
      leaderboardName.focus();
      return;
    }

    state.leaderboardWeekKey = getIsoWeekKey(new Date());
    setLeaderboardStatus("Zapisywanie wyniku...", true);

    try {
      const response = await fetch(`${apiUrl.replace(/\/$/, "")}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nickname,
          score: state.score,
          weekKey: state.leaderboardWeekKey,
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
      setLeaderboardStatus("Wynik zapisany. Tabela odświeżona.", false);
    } catch (error) {
      console.error("Leaderboard submit failed:", error);
      setLeaderboardStatus("Nie udało się zapisać wyniku. Spróbuj ponownie.", false);
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
    state.pkaTimer = randomRange(14, 20);
    state.pkaStorm = 0;
    state.cancelWave = 0;
    state.psychologyFx = 0;
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
    state.player.facing = 1;
    state.player.runPhase = 0;
    state.lastFrame = performance.now();
    hideBanner();
    setOverlay(null);
    shareStatus.textContent = "";
    state.leaderboardWeekKey = getIsoWeekKey(new Date());
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
    const difficulty = options.difficulty || getDifficulty(getRoundProgress());
    const speedFactor = 0.9 + Math.random() * difficulty.diplomaSpeedJitter;
    const item = {
      type,
      lane,
      x: targetX,
      y: -60,
      vx: 0,
      speed: difficulty.diplomaSpeed * speedFactor,
      size: type === "mba" ? 56 : type === "cash" ? 52 : type === "pka" ? 50 : type === "psychologia" ? 54 : 48,
      w: type === "mba" ? 68 : type === "cash" ? 62 : type === "pka" ? 72 : type === "psychologia" ? 70 : 46,
      h: type === "mba" ? 48 : type === "cash" ? 42 : type === "pka" ? 32 : type === "psychologia" ? 50 : 68,
      caught: false,
      wobble: Math.random() * Math.PI * 2,
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
    queueSpecialDrop("cash", 0.15);
  }

  function triggerPkaAlert() {
    showBanner("UWAGA PKA!", 1.2);
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
    } else if (item.type === "psychologia") {
      addPopup("OKULARNIK", item.x, item.y, PALETTE.mint);
      state.psychologyFx = 3;
      showBanner("PSYCHOLOGIA!", 1.15);
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
    } else if (item.type === "cash" || item.type === "mba" || item.type === "psychologia") {
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

    state.timeLeft = Math.max(0, state.timeLeft - dt);
    updatePlayer(dt);

    const difficulty = getDifficulty(getRoundProgress());
    state.spawnTimer += dt;
    state.pkaTimer -= dt;
    if (state.pkaTimer <= 0) {
      triggerPkaAlert();
    }

    const spawnInterval = difficulty.spawnInterval;
    while (state.spawnTimer >= spawnInterval) {
      state.spawnTimer -= spawnInterval;
      spawnItem("diploma", { difficulty });
      if (Math.random() < difficulty.extraSpawnChance) {
        spawnItem("diploma", { difficulty });
      }
      if (Math.random() < lerp(0.03, 0.07, difficulty.curve)) {
        spawnItem("psychologia", { difficulty });
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
    const target = laneX(state.player.lane);
    const moving = Math.abs(target - x) > 0.8;
    const facing = state.player.facing || 1;
    const step = Math.sin(state.player.runPhase);
    const stride = moving ? Math.round(step * 1) : 0;
    const lean = moving ? Math.round(step * 0.45) * facing : 0;
    const y0 = y - bodyH / 2 + bob;

    drawShadow(x, y0 + bodyH * 0.94, bodyW * 0.38, 11, 0.22);

    const scale = Math.max(4, Math.round(bodyW / 16));
    const spriteW = 16;
    const ox = Math.round(x - (spriteW * scale) / 2) + lean * scale;
    const oy = Math.round(y0);
    const px = (gx, gy, gw, gh, color) => {
      const drawX = facing === 1 ? gx : spriteW - gx - gw;
      ctx.fillStyle = color;
      ctx.fillRect(ox + drawX * scale, oy + gy * scale, gw * scale, gh * scale);
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

    if (moving) {
      px(4, 10, 8, 7, PALETTE.navy);
      px(5, 10, 6, 7, PALETTE.navyMid);
      px(6, 11, 4, 5, PALETTE.navySoft);
      px(6, 10, 4, 1, PALETTE.beigeSoft);
      px(5, 11, 1, 4, PALETTE.beigeLight);
      px(10, 11, 1, 4, PALETTE.beigeLight);

      px(2 + stride, 11, 2, 4, PALETTE.navyMid);
      px(1 + stride, 13, 2, 2, "#f0c6a2");
      px(stride, 12, 2, 3, PALETTE.paper);
      px(stride, 13, 1, 1, PALETTE.navyDark);
      px(1 + stride, 11, 1, 1, PALETTE.gold);

      px(12 - stride, 11, 2, 4, PALETTE.navyMid);
      px(13 - stride, 13, 2, 2, "#f0c6a2");

      px(5, 17, 2, 2, PALETTE.navySoft);
      px(9, 17, 2, 2, PALETTE.navySoft);
      px(5, 16, 2, 1, PALETTE.beigeLight);
      px(9, 16, 2, 1, PALETTE.beigeLight);

      px(4, 19, 3, 1, PALETTE.ink);
      px(9, 19, 4, 1, PALETTE.ink);
    } else {
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

    if (state.psychologyFx > 0) {
      px(4, 5, 3, 1, "#1b1b1b");
      px(9, 5, 3, 1, "#1b1b1b");
      px(3, 6, 1, 2, "#1b1b1b");
      px(12, 6, 1, 2, "#1b1b1b");
      px(4, 6, 8, 1, "#2d2d2d");
      px(5, 7, 2, 1, "#b3e8d8");
      px(9, 7, 2, 1, "#b3e8d8");
      px(7, 18, 2, 2, "#9fe3cf");
      px(6, 17, 4, 1, "#d7fff2");
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
      } else if (item.type === "cash") {
        drawCash(item);
      } else if (item.type === "mba") {
        drawMba(item);
      } else if (item.type === "psychologia") {
        drawPsychologia(item);
      } else if (item.type === "pka") {
        drawPka(item);
      }
    }

    drawPlayer();
    drawPopups();
  }

  async function shareResult() {
    const text = `HUMA-NUM - wynik: ${state.score}. Najlepszy wynik: ${state.bestScore}.`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "HUMA-NUM",
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
    leaderboardForm.addEventListener("submit", submitLeaderboardEntry);
  }

  function boot() {
    resizeCanvas();
    syncHud();
    renderLeaderboard([]);
    setLeaderboardStatus("Wpisz login i zapisz wynik po zakończeniu gry.", false);
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
