'use client';

import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/AppStateContext';
import { configService } from '@/services/config/configService';
import { getDashboardTheme, getButtonStyles, getInputStyles, getCardStyles, toInlineStyles } from '@/utils/theme';

const CandleChart = dynamic(() => import('@/components/CandleChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2">
        </div>
                Loading chart...
      </div>
    </div>
  ),
});

// Sync context for chart synchronization
const SyncContext = createContext();

const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider');
  }
  return context;
};

const SyncProvider = ({ children }) => {
  const [syncState, setSyncState] = useState({
    zoom: 1,
    offset: 0,
    isDragging: false,
  });

  const updateSyncState = useCallback(newState => {
    setSyncState(prev => ({ ...prev, ...newState }));
  }, []);

  // Listen for reset zoom event
  useEffect(() => {
    const handleResetZoom = () => {
      setSyncState({ zoom: 1, offset: 0, isDragging: false });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resetZoom', handleResetZoom);
      return () => window.removeEventListener('resetZoom', handleResetZoom);
    }
  }, []);

  return (
    <SyncContext.Provider value={{ syncState, updateSyncState }}>{children}</SyncContext.Provider>
  );
};

// Synchronized Chart Component
const SyncedChart = ({ data, theme, showWyckoffPhases = false }) => {
  const { syncState, updateSyncState } = useSyncContext();
  const chartRef = useRef(null);

  const syncedViewState = {
    zoom: syncState.zoom,
    offset: syncState.offset,
    targetOffset: syncState.offset,
    velocity: 0,
  };

  // Handle synchronized zoom and pan
  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement || !data) return;

    const handleWheel = e => {
      e.preventDefault();
      e.stopPropagation();

      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth = rect.width - 100;
      const mouseRatio = (x - 50) / chartWidth;

      // Improved zoom behavior - minimum 100% (1.0x), maximum 20x zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(1.0, Math.min(20, syncState.zoom * zoomFactor));

      // Calculate offset adjustment to keep zoom centered on mouse position
      const totalWidth = chartWidth * syncState.zoom;
      const newTotalWidth = chartWidth * newZoom;
      const widthChange = newTotalWidth - totalWidth;

      const newOffset = syncState.offset - widthChange * mouseRatio;

      // Calculate proper bounds for offset
      const maxOffset = 0;
      const minOffset = Math.min(0, chartWidth - newTotalWidth);
      const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

      updateSyncState({
        zoom: newZoom,
        offset: clampedOffset,
      });
    };

    const handleMouseDown = e => {
      updateSyncState({ isDragging: true });
      const startX = e.clientX;
      const startOffset = syncState.offset;

      const handleMouseMove = e => {
        const dx = e.clientX - startX;
        const newOffset = startOffset + dx;
        updateSyncState({ offset: newOffset });
      };

      const handleMouseUp = () => {
        updateSyncState({ isDragging: false });
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    chartElement.addEventListener('wheel', handleWheel, { passive: false });
    chartElement.addEventListener('mousedown', handleMouseDown);

    return () => {
      chartElement.removeEventListener('wheel', handleWheel);
      chartElement.removeEventListener('mousedown', handleMouseDown);
    };
  }, [data, syncState, updateSyncState]);

  if (!data) return null;

  return (
    <div ref={chartRef} className="w-full h-full" style={{ overflow: 'visible' }}>
      <CandleChart
        data={data}
        theme={theme}
        externalViewState={syncedViewState}
        isDashboard={true}
        showWyckoffPhases={showWyckoffPhases}
      />
    </div>
  );
};

// Simple chart component
const SimpleChart = ({ index, theme, globalDate }) => {
  const [stockData, setStockData] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const themeColors = getDashboardTheme(theme);
  const inputStyles = getInputStyles(theme);
  const buttonStyles = getButtonStyles(theme, 'primary', 'sm');

  // Load symbol from localStorage on mount, with defaults
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`dashboard_symbol_${index}`);
      if (saved) {
        setSymbol(saved);
      } else {
        // Set default symbols for better UX
        // Note: Currently only 'NIFTY 50' has available data
        // TODO: Update when more symbols become available
        const defaultSymbols = ['NIFTY 50', 'NIFTY 50', 'NIFTY 50', 'NIFTY 50'];
        const defaultSymbol = defaultSymbols[index] || 'NIFTY 50';
        setSymbol(defaultSymbol);
        localStorage.setItem(`dashboard_symbol_${index}`, defaultSymbol);
      }
    }
  }, [index]);

  const loadData = useCallback(async (stockSymbol, date) => {
    if (!stockSymbol || !date) return;

    setIsLoading(true);
    setError(null);

    try {
      await configService.loadConfig();
      const apiUrl = configService.getApiUrl();
      // Normalize symbol to uppercase for API compatibility
      const normalizedSymbol = stockSymbol.trim().toUpperCase();
      const params = new URLSearchParams({
        symbol: normalizedSymbol,
        date,
        lookbackPeriod: 3 // Default lookback period for extrema detection
      });
      const response = await fetch(`${apiUrl}/api/ohlc?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setStockData({
        candles: result.candles,
        maxima: result.maxima,
        minima: result.minima,
        wyckoffPhases: result.wyckoffPhases,
        currentPhase: result.currentPhase,
        symbol: normalizedSymbol,
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

  // Theme colors already defined above

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: themeColors.background.primary }}>
      <div
        className="p-2 border-b flex items-center gap-2"
        style={{
          borderColor: themeColors.border.primary,
          backgroundColor: themeColors.background.secondary
        }}
      >
        <input
          type="text"
          value={symbol}
          onChange={handleSymbolChange}
          placeholder={`Symbol ${index + 1}`}
          className="flex-1 transition-all"
          style={toInlineStyles(inputStyles)}
        />
        <button
          onClick={handleLoad}
          disabled={isLoading || !symbol}
          className="transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={toInlineStyles(buttonStyles)}
        >
          {isLoading ? '⏳' : '⚡'}
        </button>
      </div>
      <div className="flex-1 relative" style={{ overflow: 'hidden' }}>
        {error ? (
          <div className="flex items-center justify-center h-full" style={{ color: themeColors.interactive.danger }}>
            <div className="text-center">
              <div>❌</div>
              <div className="text-xs mt-1" style={{ color: themeColors.text.secondary }}>Error loading data</div>
            </div>
          </div>
        ) : stockData ? (
          <SyncedChart data={stockData} theme={theme} chartId={index} showWyckoffPhases={true} />
        ) : (
          <div className="flex items-center justify-center h-full" style={{ color: themeColors.text.secondary }}>
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

export default function DashboardPage() {
  const { theme, toggleTheme, date, updateDate } = useAppState();
  const themeColors = getDashboardTheme(theme);
  const inputStyles = getInputStyles(theme);

  const loadAllCharts = () => {
    const event = new CustomEvent('loadAllCharts', { detail: { date } });
    window.dispatchEvent(event);
  };

  const resetAllCharts = () => {
    const event = new CustomEvent('resetZoom');
    window.dispatchEvent(event);
  };

  // Utility functions for date navigation (skip weekends)
  const getPreviousDate = currentDate => {
    const date = new Date(currentDate);
    do {
      date.setDate(date.getDate() - 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sunday (0) and Saturday (6)
    return date.toISOString().split('T')[0];
  };

  const getNextDate = currentDate => {
    const date = new Date(currentDate);
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sunday (0) and Saturday (6)
    return date.toISOString().split('T')[0];
  };

  const handlePreviousDate = () => {
    const prevDate = getPreviousDate(date);
    updateDate(prevDate);
  };

  const handleNextDate = () => {
    const nextDate = getNextDate(date);
    updateDate(nextDate);
  };

  return (
    <SyncProvider>
      <div
        className="flex flex-col"
        style={{
          backgroundColor: themeColors.background.primary,
          height: 'calc(100vh - 64px)', // Account for main nav header (h-16 = 64px)
          width: '100vw',
          overflow: 'hidden',
          backgroundImage: theme === 'light' ? `linear-gradient(135deg, ${themeColors.background.primary} 0%, ${themeColors.background.secondary} 100%)` : 'none',
        }}
      >
        {/* Dashboard Header - Fixed height */}
        <div
          className="flex-shrink-0 border-b backdrop-blur-sm"
          style={{
            backgroundColor: themeColors.surface.primary,
            borderColor: themeColors.border.primary,
            height: '64px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: themeColors.effects.shadow.md,
            backdropFilter: 'blur(8px)',
          }}
        >
          <h1 className="text-xl font-bold" style={{ color: themeColors.text.primary }}>
            <span style={{ color: themeColors.interactive.primary }}>📊</span> Multi-Stock Dashboard
          </h1>
          <div className="flex items-center gap-3">
            {/* Date Navigation */}
            <button
              onClick={handlePreviousDate}
              className="transition-all hover:scale-105"
              style={toInlineStyles(getButtonStyles(theme, 'secondary', 'sm'))}
              title="Previous Day"
            >
              ◀
            </button>
            <input
              type="date"
              value={date}
              onChange={e => updateDate(e.target.value)}
              className="font-medium transition-all"
              style={toInlineStyles(inputStyles)}
            />
            <button
              onClick={handleNextDate}
              className="transition-all hover:scale-105"
              style={toInlineStyles(getButtonStyles(theme, 'secondary', 'sm'))}
              title="Next Day"
            >
              ▶
            </button>
            <button
              onClick={loadAllCharts}
              className="transition-all"
              style={toInlineStyles(getButtonStyles(theme, 'success', 'sm'))}
              title="Load All Charts"
            >
              ⚡📊
            </button>
            <button
              onClick={resetAllCharts}
              className="transition-all"
              style={toInlineStyles(getButtonStyles(theme, 'danger', 'sm'))}
              title="Reset All"
            >
              🧹
            </button>
            <button
              onClick={toggleTheme}
              className="transition-all hover:scale-105"
              style={toInlineStyles(getButtonStyles(theme, 'secondary', 'sm'))}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Chart Grid - Calculated height accounting for both headers */}
        <div
          style={{
            height: 'calc(100vh - 64px - 64px)', // Full height minus headers (updated for new header height)
            padding: '2px',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '6px',
          }}
        >
          {[0, 1, 2, 3].map(index => (
            <div
              key={index}
              className="flex flex-col transition-all duration-200"
              style={{
                ...toInlineStyles(getCardStyles(theme, true)),
                minHeight: 0,
                height: '100%',
                width: '100%',
                overflow: 'visible',
              }}
            >
              <SimpleChart index={index} theme={theme} globalDate={date} />
            </div>
          ))}
        </div>
      </div>
    </SyncProvider>
  );
}
