package com.vish.fno.ChartsSimulator.model;

public record Ticker(
        String time,
        double price,
        long volume
) {}
