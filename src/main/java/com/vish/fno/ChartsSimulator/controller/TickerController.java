package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerResponse;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.analysis.MovingAverageDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class TickerController {
    private final TickerService tickerService;
    private final MovingAverageDetectionService movingAverageDetectionService;

    @GetMapping("/api/ticker")
    public TickerResponse getTickerData(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(required = false, defaultValue = "0.5") double threshold
    ) {
        log.info("🔍 TickerController /api/ticker - Received request with symbol: {}, date: {}, threshold: {}%",
                symbol, date, threshold);

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        // Detect significant moves using Moving Average algorithm
        List<SignificantMove> significantMoves = movingAverageDetectionService.detectSignificantMoves(
                tickers, threshold);

        log.info("🔍 TickerController /api/ticker - Response with tickers count: {}, significant moves: {}",
                tickers.size(), significantMoves.size());

        return new TickerResponse(tickers, significantMoves);
    }
}
