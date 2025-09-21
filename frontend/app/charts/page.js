'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PageLayout } from '@/components/layout/PageLayout';

const ChartPanel = dynamic(() => import('@/components/charts').then(mod => ({ default: mod.ChartPanel })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4">
        </div>
        Loading chart...
      </div>
    </div>
  ),
});

export default function ChartsPage() {
  return (
    <PageLayout>
      <ChartPanel
        chartType="combined"
        showControls={true}
        showStats={true}
        showModeToggle={false}
        showThemeToggle={true}
      />
    </PageLayout>
  );
}
