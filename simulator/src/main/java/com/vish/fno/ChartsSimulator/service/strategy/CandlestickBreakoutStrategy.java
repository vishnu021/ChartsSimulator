package com.vish.fno.ChartsSimulator.service.strategy;

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
import java.util.Optional;

/**
 * Candlestick breakout strategy based on minima breakdown and reversal patterns.
 *
 * <p><b>Algorithm Description:</b></p>
 * This strategy identifies support level breakdowns followed by reversals (failed breakdowns/bear traps).
 * It converts tick data into 1-minute candlesticks, detects local minimas, and triggers trades when
 * price breaks below a minima and then reverses back above it.
 *
 * <p><b>Signal Detection Logic:</b></p>
 * <ol>
 *   <li>Convert tick data to 1-minute candlesticks (OHLC)</li>
 *   <li>Detect local minimas: candle's low lower than N candles before/after</li>
 *   <li>Track breakdown: price breaks below a previous minima</li>
 *   <li>Detect reversal: price crosses back above the broken minima</li>
 *   <li>Generate buy signal on reversal confirmation</li>
 * </ol>
 *
 * <p><b>Entry Rules:</b></p>
 * <ul>
 *   <li>Price breaks below a confirmed minima (support breakdown)</li>
 *   <li>Price creates a new lower low (recent minima)</li>
 *   <li>Price reverses and crosses back above the broken minima</li>
 *   <li>Entry on close above broken minima level</li>
 * </ul>
 *
 * <p><b>Exit Rules:</b></p>
 * <ul>
 *   <li><b>Stop Loss:</b> Recent minima (the low created during breakdown)</li>
 *   <li><b>Take Profit:</b> Entry + 50% of (High between the two minimas - Entry)</li>
 *   <li>Example: Entry at 100, High between minimas = 110, Target = 100 + 50% × (110 - 100) = 105</li>
 * </ul>
 *
 * <p><b>Parameters:</b></p>
 * <ul>
 *   <li>minimaLookback: 3 - Number of candles before/after for minima confirmation</li>
 *   <li>minBreakdownPercent: 0.1% - Minimum breakdown distance to be significant</li>
 *   <li>targetPercentOfRange: 50% - Take profit as % of range between minimas</li>
 * </ul>
 *
 * <p><b>Pattern Example:</b></p>
 * <pre>
 * Time:     9:20  9:21  9:22  9:23  9:24  9:25  9:26  9:27
 * Price:    100   102   99    101   97    98    101   103
 * Minima:         M1                M2
 * Pattern:  Support at 99 → Breaks to 97 → Reverses to 101 → BUY SIGNAL
 * Stop:     97 (recent minima)
 * Target:   99 + 50% × (102 - 99) = 100.5
 * </pre>
 *
 * <p><b>Strategy Characteristics:</b></p>
 * <ul>
 *   <li>Type: Reversal / False breakdown</li>
 *   <li>Best For: Markets with strong support levels and quick reversals</li>
 *   <li>Signal Quality: High precision (requires confirmed reversal)</li>
 *   <li>Holding Period: Short to medium term (minutes to hours)</li>
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
public class CandlestickBreakoutStrategy implements Strategy {

    private final BacktestProperties backtestProperties;

    // Strategy parameters
    private static final int MINIMA_LOOKBACK = 3;  // Candles before/after for minima confirmation
    private static final double MIN_BREAKDOWN_PERCENT = 0.1;  // 0.1% minimum breakdown
    private static final double TARGET_PERCENT_OF_RANGE = 50.0;  // 50% of range for target

    // Stateful caching (cleared on reset())
    private final List<Candlestick> candlesticks = new ArrayList<>();
    private final List<MinimaPoint> minimas = new ArrayList<>();
    private BreakdownState breakdownState = null;

    // Runtime override fields
    private Double stopLossPercentOverride;
    private Double takeProfitPercentOverride;

    /**
     * Internal record to track minima points.
     */
    private record MinimaPoint(int candleIndex, double price, String timestamp) {}

    /**
     * Internal record to track active breakdown state.
     */
    private record BreakdownState(
        MinimaPoint brokenMinima,
        double lowestAfterBreak,
        double highestBetweenMinimas,
        String breakStartTime,
        boolean signalGenerated,  // Prevents duplicate signals for same breakdown
        double entryPrice  // Actual entry price when signal is generated (0 if not generated yet)
    ) {}

    @Override
    public void reset() {
        candlesticks.clear();
        minimas.clear();
        breakdownState = null;
        stopLossPercentOverride = null;
        takeProfitPercentOverride = null;
        log.debug("CandlestickBreakoutStrategy state reset");
    }

    @Override
    public Optional<Signal> detectSignal(List<Ticker> tickers) {
        if (tickers == null || tickers.isEmpty()) {
            return Optional.empty();
        }

        // Process only new tickers to build candlesticks incrementally
        updateCandlesticks(tickers);

        // Update minimas based on confirmed candlesticks
        updateMinimas();

        // Detect breakdown-reversal patterns
        List<Signal> signals = detectBreakoutSignals(tickers);
        return signals.isEmpty() ? Optional.empty() : Optional.of(signals.get(0));
    }

    /**
     * Builds 1-minute candlesticks from tick data using map-based grouping.
     *
     * <p><b>Approach:</b></p>
     * <ol>
     *   <li>Groups all tickers by minute using streams</li>
     *   <li>Builds complete OHLC candlesticks from grouped tickers</li>
     *   <li>Replaces candlesticks list with newly built completed candles</li>
     *   <li>Excludes current/partial minute (last candle is always incomplete)</li>
     * </ol>
     */
    private void updateCandlesticks(List<Ticker> tickers) {
        if (tickers.isEmpty()) {
            return;
        }

        // Get completed candlesticks from tickers (excludes incomplete last minute)
        List<Candlestick> completed = CandleUtils.getCompletedCandlesticksFromTickers(tickers);

        // Replace entire list with new candlesticks
        candlesticks.clear();
        candlesticks.addAll(completed);
    }

    /**
     * Detects local minimas in candlestick data.
     * A candle's low is a minima if it's lower than MINIMA_LOOKBACK candles before and after it.
     */
    private void updateMinimas() {
        if (candlesticks.size() < 2 * MINIMA_LOOKBACK + 1) {
            return; // Need enough candles for confirmation
        }

        // Only check for new minimas in the confirmed range (not including current forming candle)
        int startIndex = Math.max(MINIMA_LOOKBACK, minimas.isEmpty() ? 0 : minimas.get(minimas.size() - 1).candleIndex() + 1);
        int endIndex = candlesticks.size() - MINIMA_LOOKBACK;  // Need future candles for confirmation

        for (int i = startIndex; i < endIndex; i++) {
            if (isMinima(i)) {
                Candlestick candle = candlesticks.get(i);
                MinimaPoint minima = new MinimaPoint(i, candle.low(), candle.timestamp());
                minimas.add(minima);
                log.debug("New minima detected at index {}: price={}, time={}", i, String.format("%.2f", minima.price()), minima.timestamp());
            }
        }
    }

    /**
     * Checks if candle at index is a local minima.
     */
    private boolean isMinima(int index) {
        if (index < MINIMA_LOOKBACK || index >= candlesticks.size() - MINIMA_LOOKBACK) {
            return false; // Not enough surrounding candles
        }

        double low = candlesticks.get(index).low();

        // Check if this low is lower than surrounding candles
        for (int offset = -MINIMA_LOOKBACK; offset <= MINIMA_LOOKBACK; offset++) {
            if (offset == 0) continue;
            if (candlesticks.get(index + offset).low() <= low) {
                return false; // Found a lower or equal low nearby
            }
        }

        return true;
    }

    /**
     * Detects breakdown-reversal patterns and generates signals.
     */
    private List<Signal> detectBreakoutSignals(List<Ticker> tickers) {
        if (minimas.size() < 2) {
            return List.of(); // Need at least 2 minimas to detect pattern
        }

        Ticker currentTick = tickers.get(tickers.size() - 1);
        double currentPrice = currentTick.price();
        List<Signal> signals = new ArrayList<>();

        // Check if we're in a breakdown state
        if (breakdownState == null) {
            // Look for new breakdown: price breaks below any previous minima
            checkForBreakdown(currentPrice, currentTick.time());
        } else {
            // We're in breakdown state - check for reversal
            if (!breakdownState.signalGenerated) {
                Signal signal = checkForReversal(currentPrice, currentTick);
                if (signal != null) {
                    signals.add(signal);
                    // Mark signal as generated and store entry price for stop/target calculation
                    breakdownState = new BreakdownState(
                        breakdownState.brokenMinima,
                        breakdownState.lowestAfterBreak,
                        breakdownState.highestBetweenMinimas,
                        breakdownState.breakStartTime,
                        true,  // Signal generated
                        currentPrice  // Store entry price
                    );
                }
            }

            // Update lowest point during breakdown (even after signal)
            if (currentPrice < breakdownState.lowestAfterBreak) {
                breakdownState = new BreakdownState(
                    breakdownState.brokenMinima,
                    currentPrice,
                    breakdownState.highestBetweenMinimas,
                    breakdownState.breakStartTime,
                    breakdownState.signalGenerated,
                    breakdownState.entryPrice
                );
            }
        }

        return signals;
    }

    /**
     * Checks if current price breaks below any previous minima.
     */
    private void checkForBreakdown(double currentPrice, String timestamp) {
        // Iterate through minimas (except the most recent) to find breakdowns
        for (int i = 0; i < minimas.size() - 1; i++) {
            MinimaPoint olderMinima = minimas.get(i);
            double breakdownLevel = olderMinima.price();
            double breakdownPercent = ((breakdownLevel - currentPrice) / breakdownLevel) * 100.0;

            if (currentPrice < breakdownLevel && breakdownPercent >= MIN_BREAKDOWN_PERCENT) {
                // Price broke below this minima - calculate high between this and next minima
                MinimaPoint nextMinima = minimas.get(i + 1);
                double highBetween = findHighestBetweenMinimas(olderMinima.candleIndex(), nextMinima.candleIndex());

                breakdownState = new BreakdownState(olderMinima, currentPrice, highBetween, timestamp, false, 0.0);

                log.debug("[{}] Breakdown detected: price {} broke below minima {} ({}% down), highest between: {}",
                    timestamp, currentPrice, breakdownLevel,
                    String.format("%.2f", breakdownPercent), highBetween);
                break; // Only track one breakdown at a time
            }
        }
    }

    /**
     * Checks if current price reverses back above the broken minima (reversal signal).
     */
    private Signal checkForReversal(double currentPrice, Ticker tick) {
        double brokenLevel = breakdownState.brokenMinima.price();

        if (currentPrice > brokenLevel) {
            // Reversal confirmed! Generate buy signal
            // Entry is at current price (realistic - we enter when reversal is confirmed)
            double entryPrice = currentPrice;
            double stopLoss = breakdownState.lowestAfterBreak;

            // Target: Entry + 50% of range from entry to highest point between minimas
            double targetRange = breakdownState.highestBetweenMinimas - entryPrice;
            double target = entryPrice + (targetRange * TARGET_PERCENT_OF_RANGE / 100.0);

            // Calculate signal expiry (1 minute after emission)
            String expiryTime = addMinutes(tick.time(), 1);

            log.info("[{}] 🎯 REVERSAL SIGNAL: price {} crossed back above broken minima {}. Entry: {}, Stop: {}, Target: {} ({}% of range {}), expires: {}",
                tick.time(), currentPrice, brokenLevel, entryPrice, stopLoss, target,
                TARGET_PERCENT_OF_RANGE, String.format("%.2f", targetRange), expiryTime);

            // Store entry price and stop/target for later use
            // Signal price = entry price (current price at reversal confirmation)
            return new Signal(
                tick.time(),  // Reversal point
                tick.time(),  // Signal emission time
                expiryTime,   // Signal expiry time (1 minute)
                entryPrice,   // Entry at current price (confirmed reversal)
                "dip",        // Buy signal
                targetRange   // Store range for debugging
            );
        }

        return null; // No reversal yet
    }

    /**
     * Finds the highest price between two minimas.
     */
    private double findHighestBetweenMinimas(int startIndex, int endIndex) {
        double highest = Double.MIN_VALUE;
        for (int i = startIndex; i <= endIndex && i < candlesticks.size(); i++) {
            highest = Math.max(highest, candlesticks.get(i).high());
        }
        return highest;
    }

    @Override
    public Map<String, Object> getParameters() {
        return Map.of(
            "minimaLookback", MINIMA_LOOKBACK,
            "minBreakdownPercent", MIN_BREAKDOWN_PERCENT,
            "targetPercentOfRange", TARGET_PERCENT_OF_RANGE
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

        // Calculate stop loss based on breakdown state if available and signal generated
        if (breakdownState != null && breakdownState.signalGenerated && breakdownState.entryPrice > 0) {
            // Stop is at the recent minima (lowest after break)
            // Calculate as percentage from actual entry price
            double entryPrice = breakdownState.entryPrice;
            double stopPrice = breakdownState.lowestAfterBreak;
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

        // Calculate target based on breakdown state if available and signal generated
        if (breakdownState != null && breakdownState.signalGenerated && breakdownState.entryPrice > 0) {
            double entryPrice = breakdownState.entryPrice;
            double targetRange = breakdownState.highestBetweenMinimas - entryPrice;
            double targetPrice = entryPrice + (targetRange * TARGET_PERCENT_OF_RANGE / 100.0);
            double targetPercent = ((targetPrice - entryPrice) / entryPrice) * 100.0;

            log.debug("Dynamic take profit: entry={}, high={}, range={}, target={}, percent={}%",
                entryPrice, breakdownState.highestBetweenMinimas,
                String.format("%.2f", targetRange), String.format("%.2f", targetPrice),
                String.format("%.2f", targetPercent));
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
