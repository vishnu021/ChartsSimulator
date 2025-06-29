// frontend/components/TickerChart.jsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';

export default function TickerChart({ data, theme = 'dark', symbol }) {
    const canvasRef = useRef(null);
    const [candleData, setCandleData] = useState([]);
    const [priceData, setPriceData] = useState([]);
    const [stats, setStats] = useState({
        currentPrice: 0,
        change: 0,
        volume: 0,
        high: 0,
        low: 0
    });
    const [isMobile, setIsMobile] = useState(false);

    const colors = themes[theme];

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Setup canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateCanvasSize = () => {
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [data]);

    // Process ticker data into candles and price line
    useEffect(() => {
        if (!data || data.length === 0) return;

        // Group tickers by minute to create candles
        const tickersByMinute = new Map();
        data.forEach(tick => {
            const tickTime = new Date(tick.time);
            const minuteKey = new Date(tickTime.getFullYear(), tickTime.getMonth(), tickTime.getDate(),
                tickTime.getHours(), tickTime.getMinutes()).getTime();

            if (!tickersByMinute.has(minuteKey)) {
                tickersByMinute.set(minuteKey, []);
            }
            tickersByMinute.get(minuteKey).push(tick);
        });

        // Create candles from grouped tickers
        const candles = [];
        Array.from(tickersByMinute.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([minuteKey, ticks]) => {
                if (ticks.length === 0) return;

                const prices = ticks.map(t => t.price);
                const volumes = ticks.map(t => t.volume);

                candles.push({
                    time: new Date(minuteKey).toISOString(),
                    open: prices[0],
                    high: Math.max(...prices),
                    low: Math.min(...prices),
                    close: prices[prices.length - 1],
                    volume: volumes.reduce((sum, v) => sum + v, 0)
                });
            });

        setCandleData(candles);

        // Create price line data (every tick)
        const prices = data.map(tick => ({
            time: tick.time,
            price: tick.price
        }));
        setPriceData(prices);

        // Calculate stats
        const allPrices = data.map(t => t.price);
        const totalVolume = data.reduce((sum, t) => sum + t.volume, 0);
        const currentPrice = allPrices[allPrices.length - 1] || 0;
        const startPrice = allPrices[0] || 0;

        setStats({
            currentPrice,
            change: currentPrice - startPrice,
            volume: totalVolume,
            high: Math.max(...allPrices),
            low: Math.min(...allPrices)
        });

    }, [data]);

    // Draw chart
    const drawChart = useCallback(() => {
        if (!candleData.length || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const padding = isMobile ? chartSettings.mobilePadding : chartSettings.padding;

        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        // Draw panel background
        ctx.fillStyle = colors.panelBackground;
        ctx.fillRect(
            padding.left - 10,
            padding.top - 10,
            width - padding.left - padding.right + 20,
            height - padding.top - padding.bottom + 20
        );

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate price range
        const allPrices = [
            ...candleData.flatMap(c => [c.high, c.low]),
            ...priceData.map(p => p.price)
        ];
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const priceRange = maxPrice - minPrice;
        const pricePadding = Math.max(priceRange * 0.1, 1);

        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        const candleWidth = chartWidth / candleData.length;
        const xScaleCandle = (index) => {
            return padding.left + index * candleWidth + candleWidth / 2;
        };

        const xScaleTicker = (tickerIndex) => {
            return padding.left + (tickerIndex / priceData.length) * chartWidth;
        };

        // Draw grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Horizontal grid lines
        const horizontalLines = isMobile ? 4 : 6;
        for (let i = 0; i <= horizontalLines; i++) {
            const price = minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
            const y = yScale(price);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        ctx.setLineDash([]);

        // Draw candlesticks (semi-transparent)
        candleData.forEach((candle, i) => {
            const x = xScaleCandle(i);
            const isGreen = candle.close >= candle.open;
            const color = isGreen ? '#10b98160' : '#ef444460'; // Semi-transparent

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
                x - candleWidth * 0.8 / 2,
                bodyTop,
                candleWidth * 0.8,
                bodyHeight
            );
        });

        // Draw price line
        if (priceData.length > 1) {
            ctx.strokeStyle = colors.lines.maxima; // Use a bright color for price line
            ctx.lineWidth = 2;
            ctx.beginPath();

            priceData.forEach((point, i) => {
                const x = xScaleTicker(i);
                const y = yScale(point.price);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw price points (sample some points to avoid clutter)
            ctx.fillStyle = colors.lines.maxima;
            const pointInterval = Math.max(1, Math.floor(priceData.length / 50)); // Show max 50 points
            priceData.forEach((point, i) => {
                if (i % pointInterval === 0 || i === priceData.length - 1) {
                    const x = xScaleTicker(i);
                    const y = yScale(point.price);

                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }

        // Draw axes labels
        ctx.fillStyle = colors.text.secondary;
        const labelFontSize = isMobile ? '10px' : '12px';
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= horizontalLines; i++) {
            const price = minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
            const y = yScale(price);
            ctx.fillText(price.toFixed(2), padding.left - 10, y + 4);
        }

        // X-axis labels (time)
        ctx.textAlign = 'center';
        const timeLabels = Math.min(8, candleData.length);
        for (let i = 0; i < timeLabels; i++) {
            const candleIndex = Math.floor((i * candleData.length) / timeLabels);
            if (candleIndex < candleData.length) {
                const candle = candleData[candleIndex];
                const x = xScaleCandle(candleIndex);
                const time = format(new Date(candle.time), 'HH:mm');
                ctx.fillText(time, x, height - padding.bottom + (isMobile ? 15 : 20));
            }
        }

    }, [candleData, priceData, colors, isMobile]);

    useEffect(() => {
        drawChart();
    }, [drawChart]);

    if (!data || data.length === 0) return null;

    return (
        <div className="flex flex-col h-full p-2 md:p-4" style={{ backgroundColor: colors.background }}>
            {/* Chart */}
            <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: colors.panelBackground, minHeight: 200 }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ minHeight: 200 }}
                />
            </div>

            {/* Legend */}
            <div className="flex-shrink-0 flex flex-wrap gap-4 mt-2 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-2 bg-gray-500 opacity-60"></div>
                    <span style={{ color: colors.text.secondary }}>Candlesticks</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5" style={{ backgroundColor: colors.lines.maxima }}></div>
                    <span style={{ color: colors.text.secondary }}>Price Line</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.lines.maxima }}></div>
                    <span style={{ color: colors.text.secondary }}>Tick Points</span>
                </div>
            </div>
        </div>
    );
}
