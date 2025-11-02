package com.vish.fno.ChartsSimulator.service.strategy;

import com.vish.fno.ChartsSimulator.cache.TradeSimulationCache;
import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.models.Candlestick;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.models.Ticker;
import com.vish.fno.utils.CandleUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Low Wick Momentum Strategy - Trading strong buying pressure candles.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy identifies candles with minimal upper wick (less than 5%), which indicates
 * strong buying pressure with no rejection at higher prices. When buyers dominate and push
 * price near the high without sellers stepping in, it signals potential continuation.
 *
 * <p><b>⚠️ PHASE FILTERING:</b></p>
 * <p>Phase-based filtering (MARKDOWN, DISTRIBUTION, etc.) is now handled by BacktestEngine,
 * not by individual strategies. Configure phase filtering in application.yml:</p>
 * <pre>
 * app.backtest.phaseDetectionEnabled: true
 * app.backtest.allowedPhases: [MARKDOWN, DISTRIBUTION]
 * </pre>
 *
 * <p><b>Signal Detection Logic:</b></p>
 * <ol>
 *   <li>Convert tick data to 1-minute candlesticks (OHLC)</li>
 *   <li>When candle completes, calculate upper wick percentage</li>
 *   <li>Upper Wick % = ((High - Close) / Close) × 100</li>
 *   <li>If upper wick < 5%, generate buy signal (strong momentum)</li>
 *   <li>Entry at candle close price (last price of the minute)</li>
 * </ol>
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
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

    // Stateful caching (cleared on reset())
    private final List<Candlestick> candlesticks = new ArrayList<>();

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
        stopLossPercentOverride = null;
        takeProfitPercentOverride = null;
        log.debug("LowWickMomentumStrategy state reset");
    }

    @Override
    public Optional<Signal> detectSignal(Ticker latestTick, String symbol, String date, TradeSimulationCache cache) {
        // Get historical data from cache (includes all tickers up to current moment)
        List<Ticker> tickers = cache.getHistoricalTickers(symbol, date);

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
     * Phase filtering is now handled by BacktestEngine (if enabled in config).
     */
    private Optional<Signal> detectLowWickSignals(List<Ticker> tickers) {
        // Need at least 1 completed candle to check for signals
        if (candlesticks.isEmpty()) {
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

            log.info("[{}] 🎯 LOW WICK SIGNAL: Candle closed @ {}. Entry: {}, Stop: {} ({}%), Target: {} ({}%), R:R = 1:{}, bullish: {} with upperWick {}%, expires: {})",
                currentTick.time(),
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
            "phaseFiltering", "Configured in app.backtest.phaseDetectionEnabled and app.backtest.allowedPhases"
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
                entryPrice, String.format("%.2f", targetPrice), String.format("%.2f", targetPercent));
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
}
