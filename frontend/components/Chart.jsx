// frontend/components/Chart.jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Dot,
    ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-gray-800 p-3 rounded shadow-lg border border-gray-700">
                <p className="text-white text-sm font-semibold">{format(new Date(data.timestamp), 'MMM dd, HH:mm')}</p>
                <p className="text-green-400 text-sm">Open: {data.open?.toFixed(2)}</p>
                <p className="text-green-400 text-sm">High: {data.high?.toFixed(2)}</p>
                <p className="text-red-400 text-sm">Low: {data.low?.toFixed(2)}</p>
                <p className="text-blue-400 text-sm">Close: {data.close?.toFixed(2)}</p>
                <p className="text-gray-400 text-sm">Volume: {data.volume?.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

// Custom dot for extrema points
const CustomDot = (props) => {
    const { cx, cy, payload } = props;

    if (payload.isMaxima) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={6} fill="#00C853" stroke="#00C853" strokeWidth={2} />
                <text x={cx} y={cy - 10} fill="#00C853" fontSize="12" textAnchor="middle">H</text>
            </g>
        );
    }

    if (payload.isMinima) {
        return (
            <g>
                <circle cx={cx} cy={cy} r={6} fill="#D50000" stroke="#D50000" strokeWidth={2} />
                <text x={cx} y={cy + 20} fill="#D50000" fontSize="12" textAnchor="middle">L</text>
            </g>
        );
    }

    return null;
};

export default function ChartComponent() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [refAreaLeft, setRefAreaLeft] = useState('');
    const [refAreaRight, setRefAreaRight] = useState('');
    const [left, setLeft] = useState('dataMin');
    const [right, setRight] = useState('dataMax');

    // Fetch data
    useEffect(() => {
        fetch('http://localhost:8080/api/ohlc')
            .then((res) => res.json())
            .then(setData)
            .catch((err) => {
                console.error('Failed to fetch data:', err);
                setError(err.message);
            });
    }, []);

    // Process data
    const { chartData, yDomain } = useMemo(() => {
        if (!data) return { chartData: [], yDomain: [0, 100] };

        // Create a map of extrema times for quick lookup
        const maximaTimes = new Set(data.maxima.map(m => m.time));
        const minimaTimes = new Set(data.minima.map(m => m.time));

        // Transform data and mark extrema
        const processedData = data.candles.map(candle => ({
            ...candle,
            timestamp: new Date(candle.time).getTime(),
            isMaxima: maximaTimes.has(candle.time),
            isMinima: minimaTimes.has(candle.time),
        }));

        // Calculate Y domain
        const allPrices = processedData.flatMap(d => [d.high, d.low]);
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const padding = (maxPrice - minPrice) * 0.1;

        return {
            chartData: processedData,
            yDomain: [Math.floor(minPrice - padding), Math.ceil(maxPrice + padding)]
        };
    }, [data]);

    // Zoom handlers
    const handleMouseDown = (e) => {
        if (e && e.activeLabel) {
            setRefAreaLeft(e.activeLabel);
        }
    };

    const handleMouseMove = (e) => {
        if (refAreaLeft && e && e.activeLabel) {
            setRefAreaRight(e.activeLabel);
        }
    };

    const handleMouseUp = () => {
        if (refAreaLeft && refAreaRight) {
            const leftValue = Math.min(refAreaLeft, refAreaRight);
            const rightValue = Math.max(refAreaLeft, refAreaRight);
            setLeft(leftValue);
            setRight(rightValue);
        }
        setRefAreaLeft('');
        setRefAreaRight('');
    };

    const handleReset = () => {
        setLeft('dataMin');
        setRight('dataMax');
        setRefAreaLeft('');
        setRefAreaRight('');
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-red-400">
                Error: {error}
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    Loading chart data...
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-gray-900 p-4">
            <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">NIFTY 50</h1>
                        <div className="flex gap-4 mt-2">
                            <span className="text-green-400 text-sm">
                                Maxima: {data.maxima.length} points
                            </span>
                            <span className="text-red-400 text-sm">
                                Minima: {data.minima.length} points
                            </span>
                            <span className="text-gray-400 text-sm">
                                Total: {chartData.length} candles
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <span className="text-gray-400 text-sm">Click and drag to zoom</span>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                            Reset Zoom
                        </button>
                    </div>
                </div>

                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 50, bottom: 60 }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={() => { setRefAreaRight(''); setRefAreaLeft(''); }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="timestamp"
                                domain={[left, right]}
                                type="number"
                                tickFormatter={(timestamp) => format(new Date(timestamp), 'MMM dd')}
                                stroke="#9CA3AF"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                domain={yDomain}
                                stroke="#9CA3AF"
                                style={{ fontSize: '12px' }}
                                tickCount={8}
                            />
                            <Tooltip content={<CustomTooltip />} />

                            {/* High line */}
                            <Line
                                type="monotone"
                                dataKey="high"
                                stroke="#FFB74D"
                                strokeWidth={1}
                                dot={false}
                                name="High"
                            />

                            {/* Low line */}
                            <Line
                                type="monotone"
                                dataKey="low"
                                stroke="#CE93D8"
                                strokeWidth={1}
                                dot={false}
                                name="Low"
                            />

                            {/* Close line with extrema dots */}
                            <Line
                                type="monotone"
                                dataKey="close"
                                stroke="#4CAF50"
                                strokeWidth={2}
                                dot={<CustomDot />}
                                name="Close"
                            />

                            {/* Reference area for zoom */}
                            {refAreaLeft && refAreaRight && (
                                <ReferenceArea
                                    x1={refAreaLeft}
                                    x2={refAreaRight}
                                    strokeOpacity={0.3}
                                    fill="#4CAF50"
                                    fillOpacity={0.3}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
