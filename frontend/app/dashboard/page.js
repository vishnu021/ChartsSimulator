'use client';

import React, { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import { useAppState } from '@/contexts/AppStateContext';

const CandleChart = dynamic(() => import('@/components/CandleChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
                <span className="text-xs">Loading...</span>
            </div>
        </div>
    )
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Context for synchronized chart interactions
const SyncContext = createContext();

const useSyncContext = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSyncContext must be used within SyncProvider');
    }
    return context;
};

// Sync Provider component
const SyncProvider = ({ children }) => {
    const [syncState, setSyncState] = useState({
        zoom: 1,
        offset: 0,
        isDragging: false
    });

    const updateSyncState = useCallback((newState) => {
        setSyncState(prev => ({ ...prev, ...newState }));
    }, []);

    return (
        <SyncContext.Provider value={{ syncState, updateSyncState }}>
            {children}
        </SyncContext.Provider>
    );
};

// Cookie utilities
const setCookie = (name, value, days = 30) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    return document.cookie.split('; ').reduce((r, v) => {
        const parts = v.split('=');
        return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, null);
};

// Synchronized Chart Component that wraps CandleChart with sync capabilities
const SyncedCandleChart = ({ data, theme, chartId }) => {
    const { syncState, updateSyncState } = useSyncContext();
    const chartRef = useRef(null);
    
    // Create a synced view state that updates from global sync state
    const syncedViewState = {
        zoom: syncState.zoom,
        offset: syncState.offset,
        targetOffset: syncState.offset,
        velocity: 0
    };

    // Handle synchronized interactions by intercepting events
    useEffect(() => {
        const chartElement = chartRef.current;
        if (!chartElement || !data) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = chartElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const chartWidth = rect.width - 100; // Account for padding
            const mouseRatio = (x - 50) / chartWidth;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.5, Math.min(20, syncState.zoom * zoomFactor));

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
            e.preventDefault();
            const startX = e.clientX;
            const startOffset = syncState.offset;
            
            updateSyncState({ isDragging: true });

            const handleMouseMove = (e) => {
                const dx = e.clientX - startX;
                const newOffset = startOffset + dx;
                
                updateSyncState({
                    offset: newOffset
                });
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

// Individual chart component
const StockChart = ({ index, theme, globalDate, onSymbolChange }) => {
    const [stockData, setStockData] = useState(null);
    const [symbol, setSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load symbol from cookie on mount
    useEffect(() => {
        const savedSymbol = getCookie(`dashboard_symbol_${index}`);
        if (savedSymbol) {
            setSymbol(savedSymbol);
        }
    }, [index]);

    // Remove auto-loading - only load on button click

    const loadStockData = useCallback(async (stockSymbol, date) => {
        if (!stockSymbol || !date) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({ symbol: stockSymbol, date });
            const response = await fetch(`${API_BASE_URL}/charts?${params}`);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { 
                        message: `HTTP error! status: ${response.status}`,
                        context: { symbol: stockSymbol, date, httpStatusCode: response.status }
                    };
                }
                setError(JSON.stringify(errorData));
                return;
            }

            const result = await response.json();
            setStockData({
                candles: result.candlesticks,
                symbol: stockSymbol
            });
        } catch (error) {
            const errorData = {
                message: 'Failed to load chart data: ' + error.message,
                context: { symbol: stockSymbol, date, error: error.message }
            };
            setError(JSON.stringify(errorData));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSymbolChange = (e) => {
        const newSymbol = e.target.value;
        setSymbol(newSymbol);
        setCookie(`dashboard_symbol_${index}`, newSymbol);
        onSymbolChange(index, newSymbol);
    };

    const handleLoad = () => {
        if (symbol && globalDate) {
            setStockData(null); // Clear previous data
            loadStockData(symbol, globalDate);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLoad();
        }
    };

    const colors = {
        dark: {
            background: '#0f172a',
            panelBackground: '#1e293b',
            grid: '#334155',
            text: { primary: '#f1f5f9', secondary: '#94a3b8' },
            input: { background: '#0f172a', border: '#475569', focus: '#3b82f6' }
        },
        light: {
            background: '#f9fafb',
            panelBackground: '#f3f4f6',
            grid: '#d1d5db',
            text: { primary: '#374151', secondary: '#6b7280' },
            input: { background: '#f9fafb', border: '#d1d5db', focus: '#6366f1' }
        }
    };

    const themeColors = colors[theme];

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: themeColors.panelBackground }}>
            {/* Fixed header - always same height */}
            <div className="px-1 py-1 border-b flex items-center justify-between" style={{ 
                borderColor: themeColors.grid,
                height: '32px', // Fixed height
                minHeight: '32px',
                maxHeight: '32px'
            }}>
                <div className="flex gap-1 items-center flex-1">
                    <input
                        type="text"
                        value={symbol}
                        onChange={handleSymbolChange}
                        onKeyPress={handleKeyPress}
                        placeholder={`Stock ${index + 1}`}
                        className="flex-1 px-1 py-0.5 rounded text-xs"
                        style={{
                            backgroundColor: themeColors.input.background,
                            border: `1px solid ${themeColors.input.border}`,
                            color: themeColors.text.primary,
                            minWidth: '60px',
                            height: '20px' // Fixed input height
                        }}
                    />
                    <button
                        onClick={handleLoad}
                        disabled={isLoading || !symbol || !globalDate}
                        className="px-1 py-0.5 rounded text-xs transition-all"
                        style={{
                            backgroundColor: themeColors.input.focus,
                            color: '#ffffff',
                            opacity: (isLoading || !symbol || !globalDate) ? 0.5 : 1,
                            cursor: (isLoading || !symbol || !globalDate) ? 'not-allowed' : 'pointer',
                            width: '24px', // Fixed button width
                            height: '20px', // Fixed button height
                            minWidth: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isLoading ? '⏳' : '⚡'}
                    </button>
                </div>
                
                {/* Fixed status area - always same width */}
                <div className="text-xs ml-1" style={{ 
                    color: themeColors.text.secondary,
                    width: '30px', // Fixed width
                    textAlign: 'right',
                    fontSize: '10px'
                }}>
                    {stockData ? `${stockData.candles?.length || 0}c` : ''}
                </div>
            </div>

            {/* Fixed chart area - always same dimensions */}
            <div style={{ 
                height: 'calc(100% - 32px)', // Fixed height minus header
                position: 'relative',
                minHeight: '200px' // Minimum chart height
            }}>
                {error ? (
                    <div className="flex items-center justify-center h-full p-2">
                        <div className="text-center text-xs text-red-400">
                            <div className="mb-1">❌</div>
                            <div className="text-xs opacity-75">No data</div>
                        </div>
                    </div>
                ) : stockData ? (
                    <SyncedCandleChart data={stockData} theme={theme} chartId={index} />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center text-xs" style={{ color: themeColors.text.secondary }}>
                            <div className="mb-1">📊</div>
                            <div>Click ⚡ to load</div>
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
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getPreviousDate = (currentDate) => {
        const date = new Date(currentDate);
        do {
            date.setDate(date.getDate() - 1);
        } while (date.getDay() === 0 || date.getDay() === 6);
        return date.toISOString().split('T')[0];
    };

    const getNextDate = (currentDate) => {
        const date = new Date(currentDate);
        do {
            date.setDate(date.getDate() + 1);
        } while (date.getDay() === 0 || date.getDay() === 6);
        return date.toISOString().split('T')[0];
    };

    const handleDateChange = (e) => {
        updateDate(e.target.value);
        // Remove automatic refresh - only refresh on button click
    };

    const handlePreviousDate = () => {
        const prevDate = getPreviousDate(date);
        updateDate(prevDate);
        // Remove automatic refresh - only refresh on button click
    };

    const handleNextDate = () => {
        const nextDate = getNextDate(date);
        updateDate(nextDate);
        // Remove automatic refresh - only refresh on button click
    };

    const refreshAll = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const handleSymbolChange = (index, symbol) => {
        // This could be used for additional symbol tracking if needed
    };

    const colors = {
        dark: {
            background: '#0f172a',
            panelBackground: '#1e293b',
            grid: '#334155',
            text: { primary: '#f1f5f9', secondary: '#94a3b8' },
            input: { background: '#0f172a', border: '#475569', focus: '#3b82f6' }
        },
        light: {
            background: '#f9fafb',
            panelBackground: '#f3f4f6',
            grid: '#d1d5db',
            text: { primary: '#374151', secondary: '#6b7280' },
            input: { background: '#f9fafb', border: '#d1d5db', focus: '#6366f1' }
        }
    };

    const themeColors = colors[theme];

    return (
        <SyncProvider>
            <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: themeColors.background, paddingTop: '4rem' }}>
            {/* Ultra compact top bar */}
            <div className="flex-shrink-0 px-2 py-1 border-b" style={{ backgroundColor: themeColors.panelBackground, borderColor: themeColors.grid }}>
                <div className="flex items-center justify-between">
                    {/* Left: Title and Time */}
                    <div className="flex items-center gap-4">
                        <h1 className="text-sm font-bold" style={{ color: themeColors.text.primary }}>
                            📋 Multi-Stock Dashboard
                        </h1>
                        <div className="text-xs font-mono" style={{ color: themeColors.text.secondary }}>
                            {currentTime.toLocaleTimeString()}
                        </div>
                    </div>

                    {/* Center: Date Navigation */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePreviousDate}
                            className="px-1 py-0.5 rounded text-xs transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColors.background,
                                border: `1px solid ${themeColors.input.border}`,
                                color: themeColors.text.primary
                            }}
                            title="Previous Day"
                        >
                            ◀
                        </button>
                        <input
                            type="date"
                            value={date}
                            onChange={handleDateChange}
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                                backgroundColor: themeColors.input.background,
                                border: `1px solid ${themeColors.input.border}`,
                                color: themeColors.text.primary,
                            }}
                        />
                        <button
                            onClick={handleNextDate}
                            className="px-1 py-0.5 rounded text-xs transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColors.background,
                                border: `1px solid ${themeColors.input.border}`,
                                color: themeColors.text.primary
                            }}
                            title="Next Day"
                        >
                            ▶
                        </button>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={refreshAll}
                            className="px-2 py-0.5 rounded text-xs font-medium transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColors.input.focus,
                                color: '#ffffff'
                            }}
                            title="Refresh All Charts"
                        >
                            🔄
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="px-2 py-0.5 rounded transition-all text-xs"
                            style={{
                                backgroundColor: themeColors.background,
                                border: `1px solid ${themeColors.input.border}`,
                                color: themeColors.text.primary
                            }}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Fixed chart grid - consistent panel sizes */}
            <div className="flex-1 p-1 overflow-hidden" style={{ minHeight: '0', maxHeight: 'calc(100vh - 4rem - 48px)' }}>
                <div className="grid grid-cols-2 gap-1 h-full overflow-hidden" style={{ 
                    gridTemplateRows: '1fr 1fr', // Fixed equal rows
                    gridTemplateColumns: '1fr 1fr' // Fixed equal columns
                }}>
                    {[0, 1, 2, 3].map((index) => (
                        <div 
                            key={index} // Remove refreshTrigger to prevent re-mounting
                            className="rounded border overflow-hidden"
                            style={{ 
                                backgroundColor: themeColors.panelBackground,
                                borderColor: themeColors.grid,
                                height: '100%', // Fill available space exactly
                                width: '100%', // Fill available space exactly
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <StockChart 
                                index={index} 
                                theme={theme} 
                                globalDate={date}
                                onSymbolChange={handleSymbolChange}
                                key={refreshTrigger} // Move refresh trigger here for data refresh only
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
        </SyncProvider>
    );
}