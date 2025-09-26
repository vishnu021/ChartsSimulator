package com.vish.fno.ChartsSimulator.util;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Utility class for time-related operations across the application
 */
public final class TimeUtils {

    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss.SSS");
    private static final int TRADING_START_MINUTES = 9 * 60 + 15; // 9:15 AM
    private static final int TRADING_END_MINUTES = 15 * 60 + 30;  // 3:30 PM

    private TimeUtils() {
        // Utility class - prevent instantiation
    }

    /**
     * Convert epoch milliseconds to LocalDateTime in India timezone
     * @param timestamp Epoch timestamp in milliseconds
     * @return LocalDateTime in Asia/Kolkata timezone
     */
    public static LocalDateTime fromEpochMilli(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .toLocalDateTime();
    }

    /**
     * Format timestamp to time string (HH:mm:ss.SSS) in India timezone
     * @param timestamp Epoch timestamp in milliseconds
     * @return Formatted time string
     */
    public static String formatTime(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .format(TIME_FORMATTER);
    }

    /**
     * Check if timestamp falls within Indian stock market trading hours (9:15 AM - 3:30 PM IST)
     * @param timestamp Epoch timestamp in milliseconds
     * @return true if within trading hours
     */
    public static boolean isWithinTradingHours(long timestamp) {
        LocalDateTime dateTime = fromEpochMilli(timestamp);
        int hour = dateTime.getHour();
        int minute = dateTime.getMinute();
        int currentTimeMinutes = hour * 60 + minute;

        return currentTimeMinutes >= TRADING_START_MINUTES && currentTimeMinutes <= TRADING_END_MINUTES;
    }

    /**
     * Get India timezone instance
     * @return ZoneId for Asia/Kolkata
     */
    public static ZoneId getIndiaZone() {
        return INDIA_ZONE;
    }

    /**
     * Get current timestamp in India timezone as formatted string
     * @return Current time as HH:mm:ss.SSS string
     */
    public static String getCurrentTimeFormatted() {
        return formatTime(System.currentTimeMillis());
    }

    /**
     * Get trading hours info
     * @return Trading hours as "HH:mm - HH:mm" format
     */
    public static String getTradingHours() {
        return "09:15 - 15:30";
    }
}