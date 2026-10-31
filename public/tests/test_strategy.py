"""Tests for fx_scan.strategy — pure strategy functions.

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
    """Inside Day = ENTIRE candle (high, low, close) is WITHIN previous day's range."""

    def test_full_range_inside(self, prev_candle):
        """Entire candle (high, low, close) inside prev range → Inside Day."""
        # prev: low=1.0800, high=1.0900
        # curr: low=1.0820, high=1.0880, close=1.0850 (all inside)
        curr = Candle("d", 1.086, 1.0880, 1.0820, 1.0850)
        assert detect_inside_day(prev_candle, curr) is True

    def test_high_touches_prev_high_not_inside(self, prev_candle):
        """High equals prev.high → NOT inside (must be strictly below)."""
        # prev: low=1.0800, high=1.0900
        # curr: high=1.0900 (touches prev high)
        curr = Candle("d", 1.086, 1.0900, 1.0820, 1.0850)
        assert detect_inside_day(prev_candle, curr) is False

    def test_low_touches_prev_low_not_inside(self, prev_candle):
        """Low equals prev.low → NOT inside (must be strictly above)."""
        # prev: low=1.0800, high=1.0900
        # curr: low=1.0800 (touches prev low)
        curr = Candle("d", 1.086, 1.0880, 1.0800, 1.0850)
        assert detect_inside_day(prev_candle, curr) is False

    def test_high_exceeds_prev_high_not_inside(self, prev_candle):
        """High above prev.high → NOT inside day."""
        # prev: low=1.0800, high=1.0900
        # curr: high=1.0910 (exceeds prev high)
        curr = Candle("d", 1.086, 1.0910, 1.0820, 1.0850)
        assert detect_inside_day(prev_candle, curr) is False

    def test_low_below_prev_low_not_inside(self, prev_candle):
        """Low below prev.low → NOT inside day."""
        # prev: low=1.0800, high=1.0900
        # curr: low=1.0790 (below prev low)
        curr = Candle("d", 1.086, 1.0880, 1.0790, 1.0850)
        assert detect_inside_day(prev_candle, curr) is False

    def test_close_inside_but_high_outside(self, prev_candle):
        """Close inside but high outside → NOT inside day."""
        # prev: low=1.0800, high=1.0900
        # curr: high=1.0950 (outside), close=1.0850 (inside)
        curr = Candle("d", 1.086, 1.0950, 1.0820, 1.0850)
        assert detect_inside_day(prev_candle, curr) is False

    def test_close_inside_but_low_outside(self, prev_candle):
        """Close inside but low outside → NOT inside day."""
        # prev: low=1.0800, high=1.0900
        # curr: low=1.0750 (outside), close=1.0850 (inside)
        curr = Candle("d", 1.086, 1.0880, 1.0750, 1.0850)
        assert detect_inside_day(prev_candle, curr) is False

    def test_tight_range_fully_inside(self):
        """Small candle fully inside prev range → Inside Day."""
        prev = Candle("d1", 1.0, 1.1000, 0.9000, 1.0)
        curr = Candle("d2", 1.0, 1.0100, 0.9900, 1.0050)
        assert detect_inside_day(prev, curr) is True


# ── detect_cib ──────────────────────────────────────────────────────

class TestDetectCib:
    """CIB = close is OUTSIDE previous day's range (no buffer)."""

    def test_bullish_cib(self, prev_candle):
        """Close above prev.high → Bullish CIB."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0910 (above prev.high)
        curr = Candle("d", 1.0850, 1.0950, 1.0840, 1.0910)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result == "bullish"

    def test_bearish_cib(self, prev_candle):
        """Close below prev.low → Bearish CIB."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0790 (below prev.low)
        curr = Candle("d", 1.0860, 1.0870, 1.0780, 1.0790)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result == "bearish"

    def test_no_cib_close_inside_range(self, prev_candle):
        """Close inside prev range → NOT CIB."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0860 (inside range)
        curr = Candle("d", 1.0850, 1.0890, 1.0820, 1.0860)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result is None

    def test_wick_break_not_cib(self, prev_candle):
        """High exceeds prev high but close is inside → not CIB."""
        # prev: low=1.0800, high=1.0900
        # curr: high=1.0920 (wick breaks out), close=1.0880 (inside)
        curr = Candle("d", 1.0850, 1.0920, 1.0840, 1.0880)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result is None

    def test_close_just_above_prev_high(self, prev_candle):
        """Close just above prev.high → Bullish CIB."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0901 (just above prev.high)
        curr = Candle("d", 1.0850, 1.0910, 1.0840, 1.0901)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result == "bullish"

    def test_close_just_below_prev_low(self, prev_candle):
        """Close just below prev.low → Bearish CIB."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0799 (just below prev.low)
        curr = Candle("d", 1.0860, 1.0870, 1.0780, 1.0799)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result == "bearish"

    def test_jpy_bullish_cib(self):
        """JPY pair with close above prev.high."""
        prev = Candle("d1", 150.0, 151.0, 149.0, 150.5)
        curr = Candle("d2", 150.2, 152.0, 150.1, 151.05)
        result = detect_cib(prev, curr, "USDJPY=X")
        assert result == "bullish"

    def test_jpy_bearish_cib(self):
        """JPY pair with close below prev.low."""
        prev = Candle("d1", 150.0, 151.0, 149.0, 150.5)
        curr = Candle("d2", 150.2, 150.8, 148.5, 148.95)
        result = detect_cib(prev, curr, "USDJPY=X")
        assert result == "bearish"

    def test_close_exactly_at_prev_high(self, prev_candle):
        """Close exactly at prev.high is NOT a CIB (must be strictly beyond)."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0900 (exactly at prev.high)
        curr = Candle("d", 1.0850, 1.0910, 1.0840, 1.0900)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result is None

    def test_close_exactly_at_prev_low(self, prev_candle):
        """Close exactly at prev.low is NOT a CIB (must be strictly beyond)."""
        # prev: low=1.0800, high=1.0900
        # curr: close=1.0800 (exactly at prev.low)
        curr = Candle("d", 1.0850, 1.0870, 1.0780, 1.0800)
        result = detect_cib(prev_candle, curr, "EURUSD=X")
        assert result is None


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
    def test_returns_none_for_empty_data(self):
        assert analyze_pair("EURUSD=X", []) is None

    def test_returns_none_for_single_candle(self):
        candles = [{"date": "d1", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0}]
        assert analyze_pair("EURUSD=X", candles) is None

    def test_cib_bullish_when_close_above_prev_high(self):
        """Close above prev.high → CIB (bullish)."""
        # d1: low=1.080, high=1.090
        # d2: close=1.091 (above prev.high)
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.091, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.signal_type == "cib"
        assert sig.direction == "bullish"

    def test_cib_bearish_when_close_below_prev_low(self):
        """Close below prev.low → CIB (bearish)."""
        # d1: low=1.080, high=1.090
        # d2: close=1.079 (below prev.low)
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.075, "close": 1.079, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.signal_type == "cib"
        assert sig.direction == "bearish"

    def test_inside_day_when_full_range_inside(self):
        """Entire candle (high, low, close) within prev range → Inside Day."""
        # d1: low=1.080, high=1.090
        # d2: low=1.082, high=1.088, close=1.085 (all inside)
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.088, "low": 1.082, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.signal_type == "inside_day"

    def test_no_inside_day_when_high_outside(self):
        """High outside prev range → NOT Inside Day."""
        # d1: low=1.080, high=1.090
        # d2: high=1.095 (outside), close=1.085 (inside)
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.082, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is None  # Not CIB (close inside), not ID (high outside)

    def test_no_signal_when_close_at_boundary(self):
        """Close exactly at prev.high or prev.low → no signal."""
        # Close at prev.high
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.090, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is None

    def test_signal_preserves_candle_data(self):
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.088, "low": 1.082, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.candle.date == "d2"
        assert sig.prev_candle.date == "d1"
        assert sig.symbol == "EURUSD=X"

    def test_jpy_pair_inside_day(self):
        """JPY pair with entire candle inside prev range."""
        # d1: low=149.0, high=151.0
        # d2: low=149.5, high=150.8, close=150.3 (all inside)
        candles = [
            {"date": "d1", "open": 150.0, "high": 151.0, "low": 149.0, "close": 150.5, "volume": 0},
            {"date": "d2", "open": 150.2, "high": 150.8, "low": 149.5, "close": 150.3, "volume": 0},
        ]
        sig = analyze_pair("USDJPY=X", candles)
        assert sig is not None
        assert sig.signal_type == "inside_day"

    def test_jpy_pair_cib(self):
        """JPY pair with close outside prev range."""
        # d1: low=149.0, high=151.0
        # d2: close=151.05 (above prev.high)
        candles = [
            {"date": "d1", "open": 150.0, "high": 151.0, "low": 149.0, "close": 150.5, "volume": 0},
            {"date": "d2", "open": 150.2, "high": 152.0, "low": 150.1, "close": 151.05, "volume": 0},
        ]
        sig = analyze_pair("USDJPY=X", candles)
        assert sig is not None
        assert sig.signal_type == "cib"


# ── analyze_all ─────────────────────────────────────────────────────

class TestAnalyzeAll:
    def test_empty_data(self):
        assert analyze_all({}) == []

    def test_multiple_inside_day_signals(self):
        """Both pairs have entire candle inside their previous range."""
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.088, "low": 1.082, "close": 1.085, "volume": 0},
            ],
            "GBPUSD=X": [
                {"date": "d1", "open": 1.27, "high": 1.28, "low": 1.26, "close": 1.275, "volume": 0},
                {"date": "d2", "open": 1.272, "high": 1.278, "low": 1.265, "close": 1.274, "volume": 0},
            ],
        }
        signals = analyze_all(data)
        assert len(signals) == 2
        assert all(s.signal_type == "inside_day" for s in signals)

    def test_mixed_cib_and_inside_day(self):
        """One pair CIB, one pair Inside Day."""
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.091, "volume": 0},
            ],
            "GBPUSD=X": [
                {"date": "d1", "open": 1.27, "high": 1.28, "low": 1.26, "close": 1.275, "volume": 0},
                {"date": "d2", "open": 1.272, "high": 1.278, "low": 1.265, "close": 1.274, "volume": 0},
            ],
        }
        signals = analyze_all(data)
        assert len(signals) == 2
        cib_signals = [s for s in signals if s.signal_type == "cib"]
        id_signals = [s for s in signals if s.signal_type == "inside_day"]
        assert len(cib_signals) == 1
        assert len(id_signals) == 1

    def test_no_signals_when_close_at_boundary(self):
        """Close exactly at prev.high → no signal."""
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.090, "volume": 0},
            ],
        }
        signals = analyze_all(data)
        assert len(signals) == 0

    def test_no_signal_when_high_outside(self):
        """High outside prev range, close inside → no signal."""
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.082, "close": 1.085, "volume": 0},
            ],
        }
        signals = analyze_all(data)
        # Not CIB (close inside), not ID (high outside)
        assert len(signals) == 0
