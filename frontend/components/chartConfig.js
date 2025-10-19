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
    volume: {
      bullish: 'rgba(0, 208, 132, 0.6)',  // Semi-transparent green
      bearish: 'rgba(255, 87, 87, 0.6)',  // Semi-transparent red
      border: '#4a5f7a',
      text: '#a1b5d1',
      label: '#7c8db5',
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
    background: '#fafbfc',  // Very soft off-white background
    panelBackground: '#f5f7fa',  // Muted light gray-blue panels
    controlPanel: '#eaeef3',  // Subtle control panel
    panel: '#f5f7fa',
    grid: '#dce1e8',  // Very soft grid lines
    text: {
      primary: '#3d4852',  // Softer dark gray - less harsh
      secondary: '#6c7985',  // Muted gray text
      maxima: '#0d9488',  // Softer teal for highs
      minima: '#d14d72',  // Muted rose for lows
    },
    candle: {
      bullish: '#14a855',  // Softer emerald green
      bearish: '#d14d72',  // Softer rose red
    },
    volume: {
      bullish: 'rgba(20, 168, 85, 0.5)',  // Semi-transparent soft green
      bearish: 'rgba(209, 77, 114, 0.5)',  // Semi-transparent soft rose
      border: '#d1d8df',
      text: '#6c7985',
      label: '#6c7985',
    },
    ticker: {
      line: '#3d4852',
      shadow: '#7c7fdb',
      area: {
        top: 'rgba(61, 72, 82, 0.15)',
        bottom: 'rgba(124, 127, 219, 0.06)',
      },
      point: '#3d4852',
      pointShadow: '#7c7fdb',
    },
    lines: {
      maxima: '#d97706',  // Warm amber for maxima
      minima: '#c2185b',  // Softer magenta for minima
      crosshair: '#8591a0',
    },
    tooltip: {
      background: 'rgba(245, 247, 250, 0.98)',  // More opaque tooltip
      border: '#d1d8df',
    },
    input: {
      background: '#ffffff',
      border: '#d1d8df',
      focus: '#7c7fdb',
    },
    // New enhancements
    accent: '#7c7fdb',
    success: '#14a855',
    warning: '#d97706',
    error: '#d14d72',
    shadow: 'rgba(0, 0, 0, 0.08)',
    glow: 'rgba(124, 127, 219, 0.15)',
  },
};

export const chartSettings = {
  padding: { top: 50, right: 90, bottom: 130, left: 90 },  // More space for Wyckoff phases and timestamp labels
  mobilePadding: { top: 40, right: 50, bottom: 100, left: 70 },  // Enhanced mobile padding with extra bottom space
  // Dashboard-specific padding for better panel fit
  dashboardPadding: { top: 25, right: 35, bottom: 60, left: 45 },  // Balanced dashboard padding
  dashboardMobilePadding: { top: 20, right: 25, bottom: 50, left: 35 },  // Mobile dashboard padding
  gridLines: {
    horizontal: 8,
    vertical: 10,
  },
  candleBodyWidthRatio: 0.75,  // Slightly thinner candles for better readability
  volumeBarWidthRatio: 0.65,  // Volume bars slightly thinner than candles
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
    axis: '12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    tooltip: '14px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    extremaLabels: '12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    volumeLabel: 'bold 12px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
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
