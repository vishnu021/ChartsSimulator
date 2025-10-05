package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.config.properties.TickerProperties;
import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.model.Ticker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service class for processing ticker data and handling timestamp deduplication.
 * This service converts raw stock ticker data into processed ticker format,
 * with optional timestamp deduplication to handle data quality issues.
 *
 * @author ChartsSimulator
 * @since 1.0.0
 */
@Service
@RequiredArgsConstructor
public class TickerService {
    /** Time zone for Indian stock market */
    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");

    /** Default date-time formatter for timestamp display */
    private static final DateTimeFormatter DEFAULT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    /** Offset in milliseconds to add for duplicate timestamp resolution */
    private static final long DUPLICATE_OFFSET_MS = 600L;

    private final DataLoaderService dataLoaderService;
    private final TickerProperties tickerProperties;

    /**
     * Retrieves and processes ticker data for a given symbol and date.
     * Optionally applies timestamp deduplication based on configuration.
     *
     * @param symbol Trading symbol (e.g., "NIFTY 50")
     * @param date   Date in string format for data retrieval
     * @return List of processed ticker data with formatted timestamps
     */
    public List<Ticker> getTickerData(String symbol, String date) {
        List<StockTicker> stockTickers = dataLoaderService.getTickersForDateAndSymbol(date, symbol);

        if (!tickerProperties.deduplicateTimestamps()) {
            return stockTickers.stream()
                .map(st -> new Ticker(symbol, formatDateTime(st.tickTimestamp()), st.lastTradedPrice(), st.lastTradedQuantity()))
                .toList();
        }

        return processTickersWithDeduplication(symbol, stockTickers);
    }
    
    /**
     * Processes ticker data with timestamp deduplication.
     * When multiple tickers have the same timestamp, subsequent duplicates
     * are offset by incremental amounts to maintain chronological order.
     *
     * @param symbol Trading symbol
     * @param stockTickers Raw stock ticker data from data loader
     * @return List of processed tickers with deduplicated timestamps
     */
    private List<Ticker> processTickersWithDeduplication(String symbol, List<StockTicker> stockTickers) {
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
                processedTickers.add(new Ticker(symbol, adjustedTime, stockTicker.lastTradedPrice(), stockTicker.lastTradedQuantity()));
            } else {
                timeOccurrences.put(timeKey, 0);
                processedTickers.add(new Ticker(symbol, timeKey, stockTicker.lastTradedPrice(), stockTicker.lastTradedQuantity()));
            }
        }

        return processedTickers;
    }

    /**
     * Formats a timestamp into a human-readable date-time string.
     * Uses India timezone (Asia/Kolkata) for stock market data consistency.
     *
     * @param timestamp Unix timestamp in milliseconds
     * @return Formatted date-time string in "yyyy-MM-dd HH:mm:ss.SSS" format
     */
    public static String formatDateTime(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .format(DEFAULT_FORMATTER);
    }
}
