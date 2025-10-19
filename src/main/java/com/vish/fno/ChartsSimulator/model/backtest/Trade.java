package com.vish.fno.ChartsSimulator.model.backtest;

import java.time.Duration;

/**
 * Record of a completed trade.
 *
 * @param tradeNumber Sequential trade identifier
 * @param symbol Trading symbol
 * @param type Trade type (LONG or SHORT)
 * @param entryTime Timestamp of entry
 * @param entryPrice Entry price (including slippage)
 * @param quantity Number of shares/contracts
 * @param exitTime Timestamp of exit
 * @param exitPrice Exit price (including slippage)
 * @param profitLoss Absolute P/L in currency
 * @param profitLossPercent P/L percentage
 * @param holdingPeriod Duration position was held
 * @param exitReason Why position was closed
 * @param phase Market phase at entry (based on Wyckoff cycle)
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public record Trade(
    int tradeNumber,
    String symbol,
    TradeType type,
    String entryTime,
    double entryPrice,
    int quantity,
    String exitTime,
    double exitPrice,
    double profitLoss,
    double profitLossPercent,
    Duration holdingPeriod,
    ExitReason exitReason,
    MarketPhase phase
) {}
