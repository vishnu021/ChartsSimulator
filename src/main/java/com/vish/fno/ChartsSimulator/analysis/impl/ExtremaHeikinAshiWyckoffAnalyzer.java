package com.vish.fno.ChartsSimulator.analysis.impl;

import com.vish.fno.ChartsSimulator.analysis.WyckoffPhaseAnalyzer;
import com.vish.fno.ChartsSimulator.analysis.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.Candle;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.*;
import static java.lang.Math.*;

/**
 * Advanced Wyckoff Phase Analyzer using Extrema Detection and Heikin-Ashi Patterns
 *
 * This analyzer combines:
 * 1. Extrema (local maxima/minima) detection for support/resistance identification
 * 2. Heikin-Ashi smoothing for clearer trend visualization
 * 3. Volume-less Wyckoff phase detection based on price action patterns
 * 4. Smart phase transition logic to minimize UNKNOWN labels
 *
 * Key improvements:
 * - Uses extrema patterns to identify accumulation/distribution zones
 * - Employs Heikin-Ashi trend strength for markup/markdown confirmation
 * - Better handling of range-bound markets
 * - Intelligent phase smoothing to reduce noise
 */
@Component
@RequiredArgsConstructor
public class ExtremaHeikinAshiWyckoffAnalyzer implements WyckoffPhaseAnalyzer {

    private final Params p;

    @Getter
    @Accessors(fluent = true)
    @Component
    @ConfigurationProperties(prefix = "wyckoff.extrema.ha")
    public static class Params {
        // Extrema detection
        private int extremaLookback = 10;          // Bars for local extrema detection
        private double extremaThreshold = 0.0008;  // 0.08% minimum move for valid extrema
        private int extremaConfirmBars = 3;        // Bars to confirm extrema

        // Heikin-Ashi parameters
        private int haFastEma = 9;                 // Fast EMA on HA
        private int haSlowEma = 21;                // Slow EMA on HA
        private int haMediumEma = 14;              // Medium EMA for crossovers

        // Trend detection
        private int trendStrengthPeriod = 14;      // Period for trend strength calculation
        private double strongTrendThreshold = 0.002; // 0.2% for strong trend
        private double weakTrendThreshold = 0.0008; // 0.08% for weak trend

        // Range detection
        private int rangeLookback = 40;            // Bars to detect range
        private double rangeWidthMin = 0.002;      // 0.2% minimum range width
        private double rangeWidthMax = 0.006;      // 0.6% maximum range width
        private double rangeBreakoutThreshold = 0.001; // 0.1% above/below range

        // Phase detection thresholds
        private int phaseConfirmBars = 5;          // Bars to confirm phase change
        private double accumulationZone = 0.25;    // Lower 25% of range
        private double distributionZone = 0.75;    // Upper 75% of range

        // Pattern recognition
        private int patternLookback = 20;          // Bars for pattern detection
        private double springThreshold = 0.0015;   // 1.5% for spring/upthrust detection
        private int consolidationBars = 15;        // Minimum bars for consolidation

        // Smoothing
        private int minPhaseLength = 8;            // Minimum bars per phase
        private int smoothingWindow = 5;           // Window for phase smoothing

        // Safety
        private int minBars = 100;                 // Minimum bars to analyze
    }

    // Internal structures
    private static class Extrema {
        final List<Integer> highs = new ArrayList<>();
        final List<Integer> lows = new ArrayList<>();
        final double[] highValues;
        final double[] lowValues;

        Extrema(int size) {
            highValues = new double[size];
            lowValues = new double[size];
            Arrays.fill(highValues, Double.NaN);
            Arrays.fill(lowValues, Double.NaN);
        }
    }

    private static class HeikinAshi {
        final double[] open, high, low, close;
        final boolean[] bullish;
        final int[] colorRun;

        HeikinAshi(int size) {
            open = new double[size];
            high = new double[size];
            low = new double[size];
            close = new double[size];
            bullish = new boolean[size];
            colorRun = new int[size];
        }
    }

    private enum MarketCondition {
        STRONG_UPTREND,
        WEAK_UPTREND,
        RANGING,
        WEAK_DOWNTREND,
        STRONG_DOWNTREND,
        BREAKOUT_UP,
        BREAKOUT_DOWN
    }

    @Override
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles == null || candles.size() < p.minBars()) return List.of();

        final int n = candles.size();

        // Extract OHLC
        double[] open = new double[n];
        double[] high = new double[n];
        double[] low = new double[n];
        double[] close = new double[n];
        String[] timestamps = new String[n];

        for (int i = 0; i < n; i++) {
            Candle c = candles.get(i);
            open[i] = c.open();
            high[i] = c.high();
            low[i] = c.low();
            close[i] = c.close();
            timestamps[i] = String.valueOf(i);
        }

        // Calculate Heikin-Ashi
        HeikinAshi ha = calculateHeikinAshi(open, high, low, close);

        // Calculate EMAs on HA close
        double[] haFast = ema(ha.close, p.haFastEma());
        double[] haMedium = ema(ha.close, p.haMediumEma());
        double[] haSlow = ema(ha.close, p.haSlowEma());

        // Detect extrema
        Extrema extrema = detectExtrema(high, low, close, p.extremaLookback(), p.extremaThreshold());

        // Calculate trend strength
        double[] trendStrength = calculateTrendStrength(close, ha, haFast, haSlow, p.trendStrengthPeriod());

        // Detect market conditions
        MarketCondition[] conditions = detectMarketConditions(
            high, low, close, ha, haFast, haMedium, haSlow,
            trendStrength, extrema
        );

        // Classify Wyckoff phases
        WyckoffPhase[] phases = classifyWyckoffPhases(
            high, low, close, ha, conditions, extrema, trendStrength
        );

        // Smooth phases to reduce noise
        phases = smoothPhases(phases, p.minPhaseLength(), p.smoothingWindow());

        // Build phase segments
        return buildPhaseSegments(phases, timestamps, conditions, trendStrength);
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        var segments = analyzeWyckoffPhases(candles);
        return segments.isEmpty() ? WyckoffPhase.UNKNOWN : segments.get(segments.size() - 1).phase();
    }

    @Override
    public String getAnalyzerName() {
        return "ExtremaHeikinAshiWyckoffAnalyzer";
    }

    @Override
    public String getVersion() {
        return "2.0.0";
    }

    private HeikinAshi calculateHeikinAshi(double[] o, double[] h, double[] l, double[] c) {
        int n = o.length;
        HeikinAshi ha = new HeikinAshi(n);

        // First candle
        ha.close[0] = (o[0] + h[0] + l[0] + c[0]) / 4.0;
        ha.open[0] = (o[0] + c[0]) / 2.0;
        ha.high[0] = h[0];
        ha.low[0] = l[0];
        ha.bullish[0] = ha.close[0] > ha.open[0];
        ha.colorRun[0] = 1;

        // Subsequent candles
        for (int i = 1; i < n; i++) {
            ha.close[i] = (o[i] + h[i] + l[i] + c[i]) / 4.0;
            ha.open[i] = (ha.open[i-1] + ha.close[i-1]) / 2.0;
            ha.high[i] = max(h[i], max(ha.open[i], ha.close[i]));
            ha.low[i] = min(l[i], min(ha.open[i], ha.close[i]));
            ha.bullish[i] = ha.close[i] > ha.open[i];

            // Track color runs
            if (ha.bullish[i] == ha.bullish[i-1]) {
                ha.colorRun[i] = ha.colorRun[i-1] + 1;
            } else {
                ha.colorRun[i] = 1;
            }
        }

        return ha;
    }

    private Extrema detectExtrema(double[] high, double[] low, double[] close, int lookback, double threshold) {
        int n = close.length;
        Extrema extrema = new Extrema(n);

        for (int i = lookback; i < n - lookback; i++) {
            // Check for local maximum
            boolean isMaximum = true;
            double currentHigh = high[i];

            for (int j = i - lookback; j <= i + lookback; j++) {
                if (j != i && high[j] >= currentHigh) {
                    isMaximum = false;
                    break;
                }
            }

            // Validate with threshold
            if (isMaximum) {
                double prevLow = low[i];
                for (int j = max(0, i - lookback * 2); j < i; j++) {
                    prevLow = min(prevLow, low[j]);
                }
                if ((currentHigh - prevLow) / prevLow >= threshold) {
                    extrema.highs.add(i);
                    extrema.highValues[i] = currentHigh;
                }
            }

            // Check for local minimum
            boolean isMinimum = true;
            double currentLow = low[i];

            for (int j = i - lookback; j <= i + lookback; j++) {
                if (j != i && low[j] <= currentLow) {
                    isMinimum = false;
                    break;
                }
            }

            // Validate with threshold
            if (isMinimum) {
                double prevHigh = high[i];
                for (int j = max(0, i - lookback * 2); j < i; j++) {
                    prevHigh = max(prevHigh, high[j]);
                }
                if ((prevHigh - currentLow) / prevHigh >= threshold) {
                    extrema.lows.add(i);
                    extrema.lowValues[i] = currentLow;
                }
            }
        }

        return extrema;
    }

    private double[] calculateTrendStrength(double[] close, HeikinAshi ha, double[] haFast, double[] haSlow, int period) {
        int n = close.length;
        double[] strength = new double[n];

        for (int i = period; i < n; i++) {
            // Immediate price momentum (more weight on recent price)
            double immediateReturn = (close[i] - close[max(0, i - 3)]) / close[max(0, i - 3)];
            double priceReturn = (close[i] - close[i - period]) / close[i - period];

            // HA trend alignment with more weight
            double emaDiff = (haFast[i] - haSlow[i]) / haSlow[i];

            // Recent HA direction change detection
            double recentHAChange = 0;
            if (i >= 2) {
                recentHAChange = (ha.close[i] - ha.close[i-2]) / ha.close[i-2];
            }

            // HA consistency (percentage of bullish candles)
            int bullishCount = 0;
            for (int j = i - period + 1; j <= i; j++) {
                if (ha.bullish[j]) bullishCount++;
            }
            double consistency = (double) bullishCount / period;

            // Combine factors with more emphasis on recent changes
            strength[i] = immediateReturn * 0.35 + priceReturn * 0.2 + emaDiff * 0.25 +
                         recentHAChange * 0.1 + (consistency - 0.5) * 0.1;
        }

        return strength;
    }

    private MarketCondition[] detectMarketConditions(double[] high, double[] low, double[] close,
                                                    HeikinAshi ha, double[] haFast, double[] haMedium, double[] haSlow,
                                                    double[] trendStrength, Extrema extrema) {
        int n = close.length;
        MarketCondition[] conditions = new MarketCondition[n];
        Arrays.fill(conditions, MarketCondition.RANGING);

        for (int i = p.rangeLookback(); i < n; i++) {
            // Calculate range boundaries
            double rangeHigh = high[i];
            double rangeLow = low[i];
            int startJ = max(0, i - p.rangeLookback() + 1);
            for (int j = startJ; j < i; j++) {
                rangeHigh = max(rangeHigh, high[j]);
                rangeLow = min(rangeLow, low[j]);
            }

            double rangeWidth = (rangeHigh - rangeLow) / close[i];
            boolean inRange = rangeWidth >= p.rangeWidthMin() && rangeWidth <= p.rangeWidthMax();

            // Check for breakouts
            boolean breakoutUp = close[i] > rangeHigh * (1 + p.rangeBreakoutThreshold());
            boolean breakoutDown = close[i] < rangeLow * (1 - p.rangeBreakoutThreshold());

            // Trend assessment with immediate response
            double strength = abs(trendStrength[i]);
            boolean strongTrend = strength > p.strongTrendThreshold();
            boolean weakTrend = strength > p.weakTrendThreshold() && !strongTrend;

            // Immediate price action detection
            double immediateMomentum = i >= 3 ? (close[i] - close[i-3]) / close[i-3] : 0;
            boolean immediateUp = immediateMomentum > p.weakTrendThreshold();
            boolean immediateDown = immediateMomentum < -p.weakTrendThreshold();

            // HA trend confirmation with crossover detection
            boolean haUptrend = haFast[i] > haSlow[i];
            boolean haDowntrend = haFast[i] < haSlow[i];
            boolean haCrossUp = i > 0 && haFast[i] > haSlow[i] && haFast[i-1] <= haSlow[i-1];
            boolean haCrossDown = i > 0 && haFast[i] < haSlow[i] && haFast[i-1] >= haSlow[i-1];

            // Classify condition with immediate response
            if (haCrossUp || (breakoutUp && immediateUp)) {
                conditions[i] = MarketCondition.BREAKOUT_UP;
            } else if (haCrossDown || (breakoutDown && immediateDown)) {
                conditions[i] = MarketCondition.BREAKOUT_DOWN;
            } else if (immediateUp || trendStrength[i] > 0) {
                if ((strongTrend && haUptrend) || (immediateUp && haUptrend)) {
                    conditions[i] = MarketCondition.STRONG_UPTREND;
                } else if (weakTrend || haUptrend || immediateUp) {
                    conditions[i] = MarketCondition.WEAK_UPTREND;
                } else {
                    conditions[i] = MarketCondition.RANGING;
                }
            } else if (immediateDown || trendStrength[i] < 0) {
                if ((strongTrend && haDowntrend) || (immediateDown && haDowntrend)) {
                    conditions[i] = MarketCondition.STRONG_DOWNTREND;
                } else if (weakTrend || haDowntrend || immediateDown) {
                    conditions[i] = MarketCondition.WEAK_DOWNTREND;
                } else {
                    conditions[i] = MarketCondition.RANGING;
                }
            } else {
                conditions[i] = MarketCondition.RANGING;
            }
        }

        return conditions;
    }

    private WyckoffPhase[] classifyWyckoffPhases(double[] high, double[] low, double[] close,
                                                HeikinAshi ha, MarketCondition[] conditions,
                                                Extrema extrema, double[] trendStrength) {
        int n = close.length;
        WyckoffPhase[] phases = new WyckoffPhase[n];
        Arrays.fill(phases, WyckoffPhase.UNKNOWN);

        for (int i = p.patternLookback(); i < n; i++) {
            MarketCondition condition = conditions[i];

            // Calculate position in recent range
            double recentHigh = high[i];
            double recentLow = low[i];
            int startJ = max(0, i - p.rangeLookback() + 1);
            for (int j = startJ; j < i; j++) {
                recentHigh = max(recentHigh, high[j]);
                recentLow = min(recentLow, low[j]);
            }
            double rangePosition = (close[i] - recentLow) / max(0.001, recentHigh - recentLow);

            // Check for extrema patterns
            int recentHighs = countRecentExtrema(extrema.highs, i, p.patternLookback());
            int recentLows = countRecentExtrema(extrema.lows, i, p.patternLookback());

            // HA pattern strength with immediate detection
            boolean strongHAUp = (ha.colorRun[i] >= p.phaseConfirmBars() && ha.bullish[i]) ||
                                (i > 0 && !ha.bullish[i-1] && ha.bullish[i]); // Immediate bullish flip
            boolean strongHADown = (ha.colorRun[i] >= p.phaseConfirmBars() && !ha.bullish[i]) ||
                                  (i > 0 && ha.bullish[i-1] && !ha.bullish[i]); // Immediate bearish flip

            // Immediate extrema detection for faster response
            boolean atExtremaHigh = !Double.isNaN(extrema.highValues[i]);
            boolean atExtremaLow = !Double.isNaN(extrema.lowValues[i]);

            // Phase classification logic with immediate response
            switch (condition) {
                case STRONG_UPTREND:
                case BREAKOUT_UP:
                    // Immediate transition to MARKUP
                    phases[i] = WyckoffPhase.MARKUP;
                    break;

                case STRONG_DOWNTREND:
                case BREAKOUT_DOWN:
                    // Immediate transition to MARKDOWN
                    phases[i] = WyckoffPhase.MARKDOWN;
                    break;

                case WEAK_UPTREND:
                    if (atExtremaLow || (rangePosition < p.accumulationZone() && recentLows > 0)) {
                        phases[i] = WyckoffPhase.ACCUMULATION;
                    } else if (strongHAUp || (trendStrength[i] > p.weakTrendThreshold() && ha.bullish[i])) {
                        phases[i] = WyckoffPhase.MARKUP;
                    } else {
                        phases[i] = WyckoffPhase.ACCUMULATION;
                    }
                    break;

                case WEAK_DOWNTREND:
                    if (atExtremaHigh || (rangePosition > p.distributionZone() && recentHighs > 0)) {
                        phases[i] = WyckoffPhase.DISTRIBUTION;
                    } else if (strongHADown || (trendStrength[i] < -p.weakTrendThreshold() && !ha.bullish[i])) {
                        phases[i] = WyckoffPhase.MARKDOWN;
                    } else {
                        phases[i] = WyckoffPhase.DISTRIBUTION;
                    }
                    break;

                case RANGING:
                    // In ranging markets, use immediate signals and extrema
                    if (atExtremaLow || rangePosition <= p.accumulationZone()) {
                        // Near lows or at extrema low - accumulation
                        if (strongHAUp || (ha.bullish[i] && trendStrength[i] > 0)) {
                            phases[i] = WyckoffPhase.MARKUP; // Quick transition
                        } else if (strongHADown && trendStrength[i] < -p.strongTrendThreshold()) {
                            phases[i] = WyckoffPhase.MARKDOWN;
                        } else {
                            phases[i] = WyckoffPhase.ACCUMULATION;
                        }
                    } else if (atExtremaHigh || rangePosition >= p.distributionZone()) {
                        // Near highs or at extrema high - distribution
                        if (strongHADown || (!ha.bullish[i] && trendStrength[i] < 0)) {
                            phases[i] = WyckoffPhase.MARKDOWN; // Quick transition
                        } else if (strongHAUp && trendStrength[i] > p.strongTrendThreshold()) {
                            phases[i] = WyckoffPhase.MARKUP;
                        } else {
                            phases[i] = WyckoffPhase.DISTRIBUTION;
                        }
                    } else {
                        // Middle of range - use immediate direction
                        if (strongHAUp || (ha.bullish[i] && trendStrength[i] > p.weakTrendThreshold())) {
                            phases[i] = WyckoffPhase.MARKUP;
                        } else if (strongHADown || (!ha.bullish[i] && trendStrength[i] < -p.weakTrendThreshold())) {
                            phases[i] = WyckoffPhase.MARKDOWN;
                        } else if (trendStrength[i] > 0) {
                            phases[i] = rangePosition > 0.5 ? WyckoffPhase.MARKUP : WyckoffPhase.ACCUMULATION;
                        } else if (trendStrength[i] < 0) {
                            phases[i] = rangePosition < 0.5 ? WyckoffPhase.MARKDOWN : WyckoffPhase.DISTRIBUTION;
                        } else {
                            // Use immediate HA direction
                            if (ha.bullish[i]) {
                                phases[i] = rangePosition > 0.5 ? WyckoffPhase.MARKUP : WyckoffPhase.ACCUMULATION;
                            } else {
                                phases[i] = rangePosition < 0.5 ? WyckoffPhase.MARKDOWN : WyckoffPhase.DISTRIBUTION;
                            }
                        }
                    }
                    break;
            }
        }

        // Fill initial bars
        for (int i = 0; i < p.patternLookback() && i < n; i++) {
            if (p.patternLookback() < n) {
                phases[i] = phases[p.patternLookback()];
            } else {
                phases[i] = WyckoffPhase.UNKNOWN;
            }
        }

        return phases;
    }

    private int countRecentExtrema(List<Integer> extremaIndices, int currentIndex, int lookback) {
        int count = 0;
        int startIndex = currentIndex - lookback;

        for (int idx : extremaIndices) {
            if (idx >= startIndex && idx <= currentIndex) {
                count++;
            } else if (idx > currentIndex) {
                break;
            }
        }

        return count;
    }

    private WyckoffPhase[] smoothPhases(WyckoffPhase[] phases, int minLength, int window) {
        int n = phases.length;
        WyckoffPhase[] smoothed = phases.clone();

        // First pass: Remove single-bar outliers
        for (int i = 1; i < n - 1; i++) {
            if (phases[i] != phases[i-1] && phases[i] != phases[i+1]) {
                smoothed[i] = phases[i-1];
            }
        }

        // Second pass: Merge small segments
        int start = 0;
        while (start < n) {
            int end = start;
            while (end < n && smoothed[end] == smoothed[start]) {
                end++;
            }

            int length = end - start;
            if (length < minLength) {
                // Try to merge with neighbors
                WyckoffPhase prevPhase = start > 0 ? smoothed[start - 1] : WyckoffPhase.UNKNOWN;
                WyckoffPhase nextPhase = end < n ? smoothed[end] : WyckoffPhase.UNKNOWN;

                // Prefer merging with non-UNKNOWN phases
                WyckoffPhase mergePhase;
                if (prevPhase != WyckoffPhase.UNKNOWN) {
                    mergePhase = prevPhase;
                } else if (nextPhase != WyckoffPhase.UNKNOWN) {
                    mergePhase = nextPhase;
                } else {
                    mergePhase = smoothed[start];
                }

                for (int i = start; i < end; i++) {
                    smoothed[i] = mergePhase;
                }
            }

            start = end;
        }

        // Third pass: Weighted voting in windows
        WyckoffPhase[] result = new WyckoffPhase[n];
        for (int i = 0; i < n; i++) {
            Map<WyckoffPhase, Integer> votes = new HashMap<>();
            int windowStart = max(0, i - window / 2);
            int windowEnd = min(n - 1, i + window / 2);

            for (int j = windowStart; j <= windowEnd; j++) {
                int weight = window - abs(j - i);
                votes.merge(smoothed[j], weight, Integer::sum);
            }

            result[i] = votes.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(WyckoffPhase.UNKNOWN);
        }

        return result;
    }

    private double[] ema(double[] values, int period) {
        int n = values.length;
        double[] result = new double[n];
        double multiplier = 2.0 / (period + 1.0);

        result[0] = values[0];
        for (int i = 1; i < n; i++) {
            result[i] = values[i] * multiplier + result[i-1] * (1 - multiplier);
        }

        return result;
    }

    private List<WyckoffPhase.WyckoffPhaseData> buildPhaseSegments(WyckoffPhase[] phases, String[] timestamps,
                                                                  MarketCondition[] conditions, double[] trendStrength) {
        List<WyckoffPhase.WyckoffPhaseData> segments = new ArrayList<>();
        int n = phases.length;
        if (n == 0) return segments;

        int segmentStart = 0;
        for (int i = 1; i < n; i++) {
            if (phases[i] != phases[i-1]) {
                segments.add(createPhaseData(segmentStart, i-1, phases[segmentStart],
                                           timestamps, conditions, trendStrength));
                segmentStart = i;
            }
        }

        // Add final segment
        segments.add(createPhaseData(segmentStart, n-1, phases[segmentStart],
                                    timestamps, conditions, trendStrength));

        return segments;
    }

    private WyckoffPhase.WyckoffPhaseData createPhaseData(int start, int end, WyckoffPhase phase,
                                                         String[] timestamps, MarketCondition[] conditions,
                                                         double[] trendStrength) {
        // Calculate confidence based on consistency and trend alignment
        double avgStrength = 0;
        Map<MarketCondition, Integer> conditionCounts = new HashMap<>();

        for (int i = start; i <= end; i++) {
            avgStrength += abs(trendStrength[i]);
            conditionCounts.merge(conditions[i], 1, Integer::sum);
        }
        avgStrength /= (end - start + 1);

        // Determine dominant condition
        MarketCondition dominantCondition = conditionCounts.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse(MarketCondition.RANGING);

        // Calculate confidence
        double confidence = 0.5;
        switch (phase) {
            case MARKUP:
                if (dominantCondition == MarketCondition.STRONG_UPTREND ||
                    dominantCondition == MarketCondition.BREAKOUT_UP) {
                    confidence = 0.85 + min(0.1, avgStrength * 10);
                } else if (dominantCondition == MarketCondition.WEAK_UPTREND) {
                    confidence = 0.70 + min(0.15, avgStrength * 10);
                } else {
                    confidence = 0.60;
                }
                break;

            case MARKDOWN:
                if (dominantCondition == MarketCondition.STRONG_DOWNTREND ||
                    dominantCondition == MarketCondition.BREAKOUT_DOWN) {
                    confidence = 0.85 + min(0.1, avgStrength * 10);
                } else if (dominantCondition == MarketCondition.WEAK_DOWNTREND) {
                    confidence = 0.70 + min(0.15, avgStrength * 10);
                } else {
                    confidence = 0.60;
                }
                break;

            case ACCUMULATION:
            case DISTRIBUTION:
                if (dominantCondition == MarketCondition.RANGING) {
                    confidence = 0.75 + min(0.15, (1.0 - avgStrength) * 0.2);
                } else {
                    confidence = 0.65;
                }
                break;

            default:
                confidence = 0.40;
        }

        String description = String.format("%s phase (%d bars, %s market, strength: %.2f%%)",
                                         phase.name(), end - start + 1,
                                         dominantCondition.toString().replace("_", " ").toLowerCase(),
                                         avgStrength * 100);

        return new WyckoffPhase.WyckoffPhaseData(
            start, end, phase,
            timestamps[start], timestamps[end],
            min(0.95, confidence), description
        );
    }
}