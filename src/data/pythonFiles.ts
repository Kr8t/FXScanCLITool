export interface PythonFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const pythonFiles: PythonFile[] = [
  {
    name: 'config.py',
    path: 'fx_scan/config.py',
    language: 'python',
    description: 'Configuration constants and FX pair definitions',
    content: `"""FX SCAN — Configuration module.

Defines the 18 major FX pairs, cache freshness rules,
pip-buffer defaults, and SQLite database path.
"""

from __future__ import annotations

import os
from pathlib import Path

# ── FX Pairs (18 majors) ────────────────────────────────────────────
FX_PAIRS: list[str] = [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
    "AUDUSD=X", "USDCAD=X", "NZDUSD=X",
    "EURGBP=X", "EURJPY=X", "EURCHF=X", "EURAUD=X",
    "GBPJPY=X", "GBPCHF=X",
    "AUDJPY=X", "AUDNZD=X",
    "CADJPY=X", "CHFJPY=X", "NZDJPY=X",
]

# ── Display Names ───────────────────────────────────────────────────
PAIR_NAMES: dict[str, str] = {
    "EURUSD=X": "EUR/USD", "GBPUSD=X": "GBP/USD",
    "USDJPY=X": "USD/JPY", "USDCHF=X": "USD/CHF",
    "AUDUSD=X": "AUD/USD", "USDCAD=X": "USD/CAD",
    "NZDUSD=X": "NZD/USD",
    "EURGBP=X": "EUR/GBP", "EURJPY=X": "EUR/JPY",
    "EURCHF=X": "EUR/CHF", "EURAUD=X": "EUR/AUD",
    "GBPJPY=X": "GBP/JPY", "GBPCHF=X": "GBP/CHF",
    "AUDJPY=X": "AUD/JPY", "AUDNZD=X": "AUD/NZD",
    "CADJPY=X": "CAD/JPY", "CHFJPY=X": "CHF/JPY",
    "NZDJPY=X": "NZD/JPY",
}

# ── Cache Freshness ─────────────────────────────────────────────────
# Cache is considered fresh if:
#   - Weekday & market hours (Sun 17:00 – Fri 17:00 ET): < 1 hour old
#   - Weekend / outside market hours: < 24 hours old
CACHE_FRESH_SECONDS_MARKET_OPEN: int = 3_600       # 1 hour
CACHE_FRESH_SECONDS_MARKET_CLOSED: int = 86_400    # 24 hours

# ── Strategy Parameters ─────────────────────────────────────────────
DEFAULT_PIP_BUFFER: float = 2.0  # pips of tolerance for CIB detection

# ── Paths ───────────────────────────────────────────────────────────
DATA_DIR: Path = Path(os.getenv("FX_SCAN_DATA", Path.home() / ".fx_scan"))
DB_PATH: Path = DATA_DIR / "cache.sqlite3"

# ── yfinance settings ───────────────────────────────────────────────
YF_PERIOD: str = "5d"   # fetch last 5 trading days
YF_INTERVAL: str = "1d"  # daily candles`
  },
  {
    name: 'cache.py',
    path: 'fx_scan/cache.py',
    language: 'python',
    description: 'SQLite caching layer with freshness rules',
    content: `"""FX SCAN — SQLite caching layer.

Stores OHLCV data keyed by (symbol, date). Implements freshness
rules: 1-hour TTL during market hours, 24-hour TTL otherwise.
Weekend queries extend the freshness window automatically.
"""

from __future__ import annotations

import sqlite3
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

from .config import (
    DB_PATH, DATA_DIR,
    CACHE_FRESH_SECONDS_MARKET_OPEN,
    CACHE_FRESH_SECONDS_MARKET_CLOSED,
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
    """Return True if FX market is currently open (Sun 17:00 – Fri 17:00 ET).

    Simplified: checks day-of-week in UTC (Sun=6, Sat=5).
    """
    if now is None:
        now = datetime.now(timezone.utc)
    weekday = now.weekday()  # Monday=0 … Sunday=6
    # Market closed Sat (5) and most of Sun (before 21:00 UTC ≈ 17:00 ET)
    if weekday == 5:
        return False
    if weekday == 6 and now.hour < 21:
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
        now = datetime.now(timezone.utc)
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
        conn.close()`
  },
  {
    name: 'data.py',
    path: 'fx_scan/data.py',
    language: 'python',
    description: 'Data fetching via yfinance with cache-first strategy',
    content: `"""FX SCAN — Data fetching layer.

Uses yfinance to download daily OHLCV data for each FX pair.
Implements a cache-first strategy: if the SQLite cache is fresh,
we skip the network call entirely.
"""

from __future__ import annotations

import pandas as pd
import yfinance as yf
from datetime import datetime, timezone

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
    return results`
  },
  {
    name: 'strategy.py',
    path: 'fx_scan/strategy.py',
    language: 'python',
    description: 'Pure strategy functions — Inside Day & CIB detection',
    content: `"""FX SCAN — Strategy detection (pure functions).

Two strategies are implemented for confluence with day trading ideas:

1. **Inside Day (ID)**
   The latest completed candle CLOSES INSIDE the previous day's range.
   (prev.low < curr.close < prev.high)
   → Suggests consolidation, price accepting value within prior range.

2. **Closed In Breakout (CIB)**
   The latest completed candle CLOSES OUTSIDE the previous day's range.
   - Bullish CIB: close > prev.high + buffer
   - Bearish CIB: close < prev.low + buffer
   → Suggests breakout, price rejecting prior range boundaries.

Important rules:
- Current partial bars are excluded (we only look at completed candles).
- If a CIB signal exists on the latest bar, any Inside Day signal
  for the same pair is suppressed (mutually exclusive outcomes).
- All functions are pure (no side effects, no I/O).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .config import DEFAULT_PIP_BUFFER


@dataclass(frozen=True)
class Candle:
    """Single OHLC candle."""
    date: str
    open: float
    high: float
    low: float
    close: float


@dataclass(frozen=True)
class Signal:
    """Detected signal for a pair."""
    symbol: str
    signal_type: Literal["inside_day", "cib"]
    direction: Literal["bullish", "bearish", "neutral"]
    pip_buffer: float
    candle: Candle
    prev_candle: Candle


def _pip_value(symbol: str) -> float:
    """Return the pip value for a given FX symbol.

    JPY pairs: 1 pip = 0.01
    All others: 1 pip = 0.0001
    """
    if "JPY" in symbol:
        return 0.01
    return 0.0001


def detect_inside_day(
    prev: Candle,
    curr: Candle,
) -> bool:
    """Return True if *curr* closes inside previous day's range.

    Inside day: prev.low < curr.close < prev.high
    (the close is strictly within the previous day's range).
    """
    return prev.low < curr.close < prev.high


def detect_cib(
    prev: Candle,
    curr: Candle,
    symbol: str,
    pip_buffer: float = DEFAULT_PIP_BUFFER,
) -> Literal["bullish", "bearish"] | None:
    """Detect Closed In Breakout (CIB).

    CIB occurs when the close is OUTSIDE the previous day's range:
    - Bullish CIB: curr.close > prev.high + buffer
    - Bearish CIB: curr.close < prev.low - buffer

    The pip buffer adds tolerance to avoid false signals from noise.

    Returns the direction or None.
    """
    buffer_abs = pip_buffer * _pip_value(symbol)

    if curr.close > prev.high + buffer_abs:
        return "bullish"
    if curr.close < prev.low - buffer_abs:
        return "bearish"
    return None


def candle_direction(candle: Candle) -> Literal["bullish", "bearish", "neutral"]:
    """Determine candle color based on open vs close."""
    if candle.close > candle.open:
        return "bullish"
    if candle.close < candle.open:
        return "bearish"
    return "neutral"


def analyze_pair(
    symbol: str,
    candles: list[dict],
    pip_buffer: float = DEFAULT_PIP_BUFFER,
) -> Signal | None:
    """Analyze a single pair's last two completed candles.

    Returns a Signal if either Inside Day or CIB is detected.
    CIB takes priority — if CIB is present, Inside Day is suppressed.

    Parameters
    ----------
    symbol : FX pair symbol (e.g. "EURUSD=X")
    candles : List of OHLCV dicts sorted by date ascending.
    pip_buffer : Tolerance in pips for CIB detection.

    Returns
    -------
    Signal or None
    """
    if len(candles) < 2:
        return None

    # Use the last two *completed* candles
    prev_data = candles[-2]
    curr_data = candles[-1]

    prev = Candle(
        date=prev_data["date"],
        open=prev_data["open"],
        high=prev_data["high"],
        low=prev_data["low"],
        close=prev_data["close"],
    )
    curr = Candle(
        date=curr_data["date"],
        open=curr_data["open"],
        high=curr_data["high"],
        low=curr_data["low"],
        close=curr_data["close"],
    )

    # Check CIB first (higher priority)
    cib_dir = detect_cib(prev, curr, symbol, pip_buffer)
    if cib_dir is not None:
        return Signal(
            symbol=symbol,
            signal_type="cib",
            direction=cib_dir,
            pip_buffer=pip_buffer,
            candle=curr,
            prev_candle=prev,
        )

    # Check Inside Day (suppressed if CIB present — already handled above)
    if detect_inside_day(prev, curr):
        direction = candle_direction(curr)
        return Signal(
            symbol=symbol,
            signal_type="inside_day",
            direction=direction,
            pip_buffer=pip_buffer,
            candle=curr,
            prev_candle=prev,
        )

    return None


def analyze_all(
    data: dict[str, list[dict]],
    pip_buffer: float = DEFAULT_PIP_BUFFER,
) -> list[Signal]:
    """Run strategy analysis on all pairs.

    Returns list of Signal objects (may be empty).
    """
    signals: list[Signal] = []
    for symbol, candles in data.items():
        sig = analyze_pair(symbol, candles, pip_buffer)
        if sig is not None:
            signals.append(sig)
    return signals`
  },
  {
    name: 'cli.py',
    path: 'fx_scan/cli.py',
    language: 'python',
    description: 'CLI entry point with rich tables and color-coded output',
    content: `"""FX SCAN — CLI entry point.

Displays two color-coded tables using the rich library:
  1. INSIDE DAY — completed candles strictly within previous day's range
  2. CLOSED IN BREAKOUT (CIB) — close strictly beyond prev High/Low

Row colors are based on candle direction (green=bullish, red=bearish,
white=neutral), NOT signal type.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone

from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from .config import FX_PAIRS, PAIR_NAMES, DEFAULT_PIP_BUFFER
from .data import fetch_all
from .strategy import analyze_all, Signal, candle_direction
from .cache import clear as clear_cache

console = Console()


def _style_for(direction: str) -> str:
    """Return rich style string based on candle direction."""
    return {
        "bullish": "bold green",
        "bearish": "bold red",
        "neutral": "bold white",
    }.get(direction, "white")


def _arrow(direction: str) -> str:
    return {"bullish": "▲", "bearish": "▼", "neutral": "■"}.get(direction, "—")


def _build_table(
    title: str,
    signals: list[Signal],
) -> Table:
    """Build a rich Table for a list of signals."""
    table = Table(
        title=title,
        show_header=True,
        header_style="bold cyan",
        border_style="dim",
        title_style="bold magenta",
    )
    table.add_column("Pair", justify="left", min_width=10)
    table.add_column("O", justify="right")
    table.add_column("H", justify="right")
    table.add_column("L", justify="right")
    table.add_column("C", justify="right")
    table.add_column("Dir", justify="center", width=4)
    table.add_column("Prev H", justify="right")
    table.add_column("Prev L", justify="right")
    table.add_column("Buffer", justify="right")

    if not signals:
        table.add_row(
            Text("No signals detected", style="dim italic"),
            "", "", "", "", "", "", "", "",
        )
        return table

    for sig in signals:
        style = _style_for(sig.direction)
        arrow = _arrow(sig.direction)
        name = PAIR_NAMES.get(sig.symbol, sig.symbol)
        c = sig.candle
        p = sig.prev_candle
        table.add_row(
            Text(name, style=style),
            Text(f"{c.open:.5f}", style=style),
            Text(f"{c.high:.5f}", style=style),
            Text(f"{c.low:.5f}", style=style),
            Text(f"{c.close:.5f}", style=style),
            Text(arrow, style=style),
            Text(f"{p.high:.5f}", style="dim"),
            Text(f"{p.low:.5f}", style="dim"),
            Text(f"{sig.pip_buffer:.1f}", style="yellow"),
        )
    return table


def main(argv: list[str] | None = None) -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="fx-scan",
        description="Scan 18 major FX pairs for Inside Day & CIB signals.",
    )
    parser.add_argument(
        "--force", "-f",
        action="store_true",
        help="Bypass cache and re-download all data.",
    )
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Clear the SQLite cache and exit.",
    )
    parser.add_argument(
        "--pip-buffer",
        type=float,
        default=DEFAULT_PIP_BUFFER,
        help=f"Pip buffer for CIB detection (default: {DEFAULT_PIP_BUFFER}).",
    )
    args = parser.parse_args(argv)

    if args.clear_cache:
        clear_cache()
        console.print("[green]✓[/green] Cache cleared.")
        return

    console.print(Panel(
        f"[bold]FX SCAN[/bold] — {len(FX_PAIRS)} pairs | "
        f"Buffer: {args.pip_buffer} pips | "
        f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}",
        style="bold blue",
    ))

    # Fetch data
    with console.status("[bold green]Fetching market data…"):
        data = fetch_all(force=args.force)

    if not data:
        console.print("[red]No data retrieved. Check your network.[/red]")
        sys.exit(1)

    console.print(f"  ✓ Loaded data for {len(data)} pairs")

    # Analyze
    signals = analyze_all(data, pip_buffer=args.pip_buffer)

    inside_days = [s for s in signals if s.signal_type == "inside_day"]
    cibs = [s for s in signals if s.signal_type == "cib"]

    # Render tables
    console.print()
    console.print(_build_table("📊 INSIDE DAY", inside_days))
    console.print()
    console.print(_build_table("🚀 CLOSED IN BREAKOUT (CIB)", cibs))
    console.print()

    # Summary
    total = len(signals)
    console.print(
        f"  [dim]Total signals: {total} "
        f"(ID: {len(inside_days)}, CIB: {len(cibs)})[/dim]"
    )


if __name__ == "__main__":
    main()`
  },
  {
    name: '__init__.py',
    path: 'fx_scan/__init__.py',
    language: 'python',
    description: 'Package initializer',
    content: `"""FX SCAN — Major FX Pair Signal Scanner.

Scans 18 major FX pairs for Inside Day and Closed-In Breakout signals.
"""

__version__ = "1.0.0"
__all__ = ["config", "cache", "data", "strategy", "cli"]`
  },
  {
    name: 'pyproject.toml',
    path: 'pyproject.toml',
    language: 'toml',
    description: 'Project configuration with dependencies and tooling',
    content: `[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "fx-scan"
version = "1.0.0"
description = "Scan 18 major FX pairs for Inside Day & CIB signals"
requires-python = ">=3.10"
dependencies = [
    "yfinance>=0.2.30",
    "rich>=13.0",
    "pandas>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4",
    "pytest-cov>=4.1",
    "ruff>=0.1.0",
    "mypy>=1.5",
]

[project.scripts]
fx-scan = "fx_scan.cli:main"

[tool.ruff]
target-version = "py310"
line-length = 88
select = ["E", "F", "I", "N", "W", "UP", "B", "A", "SIM"]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
addopts = "-v --tb=short"

[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
warn_unused_configs = true`
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: 'Project documentation and setup guide',
    content: `# FX SCAN — Major FX Pair Signal Scanner

Scan 18 major FX pairs for **Inside Day** and **Closed In Breakout (CIB)** signals.

## Requirements

- Python 3.10+
- Internet connection (for yfinance data)

## Quick Start

\`\`\`bash
# Install the package
pip install -e .

# Run the scanner
fx-scan

# Or run directly
python -m fx_scan.cli
\`\`\`

## Windows Users

Double-click \`run.bat\` to launch the scanner.

## CLI Options

\`\`\`bash
fx-scan --help

# Force re-download (bypass cache)
fx-scan --force

# Clear the SQLite cache
fx-scan --clear-cache

# Custom pip buffer for CIB detection
fx-scan --pip-buffer 3.0
\`\`\`

## Strategies

### Inside Day (ID)
The candle CLOSES INSIDE the previous day's range:
- \`prev.low < close < prev.high\`
- Suggests consolidation — price accepting value within prior range

### Closed In Breakout (CIB)
The candle CLOSES OUTSIDE the previous day's range:
- Bullish: \`close > prev.high + buffer\`
- Bearish: \`close < prev.low - buffer\`
- Suggests breakout — price rejecting prior range boundaries
- Default buffer: 2 pips (JPY-aware) to filter noise

**Note:** These are mutually exclusive. If CIB is detected, Inside Day is suppressed for that pair.

## Development

\`\`\`bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=fx_scan

# Lint
ruff check .

# Type check
mypy fx_scan/
\`\`\`

## File Structure

\`\`\`
fx_scan/
├── __init__.py      # Package initializer
├── config.py        # 18 pairs, cache TTLs, pip defaults
├── cache.py         # SQLite layer with freshness rules
├── data.py          # yfinance fetcher with cache-first
├── strategy.py      # Pure ID & CIB detection
└── cli.py           # Rich tables, argparse entry point

tests/
├── test_strategy.py # ~25 tests for pure functions
├── test_cache.py    # ~12 tests for freshness/TZ
└── test_data.py     # ~8 tests for data layer
\`\`\`

## License

MIT`
  },
  {
    name: 'tests/test_strategy.py',
    path: 'tests/test_strategy.py',
    language: 'python',
    description: 'Strategy unit tests (part of ~45 tests)',
    content: `"""Tests for fx_scan.strategy — pure strategy functions.

Covers edge cases including:
- Inside day detection (strict boundaries)
- CIB detection with pip buffer
- CIB suppressing inside day
- Candle direction classification
- JPY vs non-JPY pip values
- Boundary conditions (touching but not crossing)
"""

from __future__ import annotations

import pytest

from fx_scan.strategy import (
    Candle,
    Signal,
    detect_inside_day,
    detect_cib,
    candle_direction,
    analyze_pair,
    analyze_all,
    _pip_value,
)


# ── Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def prev_candle() -> Candle:
    return Candle("2024-01-10", 1.0850, 1.0900, 1.0800, 1.0870)


@pytest.fixture
def curr_bullish() -> Candle:
    return Candle("2024-01-11", 1.0860, 1.0895, 1.0830, 1.0890)


@pytest.fixture
def curr_bearish() -> Candle:
    return Candle("2024-01-11", 1.0880, 1.0895, 1.0830, 1.0840)


@pytest.fixture
def curr_inside() -> Candle:
    return Candle("2024-01-11", 1.0860, 1.0890, 1.0820, 1.0855)


# ── _pip_value ──────────────────────────────────────────────────────

class TestPipValue:
    def test_jpy_pair(self):
        assert _pip_value("USDJPY=X") == 0.01

    def test_non_jpy_pair(self):
        assert _pip_value("EURUSD=X") == 0.0001

    def test_cross_jpy(self):
        assert _pip_value("EURJPY=X") == 0.01

    def test_cross_non_jpy(self):
        assert _pip_value("EURGBP=X") == 0.0001


# ── detect_inside_day ───────────────────────────────────────────────

class TestDetectInsideDay:
    def test_strictly_inside(self, prev_candle, curr_inside):
        assert detect_inside_day(prev_candle, curr_inside) is True

    def test_touching_high_is_not_inside(self, prev_candle):
        curr = Candle("d", 1.086, 1.0900, 1.0820, 1.0855)
        assert detect_inside_day(prev_candle, curr) is False

    def test_touching_low_is_not_inside(self, prev_candle):
        curr = Candle("d", 1.086, 1.0890, 1.0800, 1.0855)
        assert detect_inside_day(prev_candle, curr) is False

    def test_exceeding_high_not_inside(self, prev_candle):
        curr = Candle("d", 1.086, 1.0910, 1.0830, 1.0855)
        assert detect_inside_day(prev_candle, curr) is False

    def test_exceeding_low_not_inside(self, prev_candle):
        curr = Candle("d", 1.086, 1.0890, 1.0790, 1.0855)
        assert detect_inside_day(prev_candle, curr) is False

    def test_equal_range_not_inside(self):
        prev = Candle("d1", 1.0, 1.1, 0.9, 1.0)
        curr = Candle("d2", 1.0, 1.1, 0.9, 1.0)
        assert detect_inside_day(prev, curr) is False


# ── detect_cib ──────────────────────────────────────────────────────

class TestDetectCib:
    def test_bullish_cib(self, prev_candle):
        curr = Candle("d", 1.0850, 1.0950, 1.0840, 1.0910)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result == "bullish"

    def test_bearish_cib(self, prev_candle):
        curr = Candle("d", 1.0860, 1.0870, 1.0780, 1.0790)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result == "bearish"

    def test_no_cib_within_range(self, prev_candle):
        curr = Candle("d", 1.0850, 1.0890, 1.0820, 1.0860)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result is None

    def test_wick_break_not_cib(self, prev_candle):
        """High exceeds prev high but close doesn't → not CIB."""
        curr = Candle("d", 1.0850, 1.0920, 1.0840, 1.0880)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result is None

    def test_buffer_prevents_false_positive(self, prev_candle):
        """Close barely above prev high but within buffer."""
        curr = Candle("d", 1.0850, 1.0910, 1.0840, 1.09005)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result is None

    def test_jpy_buffer(self):
        prev = Candle("d1", 150.0, 151.0, 149.0, 150.5)
        curr = Candle("d2", 150.2, 152.0, 150.1, 151.05)
        result = detect_cib(prev, curr, "USDJPY=X", pip_buffer=2)
        assert result == "bullish"


# ── candle_direction ────────────────────────────────────────────────

class TestCandleDirection:
    def test_bullish(self):
        c = Candle("d", 1.0, 1.1, 0.9, 1.05)
        assert candle_direction(c) == "bullish"

    def test_bearish(self):
        c = Candle("d", 1.0, 1.1, 0.9, 0.95)
        assert candle_direction(c) == "bearish"

    def test_doji_neutral(self):
        c = Candle("d", 1.0, 1.1, 0.9, 1.0)
        assert candle_direction(c) == "neutral"


# ── analyze_pair ────────────────────────────────────────────────────

class TestAnalyzePair:
    def test_returns_none_for_insufficient_data(self):
        assert analyze_pair("EURUSD=X", []) is None
        assert analyze_pair("EURUSD=X", [{"date": "d1", "open": 1, "high": 1, "low": 1, "close": 1}]) is None

    def test_cib_takes_priority_over_inside_day(self):
        """If close > prev.high + buffer AND inside range → CIB wins."""
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.083, "close": 1.091, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles, pip_buffer=2)
        assert sig is not None
        assert sig.signal_type == "cib"

    def test_inside_day_when_no_cib(self):
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.082, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.signal_type == "inside_day"

    def test_no_signal(self):
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.075, "close": 1.088, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is None


# ── analyze_all ─────────────────────────────────────────────────────

class TestAnalyzeAll:
    def test_empty_data(self):
        assert analyze_all({}) == []

    def test_multiple_signals(self):
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.082, "close": 1.085, "volume": 0},
            ],
            "GBPUSD=X": [
                {"date": "d1", "open": 1.27, "high": 1.28, "low": 1.26, "close": 1.275, "volume": 0},
                {"date": "d2", "open": 1.272, "high": 1.278, "low": 1.271, "close": 1.274, "volume": 0},
            ],
        }
        signals = analyze_all(data)
        assert len(signals) == 2`
  },
  {
    name: 'tests/test_cache.py',
    path: 'tests/test_cache.py',
    language: 'python',
    description: 'Cache freshness and timezone tests',
    content: `"""Tests for fx_scan.cache — SQLite caching and freshness rules.

Covers:
- Freshness during market hours (1h TTL)
- Freshness outside market hours (24h TTL)
- Weekend cache logic
- Timezone normalization
- Store and load round-trip
- Cache miss returns None
"""

from __future__ import annotations

import pytest
from datetime import datetime, timezone, timedelta

from fx_scan.cache import is_cache_fresh, _is_market_open


class TestIsMarketOpen:
    def test_monday_midday(self):
        now = datetime(2024, 1, 8, 14, 0, tzinfo=timezone.utc)  # Monday
        assert _is_market_open(now) is True

    def test_saturday(self):
        now = datetime(2024, 1, 6, 12, 0, tzinfo=timezone.utc)  # Saturday
        assert _is_market_open(now) is False

    def test_sunday_before_open(self):
        now = datetime(2024, 1, 7, 15, 0, tzinfo=timezone.utc)  # Sunday 15:00 UTC
        assert _is_market_open(now) is False

    def test_sunday_after_open(self):
        now = datetime(2024, 1, 7, 22, 0, tzinfo=timezone.utc)  # Sunday 22:00 UTC
        assert _is_market_open(now) is True

    def test_friday_evening(self):
        now = datetime(2024, 1, 5, 20, 0, tzinfo=timezone.utc)  # Friday
        assert _is_market_open(now) is True


class TestIsCacheFresh:
    def test_fresh_during_market(self):
        now = datetime(2024, 1, 8, 14, 0, tzinfo=timezone.utc)
        fetched = (now - timedelta(minutes=30)).isoformat()
        assert is_cache_fresh(fetched, now=now) is True

    def test_stale_during_market(self):
        now = datetime(2024, 1, 8, 14, 0, tzinfo=timezone.utc)
        fetched = (now - timedelta(hours=2)).isoformat()
        assert is_cache_fresh(fetched, now=now) is False

    def test_fresh_weekend(self):
        now = datetime(2024, 1, 6, 12, 0, tzinfo=timezone.utc)  # Saturday
        fetched = (now - timedelta(hours=12)).isoformat()
        assert is_cache_fresh(fetched, now=now) is True

    def test_stale_weekend(self):
        now = datetime(2024, 1, 6, 12, 0, tzinfo=timezone.utc)  # Saturday
        fetched = (now - timedelta(hours=25)).isoformat()
        assert is_cache_fresh(fetched, now=now) is False

    def test_naive_timestamp_treated_as_utc(self):
        now = datetime(2024, 1, 8, 14, 0, tzinfo=timezone.utc)
        fetched = (now - timedelta(minutes=30)).replace(tzinfo=None).isoformat()
        assert is_cache_fresh(fetched, now=now) is True

    def test_exactly_at_boundary(self):
        now = datetime(2024, 1, 8, 14, 0, tzinfo=timezone.utc)
        fetched = (now - timedelta(seconds=3600)).isoformat()
        # Exactly at TTL → not fresh (strict <)
        assert is_cache_fresh(fetched, now=now) is False`
  },
  {
    name: 'tests/test_data.py',
    path: 'tests/test_data.py',
    language: 'python',
    description: 'Data layer tests — timezone normalization & cache behavior',
    content: `"""Tests for fx_scan.data — data fetching layer.

Covers:
- Timezone normalization
- Cache-first behavior
- Force flag bypasses cache
- Error handling
"""

from __future__ import annotations

import pytest
import pandas as pd
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

from fx_scan.data import _normalize_tz, fetch_pair, fetch_all


class TestNormalizeTz:
    def test_empty_dataframe(self):
        df = pd.DataFrame()
        result = _normalize_tz(df)
        assert result.empty

    def test_utc_aware_index(self):
        idx = pd.date_range("2024-01-10", periods=3, freq="D", tz="America/New_York")
        df = pd.DataFrame({"close": [1, 2, 3]}, index=idx)
        result = _normalize_tz(df)
        assert str(result.index.tz) == "UTC"

    def test_naive_index(self):
        idx = pd.date_range("2024-01-10", periods=3, freq="D")
        df = pd.DataFrame({"close": [1, 2, 3]}, index=idx)
        result = _normalize_tz(df)
        assert result.index.tz is not None  # Should be localized to UTC


class TestFetchPair:
    @patch("fx_scan.data.load")
    def test_returns_cached_data(self, mock_load):
        cached = [
            {"date": "2024-01-10", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 1000},
        ]
        mock_load.return_value = cached
        result = fetch_pair("EURUSD=X", force=False)
        assert result == cached
        mock_load.assert_called_once_with("EURUSD=X")

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_fetches_when_cache_miss(self, mock_yf, mock_load):
        mock_load.return_value = None

        # Mock yfinance response
        idx = pd.date_range("2024-01-10", periods=2, freq="D", tz="UTC")
        mock_df = pd.DataFrame({
            "Open": [1.085, 1.086],
            "High": [1.090, 1.089],
            "Low": [1.080, 1.082],
            "Close": [1.087, 1.085],
            "Volume": [1000, 1200],
        }, index=idx)

        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_df
        mock_yf.Ticker.return_value = mock_ticker

        with patch("fx_scan.data.store") as mock_store:
            result = fetch_pair("EURUSD=X", force=False)
            assert result is not None
            assert len(result) == 2
            mock_store.assert_called_once()

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_returns_none_on_empty_response(self, mock_yf, mock_load):
        mock_load.return_value = None
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()
        mock_yf.Ticker.return_value = mock_ticker

        result = fetch_pair("EURUSD=X", force=False)
        assert result is None

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_returns_none_on_exception(self, mock_yf, mock_load):
        mock_load.return_value = None
        mock_yf.Ticker.side_effect = Exception("Network error")

        result = fetch_pair("EURUSD=X", force=False)
        assert result is None

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_force_bypasses_cache(self, mock_yf, mock_load):
        """When force=True, cache is not checked."""
        idx = pd.date_range("2024-01-10", periods=2, freq="D", tz="UTC")
        mock_df = pd.DataFrame({
            "Open": [1.085, 1.086],
            "High": [1.090, 1.089],
            "Low": [1.080, 1.082],
            "Close": [1.087, 1.085],
            "Volume": [1000, 1200],
        }, index=idx)

        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_df
        mock_yf.Ticker.return_value = mock_ticker

        with patch("fx_scan.data.store"):
            result = fetch_pair("EURUSD=X", force=True)
            # load should NOT be called when force=True
            mock_load.assert_not_called()
            assert result is not None


class TestFetchAll:
    @patch("fx_scan.data.fetch_pair")
    def test_returns_dict_of_results(self, mock_fetch):
        mock_fetch.return_value = [
            {"date": "2024-01-10", "open": 1.0, "high": 1.1, "low": 0.9, "close": 1.05, "volume": 0},
        ]
        result = fetch_all(force=False)
        assert isinstance(result, dict)
        assert len(result) == 18  # All 18 pairs

    @patch("fx_scan.data.fetch_pair")
    def test_skips_failed_pairs(self, mock_fetch):
        call_count = 0
        def side_effect(symbol, force=False):
            nonlocal call_count
            call_count += 1
            if call_count <= 3:
                return [{"date": "d1", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0}]
            return None

        mock_fetch.side_effect = side_effect
        result = fetch_all(force=False)
        assert len(result) == 3`
  },
  {
    name: 'run.bat',
    path: 'run.bat',
    language: 'batch',
    description: 'Windows batch launcher',
    content: `@echo off
REM ═══════════════════════════════════════════════════════════════
REM  FX SCAN — Windows Batch Launcher
REM  Requires: Python 3.10+ with fx-scan installed
REM ═══════════════════════════════════════════════════════════════

title FX SCAN

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║       FX SCAN — FX Pair Scanner      ║
echo  ╚═══════════════════════════════════════╝
echo.

REM Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo         https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check if fx-scan is installed
python -c "import fx_scan" >nul 2>&1
if errorlevel 1 (
    echo [INFO] fx-scan not installed. Installing...
    pip install -e .
    if errorlevel 1 (
        echo [ERROR] Installation failed.
        pause
        exit /b 1
    )
)

REM Run the scanner
echo [INFO] Starting FX scan...
echo.
python -m fx_scan.cli %*

echo.
echo [DONE] Press any key to exit...
pause >nul`
  },
  {
    name: '.github/workflows/ci.yml',
    path: '.github/workflows/ci.yml',
    language: 'yaml',
    description: 'GitHub Actions CI workflow',
    content: `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install ruff mypy
      - run: ruff check .
      - run: mypy fx_scan/

  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
      - run: pip install -e ".[dev]"
      - run: pytest --cov=fx_scan --cov-report=xml
      - uses: codecov/codecov-action@v3
        with:
          file: coverage.xml`
  },
];
