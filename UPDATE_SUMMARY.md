# FX SCAN - Updated Configuration Summary

## ✅ Changes Made

### 1. **Filtered to 16 FX Pairs** (was 18)

**7 Major Pairs:**
- EUR/USD, GBP/USD, USD/JPY, USD/CHF
- AUD/USD, USD/CAD, NZD/USD

**6 Yen Crosses:**
- EUR/JPY, GBP/JPY, AUD/JPY
- CAD/JPY, CHF/JPY, NZD/JPY

**3 EUR Crosses:**
- EUR/GBP, EUR/CHF, EUR/AUD

**Removed:**
- GBP/CHF (not a major, yen, or EUR cross)
- AUD/NZD (not a major, yen, or EUR cross)

### 2. **Switched to New York Time**

**Before:**
- Used UTC timezone
- Daily close: 22:00 UTC (5pm ET during standard time only)
- Market open check: Saturday closed, Sunday before 21:00 UTC closed

**After:**
- Uses `America/New_York` timezone (automatically handles DST)
- Daily close: 5:00 PM New York time
- Market open: Sunday 5:00 PM – Friday 5:00 PM NY time
- Automatically adjusts for Daylight Saving Time

---

## 📁 Files Updated

### Python (in `public/fx_scan/`)

1. **`config.py`**
   - Changed from 18 to 16 pairs
   - Added `NY_TZ = ZoneInfo("America/New_York")`
   - Organized pairs into 3 groups: Majors, Yen Crosses, EUR Crosses

2. **`data.py`**
   - Changed `FX_DAILY_CLOSE_UTC = time(22, 0)` → `FX_DAILY_CLOSE_NY = time(17, 0)`
   - Updated `_is_today_complete()` to convert to NY timezone
   - Updated `_filter_completed_candles()` to use NY timezone
   - All datetime operations now use `NY_TZ`

3. **`cache.py`**
   - Updated `_is_market_open()` to use NY timezone
   - Market open: Sunday 5:00 PM – Friday 5:00 PM NY time
   - Updated `is_cache_fresh()` to convert to NY timezone

4. **`run.bat`**
   - Updated banner to show "7 Majors + Yen Crosses + EUR Crosses"
   - Shows "Timezone: New York (Eastern) Time"

### Web (in `src/`)

1. **`utils/strategy.ts`**
   - Updated `FX_PAIRS` array to 16 pairs
   - Updated `PAIR_NAMES` to match

2. **`components/CodeBrowser.tsx`**
   - Updated displayed `config.py` code
   - Updated displayed `data.py` code

3. **`components/Architecture.tsx`**
   - Changed "18 Major FX Pairs" → "16 FX Pairs"
   - Added "New York Time" feature card
   - Updated description: "7 Majors + 6 Yen + 3 EUR crosses"

4. **`components/Dashboard.tsx`**
   - Updated terminal header: "16 pairs (7M + 6Y + 3E)"
   - Updated live data banner: "{n}/16 pairs"

5. **`App.tsx`**
   - Updated subtitle: "7 Majors + Yen/EUR Crosses • New York Time"

---

## 🕐 New York Time Benefits

1. **DST-Aware**: Automatically handles Daylight Saving Time transitions
2. **Trader-Friendly**: Matches NY trading session hours
3. **Accurate**: No more hardcoded UTC offsets that break during DST
4. **Standard**: Uses Python's `zoneinfo` module (Python 3.9+)

---

## 📊 Example: October 30th at 5:00 PM NY Time

**Scenario:** It's October 30, 2024 at 5:00 PM Eastern Time

**What happens:**
1. Tool checks: Is current time >= 5:00 PM NY? **YES**
2. Today's candle (Oct 30) is **COMPLETE**
3. Analyzes: Oct 29 (previous) → Oct 30 (current)
4. Shows signals for the most recent completed day

**If it was 4:59 PM NY:**
1. Tool checks: Is current time >= 5:00 PM NY? **NO**
2. Today's candle (Oct 30) is **INCOMPLETE**
3. Filters out Oct 30
4. Analyzes: Oct 28 (previous) → Oct 29 (current)

---

## 🚀 How to Run

```bash
# Windows
run.bat

# Or manually
python -m fx_scan.cli --force
```

**Output will show:**
```
╔═══════════════════════════════════════════════════════╗
║       FX SCAN — FX Pair Signal Scanner               ║
║                                                       ║
║  Scanning: 7 Majors + Yen Crosses + EUR Crosses      ║
║  Timezone: New York (Eastern) Time                    ║
║                                                       ║
║  Inside Day: ENTIRE candle INSIDE previous range      ║
║  CIB: Close OUTSIDE previous day's range              ║
╚═══════════════════════════════════════════════════════╝
```

---

## ✅ Build Status

- ✅ TypeScript compilation: PASS
- ✅ Vite build: PASS (202 KB)
- ✅ All components updated
- ✅ Python files ready to copy and run

---

## 📝 Summary

**Your request:** "Filter to 7 major FX pairs and Yen/EUR cross pairs, use New York time trading hours"

**What was done:**
1. ✅ Filtered from 18 → 16 pairs (7 Majors + 6 Yen crosses + 3 EUR crosses)
2. ✅ Switched from UTC to New York timezone (America/New_York)
3. ✅ Updated daily close check to 5:00 PM NY time
4. ✅ Updated market open check to Sunday 5:00 PM – Friday 5:00 PM NY time
5. ✅ Automatically handles DST transitions
6. ✅ Updated all documentation and UI

**The tool now uses New York trading hours and scans only the pairs you specified!**
