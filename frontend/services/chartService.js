import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

let stompClient = null;
let isConnecting = false;
let currentSubscription = null;
let isCleaningUp = false;
let globalListenersAdded = false;

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL;

// Add global event listeners only once
const setupGlobalEventListeners = () => {
  if (globalListenersAdded || typeof window === 'undefined') {
    return;
  }

  globalListenersAdded = true;

  // Handle tab visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && stompClient && stompClient.connected) {
      console.log('Tab became hidden, scheduling chart WebSocket cleanup');
      setTimeout(() => {
        if (document.hidden) {
          chartService.disconnect();
        }
      }, 2000);
    }
  });

  // Handle page unload - send disconnect message to server
  window.addEventListener('beforeunload', () => {
    console.log('Page unloading, sending disconnect message to server');
    chartService.sendDisconnectMessage();
    chartService.disconnect();
  });

  // Handle page hide (mobile/browser specific)
  window.addEventListener('pagehide', () => {
    console.log('Page hidden, sending disconnect message to server');
    chartService.sendDisconnectMessage();
    chartService.disconnect();
  });
};

export const chartService = {
  connectAndStream(symbol, date, lookbackPeriod, onData, onError) {
    // Setup global listeners on first use
    setupGlobalEventListeners();

    // Prevent multiple simultaneous connections
    if (isConnecting) {
      console.log('Chart connection already in progress, ignoring request');
      return;
    }

    // Clean up existing connection
    this.disconnect();

    isConnecting = true;
    isCleaningUp = false;

    try {
      stompClient = new Client({
        webSocketFactory: () => new SockJS(WEBSOCKET_URL),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: str => {
          console.log('STOMP: ' + str);
        },
      });

      stompClient.onConnect = frame => {
        console.log('Connected to WebSocket:', frame);
        isConnecting = false;

        try {
          // Unsubscribe from any previous subscription
          if (currentSubscription) {
            currentSubscription.unsubscribe();
            currentSubscription = null;
          }

          // Subscribe to the minute-by-minute feed
          currentSubscription = stompClient.subscribe('/topic/candles', msg => {
            try {
              if (isCleaningUp) {
                console.log('Ignoring message during cleanup');
                return;
              }
              const data = JSON.parse(msg.body);
              onData(data);
            } catch (error) {
              console.error('Error parsing message:', error);
              onError('Error parsing server response');
            }
          });

          // Subscribe to error messages
          stompClient.subscribe('/user/queue/error', msg => {
            console.error('Server error:', msg.body);
            onError(msg.body);
          });

          // Send the request to start streaming
          stompClient.publish({
            destination: '/app/loadCandles',
            body: JSON.stringify({ symbol, date, lookbackPeriod }),
          });
        } catch (error) {
          console.error('Error setting up subscription:', error);
          onError('Error setting up data subscription');
          isConnecting = false;
        }
      };

      stompClient.onDisconnect = frame => {
        console.log('Disconnected from WebSocket:', frame);
        isConnecting = false;
        currentSubscription = null;
      };

      stompClient.onStompError = frame => {
        console.error('STOMP error:', frame);
        isConnecting = false;
        const errorMessage = frame.headers['message'] || 'WebSocket connection error';
        onError(errorMessage);
        this.disconnect();
      };

      stompClient.onWebSocketError = error => {
        console.error('WebSocket error:', error);
        isConnecting = false;
        onError('WebSocket connection failed');
        this.disconnect();
      };

      // Activate the connection
      stompClient.activate();
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      isConnecting = false;
      onError('Failed to create WebSocket connection');
    }
  },

  // Send disconnect message to server before closing connection
  sendDisconnectMessage() {
    if (stompClient && stompClient.connected) {
      try {
        console.log('Sending disconnect message to server for candles');
        stompClient.publish({
          destination: '/app/disconnectCandles',
          body: JSON.stringify({ reason: 'Client navigating away' }),
        });
      } catch (error) {
        console.warn('Error sending disconnect message:', error);
      }
    }
  },

  disconnect() {
    console.log('Disconnecting WebSocket...');
    isCleaningUp = true;

    // Send disconnect message before closing
    this.sendDisconnectMessage();

    try {
      // Unsubscribe from current subscription
      if (currentSubscription) {
        try {
          currentSubscription.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing:', error);
        }
        currentSubscription = null;
      }

      // Deactivate the client
      if (stompClient) {
        try {
          if (stompClient.connected) {
            stompClient.deactivate();
          }
        } catch (error) {
          console.warn('Error deactivating client:', error);
        }
      }
    } catch (error) {
      console.error('Error during disconnect:', error);
    } finally {
      stompClient = null;
      isConnecting = false;
      currentSubscription = null;

      // Reset cleanup flag after a short delay
      setTimeout(() => {
        isCleaningUp = false;
      }, 500);
    }
  },

  isConnected() {
    return stompClient && stompClient.connected;
  },

  isConnecting() {
    return isConnecting;
  },
};
