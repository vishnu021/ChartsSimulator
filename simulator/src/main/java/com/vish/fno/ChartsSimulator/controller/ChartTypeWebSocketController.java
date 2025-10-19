package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.config.properties.WebSocketProperties;
import com.vish.fno.ChartsSimulator.controller.base.BaseWebSocketController;
import com.vish.fno.ChartsSimulator.model.ChartTypeRequest;
import com.vish.fno.ChartsSimulator.service.ChartTypeService;
import com.vish.fno.ChartsSimulator.service.WebSocketSessionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

/**
 * WebSocket controller for handling chart type data streaming operations.
 * Extends BaseWebSocketController to leverage common WebSocket functionality.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@Controller
public class ChartTypeWebSocketController extends BaseWebSocketController {

    private final ChartTypeService chartTypeService;
    private final WebSocketProperties webSocketProperties;

    /**
     * Constructor for ChartTypeWebSocketController.
     *
     * @param messagingTemplate    Spring messaging template for WebSocket communication
     * @param sessionManager      Manager for WebSocket sessions
     * @param chartTypeService    Service for chart type data operations
     * @param webSocketProperties Configuration properties for WebSocket settings
     */
    public ChartTypeWebSocketController(SimpMessagingTemplate messagingTemplate,
                                      WebSocketSessionManager sessionManager,
                                      ChartTypeService chartTypeService,
                                      WebSocketProperties webSocketProperties) {
        super(messagingTemplate, sessionManager);
        this.chartTypeService = chartTypeService;
        this.webSocketProperties = webSocketProperties;
    }

    /**
     * Handles WebSocket requests to stream chart type data.
     * Processes various chart types and streams results to connected clients.
     *
     * @param req Chart type request containing symbol, date, and chart types
     * @throws InterruptedException if thread is interrupted during streaming
     */
    @MessageMapping("/loadChartTypes")
    public void streamChartTypes(ChartTypeRequest req) throws InterruptedException {
        log.info("Starting chart types stream for {} on {}", req.symbol(), req.date());

        try {
            var chartData = chartTypeService.getChartDataStream(req.symbol(), req.date(), req.chartTypes());
            messagingTemplate.convertAndSend("/topic/chartTypes", chartData);
            log.info("Completed chart types stream for {}", req.symbol());
        } catch (RuntimeException e) {
            log.error("Error during chart types streaming for symbol: {}", req.symbol(), e);
            throw e;
        }
    }
}
