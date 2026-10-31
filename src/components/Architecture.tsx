export default function Architecture() {
  return (
    <div className="space-y-6">
      {/* File Structure */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">📁</span> Project Structure
        </h3>
        <div className="font-mono text-sm text-gray-300 space-y-1">
          <div className="text-gray-500">fx_scan/</div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-green-400">__init__.py</span>
            <span className="text-gray-600 text-xs ml-2">Package initializer</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-blue-400">config.py</span>
            <span className="text-gray-600 text-xs ml-2">18 pairs, cache TTLs, pip defaults</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-blue-400">cache.py</span>
            <span className="text-gray-600 text-xs ml-2">SQLite layer with freshness rules</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-blue-400">data.py</span>
            <span className="text-gray-600 text-xs ml-2">yfinance fetcher with cache-first</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-blue-400">strategy.py</span>
            <span className="text-gray-600 text-xs ml-2">Pure ID & CIB detection</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">└──</span>
            <span className="text-blue-400">cli.py</span>
            <span className="text-gray-600 text-xs ml-2">Rich tables, argparse entry point</span>
          </div>
          <div className="mt-2 text-gray-500">tests/</div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-purple-400">test_strategy.py</span>
            <span className="text-gray-600 text-xs ml-2">~25 tests for pure functions</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-purple-400">test_cache.py</span>
            <span className="text-gray-600 text-xs ml-2">~12 tests for freshness/TZ</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">└──</span>
            <span className="text-purple-400">test_data.py</span>
            <span className="text-gray-600 text-xs ml-2">~8 tests for data layer</span>
          </div>
          <div className="mt-2 text-gray-500">.</div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-orange-400">pyproject.toml</span>
            <span className="text-gray-600 text-xs ml-2">Build config, deps, tooling</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">├──</span>
            <span className="text-green-400">run.bat</span>
            <span className="text-gray-600 text-xs ml-2">Windows batch launcher</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-yellow-400">└──</span>
            <span className="text-gray-400">.github/workflows/ci.yml</span>
            <span className="text-gray-600 text-xs ml-2">CI: lint + test matrix</span>
          </div>
        </div>
      </div>

      {/* Data Flow */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">⚡</span> Data Flow
        </h3>
        <div className="flex flex-col md:flex-row items-center gap-3 text-sm">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 text-center">
            <div className="text-blue-400 font-bold">yfinance</div>
            <div className="text-xs text-gray-500">OHLCV download</div>
          </div>
          <span className="text-gray-600">→</span>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-center">
            <div className="text-green-400 font-bold">cache.py</div>
            <div className="text-xs text-gray-500">SQLite store/load</div>
          </div>
          <span className="text-gray-600">→</span>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-3 text-center">
            <div className="text-purple-400 font-bold">strategy.py</div>
            <div className="text-xs text-gray-500">ID & CIB detection</div>
          </div>
          <span className="text-gray-600">→</span>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-3 text-center">
            <div className="text-orange-400 font-bold">cli.py</div>
            <div className="text-xs text-gray-500">Rich table render</div>
          </div>
        </div>
      </div>

      {/* Strategy Rules */}
      <div className="bg-gray-950 rounded-xl border border-gray-800 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-cyan-400">📐</span> Strategy Rules
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-purple-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Inside Day (ID)
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>curr.high <strong className="text-white">&lt;</strong> prev.high (strictly below)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>curr.low <strong className="text-white">&gt;</strong> prev.low (strictly above)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>Touching boundaries = NOT inside day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>Suppressed if CIB detected on same bar</span>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-orange-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              Closed In Breakout (CIB)
            </h4>
            <ul className="text-sm text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Bullish: close <strong className="text-white">&gt;</strong> prev.high + buffer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Bearish: close <strong className="text-white">&lt;</strong> prev.low − buffer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Wick-only breaks are excluded (close must cross)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">•</span>
                <span>Buffer in pips (default: 2.0, JPY-aware)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
