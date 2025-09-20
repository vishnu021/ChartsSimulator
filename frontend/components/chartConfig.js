export const themes = {
  dark: {
    background: '#0f172a',
    panelBackground: '#1e293b',
    controlPanel: '#1e293b',
    grid: '#334155',
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
      maxima: '#10b981',
      minima: '#ef4444',
    },
    candle: {
      bullish: '#10b981',
      bearish: '#ef4444',
    },
    ticker: {
      line: '#ffffff',
      shadow: '#3b82f6',
      area: {
        top: 'rgba(255, 255, 255, 0.25)',
        bottom: 'rgba(59, 130, 246, 0.08)',
      },
      point: '#ffffff',
      pointShadow: '#3b82f6',
    },
    lines: {
      maxima: '#fbbf24',
      minima: '#f472b6',
      crosshair: '#64748b',
    },
    tooltip: {
      background: 'rgba(30, 41, 59, 0.95)',
      border: '#475569',
    },
    input: {
      background: '#0f172a',
      border: '#475569',
      focus: '#3b82f6',
    },
  },
  light: {
    background: '#f9fafb',
    panelBackground: '#f3f4f6',
    controlPanel: '#e5e7eb',
    grid: '#d1d5db',
    text: {
      primary: '#374151',
      secondary: '#6b7280',
      maxima: '#059669',
      minima: '#dc2626',
    },
    candle: {
      bullish: '#10b981',
      bearish: '#ef4444',
    },
    ticker: {
      line: '#374151',
      shadow: '#6366f1',
      area: {
        top: 'rgba(55, 65, 81, 0.15)',
        bottom: 'rgba(99, 102, 241, 0.05)',
      },
      point: '#374151',
      pointShadow: '#6366f1',
    },
    lines: {
      maxima: '#f59e0b',
      minima: '#ec4899',
      crosshair: '#9ca3af',
    },
    tooltip: {
      background: 'rgba(243, 244, 246, 0.95)',
      border: '#d1d5db',
    },
    input: {
      background: '#f9fafb',
      border: '#d1d5db',
      focus: '#6366f1',
    },
  },
};

export const chartSettings = {
  padding: { top: 40, right: 80, bottom: 60, left: 80 },
  mobilePadding: { top: 30, right: 40, bottom: 40, left: 60 },
  gridLines: {
    horizontal: 8,
    vertical: 10,
  },
  candleBodyWidthRatio: 0.8,
  extremaPointRadius: 6,
  crosshairLineWidth: 1,
  extremaLineWidth: 2,
  trendArrowSize: 8,
  significantMoveThreshold: 0.5,
  fonts: {
    labels: '12px -apple-system, BlinkMacSystemFont, sans-serif',
    tooltip: '13px -apple-system, BlinkMacSystemFont, sans-serif',
    extremaLabels: '11px -apple-system, BlinkMacSystemFont, sans-serif',
    mobileLabels: '10px -apple-system, BlinkMacSystemFont, sans-serif',
    mobileTooltip: '11px -apple-system, BlinkMacSystemFont, sans-serif',
    mobileExtremaLabels: '9px -apple-system, BlinkMacSystemFont, sans-serif',
  },
};
