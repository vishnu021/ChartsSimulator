import { CHART_CONSTANTS } from '../constants';

export const canvasUtils = {
    setupCanvas(canvas) {
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        return { ctx, width: rect.width, height: rect.height, dpr };
    },

    getPadding(isMobile) {
        return isMobile ? CHART_CONSTANTS.PADDING.MOBILE : CHART_CONSTANTS.PADDING.DESKTOP;
    },

    getChartDimensions(width, height, padding) {
        return {
            chartWidth: width - padding.left - padding.right,
            chartHeight: height - padding.top - padding.bottom
        };
    },

    setClippingRegion(ctx, padding, chartWidth, chartHeight) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
        ctx.clip();
    },

    clearClippingRegion(ctx) {
        ctx.restore();
    }
};

export const scalingUtils = {
    createYScale(minPrice, maxPrice, priceRange, pricePadding, padding, chartHeight) {
        return (price) => {
            return padding.top + ((maxPrice + pricePadding - price) / (priceRange + 2 * pricePadding)) * chartHeight;
        };
    },

    createXScale(padding, candleWidth, visibleStart) {
        return (index) => {
            return padding.left + (index - visibleStart) * candleWidth + candleWidth / 2;
        };
    },

    calculateVisibleRange(dataLength, chartWidth, zoom, offset) {
        const candleWidth = (chartWidth / dataLength) * zoom;
        const maxOffset = 0;
        const minOffset = Math.min(0, -(dataLength * candleWidth - chartWidth));
        const clampedOffset = Math.max(minOffset, Math.min(maxOffset, offset));

        const visibleStart = Math.max(0, Math.floor(-clampedOffset / candleWidth));
        const visibleEnd = Math.min(dataLength, Math.ceil((chartWidth - clampedOffset) / candleWidth));

        return { visibleStart, visibleEnd, clampedOffset, candleWidth };
    },

    calculatePriceRange(prices) {
        if (prices.length === 0) return { minPrice: 0, maxPrice: 0, priceRange: 0, pricePadding: 0 };

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const pricePadding = Math.max(priceRange * 0.1, 1);

        return { minPrice, maxPrice, priceRange, pricePadding };
    }
};
