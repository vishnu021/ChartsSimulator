'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTickerData } from '@/hooks/useTickerData';
import { useAppState } from '@/contexts/AppStateContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsBar } from '@/components/ui/StatsBar';
import { Card } from '@/components/ui/Card';
import ControlPanel from '@/components/ControlPanel';

const TickerChart = dynamic(() => import('@/components/TickerChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        Loading ticker chart...
      </div>
    </div>
  ),
});

export default function TickerPage() {
  const { theme, toggleTheme } = useAppState();
  const {
    tickerData,
    stats,
    currentSymbol,
    isRealTime,
    isLoading,
    error,
    loadTickerData,
    toggleMode,
    clearError,
  } = useTickerData();

  const generateHeaderStats = () => {
    if (tickerData.length === 0) return [];

    return [
      {
        label: 'Symbol',
        value: currentSymbol,
        color: 'text-white',
      },
      {
        label: 'Current',
        value: `₹${stats.currentPrice.toFixed(2)}`,
        color: 'text-white',
      },
      {
        label: 'Change',
        value: `${stats.change >= 0 ? '+' : ''}₹${stats.change.toFixed(2)} (${stats.changePercent >= 0 ? '+' : ''}${stats.changePercent.toFixed(2)}%)`,
        color: stats.change >= 0 ? 'text-green-400' : 'text-red-400',
      },
      {
        label: 'Range',
        value: `₹${stats.low.toFixed(2)} - ₹${stats.high.toFixed(2)}`,
        color: 'text-white',
      },
      {
        label: 'Volume',
        value: stats.volume.toLocaleString(),
        color: 'text-white',
      },
      {
        label: 'Data',
        value: `${stats.count.toLocaleString()} ticks`,
        color: 'text-blue-400',
      },
    ];
  };

  const renderControls = () => (
    <ControlPanel
      onSubmit={loadTickerData}
      theme={theme}
      onThemeToggle={toggleTheme}
      hideLookbackPeriod={true}
      showModeToggle={true}
      isRealTime={isRealTime}
      onModeToggle={toggleMode}
    />
  );

  // const renderHeader = () => {
  //   if (tickerData.length === 0) return null;
  //   return (
  //     <Card theme={theme} className="mx-4 mb-2">
  //       <StatsBar stats={generateHeaderStats()} theme={theme} />
  //     </Card>
  //   );
  // };

  const renderEmptyState = () => (
    <EmptyState
      icon="⚡"
      title="Real-time Ticker + Candlestick Chart"
      description="Enter a symbol and date above to start"
      theme={theme}
      action={
        <div className="space-y-2">
          <p className="text-sm opacity-75">
            View both tick-by-tick price movements and 1-minute candlesticks
          </p>
          <p className="text-sm opacity-75">
            Use {isRealTime ? '⚡ Real-time' : '📊 Instant'} mode for live updates
          </p>
          {isRealTime && (
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-300">
                💡 Real-time mode shows candles forming live as ticks arrive
              </p>
            </div>
          )}
        </div>
      }
    />
  );

  return (
    <PageLayout
      theme={theme}
      controls={renderControls()}
      error={error}
      onErrorDismiss={clearError}
      loading={isLoading}
      loadingMessage={isRealTime ? 'Connecting to real-time feed...' : 'Loading ticker data...'}
    >
      {/* Main chart area - no separate header */}
      <div className="flex-1 min-h-0 p-2">
        {tickerData.length > 0 ? (
          <div className="h-full rounded-lg overflow-hidden shadow-lg">
            <TickerChart
              data={tickerData}
              theme={theme}
              symbol={currentSymbol}
              stats={stats}
              isRealTime={isRealTime}
            />
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </PageLayout>
  );
}
