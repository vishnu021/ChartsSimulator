'use client';

import React, { useState } from 'react';
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

      const handleLoadChart = ({ symbol, date, lookbackPeriod }) => {
            setError(null);
            setChartData(null);
            chartService.connectAndStream(
                  symbol,
                  date,
                  lookbackPeriod,
                  (data) => setChartData({ ...data, symbol }),
                  (err) => setError(err)
            );
          };

    React.useEffect(() => {
        return () => chartService.disconnect();
    }, []);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <div className={`h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <ControlPanel
                onSubmit={handleLoadChart}
                theme={theme}
                onThemeToggle={toggleTheme}
            />

            {error && (
                <div className="mx-4 mt-4 p-4 bg-red-500 text-white rounded-lg">
                    Error: {error}
                </div>
            )}

            {chartData ? (
                <Chart data={chartData} theme={theme} />
            ) : (
                <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div className="text-center">
                        <p className="text-xl mb-2">No chart loaded</p>
                        <p>Enter a symbol and date above to load chart data</p>
                    </div>
                </div>
            )}
        </div>
    );
}
