package com.vish.fno.ChartsSimulator.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.model.Candle;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;


@Service
public class CandleService {
    private List<Candle> candles;
    private List<Candle> maxima;
    private List<Candle> minima;

    @PostConstruct
    public void init() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        // Load file from classpath
        ClassPathResource resource = new ClassPathResource("NIFTY_50.txt");
        try (InputStream is = resource.getInputStream()) {
            // Read entire content as a List<Candle>
            candles = mapper.readValue(is, new TypeReference<List<Candle>>(){});
        }
        // Ensure sorted by time
        candles = candles.stream()
                .sorted(Comparator.comparing(Candle::time))
                .collect(Collectors.toList());

        // Compute extrema
        maxima = findExtrema(candles, true);
        minima = findExtrema(candles, false);
    }

    private List<Candle> findExtrema(List<Candle> data, boolean high) {
        List<Candle> out = new ArrayList<>();
        for (int i = 1; i < data.size() - 1; i++) {
            double v    = data.get(i).close();
            double prev = data.get(i - 1).close();
            double next = data.get(i + 1).close();
            if (high ? (v > prev && v > next) : (v < prev && v < next)) {
                out.add(data.get(i));
            }
        }
        return out;
    }

    public List<Candle> getCandles() { return candles; }
    public List<Candle> getMaxima() { return maxima; }
    public List<Candle> getMinima() { return minima; }
}
