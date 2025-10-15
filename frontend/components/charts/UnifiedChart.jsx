'use client';

import React from 'react';
import { themes, chartSettings } from '../chartConfig';
import ChartContainer from './ChartContainer';
import { renderXAxis, renderYAxis, renderGrid } from './AxisRenderer';
import { renderWyckoffPhases, renderWyckoffTooltip } from './WyckoffPhaseRenderer';
import { renderCandlesticks, renderHeikinAshi } from './CandlestickRenderer';
import { renderExtrema } from './ExtremaRenderer';
import { drawEnhancedCrosshair } from '../common/CrosshairRenderer';
import { logger } from '@/utils/logger';

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
  onViewStateChange = null,
  sharedViewState = null,
  // Enhanced control props
  showCandlesticks = true,
  heikinAshiOnFront = false,
  heikinAshiColorMode = 'yellow',
  customRenderProps = null
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
    // Check if we have either candles or candlesticks (handle both field names) or heikinAshi data to display
    const candleData = data?.candles || data?.candlesticks;
    const hasCandles = candleData && candleData.length > 0;
    const hasHeikinAshi = data?.heikinAshi && data.heikinAshi.length > 0;

    // Debug logging for data availability
    logger.debug('UnifiedChart render debug:', {
      data: !!data,
      hasCandles,
      hasHeikinAshi,
      candleDataLength: candleData?.length || 0,
      heikinAshiLength: data?.heikinAshi?.length || 0,
      showHeikinAshi,
      showExtrema,
      fieldNames: {
        candles: !!data?.candles,
        candlesticks: !!data?.candlesticks,
        heikinAshi: !!data?.heikinAshi
      }
    });

    if (!data || (!hasCandles && !hasHeikinAshi)) {
      logger.debug('UnifiedChart early return: no data to display');
      return;
    }

    // Use candles if available, otherwise fall back to heikinAshi as primary data
    const primaryData = hasCandles ? candleData : data.heikinAshi;

    // Setup padding based on mobile/desktop
    const padding = isMobile ? chartSettings.mobilePadding : chartSettings.padding;

    // Define fixed heights for bottom elements
    const xAxisHeight = 25; // Height for X-axis labels
    const volumeBarHeight = 22; // Height for volume bars
    const phaseStripHeight = 22; // Height for Wyckoff phase strip
    const elementSpacing = 3; // Small spacing between elements

    // Calculate chart area (reserve space for bottom elements including volume bars)
    const bottomElementsHeight = xAxisHeight + volumeBarHeight + phaseStripHeight + (elementSpacing * 3);
    const chartHeight = height - padding.top - padding.bottom - bottomElementsHeight;

    // Define Y positions for bottom elements (immediately after chart)
    const chartBottom = padding.top + chartHeight;
    const xAxisY = chartBottom + elementSpacing;
    const volumeY = xAxisY + xAxisHeight + elementSpacing; // Volume bars after x-axis
    const phaseStripY = volumeY + volumeBarHeight + elementSpacing; // Phase strip after volume bars
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

    // Calculate visible range using primary data
    const candleWidth = (chartWidth / primaryData.length) * viewState.zoom;
    const maxOffset = 0;
    const minOffset = Math.min(0, -(primaryData.length * candleWidth - chartWidth));
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

    const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
    const visibleEnd = Math.min(
      primaryData.length,
      Math.ceil((chartWidth - clampedOffset) / candleWidth)
    );

    if (visibleStart >= visibleEnd) return;

    // Calculate price range using primary data
    const visibleCandles = primaryData.slice(visibleStart, visibleEnd);
    let allPrices = visibleCandles.flatMap(c => [c.high, c.low]);

    // Include Heikin Ashi prices if shown and we have separate heikinAshi data
    if (showHeikinAshi && data.heikinAshi && hasCandles) {
      const visibleHeikinAshi = data.heikinAshi.slice(visibleStart, visibleEnd);
      allPrices = [...allPrices, ...visibleHeikinAshi.flatMap(c => [c.high, c.low])];
    }

    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    const pricePadding = Math.max(priceRange * 0.1, 1);

    // Debug logging
    logger.debug('Chart Debug:', {
      primaryDataLength: primaryData.length,
      visibleStart,
      visibleEnd,
      candleWidth,
      minPrice,
      maxPrice,
      priceRange,
      allPricesLength: allPrices.length,
      samplePrices: allPrices.slice(0, 5)
    });

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
        data: { candles: primaryData }, // Pass primaryData as candles for grid rendering
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

    // Extract control props from customRenderProps if available
    const actualShowCandlesticks = customRenderProps?.showCandlesticks ?? showCandlesticks;
    const actualShowHeikinAshi = customRenderProps?.showHeikinAshi ?? showHeikinAshi;
    const actualHeikinAshiOnFront = customRenderProps?.heikinAshiOnFront ?? heikinAshiOnFront;
    const actualHeikinAshiColorMode = customRenderProps?.heikinAshiColorMode ?? heikinAshiColorMode;

    // Determine rendering order based on layering preference
    const renderBackgroundChart = () => {
      if (actualHeikinAshiOnFront && actualShowCandlesticks && hasCandles) {
        // Regular candlesticks in background
        logger.debug('UnifiedChart: Rendering regular candlesticks (background)');
        renderCandlesticks(ctx, {
          data: { candles: candleData },
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
      } else if (!actualHeikinAshiOnFront && actualShowHeikinAshi && hasHeikinAshi) {
        // Heikin Ashi in background
        logger.debug('UnifiedChart: Rendering Heikin Ashi (background)');
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
          outlineOnly: true,
          colorMode: actualHeikinAshiColorMode
        });
      }
    };

    const renderForegroundChart = () => {
      if (actualHeikinAshiOnFront && actualShowHeikinAshi && hasHeikinAshi) {
        // Heikin Ashi in foreground
        logger.debug('UnifiedChart: Rendering Heikin Ashi (foreground)');
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
          outlineOnly: true,
          colorMode: actualHeikinAshiColorMode
        });
      } else if (!actualHeikinAshiOnFront && actualShowCandlesticks && hasCandles) {
        // Regular candlesticks in foreground
        logger.debug('UnifiedChart: Rendering regular candlesticks (foreground)');
        renderCandlesticks(ctx, {
          data: { candles: candleData },
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
      }
    };

    // Render charts in the correct order
    if ((actualShowCandlesticks && hasCandles) || (actualShowHeikinAshi && hasHeikinAshi)) {
      // Render background chart first
      renderBackgroundChart();

      // Render foreground chart second
      renderForegroundChart();
    } else if (actualShowCandlesticks && hasCandles) {
      // Only regular candlesticks
      logger.debug('UnifiedChart: Rendering regular candlesticks only');
      renderCandlesticks(ctx, {
        data: { candles: candleData },
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
    } else if (actualShowHeikinAshi && hasHeikinAshi) {
      // Only Heikin Ashi
      logger.debug('UnifiedChart: Rendering Heikin Ashi only');
      renderHeikinAshi(ctx, {
        data: hasCandles ? data : { heikinAshi: primaryData },
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
        outlineOnly: false,
        colorMode: actualHeikinAshiColorMode
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

    // Render volume bars between x-axis and Wyckoff phase strip
    if (visibleCandles && visibleCandles.length > 0) {
      const volumes = visibleCandles.map(c => c.volume || 0);
      const maxVolume = Math.max(...volumes, 1);

      visibleCandles.forEach((candle, i) => {
        if (!candle.volume || candle.volume === 0) return;

        // Fix: Account for visibleStart offset when positioning volume bars
        const x = padding.left + ((visibleStart + i) * candleWidth) + clampedOffset;
        const barHeight = (candle.volume / maxVolume) * volumeBarHeight;
        const barY = volumeY + volumeBarHeight - barHeight;

        const isGreen = candle.close >= candle.open;
        const volumeColor = isGreen ? colors.candle.bullish : colors.candle.bearish;

        ctx.fillStyle = volumeColor;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(
          x - (candleWidth * 0.8) / 2,
          barY,
          candleWidth * 0.8,
          barHeight
        );
        ctx.globalAlpha = 1.0;
      });

      // Volume scale labels
      const formatVolume = (vol) => {
        if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
        if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
        return vol.toString();
      };

      ctx.font = isMobile ? '9px monospace' : '10px monospace';
      ctx.fillStyle = colors.text.secondary;
      ctx.textAlign = 'right';
      ctx.fillText(formatVolume(maxVolume), padding.left - 5, volumeY + 12);

      // Baseline for volume bars
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(padding.left, volumeY + volumeBarHeight);
      ctx.lineTo(width - padding.right, volumeY + volumeBarHeight);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Render axes outside clipping region
    if (showAxes) {
      renderXAxis(ctx, {
        width,
        height,
        data: { candles: primaryData }, // Pass primaryData as candles for axis rendering
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

        // Calculate candle index by snapping to nearest candle
        // Account for clampedOffset and round to nearest candle (accounting for candle centering)
        const candleIndex = Math.round((x - padding.left - clampedOffset) / candleWidth - 0.5) + visibleStart;

        if (candleIndex < 0 || candleIndex >= primaryData.length) return null;
        return primaryData[candleIndex]?.time;
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
      sharedViewState={sharedViewState}
      onViewStateChange={onViewStateChange}
    />
  );
};

export default UnifiedChart;
