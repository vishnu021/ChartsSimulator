package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.ActiveOrder;
import com.vish.fno.ChartsSimulator.model.backtest.PortfolioSnapshot;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Manages portfolio state including cash, positions, snapshots, and drawdown tracking.
 *
 * <p><b>Responsibilities:</b></p>
 * <ul>
 *   <li>Track cash balance and position values</li>
 *   <li>Calculate portfolio value (cash + positions)</li>
 *   <li>Record portfolio snapshots for analysis</li>
 *   <li>Track maximum drawdown</li>
 *   <li>Calculate unrealized and realized P&L</li>
 * </ul>
 *
 * <p><b>Design Pattern:</b> State management class (encapsulates portfolio state)</p>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 */
@Slf4j
@Getter
public class PortfolioManager {

    private static final int DEFAULT_SNAPSHOT_INTERVAL = 100; // Record every N ticks

    private final double initialCapital;
    private final int snapshotInterval;

    // Portfolio state
    private double cashBalance;
    private double maxPortfolioValue;
    private double maxDrawdown = 0.0;
    private final List<PortfolioSnapshot> portfolioSnapshots = new ArrayList<>();
    private final List<ActiveOrder> completedOrders = new ArrayList<>();

    /**
     * Creates a new portfolio manager with specified initial capital.
     *
     * @param initialCapital Starting capital
     */
    public PortfolioManager(double initialCapital) {
        this(initialCapital, DEFAULT_SNAPSHOT_INTERVAL);
    }

    /**
     * Creates a new portfolio manager with custom snapshot interval.
     *
     * @param initialCapital Starting capital
     * @param snapshotInterval Interval for recording snapshots (in ticks)
     */
    public PortfolioManager(double initialCapital, int snapshotInterval) {
        this.initialCapital = initialCapital;
        this.snapshotInterval = snapshotInterval;
        this.cashBalance = initialCapital;
        this.maxPortfolioValue = initialCapital;
    }

    /**
     * Deducts cash for a new position entry.
     *
     * @param amount Amount to deduct
     * @throws IllegalArgumentException if insufficient funds
     */
    public void deductCash(double amount) {
        if (amount > cashBalance) {
            throw new IllegalArgumentException(
                String.format("Insufficient cash: need %.2f, have %.2f", amount, cashBalance)
            );
        }
        cashBalance -= amount;
        log.trace("Cash deducted: {}, new balance: {}", amount, cashBalance);
    }

    /**
     * Adds cash from a position exit.
     *
     * @param amount Amount to add
     */
    public void addCash(double amount) {
        cashBalance += amount;
        log.trace("Cash added: {}, new balance: {}", amount, cashBalance);
    }

    /**
     * Adds a completed order to trade history.
     *
     * @param order Completed order
     */
    public void addCompletedOrder(ActiveOrder order) {
        completedOrders.add(order);
        log.trace("Order #{} added to history. Total orders: {}",
                 order.orderNumber(), completedOrders.size());
    }

    /**
     * Calculates current portfolio value (cash + position value).
     *
     * @param currentPrice Current market price
     * @param activeOrder Current active order (if any)
     * @return Total portfolio value
     */
    public double calculatePortfolioValue(double currentPrice, Optional<ActiveOrder> activeOrder) {
        double positionValue = activeOrder
                .map(order -> order.quantity() * currentPrice)
                .orElse(0.0);
        return cashBalance + positionValue;
    }

    /**
     * Calculates unrealized P&L for current position.
     *
     * @param currentPrice Current market price
     * @param activeOrder Current active order (if any)
     * @return Unrealized profit/loss
     */
    public double calculateUnrealizedPnL(double currentPrice, Optional<ActiveOrder> activeOrder) {
        return activeOrder
                .map(order -> (currentPrice - order.entryPrice()) * order.quantity())
                .orElse(0.0);
    }

    /**
     * Calculates total realized P&L from all completed orders.
     *
     * @return Realized profit/loss
     */
    public double calculateRealizedPnL() {
        return completedOrders.stream()
                .mapToDouble(order -> order.profitLoss().orElse(0.0))
                .sum();
    }

    /**
     * Records a portfolio snapshot if interval condition is met.
     *
     * @param tick Current tick
     * @param tickIndex Current tick index
     * @param currentPrice Current price
     * @param activeOrder Current active order (if any)
     * @return true if snapshot was recorded
     */
    public boolean recordSnapshotIfNeeded(
            Ticker tick,
            int tickIndex,
            double currentPrice,
            Optional<ActiveOrder> activeOrder
    ) {
        if (tickIndex % snapshotInterval != 0) {
            return false;
        }

        recordSnapshot(tick, currentPrice, activeOrder);
        return true;
    }

    /**
     * Records a portfolio snapshot.
     *
     * @param tick Current tick
     * @param currentPrice Current price
     * @param activeOrder Current active order (if any)
     */
    public void recordSnapshot(Ticker tick, double currentPrice, Optional<ActiveOrder> activeOrder) {
        double portfolioValue = calculatePortfolioValue(currentPrice, activeOrder);
        double unrealizedPnL = calculateUnrealizedPnL(currentPrice, activeOrder);
        double realizedPnL = calculateRealizedPnL();

        double positionValue = activeOrder
                .map(order -> order.quantity() * currentPrice)
                .orElse(0.0);

        portfolioSnapshots.add(new PortfolioSnapshot(
                tick.time(),
                cashBalance,
                positionValue,
                portfolioValue,
                unrealizedPnL,
                realizedPnL
        ));

        // Update max drawdown
        updateDrawdown(portfolioValue);

        log.trace("Snapshot recorded: portfolio={}, unrealized={}, realized={}",
                 portfolioValue, unrealizedPnL, realizedPnL);
    }

    /**
     * Updates maximum portfolio value and drawdown tracking.
     *
     * @param currentPortfolioValue Current portfolio value
     */
    private void updateDrawdown(double currentPortfolioValue) {
        if (currentPortfolioValue > maxPortfolioValue) {
            maxPortfolioValue = currentPortfolioValue;
        }

        double currentDrawdown = maxPortfolioValue - currentPortfolioValue;
        if (currentDrawdown > maxDrawdown) {
            maxDrawdown = currentDrawdown;
            log.debug("New max drawdown: {} ({}%)",
                    String.format("%.2f", maxDrawdown),
                     String.format("%.2f", (maxDrawdown / maxPortfolioValue) * 100));
        }
    }

    /**
     * Calculates maximum drawdown as a percentage of initial capital.
     *
     * @return Max drawdown percentage
     */
    public double getMaxDrawdownPercent() {
        return (maxDrawdown / initialCapital) * 100.0;
    }

    /**
     * Gets the final portfolio value (cash balance after all trades closed).
     *
     * @return Final cash balance
     */
    public double getFinalValue() {
        return cashBalance;
    }

    /**
     * Gets net profit/loss.
     *
     * @return Total P&L (final value - initial capital)
     */
    public double getNetProfitLoss() {
        return cashBalance - initialCapital;
    }

    /**
     * Gets net profit/loss as percentage.
     *
     * @return P&L percentage
     */
    public double getProfitLossPercent() {
        return (getNetProfitLoss() / initialCapital) * 100.0;
    }

    /**
     * Resets the portfolio to initial state (for testing).
     */
    public void reset() {
        cashBalance = initialCapital;
        maxPortfolioValue = initialCapital;
        maxDrawdown = 0.0;
        portfolioSnapshots.clear();
        completedOrders.clear();
        log.debug("Portfolio reset to initial capital: {}", initialCapital);
    }
}
