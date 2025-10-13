'use client';

import { useMemo, useRef, useEffect, useState } from 'react';

/**
 * TradeChart Component
 * Simple tick-by-tick chart showing actual ticker data for a trade
 * Time range: 1 minute before entry to 1 minute after exit
 */
export default function TradeChart({ trade, tickers }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState(null);

  // Filter tickers to show data from last minute before entry to next minute after exit
  const filteredTickers = useMemo(() => {
    if (!trade || !tickers || tickers.length === 0) return [];

    const entryTime = new Date(trade.entryTime).getTime();
    const exitTime = new Date(trade.exitTime).getTime();

    // Floor entry to minute start, then go back 1 minute
    const entryDate = new Date(entryTime);
    entryDate.setSeconds(0, 0);
    const startTime = entryDate.getTime() - 60000; // -1 minute

    // Ceil exit to next minute start
    const exitDate = new Date(exitTime);
    if (exitDate.getSeconds() > 0 || exitDate.getMilliseconds() > 0) {
      exitDate.setSeconds(0, 0);
      exitDate.setMinutes(exitDate.getMinutes() + 1);
    }
    const endTime = exitDate.getTime();

    return tickers.filter(ticker => {
      const tickerTime = new Date(ticker.time).getTime();
      return tickerTime >= startTime && tickerTime <= endTime;
    });
  }, [trade, tickers]);

  // Aggregate tickers into 1-minute candlesticks for visual reference
  const candlesticks = useMemo(() => {
    if (filteredTickers.length === 0) return [];

    const candles = [];
    let currentMinute = null;
    let currentCandle = null;

    filteredTickers.forEach(ticker => {
      const tickerDate = new Date(ticker.time);
      const minute = new Date(tickerDate.getFullYear(), tickerDate.getMonth(),
                              tickerDate.getDate(), tickerDate.getHours(),
                              tickerDate.getMinutes(), 0, 0).getTime();

      if (minute !== currentMinute) {
        if (currentCandle) candles.push(currentCandle);
        currentMinute = minute;
        currentCandle = {
          time: minute,
          open: ticker.price,
          high: ticker.price,
          low: ticker.price,
          close: ticker.price
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, ticker.price);
        currentCandle.low = Math.min(currentCandle.low, ticker.price);
        currentCandle.close = ticker.price;
      }
    });

    if (currentCandle) candles.push(currentCandle);
    return candles;
  }, [filteredTickers]);

  // Calculate price range
  const priceRange = useMemo(() => {
    if (filteredTickers.length === 0) return { min: 0, max: 0, range: 1 };

    const prices = filteredTickers.map(t => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, range: max - min || 1 };
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

  // Mouse handlers
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setMousePos(null);

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || filteredTickers.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const margin = { top: 40, bottom: 50, left: 80, right: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Helper functions
    const getY = (price) => margin.top + ((priceRange.max - price) / priceRange.range) * chartHeight;

    const timeRange = new Date(filteredTickers[filteredTickers.length - 1].time).getTime() -
                      new Date(filteredTickers[0].time).getTime();
    const getX = (tickerTime) => {
      const offset = new Date(tickerTime).getTime() - new Date(filteredTickers[0].time).getTime();
      return margin.left + (timeRange > 0 ? (offset / timeRange) * chartWidth : 0);
    };

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    // Draw candlesticks as background reference (translucent)
    if (candlesticks.length > 0) {
      // Calculate candle width based on 1 minute time period
      const oneMinuteMs = 60000;
      const candleWidth = timeRange > 0 ? (oneMinuteMs / timeRange) * chartWidth : chartWidth / candlesticks.length;

      ctx.globalAlpha = 0.3; // Make candlesticks dim
      candlesticks.forEach((candle) => {
        // Position candlestick based on its actual timestamp (start of minute)
        const x = getX(candle.time);
        const yOpen = getY(candle.open);
        const yClose = getY(candle.close);
        const yHigh = getY(candle.high);
        const yLow = getY(candle.low);

        const isGreen = candle.close >= candle.open;
        const color = isGreen ? '#00ff00' : '#ff0000';

        // Draw wick (centered in the candle)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + candleWidth / 2, yHigh);
        ctx.lineTo(x + candleWidth / 2, yLow);
        ctx.stroke();

        // Draw body
        const bodyHeight = Math.abs(yClose - yOpen) || 1;
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.min(yOpen, yClose), candleWidth, bodyHeight);
      });
      ctx.globalAlpha = 1.0; // Reset opacity
    }

    // Draw ticker line (on top, prominent)
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    filteredTickers.forEach((ticker, i) => {
      const x = getX(ticker.time);
      const y = getY(ticker.price);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw entry/exit markers
    const entryTime = new Date(trade.entryTime).getTime();
    const exitTime = new Date(trade.exitTime).getTime();

    const drawMarker = (time, color, label) => {
      const ticker = filteredTickers.find(t => new Date(t.time).getTime() >= time);
      if (!ticker) return;

      const x = getX(ticker.time);
      const y = getY(ticker.price);

      // Vertical line
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Dot on line
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(label, x + 5, margin.top + (label === 'ENTRY' ? 15 : 30));
    };

    drawMarker(entryTime, '#00ff00', 'ENTRY');
    drawMarker(exitTime, '#ff0000', 'EXIT');

    // Draw Y-axis labels (prices)
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = priceRange.max - (i / 5) * priceRange.range;
      const y = margin.top + (i / 5) * chartHeight;
      ctx.fillText(`₹${price.toFixed(2)}`, margin.left - 10, y + 4);
    }

    // Draw X-axis labels (time with seconds)
    ctx.textAlign = 'center';
    const numLabels = Math.min(6, filteredTickers.length);
    for (let i = 0; i < numLabels; i++) {
      const index = Math.floor((i / (numLabels - 1)) * (filteredTickers.length - 1));
      const ticker = filteredTickers[index];
      const x = getX(ticker.time);
      const timeLabel = new Date(ticker.time).toTimeString().substring(0, 8); // HH:MM:SS
      ctx.fillText(timeLabel, x, height - margin.bottom + 20);
    }

    // Draw P/L info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    const plColor = trade.profitLoss >= 0 ? '#00ff00' : '#ff0000';
    ctx.fillText('P/L: ', margin.left + 10, margin.top - 10);
    ctx.fillStyle = plColor;
    ctx.fillText(`₹${trade.profitLoss.toFixed(2)} (${trade.profitLossPercent.toFixed(2)}%)`,
                 margin.left + 45, margin.top - 10);

    // Draw crosshair and info
    if (mousePos && mousePos.x >= margin.left && mousePos.x <= width - margin.right &&
        mousePos.y >= margin.top && mousePos.y <= height - margin.bottom) {

      // Find closest ticker to mouse X
      let closestTicker = filteredTickers[0];
      let minDistance = Math.abs(getX(filteredTickers[0].time) - mousePos.x);

      filteredTickers.forEach(ticker => {
        const tickerX = getX(ticker.time);
        const distance = Math.abs(tickerX - mousePos.x);
        if (distance < minDistance) {
          minDistance = distance;
          closestTicker = ticker;
        }
      });

      const tickerX = getX(closestTicker.time);
      const tickerY = getY(closestTicker.price);

      // Draw crosshair lines
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(tickerX, margin.top);
      ctx.lineTo(tickerX, height - margin.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(margin.left, tickerY);
      ctx.lineTo(width - margin.right, tickerY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Highlight the ticker point
      ctx.fillStyle = '#00aaff';
      ctx.beginPath();
      ctx.arc(tickerX, tickerY, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw time label (with seconds!)
      const timeStr = new Date(closestTicker.time).toTimeString().substring(0, 8);
      ctx.fillStyle = '#000000';
      ctx.fillRect(tickerX - 45, margin.top - 25, 90, 20);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(tickerX - 45, margin.top - 25, 90, 20);
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, tickerX, margin.top - 10);

      // Draw price label
      const priceStr = `₹${closestTicker.price.toFixed(2)}`;
      const priceWidth = ctx.measureText(priceStr).width + 16;
      const priceX = width - margin.right + 5;
      const priceY = tickerY - 12;

      ctx.fillStyle = '#000000';
      ctx.fillRect(priceX, priceY, priceWidth, 24);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(priceX, priceY, priceWidth, 24);
      ctx.fillStyle = '#00aaff';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(priceStr, priceX + priceWidth / 2, priceY + 16);
    }

  }, [filteredTickers, candlesticks, trade, dimensions, mousePos, priceRange]);

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
          <p>No ticker data in time range</p>
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
