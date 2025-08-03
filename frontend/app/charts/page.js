'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/AppStateContext';
import { PageLayout } from '@/components/layout/PageLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import ControlPanel from '@/components/ControlPanel';

const CombinedChart = dynamic(() => import('@/components/CombinedChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                Loading charts...
            </div>
        </div>
    )
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ChartsPage() {
    const { theme, toggleTheme } = useAppState();
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadChart = useCallback(async ({ symbol, date }) => {
        setIsLoading(true);
        setError(null);
        setChartData(null);

        try {
            const params = new URLSearchParams({
                symbol,
                date,
                chartTypes: 'CANDLESTICK,HEIKIN_ASHI'
            });
            const response = await fetch(`${API_BASE_URL}/charts?${params}`);

            if (!response.ok) {
                // Try to get detailed error information from response
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { 
                        message: `HTTP error! status: ${response.status}`,
                        context: { symbol, date, httpStatusCode: response.status }
                    };
                }
                console.error('Error loading charts:', errorData);
                setError(JSON.stringify(errorData));
                return;
            }

            const data = await response.json();
            setChartData({ ...data, symbol });
        } catch (error) {
            console.error('Error loading charts:', error);
            const errorData = {
                message: 'Failed to load chart data: ' + error.message,
                context: { symbol, date, error: error.message }
            };
            setError(JSON.stringify(errorData));
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


    const renderEmptyState = () => (
        <EmptyState
            icon="📉"
            title="No charts loaded"
            description="Enter a symbol and date to compare chart types"
            theme={theme}
        />
    );

    return (
        <PageLayout
            theme={theme}
            title={chartData?.symbol || 'Combined Chart'}
            controls={renderControls()}
            error={error}
            onErrorDismiss={() => setError(null)}
            loading={isLoading}
            loadingMessage="Loading chart comparison..."
        >
            {chartData ? (
                <div className="flex-1 min-h-0">
                    <CombinedChart data={chartData} theme={theme} />
                </div>
            ) : (
                renderEmptyState()
            )}
        </PageLayout>
    );
}
