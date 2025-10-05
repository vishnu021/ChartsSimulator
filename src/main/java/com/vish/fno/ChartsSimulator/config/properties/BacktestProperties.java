package com.vish.fno.ChartsSimulator.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for backtesting framework.
 *
 * <p>Contains all configurable parameters for running backtests including
 * position sizing, risk management, default capital, and strategy selection.</p>
 *
 * @param strategyName Name of the strategy to use (default: "moving-average")
 * @param fixedQuantity Fixed quantity per trade (0 = use percentage-based sizing)
 * @param positionSizePercent Percentage of capital to risk per trade (default: 15%)
 * @param stopLossPercent Stop loss percentage (default: 2%)
 * @param takeProfitPercent Take profit percentage (default: 5%)
 * @param defaultInitialCapital Default starting capital for backtests (default: 100000)
 * @param lotSize Lot size for quantity calculation - quantity will be rounded to multiple of this (default: 15)
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@ConfigurationProperties("app.backtest")
public record BacktestProperties(
    String strategyName,
    int fixedQuantity,
    double positionSizePercent,
    double stopLossPercent,
    double takeProfitPercent,
    double defaultInitialCapital,
    int lotSize
) {
    /**
     * Creates BacktestProperties with default values if not configured.
     */
    public BacktestProperties {
        if (strategyName == null || strategyName.isEmpty()) strategyName = "moving-average";
        if (positionSizePercent == 0) positionSizePercent = 15.0;
        if (stopLossPercent == 0) stopLossPercent = 2.0;
        if (takeProfitPercent == 0) takeProfitPercent = 5.0;
        if (defaultInitialCapital == 0) defaultInitialCapital = 100000.0;
        if (lotSize == 0) lotSize = 15;
    }
}
