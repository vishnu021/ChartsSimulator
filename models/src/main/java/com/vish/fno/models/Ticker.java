package com.vish.fno.models;

public record Ticker(
        String symbol,
        String time,
        double price,
        long volume
) {}
