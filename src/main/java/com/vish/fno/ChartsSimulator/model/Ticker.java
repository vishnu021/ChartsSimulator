package com.vish.fno.ChartsSimulator.model;

public record Ticker(
        long time,
        double price,
        long volume
) {}
