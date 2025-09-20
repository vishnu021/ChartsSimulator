package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.WyckoffPhaseData;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class WyckoffAnalysisService {

    private static final int MIN_PHASE_LENGTH = 8;  // Shorter minimum phase length
    private static final int TREND_LOOKBACK = 15;  // Shorter lookback for more responsive detection
    private static final double VOLUME_THRESHOLD_MULTIPLIER = 1.15;  // Lower volume threshold

    public List<WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        if (candles.size() < MIN_PHASE_LENGTH * 2) {
            return List.of();
        }

        List<WyckoffPhaseData> phases = new ArrayList<>();

        // Calculate moving averages and volume metrics
        List<Double> priceMA = calculateMovingAverage(candles, TREND_LOOKBACK);
        List<Double> volumeMA = calculateVolumeMovingAverage(candles, TREND_LOOKBACK);

        int phaseStart = 0;
        WyckoffPhase currentPhase = WyckoffPhase.UNKNOWN;

        for (int i = TREND_LOOKBACK; i < candles.size() - MIN_PHASE_LENGTH; i++) {
            WyckoffPhase detectedPhase = detectPhaseAtIndex(candles, priceMA, volumeMA, i);

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

    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        if (candles.size() < TREND_LOOKBACK) {
            return WyckoffPhase.UNKNOWN;
        }

        List<Double> priceMA = calculateMovingAverage(candles, TREND_LOOKBACK);
        List<Double> volumeMA = calculateVolumeMovingAverage(candles, TREND_LOOKBACK);

        return detectPhaseAtIndex(candles, priceMA, volumeMA, candles.size() - 1);
    }

    private WyckoffPhase detectPhaseAtIndex(List<Candle> candles, List<Double> priceMA,
                                          List<Double> volumeMA, int index) {
        if (index < TREND_LOOKBACK || index >= candles.size()) {
            return WyckoffPhase.UNKNOWN;
        }

        // Current metrics
        double currentPrice = candles.get(index).close();
        double currentMA = priceMA.get(index - TREND_LOOKBACK);
        double currentVolume = candles.get(index).volume();
        double avgVolume = volumeMA.get(index - TREND_LOOKBACK);

        // Trend analysis
        double priceChange = calculatePriceChangeRate(candles, index, TREND_LOOKBACK / 2);
        double volumeRatio = currentVolume / Math.max(avgVolume, 1.0);

        // Phase detection logic
        return classifyPhase(priceChange, volumeRatio, currentPrice, currentMA);
    }

    private WyckoffPhase classifyPhase(double priceChange, double volumeRatio,
                                     double currentPrice, double movingAverage) {
        boolean isAboveMA = currentPrice > movingAverage;
        boolean isRising = priceChange > 0.015; // 1.5% threshold - more sensitive
        boolean isFalling = priceChange < -0.015; // -1.5% threshold - more sensitive
        boolean isHighVolume = volumeRatio > VOLUME_THRESHOLD_MULTIPLIER;
        boolean isLowVolume = volumeRatio < (1.0 / VOLUME_THRESHOLD_MULTIPLIER);

        // Wyckoff phase classification - prioritize trending phases
        if (isRising && (isHighVolume || isAboveMA)) {
            // Rising price with either high volume OR above MA
            return WyckoffPhase.MARKUP;
        } else if (isFalling && (isHighVolume || !isAboveMA)) {
            // Falling price with either high volume OR below MA
            return WyckoffPhase.MARKDOWN;
        } else if (isLowVolume && Math.abs(priceChange) < 0.01) {
            // Low volume, sideways movement
            return isAboveMA ? WyckoffPhase.DISTRIBUTION : WyckoffPhase.ACCUMULATION;
        } else if (isAboveMA && !isFalling) {
            // Above MA, not falling - potential distribution
            return WyckoffPhase.DISTRIBUTION;
        } else if (!isAboveMA && !isRising) {
            // Below MA, not rising - potential accumulation
            return WyckoffPhase.ACCUMULATION;
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

    private List<Double> calculateVolumeMovingAverage(List<Candle> candles, int period) {
        List<Double> ma = new ArrayList<>();

        for (int i = period - 1; i < candles.size(); i++) {
            double sum = 0.0;
            for (int j = i - period + 1; j <= i; j++) {
                sum += candles.get(j).volume();
            }
            ma.add(sum / period);
        }

        return ma;
    }

    private WyckoffPhaseData createPhaseData(List<Candle> candles, int startIndex, int endIndex,
                                           WyckoffPhase phase) {
        double confidence = calculatePhaseConfidence(candles, startIndex, endIndex, phase);
        String description = generatePhaseDescription(phase, confidence);

        return new WyckoffPhaseData(
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