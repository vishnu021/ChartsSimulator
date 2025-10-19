package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.config.properties.WebSocketProperties;
import com.vish.fno.ChartsSimulator.controller.base.BaseWebSocketController;
import com.vish.fno.phaseanalyzer.model.Candle;
import com.vish.fno.phaseanalyzer.model.CandleRequest;
import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.service.CandleService;
import com.vish.fno.ChartsSimulator.service.WebSocketSessionManager;
import com.vish.fno.ChartsSimulator.util.FileUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

/**
 * WebSocket controller for handling candle data streaming operations.
 * Extends BaseWebSocketController to leverage common WebSocket functionality.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@Controller
public class CandleWebSocketController extends BaseWebSocketController {

    private final CandleService candleService;
    private final DataClient dataClient;
    private final WebSocketProperties webSocketProperties;

    /**
     * Constructor for CandleWebSocketController.
     *
     * @param messagingTemplate    Spring messaging template for WebSocket communication
     * @param sessionManager      Manager for WebSocket sessions
     * @param candleService       Service for candle data operations
     * @param dataClient          Client for fetching external data
     * @param webSocketProperties Configuration properties for WebSocket settings
     */
    public CandleWebSocketController(SimpMessagingTemplate messagingTemplate,
                                   WebSocketSessionManager sessionManager,
                                   CandleService candleService,
                                   DataClient dataClient,
                                   WebSocketProperties webSocketProperties) {
        super(messagingTemplate, sessionManager);
        this.candleService = candleService;
        this.dataClient = dataClient;
        this.webSocketProperties = webSocketProperties;
    }

    /**
     * Handles WebSocket requests to stream candle data with extrema analysis.
     * Processes candle data incrementally and streams results to connected clients.
     *
     * @param req            Candle request containing symbol, date, and lookback period
     * @param headerAccessor WebSocket message header accessor for session management
     * @throws InterruptedException if thread is interrupted during streaming
     */
    @MessageMapping("/loadCandles")
    public void streamCandles(CandleRequest req, SimpMessageHeaderAccessor headerAccessor) throws InterruptedException {
        String sessionId = getSessionId(headerAccessor);
        logStreamStart(sessionId, req.symbol(), req.date(), "candle");

        // Register session
        sessionManager.registerCandleSession(sessionId, req.symbol(), req.date(), req.lookbackPeriod());

        try {
            List<Candle> candles = dataClient.getCandleData(req.symbol(), req.date());

            if (candles == null || candles.isEmpty()) {
                logNoDataFound(req.symbol(), req.date(), "candle");
                sendNoDataMessage("/topic/candles", req.symbol(), req.date(), "candle");
                return;
            }

            Extrema finalResponse = null;
            // Use custom delay if provided, otherwise use default from properties
            long delay = (req.customDelay() != null && req.customDelay() > 0)
                    ? req.customDelay()
                    : webSocketProperties.messageDelay();

            for (int i = 0; i < candles.size(); i++) {
                // Check if session is still active before sending each message
                if (!isSessionActive(sessionId)) {
                    logSessionInactive(sessionId, "candle");
                    break;
                }

                List<Candle> slice = candles.subList(0, i + 1);
                finalResponse = candleService.getExtrema(req.lookbackPeriod(), slice);
                messagingTemplate.convertAndSend("/topic/candles", finalResponse);

                Thread.sleep(delay);
            }

            // Save final output
            if (finalResponse != null) {
                String outputPath = "output/candles-output-" + req.symbol() + "-" + req.date() + ".json";
                FileUtil.saveToFile(outputPath, finalResponse);
            }

            logStreamComplete(sessionId, req.symbol(), "candle");

        } catch (RuntimeException e) {
            logStreamError(sessionId, "candle", e);
            sendErrorMessage(sessionId, "candle", e);
        } finally {
            // Clean up session when streaming is complete
            removeSession(sessionId);
        }
    }

    /**
     * Handles WebSocket disconnect requests for candle data streaming.
     *
     * @param headerAccessor WebSocket message header accessor for session management
     */
    @MessageMapping("/disconnectCandles")
    public void disconnectCandles(SimpMessageHeaderAccessor headerAccessor) {
        handleDisconnect(headerAccessor, "candle");
    }
}
