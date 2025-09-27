package com.vish.fno.ChartsSimulator.analysis;

import com.vish.fno.ChartsSimulator.analysis.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.Candle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for Wyckoff phase analysis operations.
 * This service acts as a facade for different Wyckoff analyzer implementations.
 */
@Service
@RequiredArgsConstructor
public class WyckoffAnalysisService {

    private final WyckoffPhaseAnalyzer analyzer;

    /**
     * Analyzes a series of candles to identify Wyckoff phases.
     *
     * @param candles List of candles to analyze
     * @return List of identified Wyckoff phases with their data
     */
    public List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles) {
        return analyzer.analyzeWyckoffPhases(candles);
    }

    /**
     * Determines the current Wyckoff phase based on recent candles.
     *
     * @param candles List of candles to analyze
     * @return Current Wyckoff phase
     */
    public WyckoffPhase getCurrentPhase(List<Candle> candles) {
        return analyzer.getCurrentPhase(candles);
    }

    /**
     * Gets information about the currently active analyzer.
     *
     * @return String describing the active analyzer
     */
    public String getAnalyzerInfo() {
        return String.format("%s (v%s)", analyzer.getAnalyzerName(), analyzer.getVersion());
    }
}
