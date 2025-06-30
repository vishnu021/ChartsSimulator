// frontend/app/layout.js
'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';
import './globals.css';
import { chartService } from '@/services/chartService';
import { tickerService } from '@/services/tickerService';

export default function RootLayout({ children }) {
    const pathname = usePathname();

    // Only cleanup on major route changes (between different chart types)
    useEffect(() => {
        console.log('Route changed to:', pathname);

        // Only disconnect when moving between different chart types
        // to avoid interrupting data loading on the same page
        const cleanupConnections = () => {
            // Only cleanup if moving to a completely different section
            if (pathname === '/' || pathname.includes('candles') || pathname.includes('charts')) {
                // These pages don't use the real-time WebSocket services
                if (chartService.isConnected()) {
                    console.log('Cleaning up chart service for non-real-time page');
                    chartService.disconnect();
                }
                if (tickerService.isConnected()) {
                    console.log('Cleaning up ticker service for non-ticker page');
                    tickerService.disconnect();
                }
            }
        };

        // Add a delay to avoid interrupting page transitions
        const timeoutId = setTimeout(cleanupConnections, 1000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [pathname]);

    // Global cleanup only on complete app unmount
    useEffect(() => {
        return () => {
            console.log('App unmounting, final cleanup');
            try {
                chartService.disconnect();
                tickerService.disconnect();
            } catch (error) {
                console.warn('Error during final cleanup:', error);
            }
        };
    }, []);

    return (
        <html lang="en">
        <head>
            <title>Charts Simulator</title>
            <meta name="description" content="Advanced candlestick chart analysis with real-time data" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="bg-gray-900 text-white min-h-screen">
        <div className="flex flex-col min-h-screen">
            <Navigation />
            <main className="flex-1 pt-16">
                {children}
            </main>
        </div>
        </body>
        </html>
    );
}
