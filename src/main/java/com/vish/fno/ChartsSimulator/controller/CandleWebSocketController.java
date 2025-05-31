package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.CandleRequest;
import com.vish.fno.ChartsSimulator.service.CandleService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class CandleWebSocketController {

    private final CandleService candleService;
    private final SimpMessagingTemplate messagingTemplate;
    private final DataClient dataClient;


    @MessageMapping("/loadCandles")
    public void streamCandles(CandleRequest req) throws InterruptedException {
        // 1) compute full-day candles & extrema
        List<Candle> candles = dataClient.getCandleData(req.symbol(), req.date());

        // 2) loop through each minute, slicing out up to i
        for (int i = 0; i < candles.size(); i++) {
            List<Candle> slice = candles.subList(0, i + 1);
            messagingTemplate.convertAndSend(
                    "/topic/candles",
                    candleService.getExtrema(req.lookbackPeriod(), slice)
            );

            Thread.sleep(100); // speed it up: 50 ms per minute tick
        }
    }
}
