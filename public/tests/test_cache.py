"""Tests for fx_scan.cache — SQLite caching and freshness rules.

Covers:
- Freshness during market hours (1h TTL)
- Freshness outside market hours (24h TTL)
- Weekend cache logic
- Timezone normalization
- Store and load round-trip
- Cache miss returns None
"""

from __future__ import annotations

import os
import tempfile
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from fx_scan.cache import is_cache_fresh, _is_market_open, store, load, clear, _init_db


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

    def test_wednesday_morning(self):
        now = datetime(2024, 1, 10, 6, 0, tzinfo=timezone.utc)  # Wednesday
        assert _is_market_open(now) is True

    def test_sunday_exactly_at_open(self):
        now = datetime(2024, 1, 7, 21, 0, tzinfo=timezone.utc)  # Sunday 21:00 UTC
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
        assert is_cache_fresh(fetched, now=now) is False

    def test_one_second_before_expiry(self):
        now = datetime(2024, 1, 8, 14, 0, tzinfo=timezone.utc)
        fetched = (now - timedelta(seconds=3599)).isoformat()
        assert is_cache_fresh(fetched, now=now) is True


class TestStoreAndLoad:
    @pytest.fixture(autouse=True)
    def temp_db(self, tmp_path):
        """Use a temporary database for each test."""
        db_path = tmp_path / "test_cache.sqlite3"
        with patch("fx_scan.cache.DB_PATH", db_path), \
             patch("fx_scan.cache.DATA_DIR", tmp_path):
            yield

    def test_store_and_load_roundtrip(self):
        rows = [
            {"date": "2024-01-10", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 1000},
            {"date": "2024-01-11", "open": 1.086, "high": 1.089, "low": 1.082, "close": 1.085, "volume": 1200},
        ]
        store("EURUSD=X", rows)
        now = datetime.now(timezone.utc)
        result = load("EURUSD=X", now=now)
        assert result is not None
        assert len(result) == 2
        assert result[0]["symbol"] if "symbol" in result[0] else True  # just check it loaded
        assert result[0]["date"] == "2024-01-10"
        assert result[1]["close"] == 1.085

    def test_load_returns_none_for_missing_symbol(self):
        now = datetime.now(timezone.utc)
        result = load("NONEXIST=X", now=now)
        assert result is None

    def test_clear_removes_all_data(self):
        rows = [
            {"date": "2024-01-10", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 1000},
        ]
        store("EURUSD=X", rows)
        clear()
        now = datetime.now(timezone.utc)
        result = load("EURUSD=X", now=now)
        assert result is None

    def test_store_overwrites_existing(self):
        rows1 = [
            {"date": "2024-01-10", "open": 1.085, "high": 1.090, "low": 1.080, "close": 1.087, "volume": 1000},
        ]
        rows2 = [
            {"date": "2024-01-10", "open": 1.086, "high": 1.091, "low": 1.081, "close": 1.088, "volume": 1100},
        ]
        store("EURUSD=X", rows1)
        store("EURUSD=X", rows2)
        now = datetime.now(timezone.utc)
        result = load("EURUSD=X", now=now)
        assert result is not None
        assert len(result) == 1
        assert result[0]["open"] == 1.086
