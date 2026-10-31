export default function Features() {
  const features = [
    {
      icon: '🔍',
      title: '18 Major FX Pairs',
      description: 'Comprehensive coverage of all major currency pairs including crosses (EUR/JPY, GBP/CHF, etc.)',
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
    },
    {
      icon: '📊',
      title: 'Inside Day Detection',
      description: 'Identifies completed candles strictly within previous day\'s range — a key consolidation signal.',
      color: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
    },
    {
      icon: '🚀',
      title: 'Closed In Breakout (CIB)',
      description: 'Detects closes beyond previous day\'s High/Low with pip-buffer tolerance. Wicks-only breaks excluded.',
      color: 'from-orange-500/20 to-orange-600/10',
      borderColor: 'border-orange-500/30',
    },
    {
      icon: '⚡',
      title: 'SQLite Cache',
      description: 'Smart caching with 1h TTL during market hours and 24h TTL on weekends. Zero redundant API calls.',
      color: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
    },
    {
      icon: '🎨',
      title: 'Color-Coded Output',
      description: 'Rich terminal tables with rows colored by candle direction (green/red/neutral), not signal type.',
      color: 'from-pink-500/20 to-pink-600/10',
      borderColor: 'border-pink-500/30',
    },
    {
      icon: '🧪',
      title: '45+ Pytest Tests',
      description: 'Comprehensive test coverage including timezone normalization, weekend cache logic, and edge cases.',
      color: 'from-cyan-500/20 to-cyan-600/10',
      borderColor: 'border-cyan-500/30',
    },
    {
      icon: '🔧',
      title: 'Pure Strategy Functions',
      description: 'No side effects in strategy detection. Easy to test, compose, and reason about.',
      color: 'from-yellow-500/20 to-yellow-600/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      icon: '🏗️',
      title: 'Clean Architecture',
      description: 'Separated concerns: config, cache, data, strategy, cli modules with clear boundaries.',
      color: 'from-indigo-500/20 to-indigo-600/10',
      borderColor: 'border-indigo-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature) => (
        <div
          key={feature.title}
          className={`rounded-xl border ${feature.borderColor} bg-gradient-to-br ${feature.color} p-5 backdrop-blur-sm transition-transform hover:scale-[1.02] hover:shadow-lg`}
        >
          <div className="text-2xl mb-3">{feature.icon}</div>
          <h3 className="text-sm font-bold text-white mb-1.5">{feature.title}</h3>
          <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
