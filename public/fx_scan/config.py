"""FX SCAN — Configuration module.

Defines the FX pairs to scan:
  - 7 Major FX pairs
  - Yen cross pairs (all JPY crosses)
  - EUR cross pairs (all EUR crosses)

Cache freshness uses New York (Eastern) trading hours:
  - Market open: Sunday 5:00 PM ET
  - Market close: Friday 5:00 PM ET
  - Daily candle close: 5:00 PM ET
"""

from __future__ import annotations

import os
from pathlib import Path
from zoneinfo import ZoneInfo

# ── New York Timezone ───────────────────────────────────────────────
NY_TZ: ZoneInfo = ZoneInfo("America/New_York")

# ── FX Pairs (7 Majors + Yen Crosses + EUR Crosses) ─────────────────
# 7 Majors
_MAJORS: list[str] = [
    "EURUSD=X",   # Euro / US Dollar
    "GBPUSD=X",   # British Pound / US Dollar
    "USDJPY=X",   # US Dollar / Japanese Yen
    "USDCHF=X",   # US Dollar / Swiss Franc
    "AUDUSD=X",   # Australian Dollar / US Dollar
    "USDCAD=X",   # US Dollar / Canadian Dollar
    "NZDUSD=X",   # New Zealand Dollar / US Dollar
]

# Yen Crosses (6 pairs - all JPY crosses except USD/JPY which is a major)
_YEN_CROSSES: list[str] = [
    "EURJPY=X",   # Euro / Japanese Yen
    "GBPJPY=X",   # British Pound / Japanese Yen
    "AUDJPY=X",   # Australian Dollar / Japanese Yen
    "CADJPY=X",   # Canadian Dollar / Japanese Yen
    "CHFJPY=X",   # Swiss Franc / Japanese Yen
    "NZDJPY=X",   # New Zealand Dollar / Japanese Yen
]

# EUR Crosses (3 pairs - EUR crosses not already listed)
_EUR_CROSSES: list[str] = [
    "EURGBP=X",   # Euro / British Pound
    "EURCHF=X",   # Euro / Swiss Franc
    "EURAUD=X",   # Euro / Australian Dollar
]

# Combined: 7 + 6 + 3 = 16 pairs
FX_PAIRS: list[str] = _MAJORS + _YEN_CROSSES + _EUR_CROSSES

# ── Display Names ───────────────────────────────────────────────────
PAIR_NAMES: dict[str, str] = {
    "EURUSD=X": "EUR/USD", "GBPUSD=X": "GBP/USD",
    "USDJPY=X": "USD/JPY", "USDCHF=X": "USD/CHF",
    "AUDUSD=X": "AUD/USD", "USDCAD=X": "USD/CAD",
    "NZDUSD=X": "NZD/USD",
    "EURGBP=X": "EUR/GBP", "EURJPY=X": "EUR/JPY",
    "EURCHF=X": "EUR/CHF", "EURAUD=X": "EUR/AUD",
    "GBPJPY=X": "GBP/JPY",
    "AUDJPY=X": "AUD/JPY",
    "CADJPY=X": "CAD/JPY", "CHFJPY=X": "CHF/JPY",
    "NZDJPY=X": "NZD/JPY",
}

# ── Cache Freshness (New York Time) ─────────────────────────────────
# Cache is considered fresh if:
#   - During NY trading hours (Sun 5pm – Fri 5pm ET): < 1 hour old
#   - Outside trading hours / weekend: < 24 hours old
CACHE_FRESH_SECONDS_MARKET_OPEN: int = 3_600       # 1 hour
CACHE_FRESH_SECONDS_MARKET_CLOSED: int = 86_400    # 24 hours

# ── Strategy Parameters ─────────────────────────────────────────────
DEFAULT_PIP_BUFFER: float = 2.0  # pips of tolerance (kept for API compat)

# ── Paths ───────────────────────────────────────────────────────────
DATA_DIR: Path = Path(os.getenv("FX_SCAN_DATA", Path.home() / ".fx_scan"))
DB_PATH: Path = DATA_DIR / "cache.sqlite3"

# ── yfinance settings ───────────────────────────────────────────────
YF_PERIOD: str = "5d"   # fetch last 5 trading days
YF_INTERVAL: str = "1d"  # daily candles
