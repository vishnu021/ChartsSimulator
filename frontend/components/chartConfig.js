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
            minima: '#ef4444'
        },
        candle: {
            bullish: '#10b981',
            bearish: '#ef4444'
        },
        lines: {
            maxima: '#fbbf24',
            minima: '#f472b6',
            crosshair: '#64748b'
        },
        tooltip: {
            background: 'rgba(30, 41, 59, 0.95)',
            border: '#475569'
        },
        input: {
            background: '#0f172a',
            border: '#475569',
            focus: '#3b82f6'
        }
    },
    light: {
        background: '#ffffff',
        panelBackground: '#f8fafc',
        controlPanel: '#f1f5f9',
        grid: '#e2e8f0',
        text: {
            primary: '#0f172a',
            secondary: '#64748b',
            maxima: '#059669',
            minima: '#dc2626'
        },
        candle: {
            bullish: '#10b981',
            bearish: '#ef4444'
        },
        lines: {
            maxima: '#f59e0b',
            minima: '#ec4899',
            crosshair: '#94a3b8'
        },
        tooltip: {
            background: 'rgba(248, 250, 252, 0.95)',
            border: '#cbd5e1'
        },
        input: {
            background: '#ffffff',
            border: '#cbd5e1',
            focus: '#3b82f6'
        }
    }
};

export const chartSettings = {
    padding: { top: 20, right: 40, bottom: 30, left: 50 },
    mobilePadding: { top: 15, right: 25, bottom: 25, left: 35 }, // Smaller padding for mobile
    gridLines: {
        horizontal: 8,
        vertical: 10
    },
    candleBodyWidthRatio: 0.7,
    extremaPointRadius: 6,
    crosshairLineWidth: 1,
    extremaLineWidth: 2,
    fonts: {
        labels: '12px -apple-system, BlinkMacSystemFont, sans-serif',
        tooltip: '13px -apple-system, BlinkMacSystemFont, sans-serif',
        extremaLabels: '11px -apple-system, BlinkMacSystemFont, sans-serif',
        // Mobile fonts
        mobileLabels: '10px -apple-system, BlinkMacSystemFont, sans-serif',
        mobileTooltip: '11px -apple-system, BlinkMacSystemFont, sans-serif',
        mobileExtremaLabels: '9px -apple-system, BlinkMacSystemFont, sans-serif'
    }
};
