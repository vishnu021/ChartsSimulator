package com.vish.fno.ChartsSimulator.model;

import lombok.Builder;
import lombok.Data;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
public class Extrema implements Serializable {
    private List<Candle> candles;
    private List<Candle> maxima;
    private List<Candle> minima;
}
