import { useState, useRef, useCallback, useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { configService } from '@/services/config/configService';
import { logger } from '@/utils/logger';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(100); // Default 100ms

  const clientRef = useRef(null);
  const subscriptionsRef = useRef([]);
  const isActiveRef = useRef(false);
  const messageBufferRef = useRef([]);
  const isPausedRef = useRef(false);

  // Clean disconnect function
  const disconnect = useCallback((reason = 'Manual disconnect', force = false) => {
    if (
      !force &&
      isActiveRef.current &&
      (reason === 'Component unmount' || reason.includes('Tab'))
    ) {
      return; // Prevent unwanted disconnections
    }

    isActiveRef.current = false;

    if (clientRef.current) {
      try {
        subscriptionsRef.current.forEach(sub => {
          try {
            sub.unsubscribe();
          } catch (e) {
            /* ignore */
          }
        });
        subscriptionsRef.current = [];
        clientRef.current.deactivate();
      } catch (e) {
        /* ignore */
      }
    }

    clientRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
    setData(null);
  }, []);

  // Connect and stream function
  const connectAndStream = useCallback(
    async (symbol, date, lookbackPeriod) => {
      if (isConnecting) return;

      setIsConnecting(true);
      setError(null);
      setData(null);

      // Force disconnect any existing connection
      if (clientRef.current) {
        disconnect('Starting new connection', true);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      try {
        // Load WebSocket URL from config
        await configService.loadConfig();
        const wsUrl = configService.getWsUrl();
        logger.info('Loaded WebSocket URL for extrema:', wsUrl);

        const client = new Client({
          webSocketFactory: () => new SockJS(wsUrl),
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
          isActiveRef.current = true;

          try {
            // Subscribe to data
            const candleSub = client.subscribe('/topic/candles', message => {
              try {
                const parsedData = JSON.parse(message.body);
                // If paused, buffer the message; otherwise update data immediately
                if (isPausedRef.current) {
                  messageBufferRef.current.push(parsedData);
                } else {
                  setData(parsedData);
                }
              } catch (e) {
                setError('Failed to parse server data');
              }
            });

            // Subscribe to errors
            const errorSub = client.subscribe('/user/queue/error', message => {
              setError(message.body);
            });

            subscriptionsRef.current = [candleSub, errorSub];

            // Send request with custom delay
            client.publish({
              destination: '/app/loadCandles',
              body: JSON.stringify({
                symbol,
                date,
                lookbackPeriod,
                customDelay: streamSpeed
              }),
            });

            setIsConnected(true);
            setIsConnecting(false);
          } catch (e) {
            setError('Failed to setup WebSocket subscriptions');
            setIsConnecting(false);
            isActiveRef.current = false;
          }
        };

        client.onStompError = () => {
          setError('WebSocket connection error');
          setIsConnecting(false);
          isActiveRef.current = false;
        };

        client.onWebSocketError = () => {
          setError('WebSocket connection failed');
          setIsConnecting(false);
          isActiveRef.current = false;
        };

        client.onWebSocketClose = () => {
          isActiveRef.current = false;
        };

        client.onDisconnect = () => {
          setIsConnected(false);
          setIsConnecting(false);
          isActiveRef.current = false;
        };

        clientRef.current = client;
        client.activate();
      } catch (error) {
        setError('Failed to connect to WebSocket');
        setIsConnecting(false);
        isActiveRef.current = false;
      }
    },
    [isConnecting, disconnect]
  );

  // Manual disconnect
  const manualDisconnect = useCallback(() => {
    disconnect('Manual disconnect', true);
  }, [disconnect]);

  // Cleanup only on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect('Page unload', true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isActiveRef.current) {
        setTimeout(() => {
          if (document.hidden && isActiveRef.current) {
            disconnect('Tab hidden', true);
          }
        }, 5000);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect('Component unmount', true);
    };
  }, [disconnect]);

  const clearError = useCallback(() => setError(null), []);

  // Toggle pause/resume
  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const newPaused = !prev;
      isPausedRef.current = newPaused;

      // When resuming, flush the buffer if there are messages
      if (!newPaused && messageBufferRef.current.length > 0) {
        // Update to the latest buffered message
        const latestMessage = messageBufferRef.current[messageBufferRef.current.length - 1];
        setData(latestMessage);
        messageBufferRef.current = [];
      }

      return newPaused;
    });
  }, []);

  // Update stream speed
  const updateStreamSpeed = useCallback((newSpeed) => {
    setStreamSpeed(newSpeed);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    data,
    isPaused,
    streamSpeed,
    connectAndStream,
    disconnect: manualDisconnect,
    clearError,
    togglePause,
    updateStreamSpeed,
  };
};
