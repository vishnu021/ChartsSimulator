'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';

export default function TickerChart({ data, theme = 'dark', symbol, stats, isRealTime }) {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);
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
    const colors = themes[theme];

    // Check for mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Process data for rendering with proper time alignment
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return { candleData: [], priceData: [], timeRange: { start: 0, end: 0 } };

        // Get time range from all data
        const allTimes = data.map(tick => new Date(tick.time).getTime()).filter(t => !isNaN(t));
        if (allTimes.length === 0) return { candleData: [], priceData: [], timeRange: { start: 0, end: 0 } };

        const timeRange = {
            start: Math.min(...allTimes),
            end: Math.max(...allTimes)
        };

        // Group tickers into 1-minute candles
        const tickersByMinute = new Map();
        data.forEach(tick => {
            try {
                const tickTime = new Date(tick.time);
                if (isNaN(tickTime.getTime())) return;

                const minuteKey = new Date(
                    tickTime.getFullYear(),
                    tickTime.getMonth(),
                    tickTime.getDate(),
                    tickTime.getHours(),
                    tickTime.getMinutes()
                ).getTime();

                if (!tickersByMinute.has(minuteKey)) {
                    tickersByMinute.set(minuteKey, []);
                }
                tickersByMinute.get(minuteKey).push(tick);
            } catch (error) {
                // Skip invalid ticks
            }
        });

        // Create candles from grouped data with timestamps
        const candleData = [];
        Array.from(tickersByMinute.entries())
            .sort(([a], [b]) => a - b)
            .forEach(([minuteKey, ticks]) => {
                if (ticks.length === 0) return;

                const prices = ticks.map(t => t.price).filter(p => !isNaN(p));
                const volumes = ticks.map(t => t.volume).filter(v => !isNaN(v));

                if (prices.length === 0) return;

                candleData.push({
                    time: new Date(minuteKey).toISOString(),
                    timestamp: minuteKey,
                    open: prices[0],
                    high: Math.max(...prices),
                    low: Math.min(...prices),
                    close: prices[prices.length - 1],
                    volume: volumes.reduce((sum, v) => sum + v, 0)
                });
            });

        // Sample price data for line chart (max 2000 points for performance)
        let priceData;
        const maxPoints = 2000;
        if (data.length > maxPoints) {
            const step = Math.floor(data.length / maxPoints);
            priceData = data.filter((_, index) => index % step === 0 || index === data.length - 1)
                .filter(tick => tick && tick.time && typeof tick.price === 'number' && !isNaN(tick.price))
                .map(tick => ({
                    time: tick.time,
                    timestamp: new Date(tick.time).getTime(),
                    price: tick.price
                }));
        } else {
            priceData = data.filter(tick => tick && tick.time && typeof tick.price === 'number' && !isNaN(tick.price))
                .map(tick => ({
                    time: tick.time,
                    timestamp: new Date(tick.time).getTime(),
                    price: tick.price
                }));
        }

        return { candleData, priceData, timeRange };
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

    // Smooth animation loop - same as other components
    useEffect(() => {
        const animate = () => {
            setViewState(prev => {
                const friction = 0.9;
                const springStrength = 0.1;

                if (!isDragging) {
                    const offsetDiff = prev.targetOffset - prev.offset;
                    prev.velocity = prev.velocity * friction + offsetDiff * springStrength;
                    prev.offset += prev.velocity;

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

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isDragging]);

    // Helper function to find 30-minute intervals (same as other components)
    const getThirtyMinuteIntervals = (candles, visibleStart, visibleEnd) => {
        const intervals = [];
        if (candles.length === 0) return intervals;

        for (let i = visibleStart; i < visibleEnd; i++) {
            if (i >= candles.length) break;
            const candleTime = new Date(candles[i].time || candles[i].timestamp);
            if (isNaN(candleTime.getTime())) continue;

            const candleMinutes = candleTime.getMinutes();
            if (candleMinutes === 0 || candleMinutes === 30) {
                if (isMobile) {
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

    // Main drawing function with proper alignment like other components
    const drawChart = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || (processedData.priceData.length === 0 && processedData.candleData.length === 0)) return;

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

        // Calculate price range from both candles and price data
        const allPrices = [
            ...processedData.candleData.flatMap(c => [c.high, c.low]),
            ...processedData.priceData.map(p => p.price)
        ].filter(p => !isNaN(p));

        if (allPrices.length === 0) return;

        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const priceRange = Math.max(maxPrice - minPrice, 0.01);
        const pricePadding = Math.max(priceRange * 0.1, 1);

        // Y-axis scaling - same as other components
        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        // Use the same candle width calculation as other components
        let candleWidth = 0;
        let maxOffset = 0;
        let minOffset = 0;
        let clampedOffset = 0;
        let visibleStart = 0;
        let visibleEnd = 0;
        let visibleCandles = [];

        if (processedData.candleData.length > 0) {
            // Same calculation as CandleChart.jsx and Chart.jsx
            candleWidth = (chartWidth / processedData.candleData.length) * viewState.zoom;
            maxOffset = 0;
            minOffset = Math.min(0, -(processedData.candleData.length * candleWidth - chartWidth));
            clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

            visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
            visibleEnd = Math.min(processedData.candleData.length, Math.ceil((chartWidth - clampedOffset) / candleWidth));
            visibleCandles = processedData.candleData.slice(visibleStart, visibleEnd);
        }

        // Unified X-axis scaling function - same as other components
        const xScaleCandle = (index) => {
            return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
        };

        // Price line X-axis scaling - aligned with candles
        const xScalePriceLine = (tickerIndex) => {
            if (processedData.candleData.length === 0) {
                // Fallback for price-only mode
                const priceLineWidth = chartWidth * viewState.zoom;
                const priceOffset = Math.max(Math.min(0, -(priceLineWidth - chartWidth)), Math.min(0, viewState.offset));
                const ratio = processedData.priceData.length > 1 ? tickerIndex / (processedData.priceData.length - 1) : 0;
                return padding.left + ratio * priceLineWidth + priceOffset;
            } else {
                // Align with candle timeline
                const tickerTime = new Date(processedData.priceData[tickerIndex].timestamp);
                const candleIndex = processedData.candleData.findIndex(c => {
                    const candleTime = new Date(c.timestamp);
                    return Math.abs(candleTime.getTime() - tickerTime.getTime()) < 60000; // Within 1 minute
                });

                if (candleIndex >= 0) {
                    return xScaleCandle(candleIndex);
                } else {
                    // Interpolate position
                    const ratio = processedData.priceData.length > 1 ? tickerIndex / (processedData.priceData.length - 1) : 0;
                    const totalCandleWidth = processedData.candleData.length * candleWidth;
                    return padding.left + ratio * totalCandleWidth + clampedOffset;
                }
            }
        };

        // Set clipping region for chart area
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
        ctx.clip();

        // Draw grid - same as other components
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

        // Get time intervals for vertical grid lines
        const timeIntervals = getThirtyMinuteIntervals(processedData.candleData, visibleStart, visibleEnd);

        // Vertical grid lines at time intervals
        timeIntervals.forEach(interval => {
            const x = xScaleCandle(interval.index);
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

        // Draw candlesticks first (background layer) - SAME AS OTHER COMPONENTS
        if (visibleCandles.length > 0) {
            visibleCandles.forEach((candle, i) => {
                const x = xScaleCandle(visibleStart + i);
                const isGreen = candle.close >= candle.open;
                const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

                // Draw wick - same thickness as other components
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, yScale(candle.high));
                ctx.lineTo(x, yScale(candle.low));
                ctx.stroke();

                // Draw body - SAME AS OTHER COMPONENTS
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
        }

        // Draw price line on top (foreground layer) - improved alignment
        if (processedData.priceData.length > 1) {
            // Filter visible points based on X position
            const visiblePricePoints = processedData.priceData.filter((_, index) => {
                const x = xScalePriceLine(index);
                return x >= padding.left - 50 && x <= width - padding.right + 50;
            });

            if (visiblePricePoints.length > 1) {
                // Draw area under curve first (semi-transparent)
                ctx.beginPath();
                visiblePricePoints.forEach((point, i) => {
                    const originalIndex = processedData.priceData.indexOf(point);
                    const x = xScalePriceLine(originalIndex);
                    const y = yScale(point.price);

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                // Close the area
                if (visiblePricePoints.length > 0) {
                    const lastIndex = processedData.priceData.indexOf(visiblePricePoints[visiblePricePoints.length - 1]);
                    const firstIndex = processedData.priceData.indexOf(visiblePricePoints[0]);
                    const lastX = xScalePriceLine(lastIndex);
                    const firstX = xScalePriceLine(firstIndex);
                    ctx.lineTo(lastX, height - padding.bottom);
                    ctx.lineTo(firstX, height - padding.bottom);
                }
                ctx.closePath();

                const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
                areaGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
                areaGradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
                ctx.fillStyle = areaGradient;
                ctx.fill();

                // Draw the main price line
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                visiblePricePoints.forEach((point, i) => {
                    const originalIndex = processedData.priceData.indexOf(point);
                    const x = xScalePriceLine(originalIndex);
                    const y = yScale(point.price);

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();

                // Draw data points at intervals
                ctx.fillStyle = '#3b82f6';
                const pointInterval = Math.max(1, Math.floor(visiblePricePoints.length / 30));
                visiblePricePoints.forEach((point, i) => {
                    if (i % pointInterval === 0 || i === visiblePricePoints.length - 1) {
                        const originalIndex = processedData.priceData.indexOf(point);
                        const x = xScalePriceLine(originalIndex);
                        const y = yScale(point.price);

                        ctx.beginPath();
                        ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                });

                // Highlight latest point
                if (processedData.priceData.length > 0) {
                    const lastPoint = processedData.priceData[processedData.priceData.length - 1];
                    const x = xScalePriceLine(processedData.priceData.length - 1);
                    const y = yScale(lastPoint.price);

                    if (x >= padding.left && x <= width - padding.right) {
                        // Pulsing outer ring
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(x, y, 5, 0, 2 * Math.PI);
                        ctx.stroke();

                        // Inner point
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
                        ctx.fill();

                        // Current price label
                        const priceText = `₹${lastPoint.price.toFixed(2)}`;
                        const labelX = Math.min(x + 10, width - padding.right - 70);
                        ctx.fillStyle = '#3b82f6';
                        ctx.fillRect(labelX, y - 10, 60, 20);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
                        ctx.textAlign = 'left';
                        ctx.fillText(priceText, labelX + 5, y + 2);
                    }
                }
            }
        }

        ctx.restore(); // Remove clipping

        // Draw axes labels - same as other components
        ctx.fillStyle = colors.text.secondary;
        const labelFontSize = isMobile ? '10px' : '12px';
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

        // X-axis labels - show only time at 30-minute intervals
        ctx.textAlign = 'center';
        timeIntervals.forEach(interval => {
            const x = xScaleCandle(interval.index);
            if (x >= padding.left && x <= width - padding.right) {
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

        // Draw crosshair - same as other components
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
            if (candleIndex >= 0 && candleIndex < processedData.candleData.length) {
                const candle = processedData.candleData[candleIndex];
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

    }, [processedData, colors, symbol, viewState, mousePos, showCrosshair, isMobile, theme, isDragging]);

    // Draw chart on data change
    useEffect(() => {
        drawChart();
    }, [drawChart]);

    // Mouse interactions - same as other components
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || isMobile) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
            const centerRatio = (x - chartSettings.padding.left) / chartWidth;

            const zoomSpeed = 0.002;
            const zoomDelta = -e.deltaY * zoomSpeed;
            const newZoom = Math.max(0.5, Math.min(20, viewState.zoom + zoomDelta * viewState.zoom));

            // Same calculation as other components
            const oldCandleWidth = chartWidth / processedData.candleData.length * viewState.zoom;
            const newCandleWidth = chartWidth / processedData.candleData.length * newZoom;
            const candlesWidthDiff = (newCandleWidth - oldCandleWidth) * processedData.candleData.length;

            setViewState(prev => ({
                ...prev,
                zoom: newZoom,
                targetOffset: prev.targetOffset - candlesWidthDiff * centerRatio,
                offset: prev.offset - candlesWidthDiff * centerRatio
            }));
        };

        const handleMouseDown = (e) => {
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
            canvas.style.cursor = 'default';
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
    }, [viewState, isDragging, dragStart, isMobile, processedData.candleData.length]);

    const handleReset = () => {
        setViewState({
            zoom: 1,
            offset: 0,
            targetOffset: 0,
            velocity: 0
        });
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full" style={{ backgroundColor: colors.panelBackground }}>
                <div className="text-center" style={{ color: colors.text.secondary }}>
                    <div className="text-4xl mb-4">⚡</div>
                    <p className="text-lg">No ticker data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full" style={{ backgroundColor: colors.panelBackground }}>
            {/* Chart controls */}
            <div className="flex justify-between items-center p-3 border-b"
                 style={{ borderColor: colors.grid }}>
                <div className="flex items-center gap-4">
                    <div className="text-sm" style={{ color: colors.text.secondary }}>
                        {processedData.priceData.length} price points • {processedData.candleData.length} candles
                    </div>
                    {!isMobile && (
                        <div className="text-sm" style={{ color: colors.text.secondary }}>
                            Zoom: {(viewState.zoom * 100).toFixed(0)}%
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isRealTime && (
                        <div className="flex items-center gap-1 bg-green-600 px-2 py-1 rounded text-xs text-white">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            STREAMING
                        </div>
                    )}
                    {!isMobile && (
                        <button
                            onClick={handleReset}
                            className="px-3 py-1 rounded text-sm transition-all hover:opacity-80"
                            style={{
                                backgroundColor: colors.background,
                                border: `1px solid ${colors.grid}`,
                                color: colors.text.primary
                            }}
                        >
                            Reset View
                        </button>
                    )}
                </div>
            </div>

            {/* Main chart area */}
            <div className="relative" style={{ height: 'calc(100% - 120px)' }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{ cursor: isMobile ? 'default' : 'crosshair' }}
                />
            </div>

            {/* Chart legend */}
            <div className="px-3 py-2 border-t" style={{ borderColor: colors.grid }}>
                <div className="flex flex-wrap gap-4 text-xs">
                    {processedData.candleData.length > 0 && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border" style={{
                                    backgroundColor: colors.candle.bullish,
                                    borderColor: theme === 'dark' ? '#ffffff30' : '#00000030'
                                }}></div>
                                <span style={{ color: colors.text.secondary }}>Bullish (1min)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border" style={{
                                    backgroundColor: colors.candle.bearish,
                                    borderColor: theme === 'dark' ? '#ffffff30' : '#00000030'
                                }}></div>
                                <span style={{ color: colors.text.secondary }}>Bearish (1min)</span>
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-blue-500"></div>
                        <span style={{ color: colors.text.secondary }}>Price Line (ticks)</span>
                    </div>
                    {!isMobile && (
                        <div className="flex items-center gap-2">
                            <span style={{ color: colors.text.secondary }}>🖱️ Scroll: zoom • Drag: pan • Hover: crosshair</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
