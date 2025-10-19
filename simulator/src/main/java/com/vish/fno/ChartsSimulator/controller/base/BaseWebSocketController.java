package com.vish.fno.ChartsSimulator.controller.base;

import com.vish.fno.ChartsSimulator.service.WebSocketSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/**
 * Base class for WebSocket controllers providing common functionality.
 * This abstract class contains shared methods and utilities for WebSocket operations
 * to eliminate code duplication across specific WebSocket controllers.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@RequiredArgsConstructor
public abstract class BaseWebSocketController {

    protected final SimpMessagingTemplate messagingTemplate;
    protected final WebSocketSessionManager sessionManager;

    /**
     * Extracts session ID from WebSocket message headers.
     *
     * @param headerAccessor WebSocket message header accessor
     * @return Session ID string
     */
    protected String getSessionId(SimpMessageHeaderAccessor headerAccessor) {
        return headerAccessor.getSessionId();
    }

    /**
     * Logs the start of a data streaming operation.
     *
     * @param sessionId  WebSocket session ID
     * @param symbol     Trading symbol
     * @param date       Date for data retrieval
     * @param dataType   Type of data being streamed (e.g., "candle", "ticker")
     */
    protected void logStreamStart(String sessionId, String symbol, String date, String dataType) {
        log.info("Starting {} stream for session: {} - symbol: {} on date: {}",
                dataType, sessionId, symbol, date);
    }

    /**
     * Logs the completion of a data streaming operation.
     *
     * @param sessionId  WebSocket session ID
     * @param symbol     Trading symbol
     * @param dataType   Type of data that was streamed
     */
    protected void logStreamComplete(String sessionId, String symbol, String dataType) {
        log.info("Completed {} stream for session: {} - symbol: {}",
                dataType, sessionId, symbol);
    }

    /**
     * Logs streaming completion with item count.
     *
     * @param sessionId  WebSocket session ID
     * @param symbol     Trading symbol
     * @param dataType   Type of data that was streamed
     * @param itemCount  Number of items streamed
     */
    protected void logStreamComplete(String sessionId, String symbol, String dataType, int itemCount) {
        log.info("Completed {} stream for session: {} - symbol: {} with {} items",
                dataType, sessionId, symbol, itemCount);
    }

    /**
     * Logs an error during streaming operation.
     *
     * @param sessionId  WebSocket session ID
     * @param dataType   Type of data being streamed
     * @param error      Exception that occurred
     */
    protected void logStreamError(String sessionId, String dataType, Exception error) {
        log.error("Error during {} streaming for session: {}", dataType, sessionId, error);
    }

    /**
     * Logs when a streaming operation is stopped due to inactive session.
     *
     * @param sessionId  WebSocket session ID
     * @param dataType   Type of data being streamed
     */
    protected void logSessionInactive(String sessionId, String dataType) {
        log.info("Session {} is no longer active, stopping {} stream", sessionId, dataType);
    }

    /**
     * Logs a disconnect request.
     *
     * @param sessionId  WebSocket session ID
     * @param dataType   Type of data connection being disconnected
     */
    protected void logDisconnectRequest(String sessionId, String dataType) {
        log.info("Received disconnect request for {} session: {}", dataType, sessionId);
    }

    /**
     * Logs when no data is found for the requested parameters.
     *
     * @param symbol    Trading symbol
     * @param date      Date for data retrieval
     * @param dataType  Type of data requested
     */
    protected void logNoDataFound(String symbol, String date, String dataType) {
        log.warn("No {} data found for symbol: {} on date: {}", dataType, symbol, date);
    }

    /**
     * Sends a "no data available" message to the client.
     *
     * @param topic     WebSocket topic to send to
     * @param symbol    Trading symbol
     * @param date      Date for data retrieval
     * @param dataType  Type of data
     */
    protected void sendNoDataMessage(String topic, String symbol, String date, String dataType) {
        String message = String.format("No %s data available for %s on %s", dataType, symbol, date);
        messagingTemplate.convertAndSend(topic, message);
    }

    /**
     * Sends an error message to a specific user session.
     *
     * @param sessionId  WebSocket session ID
     * @param dataType   Type of data being processed
     * @param error      Exception that occurred
     */
    protected void sendErrorMessage(String sessionId, String dataType, Exception error) {
        String message = String.format("Error streaming %s data: %s", dataType, error.getMessage());
        messagingTemplate.convertAndSendToUser(sessionId, "/queue/error", message);
    }

    /**
     * Checks if a session is still active before proceeding with operations.
     *
     * @param sessionId WebSocket session ID
     * @return true if session is active, false otherwise
     */
    protected boolean isSessionActive(String sessionId) {
        return sessionManager.isSessionActive(sessionId);
    }

    /**
     * Removes a session from the session manager.
     *
     * @param sessionId WebSocket session ID
     */
    protected void removeSession(String sessionId) {
        sessionManager.removeSession(sessionId);
    }

    /**
     * Handles disconnection request for any data type.
     *
     * @param headerAccessor WebSocket message header accessor
     * @param dataType       Type of data connection being disconnected
     */
    protected void handleDisconnect(SimpMessageHeaderAccessor headerAccessor, String dataType) {
        String sessionId = getSessionId(headerAccessor);
        logDisconnectRequest(sessionId, dataType);
        removeSession(sessionId);
    }
}