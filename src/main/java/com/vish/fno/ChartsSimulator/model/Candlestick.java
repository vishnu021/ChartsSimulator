package com.vish.fno.ChartsSimulator.model;

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
    int tickCount
) {
    /**
     * Creates a new candlestick starting with a single price.
     *
     * @param timestamp Candlestick timestamp
     * @param price Initial price (used for O, H, L, C)
     * @return New candlestick with single price
     */
    public static Candlestick create(String timestamp, double price) {
        return new Candlestick(timestamp, price, price, price, price, 1);
    }

    /**
     * Updates this candlestick with a new tick price.
     * Returns a new Candlestick instance (immutable update).
     *
     * @param price New tick price
     * @return New candlestick with updated OHLC
     */
    public Candlestick update(double price) {
        return new Candlestick(
            this.timestamp,
            this.open,  // Open never changes
            Math.max(this.high, price),  // Update high
            Math.min(this.low, price),   // Update low
            price,  // Close is the latest price
            this.tickCount + 1
        );
    }

    /**
     * Returns the range (high - low) of this candlestick.
     *
     * @return Price range
     */
    public double range() {
        return high - low;
    }

    /**
     * Returns the body size (close - open).
     * Positive = bullish, Negative = bearish.
     *
     * @return Body size
     */
    public double body() {
        return close - open;
    }

    /**
     * Checks if this is a bullish candlestick (close > open).
     *
     * @return true if bullish
     */
    public boolean isBullish() {
        return close > open;
    }

    /**
     * Checks if this is a bearish candlestick (close < open).
     *
     * @return true if bearish
     */
    public boolean isBearish() {
        return close < open;
    }
}
