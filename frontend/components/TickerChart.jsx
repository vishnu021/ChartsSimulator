'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { themes, chartSettings } from './chartConfig';

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
    if (!timeRange || timeRange.start === 0) return intervals;

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
  const drawWyckoffPhaseStrip = useCallback((ctx, width, height, visibleStart, visibleEnd, padding) => {
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
    // Position strip right after the adjusted chart area
    const reservedSpace = 85;
    const adjustedHeight = height - reservedSpace;
    const stripY = adjustedHeight + padding.top + 15; // Position after chart with small gap

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

    // Reserve space for Wyckoff phase strip (35px) + x-axis labels (30px) + margins (15px) = 80px
    // Reserve fixed space for bottom elements
    const bottomReservedSpace = 70;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom - bottomReservedSpace;

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
        ctx.lineTo(x, height - padding.bottom);
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
    const visibleIntervals = timeIntervals.filter(interval => {
      const x = xScaleTime(interval.timestamp);
      return x >= padding.left && x <= width - padding.right;
    });

    // Limit number of labels to avoid crowding
    const maxLabels = isMobile ? 4 : 8;
    const labelStep = Math.ceil(visibleIntervals.length / maxLabels);

    visibleIntervals.forEach((interval, i) => {
      if (i % labelStep === 0) {
        const x = xScaleTime(interval.timestamp);
        const timeString = formatTime(interval.time, 'HH:mm');
        // Position x-axis labels at bottom
        ctx.fillText(timeString, x, height - 15);
      }
    });

    // Draw Wyckoff phase bottom strip
    drawWyckoffPhaseStrip(ctx, width, height, visibleStart, visibleEnd, padding);

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

      // Time label
      const hoveredTime = visibleStart + ((mousePos.x - padding.left) / chartWidth) * visibleSpan;
      const timeLabel = formatTime(new Date(hoveredTime), 'HH:mm:ss');

      ctx.fillStyle = colors.tooltip.background;
      ctx.fillRect(mousePos.x - 40, height - padding.bottom + 5, 80, 20);
      ctx.strokeRect(mousePos.x - 40, height - padding.bottom + 5, 80, 20);
      ctx.fillStyle = colors.text.primary;
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, mousePos.x, height - padding.bottom + 20);
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

      // If the gesture is predominantly horizontal → smooth pan, not zoom
      if (absX > absY) {
        const totalWidth = chartWidth * viewState.zoom;
        const maxOffset = 0;
        const minOffset = Math.min(0, chartWidth - totalWidth);

        // Positive deltaX means user scrolls right; move content left (offset more negative)
        const panDelta = -e.deltaX; // invert to match intuitive scroll direction
        const newTarget = Math.max(
          minOffset,
          Math.min(maxOffset, viewState.targetOffset + panDelta)
        );

        setViewState(prev => ({
          ...prev,
          targetOffset: newTarget,
        }));
        return;
      }

      // Otherwise treat as horizontal zoom (vertical wheel gesture)
      const dominantDelta = absY >= absX ? e.deltaY : e.deltaX;
      const effectiveDelta = dominantDelta !== 0 ? dominantDelta : e.deltaY || e.deltaX || 0;
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

        {/* Vertical Zoom Control */}
        {!isMobile && (
          <div
            className="flex flex-col items-center px-2 py-4"
            style={{ backgroundColor: colors.background }}
          >
            <div className="text-xs mb-2 text-center" style={{ color: colors.text.secondary }}>
              Vertical
            </div>

            <button
              onClick={() =>
                setViewState(prev => ({
                  ...prev,
                  verticalZoom: Math.min(20, prev.verticalZoom * 1.2),
                  targetVerticalOffset: prev.targetVerticalOffset, // Preserve vertical position
                }))
              }
              className="px-2 py-2 mb-1 rounded text-sm hover:opacity-80 transition-all"
              style={{
                backgroundColor: colors.panelBackground,
                border: `1px solid ${colors.grid}`,
                color: colors.text.primary,
              }}
              title="Zoom in vertically (Shift+Scroll also works)"
            >
              +
            </button>

            <div className="flex-1 flex flex-col justify-center py-2">
              <div className="text-center text-xs font-bold" style={{ color: colors.text.primary }}>
                {(viewState.verticalZoom * 100).toFixed(0)}%
              </div>
            </div>

            <button
              onClick={() =>
                setViewState(prev => ({
                  ...prev,
                  verticalZoom: Math.max(1.0, prev.verticalZoom / 1.2),
                  targetVerticalOffset: prev.targetVerticalOffset, // Preserve vertical position
                }))
              }
              className="px-2 py-2 mb-1 rounded text-sm hover:opacity-80 transition-all"
              style={{
                backgroundColor: colors.panelBackground,
                border: `1px solid ${colors.grid}`,
                color: colors.text.primary,
              }}
              title="Zoom out vertically (Shift+Scroll also works)"
            >
              -
            </button>

            <button
              onClick={() =>
                setViewState(prev => ({
                  ...prev,
                  verticalZoom: 1,
                  verticalOffset: 0,
                  targetVerticalOffset: 0,
                  verticalVelocity: 0,
                }))
              }
              className="px-1 py-1 mt-2 rounded text-xs hover:opacity-80"
              style={{
                backgroundColor: colors.input.focus,
                color: '#ffffff',
              }}
            >
              1x
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
