import { useState, useCallback } from 'react';
import { useWebSocket } from './websocket/useWebSocket';
import { configService } from '@/services/config/configService';
import { optionService } from '@/services/optionService';
import { futuresDataService } from '@/services/data/futuresDataService';

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

  // Helper function to handle symbol type processing
  const processSymbolByType = async (params, apiUrl) => {
    const { symbol, symbolType, date } = params;

    console.log('🔄 Processing Symbol by Type:', {
      originalSymbol: symbol,
      symbolType: symbolType,
      date: date
    });

    if (symbolType === 'future') {
      // For futures, generate the proper futures symbol directly
      try {
        const generatedSymbol = futuresDataService.generateFuturesSymbol(symbol, date);
        console.log(`📈 Generated futures symbol: ${generatedSymbol} for underlying: ${symbol} on date: ${date}`);
        return { ...params, symbol: generatedSymbol };
      } catch (error) {
        console.warn('❌ Failed to generate futures symbol, using original symbol:', error);
      }
    } else if (symbolType === 'option') {
      // For options, generate ITM option symbol
      try {
        const itmOptionSymbol = optionService.generateITMOptionSymbol(symbol, date);
        console.log(`⚙️ Generated ITM option symbol: ${itmOptionSymbol} for underlying: ${symbol}`);
        return { ...params, symbol: itmOptionSymbol };
      } catch (error) {
        console.warn('❌ Failed to generate ITM option symbol, using original symbol:', error);
      }
    }

    // Return original params if no special processing needed
    console.log('📊 Using original symbol (no processing needed):', symbol);
    return params;
  };

  // Helper function for regular API calls (fallback)
  const fetchRegularApiData = async (apiUrl, processedParams, chartType) => {
    let endpoint, queryParams;

    if (chartType === 'combined') {
      // Use /api/charts endpoint with chartTypes for Heikin-Ashi data
      queryParams = new URLSearchParams({
        symbol: processedParams.symbol,
        date: processedParams.date,
        ...(processedParams.lookbackPeriod && { lookbackPeriod: processedParams.lookbackPeriod }),
        chartTypes: 'CANDLESTICK,HEIKIN_ASHI'
      });
      endpoint = `${apiUrl}/api/charts?${queryParams}`;
    } else {
      // Use /api/ohlc endpoint for extrema data
      queryParams = new URLSearchParams({
        symbol: processedParams.symbol,
        date: processedParams.date,
        ...(processedParams.lookbackPeriod && { lookbackPeriod: processedParams.lookbackPeriod })
      });
      endpoint = `${apiUrl}/api/ohlc?${queryParams}`;
    }

    console.log('🌐 Making Regular API Request:', {
      endpoint: endpoint,
      method: 'GET',
      finalSymbol: processedParams.symbol
    });

    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  };

  // Load instant data via API
  const loadInstantData = useCallback(async (params, chartType = 'default') => {
    setInstantLoading(true);
    setInstantError(null);
    setInstantData(null);

    try {
      await configService.loadConfig();
      const apiUrl = configService.getApiUrl();

      // Process symbol based on type
      const processedParams = await processSymbolByType(params, apiUrl);

      // Debug logging for symbol processing
      console.log('🔍 Frontend API Call Debug:', {
        originalSymbol: params.symbol,
        symbolType: params.symbolType,
        processedSymbol: processedParams.symbol,
        date: processedParams.date,
        chartType: chartType
      });

      let data;

      // Check if this is a futures symbol and use appropriate API
      if (params.symbolType === 'future' || futuresDataService.isFuturesSymbol(processedParams.symbol)) {
        console.log('📈 Using futures API for symbol:', processedParams.symbol);

        try {
          // Use the new futures API endpoint for single day data
          data = await futuresDataService.getEntireDayFuturesData(
            processedParams.date,
            processedParams.symbol,
            false // continuous mode - set to false by default
          );
          console.log('📈 Futures data received:', data);
        } catch (futuresError) {
          console.warn('❌ Futures API failed, falling back to regular API:', futuresError);
          // Fallback to regular API if futures API fails
          data = await fetchRegularApiData(apiUrl, processedParams, chartType);
        }
      } else {
        // Use regular API for non-futures symbols
        console.log('📊 Using regular API for symbol:', processedParams.symbol);
        data = await fetchRegularApiData(apiUrl, processedParams, chartType);
      }
      setInstantData({
        ...data,
        symbol: processedParams.symbol,
        originalSymbol: params.symbol,
        symbolType: params.symbolType
      });
    } catch (error) {
      setInstantError(`Failed to load ${params.symbolType || 'chart'} data`);
    } finally {
      setInstantLoading(false);
    }
  }, []);

  // Main load function
  const loadData = useCallback(
    (params, chartType = 'default') => {
      if (isRealTime) {
        connectAndStream(params.symbol, params.date, params.lookbackPeriod);
      } else {
        loadInstantData(params, chartType);
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
