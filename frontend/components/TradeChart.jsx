'use client';

import { useMemo, useRef, useEffect, useState } from 'react';

/**
 * TradeChart Component
 * Displays a filtered chart view showing ticker data around a specific trade
 * with entry/exit markers and configurable time window
 */
export default function TradeChart({ trade, tickers, timeWindowMinutes }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState(null);

  // Parse datetime string to timestamp
  const parseTime = (timeStr) => {
    return new Date(timeStr).getTime();
  };

  // Filter tickers based on trade entry/exit time and window
  const filteredTickers = useMemo(() => {
    if (!trade || !tickers || tickers.length === 0) return [];

    const entryTime = parseTime(trade.entryTime);
    const exitTime = parseTime(trade.exitTime);
    const windowMs = timeWindowMinutes * 60 * 1000; // Convert minutes to milliseconds

    const startTime = entryTime - windowMs;
    const endTime = exitTime + windowMs;

    return tickers.filter(ticker => {
      const tickerTime = parseTime(ticker.time);
      return tickerTime >= startTime && tickerTime <= endTime;
    });
  }, [trade, tickers, timeWindowMinutes]);

  // Aggregate tickers into 1-minute candlesticks
  const candlesticks = useMemo(() => {
    if (filteredTickers.length === 0) return [];

    const candles = [];
    let currentMinute = null;
    let currentCandle = null;

    filteredTickers.forEach((ticker) => {
      const tickerTime = new Date(ticker.time);
      const minute = new Date(tickerTime.getFullYear(), tickerTime.getMonth(), tickerTime.getDate(),
        tickerTime.getHours(), tickerTime.getMinutes(), 0, 0).getTime();

      if (minute !== currentMinute) {
        if (currentCandle) {
          candles.push(currentCandle);
        }
        currentMinute = minute;
        currentCandle = {
          time: minute,
          open: ticker.price,
          high: ticker.price,
          low: ticker.price,
          close: ticker.price,
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, ticker.price);
        currentCandle.low = Math.min(currentCandle.low, ticker.price);
        currentCandle.close = ticker.price;
      }
    });

    if (currentCandle) {
      candles.push(currentCandle);
    }

    return candles;
  }, [filteredTickers]);

  // Update canvas dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 20, height: height - 20 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Mouse move handler
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || candlesticks.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range from candlesticks
    const allPrices = candlesticks.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;

    // Margins
    const marginTop = 30;
    const marginBottom = 50;
    const marginLeft = 80;
    const marginRight = 80; // Increased to prevent price label trimming
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;

    // Helper functions
    const getY = (price) => marginTop + ((maxPrice - price) / priceRange) * chartHeight;

    // Calculate candle width - use full space for continuity with no gaps
    const candleWidth = chartWidth / candlesticks.length;
    const getX = (index) => marginLeft + (index * candleWidth);

    // Draw background grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = marginTop + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(marginLeft, y);
      ctx.lineTo(width - marginRight, y);
      ctx.stroke();
    }

    // Draw candlesticks (translucent background)
    ctx.globalAlpha = 0.3; // Make candlesticks translucent
    candlesticks.forEach((candle, i) => {
      const x = getX(i);
      const yOpen = getY(candle.open);
      const yClose = getY(candle.close);
      const yHigh = getY(candle.high);
      const yLow = getY(candle.low);

      const isGreen = candle.close >= candle.open;

      // Draw wick (high-low line) at candle center
      const candleCenter = x + candleWidth / 2;
      ctx.strokeStyle = isGreen ? '#00ff00' : '#ff0000';
      ctx.lineWidth = 2; // Increased thickness for better visibility
      ctx.beginPath();
      ctx.moveTo(candleCenter, yHigh);
      ctx.lineTo(candleCenter, yLow);
      ctx.stroke();

      // Draw candle body spanning full width (no gaps)
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.abs(yClose - yOpen) || 1;

      ctx.fillStyle = isGreen ? '#00ff00' : '#ff0000';
      ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);

      // Draw candle border
      ctx.strokeStyle = isGreen ? '#00aa00' : '#aa0000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
    });
    ctx.globalAlpha = 1.0; // Reset opacity

    // Draw ticker line (foreground overlay)
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    filteredTickers.forEach((ticker, i) => {
      const tickerTime = parseTime(ticker.time);
      // Find the corresponding position based on time
      const totalTimeRange = parseTime(filteredTickers[filteredTickers.length - 1].time) - parseTime(filteredTickers[0].time);
      const tickerOffset = tickerTime - parseTime(filteredTickers[0].time);
      const xRatio = totalTimeRange > 0 ? tickerOffset / totalTimeRange : 0;
      const x = marginLeft + xRatio * chartWidth;
      const y = getY(ticker.price);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Find ticker positions for entry and exit times
    const entryTime = parseTime(trade.entryTime);
    const exitTime = parseTime(trade.exitTime);

    let entryTicker = null;
    let exitTicker = null;

    // Find the exact ticker at entry and exit times
    filteredTickers.forEach((ticker) => {
      const tickerTime = parseTime(ticker.time);
      if (!entryTicker && tickerTime >= entryTime) entryTicker = ticker;
      if (!exitTicker && tickerTime >= exitTime) exitTicker = ticker;
    });

    // Draw entry marker (green) on ticker line
    if (entryTicker) {
      const tickerTime = parseTime(entryTicker.time);
      const totalTimeRange = parseTime(filteredTickers[filteredTickers.length - 1].time) - parseTime(filteredTickers[0].time);
      const tickerOffset = tickerTime - parseTime(filteredTickers[0].time);
      const xRatio = totalTimeRange > 0 ? tickerOffset / totalTimeRange : 0;
      const x = marginLeft + xRatio * chartWidth;
      const y = getY(entryTicker.price);

      // Draw vertical line
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, height - marginBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw entry price marker on ticker line
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('ENTRY', x + 5, marginTop + 15);
    }

    // Draw exit marker (red) on ticker line
    if (exitTicker) {
      const tickerTime = parseTime(exitTicker.time);
      const totalTimeRange = parseTime(filteredTickers[filteredTickers.length - 1].time) - parseTime(filteredTickers[0].time);
      const tickerOffset = tickerTime - parseTime(filteredTickers[0].time);
      const xRatio = totalTimeRange > 0 ? tickerOffset / totalTimeRange : 0;
      const x = marginLeft + xRatio * chartWidth;
      const y = getY(exitTicker.price);

      // Draw vertical line
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, height - marginBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw exit price marker on ticker line
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('EXIT', x + 5, marginTop + 30);
    }

    // Draw Y-axis labels (prices)
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = maxPrice - (i / 5) * priceRange;
      const y = marginTop + (i / 5) * chartHeight;
      ctx.fillText(`₹${price.toFixed(2)}`, marginLeft - 10, y + 4);
    }

    // Draw X-axis labels (time)
    ctx.textAlign = 'center';
    const numLabels = Math.min(5, candlesticks.length);
    for (let i = 0; i < numLabels; i++) {
      const index = Math.floor((i / (numLabels - 1)) * (candlesticks.length - 1));
      const candle = candlesticks[index];
      const x = getX(index);
      const timeLabel = new Date(candle.time).toTimeString().substring(0, 8); // HH:MM:SS
      ctx.fillText(timeLabel, x, height - marginBottom + 20);
    }

    // Draw trade info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    const profitLossColor = trade.profitLoss >= 0 ? '#00ff00' : '#ff0000';
    ctx.fillText('P/L: ', marginLeft + 10, marginTop + 15);
    ctx.fillStyle = profitLossColor;
    ctx.fillText(`₹${trade.profitLoss.toFixed(2)} (${trade.profitLossPercent.toFixed(2)}%)`, marginLeft + 45, marginTop + 15);

    // Draw crosshair if mouse is over chart
    if (mousePos && mousePos.x >= marginLeft && mousePos.x <= width - marginRight &&
        mousePos.y >= marginTop && mousePos.y <= height - marginBottom) {
      const { x: mouseX, y: mouseY } = mousePos;

      // Draw crosshair lines
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mouseX, marginTop);
      ctx.lineTo(mouseX, height - marginBottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(marginLeft, mouseY);
      ctx.lineTo(width - marginRight, mouseY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Calculate price at mouse Y position
      const priceAtMouse = maxPrice - ((mouseY - marginTop) / chartHeight) * priceRange;

      // Calculate time at mouse X position
      const timeRatio = (mouseX - marginLeft) / chartWidth;
      const totalTimeRange = parseTime(filteredTickers[filteredTickers.length - 1].time) - parseTime(filteredTickers[0].time);
      const timeAtMouse = parseTime(filteredTickers[0].time) + (timeRatio * totalTimeRange);
      const timeStr = new Date(timeAtMouse).toTimeString().substring(0, 8);

      // Draw time label on top
      ctx.fillStyle = '#000000';
      ctx.fillRect(mouseX - 35, marginTop - 20, 70, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, mouseX, marginTop - 7);

      // Draw price label on right
      const priceText = `₹${priceAtMouse.toFixed(2)}`;
      const priceTextWidth = ctx.measureText(priceText).width;
      ctx.fillStyle = '#000000';
      ctx.fillRect(width - marginRight + 5, mouseY - 9, priceTextWidth + 10, 18);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(priceText, width - marginRight + 10, mouseY + 4);
    }

  }, [candlesticks, trade, dimensions, mousePos, filteredTickers]);

  if (!trade || !tickers || tickers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-secondary">
        No data available
      </div>
    );
  }

  if (filteredTickers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-text-secondary">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p>No ticker data in selected time window</p>
          <p className="text-xs mt-2">Try increasing the time window</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-background rounded-lg p-2">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
