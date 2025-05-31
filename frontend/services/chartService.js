import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient = null;
let isConnecting = false;
let currentSubscription = null;

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:9090/ws';

export const chartService = {
    connectAndStream(symbol, date, lookbackPeriod, onData, onError) {
        // Prevent multiple simultaneous connections
        if (isConnecting) {
            console.log('Connection already in progress, ignoring request');
            return;
        }

        // Clean up existing connection
        this.disconnect();

        isConnecting = true;

        try {
            stompClient = new Client({
                webSocketFactory: () => new SockJS(WEBSOCKET_URL),
                reconnectDelay: 5000,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                debug: (str) => {
                    console.log('STOMP: ' + str);
                }
            });

            stompClient.onConnect = (frame) => {
                console.log('Connected to WebSocket:', frame);
                isConnecting = false;

                try {
                    // Unsubscribe from any previous subscription
                    if (currentSubscription) {
                        currentSubscription.unsubscribe();
                        currentSubscription = null;
                    }

                    // Subscribe to the minute-by-minute feed
                    currentSubscription = stompClient.subscribe("/topic/candles", (msg) => {
                        try {
                            const data = JSON.parse(msg.body);
                            onData(data);
                        } catch (error) {
                            console.error('Error parsing message:', error);
                            onError('Error parsing server response');
                        }
                    });

                    // Send the request to start streaming
                    stompClient.publish({
                        destination: "/app/loadCandles",
                        body: JSON.stringify({ symbol, date, lookbackPeriod }),
                    });

                } catch (error) {
                    console.error('Error setting up subscription:', error);
                    onError('Error setting up data subscription');
                    isConnecting = false;
                }
            };

            stompClient.onDisconnect = (frame) => {
                console.log('Disconnected from WebSocket:', frame);
                isConnecting = false;
                currentSubscription = null;
            };

            stompClient.onStompError = (frame) => {
                console.error('STOMP error:', frame);
                isConnecting = false;
                const errorMessage = frame.headers["message"] || "WebSocket connection error";
                onError(errorMessage);

                // Clean up on error
                this.disconnect();
            };

            stompClient.onWebSocketError = (error) => {
                console.error('WebSocket error:', error);
                isConnecting = false;
                onError('WebSocket connection failed');

                // Clean up on error
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

    disconnect() {
        console.log('Disconnecting WebSocket...');

        try {
            // Unsubscribe from current subscription
            if (currentSubscription) {
                currentSubscription.unsubscribe();
                currentSubscription = null;
            }

            // Deactivate the client
            if (stompClient && stompClient.connected) {
                stompClient.deactivate();
            }
        } catch (error) {
            console.error('Error during disconnect:', error);
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
