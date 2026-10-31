import { useState } from 'react';
import Dashboard from './components/Dashboard';
import CodeBrowser from './components/CodeBrowser';
import Features from './components/Features';
import Architecture from './components/Architecture';

type Tab = 'dashboard' | 'code' | 'architecture' | 'features';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const tabs: { id: Tab; label: string; icon: string }[] = [
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
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
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
