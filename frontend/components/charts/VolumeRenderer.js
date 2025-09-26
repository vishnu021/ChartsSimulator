import { chartSettings } from '../chartConfig';

/**
 * VolumeRenderer - Handles volume chart rendering
 * Renders volume bars below the main price chart
 */

export const renderVolume = (ctx, {
  data,
  colors,
  padding,
  volumeHeight,
  visibleStart,
  visibleEnd,
  candleWidth,
  maxVolume,
  chartEndY
}) => {
  if (!data.candles || data.candles.length === 0) return;

  const visibleCandles = data.candles.slice(visibleStart, visibleEnd);

  // Calculate volume chart positioning
  const volumeStartY = chartEndY + 10; // 10px gap from main chart
  const volumeEndY = volumeStartY + volumeHeight;

  const volumeScale = (volume) => {
    if (maxVolume === 0) return volumeEndY;
    return volumeEndY - (volume / maxVolume) * volumeHeight;
  };

  const xScale = (index) => {
    return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
  };

  // Draw volume bars
  visibleCandles.forEach((candle, i) => {
    const x = xScale(visibleStart + i);
    const volume = candle.volume || 0;

    if (volume === 0) return; // Skip if no volume data

    const barTop = volumeScale(volume);
    const barHeight = volumeEndY - barTop;

    // Color volume bars based on price movement
    const isGreen = candle.close >= candle.open;
    const color = isGreen ? colors.volume.bullish : colors.volume.bearish;

    ctx.fillStyle = color;
    ctx.fillRect(
      x - (candleWidth * chartSettings.volumeBarWidthRatio) / 2,
      barTop,
      candleWidth * chartSettings.volumeBarWidthRatio,
      barHeight
    );
  });

  // Draw volume chart border
  ctx.strokeStyle = colors.volume.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.rect(padding.left, volumeStartY,
    ctx.canvas.width - padding.left - padding.right, volumeHeight);
  ctx.stroke();

  // Draw volume axis labels
  drawVolumeAxisLabels(ctx, {
    colors,
    padding,
    volumeStartY,
    volumeEndY,
    maxVolume,
  });
};

const drawVolumeAxisLabels = (ctx, {
  colors,
  padding,
  volumeStartY,
  volumeEndY,
  maxVolume
}) => {
  ctx.fillStyle = colors.volume.text;
  ctx.font = chartSettings.fonts.axis;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  // Format volume for display
  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toString();
  };

  // Draw max volume label
  if (maxVolume > 0) {
    ctx.fillText(
      formatVolume(maxVolume),
      padding.left - 5,
      volumeStartY
    );

    // Draw mid volume label
    const midVolume = maxVolume / 2;
    const midY = (volumeStartY + volumeEndY) / 2;
    ctx.fillText(
      formatVolume(midVolume),
      padding.left - 5,
      midY
    );

    // Draw zero label
    ctx.fillText('0', padding.left - 5, volumeEndY);
  }

  // Draw "Volume" label
  ctx.save();
  ctx.translate(padding.left - 30, (volumeStartY + volumeEndY) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.volume.label;
  ctx.font = chartSettings.fonts.volumeLabel;
  ctx.fillText('Volume', 0, 0);
  ctx.restore();
};

/**
 * Calculate volume statistics for scaling
 */
export const calculateVolumeStats = (candles, visibleStart, visibleEnd) => {
  if (!candles || candles.length === 0) {
    return { maxVolume: 0, volumeRange: 0, hasVolume: false };
  }

  const visibleCandles = candles.slice(visibleStart, visibleEnd);
  let maxVolume = 0;
  let hasVolume = false;

  visibleCandles.forEach(candle => {
    if (candle.volume && candle.volume > 0) {
      hasVolume = true;
      maxVolume = Math.max(maxVolume, candle.volume);
    }
  });

  return {
    maxVolume,
    volumeRange: maxVolume,
    hasVolume
  };
};
