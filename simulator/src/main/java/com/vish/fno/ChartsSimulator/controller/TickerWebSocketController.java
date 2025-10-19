package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.config.properties.WebSocketProperties;
import com.vish.fno.ChartsSimulator.controller.base.BaseWebSocketController;
import com.vish.fno.models.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerRequest;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.WebSocketSessionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

/**
 * WebSocket controller for handling ticker data streaming operations.
 * Extends BaseWebSocketController to leverage common WebSocket functionality.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@Controller
public class TickerWebSocketController extends BaseWebSocketController {

    private final TickerService tickerService;
    private final WebSocketProperties webSocketProperties;

    /**
     * Constructor for TickerWebSocketController.
     *
     * @param messagingTemplate    Spring messaging template for WebSocket communication
     * @param sessionManager      Manager for WebSocket sessions
     * @param tickerService       Service for ticker data operations
     * @param webSocketProperties Configuration properties for WebSocket settings
     */
    public TickerWebSocketController(SimpMessagingTemplate messagingTemplate,
                                   WebSocketSessionManager sessionManager,
                                   TickerService tickerService,
                                   WebSocketProperties webSocketProperties) {
        super(messagingTemplate, sessionManager);
        this.tickerService = tickerService;
        this.webSocketProperties = webSocketProperties;
    }

    /**
     * Handles WebSocket requests to stream ticker data.
     * Processes ticker data sequentially and streams results to connected clients.
     *
     * @param req            Ticker request containing symbol and date
     * @param headerAccessor WebSocket message header accessor for session management
     * @throws InterruptedException if thread is interrupted during streaming
     */
    @MessageMapping("/loadTicker")
    public void streamTicker(TickerRequest req, SimpMessageHeaderAccessor headerAccessor) throws InterruptedException {
        String sessionId = getSessionId(headerAccessor);
        logStreamStart(sessionId, req.symbol(), req.date(), "ticker");

        // Register session
        sessionManager.registerTickerSession(sessionId, req.symbol(), req.date());

        try {
            List<Ticker> tickers = tickerService.getTickerData(req.symbol(), req.date());

            if (tickers == null || tickers.isEmpty()) {
                logNoDataFound(req.symbol(), req.date(), "ticker");
                sendNoDataMessage("/topic/ticker", req.symbol(), req.date(), "ticker");
                return;
            }

            log.info("Streaming {} tickers for session: {}", tickers.size(), sessionId);

            for (Ticker ticker : tickers) {
                // Check if session is still active before sending each message
                if (!isSessionActive(sessionId)) {
                    logSessionInactive(sessionId, "ticker");
                    break;
                }

                messagingTemplate.convertAndSend("/topic/ticker", ticker);
                Thread.sleep(webSocketProperties.tickerDelay());
            }

            logStreamComplete(sessionId, req.symbol(), "ticker", tickers.size());

        } catch (RuntimeException e) {
            logStreamError(sessionId, "ticker", e);
            sendErrorMessage(sessionId, "ticker", e);
        } finally {
            // Clean up session when streaming is complete
            removeSession(sessionId);
        }
    }

    /**
     * Handles WebSocket disconnect requests for ticker data streaming.
     *
     * @param headerAccessor WebSocket message header accessor for session management
     */
    @MessageMapping("/disconnectTicker")
    public void disconnectTicker(SimpMessageHeaderAccessor headerAccessor) {
        handleDisconnect(headerAccessor, "ticker");
    }
}
