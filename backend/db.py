import os
import sqlite3
from typing import Iterable

DEFAULT_DB_PATH = os.getenv("IDEA_DB_PATH", os.path.join(os.getcwd(), "ideas.db"))

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ideas (
  idea_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_ideas_status
  ON ideas(status);

CREATE INDEX IF NOT EXISTS idx_ideas_body
  ON ideas(body);

CREATE TABLE IF NOT EXISTS tags (
  tag_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL DEFAULT '',
  parent_id  INTEGER REFERENCES tags(tag_id) ON DELETE SET NULL,
  UNIQUE(name, path)
);

CREATE INDEX IF NOT EXISTS idx_tags_path
  ON tags(path);

CREATE TABLE IF NOT EXISTS idea_tags (
  idea_id  INTEGER NOT NULL REFERENCES ideas(idea_id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tags(tag_id)  ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_tags_tag
  ON idea_tags(tag_id);

CREATE TABLE IF NOT EXISTS idea_blockers (
  idea_id   INTEGER NOT NULL REFERENCES ideas(idea_id) ON DELETE CASCADE,
  ord       INTEGER NOT NULL,
  text      TEXT NOT NULL,
  PRIMARY KEY (idea_id, ord)
);

CREATE TABLE IF NOT EXISTS idea_links (
  idea_id        INTEGER NOT NULL REFERENCES ideas(idea_id) ON DELETE CASCADE,
  linked_idea_id INTEGER NOT NULL REFERENCES ideas(idea_id) ON DELETE CASCADE,
  link_type      TEXT NOT NULL DEFAULT 'born_with',
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (idea_id, linked_idea_id, link_type),
  CHECK (idea_id <> linked_idea_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_links_linked
  ON idea_links(linked_idea_id, link_type);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DEFAULT_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.commit()
    finally:
        conn.close()


def fetch_all(conn: sqlite3.Connection, query: str, params: Iterable | None = None):
    cursor = conn.execute(query, params or [])
    rows = cursor.fetchall()
    cursor.close()
    return rows


def fetch_one(conn: sqlite3.Connection, query: str, params: Iterable | None = None):
    cursor = conn.execute(query, params or [])
    row = cursor.fetchone()
    cursor.close()
    return row