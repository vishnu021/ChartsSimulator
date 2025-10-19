package com.vish.fno.ChartsSimulator.model.backtest;

/**
 * Type of trade (long or short position).
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public enum TradeType {
    /**
     * Long position (buy to open, sell to close).
     */
    LONG,

    /**
     * Short position (sell to open, buy to close).
     */
    SHORT
}
