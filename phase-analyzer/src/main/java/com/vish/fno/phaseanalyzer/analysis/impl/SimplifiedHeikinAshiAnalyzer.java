package com.vish.fno.phaseanalyzer.analysis.impl;

import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;
import com.vish.fno.models.Candle;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;

import java.util.*;
import static java.lang.Math.*;

/**
 * Simplified Heikin-Ashi Wyckoff Analyzer
 *
 * Ultra-simple phase detection based purely on Heikin-Ashi patterns:
 *
 * MARKUP: Consecutive bullish candles going up (minimal lower wicks)
 * MARKDOWN: Consecutive bearish candles going down (minimal upper wicks)
 * ACCUMULATION: Mixed/wicky patterns at market lows
 * DISTRIBUTION: Mixed/wicky patterns at market highs
 *
 * No complex calculations - just pure HA pattern recognition
 */
@RequiredArgsConstructor
public class SimplifiedHeikinAshiAnalyzer implements WyckoffPhaseAnalyzer {

    private final Params p;

    @Getter
    @Accessors(fluent = true)
    public static class Params {
        // Core parameters
        private int minTrendCandles = 2;           // Minimum consecutive candles for trend
        private double maxWickBodyRatio = 0.5;     // Max wick/body ratio (50%)
        private int lookbackForPosition = 50;      // Bars to determine if at highs/lows
        private double positionThreshold = 0.3;    // 30% from high/low
        private int minBars = 20;                  // Minimum bars to analyze
    }

    private static class HA {
        double[] open, high, low, close;
        boolean[] isBullish;
        double[] bodySize;
        double[] upperWick, lowerWick;
        int consecutiveCount;
        boolean lastWasBullish;

        HA(int size) {
            open = new double[size];
            high = new double[size];
            low = new double[size];
            close = new double[size];
            isBullish = new boolean[size];
            bodySize = new double[size];
            upperWick = new double[size];
            lowerWick = new double[size];
        }
    }

    @Override
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles == null || candles.size() < p.minBars()) return List.of();

        int n = candles.size();
        double[] o = new double[n], h = new double[n], l = new double[n], c = new double[n];
        String[] timestamps = new String[n];

        for (int i = 0; i < n; i++) {
            Candle candle = candles.get(i);
            o[i] = candle.open();
            h[i] = candle.high();
            l[i] = candle.low();
            c[i] = candle.close();
            timestamps[i] = String.valueOf(i);
        }

        // Calculate Heikin-Ashi
        HA ha = calculateHA(o, h, l, c);

        // Detect phases with ultra-simple logic
        WyckoffPhase[] phases = detectPhases(ha, c);

        // Build segments
        return buildSegments(phases, timestamps, ha);
    }

    private HA calculateHA(double[] o, double[] h, double[] l, double[] c) {
        int n = o.length;
        HA ha = new HA(n);

        // First candle
        ha.close[0] = (o[0] + h[0] + l[0] + c[0]) / 4.0;
        ha.open[0] = (o[0] + c[0]) / 2.0;
        ha.high[0] = h[0];
        ha.low[0] = l[0];
        calculateMetrics(ha, 0);

        // Rest of candles
        for (int i = 1; i < n; i++) {
            // HA formulas
            ha.close[i] = (o[i] + h[i] + l[i] + c[i]) / 4.0;
            ha.open[i] = (ha.open[i-1] + ha.close[i-1]) / 2.0;
            ha.high[i] = max(h[i], max(ha.open[i], ha.close[i]));
            ha.low[i] = min(l[i], min(ha.open[i], ha.close[i]));

            calculateMetrics(ha, i);
        }

        return ha;
    }

    private void calculateMetrics(HA ha, int i) {
        // Body and direction
        ha.bodySize[i] = abs(ha.close[i] - ha.open[i]);
        ha.isBullish[i] = ha.close[i] > ha.open[i];

        // Wicks
        double bodyTop = max(ha.open[i], ha.close[i]);
        double bodyBottom = min(ha.open[i], ha.close[i]);
        ha.upperWick[i] = ha.high[i] - bodyTop;
        ha.lowerWick[i] = bodyBottom - ha.low[i];
    }

    private WyckoffPhase[] detectPhases(HA ha, double[] close) {
        int n = close.length;
        WyckoffPhase[] phases = new WyckoffPhase[n];

        for (int i = 0; i < n; i++) {
            phases[i] = determinePhase(ha, close, i);
        }

        // Smooth out noise
        smoothPhases(phases);

        return phases;
    }

    private WyckoffPhase determinePhase(HA ha, double[] close, int i) {
        // Count consecutive same-colored candles
        int consecutiveSame = 1;
        boolean currentBullish = ha.isBullish[i];

        for (int j = i - 1; j >= 0 && j >= i - p.minTrendCandles() + 1; j--) {
            if (ha.isBullish[j] == currentBullish) {
                consecutiveSame++;
            } else {
                break;
            }
        }

        // Check wick patterns
        boolean hasMinimalLowerWick = ha.bodySize[i] > 0 &&
                                      ha.lowerWick[i] / ha.bodySize[i] < p.maxWickBodyRatio();
        boolean hasMinimalUpperWick = ha.bodySize[i] > 0 &&
                                      ha.upperWick[i] / ha.bodySize[i] < p.maxWickBodyRatio();
        boolean isWicky = ha.bodySize[i] > 0 &&
                         (ha.upperWick[i] + ha.lowerWick[i]) / ha.bodySize[i] > 1.0;

        // Determine position in recent range (simple)
        double position = getMarketPosition(close, i);
        boolean atLows = position < p.positionThreshold();
        boolean atHighs = position > (1.0 - p.positionThreshold());

        // ULTRA-SIMPLE PHASE LOGIC:

        // 1. Strong bullish trend = MARKUP
        if (consecutiveSame >= p.minTrendCandles() && currentBullish && hasMinimalLowerWick) {
            return WyckoffPhase.MARKUP;
        }

        // 2. Strong bearish trend = MARKDOWN
        if (consecutiveSame >= p.minTrendCandles() && !currentBullish && hasMinimalUpperWick) {
            return WyckoffPhase.MARKDOWN;
        }

        // 3. Wicky or changing colors = consolidation
        if (isWicky || consecutiveSame < p.minTrendCandles()) {
            // At lows = ACCUMULATION
            if (atLows) {
                return WyckoffPhase.ACCUMULATION;
            }
            // At highs = DISTRIBUTION
            if (atHighs) {
                return WyckoffPhase.DISTRIBUTION;
            }
            // Middle = check direction bias
            if (currentBullish) {
                return position < 0.5 ? WyckoffPhase.ACCUMULATION : WyckoffPhase.DISTRIBUTION;
            } else {
                return position > 0.5 ? WyckoffPhase.DISTRIBUTION : WyckoffPhase.ACCUMULATION;
            }
        }

        // 4. Default: use HA color and position
        if (currentBullish) {
            return atHighs ? WyckoffPhase.DISTRIBUTION : WyckoffPhase.MARKUP;
        } else {
            return atLows ? WyckoffPhase.ACCUMULATION : WyckoffPhase.MARKDOWN;
        }
    }

    private double getMarketPosition(double[] close, int i) {
        if (i < p.lookbackForPosition()) {
            return 0.5; // Default to middle if not enough data
        }

        double high = close[i];
        double low = close[i];

        for (int j = i - p.lookbackForPosition() + 1; j <= i; j++) {
            high = max(high, close[j]);
            low = min(low, close[j]);
        }

        double range = high - low;
        if (range == 0) return 0.5;

        return (close[i] - low) / range;
    }

    private void smoothPhases(WyckoffPhase[] phases) {
        if (phases.length < 3) return;

        // Remove single-bar outliers
        for (int i = 1; i < phases.length - 1; i++) {
            if (phases[i] != phases[i-1] && phases[i] != phases[i+1]) {
                phases[i] = phases[i-1];
            }
        }
    }

    private List<WyckoffPhase.WyckoffPhaseData> buildSegments(WyckoffPhase[] phases,
                                                              String[] timestamps, HA ha) {
        List<WyckoffPhase.WyckoffPhaseData> segments = new ArrayList<>();
        if (phases.length == 0) return segments;

        int start = 0;
        for (int i = 1; i < phases.length; i++) {
            if (phases[i] != phases[i-1]) {
                segments.add(createSegment(start, i-1, phases[start], timestamps, ha));
                start = i;
            }
        }
        segments.add(createSegment(start, phases.length-1, phases[start], timestamps, ha));

        return segments;
    }

    private WyckoffPhase.WyckoffPhaseData createSegment(int start, int end,
                                                        WyckoffPhase phase,
                                                        String[] timestamps, HA ha) {
        // Calculate segment metrics
        int bullishCount = 0;
        double avgWickRatio = 0;

        for (int i = start; i <= end; i++) {
            if (ha.isBullish[i]) bullishCount++;
            if (ha.bodySize[i] > 0) {
                avgWickRatio += (ha.upperWick[i] + ha.lowerWick[i]) / ha.bodySize[i];
            }
        }

        int length = end - start + 1;
        avgWickRatio /= length;
        double bullishPct = 100.0 * bullishCount / length;

        // Confidence based on pattern clarity
        double confidence = calculateConfidence(phase, bullishPct, avgWickRatio);

        String description = String.format("%s (%d bars, %.0f%% bullish, wick ratio: %.2f)",
                                          phase.name(), length, bullishPct, avgWickRatio);

        return new WyckoffPhase.WyckoffPhaseData(
            start, end, phase,
            timestamps[start], timestamps[end],
            confidence, description
        );
    }

    private double calculateConfidence(WyckoffPhase phase, double bullishPct, double wickRatio) {
        switch (phase) {
            case MARKUP:
                // High confidence if mostly bullish with low wicks
                if (bullishPct > 80 && wickRatio < 0.5) return 0.90;
                if (bullishPct > 60 && wickRatio < 1.0) return 0.70;
                return 0.50;

            case MARKDOWN:
                // High confidence if mostly bearish with low wicks
                if (bullishPct < 20 && wickRatio < 0.5) return 0.90;
                if (bullishPct < 40 && wickRatio < 1.0) return 0.70;
                return 0.50;

            case ACCUMULATION:
            case DISTRIBUTION:
                // High confidence if wicky/mixed
                if (wickRatio > 1.0) return 0.80;
                if (bullishPct > 40 && bullishPct < 60) return 0.75;
                return 0.60;

            default:
                return 0.40;
        }
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        var segments = analyzeWyckoffPhases(candles);
        return segments.isEmpty() ? WyckoffPhase.UNKNOWN :
               segments.get(segments.size() - 1).phase();
    }

    @Override
    public String getAnalyzerName() {
        return "SimplifiedHeikinAshiAnalyzer";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }
}
