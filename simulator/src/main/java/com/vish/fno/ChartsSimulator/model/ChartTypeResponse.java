package com.vish.fno.ChartsSimulator.model;

import com.vish.fno.models.Candle;
import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;

import java.util.List;

public record ChartTypeResponse(
        List<Candle> candlesticks,
        List<Candle> heikinAshi,
        List<WyckoffPhase.WyckoffPhaseData> wyckoffPhases,
        WyckoffPhase currentPhase
) {}
