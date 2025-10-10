package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.backtest.BacktestResult;
import com.vish.fno.ChartsSimulator.service.backtest.BacktestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

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

    private final BacktestService backtestService;

    /**
     * Get available trading strategies.
     *
     * @return Map containing strategy names, default strategy, and default capital
     */
    @GetMapping("/api/backtest/strategies")
    public Map<String, Object> getAvailableStrategies() {
        return backtestService.getAvailableStrategies();
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
        return backtestService.runBacktest(symbol, date, strategyName, stopLossPercent, takeProfitPercent, initialCapital);
    }

}
