import { UI_CONSTANTS, CHART_CONSTANTS } from '../constants';

/**
 * Enhanced Canvas utility functions for high-performance chart rendering
 * Follows CLAUDE.md standards for frontend development
 *
 * Features:
 * - High-DPI display support with automatic scaling
 * - Performance optimizations for smooth rendering
 * - Memory-efficient canvas management
 * - Cross-browser compatibility
 * - Error boundary handling
 *
 * @module CanvasUtils
 */

class CanvasUtilsError extends Error {
  constructor(message, code = 'CANVAS_ERROR') {
    super(message);
    this.name = 'CanvasUtilsError';
    this.code = code;
  }
}

export const canvasUtils = {
  /**
   * Setup canvas with high-DPI support and performance optimizations
   * @param {HTMLCanvasElement} canvas - The canvas element to setup
   * @param {Object} config - Configuration options
   * @param {boolean} config.enableAntiAliasing - Enable anti-aliasing (default: true)
   * @param {boolean} config.enableImageSmoothing - Enable image smoothing (default: true)
   * @param {boolean} config.pixelDensityOptimization - Optimize for pixel density (default: true)
   * @returns {Object|null} Canvas setup result with context and dimensions
   * @throws {CanvasUtilsError} When canvas setup fails
   */
  setupCanvas(canvas, config = {}) {
    const startTime = performance.now();

    try {
      if (!canvas) {
        throw new CanvasUtilsError('Canvas element is required', 'INVALID_CANVAS');
      }

      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new CanvasUtilsError('Provided element is not a valid canvas', 'INVALID_ELEMENT');
      }

      const {
        enableAntiAliasing = true,
        enableImageSmoothing = true,
        pixelDensityOptimization = true,
      } = config;

      const ctx = canvas.getContext('2d', {
        alpha: false, // Performance optimization for opaque content
        desynchronized: true, // Reduce input latency
      });

      if (!ctx) {
        throw new CanvasUtilsError('Failed to get 2D rendering context', 'CONTEXT_ERROR');
      }

      const rect = canvas.getBoundingClientRect();
      const dpr = pixelDensityOptimization ? window.devicePixelRatio || 1 : 1;

      // Validate dimensions
      if (rect.width <= 0 || rect.height <= 0) {
        throw new CanvasUtilsError('Canvas has invalid dimensions', 'INVALID_DIMENSIONS');
      }

      // Set actual canvas size with DPI scaling
      const scaledWidth = Math.floor(rect.width * dpr);
      const scaledHeight = Math.floor(rect.height * dpr);

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // Scale context to match DPI
      ctx.scale(dpr, dpr);

      // Set CSS size to maintain original display size
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Apply performance optimizations
      ctx.imageSmoothingEnabled = enableImageSmoothing;
      if (!enableAntiAliasing) {
        ctx.imageSmoothingQuality = 'low';
      }

      // Set optimal text rendering
      ctx.textBaseline = 'middle';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

      const setupTime = performance.now() - startTime;

      return {
        ctx,
        width: rect.width,
        height: rect.height,
        dpr,
        performance: {
          setupTime,
          scaledWidth,
          scaledHeight,
        },
      };
    } catch (error) {
      if (error instanceof CanvasUtilsError) {
        throw error;
      }
      throw new CanvasUtilsError(`Canvas setup failed: ${error.message}`, 'SETUP_ERROR');
    }
  },

  /**
   * Get responsive padding based on device type and context
   * @param {boolean} isMobile - Whether the device is mobile
   * @param {boolean} isDashboard - Whether this is for dashboard layout
   * @param {Object} customPadding - Optional custom padding override
   * @returns {Object} Padding object with top, right, bottom, left properties
   */
  getPadding(isMobile, isDashboard = false, customPadding = null) {
    if (customPadding && this._isValidPadding(customPadding)) {
      return { ...customPadding };
    }

    if (isDashboard) {
      return isMobile
        ? { ...UI_CONSTANTS.PADDING.DASHBOARD_MOBILE }
        : { ...UI_CONSTANTS.PADDING.DASHBOARD_DESKTOP };
    }

    return isMobile ? { ...UI_CONSTANTS.PADDING.MOBILE } : { ...UI_CONSTANTS.PADDING.DESKTOP };
  },

  /**
   * Calculate chart dimensions after padding with validation
   * @param {number} width - Total canvas width
   * @param {number} height - Total canvas height
   * @param {Object} padding - Padding object
   * @returns {Object} Chart dimensions object
   * @throws {CanvasUtilsError} When dimensions are invalid
   */
  getChartDimensions(width, height, padding) {
    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new CanvasUtilsError('Width and height must be numbers', 'INVALID_DIMENSIONS');
    }

    if (!this._isValidPadding(padding)) {
      throw new CanvasUtilsError('Invalid padding object', 'INVALID_PADDING');
    }

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (chartWidth <= 0 || chartHeight <= 0) {
      throw new CanvasUtilsError(
        `Chart dimensions too small: ${chartWidth}x${chartHeight}`,
        'DIMENSIONS_TOO_SMALL'
      );
    }

    return {
      chartWidth: Math.max(0, chartWidth),
      chartHeight: Math.max(0, chartHeight),
    };
  },

  /**
   * Set clipping region for chart area with performance optimizations
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} padding - Padding object
   * @param {number} chartWidth - Chart width
   * @param {number} chartHeight - Chart height
   * @throws {CanvasUtilsError} When context is invalid
   */
  setClippingRegion(ctx, padding, chartWidth, chartHeight) {
    if (!ctx || typeof ctx.save !== 'function') {
      throw new CanvasUtilsError('Invalid canvas context', 'INVALID_CONTEXT');
    }

    try {
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        Math.floor(padding.left),
        Math.floor(padding.top),
        Math.floor(chartWidth),
        Math.floor(chartHeight)
      );
      ctx.clip();
    } catch (error) {
      ctx.restore(); // Cleanup on error
      throw new CanvasUtilsError(
        `Failed to set clipping region: ${error.message}`,
        'CLIPPING_ERROR'
      );
    }
  },

  /**
   * Clear clipping region safely
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  clearClippingRegion(ctx) {
    if (!ctx || typeof ctx.restore !== 'function') {
      console.warn('Invalid canvas context for clearing clipping region');
      return;
    }

    try {
      ctx.restore();
    } catch (error) {
      console.warn('Failed to restore canvas context:', error.message);
    }
  },

  /**
   * Draw panel background with enhanced styling
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} colors - Color theme object
   * @param {Object} padding - Padding object
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Additional styling options
   */
  drawPanelBackground(ctx, colors, padding, width, height, options = {}) {
    if (!ctx || !colors) {
      console.warn('Invalid parameters for drawing panel background');
      return;
    }

    const { borderRadius = 0, shadowBlur = 0, shadowColor = 'transparent', margin = 10 } = options;

    try {
      ctx.save();

      // Apply shadow if specified
      if (shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
      }

      ctx.fillStyle = colors.panelBackground || colors.background;

      const x = padding.left - margin;
      const y = padding.top - margin;
      const w = width - padding.left - padding.right + margin * 2;
      const h = height - padding.top - padding.bottom + margin * 2;

      if (borderRadius > 0) {
        this._drawRoundedRect(ctx, x, y, w, h, borderRadius);
      } else {
        ctx.fillRect(x, y, w, h);
      }

      ctx.restore();
    } catch (error) {
      console.warn('Failed to draw panel background:', error.message);
      ctx.restore();
    }
  },

  /**
   * Clear canvas with background color and performance optimizations
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} colors - Color theme object
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {boolean} useOptimization - Use clearRect optimization for better performance
   */
  clearCanvas(ctx, colors, width, height, useOptimization = true) {
    if (!ctx || !colors) {
      console.warn('Invalid parameters for clearing canvas');
      return;
    }

    try {
      if (useOptimization && colors.background === 'transparent') {
        // Use clearRect for transparent backgrounds (faster)
        ctx.clearRect(0, 0, width, height);
      } else {
        // Use fillRect for solid backgrounds
        ctx.fillStyle = colors.background || '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
    } catch (error) {
      console.warn('Failed to clear canvas:', error.message);
      // Fallback to basic clear
      ctx.clearRect(0, 0, width, height);
    }
  },

  /**
   * Create optimized gradient for performance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} type - Gradient type ('linear' or 'radial')
   * @param {Array} colors - Array of color stops
   * @param {Object} bounds - Gradient bounds
   * @returns {CanvasGradient} Optimized gradient
   */
  createOptimizedGradient(ctx, type, colors, bounds) {
    if (!ctx || !colors || colors.length === 0) {
      throw new CanvasUtilsError('Invalid gradient parameters', 'INVALID_GRADIENT');
    }

    try {
      let gradient;

      if (type === 'linear') {
        gradient = ctx.createLinearGradient(
          bounds.x1 || 0,
          bounds.y1 || 0,
          bounds.x2 || 0,
          bounds.y2 || 100
        );
      } else if (type === 'radial') {
        gradient = ctx.createRadialGradient(
          bounds.x1 || 0,
          bounds.y1 || 0,
          bounds.r1 || 0,
          bounds.x2 || 0,
          bounds.y2 || 0,
          bounds.r2 || 100
        );
      } else {
        throw new CanvasUtilsError(`Unsupported gradient type: ${type}`, 'UNSUPPORTED_GRADIENT');
      }

      // Add color stops
      colors.forEach((colorStop, index) => {
        const position = colorStop.position ?? index / (colors.length - 1);
        gradient.addColorStop(position, colorStop.color);
      });

      return gradient;
    } catch (error) {
      throw new CanvasUtilsError(`Failed to create gradient: ${error.message}`, 'GRADIENT_ERROR');
    }
  },

  /**
   * Measure text with caching for performance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} text - Text to measure
   * @param {string} font - Font string
   * @returns {Object} Text metrics with width and height
   */
  measureText(ctx, text, font) {
    if (!ctx || typeof text !== 'string') {
      return { width: 0, height: 0 };
    }

    const cacheKey = `${text}_${font}`;
    if (this._textMetricsCache && this._textMetricsCache.has(cacheKey)) {
      return this._textMetricsCache.get(cacheKey);
    }

    try {
      const originalFont = ctx.font;
      if (font) ctx.font = font;

      const metrics = ctx.measureText(text);
      const result = {
        width: metrics.width,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 12,
      };

      ctx.font = originalFont;

      // Cache the result
      if (!this._textMetricsCache) {
        this._textMetricsCache = new Map();
      }
      this._textMetricsCache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.warn('Failed to measure text:', error.message);
      return { width: text.length * 6, height: 12 }; // Fallback estimation
    }
  },

  /**
   * Validate padding object
   * @private
   * @param {Object} padding - Padding object to validate
   * @returns {boolean} Whether padding is valid
   */
  _isValidPadding(padding) {
    return (
      padding &&
      typeof padding === 'object' &&
      typeof padding.top === 'number' &&
      typeof padding.right === 'number' &&
      typeof padding.bottom === 'number' &&
      typeof padding.left === 'number' &&
      padding.top >= 0 &&
      padding.right >= 0 &&
      padding.bottom >= 0 &&
      padding.left >= 0
    );
  },

  /**
   * Draw rounded rectangle
   * @private
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {number} radius - Border radius
   */
  _drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  },

  /**
   * Clear text metrics cache to prevent memory leaks
   */
  clearCache() {
    if (this._textMetricsCache) {
      this._textMetricsCache.clear();
    }
  },
};

// Export error class for external use
export { CanvasUtilsError };
