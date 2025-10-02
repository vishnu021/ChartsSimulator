import { apiClient } from '../api/apiClient';
import { logger } from '@/utils/logger';

class FuturesDataService {
  /**
   * Get single day futures historical data (1 minute interval)
   * @param {string} date - Date in yyyy-MM-dd format
   * @param {string} symbol - Futures contract symbol
   * @param {boolean} continuous - Enable continuous contract mode for expired contracts
   * @returns {Promise<Object>} SymbolData containing entire day's 1-minute candlestick data
   */
  async getEntireDayFuturesData(date, symbol, continuous = false) {
    try {
      const params = continuous ? { continuous: 'true' } : {};
      return await apiClient.get(`/api/v1/futuresHistoricalData/${date}/${symbol}`, params);
    } catch (error) {
      logger.error('Error fetching single day futures data:', error);
      throw error;
    }
  }

  /**
   * Get multi-day futures historical data
   * @param {string} from - Start date in yyyy-MM-dd format
   * @param {string} to - End date in yyyy-MM-dd format
   * @param {string} symbol - Futures contract symbol
   * @param {string} interval - Data interval (minute|3minute|5minute|10minute|15minute|30minute|60minute|day)
   * @param {boolean} continuous - Enable continuous contract mode for expired contracts
   * @returns {Promise<Array>} List of candle data
   */
  async getMultiDayFuturesData(from, to, symbol, interval, continuous = false) {
    try {
      const params = continuous ? { continuous: 'true' } : {};
      return await apiClient.get(`/api/v1/futuresData/${from}/${to}/${symbol}/${interval}`, params);
    } catch (error) {
      logger.error('Error fetching multi-day futures data:', error);
      throw error;
    }
  }

  /**
   * Get futures contract symbols
   * @param {string} underlying - Underlying symbol
   * @param {number} months - Number of months of contracts to fetch
   * @returns {Promise<Array>} List of available futures contracts
   */
  async getFuturesContracts(underlying, months = 6) {
    try {
      return await apiClient.get(`/api/futures/contracts/${encodeURIComponent(underlying)}`, { months });
    } catch (error) {
      logger.error('Error fetching futures contracts:', error);
      throw error;
    }
  }

  /**
   * Check if a symbol is likely a futures symbol
   * @param {string} symbol - Symbol to check
   * @returns {boolean} True if symbol appears to be a futures contract
   */
  isFuturesSymbol(symbol) {
    // Common futures patterns: NIFTYJAN24FUT, BANKNIFTYFEB24FUT, etc.
    return /\w+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\d{2}FUT$/i.test(symbol);
  }

  /**
   * Generate futures symbol for an underlying
   * @param {string} underlying - Underlying symbol (e.g., NIFTY, BANKNIFTY)
   * @param {string} date - Date to determine appropriate contract month
   * @returns {string} Generated futures symbol
   */
  generateFuturesSymbol(underlying, date) {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear().toString().slice(-2);

    // Get month abbreviation
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[targetDate.getMonth()];

    // Normalize underlying symbol - remove spaces and numbers
    let normalizedUnderlying = underlying.replace(/\s+/g, '').replace(/\d+/g, '').toUpperCase();

    // Handle common mappings
    if (normalizedUnderlying === 'NIFTY' || normalizedUnderlying === 'NIFTY50') {
      normalizedUnderlying = 'NIFTY';
    } else if (normalizedUnderlying === 'BANKNIFTY' || normalizedUnderlying === 'BANK') {
      normalizedUnderlying = 'BANKNIFTY';
    }

    return `${normalizedUnderlying}${year}${month}FUT`;
  }
}

export const futuresDataService = new FuturesDataService();
