'use client';

import { useEffect } from 'react';
import { useAppState } from '@/contexts/AppStateContext';

/**
 * ThemeProvider component that applies the theme to the document element
 * This ensures CSS custom properties are properly applied based on the current theme
 */
export default function ThemeProvider({ children }) {
  const { theme } = useAppState();

  useEffect(() => {
    // Apply theme to document element for CSS custom properties
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);

      // Also update the class for any legacy selectors
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  }, [theme]);

  return <>{children}</>;
}
