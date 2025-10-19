package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.*;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * Pure utility class for calculating backtest metrics and statistics.
 *
 * <p><b>Responsibilities:</b></p>
 * <ul>
 *   <li>Calculate win rate, profit factor, Sharpe ratio</li>
 *   <li>Compute average wins/losses, largest wins/losses</li>
 *   <li>Calculate standard deviation</li>
 *   <li>Build final BacktestResult object</li>
 * </ul>
 *
 * <p><b>Design Pattern:</b> Pure functions (stateless, no side effects)</p>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 */
@Slf4j
public class MetricsCalculator {

    /**
     * Builds complete backtest results with all calculated metrics.
     *
     * @param strategyName Name of the strategy used
     * @param symbol Trading symbol
     * @param tickers Original ticker data
     * @param completedOrders List of completed orders
     * @param portfolioSnapshots List of portfolio snapshots
     * @param initialCapital Starting capital
     * @param finalValue Final portfolio value
     * @param maxDrawdown Maximum drawdown observed
     * @param phaseDetectionEnabled Whether phase detection was enabled
     * @return Complete BacktestResult
     */
    public static BacktestResult buildResult(
            String strategyName,
            String symbol,
            List<Ticker> tickers,
            List<ActiveOrder> completedOrders,
            List<PortfolioSnapshot> portfolioSnapshots,
            double initialCapital,
            double finalValue,
            double maxDrawdown,
            boolean phaseDetectionEnabled
    ) {
        // Calculate basic P&L
        double netProfitLoss = finalValue - initialCapital;
        double profitLossPercent = (netProfitLoss / initialCapital) * 100.0;

        // Convert orders to trades
        List<Trade> trades = completedOrders.stream()
                .map(ActiveOrder::toTrade)
                .toList();

        // Calculate trade statistics
        TradeStatistics stats = calculateTradeStatistics(trades);

        // Calculate Sharpe ratio
        double sharpeRatio = calculateSharpeRatio(trades);

        // Calculate max drawdown percentage
        double maxDrawdownPercent = (maxDrawdown / initialCapital) * 100.0;

        // Determine time period
        String period = tickers.isEmpty() ? ""
                : tickers.get(0).time() + " - " + tickers.get(tickers.size() - 1).time();

        return new BacktestResult(
                strategyName,
                symbol,
                period,
                initialCapital,
                finalValue,
                netProfitLoss,
                profitLossPercent,
                stats.totalTrades(),
                stats.winningTrades(),
                stats.losingTrades(),
                stats.winRate(),
                stats.profitFactor(),
                maxDrawdown,
                maxDrawdownPercent,
                stats.averageWin(),
                stats.averageLoss(),
                stats.largestWin(),
                stats.largestLoss(),
                sharpeRatio,
                phaseDetectionEnabled,
                trades,
                portfolioSnapshots,
                tickers
        );
    }

    /**
     * Calculates comprehensive trade statistics.
     *
     * @param trades List of trades
     * @return TradeStatistics record
     */
    public static TradeStatistics calculateTradeStatistics(List<Trade> trades) {
        int totalTrades = trades.size();

        if (totalTrades == 0) {
            return new TradeStatistics(
                0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
            );
        }

        // Winning and losing trades
        int winningTrades = (int) trades.stream()
                .filter(t -> t.profitLoss() > 0)
                .count();
        int losingTrades = totalTrades - winningTrades;

        // Win rate
        double winRate = (winningTrades * 100.0) / totalTrades;

        // Total profit and loss
        double totalProfit = trades.stream()
                .filter(t -> t.profitLoss() > 0)
                .mapToDouble(Trade::profitLoss)
                .sum();

        double totalLoss = Math.abs(trades.stream()
                .filter(t -> t.profitLoss() < 0)
                .mapToDouble(Trade::profitLoss)
                .sum());

        // Profit factor
        double profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0.0;

        // Average win/loss
        double averageWin = winningTrades > 0
                ? trades.stream()
                        .filter(t -> t.profitLoss() > 0)
                        .mapToDouble(Trade::profitLoss)
                        .average()
                        .orElse(0.0)
                : 0.0;

        double averageLoss = losingTrades > 0
                ? trades.stream()
                        .filter(t -> t.profitLoss() < 0)
                        .mapToDouble(Trade::profitLoss)
                        .average()
                        .orElse(0.0)
                : 0.0;

        // Largest win/loss
        double largestWin = trades.stream()
                .mapToDouble(Trade::profitLoss)
                .max()
                .orElse(0.0);

        double largestLoss = trades.stream()
                .mapToDouble(Trade::profitLoss)
                .min()
                .orElse(0.0);

        return new TradeStatistics(
                totalTrades,
                winningTrades,
                losingTrades,
                winRate,
                profitFactor,
                averageWin,
                averageLoss,
                largestWin,
                largestLoss
        );
    }

    /**
     * Calculates Sharpe ratio (risk-adjusted return).
     *
     * <p>Sharpe Ratio = Average Return / Standard Deviation of Returns</p>
     *
     * @param trades List of trades
     * @return Sharpe ratio
     */
    public static double calculateSharpeRatio(List<Trade> trades) {
        if (trades.isEmpty()) {
            return 0.0;
        }

        double[] returns = trades.stream()
                .mapToDouble(Trade::profitLossPercent)
                .toArray();

        double averageReturn = calculateMean(returns);
        double stdDevReturn = calculateStdDev(returns);

        return stdDevReturn > 0 ? averageReturn / stdDevReturn : 0.0;
    }

    /**
     * Calculates standard deviation of an array of values.
     *
     * @param values Array of values
     * @return Standard deviation
     */
    public static double calculateStdDev(double[] values) {
        if (values.length == 0) {
            return 0.0;
        }

        double mean = calculateMean(values);

        double variance = 0.0;
        for (double v : values) {
            variance += Math.pow(v - mean, 2);
        }
        variance /= values.length;

        return Math.sqrt(variance);
    }

    /**
     * Calculates mean (average) of an array of values.
     *
     * @param values Array of values
     * @return Mean value
     */
    public static double calculateMean(double[] values) {
        if (values.length == 0) {
            return 0.0;
        }

        double sum = 0.0;
        for (double v : values) {
            sum += v;
        }
        return sum / values.length;
    }

    /**
     * Record holding trade statistics.
     *
     * @param totalTrades Total number of trades
     * @param winningTrades Number of winning trades
     * @param losingTrades Number of losing trades
     * @param winRate Win rate percentage
     * @param profitFactor Profit factor (gross profit / gross loss)
     * @param averageWin Average winning trade P&L
     * @param averageLoss Average losing trade P&L
     * @param largestWin Largest winning trade
     * @param largestLoss Largest losing trade
     */
    public record TradeStatistics(
        int totalTrades,
        int winningTrades,
        int losingTrades,
        double winRate,
        double profitFactor,
        double averageWin,
        double averageLoss,
        double largestWin,
        double largestLoss
    ) {}
}
