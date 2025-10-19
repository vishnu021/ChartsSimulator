'use client';

import React, { useCallback } from 'react';
import { useChartData } from '@/hooks/useChartData';
import { useAppState } from '@/contexts/AppStateContext';
import { StatsBar } from '@/components/ui/StatsBar';
import { EmptyState } from '@/components/ui/EmptyState';
import ControlPanel from '@/components/ControlPanel';
import { ExtremaChart, CandlestickChart, CombinedChart, DashboardChart } from './index';
import { logger } from '@/utils/logger';

/**
 * ChartPanel - Reusable chart panel component that can be configured for different use cases
 *
 * @param {Object} props
 * @param {string} props.chartType - Type of chart: 'extrema', 'candlestick', 'combined', 'dashboard'
 * @param {boolean} props.showControls - Show/hide control panel (default: true)
 * @param {boolean} props.showStats - Show/hide stats bar (default: true)
 * @param {boolean} props.showModeToggle - Show/hide real-time/instant mode toggle (default: true)
 * @param {boolean} props.showThemeToggle - Show/hide theme toggle (default: true)
 * @param {string} props.title - Custom title (default: based on chart type)
 * @param {string} props.emptyIcon - Custom empty state icon (default: based on chart type)
 * @param {string} props.emptyTitle - Custom empty state title
 * @param {string} props.emptyDescription - Custom empty state description
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
export const ChartPanel = ({
  chartType = 'candlestick',
  showControls = true,
  showStats = true,
  showModeToggle = true,
  showThemeToggle = true,
  title = null,
  emptyIcon = null,
  emptyTitle = null,
  emptyDescription = null,
  className = '',
  style = {}
}) => {
  const { theme, toggleTheme } = useAppState();
  const {
    isRealTime,
    realTimeData,
    realTimeLoading,
    realTimeError,
    instantData,
    instantLoading,
    instantError,
    isPaused,
    streamSpeed,
    loadData,
    toggleMode,
    clearErrors,
    togglePause,
    updateStreamSpeed,
  } = useChartData();

  // Get current data based on mode
  const currentData = isRealTime ? realTimeData : instantData;
  const isLoading = isRealTime ? realTimeLoading : instantLoading;
  const error = isRealTime ? realTimeError : instantError;

  // Debug logging
  logger.debug('ChartPanel debug:', {
    isRealTime,
    hasCurrentData: !!currentData,
    currentData,
    isLoading,
    error,
    willRenderChart: !isLoading && !!currentData
  });

  // Chart type configurations
  const chartConfigs = {
    extrema: {
      component: ExtremaChart,
      defaultTitle: 'Extrema Analysis',
      defaultEmptyIcon: '📈',
      defaultEmptyTitle: 'No extrema analysis loaded',
      statsGenerator: (data) => {
        const candles = data.candles || data.candlesticks || [];
        const totalVolume = candles.reduce((sum, c) => sum + (c.volume || 0), 0);
        const formatVolume = (vol) => {
          if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
          if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
          return vol.toString();
        };

        return [
          {
            label: isRealTime ? '⚡ Real-time' : '📊 Instant',
            value: `${candles.length} candles`,
            color: 'text-green-400',
          },
          {
            label: 'Maxima',
            value: data.maxima?.length || 0,
            color: 'text-yellow-400',
          },
          {
            label: 'Minima',
            value: data.minima?.length || 0,
            color: 'text-pink-400',
          },
          {
            label: 'Total Volume',
            value: formatVolume(totalVolume),
            color: 'text-blue-400',
          },
        ];
      }
    },
    candlestick: {
      component: CandlestickChart,
      defaultTitle: 'Candlestick Chart',
      defaultEmptyIcon: '📊',
      defaultEmptyTitle: 'No chart data loaded',
      statsGenerator: (data) => {
        const candles = data.candles || data.candlesticks || [];
        const totalVolume = candles.reduce((sum, c) => sum + (c.volume || 0), 0);
        const formatVolume = (vol) => {
          if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
          if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
          return vol.toString();
        };

        return [
          {
            label: isRealTime ? '⚡ Real-time' : '📊 Instant',
            value: `${candles.length} candles`,
            color: 'text-green-400',
          },
          {
            label: 'Current Phase',
            value: data.currentPhase || 'Unknown',
            color: 'text-blue-400',
          },
          {
            label: 'Total Volume',
            value: formatVolume(totalVolume),
            color: 'text-purple-400',
          },
        ];
      }
    },
    combined: {
      component: CombinedChart,
      defaultTitle: 'Combined Chart',
      defaultEmptyIcon: '📈',
      defaultEmptyTitle: 'No combined chart data loaded',
      statsGenerator: (data) => {
        const candles = data.candles || data.candlesticks || [];
        const totalVolume = candles.reduce((sum, c) => sum + (c.volume || 0), 0);
        const formatVolume = (vol) => {
          if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
          if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
          return vol.toString();
        };

        return [
          {
            label: isRealTime ? '⚡ Real-time' : '📊 Instant',
            value: `${candles.length} candles`,
            color: 'text-green-400',
          },
          {
            label: 'Heikin Ashi',
            value: data.heikinAshi?.length || 0,
            color: 'text-yellow-400',
          },
          {
            label: 'Total Volume',
            value: formatVolume(totalVolume),
            color: 'text-purple-400',
          },
        ];
      }
    },
    dashboard: {
      component: DashboardChart,
      defaultTitle: 'Dashboard Chart',
      defaultEmptyIcon: '📋',
      defaultEmptyTitle: 'No dashboard data loaded',
      statsGenerator: (data) => [
        {
          label: 'Candles',
          value: data.candles?.length || data.candlesticks?.length || 0,
          color: 'text-green-400',
        },
      ]
    }
  };

  const config = chartConfigs[chartType] || chartConfigs.candlestick;
  const ChartComponent = config.component;

  // Generate stats data
  const generateStatsData = () => {
    if (!currentData) return [];
    return config.statsGenerator(currentData);
  };

  // Wrapper function to pass chart type to loadData
  const handleLoadData = useCallback((params) => {
    loadData(params, chartType);
  }, [loadData, chartType]);

  // Determine title and empty state props
  const displayTitle = title || currentData?.symbol || config.defaultTitle;
  const displayEmptyIcon = emptyIcon || config.defaultEmptyIcon;
  const displayEmptyTitle = emptyTitle || config.defaultEmptyTitle;
  const displayEmptyDescription = emptyDescription ||
    `Enter a symbol and date above. Use ${isRealTime ? '⚡ Real-time' : '📊 Instant'} mode.`;

  return (
    <div className={`flex flex-col h-full ${className}`} style={style}>
      {/* Controls */}
      {showControls && (
        <div className="mb-2">
          <ControlPanel
            onSubmit={handleLoadData}
            theme={theme}
            onThemeToggle={showThemeToggle ? toggleTheme : undefined}
            showModeToggle={showModeToggle}
            isRealTime={isRealTime}
            onModeToggle={toggleMode}
          />
        </div>
      )}

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2">
        {displayTitle}
      </h1>

      {/* Stats */}
      {showStats && currentData && (
        <div className="mb-2">
          <StatsBar stats={generateStatsData()} theme={theme} />
        </div>
      )}

      {/* Real-time Controls (Pause/Resume & Speed) */}
      {isRealTime && currentData && (
        <div className="mb-2 flex items-center gap-3 p-2 rounded-lg bg-gray-800 border border-gray-700">
          {/* Pause/Resume Button */}
          <button
            onClick={togglePause}
            className={`px-4 py-2 rounded-md font-medium transition-all ${
              isPaused
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>

          {/* Speed Control */}
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm font-medium text-gray-300">
              Speed (ms):
            </label>
            <input
              type="number"
              value={streamSpeed}
              onChange={(e) => updateStreamSpeed(Math.max(1, parseInt(e.target.value) || 100))}
              min="1"
              max="5000"
              className="w-24 px-2 py-1.5 rounded text-sm bg-gray-700 border border-gray-600 text-white"
            />
            <span className="text-xs text-gray-400">
              ({streamSpeed}ms between ticks)
            </span>
          </div>

          {/* Quick Speed Presets */}
          <div className="flex gap-1">
            <button
              onClick={() => updateStreamSpeed(50)}
              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              Fast (50ms)
            </button>
            <button
              onClick={() => updateStreamSpeed(100)}
              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              Normal (100ms)
            </button>
            <button
              onClick={() => updateStreamSpeed(500)}
              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
            >
              Slow (500ms)
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4">
          <div className="bg-red-500/20 border border-red-500 text-red-100 px-4 py-3 rounded">
            {error}
            <button
              onClick={clearErrors}
              className="ml-2 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4">
            </div>
            <p className="text-white">
              {isRealTime ? 'Connecting to real-time feed...' : 'Loading chart data...'}
            </p>
          </div>
        </div>
      )}

      {/* Chart or Empty State */}
      {!isLoading && (
        <div className="flex-1 min-h-0">
          {currentData ? (
            <>
              {logger.debug('ChartPanel rendering chart with data:', {
                chartType,
                component: ChartComponent.name,
                hasCandles: !!(currentData.candles?.length || currentData.candlesticks?.length),
                hasHeikinAshi: !!currentData.heikinAshi?.length,
                currentData
              })}
              <ChartComponent data={currentData} theme={theme} />
            </>
          ) : (
            <EmptyState
              icon={displayEmptyIcon}
              title={displayEmptyTitle}
              description={displayEmptyDescription}
              theme={theme}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ChartPanel;
