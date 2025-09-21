'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '@/utils/logger';

const AppStateContext = createContext();

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
};

const getDefaultDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Note: state hydration handled in useEffect; no separate getStoredState needed

export const AppStateProvider = ({ children }) => {
  const [state, setState] = useState(() => ({
    symbol: 'NIFTY 50',
    date: getDefaultDate(),
    theme: 'dark',
  }));
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('chartsimulator-app-state');
        if (stored) {
          const parsed = JSON.parse(stored);
          setState({
            symbol: parsed.symbol || 'NIFTY 50',
            date: parsed.date || getDefaultDate(),
            theme: parsed.theme || 'dark',
          });
        }
      } catch (error) {
        logger.warn('Failed to parse stored app state:', error);
      }
      setIsHydrated(true);
    }
  }, []);

  // Persist state to localStorage whenever it changes (but only after hydration)
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem('chartsimulator-app-state', JSON.stringify(state));
      } catch (error) {
        logger.warn('Failed to save app state to localStorage:', error);
      }
    }
  }, [state, isHydrated]);

  const updateSymbol = symbol => {
    setState(prev => ({ ...prev, symbol }));
  };

  const updateDate = date => {
    setState(prev => ({ ...prev, date }));
  };

  const updateBoth = (symbol, date) => {
    setState(prev => ({ ...prev, symbol, date }));
  };

  const updateTheme = theme => {
    setState(prev => ({ ...prev, theme }));
  };

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const resetToDefaults = () => {
    setState({
      symbol: 'NIFTY 50',
      date: getDefaultDate(),
      theme: 'dark',
    });
  };

  const value = {
    symbol: state.symbol,
    date: state.date,
    theme: state.theme,
    updateSymbol,
    updateDate,
    updateBoth,
    updateTheme,
    toggleTheme,
    resetToDefaults,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};
