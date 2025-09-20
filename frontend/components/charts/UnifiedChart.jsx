'use client';

import React from 'react';
import { themes, chartSettings } from '../chartConfig';
import ChartContainer from './ChartContainer';
import { renderXAxis, renderYAxis, renderGrid } from './AxisRenderer';
import { renderWyckoffPhases, renderWyckoffTooltip } from './WyckoffPhaseRenderer';
import { renderCandlesticks, renderHeikinAshi } from './CandlestickRenderer';
import { renderExtrema } from './ExtremaRenderer';
import { drawEnhancedCrosshair } from '../common/CrosshairRenderer';

/**
 * UnifiedChart - A reusable chart component that can render:
 * - Candlesticks
 * - Heikin Ashi (optional overlay)
 * - Extrema analysis (maxima/minima)
 * - Wyckoff phases
 * - Interactive zoom/pan
 * - Responsive design
 */
export const UnifiedChart = ({
  data,
  theme = 'dark',
  showHeikinAshi = false,
  showExtrema = false,
  showWyckoffPhases = true,
  showGrid = true,
  showAxes = true,
  enableInteraction = true,
  className = '',
  style = {},
  onViewStateChange = null
}) => {
  const colors = themes[theme];

  // Main render function that gets called by ChartContainer
  const renderChart = ({
    ctx,
    width,
    height,
    viewState,
    isMobile,
    mousePos,
    showCrosshair,
    isDragging
  }) => {
    if (!data || !data.candles || data.candles.length === 0) return;

    // Setup padding based on mobile/desktop
    const padding = isMobile ? chartSettings.mobilePadding : chartSettings.padding;

    // Define fixed heights for bottom elements
    const xAxisHeight = 25; // Height for X-axis labels
    const phaseStripHeight = 22; // Height for Wyckoff phase strip
    const elementSpacing = 3; // Small spacing between elements

    // Calculate chart area (reserve space for bottom elements)
    const bottomElementsHeight = xAxisHeight + phaseStripHeight + (elementSpacing * 2);
    const chartHeight = height - padding.top - padding.bottom - bottomElementsHeight;

    // Define Y positions for bottom elements (immediately after chart)
    const chartBottom = padding.top + chartHeight;
    const xAxisY = chartBottom + elementSpacing;
    const phaseStripY = xAxisY + xAxisHeight + elementSpacing;
    const chartWidth = width - padding.left - padding.right;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw unified panel background that includes chart + axes + phases
    const panelPadding = 10;
    const panelWidth = chartWidth + 20;
    const panelHeight = chartHeight + bottomElementsHeight + 20;

    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(
      padding.left - panelPadding,
      padding.top - panelPadding,
      panelWidth,
      panelHeight
    );

    // Draw subtle border around the unified panel
    ctx.strokeStyle = colors.grid || colors.text.secondary;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(
      padding.left - panelPadding,
      padding.top - panelPadding,
      panelWidth,
      panelHeight
    );
    ctx.globalAlpha = 1;

    // Calculate visible range
    const candleWidth = (chartWidth / data.candles.length) * viewState.zoom;
    const maxOffset = 0;
    const minOffset = Math.min(0, -(data.candles.length * candleWidth - chartWidth));
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

    const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
    const visibleEnd = Math.min(
      data.candles.length,
      Math.ceil((chartWidth - clampedOffset) / candleWidth)
    );

    if (visibleStart >= visibleEnd) return;

    // Calculate price range
    const visibleCandles = data.candles.slice(visibleStart, visibleEnd);
    let allPrices = visibleCandles.flatMap(c => [c.high, c.low]);

    // Include Heikin Ashi prices if shown
    if (showHeikinAshi && data.heikinAshi) {
      const visibleHeikinAshi = data.heikinAshi.slice(visibleStart, visibleEnd);
      allPrices = [...allPrices, ...visibleHeikinAshi.flatMap(c => [c.high, c.low])];
    }

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = Math.max(priceRange * 0.1, 1);

    // Set clipping region for chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();

    // Render grid
    if (showGrid) {
      renderGrid(ctx, {
        width,
        height,
        data,
        colors,
        padding,
        minPrice,
        maxPrice,
        priceRange,
        pricePadding,
        chartHeight,
        visibleStart,
        visibleEnd,
        candleWidth,
        isMobile
      });
    }

    // Render candlesticks
    renderCandlesticks(ctx, {
      data,
      colors,
      padding,
      chartHeight,
      visibleStart,
      visibleEnd,
      candleWidth,
      minPrice,
      maxPrice,
      priceRange,
      pricePadding
    });

    // Render Heikin Ashi overlay if enabled
    if (showHeikinAshi && data.heikinAshi) {
      renderHeikinAshi(ctx, {
        data,
        colors,
        padding,
        chartHeight,
        visibleStart,
        visibleEnd,
        candleWidth,
        minPrice,
        maxPrice,
        priceRange,
        pricePadding,
        outlineOnly: true
      });
    }

    // Render extrema if enabled
    if (showExtrema && (data.maxima || data.minima)) {
      renderExtrema(ctx, {
        data,
        colors,
        padding,
        chartHeight,
        visibleStart,
        visibleEnd,
        candleWidth,
        minPrice,
        maxPrice,
        priceRange,
        pricePadding,
        viewState: { ...viewState, offset: clampedOffset },
        isMobile
      });
    }

    ctx.restore(); // Remove clipping

    // Render axes outside clipping region
    if (showAxes) {
      renderXAxis(ctx, {
        width,
        height,
        data,
        viewState,
        colors,
        padding,
        isMobile,
        visibleStart,
        visibleEnd,
        candleWidth,
        xAxisY,
        xAxisHeight
      });

      renderYAxis(ctx, {
        width,
        height,
        colors,
        padding,
        minPrice,
        maxPrice,
        priceRange,
        pricePadding,
        chartHeight,
        isMobile
      });
    }

    // Render Wyckoff phases at bottom
    if (showWyckoffPhases && data.wyckoffPhases) {
      renderWyckoffPhases(ctx, {
        width,
        height,
        data,
        colors,
        padding,
        visibleStart,
        visibleEnd,
        candleWidth,
        isMobile,
        phaseStripY,
        phaseStripHeight
      });
    }

    // Render crosshair (after all chart elements)
    if (showCrosshair && mousePos && enableInteraction && !isMobile) {
      // Helper function to get price at Y coordinate
      const getPriceAtY = (y) => {
        const chartBottom = padding.top + chartHeight;
        if (y < padding.top || y > chartBottom) return null;
        const priceY = (y - padding.top) / chartHeight;
        return maxPrice + pricePadding - priceY * (priceRange + 2 * pricePadding);
      };

      // Helper function to get time at X coordinate
      const getTimeAtX = (x) => {
        if (x < padding.left || x > width - padding.right) return null;
        const candleIndex = Math.floor((x - padding.left - clampedOffset) / candleWidth);
        const adjustedIndex = candleIndex + visibleStart;
        if (adjustedIndex < 0 || adjustedIndex >= data.candles.length) return null;
        return data.candles[adjustedIndex]?.time;
      };

      // Draw enhanced crosshair with price and time labels
      drawEnhancedCrosshair(ctx, width, height, mousePos, padding, {
        colors,
        showCrosshair: true,
        isDragging,
        isMobile,
        getPriceAtY,
        getTimeAtX,
        lineWidth: 1,
        opacity: 0.8
      });
    }

    // Render phase tooltips on hover
    if (showWyckoffPhases && data.wyckoffPhases && mousePos && !isDragging) {
      renderWyckoffTooltip(ctx, {
        width,
        height,
        data,
        padding,
        mousePos,
        visibleStart,
        visibleEnd,
        candleWidth,
        isMobile,
        phaseStripY,
        phaseStripHeight
      });
    }

    // Notify parent of view state changes
    if (onViewStateChange) {
      onViewStateChange(viewState);
    }
  };

  if (!data) return null;

  return (
    <ChartContainer
      data={data}
      theme={theme}
      onRender={renderChart}
      enableInteraction={enableInteraction}
      className={className}
      style={style}
    />
  );
};

export default UnifiedChart;
