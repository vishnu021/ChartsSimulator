package com.vish.fno.ChartsSimulator.model.backtest;

/**
 * Represents an open trading position.
 *
 * @param symbol Trading symbol
 * @param quantity Number of shares/contracts
 * @param entryPrice Price at which position was opened
 * @param entryTime Timestamp of position entry
 * @param stopLoss Stop loss price level
 * @param takeProfit Take profit price level
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public record Position(
    String symbol,
    int quantity,
    double entryPrice,
    String entryTime,
    double stopLoss,
    double takeProfit
) {}
