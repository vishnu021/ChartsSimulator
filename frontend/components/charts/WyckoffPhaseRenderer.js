/**
 * WyckoffPhaseRenderer - Handles Wyckoff phase strip rendering
 * This is a pure function module for rendering Wyckoff phases
 */

// Wyckoff phase colors - distinct and vibrant
const WYCKOFF_COLORS = {
  ACCUMULATION: '#10B981',  // Emerald green - buying/accumulating
  MARKUP: '#3B82F6',       // Bright blue - uptrend/bullish
  DISTRIBUTION: '#F59E0B',  // Amber - selling/distributing
  MARKDOWN: '#EF4444',     // Red - downtrend/bearish
  UNKNOWN: '#6B7280'       // Gray - unknown
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
  isMobile
}) => {
  if (!data.wyckoffPhases || data.wyckoffPhases.length === 0) return;

  const stripHeight = 25; // Reduced height for better fit
  // Position strip at very bottom but ensure it's visible within viewport
  const stripY = height - stripHeight - 2;

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

      // Draw phase label if there's enough space
      if (phaseWidth > 50) {
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
          isMobile ? '10px' : '11px'
        } -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(phase.phase.replace('_', ' '), labelX, labelY - 3);

        // Confidence if there's space
        if (phaseWidth > 80 && phase.confidence) {
          ctx.font = `${
            isMobile ? '8px' : '9px'
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
      isMobile ? '8px' : '9px'
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
