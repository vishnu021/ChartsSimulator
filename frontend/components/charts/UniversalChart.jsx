'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { themes } from '../chartConfig';

/**
 * UniversalChart - A flexible chart component that dynamically renders any chart types
 * based on the data structure provided. Automatically generates controls for available data.
 */
export const UniversalChart = ({ data, theme = 'dark', className = '', style = {} }) => {
  const canvasRef = useRef(null);
  // const animationRef = useRef(null);
  const [viewState] = useState({
    zoom: 1,
    offset: 0,
    targetOffset: 0,
    velocity: 0,
  });
  // const [isDragging, setIsDragging] = useState(false);
  // const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Dynamic chart type visibility state
  const [chartVisibility, setChartVisibility] = useState({});
  const [layerOrder, setLayerOrder] = useState([]);

  const colors = themes[theme];

  // Detect available chart types from data
  const getAvailableChartTypes = useCallback(() => {
    if (!data) return [];

    const chartTypes = [];

    // Check for different data types (handle both field names for backward compatibility)
    const candleData = data.candlesticks || data.candles;
    if (candleData && candleData.length > 0) {
      chartTypes.push({
        key: 'candlesticks',
        name: 'Candlesticks',
        data: candleData,
        type: 'candlestick',
        color: colors.candle.bullish,
        metadata: { source: 'OHLC', count: candleData.length }
      });
    }

    if (data.heikinAshi && data.heikinAshi.length > 0) {
      chartTypes.push({
        key: 'heikinAshi',
        name: 'Heikin Ashi',
        data: data.heikinAshi,
        type: 'heikinAshi',
        color: '#fbbf24',
        metadata: { source: 'Smoothed', count: data.heikinAshi.length }
      });
    }

    if (data.volume && data.volume.length > 0) {
      chartTypes.push({
        key: 'volume',
        name: 'Volume',
        data: data.volume,
        type: 'volume',
        color: colors.text.secondary,
        metadata: { source: 'Volume', count: data.volume.length }
      });
    }

    // Support for any additional chart types in the data
    Object.keys(data).forEach(key => {
      if (!['candles', 'heikinAshi', 'volume', 'symbol', 'wyckoffPhases', 'currentPhase', 'maxima', 'minima'].includes(key)) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          chartTypes.push({
            key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            data: data[key],
            type: 'custom',
            color: colors.accent,
            metadata: { source: 'Custom', count: data[key].length }
          });
        }
      }
    });

    return chartTypes;
  }, [data, colors]);

  const availableChartTypes = getAvailableChartTypes();

  // Initialize visibility state when chart types change
  useEffect(() => {
    const initialVisibility = {};
    const initialOrder = [];

    availableChartTypes.forEach((chartType) => {
      initialVisibility[chartType.key] = true; // Show all by default
      initialOrder.push(chartType.key);
    });

    setChartVisibility(initialVisibility);
    setLayerOrder(initialOrder);
  }, [availableChartTypes]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Setup canvas with proper pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [data]);

  // Calculate axis ranges and scales
  const calculateAxisScales = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return null;

    // const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const padding = { top: 40, right: 80, bottom: 100, left: 80 };

    // Reserve space for volume if present
    const hasVolume = availableChartTypes.some(ct => ct.type === 'volume' && chartVisibility[ct.key]);
    const volumeHeight = hasVolume ? 80 : 0;
    const chartHeight = height - padding.top - padding.bottom - volumeHeight;
    const chartWidth = width - padding.left - padding.right;

    // Get all visible price data
    const allPrices = [];
    const allTimeData = [];
    let volumeData = [];

    availableChartTypes.forEach(chartType => {
      if (!chartVisibility[chartType.key]) return;

      if (chartType.type === 'volume') {
        volumeData = chartType.data;
      } else {
        chartType.data.forEach(item => {
          if (item.time) allTimeData.push(new Date(item.time));

          if (chartType.type === 'candlestick' || chartType.type === 'heikinAshi') {
            allPrices.push(item.high, item.low, item.open, item.close);
          } else if (item.value !== undefined) {
            allPrices.push(item.value);
          } else if (item.price !== undefined) {
            allPrices.push(item.price);
          }
        });
      }
    });

    if (allPrices.length === 0) return null;

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = Math.max(priceRange * 0.1, 1);

    // Calculate visible range based on zoom and offset
    const maxDataLength = Math.max(...availableChartTypes.map(ct => ct.data.length));
    const candleWidth = (chartWidth / maxDataLength) * viewState.zoom;
    const clampedOffset = Math.max(
      -(maxDataLength * candleWidth - chartWidth),
      Math.min(0, viewState.offset)
    );

    const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
    const visibleEnd = Math.min(maxDataLength, Math.ceil((chartWidth - clampedOffset) / candleWidth));

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      volumeHeight,
      minPrice: minPrice - pricePadding,
      maxPrice: maxPrice + pricePadding,
      priceRange: priceRange + 2 * pricePadding,
      candleWidth,
      clampedOffset,
      visibleStart,
      visibleEnd,
      volumeData,
      yScale: (price) => padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight,
      xScale: (index) => padding.left + (index - visibleStart) * candleWidth + candleWidth / 2,
    };
  }, [data, availableChartTypes, chartVisibility, viewState]);

  // Draw chart function
  const drawChart = useCallback(() => {
    const scales = calculateAxisScales();
    if (!scales) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height, padding, chartWidth, chartHeight, volumeHeight, minPrice, maxPrice,
      yScale, xScale, visibleStart, visibleEnd, candleWidth, volumeData } = scales;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw main chart panel
    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(padding.left - 10, padding.top - 10, chartWidth + 20, chartHeight + 20);

    // Set clipping region for main chart
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal grid lines
    const horizontalLines = isMobile ? 4 : 6;
    for (let i = 0; i <= horizontalLines; i++) {
      const price = minPrice + (i * (maxPrice - minPrice)) / horizontalLines;
      const y = yScale(price);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const verticalLines = isMobile ? 4 : 8;
    for (let i = 0; i <= verticalLines; i++) {
      const x = padding.left + (i * chartWidth) / verticalLines;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Render charts in layer order (background to foreground)
    layerOrder.forEach(chartKey => {
      const chartType = availableChartTypes.find(ct => ct.key === chartKey);
      if (!chartType || !chartVisibility[chartKey]) return;

      const visibleData = chartType.data.slice(visibleStart, visibleEnd);
      if (visibleData.length === 0) return;

      ctx.strokeStyle = chartType.color;
      ctx.fillStyle = chartType.color;

      if (chartType.type === 'candlestick') {
        // Draw traditional candlesticks
        visibleData.forEach((candle, i) => {
          const x = xScale(visibleStart + i);
          const isGreen = candle.close >= candle.open;
          const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

          ctx.strokeStyle = color;
          ctx.fillStyle = color;

          // Draw wick
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, yScale(candle.high));
          ctx.lineTo(x, yScale(candle.low));
          ctx.stroke();

          // Draw body
          const bodyTop = yScale(Math.max(candle.open, candle.close));
          const bodyBottom = yScale(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          ctx.fillRect(
            x - (candleWidth * 0.8) / 2,
            bodyTop,
            candleWidth * 0.8,
            bodyHeight
          );
        });
      } else if (chartType.type === 'heikinAshi') {
        // Draw Heikin Ashi candlesticks (outline only)
        ctx.strokeStyle = chartType.color;
        ctx.lineWidth = 1.5;

        visibleData.forEach((candle, i) => {
          const x = xScale(visibleStart + i);

          // Draw wick
          ctx.beginPath();
          ctx.moveTo(x, yScale(candle.high));
          ctx.lineTo(x, yScale(candle.low));
          ctx.stroke();

          // Draw body outline only
          const bodyTop = yScale(Math.max(candle.open, candle.close));
          const bodyBottom = yScale(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          ctx.strokeRect(
            x - (candleWidth * 0.8) / 2,
            bodyTop,
            candleWidth * 0.8,
            bodyHeight
          );
        });
      }
    });

    ctx.restore(); // Remove main chart clipping

    // Draw volume chart if available
    if (volumeData.length > 0 && chartVisibility['volume']) {
      const volumeY = padding.top + chartHeight + 30;

      ctx.fillStyle = colors.panelBackground;
      ctx.fillRect(padding.left - 10, volumeY - 10, chartWidth + 20, volumeHeight);

      const maxVolume = Math.max(...volumeData.slice(visibleStart, visibleEnd).map(v => v.volume || v.value || 0));

      ctx.fillStyle = colors.text.secondary;
      volumeData.slice(visibleStart, visibleEnd).forEach((vol, i) => {
        const x = xScale(visibleStart + i);
        const volume = vol.volume || vol.value || 0;
        const height = (volume / maxVolume) * (volumeHeight - 20);

        ctx.fillRect(x - candleWidth / 4, volumeY + volumeHeight - 10 - height, candleWidth / 2, height);
      });
    }

    // Draw Y-axis labels
    ctx.fillStyle = colors.text.secondary;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= horizontalLines; i++) {
      const price = minPrice + (i * (maxPrice - minPrice)) / horizontalLines;
      const y = yScale(price);
      ctx.fillText(price.toFixed(2), padding.left - 15, y + 4);
    }

    // Draw X-axis labels
    ctx.textAlign = 'center';
    const timeStep = Math.max(1, Math.floor((visibleEnd - visibleStart) / 6));
    for (let i = visibleStart; i < visibleEnd; i += timeStep) {
      if (availableChartTypes[0] && availableChartTypes[0].data[i] && availableChartTypes[0].data[i].time) {
        const x = xScale(i);
        const time = new Date(availableChartTypes[0].data[i].time);
        ctx.fillText(format(time, 'HH:mm'), x, height - padding.bottom + 20);
      }
    }

    // Draw crosshair
    if (showCrosshair && mousePos && !isMobile) {
      ctx.strokeStyle = colors.lines?.crosshair || colors.text.secondary;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(mousePos.x, padding.top);
      ctx.lineTo(mousePos.x, padding.top + chartHeight);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, mousePos.y);
      ctx.lineTo(padding.left + chartWidth, mousePos.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [calculateAxisScales, colors, layerOrder, availableChartTypes, chartVisibility, showCrosshair, mousePos, isMobile]);

  // Draw on every frame
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Mouse interaction handlers (non-mobile only)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => setShowCrosshair(true);
    const handleMouseLeave = () => setShowCrosshair(false);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isMobile]);

  // Control handlers
  const toggleChartVisibility = (chartKey) => {
    setChartVisibility(prev => ({
      ...prev,
      [chartKey]: !prev[chartKey]
    }));
  };

  const bringToFront = (chartKey) => {
    setLayerOrder(prev => {
      const newOrder = prev.filter(key => key !== chartKey);
      return [...newOrder, chartKey]; // Add to end (front)
    });
  };

  if (!data || availableChartTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ color: colors.text.secondary }}>
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-lg font-medium">No chart data available</p>
          <p className="text-sm opacity-75 mt-1">Load data to see charts</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`} style={style}>
      {/* Simplified Control Panel */}
      {availableChartTypes.length > 1 && (
        <div className="flex-shrink-0 mb-4">
          <div className="flex flex-wrap gap-3 p-3 rounded-lg" style={{ backgroundColor: colors.controlPanel, border: `1px solid ${colors.grid}` }}>
            {availableChartTypes.map(chartType => (
              <div key={chartType.key} className="flex items-center gap-2">
                {/* Visibility Toggle */}
                <button
                  onClick={() => toggleChartVisibility(chartType.key)}
                  className="px-3 py-1 rounded text-sm transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: chartVisibility[chartType.key] ? colors.accent : colors.panelBackground,
                    border: `1px solid ${chartVisibility[chartType.key] ? colors.accent : colors.grid}`,
                    color: chartVisibility[chartType.key] ? '#ffffff' : colors.text.primary,
                  }}
                  title={`Toggle ${chartType.name} visibility`}
                >
                  <div
                    className="w-3 h-3 rounded border"
                    style={{
                      backgroundColor: chartVisibility[chartType.key] ? chartType.color : 'transparent',
                      borderColor: chartType.color
                    }}
                  />
                  {chartType.name}
                  {chartVisibility[chartType.key] && <span className="text-xs">✓</span>}
                </button>

                {/* Bring to Front Button */}
                {chartVisibility[chartType.key] && (
                  <button
                    onClick={() => bringToFront(chartType.key)}
                    className="px-2 py-1 rounded text-xs transition-all"
                    style={{
                      backgroundColor: colors.panelBackground,
                      border: `1px solid ${colors.grid}`,
                      color: colors.text.secondary,
                    }}
                    title={`Bring ${chartType.name} to front`}
                  >
                    ↑ Front
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Display */}
      <div className="flex-1 min-h-0">
        <div
          className="w-full h-full rounded-lg overflow-hidden"
          style={{ backgroundColor: colors.panelBackground, minHeight: 200 }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{
              cursor: isMobile ? 'default' : 'crosshair',
            }}
          />
        </div>
      </div>

      {/* Metadata Display */}
      {availableChartTypes.length > 0 && (
        <div className="flex-shrink-0 mt-2">
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: colors.text.secondary }}>
            {availableChartTypes.map(chartType => (
              chartVisibility[chartType.key] && (
                <span key={chartType.key} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded"
                    style={{ backgroundColor: chartType.color }}
                  />
                  {chartType.name}: {chartType.metadata.count} points ({chartType.metadata.source})
                </span>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalChart;
