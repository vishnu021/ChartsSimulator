'use client';

import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/AppStateContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import ControlPanel from '@/components/ControlPanel';
import { usePageState } from '@/hooks/common/usePageState';

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
    const { theme, toggleTheme } = useAppState();
    const {
        data,
        error,
        isLoading,
        handleLoadStart,
        handleLoadSuccess,
        handleLoadError,
        clearError
    } = usePageState();

    const handleLoadChart = useCallback(async ({ symbol, date }) => {
        handleLoadStart();

        try {
            const params = new URLSearchParams({ symbol, date });
            const response = await fetch(`${API_BASE_URL}/charts?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            handleLoadSuccess({
                candles: result.candlesticks,
                symbol
            });
        } catch (error) {
            console.error('Error loading chart:', error);
            handleLoadError('Failed to load chart data');
        }
    }, [handleLoadStart, handleLoadSuccess, handleLoadError]);

    const renderControls = () => (
        <ControlPanel
            onSubmit={handleLoadChart}
            theme={theme}
            onThemeToggle={toggleTheme}
            hideLookbackPeriod={true}
        />
    );

    const renderSubtitle = () => {
        if (!data) return null;

        const textColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';

        return (
            <span className={textColor}>
                Total: {data.candles?.length || 0} candles
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

    const handleErrorDismiss = useCallback(() => {
        console.log('Dismissing error'); // Debug log
        clearError();
    }, [clearError]);

    return (
        <PageLayout
            theme={theme}
            title={data?.symbol || 'Candlestick Chart'}
            subtitle={renderSubtitle()}
            controls={renderControls()}
            error={error}
            onErrorDismiss={handleErrorDismiss} // Use the callback wrapper
            loading={isLoading}
            loadingMessage="Loading chart data..."
        >
            {data ? (
                <div className="flex-1 min-h-0">
                    <CandleChart data={data} theme={theme} />
                </div>
            ) : (
                renderEmptyState()
            )}
        </PageLayout>
    );
}
