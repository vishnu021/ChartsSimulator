import { apiClient } from '../api/apiClient';
import { WebSocketManager } from '../websocket/WebSocketManager';

class ChartDataService {
    constructor() {
        this.wsManager = new WebSocketManager(process.env.NEXT_PUBLIC_WS_URL);
    }

    // API methods
    async getCandleData(symbol, date) {
        return apiClient.get('/api/charts', { symbol, date });
    }

    async getExtremaData(symbol, date, lookbackPeriod) {
        return apiClient.get('/api/ohlc', { symbol, date, lookbackPeriod });
    }

    async getChartComparison(symbol, date, chartTypes = 'CANDLESTICK,HEIKIN_ASHI') {
        return apiClient.get('/api/charts', { symbol, date, chartTypes });
    }

    // WebSocket methods
    async streamCandleData(symbol, date, lookbackPeriod, onData, onError) {
        try {
            await this.wsManager.connect();

            // Subscribe to candle updates
            this.wsManager.subscribe('/topic/candles', (message) => {
                try {
                    const data = JSON.parse(message.body);
                    onData(data);
                } catch (error) {
                    console.error('Error parsing candle message:', error);
                    onError('Error parsing server response');
                }
            });

            // Subscribe to errors
            this.wsManager.subscribe('/user/queue/error', (message) => {
                console.error('Server error:', message.body);
                onError(message.body);
            });

            // Start streaming
            this.wsManager.publish('/app/loadCandles', {
                symbol,
                date,
                lookbackPeriod
            });

        } catch (error) {
            console.error('Error setting up candle stream:', error);
            onError(`Failed to connect: ${error.message}`);
        }
    }

    sendDisconnectMessage() {
        if (this.wsManager.isConnected()) {
            try {
                this.wsManager.publish('/app/disconnectCandles', {
                    reason: 'Client navigating away'
                });
            } catch (error) {
                console.warn('Error sending disconnect message:', error);
            }
        }
    }

    disconnect() {
        this.sendDisconnectMessage();
        this.wsManager.disconnect();
    }

    isConnected() {
        return this.wsManager.isConnected();
    }

    isConnecting() {
        return this.wsManager.isConnecting();
    }
}

export const chartDataService = new ChartDataService();
