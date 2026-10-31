"""Tests for fx_scan.data — data fetching layer.

Covers:
- Timezone normalization
- Cache-first behavior
- Force flag bypasses cache
- Error handling
- Incomplete candle filtering (today's bar excluded before market close)
"""

from __future__ import annotations

import pytest
import pandas as pd
from datetime import datetime, timezone, time
from unittest.mock import patch, MagicMock

from fx_scan.data import (
    _normalize_tz,
    _is_today_complete,
    _filter_completed_candles,
    fetch_pair,
    fetch_all,
)


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
        assert result.index.tz is not None


class TestIsTodayComplete:
    def test_before_close(self):
        # 10:00 UTC — before 22:00 UTC close
        now = datetime(2024, 1, 10, 10, 0, tzinfo=timezone.utc)
        assert _is_today_complete(now) is False

    def test_at_close(self):
        # Exactly 22:00 UTC
        now = datetime(2024, 1, 10, 22, 0, tzinfo=timezone.utc)
        assert _is_today_complete(now) is True

    def test_after_close(self):
        # 23:00 UTC — after close
        now = datetime(2024, 1, 10, 23, 0, tzinfo=timezone.utc)
        assert _is_today_complete(now) is True


class TestFilterCompletedCandles:
    def test_removes_today_before_close(self):
        now = datetime(2024, 1, 10, 10, 0, tzinfo=timezone.utc)
        rows = [
            {"date": "2024-01-08", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},
            {"date": "2024-01-09", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},
            {"date": "2024-01-10", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},  # today
        ]
        result = _filter_completed_candles(rows, now=now)
        assert len(result) == 2
        assert result[-1]["date"] == "2024-01-09"

    def test_keeps_today_after_close(self):
        now = datetime(2024, 1, 10, 23, 0, tzinfo=timezone.utc)
        rows = [
            {"date": "2024-01-08", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},
            {"date": "2024-01-09", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},
            {"date": "2024-01-10", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},  # today
        ]
        result = _filter_completed_candles(rows, now=now)
        assert len(result) == 3
        assert result[-1]["date"] == "2024-01-10"

    def test_no_today_bar(self):
        now = datetime(2024, 1, 10, 10, 0, tzinfo=timezone.utc)
        rows = [
            {"date": "2024-01-08", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},
            {"date": "2024-01-09", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0},
        ]
        result = _filter_completed_candles(rows, now=now)
        assert len(result) == 2


class TestFetchPair:
    @patch("fx_scan.data.load")
    def test_returns_cached_data(self, mock_load):
        cached = [
            {"date": "2024-01-10", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 1000},
        ]
        mock_load.return_value = cached
        now = datetime(2024, 1, 11, 23, 0, tzinfo=timezone.utc)  # after close
        result = fetch_pair("EURUSD=X", force=False, now=now)
        assert result == cached

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_filters_today_bar(self, mock_yf, mock_load):
        mock_load.return_value = None

        # yfinance returns 3 days including today
        idx = pd.date_range("2024-01-08", periods=3, freq="D", tz="UTC")
        mock_df = pd.DataFrame({
            "Open": [1.085, 1.086, 1.087],
            "High": [1.090, 1.089, 1.092],
            "Low": [1.080, 1.082, 1.085],
            "Close": [1.087, 1.085, 1.090],
            "Volume": [1000, 1200, 800],
        }, index=idx)

        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_df
        mock_yf.Ticker.return_value = mock_ticker

        # Run before market close — today (Jan 10) should be filtered
        now = datetime(2024, 1, 10, 10, 0, tzinfo=timezone.utc)
        with patch("fx_scan.data.store"):
            result = fetch_pair("EURUSD=X", force=True, now=now)
            assert result is not None
            assert len(result) == 2  # Only Jan 8 and Jan 9
            assert result[-1]["date"] == "2024-01-09"

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_keeps_today_after_close(self, mock_yf, mock_load):
        mock_load.return_value = None

        idx = pd.date_range("2024-01-08", periods=3, freq="D", tz="UTC")
        mock_df = pd.DataFrame({
            "Open": [1.085, 1.086, 1.087],
            "High": [1.090, 1.089, 1.092],
            "Low": [1.080, 1.082, 1.085],
            "Close": [1.087, 1.085, 1.090],
            "Volume": [1000, 1200, 800],
        }, index=idx)

        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_df
        mock_yf.Ticker.return_value = mock_ticker

        # Run after market close — today (Jan 10) should be kept
        now = datetime(2024, 1, 10, 23, 0, tzinfo=timezone.utc)
        with patch("fx_scan.data.store"):
            result = fetch_pair("EURUSD=X", force=True, now=now)
            assert result is not None
            assert len(result) == 3  # All 3 days
            assert result[-1]["date"] == "2024-01-10"

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_returns_none_on_empty(self, mock_yf, mock_load):
        mock_load.return_value = None
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()
        mock_yf.Ticker.return_value = mock_ticker

        result = fetch_pair("EURUSD=X", force=True)
        assert result is None

    @patch("fx_scan.data.load")
    @patch("fx_scan.data.yf")
    def test_returns_none_on_exception(self, mock_yf, mock_load):
        mock_load.return_value = None
        mock_yf.Ticker.side_effect = Exception("Network error")

        result = fetch_pair("EURUSD=X", force=True)
        assert result is None


class TestFetchAll:
    @patch("fx_scan.data.fetch_pair")
    def test_returns_dict_of_results(self, mock_fetch):
        mock_fetch.return_value = [
            {"date": "2024-01-10", "open": 1.0, "high": 1.1, "low": 0.9, "close": 1.05, "volume": 0},
        ]
        result = fetch_all(force=False)
        assert isinstance(result, dict)
        assert len(result) == 18

    @patch("fx_scan.data.fetch_pair")
    def test_skips_failed_pairs(self, mock_fetch):
        call_count = 0
        def side_effect(symbol, force=False, now=None):
            nonlocal call_count
            call_count += 1
            if call_count <= 3:
                return [{"date": "d1", "open": 1, "high": 1, "low": 1, "close": 1, "volume": 0}]
            return None

        mock_fetch.side_effect = side_effect
        result = fetch_all(force=False)
        assert len(result) == 3
