package com.vish.fno.ChartsSimulator.model;

/**
 * Represents a significant price movement (dip or peak) detected in ticker data.
 * Used to highlight important trading opportunities in the UI.
 *
 * <p><b>Timestamp Fields:</b></p>
 * <ul>
 *   <li><b>timestamp</b>: The reversal point (dip/peak) time - for reference and analysis</li>
 *   <li><b>emissionTime</b>: When the signal was confirmed and emitted - where arrow appears on chart</li>
 * </ul>
 *
 * <p>The emission time is typically 5-10 ticks (3-6 seconds) after the reversal point,
 * as the algorithm waits to confirm the movement with follow-through validation.</p>
 */
public record SignificantMove(
        String timestamp,      // Time of the reversal point (dip/peak)
        String emissionTime,   // Time when signal was confirmed and emitted
        double price,          // Price at the reversal point
        String type,           // "dip" or "peak"
        double magnitude       // Magnitude of the move (percentage change)
) {}
