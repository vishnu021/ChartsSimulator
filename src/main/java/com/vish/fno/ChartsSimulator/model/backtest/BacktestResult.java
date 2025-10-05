package com.vish.fno.ChartsSimulator.model.backtest;

import java.util.List;

/**
 * Complete backtest performance results.
 *
 * @param strategyName Strategy used
 * @param symbol Symbol tested
 * @param period Time period (e.g., "2025-10-01 09:15-15:30")
 * @param initialCapital Starting capital
 * @param finalValue Ending portfolio value
 * @param netProfitLoss Total P/L
 * @param profitLossPercent P/L percentage
 * @param totalTrades Number of trades
 * @param winningTrades Profitable trades
 * @param losingTrades Loss-making trades
 * @param winRate Win percentage
 * @param profitFactor Total profit / Total loss
 * @param maxDrawdown Maximum peak-to-trough decline
 * @param maxDrawdownPercent Max drawdown as percentage
 * @param averageWin Average winning trade
 * @param averageLoss Average losing trade
 * @param largestWin Best trade
 * @param largestLoss Worst trade
 * @param sharpeRatio Risk-adjusted return
 * @param trades All executed trades
 * @param timeline Portfolio value over time
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public record BacktestResult(
    String strategyName,
    String symbol,
    String period,
    double initialCapital,
    double finalValue,
    double netProfitLoss,
    double profitLossPercent,
    int totalTrades,
    int winningTrades,
    int losingTrades,
    double winRate,
    double profitFactor,
    double maxDrawdown,
    double maxDrawdownPercent,
    double averageWin,
    double averageLoss,
    double largestWin,
    double largestLoss,
    double sharpeRatio,
    List<Trade> trades,
    List<PortfolioSnapshot> timeline
) {}
