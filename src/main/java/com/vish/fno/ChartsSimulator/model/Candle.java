package com.vish.fno.ChartsSimulator.model;

public record Candle(
        String time,
        double open,
        double high,
        double low,
        double close,
        long volume,
        long oi
) {}
