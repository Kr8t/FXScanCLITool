"""FX SCAN — Configuration module.

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
YF_INTERVAL: str = "1d"  # daily candles
