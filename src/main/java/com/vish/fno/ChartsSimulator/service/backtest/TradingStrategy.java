package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.backtest.MarketContext;

/**
 * Interface for trading logic (entry/exit decisions).
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public interface TradingStrategy {

    /**
     * Determines if should enter long position.
     *
     * @param signal Current trading signal
     * @param context Market context
     * @return true if should buy
     */
    boolean shouldBuy(SignificantMove signal, MarketContext context);

    /**
     * Determines if should exit position.
     *
     * @param signal Current trading signal
     * @param context Market context
     * @return true if should sell
     */
    boolean shouldSell(SignificantMove signal, MarketContext context);

    /**
     * Calculates position size based on capital and risk.
     *
     * @param capital Available capital
     * @param price Current price
     * @param riskPercent Risk percentage per trade
     * @return Number of shares/contracts to trade
     */
    int calculatePositionSize(double capital, double price, double riskPercent);

    /**
     * Returns stop loss percentage.
     *
     * @return Stop loss percentage (e.g., 2.0 for 2%)
     */
    double getStopLossPercent();

    /**
     * Returns take profit percentage.
     *
     * @return Take profit percentage (e.g., 5.0 for 5%)
     */
    double getTakeProfitPercent();
}
