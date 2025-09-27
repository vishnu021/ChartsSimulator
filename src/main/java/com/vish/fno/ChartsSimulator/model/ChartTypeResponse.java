package com.vish.fno.ChartsSimulator.model;

import com.vish.fno.ChartsSimulator.analysis.model.WyckoffPhase;

import java.util.List;

public record ChartTypeResponse(
        List<Candle> candlesticks,
        List<Candle> heikinAshi,
        List<WyckoffPhase.WyckoffPhaseData> wyckoffPhases,
        WyckoffPhase currentPhase
) {}
