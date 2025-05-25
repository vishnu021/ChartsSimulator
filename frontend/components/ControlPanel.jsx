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
        <div className="p-4 rounded-lg shadow-lg" style={{ backgroundColor: colors.controlPanel }}>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.text.secondary }}>
                        Symbol
                    </label>
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="px-3 py-2 rounded-md text-sm transition-colors"
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

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.text.secondary }}>
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-3 py-2 rounded-md text-sm transition-colors"
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

                <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: colors.text.secondary }}>
                        Lookback Period
                    </label>
                    <input
                        type="number"
                        value={lookbackPeriod}
                        onChange={(e) => setLookbackPeriod(parseInt(e.target.value))}
                        min="5"
                        max="50"
                        className="px-3 py-2 rounded-md text-sm transition-colors w-24"
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
                    className="px-6 py-2 rounded-md font-medium transition-all transform hover:scale-105"
                    style={{
                        backgroundColor: colors.input.focus,
                        color: '#ffffff',
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isLoading ? 'Loading...' : 'Load Chart'}
                </button>

                <div className="ml-auto">
                    <button
                        type="button"
                        onClick={onThemeToggle}
                        className="px-4 py-2 rounded-md transition-all"
                        style={{
                            backgroundColor: colors.panelBackground,
                            border: `1px solid ${colors.input.border}`,
                            color: colors.text.primary
                        }}
                    >
                        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                    </button>
                </div>
            </form>
        </div>
    );
}
