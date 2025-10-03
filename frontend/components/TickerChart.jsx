'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { themes, chartSettings } from './chartConfig';
import { canvasUtils } from '../utils/chart';

// Helper function to format time
const formatTime = (date, format) => {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const seconds = d.getSeconds().toString().padStart(2, '0');

  if (format === 'HH:mm:ss') {
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}`;
};

export default function TickerChart({ data, theme = 'dark', symbol, stats, isRealTime, wyckoffPhases, currentPhase }) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [viewState, setViewState] = useState({
    zoom: 1,
    verticalZoom: 1,
    offset: 0,
    targetOffset: 0,
    velocity: 0,
    verticalOffset: 0,
    targetVerticalOffset: 0,
    verticalVelocity: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, offset: 0, verticalOffset: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(false);
  const colors = themes[theme];


  // Check for mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Process data for rendering with proper time alignment
  const processedData = useMemo(() => {
    if (!data || data.length === 0)
      return { candleData: [], priceData: [], timeRange: { start: 0, end: 0 } };

    // Get time range from all data
    const allTimes = data.map(tick => new Date(tick.time).getTime()).filter(t => !isNaN(t));
    if (allTimes.length === 0)
      return { candleData: [], priceData: [], timeRange: { start: 0, end: 0 } };

    const timeRange = {
      start: Math.min(...allTimes),
      end: Math.max(...allTimes),
    };

    // Group tickers into 1-minute candles
    const tickersByMinute = new Map();
    data.forEach(tick => {
      try {
        const tickTime = new Date(tick.time);
        if (isNaN(tickTime.getTime())) return;

        // For candle grouping, use the NEXT minute (9:14:xx data goes to 9:15 candle)
        const nextMinute = new Date(tickTime);
        nextMinute.setSeconds(0, 0);
        nextMinute.setMinutes(nextMinute.getMinutes() + 1);
        const minuteKey = nextMinute.getTime();

        if (!tickersByMinute.has(minuteKey)) {
          tickersByMinute.set(minuteKey, []);
        }
        tickersByMinute.get(minuteKey).push(tick);
      } catch (error) {
        // Skip invalid ticks
      }
    });

    // Create candles from grouped data with timestamps
    const candleData = [];
    Array.from(tickersByMinute.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([minuteKey, ticks]) => {
        if (ticks.length === 0) return;

        const prices = ticks.map(t => t.price).filter(p => !isNaN(p));
        const volumes = ticks.map(t => t.volume).filter(v => !isNaN(v));

        if (prices.length === 0) return;

        // The candle represents data UP TO this minute
        candleData.push({
          time: new Date(minuteKey).toISOString(),
          timestamp: minuteKey,
          open: prices[0],
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: prices[prices.length - 1],
          volume: volumes.reduce((sum, v) => sum + v, 0),
          tickCount: ticks.length,
        });
      });

    // Keep MORE price data points for better granularity - show roughly same density as candles
    let priceData;
    // Increase max points to show more detail - aim for roughly 1 point per candle period
    const maxPoints = 50000; // Increased from 10000 to show more ticker detail
    if (data.length > maxPoints) {
      // Use smaller step to keep more points
      const step = Math.max(1, Math.floor(data.length / maxPoints));
      priceData = data
        .filter((_, index) => index % step === 0 || index === data.length - 1)
        .filter(tick => tick && tick.time && typeof tick.price === 'number' && !isNaN(tick.price))
        .map(tick => ({
          time: tick.time,
          timestamp: new Date(tick.time).getTime(),
          price: tick.price,
        }));
    } else {
      // Use all data points when under the limit
      priceData = data
        .filter(tick => tick && tick.time && typeof tick.price === 'number' && !isNaN(tick.price))
        .map(tick => ({
          time: tick.time,
          timestamp: new Date(tick.time).getTime(),
          price: tick.price,
        }));
    }

    return { candleData, priceData, timeRange };
  }, [data]);

  // Setup canvas with proper DPI handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setViewState(prev => {
        const friction = 0.9;
        const springStrength = 0.1;

        if (!isDragging) {
          // Horizontal offset
          const offsetDiff = prev.targetOffset - prev.offset;
          prev.velocity = prev.velocity * friction + offsetDiff * springStrength;
          prev.offset += prev.velocity;

          if (Math.abs(prev.velocity) < 0.1 && Math.abs(offsetDiff) < 0.1) {
            prev.offset = prev.targetOffset;
            prev.velocity = 0;
          }

          // Vertical offset
          const verticalOffsetDiff = prev.targetVerticalOffset - prev.verticalOffset;
          prev.verticalVelocity =
            prev.verticalVelocity * friction + verticalOffsetDiff * springStrength;
          prev.verticalOffset += prev.verticalVelocity;

          if (Math.abs(prev.verticalVelocity) < 0.1 && Math.abs(verticalOffsetDiff) < 0.1) {
            prev.verticalOffset = prev.targetVerticalOffset;
            prev.verticalVelocity = 0;
          }
        } else {
          prev.offset = prev.targetOffset;
          prev.velocity = 0;
          prev.verticalOffset = prev.targetVerticalOffset;
          prev.verticalVelocity = 0;
        }

        return { ...prev };
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging]);

  // Helper function to find time intervals
  const getTimeIntervals = (timeRange, chartWidth, zoom) => {
    const intervals = [];
    if (!timeRange || timeRange.start === 0 || timeRange.end === 0) return intervals;

    const totalDuration = timeRange.end - timeRange.start;
    const visibleDuration = totalDuration / zoom;

    // Determine interval based on zoom level
    let intervalMs;
    if (visibleDuration < 60 * 60 * 1000) {
      // Less than 1 hour visible
      intervalMs = 5 * 60 * 1000; // 5 minute intervals
    } else if (visibleDuration < 3 * 60 * 60 * 1000) {
      // Less than 3 hours
      intervalMs = 15 * 60 * 1000; // 15 minute intervals
    } else {
      intervalMs = 30 * 60 * 1000; // 30 minute intervals
    }

    const startTime = Math.floor(timeRange.start / intervalMs) * intervalMs;

    for (let time = startTime; time <= timeRange.end; time += intervalMs) {
      intervals.push({
        timestamp: time,
        time: new Date(time),
      });
    }

    return intervals;
  };

  // Draw Wyckoff phase strip function
  const drawWyckoffPhaseStrip = useCallback((ctx, width, height, visibleStart, visibleEnd, padding, actualChartBottom) => {
    // Wyckoff phase colors - distinct and vibrant
    const wyckoffColors = {
      ACCUMULATION: '#10B981',  // Emerald green - buying/accumulating
      MARKUP: '#3B82F6',       // Bright blue - uptrend/bullish
      DISTRIBUTION: '#F59E0B',  // Amber - selling/distributing
      MARKDOWN: '#EF4444',     // Red - downtrend/bearish
      UNKNOWN: '#6B7280'       // Gray - unknown
    };

    if (!wyckoffPhases || wyckoffPhases.length === 0) return;

    const stripHeight = 35;
    // Position strip below x-axis time labels with more spacing
    const stripY = actualChartBottom + 60; // Increased from 40 to 60 for more spacing

    // Draw background for the strip
    ctx.fillStyle = colors.panel || colors.background;
    ctx.fillRect(padding.left, stripY, width - padding.left - padding.right, stripHeight);

    // Draw border around the strip
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, stripY, width - padding.left - padding.right, stripHeight);

    // For ticker chart, we'll create a simplified phase display
    // Since we don't have exact index mapping, we'll show a general phase indicator
    if (currentPhase && currentPhase !== 'UNKNOWN') {
      const currentPhaseColor = wyckoffColors[currentPhase] || wyckoffColors.UNKNOWN;

      // Draw a full-width current phase indicator
      const phaseWidth = width - padding.left - padding.right;

      // Draw phase background with gradient effect
      const gradient = ctx.createLinearGradient(padding.left, stripY + 2, padding.left, stripY + stripHeight - 2);
      gradient.addColorStop(0, currentPhaseColor + '40'); // More transparent at top
      gradient.addColorStop(1, currentPhaseColor + '80'); // More opaque at bottom

      ctx.fillStyle = gradient;
      ctx.fillRect(padding.left, stripY + 2, phaseWidth, stripHeight - 4);

      // Draw phase border
      ctx.strokeStyle = currentPhaseColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(padding.left, stripY + 2, phaseWidth, stripHeight - 4);

      // Add inner glow effect
      ctx.shadowColor = currentPhaseColor;
      ctx.shadowBlur = 5;
      ctx.strokeRect(padding.left + 1, stripY + 3, phaseWidth - 2, stripHeight - 6);
      ctx.shadowBlur = 0;

      // Draw phase label
      const labelX = padding.left + phaseWidth / 2;
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
      ctx.fillText(`Current Phase: ${currentPhase.replace('_', ' ')}`, labelX, labelY);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }, [wyckoffPhases, currentPhase, colors, isMobile]);

  // Main drawing function
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || (processedData.priceData.length === 0 && processedData.candleData.length === 0))
      return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    // Use appropriate padding based on context
    const padding = canvasUtils.getPadding(isMobile, false);

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

    // Reserve extra space at bottom for labels, Wyckoff strip, AND volume bars
    // Use percentage of height to ensure it fits on all screen sizes
    const volumeBarHeight = Math.min(60, height * 0.08); // Max 60px or 8% of height
    const timestampHeight = 25; // Space for timestamp labels
    const bottomReservedSpace = 140 + volumeBarHeight + timestampHeight;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom - bottomReservedSpace;
    // Position volume bars and timestamps in clear stacked layout
    const volumeBarY = padding.top + chartHeight + 10;
    const xAxisLabelY = volumeBarY + volumeBarHeight + 18; // Timestamps clearly below volume

    // Calculate price range from both candles and price data
    const allPrices = [
      ...processedData.candleData.flatMap(c => [c.high, c.low]),
      ...processedData.priceData.map(p => p.price),
    ].filter(p => !isNaN(p));

    if (allPrices.length === 0) return;

    const basePriceRange = Math.max(0.01, Math.max(...allPrices) - Math.min(...allPrices));
    const baseMinPrice = Math.min(...allPrices);
    const baseMaxPrice = Math.max(...allPrices);
    const centerPrice = (baseMaxPrice + baseMinPrice) / 2;

    // Apply vertical zoom and offset
    const zoomedRange = basePriceRange / viewState.verticalZoom;
    const verticalShift = (viewState.verticalOffset * zoomedRange) / chartHeight;
    const minPrice = centerPrice - zoomedRange / 2 - verticalShift;
    const maxPrice = centerPrice + zoomedRange / 2 - verticalShift;
    const priceRange = maxPrice - minPrice;
    const pricePadding = Math.min(priceRange * 0.1, basePriceRange * 0.1);

    // Y-axis scaling
    const yScale = price => {
      return (
        padding.top +
        ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight
      );
    };

    // Calculate visible time range based on zoom and offset
    const totalWidth = chartWidth * viewState.zoom;

    // Clamp offset to prevent dragging outside data range
    const maxOffset = 0;
    const minOffset = Math.min(0, chartWidth - totalWidth);
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

    // Update offset if it was clamped
    if (clampedOffset !== viewState.offset) {
      setViewState(prev => ({
        ...prev,
        offset: clampedOffset,
        targetOffset: clampedOffset,
      }));
    }

    const visibleStartRatio = Math.max(0, -clampedOffset / totalWidth);
    const visibleEndRatio = Math.min(1, (chartWidth - clampedOffset) / totalWidth);

    const timeSpan = processedData.timeRange.end - processedData.timeRange.start;
    const visibleStart = processedData.timeRange.start + timeSpan * visibleStartRatio;
    const visibleEnd = processedData.timeRange.start + timeSpan * visibleEndRatio;
    const visibleSpan = Math.max(1, visibleEnd - visibleStart);

    // X-axis scaling for timestamps within the visible window
    const xScaleTime = timestamp => {
      const ratio = (timestamp - visibleStart) / visibleSpan;
      return padding.left + ratio * chartWidth;
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

    // Get time intervals based on zoom
    const timeIntervals = getTimeIntervals(processedData.timeRange, chartWidth, viewState.zoom);

    // Vertical grid lines at time intervals
    timeIntervals.forEach(interval => {
      const x = xScaleTime(interval.timestamp);
      if (x >= padding.left && x <= width - padding.right) {
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }
    });

    // Horizontal grid lines
    const horizontalLines = isMobile ? 4 : chartSettings.gridLines.horizontal;
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

    // Draw candles WITHOUT GAPS - aligned to END of their time period
    if (processedData.candleData.length > 0) {
      const visibleCandles = processedData.candleData.filter(candle => {
        const x = xScaleTime(candle.timestamp);
        return x >= padding.left - 100 && x <= width - padding.right + 100;
      });

      if (visibleCandles.length > 0) {
        visibleCandles.forEach((candle, i) => {
          // Position candle at the END of its minute
          const candleX = xScaleTime(candle.timestamp);

          // Calculate width to previous candle
          let candleWidth;
          if (i > 0) {
            const prevX = xScaleTime(visibleCandles[i - 1].timestamp);
            candleWidth = Math.max(1, candleX - prevX);
          } else if (i < visibleCandles.length - 1) {
            const nextX = xScaleTime(visibleCandles[i + 1].timestamp);
            candleWidth = Math.max(1, nextX - candleX);
          } else {
            // Single candle case - use 1 minute width relative to visible span
            candleWidth = ((60 * 1000) / visibleSpan) * chartWidth;
          }

          // Position candle body to START at previous minute and END at current minute
          const bodyX = candleX - candleWidth / 2;

          const isGreen = candle.close >= candle.open;
          const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

          // Draw wick at center of candle period
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.min(2, candleWidth * 0.2);
          ctx.beginPath();
          ctx.moveTo(bodyX, yScale(candle.high));
          ctx.lineTo(bodyX, yScale(candle.low));
          ctx.stroke();

          // Draw body - fill entire width
          const bodyTop = yScale(Math.max(candle.open, candle.close));
          const bodyBottom = yScale(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          ctx.fillStyle = color;
          const gapSize = Math.min(1, candleWidth * 0.05);
          ctx.fillRect(
            bodyX - candleWidth / 2 + gapSize,
            bodyTop,
            candleWidth - gapSize * 2,
            bodyHeight
          );

          // Add subtle border when zoomed in
          if (viewState.zoom > 2) {
            ctx.strokeStyle = colors.background;
            ctx.lineWidth = 0.5;
            ctx.strokeRect(
              bodyX - candleWidth / 2 + gapSize,
              bodyTop,
              candleWidth - gapSize * 2,
              bodyHeight
            );
          }
        });
      }
    }

    // Draw price line on top (foreground layer) with full detail
    if (processedData.priceData.length > 1) {
      // Filter visible points
      const visiblePricePoints = processedData.priceData.filter(point => {
        const x = xScaleTime(point.timestamp);
        return x >= padding.left - 100 && x <= width - padding.right + 100;
      });

      if (visiblePricePoints.length > 1) {
        // Draw area under curve first (semi-transparent)
        ctx.beginPath();
        visiblePricePoints.forEach((point, i) => {
          const x = xScaleTime(point.timestamp);
          const y = yScale(point.price);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        // Close the area
        if (visiblePricePoints.length > 0) {
          const lastX = xScaleTime(visiblePricePoints[visiblePricePoints.length - 1].timestamp);
          const firstX = xScaleTime(visiblePricePoints[0].timestamp);
          ctx.lineTo(lastX, height - padding.bottom);
          ctx.lineTo(firstX, height - padding.bottom);
        }
        ctx.closePath();

        const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        areaGradient.addColorStop(0, colors.ticker.area.top);
        areaGradient.addColorStop(1, colors.ticker.area.bottom);
        ctx.fillStyle = areaGradient;
        ctx.fill();

        // Draw background/shadow line first for enhanced visibility
        ctx.strokeStyle = colors.ticker.shadow;
        ctx.lineWidth = viewState.zoom > 2 ? 6 : 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.3;

        ctx.beginPath();
        visiblePricePoints.forEach((point, i) => {
          const x = xScaleTime(point.timestamp);
          const y = yScale(point.price);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Reset alpha and draw main line with enhanced visibility
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = colors.ticker.line;
        ctx.lineWidth = viewState.zoom > 2 ? 4 : 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Add subtle glow effect when zoomed
        if (viewState.zoom > 3) {
          ctx.shadowColor = colors.ticker.shadow;
          ctx.shadowBlur = 2;
        }

        ctx.beginPath();
        visiblePricePoints.forEach((point, i) => {
          const x = xScaleTime(point.timestamp);
          const y = yScale(point.price);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Draw data points when zoomed in with enhanced visibility
        if (viewState.zoom > 4) {
          // Draw shadow points first
          ctx.fillStyle = colors.ticker.pointShadow;
          ctx.globalAlpha = 0.4;
          visiblePricePoints.forEach(point => {
            const x = xScaleTime(point.timestamp);
            const y = yScale(point.price);

            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
          });

          // Draw main points
          ctx.globalAlpha = 1.0;
          ctx.fillStyle = colors.ticker.point;
          visiblePricePoints.forEach(point => {
            const x = xScaleTime(point.timestamp);
            const y = yScale(point.price);

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, 2 * Math.PI);
            ctx.fill();
          });
        }

        // Highlight latest point
        if (processedData.priceData.length > 0) {
          const lastPoint = processedData.priceData[processedData.priceData.length - 1];
          const x = xScaleTime(lastPoint.timestamp);
          const y = yScale(lastPoint.price);

          if (x >= padding.left && x <= width - padding.right) {
            // Pulsing outer ring with theme colors
            ctx.strokeStyle = colors.ticker.pointShadow;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.stroke();

            // Inner point with enhanced visibility
            ctx.fillStyle = colors.ticker.point;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();

            // Current price label with enhanced visibility
            const priceText = `₹${lastPoint.price.toFixed(2)}`;
            const labelX = Math.min(x + 10, width - padding.right - 70);

            // Draw label background with border
            ctx.fillStyle = colors.ticker.pointShadow;
            ctx.fillRect(labelX, y - 12, 65, 24);

            // Draw label text with contrasting color
            ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#ffffff';
            ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(priceText, labelX + 5, y + 3);
          }
        }
      }
    }

    // Draw significant trend indicators (arrows for major moves) when zoomed in
    if (processedData.priceData.length > 5 && viewState.zoom > 1.5) {
      const visiblePricePoints = processedData.priceData.filter(point => {
        const x = xScaleTime(point.timestamp);
        return x >= padding.left - 100 && x <= width - padding.right + 100;
      });

      if (visiblePricePoints.length > 5) {
        // Find significant price movements
        const significantMoves = [];
        const lookbackWindow = Math.max(3, Math.floor(visiblePricePoints.length * 0.02));

        for (let i = lookbackWindow; i < visiblePricePoints.length - lookbackWindow; i++) {
          const currentPrice = visiblePricePoints[i].price;
          const prevAvg =
            visiblePricePoints.slice(i - lookbackWindow, i).reduce((sum, p) => sum + p.price, 0) /
            lookbackWindow;
          const nextAvg =
            visiblePricePoints
              .slice(i + 1, i + lookbackWindow + 1)
              .reduce((sum, p) => sum + p.price, 0) / lookbackWindow;

          const changeFromPrev = ((currentPrice - prevAvg) / prevAvg) * 100;
          const changeToNext = ((nextAvg - currentPrice) / currentPrice) * 100;

          // Detect significant dips or peaks
          if (
            Math.abs(changeFromPrev) > chartSettings.significantMoveThreshold ||
            Math.abs(changeToNext) > chartSettings.significantMoveThreshold
          ) {
            const isDip =
              changeFromPrev < -chartSettings.significantMoveThreshold &&
              changeToNext > chartSettings.significantMoveThreshold;
            const isPeak =
              changeFromPrev > chartSettings.significantMoveThreshold &&
              changeToNext < -chartSettings.significantMoveThreshold;

            if (isDip || isPeak) {
              significantMoves.push({
                point: visiblePricePoints[i],
                type: isDip ? 'dip' : 'peak',
                magnitude: Math.max(Math.abs(changeFromPrev), Math.abs(changeToNext)),
              });
            }
          }
        }

        // Draw arrows for significant moves
        significantMoves.forEach(move => {
          const x = xScaleTime(move.point.timestamp);
          const y = yScale(move.point.price);

          if (x >= padding.left && x <= width - padding.right) {
            const arrowSize = chartSettings.trendArrowSize;
            const color = move.type === 'dip' ? colors.candle.bullish : colors.candle.bearish;
            const alpha = Math.min(0.8, 0.4 + move.magnitude / 5);

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;

            // Draw arrow pointing to the significant move
            ctx.beginPath();
            if (move.type === 'dip') {
              // Downward arrow for dips
              const arrowY = y + arrowSize + 5;
              ctx.moveTo(x, arrowY);
              ctx.lineTo(x - arrowSize / 2, arrowY + arrowSize);
              ctx.lineTo(x + arrowSize / 2, arrowY + arrowSize);
              ctx.closePath();
              ctx.fill();

              // Add exclamation mark
              ctx.fillStyle = colors.text.primary;
              ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('!', x, arrowY + arrowSize + 12);
            } else {
              // Upward arrow for peaks
              const arrowY = y - arrowSize - 5;
              ctx.moveTo(x, arrowY);
              ctx.lineTo(x - arrowSize / 2, arrowY - arrowSize);
              ctx.lineTo(x + arrowSize / 2, arrowY - arrowSize);
              ctx.closePath();
              ctx.fill();

              // Add exclamation mark
              ctx.fillStyle = colors.text.primary;
              ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('!', x, arrowY - arrowSize - 8);
            }

            ctx.restore();
          }
        });
      }
    }

    ctx.restore(); // Remove clipping

    // Draw axes labels
    ctx.fillStyle = colors.text.secondary;
    const labelFontSize = isMobile ? '10px' : '12px';
    ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

    // X-axis labels - show time based on zoom level
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const visibleIntervals = timeIntervals.filter(interval => {
      const x = xScaleTime(interval.timestamp);
      return x >= padding.left && x <= width - padding.right;
    });

    // Fallback: if no intervals found, create labels from visible data points
    let labelsToShow = visibleIntervals;
    if (labelsToShow.length === 0 && processedData.candleData.length > 0) {
      const maxLabels = isMobile ? 4 : 6;
      const step = Math.max(1, Math.floor(processedData.candleData.length / maxLabels));
      labelsToShow = processedData.candleData
        .filter((_, i) => i % step === 0)
        .map(candle => ({
          timestamp: candle.timestamp,
          time: new Date(candle.timestamp)
        }));
    }

    // Additional fallback: if still no labels, create from time range
    if (labelsToShow.length === 0 && processedData.timeRange.start && processedData.timeRange.end) {
      const maxLabels = isMobile ? 4 : 6;
      const timeSpan = processedData.timeRange.end - processedData.timeRange.start;
      labelsToShow = [];
      for (let i = 0; i < maxLabels; i++) {
        const timestamp = processedData.timeRange.start + (timeSpan * i) / (maxLabels - 1);
        labelsToShow.push({
          timestamp,
          time: new Date(timestamp)
        });
      }
    }


    // Limit number of labels to avoid crowding
    const maxLabels = isMobile ? 4 : 8;
    const labelStep = Math.max(1, Math.ceil(labelsToShow.length / maxLabels));

    // Draw X-axis time labels
    if (labelsToShow.length > 0) {
      labelsToShow.forEach((interval, i) => {
        if (i % labelStep === 0) {
          const x = xScaleTime(interval.timestamp);
          if (x >= padding.left && x <= width - padding.right) {
            const timeString = formatTime(interval.time, 'HH:mm');

            // Draw background for better visibility
            const textWidth = ctx.measureText(timeString).width;
            ctx.fillStyle = colors.tooltip.background || colors.panelBackground;
            ctx.fillRect(x - textWidth/2 - 3, xAxisLabelY - 14, textWidth + 6, 18);

            // Draw border for visibility
            ctx.strokeStyle = colors.grid;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - textWidth/2 - 3, xAxisLabelY - 14, textWidth + 6, 18);

            // Draw text with primary color
            ctx.fillStyle = colors.text.primary;
            ctx.fillText(timeString, x, xAxisLabelY);
          }
        }
      });
    }

    // Draw volume bars ABOVE timestamp labels
    const volumeBarBottom = volumeBarY + volumeBarHeight;

    if (data && data.length > 0) {
      // Filter to visible range based on zoom/pan (using index-based approach)
      const totalDataPoints = data.length;
      const visibleStartIndex = Math.floor(totalDataPoints * visibleStartRatio);
      const visibleEndIndex = Math.ceil(totalDataPoints * visibleEndRatio);
      const visibleData = data.slice(visibleStartIndex, visibleEndIndex);

      if (visibleData.length > 0) {
        // Calculate incremental volume (change from previous tick) for visible data
        const incrementalVolumes = visibleData.map((tick, index) => {
          const currentVol = tick.volumeTradedToday || tick.volume || 0;
          if (index === 0) {
            // For first visible tick, compare with previous tick if available
            if (visibleStartIndex > 0) {
              const prevVol = data[visibleStartIndex - 1].volumeTradedToday || data[visibleStartIndex - 1].volume || 0;
              return Math.max(0, currentVol - prevVol);
            }
            return currentVol;
          }
          const prevVol = visibleData[index - 1].volumeTradedToday || visibleData[index - 1].volume || 0;
          return Math.max(0, currentVol - prevVol); // Incremental volume
        });

        const maxVolume = Math.max(...incrementalVolumes, 1);

        // Draw volume bars background
        ctx.fillStyle = colors.panel || colors.background;
        ctx.fillRect(padding.left, volumeBarY, chartWidth, volumeBarHeight);

        // Draw border
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.strokeRect(padding.left, volumeBarY, chartWidth, volumeBarHeight);

        // Draw grid line at 50%
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(padding.left, volumeBarY + volumeBarHeight / 2);
        ctx.lineTo(width - padding.right, volumeBarY + volumeBarHeight / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw volume bars with linear spacing (evenly distributed across width)
        const barWidth = chartWidth / visibleData.length;
        incrementalVolumes.forEach((volume, index) => {
          if (volume > 0) {
            const barHeight = (volume / maxVolume) * (volumeBarHeight - 4); // Leave 2px margin top/bottom
            const x = padding.left + (index * barWidth);
            const y = volumeBarBottom - barHeight - 2; // 2px bottom margin

            // Use ticker color scheme with better visibility
            const volumeColor = colors.ticker?.line || '#3b82f6';
            ctx.fillStyle = volumeColor + 'CC'; // 80% opacity for better visibility
            ctx.fillRect(x, y, Math.max(0.5, barWidth - 0.5), barHeight);
          }
        });

        // Draw volume labels
        ctx.fillStyle = colors.text.secondary;
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const formatVolume = (vol) => {
          if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
          if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
          return vol.toString();
        };

        ctx.fillText(formatVolume(maxVolume), padding.left - 5, volumeBarY + 5);
        ctx.fillText('0', padding.left - 5, volumeBarBottom - 5);

        // Draw "Volume" title
        ctx.fillStyle = colors.text.primary;
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Volume', 5, volumeBarY + volumeBarHeight / 2);
      }
    }

    // Draw Wyckoff phase bottom strip (below timestamps and volume)
    drawWyckoffPhaseStrip(ctx, width, height, visibleStart, visibleEnd, padding, padding.top + chartHeight + volumeBarHeight + 80);

    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= horizontalLines; i++) {
      const price =
        minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
      const y = yScale(price);
      ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
    }

    // Draw crosshair
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

      // Calculate values at crosshair
      const price =
        maxPrice +
        pricePadding -
        ((mousePos.y - padding.top) / chartHeight) * (priceRange + 2 * pricePadding);

      // Price label
      ctx.fillStyle = colors.tooltip.background;
      ctx.fillRect(width - padding.right + 5, mousePos.y - 10, 75, 20);
      ctx.strokeStyle = colors.tooltip.border;
      ctx.strokeRect(width - padding.right + 5, mousePos.y - 10, 75, 20);
      ctx.fillStyle = colors.text.primary;
      ctx.font = chartSettings.fonts.labels;
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), width - padding.right + 10, mousePos.y + 4);

      // Time label at TOP
      const hoveredTime = visibleStart + ((mousePos.x - padding.left) / chartWidth) * visibleSpan;
      const timeLabel = formatTime(new Date(hoveredTime), 'HH:mm:ss');

      ctx.fillStyle = colors.tooltip.background;
      ctx.fillRect(mousePos.x - 40, padding.top - 25, 80, 20);
      ctx.strokeStyle = colors.tooltip.border;
      ctx.strokeRect(mousePos.x - 40, padding.top - 25, 80, 20);
      ctx.fillStyle = colors.text.primary;
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, mousePos.x, padding.top - 11);
    }
  }, [processedData, colors, viewState, mousePos, showCrosshair, isMobile, theme, drawWyckoffPhaseStrip]);

  // Draw chart on data change
  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Enhanced mouse interactions with vertical zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isMobile) return;

    const handleWheel = e => {
      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
      const mouseRatio = (x - chartSettings.padding.left) / chartWidth;

      // Determine deltas (some devices report primarily deltaX for horizontal gestures)
      const absX = Math.abs(e.deltaX || 0);
      const absY = Math.abs(e.deltaY || 0);

      // Shift+wheel → vertical zoom (unchanged)
      if (e.shiftKey) {
        const dominantDelta = absY > absX ? e.deltaY : e.deltaX; // support devices where Y is 0
        const effectiveDelta = dominantDelta !== 0 ? dominantDelta : e.deltaY || e.deltaX || 0;
        const zoomFactor = effectiveDelta > 0 ? 0.9 : 1.1;

        const newVerticalZoom = Math.max(1.0, Math.min(20, viewState.verticalZoom * zoomFactor));

        // Keep cursor-aligned while zooming vertically
        // Reserve fixed space for bottom elements
        const bottomReservedSpace = 70;
        const chartHeight = rect.height - chartSettings.padding.top - chartSettings.padding.bottom - bottomReservedSpace;
        const mouseY = e.clientY - rect.top - chartSettings.padding.top;
        const mouseRatioY = Math.max(0, Math.min(1, mouseY / chartHeight));
        const zoomRatio = newVerticalZoom / viewState.verticalZoom;
        const offsetAdjustment = chartHeight * (mouseRatioY - 0.5) * (1 - 1 / zoomRatio);
        const newVerticalOffset = viewState.verticalOffset + offsetAdjustment;

        setViewState(prev => ({
          ...prev,
          verticalZoom: newVerticalZoom,
          verticalOffset: newVerticalOffset,
          targetVerticalOffset: newVerticalOffset,
        }));
        return;
      }

      // Always treat wheel as zoom, not pan (use drag for panning)
      // Use vertical wheel delta for zoom
      const effectiveDelta = e.deltaY || 0;
      const zoomFactor = effectiveDelta > 0 ? 0.9 : 1.1;

      const newZoom = Math.max(1.0, Math.min(100, viewState.zoom * zoomFactor));
      const totalWidth = chartWidth * viewState.zoom;
      const newTotalWidth = chartWidth * newZoom;
      const widthChange = newTotalWidth - totalWidth;
      const newOffset = viewState.offset - widthChange * mouseRatio; // zoom around cursor
      const maxOffset = 0;
      const minOffset = Math.min(0, chartWidth - newTotalWidth);
      const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

      setViewState(prev => ({
        ...prev,
        zoom: newZoom,
        offset: clampedOffset,
        targetOffset: clampedOffset,
      }));
    };

    const handleMouseDown = e => {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        offset: viewState.targetOffset,
        verticalOffset: viewState.targetVerticalOffset,
      });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
        const totalWidth = chartWidth * viewState.zoom;

        // Calculate horizontal offset limits
        const maxOffset = 0;
        const minOffset = Math.min(0, chartWidth - totalWidth);

        const newOffset = dragStart.offset + dx;
        const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

        setViewState(prev => ({
          ...prev,
          targetOffset: clampedOffset,
          targetVerticalOffset: dragStart.verticalOffset - dy,
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
      canvas.style.cursor = 'default';
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
  }, [viewState, isDragging, dragStart, isMobile]); // Restore necessary dependencies for drag functionality

  const handleReset = () => {
    setViewState({
      zoom: 1,
      verticalZoom: 1,
      offset: 0,
      targetOffset: 0,
      velocity: 0,
      verticalOffset: 0,
      targetVerticalOffset: 0,
      verticalVelocity: 0,
    });
  };

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: colors.panelBackground }}
      >
        <div className="text-center" style={{ color: colors.text.secondary }}>
          <div className="text-4xl mb-4">⚡</div>
          <p className="text-lg">No ticker data available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative"
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        backgroundColor: colors.panelBackground,
        overflow: 'hidden'
      }}
    >
      {/* ULTRA COMPACT HEADER - ALL INFO IN ONE LINE */}
      <div className="px-2 py-1 border-b text-xs" style={{ borderColor: colors.grid }}>
        <div className="flex justify-between items-center">
          {/* All Info Combined - Symbol, Price, Change, Data Stats */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: colors.text.primary }}>
              {symbol}
            </span>
            <span className="font-semibold" style={{ color: colors.text.primary }}>
              ₹{stats.currentPrice.toFixed(2)}
            </span>
            <span className={`${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.change >= 0 ? '▲' : '▼'}
              {Math.abs(stats.change).toFixed(2)} ({stats.changePercent >= 0 ? '+' : ''}
              {stats.changePercent.toFixed(2)}%)
            </span>
            <span style={{ color: colors.text.secondary }}>|</span>
            <span className="text-blue-400">{processedData.priceData.length}t</span>
            <span className="text-yellow-400">{processedData.candleData.length}c</span>
            <span style={{ color: colors.text.secondary }}>
              Vol:{stats.volume.toLocaleString()}
            </span>
            <span style={{ color: colors.text.secondary }}>
              ₹{stats.low.toFixed(0)}-{stats.high.toFixed(0)}
            </span>
          </div>

          {/* Right - Controls Info & Status */}
          <div className="flex items-center gap-2" style={{ color: colors.text.secondary }}>
            {!isMobile && (
              <>
                <span>Pan:H-scroll/Drag Zoom:Wheel V-zoom:Shift+Wheel</span>
                <span>
                  H:{(viewState.zoom * 100).toFixed(0)}% V:
                  {(viewState.verticalZoom * 100).toFixed(0)}%
                </span>
                <span>|</span>
              </>
            )}
            {isRealTime && (
              <div className="flex items-center gap-1 bg-green-600 px-1.5 py-0.5 rounded text-xs text-white">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
            )}
            <button
              onClick={handleReset}
              className="px-1.5 py-0.5 rounded text-xs transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.background,
                border: `1px solid ${colors.grid}`,
                color: colors.text.primary,
              }}
              title="Reset zoom and pan"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
      {/*</div>*/}

      {/* CHART AREA - Takes remaining space */}
      <div className="relative flex" style={{ height: 'calc(100% - 25px)' }}>
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ cursor: isMobile ? 'default' : 'crosshair' }}
          />
        </div>
      </div>
    </div>
  );
}
