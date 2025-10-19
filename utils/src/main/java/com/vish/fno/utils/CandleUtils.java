package com.vish.fno.utils;

import com.vish.fno.models.Candlestick;
import com.vish.fno.models.Ticker;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Utility class for candlestick operations.
 *
 * <p>Provides static helper methods for building and manipulating candlesticks
 * from tick data. All methods are pure functions with no side effects.</p>
 *
 * @author ChartsSimulator
 * @since 2.1.0
 */
@NoArgsConstructor
public final class CandleUtils {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    /**
     * Builds completed candlesticks directly from tickers (convenience method).
     *
     * <p>Combines grouping and filtering in one call. Returns only completed candlesticks,
     * excluding the last incomplete one.</p>
     *
     * <p><b>Example Usage:</b></p>
     * <pre>{@code
     * // Single call to get completed candlesticks
     * List<Candlestick> completed = CandleUtils.getCompletedCandlesticksFromTickers(tickers);
     * candlesticks.clear();
     * candlesticks.addAll(completed);
     * }</pre>
     *
     * @param tickers List of all tickers
     * @return List of completed candlesticks (excludes last incomplete one)
     */
    public static List<Candlestick> getCompletedCandlesticksFromTickers(List<Ticker> tickers) {
        List<Candlestick> allCandles = groupTickersByMinute(tickers);
        return getCompletedCandlesticks(allCandles);
    }

    /**
     * Groups tickers by minute and builds candlesticks.
     *
     * <p>Simple conversion: groups all tickers by minute-level timestamp and builds
     * a candlestick for each minute. Returns all candlesticks in chronological order.</p>
     *
     * <p><b>Algorithm:</b></p>
     * <ol>
     *   <li>Groups all tickers by minute-level timestamp</li>
     *   <li>Builds candlestick for each minute</li>
     *   <li>Returns all candlesticks (last one is typically incomplete)</li>
     * </ol>
     *
     * <p><b>Example Usage:</b></p>
     * <pre>{@code
     * // In strategy's updateCandlesticks method
     * List<Candlestick> candles = CandleUtils.groupTickersByMinute(tickers);
     *
     * // Process completed candlesticks (all but last)
     * CandleUtils.getCompletedCandlesticks(candles).forEach(this::finalizeCandlestick);
     *
     * // Keep last as incomplete
     * currentCandle = CandleUtils.getIncompleteCandlestick(candles);
     * }</pre>
     *
     * @param tickers List of all tickers
     * @return List of candlesticks in chronological order
     */
    public static List<Candlestick> groupTickersByMinute(List<Ticker> tickers) {
        if (tickers == null || tickers.isEmpty()) {
            return List.of();
        }

        // Group by minute using streams
        Map<String, List<Ticker>> tickersByMinute = tickers.stream()
            .collect(Collectors.groupingBy(
                tick -> getMinuteKey(tick.time()),
                LinkedHashMap::new,  // Preserve chronological order
                Collectors.toList()
            ));

        // Build candlesticks from grouped tickers
        return processCandlesticksFromGroupedTickers(tickersByMinute);
    }

    /**
     * Extracts minute-level timestamp from full timestamp.
     *
     * <p>Truncates seconds and nanoseconds to get minute-level key for grouping.</p>
     *
     * <p><b>Example:</b></p>
     * <pre>
     * Input:  "2025-10-01 09:25:14.123"
     * Output: "2025-10-01 09:25:00.000"
     * </pre>
     *
     * @param timestamp Full timestamp string
     * @return Minute-level timestamp key
     */
    public static String getMinuteKey(String timestamp) {
        LocalDateTime dt = LocalDateTime.parse(timestamp, FORMATTER);
        return dt.withSecond(0).withNano(0).format(FORMATTER);
    }

    /**
     * Extracts completed candlesticks from a list (all but the last one).
     *
     * <p>The convention is that the last candlestick in the list is incomplete (still building),
     * so this method returns all candlesticks except the last one.</p>
     *
     * <p><b>Example Usage:</b></p>
     * <pre>{@code
     * List<Candlestick> candles = CandleUtils.groupTickersByMinute(tickers, currentCandle);
     * List<Candlestick> completed = CandleUtils.getCompletedCandlesticks(candles);
     * completed.forEach(this::finalizeCandlestick);
     * }</pre>
     *
     * @param candles List of candlesticks from groupTickersByMinute
     * @return List of completed candlesticks (all but last), or empty list if candles has 0-1 elements
     */
    public static List<Candlestick> getCompletedCandlesticks(List<Candlestick> candles) {
        if (candles == null || candles.size() <= 1) {
            return List.of();
        }
        return candles.subList(0, candles.size() - 1);
    }

    /**
     * Extracts the incomplete candlestick from a list (the last one).
     *
     * <p>The convention is that the last candlestick in the list is incomplete (still building).</p>
     *
     * <p><b>Example Usage:</b></p>
     * <pre>{@code
     * List<Candlestick> candles = CandleUtils.groupTickersByMinute(tickers, currentCandle);
     * currentCandle = CandleUtils.getIncompleteCandlestick(candles);
     * }</pre>
     *
     * @param candles List of candlesticks from groupTickersByMinute
     * @return The last candlestick (incomplete), or null if list is empty
     */
    public static Candlestick getIncompleteCandlestick(List<Candlestick> candles) {
        if (candles == null || candles.isEmpty()) {
            return null;
        }
        return candles.get(candles.size() - 1);
    }

    /**
     * Builds a candlestick from a list of tickers in the same time window.
     *
     * <p>Calculates OHLC values functionally from the tick list:</p>
     * <ul>
     *   <li><b>Open:</b> First tick price</li>
     *   <li><b>High:</b> Maximum price across all ticks</li>
     *   <li><b>Low:</b> Minimum price across all ticks</li>
     *   <li><b>Close:</b> Last tick price</li>
     *   <li><b>TickCount:</b> Number of ticks used</li>
     * </ul>
     *
     * <p><b>Example Usage:</b></p>
     * <pre>{@code
     * // Build 1-minute candlestick from grouped tickers
     * Map<String, List<Ticker>> tickersByMinute = tickers.stream()
     *     .collect(Collectors.groupingBy(tick -> getMinuteKey(tick.time())));
     *
     * for (Map.Entry<String, List<Ticker>> entry : tickersByMinute.entrySet()) {
     *     Candlestick candle = CandleUtils.buildCandlestickFromTicks(
     *         entry.getKey(),
     *         entry.getValue()
     *     );
     *     candlesticks.add(candle);
     * }
     * }</pre>
     *
     * @param timestamp Candlestick timestamp (e.g., "2025-10-01 09:25:00.000")
     * @param ticks List of all tickers in this time window (must be chronologically ordered)
     * @return Complete candlestick with OHLC values
     * @throws IllegalArgumentException if ticks is null or empty
     */
    public static Candlestick buildCandlestickFromTicks(String timestamp, List<Ticker> ticks) {
        if (ticks == null || ticks.isEmpty()) {
            throw new IllegalArgumentException("Cannot build candlestick from empty tick list");
        }

        double open = ticks.get(0).price();  // First tick = open
        double close = ticks.get(ticks.size() - 1).price();  // Last tick = close
        double high = ticks.stream().mapToDouble(Ticker::price).max().orElse(open);
        double low = ticks.stream().mapToDouble(Ticker::price).min().orElse(open);
        long volume = ticks.stream().mapToLong(Ticker::volume).sum();
        int tickCount = ticks.size();

        return new Candlestick(timestamp, open, high, low, close, volume, tickCount);
    }


    public static boolean isBullish(Candlestick candle) {
        return candle.close() > candle.open();
    }

    public static boolean isBearish(Candlestick candle) {
        return candle.close() < candle.open();
    }

    public static double getBodyLength(Candlestick candle) {
        if(isBullish(candle)) {
            return candle.close() - candle.open();
        }
        return candle.open() - candle.close();
    }

    public static double getTotalLength(Candlestick candle) {
        return candle.high() - candle.low();
    }

    public static double getUpperWick(Candlestick candle) {
        if(isBullish(candle)) {
            return candle.high() - candle.close();
        }
        return candle.high() - candle.open();
    }

    public static double getLowerWick(Candlestick candle) {
        if(isBullish(candle)) {
            return candle.open() - candle.low();
        }
        return candle.close() - candle.low();
    }

    /**
     * Calculates the body percentage of a candlestick.
     * Body % = |Close - Open| / Close × 100
     *
     * @param candle to analyze
     * @return Body percentage (0-100)
     */
    public static double calculateBodyPercent(Candlestick candle) {
        if (candle.close() == 0) return 0.0;
        double body = Math.abs(candle.close() - candle.open());
        return (body / candle.close()) * 100.0;
    }

    /**
     * Calculates the upper wick percentage of a candlestick.
     * Upper Wick % = ((High - Close) / Close) × 100
     *
     * @param candle to analyze
     * @return Upper wick percentage
     */
    public static double calculateUpperWickPercent(Candlestick candle) {
        double upperWick = getUpperWick(candle);
        double totalLength = getTotalLength(candle);
        if(upperWick == 0.0 || totalLength == 0.0)  {
            return 0.0;
        }
        return upperWick/totalLength * 100.0;
    }

    /**
     * Calculates the lower wick percentage of a candlestick.
     * Lower Wick % = ((Open - Low) / Open) × 100
     *
     * @param candle to analyze
     * @return Lower wick percentage
     */
    public static double calculateLowerWickPercent(Candlestick candle) {
        double lowerWick = getLowerWick(candle);
        double totalLength = getTotalLength(candle);
        if(lowerWick == 0.0 || totalLength == 0.0)  {
            return 0.0;
        }
        return lowerWick/totalLength * 100.0;
    }

    /**
     * Processes grouped tickers to build candlesticks.
     *
     * <p>Simple method that builds a candlestick for each minute in the map.
     * Returns all candlesticks in chronological order (completed + incomplete).</p>
     *
     * <p><b>Algorithm:</b></p>
     * <ol>
     *   <li>Iterates through all minutes in chronological order</li>
     *   <li>Builds candlestick from tickers for each minute</li>
     *   <li>Returns list with all candlesticks (last one is typically incomplete)</li>
     * </ol>
     *
     * <p><b>Example Usage:</b></p>
     * <pre>{@code
     * // Group tickers by minute
     * Map<String, List<Ticker>> tickersByMinute = newTickers.stream()
     *     .collect(Collectors.groupingBy(
     *         tick -> getMinuteKey(tick.time()),
     *         LinkedHashMap::new,
     *         Collectors.toList()
     *     ));
     *
     * // Process candlesticks
     * List<Candlestick> candles = CandleUtils.processCandlesticksFromGroupedTickers(tickersByMinute);
     * }</pre>
     *
     * @param tickersByMinute Map of tickers grouped by minute (must use LinkedHashMap for chronological order)
     * @return List of candlesticks in chronological order
     */
    public static List<Candlestick> processCandlesticksFromGroupedTickers(
            Map<String, List<Ticker>> tickersByMinute
    ) {
        if (tickersByMinute == null || tickersByMinute.isEmpty()) {
            return List.of();
        }

        List<Candlestick> candlesticks = new ArrayList<>();

        // Build candlestick for each minute
        for (Map.Entry<String, List<Ticker>> entry : tickersByMinute.entrySet()) {
            String minute = entry.getKey();
            List<Ticker> ticks = entry.getValue();
            Candlestick candle = buildCandlestickFromTicks(minute, ticks);
            candlesticks.add(candle);
        }

        return candlesticks;
    }

}
