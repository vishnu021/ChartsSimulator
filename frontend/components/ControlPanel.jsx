'use client';

import React, { useState } from 'react';
import { themes } from './chartConfig';
import { useAppState } from '@/contexts/AppStateContext';

export default function ControlPanel({
  onSubmit,
  theme: propTheme, // Keep prop theme for backward compatibility
  onThemeToggle: propOnThemeToggle, // Keep prop for backward compatibility
  hideLookbackPeriod = false,
  showModeToggle = false,
  isRealTime = false,
  onModeToggle,
}) {
  // Use shared state for symbol, date, and theme
  const { symbol, date, theme, updateSymbol, updateDate, toggleTheme } = useAppState();

  // Use shared theme unless prop is provided (for backward compatibility)
  const currentTheme = propTheme || theme;
  const currentToggleTheme = propOnThemeToggle || toggleTheme;
  const [lookbackPeriod, setLookbackPeriod] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const colors = themes[currentTheme];

  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const params = { symbol, date };
      if (!hideLookbackPeriod) {
        params.lookbackPeriod = lookbackPeriod;
      }
      await onSubmit(params);
    } finally {
      setIsLoading(false);
    }
  };

  // Utility functions for date navigation (skip weekends)
  const getPreviousDate = currentDate => {
    const date = new Date(currentDate);
    do {
      date.setDate(date.getDate() - 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sunday (0) and Saturday (6)
    return date.toISOString().split('T')[0];
  };

  const getNextDate = currentDate => {
    const date = new Date(currentDate);
    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() === 0 || date.getDay() === 6); // Skip Sunday (0) and Saturday (6)
    return date.toISOString().split('T')[0];
  };

  const handlePreviousDate = async () => {
    const prevDate = getPreviousDate(date);
    updateDate(prevDate);
    setIsLoading(true);
    try {
      const params = { symbol, date: prevDate };
      if (!hideLookbackPeriod) {
        params.lookbackPeriod = lookbackPeriod;
      }
      await onSubmit(params);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextDate = async () => {
    const nextDate = getNextDate(date);
    updateDate(nextDate);
    setIsLoading(true);
    try {
      const params = { symbol, date: nextDate };
      if (!hideLookbackPeriod) {
        params.lookbackPeriod = lookbackPeriod;
      }
      await onSubmit(params);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 rounded-lg shadow-lg" style={{ backgroundColor: colors.controlPanel }}>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[120px]">
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: colors.text.secondary }}
          >
            Symbol
          </label>
          <input
            type="text"
            value={symbol}
            onChange={e => updateSymbol(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm transition-colors"
            style={{
              backgroundColor: colors.input.background,
              border: `1px solid ${colors.input.border}`,
              color: colors.text.primary,
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = colors.input.focus)}
            onBlur={e => (e.target.style.borderColor = colors.input.border)}
            required
          />
        </div>

        <div className="flex-1 min-w-[140px]">
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: colors.text.secondary }}
          >
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={e => updateDate(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-sm transition-colors"
            style={{
              backgroundColor: colors.input.background,
              border: `1px solid ${colors.input.border}`,
              color: colors.text.primary,
              outline: 'none',
            }}
            onFocus={e => (e.target.style.borderColor = colors.input.focus)}
            onBlur={e => (e.target.style.borderColor = colors.input.border)}
            required
          />
        </div>

        {/* Date Navigation Buttons */}
        <div className="flex gap-1">
          <div>
            <label
              className="block text-xs font-medium mb-1 opacity-0"
              style={{ color: colors.text.secondary }}
            >
              Nav
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handlePreviousDate}
                disabled={isLoading || !symbol}
                className="px-2 py-1.5 rounded text-sm font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: colors.panelBackground,
                  border: `1px solid ${colors.input.border}`,
                  color: colors.text.primary,
                  opacity: isLoading || !symbol ? 0.5 : 1,
                  cursor: isLoading || !symbol ? 'not-allowed' : 'pointer',
                }}
                title="Previous Day"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleNextDate}
                disabled={isLoading || !symbol}
                className="px-2 py-1.5 rounded text-sm font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: colors.panelBackground,
                  border: `1px solid ${colors.input.border}`,
                  color: colors.text.primary,
                  opacity: isLoading || !symbol ? 0.5 : 1,
                  cursor: isLoading || !symbol ? 'not-allowed' : 'pointer',
                }}
                title="Next Day"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {!hideLookbackPeriod && (
          <div className="w-20">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: colors.text.secondary }}
            >
              Period
            </label>
            <input
              type="number"
              value={lookbackPeriod}
              onChange={e => setLookbackPeriod(parseInt(e.target.value))}
              min="2"
              max="50"
              className="w-full px-2 py-1.5 rounded text-sm transition-colors"
              style={{
                backgroundColor: colors.input.background,
                border: `1px solid ${colors.input.border}`,
                color: colors.text.primary,
                outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = colors.input.focus)}
              onBlur={e => (e.target.style.borderColor = colors.input.border)}
            />
          </div>
        )}

        {showModeToggle && (
          <div className="w-32">
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: colors.text.secondary }}
            >
              Mode
            </label>
            <button
              type="button"
              onClick={onModeToggle}
              className={`w-full px-2 py-1.5 rounded text-sm transition-all ${
                isRealTime ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              style={{ color: '#ffffff' }}
            >
              {isRealTime ? '⚡ Real-time' : '📊 Instant'}
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1.5 rounded text-sm font-medium transition-all transform hover:scale-105 whitespace-nowrap"
          style={{
            backgroundColor: colors.input.focus,
            color: '#ffffff',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Loading...' : 'Load Data'}
        </button>

        <button
          type="button"
          onClick={currentToggleTheme}
          className="px-3 py-1.5 rounded transition-all text-sm whitespace-nowrap"
          style={{
            backgroundColor: colors.panelBackground,
            border: `1px solid ${colors.input.border}`,
            color: colors.text.primary,
          }}
        >
          {currentTheme === 'dark' ? '☀️' : '🌙'}
        </button>
      </form>
    </div>
  );
}
