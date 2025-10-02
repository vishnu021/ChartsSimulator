package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.service.CandleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class CandleController {
    private final CandleService service;

    @GetMapping("/api/ohlc")
    public Extrema getCandles(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(defaultValue = "3") int lookbackPeriod
    ) {
        log.info("🔍 CandleController /api/ohlc - Received request with symbol: {}, date: {}, lookbackPeriod: {}", symbol, date, lookbackPeriod);

        Extrema result = service.getCandleAndExtrema(symbol, date, lookbackPeriod);

        log.info("🔍 CandleController /api/ohlc - Response with candles count: {}, maxima count: {}, minima count: {}",
                (result.candles() != null ? result.candles().size() : 0),
                (result.maxima() != null ? result.maxima().size() : 0),
                (result.minima() != null ? result.minima().size() : 0));
        return result;
    }
}
