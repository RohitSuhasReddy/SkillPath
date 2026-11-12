"""Anonymous aggregate useful/not-useful feedback, stored locally in SQLite."""
from __future__ import annotations
import os
import sqlite3
from pathlib import Path

DB_FILE = Path(os.getenv("SKILLPATH_DB", str(Path(__file__).resolve().parents[1] / "data" / "feedback.db")))

def _connect():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_FILE, timeout=5)
    conn.execute("CREATE TABLE IF NOT EXISTS feedback (resource_id TEXT NOT NULL, vote INTEGER NOT NULL CHECK(vote IN (-1, 1)))")
    return conn

def record(resource_id: str, helpful: bool):
    with _connect() as db:
        db.execute("INSERT INTO feedback(resource_id,vote) VALUES(?,?)", (resource_id, 1 if helpful else -1))

def aggregates() -> dict[str, int]:
    with _connect() as db:
        return {rid: total for rid, total in db.execute("SELECT resource_id, SUM(vote) FROM feedback GROUP BY resource_id").fetchall()}
