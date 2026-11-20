"""Persistent SQLite-backed Offline Queue for Edge Agent."""

from contextlib import contextmanager
import json
import os
import sqlite3
import time
from typing import Any, Dict, List, Optional


class PersistentOfflineQueue:
    """Thread-safe SQLite persistent queue ensuring zero data loss during cloud outages."""

    def __init__(self, db_path: str = "edge_agent_queue.db"):
        self.db_path = db_path
        self._init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self) -> None:
        """Create table and indexes if not already present."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS offline_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'pending'
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_queue_status_id ON offline_queue(status, id)")
            conn.commit()

    def enqueue(self, category: str, payload: Dict[str, Any]) -> int:
        """Persist an approved metadata record to the offline queue."""
        payload_str = json.dumps(payload)
        now = time.time()
        with self._get_connection() as conn:
            cur = conn.execute(
                """
                INSERT INTO offline_queue (category, payload_json, created_at, retry_count, status)
                VALUES (?, ?, ?, 0, 'pending')
                """,
                (category, payload_str, now),
            )
            conn.commit()
            return cur.lastrowid

    def peek_batch(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve up to `limit` pending items for export without removing them."""
        with self._get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, category, payload_json, retry_count, created_at
                FROM offline_queue
                WHERE status = 'pending'
                ORDER BY id ASC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

            batch = []
            for r in rows:
                try:
                    payload = json.loads(r["payload_json"])
                except Exception:
                    payload = {}
                batch.append({
                    "queue_id": r["id"],
                    "category": r["category"],
                    "payload": payload,
                    "retry_count": r["retry_count"],
                    "created_at": r["created_at"],
                })
            return batch

    def ack(self, queue_ids: List[int]) -> int:
        """Remove confirmed exported items from the queue."""
        if not queue_ids:
            return 0
        placeholders = ",".join("?" for _ in queue_ids)
        with self._get_connection() as conn:
            cur = conn.execute(
                f"DELETE FROM offline_queue WHERE id IN ({placeholders})",
                queue_ids,
            )
            conn.commit()
            return cur.rowcount

    def nack(self, queue_ids: List[int]) -> None:
        """Increment retry count on failed export attempts."""
        if not queue_ids:
            return
        placeholders = ",".join("?" for _ in queue_ids)
        with self._get_connection() as conn:
            conn.execute(
                f"""
                UPDATE offline_queue
                SET retry_count = retry_count + 1
                WHERE id IN ({placeholders})
                """,
                queue_ids,
            )
            conn.commit()

    def pending_count(self) -> int:
        """Return total number of pending items awaiting synchronization."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM offline_queue WHERE status = 'pending'"
            ).fetchone()
            return row["cnt"] if row else 0

    def clear(self) -> None:
        """Purge all queue records (testing utility)."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM offline_queue")
            conn.commit()
