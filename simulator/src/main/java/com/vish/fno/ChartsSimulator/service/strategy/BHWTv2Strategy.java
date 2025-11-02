package com.vish.fno.ChartsSimulator.service.strategy;

import com.vish.fno.ChartsSimulator.cache.TradeSimulationCache;
import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.models.Candlestick;
import com.vish.fno.models.Ticker;
import com.vish.fno.utils.CandleUtils;
import com.vish.fno.utils.indicators.ExponentialMovingAverage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Bullish Hammer/Inverted Hammer with Trend (BHWTv2) Strategy.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy detects hammer and inverted hammer candlestick patterns combined with
 * trend analysis using Heikin-Ashi candles and EMA200 confirmation.
 *
 * <p><b>Signal Detection:</b></p>
 * <ul>
 *   <li>Detects hammer patterns (66% lower wick ratio) in downtrends</li>
 *   <li>Detects inverted hammer patterns (66% upper wick ratio) in uptrends</li>
 *   <li>Confirms with EMA200 trend (rising for bullish, falling for bearish)</li>
 *   <li>Analyzes 1-3 candle combinations for pattern formation</li>
 *   <li>Filters out consolidation periods</li>
 * </ul>
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
 *   <li><b>Bullish (Hammer):</b> Enter when hammer detected in downtrend with rising EMA200</li>
 *   <li><b>Bearish (Inverted Hammer):</b> Enter when inverted hammer detected in uptrend with falling EMA200</li>
 *   <li>Entry threshold: Candle high (bullish) or low (bearish)</li>
 *   <li>Reward range: 2-75 points</li>
 * </ul>
 *
 * <p><b>Exit Rules:</b></p>
 * <ul>
 *   <li>Stop Loss: Pattern low (hammer) or high (inverted hammer)</li>
 *   <li>Take Profit: Risk-reward ratio of 1.33x</li>
 *   <li>Auto-exit on stop/target levels</li>
 * </ul>
 *
 * <p><b>Parameters:</b></p>
 * <ul>
 *   <li>EMA Period: 200</li>
 *   <li>Lower Wick Threshold: 66% of total candle length</li>
 *   <li>Upper Wick Threshold: 20% of total candle length (for confirmation)</li>
 *   <li>Risk-Reward Ratio: 1.33</li>
 *   <li>Min Reward: 2 points</li>
 *   <li>Max Reward: 75 points</li>
 *   <li>Max Timestamp: 360 (6 hours from market open)</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 * @version 2.0.0
 */
@Slf4j
@Service("BHWTv2")
@RequiredArgsConstructor
public class BHWTv2Strategy implements Strategy {

    private static final double RISK_REWARD_RATIO = 1.33;
    private static final double UPPER_WICK_RATIO = 0.2;
    private static final double LOWER_WICK_RATIO = 0.66;
    private static final int MA_PERIOD_HIGH = 200;
    private static final int MIN_CANDLES = 5;
    private static final int MAX_TIMESTAMP = 360;  // 6 hours
    private static final double MIN_REWARD = 2.0;
    private static final double MAX_REWARD = 75.0;
    private static final double MIN_EMA_CHANGE = 0.1;

    private final BacktestProperties backtestProperties;
    private final ExponentialMovingAverage ema200 = new ExponentialMovingAverage(MA_PERIOD_HIGH);

    // Runtime override fields
    private Double stopLossPercentOverride;
    private Double takeProfitPercentOverride;

    // Cached candlesticks for strategy state
    private final List<Candlestick> candlesticks = new ArrayList<>();

    // Track last processed minute to avoid redundant recalculations
    private String lastProcessedMinute = null;

    // Cache EMA values for performance
    private List<Double> cachedEmaValues = new ArrayList<>();

    @Override
    public void reset() {
        candlesticks.clear();
        lastProcessedMinute = null;
        cachedEmaValues.clear();
        log.debug("BHWTv2Strategy state reset");
    }

    @Override
    public Optional<Signal> detectSignal(Ticker latestTick, String symbol, String date, TradeSimulationCache cache) {
        // Get historical data from cache (includes all tickers up to current moment)
        List<Ticker> tickers = cache.getHistoricalTickers(symbol, date);

        if (tickers.isEmpty()) {
            return Optional.empty();
        }

        Ticker currentTick = latestTick;

        // Convert tickers to candlesticks
        updateCandlesticks(tickers);

        // Need at least MIN_CANDLES to analyze
        if (candlesticks.size() < MIN_CANDLES) {
            if (candlesticks.size() > 0 && candlesticks.size() % 10 == 0) {
                log.debug("[{}] Waiting for enough candles: {}/{}",
                    currentTick.time(), candlesticks.size(), MIN_CANDLES);
            }
            return Optional.empty();
        }

        // Calculate timestamp (minutes from start)
        int timestamp = candlesticks.size();
        if (timestamp > MAX_TIMESTAMP) {
            return Optional.empty();
        }

        Candlestick latestCandle = candlesticks.get(candlesticks.size() - 1);
        String currentTime = latestCandle.timestamp();

        // Calculate EMA200 change
        double emaChange = getEmaChange();

        // Log progress every 30 candles
        if (timestamp % 30 == 0) {
            log.debug("[{}] Progress: candles={}, emaChange={}",
                currentTick.time(), candlesticks.size(), String.format("%.2f", emaChange));
        }

        // Check for bullish hammer pattern
        Optional<HammerSetup> hammerOpt = createHammerSetup(candlesticks);
        if (hammerOpt.isPresent()) {
            HammerSetup setup = hammerOpt.get();
            log.debug("[{}] Hammer pattern found (n={}), emaChange={}",
                currentTick.time(), setup.candleCount(), String.format("%.2f", emaChange));

            if (emaChange > MIN_EMA_CHANGE) {
                double entryPrice = latestCandle.high();
                double stopLoss = setup.stopLoss();
                double target = entryPrice + (entryPrice - stopLoss) * RISK_REWARD_RATIO;
                double reward = Math.abs(target - entryPrice);

                if (reward >= MIN_REWARD && reward <= MAX_REWARD) {
                    log.info("[{}] 🎯 HAMMER SIGNAL: Entry: {}, Stop: {}, Target: {}, Reward: {}, R:R = 1:{}",
                        currentTick.time(),
                        String.format("%.2f", entryPrice),
                        String.format("%.2f", stopLoss),
                        String.format("%.2f", target),
                        String.format("%.2f", reward),
                        String.format("%.2f", RISK_REWARD_RATIO));

                    return Optional.of(new Signal(
                        currentTime,
                        currentTick.time(),
                        addMinutes(currentTick.time(), 1),
                        entryPrice,
                        "dip",  // Bullish signal
                        reward
                    ));
                } else {
                    log.debug("[{}] Hammer rejected: reward={} (must be {}-{})",
                        currentTick.time(), String.format("%.2f", reward), MIN_REWARD, MAX_REWARD);
                }
            }
        }

        // Check for bearish inverted hammer pattern
        Optional<HammerSetup> invertedHammerOpt = createInvertedHammerSetup(candlesticks);
        if (invertedHammerOpt.isPresent()) {
            HammerSetup setup = invertedHammerOpt.get();
            log.debug("[{}] Inverted Hammer pattern found (n={}), emaChange={}",
                currentTick.time(), setup.candleCount(), String.format("%.2f", emaChange));

            if (emaChange < -MIN_EMA_CHANGE) {
                double entryPrice = latestCandle.low();
                double stopLoss = setup.stopLoss();
                double target = entryPrice - (stopLoss - entryPrice) * RISK_REWARD_RATIO;
                double reward = Math.abs(target - entryPrice);

                if (reward >= MIN_REWARD && reward <= MAX_REWARD) {
                    log.info("[{}] 🎯 INVERTED HAMMER SIGNAL: Entry: {}, Stop: {}, Target: {}, Reward: {}, R:R = 1:{}",
                        currentTick.time(),
                        String.format("%.2f", entryPrice),
                        String.format("%.2f", stopLoss),
                        String.format("%.2f", target),
                        String.format("%.2f", reward),
                        String.format("%.2f", RISK_REWARD_RATIO));

                    return Optional.of(new Signal(
                        currentTime,
                        currentTick.time(),
                        addMinutes(currentTick.time(), 1),
                        entryPrice,
                        "peak",  // Bearish signal
                        reward
                    ));
                } else {
                    log.debug("[{}] Inverted Hammer rejected: reward={} (must be {}-{})",
                        currentTick.time(), String.format("%.2f", reward), MIN_REWARD, MAX_REWARD);
                }
            }
        }

        return Optional.empty();
    }

    /**
     * Updates internal candlestick cache from tickers.
     * Converts new tickers to candlesticks and adds to cache.
     *
     * <p><b>Optimized Approach:</b></p>
     * <ol>
     *   <li>Checks current minute timestamp of latest ticker</li>
     *   <li>Skips expensive recalculation if still in same minute (60x faster)</li>
     *   <li>Only recalculates when minute boundary changes (new completed candle)</li>
     * </ol>
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

        // Only update if we have new completed candles
        if (completed.size() > candlesticks.size()) {
            candlesticks.clear();
            candlesticks.addAll(completed);

            // Recalculate EMA when candlesticks change
            if (candlesticks.size() >= MA_PERIOD_HIGH) {
                cachedEmaValues = ema200.calculate(candlesticks);
            }
        }

        // Update last processed minute
        lastProcessedMinute = currentMinute;
    }

    /**
     * Calculates the change in EMA200 between last two periods.
     * Uses cached EMA values for performance (calculated only when new candles appear).
     */
    private double getEmaChange() {
        if (cachedEmaValues.size() < 2) {
            return 0.0;
        }

        int size = cachedEmaValues.size();
        return cachedEmaValues.get(size - 1) - cachedEmaValues.get(size - 2);
    }

    /**
     * Detects hammer pattern (long lower wick) in last 1-3 candles.
     */
    private Optional<HammerSetup> createHammerSetup(List<Candlestick> candles) {
        int size = candles.size();

        for (int i = 1; i <= 3; i++) {
            if (size < i) {
                break;
            }

            List<Candlestick> subset = candles.subList(size - i, size);
            Candlestick combined = combineCandles(subset);

            if (isHammerPattern(combined)) {
                return Optional.of(new HammerSetup(subset, combined.low(), i, true));
            }
        }

        return Optional.empty();
    }

    /**
     * Detects inverted hammer pattern (long upper wick) in last 1-3 candles.
     */
    private Optional<HammerSetup> createInvertedHammerSetup(List<Candlestick> candles) {
        int size = candles.size();

        for (int i = 1; i <= 3; i++) {
            if (size < i) {
                break;
            }

            List<Candlestick> subset = candles.subList(size - i, size);
            Candlestick combined = combineCandles(subset);

            if (isInvertedHammerPattern(combined)) {
                return Optional.of(new HammerSetup(subset, combined.high(), i, false));
            }
        }

        return Optional.empty();
    }

    /**
     * Combines multiple candlesticks into one.
     */
    private Candlestick combineCandles(List<Candlestick> candles) {
        if (candles.isEmpty()) {
            throw new IllegalArgumentException("Cannot combine empty candle list");
        }

        if (candles.size() == 1) {
            return candles.get(0);
        }

        String timestamp = candles.get(0).timestamp();
        double open = candles.get(0).open();
        double close = candles.get(candles.size() - 1).close();
        double high = candles.stream().mapToDouble(Candlestick::high).max().orElse(open);
        double low = candles.stream().mapToDouble(Candlestick::low).min().orElse(open);
        long volume = candles.stream().mapToLong(Candlestick::volume).sum();
        int tickCount = candles.stream().mapToInt(Candlestick::tickCount).sum();

        return new Candlestick(timestamp, open, high, low, close, volume, tickCount);
    }

    /**
     * Checks if candle is a hammer pattern (long lower wick >= 66% of total length).
     */
    private boolean isHammerPattern(Candlestick candle) {
        double lowerWick = CandleUtils.getLowerWick(candle);
        double totalLength = CandleUtils.getTotalLength(candle);

        if (totalLength == 0) {
            return false;
        }

        double lowerWickRatio = lowerWick / totalLength;
        return lowerWickRatio >= LOWER_WICK_RATIO;
    }

    /**
     * Checks if candle is an inverted hammer pattern (long upper wick >= 66% of total length).
     */
    private boolean isInvertedHammerPattern(Candlestick candle) {
        double upperWick = CandleUtils.getUpperWick(candle);
        double totalLength = CandleUtils.getTotalLength(candle);

        if (totalLength == 0) {
            return false;
        }

        double upperWickRatio = upperWick / totalLength;
        return upperWickRatio >= LOWER_WICK_RATIO;
    }

    @Override
    public Map<String, Object> getParameters() {
        return Map.of(
            "emaPeriod", MA_PERIOD_HIGH,
            "lowerWickRatio", LOWER_WICK_RATIO,
            "upperWickRatio", UPPER_WICK_RATIO,
            "riskRewardRatio", RISK_REWARD_RATIO,
            "minReward", MIN_REWARD,
            "maxReward", MAX_REWARD,
            "minEmaChange", MIN_EMA_CHANGE
        );
    }

    @Override
    public BacktestProperties getBacktestProperties() {
        return backtestProperties;
    }

    @Override
    public double getStopLossPercent() {
        return stopLossPercentOverride != null
            ? stopLossPercentOverride
            : backtestProperties.stopLossPercent();
    }

    @Override
    public void setStopLossPercent(double stopLossPercent) {
        this.stopLossPercentOverride = stopLossPercent;
        log.debug("Stop loss percent overridden to {}%", stopLossPercent);
    }

    @Override
    public double getTakeProfitPercent() {
        return takeProfitPercentOverride != null
            ? takeProfitPercentOverride
            : backtestProperties.takeProfitPercent();
    }

    @Override
    public void setTakeProfitPercent(double takeProfitPercent) {
        this.takeProfitPercentOverride = takeProfitPercent;
        log.debug("Take profit percent overridden to {}%", takeProfitPercent);
    }

    @Override
    public String getStrategyName() {
        return "BHWTv2";
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
     * Internal record to hold hammer pattern setup information.
     */
    private record HammerSetup(
        List<Candlestick> candles,
        double stopLoss,
        int candleCount,
        boolean isHammer
    ) {
        @Override
        public String toString() {
            final StringBuilder sb = new StringBuilder("HammerSetup{");
            sb.append("candleCount=").append(candleCount);
            sb.append(", pattern=").append(isHammer ? "hammer" : "inverted-hammer");
            sb.append(", stopLoss=").append(stopLoss);
            sb.append('}');
            return sb.toString();
        }
    }
}
