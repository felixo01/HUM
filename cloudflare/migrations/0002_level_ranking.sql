BEGIN TRANSACTION;

ALTER TABLE leaderboard RENAME TO leaderboard_old;

CREATE TABLE leaderboard (
  week_key TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (week_key, level, nickname)
);

INSERT INTO leaderboard (week_key, level, nickname, score, updated_at)
SELECT week_key, 1, nickname, score, updated_at
FROM leaderboard_old;

CREATE INDEX IF NOT EXISTS idx_leaderboard_week_level_score
  ON leaderboard (week_key, level, score DESC, updated_at ASC);

DROP TABLE leaderboard_old;

COMMIT;
