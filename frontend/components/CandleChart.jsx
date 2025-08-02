'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';
import { CHART_CONSTANTS, UI_CONSTANTS } from '@/utils/constants';
import { canvasUtils, scalingUtils } from '@/utils/chart';

export default function CandleChart({ data, theme = 'dark', externalViewState = null }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [internalViewState, setInternalViewState] = useState({
        zoom: 1,
        offset: 0,
        targetOffset: 0,
        velocity: 0
    });
    
    // Use external view state if provided, otherwise use internal state
    const viewState = externalViewState || internalViewState;
    const setViewState = externalViewState ? () => {} : setInternalViewState;
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showCrosshair, setShowCrosshair] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const colors = themes[theme];

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < UI_CONSTANTS.BREAKPOINTS.MOBILE);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Canvas setup - now using canvasUtils
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateCanvasSize = () => {
            canvasUtils.setupCanvas(canvas);
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [data]);

    // Smooth animation loop
    useEffect(() => {
        const animate = () => {
            setViewState(prev => {
                const { FRICTION, SPRING_STRENGTH, VELOCITY_THRESHOLD, OFFSET_THRESHOLD } = CHART_CONSTANTS.ANIMATION;

                if (!isDragging) {
                    const offsetDiff = prev.targetOffset - prev.offset;
                    prev.velocity = prev.velocity * FRICTION + offsetDiff * SPRING_STRENGTH;
                    prev.offset += prev.velocity;

                    if (Math.abs(prev.velocity) < VELOCITY_THRESHOLD && Math.abs(offsetDiff) < OFFSET_THRESHOLD) {
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

        for (let i = visibleStart; i < visibleEnd; i++) {
            const candleTime = new Date(candles[i].time);
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

    // Draw chart function - now using utilities
    const drawChart = useCallback(() => {
        if (!data || !canvasRef.current) return;

        const setup = canvasUtils.setupCanvas(canvasRef.current);
        if (!setup) return;

        const { ctx, width, height } = setup;
        const padding = canvasUtils.getPadding(isMobile);
        const { chartWidth, chartHeight } = canvasUtils.getChartDimensions(width, height, padding);

        // Clear canvas
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, width, height);

        // Draw panel background
        ctx.fillStyle = colors.panelBackground;
        ctx.fillRect(
            padding.left - 10,
            padding.top - 10,
            chartWidth + 20,
            chartHeight + 20
        );

        if (!data.candles || data.candles.length === 0) return;

        // Calculate visible range using utilities
        const { visibleStart, visibleEnd, clampedOffset, candleWidth } =
            scalingUtils.calculateVisibleRange(data.candles.length, chartWidth, viewState.zoom, viewState.offset);

        const visibleCandles = data.candles.slice(visibleStart, visibleEnd);
        if (visibleCandles.length === 0) return;

        // Calculate price range using utilities
        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const { minPrice, maxPrice, priceRange, pricePadding } = scalingUtils.calculatePriceRange(prices);

        // Create scaling functions using utilities
        const yScale = scalingUtils.createYScale(minPrice, maxPrice, priceRange, pricePadding, padding, chartHeight);
        const xScale = scalingUtils.createXScale(padding, candleWidth, visibleStart);

        // Set clipping region
        canvasUtils.setClippingRegion(ctx, padding, chartWidth, chartHeight);

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
        const horizontalLines = isMobile ? CHART_CONSTANTS.GRID_LINES.HORIZONTAL_MOBILE : CHART_CONSTANTS.GRID_LINES.HORIZONTAL_DESKTOP;
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
            ctx.lineWidth = CHART_CONSTANTS.CANDLE.WICK_LINE_WIDTH;
            ctx.beginPath();
            ctx.moveTo(x, yScale(candle.high));
            ctx.lineTo(x, yScale(candle.low));
            ctx.stroke();

            // Draw body
            const bodyTop = yScale(Math.max(candle.open, candle.close));
            const bodyBottom = yScale(Math.min(candle.open, candle.close));
            const bodyHeight = Math.max(CHART_CONSTANTS.CANDLE.MIN_BODY_HEIGHT, bodyBottom - bodyTop);

            ctx.fillStyle = color;
            ctx.fillRect(
                x - candleWidth * CHART_CONSTANTS.CANDLE.BODY_WIDTH_RATIO / 2,
                bodyTop,
                candleWidth * CHART_CONSTANTS.CANDLE.BODY_WIDTH_RATIO,
                bodyHeight
            );
        });

        canvasUtils.clearClippingRegion(ctx);

        // Draw axes labels
        ctx.fillStyle = colors.text.secondary;
        const labelFontSize = isMobile ? '10px' : '12px';
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;

        // X-axis labels
        ctx.textAlign = 'center';
        timeIntervals.forEach(interval => {
            const x = xScale(interval.index);
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

        // Draw crosshair
        if (!isMobile && showCrosshair && mousePos.x > padding.left && mousePos.x < width - padding.right &&
            mousePos.y > padding.top && mousePos.y < height - padding.bottom) {

            ctx.strokeStyle = colors.lines.crosshair;
            ctx.lineWidth = CHART_CONSTANTS.CROSSHAIR_LINE_WIDTH;
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

    useEffect(() => {
        drawChart();
    }, [drawChart]);

    // Mouse event handlers (keeping existing logic but using constants)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || isMobile || externalViewState) return; // Skip if using external view state

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const padding = canvasUtils.getPadding(isMobile);
            const chartWidth = rect.width - padding.left - padding.right;
            const mouseRatio = (x - padding.left) / chartWidth;

            // Simplified and stable zoom calculation
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; // Simple zoom in/out factor
            const newZoom = Math.max(CHART_CONSTANTS.MIN_ZOOM, Math.min(CHART_CONSTANTS.MAX_ZOOM, viewState.zoom * zoomFactor));

            // Calculate horizontal offset to keep cursor position stable
            const totalWidth = chartWidth * viewState.zoom;
            const newTotalWidth = chartWidth * newZoom;
            const widthChange = newTotalWidth - totalWidth;
            
            // Zoom around cursor position
            const newOffset = viewState.offset - widthChange * mouseRatio;
            
            // Calculate offset limits
            const maxOffset = 0;
            const minOffset = Math.min(0, chartWidth - newTotalWidth);
            const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

            setViewState(prev => ({
                ...prev,
                zoom: newZoom,
                offset: clampedOffset,
                targetOffset: clampedOffset
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
    }, [data, viewState, isDragging, dragStart, isMobile, externalViewState]);

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
        <div className="h-full w-full" style={{ backgroundColor: colors.panelBackground }}>
            <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ cursor: isMobile ? 'default' : 'crosshair' }}
            />
        </div>
    );
}
