'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/contexts/AppStateContext';

export default function HomePage() {
    const router = useRouter();
    const { theme } = useAppState();

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

    // Theme-aware styles
    const themeStyles = {
        dark: {
            background: 'bg-gray-900 text-white',
            card: 'bg-gray-800 hover:bg-gray-700',
            description: 'text-gray-400'
        },
        light: {
            background: 'bg-gray-50 text-gray-800',
            card: 'bg-gray-100 hover:bg-gray-200',
            description: 'text-gray-600'
        }
    };

    const currentTheme = themeStyles[theme];

    return (
        <div className={`min-h-screen p-8 ${currentTheme.background}`}>
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature) => (
                        <div
                            key={feature.path}
                            onClick={() => router.push(feature.path)}
                            className={`rounded-lg p-6 cursor-pointer transition-all transform hover:scale-105 ${currentTheme.card}`}
                        >
                            <div className="text-4xl mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className={`text-sm ${currentTheme.description}`}>{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
