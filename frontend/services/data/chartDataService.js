import { apiClient } from '../api/apiClient';
import { WebSocketManager } from '../websocket/WebSocketManager';
import { logger } from '@/utils/logger';
import { futuresDataService } from './futuresDataService';

class ChartDataService {
  constructor() {
    this.wsManager = new WebSocketManager(process.env.NEXT_PUBLIC_WS_URL);
  }

  // API methods
  async getCandleData(symbol, date) {
    // Check if it's a futures symbol and use appropriate API
    if (futuresDataService.isFuturesSymbol(symbol)) {
      try {
        return await futuresDataService.getEntireDayFuturesData(date, symbol);
      } catch (error) {
        logger.warn('Futures API failed, falling back to regular API:', error);
        return apiClient.get('/api/charts', { symbol, date });
      }
    }
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
      this.wsManager.subscribe('/topic/candles', message => {
        try {
          const data = JSON.parse(message.body);
          onData(data);
        } catch (error) {
          logger.error('Error parsing candle message:', error);
          onError('Error parsing server response');
        }
      });

      // Subscribe to errors
      this.wsManager.subscribe('/user/queue/error', message => {
        logger.error('Server error:', message.body);
        onError(message.body);
      });

      // Start streaming
      this.wsManager.publish('/app/loadCandles', {
        symbol,
        date,
        lookbackPeriod,
      });
    } catch (error) {
      logger.error('Error setting up candle stream:', error);
      onError(`Failed to connect: ${error.message}`);
    }
  }

  sendDisconnectMessage() {
    if (this.wsManager.isConnected()) {
      try {
        this.wsManager.publish('/app/disconnectCandles', {
          reason: 'Client navigating away',
        });
      } catch (error) {
        logger.warn('Error sending disconnect message:', error);
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
