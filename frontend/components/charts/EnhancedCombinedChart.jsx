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
      {/* Enhanced Control Panel */}
      <div className="flex-shrink-0 mb-4">
        <div className="flex flex-col gap-3 p-4 rounded-lg" style={{ backgroundColor: colors.controlPanel, border: `1px solid ${colors.grid}` }}>

          {/* Chart Visibility Controls */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium" style={{ color: colors.text.primary }}>
              Chart Visibility
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowCandlesticks(!showCandlesticks)}
                className="px-3 py-2 rounded-md transition-all text-sm font-medium flex items-center gap-2"
                style={getButtonStyle(showCandlesticks)}
                title="Toggle regular candlesticks visibility"
              >
                <div
                  className="w-3 h-3 rounded border-2"
                  style={{
                    backgroundColor: showCandlesticks ? colors.candle.bullish : 'transparent',
                    borderColor: colors.candle.bullish
                  }}
                />
                Regular Candles
                {showCandlesticks && <span className="text-xs opacity-75">✓</span>}
              </button>

              <button
                onClick={() => setShowHeikinAshi(!showHeikinAshi)}
                className="px-3 py-2 rounded-md transition-all text-sm font-medium flex items-center gap-2"
                style={getButtonStyle(showHeikinAshi)}
                title="Toggle Heikin Ashi candlesticks visibility"
              >
                <div
                  className="w-3 h-3 rounded border-2"
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: '#fbbf24' // Yellow for Heikin Ashi
                  }}
                />
                Heikin Ashi
                {showHeikinAshi && <span className="text-xs opacity-75">✓</span>}
              </button>
            </div>
          </div>

          {/* Layer Ordering Controls */}
          {showCandlesticks && showHeikinAshi && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium" style={{ color: colors.text.primary }}>
                Layer Order
              </h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setHeikinAshiOnFront(!heikinAshiOnFront)}
                  className="px-3 py-2 rounded-md transition-all text-sm font-medium flex items-center gap-2"
                  style={getToggleStyle(heikinAshiOnFront)}
                  title="Toggle which chart appears in front"
                >
                  <span className="text-xs">
                    {heikinAshiOnFront ? '🟡' : '🟢'}
                  </span>
                  {heikinAshiOnFront ? 'Heikin Ashi on Front' : 'Regular Candles on Front'}
                  <span className="text-xs opacity-75">
                    {heikinAshiOnFront ? '(Background: Regular)' : '(Background: Heikin Ashi)'}
                  </span>
                </button>
              </div>
            </div>
          )}


          {/* Status Display */}
          <div className="flex items-center gap-4 text-xs pt-2 border-t" style={{ borderColor: colors.grid, color: colors.text.secondary }}>
            <span>Status:</span>
            <span className="flex items-center gap-1">
              Regular: {showCandlesticks ?
                <span className="text-green-400">Visible</span> :
                <span className="text-red-400">Hidden</span>
              }
            </span>
            <span className="flex items-center gap-1">
              Heikin Ashi: {showHeikinAshi ?
                <span className="text-yellow-400">Visible</span> :
                <span className="text-red-400">Hidden</span>
              }
            </span>
            {showCandlesticks && showHeikinAshi && (
              <span className="flex items-center gap-1">
                Front: <span className="text-blue-400">
                  {heikinAshiOnFront ? 'Heikin Ashi' : 'Regular'}
                </span>
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
            showExtrema={false}
            showWyckoffPhases={true}
            showGrid={true}
            showAxes={true}
            enableInteraction={true}
            customRenderProps={{
              showCandlesticks,
              showHeikinAshi,
              heikinAshiOnFront
            }}
            {...props}
          />
        )}
      </div>
    </div>
  );
};

export default EnhancedCombinedChart;
