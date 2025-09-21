export const themes = {
  dark: {
    background: '#0a0f1c',  // Deeper, more sophisticated dark background
    panelBackground: '#1a2332', // Rich dark blue-gray panel
    controlPanel: '#243447',  // Slightly lighter for controls
    panel: '#1a2332',
    grid: '#374662',  // More visible grid lines
    text: {
      primary: '#f8fafc',  // Brighter primary text
      secondary: '#a1b5d1',  // Warmer secondary text
      maxima: '#22d3ee',  // Vibrant cyan for highs
      minima: '#f87171',  // Softer red for lows
    },
    candle: {
      bullish: '#00d084',  // More vibrant green
      bearish: '#ff5757',  // More vibrant red
    },
    ticker: {
      line: '#f8fafc',
      shadow: '#4f46e5',
      area: {
        top: 'rgba(248, 250, 252, 0.3)',
        bottom: 'rgba(79, 70, 229, 0.1)',
      },
      point: '#f8fafc',
      pointShadow: '#4f46e5',
    },
    lines: {
      maxima: '#fbbf24',  // Bright amber for maxima lines
      minima: '#f472b6',  // Bright pink for minima lines
      crosshair: '#7c8db5',
    },
    tooltip: {
      background: 'rgba(36, 52, 71, 0.98)',  // More opaque and sophisticated
      border: '#4a5f7a',
    },
    input: {
      background: '#1a2332',
      border: '#4a5f7a',
      focus: '#4f46e5',
    },
    // New enhancements
    accent: '#4f46e5',
    success: '#00d084',
    warning: '#fbbf24',
    error: '#ff5757',
    shadow: 'rgba(0, 0, 0, 0.5)',
    glow: 'rgba(79, 70, 229, 0.3)',
  },
  light: {
    background: '#f8fafc',  // Softer off-white background
    panelBackground: '#f1f5f9',  // Light blue-gray panels
    controlPanel: '#e2e8f0',  // Refined control panel
    panel: '#f1f5f9',
    grid: '#d1d9e0',  // Softer grid lines
    text: {
      primary: '#334155',  // Softer primary text - less harsh
      secondary: '#64748b',  // Warmer secondary text
      maxima: '#0891b2',  // Professional teal for highs
      minima: '#e11d48',  // Slightly softer red for lows
    },
    candle: {
      bullish: '#16a34a',  // Softer professional green
      bearish: '#e11d48',  // Softer professional red
    },
    ticker: {
      line: '#1e293b',
      shadow: '#6366f1',
      area: {
        top: 'rgba(30, 41, 59, 0.2)',
        bottom: 'rgba(99, 102, 241, 0.08)',
      },
      point: '#1e293b',
      pointShadow: '#6366f1',
    },
    lines: {
      maxima: '#d97706',  // Warm amber for maxima
      minima: '#be185d',  // Deep pink for minima
      crosshair: '#64748b',
    },
    tooltip: {
      background: 'rgba(241, 245, 249, 0.98)',  // More opaque tooltip
      border: '#cbd5e1',
    },
    input: {
      background: '#ffffff',
      border: '#cbd5e1',
      focus: '#6366f1',
    },
    // New enhancements
    accent: '#6366f1',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    shadow: 'rgba(0, 0, 0, 0.1)',
    glow: 'rgba(99, 102, 241, 0.2)',
  },
};

export const chartSettings = {
  padding: { top: 50, right: 90, bottom: 90, left: 90 },  // More space for Wyckoff phases
  mobilePadding: { top: 40, right: 50, bottom: 70, left: 70 },  // Enhanced mobile padding
  // Dashboard-specific padding for better panel fit
  dashboardPadding: { top: 25, right: 35, bottom: 60, left: 45 },  // Balanced dashboard padding
  dashboardMobilePadding: { top: 20, right: 25, bottom: 50, left: 35 },  // Mobile dashboard padding
  gridLines: {
    horizontal: 8,
    vertical: 10,
  },
  candleBodyWidthRatio: 0.75,  // Slightly thinner candles for better readability
  extremaPointRadius: 7,  // Larger extrema points for better visibility
  crosshairLineWidth: 1.5,  // Slightly thicker crosshair
  extremaLineWidth: 2.5,  // Thicker extrema lines
  trendArrowSize: 10,  // Larger arrows
  significantMoveThreshold: 0.5,

  // Enhanced visual settings
  shadowBlur: 3,
  borderRadius: 4,
  animationDuration: 200,
  hoverOpacity: 0.8,

  fonts: {
    labels: '13px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    tooltip: '14px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    extremaLabels: '12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    mobileLabels: '11px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    mobileTooltip: '12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    mobileExtremaLabels: '10px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    phaseBold: 'bold 14px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    phaseRegular: '12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
  },

  // Wyckoff phase specific settings
  wyckoffPhase: {
    stripHeight: 40,
    borderWidth: 3,
    labelMinWidth: 80,
    indicatorWidth: 100,
    indicatorHeight: 25,
    shadowBlur: 6,
    textShadowBlur: 4,
  },
};
