// frontend/components/Chart.jsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { colors, chartSettings } from './chartConfig';

export default function ChartComponent() {
    const canvasRef = useRef(null);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showCrosshair, setShowCrosshair] = useState(false);

    // Fetch data
    useEffect(() => {
        fetch('http://localhost:8080/api/ohlc')
            .then((res) => res.json())
            .then(setData)
            .catch((err) => {
                console.error('Failed to fetch data:', err);
                setError(err.message);
            });
    }, []);

    // Setup canvas with proper pixel ratio
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        // Get the size of the canvas in CSS pixels
        const rect = canvas.getBoundingClientRect();

        // Set the internal size to CSS size * ratio
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Scale the context to ensure correct drawing operations
        ctx.scale(dpr, dpr);

        // Set CSS size
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
    }, [data]);

    // Draw chart
    const drawChart = useCallback(() => {
        if (!data || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const padding = chartSettings.padding;

        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Calculate visible range
        const candleWidth = (chartWidth / data.candles.length) * zoom;
        const visibleStart = Math.max(0, Math.floor(-offset / candleWidth));
        const visibleEnd = Math.min(data.candles.length, Math.ceil((chartWidth - offset) / candleWidth));
        const visibleCandles = data.candles.slice(visibleStart, visibleEnd);

        if (visibleCandles.length === 0) return;

        // Calculate price range
        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const pricePadding = priceRange * 0.1;

        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        const xScale = (index) => {
            return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
        };

        // Draw grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Vertical grid lines and X-axis labels
        const xInterval = Math.ceil(visibleCandles.length / chartSettings.gridLines.vertical);
        ctx.fillStyle = colors.text.secondary;
        ctx.font = chartSettings.fonts.labels;
        ctx.textAlign = 'center';

        for (let i = 0; i < visibleCandles.length; i += xInterval) {
            const x = xScale(visibleStart + i);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            // X-axis label
            const candle = visibleCandles[i];
            if (candle) {
                const date = new Date(candle.time);
                const label = format(date, 'MMM dd');
                ctx.fillText(label, x, height - padding.bottom + 20);
            }
        }

        // Horizontal grid lines and Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= chartSettings.gridLines.horizontal; i++) {
            const price = minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / chartSettings.gridLines.horizontal;
            const y = yScale(price);

            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y-axis label
            ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
        }

        ctx.setLineDash([]);

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
                x - candleWidth * chartSettings.candleBodyWidthRatio / 2,
                bodyTop,
                candleWidth * chartSettings.candleBodyWidthRatio,
                bodyHeight
            );
        });

        // Prepare extrema points
        const maximaPoints = [];
        const minimaPoints = [];

        data.maxima.forEach(point => {
            const index = data.candles.findIndex(c => c.time === point.time);
            if (index >= visibleStart && index < visibleEnd) {
                maximaPoints.push({ x: xScale(index), y: yScale(point.high), index });
            }
        });

        data.minima.forEach(point => {
            const index = data.candles.findIndex(c => c.time === point.time);
            if (index >= visibleStart && index < visibleEnd) {
                minimaPoints.push({ x: xScale(index), y: yScale(point.low), index });
            }
        });

        // Draw maxima line
        if (maximaPoints.length > 1) {
            ctx.strokeStyle = colors.lines.maxima;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(maximaPoints[0].x, maximaPoints[0].y);
            maximaPoints.slice(1).forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }

        // Draw minima line
        if (minimaPoints.length > 1) {
            ctx.strokeStyle = colors.lines.minima;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(minimaPoints[0].x, minimaPoints[0].y);
            minimaPoints.slice(1).forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        }

        // Draw extrema points
        ctx.font = chartSettings.fonts.extremaLabels;
        ctx.textAlign = 'center';

        // Maxima points
        maximaPoints.forEach(point => {
            ctx.fillStyle = colors.text.maxima;
            ctx.beginPath();
            ctx.arc(point.x, point.y, chartSettings.extremaPointRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillText('H', point.x, point.y - 10);
        });

        // Minima points
        minimaPoints.forEach(point => {
            ctx.fillStyle = colors.text.minima;
            ctx.beginPath();
            ctx.arc(point.x, point.y, chartSettings.extremaPointRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillText('L', point.x, point.y + 20);
        });

        // Draw crosshair
        if (showCrosshair && mousePos.x > padding.left && mousePos.x < width - padding.right &&
            mousePos.y > padding.top && mousePos.y < height - padding.bottom) {

            ctx.strokeStyle = colors.lines.crosshair;
            ctx.lineWidth = chartSettings.crosshairLineWidth;
            ctx.setLineDash([5, 5]);

            // Vertical line
            ctx.beginPath();
            ctx.moveTo(mousePos.x, padding.top);
            ctx.lineTo(mousePos.x, height - padding.bottom);
            ctx.stroke();

            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(padding.left, mousePos.y);
            ctx.lineTo(width - padding.right, mousePos.y);
            ctx.stroke();

            ctx.setLineDash([]);

            // Calculate values at crosshair
            const price = maxPrice + pricePadding - ((mousePos.y - padding.top) / chartHeight) * (priceRange + 2 * pricePadding);
            const candleIndex = Math.floor((mousePos.x - padding.left) / candleWidth) + visibleStart;

            // Price label
            ctx.fillStyle = colors.panelBackground;
            ctx.fillRect(width - padding.right + 5, mousePos.y - 10, 70, 20);
            ctx.fillStyle = colors.text.primary;
            ctx.font = chartSettings.fonts.labels;
            ctx.textAlign = 'left';
            ctx.fillText(price.toFixed(2), width - padding.right + 10, mousePos.y + 4);

            // Date label
            if (candleIndex >= 0 && candleIndex < data.candles.length) {
                const candle = data.candles[candleIndex];
                const date = format(new Date(candle.time), 'MMM dd HH:mm');

                ctx.fillStyle = colors.panelBackground;
                ctx.fillRect(mousePos.x - 50, height - padding.bottom + 5, 100, 20);
                ctx.fillStyle = colors.text.primary;
                ctx.textAlign = 'center';
                ctx.fillText(date, mousePos.x, height - padding.bottom + 20);

                // Candle info tooltip
                ctx.fillStyle = colors.tooltip.background;
                ctx.fillRect(mousePos.x + 10, mousePos.y - 60, 180, 100);
                ctx.strokeStyle = colors.tooltip.border;
                ctx.strokeRect(mousePos.x + 10, mousePos.y - 60, 180, 100);

                ctx.fillStyle = colors.text.primary;
                ctx.font = chartSettings.fonts.tooltip;
                ctx.textAlign = 'left';
                ctx.fillText(`O: ${candle.open.toFixed(2)}`, mousePos.x + 20, mousePos.y - 40);
                ctx.fillText(`H: ${candle.high.toFixed(2)}`, mousePos.x + 20, mousePos.y - 20);
                ctx.fillText(`L: ${candle.low.toFixed(2)}`, mousePos.x + 20, mousePos.y);
                ctx.fillText(`C: ${candle.close.toFixed(2)}`, mousePos.x + 20, mousePos.y + 20);
                ctx.fillStyle = colors.text.secondary;
                ctx.fillText(`Vol: ${candle.volume.toLocaleString()}`, mousePos.x + 20, mousePos.y + 40);
            }
        }
    }, [data, zoom, offset, mousePos, showCrosshair]);

    // Draw on changes
    useEffect(() => {
        drawChart();
    }, [drawChart]);

    // Handle mouse events
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const centerRatio = (x - chartSettings.padding.left) / (rect.width - chartSettings.padding.left - chartSettings.padding.right);

            const zoomSpeed = 0.1;
            const newZoom = e.deltaY < 0 ? zoom * (1 + zoomSpeed) : zoom * (1 - zoomSpeed);
            const clampedZoom = Math.max(0.5, Math.min(10, newZoom));

            // Adjust offset to zoom around mouse position
            const oldWidth = (rect.width - chartSettings.padding.left - chartSettings.padding.right) / zoom;
            const newWidth = (rect.width - chartSettings.padding.left - chartSettings.padding.right) / clampedZoom;
            const widthDiff = newWidth - oldWidth;

            setZoom(clampedZoom);
            setOffset(prev => prev - widthDiff * centerRatio * (data.candles.length / oldWidth));
        };

        const handleMouseDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x > chartSettings.padding.left && x < rect.width - chartSettings.padding.right &&
                y > chartSettings.padding.top && y < rect.height - chartSettings.padding.bottom) {
                setIsDragging(true);
                setDragStart({ x: e.clientX, offset: offset });
                canvas.style.cursor = 'grabbing';
            }
        };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            setMousePos({ x, y });

            if (isDragging && dragStart) {
                const dx = e.clientX - dragStart.x;
                const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
                const candleWidth = (chartWidth / data.candles.length) * zoom;
                const newOffset = dragStart.offset + dx;

                const maxOffset = 0;
                const minOffset = -(data.candles.length * candleWidth - chartWidth);

                setOffset(Math.max(minOffset, Math.min(maxOffset, newOffset)));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            canvas.style.cursor = 'crosshair';
        };

        const handleMouseEnter = () => {
            setShowCrosshair(true);
            canvas.style.cursor = 'crosshair';
        };

        const handleMouseLeave = () => {
            setShowCrosshair(false);
            setIsDragging(false);
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseenter', handleMouseEnter);
        canvas.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseenter', handleMouseEnter);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [data, zoom, offset, isDragging, dragStart]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400">
                Error: {error}
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    Loading chart data...
                </div>
            </div>
        );
    }

    const handleReset = () => {
        setZoom(1);
        setOffset(0);
    };

    return (
        <div className="w-full h-screen bg-gray-900 p-4">
            <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">NIFTY 50</h1>
                        <div className="flex gap-4 mt-2">
                            <span className="text-green-400 text-sm">Maxima: {data.maxima.length}</span>
                            <span className="text-red-400 text-sm">Minima: {data.minima.length}</span>
                            <span className="text-gray-400 text-sm">Total: {data.candles.length} candles</span>
                            <span className="text-blue-400 text-sm">Zoom: {(zoom * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="text-gray-400 text-sm">🖱️ Scroll to zoom | Drag to pan</span>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                            Reset View
                        </button>
                    </div>
                </div>
                <div className="flex-1">
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full rounded"
                        style={{
                            cursor: 'crosshair',
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
