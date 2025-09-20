/**
 * ChartUtils - Common utility functions for chart rendering
 * Provides reusable canvas setup, scaling, and drawing utilities
 */

import { chartSettings } from '../chartConfig';

/**
 * Canvas utilities for setup and management
 */
export const canvasUtils = {
  /**
   * Sets up canvas with proper DPI scaling
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @returns {Object} - Canvas context and dimensions
   */
  setupCanvas: (canvas) => {
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    return {
      ctx,
      width: rect.width,
      height: rect.height,
      dpr
    };
  },

  /**
   * Gets appropriate padding based on device type and dashboard mode
   * @param {boolean} isMobile - Mobile device flag
   * @param {boolean} isDashboard - Dashboard mode flag
   * @returns {Object} - Padding configuration
   */
  getPadding: (isMobile = false, isDashboard = false) => {
    const basePadding = isMobile ? chartSettings.mobilePadding : chartSettings.padding;

    if (isDashboard) {
      // Reduce padding for dashboard view
      return {
        top: basePadding.top * 0.7,
        right: basePadding.right * 0.7,
        bottom: basePadding.bottom,
        left: basePadding.left * 0.7
      };
    }

    return basePadding;
  },

  /**
   * Calculates chart dimensions within padding
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} padding - Padding configuration
   * @returns {Object} - Chart dimensions
   */
  getChartDimensions: (width, height, padding) => ({
    chartWidth: width - padding.left - padding.right,
    chartHeight: height - padding.top - padding.bottom
  }),

  /**
   * Clears canvas with background color
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} colors - Theme colors
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  clearCanvas: (ctx, colors, width, height) => {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
  },

  /**
   * Draws panel background
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} colors - Theme colors
   * @param {Object} padding - Padding configuration
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  drawPanelBackground: (ctx, colors, padding, width, height) => {
    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(
      padding.left - 10,
      padding.top - 10,
      width - padding.left - padding.right + 20,
      height - padding.top - padding.bottom + 20
    );
  },

  /**
   * Sets clipping region for chart area
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} padding - Padding configuration
   * @param {number} chartWidth - Chart width
   * @param {number} chartHeight - Chart height
   */
  setClippingRegion: (ctx, padding, chartWidth, chartHeight) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();
  },

  /**
   * Clears clipping region
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  clearClippingRegion: (ctx) => {
    ctx.restore();
  }
};

/**
 * Scaling utilities for chart coordinates
 */
export const scalingUtils = {
  /**
   * Calculates visible range of data points
   * @param {number} dataLength - Total data points
   * @param {number} chartWidth - Chart width
   * @param {number} zoom - Zoom level
   * @param {number} offset - Horizontal offset
   * @returns {Object} - Visible range and candle width
   */
  calculateVisibleRange: (dataLength, chartWidth, zoom, offset) => {
    const candleWidth = (chartWidth / dataLength) * zoom;
    const maxOffset = 0;
    const minOffset = Math.min(0, -(dataLength * candleWidth - chartWidth));
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, offset));

    const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
    const visibleEnd = Math.min(dataLength, Math.ceil((chartWidth - clampedOffset) / candleWidth));

    return {
      visibleStart,
      visibleEnd,
      candleWidth,
      clampedOffset
    };
  },

  /**
   * Calculates price range with padding
   * @param {Array<number>} prices - Array of price values
   * @returns {Object} - Price range information
   */
  calculatePriceRange: (prices) => {
    if (prices.length === 0) {
      return { minPrice: 0, maxPrice: 0, priceRange: 0, pricePadding: 1 };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const minPricePadding = 1;
    const pricePadding = Math.max(priceRange * 0.1, minPricePadding);

    return {
      minPrice,
      maxPrice,
      priceRange,
      pricePadding
    };
  },

  /**
   * Creates Y-scale function for price to pixel conversion
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {number} priceRange - Price range
   * @param {number} pricePadding - Price padding
   * @param {Object} padding - Chart padding
   * @param {number} chartHeight - Chart height
   * @returns {Function} - Y-scale function
   */
  createYScale: (minPrice, maxPrice, priceRange, pricePadding, padding, chartHeight) => {
    return (price) => {
      return (
        padding.top +
        ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight
      );
    };
  },

  /**
   * Creates X-scale function for index to pixel conversion
   * @param {Object} padding - Chart padding
   * @param {number} candleWidth - Width of each candle
   * @param {number} visibleStart - Starting index of visible range
   * @returns {Function} - X-scale function
   */
  createXScale: (padding, candleWidth, visibleStart) => {
    return (index) => {
      return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
    };
  },

  /**
   * Applies zoom constraints
   * @param {number} zoom - Current zoom level
   * @param {number} minZoom - Minimum zoom level
   * @param {number} maxZoom - Maximum zoom level
   * @returns {number} - Constrained zoom level
   */
  applyZoomConstraints: (zoom, minZoom = 1.0, maxZoom = 20.0) => {
    return Math.max(minZoom, Math.min(maxZoom, zoom));
  },

  /**
   * Calculates offset limits for panning
   * @param {number} chartWidth - Chart width
   * @param {number} totalWidth - Total content width
   * @returns {Object} - Offset limits
   */
  calculateOffsetLimits: (chartWidth, totalWidth) => {
    const maxOffset = 0;
    const minOffset = Math.min(0, chartWidth - totalWidth);
    return { maxOffset, minOffset };
  }
};

/**
 * Drawing utilities for common chart elements
 */
export const drawingUtils = {
  /**
   * Draws grid lines
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} colors - Theme colors
   * @param {Object} padding - Padding configuration
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Grid options
   */
  drawGrid: (ctx, colors, padding, width, height, options = {}) => {
    const {
      horizontalLines = 8,
      verticalLines = 10,
      dashArray = [3, 3],
      lineWidth = 1
    } = options;

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dashArray);

    // Horizontal lines
    for (let i = 0; i <= horizontalLines; i++) {
      const y = padding.top + (i * (height - padding.top - padding.bottom)) / horizontalLines;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical lines
    for (let i = 0; i <= verticalLines; i++) {
      const x = padding.left + (i * (width - padding.left - padding.right)) / verticalLines;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  },

  /**
   * Draws candlestick
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} candle - Candle data
   * @param {number} x - X position
   * @param {Function} yScale - Y-scale function
   * @param {number} candleWidth - Candle width
   * @param {Object} colors - Theme colors
   */
  drawCandlestick: (ctx, candle, x, yScale, candleWidth, colors) => {
    const isGreen = candle.close >= candle.open;
    const color = isGreen ? colors.candle.bullish : colors.candle.bearish;
    const bodyWidthRatio = chartSettings.candleBodyWidthRatio;

    // Draw wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yScale(candle.high));
    ctx.lineTo(x, yScale(candle.low));
    ctx.stroke();

    // Draw body
    const bodyTop = yScale(Math.max(candle.open, candle.close));
    const bodyBottom = yScale(Math.min(candle.open, candle.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    ctx.fillStyle = color;
    ctx.fillRect(
      x - (candleWidth * bodyWidthRatio) / 2,
      bodyTop,
      candleWidth * bodyWidthRatio,
      bodyHeight
    );
  },

  /**
   * Draws axis labels
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} colors - Theme colors
   * @param {Object} padding - Padding configuration
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Label options
   */
  drawAxisLabels: (ctx, colors, padding, width, height, options = {}) => {
    const {
      yLabels = [],
      xLabels = [],
      fontSize = '12px',
      fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif'
    } = options;

    ctx.fillStyle = colors.text.secondary;
    ctx.font = `${fontSize} ${fontFamily}`;

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yLabels.forEach(({ value, y }) => {
      ctx.fillText(value, padding.left - 10, y);
    });

    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    xLabels.forEach(({ value, x }) => {
      ctx.fillText(value, x, height - 15);
    });
  }
};

/**
 * Animation utilities
 */
export const animationUtils = {
  /**
   * Creates smooth animation loop
   * @param {Function} updateFunction - Function to call on each frame
   * @param {Object} options - Animation options
   * @returns {Function} - Cleanup function
   */
  createAnimationLoop: (updateFunction, options = {}) => {
    const {
      fps = 60,
      enabled = true
    } = options;

    if (!enabled) return () => {};

    let animationId;
    const targetInterval = 1000 / fps;
    let lastTime = 0;

    const animate = (currentTime) => {
      if (currentTime - lastTime >= targetInterval) {
        updateFunction(currentTime);
        lastTime = currentTime;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  },

  /**
   * Smooth value interpolation
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {number} factor - Interpolation factor (0-1)
   * @returns {number} - Interpolated value
   */
  lerp: (current, target, factor) => {
    return current + (target - current) * factor;
  },

  /**
   * Easing functions
   */
  easing: {
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeOutBack: (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  }
};

/**
 * Time formatting utilities
 */
export const timeUtils = {
  /**
   * Formats time for chart labels
   * @param {Date|string} time - Time value
   * @param {string} format - Format type
   * @returns {string} - Formatted time string
   */
  formatTime: (time, format = 'HH:mm') => {
    const date = time instanceof Date ? time : new Date(time);

    if (isNaN(date.getTime())) return '';

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    switch (format) {
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    case 'HH':
      return hours;
    default:
      return `${hours}:${minutes}`;
    }
  },

  /**
   * Gets time intervals for grid lines
   * @param {Array} data - Chart data
   * @param {number} visibleStart - Visible start index
   * @param {number} visibleEnd - Visible end index
   * @param {boolean} isMobile - Mobile device flag
   * @returns {Array} - Array of time intervals
   */
  getTimeIntervals: (data, visibleStart, visibleEnd, isMobile = false) => {
    const intervals = [];

    for (let i = visibleStart; i < visibleEnd; i++) {
      if (!data[i] || !data[i].time) continue;

      const candleTime = new Date(data[i].time);
      if (isNaN(candleTime.getTime())) continue;

      const minutes = candleTime.getMinutes();

      // Show labels at specific minute marks
      if (minutes === 0 || minutes === 30) {
        if (isMobile && minutes !== 0) continue; // Only show hourly on mobile

        intervals.push({
          index: i,
          time: candleTime,
          timestamp: candleTime.getTime()
        });
      }
    }

    return intervals;
  }
};
