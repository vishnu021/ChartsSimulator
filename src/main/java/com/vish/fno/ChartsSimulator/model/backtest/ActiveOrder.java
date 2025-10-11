package com.vish.fno.ChartsSimulator.model.backtest;

import com.vish.fno.ChartsSimulator.model.Signal;
import lombok.Builder;

import java.time.Duration;
import java.util.Optional;

/**
 * Represents an active or completed order in the backtest simulation.
 *
 * <p><b>Lifecycle:</b></p>
 * <ol>
 *   <li><b>Signal Detected:</b> Strategy identifies a trading opportunity</li>
 *   <li><b>Order Created:</b> Signal converted to ActiveOrder with entry details (active=true)</li>
 *   <li><b>Order Tracked:</b> Engine monitors stop loss, take profit, exit signals on every tick</li>
 *   <li><b>Order Exited:</b> Position closed, exit details populated (active=false)</li>
 *   <li><b>Trade History:</b> Inactive order becomes part of completed trades</li>
 * </ol>
 *
 * <p><b>Design Philosophy:</b></p>
 * This model bridges the gap between trading signals and executed trades. It maintains both the
 * original signal that triggered the entry and the actual execution details, enabling better
 * strategy analysis and debugging.
 *
 * @param triggerSignal The signal that triggered this order (immutable reference)
 * @param orderNumber Sequential order number in backtest
 * @param symbol Trading symbol
 * @param quantity Number of shares/contracts
 * @param entryPrice Actual entry execution price
 * @param entryTime Entry execution timestamp
 * @param stopLoss Stop loss price level
 * @param takeProfit Take profit price level
 * @param active Whether order is currently open (true) or closed (false)
 * @param exitPrice Exit execution price (present only when closed)
 * @param exitTime Exit execution timestamp (present only when closed)
 * @param exitReason Why the order was closed (present only when closed)
 * @param profitLoss Realized P/L in absolute terms (present only when closed)
 * @param profitLossPercent Realized P/L as percentage (present only when closed)
 * @param holdingDuration Time between entry and exit (present only when closed)
 *
 * @author ChartsSimulator
 * @since 2.0.0
 */
@Builder
public record ActiveOrder(
    Signal triggerSignal,
    int orderNumber,
    String symbol,
    int quantity,
    double entryPrice,
    String entryTime,
    double stopLoss,
    double takeProfit,
    boolean active,

    // Exit details (populated only when order is closed)
    Optional<Double> exitPrice,
    Optional<String> exitTime,
    Optional<ExitReason> exitReason,
    Optional<Double> profitLoss,
    Optional<Double> profitLossPercent,
    Optional<Duration> holdingDuration
) {

    /**
     * Create a new active order from a signal and entry execution details.
     *
     * @param triggerSignal Signal that triggered this order
     * @param orderNumber Sequential order number
     * @param symbol Trading symbol
     * @param quantity Position size
     * @param entryPrice Entry execution price
     * @param entryTime Entry timestamp
     * @param stopLoss Stop loss price level
     * @param takeProfit Take profit price level
     * @return New active order ready for tracking
     */
    public static ActiveOrder openOrder(
            Signal triggerSignal,
            int orderNumber,
            String symbol,
            int quantity,
            double entryPrice,
            String entryTime,
            double stopLoss,
            double takeProfit) {

        return ActiveOrder.builder()
                .triggerSignal(triggerSignal)
                .orderNumber(orderNumber)
                .symbol(symbol)
                .quantity(quantity)
                .entryPrice(entryPrice)
                .entryTime(entryTime)
                .stopLoss(stopLoss)
                .takeProfit(takeProfit)
                .active(true)
                .exitPrice(Optional.empty())
                .exitTime(Optional.empty())
                .exitReason(Optional.empty())
                .profitLoss(Optional.empty())
                .profitLossPercent(Optional.empty())
                .holdingDuration(Optional.empty())
                .build();
    }

    /**
     * Close this order with exit details.
     *
     * @param exitPrice Exit execution price
     * @param exitTime Exit timestamp
     * @param reason Exit reason (stop loss, take profit, signal, etc.)
     * @return New inactive order with exit details populated
     */
    public ActiveOrder closeOrder(double exitPrice, String exitTime, ExitReason reason, Duration holding) {
        double pnl = (exitPrice - this.entryPrice) * this.quantity;
        double pnlPercent = ((exitPrice - this.entryPrice) / this.entryPrice) * 100.0;

        return ActiveOrder.builder()
                .triggerSignal(this.triggerSignal)
                .orderNumber(this.orderNumber)
                .symbol(this.symbol)
                .quantity(this.quantity)
                .entryPrice(this.entryPrice)
                .entryTime(this.entryTime)
                .stopLoss(this.stopLoss)
                .takeProfit(this.takeProfit)
                .active(false)
                .exitPrice(Optional.of(exitPrice))
                .exitTime(Optional.of(exitTime))
                .exitReason(Optional.of(reason))
                .profitLoss(Optional.of(pnl))
                .profitLossPercent(Optional.of(pnlPercent))
                .holdingDuration(Optional.of(holding))
                .build();
    }

    /**
     * Convert closed order to Trade record for results.
     *
     * @return Trade record with all details
     * @throws IllegalStateException if order is still active
     */
    public Trade toTrade() {
        if (this.active) {
            throw new IllegalStateException("Cannot convert active order to trade - order must be closed first");
        }

        return new Trade(
                this.orderNumber,
                this.symbol,
                TradeType.LONG,
                this.entryTime,
                this.entryPrice,
                this.quantity,
                this.exitTime.orElseThrow(),
                this.exitPrice.orElseThrow(),
                this.profitLoss.orElseThrow(),
                this.profitLossPercent.orElseThrow(),
                this.holdingDuration.orElseThrow(),
                this.exitReason.orElseThrow()
        );
    }
}
