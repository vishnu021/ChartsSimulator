package com.vish.fno.ChartsSimulator.controller;

import com.vish.fno.ChartsSimulator.model.FuturesAnalysis;
import com.vish.fno.ChartsSimulator.service.FuturesAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for futures analysis operations
 */
@RestController
@RequestMapping("/api/futures")
@RequiredArgsConstructor
public class FuturesController {

    private final FuturesAnalysisService futuresAnalysisService;

    /**
     * Analyze a symbol to determine if it's a futures contract
     * @param symbol Symbol to analyze (e.g., "NIFTY25SEPFUT")
     * @return Futures analysis result
     */
    @GetMapping("/analyze/{symbol}")
    public ResponseEntity<FuturesAnalysis> analyzeSymbol(@PathVariable String symbol) {
        FuturesAnalysis analysis = futuresAnalysisService.analyzeFuturesSymbol(symbol);
        return ResponseEntity.ok(analysis);
    }

    /**
     * Generate futures symbol for given parameters
     * @param underlyingSymbol Base symbol (e.g., "NIFTY 50")
     * @param month Month name or number
     * @param year Year (e.g., 2025)
     * @return Generated futures symbol
     */
    @GetMapping("/generate")
    public ResponseEntity<String> generateSymbol(
            @RequestParam String underlyingSymbol,
            @RequestParam String month,
            @RequestParam int year) {
        String futuresSymbol = futuresAnalysisService.generateFuturesSymbol(underlyingSymbol, month, year);
        return ResponseEntity.ok(futuresSymbol);
    }

    /**
     * Get available futures contracts for an underlying symbol
     * @param underlyingSymbol Base symbol
     * @param months Number of months ahead to generate (default 3)
     * @return List of futures symbols
     */
    @GetMapping("/contracts/{underlyingSymbol}")
    public ResponseEntity<List<String>> getAvailableContracts(
            @PathVariable String underlyingSymbol,
            @RequestParam(defaultValue = "3") int months) {
        System.out.println("🔍 FuturesController /api/futures/contracts - Received Request:");
        System.out.println("   Underlying Symbol: " + underlyingSymbol);
        System.out.println("   Months: " + months);

        List<String> contracts = futuresAnalysisService.getAvailableFuturesContracts(underlyingSymbol, months);

        System.out.println("🔍 FuturesController /api/futures/contracts - Response:");
        System.out.println("   Available Contracts: " + contracts);
        System.out.println("   Contracts count: " + (contracts != null ? contracts.size() : 0));

        return ResponseEntity.ok(contracts);
    }

    /**
     * Check if symbol has futures mapping
     * @param symbol Symbol to check
     * @return Mapping status
     */
    @GetMapping("/mapping/{symbol}")
    public ResponseEntity<Map<String, Boolean>> checkMapping(@PathVariable String symbol) {
        boolean hasMapping = futuresAnalysisService.hasFuturesMapping(symbol);
        return ResponseEntity.ok(Map.of("hasMapping", hasMapping));
    }
}