'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
    const setViewState = useMemo(() => {
        return externalViewState ? () => {} : setInternalViewState;
    }, [externalViewState]);
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
    }, [isDragging, setViewState]);

    // Helper function to find time intervals for labels
    const getTimeIntervals = useCallback((candles, visibleStart, visibleEnd) => {
        const intervals = [];
        if (!candles || candles.length === 0) return intervals;

        // Calculate how many labels we want to show
        const visibleCandles = visibleEnd - visibleStart;
        const targetLabels = isMobile ? 3 : 6;
        const step = Math.max(1, Math.floor(visibleCandles / targetLabels));

        for (let i = visibleStart; i < visibleEnd; i += step) {
            if (i >= candles.length) break;
            
            const candleTime = new Date(candles[i].time);
            if (isNaN(candleTime.getTime())) continue;

            intervals.push({ index: i, time: candleTime });
        }

        // Always include the last visible candle if not already included
        const lastIndex = Math.min(visibleEnd - 1, candles.length - 1);
        if (lastIndex > visibleStart && !intervals.find(interval => interval.index === lastIndex)) {
            const lastTime = new Date(candles[lastIndex].time);
            if (!isNaN(lastTime.getTime())) {
                intervals.push({ index: lastIndex, time: lastTime });
            }
        }

        return intervals;
    }, [isMobile]);

    // Draw chart function - now using utilities
    const drawChart = useCallback(() => {
        if (!data || !canvasRef.current) return;

        const setup = canvasUtils.setupCanvas(canvasRef.current);
        if (!setup) return;

        const { ctx, width, height } = setup;
        // Use larger bottom padding for dashboard panels and small charts
        const basePadding = canvasUtils.getPadding(isMobile);
        // Detect dashboard panels: either small area or using external view state (dashboard sync)
        const isDashboardPanel = externalViewState !== null || (width * height < 200000); // Small area indicates dashboard panel
        const isSmallChart = height < 400;
        const needsExtraPadding = isDashboardPanel || isSmallChart;
        
        const padding = needsExtraPadding ? {
            ...basePadding,
            bottom: Math.max(70, basePadding.bottom + 45), // Extra space to accommodate absolute positioning
            top: Math.max(20, basePadding.top),
            left: Math.max(40, basePadding.left - 10),
            right: Math.max(30, basePadding.right - 10)
        } : basePadding;
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

        // Get time intervals for vertical grid lines and labels
        const timeIntervals = getTimeIntervals(data.candles, visibleStart, visibleEnd);
        
        // Debug logging for time intervals and canvas dimensions
        const calculatedLabelY = height - 5 - 14; // Same calculation as in the drawing loop
        console.log('Canvas debug:', { 
            width, 
            height, 
            area: width * height,
            paddingBottom: padding.bottom,
            timeIntervals: timeIntervals.length,
            hasCandles: !!data.candles,
            isDashboardPanel,
            isSmallChart,
            needsExtraPadding,
            hasExternalViewState: !!externalViewState,
            calculatedLabelY,
            distanceFromBottom: height - calculatedLabelY
        });
        
        if (timeIntervals.length === 0) {
            console.log('No time intervals found', { 
                hasCandles: !!data.candles, 
                candlesLength: data.candles?.length,
                visibleStart, 
                visibleEnd,
                sampleCandle: data.candles?.[0]
            });
        }

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
        ctx.fillStyle = colors.text.secondary;
        ctx.font = `${labelFontSize} -apple-system, BlinkMacSystemFont, sans-serif`;
        
        timeIntervals.forEach(interval => {
            const x = xScale(interval.index);
            if (x >= padding.left && x <= width - padding.right) {
                const timeString = format(interval.time, 'HH:mm');
                // Ensure labels are always visible - aggressive positioning
                // Always position from the actual bottom, working backwards
                const textHeight = 14; // Approximate text height
                const minMargin = 5; // Minimum space from canvas edge
                
                // Calculate safe Y position from canvas bottom
                const labelY = height - minMargin - textHeight;
                
                // Draw with contrasting color and ensure visibility
                ctx.save();
                
                // Draw background rectangle for better visibility
                const textWidth = ctx.measureText(timeString).width;
                ctx.fillStyle = colors.panelBackground || '#1e293b'; // Background color
                ctx.fillRect(x - textWidth/2 - 2, labelY - textHeight + 2, textWidth + 4, textHeight + 2);
                
                // Draw text on top
                ctx.fillStyle = colors.text.primary; // Use primary text color for better visibility
                ctx.fillText(timeString, x, labelY);
                ctx.restore();
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
    }, [data, viewState, mousePos, showCrosshair, colors, isMobile, getTimeIntervals]);

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
    }, [data, viewState, isDragging, dragStart, isMobile, externalViewState, setViewState]);

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
