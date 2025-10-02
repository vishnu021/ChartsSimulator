import { chartSettings } from '../chartConfig';

/**
 * CandlestickRenderer - Handles candlestick chart rendering
 * This is a pure function module for rendering candlesticks
 */

export const renderCandlesticks = (ctx, {
  data,
  colors,
  padding,
  chartHeight,
  visibleStart,
  visibleEnd,
  candleWidth,
  maxPrice,
  priceRange,
  pricePadding
}) => {
  if (!data.candles || data.candles.length === 0) return;

  const visibleCandles = data.candles.slice(visibleStart, visibleEnd);

  const yScale = (price) => {
    return padding.top +
      ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) *
      chartHeight;
  };

  const xScale = (index) => {
    return padding.left + (index - visibleStart) * candleWidth +
      candleWidth / 2;
  };

  // Draw candlesticks
  visibleCandles.forEach((candle, i) => {
    const x = xScale(visibleStart + i);
    const isGreen = candle.close >= candle.open;
    const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

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
      x - (candleWidth * chartSettings.candleBodyWidthRatio) / 2,
      bodyTop,
      candleWidth * chartSettings.candleBodyWidthRatio,
      bodyHeight
    );
  });
};

export const renderHeikinAshi = (ctx, {
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
  outlineOnly = true,
  colorMode = 'yellow'
}) => {
  if (!data.heikinAshi || data.heikinAshi.length === 0) return;

  const visibleCandles = data.heikinAshi.slice(visibleStart, visibleEnd);

  const yScale = (price) => {
    return padding.top +
      ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) *
      chartHeight;
  };

  const xScale = (index) => {
    return padding.left + (index - visibleStart) * candleWidth +
      candleWidth / 2;
  };

  visibleCandles.forEach((candle, i) => {
    const x = xScale(visibleStart + i);

    // Determine color based on mode
    let wickColor, bodyColor;
    if (colorMode === 'traditional') {
      // Use red/green colors like regular candles
      const isGreen = candle.close >= candle.open;
      wickColor = isGreen ? colors.candle.bullish : colors.candle.bearish;
      bodyColor = isGreen ? colors.candle.bullish : colors.candle.bearish;
    } else {
      // Default yellow color
      wickColor = '#d97706';
      bodyColor = '#d97706';
    }

    // Draw wick
    ctx.strokeStyle = wickColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yScale(candle.high));
    ctx.lineTo(x, yScale(candle.low));
    ctx.stroke();

    // Draw body
    const bodyTop = yScale(Math.max(candle.open, candle.close));
    const bodyBottom = yScale(Math.min(candle.open, candle.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    if (colorMode === 'yellow' && outlineOnly) {
      // Yellow hollow mode - only stroke the rectangle
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        x - (candleWidth * chartSettings.candleBodyWidthRatio) / 2,
        bodyTop,
        candleWidth * chartSettings.candleBodyWidthRatio,
        bodyHeight
      );
    } else {
      // Traditional mode or filled mode - fill the rectangle
      ctx.fillStyle = bodyColor;
      ctx.fillRect(
        x - (candleWidth * chartSettings.candleBodyWidthRatio) / 2,
        bodyTop,
        candleWidth * chartSettings.candleBodyWidthRatio,
        bodyHeight
      );
    }
  });
};
