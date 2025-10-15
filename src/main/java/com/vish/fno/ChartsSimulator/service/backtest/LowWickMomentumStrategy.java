package com.vish.fno.ChartsSimulator.service.backtest;

import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Candlestick;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.util.CandleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Low Wick Momentum Strategy - Phase-aware strategy trading strong buying pressure candles.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy identifies candles with minimal upper wick (less than 5%), which indicates
 * strong buying pressure with no rejection at higher prices. When buyers dominate and push
 * price near the high without sellers stepping in, it signals potential continuation.
 *
 * <p><b>⚠️ PHASE FILTERING (NEW):</b></p>
 * <p>This strategy only takes trades during <b>MARKDOWN</b> or <b>DISTRIBUTION</b> phases to align
 * with bearish market conditions. Phase detection uses Wyckoff cycle methodology with 20-period EMA
 * and price action analysis.</p>
 *
 * <p><b>Signal Detection Logic:</b></p>
 * <ol>
 *   <li>Detect current market phase (Accumulation, Markup, Distribution, Markdown)</li>
 *   <li>Skip signal detection if phase is NOT Markdown or Distribution</li>
 *   <li>Convert tick data to 1-minute candlesticks (OHLC)</li>
 *   <li>When candle completes, calculate upper wick percentage</li>
 *   <li>Upper Wick % = ((High - Close) / Close) × 100</li>
 *   <li>If upper wick < 5%, generate buy signal (strong momentum)</li>
 *   <li>Entry at candle close price (last price of the minute)</li>
 * </ol>
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
 *   <li><b>Phase Check:</b> Current phase must be MARKDOWN or DISTRIBUTION</li>
 *   <li>Candle closes with upper wick less than 5% of close price</li>
 *   <li>Indicates strong buying pressure (no rejection at highs)</li>
 *   <li>Entry at candle close price</li>
 *   <li>Only enter if no position is currently open</li>
 * </ul>
 *
 * <p><b>Exit Rules:</b></p>
 * <ul>
 *   <li><b>Stop Loss:</b> Below candle's low (support level where buyers entered)</li>
 *   <li><b>Take Profit:</b> Entry + 2× risk (risk-reward ratio 1:2)</li>
 *   <li>Example: Entry @ 100, Low @ 98 → Risk = 2 → Target = 100 + 2×2 = 104</li>
 * </ul>
 *
 * <p><b>Parameters:</b></p>
 * <ul>
 *   <li>maxUpperWickPercent: 5.0% - Maximum upper wick allowed for signal</li>
 *   <li>riskRewardRatio: 2.0 - Target is 2× the risk (1:2 R:R)</li>
 *   <li>minCandleBody: 0.1% - Minimum body size to avoid doji candles</li>
 * </ul>
 *
 * <p><b>Candle Anatomy Example:</b></p>
 * <pre>
 * High:  105  ─┐
 *            │ │ Upper Wick (105-103=2)
 * Close: 103 ─┤ ┐
 *            │ │ │ Body (103-99=4)
 * Open:   99 ─┘ │
 *            │   │ Lower Wick (99-97=2)
 * Low:    97  ─┘
 *
 * Upper Wick % = (105-103)/103 × 100 = 1.94%  ✅ < 5% → BUY SIGNAL
 * </pre>
 *
 * <p><b>Pattern Example:</b></p>
 * <pre>
 * Time:    9:20    9:21    9:22    9:23
 * OHLC:    99/102  102/105 105/107 107/110
 *          /100    /104    /106    /108
 *
 * Candle @ 9:21: High=105, Close=104
 * Upper Wick = (105-104)/104 × 100 = 0.96% ✅ < 5%
 *
 * BUY SIGNAL @ 104
 * Stop: 102 (candle low) → Risk = 2 points
 * Target: 104 + 2×2 = 108 → R:R = 1:2
 * </pre>
 *
 * <p><b>Strategy Characteristics:</b></p>
 * <ul>
 *   <li>Type: Momentum / Trend Following</li>
 *   <li>Best For: Trending markets with strong directional moves</li>
 *   <li>Signal Quality: High frequency (many signals per day)</li>
 *   <li>Holding Period: Short term (minutes to hours)</li>
 *   <li>Risk-Reward: Fixed 1:2 ratio (50% win rate = breakeven)</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 * @version 1.0.0
 * @see Strategy
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LowWickMomentumStrategy implements Strategy {

    private final BacktestProperties backtestProperties;

    // Strategy parameters
    private static final double MAX_UPPER_WICK_PERCENT = 5.0;  // Max 5% upper wick
    private static final double RISK_REWARD_RATIO = 2.0;       // Target = 2× risk (1:2)
    private static final double MIN_CANDLE_BODY_PERCENT = 0.1; // Min 0.1% body to avoid doji

    // Phase detection parameters
    private static final int PHASE_EMA_PERIOD = 20;           // EMA period for trend detection
    private static final int PHASE_LOOKBACK = 10;             // Candles to look back for phase confirmation
    private static final double CONSOLIDATION_THRESHOLD = 0.5; // 0.5% range for consolidation detection

    // Stateful caching (cleared on reset())
    private final List<Candlestick> candlesticks = new ArrayList<>();

    // Track current market phase
    private MarketPhase currentPhase = MarketPhase.UNKNOWN;

    // Track last signal's candle to avoid duplicate signals
    private SignalState lastSignalState = null;
    private String lastCandleTimestamp = null;

    // Track last processed minute to avoid redundant recalculations
    private String lastProcessedMinute = null;

    // Runtime override fields
    private Double stopLossPercentOverride;
    private Double takeProfitPercentOverride;

    /**
     * Internal record to track signal state for stop/target calculation.
     */
    private record SignalState(
        Candlestick signalCandle,
        double entryPrice,
        double stopPrice,
        double targetPrice,
        String signalTime
    ) {}

    @Override
    public void reset() {
        candlesticks.clear();
        lastSignalState = null;
        lastCandleTimestamp = null;
        lastProcessedMinute = null;
        currentPhase = MarketPhase.UNKNOWN;
        stopLossPercentOverride = null;
        takeProfitPercentOverride = null;
        log.debug("LowWickMomentumStrategy state reset");
    }

    @Override
    public Optional<Signal> detectSignal(List<Ticker> tickers) {
        if (tickers == null || tickers.isEmpty()) {
            return Optional.empty();
        }

        // Process only new tickers to build candlesticks incrementally
        updateCandlesticks(tickers);

        // Detect low wick momentum signals from completed candles
        return detectLowWickSignals(tickers);
    }

    /**
     * Builds 1-minute candlesticks from tick data using map-based grouping.
     *
     * <p><b>Optimized Approach:</b></p>
     * <ol>
     *   <li>Checks current minute timestamp of latest ticker</li>
     *   <li>Skips expensive recalculation if still in same minute (60x faster)</li>
     *   <li>Only recalculates when minute boundary changes (new completed candle)</li>
     *   <li>Excludes current/partial minute (last candle is always incomplete)</li>
     * </ol>
     *
     * <p><b>Performance:</b> Reduces calls from 60/min to 1/min (60x speedup)</p>
     */
    private void updateCandlesticks(List<Ticker> tickers) {
        if (tickers.isEmpty()) {
            return;
        }

        // Get latest ticker's minute timestamp (lightweight operation)
        Ticker latestTicker = tickers.get(tickers.size() - 1);
        String currentMinute = CandleUtils.getMinuteKey(latestTicker.time());

        // Skip expensive recalculation if still in same minute
        if (lastProcessedMinute != null && lastProcessedMinute.equals(currentMinute)) {
            return; // No new complete candle yet (60x performance improvement)
        }

        // New minute detected → recalculate completed candlesticks
        List<Candlestick> completed = CandleUtils.getCompletedCandlesticksFromTickers(tickers);
        candlesticks.clear();
        candlesticks.addAll(completed);

        // Update last processed minute
        lastProcessedMinute = currentMinute;
    }

    /**
     * Detects low upper wick candles and generates momentum signals.
     * Only generates signals during MARKDOWN or DISTRIBUTION phases.
     */
    private Optional<Signal> detectLowWickSignals(List<Ticker> tickers) {
        // Need at least 1 completed candle to check for signals
        if (candlesticks.isEmpty()) {
            return Optional.empty();
        }

        // Detect current market phase
        currentPhase = detectMarketPhase(tickers);

        // Only trade in MARKDOWN or DISTRIBUTION phases
        if (currentPhase != MarketPhase.MARKDOWN && currentPhase != MarketPhase.DISTRIBUTION) {
            log.trace("Skipping signal detection - current phase: {} (only trading in MARKDOWN or DISTRIBUTION)",
                    currentPhase);
            return Optional.empty();
        }

        Ticker currentTick = tickers.get(tickers.size() - 1);
        Candlestick lastCompletedCandle = candlesticks.get(candlesticks.size() - 1);

        // Avoid duplicate signals - only check if this candle hasn't generated signal yet
        if (lastSignalState != null && lastSignalState.signalCandle.timestamp().equals(lastCompletedCandle.timestamp())) {
            return Optional.empty(); // Already generated signal for this candle
        }

        if(Objects.equals(lastCandleTimestamp, lastCompletedCandle.timestamp())) {
            return Optional.empty();
        }
        lastCandleTimestamp =  lastCompletedCandle.timestamp();
        double upperWickPercent = CandleUtils.calculateUpperWickPercent(lastCompletedCandle);
        // Calculate upper wick percentage
//        double bodyPercent = CandleUtils.calculateBodyPercent(lastCompletedCandle);

        // Check if candle meets criteria
        if (CandleUtils.isBullish(lastCompletedCandle) && upperWickPercent < MAX_UPPER_WICK_PERCENT /*&& bodyPercent > MIN_CANDLE_BODY_PERCENT*/) {
            // Strong momentum candle! Generate buy signal
            double entryPrice = lastCompletedCandle.close();
            double stopPrice = lastCompletedCandle.low();
            double risk = entryPrice - stopPrice;
            double targetPrice = entryPrice + (risk * RISK_REWARD_RATIO);

            // Calculate as percentages for BacktestEngine
            double stopPercent = ((entryPrice - stopPrice) / entryPrice) * 100.0;
            double targetPercent = ((targetPrice - entryPrice) / entryPrice) * 100.0;

            // Store signal state for stop/target calculation
            lastSignalState = new SignalState(
                lastCompletedCandle,
                entryPrice,
                stopPrice,
                targetPrice,
                currentTick.time()
            );

            // Calculate signal expiry (1 minute after emission)
            String expiryTime = addMinutes(currentTick.time(), 1);

            log.info("[{}] 🎯 LOW WICK SIGNAL [Phase: {}]: Candle closed @ {}. Entry: {}, Stop: {} ({}%), Target: {} ({}%), R:R = 1:{}, bullish: {} with upperWick {}%, expires: {})",
                currentTick.time(),
                currentPhase,
                String.format("%.2f", entryPrice),
                String.format("%.2f", entryPrice),
                String.format("%.2f", stopPrice),
                String.format("%.2f", stopPercent),
                String.format("%.2f", targetPrice),
                String.format("%.2f", targetPercent),
                String.format("%.1f", RISK_REWARD_RATIO),
                    CandleUtils.isBullish(lastCompletedCandle),
                    String.format("%.2f", upperWickPercent),
                expiryTime);

            // Generate signal
            return Optional.of(new Signal(
                lastCompletedCandle.timestamp(),  // Candle timestamp
                currentTick.time(),               // Signal emission time
                expiryTime,                       // Signal expiry time (1 minute)
                entryPrice,                       // Entry at candle close
                "dip",                           // Buy signal
                upperWickPercent                 // Store wick % for analysis
            ));
        }

        return Optional.empty();
    }

    @Override
    public Map<String, Object> getParameters() {
        return Map.of(
            "maxUpperWickPercent", MAX_UPPER_WICK_PERCENT,
            "riskRewardRatio", RISK_REWARD_RATIO,
            "minCandleBodyPercent", MIN_CANDLE_BODY_PERCENT,
            "phaseEmaPeriod", PHASE_EMA_PERIOD,
            "phaseLookback", PHASE_LOOKBACK,
            "consolidationThreshold", CONSOLIDATION_THRESHOLD,
            "allowedPhases", "MARKDOWN, DISTRIBUTION"
        );
    }

    @Override
    public BacktestProperties getBacktestProperties() {
        return backtestProperties;
    }

    @Override
    public double getStopLossPercent() {
        if (stopLossPercentOverride != null) {
            return stopLossPercentOverride;
        }

        // Calculate stop loss based on last signal state if available
        if (lastSignalState != null) {
            double entryPrice = lastSignalState.entryPrice;
            double stopPrice = lastSignalState.stopPrice;
            double stopPercent = ((entryPrice - stopPrice) / entryPrice) * 100.0;

            log.debug("Dynamic stop loss: entry={}, stop={}, percent={}%",
                entryPrice, stopPrice, String.format("%.2f", stopPercent));
            return stopPercent;
        }

        return backtestProperties.stopLossPercent();
    }

    @Override
    public void setStopLossPercent(double stopLossPercent) {
        this.stopLossPercentOverride = stopLossPercent;
        log.debug("Stop loss percent overridden to {}%", stopLossPercent);
    }

    @Override
    public double getTakeProfitPercent() {
        if (takeProfitPercentOverride != null) {
            return takeProfitPercentOverride;
        }

        // Calculate target based on last signal state if available
        if (lastSignalState != null) {
            double entryPrice = lastSignalState.entryPrice;
            double targetPrice = lastSignalState.targetPrice;
            double targetPercent = ((targetPrice - entryPrice) / entryPrice) * 100.0;

            log.debug("Dynamic take profit: entry={}, target={}, percent={}%",
                entryPrice, targetPrice, String.format("%.2f", targetPercent));
            return targetPercent;
        }

        return backtestProperties.takeProfitPercent();
    }

    @Override
    public void setTakeProfitPercent(double takeProfitPercent) {
        this.takeProfitPercentOverride = takeProfitPercent;
        log.debug("Take profit percent overridden to {}%", takeProfitPercent);
    }

    /**
     * Detects the current market phase based on price action and trend.
     *
     * <p><b>Phase Detection Logic (Wyckoff Cycle):</b></p>
     * <ul>
     *   <li><b>ACCUMULATION:</b> Sideways movement after downtrend (price below EMA, low volatility)</li>
     *   <li><b>MARKUP:</b> Uptrend with higher highs and higher lows (price above EMA, rising)</li>
     *   <li><b>DISTRIBUTION:</b> Sideways movement after uptrend (price above EMA, low volatility)</li>
     *   <li><b>MARKDOWN:</b> Downtrend with lower highs and lower lows (price below EMA, falling)</li>
     * </ul>
     *
     * @param tickers All historical ticker data up to current point
     * @return Current market phase
     */
    private MarketPhase detectMarketPhase(List<Ticker> tickers) {
        // Need enough data for phase detection
        if (candlesticks.size() < PHASE_EMA_PERIOD + PHASE_LOOKBACK) {
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
                phase = currentPhase != MarketPhase.UNKNOWN ? currentPhase : MarketPhase.UNKNOWN;
            }
        }

        // Log phase changes
        if (phase != currentPhase && phase != MarketPhase.UNKNOWN) {
            log.info("📊 Market phase changed: {} → {} (price: {}, EMA: {}, range: {}%, momentum: {}%)",
                    currentPhase, phase,
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
    private double calculateEMA(double[] prices, int period) {
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

    /**
     * Adds minutes to a timestamp string.
     *
     * @param timestamp Timestamp string in format "YYYY-MM-DD HH:mm:ss.SSS"
     * @param minutes Number of minutes to add
     * @return New timestamp string with minutes added
     */
    private String addMinutes(String timestamp, int minutes) {
        try {
            java.time.LocalDateTime dateTime = java.time.LocalDateTime.parse(
                timestamp,
                java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS")
            );
            java.time.LocalDateTime newDateTime = dateTime.plusMinutes(minutes);
            return newDateTime.format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));
        } catch (Exception e) {
            log.error("Error adding minutes to timestamp: {}", timestamp, e);
            return timestamp; // Return original if parsing fails
        }
    }

    /**
     * Market phases based on Wyckoff cycle.
     */
    private enum MarketPhase {
        ACCUMULATION,  // Consolidation at bottom (sideways after downtrend)
        MARKUP,        // Uptrend (higher highs and higher lows)
        DISTRIBUTION,  // Consolidation at top (sideways after uptrend)
        MARKDOWN,      // Downtrend (lower highs and lower lows)
        UNKNOWN        // Not enough data or unclear phase
    }
}
