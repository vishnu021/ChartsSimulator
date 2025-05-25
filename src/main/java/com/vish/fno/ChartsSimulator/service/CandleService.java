package com.vish.fno.ChartsSimulator.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.model.Candle;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Service
public class CandleService {
    private List<Candle> candles;
    private List<Candle> maxima;
    private List<Candle> minima;

    private final int lookbackPeriod = 5;

    @PostConstruct
    public void init() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ClassPathResource resource = new ClassPathResource("NIFTY_50.txt");
        try (InputStream is = resource.getInputStream()) {
            candles = mapper.readValue(is, new TypeReference<List<Candle>>() {});
        }

        candles = candles.stream()
                .sorted(Comparator.comparing(Candle::time))
                .collect(Collectors.toList());

        maxima = findLocalExtrema(candles, true, lookbackPeriod);
        minima = findLocalExtrema(candles, false, lookbackPeriod);
    }

    /**
     * Detects local maxima (using candle high) or minima (using candle low)
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
