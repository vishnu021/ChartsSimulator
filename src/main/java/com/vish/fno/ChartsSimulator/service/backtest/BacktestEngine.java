package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Simplified stateful backtesting engine with realistic Signal → ActiveOrder → Trade flow.
 *
 * <p><b>Design Philosophy:</b></p>
 * This engine simulates real-time trading using a simple, realistic flow:
 * <ol>
 *   <li><b>Check Exits:</b> If order exists, check stop loss → take profit → exit signal (priority order)</li>
 *   <li><b>Detect Signal:</b> Check for trading signals on EVERY tick (realistic simulation)</li>
 *   <li><b>Evaluate Signal:</b> If signal meets strategy criteria, convert to ActiveOrder</li>
 *   <li><b>Track Order:</b> Monitor until exit conditions met on any tick</li>
 *   <li><b>Close Order:</b> Mark order as inactive, add to trade history</li>
 * </ol>
 *
 * <p><b>Key Improvements:</b></p>
 * <ul>
 *   <li><b>No Signal Caching:</b> Only track current signal and current order (simpler, more realistic)</li>
 *   <li><b>Signal Lifecycle:</b> Signal cleared after converting to order (prevents re-entry on same signal)</li>
 *   <li><b>Optional Usage:</b> Both signal and order are Optional for easy null-safety checks</li>
 *   <li><b>Every Tick Processing:</b> Signal detection runs on every tick for accurate simulation</li>
 *   <li><b>Exit Priority:</b> Stop loss (highest) → Take profit → Exit signal (strategy-based)</li>
 *   <li><b>Realistic:</b> Matches actual trading flow: signal → order → trade</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.0.0
 * @version 2.0.0 - Simplified architecture with Signal → ActiveOrder flow
 */
@Slf4j
public class BacktestEngine {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final int SNAPSHOT_INTERVAL = 100; // Record portfolio every N ticks

    private final String symbol;
    private final String date;
    private final Strategy strategy;
    private final List<Ticker> tickers;
    private final double initialCapital;

    public BacktestEngine(String symbol, String date, Strategy strategy, List<Ticker> tickers, double initialCapital) {
        this.symbol = symbol;
        this.date = date;
        this.strategy = strategy;
        this.tickers = tickers;
        this.initialCapital = initialCapital;
        // Initialize
        this.cashBalance = initialCapital;
        this.maxPortfolioValue = initialCapital;
        this.strategy.reset(); // Clear strategy state before backtest
    }
// ==================== SIMULATION STATE ====================

    /** Current cash balance */
    private double cashBalance;

    /** Currently active order (empty if no position) */
    private Optional<ActiveOrder> activeOrder = Optional.empty();

    /** Latest detected signal (empty if no signal or already used) */
    private Optional<SignificantMove> currentSignal = Optional.empty();

    /** All completed orders (trade history) */
    private final List<ActiveOrder> completedOrders = new ArrayList<>();

    /** Growing list of historical tickers */
    private final List<Ticker> historicalTickers = new ArrayList<>();

    /** Portfolio value snapshots */
    private final List<PortfolioSnapshot> portfolioSnapshots = new ArrayList<>();

    /** Max portfolio value (for drawdown) */
    private double maxPortfolioValue;

    /** Max drawdown observed */
    private double maxDrawdown = 0.0;

    // ==================== PUBLIC API ====================

    /**
     * Execute tick-by-tick backtest with Signal → ActiveOrder flow.
     *
     * @return Backtest results with trades and metrics
     */
    public BacktestResult runBacktest() {
        if (tickers == null || tickers.isEmpty()) {
            throw new IllegalArgumentException("Ticker data cannot be null or empty");
        }

        log.info("🚀 Starting backtest: strategy={}, tickers={}, capital={}",
                strategy.getStrategyName(), tickers.size(), initialCapital);

        // Process each tick
        for (int i = 0; i < tickers.size(); i++) {
            Ticker tick = tickers.get(i);
            historicalTickers.add(tick);
            processTick(tick, i);
        }

        // Close any remaining order at market close
        if (activeOrder.isPresent()) {
            Ticker lastTick = tickers.get(tickers.size() - 1);
            closeActiveOrder(lastTick, ExitReason.END_OF_DAY);
            log.debug("[{}] 📉 Closed remaining order at EOD @ {}", lastTick.time(), lastTick.price());
        }

        // Build results
        BacktestResult result = buildResult(tickers);

        log.info("✅ Backtest complete: P/L={} ({}%), Trades={}, Win Rate={}%",
                result.netProfitLoss(), String.format("%.2f", result.profitLossPercent()),
                result.totalTrades(), String.format("%.1f", result.winRate()));

        return result;
    }

    // ==================== TICK PROCESSING ====================

    /**
     * Process a single tick: check exits first, then check for new signals, then entries.
     */
    private void processTick(Ticker tick, int tickIndex) {
        double currentPrice = tick.price();

        // 1. If we have an active order, check exit conditions (stop loss, take profit, exit signal)
        if (activeOrder.isPresent()) {
            if (checkExitConditions(tick, currentPrice)) {
                return; // Order was closed, stop processing
            }
        }

        // 2. Check for new signal on EVERY tick
        checkForSignal();

        // 3. If no order and we have a signal, check if we should enter
        if (activeOrder.isEmpty() && currentSignal.isPresent()) {
            tryEnterPosition(tick, currentPrice, tickIndex);
        }

        // 4. Record portfolio snapshot periodically
        if (tickIndex % SNAPSHOT_INTERVAL == 0) {
            recordPortfolioSnapshot(tick, currentPrice);
        }
    }

    /**
     * Check for new trading signals on every tick.
     */
    private void checkForSignal() {
        List<SignificantMove> signals = strategy.detectSignals(historicalTickers, 0.5);

        if (!signals.isEmpty()) {
            // Take the most recent signal
            currentSignal = Optional.of(signals.get(signals.size() - 1));
            log.trace("[{}] 📊 New signal detected: type={}, price={}",
                     currentSignal.get().emissionTime(),
                     currentSignal.get().type(),
                     currentSignal.get().price());
        }
    }

    /**
     * Check exit conditions: stop loss, take profit, strategy exit signal.
     * Returns true if order was closed.
     */
    private boolean checkExitConditions(Ticker tick, double currentPrice) {
        ActiveOrder order = activeOrder.get();

        // 1. Stop loss (highest priority)
        if (currentPrice <= order.stopLoss()) {
            double entryPrice = order.entryPrice();
            closeActiveOrder(tick, ExitReason.STOP_LOSS);
            log.debug("[{}] 🛑 Stop loss hit @ {} (entry: {})", tick.time(), currentPrice, entryPrice);
            return true;
        }

        // 2. Take profit
        if (currentPrice >= order.takeProfit()) {
            double entryPrice = order.entryPrice();
            closeActiveOrder(tick, ExitReason.TAKE_PROFIT);
            log.debug("[{}] 🎯 Take profit hit @ {} (entry: {})", tick.time(), currentPrice, entryPrice);
            return true;
        }

        // 3. Strategy exit signal
        if (currentSignal.isPresent()) {
            MarketContext context = createMarketContext(currentPrice);
            if (strategy.shouldSell(currentSignal.get(), context)) {
                closeActiveOrder(tick, ExitReason.SIGNAL);
                currentSignal = Optional.empty(); // Clear signal after use
                log.debug("[{}] 📉 Strategy exit signal @ {}", tick.time(), currentPrice);
                return true;
            }
        }

        return false;
    }

    /**
     * Try to enter a position if signal meets strategy criteria.
     */
    private void tryEnterPosition(Ticker tick, double currentPrice, int tickIndex) {
        MarketContext context = createMarketContext(currentPrice);

        // Check if strategy wants to enter on this signal
        if (!strategy.shouldBuy(currentSignal.get(), context)) {
            return;
        }

        // Calculate position size
        double portfolioValue = cashBalance;
        int quantity = strategy.calculatePositionSize(portfolioValue, currentPrice, 10.0);

        if (quantity <= 0) {
            log.debug("[{}] ⚠️ Skipping entry - quantity is 0", tick.time());
            return;
        }

        double positionCost = quantity * currentPrice;
        if (positionCost > cashBalance) {
            log.debug("[{}] ⚠️ Skipping entry - insufficient capital (need: {}, have: {})",
                     tick.time(), positionCost, cashBalance);
            return;
        }

        // Calculate stop/target
        double stopLoss = currentPrice * (1 - strategy.getStopLossPercent() / 100.0);
        double takeProfit = currentPrice * (1 + strategy.getTakeProfitPercent() / 100.0);

        // Create active order from signal
        ActiveOrder order = ActiveOrder.openOrder(
                currentSignal.get(),  // Store the signal that triggered this order
                completedOrders.size() + 1,
                tick.symbol(),
                quantity,
                currentPrice,
                tick.time(),
                stopLoss,
                takeProfit
        );

        // Update state
        activeOrder = Optional.of(order);
        cashBalance -= positionCost;
        currentSignal = Optional.empty(); // Clear signal after use

        log.debug("[{}] ✅ Order opened: {} shares @ {} | Stop: {} | Target: {}",
                 tick.time(), quantity, currentPrice, stopLoss, takeProfit);
    }

    /**
     * Close the active order and add to trade history.
     */
    private void closeActiveOrder(Ticker tick, ExitReason reason) {
        if (activeOrder.isEmpty()) {
            log.warn("⚠️ Attempted to close order but none is active");
            return;
        }

        ActiveOrder order = activeOrder.get();
        double exitPrice = tick.price();

        // Calculate holding duration
        LocalDateTime entry = LocalDateTime.parse(order.entryTime(), FORMATTER);
        LocalDateTime exit = LocalDateTime.parse(tick.time(), FORMATTER);
        Duration holding = Duration.between(entry, exit);

        // Close the order (creates new inactive order with exit details)
        ActiveOrder closedOrder = order.closeOrder(exitPrice, tick.time(), reason, holding);

        // Update state
        completedOrders.add(closedOrder);
        cashBalance += (exitPrice * order.quantity());
        activeOrder = Optional.empty();

        log.debug("[{}] ✅ Order closed: {} | P/L: {} ({}%) | Reason: {}",
                 tick.time(),
                 closedOrder.orderNumber(),
                 closedOrder.profitLoss().orElse(0.0),
                 String.format("%.2f", closedOrder.profitLossPercent().orElse(0.0)),
                 reason);
    }

    /**
     * Create market context for strategy evaluation.
     */
    private MarketContext createMarketContext(double currentPrice) {
        double portfolioValue = calculatePortfolioValue(currentPrice);

        return new MarketContext(
                currentPrice,
                activeOrder.isPresent(),
                activeOrder.map(o -> new Position(
                        o.symbol(),
                        o.quantity(),
                        o.entryPrice(),
                        o.entryTime(),
                        o.stopLoss(),
                        o.takeProfit()
                )).orElse(null),
                portfolioValue,
                historicalTickers.size() - 1,
                new ArrayList<>(historicalTickers)
        );
    }

    /**
     * Calculate current portfolio value.
     */
    private double calculatePortfolioValue(double currentPrice) {
        double marketValue = activeOrder
                .map(order -> order.quantity() * currentPrice)
                .orElse(0.0);
        return cashBalance + marketValue;
    }

    /**
     * Record portfolio snapshot.
     */
    private void recordPortfolioSnapshot(Ticker tick, double currentPrice) {
        double portfolioValue = calculatePortfolioValue(currentPrice);

        double unrealizedPnL = activeOrder
                .map(order -> (currentPrice - order.entryPrice()) * order.quantity())
                .orElse(0.0);

        double realizedPnL = completedOrders.stream()
                .mapToDouble(order -> order.profitLoss().orElse(0.0))
                .sum();

        portfolioSnapshots.add(new PortfolioSnapshot(
                tick.time(),
                cashBalance,
                activeOrder.map(order -> order.quantity() * currentPrice).orElse(0.0),
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

    // ==================== RESULTS CALCULATION ====================

    /**
     * Build final backtest results.
     */
    private BacktestResult buildResult(List<Ticker> originalTickers) {
        double finalValue = cashBalance;
        double netProfitLoss = finalValue - initialCapital;
        double profitLossPercent = (netProfitLoss / initialCapital) * 100.0;

        // Convert completed orders to trades
        List<Trade> trades = completedOrders.stream()
                .map(ActiveOrder::toTrade)
                .toList();

        int totalTrades = trades.size();
        int winningTrades = (int) trades.stream().filter(t -> t.profitLoss() > 0).count();
        int losingTrades = totalTrades - winningTrades;
        double winRate = totalTrades > 0 ? (winningTrades * 100.0 / totalTrades) : 0.0;

        double totalProfit = trades.stream()
                .filter(t -> t.profitLoss() > 0)
                .mapToDouble(Trade::profitLoss)
                .sum();

        double totalLoss = Math.abs(trades.stream()
                .filter(t -> t.profitLoss() < 0)
                .mapToDouble(Trade::profitLoss)
                .sum());

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

        // Calculate Sharpe ratio
        double averageReturn = trades.stream().mapToDouble(Trade::profitLossPercent).average().orElse(0.0);
        double stdDevReturn = calculateStdDev(trades.stream().mapToDouble(Trade::profitLossPercent).toArray());
        double sharpeRatio = stdDevReturn > 0 ? averageReturn / stdDevReturn : 0.0;

        String period = originalTickers.isEmpty() ? ""
                : originalTickers.get(0).time() + " - " + originalTickers.get(originalTickers.size() - 1).time();

        String symbol = originalTickers.isEmpty() ? "" : originalTickers.get(0).symbol();

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
                portfolioSnapshots,
                originalTickers
        );
    }

    /**
     * Calculate standard deviation.
     */
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
