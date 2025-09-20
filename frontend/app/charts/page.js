'use client';

import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ChartPanel } from '@/components/charts';

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
