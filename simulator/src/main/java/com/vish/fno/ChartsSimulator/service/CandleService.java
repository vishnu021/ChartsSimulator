package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.phaseanalyzer.analysis.WyckoffAnalysisService;
import com.vish.fno.phaseanalyzer.analysis.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.phaseanalyzer.model.Candle;
import com.vish.fno.ChartsSimulator.model.Extrema;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service class for processing candle data and performing extrema analysis.
 * This service provides functionality for fetching candle data, identifying local extrema,
 * and integrating Wyckoff phase analysis for comprehensive market analysis.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Service
@RequiredArgsConstructor
public class CandleService {

    private final DataClient dataClient;
    private final WyckoffAnalysisService wyckoffAnalysisService;

    /**
     * Retrieves candle data for a symbol and date, then performs extrema analysis.
     *
     * @param symbol         Trading symbol (e.g., "NIFTY 50")
     * @param date          Date in string format for data retrieval
     * @param lookbackPeriod Number of periods to look back for local extrema detection
     * @return Extrema object containing candles, maxima, minima, and Wyckoff analysis
     */
    public Extrema getCandleAndExtrema(String symbol, String date, int lookbackPeriod) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        return getExtrema(lookbackPeriod, candles);
    }

    /**
     * Performs comprehensive extrema analysis on provided candle data.
     * Identifies local maxima and minima, and integrates Wyckoff phase analysis.
     *
     * @param lookbackPeriod Number of periods to look back for local extrema detection
     * @param candles       List of candle data to analyze
     * @return Extrema object containing analysis results including:
     *         - Original candle data
     *         - Local maxima points
     *         - Local minima points
     *         - Wyckoff phase data
     *         - Current market phase
     */
    public Extrema getExtrema(int lookbackPeriod, List<Candle> candles) {
        List<Candle> maxima = findLocalExtrema(candles, true, lookbackPeriod);
        List<Candle> minima = findLocalExtrema(candles, false, lookbackPeriod);

        // Calculate Wyckoff phases
        List<WyckoffPhase.WyckoffPhaseData> wyckoffPhases = wyckoffAnalysisService.analyzeWyckoffPhases(candles);
        WyckoffPhase currentPhase = wyckoffAnalysisService.getCurrentPhase(candles);

        return new Extrema(candles, maxima, minima, wyckoffPhases, currentPhase);
    }

    /**
     * Identifies local extrema (maxima or minima) in candle data using a sliding window approach.
     * An extremum is identified when the current point is higher/lower than all neighboring points
     * within the specified order window.
     *
     * @param data       List of candle data to analyze
     * @param findMaxima True to find local maxima, false to find local minima
     * @param order      Number of neighboring points to compare on each side (window size)
     * @return List of candles representing local extrema points
     */
    private List<Candle> findLocalExtrema(List<Candle> data, boolean findMaxima, int order) {
        List<Candle> extrema = new ArrayList<>();
        int size = data.size();

        // Iterate through data, leaving 'order' elements at start and end
        for (int i = order; i < size - order; i++) {
            double current = findMaxima ? data.get(i).high() : data.get(i).low();
            boolean isExtremum = true;

            // Check all neighbors within the order window
            for (int j = i - order; j <= i + order; j++) {
                if (j == i) continue; // Skip the current point
                double neighbor = findMaxima ? data.get(j).high() : data.get(j).low();
                if (findMaxima ? neighbor >= current : neighbor <= current) {
                    isExtremum = false;
                    break;
                }
            }

            if (isExtremum) {
                extrema.add(data.get(i));
            }
        }

        return extrema;
    }
}
