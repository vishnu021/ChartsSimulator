/**
 * CrosshairRenderer - Common utility for rendering crosshairs across all chart types
 * Provides consistent crosshair visualization and styling
 */

/**
 * Draws crosshair lines on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} mousePos - Mouse position {x, y}
 * @param {Object} padding - Chart padding configuration
 * @param {Object} options - Rendering options
 * @param {Object} options.colors - Theme colors
 * @param {boolean} options.showCrosshair - Whether to show crosshair
 * @param {boolean} options.isDragging - Whether user is dragging
 * @param {boolean} options.isMobile - Mobile device flag
 * @param {number} options.lineWidth - Crosshair line width
 * @param {Array} options.dashArray - Line dash pattern
 * @param {number} options.opacity - Crosshair opacity
 */
export const drawCrosshair = (ctx, width, height, mousePos, padding, options = {}) => {
  const {
    colors,
    showCrosshair = false,
    isDragging = false,
    isMobile = false,
    lineWidth = 1.5,
    dashArray = [2, 2],
    opacity = 0.7
  } = options;

  // Don't show crosshair on mobile or when dragging
  if (isMobile || !showCrosshair || isDragging) return;

  // Check if mouse is within chart bounds
  if (mousePos.x <= padding.left ||
      mousePos.x >= width - padding.right ||
      mousePos.y <= padding.top ||
      mousePos.y >= height - padding.bottom) {
    return;
  }

  // Set crosshair style
  ctx.strokeStyle = colors.lines?.crosshair || colors.text?.secondary || '#64748b';
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dashArray);
  ctx.globalAlpha = opacity;

  // Draw vertical line
  ctx.beginPath();
  ctx.moveTo(mousePos.x, padding.top);
  ctx.lineTo(mousePos.x, height - padding.bottom);
  ctx.stroke();

  // Draw horizontal line
  ctx.beginPath();
  ctx.moveTo(padding.left, mousePos.y);
  ctx.lineTo(width - padding.right, mousePos.y);
  ctx.stroke();

  // Reset line style
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
};

/**
 * Enhanced crosshair with price and time labels
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} mousePos - Mouse position {x, y}
 * @param {Object} padding - Chart padding configuration
 * @param {Object} options - Enhanced options
 * @param {Object} options.colors - Theme colors
 * @param {boolean} options.showCrosshair - Whether to show crosshair
 * @param {boolean} options.isDragging - Whether user is dragging
 * @param {boolean} options.isMobile - Mobile device flag
 * @param {Function} options.getPriceAtY - Function to get price at Y coordinate
 * @param {Function} options.getTimeAtX - Function to get time at X coordinate
 * @param {Object} options.labelStyle - Label styling options
 */
export const drawEnhancedCrosshair = (ctx, width, height, mousePos, padding, options = {}) => {
  const {
    colors,
    showCrosshair = false,
    isDragging = false,
    isMobile = false,
    getPriceAtY,
    getTimeAtX,
    labelStyle = {}
  } = options;

  // Draw basic crosshair first
  drawCrosshair(ctx, width, height, mousePos, padding, options);

  if (!showCrosshair || isDragging || isMobile) return;
  if (!getPriceAtY || !getTimeAtX) return;

  // Get values at crosshair position
  const price = getPriceAtY(mousePos.y);
  const time = getTimeAtX(mousePos.x);

  if (price == null || time == null) return;

  // Default label styling
  const labelDefaults = {
    background: colors.tooltip?.background || 'rgba(30, 41, 59, 0.95)',
    border: colors.tooltip?.border || '#475569',
    textColor: colors.text?.primary || '#f1f5f9',
    font: '12px -apple-system, BlinkMacSystemFont, sans-serif',
    padding: 8,
    borderRadius: 4,
    ...labelStyle
  };

  // Draw price label (right side)
  drawPriceLabel(ctx, width, height, mousePos, padding, price, labelDefaults);

  // Draw time label (bottom)
  drawTimeLabel(ctx, width, height, mousePos, padding, time, labelDefaults);
};

/**
 * Draws price label on the right side of the chart
 */
const drawPriceLabel = (ctx, width, height, mousePos, padding, price, style) => {
  const labelText = typeof price === 'number' ? price.toFixed(2) : price.toString();
  const labelWidth = 75;
  const labelHeight = 20;
  const labelX = width - padding.right + 5;
  const labelY = mousePos.y - labelHeight / 2;

  // Draw background
  ctx.fillStyle = style.background;
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, style.borderRadius);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, style.borderRadius);
  ctx.stroke();

  // Draw text
  ctx.fillStyle = style.textColor;
  ctx.font = style.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2);
};

/**
 * Draws time label at the bottom of the chart
 */
const drawTimeLabel = (ctx, width, height, mousePos, padding, time, style) => {
  const labelText = formatTime(time);
  const labelWidth = 80;
  const labelHeight = 20;
  const labelX = mousePos.x - labelWidth / 2;
  const labelY = height - padding.bottom + 5;

  // Draw background
  ctx.fillStyle = style.background;
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, style.borderRadius);
  ctx.fill();

  // Draw border
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, style.borderRadius);
  ctx.stroke();

  // Draw text
  ctx.fillStyle = style.textColor;
  ctx.font = style.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labelText, labelX + labelWidth / 2, labelY + labelHeight / 2);
};

/**
 * Draws rounded rectangle
 */
const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (radius <= 0) {
    ctx.rect(x, y, width, height);
    return;
  }

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
};

/**
 * Formats time for display
 */
const formatTime = (time) => {
  if (time instanceof Date) {
    return time.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  return String(time);
};

/**
 * Hook for using crosshair rendering in React components
 * @param {Object} colors - Theme colors
 * @param {boolean} isMobile - Mobile device flag
 * @param {Object} customOptions - Custom rendering options
 * @returns {Object} - Crosshair rendering functions
 */
export const useCrosshairRenderer = (colors, isMobile = false, customOptions = {}) => {
  const defaultOptions = {
    colors,
    isMobile,
    lineWidth: 1.5,
    dashArray: [2, 2],
    opacity: 0.7,
    ...customOptions
  };

  return {
    drawCrosshair: (ctx, width, height, mousePos, padding, options = {}) =>
      drawCrosshair(ctx, width, height, mousePos, padding, { ...defaultOptions, ...options }),

    drawEnhancedCrosshair: (ctx, width, height, mousePos, padding, options = {}) =>
      drawEnhancedCrosshair(ctx, width, height, mousePos, padding, { ...defaultOptions, ...options })
  };
};
