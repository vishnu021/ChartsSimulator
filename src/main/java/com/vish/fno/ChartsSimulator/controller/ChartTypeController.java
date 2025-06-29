// src/main/java/com/vish/fno/ChartsSimulator/controller/ChartTypeController.java
package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.ChartTypeResponse;
import com.vish.fno.ChartsSimulator.service.ChartTypeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

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
        return chartTypeService.getChartData(symbol, date, chartTypes);
    }
}
