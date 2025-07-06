package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.CandleRequest;
import com.vish.fno.ChartsSimulator.service.CandleService;
import com.vish.fno.ChartsSimulator.service.WebSocketSessionManager;
import com.vish.fno.ChartsSimulator.util.FileUtil;
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
public class CandleWebSocketController {

    private final CandleService candleService;
    private final SimpMessagingTemplate messagingTemplate;
    private final DataClient dataClient;
    private final WebSocketSessionManager sessionManager;

    @Value("${app.websocket.messageDelay}")
    private long messageDelay;

    @MessageMapping("/loadCandles")
    public void streamCandles(CandleRequest req, SimpMessageHeaderAccessor headerAccessor) throws InterruptedException {
        String sessionId = headerAccessor.getSessionId();

        log.info("Starting candle stream for session: {} - symbol: {} on date: {}",
                sessionId, req.symbol(), req.date());

        // Register session
        sessionManager.registerCandleSession(sessionId, req.symbol(), req.date(), req.lookbackPeriod());

        try {
            List<Candle> candles = dataClient.getCandleData(req.symbol(), req.date());

            if (candles == null || candles.isEmpty()) {
                log.warn("No candle data found for symbol: {} on date: {}", req.symbol(), req.date());
                messagingTemplate.convertAndSend("/topic/candles",
                        "No data available for " + req.symbol() + " on " + req.date());
                return;
            }

            Object finalResponse = null;
            for (int i = 0; i < candles.size(); i++) {
                // Check if session is still active before sending each message
                if (!sessionManager.isSessionActive(sessionId)) {
                    log.info("Session {} is no longer active, stopping candle stream", sessionId);
                    break;
                }

                List<Candle> slice = candles.subList(0, i + 1);
                finalResponse = candleService.getExtrema(req.lookbackPeriod(), slice);
                messagingTemplate.convertAndSend("/topic/candles", finalResponse);

                Thread.sleep(messageDelay);
            }

            // Save final output
            if (finalResponse != null) {
                String outputPath = "output/candles-output-" + req.symbol() + "-" + req.date() + ".json";
                FileUtil.saveToFile(outputPath, finalResponse);
            }

            log.info("Completed candle stream for session: {} - symbol: {}", sessionId, req.symbol());

        } catch (Exception e) {
            log.error("Error during candle streaming for session: {}", sessionId, e);
            messagingTemplate.convertAndSendToUser(sessionId, "/queue/error",
                    "Error streaming candle data: " + e.getMessage());
        } finally {
            // Clean up session when streaming is complete
            sessionManager.removeSession(sessionId);
        }
    }

    @MessageMapping("/disconnectCandles")
    public void disconnectCandles(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        log.info("Received disconnect request for candle session: {}", sessionId);
        sessionManager.removeSession(sessionId);
    }
}
