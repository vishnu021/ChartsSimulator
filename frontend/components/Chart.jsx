// components/Chart.jsx
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
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
    discontinuousTimeScaleProvider
} from 'react-financial-charts';
import { timeFormat } from 'd3-time-format';

export default function ChartComponent() {
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    // Fetch Candle data
    useEffect(() => {
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ohlc`)
            .then(res => setData(
                res.data.candles.map(d => ({ ...d, time: new Date(d.time) }))
            ))
            .catch(err => setError(err.message));
    }, []);

    // Compute extrema
    const { maxima, minima } = useMemo(() => {
        const closes = data.map(d => d.close);
        const maxMask = closes.map((v, i) => i > 0 && i < closes.length - 1 && v > closes[i - 1] && v > closes[i + 1]);
        const minMask = closes.map((v, i) => i > 0 && i < closes.length - 1 && v < closes[i - 1] && v < closes[i + 1]);
        return {
            maxima: data.filter((_, i) => maxMask[i]),
            minima: data.filter((_, i) => minMask[i])
        };
    }, [data]);

    if (error) return <div className="text-red-600">Error: {error}</div>;
    if (!data.length) return <div>Loading…</div>;

    const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(d => d.time);
    const { data: chartData, xScale, xAccessor, displayXAccessor } = xScaleProvider(data);

    return (
        <ChartCanvas
            type="svg"
            height={400}
            width={800}
            ratio={window.devicePixelRatio}
            margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
            seriesName="Candle"
            data={chartData}
            xScale={xScale}
            xAccessor={xAccessor}
            displayXAccessor={displayXAccessor}
            panEvent
            zoomEvent
            clamp={false}
        >
            <Chart id={1} yExtents={d => [d.high, d.low]}>
                <XAxis />
                <YAxis />
                <MouseCoordinateX displayFormat={timeFormat('%H:%M')} />
                <MouseCoordinateY />

                <CandlestickSeries />
                <LineSeries yAccessor={d => d.close} stroke="#4CAF50" />

                {/* Local maxima markers */}
                <ScatterSeries
                    data={maxima}
                    yAccessor={d => d.close}
                    marker={CircleMarker}            // use the built-in marker class
                    markerProps={{                   // these merge into CircleMarker.defaultProps
                        fill:   '#00C853',
                        stroke: '#00C853',
                        radius: 4,
                        opacity: 1
                    }}
                />

                {/* Local minima markers */}
                <ScatterSeries
                    data={minima}
                    yAccessor={d => d.close}
                    marker={CircleMarker}
                    markerProps={{
                        fill:   '#D50000',
                        stroke: '#D50000',
                        radius: 4,
                        opacity: 1
                    }}
                />

                <OHLCTooltip origin={[0, -15]} />
            </Chart>
            <CrossHairCursor />
        </ChartCanvas>
    );
}
