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
    """Inside Day = close is WITHIN previous day's range."""

    def test_close_inside_range(self, prev_candle):
        """Close between prev.low and prev.high → Inside Day."""
        curr = Candle("d", 1.086, 1.0950, 1.0750, 1.0850)
        assert detect_inside_day(prev_candle, curr) is True

    def test_close_at_prev_high_not_inside(self, prev_candle):
        """Close exactly at prev.high → NOT inside (must be strictly within)."""
        curr = Candle("d", 1.086, 1.0950, 1.0750, 1.0900)
        assert detect_inside_day(prev_candle, curr) is False

    def test_close_at_prev_low_not_inside(self, prev_candle):
        """Close exactly at prev.low → NOT inside (must be strictly within)."""
        curr = Candle("d", 1.086, 1.0950, 1.0750, 1.0800)
        assert detect_inside_day(prev_candle, curr) is False

    def test_close_above_prev_high_not_inside(self, prev_candle):
        """Close above prev.high → NOT inside day (this is CIB)."""
        curr = Candle("d", 1.086, 1.0950, 1.0820, 1.0910)
        assert detect_inside_day(prev_candle, curr) is False

    def test_close_below_prev_low_not_inside(self, prev_candle):
        """Close below prev.low → NOT inside day (this is CIB)."""
        curr = Candle("d", 1.086, 1.0890, 1.0750, 1.0790)
        assert detect_inside_day(prev_candle, curr) is False

    def test_wide_range_but_close_inside(self, prev_candle):
        """Even with wide wicks, if close is inside → Inside Day."""
        curr = Candle("d", 1.086, 1.1000, 1.0700, 1.0850)
        assert detect_inside_day(prev_candle, curr) is True

    def test_tight_range_close_inside(self):
        """Small candle with close inside prev range."""
        prev = Candle("d1", 1.0, 1.1000, 0.9000, 1.0)
        curr = Candle("d2", 1.0, 1.0100, 0.9900, 1.0050)
        assert detect_inside_day(prev, curr) is True

    def test_close_near_middle_of_range(self, prev_candle):
        """Close near the middle of prev range → Inside Day."""
        curr = Candle("d", 1.086, 1.0880, 1.0830, 1.0850)
        assert detect_inside_day(prev_candle, curr) is True


# ── detect_cib ──────────────────────────────────────────────────────

class TestDetectCib:
    """CIB = close is OUTSIDE previous day's range."""

    def test_bullish_cib(self, prev_candle):
        """Close above prev.high → Bullish CIB."""
        curr = Candle("d", 1.0850, 1.0950, 1.0840, 1.0910)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result == "bullish"

    def test_bearish_cib(self, prev_candle):
        """Close below prev.low → Bearish CIB."""
        curr = Candle("d", 1.0860, 1.0870, 1.0780, 1.0790)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result == "bearish"

    def test_no_cib_close_inside_range(self, prev_candle):
        """Close inside prev range → NOT CIB (this is Inside Day)."""
        curr = Candle("d", 1.0850, 1.0890, 1.0820, 1.0860)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result is None

    def test_wick_break_not_cib(self, prev_candle):
        """High exceeds prev high but close is inside → not CIB, it's Inside Day."""
        curr = Candle("d", 1.0850, 1.0920, 1.0840, 1.0880)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result is None

    def test_buffer_prevents_false_positive(self, prev_candle):
        """Close barely above prev high but within buffer → not CIB."""
        curr = Candle("d", 1.0850, 1.0910, 1.0840, 1.09005)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=2)
        assert result is None

    def test_jpy_bullish_cib(self):
        """JPY pair with close above prev.high."""
        prev = Candle("d1", 150.0, 151.0, 149.0, 150.5)
        curr = Candle("d2", 150.2, 152.0, 150.1, 151.05)
        result = detect_cib(prev, curr, "USDJPY=X", pip_buffer=2)
        assert result == "bullish"

    def test_jpy_bearish_cib(self):
        """JPY pair with close below prev.low."""
        prev = Candle("d1", 150.0, 151.0, 149.0, 150.5)
        curr = Candle("d2", 150.2, 150.8, 148.5, 148.95)
        result = detect_cib(prev, curr, "USDJPY=X", pip_buffer=2)
        assert result == "bearish"

    def test_zero_buffer(self, prev_candle):
        """With zero buffer, close just above prev.high triggers CIB."""
        curr = Candle("d", 1.0850, 1.0910, 1.0840, 1.09001)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=0)
        assert result == "bullish"

    def test_close_exactly_at_prev_high(self, prev_candle):
        """Close exactly at prev.high is NOT a CIB (must be strictly beyond)."""
        curr = Candle("d", 1.0850, 1.0910, 1.0840, 1.0900)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=0)
        assert result is None

    def test_close_exactly_at_prev_low(self, prev_candle):
        """Close exactly at prev.low is NOT a CIB (must be strictly beyond)."""
        curr = Candle("d", 1.0850, 1.0870, 1.0780, 1.0800)
        result = detect_cib(prev_candle, curr, "EURUSD=X", pip_buffer=0)
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
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.091, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles, pip_buffer=2)
        assert sig is not None
        assert sig.signal_type == "cib"
        assert sig.direction == "bullish"

    def test_cib_bearish_when_close_below_prev_low(self):
        """Close below prev.low → CIB (bearish)."""
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.075, "close": 1.079, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles, pip_buffer=2)
        assert sig is not None
        assert sig.signal_type == "cib"
        assert sig.direction == "bearish"

    def test_inside_day_when_close_inside_range(self):
        """Close within prev range → Inside Day."""
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.075, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.signal_type == "inside_day"

    def test_no_signal_when_close_at_boundary(self):
        """Close exactly at prev.high or prev.low → no signal."""
        # Close at prev.high
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.090, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles, pip_buffer=0)
        assert sig is None

    def test_signal_preserves_candle_data(self):
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.075, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.candle.date == "d2"
        assert sig.prev_candle.date == "d1"
        assert sig.symbol == "EURUSD=X"

    def test_jpy_pair_inside_day(self):
        """JPY pair with close inside prev range."""
        candles = [
            {"date": "d1", "open": 150.0, "high": 151.0, "low": 149.0, "close": 150.5, "volume": 0},
            {"date": "d2", "open": 150.2, "high": 152.0, "low": 148.0, "close": 150.3, "volume": 0},
        ]
        sig = analyze_pair("USDJPY=X", candles)
        assert sig is not None
        assert sig.signal_type == "inside_day"

    def test_jpy_pair_cib(self):
        """JPY pair with close outside prev range."""
        candles = [
            {"date": "d1", "open": 150.0, "high": 151.0, "low": 149.0, "close": 150.5, "volume": 0},
            {"date": "d2", "open": 150.2, "high": 152.0, "low": 150.1, "close": 151.05, "volume": 0},
        ]
        sig = analyze_pair("USDJPY=X", candles, pip_buffer=2)
        assert sig is not None
        assert sig.signal_type == "cib"


# ── analyze_all ─────────────────────────────────────────────────────

class TestAnalyzeAll:
    def test_empty_data(self):
        assert analyze_all({}) == []

    def test_multiple_inside_day_signals(self):
        """Both pairs close inside their previous range."""
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.075, "close": 1.085, "volume": 0},
            ],
            "GBPUSD=X": [
                {"date": "d1", "open": 1.27, "high": 1.28, "low": 1.26, "close": 1.275, "volume": 0},
                {"date": "d2", "open": 1.272, "high": 1.29, "low": 1.25, "close": 1.274, "volume": 0},
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
                {"date": "d2", "open": 1.272, "high": 1.29, "low": 1.25, "close": 1.274, "volume": 0},
            ],
        }
        signals = analyze_all(data, pip_buffer=2)
        assert len(signals) == 2
        cib_signals = [s for s in signals if s.signal_type == "cib"]
        id_signals = [s for s in signals if s.signal_type == "inside_day"]
        assert len(cib_signals) == 1
        assert len(id_signals) == 1

    def test_no_signals_when_all_close_at_boundaries(self):
        """Close exactly at prev.high → no signal."""
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.083, "close": 1.090, "volume": 0},
            ],
        }
        signals = analyze_all(data, pip_buffer=0)
        assert len(signals) == 0

    def test_custom_pip_buffer(self):
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.084, "close": 1.0905, "volume": 0},
            ],
        }
        # With buffer=2 (0.0002), close 1.0905 > 1.090 + 0.0002 = 1.0902 → CIB
        signals = analyze_all(data, pip_buffer=2)
        assert len(signals) == 1
        assert signals[0].signal_type == "cib"

        # With buffer=10 (0.0010), close 1.0905 < 1.090 + 0.0010 = 1.0910 → no CIB
        # But close 1.0905 is still inside prev range (1.080-1.090), so it's Inside Day
        signals = analyze_all(data, pip_buffer=10)
        assert len(signals) == 1
        assert signals[0].signal_type == "inside_day"
