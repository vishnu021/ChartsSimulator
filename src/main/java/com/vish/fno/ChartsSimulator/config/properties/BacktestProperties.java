package com.vish.fno.ChartsSimulator.config.properties;

import com.vish.fno.ChartsSimulator.model.backtest.MarketPhase;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

/**
 * Configuration properties for backtesting framework.
 *
 * <p>Contains all configurable parameters for running backtests including
 * position sizing, risk management, default capital, and strategy selection.
 * Supports strategy-specific configuration overrides.</p>
 *
 * @param defaultStrategy Default strategy name to use (e.g., "MovingAverageStrategy")
 * @param defaultInitialCapital Default starting capital for backtests
 * @param fixedQuantity Fixed quantity per trade (0 = use percentage-based sizing)
 * @param positionSizePercent Percentage of capital to risk per trade (default: 15%)
 * @param stopLossPercent Stop loss percentage (default: 2%)
 * @param takeProfitPercent Take profit percentage (default: 5%)
 * @param lotSize Lot size for quantity calculation - quantity will be rounded to multiple of this (default: 15)
 * @param indexSymbols List of index symbols (Nifty, Bank Nifty, etc.) that trade with quantity=1
 * @param phaseDetectionEnabled Enable phase detection and reporting in trades (default: false)
 * @param phaseFilteringEnabled Enable phase-based trade filtering (requires phaseDetectionEnabled=true, default: false)
 * @param allowedPhases List of market phases to allow trading in when filtering is enabled (empty = all phases allowed)
 * @param strategies Map of strategy-specific configuration overrides
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@ConfigurationProperties("app.backtest")
public record BacktestProperties(
    String defaultStrategy,
    double defaultInitialCapital,
    int fixedQuantity,
    double positionSizePercent,
    double stopLossPercent,
    double takeProfitPercent,
    int lotSize,
    List<String> indexSymbols,
    boolean phaseDetectionEnabled,
    boolean phaseFilteringEnabled,
    List<String> allowedPhases,
    Map<String, StrategyConfig> strategies
) {
    /**
     * Creates BacktestProperties with default values if not configured.
     */
    public BacktestProperties {
        if (defaultStrategy == null || defaultStrategy.isEmpty()) defaultStrategy = "LowWickMomentumStrategy";
        if (defaultInitialCapital == 0) defaultInitialCapital = 100000.0;
        if (positionSizePercent == 0) positionSizePercent = 15.0;
        if (stopLossPercent == 0) stopLossPercent = 2.0;
        if (takeProfitPercent == 0) takeProfitPercent = 5.0;
        if (lotSize == 0) lotSize = 15;
        if (indexSymbols == null) indexSymbols = List.of();
        if (allowedPhases == null) allowedPhases = List.of();
        if (strategies == null) strategies = Map.of();
    }

    /**
     * Checks if a market phase is allowed for trading based on configuration.
     *
     * <p><b>Filtering Logic:</b></p>
     * <ul>
     *   <li>If phase filtering is disabled, all phases are allowed (returns true)</li>
     *   <li>If no allowed phases configured, all phases are allowed (returns true)</li>
     *   <li>If filtering is enabled, only phases in allowedPhases list are allowed</li>
     * </ul>
     *
     * @param phase Phase to check
     * @return true if phase is allowed for trading
     */
    public boolean isPhaseAllowed(MarketPhase phase) {
        // If phase filtering is disabled, allow all phases (even if detection is enabled for reporting)
        if (!phaseFilteringEnabled) {
            return true;
        }

        // If no phases configured, allow all
        if (allowedPhases == null || allowedPhases.isEmpty()) {
            return true;
        }

        // Check if current phase is in allowed list (case-insensitive)
        return allowedPhases.stream()
            .anyMatch(allowed -> allowed.equalsIgnoreCase(phase.name()));
    }

    /**
     * Validates that filtering configuration is consistent.
     * Logs a warning if phase filtering is enabled but detection is disabled.
     *
     * @return true if configuration is valid
     */
    public boolean isPhaseConfigValid() {
        // If filtering is enabled, detection must also be enabled
        if (phaseFilteringEnabled && !phaseDetectionEnabled) {
            return false; // Invalid: cannot filter without detection
        }
        return true;
    }

    /**
     * Checks if a symbol is an index instrument (case-insensitive).
     *
     * @param symbol Symbol to check
     * @return true if symbol is in indexSymbols list
     */
    public boolean isIndexSymbol(String symbol) {
        if (symbol == null || indexSymbols.isEmpty()) {
            return false;
        }
        return indexSymbols.stream()
            .anyMatch(index -> index.equalsIgnoreCase(symbol));
    }

    /**
     * Strategy-specific configuration parameters.
     *
     * @param enabled Whether this strategy is enabled
     * @param stopLossPercent Stop loss percentage override
     * @param takeProfitPercent Take profit percentage override
     */
    public record StrategyConfig(
        boolean enabled,
        Double stopLossPercent,
        Double takeProfitPercent
    ) {}
}
