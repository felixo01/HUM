const LEADERBOARD_LIMIT = 10;

export async function onRequest(context) {
  const { request, env, params } = context;
  const path = String(params?.path || "").replace(/^\/+|\/+$/g, "");

  if (request.method === "OPTIONS") {
    return corsResponse(null, 204);
  }

  if (request.method === "GET" && (path === "" || path === "leaderboard")) {
    const url = new URL(request.url);
    const weekKey = url.searchParams.get("week") || getCurrentIsoWeekKey();
    const entries = await getLeaderboardEntries(env, weekKey);
    return jsonResponse({
      weekKey,
      entries,
    });
  }

  if (request.method === "POST" && path === "submit") {
    const payload = await readJson(request);
    const nickname = normalizeNickname(payload.nickname);
    const score = normalizeScore(payload.score);

    if (!nickname) {
      return jsonResponse({ error: "Nickname is required." }, 400);
    }

    if (score === null) {
      return jsonResponse({ error: "Score must be a number." }, 400);
    }

    const weekKey = getCurrentIsoWeekKey();

    await env.DB.prepare(
      `
        INSERT INTO leaderboard (week_key, nickname, score, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(week_key, nickname) DO UPDATE SET
          score = CASE
            WHEN excluded.score > leaderboard.score THEN excluded.score
            ELSE leaderboard.score
          END,
          updated_at = CASE
            WHEN excluded.score > leaderboard.score THEN CURRENT_TIMESTAMP
            ELSE leaderboard.updated_at
          END
      `
    )
      .bind(weekKey, nickname, score)
      .run();

    const entries = await getLeaderboardEntries(env, weekKey);
    return jsonResponse({
      ok: true,
      weekKey,
      entries,
    });
  }

  return jsonResponse({ error: "Not found." }, 404);
}

async function getLeaderboardEntries(env, weekKey) {
  const result = await env.DB.prepare(
    `
      SELECT nickname, score, updated_at
      FROM leaderboard
      WHERE week_key = ?
      ORDER BY score DESC, updated_at ASC, nickname ASC
      LIMIT ${LEADERBOARD_LIMIT}
    `
  )
    .bind(weekKey)
    .all();

  return Array.isArray(result.results) ? result.results : [];
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function normalizeNickname(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function normalizeScore(value) {
  const score = Number.parseInt(String(value), 10);
  if (!Number.isFinite(score) || score < 0) {
    return null;
  }
  return score;
}

function getCurrentIsoWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Cache-Control": "no-store",
    },
  });
}

function corsResponse(body, status = 204) {
  return new Response(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Cache-Control": "no-store",
    },
  });
}
