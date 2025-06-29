package com.vish.fno.ChartsSimulator.model;

public record TickerRequest(
        String symbol,
        String date,
        String startTime,
        String endTime
) {}
