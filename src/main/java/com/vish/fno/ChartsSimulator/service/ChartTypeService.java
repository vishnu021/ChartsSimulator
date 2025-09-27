package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.analysis.WyckoffAnalysisService;
import com.vish.fno.ChartsSimulator.analysis.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.ChartTypeResponse;
import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.util.CandleAggregator;
import com.vish.fno.ChartsSimulator.util.HeikinAshi;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@AllArgsConstructor
@Component
public class ChartTypeService {

    private final DataClient dataClient;
    private final DataLoaderService dataLoaderService;
    private final WyckoffAnalysisService wyckoffAnalysisService;

    public ChartTypeResponse getChartData(String symbol, String date, String chartTypes) {
        List<Candle> candles;

        // Try to get data from external API first, fallback to local data processing
        try {
            candles = dataClient.getCandleData(symbol, date);
            if (candles.isEmpty()) {
                throw new RuntimeException("External API returned empty candles");
            }
            log.info("Successfully loaded {} candles from external API for symbol: {}, date: {}",
                candles.size(), symbol, date);
        } catch (Exception e) {
            log.warn("Failed to load from external API for symbol: {}, date: {}. Using local tick data processing. Error: {}",
                symbol, date, e.getMessage());

            // Fallback to local tick data processing
            candles = getLocalCandleData(symbol, date, 5); // Default 5-minute candles
        }

        // Ensure we always have both candlesticks and Heikin Ashi data
        List<Candle> haCandles = HeikinAshi.getCandles(candles);

        // If original candles are still empty, try generating from Heikin Ashi
        if (candles.isEmpty() && !haCandles.isEmpty()) {
            log.info("Using Heikin Ashi data as base for candlesticks for symbol: {}, date: {}", symbol, date);
            candles = haCandles; // This ensures we show something in candlestick format
        }

        // Calculate Wyckoff phases
        List<WyckoffPhase.WyckoffPhaseData> wyckoffPhases = wyckoffAnalysisService.analyzeWyckoffPhases(
            !candles.isEmpty() ? candles : haCandles
        );
        WyckoffPhase currentPhase = wyckoffAnalysisService.getCurrentPhase(
            !candles.isEmpty() ? candles : haCandles
        );

        log.info("Returning chart data: {} candles, {} Heikin Ashi candles for symbol: {}, date: {}",
            candles.size(), haCandles.size(), symbol, date);

        return new ChartTypeResponse(candles, haCandles, wyckoffPhases, currentPhase);
    }

    /**
     * Get candle data from local tick data processing
     */
    private List<Candle> getLocalCandleData(String symbol, String date, int periodMinutes) {
        try {
            List<StockTicker> tickers = dataLoaderService.getTickersForDateAndSymbol(date, symbol);

            if (tickers.isEmpty()) {
                log.warn("No tick data found for symbol: {}, date: {}", symbol, date);
                return List.of();
            }

            List<Candle> candles = CandleAggregator.convertTicksToCandles(tickers, periodMinutes);
            log.info("Converted {} tickers to {} candles ({}min periods) for symbol: {}, date: {}",
                tickers.size(), candles.size(), periodMinutes, symbol, date);

            return candles;
        } catch (Exception e) {
            log.error("Failed to process local tick data for symbol: {}, date: {}", symbol, date, e);
            return List.of();
        }
    }

    public List<ChartTypeResponse> getChartDataStream(String symbol, String date, String s) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        List<Candle> haCandles = HeikinAshi.getCandles(candles);

        // Calculate Wyckoff phases for streaming
        List<WyckoffPhase.WyckoffPhaseData> wyckoffPhases = wyckoffAnalysisService.analyzeWyckoffPhases(candles);
        WyckoffPhase currentPhase = wyckoffAnalysisService.getCurrentPhase(candles);

        return List.of(new ChartTypeResponse(candles, haCandles, wyckoffPhases, currentPhase));
    }
}
