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

    const stripHeight = 35;
    const padding = canvasUtils.getPadding(isMobile, isDashboard);

    // Position strip ensuring it's visible in viewport and doesn't overlap with x-axis
    const bottomSpace = isDashboard ? (isMobile ? 60 : 80) : 120;
    const availableHeight = height - bottomSpace; // Account for bottom reserved space
    const stripY = availableHeight - stripHeight - (isDashboard ? 5 : 10); // Position closer to bottom for dashboard

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
    const stripHeight = 35;
    const bottomSpace = isDashboard ? (isMobile ? 60 : 80) : 120;
    const availableHeight = rect.height - bottomSpace; // Account for bottom reserved space
    const stripY = availableHeight - stripHeight - (isDashboard ? 5 : 10); // Match the drawing position

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
  }, [data, viewState]);

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
    // Use responsive spacing based on context - balanced for dashboard
    const topPadding = isDashboard ? (isMobile ? 15 : 20) : padding.top;
    const bottomReservedSpace = isDashboard ? (isMobile ? 60 : 80) : 120;
    const { chartWidth } = canvasUtils.getChartDimensions(width, height, padding);
    // Ensure chart doesn't extend beyond available space with balanced padding
    const availableHeight = height - bottomReservedSpace - topPadding;
    const chartHeight = Math.max(100, availableHeight);

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

    // Set clipping region
    canvasUtils.setClippingRegion(ctx, padding, chartWidth, chartHeight);

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal grid lines
    const horizontalLines = isMobile
      ? CHART_CONSTANTS.GRID_LINES.HORIZONTAL_MOBILE
      : CHART_CONSTANTS.GRID_LINES.HORIZONTAL_DESKTOP;
    for (let i = 0; i <= horizontalLines; i++) {
      const price =
        minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
      const y = yScale(price);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const verticalGridLines = isMobile
      ? CHART_CONSTANTS.GRID_LINES.VERTICAL_MOBILE
      : CHART_CONSTANTS.GRID_LINES.VERTICAL_DESKTOP;
    const verticalStepSize = Math.max(1, Math.floor(visibleCandles.length / verticalGridLines));
    for (let i = 0; i < visibleCandles.length; i += verticalStepSize) {
      const x = xScale(visibleStart + i);
      ctx.beginPath();
      ctx.moveTo(x, topPadding);
      ctx.lineTo(x, height - padding.bottom);
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
      // Adjust x position for dashboard to prevent trimming
      const labelX = isDashboard ? Math.max(35, padding.left - 5) : padding.left - 10;
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
        // Position x-axis labels responsively based on context
        const availableHeight = height - bottomReservedSpace;
        const labelY = isDashboard
          ? availableHeight - (isMobile ? 25 : 35) // Closer to bottom for dashboard
          : availableHeight - 80; // Original position for full charts
        ctx.fillText(timeLabel, x, labelY);
      }
    }

    // Draw Wyckoff phase bottom strip
    drawWyckoffPhaseStrip(ctx, width, height, visibleStart, visibleEnd, candleWidth);

    // Draw crosshair
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
    }

    // Draw phase tooltip if hovering over a phase
    if (hoveredPhase && showCrosshair && !isMobile) {
      drawPhaseTooltip(ctx, hoveredPhase, mousePos.x, mousePos.y);
    }
  }, [data, viewState, colors, isMobile, isDashboard, showCrosshair, mousePos, isDragging, drawWyckoffPhaseStrip, hoveredPhase, drawPhaseTooltip]);

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
