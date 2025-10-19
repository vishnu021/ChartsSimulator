package com.vish.fno.ChartsSimulator.service.strategy;

/**
 * Complete trading strategy interface combining signal detection and trading logic.
 *
 * <p>Implementations should provide strategy-specific documentation in their class-level Javadoc,
 * including algorithm description, entry/exit rules, and parameter details.</p>
 *
 * <p><b>Example Implementation:</b></p>
 * <pre>{@code
 * /**
 *  * Moving Average mean reversion strategy.
 *  *
 *  * <p><b>Algorithm:</b> Detects dips and peaks using moving average comparison.</p>
 *  * <p><b>Entry:</b> Buy on confirmed dips (price below MA + follow-through).</p>
 *  * <p><b>Exit:</b> Sell on peaks or stop/target levels.</p>
 *  * /
 * @Service
 * public class MovingAverageStrategy implements Strategy {
 *     // Implementation
 * }
 * }</pre>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 * @see SignalDetectionStrategy
 * @see TradingStrategy
 */
public interface Strategy extends SignalDetectionStrategy, TradingStrategy {

    /**
     * Returns unique strategy identifier.
     *
     * @return Strategy name (e.g., "moving-average", "rsi")
     */
    default String getStrategyName() {
        return this.getClass().getSimpleName();
    }

}
