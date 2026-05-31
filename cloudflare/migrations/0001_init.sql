CREATE TABLE IF NOT EXISTS leaderboard (
  week_key TEXT NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (week_key, nickname)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_score
  ON leaderboard (week_key, score DESC, updated_at ASC);
