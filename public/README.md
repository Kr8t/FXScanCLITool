# FX SCAN — Major FX Pair Signal Scanner

Scan 18 major FX pairs for **Inside Day** and **Closed In Breakout (CIB)** signals.

## Requirements

- Python 3.10+
- Internet connection (for yfinance data)

## Quick Start

```bash
# Install the package
pip install -e .

# Run the scanner
fx-scan

# Or run directly
python -m fx_scan.cli
```

## Windows Users

Double-click `run.bat` to launch the scanner.

## CLI Options

```bash
fx-scan --help

# Force re-download (bypass cache)
fx-scan --force

# Clear the SQLite cache
fx-scan --clear-cache

# Custom pip buffer for CIB detection
fx-scan --pip-buffer 3.0
```

## Strategies

### Inside Day (ID)
The candle CLOSES INSIDE the previous day's range:
- `prev.low < close < prev.high`
- Suggests consolidation — price accepting value within prior range

### Closed In Breakout (CIB)
The candle CLOSES OUTSIDE the previous day's range:
- Bullish: `close > prev.high + buffer`
- Bearish: `close < prev.low - buffer`
- Suggests breakout — price rejecting prior range boundaries
- Default buffer: 2 pips (JPY-aware) to filter noise

**Note:** These are mutually exclusive. If CIB is detected, Inside Day is suppressed for that pair.

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=fx_scan

# Lint
ruff check .

# Type check
mypy fx_scan/
```

## File Structure

```
fx_scan/
├── __init__.py      # Package initializer
├── config.py        # 18 pairs, cache TTLs, pip defaults
├── cache.py         # SQLite layer with freshness rules
├── data.py          # yfinance fetcher with cache-first
├── strategy.py      # Pure ID & CIB detection
└── cli.py           # Rich tables, argparse entry point

tests/
├── test_strategy.py # ~25 tests for pure functions
├── test_cache.py    # ~12 tests for freshness/TZ
└── test_data.py     # ~8 tests for data layer
```

## License

MIT
