package com.vish.fno.ChartsSimulator.service.strategy;

import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.models.Ticker;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Interface for signal detection strategies.
 *
 * <p>Implementations detect trading signals (dips/peaks) from ticker data
 * using various technical analysis algorithms.</p>
 *
 * <p><b>Real-time Simulation Design:</b></p>
 * This interface is designed for tick-by-tick simulation where each call
 * analyzes the current historical data and returns at most one signal.
 * This mirrors real-time trading where you process one tick at a time.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
public interface SignalDetectionStrategy {

    /**
     * Resets internal strategy state before a new backtest run.
     *
     * <p>Stateful strategies (e.g., those caching candlesticks or indicators)
     * must clear all cached data. Stateless strategies can leave this empty.</p>
     *
     * <p><b>Called by BacktestEngine</b> at the start of each backtest to ensure
     * no state leakage between runs.</p>
     */
    default void reset() {
        // Default: no-op for stateless strategies
    }

    /**
     * Detects a trading signal from ticker data.
     *
     * <p><b>IMPORTANT - Real-time Simulation:</b></p>
     * This method is called on EVERY tick during backtesting with growing historical data.
     * It should return at most ONE signal based on the current market state, mimicking
     * real-time trading where you process ticks sequentially.
     *
     * <p><b>Design Rationale:</b></p>
     * <ul>
     *   <li>Returns Optional to clearly indicate signal presence/absence</li>
     *   <li>Single signal per call aligns with tick-by-tick processing</li>
     *   <li>Strategies maintain their own thresholds internally</li>
     *   <li>Implementations use only data available in the provided list (no forward bias)</li>
     * </ul>
     *
     * @param tickers List of historical ticker data up to current moment
     * @return Optional containing the detected signal, or empty if no signal
     */
    Optional<Signal> detectSignal(List<Ticker> tickers);

    /**
     * Returns strategy configuration parameters.
     *
     * @return Map of parameter names to values
     */
    Map<String, Object> getParameters();
}
