'use client';

import React, { useState } from 'react';
import { themes } from '../chartConfig';
import UnifiedChart from './UnifiedChart';

/**
 * EnhancedCombinedChart - A chart component that shows both regular candlesticks and Heikin Ashi
 * with interactive controls for visibility and layer ordering
 */
export const EnhancedCombinedChart = ({ data, theme = 'dark', ...props }) => {
  const [showCandlesticks, setShowCandlesticks] = useState(true);
  const [showHeikinAshi, setShowHeikinAshi] = useState(true);
  const [heikinAshiOnFront, setHeikinAshiOnFront] = useState(false);
  const [heikinAshiColorMode, setHeikinAshiColorMode] = useState('yellow'); // 'yellow' or 'traditional'

  const colors = themes[theme];

  // Control button style
  const getButtonStyle = (active) => ({
    backgroundColor: active ? colors.accent : colors.panelBackground,
    border: `1px solid ${active ? colors.accent : colors.grid}`,
    color: active ? '#ffffff' : colors.text.primary,
    opacity: active ? 1 : 0.7,
  });

  // Toggle button style for layering
  const getToggleStyle = (isActive) => ({
    backgroundColor: isActive ? colors.success : colors.panelBackground,
    border: `1px solid ${isActive ? colors.success : colors.grid}`,
    color: isActive ? '#ffffff' : colors.text.primary,
  });

  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Compressed Control Panel */}
      <div className="flex-shrink-0 mb-2">
        <div className="flex items-center justify-between gap-4 p-2 rounded-lg" style={{ backgroundColor: colors.controlPanel, border: `1px solid ${colors.grid}` }}>

          {/* Chart Visibility Controls - Left Side */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium mr-2" style={{ color: colors.text.primary }}>Charts:</span>
            <button
              onClick={() => setShowCandlesticks(!showCandlesticks)}
              className="px-2 py-1 rounded transition-all text-xs font-medium flex items-center gap-1"
              style={getButtonStyle(showCandlesticks)}
              title="Toggle regular candlesticks visibility"
            >
              <div
                className="w-2 h-2 rounded border"
                style={{
                  backgroundColor: showCandlesticks ? colors.candle.bullish : 'transparent',
                  borderColor: colors.candle.bullish
                }}
              />
              Regular{showCandlesticks && '✓'}
            </button>

            <button
              onClick={() => setShowHeikinAshi(!showHeikinAshi)}
              className="px-2 py-1 rounded transition-all text-xs font-medium flex items-center gap-1"
              style={getButtonStyle(showHeikinAshi)}
              title="Toggle Heikin Ashi candlesticks visibility"
            >
              <div
                className="w-2 h-2 rounded border"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: heikinAshiColorMode === 'yellow' ? '#d97706' : colors.candle.bullish
                }}
              />
              Heikin Ashi{showHeikinAshi && '✓'}
            </button>

            {/* Heikin-Ashi Color Mode Toggle */}
            {showHeikinAshi && (
              <button
                onClick={() => setHeikinAshiColorMode(heikinAshiColorMode === 'yellow' ? 'traditional' : 'yellow')}
                className="px-2 py-1 rounded transition-all text-xs font-medium flex items-center gap-1"
                style={getToggleStyle(heikinAshiColorMode === 'traditional')}
                title="Toggle Heikin-Ashi color mode: Yellow hollow vs Red/Green filled"
              >
                <span className="text-xs">
                  {heikinAshiColorMode === 'yellow' ? '🟡' : '🔴🟢'}
                </span>
                {heikinAshiColorMode === 'yellow' ? 'Yellow' : 'R/G'}
              </button>
            )}
          </div>

          {/* Layer Control - Center */}
          {showCandlesticks && showHeikinAshi && (
            <button
              onClick={() => setHeikinAshiOnFront(!heikinAshiOnFront)}
              className="px-2 py-1 rounded transition-all text-xs font-medium flex items-center gap-1"
              style={getToggleStyle(heikinAshiOnFront)}
              title="Toggle which chart appears in front"
            >
              <span className="text-xs">{heikinAshiOnFront ? '🟡' : '🟢'}</span>
              {heikinAshiOnFront ? 'Heikin Front' : 'Regular Front'}
            </button>
          )}

          {/* Status Display - Right Side */}
          <div className="flex items-center gap-3 text-xs" style={{ color: colors.text.secondary }}>
            <span className="flex items-center gap-1">
              R: {showCandlesticks ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}
            </span>
            <span className="flex items-center gap-1">
              H: {showHeikinAshi ? <span className="text-yellow-400">✓</span> : <span className="text-red-400">✗</span>}
            </span>
            {showCandlesticks && showHeikinAshi && (
              <span className="flex items-center gap-1">
                Front: <span className="text-blue-400">{heikinAshiOnFront ? 'H' : 'R'}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="flex-1 min-h-0">
        {!showCandlesticks && !showHeikinAshi ? (
          <div className="flex items-center justify-center h-full" style={{ color: colors.text.secondary }}>
            <div className="text-center">
              <div className="text-4xl mb-2">👁️</div>
              <p className="text-lg font-medium">No charts visible</p>
              <p className="text-sm opacity-75 mt-1">Enable at least one chart type above</p>
            </div>
          </div>
        ) : (
          <UnifiedChart
            data={data}
            theme={theme}
            showCandlesticks={showCandlesticks}
            showHeikinAshi={showHeikinAshi}
            heikinAshiOnFront={heikinAshiOnFront}
            heikinAshiColorMode={heikinAshiColorMode}
            showExtrema={false}
            showWyckoffPhases={true}
            showGrid={true}
            showAxes={true}
            enableInteraction={true}
            customRenderProps={{
              showCandlesticks,
              showHeikinAshi,
              heikinAshiOnFront,
              heikinAshiColorMode
            }}
            {...props}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedCombinedChart;
