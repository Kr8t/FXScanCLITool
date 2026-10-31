export interface FXPair {
  symbol: string;
  name: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  open: number;
  high: number;
  low: number;
  close: number;
  prevOpen: number;
  prevHigh: number;
  prevLow: number;
  prevClose: number;
  signal: 'inside_day' | 'cib' | null;
  pipBuffer: number;
}

export const fxPairs: FXPair[] = [
  {
    symbol: 'EURUSD=X', name: 'EUR/USD', direction: 'bullish',
    open: 1.0842, high: 1.0912, low: 1.0830, close: 1.0905,
    prevOpen: 1.0820, prevHigh: 1.0880, prevLow: 1.0790, prevClose: 1.0850,
    signal: 'cib', pipBuffer: 2
  },
  {
    symbol: 'GBPUSD=X', name: 'GBP/USD', direction: 'bearish',
    open: 1.2710, high: 1.2745, low: 1.2650, close: 1.2665,
    prevOpen: 1.2690, prevHigh: 1.2760, prevLow: 1.2640, prevClose: 1.2720,
    signal: 'inside_day', pipBuffer: 3
  },
  {
    symbol: 'USDJPY=X', name: 'USD/JPY', direction: 'bullish',
    open: 154.20, high: 155.10, low: 154.05, close: 155.02,
    prevOpen: 154.00, prevHigh: 154.80, prevLow: 153.50, prevClose: 154.30,
    signal: 'cib', pipBuffer: 2
  },
  {
    symbol: 'USDCHF=X', name: 'USD/CHF', direction: 'bearish',
    open: 0.8820, high: 0.8845, low: 0.8780, close: 0.8795,
    prevOpen: 0.8830, prevHigh: 0.8870, prevLow: 0.8770, prevClose: 0.8810,
    signal: null, pipBuffer: 0
  },
  {
    symbol: 'AUDUSD=X', name: 'AUD/USD', direction: 'neutral',
    open: 0.6580, high: 0.6610, low: 0.6560, close: 0.6585,
    prevOpen: 0.6570, prevHigh: 0.6650, prevLow: 0.6540, prevClose: 0.6600,
    signal: 'inside_day', pipBuffer: 2
  },
  {
    symbol: 'USDCAD=X', name: 'USD/CAD', direction: 'bullish',
    open: 1.3620, high: 1.3690, low: 1.3610, close: 1.3680,
    prevOpen: 1.3600, prevHigh: 1.3670, prevLow: 1.3560, prevClose: 1.3630,
    signal: 'cib', pipBuffer: 1
  },
  {
    symbol: 'NZDUSD=X', name: 'NZD/USD', direction: 'bearish',
    open: 0.6020, high: 0.6045, low: 0.5980, close: 0.5990,
    prevOpen: 0.6010, prevHigh: 0.6060, prevLow: 0.5970, prevClose: 0.6030,
    signal: null, pipBuffer: 0
  },
  {
    symbol: 'EURGBP=X', name: 'EUR/GBP', direction: 'bullish',
    open: 0.8530, high: 0.8575, low: 0.8520, close: 0.8568,
    prevOpen: 0.8510, prevHigh: 0.8560, prevLow: 0.8490, prevClose: 0.8540,
    signal: 'cib', pipBuffer: 2
  },
  {
    symbol: 'EURJPY=X', name: 'EUR/JPY', direction: 'bullish',
    open: 167.20, high: 168.50, low: 167.00, close: 168.35,
    prevOpen: 166.80, prevHigh: 167.90, prevLow: 166.20, prevClose: 167.50,
    signal: 'cib', pipBuffer: 3
  },
  {
    symbol: 'EURCHF=X', name: 'EUR/CHF', direction: 'neutral',
    open: 0.9580, high: 0.9610, low: 0.9560, close: 0.9585,
    prevOpen: 0.9570, prevHigh: 0.9640, prevLow: 0.9550, prevClose: 0.9600,
    signal: 'inside_day', pipBuffer: 2
  },
  {
    symbol: 'EURAUD=X', name: 'EUR/AUD', direction: 'bullish',
    open: 1.6480, high: 1.6560, low: 1.6460, close: 1.6550,
    prevOpen: 1.6450, prevHigh: 1.6540, prevLow: 1.6400, prevClose: 1.6490,
    signal: 'cib', pipBuffer: 2
  },
  {
    symbol: 'GBPJPY=X', name: 'GBP/JPY', direction: 'bullish',
    open: 196.20, high: 197.80, low: 196.00, close: 197.65,
    prevOpen: 195.80, prevHigh: 197.00, prevLow: 195.20, prevClose: 196.50,
    signal: 'cib', pipBuffer: 3
  },
  {
    symbol: 'GBPCHF=X', name: 'GBP/CHF', direction: 'bearish',
    open: 1.1220, high: 1.1250, low: 1.1160, close: 1.1175,
    prevOpen: 1.1200, prevHigh: 1.1280, prevLow: 1.1150, prevClose: 1.1230,
    signal: null, pipBuffer: 0
  },
  {
    symbol: 'AUDJPY=X', name: 'AUD/JPY', direction: 'neutral',
    open: 98.80, high: 99.20, low: 98.60, close: 98.90,
    prevOpen: 98.70, prevHigh: 99.50, prevLow: 98.40, prevClose: 99.10,
    signal: 'inside_day', pipBuffer: 2
  },
  {
    symbol: 'AUDNZD=X', name: 'AUD/NZD', direction: 'bullish',
    open: 1.0920, high: 1.0970, low: 1.0910, close: 1.0965,
    prevOpen: 1.0900, prevHigh: 1.0960, prevLow: 1.0870, prevClose: 1.0930,
    signal: 'cib', pipBuffer: 1
  },
  {
    symbol: 'CADJPY=X', name: 'CAD/JPY', direction: 'bearish',
    open: 113.20, high: 113.50, low: 112.60, close: 112.75,
    prevOpen: 113.00, prevHigh: 113.80, prevLow: 112.50, prevClose: 113.30,
    signal: null, pipBuffer: 0
  },
  {
    symbol: 'CHFJPY=X', name: 'CHF/JPY', direction: 'bullish',
    open: 174.80, high: 176.20, low: 174.60, close: 176.05,
    prevOpen: 174.50, prevHigh: 175.80, prevLow: 174.00, prevClose: 175.10,
    signal: 'cib', pipBuffer: 2
  },
  {
    symbol: 'NZDJPY=X', name: 'NZD/JPY', direction: 'neutral',
    open: 92.80, high: 93.20, low: 92.50, close: 92.90,
    prevOpen: 92.70, prevHigh: 93.50, prevLow: 92.30, prevClose: 93.10,
    signal: 'inside_day', pipBuffer: 2
  },
];

export const insideDayPairs = fxPairs.filter(p => p.signal === 'inside_day');
export const cibPairs = fxPairs.filter(p => p.signal === 'cib');
export const noSignalPairs = fxPairs.filter(p => p.signal === null);
