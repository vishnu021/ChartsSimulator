'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/hooks/useTheme';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CandlesPage() {
    const { theme, toggleTheme } = useTheme();
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);
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

    const renderControls = () => (
        <ControlPanel
            onSubmit={handleLoadChart}
            theme={theme}
            onThemeToggle={toggleTheme}
            hideLookbackPeriod={true}
        />
    );

    const renderSubtitle = () => {
        if (!chartData) return null;

        const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

        return (
            <span className={textColor}>
                Total: {chartData.candles?.length || 0} candles
            </span>
        );
    };

    const renderEmptyState = () => (
        <EmptyState
            icon="📊"
            title="No chart loaded"
            description="Enter a symbol and date above to load candlestick data"
            theme={theme}
        />
    );

    return (
        <PageLayout
            theme={theme}
            title={chartData?.symbol || 'Candlestick Chart'}
            subtitle={renderSubtitle()}
            controls={renderControls()}
            error={error}
            onErrorDismiss={() => setError(null)}
            loading={isLoading}
            loadingMessage="Loading chart data..."
        >
            {chartData ? (
                <div className="flex-1 min-h-0">
                    <CandleChart data={chartData} theme={theme} />
                </div>
            ) : (
                renderEmptyState()
            )}
        </PageLayout>
    );
}
