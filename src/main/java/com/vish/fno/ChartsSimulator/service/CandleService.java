package com.vish.fno.ChartsSimulator.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.client.DataClient;
import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.Extrema;
import com.vish.fno.ChartsSimulator.util.FileHandler;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class CandleService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final DataClient dataClient;

    public CandleService(DataClient dataClient) {
        this.dataClient = dataClient;
    }

    /**
     * Loads candle data from the given classpath resource (e.g., "NIFTY_50.txt"),
     * computes local maxima and minima with the specified lookback period,
     * and returns an Extrema object containing the results.
     *
     * @param symbol      name of the file on the classpath
     * @param lookbackPeriod number of neighbors to consider on each side
     */
    public Extrema getExtrema(String symbol, String date, int lookbackPeriod) {
        List<Candle> candles = dataClient.getCandleData(symbol, date);
        List<Candle> maxima = findLocalExtrema(candles, true, lookbackPeriod);
        List<Candle> minima = findLocalExtrema(candles, false, lookbackPeriod);

        // Return results
        return Extrema.builder()
                .candles(candles)
                .maxima(maxima)
                .minima(minima)
                .build();
    }


    /**
     * Detects local maxima (using candle.high) or minima (using candle.low)
     * by comparing each point against neighbors within the window defined by 'order'.
     */
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
