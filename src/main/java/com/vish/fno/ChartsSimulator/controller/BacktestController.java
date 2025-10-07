package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.BacktestResult;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.backtest.BacktestEngine;
import com.vish.fno.ChartsSimulator.service.backtest.Strategy;
import com.vish.fno.ChartsSimulator.service.backtest.StrategyRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for backtesting endpoints.
 *
 * <p>Provides API to run backtests on historical ticker data using
 * pluggable trading strategies. Supports config-driven defaults with
 * request-level overrides.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class BacktestController {

    private final BacktestEngine backtestEngine;
    private final StrategyRegistry strategyRegistry;
    private final TickerService tickerService;
    private final BacktestProperties backtestProperties;

    /**
     * Get available trading strategies.
     *
     * @return Map containing strategy names, default strategy, and default capital
     */
    @GetMapping("/api/backtest/strategies")
    public Map<String, Object> getAvailableStrategies() {
        List<String> strategies = strategyRegistry.getAvailableStrategies();
        log.debug("📋 Available strategies: {}", strategies);

        return Map.of(
            "strategies", strategies,
            "defaultStrategy", backtestProperties.defaultStrategy(),
            "defaultInitialCapital", backtestProperties.defaultInitialCapital()
        );
    }

    /**
     * Run backtest on historical data with optional strategy override.
     *
     * @param symbol Trading symbol
     * @param date Trading date (YYYY-MM-DD)
     * @param strategyName Strategy to use (optional - uses default if not provided)
     * @param stopLossPercent Stop loss override (optional)
     * @param takeProfitPercent Take profit override (optional)
     * @param initialCapital Starting capital (optional - uses default if not provided)
     * @return Backtest results with P/L and performance metrics
     */
    @GetMapping("/api/backtest")
    public BacktestResult runBacktest(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(required = false) String strategyName,
            @RequestParam(required = false) Double stopLossPercent,
            @RequestParam(required = false) Double takeProfitPercent,
            @RequestParam(required = false) Double initialCapital
    ) {
        // Use defaults from config if not provided
        String strategy = strategyName != null ? strategyName : backtestProperties.defaultStrategy();
        double capital = initialCapital != null ? initialCapital : backtestProperties.defaultInitialCapital();

        log.info("🔬 BacktestController /api/backtest - symbol={}, date={}, strategy={}, capital={}",
                symbol, date, strategy, capital);

        // Get strategy instance
        Strategy tradingStrategy = strategyRegistry.getStrategy(strategy);

        // Apply parameter overrides if provided
        if (stopLossPercent != null) {
            tradingStrategy.setStopLossPercent(stopLossPercent);
            log.info("🎯 Stop loss overridden to {}%", stopLossPercent);
        }
        if (takeProfitPercent != null) {
            tradingStrategy.setTakeProfitPercent(takeProfitPercent);
            log.info("🎯 Take profit overridden to {}%", takeProfitPercent);
        }

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        // Run backtest
        BacktestResult result = backtestEngine.runBacktest(
            tradingStrategy,
            tickers,
            capital
        );

        log.info("🔬 Backtest complete - Strategy: {}, P/L: {} ({}%), Trades: {}, Win Rate: {}%",
                strategy,
                result.netProfitLoss(),
                result.profitLossPercent(),
                result.totalTrades(),
                result.winRate());

        return result;
    }
}
