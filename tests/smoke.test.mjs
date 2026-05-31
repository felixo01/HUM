import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readText = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("core UI and labels are present", () => {
  const html = readText("index.html");
  assert.match(html, /KOLEGA HUMANOOB/);
  assert.match(html, /leaderboard-toggle/);
  assert.match(html, /ranking-button/);
  assert.match(html, /hud-level/);
});

test("game loop contains boss intro, per-level leaderboard and audio hooks", () => {
  const game = readText("game.js");
  assert.match(game, /transitionKind/);
  assert.match(game, /beginBossIntroPhase/);
  assert.match(game, /beginLevelClearPhase/);
  assert.match(game, /showLevelClearResults/);
  assert.match(game, /playSound\("/);
  assert.match(game, /leaderboardLevel/);
  assert.match(game, /leaderboardSubmissionScore/);
  assert.match(game, /getLeaderboardScopeKey/);
  assert.match(game, /NEWSMONTH/);
  assert.match(game, /Zapisz poziom/);
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
  const workflow = readText(".github/workflows/pages.yml");
  assert.match(workflow, /Deploy KOLEGA HUMANOOB to GitHub Pages/);
  assert.match(workflow, /node --test tests\/smoke\.test\.mjs/);
  assert.match(workflow, /path: \.\/_site/);
  assert.match(workflow, /cp index\.html styles\.css game\.js \.nojekyll _site\//);
});
