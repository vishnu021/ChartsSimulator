package com.vish.fno.ChartsSimulator.util;

import com.vish.fno.ChartsSimulator.model.Candle;
import com.vish.fno.ChartsSimulator.model.StockTicker;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class CandleAggregator {

    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");

    /**
     * Converts tick data to candles based on the specified period in minutes
     * @param tickers List of stock tickers (tick data)
     * @param periodMinutes Period for candle aggregation (e.g., 1, 5, 15, 30, 60)
     * @return List of aggregated candles
     */
    public static List<Candle> convertTicksToCandles(List<StockTicker> tickers, int periodMinutes) {
        if (tickers == null || tickers.isEmpty()) {
            return new ArrayList<>();
        }

        // Group tickers by time periods
        Map<Long, List<StockTicker>> periodGroups = groupTickersByPeriod(tickers, periodMinutes);

        List<Candle> candles = new ArrayList<>();

        for (Map.Entry<Long, List<StockTicker>> entry : periodGroups.entrySet()) {
            Long periodStart = entry.getKey();
            List<StockTicker> periodTickers = entry.getValue();

            if (!periodTickers.isEmpty()) {
                Candle candle = createCandleFromTickers(periodStart, periodTickers);
                candles.add(candle);
            }
        }

        return candles;
    }

    /**
     * Groups tickers by time periods based on the specified period in minutes
     */
    private static Map<Long, List<StockTicker>> groupTickersByPeriod(List<StockTicker> tickers, int periodMinutes) {
        Map<Long, List<StockTicker>> periodGroups = new TreeMap<>();

        for (StockTicker ticker : tickers) {
            long periodStart = getPeriodStart(ticker.tickTimestamp(), periodMinutes);

            periodGroups.computeIfAbsent(periodStart, k -> new ArrayList<>()).add(ticker);
        }

        return periodGroups;
    }

    /**
     * Calculates the start time of the period for a given timestamp
     */
    private static long getPeriodStart(long timestamp, int periodMinutes) {
        LocalDateTime dateTime = Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .toLocalDateTime();

        // Truncate to the nearest period boundary
        int minute = dateTime.getMinute();
        int periodBoundary = (minute / periodMinutes) * periodMinutes;

        LocalDateTime periodStart = dateTime
                .withMinute(periodBoundary)
                .withSecond(0)
                .withNano(0);

        return periodStart.atZone(INDIA_ZONE).toInstant().toEpochMilli();
    }

    /**
     * Creates a candle from a group of tickers within the same time period
     */
    private static Candle createCandleFromTickers(long periodStart, List<StockTicker> tickers) {
        if (tickers.isEmpty()) {
            throw new IllegalArgumentException("Cannot create candle from empty ticker list");
        }

        // Sort tickers by timestamp to ensure proper OHLC calculation
        tickers.sort((t1, t2) -> Long.compare(t1.tickTimestamp(), t2.tickTimestamp()));

        double open = tickers.get(0).lastTradedPrice();
        double close = tickers.get(tickers.size() - 1).lastTradedPrice();
        double high = tickers.stream().mapToDouble(StockTicker::lastTradedPrice).max().orElse(open);
        double low = tickers.stream().mapToDouble(StockTicker::lastTradedPrice).min().orElse(open);

        // Calculate volume as the count of ticks (since individual tick volume is not available)
        // This represents trading activity frequency
        long volume = tickers.size();

        // Open Interest - use 0 as default since it's not available in tick data
        long oi = 0L;

        // Format time as string in ISO format
        String timeString = Instant.ofEpochMilli(periodStart)
                .atZone(INDIA_ZONE)
                .toString();

        return new Candle(timeString, open, high, low, close, volume, oi);
    }
}
