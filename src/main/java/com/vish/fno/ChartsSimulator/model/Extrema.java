package com.vish.fno.ChartsSimulator.model;

import java.util.List;

public record Extrema (List<Candle> candles, List<Candle> maxima, List<Candle> minima) {}
