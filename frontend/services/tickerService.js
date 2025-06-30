// frontend/services/tickerService.js
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient = null;
let isConnecting = false;
let currentSubscription = null;
let isCleaningUp = false;
let globalListenersAdded = false;

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:9090/ws';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';

// Add global event listeners only once
const setupGlobalEventListeners = () => {
    if (globalListenersAdded || typeof window === 'undefined') {
        return;
    }

    globalListenersAdded = true;

    // Handle tab visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && stompClient && stompClient.connected) {
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
            const params = new URLSearchParams({ symbol, date });
            const url = `${API_BASE_URL}/ticker?${params}`;
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
    connectAndStream(symbol, date, onData, onError) {
        // Setup global listeners on first use
        setupGlobalEventListeners();

        if (isConnecting) {
            console.log('Ticker connection already in progress, ignoring request');
            return;
        }

        this.disconnect();
        isConnecting = true;
        isCleaningUp = false;

        try {
            stompClient = new Client({
                webSocketFactory: () => new SockJS(WEBSOCKET_URL),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (str) => {
                    console.log('STOMP Ticker: ' + str);
                }
            });

            stompClient.onConnect = (frame) => {
                console.log('Connected to Ticker WebSocket:', frame);
                isConnecting = false;

                try {
                    if (currentSubscription) {
                        currentSubscription.unsubscribe();
                        currentSubscription = null;
                    }

                    currentSubscription = stompClient.subscribe("/topic/ticker", (msg) => {
                        try {
                            if (isCleaningUp) {
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
                    stompClient.subscribe("/user/queue/error", (msg) => {
                        console.error('Ticker server error:', msg.body);
                        onError(msg.body);
                    });

                    stompClient.publish({
                        destination: "/app/loadTicker",
                        body: JSON.stringify({ symbol, date }),
                    });

                } catch (error) {
                    console.error('Error setting up ticker subscription:', error);
                    onError('Error setting up ticker subscription');
                    isConnecting = false;
                }
            };

            stompClient.onDisconnect = (frame) => {
                console.log('Disconnected from Ticker WebSocket:', frame);
                isConnecting = false;
                currentSubscription = null;
            };

            stompClient.onStompError = (frame) => {
                console.error('STOMP Ticker error:', frame);
                isConnecting = false;
                const errorMessage = frame.headers["message"] || "Ticker WebSocket connection error";
                onError(errorMessage);
                this.disconnect();
            };

            stompClient.onWebSocketError = (error) => {
                console.error('Ticker WebSocket error:', error);
                isConnecting = false;
                onError('Ticker WebSocket connection failed');
                this.disconnect();
            };

            stompClient.activate();

        } catch (error) {
            console.error('Error creating ticker WebSocket connection:', error);
            isConnecting = false;
            onError('Failed to create ticker WebSocket connection');
        }
    },

    // Send disconnect message to server before closing connection
    sendDisconnectMessage() {
        if (stompClient && stompClient.connected) {
            try {
                console.log('Sending disconnect message to server for ticker');
                stompClient.publish({
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
        isCleaningUp = true;

        // Send disconnect message before closing
        this.sendDisconnectMessage();

        try {
            if (currentSubscription) {
                try {
                    currentSubscription.unsubscribe();
                } catch (error) {
                    console.warn('Error unsubscribing from ticker:', error);
                }
                currentSubscription = null;
            }

            if (stompClient) {
                try {
                    if (stompClient.connected) {
                        stompClient.deactivate();
                    }
                } catch (error) {
                    console.warn('Error deactivating ticker client:', error);
                }
            }
        } catch (error) {
            console.error('Error during ticker disconnect:', error);
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
    }
};
