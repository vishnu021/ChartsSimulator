/**
 * WyckoffPhaseRenderer - Handles Wyckoff phase strip rendering
 * This is a pure function module for rendering Wyckoff phases
 */

// Wyckoff phase colors - enhanced vibrancy and contrast
const WYCKOFF_COLORS = {
  ACCUMULATION: '#00D9FF',  // Bright cyan - buying/accumulating (more vibrant)
  MARKUP: '#00FF88',       // Bright green - uptrend/bullish (success green)
  DISTRIBUTION: '#FFB800',  // Bright orange - selling/distributing (warning)
  MARKDOWN: '#FF3366',     // Bright red - downtrend/bearish (danger red)
  UNKNOWN: '#8B93A6'       // Lighter gray - unknown
};

export const renderWyckoffPhases = (ctx, {
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
}) => {
  if (!data.wyckoffPhases || data.wyckoffPhases.length === 0) return;

  // Use provided positioning for tight integration with chart
  const stripHeight = phaseStripHeight || 20;
  const stripY = phaseStripY;

  // Draw background for the strip
  ctx.fillStyle = colors.panel || colors.background;
  ctx.fillRect(
    padding.left,
    stripY,
    width - padding.left - padding.right,
    stripHeight
  );

  // Draw border around the strip
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    padding.left,
    stripY,
    width - padding.left - padding.right,
    stripHeight
  );

  // Draw phase segments
  data.wyckoffPhases.forEach(phase => {
    const phaseStart = Math.max(phase.startIndex, visibleStart);
    const phaseEnd = Math.min(phase.endIndex, visibleEnd);

    if (phaseStart <= phaseEnd && phaseEnd >= visibleStart &&
        phaseStart <= visibleEnd) {
      const startX = padding.left + (phaseStart - visibleStart) * candleWidth;
      const endX = padding.left + (phaseEnd - visibleStart + 1) * candleWidth;
      const phaseWidth = Math.max(endX - startX, 2);

      // Draw phase background with gradient effect
      const gradient = ctx.createLinearGradient(
        startX,
        stripY + 2,
        startX,
        stripY + stripHeight - 2
      );
      const phaseColor = WYCKOFF_COLORS[phase.phase] || WYCKOFF_COLORS.UNKNOWN;
      gradient.addColorStop(0, phaseColor + '40'); // More transparent at top
      gradient.addColorStop(1, phaseColor + '80'); // More opaque at bottom

      ctx.fillStyle = gradient;
      ctx.fillRect(startX, stripY + 2, phaseWidth, stripHeight - 4);

      // Draw phase border
      ctx.strokeStyle = phaseColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, stripY + 2, phaseWidth, stripHeight - 4);

      // Add inner glow effect
      ctx.shadowColor = phaseColor;
      ctx.shadowBlur = 3;
      ctx.strokeRect(startX + 1, stripY + 3, phaseWidth - 2, stripHeight - 6);
      ctx.shadowBlur = 0;

      // Draw phase label if there's enough space, otherwise rely on tooltip
      if (phaseWidth > 40) {
        const labelX = startX + phaseWidth / 2;
        const labelY = stripY + stripHeight / 2;

        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Phase name with bold styling
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${
          isMobile ? '12px' : '13px'
        } -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(phase.phase.replace('_', ' '), labelX, labelY - 3);

        // Confidence if there's space
        if (phaseWidth > 80 && phase.confidence) {
          ctx.font = `${
            isMobile ? '10px' : '11px'
          } -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.fillStyle = '#E0E0E0';
          ctx.fillText(
            `${(phase.confidence * 100).toFixed(0)}%`,
            labelX,
            labelY + 5
          );
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
    const currentPhaseColor = WYCKOFF_COLORS[data.currentPhase] ||
      WYCKOFF_COLORS.UNKNOWN;

    // Draw current phase indicator at the right side
    const indicatorX = width - padding.right - 80;
    const indicatorY = stripY + 3;
    const indicatorWidth = 75;
    const indicatorHeight = stripHeight - 6;

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
    ctx.font = `${
      isMobile ? '10px' : '11px'
    } -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Now: ${data.currentPhase.replace('_', ' ')}`,
      indicatorX + indicatorWidth / 2,
      indicatorY + indicatorHeight / 2
    );
  }
};

/**
 * Renders tooltip for Wyckoff phases on hover
 */
export const renderWyckoffTooltip = (ctx, {
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
}) => {
  if (!data.wyckoffPhases || data.wyckoffPhases.length === 0) return null;
  if (!mousePos || isMobile) return null;

  const stripHeight = phaseStripHeight || 20;
  const stripY = phaseStripY;

  // Check if mouse is over the phase strip
  if (mousePos.y < stripY || mousePos.y > stripY + stripHeight) return null;
  if (mousePos.x < padding.left || mousePos.x > width - padding.right) return null;

  // Find which phase the mouse is over
  let hoveredPhase = null;
  for (const phase of data.wyckoffPhases) {
    const phaseStart = Math.max(phase.startIndex, visibleStart);
    const phaseEnd = Math.min(phase.endIndex, visibleEnd);

    if (phaseStart <= phaseEnd && phaseEnd >= visibleStart && phaseStart <= visibleEnd) {
      const startX = padding.left + (phaseStart - visibleStart) * candleWidth;
      const endX = padding.left + (phaseEnd - visibleStart + 1) * candleWidth;

      if (mousePos.x >= startX && mousePos.x <= endX) {
        hoveredPhase = phase;
        break;
      }
    }
  }

  if (!hoveredPhase) return null;

  // Draw tooltip
  const tooltipText = `${hoveredPhase.phase.replace('_', ' ')}`;
  const confidenceText = hoveredPhase.confidence ?
    ` (${(hoveredPhase.confidence * 100).toFixed(0)}%)` : '';
  const fullText = tooltipText + confidenceText;

  // Measure text to size tooltip
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
  const textMetrics = ctx.measureText(fullText);
  const tooltipWidth = textMetrics.width + 16;
  const tooltipHeight = 24;

  // Position tooltip above the mouse
  let tooltipX = mousePos.x - tooltipWidth / 2;
  let tooltipY = mousePos.y - tooltipHeight - 10;

  // Ensure tooltip stays within bounds
  if (tooltipX < padding.left) tooltipX = padding.left;
  if (tooltipX + tooltipWidth > width - padding.right) {
    tooltipX = width - padding.right - tooltipWidth;
  }
  if (tooltipY < padding.top) tooltipY = mousePos.y + 10;

  // Draw tooltip background
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  ctx.beginPath();
  // Use roundRect if available, otherwise fallback to rect
  if (ctx.roundRect) {
    ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
  } else {
    ctx.rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  }
  ctx.fill();

  // Draw tooltip border
  const phaseColor = WYCKOFF_COLORS[hoveredPhase.phase] || WYCKOFF_COLORS.UNKNOWN;
  ctx.strokeStyle = phaseColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw tooltip text
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    fullText,
    tooltipX + tooltipWidth / 2,
    tooltipY + tooltipHeight / 2
  );

  return hoveredPhase;
};
