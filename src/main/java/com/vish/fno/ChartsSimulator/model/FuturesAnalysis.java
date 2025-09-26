package com.vish.fno.ChartsSimulator.model;

import java.time.LocalDate;

/**
 * Represents analysis of a futures contract symbol
 * @param originalSymbol Original symbol provided
 * @param isFutures Whether the symbol is a futures contract
 * @param underlyingSymbol Underlying asset symbol (e.g., "NIFTY 50")
 * @param contractMonth Contract month name (e.g., "SEPTEMBER")
 * @param contractYear Contract year (e.g., 2025)
 * @param expiryDate Contract expiry date
 * @param daysToExpiry Number of days until expiry
 * @param isNearExpiry Whether contract is near expiry (within 7 days)
 */
public record FuturesAnalysis(
        String originalSymbol,
        boolean isFutures,
        String underlyingSymbol,
        String contractMonth,
        Integer contractYear,
        LocalDate expiryDate,
        Long daysToExpiry,
        boolean isNearExpiry
) {

    /**
     * Create analysis for a futures contract
     */
    public static FuturesAnalysis futures(String originalSymbol,
                                        String underlyingSymbol,
                                        String contractMonth,
                                        int contractYear,
                                        LocalDate expiryDate,
                                        long daysToExpiry,
                                        boolean isNearExpiry) {
        return new FuturesAnalysis(
                originalSymbol,
                true,
                underlyingSymbol,
                contractMonth,
                contractYear,
                expiryDate,
                daysToExpiry,
                isNearExpiry
        );
    }

    /**
     * Create analysis for a non-futures symbol
     */
    public static FuturesAnalysis notFutures(String originalSymbol) {
        return new FuturesAnalysis(
                originalSymbol,
                false,
                originalSymbol,
                null,
                null,
                null,
                null,
                false
        );
    }

    /**
     * Get contract description for display
     */
    public String getContractDescription() {
        if (!isFutures) {
            return originalSymbol;
        }

        return String.format("%s %s %d Futures",
                underlyingSymbol,
                contractMonth != null ? contractMonth.substring(0, 3).toUpperCase() : "UNK",
                contractYear != null ? contractYear : 0);
    }

    /**
     * Get expiry status description
     */
    public String getExpiryStatus() {
        if (!isFutures || daysToExpiry == null) {
            return "N/A";
        }

        if (daysToExpiry < 0) {
            return "EXPIRED";
        } else if (isNearExpiry) {
            return "NEAR EXPIRY (" + daysToExpiry + " days)";
        } else {
            return daysToExpiry + " days to expiry";
        }
    }
}