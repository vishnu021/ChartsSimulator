package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.TickerResponse;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.backtest.Strategy;
import com.vish.fno.ChartsSimulator.service.backtest.StrategyRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
     * Retrieves ticker data with detected trading signals.
     *
     * <p>Uses config-driven strategy selection to detect trading signals
     * from historical tick data. Strategy can be overridden via query parameter.</p>
     *
     * @param symbol Trading symbol (e.g., "NIFTY25O0724600CE")
     * @param date Trading date (format: "YYYY-MM-DD")
     * @param strategyName Strategy to use (optional - uses default if not provided)
     * @param threshold Signal detection threshold percentage (default: 0.5%)
     * @return TickerResponse containing tickers and significant moves
     */
    @GetMapping("/api/ticker")
    public TickerResponse getTickerData(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(required = false) String strategyName,
            @RequestParam(required = false, defaultValue = "0.5") double threshold
    ) {
        // Use default strategy if not provided
        String strategy = strategyName != null ? strategyName : backtestProperties.defaultStrategy();

        log.info("🔍 TickerController /api/ticker - symbol: {}, date: {}, strategy: {}, threshold: {}%",
                symbol, date, strategy, threshold);

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        // Get strategy instance and detect signals
        Strategy tradingStrategy = strategyRegistry.getStrategy(strategy);
        List<SignificantMove> significantMoves = tradingStrategy.detectSignals(tickers, threshold);

        log.info("🔍 TickerController /api/ticker - Strategy: {}, tickers: {}, signals: {}",
                tradingStrategy.getStrategyName(), tickers.size(), significantMoves.size());

        return new TickerResponse(tickers, significantMoves);
    }
}
