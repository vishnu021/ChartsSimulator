import { CHART_CONSTANTS } from '../constants';

/**
 * Scaling and calculation utilities for charts
 */
export const scalingUtils = {
  /**
   * Calculate visible range for candles based on zoom and offset
   */
  calculateVisibleRange(totalCandles, chartWidth, zoom, offset) {
    const candleWidth = (chartWidth / totalCandles) * zoom;
    const maxOffset = 0;
    const minOffset = Math.min(0, -(totalCandles * candleWidth - chartWidth));
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, offset));

    const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
    const visibleEnd = Math.min(
      totalCandles,
      Math.ceil((chartWidth - clampedOffset) / candleWidth)
    );

    return {
      visibleStart,
      visibleEnd,
      clampedOffset,
      candleWidth,
    };
  },

  /**
   * Calculate price range with padding
   */
  calculatePriceRange(prices) {
    if (prices.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 100, pricePadding: 10 };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = Math.max(0.01, maxPrice - minPrice);
    const pricePadding = Math.max(priceRange * 0.1, 1);

    return { minPrice, maxPrice, priceRange, pricePadding };
  },

  /**
   * Create Y-axis scaling function
   */
  createYScale(minPrice, maxPrice, priceRange, pricePadding, padding, chartHeight) {
    return price => {
      return (
        padding.top +
        ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight
      );
    };
  },

  /**
   * Create X-axis scaling function for candles
   */
  createXScale(padding, candleWidth, visibleStart) {
    return index => {
      return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
    };
  },

  /**
   * Create X-axis scaling function for timestamps
   */
  createTimeXScale(timeRange, totalWidth, clampedOffset, padding) {
    const timeSpan = timeRange.end - timeRange.start;
    return timestamp => {
      const ratio = (timestamp - timeRange.start) / timeSpan;
      return padding.left + ratio * totalWidth + clampedOffset;
    };
  },

  /**
   * Calculate zoom constraints and apply limits
   */
  applyZoomConstraints(newZoom, isVertical = false) {
    const min = isVertical ? CHART_CONSTANTS.MIN_VERTICAL_ZOOM : CHART_CONSTANTS.MIN_ZOOM;
    const max = isVertical ? CHART_CONSTANTS.MAX_VERTICAL_ZOOM : CHART_CONSTANTS.MAX_ZOOM;
    return Math.max(min, Math.min(max, newZoom));
  },

  /**
   * Calculate offset limits for dragging
   */
  calculateOffsetLimits(chartWidth, totalWidth) {
    const maxOffset = 0;
    const minOffset = Math.min(0, chartWidth - totalWidth);
    return { maxOffset, minOffset };
  },
};
