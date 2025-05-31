'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';

export default function Chart({ data, theme = 'dark' }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [viewState, setViewState] = useState({
        zoom: 1,
        offset: 0,
        targetOffset: 0,
        velocity: 0
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showCrosshair, setShowCrosshair] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const colors = themes[theme];

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Setup canvas with proper pixel ratio
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

    // Smooth animation loop
    useEffect(() => {
        const animate = () => {
            setViewState(prev => {
                const friction = 0.9;
                const springStrength = 0.1;

                if (!isDragging) {
                    // Apply spring physics to smooth offset
                    const offsetDiff = prev.targetOffset - prev.offset;
                    prev.velocity = prev.velocity * friction + offsetDiff * springStrength;
                    prev.offset += prev.velocity;

                    // Stop animation when close enough
                    if (Math.abs(prev.velocity) < 0.1 && Math.abs(offsetDiff) < 0.1) {
                        prev.offset = prev.targetOffset;
                        prev.velocity = 0;
                    }
                } else {
                    prev.offset = prev.targetOffset;
                    prev.velocity = 0;
                }

                return { ...prev };
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isDragging]);

    // Helper function to find 30-minute intervals
    const getThirtyMinuteIntervals = (candles, visibleStart, visibleEnd) => {
        const intervals = [];
        const startTime = new Date(candles[visibleStart]?.time);

        if (!startTime || isNaN(startTime.getTime())) return intervals;

        // Round down to nearest 30-minute mark
        const roundedStart = new Date(startTime);
        const minutes = roundedStart.getMinutes();
        roundedStart.setMinutes(minutes < 30 ? 0 : 30, 0, 0);

        for (let i = visibleStart; i < visibleEnd; i++) {
            const candleTime = new Date(candles[i].time);
            if (isNaN(candleTime.getTime())) continue;

            const candleMinutes = candleTime.getMinutes();
            // Show labels at 00 and 30 minute marks
            if (candleMinutes === 0 || candleMinutes === 30) {
                // Avoid too many labels on mobile
                if (isMobile) {
                    // On mobile, show every hour instead
                    if (candleMinutes === 0) {
                        intervals.push({ index: i, time: candleTime });
                    }
                } else {
                    intervals.push({ index: i, time: candleTime });
                }
            }
        }

        return intervals;
    };

    // Draw chart
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

        // Calculate visible range with proper bounds
        const candleWidth = (chartWidth / data.candles.length) * viewState.zoom;
        const maxOffset = 0;
        const minOffset = Math.min(0, -(data.candles.length * candleWidth - chartWidth));
        const clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

        const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
        const visibleEnd = Math.min(data.candles.length, Math.ceil((chartWidth - clampedOffset) / candleWidth));
        const visibleCandles = data.candles.slice(visibleStart, visibleEnd);

        if (visibleCandles.length === 0) return;

        // Calculate price range with padding
        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const minPricePadding = 1;
        const pricePadding = Math.max(priceRange * 0.1, minPricePadding);

        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        const xScale = (index) => {
            return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
        };

        // Set clipping region for chart area
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
        ctx.clip();

        // Draw grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Get 30-minute intervals for vertical grid lines
        const timeIntervals = getThirtyMinuteIntervals(data.candles, visibleStart, visibleEnd);

        // Vertical grid lines at time intervals
        timeIntervals.forEach(interval => {
            const x = xScale(interval.index);
            if (x >= padding.left && x <= width - padding.right) {
                ctx.beginPath();
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, height - padding.bottom);
                ctx.stroke();
            }
        });

        // Horizontal grid lines
        const horizontalLines = isMobile ? 4 : chartSettings.gridLines.horizontal;
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

        // Collect all extrema points
        const allMaximaPoints = data.maxima.map(point => {
            const index = data.candles.findIndex(c => c.time === point.time);
            return {
                x: padding.left + index * candleWidth + clampedOffset + candleWidth / 2,
                y: yScale(point.high),
                index,
                visible: index >= visibleStart && index < visibleEnd
            };
        });

        const allMinimaPoints = data.minima.map(point => {
            const index = data.candles.findIndex(c => c.time === point.time);
            return {
                x: padding.left + index * candleWidth + clampedOffset + candleWidth / 2,
                y: yScale(point.low),
                index,
                visible: index >= visibleStart && index < visibleEnd
            };
        });

        // Draw extrema lines
        if (allMaximaPoints.length > 1) {
            ctx.strokeStyle = colors.lines.maxima;
            ctx.lineWidth = chartSettings.extremaLineWidth;
            ctx.beginPath();

            let started = false;
            allMaximaPoints.forEach(point => {
                if (!started) {
                    ctx.moveTo(point.x, point.y);
                    started = true;
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        }

        if (allMinimaPoints.length > 1) {
            ctx.strokeStyle = colors.lines.minima;
            ctx.lineWidth = chartSettings.extremaLineWidth;
            ctx.beginPath();

            let started = false;
            allMinimaPoints.forEach(point => {
                if (!started) {
                    ctx.moveTo(point.x, point.y);
                    started = true;
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        }

        // Draw extrema points (only visible ones)
        const fontSize = isMobile ? '9px' : '11px';
        ctx.font = `${fontSize} -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';

        allMaximaPoints.filter(p => p.visible).forEach(point => {
            ctx.fillStyle = colors.text.maxima;
            ctx.beginPath();
            ctx.arc(point.x, point.y, chartSettings.extremaPointRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillText('H', point.x, point.y - 12);
        });

        allMinimaPoints.filter(p => p.visible).forEach(point => {
            ctx.fillStyle = colors.text.minima;
            ctx.beginPath();
            ctx.arc(point.x, point.y, chartSettings.extremaPointRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillText('L', point.x, point.y + 24);
        });

        ctx.restore(); // Remove clipping

        // Draw axes labels outside clipping region
        ctx.fillStyle = colors.text.secondary;
        const labelFontSize = isMobile ? '10px' : '12px';
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

        // X-axis labels - show only time at 30-minute intervals
        ctx.textAlign = 'center';
        timeIntervals.forEach(interval => {
            const x = xScale(interval.index);
            if (x >= padding.left && x <= width - padding.right) {
                // Format time only (HH:mm)
                const timeString = format(interval.time, 'HH:mm');
                ctx.fillText(timeString, x, height - padding.bottom + (isMobile ? 15 : 20));
            }
        });

        // Y-axis labels
        ctx.textAlign = 'right';
        for (let i = 0; i <= horizontalLines; i++) {
            const price = minPrice - pricePadding + (i * (priceRange + 2 * pricePadding)) / horizontalLines;
            const y = yScale(price);
            ctx.fillText(price.toFixed(0), padding.left - 10, y + 4);
        }

        // Draw crosshair (only on non-mobile devices)
        if (!isMobile && showCrosshair && mousePos.x > padding.left && mousePos.x < width - padding.right &&
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
            const candleIndex = Math.floor((mousePos.x - padding.left - clampedOffset) / candleWidth);

            // Price label
            ctx.fillStyle = colors.tooltip.background;
            ctx.fillRect(width - padding.right + 5, mousePos.y - 10, 75, 20);
            ctx.strokeStyle = colors.tooltip.border;
            ctx.strokeRect(width - padding.right + 5, mousePos.y - 10, 75, 20);
            ctx.fillStyle = colors.text.primary;
            ctx.font = chartSettings.fonts.labels;
            ctx.textAlign = 'left';
            ctx.fillText(price.toFixed(2), width - padding.right + 10, mousePos.y + 4);

            // Date label and candle info
            if (candleIndex >= 0 && candleIndex < data.candles.length) {
                const candle = data.candles[candleIndex];
                const time = format(new Date(candle.time), 'HH:mm');

                // Time label
                ctx.fillStyle = colors.tooltip.background;
                ctx.fillRect(mousePos.x - 30, height - padding.bottom + 5, 60, 20);
                ctx.strokeRect(mousePos.x - 30, height - padding.bottom + 5, 60, 20);
                ctx.fillStyle = colors.text.primary;
                ctx.textAlign = 'center';
                ctx.fillText(time, mousePos.x, height - padding.bottom + 20);

                // OHLC tooltip
                const tooltipX = mousePos.x + 15;
                const tooltipY = mousePos.y - 70;

                ctx.fillStyle = colors.tooltip.background;
                ctx.fillRect(tooltipX, tooltipY, 180, 110);
                ctx.strokeStyle = colors.tooltip.border;
                ctx.lineWidth = 1;
                ctx.strokeRect(tooltipX, tooltipY, 180, 110);

                ctx.fillStyle = colors.text.primary;
                ctx.font = chartSettings.fonts.tooltip;
                ctx.textAlign = 'left';

                const texts = [
                    { label: 'O:', value: candle.open.toFixed(2), color: colors.text.primary },
                    { label: 'H:', value: candle.high.toFixed(2), color: colors.text.maxima },
                    { label: 'L:', value: candle.low.toFixed(2), color: colors.text.minima },
                    { label: 'C:', value: candle.close.toFixed(2), color: candle.close >= candle.open ? colors.text.maxima : colors.text.minima },
                    { label: 'Vol:', value: candle.volume.toLocaleString(), color: colors.text.secondary }
                ];

                texts.forEach((text, i) => {
                    ctx.fillStyle = colors.text.secondary;
                    ctx.fillText(text.label, tooltipX + 10, tooltipY + 25 + i * 20);
                    ctx.fillStyle = text.color;
                    ctx.fillText(text.value, tooltipX + 40, tooltipY + 25 + i * 20);
                });
            }
        }
    }, [data, viewState, mousePos, showCrosshair, colors, isMobile]);

    // Draw on every frame
    useEffect(() => {
        drawChart();
    }, [drawChart, viewState]);

    // Handle mouse events (disabled on mobile)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || isMobile) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
            const centerRatio = (x - chartSettings.padding.left) / chartWidth;

            const zoomSpeed = 0.002;
            const zoomDelta = -e.deltaY * zoomSpeed;
            const newZoom = Math.max(0.5, Math.min(20, viewState.zoom + zoomDelta * viewState.zoom));

            // Calculate new offset to zoom around mouse position
            const oldCandleWidth = chartWidth / data.candles.length * viewState.zoom;
            const newCandleWidth = chartWidth / data.candles.length * newZoom;
            const candlesWidthDiff = (newCandleWidth - oldCandleWidth) * data.candles.length;

            setViewState(prev => ({
                ...prev,
                zoom: newZoom,
                targetOffset: prev.targetOffset - candlesWidthDiff * centerRatio,
                offset: prev.offset - candlesWidthDiff * centerRatio
            }));
        };

        const handleMouseDown = (e) => {
            const rect = canvas.getBoundingClientRect();
            setIsDragging(true);
            setDragStart({ x: e.clientX, offset: viewState.targetOffset });
            canvas.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                setViewState(prev => ({
                    ...prev,
                    targetOffset: dragStart.offset + dx
                }));
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
    }, [data, viewState, isDragging, dragStart, isMobile]);

    const handleReset = () => {
        setViewState({
            zoom: 1,
            offset: 0,
            targetOffset: 0,
            velocity: 0
        });
    };

    if (!data) return null;

    return (
        <div className="flex-1 flex flex-col p-2 md:p-4" style={{ backgroundColor: colors.background, minHeight: 0 }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 md:mb-4 gap-2">
                <div>
                    <h1 className={`text-xl md:text-2xl font-bold`} style={{ color: colors.text.primary }}>
                        {data.symbol || 'Chart'}
                    </h1>
                    <div className="flex flex-wrap gap-2 md:gap-4 mt-1 md:mt-2 text-xs md:text-sm">
                        <span style={{ color: colors.text.maxima }}>
                            Maxima: {data.maxima?.length || 0}
                        </span>
                        <span style={{ color: colors.text.minima }}>
                            Minima: {data.minima?.length || 0}
                        </span>
                        <span style={{ color: colors.text.secondary }}>
                            Total: {data.candles?.length || 0} candles
                        </span>
                        {!isMobile && (
                            <span style={{ color: colors.text.secondary }}>
                                Zoom: {(viewState.zoom * 100).toFixed(0)}%
                            </span>
                        )}
                    </div>
                </div>
                {!isMobile && (
                    <button
                        onClick={handleReset}
                        className="px-3 py-1 md:px-4 md:py-2 rounded-md transition-all text-sm"
                        style={{
                            backgroundColor: colors.panelBackground,
                            border: `1px solid ${colors.grid}`,
                            color: colors.text.primary
                        }}
                    >
                        Reset View
                    </button>
                )}
            </div>
            <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: colors.panelBackground, minHeight: 300 }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ cursor: isMobile ? 'default' : 'crosshair', minHeight: 300 }}
                />
            </div>
        </div>
    );
}
