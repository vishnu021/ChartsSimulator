'use client';

import React, { useCallback } from 'react';
import { useBaseChart } from '../../hooks/chart/useBaseChart';
import { useCandleDrawing } from '../../hooks/chart/useCandleDrawing';
import { ChartHeader } from './base/ChartHeader';
import { ChartContainer } from './base/ChartContainer';
import { themes } from '../chartConfig';

export default function CandleChart({ data, theme = 'dark' }) {
    const colors = themes[theme];

    const {
        canvasRef,
        viewState,
        mousePos,
        showCrosshair,
        isMobile,
        resetView
    } = useBaseChart({
        data: data?.candles,
        enableZoom: true,
        enablePan: true
    });

    const { drawChart } = useCandleDrawing({
        data,
        theme,
        viewState,
        mousePos,
        showCrosshair,
        isMobile
    });

    const handleDraw = useCallback((drawParams) => {
        drawChart(drawParams);
    }, [drawChart]);

    const chartProps = {
        ...arguments[0],
        onDraw: handleDraw
    };

    // Header stats
    const headerStats = [
        {
            label: 'Total Candles',
            value: data?.candles?.length || 0,
            color: colors.text.secondary
        },
        {
            label: 'Zoom',
            value: `${(viewState.zoom * 100).toFixed(0)}%`,
            color: colors.text.secondary,
            visible: !isMobile
        }
    ];

    if (!data) return null;

    return (
        <ChartContainer theme={theme}>
            <ChartHeader
                title={data.symbol || 'Candlestick Chart'}
                stats={headerStats}
                onReset={resetView}
                showResetButton={!isMobile}
                theme={theme}
            />

            <div className="flex-1 rounded-lg overflow-hidden"
                 style={{ backgroundColor: colors.panelBackground, minHeight: 200 }}>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{
                        cursor: isMobile ? 'default' : 'crosshair',
                        minHeight: 200
                    }}
                />
            </div>
        </ChartContainer>
    );
}
