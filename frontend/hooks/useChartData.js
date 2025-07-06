import { useState, useCallback, useRef } from 'react';
import { chartService } from '../services/chartService';

export const useChartData = () => {
    const [isRealTime, setIsRealTime] = useState(false);
    const [instantData, setInstantData] = useState(null);
    const [instantLoading, setInstantLoading] = useState(false);
    const [instantError, setInstantError] = useState(null);
    const [realTimeData, setRealTimeData] = useState(null);
    const [realTimeLoading, setRealTimeLoading] = useState(false);
    const [realTimeError, setRealTimeError] = useState(null);
    const loadingRef = useRef(false);

    const loadInstantData = useCallback(async (params) => {
        setInstantLoading(true);
        setInstantError(null);
        setInstantData(null);

        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
            const queryParams = new URLSearchParams(params);
            const response = await fetch(`${API_BASE_URL}/ohlc?${queryParams}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`Instant mode: received ${data.candles?.length} candles, ${data.maxima?.length} maxima, ${data.minima?.length} minima`);
            setInstantData({ ...data, symbol: params.symbol });
        } catch (error) {
            console.error('Error loading extrema:', error);
            setInstantError('Failed to load extrema data');
        } finally {
            setInstantLoading(false);
        }
    }, []);

    const loadRealTimeData = useCallback((params) => {
        if (loadingRef.current || chartService.isConnecting()) {
            console.log('Request already in progress, ignoring');
            return;
        }

        loadingRef.current = true;
        setRealTimeLoading(true);
        setRealTimeError(null);
        setRealTimeData(null);

        chartService.disconnect();

        setTimeout(() => {
            try {
                chartService.connectAndStream(
                    params.symbol,
                    params.date,
                    params.lookbackPeriod,
                    (data) => {
                        console.log(`Received extrema update: ${data.candles?.length} candles, ${data.maxima?.length} maxima, ${data.minima?.length} minima`);
                        setRealTimeData({ ...data, symbol: params.symbol });
                    },
                    (err) => {
                        console.error('Chart service error:', err);
                        setRealTimeError(err);
                        setRealTimeLoading(false);
                        loadingRef.current = false;
                    }
                );

                setTimeout(() => {
                    setRealTimeLoading(false);
                    loadingRef.current = false;
                }, 2000);

            } catch (error) {
                console.error('Error loading chart:', error);
                setRealTimeError('Failed to load chart data');
                setRealTimeLoading(false);
                loadingRef.current = false;
            }
        }, 100);
    }, []);

    const loadData = useCallback((params) => {
        if (isRealTime) {
            loadRealTimeData(params);
        } else {
            loadInstantData(params);
        }
    }, [isRealTime, loadRealTimeData, loadInstantData]);

    const toggleMode = useCallback(() => {
        setIsRealTime(prev => {
            if (prev) {
                chartService.disconnect();
                setRealTimeData(null);
                setRealTimeError(null);
            }
            return !prev;
        });
    }, []);

    const clearErrors = useCallback(() => {
        setInstantError(null);
        setRealTimeError(null);
    }, []);

    const disconnect = useCallback(() => {
        chartService.disconnect();
        loadingRef.current = false;
    }, []);

    return {
        // Real-time data
        isRealTime,
        realTimeData,
        realTimeLoading,
        realTimeError,

        // Instant data
        instantData,
        instantLoading,
        instantError,

        // Actions
        loadData,
        toggleMode,
        clearErrors,
        disconnect
    };
};
