package com.vish.fno.ChartsSimulator.model;

public record HeikinAshiCandle(
        String time,
        double open,
        double high,
        double low,
        double close,
        long volume
) {}
