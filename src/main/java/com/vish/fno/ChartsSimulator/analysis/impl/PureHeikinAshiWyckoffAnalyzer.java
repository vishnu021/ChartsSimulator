package com.vish.fno.ChartsSimulator.analysis.impl;

import com.vish.fno.ChartsSimulator.analysis.WyckoffPhaseAnalyzer;
import com.vish.fno.ChartsSimulator.analysis.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.Candle;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.*;
import static java.lang.Math.*;

/**
 * Pure Heikin-Ashi Wyckoff Phase Analyzer
 *
 * This analyzer strictly follows Heikin-Ashi principles:
 * 1. MARKUP: Consecutive bullish HA candles with minimal/no lower wicks
 * 2. MARKDOWN: Consecutive bearish HA candles with minimal/no upper wicks
 * 3. ACCUMULATION: Mixed patterns at range lows
 * 4. DISTRIBUTION: Mixed patterns at range highs
 *
 * Key improvements:
 * - No false MARKUP/MARKDOWN on wicky candles
 * - Proper market structure analysis (HH/HL, LL/LH)
 * - Clear, simple rules based on HA patterns
 */
@Component
@RequiredArgsConstructor
public class PureHeikinAshiWyckoffAnalyzer implements WyckoffPhaseAnalyzer {

    private final Params p;

    @Getter
    @Accessors(fluent = true)
    @Component
    @ConfigurationProperties(prefix = "wyckoff.pure.ha")
    public static class Params {
        // Heikin-Ashi pattern detection
        private int minConsecutiveCandles = 3;     // Minimum consecutive HA candles for trend
        private double maxWickRatio = 0.2;         // Max wick/body ratio for strong trend (20%)
        private int haColorRunRequired = 3;        // Required consecutive same-color candles

        // Market structure
        private int structureLookback = 15;        // Bars for HH/HL/LL/LH detection
        private double minStructureMove = 0.001;   // 0.1% minimum move for valid structure

        // Range detection
        private int rangeLookback = 30;            // Bars for range calculation
        private double accumulationZone = 0.4;     // Bottom 40% of range
        private double distributionZone = 0.6;     // Top 60% of range

        // Trend strength
        private int trendLookback = 10;            // Bars for trend calculation
        private double strongTrendThreshold = 0.0015; // 0.15% for strong trend

        // Smoothing (minimal)
        private int minPhaseLength = 2;            // Very minimal smoothing
        private int smoothingWindow = 2;           // Minimal smoothing window

        // Safety
        private int minBars = 30;                  // Minimum bars to analyze
    }

    // Internal structures
    private static class HeikinAshi {
        final double[] open, high, low, close;
        final boolean[] bullish;
        final int[] colorRun;
        final double[] upperWick, lowerWick, body;
        final double[] wickRatio; // Total wick size relative to body

        HeikinAshi(int size) {
            open = new double[size];
            high = new double[size];
            low = new double[size];
            close = new double[size];
            bullish = new boolean[size];
            colorRun = new int[size];
            upperWick = new double[size];
            lowerWick = new double[size];
            body = new double[size];
            wickRatio = new double[size];
        }
    }

    private enum MarketStructure {
        UPTREND,    // Higher Highs + Higher Lows
        DOWNTREND,  // Lower Highs + Lower Lows
        RANGING     // No clear structure
    }

    private static class StructurePoint {
        final int index;
        final double price;
        final boolean isHigh;

        StructurePoint(int index, double price, boolean isHigh) {
            this.index = index;
            this.price = price;
            this.isHigh = isHigh;
        }
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

        // Calculate Heikin-Ashi with detailed metrics
        HeikinAshi ha = calculateHeikinAshi(open, high, low, close);

        // Identify market structure
        MarketStructure[] structure = identifyMarketStructure(high, low, close);

        // Calculate range position
        double[] rangePosition = calculateRangePosition(high, low, close);

        // Classify phases using pure HA principles
        WyckoffPhase[] phases = classifyPhases(ha, structure, rangePosition, close);

        // Minimal smoothing to remove single-bar noise
        phases = smoothPhases(phases);

        // Build phase segments
        return buildPhaseSegments(phases, timestamps, ha);
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        var segments = analyzeWyckoffPhases(candles);
        return segments.isEmpty() ? WyckoffPhase.UNKNOWN : segments.get(segments.size() - 1).phase();
    }

    @Override
    public String getAnalyzerName() {
        return "PureHeikinAshiWyckoffAnalyzer";
    }

    @Override
    public String getVersion() {
        return "3.0.0";
    }

    private HeikinAshi calculateHeikinAshi(double[] o, double[] h, double[] l, double[] c) {
        int n = o.length;
        HeikinAshi ha = new HeikinAshi(n);

        // First candle
        ha.close[0] = (o[0] + h[0] + l[0] + c[0]) / 4.0;
        ha.open[0] = (o[0] + c[0]) / 2.0;
        ha.high[0] = h[0];
        ha.low[0] = l[0];

        calculateHAMetrics(ha, 0);
        ha.colorRun[0] = 1;

        // Subsequent candles
        for (int i = 1; i < n; i++) {
            ha.close[i] = (o[i] + h[i] + l[i] + c[i]) / 4.0;
            ha.open[i] = (ha.open[i-1] + ha.close[i-1]) / 2.0;
            ha.high[i] = max(h[i], max(ha.open[i], ha.close[i]));
            ha.low[i] = min(l[i], min(ha.open[i], ha.close[i]));

            calculateHAMetrics(ha, i);

            // Track color runs
            if (ha.bullish[i] == ha.bullish[i-1]) {
                ha.colorRun[i] = ha.colorRun[i-1] + 1;
            } else {
                ha.colorRun[i] = 1;
            }
        }

        return ha;
    }

    private void calculateHAMetrics(HeikinAshi ha, int i) {
        // Body and direction
        ha.body[i] = abs(ha.close[i] - ha.open[i]);
        ha.bullish[i] = ha.close[i] > ha.open[i];

        // Wicks
        double bodyTop = max(ha.open[i], ha.close[i]);
        double bodyBottom = min(ha.open[i], ha.close[i]);
        ha.upperWick[i] = ha.high[i] - bodyTop;
        ha.lowerWick[i] = bodyBottom - ha.low[i];

        // Wick ratio (total wick size relative to body)
        double totalWick = ha.upperWick[i] + ha.lowerWick[i];
        ha.wickRatio[i] = ha.body[i] > 0 ? totalWick / ha.body[i] : Double.MAX_VALUE;
    }

    private MarketStructure[] identifyMarketStructure(double[] high, double[] low, double[] close) {
        int n = close.length;
        MarketStructure[] structure = new MarketStructure[n];
        Arrays.fill(structure, MarketStructure.RANGING);

        // Find swing highs and lows
        List<StructurePoint> swingPoints = new ArrayList<>();

        for (int i = p.structureLookback(); i < n - p.structureLookback(); i++) {
            // Check for swing high
            boolean isSwingHigh = true;
            for (int j = i - p.structureLookback(); j <= i + p.structureLookback(); j++) {
                if (j != i && high[j] >= high[i]) {
                    isSwingHigh = false;
                    break;
                }
            }
            if (isSwingHigh) {
                swingPoints.add(new StructurePoint(i, high[i], true));
            }

            // Check for swing low
            boolean isSwingLow = true;
            for (int j = i - p.structureLookback(); j <= i + p.structureLookback(); j++) {
                if (j != i && low[j] <= low[i]) {
                    isSwingLow = false;
                    break;
                }
            }
            if (isSwingLow) {
                swingPoints.add(new StructurePoint(i, low[i], false));
            }
        }

        // Analyze structure
        for (int i = 0; i < n; i++) {
            List<StructurePoint> recentHighs = new ArrayList<>();
            List<StructurePoint> recentLows = new ArrayList<>();

            for (StructurePoint sp : swingPoints) {
                if (sp.index <= i && sp.index > i - p.structureLookback() * 3) {
                    if (sp.isHigh) {
                        recentHighs.add(sp);
                    } else {
                        recentLows.add(sp);
                    }
                }
            }

            if (recentHighs.size() >= 2 && recentLows.size() >= 2) {
                // Check for HH + HL (uptrend)
                boolean hasHH = false, hasHL = false;
                for (int j = 1; j < recentHighs.size(); j++) {
                    if (recentHighs.get(j).price > recentHighs.get(j-1).price * (1 + p.minStructureMove())) {
                        hasHH = true;
                        break;
                    }
                }
                for (int j = 1; j < recentLows.size(); j++) {
                    if (recentLows.get(j).price > recentLows.get(j-1).price * (1 + p.minStructureMove())) {
                        hasHL = true;
                        break;
                    }
                }

                // Check for LL + LH (downtrend)
                boolean hasLL = false, hasLH = false;
                for (int j = 1; j < recentLows.size(); j++) {
                    if (recentLows.get(j).price < recentLows.get(j-1).price * (1 - p.minStructureMove())) {
                        hasLL = true;
                        break;
                    }
                }
                for (int j = 1; j < recentHighs.size(); j++) {
                    if (recentHighs.get(j).price < recentHighs.get(j-1).price * (1 - p.minStructureMove())) {
                        hasLH = true;
                        break;
                    }
                }

                if (hasHH && hasHL) {
                    structure[i] = MarketStructure.UPTREND;
                } else if (hasLL && hasLH) {
                    structure[i] = MarketStructure.DOWNTREND;
                } else {
                    structure[i] = MarketStructure.RANGING;
                }
            }
        }

        return structure;
    }

    private double[] calculateRangePosition(double[] high, double[] low, double[] close) {
        int n = close.length;
        double[] position = new double[n];

        for (int i = p.rangeLookback(); i < n; i++) {
            double rangeHigh = high[i];
            double rangeLow = low[i];

            for (int j = i - p.rangeLookback() + 1; j < i; j++) {
                rangeHigh = max(rangeHigh, high[j]);
                rangeLow = min(rangeLow, low[j]);
            }

            double range = rangeHigh - rangeLow;
            if (range > 0) {
                position[i] = (close[i] - rangeLow) / range;
            } else {
                position[i] = 0.5;
            }
        }

        return position;
    }

    private WyckoffPhase[] classifyPhases(HeikinAshi ha, MarketStructure[] structure,
                                         double[] rangePosition, double[] close) {
        int n = close.length;
        WyckoffPhase[] phases = new WyckoffPhase[n];
        Arrays.fill(phases, WyckoffPhase.UNKNOWN);

        for (int i = p.minConsecutiveCandles(); i < n; i++) {
            // Check HA pattern quality - THIS IS PRIMARY
            boolean hasStrongBullishHA = checkStrongBullishHA(ha, i);
            boolean hasStrongBearishHA = checkStrongBearishHA(ha, i);
            boolean hasWickyCandles = checkWickyPattern(ha, i);

            // Calculate recent trend
            double recentTrend = calculateRecentTrend(close, i);

            // Get current structure
            MarketStructure currentStructure = structure[i];
            double position = rangePosition[i];

            // Phase classification - PRIORITIZE HA PATTERNS OVER EVERYTHING
            if (hasStrongBullishHA) {
                // TRUE MARKUP: Strong bullish HA pattern ALWAYS means MARKUP
                phases[i] = WyckoffPhase.MARKUP;
            } else if (hasStrongBearishHA) {
                // TRUE MARKDOWN: Strong bearish HA pattern ALWAYS means MARKDOWN
                phases[i] = WyckoffPhase.MARKDOWN;
            } else if (hasWickyCandles || ha.colorRun[i] < p.haColorRunRequired()) {
                // Wicky candles or mixed colors indicate consolidation
                // Only use position-based logic when HA patterns are unclear
                if (position <= p.accumulationZone() && recentTrend <= 0) {
                    phases[i] = WyckoffPhase.ACCUMULATION;
                } else if (position >= p.distributionZone() && recentTrend >= 0) {
                    phases[i] = WyckoffPhase.DISTRIBUTION;
                } else {
                    // Middle of range with unclear patterns
                    if (ha.bullish[i]) {
                        phases[i] = position > 0.5 ? WyckoffPhase.DISTRIBUTION : WyckoffPhase.ACCUMULATION;
                    } else {
                        phases[i] = position < 0.5 ? WyckoffPhase.ACCUMULATION : WyckoffPhase.DISTRIBUTION;
                    }
                }
            } else {
                // Transitional state - check HA direction with less strict requirements
                if (ha.colorRun[i] >= 2 && ha.bullish[i] && ha.wickRatio[i] < 1.0) {
                    // 2+ bullish candles with reasonable wicks
                    phases[i] = WyckoffPhase.MARKUP;
                } else if (ha.colorRun[i] >= 2 && !ha.bullish[i] && ha.wickRatio[i] < 1.0) {
                    // 2+ bearish candles with reasonable wicks
                    phases[i] = WyckoffPhase.MARKDOWN;
                } else if (position <= p.accumulationZone()) {
                    phases[i] = WyckoffPhase.ACCUMULATION;
                } else if (position >= p.distributionZone()) {
                    phases[i] = WyckoffPhase.DISTRIBUTION;
                } else {
                    // Use HA direction as tiebreaker
                    if (ha.bullish[i]) {
                        phases[i] = currentStructure == MarketStructure.DOWNTREND ?
                            WyckoffPhase.ACCUMULATION : WyckoffPhase.MARKUP;
                    } else {
                        phases[i] = currentStructure == MarketStructure.UPTREND ?
                            WyckoffPhase.DISTRIBUTION : WyckoffPhase.MARKDOWN;
                    }
                }
            }
        }

        // Fill initial bars
        for (int i = 0; i < p.minConsecutiveCandles() && i < n; i++) {
            phases[i] = phases[min(p.minConsecutiveCandles(), n-1)];
        }

        return phases;
    }

    private boolean checkStrongBullishHA(HeikinAshi ha, int i) {
        // Need consecutive bullish candles with minimal lower wicks
        if (ha.colorRun[i] < p.minConsecutiveCandles() || !ha.bullish[i]) {
            return false;
        }

        // Check wick characteristics for recent candles
        for (int j = max(0, i - p.minConsecutiveCandles() + 1); j <= i; j++) {
            if (!ha.bullish[j]) return false;

            // Check if lower wick is minimal relative to body
            if (ha.body[j] > 0) {
                double lowerWickRatio = ha.lowerWick[j] / ha.body[j];
                if (lowerWickRatio > p.maxWickRatio()) {
                    return false;
                }
            }
        }

        return true;
    }

    private boolean checkStrongBearishHA(HeikinAshi ha, int i) {
        // Need consecutive bearish candles with minimal upper wicks
        if (ha.colorRun[i] < p.minConsecutiveCandles() || ha.bullish[i]) {
            return false;
        }

        // Check wick characteristics for recent candles
        for (int j = max(0, i - p.minConsecutiveCandles() + 1); j <= i; j++) {
            if (ha.bullish[j]) return false;

            // Check if upper wick is minimal relative to body
            if (ha.body[j] > 0) {
                double upperWickRatio = ha.upperWick[j] / ha.body[j];
                if (upperWickRatio > p.maxWickRatio()) {
                    return false;
                }
            }
        }

        return true;
    }

    private boolean checkWickyPattern(HeikinAshi ha, int i) {
        // Check if recent candles have significant wicks on both sides
        int wickyCount = 0;
        int checkBars = min(p.minConsecutiveCandles(), i + 1);

        for (int j = i - checkBars + 1; j <= i; j++) {
            if (j < 0) continue;

            // A wicky candle has significant wicks relative to body
            if (ha.wickRatio[j] > 0.5) { // Total wicks > 50% of body
                wickyCount++;
            }
        }

        return wickyCount >= checkBars / 2; // At least half are wicky
    }

    private double calculateRecentTrend(double[] close, int i) {
        if (i < p.trendLookback()) return 0;

        double recentChange = (close[i] - close[i - p.trendLookback()]) / close[i - p.trendLookback()];
        return recentChange;
    }

    private WyckoffPhase[] smoothPhases(WyckoffPhase[] phases) {
        int n = phases.length;
        WyckoffPhase[] smoothed = phases.clone();

        // Remove single-bar outliers only
        for (int i = 1; i < n - 1; i++) {
            if (phases[i] != phases[i-1] && phases[i] != phases[i+1]) {
                smoothed[i] = phases[i-1];
            }
        }

        // Merge very small segments (less than minPhaseLength)
        int start = 0;
        while (start < n) {
            int end = start;
            while (end < n && smoothed[end] == smoothed[start]) {
                end++;
            }

            int length = end - start;
            if (length < p.minPhaseLength() && length > 0) {
                // Merge with previous phase if possible
                if (start > 0) {
                    for (int i = start; i < end; i++) {
                        smoothed[i] = smoothed[start - 1];
                    }
                }
            }

            start = end;
        }

        return smoothed;
    }

    private List<WyckoffPhase.WyckoffPhaseData> buildPhaseSegments(WyckoffPhase[] phases,
                                                                  String[] timestamps, HeikinAshi ha) {
        List<WyckoffPhase.WyckoffPhaseData> segments = new ArrayList<>();
        int n = phases.length;
        if (n == 0) return segments;

        int segmentStart = 0;
        for (int i = 1; i < n; i++) {
            if (phases[i] != phases[i-1]) {
                segments.add(createPhaseData(segmentStart, i-1, phases[segmentStart],
                                           timestamps, ha));
                segmentStart = i;
            }
        }

        // Add final segment
        segments.add(createPhaseData(segmentStart, n-1, phases[segmentStart],
                                    timestamps, ha));

        return segments;
    }

    private WyckoffPhase.WyckoffPhaseData createPhaseData(int start, int end, WyckoffPhase phase,
                                                         String[] timestamps, HeikinAshi ha) {
        // Calculate confidence based on HA pattern quality
        double avgWickRatio = 0;
        int consecutiveCount = 0;
        boolean lastBullish = ha.bullish[start];

        for (int i = start; i <= end; i++) {
            avgWickRatio += ha.wickRatio[i];
            if (ha.bullish[i] == lastBullish) {
                consecutiveCount++;
            } else {
                lastBullish = ha.bullish[i];
                consecutiveCount = 1;
            }
        }
        avgWickRatio /= (end - start + 1);

        // Calculate confidence
        double confidence = 0.5;
        switch (phase) {
            case MARKUP:
            case MARKDOWN:
                // High confidence if low wick ratio and good color consistency
                if (avgWickRatio < 0.3) {
                    confidence = 0.85;
                } else if (avgWickRatio < 0.5) {
                    confidence = 0.70;
                } else {
                    confidence = 0.55;
                }
                break;

            case ACCUMULATION:
            case DISTRIBUTION:
                // Higher confidence for wicky patterns in consolidation
                if (avgWickRatio > 0.5) {
                    confidence = 0.75;
                } else {
                    confidence = 0.65;
                }
                break;

            default:
                confidence = 0.40;
        }

        String description = String.format("%s phase (%d bars, avg wick ratio: %.2f)",
                                         phase.name(), end - start + 1, avgWickRatio);

        return new WyckoffPhase.WyckoffPhaseData(
            start, end, phase,
            timestamps[start], timestamps[end],
            min(0.95, confidence), description
        );
    }
}
