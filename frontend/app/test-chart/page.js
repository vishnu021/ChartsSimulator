'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/AppStateContext';
import { PageLayout } from '@/components/layout/PageLayout';

const CandleChart = dynamic(() => import('@/components/CandleChart'), {
  ssr: false,
  loading: () => <div>Loading chart...</div>
});

export default function TestChartPage() {
  const { theme } = useAppState();
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Generate mock data directly
    const candles = [];
    const basePrice = 20000;
    const startTime = new Date('2024-11-20T09:15:00').getTime();

    for (let i = 0; i < 375; i++) {
      const time = new Date(startTime + i * 60000);
      const open = basePrice + Math.random() * 200 - 100;
      const close = open + Math.random() * 100 - 50;
      const high = Math.max(open, close) + Math.random() * 50;
      const low = Math.min(open, close) - Math.random() * 50;
      const volume = Math.floor(Math.random() * 10000) + 1000;

      candles.push({
        time: time.toISOString(),
        open,
        high,
        low,
        close,
        volume
      });
    }

    const wyckoffPhases = [
      {
        phase: 'ACCUMULATION',
        subPhase: 'PS',
        startIndex: 0,
        endIndex: 50,
        description: 'Preliminary Support'
      },
      {
        phase: 'ACCUMULATION',
        subPhase: 'SC',
        startIndex: 51,
        endIndex: 100,
        description: 'Selling Climax'
      },
      {
        phase: 'ACCUMULATION',
        subPhase: 'AR',
        startIndex: 101,
        endIndex: 150,
        description: 'Automatic Rally'
      },
      {
        phase: 'MARKUP',
        subPhase: 'SOS',
        startIndex: 151,
        endIndex: 250,
        description: 'Sign of Strength'
      },
      {
        phase: 'DISTRIBUTION',
        subPhase: 'PSY',
        startIndex: 251,
        endIndex: 374,
        description: 'Preliminary Supply'
      }
    ];

    setChartData({
      candles,
      wyckoffPhases,
      currentPhase: 'DISTRIBUTION',
      symbol: 'TEST'
    });
    setIsLoading(false);
  }, []);

  return (
    <PageLayout
      theme={theme}
      title="Test Chart - Visibility Check"
      loading={isLoading}
      loadingMessage="Loading test data..."
    >
      {chartData ? (
        <CandleChart data={chartData} theme={theme} />
      ) : (
        <div>No data loaded</div>
      )}
    </PageLayout>
  );
}
