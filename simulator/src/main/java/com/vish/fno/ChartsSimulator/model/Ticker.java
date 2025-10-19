package com.vish.fno.ChartsSimulator.model;

public record Ticker(
        String symbol,
        String time,
        double price,
        long volume
) {}
