'use client';

import { useEffect, useRef, useMemo } from 'react';

/**
 * Convert tickers to candlesticks (1-minute candles)
 */
function tickersToCandlesticks(tickers) {
  if (!tickers || tickers.length === 0) return [];

  const candleMap = new Map();

  tickers.forEach(ticker => {
    // Extract minute key (YYYY-MM-DD HH:MM)
    const minuteKey = ticker.time.substring(0, 16);

    if (!candleMap.has(minuteKey)) {
      candleMap.set(minuteKey, {
        time: minuteKey,
        open: ticker.price,
        high: ticker.price,
        low: ticker.price,
        close: ticker.price,
        firstTime: ticker.time
      });
    } else {
      const candle = candleMap.get(minuteKey);
      candle.high = Math.max(candle.high, ticker.price);
      candle.low = Math.min(candle.low, ticker.price);
      candle.close = ticker.price;
    }
  });

  return Array.from(candleMap.values());
}

/**
 * Minimal day overview chart showing full trading day with candlesticks.
 * Only shows markers for the currently selected trade.
 */
export default function DayOverviewChart({ tickers, selectedTrade }) {
  const canvasRef = useRef(null);

  // Cache candlesticks - only recalculate when tickers change
  const candlesticks = useMemo(() => tickersToCandlesticks(tickers), [tickers]);

  useEffect(() => {
    if (!canvasRef.current || !candlesticks || candlesticks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set canvas size for retina displays
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 10, bottom: 20, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get price range from candlesticks
    const allPrices = candlesticks.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;

    // Scale functions
    const xScale = (index) => padding.left + (index / (candlesticks.length - 1)) * chartWidth;
    const yScale = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

    // Draw grid lines (horizontal only)
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw candlesticks
    const candleWidth = Math.max(1, chartWidth / candlesticks.length * 0.8);

    candlesticks.forEach((candle, index) => {
      const x = xScale(index);
      const yOpen = yScale(candle.open);
      const yClose = yScale(candle.close);
      const yHigh = yScale(candle.high);
      const yLow = yScale(candle.low);

      const isGreen = candle.close >= candle.open;
      const color = isGreen ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = color;
      const bodyHeight = Math.abs(yClose - yOpen);
      const bodyY = Math.min(yOpen, yClose);
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
    });

    // Helper function to find candlestick index by time (minute precision)
    const findCandleIndex = (timeStr) => {
      const minuteKey = timeStr.substring(0, 16); // YYYY-MM-DD HH:MM
      return candlesticks.findIndex(c => c.time === minuteKey);
    };

    // Draw trade markers ONLY for selected trade
    if (selectedTrade) {
      const entryIndex = findCandleIndex(selectedTrade.entryTime);
      const exitIndex = findCandleIndex(selectedTrade.exitTime);

      if (entryIndex !== -1) {
        const x = xScale(entryIndex);
        const y = yScale(selectedTrade.entryPrice);

        // Entry marker (green dot) - smaller for cleaner look
        ctx.fillStyle = 'rgba(34, 197, 94, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Entry marker at bottom
        ctx.fillStyle = 'rgba(34, 197, 94, 1)';
        ctx.beginPath();
        ctx.arc(x, padding.top + chartHeight + 8, 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (exitIndex !== -1) {
        const x = xScale(exitIndex);
        const y = yScale(selectedTrade.exitPrice);

        // Exit marker - always red
        ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Exit marker at bottom - always red
        ctx.fillStyle = 'rgba(239, 68, 68, 1)';
        ctx.beginPath();
        ctx.arc(x, padding.top + chartHeight + 8, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Draw line connecting entry and exit
        if (entryIndex !== -1) {
          const entryX = xScale(entryIndex);
          const entryY = yScale(selectedTrade.entryPrice);
          ctx.strokeStyle = selectedTrade.profitLoss >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(entryX, entryY);
          ctx.lineTo(x, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw price labels
    ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`₹${maxPrice.toFixed(2)}`, padding.left + 2, padding.top + 10);
    ctx.fillText(`₹${minPrice.toFixed(2)}`, padding.left + 2, padding.top + chartHeight - 2);

    // Draw time labels
    if (candlesticks.length > 0) {
      ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
      ctx.textAlign = 'left';
      const startTime = candlesticks[0].time.substring(11, 16); // HH:MM
      ctx.fillText(startTime, padding.left, height - 3);

      ctx.textAlign = 'right';
      const endTime = candlesticks[candlesticks.length - 1].time.substring(11, 16);
      ctx.fillText(endTime, width - padding.right, height - 3);
    }

  }, [candlesticks, selectedTrade]);

  return (
    <div className="relative w-full h-full bg-surface/30 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
        <div className="text-[10px] font-bold text-text bg-background/80 px-2 py-0.5 rounded shadow-sm">
          Full Day Overview
        </div>
      </div>
    </div>
  );
}
