package com.vish.fno.ChartsSimulator.model;

public record Ticker(
        String time,
        double price,
        long volume,
        String type // BUY, SELL, NEUTRAL
) {}
