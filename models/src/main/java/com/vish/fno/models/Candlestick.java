package com.vish.fno.models;

/**
 * Represents a 1-minute candlestick (OHLC bar).
 *
 * <p>Candlesticks aggregate multiple ticks within a time window (typically 1 minute)
 * to provide Open, High, Low, Close prices.</p>
 *
 * @param timestamp Candlestick timestamp (minute precision, e.g., "2025-10-01 09:25:00.000")
 * @param open First price in the time window
 * @param high Highest price in the time window
 * @param low Lowest price in the time window
 * @param close Last price in the time window
 * @param tickCount Number of ticks used to form this candlestick
 *
 * @author ChartsSimulator
 * @since 2.1.0
 */
public record Candlestick(
    String timestamp,
    double open,
    double high,
    double low,
    double close,
    long volume,
    int tickCount
) {
}
