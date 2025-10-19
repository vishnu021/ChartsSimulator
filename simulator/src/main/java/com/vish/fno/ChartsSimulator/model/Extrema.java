package com.vish.fno.ChartsSimulator.model;

import com.vish.fno.models.Candle;
import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;

import java.util.List;

public record Extrema (
        List<Candle> candles,
        List<Candle> maxima,
        List<Candle> minima,
        List<WyckoffPhase.WyckoffPhaseData> wyckoffPhases,
        WyckoffPhase currentPhase
) {}
