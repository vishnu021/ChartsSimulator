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

    private static final int LOOKBACK_PERIOD = 10; // Configurable lookback period

    @PostConstruct
    public void init() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ClassPathResource resource = new ClassPathResource("NIFTY_50.txt");
        try (InputStream is = resource.getInputStream()) {
            candles = mapper.readValue(is, new TypeReference<List<Candle>>(){});
        }

        candles = candles.stream()
                .sorted(Comparator.comparing(Candle::time))
                .collect(Collectors.toList());

        // Use improved extrema detection
        maxima = findExtremaImproved(candles, true);
        minima = findExtremaImproved(candles, false);
    }

    /**
     * Improved extrema detection using a configurable lookback period
     * A point is considered a local maximum if it's the highest point
     * within LOOKBACK_PERIOD candles on both sides
     */
    private List<Candle> findExtremaImproved(List<Candle> data, boolean findMaxima) {
        List<Candle> extrema = new ArrayList<>();

        for (int i = LOOKBACK_PERIOD; i < data.size() - LOOKBACK_PERIOD; i++) {
            double currentValue = data.get(i).close();
            boolean isExtremum = true;

            // Check left side
            for (int j = i - LOOKBACK_PERIOD; j < i; j++) {
                if (findMaxima) {
                    if (data.get(j).close() >= currentValue) {
                        isExtremum = false;
                        break;
                    }
                } else {
                    if (data.get(j).close() <= currentValue) {
                        isExtremum = false;
                        break;
                    }
                }
            }

            // Check right side
            if (isExtremum) {
                for (int j = i + 1; j <= i + LOOKBACK_PERIOD; j++) {
                    if (findMaxima) {
                        if (data.get(j).close() >= currentValue) {
                            isExtremum = false;
                            break;
                        }
                    } else {
                        if (data.get(j).close() <= currentValue) {
                            isExtremum = false;
                            break;
                        }
                    }
                }
            }

            if (isExtremum) {
                extrema.add(data.get(i));
            }
        }

        // Optional: Filter out minor extrema based on price difference threshold
        return filterMinorExtrema(extrema, findMaxima);
    }

    /**
     * Filter out minor extrema that are too close in price to neighboring extrema
     */
    private List<Candle> filterMinorExtrema(List<Candle> extrema, boolean isMaxima) {
        if (extrema.size() < 2) return extrema;

        List<Candle> filtered = new ArrayList<>();
        double threshold = calculateThreshold(candles);

        filtered.add(extrema.get(0));

        for (int i = 1; i < extrema.size(); i++) {
            double lastPrice = filtered.get(filtered.size() - 1).close();
            double currentPrice = extrema.get(i).close();
            double priceDiff = Math.abs(currentPrice - lastPrice);

            // Only keep if price difference is significant
            if (priceDiff > threshold) {
                filtered.add(extrema.get(i));
            }
        }

        return filtered;
    }

    /**
     * Calculate a dynamic threshold based on average price movement
     */
    private double calculateThreshold(List<Candle> data) {
        double sum = 0;
        int count = 0;

        for (int i = 1; i < data.size(); i++) {
            sum += Math.abs(data.get(i).close() - data.get(i-1).close());
            count++;
        }

        // Use 2x the average price movement as threshold
        return (sum / count) * 2;
    }

    public List<Candle> getCandles() { return candles; }
    public List<Candle> getMaxima() { return maxima; }
    public List<Candle> getMinima() { return minima; }
}
