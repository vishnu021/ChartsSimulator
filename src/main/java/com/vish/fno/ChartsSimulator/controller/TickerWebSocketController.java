package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerRequest;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.WebSocketSessionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class TickerWebSocketController {

    private final TickerService tickerService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketSessionManager sessionManager;

    @Value("${app.websocket.tickerDelay:50}")
    private long tickerDelay;

    @MessageMapping("/loadTicker")
    public void streamTicker(TickerRequest req, SimpMessageHeaderAccessor headerAccessor) throws InterruptedException {
        String sessionId = headerAccessor.getSessionId();

        log.info("Starting ticker stream for session: {} - symbol: {} on date: {}",
                sessionId, req.symbol(), req.date());

        // Register session
        sessionManager.registerTickerSession(sessionId, req.symbol(), req.date());

        try {
            List<Ticker> tickers = tickerService.getTickerData(req.symbol(), req.date());

            if (tickers == null || tickers.isEmpty()) {
                log.warn("No ticker data found for symbol: {} on date: {}", req.symbol(), req.date());
                messagingTemplate.convertAndSend("/topic/ticker",
                        "No ticker data available for " + req.symbol() + " on " + req.date());
                return;
            }

            log.info("Streaming {} tickers for session: {}", tickers.size(), sessionId);

            for (Ticker ticker : tickers) {
                // Check if session is still active before sending each message
                if (!sessionManager.isSessionActive(sessionId)) {
                    log.info("Session {} is no longer active, stopping ticker stream", sessionId);
                    break;
                }

                messagingTemplate.convertAndSend("/topic/ticker", ticker);
                Thread.sleep(tickerDelay);
            }

            log.info("Completed ticker stream for session: {} - symbol: {} with {} ticks",
                    sessionId, req.symbol(), tickers.size());

        } catch (Exception e) {
            log.error("Error during ticker streaming for session: {}", sessionId, e);
            messagingTemplate.convertAndSendToUser(sessionId, "/queue/error",
                    "Error streaming ticker data: " + e.getMessage());
        } finally {
            // Clean up session when streaming is complete
            sessionManager.removeSession(sessionId);
        }
    }

    @MessageMapping("/disconnectTicker")
    public void disconnectTicker(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        log.info("Received disconnect request for ticker session: {}", sessionId);
        sessionManager.removeSession(sessionId);
    }
}
