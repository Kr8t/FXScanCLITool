import { useState, useEffect } from 'react';
import { fetchRealFXData, analyzePair, FX_PAIRS, type Candle, type Signal } from '../utils/strategy';

interface FXDataState {
  loading: boolean;
  error: string | null;
  data: Record<string, Candle[]> | null;
  signals: Signal[];
  lastUpdated: Date | null;
}

const CACHE_KEY = 'fx_scan_data';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function useFXData(pipBuffer: number = 2) {
  const [state, setState] = useState<FXDataState>({
    loading: true,
    error: null,
    data: null,
    signals: [],
    lastUpdated: null,
  });

  useEffect(() => {
    const loadData = async () => {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            const signals = runAnalysis(data, pipBuffer);
            setState({
              loading: false,
              error: null,
              data,
              signals,
              lastUpdated: new Date(timestamp),
            });
            return;
          }
        } catch {
          // Invalid cache, fetch fresh
        }
      }

      // Fetch fresh data
      try {
        const data = await fetchRealFXData();
        const signals = runAnalysis(data, pipBuffer);
        const timestamp = Date.now();

        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp }));

        setState({
          loading: false,
          error: null,
          data,
          signals,
          lastUpdated: new Date(timestamp),
        });
      } catch (err) {
        setState({
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch data',
          data: null,
          signals: [],
          lastUpdated: null,
        });
      }
    };

    loadData();
  }, [pipBuffer]);

  return state;
}

function runAnalysis(data: Record<string, Candle[]>, pipBuffer: number): Signal[] {
  const signals: Signal[] = [];
  for (const symbol of FX_PAIRS) {
    const candles = data[symbol];
    if (candles && candles.length >= 2) {
      const sig = analyzePair(symbol, candles, pipBuffer);
      if (sig) signals.push(sig);
    }
  }
  return signals;
}
