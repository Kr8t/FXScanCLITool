"""FX SCAN — Data fetching layer.

Uses yfinance to download daily OHLCV data for each FX pair.
Implements a cache-first strategy: if the SQLite cache is fresh,
we skip the network call entirely.

IMPORTANT: Daily FX candles close at 5pm ET (22:00 UTC). If the
current time is before that, today's bar is incomplete and must
be excluded from analysis.
"""

from __future__ import annotations

from datetime import datetime, timezone, time

import pandas as pd
import yfinance as yf

from .config import FX_PAIRS, YF_PERIOD, YF_INTERVAL
from .cache import load, store


# FX market daily candle closes at 5pm ET = 22:00 UTC
FX_DAILY_CLOSE_UTC: time = time(22, 0)


def _normalize_tz(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure the DataFrame index is UTC-normalized.

    yfinance may return tz-aware or tz-naive timestamps depending
    on the data source. We normalize everything to UTC date strings.
    """
    if df.empty:
        return df
    idx = df.index
    if hasattr(idx, "tz") and idx.tz is not None:
        idx = idx.tz_convert("UTC")
    elif hasattr(idx, "tz_localize"):
        idx = idx.tz_localize("UTC")
    df.index = idx
    return df


def _is_today_complete(now: datetime | None = None) -> bool:
    """Check if today's daily candle has completed.

    FX daily candles close at 5pm ET (22:00 UTC).
    Returns True if current time is past the daily close.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    current_time = now.time()
    return current_time >= FX_DAILY_CLOSE_UTC


def _filter_completed_candles(
    rows: list[dict],
    now: datetime | None = None,
) -> list[dict]:
    """Remove today's incomplete candle if market hasn't closed yet.

    Parameters
    ----------
    rows : List of OHLCV dicts with 'date' key in YYYY-MM-DD format.
    now : Current time (UTC). Defaults to actual current time.

    Returns
    -------
    list[dict]
        Filtered list with only completed candles.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    today_str = now.strftime("%Y-%m-%d")

    # If today's candle is complete, keep everything
    if _is_today_complete(now):
        return rows

    # Otherwise, remove today's incomplete bar
    return [r for r in rows if r["date"] != today_str]


def fetch_pair(
    symbol: str,
    force: bool = False,
    now: datetime | None = None,
) -> list[dict] | None:
    """Fetch OHLCV for a single pair.

    1. Check cache first (unless *force* is True).
    2. If cache miss or stale, download via yfinance.
    3. Filter out today's incomplete candle.
    4. Store result in cache and return list of dicts.

    Returns None on failure.
    """
    if not force:
        cached = load(symbol, now=now)
        if cached is not None:
            # Still need to filter out incomplete today bar from cache
            return _filter_completed_candles(cached, now=now)

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=YF_PERIOD, interval=YF_INTERVAL)
        if df.empty:
            return None

        df = _normalize_tz(df)
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.columns = ["open", "high", "low", "close", "volume"]
        df.index.name = "date"

        rows = []
        for ts, row in df.iterrows():
            rows.append({
                "date": ts.strftime("%Y-%m-%d"),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row["volume"]),
            })

        # Filter out today's incomplete candle
        rows = _filter_completed_candles(rows, now=now)

        if not rows:
            return None

        store(symbol, rows)
        return rows

    except Exception as exc:
        print(f"  ⚠ Error fetching {symbol}: {exc}")
        return None


def fetch_all(
    force: bool = False,
    now: datetime | None = None,
) -> dict[str, list[dict]]:
    """Fetch OHLCV for all 18 FX pairs.

    Returns a dict mapping symbol → list of OHLCV dicts.
    Only includes completed candles (excludes today's partial bar).
    """
    results: dict[str, list[dict]] = {}
    for symbol in FX_PAIRS:
        data = fetch_pair(symbol, force=force, now=now)
        if data is not None:
            results[symbol] = data
    return results
