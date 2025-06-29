// frontend/app/ticker/page.js
'use client';

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';
import { tickerService } from '@/services/tickerService';

const TickerChart = dynamic(() => import('@/components/TickerChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Loading ticker...
            </div>
        </div>
    )
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';

export default function TickerPage() {
    const [tickerData, setTickerData] = useState([]);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);
    const [currentSymbol, setCurrentSymbol] = useState('');
    const [isRealTime, setIsRealTime] = useState(false);
    const loadingRef = useRef(false);

    const handleLoadTicker = useCallback(({ symbol, date }) => {
        setCurrentSymbol(symbol);

        if (isRealTime) {
            // WebSocket real-time mode
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
                            setTickerData(prev => [...prev, tick]);
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
            // API instant mode
            handleLoadTickerInstant({ symbol, date });
        }
    }, [isRealTime]);

    const handleLoadTickerInstant = useCallback(async ({ symbol, date }) => {
        setIsLoading(true);
        setError(null);
        setTickerData([]);

        try {
            const params = new URLSearchParams({ symbol, date });
            const response = await fetch(`${API_BASE_URL}/ticker?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setTickerData(data);
        } catch (error) {
            console.error('Error loading ticker:', error);
            setError('Failed to load ticker data');
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
        // Disconnect WebSocket when switching to instant mode
        if (isRealTime) {
            tickerService.disconnect();
        }
    }, [isRealTime]);

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex-shrink-0 p-4">
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
                        Loading ticker data...
                    </div>
                </div>
            )}

            {tickerData.length > 0 ? (
                <div className="flex-1 min-h-0">
                    <TickerChart
                        data={tickerData}
                        theme={theme}
                        symbol={currentSymbol}
                    />
                </div>
            ) : (
                <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="text-center p-4">
                        <div className="text-4xl mb-4">⚡</div>
                        <p className="text-lg md:text-xl mb-2">No ticker data loaded</p>
                        <p className="text-sm md:text-base">
                            Enter a symbol and date. Use {isRealTime ? '⚡ Real-time' : '📊 Instant'} mode.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
