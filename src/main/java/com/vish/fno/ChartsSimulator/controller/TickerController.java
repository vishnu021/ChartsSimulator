package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.Ticker;
import com.vish.fno.ChartsSimulator.service.TickerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class TickerController {
    private final TickerService tickerService;

    @GetMapping("/api/ticker")
    public List<Ticker> getTickerData(
            @RequestParam String symbol,
            @RequestParam String date
    ) {
        return tickerService.getTickerData(symbol, date);
    }
}
