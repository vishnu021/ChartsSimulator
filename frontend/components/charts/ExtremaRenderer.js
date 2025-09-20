import { chartSettings } from '../chartConfig';

/**
 * ExtremaRenderer - Handles extrema (maxima/minima) points and lines rendering
 * This is a pure function module for rendering extrema analysis
 */

export const renderExtrema = (ctx, {
  data,
  colors,
  padding,
  chartHeight,
  visibleStart,
  visibleEnd,
  candleWidth,
  maxPrice,
  priceRange,
  pricePadding,
  viewState,
  isMobile
}) => {
  if (!data.maxima && !data.minima) return;

  const yScale = (price) => {
    return padding.top +
      ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) *
      chartHeight;
  };

  // Calculate extrema points positions
  const allMaximaPoints = (data.maxima || []).map(point => {
    const index = data.candles.findIndex(c => c.time === point.time);
    return {
      x: padding.left + index * candleWidth + viewState.offset +
        candleWidth / 2,
      y: yScale(point.high),
      index,
      visible: index >= visibleStart && index < visibleEnd,
    };
  });

  const allMinimaPoints = (data.minima || []).map(point => {
    const index = data.candles.findIndex(c => c.time === point.time);
    return {
      x: padding.left + index * candleWidth + viewState.offset +
        candleWidth / 2,
      y: yScale(point.low),
      index,
      visible: index >= visibleStart && index < visibleEnd,
    };
  });

  // Draw extrema lines
  if (allMaximaPoints.length > 1) {
    ctx.strokeStyle = colors.lines.maxima;
    ctx.lineWidth = chartSettings.extremaLineWidth;
    ctx.beginPath();

    let started = false;
    allMaximaPoints.forEach(point => {
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  }

  if (allMinimaPoints.length > 1) {
    ctx.strokeStyle = colors.lines.minima;
    ctx.lineWidth = chartSettings.extremaLineWidth;
    ctx.beginPath();

    let started = false;
    allMinimaPoints.forEach(point => {
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  }

  // Draw extrema points (only visible ones)
  const fontSize = isMobile ? '9px' : '11px';
  ctx.font = `${fontSize} -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';

  // Draw maxima points
  allMaximaPoints
    .filter(p => p.visible)
    .forEach(point => {
      ctx.fillStyle = colors.text.maxima;
      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        chartSettings.extremaPointRadius,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.fillText('H', point.x, point.y - 12);
    });

  // Draw minima points
  allMinimaPoints
    .filter(p => p.visible)
    .forEach(point => {
      ctx.fillStyle = colors.text.minima;
      ctx.beginPath();
      ctx.arc(
        point.x,
        point.y,
        chartSettings.extremaPointRadius,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.fillText('L', point.x, point.y + 24);
    });
};
