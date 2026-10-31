# FX SCAN - Final Strategy Logic

## ✅ Corrected Definitions

### Inside Day (ID)
**The ENTIRE candle (high, low, AND close) must be INSIDE the previous day's range.**

```python
def detect_inside_day(prev: Candle, curr: Candle) -> bool:
    return (
        prev.low < curr.low and      # current low is above previous low
        curr.high < prev.high and    # current high is below previous high
        prev.low < curr.close < prev.high  # close is also inside
    )
```

**Example:**
- Previous day: Low=1.0800, High=1.0900
- Current day: Low=1.0820, High=1.0880, Close=1.0850
- ✅ **INSIDE DAY** - entire candle (1.0820-1.0880) is within (1.0800-1.0900)

**NOT an Inside Day if:**
- High exceeds previous high (even if close is inside)
- Low goes below previous low (even if close is inside)
- Any part of the candle extends beyond the previous range

---

### CIB (Closed In Breakout)
**The close must be OUTSIDE the previous day's range (no buffer).**

```python
def detect_cib(prev: Candle, curr: Candle, symbol: str,
               pip_buffer: float = DEFAULT_PIP_BUFFER) -> Literal["bullish","bearish"] | None:
    """Close is outside previous day's range (no buffer - clean breakout)."""
    if curr.close > prev.high: return "bullish"
    if curr.close < prev.low: return "bearish"
    return None
```

**Example:**
- Previous day: Low=1.0800, High=1.0900
- Current day: Close=1.0910
- ✅ **BULLISH CIB** - close (1.0910) is above previous high (1.0900)

**Example:**
- Previous day: Low=1.0800, High=1.0900
- Current day: Close=1.0790
- ✅ **BEARISH CIB** - close (1.0790) is below previous low (1.0800)

**NOT a CIB if:**
- Close is exactly at the boundary (must be strictly beyond)
- Only the wick extends beyond (close must break out)
- Close is inside the range (even by 1 pip)

---

## 🎯 Key Differences from Previous Version

| Aspect | Old Logic | New Logic |
|--------|-----------|-----------|
| **Inside Day** | Only close needed to be inside | **ENTIRE candle** (high, low, close) must be inside |
| **CIB Buffer** | 2 pip buffer applied | **No buffer** - clean breakout only |
| **Strictness** | More lenient | **Stricter** - clearer signals |

---

## 📊 Decision Flow

```
Analyze latest completed candle:
│
├─ Is close > prev.high?
│  └─ YES → BULLISH CIB ✅
│
├─ Is close < prev.low?
│  └─ YES → BEARISH CIB ✅
│
├─ Is entire candle inside prev range?
│  ├─ prev.low < curr.low?
│  ├─ curr.high < prev.high?
│  ├─ prev.low < curr.close < prev.high?
│  └─ ALL YES → INSIDE DAY ✅
│
└─ Otherwise → NO SIGNAL
```

---

## 🔍 Examples

### Example 1: Inside Day ✅
```
Previous: Low=1.0800, High=1.0900
Current:  Low=1.0820, High=1.0880, Close=1.0850

Check:
✓ 1.0800 < 1.0820 (low is above prev low)
✓ 1.0880 < 1.0900 (high is below prev high)
✓ 1.0800 < 1.0850 < 1.0900 (close is inside)

Result: INSIDE DAY
```

### Example 2: NOT Inside Day ❌
```
Previous: Low=1.0800, High=1.0900
Current:  Low=1.0820, High=1.0920, Close=1.0850

Check:
✓ 1.0800 < 1.0820 (low is above prev low)
✗ 1.0920 < 1.0900 (high EXCEEDS prev high)
✓ 1.0800 < 1.0850 < 1.0900 (close is inside)

Result: NO SIGNAL (high breaks out, so not ID; close inside, so not CIB)
```

### Example 3: Bullish CIB ✅
```
Previous: Low=1.0800, High=1.0900
Current:  Low=1.0850, High=1.0950, Close=1.0910

Check:
✓ 1.0910 > 1.0900 (close above prev high)

Result: BULLISH CIB
```

### Example 4: Bearish CIB ✅
```
Previous: Low=1.0800, High=1.0900
Current:  Low=1.0750, High=1.0880, Close=1.0790

Check:
✓ 1.0790 < 1.0800 (close below prev low)

Result: BEARISH CIB
```

### Example 5: NOT CIB (close at boundary) ❌
```
Previous: Low=1.0800, High=1.0900
Current:  Low=1.0850, High=1.0950, Close=1.0900

Check:
✗ 1.0900 > 1.0900 (close NOT strictly above prev high)
✗ 1.0900 < 1.0800 (close NOT below prev low)
✗ 1.0800 < 1.0900 < 1.0900 (close NOT strictly inside)

Result: NO SIGNAL
```

---

## 🚀 How to Verify

Run with debug flag:
```bash
python -m fx_scan.cli --force --debug
```

You'll see:
```
Latest completed candles (prev → curr):
    EUR/USD: 2024-10-29 → 2024-10-30 
    (close: 1.08500, prev range: 1.08000-1.09000)

DEBUG MODE — All raw candle 
    EUR/USD (5 candles):
      2024-10-25: O=1.08500 H=1.09000 L=1.08000 C=1.08700
      2024-10-28: O=1.08700 H=1.09200 L=1.08500 C=1.09000
      2024-10-29: O=1.09000 H=1.09500 L=1.08800 C=1.09200 ← PREV
      2024-10-30: O=1.09200 H=1.09600 L=1.08400 C=1.08500 ← CURR
```

Then manually verify:
1. Check if close is outside prev range → CIB
2. Check if entire candle (H, L, C) is inside prev range → Inside Day
3. Otherwise → No signal

---

## 📝 Files Updated

### Python (in `public/fx_scan/`)
1. ✅ `strategy.py` - Updated detect_inside_day() and detect_cib()
2. ✅ `tests/test_strategy.py` - Updated all tests to match new logic

### Web (in `src/`)
1. ✅ `utils/strategy.ts` - Updated detectInsideDay() and detectCib()
2. ✅ `components/CodeBrowser.tsx` - Updated displayed code
3. ✅ `components/Architecture.tsx` - Updated strategy rules documentation

---

## 🎯 Summary

**Inside Day** = ENTIRE candle contained within previous day's range
- All three: low, high, AND close must be inside
- Suggests consolidation, price accepting value

**CIB** = Close breaks beyond previous day's range
- Bullish: close > prev.high (no buffer)
- Bearish: close < prev.low (no buffer)
- Suggests breakout, price rejecting prior boundaries

**Build Status:** ✅ PASS (200 KB)
