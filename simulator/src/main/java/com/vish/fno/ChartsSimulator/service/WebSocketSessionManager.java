package com.vish.fno.ChartsSimulator.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Service
public class WebSocketSessionManager {

    private final SimpMessagingTemplate messagingTemplate;

    private final Set<String> activeCandleSessions = new CopyOnWriteArraySet<>();
    private final Set<String> activeTickerSessions = new CopyOnWriteArraySet<>();

    private final ConcurrentHashMap<String, SessionInfo> sessionDetails = new ConcurrentHashMap<>();

    public WebSocketSessionManager(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void registerCandleSession(String sessionId, String symbol, String date, int lookbackPeriod) {
        activeCandleSessions.add(sessionId);
        sessionDetails.put(sessionId, new SessionInfo(symbol, date, lookbackPeriod, "CANDLE"));
        log.info("Registered candle session: {} for symbol: {} on date: {}", sessionId, symbol, date);
    }

    public void registerTickerSession(String sessionId, String symbol, String date) {
        activeTickerSessions.add(sessionId);
        sessionDetails.put(sessionId, new SessionInfo(symbol, date, 0, "TICKER"));
        log.info("Registered ticker session: {} for symbol: {} on date: {}", sessionId, symbol, date);
    }

    public void removeSession(String sessionId) {
        boolean removed = false;

        if (activeCandleSessions.remove(sessionId)) {
            log.info("Removed candle session: {}", sessionId);
            removed = true;
        }

        if (activeTickerSessions.remove(sessionId)) {
            log.info("Removed ticker session: {}", sessionId);
            removed = true;
        }

        SessionInfo info = sessionDetails.remove(sessionId);
        if (info != null && removed) {
            log.info("Cleaned up session details for: {} (type: {}, symbol: {})",
                    sessionId, info.type(), info.symbol());
        }
    }


    public int getActiveCandleSessions() {
        return activeCandleSessions.size();
    }

    public int getActiveTickerSessions() {
        return activeTickerSessions.size();
    }

    public int getTotalActiveSessions() {
        return sessionDetails.size();
    }

    public boolean isSessionActive(String sessionId) {
        return sessionDetails.containsKey(sessionId);
    }


    public void logSessionStatus() {
        log.info("WebSocket Session Status - Total: {}, Candles: {}, Tickers: {}",
                getTotalActiveSessions(), getActiveCandleSessions(), getActiveTickerSessions());
    }

    public record SessionInfo(String symbol, String date, int lookbackPeriod, String type) {}
}
