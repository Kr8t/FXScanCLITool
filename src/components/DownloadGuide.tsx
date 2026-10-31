import { useState } from 'react';
import { pythonFiles } from '../data/pythonFiles';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function FileCard({ file }: { file: typeof pythonFiles[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/50">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
            {file.language}
          </span>
          <span className="text-sm font-mono text-gray-200">{file.path}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={file.content} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="overflow-auto max-h-96 bg-gray-950">
          <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed whitespace-pre">
            {file.content}
          </pre>
        </div>
      )}
      {!expanded && (
        <div className="px-4 py-2 text-xs text-gray-500">
          {file.description} — {file.content.split('\n').length} lines
        </div>
      )}
    </div>
  );
}

export default function DownloadGuide() {
  const [activeSection, setActiveSection] = useState<'setup' | 'files'>('setup');

  const allCode = pythonFiles.map(f => `# ═══ ${f.path} ═══\n${f.content}`).join('\n\n');

  return (
    <div className="space-y-6">
      {/* Quick Start Banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-2">🚀 Quick Start — 3 Steps</h3>
        <p className="text-sm text-gray-400 mb-4">
          Copy the files below into a folder on your computer, then run these commands:
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
        <p className="text-xs text-gray-500 mt-3">
          ⚠️ Make sure you have Python 3.10+ installed. On Windows, you can also double-click <code className="text-yellow-400">run.bat</code>
        </p>
      </div>

      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('setup')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'setup'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          📋 Setup Instructions
        </button>
        <button
          onClick={() => setActiveSection('files')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'files'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          📄 All Source Files ({pythonFiles.length})
        </button>
      </div>

      {activeSection === 'setup' && (
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Create the project folder</h4>
                <p className="text-sm text-gray-400 mb-3">Create a folder and the package directory structure:</p>
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
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Copy the source files</h4>
                <p className="text-sm text-gray-400 mb-3">
                  Switch to the <strong>"All Source Files"</strong> tab above and copy each file into the correct location:
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
                  <div className="pl-4">├── test_cache.py</div>
                  <div className="pl-4">└── test_data.py</div>
                  <div>📄 pyproject.toml</div>
                  <div>📄 run.bat <span className="text-gray-600">(Windows only)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold mb-2">Install dependencies & run</h4>
                <p className="text-sm text-gray-400 mb-3">Install the required packages and launch the scanner:</p>
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
                  <div className="text-gray-600 mt-2"># Or with options:</div>
                  <div className="flex items-center justify-between">
                    <code className="text-green-400">python -m fx_scan.cli --force --pip-buffer 3</code>
                    <CopyButton text="python -m fx_scan.cli --force --pip-buffer 3" />
                  </div>
                  <div className="text-gray-600 mt-2"># Run tests (optional):</div>
                  <div className="flex items-center justify-between">
                    <code className="text-yellow-400">pip install pytest && pytest</code>
                    <CopyButton text="pip install pytest && pytest" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Copy All */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">📦 Copy All Files at Once</h4>
              <CopyButton text={allCode} />
            </div>
            <p className="text-sm text-gray-400">
              Click "Copy" to get all source files in one block (separated by file path headers). 
              You'll need to split them into the correct files manually.
            </p>
          </div>

          {/* Windows note */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
            <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
              <span>🪟</span> Windows Users
            </h4>
            <p className="text-sm text-gray-400">
              After setting up the files, you can simply double-click <code className="text-yellow-300 bg-gray-900 px-1 rounded">run.bat</code> in the project folder. 
              It will auto-install dependencies if needed and launch the scanner.
            </p>
          </div>
        </div>
      )}

      {activeSection === 'files' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400 mb-4">
            Click "Copy" on each file to copy its contents to your clipboard, then create the file at the shown path.
          </p>
          {pythonFiles.map((file) => (
            <FileCard key={file.path} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
