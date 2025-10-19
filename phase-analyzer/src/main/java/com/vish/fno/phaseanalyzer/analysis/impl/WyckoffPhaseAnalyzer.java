package com.vish.fno.phaseanalyzer.analysis.impl;

import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;
import com.vish.fno.models.Candle;

import java.util.List;

/**
 * Interface for Wyckoff phase analysis implementations.
 * Provides a contract for analyzing market phases based on Wyckoff methodology.
 */
public interface WyckoffPhaseAnalyzer {

    /**
     * Analyzes a series of candles to identify Wyckoff phases.
     *
     * @param candles List of candles to analyze
     * @return List of identified Wyckoff phases with their data
     */
    List<WyckoffPhase.WyckoffPhaseData> analyzeWyckoffPhases(List<Candle> candles);

    /**
     * Determines the current Wyckoff phase based on recent candles.
     *
     * @param candles List of candles to analyze
     * @return Current Wyckoff phase
     */
    WyckoffPhase getCurrentPhase(List<Candle> candles);

    /**
     * Returns the name/identifier of this analyzer implementation.
     *
     * @return Analyzer implementation name
     */
    String getAnalyzerName();

    /**
     * Returns the version of this analyzer implementation.
     *
     * @return Analyzer version
     */
    String getVersion();
}
