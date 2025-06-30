'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';
import { tickerService } from '@/services/tickerService';

// Dynamically import the TickerChart component
const TickerChart = dynamic(() => import('@/components/TickerChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Loading ticker chart...
            </div>
        </div>
    )
});

export default function TickerPage() {
    const [tickerData, setTickerData] = useState([]);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSymbol, setCurrentSymbol] = useState('');
    const [isRealTime, setIsRealTime] = useState(false);
    const loadingRef = useRef(false);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!tickerData || tickerData.length === 0) {
            return {
                currentPrice: 0,
                change: 0,
                volume: 0,
                high: 0,
                low: 0,
                count: 0,
                changePercent: 0
            };
        }

        const allPrices = tickerData.map(t => t.price).filter(p => !isNaN(p));
        const totalVolume = tickerData.map(t => t.volume).filter(v => !isNaN(v)).reduce((sum, v) => sum + v, 0);
        const currentPrice = allPrices[allPrices.length - 1] || 0;
        const startPrice = allPrices[0] || 0;
        const change = currentPrice - startPrice;
        const changePercent = startPrice !== 0 ? (change / startPrice) * 100 : 0;

        return {
            currentPrice,
            change,
            changePercent,
            volume: totalVolume,
            high: allPrices.length > 0 ? Math.max(...allPrices) : 0,
            low: allPrices.length > 0 ? Math.min(...allPrices) : 0,
            count: tickerData.length
        };
    }, [tickerData]);

    const handleLoadTicker = useCallback(({ symbol, date }) => {
        setCurrentSymbol(symbol);

        if (isRealTime) {
            if (loadingRef.current || tickerService.isConnecting()) {
                console.log('Request already in progress, ignoring');
                return;
            }

            loadingRef.current = true;
            setIsLoading(true);
            setError(null);
            setTickerData([]);

            tickerService.disconnect();

            setTimeout(() => {
                try {
                    tickerService.connectAndStream(
                        symbol,
                        date,
                        (tick) => {
                            if (tick && tick.time && typeof tick.price === 'number') {
                                console.log('Real-time tick received:', tick.price);
                                setTickerData(prev => {
                                    const newData = [...prev, tick];
                                    return newData.length > 10000 ? newData.slice(-10000) : newData;
                                });
                            }
                        },
                        (err) => {
                            console.error('Ticker service error:', err);
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
                    console.error('Error loading ticker:', error);
                    setError('Failed to load ticker data');
                    setIsLoading(false);
                    loadingRef.current = false;
                }
            }, 100);
        } else {
            handleLoadTickerInstant({ symbol, date });
        }
    }, [isRealTime]);

    const handleLoadTickerInstant = useCallback(async ({ symbol, date }) => {
        setIsLoading(true);
        setError(null);
        setTickerData([]);

        try {
            console.log(`Loading instant ticker data for ${symbol} on ${date}`);
            const data = await tickerService.getTickerData(symbol, date);
            console.log(`Received ${data.length} ticker records`);

            const validData = data.filter(tick =>
                tick &&
                tick.time &&
                typeof tick.price === 'number' &&
                !isNaN(tick.price)
            );

            console.log(`Filtered to ${validData.length} valid ticks`);
            setTickerData(validData);
        } catch (error) {
            console.error('Error loading ticker:', error);
            setError(`Failed to load ticker data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        return () => {
            console.log('Ticker page unmounting, disconnecting WebSocket');
            tickerService.disconnect();
            loadingRef.current = false;
        };
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    const toggleMode = useCallback(() => {
        setIsRealTime(prev => !prev);
        if (isRealTime) {
            tickerService.disconnect();
            setTickerData([]);
        }
    }, [isRealTime]);

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Compact header with controls and status */}
            <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
                <div className="p-3">
                    <ControlPanel
                        onSubmit={handleLoadTicker}
                        theme={theme}
                        onThemeToggle={toggleTheme}
                        hideLookbackPeriod={true}
                        showModeToggle={true}
                        isRealTime={isRealTime}
                        onModeToggle={toggleMode}
                    />
                </div>

                {/* Compact status bar */}
                {tickerData.length > 0 && (
                    <div className="px-3 pb-3">
                        <div className="bg-gray-700 rounded-lg p-3">
                            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                                {/* Symbol and mode */}
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-bold text-white">
                                        {currentSymbol}
                                    </h2>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        isRealTime ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                                    }`}>
                                        {isRealTime ? '⚡ LIVE' : '📊 INSTANT'}
                                    </span>
                                </div>

                                {/* Key stats in one line */}
                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400">Current</div>
                                        <div className="font-bold text-white text-lg">
                                            ₹{stats.currentPrice.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400">Change</div>
                                        <div className={`font-semibold ${stats.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {stats.change >= 0 ? '+' : ''}₹{stats.change.toFixed(2)}
                                            <span className="text-xs ml-1">
                                                ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400">Range</div>
                                        <div className="text-white text-sm">
                                            ₹{stats.low.toFixed(2)} - ₹{stats.high.toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400">Volume</div>
                                        <div className="text-white font-medium">
                                            {stats.volume.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400">Data</div>
                                        <div className="text-blue-400 font-medium text-xs">
                                            {stats.count.toLocaleString()} ticks
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-400">Chart</div>
                                        <div className="text-yellow-400 font-medium text-xs">
                                            📊 + 📈 Combined
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Error and loading messages */}
            {error && (
                <div className="flex-shrink-0 mx-4 mt-2 p-3 bg-red-500 text-white rounded-lg text-sm">
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
                <div className="flex-shrink-0 mx-4 mt-2 p-3 bg-blue-500 text-white rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {isRealTime ? 'Connecting to real-time feed...' : 'Loading ticker data...'}
                    </div>
                </div>
            )}

            {/* Main chart area - takes up most of the space */}
            <div className="flex-1 min-h-0 p-4">
                {tickerData.length > 0 ? (
                    <div className="h-full rounded-lg overflow-hidden shadow-lg">
                        <TickerChart
                            data={tickerData}
                            theme={theme}
                            symbol={currentSymbol}
                            stats={stats}
                            isRealTime={isRealTime}
                        />
                    </div>
                ) : (
                    <div className={`h-full flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div className="text-center">
                            <div className="text-6xl mb-6">⚡</div>
                            <h2 className="text-2xl font-bold mb-4">Real-time Ticker + Candlestick Chart</h2>
                            <p className="text-lg mb-2">Enter a symbol and date above to start</p>
                            <p className="text-sm opacity-75 mb-3">
                                View both tick-by-tick price movements and 1-minute candlesticks
                            </p>
                            <p className="text-sm opacity-75">
                                Use {isRealTime ? '⚡ Real-time' : '📊 Instant'} mode for live updates
                            </p>
                            {isRealTime && (
                                <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg max-w-md mx-auto">
                                    <p className="text-sm text-blue-300">
                                        💡 Real-time mode shows candles forming live as ticks arrive
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
