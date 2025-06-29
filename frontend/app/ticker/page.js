
// frontend/app/ticker/page.js
'use client';

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';
import { tickerService } from '@/services/tickerService';

const TickerChart = dynamic(() => import('@/components/TickerChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Loading ticker...
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
    const loadingRef = useRef(false);

    const handleLoadTicker = useCallback(({ symbol, date }) => {
        if (loadingRef.current || tickerService.isConnecting()) {
            console.log('Request already in progress, ignoring');
            return;
        }

        loadingRef.current = true;
        setIsLoading(true);
        setError(null);
        setTickerData([]);
        setCurrentSymbol(symbol);

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

    return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ControlPanel
                onSubmit={handleLoadTicker}
                theme={theme}
                onThemeToggle={toggleTheme}
                hideLookbackPeriod={true}
            />

            {error && (
                <div className="mx-4 mt-2 p-3 bg-red-500 text-white rounded-lg text-sm">
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
                <div className="mx-4 mt-2 p-3 bg-blue-500 text-white rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading ticker data...
                    </div>
                </div>
            )}

            {tickerData.length > 0 ? (
                <TickerChart
                    data={tickerData}
                    theme={theme}
                    symbol={currentSymbol}
                />
            ) : (
                <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="text-center p-4">
                        <div className="text-4xl mb-4">⚡</div>
                        <p className="text-lg md:text-xl mb-2">No ticker data loaded</p>
                        <p className="text-sm md:text-base">Enter a symbol and date to view real-time tick data</p>
                    </div>
                </div>
            )}
        </div>
    );
}
