'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/AppStateContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import ControlPanel from '@/components/ControlPanel';
import { configService } from '@/services/config/configService';

const CustomCandleChart = dynamic(() => import('@/components/CustomCandleChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4">
        </div>
        Loading custom candle chart...
      </div>
    </div>
  ),
});

const TIMEFRAMES = [
  { label: '5 Seconds', value: 5 },
  { label: '10 Seconds', value: 10 },
  { label: '15 Seconds', value: 15 },
  { label: '30 Seconds', value: 30 },
  { label: '1 Minute', value: 60 },
  { label: '5 Minutes', value: 300 },
  { label: '15 Minutes', value: 900 },
];

export default function CustomCandlesPage() {
  const { theme, toggleTheme } = useAppState();
  const [candleData, setCandleData] = useState(null);
  const [currentSymbol, setCurrentSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(60); // Default 1 minute

  const loadCandleData = async (params) => {
    setIsLoading(true);
    setError(null);
    setCandleData(null);

    try {
      await configService.loadConfig();
      const apiUrl = configService.getApiUrl();

      const queryParams = new URLSearchParams({
        symbol: params.symbol,
        date: params.date,
        timeframeSeconds: timeframe.toString(),
      });

      const response = await fetch(`${apiUrl}/api/custom-candles?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // Wrap the array in an object with candles property to match CustomCandleChart expectations
      setCandleData({ candles: data });
      setCurrentSymbol(params.symbol);
    } catch (error) {
      setError(`Failed to load candle data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderControls = () => (
    <div className="space-y-2">
      <ControlPanel
        onSubmit={loadCandleData}
        theme={theme}
        onThemeToggle={toggleTheme}
        hideLookbackPeriod={true}
      />

      {/* Timeframe Selector */}
      <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium" style={{ color: theme === 'dark' ? '#94a3b8' : '#475569' }}>
            Timeframe:
          </label>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                timeframe === tf.value
                  ? 'bg-blue-600 text-white scale-105'
                  : theme === 'dark'
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="🕯️"
      title="Custom Timeframe Candlesticks"
      description="Generate candlesticks from ticker data with custom timeframes"
      theme={theme}
      action={
        <div className="space-y-2">
          <p className="text-sm opacity-75">
            Choose from 5s, 10s, 15s, 30s, 1m, 5m, or 15m timeframes
          </p>
          <p className="text-sm opacity-75">
            All candles computed from raw ticker data
          </p>
        </div>
      }
    />
  );

  const clearError = () => setError(null);

  return (
    <PageLayout
      theme={theme}
      controls={renderControls()}
      error={error}
      onErrorDismiss={clearError}
      loading={isLoading}
      loadingMessage="Loading custom candles..."
    >
      <div className="flex-1 min-h-0 p-2">
        {candleData && candleData.candles && candleData.candles.length > 0 ? (
          <div className="h-full rounded-lg overflow-hidden shadow-lg">
            <CustomCandleChart
              data={candleData}
              theme={theme}
              symbol={currentSymbol}
              timeframe={timeframe}
            />
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </PageLayout>
  );
}
