'use client';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    ChartCanvas,
    Chart,
    series,
    scale,
    axes,
    coordinates,
    tooltip,
    helper,
} from 'react-financial-charts';
import { timeFormat } from 'd3-time-format';

const { CandlestickSeries, LineSeries, ScatterSeries } = series;
const { XAxis, YAxis } = axes;
const { CrossHairCursor, MouseCoordinateX, MouseCoordinateY } = coordinates;
const { OHLCTooltip } = tooltip;
const { discontinuousTimeScaleProvider } = scale;

export default function ChartComponent() {
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    // Fetch per-minute OHLC data
    useEffect(() => {
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/ohlc`)
            .then(res => setData(
                res.data.map(d => ({
                    ...d,
                    time: new Date(d.time)
                }))
            ))
            .catch(err => setError(err.message));
    }, []);

    // Compute local maxima & minima
    const { maxima, minima } = useMemo(() => {
        const closes = data.map(d => d.close);
        const maxMask = closes.map((v,i) => i>0 && i<closes.length-1 && v>closes[i-1] && v>closes[i+1]);
        const minMask = closes.map((v,i) => i>0 && i<closes.length-1 && v<closes[i-1] && v<closes[i+1]);
        return {
            maxima: data.filter((_,i) => maxMask[i]),
            minima: data.filter((_,i) => minMask[i])
        };
    }, [data]);

    if (error) return <div className="text-red-600">Error: {error}</div>;
    if (data.length === 0) return <div>Loading…</div>;

    const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(d => d.time);
    const { data: chartData, xScale, xAccessor, displayXAccessor } = xScaleProvider(data);

    return (
        <ChartCanvas
            height={400}
            width={800}
            ratio={window.devicePixelRatio}
            margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
            type="svg"
            seriesName="OHLC"
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

                <ScatterSeries
                    yAccessor={d => d.close}
                    data={maxima}
                    fill="#00C853"
                    marker={ScatterSeries.defaultProps.marker}
                />
                <ScatterSeries
                    yAccessor={d => d.close}
                    data={minima}
                    fill="#D50000"
                    marker={ScatterSeries.defaultProps.marker}
                />

                <OHLCTooltip origin={[0, -15]} />
            </Chart>
            <CrossHairCursor />
        </ChartCanvas>
    );
}
