'use client';

import React from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ChartPanel } from '@/components/charts';

export default function ExtremaPage() {
  return (
    <PageLayout>
      <ChartPanel
        chartType="extrema"
        showControls={true}
        showStats={true}
        showModeToggle={true}
        showThemeToggle={true}
      />
    </PageLayout>
  );
}
