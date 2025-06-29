// frontend/services/chartTypeService.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';

export const chartTypeService = {
    async getChartData(symbol, date, chartTypes = 'CANDLESTICK,HEIKIN_ASHI') {
        try {
            const params = new URLSearchParams({
                symbol,
                date,
                chartTypes
            });

            const response = await fetch(`${API_BASE_URL}/charts?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching chart data:', error);
            throw error;
        }
    },

    // Placeholder methods for compatibility
    disconnect() {
        // No WebSocket to disconnect
    },

    isConnected() {
        return false;
    },

    isConnecting() {
        return false;
    }
};
