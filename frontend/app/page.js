'use client';

import React, { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';
import { chartService } from '@/services/chartService';

const Chart = dynamic(() => import('@/components/Chart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Loading chart...
            </div>
        </div>
    )
});

export default function Page() {
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);
    const loadingRef = useRef(false);

    const handleLoadChart = useCallback(({ symbol, date, lookbackPeriod }) => {
        // Prevent multiple simultaneous requests
        if (loadingRef.current || chartService.isConnecting()) {
            console.log('Request already in progress, ignoring');
            return;
        }

        loadingRef.current = true;
        setIsLoading(true);
        setError(null);
        setChartData(null);

        // Disconnect any existing connection first
        chartService.disconnect();

        // Small delay to ensure clean disconnection
        setTimeout(() => {
            try {
                chartService.connectAndStream(
                    symbol,
                    date,
                    lookbackPeriod,
                    (data) => {
                        setChartData({ ...data, symbol });
                        // Don't set loading to false here as data streams in
                    },
                    (err) => {
                        console.error('Chart service error:', err);
                        setError(err);
                        setIsLoading(false);
                        loadingRef.current = false;
                    }
                );

                // Set a timeout to stop loading state after reasonable time
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
    }, []);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            console.log('Page component unmounting, disconnecting WebSocket');
            chartService.disconnect();
            loadingRef.current = false;
        };
    }, []);

    // Also cleanup when the component is about to re-render with new data
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            chartService.disconnect();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ControlPanel
                onSubmit={handleLoadChart}
                theme={theme}
                onThemeToggle={toggleTheme}
            />

            {error && (
                <div className="mx-2 md:mx-4 mt-2 md:mt-4 p-3 bg-red-500 text-white rounded-lg text-sm">
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
                <div className="mx-2 md:mx-4 mt-2 p-3 bg-blue-500 text-white rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading chart data...
                    </div>
                </div>
            )}

            {chartData ? (
                <Chart data={chartData} theme={theme} />
            ) : (
                <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="text-center p-4">
                        <div className="text-4xl mb-4">📈</div>
                        <p className="text-lg md:text-xl mb-2">No chart loaded</p>
                        <p className="text-sm md:text-base">Enter a symbol and date above to load chart data</p>
                    </div>
                </div>
            )}
        </div>
    );
}
