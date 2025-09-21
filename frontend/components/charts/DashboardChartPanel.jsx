'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { configService } from '@/services/config/configService';
import { DashboardChart } from './index';

/**
 * DashboardChartPanel - A chart panel specifically designed for the dashboard
 * Supports individual symbol loading and includes crosshair and Wyckoff phases
 */
export const DashboardChartPanel = ({ index, theme, globalDate, sharedViewState, onViewStateChange }) => {
  const [stockData, setStockData] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  // Load symbol from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`dashboard_symbol_${index}`);
      if (saved) setSymbol(saved);
    }
  }, [index]);

  const loadData = useCallback(async (stockSymbol, date) => {
    if (!stockSymbol || !date) return;

    setIsLoading(true);
    setError(null);

    try {
      await configService.loadConfig();
      const apiUrl = configService.getApiUrl();
      const params = new URLSearchParams({ symbol: stockSymbol, date });
      const response = await fetch(`${apiUrl}/api/charts?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setStockData({
        candles: result.candlesticks,
        wyckoffPhases: result.wyckoffPhases,
        currentPhase: result.currentPhase,
        symbol: stockSymbol,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for load all event
  useEffect(() => {
    const handleLoadAll = event => {
      if (symbol && event.detail.date) {
        loadData(symbol, event.detail.date);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('loadAllCharts', handleLoadAll);
      return () => window.removeEventListener('loadAllCharts', handleLoadAll);
    }
  }, [symbol, loadData]);

  // Listen for reset zoom event
  useEffect(() => {
    const handleResetZoom = () => {
      if (chartRef.current) {
        const canvas = chartRef.current.querySelector('canvas');
        if (canvas && canvas._chartControls && canvas._chartControls.resetView) {
          canvas._chartControls.resetView();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resetZoom', handleResetZoom);
      return () => window.removeEventListener('resetZoom', handleResetZoom);
    }
  }, []);

  const handleSymbolChange = e => {
    const newSymbol = e.target.value;
    setSymbol(newSymbol);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`dashboard_symbol_${index}`, newSymbol);
    }
  };

  const handleLoad = () => {
    if (symbol && globalDate) {
      setStockData(null);
      loadData(symbol, globalDate);
    }
  };

  const colors = {
    dark: { bg: '#1e293b', border: '#475569', text: '#f1f5f9', input: '#0f172a' },
    light: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', input: '#f9fafb' },
  };
  const c = colors[theme];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: c.bg }}>
      <div className="p-1 border-b flex items-center gap-1" style={{ borderColor: c.border }}>
        <input
          type="text"
          value={symbol}
          onChange={handleSymbolChange}
          placeholder={`Symbol ${index + 1}`}
          className="flex-1 px-2 py-1 rounded text-sm"
          style={{ backgroundColor: c.input, border: `1px solid ${c.border}`, color: c.text }}
        />
        <button
          onClick={handleLoad}
          disabled={isLoading || !symbol}
          className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700
                     disabled:opacity-50"
        >
          {isLoading ? '⏳' : '⚡'}
        </button>
      </div>
      <div ref={chartRef} className="flex-1 relative" style={{ overflow: 'hidden' }}>
        {error ? (
          <div className="flex items-center justify-center h-full text-red-400">
            <div className="text-center">
              <div>❌</div>
              <div className="text-xs mt-1">Error loading data</div>
            </div>
          </div>
        ) : stockData ? (
          <DashboardChart
            data={stockData}
            theme={theme}
            sharedViewState={sharedViewState}
            onViewStateChange={onViewStateChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: c.text }}>
            <div className="text-center">
              <div>📊</div>
              <div className="text-sm mt-1">Enter symbol and click ⚡</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardChartPanel;
