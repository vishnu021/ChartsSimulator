package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Core backtesting engine that executes incremental strategy testing.
 *
 * <p>Processes ticker data point-by-point (tickers[0..i]) to simulate real-time
 * trading without future bias. Executes trades based on strategy signals and tracks
 * performance metrics including P/L, win rate, drawdown, and Sharpe ratio.</p>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BacktestEngine {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final double DEFAULT_INITIAL_CAPITAL = 100000.0;

    /**
     * Execute backtest on historical ticker data.
     *
     * @param strategy Trading strategy to test
     * @param tickers Historical tick data
     * @param initialCapital Starting capital
     * @return Complete backtest results
     */
    public BacktestResult runBacktest(Strategy strategy, List<Ticker> tickers, double initialCapital) {
        log.info("🚀 Starting backtest: strategy={}, tickers={}, capital={}",
                strategy.getStrategyName(), tickers.size(), initialCapital);

        // Initialize portfolio state
        double cashBalance = initialCapital;
        Position openPosition = null;
        List<Trade> completedTrades = new ArrayList<>();
        List<PortfolioSnapshot> timeline = new ArrayList<>();

        double maxPortfolioValue = initialCapital;
        double maxDrawdown = 0.0;

        // Detect all signals upfront (moving average already implements incremental logic)
        List<SignificantMove> signals = strategy.detectSignals(tickers, 0.5);
        log.info("📊 Detected {} signals", signals.size());

        // Process each signal
        for (int i = 0; i < signals.size(); i++) {
            SignificantMove signal = signals.get(i);

            // Find corresponding ticker
            Ticker currentTicker = findTickerByTime(tickers, signal.emissionTime());
            if (currentTicker == null) continue;

            double currentPrice = currentTicker.price();

            // Create market context
            MarketContext context = new MarketContext(
                currentPrice,
                openPosition != null,
                openPosition,
                calculatePortfolioValue(cashBalance, openPosition, currentPrice),
                i,
                List.of(currentTicker)
            );

            // Check exit conditions first (if position open)
            if (openPosition != null) {
                ExitReason exitReason = null;

                // Check stop loss
                if (currentPrice <= openPosition.stopLoss()) {
                    exitReason = ExitReason.STOP_LOSS;
                }
                // Check take profit
                else if (currentPrice >= openPosition.takeProfit()) {
                    exitReason = ExitReason.TAKE_PROFIT;
                }
                // Check strategy sell signal
                else if (strategy.shouldSell(signal, context)) {
                    exitReason = ExitReason.SIGNAL;
                }

                // Execute exit
                if (exitReason != null) {
                    Trade trade = executeExit(openPosition, currentTicker, exitReason, completedTrades.size() + 1);
                    completedTrades.add(trade);
                    cashBalance += (trade.exitPrice() * trade.quantity());
                    openPosition = null;

                    log.debug("📉 Exit: {} @ {} | P/L: {}", exitReason, trade.exitPrice(), trade.profitLoss());
                }
            }

            // Check entry conditions (if no position)
            if (openPosition == null && strategy.shouldBuy(signal, context)) {
                double portfolioValue = cashBalance;
                int quantity = strategy.calculatePositionSize(portfolioValue, currentPrice, 10.0);

                if (quantity > 0 && (quantity * currentPrice) <= cashBalance) {
                    openPosition = executeEntry(signal, currentTicker, quantity, strategy);
                    cashBalance -= (currentPrice * quantity);

                    log.debug("📈 Entry: {} shares @ {}", quantity, currentPrice);
                }
            }

            // Track portfolio snapshot every 100 signals
            if (i % 100 == 0) {
                double portfolioValue = calculatePortfolioValue(cashBalance, openPosition, currentPrice);
                double unrealizedPnL = openPosition != null
                    ? (currentPrice - openPosition.entryPrice()) * openPosition.quantity()
                    : 0.0;
                double realizedPnL = completedTrades.stream().mapToDouble(Trade::profitLoss).sum();

                timeline.add(new PortfolioSnapshot(
                    signal.emissionTime(),
                    cashBalance,
                    openPosition != null ? openPosition.quantity() * currentPrice : 0.0,
                    portfolioValue,
                    unrealizedPnL,
                    realizedPnL
                ));

                // Track max drawdown
                if (portfolioValue > maxPortfolioValue) {
                    maxPortfolioValue = portfolioValue;
                }
                double drawdown = maxPortfolioValue - portfolioValue;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }
        }

        // Close any remaining position at end
        if (openPosition != null) {
            Ticker lastTicker = tickers.get(tickers.size() - 1);
            Trade trade = executeExit(openPosition, lastTicker, ExitReason.END_OF_DAY, completedTrades.size() + 1);
            completedTrades.add(trade);
            cashBalance += (trade.exitPrice() * trade.quantity());
        }

        // Calculate final metrics
        return calculateResults(strategy, tickers, initialCapital, cashBalance, completedTrades, timeline, maxDrawdown);
    }

    private Ticker findTickerByTime(List<Ticker> tickers, String emissionTime) {
        return tickers.stream()
            .filter(t -> t.time().equals(emissionTime))
            .findFirst()
            .orElse(null);
    }

    private double calculatePortfolioValue(double cash, Position position, double currentPrice) {
        if (position == null) return cash;
        return cash + (position.quantity() * currentPrice);
    }

    private Position executeEntry(SignificantMove signal, Ticker ticker, int quantity, Strategy strategy) {
        double entryPrice = ticker.price();
        double stopLoss = entryPrice * (1 - strategy.getStopLossPercent() / 100.0);
        double takeProfit = entryPrice * (1 + strategy.getTakeProfitPercent() / 100.0);

        return new Position(
            ticker.symbol(),
            quantity,
            entryPrice,
            signal.emissionTime(),
            stopLoss,
            takeProfit
        );
    }

    private Trade executeExit(Position position, Ticker ticker, ExitReason reason, int tradeNumber) {
        double exitPrice = ticker.price();
        double profitLoss = (exitPrice - position.entryPrice()) * position.quantity();
        double profitLossPercent = ((exitPrice - position.entryPrice()) / position.entryPrice()) * 100.0;

        LocalDateTime entry = LocalDateTime.parse(position.entryTime(), FORMATTER);
        LocalDateTime exit = LocalDateTime.parse(ticker.time(), FORMATTER);
        Duration holding = Duration.between(entry, exit);

        return new Trade(
            tradeNumber,
            position.symbol(),
            TradeType.LONG,
            position.entryTime(),
            position.entryPrice(),
            position.quantity(),
            ticker.time(),
            exitPrice,
            profitLoss,
            profitLossPercent,
            holding,
            reason
        );
    }

    private BacktestResult calculateResults(
            Strategy strategy,
            List<Ticker> tickers,
            double initialCapital,
            double finalCash,
            List<Trade> trades,
            List<PortfolioSnapshot> timeline,
            double maxDrawdown) {

        double finalValue = finalCash;
        double netProfitLoss = finalValue - initialCapital;
        double profitLossPercent = (netProfitLoss / initialCapital) * 100.0;

        int totalTrades = trades.size();
        int winningTrades = (int) trades.stream().filter(t -> t.profitLoss() > 0).count();
        int losingTrades = totalTrades - winningTrades;
        double winRate = totalTrades > 0 ? (winningTrades * 100.0 / totalTrades) : 0.0;

        double totalProfit = trades.stream().filter(t -> t.profitLoss() > 0).mapToDouble(Trade::profitLoss).sum();
        double totalLoss = Math.abs(trades.stream().filter(t -> t.profitLoss() < 0).mapToDouble(Trade::profitLoss).sum());
        double profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0.0;

        double averageWin = winningTrades > 0
            ? trades.stream().filter(t -> t.profitLoss() > 0).mapToDouble(Trade::profitLoss).average().orElse(0.0)
            : 0.0;
        double averageLoss = losingTrades > 0
            ? trades.stream().filter(t -> t.profitLoss() < 0).mapToDouble(Trade::profitLoss).average().orElse(0.0)
            : 0.0;

        double largestWin = trades.stream().mapToDouble(Trade::profitLoss).max().orElse(0.0);
        double largestLoss = trades.stream().mapToDouble(Trade::profitLoss).min().orElse(0.0);

        double maxDrawdownPercent = (maxDrawdown / initialCapital) * 100.0;

        // Simple Sharpe ratio approximation
        double averageReturn = trades.stream().mapToDouble(Trade::profitLossPercent).average().orElse(0.0);
        double stdDevReturn = calculateStdDev(trades.stream().mapToDouble(Trade::profitLossPercent).toArray());
        double sharpeRatio = stdDevReturn > 0 ? averageReturn / stdDevReturn : 0.0;

        String period = tickers.isEmpty() ? ""
            : tickers.get(0).time() + " - " + tickers.get(tickers.size() - 1).time();

        String symbol = tickers.isEmpty() ? "" : tickers.get(0).symbol();

        log.info("✅ Backtest complete: P/L={} ({:.2f}%), Trades={}, Win Rate={:.1f}%",
                netProfitLoss, profitLossPercent, totalTrades, winRate);

        return new BacktestResult(
            strategy.getStrategyName(),
            symbol,
            period,
            initialCapital,
            finalValue,
            netProfitLoss,
            profitLossPercent,
            totalTrades,
            winningTrades,
            losingTrades,
            winRate,
            profitFactor,
            maxDrawdown,
            maxDrawdownPercent,
            averageWin,
            averageLoss,
            largestWin,
            largestLoss,
            sharpeRatio,
            trades,
            timeline,
            tickers
        );
    }

    private double calculateStdDev(double[] values) {
        if (values.length == 0) return 0.0;
        double mean = 0.0;
        for (double v : values) mean += v;
        mean /= values.length;

        double variance = 0.0;
        for (double v : values) {
            variance += Math.pow(v - mean, 2);
        }
        variance /= values.length;
        return Math.sqrt(variance);
    }
}
