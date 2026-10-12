CREATE TABLE runs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  ended_at INTEGER NOT NULL
);

CREATE INDEX runs_name_tokens ON runs (name, tokens DESC);
