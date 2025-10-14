'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { themes } from './chartConfig';
import { CHART_CONSTANTS, UI_CONSTANTS } from '../utils/constants';
import { canvasUtils, scalingUtils } from '../utils/chart';

export default function CandleChart({
  data,
  theme = 'dark',
  externalViewState = null,
  isDashboard = false,
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [internalViewState, setInternalViewState] = useState({
    zoom: 1,
    offset: 0,
    targetOffset: 0,
    velocity: 0,
  });

  // Use external view state if provided, otherwise use internal state
  const viewState = externalViewState || internalViewState;
  const setViewState = useMemo(() => {
    return externalViewState ? () => {} : setInternalViewState;
  }, [externalViewState]);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredPhase, setHoveredPhase] = useState(null);

  const colors = themes[theme];

  // Draw volume bars function
  const drawVolumeBars = useCallback((ctx, width, height, visibleStart, visibleEnd, candleWidth, visibleCandles, xScale) => {
    if (!visibleCandles || visibleCandles.length === 0) return;

    const volumeHeight = isDashboard ? 20 : 50; // Height of volume section (reduced for dashboard)
    const padding = canvasUtils.getPadding(isMobile, isDashboard);
    const bottomSpace = isDashboard ? (isMobile ? 10 : 12) : 15;
    const availableHeight = height - bottomSpace;
    const stripHeight = isDashboard ? 16 : 35;

    // Position volume bars above the Wyckoff phase strip with minimal gap
    const volumeY = availableHeight - stripHeight - volumeHeight - 2;

    // Find max volume for scaling
    const volumes = visibleCandles.map(c => c.volume || 0);
    const maxVolume = Math.max(...volumes, 1); // Avoid division by zero

    // Debug logging (disabled for production)
    // console.log('📊 Volume Bar Debug:', {
    //   volumeHeight,
    //   volumeY,
    //   maxVolume,
    //   bottomSpace,
    //   availableHeight,
    //   stripHeight,
    //   height,
    //   sampleVolumes: volumes.slice(0, 5)
    // });

    // Draw volume bars
    visibleCandles.forEach((candle, i) => {
      if (!candle.volume || candle.volume === 0) return;

      // Use xScale for consistent positioning with candles
      const x = xScale(visibleStart + i);
      const barHeight = (candle.volume / maxVolume) * volumeHeight;
      const barY = volumeY + volumeHeight - barHeight;

      // Color based on candle direction
      const isGreen = candle.close >= candle.open;
      const volumeColor = isGreen ? colors.candle.bullish : colors.candle.bearish;

      ctx.fillStyle = volumeColor;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(
        x - (candleWidth * CHART_CONSTANTS.CANDLE.BODY_WIDTH_RATIO) / 2,
        barY,
        candleWidth * CHART_CONSTANTS.CANDLE.BODY_WIDTH_RATIO,
        barHeight
      );
      ctx.globalAlpha = 1.0;
    });

    // Draw volume scale labels
    ctx.fillStyle = colors.text.secondary;
    const labelFontSize = isDashboard ? (isMobile ? '8px' : '9px') : isMobile ? '9px' : '10px';
    ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Format volume for display
    const formatVolume = (vol) => {
      if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
      if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
      return vol.toString();
    };

    // Draw max volume label
    const labelX = isDashboard ? Math.max(40, padding.left - 3) : padding.left - 10;
    ctx.fillText(formatVolume(maxVolume), labelX, volumeY + 4);

    // Draw volume baseline
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, volumeY + volumeHeight);
    ctx.lineTo(width - padding.right, volumeY + volumeHeight);
    ctx.stroke();
  }, [data, colors, isMobile, isDashboard]);

  // Draw Wyckoff phase strip function
  const drawWyckoffPhaseStrip = useCallback((ctx, width, height, visibleStart, visibleEnd, candleWidth) => {
    // Wyckoff phase colors - distinct and vibrant
    const wyckoffColors = {
      ACCUMULATION: '#10B981',  // Emerald green - buying/accumulating
      MARKUP: '#3B82F6',       // Bright blue - uptrend/bullish
      DISTRIBUTION: '#F59E0B',  // Amber - selling/distributing
      MARKDOWN: '#EF4444',     // Red - downtrend/bearish
      UNKNOWN: '#6B7280'       // Gray - unknown
    };
    if (!data.wyckoffPhases || data.wyckoffPhases.length === 0) return;

    const stripHeight = isDashboard ? 16 : 35;
    const padding = canvasUtils.getPadding(isMobile, isDashboard);

    // Position strip ensuring it's visible in viewport and doesn't overlap with x-axis
    const bottomSpace = isDashboard ? (isMobile ? 10 : 12) : 15;
    const availableHeight = height - bottomSpace; // Account for bottom reserved space
    const stripY = availableHeight - stripHeight; // Positioned at bottom edge

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
  }, [data, colors, isMobile, isDashboard]);

  // Helper function to get phase under mouse cursor
  const getPhaseUnderMouse = useCallback((mouseX, mouseY, canvas) => {
    if (!data.wyckoffPhases || !canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const stripHeight = isDashboard ? 16 : 35;
    const bottomSpace = isDashboard ? (isMobile ? 10 : 12) : 15;
    const availableHeight = rect.height - bottomSpace; // Account for bottom reserved space
    const stripY = availableHeight - stripHeight; // Match the drawing position

    // Check if mouse is in the phase strip area
    if (mouseY < stripY || mouseY > stripY + stripHeight) return null;

    const { visibleStart, visibleEnd, candleWidth } = scalingUtils.calculateVisibleRange(
      data.candles.length,
      rect.width - 180, // Account for padding
      viewState.zoom,
      viewState.offset
    );

    // Find which phase the mouse is over
    for (const phase of data.wyckoffPhases) {
      if (phase.startIndex >= visibleStart && phase.endIndex <= visibleEnd) {
        const phaseStartX = 90 + (phase.startIndex - visibleStart) * candleWidth;
        const phaseEndX = 90 + (phase.endIndex - visibleStart + 1) * candleWidth;

        if (mouseX >= phaseStartX && mouseX <= phaseEndX) {
          return phase;
        }
      }
    }

    return null;
  }, [data, viewState, isDashboard, isMobile]);

  // Function to draw phase tooltip
  const drawPhaseTooltip = useCallback((ctx, phase, mouseX, mouseY) => {
    if (!phase) return;

    const wyckoffColors = {
      ACCUMULATION: '#10B981',
      MARKUP: '#3B82F6',
      DISTRIBUTION: '#F59E0B',
      MARKDOWN: '#EF4444',
      UNKNOWN: '#6B7280'
    };

    const phaseNames = {
      ACCUMULATION: 'Accumulation Phase',
      MARKUP: 'Markup Phase (Uptrend)',
      DISTRIBUTION: 'Distribution Phase',
      MARKDOWN: 'Markdown Phase (Downtrend)',
      UNKNOWN: 'Unknown Phase'
    };

    const text = phaseNames[phase.phase] || 'Unknown Phase';
    const phaseColor = wyckoffColors[phase.phase] || wyckoffColors.UNKNOWN;

    // Tooltip dimensions
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    const textWidth = ctx.measureText(text).width;
    const tooltipWidth = textWidth + 16;
    const tooltipHeight = 28;

    // Position tooltip above mouse, but keep it within canvas bounds
    let tooltipX = mouseX - tooltipWidth / 2;
    let tooltipY = mouseY - tooltipHeight - 10;

    // Boundary checks
    if (tooltipX < 10) tooltipX = 10;
    if (tooltipX + tooltipWidth > ctx.canvas.width - 10) {
      tooltipX = ctx.canvas.width - tooltipWidth - 10;
    }
    if (tooltipY < 10) tooltipY = mouseY + 20;

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
    ctx.fill();

    // Draw colored indicator
    ctx.fillStyle = phaseColor;
    ctx.beginPath();
    ctx.roundRect(tooltipX + 8, tooltipY + 8, 12, 12, 2);
    ctx.fill();

    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tooltipX + 26, tooltipY + tooltipHeight / 2);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < UI_CONSTANTS.BREAKPOINTS.MOBILE);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvasUtils.setupCanvas(canvas);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [data]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setViewState(prev => {
        const { FRICTION, SPRING_STRENGTH, VELOCITY_THRESHOLD, OFFSET_THRESHOLD } =
          CHART_CONSTANTS.ANIMATION;

        if (!isDragging) {
          const offsetDiff = prev.targetOffset - prev.offset;
          prev.velocity = prev.velocity * FRICTION + offsetDiff * SPRING_STRENGTH;
          prev.offset += prev.velocity;

          if (
            Math.abs(prev.velocity) < VELOCITY_THRESHOLD &&
            Math.abs(offsetDiff) < OFFSET_THRESHOLD
          ) {
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
  }, [isDragging, setViewState]);

  // Draw chart function
  const drawChart = useCallback(() => {
    if (!data || !canvasRef.current) return;

    const setup = canvasUtils.setupCanvas(canvasRef.current);
    if (!setup) return;

    const { ctx, width, height } = setup;
    const padding = canvasUtils.getPadding(isMobile, isDashboard);

    // Calculate available space ensuring bottom elements are visible
    // Use responsive spacing based on context - adequate for dashboard to prevent overlap
    const topPadding = isDashboard ? (isMobile ? 8 : 12) : padding.top;
    const bottomReservedSpace = isDashboard ? (isMobile ? 10 : 12) : 15;
    const { chartWidth } = canvasUtils.getChartDimensions(width, height, padding);
    // Ensure chart doesn't extend beyond available space with balanced padding
    const availableHeight = height - bottomReservedSpace - topPadding;
    const chartHeight = Math.max(100, availableHeight);
    // Add extra spacing to prevent candles from touching bottom elements
    const candleClipHeight = isDashboard ? chartHeight - 24 : chartHeight - 8;

    // Clear canvas and draw background
    canvasUtils.clearCanvas(ctx, colors, width, height);
    canvasUtils.drawPanelBackground(ctx, colors, padding, width, height);

    if (!data.candles || data.candles.length === 0) return;

    // Calculate visible range
    const { visibleStart, visibleEnd, candleWidth } =
      scalingUtils.calculateVisibleRange(
        data.candles.length,
        chartWidth,
        viewState.zoom,
        viewState.offset
      );

    const visibleCandles = data.candles.slice(visibleStart, visibleEnd);
    if (visibleCandles.length === 0) return;

    // Calculate price range
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const { minPrice, maxPrice, priceRange, pricePadding } =
      scalingUtils.calculatePriceRange(prices);

    // Create scaling functions with adjusted padding for dashboard
    const adjustedPadding = { ...padding, top: topPadding };
    const yScale = scalingUtils.createYScale(
      minPrice,
      maxPrice,
      priceRange,
      pricePadding,
      adjustedPadding,
      chartHeight
    );
    const xScale = scalingUtils.createXScale(padding, candleWidth, visibleStart);

    // Set clipping region with extra spacing to prevent candle overlap with labels
    canvasUtils.setClippingRegion(ctx, padding, chartWidth, candleClipHeight);

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal grid lines (reduced for dashboard to avoid clutter)
    const horizontalLines = isDashboard
      ? (isMobile ? 2 : 3)  // Only 2-3 lines for dashboard
      : (isMobile ? CHART_CONSTANTS.GRID_LINES.HORIZONTAL_MOBILE : CHART_CONSTANTS.GRID_LINES.HORIZONTAL_DESKTOP);
    for (let i = 0; i <= horizontalLines; i++) {
      const price =
        minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
      const y = yScale(price);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines (stop at chart end, not beyond)
    const verticalGridLines = isMobile
      ? CHART_CONSTANTS.GRID_LINES.VERTICAL_MOBILE
      : CHART_CONSTANTS.GRID_LINES.VERTICAL_DESKTOP;
    const verticalStepSize = Math.max(1, Math.floor(visibleCandles.length / verticalGridLines));
    const gridLineEndY = topPadding + chartHeight; // Stop at chart end
    for (let i = 0; i < visibleCandles.length; i += verticalStepSize) {
      const x = xScale(visibleStart + i);
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, gridLineEndY);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw candlesticks
    visibleCandles.forEach((candle, i) => {
      const x = xScale(visibleStart + i);
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = CHART_CONSTANTS.CANDLE.WICK_LINE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, yScale(candle.high));
      ctx.lineTo(x, yScale(candle.low));
      ctx.stroke();

      // Draw body
      const bodyTop = yScale(Math.max(candle.open, candle.close));
      const bodyBottom = yScale(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(CHART_CONSTANTS.CANDLE.MIN_BODY_HEIGHT, bodyBottom - bodyTop);

      ctx.fillStyle = color;
      ctx.fillRect(
        x - (candleWidth * CHART_CONSTANTS.CANDLE.BODY_WIDTH_RATIO) / 2,
        bodyTop,
        candleWidth * CHART_CONSTANTS.CANDLE.BODY_WIDTH_RATIO,
        bodyHeight
      );
    });

    canvasUtils.clearClippingRegion(ctx);

    // Draw axes labels
    ctx.fillStyle = colors.text.secondary;
    const labelFontSize = isDashboard ? (isMobile ? '9px' : '10px') : isMobile ? '10px' : '12px';
    ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

    // Y-axis labels with proper positioning for dashboard
    ctx.textAlign = 'right';
    for (let i = 0; i <= horizontalLines; i++) {
      const price =
        minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
      const y = yScale(price);
      // Adjust x position for dashboard to prevent trimming and chart overlap
      const labelX = isDashboard ? Math.max(40, padding.left - 3) : padding.left - 10;
      ctx.fillText(price.toFixed(0), labelX, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xAxisGridLines = isMobile
      ? CHART_CONSTANTS.GRID_LINES.VERTICAL_MOBILE
      : CHART_CONSTANTS.GRID_LINES.VERTICAL_DESKTOP;
    const xAxisStepSize = Math.max(1, Math.floor(visibleCandles.length / xAxisGridLines));

    for (let i = 0; i < visibleCandles.length; i += xAxisStepSize) {
      const candle = visibleCandles[i];
      if (candle && candle.time) {
        const x = xScale(visibleStart + i);
        const timeLabel = format(new Date(candle.time), isMobile ? 'HH:mm' : 'HH:mm:ss');
        // Position x-axis labels with compact spacing in dashboard mode
        const availableHeight = height - bottomReservedSpace;
        const stripHeight = isDashboard ? 16 : 35;
        const volumeBarHeight = isDashboard ? 20 : 50;
        const labelY = isDashboard
          ? availableHeight - stripHeight - volumeBarHeight - 8 // Ultra-compact positioning above volume bars
          : availableHeight - stripHeight - volumeBarHeight - 5; // Minimal spacing for full charts
        ctx.fillText(timeLabel, x, labelY);
      }
    }

    // Draw volume bars (above Wyckoff phase strip)
    drawVolumeBars(ctx, width, height, visibleStart, visibleEnd, candleWidth, visibleCandles, xScale);

    // Draw Wyckoff phase bottom strip
    drawWyckoffPhaseStrip(ctx, width, height, visibleStart, visibleEnd, candleWidth);

    // Draw crosshair with price and time labels
    if (showCrosshair && !isMobile && !isDragging) {
      ctx.strokeStyle = colors.text.secondary;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.globalAlpha = 0.7;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, topPadding);
      ctx.lineTo(mousePos.x, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, mousePos.y);
      ctx.lineTo(width - padding.right, mousePos.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Calculate price at crosshair position
      const price =
        maxPrice +
        pricePadding -
        ((mousePos.y - topPadding) / chartHeight) * (priceRange + 2 * pricePadding);

      // Draw price label on right side (inside chart bounds)
      const priceText = price.toFixed(2);
      const priceBoxWidth = isDashboard ? 65 : 75;
      const priceBoxHeight = isDashboard ? 18 : 20;
      // Position inside the chart area, aligned to right edge
      const priceBoxX = width - padding.right - priceBoxWidth - 5;
      const priceBoxY = Math.max(topPadding, Math.min(mousePos.y - priceBoxHeight / 2, height - padding.bottom - priceBoxHeight));

      ctx.fillStyle = colors.tooltip?.background || 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(priceBoxX, priceBoxY, priceBoxWidth, priceBoxHeight);
      ctx.strokeStyle = colors.tooltip?.border || colors.text.secondary;
      ctx.lineWidth = 1;
      ctx.strokeRect(priceBoxX, priceBoxY, priceBoxWidth, priceBoxHeight);

      ctx.fillStyle = colors.tooltip?.text || colors.text.primary;
      ctx.font = isDashboard ? '11px monospace' : '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, priceBoxX + priceBoxWidth / 2, priceBoxY + priceBoxHeight / 2);

      // Draw time label at top (inside chart bounds)
      // Find the candle whose X position is closest to the mouse cursor
      // This accounts for zoom and ensures accurate time display
      let closestCandle = null;
      let closestDistance = Infinity;
      let closestIndex = -1;

      for (let i = 0; i < visibleCandles.length; i++) {
        const candleX = xScale(visibleStart + i);
        const distance = Math.abs(candleX - mousePos.x);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCandle = visibleCandles[i];
          closestIndex = visibleStart + i;
        }
      }

      if (closestCandle && closestIndex >= 0) {
        const hoveredCandle = data.candles[closestIndex];

        if (hoveredCandle && hoveredCandle.time) {
          // Extract only time portion (HH:mm:ss) from timestamp
          let timeText = hoveredCandle.time;
          // Handle formats like "2024-10-04T09:15:00" or "09:15:00"
          if (timeText.includes('T')) {
            timeText = timeText.split('T')[1].split('+')[0].split('.')[0];
          } else if (timeText.includes(' ')) {
            timeText = timeText.split(' ')[1].split('.')[0];
          }
          // Truncate to HH:mm:ss if it has milliseconds
          timeText = timeText.substring(0, 8);

          // Larger, more visible label
          ctx.font = isDashboard ? 'bold 11px monospace' : 'bold 13px monospace';
          const timeBoxWidth = Math.max(80, ctx.measureText(timeText).width + 16);
          const timeBoxHeight = isDashboard ? 20 : 22;
          // Clamp to stay within chart bounds
          const timeBoxX = Math.max(padding.left, Math.min(mousePos.x - timeBoxWidth / 2, width - padding.right - timeBoxWidth));
          const timeBoxY = topPadding + 5; // Just inside top edge

          // Draw with better contrast
          ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
          ctx.fillRect(timeBoxX, timeBoxY, timeBoxWidth, timeBoxHeight);
          ctx.strokeStyle = '#4a90e2';
          ctx.lineWidth = 2;
          ctx.strokeRect(timeBoxX, timeBoxY, timeBoxWidth, timeBoxHeight);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(timeText, timeBoxX + timeBoxWidth / 2, timeBoxY + timeBoxHeight / 2);
        }
      }
    }

    // Draw phase tooltip if hovering over a phase
    if (hoveredPhase && showCrosshair && !isMobile) {
      drawPhaseTooltip(ctx, hoveredPhase, mousePos.x, mousePos.y);
    }
  }, [data, viewState, colors, isMobile, isDashboard, showCrosshair, mousePos, isDragging, drawVolumeBars, drawWyckoffPhaseStrip, hoveredPhase, drawPhaseTooltip]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  // Mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || isMobile || externalViewState) return;

    const handleWheel = e => {
      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padding = canvasUtils.getPadding(isMobile, isDashboard);
      const chartWidth = rect.width - padding.left - padding.right;
      const mouseRatio = (x - padding.left) / chartWidth;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = scalingUtils.applyZoomConstraints(viewState.zoom * zoomFactor);

      const totalWidth = chartWidth * viewState.zoom;
      const newTotalWidth = chartWidth * newZoom;
      const widthChange = newTotalWidth - totalWidth;

      const newOffset = viewState.offset - widthChange * mouseRatio;
      const { maxOffset, minOffset } = scalingUtils.calculateOffsetLimits(
        chartWidth,
        newTotalWidth
      );
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
      setDragStart({ x: e.clientX, offset: viewState.targetOffset });
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setMousePos({ x: mouseX, y: mouseY });

      // Check for phase hovering
      const phase = getPhaseUnderMouse(mouseX, mouseY, canvas);
      setHoveredPhase(phase);

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
  }, [
    data,
    viewState,
    isDragging,
    dragStart,
    isMobile,
    externalViewState,
    setViewState,
    isDashboard,
    getPhaseUnderMouse,
  ]);

  // Crosshair mouse events - works even with externalViewState (for dashboard)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || isMobile) return;

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseEnter = () => {
      setShowCrosshair(true);
      canvas.style.cursor = 'crosshair';
    };

    const handleMouseLeave = () => {
      setShowCrosshair(false);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [data, isMobile]);

  if (!data) return null;

  return (
    <div
      className="relative w-full h-full"
      style={{
        backgroundColor: colors.panelBackground,
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{
          height: '100%',
          cursor: isMobile ? 'default' : 'crosshair'
        }}
      />
    </div>
  );
}
