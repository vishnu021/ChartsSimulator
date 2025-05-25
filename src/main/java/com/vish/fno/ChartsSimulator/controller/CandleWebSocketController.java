// src/main/java/com/vish/fno/ChartsSimulator/controller/CandleWebSocketController.java
package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.CandleRequest;
import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.service.CandleService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class CandleWebSocketController {

    private final CandleService candleService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/loadCandles")
    public void streamCandles(CandleRequest req) throws InterruptedException {
        // 1) compute full-day candles & extrema
        Extrema full = candleService.getExtrema(req.symbol(), req.date(), req.lookbackPeriod());
        List<Candle> candles = full.candles();
        List<Candle> maxima = full.maxima();
        List<Candle> minima = full.minima();

        // 2) loop through each minute, slicing out up to i
        for (int i = 0; i < candles.size(); i++) {
            List<Candle> slice = candles.subList(0, i + 1);
            List<Candle> sliceMax = maxima.stream()
                    .filter(c -> slice.stream().anyMatch(s -> s.time().equals(c.time())))
                    .collect(Collectors.toList());
            List<Candle> sliceMin = minima.stream()
                    .filter(c -> slice.stream().anyMatch(s -> s.time().equals(c.time())))
                    .collect(Collectors.toList());

            messagingTemplate.convertAndSend(
                    "/topic/candles",
                    new Extrema(slice, sliceMax, sliceMin)
            );

            Thread.sleep(100); // speed it up: 50 ms per minute tick
        }
    }
}
