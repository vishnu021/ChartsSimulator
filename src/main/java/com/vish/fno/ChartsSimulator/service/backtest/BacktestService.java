package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.BacktestResult;
import com.vish.fno.ChartsSimulator.service.TickerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BacktestService {

    private final StrategyRegistry strategyRegistry;
    private final BacktestProperties backtestProperties;
    private final TickerService tickerService;
    private final BacktestEngineFactory backtestEngineFactory;

    public Map<String, Object> getAvailableStrategies() {
        List<String> strategies = strategyRegistry.getAvailableStrategies();
        log.debug("📋 Available strategies: {}", strategies);

        return Map.of(
                "strategies", strategies,
                "defaultStrategy", backtestProperties.defaultStrategy(),
                "defaultInitialCapital", backtestProperties.defaultInitialCapital()
        );
    }

    public BacktestResult runBacktest(
            final String symbol,
            final String date,
            final String strategyName,
            final Double stopLossPercent,
            final Double takeProfitPercent,
            final Double initialCapital
    ) {
        final String strategy = getStrategy(strategyName);
        final double capital = getCapital(initialCapital);

        log.info("🔬 /api/backtest - symbol={}, date={}, strategy={}, capital={}",
                symbol, date, strategy, capital);

        // Get strategy instance
        Strategy tradingStrategy = strategyRegistry.getStrategy(strategy);

        applyParameterOverrides(stopLossPercent, takeProfitPercent, tradingStrategy);

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        // Create fresh engine instance for this backtest run
        BacktestEngine engine = backtestEngineFactory.createEngine(symbol,  date, tradingStrategy, tickers, capital);
        log.debug("🏭 Created new BacktestEngine instance for backtest run");

        // Run backtest
        BacktestResult result = engine.runBacktest();

        log.info("🔬 Backtest complete - Strategy: {}, P/L: {} ({}%), Trades: {}, Win Rate: {}%",
                strategy,
                result.netProfitLoss(),
                result.profitLossPercent(),
                result.totalTrades(),
                result.winRate());

        return result;
    }

    private void applyParameterOverrides(Double stopLossPercent, Double takeProfitPercent, Strategy tradingStrategy) {
        // Apply parameter overrides if provided
        if (stopLossPercent != null) {
            tradingStrategy.setStopLossPercent(stopLossPercent);
            log.info("🎯 Stop loss overridden to {}%", stopLossPercent);
        }
        if (takeProfitPercent != null) {
            tradingStrategy.setTakeProfitPercent(takeProfitPercent);
            log.info("🎯 Take profit overridden to {}%", takeProfitPercent);
        }
    }

    private double getCapital(Double initialCapital) {
        return initialCapital != null ? initialCapital : backtestProperties.defaultInitialCapital();
    }

    private String getStrategy(String strategyName) {
        // Use defaults from config if not provided
        return strategyName != null ? strategyName : backtestProperties.defaultStrategy();
    }
}
