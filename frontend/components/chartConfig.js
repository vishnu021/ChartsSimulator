// frontend/components/chartConfig.js
export const colors = {
    background: '#1a1a1a',
    panelBackground: '#111827',
    grid: '#374151',
    text: {
        primary: '#ffffff',
        secondary: '#9CA3AF',
        maxima: '#00C853',
        minima: '#D50000'
    },
    candle: {
        bullish: '#00C853',
        bearish: '#D50000'
    },
    lines: {
        maxima: '#FFD700',
        minima: '#FF69B4',
        crosshair: '#758696'
    },
    tooltip: {
        background: 'rgba(31, 41, 55, 0.95)',
        border: '#4a4a4a'
    }
};

export const chartSettings = {
    padding: { top: 40, right: 80, bottom: 60, left: 80 },
    gridLines: {
        horizontal: 8,
        vertical: 10
    },
    candleBodyWidthRatio: 0.6,
    extremaPointRadius: 5,
    crosshairLineWidth: 1,
    fonts: {
        labels: '12px Arial',
        tooltip: '13px Arial',
        extremaLabels: '11px Arial'
    }
};
