package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerResponse;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.backtest.Strategy;
import com.vish.fno.ChartsSimulator.service.backtest.StrategyRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * REST controller for ticker data endpoints.
 *
 * <p>This controller provides access to historical tick data and signal detection
 * using config-driven pluggable trading strategies.</p>
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
    private final StrategyRegistry strategyRegistry;
    private final BacktestProperties backtestProperties;

    /**
     * Retrieves ticker data with optional trading signals detection.
     *
     * <p>Uses config-driven strategy selection to detect trading signals
     * from historical tick data. Strategy can be overridden via query parameter.</p>
     *
     * <p><b>Signal Detection:</b> Processes tickers incrementally, detecting signals
     * on each tick to simulate real-time trading. Collects all detected signals into response.</p>
     *
     * @param symbol Trading symbol (e.g., "NIFTY25O0724600CE")
     * @param date Trading date (format: "YYYY-MM-DD")
     * @param strategyName Strategy to use (optional - uses default if not provided)
     * @param runStrategy Whether to run strategy detection (optional - defaults to true)
     * @return TickerResponse containing tickers and detected signals
     */
    @GetMapping("/api/ticker")
    public TickerResponse getTickerData(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(required = false) String strategyName,
            @RequestParam(required = false, defaultValue = "true") boolean runStrategy
    ) {
        // Use default strategy if not provided
        String strategy = strategyName != null ? strategyName : backtestProperties.defaultStrategy();

        log.info("🔍 TickerController /api/ticker - symbol: {}, date: {}, strategy: {}, runStrategy: {}",
                symbol, date, strategy, runStrategy);

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        // Skip signal detection if runStrategy is false
        if (!runStrategy) {
            log.info("⏭️ TickerController /api/ticker - Skipping strategy execution, tickers: {}", tickers.size());
            return new TickerResponse(tickers, List.of());
        }

        // Get strategy instance and detect signals incrementally
        Strategy tradingStrategy = strategyRegistry.getStrategy(strategy);
        tradingStrategy.reset(); // Clear any previous state

        List<Signal> signals = new ArrayList<>();
        List<Ticker> historicalData = new ArrayList<>();

        // Process each ticker incrementally (simulates real-time)
        for (Ticker ticker : tickers) {
            historicalData.add(ticker);
            Optional<Signal> signal = tradingStrategy.detectSignal(historicalData);
            signal.ifPresent(signals::add);
        }

        log.info("🔍 TickerController /api/ticker - Strategy: {}, tickers: {}, signals: {}",
                tradingStrategy.getStrategyName(), tickers.size(), signals.size());

        return new TickerResponse(tickers, signals);
    }
}
