package com.vish.fno.ChartsSimulator.model;

/**
 * Represents a trading signal (dip or peak) detected in ticker data.
 * Used to highlight important trading opportunities in the UI and backtesting.
 *
 * <p><b>Timestamp Fields:</b></p>
 * <ul>
 *   <li><b>timestamp</b>: The reversal point (dip/peak) time - for reference and analysis</li>
 *   <li><b>emissionTime</b>: When the signal was confirmed and emitted - where arrow appears on chart</li>
 *   <li><b>expiryTime</b>: When the signal expires - after this time, signal is invalid</li>
 * </ul>
 *
 * <p>The emission time is typically 5-10 ticks (3-6 seconds) after the reversal point,
 * as the algorithm waits to confirm the movement with follow-through validation.</p>
 *
 * <p><b>Signal Expiry:</b></p>
 * <p>Signals have a limited validity period. If we cannot enter immediately (e.g., already in position),
 * the signal expires after a strategy-defined duration. This prevents entering stale signals when
 * market conditions have changed.</p>
 */
public record Signal(
        String timestamp,      // Time of the reversal point (dip/peak)
        String emissionTime,   // Time when signal was confirmed and emitted
        String expiryTime,     // Time when signal expires (becomes invalid)
        double price,          // Price at the reversal point
        String type,           // "dip" or "peak"
        double magnitude       // Magnitude of the move (percentage change)
) {}
