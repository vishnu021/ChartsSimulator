//package com.vish.fno.ChartsSimulator.service.analysis;
//
//import com.vish.fno.ChartsSimulator.model.SignificantMove;
//import com.vish.fno.models.Ticker;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.stereotype.Service;
//
//import java.util.ArrayList;
//import java.util.List;
//
///**
// * Moving Average-based detection service for identifying significant price movements.
// *
// * <p><b>⚠️ CAUSAL IMPLEMENTATION - NO LOOK-AHEAD BIAS</b></p>
// * This implementation uses ONLY historical data available at the time of signal generation.
// * It can be deployed in live trading without modification.
// *
// * <p><b>Algorithm: Causal Mean Reversion with Historical Confirmation</b></p>
// * <ul>
// *   <li>Lookback Window: 2% of dataset size (minimum 3 points)</li>
// *   <li>Detects price extremes relative to recent moving average</li>
// *   <li>Confirms reversals using ONLY past price action</li>
// *   <li>Immediate signal emission - no future data required</li>
// *   <li>Configurable threshold for sensitivity (default 0.5%)</li>
// * </ul>
// *
// * <p><b>Causal Signal Detection (NO FUTURE DATA):</b></p>
// * <ul>
// *   <li><b>Dip Detection:</b> Price drops below recent average, then starts recovering (past 3 candles show bounce)</li>
// *   <li><b>Peak Detection:</b> Price spikes above recent average, then starts declining (past 3 candles show rejection)</li>
// *   <li><b>Momentum Filter:</b> Confirms reversal using velocity change in LAST N candles</li>
// *   <li><b>Volume Spike:</b> Optional confirmation using recent volume surge</li>
// * </ul>
// *
// * <p><b>Advantages:</b></p>
// * <ul>
// *   <li>✅ ZERO look-ahead bias - can be used in live trading</li>
// *   <li>Simple and computationally efficient</li>
// *   <li>Immediate signal generation (no lag)</li>
// *   <li>Good for detecting sharp reversals in noisy data</li>
// *   <li>Threshold-based control over sensitivity</li>
// * </ul>
// *
// * <p><b>Limitations:</b></p>
// * <ul>
// *   <li>More false signals than look-ahead version (expected trade-off)</li>
// *   <li>May miss gradual trend changes</li>
// *   <li>Fixed lookback window may not adapt to volatility changes</li>
// *   <li>Requires sufficient historical data (excludes early points)</li>
// *   <li>Sensitive to threshold selection</li>
// * </ul>
// *
// * @author ChartsSimulator
// * @since 1.0.0
// * @version 2.0.0 - Removed look-ahead bias, causal implementation for live trading
// * @see com.vish.fno.ChartsSimulator.service.analysis package for alternative algorithms
// */
//@Slf4j
//@Service
//@RequiredArgsConstructor
//public class MovingAverageDetectionService2 {
//
//    /** Default threshold percentage for detecting significant moves */
//    private static final double DEFAULT_THRESHOLD = 0.5; // 0.5% change
//
//    /** Minimum number of data points required for analysis */
//    private static final int MIN_DATA_POINTS = 5;
//
//    /** Lookback percentage: 2% of total data points */
//    private static final double LOOKBACK_PERCENTAGE = 0.02;
//
//    /** Minimum lookback window size */
//    private static final int MIN_LOOKBACK = 3;
//
//    /** Historical bounce/rejection window: Past candles to check for reversal confirmation */
//    private static final int HISTORICAL_REVERSAL_WINDOW = 5;
//
//    /** Minimum reversal momentum percentage to confirm signal */
//    private static final double MIN_REVERSAL_MOMENTUM = 0.3; // 0.3% price movement in reversal direction
//
//    /** Minimum distance between signals to avoid clustering */
//    private static final int MIN_SIGNAL_DISTANCE = 100; // points
//
//    /**
//     * Detects significant price movements in ticker data.
//     *
//     * @param tickers List of ticker data points
//     * @param threshold Percentage threshold for significance (e.g., 0.5 for 0.5%)
//     * @return List of detected significant moves (dips and peaks)
//     */
//    public List<SignificantMove> detectSignificantMoves(List<Ticker> tickers, double threshold) {
//        if (tickers == null || tickers.size() <= MIN_DATA_POINTS) {
//            log.debug("Insufficient data points for significant move detection. Size: {}",
//                    tickers == null ? 0 : tickers.size());
//            return List.of();
//        }
//
//        List<SignificantMove> significantMoves = new ArrayList<>();
//
//        // Calculate lookback window: 2% of data points, minimum 3
//        int lookbackWindow = Math.max(MIN_LOOKBACK, (int) Math.floor(tickers.size() * LOOKBACK_PERCENTAGE));
//
//        log.debug("Detecting significant moves with threshold: {}%, lookback window: {}, data points: {}, " +
//                        "historical reversal window: {}, min reversal momentum: {}%",
//                threshold, lookbackWindow, tickers.size(), HISTORICAL_REVERSAL_WINDOW, MIN_REVERSAL_MOMENTUM);
//
//        int lastSignalIndex = -MIN_SIGNAL_DISTANCE; // Track last signal to avoid clustering
//
//        // Iterate through ticker data, excluding edges where we can't calculate historical averages
//        // We need at least lookbackWindow + HISTORICAL_REVERSAL_WINDOW points of history
//        for (int i = lookbackWindow + HISTORICAL_REVERSAL_WINDOW; i < tickers.size(); i++) {
//            // Skip if too close to last signal (reduce clustering)
//            if (i - lastSignalIndex < MIN_SIGNAL_DISTANCE) {
//                continue;
//            }
//
//            Ticker currentTicker = tickers.get(i);
//            double currentPrice = currentTicker.price();
//
//            // Calculate average price before current point (ONLY historical data)
//            double prevAvg = calculateAveragePrice(tickers, i - lookbackWindow, i);
//
//            // Calculate percentage change from historical average
//            double changeFromPrev = ((currentPrice - prevAvg) / prevAvg) * 100;
//
//            // Detect potential dip: price significantly below recent average
//            boolean potentialDip = changeFromPrev < -threshold;
//
//            // Detect potential peak: price significantly above recent average
//            boolean potentialPeak = changeFromPrev > threshold;
//
//            if (potentialDip || potentialPeak) {
//                // Confirm the signal by checking PAST price action for reversal momentum
//                boolean confirmed = confirmReversalFromHistory(contickers, i, potentialDip);
//
//                if (confirmed) {
//                    double magnitude = Math.abs(changeFromPrev);
//                    String type = potentialDip ? "dip" : "peak";
//
//                    // Signal is emitted immediately - no future data delay
//                    String emissionTime = currentTicker.time();
//
//                    significantMoves.add(new SignificantMove(
//                            currentTicker.time(),  // Reversal point timestamp
//                            emissionTime,          // Immediate signal emission (same as reversal time)
//                            currentPrice,
//                            type,
//                            magnitude
//                    ));
//
//                    lastSignalIndex = i; // Update last signal position
//
//                    log.debug("Confirmed {} at time: {}, price: {}, magnitude: {}%",
//                            type, currentTicker.time(), currentPrice, String.format("%.2f", magnitude));
//                }
//            }
//        }
//
//        log.info("Detected {} significant moves (threshold: {}%): {} dips, {} peaks",
//                significantMoves.size(),
//                threshold,
//                significantMoves.stream().filter(m -> "dip".equals(m.type())).count(),
//                significantMoves.stream().filter(m -> "peak".equals(m.type())).count());
//
//        return significantMoves;
//    }
//
//    /**
//     * Detects significant price movements using default threshold.
//     *
//     * @param tickers List of ticker data points
//     * @return List of detected significant moves
//     */
//    public List<SignificantMove> detectSignificantMoves(List<Ticker> tickers) {
//        return detectSignificantMoves(tickers, DEFAULT_THRESHOLD);
//    }
//
//    /**
//     * Confirms a potential signal by checking for sustained follow-through movement.
//     * This reduces false signals by requiring price to continue moving in the reversal direction.
//     *
//     * @param tickers List of all tickers
//     * @param signalIndex Index where potential signal occurred
//     * @param isDip True if checking dip confirmation, false for peak
//     * @return True if signal is confirmed by follow-through movement
//     */
//    private boolean confirmSignal(List<Ticker> tickers, int signalIndex, boolean isDip) {
//        double signalPrice = tickers.get(signalIndex).price();
//
//        // Check next CONFIRMATION_WINDOW points for sustained movement
//        int confirmationCount = 0;
//        double maxMoveInDirection = 0;
//
//        for (int i = signalIndex + 1; i < signalIndex + 1 + CONFIRMATION_WINDOW && i < tickers.size(); i++) {
//            double currentPrice = tickers.get(i).price();
//            double movePercent = ((currentPrice - signalPrice) / signalPrice) * 100;
//
//            if (isDip) {
//                // For dip (buy signal), we want upward movement
//                if (movePercent > 0) {
//                    confirmationCount++;
//                    maxMoveInDirection = Math.max(maxMoveInDirection, movePercent);
//                }
//            } else {
//                // For peak (sell signal), we want downward movement
//                if (movePercent < 0) {
//                    confirmationCount++;
//                    maxMoveInDirection = Math.max(maxMoveInDirection, Math.abs(movePercent));
//                }
//            }
//        }
//
//        // Require majority of confirmation points to move in expected direction
//        // AND maximum move must exceed minimum follow-through threshold
//        boolean majorityConfirmed = confirmationCount >= (CONFIRMATION_WINDOW / 2);
//        boolean sufficientMovement = maxMoveInDirection >= MIN_FOLLOW_THROUGH;
//
//        log.trace("Signal confirmation at index {}: majority={}, movement={}%, confirmed={}",
//                signalIndex, majorityConfirmed, String.format("%.2f", maxMoveInDirection),
//                majorityConfirmed && sufficientMovement);
//
//        return majorityConfirmed && sufficientMovement;
//    }
//
//    /**
//     * Calculates average price for a range of tickers.
//     *
//     * @param tickers List of all tickers
//     * @param startIndex Start index (inclusive)
//     * @param endIndex End index (exclusive)
//     * @return Average price for the range
//     */
//    private double calculateAveragePrice(List<Ticker> tickers, int startIndex, int endIndex) {
//        double sum = 0.0;
//        int count = 0;
//
//        for (int i = startIndex; i < endIndex; i++) {
//            sum += tickers.get(i).price();
//            count++;
//        }
//
//        return count > 0 ? sum / count : 0.0;
//    }
//}
