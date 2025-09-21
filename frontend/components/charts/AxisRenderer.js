import { format } from 'date-fns';

/**
 * AxisRenderer - Handles X and Y axis rendering
 * This is a pure function module for rendering axes
 */

export const renderXAxis = (ctx, {
  width,
  data,
  colors,
  padding,
  isMobile,
  visibleStart,
  visibleEnd,
  candleWidth,
  xAxisY,
  xAxisHeight
}) => {
  if (!data.candles || data.candles.length === 0) return;

  // Get time intervals for labels
  const timeIntervals = getTimeIntervals(
    data.candles,
    visibleStart,
    visibleEnd,
    isMobile
  );

  // Use provided Y position for tight integration with chart
  const labelY = xAxisY + (xAxisHeight / 2) + 4; // Center in the X-axis area

  ctx.fillStyle = colors.text.secondary;
  const labelFontSize = isMobile ? '12px' : '14px'; // Increased font sizes
  ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';

  timeIntervals.forEach(interval => {
    const x = padding.left + (interval.index - visibleStart) * candleWidth +
      candleWidth / 2;
    if (x >= padding.left && x <= width - padding.right) {
      const timeString = format(interval.time, 'HH:mm');
      ctx.fillText(timeString, x, labelY);
    }
  });
};

export const renderYAxis = (ctx, {
  colors,
  padding,
  minPrice,
  maxPrice,
  priceRange,
  pricePadding,
  chartHeight,
  isMobile
}) => {
  const horizontalLines = isMobile ? 4 : 8;

  ctx.fillStyle = colors.text.secondary;
  const labelFontSize = isMobile ? '12px' : '14px'; // Increased font sizes
  ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'right';

  for (let i = 0; i <= horizontalLines; i++) {
    const price = minPrice - pricePadding +
      (i * (priceRange + 2 * pricePadding)) / horizontalLines;
    const y = padding.top +
      ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) *
      chartHeight;
    ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
  }
};

export const renderGrid = (ctx, {
  width,
  data,
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
}) => {
  if (!data.candles || data.candles.length === 0) return;

  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  // Vertical grid lines at time intervals
  const timeIntervals = getTimeIntervals(
    data.candles,
    visibleStart,
    visibleEnd,
    isMobile
  );
  timeIntervals.forEach(interval => {
    const x = padding.left + (interval.index - visibleStart) * candleWidth +
      candleWidth / 2;
    if (x >= padding.left && x <= width - padding.right) {
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }
  });

  // Horizontal grid lines
  const horizontalLines = isMobile ? 4 : 8;
  for (let i = 0; i <= horizontalLines; i++) {
    const price = minPrice - pricePadding +
      (i * (priceRange + 2 * pricePadding)) / horizontalLines;
    const y = padding.top +
      ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) *
      chartHeight;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
};

// Helper function to get time intervals
const getTimeIntervals = (candles, visibleStart, visibleEnd, isMobile) => {
  const intervals = [];

  for (let i = visibleStart; i < visibleEnd; i++) {
    const candleTime = new Date(candles[i].time);
    if (isNaN(candleTime.getTime())) continue;

    const candleMinutes = candleTime.getMinutes();
    // Show labels at 00 and 30 minute marks
    if (candleMinutes === 0 || candleMinutes === 30) {
      if (isMobile) {
        // On mobile, show every hour instead
        if (candleMinutes === 0) {
          intervals.push({ index: i, time: candleTime });
        }
      } else {
        intervals.push({ index: i, time: candleTime });
      }
    }
  }

  return intervals;
};
