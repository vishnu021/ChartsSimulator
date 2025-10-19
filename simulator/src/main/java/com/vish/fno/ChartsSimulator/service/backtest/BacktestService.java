package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.BacktestResult;
import com.vish.fno.ChartsSimulator.service.TickerService;
import com.vish.fno.ChartsSimulator.service.strategy.Strategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
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
    private final BacktestReportGenerator reportGenerator;

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
            final Double initialCapital,
            final Boolean phaseFilteringEnabled,
            final String allowedPhases
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

        // Create custom properties with frontend overrides (if provided)
        BacktestProperties customProperties = createCustomProperties(phaseFilteringEnabled, allowedPhases);

        // Create fresh engine instance for this backtest run with custom properties
        BacktestEngine engine = backtestEngineFactory.createEngine(symbol, date, tradingStrategy, tickers, capital, customProperties);
        log.debug("🏭 Created new BacktestEngine instance for backtest run");

        // Run backtest
        BacktestResult result = engine.runBacktest();

        log.info("🔬 Backtest complete - Strategy: {}, P/L: {} ({}%), Trades: {}, Win Rate: {}%",
                strategy,
                String.format("%.2f", result.netProfitLoss()),
                String.format("%.2f", result.profitLossPercent()),
                result.totalTrades(),
                result.winRate());

        // Generate console and CSV reports
        reportGenerator.generateReport(result);

        return result;
    }

    /**
     * Creates custom BacktestProperties with frontend overrides.
     * Frontend parameters take precedence over application.yml configuration.
     *
     * <p><b>Frontend Override Logic:</b></p>
     * <ul>
     *   <li>If phaseFilteringEnabled is provided from frontend, it overrides config</li>
     *   <li>If allowedPhases is provided from frontend, it overrides config</li>
     *   <li>If phaseFilteringEnabled=true from frontend, phaseDetectionEnabled is auto-enabled</li>
     * </ul>
     *
     * @param phaseFilteringEnabled Frontend phase filtering setting (null = use config)
     * @param allowedPhasesStr Comma-separated phase names from frontend (null = use config)
     * @return Custom BacktestProperties instance with merged settings
     */
    private BacktestProperties createCustomProperties(Boolean phaseFilteringEnabled, String allowedPhasesStr) {
        // Start with config values
        boolean detectionEnabled = backtestProperties.phaseDetectionEnabled();
        boolean filteringEnabled = backtestProperties.phaseFilteringEnabled();
        List<String> phases = backtestProperties.allowedPhases();

        // Apply frontend overrides
        if (phaseFilteringEnabled != null) {
            filteringEnabled = phaseFilteringEnabled;
            // Auto-enable detection if filtering is enabled from frontend
            if (filteringEnabled) {
                detectionEnabled = true;
                log.info("🎯 Phase filtering enabled from frontend - auto-enabling phase detection");
            }
        }

        if (allowedPhasesStr != null && !allowedPhasesStr.trim().isEmpty()) {
            phases = Arrays.asList(allowedPhasesStr.split(","));
            log.info("🎯 Allowed phases overridden from frontend: {}", phases);
        }

        // Log final phase configuration
        if (phaseFilteringEnabled != null || allowedPhasesStr != null) {
            log.info("📊 Phase configuration: detection={}, filtering={}, allowedPhases={}",
                    detectionEnabled, filteringEnabled, phases);
        }

        // Create new BacktestProperties instance with overrides
        return new BacktestProperties(
                backtestProperties.defaultStrategy(),
                backtestProperties.defaultInitialCapital(),
                backtestProperties.fixedQuantity(),
                backtestProperties.positionSizePercent(),
                backtestProperties.stopLossPercent(),
                backtestProperties.takeProfitPercent(),
                backtestProperties.lotSize(),
                backtestProperties.indexSymbols(),
                detectionEnabled,
                filteringEnabled,
                phases,
                backtestProperties.strategies()
        );
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
