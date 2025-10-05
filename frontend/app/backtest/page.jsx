'use client';

import { useState } from 'react';

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('NIFTY25O0724600CE');
  const [date, setDate] = useState('2025-10-01');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';
      const response = await fetch(
        `${apiUrl}/api/backtest?symbol=${symbol}&date=${date}&initialCapital=${initialCapital}`
      );

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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-text">📊 Backtest Dashboard</h1>

        {/* Input Form - Compact Modern Design */}
        <div className="bg-gradient-to-br from-surface to-surface/80 p-5 rounded-2xl shadow-xl mb-6 border border-border/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              <span>Backtest Configuration</span>
            </h2>
            <div className="text-xs text-text-secondary bg-primary/10 px-3 py-1 rounded-full">
              Strategy: Moving Average
            </div>
          </div>

          {/* Single Row Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
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

            {/* Initial Capital */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide flex items-center gap-1">
                <span>Initial Capital (₹)</span>
                <span className="text-[10px] font-normal text-text-secondary/60 normal-case">default: 100,000</span>
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

          {/* Strategy Parameters - Compact */}
          <div className="bg-background/30 backdrop-blur-sm p-3 rounded-xl mb-4 border border-border/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary">Position Size:</span>
                  <span className="font-bold text-primary">15%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary">Stop Loss:</span>
                  <span className="font-bold text-red-500">2%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary">Take Profit:</span>
                  <span className="font-bold text-green-500">5%</span>
                </div>
              </div>
              <div className="text-[10px] text-text-secondary/60 italic">
                Backend defaults
              </div>
            </div>
          </div>

          {/* Run Button - Compact Modern Gradient */}
          <button
            onClick={runBacktest}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary via-primary to-primary/90 text-white py-3 px-6 rounded-xl font-bold
                       shadow-lg shadow-primary/20
                       hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 hover:scale-[1.02]
                       active:scale-[0.98] active:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:scale-100
                       disabled:from-gray-400 disabled:to-gray-500
                       transition-all duration-300 ease-out"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Running Backtest...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>🚀</span> Run Backtest
              </span>
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg mb-8">
            ❌ Error: {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            {/* Summary Cards - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface p-4 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Net P/L</div>
                <div className={`text-xl font-bold ${result.netProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ₹{result.netProfitLoss.toFixed(2)}
                </div>
                <div className={`text-xs ${result.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {result.profitLossPercent.toFixed(2)}%
                </div>
              </div>

              <div className="bg-surface p-4 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Win Rate</div>
                <div className="text-xl font-bold text-primary">
                  {result.winRate.toFixed(2)}%
                </div>
                <div className="text-xs text-text-secondary">
                  {result.winningTrades}W / {result.losingTrades}L
                </div>
              </div>

              <div className="bg-surface p-4 rounded-lg shadow-lg">
                <div className="text-xs text-text-secondary mb-1">Profit Factor</div>
                <div className="text-xl font-bold text-text">
                  {result.profitFactor.toFixed(2)}
                </div>
                <div className="text-xs text-text-secondary">
                  {result.totalTrades} trades
                </div>
              </div>

              <div className="bg-surface p-4 rounded-lg shadow-lg">
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
            <div className="bg-surface p-4 rounded-lg shadow-lg">
              <h2 className="text-lg font-bold text-text mb-3">📈 Performance Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
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

            {/* Trade List - More Space */}
            <div className="bg-surface p-4 rounded-lg shadow-lg">
              <h2 className="text-lg font-bold text-text mb-3">📋 Trade History ({result.trades.length})</h2>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
                      <th className="px-4 py-3 bg-surface">Exit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="text-text">
                    {result.trades.map((trade) => (
                      <tr key={trade.tradeNumber} className="border-t border-border hover:bg-background/50">
                        <td className="px-4 py-2">{trade.tradeNumber}</td>
                        <td className="px-4 py-2">{trade.entryTime.substring(11, 19)}</td>
                        <td className="px-4 py-2">₹{trade.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2">{trade.exitTime.substring(11, 19)}</td>
                        <td className="px-4 py-2">₹{trade.exitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2">{trade.quantity}</td>
                        <td className={`px-4 py-2 font-medium ${trade.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ₹{trade.profitLoss.toFixed(2)}
                        </td>
                        <td className={`px-4 py-2 font-medium ${trade.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {trade.profitLossPercent.toFixed(2)}%
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
    </div>
  );
}
