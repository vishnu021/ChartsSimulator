
package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.service.CandleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class CandleController {
    private final CandleService service;

    @GetMapping("/api/ohlc")
    public Extrema getCandles(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(defaultValue = "5") int lookbackPeriod
    ) {
        return service.getExtrema(symbol, date, lookbackPeriod);
    }
}
