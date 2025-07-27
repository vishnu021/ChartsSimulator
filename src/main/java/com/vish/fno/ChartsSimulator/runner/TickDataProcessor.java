package com.vish.fno.ChartsSimulator.runner;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.service.DataLoaderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import java.io.File;
import java.io.FileWriter;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(value = "app.tickProcessor.enabled", havingValue = "true")
public class TickDataProcessor implements CommandLineRunner {

    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss.SSS");
    
    private final DataLoaderService dataLoaderService;
    private final ObjectMapper objectMapper;
    
    @Value("${app.tickProcessor.enabled:false}")
    private boolean enabled;
    
    @Value("${app.tickProcessor.date:}")
    private String defaultDate;
    
    @Value("${app.tickProcessor.symbol:}")
    private String defaultSymbol;
    
    @Value("${app.tickProcessor.outputPath:output/}")
    private String outputPath;
    
    @Value("${app.tickProcessor.deduplicateTimestamps:true}")
    private boolean deduplicateTimestamps;
    
    @PostConstruct
    public void configureObjectMapper() {
        objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
    }

    @Override
    public void run(String... args) throws Exception {
        if (!enabled) {
            log.debug("TickDataProcessor: disabled in configuration. Skipping tick data processing.");
            return;
        }

        if (defaultSymbol.isEmpty() || defaultDate.isEmpty()) {
            log.error("TickDataProcessor: symbol and date must be configured in application.yml");
            log.error("Configure: app.tickProcessor.symbol and app.tickProcessor.date");
            return;
        }

        log.info("Processing tick data with configuration: symbol={}, date={}", defaultSymbol, defaultDate);
        processTickData(defaultSymbol, defaultDate);
    }

    public void processTickData(String symbol, String date) {
        try {
            log.info("Processing tick data for symbol: {} on date: {}", symbol, date);

            List<StockTicker> tickers = loadTickerData(symbol, date);
            if (tickers.isEmpty()) {
                log.warn("No tick data found for symbol: {} on date: {}", symbol, date);
                return;
            }

            ProcessedTickData processedData = processTickersWithDeduplication(tickers);
            String outputFilePath = generateOutputFilePath(symbol, date);
            ensureOutputDirectoryExists();
            
            Map<String, Object> jsonOutput = createJsonOutput(symbol, date, processedData);
            writeJsonToFile(jsonOutput, outputFilePath);

            logProcessingResults(processedData, outputFilePath);

        } catch (Exception e) {
            log.error("Error processing tick data for symbol: {} on date: {}", symbol, date, e);
        }
    }

    private List<StockTicker> loadTickerData(String symbol, String date) {
        return dataLoaderService.getTickersForDateAndSymbol(date, symbol);
    }

    private ProcessedTickData processTickersWithDeduplication(List<StockTicker> tickers) {
        Map<String, Double> timeToPrice = new LinkedHashMap<>();
        Map<String, Integer> timeOccurrences = new LinkedHashMap<>();
        int duplicatesAdjusted = 0;

        for (StockTicker ticker : tickers) {
            long originalTimestamp = ticker.tickTimestamp();
            String timeKey = formatTime(originalTimestamp);
            
            if (shouldAdjustDuplicateTimestamp(timeToPrice, timeKey)) {
                duplicatesAdjusted++;
                String adjustedTime = adjustTimestampForDuplicate(originalTimestamp, timeKey, timeOccurrences);
                timeToPrice.put(adjustedTime, ticker.lastTradedPrice());
            } else {
                timeToPrice.put(timeKey, ticker.lastTradedPrice());
                timeOccurrences.put(timeKey, 0);
            }
        }

        return new ProcessedTickData(timeToPrice, duplicatesAdjusted);
    }

    private boolean shouldAdjustDuplicateTimestamp(Map<String, Double> timeToPrice, String timeKey) {
        return deduplicateTimestamps && timeToPrice.containsKey(timeKey);
    }

    private String adjustTimestampForDuplicate(long originalTimestamp, String timeKey, 
                                             Map<String, Integer> timeOccurrences) {
        int occurrence = timeOccurrences.getOrDefault(timeKey, 0) + 1;
        timeOccurrences.put(timeKey, occurrence);
        long adjustedTimestamp = originalTimestamp + (occurrence * 600L);
        return formatTime(adjustedTimestamp);
    }

    private String generateOutputFilePath(String symbol, String date) {
        String sanitizedSymbol = symbol.replaceAll("[^a-zA-Z0-9_]", "_");
        String outputFileName = String.format("tick_data_%s_%s.json", sanitizedSymbol, date);
        return outputPath + outputFileName;
    }

    private void ensureOutputDirectoryExists() {
        File outputDir = new File(outputPath);
        if (!outputDir.exists()) {
            boolean created = outputDir.mkdirs();
            if (!created) {
                log.warn("Failed to create output directory: {}", outputPath);
            }
        }
    }

    private Map<String, Object> createJsonOutput(String symbol, String date, ProcessedTickData processedData) {
        Map<String, Object> jsonOutput = new LinkedHashMap<>();
        jsonOutput.put("symbol", symbol);
        jsonOutput.put("date", date);
        jsonOutput.put("totalTicks", processedData.timeToPrice().size());
        jsonOutput.put("hasVolumeData", false);
        jsonOutput.put("timestampDeduplicationEnabled", deduplicateTimestamps);
        jsonOutput.put("duplicateTimestampsAdjusted", processedData.duplicatesAdjusted());
        jsonOutput.put("data", createDataArray(processedData.timeToPrice()));
        return jsonOutput;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object>[] createDataArray(Map<String, Double> timeToPrice) {
        Map<String, Object>[] dataArray = new Map[timeToPrice.size()];
        int index = 0;
        for (Map.Entry<String, Double> entry : timeToPrice.entrySet()) {
            Map<String, Object> dataPoint = new LinkedHashMap<>();
            dataPoint.put("time", entry.getKey());
            dataPoint.put("ltp", entry.getValue());
            dataArray[index++] = dataPoint;
        }
        return dataArray;
    }

    private void writeJsonToFile(Map<String, Object> jsonOutput, String filePath) throws Exception {
        try (FileWriter writer = new FileWriter(filePath)) {
            objectMapper.writeValue(writer, jsonOutput);
        }
    }

    private void logProcessingResults(ProcessedTickData processedData, String outputFilePath) {
        log.info("Successfully processed {} unique ticks (duplicates adjusted: {})", 
                processedData.timeToPrice().size(), processedData.duplicatesAdjusted());
        log.info("Output file created: {}", outputFilePath);
    }

    private String formatTime(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .format(TIME_FORMATTER);
    }

    private record ProcessedTickData(Map<String, Double> timeToPrice, int duplicatesAdjusted) {}

}