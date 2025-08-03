'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { themes, chartSettings } from './chartConfig';
import { CHART_CONSTANTS, UI_CONSTANTS } from '../utils/constants';
import { canvasUtils, scalingUtils } from '../utils/chart';

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

    // Canvas setup
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

    // Animation loop
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

    // Draw chart function
    const drawChart = useCallback(() => {
        if (!data || !canvasRef.current) return;

        const setup = canvasUtils.setupCanvas(canvasRef.current);
        if (!setup) return;

        const { ctx, width, height } = setup;
        const padding = canvasUtils.getPadding(isMobile);
        const { chartWidth, chartHeight } = canvasUtils.getChartDimensions(width, height, padding);

        // Clear canvas and draw background
        canvasUtils.clearCanvas(ctx, colors, width, height);
        canvasUtils.drawPanelBackground(ctx, colors, padding, width, height);

        if (!data.candles || data.candles.length === 0) return;

        // Calculate visible range
        const { visibleStart, visibleEnd, clampedOffset, candleWidth } =
            scalingUtils.calculateVisibleRange(data.candles.length, chartWidth, viewState.zoom, viewState.offset);

        const visibleCandles = data.candles.slice(visibleStart, visibleEnd);
        if (visibleCandles.length === 0) return;

        // Calculate price range
        const prices = visibleCandles.flatMap(c => [c.high, c.low]);
        const { minPrice, maxPrice, priceRange, pricePadding } = scalingUtils.calculatePriceRange(prices);

        // Create scaling functions
        const yScale = scalingUtils.createYScale(minPrice, maxPrice, priceRange, pricePadding, padding, chartHeight);
        const xScale = scalingUtils.createXScale(padding, candleWidth, visibleStart);

        // Set clipping region
        canvasUtils.setClippingRegion(ctx, padding, chartWidth, chartHeight);

        // Draw grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);

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

    // Mouse event handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data || isMobile || externalViewState) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const padding = canvasUtils.getPadding(isMobile);
            const chartWidth = rect.width - padding.left - padding.right;
            const mouseRatio = (x - padding.left) / chartWidth;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = scalingUtils.applyZoomConstraints(viewState.zoom * zoomFactor);

            const totalWidth = chartWidth * viewState.zoom;
            const newTotalWidth = chartWidth * newZoom;
            const widthChange = newTotalWidth - totalWidth;
            
            const newOffset = viewState.offset - widthChange * mouseRatio;
            const { maxOffset, minOffset } = scalingUtils.calculateOffsetLimits(chartWidth, newTotalWidth);
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