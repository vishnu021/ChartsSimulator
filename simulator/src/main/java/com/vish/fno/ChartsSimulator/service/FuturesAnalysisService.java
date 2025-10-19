package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.config.properties.FuturesProperties;
import com.vish.fno.ChartsSimulator.model.FuturesAnalysis;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for analyzing futures contracts and generating futures symbols
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class FuturesAnalysisService {

    private final FuturesProperties futuresProperties;

    private static final Pattern FUTURES_PATTERN = Pattern.compile("^([A-Z]+)(\\d{2})([A-Z]{3})FUT$");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Analyze if a symbol is a futures contract and extract details
     * @param symbol Symbol to analyze (e.g., "NIFTY25SEPFUT")
     * @return FuturesAnalysis with contract details
     */
    public FuturesAnalysis analyzeFuturesSymbol(String symbol) {
        if (!futuresProperties.enabled() || symbol == null) {
            return FuturesAnalysis.notFutures(symbol);
        }

        Matcher matcher = FUTURES_PATTERN.matcher(symbol.toUpperCase());
        if (!matcher.matches()) {
            return FuturesAnalysis.notFutures(symbol);
        }

        String prefix = matcher.group(1);
        String yearSuffix = matcher.group(2);
        String monthCode = matcher.group(3);

        // Find underlying symbol from prefix
        String underlyingSymbol = findUnderlyingSymbol(prefix);

        // Convert month code to month name
        String monthName = convertMonthCodeToName(monthCode);

        // Calculate expiry year (assuming 20xx for now)
        int year = 2000 + Integer.parseInt(yearSuffix);

        // Calculate expiry date (last Thursday of the month for Indian futures)
        LocalDate expiryDate = calculateExpiryDate(year, monthName);

        log.debug("Analyzed futures symbol: {} -> underlying: {}, month: {}, year: {}, expiry: {}",
                symbol, underlyingSymbol, monthName, year, expiryDate);

        return FuturesAnalysis.futures(
                symbol,
                underlyingSymbol,
                monthName,
                year,
                expiryDate,
                calculateDaysToExpiry(expiryDate),
                isNearExpiry(expiryDate)
        );
    }

    /**
     * Generate futures symbol for given parameters
     * @param underlyingSymbol Base symbol (e.g., "NIFTY 50")
     * @param month Month name or number
     * @param year Year (e.g., 2025)
     * @return Generated futures symbol
     */
    public String generateFuturesSymbol(String underlyingSymbol, String month, int year) {
        if (!futuresProperties.enabled()) {
            return underlyingSymbol;
        }
        return futuresProperties.generateFuturesSymbol(underlyingSymbol, month, year);
    }

    /**
     * Get all available futures contracts for an underlying symbol
     * @param underlyingSymbol Base symbol
     * @param months Number of months ahead to generate
     * @return List of futures symbols
     */
    public List<String> getAvailableFuturesContracts(String underlyingSymbol, int months) {
        List<String> contracts = new ArrayList<>();

        if (!futuresProperties.enabled() || months <= 0) {
            return contracts;
        }

        LocalDate currentDate = LocalDate.now();

        for (int i = 0; i < months; i++) {
            LocalDate futureMonth = currentDate.plusMonths(i);
            String monthName = futureMonth.getMonth().name();
            int year = futureMonth.getYear();

            String futuresSymbol = generateFuturesSymbol(underlyingSymbol, monthName, year);
            contracts.add(futuresSymbol);
        }

        return contracts;
    }

    /**
     * Check if symbol has futures mapping configured
     * @param symbol Symbol to check
     * @return true if futures mapping exists
     */
    public boolean hasFuturesMapping(String symbol) {
        return futuresProperties.enabled() &&
               futuresProperties.symbolMappings().containsKey(symbol);
    }

    private String findUnderlyingSymbol(String prefix) {
        return futuresProperties.symbolMappings().entrySet().stream()
                .filter(entry -> entry.getValue().equals(prefix))
                .map(entry -> entry.getKey())
                .findFirst()
                .orElse(prefix); // Return prefix if no mapping found
    }

    private String convertMonthCodeToName(String monthCode) {
        return futuresProperties.monthCodes().entrySet().stream()
                .filter(entry -> entry.getValue().equals(monthCode))
                .map(entry -> entry.getKey())
                .findFirst()
                .orElse(monthCode); // Return code if no mapping found
    }

    private LocalDate calculateExpiryDate(int year, String monthName) {
        try {
            // For Indian futures, expiry is typically the last Thursday of the month
            LocalDate firstDayOfMonth = LocalDate.of(year,
                    java.time.Month.valueOf(monthName.toUpperCase()), 1);
            LocalDate lastDayOfMonth = firstDayOfMonth.plusMonths(1).minusDays(1);

            // Find the last Thursday
            LocalDate lastThursday = lastDayOfMonth;
            while (lastThursday.getDayOfWeek() != java.time.DayOfWeek.THURSDAY) {
                lastThursday = lastThursday.minusDays(1);
            }

            return lastThursday;
        } catch (Exception e) {
            log.warn("Error calculating expiry date for {}-{}, using last day of month", monthName, year);
            return LocalDate.of(year,
                    java.time.Month.valueOf(monthName.toUpperCase()), 1)
                    .plusMonths(1).minusDays(1);
        }
    }

    private long calculateDaysToExpiry(LocalDate expiryDate) {
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
    }

    private boolean isNearExpiry(LocalDate expiryDate) {
        return calculateDaysToExpiry(expiryDate) <= 7; // Within 7 days
    }
}