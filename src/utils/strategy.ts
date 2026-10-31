/**
 * TypeScript port of the FX SCAN strategy detection.
 * Runs in the browser against real fetched data.
 */

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Signal {
  symbol: string;
  name: string;
  signalType: 'inside_day' | 'cib';
  direction: 'bullish' | 'bearish' | 'neutral';
  pipBuffer: number;
  candle: Candle;
  prevCandle: Candle;
}

export const FX_PAIRS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X',
  'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X',
  'EURGBP=X', 'EURJPY=X', 'EURCHF=X', 'EURAUD=X',
  'GBPJPY=X', 'GBPCHF=X',
  'AUDJPY=X', 'AUDNZD=X',
  'CADJPY=X', 'CHFJPY=X', 'NZDJPY=X',
] as const;

export const PAIR_NAMES: Record<string, string> = {
  'EURUSD=X': 'EUR/USD', 'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY', 'USDCHF=X': 'USD/CHF',
  'AUDUSD=X': 'AUD/USD', 'USDCAD=X': 'USD/CAD',
  'NZDUSD=X': 'NZD/USD',
  'EURGBP=X': 'EUR/GBP', 'EURJPY=X': 'EUR/JPY',
  'EURCHF=X': 'EUR/CHF', 'EURAUD=X': 'EUR/AUD',
  'GBPJPY=X': 'GBP/JPY', 'GBPCHF=X': 'GBP/CHF',
  'AUDJPY=X': 'AUD/JPY', 'AUDNZD=X': 'AUD/NZD',
  'CADJPY=X': 'CAD/JPY', 'CHFJPY=X': 'CHF/JPY',
  'NZDJPY=X': 'NZD/JPY',
};

/** Parse "XXX/YYY" or "XXXYYY=X" into base and quote currency codes. */
function parsePair(symbol: string): [string, string] {
  const name = PAIR_NAMES[symbol] || symbol.replace('=X', '');
  const [base, quote] = name.split('/');
  return [base, quote];
}

function pipValue(symbol: string): number {
  return symbol.includes('JPY') ? 0.01 : 0.0001;
}

/**
 * Inside Day: The ENTIRE candle (high, low, close) is STRICTLY INSIDE prev day's range.
 * - prev.low < curr.low (current low is above previous low)
 * - curr.high < prev.high (current high is below previous high)
 * - prev.low < curr.close < prev.high (close is also inside)
 */
export function detectInsideDay(prev: Candle, curr: Candle): boolean {
  return (
    prev.low < curr.low &&
    curr.high < prev.high &&
    prev.low < curr.close &&
    curr.close < prev.high
  );
}

/**
 * CIB (Closed In Breakout): curr.close is STRICTLY OUTSIDE prev day's range.
 * Bullish: curr.close > prev.high (close above previous high)
 * Bearish: curr.close < prev.low (close below previous low)
 * No buffer - clean breakout close.
 */
export function detectCib(
  prev: Candle,
  curr: Candle,
  symbol: string,
  pipBuffer: number,
): 'bullish' | 'bearish' | null {
  // pipBuffer parameter kept for API compatibility but not used
  if (curr.close > prev.high) return 'bullish';
  if (curr.close < prev.low) return 'bearish';
  return null;
}

export function candleDirection(c: Candle): 'bullish' | 'bearish' | 'neutral' {
  if (c.close > c.open) return 'bullish';
  if (c.close < c.open) return 'bearish';
  return 'neutral';
}

export function analyzePair(
  symbol: string,
  candles: Candle[],
  pipBuffer: number,
): Signal | null {
  if (candles.length < 2) return null;
  const prev = candles[candles.length - 2];
  const curr = candles[candles.length - 1];

  const cibDir = detectCib(prev, curr, symbol, pipBuffer);
  if (cibDir) {
    return {
      symbol,
      name: PAIR_NAMES[symbol] || symbol,
      signalType: 'cib',
      direction: cibDir,
      pipBuffer,
      candle: curr,
      prevCandle: prev,
    };
  }

  if (detectInsideDay(prev, curr)) {
    return {
      symbol,
      name: PAIR_NAMES[symbol] || symbol,
      signalType: 'inside_day',
      direction: candleDirection(curr),
      pipBuffer,
      candle: curr,
      prevCandle: prev,
    };
  }

  return null;
}

/**
 * Build synthetic OHLC candles from a sequence of daily close prices.
 * open = prev close, high = max(open, close), low = min(open, close).
 * This gives us close-to-close candles which still work for ID/CIB detection.
 */
export function buildCandlesFromCloses(
  dates: string[],
  closes: number[],
): Candle[] {
  const candles: Candle[] = [];
  for (let i = 1; i < closes.length; i++) {
    const open = closes[i - 1];
    const close = closes[i];
    candles.push({
      date: dates[i],
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
    });
  }
  return candles;
}

/**
 * Compute a cross rate from EUR-based rates.
 * A/B = (EUR/B) / (EUR/A)
 */
function crossRate(
  eurRates: Record<string, number>,
  base: string,
  quote: string,
): number | null {
  if (base === 'EUR') return eurRates[quote] ?? null;
  if (quote === 'EUR') {
    const r = eurRates[base];
    return r ? 1 / r : null;
  }
  const eurBase = eurRates[base];
  const eurQuote = eurRates[quote];
  if (!eurBase || !eurQuote) return null;
  return eurQuote / eurBase;
}

export interface FrankfurterResponse {
  amount: number;
  base: string;
  rates: Record<string, Record<string, number>>;
}

/**
 * Fetch real FX data from frankfurter.app (ECB reference rates).
 * Returns candles per symbol for the last ~90 days.
 */
export async function fetchRealFXData(): Promise<Record<string, Candle[]>> {
  // Fetch last 90 days of EUR-based rates
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const url = `https://api.frankfurter.app/${fmt(start)}..${fmt(end)}?from=EUR&to=USD,JPY,GBP,CHF,AUD,CAD,NZD`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json: FrankfurterResponse = await res.json();

  // Build EUR-based daily rates
  const dates = Object.keys(json.rates).sort();
  const eurRates: Record<string, number[]> = {
    USD: [], JPY: [], GBP: [], CHF: [], AUD: [], CAD: [], NZD: [],
  };
  for (const date of dates) {
    const dayRates = json.rates[date];
    for (const cur of Object.keys(eurRates)) {
      eurRates[cur].push(dayRates[cur]);
    }
  }

  // Build candles for each of the 18 pairs
  const result: Record<string, Candle[]> = {};

  for (const symbol of FX_PAIRS) {
    const [base, quote] = parsePair(symbol);
    const closes: number[] = [];
    for (let i = 0; i < dates.length; i++) {
      // Build EUR-based rates for this day
      const dayEur: Record<string, number> = {};
      for (const cur of Object.keys(eurRates)) {
        dayEur[cur] = eurRates[cur][i];
      }
      const rate = crossRate(dayEur, base, quote);
      if (rate !== null) closes.push(rate);
    }
    if (closes.length >= 2) {
      result[symbol] = buildCandlesFromCloses(dates, closes);
    }
  }

  return result;
}
