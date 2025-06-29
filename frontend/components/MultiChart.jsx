// frontend/components/MultiChart.jsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { themes, chartSettings } from './chartConfig';

export default function MultiChart({ data, theme = 'dark' }) {
    const candleCanvasRef = useRef(null);
    const heikinCanvasRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    const colors = themes[theme];

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const setupCanvas = (canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    };

    useEffect(() => {
        setupCanvas(candleCanvasRef.current);
        setupCanvas(heikinCanvasRef.current);

        const handleResize = () => {
            setupCanvas(candleCanvasRef.current);
            setupCanvas(heikinCanvasRef.current);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [data]);

    const drawCandlesticks = useCallback((canvas, candles, title, isHeikinAshi = false) => {
        if (!canvas || !candles || candles.length === 0) return;

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
        const prices = candles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const pricePadding = Math.max(priceRange * 0.1, 1);

        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        const candleWidth = chartWidth / candles.length;
        const xScale = (index) => {
            return padding.left + index * candleWidth + candleWidth / 2;
        };

        // Draw title
        ctx.fillStyle = colors.text.primary;
        ctx.font = `${isMobile ? '14px' : '16px'} -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(title, padding.left, 25);

        // Draw grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

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

        // Draw candlesticks
        candles.forEach((candle, i) => {
            const x = xScale(i);
            const isGreen = candle.close >= candle.open;
            let color = isGreen ? colors.candle.bullish : colors.candle.bearish;

            // For Heikin Ashi, use different opacity to distinguish
            if (isHeikinAshi) {
                color = isGreen ? '#10b981AA' : '#ef4444AA';
            }

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
                x - candleWidth * chartSettings.candleBodyWidthRatio / 2,
                bodyTop,
                candleWidth * chartSettings.candleBodyWidthRatio,
                bodyHeight
            );
        });

        // Draw Y-axis labels
        ctx.fillStyle = colors.text.secondary;
        ctx.font = `${isMobile ? '10px' : '12px'} -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'right';
        for (let i = 0; i <= horizontalLines; i++) {
            const price = minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
            const y = yScale(price);
            ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
        }

    }, [colors, isMobile]);

    useEffect(() => {
        if (data && data.candlesticks) {
            drawCandlesticks(candleCanvasRef.current, data.candlesticks, 'Candlestick Chart');
        }
        if (data && data.heikinAshi) {
            drawCandlesticks(heikinCanvasRef.current, data.heikinAshi, 'Heikin Ashi Chart', true);
        }
    }, [data, drawCandlesticks]);

    if (!data) return null;

    return (
        <div className="flex-1 flex flex-col p-2 md:p-4" style={{ backgroundColor: colors.background }}>
            <div className="mb-4">
                <h2 className={`text-xl md:text-2xl font-bold`} style={{ color: colors.text.primary }}>
                    {data.symbol || 'Multi-Chart Analysis'}
                </h2>
                <div className="flex flex-wrap gap-4 mt-2 text-xs md:text-sm">
                    <span style={{ color: colors.text.secondary }}>
                        Candlesticks: {data.candlesticks?.length || 0}
                    </span>
                    <span style={{ color: colors.text.secondary }}>
                        Heikin Ashi: {data.heikinAshi?.length || 0}
                    </span>
                </div>
            </div>

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 flex-1`}>
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.panelBackground, minHeight: 250 }}>
                    <canvas
                        ref={candleCanvasRef}
                        className="w-full h-full"
                        style={{ minHeight: 250 }}
                    />
                </div>
                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: colors.panelBackground, minHeight: 250 }}>
                    <canvas
                        ref={heikinCanvasRef}
                        className="w-full h-full"
                        style={{ minHeight: 250 }}
                    />
                </div>
            </div>
        </div>
    );
}
