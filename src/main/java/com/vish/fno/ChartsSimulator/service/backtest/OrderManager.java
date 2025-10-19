package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.model.backtest.*;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

/**
 * Manages order lifecycle including entry, exit conditions, and position validation.
 *
 * <p><b>Responsibilities:</b></p>
 * <ul>
 *   <li>Validate entry conditions (capital, position size)</li>
 *   <li>Calculate stop loss and take profit levels</li>
 *   <li>Check exit conditions (stop loss, take profit, strategy signals)</li>
 *   <li>Create and close orders with proper state management</li>
 * </ul>
 *
 * <p><b>Design Pattern:</b> Service/Helper class (stateless operations)</p>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 */
@Slf4j
public class OrderManager {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    /**
     * Result of attempting to enter a position.
     *
     * @param success Whether entry was successful
     * @param order The created order (empty if unsuccessful)
     * @param cashDeducted Amount deducted from cash balance
     * @param reason Reason for failure (empty if successful)
     */
    public record EntryResult(
        boolean success,
        Optional<ActiveOrder> order,
        double cashDeducted,
        Optional<String> reason
    ) {
        public static EntryResult success(ActiveOrder order, double cashDeducted) {
            return new EntryResult(true, Optional.of(order), cashDeducted, Optional.empty());
        }

        public static EntryResult failure(String reason) {
            return new EntryResult(false, Optional.empty(), 0.0, Optional.of(reason));
        }
    }

    /**
     * Result of checking exit conditions.
     *
     * @param shouldExit Whether position should be exited
     * @param reason Exit reason (empty if no exit)
     */
    public record ExitCheckResult(
        boolean shouldExit,
        Optional<ExitReason> reason
    ) {
        public static ExitCheckResult exit(ExitReason reason) {
            return new ExitCheckResult(true, Optional.of(reason));
        }

        public static ExitCheckResult noExit() {
            return new ExitCheckResult(false, Optional.empty());
        }
    }

    /**
     * Result of closing an order.
     *
     * @param closedOrder The closed order with exit details
     * @param cashReturned Amount returned to cash balance
     */
    public record CloseResult(
        ActiveOrder closedOrder,
        double cashReturned
    ) {}

    /**
     * Attempts to enter a position based on signal and strategy criteria.
     *
     * @param signal Current trading signal
     * @param tick Current tick data
     * @param strategy Trading strategy
     * @param context Market context
     * @param cashBalance Available cash
     * @param completedOrdersCount Number of completed orders (for order numbering)
     * @param phase Current market phase
     * @return EntryResult with order details or failure reason
     */
    public EntryResult tryEnterPosition(
            Signal signal,
            Ticker tick,
            Strategy strategy,
            MarketContext context,
            double cashBalance,
            int completedOrdersCount,
            MarketPhase phase
    ) {
        double currentPrice = tick.price();

        // Check if already in position (engine-level validation)
        if (context.hasOpenPosition()) {
            return EntryResult.failure("Position already open");
        }

        // Calculate position size (pass symbol for index instrument detection)
        int quantity = strategy.calculatePositionSize(tick.symbol(), cashBalance, currentPrice, 10.0);

        if (quantity <= 0) {
            log.debug("[{}] ⚠️ Skipping entry - quantity is 0", tick.time());
            return EntryResult.failure("Zero quantity calculated");
        }

        // Validate sufficient capital
        double positionCost = quantity * currentPrice;
        if (positionCost > cashBalance) {
            log.debug("[{}] ⚠️ Skipping entry - insufficient capital (need: {}, have: {})",
                     tick.time(), positionCost, cashBalance);
            return EntryResult.failure("Insufficient capital");
        }

        // Calculate stop/target levels
        double stopLoss = calculateStopLoss(currentPrice, strategy.getStopLossPercent());
        double takeProfit = calculateTakeProfit(currentPrice, strategy.getTakeProfitPercent());

        // Create order
        ActiveOrder order = ActiveOrder.openOrder(
                signal,
                completedOrdersCount + 1,
                tick.symbol(),
                quantity,
                currentPrice,
                tick.time(),
                stopLoss,
                takeProfit,
                phase
        );

        log.debug("[{}] ✅ Order opened: {} shares @ {} | Stop: {} | Target: {} | Phase: {}",
                 tick.time(), quantity, currentPrice, String.format("%.2f", stopLoss), String.format("%.2f", takeProfit), phase);

        return EntryResult.success(order, positionCost);
    }

    /**
     * Checks if any exit conditions are met for the current position.
     *
     * <p><b>Exit Priority:</b> Stop Loss → Take Profit</p>
     *
     * <p><b>Note:</b> Strategy exit signals removed - exits handled purely by stop/target levels.
     * If strategy wants different exit logic, it should adjust stop/target dynamically.</p>
     *
     * @param order Current active order
     * @param tick Current tick data
     * @param currentSignal Current signal (unused - kept for future extensions)
     * @param strategy Trading strategy (unused - kept for future extensions)
     * @param context Market context (unused - kept for future extensions)
     * @return ExitCheckResult indicating if exit is needed and why
     */
    public ExitCheckResult checkExitConditions(
            ActiveOrder order,
            Ticker tick,
            Optional<Signal> currentSignal,
            Strategy strategy,
            MarketContext context
    ) {
        double currentPrice = tick.price();
        double entryPrice = order.entryPrice();

        // 1. Stop loss (highest priority - risk management)
        if (currentPrice <= order.stopLoss()) {
            log.debug("[{}] 🛑 Stop loss hit @ {} (entry: {})", tick.time(), currentPrice, entryPrice);
            return ExitCheckResult.exit(ExitReason.STOP_LOSS);
        }

        // 2. Take profit (protect gains)
        if (currentPrice >= order.takeProfit()) {
            log.debug("[{}] 🎯 Take profit hit @ {} (entry: {})", tick.time(), currentPrice, entryPrice);
            return ExitCheckResult.exit(ExitReason.TAKE_PROFIT);
        }

        return ExitCheckResult.noExit();
    }

    /**
     * Closes an active order and calculates returns.
     *
     * @param order Order to close
     * @param tick Exit tick data
     * @param reason Exit reason
     * @return CloseResult with closed order and cash returned
     */
    public CloseResult closeOrder(ActiveOrder order, Ticker tick, ExitReason reason) {
        double exitPrice = tick.price();

        // Calculate holding duration
        LocalDateTime entry = LocalDateTime.parse(order.entryTime(), FORMATTER);
        LocalDateTime exit = LocalDateTime.parse(tick.time(), FORMATTER);
        Duration holding = Duration.between(entry, exit);

        // Close order
        ActiveOrder closedOrder = order.closeOrder(exitPrice, tick.time(), reason, holding);

        // Calculate cash returned
        double cashReturned = exitPrice * order.quantity();

        log.debug("[{}] ✅ Order closed: {} | P/L: {} ({}%) | Reason: {}",
                 tick.time(),
                 closedOrder.orderNumber(),
                String.format("%.2f", closedOrder.profitLoss().orElse(0.0)),
                 String.format("%.2f", closedOrder.profitLossPercent().orElse(0.0)),
                 reason);

        return new CloseResult(closedOrder, cashReturned);
    }

    /**
     * Calculates stop loss price level.
     *
     * @param entryPrice Entry price
     * @param stopLossPercent Stop loss percentage (e.g., 2.0 for 2%)
     * @return Stop loss price
     */
    public double calculateStopLoss(double entryPrice, double stopLossPercent) {
        return entryPrice * (1 - stopLossPercent / 100.0);
    }

    /**
     * Calculates take profit price level.
     *
     * @param entryPrice Entry price
     * @param takeProfitPercent Take profit percentage (e.g., 5.0 for 5%)
     * @return Take profit price
     */
    public double calculateTakeProfit(double entryPrice, double takeProfitPercent) {
        return entryPrice * (1 + takeProfitPercent / 100.0);
    }
}
