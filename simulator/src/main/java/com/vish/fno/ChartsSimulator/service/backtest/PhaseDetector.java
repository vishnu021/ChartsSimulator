package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.models.Candlestick;
import com.vish.fno.ChartsSimulator.model.backtest.MarketPhase;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

/**
 * Detects market phases using Wyckoff cycle methodology.
 *
 * <p><b>Phase Detection Algorithm:</b></p>
 * <ul>
 *   <li><b>ACCUMULATION:</b> Sideways movement after downtrend (price below EMA, low volatility)</li>
 *   <li><b>MARKUP:</b> Uptrend with higher highs and higher lows (price above EMA, rising)</li>
 *   <li><b>DISTRIBUTION:</b> Sideways movement after uptrend (price above EMA, low volatility)</li>
 *   <li><b>MARKDOWN:</b> Downtrend with lower highs and lower lows (price below EMA, falling)</li>
 * </ul>
 *
 * <p><b>Technical Indicators Used:</b></p>
 * <ul>
 *   <li>20-period EMA for trend identification</li>
 *   <li>10-candle lookback for high/low range analysis</li>
 *   <li>0.5% consolidation threshold for low volatility detection</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.2.0
 */
@Slf4j
public class PhaseDetector {

    // Phase detection parameters
    private static final int PHASE_EMA_PERIOD = 20;           // EMA period for trend detection
    private static final int PHASE_LOOKBACK = 10;             // Candles to look back for phase confirmation
    private static final double CONSOLIDATION_THRESHOLD = 0.5; // 0.5% range for consolidation detection

    /**
     * Detects the current market phase based on candlestick price action.
     *
     * @param candlesticks Historical candlestick data
     * @param previousPhase Previous detected phase (for continuity when unclear)
     * @return Current market phase
     */
    public static MarketPhase detectPhase(List<Candlestick> candlesticks, MarketPhase previousPhase) {
        // Need enough data for phase detection
        if (candlesticks == null || candlesticks.size() < PHASE_EMA_PERIOD + PHASE_LOOKBACK) {
            return MarketPhase.UNKNOWN;
        }

        // Calculate EMA for trend identification
        double[] prices = candlesticks.stream()
                .mapToDouble(Candlestick::close)
                .toArray();
        double currentEMA = calculateEMA(prices, PHASE_EMA_PERIOD);
        double currentPrice = candlesticks.get(candlesticks.size() - 1).close();

        // Calculate recent highs and lows for trend direction
        int startIdx = Math.max(0, candlesticks.size() - PHASE_LOOKBACK);
        double recentHigh = candlesticks.subList(startIdx, candlesticks.size()).stream()
                .mapToDouble(Candlestick::high)
                .max()
                .orElse(currentPrice);
        double recentLow = candlesticks.subList(startIdx, candlesticks.size()).stream()
                .mapToDouble(Candlestick::low)
                .min()
                .orElse(currentPrice);

        // Calculate range percentage for consolidation detection
        double rangePercent = ((recentHigh - recentLow) / recentLow) * 100.0;

        // Determine if price is above or below EMA
        boolean priceAboveEMA = currentPrice > currentEMA;

        // Calculate price momentum (current vs EMA)
        double momentumPercent = ((currentPrice - currentEMA) / currentEMA) * 100.0;

        // Determine trend direction (compare recent high/low with older high/low)
        boolean risingTrend = false;
        boolean fallingTrend = false;
        if (candlesticks.size() >= PHASE_EMA_PERIOD + (PHASE_LOOKBACK * 2)) {
            int olderStartIdx = candlesticks.size() - (PHASE_LOOKBACK * 2);
            int olderEndIdx = candlesticks.size() - PHASE_LOOKBACK;
            double olderHigh = candlesticks.subList(olderStartIdx, olderEndIdx).stream()
                    .mapToDouble(Candlestick::high)
                    .max()
                    .orElse(recentHigh);
            double olderLow = candlesticks.subList(olderStartIdx, olderEndIdx).stream()
                    .mapToDouble(Candlestick::low)
                    .min()
                    .orElse(recentLow);

            risingTrend = recentHigh > olderHigh && recentLow > olderLow;  // Higher highs & higher lows
            fallingTrend = recentHigh < olderHigh && recentLow < olderLow; // Lower highs & lower lows
        }

        // Determine phase based on price position, momentum, and trend
        MarketPhase phase;

        if (rangePercent < CONSOLIDATION_THRESHOLD) {
            // Low volatility = Consolidation (Accumulation or Distribution)
            if (priceAboveEMA) {
                phase = MarketPhase.DISTRIBUTION; // Consolidation at top
            } else {
                phase = MarketPhase.ACCUMULATION; // Consolidation at bottom
            }
        } else {
            // High volatility = Trending (Markup or Markdown)
            if (risingTrend && priceAboveEMA) {
                phase = MarketPhase.MARKUP; // Uptrend
            } else if (fallingTrend && !priceAboveEMA) {
                phase = MarketPhase.MARKDOWN; // Downtrend
            } else if (priceAboveEMA && momentumPercent > 0.5) {
                phase = MarketPhase.MARKUP; // Strong upward momentum
            } else if (!priceAboveEMA && momentumPercent < -0.5) {
                phase = MarketPhase.MARKDOWN; // Strong downward momentum
            } else {
                // Unclear phase - use previous phase or default to unknown
                phase = previousPhase != MarketPhase.UNKNOWN ? previousPhase : MarketPhase.UNKNOWN;
            }
        }

        // Log phase changes
        if (phase != previousPhase && phase != MarketPhase.UNKNOWN) {
            log.trace("📊 Market phase changed: {} → {} (price: {}, EMA: {}, range: {}%, momentum: {}%)",
                    previousPhase, phase,
                    String.format("%.2f", currentPrice),
                    String.format("%.2f", currentEMA),
                    String.format("%.2f", rangePercent),
                    String.format("%.2f", momentumPercent));
        }

        return phase;
    }

    /**
     * Calculates Exponential Moving Average for the given prices.
     *
     * @param prices Array of prices
     * @param period EMA period
     * @return Current EMA value
     */
    private static double calculateEMA(double[] prices, int period) {
        if (prices.length < period) {
            // Not enough data, return simple average
            double sum = 0;
            for (double price : prices) {
                sum += price;
            }
            return sum / prices.length;
        }

        // Calculate initial SMA for first EMA value
        double sum = 0;
        for (int i = 0; i < period; i++) {
            sum += prices[i];
        }
        double ema = sum / period;

        // Calculate EMA for remaining prices
        double multiplier = 2.0 / (period + 1);
        for (int i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }

        return ema;
    }
}
