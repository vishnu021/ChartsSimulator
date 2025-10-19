package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.models.Candle;
import com.vish.fno.models.Ticker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomCandleService {
    private final TickerService tickerService;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS");

    public List<Candle> generateCustomCandles(String symbol, String date, int timeframeSeconds) {
        log.info("Generating custom candles for symbol: {}, date: {}, timeframe: {}s",
                 symbol, date, timeframeSeconds);

        // Get ticker data
        List<Ticker> tickers = tickerService.getTickerData(symbol, date);

        if (tickers == null || tickers.isEmpty()) {
            log.warn("No ticker data found for symbol: {}, date: {}", symbol, date);
            return new ArrayList<>();
        }

        // Group tickers into candles based on timeframe
        Map<String, List<Ticker>> candleGroups = new TreeMap<>();

        for (Ticker ticker : tickers) {
            try {
                LocalTime tickerTime;

                // Try parsing different time formats
                if (ticker.time().contains("T")) {
                    // ISO-8601 format with timezone (e.g., "2025-05-16T09:15:00+0530")
                    ZonedDateTime zonedDateTime = ZonedDateTime.parse(ticker.time());
                    tickerTime = zonedDateTime.toLocalTime();
                } else {
                    // Space-separated format (e.g., "2025-07-18 09:15:00.000")
                    LocalDateTime localDateTime = LocalDateTime.parse(ticker.time(), DATETIME_FORMATTER);
                    tickerTime = localDateTime.toLocalTime();
                }

                String candleTime = getCandleTime(tickerTime, timeframeSeconds);
                candleGroups.computeIfAbsent(candleTime, k -> new ArrayList<>()).add(ticker);
            } catch (Exception e) {
                log.warn("Error parsing ticker time: {}", ticker.time(), e);
            }
        }

        // Convert grouped tickers to candles
        List<Candle> candles = new ArrayList<>();
        for (Map.Entry<String, List<Ticker>> entry : candleGroups.entrySet()) {
            Candle candle = createCandleFromTickers(entry.getKey(), entry.getValue());
            candles.add(candle);
        }

        log.info("Generated {} candles from {} tickers", candles.size(), tickers.size());
        return candles;
    }

    private String getCandleTime(LocalTime tickerTime, int timeframeSeconds) {
        // Calculate seconds since start of day
        int totalSeconds = tickerTime.toSecondOfDay();

        // Round down to nearest timeframe boundary
        int candleSeconds = (totalSeconds / timeframeSeconds) * timeframeSeconds;

        // Convert back to time to get the opening time of the candle
        // e.g., 9:15 candle represents 9:15:00 to 9:15:59.999
        LocalTime candleTime = LocalTime.ofSecondOfDay(candleSeconds);

        return candleTime.format(TIME_FORMATTER);
    }

    private Candle createCandleFromTickers(String time, List<Ticker> tickers) {
        if (tickers.isEmpty()) {
            return new Candle(time, 0, 0, 0, 0, 0, 0);
        }

        double open = tickers.get(0).price();
        double close = tickers.get(tickers.size() - 1).price();
        double high = tickers.stream().mapToDouble(Ticker::price).max().orElse(0);
        double low = tickers.stream().mapToDouble(Ticker::price).min().orElse(0);

        // Volume is the sum of all tick volumes in the timeframe
        long volume = tickers.stream().mapToLong(Ticker::volume).sum();

        // OI is set to 0 as ticker data doesn't include open interest
        long oi = 0;

        return new Candle(time, open, high, low, close, volume, oi);
    }
}
