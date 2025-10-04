package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.service.CustomCandleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class CustomCandleController {
    private final CustomCandleService customCandleService;

    @GetMapping("/api/custom-candles")
    public List<Candle> getCustomCandles(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(defaultValue = "60") int timeframeSeconds
    ) {
        log.info("🕯️ CustomCandleController /api/custom-candles - Received request with symbol: {}, date: {}, timeframe: {}s",
                 symbol, date, timeframeSeconds);

        // Validate timeframe (must be between 5 seconds and 15 minutes)
        if (timeframeSeconds < 5 || timeframeSeconds > 900) {
            log.warn("Invalid timeframe: {}s. Must be between 5s and 900s (15 minutes)", timeframeSeconds);
            throw new IllegalArgumentException("Timeframe must be between 5 seconds and 900 seconds (15 minutes)");
        }

        return customCandleService.generateCustomCandles(symbol, date, timeframeSeconds);
    }
}
