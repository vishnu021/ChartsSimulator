package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerResponse;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.backtest.MovingAverageStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for ticker data endpoints.
 *
 * <p>This controller provides access to historical tick data and signal detection
 * using pluggable trading strategies.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class TickerController {
    private final TickerService tickerService;
    private final MovingAverageStrategy strategy;

    /**
     * Retrieves ticker data with detected trading signals.
     *
     * <p>Uses the MovingAverageStrategy (which implements the Strategy interface)
     * to detect trading signals from historical tick data.</p>
     *
     * @param symbol Trading symbol (e.g., "NIFTY25O0724600CE")
     * @param date Trading date (format: "YYYY-MM-DD")
     * @param threshold Signal detection threshold percentage (default: 0.5%)
     * @return TickerResponse containing tickers and significant moves
     */
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

        // Detect significant moves using Strategy architecture
        // MovingAverageStrategy implements the Strategy interface
        List<SignificantMove> significantMoves = strategy.detectSignals(tickers, threshold);

        log.info("🔍 TickerController /api/ticker - Using strategy: {}, tickers: {}, signals: {}",
                strategy.getStrategyName(), tickers.size(), significantMoves.size());

        return new TickerResponse(tickers, significantMoves);
    }
}
