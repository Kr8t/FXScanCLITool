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

    def test_wider_range_not_inside(self, prev_candle):
        curr = Candle("d", 1.086, 1.0950, 1.0750, 1.0855)
        assert detect_inside_day(prev_candle, curr) is False

    def test_very_tight_inside(self):
        prev = Candle("d1", 1.0, 1.1000, 0.9000, 1.0)
        curr = Candle("d2", 1.0, 1.0999, 0.9001, 1.0)
        assert detect_inside_day(prev, curr) is True


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

    def test_jpy_bearish_cib(self):
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

    def test_no_signal_when_expanding_range(self):
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.095, "low": 1.075, "close": 1.088, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is None

    def test_signal_preserves_candle_data(self):
        candles = [
            {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
            {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.082, "close": 1.085, "volume": 0},
        ]
        sig = analyze_pair("EURUSD=X", candles)
        assert sig is not None
        assert sig.candle.date == "d2"
        assert sig.prev_candle.date == "d1"
        assert sig.symbol == "EURUSD=X"

    def test_jpy_pair_analysis(self):
        candles = [
            {"date": "d1", "open": 150.0, "high": 151.0, "low": 149.0, "close": 150.5, "volume": 0},
            {"date": "d2", "open": 150.2, "high": 150.8, "low": 149.5, "close": 150.3, "volume": 0},
        ]
        sig = analyze_pair("USDJPY=X", candles)
        assert sig is not None
        assert sig.signal_type == "inside_day"


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
        assert len(signals) == 2

    def test_mixed_signals_and_no_signals(self):
        data = {
            "EURUSD=X": [
                {"date": "d1", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 0},
                {"date": "d2", "open": 1.086, "high": 1.089, "low": 1.082, "close": 1.085, "volume": 0},
            ],
            "GBPUSD=X": [
                {"date": "d1", "open": 1.27, "high": 1.28, "low": 1.26, "close": 1.275, "volume": 0},
                {"date": "d2", "open": 1.272, "high": 1.30, "low": 1.25, "close": 1.275, "volume": 0},
            ],
        }
        signals = analyze_all(data)
        # EUR/USD has inside day, GBP/USD has no signal (expanding range, close within)
        assert len(signals) == 1
        assert signals[0].symbol == "EURUSD=X"

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
        signals = analyze_all(data, pip_buffer=10)
        assert len(signals) == 0
