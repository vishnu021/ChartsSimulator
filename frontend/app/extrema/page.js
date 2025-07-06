'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useChartData } from '@/hooks/useChartData';
import { useTheme } from '@/hooks/useTheme';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsBar } from '@/components/ui/StatsBar';
import ControlPanel from '@/components/ControlPanel';

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

export default function ExtremaPage() {
    const { theme, toggleTheme } = useTheme();
    const {
        isRealTime,
        realTimeData,
        realTimeLoading,
        realTimeError,
        instantData,
        instantLoading,
        instantError,
        loadData,
        toggleMode,
        clearErrors
    } = useChartData();

    // Get current data based on mode
    const currentData = isRealTime ? realTimeData : instantData;
    const isLoading = isRealTime ? realTimeLoading : instantLoading;
    const error = isRealTime ? realTimeError : instantError;

    // Generate stats for display
    const generateStatsData = () => {
        if (!currentData) return [];

        return [
            {
                label: isRealTime ? '⚡ Real-time' : '📊 Instant',
                value: `${currentData.candles?.length || 0} candles`,
                color: 'text-green-400'
            },
            {
                label: 'Maxima',
                value: currentData.maxima?.length || 0,
                color: 'text-yellow-400'
            },
            {
                label: 'Minima',
                value: currentData.minima?.length || 0,
                color: 'text-pink-400'
            },
            ...(isRealTime ? [{
                label: 'Status',
                value: 'Streaming live updates...',
                color: 'text-blue-400'
            }] : [])
        ];
    };

    const renderControls = () => (
        <ControlPanel
            onSubmit={loadData}
            theme={theme}
            onThemeToggle={toggleTheme}
            showModeToggle={true}
            isRealTime={isRealTime}
            onModeToggle={toggleMode}
        />
    );

    const renderEmptyState = () => (
        <EmptyState
            icon="📈"
            title="No extrema analysis loaded"
            description={`Enter a symbol and date above. Use ${isRealTime ? '⚡ Real-time' : '📊 Instant'} mode.`}
            theme={theme}
            action={isRealTime && (
                <p className="text-xs mt-2 text-blue-400">
                    Real-time mode: Extrema analysis will update as new candles are processed
                </p>
            )}
        />
    );

    const renderStats = () => {
        if (!currentData) return null;
        return <StatsBar stats={generateStatsData()} theme={theme} />;
    };

    return (
        <PageLayout
            theme={theme}
            title={currentData?.symbol || 'Extrema Analysis'}
            controls={renderControls()}
            stats={renderStats()}
            error={error}
            onErrorDismiss={clearErrors}
            loading={isLoading}
            loadingMessage={isRealTime ? 'Connecting to real-time extrema feed...' : 'Loading extrema analysis...'}
        >
            {currentData ? (
                <div className="flex-1 min-h-0">
                    <Chart data={currentData} theme={theme} />
                </div>
            ) : (
                renderEmptyState()
            )}
        </PageLayout>
    );
}
