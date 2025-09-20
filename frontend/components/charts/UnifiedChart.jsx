'use client';

import React from 'react';
import { themes, chartSettings } from '../chartConfig';
import ChartContainer from './ChartContainer';
import { renderXAxis, renderYAxis, renderGrid } from './AxisRenderer';
import { renderWyckoffPhases } from './WyckoffPhaseRenderer';
import { renderCandlesticks, renderHeikinAshi } from './CandlestickRenderer';
import { renderExtrema } from './ExtremaRenderer';

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
    isMobile
  }) => {
    if (!data || !data.candles || data.candles.length === 0) return;

    // Setup padding based on mobile/desktop
    const padding = isMobile ? chartSettings.mobilePadding : chartSettings.padding;

    // Reserve space for bottom elements (axes + wyckoff phases)
    const bottomReservedSpace = 70; // Space for x-axis (35px) + wyckoff phases (25px) + margin
    const chartHeight = height - padding.top - padding.bottom - bottomReservedSpace;
    const chartWidth = width - padding.left - padding.right;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw panel background
    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(
      padding.left - 10,
      padding.top - 10,
      chartWidth + 20,
      chartHeight + 20
    );

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
        candleWidth
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
        isMobile
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
