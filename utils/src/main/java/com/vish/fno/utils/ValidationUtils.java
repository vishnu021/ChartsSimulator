package com.vish.fno.utils;

import java.util.regex.Pattern;

/**
 * Utility class for common validation operations
 */
public final class ValidationUtils {

    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$");
    private static final Pattern SYMBOL_PATTERN = Pattern.compile("^[A-Za-z0-9 ]+$");

    private ValidationUtils() {
        // Utility class - prevent instantiation
    }

    /**
     * Validate if string is a valid date in YYYY-MM-DD format
     * @param date Date string to validate
     * @return true if valid date format
     */
    public static boolean isValidDate(String date) {
        return date != null && DATE_PATTERN.matcher(date).matches();
    }

    /**
     * Validate if string is a valid time in HH:mm:ss format
     * @param time Time string to validate
     * @return true if valid time format
     */
    public static boolean isValidTime(String time) {
        return time != null && TIME_PATTERN.matcher(time).matches();
    }

    /**
     * Validate if string is a valid stock symbol (alphanumeric with spaces)
     * @param symbol Symbol string to validate
     * @return true if valid symbol format
     */
    public static boolean isValidSymbol(String symbol) {
        return symbol != null && !symbol.trim().isEmpty() && SYMBOL_PATTERN.matcher(symbol).matches();
    }

    /**
     * Validate if port number is in valid range
     * @param port Port number to validate
     * @return true if port is between 1024 and 65535
     */
    public static boolean isValidPort(int port) {
        return port >= 1024 && port <= 65535;
    }

    /**
     * Check if string contains wildcard characters (* or %)
     * @param value String to check
     * @return true if contains wildcards
     */
    public static boolean containsWildcards(String value) {
        return value != null && (value.contains("*") || value.contains("%"));
    }

    /**
     * Sanitize symbol for file system usage
     * @param symbol Original symbol
     * @return Sanitized symbol safe for file names
     */
    public static String sanitizeSymbol(String symbol) {
        if (symbol == null) {
            return "UNKNOWN";
        }
        return symbol.replaceAll("[^a-zA-Z0-9_]", "_");
    }

    /**
     * Check if string is null or empty or contains only whitespace
     * @param value String to check
     * @return true if null, empty, or whitespace only
     */
    public static boolean isNullOrBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}