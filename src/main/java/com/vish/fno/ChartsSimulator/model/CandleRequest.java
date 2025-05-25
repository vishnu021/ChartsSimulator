package com.vish.fno.ChartsSimulator.model;

public record CandleRequest(
        String symbol,
        String date,
        int lookbackPeriod
) {}
