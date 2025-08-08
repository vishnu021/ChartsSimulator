package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.ChartTypeResponse;
import com.vish.fno.ChartsSimulator.service.ChartTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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
        return chartTypeService.getChartData(symbol, date, chartTypes);
    }
}
