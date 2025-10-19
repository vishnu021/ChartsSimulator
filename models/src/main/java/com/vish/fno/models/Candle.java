package com.vish.fno.models;

public record Candle(
        String time,
        double open,
        double high,
        double low,
        double close,
        long volume,
        long oi
) {}
