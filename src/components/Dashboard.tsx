import { useState } from 'react';
import { useFXData } from '../hooks/useFXData';
import { PAIR_NAMES, FX_PAIRS, type Signal, type Candle } from '../utils/strategy';

function DirectionArrow({ direction }: { direction: string }) {
  if (direction === 'bullish') return <span className="text-green-400 font-bold">▲</span>;
  if (direction === 'bearish') return <span className="text-red-400 font-bold">▼</span>;
  return <span className="text-gray-400 font-bold">■</span>;
}

function formatPrice(price: number, symbol: string): string {
  const decimals = symbol.includes('JPY') ? 3 : 5;
  return price.toFixed(decimals);
}

function SignalRow({ signal }: { signal: Signal }) {
  const colorClass = signal.direction === 'bullish' ? 'text-green-400'
    : signal.direction === 'bearish' ? 'text-red-400'
    : 'text-gray-300';

  const c = signal.candle;
  const p = signal.prevCandle;

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
      <td className={`px-3 py-2 font-mono font-semibold ${colorClass}`}>
        {signal.name}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {formatPrice(c.open, signal.symbol)}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {formatPrice(c.high, signal.symbol)}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {formatPrice(c.low, signal.symbol)}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {formatPrice(c.close, signal.symbol)}
      </td>
      <td className="px-3 py-2 text-center">
        <DirectionArrow direction={signal.direction} />
      </td>
      <td className="px-3 py-2 font-mono text-right text-gray-500">
        {formatPrice(p.high, signal.symbol)}
      </td>
      <td className="px-3 py-2 font-mono text-right text-gray-500">
        {formatPrice(p.low, signal.symbol)}
      </td>
      <td className="px-3 py-2 font-mono text-right text-yellow-400">
        {signal.pipBuffer.toFixed(1)}
      </td>
    </tr>
  );
}

function AllPairsTable({ data }: { data: Record<string, Candle[]> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-cyan-400 border-b border-gray-700">
            <th className="px-3 py-3 text-left font-semibold">Pair</th>
            <th className="px-3 py-3 text-right font-semibold">Last Close</th>
            <th className="px-3 py-3 text-right font-semibold">Prev Close</th>
            <th className="px-3 py-3 text-center font-semibold">Change</th>
            <th className="px-3 py-3 text-right font-semibold">Prev Range</th>
            <th className="px-3 py-3 text-center font-semibold">Signal</th>
          </tr>
        </thead>
        <tbody>
          {FX_PAIRS.map((symbol) => {
            const candles = data[symbol];
            if (!candles || candles.length < 2) return null;
            const curr = candles[candles.length - 1];
            const prev = candles[candles.length - 2];
            const change = curr.close - prev.close;
            const changePct = (change / prev.close) * 100;
            const isUp = change > 0;
            const colorClass = isUp ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400';

            return (
              <tr key={symbol} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-3 py-2 font-mono font-semibold text-white">
                  {PAIR_NAMES[symbol]}
                </td>
                <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
                  {formatPrice(curr.close, symbol)}
                </td>
                <td className="px-3 py-2 font-mono text-right text-gray-500">
                  {formatPrice(prev.close, symbol)}
                </td>
                <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
                  {isUp ? '+' : ''}{changePct.toFixed(3)}%
                </td>
                <td className="px-3 py-2 font-mono text-right text-gray-500 text-xs">
                  {formatPrice(prev.low, symbol)} – {formatPrice(prev.high, symbol)}
                </td>
                <td className="px-3 py-2 text-center">
                  <DirectionArrow direction={isUp ? 'bullish' : change < 0 ? 'bearish' : 'neutral'} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SignalTable({ title, signals }: { title: string; signals: Signal[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-cyan-400 border-b border-gray-700">
            <th className="px-3 py-3 text-left font-semibold">Pair</th>
            <th className="px-3 py-3 text-right font-semibold">O</th>
            <th className="px-3 py-3 text-right font-semibold">H</th>
            <th className="px-3 py-3 text-right font-semibold">L</th>
            <th className="px-3 py-3 text-right font-semibold">C</th>
            <th className="px-3 py-3 text-center font-semibold">Dir</th>
            <th className="px-3 py-3 text-right font-semibold">Prev H</th>
            <th className="px-3 py-3 text-right font-semibold">Prev L</th>
            <th className="px-3 py-3 text-right font-semibold">Buffer</th>
          </tr>
        </thead>
        <tbody>
          {signals.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-3 py-4 text-center text-gray-500 italic">
                No signals detected
              </td>
            </tr>
          ) : (
            signals.map((sig) => <SignalRow key={sig.symbol} signal={sig} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'inside' | 'cib'>('all');
  const [pipBuffer, setPipBuffer] = useState(2);
  const { loading, error, data, signals, lastUpdated } = useFXData(pipBuffer);

  const insideDaySignals = signals.filter(s => s.signalType === 'inside_day');
  const cibSignals = signals.filter(s => s.signalType === 'cib');

  const handleRefresh = () => {
    localStorage.removeItem('fx_scan_data');
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">Fetching real FX data from ECB...</p>
        <p className="text-gray-600 text-xs mt-2">Loading 18 currency pairs (last 90 days)</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400 font-semibold mb-2">⚠️ Failed to fetch live data</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
        <p className="text-gray-600 text-xs mt-4">
          The app uses frankfurter.app (free ECB rates). Check your internet connection.
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Live Data Banner */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span className="text-sm text-green-400 font-medium">LIVE DATA</span>
          <span className="text-xs text-gray-500">
            Source: ECB via frankfurter.app • {data ? Object.keys(data).length : 0} pairs loaded
            {lastUpdated && ` • Updated ${lastUpdated.toLocaleTimeString()}`}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="text-xs text-gray-400 hover:text-white px-3 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Pip Buffer Control */}
      <div className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-3 border border-gray-800">
        <label className="text-sm text-gray-400">CIB Pip Buffer:</label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={pipBuffer}
          onChange={(e) => setPipBuffer(parseFloat(e.target.value))}
          className="flex-1 accent-cyan-400"
        />
        <span className="text-sm font-mono text-yellow-400 w-12 text-right">{pipBuffer.toFixed(1)}</span>
      </div>

      {/* Terminal-style output */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="ml-3 text-sm text-gray-400 font-mono">
            fx-scan — 18 pairs | Buffer: {pipBuffer} pips | {new Date().toISOString().split('T')[0]}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-900/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All Pairs ({FX_PAIRS.length})
          </button>
          <button
            onClick={() => setActiveTab('inside')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'inside'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-900/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            📊 Inside Day ({insideDaySignals.length})
          </button>
          <button
            onClick={() => setActiveTab('cib')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'cib'
                ? 'text-orange-400 border-b-2 border-orange-400 bg-gray-900/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🚀 CIB ({cibSignals.length})
          </button>
        </div>

        {/* Table Content */}
        {activeTab === 'all' && <AllPairsTable data={data} />}
        {activeTab === 'inside' && (
          <div>
            <SignalTable title="📊 INSIDE DAY" signals={insideDaySignals} />
          </div>
        )}
        {activeTab === 'cib' && (
          <div>
            <SignalTable title="🚀 CLOSED IN BREAKOUT" signals={cibSignals} />
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 font-mono flex justify-between">
          <span>
            Total signals: {signals.length} (ID: {insideDaySignals.length}, CIB: {cibSignals.length})
          </span>
          <span>
            Data: ECB reference rates (daily) • Close-to-close candles
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="text-green-400 font-bold">▲</span>
          <span>Bullish (close &gt; open)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 font-bold">▼</span>
          <span>Bearish (close &lt; open)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-bold">■</span>
          <span>Neutral (doji)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400">●</span>
          <span>Pip buffer tolerance</span>
        </div>
      </div>

      {/* Info note */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-xs text-gray-400">
        <p className="font-semibold text-blue-400 mb-1">ℹ️ About the data</p>
        <p>
          This app fetches real daily reference rates from the European Central Bank (ECB) via frankfurter.app.
          Candles are built from consecutive daily closes (open = prev close, high/low = range of the two closes).
          For true OHLC data with intraday wicks, use the Python version with yfinance.
        </p>
      </div>
    </div>
  );
}
