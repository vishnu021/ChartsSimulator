import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { configService } from "../config/configService.js";

export class WebSocketManager {
    constructor(wsUrl = null) {
        this.wsUrl = wsUrl;
        this.client = null;
        this.isConnecting = false;
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.configLoaded = false;

        this.setupGlobalEventListeners();
    }

    async ensureConfig() {
        if (!this.configLoaded) {
            await configService.loadConfig();
            if (!this.wsUrl) {
                this.wsUrl = configService.getWsUrl();
            }
            this.configLoaded = true;
        }
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

        await this.ensureConfig();

        return new Promise((resolve, reject) => {
            this.isConnecting = true;

            try {
                this.client = new Client({
                    webSocketFactory: () => new SockJS(this.wsUrl),
                    reconnectDelay: this.getReconnectDelay(),
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
                    this.scheduleReconnect();
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

    getReconnectDelay() {
        const delay = Math.min(
            this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
            this.maxReconnectDelay
        );
        return delay + Math.random() * 1000; // Add jitter
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        const delay = this.getReconnectDelay();
        console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
        
        setTimeout(() => {
            if (!this.isConnected() && !this.isConnecting) {
                this.reconnectAttempts++;
                this.connect().catch(error => {
                    console.error('Reconnection failed:', error);
                });
            }
        }, delay);
    }

    resetReconnectAttempts() {
        this.reconnectAttempts = 0;
    }
}
