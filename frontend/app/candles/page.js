// frontend/app/candles/page.js
'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';

const CandleChart = dynamic(() => import('@/components/CandleChart'), {
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

export default function CandlesPage() {
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadChart = useCallback(async ({ symbol, date }) => {
        setIsLoading(true);
        setError(null);
        setChartData(null);

        try {
            const params = new URLSearchParams({ symbol, date });
            const response = await fetch(`${API_BASE_URL}/charts?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setChartData({
                candles: data.candlesticks,
                symbol
            });
        } catch (error) {
            console.error('Error loading chart:', error);
            setError('Failed to load chart data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    }, []);

    return (
        <div className={`flex flex-col h-[calc(100vh-4rem)] ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex-shrink-0 p-4">
                <ControlPanel
                    onSubmit={handleLoadChart}
                    theme={theme}
                    onThemeToggle={toggleTheme}
                    hideLookbackPeriod={true}
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
                        Loading chart data...
                    </div>
                </div>
            )}

            {chartData ? (
                <div className="flex-1 min-h-0">
                    <CandleChart data={chartData} theme={theme} />
                </div>
            ) : (
                <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="text-center p-4">
                        <div className="text-4xl mb-4">📊</div>
                        <p className="text-lg md:text-xl mb-2">No chart loaded</p>
                        <p className="text-sm md:text-base">Enter a symbol and date above to load candlestick data</p>
                    </div>
                </div>
            )}
        </div>
    );
}
