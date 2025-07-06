import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export class WebSocketManager {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.client = null;
        this.isConnecting = false;
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;

        this.setupGlobalEventListeners();
    }

    setupGlobalEventListeners() {
        if (typeof window === 'undefined') return;

        // Handle tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isConnected()) {
                console.log('Tab became hidden, scheduling WebSocket cleanup');
                setTimeout(() => {
                    if (document.hidden) {
                        this.disconnect();
                    }
                }, 2000);
            }
        });

        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.disconnect();
        });

        window.addEventListener('pagehide', () => {
            this.disconnect();
        });
    }

    async connect() {
        if (this.isConnecting || this.isConnected()) {
            console.log('WebSocket already connected or connecting');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            this.isConnecting = true;

            try {
                this.client = new Client({
                    webSocketFactory: () => new SockJS(this.wsUrl),
                    reconnectDelay: this.reconnectDelay,
                    heartbeatIncoming: 4000,
                    heartbeatOutgoing: 4000,
                    debug: (str) => console.log('STOMP:', str)
                });

                this.client.onConnect = (frame) => {
                    console.log('WebSocket connected:', frame);
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    resolve();
                };

                this.client.onDisconnect = (frame) => {
                    console.log('WebSocket disconnected:', frame);
                    this.isConnecting = false;
                    this.subscriptions.clear();
                };

                this.client.onStompError = (frame) => {
                    console.error('STOMP error:', frame);
                    this.isConnecting = false;
                    const errorMessage = frame.headers["message"] || "WebSocket connection error";
                    reject(new Error(errorMessage));
                };

                this.client.onWebSocketError = (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnecting = false;
                    reject(new Error('WebSocket connection failed'));
                };

                this.client.activate();

            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    subscribe(destination, callback) {
        if (!this.isConnected()) {
            throw new Error('WebSocket not connected');
        }

        if (this.subscriptions.has(destination)) {
            console.log(`Already subscribed to ${destination}`);
            return this.subscriptions.get(destination);
        }

        const subscription = this.client.subscribe(destination, callback);
        this.subscriptions.set(destination, subscription);

        console.log(`Subscribed to ${destination}`);
        return subscription;
    }

    publish(destination, body) {
        if (!this.isConnected()) {
            throw new Error('WebSocket not connected');
        }

        this.client.publish({
            destination,
            body: JSON.stringify(body)
        });
    }

    unsubscribe(destination) {
        const subscription = this.subscriptions.get(destination);
        if (subscription) {
            subscription.unsubscribe();
            this.subscriptions.delete(destination);
            console.log(`Unsubscribed from ${destination}`);
        }
    }

    disconnect() {
        console.log('Disconnecting WebSocket...');

        try {
            // Unsubscribe from all subscriptions
            this.subscriptions.forEach((subscription, destination) => {
                try {
                    subscription.unsubscribe();
                } catch (error) {
                    console.warn(`Error unsubscribing from ${destination}:`, error);
                }
            });
            this.subscriptions.clear();

            // Deactivate client
            if (this.client && this.client.connected) {
                this.client.deactivate();
            }
        } catch (error) {
            console.error('Error during disconnect:', error);
        } finally {
            this.client = null;
            this.isConnecting = false;
        }
    }

    isConnected() {
        return this.client && this.client.connected;
    }

    isConnecting() {
        return this.isConnecting;
    }
}
