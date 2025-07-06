import { useState, useMemo, useCallback, useRef } from 'react';
import { tickerService } from '@/services/tickerService';

export const useTickerData = () => {
    const [tickerData, setTickerData] = useState([]);
    const [isRealTime, setIsRealTime] = useState(false);
    const [currentSymbol, setCurrentSymbol] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const loadingRef = useRef(false);

    const stats = useMemo(() => {
        if (!tickerData || tickerData.length === 0) {
            return {
                currentPrice: 0,
                change: 0,
                volume: 0,
                high: 0,
                low: 0,
                count: 0,
                changePercent: 0
            };
        }

        const allPrices = tickerData.map(t => t.price).filter(p => !isNaN(p));
        const totalVolume = tickerData.map(t => t.volume).filter(v => !isNaN(v)).reduce((sum, v) => sum + v, 0);
        const currentPrice = allPrices[allPrices.length - 1] || 0;
        const startPrice = allPrices[0] || 0;
        const change = currentPrice - startPrice;
        const changePercent = startPrice !== 0 ? (change / startPrice) * 100 : 0;

        return {
            currentPrice,
            change,
            changePercent,
            volume: totalVolume,
            high: allPrices.length > 0 ? Math.max(...allPrices) : 0,
            low: allPrices.length > 0 ? Math.min(...allPrices) : 0,
            count: tickerData.length
        };
    }, [tickerData]);

    const loadRealTimeTickerData = useCallback((params) => {
        if (loadingRef.current || tickerService.isConnecting()) {
            console.log('Request already in progress, ignoring');
            return;
        }

        loadingRef.current = true;
        setIsLoading(true);
        setError(null);
        setTickerData([]);

        tickerService.disconnect();

        setTimeout(() => {
            try {
                tickerService.connectAndStream(
                    params.symbol,
                    params.date,
                    (tick) => {
                        if (tick && tick.time && typeof tick.price === 'number') {
                            console.log('Real-time tick received:', tick.price);
                            setTickerData(prev => {
                                const newData = [...prev, tick];
                                return newData.length > 10000 ? newData.slice(-10000) : newData;
                            });
                        }
                    },
                    (err) => {
                        console.error('Ticker service error:', err);
                        setError(err);
                        setIsLoading(false);
                        loadingRef.current = false;
                    }
                );
                setTimeout(() => {
                    setIsLoading(false);
                    loadingRef.current = false;
                }, 2000);

            } catch (error) {
                console.error('Error loading ticker:', error);
                setError('Failed to load ticker data');
                setIsLoading(false);
                loadingRef.current = false;
            }
        }, 100);
    }, []);

    const loadInstantTickerData = useCallback(async (params) => {
        setIsLoading(true);
        setError(null);
        setTickerData([]);

        try {
            console.log(`Loading instant ticker data for ${params.symbol} on ${params.date}`);
            const data = await tickerService.getTickerData(params.symbol, params.date);
            console.log(`Received ${data.length} ticker records`);

            const validData = data.filter(tick =>
                tick &&
                tick.time &&
                typeof tick.price === 'number' &&
                !isNaN(tick.price)
            );

            console.log(`Filtered to ${validData.length} valid ticks`);
            setTickerData(validData);
        } catch (error) {
            console.error('Error loading ticker:', error);
            setError(`Failed to load ticker data: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadTickerData = useCallback((params) => {
        setCurrentSymbol(params.symbol);

        if (isRealTime) {
            loadRealTimeTickerData(params);
        } else {
            loadInstantTickerData(params);
        }
    }, [isRealTime, loadRealTimeTickerData, loadInstantTickerData]);

    const toggleMode = useCallback(() => {
        setIsRealTime(prev => {
            if (prev) {
                tickerService.disconnect();
                setTickerData([]);
            }
            return !prev;
        });
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const disconnect = useCallback(() => {
        tickerService.disconnect();
        loadingRef.current = false;
    }, []);

    return {
        tickerData,
        stats,
        currentSymbol,
        isRealTime,
        isLoading,
        error,
        loadTickerData,
        toggleMode,
        disconnect,
        clearError
    };
};
