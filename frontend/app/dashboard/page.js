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

            // Improved zoom behavior - minimum 100% (1.0x), maximum 20x zoom
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(1.0, Math.min(20, syncState.zoom * zoomFactor));

            // Calculate offset adjustment to keep zoom centered on mouse position
            const totalWidth = chartWidth * syncState.zoom;
            const newTotalWidth = chartWidth * newZoom;
            const widthChange = newTotalWidth - totalWidth;

            const newOffset = syncState.offset - widthChange * mouseRatio;
            
            // Calculate proper bounds for offset
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

    const loadAllCharts = () => {
        const event = new CustomEvent('loadAllCharts', { detail: { date } });
        window.dispatchEvent(event);
    };

    const resetAllCharts = () => {
        const event = new CustomEvent('resetZoom');
        window.dispatchEvent(event);
    };

    const colors = {
        dark: { bg: '#0f172a', panel: '#1e293b', border: '#475569', text: '#f1f5f9' },
        light: { bg: '#f9fafb', panel: '#f3f4f6', border: '#d1d5db', text: '#374151' }
    };
    const c = colors[theme];

    // Utility functions for date navigation (skip weekends)
    const getPreviousDate = (currentDate) => {
        const date = new Date(currentDate);
        do {
            date.setDate(date.getDate() - 1);
        } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sunday (0) and Saturday (6)
        return date.toISOString().split('T')[0];
    };

    const getNextDate = (currentDate) => {
        const date = new Date(currentDate);
        do {
            date.setDate(date.getDate() + 1);
        } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sunday (0) and Saturday (6)
        return date.toISOString().split('T')[0];
    };

    const handlePreviousDate = () => {
        const prevDate = getPreviousDate(date);
        updateDate(prevDate);
    };

    const handleNextDate = () => {
        const nextDate = getNextDate(date);
        updateDate(nextDate);
    };

    return (
        <SyncProvider>
            <div 
                className="flex flex-col"
                style={{ 
                    backgroundColor: c.bg, 
                    height: 'calc(100vh - 64px)', // Account for main nav header (h-16 = 64px)
                    width: '100vw',
                    overflow: 'hidden'
                }}
            >
                {/* Dashboard Header - Fixed height */}
                <div 
                    className="flex-shrink-0 border-b"
                    style={{ 
                        backgroundColor: c.panel, 
                        borderColor: c.border,
                        height: '56px',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                >
                    <h1 className="text-lg font-bold" style={{ color: c.text }}>
                        📋 Multi-Stock Dashboard
                    </h1>
                    <div className="flex items-center gap-2">
                        {/* Date Navigation */}
                        <button
                            onClick={handlePreviousDate}
                            className="px-2 py-1 rounded text-sm font-medium transition-all hover:scale-105"
                            style={{
                                backgroundColor: c.bg,
                                border: `1px solid ${c.border}`,
                                color: c.text
                            }}
                            title="Previous Day"
                        >
                            ◀
                        </button>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => updateDate(e.target.value)}
                            className="px-3 py-1 rounded border"
                            style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                        />
                        <button
                            onClick={handleNextDate}
                            className="px-2 py-1 rounded text-sm font-medium transition-all hover:scale-105"
                            style={{
                                backgroundColor: c.bg,
                                border: `1px solid ${c.border}`,
                                color: c.text
                            }}
                            title="Next Day"
                        >
                            ▶
                        </button>
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

                {/* Chart Grid - Calculated height accounting for both headers */}
                <div 
                    style={{ 
                        height: 'calc(100vh - 64px - 56px)', // 100vh - main nav (64px) - dashboard header (56px)
                        padding: '2px',
                        overflow: 'hidden',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gridTemplateRows: '1fr 1fr',
                        gap: '2px'
                    }}
                >
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className="border rounded overflow-hidden flex flex-col"
                            style={{ 
                                backgroundColor: c.panel, 
                                borderColor: c.border,
                                minHeight: 0,
                                height: '100%',
                                width: '100%'
                            }}
                        >
                            <SimpleChart index={index} theme={theme} globalDate={date} />
                        </div>
                    ))}
                </div>
            </div>
        </SyncProvider>
    );
}