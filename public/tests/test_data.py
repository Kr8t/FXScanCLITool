"""Tests for fx_scan.data — data fetching layer.

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
        assert len(result) == 3
