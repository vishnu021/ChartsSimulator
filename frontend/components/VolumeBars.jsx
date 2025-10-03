'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { themes } from './chartConfig';

export default function VolumeBars({ data, theme = 'dark' }) {
  const canvasRef = useRef(null);
  const colors = themes[theme];

  // Process volume data
  const volumeData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Extract volume from ticker data
    // The ticker data has cumulative volumeTradedToday
    const volumes = data.map((tick, index) => ({
      timestamp: new Date(tick.time).getTime(),
      volume: tick.volumeTradedToday || tick.volume || 0,
      index,
    })).filter(item => !isNaN(item.timestamp));

    return volumes;
  }, [data]);

  // Setup canvas with proper DPI handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Draw volume bars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || volumeData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const padding = { left: 60, right: 20, top: 5, bottom: 5 };

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw panel background
    ctx.fillStyle = colors.panelBackground;
    ctx.fillRect(
      padding.left - 10,
      padding.top - 5,
      width - padding.left - padding.right + 20,
      height - padding.top - padding.bottom + 10
    );

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate max volume for scaling
    const maxVolume = Math.max(...volumeData.map(d => d.volume), 1);

    // Calculate bar width
    const barWidth = Math.max(1, chartWidth / volumeData.length);

    // Draw volume bars
    volumeData.forEach((item, index) => {
      const x = padding.left + (index * chartWidth) / volumeData.length;
      const barHeight = (item.volume / maxVolume) * chartHeight;
      const y = padding.top + chartHeight - barHeight;

      // Use ticker color scheme - blue/cyan for volume
      const volumeColor = colors.ticker?.line || '#3b82f6';
      const volumeAlpha = '80'; // 50% opacity

      ctx.fillStyle = volumeColor + volumeAlpha;
      ctx.fillRect(x, y, barWidth - 1, barHeight);

      // Add subtle border for better visibility
      if (barWidth > 3) {
        ctx.strokeStyle = volumeColor;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, barWidth - 1, barHeight);
      }
    });

    // Draw Y-axis labels (volume)
    ctx.fillStyle = colors.text.secondary;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Show max and half volume labels
    const formatVolume = (vol) => {
      if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
      if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
      return vol.toString();
    };

    ctx.fillText(formatVolume(maxVolume), padding.left - 5, padding.top + 5);
    ctx.fillText(formatVolume(maxVolume / 2), padding.left - 5, padding.top + chartHeight / 2);
    ctx.fillText('0', padding.left - 5, padding.top + chartHeight - 5);

    // Draw title
    ctx.fillStyle = colors.text.primary;
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Volume', 5, height / 2);

    // Draw grid lines
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Horizontal grid lines
    for (let i = 0; i <= 2; i++) {
      const y = padding.top + (i * chartHeight) / 2;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [volumeData, colors, theme]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: colors.panelBackground }}
      >
        <div className="text-center" style={{ color: colors.text.secondary }}>
          <p className="text-xs">No volume data</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      style={{
        height: '100%',
        backgroundColor: colors.panelBackground,
        overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
