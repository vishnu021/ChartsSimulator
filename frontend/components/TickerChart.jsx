'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

const themes = {
    dark: {
        background: '#0f172a',
        panelBackground: '#1e293b',
        controlPanel: '#1e293b',
        grid: '#334155',
        text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8',
            maxima: '#10b981',
            minima: '#ef4444'
        },
        candle: {
            bullish: '#10b981',
            bearish: '#ef4444'
        },
        lines: {
            maxima: '#fbbf24',
            minima: '#f472b6',
            crosshair: '#64748b'
        },
        tooltip: {
            background: 'rgba(30, 41, 59, 0.95)',
            border: '#475569'
        },
        input: {
            background: '#0f172a',
            border: '#475569',
            focus: '#3b82f6'
        }
    },
    light: {
        background: '#ffffff',
        panelBackground: '#f8fafc',
        controlPanel: '#f1f5f9',
        grid: '#e2e8f0',
        text: {
            primary: '#0f172a',
            secondary: '#64748b',
            maxima: '#059669',
            minima: '#dc2626'
        },
        candle: {
            bullish: '#10b981',
            bearish: '#ef4444'
        },
        lines: {
            maxima: '#f59e0b',
            minima: '#ec4899',
            crosshair: '#94a3b8'
        },
        tooltip: {
            background: 'rgba(248, 250, 252, 0.95)',
            border: '#cbd5e1'
        },
        input: {
            background: '#ffffff',
            border: '#cbd5e1',
            focus: '#3b82f6'
        }
    }
};

const chartSettings = {
    padding: { top: 40, right: 80, bottom: 60, left: 80 },
    mobilePadding: { top: 30, right: 40, bottom: 40, left: 60 },
    gridLines: {
        horizontal: 8,
        vertical: 10
    },
    candleBodyWidthRatio: 0.8,
    extremaPointRadius: 6,
    crosshairLineWidth: 1,
    extremaLineWidth: 2,
    fonts: {
        labels: '12px -apple-system, BlinkMacSystemFont, sans-serif',
        tooltip: '13px -apple-system, BlinkMacSystemFont, sans-serif',
        extremaLabels: '11px -apple-system, BlinkMacSystemFont, sans-serif',
        mobileLabels: '10px -apple-system, BlinkMacSystemFont, sans-serif',
        mobileTooltip: '11px -apple-system, BlinkMacSystemFont, sans-serif',
        mobileExtremaLabels: '9px -apple-system, BlinkMacSystemFont, sans-serif'
    }
};

const formatTime = (date, format) => {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    if (format === 'HH:mm:ss') {
        return `${hours}:${minutes}:${seconds}`;
    }
    return `${hours}:${minutes}`;
};

export default function TickerChart({ data, theme = 'dark', symbol, stats, isRealTime }) {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);
    const [viewState, setViewState] = useState({
        zoom: 1,
        verticalZoom: 1,
        offset: 0,
        targetOffset: 0,
        velocity: 0,
        verticalOffset: 0,
        targetVerticalOffset: 0,
        verticalVelocity: 0
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, offset: 0, verticalOffset: 0 });
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

                // For candle grouping, use the NEXT minute (9:14:xx data goes to 9:15 candle)
                const nextMinute = new Date(tickTime);
                nextMinute.setSeconds(0, 0);
                nextMinute.setMinutes(nextMinute.getMinutes() + 1);
                const minuteKey = nextMinute.getTime();

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

                // The candle represents data UP TO this minute
                candleData.push({
                    time: new Date(minuteKey).toISOString(),
                    timestamp: minuteKey,
                    open: prices[0],
                    high: Math.max(...prices),
                    low: Math.min(...prices),
                    close: prices[prices.length - 1],
                    volume: volumes.reduce((sum, v) => sum + v, 0),
                    tickCount: ticks.length
                });
            });

        // Keep ALL price data points for full granularity
        let priceData;
        const maxPoints = 10000;
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

    // Smooth animation loop
    useEffect(() => {
        const animate = () => {
            setViewState(prev => {
                const friction = 0.9;
                const springStrength = 0.1;

                if (!isDragging) {
                    // Horizontal offset
                    const offsetDiff = prev.targetOffset - prev.offset;
                    prev.velocity = prev.velocity * friction + offsetDiff * springStrength;
                    prev.offset += prev.velocity;

                    if (Math.abs(prev.velocity) < 0.1 && Math.abs(offsetDiff) < 0.1) {
                        prev.offset = prev.targetOffset;
                        prev.velocity = 0;
                    }

                    // Vertical offset
                    const verticalOffsetDiff = prev.targetVerticalOffset - prev.verticalOffset;
                    prev.verticalVelocity = prev.verticalVelocity * friction + verticalOffsetDiff * springStrength;
                    prev.verticalOffset += prev.verticalVelocity;

                    if (Math.abs(prev.verticalVelocity) < 0.1 && Math.abs(verticalOffsetDiff) < 0.1) {
                        prev.verticalOffset = prev.targetVerticalOffset;
                        prev.verticalVelocity = 0;
                    }
                } else {
                    prev.offset = prev.targetOffset;
                    prev.velocity = 0;
                    prev.verticalOffset = prev.targetVerticalOffset;
                    prev.verticalVelocity = 0;
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

    // Helper function to find time intervals
    const getTimeIntervals = (timeRange, chartWidth, zoom) => {
        const intervals = [];
        if (!timeRange || timeRange.start === 0) return intervals;

        const totalDuration = timeRange.end - timeRange.start;
        const visibleDuration = totalDuration / zoom;

        // Determine interval based on zoom level
        let intervalMs;
        if (visibleDuration < 60 * 60 * 1000) { // Less than 1 hour visible
            intervalMs = 5 * 60 * 1000; // 5 minute intervals
        } else if (visibleDuration < 3 * 60 * 60 * 1000) { // Less than 3 hours
            intervalMs = 15 * 60 * 1000; // 15 minute intervals
        } else {
            intervalMs = 30 * 60 * 1000; // 30 minute intervals
        }

        const startTime = Math.floor(timeRange.start / intervalMs) * intervalMs;

        for (let time = startTime; time <= timeRange.end; time += intervalMs) {
            intervals.push({
                timestamp: time,
                time: new Date(time)
            });
        }

        return intervals;
    };

    // Main drawing function
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

        const basePriceRange = Math.max(0.01, Math.max(...allPrices) - Math.min(...allPrices));
        const baseMinPrice = Math.min(...allPrices);
        const baseMaxPrice = Math.max(...allPrices);
        const centerPrice = (baseMaxPrice + baseMinPrice) / 2;

        // Apply vertical zoom and offset
        const zoomedRange = basePriceRange / viewState.verticalZoom;
        const verticalShift = viewState.verticalOffset * zoomedRange / chartHeight;
        const minPrice = centerPrice - zoomedRange / 2 - verticalShift;
        const maxPrice = centerPrice + zoomedRange / 2 - verticalShift;
        const priceRange = maxPrice - minPrice;
        const pricePadding = Math.min(priceRange * 0.1, basePriceRange * 0.1);

        // Y-axis scaling
        const yScale = (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };

        // Calculate visible time range based on zoom and offset
        const totalWidth = chartWidth * viewState.zoom;

        // Clamp offset to prevent dragging outside data range
        const maxOffset = 0;
        const minOffset = Math.min(0, chartWidth - totalWidth);
        const clampedOffset = Math.max(minOffset, Math.min(maxOffset, viewState.offset));

        // Update offset if it was clamped
        if (clampedOffset !== viewState.offset) {
            setViewState(prev => ({
                ...prev,
                offset: clampedOffset,
                targetOffset: clampedOffset
            }));
        }

        const visibleStartRatio = Math.max(0, -clampedOffset / totalWidth);
        const visibleEndRatio = Math.min(1, (chartWidth - clampedOffset) / totalWidth);

        const timeSpan = processedData.timeRange.end - processedData.timeRange.start;
        const visibleStart = processedData.timeRange.start + timeSpan * visibleStartRatio;
        const visibleEnd = processedData.timeRange.start + timeSpan * visibleEndRatio;

        // X-axis scaling for timestamps
        const xScaleTime = (timestamp) => {
            const ratio = (timestamp - processedData.timeRange.start) / timeSpan;
            return padding.left + ratio * totalWidth + clampedOffset;
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

        // Get time intervals based on zoom
        const timeIntervals = getTimeIntervals(processedData.timeRange, chartWidth, viewState.zoom);

        // Vertical grid lines at time intervals
        timeIntervals.forEach(interval => {
            const x = xScaleTime(interval.timestamp);
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

        // Draw candles WITHOUT GAPS - aligned to END of their time period
        if (processedData.candleData.length > 0) {
            const visibleCandles = processedData.candleData.filter(candle => {
                const x = xScaleTime(candle.timestamp);
                return x >= padding.left - 100 && x <= width - padding.right + 100;
            });

            if (visibleCandles.length > 0) {
                visibleCandles.forEach((candle, i) => {
                    // Position candle at the END of its minute
                    const candleX = xScaleTime(candle.timestamp);

                    // Calculate width to previous candle
                    let candleWidth;
                    if (i > 0) {
                        const prevX = xScaleTime(visibleCandles[i - 1].timestamp);
                        candleWidth = Math.max(1, candleX - prevX);
                    } else if (i < visibleCandles.length - 1) {
                        const nextX = xScaleTime(visibleCandles[i + 1].timestamp);
                        candleWidth = Math.max(1, nextX - candleX);
                    } else {
                        // Single candle case - use 1 minute width
                        candleWidth = (60 * 1000 / timeSpan) * totalWidth;
                    }

                    // Position candle body to START at previous minute and END at current minute
                    const bodyX = candleX - candleWidth / 2;

                    const isGreen = candle.close >= candle.open;
                    const color = isGreen ? colors.candle.bullish : colors.candle.bearish;

                    // Draw wick at center of candle period
                    ctx.strokeStyle = color;
                    ctx.lineWidth = Math.min(2, candleWidth * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(bodyX, yScale(candle.high));
                    ctx.lineTo(bodyX, yScale(candle.low));
                    ctx.stroke();

                    // Draw body - fill entire width
                    const bodyTop = yScale(Math.max(candle.open, candle.close));
                    const bodyBottom = yScale(Math.min(candle.open, candle.close));
                    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

                    ctx.fillStyle = color;
                    const gapSize = Math.min(1, candleWidth * 0.05);
                    ctx.fillRect(
                        bodyX - candleWidth / 2 + gapSize,
                        bodyTop,
                        candleWidth - gapSize * 2,
                        bodyHeight
                    );

                    // Add subtle border when zoomed in
                    if (viewState.zoom > 2) {
                        ctx.strokeStyle = colors.background;
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(
                            bodyX - candleWidth / 2 + gapSize,
                            bodyTop,
                            candleWidth - gapSize * 2,
                            bodyHeight
                        );
                    }
                });
            }
        }

        // Draw price line on top (foreground layer) with full detail
        if (processedData.priceData.length > 1) {
            // Filter visible points
            const visiblePricePoints = processedData.priceData.filter(point => {
                const x = xScaleTime(point.timestamp);
                return x >= padding.left - 100 && x <= width - padding.right + 100;
            });

            if (visiblePricePoints.length > 1) {
                // Draw area under curve first (semi-transparent)
                ctx.beginPath();
                visiblePricePoints.forEach((point, i) => {
                    const x = xScaleTime(point.timestamp);
                    const y = yScale(point.price);

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                // Close the area
                if (visiblePricePoints.length > 0) {
                    const lastX = xScaleTime(visiblePricePoints[visiblePricePoints.length - 1].timestamp);
                    const firstX = xScaleTime(visiblePricePoints[0].timestamp);
                    ctx.lineTo(lastX, height - padding.bottom);
                    ctx.lineTo(firstX, height - padding.bottom);
                }
                ctx.closePath();

                const areaGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
                areaGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
                areaGradient.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
                ctx.fillStyle = areaGradient;
                ctx.fill();

                // Draw the main price line with enhanced visibility
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = viewState.zoom > 2 ? 3 : 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Add glow effect when zoomed
                if (viewState.zoom > 3) {
                    ctx.shadowColor = '#3b82f6';
                    ctx.shadowBlur = 4;
                }

                ctx.beginPath();
                visiblePricePoints.forEach((point, i) => {
                    const x = xScaleTime(point.timestamp);
                    const y = yScale(point.price);

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();

                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;

                // Draw data points when zoomed in
                if (viewState.zoom > 4) {
                    ctx.fillStyle = '#3b82f6';
                    visiblePricePoints.forEach(point => {
                        const x = xScaleTime(point.timestamp);
                        const y = yScale(point.price);

                        ctx.beginPath();
                        ctx.arc(x, y, 2, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                }

                // Highlight latest point
                if (processedData.priceData.length > 0) {
                    const lastPoint = processedData.priceData[processedData.priceData.length - 1];
                    const x = xScaleTime(lastPoint.timestamp);
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

        // Draw axes labels
        ctx.fillStyle = colors.text.secondary;
        const labelFontSize = isMobile ? '10px' : '12px';
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

        // X-axis labels - show time based on zoom level
        ctx.textAlign = 'center';
        const visibleIntervals = timeIntervals.filter(interval => {
            const x = xScaleTime(interval.timestamp);
            return x >= padding.left && x <= width - padding.right;
        });

        // Limit number of labels to avoid crowding
        const maxLabels = isMobile ? 4 : 8;
        const labelStep = Math.ceil(visibleIntervals.length / maxLabels);

        visibleIntervals.forEach((interval, i) => {
            if (i % labelStep === 0) {
                const x = xScaleTime(interval.timestamp);
                const timeString = formatTime(interval.time, 'HH:mm');
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

        // Draw crosshair
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

            // Price label
            ctx.fillStyle = colors.tooltip.background;
            ctx.fillRect(width - padding.right + 5, mousePos.y - 10, 75, 20);
            ctx.strokeStyle = colors.tooltip.border;
            ctx.strokeRect(width - padding.right + 5, mousePos.y - 10, 75, 20);
            ctx.fillStyle = colors.text.primary;
            ctx.font = chartSettings.fonts.labels;
            ctx.textAlign = 'left';
            ctx.fillText(price.toFixed(2), width - padding.right + 10, mousePos.y + 4);

            // Time label
            const hoveredTime = processedData.timeRange.start +
                ((mousePos.x - padding.left - clampedOffset) / totalWidth) * timeSpan;
            const timeLabel = formatTime(new Date(hoveredTime), 'HH:mm:ss');

            ctx.fillStyle = colors.tooltip.background;
            ctx.fillRect(mousePos.x - 40, height - padding.bottom + 5, 80, 20);
            ctx.strokeRect(mousePos.x - 40, height - padding.bottom + 5, 80, 20);
            ctx.fillStyle = colors.text.primary;
            ctx.textAlign = 'center';
            ctx.fillText(timeLabel, mousePos.x, height - padding.bottom + 20);
        }

    }, [processedData, colors, symbol, viewState, mousePos, showCrosshair, isMobile, theme]);

    // Draw chart on data change
    useEffect(() => {
        drawChart();
    }, [drawChart]);

    // Enhanced mouse interactions with vertical zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || isMobile) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
            const mouseRatio = (x - chartSettings.padding.left) / chartWidth;

            const zoomSpeed = 0.003;
            const zoomDelta = -e.deltaY * zoomSpeed;

            // Check if Shift key is held for vertical zoom
            if (e.shiftKey) {
                e.stopPropagation(); // Prevent browser's horizontal scroll
                // Vertical zoom
                const newVerticalZoom = Math.max(0.5, Math.min(10, viewState.verticalZoom + zoomDelta * viewState.verticalZoom));
                setViewState(prev => ({
                    ...prev,
                    verticalZoom: newVerticalZoom
                }));
            } else {
                // Horizontal zoom
                const newZoom = Math.max(0.5, Math.min(50, viewState.zoom + zoomDelta * viewState.zoom));

                // Calculate new offset to zoom around mouse position
                const totalWidth = chartWidth * viewState.zoom;
                const newTotalWidth = chartWidth * newZoom;
                const widthDiff = newTotalWidth - totalWidth;

                // Calculate offset limits
                const maxOffset = 0;
                const minOffset = Math.min(0, chartWidth - newTotalWidth);

                setViewState(prev => {
                    const newOffset = prev.targetOffset - widthDiff * mouseRatio;
                    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

                    return {
                        ...prev,
                        zoom: newZoom,
                        targetOffset: clampedOffset,
                        offset: prev.offset - widthDiff * mouseRatio
                    };
                });
            }
        };

        const handleMouseDown = (e) => {
            setIsDragging(true);
            setDragStart({
                x: e.clientX,
                y: e.clientY,
                offset: viewState.targetOffset,
                verticalOffset: viewState.targetVerticalOffset
            });
            canvas.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

            if (isDragging) {
                const dx = e.clientX - dragStart.x;
                const dy = e.clientY - dragStart.y;
                const chartWidth = rect.width - chartSettings.padding.left - chartSettings.padding.right;
                const totalWidth = chartWidth * viewState.zoom;

                // Calculate horizontal offset limits
                const maxOffset = 0;
                const minOffset = Math.min(0, chartWidth - totalWidth);

                const newOffset = dragStart.offset + dx;
                const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

                setViewState(prev => ({
                    ...prev,
                    targetOffset: clampedOffset,
                    targetVerticalOffset: dragStart.verticalOffset - dy
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
    }, [viewState, isDragging, dragStart, isMobile, processedData.timeRange]);

    const handleReset = () => {
        setViewState({
            zoom: 1,
            verticalZoom: 1,
            offset: 0,
            targetOffset: 0,
            velocity: 0,
            verticalOffset: 0,
            targetVerticalOffset: 0,
            verticalVelocity: 0
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
            {/* CONSOLIDATED HEADER PANEL WITH ALL INFO IN ONE BAR */}
            <div className="px-3 py-2 border-b" style={{ borderColor: colors.grid }}>
                <div className="flex justify-between items-center">
                    {/* Left side - Symbol and price info */}
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold" style={{ color: colors.text.primary }}>
                            {symbol}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold" style={{ color: colors.text.primary }}>
                                ₹{stats.currentPrice.toFixed(2)}
                            </span>
                            <div className={`flex items-center gap-1 ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{stats.change >= 0 ? '▲' : '▼'}</span>
                                <span>{Math.abs(stats.change).toFixed(2)} ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)</span>
                            </div>
                        </div>
                    </div>

                    {/* Center - All data info */}
                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-blue-400">{processedData.priceData.length} ticks</span>
                        <span className="text-yellow-400">{processedData.candleData.length} candles</span>
                        <span style={{ color: colors.text.secondary }}>Vol: {stats.volume.toLocaleString()}</span>
                        <span style={{ color: colors.text.secondary }}>₹{stats.low.toFixed(2)}-₹{stats.high.toFixed(2)}</span>
                        {!isMobile && (
                            <>
                                <span style={{ color: colors.text.secondary }}>|</span>
                                <span style={{ color: colors.text.secondary }}>
                                    Scroll: H-zoom | Drag: Pan | H: {(viewState.zoom * 100).toFixed(0)}% V: {(viewState.verticalZoom * 100).toFixed(0)}%
                                </span>
                            </>
                        )}
                    </div>

                    {/* Right side - Status and controls */}
                    <div className="flex items-center gap-2">
                        {isRealTime && (
                            <div className="flex items-center gap-1 bg-green-600 px-2 py-1 rounded text-xs text-white">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                LIVE
                            </div>
                        )}
                        <button
                            onClick={handleReset}
                            className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                            style={{
                                backgroundColor: colors.background,
                                border: `1px solid ${colors.grid}`,
                                color: colors.text.primary
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        {/*</div>*/}

    {/* CHART AREA - Takes remaining space */}
    <div className="relative flex" style={{ height: 'calc(100% - 48px)' }}>
        <div className="flex-1 relative">
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ cursor: isMobile ? 'default' : 'crosshair' }}
            />
        </div>

        {/* Vertical Zoom Control */}
        {!isMobile && (
            <div className="flex flex-col items-center px-2 py-4" style={{ backgroundColor: colors.background }}>
                <div className="text-xs mb-2 text-center" style={{ color: colors.text.secondary }}>
                    Vertical
                </div>

                <button
                    onClick={() => setViewState(prev => ({
                        ...prev,
                        verticalZoom: Math.min(10, prev.verticalZoom * 1.5)
                    }))}
                    className="px-2 py-2 mb-1 rounded text-sm hover:opacity-80"
                    style={{
                        backgroundColor: colors.panelBackground,
                        border: `1px solid ${colors.grid}`,
                        color: colors.text.primary
                    }}
                >
                    +
                </button>

                <div className="flex-1 flex flex-col justify-center py-2">
                    <div className="text-center text-xs font-bold" style={{ color: colors.text.primary }}>
                        {(viewState.verticalZoom * 100).toFixed(0)}%
                    </div>
                </div>

                <button
                    onClick={() => setViewState(prev => ({
                        ...prev,
                        verticalZoom: Math.max(0.5, prev.verticalZoom / 1.5)
                    }))}
                    className="px-2 py-2 mb-1 rounded text-sm hover:opacity-80"
                    style={{
                        backgroundColor: colors.panelBackground,
                        border: `1px solid ${colors.grid}`,
                        color: colors.text.primary
                    }}
                >
                    -
                </button>

                <button
                    onClick={() => setViewState(prev => ({
                        ...prev,
                        verticalZoom: 1,
                        verticalOffset: 0,
                        targetVerticalOffset: 0,
                        verticalVelocity: 0
                    }))}
                    className="px-1 py-1 mt-2 rounded text-xs hover:opacity-80"
                    style={{
                        backgroundColor: colors.input.focus,
                        color: '#ffffff'
                    }}
                >
                    1x
                </button>
            </div>
        )}
    </div>
</div>
);
}
