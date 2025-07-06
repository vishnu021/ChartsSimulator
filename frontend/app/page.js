'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
    const router = useRouter();

    const features = [
        {
            title: 'Candlestick Charts',
            description: 'View raw candlestick data with interactive controls',
            path: '/candles',
            icon: '📊'
        },
        {
            title: 'Extrema Analysis',
            description: 'Analyze maxima and minima points with real-time calculations',
            path: '/extrema',
            icon: '📈'
        },
        {
            title: 'Multi-Chart View',
            description: 'Compare different chart types including Heikin Ashi',
            path: '/charts',
            icon: '📉'
        },
        {
            title: 'Ticker Data',
            description: 'Real-time tick-by-tick data visualization',
            path: '/ticker',
            icon: '⚡'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature) => (
                        <div
                            key={feature.path}
                            onClick={() => router.push(feature.path)}
                            className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-700 transition-all transform hover:scale-105"
                        >
                            <div className="text-4xl mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-gray-400 text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
