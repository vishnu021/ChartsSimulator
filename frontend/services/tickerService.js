
// frontend/services/tickerService.js
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient = null;
let isConnecting = false;
let currentSubscription = null;

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:9090/ws';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9090';

export const tickerService = {
    // Get ticker data via API
    async getTickerData(symbol, date) {
        try {
            const params = new URLSearchParams({ symbol, date });
            const response = await fetch(`${API_BASE_URL}/api/ticker?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching ticker data:', error);
            throw error;
        }
    },

    // Stream ticker data via WebSocket for real-time visualization
    connectAndStream(symbol, date, onData, onError) {
        if (isConnecting) {
            console.log('Ticker connection already in progress, ignoring request');
            return;
        }

        this.disconnect();
        isConnecting = true;

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
                            const tickerData = JSON.parse(msg.body);
                            onData(tickerData);
                        } catch (error) {
                            console.error('Error parsing ticker message:', error);
                            onError('Error parsing ticker response');
                        }
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

    disconnect() {
        console.log('Disconnecting Ticker WebSocket...');

        try {
            if (currentSubscription) {
                currentSubscription.unsubscribe();
                currentSubscription = null;
            }

            if (stompClient && stompClient.connected) {
                stompClient.deactivate();
            }
        } catch (error) {
            console.error('Error during ticker disconnect:', error);
        } finally {
            stompClient = null;
            isConnecting = false;
            currentSubscription = null;
        }
    },

    isConnected() {
        return stompClient && stompClient.connected;
    },

    isConnecting() {
        return isConnecting;
    }
};
