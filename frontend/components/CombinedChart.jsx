'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';

export default function CombinedChart({ data, theme = 'dark' }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [viewState, setViewState] = useState({
    zoom: 1,
    offset: 0,
    targetOffset: 0,
    velocity: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showHeikinAshi, setShowHeikinAshi] = useState(true);

  const colors = themes[theme];

  // Wyckoff phase colors
  const wyckoffColors = {
    ACCUMULATION: '#4CAF50',
    MARKUP: '#2196F3',
    DISTRIBUTION: '#FF9800',
    MARKDOWN: '#F44336',
    UNKNOWN: '#9E9E9E'
  };

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

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setViewState(prev => {
        const friction = 0.9;
        const springStrength = 0.1;

        if (!isDragging) {
          const offsetDiff = prev.targetOffset - prev.offset;
          prev.velocity = prev.velocity * friction + offsetDiff * springStrength;
          prev.offset += prev.velocity;

          if (Math.abs(prev.velocity) < 0.1 && Math.abs(offsetDiff) < 0.1) {
            prev.offset = prev.targetOffset;
            prev.velocity = 0;
          }
        } else {
          prev.offset = prev.targetOffset;
          prev.velocity = 0;
        }

        return { ...prev };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging]);

  // Helper function to find time intervals
  const getTimeIntervals = useCallback(
    (candles, visibleStart, visibleEnd) => {
      const intervals = [];

      for (let i = visibleStart; i < visibleEnd; i++) {
        const candleTime = new Date(candles[i].time);
        if (isNaN(candleTime.getTime())) continue;

        const candleMinutes = candleTime.getMinutes();
        // Show labels at 00 and 30 minute marks
        if (candleMinutes === 0 || candleMinutes === 30) {
          if (isMobile) {
            // On mobile, show every hour instead
            if (candleMinutes === 0) {
              intervals.push({ index: i, time: candleTime });
            }
          } else {
            intervals.push({ index: i, time: candleTime });
          }
        }
      }

      return intervals;
    },
    [isMobile]
  );

  // Draw Wyckoff phase strip function
  const drawWyckoffPhaseStrip = useCallback((ctx, width, height, visibleStart, visibleEnd, candleWidth, padding) => {
    if (!data.wyckoffPhases || data.wyckoffPhases.length === 0) return;

    const stripHeight = 35;
    const stripY = height - stripHeight - 50; // Move up more to make room for x-axis labels

    // Draw background for the strip
    ctx.fillStyle = colors.panel || colors.background;
    ctx.fillRect(padding.left, stripY, width - padding.left - padding.right, stripHeight);

    // Draw border around the strip
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, stripY, width - padding.left - padding.right, stripHeight);

    // Draw phase segments
    data.wyckoffPhases.forEach(phase => {
      const phaseStart = Math.max(phase.startIndex, visibleStart);
      const phaseEnd = Math.min(phase.endIndex, visibleEnd);

      if (phaseStart <= phaseEnd && phaseEnd >= visibleStart && phaseStart <= visibleEnd) {
        const startX = padding.left + (phaseStart - visibleStart) * candleWidth;
        const endX = padding.left + (phaseEnd - visibleStart + 1) * candleWidth;
        const phaseWidth = Math.max(endX - startX, 2);

        // Draw phase background with gradient effect
        const gradient = ctx.createLinearGradient(startX, stripY + 2, startX, stripY + stripHeight - 2);
        const phaseColor = wyckoffColors[phase.phase] || wyckoffColors.UNKNOWN;
        gradient.addColorStop(0, phaseColor + '40'); // More transparent at top
        gradient.addColorStop(1, phaseColor + '80'); // More opaque at bottom

        ctx.fillStyle = gradient;
        ctx.fillRect(startX, stripY + 2, phaseWidth, stripHeight - 4);

        // Draw phase border with rounded corners effect
        ctx.strokeStyle = phaseColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(startX, stripY + 2, phaseWidth, stripHeight - 4);

        // Add inner glow effect
        ctx.shadowColor = phaseColor;
        ctx.shadowBlur = 5;
        ctx.strokeRect(startX + 1, stripY + 3, phaseWidth - 2, stripHeight - 6);
        ctx.shadowBlur = 0;

        // Draw phase label if there's enough space
        if (phaseWidth > 60) {
          const labelX = startX + phaseWidth / 2;
          const labelY = stripY + stripHeight / 2;

          // Add text shadow for better readability
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;

          // Phase name with bold styling
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${isMobile ? '11px' : '13px'} -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(phase.phase.replace('_', ' '), labelX, labelY - 6);

          // Confidence if there's space
          if (phaseWidth > 100 && phase.confidence) {
            ctx.font = `${isMobile ? '9px' : '11px'} -apple-system, BlinkMacSystemFont, sans-serif`;
            ctx.fillStyle = '#E0E0E0';
            ctx.fillText(`${(phase.confidence * 100).toFixed(0)}%`, labelX, labelY + 6);
          }

          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
      }
    });

    // Draw current phase indicator
    if (data.currentPhase && data.currentPhase !== 'UNKNOWN') {
      const currentPhaseColor = wyckoffColors[data.currentPhase] || wyckoffColors.UNKNOWN;

      // Draw current phase indicator at the right side
      const indicatorX = width - padding.right - 100;
      const indicatorY = stripY + 5;
      const indicatorWidth = 90;
      const indicatorHeight = 20;

      // Background
      ctx.fillStyle = currentPhaseColor;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);
      ctx.globalAlpha = 1.0;

      // Border
      ctx.strokeStyle = currentPhaseColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(indicatorX, indicatorY, indicatorWidth, indicatorHeight);

      // Text
      ctx.fillStyle = colors.text.primary;
      ctx.font = `${isMobile ? '9px' : '11px'} -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Now: ${data.currentPhase.replace('_', ' ')}`,
        indicatorX + indicatorWidth / 2,
        indicatorY + indicatorHeight / 2
      );
    }
  }, [data, colors, wyckoffColors, isMobile]);

  // Draw chart
  const drawChart = useCallback(() => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const padding = isMobile ? chartSettings.mobilePadding : chartSettings.padding;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw panel background
    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(
      padding.left - 10,
      padding.top - 10,
      width - padding.left - padding.right + 20,
      height - padding.top - padding.bottom + 20
    );

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!data.candlesticks || data.candlesticks.length === 0) return;

    // Calculate visible range
    const candleWidth = (chartWidth / data.candlesticks.length) * viewState.zoom;
    const maxOffset = 0;
    const minOffset = Math.min(0, -(data.candlesticks.length * candleWidth - chartWidth));
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

    const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
    const visibleEnd = Math.min(
      data.candlesticks.length,
      Math.ceil((chartWidth - clampedOffset) / candleWidth)
    );
    const visibleCandles = data.candlesticks.slice(visibleStart, visibleEnd);
    const visibleHeikinAshi = showHeikinAshi ? data.heikinAshi.slice(visibleStart, visibleEnd) : [];

    if (visibleCandles.length === 0) return;

    // Calculate price range from both datasets
    const allPrices = [
      ...visibleCandles.flatMap(c => [c.high, c.low]),
      ...(showHeikinAshi ? visibleHeikinAshi.flatMap(c => [c.high, c.low]) : []),
    ];
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = Math.max(priceRange * 0.1, 1);

    const yScale = price => {
      return (
        padding.top +
        ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight
      );
    };

    const xScale = index => {
      return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
    };

    // Set clipping region for chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Get time intervals for vertical grid lines
    const timeIntervals = getTimeIntervals(data.candlesticks, visibleStart, visibleEnd);

    // Vertical grid lines at time intervals
    timeIntervals.forEach(interval => {
      const x = xScale(interval.index);
      if (x >= padding.left && x <= width - padding.right) {
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }
    });

    // Horizontal grid lines
    const horizontalLines = isMobile ? 4 : 8;
    for (let i = 0; i <= horizontalLines; i++) {
      const price =
        minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
      const y = yScale(price);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw regular candlesticks (background)
    visibleCandles.forEach((candle, i) => {
      const x = xScale(visibleStart + i);
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yScale(candle.high));
      ctx.lineTo(x, yScale(candle.low));
      ctx.stroke();

      // Draw body with fill
      const bodyTop = yScale(Math.max(candle.open, candle.close));
      const bodyBottom = yScale(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);

      ctx.fillStyle = color;
      ctx.fillRect(
        x - (candleWidth * chartSettings.candleBodyWidthRatio) / 2,
        bodyTop,
        candleWidth * chartSettings.candleBodyWidthRatio,
        bodyHeight
      );

      // Add subtle border to regular candles for distinction
      ctx.strokeStyle = colors.background;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(
        x - (candleWidth * chartSettings.candleBodyWidthRatio) / 2,
        bodyTop,
        candleWidth * chartSettings.candleBodyWidthRatio,
        bodyHeight
      );
    });

    // Draw Heikin Ashi candles first (foreground) - YELLOW OUTLINE ONLY
    if (showHeikinAshi && visibleHeikinAshi.length > 0) {
      visibleHeikinAshi.forEach((candle, i) => {
        const x = xScale(visibleStart + i);
        const yellowColor = '#fbbf24'; // Yellow color for all Heikin Ashi candles

        // Draw wick
        ctx.strokeStyle = yellowColor;
        ctx.lineWidth = 1.5; // Slightly thicker for visibility
        ctx.beginPath();
        ctx.moveTo(x, yScale(candle.high));
        ctx.lineTo(x, yScale(candle.low));
        ctx.stroke();

        // Draw body OUTLINE ONLY (no fill)
        const bodyTop = yScale(Math.max(candle.open, candle.close));
        const bodyBottom = yScale(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);

        // Only stroke the rectangle, don't fill it
        ctx.strokeStyle = yellowColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          x - (candleWidth * chartSettings.candleBodyWidthRatio) / 2,
          bodyTop,
          candleWidth * chartSettings.candleBodyWidthRatio,
          bodyHeight
        );
      });
    }

    ctx.restore(); // Remove clipping

    // Draw axes labels outside clipping region
    ctx.fillStyle = colors.text.secondary;
    const labelFontSize = isMobile ? '10px' : '12px';
    ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

    // X-axis labels - show time at intervals
    ctx.textAlign = 'center';
    timeIntervals.forEach(interval => {
      const x = xScale(interval.index);
      if (x >= padding.left && x <= width - padding.right) {
        const timeString = format(interval.time, 'HH:mm');
        ctx.fillText(timeString, x, height - 15); // Position x-axis labels at bottom
      }
    });

    // Draw Wyckoff phase bottom strip
    drawWyckoffPhaseStrip(ctx, width, height, visibleStart, visibleEnd, candleWidth, padding);

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= horizontalLines; i++) {
      const price =
        minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
      const y = yScale(price);
      ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
    }

    // Draw crosshair (only on non-mobile devices)
    if (
      !isMobile &&
      showCrosshair &&
      mousePos.x > padding.left &&
      mousePos.x < width - padding.right &&
      mousePos.y > padding.top &&
      mousePos.y < height - padding.bottom
    ) {
      ctx.strokeStyle = colors.lines.crosshair;
      ctx.lineWidth = chartSettings.crosshairLineWidth;
      ctx.setLineDash([5, 5]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, padding.top);
      ctx.lineTo(mousePos.x, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, mousePos.y);
      ctx.lineTo(width - padding.right, mousePos.y);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }, [
    data,
    viewState,
    mousePos,
    showCrosshair,
    colors,
    isMobile,
    showHeikinAshi,
    getTimeIntervals,
    drawWyckoffPhaseStrip,
  ]);

  // Draw on every frame
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Handle mouse events (disabled on mobile)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || isMobile) return;

    const handleWheel = e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
      const centerRatio = (x - chartSettings.padding.left) / chartWidth;

      const zoomSpeed = 0.002;
      const zoomDelta = -e.deltaY * zoomSpeed;
      const newZoom = Math.max(1.0, Math.min(20, viewState.zoom + zoomDelta * viewState.zoom));

      const oldCandleWidth = (chartWidth / data.candlesticks.length) * viewState.zoom;
      const newCandleWidth = (chartWidth / data.candlesticks.length) * newZoom;
      const candlesWidthDiff = (newCandleWidth - oldCandleWidth) * data.candlesticks.length;

      setViewState(prev => ({
        ...prev,
        zoom: newZoom,
        targetOffset: prev.targetOffset - candlesWidthDiff * centerRatio,
        offset: prev.offset - candlesWidthDiff * centerRatio,
      }));
    };

    const handleMouseDown = e => {
      setIsDragging(true);
      setDragStart({ x: e.clientX, offset: viewState.targetOffset });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        setViewState(prev => ({
          ...prev,
          targetOffset: dragStart.offset + dx,
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      canvas.style.cursor = 'crosshair';
    };

    const handleMouseEnter = () => {
      setShowCrosshair(true);
      canvas.style.cursor = 'crosshair';
    };

    const handleMouseLeave = () => {
      setShowCrosshair(false);
      setIsDragging(false);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [data, viewState, isDragging, dragStart, isMobile]);

  const handleReset = () => {
    setViewState({
      zoom: 1,
      offset: 0,
      targetOffset: 0,
      velocity: 0,
    });
  };

  const toggleHeikinAshi = () => {
    setShowHeikinAshi(prev => !prev);
  };

  if (!data) return null;

  return (
    <div
      className="flex flex-col h-full p-2"
      style={{ backgroundColor: colors.background, minHeight: 0 }}
    >
      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
        <div>
          <h1 className={'text-lg font-bold'} style={{ color: colors.text.primary }}>
            {data.symbol || 'Combined Chart'}
          </h1>
          <div className="flex flex-wrap gap-2 mt-1 text-xs">
            <span style={{ color: colors.text.secondary }}>
              Candlesticks: {data.candlesticks?.length || 0}
            </span>
            <span style={{ color: colors.text.secondary }}>
              Heikin Ashi: {data.heikinAshi?.length || 0}
            </span>
            {!isMobile && (
              <span style={{ color: colors.text.secondary }}>
                Zoom: {(viewState.zoom * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleHeikinAshi}
            className={`px-3 py-1 rounded-md transition-all text-sm ${
              showHeikinAshi ? 'opacity-100' : 'opacity-90'
            }`}
            style={{
              backgroundColor: colors.panelBackground,
              border: `1px solid ${colors.grid}`,
              color: colors.text.primary,
            }}
          >
            Heikin Ashi
          </button>
          {!isMobile && (
            <button
              onClick={handleReset}
              className="px-3 py-1 rounded-md transition-all text-sm"
              style={{
                backgroundColor: colors.panelBackground,
                border: `1px solid ${colors.grid}`,
                color: colors.text.primary,
              }}
            >
              Reset View
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-shrink-0 flex flex-wrap gap-2 mb-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-2" style={{ backgroundColor: colors.candle.bullish }}></div>
            <div className="w-3 h-2" style={{ backgroundColor: colors.candle.bearish }}></div>
          </div>
          <span style={{ color: colors.text.secondary }}>Regular Candles</span>
        </div>
        {showHeikinAshi && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-2 border-2 border-yellow-400"></div>
            <span style={{ color: colors.text.secondary }}>Heikin Ashi (Yellow Outline)</span>
          </div>
        )}
      </div>

      <div
        className="flex-1 rounded-lg overflow-hidden"
        style={{ backgroundColor: colors.panelBackground, minHeight: 200 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: isMobile ? 'default' : 'crosshair', minHeight: 200 }}
        />
      </div>
    </div>
  );
}
