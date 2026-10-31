"""FX SCAN — SQLite caching layer.

Stores OHLCV data keyed by (symbol, date). Implements freshness
rules: 1-hour TTL during market hours, 24-hour TTL otherwise.
Weekend queries extend the freshness window automatically.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from typing import Any

from .config import (
    DB_PATH,
    DATA_DIR,
    CACHE_FRESH_SECONDS_MARKET_OPEN,
    CACHE_FRESH_SECONDS_MARKET_CLOSED,
    NY_TZ,
)

# ── Schema ──────────────────────────────────────────────────────────
_SCHEMA = """
CREATE TABLE IF NOT EXISTS ohlcv (
    symbol   TEXT NOT NULL,
    date     TEXT NOT NULL,
    open     REAL NOT NULL,
    high     REAL NOT NULL,
    low      REAL NOT NULL,
    close    REAL NOT NULL,
    volume   REAL,
    fetched  TEXT NOT NULL,
    PRIMARY KEY (symbol, date)
);
"""


def _init_db() -> sqlite3.Connection:
    """Create DB file and table if needed, return connection."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(_SCHEMA)
    return conn


def _is_market_open(now: datetime | None = None) -> bool:
    """Return True if FX market is currently open (Sun 5:00 PM – Fri 5:00 PM NY time).

    Uses New York timezone to automatically handle DST transitions.
    Market is closed Saturday all day, and Sunday before 5:00 PM.
    """
    if now is None:
        now = datetime.now(NY_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc).astimezone(NY_TZ)
    else:
        now = now.astimezone(NY_TZ)

    weekday = now.weekday()  # Monday=0 … Sunday=6
    # Market closed all day Saturday (5)
    if weekday == 5:
        return False
    # Market closed Sunday before 5:00 PM
    if weekday == 6 and now.hour < 17:
        return False
    return True


def is_cache_fresh(fetched_at: str, now: datetime | None = None) -> bool:
    """Check whether a cached row is still fresh.

    Parameters
    ----------
    fetched_at : ISO-8601 timestamp string (UTC).
    now : Optional override for current time (used in tests).

    Returns
    -------
    bool
        True if the cache entry has not expired.
    """
    if now is None:
        now = datetime.now(NY_TZ)
    elif now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc).astimezone(NY_TZ)
    else:
        now = now.astimezone(NY_TZ)

    fetched = datetime.fromisoformat(fetched_at)
    if fetched.tzinfo is None:
        fetched = fetched.replace(tzinfo=timezone.utc)
    age = (now - fetched).total_seconds()
    ttl = (
        CACHE_FRESH_SECONDS_MARKET_OPEN
        if _is_market_open(now)
        else CACHE_FRESH_SECONDS_MARKET_CLOSED
    )
    return age < ttl


def store(symbol: str, rows: list[dict[str, Any]]) -> None:
    """Persist OHLCV rows for *symbol* into SQLite."""
    conn = _init_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        for row in rows:
            conn.execute(
                "INSERT OR REPLACE INTO ohlcv "
                "(symbol, date, open, high, low, close, volume, fetched) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    symbol,
                    row["date"],
                    row["open"],
                    row["high"],
                    row["low"],
                    row["close"],
                    row.get("volume"),
                    now_iso,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def load(symbol: str, now: datetime | None = None) -> list[dict[str, Any]] | None:
    """Load cached OHLCV for *symbol* if still fresh.

    Returns None if cache is stale or missing.
    """
    conn = _init_db()
    try:
        cur = conn.execute(
            "SELECT date, open, high, low, close, volume, fetched "
            "FROM ohlcv WHERE symbol = ? ORDER BY date",
            (symbol,),
        )
        rows = cur.fetchall()
        if not rows:
            return None
        # Check freshness of the most recent row
        latest_fetched = rows[-1][6]
        if not is_cache_fresh(latest_fetched, now=now):
            return None
        return [
            {
                "date": r[0],
                "open": r[1],
                "high": r[2],
                "low": r[3],
                "close": r[4],
                "volume": r[5],
            }
            for r in rows
        ]
    finally:
        conn.close()


def clear() -> None:
    """Drop all cached data (useful for --force flag)."""
    conn = _init_db()
    try:
        conn.execute("DELETE FROM ohlcv")
        conn.commit()
    finally:
        conn.close()
