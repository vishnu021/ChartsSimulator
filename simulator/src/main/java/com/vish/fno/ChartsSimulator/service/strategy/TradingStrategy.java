package com.vish.fno.ChartsSimulator.service.strategy;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;

/**
 * Interface for trading logic (risk management parameters).
 *
 * <p><b>Design Philosophy:</b></p>
 * Strategies only define risk parameters (stop loss, take profit).
 * Entry/exit decisions are made via signal detection, not separate validation methods.
 *
 * <p><b>Removed Methods:</b></p>
 * <ul>
 *   <li>shouldBuy() - Redundant. If strategy emits signal, it already decided to buy.</li>
 *   <li>shouldSell() - Exit handled by stop/target levels, not strategy signals.</li>
 *   <li>calculatePositionSize() - Moved to default method (same logic for all strategies).</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public interface TradingStrategy {

    /**
     * Returns stop loss percentage.
     *
     * @return Stop loss percentage (e.g., 2.0 for 2%)
     */
    double getStopLossPercent();

    /**
     * Sets stop loss percentage (for runtime overrides).
     *
     * @param stopLossPercent Stop loss percentage
     */
    void setStopLossPercent(double stopLossPercent);

    /**
     * Returns take profit percentage.
     *
     * @return Take profit percentage (e.g., 5.0 for 5%)
     */
    double getTakeProfitPercent();

    /**
     * Sets take profit percentage (for runtime overrides).
     *
     * @param takeProfitPercent Take profit percentage
     */
    void setTakeProfitPercent(double takeProfitPercent);

    /**
     * Returns backtest properties (for default position sizing).
     *
     * @return Backtest properties
     */
    BacktestProperties getBacktestProperties();

    /**
     * Calculates position size based on capital and risk (default implementation).
     *
     * <p>All strategies use identical logic based on BacktestProperties:</p>
     * <ul>
     *   <li><b>Index Instruments:</b> Always trade quantity=1 (Nifty, Bank Nifty, Sensex, etc.)</li>
     *   <li>If fixedQuantity > 0, use fixed quantity</li>
     *   <li>Otherwise, use percentage of capital (positionSizePercent)</li>
     *   <li>Round to lot size multiples</li>
     *   <li>Minimum: 1 lot (ensures position can be taken even with expensive instruments)</li>
     * </ul>
     *
     * @param symbol Trading symbol
     * @param capital Available capital
     * @param price Current price
     * @param riskPercent Risk percentage per trade (unused in current impl)
     * @return Number of shares/contracts to trade
     */
    default int calculatePositionSize(String symbol, double capital, double price, double riskPercent) {
        BacktestProperties properties = getBacktestProperties();

        // Index instruments: Always trade 1 unit (expensive instruments like Nifty 50)
        if (properties.isIndexSymbol(symbol)) {
            return 1;
        }

        int lotSize = properties.lotSize();

        // Fixed quantity mode
        if (properties.fixedQuantity() > 0) {
            int quantity = properties.fixedQuantity();
            return (quantity / lotSize) * lotSize;  // Round to lot size
        }

        // Percentage-based sizing
        double positionPercent = properties.positionSizePercent();
        double riskCapital = capital * (positionPercent / 100.0);
        int quantity = (int) Math.floor(riskCapital / price);

        // Round to lot size multiples
        int roundedQuantity = (quantity / lotSize) * lotSize;

        // Ensure minimum of 1 lot (otherwise can't trade expensive instruments)
        if (roundedQuantity == 0 && capital >= price * lotSize) {
            return lotSize;  // Return 1 lot if we can afford it
        }

        return roundedQuantity;
    }
}
