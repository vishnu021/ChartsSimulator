package com.vish.fno.ChartsSimulator.model;

public record WyckoffPhaseData(
        int startIndex,
        int endIndex,
        WyckoffPhase phase,
        String startTime,
        String endTime,
        double confidence,
        String description
) {}