// components/ClientOnlyChart.jsx
'use client';
import dynamic from 'next/dynamic';

// now this is in a Client Component, so ssr: false is allowed
const Chart = dynamic(() => import('@/components/Chart'), { ssr: false });

export default function ClientOnlyChart() {
    return <Chart />;
}
