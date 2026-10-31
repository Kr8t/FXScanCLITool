"""FX SCAN — Strategy detection (pure functions).

Two strategies are implemented for confluence with day trading ideas:

1. **Inside Day (ID)**
   The latest completed candle's ENTIRE RANGE is inside the previous day's range.
   - prev.low < curr.low (current low is above previous low)
   - curr.high < prev.high (current high is below previous high)
   - prev.low < curr.close < prev.high (close is also inside)
   → Suggests consolidation, price contained within prior range.

2. **Closed In Breakout (CIB)**
   The latest completed candle CLOSES OUTSIDE the previous day's range.
   - Bullish CIB: curr.close > prev.high (close above previous high)
   - Bearish CIB: curr.close < prev.low (close below previous low)
   → Suggests breakout, price breaking beyond prior range boundaries.

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
    """Return True if *curr* is an inside day relative to *prev*.

    Inside day: The ENTIRE candle is within previous day's range.
    - prev.low < curr.low (current low is above previous low)
    - curr.high < prev.high (current high is below previous high)
    - prev.low < curr.close < prev.high (close is also inside)
    
    The full range (including wicks) must be inside the previous day.
    """
    return (
        prev.low < curr.low and
        curr.high < prev.high and
        prev.low < curr.close < prev.high
    )


def detect_cib(
    prev: Candle,
    curr: Candle,
    symbol: str,
    pip_buffer: float = DEFAULT_PIP_BUFFER,
) -> Literal["bullish", "bearish"] | None:
    """Detect Closed In Breakout (CIB).

    CIB occurs when the close is OUTSIDE the previous day's range:
    - Bullish CIB: curr.close > prev.high
    - Bearish CIB: curr.close < prev.low

    The close must be strictly beyond the previous day's high or low.
    No buffer is applied - it's a clean breakout close.

    Returns the direction or None.
    """
    if curr.close > prev.high:
        return "bullish"
    if curr.close < prev.low:
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
    return signals
