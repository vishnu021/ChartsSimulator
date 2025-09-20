import { useState, useCallback } from 'react';
import { useWebSocket } from './websocket/useWebSocket';
import { configService } from '@/services/config/configService';

export const useChartData = () => {
  const [isRealTime, setIsRealTime] = useState(false);
  const [instantData, setInstantData] = useState(null);
  const [instantLoading, setInstantLoading] = useState(false);
  const [instantError, setInstantError] = useState(null);

  // Real-time WebSocket
  const {
    data: realTimeData,
    isConnecting: realTimeLoading,
    error: realTimeError,
    connectAndStream,
    disconnect,
    clearError: clearRealTimeError,
  } = useWebSocket();

  // Load instant data via API
  const loadInstantData = useCallback(async params => {
    setInstantLoading(true);
    setInstantError(null);
    setInstantData(null);

    try {
      await configService.loadConfig();
      const apiUrl = configService.getApiUrl();
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${apiUrl}/api/ohlc?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInstantData({ ...data, symbol: params.symbol });
    } catch (error) {
      setInstantError('Failed to load extrema data');
    } finally {
      setInstantLoading(false);
    }
  }, []);

  // Main load function
  const loadData = useCallback(
    params => {
      if (isRealTime) {
        connectAndStream(params.symbol, params.date, params.lookbackPeriod);
      } else {
        loadInstantData(params);
      }
    },
    [isRealTime, connectAndStream, loadInstantData]
  );

  // Toggle between real-time and instant
  const toggleMode = useCallback(() => {
    setIsRealTime(prev => {
      if (prev) {
        disconnect();
      }
      return !prev;
    });
  }, [disconnect]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setInstantError(null);
    clearRealTimeError();
  }, [clearRealTimeError]);

  return {
    isRealTime,
    realTimeData,
    instantData,
    realTimeLoading,
    instantLoading,
    realTimeError,
    instantError,
    loadData,
    toggleMode,
    clearErrors,
    disconnect,
  };
};
