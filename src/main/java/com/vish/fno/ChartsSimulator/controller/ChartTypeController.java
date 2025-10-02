package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.ChartTypeResponse;
import com.vish.fno.ChartsSimulator.service.ChartTypeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequiredArgsConstructor
public class ChartTypeController {
    private final ChartTypeService chartTypeService;

    @GetMapping("/api/charts")
    public ChartTypeResponse getChartData(
            @RequestParam String symbol,
            @RequestParam String date,
            @RequestParam(defaultValue = "CANDLESTICK,HEIKIN_ASHI") String chartTypes
    ) {
        log.info("🔍 ChartTypeController /api/charts - Received Request:");
        log.info("   Symbol: {}", symbol);
        log.info("   Date: {}", date);
        log.info("   Chart Types: {}", chartTypes);

        ChartTypeResponse result = chartTypeService.getChartData(symbol, date, chartTypes);

        log.info("🔍 ChartTypeController /api/charts - Response:");
        log.info("   Candlesticks count: {}", (result.candlesticks() != null ? result.candlesticks().size() : 0));
        log.info("   Heikin Ashi count: {}", (result.heikinAshi() != null ? result.heikinAshi().size() : 0));
        log.info("   Wyckoff Phases count: {}", (result.wyckoffPhases() != null ? result.wyckoffPhases().size() : 0));

        return result;
    }
}
