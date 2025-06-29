// frontend/components/CandleChart.jsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';

export default function CandleChart({ data, theme = 'dark' }) {
    const canvasRef = useRef(null);
    const [viewState, setViewState] = useState({ zoom: 1, offset: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showCrosshair, setShowCrosshair] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const colors = themes[theme];

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Canvas setup
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

    // Draw chart function
    const drawChart = useCallback(() => {
        if (!data || !canvasRef.current) return;

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

        if (!data.candles || data.candles.length === 0) return;

        // Calculate visible range
        const candleWidth = (chartWidth / data.candles.length) * viewState.zoom;
        const visibleCandles = data.candles;

        // Calculate price range
        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const pricePadding = Math.max(priceRange * 0.1, 1);

        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        const xScale = (index) => {
            return padding.left + index * candleWidth + candleWidth / 2;
        };

        // Draw grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Horizontal grid lines
        const horizontalLines = isMobile ? 4 : 8;
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
        visibleCandles.forEach((candle, i) => {
            const x = xScale(i);
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
                x - candleWidth * chartSettings.candleBodyWidthRatio / 2,
                bodyTop,
                candleWidth * chartSettings.candleBodyWidthRatio,
                bodyHeight
            );
        });

        // Draw axes labels
        ctx.fillStyle = colors.text.secondary;
        const labelFontSize = isMobile ? '10px' : '12px';
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= horizontalLines; i++) {
            const price = minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
            const y = yScale(price);
            ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
        }

    }, [data, viewState, colors, isMobile]);

    useEffect(() => {
        drawChart();
    }, [drawChart]);

    if (!data) return null;

    return (
        <div className="flex-1 flex flex-col p-2 md:p-4" style={{ backgroundColor: colors.background, minHeight: 0 }}>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: colors.panelBackground, minHeight: 300 }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ minHeight: 300 }}
                />
            </div>
        </div>
    );
}
