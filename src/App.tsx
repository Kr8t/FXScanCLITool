import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CodeBrowser from './components/CodeBrowser';
import Features from './components/Features';
import Architecture from './components/Architecture';
import DownloadGuide from './components/DownloadGuide';

type Tab = 'download' | 'dashboard' | 'code' | 'architecture' | 'features';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('download');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'download', label: 'Download & Run', icon: '⬇️' },
    { id: 'dashboard', label: 'Live Output', icon: '📺' },
    { id: 'code', label: 'Source Code', icon: '💻' },
    { id: 'architecture', label: 'Architecture', icon: '🏗️' },
    { id: 'features', label: 'Features', icon: '✨' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-cyan-500/20">
                FX
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">FX SCAN</h1>
                <p className="text-xs text-gray-500 -mt-0.5">Major FX Pair Signal Scanner</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs text-gray-500 font-mono bg-gray-900 px-2 py-1 rounded border border-gray-800">
                Python 3.10+ • yfinance • rich • SQLite
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          {activeTab === 'download' && (
            <div>
              <h2 className="text-2xl font-bold text-white">Download & Run on Your Computer</h2>
              <p className="text-sm text-gray-400 mt-1">
                Complete Python source code ready to run locally — all files available for copy/download below
              </p>
            </div>
          )}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-white">Simulated Scanner Output</h2>
              <p className="text-sm text-gray-400 mt-1">
                Preview of what <code className="text-cyan-400 bg-gray-900 px-1.5 py-0.5 rounded text-xs">fx-scan</code> renders in the terminal
              </p>
            </div>
          )}
          {activeTab === 'code' && (
            <div>
              <h2 className="text-2xl font-bold text-white">Source Code</h2>
              <p className="text-sm text-gray-400 mt-1">
                Complete implementation across 5 core modules + tests + CI config
              </p>
            </div>
          )}
          {activeTab === 'architecture' && (
            <div>
              <h2 className="text-2xl font-bold text-white">Architecture & Design</h2>
              <p className="text-sm text-gray-400 mt-1">
                File structure, data flow, and strategy detection rules
              </p>
            </div>
          )}
          {activeTab === 'features' && (
            <div>
              <h2 className="text-2xl font-bold text-white">Key Features</h2>
              <p className="text-sm text-gray-400 mt-1">
                What makes FX SCAN a robust CLI tool for FX analysis
              </p>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'download' && <DownloadGuide />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'code' && <CodeBrowser />}
        {activeTab === 'architecture' && <Architecture />}
        {activeTab === 'features' && <Features />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-mono text-cyan-400">fx-scan</span>
              <span>v1.0.0</span>
              <span>•</span>
              <span>Python 3.10+</span>
              <span>•</span>
              <span>MIT License</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>45+ tests</span>
              <span>•</span>
              <span>Ruff + MyPy</span>
              <span>•</span>
              <span>GitHub Actions CI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
