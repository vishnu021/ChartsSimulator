package com.vish.fno.ChartsSimulator.model.backtest;

/**
 * Reason why a position was closed.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public enum ExitReason {
    /**
     * Exit triggered by trading signal (e.g., peak after dip entry).
     */
    SIGNAL,

    /**
     * Exit triggered by stop loss level being hit.
     */
    STOP_LOSS,

    /**
     * Exit triggered by take profit level being hit.
     */
    TAKE_PROFIT,

    /**
     * Exit forced at end of trading day/backtest period.
     */
    END_OF_DAY
}
