import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readText = (relativePath) => readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

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
  assert.match(game, /playSound\("/);
  assert.match(game, /leaderboardLevel/);
  assert.match(game, /leaderboardSubmissionScore/);
  assert.match(game, /getLeaderboardScopeKey/);
  assert.match(game, /NEWSMONTH/);
  assert.match(game, /Zapisz poziom/);
  assert.match(game, /ŻADNEJ AKREDYTACJI!/);
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
  const workflow = readText(".github/workflows/pages.yml");
  assert.match(workflow, /Deploy KOLEGUM HUMANOOB to GitHub Pages/);
  assert.match(workflow, /node --test tests\/smoke\.test\.mjs/);
  assert.match(workflow, /path: \.\/_site/);
  assert.match(workflow, /cp index\.html styles\.css game\.js \.nojekyll _site\//);
});
