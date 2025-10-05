package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.BacktestResult;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.backtest.BacktestEngine;
import com.vish.fno.ChartsSimulator.service.backtest.MovingAverageStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for backtesting endpoints.
 *
 * <p>Provides API to run backtests on historical ticker data using
 * pluggable trading strategies.</p>
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
    private final MovingAverageStrategy movingAverageStrategy;
    private final TickerService tickerService;

    /**
     * Run backtest on historical data.
     *
     * @param symbol Trading symbol
     * @param date Trading date (YYYY-MM-DD)
     * @param initialCapital Starting capital (default: 100000)
     * @return Backtest results with P/L and performance metrics
     */
    @GetMapping("/api/backtest")
    public BacktestResult runBacktest(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(required = false, defaultValue = "100000") double initialCapital
    ) {
        log.info("🔬 BacktestController /api/backtest - symbol={}, date={}, capital={}",
                symbol, date, initialCapital);

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        // Run backtest
        BacktestResult result = backtestEngine.runBacktest(
            movingAverageStrategy,
            tickers,
            initialCapital
        );

        log.info("🔬 Backtest complete - P/L: {} ({:.2f}%), Trades: {}, Win Rate: {:.1f}%",
                result.netProfitLoss(),
                result.profitLossPercent(),
                result.totalTrades(),
                result.winRate());

        return result;
    }
}
