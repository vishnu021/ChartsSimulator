/**
 * WyckoffPhaseRenderer - Common utility for rendering Wyckoff phases across all chart types
 * Provides consistent phase visualization with enhanced styling
 */

// Wyckoff phase colors configuration
export const wyckoffColors = {
  ACCUMULATION: '#4CAF50',
  MARKUP: '#2196F3',
  DISTRIBUTION: '#FF9800',
  MARKDOWN: '#F44336',
  UNKNOWN: '#9E9E9E'
};

/**
 * Draws Wyckoff phase strip at the bottom of charts
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} visibleStart - Starting index of visible data
 * @param {number} visibleEnd - Ending index of visible data
 * @param {number} candleWidth - Width of each data point
 * @param {Object} padding - Chart padding configuration
 * @param {Object} options - Rendering options
 * @param {Array} options.wyckoffPhases - Array of phase data
 * @param {string} options.currentPhase - Current phase identifier
 * @param {Object} options.colors - Theme colors
 * @param {boolean} options.isMobile - Mobile device flag
 * @param {boolean} options.isTickerChart - Special handling for ticker charts
 */
export const drawWyckoffPhaseStrip = (ctx, width, height, visibleStart, visibleEnd, candleWidth, padding, options = {}) => {
  const {
    wyckoffPhases,
    currentPhase,
    colors,
    isMobile = false,
    isTickerChart = false
  } = options;

  if (!wyckoffPhases || wyckoffPhases.length === 0) return;

  const stripHeight = 35;
  const stripY = height - stripHeight - 50; // Move up more to make room for x-axis labels

  // Draw background for the strip
  ctx.fillStyle = colors.panel || colors.background;
  ctx.fillRect(padding.left, stripY, width - padding.left - padding.right, stripHeight);

  // Draw border around the strip
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(padding.left, stripY, width - padding.left - padding.right, stripHeight);

  // Handle ticker chart special case (simplified phase display)
  if (isTickerChart) {
    drawTickerPhaseDisplay(ctx, width, height, stripY, stripHeight, padding, currentPhase, colors, isMobile);
    return;
  }

  // Draw phase segments for regular charts
  wyckoffPhases.forEach(phase => {
    drawPhaseSegment(ctx, phase, visibleStart, visibleEnd, candleWidth, stripY, stripHeight, padding, colors, isMobile);
  });

  // Draw current phase indicator
  drawCurrentPhaseIndicator(ctx, width, stripY, stripHeight, padding, currentPhase, colors, isMobile);
};

/**
 * Draws individual phase segment
 */
const drawPhaseSegment = (ctx, phase, visibleStart, visibleEnd, candleWidth, stripY, stripHeight, padding, colors, isMobile) => {
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
      drawPhaseLabel(ctx, phase, startX, stripY, phaseWidth, stripHeight, colors, isMobile);
    }
  }
};

/**
 * Draws phase label with enhanced styling
 */
const drawPhaseLabel = (ctx, phase, startX, stripY, phaseWidth, stripHeight, colors, isMobile) => {
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
};

/**
 * Draws current phase indicator
 */
const drawCurrentPhaseIndicator = (ctx, width, stripY, stripHeight, padding, currentPhase, colors, isMobile) => {
  if (currentPhase && currentPhase !== 'UNKNOWN') {
    const currentPhaseColor = wyckoffColors[currentPhase] || wyckoffColors.UNKNOWN;

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
      `Now: ${currentPhase.replace('_', ' ')}`,
      indicatorX + indicatorWidth / 2,
      indicatorY + indicatorHeight / 2
    );
  }
};

/**
 * Special handling for ticker charts (simplified phase display)
 */
const drawTickerPhaseDisplay = (ctx, width, height, stripY, stripHeight, padding, currentPhase, colors, isMobile) => {
  if (currentPhase && currentPhase !== 'UNKNOWN') {
    const currentPhaseColor = wyckoffColors[currentPhase] || wyckoffColors.UNKNOWN;

    // Draw a full-width current phase indicator
    const phaseWidth = width - padding.left - padding.right;

    // Draw phase background with gradient effect
    const gradient = ctx.createLinearGradient(padding.left, stripY + 2, padding.left, stripY + stripHeight - 2);
    gradient.addColorStop(0, currentPhaseColor + '40'); // More transparent at top
    gradient.addColorStop(1, currentPhaseColor + '80'); // More opaque at bottom

    ctx.fillStyle = gradient;
    ctx.fillRect(padding.left, stripY + 2, phaseWidth, stripHeight - 4);

    // Draw phase border
    ctx.strokeStyle = currentPhaseColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(padding.left, stripY + 2, phaseWidth, stripHeight - 4);

    // Add inner glow effect
    ctx.shadowColor = currentPhaseColor;
    ctx.shadowBlur = 5;
    ctx.strokeRect(padding.left + 1, stripY + 3, phaseWidth - 2, stripHeight - 6);
    ctx.shadowBlur = 0;

    // Draw phase label
    const labelX = padding.left + phaseWidth / 2;
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
    ctx.fillText(`Current Phase: ${currentPhase.replace('_', ' ')}`, labelX, labelY);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
};

/**
 * Hook for using Wyckoff phase rendering in React components
 * @param {Object} data - Chart data containing wyckoffPhases and currentPhase
 * @param {Object} colors - Theme colors
 * @param {boolean} isMobile - Mobile device flag
 * @param {boolean} isTickerChart - Special handling for ticker charts
 * @returns {Function} - Configured drawing function
 */
export const useWyckoffPhaseRenderer = (data, colors, isMobile = false, isTickerChart = false) => {
  return (ctx, width, height, visibleStart, visibleEnd, candleWidth, padding) => {
    drawWyckoffPhaseStrip(ctx, width, height, visibleStart, visibleEnd, candleWidth, padding, {
      wyckoffPhases: data.wyckoffPhases,
      currentPhase: data.currentPhase,
      colors,
      isMobile,
      isTickerChart
    });
  };
};