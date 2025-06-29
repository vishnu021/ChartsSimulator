
// frontend/services/chartTypeService.js
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient = null;
let isConnecting = false;
let currentSubscription = null;

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:9090/ws';

export const chartTypeService = {
    connectAndStream(symbol, date, chartTypes, onData, onError) {
        if (isConnecting) {
            console.log('Chart type connection already in progress, ignoring request');
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
                    console.log('STOMP ChartType: ' + str);
                }
            });

            stompClient.onConnect = (frame) => {
                console.log('Connected to Chart Type WebSocket:', frame);
                isConnecting = false;

                try {
                    if (currentSubscription) {
                        currentSubscription.unsubscribe();
                        currentSubscription = null;
                    }

                    currentSubscription = stompClient.subscribe("/topic/chartTypes", (msg) => {
                        try {
                            const chartData = JSON.parse(msg.body);
                            onData(chartData);
                        } catch (error) {
                            console.error('Error parsing chart type message:', error);
                            onError('Error parsing chart type response');
                        }
                    });

                    stompClient.publish({
                        destination: "/app/loadChartTypes",
                        body: JSON.stringify({ symbol, date, chartTypes }),
                    });

                } catch (error) {
                    console.error('Error setting up chart type subscription:', error);
                    onError('Error setting up chart type subscription');
                    isConnecting = false;
                }
            };

            stompClient.onDisconnect = (frame) => {
                console.log('Disconnected from Chart Type WebSocket:', frame);
                isConnecting = false;
                currentSubscription = null;
            };

            stompClient.onStompError = (frame) => {
                console.error('STOMP Chart Type error:', frame);
                isConnecting = false;
                const errorMessage = frame.headers["message"] || "Chart Type WebSocket connection error";
                onError(errorMessage);
                this.disconnect();
            };

            stompClient.onWebSocketError = (error) => {
                console.error('Chart Type WebSocket error:', error);
                isConnecting = false;
                onError('Chart Type WebSocket connection failed');
                this.disconnect();
            };

            stompClient.activate();

        } catch (error) {
            console.error('Error creating chart type WebSocket connection:', error);
            isConnecting = false;
            onError('Failed to create chart type WebSocket connection');
        }
    },

    disconnect() {
        console.log('Disconnecting Chart Type WebSocket...');

        try {
            if (currentSubscription) {
                currentSubscription.unsubscribe();
                currentSubscription = null;
            }

            if (stompClient && stompClient.connected) {
                stompClient.deactivate();
            }
        } catch (error) {
            console.error('Error during chart type disconnect:', error);
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
