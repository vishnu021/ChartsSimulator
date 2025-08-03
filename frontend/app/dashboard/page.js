'use client';

import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import CandleChart from '@/components/CandleChart';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Sync context for chart synchronization
const SyncContext = createContext();

const useSyncContext = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncContext must be used within SyncProvider');
    }
    return context;
};

const SyncProvider = ({ children }) => {
    const [syncState, setSyncState] = useState({
        zoom: 1,
        offset: 0,
        isDragging: false
    });

    const updateSyncState = useCallback((newState) => {
        setSyncState(prev => ({ ...prev, ...newState }));
    }, []);

    // Listen for reset zoom event
    useEffect(() => {
        const handleResetZoom = () => {
            setSyncState({ zoom: 1, offset: 0, isDragging: false });
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resetZoom', handleResetZoom);
            return () => window.removeEventListener('resetZoom', handleResetZoom);
        }
    }, []);

    return (
        <SyncContext.Provider value={{ syncState, updateSyncState }}>
            {children}
        </SyncContext.Provider>
    );
};

// Synchronized Chart Component
const SyncedChart = ({ data, theme, chartId }) => {
    const { syncState, updateSyncState } = useSyncContext();
    const chartRef = useRef(null);
    
    const syncedViewState = {
        zoom: syncState.zoom,
        offset: syncState.offset,
        targetOffset: syncState.offset,
        velocity: 0
    };

    // Handle synchronized zoom and pan
    useEffect(() => {
        const chartElement = chartRef.current;
        if (!chartElement || !data) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = chartElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const chartWidth = rect.width - 100;
            const mouseRatio = (x - 50) / chartWidth;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            // Prevent zoom below 100% (1.0)
            const newZoom = Math.max(1.0, Math.min(20, syncState.zoom * zoomFactor));

            const totalWidth = chartWidth * syncState.zoom;
            const newTotalWidth = chartWidth * newZoom;
            const widthChange = newTotalWidth - totalWidth;

            const newOffset = syncState.offset - widthChange * mouseRatio;
            const maxOffset = 0;
            const minOffset = Math.min(0, chartWidth - newTotalWidth);
            const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));

            updateSyncState({
                zoom: newZoom,
                offset: clampedOffset
            });
        };

        const handleMouseDown = (e) => {
            updateSyncState({ isDragging: true });
            const startX = e.clientX;
            const startOffset = syncState.offset;

            const handleMouseMove = (e) => {
                const dx = e.clientX - startX;
                const newOffset = startOffset + dx;
                updateSyncState({ offset: newOffset });
            };

            const handleMouseUp = () => {
                updateSyncState({ isDragging: false });
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        };

        chartElement.addEventListener('wheel', handleWheel, { passive: false });
        chartElement.addEventListener('mousedown', handleMouseDown);

        return () => {
            chartElement.removeEventListener('wheel', handleWheel);
            chartElement.removeEventListener('mousedown', handleMouseDown);
        };
    }, [data, syncState, updateSyncState]);

    if (!data) return null;

    return (
        <div ref={chartRef} className="w-full h-full">
            <CandleChart 
                data={data} 
                theme={theme}
                externalViewState={syncedViewState}
            />
        </div>
    );
};

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
            <div className="p-1 border-b flex items-center gap-1" style={{ borderColor: c.border }}>
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
                    <SyncedChart data={stockData} theme={theme} chartId={index} />
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
        <SyncProvider>
            <div className="h-screen flex flex-col" style={{ backgroundColor: c.bg }}>
                {/* Header */}
                <div className="flex-shrink-0 p-2 border-b" style={{ backgroundColor: c.panel, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold" style={{ color: c.text }}>
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
                <div className="flex-1 p-2 min-h-0">
                    <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full w-full" style={{ minHeight: '400px' }}>
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={`${index}-${refreshTrigger}`}
                                className="border rounded-lg overflow-hidden flex flex-col"
                                style={{ 
                                    backgroundColor: c.panel, 
                                    borderColor: c.border,
                                    minHeight: '200px',
                                    height: '100%',
                                    width: '100%'
                                }}
                            >
                                <SimpleChart index={index} theme={theme} globalDate={date} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </SyncProvider>
    );
}