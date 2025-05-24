// components/Chart.jsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    ChartCanvas,
    Chart,
    CandlestickSeries,
    LineSeries,
    ScatterSeries,
    CircleMarker,
    XAxis,
    YAxis,
    CrossHairCursor,
    MouseCoordinateX,
    MouseCoordinateY,
    OHLCTooltip,
    discontinuousTimeScaleProvider,
} from 'react-financial-charts';
import { timeFormat } from 'd3-time-format';
import { format as formatNumber } from 'd3-format';

export default function ChartComponent({ containerWidth, containerHeight }) {
    // 1) load data from your Spring Boot backend
    const [rawData, setRawData] = useState(null);
    useEffect(() => {
        fetch('http://localhost:8080/api/ohlc')
            .then((res) => res.json())
            .then(setRawData)
            .catch(console.error);
    }, []);

    // 2) show a loader until we have data
    if (!rawData) {
        return <div className="flex items-center justify-center h-full">Loading…</div>;
    }

    // 3) unpack the response
    const { candles, maxima, minima } = rawData;

    // 4) prepare the X scale
    const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(
        d => new Date(d.time)
    );
    const { data: chartData, xScale, xAccessor, displayXAccessor } =
        xScaleProvider(candles);

    // 5) render the chart full-screen
    return (
        <ChartCanvas
            width={containerWidth}
            height={containerHeight}
            ratio={window.devicePixelRatio}
            margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
            seriesName="Candles"
            data={chartData}
            xScale={xScale}
            xAccessor={xAccessor}
            displayXAccessor={displayXAccessor}
            panEvent
            zoomEvent
            clamp={false}
            type="svg"
        >
            <Chart id={1} yExtents={d => [d.high, d.low]}>
                <XAxis />
                <YAxis />

                <MouseCoordinateX displayFormat={timeFormat('%H:%M')} />
                <MouseCoordinateY displayFormat={formatNumber('.2f')} />

                <CandlestickSeries />

                <LineSeries yAccessor={d => d.close} stroke="#4CAF50" />

                {/* local maxima */}
                <ScatterSeries
                    data={maxima}
                    yAccessor={d => d.close}
                    marker={CircleMarker}
                    markerProps={{ fill: '#00C853', stroke: '#00C853', radius: 4 }}
                />

                {/* local minima */}
                <ScatterSeries
                    data={minima}
                    yAccessor={d => d.close}
                    marker={CircleMarker}
                    markerProps={{ fill: '#D50000', stroke: '#D50000', radius: 4 }}
                />

                <OHLCTooltip origin={[0, -15]} />
            </Chart>

            <CrossHairCursor />
        </ChartCanvas>
    );
}
