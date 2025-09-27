package com.vish.fno.ChartsSimulator.analysis.model;

import lombok.Getter;

@Getter
public enum WyckoffPhase {
    ACCUMULATION("Accumulation", "#4CAF50"),
    MARKUP("Markup", "#2196F3"),
    DISTRIBUTION("Distribution", "#FF9800"),
    MARKDOWN("Markdown", "#F44336"),
    UNKNOWN("Unknown", "#9E9E9E");

    private final String displayName;
    private final String color;

    WyckoffPhase(String displayName, String color) {
        this.displayName = displayName;
        this.color = color;
    }

    public static record WyckoffPhaseData(
            int startIndex,
            int endIndex,
            WyckoffPhase phase,
            String startTime,
            String endTime,
            double confidence,
            String description
    ) {}
}
