package com.vish.fno.ChartsSimulator.service;

import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vish.fno.ChartsSimulator.config.properties.DataProperties;
import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.util.TimeUtils;
import com.vish.fno.ChartsSimulator.util.ValidationUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Slf4j
public class DataLoaderService {

    private final DataProperties dataProperties;
    private final ObjectMapper objectMapper;
    private final Map<String, List<StockTicker>> dataCache = new ConcurrentHashMap<>();

    @Autowired
    public DataLoaderService(DataProperties dataProperties, ObjectMapper objectMapper) {
        this.dataProperties = dataProperties;
        this.objectMapper = objectMapper;
        this.objectMapper.configure(MapperFeature.ALLOW_FINAL_FIELDS_AS_MUTATORS, true);
    }

    public List<StockTicker> getTickersForDateAndSymbol(String date, String symbol) {
        String cacheKey = date + "_" + symbol;

        if (dataCache.containsKey(cacheKey)) {
            log.debug("Cache hit for date {} and symbol {}", date, symbol);
            return dataCache.get(cacheKey);
        }

        log.info("Cache miss for date {} and symbol {}, loading from file", date, symbol);
        String filePath = buildFilePath(date, symbol);
        List<StockTicker> tickers = loadTickersFromFile(filePath);

        dataCache.put(cacheKey, tickers);
        log.info("Loaded {} tickers for date {} and symbol {} (after market hours filtering)",
                tickers.size(), date, symbol);

        return tickers;
    }

    private String buildFilePath(String date, String symbol) {
        if (!ValidationUtils.isValidDate(date) || !ValidationUtils.isValidSymbol(symbol)) {
            throw new IllegalArgumentException("Invalid date or symbol format");
        }

        String[] dateParts = date.split("-");
        String year = dateParts[0];
        String month = dateParts[1];
        String day = dateParts[2];

        return String.format("%s/%s-%s/%s-%s-%s/%s/%s.txt",
                dataProperties.baseLogPath(),
                month, year,
                day, month, year,
                date,
                ValidationUtils.sanitizeSymbol(symbol));
    }

    private List<StockTicker> loadTickersFromFile(String filePath) {
        List<StockTicker> tickers = new ArrayList<>();
        int totalTickers = 0;
        int filteredOut = 0;

        try (BufferedReader reader = Files.newBufferedReader(Paths.get(filePath))) {
            String line;
            while ((line = reader.readLine()) != null) {
                totalTickers++;
                StockTicker ticker = objectMapper.readValue(line, StockTicker.class);

                if (TimeUtils.isWithinTradingHours(ticker.tickTimestamp())) {
                    tickers.add(ticker);
                } else {
                    filteredOut++;
                }
            }

            // Sort tickers by timestamp before caching
            List<StockTicker> sortedTickers = tickers.stream()
                    .sorted(Comparator.comparing(StockTicker::tickTimestamp))
                    .collect(Collectors.toList());

            log.info("Loaded file: {} | Total ticks: {} | Filtered out: {} | Remaining: {} (market hours only)",
                    filePath, totalTickers, filteredOut, sortedTickers.size());

            return sortedTickers;
        } catch (IOException e) {
            log.error("Error loading data from file: {}", filePath, e);
        }
        return tickers;
    }


}
