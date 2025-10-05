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

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || filteredTickers.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate price range
    const prices = filteredTickers.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Margins
    const marginTop = 30;
    const marginBottom = 50;
    const marginLeft = 80;
    const marginRight = 30;
    const chartWidth = width - marginLeft - marginRight;
    const chartHeight = height - marginTop - marginBottom;

    // Helper functions
    const getX = (index) => marginLeft + (index / (filteredTickers.length - 1)) * chartWidth;
    const getY = (price) => marginTop + ((maxPrice - price) / priceRange) * chartHeight;

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

    // Draw price line
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    filteredTickers.forEach((ticker, i) => {
      const x = getX(i);
      const y = getY(ticker.price);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Find indices for entry and exit times
    const entryTime = parseTime(trade.entryTime);
    const exitTime = parseTime(trade.exitTime);

    let entryIndex = -1;
    let exitIndex = -1;

    filteredTickers.forEach((ticker, i) => {
      const tickerTime = parseTime(ticker.time);
      if (entryIndex === -1 && tickerTime >= entryTime) entryIndex = i;
      if (exitIndex === -1 && tickerTime >= exitTime) exitIndex = i;
    });

    // Draw entry marker (green)
    if (entryIndex >= 0) {
      const x = getX(entryIndex);
      const y = getY(filteredTickers[entryIndex].price);

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, height - marginBottom);
      ctx.stroke();

      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('ENTRY', x + 5, marginTop + 15);
    }

    // Draw exit marker (red)
    if (exitIndex >= 0) {
      const x = getX(exitIndex);
      const y = getY(filteredTickers[exitIndex].price);

      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, marginTop);
      ctx.lineTo(x, height - marginBottom);
      ctx.stroke();

      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();

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
    const numLabels = Math.min(5, filteredTickers.length);
    for (let i = 0; i < numLabels; i++) {
      const index = Math.floor((i / (numLabels - 1)) * (filteredTickers.length - 1));
      const ticker = filteredTickers[index];
      const x = getX(index);
      const timeLabel = ticker.time.substring(11, 19); // HH:MM:SS
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

  }, [filteredTickers, trade, dimensions, timeWindowMinutes]);

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
        className="w-full h-full"
      />
    </div>
  );
}
