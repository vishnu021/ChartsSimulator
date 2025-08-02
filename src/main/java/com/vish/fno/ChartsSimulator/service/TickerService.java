package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.model.Ticker;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TickerService {
    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DEFAULT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");
    private static final long DUPLICATE_OFFSET_MS = 600L;

    private final DataLoaderService dataLoaderService;
    
    @Value("${app.ticker.deduplicateTimestamps:true}")
    private boolean deduplicateTimestamps;

    public List<Ticker> getTickerData(String symbol, String date) {
        List<StockTicker> stockTickers = dataLoaderService.getTickersForDateAndSymbol(date, symbol);
        
        if (!deduplicateTimestamps) {
            return stockTickers.stream()
                .map(st -> new Ticker(formatDateTime(st.tickTimestamp()), st.lastTradedPrice(), st.lastTradedQuantity()))
                .toList();
        }
        
        return processTickersWithDeduplication(stockTickers);
    }
    
    private List<Ticker> processTickersWithDeduplication(List<StockTicker> stockTickers) {
        Map<String, Integer> timeOccurrences = new LinkedHashMap<>();
        List<Ticker> processedTickers = new ArrayList<>();
        
        for (StockTicker stockTicker : stockTickers) {
            long originalTimestamp = stockTicker.tickTimestamp();
            String timeKey = formatDateTime(originalTimestamp);
            
            if (timeOccurrences.containsKey(timeKey)) {
                // Increment timestamp by 600ms for each duplicate
                int occurrence = timeOccurrences.get(timeKey) + 1;
                timeOccurrences.put(timeKey, occurrence);
                long adjustedTimestamp = originalTimestamp + (occurrence * DUPLICATE_OFFSET_MS);
                String adjustedTime = formatDateTime(adjustedTimestamp);
                processedTickers.add(new Ticker(adjustedTime, stockTicker.lastTradedPrice(), stockTicker.lastTradedQuantity()));
            } else {
                timeOccurrences.put(timeKey, 0);
                processedTickers.add(new Ticker(timeKey, stockTicker.lastTradedPrice(), stockTicker.lastTradedQuantity()));
            }
        }
        
        return processedTickers;
    }

    public static String formatDateTime(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .format(DEFAULT_FORMATTER);
    }
}
