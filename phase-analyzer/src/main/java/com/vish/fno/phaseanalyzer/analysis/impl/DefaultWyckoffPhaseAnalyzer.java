package com.vish.fno.phaseanalyzer.analysis.impl;

import com.vish.fno.phaseanalyzer.analysis.WyckoffPhaseAnalyzer;
import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;
import com.vish.fno.phaseanalyzer.model.Candle;

import java.util.ArrayList;
import java.util.List;

/**
 * Default implementation of Wyckoff phase analysis.
 * Based on price action and moving average analysis.
 */
public class DefaultWyckoffPhaseAnalyzer implements WyckoffPhaseAnalyzer {

    private static final int MIN_PHASE_LENGTH = 5;   // Shorter phases for more dynamic detection
    private static final int TREND_LOOKBACK = 10;   // More responsive to recent price action
    private static final double STRONG_MOVE_THRESHOLD = 0.008;  // 0.8% for strong moves
    private static final double WEAK_MOVE_THRESHOLD = 0.003;    // 0.3% for weak moves

    @Override
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles.size() < MIN_PHASE_LENGTH * 2) {
            return List.of();
        }

        List<WyckoffPhase.WyckoffPhaseData> phases = new ArrayList<>();

        // Calculate price moving average only (volume not needed)
        List<Double> priceMA = calculateMovingAverage(candles, TREND_LOOKBACK);

        int phaseStart = 0;
        WyckoffPhase currentPhase = WyckoffPhase.UNKNOWN;

        for (int i = TREND_LOOKBACK; i < candles.size() - MIN_PHASE_LENGTH; i++) {
            WyckoffPhase detectedPhase = detectPhaseAtIndex(candles, priceMA, i);

            if (detectedPhase != currentPhase && i - phaseStart >= MIN_PHASE_LENGTH) {
                // End current phase and start new one
                if (currentPhase != WyckoffPhase.UNKNOWN) {
                    phases.add(createPhaseData(candles, phaseStart, i - 1, currentPhase));
                }
                phaseStart = i;
                currentPhase = detectedPhase;
            }
        }

        // Add final phase
        if (currentPhase != WyckoffPhase.UNKNOWN && candles.size() - phaseStart >= MIN_PHASE_LENGTH) {
            phases.add(createPhaseData(candles, phaseStart, candles.size() - 1, currentPhase));
        }

        return phases;
    }

    @Override
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        if (candles.size() < TREND_LOOKBACK) {
            return WyckoffPhase.UNKNOWN;
        }

        List<Double> priceMA = calculateMovingAverage(candles, TREND_LOOKBACK);

        return detectPhaseAtIndex(candles, priceMA, candles.size() - 1);
    }

    @Override
    public String getAnalyzerName() {
        return "Default Wyckoff Phase Analyzer";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    private WyckoffPhase detectPhaseAtIndex(List<Candle> candles, List<Double> priceMA, int index) {
        if (index < TREND_LOOKBACK || index >= candles.size()) {
            return WyckoffPhase.UNKNOWN;
        }

        // Current price and moving average
        double currentPrice = candles.get(index).close();
        // MA array starts from TREND_LOOKBACK-1, so adjust index
        double currentMA = priceMA.get(index - TREND_LOOKBACK);

        // Short and medium term price changes
        double shortTermChange = calculatePriceChangeRate(candles, index, 3);     // 3-period change
        double mediumTermChange = calculatePriceChangeRate(candles, index, 7);    // 7-period change
        double longTermChange = calculatePriceChangeRate(candles, index, TREND_LOOKBACK); // 10-period change

        // Simplified price-based phase classification
        return classifyPhaseByPrice(shortTermChange, mediumTermChange, longTermChange,
                                   currentPrice, currentMA, candles, index);
    }

    private WyckoffPhase classifyPhaseByPrice(double shortTermChange, double mediumTermChange,
                                             double longTermChange, double currentPrice,
                                             double movingAverage, List<Candle> candles, int index) {

        boolean isAboveMA = currentPrice > movingAverage;

        // Trend strength analysis
        boolean isStrongUptrend = shortTermChange > STRONG_MOVE_THRESHOLD &&
                                 mediumTermChange > WEAK_MOVE_THRESHOLD;
        boolean isStrongDowntrend = shortTermChange < -STRONG_MOVE_THRESHOLD &&
                                   mediumTermChange < -WEAK_MOVE_THRESHOLD;
        boolean isUptrend = shortTermChange > WEAK_MOVE_THRESHOLD ||
                           (mediumTermChange > WEAK_MOVE_THRESHOLD && longTermChange > 0);
        boolean isDowntrend = shortTermChange < -WEAK_MOVE_THRESHOLD ||
                             (mediumTermChange < -WEAK_MOVE_THRESHOLD && longTermChange < 0);

        // Sideways movement detection
        boolean isSideways = Math.abs(shortTermChange) <= WEAK_MOVE_THRESHOLD &&
                            Math.abs(mediumTermChange) <= STRONG_MOVE_THRESHOLD;

        // Price momentum analysis
        boolean hasUpwardMomentum = isAboveMA && (shortTermChange > 0 || mediumTermChange > 0);
        boolean hasDownwardMomentum = !isAboveMA && (shortTermChange < 0 || mediumTermChange < 0);

        // Enhanced Wyckoff phase classification
        if (isStrongUptrend) {
            return WyckoffPhase.MARKUP;        // Strong upward movement
        } else if (isStrongDowntrend) {
            return WyckoffPhase.MARKDOWN;      // Strong downward movement
        } else if (isUptrend && hasUpwardMomentum) {
            return WyckoffPhase.MARKUP;        // Moderate uptrend with momentum
        } else if (isDowntrend && hasDownwardMomentum) {
            return WyckoffPhase.MARKDOWN;      // Moderate downtrend with momentum
        } else if (isSideways && isAboveMA) {
            return WyckoffPhase.DISTRIBUTION;  // Consolidation at higher levels
        } else if (isSideways && !isAboveMA) {
            return WyckoffPhase.ACCUMULATION;  // Consolidation at lower levels
        } else if (isAboveMA && !isDowntrend) {
            return WyckoffPhase.DISTRIBUTION;  // Near highs, not declining
        } else if (!isAboveMA && !isUptrend) {
            return WyckoffPhase.ACCUMULATION;  // Near lows, not rising
        }

        return WyckoffPhase.UNKNOWN;
    }

    private double calculatePriceChangeRate(List<Candle> candles, int endIndex, int lookback) {
        if (endIndex < lookback) return 0.0;

        double startPrice = candles.get(endIndex - lookback).close();
        double endPrice = candles.get(endIndex).close();

        return (endPrice - startPrice) / startPrice;
    }

    private List<Double> calculateMovingAverage(List<Candle> candles, int period) {
        List<Double> ma = new ArrayList<>();

        for (int i = period - 1; i < candles.size(); i++) {
            double sum = 0.0;
            for (int j = i - period + 1; j <= i; j++) {
                sum += candles.get(j).close();
            }
            ma.add(sum / period);
        }

        return ma;
    }

    private WyckoffPhase.WyckoffPhaseData createPhaseData(List<Candle> candles, int startIndex, int endIndex,
                                                          WyckoffPhase phase) {
        double confidence = calculatePhaseConfidence(candles, startIndex, endIndex, phase);
        String description = generatePhaseDescription(phase, confidence);

        return new WyckoffPhase.WyckoffPhaseData(
                startIndex,
                endIndex,
                phase,
                candles.get(startIndex).time(),
                candles.get(endIndex).time(),
                confidence,
                description
        );
    }

    private double calculatePhaseConfidence(List<Candle> candles, int startIndex, int endIndex,
                                          WyckoffPhase phase) {
        // Simple confidence calculation based on phase characteristics
        int length = endIndex - startIndex + 1;
        double baseConfidence = Math.min(0.9, length / (double) MIN_PHASE_LENGTH / 5.0);

        // Adjust based on phase-specific criteria
        switch (phase) {
            case ACCUMULATION, DISTRIBUTION:
                // Higher confidence for longer sideways phases
                return Math.min(0.95, baseConfidence + 0.1);
            case MARKUP, MARKDOWN:
                // Confidence based on trend strength
                return Math.min(0.9, baseConfidence);
            default:
                return 0.5;
        }
    }

    private String generatePhaseDescription(WyckoffPhase phase, double confidence) {
        String confidenceLevel = confidence > 0.8 ? "High" : confidence > 0.6 ? "Medium" : "Low";

        return switch (phase) {
            case ACCUMULATION -> String.format("Smart money accumulation phase (%s confidence)", confidenceLevel);
            case MARKUP -> String.format("Bullish markup phase (%s confidence)", confidenceLevel);
            case DISTRIBUTION -> String.format("Smart money distribution phase (%s confidence)", confidenceLevel);
            case MARKDOWN -> String.format("Bearish markdown phase (%s confidence)", confidenceLevel);
            default -> String.format("Unknown phase (%s confidence)", confidenceLevel);
        };
    }
}
