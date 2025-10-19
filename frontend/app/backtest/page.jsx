'use client';

import { useState, useEffect } from 'react';
import TradeChart from '@/components/TradeChart';
import { configService } from '@/services/config/configService';

const CACHE_KEY = 'backtest-params';

// Format time string to HH:MM:SS
const formatTime = (isoString) => {
  if (!isoString) return '';
  // Extract time portion from ISO string: "2025-10-01T09:33:28" -> "09:33:28"
  return isoString.substring(11, 19);
};

// Load cached values from localStorage
const loadCachedParams = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// Save values to localStorage
const saveCachedParams = (params) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(params));
  } catch {
    // Silent fail - not critical
  }
};

export default function BacktestPage() {
  // Load cached values or use defaults - use function initialization to avoid re-loading
  const [symbol, setSymbol] = useState(() => loadCachedParams()?.symbol || 'NIFTY25O0724600CE');
  const [date, setDate] = useState(() => loadCachedParams()?.date || '2025-10-01');
  const [initialCapital, setInitialCapital] = useState(() => loadCachedParams()?.initialCapital || 100000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [selectedTradeIndex, setSelectedTradeIndex] = useState(null);

  // Strategy selection state
  const [availableStrategies, setAvailableStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(() => loadCachedParams()?.selectedStrategy || '');
  const [stopLossPercent, setStopLossPercent] = useState(() => loadCachedParams()?.stopLossPercent || '');
  const [takeProfitPercent, setTakeProfitPercent] = useState(() => loadCachedParams()?.takeProfitPercent || '');

  // Phase filtering state
  const [phaseFilteringEnabled, setPhaseFilteringEnabled] = useState(() => loadCachedParams()?.phaseFilteringEnabled || false);
  const [selectedPhases, setSelectedPhases] = useState(() => loadCachedParams()?.selectedPhases || ['MARKDOWN', 'DISTRIBUTION']);
  const availablePhases = ['ACCUMULATION', 'MARKUP', 'DISTRIBUTION', 'MARKDOWN', 'UNKNOWN'];

  // Track if we've loaded from cache to avoid overwriting with defaults
  const [hasLoadedFromCache] = useState(() => {
    const cached = loadCachedParams();
    return !!(cached?.selectedStrategy || cached?.initialCapital);
  });

  // Cache params whenever they change
  useEffect(() => {
    saveCachedParams({
      symbol,
      date,
      initialCapital,
      selectedStrategy,
      stopLossPercent,
      takeProfitPercent,
      phaseFilteringEnabled,
      selectedPhases
    });
  }, [symbol, date, initialCapital, selectedStrategy, stopLossPercent, takeProfitPercent, phaseFilteringEnabled, selectedPhases]);

  // Fetch available strategies on mount
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const apiUrl = configService.getApiUrl();
        const response = await fetch(`${apiUrl}/api/backtest/strategies`);
        if (response.ok) {
          const data = await response.json();
          setAvailableStrategies(data.strategies || []);
          // Only update strategy and capital if not already loaded from cache
          if (!hasLoadedFromCache) {
            if (data.defaultStrategy) setSelectedStrategy(data.defaultStrategy);
            if (data.defaultInitialCapital) setInitialCapital(data.defaultInitialCapital);
          }
        }
      } catch {
        // Failed to fetch strategies - will use defaults
      }
    };
    fetchStrategies();
  }, [hasLoadedFromCache]);

  // Keyboard navigation for trades
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!result || !result.trades || result.trades.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectedTradeIndex === null) {
          // No selection, select first trade
          setSelectedTrade(result.trades[0]);
          setSelectedTradeIndex(0);
        } else if (selectedTradeIndex < result.trades.length - 1) {
          // Move to next trade
          const newIndex = selectedTradeIndex + 1;
          setSelectedTrade(result.trades[newIndex]);
          setSelectedTradeIndex(newIndex);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectedTradeIndex === null) {
          // No selection, select last trade
          const lastIndex = result.trades.length - 1;
          setSelectedTrade(result.trades[lastIndex]);
          setSelectedTradeIndex(lastIndex);
        } else if (selectedTradeIndex > 0) {
          // Move to previous trade
          const newIndex = selectedTradeIndex - 1;
          setSelectedTrade(result.trades[newIndex]);
          setSelectedTradeIndex(newIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, selectedTradeIndex]);

  // Auto-scroll selected trade into view when using keyboard navigation
  useEffect(() => {
    if (selectedTradeIndex !== null && result?.trades) {
      const tradeRow = document.querySelector(`tbody tr:nth-child(${selectedTradeIndex + 1})`);
      if (tradeRow) {
        tradeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedTradeIndex, result]);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    setSelectedTrade(null);
    setSelectedTradeIndex(null);
    try {
      const apiUrl = configService.getApiUrl();

      // Build query params
      const params = new URLSearchParams({
        symbol,
        date,
        initialCapital: initialCapital.toString()
      });

      // Add optional overrides
      if (selectedStrategy) params.append('strategyName', selectedStrategy);
      if (stopLossPercent) params.append('stopLossPercent', stopLossPercent);
      if (takeProfitPercent) params.append('takeProfitPercent', takeProfitPercent);

      // Add phase filtering parameters
      params.append('phaseFilteringEnabled', phaseFilteringEnabled.toString());
      if (phaseFilteringEnabled && selectedPhases.length > 0) {
        params.append('allowedPhases', selectedPhases.join(','));
      }

      const response = await fetch(`${apiUrl}/api/backtest?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <div className="flex-1 flex gap-4 p-6 overflow-hidden">
        {/* Left Panel - Configuration & Results */}
        <div className="w-1/2 flex flex-col gap-4 pr-2 overflow-hidden">
          {/* Input Form - Compact Modern Design */}
          <div className="bg-gradient-to-br from-surface to-surface/80 p-3 rounded-2xl shadow-xl border border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <span>Backtest Configuration</span>
            </h2>
            {selectedStrategy && (
              <div className="text-xs text-text-secondary bg-primary/10 px-3 py-1 rounded-full">
                Strategy: {selectedStrategy}
              </div>
            )}
          </div>

          {/* Single Row Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            {/* Symbol */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="NIFTY25O0724600CE"
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-black text-sm
                           placeholder:text-gray-500 font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white
                           hover:border-primary/30 hover:bg-white
                           transition-all duration-200"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-black text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white
                           hover:border-primary/30 hover:bg-white
                           transition-all duration-200"
              />
            </div>

            {/* Strategy Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Strategy
              </label>
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-black text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white
                           hover:border-primary/30 hover:bg-white
                           transition-all duration-200"
              >
                {availableStrategies.map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {strategy}
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Capital (₹)
              </label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                placeholder="100000"
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-black text-sm
                           placeholder:text-gray-500 font-medium
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white
                           hover:border-primary/30 hover:bg-white
                           transition-all duration-200"
              />
            </div>
          </div>

          {/* Strategy Parameters - Enhanced with Overrides */}
          <div className="bg-background/30 backdrop-blur-sm p-2 rounded-xl mb-2 border border-border/30">
            <div className="grid grid-cols-2 gap-2">
              {/* Stop Loss */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1">
                  Stop Loss (%)
                  <span className="text-[10px] font-normal text-text-secondary/60 normal-case">optional</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(e.target.value)}
                  placeholder="2.0 (default)"
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-black text-sm
                             placeholder:text-gray-500 font-medium
                             focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 focus:bg-white
                             hover:border-red-500/30 hover:bg-white
                             transition-all duration-200"
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1">
                  Take Profit (%)
                  <span className="text-[10px] font-normal text-text-secondary/60 normal-case">optional</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={takeProfitPercent}
                  onChange={(e) => setTakeProfitPercent(e.target.value)}
                  placeholder="5.0 (default)"
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-black text-sm
                             placeholder:text-gray-500 font-medium
                             focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white
                             hover:border-green-500/30 hover:bg-white
                             transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Phase Filtering - New Section */}
          <div className="bg-background/30 backdrop-blur-sm p-2 rounded-xl mb-2 border border-border/30">
            {/* Phase Filtering Checkbox */}
            <div className="mb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={phaseFilteringEnabled}
                  onChange={(e) => setPhaseFilteringEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-gray-300 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide group-hover:text-primary transition-colors">
                  📊 Filter by Market Phase
                </span>
                <span className="text-[10px] font-normal text-text-secondary/60 normal-case">(Wyckoff Cycle)</span>
              </label>
            </div>

            {/* Phase Multi-Select - Only show when filtering is enabled */}
            {phaseFilteringEnabled && (
              <div className="space-y-1.5 ml-6">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Allowed Phases
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {availablePhases.map((phase) => (
                    <label key={phase} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedPhases.includes(phase)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPhases([...selectedPhases, phase]);
                          } else {
                            setSelectedPhases(selectedPhases.filter(p => p !== phase));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-2 border-gray-300 text-primary focus:ring-2 focus:ring-primary/50 cursor-pointer"
                      />
                      <span className="text-xs text-text font-medium group-hover:text-primary transition-colors">
                        {phase}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Run Button - Enhanced Gradient with Glow */}
          <button
            onClick={runBacktest}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white py-2 px-6 rounded-xl font-bold
                       shadow-lg shadow-green-500/30
                       hover:shadow-2xl hover:shadow-green-500/50 hover:-translate-y-1 hover:scale-[1.03]
                       active:scale-[0.97] active:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:scale-100
                       disabled:from-gray-400 disabled:to-gray-500
                       transition-all duration-300 ease-out
                       relative overflow-hidden group"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
            {loading ? (
              <span className="flex items-center justify-center gap-2 relative z-10">
                <span className="animate-spin">⏳</span> Running Backtest...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 relative z-10">
                <span>🚀</span> Run Backtest
              </span>
            )}
          </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
              ❌ Error: {error}
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="flex flex-col gap-2">
              {/* Summary Cards - Compact */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-surface p-3 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Net P/L</div>
                <div className={`text-xl font-bold ${result.netProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{result.netProfitLoss.toFixed(2)}
                </div>
                <div className={`text-xs ${result.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {result.profitLossPercent.toFixed(2)}%
                </div>
              </div>

              <div className="bg-surface p-3 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Win Rate</div>
                <div className="text-xl font-bold text-primary">
                  {result.winRate.toFixed(2)}%
                </div>
                <div className="text-xs text-text-secondary">
                  {result.winningTrades}W / {result.losingTrades}L
                </div>
              </div>

              <div className="bg-surface p-3 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Profit Factor</div>
                <div className="text-xl font-bold text-text">
                  {result.profitFactor.toFixed(2)}
                </div>
                <div className="text-xs text-text-secondary">
                  {result.totalTrades} trades
                </div>
              </div>

              <div className="bg-surface p-3 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Sharpe Ratio</div>
                <div className="text-xl font-bold text-text">
                  {result.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-xs text-text-secondary">
                  Max DD: {result.maxDrawdownPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Detailed Metrics - Compact */}
            <div className="bg-surface p-3 rounded-lg shadow-lg">
              <h2 className="text-base font-bold text-text mb-2">📈 Performance Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-text-secondary">Strategy:</span>
                  <span className="ml-2 text-text font-medium">{result.strategyName}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Symbol:</span>
                  <span className="ml-2 text-text font-medium">{result.symbol}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Initial Capital:</span>
                  <span className="ml-2 text-text font-medium">₹{result.initialCapital.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Final Value:</span>
                  <span className="ml-2 text-text font-medium">₹{result.finalValue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Average Win:</span>
                  <span className="ml-2 text-green-500 font-medium">₹{result.averageWin.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Average Loss:</span>
                  <span className="ml-2 text-red-500 font-medium">₹{result.averageLoss.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Largest Win:</span>
                  <span className="ml-2 text-green-500 font-medium">₹{result.largestWin.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Largest Loss:</span>
                  <span className="ml-2 text-red-500 font-medium">₹{result.largestLoss.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Max Drawdown:</span>
                  <span className="ml-2 text-text font-medium">₹{result.maxDrawdown.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Trade List - Scrollable Panel with Fixed Height */}
            <div className="bg-surface p-3 rounded-lg shadow-lg flex flex-col max-h-[700px]">
              <h2 className="text-base font-bold text-text mb-2">📋 Trade History ({result.trades.length})</h2>
              <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 pb-6">
                <table className="w-full text-sm">
                  <thead className="bg-surface sticky top-0 z-10 shadow-md">
                    <tr className="text-left text-text-secondary border-b-2 border-border">
                      <th className="px-4 py-3 bg-surface">#</th>
                      <th className="px-4 py-3 bg-surface">Entry Time</th>
                      <th className="px-4 py-3 bg-surface">Entry Price</th>
                      <th className="px-4 py-3 bg-surface">Exit Time</th>
                      <th className="px-4 py-3 bg-surface">Exit Price</th>
                      <th className="px-4 py-3 bg-surface">Qty</th>
                      <th className="px-4 py-3 bg-surface">P/L</th>
                      <th className="px-4 py-3 bg-surface">P/L %</th>
                      <th className="px-4 py-3 bg-surface">Phase</th>
                      <th className="px-4 py-3 bg-surface">Exit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="text-text">
                    {result.trades.map((trade, index) => (
                      <tr
                        key={trade.tradeNumber}
                        onClick={() => {
                          setSelectedTrade(trade);
                          setSelectedTradeIndex(index);
                        }}
                        className={`border-t border-border cursor-pointer transition-all duration-200 ${
                          selectedTrade?.tradeNumber === trade.tradeNumber
                            ? 'bg-gradient-to-r from-blue-500/20 via-blue-400/15 to-blue-500/20 border-l-4 border-l-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.01] font-semibold'
                            : 'hover:bg-accent/20 hover:shadow-md'
                        }`}
                      >
                        <td className="px-4 py-2">{trade.tradeNumber}</td>
                        <td className="px-4 py-2 font-mono">{formatTime(trade.entryTime)}</td>
                        <td className="px-4 py-2">₹{trade.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 font-mono">{formatTime(trade.exitTime)}</td>
                        <td className="px-4 py-2">₹{trade.exitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2">{trade.quantity}</td>
                        <td className={`px-4 py-2 font-medium ${trade.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ₹{trade.profitLoss.toFixed(2)}
                        </td>
                        <td className={`px-4 py-2 font-medium ${trade.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.profitLossPercent.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2">
                          {trade.phase ? (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              trade.phase === 'MARKDOWN' ? 'bg-red-500/20 text-red-400' :
                              trade.phase === 'DISTRIBUTION' ? 'bg-orange-500/20 text-orange-400' :
                              trade.phase === 'MARKUP' ? 'bg-green-500/20 text-green-400' :
                              trade.phase === 'ACCUMULATION' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {trade.phase}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trade.exitReason === 'TAKE_PROFIT' ? 'bg-green-500/20 text-green-500' :
                              trade.exitReason === 'STOP_LOSS' ? 'bg-red-500/20 text-red-500' :
                                trade.exitReason === 'SIGNAL' ? 'bg-blue-500/20 text-blue-500' :
                                  'bg-gray-500/20 text-gray-500'
                          }`}>
                            {trade.exitReason.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Right Panel - Chart Visualization */}
        <div className="w-1/2 flex flex-col gap-4">
          {result && selectedTrade ? (
            <div className="bg-surface p-4 rounded-lg shadow-lg h-full flex flex-col">
              <h2 className="text-lg font-bold text-text mb-4">
                📈 Trade #{selectedTrade.tradeNumber} - Chart Pattern
              </h2>
              <div className="flex-1 min-h-0 flex flex-col gap-4">
                <div className="h-2/3">
                  <TradeChart
                    trade={selectedTrade}
                    tickers={result.tickers}
                  />
                </div>

                {/* Trade Details Section */}
                <div className="h-1/3 bg-background/30 rounded-lg p-4 overflow-y-auto">
                  <h3 className="text-sm font-bold text-text mb-3">📋 Trade Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-text-secondary">Entry Time:</span>
                      <span className="ml-2 text-text font-medium font-mono text-sm">{formatTime(selectedTrade.entryTime)}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Exit Time:</span>
                      <span className="ml-2 text-text font-medium font-mono text-sm">{formatTime(selectedTrade.exitTime)}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Entry Price:</span>
                      <span className="ml-2 text-text font-medium">₹{selectedTrade.entryPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Exit Price:</span>
                      <span className="ml-2 text-text font-medium">₹{selectedTrade.exitPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Quantity:</span>
                      <span className="ml-2 text-text font-medium">{selectedTrade.quantity}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Exit Reason:</span>
                      <span className={`ml-2 font-medium ${
                        selectedTrade.exitReason === 'TAKE_PROFIT' ? 'text-green-500' :
                          selectedTrade.exitReason === 'STOP_LOSS' ? 'text-red-500' :
                            'text-blue-500'
                      }`}>
                        {selectedTrade.exitReason.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">P/L:</span>
                      <span className={`ml-2 font-bold ${selectedTrade.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ₹{selectedTrade.profitLoss.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">P/L %:</span>
                      <span className={`ml-2 font-bold ${selectedTrade.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {selectedTrade.profitLossPercent.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Holding Period:</span>
                      <span className="ml-2 text-text font-medium">{selectedTrade.holdingPeriod}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Trade Type:</span>
                      <span className="ml-2 text-text font-medium">{selectedTrade.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface/50 p-8 rounded-lg shadow-lg h-full flex items-center justify-center">
              <div className="text-center text-text-secondary">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold mb-2">No Trade Selected</h3>
                <p className="text-sm">Click on any trade in the history to view its chart pattern</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
