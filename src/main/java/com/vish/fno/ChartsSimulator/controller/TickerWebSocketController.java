// src/main/java/com/vish/fno/ChartsSimulator/controller/TickerWebSocketController.java
package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerRequest;
import com.vish.fno.ChartsSimulator.service.TickerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Slf4j
@Controller
@RequiredArgsConstructor
public class TickerWebSocketController {

    private final TickerService tickerService;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${app.websocket.tickerDelay:1000}")
    private long tickerDelay;

    @MessageMapping("/loadTicker")
    public void streamTicker(TickerRequest req) throws InterruptedException {
        log.info("Starting ticker stream for {} on {}", req.symbol(), req.date());

        List<Ticker> tickers = tickerService.getTickerData(req.symbol(), req.date());

        for (Ticker ticker : tickers) {
            messagingTemplate.convertAndSend("/topic/ticker", ticker);
            Thread.sleep(tickerDelay); // 1 second delay for real-time feel
        }

        log.info("Completed ticker stream for {} with {} ticks", req.symbol(), tickers.size());
    }
}
