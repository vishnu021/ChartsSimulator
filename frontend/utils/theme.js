/**
 * Centralized theme utility for consistent theming across the application
 * This provides a single source of truth for all theme-related styling
 */

import { themes } from '@/components/chartConfig';

/**
 * Get dashboard-specific theme colors optimized for UI components
 * This creates a softer, less bright light theme and consistent dark theme
 */
export const getDashboardTheme = (themeName) => {
  const baseTheme = themes[themeName];

  if (themeName === 'light') {
    return {
      // Background layers - much softer and less bright
      background: {
        primary: '#f8fafc',     // Main app background - very light gray-blue
        secondary: '#f1f5f9',   // Panel backgrounds - slightly darker
        tertiary: '#e2e8f0',    // Control panels and inputs
        overlay: 'rgba(248, 250, 252, 0.95)', // Modal/overlay backgrounds
      },

      // Text colors with better contrast
      text: {
        primary: '#1e293b',     // Main text - dark slate
        secondary: '#475569',   // Secondary text - medium slate
        tertiary: '#64748b',    // Muted text - light slate
        accent: '#3b82f6',      // Links and accents - blue
        inverse: '#ffffff',     // Text on dark backgrounds
      },

      // Border and divider colors
      border: {
        primary: '#e2e8f0',     // Main borders - light slate
        secondary: '#cbd5e1',   // Subtle borders
        focus: '#3b82f6',       // Focus rings - blue
        hover: '#94a3b8',       // Hover states
      },

      // Interactive element colors
      interactive: {
        primary: '#3b82f6',     // Primary buttons - blue
        primaryHover: '#2563eb', // Primary button hover
        secondary: '#6b7280',   // Secondary buttons - gray
        secondaryHover: '#4b5563', // Secondary button hover
        success: '#059669',     // Success actions - green
        successHover: '#047857', // Success hover
        warning: '#d97706',     // Warning actions - amber
        warningHover: '#b45309', // Warning hover
        danger: '#dc2626',      // Danger actions - red
        dangerHover: '#b91c1c', // Danger hover
      },

      // Surface colors for cards, inputs, etc.
      surface: {
        primary: '#ffffff',     // Cards, inputs - pure white
        secondary: '#f8fafc',   // Elevated surfaces
        tertiary: '#f1f5f9',    // Subtle surfaces
        hover: '#f1f5f9',       // Hover states for surfaces
        selected: '#eff6ff',    // Selected states - light blue
      },

      // Shadow and glow effects
      effects: {
        shadow: {
          sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        glow: 'rgba(59, 130, 246, 0.15)',
        ring: 'rgba(59, 130, 246, 0.5)',
      },

      // Chart-specific colors (from existing theme)
      chart: baseTheme,
    };
  }

  // Dark theme - use existing with some refinements
  return {
    background: {
      primary: '#0f172a',       // Deep navy
      secondary: '#1e293b',     // Slate panels
      tertiary: '#334155',      // Controls
      overlay: 'rgba(15, 23, 42, 0.95)',
    },

    text: {
      primary: '#f8fafc',       // Bright white
      secondary: '#cbd5e1',     // Light gray
      tertiary: '#94a3b8',      // Medium gray
      accent: '#60a5fa',        // Light blue
      inverse: '#1e293b',       // Dark text on light backgrounds
    },

    border: {
      primary: '#475569',       // Slate borders
      secondary: '#64748b',     // Lighter borders
      focus: '#60a5fa',         // Blue focus
      hover: '#cbd5e1',         // Light hover
    },

    interactive: {
      primary: '#3b82f6',
      primaryHover: '#60a5fa',
      secondary: '#6b7280',
      secondaryHover: '#9ca3af',
      success: '#10b981',
      successHover: '#34d399',
      warning: '#f59e0b',
      warningHover: '#fbbf24',
      danger: '#ef4444',
      dangerHover: '#f87171',
    },

    surface: {
      primary: '#1e293b',
      secondary: '#334155',
      tertiary: '#475569',
      hover: '#334155',
      selected: '#1e40af',
    },

    effects: {
      shadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)',
      },
      glow: 'rgba(96, 165, 250, 0.3)',
      ring: 'rgba(96, 165, 250, 0.5)',
    },

    chart: baseTheme,
  };
};

/**
 * Get theme-aware button styles
 */
export const getButtonStyles = (theme, variant = 'primary', size = 'md') => {
  const t = getDashboardTheme(theme);

  const variants = {
    primary: {
      backgroundColor: t.interactive.primary,
      color: t.text.inverse,
      border: 'none',
      hover: {
        backgroundColor: t.interactive.primaryHover,
        transform: 'translateY(-1px)',
        boxShadow: t.effects.shadow.md,
      }
    },
    secondary: {
      backgroundColor: t.surface.primary,
      color: t.text.primary,
      border: `1px solid ${t.border.primary}`,
      hover: {
        backgroundColor: t.surface.hover,
        borderColor: t.border.hover,
        transform: 'translateY(-1px)',
        boxShadow: t.effects.shadow.sm,
      }
    },
    success: {
      backgroundColor: t.interactive.success,
      color: t.text.inverse,
      border: 'none',
      hover: {
        backgroundColor: t.interactive.successHover,
        transform: 'translateY(-1px)',
        boxShadow: t.effects.shadow.md,
      }
    },
    danger: {
      backgroundColor: t.interactive.danger,
      color: t.text.inverse,
      border: 'none',
      hover: {
        backgroundColor: t.interactive.dangerHover,
        transform: 'translateY(-1px)',
        boxShadow: t.effects.shadow.md,
      }
    }
  };

  const sizes = {
    sm: { padding: '8px 12px', fontSize: '14px', borderRadius: '6px' },
    md: { padding: '12px 16px', fontSize: '16px', borderRadius: '8px' },
    lg: { padding: '16px 24px', fontSize: '18px', borderRadius: '10px' },
  };

  return {
    ...variants[variant],
    ...sizes[size],
    transition: 'all 0.2s ease-in-out',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    outline: 'none',
    '&:focus': {
      boxShadow: `0 0 0 3px ${t.effects.ring}`,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    }
  };
};

/**
 * Get theme-aware input styles
 */
export const getInputStyles = (theme) => {
  const t = getDashboardTheme(theme);

  return {
    backgroundColor: t.surface.primary,
    color: t.text.primary,
    border: `1px solid ${t.border.primary}`,
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    boxShadow: t.effects.shadow.sm,
    '&:focus': {
      borderColor: t.border.focus,
      boxShadow: `0 0 0 3px ${t.effects.ring}, ${t.effects.shadow.sm}`,
    },
    '&:hover': {
      borderColor: t.border.hover,
    },
    '&::placeholder': {
      color: t.text.tertiary,
    }
  };
};

/**
 * Get theme-aware card styles
 */
export const getCardStyles = (theme, elevated = false) => {
  const t = getDashboardTheme(theme);

  return {
    backgroundColor: t.surface.primary,
    border: `1px solid ${t.border.primary}`,
    borderRadius: '12px',
    boxShadow: elevated ? t.effects.shadow.lg : t.effects.shadow.md,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: t.effects.shadow.lg,
      transform: elevated ? 'translateY(-2px)' : 'translateY(-1px)',
    }
  };
};

/**
 * Convert style object to inline styles for React components
 */
export const toInlineStyles = (styleObj) => {
  const result = {};
  Object.keys(styleObj).forEach(key => {
    if (typeof styleObj[key] === 'object' && !key.startsWith('&')) {
      // Skip nested objects like hover states for inline styles
      return;
    }
    if (!key.startsWith('&')) {
      result[key] = styleObj[key];
    }
  });
  return result;
};

export default getDashboardTheme;
