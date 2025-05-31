'use client';

import React, { useState } from 'react';
import { themes } from './chartConfig';

export default function ControlPanel({ onSubmit, theme, onThemeToggle }) {
    const [symbol, setSymbol] = useState('NIFTY 50');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lookbackPeriod, setLookbackPeriod] = useState(5);
    const [isLoading, setIsLoading] = useState(false);

    const colors = themes[theme];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit({ symbol, date, lookbackPeriod });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-2 md:p-3 rounded-lg shadow-lg" style={{ backgroundColor: colors.controlPanel }}>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 md:gap-3 items-end">
                <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                        Symbol
                    </label>
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-sm transition-colors"
                        style={{
                            backgroundColor: colors.input.background,
                            border: `1px solid ${colors.input.border}`,
                            color: colors.text.primary,
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.input.focus}
                        onBlur={(e) => e.target.style.borderColor = colors.input.border}
                        required
                    />
                </div>

                <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-2 py-1.5 rounded text-sm transition-colors"
                        style={{
                            backgroundColor: colors.input.background,
                            border: `1px solid ${colors.input.border}`,
                            color: colors.text.primary,
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.input.focus}
                        onBlur={(e) => e.target.style.borderColor = colors.input.border}
                        required
                    />
                </div>

                <div className="w-20">
                    <label className="block text-xs font-medium mb-1" style={{ color: colors.text.secondary }}>
                        Period
                    </label>
                    <input
                        type="number"
                        value={lookbackPeriod}
                        onChange={(e) => setLookbackPeriod(parseInt(e.target.value))}
                        min="2"
                        max="50"
                        className="w-full px-2 py-1.5 rounded text-sm transition-colors"
                        style={{
                            backgroundColor: colors.input.background,
                            border: `1px solid ${colors.input.border}`,
                            color: colors.text.primary,
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = colors.input.focus}
                        onBlur={(e) => e.target.style.borderColor = colors.input.border}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded text-sm font-medium transition-all transform hover:scale-105 whitespace-nowrap"
                    style={{
                        backgroundColor: colors.input.focus,
                        color: '#ffffff',
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Loading...' : 'Load Chart'}
                </button>

                <button
                    type="button"
                    onClick={onThemeToggle}
                    className="px-3 py-1.5 rounded transition-all text-sm whitespace-nowrap"
                    style={{
                        backgroundColor: colors.panelBackground,
                        border: `1px solid ${colors.input.border}`,
                        color: colors.text.primary
                    }}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>
            </form>
        </div>
    );
}
