import { UI_CONSTANTS } from '../constants';

/**
 * Canvas utility functions for chart rendering
 */
export const canvasUtils = {
  /**
   * Setup canvas with proper DPI scaling
   */
  setupCanvas(canvas) {
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
   * Get padding based on device type and context
   */
  getPadding(isMobile, isDashboard = false) {
    if (isDashboard) {
      return isMobile ? UI_CONSTANTS.PADDING.DASHBOARD_MOBILE : UI_CONSTANTS.PADDING.DASHBOARD_DESKTOP;
    }
    return isMobile ? UI_CONSTANTS.PADDING.MOBILE : UI_CONSTANTS.PADDING.DESKTOP;
  },

  /**
   * Calculate chart dimensions after padding
   */
  getChartDimensions(width, height, padding) {
    return {
      chartWidth: width - padding.left - padding.right,
      chartHeight: height - padding.top - padding.bottom
    };
  },

  /**
   * Set clipping region for chart area
   */
  setClippingRegion(ctx, padding, chartWidth, chartHeight) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();
  },

  /**
   * Clear clipping region
   */
  clearClippingRegion(ctx) {
    ctx.restore();
  },

  /**
   * Draw panel background
   */
  drawPanelBackground(ctx, colors, padding, width, height) {
    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(
      padding.left - 10,
      padding.top - 10,
      width - padding.left - padding.right + 20,
      height - padding.top - padding.bottom + 20
    );
  },

  /**
   * Clear canvas with background color
   */
  clearCanvas(ctx, colors, width, height) {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);
  }
};