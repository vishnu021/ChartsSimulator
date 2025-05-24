package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.service.CandleService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
public class CandleController {
    private final CandleService service;
    public CandleController(CandleService service) {
        this.service = service;
    }

    @GetMapping("/api/ohlc")
    public Map<String, Object> getCandles() {
        return Map.of(
                "candles", service.getCandles(),
                "maxima", service.getMaxima(),
                "minima", service.getMinima()
        );
    }
}
