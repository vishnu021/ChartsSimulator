package com.vish.fno.ChartsSimulator.service.analysis;

import com.vish.fno.ChartsSimulator.model.SignificantMove;
import com.vish.fno.ChartsSimulator.model.Ticker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Moving Average-based detection service for identifying significant price movements.
 *
 * This implementation uses a mean reversion algorithm that compares each price point
 * against moving averages of surrounding prices to detect sharp reversals (dips and peaks).
 * It includes confirmation logic to reduce false signals by requiring follow-through movement.
 *
 * <p><b>Algorithm: Moving Average Mean Reversion with Confirmation</b></p>
 * <ul>
 *   <li>Lookback Window: 2% of dataset size (minimum 3 points)</li>
 *   <li>Compares current price vs average of N points before and after</li>
 *   <li>Detects V-shaped (dip) and Λ-shaped (peak) patterns</li>
 *   <li>Configurable threshold for sensitivity (default 0.5%)</li>
 *   <li><b>NEW:</b> Confirmation window checks next 10 points for sustained movement</li>
 *   <li><b>NEW:</b> Minimum follow-through of 0.5% required to confirm signal</li>
 *   <li><b>NEW:</b> Minimum distance of 100 points between signals to reduce clustering</li>
 * </ul>
 *
 * <p><b>Signal Confirmation Logic:</b></p>
 * <p>After detecting a potential reversal, the algorithm verifies it by checking the next
 * 10 data points. For a dip (buy signal), at least 5 of the 10 points must show upward movement,
 * with a maximum gain of at least 0.5%. For a peak (sell signal), downward movement is required.
 * This dramatically reduces false signals from noise.</p>
 *
 * <p><b>Advantages:</b></p>
 * <ul>
 *   <li>Simple and computationally efficient</li>
 *   <li>Good for detecting sharp reversals in noisy data</li>
 *   <li>Threshold-based control over sensitivity</li>
 *   <li><b>NEW:</b> Significantly fewer false positives due to confirmation</li>
 *   <li><b>NEW:</b> Better quality signals with follow-through validation</li>
 *   <li><b>NEW:</b> Reduced signal clustering improves actionability</li>
 * </ul>
 *
 * <p><b>Limitations:</b></p>
 * <ul>
 *   <li>May miss gradual trend changes</li>
 *   <li>Fixed lookback window may not adapt to volatility changes</li>
 *   <li>Requires sufficient data on both sides (excludes edges)</li>
 *   <li>Sensitive to threshold selection</li>
 *   <li><b>NEW:</b> Confirmation delay means signals are slightly lagged</li>
 * </ul>
 *
 * @author ChartsSimulator
 * @since 1.0.0
 * @version 1.1.0 - Added confirmation logic to reduce false signals
 * @see com.vish.fno.ChartsSimulator.service.analysis package for alternative algorithms
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MovingAverageDetectionService {

    /** Default threshold percentage for detecting significant moves */
    private static final double DEFAULT_THRESHOLD = 0.5; // 0.5% change

    /** Minimum number of data points required for analysis */
    private static final int MIN_DATA_POINTS = 5;

    /** Lookback percentage: 2% of total data points */
    private static final double LOOKBACK_PERCENTAGE = 0.02;

    /** Minimum lookback window size */
    private static final int MIN_LOOKBACK = 3;

    /** Confirmation window: Points to check after reversal for follow-through */
    private static final int CONFIRMATION_WINDOW = 10;

    /** Minimum follow-through percentage to confirm signal */
    private static final double MIN_FOLLOW_THROUGH = 0.5; // 0.5% sustained movement

    /** Minimum distance between signals to avoid clustering */
    private static final int MIN_SIGNAL_DISTANCE = 100; // points

    /**
     * Detects significant price movements in ticker data.
     *
     * @param tickers List of ticker data points
     * @param threshold Percentage threshold for significance (e.g., 0.5 for 0.5%)
     * @return List of detected significant moves (dips and peaks)
     */
    public List<SignificantMove> detectSignificantMoves(List<Ticker> tickers, double threshold) {
        if (tickers == null || tickers.size() <= MIN_DATA_POINTS) {
            log.debug("Insufficient data points for significant move detection. Size: {}",
                     tickers == null ? 0 : tickers.size());
            return List.of();
        }

        List<SignificantMove> significantMoves = new ArrayList<>();

        // Calculate lookback window: 2% of data points, minimum 3
        int lookbackWindow = Math.max(MIN_LOOKBACK, (int) Math.floor(tickers.size() * LOOKBACK_PERCENTAGE));

        log.debug("Detecting significant moves with threshold: {}%, lookback window: {}, data points: {}, " +
                 "confirmation window: {}, min follow-through: {}%",
                 threshold, lookbackWindow, tickers.size(), CONFIRMATION_WINDOW, MIN_FOLLOW_THROUGH);

        int lastSignalIndex = -MIN_SIGNAL_DISTANCE; // Track last signal to avoid clustering

        // Iterate through ticker data, excluding edges where we can't calculate averages and confirmation
        for (int i = lookbackWindow; i < tickers.size() - lookbackWindow - CONFIRMATION_WINDOW; i++) {
            // Skip if too close to last signal (reduce clustering)
            if (i - lastSignalIndex < MIN_SIGNAL_DISTANCE) {
                continue;
            }

            Ticker currentTicker = tickers.get(i);
            double currentPrice = currentTicker.price();

            // Calculate average price before current point
            double prevAvg = calculateAveragePrice(tickers, i - lookbackWindow, i);

            // Calculate average price after current point
            double nextAvg = calculateAveragePrice(tickers, i + 1, i + lookbackWindow + 1);

            // Calculate percentage changes
            double changeFromPrev = ((currentPrice - prevAvg) / prevAvg) * 100;
            double changeToNext = ((nextAvg - currentPrice) / currentPrice) * 100;

            // Detect potential dip: price drops significantly then recovers
            boolean potentialDip = changeFromPrev < -threshold && changeToNext > threshold;

            // Detect potential peak: price spikes significantly then drops
            boolean potentialPeak = changeFromPrev > threshold && changeToNext < -threshold;

            if (potentialDip || potentialPeak) {
                // Confirm the signal by checking for sustained follow-through
                boolean confirmed = confirmSignal(tickers, i, potentialDip);

                if (confirmed) {
                    double magnitude = Math.max(Math.abs(changeFromPrev), Math.abs(changeToNext));
                    String type = potentialDip ? "dip" : "peak";

                    // Calculate emission time: after confirmation window is checked
                    // The signal is emitted after validating the next CONFIRMATION_WINDOW points
                    int emissionIndex = Math.min(i + CONFIRMATION_WINDOW, tickers.size() - 1);
                    String emissionTime = tickers.get(emissionIndex).time();

                    significantMoves.add(new SignificantMove(
                            currentTicker.time(),  // Reversal point timestamp
                            emissionTime,          // When signal was actually emitted
                            currentPrice,
                            type,
                            magnitude
                    ));

                    lastSignalIndex = i; // Update last signal position

                    log.debug("Confirmed {} at reversal time: {}, emission time: {}, price: {}, magnitude: {}%",
                             type, currentTicker.time(), emissionTime, currentPrice, String.format("%.2f", magnitude));
                }
            }
        }

        log.info("Detected {} significant moves (threshold: {}%): {} dips, {} peaks",
                significantMoves.size(),
                threshold,
                significantMoves.stream().filter(m -> "dip".equals(m.type())).count(),
                significantMoves.stream().filter(m -> "peak".equals(m.type())).count());

        return significantMoves;
    }

    /**
     * Detects significant price movements using default threshold.
     *
     * @param tickers List of ticker data points
     * @return List of detected significant moves
     */
    public List<SignificantMove> detectSignificantMoves(List<Ticker> tickers) {
        return detectSignificantMoves(tickers, DEFAULT_THRESHOLD);
    }

    /**
     * Confirms a potential signal by checking for sustained follow-through movement.
     * This reduces false signals by requiring price to continue moving in the reversal direction.
     *
     * @param tickers List of all tickers
     * @param signalIndex Index where potential signal occurred
     * @param isDip True if checking dip confirmation, false for peak
     * @return True if signal is confirmed by follow-through movement
     */
    private boolean confirmSignal(List<Ticker> tickers, int signalIndex, boolean isDip) {
        double signalPrice = tickers.get(signalIndex).price();

        // Check next CONFIRMATION_WINDOW points for sustained movement
        int confirmationCount = 0;
        double maxMoveInDirection = 0;

        for (int i = signalIndex + 1; i < signalIndex + 1 + CONFIRMATION_WINDOW && i < tickers.size(); i++) {
            double currentPrice = tickers.get(i).price();
            double movePercent = ((currentPrice - signalPrice) / signalPrice) * 100;

            if (isDip) {
                // For dip (buy signal), we want upward movement
                if (movePercent > 0) {
                    confirmationCount++;
                    maxMoveInDirection = Math.max(maxMoveInDirection, movePercent);
                }
            } else {
                // For peak (sell signal), we want downward movement
                if (movePercent < 0) {
                    confirmationCount++;
                    maxMoveInDirection = Math.max(maxMoveInDirection, Math.abs(movePercent));
                }
            }
        }

        // Require majority of confirmation points to move in expected direction
        // AND maximum move must exceed minimum follow-through threshold
        boolean majorityConfirmed = confirmationCount >= (CONFIRMATION_WINDOW / 2);
        boolean sufficientMovement = maxMoveInDirection >= MIN_FOLLOW_THROUGH;

        log.trace("Signal confirmation at index {}: majority={}, movement={}%, confirmed={}",
                 signalIndex, majorityConfirmed, String.format("%.2f", maxMoveInDirection),
                 majorityConfirmed && sufficientMovement);

        return majorityConfirmed && sufficientMovement;
    }

    /**
     * Calculates average price for a range of tickers.
     *
     * @param tickers List of all tickers
     * @param startIndex Start index (inclusive)
     * @param endIndex End index (exclusive)
     * @return Average price for the range
     */
    private double calculateAveragePrice(List<Ticker> tickers, int startIndex, int endIndex) {
        double sum = 0.0;
        int count = 0;

        for (int i = startIndex; i < endIndex; i++) {
            sum += tickers.get(i).price();
            count++;
        }

        return count > 0 ? sum / count : 0.0;
    }
}
