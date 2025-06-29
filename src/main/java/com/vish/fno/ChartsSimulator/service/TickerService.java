package com.vish.fno.ChartsSimulator.service;

import com.vish.fno.ChartsSimulator.model.StockTicker;
import com.vish.fno.ChartsSimulator.model.Ticker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
public class TickerService {
    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");

    private final DataLoaderService dataLoaderService;
    private static final DateTimeFormatter DEFAULT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public List<Ticker> getTickerData(String symbol, String date) {
        List<StockTicker> stockTickers =  dataLoaderService.getTickersForDateAndSymbol(date, symbol);
        return stockTickers.stream().map(st -> new Ticker(formatDateTime(st.tickTimestamp()), st.lastTradedPrice(), st.lastTradedQuantity())).toList();
    }

    public static String formatDateTime(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .format(DEFAULT_FORMATTER);
    }
}
