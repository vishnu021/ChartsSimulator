const API_BASE_URL = 'http://localhost:9090/api';

export const chartService = {
    async fetchOHLC(symbol, date, lookbackPeriod = 5) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/ohlc?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}&lookbackPeriod=${lookbackPeriod}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching OHLC data:', error);
            throw error;
        }
    }
};
