package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.model.WyckoffPhase;
import com.vish.fno.ChartsSimulator.model.WyckoffPhaseData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CandleService {

    private final DataClient dataClient;
    private final WyckoffAnalysisService wyckoffAnalysisService;

    public Extrema getCandleAndExtrema(String symbol, String date, int lookbackPeriod) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        return getExtrema(lookbackPeriod, candles);
    }

    public Extrema getExtrema(int lookbackPeriod, List<Candle> candles) {
        List<Candle> maxima = findLocalExtrema(candles, true, lookbackPeriod);
        List<Candle> minima = findLocalExtrema(candles, false, lookbackPeriod);

        // Calculate Wyckoff phases
        List<WyckoffPhaseData> wyckoffPhases = wyckoffAnalysisService.analyzeWyckoffPhases(candles);
        WyckoffPhase currentPhase = wyckoffAnalysisService.getCurrentPhase(candles);

        return new Extrema(candles, maxima, minima, wyckoffPhases, currentPhase);
    }

    private List<Candle> findLocalExtrema(List<Candle> data, boolean findMaxima, int order) {
        List<Candle> extrema = new ArrayList<>();
        int size = data.size();

        for (int i = order; i < size - order; i++) {
            double current = findMaxima ? data.get(i).high() : data.get(i).low();
            boolean isExtremum = true;

            for (int j = i - order; j <= i + order; j++) {
                if (j == i) continue;
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
