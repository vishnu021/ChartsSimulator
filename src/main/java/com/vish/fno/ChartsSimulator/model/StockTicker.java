package com.vish.fno.ChartsSimulator.model;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

public record StockTicker(
        String mode,
        boolean tradable,
        long instrumentToken,
        double lastTradedPrice,
        double highPrice,
        double lowPrice,
        double openPrice,
        double closePrice,
        double change,
        long lastTradedQuantity,
        double averageTradePrice,
        long volumeTradedToday,
        double totalBuyQuantity,
        double totalSellQuantity,
        long lastTradedTime,
        long oi,
        long tickTimestamp,
        double openInterestDayHigh,
        double openInterestDayLow,
        MarketDepth marketDepth
) {

    private static final ZoneId INDIA_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DEFAULT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    String formatDateTime(long timestamp) {
        return Instant.ofEpochMilli(timestamp)
                .atZone(INDIA_ZONE)
                .format(DEFAULT_FORMATTER);
    }

    @Override
    public String toString() {
        return String.format(
                "[%s] LTP: %.2f Vol: %d OI: %d",
                formatDateTime(this.tickTimestamp),
                this.lastTradedPrice,
                this.lastTradedQuantity,
                this.oi
        );
    }
}


record MarketDepth(
        List<DepthItem> buy,
        List<DepthItem> sell
) {}

record DepthItem(
        int quantity,
        double price,
        int orders
) {}

