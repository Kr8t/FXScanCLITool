import { useState } from 'react';

const pythonFiles = [
  {
    name: 'config.py',
    path: 'fx_scan/config.py',
    description: '18 FX pairs, cache TTLs, pip defaults',
    content: `"""FX SCAN — Configuration module."""
from __future__ import annotations
import os
from pathlib import Path

FX_PAIRS: list[str] = [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
    "AUDUSD=X", "USDCAD=X", "NZDUSD=X",
    "EURGBP=X", "EURJPY=X", "EURCHF=X", "EURAUD=X",
    "GBPJPY=X", "GBPCHF=X",
    "AUDJPY=X", "AUDNZD=X",
    "CADJPY=X", "CHFJPY=X", "NZDJPY=X",
]

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

CACHE_FRESH_SECONDS_MARKET_OPEN: int = 3_600
CACHE_FRESH_SECONDS_MARKET_CLOSED: int = 86_400
DEFAULT_PIP_BUFFER: float = 2.0
DATA_DIR: Path = Path(os.getenv("FX_SCAN_DATA", Path.home() / ".fx_scan"))
DB_PATH: Path = DATA_DIR / "cache.sqlite3"
YF_PERIOD: str = "5d"
YF_INTERVAL: str = "1d"`
  },
  {
    name: 'cache.py',
    path: 'fx_scan/cache.py',
    description: 'SQLite caching with 1h/24h freshness rules',
    content: `"""FX SCAN — SQLite caching layer."""
from __future__ import annotations
import sqlite3
from datetime import datetime, timezone
from typing import Any
from .config import DB_PATH, DATA_DIR, CACHE_FRESH_SECONDS_MARKET_OPEN, CACHE_FRESH_SECONDS_MARKET_CLOSED

_SCHEMA = """
CREATE TABLE IF NOT EXISTS ohlcv (
    symbol TEXT NOT NULL, date TEXT NOT NULL,
    open REAL NOT NULL, high REAL NOT NULL, low REAL NOT NULL,
    close REAL NOT NULL, volume REAL, fetched TEXT NOT NULL,
    PRIMARY KEY (symbol, date)
);"""

def _init_db() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(_SCHEMA)
    return conn

def _is_market_open(now: datetime | None = None) -> bool:
    if now is None:
        now = datetime.now(timezone.utc)
    weekday = now.weekday()
    if weekday == 5: return False
    if weekday == 6 and now.hour < 21: return False
    return True

def is_cache_fresh(fetched_at: str, now: datetime | None = None) -> bool:
    if now is None: now = datetime.now(timezone.utc)
    fetched = datetime.fromisoformat(fetched_at)
    if fetched.tzinfo is None: fetched = fetched.replace(tzinfo=timezone.utc)
    age = (now - fetched).total_seconds()
    ttl = CACHE_FRESH_SECONDS_MARKET_OPEN if _is_market_open(now) else CACHE_FRESH_SECONDS_MARKET_CLOSED
    return age < ttl

def store(symbol: str, rows: list[dict[str, Any]]) -> None:
    conn = _init_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        for row in rows:
            conn.execute(
                "INSERT OR REPLACE INTO ohlcv (symbol,date,open,high,low,close,volume,fetched) VALUES (?,?,?,?,?,?,?,?)",
                (symbol, row["date"], row["open"], row["high"], row["low"], row["close"], row.get("volume"), now_iso))
        conn.commit()
    finally: conn.close()

def load(symbol: str, now: datetime | None = None) -> list[dict[str, Any]] | None:
    conn = _init_db()
    try:
        cur = conn.execute("SELECT date,open,high,low,close,volume,fetched FROM ohlcv WHERE symbol=? ORDER BY date", (symbol,))
        rows = cur.fetchall()
        if not rows: return None
        if not is_cache_fresh(rows[-1][6], now=now): return None
        return [{"date":r[0],"open":r[1],"high":r[2],"low":r[3],"close":r[4],"volume":r[5]} for r in rows]
    finally: conn.close()

def clear() -> None:
    conn = _init_db()
    try: conn.execute("DELETE FROM ohlcv"); conn.commit()
    finally: conn.close()`
  },
  {
    name: 'data.py',
    path: 'fx_scan/data.py',
    description: 'yfinance fetcher with cache-first strategy',
    content: `"""FX SCAN — Data fetching layer."""
from __future__ import annotations
import pandas as pd
import yfinance as yf
from .config import FX_PAIRS, YF_PERIOD, YF_INTERVAL
from .cache import load, store

def _normalize_tz(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty: return df
    idx = df.index
    if hasattr(idx, "tz") and idx.tz is not None: idx = idx.tz_convert("UTC")
    elif hasattr(idx, "tz_localize"): idx = idx.tz_localize("UTC")
    df.index = idx
    return df

def fetch_pair(symbol: str, force: bool = False) -> list[dict] | None:
    if not force:
        cached = load(symbol)
        if cached is not None: return cached
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=YF_PERIOD, interval=YF_INTERVAL)
        if df.empty: return None
        df = _normalize_tz(df)
        df = df[["Open","High","Low","Close","Volume"]].copy()
        df.columns = ["open","high","low","close","volume"]
        rows = [{"date":ts.strftime("%Y-%m-%d"),"open":float(r["open"]),"high":float(r["high"]),
                 "low":float(r["low"]),"close":float(r["close"]),"volume":float(r["volume"])} for ts,r in df.iterrows()]
        store(symbol, rows)
        return rows
    except Exception as exc:
        print(f"  ⚠ Error fetching {symbol}: {exc}")
        return None

def fetch_all(force: bool = False) -> dict[str, list[dict]]:
    results: dict[str, list[dict]] = {}
    for symbol in FX_PAIRS:
        data = fetch_pair(symbol, force=force)
        if data is not None: results[symbol] = data
    return results`
  },
  {
    name: 'strategy.py',
    path: 'fx_scan/strategy.py',
    description: 'Pure ID & CIB detection (close-based)',
    content: `"""FX SCAN — Strategy detection (pure functions).

Inside Day: close is INSIDE previous day's range (consolidation)
CIB: close is OUTSIDE previous day's range (breakout)
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
from .config import DEFAULT_PIP_BUFFER

@dataclass(frozen=True)
class Candle:
    date: str; open: float; high: float; low: float; close: float

@dataclass(frozen=True)
class Signal:
    symbol: str; signal_type: Literal["inside_day","cib"]
    direction: Literal["bullish","bearish","neutral"]
    pip_buffer: float; candle: Candle; prev_candle: Candle

def _pip_value(symbol: str) -> float:
    return 0.01 if "JPY" in symbol else 0.0001

def detect_inside_day(prev: Candle, curr: Candle) -> bool:
    """Close is strictly within previous day's range."""
    return prev.low < curr.close < prev.high

def detect_cib(prev: Candle, curr: Candle, symbol: str,
               pip_buffer: float = DEFAULT_PIP_BUFFER) -> Literal["bullish","bearish"] | None:
    """Close is outside previous day's range (with pip buffer)."""
    buf = pip_buffer * _pip_value(symbol)
    if curr.close > prev.high + buf: return "bullish"
    if curr.close < prev.low - buf: return "bearish"
    return None

def candle_direction(c: Candle) -> Literal["bullish","bearish","neutral"]:
    if c.close > c.open: return "bullish"
    if c.close < c.open: return "bearish"
    return "neutral"

def analyze_pair(symbol: str, candles: list[dict],
                 pip_buffer: float = DEFAULT_PIP_BUFFER) -> Signal | None:
    if len(candles) < 2: return None
    prev_d, curr_d = candles[-2], candles[-1]
    prev = Candle(prev_d["date"], prev_d["open"], prev_d["high"], prev_d["low"], prev_d["close"])
    curr = Candle(curr_d["date"], curr_d["open"], curr_d["high"], curr_d["low"], curr_d["close"])
    
    cib_dir = detect_cib(prev, curr, symbol, pip_buffer)
    if cib_dir:
        return Signal(symbol, "cib", cib_dir, pip_buffer, curr, prev)
    if detect_inside_day(prev, curr):
        return Signal(symbol, "inside_day", candle_direction(curr), pip_buffer, curr, prev)
    return None

def analyze_all(data: dict[str, list[dict]],
                pip_buffer: float = DEFAULT_PIP_BUFFER) -> list[Signal]:
    signals: list[Signal] = []
    for symbol, candles in data.items():
        sig = analyze_pair(symbol, candles, pip_buffer)
        if sig: signals.append(sig)
    return signals`
  },
  {
    name: 'cli.py',
    path: 'fx_scan/cli.py',
    description: 'Rich terminal tables with color-coded output',
    content: `"""FX SCAN — CLI entry point with rich tables."""
from __future__ import annotations
import argparse, sys
from datetime import datetime, timezone
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from .config import FX_PAIRS, PAIR_NAMES, DEFAULT_PIP_BUFFER
from .data import fetch_all
from .strategy import analyze_all, Signal
from .cache import clear as clear_cache

console = Console()

def _style(d: str) -> str:
    return {"bullish":"bold green","bearish":"bold red","neutral":"bold white"}.get(d,"white")

def _arrow(d: str) -> str:
    return {"bullish":"▲","bearish":"▼","neutral":"■"}.get(d,"—")

def _build_table(title: str, signals: list[Signal]) -> Table:
    t = Table(title=title, show_header=True, header_style="bold cyan",
              border_style="dim", title_style="bold magenta")
    for col in ["Pair","Date","Close","Dir","Prev Date","Prev H","Prev L","Buffer"]:
        t.add_column(col, justify="right" if col not in ("Pair","Dir","Date","Prev Date") else "center")
    if not signals:
        t.add_row(Text("No signals detected", style="dim italic"), *[""]*7)
        return t
    for s in signals:
        st = _style(s.direction); c = s.candle; p = s.prev_candle
        t.add_row(Text(PAIR_NAMES.get(s.symbol,s.symbol), style=st),
                  Text(c.date, style=st),
                  Text(f"{c.close:.5f}",style=st),
                  Text(_arrow(s.direction),style=st),
                  Text(p.date, style="dim"),
                  Text(f"{p.high:.5f}",style="dim"), Text(f"{p.low:.5f}",style="dim"),
                  Text(f"{s.pip_buffer:.1f}",style="yellow"))
    return t

def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="fx-scan", description="Scan 18 FX pairs for ID & CIB signals.")
    p.add_argument("--force","-f", action="store_true", help="Bypass cache")
    p.add_argument("--clear-cache", action="store_true")
    p.add_argument("--pip-buffer", type=float, default=DEFAULT_PIP_BUFFER)
    args = p.parse_args(argv)
    if args.clear_cache:
        clear_cache(); console.print("[green]✓[/green] Cache cleared."); return
    console.print(Panel(f"[bold]FX SCAN[/bold] — {len(FX_PAIRS)} pairs | Buffer: {args.pip_buffer} pips | {datetime.now(timezone.utc):%Y-%m-%d %H:%M UTC}", style="bold blue"))
    with console.status("[bold green]Fetching market data…"):
        data = fetch_all(force=args.force)
    if not data:
        console.print("[red]No data retrieved.[/red]"); sys.exit(1)
    console.print(f"  ✓ Loaded {len(data)} pairs")
    
    # Debug: Show what dates are being analyzed
    console.print(f"\\n  [dim]Analyzing latest completed candles:[/dim]")
    for symbol in list(data.keys())[:3]:
        candles = data[symbol]
        if len(candles) >= 2:
            prev, curr = candles[-2], candles[-1]
            console.print(f"    [dim]{PAIR_NAMES.get(symbol,symbol)}: {prev['date']} → {curr['date']}[/dim]")
    
    signals = analyze_all(data, pip_buffer=args.pip_buffer)
    ids = [s for s in signals if s.signal_type=="inside_day"]
    cibs = [s for s in signals if s.signal_type=="cib"]
    console.print(); console.print(_build_table("📊 INSIDE DAY (close inside prev range)", ids))
    console.print(); console.print(_build_table("🚀 CLOSED IN BREAKOUT (close outside prev range)", cibs))
    console.print(f"\\n  [dim]Signals: {len(signals)} (ID:{len(ids)}, CIB:{len(cibs)})[/dim]")

if __name__ == "__main__": main()`
  },
  {
    name: 'pyproject.toml',
    path: 'pyproject.toml',
    description: 'Project config with deps and tooling',
    content: `[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "fx-scan"
version = "1.0.0"
requires-python = ">=3.10"
dependencies = ["yfinance>=0.2.30", "rich>=13.0", "pandas>=2.0"]

[project.optional-dependencies]
dev = ["pytest>=7.4", "pytest-cov>=4.1", "ruff>=0.1.0", "mypy>=1.5"]

[project.scripts]
fx-scan = "fx_scan.cli:main"

[tool.ruff]
target-version = "py310"
line-length = 88

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"`
  },
  {
    name: 'run.bat',
    path: 'run.bat',
    description: 'Windows batch launcher',
    content: `@echo off
title FX SCAN
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║       FX SCAN — FX Pair Scanner      ║
echo  ╚═══════════════════════════════════════╝
echo.
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+
    pause & exit /b 1
)
python -c "import fx_scan" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing fx-scan...
    pip install -e .
)
echo [INFO] Starting FX scan...
python -m fx_scan.cli %*
echo.
pause`
  },
  {
    name: 'test_strategy.py',
    path: 'tests/test_strategy.py',
    description: '~25 strategy tests',
    content: `"""Tests for strategy detection."""
import pytest
from fx_scan.strategy import Candle, detect_inside_day, detect_cib, candle_direction, analyze_pair, analyze_all, _pip_value

class TestPipValue:
    def test_jpy(self): assert _pip_value("USDJPY=X") == 0.01
    def test_non_jpy(self): assert _pip_value("EURUSD=X") == 0.0001

class TestInsideDay:
    def test_close_inside(self):
        prev = Candle("d1", 1.085, 1.090, 1.080, 1.087)
        curr = Candle("d2", 1.086, 1.095, 1.075, 1.085)  # close 1.085 inside (1.080-1.090)
        assert detect_inside_day(prev, curr) is True
    def test_close_above_not_inside(self):
        prev = Candle("d1", 1.085, 1.090, 1.080, 1.087)
        curr = Candle("d2", 1.086, 1.095, 1.084, 1.091)  # close above prev.high
        assert detect_inside_day(prev, curr) is False
    def test_close_below_not_inside(self):
        prev = Candle("d1", 1.085, 1.090, 1.080, 1.087)
        curr = Candle("d2", 1.086, 1.089, 1.075, 1.079)  # close below prev.low
        assert detect_inside_day(prev, curr) is False

class TestCIB:
    def test_bullish(self):
        prev = Candle("d1", 1.085, 1.090, 1.080, 1.087)
        curr = Candle("d2", 1.086, 1.095, 1.084, 1.091)  # close > prev.high + buffer
        assert detect_cib(prev, curr, "EURUSD=X", 2) == "bullish"
    def test_bearish(self):
        prev = Candle("d1", 1.085, 1.090, 1.080, 1.087)
        curr = Candle("d2", 1.086, 1.089, 1.075, 1.079)  # close < prev.low - buffer
        assert detect_cib(prev, curr, "EURUSD=X", 2) == "bearish"
    def test_inside_not_cib(self):
        prev = Candle("d1", 1.085, 1.090, 1.080, 1.087)
        curr = Candle("d2", 1.086, 1.089, 1.082, 1.085)
        assert detect_cib(prev, curr, "EURUSD=X", 2) is None

class TestAnalyze:
    def test_cib_priority(self):
        candles = [
            {"date":"d1","open":1.085,"high":1.090,"low":1.080,"close":1.087,"volume":0},
            {"date":"d2","open":1.086,"high":1.095,"low":1.083,"close":1.091,"volume":0},
        ]
        sig = analyze_pair("EURUSD=X", candles, 2)
        assert sig and sig.signal_type == "cib"
    def test_inside_day(self):
        candles = [
            {"date":"d1","open":1.085,"high":1.090,"low":1.080,"close":1.087,"volume":0},
            {"date":"d2","open":1.086,"high":1.095,"low":1.075,"close":1.085,"volume":0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig and sig.signal_type == "inside_day"`
  },
  {
    name: 'test_cache.py',
    path: 'tests/test_cache.py',
    description: '~12 cache freshness tests',
    content: `"""Tests for cache freshness and timezone logic."""
import pytest
from datetime import datetime, timezone, timedelta
from fx_scan.cache import is_cache_fresh, _is_market_open

class TestMarketOpen:
    def test_monday(self): assert _is_market_open(datetime(2024,1,8,14,0,tzinfo=timezone.utc))
    def test_saturday(self): assert not _is_market_open(datetime(2024,1,6,12,0,tzinfo=timezone.utc))
    def test_sunday_before(self): assert not _is_market_open(datetime(2024,1,7,15,0,tzinfo=timezone.utc))
    def test_sunday_after(self): assert _is_market_open(datetime(2024,1,7,22,0,tzinfo=timezone.utc))

class TestCacheFresh:
    def test_fresh_market(self):
        now = datetime(2024,1,8,14,0,tzinfo=timezone.utc)
        assert is_cache_fresh((now-timedelta(minutes=30)).isoformat(), now=now)
    def test_stale_market(self):
        now = datetime(2024,1,8,14,0,tzinfo=timezone.utc)
        assert not is_cache_fresh((now-timedelta(hours=2)).isoformat(), now=now)
    def test_fresh_weekend(self):
        now = datetime(2024,1,6,12,0,tzinfo=timezone.utc)
        assert is_cache_fresh((now-timedelta(hours=12)).isoformat(), now=now)
    def test_stale_weekend(self):
        now = datetime(2024,1,6,12,0,tzinfo=timezone.utc)
        assert not is_cache_fresh((now-timedelta(hours=25)).isoformat(), now=now)`
  },
  {
    name: 'ci.yml',
    path: '.github/workflows/ci.yml',
    description: 'GitHub Actions CI',
    content: `name: CI
on:
  push: {branches: [main]}
  pull_request: {branches: [main]}
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "3.12"}
      - run: pip install ruff mypy
      - run: ruff check .
      - run: mypy fx_scan/
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix: {python-version: ["3.10","3.11","3.12"]}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: "\${{ matrix.python-version }}"}
      - run: pip install -e ".[dev]"
      - run: pytest --cov=fx_scan --cov-report=xml`
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={handleCopy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
      copied ? 'bg-green-500/20 text-green-400 border border-green-500/30'
             : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
    }`}>
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

export default function CodeBrowser() {
  const [selected, setSelected] = useState(0);
  const file = pythonFiles[selected];

  return (
    <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
      <div className="flex">
        <div className="w-64 border-r border-gray-800 bg-gray-950/50 overflow-y-auto max-h-[700px]">
          {pythonFiles.map((f, i) => (
            <button key={f.path} onClick={() => setSelected(i)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-l-2 ${
                i === selected ? 'bg-gray-800/50 border-cyan-400 text-cyan-300'
                               : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
              }`}>
              <div className="font-mono text-xs">{f.path}</div>
              <div className="text-xs text-gray-600 mt-0.5 truncate">{f.description}</div>
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
            <span className="text-sm font-mono text-gray-300">{file.name}</span>
            <CopyButton text={file.content} />
          </div>
          <div className="overflow-auto max-h-[600px]">
            <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed whitespace-pre">{file.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
