'use client';
import dynamic from 'next/dynamic';

// Import with no SSR to avoid hydration errors
const Chart = dynamic(() => import('./Chart'), {
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

export default function ClientOnlyChart() {
    return <Chart />;
}
