package com.vish.fno.ChartsSimulator.model.backtest;

/**
 * Snapshot of portfolio value at a point in time.
 *
 * @param timestamp Time of snapshot
 * @param cashBalance Available cash
 * @param positionValue Value of open positions
 * @param totalValue Cash + position value
 * @param unrealizedPnL P/L on open positions
 * @param realizedPnL P/L from closed trades
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public record PortfolioSnapshot(
    String timestamp,
    double cashBalance,
    double positionValue,
    double totalValue,
    double unrealizedPnL,
    double realizedPnL
) {}
