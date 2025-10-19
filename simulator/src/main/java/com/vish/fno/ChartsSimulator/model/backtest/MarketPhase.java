package com.vish.fno.ChartsSimulator.model.backtest;

/**
 * Market phases based on Wyckoff cycle methodology.
 *
 * <p><b>Phase Characteristics:</b></p>
 * <ul>
 *   <li><b>ACCUMULATION:</b> Consolidation at bottom (sideways after downtrend) - Smart money accumulating</li>
 *   <li><b>MARKUP:</b> Uptrend (higher highs and higher lows) - Price advancing</li>
 *   <li><b>DISTRIBUTION:</b> Consolidation at top (sideways after uptrend) - Smart money distributing</li>
 *   <li><b>MARKDOWN:</b> Downtrend (lower highs and lower lows) - Price declining</li>
 *   <li><b>UNKNOWN:</b> Not enough data or unclear phase</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.2.0
 */
public enum MarketPhase {
    /**
     * Consolidation at bottom - sideways movement after downtrend.
     * Smart money is accumulating positions.
     */
    ACCUMULATION,

    /**
     * Uptrend - higher highs and higher lows.
     * Price is advancing, trending up.
     */
    MARKUP,

    /**
     * Consolidation at top - sideways movement after uptrend.
     * Smart money is distributing positions.
     */
    DISTRIBUTION,

    /**
     * Downtrend - lower highs and lower lows.
     * Price is declining, trending down.
     */
    MARKDOWN,

    /**
     * Not enough data or unclear phase.
     * Insufficient information to determine current market phase.
     */
    UNKNOWN
}
