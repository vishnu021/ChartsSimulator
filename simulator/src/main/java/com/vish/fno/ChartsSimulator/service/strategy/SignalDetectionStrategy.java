package com.vish.fno.ChartsSimulator.service.strategy;

import com.vish.fno.ChartsSimulator.cache.TradeSimulationCache;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.models.Ticker;

import java.util.Map;
import java.util.Optional;

/**
 * Interface for signal detection strategies.
 *
 * <p>Implementations detect trading signals (dips/peaks) from ticker data
 * using various technical analysis algorithms.</p>
 *
 * <p><b>Real-time Simulation Design (v3.0.0):</b></p>
 * This interface is designed for tick-by-tick simulation where each call
 * receives only the LATEST tick and accesses historical data via cache.
 * This mirrors real-time trading where you process one tick at a time.
 *
 * <p><b>Architecture Benefits:</b></p>
 * <ul>
 *   <li>Memory efficient: Only latest tick passed per call (not entire history)</li>
 *   <li>Shared cache: Historical data shared across all simulations</li>
 *   <li>Isolated state: Cache separated from simulation state</li>
 *   <li>Scalability: Reduces memory footprint for multiple concurrent backtests</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 * @version 3.0.0 - Refactored to use TradeSimulationCache and latest tick only
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
     * Detects a trading signal from the latest tick and historical data cache.
     *
     * <p><b>IMPORTANT - Real-time Simulation:</b></p>
     * This method is called on EVERY tick during backtesting with only the LATEST tick.
     * Strategies that need historical context must access it via the cache.
     * It should return at most ONE signal based on the current market state, mimicking
     * real-time trading where you process ticks sequentially.
     *
     * <p><b>Design Rationale:</b></p>
     * <ul>
     *   <li>Returns Optional to clearly indicate signal presence/absence</li>
     *   <li>Single signal per call aligns with tick-by-tick processing</li>
     *   <li>Strategies maintain their own thresholds internally</li>
     *   <li>Historical data accessed via cache (shared across simulations)</li>
     *   <li>Latest tick + cache prevents forward bias (only past data available)</li>
     * </ul>
     *
     * <p><b>Usage Example:</b></p>
     * <pre>{@code
     * public Optional<Signal> detectSignal(Ticker latestTick, String symbol, String date, TradeSimulationCache cache) {
     *     // Get historical context if needed
     *     List<Ticker> history = cache.getHistoricalTickers(symbol, date);
     *
     *     // Analyze latest tick with historical context
     *     if (shouldGenerateSignal(latestTick, history)) {
     *         return Optional.of(createSignal(latestTick));
     *     }
     *     return Optional.empty();
     * }
     * }</pre>
     *
     * @param latestTick Latest ticker data point
     * @param symbol Trading symbol (for cache lookup)
     * @param date Trading date (for cache lookup)
     * @param cache Shared cache containing all historical tickers
     * @return Optional containing the detected signal, or empty if no signal
     */
    Optional<Signal> detectSignal(Ticker latestTick, String symbol, String date, TradeSimulationCache cache);

    /**
     * Returns strategy configuration parameters.
     *
     * @return Map of parameter names to values
     */
    Map<String, Object> getParameters();
}
