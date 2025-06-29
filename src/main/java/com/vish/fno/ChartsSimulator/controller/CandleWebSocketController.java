package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.CandleRequest;
import com.vish.fno.ChartsSimulator.service.CandleService;
import com.vish.fno.ChartsSimulator.util.FileUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.websocket.messageDelay}")
    private long messageDelay;


    @MessageMapping("/loadCandles")
    public void streamCandles(CandleRequest req) throws InterruptedException {
        List<Candle> candles = dataClient.getCandleData(req.symbol(), req.date());

        Object finalResponse = null;
        for (int i = 0; i < candles.size(); i++) {
            List<Candle> slice = candles.subList(0, i + 1);
            finalResponse = candleService.getExtrema(req.lookbackPeriod(), slice);
            messagingTemplate.convertAndSend("/topic/candles", finalResponse);

            Thread.sleep(messageDelay);
        }
        String outputPath = "output/candles-output-" + req.symbol() + "-" + req.date() + ".json";
        FileUtil.saveToFile(outputPath, finalResponse);
    }
}
