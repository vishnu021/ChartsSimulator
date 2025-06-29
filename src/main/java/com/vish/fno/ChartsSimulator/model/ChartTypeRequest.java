package com.vish.fno.ChartsSimulator.model;

public record ChartTypeRequest(
        String symbol,
        String date,
        String chartTypes
) {}
