package com.vish.fno.models;

public record CandleRequest(
        String symbol,
        String date,
        int lookbackPeriod,
        Integer customDelay  // Custom delay in milliseconds (optional, null uses default)
) {}
