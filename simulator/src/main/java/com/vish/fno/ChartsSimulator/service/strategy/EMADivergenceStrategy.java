package com.vish.fno.ChartsSimulator.service.strategy;

import com.vish.fno.ChartsSimulator.cache.TradeSimulationCache;
import com.vish.fno.ChartsSimulator.config.properties.BacktestProperties;
import com.vish.fno.ChartsSimulator.model.Signal;
import com.vish.fno.models.Ticker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * EMA Divergence trading strategy with trend reversal detection.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy uses two Exponential Moving Averages (EMA) - a larger period (slow) and
 * a smaller period (fast) - to detect potential trend reversals through divergence patterns.
 * When the fast EMA trends opposite to the slow EMA while the slow EMA maintains its trend,
 * it signals a potential reversal opportunity.
 *
 * <p><b>Signal Detection Logic:</b></p>
 * <ul>
 *   <li>Slow EMA: 50-period exponential moving average (longer-term trend)</li>
 *   <li>Fast EMA: 20-period exponential moving average (shorter-term momentum)</li>
 *   <li>Trend Detection: Compares current EMA vs EMA from N periods ago</li>
 *   <li>Divergence: Fast EMA trending opposite to Slow EMA direction</li>
 *   <li>Momentum Confirmation: Price movement in expected reversal direction</li>
 * </ul>
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
 *   <li><b>Long (Buy) Signal:</b>
 *     <ul>
 *       <li>Slow EMA is in uptrend (rising over lookback period)</li>
 *       <li>Fast EMA is in downtrend (falling over lookback period)</li>
 *       <li>Current price shows upward momentum (bullish price action)</li>
 *       <li>No open position exists</li>
 *     </ul>
 *   </li>
 *   <li><b>Short (Sell) Signal:</b>
 *     <ul>
 *       <li>Slow EMA is in downtrend (falling over lookback period)</li>
 *       <li>Fast EMA is in uptrend (rising over lookback period)</li>
 *       <li>Current price shows downward momentum (bearish price action)</li>
 *       <li>Open position exists</li>
 *     </ul>
 *   </li>
 * </ul>
 *
 * <p><b>Exit Rules:</b></p>
 * <ul>
 *   <li>Exit on opposite signal (fast/slow EMA divergence reverses)</li>
 *   <li>Or when stop loss level is hit (configurable, default 2%)</li>
 *   <li>Or when take profit level is hit (configurable, default 5%)</li>
 * </ul>
 *
 * <p><b>Parameters:</b></p>
 * <ul>
 *   <li>slowPeriod: 50 - Slow EMA period for long-term trend</li>
 *   <li>fastPeriod: 20 - Fast EMA period for short-term momentum</li>
 *   <li>trendLookback: 10 - Points to look back for trend direction</li>
 *   <li>momentumThreshold: 0.3% - Minimum price momentum for confirmation</li>
 *   <li>minSignalDistance: 50 - Minimum points between signals</li>
 * </ul>
 *
 * <p><b>Risk Management (Configurable via application.yml):</b></p>
 * <ul>
 *   <li>Stop Loss: Configurable % below entry price (default: 2%)</li>
 *   <li>Take Profit: Configurable % above entry price (default: 5%)</li>
 *   <li>Position Size: Configurable % of capital per trade (default: 15%)</li>
 *   <li>Max Positions: 1 (no pyramiding)</li>
 * </ul>
 *
 * <p><b>Strategy Characteristics:</b></p>
 * <ul>
 *   <li>Type: Trend reversal / Mean reversion hybrid</li>
 *   <li>Best For: Volatile markets with clear trend changes</li>
 *   <li>Signal Quality: High precision, lower frequency than pure momentum</li>
 *   <li>Holding Period: Short to medium term (minutes to hours)</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 * @version 1.0.0
 * @see Strategy
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EMADivergenceStrategy implements Strategy {

    private final BacktestProperties backtestProperties;

    // Runtime override fields (mutable for config overrides)
    private Double stopLossPercentOverride;
    private Double takeProfitPercentOverride;

    // Strategy parameters
    private static final int SLOW_EMA_PERIOD = 50;  // Larger EMA for long-term trend
    private static final int FAST_EMA_PERIOD = 20;  // Smaller EMA for short-term momentum
    private static final int TREND_LOOKBACK = 10;   // Points to look back for trend direction
    private static final double MOMENTUM_THRESHOLD = 0.3; // 0.3% minimum price momentum
    private static final int MIN_SIGNAL_DISTANCE = 50; // Minimum points between signals
    private static final int MIN_DATA_POINTS = 60;  // Need enough data for EMAs

    @Override
    public Optional<Signal> detectSignal(Ticker latestTick, String symbol, String date, TradeSimulationCache cache) {
        // Get historical data from cache (includes all tickers up to current moment)
        List<Ticker> tickers = cache.getHistoricalTickers(symbol, date);

        if (tickers == null || tickers.size() < MIN_DATA_POINTS) {
            log.debug("Insufficient data points for EMA divergence detection. Size: {}",
                    tickers == null ? 0 : tickers.size());
            return Optional.empty();
        }

        log.trace("EMADivergenceStrategy detecting signal for {} tickers (latest: {}, slow={}, fast={}, lookback={})",
                tickers.size(), latestTick.time(), SLOW_EMA_PERIOD, FAST_EMA_PERIOD, TREND_LOOKBACK);

        // Calculate EMAs for all points
        double[] slowEMA = calculateEMA(tickers, SLOW_EMA_PERIOD);
        double[] fastEMA = calculateEMA(tickers, FAST_EMA_PERIOD);

        // Check only the latest tick for signal
        int currentIndex = tickers.size() - 1;

        // Need enough data for EMAs and trend lookback
        int minIndex = Math.max(SLOW_EMA_PERIOD, FAST_EMA_PERIOD) + TREND_LOOKBACK;
        if (currentIndex < minIndex) {
            return Optional.empty();
        }

        Ticker currentTicker = tickers.get(currentIndex);
        double currentPrice = currentTicker.price();

        // Get current and historical EMA values
        double currentSlowEMA = slowEMA[currentIndex];
        double currentFastEMA = fastEMA[currentIndex];
        double previousSlowEMA = slowEMA[currentIndex - TREND_LOOKBACK];
        double previousFastEMA = fastEMA[currentIndex - TREND_LOOKBACK];

        // Determine EMA trends
        boolean slowEMAUptrend = currentSlowEMA > previousSlowEMA;
        boolean fastEMAUptrend = currentFastEMA > previousFastEMA;

        // Calculate price momentum (comparing to price a few points ago)
        int momentumLookback = Math.min(5, currentIndex);
        double previousPrice = tickers.get(currentIndex - momentumLookback).price();
        double priceMomentumPercent = ((currentPrice - previousPrice) / previousPrice) * 100;
        boolean bullishMomentum = priceMomentumPercent > MOMENTUM_THRESHOLD;
        boolean bearishMomentum = priceMomentumPercent < -MOMENTUM_THRESHOLD;

        // Detect divergence patterns
        // BUY signal: Slow EMA uptrend, Fast EMA downtrend, bullish price momentum
        boolean buySignal = slowEMAUptrend && !fastEMAUptrend && bullishMomentum;

        // SELL signal: Slow EMA downtrend, Fast EMA uptrend, bearish price momentum
        boolean sellSignal = !slowEMAUptrend && fastEMAUptrend && bearishMomentum;

        if (buySignal || sellSignal) {
            String type = buySignal ? "dip" : "peak";  // Use same nomenclature as MA strategy

            // Calculate magnitude based on EMA divergence
            double slowEMAChange = ((currentSlowEMA - previousSlowEMA) / previousSlowEMA) * 100;
            double fastEMAChange = ((currentFastEMA - previousFastEMA) / previousFastEMA) * 100;
            double magnitude = Math.abs(slowEMAChange - fastEMAChange);

            // Calculate signal expiry (1 minute after emission)
            String expiryTime = addMinutes(currentTicker.time(), 1);

            log.debug("EMA Divergence {} at time: {}, price: {}, slowEMA: {}/{} ({}), fastEMA: {}/{} ({}), momentum: {}%, expires: {}",
                    type, currentTicker.time(), currentPrice,
                    String.format("%.2f", previousSlowEMA), String.format("%.2f", currentSlowEMA),
                    slowEMAUptrend ? "UP" : "DOWN",
                    String.format("%.2f", previousFastEMA), String.format("%.2f", currentFastEMA),
                    fastEMAUptrend ? "UP" : "DOWN",
                    String.format("%.2f", priceMomentumPercent), expiryTime);

            return Optional.of(new Signal(
                    currentTicker.time(),  // Reversal point timestamp
                    currentTicker.time(),  // Immediate signal emission
                    expiryTime,            // Signal expiry time (1 minute)
                    currentPrice,
                    type,
                    magnitude
            ));
        }

        return Optional.empty();
    }

    /**
     * Calculates Exponential Moving Average for all data points.
     * EMA = (Price - Previous_EMA) * Multiplier + Previous_EMA
     * Multiplier = 2 / (Period + 1)
     *
     * @param tickers List of ticker data
     * @param period EMA period
     * @return Array of EMA values (same length as tickers)
     */
    private double[] calculateEMA(List<Ticker> tickers, int period) {
        double[] ema = new double[tickers.size()];
        double multiplier = 2.0 / (period + 1);

        // Initialize EMA with simple moving average for first period
        double sum = 0;
        for (int i = 0; i < period && i < tickers.size(); i++) {
            sum += tickers.get(i).price();
            ema[i] = sum / (i + 1);  // Progressive average for early values
        }

        if (tickers.size() > period) {
            ema[period - 1] = sum / period;  // True SMA for period

            // Calculate EMA for remaining points
            for (int i = period; i < tickers.size(); i++) {
                double price = tickers.get(i).price();
                ema[i] = (price - ema[i - 1]) * multiplier + ema[i - 1];
            }
        }

        return ema;
    }

    @Override
    public Map<String, Object> getParameters() {
        return Map.of(
                "slowPeriod", SLOW_EMA_PERIOD,
                "fastPeriod", FAST_EMA_PERIOD,
                "trendLookback", TREND_LOOKBACK,
                "momentumThreshold", MOMENTUM_THRESHOLD,
                "minSignalDistance", MIN_SIGNAL_DISTANCE
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
