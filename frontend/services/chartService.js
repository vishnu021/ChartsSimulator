import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient = null;

export const chartService = {
    connectAndStream(symbol, date, lookbackPeriod, onData, onError) {
        if (stompClient) stompClient.deactivate();

        stompClient = new Client({
            webSocketFactory: () => new SockJS(process.env.NEXT_PUBLIC_WS_URL),
            reconnectDelay: 5000,
        });

        stompClient.onConnect = () => {
            // subscribe to the minute-by-minute feed
            stompClient.subscribe("/topic/candles", (msg) => {
                onData(JSON.parse(msg.body));
            });
            // kick it off
            stompClient.publish({
                destination: "/app/loadCandles",
                body: JSON.stringify({ symbol, date, lookbackPeriod }),
            });
        };

        stompClient.onStompError = (frame) => {
            onError(frame.headers["message"] || "WebSocket error");
        };

        stompClient.activate();
    },

    disconnect() {
        if (stompClient) {
            stompClient.deactivate();
            stompClient = null;
        }
    },
};
