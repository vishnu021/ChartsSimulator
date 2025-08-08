import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { configService } from './config/configService.js';

let tickerStompClient = null;
let tickerIsConnecting = false;
let tickerCurrentSubscription = null;
let tickerIsCleaningUp = false;
let tickerGlobalListenersAdded = false;

let WEBSOCKET_URL = null;

// Add global event listeners only once
const setupTickerGlobalEventListeners = () => {
    if (tickerGlobalListenersAdded || typeof window === 'undefined') {
        return;
    }

    tickerGlobalListenersAdded = true;

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && tickerStompClient && tickerStompClient.connected) {
            console.log('Tab became hidden, scheduling ticker WebSocket cleanup');
            setTimeout(() => {
                if (document.hidden) {
                    tickerService.disconnect();
                }
            }, 2000);
        }
    });

    // Handle page unload - send disconnect message to server
    window.addEventListener('beforeunload', () => {
        console.log('Page unloading, sending ticker disconnect message to server');
        tickerService.sendDisconnectMessage();
        tickerService.disconnect();
    });

    // Handle page hide (mobile/browser specific)
    window.addEventListener('pagehide', () => {
        console.log('Page hidden, sending ticker disconnect message to server');
        tickerService.sendDisconnectMessage();
        tickerService.disconnect();
    });
};

export const tickerService = {
    // Get ticker data via API
    async getTickerData(symbol, date) {
        try {
            console.log(`Fetching ticker data for ${symbol} on ${date}`);
            await configService.loadConfig();
            const apiUrl = configService.getApiUrl();
            const params = new URLSearchParams({ symbol, date });
            const url = `${apiUrl}/api/ticker?${params}`;
            console.log(`API URL: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log(`API Response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error: ${response.status} - ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`Received ${data.length} ticker records`);
            return data;
        } catch (error) {
            console.error('Error fetching ticker data:', error);
            throw error;
        }
    },

    // Stream ticker data via WebSocket for real-time visualization
    async connectAndStream(symbol, date, onData, onError) {
        // Setup global listeners on first use
        setupTickerGlobalEventListeners();

        if (tickerIsConnecting) {
            console.log('Ticker connection already in progress, ignoring request');
            return;
        }

        this.disconnect();
        tickerIsConnecting = true;
        tickerIsCleaningUp = false;

        try {
            // Load WebSocket URL from config if not already loaded
            if (!WEBSOCKET_URL) {
                await configService.loadConfig();
                WEBSOCKET_URL = configService.getWsUrl();
                console.log('Loaded WebSocket URL for ticker:', WEBSOCKET_URL);
            }

            tickerStompClient = new Client({
                webSocketFactory: () => new SockJS(WEBSOCKET_URL),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (str) => {
                    console.log('STOMP Ticker: ' + str);
                }
            });

            tickerStompClient.onConnect = (frame) => {
                console.log('Connected to Ticker WebSocket:', frame);
                tickerIsConnecting = false;

                try {
                    if (tickerCurrentSubscription) {
                        tickerCurrentSubscription.unsubscribe();
                        tickerCurrentSubscription = null;
                    }

                    tickerCurrentSubscription = tickerStompClient.subscribe("/topic/ticker", (msg) => {
                        try {
                            if (tickerIsCleaningUp) {
                                console.log('Ignoring ticker message during cleanup');
                                return;
                            }
                            const tickerData = JSON.parse(msg.body);
                            onData(tickerData);
                        } catch (error) {
                            console.error('Error parsing ticker message:', error);
                            onError('Error parsing ticker response');
                        }
                    });

                    // Subscribe to error messages
                    tickerStompClient.subscribe("/user/queue/error", (msg) => {
                        console.error('Ticker server error:', msg.body);
                        onError(msg.body);
                    });

                    tickerStompClient.publish({
                        destination: "/app/loadTicker",
                        body: JSON.stringify({ symbol, date }),
                    });

                } catch (error) {
                    console.error('Error setting up ticker subscription:', error);
                    onError('Error setting up ticker subscription');
                    tickerIsConnecting = false;
                }
            };

            tickerStompClient.onDisconnect = (frame) => {
                console.log('Disconnected from Ticker WebSocket:', frame);
                tickerIsConnecting = false;
                tickerCurrentSubscription = null;
            };

            tickerStompClient.onStompError = (frame) => {
                console.error('STOMP Ticker error:', frame);
                tickerIsConnecting = false;
                const errorMessage = frame.headers["message"] || "Ticker WebSocket connection error";
                onError(errorMessage);
                this.disconnect();
            };

            tickerStompClient.onWebSocketError = (error) => {
                console.error('Ticker WebSocket error:', error);
                tickerIsConnecting = false;
                onError('Ticker WebSocket connection failed');
                this.disconnect();
            };

            tickerStompClient.activate();

        } catch (error) {
            console.error('Error creating ticker WebSocket connection:', error);
            tickerIsConnecting = false;
            onError('Failed to create ticker WebSocket connection');
        }
    },

    // Send disconnect message to server before closing connection
    sendDisconnectMessage() {
        if (tickerStompClient && tickerStompClient.connected) {
            try {
                console.log('Sending disconnect message to server for ticker');
                tickerStompClient.publish({
                    destination: "/app/disconnectTicker",
                    body: JSON.stringify({ reason: "Client navigating away" }),
                });
            } catch (error) {
                console.warn('Error sending ticker disconnect message:', error);
            }
        }
    },

    disconnect() {
        console.log('Disconnecting Ticker WebSocket...');
        tickerIsCleaningUp = true;

        // Send disconnect message before closing
        this.sendDisconnectMessage();

        try {
            if (tickerCurrentSubscription) {
                try {
                    tickerCurrentSubscription.unsubscribe();
                } catch (error) {
                    console.warn('Error unsubscribing from ticker:', error);
                }
                tickerCurrentSubscription = null;
            }

            if (tickerStompClient) {
                try {
                    if (tickerStompClient.connected) {
                        tickerStompClient.deactivate();
                    }
                } catch (error) {
                    console.warn('Error deactivating ticker client:', error);
                }
            }
        } catch (error) {
            console.error('Error during ticker disconnect:', error);
        } finally {
            tickerStompClient = null;
            tickerIsConnecting = false;
            tickerCurrentSubscription = null;

            // Reset cleanup flag after a short delay
            setTimeout(() => {
                tickerIsCleaningUp = false;
            }, 500);
        }
    },

    isConnected() {
        return tickerStompClient && tickerStompClient.connected;
    },

    isConnecting() {
        return tickerIsConnecting;
    }
};
