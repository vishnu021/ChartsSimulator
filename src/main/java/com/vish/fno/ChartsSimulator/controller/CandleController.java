package com.vish.fno.ChartsSimulator.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.service.CandleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class CandleController {

    private final CandleService service;

    @GetMapping("/api/ohlc")
    public Extrema getCandlesOld() throws IOException {
        Extrema extrema = service.getExtrema("NIFTY 50", 5);
        log.info("extrema: {}", new ObjectMapper().disable(SerializationFeature.FAIL_ON_EMPTY_BEANS).writeValueAsString(extrema));
        return extrema;
    }
}
