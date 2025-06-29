package com.vish.fno.ChartsSimulator.model;

import java.util.List;

public record ChartTypeResponse(
        List<Candle> candlesticks,
        List<Candle> heikinAshi
) {}
