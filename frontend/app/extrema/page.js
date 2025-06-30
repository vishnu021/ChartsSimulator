// frontend/app/extrema/page.js
'use client';

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';
import { chartService } from '@/services/chartService';

const Chart = dynamic(() => import('@/components/Chart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Loading chart...
            </div>
        </div>
    )
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';

export default function ExtremaPage() {
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);
    const [isRealTime, setIsRealTime] = useState(false);
    const loadingRef = useRef(false);

    const handleLoadChart = useCallback(({ symbol, date, lookbackPeriod }) => {
        if (isRealTime) {
            // WebSocket real-time mode
            if (loadingRef.current || chartService.isConnecting()) {
                console.log('Request already in progress, ignoring');
                return;
            }

            loadingRef.current = true;
            setIsLoading(true);
            setError(null);
            setChartData(null);

            chartService.disconnect();

            setTimeout(() => {
                try {
                    chartService.connectAndStream(
                        symbol,
                        date,
                        lookbackPeriod,
                        (data) => {
                            console.log(`Received extrema update: ${data.candles?.length} candles, ${data.maxima?.length} maxima, ${data.minima?.length} minima`);
                            setChartData({ ...data, symbol });
                        },
                        (err) => {
                            console.error('Chart service error:', err);
                            setError(err);
                            setIsLoading(false);
                            loadingRef.current = false;
                        }
                    );

                    setTimeout(() => {
                        setIsLoading(false);
                        loadingRef.current = false;
                    }, 2000);

                } catch (error) {
                    console.error('Error loading chart:', error);
                    setError('Failed to load chart data');
                    setIsLoading(false);
                    loadingRef.current = false;
                }
            }, 100);
        } else {
            // API instant mode
            handleLoadChartInstant({ symbol, date, lookbackPeriod });
        }
    }, [isRealTime]);

    const handleLoadChartInstant = useCallback(async ({ symbol, date, lookbackPeriod }) => {
        setIsLoading(true);
        setError(null);
        setChartData(null);

        try {
            const params = new URLSearchParams({ symbol, date, lookbackPeriod });
            const response = await fetch(`${API_BASE_URL}/ohlc?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Instant mode: received ${data.candles?.length} candles, ${data.maxima?.length} maxima, ${data.minima?.length} minima`);
            setChartData({ ...data, symbol });
        } catch (error) {
            console.error('Error loading extrema:', error);
            setError('Failed to load extrema data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        return () => {
            console.log('Extrema page unmounting, disconnecting WebSocket');
            chartService.disconnect();
            loadingRef.current = false;
        };
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const toggleMode = useCallback(() => {
        setIsRealTime(prev => !prev);
        // Disconnect WebSocket when switching to instant mode
        if (isRealTime) {
            chartService.disconnect();
            setChartData(null); // Clear data when switching modes
        }
    }, [isRealTime]);

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex-shrink-0 p-4">
                <ControlPanel
                    onSubmit={handleLoadChart}
                    theme={theme}
                    onThemeToggle={toggleTheme}
                    showModeToggle={true}
                    isRealTime={isRealTime}
                    onModeToggle={toggleMode}
                />
            </div>

            {error && (
                <div className="flex-shrink-0 mx-4 p-3 bg-red-500 text-white rounded-lg text-sm">
                    <strong>Error:</strong> {error}
                    <button
                        onClick={() => setError(null)}
                        className="ml-3 text-red-200 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="flex-shrink-0 mx-4 p-3 bg-blue-500 text-white rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {isRealTime ? 'Connecting to real-time extrema feed...' : 'Loading extrema analysis...'}
                    </div>
                </div>
            )}

            {/* Status Info */}
            {chartData && (
                <div className="flex-shrink-0 mx-4 mb-2">
                    <div className={`p-2 rounded text-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'}`}>
                        <span style={{ color: theme === 'dark' ? '#10b981' : '#059669' }}>
                            {isRealTime ? '⚡ Real-time:' : '📊 Instant:'} {chartData.candles?.length || 0} candles
                        </span>
                        <span className="ml-4" style={{ color: theme === 'dark' ? '#fbbf24' : '#f59e0b' }}>
                            {chartData.maxima?.length || 0} maxima
                        </span>
                        <span className="ml-4" style={{ color: theme === 'dark' ? '#f472b6' : '#ec4899' }}>
                            {chartData.minima?.length || 0} minima
                        </span>
                        {isRealTime && (
                            <span className="ml-4" style={{ color: theme === 'dark' ? '#3b82f6' : '#2563eb' }}>
                                Streaming live updates...
                            </span>
                        )}
                    </div>
                </div>
            )}

            {chartData ? (
                <div className="flex-1 min-h-0">
                    <Chart data={chartData} theme={theme} />
                </div>
            ) : (
                <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="text-center p-4">
                        <div className="text-4xl mb-4">📈</div>
                        <p className="text-lg md:text-xl mb-2">No extrema analysis loaded</p>
                        <p className="text-sm md:text-base">
                            Enter a symbol and date above. Use {isRealTime ? '⚡ Real-time' : '📊 Instant'} mode.
                        </p>
                        {isRealTime && (
                            <p className="text-xs mt-2 text-blue-400">
                                Real-time mode: Extrema analysis will update as new candles are processed
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
