import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const readText = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

function extractNamedFunction(source, name) {
  const startToken = `function ${name}(`;
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `Missing function ${name} in game.js`);

  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `Missing body for function ${name}`);

  let i = bodyStart;
  let depth = 0;
  let quote = "";
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        quote = "";
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error(`Could not extract function ${name}`);
}

function createFlowHarness() {
  const game = readText("game.js");
  const functions = [
    "syncResultOverlay",
    "beginLevelClearPhase",
    "showLevelClearResults",
    "finishLevel",
    "defeatBoss",
    "update",
  ].map((name) => extractNamedFunction(game, name)).join("\n\n");

  const build = new Function(`
    const MAX_LEVEL = 5;
    const PALETTE = { goldSoft: "#ffe49a" };
    const view = { width: 900, height: 600 };
    const state = {
      mode: "playing",
      phase: "boss",
      level: 1,
      score: 250,
      bestScore: 300,
      levelScoreStart: 100,
      levelCompleteScore: 0,
      resultKind: "",
      leaderboardExpanded: false,
      leaderboardWeekKey: "",
      leaderboardLevel: 1,
      leaderboardSubmissionScore: 0,
      transitionKind: null,
      transitionTimer: 0,
      flash: 0,
      shake: 0,
      attackCooldown: 0,
      boss: { hp: 1 },
      playerHp: 3,
      popups: [],
    };

    const finalTitle = { textContent: "" };
    const finalScore = { textContent: "" };
    const finalBest = { textContent: "" };
    const restartButton = { textContent: "" };
    const leaderboardSubmit = { textContent: "" };
    const leaderboardToggleHint = { textContent: "" };
    const shareStatus = { textContent: "" };
    const resultLabelPrefix = { textContent: "" };

    const overlayCalls = [];
    const collectCalls = [];
    const endGameCalls = [];
    const bannerCalls = [];

    const logFlow = () => {};
    const setOverlay = (value) => { overlayCalls.push(value); };
    const beginCollectPhase = (level) => {
      collectCalls.push(level);
      state.mode = "playing";
      state.phase = "collect";
      state.level = level;
    };
    const endGame = () => {
      endGameCalls.push({ level: state.level, score: state.score });
      state.mode = "gameover";
      state.phase = "results";
      state.resultKind = "gameover";
    };
    const clearBattlefield = () => {};
    const playSound = () => {};
    const addPopup = () => {};
    const getIsoWeekKey = () => "2026-W23";
    const setLeaderboardExpanded = (expanded) => { state.leaderboardExpanded = Boolean(expanded); };
    const renderLeaderboard = () => {};
    const loadLeaderboard = () => {};
    const syncHud = () => {};
    const syncBossActionButton = () => {};
    const showBanner = (text) => { bannerCalls.push(text); };
    const setLeaderboardStatus = () => {};
    const updateEffects = () => {};
    const updatePopups = () => {};
    const beginBossPhase = () => {};
    const updatePlayer = () => {};
    const updateCollectItems = () => {};
    const updateBossBattle = () => {};
    const updateSpecialDrop = () => {};
    const hideBanner = () => {};

    ${functions}

    return {
      state,
      syncResultOverlay,
      beginLevelClearPhase,
      showLevelClearResults,
      finishLevel,
      defeatBoss,
      update,
      restartButton,
      finalTitle,
      resultLabelPrefix,
      overlayCalls,
      collectCalls,
      endGameCalls,
      bannerCalls,
    };
  `);

  return build();
}

function createNextLevelHarness() {
  const game = readText("game.js");
  const functions = [
    "beginCollectPhase",
    "finishLevel",
    "update",
    "wireButtons",
  ].map((name) => extractNamedFunction(game, name)).join("\n\n");

  const build = new Function(`
    const MAX_LEVEL = 5;
    const ROUND_DURATION = 10;
    const state = {
      mode: "levelclear",
      phase: "results",
      level: 1,
      transitionKind: null,
      transitionTimer: 0,
      resultKind: "levelclear",
      timeLeft: 0,
      score: 300,
      levelGoal: 6,
      levelProgress: 0,
      levelScoreStart: 100,
      levelCompleteScore: 200,
      leaderboardLevel: 1,
      leaderboardSubmissionScore: 0,
      leaderboardExpanded: false,
      playerHp: 3,
      combo: 0,
      bonusUnlocked: false,
      spawnTimer: 0,
      pkaTimer: 1,
      pkaStorm: 0,
      cancelWave: 0,
      items: [],
      bossShots: [],
      playerShots: [],
      specialDrop: null,
      boss: null,
      attackCooldown: 0,
      popups: [],
      flash: 0,
      shake: 0,
      mbaFx: 0,
      speedBoost: 0,
      bannerTimer: 0,
      pausedReason: "",
      player: {
        lane: 2,
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
    const overlayCalls = [];
    const startGameCalls = [];
    const spawned = [];

    function makeElement() {
      const handlers = new Map();
      return {
        textContent: "",
        hidden: false,
        disabled: false,
        classList: { toggle: () => {} },
        setAttribute: () => {},
        addEventListener: (type, cb) => {
          handlers.set(type, cb);
        },
        trigger: (type = "click") => {
          const cb = handlers.get(type);
          if (cb) {
            cb({ preventDefault: () => {} });
          }
        },
      };
    }

    const startButton = makeElement();
    const shareButton = makeElement();
    const bossActionButton = makeElement();
    const rankingButton = makeElement();
    const leaderboardForm = makeElement();
    const leaderboardToggle = makeElement();
    const restartButton = makeElement();

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const clampLevel = (level) => clamp(Number(level) || 1, 1, MAX_LEVEL);
    const lerp = (a, b, t) => a + (b - a) * t;
    const randomRange = (min) => min;
    const getLevelGoal = (level) => 4 + clamp(level, 1, MAX_LEVEL);
    const getDifficulty = () => ({ spawnInterval: 0.25, extraSpawnChance: 0, curve: 0 });
    const getRoundProgress = () => 0;
    const getDiplomaTheme = () => ({ body: "#fff" });
    const updatePlayer = () => {};
    const updateItems = () => {};
    const updateSpecialDrop = () => {};
    const updateBossBattle = () => {};
    const updatePopups = () => {};
    const updateEffects = () => {};
    const beginBossIntroPhase = () => {};
    const beginBossPhase = () => {};
    const showLevelClearResults = () => {};
    const triggerPkaAlert = () => {};
    const syncHud = () => {};
    const clearBattlefield = () => {
      state.items.length = 0;
      state.bossShots.length = 0;
      state.playerShots.length = 0;
      state.specialDrop = null;
    };
    const showBanner = () => {};
    const setOverlay = (value) => { overlayCalls.push(value); };
    const setLeaderboardExpanded = (value) => { state.leaderboardExpanded = Boolean(value); };
    const syncResultOverlay = () => {};
    const loadLeaderboard = () => {};
    const submitLeaderboardEntry = () => {};
    const fireBook = () => {};
    const shareResult = () => {};
    const logFlow = () => {};
    const endGame = () => {
      state.mode = "gameover";
      state.phase = "results";
      state.resultKind = "gameover";
    };
    const startGame = () => {
      startGameCalls.push("start");
    };
    const spawnItem = (type) => {
      spawned.push(type);
      state.items.push({ type });
    };

    ${functions}

    return {
      state,
      wireButtons,
      update,
      restartButton,
      overlayCalls,
      spawned,
      startGameCalls,
    };
  `);

  return build();
}

test("core UI and labels are present", () => {
  const html = readText("index.html");
  assert.match(html, /KOLEGUM HUMANOOB/);
  assert.match(html, /leaderboard-toggle/);
  assert.match(html, /ranking-button/);
  assert.match(html, /hud-level/);
});

test("game loop contains boss intro, per-level leaderboard and audio hooks", () => {
  const game = readText("game.js");
  assert.match(game, /ART_ASSET_SOURCES/);
  assert.match(game, /ASSET_RENDER_CONFIG/);
  assert.match(game, /imageSmoothingEnabled = false/);
  assert.match(game, /sourceCrop/);
  assert.match(game, /assets\/player-student\.png/);
  assert.match(game, /assets\/diploma\.png/);
  assert.match(game, /assets\/book\.png/);
  assert.match(game, /assets\/newsmonth\.png/);
  assert.match(game, /assets\/renata-boss\.png/);
  assert.match(game, /assets\/MBA\.png/);
  assert.match(game, /assets\/PKA\.png/);
  assert.match(game, /assets\/lapowka\.png/);
  assert.match(game, /transitionKind/);
  assert.match(game, /beginBossIntroPhase/);
  assert.match(game, /beginLevelClearPhase/);
  assert.match(game, /showLevelClearResults/);
  assert.match(game, /console\.log\("\[FLOW\]"/);
  assert.match(game, /logFlow\("defeatBoss",/);
  assert.match(game, /logFlow\("finishLevel",/);
  assert.match(game, /logFlow\("showLevelClearResults",/);
  assert.match(game, /logFlow\("endGame",/);
  assert.match(game, /logFlow\("beginLevelClearPhase",/);
  assert.match(game, /logFlow\("restartButton\.click",/);
  assert.match(game, /playSound\("/);
  assert.match(game, /leaderboardLevel/);
  assert.match(game, /leaderboardSubmissionScore/);
  assert.match(game, /getLeaderboardScopeKey/);
  assert.match(game, /NEWSMONTH/);
  assert.match(game, /Zapisz poziom/);
  assert.match(game, /const DEV_MODE = new URLSearchParams\(window\.location\.search\)\.get\("dev"\) === "1";/);
  assert.match(game, /const ROUND_DURATION = DEV_MODE \? 10 : DURATION;/);
  assert.match(game, /state\.timeLeft = ROUND_DURATION/);
  assert.match(game, /function logFlow/);
  assert.match(game, /return clamp\(1 - state\.timeLeft \/ ROUND_DURATION, 0, 1\);/);
  assert.match(game, /if \(DEV_MODE\) \{\r?\n\s+window\.__HUMANOOB_DEV = \{ state \};\r?\n\s+\}/);
  assert.match(game, /window\.__HUMANOOB_DEV = \{ state \};/);
  assert.match(game, /timeLeft: ROUND_DURATION/);
});

test("approved assets are documented as the source of truth", () => {
  const readme = readText("README.md");
  assert.match(readme, /Zatwierdzone assety/);
  assert.match(readme, /assets\/player-student\.png/);
  assert.match(readme, /assets\/diploma\.png/);
  assert.match(readme, /assets\/book\.png/);
  assert.match(readme, /assets\/newsmonth\.png/);
  assert.match(readme, /assets\/renata-boss\.png/);
  assert.match(readme, /assets\/MBA\.png/);
  assert.match(readme, /assets\/PKA\.png/);
  assert.match(readme, /assets\/lapowka\.png/);
});

test("asset cleanup report documents the technical image handling", () => {
  const report = readText("docs/ASSET_CLEANUP_REPORT.md");
  assert.match(report, /player-student\.png/);
  assert.match(report, /MBA\.png/);
  assert.match(report, /PKA\.png/);
  assert.match(report, /lapowka\.png/);
  assert.match(report, /Finalny rozmiar/);
});

test("cloudflare backend and migration use per-level ranking", () => {
  const worker = readText("cloudflare/worker.js");
  const pagesFunction = readText("functions/api/[[path]].js");
  const migration = readText("cloudflare/migrations/0001_init.sql");
  const migration2 = readText("cloudflare/migrations/0002_level_ranking.sql");

  for (const text of [worker, pagesFunction]) {
    assert.match(text, /level/);
    assert.match(text, /week_key, level, nickname/);
  }

  assert.match(migration, /level INTEGER NOT NULL DEFAULT 1/);
  assert.match(migration, /PRIMARY KEY \(week_key, level, nickname\)/);
  assert.match(migration2, /INSERT INTO leaderboard \(week_key, level, nickname, score, updated_at\)/);
});

test("pages workflow runs smoke tests and uploads only the static site", () => {
  const workflowPath = new URL("../.github/workflows/pages.yml", import.meta.url);

  if (!existsSync(workflowPath)) {
    assert.ok(true, "Mirror repository does not ship a Pages workflow.");
    return;
  }

  const workflow = readFileSync(workflowPath, "utf8");
  assert.match(workflow, /Deploy KOLEGUM HUMANOOB to GitHub Pages/);
  assert.match(workflow, /node --test tests\/smoke\.test\.mjs/);
  assert.match(workflow, /path: \.\/_site/);
  assert.match(workflow, /cp index\.html styles\.css game\.js \.nojekyll _site\//);
});

test("level clear flow clears the overlay before advancing to the next level", () => {
  const game = readText("game.js");
  assert.match(game, /function finishLevel\(\) \{[\s\S]*?setOverlay\(null\);[\s\S]*?beginCollectPhase\(state\.level \+ 1\);/);
  assert.match(game, /restartButton\.textContent = levelClear[\s\S]*?\? \(state\.level >= MAX_LEVEL \? "Zako\u0144cz gr\u0119" : "Nast\u0119pny poziom"\)/);
  assert.match(game, /restartButton\.addEventListener\("click", \(\) => \{[\s\S]*?if \(state\.mode === "levelclear" \|\| state\.resultKind === "levelclear"\) \{[\s\S]*?finishLevel\(\);/);
});

test("boss defeat keeps levels 1-4 in levelclear and ends only on the final level", () => {
  const game = readText("game.js");
  assert.match(game, /function defeatBoss\(\) \{[\s\S]*?if \(state\.level >= MAX_LEVEL\) \{[\s\S]*?endGame\(\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?showBanner\(`Poziom \$\{state\.level\} zaliczony`, 1\.1\);[\s\S]*?beginLevelClearPhase\(\);/);
  assert.match(game, /function showLevelClearResults\(\) \{[\s\S]*?state\.mode = "levelclear";/);
  assert.match(game, /restartButton\.addEventListener\("click", \(\) => \{[\s\S]*?if \(state\.mode === "levelclear" \|\| state\.resultKind === "levelclear"\) \{[\s\S]*?finishLevel\(\);/);
  assert.match(game, /getDiplomaTheme\(level\) \{[\s\S]*?const themes = \[[\s\S]*?PALETTE\.beigeSoft[\s\S]*?#e7c2cb[\s\S]*?#d9ead2[\s\S]*?#dbe5ff[\s\S]*?#e4daf6/);
});

test("flow functions enforce levelclear vs gameover behavior", () => {
  const flow = createFlowHarness();

  flow.state.level = 1;
  flow.state.levelCompleteScore = 222;
  flow.state.score = 999;
  flow.syncResultOverlay("levelclear");
  assert.equal(flow.restartButton.textContent, "Następny poziom");
  assert.equal(flow.finalTitle.textContent, "Poziom 1 zaliczony");
  assert.equal(flow.resultLabelPrefix.textContent, "Wynik poziomu:");

  flow.syncResultOverlay("gameover");
  assert.equal(flow.restartButton.textContent, "Zagraj ponownie");

  flow.state.level = 1;
  flow.state.mode = "playing";
  flow.state.phase = "boss";
  flow.state.boss = { hp: 1 };
  flow.defeatBoss();
  assert.equal(flow.state.phase, "transition");
  assert.equal(flow.state.transitionKind, "level-clear");
  assert.equal(flow.endGameCalls.length, 0);

  flow.state.transitionTimer = 0;
  flow.update(0.016);
  assert.equal(flow.state.mode, "levelclear");
  assert.equal(flow.state.phase, "results");

  flow.finishLevel();
  assert.equal(flow.overlayCalls.at(-1), null);
  assert.deepEqual(flow.collectCalls, [2]);

  flow.state.level = 5;
  flow.state.mode = "playing";
  flow.state.phase = "boss";
  flow.state.boss = { hp: 1 };
  flow.defeatBoss();
  assert.equal(flow.state.mode, "gameover");
  assert.equal(flow.endGameCalls.length, 1);
});

test("levelclear restart click starts level 2 collect flow and spawns diplomas again", () => {
  const harness = createNextLevelHarness();
  harness.wireButtons();

  harness.restartButton.trigger("click");

  assert.equal(harness.state.mode, "playing");
  assert.equal(harness.state.phase, "collect");
  assert.equal(harness.state.level, 2);
  assert.equal(harness.state.timeLeft, 10);
  assert.equal(harness.state.transitionKind, null);
  assert.equal(harness.overlayCalls.at(-1), null);
  assert.equal(harness.startGameCalls.length, 0);

  harness.update(0.3);
  harness.update(0.3);
  assert.ok(harness.state.items.length > 0);
  assert.ok(harness.spawned.includes("diploma"));
});

