// src/main/java/com/vish/fno/ChartsSimulator/service/WebSocketSessionManager.java
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

    // Track active sessions for different data types
    private final Set<String> activeCandleSessions = new CopyOnWriteArraySet<>();
    private final Set<String> activeTickerSessions = new CopyOnWriteArraySet<>();

    // Track session details
    private final ConcurrentHashMap<String, SessionInfo> sessionDetails = new ConcurrentHashMap<>();

    public WebSocketSessionManager(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // Register a new candle streaming session
    public void registerCandleSession(String sessionId, String symbol, String date, int lookbackPeriod) {
        activeCandleSessions.add(sessionId);
        sessionDetails.put(sessionId, new SessionInfo(symbol, date, lookbackPeriod, "CANDLE"));
        log.info("Registered candle session: {} for symbol: {} on date: {}", sessionId, symbol, date);
    }

    // Register a new ticker streaming session
    public void registerTickerSession(String sessionId, String symbol, String date) {
        activeTickerSessions.add(sessionId);
        sessionDetails.put(sessionId, new SessionInfo(symbol, date, 0, "TICKER"));
        log.info("Registered ticker session: {} for symbol: {} on date: {}", sessionId, symbol, date);
    }

    // Remove session when client disconnects
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

    // Force disconnect a specific session
    public void disconnectSession(String sessionId, String reason) {
        SessionInfo info = sessionDetails.get(sessionId);
        if (info != null) {
            log.info("Force disconnecting session: {} (reason: {})", sessionId, reason);

            // Send disconnect message to client
            messagingTemplate.convertAndSendToUser(sessionId, "/queue/disconnect",
                    "Session terminated: " + reason);

            // Remove from active sessions
            removeSession(sessionId);
        }
    }

    // Disconnect all sessions of a specific type
    public void disconnectAllSessions(String type, String reason) {
        Set<String> sessionsToDisconnect = new CopyOnWriteArraySet<>();

        sessionDetails.forEach((sessionId, info) -> {
            if (type.equals(info.type())) {
                sessionsToDisconnect.add(sessionId);
            }
        });

        sessionsToDisconnect.forEach(sessionId -> disconnectSession(sessionId, reason));
        log.info("Disconnected {} sessions of type: {} (reason: {})",
                sessionsToDisconnect.size(), type, reason);
    }

    // Get active session counts
    public int getActiveCandleSessions() {
        return activeCandleSessions.size();
    }

    public int getActiveTickerSessions() {
        return activeTickerSessions.size();
    }

    public int getTotalActiveSessions() {
        return sessionDetails.size();
    }

    // Check if session is active
    public boolean isSessionActive(String sessionId) {
        return sessionDetails.containsKey(sessionId);
    }

    // Get session info
    public SessionInfo getSessionInfo(String sessionId) {
        return sessionDetails.get(sessionId);
    }

    // Log current session status
    public void logSessionStatus() {
        log.info("WebSocket Session Status - Total: {}, Candles: {}, Tickers: {}",
                getTotalActiveSessions(), getActiveCandleSessions(), getActiveTickerSessions());
    }

    // Clean up orphaned sessions (called periodically)
    public void cleanupOrphanedSessions() {
        log.debug("Starting cleanup of orphaned sessions...");

        Set<String> sessionsToRemove = new CopyOnWriteArraySet<>();

        // Add logic here to identify orphaned sessions
        // For now, we'll just log the cleanup attempt
        sessionDetails.forEach((sessionId, info) -> {
            // Could add timestamp checks here to remove old sessions
            // or ping clients to verify they're still active
        });

        if (!sessionsToRemove.isEmpty()) {
            sessionsToRemove.forEach(this::removeSession);
            log.info("Cleaned up {} orphaned sessions", sessionsToRemove.size());
        }
    }

    // Session information record
    public record SessionInfo(String symbol, String date, int lookbackPeriod, String type) {}
}
