package com.vish.fno.ChartsSimulator.model.backtest;

import com.vish.fno.ChartsSimulator.model.Ticker;

import java.util.List;

/**
 * Context information for making trading decisions.
 *
 * @param currentPrice Current market price
 * @param hasOpenPosition Whether a position is currently open
 * @param openPosition Details of open position (null if none)
 * @param portfolioValue Current total portfolio value
 * @param signalIndex Index of current signal in signal list
 * @param recentTickers Recent price history for context
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public record MarketContext(
    double currentPrice,
    boolean hasOpenPosition,
    Position openPosition,
    double portfolioValue,
    int signalIndex,
    List<Ticker> recentTickers
) {}
