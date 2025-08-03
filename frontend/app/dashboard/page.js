'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import CandleChart from '@/components/CandleChart';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Simple chart component
const SimpleChart = ({ index, theme, globalDate }) => {
    const [stockData, setStockData] = useState(null);
    const [symbol, setSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load symbol from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`dashboard_symbol_${index}`);
            if (saved) setSymbol(saved);
        }
    }, [index]);

    const loadData = useCallback(async (stockSymbol, date) => {
        if (!stockSymbol || !date) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({ symbol: stockSymbol, date });
            const response = await fetch(`${API_BASE_URL}/charts?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            setStockData({
                candles: result.candlesticks,
                symbol: stockSymbol
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Listen for load all event
    useEffect(() => {
        const handleLoadAll = (event) => {
            if (symbol && event.detail.date) {
                loadData(symbol, event.detail.date);
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('loadAllCharts', handleLoadAll);
            return () => window.removeEventListener('loadAllCharts', handleLoadAll);
        }
    }, [symbol, loadData]);

    const handleSymbolChange = (e) => {
        const newSymbol = e.target.value;
        setSymbol(newSymbol);
        if (typeof window !== 'undefined') {
            localStorage.setItem(`dashboard_symbol_${index}`, newSymbol);
        }
    };

    const handleLoad = () => {
        if (symbol && globalDate) {
            setStockData(null);
            loadData(symbol, globalDate);
        }
    };

    const colors = {
        dark: { bg: '#1e293b', border: '#475569', text: '#f1f5f9', input: '#0f172a' },
        light: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', input: '#f9fafb' }
    };
    const c = colors[theme];

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: c.bg }}>
            <div className="p-2 border-b flex items-center gap-2" style={{ borderColor: c.border }}>
                <input
                    type="text"
                    value={symbol}
                    onChange={handleSymbolChange}
                    placeholder={`Symbol ${index + 1}`}
                    className="flex-1 px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: c.input, border: `1px solid ${c.border}`, color: c.text }}
                />
                <button
                    onClick={handleLoad}
                    disabled={isLoading || !symbol}
                    className="px-3 py-1 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? '⏳' : '⚡'}
                </button>
            </div>
            <div className="flex-1 relative">
                {error ? (
                    <div className="flex items-center justify-center h-full text-red-400">
                        <div className="text-center">
                            <div>❌</div>
                            <div className="text-xs mt-1">Error loading data</div>
                        </div>
                    </div>
                ) : stockData ? (
                    <CandleChart data={stockData} theme={theme} />
                ) : (
                    <div className="flex items-center justify-center h-full" style={{ color: c.text }}>
                        <div className="text-center">
                            <div>📊</div>
                            <div className="text-sm mt-1">Enter symbol and click ⚡</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function DashboardPage() {
    const { theme, toggleTheme, date, updateDate } = useAppState();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const loadAllCharts = () => {
        const event = new CustomEvent('loadAllCharts', { detail: { date } });
        window.dispatchEvent(event);
    };

    const resetAllCharts = () => {
        for (let i = 0; i < 4; i++) {
            localStorage.removeItem(`dashboard_symbol_${i}`);
        }
        setRefreshTrigger(prev => prev + 1);
    };

    const colors = {
        dark: { bg: '#0f172a', panel: '#1e293b', border: '#475569', text: '#f1f5f9' },
        light: { bg: '#f9fafb', panel: '#f3f4f6', border: '#d1d5db', text: '#374151' }
    };
    const c = colors[theme];

    return (
        <div className="h-screen flex flex-col" style={{ backgroundColor: c.bg, paddingTop: '4rem' }}>
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b" style={{ backgroundColor: c.panel, borderColor: c.border }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold" style={{ color: c.text }}>
                        📋 Multi-Stock Dashboard
                    </h1>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => updateDate(e.target.value)}
                            className="px-3 py-1 rounded border"
                            style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                        />
                        <button
                            onClick={loadAllCharts}
                            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                            title="Load All Charts"
                        >
                            ⚡📊
                        </button>
                        <button
                            onClick={resetAllCharts}
                            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                            title="Reset All"
                        >
                            🧹
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="px-3 py-1 rounded border"
                            style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart Grid */}
            <div className="flex-1 p-4">
                <div className="grid grid-cols-2 gap-4 h-full">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={`${index}-${refreshTrigger}`}
                            className="border rounded-lg overflow-hidden"
                            style={{ backgroundColor: c.panel, borderColor: c.border }}
                        >
                            <SimpleChart index={index} theme={theme} globalDate={date} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}