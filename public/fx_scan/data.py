"""FX SCAN — Data fetching layer.

Uses yfinance to download daily OHLCV data for each FX pair.
Implements a cache-first strategy: if the SQLite cache is fresh,
we skip the network call entirely.
"""

from __future__ import annotations

import pandas as pd
import yfinance as yf

from .config import FX_PAIRS, YF_PERIOD, YF_INTERVAL
from .cache import load, store


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


def fetch_pair(symbol: str, force: bool = False) -> list[dict] | None:
    """Fetch OHLCV for a single pair.

    1. Check cache first (unless *force* is True).
    2. If cache miss or stale, download via yfinance.
    3. Store result in cache and return list of dicts.

    Returns None on failure.
    """
    if not force:
        cached = load(symbol)
        if cached is not None:
            return cached

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

        store(symbol, rows)
        return rows

    except Exception as exc:
        print(f"  ⚠ Error fetching {symbol}: {exc}")
        return None


def fetch_all(force: bool = False) -> dict[str, list[dict]]:
    """Fetch OHLCV for all 18 FX pairs.

    Returns a dict mapping symbol → list of OHLCV dicts.
    """
    results: dict[str, list[dict]] = {}
    for symbol in FX_PAIRS:
        data = fetch_pair(symbol, force=force)
        if data is not None:
            results[symbol] = data
    return results
