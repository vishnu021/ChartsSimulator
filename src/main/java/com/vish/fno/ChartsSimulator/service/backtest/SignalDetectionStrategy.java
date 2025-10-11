package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;

import java.util.List;
import java.util.Map;

/**
 * Interface for signal detection strategies.
 *
 * <p>Implementations detect trading signals (dips/peaks) from ticker data
 * using various technical analysis algorithms.</p>
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
     * Detects trading signals from ticker data.
     *
     * <p><b>IMPORTANT</b>: During incremental backtesting, this method is called
     * repeatedly with growing datasets: tickers[0..i] where i increases.
     * Implementations must only use data available in the provided list.</p>
     *
     * @param tickers List of ticker data points (may be partial during incremental processing)
     * @param threshold Percentage threshold for significance (e.g., 0.5 for 0.5%)
     * @return List of detected significant moves (dips and peaks)
     */
    List<SignificantMove> detectSignals(List<Ticker> tickers, double threshold);

    /**
     * Returns strategy configuration parameters.
     *
     * @return Map of parameter names to values
     */
    Map<String, Object> getParameters();
}
