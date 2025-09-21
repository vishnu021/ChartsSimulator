import { apiClient } from '../api/apiClient';
import { WebSocketManager } from '../websocket/WebSocketManager';
import { logger } from '@/utils/logger';

class TickerDataService {
  constructor() {
    this.wsManager = new WebSocketManager(process.env.NEXT_PUBLIC_WS_URL);
  }

  // API methods
  async getTickerData(symbol, date) {
    return apiClient.get('/ticker', { symbol, date });
  }

  // WebSocket methods
  async streamTickerData(symbol, date, onData, onError) {
    try {
      await this.wsManager.connect();

      // Subscribe to ticker updates
      this.wsManager.subscribe('/topic/ticker', message => {
        try {
          const data = JSON.parse(message.body);
          onData(data);
        } catch (error) {
          logger.error('Error parsing ticker message:', error);
          onError('Error parsing ticker response');
        }
      });

      // Subscribe to errors
      this.wsManager.subscribe('/user/queue/error', message => {
        logger.error('Ticker server error:', message.body);
        onError(message.body);
      });

      // Start streaming
      this.wsManager.publish('/app/loadTicker', { symbol, date });
    } catch (error) {
      logger.error('Error setting up ticker stream:', error);
      onError(`Failed to connect: ${error.message}`);
    }
  }

  sendDisconnectMessage() {
    if (this.wsManager.isConnected()) {
      try {
        this.wsManager.publish('/app/disconnectTicker', {
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

export const tickerDataService = new TickerDataService();
