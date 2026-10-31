import { useState } from 'react';
import { fxPairs, insideDayPairs, cibPairs } from '../data/mockData';

function DirectionArrow({ direction }: { direction: string }) {
  if (direction === 'bullish') return <span className="text-green-400 font-bold">▲</span>;
  if (direction === 'bearish') return <span className="text-red-400 font-bold">▼</span>;
  return <span className="text-gray-400 font-bold">■</span>;
}

function CandleRow({ pair, showPrev }: { pair: typeof fxPairs[0]; showPrev?: boolean }) {
  const colorClass = pair.direction === 'bullish' ? 'text-green-400' 
    : pair.direction === 'bearish' ? 'text-red-400' 
    : 'text-gray-300';
  
  const isJPY = pair.symbol.includes('JPY');
  const decimals = isJPY ? 3 : 5;

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
      <td className={`px-3 py-2 font-mono font-semibold ${colorClass}`}>
        {pair.name}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {pair.open.toFixed(decimals)}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {pair.high.toFixed(decimals)}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {pair.low.toFixed(decimals)}
      </td>
      <td className={`px-3 py-2 font-mono text-right ${colorClass}`}>
        {pair.close.toFixed(decimals)}
      </td>
      <td className="px-3 py-2 text-center">
        <DirectionArrow direction={pair.direction} />
      </td>
      {showPrev && (
        <>
          <td className="px-3 py-2 font-mono text-right text-gray-500">
            {pair.prevHigh.toFixed(decimals)}
          </td>
          <td className="px-3 py-2 font-mono text-right text-gray-500">
            {pair.prevLow.toFixed(decimals)}
          </td>
        </>
      )}
      <td className="px-3 py-2 font-mono text-right text-yellow-400">
        {pair.pipBuffer.toFixed(1)}
      </td>
    </tr>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'inside' | 'cib' | 'all'>('all');

  const filteredPairs = activeTab === 'inside' ? insideDayPairs 
    : activeTab === 'cib' ? cibPairs 
    : fxPairs;

  return (
    <div className="space-y-6">
      {/* Terminal Header */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="ml-3 text-sm text-gray-400 font-mono">
            fx-scan — 18 pairs | Buffer: 2.0 pips | {new Date().toISOString().split('T')[0]}
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
            All Pairs ({fxPairs.length})
          </button>
          <button
            onClick={() => setActiveTab('inside')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'inside' 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-900/50' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            📊 Inside Day ({insideDayPairs.length})
          </button>
          <button
            onClick={() => setActiveTab('cib')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'cib' 
                ? 'text-orange-400 border-b-2 border-orange-400 bg-gray-900/50' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            🚀 CIB ({cibPairs.length})
          </button>
        </div>

        {/* Table */}
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
                {activeTab !== 'all' && (
                  <>
                    <th className="px-3 py-3 text-right font-semibold">Prev H</th>
                    <th className="px-3 py-3 text-right font-semibold">Prev L</th>
                  </>
                )}
                <th className="px-3 py-3 text-right font-semibold">Buffer</th>
              </tr>
            </thead>
            <tbody>
              {filteredPairs.map((pair) => (
                <CandleRow 
                  key={pair.symbol} 
                  pair={pair} 
                  showPrev={activeTab !== 'all'} 
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-500 font-mono">
          Total signals: {insideDayPairs.length + cibPairs.length} (ID: {insideDayPairs.length}, CIB: {cibPairs.length})
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="text-green-400 font-bold">▲</span>
          <span>Bullish candle (green)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 font-bold">▼</span>
          <span>Bearish candle (red)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400 font-bold">■</span>
          <span>Doji/Neutral (white)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400">●</span>
          <span>Pip buffer tolerance</span>
        </div>
      </div>
    </div>
  );
}
