package com.vish.fno.ChartsSimulator.model;

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

