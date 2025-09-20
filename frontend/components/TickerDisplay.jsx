'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { themes } from './chartConfig';

export default function TickerDisplay({ data, theme = 'dark', symbol }) {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [volume, setVolume] = useState(0);
  const [tickCount, setTickCount] = useState(0);
  const [lastTicks, setLastTicks] = useState([]);

  const colors = themes[theme];

  useEffect(() => {
    if (data && data.length > 0) {
      const latestTick = data[data.length - 1];
      const firstTick = data[0];

      setCurrentPrice(latestTick.price);
      setPriceChange(latestTick.price - firstTick.price);
      setVolume(data.reduce((sum, tick) => sum + tick.volume, 0));
      setTickCount(data.length);
      setLastTicks(data.slice(-10)); // Last 10 ticks
    }
  }, [data]);

  const formatTime = timeString => {
    try {
      return format(new Date(timeString), 'HH:mm:ss');
    } catch {
      return timeString;
    }
  };

  const getTickTypeColor = type => {
    switch (type) {
    case 'BUY':
      return '#10b981';
    case 'SELL':
      return '#ef4444';
    default:
      return colors.text.secondary;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4" style={{ backgroundColor: colors.background }}>
      {/* Recent Ticks Table */}
      <div className="bg-gray-800 rounded-lg p-4 flex-1">
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text.primary }}>
          Recent Ticks
        </h3>

        <div className="overflow-hidden">
          <div className="grid grid-cols-4 gap-4 p-2 bg-gray-700 rounded text-sm font-medium">
            <div style={{ color: colors.text.secondary }}>Time</div>
            <div style={{ color: colors.text.secondary }}>Price</div>
            <div style={{ color: colors.text.secondary }}>Volume</div>
            <div style={{ color: colors.text.secondary }}>Type</div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {lastTicks.reverse().map((tick, index) => (
              <div
                key={index}
                className="grid grid-cols-4 gap-4 p-2 text-sm border-b border-gray-700 hover:bg-gray-750"
              >
                <div style={{ color: colors.text.secondary }}>{formatTime(tick.time)}</div>
                <div style={{ color: colors.text.primary }}>₹{tick.price.toFixed(2)}</div>
                <div style={{ color: colors.text.secondary }}>{tick.volume.toLocaleString()}</div>
                <div style={{ color: getTickTypeColor(tick.type) }}>{tick.type}</div>
              </div>
            ))}
          </div>
        </div>

        {data.length === 0 && (
          <div className="text-center py-8">
            <div style={{ color: colors.text.secondary }}>No ticker data available</div>
          </div>
        )}
      </div>
    </div>
  );
}
