package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.ChartTypeRequest;
import com.vish.fno.ChartsSimulator.service.ChartTypeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChartTypeWebSocketController {

    private final ChartTypeService chartTypeService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.websocket.messageDelay}")
    private long messageDelay;

    @MessageMapping("/loadChartTypes")
    public void streamChartTypes(ChartTypeRequest req) throws InterruptedException {
        log.info("Starting chart types stream for {} on {}", req.symbol(), req.date());
        var chartData = chartTypeService.getChartDataStream(req.symbol(), req.date(), req.chartTypes());
        messagingTemplate.convertAndSend("/topic/chartTypes", chartData);
        log.info("Completed chart types stream for {}", req.symbol());
    }
}
