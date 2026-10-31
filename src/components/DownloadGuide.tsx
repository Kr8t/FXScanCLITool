import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button onClick={handleCopy} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
      copied ? 'bg-green-500/20 text-green-400 border border-green-500/30'
             : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
    }`}>
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

export default function DownloadGuide() {
  return (
    <div className="space-y-6">
      {/* Quick Start Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">🚀 Quick Start — 3 Steps</h3>
        <p className="text-sm text-gray-400 mb-4">
          The Python version uses <strong className="text-white">yfinance</strong> for true OHLC data with intraday wicks.
        </p>
        <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm space-y-2">
          <div className="flex items-center justify-between">
            <code className="text-green-400">pip install yfinance rich pandas</code>
            <CopyButton text="pip install yfinance rich pandas" />
          </div>
          <div className="flex items-center justify-between">
            <code className="text-green-400">python -m fx_scan.cli</code>
            <CopyButton text="python -m fx_scan.cli" />
          </div>
        </div>
      </div>

      {/* Step 1 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">1</div>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-2">Create the project folder</h4>
            <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs space-y-1">
              <div className="flex items-center justify-between">
                <code className="text-gray-300">mkdir fx-scan && cd fx-scan</code>
                <CopyButton text="mkdir fx-scan && cd fx-scan" />
              </div>
              <div className="flex items-center justify-between">
                <code className="text-gray-300">mkdir fx_scan tests</code>
                <CopyButton text="mkdir fx_scan tests" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">2</div>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-2">Copy source files</h4>
            <p className="text-sm text-gray-400 mb-3">
              Go to the <strong className="text-white">"Source Code"</strong> tab and copy each file into the correct location:
            </p>
            <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs text-gray-400 space-y-1">
              <div>📁 fx_scan/</div>
              <div className="pl-4">├── __init__.py</div>
              <div className="pl-4">├── config.py</div>
              <div className="pl-4">├── cache.py</div>
              <div className="pl-4">├── data.py</div>
              <div className="pl-4">├── strategy.py</div>
              <div className="pl-4">└── cli.py</div>
              <div>📁 tests/</div>
              <div className="pl-4">├── test_strategy.py</div>
              <div className="pl-4">└── test_cache.py</div>
              <div>📄 pyproject.toml</div>
              <div>📄 run.bat <span className="text-gray-600">(Windows)</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">3</div>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-2">Install & run</h4>
            <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-gray-300">pip install yfinance rich pandas</code>
                <CopyButton text="pip install yfinance rich pandas" />
              </div>
              <div className="text-gray-600"># Run the scanner:</div>
              <div className="flex items-center justify-between">
                <code className="text-green-400">python -m fx_scan.cli</code>
                <CopyButton text="python -m fx_scan.cli" />
              </div>
              <div className="text-gray-600 mt-2"># With options:</div>
              <div className="flex items-center justify-between">
                <code className="text-green-400">python -m fx_scan.cli --force --pip-buffer 3</code>
                <CopyButton text="python -m fx_scan.cli --force --pip-buffer 3" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Windows note */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
        <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
          <span>🪟</span> Windows Users
        </h4>
        <p className="text-sm text-gray-400">
          After setting up the files, double-click <code className="text-yellow-300 bg-gray-900 px-1 rounded">run.bat</code> to launch.
          It auto-clears the cache and fetches fresh data every time.
        </p>
      </div>

      {/* Troubleshooting */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
        <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
          <span>🔧</span> Troubleshooting: Seeing Wrong Signals?
        </h4>
        <div className="text-sm text-gray-400 space-y-2">
          <p>If you see incorrect signals (like EURUSD showing as CIB when it shouldn't), clear the cache:</p>
          <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs space-y-1">
            <div className="flex items-center justify-between">
              <code className="text-yellow-400">python -m fx_scan.cli --clear-cache</code>
              <CopyButton text="python -m fx_scan.cli --clear-cache" />
            </div>
            <div className="text-gray-600 mt-2"># Then run with --force to bypass cache:</div>
            <div className="flex items-center justify-between">
              <code className="text-green-400">python -m fx_scan.cli --force</code>
              <CopyButton text="python -m fx_scan.cli --force" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            The cache is stored at <code className="text-cyan-400">~/.fx_scan/cache.sqlite3</code>. You can also delete this file manually.
          </p>
        </div>
      </div>

      {/* Python vs Web */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5">
        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
          <span>ℹ️</span> Python vs Web Version
        </h4>
        <div className="text-sm text-gray-400 space-y-2">
          <p><strong className="text-white">Python (yfinance):</strong> True OHLC data with intraday wicks. Best for accurate signal detection.</p>
          <p><strong className="text-white">Web (this page):</strong> Uses ECB daily reference rates (close-only). Good for quick overview, but candles are approximated from consecutive closes.</p>
        </div>
      </div>
    </div>
  );
}
